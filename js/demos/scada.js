/* Data-centre SCADA mimic: 2N one-line with utility, generator/ATS, UPS, maintenance bypass, PDUs and racks.
 * Breakers follow the North American convention: red = closed, green = open. */
Demos.register('scada', (el, { T, h, onLang, loop }) => {
  const SIDES = ['A', 'B'];
  const IT_KW = 1200, UPS_KW = 1500, COOL_KW = 380;
  const BRK = ['MV', 'GB', 'MB', 'UIB', 'UOB', 'MBB', 'CL'];
  const brkName = (b, s) => ({ MV: `52-M${s}`, GB: `52-G${s}`, MB: `52-L${s}`, UIB: `UIB-${s}`, UOB: `UOB-${s}`, MBB: `MBB-${s}`, CL: `52-C${s}` })[b];

  let S;
  function fresh() {
    const side = () => ({
      util: true, brk: { MV: 1, GB: 1, MB: 1, UIB: 1, UOB: 1, MBB: 0, CL: 1 },
      gen: 'off', genT: 0, ats: 'N', atsT: 0, batt: 100, upsMode: 'online',
    });
    return { clock: 3 * 3600, A: side(), B: side(), inlet: 22.0, alarms: [], flags: {} };
  }
  S = fresh();

  /* ---------- alarms (stored as keys so they re-translate) ---------- */
  const MSG = {
    util_loss: (s) => [`Utility ${s} lost`, `Perte du réseau ${s}`, 'bad'],
    util_back: (s) => [`Utility ${s} restored`, `Réseau ${s} rétabli`, 'ok'],
    gen_start: (s) => [`GEN-${s} start signal`, `Signal de démarrage GEN-${s}`, 'warn'],
    gen_run: (s) => [`GEN-${s} running, 600 V stable`, `GEN-${s} en marche, 600 V stable`, 'ok'],
    gen_stop: (s) => [`GEN-${s} cool-down and stop`, `GEN-${s} refroidissement et arrêt`, ''],
    ats_E: (s) => [`ATS-${s} transferred to emergency`, `ATS-${s} transféré sur secours`, 'warn'],
    ats_N: (s) => [`ATS-${s} retransferred to normal`, `ATS-${s} retransféré sur normal`, 'ok'],
    ups_batt: (s) => [`UPS-${s} on battery`, `ASI-${s} sur batterie`, 'bad'],
    ups_online: (s) => [`UPS-${s} back online`, `ASI-${s} de retour en ligne`, 'ok'],
    ups_low: (s) => [`UPS-${s} battery below 20%`, `Batterie ASI-${s} sous 20 %`, 'bad'],
    ups_off: (s) => [`UPS-${s} output lost`, `Sortie ASI-${s} perdue`, 'bad'],
    red_lost: () => ['Redundancy lost: racks on a single feed', 'Redondance perdue : baies sur une seule alimentation', 'warn'],
    red_ok: () => ['2N redundancy restored', 'Redondance 2N rétablie', 'ok'],
    it_down: (n) => [`IT load dropped: ${n} racks dark`, `Charge TI perdue : ${n} baies hors tension`, 'bad'],
    opened: (id) => [`${id} opened`, `${id} ouvert`, ''],
    closed: (id) => [`${id} closed`, `${id} fermé`, ''],
    interlock: (a, b) => [`Interlock: open ${a} before closing ${b}`, `Verrouillage : ouvrir ${a} avant de fermer ${b}`, 'warn'],
    cool_lost: (s) => [`CRAH-${s} stopped`, `CRAH-${s} arrêté`, 'warn'],
    temp_high: () => ['Rack inlet above 27 °C', 'Entrée d’air des baies au-dessus de 27 °C', 'bad'],
  };
  const clockStr = (t) => [t / 3600, (t / 60) % 60, t % 60].map((v) => String(Math.floor(v)).padStart(2, '0')).join(':');
  function alarm(key, ...args) {
    S.alarms.unshift({ t: S.clock, key, args });
    S.alarms.length = Math.min(S.alarms.length, 40);
    drawLog();
  }
  // edge-triggered alarm on a boolean condition
  function edge(flag, cond, onKey, offKey, ...args) {
    const was = !!S.flags[flag];
    if (cond && !was) alarm(onKey, ...args);
    if (!cond && was && offKey) alarm(offKey, ...args);
    S.flags[flag] = cond;
  }

  /* ---------- electrical solve ---------- */
  function solve() {
    const out = {};
    for (const s of SIDES) {
      const d = S[s], b = d.brk;
      const util = d.util && b.MV;
      const gen = d.gen === 'running' && b.GB;
      const ats = (d.ats === 'N' && util) || (d.ats === 'E' && gen);
      const swbd = ats && b.MB;
      const upsIn = swbd && b.UIB;
      const upsOut = upsIn || d.batt > 0.01;
      const pdu = (b.UOB && upsOut) || (b.MBB && swbd);
      const onBatt = !upsIn && b.UOB && d.batt > 0.01;
      out[s] = { util, gen, ats, swbd, upsIn, upsOut, pdu, onBatt, cool: swbd && b.CL, utilSrc: d.util, tx: util };
    }
    const nA = out.A.pdu, nB = out.B.pdu;
    out.racks = nA && nB ? 2 : nA || nB ? 1 : 0;
    out.loadA = nA ? (nB ? IT_KW / 2 : IT_KW) : 0;
    out.loadB = nB ? (nA ? IT_KW / 2 : IT_KW) : 0;
    return out;
  }

  /* ---------- simulation step ---------- */
  function step(dt) {
    S.clock += dt;
    let E = solve();
    for (const s of SIDES) {
      const d = S[s], e = E[s];
      // ATS logic: lose normal -> start gen after 2 s debounce; transfer once gen is up; retransfer 5 s after utility returns
      const normalOk = e.util;
      if (d.ats === 'N' && !normalOk) {
        d.atsT += dt;
        if (d.atsT > 2 && d.gen === 'off') { d.gen = 'cranking'; d.genT = 0; alarm('gen_start', s); }
      } else if (d.ats === 'N') d.atsT = 0;
      if (d.gen === 'cranking') {
        d.genT += dt;
        if (d.genT > 5) { d.gen = 'running'; d.genT = 0; alarm('gen_run', s); }
      }
      if (d.ats === 'N' && !normalOk && d.gen === 'running' && d.brk.GB) { d.ats = 'E'; d.atsT = 0; alarm('ats_E', s); }
      if (d.ats === 'E' && normalOk) {
        d.atsT += dt;
        if (d.atsT > 5) { d.ats = 'N'; d.atsT = 0; alarm('ats_N', s); }
      }
      if (d.ats === 'N' && normalOk && d.gen === 'running') {
        d.genT += dt;
        if (d.genT > 6) { d.gen = 'off'; d.genT = 0; alarm('gen_stop', s); }
      }
    }
    E = solve();
    for (const s of SIDES) {
      const d = S[s], e = E[s];
      const kw = s === 'A' ? E.loadA : E.loadB;
      if (e.onBatt && kw > 0) d.batt = Math.max(0, d.batt - dt * (kw / UPS_KW) * 2.2);
      else if (e.upsIn && d.batt < 100) d.batt = Math.min(100, d.batt + dt * 1.5);
      d.upsMode = e.upsIn ? 'online' : e.onBatt ? 'battery' : (d.brk.MBB && e.swbd ? 'bypass' : 'off');
      edge('util' + s, !d.util, 'util_loss', 'util_back', s);
      edge('batt' + s, e.onBatt && kw > 0, 'ups_batt', 'ups_online', s);
      edge('low' + s, e.onBatt && d.batt < 20, 'ups_low', null, s);
      edge('off' + s, !e.upsOut && !(d.brk.MBB && e.swbd), 'ups_off', null, s);
      edge('cool' + s, !e.cool, 'cool_lost', null, s);
    }
    edge('red', E.racks === 1, 'red_lost', 'red_ok');
    edge('down', E.racks === 0, 'it_down', null, 6);
    const coolFrac = (E.A.cool ? 0.5 : 0) + (E.B.cool ? 0.5 : 0);
    const target = E.racks === 0 ? 24 : 22 + (1 - coolFrac) * 14;
    S.inlet += (target - S.inlet) * Math.min(1, dt * 0.08);
    edge('hot', S.inlet > 27, 'temp_high', null);
    return E;
  }

  /* ---------- build the one-line ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const svg = h('svg', { class: 'd-svg scada', viewBox: '0 0 1000 610', role: 'img' });
  const kpis = h('div', { class: 'd-kpis' });
  const logBox = h('div', { class: 'd-log' });
  const ctl = h('div', { class: 'd-row' });
  el.append(
    h('style', { text: `
      @media(max-width:700px){.scada{min-width:680px}}
      .scada .w{stroke:#3a3a3c;stroke-width:3;fill:none;transition:stroke .3s}
      .scada .w.live{stroke:#f5f5f7;stroke-dasharray:7 7;animation:flow .9s linear infinite}
      .scada .w.batt{stroke:#ff9f0a}
      .scada .bus{stroke-width:6;stroke-dasharray:none!important;animation:none!important}
      @keyframes flow{to{stroke-dashoffset:-14}}
      .scada .brk{cursor:pointer;transition:fill .2s}
      .scada .brk:hover{stroke:#fff;stroke-width:2}
      .scada text{fill:#a1a1a6;font:600 12.5px var(--mono)}
      .scada text.big{fill:#f5f5f7;font:600 14px var(--font)}
      .scada .eq{fill:rgba(255,255,255,.05);stroke:#6e6e73;stroke-width:1.5}
      .scada .eq.live{stroke:#f5f5f7}
      .scada .fan{transform-box:fill-box;transform-origin:center}
      .scada .fan.spin{animation:spin 1s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
      .d-log .ok{color:var(--green)} .d-log .bad{color:var(--red)} .d-log .warn{color:var(--orange)}
    ` }),
    kpis,
    h('div', { style: 'margin:14px 0;overflow-x:auto' }, svg),
    h('div', { class: 'd-grid2' }, h('div', { class: 'd-col' }, ctl, h('p', { class: 'd-label', id: 'scadaHint' })), h('div', { class: 'd-panel' }, logBox)),
  );

  const parts = {};   // id -> element(s) to update
  const add = (p, ...els) => { (parts[p] = parts[p] || []).push(...els); els.forEach((e) => svg.append(e)); return els[0]; };
  const line = (id, pts, cls = '') => add(id, h('polyline', { class: 'w ' + cls, points: pts.map((p) => p.join(',')).join(' ') }));
  const label = (x, y, txt, cls = '', anchor = 'middle') => svg.append(h('text', { x, y, class: cls, 'text-anchor': anchor }, txt));

  function build() {
    svg.textContent = '';
    for (const k in parts) delete parts[k];
    for (const s of SIDES) {
      const m = (x) => (s === 'A' ? x : 1000 - x);       // mirror B
      const anc = s === 'A' ? 'end' : 'start';
      const x = m(260), gx = m(110);
      // utility source
      line(s + 'util', [[x, 68], [x, 92]]);
      add(s + 'utilSym', h('circle', { cx: x, cy: 50, r: 18, class: 'eq' }));
      svg.append(h('path', { d: `M${x - 9} 50q4.5 -8 9 0t9 0`, stroke: '#a1a1a6', fill: 'none', 'stroke-width': 1.6 }));
      label(x, 22, T(`UTILITY ${s} · 25 kV`, `RÉSEAU ${s} · 25 kV`), 'big');
      brk(s, 'MV', x, 100);
      line(s + 'tx', [[x, 108], [x, 137]]);
      add(s + 'txSym', h('circle', { cx: x, cy: 150, r: 13, class: 'eq' }), h('circle', { cx: x, cy: 168, r: 13, class: 'eq' }));
      label(m(285), 163, 'TX-' + s, '', s === 'A' ? 'start' : 'end');
      label(m(285), 176, '2.5 MVA', '', s === 'A' ? 'start' : 'end');
      line(s + 'txOut', [[x, 181], [x, 236]]);
      // generator
      add(s + 'genSym', h('circle', { cx: gx, cy: 160, r: 21, class: 'eq' }));
      label(gx, 165, 'G', 'big');
      label(gx, 126, 'GEN-' + s, 'big');
      add(s + 'genTxt', h('text', { x: gx, y: 200, 'text-anchor': 'middle' }, ''));
      line(s + 'genOut', [[gx, 181], [gx, 205]]);
      brk(s, 'GB', gx, 213);
      line(s + 'genOut2', [[gx, 221], [gx, 256], [m(222), 256]]);
      // ATS
      add(s + 'atsBox', h('rect', { x: m(s === 'A' ? 222 : 298) - (s === 'A' ? 0 : 0), y: 238, width: 76, height: 40, rx: 6, class: 'eq' }));
      add(s + 'blade', h('line', { x1: x, y1: 276, x2: x, y2: 240, stroke: '#f5f5f7', 'stroke-width': 3, 'stroke-linecap': 'round' }));
      label(m(312), 262, 'ATS-' + s, 'big', s === 'A' ? 'start' : 'end');
      add(s + 'atsTxt', h('text', { x: m(312), y: 276, 'text-anchor': s === 'A' ? 'start' : 'end' }, ''));
      line(s + 'atsOut', [[x, 278], [x, 297]]);
      brk(s, 'MB', x, 305);
      line(s + 'mbOut', [[x, 313], [x, 340]]);
      // switchboard bus
      line(s + 'swbd', [[m(170), 340], [m(350), 340]], 'bus');
      label(m(165), 344, T(`SWBD-${s} · 600 V`, `TGBT-${s} · 600 V`), '', s === 'A' ? 'end' : 'start');
      // cooling branch
      const cx = m(185);
      line(s + 'cool', [[cx, 340], [cx, 377]]);
      brk(s, 'CL', cx, 385);
      line(s + 'cool2', [[cx, 393], [cx, 418]]);
      add(s + 'crah', h('circle', { cx, cy: 438, r: 20, class: 'eq' }));
      add(s + 'fan', h('path', { class: 'fan', d: `M${cx} ${438}l0 -13M${cx} 438l11 6.5M${cx} 438l-11 6.5`, stroke: '#a1a1a6', 'stroke-width': 3, 'stroke-linecap': 'round' }));
      label(cx, 474, 'CRAH-' + s);
      // UPS
      line(s + 'upsIn', [[x, 340], [x, 362]]);
      brk(s, 'UIB', x, 370);
      line(s + 'upsIn2', [[x, 378], [x, 392]]);
      add(s + 'upsBox', h('rect', { x: x - 42, y: 392, width: 84, height: 52, rx: 8, class: 'eq' }));
      label(x, 410, T('UPS-', 'ASI-') + s, 'big');
      add(s + 'battBg', h('rect', { x: x - 30, y: 420, width: 60, height: 9, rx: 3, fill: 'rgba(255,255,255,.08)' }));
      add(s + 'battFill', h('rect', { x: x - 30, y: 420, width: 60, height: 9, rx: 3, fill: '#30d158' }));
      add(s + 'upsTxt', h('text', { x, y: 440, 'text-anchor': 'middle' }, ''));
      line(s + 'upsOut', [[x, 444], [x, 462]]);
      brk(s, 'UOB', x, 470);
      const pduY = s === 'A' ? 505 : 520;
      line(s + 'upsOut2', [[x, 478], [x, pduY]]);
      // maintenance bypass
      const bx = m(335);
      line(s + 'mbb1', [[bx, 340], [bx, 432]]);
      brk(s, 'MBB', bx, 440);
      line(s + 'mbb2', [[bx, 448], [bx, pduY]]);
      // PDU bus
      line(s + 'pdu', [[m(200), pduY], [m(660), pduY]], 'bus');
      label(m(200), pduY - 8, 'PDU-' + s, '', s === 'A' ? 'start' : 'end');
      // drops to racks
      for (let r = 0; r < 6; r++) {
        const rx = 360 + r * 56 + (s === 'A' ? -8 : 8);
        line(s + 'pdu', [[rx, pduY], [rx, 546]]);
      }
    }
    for (let r = 0; r < 6; r++) {
      const rx = 360 + r * 56;
      add('rack' + r, h('rect', { x: rx - 20, y: 546, width: 40, height: 46, rx: 5, class: 'eq' }));
      for (let k = 0; k < 4; k++) svg.append(h('line', { x1: rx - 13, x2: rx + 13, y1: 556 + k * 9, y2: 556 + k * 9, stroke: 'rgba(255,255,255,.18)', 'stroke-width': 2 }));
      add('led' + r, h('circle', { cx: rx + 14, cy: 551, r: 3, fill: '#30d158' }));
      label(rx, 606, 'R' + (r + 1));
    }
    label(500, 490, T('IT LOAD 1.2 MW · 2N', 'CHARGE TI 1,2 MW · 2N'), 'big');

    // controls
    ctl.textContent = '';
    for (const s of SIDES) {
      ctl.append(h('button', { class: 'd-btn danger', 'data-util': s, onclick: () => { S[s].util = !S[s].util; render(solve()); } }));
    }
    ctl.append(h('button', { class: 'd-btn', onclick: () => { S = fresh(); drawLog(); render(solve()); } }, T('Reset', 'Réinitialiser')));
    el.querySelector('#scadaHint').textContent = T(
      'Try: cut Utility A, then open UOB-B. Or close MBB-A without opening UOB-A first.',
      'Essayez : coupez le réseau A, puis ouvrez UOB-B. Ou fermez MBB-A sans ouvrir UOB-A.');
    drawLog();
  }

  function brk(s, b, x, y) {
    const id = brkName(b, s);
    const r = h('rect', { x: x - 8, y: y - 8, width: 16, height: 16, rx: 2, class: 'brk', tabindex: 0, role: 'button', 'aria-label': id });
    r.addEventListener('click', () => toggle(s, b));
    r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(s, b); } });
    add(s + 'brk' + b, r);
    const right = (s === 'A') !== (b === 'GB');
    label(x + (right ? 14 : -14), y + 4, id, '', right ? 'start' : 'end');
  }

  function toggle(s, b) {
    const d = S[s].brk, id = brkName(b, s);
    if (!d[b] && b === 'MBB' && d.UOB) return alarm('interlock', brkName('UOB', s), id);
    if (!d[b] && b === 'UOB' && d.MBB) return alarm('interlock', brkName('MBB', s), id);
    d[b] = d[b] ? 0 : 1;
    alarm(d[b] ? 'closed' : 'opened', id);
    render(solve());
  }

  /* ---------- render ---------- */
  const set = (id, fn) => (parts[id] || []).forEach(fn);
  const live = (id, on, extra) => set(id, (e) => { e.classList.toggle('live', !!on); if (extra !== undefined) e.classList.toggle('batt', !!extra); });

  function render(E) {
    for (const s of SIDES) {
      const d = S[s], e = E[s];
      live(s + 'util', d.util); live(s + 'utilSym', d.util);
      live(s + 'tx', e.util); live(s + 'txSym', e.util); live(s + 'txOut', e.util);
      const genUp = d.gen === 'running';
      live(s + 'genSym', genUp); live(s + 'genOut', genUp); live(s + 'genOut2', e.gen);
      set(s + 'genTxt', (t) => { t.textContent = { off: T('STANDBY', 'ATTENTE'), cranking: T('CRANKING', 'DÉMARRAGE'), running: T('RUNNING', 'EN MARCHE') }[d.gen]; t.setAttribute('class', genUp ? 'ok' : d.gen === 'cranking' ? 'warn' : ''); });
      live(s + 'atsBox', e.ats);
      const m = (x) => (s === 'A' ? x : 1000 - x);
      set(s + 'blade', (b) => { b.setAttribute('x2', d.ats === 'N' ? m(260) : m(228)); b.setAttribute('y2', d.ats === 'N' ? 240 : 256); });
      set(s + 'atsTxt', (t) => { t.textContent = d.ats === 'N' ? T('NORMAL', 'NORMAL') : T('EMERGENCY', 'SECOURS'); t.setAttribute('class', d.ats === 'N' ? '' : 'warn'); });
      live(s + 'atsOut', e.ats); live(s + 'mbOut', e.swbd); live(s + 'swbd', e.swbd);
      live(s + 'cool', e.swbd); live(s + 'cool2', e.cool); live(s + 'crah', e.cool);
      set(s + 'fan', (f) => f.classList.toggle('spin', !!e.cool));
      live(s + 'upsIn', e.swbd); live(s + 'upsIn2', e.upsIn);
      live(s + 'upsBox', e.upsIn || e.onBatt);
      set(s + 'battFill', (r) => { r.setAttribute('width', (60 * d.batt / 100).toFixed(1)); r.setAttribute('fill', d.batt < 20 ? '#ff453a' : d.batt < 60 ? '#ff9f0a' : '#30d158'); });
      set(s + 'upsTxt', (t) => { t.textContent = `${{ online: T('ONLINE', 'EN LIGNE'), battery: T('BATTERY', 'BATTERIE'), bypass: 'BYPASS', off: T('OFF', 'ARRÊT') }[d.upsMode]} ${Math.round(d.batt)}%`; t.setAttribute('class', d.upsMode === 'online' ? '' : d.upsMode === 'battery' ? 'warn' : 'bad'); });
      live(s + 'upsOut', e.upsOut && (e.upsIn || e.onBatt), e.onBatt);
      live(s + 'upsOut2', d.brk.UOB && e.upsOut && (e.upsIn || e.onBatt), e.onBatt);
      live(s + 'mbb1', e.swbd); live(s + 'mbb2', d.brk.MBB && e.swbd);
      live(s + 'pdu', e.pdu, e.onBatt && !(d.brk.MBB && e.swbd));
      for (const b of BRK) set(s + 'brk' + b, (r) => r.setAttribute('fill', d.brk[b] ? '#ff453a' : '#30d158'));
    }
    for (let r = 0; r < 6; r++) {
      live('rack' + r, E.racks > 0);
      set('led' + r, (c) => c.setAttribute('fill', E.racks === 2 ? '#30d158' : E.racks === 1 ? '#ff9f0a' : '#ff453a'));
    }
    ctl.querySelectorAll('[data-util]').forEach((b) => {
      const s = b.dataset.util;
      b.textContent = S[s].util ? T(`Cut utility ${s}`, `Couper le réseau ${s}`) : T(`Restore utility ${s}`, `Rétablir le réseau ${s}`);
      b.classList.toggle('danger', S[s].util);
    });
    // KPIs
    const itKw = E.racks ? IT_KW : 0;
    const coolKw = (E.A.cool ? COOL_KW / 2 : 0) + (E.B.cool ? COOL_KW / 2 : 0);
    const losses = itKw * 0.06;
    const pue = itKw ? (itKw + coolKw + losses) / itKw : 0;
    const red = E.racks === 2 ? ['2N', 'ok'] : E.racks === 1 ? ['N', 'warn'] : [T('LOST', 'PERDUE'), 'bad'];
    const k = (val, lbl, cls = '') => h('div', { class: 'd-kpi' }, h('b', { class: cls }, val), h('span', {}, lbl));
    kpis.replaceChildren(
      k(`${itKw.toLocaleString(T('en-CA', 'fr-CA'))} kW`, T('IT load', 'Charge TI'), itKw ? '' : 'bad'),
      k(red[0], T('Redundancy', 'Redondance'), red[1]),
      k(pue ? pue.toFixed(2) : '—', 'PUE'),
      k(`${Math.round(E.loadA / UPS_KW * 100)}% · ${Math.round(E.loadB / UPS_KW * 100)}%`, T('UPS A · B load', 'Charge ASI A · B')),
      k(`${S.inlet.toFixed(1)} °C`, T('Rack inlet', 'Entrée des baies'), S.inlet > 27 ? 'bad' : S.inlet > 25 ? 'warn' : ''),
      k(clockStr(S.clock), T('Site time', 'Heure du site')),
    );
  }

  function drawLog() {
    const rows = S.alarms.length ? S.alarms : [{ t: S.clock, key: null }];
    logBox.replaceChildren(...rows.map((a) => {
      if (!a.key) return h('div', { class: 'muted' }, `${clockStr(a.t)}  ${T('All systems normal. No active alarms.', 'Tous les systèmes sont normaux. Aucune alarme active.')}`);
      const [en, fr, cls] = MSG[a.key](...a.args);
      return h('div', { class: cls }, `${clockStr(a.t)}  ${T(en, fr)}`);
    }));
  }

  build();
  render(solve());
  onLang(() => { build(); render(solve()); });
  let acc = 0;
  loop((dt) => {
    const E = step(dt);
    acc += dt;
    if (acc > 0.1) { acc = 0; render(E); }
  });
});

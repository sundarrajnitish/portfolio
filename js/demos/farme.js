/* FARM-E planting run: CALIBRATE -> DRIVE -> SETTLE -> SEED -> WATER -> ... -> EDGE -> BACKOFF -> TURN -> SHIFT -> TURN -> DONE.
 * The phone page (NodeMCU) mirrors the UNO's telemetry and can STOP the robot. */
Demos.register('farme', (el, { T, h, onLang, loop, fitCanvas }) => {
  const BW = 2.4, BH = 1.2, GAP = 0.3, ROWS = 4, V = 0.28;
  let spacing = 0.25, S;
  function reset() {
    S = { x: 0.12, y: GAP / 2, th: 0, dir: 1, row: 1, state: 'CALIBRATE', t: 0, togo: spacing, hills: [], tank: 600, batt: 7.6,
      stopped: false, travel: 0, turnFrom: 0, flap: 0, pings: 0 };
  }
  reset();
  const STATE_FR = { CALIBRATE: 'ÉTALONNAGE', DRIVE: 'ROULE', SETTLE: 'STABILISE', SEED: 'SÈME', WATER: 'ARROSE', EDGE: 'BORD', BACKOFF: 'RECUL',
    TURN1: 'VIRAGE', SHIFT: 'DÉCALAGE', TURN2: 'VIRAGE', DONE: 'TERMINÉ', STOP: 'ARRÊT', TANK: 'RÉSERVOIR VIDE' };
  const go = (st) => { S.state = st; S.t = 0; };
  const groundAhead = () => { const fx = S.x + Math.cos(S.th) * 0.12; return fx > 0.02 && fx < BW - 0.02; };

  function step(dt) {
    if (S.stopped || S.state === 'DONE' || S.state === 'TANK') return;
    S.t += dt; S.batt = Math.max(6.4, S.batt - dt * 0.002);
    const fwd = (d) => { S.x += Math.cos(S.th) * d; S.y += Math.sin(S.th) * d; };
    switch (S.state) {
      case 'CALIBRATE': S.pings = Math.min(7, Math.floor(S.t / 0.15)); if (S.t > 1.1) go('DRIVE'); break;
      case 'DRIVE':
        if (!groundAhead()) { go('EDGE'); break; }
        fwd(V * dt); S.togo -= V * dt;
        if (S.togo <= 0) { S.togo = spacing; go('SETTLE'); }
        break;
      case 'SETTLE': if (S.t > 0.25) go('SEED'); break;
      case 'SEED': S.flap = S.t < 0.35 ? 1 : 0; if (S.t > 0.45) { S.hills.push({ x: S.x, y: S.y, born: performance.now() }); go('WATER'); } break;
      case 'WATER': if (S.t > 0.55) { S.tank -= 20; S.hills[S.hills.length - 1].wet = true; go(S.tank < 20 ? 'TANK' : 'DRIVE'); } break;
      case 'EDGE': if (S.t > 0.2) go(S.row >= ROWS ? 'DONE' : 'BACKOFF'); break;
      case 'BACKOFF': fwd(-V * dt); if (S.t > 0.08 / V) { S.turnFrom = S.th; go('TURN1'); } break;
      case 'TURN1': case 'TURN2': {
        const target = S.turnFrom + (Math.PI / 2) * S.dir * (S.state === 'TURN1' ? 1 : 1);
        const k = Math.min(S.t / 0.7, 1);
        S.th = S.turnFrom + (target - S.turnFrom) * k;
        if (k >= 1) {
          if (S.state === 'TURN1') { S.travel = 0; go('SHIFT'); }
          else { S.dir = -S.dir; S.row++; S.togo = spacing; go('DRIVE'); }
        }
        break;
      }
      case 'SHIFT': fwd(V * dt); S.travel += V * dt; if (S.travel >= GAP) { S.turnFrom = S.th; go('TURN2'); } break;
    }
  }

  const cv = h('canvas', { class: 'd-canvas' });
  const phone = h('div', { class: 'fe-phone' });
  const sl = h('input', { type: 'range', min: 15, max: 40, value: 25, oninput: (e) => { spacing = +e.target.value / 100; slLbl.textContent = `${e.target.value} cm`; } });
  const slLbl = h('b', {}, '25 cm');
  const bStart = h('button', { class: 'd-btn primary', onclick: () => { reset(); } });
  const ctlLbl = h('span', { class: 'd-label' });
  el.append(h('style', { text: `
      .fe-phone{border-radius:26px;border:1px solid var(--hair);background:#0b0b0c;padding:16px 14px;display:flex;flex-direction:column;gap:8px;font-size:13px}
      .fe-phone .row{display:flex;justify-content:space-between;border-bottom:1px solid var(--hair-2);padding:4px 0}
      .fe-phone .row b{font-family:var(--mono)}
      .fe-stop{background:var(--red);color:#fff;border:0;border-radius:14px;padding:12px;font-weight:700;font-size:15px;cursor:pointer}
      .fe-stop.res{background:var(--green);color:#000}
    ` }),
  h('div', { class: 'd-grid2' }, h('div', { class: 'd-col' }, cv, h('div', { class: 'd-row' }, bStart, ctlLbl, h('div', { style: 'flex:1;min-width:140px' }, sl), slLbl)), phone));

  function labels() { bStart.textContent = T('Start a new run', 'Nouvelle plantation'); ctlLbl.textContent = T('Hill spacing', 'Espacement'); }
  function drawPhone() {
    const st = S.stopped ? 'STOP' : S.state;
    const r = (k, v, c = '') => h('div', { class: 'row' }, h('span', { class: 'muted' }, k), h('b', { class: c }, v));
    phone.replaceChildren(...[
      h('div', { class: 'muted', style: 'text-align:center;font-size:11px' }, 'FARM-E · 192.168.4.1'),
      r(T('State', 'État'), T(st.replace(/\d/, ''), STATE_FR[st]), st === 'DONE' ? 'ok' : st === 'STOP' || st === 'TANK' || st === 'EDGE' ? 'warn' : ''),
      r(T('Hills', 'Poquets'), String(S.hills.length)),
      r(T('Row', 'Rang'), `${S.row}/${ROWS}`),
      r(T('Tank', 'Réservoir'), `${S.tank} mL`, S.tank < 100 ? 'warn' : ''),
      r(T('Ground', 'Sol'), groundAhead() ? '62 mm' : T('none!', 'aucun !'), groundAhead() ? '' : 'bad'),
      r(T('Battery', 'Batterie'), `${S.batt.toFixed(2)} V`),
      S.state === 'CALIBRATE' ? h('div', { class: 'muted', style: 'font-size:11.5px' }, T(`Calibrating: ${S.pings}/7 pings agree within 15 mm`, `Étalonnage : ${S.pings}/7 échos concordants à 15 mm près`)) : null,
      h('button', { class: 'fe-stop' + (S.stopped ? ' res' : ''), onclick: () => { S.stopped = !S.stopped; drawPhone(); } }, S.stopped ? T('RESUME', 'REPRENDRE') : T('STOP', 'ARRÊT')),
    ].filter(Boolean));
  }
  labels(); onLang(() => { labels(); drawPhone(); });
  let pT = 0;
  loop((dt) => {
    step(dt);
    pT += dt; if (pT > 0.2) { pT = 0; drawPhone(); }
    const { ctx, w, h: H } = fitCanvas(cv, Math.max(170, Math.min(250, cv.clientWidth * 0.5)));
    const sc = Math.min((w - 20) / BW, (H - 20) / BH), ox = (w - BW * sc) / 2, oy = (H - BH * sc) / 2;
    const X = (x) => ox + x * sc, Y = (y) => oy + y * sc;
    ctx.clearRect(0, 0, w, H);
    ctx.fillStyle = '#2a2016'; ctx.fillRect(X(0), Y(0), BW * sc, BH * sc);
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 8;
    for (let r = 0; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(X(0), Y(GAP / 2 + r * GAP)); ctx.lineTo(X(BW), Y(GAP / 2 + r * GAP)); ctx.stroke(); }
    const now = performance.now();
    for (const hl of S.hills) {
      if (hl.wet) { ctx.fillStyle = 'rgba(20,10,0,.6)'; ctx.beginPath(); ctx.arc(X(hl.x), Y(hl.y), 9, 0, 7); ctx.fill(); }
      const g = Math.min((now - hl.born) / 2500, 1);
      ctx.fillStyle = g < 0.3 ? '#ff9f0a' : '#30d158'; ctx.beginPath(); ctx.arc(X(hl.x), Y(hl.y), 2 + g * 4, 0, 7); ctx.fill();
    }
    // robot
    ctx.save(); ctx.translate(X(S.x), Y(S.y)); ctx.rotate(S.th);
    const ok = groundAhead();
    ctx.fillStyle = ok ? 'rgba(48,209,88,.18)' : 'rgba(255,69,58,.35)';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(0.12 * sc + 14, -10); ctx.lineTo(0.12 * sc + 14, 10); ctx.fill();
    ctx.fillStyle = '#3a3a3c'; ctx.fillRect(-16, -15, 32, 6); ctx.fillRect(-16, 9, 32, 6);
    ctx.fillStyle = '#c7c7cc'; ctx.fillRect(-13, -10, 26, 20);
    ctx.fillStyle = '#ff9f0a'; ctx.fillRect(-8, -6, 9, 12);
    if (S.flap) { ctx.fillStyle = '#ffd60a'; ctx.fillRect(1, -3, 4, 6); }
    ctx.fillStyle = '#2997ff'; ctx.beginPath(); ctx.arc(5, 0, 3, 0, 7); ctx.fill();
    if (S.state === 'WATER') { ctx.strokeStyle = '#64d2ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 6 + (S.t * 30) % 10, 0, 7); ctx.stroke(); }
    ctx.restore();
  });
});

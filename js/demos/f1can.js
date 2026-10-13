/* F1 CAN telemetry: a real lap is packed into 0x101 F1_CarTelemetry frames (Intel byte order,
 * CRC-8 SAE J1850 in byte 7). Pause, flip bits on the wire, watch the receiver's verdict. */
Demos.register('f1can', (el, { T, h, onLang, loop, fitCanvas }) => {
  const LAP = window.F1_LAP;
  // same layout as dbc/f1_telemetry.dbc
  const SIG = [
    { k: 'Speed', start: 0, len: 16, scale: 0.1, unit: 'km/h', c: '#2997ff' },
    { k: 'RPM', start: 16, len: 16, scale: 1, unit: 'rpm', c: '#bf5af2' },
    { k: 'Throttle', start: 32, len: 8, scale: 1, unit: '%', c: '#30d158' },
    { k: 'Gear', start: 40, len: 4, scale: 1, unit: '', c: '#ff9f0a' },
    { k: 'Brake', start: 44, len: 1, scale: 1, unit: '', c: '#ff453a' },
    { k: 'DRS', start: 45, len: 1, scale: 1, unit: '', c: '#64d2ff' },
    { k: 'Alive', start: 48, len: 4, scale: 1, unit: '', c: '#a1a1a6' },
    { k: 'CRC8', start: 56, len: 8, scale: 1, unit: '', c: '#f5f5f7' },
  ];
  const sigOf = (bit) => SIG.find((s) => bit >= s.start && bit < s.start + s.len);
  function crc8(bytes) {
    let crc = 0xff;
    for (const b of bytes) { crc ^= b; for (let i = 0; i < 8; i++) crc = crc & 0x80 ? ((crc << 1) ^ 0x1d) & 0xff : (crc << 1) & 0xff; }
    return crc ^ 0xff;
  }
  function pack(v, alive) {
    const bits = new Array(64).fill(0);
    const put = (s, raw) => { for (let i = 0; i < s.len; i++) bits[s.start + i] = (raw >> i) & 1; };
    put(SIG[0], Math.round(v.speed / 0.1)); put(SIG[1], v.rpm); put(SIG[2], v.thr); put(SIG[3], v.gear);
    put(SIG[4], v.brake); put(SIG[5], v.drs); put(SIG[6], alive);
    const bytes = toBytes(bits);
    put(SIG[7], crc8(bytes.slice(0, 7)));
    return bits;
  }
  const toBytes = (bits) => Array.from({ length: 8 }, (_, b) => bits.slice(b * 8, b * 8 + 8).reduce((a, x, i) => a | (x << i), 0));
  const field = (bits, s) => bits.slice(s.start, s.start + s.len).reduce((a, x, i) => a + x * 2 ** i, 0) * s.scale;

  let i = 0, t = 0, playing = true, alive = 0, sent = [], wire = [], lastAlive = -1, flips = new Set();
  function sample() {
    const s = LAP.s[i];
    return { speed: s[1], rpm: s[2], gear: s[3], thr: s[4], brake: s[5], drs: s[6] };
  }
  function transmit() {
    alive = (alive + 1) & 15;
    sent = pack(sample(), alive);
    wire = sent.slice();
    flips.clear();
  }

  /* ---------- UI ---------- */
  const cv = h('canvas', { class: 'd-canvas' });
  const grid = h('div', { class: 'bitgrid' });
  const hexTx = h('div', { class: 'd-mono' }), hexRx = h('div', { class: 'd-mono' });
  const verdict = h('div', { class: 'verdict' });
  const decoded = h('div', { class: 'd-kpis' });
  const playBtn = h('button', { class: 'd-btn primary', onclick: () => { playing = !playing; if (playing) transmit(); labels(); } });
  const legend = h('div', { class: 'd-row', style: 'gap:14px;font-size:12px' });
  el.append(
    h('style', { text: `
      .bitgrid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:6px}
      .bytebox{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px;min-width:0;padding:4px;border-radius:8px;background:rgba(0,0,0,.35);border:1px solid var(--hair-2)}
      .bytebox .lbl{grid-column:1/-1;font:600 10px var(--mono);color:var(--ink-3);text-align:center}
      .bit{aspect-ratio:1;min-width:0;border-radius:3px;border:0;cursor:pointer;font:600 10px var(--mono);color:#000;padding:0;transition:transform .15s}
      .bit.zero{background:rgba(255,255,255,.08)!important;color:var(--ink-3)}
      .bit.flip{outline:2px solid #ff453a;outline-offset:1px}
      .bit:hover{transform:scale(1.15)}
      .verdict{font-weight:600;font-size:15px;padding:10px 14px;border-radius:12px;margin-top:4px}
      .verdict.ok{background:rgba(48,209,88,.12)}.verdict.bad{background:rgba(255,69,58,.12)}
      @media(max-width:640px){.bitgrid{grid-template-columns:repeat(4,minmax(0,1fr))}}
    ` }),
    h('div', { class: 'd-grid2' },
      h('div', { class: 'd-col' }, cv, h('div', { class: 'd-row' }, playBtn, h('span', { class: 'd-label', id: 'f1lap' }))),
      h('div', { class: 'd-col' }, h('div', { class: 'd-panel d-col', style: 'gap:6px' },
        h('span', { class: 'd-label' }, 'TX  0x101 F1_CarTelemetry'), hexTx,
        h('span', { class: 'd-label', id: 'f1rxl' }), hexRx), verdict)),
    h('div', { style: 'margin-top:16px' }, legend),
    h('div', { style: 'margin-top:10px' }, grid),
    h('div', { style: 'margin-top:14px' }, decoded),
  );

  function labels() {
    playBtn.textContent = playing ? T('Pause and inspect', 'Pause et inspection') : T('Resume the lap', 'Reprendre le tour');
    el.querySelector('#f1lap').textContent = T(`Verstappen · lap ${LAP.lap} · real 2023 data`, `Verstappen · tour ${LAP.lap} · vraies données 2023`);
    el.querySelector('#f1rxl').textContent = T('RX  pit wall (click bits below to corrupt)', 'RX  muret des stands (cliquez les bits ci-dessous pour corrompre)');
    legend.replaceChildren(...SIG.map((s) => h('span', { style: `display:inline-flex;align-items:center;gap:6px;color:var(--ink-2)` },
      h('i', { style: `width:10px;height:10px;border-radius:3px;background:${s.c};display:inline-block` }), s.k)));
    renderFrame();
  }

  function renderFrame() {
    const txB = toBytes(sent), rxB = toBytes(wire);
    const hex = (b) => b.map((x) => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    hexTx.textContent = hex(txB);
    hexRx.replaceChildren(...rxB.map((b, k) => h('span', { style: b !== txB[k] ? 'color:#ff453a' : '' }, b.toString(16).toUpperCase().padStart(2, '0') + ' ')));
    grid.replaceChildren(...Array.from({ length: 8 }, (_, byte) => h('div', { class: 'bytebox' },
      h('span', { class: 'lbl' }, `${T('byte', 'octet')} ${byte}`),
      ...Array.from({ length: 8 }, (_, j) => {
        const bit = byte * 8 + (7 - j);            // MSB first on screen
        const s = sigOf(bit);
        return h('button', {
          class: 'bit' + (wire[bit] ? '' : ' zero') + (flips.has(bit) ? ' flip' : ''),
          style: `background:${s ? s.c : '#333'}`, title: `bit ${bit} · ${s ? s.k : '—'}`,
          onclick: () => { playing = false; wire[bit] ^= 1; flips.has(bit) ? flips.delete(bit) : flips.add(bit); labels(); },
        }, wire[bit]);
      }))));
    // receiver: CRC over bytes 0..6, then alive counter must advance
    const crcOk = crc8(rxB.slice(0, 7)) === rxB[7];
    const a = field(wire, SIG[6]);
    const aliveOk = playing || a === alive;
    verdict.className = 'verdict ' + (crcOk && aliveOk ? 'ok' : 'bad');
    verdict.textContent = crcOk
      ? (flips.size ? T(`Accepted, but ${flips.size} flips cancelled out in the CRC. Rare, not impossible.`, `Acceptée : ${flips.size} inversions se sont annulées dans le CRC. Rare, mais possible.`) : T('Frame accepted · CRC ok · counter ok', 'Trame acceptée · CRC ok · compteur ok'))
      : T(`Rejected: CRC is ${crc8(rxB.slice(0, 7)).toString(16).toUpperCase().padStart(2, '0')}, frame says ${rxB[7].toString(16).toUpperCase().padStart(2, '0')}. Last good sample held.`,
        `Rejetée : le CRC vaut ${crc8(rxB.slice(0, 7)).toString(16).toUpperCase().padStart(2, '0')}, la trame dit ${rxB[7].toString(16).toUpperCase().padStart(2, '0')}. Dernier bon échantillon conservé.`);
    const k = (v, l, c = '') => h('div', { class: 'd-kpi' }, h('b', { class: c }, v), h('span', {}, l));
    const cls = crcOk ? '' : 'muted';
    decoded.replaceChildren(
      k(`${field(wire, SIG[0]).toFixed(1)}`, T('speed km/h', 'vitesse km/h'), cls),
      k(`${field(wire, SIG[1])}`, 'rpm', cls),
      k(`${field(wire, SIG[2])}%`, T('throttle', 'accélérateur'), cls),
      k(`${field(wire, SIG[3])}`, T('gear', 'rapport'), cls),
      k(field(wire, SIG[4]) ? T('ON', 'OUI') : T('off', 'non'), T('brake', 'frein'), field(wire, SIG[4]) ? 'bad' : cls),
      k(String(a), T('alive counter', 'compteur de vie'), cls),
    );
  }

  // track
  {
    const n = LAP.s.length, mx = LAP.s.reduce((a, s) => a + s[7], 0) / n, my = LAP.s.reduce((a, s) => a + s[8], 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    for (const s of LAP.s) { const dx = s[7] - mx, dy = s[8] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    const a = -0.5 * Math.atan2(2 * sxy, sxx - syy), c = Math.cos(a), sn = Math.sin(a);
    for (const s of LAP.s) { const dx = s[7] - mx, dy = s[8] - my; s[7] = dx * c - dy * sn; s[8] = dx * sn + dy * c; }
  }
  const xs = LAP.s.map((s) => s[7]), ys = LAP.s.map((s) => s[8]);
  const bx = [Math.min(...xs), Math.max(...xs)], by = [Math.min(...ys), Math.max(...ys)];
  function drawTrack() {
    const { ctx, w, h: H } = fitCanvas(cv, 200);
    const sc = Math.min((w - 30) / (bx[1] - bx[0]), (H - 30) / (by[1] - by[0]));
    const X = (x) => (w - (bx[1] - bx[0]) * sc) / 2 + (x - bx[0]) * sc, Y = (y) => H - ((H - (by[1] - by[0]) * sc) / 2 + (y - by[0]) * sc);
    ctx.clearRect(0, 0, w, H);
    ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath(); LAP.s.forEach((s, k) => (k ? ctx.lineTo(X(s[7]), Y(s[8])) : ctx.moveTo(X(s[7]), Y(s[8])))); ctx.closePath(); ctx.stroke();
    ctx.lineWidth = 2;
    for (let k = 1; k <= i; k++) {   // speed-coloured trace so far
      const v = LAP.s[k][1] / 320;
      ctx.strokeStyle = `hsl(${210 - v * 210},90%,60%)`;
      ctx.beginPath(); ctx.moveTo(X(LAP.s[k - 1][7]), Y(LAP.s[k - 1][8])); ctx.lineTo(X(LAP.s[k][7]), Y(LAP.s[k][8])); ctx.stroke();
    }
    const s = LAP.s[i];
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(s[7]), Y(s[8]), 5.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#a1a1a6'; ctx.font = '600 12px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillText(`${s[0].toFixed(1)} s · ${s[1].toFixed(0)} km/h · G${s[3]}`, 12, 20);
  }

  transmit(); labels(); onLang(labels);
  let frameT = 0;
  loop((dt) => {
    if (playing) {
      t += dt;
      const ni = LAP.s.findIndex((s) => s[0] > t % LAP.time) - 1;
      const k = ni < 0 ? LAP.s.length - 1 : ni;
      if (k !== i) { if (k < i) t = t % LAP.time; i = k; }
      frameT += dt;
      if (frameT > 0.2) { frameT = 0; transmit(); renderFrame(); }
    }
    drawTrack();
  });
});

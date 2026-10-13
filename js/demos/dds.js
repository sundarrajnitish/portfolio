/* DDS: 32-bit phase accumulator -> 10-bit phase -> quarter-wave sine ROM (256 x 10-bit signed).
 * Plant a netlist bug and run an exhaustive equivalence check over all 1,024 phases against the RTL. */
Demos.register('dds', (el, { T, h, onLang, loop, fitCanvas }) => {
  const FCLK = 100e6, N = 32, M = 10, A = 511;
  const ROM = Array.from({ length: 256 }, (_, i) => Math.round(A * Math.sin((2 * Math.PI * (i + 0.5)) / 1024)));
  function rtl(phase) {                 // quarter-wave reconstruction, as in dds_synthesizer.vhd
    const q = phase >> 8, idx = phase & 255;
    const v = ROM[q & 1 ? 255 - idx : idx];
    return q & 2 ? -v : v;
  }
  const BUGS = [
    { en: 'No bug (golden netlist)', fr: 'Aucun bogue (netlist de référence)', f: rtl },
    { en: 'ROM data bit 6: AND cell swapped for OR', fr: 'Bit 6 de la ROM : cellule AND remplacée par OR', f: (p) => { const v = rtl(p); const m = Math.abs(v) | 64; return v < 0 ? -m : m; } },
    { en: 'Sign flip-flop wired to phase bit 8', fr: 'Bascule de signe câblée au bit de phase 8', f: (p) => { const q = p >> 8, idx = p & 255, v = ROM[q & 1 ? 255 - idx : idx]; return q & 1 ? -v : v; } },
    { en: 'Mirror XOR replaced by XNOR', fr: 'XOR de symétrie remplacé par XNOR', f: (p) => { const q = p >> 8, idx = p & 255, v = ROM[q & 1 ? idx : 255 - idx]; return q & 2 ? -v : v; } },
  ];
  let ftw = Math.round((1.2e6 / FCLK) * 2 ** N), acc = 0, bug = 0, check = null, samples = [];

  const cv = h('canvas', { class: 'd-canvas' });
  const kp = h('div', { class: 'd-kpis' });
  const slider = h('input', { type: 'range', min: 0, max: 1000, value: 0, oninput: (e) => { ftw = Math.round(2 ** (16 + (+e.target.value / 1000) * 14)); } });
  slider.value = String(((Math.log2(ftw) - 16) / 14) * 1000);
  const sel = h('select', { class: 'd-select', onchange: (e) => { bug = +e.target.value; check = null; draw(); } });
  const bCheck = h('button', { class: 'd-btn primary', onclick: () => { check = equiv(); draw(); } });
  const verdict = h('div');
  el.append(kp, h('div', { style: 'margin:14px 0' }, cv),
    h('div', { class: 'd-col' }, h('span', { class: 'd-label', id: 'ddsl' }), slider),
    h('div', { class: 'd-row', style: 'margin-top:12px' }, sel, bCheck), h('div', { style: 'margin-top:10px' }, verdict));

  function equiv() {
    let fails = 0, cex = null, bits = 0;
    for (let p = 0; p < 1024; p++) {
      const a = rtl(p), b = BUGS[bug].f(p);
      if (a !== b) { fails++; bits |= (a & 1023) ^ (b & 1023); if (!cex) cex = { p, a, b }; }
    }
    return { fails, cex, points: bits.toString(2).split('').filter((x) => x === '1').length };
  }
  const h3 = (v) => '0x' + (v & 1023).toString(16).toUpperCase().padStart(3, '0');
  function draw() {
    el.querySelector('#ddsl').textContent = T('Frequency tuning word (FTW)', 'Mot d’accord en fréquence (FTW)');
    sel.replaceChildren(...BUGS.map((b, i) => h('option', { value: i, selected: i === bug }, T(b.en, b.fr))));
    bCheck.textContent = T('Check equivalence', 'Vérifier l’équivalence');
    if (!check) { verdict.replaceChildren(h('p', { class: 'd-label' }, T('Exhaustive: every one of the 1,024 phase values, RTL vs netlist.', 'Exhaustif : chacune des 1 024 valeurs de phase, RTL contre netlist.'))); return; }
    verdict.replaceChildren(h('div', { style: `font-weight:600;padding:10px 14px;border-radius:12px;background:${check.fails ? 'rgba(255,69,58,.12)' : 'rgba(48,209,88,.12)'}` },
      check.fails
        ? T(`NOT equivalent: ${check.fails}/1024 phases differ on ${check.points} output bit(s). Counter-example: phase ${h3(check.cex.p)}, RTL ${check.cex.a}, netlist ${check.cex.b}.`,
          `NON équivalent : ${check.fails}/1024 phases diffèrent sur ${check.points} bit(s) de sortie. Contre-exemple : phase ${h3(check.cex.p)}, RTL ${check.cex.a}, netlist ${check.cex.b}.`)
        : T('Equivalent: all 1,024 phases match. Golden netlist ≡ RTL.', 'Équivalent : les 1 024 phases concordent. Netlist de référence ≡ RTL.')));
  }
  function kpis() {
    const fout = (ftw / 2 ** N) * FCLK;
    const k = (v, l) => h('div', { class: 'd-kpi' }, h('b', {}, v), h('span', {}, l));
    kp.replaceChildren(
      k(fout >= 1e6 ? `${(fout / 1e6).toFixed(3)} MHz` : `${(fout / 1e3).toFixed(2)} kHz`, 'f_out = FTW / 2³² · f_clk'),
      k('0x' + (ftw >>> 0).toString(16).toUpperCase().padStart(8, '0'), 'FTW'),
      k('0x' + (acc >>> 0).toString(16).toUpperCase().padStart(8, '0'), T('phase accumulator', 'accumulateur de phase')),
      k(String(BUGS[bug].f(acc >>> 22)), T('ampl_o (10-bit)', 'ampl_o (10 bits)')),
    );
  }
  draw(); onLang(() => { draw(); kpis(); });

  let kT = 0;
  loop((dt) => {
    // slow motion: 1 displayed sample per "clock"; advance a few clocks per frame
    const clocks = 3;
    for (let i = 0; i < clocks; i++) { acc = (acc + ftw) >>> 0; samples.push(acc >>> 22); }
    if (samples.length > 320) samples.splice(0, samples.length - 320);
    const { ctx, w, h: H } = fitCanvas(cv, 210);
    ctx.clearRect(0, 0, w, H);
    const cx = 105, cy = H / 2, R = 78;
    // phase wheel: 1,024 positions, quadrant split marks
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    for (let q = 0; q < 4; q++) { const a = -q * Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (R - 6), cy + Math.sin(a) * (R - 6)); ctx.lineTo(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6)); ctx.stroke(); }
    const ph = acc / 2 ** 32 * 2 * Math.PI;
    const tipY = cy - Math.sin(ph) * R;
    ctx.strokeStyle = '#f5f5f7'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ph) * R, tipY); ctx.stroke();
    ctx.fillStyle = '#f5f5f7'; ctx.beginPath(); ctx.arc(cx + Math.cos(ph) * R, tipY, 4.5, 0, 7); ctx.fill();
    // samples
    const x0 = cx + R + 40, sw = (w - x0 - 10) / 320;
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(cx + Math.cos(ph) * R, tipY); ctx.lineTo(w - 10, tipY); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(w - 10, cy); ctx.stroke();
    const plot = (f, color, lw) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
      samples.forEach((p, i) => { const x = w - 10 - (samples.length - 1 - i) * sw, y = cy - (f(p) / A) * R; i ? (ctx.lineTo(x, ctx._y), ctx.lineTo(x, y)) : ctx.moveTo(x, y); ctx._y = y; });
      ctx.stroke();
    };
    plot(rtl, 'rgba(41,151,255,.95)', 2);
    if (bug) plot(BUGS[bug].f, 'rgba(255,69,58,.9)', 1.6);
    ctx.fillStyle = '#6e6e73'; ctx.font = '600 11px ' + getComputedStyle(document.body).fontFamily;
    ctx.fillText(T('RTL', 'RTL'), x0, 16);
    if (bug) { ctx.fillStyle = '#ff453a'; ctx.fillText(T('buggy netlist', 'netlist boguée'), x0 + 36, 16); }
    kT += dt;
    if (kT > 0.2) { kT = 0; kpis(); }
  });
});

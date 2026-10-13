/* Handwriting-Machine: text -> single-stroke plotter font -> G-code in the firmware's dialect
 * (G01 moves; M03 pen down / M05 pen up; G00 is ignored by the parser, so travel is G01 with the pen up). */
Demos.register('plotter', (el, { T, h, onLang, loop, fitCanvas }) => {
  // glyphs on a 4 x 6 grid, strokes split by '|', points as "xy"
  const F = {
    A: '00 26 40|13 33', B: '00 06 36 45 44 33 03|33 42 41 30 00', C: '45 36 16 05 01 10 30 41', D: '00 06 26 44 42 20 00',
    E: '40 00 06 46|03 33', F: '00 06 46|03 33', G: '45 36 16 05 01 10 30 41 43 23', H: '00 06|40 46|03 43',
    I: '10 30|20 26|16 36', J: '46 41 30 10 01', K: '00 06|46 02|13 40', L: '06 00 40', M: '00 06 23 46 40',
    N: '00 06 40 46', O: '16 36 45 41 30 10 01 05 16', P: '00 06 36 45 44 33 03', Q: '16 36 45 41 30 10 01 05 16|22 40',
    R: '00 06 36 45 44 33 03|23 40', S: '45 36 16 05 04 13 33 42 41 30 10 01', T: '06 46|26 20', U: '06 01 10 30 41 46',
    V: '06 20 46', W: '06 10 23 30 46', X: '06 40|00 46', Y: '06 23 46|23 20', Z: '06 46 00 40',
    0: '16 36 45 41 30 10 01 05 16|01 45', 1: '14 26 20|10 30', 2: '05 16 36 45 44 00 40', 3: '05 16 36 45 44 33 13|33 42 41 30 10 01',
    4: '30 36 02 42', 5: '46 06 04 34 43 41 30 10 01', 6: '45 36 16 05 01 10 30 41 42 33 13 02', 7: '06 46 10',
    8: '13 04 05 16 36 45 44 33 13 02 01 10 30 41 42 33', 9: '45 36 16 05 04 13 33 44|44 41 30 10 01',
    '.': '20 21', ',': '21 10', '!': '26 22|20 21', '?': '05 16 36 45 44 23 22|20 21', '-': '13 33', "'": '26 25', ' ': '',
  };
  const BED = 155;
  let text = 'HELLO MONTREAL', prog = [], moves = [], idx = 0, prog_t = 0, pen = { x: 0, y: 0, down: false }, ink = [], speed = 90;

  function compile(str) {
    const s = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().split('').filter((c) => F[c] !== undefined).join('').slice(0, 18);
    // wrap words onto up to three lines of at most 10 characters
    const lines = [];
    for (const word of s.split(' ').filter(Boolean)) {
      const last = lines[lines.length - 1];
      if (last !== undefined && (last + ' ' + word).length <= 10) lines[lines.length - 1] = last + ' ' + word;
      else lines.push(word.slice(0, 10));
    }
    if (!lines.length) lines.push('');
    lines.splice(3);
    const longest = Math.max(1, ...lines.map((l) => l.length));
    const u = Math.min(4.5, 140 / (6 * longest - 2), 140 / (lines.length * 9 - 3));
    const blockH = (lines.length * 9 - 3) * u;
    const g = ['G21 ; mm', 'G90 ; absolute', 'M05 ; pen up'];
    const mv = [];
    let cur = { x: 0, y: 0 };
    lines.forEach((line, li) => {
      const x0 = (BED - (6 * line.length - 2) * u) / 2, y0 = (BED + blockH) / 2 - 6 * u - li * 9 * u;
      [...line].forEach((c, k) => {
        for (const stroke of F[c].split('|').filter(Boolean)) {
          const pts = stroke.split(' ').map((p) => ({ x: x0 + (k * 6 + +p[0]) * u, y: y0 + +p[1] * u }));
          g.push('M05'); mv.push({ g: g.length - 1, pen: false });
          g.push(`G01 X${pts[0].x.toFixed(2)} Y${pts[0].y.toFixed(2)}`); mv.push({ g: g.length - 1, to: pts[0], pen: false, from: cur });
          g.push('M03'); mv.push({ g: g.length - 1, pen: true });
          cur = pts[0];
          for (const p of pts.slice(1)) { g.push(`G01 X${p.x.toFixed(2)} Y${p.y.toFixed(2)}`); mv.push({ g: g.length - 1, to: p, pen: true, from: cur }); cur = p; }
        }
      });
    });
    g.push('M05'); mv.push({ g: g.length - 1, pen: false });
    g.push('G01 X0.00 Y0.00 ; home'); mv.push({ g: g.length - 1, to: { x: 0, y: 0 }, pen: false, from: cur });
    return { g, mv };
  }
  function start() {
    const c = compile(text);
    prog = c.g; moves = c.mv; idx = 0; prog_t = 0; ink = []; pen = { x: 0, y: 0, down: false };
    draw();
  }

  const cv = h('canvas', { class: 'd-canvas' });
  const list = h('div', { class: 'd-log', style: 'max-height:268px;height:268px' });
  const input = h('input', { class: 'd-input', maxlength: 18, value: text, style: 'flex:1;min-width:160px', onkeydown: (e) => { if (e.key === 'Enter') { text = input.value || ' '; start(); } } });
  const bPlot = h('button', { class: 'd-btn primary', onclick: () => { text = input.value || ' '; start(); } });
  const info = h('span', { class: 'd-label' });
  el.append(h('div', { class: 'd-row' }, input, bPlot, info),
    h('div', { class: 'd-grid2', style: 'margin-top:14px' }, cv, h('div', { class: 'd-panel' }, list)));

  function labels() { bPlot.textContent = T('Plot it', 'Tracer'); input.placeholder = T('Type up to 18 characters', 'Tapez jusqu’à 18 caractères'); draw(); }
  function draw() {
    const cur = moves[idx] ? moves[idx].g : prog.length;
    const from = Math.max(0, cur - 6);
    list.replaceChildren(...prog.slice(from, from + 18).map((l, i) => h('div', {
      style: from + i === cur ? 'color:#000;background:#f5f5f7;border-radius:4px;padding:0 4px' : l.startsWith('M03') ? 'color:var(--orange)' : l.startsWith('M05') ? 'color:var(--ink-3)' : '',
    }, `${String(from + i + 1).padStart(3, ' ')}  ${l}`)));
    info.textContent = T(`${prog.length} lines · ATmega16 · 54.35 steps/mm`, `${prog.length} lignes · ATmega16 · 54,35 pas/mm`);
  }
  labels(); start(); onLang(labels);

  loop((dt) => {
    // advance through the move list at `speed` mm/s (pen up moves 2x faster)
    let budget = dt * speed;
    while (budget > 0 && idx < moves.length) {
      const m = moves[idx];
      if (!m.to) { pen.down = m.pen; idx++; budget -= 2; draw(); continue; }
      const L = Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y) || 0.001;
      const v = m.pen ? 1 : 2.5;
      prog_t += budget * v;
      const k = Math.min(prog_t / L, 1);
      const x = m.from.x + (m.to.x - m.from.x) * k, y = m.from.y + (m.to.y - m.from.y) * k;
      if (pen.down) ink.push([pen.x, pen.y, x, y]);
      pen.x = x; pen.y = y;
      if (k >= 1) { budget = (prog_t - L) / v; prog_t = 0; idx++; draw(); } else budget = 0;
    }
    const { ctx, w, h: H } = fitCanvas(cv, 270);
    const sc = Math.min(w, H) / BED * 0.92, ox = (w - BED * sc) / 2, oy = (H - BED * sc) / 2;
    const X = (x) => ox + x * sc, Y = (y) => oy + (BED - y) * sc;
    ctx.clearRect(0, 0, w, H);
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(ox, oy, BED * sc, BED * sc);
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
    for (let g = 0; g <= BED; g += 15.5) { ctx.beginPath(); ctx.moveTo(X(g), Y(0)); ctx.lineTo(X(g), Y(BED)); ctx.moveTo(X(0), Y(g)); ctx.lineTo(X(BED), Y(g)); ctx.stroke(); }
    ctx.strokeStyle = '#f5f5f7'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); for (const [a, b, c, d] of ink) { ctx.moveTo(X(a), Y(b)); ctx.lineTo(X(c), Y(d)); } ctx.stroke();
    // gantry + pen
    ctx.strokeStyle = 'rgba(41,151,255,.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(pen.x), Y(0)); ctx.lineTo(X(pen.x), Y(BED)); ctx.moveTo(X(0), Y(pen.y)); ctx.lineTo(X(BED), Y(pen.y)); ctx.stroke();
    ctx.strokeStyle = '#2997ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(pen.x), Y(pen.y), 8, 0, 7); ctx.stroke();
    ctx.fillStyle = pen.down ? '#ff9f0a' : 'transparent'; ctx.beginPath(); ctx.arc(X(pen.x), Y(pen.y), 3.5, 0, 7); ctx.fill();
  });
});

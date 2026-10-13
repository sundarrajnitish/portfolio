/* Dadda multiplier, bit by bit: the 8x8 partial products are reduced to two rows with full and half
 * adders (targets 6, 4, 3, 2), then a carry-propagate adder makes P. The weighted sum is checked every stage. */
Demos.register('arith', (el, { T, h, onLang, loop }) => {
  const W = 16;
  // a bit: { v: 0|1, k: 'pp'|'fa'|'ha'|'c'|'p' }
  function stages(a, b) {
    let cols = Array.from({ length: W }, () => []);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) cols[i + j].push({ v: ((a >> i) & 1) & ((b >> j) & 1), k: 'pp' });
    const out = [{ cols, d: 8, fa: 0, ha: 0 }];
    for (const d of [6, 4, 3, 2]) {
      const next = Array.from({ length: W }, () => []);
      let fa = 0, ha = 0;
      for (let c = 0; c < W; c++) {
        const bits = cols[c].map((x) => ({ ...x, k: x.k === 'p' ? 'pp' : x.k }));
        // carries already pushed into this column by the previous column count toward the height
        while (bits.length + next[c].length > d) {
          if (bits.length + next[c].length - d >= 2 && bits.length >= 3) {
            const [x, y, z] = bits.splice(0, 3), s = x.v + y.v + z.v;
            next[c].push({ v: s & 1, k: 'fa' }); if (c + 1 < W) next[c + 1].push({ v: s >> 1, k: 'c' }); fa++;
          } else if (bits.length >= 2) {
            const [x, y] = bits.splice(0, 2), s = x.v + y.v;
            next[c].push({ v: s & 1, k: 'ha' }); if (c + 1 < W) next[c + 1].push({ v: s >> 1, k: 'c' }); ha++;
          } else break;
        }
        next[c].push(...bits.map((x) => ({ ...x, k: x.k === 'c' || x.k === 'fa' || x.k === 'ha' ? 'pp' : x.k })));
      }
      cols = next;
      out.push({ cols, d, fa, ha });
    }
    const p = a * b;
    out.push({ cols: Array.from({ length: W }, (_, c) => [{ v: (p >> c) & 1, k: 'p' }]), d: 1, fa: 0, ha: 0, cpa: true });
    return out;
  }
  const sum = (cols) => cols.reduce((acc, col, c) => acc + col.reduce((s, x) => s + x.v, 0) * 2 ** c, 0);

  let A = 0xB7, B = 0x5D, st = stages(A, B), k = 0, playing = false, pT = 0;
  const svg = h('svg', { class: 'd-svg', viewBox: '0 0 600 210' });
  const info = h('div', { class: 'd-kpis' });
  const inA = h('input', { class: 'd-input', type: 'number', min: 0, max: 255, value: A, style: 'width:80px', oninput: upd });
  const inB = h('input', { class: 'd-input', type: 'number', min: 0, max: 255, value: B, style: 'width:80px', oninput: upd });
  const bPrev = h('button', { class: 'd-btn', onclick: () => { k = Math.max(0, k - 1); playing = false; draw(); } }, '◀');
  const bNext = h('button', { class: 'd-btn', onclick: () => { k = Math.min(st.length - 1, k + 1); playing = false; draw(); } }, '▶');
  const bPlay = h('button', { class: 'd-btn primary', onclick: () => { playing = !playing; if (playing && k === st.length - 1) k = 0; draw(); } });
  const bRand = h('button', { class: 'd-btn', onclick: () => { inA.value = (Math.random() * 256) | 0; inB.value = (Math.random() * 256) | 0; upd(); } });
  const legend = h('div', { class: 'd-row', style: 'gap:14px;font-size:12px;color:var(--ink-2)' });
  el.append(
    h('div', { class: 'd-row' }, 'A', inA, 'B', inB, bRand, h('span', { style: 'flex:1' }), bPrev, bPlay, bNext),
    h('div', { style: 'margin:14px 0 6px' }, svg), legend, h('div', { style: 'margin-top:12px' }, info));
  function upd() {
    A = Math.max(0, Math.min(255, +inA.value | 0)); B = Math.max(0, Math.min(255, +inB.value | 0));
    st = stages(A, B); k = 0; draw();
  }
  const COL = { pp: '#f5f5f7', fa: '#2997ff', ha: '#30d158', c: '#ff9f0a', p: '#bf5af2' };
  function draw() {
    const s = st[k];
    svg.replaceChildren();
    const x0 = 570, dx = 34, y0 = 172, dy = 19;
    for (let c = 0; c < W; c++) {
      svg.append(h('text', { x: x0 - c * dx, y: 202, 'text-anchor': 'middle', fill: '#6e6e73', style: 'font:600 10px var(--mono)' }, c));
      s.cols[c].forEach((bit, r) => svg.append(h('circle', {
        cx: x0 - c * dx, cy: y0 - r * dy, r: 7, fill: bit.v ? COL[bit.k] : 'none', stroke: COL[bit.k], 'stroke-width': 1.6,
        style: 'transition:all .4s', opacity: bit.v ? 1 : 0.55,
      })));
    }
    if (s.d > 1 && s.d < 8) svg.append(h('line', { x1: 20, x2: 590, y1: y0 - (s.d - 0.5) * dy, y2: y0 - (s.d - 0.5) * dy, stroke: 'rgba(255,255,255,.25)', 'stroke-dasharray': '4 5' }));
    const label = k === 0 ? T('Partial products: 64 AND gates', 'Produits partiels : 64 portes AND')
      : s.cpa ? T('Carry-propagate adder → P', 'Additionneur à propagation de retenue → P')
        : T(`Dadda stage ${k}: max height ${s.d}`, `Étage de Dadda ${k} : hauteur max ${s.d}`);
    svg.append(h('text', { x: 20, y: 20, fill: '#f5f5f7', style: 'font:600 14px var(--font)' }, label));
    const S = sum(s.cols);
    const kp = (v, l, c = '') => h('div', { class: 'd-kpi' }, h('b', { class: c }, v), h('span', {}, l));
    info.replaceChildren(
      kp(`${A} × ${B}`, 'A × B'),
      kp(`Σ = ${S.toLocaleString()}`, T('weighted sum of the dots', 'somme pondérée des points'), S === A * B ? 'ok' : 'bad'),
      kp(String(s.fa), T('full adders this stage', 'additionneurs complets à cet étage')),
      kp(String(s.ha), T('half adders this stage', 'demi-additionneurs à cet étage')),
      kp(String(Math.floor((A * B) / 4) + 1), 'P = A·B/4 + 1'),
    );
    bPlay.textContent = playing ? T('Pause', 'Pause') : T('Play', 'Lecture');
    bRand.textContent = T('Random', 'Aléatoire');
    legend.replaceChildren(...[['pp', T('partial product', 'produit partiel')], ['fa', T('full-adder sum', 'somme d’additionneur complet')], ['ha', T('half-adder sum', 'somme de demi-additionneur')], ['c', T('carry in', 'retenue entrante')], ['p', T('product bit', 'bit du produit')]]
      .map(([kk, l]) => h('span', { style: 'display:inline-flex;align-items:center;gap:6px' }, h('i', { style: `width:10px;height:10px;border-radius:50%;background:${COL[kk]};display:inline-block` }), l)),
    h('span', { class: 'muted' }, T('hollow = 0', 'vide = 0')));
  }
  draw(); onLang(draw);
  loop((dt) => {
    if (!playing) return;
    pT += dt;
    if (pT > 1.3) { pT = 0; k++; if (k >= st.length - 1) { k = st.length - 1; playing = false; } draw(); }
  });
});

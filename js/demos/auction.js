/* AuctionHub lot: proxy bidding (price = min(top max, second max + increment)), the real increment
 * ladder, and a soft close that pushes the end to 30 s after any price-moving late bid. */
Demos.register('auction', (el, { T, h, onLang, loop }) => {
  const inc = (p) => (p < 100 ? 2 : p < 500 ? 5 : p < 1000 ? 10 : p < 5000 ? 25 : 50);
  const LOTS = [
    { en: 'Leica M3 rangefinder, 1957', fr: 'Télémètre Leica M3, 1957', start: 120, hue: 260 },
    { en: 'Signed Gilles Villeneuve print', fr: 'Affiche signée de Gilles Villeneuve', start: 80, hue: 0 },
    { en: 'Restored Commodore 64', fr: 'Commodore 64 restauré', start: 60, hue: 200 },
  ];
  let lot, S;
  function newLot() {
    lot = LOTS[(LOTS.indexOf(lot) + 1) % LOTS.length];
    S = {
      left: 45, price: lot.start, maxes: {}, order: [], leader: null, history: [], done: false, extended: 0,
      bots: [
        { name: 'otter88', ceil: lot.start * (1.4 + Math.random() * 0.8), wake: 2 + Math.random() * 4 },
        { name: 'maple_kid', ceil: lot.start * (1.2 + Math.random() * 0.9), wake: 6 + Math.random() * 6, sniper: true },
      ],
    };
    render();
  }

  function placeMax(who, max) {
    if (S.done) return false;
    const min = S.leader === who ? (S.maxes[who] || 0) + 1 : S.price + (S.leader ? inc(S.price) : 0);
    if (max < min) { if (who === 'you') note(T(`Too low: at least C$${min}`, `Trop bas : au moins ${min} $ CA`), 'bad'); return false; }
    const before = S.price, beforeLeader = S.leader;
    if (!(who in S.maxes)) S.order.push(who);
    S.maxes[who] = max;
    // proxy resolution: highest max leads (earliest wins ties); price = min(top, second + increment)
    const ranked = Object.entries(S.maxes).sort((a, b) => b[1] - a[1] || S.order.indexOf(a[0]) - S.order.indexOf(b[0]));
    const [top, second] = ranked;
    S.leader = top[0];
    S.price = second ? Math.min(top[1], second[1] + inc(second[1])) : Math.max(S.price, lot.start);
    if (S.price !== before || S.leader !== beforeLeader) {
      S.history.unshift({ who: S.leader, price: S.price });
      if (S.left < 30) { S.left = 30; S.extended++; note(T('Soft close: end pushed to 30 s', 'Fermeture souple : fin repoussée à 30 s'), 'warn'); }
      if (beforeLeader === 'you' && S.leader !== 'you') note(T(`Outbid by ${S.leader}`, `Surenchéri par ${S.leader}`), 'bad');
      else if (who !== 'you' && S.leader === 'you') note(T(`Your max defended you at C$${S.price}`, `Votre maximum vous a défendu à ${S.price} $ CA`), 'ok');
    }
    render();
    return true;
  }

  const box = h('div', { class: 'd-grid2' });
  const toast = h('div', { class: 'd-label', style: 'min-height:20px;font-size:14px' });
  el.append(h('style', { text: `
      .au-art{aspect-ratio:4/3;max-height:190px;border-radius:18px;display:grid;place-items:center;font-size:56px}
      .au-price{font-size:46px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
      .au-ring{width:86px;height:86px}
      .au-hist div{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--hair-2);font-size:13px}
      .au-sold{font:700 28px var(--font);letter-spacing:-.02em}
    ` }), box, toast);
  function note(msg, cls) { toast.textContent = msg; toast.className = 'd-label ' + cls; }

  const input = h('input', { class: 'd-input', type: 'number', style: 'width:110px' });
  const ringHolder = h('div');
  const tick = () => ringHolder.replaceChildren(ringSvg(Math.max(0, S.left) / 45));
  function render() {
    const you = S.leader === 'you';
    box.replaceChildren(
      h('div', { class: 'd-col' },
        h('div', { class: 'au-art', style: `background:linear-gradient(135deg,hsl(${lot.hue} 50% 30%),hsl(${lot.hue + 40} 60% 15%))` }, '🔨'),
        h('b', {}, T(lot.en, lot.fr)),
        h('span', { class: 'd-label' }, T('Increments: C$2 under 100, C$5 to 500, C$10 to 1,000', 'Paliers : 2 $ sous 100, 5 $ jusqu’à 500, 10 $ jusqu’à 1 000'))),
      h('div', { class: 'd-col' },
        h('div', { class: 'd-row', style: 'justify-content:space-between' },
          h('div', {}, h('div', { class: 'd-label' }, S.done ? T('Hammer price', 'Prix d’adjudication') : T('Current price', 'Prix actuel')),
            h('div', { class: 'au-price' }, `C$${S.price}`),
            h('div', { class: 'd-label ' + (you ? 'ok' : '') }, S.leader ? (you ? T('You lead', 'Vous menez') : `${T('Leader', 'En tête')}: ${S.leader}`) : T('No bids yet', 'Aucune mise'))),
          ringHolder),
        S.done
          ? h('div', { class: 'd-col' }, h('div', { class: 'au-sold ' + (you ? 'ok' : '') }, S.leader ? (you ? T(`Sold to you for C$${S.price}`, `Adjugé à vous pour ${S.price} $ CA`) : T(`Sold to ${S.leader}`, `Adjugé à ${S.leader}`)) : T('Unsold', 'Invendu')),
            h('button', { class: 'd-btn primary', onclick: newLot }, T('Next lot', 'Lot suivant')))
          : h('div', { class: 'd-row' }, input,
            h('button', { class: 'd-btn primary', onclick: () => placeMax('you', Math.floor(+input.value)) }, T('Set my max', 'Fixer mon max')),
            h('button', { class: 'd-btn', onclick: () => placeMax('you', S.leader === 'you' ? (S.maxes.you || 0) + inc(S.price) : S.price + inc(S.price)) }, `+C$${inc(S.price)}`)),
        h('span', { class: 'd-label' }, S.maxes.you ? T(`Your hidden max: C$${S.maxes.you}`, `Votre maximum caché : ${S.maxes.you} $ CA`) : T('Your max stays hidden from everyone else.', 'Votre maximum reste caché aux autres.')),
        h('div', { class: 'au-hist d-panel' }, ...(S.history.length ? S.history.slice(0, 5) : [null]).map((b) =>
          b ? h('div', {}, h('span', { class: b.who === 'you' ? 'ok' : '' }, b.who === 'you' ? T('you', 'vous') : b.who), h('span', { class: 'd-mono' }, `C$${b.price}`))
            : h('div', { class: 'muted' }, T('Bid history appears here', 'L’historique des mises apparaît ici'))))),
    );
    if (!input.value || +input.value < S.price + inc(S.price)) input.value = S.price + inc(S.price) * 3;
    tick();
  }
  function ringSvg(frac) {
    const r = 36, c = 2 * Math.PI * r, secs = Math.max(0, Math.ceil(S.left));
    return h('svg', { class: 'au-ring', viewBox: '0 0 86 86' },
      h('circle', { cx: 43, cy: 43, r, fill: 'none', stroke: 'rgba(255,255,255,.12)', 'stroke-width': 6 }),
      h('circle', { cx: 43, cy: 43, r, fill: 'none', stroke: S.left < 10 ? '#ff453a' : '#f5f5f7', 'stroke-width': 6, 'stroke-linecap': 'round',
        'stroke-dasharray': c, 'stroke-dashoffset': c * (1 - frac), transform: 'rotate(-90 43 43)' }),
      h('text', { x: 43, y: 49, 'text-anchor': 'middle', fill: '#f5f5f7', style: 'font:600 17px var(--font)' }, `0:${String(secs).padStart(2, '0')}`));
  }

  newLot(); onLang(render);
  let acc = 0;
  loop((dt) => {
    if (S.done || !dt) return;
    S.left -= dt;
    for (const b of S.bots) {
      b.wake -= dt;
      if (b.wake > 0 || S.leader === b.name) continue;
      const lateOnly = b.sniper && S.left > 9;
      if (lateOnly) continue;
      const need = S.price + inc(S.price);
      if (need <= b.ceil) placeMax(b.name, Math.min(Math.floor(b.ceil), need + inc(S.price) * Math.floor(Math.random() * 3)));
      b.wake = 2 + Math.random() * 5;
    }
    if (S.left <= 0) { S.left = 0; S.done = true; render(); return; }
    acc += dt;
    if (acc > 0.25) { acc = 0; tick(); }
  });
});

/* Le Crimson: interest-filtered feed, accent-insensitive search, bookmarks. Stories are fictional, as in the app. */
Demos.register('crimson', (el, { T, h, onLang }) => {
  const TOPICS = [['tech', 'Tech', 'Techno'], ['science', 'Science', 'Science'], ['montreal', 'Montréal', 'Montréal'],
    ['sports', 'Sports', 'Sports'], ['climate', 'Climate', 'Climat'], ['culture', 'Culture', 'Culture']];
  const STORIES = [
    ['tech', 'A pocket-sized solar charger lasts a full camping week', 'Un chargeur solaire de poche tient une semaine complète en camping', 4],
    ['montreal', 'Montréal adds 40 km of protected bike lanes before winter', 'Montréal ajoute 40 km de pistes cyclables protégées avant l’hiver', 3],
    ['science', 'Researchers map a new layer of the ocean’s twilight zone', 'Des chercheurs cartographient une nouvelle couche de la zone crépusculaire océanique', 6],
    ['sports', 'Canadiens prospect scores twice in a preseason debut', 'Un espoir du Canadien marque deux fois à ses débuts présaison', 2],
    ['climate', 'Québec’s maple harvest shifts two weeks earlier', 'La récolte d’érable du Québec avance de deux semaines', 5],
    ['culture', 'A café in Mile End turns its walls into a rotating gallery', 'Un café du Mile End transforme ses murs en galerie tournante', 3],
    ['tech', 'Open-source chip tools close the gap with commercial suites', 'Les outils libres de conception de puces rattrapent les suites commerciales', 7],
    ['montreal', 'The REM’s newest branch opens with free rides all weekend', 'La nouvelle antenne du REM ouvre avec des trajets gratuits tout le week-end', 2],
    ['science', 'A particle filter helps a rover find itself in a lava tube', 'Un filtre particulaire aide un rover à se localiser dans un tube de lave', 5],
    ['sports', 'Circuit Gilles-Villeneuve tests a new rain-drainage surface', 'Le circuit Gilles-Villeneuve teste un nouveau revêtement drainant', 4],
    ['climate', 'Heat pumps outsell furnaces in Canada for the first time', 'Les thermopompes dépassent les fournaises au Canada pour la première fois', 4],
    ['culture', 'Festival du nouveau cinéma announces its opening night film', 'Le Festival du nouveau cinéma dévoile son film d’ouverture', 3],
  ].map(([topic, en, fr, min], id) => ({ id, topic, en, fr, min }));
  let picked = new Set(['tech', 'montreal', 'science']), q = '', saved = new Set();
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const chips = h('div', { class: 'd-row' });
  const search = h('input', { class: 'd-input', style: 'flex:1;min-width:180px', oninput: (e) => { q = e.target.value; feed(); } });
  const meta = h('span', { class: 'd-label' });
  const grid = h('div', { class: 'lc-grid' });
  el.append(h('style', { text: `
      .lc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
      .lc-card{border-radius:14px;overflow:hidden;background:rgba(0,0,0,.35);border:1px solid var(--hair-2);display:flex;flex-direction:column;animation:rise .5s var(--ease)}
      .lc-img{height:70px}
      .lc-body{padding:10px 12px;display:flex;flex-direction:column;gap:6px;flex:1}
      .lc-body b{font-size:14px;line-height:1.3}
      .lc-foot{display:flex;justify-content:space-between;align-items:center;margin-top:auto;font-size:11.5px;color:var(--ink-3)}
      .lc-star{background:none;border:0;cursor:pointer;font-size:16px;color:var(--ink-3)} .lc-star.on{color:#ffd60a}
      @media(max-width:700px){.lc-grid{grid-template-columns:1fr 1fr}}
    ` }), chips, h('div', { class: 'd-row', style: 'margin-top:12px' }, search, meta), grid);
  const HUE = { tech: 210, science: 270, montreal: 350, sports: 30, climate: 140, culture: 300 };

  function feed() {
    const list = STORIES.filter((s) => picked.has(s.topic) && (!q || fold(s.en + ' ' + s.fr).includes(fold(q))));
    meta.textContent = T(`${list.length} stories · ${saved.size} saved`, `${list.length} articles · ${saved.size} enregistrés`);
    grid.replaceChildren(...(list.length ? list : [null]).map((s) => s ? h('div', { class: 'lc-card' },
      h('div', { class: 'lc-img', style: `background:linear-gradient(135deg,hsl(${HUE[s.topic]} 55% 35%),hsl(${HUE[s.topic] + 30} 60% 14%))` }),
      h('div', { class: 'lc-body' },
        h('span', { class: 'd-label' }, T(...TOPICS.find((t) => t[0] === s.topic).slice(1))),
        h('b', {}, T(s.en, s.fr)),
        h('div', { class: 'lc-foot' }, T(`${s.min} min read`, `${s.min} min de lecture`),
          h('button', { class: 'lc-star' + (saved.has(s.id) ? ' on' : ''), 'aria-label': 'bookmark', onclick: () => { saved.has(s.id) ? saved.delete(s.id) : saved.add(s.id); feed(); } }, saved.has(s.id) ? '★' : '☆'))))
      : h('p', { class: 'muted', style: 'grid-column:1/-1' }, T('Nothing matches. Try another interest or search.', 'Aucun résultat. Essayez un autre intérêt ou une autre recherche.'))));
  }
  function all() {
    chips.replaceChildren(...TOPICS.map(([k, en, fr]) => h('button', { class: 'chip' + (picked.has(k) ? ' on' : ''), onclick: () => { picked.has(k) ? picked.delete(k) : picked.add(k); all(); } }, T(en, fr))));
    search.placeholder = T('Search, e.g. “montreal” or “quebec”', 'Rechercher, p. ex. « montreal » ou « quebec »');
    feed();
  }
  all(); onLang(all);
});

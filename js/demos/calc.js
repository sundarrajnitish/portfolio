/* Calc1 regression against the real 4-state model (js/vendor/calc1-model.js, cycle-identical to the RTL).
 * A small self-checking testbench: driver, transaction-level reference model, scoreboard, timeouts. */
Demos.register('calc', (el, { T, h, onLang }) => {
  const M = window.Calc1Model;
  const FR = ['Référence (aucun bogue)', 'Additionneur du port 1 : bit 4 de l’opérande 2 ponté au bit 5', 'SUB du port 1 bloqué à 0, emprunt jamais signalé',
    'SHL de 0 produit des X', 'SHR de 0 → 0, SHR de 1 → aucun décalage', 'Débordement de ADD non signalé',
    'Requête du port 4 perdue quand le port 1 gagne l’arbitrage', 'Commande invalide jamais répondue'];
  const hex = (v) => '0x' + (v >>> 0).toString(16).padStart(8, '0');
  const CMDN = { 1: 'ADD', 2: 'SUB', 3: 'INV3', 5: 'SHL', 6: 'SHR' };

  /* ---------- testbench ---------- */
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function plan(seed = 7) {
    const r = rng(seed), word = () => (r() < 0.3 ? (r() * 64) | 0 : (r() * 4294967296) >>> 0);
    const directed = [
      [1, 1, 0x10, 0x20], [1, 1, 5, 0x30], [2, 1, 0xFFFFFFFF, 2], [1, 2, 100, 30], [1, 2, 7, 7], [2, 2, 3, 9],
      [3, 5, 0x0F, 0], [3, 5, 1, 31], [4, 6, 0xF0, 0], [4, 6, 0xF0, 1], [2, 6, 0xF0, 4], [3, 3, 1, 1],
    ].map(([p, c, a, b]) => ({ group: 'directed', start: 0, items: [{ p, c, a, b }] }));
    const concurrent = [{ group: 'concurrent', items: [{ p: 1, c: 1, a: 1, b: 2 }, { p: 4, c: 1, a: 3, b: 4 }] },
      { group: 'concurrent', items: [{ p: 1, c: 5, a: 9, b: 2 }, { p: 4, c: 6, a: 64, b: 3 }] }];
    const random = Array.from({ length: 160 }, () => {
      const c = [1, 2, 5, 6][(r() * 4) | 0];
      return { group: 'random', items: [{ p: 1 + ((r() * 4) | 0), c, a: word(), b: c >= 5 ? (r() * 32) | 0 : word() }] };
    });
    return [...directed, ...concurrent, ...random];
  }
  function run(bug) {
    const dut = new M.Calc1(bug);
    dut.step({ reset: 1, cmd: [0, 0, 0, 0, 0], data: [0, 0, 0, 0, 0] });
    const res = { pass: 0, fail: 0, groups: { directed: [0, 0], concurrent: [0, 0], random: [0, 0] }, errs: [], cycles: 0 };
    for (const tx of plan()) {
      const st = tx.items.map((it) => ({ ...it, phase: 0, wait: 0, got: null }));
      for (let cyc = 0; cyc < 60 && st.some((s) => !s.got); cyc++) {
        const inp = { reset: 0, cmd: [0, 0, 0, 0, 0], data: [0, 0, 0, 0, 0] };
        for (const s of st) {
          if (s.phase === 0) { inp.cmd[s.p] = s.c; inp.data[s.p] = s.a; s.phase = 1; }
          else if (s.phase === 1) { inp.data[s.p] = s.b; s.phase = 2; }
        }
        const out = dut.step(inp);
        res.cycles++;
        for (const s of st) if (s.phase === 2 && !s.got && out.resp[s.p]) s.got = { resp: out.resp[s.p], data: out.data[s.p] };
      }
      for (const s of st) {
        const exp = M.predict(s.c, s.a, s.b);
        let why = null;
        if (!s.got) why = T('timeout: no response in 60 cycles', 'délai dépassé : aucune réponse en 60 cycles');
        else if (s.got.resp !== exp.resp) why = T(`resp ${s.got.resp}, expected ${exp.resp}`, `resp ${s.got.resp}, attendu ${exp.resp}`);
        else if (exp.resp === 1 && (s.got.data.x || s.got.data.v !== exp.data)) why = `${T('data', 'données')} ${M.fmtHex(s.got.data)}, ${T('expected', 'attendu')} ${M.fmtHex({ v: exp.data, x: 0 })}`;
        const g = res.groups[tx.group];
        if (why) { res.fail++; g[1]++; if (res.errs.length < 6) res.errs.push(`port${s.p} ${CMDN[s.c]} ${hex(s.a)}, ${hex(s.b)} → ${why}`); }
        else { res.pass++; g[0]++; }
      }
    }
    return res;
  }

  /* ---------- UI ---------- */
  let bug = 1, last = null, matrix = null;
  const out = h('div', { class: 'd-col' });
  const sel = h('select', { class: 'd-select', style: 'max-width:100%', onchange: (e) => { bug = +e.target.value; last = null; draw(); } });
  const bRun = h('button', { class: 'd-btn primary', onclick: () => { last = run(bug); draw(); } });
  const bAll = h('button', { class: 'd-btn', onclick: () => { matrix = M.BUGS.map((b) => ({ id: b.id, r: run(b.id) })); draw(); } });
  el.append(h('div', { class: 'd-row' }, sel, bRun, bAll), h('div', { style: 'margin-top:14px' }, out));

  function draw() {
    sel.replaceChildren(...M.BUGS.map((b) => h('option', { value: b.id, selected: b.id === bug }, `${b.id ? 'Bug ' + b.id + ' · ' : ''}${T(b.name, FR[b.id])}`)));
    bRun.textContent = T('Run regression', 'Lancer la régression');
    bAll.textContent = T('Run every bug', 'Tester tous les bogues');
    const kids = [];
    const b = M.BUGS[bug];
    if (b.origin === '2024') kids.push(h('p', { class: 'd-label' }, T('Seen in the 2024 Questa logs and reproduced exactly by this model.', 'Observé dans les journaux Questa de 2024 et reproduit exactement par ce modèle.')));
    if (last) {
      const caught = last.fail > 0;
      const golden = bug === 0;
      kids.push(h('div', { class: 'd-kpis' },
        ...[['directed', T('directed', 'dirigés')], ['concurrent', T('concurrent', 'concurrents')], ['random', T('random', 'aléatoires')]].map(([g, l]) => {
          const [p, f] = last.groups[g];
          return h('div', { class: 'd-kpi' }, h('b', { class: f ? 'bad' : 'ok' }, `${p}/${p + f}`), h('span', {}, `${T('tests', 'tests')} ${l}`));
        }),
        h('div', { class: 'd-kpi' }, h('b', {}, last.cycles.toLocaleString()), h('span', {}, T('clock cycles', 'cycles d’horloge')))));
      kids.push(h('div', { class: 'verdict ' + ((golden ? !caught : caught) ? 'ok' : 'bad'), style: 'font-weight:600;padding:10px 14px;border-radius:12px;background:' + ((golden ? !caught : caught) ? 'rgba(48,209,88,.12)' : 'rgba(255,69,58,.12)') },
        golden ? (caught ? T('False failure on the golden design!', 'Fausse alerte sur la conception de référence !') : T('Golden design: 0 false failures', 'Conception de référence : 0 fausse alerte'))
          : caught ? T(`Caught: ${last.fail} scoreboard mismatches`, `Détecté : ${last.fail} écarts au tableau de bord`) : T('Escaped: the regression missed it', 'Échappé : la régression l’a manqué')));
      if (last.errs.length) kids.push(h('div', { class: 'd-panel d-log' }, ...last.errs.map((e) => h('div', { class: 'bad' }, e))));
    }
    if (matrix) {
      kids.push(h('div', { class: 'd-panel', style: 'display:grid;grid-template-columns:1fr auto;gap:6px 14px;font-size:13px' },
        ...matrix.flatMap(({ id, r }) => {
          const good = id === 0 ? r.fail === 0 : r.fail > 0;
          return [h('span', { class: 'muted' }, `${id ? 'Bug ' + id : T('Golden', 'Référence')} · ${T(M.BUGS[id].name, FR[id])}`),
            h('b', { class: good ? 'ok' : 'bad' }, id === 0 ? (good ? T('passes', 'réussit') : T('fails', 'échoue')) : good ? T('caught', 'détecté') : T('missed', 'manqué'))];
        })));
      const n = matrix.filter((m) => m.id && m.r.fail).length;
      kids.push(h('p', { class: 'd-label' }, T(`Calc1: ${n}/7 bugs caught. With Calc3's 7, that's the 14/14 in the lab.`, `Calc1 : ${n}/7 bogues détectés. Avec les 7 de Calc3, cela donne les 14/14 du labo.`)));
    }
    out.replaceChildren(...kids);
  }
  draw(); onLang(() => { if (last) last = run(bug); if (matrix) matrix = M.BUGS.map((b) => ({ id: b.id, r: run(b.id) })); draw(); });
});

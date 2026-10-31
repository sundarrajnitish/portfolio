/* "Full-stack, literally": the 68 courses as an isometric stack of engineering layers.
 * Click a layer to open it; the panel lists its courses and the projects on this page that use them.
 * Below, one square per course shows how the stack was built year by year. Each project in the timeline
 * also gets "related coursework" chips that jump back here. */
(function () {
  'use strict';
  const D = window.CURRICULUM;
  const app = document.getElementById('curriculum-app');
  if (!D || !app) return;
  const lang = () => document.documentElement.dataset.lang || 'en';
  const T = (en, fr) => (lang() === 'fr' ? fr : en);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const ALL = [...D.layers, D.people];
  const byId = Object.fromEntries(ALL.map((L) => [L.id, L]));
  let current = 'power';

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.round(c * k).toString(16).padStart(2, '0');
    return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
  }

  // ---------- isometric stack ----------
  const CX = 170, HW = 128, HD = 64, TH = 16, GAP = 36, BASE = 418;
  function slab(L, i) {
    const cy = BASE - i * GAP;
    const top = `M${CX} ${cy - HD}L${CX + HW} ${cy}L${CX} ${cy + HD}L${CX - HW} ${cy}Z`;
    const left = `M${CX - HW} ${cy}L${CX} ${cy + HD}V${cy + HD + TH}L${CX - HW} ${cy + TH}Z`;
    const right = `M${CX} ${cy + HD}L${CX + HW} ${cy}V${cy + TH}L${CX} ${cy + HD + TH}Z`;
    const inset = `M${CX} ${cy - HD * 0.62}L${CX + HW * 0.62} ${cy}L${CX} ${cy + HD * 0.62}L${CX - HW * 0.62} ${cy}Z`;
    return `<g class="cs-layer" data-id="${L.id}" data-i="${i}" tabindex="0" role="button" style="--c:${L.color};--d:${(i * 0.07).toFixed(2)}s">
      <path d="${left}" fill="${shade(L.color, 0.55)}"/><path d="${right}" fill="${shade(L.color, 0.38)}"/>
      <path class="cs-top" d="${top}" fill="${L.color}"/>
      <path d="${inset}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="1.5"/>
      <path d="M${CX - HW * 0.31} ${cy - HD * 0.31}L${CX + HW * 0.31} ${cy + HD * 0.31}M${CX + HW * 0.31} ${cy - HD * 0.31}L${CX - HW * 0.31} ${cy + HD * 0.31}" stroke="#000" stroke-opacity=".12" stroke-width="1.5"/>
      <path class="cs-lead" d="M${CX + HW + 6} ${cy + TH / 2}H${CX + HW + 26}"/>
      <text x="${CX + HW + 32}" y="${cy + TH / 2 + 5}" class="cs-name">${esc(T(L.en, L.fr))}</text>
      <text x="${CX + HW + 32}" y="${cy + TH / 2 + 21}" class="cs-count">${L.courses.length} ${T('courses', 'cours')}</text>
    </g>`;
  }
  function platform() {
    const cy = BASE + 46, hw = 168, hd = 84;
    return `<g class="cs-layer cs-people" data-id="people" tabindex="0" role="button" style="--c:#f5f5f7;--d:0s">
      <path class="cs-top" d="M${CX} ${cy - hd}L${CX + hw} ${cy}L${CX} ${cy + hd}L${CX - hw} ${cy}Z" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-dasharray="5 6"/>
      <path class="cs-lead" d="M${CX + hw + 6} ${cy}H${CX + hw + 18}"/>
      <text x="${CX + hw + 24}" y="${cy + 4}" class="cs-name">${esc(T(D.people.en, D.people.fr))}</text>
      <text x="${CX + hw + 24}" y="${cy + 20}" class="cs-count">${D.people.courses.length} ${T('courses', 'cours')}</text>
    </g>`;
  }

  // ---------- panel ----------
  function panel(L) {
    const idx = D.layers.indexOf(L);
    const srm = L.courses.filter(([, y]) => D.terms[y].school === 'srm').length, cu = L.courses.length - srm;
    const where = L.projects.length
      ? `<p class="cp-sub">${T('Where it shows up on this page', 'Où on la retrouve sur cette page')}</p>
         <div class="cp-projects">${L.projects.map((p) => `<button type="button" class="cp-proj" data-go="${p}">${esc(D.related[p][0])} <span aria-hidden="true">↓</span></button>`).join('')}</div>`
      : '';
    return `
      <p class="cp-eyebrow"><span class="cp-dot" style="background:${L.color}"></span>${idx >= 0 ? T(`Layer ${idx + 1} of ${D.layers.length}`, `Couche ${idx + 1} sur ${D.layers.length}`) : T('The base layer', 'La couche de base')}</p>
      <h3 class="cp-title">${esc(T(L.en, L.fr))}</h3>
      <p class="cp-blurb">${esc(T(L.blurbEn, L.blurbFr))}</p>
      <div class="cp-split" role="img" aria-label="${srm} SRMIST, ${cu} Concordia">
        ${srm ? `<span class="srm" style="flex:${srm}">SRMIST · ${srm}</span>` : ''}${cu ? `<span class="cu" style="flex:${cu}">Concordia · ${cu}</span>` : ''}
      </div>
      <ul class="cp-courses">${L.courses.map(([n, y]) => `<li><span>${esc(n)}</span><em class="${D.terms[y].school}">${esc(T(D.terms[y].en, D.terms[y].fr))}</em></li>`).join('')}</ul>
      ${where}`;
  }

  // ---------- one square per course, per year ----------
  function waffle() {
    const cols = Object.keys(D.terms).map((y) => {
      const items = ALL.flatMap((L) => L.courses.filter(([, t]) => t === y).map(([n]) => [n, L]));
      return `<div class="cw-col">
        <div class="cw-cells">${items.map(([n, L]) => `<button type="button" class="cw-cell" data-id="${L.id}" style="--c:${L.color}" title="${esc(n)}" aria-label="${esc(n)}"></button>`).join('')}</div>
        <b>${items.length}</b><span>${esc(T(D.terms[y].en, D.terms[y].fr))}</span>
      </div>`;
    }).join('');
    const legend = ALL.map((L) => `<button type="button" class="cw-key" data-id="${L.id}"><i style="background:${L.color}"></i>${esc(T(L.en, L.fr))}</button>`).join('');
    return `<div class="cw-cols">${cols}</div><div class="cw-legend">${legend}</div>`;
  }

  function fullList() {
    return Object.keys(D.terms).map((y) => {
      const items = ALL.flatMap((L) => L.courses.filter(([, t]) => t === y).map(([n]) => [n, L]));
      return `<div class="cl-col"><h4>${esc(T(D.terms[y].en, D.terms[y].fr))} <span>${D.schools[D.terms[y].school].name}</span></h4>
        <ul>${items.map(([n, L]) => `<li><i style="background:${L.color}"></i>${esc(n)}</li>`).join('')}</ul></div>`;
    }).join('');
  }

  function render() {
    app.innerHTML = `
      <div class="cs-grid">
        <div class="cs-stack">
          <svg viewBox="0 0 560 560" class="cs-svg" role="group" aria-label="${T('Engineering layers', 'Couches d’ingénierie')}">
            ${platform()}${D.layers.map(slab).join('')}
          </svg>
          <p class="cs-hint">${T('Pick a layer', 'Choisissez une couche')} <span aria-hidden="true">↑ ↓</span></p>
        </div>
        <div class="cs-panel glass" id="csPanel" aria-live="polite"></div>
      </div>
      <div class="cw">
        <div class="cw-head">
          <h3>${T('Built bottom-up', 'Construit de bas en haut')}</h3>
          <p>${T('One square per course, coloured by layer. Physical foundations first, then mechatronics, then silicon, robotics and cloud.', 'Un carré par cours, coloré selon sa couche. D’abord les bases physiques, puis la mécatronique, puis le silicium, la robotique et le nuage.')}</p>
        </div>
        ${waffle()}
      </div>
      <details class="cl">
        <summary>${T(`See all ${D.total} courses by year`, `Voir les ${D.total} cours par année`)}</summary>
        <div class="cl-grid">${fullList()}</div>
      </details>`;
    select(current, false);
  }

  function select(id, user = true) {
    const L = byId[id]; if (!L) return;
    current = id;
    const i = D.layers.indexOf(L);
    app.querySelectorAll('.cs-layer').forEach((g) => {
      const gi = g.dataset.i === undefined ? -1 : +g.dataset.i;
      g.classList.toggle('on', g.dataset.id === id);
      // open the stack: everything above the chosen layer lifts so its top face shows
      g.style.transform = i >= 0 && gi > i ? 'translateY(-46px)' : g.dataset.id === id && i >= 0 ? 'translateY(-8px)' : '';
    });
    app.querySelectorAll('.cw-cell, .cw-key').forEach((c) => c.classList.toggle('dim', c.dataset.id !== id));
    const p = app.querySelector('#csPanel');
    p.classList.remove('swap'); void p.offsetWidth; p.classList.add('swap');
    p.innerHTML = panel(L);
    if (user) app.dataset.touched = '1';
  }

  function goTo(sel) {
    const el = document.getElementById(sel);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  app.addEventListener('click', (e) => {
    const l = e.target.closest('[data-id]');
    if (l && app.contains(l)) select(l.dataset.id);
    const g = e.target.closest('[data-go]');
    if (g) goTo(g.dataset.go);
  });
  app.addEventListener('keydown', (e) => {
    const l = e.target.closest('.cs-layer');
    if (!l) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(l.dataset.id); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const order = ['people', ...D.layers.map((x) => x.id)];
      const n = order[Math.max(0, Math.min(order.length - 1, order.indexOf(current) + (e.key === 'ArrowUp' ? 1 : -1)))];
      select(n);
      app.querySelector(`.cs-layer[data-id="${n}"]`).focus();
    }
  });
  app.addEventListener('mouseover', (e) => {
    const c = e.target.closest('.cw-cell');
    app.querySelectorAll('.cs-layer').forEach((g) => g.classList.toggle('peek', !!c && g.dataset.id === c.dataset.id));
  });

  // build-in when the section first scrolls into view
  new IntersectionObserver((es, io) => es.forEach((e) => {
    if (e.isIntersecting) { app.classList.add('built'); io.disconnect(); setTimeout(() => app.classList.add('settled'), 1400); }
  }), { threshold: 0.25 }).observe(app);

  // ---------- related coursework chips on each project ----------
  function chips() {
    Object.entries(D.related).forEach(([pid, [, courses]]) => {
      const entry = document.getElementById(pid);
      if (!entry) return;
      let box = entry.querySelector('.coursework');
      if (!box) { box = document.createElement('div'); box.className = 'coursework'; entry.append(box); }
      box.innerHTML = `<span class="cw-label">${T('Related coursework', 'Cours liés')}</span>` +
        courses.map((c) => { const L = byId[D.layerOf[c]]; return `<button type="button" class="cw-chip" data-layer="${L.id}" style="--c:${L.color}">${esc(c)}</button>`; }).join('');
    });
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest('.cw-chip');
    if (!c) return;
    select(c.dataset.layer);
    document.getElementById('curriculum').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  render(); chips();
  document.addEventListener('langchange', () => { render(); chips(); });
  window.Curriculum = { select };
})();

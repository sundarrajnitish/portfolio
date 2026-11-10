/* "Layers don't ship. Systems do.": the nine layers of the stack on a ring, and every project on the page
 * drawn as a line through the layers its coursework comes from (derived from CURRICULUM.related, nothing
 * hand-placed). A pulse runs along each line; pick a project to trace it, pick a layer to see what crosses it. */
(function () {
  'use strict';
  const D = window.CURRICULUM;
  const app = document.getElementById('systems-app');
  if (!D || !app) return;
  const lang = () => document.documentElement.dataset.lang || 'en';
  const T = (en, fr) => (lang() === 'fr' ? fr : en);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SHORT = {
    math: ['Math', 'Maths'], mech: ['Mechanics', 'Mécanique'], power: ['Power', 'Énergie'], control: ['Control', 'Commande'],
    embedded: ['Embedded', 'Embarqué'], silicon: ['Silicon', 'Silicium'], robotics: ['Robotics', 'Robotique'],
    data: ['Data', 'Données'], cloud: ['Cloud', 'Nuage'],
  };
  const layers = D.layers;
  window.Systems = { SHORT };
  const idx = Object.fromEntries(layers.map((L, i) => [L.id, i]));
  const projects = Object.keys(D.related).map((id) => {
    const ls = [...new Set(D.related[id][1].map((c) => D.layerOf[c]).filter((l) => l in idx))].sort((a, b) => idx[a] - idx[b]);
    return { id, name: D.related[id][0], layers: ls };
  });

  // ---------- geometry ----------
  const W = 600, H = 520, CX = 300, CY = 260, R = 178;
  const pos = layers.map((_, i) => {
    const a = -Math.PI / 2 + (i / layers.length) * Math.PI * 2;
    return { x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R, a };
  });
  const f = (n) => n.toFixed(1);
  function route(p) {
    const pts = p.layers.map((l) => pos[idx[l]]);
    if (pts.length === 1) return `M${f(pts[0].x)} ${f(pts[0].y)}L${CX} ${CY}`;
    let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2, my = (pts[i - 1].y + pts[i].y) / 2;
      d += `Q${f(CX + (mx - CX) * 0.18)} ${f(CY + (my - CY) * 0.18)} ${f(pts[i].x)} ${f(pts[i].y)}`;
    }
    return d;
  }

  let active = null; // { kind: 'project' | 'layer', id }
  let touched = false;

  function render() {
    const rings = [0.34, 0.67, 1].map((k) => `<circle cx="${CX}" cy="${CY}" r="${f(R * k)}" class="sy-ring"/>`).join('');
    const routes = projects.map((p, i) => {
      const d = route(p);
      return `<g class="sy-route" data-p="${p.id}" style="--d:${(-i * 0.47).toFixed(2)}s">
        <path class="sy-hit" d="${d}"/><path class="sy-line" d="${d}"/><path class="sy-pulse" d="${d}" pathLength="100"/></g>`;
    }).join('');
    const nodes = layers.map((L, i) => {
      const p = pos[i], c = Math.cos(p.a), s = Math.sin(p.a);
      const anchor = Math.abs(c) < 0.3 ? 'middle' : c > 0 ? 'start' : 'end';
      const n = projects.filter((x) => x.layers.includes(L.id)).length;
      const ly = p.y + s * 26 + 5 - (s < -0.5 ? 16 : 0); // labels above the ring clear their own count line
      return `<g class="sy-node" data-l="${L.id}" tabindex="0" role="button" style="--c:${L.color}" aria-label="${esc(T(L.en, L.fr))}">
        <circle cx="${f(p.x)}" cy="${f(p.y)}" r="24" class="sy-hit"/>
        <circle cx="${f(p.x)}" cy="${f(p.y)}" r="13" class="sy-halo"/>
        <circle cx="${f(p.x)}" cy="${f(p.y)}" r="6.5" class="sy-dot"/>
        <text x="${f(p.x + c * 24)}" y="${f(ly)}" text-anchor="${anchor}" class="sy-label">${esc(T(...SHORT[L.id]))}</text>
        <text x="${f(p.x + c * 24)}" y="${f(ly + 16)}" text-anchor="${anchor}" class="sy-n">${n} ${T(n === 1 ? 'project' : 'projects', n === 1 ? 'projet' : 'projets')}</text>
      </g>`;
    }).join('');
    const chips = projects.map((p) => `<button type="button" class="sy-chip" data-p="${p.id}">${esc(p.name)}</button>`).join('');

    app.innerHTML = `<div class="sy-map">
        <svg viewBox="-34 22 ${W + 68} ${H - 54}" class="sy-svg" role="group" aria-label="${T('Projects drawn across the layers of the stack', 'Les projets tracés à travers les couches de la pile')}">
          ${rings}<g class="sy-routes">${routes}</g>
          <circle cx="${CX}" cy="${CY}" r="26" class="sy-hub-glow"/><circle cx="${CX}" cy="${CY}" r="5" class="sy-hub"/>
          ${nodes}
        </svg>
      </div>
      <div class="sy-side">
        <div class="sy-chips" role="group" aria-label="${T('Projects', 'Projets')}">${chips}</div>
        <div class="glass sy-panel" id="syPanel" aria-live="polite"></div>
      </div>`;
    paint();
  }

  function panel() {
    const el = app.querySelector('#syPanel');
    let html;
    if (active && active.kind === 'layer') {
      const L = layers[idx[active.id]];
      const ps = projects.filter((p) => p.layers.includes(L.id));
      html = `<p class="sy-eyebrow"><i style="background:${L.color}"></i>${T('Layer', 'Couche')}</p>
        <h3 class="sy-title">${esc(T(L.en, L.fr))}</h3>
        <p class="sy-meta">${ps.length} ${T(ps.length === 1 ? 'project crosses it' : 'projects cross it', ps.length === 1 ? 'projet la traverse' : 'projets la traversent')} · ${L.courses.length} ${T('courses', 'cours')}</p>
        <p class="sy-list">${ps.map((p) => esc(p.name)).join(' · ')}</p>
        <button type="button" class="sy-go" data-open-layer="${L.id}">${T('See the courses', 'Voir les cours')} <span aria-hidden="true">↑</span></button>`;
    } else {
      const p = projects.find((x) => active && x.id === active.id) || projects[0];
      const n = p.layers.length;
      html = `<p class="sy-eyebrow"><i></i>${T('Project', 'Projet')}</p>
        <h3 class="sy-title">${esc(p.name)}</h3>
        <p class="sy-meta">${T(n === 1 ? 'Rooted in one layer' : `Crosses ${n} layers`, n === 1 ? 'Ancré dans une couche' : `Traverse ${n} couches`)}</p>
        <div class="sy-tags">${p.layers.map((l) => { const L = layers[idx[l]]; return `<span style="--c:${L.color}">${esc(T(L.en, L.fr))}</span>`; }).join('<b aria-hidden="true">→</b>')}</div>
        <button type="button" class="sy-go" data-open-project="${p.id}">${T('Run the demo', 'Lancer la démo')} <span aria-hidden="true">↓</span></button>`;
    }
    el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
    el.innerHTML = html;
  }

  function paint() {
    const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
    const onP = (p) => !active ? false : active.kind === 'project' ? p.id === active.id : p.layers.includes(active.id);
    const litLayers = new Set(!active ? [] : active.kind === 'layer' ? [active.id] : byId[active.id].layers);
    app.querySelectorAll('.sy-route, .sy-chip').forEach((el) => el.classList.toggle('on', onP(byId[el.dataset.p])));
    app.querySelectorAll('.sy-node').forEach((g) => g.classList.toggle('on', litLayers.has(g.dataset.l)));
    // the lit lines sit on top of the rest
    const host = app.querySelector('.sy-routes');
    app.querySelectorAll('.sy-route.on').forEach((g) => host.appendChild(g));
    panel();
  }
  function set(kind, id) {
    if (active && active.kind === kind && active.id === id) return;
    active = { kind, id };
    paint();
  }

  function goTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  const target = (e) => {
    const p = e.target.closest('[data-p]'); if (p) return ['project', p.dataset.p];
    const l = e.target.closest('[data-l]'); if (l) return ['layer', l.dataset.l];
    return null;
  };
  app.addEventListener('pointerover', (e) => { const t = target(e); if (t && e.pointerType !== 'touch') { touched = true; set(...t); } });
  app.addEventListener('focusin', (e) => { const t = target(e); if (t) { touched = true; set(...t); } });
  app.addEventListener('click', (e) => {
    const go = e.target.closest('.sy-go');
    if (go) {
      if (go.dataset.openProject) goTo(go.dataset.openProject);
      else if (window.Curriculum) {
        window.Curriculum.select(go.dataset.openLayer);
        document.getElementById('curriculum').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
      return;
    }
    const t = target(e);
    if (!t) return;
    touched = true;
    // a second click on the project that is already traced runs it
    if (t[0] === 'project' && active && active.kind === 'project' && active.id === t[1] && e.detail > 0 && e.target.closest('.sy-chip')) return goTo(t[1]);
    set(...t);
  });
  app.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.sy-node')) { e.preventDefault(); set('layer', e.target.closest('.sy-node').dataset.l); }
  });

  render();
  set('project', 'p-scada');
  document.addEventListener('langchange', render);

  // ---------- only alive while on screen; tours the projects until someone takes over ----------
  let visible = false, tour = 0;
  new IntersectionObserver((es) => es.forEach((e) => {
    visible = e.isIntersecting;
    app.classList.toggle('live', visible);
  }), { rootMargin: '0px 0px -10% 0px' }).observe(app);
  if (!reduce) setInterval(() => {
    if (!visible || touched || document.hidden) return;
    tour = (tour + 1) % projects.length;
    set('project', projects[tour].id);
  }, 2600);
})();

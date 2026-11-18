/* Systems Constellation: projects traced across the nine engineering layers,
 * enriched with bilingual Outcome + Key Learning insights. */
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
    data: ['Data & AI', 'Données & IA'], cloud: ['Cloud', 'Nuage'],
  };

  // Outcome & Learning distillation per build (en / fr)
  const INSIGHTS = {
    'p-scada': {
      out: ['Unified EPMS/SCADA across multi-vendor switchgear, UPS, generators & relays so 3 a.m. trips are diagnosed on screen.', 'Vue EPMS/SCADA unifiée sur appareillage, ASI, génératrices et relais multifabricants pour diagnostiquer les déclenchements à l’écran.'],
      learn: ['Clean register maps, time-stamped alarms, and rigorous FAT/SAT turn complex OT networks into trusted operator tools.', 'Des tables de registres propres, des alarmes horodatées et des essais FAT/SAT rigoureux rendent les réseaux TO fiables.'],
    },
    'p-f1': {
      out: ['500 kbit/s CAN stream of real 2023 Canadian GP telemetry across Python, MATLAB & Simulink with CRC-8 & rolling counters.', 'Flux CAN à 500 kbit/s de la télémétrie du GP du Canada 2023 entre Python, MATLAB et Simulink avec CRC-8 et compteur cyclique.'],
      learn: ['One shared message catalogue removes translation bugs between embedded capture and downstream analysis.', 'Un catalogue de messages unique élimine les erreurs de traduction entre l’embarqué et l’analyse.'],
    },
    'p-dds': {
      out: ['Formal equivalence checking finds and auto-repairs all 14 planted netlist bugs in ~5 s using open-source tools.', 'La vérification formelle localise et répare automatiquement 14 bogues netlist en ~5 s avec des outils libres.'],
      learn: ['Mathematical equivalence catches subtle gate-level faults that random simulation can miss for weeks.', 'L’équivalence mathématique détecte des fautes de portes que la simulation aléatoire peut manquer des semaines.'],
    },
    'p-calc': {
      out: ['14/14 injected bugs caught with 0 false failures; forensic analysis traced 3,321 ADD errors to one bit-4/bit-5 bridge.', '14/14 bogues détectés sans fausse alerte ; l’analyse a relié 3 321 échecs ADD à un seul pont entre les bits 4 et 5.'],
      learn: ['Root-cause discipline means digging until a single physical hypothesis explains every failing line digit for digit.', 'La discipline de cause racine consiste à creuser jusqu’à ce qu’une hypothèse explique chaque ligne fautive.'],
    },
    'p-mips': {
      out: ['5-stage VHDL-2008 pipelined CPU verified on 1,000 constrained-random programs (CPI 1.298) + 98,669-cycle JS twin.', 'Processeur VHDL-2008 en pipeline 5 étages validé sur 1 000 programmes aléatoires (CPI 1,298) + jumeau JS sur 98 669 cycles.'],
      learn: ['Cycle-accurate reference twins make invisible forwarding paths, stalls, and branch flushes completely inspectable.', 'Un jumeau de référence au cycle rend visibles les anticipations, suspensions et vidages du pipeline.'],
    },
    'p-arith': {
      out: ['Re-engineered structural VHDL Dadda/array unit from non-compiling v1 to v2 passing 83 regressions with measured fmax.', 'Unité VHDL structurelle refaite d’une v1 non compilable à une v2 réussissant 83 régressions avec fmax mesurée.'],
      learn: ['Returning to earlier work with sharper verification standards turns rough prototypes into production-grade blocks.', 'Revenir sur un travail antérieur avec plus de rigueur transforme un prototype fragile en bloc fiable.'],
    },
    'p-mcl': {
      out: ['4 cm median wall error vs 36 cm odometry drift on real hallway logs; 5/5 kidnapped-robot recoveries.', 'Erreur médiane de 4 cm contre 36 cm de dérive odométrique sur journal réel ; 5/5 récupérations de robot kidnappé.'],
      learn: ['Probabilistic state estimation lets noisy sensors converge on truth and recover cleanly from sudden shocks.', 'L’estimation probabiliste permet à des capteurs bruités de converger vers la vérité et de récupérer après un choc.'],
    },
    'p-rtmc': {
      out: ['Generative-designed 3D-printed telerobotic hand over the internet; v2 adds confidence gating, CRC frames & newest-only queue.', 'Main télérobotique imprimée en 3D pilotée par Internet ; la v2 ajoute seuil de confiance, trames CRC et file « plus récent seul ».'],
      learn: ['In human-in-the-loop control, dropping stale packets keeps motion responsive and safe.', 'En commande humain-dans-la-boucle, rejeter les paquets périmés garde le mouvement réactif et sûr.'],
    },
    'p-hydro': {
      out: ['100% in-band pH (5.5–6.5) across a simulated 14-day grow, with automatic dosing lockout on faulty probe readings.', 'pH dans la plage 100 % du temps sur 14 jours simulés, avec blocage automatique du dosage en cas de sonde défaillante.'],
      learn: ['Physical plants have mixing lag—dose-and-wait plus sensor sanity checks prevent runaway actuation.', 'Les systèmes physiques ont un délai de mélange : doser-attendre et vérifier les capteurs évitent l’emballement.'],
    },
    'p-farme': {
      out: ['Autonomous serpentine planting robot with Wi-Fi phone telemetry, CRC links, and millisecond sonar edge braking.', 'Robot planteur autonome en rangs serpentins avec télémétrie Wi-Fi, liaisons CRC et freinage sonar au bord.'],
      learn: ['Splitting real-time motor safety (UNO) from network UI (NodeMCU) keeps edge braking deterministic.', 'Séparer la sécurité moteur temps réel (UNO) de l’interface réseau (NodeMCU) garantit un freinage déterministe.'],
    },
    'p-plotter': {
      out: ['ATmega16 G-code interpreter driving dual A4988 steppers and servo pen lift across a 155 × 155 mm bed.', 'Interpréteur G-code sur ATmega16 pilotant deux pas-à-pas A4988 et un servo sur 155 × 155 mm.'],
      learn: ['Translating human text into discrete step pulses taught how software abstractions become physical motion.', 'Traduire du texte en impulsions pas-à-pas a montré comment une abstraction logicielle devient mouvement physique.'],
    },
    'p-wheelchair': {
      out: ['Bluetooth assistive prototype whose ultrasonic firmware vetoes forward drive within 25 cm of any obstacle.', 'Prototype d’assistance Bluetooth dont le micrologiciel bloque l’avance à moins de 25 cm d’un obstacle.'],
      learn: ['Safety interlocks must live closest to the actuator, overriding operator commands before collision happens.', 'Les verrouillages de sécurité doivent vivre au plus près de l’actionneur pour primer sur la commande.'],
    },
    'p-auction': {
      out: ['300 concurrent live bidders at 43 ms p95 latency and zero lost bids using DynamoDB compare-and-swap + WebSockets.', '300 enchérisseurs en direct à 43 ms p95 sans aucune mise perdue grâce au compare-and-swap DynamoDB et aux WebSockets.'],
      learn: ['Atomic conditional writes eliminate race conditions without heavy lock servers.', 'Les écritures conditionnelles atomiques éliminent les conditions de course sans serveur de verrouillage lourd.'],
    },
    'p-softhub': {
      out: ['Serverless AWS marketplace granting licences solely via signed Stripe webhooks at ~US$0.07/day launch load.', 'Place de marché AWS sans serveur délivrant les licences uniquement par webhooks Stripe signés (~0,07 $ US/jour).'],
      learn: ['Never trust client payment states—cryptographically verified server events keep fulfillment tamper-proof.', 'Ne jamais faire confiance au client : seuls les événements serveur signés garantissent la livraison.'],
    },
    'p-crimson': {
      out: ['Rebuilt from 2022 CRA sprint into React 19, TanStack Query, Tailwind 4, accent-insensitive search & axe-core CI.', 'Refait d’un sprint CRA 2022 vers React 19, TanStack Query, Tailwind 4, recherche sans accents et CI axe-core.'],
      learn: ['Modernizing front-end architecture and baking accessibility into CI makes UX quality repeatable.', 'Moderniser l’architecture et intégrer l’accessibilité en CI rend la qualité d’interface reproductible.'],
    },
  };

  const layers = D.layers;
  window.Systems = { SHORT };
  const idx = Object.fromEntries(layers.map((L, i) => [L.id, i]));
  const projects = Object.keys(D.related).map((id) => {
    const ls = [...new Set(D.related[id][1].map((c) => D.layerOf[c]).filter((l) => l in idx))].sort((a, b) => idx[a] - idx[b]);
    return { id, name: D.related[id][0], layers: ls };
  });

  // geometry
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

  let active = null;
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
      const ly = p.y + s * 26 + 5 - (s < -0.5 ? 16 : 0);
      return `<g class="sy-node" data-l="${L.id}" tabindex="0" role="button" style="--c:${L.color}" aria-label="${esc(T(L.en, L.fr))}">
        <circle cx="${f(p.x)}" cy="${f(p.y)}" r="24" class="sy-hit"/>
        <circle cx="${f(p.x)}" cy="${f(p.y)}" r="13" class="sy-halo"/>
        <circle cx="${f(p.x)}" cy="${f(p.y)}" r="6.5" class="sy-dot"/>
        <text x="${f(p.x + c * 24)}" y="${f(ly)}" text-anchor="${anchor}" class="sy-label">${esc(T(...SHORT[L.id]))}</text>
        <text x="${f(p.x + c * 24)}" y="${f(ly + 16)}" text-anchor="${anchor}" class="sy-n">${n} ${T(n === 1 ? 'system' : 'systems', n === 1 ? 'système' : 'systèmes')}</text>
      </g>`;
    }).join('');
    const chips = projects.map((p) => `<button type="button" class="sy-chip" data-p="${p.id}">${esc(p.name)}</button>`).join('');

    app.innerHTML = `<div class="sy-map">
        <svg viewBox="-34 22 ${W + 68} ${H - 54}" class="sy-svg" role="group" aria-label="${T('Systems mapped across the engineering stack', 'Systèmes tracés à travers la pile d’ingénierie')}">
          ${rings}<g class="sy-routes">${routes}</g>
          <circle cx="${CX}" cy="${CY}" r="26" class="sy-hub-glow"/><circle cx="${CX}" cy="${CY}" r="5" class="sy-hub"/>
          ${nodes}
        </svg>
      </div>
      <div class="sy-side">
        <div class="sy-chips" role="group" aria-label="${T('Systems', 'Systèmes')}">${chips}</div>
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
      html = `<p class="sy-eyebrow"><i style="background:${L.color}"></i>${T('Engineering Layer', 'Couche d’ingénierie')}</p>
        <h3 class="sy-title">${esc(T(L.en, L.fr))}</h3>
        <p class="sy-meta">${ps.length} ${T(ps.length === 1 ? 'connected build' : 'connected builds', ps.length === 1 ? 'système lié' : 'systèmes liés')} · ${L.courses.length} ${T('foundational courses', 'cours fondamentaux')}</p>
        <p class="sy-list">${esc(T(L.blurbEn, L.blurbFr))}</p>
        <p class="sy-list" style="color:var(--ink);font-weight:500">${ps.map((p) => esc(p.name)).join(' · ')}</p>
        <button type="button" class="sy-go" data-open-layer="${L.id}">${T('Inspect layer depth', 'Explorer la couche')} <span aria-hidden="true">↓</span></button>`;
    } else {
      const p = projects.find((x) => active && x.id === active.id) || projects[0];
      const n = p.layers.length;
      const ins = INSIGHTS[p.id];
      html = `<p class="sy-eyebrow"><i></i>${T('Connected System', 'Système connecté')}</p>
        <h3 class="sy-title">${esc(p.name)}</h3>
        <p class="sy-meta">${T(n === 1 ? 'Focused on 1 core layer' : `Spans ${n} interconnected layers`, n === 1 ? 'Ancré dans 1 couche clé' : `Relie ${n} couches interconnectées`)}</p>
        ${ins ? `<div class="sy-brief">
          <div><b>${T('Outcome', 'Résultat')}</b>${esc(T(...ins.out))}</div>
          <div><b>${T('Core Learning', 'Apprentissage clé')}</b>${esc(T(...ins.learn))}</div>
        </div>` : ''}
        <div class="sy-tags">${p.layers.map((l) => { const L = layers[idx[l]]; return `<span style="--c:${L.color}">${esc(T(...SHORT[L.id]))}</span>`; }).join('<b aria-hidden="true">→</b>')}</div>
        <button type="button" class="sy-go" data-open-project="${p.id}">${T('Jump to live proof', 'Ouvrir la démo')} <span aria-hidden="true">↑</span></button>`;
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
    if (window.PortfolioNav && window.PortfolioNav.goToProject) return window.PortfolioNav.goToProject(id);
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
        const dest = document.getElementById('stack') || document.getElementById('craft');
        if (dest) dest.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
      return;
    }
    const t = target(e);
    if (!t) return;
    touched = true;
    if (t[0] === 'project' && active && active.kind === 'project' && active.id === t[1] && e.detail > 0 && e.target.closest('.sy-chip')) return goTo(t[1]);
    set(...t);
  });
  app.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.sy-node')) { e.preventDefault(); set('layer', e.target.closest('.sy-node').dataset.l); }
  });

  render();
  set('project', 'p-scada');
  document.addEventListener('langchange', render);

  let visible = false, tour = 0;
  new IntersectionObserver((es) => es.forEach((e) => {
    visible = e.isIntersecting;
    app.classList.toggle('live', visible);
  }), { rootMargin: '0px 0px -10% 0px' }).observe(app);
  if (!reduce) setInterval(() => {
    if (!visible || touched || document.hidden) return;
    tour = (tour + 1) % projects.length;
    set('project', projects[tour].id);
  }, 3000);
})();

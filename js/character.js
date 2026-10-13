/* Background character: the same traced head on a seated body, re-dressed for each chapter of the timeline.
 * now -> hard hat, safety glasses, hi-vis vest at switchgear · 2026 -> laptop and a lidar rover · 2025 -> headset
 * and live telemetry · 2024/2023 -> glasses and dual monitors · 2022 -> grad cap · 2021 -> robot hand · 2020 -> workbench */
(function () {
  'use strict';
  const host = document.getElementById('character');
  if (!host || !window.Portrait) return;
  const T = (en, fr) => (document.documentElement.dataset.lang === 'fr' ? fr : en);

  const SCENES = {
    site: { gear: ['hardhat', 'safety'], vest: true, cap: ['On site · Schneider Electric', 'Sur le chantier · Schneider Electric'] },
    rover: { gear: ['eyes'], cap: ['Rebuild season · robotics', 'Saison des refontes · robotique'] },
    pit: { gear: ['headset', 'eyes'], cap: ['Pit wall · live telemetry', 'Muret des stands · télémétrie'] },
    desk: { gear: ['glasses'], cap: ['Master’s · Concordia', 'Maîtrise · Concordia'] },
    grad: { gear: ['gradcap', 'eyes'], cap: ['Graduation · SRMIST', 'Diplôme · SRMIST'] },
    hand: { gear: ['eyes'], cap: ['Telerobotics · gestures', 'Télérobotique · gestes'] },
    bench: { gear: ['goggles', 'eyes'], cap: ['Workbench · first robots', 'Établi · premiers robots'] },
  };
  const BY_YEAR = { 2025: 'site', 2026: 'rover', '2025b': 'pit', 2024: 'desk', 2023: 'desk', 2022: 'grad', 2021: 'hand', 2020: 'bench' };

  // props live in the 400 x 520 scene; the desk top is at y = 430
  const PROPS = {
    site: `
      <g class="c-prop">
        ${[0, 1, 2].map((k) => `<rect x="${6 + k * 34}" y="150" width="32" height="280" rx="2"/><path d="M${10 + k * 34} 190h24M${10 + k * 34} 260h24M${10 + k * 34} 330h24"/>
        <circle class="c-led ${k === 1 ? 'g' : 'r'}" cx="${22 + k * 34}" cy="170" r="3"/><rect x="${14 + k * 34}" y="200" width="16" height="10" rx="1"/>`).join('')}
        <path d="M330 150l34 58h-68z"/><path d="M332 170l-8 16h10l-6 14" class="c-amber"/>
        <text x="330" y="226" text-anchor="middle">600 V</text>
      </g>`,
    rover: `
      <g class="c-prop">
        <rect x="300" y="396" width="72" height="26" rx="6"/><circle cx="314" cy="426" r="7"/><circle cx="358" cy="426" r="7"/>
        <rect x="324" y="380" width="24" height="16" rx="4"/><g class="c-sweep"><path d="M336 388l50 -26" class="c-blue"/><path d="M336 388l50 -6" class="c-blue"/></g>
        <g class="c-blue c-parts">${Array.from({ length: 14 }, (_, i) => `<circle cx="${30 + (i * 37) % 80}" cy="${300 + (i * 23) % 100}" r="1.6"/>`).join('')}</g>
      </g>`,
    pit: `
      <g class="c-prop">
        <rect x="290" y="250" width="104" height="72" rx="6"/><path d="M342 322v40M322 362h40"/>
        <polyline class="c-blue c-trace" points="${Array.from({ length: 40 }, (_, i) => `${296 + i * 2.4},${300 - Math.abs(Math.sin(i / 5)) * 34}`).join(' ')}"/>
        <text x="298" y="266">P1 · 311 km/h</text>
        <path d="M12 404h70l10 -14h-30l-8 -8h-24l-6 8h-12z"/><circle cx="26" cy="408" r="8"/><circle cx="72" cy="408" r="8"/>
      </g>`,
    desk: `
      <g class="c-prop">
        <path d="M2 236l100 14v104l-100 14z"/><path d="M52 360v70M30 430h46"/>
        <polyline class="c-blue c-wave" points="${Array.from({ length: 20 }, (_, i) => `${10 + i * 4.5},${(i % 4 < 2 ? 280 : 300) + i * 0.6}`).join(' ')}"/>
        <path d="M398 236l-100 14v104l100 14z"/><path d="M348 360v70M326 430h46"/>
        <g class="c-code">${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M${310 + (k % 3) * 6} ${266 + k * 13}h${40 + ((k * 17) % 34)}"/>`).join('')}</g>
        <path d="M70 404h22v26h-22zM92 410c8 0 8 12 0 12"/><path class="c-steam" d="M76 398c-4 -8 4 -10 0 -18M86 398c-4 -8 4 -10 0 -18"/>
      </g>`,
    grad: `
      <g class="c-prop">
        <rect x="18" y="396" width="86" height="22" rx="11"/><path d="M60 396v22" class="c-amber"/>
        <g class="c-confetti">${Array.from({ length: 16 }, (_, i) => `<rect x="${(i * 53) % 400}" y="${-20 - (i * 31) % 160}" width="5" height="9" style="animation-delay:-${(i * 0.37).toFixed(2)}s"/>`).join('')}</g>
      </g>`,
    hand: `
      <g class="c-prop">
        <rect x="300" y="372" width="66" height="44" rx="12"/><rect x="318" y="416" width="30" height="14"/>
        ${[0, 1, 2, 3].map((k) => `<rect class="c-finger" style="animation-delay:-${k * 0.25}s" x="${304 + k * 16}" y="326" width="12" height="46" rx="6"/>`).join('')}
        <path d="M30 330l18 100M66 330l-18 100M48 330v100"/><rect x="28" y="306" width="40" height="26" rx="5"/><circle cx="48" cy="319" r="7"/><circle class="c-led r" cx="62" cy="311" r="2.5"/>
      </g>`,
    bench: `
      <g class="c-prop">
        <path d="M292 430v-40h70v40M300 390l20 -20h38"/><path d="M356 370l20 -30"/><path class="c-steam" d="M378 334c-6 -8 6 -12 0 -22M386 336c-6 -8 6 -12 0 -22"/>
        <rect x="14" y="404" width="80" height="18" rx="5"/><rect x="30" y="384" width="44" height="20" rx="3"/><circle cx="24" cy="424" r="6"/><circle cx="84" cy="424" r="6"/>
        <rect x="40" y="378" width="14" height="10" class="c-amber"/>
      </g>`,
  };

  const body = (vest) => `
    <g class="c-body">
      <path d="M170 216C150 226 120 236 104 252C96 262 96 300 100 430"/><path d="M232 216C252 226 280 236 296 252C304 262 304 300 300 430"/>
      <path d="M170 216L156 236L186 248L200 236L214 248L244 236L232 216"/>
      <g class="c-arms"><path d="M104 256C92 290 88 320 92 342C110 360 130 372 152 382"/><path d="M120 300C116 320 118 336 126 348C138 358 150 364 160 368"/></g>
      <g class="c-arms r"><path d="M296 256C308 290 312 320 308 342C290 360 270 372 248 382"/><path d="M280 300C284 320 282 336 274 348C262 358 250 364 240 368"/></g>
      ${vest ? `<g class="c-vest"><path d="M150 230L132 430h52l16 -170l16 170h52L250 230L214 262h-28z"/><path class="c-refl" d="M138 350h48M216 350h48M136 380h50M214 380h50"/></g>` : ''}
    </g>
    <path class="c-desk" d="M10 430H390M22 438H378"/>
    <g class="c-laptop"><path d="M130 430L140 344H260L270 430Z"/><circle cx="200" cy="388" r="9"/><path d="M196 388l4 -5l4 5l-4 5z"/></g>`;

  let current = null;
  function render(name, el = host) {
    const sc = SCENES[name];
    el.innerHTML = `
      <svg viewBox="0 0 400 520" class="ch">
        <g class="c-scene">${PROPS[name]}</g>
        <g class="c-breathe">
          ${body(sc.vest)}
          <g class="c-head" transform="translate(58 0) scale(.7)">${Portrait.head({ gear: sc.gear })}</g>
        </g>
      </svg>
      <div class="ch-cap">${T(...sc.cap)}</div>`;
    el.dataset.scene = name;
    // gear drops on with a little bounce
    el.querySelectorAll('.p-hat, .p-cap, .p-headset, .p-goggles, .p-glasses').forEach((g) => g.classList.add('drop'));
  }
  function setScene(name) {
    if (name === current) return;
    current = name;
    host.classList.add('swap');
    setTimeout(() => { render(name); host.classList.remove('swap'); }, current === null ? 0 : 260);
  }

  // which chapter is under the middle of the viewport?
  const chapters = [...document.querySelectorAll('.chapter')];
  const hero = document.getElementById('hero'), timeline = document.getElementById('timeline');
  function onScroll() {
    const mid = innerHeight * 0.55;
    let ch = null;
    for (const c of chapters) { const r = c.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) ch = c; }
    const tl = timeline.getBoundingClientRect();
    const inTimeline = tl.top < innerHeight * 0.6 && tl.bottom > innerHeight * 0.4;
    host.classList.toggle('on', inTimeline && !!ch);
    if (ch) setScene(BY_YEAR[ch.dataset.year] || 'desk');
  }
  window.Character = { render, scenes: Object.keys(SCENES) };
  render('site'); current = 'site';
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  document.addEventListener('langchange', () => { const n = current; current = null; render(n); current = n; });
  onScroll();
  void hero;
})();

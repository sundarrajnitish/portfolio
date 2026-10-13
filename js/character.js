/* Side character: Nitish's traced figure at a laptop, re-dressed for each chapter as the page scrolls.
 * now -> hard hat, safety glasses, hi-vis vest at switchgear · 2026 -> lidar rover · 2025 -> headset and telemetry
 * 2024/2023 -> glasses and dual monitors · 2022 -> graduation cap, B.Tech done, M.Eng starts · 2021 -> robot hand
 * 2020 -> workbench. Anywhere else (summary, about, contact): sunglasses, as in the portrait. */
(function () {
  'use strict';
  const host = document.getElementById('character');
  if (!host || !window.Portrait) return;
  const T = (en, fr) => (document.documentElement.dataset.lang === 'fr' ? fr : en);

  const SCENES = {
    base: { gear: ['sunglasses'], cap: ['Building something', 'En pleine construction'] },
    site: { gear: ['hardhat', 'safety'], vest: true, cap: ['On site · Schneider Electric', 'Sur le chantier · Schneider Electric'] },
    rover: { gear: ['eyes'], cap: ['Rebuild season · robotics', 'Saison des refontes · robotique'] },
    pit: { gear: ['headset', 'eyes'], cap: ['Pit wall · live telemetry', 'Muret des stands · télémétrie'] },
    desk: { gear: ['glasses'], cap: ['Master’s · Concordia', 'Maîtrise · Concordia'] },
    grad: { gear: ['gradcap', 'eyes'], noLaptop: true, cap: ['B.Tech done → M.Eng from Sep 2022', 'B.Tech terminé → M.Eng dès sept. 2022'] },
    hand: { gear: ['eyes'], cap: ['Telerobotics · gestures', 'Télérobotique · gestes'] },
    bench: { gear: ['goggles', 'eyes'], cap: ['Workbench · first robots', 'Établi · premiers robots'] },
  };
  const BY_YEAR = { 2025: 'site', 2026: 'rover', '2025b': 'pit', 2024: 'desk', 2023: 'desk', 2022: 'grad', 2021: 'hand', 2020: 'bench' };

  // The figure occupies x 0..400, y 0..400 (portrait space); the desk top is at y = 500.
  // Props sit in the margins (x -120..0 and 400..520) and behind the figure.
  const PROPS = {
    base: `<g class="c-prop"><path d="M440 500v-52h44v52"/><path d="M462 448c-10 -18 -6 -40 6 -52c4 16 4 34 -6 52zM462 448c12 -14 30 -18 42 -12c-8 12 -24 16 -42 12z" class="c-green"/></g>`,
    site: `
      <g class="c-prop">
        ${[0, 1, 2].map((k) => `<rect x="${-118 + k * 38}" y="150" width="36" height="350" rx="2"/><path d="M${-114 + k * 38} 200h28M${-114 + k * 38} 290h28M${-114 + k * 38} 380h28"/>
        <circle class="c-led ${k === 1 ? 'g' : 'r'}" cx="${-100 + k * 38}" cy="172" r="4"/><rect x="${-110 + k * 38}" y="212" width="20" height="12" rx="1"/>`).join('')}
        <path d="M466 150l40 68h-80z"/><path d="M468 172l-9 18h12l-7 16" class="c-amber"/>
        <text x="466" y="236" text-anchor="middle">600 V</text>
      </g>`,
    rover: `
      <g class="c-prop">
        <rect x="420" y="462" width="86" height="30" rx="7"/><circle cx="436" cy="496" r="8"/><circle cx="490" cy="496" r="8"/>
        <rect x="448" y="444" width="28" height="18" rx="5"/><g class="c-sweep"><path d="M462 452l-60 -40" class="c-blue"/><path d="M462 452l-64 -12" class="c-blue"/></g>
        <g class="c-blue c-parts">${Array.from({ length: 16 }, (_, i) => `<circle cx="${-110 + (i * 37) % 100}" cy="${300 + (i * 23) % 160}" r="2"/>`).join('')}</g>
      </g>`,
    pit: `
      <g class="c-prop">
        <rect x="404" y="250" width="116" height="80" rx="7"/><path d="M462 330v44M438 374h48"/>
        <polyline class="c-blue c-trace" points="${Array.from({ length: 44 }, (_, i) => `${410 + i * 2.4},${314 - Math.abs(Math.sin(i / 5)) * 38}`).join(' ')}"/>
        <text x="412" y="268">P1 · 311 km/h</text>
        <path d="M-118 474h80l12 -16h-34l-10 -10h-28l-8 10h-12z"/><circle cx="-102" cy="480" r="9"/><circle cx="-50" cy="480" r="9"/>
      </g>`,
    desk: `
      <g class="c-prop">
        <path d="M-120 250l112 16v118l-112 16z"/><path d="M-64 392v108M-90 500h52"/>
        <polyline class="c-blue c-wave" points="${Array.from({ length: 22 }, (_, i) => `${-112 + i * 4.6},${(i % 4 < 2 ? 300 : 322) + i * 0.6}`).join(' ')}"/>
        <path d="M520 250l-112 16v118l112 16z"/><path d="M464 392v108M438 500h52"/>
        <g class="c-code">${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M${420 + (k % 3) * 7} ${284 + k * 15}h${44 + ((k * 17) % 36)}"/>`).join('')}</g>
        <path d="M410 470h24v30h-24zM434 476c9 0 9 14 0 14"/><path class="c-steam" d="M416 462c-4 -8 4 -10 0 -18M428 462c-4 -8 4 -10 0 -18"/>
      </g>`,
    grad: `
      <g class="c-prop">
        <g class="c-sign"><rect x="-120" y="250" width="112" height="70" rx="10"/><text x="-64" y="278" text-anchor="middle">B.Tech</text><text x="-64" y="300" text-anchor="middle" class="t-dim">SRMIST · 2022 ✓</text></g>
        <g class="c-sign now"><rect x="408" y="250" width="112" height="70" rx="10"/><text x="464" y="278" text-anchor="middle">M.Eng</text><text x="464" y="300" text-anchor="middle" class="t-dim">${T('Concordia · Sep 22', 'Concordia · sept. 22')}</text></g>
        <path class="c-route" d="M-8 286C80 200 320 200 408 286"/>
        <g class="c-plane"><path d="M-8 -5L10 0L-8 5L-4 0Z"/></g>
        <g class="c-confetti">${Array.from({ length: 18 }, (_, i) => `<rect x="${-110 + (i * 53) % 620}" y="${-30 - (i * 31) % 180}" width="6" height="10" style="animation-delay:-${(i * 0.37).toFixed(2)}s"/>`).join('')}</g>
      </g>`,
    hand: `
      <g class="c-prop">
        <rect x="414" y="430" width="78" height="52" rx="14"/><rect x="436" y="482" width="34" height="18"/>
        ${[0, 1, 2, 3].map((k) => `<rect class="c-finger" style="animation-delay:-${k * 0.25}s" x="${418 + k * 18}" y="374" width="14" height="56" rx="7"/>`).join('')}
        <path d="M-96 380l22 120M-52 380l-22 120M-74 380v120"/><rect x="-98" y="352" width="48" height="30" rx="6"/><circle cx="-74" cy="367" r="8"/><circle class="c-led r" cx="-58" cy="358" r="3"/>
      </g>`,
    bench: `
      <g class="c-prop">
        <path d="M410 500v-46h80v46M418 454l24 -24h44"/><path d="M484 430l22 -34"/><path class="c-steam" d="M508 390c-6 -8 6 -12 0 -22M516 392c-6 -8 6 -12 0 -22"/>
        <rect x="-118" y="470" width="96" height="22" rx="6"/><rect x="-100" y="446" width="52" height="24" rx="3"/><circle cx="-108" cy="494" r="7"/><circle cx="-32" cy="494" r="7"/>
        <rect x="-88" y="438" width="16" height="12" class="c-amber"/>
      </g>`,
  };

  const arms = `
    <g class="c-arms"><path d="M40 338C18 380 12 420 18 446C44 470 94 480 136 486"/><path d="M76 376C68 402 66 422 72 436C96 450 124 458 144 462"/></g>
    <g class="c-arms r"><path d="M360 338C382 380 388 420 382 446C356 470 306 480 264 486"/><path d="M324 376C332 402 334 422 328 436C304 450 276 458 256 462"/></g>`;
  const vest = `<g class="c-vest"><path d="M96 302C76 330 70 380 72 500H168V372L146 312Z"/><path d="M304 302C324 330 330 380 328 500H232V372L254 312Z"/>
    <path class="c-refl" d="M74 420H166M74 456H166M234 420H326M234 456H326"/></g>`;
  // MacBook-style laptop, seen from behind the lid
  const laptop = `
    <g class="c-laptop">
      <path class="lid" d="M124 384H276C281 384 284 387 284 392L290 486H110L116 392C116 387 119 384 124 384Z"/>
      <circle class="logo" cx="200" cy="434" r="11"/><path class="logo" d="M200 426l6 8l-6 8l-6 -8z"/>
      <path class="base" d="M92 486H308C312 486 314 490 312 494L308 500H92L88 494C86 490 88 486 92 486Z"/>
      <path class="notch" d="M184 486h32"/>
    </g>`;
  const diploma = `
    <g class="c-diploma"><rect x="112" y="452" width="176" height="30" rx="15"/><path d="M140 452v30M260 452v30"/><path class="c-amber" d="M200 452v30M192 482l8 14l8 -14"/></g>`;

  let current = null;
  function render(name, el = host) {
    const sc = SCENES[name];
    el.innerHTML = `
      <svg viewBox="-124 -24 648 536" class="ch">
        <g class="c-scene">${PROPS[name]}</g>
        <g class="c-breathe">
          <path class="c-torso" d="M0 350L92 300L140 262H260L306 300L400 354V500H0Z"/>
          <g class="c-fig">${Portrait.head({ gear: sc.gear, body: true, fill: true })}</g>
          ${sc.vest ? vest : ''}
          ${arms}
          ${sc.noLaptop ? diploma : laptop}
        </g>
        <path class="c-desk" d="M-124 500H524"/>
      </svg>
      <div class="ch-cap">${T(...sc.cap)}</div>`;
    el.dataset.scene = name;
    el.querySelectorAll('.p-hat, .p-cap, .p-headset, .p-goggles, .p-glasses').forEach((g) => g.classList.add('drop'));
  }
  function setScene(name) {
    if (name === current) return;
    current = name;
    host.classList.add('swap');
    clearTimeout(setScene.t);
    setScene.t = setTimeout(() => { render(name); host.classList.remove('swap'); }, 220);
  }

  const chapters = [...document.querySelectorAll('.chapter')];
  function onScroll() {
    const mid = innerHeight * 0.5;
    let ch = null;
    for (const c of chapters) { const r = c.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) ch = c; }
    setScene(ch ? (BY_YEAR[ch.dataset.year] || 'base') : 'base');
  }
  window.Character = { render, scenes: Object.keys(SCENES) };
  render('base'); current = 'base';
  addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('langchange', () => render(current));
  onScroll();
})();

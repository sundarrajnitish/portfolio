/* Page behaviour: language switch, scroll-driven effects, lazy demos. */
(function () {
  'use strict';
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  let navReady = false;

  /* ---------- language ---------- */
  function setLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang;
    localStorage.setItem('lang', lang);
    $$('[data-set-lang]').forEach((b) => b.classList.toggle('on', b.dataset.setLang === lang));
    document.title = lang === 'fr' ? 'Nitish Sundarraj · Professionnel en ingénierie' : 'Nitish Sundarraj · Engineering Professional';
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
    measureScrub();
    if (typeof moveInd === 'function' && navReady) moveInd();
  }
  // the switch crossfades the whole page where the browser can
  $$('[data-set-lang]').forEach((b) => b.addEventListener('click', () => {
    const go = () => setLang(b.dataset.setLang);
    if (document.startViewTransition && !reduce && root.dataset.lang !== b.dataset.setLang) document.startViewTransition(go); else go();
  }));

  /* ---------- manifesto: split into words once ---------- */
  $$('.scrub').forEach((p) => {
    p.innerHTML = p.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  });
  let scrubWords = [];
  let litCount = 0;
  function measureScrub() {
    scrubWords = $$('.scrub .w').filter((w) => w.offsetParent !== null);
    litCount = Math.min(litCount, scrubWords.length); // the other language's words may be shorter
    scrubWords.forEach((w, i) => w.classList.toggle('lit', i < litCount));
  }

  /* ---------- reveal on scroll ---------- */
  // things that arrive together come in one after another rather than all at once
  const io = new IntersectionObserver((es) => {
    es.filter((e) => e.isIntersecting).forEach((e, i) => {
      const el = e.target;
      io.unobserve(el);
      if (i) { el.style.transitionDelay = Math.min(i * 70, 420) + 'ms'; setTimeout(() => { el.style.transitionDelay = ''; }, 1500); }
      el.classList.add('in');
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .reveal-scale').forEach((el) => io.observe(el));

  /* ---------- demos mount just before they scroll into view ---------- */
  const demoIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { window.Demos.mount(e.target); demoIO.unobserve(e.target); }
  }), { rootMargin: '600px 0px' });
  $$('[data-demo]').forEach((el) => demoIO.observe(el));

  /* ---------- stat counters ---------- */
  const statIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    statIO.unobserve(e.target);
    $$('[data-count]', e.target).forEach((n) => {
      const end = +n.dataset.count, t0 = performance.now();
      const step = (now) => {
        const k = Math.min((now - t0) / 1400, 1);
        n.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }), { threshold: 0.4 });
  $$('#stats, .cs-stats').forEach((el) => statIO.observe(el));

  /* ---------- scroll-linked effects ---------- */
  const nav = $('#nav'), bar = $('#progressBar'), heroInner = $('#heroInner');
  const rail = $('.rail'), railFill = $('#railFill'), manifesto = $('#manifesto');
  const navLinks = $$('[data-nav]').map((a) => [a, document.getElementById(a.dataset.nav)]).filter(([, s]) => s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false, heroDone = false;
  const railDot = rail ? rail.appendChild(document.createElement('i')) : null;

  /* ---------- nav: a single pill slides to the section in view ---------- */
  navReady = true;
  const navBox = $('.nav-links'), navInd = navBox.appendChild(document.createElement('span'));
  navInd.className = 'nav-ind'; navBox.classList.add('has-ind');
  let navOn = null;
  function moveInd() {
    navInd.classList.toggle('show', !!navOn);
    if (!navOn) return;
    navInd.style.width = navOn.offsetWidth + 'px';
    navInd.style.transform = `translateX(${navOn.offsetLeft}px)`;
  }

  /* ---------- pointer light: hero grid and cards ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const hero = $('#hero'), heroBg = $('.hero-bg');
    let px = 0, py = 0, card = null, queued = false;
    addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      card = e.target.closest ? e.target.closest('.glass.card, .cert, .entry.compact, .sy-panel') : null;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (hero && scrollY < innerHeight) {
          const r = hero.getBoundingClientRect();
          heroBg.style.setProperty('--mx', px - r.left + 'px');
          heroBg.style.setProperty('--my', py - r.top + 'px');
          hero.classList.add('lit');
        }
        if (card) {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--px', px - r.left + 'px');
          card.style.setProperty('--py', py - r.top + 'px');
        }
      });
    }, { passive: true });
  }

  /* ---------- the marquee only runs while it is on screen ---------- */
  const marquee = $('.marquee');
  if (marquee) new IntersectionObserver((es) => es.forEach((e) => marquee.classList.toggle('paused', !e.isIntersecting))).observe(marquee);

  function onScroll() {
    ticking = false;
    const y = scrollY, vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    nav.classList.toggle('scrolled', y > 10);
    document.body.classList.toggle('past-hero', y > vh * 0.8);
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (!reduce && heroInner && (y < vh || !heroDone)) {
      const k = Math.min(y / vh, 1);
      heroDone = k === 1;
      heroInner.style.transform = `translateY(${k * 80}px) scale(${1 - k * 0.06})`;
      heroInner.style.opacity = String(1 - k * 1.1);
    }

    if (manifesto && scrubWords.length) {
      const r = manifesto.getBoundingClientRect();
      const k = Math.min(Math.max((vh * 0.85 - r.top) / (r.height * 0.75), 0), 1);
      const lit = Math.round(k * scrubWords.length);
      // only the words that changed since the last frame
      for (let i = Math.min(lit, litCount); i < Math.max(lit, litCount) && i < scrubWords.length; i++) scrubWords[i].classList.toggle('lit', i < lit);
      litCount = lit;
    }

    const mid = vh * 0.4;
    let on = null;
    navLinks.forEach(([a, sec]) => { const r = sec.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) on = a; });
    if (on !== navOn) { navOn = on; navLinks.forEach(([a]) => a.classList.toggle('on', a === on)); moveInd(); }

    if (rail) {
      const r = rail.getBoundingClientRect();
      const k = Math.min(Math.max((vh * 0.5 - r.top) / r.height, 0), 1);
      railFill.style.transform = `scaleY(${k})`;
      railDot.style.transform = `translateY(${k * r.height}px)`;
      railDot.classList.toggle('on', k > 0 && k < 1);
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { measureScrub(); moveInd(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);

  setLang(root.dataset.lang || 'en');
  onScroll();
})();

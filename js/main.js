/* Page behaviour: language switch, scroll-driven effects, lazy demos,
 * thread navigation, and Foundations Lab tab controller. */
(function () {
  'use strict';
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let navReady = false;

  /* ---------- language ---------- */
  function setLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang;
    localStorage.setItem('lang', lang);
    $$('[data-set-lang]').forEach((b) => b.classList.toggle('on', b.dataset.setLang === lang));
    document.title = lang === 'fr'
      ? 'Nitish Sundarraj · Ingénieur systèmes — Énergie, silicium et ère de l’IA'
      : 'Nitish Sundarraj · Systems-Minded Engineer — Power, Silicon & the AI Era';
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
    measureScrub();
    if (typeof moveInd === 'function' && navReady) moveInd();
  }
  $$('[data-set-lang]').forEach((b) => b.addEventListener('click', () => {
    const go = () => setLang(b.dataset.setLang);
    if (document.startViewTransition && !reduce && root.dataset.lang !== b.dataset.setLang) document.startViewTransition(go);
    else go();
  }));

  /* ---------- manifesto: split into words once ---------- */
  $$('.scrub').forEach((p) => {
    p.innerHTML = p.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  });
  let scrubWords = [];
  let litCount = 0;
  function measureScrub() {
    scrubWords = $$('.scrub .w').filter((w) => w.offsetParent !== null);
    litCount = Math.min(litCount, scrubWords.length);
    scrubWords.forEach((w, i) => w.classList.toggle('lit', i < litCount));
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((es) => {
    es.filter((e) => e.isIntersecting).forEach((e, i) => {
      const el = e.target;
      io.unobserve(el);
      if (i) {
        el.style.transitionDelay = Math.min(i * 65, 390) + 'ms';
        setTimeout(() => { el.style.transitionDelay = ''; }, 1400);
      }
      el.classList.add('in');
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .reveal-scale').forEach((el) => io.observe(el));

  /* ---------- demos mount just before scrolling into view ---------- */
  const demoIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting && !e.target.closest('[hidden]')) {
      window.Demos && window.Demos.mount(e.target);
      demoIO.unobserve(e.target);
    }
  }), { rootMargin: '600px 0px' });
  $$('[data-demo]').forEach((el) => {
    if (!el.closest('.cert') && !el.closest('[hidden]')) demoIO.observe(el);
  });

  /* ---------- Foundations Lab 3-tab showcase (Thread 03) ---------- */
  const fndTabs = $$('[data-fnd-tab]');
  const fndPanels = $$('.fnd-panel');
  function selectFoundation(id) {
    if (!id) return;
    fndTabs.forEach((b) => {
      const on = b.dataset.fndTab === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    fndPanels.forEach((p) => {
      const on = p.id === id;
      p.hidden = !on;
      if (on) {
        p.querySelectorAll('[data-demo]').forEach((d) => window.Demos && window.Demos.mount(d));
      }
    });
  }
  fndTabs.forEach((b) => b.addEventListener('click', () => selectFoundation(b.dataset.fndTab)));

  /* ---------- shared project navigation (handles hidden foundation tabs) ---------- */
  function goToProject(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.classList.contains('fnd-panel')) selectFoundation(id);
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    });
  }
  window.PortfolioNav = { goToProject, selectFoundation };

  /* ---------- stat counters ---------- */
  const statIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    statIO.unobserve(e.target);
    $$('[data-count]', e.target).forEach((n) => {
      const end = +n.dataset.count, t0 = performance.now();
      const step = (now) => {
        const k = Math.min((now - t0) / 1300, 1);
        n.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }), { threshold: 0.35 });
  $$('.cs-stats').forEach((el) => statIO.observe(el));

  /* ---------- scroll-linked effects ---------- */
  const nav = $('#nav'), bar = $('#progressBar'), heroInner = $('#heroInner');
  const manifesto = $('#manifesto');
  const navLinks = $$('[data-nav]').map((a) => [a, document.getElementById(a.dataset.nav)]).filter(([, s]) => s);
  const threadLinks = $$('[data-thread-nav]').map((a) => [a, document.getElementById(a.dataset.threadNav)]).filter(([, s]) => s);
  let ticking = false, heroDone = false;

  /* ---------- sliding nav pill ---------- */
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

  /* ---------- phone menu ---------- */
  const navToggle = $('#navToggle');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  }
  navToggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  navBox.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => { if (nav.classList.contains('open') && !nav.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); navToggle.focus(); } });
  matchMedia('(max-width: 820px)').addEventListener('change', (m) => { if (!m.matches) setMenu(false); moveInd(); });

  /* ---------- pointer light: hero grid and glass cards ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const hero = $('#hero'), heroBg = $('.hero-bg');
    let px = 0, py = 0, card = null, queued = false;
    addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      card = e.target.closest ? e.target.closest('.glass.card, .pillar, .cert, .sy-panel') : null;
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

  /* ---------- marquee runs only on screen ---------- */
  const marquee = $('.marquee');
  if (marquee) new IntersectionObserver((es) => es.forEach((e) => marquee.classList.toggle('paused', !e.isIntersecting))).observe(marquee);

  function onScroll() {
    ticking = false;
    const y = scrollY, vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    nav.classList.toggle('scrolled', y > 10);
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (!reduce && heroInner && (y < vh || !heroDone)) {
      const k = Math.min(y / vh, 1);
      heroDone = k === 1;
      heroInner.style.transform = `translateY(${k * 64}px) scale(${1 - k * 0.045})`;
      heroInner.style.opacity = String(1 - k * 1.05);
    }

    if (manifesto && scrubWords.length) {
      const r = manifesto.getBoundingClientRect();
      const k = Math.min(Math.max((vh * 0.86 - r.top) / (r.height * 0.78), 0), 1);
      const lit = Math.round(k * scrubWords.length);
      for (let i = Math.min(lit, litCount); i < Math.max(lit, litCount) && i < scrubWords.length; i++) {
        scrubWords[i].classList.toggle('lit', i < lit);
      }
      litCount = lit;
    }

    const mid = vh * 0.38;
    let on = null;
    navLinks.forEach(([a, sec]) => { const r = sec.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) on = a; });
    if (on !== navOn) { navOn = on; navLinks.forEach(([a]) => a.classList.toggle('on', a === on)); moveInd(); }

    let thOn = null;
    threadLinks.forEach(([a, sec]) => { const r = sec.getBoundingClientRect(); if (r.top < vh * 0.45 && r.bottom > vh * 0.25) thOn = a; });
    threadLinks.forEach(([a]) => a.classList.toggle('on', a === thOn));
  }

  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { measureScrub(); moveInd(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveInd);

  setLang(root.dataset.lang || 'en');
  onScroll();
})();

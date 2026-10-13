/* Page behaviour: language switch, scroll-driven effects, lazy demos. */
(function () {
  'use strict';
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- language ---------- */
  function setLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang;
    localStorage.setItem('lang', lang);
    $$('[data-set-lang]').forEach((b) => b.classList.toggle('on', b.dataset.setLang === lang));
    document.title = lang === 'fr' ? 'Nitish Sundarraj Balaji · Professionnel en ingénierie' : 'Nitish Sundarraj Balaji · Engineering professional';
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
    measureScrub();
  }
  $$('[data-set-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.setLang)));

  /* ---------- manifesto: split into words once ---------- */
  $$('.scrub').forEach((p) => {
    p.innerHTML = p.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  });
  let scrubWords = [];
  function measureScrub() { scrubWords = $$('.scrub .w').filter((w) => w.offsetParent !== null); }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
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
  const stats = $('#stats');
  if (stats) statIO.observe(stats);

  /* ---------- scroll-linked effects ---------- */
  const nav = $('#nav'), bar = $('#progressBar'), heroInner = $('#heroInner');
  const rail = $('.rail'), railFill = $('#railFill'), manifesto = $('#manifesto');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false;

  function onScroll() {
    ticking = false;
    const y = scrollY, vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    nav.classList.toggle('scrolled', y > 10);
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (!reduce && heroInner) {
      const k = Math.min(y / vh, 1);
      heroInner.style.transform = `translateY(${k * 120}px) scale(${1 - k * 0.12})`;
      heroInner.style.opacity = String(1 - k * 1.3);
    }

    if (manifesto && scrubWords.length) {
      const r = manifesto.getBoundingClientRect();
      const k = Math.min(Math.max((vh * 0.85 - r.top) / (r.height * 0.75), 0), 1);
      const lit = Math.round(k * scrubWords.length);
      scrubWords.forEach((w, i) => w.classList.toggle('lit', i < lit));
    }

    if (rail) {
      const r = rail.getBoundingClientRect();
      const k = Math.min(Math.max((vh * 0.5 - r.top) / r.height, 0), 1);
      railFill.style.transform = `scaleY(${k})`;
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { measureScrub(); onScroll(); });

  setLang(root.dataset.lang || 'en');
  onScroll();
})();

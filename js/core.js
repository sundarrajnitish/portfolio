/* Shared plumbing for the demos: registry, language, DOM helper, visible-only animation loops. */
(function () {
  'use strict';
  const registry = {};

  const lang = () => document.documentElement.dataset.lang || 'en';

  /** T('English', 'Français') -> string in the current language */
  const T = (en, fr) => (lang() === 'fr' ? fr : en);

  /** h('div', {class: 'x', onclick: fn}, child, 'text', ...) */
  function h(tag, attrs, ...kids) {
    const isSvg = ['svg', 'g', 'path', 'line', 'rect', 'circle', 'text', 'polyline', 'polygon', 'tspan', 'defs', 'marker', 'ellipse'].includes(tag);
    const el = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  /** Fit a canvas to its CSS width at device pixel ratio; returns ctx scaled to CSS px. */
  function fitCanvas(cv, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth || cv.parentElement.clientWidth;
    cv.style.height = cssH + 'px';
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(cssH * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(cssH * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h: cssH };
  }

  function mount(el) {
    const name = el.dataset.demo;
    if (el.dataset.mounted || !registry[name]) return;
    el.dataset.mounted = '1';
    let visible = true;
    const langCbs = [];
    const loops = [];
    const api = {
      el, T, h, lang, fitCanvas,
      visible: () => visible,
      onLang(cb) { langCbs.push(cb); },
      /** requestAnimationFrame loop that only runs while the demo is on screen. fn(dt_seconds, t_seconds) */
      loop(fn) {
        const L = { fn, last: 0, id: 0 };
        const tick = (now) => {
          const dt = L.last ? Math.min((now - L.last) / 1000, 0.1) : 0;
          L.last = now;
          if (visible) fn(dt, now / 1000);
          L.id = requestAnimationFrame(tick);
        };
        L.id = requestAnimationFrame(tick);
        loops.push(L);
        return L;
      },
    };
    new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; }), { rootMargin: '100px' }).observe(el);
    document.addEventListener('langchange', () => langCbs.forEach((cb) => cb()));
    try {
      registry[name](el, api);
    } catch (err) {
      console.error(name, err);
      el.textContent = 'Demo failed to load: ' + err.message;
    }
  }

  window.Demos = { register: (name, fn) => { registry[name] = fn; }, mount, T, h, lang };
})();

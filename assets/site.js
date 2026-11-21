/* D'n Bebbes — scroll-film, reveals, parallax, openingstijden. Geen frameworks. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var ease = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var dpr = Math.min(devicePixelRatio || 1, 2);

  /* ---------- header ---------- */
  var hd = $('.hd'), burger = $('.burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var o = document.body.classList.toggle('menu-open'); burger.setAttribute('aria-expanded', o);
    });
    $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('menu-open'); }); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') document.body.classList.remove('menu-open'); });
  }

  /* cart badge on every page */
  try {
    var c = JSON.parse(localStorage.getItem('bebbes-cart')) || {}, n = 0;
    Object.keys(c).forEach(function (k) { n += c[k].q; });
    $$('.cart-count').forEach(function (b) { b.textContent = n; });
  } catch (e) {}

  /* ---------- scroll films ---------- */
  var films = $$('.film').map(function (film) {
    var CH = JSON.parse($('script', film).textContent), N = CH.length;
    var V = $('video', film), cv = $('canvas', film), ctx = cv.getContext('2d');
    var T = $('.ftitle h2', film), S = $('.ftitle p', film), C = $('.fcount', film), B = $('.fbar i', film), hint = $('.fhint', film);
    var cards = $$('.fcard', film), cur = -1, vt = 0, want = 0;
    var FX = { mode: CH[0].fx, k: 1, parts: [] };
    V.addEventListener('loadedmetadata', function () { V.pause(); });
    // hele film in het geheugen: scrubben is dan direct en hangt niet af van Range-requests
    fetch(film.dataset.src).then(function (r) { return r.blob(); }).then(function (b) { V.src = URL.createObjectURL(b); })
      .catch(function () { V.src = film.dataset.src; });

    function setTitle(i) {
      T.innerHTML = CH[i].t.split('').map(function (ch) { return '<span>' + (ch === ' ' ? '&nbsp;' : ch) + '</span>'; }).join('');
      T.setAttribute('aria-label', CH[i].t);
      S.textContent = CH[i].s;
      C.textContent = ('0' + (i + 1)).slice(-2) + ' / ' + ('0' + N).slice(-2);
    }
    var seg = function (f) { return ease((f - .3) / .55); };
    function size() { cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; }
    size(); addEventListener('resize', size);

    function render() {
      var r = film.getBoundingClientRect(), total = film.offsetHeight - innerHeight;
      if (r.bottom < -200 || r.top > innerHeight + 200) return false;
      var p = clamp(-r.top / total, 0, 1) * (N - 1);
      var i = Math.min(Math.floor(p), N - 2), f = p - i;
      var ch = f < .65 ? i : i + 1, near = f < .65 ? f : f - 1;
      if (V.duration) want = (i + seg(f)) / (N - 1) * (V.duration - .05);
      var dy = (CH[i].dy || 0) + ((CH[i + 1].dy || 0) - (CH[i].dy || 0)) * seg(f);
      V.style.transform = 'translateY(' + dy + 'vh) scale(' + (1.05 + .04 * Math.sin(p * Math.PI / 2)) + ')';
      if (ch !== cur) { cur = ch; setTitle(ch); }
      var vis = 1 - ease((Math.abs(near) - .12) / .2);
      $$('span', T).forEach(function (sp, k) {
        var d = reduce ? 1 : clamp(vis * 1.5 - k * .04, 0, 1);
        sp.style.opacity = d; sp.style.transform = 'translateY(' + (1 - d) * .5 + 'em)'; sp.style.filter = 'blur(' + (1 - d) * 8 + 'px)';
      });
      S.style.opacity = reduce ? 1 : vis;
      cards.forEach(function (el, k) {
        var o = k === ch ? ease((vis - .25) / .5) : 0;
        el.style.opacity = o; el.style.transform = 'translateY(' + (1 - o) * 24 + 'px)'; el.classList.toggle('on', o > .6);
      });
      B.style.width = (p / (N - 1) * 100) + '%';
      if (hint) hint.style.opacity = p < .08 ? 1 : 0;
      FX.mode = CH[ch].fx; FX.k = .3 + .7 * vis;
      return true;
    }

    function spawn() {
      var W = cv.width, H = cv.height, m = FX.mode, c = W / 2, R = Math.random;
      if (m === 'salt') return { x: c + (R() - .5) * W * .5, y: -10, vx: (R() - .5) * .4, vy: 2 + R() * 3, r: (1 + R() * 2) * dpr, c: '244,234,216', life: 1, g: .04 };
      if (m === 'saltfall') return { x: c + (R() - .5) * W * .12, y: -10, vx: (R() - .5) * .4, vy: 2 + R() * 3, r: (1 + R() * 2) * dpr, c: '244,234,216', life: 1, g: .04 };
      if (m === 'drops') return { x: R() * W, y: -10, vx: 0, vy: 1 + R() * 2, r: (2 + R() * 3) * dpr, c: '232,178,90', life: .6, g: .02 };
      if (m === 'oil') return { x: c + (R() - .5) * W * .45, y: H * .72, vx: (R() - .5) * 2, vy: -(2 + R() * 5), r: (1 + R() * 2.5) * dpr, c: '255,196,90', life: 1, g: .08, glow: 1 };
      if (m === 'seeds') return { x: c + (R() - .5) * W * .3, y: -10, vx: (R() - .5) * .8, vy: 1.5 + R() * 2.5, r: (1.5 + R() * 1.5) * dpr, c: '240,214,160', life: 1, g: .05 };
      if (m === 'embers') return { x: R() * W, y: H + 10, vx: (R() - .5) * .8, vy: -(1 + R() * 2.2), r: (1 + R() * 1.8) * dpr, c: '255,150,60', life: .9, g: -.004, glow: 1 };
      return { x: c + (R() - .5) * W * .14, y: H * .55, vx: (R() - .5) * .5, vy: -(.6 + R() * .8), r: (18 + R() * 30) * dpr, c: '244,234,216', life: .12, g: -.002, soft: 1 };
    }
    function tick() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      var n = FX.mode === 'steam' ? 1 : FX.mode === 'oil' ? 6 : 3;
      for (var k = 0; k < n; k++) if (Math.random() < FX.k) FX.parts.push(spawn());
      FX.parts = FX.parts.filter(function (q) {
        q.vy += q.g; q.x += q.vx; q.y += q.vy; q.life -= q.soft ? .0008 : .006;
        if (q.life <= 0 || q.y > cv.height + 20 || q.y < -60) return false;
        ctx.beginPath();
        if (q.soft) { var gr = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r); gr.addColorStop(0, 'rgba(' + q.c + ',' + q.life + ')'); gr.addColorStop(1, 'rgba(' + q.c + ',0)'); ctx.fillStyle = gr; ctx.shadowBlur = 0; }
        else { ctx.fillStyle = 'rgba(' + q.c + ',' + Math.min(1, q.life) + ')'; if (q.glow) { ctx.shadowColor = 'rgba(255,180,60,.9)'; ctx.shadowBlur = 8 * dpr; } else ctx.shadowBlur = 0; }
        ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); return true;
      });
      if (FX.parts.length > 500) FX.parts.splice(0, FX.parts.length - 500);
    }
    function seek() { if (V.duration && Math.abs(vt - want) > .001) { vt += (want - vt) * .18; if (!V.seeking) V.currentTime = vt; } }
    setTitle(0);
    return { render: render, tick: tick, seek: seek };
  });

  /* ---------- reveals ---------- */
  $$('.words').forEach(function (el) {
    var i = 0;
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) { return '<span style="--i:' + (i++) + '">' + w + '</span>'; }).join(' ');
  });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.dataset.count) countUp(e.target); } });
  }, { threshold: .18 });
  $$('.rv,.words,[data-count]').forEach(function (el) { io.observe(el); });
  function countUp(el) {
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length, t0 = performance.now();
    if (reduce) { el.textContent = el.dataset.count.replace('.', ','); return; }
    (function step(t) {
      var k = ease((t - t0) / 1400); el.textContent = (end * k).toFixed(dec).replace('.', ',');
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* tilt cards */
  if (!reduce && matchMedia('(hover:hover)').matches) $$('.tcard').forEach(function (c) {
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 10 + 'deg');
      c.style.setProperty('--rx', -((e.clientY - r.top) / r.height - .5) * 10 + 'deg');
    });
    c.addEventListener('mouseleave', function () { c.style.setProperty('--ry', '0deg'); c.style.setProperty('--rx', '0deg'); });
  });

  /* fill text: woorden kleuren in bij scroll */
  $$('.fill p').forEach(function (p) {
    p.innerHTML = p.textContent.trim().split(/\s+/).map(function (w) { return '<span>' + w + '</span>'; }).join(' ');
  });

  /* scroll-linked extras */
  var par = $$('[data-par]'), marq = $$('.marq div'), fills = $$('.fill');
  function extras() {
    var vh = innerHeight;
    if (hd) hd.classList.toggle('solid', scrollY > 40);
    par.forEach(function (el) {
      var r = el.parentNode.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var k = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = 'translate3d(' + (el.dataset.par === 'x' ? k * -120 + 'px,0' : '0,' + k * -70 + 'px') + ',0)';
    });
    marq.forEach(function (el, i) { el.style.transform = 'translate3d(' + (-(scrollY * .35) % (el.scrollWidth / 2)) * (i % 2 ? -1 : 1) + 'px,0,0)'; });
    fills.forEach(function (el) {
      var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var sp = $$('span', el), k = clamp((vh * .85 - r.top) / (r.height + vh * .35), 0, 1) * sp.length;
      sp.forEach(function (s, i) { s.classList.toggle('lit', i < k); });
    });
  }

  /* saus-picker */
  $$('.picker').forEach(function (pk) {
    var out = $('#' + pk.dataset.out);
    $$('.chip', pk).forEach(function (ch) {
      ch.addEventListener('click', function () {
        $$('.chip', pk).forEach(function (x) { x.setAttribute('aria-pressed', x === ch); });
        out.classList.add('sw'); setTimeout(function () { out.textContent = ch.dataset.txt; out.classList.remove('sw'); }, 220);
      });
    });
  });

  /* nu open? (Europe/Amsterdam) */
  var H = { 0: [[16, 21]], 1: [], 2: [[16, 21]], 3: [[16, 21]], 4: [[16, 21]], 5: [[12, 14], [16, 21]], 6: [[12, 14], [16, 21]] };
  var DN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  (function () {
    var now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
    var d = now.getDay(), h = now.getHours() + now.getMinutes() / 60, txt = '', open = false;
    H[d].forEach(function (s) { if (h >= s[0] && h < s[1]) { open = true; txt = 'Nu open — tot ' + s[1] + ':00'; } });
    if (!open) {
      var later = H[d].filter(function (s) { return h < s[0]; })[0];
      if (later) txt = (H[d].length > 1 && h >= 14 ? 'Even pauze — vanaf ' : 'Nu gesloten — vandaag open om ') + later[0] + ':00' + (H[d].length > 1 && h >= 14 ? ' weer open' : '');
      else { var k = 1; while (!H[(d + k) % 7].length) k++; txt = 'Nu gesloten — ' + (k === 1 ? 'morgen' : DN[(d + k) % 7]) + ' weer open vanaf ' + H[(d + k) % 7][0][0] + ':00'; }
    }
    $$('.status').forEach(function (el) { el.textContent = txt; el.classList.toggle('open', open); });
    $$('.hours tr').forEach(function (tr) { if (+tr.dataset.d === d) tr.classList.add('today'); });
  })();

  /* ---------- loop ---------- */
  var lenis = (window.Lenis && !reduce) ? new Lenis({ lerp: .085 }) : null;
  (function raf(t) {
    if (lenis) lenis.raf(t);
    films.forEach(function (f) { if (f.render()) { f.seek(); if (!reduce) f.tick(); } });
    extras();
    requestAnimationFrame(raf);
  })(0);
})();

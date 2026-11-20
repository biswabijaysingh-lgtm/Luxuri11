/* Version 26: the arrival section after normalisboring.es, and the cursor.
   - the title rises line by line, the paragraph fades up;
   - each picture opens like a blind (clip-path) as you scroll to it, the image settling from a zoom;
   - over the five giant words a picture follows the pointer, wiping in from below, and the word leans into italic;
   - a small dot trails the pointer everywhere (desktop only); over pictures it grows into a ring with a word. */
(function () {
    'use strict';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function ease(x) { return 1 - Math.pow(1 - x, 3); }

    /* ---- title and paragraph ---- */
    var seen = [].slice.call(document.querySelectorAll('[data-nb-lines], [data-nb-fade]'));
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
        }, { threshold: 0.25 });
        seen.forEach(function (el) { io.observe(el); });
    } else { seen.forEach(function (el) { el.classList.add('is-in'); }); }

    /* ---- pictures that open like a blind ---- */
    var flips = [].slice.call(document.querySelectorAll('[data-nb-flip]')).map(function (f) {
        return { el: f, box: f.querySelector('.nb__flip-in'), img: f.querySelector('img'), dir: f.dataset.nbFlip };
    });
    function flipFrame() {
        var vh = window.innerHeight;
        flips.forEach(function (o) {
            var r = o.el.getBoundingClientRect();
            if (r.bottom < -50 || r.top > vh + 50) { return; }
            // opens as the top of the picture climbs from 92% to 38% of the screen
            var e = ease(clamp((vh * 0.92 - r.top) / (vh * 0.54)));
            var rem = ((1 - e) * 100).toFixed(2) + '%';
            o.box.style.clipPath = o.dir === 'left' ? 'inset(0 ' + rem + ' 0 0)' : 'inset(0 0 ' + rem + ' 0)';
            o.img.style.transform = 'scale(' + (1.2 - 0.2 * e).toFixed(4) + ')';
        });
    }
    var tick = false;
    function onScroll() { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; if (!reduce) { flipFrame(); } }); } }
    if (flips.length && !reduce) { window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll); flipFrame(); window.addEventListener('load', flipFrame); }

    /* ---- the picture that follows the pointer over the giant words ---- */
    var terms = document.querySelector('[data-nb-terms]');
    var follow = terms && terms.querySelector('[data-nb-follow]');
    var fx = 0, fy = 0, tx = 0, ty = 0, lastTx = 0, over = false, raf = 0;
    if (terms && follow && fine) {
        var list = terms.querySelector('.nb__list');
        var rows = [].slice.call(terms.querySelectorAll('[data-nb-term]'));
        var imgs = [].slice.call(follow.querySelectorAll('img'));
        var show = function (i) {
            rows.forEach(function (r, k) { r.classList.toggle('is-on', k === i); });
            imgs.forEach(function (m, k) { m.classList.toggle('is-on', k === i); });
            list.classList.toggle('has-hover', i >= 0);
        };
        rows.forEach(function (r, i) {
            r.addEventListener('mouseenter', function () { show(i); follow.classList.add('is-on'); });
        });
        terms.addEventListener('mouseleave', function () { over = false; show(-1); follow.classList.remove('is-on'); });
        terms.addEventListener('mousemove', function (e) {
            var b = terms.getBoundingClientRect();
            tx = e.clientX - b.left; ty = e.clientY - b.top;
            if (!over) { over = true; fx = tx; fy = ty; run(); }
        });
        var run = function () {
            if (raf) { return; }
            var step = function () {
                fx += (tx - fx) * 0.14; fy += (ty - fy) * 0.14;
                var vx = tx - fx, tilt = Math.max(-7, Math.min(7, vx * 0.05));
                var w = follow.offsetWidth, h = follow.offsetHeight;
                follow.style.transform = 'translate3d(' + (fx - w / 2).toFixed(1) + 'px,' + (fy - h / 2).toFixed(1) + 'px,0) rotate(' + tilt.toFixed(2) + 'deg)';
                raf = (over || Math.abs(tx - fx) > 0.5 || Math.abs(ty - fy) > 0.5) ? requestAnimationFrame(step) : 0;
            };
            raf = requestAnimationFrame(step);
        };
    }

    /* ---- the cursor ---- */
    if (fine && !reduce) {
        var cur = document.createElement('div');
        cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true');
        cur.innerHTML = '<span class="cur__t"></span>';
        document.body.appendChild(cur);
        var label = cur.querySelector('.cur__t');
        document.documentElement.classList.add('has-cursor');
        var cx = -100, cy = -100, mx = -100, my = -100, crun = 0;
        function cstep() {
            cx += (mx - cx) * 0.22; cy += (my - cy) * 0.22;
            cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
            crun = (Math.abs(mx - cx) > 0.3 || Math.abs(my - cy) > 0.3) ? requestAnimationFrame(cstep) : 0;
        }
        window.addEventListener('mousemove', function (e) {
            mx = e.clientX; my = e.clientY;
            if (!cur.classList.contains('is-seen')) { cx = mx; cy = my; cur.classList.add('is-seen'); }
            if (!crun) { crun = requestAnimationFrame(cstep); }
            var t = e.target && e.target.closest ? e.target : null;
            var v = t && t.closest('[data-cursor]');
            var l = t && t.closest('a, button, input, [role="button"]');
            var w = t && t.closest('[data-nb-terms] .nb__term');
            cur.classList.toggle('is-view', !!v);
            cur.classList.toggle('is-link', !!l && !v);
            cur.classList.toggle('is-text', !!w);
            label.textContent = v ? (v.getAttribute('data-cursor') || 'View') : '';
        }, { passive: true });
        document.addEventListener('mouseleave', function () { cur.classList.remove('is-seen'); });
        document.addEventListener('mouseenter', function () { cur.classList.add('is-seen'); });
    }
})();

/* The sideways journey: the section is as tall as the track is wide, and it pins; scrolling down slides the
   panels across. The pictures drift a little inside their frames, and the paragraph lights word by word. */
(function () {
    'use strict';
    var sec = document.querySelector('[data-nbh]');
    if (!sec) { return; }
    var track = sec.querySelector('[data-nbh-track]');
    var imgs = [].slice.call(sec.querySelectorAll('.nbh__img'));
    var lit = sec.querySelector('[data-nbhlit], [data-nbh-lit]');
    var words = lit ? [].slice.call(lit.querySelectorAll('span')) : [];
    var W = 0, H = 0, dist = 0, on = false, tick = false;
    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function stacked() { return window.matchMedia('(max-width: 900px), (pointer: coarse)').matches; }
    function measure() {
        W = window.innerWidth; H = window.innerHeight;
        if (stacked()) { on = false; sec.style.removeProperty('--nbh-h'); track.style.transform = ''; return; }
        on = true;
        dist = Math.max(0, track.scrollWidth - W);
        sec.style.setProperty('--nbh-h', (dist + H) + 'px');
    }
    function frame() {
        if (!on) { return; }
        var r = sec.getBoundingClientRect(), total = r.height - H;
        if (r.bottom < -H || r.top > H * 2) { return; }
        var p = total > 0 ? clamp(-r.top / total) : 0;
        track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
        imgs.forEach(function (f) {
            var b = f.getBoundingClientRect();
            if (b.right < -W * 0.2 || b.left > W * 1.2) { return; }
            var k = (b.left + b.width / 2 - W / 2) / W;            // -1 .. 1 across the screen
            var im = f.firstElementChild;
            if (im) { im.style.transform = 'translate3d(' + (k * -b.width * 0.09).toFixed(1) + 'px,0,0)'; }
        });
        if (lit && words.length) {
            var lb = lit.getBoundingClientRect();
            var q = clamp((W * 0.84 - lb.left) / (W * 0.5));        // how far the paragraph has come into the light
            var n = words.length;
            for (var i = 0; i < n; i++) { words[i].classList.toggle('on', i / n < q); }
        }
    }
    function req() { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; frame(); }); } }
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', function () { measure(); req(); });
    window.addEventListener('load', function () { measure(); req(); });
    measure(); frame();
})();

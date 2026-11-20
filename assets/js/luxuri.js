/* ==========================================================================
   LUXURI: luxuri.js (index.php; index2.php adds luxuri2.js after it)

   The doors · smooth scroll (Lenis, fine pointers only) · films that play only while seen ·
   headlines that rise into place and pictures that open like louvred shutters · parallax · the
   drawer, and long jumps through the doors · the season strip ·
   nightfall over the season · after dark (the arch, the gold dust, one night told by the clock) ·
   the statement that lights as you read and rises over the night · Drive, Sail, Fly running sideways ·
   the concierge's picture under the cursor · the ledger · the invitation that tilts · Miami's hour ·
   the finale (the night folded into the name) · the film player.
   Every part starts only if its markup is on the page, and one failing never stops the others.
   Dependencies: GSAP + ScrollTrigger and Lenis (vendor), dust.js (WebGL). All optional.
   ========================================================================== */
(function () {
    'use strict';

    var html = document.documentElement;
    var body = document.body;
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    var inOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var outExpo = function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); };
    var mq = function (q) { return window.matchMedia(q).matches; };

    var reduced = mq('(prefers-reduced-motion: reduce)');
    var fine = mq('(hover: hover) and (pointer: fine)');
    var hasGsap = !!(window.gsap && window.ScrollTrigger);
    var hasDust = !reduced && !!window.LuxDust && window.LuxDust.supported();
    var pinned = hasGsap && fine && !reduced && window.innerWidth >= 1024;
    var state = { modal: false, drawer: false, started: false };
    var VH = window.innerHeight;

    html.classList.add('fx');
    if (pinned) { html.classList.add('is-pinned'); }
    if (fine) { html.classList.add('has-cursor'); }
    if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
    if (!location.hash) { window.scrollTo(0, 0); }

    function safe(name, fn) {
        try { return fn(); } catch (err) { if (window.console) { console.warn('[luxuri] ' + name + ': ' + (err && err.message)); } }
        return null;
    }

    /* ------------------------------------------------------------------
       Smooth scroll on fine pointers; touch keeps its own momentum
       ------------------------------------------------------------------ */
    var lenis = null;
    if (hasGsap) {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });
    }
    if (hasGsap && window.Lenis && fine && !reduced) {
        lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9 });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
    }
    function lockScroll(on) {
        if (lenis) { if (on) { lenis.stop(); } else { lenis.start(); } }
        html.style.overflow = on ? 'hidden' : '';
    }
    var scrollFns = [];
    function onScroll(fn) { scrollFns.push(fn); }
    (function () {
        var queued = false;
        function run() { queued = false; for (var i = 0; i < scrollFns.length; i++) { scrollFns[i](); } }
        function ask() { if (!queued) { queued = true; requestAnimationFrame(run); } }
        if (lenis) { lenis.on('scroll', ask); } else { window.addEventListener('scroll', ask, { passive: true }); }
        window.addEventListener('resize', ask);
    })();
    // a scroll the page starts itself (a link, a tick, a snap): the night's snapping stays out of its way
    var autoT = 0;
    function scrollToY(y, dur, done) {
        state.auto = true;
        clearTimeout(autoT);
        var end = function () { state.auto = false; clearTimeout(autoT); if (done) { done(); } };
        autoT = setTimeout(end, (dur || 1) * 1000 + 500);
        if (lenis) {
            lenis.scrollTo(y, { duration: dur, easing: function (t) { return 1 - Math.pow(1 - t, 3); }, onComplete: end, lock: false, force: true });
        } else {
            window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
        }
    }
    function barHeight() { var b = $('[data-bar]'); return b ? b.offsetHeight : 0; }

    // a long jump goes through the doors: they close, the page moves behind them, they part again
    function cut(y, done) {
        var plate = $('[data-plate]');
        if (!plate || reduced || cut.busy) { scrollToY(y, 1.2, done); return; }
        cut.busy = true;
        state.auto = true;
        html.classList.remove('is-gone', 'is-reopen');
        void plate.offsetWidth;
        html.classList.add('is-cut');
        setTimeout(function () {
            if (lenis) { lenis.scrollTo(y, { immediate: true, force: true }); } else { window.scrollTo(0, y); }
            if (hasGsap) { ScrollTrigger.update(); }
            setTimeout(function () {
                html.classList.add('is-reopen');
                html.classList.remove('is-cut');
                setTimeout(function () {
                    html.classList.add('is-gone');
                    html.classList.remove('is-reopen');
                    cut.busy = false;
                    state.auto = false;
                    if (done) { done(); }
                }, 1300);
            }, 220);
        }, 720);
    }
    cut.busy = false;

    /* ------------------------------------------------------------------
       Films
       ------------------------------------------------------------------ */
    function loadVideo(v) {
        if (!v || v.dataset.loaded) { return; }
        if (v.dataset.src) { v.src = v.dataset.src; }
        v.dataset.loaded = '1';
        v.preload = 'auto';
        try { v.load(); } catch (e) { /* ignore */ }
    }
    function playVideo(v) {
        if (!v) { return; }
        loadVideo(v);
        v.muted = true;
        var p = v.play();
        if (p && p.catch) { p.catch(function () {}); }
    }
    function pauseVideo(v) { if (v && !v.paused) { v.pause(); } }

    // every film that no section looks after itself: loaded near the screen, playing only while seen
    function setupFilms() {
        var vids = $$('video').filter(function (v) {
            if (v.closest('[data-film]') || v.hasAttribute('data-own')) { return false; }
            if (pinned && v.closest('[data-stage], [data-own-films]')) { return false; }
            return true;
        });
        if (!('IntersectionObserver' in window)) { vids.forEach(playVideo); return; }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) { if (en.isIntersecting) { playVideo(en.target); } else { pauseVideo(en.target); } });
        }, { rootMargin: '30% 0px 30% 0px' });
        vids.forEach(function (v) { io.observe(v); });
    }

    /* The shutter: blinds rising from the centre outwards, as one clip-path polygon */
    function shutter(t, strips) {
        var S = strips || 10, spread = 0.5, pts = [];
        for (var i = 0; i < S; i++) {
            var c = S > 1 ? Math.abs(i - (S - 1) / 2) / ((S - 1) / 2) : 0;
            var local = inOut(clamp((t - c * spread) / (1 - spread), 0, 1));
            var y = ((1 - local) * 100).toFixed(2);
            var x0 = (i / S * 100).toFixed(3), x1 = ((i + 1) / S * 100).toFixed(3);
            pts.push(x0 + '% 100%', x0 + '% ' + y + '%', x1 + '% ' + y + '%', x1 + '% 100%');
        }
        return 'polygon(' + pts.join(',') + ')';
    }

    /* ------------------------------------------------------------------
       Words and blocks arrive as they are reached
       ------------------------------------------------------------------ */
    function splitWords(el) {
        var i = 0;
        (function walk(node) {
            Array.prototype.slice.call(node.childNodes).forEach(function (n) {
                if (n.nodeType === 3) {
                    var frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach(function (p) {
                        if (!p) { return; }
                        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
                        var s = document.createElement('span'), m = document.createElement('span');
                        s.className = 'w';
                        s.style.transitionDelay = (i++ * 0.055).toFixed(3) + 's';
                        s.textContent = p;
                        m.className = 'wm';
                        m.appendChild(s);
                        frag.appendChild(m);
                    });
                    node.replaceChild(frag, n);
                } else if (n.nodeType === 1 && !n.classList.contains('w') && !n.classList.contains('wm')) {
                    walk(n);
                }
            });
        })(el);
    }
    function setupReveals() {
        var words = $$('[data-words]');
        words.forEach(splitWords);
        $$('.rv').forEach(function (el) {
            var pa = el.parentElement;
            var n = pa ? (pa._rvN = (pa._rvN || 0) + 1) - 1 : 0;
            el.style.setProperty('--d', Math.min(0.72, n * 0.09).toFixed(2) + 's');
        });
        var all = words.concat($$('.rv'));
        if (reduced || !('IntersectionObserver' in window)) { all.forEach(function (el) { el.classList.add('in'); }); return; }
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
        all.forEach(function (el) { io.observe(el); });
    }

    /* the parallax blocks: a little taller than their frame, drifting as the frame crosses the screen */
    function setupParallax() {
        var paras = $$('[data-para]');
        if (!paras.length || reduced) { return; }
        onScroll(function () {
            for (var i = 0; i < paras.length; i++) {
                var box = paras[i].parentElement.getBoundingClientRect();
                if (box.bottom < -40 || box.top > VH + 40) { continue; }
                var k = clamp((VH - box.top) / (VH + box.height), 0, 1);
                paras[i].style.transform = 'translate3d(0,' + (-k * 10).toFixed(2) + '%,0)';
            }
        });
    }

    /* the louvres: a picture's slats turn open together once it is reached, and the light comes in */
    function setupLouvres() {
        var els = $$('.lv');
        if (!els.length) { return; }
        if (!hasGsap || reduced) { els.forEach(function (el) { el.classList.add('is-open'); }); return; }
        function open(el) {
            var img = $('img', el);
            gsap.fromTo(el, { '--lv': 0 }, { '--lv': 1, duration: 1.8, ease: 'power3.inOut', onComplete: function () { el.classList.add('is-open'); el.style.removeProperty('--lv'); } });
            if (img) {
                img.style.transition = 'none';
                gsap.fromTo(img, { scale: 1.16, filter: 'brightness(0.5)' }, { scale: 1, filter: 'brightness(1)', duration: 2.6, ease: 'expo.out', onComplete: function () { gsap.set(img, { clearProps: 'transform,filter,transition' }); } });
            }
        }
        if (!('IntersectionObserver' in window)) { els.forEach(open); return; }
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); open(en.target); } });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
        els.forEach(function (el) { io.observe(el); });
    }

    /* ------------------------------------------------------------------
       The drawer, the links, the bar's current room
       ------------------------------------------------------------------ */
    function setupDrawer() {
        var d = $('[data-drawer]');
        if (!d) { return; }
        var last = null;
        $$('.mxlist li', d).forEach(function (li, i) { li.style.setProperty('--i', i); });
        function open(e) {
            last = e && e.currentTarget;
            state.drawer = true;
            d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false');
            $$('.mxmenu').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
            lockScroll(true);
            var c = $('.mxclose', d); if (c) { setTimeout(function () { c.focus(); }, 80); }
        }
        function close() {
            if (!state.drawer) { return; }
            state.drawer = false;
            d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true');
            $$('.mxmenu').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
            lockScroll(false);
            if (last && last.focus) { last.focus(); }
        }
        $$('.mxmenu').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); b.addEventListener('click', open); });
        $$('[data-drawer-close]', d).forEach(function (b) { b.addEventListener('click', close); });
        document.addEventListener('keydown', function (e) {
            if (!state.drawer) { return; }
            if (e.key === 'Escape') { close(); return; }
            if (e.key !== 'Tab') { return; }
            // keep the keyboard inside the drawer while it is open
            var f = $$('a[href], button', $('.mxside', d));
            if (!f.length) { return; }
            var first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
        setupDrawer.close = close;
    }

    function setupAnchors() {
        document.addEventListener('click', function (e) {
            var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
            if (!a) { return; }
            var id = a.getAttribute('href').slice(1);
            var el = id ? document.getElementById(id) : null;
            if (!id) { e.preventDefault(); return; }
            if (!el) { return; }
            e.preventDefault();
            var wasOpen = state.drawer;
            if (wasOpen && setupDrawer.close) { setupDrawer.close(); }
            var go = function () {
                var off = (id === 'top' || id === 'after-dark') ? 0 : barHeight();
                // a section held in place by a pin is measured by the space it keeps in the page;
                // a scene inside a held section says where it is itself (story.js)
                var box = el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
                var own = window.Luxuri && window.Luxuri.anchorY ? window.Luxuri.anchorY(el) : null;
                var y = Math.max(0, id === 'top' ? 0 : (own !== null ? own : box.getBoundingClientRect().top + window.scrollY - off));
                if (Math.abs(y - window.scrollY) > VH * 1.5) { cut(y); } else { scrollToY(y, 1.2); }
            };
            if (wasOpen) { setTimeout(go, 120); } else { go(); }
            if (history.replaceState) { history.replaceState(null, '', '#' + id); }
        });
    }

    function setupCurrentLink() {
        var links = $$('.mxnav a[href^="#"]');
        if (!links.length || !('IntersectionObserver' in window)) { return; }
        var map = {};
        links.forEach(function (a) { var id = a.getAttribute('href').slice(1); (map[id] = map[id] || []).push(a); });
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (en) {
                (map[en.target.id] || []).forEach(function (a) { a.classList.toggle('is-on', en.isIntersecting); });
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        // scenes held together in one screen (story.js) mark their own link
        Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s && !(pinned && s.closest('[data-own-films]'))) { io.observe(s); } });
    }

    /* ------------------------------------------------------------------
       The season strip: drag it, scroll it, step it; the gold line shows how far along
       ------------------------------------------------------------------ */
    function setupRail() {
        var rail = $('[data-rail]');
        if (!rail) { return; }
        var bar = $('[data-rail-bar]'), down = null, moved = false;
        function prog() { if (!bar) { return; } var m = rail.scrollWidth - rail.clientWidth; bar.style.transform = 'scaleX(' + (m > 0 ? rail.scrollLeft / m : 0).toFixed(4) + ')'; }
        function step(d) {
            var it = $$('.dwit', rail), s = it[1] ? it[1].offsetLeft - it[0].offsetLeft : 300;
            try { rail.scrollBy({ left: d * Math.max(240, s), behavior: reduced ? 'auto' : 'smooth' }); } catch (e) { rail.scrollLeft += d * s; }
        }
        rail.addEventListener('scroll', prog, { passive: true });
        window.addEventListener('resize', prog);
        var prev = $('[data-rail-prev]'), next = $('[data-rail-next]');
        if (prev) { prev.addEventListener('click', function () { step(-1); }); }
        if (next) { next.addEventListener('click', function () { step(1); }); }
        rail.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch' || e.button !== 0) { return; } down = { x: e.clientX, sl: rail.scrollLeft }; moved = false; rail.classList.add('held'); try { rail.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } });
        rail.addEventListener('pointermove', function (e) { if (!down) { return; } var dx = e.clientX - down.x; if (Math.abs(dx) > 4) { moved = true; } rail.scrollLeft = down.sl - dx; });
        var up = function () { if (!down) { return; } down = null; rail.classList.remove('held'); };
        rail.addEventListener('pointerup', up); rail.addEventListener('pointercancel', up);
        rail.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
        rail.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } });
        // the wheel scrolls the page, not the strip, unless it is a sideways gesture
        prog();
    }

    /* ------------------------------------------------------------------
       AFTER DARK: the cover (an arch onto the still life, candlelight under the cursor)
       ------------------------------------------------------------------ */
    function Cover(el) {
        var arch = $('[data-cover-arch]', el);
        var img = $('[data-cover-img]', el);
        var vid = $('.cover__vid', el);          // a living still life, where the page has one
        var dark = $('[data-cover-dark]', el);
        var halfL = $('[data-cover-l]', el), halfR = $('[data-cover-r]', el);
        var script = $('[data-cover-script]', el);
        var line = $('[data-cover-line]', el);
        var metas = $$('[data-cover-meta]', el);
        var self = this;
        this.open = reduced ? 1 : 0;   // the doors part, once the section is reached
        this.e = 0;                     // the scroll: the arch becomes the screen
        var light = { x: 50, y: 58 };
        function paintLight() { dark.style.setProperty('--mx', light.x.toFixed(2) + '%'); dark.style.setProperty('--my', light.y.toFixed(2) + '%'); }
        if (hasGsap && !reduced) {
            if (fine) {
                var lx = gsap.quickTo(light, 'x', { duration: 1.2, ease: 'power3', onUpdate: paintLight });
                var ly = gsap.quickTo(light, 'y', { duration: 1.2, ease: 'power3', onUpdate: paintLight });
                el.addEventListener('pointermove', function (ev) {
                    if (self.e > 0.98) { return; }
                    lx(ev.clientX / window.innerWidth * 100); ly(ev.clientY / window.innerHeight * 100);
                }, { passive: true });
            } else {
                gsap.to(light, { x: 38, duration: 5.5, ease: 'sine.inOut', repeat: -1, yoyo: true, onUpdate: paintLight });
                gsap.to(light, { y: 70, duration: 4.1, ease: 'sine.inOut', repeat: -1, yoyo: true, onUpdate: paintLight });
            }
        }
        paintLight();

        this.layout = function () {
            var W = window.innerWidth, H = el.offsetHeight || window.innerHeight, mob = W < 768;
            var restX = mob ? W * 0.13 : W * 0.30;
            var restT = mob ? H * 0.18 : H * 0.15;
            var restB = mob ? H * 0.15 : H * 0.12;
            var o = outExpo(self.open);
            var X = lerp(W / 2, restX, o);
            var T = lerp(restT + 20, restT, o);
            var R = (W - 2 * X) / 2;
            var e = inOut(self.e);
            X = lerp(X, 0, e); T = lerp(T, 0, e);
            var B = lerp(restB, 0, e);
            R = lerp(R, 0, e);
            arch.style.clipPath = 'inset(' + T.toFixed(1) + 'px ' + X.toFixed(1) + 'px ' + B.toFixed(1) + 'px ' + X.toFixed(1) + 'px round ' + R.toFixed(1) + 'px ' + R.toFixed(1) + 'px 0 0)';
            img.style.transform = 'scale(' + lerp(1.18, 1, e).toFixed(4) + ')';
            if (vid) { vid.style.transform = img.style.transform; }
            dark.style.opacity = (1 - e * 0.9).toFixed(3);
            var shift = e * W * 0.55;
            var fade = clamp(1 - e * 1.6, 0, 1) * o;
            halfL.style.transform = mob ? '' : 'translate3d(' + (-shift - (1 - o) * W * 0.04).toFixed(1) + 'px,0,0)';
            halfR.style.transform = mob ? '' : 'translate3d(' + (shift + (1 - o) * W * 0.04).toFixed(1) + 'px,0,0)';
            halfL.style.opacity = halfR.style.opacity = fade.toFixed(3);
            script.style.opacity = (clamp(1 - e * 2.2, 0, 1) * smooth(0.35, 1, self.open)).toFixed(3);
            script.style.clipPath = 'inset(-30% ' + ((1 - smooth(0.3, 1, self.open)) * 100).toFixed(1) + '% -30% 0)';
            var mf = (clamp(1 - e * 3, 0, 1) * smooth(0.5, 1, self.open)).toFixed(3);
            line.style.opacity = mf;
            metas.forEach(function (m) { m.style.opacity = mf; });
        };
        var opened = false;
        this.intro = function () {
            if (opened) { return; }
            opened = true;
            if (!hasGsap || reduced) { self.open = 1; self.layout(); return; }
            gsap.to(self, { open: 1, duration: 2.6, ease: 'power2.inOut', onUpdate: self.layout });
        };
        this.layout();
        // the doors part when the cover is reached, not when the page opens
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (es) {
                if (es.some(function (en) { return en.isIntersecting; })) { io.disconnect(); self.intro(); }
            }, { threshold: 0.35 });
            io.observe(el);
            if (vid && pinned) {
                new IntersectionObserver(function (es) {
                    if (es[0].isIntersecting && getComputedStyle(vid).display !== 'none') { playVideo(vid); } else { pauseVideo(vid); }
                }, { rootMargin: '20% 0px' }).observe(el);
            }
        } else { this.intro(); }
    }

    /* AFTER DARK, pinned on a desktop: the cover, then one night in chapters */
    function Stage(el, cover) {
        var coverEl = $('[data-cover]', el);
        var coverImg = $('[data-cover-img]', el);
        var coverVid = $('.cover__vid', el);
        var dustCv = $('[data-cover-dust]', el);
        var frames = $$('[data-frame]', el);
        var videos = frames.map(function (f) { return $('video', f); });
        var ui = $('[data-night-ui]', el);
        var data = JSON.parse($('[data-night-data]', el).textContent);
        var digits = $$('.clock__digit', el);
        var title = $('[data-night-title]', el);
        var kind = $('[data-night-kind]', el), count = $('[data-night-count]', el);
        var place = $('[data-night-place]', el), line = $('[data-night-line]', el);
        var meta = $('.night__meta', el);
        var ticks = $$('[data-tick]', el);
        var N = frames.length;
        var C = 1.5;                       // screens of scroll spent on the cover
        var raw = -1, lastRaw = 0, dir = 1, shown = 0, lastI = -1, lastIn = -1;
        var dust = null, dustTried = false;
        var USE_DUST = false;              // the gold-dust dissolve is switched off (version 20)
        var romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

        function top() { return el.getBoundingClientRect().top + window.scrollY; }

        function buildDust() {
            if (!hasDust || !coverImg.complete || !coverImg.naturalWidth) { return; }
            dustTried = true;
            try {
                dust = new LuxDust(dustCv, { additive: false, maxDpr: 1.5 });
                var step = 5, H = dust.h;
                dust.fromImageCover(coverImg, step, {
                    alphaMin: 0,
                    delay: function (x, y, r0) { return clamp((1 - y / H) * 0.7 + r0 * 0.3, 0, 1); },
                    dir: function (x, y, r) { return [r[1] * 260 - 130, -(300 + r[2] * 760)]; }
                });
                dust.set({ size: step * 1.3, soft: 0.5, goldMix: 0, breath: 0, assemble: 1, dissolve: 0 });
            } catch (e) { dust = null; }
        }

        function setChapter(k) {
            if (k === shown) { return; }
            shown = k;
            var t = data[k].time.replace(':', '');
            digits.forEach(function (d, i) { d.style.setProperty('--d', t.charAt(i)); });
            ticks.forEach(function (b, i) { b.classList.toggle('is-active', i === k); });
            count.textContent = romans[k] || String(k + 1);
            if (hasGsap) {
                gsap.killTweensOf([title, meta]);
                gsap.timeline()
                    .to(title, { opacity: 0, duration: 0.22, ease: 'power1.in' })
                    .add(function () { title.textContent = data[k].title; })
                    .fromTo(title, { opacity: 1, clipPath: 'inset(-40% 100% -40% 0%)' }, { clipPath: 'inset(-40% -10% -40% 0%)', duration: 1.5, ease: 'power2.inOut' });
                gsap.timeline()
                    .to(meta, { opacity: 0, y: 8, duration: 0.25, ease: 'power1.in' })
                    .add(function () { kind.textContent = data[k].kind; place.textContent = data[k].place; line.textContent = data[k].line; })
                    .to(meta, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' });
            } else {
                title.textContent = data[k].title; kind.textContent = data[k].kind; place.textContent = data[k].place; line.textContent = data[k].line;
            }
        }

        function render(time) {
            var c = clamp(raw / C, 0, 1);
            var e = clamp(c / 0.62, 0, 1);
            var d = clamp((c - 0.62) / 0.38, 0, 1);
            coverEl.style.visibility = c < 0.999 ? 'visible' : 'hidden';
            if (c < 0.999) {
                cover.e = e;
                cover.layout();
                coverEl.style.background = e > 0.999 ? 'transparent' : '';
                // version 20: no gold dust. The cover picture softens and melts into the first night scene
                // beneath it: a slow blur and a long fade, easing in and out (the dust canvas is not used)
                if (USE_DUST && d > 0.001 && !dust && !dustTried) { buildDust(); }
                if (dust) {
                    coverImg.style.opacity = (1 - smooth(0.005, 0.12, d)).toFixed(3);
                    dustCv.style.opacity = d > 0.001 ? 1 : 0;
                    dust.set({ dissolve: d, goldMix: d * 0.3 });
                    if (d > 0.001) { dust.render(time); }
                } else {
                    var m = smooth(0, 1, d);                                   // eased 0 to 1 over the dissolve
                    coverImg.style.opacity = (1 - smooth(0.08, 0.98, m)).toFixed(3);
                    coverImg.style.filter = m > 0.002 ? 'blur(' + (m * 18).toFixed(1) + 'px) brightness(' + (1 - m * 0.08).toFixed(3) + ')' : '';
                }
                if (coverVid) { coverVid.style.opacity = coverImg.style.opacity; coverVid.style.filter = coverImg.style.filter; }
            }
            // the last screen: the statement rises over the night, which falls back and dims under it
            var cf = clamp(raw - (N + 1), 0, 1);
            ui.style.opacity = (smooth(0.78, 1, c) * (1 - smooth(0, 0.7, cf))).toFixed(3);
            ui.style.visibility = c > 0.75 && cf < 0.99 ? 'visible' : 'hidden';

            var on = raw > -1 && raw < N + 2;   // the stage is on screen
            var pos = clamp(raw - C, 0, N - 1);
            var i = Math.min(Math.floor(pos), N - 1);
            var t = i < N - 1 ? smooth(0.3, 1, pos - i) : 0;
            var inc = t > 0 ? i + 1 : -1;
            if (i !== lastI || inc !== lastIn) {
                frames.forEach(function (f, k) {
                    var cur = k === i, isIn = k === inc;
                    f.classList.toggle('is-current', cur);
                    f.classList.toggle('is-in', isIn);
                    if (!isIn) { f.style.clipPath = ''; }
                    if (!cur && !isIn) { f.style.setProperty('--s', 1); f.style.setProperty('--dim', 0); }
                    if (!(cur || isIn)) { pauseVideo(videos[k]); }
                });
                for (var p = i; p <= i + 2 && p < N; p++) { loadVideo(videos[p]); }
                lastI = i; lastIn = inc;
            }
            if (on && c > 0.4) {
                if (videos[i] && videos[i].paused) { playVideo(videos[i]); }
                if (inc >= 0 && videos[inc] && videos[inc].paused) { playVideo(videos[inc]); }
            } else { videos.forEach(pauseVideo); }
            frames[i].style.setProperty('--s', (1 + t * 0.07 + cf * 0.06).toFixed(4));
            frames[i].style.setProperty('--dim', Math.max(t * 0.5, cf * 0.7).toFixed(3));
            if (inc >= 0) {
                frames[inc].style.clipPath = shutter(t, 10);
                frames[inc].style.setProperty('--s', (1.12 - 0.12 * t).toFixed(4));
                frames[inc].style.setProperty('--dim', ((1 - t) * 0.35).toFixed(3));
            }
            setChapter(t > 0.5 ? i + 1 : i);
            ticks.forEach(function (b, k) {
                var f = k <= i ? 1 : (k === i + 1 ? t : 0);
                b.style.setProperty('--p', f.toFixed(3));
            });
        }

        /* one wheel gesture moves one chapter, while inside the night */
        var points = [0, C];
        for (var k = 1; k < N; k++) { points.push(C + k); }
        var snapT = 0, snapping = false;
        function snap() {
            if (snapping || state.auto || state.modal || state.drawer) { return; }
            var last = points[points.length - 1];
            if (raw < C - 0.02 || raw > last + 0.06) { return; }   // the cover scrolls freely; the chapters settle
            var target = null;
            for (var j = 0; j < points.length - 1; j++) {
                if (raw >= points[j] - 0.001 && raw <= points[j + 1] + 0.001) {
                    var span = points[j + 1] - points[j];
                    var f = (raw - points[j]) / span;
                    target = dir > 0 ? (f > 0.06 ? points[j + 1] : points[j]) : (f < 0.94 ? points[j] : points[j + 1]);
                    break;
                }
            }
            if (target === null || Math.abs(target - raw) < 0.004) { return; }
            snapping = true;
            scrollToY(top() + target * VH, 0.95, function () { snapping = false; });
            setTimeout(function () { snapping = false; }, 1300);
        }

        function update() {
            var r = el.getBoundingClientRect();
            raw = -r.top / VH;
            if (raw !== lastRaw) { dir = raw > lastRaw ? 1 : -1; lastRaw = raw; }
            render(performance.now() / 1000);
            clearTimeout(snapT);
            if (lenis) { snapT = setTimeout(snap, 140); }
        }

        ticks.forEach(function (b, k) {
            b.addEventListener('click', function () { scrollToY(top() + (C + k) * VH, 1.3); });
        });

        this.resize = function () { if (dust) { dust.destroy(); dust = null; dustTried = false; } update(); };
        this.pause = function () { videos.forEach(pauseVideo); };
        this.resume = function () { lastI = -1; update(); };

        onScroll(update);
        if (hasGsap) { gsap.ticker.add(function () { if (dust && raw > C * 0.6 && raw < C) { dust.render(performance.now() / 1000); } }); }
        update();
    }

    /* ------------------------------------------------------------------
       The statement: the words light up as you read; the films open in the line
       ------------------------------------------------------------------ */
    function setupStatement() {
        var sec = $('[data-house]');
        if (!sec) { return; }
        var text = $('[data-house-text]', sec);
        var words = $$('.w', text);
        var floats = $$('[data-float]', sec);
        if (!hasGsap || reduced) { words.forEach(function (w) { w.style.opacity = 1; }); return; }
        var chips = $$('[data-chip]', sec);
        gsap.set(chips, { width: 0 });
        var nodes = $$(':scope > *', text);
        ScrollTrigger.create({
            trigger: text, start: 'top 82%', end: 'bottom 42%', scrub: true,
            onUpdate: function (s) {
                var n = nodes.length, lit = s.progress * (n + 2);
                nodes.forEach(function (node, i) {
                    var v = clamp(lit - i, 0, 1);
                    if (node.classList.contains('chip')) {
                        if (v > 0 && !node._open) { node._open = true; gsap.to(node, { width: '1.5em', duration: 1.1, ease: 'expo.out' }); }
                        if (v === 0 && node._open) { node._open = false; gsap.to(node, { width: 0, duration: 0.6, ease: 'power2.inOut' }); }
                    } else {
                        node.style.opacity = (0.16 + 0.84 * v).toFixed(3);
                    }
                });
            }
        });
        var speeds = [-28, 34, -18, 22];
        floats.forEach(function (f, i) {
            gsap.fromTo(f, { yPercent: -speeds[i % 4] }, { yPercent: speeds[i % 4], ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
            gsap.fromTo($('img', f), { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
        // pinned, it rises over the night's last light with a curved edge that is flat once it fills the screen
        if (pinned) {
            var curved = false;
            onScroll(function () {
                var top = sec.getBoundingClientRect().top;
                if (top <= 0 || top >= VH) { if (curved) { sec.style.clipPath = ''; curved = false; } return; }
                var d = Math.pow(top / VH, 1.5) * VH * 0.3, W = sec.offsetWidth, H = sec.offsetHeight;
                sec.style.clipPath = 'path("M0 ' + d.toFixed(1) + 'Q' + (W / 2) + ' ' + (-d).toFixed(1) + ' ' + W + ' ' + d.toFixed(1) + 'V' + H + 'H0Z")';
                curved = true;
            });
        }
    }

    /* nightfall: on a desktop the season holds and falls back while the night slides up over it */
    function setupNightfall() {
        var day = $('[data-nightfall]'), inner = day && $('[data-nightfall-in]', day);
        if (!inner || !pinned) { return; }
        gsap.fromTo(inner, { scale: 1, yPercent: 0, opacity: 1 }, {
            scale: 0.88, yPercent: -4, opacity: 0.2, ease: 'none',
            scrollTrigger: { trigger: day, start: 'bottom bottom', end: '+=100%', scrub: true, pin: true, pinSpacing: false }
        });
    }

    /* ------------------------------------------------------------------
       Drive · Sail · Fly: sideways on a desktop
       ------------------------------------------------------------------ */
    function setupFleet() {
        var sec = $('[data-fleet]');
        if (!sec || !hasGsap) { return; }
        var track = $('[data-fleet-track]', sec);
        var panels = $$('[data-fleet-panel]', sec);
        var bar = $('[data-fleet-bar]', sec);
        if (pinned) {
            var dist = function () { return track.scrollWidth - window.innerWidth; };
            var tween = gsap.to(track, {
                x: function () { return -dist(); }, ease: 'none',
                scrollTrigger: {
                    trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
                    onUpdate: function (s) { if (bar) { bar.style.transform = 'scaleX(' + s.progress.toFixed(4) + ')'; } }
                }
            });
            // on the way in, the first film opens from a slit of light, like a car's light bar
            var first = $('.fleet__media', panels[0]);
            if (first) {
                gsap.fromTo(first, { clipPath: 'inset(49.5% 0% 49.5% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power1.inOut', scrollTrigger: { trigger: sec, start: 'top 85%', end: 'top top', scrub: true } });
            }
            panels.forEach(function (p) {
                var word = $('[data-fleet-word]', p), media = $('.fleet__media', p), text = $('.fleet__text', p);
                gsap.fromTo(word, { xPercent: 18 }, { xPercent: -22, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
                gsap.fromTo($('video', media), { scale: 1.2, xPercent: 6 }, { scale: 1, xPercent: -6, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
                gsap.from(text.children, { opacity: 0, y: 30, duration: 1.2, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left 55%', toggleActions: 'play none none reverse' } });
            });
        } else if (!reduced) {
            panels.forEach(function (p) {
                gsap.fromTo($('[data-fleet-word]', p), { xPercent: 10 }, { xPercent: -14, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
                gsap.from($('.fleet__media', p), { clipPath: 'inset(100% 0 0 0)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 75%', once: true } });
            });
        }
    }

    /* ------------------------------------------------------------------
       The concierge: an arch with the service's picture follows the cursor
       ------------------------------------------------------------------ */
    function setupConcierge() {
        var sec = $('[data-concierge]');
        var peek = $('[data-peek]');
        if (!sec || !peek || !fine || !hasGsap || reduced || getComputedStyle(peek).display === 'none') { return; }
        var inner = $('[data-peek-in]', peek);
        var items = $$('[data-service]', sec);
        var frames = items.map(function (it) {
            var f = document.createElement('figure');
            var im = document.createElement('img');
            im.alt = ''; im.decoding = 'async'; im.loading = 'lazy'; im.src = it.dataset.service;
            f.appendChild(im); inner.appendChild(f);
            f.style.opacity = '0';
            return f;
        });
        var cur = -1, tw = null;
        function show(k) {
            if (k === cur) { return; }
            var f = frames[k], prev = cur >= 0 ? frames[cur] : null;
            cur = k;
            if (tw) { tw.progress(1); }
            f.style.zIndex = 2; f.style.opacity = 1;
            var o = { t: 0 };
            f.style.clipPath = shutter(0, 5);
            tw = gsap.to(o, { t: 1, duration: 0.7, ease: 'none', onUpdate: function () { f.style.clipPath = shutter(o.t, 5); }, onComplete: function () {
                f.style.clipPath = ''; f.style.zIndex = 1;
                if (prev && prev !== f) { prev.style.opacity = 0; prev.style.zIndex = 0; }
                tw = null;
            } });
        }
        var xTo = gsap.quickTo(peek, 'x', { duration: 0.6, ease: 'power3' });
        var yTo = gsap.quickTo(peek, 'y', { duration: 0.6, ease: 'power3' });
        sec.addEventListener('pointermove', function (e) { xTo(e.clientX + 150); yTo(e.clientY); }, { passive: true });
        items.forEach(function (it, i) { it.addEventListener('mouseenter', function () { peek.classList.add('is-on'); show(i); }); });
        $('.services', sec).addEventListener('mouseleave', function () { peek.classList.remove('is-on'); });
    }

    /* ------------------------------------------------------------------
       The ledger: an entry is written out letter by letter once seen; the facts count up once
       ------------------------------------------------------------------ */
    function setupLedger() {
        var box = $('[data-ledger]');
        if (!box) { return; }
        var tabs = $$('.lgtab', box), q = $('.lgq', box), text = $('[data-lg-text]', box), sr = $('[data-lg-sr]', box);
        var no = $('[data-lg-no]', box), where = $('[data-lg-where]', box), who = $('[data-lg-who]', box);
        var at = 0, seen = reduced, timer = 0;
        function write(s) {
            clearInterval(timer); q.classList.remove('done');
            if (sr) { sr.textContent = s; }
            if (!seen || reduced) { text.textContent = s; q.classList.add('done'); return; }
            var i = 0; text.textContent = '';
            timer = setInterval(function () { i++; text.textContent = s.slice(0, i); if (i >= s.length) { clearInterval(timer); q.classList.add('done'); } }, 26);
        }
        function go(k) {
            at = ((k % tabs.length) + tabs.length) % tabs.length;
            var t = tabs[at];
            tabs.forEach(function (b, j) {
                var on = j === at, r = $('.lgrun', b);
                b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on));
                if (r) { r.classList.remove('go'); if (on && seen && !reduced) { void r.offsetWidth; r.classList.add('go'); } }
            });
            no.textContent = 'Entry ' + t.getAttribute('data-no');
            where.textContent = t.getAttribute('data-where');
            who.textContent = t.getAttribute('data-who');
            write(t.getAttribute('data-q'));
        }
        tabs.forEach(function (b, j) {
            b.addEventListener('click', function () { go(j); });
            var r = $('.lgrun', b); if (r) { r.addEventListener('animationend', function () { if (j === at) { go(at + 1); } }); }
        });
        if (!seen && 'IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (es) { if (es.some(function (en) { return en.isIntersecting; })) { io.disconnect(); seen = true; go(at); } }, { threshold: 0.3 });
            io.observe(box);
        }
        var facts = $('[data-facts]'), nums = facts ? $$('[data-count]', facts) : [];
        if (facts && nums.length && !reduced && 'IntersectionObserver' in window) {
            nums.forEach(function (n) { n.textContent = '0'; });
            var fio = new IntersectionObserver(function (es) {
                if (!es.some(function (en) { return en.isIntersecting; })) { return; }
                fio.disconnect();
                var t0 = performance.now();
                (function run(t) {
                    var k = Math.min(1, (t - t0) / 1800), ease = 1 - Math.pow(1 - k, 3);
                    nums.forEach(function (n) { n.textContent = Math.round(ease * +n.getAttribute('data-count')); });
                    if (k < 1) { requestAnimationFrame(run); }
                })(t0);
            }, { threshold: 0.5 });
            fio.observe(facts);
        }
    }

    /* ------------------------------------------------------------------
       The invitation tilts toward the cursor, and its foil catches the light
       ------------------------------------------------------------------ */
    function setupInvite() {
        var stage = $('[data-invite]');
        if (!stage || !hasGsap || reduced) { return; }
        var card = $('[data-invite-card]', stage);
        var sec = stage.closest('section') || stage;
        var tilt = { rx: 6, ry: -12, sx: 60 };
        var paint = function () { card.style.setProperty('--rx', tilt.rx.toFixed(2) + 'deg'); card.style.setProperty('--ry', tilt.ry.toFixed(2) + 'deg'); card.style.setProperty('--sx', tilt.sx.toFixed(1) + '%'); };
        if (fine) {
            var rx = gsap.quickTo(tilt, 'rx', { duration: 1, ease: 'power3', onUpdate: paint });
            var ry = gsap.quickTo(tilt, 'ry', { duration: 1, ease: 'power3', onUpdate: paint });
            var sx = gsap.quickTo(tilt, 'sx', { duration: 1, ease: 'power3', onUpdate: paint });
            sec.addEventListener('pointermove', function (e) {
                var r = card.getBoundingClientRect();
                var px = clamp((e.clientX - r.left) / r.width, -0.5, 1.5), py = clamp((e.clientY - r.top) / r.height, -0.5, 1.5);
                rx((0.5 - py) * 14); ry((px - 0.5) * 20); sx(100 - px * 80);
            }, { passive: true });
            sec.addEventListener('mouseleave', function () { rx(6); ry(-12); sx(60); });
        } else {
            gsap.fromTo(tilt, { rx: 10, ry: -16, sx: 90 }, { rx: -4, ry: 10, sx: 10, ease: 'none', onUpdate: paint, scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
        }
        paint();
        gsap.from(card, { y: 80, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 88%', once: true } });
    }

    /* ------------------------------------------------------------------
       Miami's own hour
       ------------------------------------------------------------------ */
    function setupClocks() {
        var els = $$('[data-tz]');
        if (!els.length || !window.Intl) { return; }
        var fmts = {};
        function tick() {
            var now = new Date();
            els.forEach(function (el) {
                var tz = el.dataset.tz;
                try {
                    if (!fmts[tz]) { fmts[tz] = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }); }
                    el.textContent = fmts[tz].format(now);
                } catch (e) { el.textContent = ''; }
            });
        }
        tick();
        setInterval(tick, 15000);
    }

    /* ------------------------------------------------------------------
       The finale. An arch opens onto the night as the screen comes up. On a desktop the screen then
       holds: the words leave, and the film folds back into the name, as if LUXURI were cut through a
       black card with the night behind it. The camera starts inside the crossing of the X and draws
       back until the whole name rests where the footer has laid it out; the footer settles round it.
       The cut edges are gilded and brighten under the cursor, and the night moves a little behind them.
       ------------------------------------------------------------------ */
    function setupFinale() {
        var sec = $('[data-finale]');
        if (!sec) { return; }
        var sticky = $('[data-finale-sticky]', sec);
        var film = $('[data-finale-film]', sec), video = $('video', film), shade = $('[data-finale-shade]', sec);
        var copy = $('[data-finale-copy]', sec), end = $('[data-finale-end]', sec);
        var die = $('[data-finale-die]', sec), depth = $('[data-finale-depth]', sec), glint = $('[data-finale-glint]', sec), glintG = $('.finale__glint', sec);
        var markBox = $('[data-finale-mark]', sec), mark = $('svg', markBox);
        var parts = $$('.foot__info > *, .colophon, .foot__base', end);
        var FX = 44.7178, FY = 7.9764, LW = 104, LH = 16.71;   // the crossing of the X, and the name's box, in its own units

        // the arch, in both layouts: a doorway that widens to the whole screen as the screen comes up
        function arch(q) {
            var W = sticky.offsetWidth, H = film.offsetHeight, o = inOut(q);
            var x = lerp(W * 0.31, 0, o), t = lerp(H * 0.16, 0, o), r = lerp((W - 2 * W * 0.31) / 2, 0, o);
            film.style.clipPath = q >= 1 ? '' : 'inset(' + t.toFixed(1) + 'px ' + x.toFixed(1) + 'px 0px ' + x.toFixed(1) + 'px round ' + r.toFixed(1) + 'px ' + r.toFixed(1) + 'px 0 0)';
        }

        if (!pinned) {
            // stacked: the arch opens on the way in, and the name is drawn in gold once it is seen
            if (hasGsap && !reduced) {
                arch(0);
                ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'top 15%', scrub: true, onUpdate: function (s) { arch(s.progress); } });
            }
            $$('path', mark).forEach(function (p) { p.setAttribute('pathLength', '1'); });
            // a hairline at any width: the stroke is in the name's own units
            markBox.style.setProperty('--sw', (1.2 * LW / Math.max(1, mark.getBoundingClientRect().width)).toFixed(4));
            if (reduced || !('IntersectionObserver' in window)) { markBox.classList.add('in'); return; }
            var mio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { mio.disconnect(); markBox.classList.add('in'); } }, { threshold: 0.4 });
            mio.observe(markBox);
            return;
        }

        var W = 0, H = 0, k0 = 1, k1 = 1, L1 = 0, T1 = 0, p = 0, z = 0, k = 1, ox = 0, oy = 0;
        var light = { x: 0.62, y: 0.5, a: 0, fx: 0, fy: 0 };   // the cursor, as a share of the screen; how lit the edge is; the film's drift

        function measure() {
            W = sticky.offsetWidth; H = sticky.offsetHeight;
            var s = sticky.getBoundingClientRect(), r = mark.getBoundingClientRect();
            k1 = Math.min(r.width / LW, r.height / LH);
            L1 = r.left - s.left + (r.width - LW * k1) / 2;
            T1 = r.top - s.top + (r.height - LH * k1) / 2;
            // close enough that the screen sits wholly inside the crossing of the X
            k0 = Math.max(W / 2 / 1.7, H / 2 / 2.38) * 1.04;
        }

        function paintLight() {
            video.style.setProperty('--fx', light.fx.toFixed(1) + 'px');
            video.style.setProperty('--fy', light.fy.toFixed(1) + 'px');
            if (!glint) { return; }
            var rest = z >= 0.98;   // the edge is lit only once the name has come to rest
            glintG.style.opacity = rest ? light.a.toFixed(3) : '0';
            if (!rest) { return; }
            glint.setAttribute('cx', ((light.x * W - ox) / k).toFixed(3));
            glint.setAttribute('cy', ((light.y * H - oy) / k).toFixed(3));
        }

        function render() {
            z = inOut(clamp((p - 0.16) / 0.6, 0, 1));
            k = k0 * Math.pow(k1 / k0, z);
            var cx = lerp(W / 2, L1 + FX * k1, z), cy = lerp(H / 2, T1 + FY * k1, z);   // where the crossing is on screen
            ox = cx - FX * k; oy = cy - FY * k;
            var vb = (-ox / k).toFixed(4) + ' ' + (-oy / k).toFixed(4) + ' ' + (W / k).toFixed(4) + ' ' + (H / k).toFixed(4);
            die.setAttribute('viewBox', vb);
            // the card's thickness shows only as the name comes to rest (its blur is too costly while it moves)
            var dp = smooth(0.86, 1, z);
            if (depth) {
                depth.style.visibility = dp > 0 ? 'visible' : 'hidden';
                depth.style.opacity = dp.toFixed(3);
                if (dp > 0) { depth.setAttribute('viewBox', vb); }
            }
            video.style.setProperty('--fz', lerp(1.04, 1.16, z).toFixed(4));

            var c = smooth(0.08, 0.2, p);
            copy.style.opacity = (1 - c).toFixed(3);
            copy.style.transform = c > 0 ? 'translate3d(0,' + (-c * 70).toFixed(1) + 'px,0)' : '';
            copy.style.visibility = c > 0.99 ? 'hidden' : '';
            shade.style.opacity = (1 - smooth(0.1, 0.42, p)).toFixed(3);

            parts.forEach(function (el, i) {
                var f = smooth(0.74 + i * 0.025, 0.9 + i * 0.025, p);
                el.style.opacity = f.toFixed(3);
                el.style.transform = f < 1 ? 'translate3d(0,' + ((1 - f) * 28).toFixed(1) + 'px,0)' : '';
            });
            end.classList.toggle('is-on', p > 0.86);
            paintLight();
        }

        function update() {
            var r = sec.getBoundingClientRect();
            if (r.bottom < 0 || r.top > VH) { return; }
            arch(clamp(1 - r.top / VH, 0, 1));
            p = clamp(-r.top / Math.max(1, sec.offsetHeight - VH), 0, 1);
            render();
        }

        // the light: the cursor's, on a desktop; it eases in once the name has come to rest
        if (hasGsap) {
            var to = function (key, d) { return gsap.quickTo(light, key, { duration: d, ease: 'power3', onUpdate: paintLight }); };
            var lx = to('x', 1.1), ly = to('y', 1.1), la = to('a', 0.8), fx = to('fx', 1.6), fy = to('fy', 1.6);
            sticky.addEventListener('pointermove', function (e) {
                var s = sticky.getBoundingClientRect();
                var mx = (e.clientX - s.left) / W, my = (e.clientY - s.top) / H;
                lx(mx); ly(my); la(z >= 0.98 ? 1 : 0);
                fx((0.5 - mx) * 26); fy((0.5 - my) * 16);
            }, { passive: true });
            sticky.addEventListener('pointerleave', function () { la(0); fx(0); fy(0); });
        }

        // the footer's links can be reached by the keyboard before the name has settled: go to the end
        end.addEventListener('focusin', function () {
            if (p < 0.95) { scrollToY(sec.getBoundingClientRect().top + window.scrollY + sec.offsetHeight - VH, 0.9); }
        });

        measure();
        update();
        onScroll(update);
        var rt = 0;   // after the page has taken its new height (see init)
        window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { measure(); update(); }, 260); });
        window.addEventListener('load', function () { measure(); update(); });
        if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { measure(); update(); }); }
    }

    /* ------------------------------------------------------------------
       The film player
       ------------------------------------------------------------------ */
    function setupFilm(stage) {
        var film = $('[data-film]');
        if (!film) { return; }
        var video = $('[data-film-video]', film);
        var title = $('[data-film-title]', film);
        var btnPause = $('[data-film-pause]', film);
        var btnClose = $('[data-film-close]', film);
        var bar = $('[data-film-progress]', film);
        var open = false, last = null, wakeT = 0;
        function wake() { film.classList.add('is-awake'); clearTimeout(wakeT); wakeT = setTimeout(function () { film.classList.remove('is-awake'); }, 2200); }
        function show(src, poster, t) {
            if (open || !src) { return; }
            open = true; state.modal = true; last = document.activeElement;
            if (t) { title.textContent = t; }
            video.poster = poster || '';
            video.src = src;
            video.muted = true;
            film.classList.add('is-open'); film.setAttribute('aria-hidden', 'false');
            lockScroll(true);
            if (stage) { stage.pause(); }
            var p = video.play(); if (p && p.catch) { p.catch(function () {}); }
            wake();
            btnClose.focus();
        }
        function hide() {
            if (!open) { return; }
            open = false; state.modal = false;
            film.classList.remove('is-open', 'is-playing'); film.setAttribute('aria-hidden', 'true');
            video.pause();
            setTimeout(function () { video.removeAttribute('src'); video.load(); bar.style.transform = 'scaleX(0)'; }, 600);
            lockScroll(false);
            if (stage) { stage.resume(); }
            if (last && last.focus) { last.focus(); }
        }
        $$('[data-film-open]').forEach(function (b) {
            b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(b.dataset.filmSrc, b.dataset.filmPoster, b.dataset.filmTitle); });
        });
        btnClose.addEventListener('click', hide);
        btnPause.addEventListener('click', function () { if (video.paused) { video.play().catch(function () {}); } else { video.pause(); } });
        video.addEventListener('play', function () { film.classList.add('is-playing'); btnPause.textContent = 'Pause'; });
        video.addEventListener('pause', function () { film.classList.remove('is-playing'); btnPause.textContent = 'Play'; });
        video.addEventListener('timeupdate', function () { if (video.duration) { bar.style.transform = 'scaleX(' + (video.currentTime / video.duration) + ')'; } });
        video.addEventListener('ended', hide);
        film.addEventListener('mousemove', wake);
        film.addEventListener('click', function (e) { if (e.target === video) { if (video.paused) { video.play().catch(function () {}); } else { video.pause(); } } });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) { hide(); } });
    }

    /* ------------------------------------------------------------------
       The plate lifts once the page can be seen
       ------------------------------------------------------------------ */
    function runPlate(done) {
        var plate = $('[data-plate]'), bar = $('[data-plate-bar]');
        var target = 0.1;
        function fill(v) { target = Math.max(target, v); if (bar) { bar.style.transform = 'scaleX(' + target.toFixed(3) + ')'; } }
        fill(0.15);
        var fonts = document.fonts && document.fonts.ready ? document.fonts.ready.then(function () { fill(0.45); }) : Promise.resolve();
        var poster = new Promise(function (res) {
            var v = $('.mxhero video');
            if (!v) { res(); return; }
            if (v.readyState >= 2) { res(); return; }
            v.addEventListener('loadeddata', res, { once: true });
            setTimeout(res, 3500);
        }).then(function () { fill(0.8); });
        var minTime = new Promise(function (res) { setTimeout(res, reduced ? 0 : 1100); });
        var finished = false;
        function finish() {
            if (finished) { return; }
            finished = true;
            fill(1);
            setTimeout(function () {
                html.classList.add('is-ready');
                body.classList.remove('is-loading');
                done();
                setTimeout(function () { if (!cut.busy) { html.classList.add('is-gone'); } }, reduced ? 0 : 2300);
            }, reduced ? 0 : 280);
        }
        Promise.all([fonts, poster, minTime]).then(finish, finish);
        setTimeout(finish, 6000);
    }

    /* ------------------------------------------------------------------
       Start
       ------------------------------------------------------------------ */
    function init() {
        safe('reveals', setupReveals);
        safe('films', setupFilms);
        safe('parallax', setupParallax);
        safe('louvres', setupLouvres);
        safe('drawer', setupDrawer);
        safe('anchors', setupAnchors);
        safe('current link', setupCurrentLink);
        safe('rail', setupRail);
        safe('clocks', setupClocks);
        safe('nightfall', setupNightfall);   // its pin comes first on the page, so it is made first
        var coverEl = $('[data-cover]');
        var cover = coverEl ? safe('cover', function () { return new Cover(coverEl); }) : null;
        var stageEl = $('[data-stage]');
        var stage = (pinned && stageEl && cover) ? safe('stage', function () { return new Stage(stageEl, cover); }) : null;
        safe('film', function () { setupFilm(stage); });
        safe('statement', setupStatement);
        safe('fleet', setupFleet);
        safe('concierge', setupConcierge);
        safe('ledger', setupLedger);
        safe('invite', setupInvite);
        safe('finale', setupFinale);
        window.Luxuri = { lenis: lenis, pinned: pinned, reduced: reduced, fine: fine, onScroll: onScroll, scrollToY: scrollToY, safe: safe, playVideo: playVideo, pauseVideo: pauseVideo, loadVideo: loadVideo, shutter: shutter, state: state, anchorY: null };

        var resizeT = 0, VW = window.innerWidth;
        window.addEventListener('resize', function () {
            clearTimeout(resizeT);
            resizeT = setTimeout(function () {
                var w = window.innerWidth;
                if (Math.abs(w - VW) < 2 && !fine) { return; }
                // crossing the desktop line changes the whole layout: rebuild cleanly
                if (fine && !reduced && hasGsap && ((w >= 1024) !== pinned)) { location.reload(); return; }
                VW = w; VH = window.innerHeight;
                if (cover) { cover.layout(); }
                if (stage) { stage.resize(); }
                if (hasGsap) { ScrollTrigger.refresh(); }
            }, 200);
        });
        document.addEventListener('visibilitychange', function () {
            if (!stage) { return; }
            if (document.hidden) { stage.pause(); } else if (!state.modal) { stage.resume(); }
        });
        window.addEventListener('load', function () { if (hasGsap) { ScrollTrigger.refresh(); } });

        lockScroll(true);
        runPlate(function () {
            if (state.started) { return; }
            state.started = true;
            lockScroll(false);
            if (hasGsap) { ScrollTrigger.refresh(); }
            if (location.hash) {
                var el = document.getElementById(location.hash.slice(1));
                var own = el && window.Luxuri.anchorY ? window.Luxuri.anchorY(el) : null;
                if (el) { scrollToY(own !== null ? own : el.getBoundingClientRect().top + window.scrollY - (location.hash === '#after-dark' ? 0 : barHeight()), 0.01); }
            }
        });
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();

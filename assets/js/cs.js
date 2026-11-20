/* Version 42: the concierge.
   1. one tall picture opens from a thin line in the middle
   2. it splits: thin slivers of other pictures fan out either side of it
   3. the slivers widen into pictures, each named (number, service, line)
   4. the row then scrolls sideways through all fifteen */
(function () {
    'use strict';
    var sec = document.querySelector('[data-cs]');
    if (!sec || !window.gsap || !window.ScrollTrigger) { return; }
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    var row = sec.querySelector('[data-cs-row]');
    var cards = [].slice.call(sec.querySelectorAll('[data-cs-card]'));
    var caps = [].slice.call(sec.querySelectorAll('[data-cs-cap]'));
    var mid = cards.filter(function (c) { return c.classList.contains('cs__card--mid'); })[0];
    var midIx = cards.indexOf(mid);
    var sides = cards.filter(function (c) { return c !== mid; });
    var midMedia = [].slice.call(mid.querySelectorAll('img, video'));
    var tl, st = { shift: 0 };
    // the tall picture is kept in the middle of the screen while the others grow; the row slides by "shift" on top of that
    function place() {
        var cx = mid.offsetLeft + mid.offsetWidth / 2;
        gsap.set(row, { x: window.innerWidth / 2 - cx + st.shift });
    }
    function build() {
        if (tl) { if (tl.scrollTrigger) { tl.scrollTrigger.kill(); } tl.kill(); gsap.set(cards.concat(caps, [row]), { clearProps: 'all' }); }
        st.shift = 0;
        var W = window.innerWidth, vw = W / 100, small = W <= 860;
        var full = small ? 56 * vw : 24 * vw;
        var midW = small ? 44 * vw : 17 * vw;
        var sliver = small ? 2.4 * vw : 1.15 * vw;
        var gap = small ? 0.8 * vw : 0.55 * vw;
        var edge = small ? 4 * vw : 2 * vw;
        var n = cards.length;
        var drift = small ? -8 * vw : -9 * vw;
        // where the row must sit at the very end: last picture's right edge on the screen edge
        var rowW = n * full + (n - 1) * gap;
        var endX = W - edge - rowW;
        var centerFix = W / 2 - (midIx * (full + gap) + full / 2);
        var endShift = endX - centerFix;
        gsap.set(mid, { width: midW, clipPath: 'inset(47% 0% 47% 0%)' });
        gsap.set(midMedia, { width: Math.max(midW, small ? 44 * vw : 20 * vw), scale: 1.18 });
        gsap.set(sides, { width: 0 });
        gsap.set(row, { gap: 0 });
        gsap.set(caps, { opacity: 0, y: 14 });
        tl = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onUpdate: place, scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.7 } });
        tl.to({}, { duration: 0.6 });
        tl.to(mid, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5 }, 0.6);
        tl.to(midMedia, { scale: 1, duration: 1.8, ease: 'power2.out' }, 0.6);
        var t1 = 2.5;
        tl.to(row, { gap: gap, duration: 0.6 }, t1);
        sides.forEach(function (c) {
            var d = +c.getAttribute('data-d');
            tl.to(c, { width: sliver, duration: 1.0, ease: 'power3.out' }, t1 + (d - 1) * 0.05);
        });
        var t2 = t1 + 1.9;
        tl.to(sides, { width: full, duration: 2.6, ease: 'power3.inOut', stagger: { each: 0.03, from: 'center' } }, t2);
        tl.to(mid, { width: full, duration: 2.6 }, t2);
        tl.to(midMedia, { width: full, duration: 2.6 }, t2);
        tl.to(st, { shift: drift, duration: 2.6 }, t2);
        tl.to(caps, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out', stagger: { each: 0.05, from: 'center' } }, t2 + 2.0);
        var tb = t2 + 3.4;                                                          // settle back so the first pictures (caviar, mixologist) are seen
        var startShift = edge - centerFix;
        tl.to(st, { shift: startShift, duration: 2.2, ease: 'power2.inOut' }, tb);
        var t3 = tb + 2.6;                                                          // then sideways through all fifteen
        tl.to(st, { shift: endShift, duration: 10, ease: 'none' }, t3);
        tl.to({}, { duration: 1.2 });
        place();
    }
    build();
    /* version 61: hover a card and its film plays over the picture; leave it and the film stops */
    if (window.matchMedia && matchMedia('(hover: hover)').matches) {
        cards.forEach(function (c) {
            var v = c.querySelector('video[data-hv]');
            if (!v) { return; }
            c.addEventListener('pointerenter', function () {
                if (!v.getAttribute('src')) { v.src = v.getAttribute('data-hv'); }
                var p = v.play(); if (p && p.catch) { p.catch(function () {}); }
                c.classList.add('is-hv');
            });
            c.addEventListener('pointerleave', function () {
                c.classList.remove('is-hv');
                setTimeout(function () { if (!c.classList.contains('is-hv')) { v.pause(); } }, 520);
            });
        });
    }
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); ScrollTrigger.refresh(); }, 250); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();

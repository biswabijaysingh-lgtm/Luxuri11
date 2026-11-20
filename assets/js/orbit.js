/* Version 25: the concierge wall, in the order of the reference (gregorcollienne.com):
   1. pictures arrive one at a time and pile up in the middle of the screen,
   2. the pile spreads out to every side, each picture to its own place,
   3. the heading blurs into focus in the middle,
   4. the whole wall keeps rising past it, new pictures coming up from below, each column at its own pace.
   All driven by scroll position, so it also runs backwards. */
(function () {
    'use strict';
    var secs = [].slice.call(document.querySelectorAll('[data-orbit]'));
    if (!secs.length) { return; }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var P_STACK_END = 0.13;   // the last picture has landed on the pile
    var P_OPEN = [0.16, 0.34]; // the pile spreads
    var P_HEAD = [0.32, 0.43]; // the heading comes into focus
    var P_DRIFT = 0.52;        // the wall starts to rise
    var DRIFT = 330;           // how far the slowest picture rises, in vh

    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function ease(x) { return x * x * (3 - 2 * x); }
    function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

    secs.forEach(function (sec) {
        var head = sec.querySelector('[data-orbit-head]');
        var its = [].slice.call(sec.querySelectorAll('[data-orbit-it]')).map(function (el) {
            return {
                el: el, cap: el.querySelector('.orb__cap'),
                i: +el.dataset.i, a: el.dataset.tier === 'a',
                x: +el.dataset.x, y: +el.dataset.y, s: +el.dataset.s,
                ox: +el.dataset.ox, oy: +el.dataset.oy, rot: +el.dataset.rot,
                w: 0, h: 0
            };
        });
        var nA = its.filter(function (o) { return o.a; }).length;
        var title = sec.querySelector('.orb__title');
        var W = 0, H = 0, mobile = false, tw = 0, th = 0;

        function measure() {
            W = window.innerWidth; H = window.innerHeight; mobile = W <= 820;
            its.forEach(function (o) { o.w = o.el.offsetWidth; o.h = o.el.offsetHeight; });
            // the box the words fill, with a margin
            tw = (title ? title.offsetWidth : W * 0.6) + 20; th = (title ? title.offsetHeight : H * 0.3) + 40;
        }

        function frame() {
            var r = sec.getBoundingClientRect(), total = r.height - H;
            if (r.bottom < -H || r.top > H * 2) { return; }
            var p = total > 0 ? clamp(-r.top / total) : 0;
            if (reduce) { p = 0.5; }
            var open = ease(clamp((p - P_OPEN[0]) / (P_OPEN[1] - P_OPEN[0])));
            var drift = clamp((p - P_DRIFT) / (1 - P_DRIFT));
            var hAmt = ease(clamp((p - P_HEAD[0]) / (P_HEAD[1] - P_HEAD[0])));
            var bx0 = (W - tw) / 2, bx1 = (W + tw) / 2, by0 = (H - th) / 2, by1 = (H + th) / 2;

            its.forEach(function (o) {
                var fx = o.x * (mobile ? 0.78 : 1) * W / 100;
                var fy = o.y * H / 100;
                var x, y, sc = 1, rot = 0, op = 1, z = '';
                if (o.a) {
                    // arrival on the pile: one after another, each a little off-centre from the last
                    var at = (o.i / nA) * P_STACK_END;
                    var land = clamp((p - at) / 0.02);
                    var cx = (W - o.w) / 2 + o.ox, cy = (H - o.h) / 2 + o.oy;
                    x = cx + (fx - cx) * open;
                    y = cy + (fy - cy) * open;
                    sc = (0.78 + 0.22 * open) * (0.92 + 0.08 * easeOut(land)) ;
                    rot = o.rot * (1 - open);
                    op = easeOut(land);
                    if (open < 0.02) { z = String(20 + o.i); }
                    y -= drift * DRIFT * o.s * H / 100;
                } else {
                    x = fx; y = fy - drift * DRIFT * o.s * H / 100;
                }
                o.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
                o.el.style.opacity = op.toFixed(3);
                o.el.style.zIndex = z;
                if (o.cap) { o.cap.style.opacity = o.a ? clamp((open - 0.7) / 0.3).toFixed(3) : '1'; }
            });

            if (head) {
                var h = ease(clamp((p - P_HEAD[0]) / (P_HEAD[1] - P_HEAD[0])));
                var out = 1 - clamp((p - 0.94) / 0.06);
                head.style.opacity = (h * out).toFixed(3);
                head.style.filter = h < 1 ? 'blur(' + ((1 - h) * 16).toFixed(1) + 'px)' : 'none';
                head.style.transform = 'scale(' + (1.04 - 0.04 * h).toFixed(4) + ')';
            }
        }

        var tick = false;
        function on() { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; frame(); }); } }
        window.addEventListener('scroll', on, { passive: true });
        window.addEventListener('resize', function () { measure(); on(); });
        measure();
        frame();
        window.addEventListener('load', function () { measure(); frame(); });
    });
})();

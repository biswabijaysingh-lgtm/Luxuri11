/* Version 31: cars, yachts and jets. Scroll moves through three films; the line under each name fills as you go. */
(function () {
    'use strict';
    var sec = document.querySelector('[data-rig]');
    if (!sec || !window.gsap || !window.ScrollTrigger) { return; }
    var slides = [].slice.call(sec.querySelectorAll('[data-rig-slide]'));
    var txts = [].slice.call(sec.querySelectorAll('[data-rig-txt]'));
    var cols = [].slice.call(sec.querySelectorAll('[data-rig-col]'));
    var fills = [].slice.call(sec.querySelectorAll('[data-rig-fill]'));
    var films = slides.map(function (s) { return s.querySelector('video'); });
    var N = slides.length, cur = -1;
    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function play(f) { if (!f) { return; } var pr = f.play(); if (pr && pr.catch) { pr.catch(function () {}); } }
    function show(i) {
        if (i === cur) { return; }
        cur = i;
        slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
        txts.forEach(function (t, k) { t.classList.toggle('is-on', k === i); });
        cols.forEach(function (c, k) { c.classList.toggle('is-on', k === i); });
        films.forEach(function (f, k) {
            if (!f) { return; }
            if (k === i) { play(f); }
            else { setTimeout(function () { if (cur !== k) { f.pause(); } }, 1100); }
        });
    }
    function update(p) {
        var i = Math.min(N - 1, Math.floor(p * N));
        show(i);
        fills.forEach(function (f, k) { f.style.transform = 'scaleX(' + clamp(p * N - k).toFixed(3) + ')'; });
    }
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom', onUpdate: function (s) { update(s.progress); } });
    update(0);
    // wake the films when the section is near, and stop them when it is far
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
            es.forEach(function (e) {
                if (e.isIntersecting) {
                    films.forEach(function (f) { if (f) { f.preload = 'auto'; } });
                    if (cur >= 0) { play(films[cur]); }
                } else { films.forEach(function (f) { if (f) { f.pause(); } }); }
            });
        }, { rootMargin: '30% 0px' }).observe(sec);
    }
    // click a name: scroll to its part
    [].slice.call(sec.querySelectorAll('[data-rig-go]')).forEach(function (b) {
        b.addEventListener('click', function () {
            var k = +b.getAttribute('data-rig-go');
            var top = sec.getBoundingClientRect().top + window.scrollY;
            var len = sec.offsetHeight - window.innerHeight;
            window.scrollTo({ top: top + len * ((k + 0.5) / N), behavior: 'smooth' });
        });
    });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();

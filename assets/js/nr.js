/* Version 38: the whole night as one film. The seven clips play one after another; play or pause, or jump to an hour. */
(function () {
    'use strict';
    var sec = document.querySelector('[data-nr]');
    if (!sec) { return; }
    var films = [].slice.call(sec.querySelectorAll('[data-nr-film]'));
    var caps = [].slice.call(sec.querySelectorAll('[data-nr-cap]'));
    var ticks = [].slice.call(sec.querySelectorAll('[data-nr-tick]'));
    var fills = [].slice.call(sec.querySelectorAll('[data-nr-fill]'));
    var player = sec.querySelector('[data-nr-player]');
    var btn = sec.querySelector('[data-nr-play]');
    var N = films.length, cur = 0, wantPlay = true, seen = false;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { wantPlay = false; }

    function label() {
        btn.setAttribute('aria-pressed', wantPlay ? 'true' : 'false');
        btn.setAttribute('aria-label', wantPlay ? 'Pause the film' : 'Play the film');
    }
    function play(f) { var p = f.play(); if (p && p.catch) { p.catch(function () {}); } }
    function show(i) {
        if (i === cur && films[i].classList.contains('is-on')) { return; }
        var prev = cur; cur = i;
        films.forEach(function (f, k) { f.classList.toggle('is-on', k === i); });
        caps.forEach(function (c, k) { c.classList.toggle('is-on', k === i); });
        ticks.forEach(function (t, k) { t.classList.toggle('is-on', k === i); });
        fills.forEach(function (x, k) { x.style.transform = 'scaleX(' + (k < i ? 1 : 0) + ')'; });
        try { films[i].currentTime = 0; } catch (e) {}
        if (wantPlay && seen) { play(films[i]); }
        if (prev !== i) { setTimeout(function () { if (cur !== prev) { films[prev].pause(); } }, 1100); }
    }
    function next() { show((cur + 1) % N); }
    films.forEach(function (f, i) { f.addEventListener('ended', function () { if (i === cur) { next(); } }); });
    // the line under the hour that is playing fills as the clip runs
    (function loop() {
        var f = films[cur], d = f.duration;
        if (d && isFinite(d) && fills[cur]) { fills[cur].style.transform = 'scaleX(' + Math.min(1, f.currentTime / d).toFixed(3) + ')'; }
        requestAnimationFrame(loop);
    })();

    function setPlay(on) {
        wantPlay = on; label();
        if (on) { if (seen) { play(films[cur]); } } else { films[cur].pause(); }
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); setPlay(!wantPlay); });
    player.addEventListener('click', function (e) { if (e.target.closest('.nr__bar')) { return; } setPlay(!wantPlay); });
    [].slice.call(sec.querySelectorAll('[data-nr-go]')).forEach(function (b) {
        b.addEventListener('click', function (e) {
            e.stopPropagation();
            var k = +b.getAttribute('data-nr-go');
            show(k); wantPlay = true; label(); if (seen) { play(films[cur]); }
        });
    });

    // the frame slides up over the words, and the picture inside moves slower than the page, settling as it fills the screen
    if (window.gsap && window.ScrollTrigger && !reduce) {
        var wrap = sec.querySelector('.nr__films');
        gsap.fromTo(wrap, { yPercent: -9, scale: 1.16 }, { yPercent: 7, scale: 1, ease: 'none', scrollTrigger: { trigger: player, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
        window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    }
    // plays while it is on the screen, rests when it is not
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
            es.forEach(function (e) {
                seen = e.isIntersecting;
                if (seen) {
                    films.forEach(function (f) { if (f.preload !== 'auto') { f.preload = 'auto'; } });
                    if (wantPlay) { play(films[cur]); }
                } else { films[cur].pause(); }
            });
        }, { threshold: 0.35 }).observe(player);
    } else { seen = true; if (wantPlay) { play(films[0]); } }
    label();
})();

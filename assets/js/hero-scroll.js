/* Hero, scrolled (version 2): the stage holds the screen while the page scrolls through the hero.
   Act one: scrolling pans the world up from the sky to the villa (the film waits on its first, dark frame).
   Act two: as the villa fills the screen the film plays in real time, so the lights come on by
   themselves as in the original: windows, the pool, the lanterns on the deck. Scrolling back up to the
   sky puts the film back to the dark frame. Without GSAP or with reduced motion nothing here runs
   and the film just plays. */
(function () {
    'use strict';
    var hero = document.querySelector('.mxhero');
    var world = hero && hero.querySelector('[data-hx-world]');
    var film = hero && hero.querySelector('[data-hx-film]');
    var band = hero && hero.querySelector('.mxband');
    if (!hero || !world || !film || !window.gsap || !window.ScrollTrigger) { return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    gsap.registerPlugin(ScrollTrigger);

    hero.classList.add('hx--live');
    film.removeAttribute('loop');
    film.removeAttribute('autoplay');
    var wantPlay = false;
    function rewind() { hero.classList.remove('hx-word'); try { film.pause(); film.currentTime = 0; } catch (e) { /* ignore */ } }
    function start() {
        if (wantPlay) { return; }
        wantPlay = true;
        try { film.currentTime = 0; } catch (e) { /* ignore */ }
        var pr = film.play();
        if (pr && pr.catch) { pr.catch(function () {}); }
    }
    function stop() {
        if (!wantPlay) { return; }
        wantPlay = false;
        rewind();
    }
    // the streamed film starts by itself in the markup: hold it on the dark first frame until it is wanted
    film.pause();
    film.addEventListener('play', function () { if (!wantPlay) { film.pause(); } });
    // the name rises slowly out of the dusk behind the villa once the scene is set (the windows, the pool and
    // the lanterns are lit, a little over half way through the film), so it is arriving as the film ends
    var WORD_AT = 0.1;   // a tenth of the way in: under a second, so the name is rising through the first 3 to 4 seconds
    function maybeName() { if (wantPlay && film.duration && film.currentTime >= film.duration * WORD_AT) { hero.classList.add('hx-word'); } }
    film.addEventListener('timeupdate', maybeName);
    film.addEventListener('ended', maybeName);

    // the whole file is fetched once and played from memory, so it can always be rewound
    // (a server without byte ranges cannot seek a streamed film): 3 MB, and the poster shows meanwhile
    if (window.fetch && window.URL && URL.createObjectURL) {
        fetch(film.getAttribute('src')).then(function (r) { return r.blob(); }).then(function (b) {
            var was = wantPlay;
            film.src = URL.createObjectURL(b);
            film.load();
            if (was) { var pr = film.play(); if (pr && pr.catch) { pr.catch(function () {}); } } else { film.pause(); }
        }).catch(function () { /* keep the streamed film */ });
    }

    var PAN = 0.5;                        // share of the hero's scroll spent panning to the villa
    var skyPx = 0;
    function measure() { skyPx = world.firstElementChild.offsetHeight; }
    measure();

    ScrollTrigger.create({
        trigger: hero, start: 'top top', end: 'bottom bottom', invalidateOnRefresh: true,
        onRefresh: measure,
        onUpdate: function (self) {
            var p = Math.min(1, self.progress / PAN);
            var e = p * p * (3 - 2 * p);                       // an eased pan: settles at the villa
            world.style.transform = 'translate3d(0,' + (-skyPx * e).toFixed(1) + 'px,0)';
            if (p >= 0.9) { start(); } else if (p < 0.55) { stop(); }
            // 0 while the band rests mid-sky, 1 once it has risen to the top
            var rise = Math.max(1, window.innerHeight / 2 - 26);
            if (band) { band.style.setProperty('--dock', Math.min(1, window.scrollY / rise).toFixed(3)); }
        }
    });
    window.addEventListener('load', function () { measure(); ScrollTrigger.refresh(); });
})();

/* Version 23: chapters (scroll progress -> CSS variables) and the sound switch. */
(function () {
    'use strict';
    var chs = [].slice.call(document.querySelectorAll('[data-ch]'));
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function ease(x) { return x * x * (3 - 2 * x); }
    function frame() {
        var vh = window.innerHeight;
        chs.forEach(function (ch) {
            var r = ch.getBoundingClientRect(), total = r.height - vh;
            if (r.bottom < -50 || r.top > vh + 50) { return; }
            var p = total > 0 ? clamp(-r.top / total) : 0;
            // words: arrive over the first third, hold, leave over the last tenth
            var t = ease(clamp((p - 0.08) / 0.28)) * (1 - ease(clamp((p - 0.9) / 0.1)));
            ch.style.setProperty('--p', reduce ? 1 : p.toFixed(4));
            ch.style.setProperty('--t', reduce ? 1 : t.toFixed(4));
        });
    }
    var ticking = false;
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; frame(); }); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();

    /* Sound: slow, quiet, off by default. With a track file set in <html data-ambient="...">, that plays;
       otherwise a soft pad is made live (a slow minor ninth chord, filtered and echoing), so there is nothing to license. */
    var src = document.documentElement.getAttribute('data-ambient');
    var btn = document.querySelector('[data-snd]');
    if (!btn) { return; }
    var audio = null, fade = null, TARGET = 0.32;
    var ctx = null, master = null;

    function buildPad() {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { return false; }
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0;
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.4;
        var lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.045; lfoG.gain.value = 260;
        lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
        var dl = ctx.createDelay(1.5); dl.delayTime.value = 0.62;
        var fb = ctx.createGain(); fb.gain.value = 0.42;
        var wet = ctx.createGain(); wet.gain.value = 0.5;
        lp.connect(master); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(master);
        master.connect(ctx.destination);
        // D minor ninth, spread low to high
        [73.42, 110, 146.83, 174.61, 261.63, 329.63].forEach(function (f, i) {
            [-4, 4].forEach(function (det) {
                var o = ctx.createOscillator(), g = ctx.createGain();
                o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = det;
                g.gain.value = i < 2 ? 0.16 : 0.05;
                var vl = ctx.createOscillator(), vg = ctx.createGain();
                vl.frequency.value = 0.03 + i * 0.011; vg.gain.value = g.gain.value * 0.6;
                vl.connect(vg); vg.connect(g.gain); vl.start();
                o.connect(g); g.connect(lp); o.start();
            });
        });
        return true;
    }
    function level() { return audio ? audio.volume : master.gain.value; }
    function setLevel(v) { if (audio) { audio.volume = v; } else { master.gain.value = v; } }
    function ramp(to, done) {
        if (fade) { clearInterval(fade); }
        fade = setInterval(function () {
            var v = level(), d = to - v;
            if (Math.abs(d) < 0.02) { setLevel(to); clearInterval(fade); fade = null; if (done) { done(); } return; }
            setLevel(Math.max(0, Math.min(1, v + (d > 0 ? 0.02 : -0.03))));
        }, 60);
    }
    function on() {
        if (src && !audio) { audio = new Audio(src); audio.loop = true; audio.volume = 0; }
        if (audio) { var p = audio.play(); if (p && p.catch) { p.catch(function () {}); } }
        else { if (!ctx && !buildPad()) { return; } if (ctx.resume) { ctx.resume(); } }
        ramp(TARGET);
        btn.setAttribute('aria-pressed', 'true');
    }
    function off() {
        ramp(0, function () { if (audio) { audio.pause(); } else if (ctx && ctx.suspend) { ctx.suspend(); } });
        btn.setAttribute('aria-pressed', 'false');
    }
    btn.addEventListener('click', function () { btn.getAttribute('aria-pressed') === 'true' ? off() : on(); });
})();

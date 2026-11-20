/* Version 46: the line types itself in, letter by letter, each letter fading up as the next begins (after the reference film). Plays when the line comes into view; no scroll needed. */
(function () {
    'use strict';
    var el = document.querySelector('[data-hand]');
    if (!el || !window.gsap) { return; }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = '';
    var chars = [];
    text.split(' ').forEach(function (w, wi) {
        var word = document.createElement('span');
        word.setAttribute('aria-hidden', 'true');
        word.style.cssText = 'display:inline-block;white-space:nowrap';
        var it = /^(slows|down|stay\.?)$/i.test(w);   // a few words lean into italic, as in the reference
        w.split('').forEach(function (c) {
            var s = document.createElement('span');
            s.textContent = c; s.style.cssText = 'display:inline-block' + (it ? ';font-style:italic' : '');
            word.appendChild(s); chars.push(s);
        });
        el.appendChild(word);
        el.appendChild(document.createTextNode(' '));
    });
    gsap.set(chars, { opacity: 0 });
    var tl = null;
    function write() {
        if (tl) { tl.kill(); }
        gsap.set(chars, { opacity: 0 });
        tl = gsap.timeline({ delay: 0.3 });
        // each letter fades up while the next two are already arriving, so a soft edge runs left to right
        tl.to(chars, { opacity: 1, duration: 0.2, ease: 'none', stagger: 0.055 });
    }
    function wipe() { if (tl) { tl.kill(); } gsap.set(chars, { opacity: 0 }); }
    // the second film waits under the first, which lifts off it like a curtain: the line must only start once the curtain
    // has gone, or it would be written where nobody can see it
    var hero = document.querySelector('.mxhero');
    var live = false;
    function check() {
        var r = hero.getBoundingClientRect();
        var clear = r.bottom < window.innerHeight * 0.12;       // the first film has lifted away
        var back = r.bottom > window.innerHeight * 0.55;        // it has come back down over the line
        if (clear && !live) { live = true; write(); }
        else if (back && live) { live = false; wipe(); }
    }
    if (hero) {
        var tick = false;
        window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; check(); }); } }, { passive: true });
        check();
    } else { gsap.set(chars, { opacity: 1 }); }
})();

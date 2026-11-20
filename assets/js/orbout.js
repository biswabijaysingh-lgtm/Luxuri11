/* Version 43: the line under "Whatever your experience needs" stands large in the middle of the screen for one scroll;
   its words rise in one by one, then the number appears, then the page moves on. */
(function () {
    'use strict';
    var sec = document.querySelector('[data-orbout]');
    if (!sec || !window.gsap || !window.ScrollTrigger) { return; }
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    var p = sec.querySelector('.orbout__p'), line = sec.querySelector('.orbout__line'), note = sec.querySelector('.orbout__note');
    var text = p.textContent.trim();
    p.setAttribute('aria-label', text);
    p.innerHTML = text.split(/\s+/).map(function (w) { return '<span class="orbout__w" aria-hidden="true">' + w + '</span>'; }).join(' ');
    var words = p.querySelectorAll('.orbout__w');
    gsap.set(words, { opacity: 0.1, y: 34 });
    gsap.set([line, note], { opacity: 0, y: 18 });
    var tl = gsap.timeline({ defaults: { ease: 'power2.out' }, scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.7 } });
    tl.to(words, { opacity: 1, y: 0, duration: 1, stagger: 0.12 }, 0);
    tl.to(line, { opacity: 1, y: 0, duration: 1 }, '>-0.2');
    tl.to(note, { opacity: 1, y: 0, duration: 1 }, '>-0.5');
    tl.to({}, { duration: 2.2 });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();

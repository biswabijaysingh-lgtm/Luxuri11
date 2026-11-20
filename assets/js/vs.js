/* Version 33: the villa. One timeline, driven by the scroll:
   1. the first card rises out as the second one comes up from below;
   2. the words panel slides in from the right and its lines rise out of their masks;
   3. a wine panel sweeps in from the right over everything, and the framed pictures inside it glide across;
   then, after the pin, the closing line rises and its pictures open. */
(function () {
    'use strict';
    if (!window.gsap || !window.ScrollTrigger) { return; }
    gsap.registerPlugin(ScrollTrigger);
    var sec = document.querySelector('[data-vs]');
    if (!sec) { return; }
    var cards = [].slice.call(sec.querySelectorAll('[data-vs-card]'));
    var text = sec.querySelector('[data-vs-text]');
    var lines = [].slice.call(sec.querySelectorAll('.vs__hl > span'));
    var para = sec.querySelector('.vs__p');
    var label = sec.querySelector('.vs__label');
    var stacked = function () { return window.matchMedia('(max-width: 860px)').matches; };

    // starting positions
    gsap.set(cards[1], { yPercent: 100 });
    gsap.set(text, { xPercent: 100 });
    gsap.set(lines, { yPercent: 110 });
    gsap.set([para, label], { opacity: 0, y: 24 });

    var tl = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true }
    });
    // 1. the cards swap: the first goes up, the second comes up behind it
    tl.to(cards[0], { yPercent: -100, duration: 2 }, 0.6);
    tl.fromTo(cards[0].querySelector('img, video'), { scale: 1 }, { scale: 1.2, duration: 2, ease: 'none' }, 0.6);
    tl.to(cards[1], { yPercent: 0, duration: 2 }, 0.6);
    tl.fromTo(cards[1].querySelector('img, video'), { scale: 1.25 }, { scale: 1, duration: 2, ease: 'none' }, 0.6);
    // 2. the words
    tl.to(text, { xPercent: 0, duration: 1.4, ease: 'power3.out' }, 2.6);
    tl.to(label, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 3.4);
    tl.to(lines, { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.22 }, 3.4);
    tl.to(para, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 4.4);
    tl.to({}, { duration: 1 }, 5.8);                // a short hold, then the closing line follows

    /* the closing line: letters rise out of their masks, the pictures open like blinds */
    var end = document.querySelector('[data-ve]');
    if (end) {
        var els = [].slice.call(end.querySelectorAll('.ve__line > span'));
        gsap.set(els, { yPercent: 110 });
        ScrollTrigger.create({
            trigger: end, start: 'top 70%', once: false,
            onEnter: function () { gsap.to(els, { yPercent: 0, duration: 1.1, ease: 'power3.out', stagger: 0.14 }); },
            onLeaveBack: function () { gsap.set(els, { yPercent: 110 }); }
        });
        [].slice.call(end.querySelectorAll('[data-ve-pic]')).forEach(function (f, i) {
            gsap.fromTo(f, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: f, start: 'top 88%', toggleActions: 'play none none reverse' } });
            gsap.fromTo(f.querySelector('img, video'), { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: f, start: 'top 88%', toggleActions: 'play none none reverse' } });
        });
    }
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();

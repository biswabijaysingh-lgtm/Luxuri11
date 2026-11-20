/* Arrival, a sideways journey (version 7): while the section holds the screen, scrolling moves the track
   sideways. The title stands stacked over the villa; then each line of the paragraph arrives with its own
   picture. Pictures drift a little inside their frames for depth; each line rises in as its stop comes on
   screen. Without GSAP, or with reduced motion, the plain stacked layout stays. */
(function () {
    'use strict';
    var sec = document.querySelector('[data-arrival]');
    if (!sec || !window.gsap || !window.ScrollTrigger) { return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    gsap.registerPlugin(ScrollTrigger);

    var track = sec.querySelector('[data-ar-track]');
    var stops = [].slice.call(sec.querySelectorAll('[data-ar-stop]'));
    var heroImg = sec.querySelector('.ar__hero img');

    sec.classList.add('ar--live');

    var dist = 0;
    function measure() {
        dist = Math.max(0, track.scrollWidth - window.innerWidth);
        sec.style.height = (window.innerHeight + dist) + 'px';
    }
    measure();

    var move = gsap.to(track, { x: function () { return -dist; }, ease: 'none' });
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: function () { return '+=' + dist; }, animation: move, scrub: 0.8, invalidateOnRefresh: true });

    // the villa drifts inside its frame as the title gives way
    gsap.fromTo(heroImg, { xPercent: 0 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + window.innerWidth * 0.7; }, scrub: true } });

    stops.forEach(function (stop) {
        var img = stop.querySelector('.ar__card img');
        var card = stop.querySelector('.ar__card');
        var say = stop.querySelector('.ar__say');
        // the picture slides the other way inside its frame while it crosses the screen
        gsap.fromTo(img, { xPercent: 7 }, { xPercent: -7, ease: 'none', scrollTrigger: { trigger: stop, containerAnimation: move, start: 'left right', end: 'right left', scrub: true } });
        // it opens from the bottom, and the line rises in after it
        gsap.fromTo(card, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', scrollTrigger: { trigger: stop, containerAnimation: move, start: 'left 92%', end: 'left 55%', scrub: true } });
        gsap.fromTo(say, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, ease: 'power2.out', scrollTrigger: { trigger: stop, containerAnimation: move, start: 'left 78%', end: 'left 48%', scrub: true } });
    });

    window.addEventListener('load', function () { measure(); ScrollTrigger.refresh(); });
    window.addEventListener('resize', function () { measure(); });
})();

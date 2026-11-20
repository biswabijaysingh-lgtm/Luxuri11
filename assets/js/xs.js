/* Version 27: the arrival, built the way normalisboring.es builds its scroll module (read from its own scripts):
   - one wide row of panels; the page pins and scrolling slides the row across (x = -(row - screen), scrub 1,
     scroll length = row width * screen height / screen width);
   - every other motion is tied to the row's own movement (ScrollTrigger containerAnimation);
   - title letters rise out of masks, alternate lines from above and below, then the paragraph lines;
   - two-layer pictures: the top layer slides up (up-down) or wipes away (left-right, right-left) as the picture
     comes fully into view, the one beneath settling from a zoom;
   - the statement's last line slides across; the black panel's paragraph lights line by line;
   - a strip of type climbs from below; the giant words drift sideways; a picture follows the pointer over them;
   - the cards widen from 15vw to 60vw as they arrive and their words come in. */
(function () {
    'use strict';
    var sec = document.querySelector('[data-xs]');
    if (!sec || !window.gsap || !window.ScrollTrigger) { return; }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var stack = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
    if (reduce || stack) { sec.classList.add('xs--stack'); return; }
    gsap.registerPlugin(ScrollTrigger);

    var stage = sec.querySelector('[data-xs-stage]');
    var row = sec.querySelector('[data-xs-row]');
    var W = window.innerWidth, H = window.innerHeight, rowW = 0, dist = 0, scrollLen = 0;

    /* ---------- small helpers: letters and lines ---------- */
    function splitChars(el) {
        (function walk(node) {
            [].slice.call(node.childNodes).forEach(function (n) {
                if (n.nodeType === 3) {
                    var frag = document.createDocumentFragment();
                    n.textContent.split('').forEach(function (c) {
                        var s = document.createElement('span'); s.className = 'xch'; s.textContent = c === ' ' ? ' ' : c; frag.appendChild(s);
                    });
                    node.replaceChild(frag, n);
                } else if (n.nodeType === 1) { walk(n); }
            });
        })(el);
        return [].slice.call(el.querySelectorAll('.xch'));
    }
    function splitLines(p) {
        var words = p.textContent.trim().split(/\s+/);
        p.innerHTML = words.map(function (w) { return '<span class="xw">' + w + '</span>'; }).join(' ');
        var spans = [].slice.call(p.querySelectorAll('.xw')), lines = [], top = null, cur = [];
        spans.forEach(function (s) {
            var t = s.offsetTop;
            if (top === null || Math.abs(t - top) > 4) { if (cur.length) { lines.push(cur); } cur = []; top = t; }
            cur.push(s.textContent);
        });
        if (cur.length) { lines.push(cur); }
        p.innerHTML = lines.map(function (l) { return '<span class="xln"><span>' + l.join(' ') + '</span></span>'; }).join('');
        return [].slice.call(p.querySelectorAll('.xln > span'));
    }

    /* ---------- the row, and its length ---------- */
    function measure() {
        W = window.innerWidth; H = window.innerHeight;
        rowW = row.scrollWidth;
        dist = Math.max(0, rowW - W);
        scrollLen = rowW * H / W;                     // the reference: "+=" + (row * 100 / width) + "%" of the screen height
        sec.style.setProperty('--xs-h', (H + scrollLen) + 'px');
    }
    measure();

    var move = gsap.to(row, { x: function () { return -dist; }, ease: 'none' });
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: function () { return '+=' + scrollLen; }, animation: move, scrub: 1, invalidateOnRefresh: true });

    /* ---------- 1. the intro ---------- */
    var intro = sec.querySelector('[data-xs-intro]');
    var intro_tl = gsap.timeline({ paused: true });
    [].slice.call(intro.querySelectorAll('.xi__title .xl')).forEach(function (line, ind) {
        var chars = splitChars(line), from = (ind % 2 !== 0) ? '-110%' : '110%';
        intro_tl.from(chars, { y: from, duration: 0.65, stagger: 0.03, ease: 'power3.out' }, '<+=.05');
    });
    var introLines = splitLines(intro.querySelector('[data-xs-lines]'));
    intro_tl.from(introLines, { y: '100%', duration: 0.5, stagger: 0.09, ease: 'power3.out' }, '<+=.05');
    intro_tl.from(intro.querySelectorAll('.xi__menu li'), { y: '2.5rem', opacity: 0, duration: 1, stagger: -0.15, ease: 'power3.out' }, '-=1');
    intro_tl.from(intro.querySelectorAll('.xi__sec, .xi__copy'), { opacity: 0, duration: 0.5, ease: 'linear' }, '-=.5');
    ScrollTrigger.create({ trigger: sec, start: 'top 60%', once: true, onEnter: function () { intro_tl.play(); } });

    /* ---------- the first big picture drifts as it arrives ---------- */
    var single = sec.querySelector('[data-xs-single]');
    if (single) {
        gsap.fromTo(single.querySelector('img, video'), { x: '-15vw' }, { x: '0vw', ease: 'none', scrollTrigger: { containerAnimation: move, trigger: single.parentNode, start: '0% 78%', end: '90% 100%', scrub: 0.5 } });
    }

    /* ---------- two-layer pictures ---------- */
    [].slice.call(sec.querySelectorAll('[data-xflip]')).forEach(function (el) {
        var dir = el.getAttribute('data-xflip'), up = el.querySelector('.xflip__up'), downImg = el.querySelector('.xflip__down img, .xflip__down video'), d = 1.5;
        var tl = gsap.timeline({ paused: true });
        if (dir === 'lr') {
            gsap.set(up, { clipPath: 'inset(0% 0% 0% 0%)' });
            tl.to(up, { clipPath: 'inset(0% 100% 0% 0%)', duration: d, ease: 'power2.out' }, 0);
            tl.from(downImg, { scale: 1.2, duration: d + 0.5, ease: 'power2.out' }, 0);
        } else if (dir === 'rl') {
            gsap.set(up, { clipPath: 'inset(0% 0% 0% 0%)' });
            tl.to(up, { clipPath: 'inset(0% 0% 0% 100%)', duration: d, ease: 'power2.out' }, 0);
            tl.from(downImg, { scale: 1.2, duration: d + 0.5, ease: 'power2.out' }, 0);
        } else {
            tl.to(up, { yPercent: -105, duration: d, ease: 'power3.out' }, 0);
            tl.from(downImg, { yPercent: -10, duration: d + 0.5, ease: 'power3.out' }, 0);
        }
        ScrollTrigger.create({ containerAnimation: move, animation: tl, trigger: el, start: '100% 100%', end: '+=75%', scrub: 0.35 });
    });

    /* ---------- 3. the statement: its last line slides across ---------- */
    var textPanel = sec.querySelector('[data-xs-text]');
    var tlines = [].slice.call(textPanel.querySelectorAll('.xt__title .line'));
    tlines.forEach(function (l) { l.innerHTML = '<span class="cont">' + l.innerHTML + '</span>'; });
    var last = tlines[3], lastCont = last.querySelector('.cont');
    var posInitLeft = lastCont.offsetWidth - last.offsetWidth;
    var title_tl = gsap.timeline({ paused: true });
    title_tl.from(lastCont, { left: posInitLeft, duration: 2, ease: 'power1.inOut' }, 0);
    ScrollTrigger.create({ containerAnimation: move, animation: title_tl, trigger: textPanel, start: '0% 50%', end: '100% 50%', scrub: 0 });

    /* ---------- 4. the black panel's paragraph lights line by line ---------- */
    var lit = sec.querySelector('[data-xs-lit]');
    var litLines = splitLines(lit);
    var lit_tl = gsap.timeline({ paused: true });
    lit_tl.from(litLines, { opacity: 0.2, duration: 0.2, stagger: 0.1 });
    ScrollTrigger.create({ containerAnimation: move, animation: lit_tl, trigger: lit, start: '0% 75%', end: '0% 25%', scrub: 0 });

    /* ---------- 5. the strip climbs ---------- */
    var carPanel = sec.querySelector('.xp--car'), car = sec.querySelector('[data-xs-car]');
    var car_tl = gsap.timeline({ paused: true });
    car_tl.from(car, { y: '175vh', ease: 'none' }, 0);
    ScrollTrigger.create({ containerAnimation: move, animation: car_tl, trigger: carPanel, start: '0% 95%', end: '100% 0%', scrub: 0.5 });

    /* ---------- 7. the giant words ---------- */
    var terms = sec.querySelector('[data-xs-terms]');
    var tEls = [].slice.call(terms.querySelectorAll('.xterm'));
    var terms_tl = gsap.timeline({ paused: true });
    terms_tl.to(tEls[0], { paddingLeft: '12vw' }, 0);
    terms_tl.to(tEls[1], { paddingRight: '3vw' }, 0);
    terms_tl.to(tEls[2], { paddingLeft: '20vw' }, 0);
    ScrollTrigger.create({ containerAnimation: move, animation: terms_tl, trigger: terms, start: '0% 100%', end: '100% 0%', scrub: 1 });

    var follow = stage.querySelector('[data-xs-follow]');
    var srcs = JSON.parse(follow.getAttribute('data-srcs') || '[]'), SL = 7, cur = -1, lastX = 0, lastY = 0, dist = 0;
    srcs.forEach(function (u) { var im = new Image(); im.src = u; });
    function swapTo(n) {
        if (n === cur || !srcs.length) { return; }
        cur = n;
        var old = [].slice.call(follow.querySelectorAll('.sw'));
        var layer = document.createElement('div'); layer.className = 'sw';
        var parts = [];
        for (var k = 0; k < SL; k++) {
            var s = document.createElement('i');
            s.style.backgroundImage = 'url("' + srcs[n] + '")';
            s.style.backgroundSize = (SL * 100) + '% 100%';
            s.style.backgroundPosition = (k * 100 / (SL - 1)) + '% 0';
            s.style.left = (k * 100 / SL) + '%'; s.style.width = (100 / SL + 0.4) + '%';
            layer.appendChild(s); parts.push(s);
        }
        follow.appendChild(layer);
        gsap.fromTo(parts, { clipPath: 'inset(0% 0% 100% 0%)', scaleY: 1.25 }, { clipPath: 'inset(0% 0% 0% 0%)', scaleY: 1, duration: 0.8, ease: 'power3.out', stagger: { each: 0.06, from: k0() }, onComplete: function () { old.forEach(function (o) { o.remove(); }); } });
    }
    function k0() { return Math.random() < 0.5 ? 'start' : 'end'; }
    var fx = 0, fy = 0, tx = 0, ty = 0, fRaf = 0, hovering = false;
    function frun() {
        if (fRaf) { return; }
        (function step() {
            fx += (tx - fx) * 0.14; fy += (ty - fy) * 0.14;
            var tilt = Math.max(-7, Math.min(7, (tx - fx) * 0.05));
            follow.style.transform = 'translate3d(' + (fx - follow.offsetWidth / 2).toFixed(1) + 'px,' + (fy - follow.offsetHeight / 2).toFixed(1) + 'px,0) rotate(' + tilt.toFixed(2) + 'deg)';
            fRaf = (hovering || Math.abs(tx - fx) > 0.5 || Math.abs(ty - fy) > 0.5) ? requestAnimationFrame(step) : 0;
        })();
    }
    window.addEventListener('mousemove', function (e) {
        if (!hovering) { return; }
        var b = stage.getBoundingClientRect(); tx = e.clientX - b.left; ty = e.clientY - b.top;
        dist += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY); lastX = e.clientX; lastY = e.clientY;
        if (dist > 260) { dist = 0; swapTo((cur + 1) % srcs.length); }
    }, { passive: true });
    tEls.forEach(function (el, i) {
        el.addEventListener('mouseenter', function (e) {
            var b = stage.getBoundingClientRect(); tx = e.clientX - b.left; ty = e.clientY - b.top;
            if (!hovering) { fx = tx; fy = ty; hovering = true; frun(); }
            terms.classList.add('has-hover'); follow.classList.add('is-on');
            tEls.forEach(function (o, k) { o.classList.toggle('is-on', k === i); });
            lastX = e.clientX; lastY = e.clientY; dist = 0;
            if (cur < 0 || !follow.querySelector('.sw')) { swapTo(i); } else { swapTo(i === cur ? (i + 1) % srcs.length : i); }
        });
    });
    function leaveTerms() {
        hovering = false; terms.classList.remove('has-hover'); follow.classList.remove('is-on');
        tEls.forEach(function (o) { o.classList.remove('is-on'); });
    }
    terms.addEventListener('mouseleave', leaveTerms);
    // the words move under a still pointer as the page slides, so look again whenever the page moves
    var px = -1, py = -1, chk = false;
    window.addEventListener('mousemove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
    window.addEventListener('scroll', function () {
        if (!hovering || chk) { return; }
        chk = true;
        requestAnimationFrame(function () {
            chk = false;
            var el = document.elementFromPoint(px, py);
            if (!el || !el.closest || !el.closest('[data-xs-terms]')) { leaveTerms(); }
        });
    }, { passive: true });

    /* ---------- version 49: the films play only while they are near the screen ---------- */
    var films = [].slice.call(sec.querySelectorAll('video[data-xv]'));
    if (films.length && 'IntersectionObserver' in window) {
        var fio = new IntersectionObserver(function (list) {
            list.forEach(function (en) {
                var v = en.target;
                if (en.isIntersecting) {
                    if (!v.getAttribute('src')) { v.src = v.getAttribute('data-xv'); }
                    var pr = v.play(); if (pr && pr.catch) { pr.catch(function () {}); }
                } else if (v.getAttribute('src')) { v.pause(); }
            });
        }, { rootMargin: '0px 25% 0px 25%', threshold: 0.01 });
        films.forEach(function (v) { fio.observe(v); });
    }

    /* ---------- 8. the cards ---------- */
    var cards = [].slice.call(sec.querySelectorAll('[data-xcard]'));
    var maxW = 60, minW = 15;
    gsap.set(cards, { width: minW + 'vw' });
    var projects_tl = gsap.timeline({ paused: true });
    cards.forEach(function (card, index) {
        var datas = [].slice.call(card.querySelectorAll('.xcard__data > span > span'));
        var title = card.querySelector('.xcard__title'), chars = splitChars(title);
        var btn = card.querySelector('.xcard__btn'), media = card.querySelector('.xcard__media');
        var text_tl = gsap.timeline({ paused: true, delay: 0.1 });
        text_tl.fromTo(datas[0], { y: '100%' }, { y: '0%', duration: 0.33, ease: 'power2.out' }, 0);
        text_tl.fromTo(datas[1], { y: '100%' }, { y: '0%', duration: 0.33, ease: 'power2.out' }, 0.2);
        text_tl.fromTo(datas[2], { y: '100%' }, { y: '0%', duration: 0.33, ease: 'power2.out' }, 0.3);
        text_tl.fromTo(btn, { y: '100%', opacity: 0 }, { y: '0%', opacity: 1, duration: 0.33, ease: 'power2.out' }, 0.4);
        text_tl.fromTo(chars, { y: '100%' }, { y: '0%', duration: 0.25, ease: 'power2.out', stagger: 0.05 }, 0.5);
        text_tl.progress(0);
        var time = index;
        projects_tl.to(card, { opacity: 1, duration: 0.005, onComplete: function () { text_tl.pause(); text_tl.play(); }, onReverseComplete: function () { text_tl.pause(); text_tl.timeScale(-2.5); text_tl.reverse(); } }, time + 0.5);
        projects_tl.fromTo(card, { width: minW + 'vw' }, { width: maxW + 'vw', duration: 1, ease: 'power1.inOut' }, time);
        projects_tl.fromTo(media, { height: '87vh' }, { height: (33.33 * 2) + 'vh', duration: 1, ease: 'power1.inOut' }, time);
    });
    ScrollTrigger.create({ containerAnimation: move, animation: projects_tl, trigger: cards[0], start: '0% 80%', end: '+=' + (maxW * cards.length) + '%', scrub: 0 });

    window.addEventListener('load', function () { measure(); ScrollTrigger.refresh(); });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { measure(); ScrollTrigger.refresh(); }, 150); });
})();

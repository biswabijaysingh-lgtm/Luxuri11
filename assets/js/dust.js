/* ==========================================================================
   LUXURI: dust.js
   A small raw-WebGL particle engine ("gold dust"), used for the preloader
   wordmark, the cover dissolve and the footer wordmark.
   Particles are sampled from an image or an offscreen canvas; each one knows
   its home position, a scattered start position (for assembling) and a drift
   vector (for dissolving). The GPU does all the motion.
   No dependencies.
   ========================================================================== */
(function (global) {
    'use strict';

    var VS = [
        'attribute vec2 aHome;',
        'attribute vec2 aFrom;',
        'attribute vec2 aDir;',
        'attribute vec4 aColor;',
        'attribute vec4 aRand;',
        'uniform vec2 uRes;',
        'uniform float uDpr;',
        'uniform float uSize;',
        'uniform float uAssemble;',
        'uniform float uDissolve;',
        'uniform float uTime;',
        'uniform vec2 uMouse;',
        'uniform float uMouseR;',
        'uniform vec3 uGold;',
        'uniform float uGoldMix;',
        'uniform float uBreath;',
        'varying vec4 vColor;',
        'void main() {',
        '  float a = clamp((uAssemble - aRand.x * 0.4) / 0.6, 0.0, 1.0);',
        '  a = 1.0 - pow(1.0 - a, 3.0);',
        '  vec2 p = mix(aFrom, aHome, a);',
        '  p += vec2(sin(uTime * 0.7 + aRand.y * 6.2831), cos(uTime * 0.6 + aRand.z * 6.2831)) * uBreath;',
        '  float d = clamp((uDissolve - aRand.x * 0.5) / 0.5, 0.0, 1.0);',
        '  float dd = d * d;',
        '  vec2 swirl = vec2(sin(p.y * 0.011 + uTime * 0.8 + aRand.w * 6.2831), cos(p.x * 0.009 + uTime * 0.7 + aRand.y * 6.2831)) * 70.0 * d;',
        '  p += aDir * dd + swirl;',
        '  vec2 m = p - uMouse;',
        '  float md = length(m);',
        '  if (md < uMouseR) { p += (m / max(md, 0.001)) * (uMouseR - md) * 0.55; }',
        '  vec2 clip = (p / uRes) * 2.0 - 1.0;',
        '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
        '  float sz = uSize * (0.7 + aRand.w * 0.6) * (1.0 + d * 1.4);',
        '  gl_PointSize = max(1.0, sz * uDpr);',
        '  vec3 col = mix(aColor.rgb, uGold, clamp(uGoldMix + d * 0.6, 0.0, 1.0));',
        '  float alpha = aColor.a * (1.0 - d) * (0.25 + 0.75 * a);',
        '  alpha *= 0.82 + 0.18 * sin(uTime * 2.6 + aRand.y * 37.0);',
        '  vColor = vec4(col, alpha);',
        '}'
    ].join('\n');

    var FS = [
        'precision mediump float;',
        'varying vec4 vColor;',
        'uniform float uSoft;',
        'void main() {',
        '  vec2 c = gl_PointCoord - 0.5;',
        '  float r = dot(c, c) * 4.0;',
        '  float a = smoothstep(1.0, uSoft, r);',
        '  gl_FragColor = vec4(vColor.rgb * vColor.a * a, vColor.a * a);',
        '}'
    ].join('\n');

    function compile(gl, type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            var log = gl.getShaderInfoLog(s);
            gl.deleteShader(s);
            throw new Error('LuxDust shader: ' + log);
        }
        return s;
    }

    function rand(seed) {
        // small deterministic PRNG so a rebuild looks identical
        var t = seed >>> 0;
        return function () {
            t += 0x6D2B79F5;
            var r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    function LuxDust(canvas, opts) {
        opts = opts || {};
        this.canvas = canvas;
        this.additive = !!opts.additive;
        this.maxDpr = opts.maxDpr || 1.75;
        this.count = 0;
        this.state = {
            assemble: 1, dissolve: 0, goldMix: 0, size: 3, breath: 0,
            mouse: [-9999, -9999], mouseR: 0, soft: 0.15, gold: [0.86, 0.74, 0.52]
        };
        var gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
        if (!gl) { throw new Error('LuxDust: WebGL unavailable'); }
        this.gl = gl;
        var prog = gl.createProgram();
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { throw new Error('LuxDust link: ' + gl.getProgramInfoLog(prog)); }
        this.prog = prog;
        gl.useProgram(prog);
        this.loc = {};
        var names = ['uRes', 'uDpr', 'uSize', 'uAssemble', 'uDissolve', 'uTime', 'uMouse', 'uMouseR', 'uGold', 'uGoldMix', 'uBreath', 'uSoft'];
        for (var i = 0; i < names.length; i++) { this.loc[names[i]] = gl.getUniformLocation(prog, names[i]); }
        this.attr = {
            aHome: gl.getAttribLocation(prog, 'aHome'),
            aFrom: gl.getAttribLocation(prog, 'aFrom'),
            aDir: gl.getAttribLocation(prog, 'aDir'),
            aColor: gl.getAttribLocation(prog, 'aColor'),
            aRand: gl.getAttribLocation(prog, 'aRand')
        };
        this.buffer = gl.createBuffer();
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        if (this.additive) { gl.blendFunc(gl.ONE, gl.ONE); } else { gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
        this.resize();
    }

    LuxDust.prototype.resize = function () {
        var dpr = Math.min(global.devicePixelRatio || 1, this.maxDpr);
        var r = this.canvas.getBoundingClientRect();
        this.w = Math.max(1, r.width);
        this.h = Math.max(1, r.height);
        this.dpr = dpr;
        this.canvas.width = Math.round(this.w * dpr);
        this.canvas.height = Math.round(this.h * dpr);
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    };

    /**
     * Build particles from a source canvas whose pixels map 1:1 to cells.
     * cell: CSS px per source pixel. offsetX/offsetY: CSS px offset of the grid.
     * opts.alphaMin: skip pixels below this alpha (0-255). opts.dir(x,y,r) -> [dx,dy]. opts.from(x,y,r) -> [fx,fy]
     */
    LuxDust.prototype.fromPixels = function (src, cell, opts) {
        opts = opts || {};
        var w = src.width, h = src.height;
        var data = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
        var r = rand(opts.seed || 7);
        var ox = opts.offsetX || 0, oy = opts.offsetY || 0;
        var alphaMin = opts.alphaMin == null ? 8 : opts.alphaMin;
        var tint = opts.tint || null;
        var out = [];
        var n = 0;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var k = (y * w + x) * 4;
                var al = data[k + 3];
                if (al < alphaMin) { continue; }
                var hx = ox + (x + 0.5) * cell + (r() - 0.5) * cell * 0.35;
                var hy = oy + (y + 0.5) * cell + (r() - 0.5) * cell * 0.35;
                var rr = data[k] / 255, gg = data[k + 1] / 255, bb = data[k + 2] / 255;
                if (tint) { var t = r(); rr = tint[0] + (tint[3] - tint[0]) * t; gg = tint[1] + (tint[4] - tint[1]) * t; bb = tint[2] + (tint[5] - tint[2]) * t; }
                var rnd = [r(), r(), r(), r()];
                if (opts.delay) { rnd[0] = opts.delay(hx, hy, rnd[0]); }
                var d = opts.dir ? opts.dir(hx, hy, rnd) : [0, -200];
                var f = opts.from ? opts.from(hx, hy, rnd) : [hx, hy];
                out.push(hx, hy, f[0], f[1], d[0], d[1], rr, gg, bb, al / 255, rnd[0], rnd[1], rnd[2], rnd[3]);
                n++;
            }
        }
        this.upload(new Float32Array(out), n);
        return n;
    };

    LuxDust.prototype.upload = function (arr, n) {
        var gl = this.gl;
        this.count = n;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
        var stride = 14 * 4;
        var a = this.attr;
        gl.enableVertexAttribArray(a.aHome); gl.vertexAttribPointer(a.aHome, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(a.aFrom); gl.vertexAttribPointer(a.aFrom, 2, gl.FLOAT, false, stride, 8);
        gl.enableVertexAttribArray(a.aDir); gl.vertexAttribPointer(a.aDir, 2, gl.FLOAT, false, stride, 16);
        gl.enableVertexAttribArray(a.aColor); gl.vertexAttribPointer(a.aColor, 4, gl.FLOAT, false, stride, 24);
        gl.enableVertexAttribArray(a.aRand); gl.vertexAttribPointer(a.aRand, 4, gl.FLOAT, false, stride, 40);
    };

    /**
     * Sample an image (or video frame) with object-fit: cover into a grid of `step` CSS px cells
     * covering the whole canvas.
     */
    LuxDust.prototype.fromImageCover = function (img, step, opts) {
        var iw = img.naturalWidth || img.videoWidth || img.width;
        var ih = img.naturalHeight || img.videoHeight || img.height;
        var cols = Math.max(2, Math.round(this.w / step));
        var rows = Math.max(2, Math.round(this.h / step));
        var cell = this.w / cols;
        var c = document.createElement('canvas');
        c.width = cols; c.height = rows;
        var ctx = c.getContext('2d', { willReadFrequently: true });
        var scale = Math.max(cols / iw, rows / ih);
        var dw = iw * scale, dh = ih * scale;
        var focusX = (opts && opts.focusX != null) ? opts.focusX : 0.5;
        var focusY = (opts && opts.focusY != null) ? opts.focusY : 0.5;
        ctx.drawImage(img, (cols - dw) * focusX, (rows - dh) * focusY, dw, dh);
        return this.fromPixels(c, cell, opts);
    };

    LuxDust.prototype.set = function (s) {
        for (var k in s) { if (Object.prototype.hasOwnProperty.call(s, k)) { this.state[k] = s[k]; } }
    };

    LuxDust.prototype.render = function (time) {
        var gl = this.gl, s = this.state, L = this.loc;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!this.count) { return; }
        gl.useProgram(this.prog);
        gl.uniform2f(L.uRes, this.w, this.h);
        gl.uniform1f(L.uDpr, this.dpr);
        gl.uniform1f(L.uSize, s.size);
        gl.uniform1f(L.uAssemble, s.assemble);
        gl.uniform1f(L.uDissolve, s.dissolve);
        gl.uniform1f(L.uTime, time || 0);
        gl.uniform2f(L.uMouse, s.mouse[0], s.mouse[1]);
        gl.uniform1f(L.uMouseR, s.mouseR);
        gl.uniform3f(L.uGold, s.gold[0], s.gold[1], s.gold[2]);
        gl.uniform1f(L.uGoldMix, s.goldMix);
        gl.uniform1f(L.uBreath, s.breath);
        gl.uniform1f(L.uSoft, s.soft);
        gl.drawArrays(gl.POINTS, 0, this.count);
    };

    LuxDust.prototype.destroy = function () {
        try {
            var ext = this.gl.getExtension('WEBGL_lose_context');
            this.gl.deleteBuffer(this.buffer);
            this.gl.deleteProgram(this.prog);
            if (ext) { ext.loseContext(); }
        } catch (e) { /* ignore */ }
        this.count = 0;
    };

    LuxDust.supported = function () {
        try {
            var c = document.createElement('canvas');
            return !!(global.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
        } catch (e) { return false; }
    };

    global.LuxDust = LuxDust;
})(window);

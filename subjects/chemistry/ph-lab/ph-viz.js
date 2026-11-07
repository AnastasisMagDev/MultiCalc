/* ============================================================================
   MODULE-16 · Acids, Bases & pH Lab — ph-viz.js  (v2)
   Colour model + the beaker. No dependency on the host app; theme-aware by reading the canvas'
   computed text colour. The loop runs only while the canvas is visible.
   Beaker: glass with thickness and rim, liquid with perspective surface and waves, ion particles
   (log-scaled counts, Brownian motion + stirring flow), bubbles, magnetic stir bar, pH electrode,
   and for titrations a burette with graduations, stopcock, a growing hanging drop, falling drops
   (each = 0.05 mL), ripples, splashes and local colour plumes that mix into the bulk.
   ========================================================================== */
(function (root) {
  'use strict';
  var D = root.PHLabData;

  /* ---------- colour model ---------- */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t), lerp(c1[3] === undefined ? 1 : c1[3], c2[3] === undefined ? 1 : c2[3], t)]; }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a === undefined ? (c[3] === undefined ? 1 : c[3]) : a).toFixed(3) + ')'; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  function universalColor(pH) {
    var U = D.UNIVERSAL, p = clamp(pH, 0, 14), i;
    for (i = 1; i < U.length; i++) if (p <= U[i][0]) {
      var t = (p - U[i - 1][0]) / (U[i][0] - U[i - 1][0]), c = mix(U[i - 1][1].concat(1), U[i][1].concat(1), t);
      return [c[0], c[1], c[2], 0.9];
    }
    return U[U.length - 1][1].concat(0.9);
  }
  // Henderson–Hasselbalch fraction in the basic form; acid → mid → base colour
  function indicatorFraction(ind, pH) { return 1 / (1 + Math.pow(10, ind.pK - pH)); }
  function indicatorColor(ind, pH) {
    var f = indicatorFraction(ind, pH);
    return f < 0.5 ? mix(ind.acid, ind.mid, f * 2) : mix(ind.mid, ind.base, (f - 0.5) * 2);
  }
  var WATER = [186, 218, 236, 0.30];

  function toUnicode(html) {
    var SUB = { 0: '\u2080', 1: '\u2081', 2: '\u2082', 3: '\u2083', 4: '\u2084', 5: '\u2085', 6: '\u2086', 7: '\u2087', 8: '\u2088', 9: '\u2089' };
    var SUP = { 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079', '+': '\u207a', '\u2212': '\u207b', '-': '\u207b', '\u00b1': '\u00b1' };
    return String(html)
      .replace(/<sub>([^<]*)<\/sub>/g, function (m, s) { return s.replace(/./g, function (ch) { return SUB[ch] || ch; }); })
      .replace(/<sup>([^<]*)<\/sup>/g, function (m, s) { return s.replace(/./g, function (ch) { return SUP[ch] || ch; }); })
      .replace(/<[^>]+>/g, '');
  }

  var reduceMotion = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function fitCanvas(cv) {
    var r = cv.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 2.5), w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return null;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  }
  function inkColor(cv) { return root.getComputedStyle(cv).color || 'rgb(230,230,230)'; }

  function sprite(color, glyph, dpr) {
    var s = Math.ceil(15 * dpr), c = document.createElement('canvas'); c.width = c.height = s;
    var x = c.getContext('2d'), r = s / 2;
    var g = x.createRadialGradient(r * 0.75, r * 0.7, r * 0.1, r, r, r * 0.95); g.addColorStop(0, '#fff'); g.addColorStop(0.18, color); g.addColorStop(1, color);
    x.fillStyle = g; x.beginPath(); x.arc(r, r, r * 0.86, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = Math.max(1.2, dpr * 1.2); x.lineCap = 'round'; x.beginPath();
    x.moveTo(r - r * 0.36, r); x.lineTo(r + r * 0.36, r); if (glyph === '+') { x.moveTo(r, r - r * 0.36); x.lineTo(r, r + r * 0.36); } x.stroke();
    return c;
  }

  /* =========================================================================
     Beaker
     ========================================================================= */
  function Beaker(cv) {
    this.cv = cv; this.cur = WATER.slice(); this.tgt = WATER.slice(); this.level = 0.62; this.levelT = 0.62;
    this.nH = 0; this.nOH = 0; this.showIons = true; this.burette = false; this.buretteFill = 1; this.stir = false; this.probe = true; this.mixRate = 5.5;
    this.dropRate = 0; this.dropClock = 0; this.parts = []; this.bubbles = []; this.drops = []; this.ripples = []; this.plumes = []; this.splash = []; this.dose = [];
    this.plumeColor = null; this.waveAmp = 0; this.t = 0; this.theta = 0; this.raf = 0; this.last = 0; this.geo = null; this.sprites = null;
    var self = this, i;
    for (i = 0; i < 12; i++) this.bubbles.push(this._bubble(true));
    if (root.ResizeObserver) { this.ro = new root.ResizeObserver(function () { self.start(); }); this.ro.observe(cv); }
    this._vis = function () { if (!document.hidden) self.start(); };
    document.addEventListener('visibilitychange', this._vis);
  }
  Beaker.prototype._bubble = function (init) { return { x: Math.random(), y: init ? Math.random() : 1.02, r: 0.8 + Math.random() * 2.3, v: 0.03 + Math.random() * 0.06, ph: Math.random() * 6 }; };
  Beaker.prototype.setColor = function (c, instant) { this.tgt = c.length === 3 ? c.concat(1) : c.slice(); if (instant || reduceMotion) this.cur = this.tgt.slice(); this.start(); };
  Beaker.prototype.setLevel = function (l) { this.levelT = clamp(l, 0.2, 0.86); if (reduceMotion) this.level = this.levelT; this.start(); };
  Beaker.prototype.setIons = function (nH, nOH) { this.nH = nH; this.nOH = nOH; this._sync(); this.start(); };
  Beaker.prototype.setPlumeColor = function (c) { this.plumeColor = c; };
  Beaker.prototype.setMode = function (o) {
    if (o.showIons !== undefined) { this.showIons = o.showIons; this._sync(); }
    ['burette', 'buretteFill', 'stir', 'probe', 'mixRate'].forEach(function (k) { if (o[k] !== undefined) this[k] = o[k]; }, this);
    if (o.flow !== undefined) this.dropRate = o.flow;
    this.start();
  };
  Beaker.prototype.drop = function () { if (this.geo) this.drops.push({ y: this.geo.tipY + 3, v: 30, s: 1 }); this.start(); };
  Beaker.prototype.pour = function () {            // dissolving animation when the substance / concentration changes
    var i; for (i = 0; i < 14; i++) this.dose.push({ x: 0.5 + (Math.random() - 0.5) * 0.28, y: -0.06 - Math.random() * 0.25, v: 0.55 + Math.random() * 0.4, r: 1.2 + Math.random() * 1.8, a: 1 });
    this.start();
  };
  Beaker.prototype._sync = function () {
    var want = { h: this.showIons ? this.nH : 0, o: this.showIons ? this.nOH : 0 }, have = { h: 0, o: 0 }, i, p, k;
    for (i = 0; i < this.parts.length; i++) { p = this.parts[i]; if (!p.dying) have[p.t]++; }
    var types = ['h', 'o'];
    for (k = 0; k < 2; k++) {
      var t = types[k], diff = want[t] - have[t];
      while (diff > 0) { this.parts.push({ t: t, x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .05, vy: (Math.random() - .5) * .05, a: 0, dying: false }); diff--; }
      for (i = this.parts.length - 1; i >= 0 && diff < 0; i--) if (this.parts[i].t === t && !this.parts[i].dying) { this.parts[i].dying = true; diff++; }
    }
  };
  Beaker.prototype.visible = function () { var r = this.cv.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !document.hidden; };
  Beaker.prototype.start = function () {
    var self = this;
    if (!this.visible()) { this.stop(); return; }
    if (reduceMotion) { this.frame(0.016, true); return; }
    if (this.raf) return;
    this.last = 0;
    this.raf = root.requestAnimationFrame(function tick(ts) {
      if (!self.visible()) { self.raf = 0; return; }
      var dt = self.last ? Math.min(0.05, (ts - self.last) / 1000) : 0.016; self.last = ts;
      self.frame(dt); self.raf = root.requestAnimationFrame(tick);
    });
  };
  Beaker.prototype.stop = function () { if (this.raf) { root.cancelAnimationFrame(this.raf); this.raf = 0; } };
  Beaker.prototype.destroy = function () { this.stop(); if (this.ro) this.ro.disconnect(); document.removeEventListener('visibilitychange', this._vis); };

  Beaker.prototype._impact = function (cx, surfY, ry) {
    this.ripples.push({ r: 2, a: 0.75 }, { r: -6, a: 0.5 });
    this.waveAmp = Math.min(3.2, this.waveAmp + 1.5);
    var pc = this.plumeColor || this.tgt; this.plumes.push({ x: cx + (Math.random() - 0.5) * 6, y: surfY + 6, age: 0, life: 1.5, color: pc });
    for (var i = 0; i < 4; i++) this.splash.push({ x: cx, y: surfY, vx: (Math.random() - 0.5) * 46, vy: -(30 + Math.random() * 38), a: 1 });
  };

  Beaker.prototype.frame = function (dt, once) {
    var fc = fitCanvas(this.cv); if (!fc) return;
    var ctx = fc.ctx, W = fc.w, H = fc.h, ink = inkColor(this.cv), i, p;
    this.t += dt; if (!this.sprites || this.sprites.dpr !== fc.dpr) this.sprites = { dpr: fc.dpr, h: sprite('#ff6a3d', '+', fc.dpr), o: sprite('#3d9bff', '-', fc.dpr) };
    var k = once ? 1 : 1 - Math.exp(-dt * this.mixRate);
    for (i = 0; i < 4; i++) this.cur[i] += (this.tgt[i] - this.cur[i]) * k;
    this.level += (this.levelT - this.level) * (once ? 1 : 1 - Math.exp(-dt * 4));
    this.waveAmp *= Math.exp(-dt * 2.4); this.theta += dt * (this.stir ? 13 : 0.6);

    ctx.clearRect(0, 0, W, H);
    // ---- geometry
    var bw = Math.min(W * 0.74, H * (this.burette ? 0.62 : 0.74)), bh = bw * 1.08;
    var yb = H - (this.burette ? H * 0.07 : (H - bh) / 2 - 2), topY = yb - bh, cx = W / 2;
    var x0 = cx - bw / 2, x1 = cx + bw / 2, taper = bw * 0.05, rad = bw * 0.1, th = Math.max(2.5, bw * 0.022), ry = bw * 0.05;
    var surfY = yb - bh * this.level - th;
    var tipY = topY - bh * 0.09;
    this.geo = { tipY: tipY, cx: cx, surfY: surfY };
    function glass(inset, close) {
      ctx.beginPath(); ctx.moveTo(x0 + inset, topY); ctx.lineTo(x0 + taper + inset, yb - rad);
      ctx.quadraticCurveTo(x0 + taper + inset, yb - inset, x0 + taper + rad, yb - inset); ctx.lineTo(x1 - taper - rad, yb - inset);
      ctx.quadraticCurveTo(x1 - taper - inset, yb - inset, x1 - taper - inset, yb - rad); ctx.lineTo(x1 - inset, topY); if (close) ctx.closePath();
    }
    // ---- table shadow
    var sg = ctx.createRadialGradient(cx, yb + 4, 2, cx, yb + 4, bw * 0.62); sg.addColorStop(0, 'rgba(0,0,0,.30)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(0, 0); ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(cx, yb + 4, bw * 0.62, bw * 0.075, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    var c = this.cur;
    ctx.fillStyle = rgba(c, 0.10 + 0.14 * c[3]); ctx.beginPath(); ctx.ellipse(cx, yb + 5, bw * 0.4, bw * 0.03, 0, 0, Math.PI * 2); ctx.fill();   // coloured glow on the table
    // ---- back half of the rim
    ctx.strokeStyle = ink; ctx.globalAlpha = 0.28; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(cx, topY, bw / 2, ry, 0, Math.PI, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;

    // ---- liquid
    ctx.save(); glass(th, true); ctx.clip();
    var g = ctx.createLinearGradient(0, surfY, 0, yb);
    g.addColorStop(0, rgba(mix(c, [255, 255, 255, c[3]], 0.12), c[3] * 0.80)); g.addColorStop(0.55, rgba(c, c[3] * 0.88)); g.addColorStop(1, rgba([c[0] * 0.72, c[1] * 0.72, c[2] * 0.72], Math.min(1, c[3] + 0.1)));
    ctx.fillStyle = g; ctx.fillRect(x0, surfY, bw, yb - surfY + 4);
    var hg = ctx.createLinearGradient(x0, 0, x1, 0);        // cylinder lighting
    hg.addColorStop(0, 'rgba(0,0,0,.22)'); hg.addColorStop(0.12, 'rgba(255,255,255,.10)'); hg.addColorStop(0.5, 'rgba(255,255,255,0)'); hg.addColorStop(0.88, 'rgba(0,0,0,.10)'); hg.addColorStop(1, 'rgba(0,0,0,.26)');
    ctx.fillStyle = hg; ctx.fillRect(x0, surfY, bw, yb - surfY + 4);
    // surface (ellipse in perspective, with waves)
    var wob = Math.sin(this.t * 3.1) * this.waveAmp * 0.5;
    var sgd = ctx.createLinearGradient(0, surfY - ry, 0, surfY + ry); sgd.addColorStop(0, rgba(mix(c, [255, 255, 255, 1], 0.38), Math.min(1, c[3] * 0.95 + 0.08))); sgd.addColorStop(1, rgba(mix(c, [255, 255, 255, 1], 0.12), c[3] * 0.9));
    ctx.fillStyle = sgd; ctx.beginPath(); ctx.ellipse(cx, surfY + wob, bw / 2 - th - taper * 0.2, ry * (1 + this.waveAmp * 0.04), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(cx, surfY + wob, bw / 2 - th - taper * 0.2, ry * (1 + this.waveAmp * 0.04), 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    // ripples on the surface
    for (i = this.ripples.length - 1; i >= 0; i--) {
      var rp = this.ripples[i]; rp.r += 38 * dt; rp.a -= dt * 1.3; if (rp.r < 0) continue;
      if (rp.a <= 0) { this.ripples.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(255,255,255,' + rp.a.toFixed(3) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, surfY + wob, Math.min(rp.r, bw * 0.46), Math.min(rp.r, bw * 0.46) * 0.1, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // plumes: local colour that mixes into the bulk
    for (i = this.plumes.length - 1; i >= 0; i--) {
      var pl = this.plumes[i]; pl.age += dt; if (pl.age > pl.life) { this.plumes.splice(i, 1); continue; }
      var u = pl.age / pl.life, pr = 8 + u * 46, pg = ctx.createRadialGradient(pl.x, pl.y + u * 18, 1, pl.x, pl.y + u * 18, pr);
      pg.addColorStop(0, rgba(pl.color, Math.min(1, pl.color[3]) * (1 - u) * 0.8)); pg.addColorStop(1, rgba(pl.color, 0));
      ctx.fillStyle = pg; ctx.fillRect(x0, surfY - 6, bw, yb - surfY + 6);
    }
    // stirring vortex streaks
    if (this.stir) {
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1.4;
      for (i = 0; i < 3; i++) { var a0 = this.theta * 0.35 + i * 2.1, rr = bw * (0.14 + i * 0.07); ctx.beginPath(); ctx.ellipse(cx, yb - bh * 0.18 - i * bh * 0.05, rr, rr * 0.22, 0, a0, a0 + 2.2); ctx.stroke(); }
    }
    // bubbles
    ctx.fillStyle = 'rgba(255,255,255,.26)'; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 0.8;
    var nb = this.stir ? 18 : 10; while (this.bubbles.length < nb) this.bubbles.push(this._bubble(false));
    for (i = this.bubbles.length - 1; i >= 0; i--) {
      var b = this.bubbles[i]; b.y -= b.v * dt * (0.6 + b.r * 0.5) * (this.stir ? 1.6 : 1); b.ph += dt * 2.4;
      if (b.y < 0) { if (this.bubbles.length > nb) this.bubbles.splice(i, 1); else { this.bubbles[i] = this._bubble(false); } continue; }
      var bx = x0 + th + taper + (bw - 2 * th - 2 * taper) * (b.x + Math.sin(b.ph) * 0.014), by = surfY + (yb - surfY) * b.y;
      ctx.beginPath(); ctx.arc(bx, by, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // ions
    var ix0 = x0 + th + taper + 6, ix1 = x1 - th - taper - 6, iy0 = surfY + 10, iy1 = yb - 12, sp = this.sprites;
    for (i = this.parts.length - 1; i >= 0; i--) {
      p = this.parts[i];
      p.vx += (Math.random() - .5) * 0.9 * dt; p.vy += (Math.random() - .5) * 0.9 * dt;
      if (this.stir) { var dx = p.x - 0.5, dy = p.y - 0.5; p.vx += -dy * 0.5 * dt * 8; p.vy += dx * 0.5 * dt * 8; }
      p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt * 1.6; p.y += p.vy * dt * 1.6;
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); } if (p.x > 1) { p.x = 1; p.vx = -Math.abs(p.vx); }
      if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); } if (p.y > 1) { p.y = 1; p.vy = -Math.abs(p.vy); }
      p.a += (p.dying ? -dt * 3 : dt * 3); p.a = clamp(p.a, 0, 1);
      if (p.dying && p.a <= 0) { this.parts.splice(i, 1); continue; }
      if (iy1 <= iy0) continue;
      ctx.globalAlpha = p.a * 0.95; var s = 13; ctx.drawImage(p.t === 'h' ? sp.h : sp.o, ix0 + (ix1 - ix0) * p.x - s / 2, iy0 + (iy1 - iy0) * p.y - s / 2, s, s); ctx.globalAlpha = 1;
    }
    // stir bar
    if (this.probe || this.stir) {
      var L = bw * 0.30 * Math.max(0.18, Math.abs(Math.cos(this.theta))), sy = yb - th - 6;
      var bg = ctx.createLinearGradient(0, sy - 4, 0, sy + 4); bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#b9c2cf');
      ctx.fillStyle = bg; ctx.globalAlpha = 0.92; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - L / 2, sy - 3.5, L, 7, 3.5); else ctx.rect(cx - L / 2, sy - 3.5, L, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    // pH electrode (the part under the surface is drawn inside the clip)
    if (this.probe) this._probe(ctx, cx - bw * 0.21, topY, surfY, yb, bh, th, ink, true);
    ctx.restore();
    if (this.probe) this._probe(ctx, cx - bw * 0.21, topY, surfY, yb, bh, th, ink, false);

    // ---- glass
    var gg = ctx.createLinearGradient(x0, 0, x1, 0); gg.addColorStop(0, 'rgba(255,255,255,.20)'); gg.addColorStop(0.18, 'rgba(255,255,255,.05)'); gg.addColorStop(0.82, 'rgba(255,255,255,.04)'); gg.addColorStop(1, 'rgba(255,255,255,.16)');
    ctx.save(); glass(0, true); ctx.fillStyle = gg; ctx.fill(); ctx.restore();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.62; ctx.lineWidth = 2.1; glass(0, false); ctx.stroke();
    ctx.globalAlpha = 0.22; ctx.lineWidth = 1.2; glass(th, false); ctx.stroke();
    ctx.globalAlpha = 0.3; ctx.lineWidth = bw * 0.03; ctx.beginPath(); ctx.moveTo(x0 + taper + rad * 0.6, yb - th * 0.4); ctx.lineTo(x1 - taper - rad * 0.6, yb - th * 0.4); ctx.stroke();   // thick bottom
    ctx.globalAlpha = 0.85; ctx.lineWidth = 2.1; ctx.beginPath(); ctx.ellipse(cx, topY, bw / 2, ry, 0, 0, Math.PI); ctx.stroke();            // front half of the rim
    ctx.beginPath(); ctx.moveTo(x0 - 5, topY + 1); ctx.lineTo(x0 + 2, topY + 1); ctx.moveTo(x1 - 2, topY + 1); ctx.lineTo(x1 + 5, topY + 1); ctx.stroke();   // pouring lip
    ctx.globalAlpha = 0.2; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x0 + bw * 0.14, topY + bh * 0.1); ctx.lineTo(x0 + bw * 0.17, yb - bh * 0.22); ctx.stroke();
    ctx.globalAlpha = 0.11; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x1 - bw * 0.1, topY + bh * 0.18); ctx.lineTo(x1 - bw * 0.12, yb - bh * 0.3); ctx.stroke();
    ctx.globalAlpha = 0.45; ctx.lineWidth = 1;
    for (i = 1; i <= 5; i++) { var ty = yb - bh * (0.12 + i * 0.15); ctx.beginPath(); ctx.moveTo(x1 - taper * (1 - i * 0.14) - bw * 0.012, ty); ctx.lineTo(x1 - bw * (i % 2 ? 0.12 : 0.17), ty); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // ---- dissolving pour (solution tab)
    for (i = this.dose.length - 1; i >= 0; i--) {
      var d = this.dose[i]; d.y += d.v * dt * 1.1; var dyPx = topY - bh * 0.5 + (surfY - (topY - bh * 0.5)) * Math.min(1, Math.max(0, d.y / 0.9));
      var dxPx = cx + (d.x - 0.5) * bw; if (d.y > 0.88) { d.a -= dt * 3; if (!d.hit) { d.hit = true; this._impact(dxPx, surfY, ry); } }
      if (d.a <= 0) { this.dose.splice(i, 1); continue; }
      if (d.y > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * d.a).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(dxPx, dyPx, d.r, 0, Math.PI * 2); ctx.fill(); }
    }
    // ---- splash droplets
    for (i = this.splash.length - 1; i >= 0; i--) {
      var sd = this.splash[i]; sd.vy += 260 * dt; sd.x += sd.vx * dt; sd.y += sd.vy * dt; sd.a -= dt * 1.7; if (sd.a <= 0) { this.splash.splice(i, 1); continue; }
      ctx.fillStyle = 'rgba(190,225,255,' + (0.8 * sd.a).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(sd.x, sd.y, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // ---- burette
    if (this.burette) this._burette(ctx, dt, once, cx, bw, topY, tipY, surfY, ry, ink);
  };

  Beaker.prototype._probe = function (ctx, px, topY, surfY, yb, bh, th, ink, inside) {
    var bulbY = surfY + (yb - surfY) * 0.62, sway = Math.sin(this.t * 1.2) * 0.8, x = px + sway, w = 6.5, top = topY - bh * 0.34;
    ctx.save();
    if (inside) { ctx.globalAlpha = 0.9; var g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(210,225,240,.35)'); ctx.fillStyle = g; ctx.fillRect(x - w / 2, surfY - 2, w, bulbY - surfY + 2);
      ctx.fillStyle = 'rgba(70,130,200,.55)'; ctx.beginPath(); ctx.ellipse(x, bulbY + 3, w * 0.78, 6.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, bulbY + 3, w * 0.78, 6.5, 0, 0, Math.PI * 2); ctx.stroke(); }
    else { var tube = ctx.createLinearGradient(x - w, 0, x + w, 0); tube.addColorStop(0, 'rgba(255,255,255,.55)'); tube.addColorStop(0.5, 'rgba(235,242,250,.35)'); tube.addColorStop(1, 'rgba(200,215,232,.28)');
      ctx.fillStyle = tube; ctx.fillRect(x - w / 2, topY - bh * 0.12, w, surfY - topY + bh * 0.12);
      ctx.fillStyle = '#3b4656'; ctx.fillRect(x - w / 2 - 1.5, top + 8, w + 3, topY - bh * 0.12 - top - 8 + 2);
      ctx.fillStyle = '#c8d1dc'; ctx.fillRect(x - w / 2 - 2.5, topY - bh * 0.12 - 3, w + 5, 4);
      ctx.strokeStyle = ink; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, top + 8); ctx.bezierCurveTo(x, top - 4, x + 18, top - 2, x + 22, top - 14); ctx.stroke(); }
    ctx.restore();
  };

  Beaker.prototype._burette = function (ctx, dt, once, cx, bw, topY, tipY, surfY, ry, ink) {
    var tw = bw * 0.15, bx0 = cx - tw / 2, bx1 = cx + tw / 2, by0 = 2, valve = tipY - 20, tubeBot = valve - 4, i;
    var open = this.dropRate > 0, stream = this.dropRate > 14;
    // tube glass + titrant
    var fillTop = by0 + 6 + (tubeBot - by0 - 6) * (1 - this.buretteFill);
    var lg = ctx.createLinearGradient(bx0, 0, bx1, 0); lg.addColorStop(0, 'rgba(150,200,255,.55)'); lg.addColorStop(0.5, 'rgba(190,225,255,.28)'); lg.addColorStop(1, 'rgba(150,200,255,.5)');
    ctx.fillStyle = lg; ctx.fillRect(bx0 + 1, fillTop, tw - 2, Math.max(0, tubeBot - fillTop));
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(cx, fillTop, (tw - 2) / 2, 2.2, 0, 0, Math.PI * 2); ctx.fill();    // meniscus
    ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.globalAlpha = 0.62; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(bx0, tubeBot); ctx.moveTo(bx1, by0); ctx.lineTo(bx1, tubeBot); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    for (i = 1; i < 30; i++) { var gy = by0 + 6 + (tubeBot - by0 - 6) * i / 30; ctx.beginPath(); ctx.moveTo(bx0, gy); ctx.lineTo(bx0 + (i % 5 === 0 ? tw * 0.55 : i % 5 === 3 ? tw * 0.3 : tw * 0.2), gy); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // stopcock
    ctx.fillStyle = '#586274'; ctx.fillRect(cx - tw * 0.5 - 1, valve - 3, tw + 2, 7);
    ctx.save(); ctx.translate(cx, valve + 0.5); ctx.rotate(open ? Math.PI / 2 : 0); ctx.fillStyle = '#d9dee6'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-tw * 0.95, -2.2, tw * 1.9, 4.4, 2.2); else ctx.rect(-tw * 0.95, -2.2, tw * 1.9, 4.4); ctx.fill(); ctx.restore();
    // tip
    ctx.strokeStyle = ink; ctx.globalAlpha = 0.62; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(bx0, valve + 4); ctx.lineTo(cx - 2, tipY); ctx.moveTo(bx1, valve + 4); ctx.lineTo(cx + 2, tipY); ctx.stroke(); ctx.globalAlpha = 1;
    // hanging drop grows, detaches, falls
    if (open && !stream && !once) {
      this.dropClock += dt * this.dropRate;
      if (this.dropClock >= 1) { this.dropClock -= 1; this.drops.push({ y: tipY + 4, v: 20 }); }
    } else if (!open) this.dropClock = 0;
    if (open && !stream) { var gr = Math.min(1, this.dropClock); ctx.fillStyle = 'rgba(175,215,255,.85)'; ctx.beginPath(); ctx.ellipse(cx, tipY + 2 + gr * 3, 1.2 + gr * 2.4, 1 + gr * 3.4, 0, 0, Math.PI * 2); ctx.fill(); }
    if (stream && !once) {
      ctx.strokeStyle = 'rgba(175,215,255,.8)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(cx, tipY); ctx.lineTo(cx, surfY); ctx.stroke();
      this.dropClock += dt; if (this.dropClock > 0.09) { this.dropClock = 0; this._impact(cx, surfY, ry); this.ripples.length > 6 && this.ripples.splice(0, 2); }
    }
    for (i = this.drops.length - 1; i >= 0; i--) {
      var d = this.drops[i]; d.v += 640 * dt; d.y += d.v * dt;
      if (d.y >= surfY) { this._impact(cx, surfY, ry); this.drops.splice(i, 1); continue; }
      var st = Math.min(1.9, 1 + d.v / 360); ctx.fillStyle = 'rgba(175,215,255,.92)'; ctx.beginPath(); ctx.ellipse(cx, d.y, 2.5, 3.1 * st, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(cx - 0.8, d.y - 1.2, 0.8, 0, Math.PI * 2); ctx.fill();
    }
  };

  root.PHLabViz = {
    universalColor: universalColor, indicatorColor: indicatorColor, indicatorFraction: indicatorFraction, rgba: rgba, mix: mix, WATER: WATER,
    toUnicode: toUnicode, Beaker: Beaker, reduceMotion: reduceMotion
  };
})(typeof window !== 'undefined' ? window : globalThis);

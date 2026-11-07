/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-3d.js
   A fast 3D renderer on a plain 2D canvas (no WebGL, no libraries): molecules use a per-pixel-depth ray-cast pass (solid pass); big crystals use the sprite/painter path.
     · perspective projection, free rotation (drag, with inertia), zoom (wheel / pinch), double-tap = reset view
     · shaded sphere sprites cached per colour and size → thousands of ions stay smooth (crystal lattices)
     · bonds are real tubes (two coloured halves, highlight, double/triple/fractional bonds), translucent electron clouds,
       lone-pair lobes, dipole arrows, billboard labels; painter's algorithm on projected depth
     · the loop runs only while something moves and only while the canvas is on screen
   Scene = { radius, fog, items:[…], anim:{dur, update(p, scene)}, live(tSeconds) (optional: called every frame while on screen) }   (units: Å)
     item.t  's' sphere {x,y,z,r,c,a,label}  'b' bond {p,q,r,c1,c2,o}  'k' cloud {x,y,z,r,c,a}  'e' lens cloud {p,q,r,c,a}
             'a' arrow {p,q,c,w}  'l' line {p,q,c,a,w,dash}  't' text {x,y,z,text,c,size,dx,dy}
             'o' orbital lobe {x,y,z,d:[dx,dy,dz],L,w,c,a}
   ========================================================================== */
(function (root) {
  'use strict';
  var reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')'; }
  function hex(h) { if (!h) return [170, 180, 195]; return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }

  var sprites = {}, clouds = {}, nSp = 0;
  function sphereSprite(c, d) {
    var key = c[0] + ',' + c[1] + ',' + c[2] + '|' + d, s = sprites[key]; if (s) return s;
    if (nSp > 500) { sprites = {}; nSp = 0; }
    var cv = root.document.createElement('canvas'); cv.width = cv.height = d; var x = cv.getContext('2d'), r = d / 2;
    var g = x.createRadialGradient(r * 0.62, r * 0.55, r * 0.05, r * 0.9, r * 0.9, r * 1.02);
    g.addColorStop(0, css(mix(c, [255, 255, 255], 0.62))); g.addColorStop(0.32, css(mix(c, [255, 255, 255], 0.12))); g.addColorStop(0.72, css(c)); g.addColorStop(1, css(mix(c, [0, 0, 0], 0.55)));
    x.fillStyle = g; x.beginPath(); x.arc(r, r, r - 0.5, 0, 6.2832); x.fill();
    x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = Math.max(1, d / 60); x.stroke();
    var h = x.createRadialGradient(r * 0.6, r * 0.5, 0, r * 0.6, r * 0.5, r * 0.34); h.addColorStop(0, 'rgba(255,255,255,.78)'); h.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = h; x.beginPath(); x.arc(r * 0.6, r * 0.5, r * 0.34, 0, 6.2832); x.fill();
    nSp++; return (sprites[key] = cv);
  }
  function cloudSprite(c, d) {
    var key = c[0] + ',' + c[1] + ',' + c[2] + '|' + d, s = clouds[key]; if (s) return s;
    var cv = root.document.createElement('canvas'); cv.width = cv.height = d; var x = cv.getContext('2d'), r = d / 2, g = x.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, css(mix(c, [255, 255, 255], 0.35), 0.95)); g.addColorStop(0.45, css(c, 0.55)); g.addColorStop(1, css(c, 0));
    x.fillStyle = g; x.fillRect(0, 0, d, d); return (clouds[key] = cv);
  }
  function bucket(d) { return d < 24 ? Math.max(4, Math.round(d / 2) * 2) : d < 96 ? Math.round(d / 6) * 6 : Math.round(d / 16) * 16; }

  function Viewer(cv, opts) {
    var self = this; opts = opts || {};
    this.cv = cv; this.sc = null; this.zoom = 1; this.autoRotate = false; this.R = [1, 0, 0, 0, 1, 0, 0, 0, 1]; this.vx = 0; this.vy = 0;
    this.dragging = false; this.visible = true; this.raf = 0; this.dirty = true; this.last = 0; this.ptrs = {}; this.pinch = 0; this.onFrame = null;
    cv.style.touchAction = 'none'; cv.style.cursor = 'grab';
    this.resetView(true);
    cv.addEventListener('pointerdown', function (e) {
      try { cv.setPointerCapture(e.pointerId); } catch (x) { }
      self.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; var ids = Object.keys(self.ptrs);
      if (ids.length === 2) { self.pinch = self.pdist(); } else { self.dragging = true; self.vx = self.vy = 0; cv.style.cursor = 'grabbing'; }
      self.lastMove = e.timeStamp; self.wake();
      var rr = cv.getBoundingClientRect(), nowT = e.timeStamp;                    // five quick taps in the bottom-left corner switch the speed read-out on/off (for tuning on the device)
      if (e.clientX - rr.left < 44 && rr.bottom - e.clientY < 44) { self.cornerT = (nowT - (self.cornerLast || 0) < 900 ? (self.cornerT || 0) : 0) + 1; self.cornerLast = nowT; if (self.cornerT >= 5) { self.cornerT = 0; try { root.localStorage.setItem('multicalc_bs_perf', self.showPerf() ? '0' : '1'); } catch (x) { } self.dirty = true; self.wake(); } }
    });
    cv.addEventListener('pointermove', function (e) {
      var p = self.ptrs[e.pointerId]; if (!p) return; var ids = Object.keys(self.ptrs);
      if (ids.length >= 2) { p.x = e.clientX; p.y = e.clientY; var d = self.pdist(); if (self.pinch > 0) self.setZoom(self.zoom * d / self.pinch); self.pinch = d; return; }
      var dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; self.drag(dx, dy);
      self.vx = dx * 0.5 + self.vx * 0.5; self.vy = dy * 0.5 + self.vy * 0.5; self.lastMove = e.timeStamp;
    });
    function up(e) { delete self.ptrs[e.pointerId]; self.pinch = 0; if (!Object.keys(self.ptrs).length) { self.dragging = false; cv.style.cursor = 'grab'; if (reduce || e.timeStamp - self.lastMove > 90) self.vx = self.vy = 0; self.wake(); } }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', function (e) { e.preventDefault(); self.setZoom(self.zoom * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    cv.addEventListener('dblclick', function () { self.resetView(); });
    if (root.ResizeObserver) { this.ro = new root.ResizeObserver(function () { self.dirty = true; self.wake(); }); this.ro.observe(cv); }
    if (root.IntersectionObserver) { this.io = new root.IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; if (self.visible) self.wake(); }, { threshold: 0.01 }); this.io.observe(cv); }
  }
  Viewer.prototype.pdist = function () { var k = Object.keys(this.ptrs), a = this.ptrs[k[0]], b = this.ptrs[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); };
  Viewer.prototype.setZoom = function (z) { this.zoom = clamp(z, 0.3, 7); this.dirty = true; this.wake(); };
  Viewer.prototype.resetView = function (silent) {
    this.R = [1, 0, 0, 0, 1, 0, 0, 0, 1]; this.rotate(0, -0.45); this.rotate(0.38, 0); this.zoom = 1; this.vx = this.vy = 0; this.dirty = true; if (!silent) this.wake();
  };
  Viewer.prototype.rotate = function (ax, ay) {          // ax = about screen-Y (yaw), ay = about screen-X (pitch), radians
    var cy = Math.cos(ax), sy = Math.sin(ax), cx = Math.cos(ay), sx = Math.sin(ay), R = this.R;
    var Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy], Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
    this.R = mm(Rx, mm(Ry, R)); this.dirty = true;
  };
  function mm(a, b) { var o = new Array(9), i, j; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return o; }
  Viewer.prototype.drag = function (dx, dy) { this.rotate(dx * 0.011, dy * 0.011); this.wake(); };
  Viewer.prototype.setScene = function (sc) { this.sc = sc; this.dirty = true; this.playing = false; this.lite = false; this.slowN = 0; this.wake(); };
  Viewer.prototype.showPerf = function () { try { return root.localStorage.getItem('multicalc_bs_perf') === '1'; } catch (e) { return false; } };
  Viewer.prototype.play = function (onEnd) { if (!this.sc || !this.sc.anim) return; this.t0 = 0; this.playing = true; this.onEnd = onEnd || null; this.wake(); };
  Viewer.prototype.wake = function () { var self = this; if (this.raf || !this.visible) return; this.raf = root.requestAnimationFrame(function (ts) { self.raf = 0; self.tick(ts); }); };
  Viewer.prototype.tick = function (ts) {
    var dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0.016; this.last = ts;
    if (this.playing && this.sc && this.sc.anim) {
      if (!this.t0) this.t0 = ts; var p = clamp((ts - this.t0) / this.sc.anim.dur, 0, 1);
      this.sc.anim.update(p, this.sc, this); this.dirty = true;
      if (p >= 1) { this.playing = false; if (this.onEnd) this.onEnd(); }
    }
    var moving = false;
    if (this.sc && this.sc.live && !reduce) { this.sc.live(ts / 1000, this); this.dirty = true; moving = true; }
    if (!this.dragging && !reduce && (Math.abs(this.vx) > 0.02 || Math.abs(this.vy) > 0.02)) { var f = Math.pow(0.92, dt * 60); this.rotate(this.vx * 0.011, this.vy * 0.011); this.vx *= f; this.vy *= f; moving = true; }
    if (this.autoRotate && !this.dragging && !reduce) { this.rotate(0.35 * dt, 0); moving = true; }
    if (this.dirty) this.draw();
    if (!moving && !this.playing && !this.dragging && this.coarse) { this.coarse = false; this.dirty = true; this.draw(); }   // settle: one full-quality frame
    if (moving || this.playing || this.dragging || this.autoRotate && !reduce) { this.last = ts; this.wake(); } else this.last = 0;
    if (this.onFrame) this.onFrame(this);
  };

  Viewer.prototype.drawLegacy = function (scO, keep) {
    var cv = this.cv, sc = scO || this.sc, r = cv.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 2.5), W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (!W || !H) return; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); if (!keep) ctx.clearRect(0, 0, W, H); this.dirty = false; if (!sc) return;
    var R = this.R, rad = sc.radius || 3, S = Math.min(W, H) / (2.15 * rad) * this.zoom, F = rad * 6 + 6, cx = W / 2, cy = H / 2, items = sc.items, n = items.length, ops = [], batch = [], bstyle = null, i, it;
    var ink = root.getComputedStyle(cv).color || 'rgb(230,230,230)', fog = sc.fog !== false;
    function P(x, y, z) { var X = R[0] * x + R[1] * y + R[2] * z, Y = R[3] * x + R[4] * y + R[5] * z, Z = R[6] * x + R[7] * y + R[8] * z, k = F / (F - Z); return { x: cx + X * S * k, y: cy - Y * S * k, z: Z, k: k }; }
    function fogA(z) { return fog ? 0.7 + 0.3 * clamp((z + rad) / (2 * rad), 0, 1) : 1; }
    for (i = 0; i < n; i++) {
      it = items[i]; if (it.t === 's' && !(isFinite(it.x) && isFinite(it.y) && isFinite(it.z) && it.r > 0)) continue;   // never let one bad number break the frame
      switch (it.t) {
        case 's': { var p = P(it.x, it.y, it.z); ops.push({ z: p.z, t: 's', x: p.x, y: p.y, r: it.r * S * p.k, it: it, a: (it.a === undefined ? 1 : it.a) * fogA(p.z) }); break; }
        case 'k': { var pk = P(it.x, it.y, it.z); ops.push({ z: pk.z - 0.02, t: 'k', x: pk.x, y: pk.y, r: it.r * S * pk.k, it: it }); break; }
        case 'b': {
          var a = P(it.p[0], it.p[1], it.p[2]), b = P(it.q[0], it.q[1], it.q[2]), m = P((it.p[0] + it.q[0]) / 2, (it.p[1] + it.q[1]) / 2, (it.p[2] + it.q[2]) / 2);
          var al = (it.a === undefined ? 1 : it.a);
          ops.push({ z: (a.z + m.z) / 2, t: 'b', a: a, b: m, it: it, c: it.c1, al: al * fogA(a.z) }); ops.push({ z: (b.z + m.z) / 2, t: 'b', a: b, b: m, it: it, c: it.c2, al: al * fogA(b.z) }); break;
        }
        case 'e': { var e1 = P(it.p[0], it.p[1], it.p[2]), e2 = P(it.q[0], it.q[1], it.q[2]); ops.push({ z: (e1.z + e2.z) / 2 - 0.03, t: 'e', a: e1, b: e2, r: it.r * S * (e1.k + e2.k) / 2, it: it }); break; }
        case 'o': { var o1 = P(it.x, it.y, it.z), o2 = P(it.x + it.d[0] * it.L, it.y + it.d[1] * it.L, it.z + it.d[2] * it.L); ops.push({ z: (o1.z + o2.z) / 2 + (it.zb || 0), t: 'o', a: o1, b: o2, w: it.w * S * (o1.k + o2.k) / 2, it: it }); break; }
        case 'l': case 'a': { var l1 = P(it.p[0], it.p[1], it.p[2]), l2 = P(it.q[0], it.q[1], it.q[2]); if (it.batch) { batch.push(l1, l2); bstyle = it; break; } ops.push({ z: it.t === 'a' ? 1e5 : (l1.z + l2.z) / 2, t: it.t, a: l1, b: l2, it: it }); break; }
        case 't': { var tp = P(it.x, it.y, it.z); ops.push({ z: 1e5 + tp.z, t: 't', x: tp.x, y: tp.y, it: it }); break; }
      }
    }
    if (batch.length) {                                   // thousands of lattice links in ONE path (drawn behind the ions)
      ctx.strokeStyle = css(bstyle.c || [200, 200, 210], bstyle.a === undefined ? 0.3 : bstyle.a); ctx.lineWidth = (bstyle.w || 1.1) * dpr; ctx.beginPath();
      for (i = 0; i < batch.length; i += 2) { ctx.moveTo(batch[i].x, batch[i].y); ctx.lineTo(batch[i + 1].x, batch[i + 1].y); } ctx.stroke();
    }
    ops.sort(function (u, v) { return u.z - v.z; });
    for (i = 0; i < ops.length; i++) {
      var o = ops[i];
      if (o.t === 's') {
        var d = bucket(Math.max(3, o.r * 2)), spr = sphereSprite(o.it.c, d), dd = o.r * 2;
        if (o.a < 1) ctx.globalAlpha = o.a; ctx.drawImage(spr, o.x - dd / 2, o.y - dd / 2, dd, dd); if (o.a < 1) ctx.globalAlpha = 1;
        if (o.it.label && o.r > 7 * dpr) { var fs = Math.min(o.r * 0.95, 17 * dpr); ctx.font = '700 ' + fs.toFixed(1) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = fs * 0.14; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.fillStyle = '#fff'; ctx.strokeText(o.it.label, o.x, o.y + fs * 0.04); ctx.fillText(o.it.label, o.x, o.y + fs * 0.04); }
      } else if (o.t === 'k') {
        var dc = bucket(Math.max(6, o.r * 2)), cs = cloudSprite(o.it.c, dc); ctx.globalAlpha = clamp(o.it.a === undefined ? 0.6 : o.it.a, 0, 1); ctx.drawImage(cs, o.x - o.r, o.y - o.r, o.r * 2, o.r * 2); ctx.globalAlpha = 1;
      } else if (o.t === 'e') {
        var ex = (o.a.x + o.b.x) / 2, ey = (o.a.y + o.b.y) / 2, ang = Math.atan2(o.b.y - o.a.y, o.b.x - o.a.x), semi = Math.hypot(o.b.x - o.a.x, o.b.y - o.a.y) / 2 + o.r * 0.55, dc2 = bucket(Math.max(8, o.r * 2)), cs2 = cloudSprite(o.it.c, dc2);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang); ctx.globalAlpha = clamp(o.it.a === undefined ? 0.7 : o.it.a, 0, 1); ctx.drawImage(cs2, -semi, -o.r, semi * 2, o.r * 2); ctx.restore(); ctx.globalAlpha = 1;
      } else if (o.t === 'b') { drawBond(ctx, o, S, dpr); }
      else if (o.t === 'o') { drawLobe(ctx, o, dpr); }
      else if (o.t === 'l') {
        ctx.strokeStyle = o.it.c ? css(o.it.c, o.it.a === undefined ? 0.5 : o.it.a) : ink; ctx.globalAlpha = o.it.c ? 1 : (o.it.a === undefined ? 0.35 : o.it.a); ctx.lineWidth = (o.it.w || 1.2) * dpr; ctx.setLineDash(o.it.dash ? [5 * dpr, 5 * dpr] : []);
        ctx.beginPath(); ctx.moveTo(o.a.x, o.a.y); ctx.lineTo(o.b.x, o.b.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else if (o.t === 'a') {
        var c = o.it.c || [255, 176, 32], w = (o.it.w || 3.2) * dpr, vx = o.b.x - o.a.x, vy = o.b.y - o.a.y, L = Math.hypot(vx, vy); if (L < 4) continue;
        var ux = vx / L, uy = vy / L, hl = Math.min(L * 0.5, 13 * dpr);
        ctx.strokeStyle = css(c, 0.95); ctx.fillStyle = css(c, 0.95); ctx.lineWidth = w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(o.a.x, o.a.y); ctx.lineTo(o.b.x - ux * hl * 0.7, o.b.y - uy * hl * 0.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(o.b.x, o.b.y); ctx.lineTo(o.b.x - ux * hl - uy * hl * 0.5, o.b.y - uy * hl + ux * hl * 0.5); ctx.lineTo(o.b.x - ux * hl + uy * hl * 0.5, o.b.y - uy * hl - ux * hl * 0.5); ctx.closePath(); ctx.fill();
        ctx.lineWidth = w * 0.7; ctx.beginPath(); ctx.moveTo(o.a.x - uy * 5 * dpr, o.a.y + ux * 5 * dpr); ctx.lineTo(o.a.x + uy * 5 * dpr, o.a.y - ux * 5 * dpr); ctx.stroke(); ctx.lineCap = 'butt';
      } else if (o.t === 't') {
        var fs2 = (o.it.size || 13) * dpr; ctx.font = '600 ' + fs2 + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var tx = o.x + (o.it.dx || 0) * dpr, ty = o.y + (o.it.dy || 0) * dpr; ctx.lineWidth = 3 * dpr; ctx.strokeStyle = o.it.halo || 'rgba(0,0,0,.35)'; ctx.fillStyle = o.it.c ? css(o.it.c) : ink; ctx.lineJoin = 'round'; ctx.strokeText(o.it.text, tx, ty); ctx.fillText(o.it.text, tx, ty);
      }
    }
  };
  /* an orbital lobe: narrow at the nucleus, round at the far end, translucent, phase colour (blue + / red −) */
  function drawLobe(ctx, o, dpr) {
    var a = o.a, b = o.b, vx = b.x - a.x, vy = b.y - a.y, L = Math.hypot(vx, vy), c = o.it.c, al = o.it.a === undefined ? 0.6 : o.it.a, w = o.w;
    if (L < 2) { ctx.fillStyle = css(c, al); ctx.beginPath(); ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(2, w), 0, 6.2832); ctx.fill(); return; }
    var ux = vx / L, uy = vy / L, nx = -uy, ny = ux;
    function X(u, v) { return a.x + ux * u + nx * v; } function Y(u, v) { return a.y + uy * u + ny * v; }
    ctx.beginPath(); ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo(X(0.12 * L, 1.35 * w), Y(0.12 * L, 1.35 * w), X(0.98 * L, 1.55 * w), Y(0.98 * L, 1.55 * w), X(L, 0), Y(L, 0));
    ctx.bezierCurveTo(X(0.98 * L, -1.55 * w), Y(0.98 * L, -1.55 * w), X(0.12 * L, -1.35 * w), Y(0.12 * L, -1.35 * w), a.x, a.y); ctx.closePath();
    var g = ctx.createRadialGradient(X(0.6 * L, 0), Y(0.6 * L, 0), 0, X(0.6 * L, 0), Y(0.6 * L, 0), Math.max(4, L * 0.62));
    g.addColorStop(0, css(mix(c, [255, 255, 255], 0.35), Math.min(1, al + 0.15))); g.addColorStop(0.7, css(c, al)); g.addColorStop(1, css(c, al * 0.55));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = css(mix(c, [255, 255, 255], 0.55), Math.min(1, al + 0.25)); ctx.lineWidth = 1.1 * dpr; ctx.stroke();
  }
  function drawBond(ctx, o, S, dpr) {
    var it = o.it, a = o.a, b = o.b, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy); if (L < 0.5) return;
    var nx = -dy / L, ny = dx / L, k = (a.k + b.k) / 2, r = (it.r || 0.11) * S * k, whole = Math.floor(it.o + 0.001), frac = it.o - whole, n = whole + (frac > 0.05 ? 1 : 0), sp = r * 2.35, off = -(n - 1) / 2 * sp, j;
    var c = o.c, A = o.al; if (A < 1) ctx.globalAlpha = A;
    ctx.lineCap = 'butt';
    for (j = 0; j < n; j++) {
      var ox = nx * (off + j * sp), oy = ny * (off + j * sp), dashed = j >= whole, w = n > 1 ? r * (n === 2 ? 0.78 : 0.7) : r;
      if (dashed) ctx.setLineDash([w * 1.5, w * 1.4]);
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = w * 2 + 1.5 * dpr; ctx.beginPath(); ctx.moveTo(a.x + ox, a.y + oy); ctx.lineTo(b.x + ox, b.y + oy); ctx.stroke();
      ctx.strokeStyle = css(c); ctx.lineWidth = w * 2; ctx.beginPath(); ctx.moveTo(a.x + ox, a.y + oy); ctx.lineTo(b.x + ox, b.y + oy); ctx.stroke();
      ctx.strokeStyle = css(mix(c, [255, 255, 255], 0.55), 0.8); ctx.lineWidth = w * 0.7; ctx.beginPath(); ctx.moveTo(a.x + ox - nx * w * 0.35, a.y + oy - ny * w * 0.35); ctx.lineTo(b.x + ox - nx * w * 0.35, b.y + oy - ny * w * 0.35); ctx.stroke();
      if (dashed) ctx.setLineDash([]);
    }
    if (A < 1) ctx.globalAlpha = 1;
  }
  /* ===== SOLID PASS — per-pixel depth: spheres, bond cylinders and translucent 3D lobes/clouds are ray-cast in software.
     Every pixel keeps its own depth, so bonds enter/leave atoms correctly and nothing flips order when the view rotates. ===== */
  function n3(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  var LA = n3([-0.42, 0.62, 0.66]), LB = n3([0.7, -0.25, 0.45]), LH = n3([LA[0], LA[1], LA[2] + 1]);
  function shade(nx, ny, nz, c, o, k) {
    var l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    var d1 = nx * LA[0] + ny * LA[1] + nz * LA[2], d2 = nx * LB[0] + ny * LB[1] + nz * LB[2], h = nx * LH[0] + ny * LH[1] + nz * LH[2];
    var lum = (0.3 + 0.78 * (d1 > 0 ? d1 : 0) + 0.18 * (d2 > 0 ? d2 : 0)) * k, sp = h > 0 ? Math.pow(h, 64) * 0.6 : 0, rim = Math.pow(1 - (nz < 0 ? 0 : nz), 3) * 0.2;
    o[0] = clamp(c[0] * lum + 255 * sp + 110 * rim, 0, 255); o[1] = clamp(c[1] * lum + 255 * sp + 120 * rim, 0, 255); o[2] = clamp(c[2] * lum + 255 * sp + 140 * rim, 0, 255);
  }
  /* pr = {sph:[{X,Y,Z,r,k,c,f}], cyl:[{A,u,L,w,k,c1,c2,dash,Z}], tr:[{Cx,Cy,Cz,u,a,b,k,c,al,Z}]} (view space, Å)   cam = {S,cx,cy} */
  function raster(w, h_, pr, cam) {
    var h = h_;
    var data = new Uint8ClampedArray(w * h * 4), zb = new Float32Array(w * h), S = cam.S, cx = cam.cx, cy = cam.cy, tmp = [0, 0, 0], i, x, y, p;
    zb.fill(-1e9);
    function put(idx, z, c, cov) {
      var o = idx << 2; zb[idx] = z;
      if (cov >= 0.995) { data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255; return; }
      var da = data[o + 3] / 255, oa = cov + da * (1 - cov); data[o] = (c[0] * cov + data[o] * da * (1 - cov)) / oa; data[o + 1] = (c[1] * cov + data[o + 1] * da * (1 - cov)) / oa; data[o + 2] = (c[2] * cov + data[o + 2] * da * (1 - cov)) / oa; data[o + 3] = oa * 255;
    }
    function blend(idx, c, a) {
      var o = idx << 2, da = data[o + 3] / 255, oa = a + da * (1 - a); data[o] = (c[0] * a + data[o] * da * (1 - a)) / oa; data[o + 1] = (c[1] * a + data[o + 1] * da * (1 - a)) / oa; data[o + 2] = (c[2] * a + data[o + 2] * da * (1 - a)) / oa; data[o + 3] = oa * 255;
    }
    pr.sph.sort(function (a, b) { return a.Z - b.Z; });
    for (i = 0; i < pr.sph.length; i++) {
      p = pr.sph[i]; var sk = S * p.k, x0 = cx + p.X * sk, y0 = cy - p.Y * sk, rr = p.r * sk, inv = 1 / sk, r2 = p.r * p.r;
      var xa = Math.max(0, Math.floor(x0 - rr - 1)), xb = Math.min(w - 1, Math.ceil(x0 + rr + 1)), ya = Math.max(0, Math.floor(y0 - rr - 1)), yb = Math.min(h - 1, Math.ceil(y0 + rr + 1));
      for (y = ya; y <= yb; y++) for (x = xa; x <= xb; x++) {
        var dx = x + 0.5 - x0, dy = y + 0.5 - y0, cov = rr - Math.sqrt(dx * dx + dy * dy) + 0.5; if (cov <= 0) continue; if (cov > 1) cov = 1;
        var ax = dx * inv, ay = -dy * inv, d2 = ax * ax + ay * ay; if (d2 > r2 * 0.9996) d2 = r2 * 0.9996;
        var nz = Math.sqrt(1 - d2 / r2), z = p.Z + p.r * nz, idx = y * w + x; if (z <= zb[idx]) continue;
        shade(ax / p.r, ay / p.r, nz, p.c, tmp, p.f); put(idx, z, tmp, cov);
      }
    }
    pr.cyl.sort(function (a, b) { return a.Z - b.Z; });
    for (i = 0; i < pr.cyl.length; i++) {
      p = pr.cyl[i]; var A = p.A, u = p.u, uz = u[2], a = 1 - uz * uz; if (a < 1e-4) continue;
      var sa = Math.sqrt(a), sk2 = S * p.k, inv2 = 1 / sk2, B = [A[0] + u[0] * p.L, A[1] + u[1] * p.L], pad = p.w * sk2 + 2;
      var px0 = cx + A[0] * sk2, py0 = cy - A[1] * sk2, px1 = cx + B[0] * sk2, py1 = cy - B[1] * sk2;
      var xa2 = Math.max(0, Math.floor(Math.min(px0, px1) - pad)), xb2 = Math.min(w - 1, Math.ceil(Math.max(px0, px1) + pad)), ya2 = Math.max(0, Math.floor(Math.min(py0, py1) - pad)), yb2 = Math.min(h - 1, Math.ceil(Math.max(py0, py1) + pad));
      var dpx = -uz * u[0], dpy = -uz * u[1], dpz = 1 - uz * uz, ww2 = p.w * p.w;
      for (y = ya2; y <= yb2; y++) for (x = xa2; x <= xb2; x++) {
        var X = (x + 0.5 - cx) * inv2, Y = -(y + 0.5 - cy) * inv2, wx = X - A[0], wy = Y - A[1], wz = -A[2], wu = wx * u[0] + wy * u[1] + wz * uz;
        var qx = wx - wu * u[0], qy = wy - wu * u[1], qz = wz - wu * uz, b = qx * dpx + qy * dpy + qz * dpz, qq = qx * qx + qy * qy + qz * qz;
        var dmin = Math.sqrt(Math.max(qq - b * b / a, 0)), e = (p.w - dmin) / sa; if (e < -0.5 * inv2) continue;
        var cov2 = clamp(e * sk2 + 0.5, 0, 1), disc = b * b - a * (qq - ww2), t = (-b + Math.sqrt(disc > 0 ? disc : 0)) / a;
        var s = (X - A[0]) * u[0] + (Y - A[1]) * u[1] + (t - A[2]) * uz; if (s < 0 || s > p.L) continue;
        if (p.dash && (Math.floor(s / (p.w * 2.9)) & 1)) continue;
        var idx2 = y * w + x; if (t <= zb[idx2]) continue;
        var f = clamp(((s / p.L - 0.5) / 0.08) * 0.5 + 0.5, 0, 1), col = [p.c1[0] + (p.c2[0] - p.c1[0]) * f, p.c1[1] + (p.c2[1] - p.c1[1]) * f, p.c1[2] + (p.c2[2] - p.c1[2]) * f];
        shade(qx + t * dpx, qy + t * dpy, qz + t * dpz, col, tmp, 1); put(idx2, t, tmp, cov2);
      }
    }
    /* wavefunction isosurface (BSWave field): ray-marched front-to-back, several translucent hits per pixel, optional cut-away plane */
    function wave(p) {
      var f = p.f, n = f.n, h = f.h, dat = f.data, iso = f.iso, M = p.M, sc = p.s, is = 1 / sc, sk = S * p.k, rb = f.ext * sc * 1.06 + 0.02, st = (n - 1) / (2 * h), cut = p.cut, N = cam.lite ? 18 : 34, x, y, i;
      var cxp = cx + p.Cx * sk, cyp = cy - p.Cy * sk, rp = rb * sk + 2, d0 = M[6] * is, d1 = M[7] * is, d2 = M[8] * is, ge = 1.7 / st;
      function smp(ox, oy, oz) {
        var gx = (ox + h) * st, gy = (oy + h) * st, gz = (oz + h) * st; if (gx < 0 || gy < 0 || gz < 0 || gx >= n - 1 || gy >= n - 1 || gz >= n - 1) return 0;
        var ix = gx | 0, iy = gy | 0, iz = gz | 0, fx = gx - ix, fy = gy - iy, fz = gz - iz, b = (iz * n + iy) * n + ix, nn = n * n;
        var c00 = dat[b] * (1 - fx) + dat[b + 1] * fx, c10 = dat[b + n] * (1 - fx) + dat[b + n + 1] * fx, c01 = dat[b + nn] * (1 - fx) + dat[b + nn + 1] * fx, c11 = dat[b + nn + n] * (1 - fx) + dat[b + nn + n + 1] * fx;
        return (c00 * (1 - fy) + c10 * fy) * (1 - fz) + (c01 * (1 - fy) + c11 * fy) * fz;
      }
      for (y = Math.max(0, Math.floor(cyp - rp)); y <= Math.min(h_ - 1, Math.ceil(cyp + rp)); y++) for (x = Math.max(0, Math.floor(cxp - rp)); x <= Math.min(w - 1, Math.ceil(cxp + rp)); x++) {
        var X = (x + 0.5 - cx) / sk, Y = -(y + 0.5 - cy) / sk, dx = X - p.Cx, dy = Y - p.Cy, dd = dx * dx + dy * dy; if (dd >= rb * rb) continue;
        var idx = y * w + x, half = Math.sqrt(rb * rb - dd), thi = p.Cz + half, tlo = p.Cz - half, zz = zb[idx]; if (zz > tlo) tlo = zz; if (tlo >= thi) continue;
        var ox0 = is * (M[0] * dx + M[3] * dy - M[6] * p.Cz), oy0 = is * (M[1] * dx + M[4] * dy - M[7] * p.Cz), oz0 = is * (M[2] * dx + M[5] * dy - M[8] * p.Cz), dt = (thi - tlo) / N;
        var pv = false, pc = false, pt = thi, T = 1, ar = 0, ag = 0, ab = 0, hits = 0;
        for (i = 0; i <= N && T > 0.1 && hits < 4; i++) {
          var t = thi - i * dt, ox = ox0 + t * d0, oy = oy0 + t * d1, oz = oz0 + t * d2, cl = cut && (cut[0] * ox + cut[1] * oy + cut[2] * oz > 0), v = smp(ox, oy, oz), raw = Math.abs(v) > iso, vis = raw && !cl;
          if (vis && !pv) {
            var hx, hy, hz, nx, ny, nz, hv;
            var cap = false;
            if (pc) { cap = true;                                      // the ray came through the cut plane: cross-section cap, brightness follows |ψ| (radial nodes show as dark rings)
              var den = cut[0] * d0 + cut[1] * d1 + cut[2] * d2, tc = Math.abs(den) > 1e-9 ? -(cut[0] * ox0 + cut[1] * oy0 + cut[2] * oz0) / den : t; hx = ox0 + tc * d0; hy = oy0 + tc * d1; hz = oz0 + tc * d2; hv = smp(hx, hy, hz); nx = cut[0]; ny = cut[1]; nz = cut[2];
            } else {
              var ta = pt, tb = t, q; for (q = 0; q < 4; q++) { var tm = (ta + tb) / 2, a2 = Math.abs(smp(ox0 + tm * d0, oy0 + tm * d1, oz0 + tm * d2)); if (a2 > iso) tb = tm; else ta = tm; }
              hx = ox0 + tb * d0; hy = oy0 + tb * d1; hz = oz0 + tb * d2; hv = smp(hx, hy, hz);
              nx = -(Math.abs(smp(hx + ge, hy, hz)) - Math.abs(smp(hx - ge, hy, hz))); ny = -(Math.abs(smp(hx, hy + ge, hz)) - Math.abs(smp(hx, hy - ge, hz))); nz = -(Math.abs(smp(hx, hy, hz + ge)) - Math.abs(smp(hx, hy, hz - ge)));
            }
            var nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
            shade(M[0] * nx + M[1] * ny + M[2] * nz, M[3] * nx + M[4] * ny + M[5] * nz, M[6] * nx + M[7] * ny + M[8] * nz, hv >= 0 ? p.cp : p.cn, tmp, 1);
            if (cap) { var mu = 0.45 + 0.75 * Math.min(1, Math.abs(hv) / (iso * 2.6)); tmp[0] = Math.min(255, tmp[0] * mu); tmp[1] = Math.min(255, tmp[1] * mu); tmp[2] = Math.min(255, tmp[2] * mu); }
            ar += T * p.al * tmp[0]; ag += T * p.al * tmp[1]; ab += T * p.al * tmp[2]; T *= 1 - p.al; hits++;
          }
          pv = vis; pc = cl; pt = t;
        }
        if (T < 1) { var al = 1 - T; blend(idx, [ar / al, ag / al, ab / al], al); }
      }
    }
    (pr.ln || []).forEach(function (L) {                       // thin links (lattice, hydrogen bonds…): depth-tested, so they vanish inside atoms and behind them
      var dx = L.x1 - L.x0, dy = L.y1 - L.y0, n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))), kk, t, ix, iy, z, idx, thick = L.lw > 1.5, ox, oy;
      for (kk = 0; kk <= n; kk++) {
        if (L.dash && (Math.floor(kk / (3.5 * Math.max(1, L.lw))) & 1)) continue; t = n ? kk / n : 0; ix = (L.x0 + dx * t) | 0; iy = (L.y0 + dy * t) | 0; z = L.z0 + (L.z1 - L.z0) * t;
        for (oy = 0; oy <= (thick ? 1 : 0); oy++) for (ox = 0; ox <= (thick ? 1 : 0); ox++) { var px = ix + ox, py = iy + oy; if (px < 0 || py < 0 || px >= w || py >= h_) continue; idx = py * w + px; if (z > zb[idx]) blend(idx, L.c, L.a); }
      }
    });
    pr.tr.sort(function (a, b) { return a.Z - b.Z; });
    for (i = 0; i < pr.tr.length; i++) {
      p = pr.tr[i]; if (p.w) { wave(p); continue; } var u2 = p.u, uz2 = u2[2], ia = 1 / (p.a * p.a), ib = 1 / (p.b * p.b), A2 = (1 - uz2 * uz2) * ib + uz2 * uz2 * ia, sk3 = S * p.k, inv3 = 1 / sk3, rp = Math.max(p.a, p.b) * sk3 + 2, mn = 2 * Math.min(p.a, p.b);
      var cxp = cx + p.Cx * sk3, cyp = cy - p.Cy * sk3, xa3 = Math.max(0, Math.floor(cxp - rp)), xb3 = Math.min(w - 1, Math.ceil(cxp + rp)), ya3 = Math.max(0, Math.floor(cyp - rp)), yb3 = Math.min(h - 1, Math.ceil(cyp + rp));
      for (y = ya3; y <= yb3; y++) for (x = xa3; x <= xb3; x++) {
        var X3 = (x + 0.5 - cx) * inv3, Y3 = -(y + 0.5 - cy) * inv3, rx = X3 - p.Cx, ry = Y3 - p.Cy, rz = -p.Cz, qu = rx * u2[0] + ry * u2[1] + rz * uz2;
        var B3 = (rz - qu * uz2) * ib + qu * uz2 * ia, C3 = (rx * rx + ry * ry + rz * rz - qu * qu) * ib + qu * qu * ia - 1, dc = B3 * B3 - A2 * C3; if (dc <= 0) continue;
        var sq = Math.sqrt(dc), tf = (-B3 + sq) / A2, tb = (-B3 - sq) / A2, idx3 = y * w + x, zz = zb[idx3]; if (tf <= zz) continue;
        var chord = tf - (tb > zz ? tb : zz), hz = rz + tf, hu = rx * u2[0] + ry * u2[1] + hz * uz2;
        shade((rx - hu * u2[0]) * ib + hu * u2[0] * ia, (ry - hu * u2[1]) * ib + hu * u2[1] * ia, (hz - hu * uz2) * ib + hu * uz2 * ia, p.c, tmp, 1);
        tmp[0] = p.c[0] * 0.4 + tmp[0] * 0.6; tmp[1] = p.c[1] * 0.4 + tmp[1] * 0.6; tmp[2] = p.c[2] * 0.4 + tmp[2] * 0.6;
        blend(idx3, tmp, Math.min(0.94, p.al * (1 - Math.exp(-2.6 * chord / mn))));
      }
    }
    return { data: data, zb: zb };
  }
  Viewer.prototype.draw = function () {
    var sc = this.sc, it, i, ns = 0, bt = false, hasW = false;
    if (sc && !this.noSolid) {
      for (i = 0; i < sc.items.length; i++) { it = sc.items[i]; if (it.t === 's') ns++; if (it.batch) bt = true; if (it.t === 'w') hasW = true; }
      if (ns <= 900 || hasW) { try { return this.drawSolid(); } catch (e) { this.noSolid = true; if (root.console) root.console.error('BS3D solid pass off:', e); } }
    }
    return this.drawLegacy();
  };
  Viewer.prototype.drawSolid = function () {
    var cv = this.cv, sc = this.sc, bb = cv.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 2.5), W = Math.round(bb.width * dpr), H = Math.round(bb.height * dpr);
    if (!W || !H) return; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var t0 = root.performance ? root.performance.now() : Date.now(), moving = this.dragging || this.playing || !!sc.live || this.autoRotate || Math.abs(this.vx) > 0.02 || Math.abs(this.vy) > 0.02;
    var qf = Math.min(1, Math.sqrt(1.5e6 / (W * H))), q = moving ? Math.min(qf, this.q || 1) : qf, w = Math.max(16, Math.round(W * q)), h = Math.max(16, Math.round(H * q));
    var R = this.R, rad = sc.radius || 3, F = rad * 6 + 6, S = Math.min(w, h) / (2.15 * rad) * this.zoom, items = sc.items, pr = { sph: [], cyl: [], tr: [], ln: [] }, ov = [], labels = [], i, it, v, v2;
    function V(x, y, z) { return [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z]; }
    function K(Z) { return F / (F - Z); }
    function fg(Z) { return sc.fog === false ? 1 : 0.84 + 0.16 * clamp((Z + rad) / (2 * rad), 0, 1); }
    for (i = 0; i < items.length; i++) {
      it = items[i];
      switch (it.t) {
        case 's': if (!(isFinite(it.x) && isFinite(it.y) && isFinite(it.z) && it.r > 0)) break; v = V(it.x, it.y, it.z);
          if (it.a !== undefined && it.a < 0.98) pr.tr.push({ Cx: v[0], Cy: v[1], Cz: v[2], u: [0, 0, 1], a: it.r, b: it.r, k: K(v[2]), c: it.c, al: it.a, Z: v[2] });
          else { pr.sph.push({ X: v[0], Y: v[1], Z: v[2], r: it.r, k: K(v[2]), c: it.c, f: fg(v[2]) }); if (it.label) labels.push({ X: v[0], Y: v[1], Z: v[2], r: it.r, k: K(v[2]), text: it.label, always: !!it.labelAlways }); } break;
        case 'b': {
          v = V(it.p[0], it.p[1], it.p[2]); v2 = V(it.q[0], it.q[1], it.q[2]); var dx = v2[0] - v[0], dy = v2[1] - v[1], dz = v2[2] - v[2], L = Math.hypot(dx, dy, dz); if (L < 1e-6) break;
          var u = [dx / L, dy / L, dz / L], ex = u[1], ey = -u[0], el = Math.hypot(ex, ey); if (el < 0.15) { ex = 1; ey = 0; el = 1; } ex /= el; ey /= el;
          var rr = it.r || 0.11, whole = Math.floor(it.o + 0.001), frac = it.o - whole, n = whole + (frac > 0.05 ? 1 : 0), sp = rr * (n === 2 ? 2.15 : 1.95), off = -(n - 1) / 2 * sp, w0 = n > 1 ? rr * (n === 2 ? 0.78 : 0.7) : rr, kk = K((v[2] + v2[2]) / 2);
          for (var j = 0; j < n; j++) { var o = off + j * sp; pr.cyl.push({ A: [v[0] + ex * o, v[1] + ey * o, v[2]], u: u, L: L, w: w0, k: kk, c1: it.c1, c2: it.c2, dash: j >= whole, Z: (v[2] + v2[2]) / 2 }); } break;
        }
        case 'w': { v = V(it.x || 0, it.y || 0, it.z || 0); var Mw = it.M || [1, 0, 0, 0, 1, 0, 0, 0, 1], Mv = [0, 0, 0, 0, 0, 0, 0, 0, 0], ra, rb2;
          for (ra = 0; ra < 3; ra++) for (rb2 = 0; rb2 < 3; rb2++) Mv[ra * 3 + rb2] = R[ra * 3] * Mw[rb2] + R[ra * 3 + 1] * Mw[3 + rb2] + R[ra * 3 + 2] * Mw[6 + rb2];
          pr.tr.push({ w: true, f: it.f, Cx: v[0], Cy: v[1], Cz: v[2], M: Mv, s: it.s || 1, k: K(v[2]), cp: it.cp, cn: it.cn, al: it.a === undefined ? 0.82 : it.a, cut: it.cut || null, Z: v[2] }); break; }
        case 'k': v = V(it.x, it.y, it.z); pr.tr.push({ Cx: v[0], Cy: v[1], Cz: v[2], u: [0, 0, 1], a: it.r, b: it.r, k: K(v[2]), c: it.c, al: it.a === undefined ? 0.6 : it.a, Z: v[2] }); break;
        case 'e': { v = V(it.p[0], it.p[1], it.p[2]); v2 = V(it.q[0], it.q[1], it.q[2]); var Le = Math.hypot(v2[0] - v[0], v2[1] - v[1], v2[2] - v[2]) || 1e-6, mz = (v[2] + v2[2]) / 2;
          pr.tr.push({ Cx: (v[0] + v2[0]) / 2, Cy: (v[1] + v2[1]) / 2, Cz: mz, u: [(v2[0] - v[0]) / Le, (v2[1] - v[1]) / Le, (v2[2] - v[2]) / Le], a: Le / 2 + it.r * 0.55, b: it.r, k: K(mz), c: it.c, al: it.a === undefined ? 0.7 : it.a, Z: mz - 0.03 }); break; }
        case 'o': { v = V(it.x + it.d[0] * it.L / 2, it.y + it.d[1] * it.L / 2, it.z + it.d[2] * it.L / 2); var dv = V(it.d[0], it.d[1], it.d[2]);
          pr.tr.push({ Cx: v[0], Cy: v[1], Cz: v[2], u: n3(dv), a: it.L / 2, b: Math.max(0.05, it.w * 1.3), k: K(v[2]), c: it.c, al: it.a === undefined ? 0.6 : it.a, Z: v[2] + (it.zb || 0) }); break; }
        case 'l': { v = V(it.p[0], it.p[1], it.p[2]); v2 = V(it.q[0], it.q[1], it.q[2]); var k1 = K(v[2]), k2 = K(v2[2]);
          pr.ln.push({ x0: w / 2 + v[0] * S * k1, y0: h / 2 - v[1] * S * k1, z0: v[2], x1: w / 2 + v2[0] * S * k2, y1: h / 2 - v2[1] * S * k2, z1: v2[2], c: it.c || [200, 200, 210], a: it.a === undefined ? 1 : it.a, lw: (it.w || 1.2) * dpr * q, dash: !!it.dash }); break; }
        default: ov.push(it);
      }
    }
    var res = raster(w, h, pr, { S: S, cx: w / 2, cy: h / 2, lite: this.lite && moving }), ctx = cv.getContext('2d'), off = this.off || (this.off = root.document.createElement('canvas'));
    if (off.width !== w || off.height !== h) { off.width = w; off.height = h; } off.getContext('2d').putImageData(new root.ImageData(res.data, w, h), 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, 0, 0, W, H);
    labels.forEach(function (l) {                              // an atom label is drawn only while that atom's front is really visible
      var bx = w / 2 + l.X * S * l.k, by = h / 2 - l.Y * S * l.k, rm = l.r * S * l.k / q, zi = Math.floor(by) * w + Math.floor(bx);
      if ((rm < 7 * dpr && !l.always) || bx < 0 || by < 0 || bx >= w || by >= h || res.zb[zi] > l.Z + l.r * 1.02) return;
      var fs = l.always ? 13 * dpr : Math.min(rm * 0.95, 17 * dpr); ctx.font = '700 ' + fs.toFixed(1) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = fs * 0.14; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.fillStyle = '#fff';
      var ly = by / q + fs * 0.04 - (l.always ? rm * 0.5 + fs * 0.55 : 0); ctx.strokeText(l.text, bx / q, ly); ctx.fillText(l.text, bx / q, ly);   /* small nuclei: the symbol sits just above the nucleus */
    });
    if (ov.length) this.drawLegacy({ radius: rad, fog: sc.fog, items: ov }, true);          // lines, arrows, free text on top
    this.dirty = false; var dt = (root.performance ? root.performance.now() : Date.now()) - t0;
    if (moving && q <= 0.4 && dt > 110) { this.slowN = (this.slowN || 0) + 1; if (this.slowN >= 6) this.lite = true; } else if (dt < 60) this.slowN = 0;       // a slow device drops to the lighter orbital sampling by itself
    if (this.showPerf()) { var fsz = 11 * dpr; ctx.font = '700 ' + fsz + 'px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.fillStyle = '#9dffb0'; var tx = 'draw ' + Math.round(dt) + ' ms · q ' + q.toFixed(2) + (this.lite ? ' · lite' : '') + ' · ' + pr.sph.length + 's ' + pr.cyl.length + 'c ' + pr.tr.length + 't'; ctx.strokeText(tx, 8 * dpr, H - 8 * dpr); ctx.fillText(tx, 8 * dpr, H - 8 * dpr); }
    if (moving) this.q = clamp((this.q || 1) * (dt > 26 ? 0.86 : dt < 11 ? 1.06 : 1), 0.35, 1);
    this.coarse = moving && q < qf - 0.01;
  };
  Viewer.prototype.snapshot = function () { return this.cv.toDataURL('image/png'); };
  Viewer.prototype.destroy = function () { if (this.raf) root.cancelAnimationFrame(this.raf); if (this.ro) this.ro.disconnect(); if (this.io) this.io.disconnect(); };

  root.BS3D = { Viewer: Viewer, raster: raster, hex: hex, mix: mix, reduceMotion: reduce };
})(typeof window !== 'undefined' ? window : globalThis);

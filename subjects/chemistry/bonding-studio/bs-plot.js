/* MODULE-18 · bs-plot.js — scientific 2D plots for the Bonding & Molecule Studio.
   Same API as the shared PHLabPlot (new Plot(canvas).set({x,y,series,points,vlines,hlines,bands,legend})) but laid out like a lab figure:
   axis titles outside the plot, legend above it, line/region labels in tags above the frame, point labels placed without overlapping,
   and a touch/hover read-out (crosshair + values). Redraws itself when the canvas is resized or its panel is opened. */
(function (root) {
  'use strict';
  var FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  function dsep() { var L = root.MultiCalc && root.MultiCalc.state && root.MultiCalc.state.currentLang; return L === 'en' ? '.' : ','; }
  function fmt(v, dp) { return (+v).toFixed(dp).replace('.', dsep()); }
  function nice(lo, hi, n) {
    var raw = (hi - lo || 1) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag, st = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag, t = [], v = Math.ceil(lo / st - 1e-9) * st;
    for (; v <= hi + st * 1e-6; v += st) t.push(+v.toFixed(8));
    return { t: t, dp: Math.max(0, Math.min(4, -Math.floor(Math.log10(st) + 1e-9) + (Math.abs(st / mag - 2.5) < 1e-9 ? 1 : 0))) };
  }
  function hexA(c, a) { if (c && c[0] === '#') { var h = c.slice(1); if (h.length === 3) h = h.replace(/./g, '$&$&'); return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')'; } return c; }
  function tag(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function Plot(cv) {
    var me = this; this.cv = cv; this.o = null; this.hv = null; this.raf = 0; this.hit = [];
    cv.setAttribute('role', 'img'); cv.style.touchAction = 'pan-y';
    function mv(e) { var r = cv.getBoundingClientRect(); me.hv = { x: e.clientX - r.left, y: e.clientY - r.top }; me.sched(); }
    cv.addEventListener('pointermove', mv); cv.addEventListener('pointerdown', mv); cv.addEventListener('pointerleave', function () { me.hv = null; me.sched(); });
    if (root.ResizeObserver) new root.ResizeObserver(function () { me.sched(); }).observe(cv); else root.addEventListener('resize', function () { me.sched(); });
  }
  Plot.prototype.sched = function () { var me = this; if (me.raf) return; me.raf = root.requestAnimationFrame(function () { me.raf = 0; me.draw(); }); };
  Plot.prototype.set = function (o) { this.o = o; this.hv = null; this.sched(); };
  Plot.prototype.draw = function () {
    var o = this.o, cv = this.cv; if (!o || !o.x || !o.y) return;
    var r = cv.getBoundingClientRect(), W = r.width, H = r.height; if (W < 60 || H < 60) return;
    var k = Math.min(root.devicePixelRatio || 1, 2.5); if (cv.width !== Math.round(W * k) || cv.height !== Math.round(H * k)) { cv.width = Math.round(W * k); cv.height = Math.round(H * k); }
    var c = cv.getContext('2d'), cs = root.getComputedStyle(cv), m = /(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(cs.color || ''), lum = m ? (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) / 255 : 0.9;
    function A(al) { return m ? 'rgba(' + m[1] + ',' + m[2] + ',' + m[3] + ',' + al + ')' : 'rgba(150,160,175,' + al + ')'; }
    var halo = lum > 0.5 ? 'rgba(14,20,32,.85)' : 'rgba(255,255,255,.9)', xs = nice(o.x.min, o.x.max, W < 420 ? 5 : 7), ys = nice(o.y.min, o.y.max, 5), series = o.series || [], i, j;
    c.setTransform(k, 0, 0, k, 0, 0); c.clearRect(0, 0, W, H); c.font = '12px ' + FONT;
    var yw = 0; ys.t.forEach(function (v) { yw = Math.max(yw, c.measureText(fmt(v, ys.dp)).width); });
    var L = yw + 38, R = 16, legendRows = [], lx = 0, row = [], nm = series.filter(function (s) { return s.name; });
    if (o.legend && nm.length) { nm.forEach(function (s) { var w = 30 + c.measureText(s.name).width + 12; if (lx + w > W - L - R && row.length) { legendRows.push(row); row = []; lx = 0; } row.push({ s: s, w: w }); lx += w; }); legendRows.push(row); }
    var hasTags = (o.vlines || []).some(function (v) { return v.label; }), T = 10 + legendRows.length * 20 + (hasTags ? 24 : 6), B = 46, x0 = L, x1 = W - R, y0 = T, y1 = H - B;
    if (x1 - x0 < 60 || y1 - y0 < 50) return;
    function X(v) { return x0 + (v - o.x.min) / (o.x.max - o.x.min) * (x1 - x0); }
    function Y(v) { return y1 - (v - o.y.min) / (o.y.max - o.y.min) * (y1 - y0); }
    c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();                                  // regions
    (o.bands || []).forEach(function (b) { c.fillStyle = hexA(b.color, 0.1); c.fillRect(x0, Y(b.y1), x1 - x0, Y(b.y0) - Y(b.y1)); });
    c.restore();
    c.lineWidth = 1; c.strokeStyle = A(0.1); c.beginPath();                                                // grid
    ys.t.forEach(function (v) { c.moveTo(x0, Y(v)); c.lineTo(x1, Y(v)); }); xs.t.forEach(function (v) { c.moveTo(X(v), y0); c.lineTo(X(v), y1); }); c.stroke();
    (o.bands || []).forEach(function (b) { if (!b.label) return; c.font = '700 11.5px ' + FONT; c.textAlign = 'right'; c.fillStyle = hexA(b.color, 1); c.fillText(b.label, x1 - 8, Math.max(y0 + 14, Y(b.y1) + 15)); });
    c.strokeStyle = A(0.6); c.lineWidth = 1.4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y1); c.lineTo(x1, y1); c.stroke();   // axes + ticks
    c.font = '12px ' + FONT; c.fillStyle = A(0.82); c.textAlign = 'right'; ys.t.forEach(function (v) { c.fillText(fmt(v, ys.dp), x0 - 8, Y(v) + 4); });
    c.textAlign = 'center'; xs.t.forEach(function (v) { c.fillText(fmt(v, xs.dp), X(v), y1 + 17); });
    c.font = '700 12.5px ' + FONT; c.fillStyle = A(0.95); if (o.x.label) c.fillText(o.x.label, (x0 + x1) / 2, H - 9);
    if (o.y.label) { c.save(); c.translate(13, (y0 + y1) / 2); c.rotate(-Math.PI / 2); c.fillText(o.y.label, 0, 0); c.restore(); }
    c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip(); c.lineWidth = 1.3;                    // reference lines
    (o.hlines || []).forEach(function (h) { c.strokeStyle = A(0.5); c.setLineDash(h.dash || []); c.beginPath(); c.moveTo(x0, Y(h.y)); c.lineTo(x1, Y(h.y)); c.stroke(); });
    (o.vlines || []).forEach(function (v) { c.strokeStyle = A(0.5); c.setLineDash(v.dash || []); c.beginPath(); c.moveTo(X(v.x), y0); c.lineTo(X(v.x), y1); c.stroke(); });
    c.setLineDash([]); c.lineJoin = 'round'; c.lineCap = 'round';
    series.forEach(function (s) { c.strokeStyle = s.color; c.lineWidth = s.w || 2.2; c.setLineDash(s.dash || []); c.beginPath(); s.pts.forEach(function (p, n) { n ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])); }); c.stroke(); });
    c.setLineDash([]); c.restore();
    (o.vlines || []).forEach(function (v) { if (!v.label) return; c.font = '700 11px ' + FONT; var w = c.measureText(v.label).width + 14, cx = Math.min(x1 - w / 2, Math.max(x0 + w / 2, X(v.x)));   // tags above the frame
      tag(c, cx - w / 2, y0 - 22, w, 18, 9); c.fillStyle = A(0.1); c.fill(); c.strokeStyle = A(0.4); c.lineWidth = 1; c.stroke(); c.fillStyle = A(0.95); c.textAlign = 'center'; c.fillText(v.label, cx, y0 - 9); });
    legendRows.forEach(function (rw, ri) { var tw = rw.reduce(function (a, b) { return a + b.w; }, 0), lx2 = x0 + Math.max(0, ((x1 - x0) - tw) / 2); rw.forEach(function (it) { var yy = 14 + ri * 20; c.strokeStyle = it.s.color; c.lineWidth = 2.6; c.setLineDash(it.s.dash || []); c.beginPath(); c.moveTo(lx2, yy); c.lineTo(lx2 + 22, yy); c.stroke(); c.setLineDash([]); c.font = '12px ' + FONT; c.fillStyle = A(0.92); c.textAlign = 'left'; c.fillText(it.s.name, lx2 + 28, yy + 4); lx2 += it.w; }); });
    var pts = (o.points || []).slice().sort(function (a, b) { return (b.ring ? 1 : 0) - (a.ring ? 1 : 0); }), taken = [], hit = [];      // points + non-overlapping labels
    pts.forEach(function (p) { var px = X(p.x), py = Y(p.y); if (px < x0 - 2 || px > x1 + 2 || py < y0 - 2 || py > y1 + 2) return; hit.push({ x: px, y: py, p: p });
      c.beginPath(); c.arc(px, py, 4.6, 0, 6.2832); c.fillStyle = p.color; c.fill(); c.lineWidth = 1.4; c.strokeStyle = halo; c.stroke();
      if (p.ring) { c.beginPath(); c.arc(px, py, 9.5, 0, 6.2832); c.lineWidth = 2; c.strokeStyle = p.color; c.stroke(); } });
    pts.forEach(function (p) { if (!p.label) return; var px = X(p.x), py = Y(p.y); if (px < x0 - 2 || px > x1 + 2 || py < y0 - 2 || py > y1 + 2) return; c.font = (p.ring ? '800 ' : '600 ') + '12px ' + FONT; var w = c.measureText(p.label).width, off = p.ring ? 13 : 9,
        cand = [[off, -off, 'l'], [off, off + 8, 'l'], [-off, -off, 'r'], [-off, off + 8, 'r'], [0, -off - 3, 'c'], [0, off + 12, 'c'], [off + 6, 4, 'l'], [-off - 6, 4, 'r']], best = null, bo = 1e9;
      cand.forEach(function (cd) { var rx = cd[2] === 'l' ? px + cd[0] : cd[2] === 'r' ? px + cd[0] - w : px - w / 2, ry = py + cd[1] - 11, rc = { x: rx, y: ry, w: w, h: 14 }, ov = 0;
        if (rx < x0 + 2 || rx + w > x1 - 2 || ry < y0 + 1 || ry + 14 > y1 - 1) ov += 100;
        taken.forEach(function (t) { if (rc.x < t.x + t.w + 2 && rc.x + rc.w + 2 > t.x && rc.y < t.y + t.h + 2 && rc.y + rc.h + 2 > t.y) ov += 10; });
        hit.forEach(function (h) { if (h.x > rc.x - 6 && h.x < rc.x + rc.w + 6 && h.y > rc.y - 6 && h.y < rc.y + rc.h + 6 && h.p !== p) ov += 3; });
        if (ov < bo) { bo = ov; best = { rc: rc, a: cd[2], tx: cd[2] === 'l' ? px + cd[0] : cd[2] === 'r' ? px + cd[0] : px, ty: py + cd[1] }; } });
      taken.push(best.rc); c.textAlign = best.a === 'l' ? 'left' : best.a === 'r' ? 'right' : 'center'; c.lineWidth = 3.4; c.strokeStyle = halo; c.strokeText(p.label, best.tx, best.ty); c.fillStyle = p.ring ? p.color : A(0.96); c.fillText(p.label, best.tx, best.ty); });
    if (this.hv && this.hv.x > x0 && this.hv.x < x1 && this.hv.y > y0 && this.hv.y < y1) {                      // read-out
      var cand2 = hit.map(function (h) { return { x: h.x, y: h.y, vx: h.p.x, vy: h.p.y, n: h.p.label || '' }; });
      series.forEach(function (s) { s.pts.forEach(function (p) { cand2.push({ x: X(p[0]), y: Y(p[1]), vx: p[0], vy: p[1], n: s.name || '' }); }); });
      var bd = 28, bh = null; cand2.forEach(function (q) { var d = Math.hypot(q.x - this.hv.x, q.y - this.hv.y); if (d < bd) { bd = d; bh = q; } }, this);
      if (bh) { c.strokeStyle = A(0.4); c.lineWidth = 1; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(bh.x, y1); c.lineTo(bh.x, bh.y); c.lineTo(x0, bh.y); c.stroke(); c.setLineDash([]); c.beginPath(); c.arc(bh.x, bh.y, 6, 0, 6.2832); c.lineWidth = 2; c.strokeStyle = A(0.95); c.stroke();
        var l1 = (o.x.label ? o.x.label + ' = ' : '') + (o.x.tip ? o.x.tip(bh.vx) : fmt(bh.vx, 2)), l2 = (o.y.label ? o.y.label.split(' ')[0] + ' = ' : '') + (o.y.tip ? o.y.tip(bh.vy) : fmt(bh.vy, 2)), ls = [bh.n, l1, l2].filter(Boolean);
        c.font = '600 12px ' + FONT; var bw = Math.max.apply(null, ls.map(function (t) { return c.measureText(t).width; })) + 16, bhh = ls.length * 17 + 8, bx = Math.min(x1 - bw, Math.max(x0, bh.x + 12)), by = Math.max(y0, Math.min(y1 - bhh, bh.y - bhh - 8));
        tag(c, bx, by, bw, bhh, 8); c.fillStyle = lum > 0.5 ? 'rgba(10,16,28,.94)' : 'rgba(255,255,255,.96)'; c.fill(); c.strokeStyle = A(0.35); c.stroke(); c.fillStyle = lum > 0.5 ? '#f2f6fb' : '#101826'; c.textAlign = 'left'; ls.forEach(function (t, n) { c.fillText(t, bx + 8, by + 17 + n * 17); }); }
    }
  };
  root.BSPlot = { Plot: Plot };
})(typeof window !== 'undefined' ? window : globalThis);

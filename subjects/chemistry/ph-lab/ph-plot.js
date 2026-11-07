/* ============================================================================
   MODULE-16 · Acids, Bases & pH Lab — ph-plot.js
   One generic, precise scientific plot (canvas): true tick values, grid, bands, several series
   (optionally pH-coloured), vertical/horizontal reference lines, labelled points, an external
   cursor and a data crosshair with the exact interpolated values. Theme-aware (reads the
   canvas' computed text colour). Used by every diagram of the lab.
   cfg = {
     x:{min,max,label,fmt}, y:{min,max,label,fmt},
     series:[{name,pts:[[x,y]…],color,w,dash,gradient:'ph',fill,hover,labelAt:{x,text,dx,dy},tipAt:function(x,y)→text (custom tooltip row)}],
     vlines:[{x,color,dash,label}], hlines:[{y,color,dash,label}], bands:[{y0,y1,color,label}],
     points:[{x,y,color,label,ring}], cursor:{x}, legend:true, pick:function(x)
   }
   ========================================================================== */
(function (root) {
  'use strict';
  var V = root.PHLabViz, E = root.PHLabEngine, D = root.PHLabData;
  var reduce = V ? V.reduceMotion : false;

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function niceStep(raw) { var e = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), m = raw / e; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e; }
  function ticks(min, max, target) {
    var step = niceStep((max - min) / target), out = [], v = Math.ceil(min / step - 1e-9) * step;
    for (var i = 0; v <= max + step * 1e-9 && i < 200; i++, v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return { t: out, step: step };
  }
  function decimals(step) { return Math.min(4, Math.max(0, -Math.floor(Math.log(step) / Math.LN10 + 1e-9))); }
  function fmtTick(v, step) { var s = v.toFixed(decimals(step)); return s.replace('-', '\u2212'); }
  function luminance(css) {
    var m = /rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/.exec(css); if (!m) return 1;
    return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255;
  }
  function interp(pts, x) {                 // pts sorted by x
    var n = pts.length; if (!n || x < pts[0][0] || x > pts[n - 1][0]) return NaN;
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (pts[m][0] <= x) lo = m; else hi = m; }
    var a = pts[lo], b = pts[hi]; if (b[0] === a[0]) return a[1];
    return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }

  function Plot(cv, opts) {
    var self = this; this.cv = cv; this.cfg = null; this.t = 1; this.anim = 0; this.hoverX = null; this.cursorX = null;
    this.onPick = opts && opts.onPick; this.dragging = false;
    function xAt(e) {
      var r = cv.getBoundingClientRect(), g = self.geom(r.width, r.height); if (!g || !self.cfg) return null;
      var c = self.cfg.x; return clamp(c.min + (e.clientX - r.left - g.l) / g.w * (c.max - c.min), c.min, c.max);
    }
    cv.addEventListener('pointerdown', function (e) {
      if (!self.cfg) return; self.dragging = true; try { cv.setPointerCapture(e.pointerId); } catch (x) { }
      var x = xAt(e); if (x === null) return; if (self.cfg.pick) self.cfg.pick(x); else { self.hoverX = x; self.draw(); }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!self.cfg) return; var x = xAt(e); if (x === null) return;
      if (self.cfg.pick) { if (self.dragging) self.cfg.pick(x); } else { self.hoverX = x; self.draw(); }
    });
    function end() { self.dragging = false; }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', function () { if (!self.cfg || self.cfg.pick) return; self.hoverX = null; self.draw(); });
    if (root.ResizeObserver) { this.ro = new root.ResizeObserver(function () { self.draw(); }); this.ro.observe(cv); }
  }

  Plot.prototype.geom = function (W, H) {
    var cfg = this.cfg; if (!cfg) return null;
    var ctx = this.cv.getContext('2d'); ctx.font = '11px system-ui, sans-serif';
    var ty = ticks(cfg.y.min, cfg.y.max, Math.max(3, Math.round(H / 46))), wMax = 0;
    ty.t.forEach(function (v) { wMax = Math.max(wMax, ctx.measureText(fmtTick(v, ty.step)).width); });
    var top = 12 + (cfg.legend ? 18 : 0), l = Math.max(34, wMax + 16), r = 14, b = 36;
    return { l: l, t: top, w: W - l - r, h: H - top - b, ty: ty };
  };

  Plot.prototype.set = function (cfg, animate) {
    this.cfg = cfg; this.hoverX = null;
    if (animate && !reduce) this.reveal(); else { this.t = 1; this.draw(); }
  };
  Plot.prototype.reveal = function () {
    var self = this; if (this.anim) root.cancelAnimationFrame(this.anim);
    var t0 = 0; this.t = 0;
    this.anim = root.requestAnimationFrame(function step(ts) {
      if (!t0) t0 = ts; self.t = clamp((ts - t0) / 700, 0, 1); self.draw();
      if (self.t < 1) self.anim = root.requestAnimationFrame(step); else self.anim = 0;
    });
  };
  Plot.prototype.setCursor = function (x) { this.cursorX = x; this.draw(); };

  Plot.prototype.draw = function () {
    var cv = this.cv, cfg = this.cfg; if (!cfg) return;
    var r = cv.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height); if (!W || !H) return;
    var dpr = Math.min(root.devicePixelRatio || 1, 2.5);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var g = this.geom(W, H), ink = root.getComputedStyle(cv).color || 'rgb(230,230,230)', cx = cfg.x, cy = cfg.y, i, k;
    var X = function (v) { return g.l + (v - cx.min) / (cx.max - cx.min) * g.w; };
    var Y = function (v) { return g.t + (1 - (v - cy.min) / (cy.max - cy.min)) * g.h; };
    ctx.font = '11px system-ui, sans-serif'; ctx.textBaseline = 'middle';
    var tx = ticks(cx.min, cx.max, Math.max(3, Math.round(g.w / 70)));

    // bands
    (cfg.bands || []).forEach(function (b) {
      var y0 = clamp(b.y0, cy.min, cy.max), y1 = clamp(b.y1, cy.min, cy.max), grad = ctx.createLinearGradient(0, Y(y1), 0, Y(y0));
      if (b.grad) { grad.addColorStop(0, b.grad[1]); grad.addColorStop(1, b.grad[0]); ctx.fillStyle = grad; } else ctx.fillStyle = b.color || 'rgba(120,140,255,.16)';
      ctx.fillRect(g.l, Y(y1), g.w, Y(y0) - Y(y1));
      ctx.strokeStyle = ink; ctx.globalAlpha = 0.28; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(g.l, Y(y1)); ctx.lineTo(g.l + g.w, Y(y1)); ctx.moveTo(g.l, Y(y0)); ctx.lineTo(g.l + g.w, Y(y0)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    });
    // grid + tick labels
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    g.ty.t.forEach(function (v) { ctx.globalAlpha = 0.12; ctx.beginPath(); ctx.moveTo(g.l, Y(v)); ctx.lineTo(g.l + g.w, Y(v)); ctx.stroke(); ctx.globalAlpha = 0.72; ctx.fillText(fmtTick(v, g.ty.step), g.l - 6, Y(v)); });
    ctx.textAlign = 'center';
    tx.t.forEach(function (v) { ctx.globalAlpha = 0.09; ctx.beginPath(); ctx.moveTo(X(v), g.t); ctx.lineTo(X(v), g.t + g.h); ctx.stroke(); ctx.globalAlpha = 0.72; ctx.fillText(fmtTick(v, tx.step), X(v), g.t + g.h + 12); });
    ctx.globalAlpha = 0.6; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(g.l, g.t); ctx.lineTo(g.l, g.t + g.h); ctx.lineTo(g.l + g.w, g.t + g.h); ctx.stroke();
    ctx.globalAlpha = 0.8; ctx.textAlign = 'right'; if (cx.label) ctx.fillText(cx.label, g.l + g.w, g.t + g.h + 27);
    ctx.textAlign = 'left'; if (cy.label) ctx.fillText(cy.label, g.l + 6, g.t - 4 - (cfg.legend ? 0 : 0)); ctx.globalAlpha = 1;

    function place(text, px, py, color) {
      var w = ctx.measureText(text).width, x = px + 7; if (x + w > g.l + g.w - 2) x = px - 7 - w; if (x < g.l + 2) x = g.l + 2;
      ctx.textAlign = 'left'; ctx.fillStyle = color || ink; ctx.fillText(text, x, clamp(py, g.t + 8, g.t + g.h - 8));
    }

    // clipped content
    ctx.save(); ctx.beginPath(); ctx.rect(g.l, g.t, g.w, g.h); ctx.clip();
    // reference lines
    (cfg.vlines || []).forEach(function (l) {
      ctx.strokeStyle = l.color || ink; ctx.globalAlpha = l.alpha === undefined ? 0.4 : l.alpha; ctx.lineWidth = l.w || 1; ctx.setLineDash(l.dash || [3, 4]);
      ctx.beginPath(); ctx.moveTo(X(l.x), g.t); ctx.lineTo(X(l.x), g.t + g.h); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    });
    (cfg.hlines || []).forEach(function (l) {
      ctx.strokeStyle = l.color || ink; ctx.globalAlpha = l.alpha === undefined ? 0.4 : l.alpha; ctx.lineWidth = l.w || 1; ctx.setLineDash(l.dash || [3, 4]);
      ctx.beginPath(); ctx.moveTo(g.l, Y(l.y)); ctx.lineTo(g.l + g.w, Y(l.y)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    });
    // series (revealed left → right)
    ctx.save(); ctx.beginPath(); ctx.rect(g.l, 0, g.w * this.t + 1, H); ctx.clip();
    var yr = cy.max - cy.min;
    (cfg.series || []).forEach(function (s) {
      if (!s.pts || !s.pts.length) return;
      var stroke = s.color || ink;
      if (s.gradient === 'ph' && D) { var gr = ctx.createLinearGradient(0, Y(14), 0, Y(0)); for (var q = D.UNIVERSAL.length - 1; q >= 0; q--) gr.addColorStop((14 - D.UNIVERSAL[q][0]) / 14, V.rgba(D.UNIVERSAL[q][1], 1)); stroke = gr; }
      if (s.fill) {
        ctx.beginPath(); var started = false, lastX = 0;
        s.pts.forEach(function (p) { var px = X(p[0]), py = Y(clamp(p[1], cy.min - 5 * yr, cy.max + 5 * yr)); if (!started) { ctx.moveTo(px, Y(Math.max(cy.min, 0))); ctx.lineTo(px, py); started = true; } else ctx.lineTo(px, py); lastX = px; });
        ctx.lineTo(lastX, Y(Math.max(cy.min, 0))); ctx.closePath(); ctx.globalAlpha = s.fillAlpha || 0.14; ctx.fillStyle = s.color || ink; ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.beginPath(); var pen = false;
      s.pts.forEach(function (p) {
        if (!isFinite(p[1]) || !isFinite(p[0])) { pen = false; return; }
        var px = X(p[0]), py = Y(clamp(p[1], cy.min - 5 * yr, cy.max + 5 * yr));
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = stroke; ctx.lineWidth = s.w || 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.setLineDash(s.dash || []); ctx.stroke(); ctx.setLineDash([]);
    });
    ctx.restore();
    ctx.restore();

    // labels of reference lines and direct series labels (outside the clip)
    ctx.textAlign = 'left';
    if (this.t >= 1) {
      (cfg.vlines || []).forEach(function (l) { if (l.label) { var w = ctx.measureText(l.label).width, x = X(l.x) + 4; if (x + w > g.l + g.w) x = X(l.x) - 4 - w; ctx.globalAlpha = 0.85; ctx.fillStyle = l.color || ink; ctx.fillText(l.label, x, g.t + 8 + (l.row || 0) * 12); ctx.globalAlpha = 1; } });
      (cfg.hlines || []).forEach(function (l) { if (l.label) { ctx.globalAlpha = 0.85; ctx.fillStyle = l.color || ink; ctx.fillText(l.label, g.l + 5, Y(l.y) - 7); ctx.globalAlpha = 1; } });
      (cfg.series || []).forEach(function (s) {
        if (!s.labelAt) return; var yy = interp(s.pts, s.labelAt.x); if (!isFinite(yy)) return;
        ctx.fillStyle = s.color || ink; ctx.font = '600 11px system-ui, sans-serif'; place(s.labelAt.text || s.name, X(s.labelAt.x) + (s.labelAt.dx || 0), Y(yy) + (s.labelAt.dy || -9), s.color); ctx.font = '11px system-ui, sans-serif';
      });
      (cfg.points || []).forEach(function (p) {
        if (p.x < cx.min || p.x > cx.max || p.y < cy.min || p.y > cy.max) return;
        ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.r || 4, 0, Math.PI * 2);
        if (p.ring) { ctx.strokeStyle = p.color || ink; ctx.lineWidth = 1.8; ctx.stroke(); } else { ctx.fillStyle = p.color || ink; ctx.fill(); }
        if (p.label) { ctx.globalAlpha = 0.9; place(p.label, X(p.x), Y(p.y) + (p.dy === undefined ? -10 : p.dy), p.color || ink); ctx.globalAlpha = 1; }
      });
      // external cursor (e.g. the titration marker)
      if (this.cursorX !== null && cfg.series && cfg.series[0] && this.cursorX >= cx.min && this.cursorX <= cx.max) {
        var yy2 = interp(cfg.series[0].pts, this.cursorX), px2 = X(this.cursorX);
        ctx.strokeStyle = ink; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px2, g.t + g.h); ctx.lineTo(px2, g.t); ctx.stroke(); ctx.globalAlpha = 1;
        if (isFinite(yy2) && cfg.cursorDot !== false) {
          var py2 = Y(clamp(yy2, cy.min, cy.max)), col = cfg.cursorColor ? cfg.cursorColor(yy2) : ink;
          ctx.fillStyle = col; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(px2, py2, 11, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
          ctx.fillStyle = col; ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px2, py2, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
      // hover crosshair + exact values
      if (this.hoverX !== null && !cfg.pick) this.drawTip(ctx, g, X, Y, ink, W);
    }
    // legend
    if (cfg.legend) {
      var lx = g.l, ly = 10; ctx.textAlign = 'left'; ctx.font = '11px system-ui, sans-serif';
      (cfg.series || []).forEach(function (s) {
        if (!s.name || s.noLegend) return;
        var w = ctx.measureText(s.name).width + 26; if (lx + w > W - 6) { return; }
        ctx.strokeStyle = s.color || ink; ctx.lineWidth = 2.6; ctx.setLineDash(s.dash || []); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 16, ly); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = ink; ctx.globalAlpha = 0.85; ctx.fillText(s.name, lx + 21, ly); ctx.globalAlpha = 1; lx += w + 6;
      });
    }
  };

  Plot.prototype.drawTip = function (ctx, g, X, Y, ink, W) {
    var cfg = this.cfg, x = this.hoverX, px = X(x), cy = cfg.y, rows = [], dark = luminance(ink) > 0.5;
    ctx.strokeStyle = ink; ctx.globalAlpha = 0.45; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, g.t); ctx.lineTo(px, g.t + g.h); ctx.stroke(); ctx.globalAlpha = 1;
    (cfg.series || []).forEach(function (s) {
      if (s.hover === false || !s.pts) return; var y = interp(s.pts, x); if (!isFinite(y)) return;
      var py = Y(clamp(y, cy.min, cy.max)); ctx.fillStyle = s.color || ink; ctx.strokeStyle = ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(px, py, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      rows.push({ c: s.color || ink, t: (s.tipName || s.name || '') + (s.name || s.tipName ? '  ' : '') + (s.tipAt ? s.tipAt(x, y) : cy.tip ? cy.tip(y) : E.numPlain(y, 4)) });
    });
    var head = (cfg.x.tipLabel || cfg.x.label || 'x').toString().split('(')[0].trim() + '  ' + (cfg.x.tip ? cfg.x.tip(x) : E.numPlain(x, 4));
    var lines = [{ c: null, t: head }].concat(rows.slice(0, 9)), w = 0, lh = 15;
    lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l.t).width); });
    w += 24; var h = lines.length * lh + 8, bx = px + 10; if (bx + w > W - 4) bx = px - 10 - w; if (bx < 4) bx = 4; var by = g.t + 4;
    ctx.fillStyle = dark ? 'rgba(16,22,32,.93)' : 'rgba(252,253,255,.96)'; ctx.strokeStyle = dark ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, w, h, 8); else ctx.rect(bx, by, w, h); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; lines.forEach(function (l, i) {
      var ty = by + 4 + lh * i + lh / 2;
      if (l.c) { ctx.fillStyle = l.c; ctx.beginPath(); ctx.arc(bx + 10, ty, 3.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = dark ? '#eef3fb' : '#17202c'; ctx.font = (i === 0 ? '600 ' : '') + '11px system-ui, sans-serif'; ctx.fillText(l.t, bx + (l.c ? 19 : 9), ty);
    });
    ctx.font = '11px system-ui, sans-serif';
  };

  Plot.prototype.destroy = function () { if (this.anim) root.cancelAnimationFrame(this.anim); if (this.ro) this.ro.disconnect(); };

  root.PHLabPlot = { Plot: Plot, ticks: ticks, interp: interp };
})(typeof window !== 'undefined' ? window : globalThis);

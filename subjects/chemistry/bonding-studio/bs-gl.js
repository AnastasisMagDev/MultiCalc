/* ============================================================================
   MODULE-18 · Bonding & Molecule Studio — bs-gl.js
   The same 3D viewer as bs-3d.js, drawn by the GPU (WebGL2) instead of the CPU.  Nothing else changes: scenes are still
   { radius, fog, items:[…], anim, live }, the Viewer keeps its controls (drag, pinch, wheel, double-tap), and if WebGL2 is not
   available — or anything fails to compile — the old CPU renderer is used exactly as before.
     · atoms and bonds are ray-cast impostors: perfect spheres and tubes at any zoom, analytic edge anti-aliasing, painter-sorted
     · electron clouds are true translucent ellipsoids whose opacity follows the thickness of the cloud along the line of sight
     · orbitals (BSWave grids) are ray-marched on the GPU from a 3D texture: smooth isosurfaces, ψ = ±iso, blue/red phase, cut-away cap
     · labels are drawn on the atom's OWN surface only (tested per pixel against that sphere), so a label never shows through a neighbour
     · the perspective is gentle and constant, so an atom does not look bigger or smaller just because of the viewing angle
   ========================================================================== */
(function (root) {
  'use strict';
  var V3 = root.BS3D; if (!V3 || !V3.Viewer || V3.gl) return;
  var Legacy = V3.Viewer, doc = root.document;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  /* ---------------------------------------------------------------- shaders */
  var HEAD = '#version 300 es\nprecision highp float;\nprecision highp sampler3D;\n';
  var CV = 'uniform mat3 uR; uniform vec2 uView; uniform float uF, uFoc, uZr; uniform vec2 uFog;\n' +
    'vec2 toPix(vec3 v) { float k = uFoc / (uF - v.z); return vec2(k * v.x, k * v.y); }\n' +
    'float depth01(float z) { return clamp(0.5 - z / (2.0 * uZr), 0.0, 1.0); }\n' +
    'float fogK(float z) { return uFog.y > 0.5 ? 0.84 + 0.16 * clamp((z + uFog.x) / (2.0 * uFog.x), 0.0, 1.0) : 1.0; }\n';
  var CF = CV +
    'vec3 rayDir() { vec2 p = gl_FragCoord.xy - uView * 0.5; return normalize(vec3(p / uFoc, -1.0)); }\n' +
    'const vec3 LA = vec3(-0.4, 0.59, 0.7); const vec3 LB = vec3(0.86, -0.3, 0.41); const vec3 LH = vec3(-0.2, 0.3, 1.2);\n' +
    'vec3 shade(vec3 n, vec3 c, float k, float spec) {\n' +
    '  float d1 = max(dot(n, normalize(LA)), 0.0), d2 = max(dot(n, normalize(LB)), 0.0), h = max(dot(n, normalize(LH)), 0.0);\n' +
    '  float lum = (0.32 + 0.78 * d1 + 0.2 * d2) * k, rim = pow(1.0 - max(n.z, 0.0), 3.0) * 0.2;\n' +
    '  return clamp(c * lum + vec3(pow(h, 64.0) * 0.55 * spec) + vec3(0.43, 0.47, 0.55) * rim, 0.0, 1.0);\n}\n';

  /* --- opaque atoms (type 0) and bond tubes (type 1), one instanced draw, sorted back to front --- */
  var VS_SOLID = HEAD + CV +
    'in vec2 aCorner; in vec4 a0; in vec4 a1; in vec4 a2; in vec4 a3; in vec4 a4;\n' +
    'out vec3 vA; out vec3 vB; out vec3 vC1; out vec3 vC2; out vec4 vP; flat out float vType; out float vFog;\n' +
    'void main() {\n' +
    '  vec3 A = uR * a0.yzw; float r = a1.x; vType = a0.x; vC1 = a2.xyz; vC2 = a3.xyz;\n' +
    '  if (a0.x < 0.5) {\n' +
    '    vA = A; vB = vec3(0.0); vP = vec4(r, 0.0, a2.w, 0.0); vFog = fogK(A.z);\n' +
    '    float k = uFoc / (uF - A.z); vec2 c = vec2(k * A.x, k * A.y), px = c + aCorner * (r * k * 1.25 + 2.0);\n' +
    '    gl_Position = vec4(px / (uView * 0.5), 0.0, 1.0);\n' +
    '  } else {\n' +
    '    vec3 B = uR * a1.yzw, u = normalize(B - A); float L = length(B - A);\n' +
    '    float n = a4.y, j = a4.x, rr = a1.x, sp = rr * (n > 1.5 && n < 2.5 ? 2.15 : 1.95);\n' +
    '    float w = n > 1.5 ? rr * (n < 2.5 ? 0.78 : 0.7) : rr;\n' +
    '    vec2 e = vec2(u.y, -u.x); float el = length(e); e = el < 0.15 ? vec2(1.0, 0.0) : e / el;\n' +
    '    vec3 off = vec3(e * ((j - (n - 1.0) * 0.5) * sp), 0.0); A += off; B += off;\n' +
    '    vA = A; vB = B; vP = vec4(w, L, a2.w, a4.z); vFog = 1.0;\n' +
    '    vec2 pa = toPix(A), pb = toPix(B), dir = pb - pa; float dl = length(dir); dir = dl < 1e-4 ? vec2(1.0, 0.0) : dir / dl;\n' +
    '    vec2 nr = vec2(-dir.y, dir.x); float ka = uFoc / (uF - A.z), kb = uFoc / (uF - B.z), pad = w * max(ka, kb) * 1.3 + 2.0;\n' +
    '    vec2 px = mix(pa, pb, aCorner.x * 0.5 + 0.5) + dir * aCorner.x * pad + nr * aCorner.y * pad;\n' +
    '    gl_Position = vec4(px / (uView * 0.5), 0.0, 1.0);\n' +
    '  }\n}\n';
  var FS_SOLID = HEAD + CF +
    'in vec3 vA; in vec3 vB; in vec3 vC1; in vec3 vC2; in vec4 vP; flat in float vType; in float vFog;\n' +
    'out vec4 oC;\n' +
    'void main() {\n' +
    '  vec3 d = rayDir(), O = vec3(0.0, 0.0, uF), col, n; float cov, t;\n' +
    '  if (vType < 0.5) {\n' +
    '    float r = vP.x; vec3 oc = O - vA; float b = dot(oc, d), h = b * b - (dot(oc, oc) - r * r), dmin = sqrt(max(dot(oc, oc) - b * b, 0.0));\n' +
    '    float pxw = max(-b, 1.0) / uFoc; cov = clamp(0.5 - (dmin - r) / pxw, 0.0, 1.0); if (cov <= 0.0) discard;\n' +
    '    t = h >= 0.0 ? -b - sqrt(h) : -b; n = normalize(O + d * t - vA); col = shade(n, vC1, vFog, 1.0);\n' +
    '  } else {\n' +
    '    float w = vP.x, L = vP.y; vec3 u = (vB - vA) / L, oc = O - vA; float cd = dot(u, d), co = dot(u, oc);\n' +
    '    float a = 1.0 - cd * cd, b = dot(oc, d) - co * cd, c = dot(oc, oc) - co * co - w * w, h = b * b - a * c;\n' +
    '    if (a < 1e-5) discard;\n' +
    '    float tc = -b / a; vec3 q = oc + d * tc; float dist = length(q - u * dot(q, u)); float pxw = max(-dot(oc, d), 1.0) / uFoc;\n' +
    '    cov = clamp(0.5 - (dist - w) / pxw, 0.0, 1.0); if (cov <= 0.0) discard;\n' +
    '    t = h >= 0.0 ? (-b - sqrt(h)) / a : tc; vec3 pt = O + d * t, rel = pt - vA; float s = dot(rel, u);\n' +
    '    if (s < -pxw || s > L + pxw) discard;\n' +
    '    if (vP.w > 0.5 && vP.w < 1.5) { /* dash flag handled below */ }\n' +
    '    if (vP.z > 0.5 && mod(floor(s / (w * 2.9)), 2.0) > 0.5) discard;\n' +
    '    n = normalize(rel - u * s); float f = clamp(((s / L - 0.5) / 0.08) * 0.5 + 0.5, 0.0, 1.0);\n' +
    '    col = shade(n, mix(vC1, vC2, f), 1.0, 0.9);\n' +
    '  }\n' +
    '  float Z = (O + d * t).z; gl_FragDepth = depth01(Z); oC = vec4(col * cov, cov);\n}\n';

  /* --- translucent ellipsoids: electron clouds (k), bond lenses (e), lobes (o), glassy spheres --- */
  var VS_ELL = HEAD + CV +
    'in vec2 aCorner; in vec4 e0; in vec4 e1; in vec4 e2; in vec4 e3;\n' +
    'out vec3 vC; out vec3 vU; out vec2 vAB; out vec4 vCol; out float vMode;\n' +
    'void main() {\n' +
    '  vec3 C = uR * e0.xyz; vC = C; vU = normalize(uR * e1.xyz); vAB = vec2(e0.w, e1.w); vCol = e2; vMode = e3.x;\n' +
    '  float rb = max(e0.w, e1.w) * 1.08, k = uFoc / (uF - C.z); vec2 px = vec2(k * C.x, k * C.y) + aCorner * (rb * k * 1.15 + 2.0);\n' +
    '  gl_Position = vec4(px / (uView * 0.5), 0.0, 1.0);\n}\n';
  var FS_ELL = HEAD + CF +
    'in vec3 vC; in vec3 vU; in vec2 vAB; in vec4 vCol; in float vMode; out vec4 oC;\n' +
    'void main() {\n' +
    '  vec3 d = rayDir(), O = vec3(0.0, 0.0, uF), oc = O - vC, u = vU; float a = vAB.x, b = vAB.y;\n' +
    '  vec3 e1 = normalize(abs(u.z) < 0.9 ? cross(u, vec3(0.0, 0.0, 1.0)) : cross(u, vec3(1.0, 0.0, 0.0))), e2 = cross(u, e1);\n' +
    '  vec3 q = vec3(dot(oc, e1) / b, dot(oc, e2) / b, dot(oc, u) / a), dq = vec3(dot(d, e1) / b, dot(d, e2) / b, dot(d, u) / a);\n' +
    '  float A = dot(dq, dq), B = dot(q, dq), Cc = dot(q, q) - 1.0, h = B * B - A * Cc;\n' +
    '  float pxw = max(length(oc), 1.0) / uFoc, tm = -B / A, dm = length(q + dq * tm);        // closest approach, in ellipsoid units\n' +
    '  float edge = clamp(0.5 - (dm - 1.0) * b / pxw, 0.0, 1.0);\n' +
    '  if (edge <= 0.0) discard;\n' +
    '  float hs = sqrt(max(h, 0.0)), t1 = (-B - hs) / A, t2 = (-B + hs) / A, thick = max(t2 - t1, 0.0) * edge;\n' +
    '  float tau = clamp(thick / (2.0 * min(a, b) * 1.0 + 1e-4), 0.0, 1.0);\n' +
    '  vec3 col = vCol.rgb; float al;\n' +
    '  if (vMode > 2.5) {                                                                         // glassy sphere\n' +
    '    vec3 n = normalize(O + d * t1 - vC); col = shade(n, col, 1.0, 1.0); al = vCol.a * (0.55 + 0.45 * pow(1.0 - max(n.z, 0.0), 2.0)) * edge;\n' +
    '  } else {                                                                                    // soft cloud: opacity follows thickness\n' +
    '    al = vCol.a * (1.0 - exp(-2.6 * tau)) * 1.12; col = mix(col, vec3(1.0), 0.32 * tau * tau + 0.06);\n' +
    '  }\n' +
    '  if (al <= 0.002) discard; al = min(al, 0.97);\n' +
    '  float Z = (O + d * (h >= 0.0 ? t1 : tm)).z; gl_FragDepth = depth01(Z); oC = vec4(col * al, al);\n}\n';

  /* --- orbitals: GPU ray-marching of a BSWave grid held in a 3D texture (value / iso, so the surface is always |v| = 1) --- */
  var VS_VOL = HEAD + CV +
    'in vec2 aCorner; uniform vec3 uPc; uniform float uRb;\n' +
    'void main() { float k = uFoc / (uF - uPc.z); vec2 px = vec2(k * uPc.x, k * uPc.y) + aCorner * (uRb * k * 1.15 + 2.0); gl_Position = vec4(px / (uView * 0.5), 0.0, 1.0); }\n';
  var FS_VOL = HEAD + CF +
    'uniform sampler3D uTex; uniform vec3 uPc; uniform float uRb, uH, uN, uAlpha, uHasCut; uniform mat3 uInv; uniform vec3 uCp, uCn, uCut; uniform int uSteps; out vec4 oC;\n' +
    'float smp(vec3 p) {\n' +
    '  vec3 g = (p + uH) * ((uN - 1.0) / (2.0 * uH)); if (any(lessThan(g, vec3(0.0))) || any(greaterThan(g, vec3(uN - 1.0)))) return 0.0;\n' +
    '  return texture(uTex, (g + 0.5) / uN).r;\n}\n' +
    'float fa(vec3 p) { return abs(smp(p)) - 1.0; }\n' +
    'float fc(vec3 p) { return uHasCut > 0.5 ? -dot(uCut, p) : 1.0; }\n' +
    'vec3 grad(vec3 p) { float e = 1.3 * (2.0 * uH / (uN - 1.0)); return vec3(smp(p + vec3(e, 0, 0)) - smp(p - vec3(e, 0, 0)), smp(p + vec3(0, e, 0)) - smp(p - vec3(0, e, 0)), smp(p + vec3(0, 0, e)) - smp(p - vec3(0, 0, e))); }\n' +
    'void main() {\n' +
    '  vec3 d = rayDir(), O = vec3(0.0, 0.0, uF), o = O - uPc; float b = dot(o, d), h = b * b - (dot(o, o) - uRb * uRb); if (h <= 0.0) discard;\n' +
    '  float t0 = -b - sqrt(h), t1 = -b + sqrt(h), dt = (t1 - t0) / float(uSteps);\n' +
    '  vec3 pc = uInv * o, dc = uInv * d; vec4 acc = vec4(0.0); float zFirst = 1e9; int hits = 0;\n' +
    '  float tp = t0, aP = fa(pc + dc * t0), cP = fc(pc + dc * t0); bool prev = aP > 0.0 && cP > 0.0;\n' +
    '  for (int i = 1; i <= 160; i++) {\n' +
    '    if (i > uSteps) break; float t = t0 + float(i) * dt; vec3 pq = pc + dc * t; float aC = fa(pq), cC = fc(pq); bool cur = aC > 0.0 && cC > 0.0;\n' +
    '    if (cur != prev) {\n' +
    '      bool iso = prev ? (aC <= 0.0) : (aP <= 0.0);                       // which boundary did the ray cross: the isosurface or the cut plane?\n' +
    '      float lo = tp, hi = t;\n' +
    '      for (int k = 0; k < 7; k++) { float m = 0.5 * (lo + hi); vec3 pm = pc + dc * m; bool st = iso ? (fa(pm) > 0.0) : (fc(pm) > 0.0); bool st0 = iso ? (aP > 0.0) : (cP > 0.0); if (st == st0) lo = m; else hi = m; }\n' +
    '      float th = 0.5 * (lo + hi); vec3 p = pc + dc * th; float v = smp(p); vec3 base = v >= 0.0 ? uCp : uCn, n, c; float al;\n' +
    '      if (!iso) { n = normalize(transpose(uInv) * uCut); if (dot(n, d) > 0.0) n = -n; float br = 0.38 + 0.62 * (1.0 - exp(-0.55 * max(abs(v) - 1.0, 0.0))); c = shade(n, base * br, 1.0, 0.0); al = 0.97 * uAlpha; }\n' +
    '      else {\n' +
    '        vec3 g = grad(p); n = normalize(transpose(uInv) * g + 1e-6); if (dot(n, d) > 0.0) n = -n;\n' +
    '        bool entering = cur; c = shade(n, base, 1.0, 0.9) * (entering ? 1.0 : 0.8); al = uAlpha * (entering ? 0.86 : 0.5);\n' +
    '      }\n' +
    '      if (zFirst > 1e8) zFirst = (O + d * th).z;\n' +
    '      acc.rgb += (1.0 - acc.a) * al * c; acc.a += (1.0 - acc.a) * al; hits++; if (acc.a > 0.93 || hits >= 5) break;\n' +
    '    }\n' +
    '    prev = cur; tp = t; aP = aC; cP = cC;\n' +
    '  }\n' +
    '  if (acc.a < 0.004) discard; gl_FragDepth = depth01(zFirst); oC = acc;\n}\n';

  /* --- lines / arrows (already projected to pixels) --- */
  var VS_LINE = HEAD + 'uniform vec2 uView; in vec2 aCorner; in vec4 l0; in vec4 l1; in vec4 l2; out vec2 vq; out vec4 vCol; out float vW; out float vDash; out float vLen;\n' +
    'void main() {\n' +
    '  vec2 p0 = l0.xy, p1 = l1.xy, dir = p1 - p0; float L = length(dir); dir = L < 1e-4 ? vec2(1.0, 0.0) : dir / L; vec2 nr = vec2(-dir.y, dir.x);\n' +
    '  float hw = l0.w * 0.5 + 1.0; float s = aCorner.x * 0.5 + 0.5;\n' +
    '  vec2 px = mix(p0, p1, s) + dir * aCorner.x * (l0.w * 0.5) + nr * aCorner.y * hw;\n' +
    '  vq = vec2(s * L + aCorner.x * (l0.w * 0.5), aCorner.y * hw); vCol = l2; vW = l0.w * 0.5; vDash = l1.w; vLen = L;\n' +
    '  gl_Position = vec4(px / (uView * 0.5), mix(l0.z, l1.z, s) * 2.0 - 1.0, 1.0);\n}\n';
  var FS_LINE = HEAD + 'in vec2 vq; in vec4 vCol; in float vW; in float vDash; in float vLen; out vec4 oC;\n' +
    'void main() {\n' +
    '  float a = clamp(vW + 0.5 - abs(vq.y), 0.0, 1.0); if (vDash > 0.5 && mod(floor(vq.x / vDash), 2.0) > 0.5) discard; a *= vCol.a; if (a <= 0.003) discard; oC = vec4(vCol.rgb * a, a);\n}\n';

  /* --- text / label sprites --- */
  var VS_TEX = HEAD + CV + 'in vec2 aCorner; uniform vec2 uPos, uSize; uniform vec3 uSph; uniform float uZ; out vec2 vUv;\n' +
    'void main() { vec2 px = uPos + aCorner * uSize * 0.5; vUv = aCorner * 0.5 + 0.5; gl_Position = vec4(px / (uView * 0.5), 0.0, 1.0); }\n';
  var FS_TEX = HEAD + CF + 'uniform sampler2D uImg; uniform vec3 uSph; uniform vec4 uSphC; uniform float uZ, uOwn; in vec2 vUv; out vec4 oC;\n' +
    'void main() {\n' +
    '  vec4 c = texture(uImg, vUv); if (c.a < 0.01) discard; float z = uZ;\n' +
    '  if (uOwn > 0.5) {                                              // the label lives on its own atom: use that sphere\'s surface depth here\n' +
    '    vec3 d = rayDir(), O = vec3(0.0, 0.0, uF), oc = O - uSph; float b = dot(oc, d), h = b * b - (dot(oc, oc) - uSphC.x * uSphC.x);\n' +
    '    z = h >= 0.0 ? (O + d * (-b - sqrt(h))).z : uSph.z + uSphC.x;\n' +
    '  }\n' +
    '  gl_FragDepth = depth01(z) - 0.0004; oC = c;\n}\n';

  /* ---------------------------------------------------------------- GL helpers */
  function compile(gl, type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aCorner'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i, a, an = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES), at = {};
    for (i = 0; i < n; i++) { a = gl.getActiveUniform(p, i); u[a.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, a.name); }
    for (i = 0; i < an; i++) { a = gl.getActiveAttrib(p, i); at[a.name] = gl.getAttribLocation(p, a.name); }
    return { p: p, u: u, a: at };
  }
  var f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
  function toHalf(x) {                                   // float32 → float16 bits
    f32[0] = x; var b = u32[0], s = (b >>> 16) & 0x8000, e = ((b >>> 23) & 0xff) - 112, m = b & 0x7fffff;
    if (e <= 0) { if (e < -10) return s; m = (m | 0x800000) >> (1 - e); return s | ((m + 0x1000) >> 13); }
    if (e >= 31) return s | 0x7c00;
    return s | (e << 10) | ((m + 0x1000) >> 13);
  }

  /* ---------------------------------------------------------------- the GL part of a viewer */
  function GL(cv) {
    var gl = cv.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, depth: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('no webgl2');
    this.gl = gl; this.cv = cv; this.texCache = new root.WeakMap(); this.txt = {}; this.ntxt = 0; this.buf = {};
    this.pSolid = program(gl, VS_SOLID, FS_SOLID); this.pEll = program(gl, VS_ELL, FS_ELL); this.pVol = program(gl, VS_VOL, FS_VOL);
    this.pLine = program(gl, VS_LINE, FS_LINE); this.pTex = program(gl, VS_TEX, FS_TEX);
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.vao = gl.createVertexArray(); this.dyn = {};
  }
  GL.prototype.dynBuf = function (name, data) {
    var gl = this.gl, b = this.dyn[name]; if (!b) b = this.dyn[name] = { buf: gl.createBuffer(), cap: 0 };
    gl.bindBuffer(gl.ARRAY_BUFFER, b.buf);
    if (data.byteLength > b.cap) { b.cap = Math.max(data.byteLength, b.cap * 2, 4096); gl.bufferData(gl.ARRAY_BUFFER, b.cap, gl.DYNAMIC_DRAW); }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data); return b.buf;
  };
  /* attach per-instance attributes (vec4 each) from a Float32Array with `stride` floats per instance, starting at instance `first` */
  GL.prototype.bindInst = function (prog, names, buf, stride, first) {
    var gl = this.gl, i;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (i = 0; i < names.length; i++) {
      var loc = prog.a[names[i]]; if (loc === undefined || loc < 0) continue;
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, stride * 4, (first * stride + i * 4) * 4); gl.vertexAttribDivisor(loc, 1);
    }
  };
  GL.prototype.volTex = function (g) {
    var gl = this.gl, t = this.texCache.get(g); if (t) return t;
    var n = g.n, data = new Uint16Array(n * n * n), inv = 1 / g.iso, i;
    for (i = 0; i < data.length; i++) data[i] = toHalf(g.data[i] * inv);
    t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_3D, t);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage3D(gl.TEXTURE_3D, 0, gl.R16F, n, n, n, 0, gl.RED, gl.HALF_FLOAT, data);
    this.texCache.set(g, t); return t;
  };
  GL.prototype.textTex = function (text, px, color, halo) {
    var key = text + '|' + px + '|' + color + '|' + (halo || ''), t = this.txt[key]; if (t) return t;
    if (this.ntxt > 160) { var gl0 = this.gl, k; for (k in this.txt) gl0.deleteTexture(this.txt[k].tex); this.txt = {}; this.ntxt = 0; }
    var c = doc.createElement('canvas'), x = c.getContext('2d'), font = '700 ' + px + 'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    x.font = font; var w = Math.ceil(x.measureText(text).width + px * 0.8), h = Math.ceil(px * 1.5); c.width = w; c.height = h; x = c.getContext('2d');
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = Math.max(2, px * 0.2); x.strokeStyle = halo || 'rgba(0,0,0,.6)'; x.fillStyle = color;
    x.strokeText(text, w / 2, h / 2 + px * 0.04); x.fillText(text, w / 2, h / 2 + px * 0.04);
    var gl = this.gl, tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.ntxt++; return (this.txt[key] = { tex: tex, w: w, h: h });
  };

  /* ---------------------------------------------------------------- scene → instance records (view independent) */
  function prep(sc) {
    var items = sc.items, solid = [], ell = [], vols = [], over = [], lbl = [], i, it, n;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      switch (it.t) {
        case 's':
          if (!(isFinite(it.x) && isFinite(it.y) && isFinite(it.z) && it.r > 0)) break;
          if (it.a !== undefined && it.a < 0.98) { ell.push({ c: [it.x, it.y, it.z], u: [0, 0, 1], a: it.r, b: it.r, col: it.c, al: it.a, mode: 3 }); }
          else { solid.push({ ty: 0, A: [it.x, it.y, it.z], r: it.r, c1: it.c }); if (it.label) lbl.push(it); }
          break;
        case 'b': {
          var dx = it.q[0] - it.p[0], dy = it.q[1] - it.p[1], dz = it.q[2] - it.p[2], L = Math.hypot(dx, dy, dz); if (L < 1e-6) break;
          var whole = Math.floor(it.o + 0.001), frac = it.o - whole; n = whole + (frac > 0.05 ? 1 : 0); if (n < 1) n = 1;
          for (var j = 0; j < n; j++) solid.push({ ty: 1, A: it.p, B: it.q, r: it.r || 0.11, c1: it.c1, c2: it.c2, j: j, n: n, whole: whole, dash: j >= whole ? 1 : 0 });
          break;
        }
        case 'k': ell.push({ c: [it.x, it.y, it.z], u: [0, 0, 1], a: it.r, b: it.r, col: it.c, al: it.a === undefined ? 0.6 : it.a, mode: 0 }); break;
        case 'e': { var Le = Math.hypot(it.q[0] - it.p[0], it.q[1] - it.p[1], it.q[2] - it.p[2]) || 1e-6;
          ell.push({ c: [(it.p[0] + it.q[0]) / 2, (it.p[1] + it.q[1]) / 2, (it.p[2] + it.q[2]) / 2], u: [(it.q[0] - it.p[0]) / Le, (it.q[1] - it.p[1]) / Le, (it.q[2] - it.p[2]) / Le], a: Le / 2 + it.r * 0.55, b: it.r, col: it.c, al: it.a === undefined ? 0.7 : it.a, mode: 1 }); break; }
        case 'o': ell.push({ c: [it.x + it.d[0] * it.L / 2, it.y + it.d[1] * it.L / 2, it.z + it.d[2] * it.L / 2], u: it.d, a: it.L / 2, b: Math.max(0.05, it.w * 1.3), col: it.c, al: it.a === undefined ? 0.6 : it.a, mode: 2 }); break;
        case 'w': vols.push(it); break;
        case 'l': case 'a': case 't': over.push(it); break;
      }
    }
    return { solid: solid, ell: ell, vols: vols, over: over, lbl: lbl };
  }

  /* ---------------------------------------------------------------- draw */
  function glDraw() {
    var self = this, G = this.glr, gl = G.gl, cv = this.cv, sc = this.sc;
    var bb = cv.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 2.5), W = Math.round(bb.width * dpr), H = Math.round(bb.height * dpr);
    if (!W || !H) return; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    this.dirty = false;
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.depthMask(true); gl.disable(gl.SCISSOR_TEST); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!sc) return;
    var live = this.playing || !!sc.live || !!(sc.anim);
    var P = sc._glp; if (!P || P.src !== sc.items || P.n !== sc.items.length || live) { P = sc._glp = prep(sc); P.src = sc.items; P.n = sc.items.length; }
    var R = this.R, rad = sc.radius || 3, F = rad * 20 + 20, S = Math.min(W, H) / (2.15 * rad) * this.zoom, foc = S * F, zr = rad * 2.2 + 3;
    var Rc = new Float32Array([R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]]);
    function setCommon(pr) {
      gl.useProgram(pr.p); var u = pr.u;
      if (u.uR) gl.uniformMatrix3fv(u.uR, false, Rc); if (u.uView) gl.uniform2f(u.uView, W, H); if (u.uF) gl.uniform1f(u.uF, F); if (u.uFoc) gl.uniform1f(u.uFoc, foc); if (u.uZr) gl.uniform1f(u.uZr, zr);
      if (u.uFog) gl.uniform2f(u.uFog, rad, sc.fog === false ? 0 : 1);
    }
    function vz(p) { return R[6] * p[0] + R[7] * p[1] + R[8] * p[2]; }
    function proj(p) { var X = R[0] * p[0] + R[1] * p[1] + R[2] * p[2], Y = R[3] * p[0] + R[4] * p[1] + R[5] * p[2], Z = vz(p), k = foc / (F - Z); return [k * X, k * Y, clamp(0.5 - Z / (2 * zr), 0, 1), Z, k]; }

    /* 1 — opaque atoms + bonds, sorted back to front */
    var sol = P.solid, ns = sol.length;
    if (ns) {
      var ord = new Array(ns), zk = new Float32Array(ns), i, s;
      for (i = 0; i < ns; i++) { s = sol[i]; zk[i] = s.ty ? (vz(s.A) + vz(s.B)) / 2 : vz(s.A); ord[i] = i; }
      ord.sort(function (a, b) { return zk[a] - zk[b]; });
      var buf = new Float32Array(ns * 20), o = 0;
      for (i = 0; i < ns; i++) {
        s = sol[ord[i]]; var c1 = s.c1, c2 = s.c2 || s.c1;
        buf[o] = s.ty; buf[o + 1] = s.A[0]; buf[o + 2] = s.A[1]; buf[o + 3] = s.A[2];
        buf[o + 4] = s.r; if (s.ty) { buf[o + 5] = s.B[0]; buf[o + 6] = s.B[1]; buf[o + 7] = s.B[2]; }
        buf[o + 8] = c1[0] / 255; buf[o + 9] = c1[1] / 255; buf[o + 10] = c1[2] / 255; buf[o + 11] = s.dash || 0;
        buf[o + 12] = c2[0] / 255; buf[o + 13] = c2[1] / 255; buf[o + 14] = c2[2] / 255; buf[o + 15] = 1;
        buf[o + 16] = s.j || 0; buf[o + 17] = s.n || 1; buf[o + 18] = s.whole || 0; buf[o + 19] = 0; o += 20;
      }
      setCommon(G.pSolid); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      var b0 = G.dynBuf('solid', buf); G.bindInst(G.pSolid, ['a0', 'a1', 'a2', 'a3', 'a4'], b0, 20, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ns);
    }

    /* 2 — translucent: clouds, lenses, lobes (sorted), then orbital volumes (sorted) */
    gl.depthMask(false);
    var ne = P.ell.length;
    if (ne) {
      var eo = new Array(ne), ez = new Float32Array(ne), q; for (i = 0; i < ne; i++) { ez[i] = vz(P.ell[i].c); eo[i] = i; }
      eo.sort(function (a, b) { return ez[a] - ez[b]; });
      var eb = new Float32Array(ne * 16), p2 = 0;
      for (i = 0; i < ne; i++) {
        q = P.ell[eo[i]]; var uu = q.u, ul = Math.hypot(uu[0], uu[1], uu[2]) || 1;
        eb[p2] = q.c[0]; eb[p2 + 1] = q.c[1]; eb[p2 + 2] = q.c[2]; eb[p2 + 3] = q.a; eb[p2 + 4] = uu[0] / ul; eb[p2 + 5] = uu[1] / ul; eb[p2 + 6] = uu[2] / ul; eb[p2 + 7] = q.b;
        eb[p2 + 8] = q.col[0] / 255; eb[p2 + 9] = q.col[1] / 255; eb[p2 + 10] = q.col[2] / 255; eb[p2 + 11] = clamp(q.al, 0, 1); eb[p2 + 12] = q.mode; p2 += 16;
      }
      setCommon(G.pEll); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      var b1 = G.dynBuf('ell', eb); G.bindInst(G.pEll, ['e0', 'e1', 'e2', 'e3'], b1, 16, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ne);
    }
    var nv = P.vols.length;
    if (nv) {
      var vo = P.vols.map(function (v, k) { return k; }), vzs = P.vols.map(function (v) { return vz([v.x || 0, v.y || 0, v.z || 0]); });
      vo.sort(function (a, b) { return vzs[a] - vzs[b]; });
      var pr = G.pVol; setCommon(pr); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(G.vao); gl.bindBuffer(gl.ARRAY_BUFFER, G.quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(0, 0);
      var steps = this.glSteps || 72;
      vo.forEach(function (k) {
        var w = P.vols[k], f = w.f, M = w.M || [1, 0, 0, 0, 1, 0, 0, 0, 1], sc2 = w.s || 1, is = 1 / sc2, cx = w.x || 0, cy = w.y || 0, cz = w.z || 0;
        var Pc = [R[0] * cx + R[1] * cy + R[2] * cz, R[3] * cx + R[4] * cy + R[5] * cz, R[6] * cx + R[7] * cy + R[8] * cz];
        var RM = new Array(9), a, b; for (a = 0; a < 3; a++) for (b = 0; b < 3; b++) RM[a * 3 + b] = R[a * 3] * M[b] + R[a * 3 + 1] * M[3 + b] + R[a * 3 + 2] * M[6 + b];   // canonical → view
        var Inv = new Float32Array([RM[0] * is, RM[1] * is, RM[2] * is, RM[3] * is, RM[4] * is, RM[5] * is, RM[6] * is, RM[7] * is, RM[8] * is]);   // columns of (RM)ᵀ/s : view → canonical (row i of RMᵀ = column i of RM)
        var u = pr.u, cut = w.cut;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, G.volTex(f)); gl.uniform1i(u.uTex, 0);
        gl.uniform3f(u.uPc, Pc[0], Pc[1], Pc[2]); gl.uniform1f(u.uRb, f.ext * sc2 * 1.06 + 0.02); gl.uniform1f(u.uH, f.h); gl.uniform1f(u.uN, f.n);
        gl.uniform1f(u.uAlpha, w.a === undefined ? 0.82 : w.a); gl.uniformMatrix3fv(u.uInv, false, Inv);
        gl.uniform3f(u.uCp, w.cp[0] / 255, w.cp[1] / 255, w.cp[2] / 255); gl.uniform3f(u.uCn, w.cn[0] / 255, w.cn[1] / 255, w.cn[2] / 255);
        gl.uniform1f(u.uHasCut, cut ? 1 : 0); gl.uniform3f(u.uCut, cut ? cut[0] : 0, cut ? cut[1] : 0, cut ? cut[2] : 1); gl.uniform1i(u.uSteps, steps);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
    }

    /* 3 — labels on their own atoms, then lines / arrows / free text */
    gl.enable(gl.DEPTH_TEST); gl.depthMask(false);
    var trp = G.pTex; setCommon(trp); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(G.vao); gl.bindBuffer(gl.ARRAY_BUFFER, G.quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(0, 0);
    function sprite(tx, cx, cy, own, sph, z) {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx.tex); gl.uniform1i(trp.u.uImg, 0);
      gl.uniform2f(trp.u.uPos, cx, cy); gl.uniform2f(trp.u.uSize, tx.w, tx.h); gl.uniform1f(trp.u.uOwn, own ? 1 : 0); gl.uniform1f(trp.u.uZ, z || 0);
      gl.uniform3f(trp.u.uSph, sph ? sph[0] : 0, sph ? sph[1] : 0, sph ? sph[2] : 0); gl.uniform4f(trp.u.uSphC, sph ? sph[3] : 0, 0, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    P.lbl.forEach(function (it) {
      var pp = proj([it.x, it.y, it.z]), rpx = it.r * pp[4], always = !!it.labelAlways; if (rpx < 7 * dpr && !always) return;
      var fs = Math.round(always ? 13 * dpr : Math.min(rpx * 0.95, 17 * dpr)), tx = G.textTex(it.label, fs, '#ffffff'), cxp = pp[0], cyp = pp[1];
      if (it.labelDir) { var ld = it.labelDir, vx = R[0] * ld[0] + R[1] * ld[1] + R[2] * ld[2], vy = R[3] * ld[0] + R[4] * ld[1] + R[5] * ld[2], vl = Math.hypot(vx, vy);
        if (vl > 0.2) { cxp += vx / vl * rpx * (it.labelOff || 0.5) * Math.min(1, vl * 1.2); cyp += vy / vl * rpx * (it.labelOff || 0.5) * Math.min(1, vl * 1.2); } }
      if (always) cyp += rpx * 0.5 + fs * 0.55;
      var V = [R[0] * it.x + R[1] * it.y + R[2] * it.z, R[3] * it.x + R[4] * it.y + R[5] * it.z, pp[3], it.r];
      sprite(tx, cxp, cyp, true, V, 0);
    });
    var lines = [], ink = [0.9, 0.9, 0.92];
    try { var cs = root.getComputedStyle(cv).color.match(/[\d.]+/g); if (cs) ink = [cs[0] / 255, cs[1] / 255, cs[2] / 255]; } catch (e) { }
    function pushLine(a, b, w, col, al, dash, dA, dB) { lines.push(a[0], a[1], dA === undefined ? a[2] : dA, w, b[0], b[1], dB === undefined ? b[2] : dB, dash || 0, col[0], col[1], col[2], al); }
    var arrows = [];
    P.over.forEach(function (it) {
      if (it.t === 'l') { var a = proj(it.p), b = proj(it.q), col = it.c ? [it.c[0] / 255, it.c[1] / 255, it.c[2] / 255] : ink, al = it.c ? (it.a === undefined ? 0.5 : it.a) : (it.a === undefined ? 0.35 : it.a); pushLine(a, b, (it.w || 1.2) * dpr, col, al, it.dash ? 5 * dpr : 0); }
      else if (it.t === 'a') arrows.push(it);
    });
    if (lines.length) {
      setCommon(G.pLine); gl.useProgram(G.pLine.p); gl.uniform2f(G.pLine.u.uView, W, H); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      var nl = lines.length / 12, lb = G.dynBuf('line', new Float32Array(lines)); G.bindInst(G.pLine, ['l0', 'l1', 'l2'], lb, 12, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nl);
    }
    gl.disable(gl.DEPTH_TEST);
    if (arrows.length) {
      var al2 = [];
      arrows.forEach(function (it) {
        var a = proj(it.p), b = proj(it.q), c = it.c || [255, 176, 32], col = [c[0] / 255, c[1] / 255, c[2] / 255], w = (it.w || 3.2) * dpr, vx = b[0] - a[0], vy = b[1] - a[1], L = Math.hypot(vx, vy); if (L < 4) return;
        var ux = vx / L, uy = vy / L, hl = Math.min(L * 0.5, 13 * dpr), z = 0.01;
        function seg(x0, y0, x1, y1, ww) { al2.push(x0, y0, z, ww, x1, y1, z, 0, col[0], col[1], col[2], 0.95); }
        seg(a[0], a[1], b[0] - ux * hl * 0.6, b[1] - uy * hl * 0.6, w);
        for (var k = 0; k < 4; k++) { var f = 0.15 + k * 0.28; seg(b[0] - ux * hl + (-uy) * hl * 0.5 * (1 - f) * 0 , b[1] - uy * hl, b[0], b[1], 0.1); }
        seg(b[0] - ux * hl - uy * hl * 0.5, b[1] - uy * hl + ux * hl * 0.5, b[0], b[1], w * 0.95); seg(b[0] - ux * hl + uy * hl * 0.5, b[1] - uy * hl - ux * hl * 0.5, b[0], b[1], w * 0.95);
        seg(a[0] - uy * 5 * dpr, a[1] + ux * 5 * dpr, a[0] + uy * 5 * dpr, a[1] - ux * 5 * dpr, w * 0.7);
      });
      setCommon(G.pLine); var ab = G.dynBuf('arr', new Float32Array(al2)); G.bindInst(G.pLine, ['l0', 'l1', 'l2'], ab, 12, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, al2.length / 12);
    }
    P.over.forEach(function (it) {
      if (it.t !== 't') return; var pp = proj([it.x, it.y, it.z]), fs = Math.round((it.size || 13) * dpr), c = it.c || [Math.round(ink[0] * 255), Math.round(ink[1] * 255), Math.round(ink[2] * 255)];
      var tx = G.textTex(it.text, fs, 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')', it.halo);
      setCommon(trp); gl.useProgram(trp.p); gl.bindVertexArray(G.vao); gl.bindBuffer(gl.ARRAY_BUFFER, G.quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      sprite(tx, pp[0] + (it.dx || 0) * dpr, pp[1] - (it.dy || 0) * dpr, false, null, 0);
    });
    gl.disable(gl.BLEND); gl.bindVertexArray(null);
    var dt = 0; void dt; void self;
  }

  /* ---------------------------------------------------------------- the public Viewer: GPU when possible, CPU otherwise */
  function GLViewer(cv, opts) {
    var v = new Legacy(cv, opts);
    try {
      v.glr = new GL(cv); v.draw = glDraw; v.drawSolid = glDraw; v.drawLegacy = glDraw; v.gpu = true;
      cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); v.glLost = true; }, false);
      cv.addEventListener('webglcontextrestored', function () { try { v.glr = new GL(cv); v.glLost = false; v.dirty = true; v.wake(); } catch (x) { } }, false);
      var oldDestroy = v.destroy;
      v.destroy = function () { oldDestroy.call(v); try { var ex = v.glr.gl.getExtension('WEBGL_lose_context'); if (ex) ex.loseContext(); } catch (x) { } };
      v.snapshot = function () { glDraw.call(v); return cv.toDataURL('image/png'); };
    } catch (e) { if (root.console) root.console.warn('BS3D: GPU renderer unavailable, using the CPU renderer —', e.message); v.gpu = false; }
    return v;
  }
  GLViewer.prototype = Legacy.prototype;
  V3.Legacy = Legacy; V3.Viewer = GLViewer; V3.gl = true;
})(typeof window !== 'undefined' ? window : globalThis);

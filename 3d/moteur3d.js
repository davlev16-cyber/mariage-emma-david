/* Emma & David · version 3D
   moteur3d.js : le rendu WebGL (Three.js), les deux « vues » qui se fondent l'une dans l'autre, la caméra
   (mêmes réglages que la version cinéma : position, focale, horizon), le ciel, la mer, les lueurs, les feux d'artifice. */
import * as THREE from './lib/three.module.min.js';

const MF = window.MF = {};
MF.THREE = THREE;

/* ---------- outils (identiques à la version cinéma) ---------- */
const clamp = MF.clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = MF.lerp = (a, b, t) => a + (b - a) * t;
MF.ease = {
  lin: t => clamp(t),
  io: t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => (t = clamp(t), 1 - Math.pow(1 - t, 3)),
  sine: t => (t = clamp(t), .5 - Math.cos(Math.PI * t) / 2),
};
MF.rng = seed => () => {
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
MF.hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
MF.mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
MF.rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
MF.palette = table => {
  const cles = Object.keys(table).map(Number).sort((a, b) => a - b);
  const conv = {};
  for (const c of cles) { conv[c] = {}; for (const [n, v] of Object.entries(table[c])) conv[c][n] = typeof v === 'string' ? MF.hex(v) : v; }
  return x => {
    let a = cles[0], b = cles[cles.length - 1];
    for (let i = 0; i < cles.length - 1; i++) if (x >= cles[i] && x <= cles[i + 1]) { a = cles[i]; b = cles[i + 1]; break; }
    const t = b === a ? 0 : clamp((x - a) / (b - a)), o = {};
    for (const n of Object.keys(conv[a])) { const u = conv[a][n], v = conv[b][n]; o[n] = Array.isArray(u) ? MF.mix(u, v, t) : lerp(u, v, t); }
    return o;
  };
};
MF.toile = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
// couleur sRGB [r,g,b] (0-255) ou '#hex' -> THREE.Color (les dégradés du ciel restent en sRGB, comme la version cinéma)
MF.vec = (c, cible = new THREE.Vector3()) => { const a = typeof c === 'string' ? MF.hex(c) : c; return cible.set(a[0] / 255, a[1] / 255, a[2] / 255); };
MF.couleur = (c, cible = new THREE.Color()) => { const a = typeof c === 'string' ? MF.hex(c) : c; return cible.setRGB(a[0] / 255, a[1] / 255, a[2] / 255, THREE.SRGBColorSpace); };
MF.texture = (cv, { srgb = true, repete = false } = {}) => {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repete) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
};

const TELEPHONE = MF.TELEPHONE = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 700;
MF.W = 0; MF.H = 0; MF.DPR = 1; MF.qualite = 1;
MF.detail = 1;
MF.garde = i => MF.detail >= 1 || (i * .618034) % 1 < MF.detail;
MF.scenes = {};
MF.avant = [];
MF.apres = [];
MF.temps = 0;

/* =====================================================================
   La caméra : mêmes réglages que la version cinéma.
   Monde de la version cinéma : X à droite, Y vers le bas (sol à 0), Z en profondeur.
   Dans Three.js : x = X, y = -Y (hauteur), z = -Z. La caméra regarde vers les Z croissants.
   focale : en hauteurs d'écran ; tilt : décalage de l'horizon (objectif décentré, les verticales restent droites).
   lacet / tangage : rotations en plus, pour les mouvements « en vraie 3D ».
   ===================================================================== */
MF.vers = (X, Y, Z, v = new THREE.Vector3()) => v.set(X, -Y, -Z);
MF.cadre = (cam, p, W, H) => {
  cam.position.set(p.camX || 0, -(p.camY || 0), -(p.camZ || 0));
  cam.rotation.set(p.tangage || 0, p.lacet || 0, p.roulis || 0, 'YXZ');
  cam.fov = 2 * Math.atan(.5 / (p.focale || 1)) * 180 / Math.PI;
  cam.aspect = W / H;
  cam.setViewOffset(W, H, 0, -(p.tilt || 0) * H, W, H);
  cam.updateProjectionMatrix();
};

/* ---------- direction d'un point « à l'infini » (azimut, élévation), comme infini() de la version cinéma ---------- */
MF.direction = (az, el, v = new THREE.Vector3()) => v.set(Math.sin(az), Math.sin(el), -Math.cos(az)).normalize();

/* =====================================================================
   Morceaux de shader partagés : le dégradé du ciel (en sRGB, comme la version cinéma), le soleil et son halo
   ===================================================================== */
MF.GLSL_CIEL = `
uniform vec3 uStops[5];
uniform float uN;
uniform float uElMax;
uniform vec3 uSoleil;
uniform float uSoleilR;
uniform vec3 uCoeur;
uniform vec3 uHalo;
uniform float uForce;
uniform float uCoupe;
vec3 lin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
vec3 degradeCiel(float el) {
  float u = clamp(1.0 - max(el, 0.0) / uElMax, 0.0, 1.0) * (uN - 1.0);
  vec3 c = uStops[0];
  for (int i = 0; i < 4; i++) c = mix(c, uStops[i + 1], clamp(u - float(i), 0.0, 1.0));
  return c;
}
// halo du soleil : mêmes paliers que la version cinéma (0 : 0,5 · 0,1 : 0,3 · 0,35 : 0,09 · 1 : 0)
float haloSoleil(float k) {
  if (k < 0.1) return mix(0.5, 0.3, k / 0.1);
  if (k < 0.35) return mix(0.3, 0.09, (k - 0.1) / 0.25);
  return mix(0.09, 0.0, clamp((k - 0.35) / 0.65, 0.0, 1.0));
}
vec3 couleurCiel(vec3 d, bool disque) {
  vec3 c = degradeCiel(d.y);
  if (uForce > 0.001) {
    float ang = acos(clamp(dot(d, uSoleil), -1.0, 1.0));
    float h = haloSoleil(ang / (uSoleilR * 11.0)) * uForce;
    c = mix(c, uHalo, clamp(h, 0.0, 1.0));
    if (disque) {
      float k = ang / (uSoleilR * 1.18);
      float a = (k < 0.8 ? 1.0 : clamp(1.0 - (k - 0.8) / 0.2, 0.0, 1.0)) * clamp(uForce * 1.5, 0.0, 1.0);
      if (uCoupe > 0.5) a *= smoothstep(-0.002, 0.002, d.y);
      c = mix(c, mix(uHalo, uCoeur, smoothstep(1.0, 0.8, k)), a);
    }
  }
  return c;
}`;
// réglages du ciel communs au dôme et à la mer
MF.uniformsCiel = () => ({
  uStops: { value: [0, 1, 2, 3, 4].map(() => new THREE.Vector3()) }, uN: { value: 4 }, uElMax: { value: .6 },
  uSoleil: { value: new THREE.Vector3(0, .05, -1).normalize() }, uSoleilR: { value: .03 },
  uCoeur: { value: new THREE.Vector3(1, .95, .85) }, uHalo: { value: new THREE.Vector3(1, .9, .75) }, uForce: { value: 0 }, uCoupe: { value: 1 },
});
// cols : couleurs du ciel du haut vers l'horizon (comme la version cinéma) ; span : hauteur du dégradé (en hauteurs d'écran)
MF.reglerCiel = (u, cols, span, soleil) => {
  for (let i = 0; i < 5; i++) MF.vec(cols[Math.min(i, cols.length - 1)], u.uStops.value[i]);
  u.uN.value = cols.length;
  u.uElMax.value = Math.atan(span / .95);
  if (soleil) {
    MF.direction(soleil.az || 0, soleil.el, u.uSoleil.value);
    u.uSoleilR.value = soleil.r; u.uForce.value = soleil.force;
    MF.vec(soleil.coeur, u.uCoeur.value); MF.vec(soleil.halo, u.uHalo.value); u.uCoupe.value = soleil.coupe ? 1 : 0;
  } else u.uForce.value = 0;
};

/* ---------- le dôme du ciel ---------- */
MF.Ciel = class {
  constructor(scene) {
    this.u = MF.uniformsCiel();
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.u, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: MF.GLSL_CIEL + `
        varying vec3 vDir;
        void main() { vec3 d = normalize(vDir); gl_FragColor = vec4(lin(couleurCiel(d, true)), 1.0);
        #include <colorspace_fragment>
        }`,
    }));
    this.mesh.renderOrder = -10; this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  suivre(cam) { this.mesh.position.copy(cam.position); }
};

/* ---------- la mer : dégradé (loin → près), reflet du ciel, chemin de lumière du soleil ou de la lune, houle ---------- */
let bruitTex = null;
function textureBruit() {
  if (bruitTex) return bruitTex;
  // petites vagues : somme de sinus à fréquences entières (l'image se répète sans couture), stockée en pentes x / z
  const N = 256, cv = MF.toile(N, N), x = cv.getContext('2d'), im = x.createImageData(N, N), r = MF.rng(41);
  const ondes = Array.from({ length: 14 }, () => ({ fx: Math.round((r() - .5) * 22), fy: Math.round((r() - .5) * 22), ph: r() * 6.283, a: .3 + r() }));
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let dx = 0, dy = 0;
    for (const o of ondes) { const c = Math.cos(6.283 * (o.fx * i + o.fy * j) / N + o.ph) * o.a; dx += c * o.fx; dy += c * o.fy; }
    const k = (j * N + i) * 4;
    im.data[k] = 128 + clamp(dx * 2.2, -127, 127); im.data[k + 1] = 128 + clamp(dy * 2.2, -127, 127); im.data[k + 2] = 255; im.data[k + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  bruitTex = MF.texture(cv, { srgb: false, repete: true });
  return bruitTex;
}
MF.Mer = class {
  constructor(scene) {
    this.u = Object.assign(MF.uniformsCiel(), {
      uTemps: { value: 0 }, uCols: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uNC: { value: 3 },
      uTeinte: { value: new THREE.Vector3(1, .9, .8) }, uReflet: { value: .6 }, uEclat: { value: 1 }, uBruit: { value: textureBruit() },
      uAstre: { value: new THREE.Vector3(0, .05, -1).normalize() }, uAstreForce: { value: 1 }, uAstreCol: { value: new THREE.Vector3(1, .9, .7) },
      uBrume: { value: .5 }, uCalme: { value: 1 },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
      uniforms: this.u, fog: false,
      vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: MF.GLSL_CIEL + `
        uniform float uTemps; uniform vec3 uCols[4]; uniform float uNC; uniform vec3 uTeinte; uniform float uReflet; uniform float uEclat;
        uniform sampler2D uBruit; uniform vec3 uAstre; uniform float uAstreForce; uniform vec3 uAstreCol; uniform float uBrume; uniform float uCalme;
        varying vec3 vW;
        vec2 houle(vec2 q, float t) {
          vec2 g = vec2(0.0);
          g += 0.060 * 0.70 * cos(dot(q, vec2(0.12, 0.70)) - t * 0.9) * vec2(0.12, 0.70);
          g += 0.040 * 1.20 * cos(dot(q, vec2(-0.55, 1.05)) - t * 1.3) * vec2(-0.55, 1.05);
          g += 0.025 * 2.10 * cos(dot(q, vec2(1.40, 1.70)) - t * 1.9) * vec2(1.40, 1.70) / 2.2;
          g += 0.016 * 3.30 * cos(dot(q, vec2(-2.60, 2.10)) - t * 2.4) * vec2(-2.60, 2.10) / 3.3;
          return g;
        }
        void main() {
          vec3 V = normalize(vW - cameraPosition);
          float dist = length(vW.xz - cameraPosition.xz);
          float att = 1.0 / (1.0 + dist * 0.05);
          float fin = 1.0 - smoothstep(25.0, 90.0, dist);
          vec2 q = vW.xz;
          vec2 g = houle(q, uTemps) * att * uCalme;
          g += (texture2D(uBruit, q * 0.11 + uTemps * vec2(0.010, 0.018)).xy - 0.5) * 0.5 * att * fin * uCalme;
          g += (texture2D(uBruit, q * 0.027 - uTemps * vec2(0.004, 0.007)).xy - 0.5) * 0.7 * att * uCalme;
          g += (texture2D(uBruit, q * 0.0041 + uTemps * vec2(0.0015, -0.001)).xy - 0.5) * 0.35 * uCalme;
          vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
          vec3 R = reflect(V, n); R.y = abs(R.y) + 0.002;
          // dégradé de la mer : de l'horizon (loin) vers le bas de l'écran (près), comme la version cinéma
          float dep = clamp(-V.y / 0.55, 0.0, 1.0);
          float u = pow(dep, 0.75) * (uNC - 1.0);
          vec3 fond = uCols[0];
          for (int i = 0; i < 3; i++) fond = mix(fond, uCols[i + 1], clamp(u - float(i), 0.0, 1.0));
          vec3 ciel = couleurCiel(R, false);
          float fres = 0.02 + 0.98 * pow(1.0 - max(dot(-V, n), 0.0), 5.0);
          vec3 c = mix(fond, ciel, clamp(fres * uReflet * 1.4, 0.0, 0.7));
          // chemin de lumière de l'astre (soleil ou lune)
          float s = max(dot(R, uAstre), 0.0);
          float eclat = pow(s, 900.0) * 2.2 + pow(s, 140.0) * 0.32 + pow(s, 22.0) * 0.045;
          c += uAstreCol * eclat * uAstreForce * uEclat;
          // brume claire sur l'horizon
          float hz = 1.0 - smoothstep(0.0, 0.045, -V.y);
          c = mix(c, uTeinte, hz * uBrume);
          gl_FragColor = vec4(lin(min(c, vec3(1.0))), 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -5;
    scene.add(this.mesh);
  }
  // o : niveau (sous le sol), cols (loin → près), teinte, astre {az, el, force, col}, reflet, eclat
  regler(o, ciel) {
    const u = this.u;
    this.niveau = o.niveau;
    for (let i = 0; i < 4; i++) MF.vec(o.cols[Math.min(i, o.cols.length - 1)], u.uCols.value[i]);
    u.uNC.value = o.cols.length;
    MF.vec(o.teinte, u.uTeinte.value);
    u.uReflet.value = o.reflet ?? .6; u.uEclat.value = o.eclat ?? 1; u.uBrume.value = o.brume ?? .5; u.uCalme.value = o.calme ?? 1;
    if (o.astre) { MF.direction(o.astre.az || 0, Math.max(.004, o.astre.el), u.uAstre.value); u.uAstreForce.value = o.astre.force; MF.vec(o.astre.col, u.uAstreCol.value); }
    else u.uAstreForce.value = 0;
    // le reflet du ciel utilise les mêmes réglages que le dôme
    for (const k of ['uN', 'uElMax', 'uSoleilR', 'uForce', 'uCoupe']) u[k].value = ciel.u[k].value;
    for (let i = 0; i < 5; i++) u.uStops.value[i].copy(ciel.u.uStops.value[i]);
    u.uSoleil.value.copy(ciel.u.uSoleil.value); u.uCoeur.value.copy(ciel.u.uCoeur.value); u.uHalo.value.copy(ciel.u.uHalo.value);
  }
  suivre(cam, t) {
    this.mesh.position.set(cam.position.x, -this.niveau, cam.position.z);
    this.u.uTemps.value = t;
  }
};

/* =====================================================================
   Lueurs : des halos lumineux (lanternes, bougies, lumières de la côte, braises, feux d'artifice),
   tous dessinés en une seule fois. Toujours tournés vers la caméra, ou posés à plat sur le sol (sol: true).
   ===================================================================== */
MF.Lueurs = class {
  constructor(scene, max, { sol = false, douceur = 1, ordre = 5, profondeur = true } = {}) {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
    this.pos = new Float32Array(max * 3); this.taille = new Float32Array(max); this.col = new Float32Array(max * 4);
    g.setAttribute('centre', new THREE.InstancedBufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('taille', new THREE.InstancedBufferAttribute(this.taille, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('teinte', new THREE.InstancedBufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0;
    this.g = g; this.max = max; this.n = 0;
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: profondeur, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uDouceur: { value: douceur } },
      vertexShader: `
        attribute vec3 centre; attribute float taille; attribute vec4 teinte;
        varying vec2 vUv; varying vec4 vT;
        void main() {
          vUv = uv; vT = teinte;
          ${sol ? `vec4 w = vec4(centre + vec3(position.x, 0.0, -position.y) * taille, 1.0); gl_Position = projectionMatrix * viewMatrix * w;`
                : `vec4 mv = viewMatrix * vec4(centre, 1.0); mv.xy += position.xy * taille; mv.z += taille * 0.35; gl_Position = projectionMatrix * mv;`}
        }`,
      fragmentShader: `
        uniform float uDouceur; varying vec2 vUv; varying vec4 vT;
        void main() {
          float r = length(vUv - 0.5) * 2.0;
          float a = r < 0.18 * uDouceur ? mix(1.0, 0.55, r / (0.18 * uDouceur)) : r < 0.45 ? mix(0.55, 0.16, (r - 0.18 * uDouceur) / (0.45 - 0.18 * uDouceur)) : mix(0.16, 0.0, clamp((r - 0.45) / 0.55, 0.0, 1.0));
          gl_FragColor = vec4(pow(vT.rgb, vec3(2.2)) * a * vT.a, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = ordre;
    scene.add(this.mesh);
  }
  vide() { this.n = 0; }
  // x, y, z : position Three.js ; t : diamètre (m) ; c : [r, g, b] 0-255 ; a : intensité
  ajoute(x, y, z, t, c, a) {
    if (this.n >= this.max || a <= .003) return;
    const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z; this.taille[i] = t;
    this.col[i * 4] = c[0] / 255; this.col[i * 4 + 1] = c[1] / 255; this.col[i * 4 + 2] = c[2] / 255; this.col[i * 4 + 3] = a;
  }
  envoie() {
    this.g.instanceCount = this.n;
    if (!this.n && !this.avant) return;
    for (const k of ['centre', 'taille', 'teinte']) {
      const at = this.g.attributes[k];
      if (this.n) at.addUpdateRange(0, this.n * at.itemSize);
      at.needsUpdate = true;
    }
    this.avant = this.n;
  }
};

/* ---------- étoiles : un nuage de points à l'infini, qui scintillent ---------- */
MF.Etoiles = class {
  constructor(scene, n, graine = 3) {
    const r = MF.rng(graine), dir = new Float32Array(n * 3), att = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const brill = Math.pow(r(), 6), az = (r() - .5) * 3.2, el = .02 + Math.pow(r(), .8) * 1.3;
      const d = MF.direction(az, el);
      dir.set([d.x, d.y, d.z], i * 3);
      att.set([.7 + brill * 2.2, .35 + r() * .5 + brill * .3, r() * 7], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dir, 3));
    g.setAttribute('reglage', new THREE.BufferAttribute(att, 3));
    this.u = { uAlpha: { value: 0 }, uTemps: { value: 0 }, uPix: { value: 1 } };
    this.mesh = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `
        attribute vec3 reglage; uniform float uTemps; uniform float uPix; varying float vA;
        void main() {
          vec3 w = cameraPosition + position * 1000.0;
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
          float sc = 0.55 + 0.45 * sin(uTemps * (0.6 + fract(reglage.z) * 2.4) + reglage.z);
          vA = reglage.y * (0.55 + 0.45 * sc) * smoothstep(0.0, 0.12, position.y);
          gl_PointSize = (reglage.x * 2.2 + 1.0) * uPix;
        }`,
      fragmentShader: `
        uniform float uAlpha; varying float vA;
        void main() { float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, r); a = a * a;
          gl_FragColor = vec4(vec3(0.92, 0.91, 1.0) * a * vA * uAlpha, 1.0);
          #include <colorspace_fragment>
        }`,
    }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = -9;
    scene.add(this.mesh);
  }
  regler(alpha, t) { this.u.uAlpha.value = alpha; this.u.uTemps.value = t; this.u.uPix.value = MF.DPR; this.mesh.visible = alpha > .01; }
};

/* ---------- nuages : les mêmes nuages peints que la version cinéma, posés à l'infini ---------- */
const nuagesTex = {};
function nuageTex(cle, clair, ombre, v) {
  const k = cle + v;
  if (nuagesTex[k]) return nuagesTex[k];
  const cv = MF.toile(840, 180), x = cv.getContext('2d'), r = MF.rng(97 + v * 31);
  x.scale(2, 2);
  for (let i = 0; i < 30; i++) {
    const cx = 50 + r() * 320, cy = 50 + (r() - .5) * 16, rx = 26 + r() * 52, ry = 9 + r() * 12;
    const g = x.createRadialGradient(cx, cy - ry * .4, 0, cx, cy - ry * .4, rx);
    g.addColorStop(0, 'rgba(' + ombre + ',.16)'); g.addColorStop(1, 'rgba(' + ombre + ',0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy - ry * .4, rx, ry, 0, 0, 6.283); x.fill();
    const g2 = x.createRadialGradient(cx, cy + ry * .3, 0, cx, cy + ry * .3, rx * .9);
    g2.addColorStop(0, 'rgba(' + clair + ',.32)'); g2.addColorStop(1, 'rgba(' + clair + ',0)');
    x.fillStyle = g2; x.beginPath(); x.ellipse(cx, cy + ry * .3, rx * .9, ry * .8, 0, 0, 6.283); x.fill();
  }
  return (nuagesTex[k] = MF.texture(cv));
}
MF.Nuages = class {
  constructor(scene, n, cle, clair, ombre, elMax, graine) {
    const r = MF.rng(graine);
    this.n = Array.from({ length: n }, (_, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: nuageTex(cle, clair, ombre, i % 3), transparent: true, depthWrite: false, fog: false }));
      s.renderOrder = -8; s.frustumCulled = false; scene.add(s);
      return { s, az: (r() - .5) * 2.6, el: .04 + Math.pow(r(), 1.3) * elMax, larg: .2 + r() * .38, haut: .03 + r() * .025, v: .0015 + r() * .003 };
    });
    this.d = new THREE.Vector3();
  }
  regler(cam, t, alpha) {
    const D = 1200;
    for (const o of this.n) {
      const az = ((o.az + t * o.v + 1.5) % 3 + 3) % 3 - 1.5;
      MF.direction(az, o.el, this.d);
      o.s.position.copy(cam.position).addScaledVector(this.d, D);
      o.s.scale.set(o.larg * D, o.haut * D, 1);
      o.s.material.opacity = alpha; o.s.visible = alpha > .01;
    }
  }
};

/* ---------- lune : croissant (Chabbat) ou pleine (nuit de la houppa) ---------- */
MF.lune = (() => {
  const t = {};
  return pleine => {
    if (t[pleine]) return t[pleine];
    const cv = MF.toile(256, 256), x = cv.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,244,214,.34)'); g.addColorStop(.3, 'rgba(255,240,210,.12)'); g.addColorStop(1, 'rgba(255,240,210,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const m = MF.toile(256, 256), y = m.getContext('2d');
    y.fillStyle = '#fff7e2'; y.beginPath(); y.arc(128, 128, 30, 0, 7); y.fill();
    if (!pleine) { y.globalCompositeOperation = 'destination-out'; y.beginPath(); y.arc(141, 121, 27, 0, 7); y.fill(); }
    x.drawImage(m, 0, 0);
    return (t[pleine] = MF.texture(cv));
  };
})();
MF.Lune = class {
  constructor(scene, pleine) {
    this.s = new THREE.Sprite(new THREE.SpriteMaterial({ map: MF.lune(pleine), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    this.s.renderOrder = -7; this.s.frustumCulled = false; scene.add(this.s); this.d = new THREE.Vector3();
  }
  regler(cam, az, el, taille, alpha) {
    const D = 1100;
    MF.direction(az, el, this.d);
    this.s.position.copy(cam.position).addScaledVector(this.d, D);
    this.s.scale.set(taille * D, taille * D, 1);
    this.s.material.opacity = alpha; this.s.visible = alpha > .01;
  }
};

/* ---------- feux d'artifice dorés : des gerbes de lueurs ---------- */
MF.Feux = class {
  constructor(lueurs) { this.l = lueurs; this.b = []; this.r = MF.rng(99); }
  // x, y, z : centre de la gerbe (Three.js) ; taille : rayon (m)
  tire(x, y, z, taille = 10, teinte = [255, 210, 140]) {
    const r = this.r, n = 90 + (r() * 30 | 0), parts = [];
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - u * u);
      parts.push({ d: [s * Math.cos(a), u, s * Math.sin(a)], v: (.8 + r() * .25), s: r() });
    }
    this.b.push({ x, y, z, t: 0, taille, parts, teinte });
  }
  pose(dt) {
    for (const b of this.b) {
      b.t += dt;
      const T = b.t, env = clamp(1 - (T - .2) / 2.2);
      if (T < .25) this.l.ajoute(b.x, b.y, b.z, b.taille * 2, [255, 214, 150], (1 - T / .25) * .45);
      const d = (1 - Math.exp(-T * 2.6)) * b.taille, chute = T * T * b.taille * .09;
      for (const p of b.parts) {
        const sc = .6 + .4 * Math.sin(T * 30 + p.s * 40), a = env * (T > 1.2 ? sc : 1);
        const x = b.x + p.d[0] * d * p.v, y = b.y + p.d[1] * d * p.v - chute, z = b.z + p.d[2] * d * p.v;
        this.l.ajoute(x, y, z, b.taille * (p.s > .7 ? .085 : .05), b.teinte, a);
        // traîne : de petits points qui s'éteignent derrière chaque étincelle
        for (const [dec, f] of [[.06, .5], [.13, .28], [.22, .14]]) {
          const d2 = (1 - Math.exp(-Math.max(0, T - dec) * 2.6)) * b.taille, ch2 = Math.max(0, T - dec) ** 2 * b.taille * .09;
          this.l.ajoute(b.x + p.d[0] * d2 * p.v, b.y + p.d[1] * d2 * p.v - ch2, b.z + p.d[2] * d2 * p.v, b.taille * .035, b.teinte, a * f);
        }
      }
    }
    this.b = this.b.filter(b => b.t < 3);
  }
};

/* =====================================================================
   Les deux vues et le fondu enchaîné.
   Chaque vue montre une scène avec ses propres réglages (deux plans du même décor peuvent se fondre).
   ===================================================================== */
let renderer = null, canvas = null, compoScene = null, compoCam = null, compoMat = null;
const cibles = [];
function cibleN(i) {
  if (!cibles[i]) {
    cibles[i] = new THREE.WebGLRenderTarget(Math.round(MF.W * MF.DPR), Math.round(MF.H * MF.DPR), { samples: TELEPHONE ? 0 : 4 });
    cibles[i].texture.colorSpace = THREE.SRGBColorSpace;
  }
  return cibles[i];
}
// trois vues : si l'invité enchaîne vite deux passages, le troisième décor arrive par-dessus en fondu, sans rien couper
MF.toiles = [0, 1, 2].map(() => ({ scene: null, alpha: 0, cible: 0, duree: 1, debut: 0, alpha0: 0, p: null, proprio: null, z: 0, sortie: false }));
let zHaut = 0;
MF.montre = (id, fondu = 1.2, opts = {}) => {
  const s = MF.scenes[id];
  let t = opts.nouvelle ? null : MF.toiles.find(o => o.scene === s && o.alpha > 0);
  if (!t) {
    t = MF.toiles.reduce((a, b) => a.alpha <= b.alpha ? a : b);
    t.scene = s; t.alpha = 0;
    s.entree && s.entree();
  }
  t.p = opts.p || null;
  t.z = ++zHaut;
  t.cible = 1; t.sortie = false; t.duree = Math.max(.001, fondu); t.debut = performance.now() / 1000; t.alpha0 = t.alpha;
  if (fondu <= .001) t.alpha = 1;
  MF.actif = s;
  return t;
};
// (même vitesse qu'un fondu normal, dans un sens comme dans l'autre)
// revenir à une vue encore visible (l'invité remonte pendant un fondu) : ce qui est au-dessus s'efface doucement
MF.ramene = (t, fondu = 1.2) => {
  const now = performance.now() / 1000;
  for (const o of MF.toiles) if (o !== t && o.z > t.z && o.alpha > 0) { o.cible = 0; o.sortie = true; o.alpha0 = o.alpha; o.debut = now; o.duree = fondu; }
  if (t.alpha < 1) { t.cible = 1; t.sortie = false; t.alpha0 = t.alpha; t.debut = now; t.duree = fondu; }
  MF.actif = t.scene;
  return t;
};
MF.visible = s => MF.toiles.some(o => o.scene === s && o.alpha > 0);

MF.webgl = () => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
};

function taille(force) {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  const dpr = Math.min(window.devicePixelRatio || 1, TELEPHONE ? 1.5 : 2) * MF.qualite;
  if (!force && w === MF.W && Math.abs(h - MF.H) < 2 && dpr === MF.DPR) return;
  MF.W = w; MF.H = h; MF.DPR = dpr;
  renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
  for (const c of cibles) c.setSize(Math.round(w * dpr), Math.round(h * dpr));
}
MF.taille = taille;

const taches = [];
let petit = null;
// dessine une scène une fois, en tout petit et avec tous ses objets visibles : ses shaders sont compilés
// et ses textures envoyées à la carte graphique avant qu'on ne la voie (sinon le défilement se fige un instant)
function prechauffe(s) {
  if (!petit) petit = new THREE.WebGLRenderTarget(64, 64);
  s.prepare(MF.temps, .016, MF.W || 390, MF.H || 844);
  const caches = [];
  s.s3.traverse(o => { if (!o.visible) { caches.push(o); o.visible = true; } });
  renderer.compile(s.s3, s.cam);
  s.s3.traverse(o => { if (o.material) for (const m of [].concat(o.material)) for (const k of ['map', 'envMap', 'alphaMap']) if (m[k] && m[k].isTexture) renderer.initTexture(m[k]); });
  renderer.setRenderTarget(petit); renderer.render(s.s3, s.cam); renderer.setRenderTarget(null);
  for (const o of caches) o.visible = false;
}
MF.prechauffe = prechauffe;
MF.pret = () => !taches.length;
let dernier = 0, lent = 0, images = 0;
function image(now) {
  requestAnimationFrame(image);
  const t = now / 1000, brut = dernier ? t - dernier : .016, dt = Math.min(.05, brut);
  dernier = t;
  if (taches.length) { taches.shift()(); images = 0; }
  // qualité adaptative : si les images arrivent trop lentement, moins de pixels et moins de petits détails
  if (MF.toiles.some(o => o.alpha > 0) && brut < .2 && ++images > 40) {
    lent = lent * .94 + (brut > .024 ? 1 : 0) * .06;
    if (lent > .5 && (MF.qualite > .6 || MF.detail > .5)) {
      MF.detail = Math.max(.5, MF.detail - .17);
      if (MF.qualite > .6) { MF.qualite = Math.max(.6, MF.qualite - .13); taille(true); }
      lent = 0; images = 0;
    }
  }
  rendu(t, dt);
}
function dessine(v, rt, t, dt) {
  if (v.p) Object.assign(v.scene.p, v.p);
  v.scene.prepare(t, dt, MF.W, MF.H);
  renderer.setRenderTarget(rt);
  renderer.clear();
  renderer.render(v.scene.s3, v.scene.cam);
}
function rendu(t, dt = .016) {
  MF.temps = t;
  for (const f of MF.avant) f(t, dt);
  for (const o of MF.toiles) {
    if (o.cible === 1 && o.alpha < 1) {
      o.alpha = Math.min(1, o.alpha0 + (performance.now() / 1000 - o.debut) / o.duree);
      // une vue entièrement visible cache celles qui sont en dessous (et seulement celles-là)
      if (o.alpha >= 1) for (const u of MF.toiles) if (u !== o && u.z < o.z) { u.alpha = 0; u.cible = 0; u.sortie = false; }
    } else if (o.sortie && o.alpha > 0) {
      o.alpha = Math.max(0, o.alpha0 - (performance.now() / 1000 - o.debut) / o.duree);
      if (o.alpha <= 0) o.sortie = false;
    }
  }
  const vis = MF.toiles.filter(o => o.alpha > 0 && o.scene).sort((a, b) => a.z - b.z);
  for (const o of MF.toiles) o.dessus = o === vis[vis.length - 1];
  if (!vis.length) { renderer.setRenderTarget(null); renderer.clear(); return; }
  dessine(vis[0], null, t, dt);
  // chaque vue au-dessus est dessinée à part, puis posée par-dessus avec sa transparence
  for (let k = 1; k < vis.length; k++) {
    const rt = cibleN(k - 1);
    dessine(vis[k], rt, t, dt);
    compoMat.map = rt.texture;
    compoMat.opacity = MF.ease.sine(vis[k].alpha);
    renderer.setRenderTarget(null);
    renderer.autoClear = false; renderer.render(compoScene, compoCam); renderer.autoClear = true;
  }
  for (const f of MF.apres) f(t, dt);
}
MF.rendu = rendu;
MF.renderer = () => renderer;

MF.demarre = () => {
  canvas = document.getElementById('monde');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false, preserveDrawingBuffer: /capture/.test(location.hash) });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x07080c, 1);
  compoScene = new THREE.Scene(); compoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  compoMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  compoScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compoMat));
  taille(true);
  let attente;
  addEventListener('resize', () => { clearTimeout(attente); attente = setTimeout(() => taille(), 120); });
  for (const s of Object.values(MF.scenes)) s.construit && s.construit(renderer);
  // file d'attente : d'abord les reflets de chaque décor, puis un premier dessin de chaque décor, puis le fondu
  for (const s of Object.values(MF.scenes)) for (const f of (s.taches || [])) taches.push(f);
  for (const s of Object.values(MF.scenes)) taches.push(() => prechauffe(s));
  // les deux images de fondu sont préparées à l'avance, et le petit dessin qui les pose est compilé
  taches.push(() => {
    for (const i of [0, 1]) { const c = cibleN(i); renderer.setRenderTarget(c); renderer.clear(); }
    renderer.setRenderTarget(null);
    compoMat.map = cibleN(0).texture; compoMat.needsUpdate = true;
    compoMat.opacity = 0; renderer.autoClear = false; renderer.render(compoScene, compoCam); renderer.autoClear = true;
  });
  requestAnimationFrame(image);
};

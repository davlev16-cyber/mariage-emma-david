/* Emma & David · version cinéma
   moteur.js : les deux toiles de décor, la caméra 2,5D et les effets partagés. */
(function () {
'use strict';
const MF = window.MF = {};

/* ---------- outils ---------- */
const clamp = MF.clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = MF.lerp = (a, b, t) => a + (b - a) * t;
MF.range = (t, a, b) => clamp((t - a) / (b - a));
MF.ease = {
  lin: t => clamp(t),
  io: t => (t = clamp(t), t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => (t = clamp(t), 1 - Math.pow(1 - t, 3)),
  in: t => (t = clamp(t), t * t * t),
  sine: t => (t = clamp(t), .5 - Math.cos(Math.PI * t) / 2),
  out5: t => (t = clamp(t), 1 - Math.pow(1 - t, 5)),
  in2: t => (t = clamp(t), t * t),
};
MF.rng = seed => () => {
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const perm = (() => { const r = MF.rng(11), a = new Float32Array(1024); for (let i = 0; i < 1024; i++) a[i] = r(); return a; })();
MF.bruit = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(perm[i & 1023], perm[(i + 1) & 1023], u); };
MF.hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
MF.mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
MF.rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// Piste d'images clés : [[t, valeur, courbe], ...] -> fonction du temps
MF.piste = keys => t => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k[0]) { const j = keys[i - 1]; return lerp(j[1], k[1], MF.ease[k[2] || 'io']((t - j[0]) / (k[0] - j[0]))); }
  }
  return keys[keys.length - 1][1];
};

// Palette par moments : {0: {ciel:'#..',...}, 1: {...}} -> fonction(x) qui mélange
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

// Halo lumineux réutilisable (dégradé radial), mis en cache par couleur
const halos = {};
MF.halo = (rgb, douceur = 1) => {
  const cle = rgb.join(',') + '|' + douceur;
  if (halos[cle]) return halos[cle];
  const c = MF.toile(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, MF.rgba(rgb, 1)); g.addColorStop(.18 * douceur, MF.rgba(rgb, .55)); g.addColorStop(.45, MF.rgba(rgb, .16)); g.addColorStop(1, MF.rgba(rgb, 0));
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return halos[cle] = c;
};
MF.poseHalo = (ctx, spr, x, y, r, a = 1) => { if (a <= .003 || r < .3) return; ctx.globalAlpha = a; ctx.drawImage(spr, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; };

/* ---------- caméra 2,5D ----------
   Monde : x à droite, y vers le BAS (le sol est à y = 0, le haut est négatif), z = profondeur.
   p.focale est exprimée en hauteurs d'écran, p.tilt décale l'horizon (en hauteurs d'écran). */
MF.camera = (p, W, H) => ({ x: p.camX, y: p.camY, z: p.camZ, f: p.focale * H, hor: H / 2 + p.tilt * H, W, H, orb: p.orbite || 0, piv: p.pivot || 1000 });
MF.k = (c, Z) => c.f / Math.max(.5, Z - c.z);
// décalage horizontal (px) dû à l'orbite autour du pivot, pour un plan à la profondeur Z
MF.orbDx = (c, Z) => c.f * c.orb * (1 - (c.piv - c.z) / Math.max(1, Z - c.z));
MF.proj = (c, X, Y, Z) => { const k = MF.k(c, Z); return [c.W / 2 + (X - c.x) * k + MF.orbDx(c, Z), c.hor + (Y - c.y) * k, k]; };
MF.couche = (ctx, c, Z) => {
  const k = MF.k(c, Z), D = MF.DPR;
  ctx.setTransform(D * k, 0, 0, D * k, D * (c.W / 2 - c.x * k + MF.orbDx(c, Z)), D * (c.hor - c.y * k));
  return k;
};
MF.ecran = ctx => { ctx.setTransform(MF.DPR, 0, 0, MF.DPR, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low'; };

/* Couche mise en cache : dessin vectoriel en coordonnées monde rendu une fois dans une image,
   éventuellement en plusieurs éclairages (variantes). */
MF.Plan = class {
  constructor(o) { Object.assign(this, { variantes: 1, marge: 0 }, o); this.img = []; this.cle = ''; }
  prepare(c) {
    const kmax = c.f / this.distMin, D = MF.DPR;
    let res = kmax * D * (this.nettete || 1);
    const w = this.x1 - this.x0, h = this.y1 - this.y0;
    res = Math.min(res, 4096 / w, 2048 / h);
    const cle = res.toFixed(3);
    if (cle === this.cle) return;
    this.cle = cle; this.res = res; this.img = [];
    for (let v = 0; v < this.variantes; v++) {
      const cv = MF.toile(w * res, h * res), x = cv.getContext('2d');
      x.scale(res, res); x.translate(-this.x0, -this.y0);
      this.dessin(x, v);
      this.img.push(cv);
    }
  }
  pose(ctx, c, v = 0, a = 1, dx = 0) {
    if (a <= .002) return;
    this.prepare(c);
    const k = MF.k(c, this.Z), [sx, sy] = MF.proj(c, this.x0 + dx, this.y0, this.Z);
    ctx.globalAlpha = a;
    ctx.drawImage(this.img[v], sx, sy, (this.x1 - this.x0) * k, (this.y1 - this.y0) * k);
  }
  // mélange de deux variantes selon m (0 → a, 1 → b)
  melange(ctx, c, va, vb, m, a = 1, dx = 0) {
    if (m < .998) this.pose(ctx, c, va, a, dx);
    if (m > .002) this.pose(ctx, c, vb, a * (m < .998 ? m : 1), dx);
  }
};

/* ---------- ciel étoilé ---------- */
MF.Etoiles = class {
  constructor(n, graine = 3) {
    const r = MF.rng(graine);
    this.e = [];
    for (let i = 0; i < n; i++) {
      const brill = Math.pow(r(), 6);
      this.e.push({ az: (r() - .5) * 3.2, el: .02 + Math.pow(r(), .8) * 1.6, t: .7 + brill * 2, a: .35 + r() * .5 + brill * .3, v: .6 + r() * 2.4, ph: r() * 7 });
    }
    this.halo = MF.halo([220, 230, 255]);
  }
  dessine(ctx, c, t, alpha) {
    if (alpha <= .01) return;
    const W = c.W, H = c.H, f = c.f, dx = f * c.orb, NIV = 8;
    const niveaux = this.niveaux || (this.niveaux = Array.from({ length: NIV }, () => []));
    for (const L of niveaux) L.length = 0;
    for (let i = 0; i < this.e.length; i++) {
      const s = this.e[i];
      if (!MF.garde(i)) continue;
      const y = c.hor - s.el * f;
      if (y < -4 || y > c.hor) continue;
      let x = W / 2 + s.az * f + dx;
      x = ((x % (f * 3.2)) + f * 3.2) % (f * 3.2) - (f * 3.2 - W) / 2;
      if (x < -4 || x > W + 4) continue;
      const fondu = clamp((c.hor - y) / (H * .18));
      const sc = .55 + .45 * Math.sin(t * s.v + s.ph);
      const a = alpha * s.a * fondu * (.55 + .45 * sc);
      if (a < .02) continue;
      if (s.t > 1.3) MF.poseHalo(ctx, this.halo, x, y, s.t * 3.2, a * .5);
      niveaux[Math.min(NIV - 1, Math.round(a * NIV))].push(x - s.t / 2, y - s.t / 2, s.t);
    }
    ctx.fillStyle = '#f4f1ff';
    niveaux.forEach((L, i) => {
      if (!L.length || !i) return;
      ctx.globalAlpha = i / NIV;
      for (let j = 0; j < L.length; j += 3) ctx.fillRect(L[j], L[j + 1], L[j + 2], L[j + 2]);
    });
    ctx.globalAlpha = 1;
  }
};

/* Croissant de lune (image prête) */
MF.lune = (() => {
  let img = null;
  return () => {
    if (img) return img;
    img = MF.toile(256, 256);
    const x = img.getContext('2d');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,244,214,.34)'); g.addColorStop(.3, 'rgba(255,240,210,.12)'); g.addColorStop(1, 'rgba(255,240,210,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const m = MF.toile(256, 256), y = m.getContext('2d');
    y.fillStyle = '#fff7e2'; y.beginPath(); y.arc(128, 128, 30, 0, 7); y.fill();
    y.globalCompositeOperation = 'destination-out'; y.beginPath(); y.arc(141, 121, 27, 0, 7); y.fill();
    x.drawImage(m, 0, 0);
    return img;
  };
})();

/* ---------- oiseaux (martinets) ---------- */
MF.Oiseaux = class {
  constructor(n, graine = 5) {
    const r = MF.rng(graine);
    this.o = [];
    for (let i = 0; i < n; i++) this.o.push({ dx: (r() - .5) * 2, dy: (r() - .5) * 1, v: .8 + r() * .5, ph: r() * 6, bat: 7 + r() * 5, taille: .7 + r() * .6 });
  }
  // x0,y0 : départ (px) ; vx,vy : vitesse (px/s) ; age en s
  dessine(ctx, x0, y0, vx, vy, age, ech, couleur, alpha = 1) {
    ctx.strokeStyle = couleur; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const b of this.o) {
      const x = x0 + b.dx * 60 * ech + vx * age * b.v + Math.sin(age * 1.3 + b.ph) * 8 * ech;
      const y = y0 + b.dy * 40 * ech + vy * age * b.v + Math.cos(age * 1.1 + b.ph) * 6 * ech;
      const s = 6 * ech * b.taille, w = Math.sin(age * b.bat + b.ph);
      ctx.globalAlpha = alpha; ctx.lineWidth = Math.max(.8, 1.1 * ech * b.taille);
      ctx.beginPath();
      ctx.moveTo(x - s, y - w * s * .55); ctx.quadraticCurveTo(x - s * .4, y - s * .2 - w * s * .2, x, y + s * .1);
      ctx.quadraticCurveTo(x + s * .4, y - s * .2 - w * s * .2, x + s, y - w * s * .55);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
};

/* ---------- feux d'artifice dorés ---------- */
MF.Feux = class {
  constructor() { this.b = []; this.r = MF.rng(99); this.halo = MF.halo([255, 214, 150]); }
  tire(x, y, taille = 1, teinte = [255, 210, 140]) {
    const r = this.r, n = 70 + (r() * 30 | 0), parts = [];
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + r() * .08, v = (.75 + r() * .3) * taille; parts.push({ a, v, s: r() }); }
    this.b.push({ x, y, t: 0, taille, parts, teinte });
  }
  dessine(ctx, dt, ech) {
    ctx.globalCompositeOperation = 'lighter';
    for (const b of this.b) {
      b.t += dt;
      const T = b.t, env = clamp(1 - (T - .2) / 2.2);
      if (T < .18) MF.poseHalo(ctx, this.halo, b.x, b.y, 55 * ech * b.taille, (1 - T / .18) * .55);
      for (const p of b.parts) {
        const d = (1 - Math.exp(-T * 2.6)) * 95 * ech * p.v;
        const x = b.x + Math.cos(p.a) * d, y = b.y + Math.sin(p.a) * d + T * T * 14 * ech;
        const sc = .6 + .4 * Math.sin(T * 30 + p.s * 40);
        const a = env * (T > 1.2 ? sc : 1);
        ctx.globalAlpha = a * .9;
        ctx.fillStyle = MF.rgba(b.teinte, 1);
        ctx.fillRect(x - 1, y - 1, 2.2 * ech * .8 + .6, 2.2 * ech * .8 + .6);
        if (p.s > .7) MF.poseHalo(ctx, this.halo, x, y, 9 * ech, a * .35);
        // traîne
        const d2 = (1 - Math.exp(-Math.max(0, T - .12) * 2.6)) * 95 * ech * p.v;
        ctx.globalAlpha = a * .35; ctx.strokeStyle = MF.rgba(b.teinte, 1); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(b.x + Math.cos(p.a) * d2, b.y + Math.sin(p.a) * d2 + Math.max(0, T - .12) ** 2 * 14 * ech); ctx.stroke();
      }
    }
    this.b = this.b.filter(b => b.t < 3);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
};

/* ---------- poussière d'or / pollen dans la lumière ---------- */
MF.Poussiere = class {
  constructor(n, graine = 21) {
    const r = MF.rng(graine);
    this.p = [];
    for (let i = 0; i < n; i++) this.p.push({ x: r(), y: r(), z: .3 + r() * .7, v: .2 + r() * .8, ph: r() * 6 });
    this.halo = MF.halo([255, 226, 170]);
  }
  dessine(ctx, W, H, t, alpha, zone = [0, 0, 1, 1]) {
    if (alpha <= .01) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.p) {
      const x = (zone[0] + ((p.x + Math.sin(t * .05 * p.v + p.ph) * .04 + t * .006 * p.v) % 1) * (zone[2] - zone[0])) * W;
      const y = (zone[1] + ((p.y - t * .012 * p.v + 10) % 1) * (zone[3] - zone[1])) * H;
      const tw = .5 + .5 * Math.sin(t * (1 + p.v) + p.ph);
      MF.poseHalo(ctx, this.halo, x, y, (2 + p.z * 5), alpha * p.z * (.25 + .5 * tw));
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
};

/* ---------- reflets dans l'eau : recopie de bandes de l'image au-dessus de l'axe ---------- */
MF.reflet = (() => {
  let tampon = null, tctx = null;
  const R = 3;   // la copie est réduite : le reflet est plus doux
  return (ctx, axe, haut, bas, t, force = 1) => {
    const D = MF.DPR, cv = ctx.canvas, W = cv.width;
    const Y0 = Math.max(haut, axe + 1), hauteur = Math.min(bas - Y0, 2 * axe - Y0);
    if (hauteur <= 2) return;
    // zone source : juste au-dessus de l'axe, en miroir
    const s0 = Math.max(0, 2 * axe - bas), s1 = 2 * axe - Y0;
    const tw = Math.ceil(W / R), th = Math.ceil((s1 - s0) * D / R);
    if (!tampon || tampon.width !== tw || tampon.height < th) { tampon = MF.toile(tw, th + 4); tctx = tampon.getContext('2d'); }
    tctx.clearRect(0, 0, tw, tampon.height);
    tctx.drawImage(cv, 0, s0 * D, W, (s1 - s0) * D, 0, 0, tw, th);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    const pas = 2 * D;
    for (let y = Y0 * D; y < bas * D; y += pas) {
      const d = y / D - Y0;
      const amp = (.8 + d * .02) * force;
      const ox = (Math.sin(y * .09 / D + t * 1.4) + .6 * Math.sin(y * .031 / D - t * .9)) * amp * D;
      const jit = (MF.bruit(y * .13 / D + t * 1.7) - .5) * d * .08;
      const sy = 2 * axe - y / D - jit;           // ligne source (px css)
      const ty = clamp((sy - s0) * D / R, 0, th - 1);
      const marge = 14 * D;
      ctx.drawImage(tampon, 0, ty, tw, Math.max(1, pas / R), ox - marge, y, W + 2 * marge, pas);
    }
    MF.ecran(ctx);
  };
})();

/* ---------- toiles, boucle et fondus ---------- */
MF.W = 0; MF.H = 0; MF.DPR = 1; MF.qualite = 1;
// niveau de détail : sur un appareil qui peine, on dessine moins de petites choses (pétales, étoiles, vagues)
MF.detail = 1;
MF.garde = i => MF.detail >= 1 || (i * .618034) % 1 < MF.detail;
const TELEPHONE = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 700;
MF.scenes = {};
MF.toiles = [];
MF.avant = [];      // fonctions appelées avant chaque image (mise en scène)
MF.apres = [];      // fonctions appelées après (texte, effets)
MF.temps = 0;

function taille(force) {
  const r = MF.toiles[0].cv.getBoundingClientRect();
  const w = Math.round(r.width), h = Math.round(r.height);
  // au plus ~2,6 millions de pixels par toile : net sur téléphone, raisonnable sur grand écran
  const dpr = Math.min(window.devicePixelRatio || 1, TELEPHONE ? 1.6 : 2, Math.sqrt(2.6e6 / Math.max(1, w * h))) * MF.qualite;
  if (!force && w === MF.W && Math.abs(h - MF.H) < 2 && dpr === MF.DPR) return;
  MF.W = w; MF.H = h; MF.DPR = dpr;
  for (const t of MF.toiles) { t.cv.width = Math.round(w * dpr); t.cv.height = Math.round(h * dpr); }
  for (const s of Object.values(MF.scenes)) s.taille && s.taille();
}
MF.taille = taille;

// montre une scène en fondu. opts.nouvelle : toujours sur l'autre toile (même décor, autre plan) ;
// opts.p : réglages propres à cette toile, recopiés dans la scène juste avant de la dessiner
MF.montre = (id, fondu = 1.2, opts = {}) => {
  const s = MF.scenes[id];
  let t = opts.nouvelle ? null : MF.toiles.find(o => o.scene === s && o.alpha > 0);
  if (!t) {
    t = MF.toiles.reduce((a, b) => a.alpha <= b.alpha ? a : b);
    t.scene = s; t.alpha = 0;
    s.entree && s.entree();
  }
  t.p = opts.p || null;
  for (const o of MF.toiles) o.cv.style.zIndex = o === t ? 2 : 1;
  t.cible = 1; t.duree = Math.max(.001, fondu); t.debut = performance.now() / 1000; t.alpha0 = t.alpha;
  if (fondu <= .001) t.alpha = 1;
  MF.actif = s;
  return t;
};
MF.visible = s => MF.toiles.some(o => o.scene === s && o.alpha > 0);

let dernier = 0, lent = 0;
let images = 0, tour = 0;
function image(now) {
  requestAnimationFrame(image);
  const t = now / 1000, brut = dernier ? t - dernier : .016, dt = Math.min(.05, brut);
  dernier = t;
  // qualité adaptative : si les images arrivent trop lentement (téléphone modeste), on baisse la résolution
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
// dessine une image (appelée par la boucle, ou à la main pour les essais)
function rendu(t, dt = .016) {
  MF.temps = t; tour++;
  for (const f of MF.avant) f(t, dt);
  for (const o of MF.toiles) {
    if (o.cible === 1 && o.alpha < 1) {
      o.alpha = Math.min(1, o.alpha0 + (performance.now() / 1000 - o.debut) / o.duree);
      if (o.alpha >= 1) for (const u of MF.toiles) if (u !== o) { u.alpha = 0; u.cible = 0; u.cv.style.opacity = 0; }
    }
  }
  const deux = MF.toiles.filter(o => o.alpha > 0 && o.scene).length > 1;
  for (const o of MF.toiles) {
    const op = String(MF.ease.sine(o.alpha));   // fondu adouci au début et à la fin
    if (o.cv.style.opacity !== op) o.cv.style.opacity = op;
    if (o.alpha > 0 && o.scene) {
      if (deux && o.cv.style.zIndex !== '2' && tour % 2) continue;
      const ctx = o.ctx;
      if (o.p) Object.assign(o.scene.p, o.p);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      MF.ecran(ctx);
      o.scene.dessine(ctx, MF.W, MF.H, t, dt);
      if (MF.surcouche) { MF.ecran(ctx); MF.surcouche(ctx, MF.W, MF.H, t, dt, o.scene, o); }
    }
  }
  for (const f of MF.apres) f(t, dt);
}

MF.rendu = rendu;
MF.demarre = () => {
  for (const cv of document.querySelectorAll('canvas.decor')) MF.toiles.push({ cv, ctx: cv.getContext('2d'), scene: null, alpha: 0, cible: 0, duree: 1, debut: 0, alpha0: 0 });
  taille(true);
  let attente;
  addEventListener('resize', () => { clearTimeout(attente); attente = setTimeout(() => taille(), 120); });
  requestAnimationFrame(image);
};
})();

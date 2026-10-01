/* Emma & David · version 3D
   decors3d.js : les décors en volume, aux mêmes cadrages que la version cinéma —
   la mer à l'heure dorée (aperçu), la soie de la mairie, la plage bordeaux du henné (et la mer à l'aube pour la réponse),
   la houppa face à la mer (du coucher du soleil à la nuit, feu d'artifice), la table de Chabbat au bord de l'eau. */
import * as THREE from './lib/three.module.min.js';
const MF = window.MF;
const { clamp, lerp } = MF;
const TAU = Math.PI * 2;

/* ---------- petits outils ---------- */
// coordonnées de la version cinéma (X, hauteur, Z) -> Three.js
const P3 = (X, Yh, Z) => new THREE.Vector3(X, Yh, -Z);
function nouvelle(nom, p) {
  const s3 = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, 1, .05, 5000);
  return { nom, p, s3, cam };
}
// assemble plusieurs géométries en une seule (positions, normales, uv)
function fusion(geoms) {
  const parts = geoms.map(g => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of parts) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(pos, 3)); r.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); r.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return r;
}
const cyl = (r1, r2, h, n, x, y, z) => new THREE.CylinderGeometry(r1, r2, h, n, 1).translate(x, y + h / 2, z);
const boite = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
// barre ronde entre deux points
function barre(a, b, r, n = 6) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1).translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return g.translate(a.x, a.y, a.z);
}
const matrice = new THREE.Matrix4(), qt = new THREE.Quaternion(), eul = new THREE.Euler(), vv = new THREE.Vector3(), sc3 = new THREE.Vector3();
function place(mesh, i, x, y, z, rx, ry, rz, s, sy = s, sz = s) {
  qt.setFromEuler(eul.set(rx, ry, rz, 'YXZ'));
  matrice.compose(vv.set(x, y, z), qt, sc3.set(s, sy, sz));
  mesh.setMatrixAt(i, matrice);
}
const rgbDe = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);   // 'rgba(255,184,140,' -> [255,184,140]

/* ---------- textures peintes (reprises de la version cinéma) ---------- */
const textures = {};
function peinte(cle, w, h, dessin, opts) {
  if (textures[cle]) return textures[cle];
  const cv = MF.toile(w * 2, h * 2), x = cv.getContext('2d'); x.scale(2, 2); dessin(x, w, h);
  return (textures[cle] = MF.texture(cv, opts));
}
const PETALES = [['#fffefb', '#efe6d6'], ['#fcf6ec', '#e8dcc6'], ['#f8ebe4', '#e4c8bc'], ['#b3263c', '#6e0f22'], ['#c93a4e', '#7e1428']];
const petaleTex = v => peinte('petale' + v, 44, 44, x => {
  x.translate(22, 22);
  const g = x.createRadialGradient(-4, -6, 1, 0, 0, 20);
  g.addColorStop(0, v > 2 ? '#e0606e' : '#ffffff'); g.addColorStop(.55, PETALES[v][0]); g.addColorStop(1, PETALES[v][1]);
  x.fillStyle = g;
  x.beginPath(); x.moveTo(0, 17); x.bezierCurveTo(15, 9, 15, -12, 4, -17); x.quadraticCurveTo(0, -13, -4, -17); x.bezierCurveTo(-15, -12, -15, 9, 0, 17); x.fill();
  x.strokeStyle = 'rgba(120,80,60,.15)'; x.lineWidth = .7; x.beginPath(); x.moveTo(0, 15); x.quadraticCurveTo(1.5, 0, 0, -13); x.stroke();
});
// résille de laiton en losanges, ajourée (pour les lanternes orientales)
const resilleTex = () => peinte('resille', 128, 128, x => {
  x.clearRect(0, 0, 128, 128);
  const g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, '#8a6a34'); g.addColorStop(.5, '#f0d59a'); g.addColorStop(1, '#8a6a34');
  x.strokeStyle = g; x.lineWidth = 4.2;
  x.beginPath();
  for (let k = -128; k <= 256; k += 32) { x.moveTo(k, 0); x.lineTo(k + 128, 128); x.moveTo(k + 128, 0); x.lineTo(k, 128); }
  x.stroke();
  x.fillStyle = '#e8cb8a';
  for (let yy = 0; yy <= 128; yy += 32) for (let xx = 0; xx <= 128; xx += 32) { x.beginPath(); x.arc(xx + (yy / 32 % 2) * 16, yy, 3.4, 0, TAU); x.fill(); }
  x.fillStyle = g; x.fillRect(0, 0, 128, 6); x.fillRect(0, 122, 128, 6);
}, { repete: true });
// sol de la terrasse : pierre claire, grain fin
const pierreTex = () => peinte('pierre', 256, 256, x => {
  x.fillStyle = '#e9dcc2'; x.fillRect(0, 0, 256, 256);
  const r = MF.rng(5);
  for (let i = 0; i < 2600; i++) { x.fillStyle = r() < .5 ? 'rgba(255,250,238,.35)' : 'rgba(150,125,90,.12)'; x.fillRect(r() * 256, r() * 256, 1 + r() * 1.6, 1 + r() * 1.6); }
  x.strokeStyle = 'rgba(160,140,105,.16)'; x.lineWidth = 1;
  for (let k = 0; k <= 256; k += 64) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 256); x.stroke(); x.beginPath(); x.moveTo(0, k); x.lineTo(256, k); x.stroke(); }
}, { repete: true });
// tissu de l'allée et de la nappe : trame très fine
const trameTex = () => peinte('trame', 128, 128, x => {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) { x.fillStyle = 'rgba(200,190,170,.10)'; x.fillRect(i, 0, 1, 128); x.fillStyle = 'rgba(200,190,170,.06)'; x.fillRect(0, i, 128, 1); }
}, { repete: true });
// napperon brodé de la halla : blanc, galon doré, médaillon
const napperonTex = () => peinte('napperon', 256, 128, x => {
  const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#fffdf7'); g.addColorStop(1, '#e8decb');
  x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  const or = x.createLinearGradient(0, 0, 256, 0); or.addColorStop(0, '#a88a4c'); or.addColorStop(.5, '#ead7a4'); or.addColorStop(1, '#a88a4c');
  x.fillStyle = or; x.fillRect(0, 100, 256, 7); x.fillRect(0, 112, 256, 3);
  for (let xx = 2; xx < 256; xx += 6) x.fillRect(xx, 118, 2, 8);
  x.strokeStyle = 'rgba(150,130,90,.25)'; x.lineWidth = 1.2;
  for (let xx = 16; xx < 256; xx += 32) { x.beginPath(); x.moveTo(xx, 8); x.quadraticCurveTo(xx - 8, 50, xx - 4, 96); x.stroke(); }
  x.fillStyle = or; x.beginPath(); x.arc(64, 34, 9, 0, TAU); x.fill(); x.fillStyle = '#fffdf7'; x.beginPath(); x.arc(64, 34, 5.5, 0, TAU); x.fill();
});
const ombreDouce = () => peinte('ombre', 64, 64, x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(60,45,25,.5)'); g.addColorStop(1, 'rgba(60,45,25,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
const flammeTex = () => peinte('flamme', 32, 64, x => {
  const g = x.createRadialGradient(16, 42, 0, 16, 40, 30);
  g.addColorStop(0, 'rgba(255,253,240,1)'); g.addColorStop(.3, 'rgba(255,224,138,1)'); g.addColorStop(.7, 'rgba(255,160,70,.8)'); g.addColorStop(1, 'rgba(255,140,60,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(16, 62); x.bezierCurveTo(30, 50, 26, 22, 16, 2); x.bezierCurveTo(6, 22, 2, 50, 16, 62); x.fill();
});

/* ---------- reflets des métaux : un petit ciel pour l'environnement ---------- */
function environnement(renderer, cols, sol, soleil, ancien) {
  const cv = MF.toile(256, 128), x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 64);
  cols.forEach((c, i) => g.addColorStop(.35 + .65 * i / (cols.length - 1), MF.rgba(typeof c === 'string' ? MF.hex(c) : c)));
  x.fillStyle = MF.rgba(typeof cols[0] === 'string' ? MF.hex(cols[0]) : cols[0]); x.fillRect(0, 0, 256, 64);
  x.fillStyle = g; x.fillRect(0, 0, 256, 64);
  const gs = x.createLinearGradient(0, 64, 0, 128); gs.addColorStop(0, MF.rgba(sol[0])); gs.addColorStop(1, MF.rgba(sol[1]));
  x.fillStyle = gs; x.fillRect(0, 64, 256, 64);
  if (soleil) { const sy = 64 - soleil.el / Math.PI * 128, gl = x.createRadialGradient(64, sy, 0, 64, sy, 40); gl.addColorStop(0, MF.rgba(soleil.col, soleil.force)); gl.addColorStop(1, MF.rgba(soleil.col, 0)); x.fillStyle = gl; x.fillRect(0, 0, 256, 128); }
  const tex = MF.texture(cv); tex.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromEquirectangular(tex);
  pm.dispose(); tex.dispose(); if (ancien) ancien.dispose();
  return rt;
}

/* ---------- la fleur blanche en volume : trois couronnes de pétales et un cœur ---------- */
let fleurGeo = null, feuilleGeo = null;
function geoFleur() {
  if (fleurGeo) return fleurGeo;
  const parts = [];
  const couronne = (n, R, w, h, incl, dec, y) => {
    for (let i = 0; i < n; i++) {
      const g = new THREE.PlaneGeometry(w, h, 2, 2), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const px = p.getX(k), py = p.getY(k); p.setZ(k, -(px * px) * 2.2 - (py + h / 2) * (py + h / 2) * .25); }
      g.computeVertexNormals();
      g.translate(0, h / 2, 0); g.rotateX(-Math.PI / 2 + incl); g.translate(0, y, -R); g.rotateY(dec + i * TAU / n);
      parts.push(g);
    }
  };
  couronne(7, .38, .62, .66, .55, 0, 0);
  couronne(6, .22, .48, .5, .95, .45, .08);
  couronne(5, .08, .34, .36, 1.3, .9, .16);
  parts.push(new THREE.SphereGeometry(.14, 8, 6).scale(1, .6, 1).translate(0, .2, 0));
  return (fleurGeo = fusion(parts));
}
function geoFeuille() {
  if (feuilleGeo) return feuilleGeo;
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.5, .28, 1, 0); s.quadraticCurveTo(.5, -.28, 0, 0);
  return (feuilleGeo = new THREE.ShapeGeometry(s, 4).rotateX(-Math.PI / 2));
}
const matFleur = () => new THREE.MeshStandardMaterial({ color: 0xfbf7ee, roughness: .7, side: THREE.DoubleSide });
const matFeuille = () => new THREE.MeshStandardMaterial({ color: MF.couleur('#7d8452'), roughness: .8, side: THREE.DoubleSide });

/* =====================================================================
   PLAGE — la mer à l'heure dorée (aperçu), le henné en bordeaux au coucher du soleil, la mer calme à l'aube (réponse)
   ===================================================================== */
{
  const S = nouvelle('plage', { camX: 0, camY: -1.3, camZ: 0, focale: .95, tilt: .05, variante: 0, soleil: .03, rivage: 1, lacet: 0, tangage: 0 });
  const V = [
    { ciel: ['#2a0812', '#561427', '#8e2a3a', '#c9504c', '#f09a66'], coeur: '#ffdcae', halo: [255, 184, 140], mer: ['#c56a55', '#8a2c38', '#4e1220', '#2e0810'], teinte: [255, 196, 160],
      sable: ['#b9786a', '#5e2830'], mouille: [110, 24, 38, .34], nappe: [150, 50, 60, .32], ecume: [255, 232, 214], r: .046, nuages: .85, ciel2: [255, 170, 140], sol: [[120, 40, 50], [60, 20, 30]] },
    { ciel: ['#dde2e3', '#ebe9df', '#f6ead4', '#fbe3bf'], coeur: '#fff6e2', halo: [255, 240, 208], mer: ['#d7d8c6', '#b3b99f', '#93a088'], teinte: [255, 246, 225],
      sable: ['#f0e5cd', '#d6c2a0'], mouille: [150, 150, 120, .18], nappe: [200, 205, 185, .35], ecume: [255, 253, 246], r: .028, nuages: .55, sol: [[220, 210, 190], [180, 165, 140]] },
    { ciel: ['#34507e', '#6f85ab', '#c9b3a0', '#f2c48e', '#fbd9a2'], coeur: '#fff2d2', halo: [255, 228, 176], mer: ['#d9b48c', '#9a9282', '#56626a', '#2f3d4a'], teinte: [255, 232, 192],
      sable: ['#ead5b0', '#b99b74'], mouille: [120, 110, 100, .22], nappe: [170, 165, 150, .35], ecume: [255, 250, 238], r: .036, nuages: .9, sol: [[150, 140, 130], [60, 70, 80]] },
  ];
  const ciel = new MF.Ciel(S.s3), mer = new MF.Mer(S.s3);
  const nuages = [new MF.Nuages(S.s3, 8, 'henne', '255,170,140', '90,20,40', .34, 3), new MF.Nuages(S.s3, 6, 'aube', '255,250,238', '215,205,180', .3, 5), new MF.Nuages(S.s3, 9, 'dore', '255,222,176', '110,100,120', .4, 9)];
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1), sol = new THREE.DirectionalLight(0xffffff, 1);
  S.s3.add(hemi, sol, sol.target);

  // le sable et le bord de l'eau : sable sec, sable mouillé, nappe d'eau qui monte et redescend, écume
  const uS = {
    uTemps: { value: 0 }, uSable0: { value: new THREE.Vector3() }, uSable1: { value: new THREE.Vector3() }, uMouille: { value: new THREE.Vector4() },
    uNappe: { value: new THREE.Vector4() }, uEcume: { value: new THREE.Vector3() }, uZs: { value: 6.2 }, uMontee: { value: 1.3 }, uSoleil: { value: new THREE.Vector3() }, uHalo: { value: new THREE.Vector3() },
  };
  const sable = new THREE.Mesh(new THREE.PlaneGeometry(400, 60, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, -20), new THREE.ShaderMaterial({
    uniforms: uS, transparent: true, depthWrite: true, fog: false,
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uTemps; uniform vec3 uSable0, uSable1, uEcume, uSoleil, uHalo; uniform vec4 uMouille, uNappe; uniform float uZs, uMontee;
      varying vec3 vW;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float bruit(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
      float ligne(float X, float Zf, float amp) { return Zf + sin(X * 0.35 + uTemps * 1.1) * amp + sin(X * 1.1 - uTemps * 1.9) * amp * 0.35; }
      void main() {
        float X = vW.x, Z = -vW.z;
        float bord = ligne(X, uZs, 0.12);
        if (Z > bord + 0.015) discard;
        vec3 V = normalize(vW - cameraPosition);
        float dist = length(vW - cameraPosition);
        // sable sec : du clair (loin) au plus sombre (près), avec un grain fin
        float k = clamp((bord - Z) / 9.0, 0.0, 1.0);
        vec3 c = mix(uSable0, uSable1, k);
        c *= 0.94 + 0.08 * bruit(vW.xz * 9.0) + 0.05 * bruit(vW.xz * 1.3);
        // sable mouillé
        float run = 0.5 + 0.5 * sin(uTemps * 0.62);
        float zm = ligne(X, uZs - uMontee - 0.9, 0.1);
        float mouille = smoothstep(zm - 0.4, zm + 0.3, Z);
        c = mix(c, uMouille.rgb, mouille * uMouille.a);
        // reflet du soleil sur le sable mouillé
        vec3 R = reflect(V, vec3(0.0, 1.0, 0.0));
        float s = max(dot(R, uSoleil), 0.0);
        c += uHalo * (pow(s, 60.0) * 0.5 + pow(s, 8.0) * 0.12) * mouille;
        // nappe d'eau qui monte et redescend
        float front = ligne(X, uZs - uMontee * run - 0.2, 0.18);
        float nappe = smoothstep(front - 0.05, front + 0.05, Z);
        c = mix(c, uNappe.rgb, nappe * uNappe.a);
        // écume : le front de la nappe, une ligne qui se retire, une vague qui arrive
        float e = (1.0 - smoothstep(0.0, 0.07, abs(Z - front))) * 0.85 + (1.0 - smoothstep(0.0, 0.25, abs(Z - front))) * 0.2;
        float z2 = ligne(X, uZs + 0.5 + run * 0.3, 0.15); e += (1.0 - smoothstep(0.0, 0.05, abs(Z - z2))) * 0.25 * (1.0 - run);
        float cc = fract(uTemps * 0.35); float z3 = ligne(X, uZs + 5.0 - cc * 4.6, 0.08);
        c = mix(c, uEcume, clamp(e, 0.0, 1.0));
        float a = 1.0 - smoothstep(bord - 0.01, bord + 0.015, Z);
        gl_FragColor = vec4(pow(c, vec3(2.2)), a);
        #include <colorspace_fragment>
      }`,
  }));
  sable.renderOrder = -4;
  S.s3.add(sable);

  // la côte lointaine de l'heure dorée : une ligne de collines douces dans la brume, et ses petites lumières
  const coteU = { uCol: { value: new THREE.Vector3(70 / 255, 72 / 255, 92 / 255) } };
  const cote = (() => {
    const rr = MF.rng(77), pts = [];
    for (let i = 0; i <= 90; i++) {
      const u = i / 90, az = -1.62 + u * 1.5;
      const env = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** .6;
      pts.push([az, .0015 + env * (.0055 + .0035 * Math.sin(i * .21) + .002 * Math.sin(i * .77 + 1) + rr() * .0008)]);
    }
    const pos = [], al = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a0, e0] = pts[i], [a1, e1] = pts[i + 1];
      const A = MF.direction(a0, e0), B = MF.direction(a1, e1), A0 = MF.direction(a0, -.003), B0 = MF.direction(a1, -.003);
      pos.push(...A0.toArray(), ...B0.toArray(), ...A.toArray(), ...A.toArray(), ...B0.toArray(), ...B.toArray());
      al.push(1, 1, .78, .78, 1, .78);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('alpha', new THREE.Float32BufferAttribute(al, 1));
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: coteU, transparent: true, depthWrite: false, fog: false,
      vertexShader: `attribute float alpha; varying float vA; void main() { vA = alpha; gl_Position = projectionMatrix * viewMatrix * vec4(cameraPosition + position * 1300.0, 1.0); }`,
      fragmentShader: `uniform vec3 uCol; varying float vA; void main() { gl_FragColor = vec4(pow(uCol, vec3(2.2)), 0.5 * vA);
        #include <colorspace_fragment>
      }`,
    }));
    m.frustumCulled = false; m.renderOrder = -6; S.s3.add(m);
    return m;
  })();
  const lumCote = new MF.Lueurs(S.s3, 40, { profondeur: false, ordre: -5 });
  const dirsCote = Array.from({ length: 40 }, (_, i) => MF.direction(-1.55 + (i * .618 % 1) * 1.3, .002 + (i * .37 % 1) * .005));

  // henné : lanternes orientales posées sur le sable, pétales rouges, braises qui montent
  const r = MF.rng(21), lanternes = [];
  for (let i = 0; i < 26; i++) lanternes.push({ X: -6 + i * .5 + (r() - .5) * .25, Z: 4.2 + Math.sin(i * .7) * .5 + r() * .7, s: .8 + r() * .35, v: i % 2, ph: r() * 9 });
  for (let i = 0; i < 10; i++) lanternes.push({ X: -2.5 + i * .55 + (r() - .5) * .2, Z: 2.6 + r() * .6, s: .9 + r() * .3, v: (i + 1) % 2, ph: r() * 9 });
  lanternes.push({ X: 1.7, Z: 1.6, s: 1, v: 0, ph: 5 });
  const petalesSable = Array.from({ length: 140 }, () => ({ X: (r() - .5) * 14, Z: .8 + r() * 4.6, v: 3 + ((r() * 2) | 0), rot: r() * TAU, s: .7 + r() * .6 }));
  const braises = Array.from({ length: 34 }, () => ({ x: (r() - .5) * 9, z: 1 + r() * 6, v: .3 + r() * .7, ph: r() * TAU, s: r() }));
  const henne = new THREE.Group(); S.s3.add(henne);
  const NL = lanternes.length;
  // lanterne : corps ajouré (résille), verre coloré lumineux à l'intérieur, dôme en bulbe, socle et anneau de laiton
  const laiton = new THREE.MeshStandardMaterial({ color: MF.couleur('#d9b46a'), metalness: .85, roughness: .32 });
  const resille = resilleTex(); resille.repeat.set(4, 1.4);
  const cage = new THREE.InstancedMesh(new THREE.CylinderGeometry(.165, .165, .3, 8, 1, true).translate(0, .21, 0),
    new THREE.MeshStandardMaterial({ map: resille, alphaTest: .45, side: THREE.DoubleSide, metalness: .8, roughness: .35, color: 0xffffff }), NL);
  const verre = new THREE.InstancedMesh(new THREE.CylinderGeometry(.15, .15, .29, 8, 1).translate(0, .21, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), NL);
  const dome = fusion([
    new THREE.LatheGeometry([[0, 0], [.17, 0], [.175, .02], [.15, .07], [.09, .12], [.04, .17], [.012, .22], [0, .24]].map(([a, b]) => new THREE.Vector2(a, b)), 10).translate(0, .36, 0),
    cyl(.18, .19, .04, 10, 0, .04, 0), cyl(.13, .15, .04, 10, 0, 0, 0),
    new THREE.TorusGeometry(.03, .007, 6, 12).translate(0, .63, 0),
  ]);
  const laitons = new THREE.InstancedMesh(dome, laiton, NL);
  const coulVerre = [MF.couleur([255, 186, 96]), MF.couleur([236, 86, 86])];
  lanternes.forEach((l, i) => {
    const sc = l.s * 1.0, ry = l.ph;
    for (const m of [cage, verre, laitons]) place(m, i, l.X, 0, -l.Z, 0, ry, 0, sc);
    verre.setColorAt(i, coulVerre[l.v]);
  });
  henne.add(cage, verre, laitons);
  const petales = new THREE.Group(); henne.add(petales);
  for (const v of [3, 4]) {
    const L = petalesSable.filter(q => q.v === v);
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(.09, .09).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: petaleTex(v), alphaTest: .4, side: THREE.DoubleSide, roughness: .6 }), L.length);
    L.forEach((q, i) => place(m, i, q.X, .006, -q.Z, (Math.random() - .5) * .3, q.rot, (Math.random() - .5) * .3, q.s));
    petales.add(m);
  }
  const halos = new MF.Lueurs(henne, 200), flaques = new MF.Lueurs(henne, 60, { sol: true, ordre: 4 });

  S.prepare = (t, dt, W, H) => {
    const p = S.p, v = p.variante | 0, P = V[v], henneOn = v === 0, dore = v === 2;
    if (S.env[v]) S.s3.environment = S.env[v].texture;
    MF.cadre(S.cam, p, W, H);
    MF.reglerCiel(ciel.u, P.ciel, .75, { az: 0, el: p.soleil, r: P.r, force: 1, coeur: P.coeur, halo: P.halo, coupe: henneOn });
    ciel.suivre(S.cam);
    nuages.forEach((n, i) => n.regler(S.cam, t, i === v ? P.nuages : 0));
    mer.regler({ niveau: .05, cols: P.mer, teinte: P.teinte, reflet: henneOn || dore ? .75 : .5, astre: { az: 0, el: p.soleil, force: henneOn ? 1.1 : dore ? 1 : .55, col: P.halo }, brume: .5 }, ciel);
    mer.suivre(S.cam, t);
    // lumière : le soleil bas en face (contre-jour), le ciel et le sable qui renvoient la couleur
    MF.direction(0, Math.max(.05, p.soleil), sol.position).multiplyScalar(100).add(S.cam.position);
    sol.target.position.copy(S.cam.position);
    MF.couleur(P.halo, sol.color); sol.intensity = henneOn ? 2.2 : 1.6;
    MF.couleur(P.ciel[P.ciel.length - 2], hemi.color); MF.couleur(P.sable[0], hemi.groundColor); hemi.intensity = henneOn ? 1.25 : 1.5;
    // bord de l'eau
    sable.visible = !!p.rivage;
    if (sable.visible) {
      uS.uTemps.value = t;
      MF.vec(P.sable[0], uS.uSable0.value); MF.vec(P.sable[1], uS.uSable1.value);
      uS.uMouille.value.set(P.mouille[0] / 255, P.mouille[1] / 255, P.mouille[2] / 255, P.mouille[3]);
      uS.uNappe.value.set(P.nappe[0] / 255, P.nappe[1] / 255, P.nappe[2] / 255, P.nappe[3]);
      MF.vec(P.ecume, uS.uEcume.value); uS.uZs.value = henneOn ? 6.2 : 6.5;
      uS.uSoleil.value.copy(ciel.u.uSoleil.value); MF.vec(P.halo, uS.uHalo.value);
    }
    // côte lointaine
    cote.visible = dore; lumCote.vide();
    if (dore) for (let i = 0; i < 40; i++) {
      const d = dirsCote[i];
      lumCote.ajoute(S.cam.position.x + d.x * 1300, S.cam.position.y + d.y * 1300, S.cam.position.z + d.z * 1300, 7, [255, 170, 90], .35 + .25 * Math.sin(t * 2 + i));
    }
    lumCote.envoie();
    // henné
    henne.visible = henneOn;
    if (henneOn) {
      halos.vide(); flaques.vide();
      lanternes.forEach((l, i) => {
        const fl = .85 + .15 * Math.sin(t * 6 + l.ph) * Math.sin(t * 3.7 + l.ph * 2), y = .21 * l.s;
        halos.ajoute(l.X, y, -l.Z, 1.1 * l.s, [255, 170, 90], .26 * fl);
        halos.ajoute(l.X, y, -l.Z, .26 * l.s, [255, 236, 200], .7 * fl);
        flaques.ajoute(l.X, .015, -l.Z, 1.3 * l.s, [255, 170, 90], .18 * fl);
      });
      for (let i = 0; i < braises.length; i++) {
        if (!MF.garde(i)) continue;
        const b = braises[i], y = ((b.v * t * .25 + b.ph) % 3.2);
        halos.ajoute(b.x + Math.sin(t * .3 + b.ph) * .3, y, -b.z, .05 + b.s * .07, [255, 170, 90], .55 * (.5 + .5 * Math.sin(t * 3 + b.ph)) * clamp(y) * clamp(3.2 - y));
      }
      halos.envoie(); flaques.envoie();
    }
  };
  // reflets des métaux, préparés à l'avance pour chaque variante
  S.env = [];
  S.taches = [0, 1, 2].map(v => () => { S.env[v] = environnement(MF.renderer(), V[v].ciel, V[v].sol, { el: .05, col: V[v].halo, force: .9 }); });

  MF.scenes.plage = S;
}

/* =====================================================================
   MAIRIE — un fond neutre : une grande soie ivoire, drapée, qui ondule doucement dans la lumière
   ===================================================================== */
{
  const S = nouvelle('soie', { zoom: 1.1, derive: 0, lumiere: 1 });
  const u = { uTemps: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uSpot: { value: new THREE.Vector2(.35, .3) } };
  // ondes de la version cinéma : amplitude, kx, ky, vitesse, phase
  const ondes = [[1, 1.1, .55, .16, 0], [.7, 1.7, 1.2, -.12, 1.7], [.5, .6, 1.5, .1, 3.1], [.18, 3.3, 2.2, .22, .6], [.08, 5.1, 3.9, -.3, 2.2]];
  const GL_ONDES = `
    const int NO = 5;
    vec4 ondes[5];
    void initOndes() {
      ${ondes.map((o, i) => `ondes[${i}] = vec4(${o[0].toFixed(3)}, ${o[1].toFixed(3)}, ${o[2].toFixed(3)}, ${o[3].toFixed(3)});`).join('\n')}
    }
    float phases[5];
    // relief de la soie (en mètres) et sa pente, à partir des coordonnées du tissu (en « largeurs d'écran »)
    vec3 relief(vec2 q, float t) {
      ${ondes.map((o, i) => `phases[${i}] = ${o[4].toFixed(3)};`).join(' ')}
      float h = 0.0; vec2 g = vec2(0.0);
      for (int i = 0; i < NO; i++) {
        vec4 o = ondes[i];
        float a = (o.y * q.x + o.z * q.y) * 6.2832 + o.w * t + phases[i];
        h += sin(a) * o.x; g += cos(a) * o.x * 6.2832 * vec2(o.y, o.z);
      }
      return vec3(h, g);
    }`;
  // la soie : le relief (plis) déplace le tissu ; la lumière est calculée à chaque pixel, comme la version cinéma
  const soie = new THREE.Mesh(new THREE.PlaneGeometry(16, 12, 128, 96), new THREE.ShaderMaterial({
    uniforms: u, fog: false,
    vertexShader: GL_ONDES + `
      uniform float uTemps; varying vec3 vW; varying vec2 vQ;
      void main() {
        initOndes();
        vec2 q = position.xy / 1.7;
        q.x += sin(q.y * 4.2 + uTemps * 0.1) * 0.05;
        vec3 r = relief(q, uTemps);
        vec3 p = position + vec3(0.0, 0.0, r.x * 0.06);
        vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vQ = q;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: GL_ONDES + `
      uniform float uTemps; uniform vec2 uRes; uniform vec2 uSpot; varying vec3 vW; varying vec2 vQ;
      void main() {
        initOndes();
        vec3 r = relief(vQ, uTemps);
        vec3 n = normalize(vec3(-r.y * 0.026, -r.z * 0.026, 1.0));
        vec3 L = normalize(vec3(-0.45, 0.62, 0.64));
        vec3 V = normalize(cameraPosition - vW);
        vec3 Hv = normalize(L + V);
        float diff = max(dot(n, L), 0.0);
        float hv = max(dot(n, Hv), 0.0);
        float spec = pow(hv, 26.0);
        // satin : un léger éclat sur les flancs des plis, qui bouge avec la caméra
        float sheen = pow(1.0 - max(dot(n, V), 0.0), 4.0) * 0.6;
        vec3 c = vec3(238.0, 229.0, 213.0) / 255.0 * (0.6 + 0.46 * diff) + vec3(70.0, 66.0, 58.0) / 255.0 * spec * 1.3 + vec3(1.0, 0.97, 0.9) * sheen * 0.25;
        // lumière douce qui passe sur l'écran, et vignette chaude
        vec2 s = gl_FragCoord.xy / uRes; s.y = 1.0 - s.y;
        vec2 ds = (s - uSpot) * vec2(uRes.x / uRes.y, 1.0);
        float sp = exp(-dot(ds, ds) * 3.2);
        c = mix(c, vec3(1.0, 0.99, 0.95), sp * 0.42);
        float vg = smoothstep(0.36, 0.95, length((s - vec2(0.5, 0.48)) * vec2(uRes.x / max(uRes.x, uRes.y), uRes.y / max(uRes.x, uRes.y)) * 1.6));
        c = mix(c, vec3(150.0, 130.0, 95.0) / 255.0, vg * 0.22);
        gl_FragColor = vec4(pow(min(c, 1.0), vec3(2.2)), 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  soie.position.set(0, 0, -6);
  S.s3.add(soie);
  S.s3.background = MF.couleur('#e8e0d0');
  const r = MF.rng(9), bulles = Array.from({ length: 40 }, () => ({ x: r(), y: r(), z: .25 + r() * .75, v: .3 + r() * .7, ph: r() * TAU }));
  const poussiere = new MF.Lueurs(S.s3, 60);
  S.prepare = (t, dt, W, H) => {
    const p = S.p;
    // le zoom de la version cinéma devient la distance au tissu, la dérive devient un travelling latéral
    const d = 3.1 * p.zoom;
    // caméra à d mètres devant la soie (la soie est à z = -6)
    MF.cadre(S.cam, { camX: p.derive * 1.7 + Math.sin(t * .05) * .1, camY: -.2 - Math.sin(t * .04) * .1, camZ: 6 - d, focale: 1, tilt: 0, lacet: -.05 + p.derive * .6, tangage: .03 }, W, H);
    u.uTemps.value = t; u.uRes.value.set(W * MF.DPR, H * MF.DPR);
    u.uSpot.value.set(.35 + .1 * Math.sin(t * .11), .3 + .05 * Math.cos(t * .09));
    poussiere.vide();
    bulles.forEach((b, i) => {
      if (!MF.garde(i)) return;
      const x = ((b.x + t * .004 * b.v + p.derive * .3 * b.z) % 1 - .5) * 2.4 + S.cam.position.x;
      const y = (((b.y - t * .006 * b.v) % 1 + 1) % 1 - .5) * 3.2 + S.cam.position.y;
      const z = S.cam.position.z - 1 - b.z * 1.6;
      poussiere.ajoute(x, y, z, (.006 + b.z * .014), [226, 196, 140], .45 * b.z * (.8 + .2 * Math.sin(t + b.ph)));
    });
    poussiere.envoie();
  };
  MF.scenes.soie = S;
}

/* =====================================================================
   HOUPPA — au bord de la mer : terrasse, allée, chaises, lanternes, dais fleuri ; de l'heure dorée à la nuit
   ===================================================================== */
{
  const S = nouvelle('houppa', { camX: 0, camY: -1.6, camZ: 0, focale: .95, tilt: .02, tod: 0, allee: 1, lacet: 0, tangage: 0 });
  const ZH = 14, HP = { X: 1.45, prof: 2.1, H: 2.55 }, ALLEE = .6, Z0 = -2;
  const pal = MF.palette({
    0: { c0: '#a9bcc4', c1: '#d8d6c3', c2: '#f3e2c4', c3: '#f8d9a8', m0: '#aeb8a5', m1: '#8d9a86', m2: '#6f7f6c', s0: '#ecdfc4', s1: '#cbb691', soleil: 1, lampes: .35, etoiles: 0, tissu: '#fffdf8', nuage: 1, lum: 1 },
    1: { c0: '#6f7ea3', c1: '#c3a5a4', c2: '#efbf98', c3: '#f6c890', m0: '#c29e8c', m1: '#8f807a', m2: '#5d6261', s0: '#e3c9a8', s1: '#b19274', soleil: .8, lampes: .6, etoiles: .05, tissu: '#fff4ea', nuage: .9, lum: .85 },
    2: { c0: '#232d57', c1: '#56557e', c2: '#a8859a', c3: '#e3a98f', m0: '#6f6a82', m1: '#474a67', m2: '#2b3048', s0: '#a0918c', s1: '#6a5f68', soleil: 0, lampes: 1, etoiles: .5, tissu: '#e9e2e6', nuage: .6, lum: .35 },
    3: { c0: '#060a1e', c1: '#101939', c2: '#232853', c3: '#40385c', m0: '#20263f', m1: '#12162f', m2: '#0a0d1f', s0: '#4a4450', s1: '#26222c', soleil: 0, lampes: 1, etoiles: 1, tissu: '#cfc8d6', nuage: .35, lum: .16 },
  });
  const ciel = new MF.Ciel(S.s3), etoiles = new MF.Etoiles(S.s3, 360, 17), nuages = new MF.Nuages(S.s3, 7, 'houppa', '255,244,226', '190,180,170', .32, 11);
  const lune = new MF.Lune(S.s3, true), mer = new MF.Mer(S.s3);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1), soleil = new THREE.DirectionalLight(0xffffff, 1), luneL = new THREE.DirectionalLight(0xc8d2ff, 0);
  S.s3.add(hemi, soleil, soleil.target, luneL, luneL.target);
  const lampes = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffb070, 0, 7, 2); S.s3.add(l); return l; });
  const POS_LAMPES = [[0, 1, 6], [0, 1, 10], [0, 1.4, ZH - .5]];

  // terrasse au bord de l'eau, bord arrondi, posée 3 m au-dessus de la mer
  {
    const sh = new THREE.Shape();
    sh.moveTo(-40, 14);
    for (let i = 0; i <= 48; i++) { const X = -26 + 52 * i / 48; sh.lineTo(X, -(ZH + 5 - .03 * X * X)); }
    sh.lineTo(40, 14); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 2, curveSegments: 4 });
    g.rotateX(Math.PI / 2);   // le plan (x, y) devient (x, z) ; l'épaisseur descend vers la mer
    const tex = pierreTex(); tex.repeat.set(1 / 2.2, 1 / 2.2);
    const terrasse = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, color: MF.couleur('#e2d4bc'), roughness: .9 }));
    S.s3.add(terrasse);
  }
  // l'allée de tissu ivoire, et ses pétales
  const allee = new THREE.Mesh(new THREE.PlaneGeometry(ALLEE * 2, ZH + .1 - Z0).rotateX(-Math.PI / 2).translate(0, .006, -(Z0 + ZH + .1) / 2),
    new THREE.MeshStandardMaterial({ map: (() => { const t = trameTex(); t.repeat.set(2, 30); return t; })(), color: MF.couleur('#fffaf0'), roughness: .95 }));
  S.s3.add(allee);
  const r = MF.rng(7);
  // fleurs du dais : même disposition que la version cinéma
  const fleurs = [];
  const add = (X, Y, Z, n, spread, taille) => { for (let i = 0; i < n; i++) fleurs.push({ X: X + (r() - .5) * spread, Y: Y + (r() - .5) * spread * .6, Z: Z + (r() - .5) * spread * .3, r: taille * (.6 + r() * .6), rot: r() * 3.14, leaf: r() < .45 }); };
  const s = .085;
  for (let i = 0; i <= 10; i++) add(-HP.X + 2 * HP.X * i / 10, HP.H, ZH - .03, 3, s * 2, s);
  for (let i = 0; i <= 8; i++) add(-HP.X + 2 * HP.X * i / 8, HP.H, ZH + HP.prof, 2, s * 1.6, s * .85);
  for (const X of [-HP.X, HP.X]) {
    add(X, HP.H, ZH - .05, 9, s * 4, s * 1.3);
    for (let j = 1; j <= 6; j++) add(X, HP.H - HP.H * .09 * j, ZH - .06, 2, s * 1.4, s * (1 - j * .08));
    add(X, .12, ZH - .1, 6, s * 4, s * 1.1);
  }
  const petalesA = Array.from({ length: 220 }, () => ({ X: (r() * 2 - 1) * ALLEE * .9, Z: Z0 + r() * (ZH - .3 - Z0), v: (r() * 3) | 0, s: .7 + r() * .6, rot: r() * TAU }));
  const bords = []; for (let i = 0; i < 18; i++) for (const e of [-1, 1]) bords.push({ X: e * (ALLEE + .04), Z: Z0 + (i + .5) * (ZH - Z0) / 18, s: .8 + r() * .4, rot: r() * 3, leaf: r() < .5 });
  const rangs = Array.from({ length: 7 }, (_, i) => ZH - 1.8 - i * 1.25);
  // toutes les fleurs : dais, bords de l'allée, bouts de rangées
  const toutes = [...fleurs.map(f => ({ X: f.X, Y: f.Y, Z: f.Z, r: f.r, rot: f.rot, leaf: f.leaf, incl: 1.15 }))];
  for (const b of bords) toutes.push({ X: b.X, Y: .06, Z: b.Z, r: .07 * b.s, rot: b.rot, leaf: b.leaf, incl: .55 });
  rangs.forEach((Z, i) => { for (const side of [-1, 1]) { const X = side * (ALLEE + .48); [[0, .8, .085], [-.07, .72, .065], [.06, .72, .06]].forEach(([ox, oy, rr], q2) => toutes.push({ X: X - side * .2 + ox, Y: oy, Z: Z + .05, r: rr, rot: i + q2, leaf: q2 === 1, incl: 1.05 })); } });
  const mF = new THREE.InstancedMesh(geoFleur(), matFleur(), toutes.length), mL = new THREE.InstancedMesh(geoFeuille(), matFeuille(), toutes.length);
  let nl = 0;
  toutes.forEach((f, i) => {
    // les fleurs regardent un peu vers l'allée et la caméra
    place(mF, i, f.X, f.Y, -f.Z, f.incl + ((f.rot * 3.7) % 1 - .5) * .5, ((f.rot * 7.3) % 1 - .5) * .9, ((f.rot * 5.1) % 1 - .5) * .6, f.r * 1.6);
    if (f.leaf) place(mL, nl++, f.X, f.Y - f.r * .3, -f.Z + f.r * .4, .5, f.rot * 2, .3, f.r * 2.4);
  });
  mL.count = nl;
  S.s3.add(mF, mL);
  // pétales de l'allée (blancs et ivoire)
  for (const v of [0, 1, 2]) {
    const L = petalesA.filter(q => q.v === v);
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(.07, .07).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: petaleTex(v), alphaTest: .4, side: THREE.DoubleSide, roughness: .7 }), L.length);
    L.forEach((q, i) => place(m, i, q.X, .009, -q.Z, (r() - .5) * .25, q.rot, (r() - .5) * .25, q.s));
    S.s3.add(m);
  }
  // chaises Chiavari blanches, vues de dos, tournées vers la houppa
  const chaiseGeo = (() => {
    const L = [], w = .2, d = .2, hs = .45, ht = .86, rr = .011;
    for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d]]) L.push(barre(new THREE.Vector3(x * .95, 0, z * .95), new THREE.Vector3(x, hs, z), rr));
    L.push(boite(w * 2 + .03, .03, d * 2 + .03, 0, hs + .015, 0));
    L.push(boite(w * 2 - .02, .035, d * 2 - .03, 0, hs + .045, 0));   // coussin
    // dossier côté caméra (+z, la chaise regarde vers -z)
    for (const x of [-w, w]) L.push(barre(new THREE.Vector3(x, hs, d), new THREE.Vector3(x * 1.02, ht, d + .03), rr));
    L.push(barre(new THREE.Vector3(-w * 1.04, ht - .01, d + .03), new THREE.Vector3(w * 1.04, ht - .01, d + .03), .016));
    for (const y of [.62, .74]) L.push(barre(new THREE.Vector3(-w, y, d + .015), new THREE.Vector3(w, y, d + .015), .008));
    for (const x of [-.1, 0, .1]) L.push(barre(new THREE.Vector3(x, hs + .03, d + .01), new THREE.Vector3(x, ht - .02, d + .03), .006));
    L.push(barre(new THREE.Vector3(-w, .2, -d), new THREE.Vector3(-w, .2, d), .006), barre(new THREE.Vector3(w, .2, -d), new THREE.Vector3(w, .2, d), .006));
    return fusion(L);
  })();
  const NC = rangs.length * 6;
  const chaises = new THREE.InstancedMesh(chaiseGeo, new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: .35, metalness: 0 }), NC);
  let ic = 0;
  const lanternesA = [];
  rangs.forEach((Z, i) => {
    for (const side of [-1, 1]) for (let j = 0; j < 3; j++) place(chaises, ic++, side * (ALLEE + .48 + j * .62), 0, -Z, 0, 0, 0, 1);
    for (const side of [-1, 1]) lanternesA.push({ X: side * (ALLEE + .12), Z: Z - .25, ph: i + side });
  });
  S.s3.add(chaises);
  // ombres douces au sol, sous les chaises et les poteaux
  const ombreTex = ombreDouce();
  const ombres = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ombreTex, transparent: true, depthWrite: false, opacity: .55 }), NC + 4);
  ic = 0;
  rangs.forEach(Z => { for (const side of [-1, 1]) for (let j = 0; j < 3; j++) place(ombres, ic++, side * (ALLEE + .48 + j * .62), .004, -Z, 0, 0, 0, .62, 1, .55); });
  for (const [X, Z] of [[-HP.X, ZH], [HP.X, ZH], [-HP.X, ZH + HP.prof], [HP.X, ZH + HP.prof]]) place(ombres, ic++, X, .004, -Z, 0, 0, 0, .35);
  S.s3.add(ombres);
  // lanternes blanches et dorées au bout des rangées
  const NLA = lanternesA.length;
  const orMat = new THREE.MeshStandardMaterial({ color: MF.couleur('#d8bf86'), metalness: .8, roughness: .35 });
  const cadreL = new THREE.InstancedMesh(fusion([
    boite(.24, .03, .24, 0, .015, 0), boite(.22, .03, .22, 0, .41, 0),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => boite(.015, .37, .015, a * .105, .21, b * .105)),
    new THREE.ConeGeometry(.16, .09, 4).rotateY(Math.PI / 4).translate(0, .47, 0), new THREE.TorusGeometry(.025, .005, 6, 12).translate(0, .54, 0),
  ]), orMat, NLA);
  const verreL = new THREE.InstancedMesh(boite(.2, .36, .2, 0, .21, 0), new THREE.MeshStandardMaterial({ color: 0xfff6e6, transparent: true, opacity: .35, roughness: .1, emissive: MF.couleur('#ffcf8a'), emissiveIntensity: .2 }), NLA);
  lanternesA.forEach((l, i) => { place(cadreL, i, l.X, 0, -l.Z, 0, .3, 0, 1); place(verreL, i, l.X, 0, -l.Z, 0, .3, 0, 1); });
  S.s3.add(cadreL, verreL);
  // le dais : quatre poteaux, le toit de tissu, le lambrequin qui ondule au vent, deux voilages
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(.04, .045, HP.H, 12).translate(0, HP.H / 2, 0), new THREE.MeshStandardMaterial({ color: 0xf8f3ea, roughness: .5 }), 4);
  [[-HP.X, ZH], [HP.X, ZH], [-HP.X, ZH + HP.prof], [HP.X, ZH + HP.prof]].forEach(([X, Z], i) => place(posts, i, X, 0, -Z, 0, 0, 0, 1));
  S.s3.add(posts);
  const tissuMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8, side: THREE.DoubleSide, transparent: true, opacity: .95, emissive: 0xffe2b8, emissiveIntensity: 0 });
  const toit = new THREE.Mesh(new THREE.PlaneGeometry(HP.X * 2 + .06, HP.prof + .06, 8, 6).rotateX(-Math.PI / 2), tissuMat);
  { const p = toit.geometry.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k) / (HP.X + .03), z = p.getZ(k) / (HP.prof / 2 + .03); p.setY(k, -.08 * (1 - x * x) * (1 - z * z)); } toit.geometry.computeVertexNormals(); }
  toit.position.set(0, HP.H, -(ZH + HP.prof / 2));
  S.s3.add(toit);
  const lambrequin = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 22, 4), tissuMat);
  const voiles = [-1, 1].map(() => new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 4, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, side: THREE.DoubleSide, transparent: true, opacity: .55, depthWrite: false, emissive: 0xffe2b8, emissiveIntensity: 0 })));
  S.s3.add(lambrequin, ...voiles);
  function tissus(t) {
    const vent = u => Math.sin(t * 1.5 + u) * .03 + Math.sin(t * 2.7 + u * 2) * .012;
    const p = lambrequin.geometry.attributes.position, n = 22;
    for (let k = 0; k < p.count; k++) {
      const i = k % (n + 1), j = Math.floor(k / (n + 1)), u = i / n, v = j / 4;
      const bas = HP.H - .16 - .32 * 4 * u * (1 - u) + vent(u * 5);
      p.setXYZ(k, -HP.X + 2 * HP.X * u, lerp(HP.H, bas, v), -(ZH - .01) + v * .03 * Math.sin(t * 1.2 + u * 4));
    }
    p.needsUpdate = true; lambrequin.geometry.computeVertexNormals();
    voiles.forEach((m, si) => {
      const sd = si ? 1 : -1, q = m.geometry.attributes.position, len = HP.H * .78, sw = vent(sd * 2) * 3;
      for (let k = 0; k < q.count; k++) {
        const i = k % 5, j = Math.floor(k / 5), u = i / 4, v = j / 12;
        const ouvre = Math.sin(v * Math.PI * .95) * .3 + sw * v;
        q.setXYZ(k, sd * (HP.X + ouvre * (1 - u * .3) - u * .12), HP.H - v * len, -(ZH - .03) + u * .2);
      }
      q.needsUpdate = true; m.geometry.computeVertexNormals();
    });
  }
  // lueurs : lanternes, bougies au pied de la houppa, feux d'artifice
  const lueurs = new MF.Lueurs(S.s3, 120), flaques = new MF.Lueurs(S.s3, 40, { sol: true, ordre: 4 });
  const ciels = new MF.Lueurs(S.s3, 4000, { ordre: -3, douceur: .45 });
  const feux = new MF.Feux(ciels);
  S.tire = (x, y, taille = 1) => feux.tire(lerp(-28, 28, x), lerp(36, 18, y / .3), -(ZH + 75), 13 * taille);
  S.feux = feux;
  const envs = new Map(), tmp = new THREE.Vector3();
  function envPour(c) {
    if (!envs.has(c)) {
      const P = pal(c), el = lerp(.05, -.04, clamp(c / 1.6));
      envs.set(c, environnement(MF.renderer(), [P.c0, P.c1, P.c2, P.c3], [P.s0, P.s1], P.soleil > .05 ? { el, col: [255, 236, 200], force: P.soleil } : null));
    }
    return envs.get(c);
  }
  S.taches = [.5, 1, 1.5, 2, 2.5, 3].map(c => () => envPour(c));

  S.prepare = (t, dt, W, H) => {
    const p = S.p, P = pal(p.tod), nuit = clamp(p.tod - 1.6), ombre = clamp((p.tod - 1.2) / 1.4);
    MF.cadre(S.cam, p, W, H);
    const el = lerp(.05, -.04, clamp(p.tod / 1.6));
    MF.reglerCiel(ciel.u, [P.c0, P.c1, P.c2, P.c3], .75, { az: 0, el, r: .03, force: P.soleil, coeur: '#fff4dc', halo: [255, 236, 200], coupe: true });
    ciel.suivre(S.cam);
    etoiles.regler(P.etoiles, t);
    nuages.regler(S.cam, t, .7 * P.nuage);
    lune.regler(S.cam, .22, .09 + nuit * .05, .12, nuit);
    mer.regler({ niveau: 3, cols: [P.m0, P.m1, P.m2], teinte: nuit > 0 ? [235, 238, 255] : [255, 242, 220], reflet: nuit > .3 ? .4 : .5 * P.soleil + .1,
      astre: nuit > .3 ? { az: .22, el: .09 + nuit * .05, force: .5 * nuit, col: [235, 238, 255] } : { az: 0, el: Math.max(.004, el), force: P.soleil * .9, col: [255, 236, 200] }, brume: .5 }, ciel);
    mer.suivre(S.cam, t);
    // lumières : soleil couchant en contre-jour, ciel, lune, et la nuit les lanternes
    MF.direction(0, Math.max(.06, el + .05), soleil.position).multiplyScalar(80).add(tmp.set(0, 0, -ZH)); soleil.target.position.set(0, 0, -(ZH - 6));
    MF.couleur([255, 214, 170], soleil.color); soleil.intensity = 2.4 * P.soleil;
    MF.couleur(P.c2, hemi.color); MF.couleur(P.s1, hemi.groundColor); hemi.intensity = .4 + 1.5 * P.lum;
    MF.direction(.22, .3, luneL.position).multiplyScalar(80); luneL.intensity = .45 * nuit;
    tissuMat.emissiveIntensity = .12 * P.soleil; voiles.forEach(v => { v.material.emissiveIntensity = .2 * P.soleil; });
    verreL.material.emissiveIntensity = .2 + 1.4 * P.lampes;
    // trois lampes chaudes le long de l'allée, la nuit
    for (let i = 0; i < 3; i++) { const [X, Y, Z] = POS_LAMPES[i]; lampes[i].position.set(X, Y, -Z); lampes[i].intensity = 2.2 * ombre * (i === 2 ? 1.4 : 1); }
    tissus(t);
    // lueurs
    lueurs.vide(); flaques.vide();
    for (const l of lanternesA) {
      const fl = .85 + .15 * Math.sin(t * 9 + l.ph);
      const L2 = P.lampes * P.lampes;
      lueurs.ajoute(l.X, .22, -l.Z, .5 + ombre * .8, [255, 196, 120], (.04 + .3 * L2) * fl);
      lueurs.ajoute(l.X, .2, -l.Z, .14, [255, 240, 210], .85 * L2 * fl);
      flaques.ajoute(l.X, .012, -l.Z, 1.0, [255, 196, 120], .16 * L2 * fl);
    }
    if (P.lampes > .5) for (const X of [-HP.X - .25, HP.X + .25, -.5, .5]) lueurs.ajoute(X, .15, -(ZH - .3), .6, [255, 196, 120], .3 * P.lampes);
    if (ombre > 0) lueurs.ajoute(0, 1.2, -(ZH + .8), 4, [255, 196, 120], .18 * ombre);
    lueurs.envoie(); flaques.envoie();
    ciels.vide(); feux.pose(dt); ciels.envoie();
    // reflets des métaux : préparés à l'avance pour chaque moment de la journée
    const env = envPour(Math.round(clamp(p.tod, .5, 3) * 2) / 2).texture;
    if (S.s3.environment !== env) S.s3.environment = env;
  };
  MF.scenes.houppa = S;
}

/* =====================================================================
   CHABBAT — la table dressée au bord de la mer, à l'entrée du Chabbat : l'heure bleue devient nuit
   ===================================================================== */
{
  const S = nouvelle('chabbat', { camX: 0, camY: -.34, camZ: 0, focale: 1.1, tilt: .12, nuit: .4, allume: 1, lacet: 0, tangage: 0 });
  const pal = MF.palette({
    0: { c0: '#1d2856', c1: '#3f4479', c2: '#83708f', c3: '#dba08c', m0: '#6f6b8a', m1: '#3e4263', m2: '#252a45', etoiles: .25, lum: .7 },
    1: { c0: '#050918', c1: '#0c1433', c2: '#1d234a', c3: '#44395b', m0: '#262a47', m1: '#141832', m2: '#0a0c1d', etoiles: 1, lum: .25 },
  });
  const ciel = new MF.Ciel(S.s3), etoiles = new MF.Etoiles(S.s3, 420, 23), lune = new MF.Lune(S.s3, false), mer = new MF.Mer(S.s3);
  const hemi = new THREE.HemisphereLight(0x8890c0, 0x403848, 1), luneL = new THREE.DirectionalLight(0xc8d2ff, .3);
  S.s3.add(hemi, luneL, luneL.target);
  const r = MF.rng(31);
  const villes = Array.from({ length: 70 }, () => ({ az: -1.1 + Math.pow(r(), 1.6) * .75, el: .002 + r() * .006, s: r(), ph: r() * 9 }));
  const bougies = [[-.09, .95], [.09, .98]];
  const votives = [[-.52, 1.15], [-.36, .8], [.38, .82], [.55, 1.18], [-.8, .95], [.82, 1]];
  const flammes = [];
  // la nappe blanche, qui retombe au bord de la table
  const nappeTex = trameTex().clone(); nappeTex.needsUpdate = true; nappeTex.repeat.set(10, 8);
  const nappe = new THREE.Mesh(fusion([
    new THREE.PlaneGeometry(5.6, 4, 1, 1).rotateX(-Math.PI / 2).translate(0, 0, -(1.5 - 2)),
    new THREE.PlaneGeometry(5.6, .28, 1, 1).translate(0, -.14, -1.5),
  ]), new THREE.MeshStandardMaterial({ map: nappeTex, color: 0xfaf6ee, roughness: .9 }));
  S.s3.add(nappe);
  // plis du tissu : de légères bandes plus sombres, comme la version cinéma
  const plis = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4).rotateX(-Math.PI / 2).translate(0, .001, -(1.5 - 2)), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, map: peinte('plis', 128, 16, x => { for (let i = 0; i < 128; i += 16) { const g = x.createLinearGradient(i, 0, i + 6, 0); g.addColorStop(0, 'rgba(150,130,110,0)'); g.addColorStop(.5, 'rgba(150,130,110,.07)'); g.addColorStop(1, 'rgba(150,130,110,0)'); x.fillStyle = g; x.fillRect(i, 0, 6, 16); } }) }));
  S.s3.add(plis);
  const argent = new THREE.MeshStandardMaterial({ color: 0xe8e6e0, metalness: 1, roughness: .22 });
  // bougeoirs d'argent (profil de la version cinéma, tourné)
  const prof = [[0, 38], [-4, 37], [-10, 28], [-16, 12], [-22, 8], [-30, 7], [-36, 12], [-42, 7], [-58, 6], [-64, 9], [-70, 21], [-74, 21], [-76, 10], [-80, 9]];
  const bougeoirGeo = new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...prof.map(([y, w]) => new THREE.Vector2(w / 80 * .055, -y / 80 * .105)), new THREE.Vector2(0, .105)], 24);
  bougies.forEach(([X, Z], i) => {
    const b = new THREE.Mesh(bougeoirGeo, argent); b.position.copy(P3(X, 0, Z)); S.s3.add(b);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.015, .016, .21, 16).translate(0, .105, 0), new THREE.MeshStandardMaterial({ color: 0xfdfaf3, roughness: .5, emissive: 0xffd9a0, emissiveIntensity: 0 }));
    c.position.copy(P3(X, .103, Z)); S.s3.add(c);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.0012, .0012, .012, 4).translate(0, .006, 0), new THREE.MeshBasicMaterial({ color: 0x3a3225 }));
    m.position.copy(P3(X, .313, Z)); S.s3.add(m);
    flammes.push({ X, Y: .325, Z, h: .045, i, bougie: c });
  });
  const lumB = bougies.map(() => { const l = new THREE.PointLight(0xffb36b, 0, 5, 2); S.s3.add(l); return l; });
  // la halla sous son napperon brodé
  const napT = napperonTex().clone(); napT.needsUpdate = true; napT.repeat.set(2, 2); napT.offset.set(0, -1); napT.wrapS = THREE.RepeatWrapping;
  const halla = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: napT, roughness: .85, envMapIntensity: .5 }));
  halla.scale.set(.16, .09, .1); halla.position.copy(P3(-.27, 0, .86)); S.s3.add(halla);
  // coupe de Kiddouch, et le vin
  const coupeGeo = new THREE.LatheGeometry([[0, 0], [.02, 0], [.022, .004], [.016, .008], [.005, .02], [.004, .044], [.007, .048], [.004, .052], [.006, .056], [.02, .07], [.023, .1], [.022, .1]].map(([a, b]) => new THREE.Vector2(a, b * 1.33)), 24);
  const coupe = new THREE.Mesh(coupeGeo, argent); coupe.position.copy(P3(.27, 0, .9)); S.s3.add(coupe);
  const vin = new THREE.Mesh(new THREE.CircleGeometry(.021, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5a0a18, roughness: .15 }));
  vin.position.copy(P3(.27, .123, .9)); S.s3.add(vin);
  // assiettes de porcelaine à filet doré
  const or = new THREE.MeshStandardMaterial({ color: MF.couleur('#c9ad6c'), metalness: .9, roughness: .3 });
  for (const [X, Z] of [[-.3, .58], [.32, .6]]) {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(.12, .1, .012, 40).translate(0, .006, 0), new THREE.MeshStandardMaterial({ color: MF.couleur('#f1ebdf'), roughness: .55, envMapIntensity: .4 }));
    a.position.copy(P3(X, 0, Z)); S.s3.add(a);
    const o = new THREE.Mesh(new THREE.PlaneGeometry(.3, .3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ombreDouce(), transparent: true, depthWrite: false, opacity: .5 }));
    o.position.copy(P3(X, .0015, Z + .01)); S.s3.add(o);
    const f = new THREE.Mesh(new THREE.TorusGeometry(.105, .0025, 6, 48).rotateX(Math.PI / 2), or); f.position.copy(P3(X, .0125, Z)); S.s3.add(f);
  }
  // photophores de verre, avec leur bougie chauffe-plat
  const verre = new THREE.MeshStandardMaterial({ color: 0xfff8ec, transparent: true, opacity: .32, roughness: .08, emissive: 0xffc070, emissiveIntensity: 0, side: THREE.DoubleSide, depthWrite: false });
  for (const [X, Z] of votives) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(.035, .033, .084, 20, 1, true).translate(0, .042, 0), verre); v.position.copy(P3(X, 0, Z)); S.s3.add(v);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, .018, 16).translate(0, .009, 0), new THREE.MeshStandardMaterial({ color: 0xf7efe0, roughness: .6 })); c.position.copy(P3(X, 0, Z)); S.s3.add(c);
    flammes.push({ X, Y: .03, Z, h: .028, i: X * 10 });
  }
  // le bouquet blanc, dans un petit vase d'argent
  const vase = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.03, 0], [.034, .02], [.022, .06], [.026, .075]].map(([a, b]) => new THREE.Vector2(a, b)), 20), argent);
  vase.position.copy(P3(0, 0, 1.34)); S.s3.add(vase);
  const bouquet = Array.from({ length: 11 }, () => ({ X: (r() - .5) * .16, Y: .07 + r() * .07, Z: 1.34 + (r() - .5) * .1, rr: .024 + r() * .012, rot: r() * 3 }));
  const mB = new THREE.InstancedMesh(geoFleur(), matFleur(), bouquet.length), mBL = new THREE.InstancedMesh(geoFeuille(), matFeuille(), bouquet.length);
  bouquet.forEach((b, i) => { place(mB, i, b.X, b.Y, -b.Z, .7 + (i % 3) * .2, (b.X) * 4, (b.X) * 3, b.rr * 1.7); place(mBL, i, b.X, b.Y - .01, -b.Z, .4, b.rot * 2, .4, b.rr * 2.6); });
  S.s3.add(mB, mBL);
  // flammes : une petite image qui vacille, et des halos
  const flTex = flammeTex();
  const spritesF = flammes.map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); S.s3.add(s); return s; });
  const halos = new MF.Lueurs(S.s3, 40), flaques = new MF.Lueurs(S.s3, 12, { sol: true, ordre: 4 });
  const cote = new MF.Lueurs(S.s3, 80, { profondeur: false, ordre: -5 });
  const envs = new Map(), dirsVilles = villes.map(v => MF.direction(v.az, v.el));
  function envPour(c) {
    if (!envs.has(c)) { const P = pal(c); envs.set(c, environnement(MF.renderer(), [P.c0, P.c1, P.c2, P.c3], [[80, 70, 80], [40, 36, 46]], { el: .1, col: [255, 200, 140], force: .5 })); }
    return envs.get(c);
  }
  S.taches = [0, .5, 1].map(c => () => envPour(c));

  S.prepare = (t, dt, W, H) => {
    const p = S.p, P = pal(p.nuit), lit = p.allume;
    MF.cadre(S.cam, p, W, H);
    MF.reglerCiel(ciel.u, [P.c0, P.c1, P.c2, P.c3], .8, null);
    ciel.suivre(S.cam);
    etoiles.regler(P.etoiles, t);
    lune.regler(S.cam, .28, .22, .07, 1);
    mer.regler({ niveau: 14, cols: [P.m0, P.m1, P.m2], teinte: [220, 226, 255], reflet: .3, eclat: .7, astre: { az: .28, el: .22, force: .3 + .3 * p.nuit, col: [235, 240, 255] }, brume: .45 }, ciel);
    mer.suivre(S.cam, t);
    MF.couleur(P.c2, hemi.color); MF.couleur([60, 50, 60], hemi.groundColor); hemi.intensity = .7 + 1.4 * P.lum;
    MF.direction(.28, .4, luneL.position).multiplyScalar(50); luneL.intensity = .25 + .35 * p.nuit;
    verre.emissiveIntensity = .35 * lit;
    // lumières de la côte lointaine
    cote.vide();
    for (let i = 0; i < villes.length; i++) {
      const v = villes[i], d = dirsVilles[i];
      cote.ajoute(S.cam.position.x + d.x * 1200, S.cam.position.y + d.y * 1200, S.cam.position.z + d.z * 1200, (2 + v.s * 3) * 3.4, [255, 206, 150], (.25 + .2 * Math.sin(t * 2 + v.ph)) * (.4 + .6 * p.nuit));
    }
    cote.envoie();
    // flammes et lumière des bougies
    halos.vide(); flaques.vide();
    flammes.forEach((f, k) => {
      const l = f.bougie ? clamp(lit * 2 - f.i) : lit, s = spritesF[k];
      const fl = 1 + Math.sin(t * 13 + k) * .06 + Math.sin(t * 7.3 + k * 2) * .05;
      s.visible = l > .01;
      s.position.set(f.X + Math.sin(t * 5 + k) * .002, f.Y + f.h * .5 * fl * l, -f.Z);
      s.scale.set(f.h * .5 * l, f.h * fl * l, 1);
      halos.ajoute(f.X, f.Y + f.h * .5, -f.Z, f.h * 3.2 * l, [255, 214, 150], .22 * l);
      halos.ajoute(f.X, f.Y + f.h * .5, -f.Z, f.h * 2 * l, [255, 240, 210], .5 * l);
      flaques.ajoute(f.X, .002, -f.Z, f.bougie ? .7 : .32, [255, 196, 120], .13 * l);
      if (f.bougie) { f.bougie.material.emissiveIntensity = .25 * l; const L = lumB[f.i]; L.position.set(f.X, f.Y + .03, -f.Z); L.intensity = .9 * l * fl; }
    });
    halos.envoie(); flaques.envoie();
    const env = envPour(Math.round(clamp(p.nuit) * 2) / 2).texture;
    if (S.s3.environment !== env) S.s3.environment = env;
  };
  MF.scenes.chabbat = S;
}

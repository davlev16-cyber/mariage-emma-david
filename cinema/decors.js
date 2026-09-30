/* Emma & David · version cinéma
   decors.js : les décors animés, sans monument — la soie de la mairie, la plage bordeaux du henné,
   la houppa face à la mer, la table de Chabbat au bord de l'eau, et la mer à l'aube pour la réponse. */
(function () {
'use strict';
const { clamp, lerp } = MF;
const TAU = Math.PI * 2;

/* ---------- petites images préparées une fois ---------- */
const cache = {};
function sprite(cle, W, H, dessin) {
  if (cache[cle]) return cache[cle];
  const c = MF.toile(W * 2, H * 2), x = c.getContext('2d');
  x.scale(2, 2); dessin(x, W, H);
  return (cache[cle] = c);
}
function flou(cle, src) {
  if (cache[cle]) return cache[cle];
  let cur = src;
  for (let i = 0; i < 2; i++) {
    const p = MF.toile(src.width / 6, src.height / 6); p.getContext('2d').drawImage(cur, 0, 0, p.width, p.height);
    const g = MF.toile(src.width, src.height); g.getContext('2d').drawImage(p, 0, 0, g.width, g.height);
    cur = g;
  }
  return (cache[cle] = cur);
}
const PETALES = [['#fffefb', '#efe6d6'], ['#fcf6ec', '#e8dcc6'], ['#f8ebe4', '#e4c8bc'], ['#b3263c', '#6e0f22'], ['#c93a4e', '#7e1428']];
const petale = v => sprite('petale' + v, 44, 44, x => {
  x.translate(22, 22);
  const g = x.createRadialGradient(-4, -6, 1, 0, 0, 20);
  g.addColorStop(0, v > 2 ? '#e0606e' : '#ffffff'); g.addColorStop(.55, PETALES[v][0]); g.addColorStop(1, PETALES[v][1]);
  x.fillStyle = g;
  x.beginPath(); x.moveTo(0, 17); x.bezierCurveTo(15, 9, 15, -12, 4, -17); x.quadraticCurveTo(0, -13, -4, -17); x.bezierCurveTo(-15, -12, -15, 9, 0, 17); x.fill();
  x.strokeStyle = 'rgba(120,80,60,.15)'; x.lineWidth = .7; x.beginPath(); x.moveTo(0, 15); x.quadraticCurveTo(1.5, 0, 0, -13); x.stroke();
});
const fleur = () => sprite('fleur', 72, 72, x => {
  x.translate(36, 36);
  const couronne = (n, R, rx, ry, dec, c1, c2) => {
    for (let i = 0; i < n; i++) {
      x.save(); x.rotate(dec + i * TAU / n); x.translate(0, -R);
      const g = x.createRadialGradient(0, -ry * .35, 1, 0, 0, Math.max(rx, ry));
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(150,125,90,.13)'; x.lineWidth = .6; x.stroke();
      x.restore();
    }
  };
  couronne(7, 17, 12.5, 15, 0, '#ffffff', '#ebe2cf');
  couronne(6, 10, 9, 11, .45, '#fffefa', '#efe7d6');
  couronne(5, 4.5, 6, 7, .9, '#fdf9f0', '#e6dac3');
  const c = x.createRadialGradient(0, 0, 0, 0, 0, 7); c.addColorStop(0, '#e8d7a3'); c.addColorStop(1, 'rgba(226,208,160,0)');
  x.fillStyle = c; x.beginPath(); x.arc(0, 0, 7, 0, TAU); x.fill();
});
const feuille = () => sprite('feuille', 48, 20, x => {
  const g = x.createLinearGradient(0, 2, 0, 18); g.addColorStop(0, '#8a8e5e'); g.addColorStop(1, '#5a5e36');
  x.fillStyle = g; x.beginPath(); x.moveTo(2, 10); x.quadraticCurveTo(22, -2, 46, 10); x.quadraticCurveTo(22, 22, 2, 10); x.fill();
  x.strokeStyle = 'rgba(230,230,200,.35)'; x.lineWidth = .8; x.beginPath(); x.moveTo(4, 10); x.lineTo(44, 10); x.stroke();
});
const nuage = (cle, clair, ombre, v) => sprite('nuage-' + cle + v, 420, 90, x => {
  const r = MF.rng(97 + v * 31);
  for (let i = 0; i < 30; i++) {
    const cx = 50 + r() * 320, cy = 50 + (r() - .5) * 16, rx = 26 + r() * 52, ry = 9 + r() * 12;
    const g = x.createRadialGradient(cx, cy - ry * .4, 0, cx, cy - ry * .4, rx);
    g.addColorStop(0, 'rgba(' + ombre + ',.16)'); g.addColorStop(1, 'rgba(' + ombre + ',0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy - ry * .4, rx, ry, 0, 0, TAU); x.fill();
    const g2 = x.createRadialGradient(cx, cy + ry * .3, 0, cx, cy + ry * .3, rx * .9);
    g2.addColorStop(0, 'rgba(' + clair + ',.32)'); g2.addColorStop(1, 'rgba(' + clair + ',0)');
    x.fillStyle = g2; x.beginPath(); x.ellipse(cx, cy + ry * .3, rx * .9, ry * .8, 0, 0, TAU); x.fill();
  }
});
const chaise = () => sprite('chaise', 60, 104, x => {
  x.fillStyle = 'rgba(90,75,45,.14)'; x.beginPath(); x.ellipse(30, 100, 26, 3.6, 0, 0, TAU); x.fill();
  const blanc = x.createLinearGradient(6, 0, 54, 0);
  blanc.addColorStop(0, '#efe8da'); blanc.addColorStop(.4, '#ffffff'); blanc.addColorStop(1, '#ddd3bf');
  x.strokeStyle = blanc; x.lineCap = 'round';
  x.lineWidth = 3; x.beginPath(); x.moveTo(11, 58); x.lineTo(10, 99); x.moveTo(49, 58); x.lineTo(50, 99); x.stroke();
  x.lineWidth = 1.6; x.beginPath(); x.moveTo(11, 80); x.lineTo(49, 80); x.stroke();
  const cg = x.createLinearGradient(0, 51, 0, 59); cg.addColorStop(0, '#fffdf8'); cg.addColorStop(1, '#e6dcc8');
  x.fillStyle = cg; x.beginPath(); x.moveTo(6, 53); x.quadraticCurveTo(30, 49, 54, 53); x.lineTo(54, 58); x.quadraticCurveTo(30, 61, 6, 58); x.fill();
  x.lineWidth = 3.2; x.beginPath(); x.moveTo(10, 53); x.lineTo(9, 14); x.moveTo(50, 53); x.lineTo(51, 14); x.stroke();
  x.lineWidth = 4; x.beginPath(); x.moveTo(8, 15); x.quadraticCurveTo(30, 5, 52, 15); x.stroke();
  x.lineWidth = 1.5;
  for (const yy of [27, 38]) { x.beginPath(); x.moveTo(10, yy); x.quadraticCurveTo(30, yy - 3, 50, yy); x.stroke(); }
  for (const xx of [20, 30, 40]) { x.beginPath(); x.moveTo(xx, 12 + Math.abs(30 - xx) * .12); x.lineTo(xx, 50); x.stroke(); }
});
const lanterne = () => sprite('lanterne', 32, 60, x => {
  x.fillStyle = 'rgba(90,75,45,.18)'; x.beginPath(); x.ellipse(16, 57, 13, 2.6, 0, 0, TAU); x.fill();
  const or = x.createLinearGradient(0, 0, 32, 0);
  or.addColorStop(0, '#9c8250'); or.addColorStop(.4, '#e6d4a2'); or.addColorStop(1, '#8a7244');
  x.fillStyle = 'rgba(255,250,236,.42)'; x.fillRect(6, 17, 20, 34);
  x.fillStyle = or;
  x.fillRect(4, 51, 24, 4); x.fillRect(5, 14, 22, 4);
  x.fillRect(5, 17, 2, 34); x.fillRect(25, 17, 2, 34); x.fillRect(15, 17, 1.4, 34);
  x.beginPath(); x.moveTo(6, 14); x.lineTo(16, 5); x.lineTo(26, 14); x.fill();
  x.strokeStyle = or; x.lineWidth = 1.4; x.beginPath(); x.arc(16, 4, 3, 0, TAU); x.stroke();
  x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(8, 19, 2, 30);
});
// Lanterne orientale : dôme de laiton, verres ambrés et rubis, résille ajourée
const lanterneOr = v => sprite('lanterneOr' + v, 56, 100, x => {
  const laiton = x.createLinearGradient(0, 0, 56, 0);
  laiton.addColorStop(0, '#7a5a2c'); laiton.addColorStop(.42, '#f0d59a'); laiton.addColorStop(1, '#6e5028');
  const verre = v ? ['rgba(214,64,70,.85)', 'rgba(120,20,36,.9)'] : ['rgba(250,176,86,.85)', 'rgba(170,80,30,.9)'];
  // corps : trois pans visibles
  const pans = [[8, 14, .7], [14, 42, 1], [42, 48, .7]];
  for (const [a, b, l] of pans) {
    const g = x.createRadialGradient((a + b) / 2, 56, 2, (a + b) / 2, 56, 34);
    g.addColorStop(0, 'rgba(255,236,190,.95)'); g.addColorStop(.35, verre[0]); g.addColorStop(1, verre[1]);
    x.globalAlpha = l; x.fillStyle = g; x.fillRect(a, 30, b - a, 52); x.globalAlpha = 1;
  }
  // résille en losanges, avec de petites perles de laiton aux croisements
  x.save(); x.beginPath(); x.rect(8, 30, 40, 52); x.clip();
  x.strokeStyle = laiton; x.lineWidth = 1.1;
  x.beginPath();
  for (let k = -60; k < 80; k += 7) { x.moveTo(8 + k, 30); x.lineTo(8 + k + 52, 82); x.moveTo(8 + k + 52, 30); x.lineTo(8 + k, 82); }
  x.stroke();
  x.fillStyle = laiton;
  for (let yy = 33.5; yy < 82; yy += 7) for (let xx = 11.5; xx < 48; xx += 7) { x.beginPath(); x.arc(xx + ((yy - 33.5) / 7 % 2) * 3.5, yy, 1.1, 0, TAU); x.fill(); }
  x.restore();
  x.fillStyle = laiton;
  for (const xx of [7, 13.5, 41.5, 48]) x.fillRect(xx, 28, 1.8, 56);
  x.fillRect(5, 82, 46, 5); x.fillRect(10, 87, 36, 4);
  // dôme et anneau
  x.beginPath(); x.moveTo(6, 30); x.quadraticCurveTo(8, 14, 28, 10); x.quadraticCurveTo(48, 14, 50, 30); x.closePath(); x.fill();
  x.fillRect(26, 2, 4, 9); x.strokeStyle = laiton; x.lineWidth = 1.6; x.beginPath(); x.arc(28, 3, 3, 0, TAU); x.stroke();
  x.fillStyle = 'rgba(255,240,200,.35)'; x.fillRect(17, 32, 2, 48);
});
const bougeoir = () => sprite('bougeoir', 90, 80, x => {
  x.translate(45, 80);
  const ar = x.createLinearGradient(-40, 0, 40, 0);
  ar.addColorStop(0, '#8d887e'); ar.addColorStop(.3, '#f7f5ef'); ar.addColorStop(.45, '#b9b4aa'); ar.addColorStop(.66, '#e9e6de'); ar.addColorStop(1, '#7c776d');
  x.fillStyle = ar;
  const prof = [[0, 38], [-4, 37], [-10, 28], [-16, 12], [-22, 8], [-30, 7], [-36, 12], [-42, 7], [-58, 6], [-64, 9], [-70, 21], [-74, 21], [-76, 10], [-80, 9]];
  x.beginPath(); x.moveTo(-prof[0][1], 0);
  for (const [yy, ww] of prof) x.lineTo(-ww, yy);
  for (let i = prof.length - 1; i >= 0; i--) x.lineTo(prof[i][1], prof[i][0]);
  x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(-5, -72, 2, 66);
});
// Coupe de Kiddouch en argent
const coupe = () => sprite('coupe', 60, 100, x => {
  x.translate(30, 100);
  const ar = x.createLinearGradient(-26, 0, 26, 0);
  ar.addColorStop(0, '#7f7a70'); ar.addColorStop(.3, '#fbfaf5'); ar.addColorStop(.5, '#b5b0a5'); ar.addColorStop(.7, '#ecE8e0'.toLowerCase()); ar.addColorStop(1, '#6f6a60');
  x.fillStyle = ar;
  x.beginPath(); x.ellipse(0, -3, 20, 4, 0, 0, TAU); x.fill();
  x.beginPath(); x.moveTo(-16, -4); x.quadraticCurveTo(-4, -8, -4, -20); x.lineTo(-3, -44); x.lineTo(3, -44); x.lineTo(4, -20); x.quadraticCurveTo(4, -8, 16, -4); x.fill();
  x.beginPath(); x.ellipse(0, -32, 6, 3.5, 0, 0, TAU); x.fill();
  x.beginPath(); x.moveTo(-22, -92); x.lineTo(22, -92); x.quadraticCurveTo(22, -52, 4, -46); x.lineTo(-4, -46); x.quadraticCurveTo(-22, -52, -22, -92); x.fill();
  x.fillStyle = 'rgba(110,20,40,.85)'; x.beginPath(); x.ellipse(0, -90, 20, 3, 0, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(120,110,90,.5)'; x.lineWidth = .8; x.beginPath(); x.moveTo(-20, -80); x.lineTo(20, -80); x.stroke();
  x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(-14, -88, 2.5, 34);
});
// Halla sous son napperon brodé
const halla = () => sprite('halla', 140, 70, x => {
  const g = x.createLinearGradient(0, 10, 0, 66);
  g.addColorStop(0, '#fffdf7'); g.addColorStop(1, '#e4dac6');
  x.fillStyle = 'rgba(80,60,30,.14)'; x.beginPath(); x.ellipse(70, 64, 64, 5, 0, 0, TAU); x.fill();
  x.fillStyle = g;
  x.beginPath(); x.moveTo(6, 64); x.bezierCurveTo(10, 30, 30, 10, 70, 10); x.bezierCurveTo(110, 10, 130, 30, 134, 64); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(150,130,90,.18)'; x.lineWidth = 1;
  for (const xx of [40, 62, 84, 104]) { x.beginPath(); x.moveTo(xx, 16); x.quadraticCurveTo(xx - 6, 40, xx - 4, 62); x.stroke(); }
  const or = x.createLinearGradient(0, 0, 140, 0); or.addColorStop(0, '#a88a4c'); or.addColorStop(.5, '#ead7a4'); or.addColorStop(1, '#a88a4c');
  x.strokeStyle = or; x.lineWidth = 2.4; x.beginPath(); x.moveTo(9, 56); x.bezierCurveTo(30, 60, 110, 60, 131, 56); x.stroke();
  x.lineWidth = 1; x.beginPath(); x.moveTo(12, 50); x.bezierCurveTo(32, 54, 108, 54, 128, 50); x.stroke();
  for (let xx = 10; xx < 132; xx += 4) { x.beginPath(); x.moveTo(xx, 62); x.lineTo(xx, 66); x.stroke(); }
  x.fillStyle = or; x.beginPath(); x.arc(70, 34, 7, 0, TAU); x.fill();
  x.fillStyle = '#fffdf7'; x.beginPath(); x.arc(70, 34, 4.4, 0, TAU); x.fill();
});
const photophore = () => sprite('photophore', 30, 36, x => {
  const g = x.createLinearGradient(0, 0, 30, 0);
  g.addColorStop(0, 'rgba(255,240,210,.35)'); g.addColorStop(.3, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(230,210,180,.3)');
  x.fillStyle = g; x.fillRect(4, 4, 22, 30);
  x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1; x.strokeRect(4, 4, 22, 30);
  x.fillStyle = '#f7efe0'; x.fillRect(8, 22, 14, 11);
});

/* ---------- outils de décor ---------- */
function ciel(ctx, c, cols, span) {
  const g = ctx.createLinearGradient(0, c.hor - c.H * span, 0, c.hor);
  cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), MF.rgba(col)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, c.W, clamp(c.hor + 2, 0, c.H));
}
const infini = (c, az, el) => [c.W / 2 + az * c.f, c.hor - el * c.f];
const demiLargeur = (c, Z) => (c.W * .5 + 60) * Math.max(.03, Z - c.z) / c.f;
const Q = (c, X, Yh, Z) => MF.proj(c, X, -Yh, Z);    // Yh : hauteur au-dessus du sol (vers le haut)
function glow(ctx, x, y, r, stops) {
  if (r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function makeNuages(n, cle, clair, ombre, elMax, graine) {
  const r = MF.rng(graine);
  return Array.from({ length: n }, (_, i) => ({ az: (r() - .5) * 2.6, el: .04 + Math.pow(r(), 1.3) * elMax, larg: .2 + r() * .38, haut: .03 + r() * .025, v: .0015 + r() * .003, img: nuage(cle, clair, ombre, i % 3) }));
}
function nuages(ctx, c, L, t, alpha) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  for (const n of L) {
    const az = ((n.az + t * n.v + 1.5) % 3 + 3) % 3 - 1.5;
    const [x, y] = infini(c, az, n.el), W = n.larg * c.f, H = n.haut * c.f;
    if (x + W / 2 < 0 || x - W / 2 > c.W || y + H < 0) continue;
    ctx.drawImage(n.img, x - W / 2, y - H / 2, W, H);
  }
  ctx.globalAlpha = 1;
}
function soleil(ctx, c, az, el, r, coeur, halo, force, coupe) {
  const [x, y] = infini(c, az, el), R = r * c.f;
  glow(ctx, x, y, R * 11, [[0, halo + (.5 * force).toFixed(3) + ')'], [.1, halo + (.3 * force).toFixed(3) + ')'], [.35, halo + (.09 * force).toFixed(3) + ')'], [1, halo + '0)']]);
  ctx.save();
  if (coupe) { ctx.beginPath(); ctx.rect(0, 0, c.W, c.hor); ctx.clip(); }
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 1.18);
  g.addColorStop(0, coeur); g.addColorStop(.8, coeur); g.addColorStop(1, halo + '0)');
  ctx.globalAlpha = clamp(force * 1.5); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 1.18, 0, TAU); ctx.fill();
  ctx.restore(); ctx.globalAlpha = 1;
}
function makeMer(n, m, graine) {
  const r = MF.rng(graine);
  const g = () => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) / .58; };
  return {
    vagues: Array.from({ length: n }, () => ({ u: r(), x: r() * 500, len: .5 + r() * 1.8, ph: r() * TAU, clair: r() < .6, v: .15 + r() * .35 })),
    paillettes: Array.from({ length: m }, () => ({ u: r(), j: g(), sp: 1.2 + r() * 2.6, ph: r() * TAU, len: .5 + r() * 1.1 })),
  };
}
// o : niveau (sous l'œil), cols (loin → près), teinte "rgba(r,g,b,", az de l'astre, bas, zMin, eclat, reflet
function mer(ctx, c, M, t, o) {
  const top = c.hor, bas = Math.min(c.H, o.bas), haut = o.niveau - c.y;
  if (bas <= top + 1) return;
  const g = ctx.createLinearGradient(0, top, 0, bas);
  o.cols.forEach((col, i) => g.addColorStop(i / (o.cols.length - 1), MF.rgba(col)));
  ctx.fillStyle = g; ctx.fillRect(0, top, c.W, bas - top);
  const hh = Math.min((bas - top) * .22, c.H * .07);
  const hz = ctx.createLinearGradient(0, top, 0, top + hh);
  hz.addColorStop(0, o.teinte + '.5)'); hz.addColorStop(1, o.teinte + '0)');
  ctx.fillStyle = hz; ctx.fillRect(0, top, c.W, hh);
  const [sx] = infini(c, o.az, 0);
  if (o.reflet > 0) {
    ctx.save(); ctx.translate(sx, top + (bas - top) * .18); ctx.scale(1, 3.2);
    const rr = Math.max(40, (bas - top) * .3), gc = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    gc.addColorStop(0, o.teinte + (o.reflet * .5).toFixed(3) + ')'); gc.addColorStop(1, o.teinte + '0)');
    ctx.fillStyle = gc; ctx.fillRect(-rr, -rr, rr * 2, rr * 2); ctx.restore();
  }
  // distance la plus proche réellement visible (utile quand la caméra vole haut)
  const zMin = Math.max(.8, o.zMin, haut * c.f / Math.max(1, bas - top) * .95), zMax = 700;
  ctx.lineCap = 'round';
  for (const v of M.vagues) {
    const d = 1 / (1 / zMax + v.u * (1 / zMin - 1 / zMax)), k = c.f / d;
    const y = top + haut * k + Math.sin(t * .9 + v.ph) * k * .03;
    if (y > bas - 1 || y < top + .5) continue;
    const half = demiLargeur(c, c.z + d), per = 2 * half, X = (((v.x + t * v.v - c.x) % per) + per) % per - half;
    const x = c.W / 2 + X * k, L = Math.min(c.W * .3, v.len * k * .9), near = (y - top) / (bas - top);
    const a = (v.clair ? .08 + .16 * near : .05 + .1 * near) * (.65 + .35 * Math.sin(t * 1.2 + v.ph));
    ctx.strokeStyle = v.clair ? o.teinte + a.toFixed(3) + ')' : 'rgba(20,14,24,' + a.toFixed(3) + ')';
    ctx.lineWidth = clamp(.018 * k, .5, 1.6);
    ctx.beginPath(); ctx.moveTo(x - L / 2, y); ctx.quadraticCurveTo(x, y - .02 * k, x + L / 2, y); ctx.stroke();
  }
  if (o.eclat > 0) for (const s of M.paillettes) {
    const d = zMin * Math.pow(zMax / zMin, 1 - s.u), k = c.f / d, y = top + haut * k;
    if (y > bas - 1 || y < top + .5) continue;
    const a = Math.pow(Math.max(0, Math.sin(t * s.sp + s.ph)), 5) * o.eclat;
    if (a < .03) continue;
    const x = sx + s.j * (1.1 + d * .025) * k, L = Math.min(34, s.len * (1.5 + k * .3)), th = clamp(k * .012, .7, 1.8);
    ctx.fillStyle = o.teinte + a.toFixed(3) + ')'; ctx.fillRect(x - L / 2, y - th / 2, L, th);
  }
}
// rivage : sable, sable mouillé, nappe d'eau qui monte et redescend, écume
function rivage(ctx, c, t, o) {
  const Zs = o.Zs, half = demiLargeur(c, Zs) * 1.3, n = 40;
  const lig = (Zf, amp) => { const a = []; for (let i = 0; i <= n; i++) { const X = c.x - half + 2 * half * i / n; a.push(MF.proj(c, X, 0, Zf + Math.sin(X * .35 + t * 1.1) * amp + Math.sin(X * 1.1 - t * 1.9) * amp * .35)); } return a; };
  const trace = (L, rev) => { const a = rev ? [...L].reverse() : L; a.forEach((p, i) => (i || rev) ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); };
  const bordMer = lig(Zs, .12);
  let yS = c.H; for (const p of bordMer) if (p[1] < yS) yS = p[1];
  const g = ctx.createLinearGradient(0, yS, 0, c.H);
  g.addColorStop(0, MF.rgba(o.sable[0])); g.addColorStop(1, MF.rgba(o.sable[1]));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, c.H + 10); for (const p of bordMer) ctx.lineTo(p[0], p[1]); ctx.lineTo(c.W + 10, c.H + 10); ctx.fill();
  const run = .5 + .5 * Math.sin(t * .62), Zf = Zs - o.montee * run - .2;
  ctx.fillStyle = o.mouille; ctx.beginPath(); trace(bordMer); trace(lig(Zs - o.montee - .9, .1), true); ctx.fill();
  if (o.refletSoleil) {
    const [sx] = infini(c, o.az, 0), [, yM] = MF.proj(c, 0, 0, Zs - o.montee * .5);
    ctx.save(); ctx.translate(sx, yM); ctx.scale(1, .35); glow(ctx, 0, 0, c.W * .22, [[0, o.refletSoleil], [1, 'rgba(255,230,200,0)']]); ctx.restore();
  }
  const front = lig(Zf, .18);
  ctx.fillStyle = o.nappe; ctx.beginPath(); trace(bordMer); trace(front, true); ctx.fill();
  const trait = (L, lw, col) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); trace(L); ctx.stroke(); };
  trait(lig(Zf + .5 + run * .3, .15), 1, o.ecume + (.25 * (1 - run)).toFixed(3) + ')');
  trait(front, 5, o.ecume + '.2)');
  trait(front, 1.6, o.ecume + '.85)');
  const cc = (t * .35) % 1;
  trait(lig(Zs + 5 - cc * 4.6, .08), 1.4, o.ecume + (.5 * Math.sin(cc * Math.PI)).toFixed(3) + ')');
  return yS;
}
function vignette(ctx, W, H, rgbc, force) {
  const g = ctx.createRadialGradient(W / 2, H * .48, Math.min(W, H) * .36, W / 2, H * .48, Math.hypot(W, H) * .62);
  g.addColorStop(0, 'rgba(' + rgbc + ',0)'); g.addColorStop(1, 'rgba(' + rgbc + ',' + force + ')');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function flamme(ctx, x, y, h, w, t, i, force = 1) {
  const fl = 1 + Math.sin(t * 13 + i) * .06 + Math.sin(t * 7.3 + i * 2) * .05;
  const fh = h * fl * force, fw = w * force, sw = Math.sin(t * 5 + i) * fw * .25;
  glow(ctx, x, y - fh * .5, fh * 2.3, [[0, 'rgba(255,236,190,' + (.5 * force).toFixed(3) + ')'], [1, 'rgba(255,200,120,0)']]);
  ctx.save(); ctx.translate(x + sw, y);
  const fg = ctx.createRadialGradient(0, -fh * .32, 0, 0, -fh * .38, fh);
  fg.addColorStop(0, '#fffdf0'); fg.addColorStop(.3, '#ffe08a'); fg.addColorStop(.7, 'rgba(255,160,70,.8)'); fg.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(fw, -fh * .2, fw * .6, -fh * .7, sw * .4, -fh);
  ctx.bezierCurveTo(-fw * .6, -fh * .7, -fw, -fh * .2, 0, 0); ctx.fill();
  ctx.restore();
}

/* =====================================================================
   MAIRIE — un fond neutre : une soie ivoire qui ondule doucement dans la lumière
   ===================================================================== */
MF.scenes.soie = (() => {
  const p = { zoom: 1.1, derive: 0, lumiere: 1 };
  let buf = null, bctx = null, im = null, bw = 0, bh = 0;
  const ondes = [[1, 1.1, .55, .16, 0], [.7, 1.7, 1.2, -.12, 1.7], [.5, .6, 1.5, .1, 3.1], [.18, 3.3, 2.2, .22, .6], [.08, 5.1, 3.9, -.3, 2.2]];
  const n3 = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
  const L = n3(-.45, -.62, .64), Hv = n3(L[0], L[1], L[2] + 1);
  const r = MF.rng(9), bulles = Array.from({ length: 26 }, () => ({ x: r(), y: r(), z: .25 + r() * .75, v: .3 + r() * .7, ph: r() * TAU }));
  const haloOr = MF.halo([226, 196, 140]);
  return {
    p, nom: 'soie',
    dessine(ctx, W, H, t) {
      const cw = 100, ch = Math.round(clamp(100 * H / W, 60, 240));
      if (!buf || bw !== cw || bh !== ch) { bw = cw; bh = ch; buf = MF.toile(bw, bh); bctx = buf.getContext('2d'); im = bctx.createImageData(bw, bh); }
      const d = im.data, z = p.zoom, m = Math.max(W, H);
      for (let j = 0; j < bh; j++) {
        const v = ((j + .5) / bh - .5) * z * H / m;
        for (let i = 0; i < bw; i++) {
          let u = ((i + .5) / bw - .5) * z * W / m + p.derive;
          u += Math.sin(v * 4.2 + t * .1) * .05;
          let dx = 0, dy = 0;
          for (const [a, kx, ky, w, ph] of ondes) { const cph = Math.cos((kx * u + ky * v) * TAU + w * t + ph) * a * TAU; dx += cph * kx; dy += cph * ky; }
          const nn = n3(-dx * .026, -dy * .026, 1);
          const diff = Math.max(0, nn[0] * L[0] + nn[1] * L[1] + nn[2] * L[2]);
          const spec = Math.pow(Math.max(0, nn[0] * Hv[0] + nn[1] * Hv[1] + nn[2] * Hv[2]), 26);
          const sh = .6 + .46 * diff, o = (j * bw + i) * 4;
          d[o] = Math.min(255, 238 * sh + 70 * spec); d[o + 1] = Math.min(255, 229 * sh + 66 * spec); d[o + 2] = Math.min(255, 213 * sh + 58 * spec); d[o + 3] = 255;
        }
      }
      bctx.putImageData(im, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(buf, 0, 0, W, H);
      // lumière douce qui passe, et poussière dorée en trois plans
      glow(ctx, W * (.35 + .1 * Math.sin(t * .11)), H * (.3 + .05 * Math.cos(t * .09)), Math.max(W, H) * .7, [[0, 'rgba(255,252,242,.42)'], [1, 'rgba(255,252,242,0)']]);
      ctx.globalCompositeOperation = 'lighter';
      for (const b of bulles) {
        const x = ((b.x + t * .004 * b.v + p.derive * .3 * b.z) % 1) * W, y = ((b.y - t * .006 * b.v) % 1 + 1) % 1 * H;
        MF.poseHalo(ctx, haloOr, x, y, (3 + b.z * 9) * (.8 + .2 * Math.sin(t + b.ph)), .16 * b.z);
      }
      ctx.globalCompositeOperation = 'source-over';
      vignette(ctx, W, H, '150,130,95', .22);
    },
  };
})();

/* =====================================================================
   PLAGE — le henné en bordeaux au coucher du soleil, ou la mer calme à l'aube (réponse)
   ===================================================================== */
MF.scenes.plage = (() => {
  const p = { camX: 0, camY: -1.3, camZ: 0, focale: .95, tilt: .05, variante: 0, soleil: .03, rivage: 1 };
  const V = [
    { ciel: ['#2a0812', '#561427', '#8e2a3a', '#c9504c', '#f09a66'], coeur: '#ffdcae', halo: 'rgba(255,184,140,', mer: ['#c56a55', '#8a2c38', '#4e1220', '#2e0810'], teinte: 'rgba(255,196,160,',
      sable: ['#b9786a', '#5e2830'], mouille: 'rgba(110,24,38,.34)', nappe: 'rgba(150,50,60,.32)', ecume: 'rgba(255,232,214,', reflet: 'rgba(255,190,150,.32)', vig: '40,6,14' },
    { ciel: ['#dde2e3', '#ebe9df', '#f6ead4', '#fbe3bf'], coeur: '#fff6e2', halo: 'rgba(255,240,208,', mer: ['#d7d8c6', '#b3b99f', '#93a088'], teinte: 'rgba(255,246,225,',
      sable: ['#f0e5cd', '#d6c2a0'], mouille: 'rgba(150,150,120,.18)', nappe: 'rgba(200,205,185,.35)', ecume: 'rgba(255,253,246,', reflet: 'rgba(255,244,215,.4)', vig: '140,120,80' },
    // heure dorée, pour le plan d'aperçu vu du ciel
    { ciel: ['#34507e', '#6f85ab', '#c9b3a0', '#f2c48e', '#fbd9a2'], coeur: '#fff2d2', halo: 'rgba(255,228,176,', mer: ['#d9b48c', '#9a9282', '#56626a', '#2f3d4a'], teinte: 'rgba(255,232,192,',
      sable: ['#ead5b0', '#b99b74'], mouille: 'rgba(120,110,100,.22)', nappe: 'rgba(170,165,150,.35)', ecume: 'rgba(255,250,238,', reflet: 'rgba(255,226,180,.4)', vig: '60,50,40' },
  ];
  const nuagesH = makeNuages(8, 'henne', '255,170,140', '90,20,40', .34, 3), nuagesA = makeNuages(6, 'aube', '255,250,238', '215,205,180', .3, 5), nuagesD = makeNuages(9, 'dore', '255,222,176', '110,100,120', .4, 9);
  const M = makeMer(130, 200, 7);
  // lanternes orientales posées sur le sable, pétales rouges autour
  const r = MF.rng(21);
  const lanternes = [];
  for (let i = 0; i < 26; i++) lanternes.push({ X: -6 + i * .5 + (r() - .5) * .25, Z: 4.2 + Math.sin(i * .7) * .5 + r() * .7, s: .8 + r() * .35, v: i % 2, ph: r() * 9 });
  for (let i = 0; i < 10; i++) lanternes.push({ X: -2.5 + i * .55 + (r() - .5) * .2, Z: 2.6 + r() * .6, s: .9 + r() * .3, v: (i + 1) % 2, ph: r() * 9 });
  lanternes.push({ X: -1.1, Z: 1.2, s: 1.1, v: 1, ph: 2 }, { X: 1.2, Z: 1.5, s: 1, v: 0, ph: 5 });
  const petalesSable = Array.from({ length: 90 }, () => ({ X: (r() - .5) * 14, Z: .8 + r() * 4.6, v: 3 + ((r() * 2) | 0), rot: r() * TAU, s: .7 + r() * .6 }));
  const braises = Array.from({ length: 30 }, () => ({ x: r(), y: r(), v: .3 + r() * .7, ph: r() * TAU, s: r() }));
  const haloAmbre = MF.halo([255, 170, 90]), haloBlanc = MF.halo([255, 236, 200]);
  return {
    p, nom: 'plage',
    dessine(ctx, W, H, t) {
      const c = MF.camera(p, W, H), P = V[p.variante], henne = p.variante === 0, dore = p.variante === 2;
      ciel(ctx, c, P.ciel.map(MF.hex), .75);
      nuages(ctx, c, henne ? nuagesH : dore ? nuagesD : nuagesA, t, henne ? .85 : dore ? .9 : .55);
      soleil(ctx, c, 0, p.soleil, henne ? .046 : dore ? .036 : .028, P.coeur, P.halo, 1, henne);
      mer(ctx, c, M, t, { niveau: .05, cols: P.mer.map(MF.hex), teinte: P.teinte, az: 0, bas: H, zMin: 5, eclat: 1, reflet: henne || dore ? .75 : .5 });
      if (dore) {
        // une côte lointaine, basse, où s'allument quelques lumières
        ctx.fillStyle = 'rgba(70,72,92,.55)'; ctx.beginPath();
        const pts = [];
        for (let i = 0; i <= 24; i++) { const az = -1.6 + i * .06, el = .006 + .004 * Math.sin(i * 1.7) + .003 * Math.sin(i * 4.1); pts.push(infini(c, az, el)); }
        ctx.moveTo(pts[0][0], c.hor + 1); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.lineTo(pts[pts.length - 1][0], c.hor + 1); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) { const [x, y] = infini(c, -1.55 + (i * .618 % 1) * 1.3, .002 + (i * .37 % 1) * .005); MF.poseHalo(ctx, haloAmbre, x, y, 2.2, .35 + .25 * Math.sin(t * 2 + i)); }
        ctx.globalCompositeOperation = 'source-over';
      }
      if (p.rivage) rivage(ctx, c, t, { Zs: henne ? 6.2 : 6.5, montee: 1.3, sable: P.sable.map(MF.hex), mouille: P.mouille, nappe: P.nappe, ecume: P.ecume, refletSoleil: P.reflet, az: 0 });
      if (henne) {
        // pétales rouges sur le sable
        for (const q of petalesSable) {
          const d = q.Z - c.z; if (d < .4) continue;
          const [x, y, k] = MF.proj(c, q.X, 0, q.Z), s = .04 * k * q.s;
          if (s < .5 || x < -s || x > W + s) continue;
          ctx.save(); ctx.translate(x, y); ctx.scale(1, clamp(-c.y / d * 1.3, .15, 1)); ctx.rotate(q.rot);
          ctx.drawImage(petale(q.v), -s, -s, s * 2, s * 2); ctx.restore();
        }
        // lanternes, de la plus lointaine à la plus proche
        const L = [...lanternes].sort((a, b) => b.Z - a.Z);
        for (const l of L) {
          const d = l.Z - c.z; if (d < .45) continue;
          const [x, y, k] = MF.proj(c, l.X, 0, l.Z), lw = .34 * l.s * k, lh = lw * 100 / 56;
          if (x + lw < 0 || x - lw > W) continue;
          const fl = .85 + .15 * MF.bruit(t * 6 + l.ph);
          ctx.globalCompositeOperation = 'lighter';
          MF.poseHalo(ctx, haloAmbre, x, y - lh * .5, lh * 1.8, .32 * fl);
          ctx.save(); ctx.translate(x, y + 2); ctx.scale(1, .3); MF.poseHalo(ctx, haloAmbre, 0, 0, lh * 1.6, .28 * fl); ctx.restore();
          ctx.globalCompositeOperation = 'source-over';
          const img = d < 1.8 ? flou('lanterneOrF' + l.v, lanterneOr(l.v)) : lanterneOr(l.v);
          ctx.drawImage(img, x - lw / 2, y - lh, lw, lh);
          ctx.globalCompositeOperation = 'lighter';
          MF.poseHalo(ctx, haloBlanc, x, y - lh * .45, lw * .45, .8 * fl);
          ctx.globalCompositeOperation = 'source-over';
        }
        // braises qui montent doucement
        ctx.globalCompositeOperation = 'lighter';
        for (const b of braises) {
          const x = (b.x + Math.sin(t * .3 + b.ph) * .03) * W, y = ((b.y - t * .02 * b.v) % 1 + 1) % 1 * H;
          MF.poseHalo(ctx, haloAmbre, x, y, 2 + b.s * 3, .35 * (.5 + .5 * Math.sin(t * 3 + b.ph)));
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      vignette(ctx, W, H, P.vig, henne ? .35 : .14);
    },
  };
})();

/* =====================================================================
   HOUPPA — au bord de la mer : allée, chaises, lanternes, dais fleuri ; de l'heure dorée à la nuit
   ===================================================================== */
MF.scenes.houppa = (() => {
  const p = { camX: 0, camY: -1.6, camZ: 0, focale: .95, tilt: .02, tod: 0, allee: 1 };
  const ZH = 14, HP = { X: 1.45, prof: 2.1, H: 2.55 }, ALLEE = .6, Z0 = -2;
  const pal = MF.palette({
    0: { c0: '#a9bcc4', c1: '#d8d6c3', c2: '#f3e2c4', c3: '#f8d9a8', m0: '#aeb8a5', m1: '#8d9a86', m2: '#6f7f6c', s0: '#ecdfc4', s1: '#cbb691', soleil: 1, lampes: .35, etoiles: 0, tissu: '#fffdf8', nuage: 1 },
    1: { c0: '#6f7ea3', c1: '#c3a5a4', c2: '#efbf98', c3: '#f6c890', m0: '#c29e8c', m1: '#8f807a', m2: '#5d6261', s0: '#e3c9a8', s1: '#b19274', soleil: .8, lampes: .6, etoiles: .05, tissu: '#fff4ea', nuage: .9 },
    2: { c0: '#232d57', c1: '#56557e', c2: '#a8859a', c3: '#e3a98f', m0: '#6f6a82', m1: '#474a67', m2: '#2b3048', s0: '#a0918c', s1: '#6a5f68', soleil: 0, lampes: 1, etoiles: .5, tissu: '#e9e2e6', nuage: .6 },
    3: { c0: '#060a1e', c1: '#101939', c2: '#232853', c3: '#40385c', m0: '#20263f', m1: '#12162f', m2: '#0a0d1f', s0: '#4a4450', s1: '#26222c', soleil: 0, lampes: 1, etoiles: 1, tissu: '#cfc8d6', nuage: .35 },
  });
  const etoiles = new MF.Etoiles(360, 17), nuagesL = makeNuages(7, 'houppa', '255,244,226', '190,180,170', .32, 11), M = makeMer(100, 120, 13);
  const haloChaud = MF.halo([255, 196, 120]), haloBlanc = MF.halo([255, 240, 210]), haloLune = MF.halo([230, 236, 255]);
  // fleurs du dais
  const r = MF.rng(7), fleurs = [];
  const add = (X, Y, Z, n, spread, taille) => { for (let i = 0; i < n; i++) fleurs.push({ X: X + (r() - .5) * spread, Y: Y + (r() - .5) * spread * .6, Z: Z + (r() - .5) * spread * .3, r: taille * (.6 + r() * .6), rot: r() * 3.14, leaf: r() < .45 }); };
  const s = .085;
  for (let i = 0; i <= 10; i++) add(-HP.X + 2 * HP.X * i / 10, HP.H, ZH - .03, 3, s * 2, s);
  for (let i = 0; i <= 8; i++) add(-HP.X + 2 * HP.X * i / 8, HP.H, ZH + HP.prof, 2, s * 1.6, s * .85);
  for (const X of [-HP.X, HP.X]) {
    add(X, HP.H, ZH - .05, 9, s * 4, s * 1.3);
    for (let j = 1; j <= 6; j++) add(X, HP.H - HP.H * .09 * j, ZH - .06, 2, s * 1.4, s * (1 - j * .08));
    add(X, .12, ZH - .1, 6, s * 4, s * 1.1);
  }
  // allée
  const petales = Array.from({ length: 170 }, () => ({ X: (r() * 2 - 1) * ALLEE * .9, Z: Z0 + r() * (ZH - .3 - Z0), v: (r() * 3) | 0, s: .7 + r() * .6, rot: r() * TAU }));
  const bords = []; for (let i = 0; i < 18; i++) for (const e of [-1, 1]) bords.push({ X: e * (ALLEE + .04), Z: Z0 + (i + .5) * (ZH - Z0) / 18, s: .8 + r() * .4, rot: r() * 3, leaf: r() < .5 });
  const rangs = Array.from({ length: 7 }, (_, i) => ZH - 1.8 - i * 1.25);
  const grains = Array.from({ length: 220 }, () => ({ X: (r() - .5) * 26, Z: -8 + r() * 27, c: r() < .5 }));

  function fleur3D(c, f, t) {
    if (f.Z - c.z < .3) return;
    const [x, y, k] = Q(c, f.X, f.Y, f.Z), rr = f.r * k;
    if (rr < .4 || x < -rr * 3 || x > c.W + rr * 3) return;
    ctx_.save(); ctx_.translate(x, y); ctx_.rotate(f.rot + Math.sin(t * .8 + f.X * 3) * .05);
    if (f.leaf) ctx_.drawImage(feuille(), rr * .2, -rr * .1, rr * 2.2, rr * .9);
    ctx_.drawImage(fleur(), -rr * 1.1, -rr * 1.1, rr * 2.2, rr * 2.2);
    ctx_.restore();
  }
  let ctx_ = null;
  function poteau(c, X, Z) {
    if (Z - c.z < .3) return;
    const [x0, y0, k] = Q(c, X, 0, Z), [, y1] = Q(c, X, HP.H, Z), lw = Math.max(1.6, .07 * k);
    const g = ctx_.createLinearGradient(x0 - lw / 2, 0, x0 + lw / 2, 0);
    g.addColorStop(0, '#f2ebdc'); g.addColorStop(.35, '#ffffff'); g.addColorStop(1, '#d6ccb6');
    ctx_.fillStyle = g; ctx_.fillRect(x0 - lw / 2, y1, lw, y0 - y1);
  }
  function dais(c, t, P) {
    const Zb = ZH + HP.prof, tissu = P.tissu;
    for (const f of fleurs) if (f.Z > ZH + 1) fleur3D(c, f, t);
    poteau(c, -HP.X, Zb); poteau(c, HP.X, Zb);
    const vent = u => Math.sin(t * 1.5 + u) * .03 + Math.sin(t * 2.7 + u * 2) * .012;
    const q = [Q(c, -HP.X, HP.H, ZH), Q(c, HP.X, HP.H, ZH), Q(c, HP.X, HP.H, Zb), Q(c, -HP.X, HP.H, Zb)];
    ctx_.fillStyle = MF.rgba(MF.mix(tissu, [200, 190, 180], .12), .93);
    ctx_.beginPath(); q.forEach((pt, i) => i ? ctx_.lineTo(pt[0], pt[1]) : ctx_.moveTo(pt[0], pt[1])); ctx_.fill();
    const bas = [], n = 22;
    for (let i = 0; i <= n; i++) { const u = i / n; bas.push(Q(c, -HP.X + 2 * HP.X * u, HP.H - .16 - .32 * 4 * u * (1 - u) + vent(u * 5), ZH - .01)); }
    const gt = ctx_.createLinearGradient(0, q[0][1], 0, bas[n >> 1][1]);
    gt.addColorStop(0, MF.rgba(tissu, .97)); gt.addColorStop(1, MF.rgba(MF.mix(tissu, [180, 165, 150], .2), .92));
    ctx_.fillStyle = gt; ctx_.beginPath(); ctx_.moveTo(q[0][0], q[0][1]); ctx_.lineTo(q[1][0], q[1][1]);
    for (let i = n; i >= 0; i--) ctx_.lineTo(bas[i][0], bas[i][1]); ctx_.fill();
    ctx_.strokeStyle = 'rgba(150,130,95,.12)'; ctx_.lineWidth = 1;
    ctx_.beginPath(); for (let i = 2; i < n; i += 3) { ctx_.moveTo(bas[i][0], q[0][1] + 2); ctx_.lineTo(bas[i][0], bas[i][1] - 2); } ctx_.stroke();
    for (const sd of [-1, 1]) {
      const len = HP.H * .75, sw = vent(sd * 2) * 3;
      const a = Q(c, sd * HP.X, HP.H, ZH - .02), m = Q(c, sd * (HP.X + .28) + sw * .5, HP.H - len * .5, ZH - .05), b = Q(c, sd * (HP.X + .06) + sw, HP.H - len, ZH - .05), r2 = Q(c, sd * (HP.X - .1), HP.H - len * .9, ZH - .02);
      const gv = ctx_.createLinearGradient(a[0], 0, m[0], 0);
      gv.addColorStop(0, MF.rgba(tissu, .62)); gv.addColorStop(1, MF.rgba(tissu, .42));
      ctx_.fillStyle = gv; ctx_.beginPath(); ctx_.moveTo(a[0], a[1]);
      ctx_.quadraticCurveTo(m[0], m[1], b[0], b[1]); ctx_.lineTo(r2[0], r2[1]);
      ctx_.quadraticCurveTo(a[0] - sd * 2, (a[1] + r2[1]) / 2, a[0], a[1]); ctx_.fill();
    }
    poteau(c, -HP.X, ZH); poteau(c, HP.X, ZH);
    for (const f of fleurs) if (f.Z <= ZH + 1) fleur3D(c, f, t);
    // bougies au pied de la houppa, le soir
    if (P.lampes > .5) {
      ctx_.globalCompositeOperation = 'lighter';
      for (const X of [-HP.X - .25, HP.X + .25, -.5, .5]) { const [x, y, k] = Q(c, X, .15, ZH - .3); MF.poseHalo(ctx_, haloChaud, x, y, 1.1 * k, .35 * P.lampes); }
      const [x, y, k] = Q(c, 0, 1.3, ZH + 1); MF.poseHalo(ctx_, haloChaud, x, y, 2.4 * k, .16 * P.lampes);
      ctx_.globalCompositeOperation = 'source-over';
    }
  }
  function allee(c, t, P) {
    const zA = Math.max(Z0, c.z + .35), q = [Q(c, -ALLEE, 0, zA), Q(c, ALLEE, 0, zA), Q(c, ALLEE, 0, ZH + .1), Q(c, -ALLEE, 0, ZH + .1)];
    const g = ctx_.createLinearGradient(0, q[2][1], 0, q[0][1]);
    g.addColorStop(0, MF.rgba(MF.mix(MF.hex('#efe3c9'), MF.hex(P.s1 ? '#8a8090' : '#efe3c9'), clamp(P.etoiles)))); g.addColorStop(1, MF.rgba(MF.mix(MF.hex('#f6eedd'), [120, 110, 125], clamp(P.etoiles * .8))));
    ctx_.fillStyle = g; ctx_.beginPath(); q.forEach((pt, i) => i ? ctx_.lineTo(pt[0], pt[1]) : ctx_.moveTo(pt[0], pt[1])); ctx_.fill();
    for (const pe of petales) {
      const dd = pe.Z - c.z; if (dd < .35) continue;
      const [x, y, kk] = Q(c, pe.X, .002, pe.Z), sz = .035 * kk * pe.s;
      if (sz < .4) continue;
      ctx_.save(); ctx_.translate(x, y); ctx_.scale(1, clamp(-c.y / dd * 1.4, .18, 1)); ctx_.rotate(pe.rot);
      ctx_.drawImage(petale(pe.v), -sz, -sz, sz * 2, sz * 2); ctx_.restore();
    }
  }
  const lueurs = [];
  function rangees(c, t, P) {
    const objets = [];
    for (const b of bords) objets.push({ Z: b.Z, f: () => fleur3D(c, { X: b.X, Y: .06, Z: b.Z, r: .07 * b.s, rot: b.rot, leaf: b.leaf }, t) });
    rangs.forEach((Z, i) => objets.push({ Z, f: () => {
      for (const side of [-1, 1]) for (let j = 2; j >= 0; j--) {
        if (Z - c.z < .5) continue;
        const X = side * (ALLEE + .48 + j * .62), [x, y, k] = Q(c, X, 0, Z), cw = .46 * k, ch = cw * 104 / 60;
        if (x + cw < 0 || x - cw > c.W) continue;
        ctx_.drawImage(chaise(), x - cw / 2, y - ch, cw, ch);
        if (j === 0) {
          [[0, .78, .085], [-.07, .7, .065], [.06, .7, .06]].forEach(([ox, oy, rr], q2) => fleur3D(c, { X: X - side * .2 + ox, Y: oy, Z: Z - .03, r: rr, rot: i + q2, leaf: q2 === 1 }, t));
          const [lx, ly, lk] = Q(c, side * (ALLEE + .12), 0, Z - .25), lw = .24 * lk, lh = lw * 60 / 32, fl = .85 + .15 * Math.sin(t * 9 + i + side);
          ctx_.drawImage(lanterne(), lx - lw / 2, ly - lh, lw, lh);
          lueurs.push([lx, ly, lh, fl]);
        }
      }
    } }));
    objets.sort((a, b) => b.Z - a.Z).forEach(o => { if (o.Z - c.z > .3) o.f(); });
  }

  return {
    p, nom: 'houppa',
    dessine(ctx, W, H, t) {
      ctx_ = ctx;
      const c = MF.camera(p, W, H), P = pal(p.tod);
      ciel(ctx, c, [P.c0, P.c1, P.c2, P.c3], .75);
      etoiles.dessine(ctx, c, t, P.etoiles);
      nuages(ctx, c, nuagesL, t, .7 * P.nuage);
      const el = lerp(.05, -.04, clamp(p.tod / 1.6));
      if (P.soleil > .01) soleil(ctx, c, 0, el, .03, '#fff4dc', 'rgba(255,236,200,', P.soleil, true);
      // la lune se lève sur la mer, la nuit
      const nuit = clamp(p.tod - 1.6);
      if (nuit > 0) {
        const [lx, ly] = infini(c, .22, .09 + nuit * .05);
        ctx.globalCompositeOperation = 'lighter'; MF.poseHalo(ctx, haloLune, lx, ly, c.f * .09, .25 * nuit); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = MF.rgba([250, 246, 232], nuit); ctx.beginPath(); ctx.arc(lx, ly, c.f * .014, 0, TAU); ctx.fill();
      }
      mer(ctx, c, M, t, { niveau: 3, cols: [P.m0, P.m1, P.m2], teinte: nuit > 0 ? 'rgba(235,238,255,' : 'rgba(255,242,220,', az: nuit > .3 ? .22 : 0, bas: H, zMin: 20, eclat: .9, reflet: nuit > .3 ? .4 : .5 * P.soleil + .1 });
      // terrasse au bord de l'eau, bord arrondi
      const half = demiLargeur(c, ZH + 5) * 1.2, pts = [];
      for (let i = 0; i <= 48; i++) { const X = c.x - half + 2 * half * i / 48; pts.push(MF.proj(c, X, 0, ZH + 5 - .03 * X * X)); }
      let yMin = H; for (const pt of pts) if (pt[1] < yMin) yMin = pt[1];
      const gs = ctx.createLinearGradient(0, yMin, 0, H); gs.addColorStop(0, MF.rgba(P.s0)); gs.addColorStop(1, MF.rgba(P.s1));
      ctx.fillStyle = gs; ctx.beginPath(); ctx.moveTo(-10, H + 10); for (const pt of pts) ctx.lineTo(pt[0], pt[1]); ctx.lineTo(W + 10, H + 10); ctx.fill();
      ctx.strokeStyle = MF.rgba(MF.mix(P.s0, [255, 250, 235], .5), .7); ctx.lineWidth = 1.3; ctx.beginPath(); pts.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1])); ctx.stroke();
      for (const g of grains) {
        if (g.Z - c.z < .6) continue;
        const [x, y, k] = MF.proj(c, g.X, 0, g.Z); if (x < -5 || x > W + 5 || y > H + 5) continue;
        const rr = Math.max(.5, .018 * k); ctx.fillStyle = g.c ? 'rgba(255,250,236,.4)' : 'rgba(110,90,60,.16)'; ctx.fillRect(x - rr, y - rr * .4, rr * 2, rr * .8);
      }
      // ombres longues des poteaux au soleil couchant
      if (P.soleil > .05) {
        const Ls = Math.min(5, HP.H / Math.tan(Math.max(.08, el + .04)));
        ctx.fillStyle = 'rgba(95,82,50,' + (.12 * P.soleil).toFixed(3) + ')';
        for (const [X, Z] of [[-HP.X, ZH], [HP.X, ZH], [-HP.X, ZH + HP.prof], [HP.X, ZH + HP.prof]]) {
          const a = MF.proj(c, X - .04, 0, Z), b = MF.proj(c, X + .04, 0, Z), cc = MF.proj(c, X + .09, 0, Z - Ls), d = MF.proj(c, X - .09, 0, Z - Ls);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(cc[0], cc[1]); ctx.lineTo(d[0], d[1]); ctx.fill();
        }
      }
      lueurs.length = 0;
      if (p.allee > 0) allee(c, t, P);
      dais(c, t, P);
      if (p.allee > 0) rangees(c, t, P);
      // le soir, le premier plan passe dans l'ombre bleue ; seules les lanternes l'éclairent
      const ombre = clamp((p.tod - 1.2) / 1.4);
      if (ombre > 0) { const g2 = ctx.createLinearGradient(0, c.hor, 0, H); g2.addColorStop(0, `rgba(12,16,38,${.2 * ombre})`); g2.addColorStop(1, `rgba(8,10,26,${.55 * ombre})`); ctx.fillStyle = g2; ctx.fillRect(0, c.hor, W, H - c.hor); }
      ctx.globalCompositeOperation = 'lighter';
      for (const [lx, ly, lh, fl] of lueurs) {
        MF.poseHalo(ctx, haloChaud, lx, ly - lh * .5, lh * (1.4 + ombre), (.12 + .3 * P.lampes) * fl);
        MF.poseHalo(ctx, haloChaud, lx, ly, lh * 1.1, .18 * P.lampes * fl);
        MF.poseHalo(ctx, haloBlanc, lx, ly - lh * .47, lh * .3, .9 * fl);
      }
      if (ombre > 0) { const [x, y, k] = Q(c, 0, 1.2, ZH + .8); MF.poseHalo(ctx, haloChaud, x, y, 3 * k, .22 * ombre); }
      ctx.globalCompositeOperation = 'source-over';
      vignette(ctx, W, H, nuit > 0 ? '5,8,20' : '120,100,60', nuit > 0 ? .4 : .14);
    },
  };
})();

/* =====================================================================
   CHABBAT — la table dressée au bord de la mer, à l'entrée du Chabbat : l'heure bleue devient nuit
   ===================================================================== */
MF.scenes.chabbat = (() => {
  const p = { camX: 0, camY: -.34, camZ: 0, focale: 1.1, tilt: .12, nuit: .4, allume: 1 };
  const pal = MF.palette({
    0: { c0: '#1d2856', c1: '#3f4479', c2: '#83708f', c3: '#dba08c', m0: '#6f6b8a', m1: '#3e4263', m2: '#252a45', etoiles: .25 },
    1: { c0: '#050918', c1: '#0c1433', c2: '#1d234a', c3: '#44395b', m0: '#262a47', m1: '#141832', m2: '#0a0c1d', etoiles: 1 },
  });
  const etoiles = new MF.Etoiles(420, 23), M = makeMer(90, 90, 19);
  const haloChaud = MF.halo([255, 196, 120]), haloLune = MF.halo([230, 236, 255]), haloVille = MF.halo([255, 206, 150]);
  const r = MF.rng(31);
  const villes = Array.from({ length: 70 }, () => ({ az: -1.1 + Math.pow(r(), 1.6) * .75, el: .002 + r() * .006, s: r(), ph: r() * 9 }));
  const bougies = [[-.09, .95], [.09, .98]];
  const votives = [[-.52, 1.15], [-.36, .8], [.38, .82], [.55, 1.18], [-.8, .95], [.82, 1]];
  const bouquet = Array.from({ length: 9 }, () => ({ X: (r() - .5) * .2, Y: .04 + r() * .07, Z: 1.34 + (r() - .5) * .08, rr: .024 + r() * .012, rot: r() * 3, leaf: r() < .4 }));
  return {
    p, nom: 'chabbat',
    dessine(ctx, W, H, t) {
      const c = MF.camera(p, W, H), P = pal(p.nuit), f = c.f;
      ciel(ctx, c, [P.c0, P.c1, P.c2, P.c3], .8);
      etoiles.dessine(ctx, c, t, P.etoiles);
      // fin croissant de lune
      const [lx, ly] = infini(c, .28, .22);
      ctx.globalCompositeOperation = 'lighter'; MF.poseHalo(ctx, haloLune, lx, ly, f * .06, .18 + .12 * p.nuit); ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(MF.lune(), lx - f * .035, ly - f * .035, f * .07, f * .07);
      mer(ctx, c, M, t, { niveau: 14, cols: [P.m0, P.m1, P.m2], teinte: 'rgba(220,226,255,', az: .28, bas: H, zMin: 30, eclat: .7, reflet: .3 });
      // lumières lointaines de la côte
      ctx.globalCompositeOperation = 'lighter';
      for (const v of villes) { const [x, y] = infini(c, v.az, v.el); MF.poseHalo(ctx, haloVille, x, y, 2 + v.s * 3, (.25 + .2 * Math.sin(t * 2 + v.ph)) * (.4 + .6 * p.nuit)); }
      ctx.globalCompositeOperation = 'source-over';
      // la nappe blanche en perspective
      const [, yB] = MF.proj(c, 0, 0, 1.5);
      const gn = ctx.createLinearGradient(0, yB, 0, H);
      gn.addColorStop(0, MF.rgba(MF.mix([232, 224, 210], [150, 146, 160], p.nuit))); gn.addColorStop(1, MF.rgba(MF.mix([250, 246, 236], [206, 198, 196], p.nuit)));
      ctx.fillStyle = gn; ctx.fillRect(0, yB, W, H - yB);
      ctx.fillStyle = 'rgba(255,250,240,.35)'; ctx.fillRect(0, yB, W, 1.2);
      for (let X = -2.4; X <= 2.4; X += .6) {
        const a = MF.proj(c, X, 0, 1.5), b = MF.proj(c, X, 0, c.z + .2), cc = MF.proj(c, X + .25, 0, c.z + .2), d = MF.proj(c, X + .25, 0, 1.5);
        const gp = ctx.createLinearGradient(b[0], 0, cc[0], 0);
        gp.addColorStop(0, 'rgba(150,130,110,0)'); gp.addColorStop(.5, 'rgba(150,130,110,.06)'); gp.addColorStop(1, 'rgba(150,130,110,0)');
        ctx.fillStyle = gp; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(cc[0], cc[1]); ctx.lineTo(d[0], d[1]); ctx.fill();
      }
      // lumière des bougies sur la nappe
      const lit = p.allume;
      ctx.globalCompositeOperation = 'lighter';
      for (const [X, Z] of bougies) { const [x, y, k] = MF.proj(c, X, 0, Z); ctx.save(); ctx.translate(x, y); ctx.scale(1, .25); MF.poseHalo(ctx, haloChaud, 0, 0, .9 * k, .4 * lit); ctx.restore(); }
      ctx.globalCompositeOperation = 'source-over';
      // objets, du plus lointain au plus proche
      const objets = [];
      for (const b of bouquet) objets.push({ Z: b.Z, f: () => { const [x, y, k] = MF.proj(c, b.X, -b.Y, b.Z), rr = b.rr * k; ctx.save(); ctx.translate(x, y); ctx.rotate(b.rot); if (b.leaf) ctx.drawImage(feuille(), rr * .2, -rr * .1, rr * 2.2, rr * .9); ctx.drawImage(fleur(), -rr * 1.1, -rr * 1.1, rr * 2.2, rr * 2.2); ctx.restore(); } });
      for (const [X, Z] of votives) objets.push({ Z, f: () => {
        const [x, y, k] = MF.proj(c, X, 0, Z), w = .07 * k, h = w * 36 / 30;
        ctx.globalCompositeOperation = 'lighter'; MF.poseHalo(ctx, haloChaud, x, y - h * .5, h * 2.2, .3 * lit); ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(photophore(), x - w / 2, y - h, w, h);
        if (lit > 0) flamme(ctx, x, y - h * .38, h * .3, w * .1, t, X * 10, lit);
      } });
      objets.push({ Z: .86, f: () => { const [x, y, k] = MF.proj(c, -.27, 0, .86), w = .3 * k, h = w * 70 / 140; ctx.drawImage(halla(), x - w / 2, y - h * .92, w, h); } });
      objets.push({ Z: .9, f: () => { const [x, y, k] = MF.proj(c, .27, 0, .9), w = .08 * k, h = w * 100 / 60; ctx.drawImage(coupe(), x - w / 2, y - h, w, h); } });
      for (const [X, Z] of [[-.3, .58], [.32, .6]]) objets.push({ Z, f: () => {
        const [x, y, k] = MF.proj(c, X, 0, Z), rx = .12 * k, ry = rx * clamp(-c.y / Z, .12, .6);
        ctx.fillStyle = 'rgba(80,60,40,.12)'; ctx.beginPath(); ctx.ellipse(x, y + ry * .15, rx * 1.02, ry * 1.02, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fbf8f1'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#c9ad6c'; ctx.lineWidth = Math.max(.8, rx * .03); ctx.beginPath(); ctx.ellipse(x, y, rx * .9, ry * .9, 0, 0, TAU); ctx.stroke();
      } });
      bougies.forEach(([X, Z], i) => objets.push({ Z, f: () => {
        const [bx, by, k] = MF.proj(c, X, 0, Z), hB = .105 * k, wB = hB * 90 / 80, hC = .21 * k, wC = .03 * k, top = by - hB * .98 - hC;
        const l = clamp(lit * 2 - i);
        if (l > 0) { ctx.globalCompositeOperation = 'lighter'; MF.poseHalo(ctx, haloChaud, bx, top, .55 * k, .32 * l); ctx.globalCompositeOperation = 'source-over'; }
        ctx.drawImage(bougeoir(), bx - wB / 2, by - hB, wB, hB);
        const cg = ctx.createLinearGradient(bx - wC / 2, 0, bx + wC / 2, 0);
        cg.addColorStop(0, '#e5ddcc'); cg.addColorStop(.45, '#fdfaf3'); cg.addColorStop(1, '#d4cab5');
        ctx.fillStyle = cg; ctx.fillRect(bx - wC / 2, top, wC, hC);
        ctx.strokeStyle = '#3a3225'; ctx.lineWidth = Math.max(1, .002 * k); ctx.beginPath(); ctx.moveTo(bx, top); ctx.lineTo(bx + .5, top - .012 * k); ctx.stroke();
        if (l > 0) { flamme(ctx, bx, top - .006 * k, .045 * k, .011 * k, t, i, l); ctx.fillStyle = 'rgba(255,226,170,' + (.5 * l).toFixed(3) + ')'; ctx.fillRect(bx - wB * .05, by - hB * .9, Math.max(1, wB * .04), hB * .8); }
      } }));
      objets.sort((a, b) => b.Z - a.Z).forEach(o => { if (o.Z - c.z > .15) o.f(); });
      vignette(ctx, W, H, '8,8,20', .3 + .15 * p.nuit);
    },
  };
})();

})();

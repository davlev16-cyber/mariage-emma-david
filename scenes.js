// Scènes dessinées en Canvas, filmées par une vraie caméra : chaque décor est posé
// en perspective (sol, mer, horizon) et la caméra avance, s'élève ou glisse au fil
// du défilement (t), en avant comme en arrière. rt est le temps réel, pour ce qui
// bouge tout seul (vagues, reflets, pétales, flammes).

// Durée de chaque scène (en secondes de « film »), parcourue au fil du défilement.
const SCENES = { intro: { duration: 9 }, m: { duration: 6 }, h: { duration: 6 }, p: { duration: 6 }, s: { duration: 6.2 }, fin: { duration: 4 } };

// ---------- Petites images préparées une fois : pétales, fleurs, chaises, lanternes, bougeoirs ----------
const Atelier = (function () {
  const cache = {}, TAU = Math.PI * 2;
  const echelle = () => Math.min(2, window.devicePixelRatio || 1);
  function toile(cle, W, H, dessin) {
    if (cache[cle]) return cache[cle];
    const k = echelle(), c = document.createElement("canvas");
    c.width = Math.ceil(W * k); c.height = Math.ceil(H * k);
    const x = c.getContext("2d"); x.scale(k, k); dessin(x, W, H);
    return (cache[cle] = c);
  }
  // version floue (premier plan hors de la zone de netteté)
  function flou(cle, src) {
    if (cache[cle]) return cache[cle];
    let cur = src;
    for (let i = 0; i < 2; i++) {
      const p = document.createElement("canvas"); p.width = Math.max(1, src.width / 5); p.height = Math.max(1, src.height / 5);
      p.getContext("2d").drawImage(cur, 0, 0, p.width, p.height);
      const g = document.createElement("canvas"); g.width = src.width; g.height = src.height;
      g.getContext("2d").drawImage(p, 0, 0, g.width, g.height);
      cur = g;
    }
    return (cache[cle] = cur);
  }
  function hasard(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  // Pétale : ivoire, crème ou rosé, avec un léger modelé
  const PETALES = [["#fffefb", "#efe6d6"], ["#fcf6ec", "#e8dcc6"], ["#f8ebe4", "#e4c8bc"]];
  function petale(v) {
    return toile("petale" + v, 44, 44, x => {
      x.translate(22, 22);
      const g = x.createRadialGradient(-4, -6, 1, 0, 0, 20);
      g.addColorStop(0, "#ffffff"); g.addColorStop(.55, PETALES[v][0]); g.addColorStop(1, PETALES[v][1]);
      x.fillStyle = g;
      x.beginPath(); x.moveTo(0, 17); x.bezierCurveTo(15, 9, 15, -12, 4, -17); x.quadraticCurveTo(0, -13, -4, -17); x.bezierCurveTo(-15, -12, -15, 9, 0, 17); x.fill();
      x.strokeStyle = "rgba(170,140,110,.16)"; x.lineWidth = .7;
      x.beginPath(); x.moveTo(0, 15); x.quadraticCurveTo(1.5, 0, 0, -13); x.stroke();
    });
  }
  // Fleur blanche : trois couronnes de pétales et un cœur crème
  function fleur() {
    return toile("fleur", 72, 72, x => {
      x.translate(36, 36);
      const couronne = (n, R, rx, ry, dec, c1, c2) => {
        for (let i = 0; i < n; i++) {
          x.save(); x.rotate(dec + i * TAU / n); x.translate(0, -R);
          const g = x.createRadialGradient(0, -ry * .35, 1, 0, 0, Math.max(rx, ry));
          g.addColorStop(0, c1); g.addColorStop(1, c2);
          x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, TAU); x.fill();
          x.strokeStyle = "rgba(150,125,90,.13)"; x.lineWidth = .6; x.stroke();
          x.restore();
        }
      };
      couronne(7, 17, 12.5, 15, 0, "#ffffff", "#ebe2cf");
      couronne(6, 10, 9, 11, .45, "#fffefa", "#efe7d6");
      couronne(5, 4.5, 6, 7, .9, "#fdf9f0", "#e6dac3");
      const c = x.createRadialGradient(0, 0, 0, 0, 0, 7);
      c.addColorStop(0, "#e8d7a3"); c.addColorStop(1, "rgba(226,208,160,0)");
      x.fillStyle = c; x.beginPath(); x.arc(0, 0, 7, 0, TAU); x.fill();
    });
  }
  // Feuille d'olivier / d'eucalyptus, vert tendre
  function feuille() {
    return toile("feuille", 48, 20, x => {
      const g = x.createLinearGradient(0, 2, 0, 18);
      g.addColorStop(0, "#8a8e5e"); g.addColorStop(1, "#5a5e36");
      x.fillStyle = g; x.beginPath(); x.moveTo(2, 10); x.quadraticCurveTo(22, -2, 46, 10); x.quadraticCurveTo(22, 22, 2, 10); x.fill();
      x.strokeStyle = "rgba(230,230,200,.35)"; x.lineWidth = .8; x.beginPath(); x.moveTo(4, 10); x.lineTo(44, 10); x.stroke();
    });
  }
  // Nuage doux, éclairé par en dessous
  function nuage(cle, clair, ombre, v) {
    return toile("nuage-" + cle + v, 420, 90, x => {
      const r = hasard(97 + v * 31);
      for (let i = 0; i < 30; i++) {
        const cx = 50 + r() * 320, cy = 50 + (r() - .5) * 16, rx = 26 + r() * 52, ry = 9 + r() * 12;
        const g = x.createRadialGradient(cx, cy - ry * .4, 0, cx, cy - ry * .4, rx);
        g.addColorStop(0, "rgba(" + ombre + ",.12)"); g.addColorStop(1, "rgba(" + ombre + ",0)");
        x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy - ry * .4, rx, ry, 0, 0, TAU); x.fill();
        const g2 = x.createRadialGradient(cx, cy + ry * .3, 0, cx, cy + ry * .3, rx * .9);
        g2.addColorStop(0, "rgba(" + clair + ",.3)"); g2.addColorStop(1, "rgba(" + clair + ",0)");
        x.fillStyle = g2; x.beginPath(); x.ellipse(cx, cy + ry * .3, rx * .9, ry * .8, 0, 0, TAU); x.fill();
      }
    });
  }
  // Chaise blanche vue de dos : cadre fin et dossier ajouré, coussin ivoire
  function chaise() {
    return toile("chaise", 60, 104, x => {
      x.fillStyle = "rgba(90,75,45,.14)"; x.beginPath(); x.ellipse(30, 100, 26, 3.6, 0, 0, TAU); x.fill();
      const blanc = x.createLinearGradient(6, 0, 54, 0);
      blanc.addColorStop(0, "#efe8da"); blanc.addColorStop(.4, "#ffffff"); blanc.addColorStop(1, "#ddd3bf");
      x.strokeStyle = blanc; x.lineCap = "round";
      // pieds
      x.lineWidth = 3; x.beginPath(); x.moveTo(11, 58); x.lineTo(10, 99); x.moveTo(49, 58); x.lineTo(50, 99); x.stroke();
      x.lineWidth = 1.6; x.beginPath(); x.moveTo(11, 80); x.lineTo(49, 80); x.stroke();
      // coussin
      const cg = x.createLinearGradient(0, 51, 0, 59);
      cg.addColorStop(0, "#fffdf8"); cg.addColorStop(1, "#e6dcc8");
      x.fillStyle = cg; x.beginPath(); x.moveTo(6, 53); x.quadraticCurveTo(30, 49, 54, 53); x.lineTo(54, 58); x.quadraticCurveTo(30, 61, 6, 58); x.fill();
      // dossier ajouré
      x.lineWidth = 3.2; x.beginPath(); x.moveTo(10, 53); x.lineTo(9, 14); x.moveTo(50, 53); x.lineTo(51, 14); x.stroke();
      x.lineWidth = 4; x.beginPath(); x.moveTo(8, 15); x.quadraticCurveTo(30, 5, 52, 15); x.stroke();
      x.lineWidth = 1.5;
      for (const yy of [27, 38]) { x.beginPath(); x.moveTo(10, yy); x.quadraticCurveTo(30, yy - 3, 50, yy); x.stroke(); }
      for (const xx of [20, 30, 40]) { x.beginPath(); x.moveTo(xx, 12 + Math.abs(30 - xx) * .12); x.lineTo(xx, 50); x.stroke(); }
      x.strokeStyle = "rgba(120,100,60,.18)"; x.lineWidth = .6;
      x.beginPath(); x.moveTo(8, 17); x.quadraticCurveTo(30, 7, 52, 17); x.stroke();
    });
  }
  // Lanterne : cage dorée, verre clair
  function lanterne() {
    return toile("lanterne", 32, 60, x => {
      x.fillStyle = "rgba(90,75,45,.18)"; x.beginPath(); x.ellipse(16, 57, 13, 2.6, 0, 0, TAU); x.fill();
      const or = x.createLinearGradient(0, 0, 32, 0);
      or.addColorStop(0, "#9c8250"); or.addColorStop(.4, "#e6d4a2"); or.addColorStop(1, "#8a7244");
      x.fillStyle = "rgba(255,250,236,.42)"; x.fillRect(6, 17, 20, 34);
      x.fillStyle = or;
      x.fillRect(4, 51, 24, 4); x.fillRect(5, 14, 22, 4);
      x.fillRect(5, 17, 2, 34); x.fillRect(25, 17, 2, 34); x.fillRect(15, 17, 1.4, 34);
      x.beginPath(); x.moveTo(6, 14); x.lineTo(16, 5); x.lineTo(26, 14); x.fill();
      x.strokeStyle = or; x.lineWidth = 1.4; x.beginPath(); x.arc(16, 4, 3, 0, TAU); x.stroke();
      x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(8, 19, 2, 30);
    });
  }
  // Bougeoir en argent (pied, tige, coupelle)
  function bougeoir() {
    return toile("bougeoir", 90, 80, x => {
      x.translate(45, 80);
      const ar = x.createLinearGradient(-40, 0, 40, 0);
      ar.addColorStop(0, "#8d887e"); ar.addColorStop(.3, "#f7f5ef"); ar.addColorStop(.45, "#b9b4aa"); ar.addColorStop(.66, "#e9e6de"); ar.addColorStop(1, "#7c776d");
      x.fillStyle = ar;
      const prof = [[0, 38], [-4, 37], [-10, 28], [-16, 12], [-22, 8], [-30, 7], [-36, 12], [-42, 7], [-58, 6], [-64, 9], [-70, 21], [-74, 21], [-76, 10], [-80, 9]];
      x.beginPath(); x.moveTo(-prof[0][1], 0);
      for (const [yy, ww] of prof) x.lineTo(-ww, yy);
      for (let i = prof.length - 1; i >= 0; i--) x.lineTo(prof[i][1], prof[i][0]);
      x.closePath(); x.fill();
      x.fillStyle = "rgba(255,255,255,.55)"; x.fillRect(-5, -72, 2, 66);
    });
  }
  return { toile, flou, petale, fleur, feuille, nuage, chaise, lanterne, bougeoir, hasard };
})();

function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, st = {}, lastRt = 0;
  const TAU = Math.PI * 2;

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = v => 1 - Math.pow(1 - clamp(v), 3);
  const easeIO = v => { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
  const sine = v => .5 - Math.cos(Math.PI * clamp(v)) / 2;
  const phase = (t, s, d) => ease((t - s) / d);
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += rand(); return (s - 2) / .58; };

  function mix(a, b, k) {
    const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k))).join(",") + ")";
  }
  function veil(color, a) {
    if (a <= 0) return;
    ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  }
  function glow(x, y, r, stops) {
    if (r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // léger assombrissement des bords, dans la couleur de la scène
  function vignette(rgbc, force) {
    const g = ctx.createRadialGradient(w / 2, h * .48, Math.min(w, h) * .38, w / 2, h * .48, Math.hypot(w, h) * .62);
    g.addColorStop(0, "rgba(" + rgbc + ",0)"); g.addColorStop(1, "rgba(" + rgbc + "," + force + ")");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  // ---------- Caméra ----------
  // Monde : x à droite, y vers le haut (le sol est à y = 0), z vers l'horizon, en mètres.
  // La focale est exprimée en hauteurs d'écran ; « horizon » place la ligne d'horizon à l'écran.
  let cam = { x: 0, y: 1.6, z: 0, f: 1, hor: 0 };
  function camera(x, y, z, focale, horizon) {
    // un souffle de caméra portée, presque imperceptible
    const s = Math.sin(lastRt * .7) * .004, s2 = Math.cos(lastRt * .53) * .003;
    // sur un écran large, on resserre un peu le cadre pour garder le sujet présent
    const large = w > h ? 1.2 : 1;
    cam = { x: x + s, y: y + s2, z, f: focale * h * large, hor: horizon * h };
  }
  function P(X, Y, Z) { const k = cam.f / Math.max(.03, Z - cam.z); return [w / 2 + (X - cam.x) * k, cam.hor - (Y - cam.y) * k, k]; }
  function infini(az, el) { return [w / 2 + az * cam.f, cam.hor - el * cam.f]; }
  const demiLargeur = Z => (w * .5 + 60) * Math.max(.03, Z - cam.z) / cam.f;

  // ---------- Ciel, nuages, soleil ----------
  function ciel(cols, span) {
    const g = ctx.createLinearGradient(0, cam.hor - h * span, 0, cam.hor);
    cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, clamp(cam.hor + 2, 0, h));
  }
  function makeNuages(n, cle, clair, ombre, elMax) {
    seed = 13 + n;
    return Array.from({ length: n }, (_, i) => ({ az: (rand() - .5) * 2.6, el: .04 + Math.pow(rand(), 1.3) * elMax, larg: .2 + rand() * .38, haut: .03 + rand() * .025, v: .0015 + rand() * .003, img: Atelier.nuage(cle, clair, ombre, i % 3) }));
  }
  function nuages(L, rt, alpha) {
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    L.forEach(n => {
      const az = ((n.az + rt * n.v + 1.5) % 3 + 3) % 3 - 1.5;
      const [x, y] = infini(az, n.el), W = n.larg * cam.f, H = n.haut * cam.f;
      if (x + W / 2 < 0 || x - W / 2 > w || y + H < 0) return;
      ctx.drawImage(n.img, x - W / 2, y - H / 2, W, H);
    });
    ctx.globalAlpha = 1;
  }
  function soleil(az, el, r, coeur, halo, force, coupe) {
    const [x, y] = infini(az, el), R = r * cam.f;
    glow(x, y, R * 11, [[0, halo + (.5 * force).toFixed(3) + ")"], [.1, halo + (.3 * force).toFixed(3) + ")"], [.35, halo + (.09 * force).toFixed(3) + ")"], [1, halo + "0)"]]);
    ctx.save();
    if (coupe) { ctx.beginPath(); ctx.rect(0, 0, w, cam.hor); ctx.clip(); }
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 1.18);
    g.addColorStop(0, coeur); g.addColorStop(.8, coeur); g.addColorStop(1, halo + "0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 1.18, 0, TAU); ctx.fill();
    ctx.restore();
    return [x, y, R];
  }

  // ---------- Mer en perspective ----------
  function makeMer(n, m) {
    seed = 23;
    const vagues = Array.from({ length: n }, () => ({ u: rand(), x: rand() * 500, len: .5 + rand() * 1.8, ph: rand() * TAU, clair: rand() < .6, v: .15 + rand() * .35 }));
    const paillettes = Array.from({ length: m }, () => ({ u: rand(), j: gauss(), sp: 1.2 + rand() * 2.6, ph: rand() * TAU, len: .5 + rand() * 1.1 }));
    return { vagues, paillettes };
  }
  // o : niveau (hauteur de l'eau), cols (loin → près), teinte ("rgba(r,g,b,"), az (direction du soleil),
  //     bas (ligne d'écran où la mer s'arrête), zMin (distance la plus proche), eclat, reflet
  function mer(M, rt, o) {
    const top = cam.hor, bas = Math.min(h, o.bas), haut = cam.y - o.niveau;
    if (bas <= top + 1) return;
    const g = ctx.createLinearGradient(0, top, 0, bas);
    o.cols.forEach((c, i) => g.addColorStop(i / (o.cols.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, top, w, bas - top);
    const hz = ctx.createLinearGradient(0, top, 0, top + (bas - top) * .22);
    hz.addColorStop(0, o.teinte + ".55)"); hz.addColorStop(1, o.teinte + "0)");
    ctx.fillStyle = hz; ctx.fillRect(0, top, w, (bas - top) * .22);
    // colonne de lumière sous le soleil
    const [sx] = infini(o.az, 0);
    ctx.save(); ctx.translate(sx, top + (bas - top) * .18); ctx.scale(1, 3.2);
    const rr = Math.max(40, (bas - top) * .3);
    const gc = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    gc.addColorStop(0, o.teinte + (o.reflet * .5).toFixed(3) + ")"); gc.addColorStop(1, o.teinte + "0)");
    ctx.fillStyle = gc; ctx.fillRect(-rr, -rr, rr * 2, rr * 2);
    ctx.restore();
    // rides : lignes fines, serrées au loin, plus larges près de nous
    const zMin = Math.max(.8, o.zMin), zMax = 700;
    ctx.lineCap = "round";
    for (const v of M.vagues) {
      const d = 1 / (1 / zMax + v.u * (1 / zMin - 1 / zMax));
      const k = cam.f / d, y = top + haut * k + Math.sin(rt * .9 + v.ph) * k * .03;
      if (y > bas - 1 || y < top + .5) continue;
      const half = demiLargeur(cam.z + d), per = 2 * half;
      const X = (((v.x + rt * v.v - cam.x) % per) + per) % per - half;
      const x = w / 2 + X * k, L = Math.min(w * .3, v.len * k * .9), near = (y - top) / (bas - top);
      const a = (v.clair ? .08 + .16 * near : .04 + .09 * near) * (.65 + .35 * Math.sin(rt * 1.2 + v.ph));
      ctx.strokeStyle = v.clair ? o.teinte + a.toFixed(3) + ")" : "rgba(30,34,22," + a.toFixed(3) + ")";
      ctx.lineWidth = clamp(.018 * k, .5, 1.6);
      ctx.beginPath(); ctx.moveTo(x - L / 2, y); ctx.quadraticCurveTo(x, y - .02 * k, x + L / 2, y); ctx.stroke();
    }
    // chemin de paillettes vers le soleil
    for (const s of M.paillettes) {
      const d = zMin * Math.pow(zMax / zMin, 1 - s.u);
      const k = cam.f / d, y = top + haut * k;
      if (y > bas - 1 || y < top + .5) continue;
      const a = Math.pow(Math.max(0, Math.sin(rt * s.sp + s.ph)), 5) * o.eclat;
      if (a < .03) continue;
      const x = sx + s.j * (1.1 + d * .025) * k, L = Math.min(34, s.len * (1.5 + k * .3)), th = clamp(k * .012, .7, 1.8);
      ctx.fillStyle = o.teinte + a.toFixed(3) + ")"; ctx.fillRect(x - L / 2, y - th / 2, L, th);
    }
  }

  // ---------- Sol ----------
  // terrasse face à la mer : bord arrondi (plus proche sur les côtés)
  function terrasse(bord, courbe, cols, liseré) {
    const pts = [], half = demiLargeur(bord) * 1.2;
    for (let i = 0; i <= 48; i++) { const X = cam.x - half + 2 * half * i / 48; pts.push(P(X, 0, bord - courbe * X * X)); }
    let yMin = h; pts.forEach(p => { if (p[1] < yMin) yMin = p[1]; });
    const g = ctx.createLinearGradient(0, yMin, 0, h);
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, h + 10);
    pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(w + 10, h + 10); ctx.fill();
    ctx.strokeStyle = liseré; ctx.lineWidth = 1.3; ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    return yMin;
  }
  // grains de sable / d'herbe fixés au sol : ils donnent la profondeur quand la caméra bouge
  function makeGrains(n, zMax) { seed = 41; return Array.from({ length: n }, () => ({ X: (rand() - .5) * 26, Z: -8 + rand() * (zMax + 8), c: rand() < .5 })); }
  function grains(L, clair, sombre) {
    for (const q of L) {
      if (q.Z - cam.z < .6) continue;
      const [x, y, k] = P(q.X, 0, q.Z);
      if (x < -5 || x > w + 5 || y > h + 5) continue;
      const r = Math.max(.5, .018 * k);
      ctx.fillStyle = q.c ? clair : sombre; ctx.fillRect(x - r, y - r * .4, r * 2, r * .8);
    }
  }
  // rivage : sable, sable mouillé, nappe d'eau qui monte et redescend, écume
  function rivage(o, rt) {
    const Zs = o.Zs, half = demiLargeur(Zs) * 1.3, n = 40;
    const lig = (Zf, amp) => { const a = []; for (let i = 0; i <= n; i++) { const X = cam.x - half + 2 * half * i / n; a.push(P(X, 0, Zf + Math.sin(X * .35 + rt * 1.1) * amp + Math.sin(X * 1.1 - rt * 1.9) * amp * .35)); } return a; };
    const bordMer = lig(Zs, .12);
    let yS = h; bordMer.forEach(p => { if (p[1] < yS) yS = p[1]; });
    // sable
    const g = ctx.createLinearGradient(0, yS, 0, h);
    g.addColorStop(0, o.sable[0]); g.addColorStop(1, o.sable[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, h + 10); bordMer.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(w + 10, h + 10); ctx.fill();
    // sable mouillé qui reflète le ciel
    const run = .5 + .5 * Math.sin(rt * .62), Zf = Zs - o.montee * run - .2;
    const mouille = lig(Zs - o.montee - .9, .1);
    ctx.fillStyle = o.mouille; ctx.beginPath(); bordMer.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    for (let i = mouille.length - 1; i >= 0; i--) ctx.lineTo(mouille[i][0], mouille[i][1]); ctx.fill();
    if (o.refletSoleil) {
      const [sx] = infini(o.az, 0), [, yM] = P(0, 0, Zs - o.montee * .5);
      ctx.save(); ctx.translate(sx, yM); ctx.scale(1, .35);
      glow(0, 0, w * .22, [[0, o.refletSoleil], [1, "rgba(255,230,200,0)"]]); ctx.restore();
    }
    // nappe d'eau qui glisse sur le sable
    const front = lig(Zf, .18);
    ctx.fillStyle = o.nappe; ctx.beginPath(); bordMer.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    for (let i = front.length - 1; i >= 0; i--) ctx.lineTo(front[i][0], front[i][1]); ctx.fill();
    // écume : un large voile et un trait vif, plus une ancienne ligne qui s'efface
    const trait = (L, lw, col) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
    trait(lig(Zf + .5 + run * .3, .15), 1, o.ecume + (.25 * (1 - run)).toFixed(3) + ")");
    trait(front, 5, o.ecume + ".22)");
    trait(front, 1.6, o.ecume + ".85)");
    // crête d'une vague qui arrive
    const c = (rt * .35) % 1, Zc = Zs + 5 - c * 4.6, crete = lig(Zc, .08);
    trait(crete, 1.4, o.ecume + (.5 * Math.sin(c * Math.PI)).toFixed(3) + ")");
    return yS;
  }

  // ---------- Houppa en trois dimensions ----------
  const HP = { X: 1.45, prof: 2.1, H: 2.55 };
  function houppaFleurs(Zh) {
    seed = 7;
    const L = [];
    const add = (X, Y, Z, n, spread, delay, taille) => {
      for (let i = 0; i < n; i++) L.push({ X: X + (rand() - .5) * spread, Y: Y + (rand() - .5) * spread * .6, Z: Z + (rand() - .5) * spread * .3,
        r: taille * (.6 + rand() * .6), d: delay + rand() * .35, rot: rand() * 3.14, leaf: rand() < .45 });
    };
    const s = .085;
    for (let i = 0; i <= 10; i++) add(-HP.X + 2 * HP.X * i / 10, HP.H, Zh - .03, 3, s * 2, .15 + i * .03, s);
    for (let i = 0; i <= 8; i++) add(-HP.X + 2 * HP.X * i / 8, HP.H, Zh + HP.prof, 2, s * 1.6, .05 + i * .03, s * .85);
    for (const X of [-HP.X, HP.X]) {
      add(X, HP.H, Zh - .05, 9, s * 4, .2, s * 1.3);
      for (let j = 1; j <= 6; j++) add(X, HP.H - HP.H * .09 * j, Zh - .06, 2, s * 1.4, .3 + j * .06, s * (1 - j * .08));
      add(X, .12, Zh - .1, 6, s * 4, .55, s * 1.1);
    }
    return L;
  }
  function fleur3D(f, p, rt) {
    const k = ease((p - f.d) / .35);
    if (k <= 0 || f.Z - cam.z < .3) return;
    const [x, y, kk] = P(f.X, f.Y, f.Z), r = f.r * kk * k;
    if (r < .4 || x < -r * 3 || x > w + r * 3) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(f.rot + Math.sin(rt * .8 + f.X * 3) * .05);
    if (f.leaf) ctx.drawImage(Atelier.feuille(), r * .2, -r * .1, r * 2.2, r * .9);
    ctx.drawImage(Atelier.fleur(), -r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
    ctx.restore();
  }
  function poteau(X, Z, Hc) {
    if (Hc <= 0 || Z - cam.z < .3) return;
    const [x0, y0, k] = P(X, 0, Z), [, y1] = P(X, Hc, Z), lw = Math.max(1.6, .07 * k);
    const g = ctx.createLinearGradient(x0 - lw / 2, 0, x0 + lw / 2, 0);
    g.addColorStop(0, "#f2ebdc"); g.addColorStop(.35, "#ffffff"); g.addColorStop(1, "#d6ccb6");
    ctx.fillStyle = g; ctx.fillRect(x0 - lw / 2, y1, lw, y0 - y1);
    ctx.fillStyle = "rgba(110,95,60,.14)"; ctx.beginPath(); ctx.ellipse(x0, y0, lw * 1.6, lw * .45, 0, 0, TAU); ctx.fill();
  }
  function ombresHouppa(Zh, az, el, force) {
    if (force <= 0) return;
    // le soleil est derrière la houppa : les ombres s'allongent vers nous
    const L = Math.min(5, HP.H / Math.tan(Math.max(.08, el))), dx = -Math.sin(az) * L, dz = -Math.cos(az) * L;
    ctx.fillStyle = "rgba(95,82,50," + (.12 * force).toFixed(3) + ")";
    for (const [X, Z] of [[-HP.X, Zh], [HP.X, Zh], [-HP.X, Zh + HP.prof], [HP.X, Zh + HP.prof]]) {
      const a = P(X - .04, 0, Z), b = P(X + .04, 0, Z), c = P(X + dx + .09, 0, Z + dz), d = P(X + dx - .09, 0, Z + dz);
      if (Z + dz - cam.z < .3) continue;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.fill();
    }
  }
  function houppa3D(Zh, t, rt, tm) {
    const pP = phase(t, tm.poles, 1.6), pC = phase(t, tm.cloth, 1.4), pF = clamp((t - tm.flowers) / 2.4);
    const Hc = HP.H * pP, Zb = Zh + HP.prof;
    // fleurs du fond d'abord
    st.fleurs.forEach(f => { if (f.Z > Zh + 1) fleur3D(f, pF, rt); });
    poteau(-HP.X, Zb, Hc); poteau(HP.X, Zb, Hc);
    if (pC > 0) {
      const vent = t => Math.sin(rt * 1.5 + t) * .03 + Math.sin(rt * 2.7 + t * 2) * .012;
      // dessus du dais (on le voit par dessous ou par dessus selon la hauteur de la caméra)
      const c = [P(-HP.X, HP.H, Zh), P(HP.X, HP.H, Zh), P(HP.X, HP.H, Zb), P(-HP.X, HP.H, Zb)];
      ctx.fillStyle = cam.y > HP.H ? "rgba(255,253,248," + (.94 * pC).toFixed(3) + ")" : "rgba(238,231,216," + (.9 * pC).toFixed(3) + ")";
      ctx.beginPath(); c.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill();
      // lambrequin avant : le tissu se creuse au milieu et ondule dans la brise
      const bas = [], n = 22, creux = .32 * pC;
      for (let i = 0; i <= n; i++) {
        const u = i / n, X = -HP.X + 2 * HP.X * u;
        bas.push(P(X, HP.H - .16 - creux * 4 * u * (1 - u) + vent(u * 5), Zh - .01));
      }
      const [, yTop] = P(0, HP.H, Zh), yBas = bas[n >> 1][1];
      const gt = ctx.createLinearGradient(0, yTop, 0, yBas);
      gt.addColorStop(0, "rgba(255,254,250," + (.96 * pC).toFixed(3) + ")"); gt.addColorStop(1, "rgba(236,228,212," + (.9 * pC).toFixed(3) + ")");
      ctx.fillStyle = gt; ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); ctx.lineTo(c[1][0], c[1][1]);
      for (let i = n; i >= 0; i--) ctx.lineTo(bas[i][0], bas[i][1]); ctx.fill();
      ctx.strokeStyle = "rgba(150,130,95," + (.12 * pC).toFixed(3) + ")"; ctx.lineWidth = 1;
      ctx.beginPath(); for (let i = 2; i < n; i += 3) { ctx.moveTo(bas[i][0], P(0, HP.H, Zh)[1] + 2); ctx.lineTo(bas[i][0], bas[i][1] - 2); } ctx.stroke();
      // voilages le long des poteaux avant, légers et transparents
      for (const s of [-1, 1]) {
        const len = HP.H * .75 * pC, sw = vent(s * 2) * 3;
        const a = P(s * HP.X, HP.H, Zh - .02), m = P(s * (HP.X + .28) + sw * .5, HP.H - len * .5, Zh - .05), b = P(s * (HP.X + .06) + sw, HP.H - len, Zh - .05), r2 = P(s * (HP.X - .1), HP.H - len * .9, Zh - .02);
        const gv = ctx.createLinearGradient(a[0], 0, m[0], 0);
        gv.addColorStop(0, "rgba(255,253,246," + (.62 * pC).toFixed(3) + ")"); gv.addColorStop(1, "rgba(246,240,226," + (.45 * pC).toFixed(3) + ")");
        ctx.fillStyle = gv; ctx.beginPath(); ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]); ctx.lineTo(r2[0], r2[1]);
        ctx.quadraticCurveTo(a[0] - s * 2, (a[1] + r2[1]) / 2, a[0], a[1]); ctx.fill();
      }
    }
    poteau(-HP.X, Zh, Hc); poteau(HP.X, Zh, Hc);
    st.fleurs.forEach(f => { if (f.Z <= Zh + 1) fleur3D(f, pF, rt); });
  }

  // ---------- Pétales qui tombent, en profondeur ----------
  function makePetales3D(n, zone) {
    return Array.from({ length: n }, () => ({ X: zone.x0 + Math.random() * (zone.x1 - zone.x0), Y: Math.random() * zone.y1, Z: zone.z0 + Math.random() * (zone.z1 - zone.z0),
      vy: .28 + Math.random() * .3, vx: -.08 + Math.random() * .22, rot: Math.random() * TAU, vr: -1.5 + Math.random() * 3, fl: Math.random() * TAU, vf: 1 + Math.random() * 2.5,
      sw: Math.random() * TAU, v: (Math.random() * 3) | 0, s: .028 + Math.random() * .02 }));
  }
  function petales3D(L, zone, rt, dt, alpha) {
    if (alpha <= 0) return;
    for (const p of L) {
      p.Y -= p.vy * dt; p.X += (p.vx + Math.sin(rt * 1.3 + p.sw) * .25) * dt; p.rot += p.vr * dt; p.fl += p.vf * dt;
      if (p.Y < 0) { p.Y = zone.y1; p.X = zone.x0 + Math.random() * (zone.x1 - zone.x0); p.Z = Math.max(cam.z + .8, zone.z0) + Math.random() * (zone.z1 - Math.max(cam.z + .8, zone.z0)); }
    }
    L.sort((a, b) => b.Z - a.Z);
    for (const p of L) {
      const d = p.Z - cam.z;
      if (d < .35) continue;
      const [x, y, k] = P(p.X, p.Y, p.Z), s = p.s * k;
      if (s < .6 || x < -s * 2 || x > w + s * 2 || y < -s * 2 || y > h + s * 2) continue;
      const img = d < 2.4 ? Atelier.flou("petaleF" + p.v, Atelier.petale(p.v)) : Atelier.petale(p.v);
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(1, .25 + .75 * Math.abs(Math.cos(p.fl)));
      ctx.globalAlpha = alpha * (d < 2.4 ? .8 : .95); ctx.drawImage(img, -s, -s, s * 2, s * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Allée de la houppa : chaises, lanternes, bouquets, pétales ----------
  const ALLEE = .6;
  function makeAllee(Zh, z0) {
    seed = 31;
    const petales = [];
    for (let i = 0; i < 170; i++) petales.push({ X: (rand() * 2 - 1) * ALLEE * .9, Z: z0 + rand() * (Zh - .3 - z0), v: (rand() * 3) | 0, s: .7 + rand() * .6, rot: rand() * TAU });
    const bords = [];
    for (let i = 0; i < 18; i++) for (const e of [-1, 1]) bords.push({ X: e * (ALLEE + .04), Z: z0 + (i + .5) * (Zh - z0) / 18, s: .8 + rand() * .4, rot: rand() * 3, leaf: rand() < .5 });
    const rangs = [];
    for (let i = 0; i < 7; i++) rangs.push(Zh - 1.8 - i * 1.25);
    return { petales, bords, rangs };
  }
  function allee(A, Zh, z0, t, rt) {
    // tapis blanc
    const zA = Math.max(z0, cam.z + .35);
    const q = [P(-ALLEE, 0, zA), P(ALLEE, 0, zA), P(ALLEE, 0, Zh + .1), P(-ALLEE, 0, Zh + .1)];
    const g = ctx.createLinearGradient(0, q[2][1], 0, q[0][1]);
    g.addColorStop(0, "#efe3c9"); g.addColorStop(1, "#f6eedd");
    ctx.fillStyle = g; ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill();
    ctx.strokeStyle = "rgba(180,160,120,.3)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[3][0], q[3][1]); ctx.moveTo(q[1][0], q[1][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.stroke();
    // pétales semés sur l'allée, des plus proches aux plus lointains
    const L = Zh - z0;
    for (const pe of A.petales) {
      const dd = pe.Z - cam.z;
      if (dd < .35) continue;
      const k = phase(t, .3 + (pe.Z - z0) / L * 1.6, .5);
      if (k <= 0) continue;
      const [x, y, kk] = P(pe.X, .002, pe.Z), s = .035 * kk * pe.s * k;
      if (s < .4) continue;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, clamp(cam.y / dd * 1.4, .18, 1)); ctx.rotate(pe.rot);
      ctx.drawImage(Atelier.petale(pe.v), -s, -s, s * 2, s * 2); ctx.restore();
    }
  }
  function rangs(A, Zh, z0, t, rt) {
    const pF = clamp((t - 1.2) / 2.4), N = A.rangs.length, L = Zh - z0;
    // du plus lointain au plus proche : bouquets de bord d'allée, chaises, lanternes
    const objets = [];
    A.bords.forEach(b => objets.push({ Z: b.Z, f: () => {
      const k = phase(t, .3 + (b.Z - z0) / L * 1.6, .5);
      fleur3D({ X: b.X, Y: .06, Z: b.Z, r: .07 * b.s, d: 0, rot: b.rot, leaf: b.leaf }, k, rt);
    } }));
    A.rangs.forEach((Z, i) => objets.push({ Z, f: () => {
      for (const side of [-1, 1]) for (let j = 2; j >= 0; j--) {
        const X = side * (ALLEE + .48 + j * .62), [x, y, k] = P(X, 0, Z);
        if (Z - cam.z < .5) continue;
        const cw = .46 * k, ch = cw * 104 / 60;
        if (x + cw < 0 || x - cw > w) continue;
        ctx.drawImage(Atelier.chaise(), x - cw / 2, y - ch, cw, ch);
        if (j === 0) {
          // bouquet blanc sur la chaise côté allée
          [[0, .78, .085], [-.07, .7, .065], [.06, .7, .06]].forEach(([ox, oy, r], q2) =>
            fleur3D({ X: X - side * .2 + ox, Y: oy, Z: Z - .03, r, d: i * .06 + q2 * .05, rot: i + q2, leaf: q2 === 1 }, pF, rt));
          // lanterne au bord de l'allée, allumée de la plus proche à la plus lointaine
          const [lx, ly, lk] = P(side * (ALLEE + .12), 0, Z - .25), lw = .24 * lk, lh = lw * 60 / 32;
          const on = phase(t, .6 + i * .3, .4), fl = .85 + .15 * Math.sin(rt * 9 + i + side);
          if (on > 0) glow(lx, ly - lh * .5, lh * 1.5, [[0, "rgba(255,210,140," + (.2 * on * fl).toFixed(3) + ")"], [1, "rgba(255,210,140,0)"]]);
          ctx.drawImage(Atelier.lanterne(), lx - lw / 2, ly - lh, lw, lh);
          if (on > 0) {
            const fx = lx, fy = ly - lh * .47, fr = lh * .09 * on;
            glow(fx, fy, fr * 4, [[0, "rgba(255,244,210," + (.9 * on).toFixed(3) + ")"], [1, "rgba(255,210,140,0)"]]);
            ctx.fillStyle = "#fff3cf"; ctx.beginPath(); ctx.ellipse(fx, fy, fr * .5, fr * fl, 0, 0, TAU); ctx.fill();
          }
        }
      }
    } }));
    objets.sort((a, b) => b.Z - a.Z).forEach(o => { if (o.Z - cam.z > .3) o.f(); });
  }

  // ---------- Scènes ----------
  const SOLEIL_INTRO = { az: .15, r: .026 };
  const draws = {
    // Ouverture : la houppa face à la mer se construit pendant que la caméra avance et s'élève
    intro(t, rt, dt) {
      const Zh = 12, u = t / 9;
      const cz = lerp(-2.4, 2, sine(u)), cy = lerp(1.85, 2.7, easeIO((t - 1) / 8)), cx = lerp(-.55, .25, sine(u));
      const kh = .95 * h / (Zh + 1 - cz);
      camera(cx, cy, cz, .95, clamp((.64 * h + (1.3 - cy) * kh) / h, .46, .62));
      const el = .022 + phase(t, 0, 3) * .012;
      ciel(["#c9c4a4", "#e9dcc2", "#f6e6c8"], .75);
      nuages(st.nuages, rt, .75);
      soleil(SOLEIL_INTRO.az, el, SOLEIL_INTRO.r, "#fff5df", "rgba(255,238,205,", 1, false);
      mer(st.mer, rt, { niveau: -3, cols: ["#b4b89c", "#8e9576", "#6a7152"], teinte: "rgba(255,243,220,", az: SOLEIL_INTRO.az, bas: h, zMin: 16, eclat: .9, reflet: .5 });
      terrasse(Zh + 4.5, .045, ["#e8dbc0", "#cdbb97"], "rgba(255,248,230,.75)");
      grains(st.grains, "rgba(255,250,236,.55)", "rgba(150,130,90,.22)");
      ombresHouppa(Zh, SOLEIL_INTRO.az, el, phase(t, 1, 2));
      // tapis blanc vers la houppa
      const zA = Math.max(cz + .35, -3), a = [P(-.55, 0, zA), P(.55, 0, zA), P(.62, 0, Zh), P(-.62, 0, Zh)];
      ctx.fillStyle = "rgba(250,245,234,.8)"; ctx.beginPath(); a.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill();
      houppa3D(Zh, t, rt, { poles: 1, cloth: 2.2, flowers: 2.8 });
      petales3D(st.petales, st.zone, rt, dt, clamp((t - 3) / 2));
      vignette("120,100,60", .16);
      veil("#fffdf9", 1 - phase(t, 0, 1.4));   // seule l'ouverture naît du blanc
    },

    // Mairie : un fond écru tout simple ; la lumière glisse doucement, quelques poussières dorées flottent
    m(t, rt) {
      ctx.fillStyle = "#f3ecdd"; ctx.fillRect(0, 0, w, h);
      if (st.papier) { ctx.globalAlpha = .55; ctx.fillStyle = st.papier; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }
      const lx = w / 2 + Math.sin(rt * .09) * w * .09 + (t / 6 - .5) * w * .06, ly = h * .42 + Math.cos(rt * .11) * h * .025;
      glow(lx, ly, Math.max(w, h) * .78, [[0, "rgba(255,252,244,.9)"], [.5, "rgba(255,250,240,.35)"], [1, "rgba(255,252,244,0)"]]);
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .4, w / 2, h / 2, Math.max(w, h) * .8);
      v.addColorStop(0, "rgba(200,185,150,0)"); v.addColorStop(1, "rgba(200,185,150,.2)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
      // poussières : trois plans qui glissent à des vitesses différentes (profondeur)
      for (const p of st.poussieres) {
        const x = ((p.x * w + rt * p.v * 6 * p.z + t * 8 * p.z) % (w + 20) + w + 20) % (w + 20) - 10;
        const y = ((p.y * h - rt * p.v * 9 * p.z) % (h + 20) + h + 20) % (h + 20) - 10;
        const a = (.2 + .5 * Math.max(0, Math.sin(rt * p.tw + p.ph))) * p.z;
        glow(x, y, 2.5 + p.z * 4, [[0, "rgba(214,184,120," + a.toFixed(3) + ")"], [1, "rgba(214,184,120,0)"]]);
      }
    },

    // Henné : coucher de soleil bordeaux sur la plage ; la caméra avance vers la mer et s'élève un peu
    h(t, rt) {
      const u = t / 6;
      camera(lerp(-.45, .3, sine(u)), lerp(1.05, 1.4, easeIO(u)), lerp(-1.6, .3, sine(u)), lerp(.9, .98, easeIO(u)), .55);
      const el = lerp(.034, .004, phase(t, 0, 6) * 1.0);
      ciel(["#4e1522", "#5b1b28", "#a13f4a", "#eba882"], .72);
      nuages(st.nuages, rt, .85);
      soleil(0, el, .046, "#ffe2bd", "rgba(255,214,176,", 1, true);
      mer(st.mer, rt, { niveau: -.05, cols: ["#c47768", "#8e3a42", "#5a1c28", "#4a1620"], teinte: "rgba(255,214,186,", az: 0, bas: h, zMin: 5, eclat: 1, reflet: .75 });
      rivage({ Zs: 5.2, montee: 1.4, sable: ["#dcb393", "#c99a7c"], mouille: "rgba(150,70,70,.28)", nappe: "rgba(160,70,75,.3)", ecume: "rgba(255,246,232,", refletSoleil: "rgba(255,210,170,.35)", az: 0 }, rt);
      grains(st.grains, "rgba(255,236,214,.45)", "rgba(120,60,50,.18)");
      vignette("60,10,20", .28);
    },

    // Houppa : on avance dans l'allée, entre les chaises fleuries et les lanternes, vers la houppa face à la mer
    p(t, rt) {
      const Zh = 14, z0 = -1.2, u = t / 6;
      camera(Math.sin(t * 1.15) * .05, 1.55 + Math.sin(t * 2.3) * .018, lerp(-1.6, 3.6, easeIO(u)), .92, .5);
      ciel(["#d8d7c2", "#f3e3c6", "#f8dcb0"], .6);
      nuages(st.nuages, rt, .6);
      soleil(0, .03, .03, "#fff4dc", "rgba(255,240,205,", .95, false);
      mer(st.mer, rt, { niveau: -3, cols: ["#c2c4aa", "#a3aa8d", "#8a9276"], teinte: "rgba(255,244,220,", az: 0, bas: h, zMin: 20, eclat: .8, reflet: .45 });
      terrasse(Zh + 5, .03, ["#efe3c9", "#d6c39c"], "rgba(255,250,236,.7)");
      grains(st.grains, "rgba(255,252,240,.5)", "rgba(150,130,90,.2)");
      ombresHouppa(Zh, 0, .03, .8);
      allee(st.allee, Zh, z0, t, rt);
      houppa3D(Zh, t, rt, { poles: -2, cloth: -2, flowers: .2 });
      rangs(st.allee, Zh, z0, t, rt);
      vignette("120,100,60", .14);
    },

    // Réponse : la mer calme au lever du jour ; la caméra monte doucement
    fin(t, rt) {
      const u = t / 4;
      camera(lerp(.25, -.1, sine(u)), lerp(1, 1.6, easeIO(u)), lerp(-.8, .1, sine(u)), .95, lerp(.6, .57, easeIO(u)));
      const el = .02 + ease(u) * .07;
      ciel(["#e8e6dc", "#efece2", "#f6ead4", "#f8e2bd"], .7);
      nuages(st.nuages, rt, .55);
      soleil(0, el, .028, "#fff6e2", "rgba(255,240,208,", .95, false);
      mer(st.mer, rt, { niveau: -.05, cols: ["#d5d5c1", "#b3b79c", "#9aa085"], teinte: "rgba(255,246,225,", az: 0, bas: h, zMin: 5, eclat: .75, reflet: .5 });
      rivage({ Zs: 6.5, montee: 1.1, sable: ["#efe4cc", "#e0cfae"], mouille: "rgba(150,150,120,.2)", nappe: "rgba(190,195,170,.35)", ecume: "rgba(255,253,246,", refletSoleil: "rgba(255,244,215,.4)", az: 0 }, rt);
      grains(st.grains, "rgba(255,252,240,.5)", "rgba(150,130,90,.18)");
      vignette("140,120,80", .12);
    },

    // Chabbat : crépuscule doré qui devient nuit ; la caméra, au ras de la nappe, s'approche des bougies
    s(t, rt) {
      const u = t / 6.2, night = phase(t, 0, 2.2);
      camera(lerp(-.035, .03, sine(u)), lerp(.11, .135, easeIO(u)), lerp(-.62, -.34, sine(u)), 1.12, lerp(.665, .65, easeIO(u)));
      const sg = ctx.createLinearGradient(0, 0, 0, cam.hor + 4);
      sg.addColorStop(0, mix("#d9a47c", "#4e5878", night));
      sg.addColorStop(.6, mix("#f0c797", "#a898a4", night));
      sg.addColorStop(1, mix("#f6dcb0", "#ecd0a4", night));
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
      // étoiles, fixées au ciel (elles bougent à peine quand la caméra glisse)
      st.stars.forEach(s => {
        const a = phase(t, s.d, .8) * (.6 + .4 * Math.sin(rt * 2 + s.tw)) * (1 - s.y * 1.3);
        if (a <= 0) return;
        const x = s.x * w - cam.x * 40, y = s.y * h + (cam.hor - .665 * h) * .3;
        ctx.fillStyle = "rgba(255,246,220," + a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, TAU); ctx.fill();
        if (s.r > 1.45) {
          ctx.strokeStyle = "rgba(255,246,220," + (a * .35).toFixed(3) + ")"; ctx.lineWidth = .6;
          ctx.beginPath(); ctx.moveTo(x - s.r * 3, y); ctx.lineTo(x + s.r * 3, y); ctx.moveTo(x, y - s.r * 3); ctx.lineTo(x, y + s.r * 3); ctx.stroke();
        }
      });
      // la nappe, en perspective, avec sa broderie dorée
      const bord = [P(-4, 0, 3), P(4, 0, 3)], yN = bord[0][1];
      const gn = ctx.createLinearGradient(0, yN, 0, h);
      gn.addColorStop(0, mix("#efe4cf", "#e6d9c2", night)); gn.addColorStop(1, mix("#fbf6ea", "#f3e9d6", night));
      ctx.fillStyle = gn; ctx.fillRect(0, yN, w, h - yN);
      for (let X = -1.35; X <= 1.4; X += .45) {   // plis doux de la nappe
        const a = P(X, 0, 3), b = P(X, 0, cam.z + .25), c2 = P(X + .2, 0, cam.z + .25), d2 = P(X + .2, 0, 3);
        const gp = ctx.createLinearGradient(b[0], 0, c2[0], 0);
        gp.addColorStop(0, "rgba(170,150,110,0)"); gp.addColorStop(.5, "rgba(170,150,110,.07)"); gp.addColorStop(1, "rgba(170,150,110,0)");
        ctx.fillStyle = gp; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(d2[0], d2[1]); ctx.fill();
      }
      for (const [Zb, lw] of [[.62, 1.6], [.66, .8]]) { const a = P(-3, 0, Zb), b = P(3, 0, Zb); ctx.strokeStyle = "#b9a46d"; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      // bougies : la gauche un peu plus près que la droite (parallaxe)
      [[-1, -.115, 1.08], [1, .125, 1.24]].forEach(([side, X, Z], i) => {
        const lit = phase(t, 2 + i * .6, .5), [bx, by, k] = P(X, 0, Z);
        const hB = .105 * k, wB = hB * 90 / 80, hC = .21 * k, wC = .03 * k, top = by - hB * .98 - hC;
        if (lit > 0) {
          glow(bx, top, 1.1 * k * .45, [[0, "rgba(255,200,120," + (.36 * lit).toFixed(3) + ")"], [1, "rgba(255,200,120,0)"]]);
          ctx.save(); ctx.translate(bx, by); ctx.scale(1, .22);
          glow(0, 0, .5 * k, [[0, "rgba(255,214,150," + (.35 * lit).toFixed(3) + ")"], [1, "rgba(255,214,150,0)"]]); ctx.restore();
        }
        ctx.drawImage(Atelier.bougeoir(), bx - wB / 2, by - hB, wB, hB);
        const cg = ctx.createLinearGradient(bx - wC / 2, 0, bx + wC / 2, 0);
        cg.addColorStop(0, "#e5ddcc"); cg.addColorStop(.45, "#fdfaf3"); cg.addColorStop(1, "#d4cab5");
        ctx.fillStyle = cg; ctx.fillRect(bx - wC / 2, top, wC, hC);
        if (lit > 0) {
          const gh = ctx.createLinearGradient(0, top, 0, top + hC * .25);
          gh.addColorStop(0, "rgba(255,214,150," + (.55 * lit).toFixed(3) + ")"); gh.addColorStop(1, "rgba(255,214,150,0)");
          ctx.fillStyle = gh; ctx.fillRect(bx - wC / 2, top, wC, hC * .25);
        }
        ctx.strokeStyle = "#3a3225"; ctx.lineWidth = Math.max(1, .002 * k); ctx.beginPath(); ctx.moveTo(bx, top); ctx.lineTo(bx + .5, top - .012 * k); ctx.stroke();
        if (lit > 0) {
          const fl = 1 + Math.sin(rt * 13 + i) * .06 + Math.sin(rt * 7.3 + i * 2) * .05;
          const fh = .045 * k * lit * fl, fw = .011 * k * lit, sway = Math.sin(rt * 5 + i) * fw * .25;
          glow(bx, top - fh * .5, fh * 2.2, [[0, "rgba(255,236,190," + (.5 * lit).toFixed(3) + ")"], [1, "rgba(255,200,120,0)"]]);
          ctx.save(); ctx.translate(bx + sway, top - .006 * k);
          const fg = ctx.createRadialGradient(0, -fh * .32, 0, 0, -fh * .38, fh);
          fg.addColorStop(0, "#fffdf0"); fg.addColorStop(.3, "#ffe08a"); fg.addColorStop(.7, "rgba(255,160,70,.8)"); fg.addColorStop(1, "rgba(255,140,60,0)");
          ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.bezierCurveTo(fw, -fh * .2, fw * .6, -fh * .7, sway * .4, -fh);
          ctx.bezierCurveTo(-fw * .6, -fh * .7, -fw, -fh * .2, 0, 0); ctx.fill();
          ctx.restore();
          // reflet de la flamme sur l'argent du bougeoir
          ctx.fillStyle = "rgba(255,226,170," + (.5 * lit).toFixed(3) + ")"; ctx.fillRect(bx - wB * .05, by - hB * .9, Math.max(1, wB * .04), hB * .8);
        }
      });
      vignette("40,30,40", .22 * night + .06);
    }
  };

  function papier() {
    const c = document.createElement("canvas"); c.width = c.height = 180;
    const x = c.getContext("2d"), r = Atelier.hasard(5);
    for (let i = 0; i < 2600; i++) { x.fillStyle = r() < .5 ? "rgba(150,130,90,.05)" : "rgba(255,255,255,.08)"; x.fillRect(r() * 180, r() * 180, 1 + r() * 2, 1); }
    x.strokeStyle = "rgba(160,140,100,.05)";
    for (let i = 0; i < 70; i++) { const a = r() * 180, b = r() * 180; x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo(a + r() * 20 - 10, b + r() * 10, a + r() * 30 - 15, b + r() * 20 - 10); x.stroke(); }
    return ctx.createPattern(c, "repeat");
  }

  function init(name) {
    if (name === "intro") {
      st = { fleurs: houppaFleurs(12), mer: makeMer(90, 110), grains: makeGrains(220, 17), nuages: makeNuages(7, "intro", "255,248,230", "200,190,160", .32),
        zone: { x0: -5, x1: 5, y1: 5, z0: 1, z1: 17 } };
      st.petales = makePetales3D(Math.round(Math.min(110, w / 5)), st.zone);
    } else if (name === "p") {
      st = { fleurs: houppaFleurs(14), mer: makeMer(70, 80), grains: makeGrains(200, 19), nuages: makeNuages(6, "p", "255,248,232", "205,195,165", .28), allee: makeAllee(14, -1.2) };
    } else if (name === "h") {
      st = { mer: makeMer(110, 130), grains: makeGrains(260, 4), nuages: makeNuages(8, "h", "255,190,160", "110,40,60", .34) };
    } else if (name === "fin") {
      st = { mer: makeMer(100, 110), grains: makeGrains(240, 5), nuages: makeNuages(6, "fin", "255,250,238", "215,205,180", .3) };
    } else if (name === "m") {
      seed = 3;
      st = { papier: papier(), poussieres: Array.from({ length: 34 }, () => ({ x: rand(), y: rand(), z: .3 + rand() * .7, v: .5 + rand(), tw: .6 + rand() * 1.4, ph: rand() * TAU })) };
    } else {
      st = { stars: Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random() * .62, r: .5 + Math.random() * 1.3, d: .4 + Math.random() * 2.2, tw: Math.random() * 6.28 })) };
    }
  }

  let current = "";
  return {
    resize(name) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth || innerWidth; h = canvas.clientHeight || innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      init(name); current = name;
    },
    draw(name, t, rt) {
      if (name !== current || !w) this.resize(name);
      const dt = lastRt ? Math.min(.05, Math.max(0, rt - lastRt)) : 0; lastRt = rt;
      ctx.clearRect(0, 0, w, h);
      draws[name](t, rt, dt);
    }
  };
}

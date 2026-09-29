// Scènes dessinées en Canvas, inspirées du lieu (une pelouse au bord de la mer,
// liseré de sable, palmiers, lumière dorée), vues comme par un drone.
// Chaque scène se dessine à un instant t piloté par le défilement (en avant comme
// en arrière) ; rt est le temps réel, pour ce qui bouge tout seul (vagues, reflets,
// flammes, palmes).

// Durée de chaque scène (en secondes de « film »), parcourue au fil du défilement.
const SCENES = { intro: { duration: 9 }, m: { duration: 6 }, h: { duration: 6 }, p: { duration: 6 }, s: { duration: 6.2 }, fin: { duration: 4 } };

function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, st = {}, current = "";

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = v => 1 - Math.pow(1 - clamp(v), 3);
  const easeIO = v => { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
  const phase = (t, s, d) => ease((t - s) / d);
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function mix(a, b, k) {
    const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k))).join(",") + ")";
  }
  function veil(color, a) {
    if (a <= 0) return;
    ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(-w, -h, w * 3, h * 3); ctx.globalAlpha = 1;
  }
  function glow(x, y, r, stops) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function vgrad(y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    return g;
  }
  // Vignettage doux, comme une optique de cinéma
  function vignette(a) {
    const g = ctx.createRadialGradient(w / 2, h * .48, Math.min(w, h) * .35, w / 2, h * .5, Math.max(w, h) * .85);
    g.addColorStop(0, "rgba(20,15,10,0)"); g.addColorStop(1, "rgba(20,15,10," + a + ")");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  // =====================================================================
  //  Vue de drone (du dessus) : mer, écume, sable, pelouse, palmiers
  // =====================================================================
  function makeCoast() {
    seed = 11;
    const W = w * 1.8, H = h * 1.8, X0 = -w * .4, Y0 = -h * .4;    // monde plus grand que l'écran
    const palms = [];
    for (let i = 0; i < 11; i++) palms.push({ x: X0 + (i + .3 + rand() * .4) * W / 11, y: h * .56 + rand() * h * .05, s: .8 + rand() * .45, rot: rand() * 6.28 });
    for (let i = 0; i < 4; i++) palms.push({ x: X0 + rand() * W, y: h * .78 + rand() * h * .35, s: .9 + rand() * .4, rot: rand() * 6.28 });
    const glints = Array.from({ length: 90 }, () => ({ x: X0 + rand() * W, y: Y0 + rand() * (h * .4 - Y0 + h * .05), ph: rand() * 6.28, sp: .6 + rand() * 1.4 }));
    return { W, H, X0, Y0, palms, glints };
  }
  const coastY = x => h * .455 + Math.sin(x / w * 2.3 + .6) * h * .012 + Math.sin(x / w * 7.1) * h * .004;

  function drawCoast(rt, pal) {
    const { X0, Y0, W, H } = st.world;
    // Mer : du bleu profond au turquoise des hauts-fonds
    ctx.fillStyle = vgrad(Y0, h * .47, [[0, pal.deep], [.55, pal.mid], [.88, pal.shallow], [1, pal.shallow]]);
    ctx.fillRect(X0, Y0, W, h * .47 - Y0);
    // Reflets du soleil sur l'eau
    st.world.glints.forEach(g => {
      const a = (.5 + .5 * Math.sin(rt * g.sp + g.ph)) * pal.glint;
      if (a < .05) return;
      ctx.fillStyle = "rgba(255,255,250," + a.toFixed(3) + ")";
      ctx.fillRect(g.x, g.y, 2.2, 1.2);
    });
    // Vagues qui avancent vers le rivage (lignes d'écume parallèles à la côte)
    for (let i = 0; i < 6; i++) {
      const ph = (rt * .07 + i / 6) % 1, dist = (1 - ph) * h * .16;
      const a = Math.sin(ph * Math.PI) * .55;
      ctx.strokeStyle = "rgba(255,255,255," + a.toFixed(3) + ")"; ctx.lineWidth = 1 + ph * 2.2;
      ctx.beginPath();
      for (let x = X0; x <= X0 + W; x += 14) ctx.lineTo(x, coastY(x) - dist + Math.sin(x * .02 + i * 2 + rt * .5) * 2.5);
      ctx.stroke();
    }
    // Sable (sec et mouillé)
    const sandTop = x => coastY(x) + Math.sin(rt * .8 + x * .01) * 2;
    ctx.fillStyle = vgrad(h * .44, h * .53, [[0, pal.wetSand], [.25, pal.sand], [1, pal.sand2]]);
    ctx.beginPath(); ctx.moveTo(X0, sandTop(X0));
    for (let x = X0; x <= X0 + W; x += 14) ctx.lineTo(x, sandTop(x));
    ctx.lineTo(X0 + W, h * .53); ctx.lineTo(X0, h * .53); ctx.fill();
    // Écume au bord de l'eau, qui respire
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = X0; x <= X0 + W; x += 10) ctx.lineTo(x, sandTop(x) - 1 + Math.sin(x * .05 + rt * 1.3) * 1.5);
    ctx.stroke();
    // Pelouse tondue en bandes
    const gTop = h * .525;
    ctx.fillStyle = pal.lawn; ctx.fillRect(X0, gTop, W, Y0 + H - gTop);
    const band = Math.max(26, w * .085);
    ctx.fillStyle = pal.lawn2;
    for (let x = X0; x < X0 + W; x += band * 2) {
      ctx.beginPath(); ctx.moveTo(x, gTop); ctx.lineTo(x + band, gTop); ctx.lineTo(x + band - h * .12, Y0 + H); ctx.lineTo(x - h * .12, Y0 + H); ctx.fill();
    }
    // Lisière adoucie entre sable et pelouse
    ctx.fillStyle = vgrad(gTop - 4, gTop + 10, [[0, "rgba(0,0,0,0)"], [1, "rgba(60,80,30,.18)"]]);
    ctx.fillRect(X0, gTop - 4, W, 14);
    // Palmiers vus du dessus, avec leur ombre longue de fin de journée
    const R = Math.min(w, h) * .085;
    st.world.palms.forEach(p => palmTop(p.x, p.y, R * p.s, p.rot + Math.sin(rt * .6 + p.x) * .03, pal));
  }

  function palmTop(x, y, R, rot, pal) {
    const n = 9;
    // Ombre portée (allongée par le soleil bas)
    ctx.save(); ctx.translate(x + R * .9, y + R * .45); ctx.rotate(rot); ctx.scale(1.25, .8);
    ctx.fillStyle = pal.shadow;
    for (let i = 0; i < n; i++) { ctx.rotate(Math.PI * 2 / n); leaf(R, .16); }
    ctx.restore();
    // Palmes
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    for (let i = 0; i < n; i++) {
      ctx.rotate(Math.PI * 2 / n);
      ctx.fillStyle = i % 2 ? pal.frond : pal.frond2; leaf(R * (.92 + (i % 3) * .05), .17);
      ctx.strokeStyle = "rgba(255,245,210,.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(R * .08, 0); ctx.lineTo(R * .9, 0); ctx.stroke();
    }
    ctx.fillStyle = "#6f5a3a"; ctx.beginPath(); ctx.arc(0, 0, R * .08, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  function leaf(L, wd) {
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(L * .45, -L * wd, L, 0);
    ctx.quadraticCurveTo(L * .45, L * wd, 0, 0); ctx.fill();
  }

  // =====================================================================
  //  Vue rasante (depuis la terre) : ciel, soleil, mer, vagues en perspective
  // =====================================================================
  function drawHorizon(rt, o) {
    const hz = o.horizon;
    ctx.fillStyle = vgrad(0, hz, o.sky); ctx.fillRect(-w, -h, w * 3, hz + h + 1);
    // Nuages étirés, très légers
    (o.clouds || []).forEach(c => {
      ctx.fillStyle = c.col; ctx.beginPath();
      ctx.ellipse(c.x * w + Math.sin(rt * .03 + c.x * 9) * 12, c.y * hz, c.rx * w, c.ry * hz, 0, 0, 6.283); ctx.fill();
    });
    // Soleil
    if (o.sun) {
      glow(o.sun.x, o.sun.y, h * .5, o.sun.halo);
      ctx.save(); ctx.beginPath(); ctx.rect(-w, -h, w * 3, hz + h); ctx.clip();
      ctx.fillStyle = o.sun.col; ctx.beginPath(); ctx.arc(o.sun.x, o.sun.y, o.sun.r, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    // Mer
    ctx.fillStyle = vgrad(hz, o.shore, o.sea); ctx.fillRect(-w, hz, w * 3, o.shore - hz + 1);
    // Chemin de lumière du soleil sur l'eau
    if (o.sun) {
      for (let i = 0; i < 60; i++) {
        const k = i / 60, y = hz + (o.shore - hz) * Math.pow(k, 1.6);
        const spread = (6 + k * w * .14) * (.6 + .4 * Math.sin(rt * 2 + i * 1.7));
        const a = (1 - k * .6) * o.path * (.5 + .5 * Math.sin(rt * 3 + i * 2.3));
        ctx.fillStyle = "rgba(255,236,200," + a.toFixed(3) + ")";
        ctx.fillRect(o.sun.x - spread / 2 + Math.sin(i * 3.1 + rt) * spread * .3, y, spread * (.3 + .4 * ((i * 7) % 5) / 5), 1 + k * 2);
      }
    }
    // Rouleaux de vagues en perspective
    for (let i = 0; i < 7; i++) {
      const ph = (rt * .09 + i / 7) % 1, y = hz + (o.shore - hz) * Math.pow(ph, 2.2);
      const a = Math.sin(ph * Math.PI) * o.foam * (.4 + ph * .6);
      ctx.strokeStyle = "rgba(255,255,255," + a.toFixed(3) + ")"; ctx.lineWidth = .6 + ph * 2.4;
      ctx.beginPath();
      for (let x = -w * .2; x <= w * 1.2; x += 16) ctx.lineTo(x, y + Math.sin(x * .012 + i * 1.9 + rt * .6) * (1 + ph * 4));
      ctx.stroke();
    }
  }

  // Palmier en ombre chinoise : tronc légèrement courbé, palmes qui retombent
  function palmSilhouette(x, base, H, lean, col, rt, s) {
    const topX = x + lean * H, topY = base - H;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, H * .022);
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + lean * H * .15, base - H * .6, topX, topY); ctx.stroke();
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1)) * Math.PI;               // de gauche à droite, par le haut
      const sway = Math.sin(rt * .7 + i * .9 + s) * .05;
      const L = H * (.3 + .08 * Math.sin(i * 2.1 + s));
      const tipX = topX + Math.cos(a + sway) * L, tipY = topY + Math.sin(a + sway) * L * .55 + L * .45;   // la pointe retombe
      const cx = topX + Math.cos(a + sway) * L * .5, cy = topY + Math.sin(a + sway) * L * .75 - L * .08;
      const wd = L * .07;
      ctx.beginPath(); ctx.moveTo(topX, topY - wd);
      ctx.quadraticCurveTo(cx, cy - wd, tipX, tipY);
      ctx.quadraticCurveTo(cx, cy + wd * 1.4, topX, topY + wd); ctx.fill();
    }
  }

  // =====================================================================
  //  Les scènes
  // =====================================================================
  const draws = {
    // Ouverture : on descend en drone au-dessus de la mer jusqu'à la pelouse, à l'heure dorée
    intro(t, rt) {
      const k = easeIO(t / 9);
      const z = lerp(1.05, 1.9, k), rot = lerp(.05, -.03, k);
      const fx = w * .5, fy = lerp(h * .34, h * .6, k);
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-fx, -fy);
      drawCoast(rt, st.pal);
      ctx.restore();
      // Lumière dorée rasante
      ctx.fillStyle = "rgba(255,196,120,.10)"; ctx.fillRect(0, 0, w, h);
      glow(w * .9, -h * .05, Math.max(w, h) * .9, [[0, "rgba(255,226,170,.35)"], [1, "rgba(255,226,170,0)"]]);
      vignette(.22);
      veil("#fbf6ea", 1 - phase(t, 0, 1.6));    // naît du crème de l'écran d'ouverture
    },

    // Mairie : un fond écru tout simple, avec une lumière douce
    m() {
      ctx.fillStyle = "#f3ecdd"; ctx.fillRect(0, 0, w, h);
      glow(w / 2, h * .42, Math.max(w, h) * .75, [[0, "rgba(255,252,244,.85)"], [1, "rgba(255,252,244,0)"]]);
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .4, w / 2, h / 2, Math.max(w, h) * .8);
      v.addColorStop(0, "rgba(200,185,150,0)"); v.addColorStop(1, "rgba(200,185,150,.18)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    },

    // Henné : la plage au coucher du soleil, en bordeaux ; les vagues viennent mourir sur le sable
    h(t, rt) {
      const k = easeIO(t / 6);
      const hz = h * .44, shore = h * .66;
      ctx.save(); ctx.translate(0, lerp(-h * .03, 0, k));
      drawHorizon(rt, {
        horizon: hz, shore,
        sky: [[0, "#3e0f1a"], [.45, "#7d2635"], [.8, "#c9605a"], [1, "#f1a57c"]],
        clouds: st.clouds.map(c => ({ ...c, col: "rgba(250,170,150,.16)" })),
        sun: { x: w * .5, y: hz - lerp(h * .07, h * .005, k), r: Math.min(w, h) * .075, col: "#ffd9b0",
          halo: [[0, "rgba(255,210,170,.85)"], [.18, "rgba(230,120,110,.35)"], [1, "rgba(230,120,110,0)"]] },
        sea: [[0, "#b8575a"], [.5, "#7d2a37"], [1, "#5e1b28"]], path: .55, foam: .5
      });
      // Sable mouillé qui reflète le ciel, puis sable sec
      ctx.fillStyle = vgrad(shore, h, [[0, "#b8736c"], [.25, "#d9a589"], [1, "#caa086"]]);
      ctx.fillRect(-w, shore, w * 3, h);
      // Nappe d'écume qui avance et recule
      const wash = shore + h * (.02 + .025 * (.5 + .5 * Math.sin(rt * .55)));
      ctx.fillStyle = "rgba(255,240,235,.55)"; ctx.beginPath(); ctx.moveTo(-w, shore);
      for (let x = -w * .2; x <= w * 1.2; x += 12) ctx.lineTo(x, wash + Math.sin(x * .03 + rt) * 4);
      ctx.lineTo(w * 1.2, shore); ctx.fill();
      ctx.restore();
      // Palmiers en ombre chinoise
      const col = "rgba(40,10,18,.92)";
      palmSilhouette(-w * .06, h * 1.02, h * .42, .14, col, rt, 1);
      palmSilhouette(w * .08, h * 1.04, h * .3, .06, col, rt, 2);
      palmSilhouette(w * 1.06, h * 1.03, h * .38, -.16, col, rt, 3);
      vignette(.28);
    },

    // Houppa : la pelouse face à la mer au coucher du soleil ; allée blanche, chaises,
    // houppa très sobre (quatre poteaux, un voile) ; la caméra avance vers la mer
    p(t, rt) {
      const k = easeIO(t / 6);
      const hz = h * .36, sandY = h * .45, lawnY = h * .475, vx = w / 2;
      ctx.save(); ctx.translate(vx, hz); ctx.scale(lerp(1, 1.22, k), lerp(1, 1.22, k)); ctx.translate(-vx, -hz);
      drawHorizon(rt, {
        horizon: hz, shore: sandY,
        sky: [[0, "#a9b7c0"], [.55, "#e9cfae"], [.9, "#f6bf88"], [1, "#f8c995"]],
        clouds: st.clouds.map(c => ({ ...c, col: "rgba(255,236,214,.35)" })),
        sun: { x: w * .62, y: hz - h * .03, r: Math.min(w, h) * .045, col: "#fff0cf",
          halo: [[0, "rgba(255,238,200,.9)"], [.2, "rgba(250,200,140,.35)"], [1, "rgba(250,200,140,0)"]] },
        sea: [[0, "#9fb3ad"], [.6, "#6f8c86"], [1, "#5d7a73"]], path: .5, foam: .35
      });
      ctx.fillStyle = vgrad(sandY, lawnY, [[0, "#e9d6b2"], [1, "#dcc49a"]]); ctx.fillRect(-w, sandY, w * 3, lawnY - sandY + 1);
      // Pelouse avec bandes de tonte en perspective
      ctx.fillStyle = "#7e9656"; ctx.fillRect(-w, lawnY, w * 3, h * 2);
      ctx.fillStyle = "#88a05f";
      for (let i = -12; i <= 12; i += 2) {
        const x1 = vx + i * w * .09, x2 = vx + (i + 1) * w * .09;
        ctx.beginPath(); ctx.moveTo(vx + i * w * .012, lawnY); ctx.lineTo(vx + (i + 1) * w * .012, lawnY);
        ctx.lineTo(vx + (x2 - vx) * 9, h * 1.3); ctx.lineTo(vx + (x1 - vx) * 9, h * 1.3); ctx.fill();
      }
      ctx.fillStyle = vgrad(lawnY, h, [[0, "rgba(255,210,150,.18)"], [1, "rgba(40,50,20,.12)"]]); ctx.fillRect(-w, lawnY, w * 3, h);
      // Palmiers au loin, en bord de pelouse
      [[.06, .05], [.16, -.02], [.84, .02], [.95, -.05]].forEach(([px, ln], j) =>
        palmSilhouette(w * px, h * .478, h * .11, ln, "rgba(62,74,42,.75)", rt, 4 + j));
      // Allée blanche
      const topHW = w * .035, botHW = w * .22;
      const aisle = y => topHW + (botHW - topHW) * (y - lawnY) / (h - lawnY);
      ctx.fillStyle = "#f6f1e6"; ctx.beginPath();
      ctx.moveTo(vx - topHW, lawnY + 2); ctx.lineTo(vx + topHW, lawnY + 2); ctx.lineTo(vx + botHW * 1.3, h * 1.3); ctx.lineTo(vx - botHW * 1.3, h * 1.3); ctx.fill();
      // Houppa sobre au bout de l'allée
      const HW = w * .085, HH = h * .085, hy = lawnY + h * .01, show = phase(t, .3, 1.6), cloth = phase(t, 1.2, 1.4);
      ctx.strokeStyle = "#fbf6ea"; ctx.lineWidth = Math.max(1.5, w * .005); ctx.lineCap = "round";
      [[-1, 1], [1, 1], [-.7, .92], [.7, .92]].forEach(([sx, d]) => {
        const x = vx + sx * HW * d, yb = hy - (1 - d) * h * .05;
        ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yb - HH * show * d); ctx.stroke();
      });
      if (cloth > 0) {
        const sway = Math.sin(rt * 1.1) * 2;
        ctx.fillStyle = "rgba(255,253,247," + (.88 * cloth).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(vx - HW, hy - HH); ctx.lineTo(vx - HW * .7, hy - HH * .92 - h * .004);
        ctx.lineTo(vx + HW * .7, hy - HH * .92 - h * .004); ctx.lineTo(vx + HW, hy - HH);
        ctx.quadraticCurveTo(vx + sway, hy - HH + h * .018 * cloth, vx - HW, hy - HH); ctx.fill();
        ctx.fillStyle = "rgba(255,253,247," + (.4 * cloth).toFixed(3) + ")";
        [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(vx + sd * HW, hy - HH); ctx.lineTo(vx + sd * (HW + 3) + sway, hy - HH * .35); ctx.lineTo(vx + sd * (HW - 3), hy - HH * .4); ctx.fill(); });
        // Quelques fleurs blanches, discrètes, aux coins
        [-1, 1].forEach(sd => [0, 1, 2].forEach(j => {
          const r = w * .006 * cloth * (1 - j * .2);
          ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(vx + sd * (HW - j * 4), hy - HH + j * 2, r, 0, 6.283); ctx.fill();
        }));
      }
      // Rangées de chaises blanches, qui apparaissent de la mer vers nous
      const N = 8;
      for (let i = 0; i < N; i++) {
        const d = (i + 1) / N, y = lawnY + (h * 1.02 - lawnY) * Math.pow(d, 1.7) + h * .02, sc = .15 + Math.pow(d, 1.7) * 1.05;
        const a = phase(t, .2 + (i / N) * 1.8, .6);
        if (a <= 0) continue;
        const aw = aisle(y), cw = Math.min(w, h) * .05 * sc;
        ctx.globalAlpha = a;
        [-1, 1].forEach(side => {
          for (let j = 0; j < 4; j++) {
            const x = vx + side * (aw + cw * .7 + j * cw * 1.25);
            ctx.fillStyle = "rgba(60,70,30,.18)"; ctx.fillRect(x - cw / 2 + cw * .15, y - cw * .02, cw, cw * .12);
            ctx.fillStyle = "#fbf8f1";
            ctx.fillRect(x - cw / 2, y - cw * .5, cw, cw * .14);
            ctx.beginPath(); ctx.moveTo(x - cw / 2, y - cw * .5); ctx.lineTo(x - cw / 2, y - cw * 1.2);
            ctx.quadraticCurveTo(x, y - cw * 1.38, x + cw / 2, y - cw * 1.2); ctx.lineTo(x + cw / 2, y - cw * .5); ctx.fill();
          }
        });
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      vignette(.2);
    },

    // Chabbat : crépuscule doré sur la mer ; deux bougies sur une nappe blanche s'allument
    s(t, rt) {
      const k = phase(t, 0, 2.4);
      const hz = h * .5, shore = h * .7;
      drawHorizon(rt, {
        horizon: hz, shore,
        sky: [[0, mix("#c79a7c", "#6e7ea0", k)], [.55, mix("#f0c69a", "#c7a8b2", k)], [1, mix("#f7d9a8", "#f2d1a0", k)]],
        clouds: st.clouds.map(c => ({ ...c, col: "rgba(255,225,205,.2)" })),
        sun: { x: w * .5, y: hz + lerp(-h * .02, h * .03, k), r: Math.min(w, h) * .05, col: "#ffe2b8",
          halo: [[0, "rgba(255,220,170," + (.8 - .4 * k).toFixed(2) + ")"], [1, "rgba(255,220,170,0)"]] },
        sea: [[0, mix("#c7a38e", "#a39aa8", k)], [1, mix("#8c7b76", "#6f7384", k)]], path: .4 * (1 - k * .6), foam: .25
      });
      st.stars.forEach(s => {
        const a = phase(t, s.d, .8) * (.5 + .5 * Math.sin(rt * 2 + s.tw)) * (1 - s.y * 1.6);
        if (a <= 0) return;
        ctx.fillStyle = "rgba(255,248,230," + a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, 6.283); ctx.fill();
      });
      // Nappe blanche
      const table = h * .74;
      ctx.fillStyle = vgrad(table, h, [[0, "#fbf7ee"], [1, "#ece3d0"]]); ctx.fillRect(0, table, w, h - table);
      ctx.fillStyle = "rgba(185,164,109,.55)"; ctx.fillRect(0, table + 8, w, 1);
      // Bougies
      const s = Math.min(w, h) / 800, gap = 60 * s + 26;
      [-1, 1].forEach((side, i) => {
        const x = w / 2 + side * gap, ch = 140 * s + 56, cw = 13 * s + 7, top = table - ch;
        const lit = phase(t, 2 + i * .6, .5);
        if (lit > 0) glow(x, top - 10, 240 * s + 110, [[0, "rgba(255,205,130," + (.32 * lit).toFixed(3) + ")"], [1, "rgba(255,205,130,0)"]]);
        const sg = ctx.createLinearGradient(x - cw * 1.2, 0, x + cw * 1.2, 0);
        sg.addColorStop(0, "#9b927e"); sg.addColorStop(.5, "#e7e1d2"); sg.addColorStop(1, "#8f8672");
        ctx.fillStyle = sg;
        ctx.fillRect(x - cw * 1.2, table - 13 * s - 6, cw * 2.4, 13 * s + 6);
        ctx.fillRect(x - cw * .3, table - 28 * s - 10, cw * .6, 17 * s + 6);
        const cg = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
        cg.addColorStop(0, "#ebe4d4"); cg.addColorStop(.5, "#fdf9f1"); cg.addColorStop(1, "#dcd3c0");
        ctx.fillStyle = cg; ctx.fillRect(x - cw / 2, top, cw, ch - 28 * s - 10);
        ctx.strokeStyle = "#3a3225"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - 7); ctx.stroke();
        if (lit > 0) {
          const fl = 1 + Math.sin(rt * 13 + i) * .06 + Math.sin(rt * 7.3 + i * 2) * .05;
          const fh = (32 * s + 13) * lit * fl, fw = (8.5 * s + 4) * lit;
          ctx.save(); ctx.translate(x + Math.sin(rt * 5 + i) * 1.1, top - 5);
          const fg = ctx.createRadialGradient(0, -fh * .35, 0, 0, -fh * .35, fh);
          fg.addColorStop(0, "#fffbe8"); fg.addColorStop(.35, "#ffd87a"); fg.addColorStop(1, "rgba(255,150,60,0)");
          ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.bezierCurveTo(fw, -fh * .2, fw * .6, -fh * .7, 0, -fh);
          ctx.bezierCurveTo(-fw * .6, -fh * .7, -fw, -fh * .2, 0, 0); ctx.fill();
          ctx.restore();
        }
      });
      vignette(.18);
    },

    // Réponse : la mer à l'aube, vue du ciel ; le drone s'élève doucement
    fin(t, rt) {
      const k = easeIO(t / 4), z = lerp(1.5, 1.1, k);
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(z, z); ctx.rotate(lerp(-.02, .02, k)); ctx.translate(-w / 2, -h * .52);
      drawCoast(rt, st.pal);
      ctx.restore();
      ctx.fillStyle = "rgba(255,244,228,.28)"; ctx.fillRect(0, 0, w, h);
      glow(w * .2, -h * .05, Math.max(w, h) * .9, [[0, "rgba(255,238,215,.4)"], [1, "rgba(255,238,215,0)"]]);
      vignette(.14);
    }
  };

  function clouds() {
    seed = 5;
    return Array.from({ length: 6 }, () => ({ x: rand(), y: .25 + rand() * .55, rx: .12 + rand() * .2, ry: .02 + rand() * .025 }));
  }

  function init(name) {
    const golden = { deep: "#1f6679", mid: "#3f98a2", shallow: "#8fcfc6", glint: .7, wetSand: "#cbb48c", sand: "#e6d3ad", sand2: "#dcc59c",
      lawn: "#6f8c45", lawn2: "#7a984f", frond: "#4f6b33", frond2: "#5e7c3c", shadow: "rgba(30,40,15,.28)" };
    const dawn = { deep: "#6f97a4", mid: "#93b9bd", shallow: "#c7e2da", glint: .5, wetSand: "#d9ccb2", sand: "#efe5d0", sand2: "#e7dcc4",
      lawn: "#94a676", lawn2: "#9caf7e", frond: "#7d9165", frond2: "#879b6d", shadow: "rgba(60,70,50,.16)" };
    if (name === "intro" || name === "fin") st = { world: makeCoast(), pal: name === "fin" ? dawn : golden };
    else if (name === "s") st = { clouds: clouds(), stars: Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random() * .38, r: .5 + Math.random(), d: .8 + Math.random() * 2, tw: Math.random() * 6.28 })) };
    else st = { clouds: clouds() };
  }

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
      ctx.clearRect(0, 0, w, h);
      draws[name](t, rt);
    }
  };
}

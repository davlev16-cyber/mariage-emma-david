// Cinématique d'ouverture : une houppa fleurie de blanc, face à la mer,
// au coucher du soleil, avec des pétales qui tombent. Dessinée en Canvas.

(function () {
  const intro = document.getElementById("intro");
  const canvas = document.getElementById("scene");
  if (!intro || !canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let w = 0, h = 0, dpr = 1, flowers = [], petals = [], sparkles = [];
  let running = true;
  const t0 = performance.now();

  // Déjà vue pendant cette visite (retour depuis une page) : on la saute.
  let seen = false;
  try { seen = sessionStorage.getItem("introSeen") === "1"; } catch (e) {}
  if (seen) { close(true); return; }

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = v => 1 - Math.pow(1 - clamp(v), 3);
  const phase = (t, start, dur) => ease((t - start) / dur);

  // Tirage pseudo-aléatoire stable (même scène à chaque ouverture).
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function geometry() {
    const W = Math.min(w * 0.62, 420);
    const H = Math.min(h * 0.36, W * 0.85);
    const cx = w / 2;
    const ground = h * 0.84;
    const depth = W * 0.14;
    return {
      cx, ground, W, H,
      fl: [cx - W / 2, ground], fr: [cx + W / 2, ground],
      bl: [cx - W / 2 + depth, ground - H * 0.1], br: [cx + W / 2 - depth, ground - H * 0.1],
      top: ground - H
    };
  }

  function build() {
    seed = 7;
    const g = geometry();
    flowers = [];
    const addCluster = (x, y, n, spread, delay, size) => {
      for (let i = 0; i < n; i++) {
        flowers.push({
          x: x + (rand() - 0.5) * spread,
          y: y + (rand() - 0.5) * spread * 0.6,
          r: size * (0.6 + rand() * 0.6),
          d: delay + rand() * 0.35,
          rot: rand() * Math.PI,
          leaf: rand() < 0.45
        });
      }
    };
    const s = Math.max(6, g.W / 34);
    const topF = g.top, topB = g.top - g.H * 0.1;
    // Guirlande sur le bord avant, grappes aux coins, cascades le long des poteaux.
    for (let i = 0; i <= 10; i++) addCluster(g.fl[0] + (g.W * i) / 10, topF, 3, s * 2, 0.15 + i * 0.03, s);
    for (let i = 0; i <= 8; i++) addCluster(g.bl[0] + ((g.br[0] - g.bl[0]) * i) / 8, topB, 2, s * 1.6, 0.05 + i * 0.03, s * 0.8);
    [g.fl, g.fr].forEach(p => {
      addCluster(p[0], topF, 9, s * 4, 0.2, s * 1.3);
      for (let j = 1; j <= 6; j++) addCluster(p[0], topF + g.H * 0.09 * j, 2, s * 1.4, 0.3 + j * 0.06, s * (1 - j * 0.08));
      addCluster(p[0], g.ground - s, 6, s * 4, 0.55, s * 1.1);
    });
    petals = Array.from({ length: Math.round(Math.min(90, w / 8)) }, () => newPetal(true));
    sparkles = Array.from({ length: 70 }, () => ({ x: rand(), y: rand(), len: 8 + rand() * 40, sp: 0.5 + rand() * 1.5, ph: rand() * 6.28 }));
  }

  function newPetal(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h - h : -20,
      vy: 0.3 + Math.random() * 0.6,
      vx: -0.2 + Math.random() * 0.5,
      rot: Math.random() * 6.28,
      vr: -0.02 + Math.random() * 0.04,
      s: 3 + Math.random() * 4,
      sway: Math.random() * 6.28
    };
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = intro.clientWidth; h = intro.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function sky(t) {
    const horizon = h * 0.6;
    const sg = ctx.createLinearGradient(0, 0, 0, horizon);
    sg.addColorStop(0, "#c9c4a4");
    sg.addColorStop(0.55, "#e9dcc2");
    sg.addColorStop(1, "#f6e6c8");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, horizon + 1);

    // Soleil bas sur l'horizon
    const sx = w * 0.7, sy = horizon - h * 0.02 + (1 - phase(t, 0, 3)) * h * 0.04;
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.35);
    glow.addColorStop(0, "rgba(255,241,212,0.95)");
    glow.addColorStop(0.15, "rgba(250,228,188,0.55)");
    glow.addColorStop(1, "rgba(250,228,188,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, horizon);
    ctx.fillStyle = "#fff4dc";
    ctx.beginPath(); ctx.arc(sx, sy, Math.min(w, h) * 0.045, 0, Math.PI * 2); ctx.fill();

    // Mer
    const mg = ctx.createLinearGradient(0, horizon, 0, h);
    mg.addColorStop(0, "#a3a98e");
    mg.addColorStop(0.5, "#7d8466");
    mg.addColorStop(1, "#5f6547");
    ctx.fillStyle = mg;
    ctx.fillRect(0, horizon, w, h - horizon);

    // Reflets qui scintillent
    sparkles.forEach(sp => {
      const y = horizon + 4 + sp.y * (h * 0.22);
      const nearSun = 1 - Math.min(1, Math.abs(sp.x * w - sx) / (w * 0.35));
      const a = (0.15 + 0.5 * nearSun) * (0.5 + 0.5 * Math.sin(t * sp.sp + sp.ph));
      ctx.strokeStyle = "rgba(255,243,220," + a.toFixed(3) + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const x = sp.x * w + Math.sin(t * 0.4 + sp.ph) * 6;
      ctx.moveTo(x, y); ctx.lineTo(x + sp.len * (0.6 + nearSun), y);
      ctx.stroke();
    });
  }

  function terrace(g) {
    const top = h * 0.78;
    const tg = ctx.createLinearGradient(0, top, 0, h);
    tg.addColorStop(0, "#e2d4b8");
    tg.addColorStop(1, "#cdbb97");
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(0, top + h * 0.03);
    ctx.quadraticCurveTo(w / 2, top - h * 0.015, w, top + h * 0.03);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fill();
    // Allée claire vers la houppa
    ctx.fillStyle = "rgba(250,245,234,0.75)";
    ctx.beginPath();
    ctx.moveTo(g.cx - g.W * 0.22, g.ground);
    ctx.lineTo(g.cx + g.W * 0.22, g.ground);
    ctx.lineTo(g.cx + g.W * 0.55, h);
    ctx.lineTo(g.cx - g.W * 0.55, h);
    ctx.closePath();
    ctx.fill();
  }

  function pole(base, height, p, width) {
    if (p <= 0) return;
    const y2 = base[1] - height * p;
    ctx.strokeStyle = "#f3ecdd";
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(base[0], y2); ctx.stroke();
    ctx.strokeStyle = "rgba(95,97,57,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(base[0] + width / 2, base[1]); ctx.lineTo(base[0] + width / 2, y2); ctx.stroke();
  }

  function flower(f, p, t) {
    const k = ease((p - f.d) / 0.35);
    if (k <= 0) return;
    const r = f.r * k;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot + Math.sin(t * 0.8 + f.x) * 0.05);
    if (f.leaf) {
      ctx.fillStyle = "#6c7045";
      ctx.beginPath(); ctx.ellipse(r * 1.1, r * 0.5, r * 0.9, r * 0.35, 0.6, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.fillStyle = i % 2 ? "#fffdf8" : "#f6f1e6";
      ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.42, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#e6d7a8";
    ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function houppa(t) {
    const g = geometry();
    const pPoles = phase(t, 1.0, 1.6);
    const pCloth = phase(t, 2.2, 1.4);
    const pFlowers = clamp((t - 2.8) / 2.4);
    const sway = Math.sin(t * 1.1) * 4;

    pole(g.bl, g.H * 0.9, pPoles, 4);
    pole(g.br, g.H * 0.9, pPoles, 4);

    if (pCloth > 0) {
      const topF = g.top, topB = g.top - g.H * 0.1;
      // Toit en tissu
      ctx.fillStyle = "rgba(252,249,242," + (0.92 * pCloth).toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(g.fl[0], topF);
      ctx.lineTo(g.bl[0], topB);
      ctx.lineTo(g.br[0], topB);
      ctx.lineTo(g.fr[0], topF);
      ctx.quadraticCurveTo(g.cx, topF + g.H * 0.16 * pCloth, g.fl[0], topF);
      ctx.fill();
      // Voiles tombants sur les côtés
      ctx.fillStyle = "rgba(255,252,246," + (0.55 * pCloth).toFixed(3) + ")";
      [[g.fl, -1], [g.fr, 1]].forEach(([p, dir]) => {
        const len = g.H * 0.75 * pCloth;
        ctx.beginPath();
        ctx.moveTo(p[0], topF);
        ctx.quadraticCurveTo(p[0] + dir * (g.W * 0.08) + sway, topF + len * 0.5, p[0] + dir * 4 + sway * 1.5, topF + len);
        ctx.lineTo(p[0] - dir * 6, topF + len * 0.9);
        ctx.quadraticCurveTo(p[0] - dir * 2, topF + len * 0.4, p[0], topF);
        ctx.fill();
      });
    }

    pole(g.fl, g.H, pPoles, 6);
    pole(g.fr, g.H, pPoles, 6);

    flowers.forEach(f => flower(f, pFlowers, t));
  }

  function drawPetals(t) {
    const on = clamp((t - 3) / 2);
    if (on <= 0) return;
    petals.forEach(p => {
      if (!reduce) {
        p.y += p.vy; p.x += p.vx + Math.sin(t + p.sway) * 0.3; p.rot += p.vr;
        if (p.y > h + 20) Object.assign(p, newPetal(false));
      }
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = "rgba(255,253,248," + (0.9 * on).toFixed(3) + ")";
      ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  function frame(now) {
    if (!running) return;
    const t = reduce ? 8 : (now - t0) / 1000;
    ctx.clearRect(0, 0, w, h);
    const g = geometry();
    sky(t);
    terrace(g);
    houppa(t);
    drawPetals(t);
    // Voile beige qui s'ouvre au début
    const fade = 1 - phase(t, 0, 1.2);
    if (fade > 0) { ctx.fillStyle = "rgba(239,231,216," + fade.toFixed(3) + ")"; ctx.fillRect(0, 0, w, h); }
    if (t > 5 || reduce) document.getElementById("intro-text").classList.add("show");
    if (reduce) return;
    requestAnimationFrame(frame);
  }

  function close(instant) {
    try { sessionStorage.setItem("introSeen", "1"); } catch (e) {}
    document.body.classList.remove("intro-open");
    if (instant || reduce) { intro.remove(); running = false; return; }
    intro.classList.add("leaving");
    setTimeout(() => { running = false; intro.remove(); }, 1200);
  }

  resize();
  addEventListener("resize", resize);
  requestAnimationFrame(frame);
  document.getElementById("open").addEventListener("click", () => close(false));
  document.getElementById("skip").addEventListener("click", () => close(false));
})();

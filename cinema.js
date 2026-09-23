// Cinématiques dessinées en Canvas : ouverture (houppa face à la mer),
// puis une transition avant chaque célébration (plage, houppa, bougies de Chabbat).

const Cinema = (function () {
  const box = document.getElementById("cinema");
  const canvas = document.getElementById("cine-canvas");
  const caption = document.getElementById("cine-caption");
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0;

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = v => 1 - Math.pow(1 - clamp(v), 3);
  const easeIO = v => { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
  const phase = (t, s, d) => ease((t - s) / d);
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize);
  resize();

  function veil(color, a) {
    if (a <= 0) return;
    ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  }

  function glow(x, y, r, stops) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // ---------- Pétales ----------
  function makePetals(n) {
    return Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h - h, vy: .4 + Math.random() * .7, vx: -.2 + Math.random() * .5,
      rot: Math.random() * 6.28, vr: -.03 + Math.random() * .06, s: 3 + Math.random() * 4.5, sw: Math.random() * 6.28
    }));
  }
  function petals(list, t, alpha, color) {
    if (alpha <= 0) return;
    list.forEach(p => {
      if (!reduce) {
        p.y += p.vy; p.x += p.vx + Math.sin(t * 1.3 + p.sw) * .35; p.rot += p.vr;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
      }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = alpha; ctx.fillStyle = color || "#fffdf8";
      ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .6, 0, 0, 6.283); ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // ---------- Mer et reflets ----------
  function makeSparkles(n) {
    return Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), len: 8 + Math.random() * 40, sp: .5 + Math.random() * 1.5, ph: Math.random() * 6.28 }));
  }
  function sea(t, top, bottom, colors, sparkles, sunX, tint) {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, top, w, bottom - top);
    sparkles.forEach(sp => {
      const y = top + 4 + sp.y * (bottom - top) * .8;
      const near = 1 - Math.min(1, Math.abs(sp.x * w - sunX) / (w * .35));
      const a = (.12 + .55 * near) * (.5 + .5 * Math.sin(t * sp.sp + sp.ph));
      ctx.strokeStyle = tint + a.toFixed(3) + ")"; ctx.lineWidth = 1.5;
      const x = sp.x * w + Math.sin(t * .4 + sp.ph) * 6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sp.len * (.6 + near), y); ctx.stroke();
    });
  }

  // ---------- Houppa ----------
  function houppaGeo(scale) {
    const W = Math.min(w * .62, 420) * (scale || 1);
    const H = Math.min(h * .36, W * .85);
    const cx = w / 2, ground = h * .84, depth = W * .14;
    return { cx, ground, W, H, top: ground - H,
      fl: [cx - W / 2, ground], fr: [cx + W / 2, ground],
      bl: [cx - W / 2 + depth, ground - H * .1], br: [cx + W / 2 - depth, ground - H * .1] };
  }
  function houppaFlowers(g) {
    seed = 7;
    const list = [];
    const add = (x, y, n, spread, delay, size) => {
      for (let i = 0; i < n; i++) list.push({ x: x + (rand() - .5) * spread, y: y + (rand() - .5) * spread * .6,
        r: size * (.6 + rand() * .6), d: delay + rand() * .35, rot: rand() * 3.14, leaf: rand() < .45 });
    };
    const s = Math.max(6, g.W / 34), topB = g.top - g.H * .1;
    for (let i = 0; i <= 10; i++) add(g.fl[0] + g.W * i / 10, g.top, 3, s * 2, .15 + i * .03, s);
    for (let i = 0; i <= 8; i++) add(g.bl[0] + (g.br[0] - g.bl[0]) * i / 8, topB, 2, s * 1.6, .05 + i * .03, s * .8);
    [g.fl, g.fr].forEach(p => {
      add(p[0], g.top, 9, s * 4, .2, s * 1.3);
      for (let j = 1; j <= 6; j++) add(p[0], g.top + g.H * .09 * j, 2, s * 1.4, .3 + j * .06, s * (1 - j * .08));
      add(p[0], g.ground - s, 6, s * 4, .55, s * 1.1);
    });
    return list;
  }
  function flower(f, p, t) {
    const k = ease((p - f.d) / .35);
    if (k <= 0) return;
    const r = f.r * k;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot + Math.sin(t * .8 + f.x) * .05);
    if (f.leaf) { ctx.fillStyle = "#6c7045"; ctx.beginPath(); ctx.ellipse(r * 1.1, r * .5, r * .9, r * .35, .6, 0, 6.283); ctx.fill(); }
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3); ctx.fillStyle = i % 2 ? "#fffdf8" : "#f4efe3";
      ctx.beginPath(); ctx.ellipse(0, -r * .55, r * .42, r * .6, 0, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle = "#e6d7a8"; ctx.beginPath(); ctx.arc(0, 0, r * .22, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  function pole(base, height, p, width) {
    if (p <= 0) return;
    const y2 = base[1] - height * p;
    ctx.lineCap = "round"; ctx.strokeStyle = "#f3ecdd"; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(base[0], y2); ctx.stroke();
    ctx.strokeStyle = "rgba(95,97,57,.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(base[0] + width / 2, base[1]); ctx.lineTo(base[0] + width / 2, y2); ctx.stroke();
  }
  function seaside(t, st) {
    const horizon = h * .6, sunX = w * .7;
    const sg = ctx.createLinearGradient(0, 0, 0, horizon);
    sg.addColorStop(0, "#c9c4a4"); sg.addColorStop(.55, "#e9dcc2"); sg.addColorStop(1, "#f6e6c8");
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, horizon + 1);
    const sy = horizon - h * .02 + (1 - phase(t, 0, 3)) * h * .04;
    glow(sunX, sy, h * .35, [[0, "rgba(255,241,212,.95)"], [.15, "rgba(250,228,188,.55)"], [1, "rgba(250,228,188,0)"]]);
    ctx.fillStyle = "#fff4dc"; ctx.beginPath(); ctx.arc(sunX, sy, Math.min(w, h) * .045, 0, 6.283); ctx.fill();
    sea(t, horizon, h, ["#a3a98e", "#7d8466", "#5f6547"], st.sparkles, sunX, "rgba(255,243,220,");
    // Terrasse et allée
    const top = h * .78, tg = ctx.createLinearGradient(0, top, 0, h);
    tg.addColorStop(0, "#e2d4b8"); tg.addColorStop(1, "#cdbb97");
    ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(0, top + h * .03);
    ctx.quadraticCurveTo(w / 2, top - h * .015, w, top + h * .03); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    const g = st.geo;
    ctx.fillStyle = "rgba(250,245,234,.75)"; ctx.beginPath();
    ctx.moveTo(g.cx - g.W * .22, g.ground); ctx.lineTo(g.cx + g.W * .22, g.ground);
    ctx.lineTo(g.cx + g.W * .55, h); ctx.lineTo(g.cx - g.W * .55, h); ctx.fill();
  }
  function houppa(t, st, tm) {
    const g = st.geo;
    const pP = phase(t, tm.poles, 1.6), pC = phase(t, tm.cloth, 1.4), pF = clamp((t - tm.flowers) / 2.4);
    const sway = Math.sin(t * 1.1) * 4;
    pole(g.bl, g.H * .9, pP, 4); pole(g.br, g.H * .9, pP, 4);
    if (pC > 0) {
      const topB = g.top - g.H * .1;
      ctx.fillStyle = "rgba(252,249,242," + (.92 * pC).toFixed(3) + ")";
      ctx.beginPath(); ctx.moveTo(g.fl[0], g.top); ctx.lineTo(g.bl[0], topB); ctx.lineTo(g.br[0], topB);
      ctx.lineTo(g.fr[0], g.top); ctx.quadraticCurveTo(g.cx, g.top + g.H * .16 * pC, g.fl[0], g.top); ctx.fill();
      ctx.fillStyle = "rgba(255,252,246," + (.55 * pC).toFixed(3) + ")";
      [[g.fl, -1], [g.fr, 1]].forEach(([p, dir]) => {
        const len = g.H * .75 * pC;
        ctx.beginPath(); ctx.moveTo(p[0], g.top);
        ctx.quadraticCurveTo(p[0] + dir * g.W * .08 + sway, g.top + len * .5, p[0] + dir * 4 + sway * 1.5, g.top + len);
        ctx.lineTo(p[0] - dir * 6, g.top + len * .9);
        ctx.quadraticCurveTo(p[0] - dir * 2, g.top + len * .4, p[0], g.top); ctx.fill();
      });
    }
    pole(g.fl, g.H, pP, 6); pole(g.fr, g.H, pP, 6);
    st.flowers.forEach(f => flower(f, pF, t));
  }
  function zoomAt(x, y, z) { ctx.translate(x, y); ctx.scale(z, z); ctx.translate(-x, -y); }

  // ---------- Scènes ----------
  const scenes = {
    // Ouverture : la houppa se construit face à la mer, puis la caméra entre dans la houppa
    intro: {
      duration: 11, end: "#efe7d8", tone: "dark",
      init() { const geo = houppaGeo(); return { geo, flowers: houppaFlowers(geo), sparkles: makeSparkles(70), petals: makePetals(Math.min(90, w / 8)) }; },
      draw(t, st) {
        const g = st.geo, z = 1 + 2.6 * easeIO((t - 8.2) / 2.6);
        ctx.save(); zoomAt(g.cx, g.top + g.H * .45, z);
        seaside(t, st); houppa(t, st, { poles: 1, cloth: 2.2, flowers: 2.8 });
        ctx.restore();
        petals(st.petals, t, clamp((t - 3) / 2));
        veil("#efe7d8", 1 - phase(t, 0, 1.4));
        veil("#efe7d8", phase(t, 9.6, 1.3));
      },
      captions: guest => [
        ["ב״ה", "bh", .8],
        [guest, "small", 5.2],
        ["Emma & David", "names", 5.7],
        ["Cohav Ayam · Août 2027", "small", 6.4]
      ]
    },

    // Henné · Beach Party : coucher de soleil, vagues, guirlandes qui s'allument
    h: {
      duration: 6, end: "#43301f", tone: "dark",
      init() {
        const bulbs = [];
        [[-.05, .1, 1.05, .2, .12, 16, 0], [-.05, .26, 1.05, .16, .09, 14, .5]].forEach(([x1, y1, x2, y2, sag, n, d]) => {
          for (let i = 0; i <= n; i++) {
            const u = i / n, x = (x1 + (x2 - x1) * u) * w, y = (y1 + (y2 - y1) * u + sag * 4 * u * (1 - u)) * h;
            bulbs.push({ x, y, d: .8 + d + u * 1.2, hue: i % 3 });
          }
        });
        return { sparkles: makeSparkles(80), bulbs };
      },
      draw(t, st) {
        const horizon = h * .55, sunX = w * .5, sunY = horizon + (phase(t, 0, 6) * h * .03) - h * .03;
        const sg = ctx.createLinearGradient(0, 0, 0, horizon);
        sg.addColorStop(0, "#b0674a"); sg.addColorStop(.5, "#dc9a68"); sg.addColorStop(1, "#f5cf97");
        ctx.fillStyle = sg; ctx.fillRect(0, 0, w, horizon + 1);
        glow(sunX, sunY, h * .45, [[0, "rgba(255,226,160,.95)"], [.2, "rgba(245,180,110,.5)"], [1, "rgba(245,180,110,0)"]]);
        ctx.fillStyle = "#ffe0a3"; ctx.beginPath(); ctx.arc(sunX, sunY, Math.min(w, h) * .09, Math.PI, 0); ctx.fill();
        sea(t, horizon, h * .78, ["#c98f6a", "#6f7a62", "#4f5e52"], st.sparkles, sunX, "rgba(255,225,170,");
        // Sable et écume
        const shore = h * .76;
        ctx.fillStyle = "#e3c393";
        ctx.beginPath(); ctx.moveTo(0, shore);
        for (let x = 0; x <= w; x += 12) ctx.lineTo(x, shore + Math.sin(x / 60 + t * 1.6) * 5 + Math.sin(t * .9) * 6);
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
        ctx.strokeStyle = "rgba(255,248,232,.7)"; ctx.lineWidth = 2; ctx.beginPath();
        for (let x = 0; x <= w; x += 12) ctx.lineTo(x, shore - 3 + Math.sin(x / 60 + t * 1.6) * 5 + Math.sin(t * .9) * 6);
        ctx.stroke();
        // Guirlandes
        ctx.strokeStyle = "rgba(60,40,25,.55)"; ctx.lineWidth = 1;
        ctx.beginPath(); st.bulbs.forEach((b, i) => { if (i && st.bulbs[i - 1].x > b.x) ctx.moveTo(b.x, b.y); else ctx.lineTo(b.x, b.y); }); ctx.stroke();
        st.bulbs.forEach(b => {
          const on = phase(t, b.d, .3), fl = .85 + .15 * Math.sin(t * 7 + b.x);
          if (on > 0) glow(b.x, b.y + 6, 26, [[0, "rgba(255,214,130," + (.8 * on * fl).toFixed(3) + ")"], [1, "rgba(255,214,130,0)"]]);
          ctx.fillStyle = on > 0 ? ["#ffe7b0", "#ffd28a", "#fff1d0"][b.hue] : "#8a6a4c";
          ctx.beginPath(); ctx.arc(b.x, b.y + 6, 3.5, 0, 6.283); ctx.fill();
        });
        veil("#43301f", 1 - phase(t, 0, .9));
        veil("#43301f", phase(t, 5, 1));
      },
      captions: () => [["Henné", "title", .9], ["Beach Party", "script", 1.4], ["Dimanche 15 août · Hilton Beach, Tel Aviv", "small", 2]]
    },

    // Houppa : la houppa fleurie, les fleurs éclosent, la caméra avance doucement
    p: {
      duration: 6, end: "#f6f2e9", tone: "dark",
      init() { const geo = houppaGeo(); return { geo, flowers: houppaFlowers(geo), sparkles: makeSparkles(70), petals: makePetals(Math.min(110, w / 6)) }; },
      draw(t, st) {
        const g = st.geo;
        ctx.save(); zoomAt(g.cx, g.top + g.H * .5, 1 + .18 * ease(t / 6));
        seaside(t + 3, st); houppa(t, st, { poles: -2, cloth: -2, flowers: .3 });
        ctx.restore();
        petals(st.petals, t, clamp(t / 1.5));
        veil("#f6f2e9", 1 - phase(t, 0, 1));
        veil("#f6f2e9", phase(t, 5, 1));
      },
      captions: () => [["Houppa", "title", .9], ["Face à la mer", "script", 1.4], ["Mardi 17 août · Cohav Ayam, Césarée", "small", 2]]
    },

    // Chabbat : la nuit tombe, les étoiles apparaissent, les deux bougies s'allument
    s: {
      duration: 6.2, end: "#23221b", tone: "light",
      init() {
        return { stars: Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * .7, r: .5 + Math.random() * 1.3, d: .4 + Math.random() * 2.2, tw: Math.random() * 6.28 })) };
      },
      draw(t, st) {
        const night = phase(t, 0, 2.2);
        const sg = ctx.createLinearGradient(0, 0, 0, h);
        sg.addColorStop(0, mix("#c98f6a", "#14161c", night));
        sg.addColorStop(.6, mix("#e6b784", "#26252a", night));
        sg.addColorStop(1, mix("#f0cf9a", "#3a3326", night));
        ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
        st.stars.forEach(s => {
          const a = phase(t, s.d, .8) * (.6 + .4 * Math.sin(t * 2 + s.tw));
          if (a <= 0) return;
          ctx.fillStyle = "rgba(255,246,220," + a.toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, 6.283); ctx.fill();
        });
        // Table
        const table = h * .8;
        ctx.fillStyle = "#1c1812"; ctx.fillRect(0, table, w, h - table);
        ctx.fillStyle = "rgba(240,225,190,.08)"; ctx.fillRect(0, table, w, 2);
        // Bougies
        const s = Math.min(w, h) / 800, gap = 70 * s + 30;
        [-1, 1].forEach((side, i) => {
          const x = w / 2 + side * gap, ch = 150 * s + 60, cw = 14 * s + 8, top = table - ch;
          const lit = phase(t, 2 + i * .6, .5);
          if (lit > 0) glow(x, top - 10, 260 * s + 120, [[0, "rgba(255,200,120," + (.35 * lit).toFixed(3) + ")"], [1, "rgba(255,200,120,0)"]]);
          // Chandelier
          ctx.fillStyle = "#b9ad90";
          ctx.fillRect(x - cw * 1.2, table - 14 * s - 6, cw * 2.4, 14 * s + 6);
          ctx.fillRect(x - cw * .3, table - 30 * s - 10, cw * .6, 18 * s + 6);
          // Bougie
          const cg = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
          cg.addColorStop(0, "#e9e2d2"); cg.addColorStop(.5, "#fbf7ee"); cg.addColorStop(1, "#d9d0bd");
          ctx.fillStyle = cg; ctx.fillRect(x - cw / 2, top, cw, ch - 30 * s - 10);
          ctx.strokeStyle = "#3a3225"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - 8); ctx.stroke();
          if (lit > 0) {
            const fl = 1 + Math.sin(t * 13 + i) * .06 + Math.sin(t * 7.3 + i * 2) * .05;
            const fh = (34 * s + 14) * lit * fl, fw = (9 * s + 4) * lit;
            ctx.save(); ctx.translate(x + Math.sin(t * 5 + i) * 1.2, top - 6);
            const fg = ctx.createRadialGradient(0, -fh * .35, 0, 0, -fh * .35, fh);
            fg.addColorStop(0, "#fffbe8"); fg.addColorStop(.35, "#ffd87a"); fg.addColorStop(1, "rgba(255,150,60,0)");
            ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.bezierCurveTo(fw, -fh * .2, fw * .6, -fh * .7, 0, -fh);
            ctx.bezierCurveTo(-fw * .6, -fh * .7, -fw, -fh * .2, 0, 0); ctx.fill();
            ctx.restore();
          }
        });
        veil("#23221b", 1 - phase(t, 0, .9));
        veil("#23221b", phase(t, 5.2, 1));
      },
      captions: () => [["Chabbat", "title", 2.6], ["Chabbat Chalom", "script", 3.1], ["20 & 21 août · Tel Aviv", "small", 3.6]]
    }
  };

  function mix(a, b, k) {
    const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",") + ")";
  }

  function setCaptions(list, tone) {
    caption.textContent = "";
    caption.className = "cine-caption tone-" + tone;
    list.forEach(([text, cls, at]) => {
      if (!text) return;
      const p = document.createElement("p");
      p.className = "cap " + cls; p.textContent = text; p.style.transitionDelay = (reduce ? 0 : at) + "s";
      if (cls === "bh") p.lang = "he";
      caption.append(p);
    });
    void caption.offsetWidth;
    caption.classList.add("play");
  }

  // Joue une scène. onCovered est appelé quand l'écran est couvert (pour changer de page dessous).
  function play(name, opts = {}) {
    const sc = scenes[name];
    return new Promise(resolve => {
      resize();
      const st = sc.init();
      setCaptions(sc.captions(opts.guest || ""), sc.tone);
      box.hidden = false;
      box.classList.remove("out");
      requestAnimationFrame(() => box.classList.add("in"));
      let covered = false;
      const t0 = performance.now(), dur = reduce ? 2.5 : sc.duration;
      function frame(now) {
        const t = reduce ? sc.duration * .75 : (now - t0) / 1000;
        if (!covered && (now - t0) > 450) { covered = true; opts.onCovered && opts.onCovered(); }
        ctx.clearRect(0, 0, w, h);
        sc.draw(t, st);
        if ((now - t0) / 1000 < dur) requestAnimationFrame(frame);
        else {
          if (!covered) opts.onCovered && opts.onCovered();
          box.classList.add("out");
          setTimeout(() => { box.hidden = true; box.classList.remove("in", "out"); caption.classList.remove("play"); resolve(); }, 700);
        }
      }
      requestAnimationFrame(frame);
    });
  }

  return { play };
})();

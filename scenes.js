// Scènes dessinées en Canvas. Chaque scène se dessine à un instant t (piloté par
// le défilement, en avant comme en arrière) ; rt est le temps réel, pour ce qui
// bouge tout seul (reflets, pétales, flammes).

// Durée de chaque scène (en secondes de « film »), parcourue au fil du défilement.
const SCENES = { intro: { duration: 9 }, m: { duration: 6 }, h: { duration: 6 }, p: { duration: 6 }, s: { duration: 6.2 }, fin: { duration: 4 } };

function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, st = {}, lastRt = 0;

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
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
    ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  }
  function glow(x, y, r, stops) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function zoomAt(x, y, z) { ctx.translate(x, y); ctx.scale(z, z); ctx.translate(-x, -y); }

  // ---------- Pétales ----------
  function makePetals(n) {
    return Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h, vy: 24 + Math.random() * 40, vx: -10 + Math.random() * 28,
      rot: Math.random() * 6.28, vr: -1.5 + Math.random() * 3, s: 3 + Math.random() * 4.5, sw: Math.random() * 6.28
    }));
  }
  function petals(list, rt, dt, alpha, color) {
    if (alpha <= 0) return;
    list.forEach(p => {
      p.y += p.vy * dt; p.x += (p.vx + Math.sin(rt * 1.3 + p.sw) * 20) * dt; p.rot += p.vr * dt;
      if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
      if (p.x < -20) p.x = w + 20; if (p.x > w + 20) p.x = -20;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = alpha; ctx.fillStyle = color || "#fffdf8";
      ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .6, 0, 0, 6.283); ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  // ---------- Mer ----------
  function makeSparkles(n) {
    return Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), len: 8 + Math.random() * 40, sp: .5 + Math.random() * 1.5, ph: Math.random() * 6.28 }));
  }
  function sea(rt, top, bottom, colors, sparkles, sunX, tint) {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, top, w, bottom - top);
    sparkles.forEach(sp => {
      const y = top + 4 + sp.y * (bottom - top) * .8;
      const near = 1 - Math.min(1, Math.abs(sp.x * w - sunX) / (w * .35));
      const a = (.12 + .55 * near) * (.5 + .5 * Math.sin(rt * sp.sp + sp.ph));
      ctx.strokeStyle = tint + a.toFixed(3) + ")"; ctx.lineWidth = 1.5;
      const x = sp.x * w + Math.sin(rt * .4 + sp.ph) * 6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sp.len * (.6 + near), y); ctx.stroke();
    });
  }

  // ---------- Houppa ----------
  function houppaGeo(o) {
    o = o || {};
    const W = o.W || Math.min(w * .62, 420), H = o.H || Math.min(h * .36, W * .85);
    const cx = w / 2, ground = o.ground || h * .84, depth = W * .14;
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
  function flower(f, p, rt) {
    const k = ease((p - f.d) / .35);
    if (k <= 0) return;
    const r = f.r * k;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot + Math.sin(rt * .8 + f.x) * .05);
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
  function seaside(t, rt, noAisle) {
    const horizon = h * .6, sunX = w * .7;
    const sg = ctx.createLinearGradient(0, 0, 0, horizon);
    sg.addColorStop(0, "#c9c4a4"); sg.addColorStop(.55, "#e9dcc2"); sg.addColorStop(1, "#f6e6c8");
    ctx.fillStyle = sg; ctx.fillRect(0, 0, w, horizon + 1);
    const sy = horizon - h * .02 + (1 - phase(t, 0, 3)) * h * .04;
    glow(sunX, sy, h * .35, [[0, "rgba(255,241,212,.95)"], [.15, "rgba(250,228,188,.55)"], [1, "rgba(250,228,188,0)"]]);
    ctx.fillStyle = "#fff4dc"; ctx.beginPath(); ctx.arc(sunX, sy, Math.min(w, h) * .045, 0, 6.283); ctx.fill();
    sea(rt, horizon, h, ["#a3a98e", "#7d8466", "#5f6547"], st.sparkles, sunX, "rgba(255,243,220,");
    const top = h * .78, tg = ctx.createLinearGradient(0, top, 0, h);
    tg.addColorStop(0, "#e2d4b8"); tg.addColorStop(1, "#cdbb97");
    ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(0, top + h * .03);
    ctx.quadraticCurveTo(w / 2, top - h * .015, w, top + h * .03); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    const g = st.geo;
    if (noAisle) return;
    ctx.fillStyle = "rgba(250,245,234,.75)"; ctx.beginPath();
    ctx.moveTo(g.cx - g.W * .22, g.ground); ctx.lineTo(g.cx + g.W * .22, g.ground);
    ctx.lineTo(g.cx + g.W * .55, h); ctx.lineTo(g.cx - g.W * .55, h); ctx.fill();
  }
  function houppa(t, rt, tm) {
    const g = st.geo;
    const pP = phase(t, tm.poles, 1.6), pC = phase(t, tm.cloth, 1.4), pF = clamp((t - tm.flowers) / 2.4);
    const sway = Math.sin(rt * 1.1) * 4;
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
    st.flowers.forEach(f => flower(f, pF, rt));
  }

  // ---------- Scènes ----------
  const draws = {
    intro(t, rt, dt) {
      const g = st.geo;
      ctx.save(); zoomAt(g.cx, g.top + g.H * .45, 1 + .08 * ease(t / 9));
      seaside(t, rt); houppa(t, rt, { poles: 1, cloth: 2.2, flowers: 2.8 });
      ctx.restore();
      petals(st.petals, rt, dt, clamp((t - 3) / 2));
      veil("#fffdf9", 1 - phase(t, 0, 1.4));   // seule l'ouverture naît du blanc
    },

    // Mairie : des branches d'olivier poussent dans une lumière dorée, quelques feuilles s'envolent
    m(t, rt, dt) {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#f7efdc"); bg.addColorStop(.6, "#f1e2c0"); bg.addColorStop(1, "#e8d3a8");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      glow(w * .8, h * .15, Math.max(w, h) * .7, [[0, "rgba(255,244,210,.9)"], [.3, "rgba(255,232,180,.35)"], [1, "rgba(255,232,180,0)"]]);
      // Rayons de lumière
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const x = w * (.35 + i * .16) + Math.sin(rt * .2 + i) * 10;
        ctx.fillStyle = "rgba(255,240,200,.05)";
        ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + w * .08, -10); ctx.lineTo(x - w * .35, h); ctx.lineTo(x - w * .43, h); ctx.fill();
      }
      ctx.restore();
      // Poussière dorée
      st.dust.forEach(d => {
        const a = (.25 + .35 * Math.sin(rt * d.sp * 3 + d.ph));
        ctx.fillStyle = "rgba(200,165,90," + Math.max(0, a).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(d.x * w + Math.sin(rt * .3 + d.ph) * 8, ((d.y - rt * d.sp * .015) % 1 + 1) % 1 * h, d.s, 0, 6.283); ctx.fill();
      });
      // Branches
      st.branches.forEach(br => {
        const k = easeIO((t - br.d) / 2.6);
        if (k <= 0) return;
        const P = u => {
          const [a0, a1, a2, a3] = br.p, v = 1 - u;
          return [v*v*v*a0[0] + 3*v*v*u*a1[0] + 3*v*u*u*a2[0] + u*u*u*a3[0], v*v*v*a0[1] + 3*v*v*u*a1[1] + 3*v*u*u*a2[1] + u*u*u*a3[1]];
        };
        ctx.lineCap = "round"; ctx.strokeStyle = "#6f5d40";
        const steps = 40;
        for (let i = 0; i < steps * k; i++) {
          const u0 = i / steps, u1 = Math.min(k, (i + 1) / steps), p0 = P(u0), p1 = P(u1);
          ctx.lineWidth = br.wd * (1 - u0 * .75);
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
        }
        br.leaves.forEach(lf => {
          const g = ease((k - lf.u) / .15);
          if (g <= 0) return;
          const p = P(lf.u), q = P(Math.min(1, lf.u + .01)), ang = Math.atan2(q[1] - p[1], q[0] - p[0]) + lf.side * lf.spread;
          const sway = Math.sin(rt * 1.1 + lf.u * 9) * .06, L = lf.L * g;
          ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang + sway);
          ctx.fillStyle = lf.c;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(L * .5, -L * .2, L, 0); ctx.quadraticCurveTo(L * .5, L * .2, 0, 0); ctx.fill();
          ctx.strokeStyle = "rgba(255,255,240,.35)"; ctx.lineWidth = .8;
          ctx.beginPath(); ctx.moveTo(L * .08, 0); ctx.lineTo(L * .9, 0); ctx.stroke();
          ctx.restore();
          if (lf.olive) {
            const o = ease((t - br.d - 2.2 - lf.u) / .6);
            if (o > 0) {
              ctx.fillStyle = lf.olive;
              ctx.beginPath(); ctx.ellipse(p[0] + Math.cos(ang + 1.6) * L * .18, p[1] + Math.sin(ang + 1.6) * L * .18, L * .1 * o, L * .14 * o, ang, 0, 6.283); ctx.fill();
            }
          }
        });
      });
      // Feuilles qui s'envolent
      st.flying.forEach(f => {
        f.x += (f.vx + Math.sin(rt + f.ph) * 12) * dt; f.y += f.vy * dt; f.r += f.vr * dt;
        if (f.y > h + 30) { f.y = -30; f.x = Math.random() * w; }
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r);
        ctx.globalAlpha = .75 * phase(t, 1.5, 1.5); ctx.fillStyle = "#93a06d";
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(f.L * .5, -f.L * .2, f.L, 0); ctx.quadraticCurveTo(f.L * .5, f.L * .2, 0, 0); ctx.fill();
        ctx.restore(); ctx.globalAlpha = 1;
      });
    },

    h(t, rt, dt) {
      const horizon = h * .55, sunX = w * .5, sunY = horizon + phase(t, 0, 6) * h * .03 - h * .03;
      const sg = ctx.createLinearGradient(0, 0, 0, horizon);
      sg.addColorStop(0, "#5b1b28"); sg.addColorStop(.5, "#a13f4a"); sg.addColorStop(1, "#eba882");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, horizon + 1);
      glow(sunX, sunY, h * .45, [[0, "rgba(255,222,180,.95)"], [.2, "rgba(236,150,120,.5)"], [1, "rgba(236,150,120,0)"]]);
      ctx.fillStyle = "#ffe2bd"; ctx.beginPath(); ctx.arc(sunX, sunY, Math.min(w, h) * .09, Math.PI, 0); ctx.fill();
      sea(rt, horizon, h * .78, ["#b8665f", "#6e2a35", "#4a1620"], st.sparkles, sunX, "rgba(255,220,190,");
      const shore = h * .76, wave = x => shore + Math.sin(x / 60 + rt * 1.6) * 5 + Math.sin(rt * .9) * 6;
      ctx.fillStyle = "#e2bfa0"; ctx.beginPath(); ctx.moveTo(0, shore);
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, wave(x));
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      ctx.strokeStyle = "rgba(255,248,232,.7)"; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, wave(x) - 3);
      ctx.stroke();
      ctx.strokeStyle = "rgba(40,10,15,.55)"; ctx.lineWidth = 1; ctx.beginPath();
      st.bulbs.forEach((b, i) => { if (i && st.bulbs[i - 1].x > b.x) ctx.moveTo(b.x, b.y); else ctx.lineTo(b.x, b.y); });
      ctx.stroke();
      st.bulbs.forEach(b => {
        const on = phase(t, b.d, .3), fl = .85 + .15 * Math.sin(rt * 7 + b.x);
        if (on > 0) glow(b.x, b.y + 6, 26, [[0, "rgba(255,214,130," + (.8 * on * fl).toFixed(3) + ")"], [1, "rgba(255,214,130,0)"]]);
        ctx.fillStyle = on > 0 ? ["#ffe7b0", "#ffd28a", "#fff1d0"][b.hue] : "#8a6a4c";
        ctx.beginPath(); ctx.arc(b.x, b.y + 6, 3.5, 0, 6.283); ctx.fill();
      });
    },

    // Houppa : on avance dans l'allée, entre les chaises fleuries et les lanternes, vers la houppa face à la mer
    p(t, rt, dt) {
      const vx = w / 2, horizon = h * .5;
      const z = 1 + .22 * easeIO(t / 6);
      ctx.save(); zoomAt(vx, horizon + h * .1, z);
      const sg = ctx.createLinearGradient(0, 0, 0, horizon);
      sg.addColorStop(0, "#d8d7c2"); sg.addColorStop(.6, "#f3e3c6"); sg.addColorStop(1, "#f8dcb0");
      ctx.fillStyle = sg; ctx.fillRect(-w, -h, w * 3, horizon + h + 1);
      glow(vx, horizon - h * .04, h * .45, [[0, "rgba(255,240,205,.95)"], [.2, "rgba(250,220,170,.45)"], [1, "rgba(250,220,170,0)"]]);
      sea(rt, horizon, horizon + h * .07, ["#b9bca2", "#98a086"], st.sparkles, vx, "rgba(255,244,220,");
      const tg = ctx.createLinearGradient(0, horizon + h * .07, 0, h);
      tg.addColorStop(0, "#ece0c6"); tg.addColorStop(1, "#d6c39c");
      ctx.fillStyle = tg; ctx.fillRect(-w, horizon + h * .07, w * 3, h * 2);

      const g = st.geo;
      houppa(t, rt, { poles: -2, cloth: -2, flowers: .2 });
      // Allée blanche
      const topY = g.ground, topHW = g.W * .2, botHW = w * .3;
      const aisleHW = y => topHW + (botHW - topHW) * (y - topY) / (h - topY);
      ctx.fillStyle = "#fbf7ee"; ctx.beginPath();
      ctx.moveTo(vx - topHW, topY); ctx.lineTo(vx + topHW, topY); ctx.lineTo(vx + botHW, h + 2); ctx.lineTo(vx - botHW, h + 2); ctx.fill();

      // Rangées de chaises, de la plus lointaine à la plus proche
      const N = 7, pF = clamp((t - 1.2) / 2.4);
      for (let i = 0; i < N; i++) {
        const d = (i + 1) / N, y = topY + (h * 1.02 - topY) * Math.pow(d, 1.6), sc = .22 + Math.pow(d, 1.6) * .95;
        const aw = aisleHW(y), cw = Math.min(w, h) * .075 * sc, gap = cw * .35;
        [-1, 1].forEach(side => {
          for (let j = 2; j >= 0; j--) {
            const x = vx + side * (aw + gap + j * cw * 1.3 + cw / 2);
            ctx.fillStyle = "rgba(110,90,55,.12)"; ctx.fillRect(x - cw / 2, y - cw * .05, cw, cw * .12);
            ctx.fillStyle = "#fffdf8"; ctx.strokeStyle = "rgba(120,100,60,.35)"; ctx.lineWidth = Math.max(.5, sc);
            ctx.fillRect(x - cw / 2, y - cw * .55, cw, cw * .14); ctx.strokeRect(x - cw / 2, y - cw * .55, cw, cw * .14);
            ctx.beginPath(); ctx.moveTo(x - cw / 2, y - cw * .55); ctx.lineTo(x - cw / 2, y - cw * 1.35);
            ctx.quadraticCurveTo(x, y - cw * 1.55, x + cw / 2, y - cw * 1.35); ctx.lineTo(x + cw / 2, y - cw * .55); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillRect(x - cw * .45, y - cw * .45, cw * .1, cw * .45); ctx.fillRect(x + cw * .35, y - cw * .45, cw * .1, cw * .45);
            if (j === 0) {
              // Bouquet blanc sur la chaise côté allée
              const fx = x - side * cw * .45, fy = y - cw * 1.2;
              [[0, 0, .34], [-.22, .18, .26], [.2, .2, .24]].forEach(([ox, oy, r], q) =>
                flower({ x: fx + ox * cw, y: fy + oy * cw, r: r * cw, d: (N - 1 - i) * .06 + q * .05, rot: i + q, leaf: q === 1 }, pF, rt));
              // Lanterne au bord de l'allée, allumée de la plus proche à la plus lointaine
              const lx = vx + side * (aw - cw * .15), lh = cw * .9, lw = cw * .45;
              const on = phase(t, .6 + (N - 1 - i) * .3, .4), fl = .85 + .15 * Math.sin(rt * 9 + i + side);
              if (on > 0) glow(lx, y - lh * .5, cw * 2.2, [[0, "rgba(255,210,130," + (.55 * on * fl).toFixed(3) + ")"], [1, "rgba(255,210,130,0)"]]);
              ctx.fillStyle = "rgba(255,252,240,.55)"; ctx.strokeStyle = "rgba(120,100,60,.5)";
              ctx.fillRect(lx - lw / 2, y - lh, lw, lh); ctx.strokeRect(lx - lw / 2, y - lh, lw, lh);
              ctx.fillStyle = on > 0 ? "#ffe6a8" : "#efe6d2";
              ctx.beginPath(); ctx.ellipse(lx, y - lh * .45, lw * .16, lh * .16 * (on > 0 ? fl : .5), 0, 0, 6.283); ctx.fill();
            }
          }
        });
      }
      ctx.restore();
    },

    // Réponse : la mer calme au lever du jour
    fin(t, rt) {
      const horizon = h * .58, sunY = horizon - h * .02 - ease(t / 4) * h * .06;
      const sg = ctx.createLinearGradient(0, 0, 0, horizon);
      sg.addColorStop(0, "#efece2"); sg.addColorStop(.6, "#f6ead4"); sg.addColorStop(1, "#f8e2bd");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, horizon + 1);
      glow(w / 2, sunY, h * .45, [[0, "rgba(255,244,215,.95)"], [.2, "rgba(252,228,185,.45)"], [1, "rgba(252,228,185,0)"]]);
      ctx.fillStyle = "#fff6e2"; ctx.beginPath(); ctx.arc(w / 2, sunY, Math.min(w, h) * .05, 0, 6.283); ctx.fill();
      sea(rt, horizon, h * .8, ["#cfd0bb", "#b3b79c", "#9aa085"], st.sparkles, w / 2, "rgba(255,246,225,");
      const shore = h * .78, wave = x => shore + Math.sin(x / 80 + rt * 1.1) * 4;
      ctx.fillStyle = "#efe4cc"; ctx.beginPath(); ctx.moveTo(0, shore);
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, wave(x));
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    },

    s(t, rt, dt) {
      const night = phase(t, 0, 2.2);
      const sg = ctx.createLinearGradient(0, 0, 0, h);
      sg.addColorStop(0, mix("#d9a47c", "#5a6480", night));
      sg.addColorStop(.6, mix("#f0c797", "#b3a2a8", night));
      sg.addColorStop(1, mix("#f6dcb0", "#ecd0a4", night));
      ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
      st.stars.forEach(s => {
        const a = phase(t, s.d, .8) * (.6 + .4 * Math.sin(rt * 2 + s.tw)) * (1 - s.y * 1.3);
        if (a <= 0) return;
        ctx.fillStyle = "rgba(255,246,220," + a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, 6.283); ctx.fill();
      });
      const table = h * .8;
      ctx.fillStyle = "#f7f2e6"; ctx.fillRect(0, table, w, h - table);
      ctx.fillStyle = "#b9a46d"; ctx.fillRect(0, table + 10, w, 1.5);
      const s = Math.min(w, h) / 800, gap = 70 * s + 30;
      [-1, 1].forEach((side, i) => {
        const x = w / 2 + side * gap, ch = 150 * s + 60, cw = 14 * s + 8, top = table - ch;
        const lit = phase(t, 2 + i * .6, .5);
        if (lit > 0) glow(x, top - 10, 260 * s + 120, [[0, "rgba(255,200,120," + (.35 * lit).toFixed(3) + ")"], [1, "rgba(255,200,120,0)"]]);
        ctx.fillStyle = "#b9ad90";
        ctx.fillRect(x - cw * 1.2, table - 14 * s - 6, cw * 2.4, 14 * s + 6);
        ctx.fillRect(x - cw * .3, table - 30 * s - 10, cw * .6, 18 * s + 6);
        const cg = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
        cg.addColorStop(0, "#e9e2d2"); cg.addColorStop(.5, "#fbf7ee"); cg.addColorStop(1, "#d9d0bd");
        ctx.fillStyle = cg; ctx.fillRect(x - cw / 2, top, cw, ch - 30 * s - 10);
        ctx.strokeStyle = "#3a3225"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - 8); ctx.stroke();
        if (lit > 0) {
          const fl = 1 + Math.sin(rt * 13 + i) * .06 + Math.sin(rt * 7.3 + i * 2) * .05;
          const fh = (34 * s + 14) * lit * fl, fw = (9 * s + 4) * lit;
          ctx.save(); ctx.translate(x + Math.sin(rt * 5 + i) * 1.2, top - 6);
          const fg = ctx.createRadialGradient(0, -fh * .35, 0, 0, -fh * .35, fh);
          fg.addColorStop(0, "#fffbe8"); fg.addColorStop(.35, "#ffd87a"); fg.addColorStop(1, "rgba(255,150,60,0)");
          ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.bezierCurveTo(fw, -fh * .2, fw * .6, -fh * .7, 0, -fh);
          ctx.bezierCurveTo(-fw * .6, -fh * .7, -fw, -fh * .2, 0, 0); ctx.fill();
          ctx.restore();
        }
      });
    }
  };

  function init(name) {
    if (name === "intro") {
      const geo = houppaGeo();
      st = { geo, flowers: houppaFlowers(geo), sparkles: makeSparkles(70), petals: makePetals(Math.min(90, w / 7)) };
    } else if (name === "p") {
      const W = Math.min(w * .34, 250);
      const geo = houppaGeo({ W, H: Math.min(h * .19, W * .85), ground: h * .6 });
      st = { geo, flowers: houppaFlowers(geo), sparkles: makeSparkles(50) };
    } else if (name === "m") {
      seed = 21;
      const leafCols = ["#7d8a5a", "#93a06d", "#a9b387", "#b8c0a0", "#87945f"];
      const mk = (pts, d, wd, n) => ({ d, wd, p: pts.map(([x, y]) => [x * w, y * h]),
        leaves: Array.from({ length: n }, (_, i) => ({
          u: (i + 1) / (n + 1), side: i % 2 ? 1 : -1, spread: .5 + rand() * .35,
          L: Math.min(w, h) * .075 * (.7 + rand() * .5) * (1 - (i / n) * .35),
          c: leafCols[Math.floor(rand() * leafCols.length)], olive: i % 4 === 2 ? (rand() < .5 ? "#5b5f3a" : "#4b3a4a") : null })) });
      st = {
        branches: [
          mk([[-.05, .52], [.25, .4], [.45, .6], [.78, .5]], .2, 7, 22),
          mk([[1.05, .9], [.75, 1], [.6, .74], [.3, .8]], .8, 6, 18),
          mk([[1.05, .3], [.9, .27], [.85, .42], [.66, .38]], 1.4, 4, 10)
        ],
        dust: Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random(), s: .6 + Math.random() * 1.6, sp: .2 + Math.random() * .6, ph: Math.random() * 6.28 })),
        flying: Array.from({ length: 6 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: -6 + Math.random() * 12, vy: 18 + Math.random() * 20, r: Math.random() * 6, vr: -.8 + Math.random() * 1.6, L: 12 + Math.random() * 10, ph: Math.random() * 6 }))
      };
    } else if (name === "fin") {
      st = { sparkles: makeSparkles(80) };
    } else if (name === "h") {
      const bulbs = [];
      [[-.05, .1, 1.05, .2, .12, 16, 0], [-.05, .26, 1.05, .16, .09, 14, .5]].forEach(([x1, y1, x2, y2, sag, n, d]) => {
        for (let i = 0; i <= n; i++) {
          const u = i / n;
          bulbs.push({ x: (x1 + (x2 - x1) * u) * w, y: (y1 + (y2 - y1) * u + sag * 4 * u * (1 - u)) * h, d: .8 + d + u * 1.2, hue: i % 3 });
        }
      });
      st = { sparkles: makeSparkles(80), bulbs };
    } else {
      st = { stars: Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * .7, r: .5 + Math.random() * 1.3, d: .4 + Math.random() * 2.2, tw: Math.random() * 6.28 })) };
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
      const dt = lastRt ? Math.min(.05, rt - lastRt) : 0; lastRt = rt;
      ctx.clearRect(0, 0, w, h);
      draws[name](t, rt, dt);
    }
  };
}

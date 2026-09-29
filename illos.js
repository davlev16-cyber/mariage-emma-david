// Illustrations au trait fin (SVG), dans l'esprit épuré du site.
// Chaque trait se dessine quand l'illustration apparaît à l'écran (voir site.css : .illo).
// Classes : .ln = trait kaki qui se dessine ; .fl = aplat sauge très doux ; .flame = flamme.

const ILLOS = (function () {
  const f = n => Math.round(n * 10) / 10;

  // Branche d'olivier : tige courbe + feuilles alternées (+ quelques olives)
  function sprig(x0, y0, cx, cy, x1, y1, n, L, olives) {
    let out = `<path class="ln" d="M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}"/>`;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      const a = Math.atan2(ty, tx) + (i % 2 ? .75 : -.75);
      const len = L * (1 - t * .35), wd = len * .22;
      const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
      const ex = px + dx * len, ey = py + dy * len, mx = px + dx * len / 2, my = py + dy * len / 2;
      const d = `M${f(px)} ${f(py)} Q${f(mx + nx * wd)} ${f(my + ny * wd)} ${f(ex)} ${f(ey)} Q${f(mx - nx * wd)} ${f(my - ny * wd)} ${f(px)} ${f(py)}`;
      out += `<path class="fl" d="${d}"/><path class="ln" d="${d}"/>`;
      if (olives && i % 4 === 2) out += `<ellipse class="fl olive" cx="${f(px - nx * 6)}" cy="${f(py - ny * 6)}" rx="3.2" ry="4.4" transform="rotate(${f(a * 57.3)} ${f(px - nx * 6)} ${f(py - ny * 6)})"/>`;
    }
    return out;
  }

  // Petites vagues
  function waves(x0, x1, y, amp, step) {
    let d = `M${x0} ${y}`;
    for (let x = x0; x < x1; x += step) d += ` q${step / 4} ${-amp} ${step / 2} 0 t${step / 2} 0`;
    return `<path class="ln soft" d="${d}"/>`;
  }

  // Palmier : tronc bagué + palmes qui retombent, avec leurs folioles
  function palm(bx, by, tx, ty) {
    let out = `<path class="ln" d="M${bx - 3} ${by} Q${bx + 2} ${(by + ty) / 2} ${tx - 3} ${ty}"/><path class="ln" d="M${bx + 3} ${by} Q${bx + 8} ${(by + ty) / 2} ${tx + 3} ${ty}"/>`;
    for (let i = 1; i < 8; i++) {
      const t = i / 8, x = bx + (tx - bx) * t + 2.5, y = by + (ty - by) * t;
      out += `<path class="ln" d="M${f(x - 4)} ${f(y)} q4 -2 8 0"/>`;
    }
    const fronds = [[-62, 22], [-46, -2], [-20, -20], [8, -26], [34, -14], [56, 6], [64, 28]];
    fronds.forEach(([dx, dy]) => {
      const ex = tx + dx, ey = ty + dy + 8, cx = tx + dx * .5, cy = ty + dy - 14;
      out += `<path class="ln" d="M${tx} ${ty} Q${cx} ${cy} ${ex} ${ey}"/>`;
      for (let k = 1; k <= 5; k++) {
        const t = k / 6, px = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * cx + t * t * ex, py = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * cy + t * t * ey;
        out += `<path class="ln" d="M${f(px)} ${f(py)} l${f(dx * .06)} 9"/>`;
      }
    });
    return out;
  }

  // Bougie de Chabbat sur son chandelier, avec sa flamme
  function candle(x) {
    return `
      <circle class="glow" cx="${x}" cy="40" r="26"/>
      <path class="ln" d="M${x - 20} 162 Q${x} 150 ${x + 20} 162"/>
      <path class="ln" d="M${x - 4} 154 L${x - 4} 130 M${x + 4} 154 L${x + 4} 130"/>
      <path class="ln" d="M${x - 12} 130 L${x + 12} 130 L${x + 8} 122 L${x - 8} 122 Z"/>
      <path class="fl" d="M${x - 6} 122 L${x - 6} 58 L${x + 6} 58 L${x + 6} 122 Z"/>
      <path class="ln" d="M${x - 6} 122 L${x - 6} 58 L${x + 6} 58 L${x + 6} 122"/>
      <path class="ln" d="M${x} 58 L${x} 51"/>
      <path class="flame" d="M${x} 49 C${x + 6} 41 ${x + 4} 31 ${x} 23 C${x - 4} 31 ${x - 6} 41 ${x} 49 Z"/>`;
  }

  const svg = (vb, body, label) => `<svg class="illo" viewBox="${vb}" role="img" aria-label="${label}" data-reveal>${body}</svg>`;

  return {
    // Couverture : deux branches d'olivier en couronne
    hero: () => svg("0 0 240 90",
      sprig(120, 78, 70, 80, 16, 30, 7, 16, false) + sprig(120, 78, 170, 80, 224, 30, 7, 16, false),
      "Deux branches d'olivier"),
    // Mairie : une branche d'olivier
    m: () => svg("0 0 240 170", sprig(30, 150, 90, 60, 214, 40, 12, 22, true), "Une branche d'olivier"),
    // Henné : palmier, soleil couchant et vagues
    h: () => svg("0 0 240 180",
      `<path class="fl" d="M126 132 A28 28 0 0 1 182 132 Z"/><path class="ln" d="M126 132 A28 28 0 0 1 182 132"/>` +
      `<path class="ln" d="M20 132 L220 132"/>` + waves(30, 214, 146, 3, 24) + waves(52, 196, 158, 2.5, 24) + waves(80, 172, 169, 2, 24) +
      palm(78, 172, 94, 70),
      "Un palmier au coucher du soleil, face à la mer"),
    // Houppa : quatre poteaux, un voile, quelques fleurs, la mer derrière
    p: () => svg("0 0 240 180",
      `<path class="ln soft" d="M12 98 L228 98"/>` + waves(18, 222, 110, 2.5, 26) + waves(40, 200, 121, 2, 26) +
      `<path class="ln" d="M20 162 L220 162"/>` +
      `<path class="ln" d="M86 152 L86 66 M154 152 L154 66"/>` +
      `<path class="fl" d="M62 58 L86 66 L154 66 L178 58 Q120 76 62 58 Z"/>` +
      `<path class="ln" d="M62 58 Q120 76 178 58 M86 66 L154 66 M62 58 L86 66 M178 58 L154 66"/>` +
      `<path class="ln" d="M62 58 L62 162 M178 58 L178 162"/>` +
      `<path class="ln" d="M62 58 Q52 92 58 126 M178 58 Q188 92 182 126"/>` +
      [[62, 56], [70, 60], [56, 62], [178, 56], [170, 60], [184, 62]].map(([x, y]) => `<circle class="fl" cx="${x}" cy="${y}" r="4.5"/><circle class="ln" cx="${x}" cy="${y}" r="4.5"/>`).join("") +
      `<path class="ln" d="M106 180 L114 162 M134 180 L126 162"/>`,
      "Une houppa face à la mer"),
    // Chabbat : deux bougies allumées
    s: () => svg("0 0 240 180", `<path class="ln" d="M24 162 L216 162"/>` + candle(92) + candle(148), "Deux bougies de Chabbat allumées"),
    // Réponse : un petit brin
    rsvp: () => svg("0 0 240 70", sprig(40, 56, 110, 20, 200, 40, 8, 14, false), "Un brin d'olivier")
  };
})();

// Prépare le tracé : longueur de chaque trait et léger décalage de départ
function prepareIllos(root) {
  root.querySelectorAll(".illo").forEach(svg => {
    const lines = [...svg.querySelectorAll(".ln")];
    lines.forEach((p, i) => {
      let len = 300;
      try { len = Math.ceil(p.getTotalLength()) + 2; } catch (e) {}
      p.style.setProperty("--len", len);
      p.style.setProperty("--dl", (i / Math.max(1, lines.length) * 1.4).toFixed(2) + "s");
    });
  });
}

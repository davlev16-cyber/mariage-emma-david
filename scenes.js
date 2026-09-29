// Scènes en photographies réelles (libres de droits, Pixabay Content License),
// étalonnées aux couleurs de chaque page et animées comme au cinéma :
// mouvements de caméra lents (zoom, travelling) pilotés par le défilement,
// en avant comme en arrière. rt est le temps réel, pour les lumières qui vivent.

// Durée de chaque scène (en secondes de « film »), parcourue au fil du défilement.
const SCENES = { intro: { duration: 9 }, m: { duration: 6 }, h: { duration: 6 }, p: { duration: 6 }, s: { duration: 6.2 }, fin: { duration: 4 } };

// Photos chargées dès l'ouverture, pour des transitions sans attente
const PHOTOS = (() => {
  const files = { intro: "photos/ouverture.jpg", h: "photos/henne.jpg", p: "photos/houppa.jpg", s: "photos/chabbat.jpg", fin: "photos/reponse.jpg" };
  const out = {};
  Object.entries(files).forEach(([k, src]) => {
    const img = new Image(); img.decoding = "async"; img.src = src;
    out[k] = img;
  });
  return out;
})();

function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0;

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = v => 1 - Math.pow(1 - clamp(v), 3);
  const easeIO = v => { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };

  function glow(x, y, r, stops) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function veil(color, a) {
    if (a <= 0) return;
    ctx.globalAlpha = clamp(a); ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
  }
  // Vignettage doux, comme une optique de cinéma
  function vignette(a) {
    const g = ctx.createRadialGradient(w / 2, h * .48, Math.min(w, h) * .35, w / 2, h * .5, Math.max(w, h) * .85);
    g.addColorStop(0, "rgba(20,15,10,0)"); g.addColorStop(1, "rgba(20,15,10," + a + ")");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  // Dessine la photo en plein écran (recadrage « cover »), avec un zoom et un point
  // de visée (fx, fy en proportion de l'image) : c'est la caméra.
  function shot(img, zoom, fx, fy, fallback) {
    if (!img || !img.complete || !img.naturalWidth) { ctx.fillStyle = fallback; ctx.fillRect(0, 0, w, h); return null; }
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(w / iw, h / ih) * zoom;
    const dw = iw * s, dh = ih * s;
    let x = w / 2 - fx * dw, y = h / 2 - fy * dh;
    x = Math.min(0, Math.max(w - dw, x)); y = Math.min(0, Math.max(h - dh, y));   // jamais de bord vide
    ctx.drawImage(img, x, y, dw, dh);
    return { x, y, s };
  }

  const draws = {
    // Ouverture : vue du ciel sur la plage ; le drone descend et glisse le long du rivage
    intro(t) {
      const k = easeIO(t / 9);
      shot(PHOTOS.intro, lerp(1.45, 1.06, k), lerp(.34, .5, k), lerp(.3, .55, k), "#cfe2d8");
      ctx.fillStyle = "rgba(255,214,160,.08)"; ctx.fillRect(0, 0, w, h);     // lumière dorée
      vignette(.2);
      veil("#fbf6ea", 1 - ease(t / 1.6));                                       // naît du crème de l'ouverture
    },

    // Mairie : un fond écru tout simple, avec une lumière douce
    m() {
      ctx.fillStyle = "#f3ecdd"; ctx.fillRect(0, 0, w, h);
      glow(w / 2, h * .42, Math.max(w, h) * .75, [[0, "rgba(255,252,244,.85)"], [1, "rgba(255,252,244,0)"]]);
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .4, w / 2, h / 2, Math.max(w, h) * .8);
      v.addColorStop(0, "rgba(200,185,150,0)"); v.addColorStop(1, "rgba(200,185,150,.18)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    },

    // Henné : palmier au coucher du soleil ; la caméra s'approche lentement du soleil
    h(t, rt) {
      const k = easeIO(t / 6);
      const r = shot(PHOTOS.h, lerp(1.02, 1.16, k), lerp(.5, .6, k), lerp(.55, .68, k), "#6e2432");
      if (r) {
        const img = PHOTOS.h, sx = r.x + img.naturalWidth * r.s * .675, sy = r.y + img.naturalHeight * r.s * .77;
        const pulse = .5 + .5 * Math.sin(rt * .9);
        glow(sx, sy, Math.min(w, h) * (.28 + .03 * pulse), [[0, "rgba(255,210,170," + (.35 + .1 * pulse).toFixed(3) + ")"], [1, "rgba(255,210,170,0)"]]);
      }
      vignette(.3);
    },

    // Houppa : face à la mer ; la caméra avance doucement dans l'allée vers la houppa
    p(t) {
      const k = easeIO(t / 6);
      shot(PHOTOS.p, lerp(1.02, 1.28, k), .5, lerp(.56, .6, k), "#e9dfcb");
      ctx.fillStyle = "rgba(255,220,170,.06)"; ctx.fillRect(0, 0, w, h);
      vignette(.2);
    },

    // Chabbat : deux bougies allumées ; la flamme vit, la caméra se rapproche
    s(t, rt) {
      const k = easeIO(t / 6.2);
      shot(PHOTOS.s, lerp(1.04, 1.16, k), .5, .52, "#5a3a1e");
      const f = .5 + .5 * Math.sin(rt * 7.3) * Math.sin(rt * 3.1 + 1);
      glow(w / 2, h * .48, Math.max(w, h) * .55, [[0, "rgba(255,196,120," + (.1 + .06 * f).toFixed(3) + ")"], [1, "rgba(255,196,120,0)"]]);
      vignette(.32);
    },

    // Réponse : vagues au lever du jour ; la caméra recule doucement
    fin(t) {
      const k = easeIO(t / 4);
      shot(PHOTOS.fin, lerp(1.18, 1.02, k), .5, lerp(.45, .52, k), "#dfe6df");
      vignette(.14);
    }
  };

  let current = "";
  return {
    resize(name) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth || innerWidth; h = canvas.clientHeight || innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      current = name;
    },
    draw(name, t, rt) {
      if (name !== current || !w) this.resize(name);
      ctx.clearRect(0, 0, w, h);
      draws[name](t, rt);
    }
  };
}

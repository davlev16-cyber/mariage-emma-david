// L'invitation en une seule page qui défile : les cinématiques avancent et
// reculent avec la molette ou le doigt. Sans action de l'invité, la page
// défile toute seule jusqu'à la réponse.

(function () {
  const code = inviteCode();
  const invite = decodeInvite(code);
  const story = document.getElementById("story");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  document.getElementById("sound").addEventListener("click", () => Music.toggle());

  // ----- Ouverture : un toucher de l'écran lance ensemble la musique et la cinématique -----
  // (les téléphones n'autorisent le son qu'après un toucher)
  const gate = document.getElementById("gate");
  let opened = false;
  document.body.classList.add("locked");
  function openInvitation() {
    if (opened) return;
    opened = true;
    Music.start();
    gate.classList.add("open");
    document.body.classList.remove("locked");
    if (defile) defile.demarre(500);
    setTimeout(() => gate.remove(), 1100);
  }
  gate.addEventListener("click", openInvitation);
  gate.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openInvitation(); } });
  // Si le navigateur joue déjà la musique sans toucher (ordinateur), l'invitation s'ouvre seule
  setTimeout(() => { if (Music.playing()) openInvitation(); }, 1800);

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  // ----- Sections -----
  // Chaque chapitre = une zone de défilement pour sa cinématique (avec ses légendes)
  // puis sa page de texte, posée sur le décor. Le décor est dessiné dans un seul
  // canvas fixe (#stage) derrière toute la page.
  const chapters = [];

  function cine(name, heightVh, captions, tone) {
    // chaque cinématique tient sur un écran, dans le flux normal de la page
    const sec = el("section", "cine");
    const stick = el("div", "stick");
    const caps = el("div", "caps caps-" + name + " tone-" + tone);
    captions.forEach(([text, cls, at]) => {
      if (!text) return;
      const p = el("p", "cap " + cls, text); p.dataset.at = at;
      if (cls === "bh") p.lang = "he";
      caps.append(p);
    });
    stick.append(caps);
    sec.append(stick);
    story.append(sec);
    chapters.push({ name, sec, caps: [...caps.children] });
  }

  function content(id) {
    const sec = el("section", "content t-" + id);
    if (chapters.length) chapters[chapters.length - 1].content = sec;
    sec.id = "s-" + id;
    const inner = el("div", "inner");
    sec.append(inner);
    story.append(sec);
    return inner;
  }

  function buildCover(p) {
    const bh = el("p", "bh", "ב״ה"); bh.lang = "he";
    p.append(bh, el("p", "eyebrow", "Avec la bénédiction de leurs familles"),
      el("h1", "names", "Emma & David"),
      el("p", "lead", "ont la joie de vous convier à leur mariage"),
      el("p", "guest", invite.name || null));
    // Les dates de l'invité, écrites à la main comme sur les pages des célébrations
    const list = el("ul", "hand");
    invite.events.forEach(k => {
      const li = el("li");
      li.append(el("span", "lbl", EVENTS[k].name), el("span", "val", EVENTS[k].date));
      list.append(li);
    });
    p.append(list, el("p", "when", "Juillet & août 2027 · Marseille & Israël"));
  }

  function buildEvent(p, k) {
    const ev = EVENTS[k];
    // Peu de texte : titre, date, une phrase éventuelle, puis le lieu et l'horaire écrits à la main
    p.append(el("h2", "ev-title", ev.name), el("p", "ev-tag", ev.tagline), el("p", "ev-date", ev.date));
    if (ev.intro) p.append(el("p", "ev-intro", ev.intro));
    const list = el("ul", "hand");
    ev.details.forEach(([a, b]) => {
      const li = el("li");
      li.append(el("span", "lbl", a), el("span", "val", b));
      list.append(li);
    });
    const map = el("a", "map-link", "Voir sur la carte");
    map.href = mapUrl(ev); map.target = "_blank"; map.rel = "noopener";
    p.append(list, map);
  }

  function buildRsvp(p) {
    p.append(el("h2", "ev-title", "Votre réponse"));
    const dl = el("p", "deadline"); dl.innerHTML = "Merci de répondre avant le <strong>samedi 19 juin 2027</strong>.";
    p.append(dl);
    const form = el("form", "rsvp"); form.noValidate = true;
    invite.events.forEach(k => {
      const fs = el("fieldset");
      fs.append(el("legend", "", EVENTS[k].name + " — " + EVENTS[k].shortDate));
      const ch = el("div", "choices");
      [["Oui", "Je serai présent(e)"], ["Non", "Je ne pourrai pas venir"]].forEach(([v, label]) => {
        const lab = el("label", "choice");
        const input = document.createElement("input");
        input.type = "radio"; input.name = k; input.value = v; input.id = k + "-" + v;
        lab.append(input, el("span", "", label));
        ch.append(lab);
      });
      fs.append(ch); form.append(fs);
    });
    // Nombre de personnes, si l'invitation est pour plusieurs
    let nbSel = null;
    if (invite.count > 1) {
      const nl = el("label", "field", "Nombre de personnes"); nl.htmlFor = "nb";
      nbSel = document.createElement("select"); nbSel.id = "nb"; nbSel.className = "nb";
      for (let i = invite.count; i >= 1; i--) { const o = document.createElement("option"); o.value = i; o.textContent = i; nbSel.append(o); }
      form.append(nl, nbSel);
    }
    const lab = el("label", "field", "Un petit mot pour les mariés (facultatif)"); lab.htmlFor = "message";
    const ta = document.createElement("textarea"); ta.id = "message"; ta.rows = 3; ta.maxLength = 500;
    const err = el("p", "error"); err.hidden = true;
    const btn = el("button", "submit", "Envoyer ma réponse"); btn.type = "submit";
    form.append(lab, ta, err, btn);
    const thanks = el("div", "thanks"); thanks.hidden = true;
    const tt = el("p", "thanks-text", "Votre réponse a bien été envoyée.");
    const edit = el("button", "link", "Modifier ma réponse"); edit.type = "button";
    thanks.append(el("p", "thanks-title", "Merci !"), tt, edit, el("p", "sign", "Emma & David"));
    p.append(form, thanks);

    const key = "rsvp:" + code;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved) {
        invite.events.forEach(k => { const i = document.getElementById(k + "-" + saved[k]); if (i) i.checked = true; });
        ta.value = saved.message || ""; if (nbSel && saved.nb) nbSel.value = saved.nb; form.hidden = true; thanks.hidden = false;
        tt.textContent = "Votre réponse a bien été enregistrée.";
      }
    } catch (e) {}
    edit.addEventListener("click", () => { thanks.hidden = true; form.hidden = false; });
    form.addEventListener("submit", async e => {
      e.preventDefault(); err.hidden = true;
      const answer = { code, nom: invite.name, nb: nbSel ? Number(nbSel.value) : invite.count, message: ta.value.trim() };
      const missing = [];
      invite.events.forEach(k => {
        const c = form.querySelector('input[name="' + k + '"]:checked');
        if (c) answer[k] = c.value; else missing.push(EVENTS[k].name);
      });
      if (missing.length) { err.textContent = "Merci d'indiquer votre présence pour : " + missing.join(", ") + "."; err.hidden = false; return; }
      btn.disabled = true; btn.textContent = "Envoi…";
      try {
        if (!SCRIPT_URL) throw new Error("not configured");
        await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(answer) });
        try { localStorage.setItem(key, JSON.stringify(answer)); } catch (x) {}
        form.hidden = true; thanks.hidden = false; tt.textContent = "Votre réponse a bien été envoyée.";
      } catch (x) {
        err.textContent = "La réponse n'a pas pu être envoyée. Vérifiez votre connexion internet et réessayez."; err.hidden = false;
      } finally { btn.disabled = false; btn.textContent = "Envoyer ma réponse"; }
    });
  }

  // ----- Construction de l'histoire -----
  if (!invite) {
    cine("intro", 260, [["ב״ה", "bh", .8], ["Emma & David", "names", 5.2], ["Août 2027", "small", 5.9]], "dark");
    const p = content("cover");
    p.append(el("h1", "names", "Emma & David"),
      el("p", "lead", "Cette invitation s'ouvre avec le lien personnel que vous avez reçu. Si vous l'avez perdu, demandez-le à Emma & David."));
  } else {
    cine("intro", 260, [
      ["ב״ה", "bh", .8], [invite.name, "small", 4.8], ["Emma & David", "names", 5.2], ["Marseille & Israël · 2027", "small", 5.9]
    ], "dark");
    document.getElementById("gate-guest").textContent = invite.name;
    buildCover(content("cover"));
    // sur la cinématique de chaque célébration : seulement son nom (les informations sont sur la page qui suit)
    const caps = {
      m: [["Mairie", "title", 1.6]],
      h: [["Henné", "title", 1.6]],
      p: [["Houppa", "title", 1.6]],
      s: [["Chabbat", "title", 2.6]]
    };
    invite.events.forEach(k => {
      cine(k, 200, caps[k], k === "p" || k === "m" ? "dark" : "light");
      buildEvent(content(k), k);
    });
    cine("fin", 150, [["Votre réponse", "title", 1.4], ["Avant le 19 juin 2027", "small", 1.9]], "dark");
    buildRsvp(content("rsvp"));
  }
  story.append(el("footer", "foot", "Emma & David · 2027"));

  // ----- Le décor -----
  // Un canvas hors écran par décor ; le canvas fixe de la page compose le décor courant.
  // Le décor ne dépend jamais de la position exacte du doigt : chaque cinématique joue dans le temps quand sa partie
  // occupe le milieu de l'écran, et un changement de décor se fait toujours en fondu (dans un sens comme dans l'autre).
  // Rien ne peut donc sauter pendant un défilement au doigt.
  const stage = document.getElementById("stage");
  const sctx = stage.getContext("2d");
  const renderers = {};
  function rendererFor(name) {
    if (!renderers[name]) {
      const c = document.createElement("canvas");
      renderers[name] = { canvas: c, r: createRenderer(c) };
    }
    return renderers[name];
  }
  // le décor fait la taille de la « grande fenêtre » (CSS 100lvh) : il n'est redimensionné qu'à la rotation de l'écran,
  // jamais quand la barre du navigateur apparaît ou disparaît en plein défilement
  const TELEPHONE = matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 700;
  let tailleW = 0, tailleH = 0;
  function sizeStage(force) {
    const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight;
    if (!force && w === tailleW && Math.abs(h - tailleH) < h * .2) return;
    tailleW = w; tailleH = h;
    const dpr = Math.min(TELEPHONE ? 1.5 : 2, window.devicePixelRatio || 1);
    window.__tailleScene = { w, h, dpr };
    stage.width = w * dpr; stage.height = h * dpr;
    Object.keys(renderers).forEach(n => renderers[n].r.resize(n));
  }
  sizeStage(true);
  let attente;
  addEventListener("resize", () => { clearTimeout(attente); attente = setTimeout(() => sizeStage(), 150); });

  function sceneImage(name, t, rt) {
    const R = rendererFor(name);
    R.r.draw(name, t, rt);
    return R.canvas;
  }
  function blit(img, alpha, zoom) {
    const W = stage.width, Hs = stage.height;
    sctx.globalAlpha = alpha;
    const dw = W * zoom, dh = Hs * zoom;
    sctx.drawImage(img, (W - dw) / 2, (Hs - dh) / 2, dw, dh);
    sctx.globalAlpha = 1;
  }
  const easeIO = v => { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
  const FONDU = 1.8;   // durée du fondu enchaîné entre deux décors (s)

  // hauteur d'écran STABLE (celle du décor, 100lvh) : elle ne change pas quand la barre du navigateur apparaît ou disparaît
  const H = () => stage.clientHeight || innerHeight;
  // chapitre courant : celui dont la partie occupe le milieu de l'écran (sa cinématique, puis sa page de texte) ;
  // on ne change de chapitre que lorsque le nouveau a nettement pris le milieu (marge contre les allers-retours du doigt)
  function chapitreAuMilieu() {
    const Hh = H(), centre = scrollY + Hh * .5;
    let i = 0;
    chapters.forEach((c, j) => { if (centre >= c.sec.offsetTop) i = j; });
    if (cur < 0 || i === cur) return i;
    const marge = Hh * .12;
    if (i > cur && centre < chapters[i].sec.offsetTop + marge) return cur;
    if (i < cur && centre > chapters[cur].sec.offsetTop - marge) return cur;
    return i;
  }
  let cur = -1, prev = -1, bascule = 0, souvenir = null;
  const horloges = [];   // moment où chaque cinématique a commencé
  const tScene = (j, rt) => horloges[j] === undefined ? 0 : Math.min(rt - horloges[j], SCENES[chapters[j].name].duration);
  const avancement = rt => clamp((rt - bascule) / FONDU);
  function change(n, rt) {
    const k = avancement(rt);
    if (cur >= 0 && k < 1 && n === prev && !souvenir) {
      // retour en arrière pendant le fondu : il repart dans l'autre sens, depuis là où il en était
      prev = cur; cur = n; bascule = rt - (1 - k) * FONDU;
    } else {
      if (cur >= 0 && k < 1) {
        // nouveau changement pendant un fondu : l'image du moment sert de départ (rien ne disparaît d'un coup)
        if (!souvenir) souvenir = document.createElement("canvas");
        souvenir.width = stage.width; souvenir.height = stage.height;
        souvenir.getContext("2d").drawImage(stage, 0, 0);
        prev = -2;
      } else { souvenir = null; prev = cur; }
      cur = n; bascule = rt;
    }
    if (horloges[cur] === undefined && opened) horloges[cur] = rt;
  }

  // la boucle se relance AVANT de dessiner : une erreur ponctuelle ne peut plus figer tout le site
  function frame(now) {
    requestAnimationFrame(frame);
    try { dessineImage(now); } catch (e) { /* image suivante */ }
    if (defile) defile.pas();
  }
  function dessineImage(now) {
    const rt = now / 1000;
    const n = chapitreAuMilieu();
    if (n !== cur) change(n, rt);
    if (opened && horloges[cur] === undefined) horloges[cur] = rt;
    const c = chapters[cur];
    sctx.clearRect(0, 0, stage.width, stage.height);
    const k = prev === -1 ? 1 : easeIO(avancement(rt));
    if (k < 1) {
      if (prev === -2 && souvenir) blit(souvenir, 1, 1 + .07 * k);
      else blit(sceneImage(chapters[prev].name, tScene(prev, rt), rt), 1, 1 + .07 * k);
      blit(sceneImage(c.name, tScene(cur, rt), rt), k, 1.07 - .07 * k);
      // fondu enchaîné qui passe par un léger voile de lumière
      const b = Math.sin(Math.PI * k) * .12;
      if (b > .004) { sctx.globalAlpha = b; sctx.fillStyle = "#fff8ec"; sctx.fillRect(0, 0, stage.width, stage.height); sctx.globalAlpha = 1; }
    } else {
      if (prev === -2) { prev = -1; souvenir = null; }
      blit(sceneImage(c.name, tScene(cur, rt), rt), 1, 1);
    }
    // les légendes de la cinématique à l'écran arrivent une à une (et restent)
    if (opened) {
      const tj = tScene(cur, rt);
      c.caps.forEach(cap => {
        const e = 1 - Math.pow(1 - clamp((tj - Number(cap.dataset.at)) / 1.2), 3);
        if (e <= Number(cap.dataset.vu || 0)) return;
        cap.dataset.vu = e;
        cap.style.opacity = e.toFixed(3);
        cap.style.transform = "translateY(" + ((1 - e) * 16).toFixed(1) + "px) scale(" + (1.035 - .035 * e).toFixed(4) + ")";
      });
    }
  }

  // ----- Défilement automatique (defile.js, commun aux trois versions) -----
  // Un temps pour regarder chaque cinématique, un temps pour lire chaque page, puis une glissade faite par le
  // navigateur jusqu'à la partie suivante. Le doigt garde toujours la main ; la page s'arrête sur la réponse.
  const READ = 7;
  const defile = window.Defile ? Defile({
    reduit: reduce,
    actif: () => opened,
    cibles: () => {
      const Hh = H(), L = [];
      for (const sec of story.querySelectorAll(":scope > section")) {
        const haut = sec.offsetTop, h = sec.offsetHeight, fin = sec.id === "s-rsvp";
        const cin = sec.classList.contains("cine");
        const ch = cin ? chapters.find(x => x.sec === sec) : null;
        L.push({ y: haut, duree: cin ? Math.max(5, (ch ? SCENES[ch.name].duration : 6) + .5) : (sec.id === "s-cover" ? 9 : READ), fin });
        if (!fin && h > Hh * 1.15) L.push({ y: haut + h - Hh, duree: READ * .6 });
      }
      return L;
    },
  }) : null;

  // Les pages de texte apparaissent en douceur quand elles arrivent à l'écran
  const pages = document.querySelectorAll(".content .inner");
  if (reduce || !("IntersectionObserver" in window)) pages.forEach(n => n.classList.add("vu"));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("vu"); io.unobserve(e.target); } }), { threshold: .12 });
    pages.forEach(n => io.observe(n));
  }

  history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  requestAnimationFrame(frame);
})();

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
    pausedUntil = performance.now() + 500;
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
    const sec = el("section", "cine");
    sec.style.height = heightVh + "vh";
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
    const caps = {
      m: [["Mairie", "title", 1.6], ["Mariage civil", "script", 2.1], ["19 juillet · Mairie Bagatelle, Marseille", "small", 2.6]],
      h: [["Henné", "title", 1.6], ["Beach Party", "script", 2.1], ["15 août · Hilton Beach, Tel Aviv", "small", 2.6]],
      p: [["Houppa", "title", 1.6], ["Face à la mer", "script", 2.1], ["17 août · Cochav Hayam, Césarée", "small", 2.6]],
      s: [["Chabbat", "title", 2.6], ["Chabbat Hatan", "script", 3.1], ["20 & 21 août · Tel Aviv", "small", 3.6]]
    };
    invite.events.forEach(k => {
      cine(k, 200, caps[k], k === "p" || k === "m" ? "dark" : "light");
      buildEvent(content(k), k);
    });
    cine("fin", 150, [["Votre réponse", "title", 1.4], ["Avant le 19 juin 2027", "small", 1.9]], "dark");
    buildRsvp(content("rsvp"));
  }
  story.append(el("footer", "foot", "Emma & David · 2027"));

  // ----- Rendu piloté par le défilement -----
  // Un canvas hors écran par décor ; le canvas fixe de la page compose le décor
  // courant. Au début de chaque cinématique, le décor précédent se mélange au
  // suivant (fondu enchaîné avec un léger mouvement de caméra), en avant comme en arrière.
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
  // jamais quand la barre du navigateur apparaît ou disparaît en plein défilement (ce qui faisait tout redessiner)
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
    const W = stage.width, H = stage.height;
    sctx.globalAlpha = alpha;
    const dw = W * zoom, dh = H * zoom;
    sctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    sctx.globalAlpha = 1;
  }
  const easeIO = v => { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
  const BLEND = .45;   // part de la cinématique pendant laquelle les décors se mélangent

  // hauteur d'écran STABLE (celle du décor, 100lvh) : elle ne change pas quand la barre du navigateur apparaît ou
  // disparaît pendant un défilement au doigt (innerHeight change de ~80 px et faisait sauter scène et légendes)
  const H = () => stage.clientHeight || innerHeight;
  // le décor suit le défilement avec un très léger amorti : il ne saute pas si une image tarde un peu
  let yL = null, lastRtL = 0;
  // la boucle se relance AVANT de dessiner : une erreur ponctuelle ne peut plus figer tout le site
  function frame(now) {
    requestAnimationFrame(frame);
    try { dessineImage(now); } catch (e) { /* image suivante */ }
    autoScroll(now);
  }
  function dessineImage(now) {
    const rt = now / 1000, dtL = lastRtL ? Math.min(.1, Math.max(0, rt - lastRtL)) : 0; lastRtL = rt;
    yL = yL === null || Math.abs(scrollY - yL) > H() * 1.5 ? scrollY : yL + (scrollY - yL) * (1 - Math.exp(-dtL * 12));
    const y = yL;
    // Chapitre courant : le dernier dont la cinématique a commencé
    let i = 0;
    chapters.forEach((c, j) => { if (y >= c.sec.offsetTop - 1) i = j; });
    const c = chapters[i], span = c.sec.offsetHeight - H();
    // (fenêtre pas encore mesurée, par exemple dans le navigateur de WhatsApp : on reste au début de la scène)
    const p = span > 0 ? clamp((y - c.sec.offsetTop) / span) : 0;
    const t = p * SCENES[c.name].duration;

    sctx.clearRect(0, 0, stage.width, stage.height);
    const k = i > 0 ? easeIO(p / BLEND) : 1;
    if (k < 1) {
      const prev = chapters[i - 1].name;
      blit(sceneImage(prev, SCENES[prev].duration, rt), 1, 1 + .07 * k);
      blit(sceneImage(c.name, t, rt), k, 1.07 - .07 * k);
      // fondu enchaîné qui passe par un léger voile de lumière
      const b = Math.sin(Math.PI * k) * .12;
      if (b > .004) { sctx.globalAlpha = b; sctx.fillStyle = "#fff8ec"; sctx.fillRect(0, 0, stage.width, stage.height); sctx.globalAlpha = 1; }
    } else {
      blit(sceneImage(c.name, t, rt), 1, 1);
    }

    chapters.forEach((ch, j) => {
      if (Math.abs(j - i) > 1) return;
      const sj = ch.sec.offsetHeight - H(), pj = sj > 0 ? clamp((y - ch.sec.offsetTop) / sj) : 0;
      const tj = pj * SCENES[ch.name].duration;
      ch.caps.forEach(cap => {
        // chaque légende arrive en douceur : elle monte, se pose et devient nette
        const e = 1 - Math.pow(1 - clamp((tj - Number(cap.dataset.at)) / 1.2), 3);
        cap.style.opacity = e.toFixed(3);
        cap.style.transform = "translateY(" + ((1 - e) * 16).toFixed(1) + "px) scale(" + (1.035 - .035 * e).toFixed(4) + ")";
      });
    });
  }

  // ----- Défilement automatique -----
  // La page avance seule : les cinématiques à leur vitesse réelle, les pages de texte
  // plus lentement pour laisser le temps de lire. Dès que l'invité fait défiler
  // lui-même, l'automatique s'efface, puis reprend après quelques secondes de calme.
  let pausedUntil = performance.now() + 600, last = 0, pos = scrollY, posBefore = scrollY, stopped = reduce, finger = false, ramp = 0;
  const PAUSE = 3000, RAMP = 1.4;
  const FAST = 2.2;   // les cinématiques défilent 2,2 fois plus vite que leur durée
  const stopAt = () => {
    const r = document.getElementById("s-rsvp") || document.getElementById("s-cover");
    return r.offsetTop;
  };
  // l'invité garde toujours la main : tant que son doigt est posé, rien ne bouge tout seul ; après un geste, la page finit
  // de glisser sur son élan, puis le défilement automatique reprend après 3 s de calme, en douceur
  // (écouteurs passifs, aucun preventDefault : le toucher n'est jamais intercepté)
  const wait = () => { pausedUntil = performance.now() + PAUSE; ramp = 0; };
  addEventListener("touchstart", () => { finger = true; wait(); }, { passive: true });
  ["touchend", "touchcancel"].forEach(t => addEventListener(t, () => { finger = false; wait(); }, { passive: true }));
  ["wheel", "keydown", "mousedown"].forEach(t => addEventListener(t, wait, { passive: true }));
  // (nos propres pas de défilement tombent entre la position d'avant et la nouvelle : ceux-là ne comptent pas)
  addEventListener("scroll", () => { if (opened && (scrollY < Math.min(pos, posBefore) - 3 || scrollY > Math.max(pos, posBefore) + 3)) wait(); }, { passive: true });
  document.addEventListener("focusin", e => { if (e.target.closest("form")) stopped = true; });

  function speedHere() {
    const y = scrollY;
    for (const c of chapters) {
      const top = c.sec.offsetTop, span = c.sec.offsetHeight - H();
      if (y >= top - 2 && y < top + span) return span / SCENES[c.name].duration * FAST;
    }
    return Math.max(120, H() / 3.2);
  }

  // Pause de lecture : le défilement s'arrête quelques secondes sur chaque page,
  // le texte bien centré à l'écran, avant de reprendre.
  const READ = 7000;
  const readStops = () => [...document.querySelectorAll(".content")]
    .filter(sec => sec.id !== "s-rsvp")
    .map(sec => sec.offsetTop + Math.max(0, (sec.offsetHeight - H()) / 2));
  const reached = new Set();

  function autoScroll(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    if (!opened || stopped || finger || now < pausedUntil) { pos = posBefore = scrollY; ramp = 0; return; }
    const target = stopAt();
    if (scrollY >= target - 1) { pos = scrollY; return; }
    if (Math.abs(pos - scrollY) > 4) pos = scrollY;
    // reprise progressive : la vitesse monte doucement de zéro
    ramp = Math.min(1, ramp + dt / RAMP);
    let next = Math.min(target, pos + speedHere() * (.5 - Math.cos(Math.PI * ramp) / 2) * dt);
    for (const y of readStops()) {
      const key = Math.round(y);
      if (!reached.has(key) && pos < y && next >= y) { next = y; reached.add(key); pausedUntil = now + READ; ramp = 0; break; }
    }
    posBefore = pos; pos = next;
    window.scrollTo(0, pos);
  }

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

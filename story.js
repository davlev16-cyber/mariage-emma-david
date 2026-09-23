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
      el("p", "guest", invite.name));
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
  function sizeStage() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    stage.width = innerWidth * dpr; stage.height = innerHeight * dpr;
    Object.keys(renderers).forEach(n => renderers[n].r.resize(n));
  }
  sizeStage();
  addEventListener("resize", sizeStage);

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

  function frame(now) {
    const rt = now / 1000, y = scrollY;
    // Chapitre courant : le dernier dont la cinématique a commencé
    let i = 0;
    chapters.forEach((c, j) => { if (y >= c.sec.offsetTop - 1) i = j; });
    const c = chapters[i], span = c.sec.offsetHeight - innerHeight;
    const p = clamp((y - c.sec.offsetTop) / span);
    const t = p * SCENES[c.name].duration;

    sctx.clearRect(0, 0, stage.width, stage.height);
    const k = i > 0 ? easeIO(p / BLEND) : 1;
    if (k < 1) {
      const prev = chapters[i - 1].name;
      blit(sceneImage(prev, SCENES[prev].duration, rt), 1, 1 + .07 * k);
      blit(sceneImage(c.name, t, rt), k, 1.07 - .07 * k);
    } else {
      blit(sceneImage(c.name, t, rt), 1, 1);
    }

    chapters.forEach((ch, j) => {
      if (Math.abs(j - i) > 1) return;
      const pj = clamp((y - ch.sec.offsetTop) / (ch.sec.offsetHeight - innerHeight));
      const tj = pj * SCENES[ch.name].duration;
      ch.caps.forEach(cap => {
        const e = 1 - Math.pow(1 - clamp((tj - Number(cap.dataset.at)) / 1), 3);
        cap.style.opacity = e.toFixed(3);
        cap.style.transform = "translateY(" + ((1 - e) * 14).toFixed(1) + "px)";
      });
    });
    autoScroll(now);
    requestAnimationFrame(frame);
  }

  // ----- Défilement automatique -----
  // La page avance seule : les cinématiques à leur vitesse réelle, les pages de texte
  // plus lentement pour laisser le temps de lire. Dès que l'invité fait défiler
  // lui-même, l'automatique s'efface, puis reprend après quelques secondes de calme.
  let pausedUntil = performance.now() + 600, last = 0, pos = scrollY, stopped = reduce;
  const PAUSE = 2500;
  const FAST = 2.2;   // les cinématiques défilent 2,2 fois plus vite que leur durée
  const stopAt = () => {
    const r = document.getElementById("s-rsvp") || document.getElementById("s-cover");
    return r.offsetTop;
  };
  ["wheel", "touchstart", "touchmove", "keydown", "mousedown"].forEach(t =>
    addEventListener(t, () => { pausedUntil = performance.now() + PAUSE; }, { passive: true }));
  document.addEventListener("focusin", e => { if (e.target.closest("form")) stopped = true; });

  function speedHere() {
    const y = scrollY;
    for (const c of chapters) {
      const top = c.sec.offsetTop, span = c.sec.offsetHeight - innerHeight;
      if (y >= top - 2 && y < top + span) return span / SCENES[c.name].duration * FAST;
    }
    return Math.max(120, innerHeight / 3.2);
  }

  // Pause de lecture : le défilement s'arrête quelques secondes sur chaque page,
  // le texte bien centré à l'écran, avant de reprendre.
  const READ = 7000;
  const readStops = () => [...document.querySelectorAll(".content")]
    .filter(sec => sec.id !== "s-rsvp")
    .map(sec => sec.offsetTop + Math.max(0, (sec.offsetHeight - innerHeight) / 2));
  const reached = new Set();

  function autoScroll(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    if (!opened || stopped || now < pausedUntil) { pos = scrollY; return; }
    const target = stopAt();
    if (scrollY >= target - 1) { pos = scrollY; return; }
    if (Math.abs(pos - scrollY) > 4) pos = scrollY;
    let next = Math.min(target, pos + speedHere() * dt);
    for (const y of readStops()) {
      const key = Math.round(y);
      if (!reached.has(key) && pos < y && next >= y) { next = y; reached.add(key); pausedUntil = now + READ; break; }
    }
    pos = next;
    window.scrollTo(0, pos);
  }

  history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  requestAnimationFrame(frame);
})();

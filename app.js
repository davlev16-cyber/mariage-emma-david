// L'invitation : ouverture, puis une page par célébration de l'invité
// (avec une cinématique avant chacune), puis la page de réponse.

(function () {
  const code = inviteCode();
  const invite = decodeInvite(code);
  const root = document.getElementById("pages");
  const nav = document.getElementById("nav");
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  const dots = document.getElementById("dots");
  let order = [], current = -1, busy = false;

  document.getElementById("sound").addEventListener("click", () => Music.toggle());

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function page(id, theme) {
    const s = el("section", "page " + theme);
    s.id = "page-" + id; s.hidden = true;
    const inner = el("div", "inner");
    s.append(inner);
    root.append(s);
    return inner;
  }

  // ----- Couverture -----
  function buildCover() {
    const p = page("cover", "t-cover");
    const bh = el("p", "bh", "ב״ה"); bh.lang = "he";
    p.append(
      bh,
      el("p", "eyebrow", "Avec la bénédiction de leurs familles"),
      el("h1", "names", "Emma & David"),
      el("p", "lead", "ont la joie de vous convier à leur mariage"),
      el("p", "guest", invite.name)
    );
    const list = el("ul", "agenda");
    invite.events.forEach(k => {
      const li = el("li");
      li.append(el("span", "a-name", EVENTS[k].name), el("span", "a-date", EVENTS[k].shortDate));
      list.append(li);
    });
    p.append(list, el("p", "when", "Août 2027 · Israël"));
  }

  // ----- Pages des célébrations -----
  function buildEvent(k) {
    const ev = EVENTS[k];
    const p = page(k, "t-" + k);
    p.append(
      el("p", "eyebrow", "Emma & David"),
      el("h2", "ev-title", ev.name),
      el("p", "ev-tag", ev.tagline),
      el("p", "ev-date", ev.date),
      el("p", "ev-place", ev.place + " · " + ev.city),
      el("p", "ev-intro", ev.intro)
    );
    const dl = el("dl", "details");
    ev.details.forEach(([a, b]) => dl.append(el("dt", "", a), el("dd", "", b)));
    const map = el("a", "map-link", "Voir sur la carte");
    map.href = mapUrl(ev); map.target = "_blank"; map.rel = "noopener";
    p.append(dl, map);
  }

  // ----- Réponse -----
  function buildRsvp() {
    const p = page("rsvp", "t-rsvp");
    p.append(el("h2", "ev-title", "Votre réponse"));
    const dl = el("p", "deadline"); dl.innerHTML = "Merci de répondre avant le <strong>jeudi 15 juillet 2027</strong>.";
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
        ta.value = saved.message || ""; form.hidden = true; thanks.hidden = false;
        tt.textContent = "Votre réponse a bien été enregistrée.";
      }
    } catch (e) {}

    edit.addEventListener("click", () => { thanks.hidden = true; form.hidden = false; });
    form.addEventListener("submit", async e => {
      e.preventDefault(); err.hidden = true;
      const answer = { code, nom: invite.name, message: ta.value.trim() };
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

  // ----- Navigation -----
  function show(i) {
    root.querySelectorAll(".page").forEach(s => { s.hidden = true; s.classList.remove("shown"); });
    const s = document.getElementById("page-" + order[i]);
    s.hidden = false; s.scrollTop = 0;
    requestAnimationFrame(() => s.classList.add("shown"));
    document.body.dataset.page = order[i];
    current = i;
    prev.style.visibility = i > 0 ? "visible" : "hidden";
    next.style.visibility = i < order.length - 1 ? "visible" : "hidden";
    next.textContent = order[i + 1] === "rsvp" ? "Répondre ›" : "Suivant ›";
    [...dots.children].forEach((d, j) => d.classList.toggle("on", j === i));
  }

  async function go(i) {
    if (busy || nav.hidden || i < 0 || i >= order.length || i === current) return;
    const target = order[i];
    if (i > current && EVENTS[target]) {
      busy = true;
      await Cinema.play(target, { onCovered: () => show(i) });
      busy = false;
    } else {
      show(i);
    }
  }

  prev.addEventListener("click", () => go(current - 1));
  next.addEventListener("click", () => go(current + 1));
  addEventListener("keydown", e => {
    if (e.target.closest("textarea, input")) return;
    if (e.key === "ArrowRight") go(current + 1);
    if (e.key === "ArrowLeft") go(current - 1);
  });
  // Glisser vers la gauche / la droite sur téléphone
  let sx = 0, sy = 0;
  addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // ----- Démarrage -----
  if (!invite) {
    const p = page("none", "t-cover");
    p.append(el("h1", "names", "Emma & David"),
      el("p", "lead", "Cette invitation s'ouvre avec le lien personnel que vous avez reçu. Si vous l'avez perdu, demandez-le à Emma & David."));
    order = ["none"];
    Cinema.play("intro", { onCovered: () => show(0) });
    return;
  }

  buildCover();
  invite.events.forEach(buildEvent);
  buildRsvp();
  order = ["cover", ...invite.events, "rsvp"];
  order.forEach(() => dots.append(el("span")));

  Cinema.play("intro", { guest: invite.name, onCovered: () => show(0) }).then(() => { nav.hidden = false; });
})();

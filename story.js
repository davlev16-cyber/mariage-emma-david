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

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  // ----- Sections -----
  const cines = [];

  function cine(name, heightVh, from, captions, tone) {
    const sec = el("section", "cine");
    sec.style.height = heightVh + "vh";
    const stick = el("div", "stick");
    const canvas = document.createElement("canvas");
    const caps = el("div", "caps tone-" + tone);
    captions.forEach(([text, cls, at]) => {
      if (!text) return;
      const p = el("p", "cap " + cls, text); p.dataset.at = at;
      if (cls === "bh") p.lang = "he";
      caps.append(p);
    });
    stick.append(canvas, caps);
    sec.append(stick);
    story.append(sec);
    cines.push({ name, sec, canvas, caps: [...caps.children], from, r: createRenderer(canvas) });
  }

  function content(id) {
    const sec = el("section", "content t-" + id);
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
    const list = el("ul", "agenda");
    invite.events.forEach(k => {
      const li = el("li");
      li.append(el("span", "a-name", EVENTS[k].name), el("span", "a-date", EVENTS[k].shortDate));
      list.append(li);
    });
    p.append(list, el("p", "when", "Août 2027 · Israël"));
  }

  function buildEvent(p, k) {
    const ev = EVENTS[k];
    p.append(el("p", "eyebrow", "Emma & David"), el("h2", "ev-title", ev.name), el("p", "ev-tag", ev.tagline),
      el("p", "ev-date", ev.date), el("p", "ev-place", ev.place + " · " + ev.city), el("p", "ev-intro", ev.intro));
    const dl = el("dl", "details");
    ev.details.forEach(([a, b]) => dl.append(el("dt", "", a), el("dd", "", b)));
    const map = el("a", "map-link", "Voir sur la carte");
    map.href = mapUrl(ev); map.target = "_blank"; map.rel = "noopener";
    p.append(dl, map);
  }

  function buildRsvp(p) {
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

  // ----- Construction de l'histoire -----
  if (!invite) {
    cine("intro", 420, WHITE, [], "dark");
    const p = content("cover");
    p.append(el("h1", "names", "Emma & David"),
      el("p", "lead", "Cette invitation s'ouvre avec le lien personnel que vous avez reçu. Si vous l'avez perdu, demandez-le à Emma & David."));
  } else {
    cine("intro", 480, WHITE, [], "dark");
    cines[0].r.setGuest(invite.name);
    buildCover(content("cover"));
    const caps = {
      h: [["Henné", "title", .9], ["Beach Party", "script", 1.4], ["15 août · Hilton Beach, Tel Aviv", "small", 2]],
      p: [["Houppa", "title", .9], ["Face à la mer", "script", 1.4], ["17 août · Cohav Ayam, Césarée", "small", 2]],
      s: [["Chabbat", "title", 2.6], ["Chabbat Chalom", "script", 3.1], ["20 & 21 août · Tel Aviv", "small", 3.6]]
    };
    invite.events.forEach(k => {
      // Chaque passage part du blanc laissé par la page précédente
      cine(k, 300, WHITE, caps[k], k === "p" ? "dark" : "light");
      buildEvent(content(k), k);
    });
    cine("r", 280, WHITE, [["Votre réponse", "title", 3.5], ["Avec toute notre joie", "script", 3.9], ["Avant le 15 juillet 2027", "small", 4.3]], "dark");
    buildRsvp(content("rsvp"));
  }
  story.append(el("footer", "foot", "Emma & David · 2027"));

  // ----- Rendu piloté par le défilement -----
  function progressOf(c) {
    const r = c.sec.getBoundingClientRect();
    const span = c.sec.offsetHeight - innerHeight;
    return { visible: r.bottom > 0 && r.top < innerHeight, p: clamp(-r.top / span) };
  }

  function frame(now) {
    const rt = now / 1000;
    cines.forEach(c => {
      const { visible, p } = progressOf(c);
      if (!visible) return;
      const t = p * SCENES[c.name].duration;
      c.r.draw(c.name, t, rt, c.from);
      c.caps.forEach(cap => {
        const k = clamp((t - Number(cap.dataset.at)) / 1);
        const e = 1 - Math.pow(1 - k, 3);
        cap.style.opacity = e.toFixed(3);
        cap.style.transform = "translateY(" + ((1 - e) * 14).toFixed(1) + "px)";
      });
    });
    autoScroll(now);
    requestAnimationFrame(frame);
  }

  addEventListener("resize", () => cines.forEach(c => c.r.resize(c.name)));

  // ----- Défilement automatique -----
  // La page avance seule : les cinématiques à leur vitesse réelle, les pages de texte
  // plus lentement pour laisser le temps de lire. Dès que l'invité fait défiler
  // lui-même, l'automatique s'efface, puis reprend après quelques secondes de calme.
  let pausedUntil = performance.now() + 600, last = 0, pos = scrollY, stopped = reduce;
  const PAUSE = 4000;
  const stopAt = () => {
    const r = document.getElementById("s-rsvp") || document.getElementById("s-cover");
    return r.offsetTop;
  };
  ["wheel", "touchstart", "touchmove", "keydown", "mousedown"].forEach(t =>
    addEventListener(t, () => { pausedUntil = performance.now() + PAUSE; }, { passive: true }));
  document.addEventListener("focusin", e => { if (e.target.closest("form")) stopped = true; });

  function speedHere() {
    const y = scrollY;
    for (const c of cines) {
      const top = c.sec.offsetTop, span = c.sec.offsetHeight - innerHeight;
      if (y >= top - 2 && y < top + span) return span / SCENES[c.name].duration;
    }
    return Math.max(40, innerHeight / 9);
  }

  function autoScroll(now) {
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    if (stopped || now < pausedUntil) { pos = scrollY; return; }
    const target = stopAt();
    if (scrollY >= target - 1) { pos = scrollY; return; }
    if (Math.abs(pos - scrollY) > 4) pos = scrollY;
    pos = Math.min(target, pos + speedHere() * dt);
    window.scrollTo(0, pos);
  }

  history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  requestAnimationFrame(frame);
})();

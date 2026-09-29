// Emma & David — invitation
// Ouverture au toucher (avec la musique), apparitions douces au défilement,
// fil kaki qui se dessine le long des célébrations, réponse envoyée au tableau Google.

(function () {
  const $ = id => document.getElementById(id);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const silent = location.hash === "#silence";
  const code = inviteCode();
  const invite = decodeInvite(code);

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---------- Sans lien personnel ----------
  if (!invite) {
    $("gate").remove(); $("sound").remove(); $("site").hidden = true;
    $("no-invite").hidden = false; document.body.classList.remove("locked");
    return;
  }

  // ---------- Contenu personnalisé ----------
  $("gate-guest").textContent = invite.name;
  $("guest").textContent = invite.name;
  $("deadline").textContent = DEADLINE;

  // Programme
  const agenda = $("agenda");
  invite.events.forEach((k, i) => {
    const ev = EVENTS[k], li = el("li"); li.dataset.reveal = ""; li.style.setProperty("--d", (i * .12) + "s");
    const a = el("a"); a.href = "#ev-" + k;
    const txt = el("span", "a-txt");
    txt.append(el("span", "a-name", ev.name), el("span", "a-meta", ev.shortDate + " · " + ev.details[0][1]));
    a.append(el("span", "a-day", ev.day.split(" ")[0]), txt);
    li.append(a); agenda.append(li);
  });

  // Célébrations
  const events = $("events");
  invite.events.forEach((k, i) => {
    const ev = EVENTS[k];
    const sec = el("section", "event"); sec.id = "ev-" + k;
    const node = el("span", "node"); node.setAttribute("aria-hidden", "true");
    const r = (n, cls, text, d) => { const e = el(n, cls, text); e.dataset.reveal = ""; e.style.setProperty("--d", d + "s"); return e; };
    sec.append(node,
      r("p", "kicker num", String(i + 1).padStart(2, "0") + " — " + ev.name, 0),
      r("p", "day", ev.day, .08),
      r("p", "month", ev.month + " " + ev.year, .16),
      r("p", "weekday", ev.weekday, .2),
      r("h2", "title", ev.name, .26),
      r("p", "tag", ev.tagline, .32));
    if (ev.line) sec.append(r("p", "line", ev.line, .38));
    const dl = r("dl", "details", null, .44);
    ev.details.forEach(([a, b]) => { const d = el("div"); d.append(el("dt", "", a), el("dd", "", b)); dl.append(d); });
    const map = r("a", "map", "Voir sur la carte", .5);
    map.href = mapUrl(ev); map.target = "_blank"; map.rel = "noopener";
    sec.append(dl, map);
    events.append(sec);
  });

  // Illustrations au trait (voir illos.js)
  document.querySelector("#hero .names").insertAdjacentHTML("beforebegin", ILLOS.hero());
  invite.events.forEach(k => {
    const node = document.querySelector("#ev-" + k + " .node");
    if (ILLOS[k]) node.insertAdjacentHTML("afterend", ILLOS[k]());
  });
  document.querySelector("#rsvp .rsvp-title").insertAdjacentHTML("beforebegin", ILLOS.rsvp());
  prepareIllos(document);

  // Prénoms découpés en lettres, qui apparaissent l'une après l'autre
  document.querySelectorAll("[data-split]").forEach((n, j) => {
    const t = n.textContent; n.textContent = "";
    [...t].forEach((ch, i) => { const s = el("span", "char", ch); s.style.transitionDelay = (j * .25 + i * .06) + "s"; n.append(s); });
  });

  // ---------- Réponse ----------
  const form = $("form"), questions = $("questions");
  invite.events.forEach(k => {
    const ev = EVENTS[k], q = el("div", "q");
    const head = el("div", "q-head");
    head.append(el("span", "q-name", ev.name), el("span", "q-date", ev.shortDate));
    const pills = el("div", "pills");
    [["Oui", "Présent(e)"], ["Non", "Absent(e)"]].forEach(([v, label]) => {
      const lab = el("label", "pill"), input = document.createElement("input");
      input.type = "radio"; input.name = k; input.value = v; input.id = k + "-" + v;
      lab.append(input, el("span", "", label)); pills.append(lab);
    });
    q.append(head, pills); questions.append(q);
  });
  if (invite.count > 1) {
    $("nb-row").hidden = false;
    for (let i = invite.count; i >= 1; i--) $("nb").append(new Option(i, i));
  }
  const key = "rsvp:" + code;
  const thanks = $("thanks"), err = $("error"), send = $("send");
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved) {
      invite.events.forEach(k => { const i = $(k + "-" + saved[k]); if (i) i.checked = true; });
      $("message").value = saved.message || "";
      if (saved.nb && invite.count > 1) $("nb").value = saved.nb;
      form.hidden = true; thanks.hidden = false; $("thanks-text").textContent = "Votre réponse a bien été enregistrée.";
    }
  } catch (e) {}
  $("edit").addEventListener("click", () => { thanks.hidden = true; form.hidden = false; form.classList.add("in"); });
  form.addEventListener("submit", async e => {
    e.preventDefault(); err.hidden = true;
    const answer = { code, nom: invite.name, nb: invite.count > 1 ? Number($("nb").value) : 1, message: $("message").value.trim() };
    const missing = [];
    invite.events.forEach(k => {
      const c = form.querySelector('input[name="' + k + '"]:checked');
      if (c) answer[k] = c.value; else missing.push(EVENTS[k].name);
    });
    if (missing.length) { err.textContent = "Merci d'indiquer votre présence pour : " + missing.join(", ") + "."; err.hidden = false; return; }
    send.disabled = true; send.textContent = "Envoi…";
    try {
      await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(answer) });
      try { localStorage.setItem(key, JSON.stringify(answer)); } catch (x) {}
      form.hidden = true; thanks.hidden = false; $("thanks-text").textContent = "Votre réponse a bien été envoyée.";
      thanks.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    } catch (x) {
      err.textContent = "La réponse n'a pas pu être envoyée. Vérifiez votre connexion internet et réessayez."; err.hidden = false;
    } finally { send.disabled = false; send.textContent = "Envoyer ma réponse"; }
  });

  // ---------- Apparitions ----------
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: .18, rootMargin: "0px 0px -6% 0px" });
  function watchReveals() { document.querySelectorAll("[data-reveal]:not(.in), .node:not(.in)").forEach(n => io.observe(n)); }

  // ---------- Fil qui se dessine + chiffres en léger relief (parallaxe) ----------
  const timeline = $("timeline"), fill = $("thread-fill");
  const days = [...document.querySelectorAll(".event .day")];
  let L = null;
  function measure() {
    const top = timeline.getBoundingClientRect().top + scrollY;
    L = { top, height: timeline.offsetHeight, days: days.map(d => { const s = d.closest(".event"); return { el: d, top: s.offsetTop + top, h: s.offsetHeight }; }) };
  }
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (!L) measure();
      const y = scrollY + innerHeight * .55;
      const p = Math.max(0, Math.min(1, (y - L.top) / L.height));
      fill.style.height = (p * L.height).toFixed(1) + "px";
      if (!reduce) L.days.forEach(d => {
        const k = (scrollY + innerHeight / 2 - (d.top + d.h / 2)) / innerHeight;
        if (Math.abs(k) < 1.2) d.el.style.transform = "translate3d(0," + (k * -28).toFixed(1) + "px,0)";
      });
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { measure(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); onScroll(); });

  // ---------- Musique ----------
  const sound = $("sound");
  let audio = null, playing = false;
  function setUI() { sound.classList.toggle("on", playing); sound.setAttribute("aria-label", playing ? "Couper la musique" : "Mettre la musique"); }
  function play() {
    if (silent || !MUSIC_URL) return;
    if (!audio) { audio = new Audio(MUSIC_URL); audio.loop = true; audio.volume = 0; audio.preload = "auto"; }
    audio.play().then(() => {
      playing = true; setUI();
      const t0 = performance.now();
      const fade = now => { const k = Math.min(1, (now - t0) / 2200); audio.volume = .7 * k; if (k < 1 && playing) requestAnimationFrame(fade); };
      requestAnimationFrame(fade);
    }).catch(() => { playing = false; setUI(); });
  }
  sound.addEventListener("click", () => {
    if (playing) { audio.pause(); playing = false; setUI(); } else play();
  });

  // ---------- Ouverture ----------
  const gate = $("gate");
  let opened = false;
  function openInvitation() {
    if (opened) return; opened = true;
    play();
    gate.classList.add("open");
    document.body.classList.remove("locked");
    setTimeout(() => {
      gate.remove();
      document.querySelectorAll("#hero [data-reveal], #hero [data-split]").forEach((n, i) => { n.style.setProperty("--d", (i * .12) + "s"); n.classList.add("in"); });
      watchReveals(); measure(); onScroll();
    }, reduce ? 0 : 700);
  }
  gate.addEventListener("click", openInvitation);
  gate.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openInvitation(); } });
  if (reduce) openInvitation();

  history.scrollRestoration = "manual";
  scrollTo(0, 0);
})();

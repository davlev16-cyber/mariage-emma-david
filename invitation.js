// Page d'accueil : affiche les dates de l'invité, renvoie vers leurs pages
// et envoie la réponse vers Google Sheets.

function el(tag, attrs, text) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
  if (text) node.textContent = text;
  return node;
}

function renderEvents(keys, code) {
  const box = document.getElementById("events");
  keys.forEach(k => {
    const ev = EVENTS[k];
    const card = el("a", { class: "event event-link", href: ev.page + "?i=" + encodeURIComponent(code) });
    card.append(
      el("h2", {}, ev.name),
      el("p", { class: "date" }, ev.date),
      el("p", {}, ev.place + " · " + ev.city),
      el("span", { class: "more" }, "Découvrir la journée →")
    );
    box.append(card);
  });
}

function renderQuestions(keys) {
  const box = document.getElementById("questions");
  keys.forEach(k => {
    const ev = EVENTS[k];
    const fs = el("fieldset");
    fs.append(el("legend", {}, ev.name + " — " + ev.date));
    const choices = el("div", { class: "choices" });
    [["Oui", "Je serai présent(e)"], ["Non", "Je ne pourrai pas venir"]].forEach(([value, label]) => {
      const lab = el("label", { class: "choice" });
      const input = el("input", { type: "radio", name: k, value, id: k + "-" + value });
      lab.append(input, el("span", {}, label));
      choices.append(lab);
    });
    fs.append(choices);
    box.append(fs);
  });
}

function storageKey(code) { return "rsvp:" + code; }

function start() {
  const code = inviteCode();
  const invite = decodeInvite(code);

  if (!invite) {
    document.getElementById("no-invite").hidden = false;
    return;
  }

  document.getElementById("guest").textContent = invite.name;
  document.getElementById("guest").hidden = false;
  const introGuest = document.getElementById("intro-guest");
  if (introGuest) introGuest.textContent = invite.name;
  renderEvents(invite.events, code);
  renderQuestions(invite.events);
  document.getElementById("rsvp").hidden = false;

  const form = document.getElementById("rsvp-form");
  const thanks = document.getElementById("thanks");
  const error = document.getElementById("form-error");
  const submit = document.getElementById("submit");

  // Réponse déjà envoyée depuis ce téléphone : on la remet dans le formulaire.
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(code)) || "null");
    if (saved) {
      invite.events.forEach(k => {
        const input = document.getElementById(k + "-" + saved[k]);
        if (input) input.checked = true;
      });
      document.getElementById("message").value = saved.message || "";
      form.hidden = true;
      thanks.hidden = false;
      document.getElementById("thanks-text").textContent = "Votre réponse a bien été enregistrée.";
    }
  } catch (e) {}

  document.getElementById("edit").addEventListener("click", () => {
    thanks.hidden = true;
    form.hidden = false;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.hidden = true;

    const answer = { code, nom: invite.name, message: document.getElementById("message").value.trim() };
    const missing = [];
    invite.events.forEach(k => {
      const checked = form.querySelector('input[name="' + k + '"]:checked');
      if (checked) answer[k] = checked.value;
      else missing.push(EVENTS[k].name);
    });
    if (missing.length) {
      error.textContent = "Merci d'indiquer votre présence pour : " + missing.join(", ") + ".";
      error.hidden = false;
      return;
    }

    submit.disabled = true;
    submit.textContent = "Envoi…";
    try {
      if (!SCRIPT_URL) throw new Error("not configured");
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(answer)
      });
      try { localStorage.setItem(storageKey(code), JSON.stringify(answer)); } catch (e) {}
      form.hidden = true;
      thanks.hidden = false;
      document.getElementById("thanks-text").textContent = "Votre réponse a bien été envoyée.";
    } catch (e) {
      error.textContent = "La réponse n'a pas pu être envoyée. Vérifiez votre connexion internet et réessayez.";
      error.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = "Envoyer ma réponse";
    }
  });
}

start();

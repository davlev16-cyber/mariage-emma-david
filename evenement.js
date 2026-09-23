// Page d'une célébration (henne.html, houppa.html, chabbat.html).
// La page indique sa célébration avec <body data-event="h|p|s">.

(function () {
  const key = document.body.dataset.event;
  const ev = EVENTS[key];
  const code = inviteCode();
  const invite = decodeInvite(code);
  const q = code ? "?i=" + encodeURIComponent(code) : "";

  document.querySelectorAll("[data-home]").forEach(a => a.href = "index.html" + q);
  document.getElementById("reply").href = "index.html" + q + "#rsvp";

  if (!invite || !invite.events.includes(key)) {
    document.getElementById("content").hidden = true;
    document.getElementById("not-invited").hidden = false;
    return;
  }

  document.getElementById("ev-name").textContent = ev.name;
  document.getElementById("ev-date").textContent = ev.date;
  document.getElementById("ev-place").textContent = ev.place + " · " + ev.city;
  document.getElementById("ev-intro").textContent = ev.intro;
  document.getElementById("ev-map").href = mapUrl(ev);

  const list = document.getElementById("ev-details");
  ev.details.forEach(([label, value]) => {
    const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = value;
    list.append(dt, dd);
  });

  // Liens vers les autres célébrations de l'invité
  const others = document.getElementById("others");
  invite.events.filter(k => k !== key).forEach(k => {
    const a = document.createElement("a");
    a.href = EVENTS[k].page + q;
    a.textContent = EVENTS[k].name + " — " + EVENTS[k].date + " →";
    others.append(a);
  });
  if (!others.children.length) others.parentElement.hidden = true;
})();

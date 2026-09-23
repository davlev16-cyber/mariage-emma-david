// Adresse du script Google qui enregistre les réponses dans Google Sheets.
// À remplir après l'étape Google (script : google-script.gs).
const SCRIPT_URL = "";

// Les célébrations. Modifiez les textes ici (horaires, adresses, programme...).
const EVENTS = {
  h: {
    name: "Henné",
    page: "henne.html",
    date: "Dimanche 15 août 2027",
    place: "Hilton Beach",
    city: "Tel Aviv",
    time: "Horaire communiqué prochainement",
    map: "Hilton Beach Tel Aviv",
    intro: "Une soirée de couleurs, de musique et de traditions, pour ouvrir les festivités en famille, au bord de la mer.",
    details: [
      ["Lieu", "Hilton Beach, Tel Aviv"],
      ["Horaire", "Communiqué prochainement"],
      ["Tenue", "Tenue de fête, couleurs bienvenues"]
    ]
  },
  p: {
    name: "Houppa",
    page: "houppa.html",
    date: "Mardi 17 août 2027",
    place: "Cohav Ayam",
    city: "Césarée",
    time: "Horaire communiqué prochainement",
    map: "Kochav Hayam Caesarea",
    intro: "Emma et David s'uniront sous la houppa, face à la mer, entourés de ceux qu'ils aiment.",
    details: [
      ["Lieu", "Cohav Ayam, Césarée"],
      ["Horaire", "Communiqué prochainement"],
      ["Déroulé", "Houppa, puis réception et soirée"],
      ["Tenue", "Tenue de soirée"]
    ]
  },
  s: {
    name: "Chabbat",
    page: "chabbat.html",
    date: "Vendredi 20 et samedi 21 août 2027",
    place: "Restaurant Simo et synagogue",
    city: "Tel Aviv",
    time: "Horaires communiqués prochainement",
    map: "Simo restaurant Tel Aviv",
    intro: "Pour clore la semaine, un Chabbat partagé avec les mariés, entre table de fête et prières.",
    details: [
      ["Vendredi soir", "Dîner de Chabbat au restaurant Simo, Tel Aviv"],
      ["Samedi", "Office à la synagogue de Tel Aviv"],
      ["Horaires", "Communiqués prochainement"]
    ]
  }
};

// Lit l'invitation contenue dans le lien (?i=...). Partagé par toutes les pages.
function decodeInvite(code) {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json);
    const events = String(data.e || "").split("").filter(k => EVENTS[k]);
    if (!data.n || !events.length) return null;
    return { name: String(data.n), events };
  } catch (e) {
    return null;
  }
}

function inviteCode() {
  return new URLSearchParams(location.search).get("i") || "";
}

function mapUrl(ev) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ev.map);
}

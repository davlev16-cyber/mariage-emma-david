// Informations du mariage d'Emma & David.
// Ce fichier est partagé par l'invitation (index.html) et l'espace des mariés (creer-liens.html).

// Réponses des invités : script Google relié au tableau des mariés.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwdQkUqE8hvUratLKInJaJ7wOD7ybERrOhH_LGvCmWizbmpoNoH6GGGfu0oJB32h-oa/exec";

// Musique (libre de droits, sans publicité) : « Night of Gold », djovan, Pixabay Content License.
const MUSIC_URL = "night-of-gold.mp3";

// Date limite de réponse
const DEADLINE = "samedi 19 juin 2027";

// Les célébrations, dans l'ordre chronologique.
const EVENTS = {
  m: {
    name: "Mairie",
    tagline: "Mariage civil",
    day: "19", month: "juillet", year: "2027", weekday: "Lundi",
    date: "Lundi 19 juillet 2027",
    shortDate: "Lun. 19 juillet",
    line: "Emma & David se diront oui",
    details: [["Lieu", "Mairie Bagatelle, Marseille"], ["Horaire", "14h30"]],
    map: "Mairie Bagatelle Marseille"
  },
  h: {
    name: "Henné",
    tagline: "Beach Party",
    day: "15", month: "août", year: "2027", weekday: "Dimanche",
    date: "Dimanche 15 août 2027",
    shortDate: "Dim. 15 août",
    line: "",
    details: [["Lieu", "Hilton Beach, Tel Aviv"], ["Horaire", "16h"]],
    map: "Hilton Beach Tel Aviv"
  },
  p: {
    name: "Houppa",
    tagline: "Face à la mer",
    day: "17", month: "août", year: "2027", weekday: "Mardi",
    date: "Mardi 17 août 2027",
    shortDate: "Mar. 17 août",
    line: "",
    details: [["Lieu", "Cochav Hayam, Césarée"], ["Horaire", "17h"]],
    map: "Cochav Hayam Césarée"
  },
  s: {
    name: "Chabbat",
    tagline: "Chabbat Hatan",
    day: "20 — 21", month: "août", year: "2027", weekday: "Vendredi & samedi",
    date: "Vendredi 20 & samedi 21 août 2027",
    shortDate: "Ven. 20 & sam. 21 août",
    line: "",
    details: [["Vendredi soir", "Restaurant Simo, Tel Aviv"], ["Horaire", "À l'entrée du Chabbat"], ["Samedi", "Synagogue de Tel Aviv"]],
    map: "Simo restaurant Tel Aviv"
  }
};

// Lien personnel : ?i=CODE, où CODE = { n: nom, e: lettres des célébrations, c: nombre de personnes } en base64url.
function decodeInvite(code) {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(decodeURIComponent(escape(atob(b64))));
    const events = Object.keys(EVENTS).filter(k => String(data.e || "").includes(k));
    if (!events.length) return null;
    const count = Math.min(30, Math.max(1, parseInt(data.c, 10) || 1));
    return { name: String(data.n || ""), events, count };
  } catch (e) {
    return null;
  }
}

function encodeInvite(name, keys, count) {
  const json = JSON.stringify(count > 1 ? { n: name, e: keys.join(""), c: count } : { n: name, e: keys.join("") });
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function inviteCode() {
  return new URLSearchParams(location.search).get("i") || "";
}

function mapUrl(ev) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ev.map);
}

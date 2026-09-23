// Adresse du script Google qui enregistre les réponses dans Google Sheets.
// À remplir après l'étape Google (script : google-script.gs).
const SCRIPT_URL = "";

// Musique : laissez vide pour la mélodie composée par le site,
// ou indiquez un fichier MP3 (dont vous avez les droits), ex. "musique.mp3".
// Morceau actuel : « Night of Gold » (djovan), libre de droits, Pixabay Content License.
const MUSIC_URL = "night-of-gold.mp3";

// Pas de YouTube : ses publicités ne peuvent pas être bloquées. La musique est la mélodie composée pour le site.
const YOUTUBE_ID = "";

// Les célébrations, dans l'ordre. Modifiez les textes ici.
const EVENTS = {
  m: {
    name: "Mairie",
    tagline: "Mariage civil",
    date: "Lundi 19 juillet 2027",
    shortDate: "Lun. 19 juillet",
    place: "Mairie Bagatelle",
    city: "Marseille",
    map: "Mairie Bagatelle Marseille",
    intro: "Emma & David se diront oui",
    details: [
      ["Lieu", "Mairie Bagatelle, Marseille"],
      ["Horaire", "Communiqué prochainement"]
    ]
  },
  h: {
    name: "Henné",
    tagline: "Beach Party",
    date: "Dimanche 15 août 2027",
    shortDate: "Dim. 15 août",
    place: "Hilton Beach",
    city: "Tel Aviv",
    map: "Hilton Beach Tel Aviv",
    intro: "",
    details: [
      ["Lieu", "Hilton Beach, Tel Aviv"],
      ["Horaire", "Communiqué prochainement"]
    ]
  },
  p: {
    name: "Houppa",
    tagline: "Face à la mer",
    date: "Mardi 17 août 2027",
    shortDate: "Mar. 17 août",
    place: "Cochav Hayam",
    city: "Césarée",
    map: "Cochav Hayam Césarée",
    intro: "",
    details: [
      ["Lieu", "Cochav Hayam, Césarée"],
      ["Horaire", "Communiqué prochainement"]
    ]
  },
  s: {
    name: "Chabbat",
    tagline: "Chabbat Hatan",
    date: "Vendredi 20 & samedi 21 août 2027",
    shortDate: "Ven. 20 & sam. 21 août",
    place: "Restaurant Simo & synagogue",
    city: "Tel Aviv",
    map: "Simo restaurant Tel Aviv",
    intro: "",
    details: [
      ["Vendredi soir", "Restaurant Simo, Tel Aviv"],
      ["Samedi", "Synagogue de Tel Aviv"]
    ]
  }
};

// Lit l'invitation contenue dans le lien (?i=...).
function decodeInvite(code) {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json);
    const events = Object.keys(EVENTS).filter(k => String(data.e || "").includes(k));
    if (!events.length) return null;   // le nom peut être vide (lien d'aperçu des mariés)
    const count = Math.min(30, Math.max(1, parseInt(data.c, 10) || 1));
    return { name: String(data.n || ""), events, count };
  } catch (e) {
    return null;
  }
}

// Fabrique le code d'invitation (nom, célébrations, nombre de personnes) pour le lien.
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

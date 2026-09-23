// Adresse du script Google qui enregistre les réponses dans Google Sheets.
// À remplir après l'étape Google (script : google-script.gs).
const SCRIPT_URL = "";

// Musique : laissez vide pour la mélodie composée par le site,
// ou indiquez un fichier MP3 (dont vous avez les droits), ex. "musique.mp3".
const MUSIC_URL = "";

// Chanson YouTube (lecteur officiel intégré). Laissez vide pour revenir à la mélodie composée.
const YOUTUBE_ID = "1F9YIqidhN4";
const SONG_LABEL = "Omer Adam · כסף או דמעות";

// Les célébrations, dans l'ordre. Modifiez les textes ici.
const EVENTS = {
  h: {
    name: "Henné",
    tagline: "Beach Party",
    date: "Dimanche 15 août 2027",
    shortDate: "Dim. 15 août",
    place: "Hilton Beach",
    city: "Tel Aviv",
    map: "Hilton Beach Tel Aviv",
    intro: "Pieds dans le sable et henné sur les mains : une soirée de musique, de couleurs et de traditions au bord de la mer pour ouvrir les festivités.",
    details: [
      ["Lieu", "Hilton Beach, Tel Aviv"],
      ["Horaire", "Communiqué prochainement"],
      ["Tenue", "Tenue de fête, couleurs bienvenues"]
    ]
  },
  p: {
    name: "Houppa",
    tagline: "Face à la mer",
    date: "Mardi 17 août 2027",
    shortDate: "Mar. 17 août",
    place: "Cohav Ayam",
    city: "Césarée",
    map: "Kochav Hayam Caesarea",
    intro: "Emma & David s'uniront sous la houppa, face à la Méditerranée, entourés de ceux qu'ils aiment.",
    details: [
      ["Lieu", "Cohav Ayam, Césarée"],
      ["Horaire", "Communiqué prochainement"],
      ["Déroulé", "Houppa, puis réception et soirée"],
      ["Tenue", "Tenue de soirée"]
    ]
  },
  s: {
    name: "Chabbat",
    tagline: "Chabbat Chalom",
    date: "Vendredi 20 & samedi 21 août 2027",
    shortDate: "Ven. 20 & sam. 21 août",
    place: "Restaurant Simo & synagogue",
    city: "Tel Aviv",
    map: "Simo restaurant Tel Aviv",
    intro: "Pour clore la semaine, un Chabbat partagé avec les mariés, entre table de fête et prières.",
    details: [
      ["Vendredi soir", "Dîner de Chabbat au restaurant Simo, Tel Aviv"],
      ["Samedi", "Office à la synagogue de Tel Aviv"],
      ["Horaires", "Communiqués prochainement"]
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

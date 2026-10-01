/* Emma & David · version 3D
   film3d.js : (même déroulé que la version cinéma) l'ouverture (un voilage qui s'écarte), puis une seule histoire qui défile, dans l'ordre du premier site :
   le plan d'aperçu → l'invitation et le programme → pour chaque célébration de l'invité, son plan de cinéma puis sa page →
   le final → la réponse (enregistrée dans le même tableau Google que le premier site).
   La page avance toute seule ; l'invité peut aussi faire défiler lui-même, en avant comme en arrière. */
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const { clamp, lerp, ease } = MF;
const SILENCE = /silence/.test(location.hash);
const REDUIT = matchMedia('(prefers-reduced-motion: reduce)').matches;
const maintenant = () => performance.now() / 1000;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

/* ---------- l'invitation personnelle (?i=…) ---------- */
const code = inviteCode(), invite = decodeInvite(code);
const nom = invite ? invite.name : '';
const evs = invite ? invite.events : [];
$$('[data-invite]').forEach(n => { n.textContent = nom; });

/* ---------- poussière d'or devant le voilage ---------- */
if (!REDUIT) {
  const box = $('#poussiere');
  for (let i = 0; i < 30; i++) {
    const e = document.createElement('i'), s = 1.5 + Math.random() * 2.5;
    e.style.cssText = `left:${Math.random() * 100}%;top:${35 + Math.random() * 75}%;width:${s}px;height:${s}px;--dx:${(Math.random() - .5) * 90}px;animation-duration:${7 + Math.random() * 8}s;animation-delay:${-Math.random() * 12}s`;
    box.append(e);
  }
}

/* ---------- décors en 3D (sans WebGL, on bascule sur la version cinéma) ---------- */
if (!MF.webgl()) { location.replace('../cinema/' + location.search + location.hash); return; }
MF.demarre();

/* ---------- musique : « Night of Gold », comme sur le premier site ---------- */
const audio = $('#musique'), btnSon = $('#son');
let sonCoupe = SILENCE;
function fondu(a, cible, ms, fin) {
  const d = a.volume, t0 = performance.now();
  const pas = () => { const k = Math.min(1, (performance.now() - t0) / ms); a.volume = d + (cible - d) * k; if (k < 1) requestAnimationFrame(pas); else if (fin) fin(); };
  pas();
}
function musique(on) {
  if (SILENCE) return;
  sonCoupe = !on;
  if (on) { audio.volume = 0; const pr = audio.play(); if (pr) pr.then(() => fondu(audio, .75, 2400)).catch(() => {}); }
  else fondu(audio, 0, 500, () => audio.pause());
  btnSon.classList.toggle('muet', !on);
  btnSon.setAttribute('aria-label', on ? 'Couper la musique' : 'Remettre la musique');
}
btnSon.addEventListener('click', () => musique(sonCoupe));

/* =====================================================================
   1. Les plans : un plan de cinéma par célébration, et un mouvement calme pour chaque page de texte
   ===================================================================== */
const sine = ease.sine, io = ease.io;
// fondu enchaîné entre deux décors ; pendant ce temps les deux caméras continuent de bouger
const FONDU = 2.2;
// mouvement « doux » : démarre et finit sans jamais s'arrêter net
const doux = k => (k = clamp(k), .4 * k + .6 * sine(k));
const paysage = () => MF.W > MF.H;
// plans de cinéma : u = temps dans le plan (lié au défilement), D = durée du mouvement ; hauteur en vh
const CINE = {
  // plan d'aperçu : vue du ciel sur la mer à l'heure dorée ; la caméra descend vers le rivage
  apercu: { scene: 'plage', duree: 8, hauteur: 260, pose: (u, D) => {
    const e = io(u / D), k = doux(u / D);
    return { variante: 2, rivage: 0, camX: lerp(14, 0, k), camY: lerp(-38, -2.6, e), camZ: lerp(-80, 4, k), focale: paysage() ? 1.05 : .9, tilt: lerp(-.24, .06, e), soleil: lerp(.07, .038, u / D), lacet: lerp(.32, 0, k), roulis: lerp(-.06, 0, k) };
  } },
  m: { scene: 'soie', sombre: true, duree: 6.5, hauteur: 230, pose: (u, D) => ({ zoom: lerp(1.24, 1, doux(u / D)), derive: u * .014 }) },
  h: { scene: 'plage', duree: 7, hauteur: 230, pose: (u, D) => { const k = doux(u / D);
    const camX = lerp(-2.6, 1.5, k);
    return { variante: 0, rivage: 1, camX, camY: lerp(-1.1, -1.55, k), camZ: lerp(-1.4, .5, k), focale: .95, tilt: .06, soleil: lerp(.036, .014, u / D), lacet: camX * .05 }; } },
  p: { scene: 'houppa', sombre: true, duree: 7.5, hauteur: 230, pose: (u, D) => {
    const e = doux(u / D), camY = lerp(-7.5, -1.7, e), camZ = lerp(-5, 2, e), pa = paysage() ? 1.15 : 1;
    const k = .95 * pa / (15 - camZ), hor = .62 - (-1.3 - camY) * k, camX = lerp(4.2, 0, e);
    // la grue descend en tournant autour de la houppa
    return { camX, camY, camZ, focale: .95 * pa, tilt: clamp(hor - .5, -.25, .12), tod: lerp(.45, 1.05, u / D), allee: 1, lacet: Math.atan2(camX, 15 - camZ) * .95 };
  } },
  s: { scene: 'chabbat', duree: 7, hauteur: 230, pose: (u, D) => { const k = doux(u / D);
    const camX = lerp(-.55, .3, k), camZ = lerp(-1.05, -.7, k);
    return { camX, camY: -.46, camZ, focale: paysage() ? 1.05 : .82, tilt: .08, nuit: lerp(.15, .7, u / D), allume: clamp((u - 1.6) / 1.4), lacet: Math.atan2(camX, .97 - camZ) * .85 }; } },
  // le final : la houppa à la nuit tombée, feu d'artifice, puis la réponse
  fin: { scene: 'houppa', duree: 8, hauteur: 210, pose: (u, D) => { const k = doux(u / D);
    const camX = lerp(-2.2, .8, k), camZ = lerp(-7.2, -4.5, k);
    return { camX, camY: lerp(-3.2, -2.6, k), camZ, focale: paysage() ? 1.1 : .95, tilt: .1, tod: lerp(2.1, 2.85, io(u / 6)), allee: 1, lacet: Math.atan2(camX, 15 - camZ) * .9 }; } },
};
// pages de texte : la caméra dérive lentement pendant la lecture (u = secondes depuis l'arrivée sur la page)
const PAGES = {
  // l'invitation et le programme, posés sur la mer du plan d'aperçu
  couverture: { scene: 'plage', groupe: 'apercu', pose: u => ({ variante: 2, rivage: 0, camX: Math.sin(u * .05) * 1.2, camY: lerp(-3.4, -2.8, sine(clamp(u / 30))), camZ: -6 + 10 * sine(clamp(u / 50)), focale: paysage() ? 1.05 : .9, tilt: paysage() ? -.02 : -.1, soleil: .036, lacet: Math.sin(u * .04) * .05, roulis: 0 }) },
  m: { scene: 'soie', pose: u => ({ zoom: 1.08 - .06 * sine(clamp(u / 20)), derive: 6.5 * .014 + u * .01 }) },
  h: { scene: 'plage', pose: u => { const camX = 1.3 - Math.sin(u * .07) * 1.2; return { variante: 0, rivage: 1, camX, camY: -1.45, camZ: lerp(.3, -.4, sine(clamp(u / 16))), focale: .95, tilt: .08, soleil: lerp(.02, .012, clamp(u / 20)), lacet: camX * .05 }; } },
  p: { scene: 'houppa', pose: u => ({ camX: Math.sin(u * 1.1) * .04, camY: -1.6 + Math.sin(u * 2.2) * .015, camZ: lerp(1.6, 3.8, io(clamp(u / 11))), focale: paysage() ? 1.1 : .95, tilt: paysage() ? .04 : .12, tod: lerp(1, 1.3, clamp(u / 16)), allee: 1, lacet: Math.sin(u * .12) * .03 }) },
  s: { scene: 'chabbat', pose: u => { const camX = .3 - Math.sin(u * .06) * .25, camZ = lerp(-.75, -.6, sine(clamp(u / 14))); return { camX, camY: -.46, camZ, focale: paysage() ? 1.05 : .82, tilt: .12, nuit: lerp(.6, .9, clamp(u / 14)), allume: 1, lacet: Math.atan2(camX, .97 - camZ) * .85 }; } },
  reponse: { scene: 'plage', pose: u => ({ variante: 1, rivage: 1, camX: Math.sin(u * .05) * .6, camY: lerp(-1.1, -1.6, sine(clamp(u / 16))), camZ: -.6, focale: .95, tilt: .1, soleil: .025 + .05 * sine(clamp(u / 25)) }) },
};

/* =====================================================================
   2. La construction de l'histoire, dans l'ordre du premier site
   ===================================================================== */
const main = $('#invitation');
const elements = [];   // plans de cinéma et pages, dans l'ordre de la page
const apparait = n => { n.setAttribute('data-apparait', ''); return n; };

function plan(k) {
  const c = CINE[k], s = el('section', 'cine'); s.id = 'cine-' + k; s.style.setProperty('--h', c.hauteur);
  const cadre = el('div', 'cine-cadre'); s.append(cadre); main.append(s);
  const it = { type: 'cine', k, groupe: k, sec: s, scene: c.scene, duree: c.duree, pose: c.pose, textes: [] };
  elements.push(it);
  return { cadre, it, c };
}
function section(k, id, clair) {
  const s = el('section', 'chap' + (clair ? ' clair' : '')); s.id = id;
  const c = el('div', 'contenu'); s.append(c); main.append(s);
  elements.push({ type: 'page', k, groupe: PAGES[k].groupe || k, sec: s, scene: PAGES[k].scene, pose: PAGES[k].pose });
  return c;
}

// le plan d'aperçu : les prénoms au-dessus de la mer
function planApercu() {
  const { cadre, it } = plan('apercu');
  const n = el('div', 'replique r-centre apercu');
  n.append(el('span', 'eyebrow', nom || 'Juillet & août 2027'));
  const s = el('span', 'noms-film'); s.innerHTML = '<span class="n1">Emma</span> <em>&amp;</em> <span class="n2">David</span>';
  n.append(s);
  const d = el('div', 'replique r-date apercu-date');
  d.append(el('span', 'ligne'), el('span', '', 'Marseille & Israël · 2027'), el('span', 'ligne'));
  cadre.append(n, d);
  it.textes = [[n, .08], [d, .2]];
}
// l'invitation et le programme de l'invité, juste avant la première célébration
function couverture() {
  const c = section('couverture', 'couverture');
  const bh = el('p', 'bh', 'ב״ה'); bh.lang = 'he';
  c.append(apparait(bh), apparait(el('p', 'benediction', 'Avec la bénédiction de leurs familles')));
  const noms = apparait(el('h1', 'noms-page')); noms.innerHTML = '<span>Emma</span><em>&amp;</em><span>David</span>';
  c.append(noms, apparait(el('p', 'lead', 'ont la joie de vous convier à leur mariage')));
  if (nom) c.append(apparait(el('p', 'invite-nom', nom)));
  const ul = apparait(el('ul', 'programme'));
  for (const k of evs) { const li = el('li'); li.append(el('span', 'lbl', EVENTS[k].name), el('span', 'val', EVENTS[k].date)); ul.append(li); }
  const quand = apparait(el('p', 'quand')); quand.append(el('span', '', 'Juillet & août 2027'), el('span', '', 'Marseille & Israël'));
  c.append(ul, quand);
}
// le plan de cinéma d'une célébration : seulement son nom, qui arrive avec le décor (les informations sont sur la page suivante)
function planEvenement(k) {
  const { cadre, it, c } = plan(k);
  const n = el('div', 'replique r-titre' + (c.sombre ? ' sombre' : ''));
  n.append(el('span', 'titre-ev', EVENTS[k].name));
  cadre.append(n);
  it.textes = [[n, .1]];
}
// la page d'une célébration : tout ce qu'il faut savoir, et la carte
function evenement(k) {
  const ev = EVENTS[k], c = section(k, 'ev-' + k, k === 'm');
  c.append(apparait(el('p', 'surtitre', ev.date)), apparait(el('h2', '', ev.name)), apparait(el('p', 'tagline', ev.tagline)));
  if (ev.intro) c.append(apparait(el('p', 'intro', ev.intro)));
  const ul = apparait(el('ul', 'infos'));
  for (const [a, b] of ev.details) { const li = el('li'); li.append(el('span', 'lbl', a), el('span', 'val', b)); ul.append(li); }
  const carteLien = apparait(el('a', 'lien-carte', 'Voir sur la carte'));
  carteLien.href = mapUrl(ev); carteLien.target = '_blank'; carteLien.rel = 'noopener';
  c.append(ul, carteLien);
}
// le final : feu d'artifice au-dessus de la houppa, et l'invitation à répondre
const TIRS = [[.14, .3, .2], [.22, .72, .15], [.3, .5, .1], [.4, .22, .24], [.5, .78, .22], [.62, .45, .16]];
function planFinal() {
  const { cadre, it } = plan('fin');
  const n = el('div', 'replique r-centre fin-carte');
  n.append(el('span', 'titre-ev', 'Votre réponse'), el('span', 'fin-date', 'Avant le 19 juin 2027'));
  cadre.append(n);
  it.textes = [[n, .12]];
  it.tirs = 0;
}
function reponse() {
  const c = section('reponse', 'reponse', true);
  c.append(apparait(el('h2', '', 'Serez-vous des nôtres ?')));
  const dl = apparait(el('p', 'echeance')); dl.innerHTML = 'Merci de répondre avant le <strong>samedi 19 juin 2027</strong>.';
  c.append(dl);
  const form = apparait(el('form', 'formulaire vrai')); form.noValidate = true;
  for (const k of evs) {
    const fs = el('fieldset', 'choix');
    fs.append(el('legend', '', EVENTS[k].name + ' — ' + EVENTS[k].shortDate));
    const ligne = el('div', 'choix-ligne');
    for (const [v, lab] of [['Oui', 'Je serai présent(e)'], ['Non', 'Je ne pourrai pas venir']]) {
      const l = el('label'), i = document.createElement('input');
      i.type = 'radio'; i.name = k; i.value = v; i.id = k + '-' + v;
      l.append(i, el('span', '', lab)); ligne.append(l);
    }
    fs.append(ligne); form.append(fs);
  }
  let nb = null;
  if (invite.count > 1) {
    const l = el('label', 'champ'); l.append(el('span', '', 'Nombre de personnes'));
    nb = document.createElement('select'); nb.id = 'nb';
    for (let i = invite.count; i >= 1; i--) { const o = document.createElement('option'); o.value = i; o.textContent = i; nb.append(o); }
    l.append(nb); form.append(l);
  }
  const lm = el('label', 'champ'); lm.append(el('span', '', 'Un petit mot pour les mariés (facultatif)'));
  const ta = document.createElement('textarea'); ta.rows = 3; ta.maxLength = 500; lm.append(ta);
  const err = el('p', 'erreur'); err.hidden = true;
  const btn = el('button', 'envoyer', 'Envoyer ma réponse'); btn.type = 'submit';
  form.append(lm, err, btn);
  const merci = el('div', 'merci merci-vrai'); merci.hidden = true;
  const texte = el('p', '', 'Votre réponse a bien été envoyée.');
  const modif = el('button', 'lien', 'Modifier ma réponse'); modif.type = 'button';
  merci.append(el('p', 'merci-titre', 'Merci !'), texte, modif);
  c.append(form, merci);

  const cle = 'rsvp:' + code;
  try {
    const sauve = JSON.parse(localStorage.getItem(cle) || 'null');
    if (sauve) {
      for (const k of evs) { const i = document.getElementById(k + '-' + sauve[k]); if (i) i.checked = true; }
      ta.value = sauve.message || ''; if (nb && sauve.nb) nb.value = sauve.nb;
      form.hidden = true; merci.hidden = false; texte.textContent = 'Votre réponse a bien été enregistrée.';
    }
  } catch (e) {}
  modif.addEventListener('click', () => { merci.hidden = true; form.hidden = false; });
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.hidden = true;
    const rep = { code, nom: invite.name, nb: nb ? Number(nb.value) : invite.count, message: ta.value.trim() };
    const manque = [];
    for (const k of evs) { const ch = form.querySelector('input[name="' + k + '"]:checked'); if (ch) rep[k] = ch.value; else manque.push(EVENTS[k].name); }
    if (manque.length) { err.textContent = "Merci d'indiquer votre présence pour : " + manque.join(', ') + '.'; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = 'Envoi…';
    try {
      if (!SCRIPT_URL) throw new Error('non configuré');
      await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(rep) });
      try { localStorage.setItem(cle, JSON.stringify(rep)); } catch (x) {}
      form.hidden = true; merci.hidden = false; texte.textContent = 'Votre réponse a bien été envoyée.';
      merci.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 900, easing: 'ease-out' });
    } catch (x) {
      err.textContent = "La réponse n'a pas pu être envoyée. Vérifiez votre connexion internet et réessayez."; err.hidden = false;
    } finally { btn.disabled = false; btn.textContent = 'Envoyer ma réponse'; }
  });
}

planApercu();
if (invite) {
  couverture();
  for (const k of evs) { planEvenement(k); evenement(k); }
  planFinal();
  reponse();
} else {
  const c = section('couverture', 'couverture');
  const noms = el('h1', 'noms-page'); noms.innerHTML = '<span>Emma</span><em>&amp;</em><span>David</span>';
  c.append(noms, el('p', 'lead', "Cette invitation s'ouvre avec le lien personnel que vous avez reçu. Si vous l'avez perdu, demandez-le à Emma & David."));
}
main.append(el('footer', 'signature-mariage', 'Emma & David · 2027'));
for (const sec of $$('.chap')) [...sec.querySelectorAll('[data-apparait]')].forEach((n, i) => n.style.setProperty('--d', (i * .12) + 's'));

/* =====================================================================
   3. Le décor suit la lecture : chaque plan ou page prend la main quand il arrive au milieu de l'écran
   ===================================================================== */
const film = $('#film');
let ouvert = false, courant = null;
// début de chaque élément (en pixels de défilement) ; la fin d'un élément est le début du suivant
// hauteur d'écran STABLE (celle de la toile du décor, 100lvh) : elle ne change pas quand la barre du navigateur
// apparaît ou disparaît pendant un défilement au doigt (innerHeight, lui, change de ~80 px et faisait sauter les calculs)
const toileFond = document.querySelector('canvas.decor, canvas.monde');
const hauteur = () => (toileFond && toileFond.clientHeight) || innerHeight;
function bornes() {
  const vh = hauteur();
  elements.forEach((it, i) => { it.debut = i ? it.sec.offsetTop - vh * .5 : 0; });
  elements.forEach((it, i) => { it.fin = elements[i + 1] ? elements[i + 1].debut : it.debut + it.sec.offsetHeight; });
}
const progres = (it, y) => clamp((y - it.debut) / Math.max(1, it.fin - it.debut));
function cible(it, y, t) {
  if (it.type === 'cine') return it.pose(progres(it, y) * it.duree, it.duree + FONDU);
  return it.pose(t - it.t0);
}
// même décor et même variante : la page continue le plan sans fondu, la caméra glisse vers son cadrage
function continuite(it, toile) {
  if (!toile || !toile.proprio || toile.alpha <= 0 || toile.proprio.groupe !== it.groupe || toile.scene !== MF.scenes[it.scene]) return false;
  const c = it.pose(0);
  return !('variante' in c) || c.variante === toile.p.variante;
}
function activer(it, y, t) {
  const avant = courant, toile = avant && avant.toile;
  courant = it; it.t0 = t;
  if (continuite(it, toile)) {
    it.toile = toile; it.p = toile.p; it.depart = { ...toile.p };
  } else {
    it.p = { ...MF.scenes[it.scene].p, ...cible(it, y, t) }; it.depart = null;
    it.toile = MF.montre(it.scene, avant ? FONDU : .001, { nouvelle: !!avant, p: it.p });
  }
  it.toile.proprio = it;
  film.classList.toggle('cadre', ouvert && it.type === 'cine');
}
function poser(it, y, t) {
  const c = cible(it, y, t);
  if (it.depart) {
    const m = io((t - it.t0) / 2.4);
    for (const k in c) it.p[k] = k in it.depart && k !== 'variante' && k !== 'rivage' ? lerp(it.depart[k], c[k], m) : c[k];
    if (m >= 1) it.depart = null;
  } else Object.assign(it.p, c);
}
// la caméra suit le défilement avec un très léger amorti : les à-coups du doigt ne se voient pas
let yLisse = null, tPrec = 0;
function histoire(t) {
  const y = scrollY, dt = tPrec ? clamp(t - tPrec, 0, .1) : 0; tPrec = t;
  yLisse = yLisse === null || Math.abs(y - yLisse) > hauteur() * 1.5 ? y : yLisse + (y - yLisse) * (1 - Math.exp(-dt * 11));
  bornes();
  let i = 0;
  for (let j = 0; j < elements.length; j++) if (y >= elements[j].debut) i = j;
  if (elements[i] !== courant) activer(elements[i], yLisse, t);
  // chaque toile encore visible suit l'élément auquel elle appartient
  for (const o of MF.toiles) if (o.alpha > 0 && o.proprio && o.p === o.proprio.p) poser(o.proprio, yLisse, t);
  // les cartes des plans de cinéma apparaissent avec leur décor
  for (const it of elements) {
    if (it.type !== 'cine') continue;
    const p = progres(it, y);
    for (const [n, a] of it.textes) n.classList.toggle('vu', ouvert && p >= a);
    if (it.tirs !== undefined) {
      if (p < .05) it.tirs = 0;
      while (it === courant && it.tirs < TIRS.length && p >= TIRS[it.tirs][0]) { const [, x, yy] = TIRS[it.tirs++]; MF.scenes.houppa.tire(x, yy, .9 + Math.random() * .3); }
    }
  }
}

/* =====================================================================
   4. La page avance toute seule, comme sur le premier site : les plans à leur vitesse, une pause sur chaque page
   pour lire ; dès que l'invité fait défiler lui-même, elle le laisse faire, puis reprend après quelques secondes de calme.
   ===================================================================== */
let arrete = REDUIT, pauseJusqua = Infinity, dernier = 0, pos = 0, posAvant = 0, doigt = false, elan = 0;
const PAUSE = 3000, LECTURE = 7000, DEMARRAGE = 1.4;
const vus = new Set();
// l'invité garde toujours la main : tant que son doigt est posé, rien ne bouge tout seul ; après un geste (doigt, molette,
// clavier), la page finit de glisser sur son élan, puis le défilement automatique reprend après 3 s de calme, en douceur.
// (écouteurs passifs, aucun preventDefault : le toucher n'est jamais intercepté)
const attendre = () => { if (ouvert) { pauseJusqua = performance.now() + PAUSE; elan = 0; } };
addEventListener('touchstart', () => { doigt = true; attendre(); }, { passive: true });
['touchend', 'touchcancel'].forEach(ty => addEventListener(ty, () => { doigt = false; attendre(); }, { passive: true }));
['wheel', 'keydown', 'mousedown'].forEach(ty => addEventListener(ty, attendre, { passive: true }));
// la page bouge sans nous (élan du doigt, molette) : on attend qu'elle s'arrête
// (nos propres pas de défilement tombent entre la position d'avant et la nouvelle : ceux-là ne comptent pas)
addEventListener('scroll', () => { if (ouvert && (scrollY < Math.min(pos, posAvant) - 3 || scrollY > Math.max(pos, posAvant) + 3)) attendre(); }, { passive: true });
document.addEventListener('focusin', e => { if (e.target.closest('form')) arrete = true; });
const finAuto = () => ($('#reponse') || $('#couverture')).offsetTop;
const arretsLecture = () => elements.filter(it => it.type === 'page' && it.k !== 'reponse').map(it => it.sec.offsetTop + Math.max(0, (it.sec.offsetHeight - hauteur()) / 2));
function vitesse() {
  if (courant && courant.type === 'cine') return (courant.fin - courant.debut) / courant.duree;
  return Math.max(110, hauteur() / 3.4);
}
function avance(now) {
  const dt = dernier ? Math.min(.05, (now - dernier) / 1000) : 0; dernier = now;
  if (!ouvert || arrete || doigt || now < pauseJusqua) { pos = posAvant = scrollY; elan = 0; return; }
  const but = finAuto();
  if (scrollY >= but - 1) { pos = scrollY; return; }
  if (Math.abs(pos - scrollY) > 4) pos = scrollY;
  // reprise progressive : la vitesse monte doucement de zéro (pas de départ brusque)
  elan = Math.min(1, elan + dt / DEMARRAGE);
  let suivant = Math.min(but, pos + vitesse() * MF.ease.sine(elan) * dt);
  for (const y of arretsLecture()) {
    const cle = Math.round(y);
    if (!vus.has(cle) && pos < y && suivant >= y) { suivant = y; vus.add(cle); pauseJusqua = now + LECTURE; elan = 0; break; }
  }
  posAvant = pos; pos = suivant;
  scrollTo(0, pos);
}

MF.avant.push(t => { histoire(t); avance(performance.now()); });

/* ---------- les textes des pages apparaissent en douceur ---------- */
const apparitions = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vu'); apparitions.unobserve(e.target); } }), { threshold: .15 });
function revele() {
  if (!ouvert) return;
  for (const n of document.querySelectorAll('[data-apparait]:not(.vu)')) { const r = n.getBoundingClientRect(); if (r.top < innerHeight * .92 && r.bottom > 0) n.classList.add('vu'); }
}
addEventListener('scroll', revele, { passive: true });
setInterval(revele, 600);

/* =====================================================================
   5. L'ouverture : un toucher, la musique démarre et les deux pans de voile s'écartent sur le plan d'aperçu
   ===================================================================== */
const porte = $('#porte');
function commencer() {
  ouvert = true;
  document.body.classList.remove('verrou'); document.body.classList.add('page');
  btnSon.hidden = SILENCE;
  film.classList.add('on');
  requestAnimationFrame(() => film.classList.toggle('cadre', !!courant && courant.type === 'cine'));
  $$('[data-apparait]').forEach(n => apparitions.observe(n));
}
function ouvrir() {
  if (ouvert) return;
  musique(true);
  porte.classList.add('ouvre');
  commencer();
  scrollTo(0, 0); pos = 0;
  pauseJusqua = performance.now() + (REDUIT ? 0 : 1600);   // la page commence à avancer pendant que le voile s'écarte
  if (REDUIT) { porte.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }); setTimeout(() => porte.remove(), 600); return; }
  // les deux pans glissent vers les côtés : le haut part le premier, le bas traîne un peu, les plis se resserrent
  const OUV = 3400;
  $$('.voilage').forEach((v, i) => {
    const s = i === 0 ? 1 : -1, depart = getComputedStyle(v).transform;
    v.animate([
      { offset: 0, transform: depart === 'none' ? 'translateX(0) scaleX(1) skewX(0deg)' : depart },
      { offset: .45, transform: `translateX(${-s * 16}%) scaleX(.8) skewX(${s * 3}deg)` },
      { offset: 1, transform: `translateX(${-s * 64}%) scaleX(.44) skewX(${s * 1}deg)` },
    ], { duration: OUV, easing: 'cubic-bezier(.45, .05, .35, 1)', fill: 'forwards' });
  });
  porte.animate([{ opacity: 1 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: OUV + 200, fill: 'forwards' });
  setTimeout(() => { if (document.getElementById('porte')) porte.remove(); }, OUV + 300);
}
porte.addEventListener('click', ouvrir);
porte.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } });

// le premier décor se dessine déjà derrière le voilage
scrollTo(0, 0);
histoire(maintenant());

/* ---------- raccourcis d'essai : #aller=cine-h&q=.5 (sans voile ni défilement automatique), #fixe ---------- */
const h = location.hash, ma = h.match(/aller=([\w-]+)/);
if (/fixe/.test(h)) arrete = true;
if (ma && document.getElementById(ma[1])) {
  porte.remove(); arrete = true; commencer();
  const it = elements.find(x => x.sec.id === ma[1]), mq = h.match(/q=([\d.]+)/);
  bornes();
  const q = mq ? parseFloat(mq[1]) : 0;
  scrollTo(0, it.type === 'cine' ? it.debut + q * (it.fin - it.debut) : it.sec.offsetTop + q * it.sec.offsetHeight);
  $$('[data-apparait]').forEach(n => n.classList.add('vu'));
}
})();

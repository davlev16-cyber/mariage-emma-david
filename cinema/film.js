/* Emma & David · version cinéma
   film.js : l'enveloppe, le film de chaque célébration (seulement celles de l'invité), puis l'invitation
   qui défile et la réponse (enregistrée dans le même tableau Google que le premier site). */
(function () {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const { clamp, lerp, ease } = MF;
const SILENCE = /silence/.test(location.hash);
const REDUIT = matchMedia('(prefers-reduced-motion: reduce)').matches;
const attendre = ms => new Promise(r => setTimeout(r, ms));
const maintenant = () => performance.now() / 1000;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

/* ---------- l'invitation personnelle (?i=…) ---------- */
const code = inviteCode(), invite = decodeInvite(code);
const nom = invite ? invite.name : '';
const evs = invite ? invite.events : [];
$$('[data-invite]').forEach(n => { n.textContent = nom; });
if (!nom) $('#porte-haut').classList.add('vide');

/* ---------- poussière d'or autour de l'enveloppe ---------- */
if (!REDUIT) {
  const box = $('#poussiere');
  for (let i = 0; i < 30; i++) {
    const e = document.createElement('i'), s = 1.5 + Math.random() * 2.5;
    e.style.cssText = `left:${Math.random() * 100}%;top:${35 + Math.random() * 75}%;width:${s}px;height:${s}px;--dx:${(Math.random() - .5) * 90}px;animation-duration:${7 + Math.random() * 8}s;animation-delay:${-Math.random() * 12}s`;
    box.append(e);
  }
}

/* ---------- décors ---------- */
MF.demarre();
const feux = new MF.Feux();
MF.surcouche = (ctx, W, H, t, dt, scene) => { if (feux.b.length && scene === MF.scenes.houppa) feux.dessine(ctx, dt, Math.min(W, H) / 420); };

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
   1. L'enveloppe
   ===================================================================== */
let etat = 'porte', T0 = 0;
const DEBUT = 4.3;
const porte = $('#porte'), env = $('#enveloppe'), carte = $('#carte'), rabat = $('#rabat'), sceau = $('#sceau'), film = $('#film');

function etincelles() {
  const r = sceau.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 28; i++) {
    const e = document.createElement('i'); e.className = 'etincelle';
    e.style.left = cx + 'px'; e.style.top = cy + 'px';
    document.body.append(e);
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 110;
    e.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 30}px) scale(.2)`, opacity: 0 }],
      { duration: 700 + Math.random() * 700, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'forwards' }).onfinish = () => e.remove();
  }
}
async function ouvrir() {
  if (etat !== 'porte') return;
  etat = 'ouverture'; T0 = maintenant();
  musique(true);
  sceau.classList.add('casse'); sceau.disabled = true;
  porte.classList.add('ouvre');
  etincelles();
  if (REDUIT) { await attendre(600); return versPage(); }
  await attendre(240);
  env.classList.add('ouvert');
  rabat.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(180deg)' }], { duration: 1050, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
  await attendre(540);
  env.classList.add('rabat-derriere');
  await attendre(480);
  carte.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-62%)' }], { duration: 1100, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' });
  await attendre(1150);
  const r = carte.getBoundingClientRect();
  const dx = innerWidth / 2 - (r.left + r.width / 2), dy = innerHeight / 2 - (r.top + r.height / 2);
  const s = Math.min(innerWidth * .9 / r.width, innerHeight * .6 / r.height, 1.9);
  const chute = { duration: 1200, easing: 'cubic-bezier(.55,0,.8,.3)', fill: 'forwards' };
  $('#env-dos').animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(75vh) rotate(3deg)', opacity: 0 }], chute);
  $('#env-poche').animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(75vh) rotate(3deg)', opacity: 0 }], chute);
  $('#rabat-ombre').style.display = 'none';
  rabat.animate([{ transform: 'rotateX(180deg)', opacity: 1 }, { transform: 'translateY(75vh) rotateX(180deg)', opacity: 0 }], chute);
  const pose = `translate(${dx}px, calc(-62% + ${dy}px))`;
  carte.animate([{ transform: 'translateY(-62%) scale(1)' }, { transform: `${pose} scale(${s})` }], { duration: 1150, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'forwards' });
  porte.classList.add('transparente');
  await attendre(Math.max(0, (T0 + DEBUT - maintenant()) * 1000));
  carte.animate([{ transform: `${pose} scale(${s})`, opacity: 1 }, { transform: `${pose} scale(${s * 3})`, opacity: 1, offset: .55 }, { transform: `${pose} scale(${s * 11})`, opacity: 0 }],
    { duration: 1500, easing: 'cubic-bezier(.55,0,.75,.4)', fill: 'forwards' });
  await attendre(1500);
  if (document.getElementById('porte')) porte.remove();
}
sceau.addEventListener('click', ouvrir);

/* =====================================================================
   2. Le film : un plan par célébration de l'invité, puis les prénoms
   ===================================================================== */
const sine = ease.sine, io = ease.io;
const PLANS_FILM = {
  m: { scene: 'soie', sombre: true, duree: 6, pose: u => ({ zoom: lerp(1.2, 1.02, io(u / 6)), derive: u * .014 }) },
  h: { scene: 'plage', duree: 6.5, pose: u => ({ variante: 0, camX: lerp(-2.4, 1.3, sine(u / 6.5)), camY: lerp(-1.1, -1.55, io(u / 6.5)), camZ: lerp(-1.4, .5, sine(u / 6.5)), focale: .95, tilt: .06, soleil: lerp(.036, .014, u / 6.5) }) },
  p: { scene: 'houppa', duree: 7, pose: u => {
    const e = io(u / 7), camY = lerp(-7.5, -1.7, e), camZ = lerp(-5, 2, sine(u / 7)), paysage = MF.W > MF.H ? 1.15 : 1;
    const k = .95 * paysage / (15 - camZ), hor = .62 - (-1.3 - camY) * k;
    return { camX: lerp(.9, 0, e), camY, camZ, focale: .95 * paysage, tilt: clamp(hor - .5, -.25, .12), tod: lerp(.45, 1.05, u / 7), allee: 1 };
  } },
  s: { scene: 'chabbat', duree: 6.5, pose: u => ({ camX: lerp(-.22, .12, sine(u / 6.5)), camY: -.46, camZ: lerp(-1.05, -.7, sine(u / 6.5)), focale: MF.W > MF.H ? 1.05 : .82, tilt: .08, nuit: lerp(.15, .7, u / 6.5), allume: clamp((u - 1.3) / 1.3) }) },
  fin: { scene: 'houppa', duree: 8, pose: u => ({ camX: lerp(-.6, .3, sine(u / 8)), camY: lerp(-3.2, -2.6, sine(u / 8)), camZ: lerp(-7, -4.5, sine(u / 8)), focale: MF.W > MF.H ? 1.1 : .95, tilt: .1, tod: lerp(2.1, 2.85, io(u / 6)), allee: 1 }) },
};
const CHIFFRES = ['I', 'II', 'III', 'IV'];
const chapitres = [];
{
  let t = 0;
  evs.forEach((k, i) => { chapitres.push({ k, t0: t, ...PLANS_FILM[k], num: i }); t += PLANS_FILM[k].duree; });
  chapitres.push({ k: 'fin', t0: t, ...PLANS_FILM.fin });
}
const FIN = chapitres[chapitres.length - 1].t0 + 7.6;
// les textes du film
const zone = $('#repliques');
for (const ch of chapitres) {
  if (ch.k === 'fin') {
    const n = el('div', 'replique r-centre'); n.id = 'f-noms';
    const s = el('span', 'noms-film'); s.innerHTML = '<span class="n1">Emma</span> <em>&amp;</em> <span class="n2">David</span>';
    n.append(s, el('span', 'sous', 'se marient'));
    const d = el('div', 'replique r-date'); d.id = 'f-date';
    d.append(el('span', 'ligne'), el('span', '', 'Juillet & août 2027 · Marseille & Israël'), el('span', 'ligne'));
    zone.append(n, d);
    ch.textes = [[n, ch.t0 + .7, 1e9], [d, ch.t0 + 2.2, 1e9], [$('#f-decouvrir'), ch.t0 + 4.4, 1e9]];
  } else {
    const ev = EVENTS[ch.k], n = el('div', 'replique r-haut' + (ch.sombre ? ' sombre' : ''));
    n.append(el('span', 'eyebrow', ev.date), el('span', 'titre-ev', ev.name), el('span', 'tag-ev', ev.tagline));
    zone.append(n);
    ch.textes = [[n, ch.t0 + .6, ch.t0 + ch.duree - .7]];
  }
}
const TIRS = [[2.6, .3, .2], [3.3, .72, .15], [4, .5, .1], [4.9, .22, .24], [5.8, .78, .22]].map(([d, x, y]) => [chapitres[chapitres.length - 1].t0 + d, x, y]);
let filmDemarre = false, tirs = 0, chapCourant = -1;

function poseFilm(f) {
  let i = 0;
  for (let j = 0; j < chapitres.length; j++) if (f >= chapitres[j].t0) i = j;
  const ch = chapitres[i];
  if (i !== chapCourant) {
    const debut = chapCourant < 0;
    chapCourant = i;
    Object.assign(MF.scenes[ch.scene].p, ch.pose(Math.max(0, f - ch.t0)));
    MF.montre(ch.scene, debut ? .001 : .9);
    if (!debut) $('#flash').animate([{ opacity: 0 }, { opacity: .45, offset: .35 }, { opacity: 0 }], { duration: 1000, easing: 'ease-out' });
  }
  Object.assign(MF.scenes[ch.scene].p, ch.pose(f - ch.t0));
}
function demarreFilm() { filmDemarre = true; etat = 'film'; film.classList.add('on'); requestAnimationFrame(() => film.classList.add('cadre')); }
function repliques(f) {
  for (const ch of chapitres) for (const [n, a, b] of ch.textes) n.classList.toggle('vu', f >= a && f < b);
  while (tirs < TIRS.length && f >= TIRS[tirs][0]) { const [, x, y] = TIRS[tirs++]; feux.tire(MF.W * x, MF.H * y, .9 + Math.random() * .3); }
  if (f >= FIN) versPage();
}
$('#passer').addEventListener('click', () => versPage());
$('#f-decouvrir').addEventListener('click', () => versPage());

/* =====================================================================
   3. L'invitation : chaque page a son décor et son mouvement de caméra
   ===================================================================== */
const PLANS = {
  couverture: { scene: 'houppa', pose: u => ({ camX: Math.sin(u * .05) * .5, camY: -2.6, camZ: -4.5 - 2 * sine(clamp(u / 30)), focale: MF.W > MF.H ? 1.1 : .95, tilt: MF.W > MF.H ? .12 : .24, tod: 2.85, allee: 1 }) },
  m: { scene: 'soie', clair: true, pose: u => ({ zoom: 1.12 - .06 * sine(clamp(u / 20)), derive: u * .01 }) },
  h: { scene: 'plage', pose: u => ({ variante: 0, camX: Math.sin(u * .07) * 1.6, camY: -1.4, camZ: lerp(-1.5, 0, sine(clamp(u / 12))), focale: .95, tilt: .08, soleil: lerp(.03, .016, clamp(u / 20)) }) },
  p: { scene: 'houppa', pose: u => ({ camX: Math.sin(u * 1.1) * .04, camY: -1.55 + Math.sin(u * 2.2) * .015, camZ: lerp(-1.8, 3.8, io(clamp(u / 11))), focale: MF.W > MF.H ? 1.1 : .95, tilt: MF.W > MF.H ? .04 : .12, tod: lerp(.35, 1.1, clamp(u / 16)), allee: 1 }) },
  s: { scene: 'chabbat', pose: u => ({ camX: Math.sin(u * .06) * .2, camY: -.46, camZ: lerp(-1, -.72, sine(clamp(u / 14))), focale: MF.W > MF.H ? 1.05 : .82, tilt: .12, nuit: lerp(.45, .9, clamp(u / 14)), allume: 1 }) },
  reponse: { scene: 'plage', clair: true, pose: u => ({ variante: 1, camX: Math.sin(u * .05) * .6, camY: lerp(-1.1, -1.6, sine(clamp(u / 16))), camZ: -.6, focale: .95, tilt: .1, soleil: .025 + .05 * sine(clamp(u / 25)) }) },
};
let planActif = null, tPlan = 0, depart = null;
function activer(nom) {
  if (planActif === nom || !PLANS[nom]) return;
  const pl = PLANS[nom], sc = MF.scenes[pl.scene];
  const meme = MF.actif === sc && MF.visible(sc);
  depart = meme ? { ...sc.p } : null;
  planActif = nom; tPlan = maintenant();
  if (!meme) { Object.assign(sc.p, pl.pose(0)); MF.montre(pl.scene, 1.3); }
}
function posePage(t) {
  if (!planActif) return;
  const pl = PLANS[planActif], sc = MF.scenes[pl.scene], u = t - tPlan, cible = pl.pose(u);
  const m = depart ? io(u / 2.2) : 1;
  for (const k in cible) sc.p[k] = depart && k in depart && k !== 'variante' ? lerp(depart[k], cible[k], m) : cible[k];
}

// ----- construction des pages -----
const main = $('#invitation');
function section(plan, id, clair) {
  const s = el('section', 'chap' + (clair ? ' clair' : '')); s.dataset.plan = plan; s.id = id;
  const c = el('div', 'contenu'); s.append(c); main.append(s);
  return c;
}
const apparait = n => { n.setAttribute('data-apparait', ''); return n; };
function couverture() {
  const c = section('couverture', 'couverture');
  const bh = el('p', 'bh', 'ב״ה'); bh.lang = 'he';
  c.append(apparait(bh), apparait(el('p', 'benediction', 'Avec la bénédiction de leurs familles')));
  const noms = apparait(el('h1', 'noms-page')); noms.innerHTML = '<span>Emma</span><em>&amp;</em><span>David</span>';
  c.append(noms, apparait(el('p', 'lead', 'ont la joie de vous convier à leur mariage')));
  if (nom) c.append(apparait(el('p', 'invite-nom', nom)));
  const ul = apparait(el('ul', 'programme'));
  for (const k of evs) { const li = el('li'); li.append(el('span', 'lbl', EVENTS[k].name), el('span', 'val', EVENTS[k].date)); ul.append(li); }
  c.append(ul, apparait(el('p', 'quand', 'Juillet & août 2027 · Marseille & Israël')));
  const a = el('a', 'defiler'); a.href = '#' + (evs[0] ? 'ev-' + evs[0] : 'reponse'); a.setAttribute('aria-label', 'Continuer'); a.append(el('span'));
  c.parentNode.append(a);
}
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
function reponse() {
  const c = section('reponse', 'reponse', true);
  c.append(apparait(el('p', 'surtitre', 'Votre réponse')), apparait(el('h2', '', 'Serez-vous des nôtres ?')));
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
if (invite) {
  couverture();
  evs.forEach(evenement);
  reponse();
} else {
  const c = section('couverture', 'couverture');
  const noms = el('h1', 'noms-page'); noms.innerHTML = '<span>Emma</span><em>&amp;</em><span>David</span>';
  c.append(noms, el('p', 'lead', "Cette invitation s'ouvre avec le lien personnel que vous avez reçu. Si vous l'avez perdu, demandez-le à Emma & David."));
}
main.append(el('footer', 'signature-mariage', 'Emma & David · 2027'));
for (const sec of $$('.chap')) [...sec.querySelectorAll('[data-apparait]')].forEach((n, i) => n.style.setProperty('--d', (i * .12) + 's'));

const sections = $$('.chap[data-plan]');
function chapitreCourant() {
  const mid = innerHeight * .5;
  let best = null, bd = 1e9;
  for (const c of sections) { const r = c.getBoundingClientRect(), d = Math.abs((r.top + r.bottom) / 2 - mid); if (d < bd) { bd = d; best = c; } }
  if (best) activer(best.dataset.plan);
}
let attenteDef = false;
addEventListener('scroll', () => { if (etat !== 'page' || attenteDef) return; attenteDef = true; requestAnimationFrame(() => { attenteDef = false; chapitreCourant(); }); }, { passive: true });
const apparitions = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vu'); apparitions.unobserve(e.target); } }), { threshold: .15 });
// filet de sécurité : tout ce qui est à l'écran apparaît, même si l'observateur tarde
function revele() {
  if (etat !== 'page') return;
  for (const n of document.querySelectorAll('[data-apparait]:not(.vu)')) { const r = n.getBoundingClientRect(); if (r.top < innerHeight * .92 && r.bottom > 0) n.classList.add('vu'); }
}
addEventListener('scroll', revele, { passive: true });
setInterval(revele, 600);

function versPage() {
  if (etat === 'page') return;
  const depuisFilm = etat === 'film';
  etat = 'page';
  if (document.getElementById('porte')) porte.remove();
  film.classList.add('fin'); film.classList.remove('cadre');
  $$('.replique').forEach(n => n.classList.remove('vu'));
  setTimeout(() => film.classList.remove('on'), 1600);
  document.body.classList.remove('verrou'); document.body.classList.add('page');
  scrollTo(0, 0);
  btnSon.hidden = SILENCE;
  planActif = null;
  if (!depuisFilm) Object.assign(MF.scenes.houppa.p, PLANS.couverture.pose(0));
  activer('couverture');
  $$('[data-apparait]').forEach(n => apparitions.observe(n));
}

let gel = null;   // essai : #f=12&gel fige le film à 12 s
MF.avant.push(t => {
  if (etat === 'ouverture' || etat === 'film') {
    if (gel !== null) T0 = t - DEBUT - gel;
    const u = t - T0, f = u - DEBUT;
    if (u > 2.1) poseFilm(Math.max(0, f));
    if (f >= 0 && !filmDemarre) demarreFilm();
    if (etat === 'film') repliques(f);
  } else if (etat === 'page') posePage(t);
});

/* ---------- raccourcis d'essai : #page, #page&solo&s=ev-h&u=8, #f=12&gel ---------- */
const h = location.hash;
if (/page/.test(h)) {
  etat = 'film'; versPage();
  const ms = h.match(/s=([\w-]+)/), mu = h.match(/u=([\d.]+)/);
  if (ms && document.getElementById(ms[1])) {
    if (/solo/.test(h)) $$('.chap, .signature-mariage').forEach(n => { if (n.id !== ms[1]) n.style.display = 'none'; });
    document.getElementById(ms[1]).scrollIntoView();
    $$('[data-apparait]').forEach(n => n.classList.add('vu'));
    planActif = null; chapitreCourant();
  }
  if (mu) tPlan -= parseFloat(mu[1]);
} else {
  const m = h.match(/f=([\d.]+)/);
  if (m) {
    if (/gel/.test(h)) gel = parseFloat(m[1]);
    porte.remove(); etat = 'ouverture'; T0 = maintenant() - DEBUT - parseFloat(m[1]);
  }
}
})();

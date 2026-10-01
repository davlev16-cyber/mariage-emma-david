/* Emma & David · défilement automatique, commun aux trois versions du site
   La page avance toute seule d'une partie à la suivante : une pause pour regarder ou lire, puis une glissade faite
   par le navigateur lui-même (scrollTo en douceur), qui s'arrête d'elle-même dès qu'on touche l'écran.
   Le doigt garde toujours la main : tant qu'il est posé, rien ne bouge tout seul ; après un geste, la page finit
   de glisser sur son élan, puis le défilement automatique reprend après quelques secondes de calme.
   Aucun écouteur n'intercepte le toucher (tous passifs, aucun preventDefault). */
(function () {
  'use strict';
  const CALME = 3500;     // calme demandé après un geste de l'invité (ms)
  const GLISSE = 1800;    // durée maximale d'une glissade du navigateur (ms)
  window.Defile = function (o) {
    // o.cibles() : [{ y, duree (s), fin }] dans l'ordre de la page ; o.actif() : le défilement peut-il avancer ?
    let doigt = false, pauseJusqua = 0, glisseJusqua = 0, arret = !!o.reduit, ici = -1, depuis = 0;
    const maintenant = () => performance.now();
    const attendre = () => { pauseJusqua = maintenant() + CALME; };
    addEventListener('touchstart', () => { doigt = true; glisseJusqua = 0; attendre(); }, { passive: true });
    ['touchend', 'touchcancel'].forEach(t => addEventListener(t, () => { doigt = false; attendre(); }, { passive: true }));
    ['wheel', 'keydown', 'mousedown'].forEach(t => addEventListener(t, () => { glisseJusqua = 0; attendre(); }, { passive: true }));
    // la page bouge sans nous (élan du doigt, molette) : on attend qu'elle se soit arrêtée
    addEventListener('scroll', () => { if (maintenant() > glisseJusqua) attendre(); }, { passive: true });
    // l'invité remplit le formulaire de réponse : plus rien ne bouge tout seul
    document.addEventListener('focusin', e => { if (e.target && e.target.closest && e.target.closest('form')) arret = true; });
    return {
      arrete() { arret = true; },
      demarre(delai = 0) { pauseJusqua = maintenant() + delai; ici = -1; },
      // à appeler à chaque image
      pas() {
        const t = maintenant();
        if (arret || !o.actif() || doigt || t < pauseJusqua || t < glisseJusqua) return;
        const L = o.cibles();
        if (!L.length) return;
        const y = scrollY;
        let i = 0;
        for (let j = 0; j < L.length; j++) if (y >= L[j].y - 12) i = j;
        if (i !== ici) { ici = i; depuis = t; }
        const c = L[i], s = L[i + 1];
        if (c.fin || !s || t - depuis < c.duree * 1000) return;
        glisseJusqua = t + GLISSE;
        window.scrollTo({ top: s.y, behavior: 'smooth' });
        ici = i + 1; depuis = t + GLISSE * .5;
      },
    };
  };
})();

// Musique du site.
// 1. La chanson choisie (YOUTUBE_ID dans config.js), jouée par un lecteur YouTube caché.
// 2. Si YouTube refuse la lecture : une composition originale dans l'esprit de la
//    pop orientale israélienne (mode Hijaz sur ré), jouée par le navigateur.
// Les navigateurs n'autorisent le son qu'après un premier geste : la musique
// démarre au premier toucher de l'écran, ou avec le petit bouton ♪.

const Music = (function () {
  let ctx, master, reverb, timer, started = false, muted = false, audioEl = null;
  const BPM = 100, BEAT = 60 / BPM, BAR = BEAT * 4;
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  // ----- Composition originale : 16 mesures en boucle -----
  // Mélodie : [note MIDI, durée en temps] par mesure
  const MELODY = [
    [[74,.5],[75,.5],[74,.5],[72,.5],[70,1],[69,1]],
    [[72,.75],[70,.25],[69,.5],[67,.5],[69,2]],
    [[70,.5],[69,.5],[67,.5],[66,.5],[67,1],[62,1]],
    [[66,.5],[67,.5],[69,1],[66,.5],[63,.5],[62,1]],
    [[69,.5],[70,.5],[72,.5],[74,.5],[75,1.5],[74,.5]],
    [[75,.5],[74,.5],[72,.5],[70,.5],[67,2]],
    [[72,.5],[70,.5],[69,.5],[67,.5],[66,1],[67,.5],[66,.5]],
    [[63,.5],[66,.5],[62,3]],
    [[74,1],[74,.5],[75,.5],[79,1.5],[78,.5]],
    [[79,.5],[78,.5],[75,.5],[74,.5],[74,2]],
    [[72,.5],[74,.5],[75,1],[74,.5],[72,.5],[70,1]],
    [[69,.5],[70,.5],[69,.5],[67,.5],[66,2]],
    [[74,1],[74,.5],[75,.5],[79,1],[81,1]],
    [[82,.5],[81,.5],[79,.5],[78,.5],[79,2]],
    [[75,.5],[74,.5],[72,.5],[70,.5],[69,1],[67,1]],
    [[66,.5],[67,.5],[63,.5],[66,.5],[62,2]]
  ];
  // Accords (tapis de cordes) et basse
  const CH = { D: [50, 54, 57], Cm: [48, 51, 55], Gm: [55, 58, 62], Eb: [51, 55, 58] };
  const BASS = { D: 38, Cm: 36, Gm: 43, Eb: 39 };
  const CHORDS = ["D","Cm","Gm","D", "D","Eb","Cm","D", "Gm","D","Cm","D", "Gm","D","Eb","D"];
  const ORNAMENT = new Set([0, 4, 8, 12]);

  function makeReverb() {
    const len = ctx.sampleRate * 2.2, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const conv = ctx.createConvolver(); conv.buffer = buf;
    const wet = ctx.createGain(); wet.gain.value = 0.3;
    conv.connect(wet).connect(master);
    return conv;
  }
  function out(node, wet) { node.connect(master); if (wet !== false) node.connect(reverb); }

  // Bouzouki : corde pincée brillante, trémolo sur les notes longues
  function pluck(m, t, level, len) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.Q.value = 3;
    lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(900, t + .35);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(level, t + .005);
    g.gain.exponentialRampToValueAtTime(.0001, t + len);
    [0, 7].forEach(det => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq(m); o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + len + .05);
    });
    lp.connect(g); out(g);
  }
  function lead(m, t, beats, ornament) {
    const dur = beats * BEAT;
    if (ornament) pluck(m + 1, t - .07, .12, .12);          // petite appoggiature
    if (beats >= 1) {                                        // trémolo façon bouzouki
      const n = Math.floor(dur / (BEAT / 4));
      for (let i = 0; i < n; i++) pluck(m, t + i * BEAT / 4, i ? .1 : .2, BEAT / 3);
    } else pluck(m, t, .2, Math.max(.35, dur * 1.3));
  }

  // Cordes : accord tenu, attaque douce
  function pad(notes, t) {
    notes.forEach(m => [-6, 6].forEach(det => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.value = freq(m); o.detune.value = det;
      lp.type = "lowpass"; lp.frequency.value = 1100;
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.022, t + .5);
      g.gain.setValueAtTime(.022, t + BAR - .25); g.gain.linearRampToValueAtTime(.0001, t + BAR + .15);
      o.connect(lp).connect(g); out(g); o.start(t); o.stop(t + BAR + .2);
    }));
  }

  function bass(m, t, len) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = "triangle"; o.frequency.value = freq(m);
    lp.type = "lowpass"; lp.frequency.value = 500;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.32, t + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t + len);
    o.connect(lp).connect(g); out(g, false); o.start(t); o.stop(t + len + .05);
  }

  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .18);
    g.gain.setValueAtTime(.7, t); g.gain.exponentialRampToValueAtTime(.0001, t + .25);
    o.connect(g); out(g, false); o.start(t); o.stop(t + .26);
  }
  function noise(t, level, freqHz, q, len) {
    const n = Math.floor(ctx.sampleRate * len), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freqHz; bp.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    s.connect(bp).connect(g); out(g); s.start(t);
  }
  const clap = t => noise(t, .35, 1500, .8, .16);
  const tek = (t, l) => noise(t, l, 3400, 1.6, .05);
  function doum(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(55, t + .2);
    g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.0001, t + .25);
    o.connect(g); out(g, false); o.start(t); o.stop(t + .26);
  }

  function scheduleBar(i, t) {
    const chord = CHORDS[i % 16];
    pad(CH[chord], t);
    // Basse : 1, "et" de 2, 3
    [[0, 1.4], [1.5, .9], [2, 1.8]].forEach(([b, l]) => bass(BASS[chord] + (b === 1.5 ? 12 : 0), t + b * BEAT, l * BEAT));
    // Rythme pop : grosse caisse 1 et 3, clap 2 et 4 ; darbouka en croches, relance en fin de phrase
    kick(t); kick(t + 2 * BEAT);
    clap(t + BEAT); clap(t + 3 * BEAT);
    [.5, 1.5, 2.5, 3.5].forEach(b => tek(t + b * BEAT, .12));
    doum(t + 1.5 * BEAT);
    if (i % 4 === 3) [3, 3.25, 3.5, 3.75].forEach(b => tek(t + b * BEAT, .2));
    // Mélodie (elle entre à la 2e mesure du morceau)
    if (i >= 1) {
      let b = 0;
      MELODY[(i - 1) % 16].forEach(([m, len], j) => {
        lead(m, t + b * BEAT, len, j === 0 && ORNAMENT.has((i - 1) % 16));
        b += len;
      });
    }
  }

  let bar = 0, nextBar = 0;
  function schedule() {
    while (nextBar < ctx.currentTime + .5) { scheduleBar(bar, nextBar); bar++; nextBar += BAR; }
  }

  function startSynth() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = .0001; master.connect(ctx.destination);
      reverb = makeReverb();
      master.gain.exponentialRampToValueAtTime(.45, ctx.currentTime + 2);
      nextBar = ctx.currentTime + .2;
      timer = setInterval(schedule, 100);
      ctx.resume();
      started = true;
    } catch (e) { started = false; }
    update();
  }

  // ----- Chanson YouTube, lecteur caché -----
  let yt = null, ytReady = false, ytWant = false, useYouTube = false;
  function setupYouTube() {
    if (!YOUTUBE_ID) return false;
    const box = document.createElement("div");
    box.id = "yt";
    box.setAttribute("aria-hidden", "true");
    box.style.cssText = "position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0;pointer-events:none;overflow:hidden;";
    document.body.append(box);
    window.onYouTubeIframeAPIReady = () => {
      yt = new YT.Player("yt", {
        videoId: YOUTUBE_ID, width: "2", height: "2",
        playerVars: { playsinline: 1, rel: 0, loop: 1, playlist: YOUTUBE_ID, modestbranding: 1 },
        events: {
          onReady: () => { ytReady = true; yt.setVolume(70); if (ytWant) yt.playVideo(); },
          // Si YouTube refuse la lecture, on passe à la composition originale
          onError: () => { useYouTube = false; ytReady = false; if (ytWant) start(); },
          onStateChange: e => { started = e.data === 1 || e.data === 3; muted = !started; update(); }
        }
      });
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => { useYouTube = false; if (ytWant) start(); };
    document.head.append(s);
    return true;
  }
  addEventListener("DOMContentLoaded", () => { useYouTube = setupYouTube(); });

  function start() {
    if (useYouTube) { ytWant = true; if (ytReady) yt.playVideo(); return; }
    if (started || muted) return;
    if (MUSIC_URL) {
      started = true;
      audioEl = new Audio(MUSIC_URL); audioEl.loop = true; audioEl.volume = .6;
      audioEl.play().catch(() => { started = false; update(); });
      update(); return;
    }
    startSynth();
  }

  function toggle() {
    if (useYouTube) {
      if (!ytReady) { ytWant = true; return; }
      yt.getPlayerState() === 1 ? yt.pauseVideo() : yt.playVideo();
      return;
    }
    if (!started) { muted = false; start(); return; }
    muted = !muted;
    if (audioEl) { muted ? audioEl.pause() : audioEl.play(); }
    else if (ctx) { muted ? ctx.suspend() : ctx.resume(); }
    update();
  }

  function update() {
    const b = document.getElementById("sound");
    if (!b) return;
    const on = started && !muted;
    b.classList.toggle("on", on);
    b.setAttribute("aria-label", on ? "Couper la musique" : "Mettre la musique");
  }

  // Premier geste n'importe où sur la page = la musique démarre
  const first = e => {
    if (e.target && e.target.closest && e.target.closest("#sound")) return;
    start();
    ["pointerdown", "touchstart", "keydown"].forEach(t => removeEventListener(t, first, true));
  };
  ["pointerdown", "touchstart", "keydown"].forEach(t => addEventListener(t, first, true));

  return { start, toggle };
})();

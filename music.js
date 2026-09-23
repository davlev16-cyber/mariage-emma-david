// Musique d'inspiration hébraïque, composée pour le site et jouée par le navigateur :
// mélodie dans le mode Ahava Rabbah (ré, mi♭, fa♯, sol, la, si♭, do),
// bourdon ré–la et rythme de darbouka (maqsoum).
// Les navigateurs n'autorisent le son qu'après un premier geste : la musique
// démarre au premier toucher de l'écran, ou avec le petit bouton ♪.

const Music = (function () {
  let ctx, master, reverb, timer, nextTime = 0, step = 0, started = false, muted = false, audioEl = null;
  const BPM = 92, BEAT = 60 / BPM;

  // [note MIDI, durée en temps] — 0 = silence
  const A = [[69,1],[70,.5],[69,.5],[67,.5],[66,.5],[67,1], [69,2],[0,1],[69,.5],[70,.5],
             [72,1],[70,.5],[69,.5],[70,.5],[69,.5],[67,1], [66,1],[63,.5],[66,.5],[62,2]];
  const B = [[74,1],[72,.5],[70,.5],[72,1],[69,1], [70,.5],[69,.5],[67,.5],[69,.5],[66,2],
             [67,.5],[69,.5],[70,1],[69,.5],[67,.5],[66,1], [63,.5],[66,.5],[67,.5],[66,.5],[62,2]];
  const SONG = [...A, ...A, ...B, ...A];
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  function makeReverb() {
    const len = ctx.sampleRate * 2.4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const conv = ctx.createConvolver(); conv.buffer = buf;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    conv.connect(wet).connect(master);
    return conv;
  }

  function out(node) { node.connect(master); node.connect(reverb); }

  // Corde pincée façon oud
  function pluck(m, t, dur) {
    const f = freq(m);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 2;
    lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.6, dur * 1.4));
    [[0, "sawtooth"], [4, "triangle"]].forEach(([det, type]) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur * 1.6 + 0.6);
    });
    lp.connect(g); out(g);
    // Petit vibrato sur les notes longues
    if (dur >= 1) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = "sine"; o.frequency.value = f; og.gain.setValueAtTime(0.0001, t);
      og.gain.linearRampToValueAtTime(0.05, t + 0.3); og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = f * 0.012; lfo.connect(lg).connect(o.frequency);
      o.connect(og); out(og); o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    }
  }

  function doum(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); out(g); o.start(t); o.stop(t + 0.32);
  }

  function tek(t, level) {
    const len = ctx.sampleRate * 0.06, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(bp).connect(g); out(g); s.start(t);
  }

  function drone() {
    [[38, 0.05], [45, 0.035], [50, 0.02]].forEach(([m, level]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.value = freq(m);
      lp.type = "lowpass"; lp.frequency.value = 420;
      g.gain.value = level;
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.08 + Math.random() * 0.05; lg.gain.value = level * 0.5;
      lfo.connect(lg).connect(g.gain);
      o.connect(lp).connect(g); g.connect(master); g.connect(reverb);
      o.start(); lfo.start();
    });
  }

  // Programme les notes un peu à l'avance
  let beatPos = 0, drumBeat = 0;
  function schedule() {
    while (nextTime < ctx.currentTime + 0.4) {
      const [m, len] = SONG[step % SONG.length];
      if (m) pluck(m, nextTime, len * BEAT);
      // Darbouka : doum . tek . tek doum . tek (en croches)
      const startBeat = beatPos, endBeat = beatPos + len;
      for (let e = Math.ceil(startBeat * 2) / 2; e < endBeat; e += 0.5) {
        const pos = Math.round((e % 4) * 2);
        const tt = nextTime + (e - startBeat) * BEAT;
        if (pos === 0 || pos === 4) doum(tt);
        else if (pos === 1 || pos === 3 || pos === 6) tek(tt, pos === 6 ? 0.18 : 0.12);
      }
      beatPos = endBeat;
      nextTime += len * BEAT;
      step++;
    }
  }

  // ----- Chanson YouTube (lecteur officiel, visible sur la couverture) -----
  let yt = null, ytReady = false, ytWant = false;
  function setupYouTube() {
    if (!YOUTUBE_ID || !document.getElementById("yt")) return false;
    window.onYouTubeIframeAPIReady = () => {
      yt = new YT.Player("yt", {
        videoId: YOUTUBE_ID, width: "100%", height: "200",
        playerVars: { playsinline: 1, rel: 0, loop: 1, playlist: YOUTUBE_ID, modestbranding: 1 },
        events: {
          onReady: () => { ytReady = true; if (ytWant) yt.playVideo(); },
          onStateChange: e => { started = e.data === 1 || e.data === 3; muted = !started; update(); }
        }
      });
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.append(s);
    return true;
  }
  let useYouTube = false;
  addEventListener("DOMContentLoaded", () => { useYouTube = setupYouTube(); });

  function start() {
    if (useYouTube) { ytWant = true; if (ytReady) yt.playVideo(); return; }
    if (started || muted) return;
    started = true;
    if (MUSIC_URL) {
      audioEl = new Audio(MUSIC_URL); audioEl.loop = true; audioEl.volume = 0.6;
      audioEl.play().catch(() => { started = false; });
      update(); return;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.0001; master.connect(ctx.destination);
      reverb = makeReverb();
      master.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 3);
      drone();
      nextTime = ctx.currentTime + 0.3;
      timer = setInterval(schedule, 100);
      ctx.resume();
    } catch (e) { started = false; }
    update();
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

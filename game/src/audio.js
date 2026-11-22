// STORM SURGE — audio.js: WebAudio storm, radio and car sounds.
// Everything is synthesized live — no audio files, no network. Three
// original radio stations (synthwave, storm-jazz, talk radio), rain noise,
// thunder rumbles, engine hum, sirens, gunfire and the nitro whoosh.

const STATIONS = [
  { name: 'SURGE FM 101.1 — SYNTHWAVE', bpm: 112, root: 55, scale: [0, 3, 5, 7, 10, 12], wave: 'sawtooth' },
  { name: 'BAY 88.4 — STORM JAZZ', bpm: 84, root: 65.41, scale: [0, 3, 5, 6, 10, 12], wave: 'triangle' },
  { name: 'CBPD TALK 640 — DISPATCH', bpm: 60, root: 110, scale: [0, 0, 7, 0, 12, 0], wave: 'square' },
];

export function createAudio() {
  const audio = {
    ctx: null, master: null, musicGain: null, rainGain: null, engineOsc: null,
    engineGain: null, station: 0, nextNote: 0, step: 0, timer: null,
    started: false, muted: false,
  };

  audio.ensure = function () {
    if (audio.ctx) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    audio.ctx = ctx;
    audio.master = ctx.createGain();
    audio.master.gain.value = 0.55;
    audio.master.connect(ctx.destination);
    audio.musicGain = ctx.createGain();
    audio.musicGain.gain.value = 0.16;
    audio.musicGain.connect(audio.master);
    audio.rainGain = ctx.createGain();
    audio.rainGain.gain.value = 0.12;
    audio.rainGain.connect(audio.master);
    audio.engineGain = ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineGain.connect(audio.master);

    // Rain: looped filtered white noise.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const rain = ctx.createBufferSource();
    rain.buffer = buf; rain.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass'; rainFilter.frequency.value = 1400;
    rain.connect(rainFilter); rainFilter.connect(audio.rainGain);
    rain.start();

    // Engine: two detuned saws through a lowpass.
    audio.engineOsc = ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 55;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass'; engineFilter.frequency.value = 500;
    audio.engineOsc.connect(engineFilter);
    engineFilter.connect(audio.engineGain);
    audio.engineOsc.start();

    audio.started = true;
    audio.scheduleMusic();
  };

  audio.scheduleMusic = function () {
    if (!audio.ctx) return;
    const st = STATIONS[audio.station];
    const beat = 60 / st.bpm / 2;
    const playStep = () => {
      if (!audio.ctx || audio.muted) { audio.timer = setTimeout(playStep, 250); return; }
      const now = audio.ctx.currentTime;
      const scale = st.scale;
      const note = scale[audio.step % scale.length] + 12 * Math.floor(audio.step / scale.length) % 2 * 0;
      const freq = st.root * Math.pow(2, note / 12) * (audio.step % 8 === 0 ? 2 : 1);
      const osc = audio.ctx.createOscillator();
      osc.type = st.wave;
      osc.frequency.value = freq;
      const g = audio.ctx.createGain();
      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + beat * 1.8);
      osc.connect(g); g.connect(audio.musicGain);
      osc.start(now); osc.stop(now + beat * 2);
      // Bass on the downbeat.
      if (audio.step % 4 === 0) {
        const bass = audio.ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.value = st.root / 2;
        const bg = audio.ctx.createGain();
        bg.gain.setValueAtTime(0.9, now);
        bg.gain.exponentialRampToValueAtTime(0.001, now + beat * 3);
        bass.connect(bg); bg.connect(audio.musicGain);
        bass.start(now); bass.stop(now + beat * 3);
      }
      audio.step++;
      audio.timer = setTimeout(playStep, beat * 1000);
    };
    playStep();
  };

  audio.nextStation = function () {
    audio.station = (audio.station + 1) % STATIONS.length;
    audio.step = 0;
    return STATIONS[audio.station].name;
  };

  audio.stationName = function () { return STATIONS[audio.station].name; };

  audio.setSpeed = function (speed01, nitro) {
    if (!audio.ctx) return;
    audio.engineOsc.frequency.value = 50 + speed01 * 160 + (nitro ? 60 : 0);
    audio.engineGain.gain.value = 0.05 + speed01 * 0.12;
    audio.rainGain.gain.value = 0.10 + speed01 * 0.05;
  };

  audio.thunder = function (intensity) {
    if (!audio.ctx || audio.muted) return;
    const ctx = audio.ctx;
    const dur = 1.6;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 220;
    const g = ctx.createGain();
    g.gain.value = 0.5 * intensity;
    src.connect(f); f.connect(g); g.connect(audio.master);
    src.start();
  };

  audio.siren = function () {
    if (!audio.ctx || audio.muted) return;
    const ctx = audio.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const g = ctx.createGain();
    g.gain.value = 0.05;
    osc.connect(g); g.connect(audio.master);
    const t0 = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      osc.frequency.linearRampToValueAtTime(880, t0 + i * 0.5 + 0.25);
      osc.frequency.linearRampToValueAtTime(660, t0 + i * 0.5 + 0.5);
    }
    osc.start(t0); osc.stop(t0 + 2.1);
  };

  audio.shot = function () {
    if (!audio.ctx || audio.muted) return;
    const ctx = audio.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(g); g.connect(audio.master);
    src.start();
  };

  audio.boom = function () {
    if (!audio.ctx || audio.muted) return;
    const ctx = audio.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 320;
    const g = ctx.createGain();
    g.gain.value = 0.8;
    src.connect(f); f.connect(g); g.connect(audio.master);
    src.start();
  };

  audio.nitro = function () {
    if (!audio.ctx || audio.muted) return;
    const ctx = audio.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.7, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0.3;
    src.connect(f); f.connect(g); g.connect(audio.master);
    src.start();
  };

  audio.cash = function () {
    if (!audio.ctx || audio.muted) return;
    const ctx = audio.ctx;
    [880, 1174, 1568].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const t0 = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.25, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
      osc.connect(g); g.connect(audio.master);
      osc.start(t0); osc.stop(t0 + 0.3);
    });
  };

  return audio;
}

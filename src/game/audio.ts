let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let musicOn = false;
let muted = false;
let nextNote = 0;
let step = 0;
let timer = 0;

const DEG = [0, 3, 5, 7, 10, 7, 5, 3, 7, 3, 0, 5];

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.gain.value = 0.85;
    musicBus.gain.value = 0.14;
    master.gain.value = muted ? 0 : 0.9;
    sfxBus.connect(master);
    musicBus.connect(master);
    master.connect(ctx.destination);
    const n = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuf = n;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

export function bindAudioVisibility() {
  if (typeof document === "undefined") return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void ctx?.resume();
  });
}

export function setMuted(next: boolean) {
  muted = next;
  const c = ac();
  if (c && master) master.gain.setTargetAtTime(next ? 0 : 0.9, c.currentTime, 0.03);
}

function burst(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  const c = ac();
  if (!c || !sfxBus) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g);
  g.connect(sfxBus);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

function rustle(dur: number, gain: number, freq: number) {
  const c = ac();
  if (!c || !sfxBus || !noiseBuf) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(sfxBus);
  src.start();
  src.stop(c.currentTime + dur);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    g.disconnect();
  };
}

export function playThwack() {
  const wobble = 0.92 + Math.random() * 0.16;
  rustle(0.09, 0.55, 900);
  burst(180 * wobble, 0.12, "triangle", 0.45, -100);
}

export function playCheer() {
  burst(523, 0.18, "triangle", 0.12);
  burst(659, 0.22, "sine", 0.1);
  rustle(0.25, 0.18, 1400);
}

export function playOut() {
  burst(110, 0.28, "sine", 0.4, -70);
  rustle(0.12, 0.3, 300);
}

export function playCoin() {
  burst(880, 0.08, "square", 0.08);
  burst(1320, 0.1, "square", 0.06);
}

export function playTap() {
  burst(640, 0.04, "square", 0.05);
}

function schedule() {
  const c = ctx;
  if (!c || !musicBus || !musicOn) return;
  const when = Math.max(c.currentTime + 0.05, nextNote || c.currentTime + 0.05);
  const semi = DEG[step % DEG.length];
  const freq = 196 * Math.pow(2, semi / 12);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = step % 4 === 0 ? "triangle" : "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.18, when + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.42);
  o.connect(g);
  g.connect(musicBus);
  o.start(when);
  o.stop(when + 0.46);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
  step += 1;
  nextNote = when + (step % 8 === 0 ? 0.72 : 0.34);
  timer = window.setTimeout(schedule, Math.max(40, (nextNote - c.currentTime - 0.12) * 1000));
}

export function startBed() {
  unlockAudio();
  if (musicOn) return;
  musicOn = true;
  nextNote = 0;
  schedule();
}

export function stopBed() {
  musicOn = false;
  window.clearTimeout(timer);
}

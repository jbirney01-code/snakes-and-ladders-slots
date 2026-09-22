/**
 * Gameplay sound effects only. No background bed.
 * Unlocks on the first gesture. SFX can be muted from the cabinet.
 */
const w = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
if (w && !w.__snlDingKilled) {
  w.__snlDingKilled = true;
  const mark = window.setTimeout(() => {}, 0);
  for (let i = 0; i <= mark; i++) window.clearTimeout(i);
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicTimer: number | null = null;
let duckUntil = 0;
let sfxOn = true;
let started = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C({ latencyHint: "interactive" });
    master = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.gain.value = 0;
    sfxBus.gain.value = 0.55;
    master.gain.value = 0.85;
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);
  }
  return ctx;
}

function ramp(g: GainNode, v: number, t = 0.04) {
  const c = ac();
  if (!c) return;
  g.gain.cancelScheduledValues(c.currentTime);
  g.gain.setTargetAtTime(v, c.currentTime, t);
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  started = true;
  stopMusic();
}

export function setMusicEnabled(_on: boolean) {
  stopMusic();
  if (musicBus) ramp(musicBus, 0, 0.05);
}

export function setSfxEnabled(on: boolean) {
  sfxOn = on;
  if (!sfxBus) return;
  ramp(sfxBus, on ? 0.55 : 0, 0.04);
}

function envGain(bus: GainNode, attack: number, dur: number, peak: number) {
  const c = ac();
  if (!c || !bus) return null;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(peak, c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  g.connect(bus);
  return g;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  peak = 0.2,
  bus?: GainNode,
  detune = 0,
) {
  const c = ac();
  if (!c || !sfxOn && bus === sfxBus) return;
  const dest = bus ?? sfxBus;
  if (!dest) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  const g = envGain(dest, 0.01, dur, peak);
  if (!g) return;
  o.connect(g);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

function noiseBurst(dur: number, peak: number, hp = 800, bus?: GainNode) {
  const c = ac();
  const dest = bus ?? sfxBus;
  if (!c || !dest) return;
  const n = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = n.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = n;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = envGain(dest, 0.005, dur, peak);
  if (!g) return;
  src.connect(f);
  f.connect(g);
  src.start();
  src.stop(c.currentTime + dur);
}

export function duck(ms = 700) {
  const c = ac();
  if (!c || !musicBus) return;
  duckUntil = performance.now() + ms;
  ramp(musicBus, 0, 0.05);
  window.setTimeout(() => {
    if (performance.now() >= duckUntil - 20 && musicBus) ramp(musicBus, 0, 0.05);
  }, ms);
}

function stopMusic() {
  if (musicTimer != null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

export function sfxClick() {
  if (!sfxOn) return;
  noiseBurst(0.045, 0.12, 1400);
  tone(620 + Math.random() * 40, 0.06, "triangle", 0.08);
}

export function sfxWood() {
  if (!sfxOn) return;
  noiseBurst(0.03, 0.16, 900);
  tone(180 + Math.random() * 30, 0.08, "triangle", 0.12);
}

export function sfxDice() {
  if (!sfxOn) return;
  noiseBurst(0.05, 0.2, 700);
  tone(240, 0.07, "square", 0.05);
  setTimeout(() => noiseBurst(0.04, 0.16, 900), 70);
}

export function sfxSpin() {
  if (!sfxOn) return;
  noiseBurst(0.18, 0.1, 400);
}

export function sfxStop() {
  if (!sfxOn) return;
  sfxWood();
}

export function sfxWinSmall() {
  if (!sfxOn) return;
  tone(523, 0.12, "sine", 0.12);
  setTimeout(() => tone(659, 0.14, "sine", 0.12), 80);
}

export function sfxWinBig() {
  if (!sfxOn) return;
  duck(1400);
  [392, 494, 587, 784, 988].forEach((f, i) => setTimeout(() => tone(f, 0.22, "triangle", 0.14), i * 90));
  setTimeout(() => noiseBurst(0.4, 0.1, 600), 200);
}

export function sfxLadder() {
  if (!sfxOn) return;
  duck(800);
  [392, 440, 494, 587, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, "sine", 0.13), i * 70));
}

export function sfxSnake() {
  if (!sfxOn) return;
  const c = ac();
  if (!c || !sfxBus) return;
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(320, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(90, c.currentTime + 0.55);
  const g = envGain(sfxBus, 0.02, 0.6, 0.1);
  if (!g) return;
  o.connect(g);
  o.start();
  o.stop(c.currentTime + 0.62);
}

export function sfxRiser() {
  if (!sfxOn) return;
  const c = ac();
  if (!c || !sfxBus) return;
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(140, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(680, c.currentTime + 0.55);
  const g = envGain(sfxBus, 0.05, 0.6, 0.06);
  if (!g) return;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(400, c.currentTime);
  f.frequency.exponentialRampToValueAtTime(2200, c.currentTime + 0.55);
  o.connect(f);
  f.connect(g);
  o.start();
  o.stop(c.currentTime + 0.62);
}

export function sfxFanfare() {
  sfxWinBig();
}

export function sfxWhoops() {
  sfxSnake();
}

export function haptic(ms = 12) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

export function isAudioStarted() {
  return started;
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    const c = ac();
    if (!c) return;
    if (document.visibilityState === "visible" && c.state === "suspended") void c.resume();
  });
}

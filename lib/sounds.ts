"use client";

/**
 * Notification sounds, synthesised with the Web Audio API so there is no audio file to ship or load.
 * Browsers keep audio locked until the page has had a click or key press, so `primeAudio` is called on the first one.
 */
let ctx: AudioContext | null = null;
let lastPlayed = 0;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function primeAudio() {
  const c = getContext();
  if (c && c.state === "suspended") void c.resume().catch(() => {});
}

function tone(c: AudioContext, freq: number, start: number, length: number, peak: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

/** A soft two-note chime for an incoming chat message. Rate-limited so a burst of messages doesn't stack up. */
export function playMessageSound() {
  const c = getContext();
  if (!c || c.state !== "running") return;
  const now = performance.now();
  if (now - lastPlayed < 700) return;
  lastPlayed = now;
  const t = c.currentTime;
  tone(c, 880, t, 0.16, 0.14);
  tone(c, 1318.5, t + 0.09, 0.22, 0.12);
}

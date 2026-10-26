/**
 * Chat notification sounds
 * Primary: short Web Audio beeps (no network, works offline)
 * Optional: /sounds/message-send.wav & message-receive.wav if present in public/
 */

let unlocked = false;
let audioCtx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

/** Unlock autoplay — call on first user gesture (open panel / send) */
export function unlockChatSounds() {
  if (unlocked) return;
  unlocked = true;
  try {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  } catch {
    /* ignore */
  }
}

function playOsc(freqs, duration = 0.1, volume = 0.18) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    gain.connect(ctx.destination);
    for (const [f, amp] of freqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);
      const g = ctx.createGain();
      g.gain.value = amp;
      osc.connect(g);
      g.connect(gain);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }
  } catch {
    /* ignore */
  }
}

function playFile(url, volume = 0.4) {
  try {
    const a = new Audio(url);
    a.volume = volume;
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/** User sent a message — higher short blip */
export function playSendSound() {
  unlockChatSounds();
  // Prefer file if shipped under public/sounds/
  if (playFile("/sounds/message-send.wav", 0.35)) return;
  playOsc(
    [
      [880, 0.7],
      [1320, 0.35],
    ],
    0.09,
    0.16
  );
}

/** Bot replied — softer two-tone notification */
export function playReceiveSound() {
  unlockChatSounds();
  if (playFile("/sounds/message-receive.wav", 0.4)) return;
  playOsc(
    [
      [523, 0.55],
      [784, 0.5],
    ],
    0.15,
    0.15
  );
}

/**
 * Chat notification sounds — Web Audio only (reliable, offline, no 404).
 * Optional files under /sounds/ are attempted only if they load successfully.
 */

let unlocked = false;
let audioCtx = null;
let muted = false;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

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

export function setChatSoundsMuted(v) {
  muted = !!v;
}

export function isChatSoundsMuted() {
  return muted;
}

function playOsc(freqs, duration = 0.1, volume = 0.14) {
  if (muted) return;
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(volume, now + 0.006);
    master.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    master.connect(ctx.destination);
    for (const [f, amp] of freqs) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);
      const g = ctx.createGain();
      g.gain.value = amp;
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }
  } catch {
    /* ignore */
  }
}

const fileOk = { send: null, receive: null };

function tryPlayFile(key, url, volume) {
  if (muted) return Promise.resolve(false);
  if (fileOk[key] === false) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      const a = new Audio(url);
      a.volume = volume;
      a.addEventListener("error", () => {
        fileOk[key] = false;
        resolve(false);
      });
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          fileOk[key] = true;
          resolve(true);
        }).catch(() => {
          fileOk[key] = false;
          resolve(false);
        });
      } else {
        resolve(false);
      }
    } catch {
      fileOk[key] = false;
      resolve(false);
    }
  });
}

export function playSendSound() {
  unlockChatSounds();
  tryPlayFile("send", "/sounds/message-send.wav", 0.35).then((ok) => {
    if (!ok) {
      playOsc(
        [
          [880, 0.65],
          [1320, 0.3],
        ],
        0.08,
        0.12
      );
    }
  });
}

export function playReceiveSound() {
  unlockChatSounds();
  tryPlayFile("receive", "/sounds/message-receive.wav", 0.4).then((ok) => {
    if (!ok) {
      playOsc(
        [
          [523, 0.5],
          [784, 0.45],
        ],
        0.14,
        0.12
      );
    }
  });
}

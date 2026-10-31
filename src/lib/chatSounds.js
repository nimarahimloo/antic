/**
 * صدای نوتیف چت — شبیه پیام‌رسان (ارسال کوتاه / دریافت دو‌نت)
 * Web Audio؛ بدون وابستگی به فایل (اختیاری /sounds/*.mp3)
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
  unlocked = true;
  try {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  } catch {
    /* */
  }
}

export function setChatSoundsMuted(v) {
  muted = !!v;
}

export function isChatSoundsMuted() {
  return muted;
}

function tone(ctx, { freq, start, dur, vol = 0.18, type = "sine" }) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

function playSendSynth() {
  if (muted) return;
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    tone(ctx, { freq: 720, start: t, dur: 0.07, vol: 0.16, type: "triangle" });
    tone(ctx, { freq: 1080, start: t + 0.04, dur: 0.06, vol: 0.12, type: "sine" });
  } catch {
    /* */
  }
}

function playReceiveSynth() {
  if (muted) return;
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    tone(ctx, { freq: 660, start: t, dur: 0.1, vol: 0.17, type: "sine" });
    tone(ctx, { freq: 880, start: t + 0.09, dur: 0.14, vol: 0.14, type: "sine" });
  } catch {
    /* */
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
      } else resolve(false);
    } catch {
      fileOk[key] = false;
      resolve(false);
    }
  });
}

export function playSendSound() {
  unlockChatSounds();
  tryPlayFile("send", "/sounds/message-send.mp3", 0.45).then((ok) => {
    if (!ok) playSendSynth();
  });
}

export function playReceiveSound() {
  unlockChatSounds();
  tryPlayFile("receive", "/sounds/message-receive.mp3", 0.5).then((ok) => {
    if (!ok) playReceiveSynth();
  });
}

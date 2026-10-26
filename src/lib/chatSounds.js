/** Chat notification sounds (short synthetic WAV, free to use) */
const SEND_B64 = "UklGRqQPAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YYAPAAAA";
const RECV_B64 = "UklGRrQbAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YZAbAAAA";

function b64ToBlobUrl(b64, mime = "audio/wav") {
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

const urls = {
  send: b64ToBlobUrl(SEND_B64),
  receive: b64ToBlobUrl(RECV_B64),
};

let unlocked = false;

/** Call once on first user gesture to unlock autoplay policies */
export function unlockChatSounds() {
  if (unlocked) return;
  unlocked = true;
  try {
    const a = new Audio();
    a.volume = 0;
    a.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

function play(url, volume = 0.45) {
  if (!url) return;
  try {
    const a = new Audio(url);
    a.volume = volume;
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    /* ignore autoplay blocks */
  }
}

export function playSendSound() {
  play(urls.send, 0.4);
}

export function playReceiveSound() {
  play(urls.receive, 0.5);
}

# Chat notification sounds

Optional WAV files for the floating chat bot.

If these files exist, they are preferred over the built-in Web Audio beeps:

| File | When |
|------|------|
| `message-send.wav` | User sends a message |
| `message-receive.wav` | Bot replies |

Default behavior (no files needed): short sine beeps generated in `src/lib/chatSounds.js` via Web Audio API — works offline and without extra network requests.

To replace the tone, drop your own short `.wav` files with the names above into this folder.

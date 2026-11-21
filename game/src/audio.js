// Whisper Vault — sound. One job: tiny WebAudio bleeps, no audio files.
// Everything is a short oscillator blip so the game ships no samples at all.
// Audio starts on the first user gesture; until then the context stays
// suspended and every call is a safe no-op.

let ctx = null;
let master = null;

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
}

function blip(freq, dur, type, vol, slideTo) {
  if (!ctx || !master) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch (e) {
    // Sound is garnish; never let it break the game.
  }
}

// Soft alternating footstep ticks while Wren walks.
export function playStep(crouched, running) {
  if (crouched) blip(150, 0.05, 'triangle', 0.12);
  else if (running) blip(230, 0.05, 'triangle', 0.3);
  else blip(190, 0.05, 'triangle', 0.2);
}

// Two-note chime when a sigil is pocketed.
export function playPickup() {
  blip(660, 0.12, 'sine', 0.5);
  setTimeout(() => blip(990, 0.18, 'sine', 0.5), 90);
}

// Rising sting the moment the wardens start hunting.
export function playAlert() {
  blip(220, 0.28, 'sawtooth', 0.35, 440);
}

// Low thud when Wren is caught.
export function playCaught() {
  blip(180, 0.4, 'sawtooth', 0.5, 60);
}

// Little arpeggio when Wren slips out the vault door.
export function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => blip(f, 0.22, 'sine', 0.5), i * 110);
  });
}

// Soft click on menu buttons.
export function playClick() {
  blip(440, 0.06, 'square', 0.2);
}

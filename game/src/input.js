// Whisper Vault — input. One job: keyboard and mouse state, in world pixels.
//
// WASD / arrows move, Shift runs, C crouches, Enter starts, R restarts,
// M mutes. A mouse click on the floor sets a walk target; the canvas
// scales to the window, so clicks are converted back into game pixels.

import { VIEW_W, VIEW_H, HUD_H } from './config.js';

export function makeInput(canvas) {
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    run: false,
    crouch: false,
    muted: false,
    clickX: null, // last click, in world pixels (null once consumed)
    clickY: null,
    onKey: null, // main.js sets this: called with the key name on keydown
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
    KeyC: 'crouch', ControlLeft: 'crouch',
  };

  window.addEventListener('keydown', (e) => {
    const field = KEYMAP[e.code];
    if (field) {
      input[field] = true;
      e.preventDefault();
    }
    if (e.code === 'KeyM') input.muted = !input.muted;
    if (input.onKey) input.onKey(e.code);
  });

  window.addEventListener('keyup', (e) => {
    const field = KEYMAP[e.code];
    if (field) input[field] = false;
  });

  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.run = input.crouch = false;
  });

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIEW_W / rect.width;
    const scaleY = (VIEW_H + HUD_H) / rect.height;
    input.clickX = (e.clientX - rect.left) * scaleX;
    input.clickY = (e.clientY - rect.top) * scaleY;
  });

  return input;
}

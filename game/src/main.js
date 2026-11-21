// Whisper Vault — entry point. One job: own the game state, run the loop,
// and switch between title / playing / caught / win.
//
// The canvas is scaled to fit the window while keeping its 960x704 shape.
// A ?shot= URL (see shots.js) freezes the game into a deterministic frame
// for screenshots; without it, the game runs live at 60 fps.

import {
  TILE, VIEW_W, VIEW_H, HUD_H, ALARM_CAUGHT_AT, ALARM_HUNT_AT,
} from './config.js';
import { MAP, PATROLS, parseLevel } from './level.js';
import { makeGuard, updateGuard, updateAlarm, patrolStep } from './guards.js';
import { makePlayer, updatePlayer, collectSigil, sigilsLeft, atExit } from './player.js';
import { makeInput } from './input.js';
import { render } from './render.js';
import { shotFromUrl, applyShot } from './shots.js';
import {
  unlockAudio, playStep, playPickup, playAlert, playCaught, playWin, playClick,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = VIEW_W * dpr;
  canvas.height = (VIEW_H + HUD_H) * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Pin the element to the viewport explicitly: some headless shells size a
  // fixed canvas to its bitmap instead of the window.
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function newGame() {
  const level = parseLevel(MAP);
  return {
    map: MAP,
    exit: level.exit,
    sigils: level.sigils,
    player: makePlayer(level.spawn),
    guards: PATROLS.map((route) => makeGuard(route, MAP)),
    screen: 'title', // title | playing | caught | win
    alarm: 0,
    sigilsGot: 0,
    time: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    lastSeenAt: -99,
    hunting: false, // true while any warden hunts (drives the alert sting)
  };
}

let state = newGame();
const input = makeInput(canvas);
const shot = shotFromUrl();
if (shot) applyShot(state, shot);

function announce(text) {
  statusEl.textContent = text;
}

function startGame() {
  state = newGame();
  state.screen = 'playing';
  unlockAudio();
  playClick();
  announce('The vault is dark. Pocket three sigils and reach the vault door unseen.');
}

input.onKey = (code) => {
  unlockAudio();
  if (shot) return; // screenshot frames ignore keys
  if (code === 'Enter' && state.screen === 'title') startGame();
  if (code === 'KeyR' && (state.screen === 'caught' || state.screen === 'win')) startGame();
  if (code === 'Enter' && (state.screen === 'caught' || state.screen === 'win')) startGame();
};

let lastStepPhase = 0;
let lastTime = performance.now();

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (!shot && state.screen === 'playing') {
    state.time += dt;

    // Mouse: a click on the floor sets Wren's walk target.
    if (input.clickX !== null && input.clickY !== null) {
      const wy = input.clickY - HUD_H;
      if (wy >= 0 && wy < VIEW_H) {
        state.player.targetX = input.clickX;
        state.player.targetY = wy;
      }
      input.clickX = null;
      input.clickY = null;
    }

    updatePlayer(state.player, input, MAP, dt);

    // Footsteps, throttled by the walk cycle.
    if (state.player.moving && Math.floor(state.player.stepPhase) !== Math.floor(lastStepPhase)) {
      playStep(state.player.crouching, state.player.running);
    }
    lastStepPhase = state.player.stepPhase;

    let anySees = false;
    for (const g of state.guards) {
      updateGuard(g, state.player, state, dt);
      if (g.seesPlayer) anySees = true;
    }
    updateAlarm(state, anySees, dt);

    const hunting = state.guards.some((g) => g.mode === 'hunt');
    if (hunting && !state.hunting) playAlert();
    state.hunting = hunting;

    const got = collectSigil(state.player, state.sigils);
    if (got) {
      state.sigilsGot += 1;
      playPickup();
      announce(`Sigil pocketed — ${state.sigilsGot} of 3. ${sigilsLeft(state.sigils)} left.`);
    }

    if (state.alarm >= ALARM_CAUGHT_AT) {
      state.screen = 'caught';
      playCaught();
      announce('Caught! Press R to try again.');
    } else if (state.sigilsGot >= 3 && atExit(state.player, state.exit)) {
      state.screen = 'win';
      playWin();
      announce(`Clean getaway in ${Math.floor(state.time)} seconds. Press R to play again.`);
    }
  } else if (!shot && state.screen === 'title') {
    // Title screen: let the wardens patrol behind the overlay so the
    // level feels alive before the game starts (no detection yet).
    state.time += dt;
    for (const g of state.guards) patrolStep(g, dt);
    if (input.clickX !== null) {
      input.clickX = null;
      input.clickY = null;
      startGame();
    }
  } else if (!shot && (state.screen === 'caught' || state.screen === 'win')) {
    if (input.clickX !== null) {
      input.clickX = null;
      input.clickY = null;
      startGame();
    }
  }

  render(ctx, state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Surface any script error in the title so a headless check can see it.
window.addEventListener('error', (e) => {
  document.title = 'ERR: ' + (e.message || 'unknown');
});

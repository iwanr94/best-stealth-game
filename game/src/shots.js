// Whisper Vault — screenshot states. One job: deterministic renders for
// ?shot=start|play|end, so screenshots are reproducible real renders of the
// game's own code.
//
// start: the title screen over the level. play: mid-game, Wren crouched in
// the dark at the north hall while a warden hunts toward her, alarm high.
// end: the win screen after a clean getaway. When a shot is active the game
// never advances — every capture of the same URL shows the same frame.

import { TILE } from './config.js';

export function shotFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  return shot === 'start' || shot === 'play' || shot === 'end' ? shot : null;
}

function placePlayer(state, col, row, facing) {
  state.player.x = (col + 0.5) * TILE;
  state.player.y = (row + 0.5) * TILE;
  state.player.facing = facing;
  state.player.targetX = null;
  state.player.targetY = null;
}

function placeGuard(state, index, col, row, angle, mode) {
  const g = state.guards[index];
  g.x = (col + 0.5) * TILE;
  g.y = (row + 0.5) * TILE;
  g.angle = angle;
  g.mode = mode || 'patrol';
  g.seesPlayer = mode === 'hunt';
}

export function applyShot(state, shot) {
  if (shot === 'start') {
    state.screen = 'title';
    state.time = 0;
    state.alarm = 0;
    return;
  }
  if (shot === 'play') {
    state.screen = 'playing';
    state.time = 42;
    // One sigil already pocketed; Wren crouched in the shadow patch of the
    // north hall while the hall warden hunts toward her last seen spot.
    state.sigils[0].taken = true;
    state.sigilsGot = 1;
    state.alarm = 58;
    state.lastSeenX = 12.5 * TILE;
    state.lastSeenY = 6.5 * TILE;
    placePlayer(state, 12, 6, Math.PI);
    state.player.crouching = true;
    placeGuard(state, 0, 12, 3, Math.PI / 2, 'hunt');
    state.guards[0].huntX = 12.5 * TILE;
    state.guards[0].huntY = 6.5 * TILE;
    placeGuard(state, 1, 21, 5, Math.PI, 'patrol');
    placeGuard(state, 2, 4, 10, 0, 'patrol');
    placeGuard(state, 3, 11, 13, -Math.PI / 2, 'patrol');
    return;
  }
  if (shot === 'end') {
    state.screen = 'win';
    state.time = 187;
    state.alarm = 0;
    for (const s of state.sigils) s.taken = true;
    state.sigilsGot = 3;
    placePlayer(state, 5, 14, -Math.PI / 2);
    placeGuard(state, 0, 11, 1, 0, 'patrol');
    placeGuard(state, 1, 21, 4, Math.PI / 2, 'patrol');
    placeGuard(state, 2, 4, 10, Math.PI, 'patrol');
    placeGuard(state, 3, 11, 13, Math.PI / 2, 'patrol');
  }
}

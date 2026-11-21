// Whisper Vault — Wren, the player. One job: movement, posture, and picking
// up sigils / reaching the vault door.
//
// WASD or arrows walk; hold Shift to run (fast but loud); hold C to crouch
// (slow but harder to spot). Clicking the floor sets a walk target, so the
// mouse plays too. Walls slide: moving diagonally into a wall keeps the
// free axis, so Wren never gets stuck on a corner.

import {
  TILE, PLAYER_WALK, PLAYER_RUN, PLAYER_CROUCH, PLAYER_RADIUS,
} from './config.js';
import { solidAt } from './level.js';

export function makePlayer(spawnTile) {
  return {
    x: (spawnTile.col + 0.5) * TILE,
    y: (spawnTile.row + 0.5) * TILE,
    facing: 0,
    crouching: false,
    running: false,
    moving: false,
    targetX: null,
    targetY: null,
    stepPhase: 0, // drives the footstep sound and the walk bob
  };
}

function tryMove(player, map, dx, dy) {
  const r = PLAYER_RADIUS;
  const nx = player.x + dx;
  if (!solidAt(map, nx + Math.sign(dx) * r, player.y, TILE) &&
      !solidAt(map, nx + Math.sign(dx) * r, player.y - r * 0.7, TILE) &&
      !solidAt(map, nx + Math.sign(dx) * r, player.y + r * 0.7, TILE)) {
    player.x = nx;
  }
  const ny = player.y + dy;
  if (!solidAt(map, player.x, ny + Math.sign(dy) * r, TILE) &&
      !solidAt(map, player.x - r * 0.7, ny + Math.sign(dy) * r, TILE) &&
      !solidAt(map, player.x + r * 0.7, ny + Math.sign(dy) * r, TILE)) {
    player.y = ny;
  }
}

export function updatePlayer(player, input, map, dt) {
  // Keyboard direction first; a click target only moves Wren when no key is held.
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx === 0 && dy === 0 && player.targetX !== null) {
    const tx = player.targetX - player.x;
    const ty = player.targetY - player.y;
    const dist = Math.hypot(tx, ty);
    if (dist < 6) {
      player.targetX = null;
      player.targetY = null;
    } else {
      dx = tx / dist;
      dy = ty / dist;
    }
  }

  player.crouching = input.crouch && !input.run;
  player.running = input.run && !input.crouch;
  const speed = player.crouching ? PLAYER_CROUCH : player.running ? PLAYER_RUN : PLAYER_WALK;

  const len = Math.hypot(dx, dy);
  player.moving = len > 0;
  if (player.moving) {
    const nx = (dx / len) * speed * dt;
    const ny = (dy / len) * speed * dt;
    tryMove(player, map, nx, ny);
    player.facing = Math.atan2(dy, dx);
    player.stepPhase += (speed * dt) / 14;
  }
}

// Standing on a sigil tile collects it. Returns the sigil or null.
export function collectSigil(player, sigils) {
  for (const s of sigils) {
    if (s.taken) continue;
    const sx = (s.col + 0.5) * TILE;
    const sy = (s.row + 0.5) * TILE;
    if (Math.hypot(player.x - sx, player.y - sy) < TILE * 0.6) {
      s.taken = true;
      return s;
    }
  }
  return null;
}

export function sigilsLeft(sigils) {
  return sigils.filter((s) => !s.taken).length;
}

// Standing on the vault door tile with every sigil: the escape.
export function atExit(player, exitTile) {
  const ex = (exitTile.col + 0.5) * TILE;
  const ey = (exitTile.row + 0.5) * TILE;
  return Math.hypot(player.x - ex, player.y - ey) < TILE * 0.6;
}

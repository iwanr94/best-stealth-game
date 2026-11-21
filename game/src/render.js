// Whisper Vault — rendering. One job: draw everything on the canvas.
//
// Top-down view: checkerboard stone floor, dark shadow patches, crates as
// cover, wardens with pale vision cones that flare red when they are
// hunting, Wren as a hooded figure, sigils as glowing diamonds, the vault
// door as a green arch that lights up once all sigils are pocketed.

import {
  TILE, COLS, ROWS, VIEW_W, VIEW_H, HUD_H,
  VISION_RANGE, VISION_HALF_ANGLE, ALARM_HUNT_AT, ALARM_CAUGHT_AT,
  COLORS, PLAYER_RADIUS, GUARD_RADIUS,
} from './config.js';
import { tileAt, isSolidTile } from './level.js';

function conePath(ctx, gx, gy, angle) {
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.arc(gx, gy, VISION_RANGE, angle - VISION_HALF_ANGLE, angle + VISION_HALF_ANGLE);
  ctx.closePath();
}

function drawFloor(ctx, map) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ch = tileAt(map, col, row);
      const x = col * TILE;
      const y = HUD_H + row * TILE;
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 6);
      } else if (ch === ',') {
        ctx.fillStyle = COLORS.shadowFloor;
        ctx.fillRect(x, y, TILE, TILE);
      } else {
        ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        ctx.fillRect(x, y, TILE, TILE);
      }
      if (ch === 'C') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = COLORS.crateTop;
        ctx.fillRect(x + 3, y + 3, TILE - 6, 5);
        ctx.strokeStyle = '#4a3a22';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + TILE - 3, y + TILE - 3);
        ctx.moveTo(x + TILE - 3, y + 3);
        ctx.lineTo(x + 3, y + TILE - 3);
        ctx.stroke();
      }
    }
  }
}

function drawExit(ctx, exitTile, open) {
  const x = exitTile.col * TILE;
  const y = HUD_H + exitTile.row * TILE;
  ctx.fillStyle = open ? COLORS.exit : COLORS.exitLocked;
  ctx.fillRect(x + 4, y + 2, TILE - 8, TILE - 4);
  ctx.fillStyle = '#0b0d12';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', x + TILE / 2, y + TILE / 2);
  if (open) {
    ctx.strokeStyle = COLORS.exit;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y, TILE - 4, TILE);
  }
}

function drawSigils(ctx, sigils, time) {
  for (const s of sigils) {
    if (s.taken) continue;
    const x = (s.col + 0.5) * TILE;
    const y = HUD_H + (s.row + 0.5) * TILE + Math.sin(time * 2.4 + s.col) * 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.sigil;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  }
}

function drawCones(ctx, guards, alarm) {
  for (const g of guards) {
    const gy = HUD_H + g.y;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    conePath(ctx, g.x, gy, g.angle);
    ctx.fillStyle = g.mode === 'hunt' || alarm >= ALARM_HUNT_AT
      ? COLORS.coneAlert
      : COLORS.cone;
    ctx.fill();
    ctx.restore();
  }
}

function drawGuards(ctx, guards, time) {
  for (const g of guards) {
    const gy = HUD_H + g.y;
    ctx.fillStyle = COLORS.guard;
    ctx.beginPath();
    ctx.arc(g.x, gy, GUARD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick and lantern dot.
    ctx.strokeStyle = '#ffd9c9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, gy);
    ctx.lineTo(g.x + Math.cos(g.angle) * (GUARD_RADIUS + 7), gy + Math.sin(g.angle) * (GUARD_RADIUS + 7));
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.angle) * (GUARD_RADIUS - 5), gy + Math.sin(g.angle) * (GUARD_RADIUS - 5), 3, 0, Math.PI * 2);
    ctx.fill();
    // "!" while hunting, "?" while pausing to look around.
    if (g.mode === 'hunt' || g.seesPlayer) {
      ctx.fillStyle = '#ff5c3d';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, gy - GUARD_RADIUS - 8);
    } else if (g.mode === 'pause') {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, gy - GUARD_RADIUS - 6);
    }
  }
}

function drawPlayer(ctx, player, time) {
  const y = HUD_H + player.y;
  const bob = player.moving ? Math.sin(player.stepPhase * 2) * 1.5 : 0;
  // Soft shadow blob under Wren.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x, y + 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded figure: cloak circle, hood, and a facing tick.
  ctx.fillStyle = player.crouching ? '#5d7f99' : COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(player.x, y + bob, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(player.x, y + bob, PLAYER_RADIUS - 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(player.x, y + bob);
  ctx.lineTo(player.x + Math.cos(player.facing) * (PLAYER_RADIUS + 4), y + bob + Math.sin(player.facing) * (PLAYER_RADIUS + 4));
  ctx.stroke();
  if (player.crouching) {
    ctx.fillStyle = '#9aa3b2';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', player.x, y - PLAYER_RADIUS - 6);
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WHISPER VAULT', 16, HUD_H / 2 - 10);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(`Sigils ${state.sigilsGot} / 3    Time ${Math.floor(state.time)}s`, 16, HUD_H / 2 + 14);

  // Detection meter: calm blue, rising amber, red past the hunt line.
  const mx = VIEW_W - 320;
  const my = HUD_H / 2 - 11;
  ctx.fillStyle = '#1c2230';
  ctx.fillRect(mx, my, 280, 22);
  const frac = state.alarm / ALARM_CAUGHT_AT;
  ctx.fillStyle = state.alarm >= ALARM_HUNT_AT ? '#ff5c3d' : state.alarm >= 25 ? '#ffb347' : '#7fb3d5';
  ctx.fillRect(mx, my, 280 * frac, 22);
  ctx.strokeStyle = '#e8e6df';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mx, my, 280, 22);
  // Hunt threshold tick.
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(mx + 280 * (ALARM_HUNT_AT / ALARM_CAUGHT_AT), my - 3);
  ctx.lineTo(mx + 280 * (ALARM_HUNT_AT / ALARM_CAUGHT_AT), my + 25);
  ctx.stroke();
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(state.alarm >= ALARM_HUNT_AT ? 'SPOTTED!' : 'UNSEEN', mx, my + 38);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 10, 15, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H + HUD_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(title, VIEW_W / 2, 190);
  ctx.fillStyle = COLORS.text;
  ctx.font = '19px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, 260 + i * 32);
  });
}

export function renderTitle(ctx, state) {
  renderWorld(ctx, state);
  overlay(ctx, 'WHISPER VAULT', [
    'Wren slips into the old archive after dark.',
    'Pocket all three sigils, then slip out the vault door — unseen.',
    '',
    'WASD / arrows — move      Shift — run (loud!)      C — crouch (hard to spot)',
    'Click the floor to walk there      M — mute',
    '',
    'Hide behind crates. Linger in the dark. Watch the cones.',
    '',
    'Press ENTER or click to begin',
  ], COLORS.sigil);
}

export function renderWorld(ctx, state) {
  drawFloor(ctx, state.map);
  drawExit(ctx, state.exit, state.sigilsGot >= 3);
  drawSigils(ctx, state.sigils, state.time);
  drawCones(ctx, state.guards, state.alarm);
  drawGuards(ctx, state.guards, state.time);
  drawPlayer(ctx, state.player, state.time);
  drawHud(ctx, state);
}

export function renderCaught(ctx, state) {
  renderWorld(ctx, state);
  overlay(ctx, 'CAUGHT!', [
    'A warden caught Wren in the lamplight.',
    `Sigils pocketed: ${state.sigilsGot} / 3`,
    '',
    'Press R to try again',
  ], '#ff5c3d');
}

export function renderWin(ctx, state) {
  renderWorld(ctx, state);
  overlay(ctx, 'CLEAN GETAWAY', [
    'Every sigil pocketed. Every warden none the wiser.',
    `Finished in ${Math.floor(state.time)} seconds.`,
    '',
    'Press R to play again',
  ], COLORS.exit);
}

export function render(ctx, state) {
  if (state.screen === 'title') renderTitle(ctx, state);
  else if (state.screen === 'caught') renderCaught(ctx, state);
  else if (state.screen === 'win') renderWin(ctx, state);
  else renderWorld(ctx, state);
}

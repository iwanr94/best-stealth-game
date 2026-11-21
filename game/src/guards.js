// Whisper Vault — wardens. One job: guard movement, vision cones, and the
// detection meter that gives the player a chance to recover.
//
// A warden patrols its route, pauses at each waypoint, and turns to look
// around. When Wren is inside its vision cone with a clear line of sight,
// the alarm rises (faster up close, slower when Wren crouches or hides in
// shadow). Past ALARM_HUNT_AT the warden walks to the last place it saw
// Wren; at ALARM_CAUGHT_AT Wren is caught. Unseen, the alarm drains away.

import {
  TILE, GUARD_PATROL_SPEED, GUARD_HUNT_SPEED, GUARD_RADIUS,
  VISION_RANGE, VISION_HALF_ANGLE, GUARD_TURN_SPEED,
  DETECT_BASE, DETECT_CLOSE_BONUS, DETECT_CROUCH_FACTOR,
  DETECT_SHADOW_FACTOR, DETECT_RUN_FACTOR, DETECT_DECAY,
  ALARM_HUNT_AT, ALARM_CAUGHT_AT, NOISE_RADIUS,
} from './config.js';
import { hasLineOfSight, solidAt, shadowAt } from './level.js';

export function makeGuard(routeTiles, map) {
  const first = routeTiles[0];
  return {
    route: routeTiles.map(([c, r]) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE })),
    target: 1,
    x: (first[0] + 0.5) * TILE,
    y: (first[1] + 0.5) * TILE,
    angle: 0,
    mode: 'patrol', // patrol | pause | hunt | return
    pauseLeft: 0,
    huntX: 0,
    huntY: 0,
    seesPlayer: false,
    map,
  };
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function turnToward(guard, targetAngle, dt, speed) {
  let diff = targetAngle - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const step = Math.max(-speed * dt, Math.min(speed * dt, diff));
  guard.angle += step;
}

// Can this warden see the player right now?
export function canSeePlayer(guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return false;
  const toPlayer = Math.atan2(dy, dx);
  let diff = toPlayer - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > VISION_HALF_ANGLE) return false;
  return hasLineOfSight(guard.map, guard.x, guard.y, player.x, player.y, TILE);
}

// Move with axis-separated wall sliding so a warden never enters a wall.
function moveGuard(guard, vx, vy, dt) {
  const nx = guard.x + vx * dt;
  if (!solidAt(guard.map, nx + Math.sign(vx) * GUARD_RADIUS, guard.y, TILE) &&
      !solidAt(guard.map, nx + Math.sign(vx) * GUARD_RADIUS, guard.y - GUARD_RADIUS * 0.7, TILE) &&
      !solidAt(guard.map, nx + Math.sign(vx) * GUARD_RADIUS, guard.y + GUARD_RADIUS * 0.7, TILE)) {
    guard.x = nx;
  }
  const ny = guard.y + vy * dt;
  if (!solidAt(guard.map, guard.x, ny + Math.sign(vy) * GUARD_RADIUS, TILE) &&
      !solidAt(guard.map, guard.x - GUARD_RADIUS * 0.7, ny + Math.sign(vy) * GUARD_RADIUS, TILE) &&
      !solidAt(guard.map, guard.x + GUARD_RADIUS * 0.7, ny + Math.sign(vy) * GUARD_RADIUS, TILE)) {
    guard.y = ny;
  }
}

function walkToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;
  const vx = (dx / dist) * speed;
  const vy = (dy / dist) * speed;
  moveGuard(guard, vx, vy, dt);
  turnToward(guard, angleTo(guard.x, guard.y, tx, ty), dt, GUARD_TURN_SPEED * 2.2);
  return false;
}

// Patrol-only step for the title screen: wardens walk their routes with no
// detection, so the level feels alive behind the overlay.
export function patrolStep(guard, dt) {
  guard.seesPlayer = false;
  if (guard.mode === 'pause') {
    guard.pauseLeft -= dt;
    guard.angle += GUARD_TURN_SPEED * 0.45 * dt;
    if (guard.pauseLeft <= 0) guard.mode = 'patrol';
    return;
  }
  const wp = guard.route[guard.target];
  if (walkToward(guard, wp.x, wp.y, GUARD_PATROL_SPEED, dt)) {
    guard.target = (guard.target + 1) % guard.route.length;
    guard.mode = 'pause';
    guard.pauseLeft = 0.9;
  }
}

export function updateGuard(guard, player, state, dt) {
  guard.seesPlayer = canSeePlayer(guard, player);

  if (guard.seesPlayer) {
    // Detection rises; distance, posture, light and speed all matter.
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    const closeness = 1 - dist / VISION_RANGE;
    let rate = DETECT_BASE + DETECT_CLOSE_BONUS * closeness;
    if (player.crouching) rate *= DETECT_CROUCH_FACTOR;
    if (shadowAt(guard.map, player.x, player.y, TILE)) rate *= DETECT_SHADOW_FACTOR;
    if (player.running) rate *= DETECT_RUN_FACTOR;
    state.alarm = Math.min(ALARM_CAUGHT_AT, state.alarm + rate * dt);
    state.lastSeenX = player.x;
    state.lastSeenY = player.y;
    state.lastSeenAt = state.time;
    if (state.alarm >= ALARM_HUNT_AT && guard.mode !== 'hunt') {
      guard.mode = 'hunt';
      guard.huntX = player.x;
      guard.huntY = player.y;
    }
    if (guard.mode === 'hunt') {
      guard.huntX = player.x;
      guard.huntY = player.y;
    }
  } else if (guard.mode === 'hunt') {
    // Lost sight while hunting: keep going to the last seen spot.
    if (walkToward(guard, guard.huntX, guard.huntY, GUARD_HUNT_SPEED, dt)) {
      guard.mode = 'pause';
      guard.pauseLeft = 1.4;
    }
  } else if (guard.mode === 'pause') {
    guard.pauseLeft -= dt;
    // Scan the room while paused at a waypoint or a searched spot.
    guard.angle += GUARD_TURN_SPEED * 0.45 * dt;
    if (guard.pauseLeft <= 0) guard.mode = 'patrol';
  } else if (guard.mode === 'return') {
    // Heading back to the patrol route after the alarm faded.
    updateReturningGuard(guard, dt);
  } else {
    // Patrol: walk the route, pausing and looking around at each waypoint.
    const wp = guard.route[guard.target];
    if (walkToward(guard, wp.x, wp.y, GUARD_PATROL_SPEED, dt)) {
      guard.target = (guard.target + 1) % guard.route.length;
      guard.mode = 'pause';
      guard.pauseLeft = 0.9;
    }
  }

  // A running player is heard: wardens nearby turn toward the noise.
  if (player.running && player.moving) {
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (dist < NOISE_RADIUS && guard.mode === 'patrol') {
      turnToward(guard, angleTo(guard.x, guard.y, player.x, player.y), dt, GUARD_TURN_SPEED);
    }
  }
}

export function updateAlarm(state, anySees, dt) {
  if (!anySees) {
    state.alarm = Math.max(0, state.alarm - DETECT_DECAY * dt);
  }
  if (state.alarm < ALARM_HUNT_AT) {
    // Calm again: hunting wardens give up and go back to patrol.
    for (const g of state.guards) {
      if (g.mode === 'hunt') g.mode = 'return';
    }
  }
}

// A warden in "return" walks back to its nearest patrol waypoint.
export function updateReturningGuard(guard, dt) {
  let best = guard.route[0];
  let bestDist = Infinity;
  for (const wp of guard.route) {
    const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
    if (d < bestDist) { bestDist = d; best = wp; }
  }
  if (walkToward(guard, best.x, best.y, GUARD_PATROL_SPEED, dt)) {
    guard.target = (guard.route.indexOf(best) + 1) % guard.route.length;
    guard.mode = 'patrol';
  }
}

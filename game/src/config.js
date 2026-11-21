// Whisper Vault — shared tuning constants. One job: the numbers every other
// module agrees on (tile size, speeds, vision, detection rates).

export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640
export const HUD_H = 64;

// Player movement (pixels per second).
export const PLAYER_WALK = 135;
export const PLAYER_RUN = 205;
export const PLAYER_CROUCH = 72;
export const PLAYER_RADIUS = 13;

// Guard movement and vision.
export const GUARD_PATROL_SPEED = 58;
export const GUARD_HUNT_SPEED = 108;
export const GUARD_RADIUS = 14;
export const VISION_RANGE = 215;
export const VISION_HALF_ANGLE = Math.PI / 4.6; // ~39 degrees each side
export const GUARD_TURN_SPEED = 2.6; // radians per second while patrolling

// Detection meter 0..100. Rates are per second while a warden can see Wren.
export const DETECT_BASE = 46; // at mid range, standing, lit floor
export const DETECT_CLOSE_BONUS = 42; // extra when very close
export const DETECT_CROUCH_FACTOR = 0.55;
export const DETECT_SHADOW_FACTOR = 0.5;
export const DETECT_RUN_FACTOR = 1.45;
export const DETECT_DECAY = 16; // per second while unseen
export const ALARM_HUNT_AT = 52; // wardens start hunting the last seen spot
export const ALARM_CAUGHT_AT = 100;

// Noise: running is heard this far away (pixels).
export const NOISE_RADIUS = 170;

// Colours.
export const COLORS = {
  floor: '#232833',
  floorAlt: '#262c38',
  shadowFloor: '#141824',
  wall: '#4a5468',
  wallTop: '#5d6a84',
  crate: '#6b5433',
  crateTop: '#8a6f45',
  exit: '#3ddc97',
  exitLocked: '#2c6e54',
  sigil: '#ffd166',
  player: '#e8e6df',
  playerCloak: '#7fb3d5',
  guard: '#e4572e',
  cone: 'rgba(255, 214, 102, 0.20)',
  coneAlert: 'rgba(255, 92, 61, 0.30)',
  hudBg: '#10131a',
  text: '#e8e6df',
  dim: '#9aa3b2',
};

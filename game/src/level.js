// Whisper Vault — the level. One job: the map grid and turning it into walls,
// cover, shadows, sigils, the spawn, the vault door and warden patrol routes.
//
// Legend: # wall, . floor, , shadow floor (dark: harder to be seen),
// C crate (cover: blocks movement and sight), P player spawn,
// E vault door (exit), K sigil to collect, digits are warden spawn tiles.

export const MAP = [
  '########################',
  '#P.....#......#.....K..#',
  '#......#..C...#...,,,..#',
  '#.##...#......#..###...#',
  '#.#....#..C...#..#.....#',
  '#.#....####...#..#..C..#',
  '#.#.........,,..#..K...#',
  '#....C........C.#......#',
  '#.#######.#####...##...#',
  '#.#......#......#......#',
  '#.#..C...#..C...#,,C...#',
  '#.#......#......#......#',
  '#...####.#####..#......#',
  '#.......#.....#..#.....#',
  '#..C.E..#..C..#..#..K..#',
  '########################',
];

// Warden patrol routes, as tile waypoints [col, row]. Each warden walks its
// route back and forth, pausing briefly at each end.
export const PATROLS = [
  [[9, 1], [13, 1]], // north hall warden, east-west
  [[21, 2], [21, 8]], // east gallery warden, north-south
  [[3, 9], [6, 9], [6, 11], [3, 11]], // west stacks warden, rectangle
  [[9, 13], [13, 13]], // vault door warden, east-west
];

export function tileAt(map, col, row) {
  if (row < 0 || row >= map.length) return '#';
  if (col < 0 || col >= map[row].length) return '#';
  return map[row][col];
}

export function isSolidTile(ch) {
  return ch === '#' || ch === 'C';
}

export function parseLevel(map) {
  const walls = [];
  const crates = [];
  const shadows = [];
  const sigils = [];
  let spawn = { x: 60, y: 60 };
  let exit = { x: 60, y: 60 };
  for (let row = 0; row < map.length; row++) {
    for (let col = 0; col < map[row].length; col++) {
      const ch = map[row][col];
      if (ch === '#') walls.push({ col, row });
      else if (ch === 'C') crates.push({ col, row });
      else if (ch === ',') shadows.push({ col, row });
      else if (ch === 'K') sigils.push({ col, row, taken: false });
      else if (ch === 'P') spawn = { col, row };
      else if (ch === 'E') exit = { col, row };
    }
  }
  return { walls, crates, shadows, sigils, spawn, exit };
}

// Is the pixel point inside a solid tile (wall or crate)?
export function solidAt(map, px, py, tile) {
  const col = Math.floor(px / tile);
  const row = Math.floor(py / tile);
  return isSolidTile(tileAt(map, col, row));
}

// Is the pixel point on a shadow tile?
export function shadowAt(map, px, py, tile) {
  const col = Math.floor(px / tile);
  const row = Math.floor(py / tile);
  return tileAt(map, col, row) === ',';
}

// Line of sight between two pixel points, blocked by walls and crates.
// Steps along the ray in small increments so thin cover still blocks.
export function hasLineOfSight(map, ax, ay, bx, by, tile) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (tile / 4)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (solidAt(map, ax + dx * t, ay + dy * t, tile)) return false;
  }
  return true;
}

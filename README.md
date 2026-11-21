# Whisper Vault

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun rank](https://make.fun/badge/best-stealth-game-20261121-1759/iwanr94/best-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![make.fun reward](https://make.fun/badge/best-stealth-game-20261121-1759/iwanr94/best-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down 2D stealth game. Wren slips into the old archive after dark to
pocket three sigils and slip out the vault door — unseen. Four wardens walk
patrol routes with vision cones; crates block sight, dark floor hides you,
and a detection meter gives you a chance to recover before the alarm peaks.

## How to play

- **WASD / arrow keys** — move (or click the floor to walk there)
- **Shift** — run, fast but loud: nearby wardens turn toward the noise
- **C** — crouch, slow but much harder to spot
- **Enter** — start · **R** — restart after being caught or escaping · **M** — mute

Watch the cones: standing in one fills the detection meter, faster up close.
Past the white tick the wardens hunt your last seen spot; at full meter you
are caught. Break line of sight and the meter drains. The vault door only
opens once all three sigils are pocketed.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests — plain static files under `game/`.

## Verify the hand-in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# out/ holds game/, screenshots/ and dossier.json
```

## Layout

- `game/src/config.js` — tuning constants (speeds, vision, detection)
- `game/src/level.js` — the map, patrol routes, line of sight
- `game/src/guards.js` — patrols, vision cones, detection, hunting
- `game/src/player.js` — movement, crouch/run, sigil pickup, exit
- `game/src/render.js` — canvas drawing: floor, cones, HUD, overlays
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — WebAudio bleeps (no audio files)
- `game/src/shots.js` — deterministic `?shot=start|play|end` states
- `game/src/main.js` — game state and the main loop
- `main.ts` — copies `game/` and `screenshots/` to `/output`, writes `dossier.json`

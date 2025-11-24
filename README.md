# Slime Platformer

An arcade-y endless platformer about a teal slime that corrodes everything it touches. Slide, hop, and ooze across procedurally generated platforms, melt foes with your acid trail, and buy mutations between stretches to push the high-score marker even farther.

## How to Play

1. **Launch** – Open `index.html` in a modern desktop browser (Chrome, Edge, Firefox). No build step is required; everything runs client-side.
2. **Move** – Run with `A/D` or the Arrow keys, jump with `Space`/`W`, and duck with `S`/`ArrowDown`. Holding duck after unlocking Bulwark Bloom turns you into a solid wall that can reflect enemy shots.
3. **Leave slime** – Simply moving paints a corrosive trail that damages enemies and, once Corrosive Secrets is unlocked, melts platforms. Use it to soften targets before they reach you.
4. **Fight & survive** – Avoid traps, stomp lighter foes, reflect or dodge projectiles, and collect slime chunks (heals) plus coins (shop currency). Holding `Duck + F` consumes 10 HP to raise a one-hit swallow shield.
5. **Shop stops** – Every 5,000 distance units you reach triggers the shop overlay. Pick one of three random upgrades or spend 100 coins to reroll them. Each upgrade applies immediately and persists until you die.
6. **Repeat** – Distance travelled, HP, and coins are always shown in the HUD. When you fall, press `Y` at the prompt to continue another run and chase a new high score.

## Controls

| Action | Input |
| --- | --- |
| Move left/right | `A` / `D` or `←` / `→` |
| Jump | `Space`, `W`, or `↑` |
| Duck / drop through platforms | `S` or `↓` (tap again while grounded to drop) |
| Swallow shield | Hold `Duck` + `F` to spend 10 HP for a one-hit barrier |
| Pause / resume | `Esc` (disabled while shopping) |
| Force shop (debug) | `J` |
| Add coins (debug) | `H` |
| Toggle god mode (debug) | `G` |

## Upgrades & Resources

- **Bulwark Bloom (Slime Wall)** – Hold duck to become a vertical slime wall that blocks terrain, reflects projectiles, and enables precise platform hugging.
- **Fling Burst** – Builds momentum while running; release movement to fling bouncing slime globs that drip extra pools of damage.
- **Renewal Bloom (Regen)** – Spend 20 HP once, automatically regenerate back to 10 HP whenever you fall below it.
- **Corrosive Secrets** – Lets every trail and glob eat through the platforms they touch, forcing enemies to fall.
- **Graviton Maw (Magnet)** – Surrounds the slime with a magnetic pull that yanks coins and chunks from two platforms away.
- **Spiked Shoes** – Jump onto enemy heads to deal 2 damage and bounce without taking a hit.
- **Royal Slime** – Raises the max HP cap to 40, making you larger and increasing slime damage output.

Enemies drop **coins** (shop currency) and **slime chunks** (heals 1 HP) with convincing physics. The mute button above the HUD silences all audio if needed.

## Tips

- Keep at least 11 HP handy to trigger swallow shields before big gauntlets.
- Let enemies chase you through your trail instead of trading hits head-on.
- Corroded platforms can collapse under you after unlocking Corrosive Secrets—stay moving.
- Shop rerolls cost 100 coins; save some income if you are hunting for a specific build.
- The HUD shows global best distance; markers appear directly in the level so you can see where previous runs ended.

## Running & Development Notes

- Static files only; serve with any HTTP server (e.g., `npx serve .` or VS Code Live Server) if your browser disallows `file://` audio.
- Assets live under `resources/` (audio, JS modules, upgrades JSON) and are imported via ES modules.
- The project is entirely client-side, so deploying to GitHub Pages or any static host just requires copying the repository contents.


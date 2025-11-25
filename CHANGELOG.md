# Changelog

## [0.2.0] - Home Screen & Game Over Overhaul

- Added an animated title screen with a slime-king backdrop, Start Run/Options/Credits buttons, and a looping “The Lonely Slime” home-theme. Options/Credits swap the info panel while Start hides the overlay and kicks off the run.
- Introduced a base ability list (Acid Trail & Swallow Shield) that now appears in the pause menu so players always see at least two ability cards even before unlocking upgrades.
- Overhauled the game-over flow: a giant slime now swells onto the stage with side-eye lines and alternating goo tears. Dedicated Yes/No buttons (and Y/N keys) either restart the loop instantly or return you to the home screen.
- Improved keyboard handling so F5 refresh works even while paused or on the game-over screen, and added support for the new home-track audio file.

## [0.1.1] - Spike Trap Expansion

- Added spike trap generation alongside ooze pits. These deal a flat 5 HP damage, render as serrated platforms, and appear more frequently as you progress, forcing route planning on the ground layer.
- Gave ground traps explicit types so visuals and damage values can diverge per hazard.
- Added a Skip and Continue option to the Slime Shop so players can leave without purchasing once the pause break is over.

## [0.1.0] - Initial Release

- **Core gameplay** – Added an endless side-scrolling slime platformer with a dynamic camera, parallax background, distance markers, and safe-zone start area. The slime automatically leaves corrosive trails that damage enemies and, with the Corrosive Secrets upgrade, eat through platforms.
- **Player controls & states** – Implemented responsive movement with Arrow/A/D keys, jumps with Space/W/ArrowUp, ducking with S/ArrowDown, a hold-to-duck wall mode, airborne momentum squish animations, and auto-scaling body size tied to current HP. Added swallow shield (hold Duck + F) that spends 10 HP for a one-hit barrier, invulnerability frames, pause overlay (Esc), and god-mode/debug toggles (G, H, J).
- **Procedural world** – Generates platform chunks on the fly using physics-aware spacing, cleans up old geometry, and spawns floor traps that damage on contact. Supports drop-through passable platforms and corrosion tracking/removal.
- **Enemy roster & combat** – Spawns roaming slime enemies in weak/medium/hard tiers with varied HP, damage, and colors. Includes acid debuff ticking damage, projectile variants (vertical/horizontal patterns), reflective interactions with wall mode, trap-aware patrol ranges, and stomp logic for the Spiked Shoes upgrade.
- **Projectiles & abilities** – Added bouncing slime globs (Fling Burst upgrade) that drip mini-trails, reflected enemy shots that trail acid, fling cooldown indicator, and magnetism support for collectibles once unlocked.
- **Pickups & economy** – Enemies drop coins and slime chunks (healing pickups). Coins obey physics, interact with traps, respect magnet pulls, and display SVG art. Slime chunks heal on pickup and play unique SFX. HUD shows HP, farthest distance, coins, cooldowns, and high-score markers.
- **Shop & progression** – Every 5,000 distance units triggers a diegetic shop overlay that pauses gameplay, offers three random upgrades, enforces HP/coin costs, refreshes options for 100 coins, and tracks purchased upgrades. Available upgrades: Bulwark Bloom (slime wall), Fling Burst, Renewal Bloom (regen to 10 HP), Corrosive Secrets (platform melting), Graviton Maw (magnet aura), Spiked Shoes, and Royal Slime (+40 HP cap).
- **Audio & UX polish** – Hooked in background music plus jump, hit, enemy death, coin, chunk pickup, corrosion, and game-over sounds, all respecting a mute toggle. Added pause/game-over overlays with continue prompts, slime breathing animations, damage numbers with throttling, and status text updates for HP/distance/coins/top run.

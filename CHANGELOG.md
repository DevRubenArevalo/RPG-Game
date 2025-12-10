# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2025-12-10

### Added
- **Entity Component System (ECS)**: Complete modular entity system for flexible game object creation
  - `Entity` class - Container for components with ID and tags
  - `Component` base class - Pure data containers
  - `System` base class - Logic processing for entities
  - `EntityManager` - Central hub for entity and system management

### Components
- **Core Components**: Position, Render, Physics, Health
  - `PositionComponent` - 2D position, velocity, acceleration
  - `RenderComponent` - Visual appearance (color, shape, layer, alpha)
  - `PhysicsComponent` - Collision box, mass, friction, static/trigger flags
  - `HealthComponent` - HP, max HP, armor, regeneration, damage tracking

- **Gameplay Components**: Interactable, Dialogue, AI, Input, Projectile, Enemy, Player
  - `InteractableComponent` - Range-based interactions with callbacks
  - `DialogueComponent` - NPC dialogue trees with choices
  - `AIComponent` - Basic AI with detection/attack ranges
  - `InputComponent` - Player input state tracking
  - `ProjectileComponent` - Damage, lifetime, piercing, target filtering
  - `EnemyComponent` - Tier, damage, score/coin values
  - `PlayerComponent` - Coins, score, upgrades

### Systems
- **Core Systems**: Physics, Render, Collision, Input (priority: 5-100)
  - `PhysicsSystem` - Movement, gravity, friction simulation
  - `RenderSystem` - Layer-based rendering with camera support
  - `CollisionSystem` - AABB collision detection and resolution
  - `InputSystem` - Updates input state from InputManager

- **Gameplay Systems**: Interaction, Dialogue, AI, Projectile, Health (priority: 12-25)
  - `InteractionSystem` - Range checks and interaction triggering
  - `DialogueSystem` - NPC conversation management with UI integration
  - `AISystem` - Basic AI behaviors (idle, chase, attack)
  - `ProjectileSystem` - Lifetime management and hit detection
  - `HealthSystem` - HP regeneration and death handling

### Entity Factory
- **Helper Functions**: Pre-configured entity creation
  - `createPlayer()` - Player with Position, Render, Physics, Health, Player, Input components
  - `createEnemy()` - Enemy with Position, Render, Physics, Health, Enemy, AI components
  - `createProjectile()` - Projectile with Position, Render, Physics, Projectile components
  - `createNPC()` - NPC with Position, Render, Physics, Interactable, Dialogue components
  - `createCollectible()` - Collectible items with trigger collision and callbacks
  - `createPlatform()` - Static platforms for terrain
  - `createExampleDialogue()` - Sample dialogue generator

### Examples
- **10 Usage Examples** in `ecs/examples.js`:
  1. Basic ECS setup with systems
  2. Creating basic entities (player, platforms, enemies)
  3. Creating NPCs with dialogue
  4. Creating collectibles with callbacks
  5. Shooting projectiles
  6. Listening to ECS events
  7. Querying entities by components/tags
  8. Game loop integration
  9. Custom entity creation
  10. Save/load serialization

### Events
- **New ECS Events** via EventBus:
  - `entity:created` - Entity added to manager
  - `entity:destroyed` - Entity removed from manager
  - `entity:died` - Entity health reached 0
  - `entity:interacted` - Entity was interacted with
  - `collision` - Two entities collided
  - `projectile:hit` - Projectile hit target
  - `projectile:expired` - Projectile lifetime ended
  - `dialogue:started` - Dialogue conversation began
  - `dialogue:advanced` - Dialogue moved to next line
  - `dialogue:ended` - Dialogue finished
  - `ai:attack` - AI entity initiated attack

### Documentation
- **ARCHITECTURE.md Updates**: Added comprehensive ECS section
  - Core concepts (Entity, Component, System, EntityManager)
  - Component catalog with descriptions
  - System catalog with priorities
  - Entity factory examples
  - Quick start guide
  - Creating new entity types
  - ECS events reference
  - Migration path from old entities
  - Link to 10 usage examples

### Technical Details
- **Files Created**: 13 new files in `resources/js/ecs/` directory
  - Core: Entity.js, Component.js, System.js, EntityManager.js (4 files)
  - Components: CoreComponents.js, GameplayComponents.js (2 files)
  - Systems: CoreSystems.js, GameplaySystems.js (2 files)
  - Utilities: EntityFactory.js, index.js, examples.js (3 files)
- **Component Types**: 11 components (4 core + 7 gameplay)
- **System Types**: 9 systems (4 core + 5 gameplay)
- **Factory Functions**: 7 entity creators
- **Architecture**: Composition over inheritance, data-oriented design
- **Integration**: Works alongside existing code, gradual migration supported
- **Performance**: Systems process entities by component type efficiently
- **Flexibility**: Mix-and-match components for unlimited entity types
- **Risk**: None (pure addition, existing code unchanged)
- **Time**: ~8 hours implementation + testing + documentation

## [0.8.0] - 2025-12-10

### Added
- **Unit Testing Infrastructure**: Complete Jest setup with ES module support
  - `package.json` with test scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`
  - `jest.config.js` configured for ES modules with coverage reporting
  - `__tests__/` directory structure for organized test files
  - `__tests__/README.md` with testing documentation and examples

### Tests
- **Utils Tests** (`__tests__/utils.test.js`): 60+ test cases covering all utility functions
  - `clamp`: 5 test suites with edge cases (boundary values, negative ranges, swapped min/max)
  - `randomRange`: 4 test suites with range validation and edge cases
  - `overlap`: 7 test suites for AABB collision (overlapping, touching, contained, partial overlaps)
  - `snapshot`: 5 test suites for object property copying
  - `circleRectCollision`: 6 test suites for circle-rectangle collision detection
  - `checkBossCollision`: 7 test suites for boss morph mode collision (square/circle modes, blend transitions)

- **GameStateManager Tests** (`__tests__/gameStateManager.test.js`): 45+ test cases
  - Pause Management: `pause()`, `unpause()`, `togglePause()`, edge cases
  - Shop Management: `openShop()`, `closeShop()`, state validation
  - Boss Fight Management: `startBossFight()`, `endBossFight()`, shop auto-close
  - Game Over Management: `gameOver()`, `resetGameOver()`, shop auto-close
  - Level Complete Management: `completeLevel()`, `resetLevelComplete()`
  - Composite Queries: `isGameplayBlocked()`, `getStateSummary()`, `resetAll()`
  - EventBus Integration: Mocked events, correct payloads, event emission verification

### Documentation
- **ARCHITECTURE.md Updates**: Added comprehensive Testing section
  - How to run tests with examples
  - Test structure and organization
  - Writing tests with code examples (pure functions and mocked classes)
  - Testing best practices (6 guidelines)
  - What to test (priority breakdown)
  - Coverage goals (100% utils, 80% managers, 70% systems, 60% overall)
  - Mock examples for EventBus and dependencies

### Technical Details
- **Test Coverage**: 100+ test cases covering pure functions and state management
- **Mocking Strategy**: Jest mocks for EventBus, state objects, and dependencies
- **ES Module Support**: Node.js experimental VM modules flag for Jest
- **Files Created**: 3 new files (package.json, jest.config.js, utils.test.js, gameStateManager.test.js, __tests__/README.md)
- **Risk**: None (pure addition, no changes to existing code)
- **Time**: ~2-3 hours (as estimated for initial setup)

## [0.7.0] - 2025-12-10

### Added
- **GameStateManager Class**: Centralized state management for all major game state transitions
  - **Methods**: `pause()`, `unpause()`, `togglePause()`, `openShop()`, `closeShop()`, `startBossFight()`, `endBossFight()`, `gameOver()`, `resetGameOver()`, `completeLevel()`, `resetLevelComplete()`
  - **Query Methods**: `isPaused()`, `isShopActive()`, `isBossFightActive()`, `isGameOver()`, `isLevelComplete()`, `isGameplayBlocked()`, `getStateSummary()`
  - **Event-Driven**: Automatically emits EventBus events for all state changes
  - **Validation**: Prevents invalid state transitions (e.g., can't pause during game over)
  - **Single Source of Truth**: One place to look for all state changes

### Changed
- **State Management**: Replaced direct state property manipulation with GameStateManager methods
  - Updated `main.js`: 6 locations now use `state.stateManager` methods
  - Updated `shopController.js`: `openShop()` and `closeShop()` use GameStateManager
  - Updated `gameOverManager.js`: `trigger()` and `resetState()` use GameStateManager
  - Updated `gameState.js`: Instantiates GameStateManager in constructor
  - **Benefits**: Better debugging, easier testing, prevents bugs from invalid state changes

### Documentation
- **ARCHITECTURE.md Updates**: Added comprehensive GameStateManager section
  - All available methods with descriptions
  - Event emissions for each state change
  - Usage examples showing proper patterns
  - Benefits: single source of truth, event notifications, validation, testability
  - Before/after examples showing direct manipulation vs. GameStateManager

### Technical Details
- **New Events**: 11 new events for state management
  - `game:paused`, `game:unpaused`, `shop:opened`, `shop:closed`
  - `boss:fight:started`, `boss:fight:ended`, `game:over`, `game:over:reset`
  - `level:complete`, `level:complete:reset`, `game:state:reset`
- **Files Modified**: 5 files (gameState.js, gameStateManager.js, main.js, shopController.js, gameOverManager.js)
- **Risk**: Medium - Core state management changes, but well-isolated with comprehensive event system
- **Time**: 4-5 hours (as estimated)

## [0.6.0] - 2025-12-10

### Changed
- **Improved Dependency Injection**: Standardized all major classes to use configuration object pattern
  - **AudioManager**: Converted from positional parameters to config object
    - Old: `new AudioManager(paths, muteToggle, eventBus)`
    - New: `new AudioManager({ paths, muteToggle, eventBus })`
    - All parameters now optional with defaults
    - Easier to test without real DOM elements
  - **Player**: Converted from positional parameters to config object
    - Old: `new Player(config, world, shopInterval)`
    - New: `new Player({ playerConfig, world, shopInterval })`
    - Consistent with other entity constructors
    - Better parameter naming clarity

### Documentation
- **ARCHITECTURE.md Updates**: Added comprehensive Dependency Injection section
  - Pattern explanation with examples
  - Benefits: testability, flexibility, maintainability
  - Config object best practices
  - Testing examples showing mocked dependencies
  - Before/after comparisons for clarity
  - Complete examples for all major classes (AudioManager, Player, Renderer, ShopController, WorldController)
  - Best practices: destructuring with defaults, minimal dependencies, EventBus usage

### Technical Details
- Updated 3 instantiation sites (main.js, gameState.js)
- All major classes now use config object pattern consistently
- Easier to add optional dependencies without breaking changes
- Forward-compatible - new parameters can be added without breaking existing code
- Improved testability - easy to inject mocks for unit testing

## [0.5.0] - 2025-12-09

### Added
- **Expanded Event-Driven Architecture**: Added 11 new EventBus events for comprehensive decoupling
  - `audio:effect:play` - Sound effect playback (replaces direct audio.playEffect calls)
  - `audio:loop:start` - Start looping audio (e.g., corrosion, boss music)
  - `audio:loop:stop` - Stop looping audio
  - `damage:number:spawn` - Spawn visual damage indicator
  - `game:over` - Game over state triggered
  - `level:complete` - Level completion triggered
  - `shop:opened` - Shop interface opened
  - `shop:closed` - Shop interface closed
  - `upgrade:purchased` - Upgrade purchased from shop
  - `player:mutate` - Player mutation ability triggered
  - Total events: 18 (7 from v0.4.0 + 11 new)

### Changed
- **AudioManager Decoupling**: Integrated EventBus into AudioManager
  - Removed all direct `audio.playEffect()` calls from game logic
  - Audio system now listens for events rather than being called directly
  - Eliminates tight coupling between audio and gameplay code
- **Damage System Decoupling**: Replaced direct `spawnDamageNumber()` calls with events
  - Removed function parameter passing through multiple layers
  - Cleaned up enemy.js updateEnemies() and updateBossEnemy() signatures
  - All damage numbers now spawned via `damage:number:spawn` event
- **Game State Decoupling**: Game state changes now emit events
  - `gameOverManager.trigger()` replaced with `game:over` event
  - Direct `state.levelComplete` mutations replaced with `level:complete` event
  - Event listeners handle UI updates and state changes
- **Shop System Decoupling**: Shop lifecycle now emits events
  - ShopController emits `shop:opened` and `shop:closed` events
  - Upgrade purchases emit `upgrade:purchased` event
  - Enables future shop-related features without tight coupling
- **Player Mutation Decoupling**: Mutation trigger moved to event system
  - Player.js emits `player:mutate` event instead of calling mutateSlime() directly
  - Mutation logic remains in main.js but triggered via event

### Documentation
- **ARCHITECTURE.md Updates**: Expanded EventBus documentation
  - Complete event catalog with 18 documented events
  - Event payload descriptions for each event
  - Handler behavior documentation
  - Usage examples for all event patterns

### Technical Details
- Removed callback parameter passing (hurtPlayer, spawnDamageNumber, playerDamagePerTick, playCorrosionSound)
- Reduced direct function call dependencies across 8+ files
- AudioManager constructor now accepts EventBus parameter
- All sound effects (9 types) now triggered via events
- 10+ direct audio calls replaced with event emissions

## [0.4.0] - 2025-12-09

### Added
- **Architecture Documentation**: Created comprehensive `ARCHITECTURE.md` guide
  - Complete folder structure explanation
  - Code placement guidelines with examples
  - Event-driven architecture patterns
  - JSDoc standards and code style guide
  - Development workflow and best practices
  - Troubleshooting section for common issues
- **Event-Driven System**: Implemented EventBus for decoupled communication
  - `enemy:killed` - Enemy defeated event
  - `player:damaged` - Player damage event
  - `player:collected:chunk` - Chunk collection event
  - `player:collected:coin` - Coin collection event
  - `shop:reached` - Shop reached event
  - `boss:defeated` - Boss defeated event
  - `boss:shield:activated` - Boss shield activation event
- **JSDoc Type Documentation**: Added comprehensive type hints across entire codebase
  - Config files with typedef definitions
  - All core classes (Game, Renderer, EventBus, GameState)
  - All entity classes (Player, Enemy, Projectile, Room)
  - All manager classes (6 files)
  - All system/controller classes (3 files)
  - All utility functions (6 functions)

### Changed
- **Major Code Reorganization**: Restructured entire codebase into organized folders
  - Created `entities/` folder for game entities (Player, Enemy, Projectile, Room)
  - Created `systems/` folder for high-level controllers (WorldController, ShopController, RoomController)
  - Created `managers/` folder for feature managers (AudioManager, InputManager, PlayerManager, ShopManager, UIManager, GameOverManager)
  - Created `core/` folder for core game systems (EventBus, GameLoop, GameState, Renderer)
  - Created `config/` folder for all configuration constants
  - Created `utils/` folder for utility functions
- **Configuration System**: Extracted all constants to dedicated config files
  - `enemyConfig.js` - Enemy and boss configuration
  - `playerConfig.js` - Player physics and abilities
  - `worldConfig.js` - World generation and physics
  - `uiConfig.js` - UI rendering and animations
  - `upgrades.js` - Shop upgrade definitions
  - `config/index.js` - Barrel export for convenient imports
- **Import Paths**: Updated all relative imports across 30+ files to reflect new structure
- **Dependency Injection**: All classes now use constructor-based dependency injection
- **Code Patterns**: Established consistent coding patterns across entire codebase

### Fixed
- Import path issues resolved with proper relative paths using `../` syntax
- All cross-file dependencies now properly organized and documented

## [0.3.3] - 2025-12-09

### Fixed
- Trap visual rendering bug when boss spawns (added `traps.length = 0`)
- Fling Burst cooldown reduced from 6 seconds to 3 seconds
- Boss shockwave heights now decrease progressively: 100%, 65%, 35%
- Version display cleaned up (removed "FromNothing-" prefix)

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

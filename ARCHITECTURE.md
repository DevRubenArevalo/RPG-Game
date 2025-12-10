# RPG Game - Architecture & Project Structure

## Overview
This document describes the architecture and file organization of the RPG Game. Follow these guidelines when adding new features or modifying existing code.

## Core Principles
1. **Separation of Concerns** - Each folder has a specific purpose
2. **Dependency Injection** - Use EventBus for decoupled communication
3. **Configuration-Driven** - All constants live in `config/`
4. **Type Documentation** - Use JSDoc comments for all classes and functions

## Folder Structure

```
resources/js/
├── config/          # All game configuration constants
├── core/            # Core game systems and infrastructure
├── ecs/             # Entity Component System (NEW in v0.9.0)
│   ├── components/  # Reusable components (Position, Health, etc.)
│   ├── systems/     # Logic systems (Physics, Rendering, AI, etc.)
│   ├── Entity.js    # Entity class (container for components)
│   ├── Component.js # Base Component class
│   ├── System.js    # Base System class
│   ├── EntityManager.js # Central entity management
│   ├── EntityFactory.js # Helper functions to create entities
│   ├── index.js     # Barrel export
│   └── examples.js  # Usage examples
├── entities/        # Legacy entities (being migrated to ECS)
├── systems/         # High-level game systems and controllers
├── managers/        # Feature-specific managers
├── utils/           # Utility functions and helpers
└── main.js          # Entry point and game initialization
```

---

## 📁 Directory Guide

### `config/` - Configuration Files
**Purpose:** Centralize all game constants, settings, and configuration data.

**When to add here:**
- Game balance numbers (damage, speed, health)
- UI/rendering constants
- Physics parameters
- Level generation settings
- Upgrade/item definitions

**Files:**
- `enemyConfig.js` - Enemy stats, behavior, boss configuration
- `playerConfig.js` - Player stats, abilities, physics
- `worldConfig.js` - World physics, generation, camera settings
- `uiConfig.js` - UI rendering, animations, visual effects
- `upgrades.js` - Shop upgrade definitions
- `index.js` - Barrel export (re-exports all configs)

**Example:**
```javascript
// config/enemyConfig.js
export const ENEMY_CONFIG = {
  width: 44,
  height: 34,
  tiers: [/* ... */]
};
```

**Adding new config:**
1. Create config file in `config/` folder
2. Add typedef JSDoc comments
3. Export config object
4. Add to `config/index.js` barrel export

---

### `core/` - Core Game Systems
**Purpose:** Fundamental game loop and infrastructure.

**When to add here:**
- Core game loop logic
- Rendering systems
- State management
- Event bus / messaging system

**Files:**
- `EventBus.js` - Pub/sub event system for decoupled communication
- `gameLoop.js` - Main update-render loop (Game class)
- `gameState.js` - Global game state container
- `renderer.js` - Main rendering engine

**Key Pattern - EventBus:**
```javascript
import { eventBus } from './core/EventBus.js';

// Emit events
eventBus.emit('enemy:killed', { enemy, position });

// Listen to events
eventBus.on('enemy:killed', ({ enemy }) => {
  // Handle event
});
```

**Adding new core system:**
1. Create class in `core/` folder
2. Add JSDoc class documentation
3. Inject dependencies via constructor
4. Use EventBus for cross-system communication

---

### `ecs/` - Entity Component System ⭐ NEW
**Purpose:** Modular entity creation with composable components and systems.

**When to use:**
- Creating new entity types (NPCs, enemies, items, etc.)
- Adding interactable objects
- Implementing dialogue systems
- Building modular, reusable game objects

**Why ECS?**
- **Composition over Inheritance** - Mix and match components instead of deep class hierarchies
- **Flexibility** - Create new entity types by combining existing components
- **Performance** - Systems process all entities efficiently
- **Maintainability** - Logic is centralized in systems, not scattered across entity classes

**Core Concepts:**

**1. Entity** - Container with an ID and components
```javascript
import { Entity } from './ecs/index.js';

const entity = new Entity('MyEntity');
entity
  .addComponent(new PositionComponent({ x: 100, y: 100 }))
  .addComponent(new HealthComponent({ maxHealth: 50 }))
  .addTag('enemy');
```

**2. Component** - Pure data, no logic
```javascript
import { Component } from './ecs/index.js';

class CustomComponent extends Component {
  constructor({ value }) {
    super('Custom');
    this.value = value;
  }
}
```

**3. System** - Logic that processes entities with specific components
```javascript
import { System } from './ecs/index.js';

class CustomSystem extends System {
  constructor({ entityManager }) {
    super({
      requiredComponents: ['Position', 'Custom'],
      entityManager,
      priority: 10
    });
  }

  process(entities, deltaTime) {
    for (const entity of entities) {
      const pos = entity.getComponent('Position');
      const custom = entity.getComponent('Custom');
      // ... do something with components
    }
  }
}
```

**4. EntityManager** - Central hub for entities and systems
```javascript
import { EntityManager } from './ecs/index.js';

const entityManager = new EntityManager();
entityManager.addSystem(new PhysicsSystem({ entityManager }));
entityManager.addEntity(entity);

// In game loop:
entityManager.update(deltaTime);
```

**Available Components:**

*Core Components:*
- `PositionComponent` - Position, velocity, acceleration
- `RenderComponent` - Visual appearance (color, shape, sprite)
- `PhysicsComponent` - Collision box, mass, friction
- `HealthComponent` - HP, armor, regeneration

*Gameplay Components:*
- `InteractableComponent` - Makes entity interactable
- `DialogueComponent` - NPC dialogue trees
- `AIComponent` - AI behavior and targeting
- `InputComponent` - Player input state
- `ProjectileComponent` - Projectile behavior
- `EnemyComponent` - Enemy-specific data
- `PlayerComponent` - Player stats and upgrades

**Available Systems:**

*Core Systems:*
- `PhysicsSystem` - Movement and gravity
- `RenderSystem` - Drawing entities
- `CollisionSystem` - Collision detection and response
- `InputSystem` - Input handling

*Gameplay Systems:*
- `InteractionSystem` - Handle player interactions
- `DialogueSystem` - Manage NPC conversations
- `AISystem` - AI behavior processing
- `ProjectileSystem` - Projectile lifecycle
- `HealthSystem` - Health regeneration and death

**Entity Factory Functions:**

```javascript
import { 
  createPlayer,
  createEnemy,
  createNPC,
  createProjectile,
  createCollectible,
  createPlatform
} from './ecs/index.js';

// Create a player
const player = createPlayer({ x: 100, y: 100, maxHealth: 100 });

// Create an NPC with dialogue
const npc = createNPC({
  x: 300, y: 400,
  name: 'Shopkeeper',
  dialogue: [
    { speaker: 'Shopkeeper', text: 'Welcome!' },
    { speaker: 'Shopkeeper', text: 'What can I get you?' }
  ]
});

// Create an enemy
const enemy = createEnemy({ 
  x: 500, y: 400, 
  tier: 2, 
  maxHealth: 75 
});
```

**Quick Start Example:**

```javascript
// 1. Import ECS
import { 
  EntityManager, 
  PhysicsSystem, 
  RenderSystem,
  createPlayer,
  createEnemy 
} from './ecs/index.js';

// 2. Create entity manager
const entityManager = new EntityManager();

// 3. Add systems
entityManager.addSystem(new PhysicsSystem({ entityManager }));
entityManager.addSystem(new RenderSystem({ entityManager, ctx }));

// 4. Create entities
const player = createPlayer({ x: 100, y: 100 });
const enemy = createEnemy({ x: 300, y: 100, tier: 1 });

entityManager.addEntity(player);
entityManager.addEntity(enemy);

// 5. Update in game loop
function gameLoop(deltaTime) {
  entityManager.update(deltaTime);
}
```

**Creating New Entity Types:**

```javascript
import { Entity } from './ecs/index.js';
import { 
  PositionComponent,
  RenderComponent,
  PhysicsComponent,
  InteractableComponent
} from './ecs/index.js';

function createChest({ x, y }) {
  const chest = new Entity('Chest');
  
  chest
    .addComponent(new PositionComponent({ x, y }))
    .addComponent(new RenderComponent({
      width: 40,
      height: 30,
      color: '#8B4513',
      shape: 'rect'
    }))
    .addComponent(new PhysicsComponent({
      width: 40,
      height: 30,
      isStatic: true
    }))
    .addComponent(new InteractableComponent({
      range: 50,
      prompt: 'Press E to open',
      singleUse: true,
      onInteract: (chest, player) => {
        console.log('Chest opened!');
        // Give player loot
      }
    }))
    .addTag('chest')
    .addTag('interactable');
  
  return chest;
}
```

**ECS Events:**

The ECS emits events through EventBus:
- `entity:created` - New entity added
- `entity:destroyed` - Entity removed
- `entity:died` - Entity health reached 0
- `entity:interacted` - Entity was interacted with
- `collision` - Entities collided
- `projectile:hit` - Projectile hit target
- `projectile:expired` - Projectile lifetime ended
- `dialogue:started` - Dialogue began
- `dialogue:advanced` - Dialogue moved to next line
- `dialogue:ended` - Dialogue finished
- `ai:attack` - AI initiated attack

**Migration Path:**

The ECS system runs alongside existing code. You can migrate gradually:
1. Start with new entity types (NPCs, collectibles)
2. Migrate projectiles to ECS
3. Migrate enemies to ECS
4. Finally migrate player to ECS
5. Remove old entity classes when migration is complete

**Examples:**

See `resources/js/ecs/examples.js` for 10 detailed examples covering:
- Basic setup
- Creating entities
- NPCs with dialogue
- Collectibles
- Shooting projectiles
- Event listening
- Entity queries
- Game loop integration
- Custom entities
- Save/load

---

### `entities/` - Legacy Game Entities
**Purpose:** Individual game objects with their own state and behavior.
**Status:** Being migrated to ECS. New entities should use ECS instead.

**When to add here:**
- Player characters
- Enemies and bosses
- Projectiles
- Collectable items
- Platforms and obstacles

**Files:**
- `player.js` - Player class and player-specific functions
- `enemy.js` - Enemy class and enemy creation/update logic
- `projectile.js` - Projectile entity
- `room.js` - Room/level container

**Entity Pattern:**
```javascript
/**
 * EntityName - Brief description
 */
export class EntityName {
  /**
   * @param {Object} props - Entity properties
   */
  constructor(props) {
    Object.assign(this, props);
  }
}

// Factory function for complex initialization
export function createEntity(config) {
  return new EntityName({
    // ... initialized properties
  });
}
```

**Adding new entity:**
1. Create class in `entities/` folder
2. Add JSDoc documentation
3. Import needed config from `../config/index.js`
4. Emit EventBus events for important state changes
5. Keep update logic in system controllers, not in entity classes

---

### `systems/` - Game Systems & Controllers
**Purpose:** High-level systems that coordinate multiple entities and game features.

**When to add here:**
- Level generation systems
- Combat systems
- Progression systems
- Scene/room management

**Files:**
- `worldController.js` - World generation, enemies, platforms, environment
- `shopController.js` - Shop functionality and upgrade purchasing
- `roomController.js` - Room/scene management (tutorial, main game, etc.)

**System Pattern:**
```javascript
/**
 * SystemController - Brief description
 */
export class SystemController {
  /**
   * @param {Object} config - System configuration
   * @param {GameState} config.state - Game state reference
   * @param {Player} config.player - Player reference
   * // ... other dependencies
   */
  constructor({ state, player, /* ... */ }) {
    this.state = state;
    this.player = player;
    // Initialize system
  }

  update(dt) {
    // System update logic
  }
}
```

**Adding new system:**
1. Create controller class in `systems/` folder
2. Inject all dependencies via constructor config object
3. Use EventBus to communicate with other systems
4. Keep system self-contained and focused on one responsibility

---

### `managers/` - Feature Managers
**Purpose:** Manage specific game features or subsystems.

**When to add here:**
- UI management
- Audio/sound effects
- Input handling
- Save/load systems
- Player state management

**Files:**
- `audioManager.js` - Music and sound effect management
- `inputManager.js` - Keyboard/controller input handling
- `playerManager.js` - Player state and action management
- `shopManager.js` - Shop UI and interaction
- `uiManager.js` - HUD, menus, information displays
- `gameOverManager.js` - Game over state and high scores
- `gameStateManager.js` - Centralized game state management (pause, shop, boss fights, etc.)

**Manager Pattern:**
```javascript
/**
 * FeatureManager - Brief description
 */
export class FeatureManager {
  /**
   * @param {Object} config - Manager configuration
   */
  constructor(config) {
    // Initialize feature-specific state
    this.setupEventListeners();
  }

  setupEventListeners() {
    eventBus.on('relevant:event', this.handleEvent.bind(this));
  }
}
```

**GameStateManager - Centralized State Management:**

The `GameStateManager` is a special manager that provides a single interface for all major game state transitions. Instead of directly manipulating `state.paused`, `state.shopActive`, etc., use GameStateManager methods:

```javascript
// ✅ GOOD - Use GameStateManager methods
state.stateManager.pause({ reason: 'user_pause' });
state.stateManager.openShop({ shopOptions: selections });
state.stateManager.startBossFight({ boss });

// ❌ BAD - Direct state manipulation
state.paused = true;
state.shopActive = true;
state.bossFightActive = true;
```

**Benefits:**
1. **Single Source of Truth** - One place to look for all state changes
2. **Event Notifications** - Automatically emits events when state changes
3. **Validation** - Prevents invalid state transitions
4. **Testability** - Easy to mock for unit tests
5. **Debugging** - All state changes go through documented methods

**Available Methods:**

*Pause Management:*
- `pause(options)` - Pause the game
- `unpause()` - Unpause the game
- `togglePause(force)` - Toggle pause state
- `isPaused()` - Check if paused

*Shop Management:*
- `openShop(options)` - Open shop interface
- `closeShop(options)` - Close shop interface
- `isShopActive()` - Check if shop is open

*Boss Fight Management:*
- `startBossFight(options)` - Start boss fight
- `endBossFight(options)` - End boss fight
- `isBossFightActive()` - Check if boss fight active

*Game Over Management:*
- `gameOver(options)` - Trigger game over
- `resetGameOver()` - Reset from game over
- `isGameOver()` - Check if game over

*Level Complete Management:*
- `completeLevel()` - Mark level complete
- `resetLevelComplete()` - Reset level complete
- `isLevelComplete()` - Check if level complete

*Composite Queries:*
- `isGameplayBlocked()` - Check if any blocking state active
- `getStateSummary()` - Get complete state snapshot
- `resetAll()` - Reset all managed state

**Events Emitted:**
- `game:paused` - Game paused (with reason)
- `game:unpaused` - Game unpaused
- `shop:opened` - Shop opened (with options)
- `shop:closed` - Shop closed (with message)
- `boss:fight:started` - Boss fight started (with boss)
- `boss:fight:ended` - Boss fight ended (with defeated flag)
- `game:over` - Game over triggered (with death message)
- `game:over:reset` - Reset from game over
- `level:complete` - Level completed
- `level:complete:reset` - Reset level complete
- `game:state:reset` - All state reset

**Usage Example:**
```javascript
// In a controller or manager
class SomeController {
  constructor({ state }) {
    this.state = state;
    
    // Listen to state change events
    eventBus.on('game:paused', ({ reason }) => {
      console.log(`Game paused: ${reason}`);
    });
  }
  
  someMethod() {
    // Use GameStateManager methods
    if (!this.state.stateManager.isGameplayBlocked()) {
      // Safe to continue gameplay
      this.state.stateManager.pause({ reason: 'cutscene' });
    }
  }
}
```

**Adding new manager:**
1. Create manager class in `managers/` folder
2. Subscribe to relevant EventBus events in constructor
3. Expose public methods for feature operations
4. Keep manager focused on one feature area

---

### `utils/` - Utility Functions
**Purpose:** Reusable helper functions and shared utilities.

**When to add here:**
- Math utilities
- Collision detection
- Data transformation
- Common algorithms

**Files:**
- `utils.js` - General utility functions (clamp, randomRange, overlap, etc.)
- `constants.js` - Legacy constants (being phased out, use config/ instead)
- `version.js` - Version information

**Utility Pattern:**
```javascript
/**
 * Utility function description
 * @param {type} param - Parameter description
 * @returns {type} Return value description
 */
export function utilityFunction(param) {
  // Pure function logic
  return result;
}
```

**Adding new utility:**
1. Add pure function to `utils.js`
2. Add comprehensive JSDoc documentation
3. Keep functions pure (no side effects)
4. Test with various inputs

---

## 🎯 Where to Put New Code

### Adding a New Enemy Type
1. Add stats to `config/enemyConfig.js` (in tiers array)
2. Modify `createEnemy()` in `entities/enemy.js` if needed
3. Update enemy spawning logic in `systems/worldController.js`
4. Emit `enemy:killed` event on death for decoupled systems

### Adding a New Ability
1. Add config to `config/playerConfig.js` or `config/upgrades.js`
2. Add ability logic to `entities/player.js` or separate file in `entities/`
3. Add UI display to `managers/uiManager.js`
4. Add input handling to `managers/inputManager.js`
5. Emit events for ability activation/effects

### Adding a New Shop Upgrade
1. Add upgrade definition to `config/upgrades.js`
2. Add purchase logic to `systems/shopController.js`
3. Update UI rendering in `managers/uiManager.js`
4. Emit `upgrade:purchased` event if other systems need to react

### Adding a New UI Element
1. Add config to `config/uiConfig.js` if it has settings
2. Add rendering logic to `core/renderer.js`
3. Add management logic to `managers/uiManager.js`
4. Update state in `core/gameState.js` if needed

### Adding a New Game Mode
1. Create mode controller in `systems/` (e.g., `survivalController.js`)
2. Add mode config to `config/worldConfig.js` or new config file
3. Update `systems/roomController.js` to handle mode switching
4. Add mode-specific UI to `managers/uiManager.js`

---

## 💉 Dependency Injection Pattern

### Overview
All major classes use **constructor-based dependency injection** via configuration objects. This makes the code:
- **Testable** - Easy to mock dependencies in unit tests
- **Flexible** - Easy to swap implementations without changing code
- **Explicit** - Dependencies are clear from constructor signature
- **Maintainable** - Dependencies can be changed without breaking existing code

### Configuration Object Pattern
All classes accept a single configuration object with named properties:

```javascript
// ✅ GOOD - Config object with defaults
export class AudioManager {
  constructor({ paths = AUDIO_TRACKS, muteToggle = null, eventBus = null } = {}) {
    this.paths = paths;
    this.muteToggle = muteToggle;
    this.eventBus = eventBus;
  }
}

// ❌ BAD - Positional arguments
export class AudioManager {
  constructor(paths, muteToggle, eventBus) { /* ... */ }
}
```

### Benefits of Config Objects

**1. Named Parameters**
```javascript
// Clear what each parameter does
const audio = new AudioManager({
  paths: AUDIO_TRACKS,
  muteToggle: document.getElementById('muteToggle'),
  eventBus
});

// vs. positional args - unclear without looking at docs
const audio = new AudioManager(AUDIO_TRACKS, muteToggle, eventBus);
```

**2. Optional Dependencies**
```javascript
// Optional dependencies with defaults
constructor({ paths = AUDIO_TRACKS, muteToggle = null, eventBus = null } = {}) {
  // muteToggle and eventBus are optional
  if (this.muteToggle) {
    this.muteToggle.addEventListener('click', this.toggleMute);
  }
}
```

**3. Easy Testing**
```javascript
// Test without real DOM elements
const mockEventBus = { on: jest.fn(), emit: jest.fn() };
const audio = new AudioManager({ 
  paths: testPaths,
  eventBus: mockEventBus 
});
```

**4. Forward Compatibility**
```javascript
// Adding new dependencies doesn't break existing code
constructor({ 
  paths = AUDIO_TRACKS, 
  muteToggle = null, 
  eventBus = null,
  volumeSlider = null  // NEW - doesn't break existing instantiations
} = {}) { /* ... */ }
```

### Dependency Injection Examples

#### AudioManager
```javascript
// Injects: audio file paths, DOM element, event bus
const audio = new AudioManager({
  paths: AUDIO_TRACKS,
  muteToggle: document.getElementById('muteToggle'),
  eventBus
});
```

#### Player
```javascript
// Injects: player config, world physics, shop settings
const player = new Player({
  playerConfig: PLAYER_CONFIG,
  world,
  shopInterval: SHOP_INTERVAL
});
```

#### Renderer
```javascript
// Injects: game state, game over manager, rendering config
const renderer = new Renderer({
  state,
  gameOverManager,
  markerSpacing: MARKER_SPACING,
  acidDebuffDuration: ACID_DEBUFF_DURATION,
  damageLifetime: 0.8
});
```

#### ShopController
```javascript
// Injects: state, player, managers, DOM elements
const shopController = new ShopController({
  state,
  player,
  playerManager,
  shopManager,
  shopRefreshButton: document.getElementById('shopRefresh'),
  shopSkipButton: document.getElementById('shopSkip')
});
```

#### WorldController
```javascript
// Injects: state, player, config, factory functions, callbacks
const worldController = new WorldController({
  state,
  player,
  enemyConfig: ENEMY_CONFIG,
  createEnemy,
  platformUnit: PLATFORM_UNIT,
  acidTickInterval: ACID_TICK_INTERVAL,
  playerDamagePerTick,
  playCorrosionSound
});
```

### Best Practices

**1. Use Destructuring with Defaults**
```javascript
constructor({ 
  requiredParam,           // Required - no default
  optionalParam = 'default', // Optional with default
  anotherOptional = null   // Optional, nullable
} = {}) {  // Default to empty object so constructor() works
  this.requiredParam = requiredParam;
  this.optionalParam = optionalParam;
}
```

**2. Document All Parameters**
```javascript
/**
 * @param {Object} config - Configuration object
 * @param {GameState} config.state - Game state reference
 * @param {Player} config.player - Player instance  
 * @param {EventBus} [config.eventBus] - Optional event bus
 */
constructor({ state, player, eventBus = null }) { /* ... */ }
```

**3. Keep Dependencies Minimal**
```javascript
// ✅ GOOD - Only depends on what it needs
constructor({ canvas, ctx, state }) {
  this.canvas = canvas;
  this.ctx = ctx;
  this.state = state;
}

// ❌ BAD - Depends on entire game instance
constructor(game) {
  this.game = game;
  // Now coupled to entire game object
}
```

**4. Inject Functions, Not Implementations**
```javascript
// ✅ GOOD - Inject callback function
constructor({ onGameOver }) {
  this.onGameOver = onGameOver;
}

// Later: this.onGameOver();

// ❌ BAD - Import and directly use
import { triggerGameOver } from './gameOver.js';
// Now tightly coupled to this implementation
```

**5. Use EventBus for Cross-System Communication**
```javascript
// ✅ GOOD - Emit event for decoupled communication
constructor({ eventBus }) {
  this.eventBus = eventBus;
}

onEnemyDeath() {
  this.eventBus.emit('enemy:killed', { enemy: this });
}

// ❌ BAD - Direct method calls across systems
constructor({ audioManager, uiManager }) {
  this.audioManager = audioManager;
  this.uiManager = uiManager;
}

onEnemyDeath() {
  this.audioManager.playSound('death');
  this.uiManager.showKillNotification();
  // Tightly coupled to these implementations
}
```

### Testing Benefits

With proper DI, you can easily test in isolation:

```javascript
// Example: Testing ShopController
describe('ShopController', () => {
  it('should purchase upgrade when player has enough coins', () => {
    // Mock dependencies
    const mockPlayer = { coins: 100, health: 10 };
    const mockState = { upgrades: {}, shopActive: true };
    const mockPlayerManager = { applyScale: jest.fn() };
    const mockShopManager = { 
      updateMessage: jest.fn(),
      close: jest.fn() 
    };
    
    // Inject mocks
    const shop = new ShopController({
      state: mockState,
      player: mockPlayer,
      playerManager: mockPlayerManager,
      shopManager: mockShopManager,
      shopRefreshButton: null,
      shopSkipButton: null
    });
    
    // Test in isolation - no real DOM, no real game state
    shop.handleSelection('test_upgrade');
    
    expect(mockPlayer.coins).toBe(50); // Spent 50 coins
    expect(mockShopManager.updateMessage).toHaveBeenCalled();
  });
});
```

---

## 🔌 Event-Driven Architecture

### Core Events
The game uses EventBus for decoupled communication between systems:

**Player Events:**
- `player:damaged` - Player takes damage from any source
  - Payload: `{ amount, source, sourceX }`
  - Handlers: Applies damage, plays hit sound, spawns damage number, checks game over
- `player:collected:chunk` - Player collects slime chunk  
  - Payload: `{ chunk }`
  - Handlers: Heals player, plays collection sound
- `player:collected:coin` - Player collects coin
  - Payload: `{ coin, amount }`
  - Handlers: Awards coins with multiplier, plays coin sound
- `player:mutate` - Player uses mutation ability
  - Payload: `{ player }`
  - Handlers: Triggers mutation cutscene, grants acid trail ability

**Enemy Events:**
- `enemy:killed` - Enemy defeated
  - Payload: `{ enemy, position }`
  - Handlers: Plays death sound, spawns chunks and coins

**Boss Events:**
- `boss:defeated` - Boss defeated
  - Payload: `{ boss }`
  - Handlers: Stops boss music, starts defeat cinematic
- `boss:shield:activated` - Boss shield activated (health bar depleted)
  - Payload: `{ boss }`
  - Handlers: Spawns reward chunks, grants invulnerability

**Shop Events:**
- `shop:reached` - Player reaches shop trigger
  - Payload: None
  - Handlers: Opens shop interface
- `shop:opened` - Shop interface opened
  - Payload: `{ options }`
  - Handlers: UI updates, pauses game
- `shop:closed` - Shop interface closed
  - Payload: `{ message }`
  - Handlers: Resumes game, resets shop state

**Upgrade Events:**
- `upgrade:purchased` - Player buys an upgrade
  - Payload: `{ upgrade, player }`
  - Handlers: Applies upgrade effects, updates UI

**Game State Events:**
- `game:over` - Game over triggered
  - Payload: `{ deathMessage }`
  - Handlers: Shows game over screen, records high score, stops gameplay
- `level:complete` - Level completed (boss defeated)
  - Payload: None
  - Handlers: Shows victory screen, plays music, stops game loop

**Visual/Audio Events:**
- `damage:number:spawn` - Spawn floating damage number
  - Payload: `{ x, y, damage, key }`
  - Handlers: Creates visual damage indicator
- `audio:effect:play` - Play sound effect
  - Payload: `{ effectName }`
  - Handlers: AudioManager plays the specified effect
- `audio:loop:start` - Start looping sound
  - Payload: `{ loopName }`
  - Handlers: AudioManager ensures loop is playing
- `audio:loop:stop` - Stop looping sound
  - Payload: `{ loopName }`
  - Handlers: AudioManager stops the loop

### Adding New Events
```javascript
// 1. Emit event where state changes
eventBus.emit('feature:action', { data });

// 2. Listen in relevant managers/systems
eventBus.on('feature:action', ({ data }) => {
  // React to event
});
```

**Event Naming Convention:**
- Format: `category:action:detail`
- Use lowercase with colons
- Be specific and descriptive
- Examples: `enemy:killed`, `player:damaged`, `shop:opened`

---

## 📝 Code Style Guide

### JSDoc Comments
All classes, functions, and complex types should have JSDoc:

```javascript
/**
 * @typedef {Object} ConfigType
 * @property {number} value - Description
 */

/**
 * Class description
 */
export class MyClass {
  /**
   * @param {Object} config - Configuration
   * @param {ConfigType} config.data - Data description
   */
  constructor({ data }) {
    this.data = data;
  }
}
```

### Import Organization
```javascript
// 1. External dependencies (if any)
import external from 'external';

// 2. Config imports
import { CONFIG } from '../config/index.js';

// 3. Core imports
import { eventBus } from '../core/EventBus.js';

// 4. Entity imports
import { Player } from '../entities/player.js';

// 5. Utility imports
import { clamp } from '../utils/utils.js';
```

### Relative Import Paths
- Same folder: `'./file.js'`
- Parent folder: `'../folder/file.js'`
- Always use explicit `.js` extension

---

## 🚀 Development Workflow

### Adding a New Feature
1. **Plan:** Identify which folders/files are affected
2. **Config:** Add constants to appropriate config file
3. **Events:** Define what events the feature will emit/listen to
4. **Implementation:**
   - Create entity classes in `entities/`
   - Add system logic in `systems/`
   - Add UI/management in `managers/`
5. **Documentation:** Add JSDoc comments
6. **Test:** Verify feature works and doesn't break existing code

### Modifying Existing Code
1. **Locate:** Find the appropriate file based on folder structure
2. **Check Dependencies:** Look at imports to understand connections
3. **Update:** Make changes while maintaining existing patterns
4. **Events:** Ensure EventBus events still work correctly
5. **Test:** Verify changes don't break related systems

---

## 🛠️ Troubleshooting

### "Cannot find module" Error
- Check relative import paths (use `../` to go up folders)
- Verify file exists in expected location
- Ensure `.js` extension is included

### "Config is undefined"
- Import from `'../config/index.js'` (barrel export)
- Check that config is exported in its source file
- Verify config is added to `config/index.js`

### Event Not Firing
- Check event name spelling matches exactly
- Ensure `eventBus.emit()` is called at right time
- Verify listener is registered with `eventBus.on()`
- Enable debug mode: `eventBus.setDebug(true)`

---

## 🧪 Testing

### Overview
The project uses [Jest](https://jestjs.io/) for unit testing with ES module support.

### Running Tests
```bash
# Install dependencies (first time only)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage
```

### Test Structure
Tests are in `__tests__/` directory:
- `utils.test.js` - Pure utility functions
- `gameStateManager.test.js` - State management
- More tests coming soon...

### Writing Tests
**Test Pure Functions First:**
```javascript
import { describe, it, expect } from '@jest/globals';
import { clamp } from '../resources/js/utils/utils.js';

describe('clamp', () => {
  it('should clamp value between min and max', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
```

**Test Classes with Mocks:**
```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GameStateManager } from '../resources/js/managers/gameStateManager.js';

describe('GameStateManager', () => {
  let stateManager;
  let mockEventBus;

  beforeEach(() => {
    mockEventBus = { emit: jest.fn() };
    stateManager = new GameStateManager({ 
      state: { paused: false }, 
      eventBus: mockEventBus 
    });
  });

  it('should pause and emit event', () => {
    stateManager.pause();
    expect(mockEventBus.emit).toHaveBeenCalledWith('game:paused', { reason: 'manual' });
  });
});
```

### Testing Best Practices
1. **Test pure functions first** - Easiest to test, highest value
2. **Use mocks for dependencies** - EventBus, DOM elements, audio
3. **Test edge cases** - Boundary values, null, undefined, empty arrays
4. **Test state transitions** - Before/after states, event emissions
5. **Keep tests focused** - One concept per test
6. **Use descriptive names** - Test name should explain what's tested

### What to Test
**High Priority (Pure Functions):**
- ✅ Utils: `clamp`, `randomRange`, `overlap`, `snapshot`
- ✅ Collision: `circleRectCollision`, `checkBossCollision`
- ✅ GameStateManager: All state transition methods

**Medium Priority (Classes with Dependencies):**
- 🚧 PlayerManager: Apply upgrades, scale calculations
- 🚧 ShopController: Purchase logic, option selection
- 🚧 WorldController: Generation algorithms
- 🚧 AudioManager: Playback logic (with mocked Audio)

**Lower Priority (Complex Integration):**
- 🔜 Renderer: Visual output (hard to test)
- 🔜 Game loop: Integration testing
- 🔜 Input handling: Event simulation

### Coverage Goals
- **Utils:** 100% (pure functions)
- **Managers:** 80%+ (state management)
- **Systems:** 70%+ (controllers)
- **Overall:** 60%+ target

View coverage reports: `coverage/index.html` after running `npm run test:coverage`

---

## 📚 Quick Reference

### File Type → Folder Mapping
- Constants/Settings → `config/`
- Game Loop/Rendering → `core/`
- Player/Enemy/Item → `entities/`
- Level/Combat/Progression → `systems/`
- UI/Audio/Input/Save → `managers/`
- Helper Functions → `utils/`

### Common Patterns
- **Dependency Injection:** Pass dependencies via constructor
- **Event Communication:** Use EventBus for cross-system messaging
- **Configuration:** Import from `config/index.js`
- **Type Safety:** Use JSDoc typedefs and param docs

---

## 🎓 Best Practices

1. **Keep classes focused** - One responsibility per class
2. **Use EventBus for decoupling** - Avoid direct cross-system calls
3. **Config over hardcoding** - Put constants in config files
4. **Document with JSDoc** - Help future developers (including yourself)
5. **Follow naming conventions** - Consistent naming makes code readable
6. **Test as you go** - Verify features work before moving on
7. **Prefer ECS for new entities** - Use Entity Component System for flexibility

---

**Version:** 0.9.0  
**Last Updated:** December 2025  
**Maintained by:** Development Team

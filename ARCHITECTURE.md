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
├── entities/        # Game entities (Player, Enemy, etc.)
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

### `entities/` - Game Entities
**Purpose:** Individual game objects with their own state and behavior.

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

---

**Version:** 0.3.3  
**Last Updated:** December 2025  
**Maintained by:** Development Team

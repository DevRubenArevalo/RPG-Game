# Entity Component System (ECS)

This directory contains the complete Entity Component System implementation for flexible, modular game entity creation.

## 📂 Directory Structure

```
ecs/
├── components/          # Component definitions
│   ├── CoreComponents.js      # Position, Render, Physics, Health
│   └── GameplayComponents.js  # Interactable, Dialogue, AI, Input, etc.
├── systems/            # System logic
│   ├── CoreSystems.js         # Physics, Render, Collision, Input
│   └── GameplaySystems.js     # Interaction, Dialogue, AI, etc.
├── Component.js        # Base Component class
├── Entity.js           # Entity container class
├── System.js           # Base System class
├── EntityManager.js    # Central entity management
├── EntityFactory.js    # Helper functions to create entities
├── index.js            # Barrel export (import from here)
├── examples.js         # 10 usage examples
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Import the ECS

```javascript
import { 
  EntityManager,
  PhysicsSystem,
  RenderSystem,
  createPlayer,
  createEnemy,
  createNPC
} from './ecs/index.js';
```

### 2. Set up EntityManager

```javascript
const entityManager = new EntityManager();

// Add systems (order matters - priority determines execution)
entityManager.addSystem(new PhysicsSystem({ entityManager }));
entityManager.addSystem(new RenderSystem({ entityManager, ctx }));
```

### 3. Create Entities

```javascript
// Using factory functions (easiest)
const player = createPlayer({ x: 100, y: 100, maxHealth: 100 });
entityManager.addEntity(player);

// Or create custom entities
const chest = new Entity('Chest')
  .addComponent(new PositionComponent({ x: 200, y: 100 }))
  .addComponent(new InteractableComponent({ 
    prompt: 'Press E to open',
    onInteract: (chest, player) => {
      console.log('Chest opened!');
    }
  }))
  .addTag('interactable');

entityManager.addEntity(chest);
```

### 4. Update in Game Loop

```javascript
function gameLoop(deltaTime) {
  entityManager.update(deltaTime);
}
```

## 📦 Components

### Core Components
- **PositionComponent** - x, y, velocity, acceleration
- **RenderComponent** - width, height, color, shape, layer
- **PhysicsComponent** - collision box, mass, friction, static/trigger
- **HealthComponent** - HP, max HP, armor, regeneration

### Gameplay Components
- **InteractableComponent** - range, prompt, interaction callback
- **DialogueComponent** - name, dialogue tree, repeatable
- **AIComponent** - behavior, detection range, attack range
- **InputComponent** - keyboard input state
- **ProjectileComponent** - damage, owner, lifetime, piercing
- **EnemyComponent** - tier, damage, score/coin values
- **PlayerComponent** - coins, score, upgrades

## ⚙️ Systems

### Core Systems
- **PhysicsSystem** (priority: 10) - Movement, gravity, friction
- **RenderSystem** (priority: 100) - Drawing entities with layers
- **CollisionSystem** (priority: 20) - AABB collision detection
- **InputSystem** (priority: 5) - Input state updates

### Gameplay Systems
- **InteractionSystem** (priority: 15) - Range-based interactions
- **DialogueSystem** (priority: 25) - NPC conversations
- **AISystem** (priority: 12) - AI behaviors
- **ProjectileSystem** (priority: 18) - Projectile lifecycle
- **HealthSystem** (priority: 22) - HP regen and death

## 🏭 Entity Factory

Pre-configured entity creators:

```javascript
// Create a player
const player = createPlayer({ x: 100, y: 100, maxHealth: 100 });

// Create an enemy
const enemy = createEnemy({ x: 300, y: 100, tier: 2, maxHealth: 75 });

// Create an NPC with dialogue
const npc = createNPC({
  x: 500, y: 100,
  name: 'Shopkeeper',
  dialogue: [
    { speaker: 'Shopkeeper', text: 'Hello!' },
    { speaker: 'Shopkeeper', text: 'What do you need?' }
  ]
});

// Create a projectile
const projectile = createProjectile({
  x: playerX, y: playerY,
  vx: 400, vy: 0,
  damage: 20,
  owner: player,
  targetTags: ['enemy']
});

// Create a collectible
const coin = createCollectible({
  x: 200, y: 200,
  itemType: 'coin',
  onCollect: (item, player) => {
    player.getComponent('Player').coins++;
  }
});

// Create a platform
const platform = createPlatform({
  x: 0, y: 500,
  width: 800, height: 100
});
```

## 🎯 Common Patterns

### Query Entities

```javascript
// Get all entities with Health component
const damageable = entityManager.getEntitiesWithComponents('Health');

// Get all enemies
const enemies = entityManager.getEntitiesWithTag('enemy');

// Get entities with multiple components
const aiEntities = entityManager.getEntitiesWithComponents('Position', 'AI');
```

### Listen to Events

```javascript
import { eventBus } from '../core/EventBus.js';

// Entity died
eventBus.on('entity:died', ({ entity }) => {
  console.log(`${entity.name} died!`);
});

// Projectile hit
eventBus.on('projectile:hit', ({ projectile, target, damage }) => {
  console.log(`Hit ${target.name} for ${damage} damage`);
});

// Dialogue started
eventBus.on('dialogue:started', ({ entity, speaker, line }) => {
  console.log(`${speaker}: ${line.text}`);
});
```

### Create Custom Components

```javascript
import { Component } from './Component.js';

class InventoryComponent extends Component {
  constructor({ capacity = 10 }) {
    super('Inventory');
    this.capacity = capacity;
    this.items = [];
  }

  addItem(item) {
    if (this.items.length < this.capacity) {
      this.items.push(item);
      return true;
    }
    return false;
  }
}
```

### Create Custom Systems

```javascript
import { System } from './System.js';

class InventorySystem extends System {
  constructor({ entityManager, eventBus }) {
    super({
      requiredComponents: ['Inventory'],
      entityManager,
      eventBus,
      priority: 15
    });
  }

  process(entities, deltaTime) {
    for (const entity of entities) {
      const inventory = entity.getComponent('Inventory');
      // Process inventory logic
    }
  }
}
```

## 📚 Examples

See `examples.js` for 10 detailed examples:

1. **Basic Setup** - EntityManager and systems
2. **Create Entities** - Player, platforms, enemies
3. **NPCs** - Dialogue system
4. **Collectibles** - Items with callbacks
5. **Projectiles** - Shooting mechanics
6. **Events** - Listening to ECS events
7. **Queries** - Finding entities
8. **Game Loop** - Integration
9. **Custom Entities** - Advanced creation
10. **Save/Load** - Serialization

## 🎮 Usage in Your Game

### For NPCs and Dialogue

```javascript
const villager = createNPC({
  x: 300, y: 400,
  name: 'Villager',
  dialogue: [
    { speaker: 'Villager', text: 'Beware the forest!' },
    { speaker: 'Villager', text: 'Monsters lurk there.' }
  ]
});
entityManager.addEntity(villager);
```

### For Interactable Objects

```javascript
const door = new Entity('Door')
  .addComponent(new PositionComponent({ x: 500, y: 350 }))
  .addComponent(new RenderComponent({ width: 50, height: 100, color: '#8B4513' }))
  .addComponent(new PhysicsComponent({ width: 50, height: 100, isStatic: true }))
  .addComponent(new InteractableComponent({
    prompt: 'Press E to open door',
    singleUse: true,
    onInteract: (door, player) => {
      console.log('Door opened!');
      // Load next level, etc.
    }
  }))
  .addTag('door');

entityManager.addEntity(door);
```

### For Dynamic Enemy Types

```javascript
// Flying enemy with custom behavior
const flyingEnemy = createEnemy({ x: 600, y: 200, tier: 2 });
flyingEnemy.getComponent('Physics').mass = 0.3; // Light
flyingEnemy.getComponent('AI').state.canFly = true;
flyingEnemy.addTag('flying');

// Boss enemy
const boss = createEnemy({ 
  x: 400, y: 300, 
  tier: 5, 
  maxHealth: 500, 
  damage: 30 
});
boss.getComponent('Render').width = 100;
boss.getComponent('Render').height = 100;
boss.addTag('boss');
```

## 🔄 Migration from Old System

The ECS works alongside existing code. Migrate gradually:

1. ✅ **Start with new entities** (NPCs, chests, doors)
2. ⏳ Migrate projectiles
3. ⏳ Migrate enemies
4. ⏳ Migrate player
5. ⏳ Remove old entity classes

## 🐛 Debugging

```javascript
// Get entity count
console.log(`Active entities: ${entityManager.getEntityCount()}`);

// Get all entities
const allEntities = entityManager.getAllEntities();
console.log('Entities:', allEntities.map(e => e.name));

// Check entity components
const entity = entityManager.getEntity(1);
console.log('Components:', entity.getAllComponents().map(c => c.type));

// Check entity tags
console.log('Tags:', Array.from(entity.tags));
```

## 📖 Full Documentation

See `ARCHITECTURE.md` for complete ECS documentation including:
- Detailed component descriptions
- System priorities and execution order
- Event catalog
- Architecture explanations
- Best practices

## 🎓 Learning Resources

1. Read `examples.js` - 10 practical examples
2. Study `EntityFactory.js` - See how entities are built
3. Check `CoreSystems.js` - Understand system logic
4. Review `ARCHITECTURE.md` - Full architecture guide

---

**Ready to create your first NPC?** Check `examples.js` Example #3! 🎮

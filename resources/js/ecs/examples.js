/**
 * ECS Usage Examples
 * This file demonstrates how to use the Entity Component System
 */

import { 
  EntityManager,
  createPlayer,
  createEnemy,
  createNPC,
  createProjectile,
  createCollectible,
  createPlatform,
  createExampleDialogue,
  PhysicsSystem,
  RenderSystem,
  CollisionSystem,
  InputSystem,
  InteractionSystem,
  DialogueSystem,
  AISystem,
  ProjectileSystem,
  HealthSystem
} from './index.js';
import { eventBus } from '../core/EventBus.js';

/**
 * Example 1: Basic ECS Setup
 * Shows how to create EntityManager and add systems
 */
export function exampleBasicSetup(canvas, inputManager) {
  const ctx = canvas.getContext('2d');
  const entityManager = new EntityManager();
  
  // Add all core systems (order matters - priority determines execution order)
  entityManager.addSystem(new InputSystem({ 
    entityManager, 
    inputManager 
  }));
  
  entityManager.addSystem(new PhysicsSystem({ 
    entityManager, 
    eventBus,
    gravity: 980 
  }));
  
  entityManager.addSystem(new CollisionSystem({ 
    entityManager, 
    eventBus 
  }));
  
  entityManager.addSystem(new AISystem({ 
    entityManager, 
    eventBus 
  }));
  
  entityManager.addSystem(new InteractionSystem({ 
    entityManager, 
    eventBus 
  }));
  
  entityManager.addSystem(new DialogueSystem({ 
    entityManager, 
    eventBus,
    uiManager: null // Pass your UIManager here
  }));
  
  entityManager.addSystem(new ProjectileSystem({ 
    entityManager, 
    eventBus 
  }));
  
  entityManager.addSystem(new HealthSystem({ 
    entityManager, 
    eventBus 
  }));
  
  entityManager.addSystem(new RenderSystem({ 
    entityManager, 
    ctx,
    camera: { x: 0, y: 0 }
  }));
  
  return entityManager;
}

/**
 * Example 2: Creating Basic Entities
 * Shows how to create and add entities to the world
 */
export function exampleCreateEntities(entityManager) {
  // Create player
  const player = createPlayer({
    x: 100,
    y: 100,
    maxHealth: 100
  });
  entityManager.addEntity(player);
  
  // Create ground platform
  const ground = createPlatform({
    x: 0,
    y: 500,
    width: 800,
    height: 100
  });
  entityManager.addEntity(ground);
  
  // Create enemies
  for (let i = 0; i < 3; i++) {
    const enemy = createEnemy({
      x: 300 + i * 100,
      y: 400,
      tier: 1,
      maxHealth: 50,
      damage: 10
    });
    entityManager.addEntity(enemy);
  }
  
  return { player, ground };
}

/**
 * Example 3: Creating an NPC with Dialogue
 * Shows how to create interactive NPCs
 */
export function exampleCreateNPC(entityManager) {
  const dialogue = [
    {
      speaker: 'Shopkeeper',
      text: 'Welcome to my shop, traveler!',
      emotion: 'happy'
    },
    {
      speaker: 'Shopkeeper',
      text: 'I have many rare items for sale.',
      emotion: 'excited'
    },
    {
      speaker: 'Shopkeeper',
      text: 'What can I get for you today?',
      emotion: 'neutral',
      choices: [
        { text: 'Show me your wares', nextLine: 3 },
        { text: 'Just browsing', nextLine: 5 }
      ]
    },
    {
      speaker: 'Shopkeeper',
      text: 'Excellent! Here\'s what I have...',
      emotion: 'happy'
    },
    {
      speaker: 'You',
      text: 'These prices are too high!',
      emotion: 'angry'
    },
    {
      speaker: 'Shopkeeper',
      text: 'Come back when you\'re ready!',
      emotion: 'neutral'
    }
  ];
  
  const npc = createNPC({
    x: 400,
    y: 420,
    name: 'Shopkeeper',
    dialogue,
    color: '#FF9800'
  });
  
  entityManager.addEntity(npc);
  return npc;
}

/**
 * Example 4: Creating Collectibles
 * Shows how to create items that can be collected
 */
export function exampleCreateCollectibles(entityManager) {
  // Create coins
  for (let i = 0; i < 5; i++) {
    const coin = createCollectible({
      x: 200 + i * 50,
      y: 300,
      itemType: 'coin',
      onCollect: (item, player) => {
        // Award coin to player
        const playerComp = player.getComponent('Player');
        if (playerComp) {
          playerComp.coins += 1;
          console.log(`Collected coin! Total: ${playerComp.coins}`);
        }
        
        // Emit event
        eventBus.emit('coin:collected', { player, coin: item });
      }
    });
    entityManager.addEntity(coin);
  }
  
  // Create health pickup
  const health = createCollectible({
    x: 500,
    y: 300,
    itemType: 'health',
    onCollect: (item, player) => {
      const healthComp = player.getComponent('Health');
      if (healthComp) {
        const healed = healthComp.heal(25);
        console.log(`Healed for ${healed} HP`);
      }
      
      eventBus.emit('health:collected', { player, health: item });
    }
  });
  entityManager.addEntity(health);
}

/**
 * Example 5: Shooting Projectiles
 * Shows how to create projectiles from player input
 */
export function exampleShootProjectile(entityManager, player) {
  const pos = player.getComponent('Position');
  const input = player.getComponent('Input');
  
  if (!pos || !input) return;
  
  // Create projectile
  const projectile = createProjectile({
    x: pos.x + 15, // Center of player
    y: pos.y + 15,
    vx: 400, // Move right
    vy: 0,
    damage: 20,
    owner: player,
    lifetime: 3,
    targetTags: ['enemy']
  });
  
  entityManager.addEntity(projectile);
  
  // Play sound effect
  eventBus.emit('audio:effect:play', { effect: 'shoot' });
  
  return projectile;
}

/**
 * Example 6: Listening to ECS Events
 * Shows how to respond to entity events
 */
export function exampleListenToEvents() {
  // Listen for entity death
  eventBus.on('entity:died', ({ entity }) => {
    console.log(`Entity ${entity.name} died!`);
    
    // Drop loot if enemy
    if (entity.hasTag('enemy')) {
      const pos = entity.getComponent('Position');
      const enemyComp = entity.getComponent('Enemy');
      
      if (pos && enemyComp) {
        // Spawn coins at death location
        console.log(`Enemy dropped ${enemyComp.coinValue} coins`);
      }
    }
  });
  
  // Listen for projectile hits
  eventBus.on('projectile:hit', ({ projectile, target, damage }) => {
    console.log(`Projectile hit ${target.name} for ${damage} damage`);
    
    // Spawn damage number
    const pos = target.getComponent('Position');
    if (pos) {
      eventBus.emit('damage:number:spawn', {
        x: pos.x,
        y: pos.y,
        damage
      });
    }
  });
  
  // Listen for dialogue events
  eventBus.on('dialogue:started', ({ entity, speaker, line }) => {
    console.log(`${speaker}: ${line.text}`);
  });
  
  // Listen for interactions
  eventBus.on('entity:interacted', ({ interactor, target }) => {
    console.log(`${interactor.name} interacted with ${target.name}`);
  });
}

/**
 * Example 7: Querying Entities
 * Shows how to find entities with specific components or tags
 */
export function exampleQueryEntities(entityManager) {
  // Get all entities with Health component
  const damageable = entityManager.getEntitiesWithComponents('Health');
  console.log(`Found ${damageable.length} entities that can take damage`);
  
  // Get all enemies
  const enemies = entityManager.getEntitiesWithTag('enemy');
  console.log(`Found ${enemies.length} enemies`);
  
  // Get all interactable entities
  const interactables = entityManager.getEntitiesWithTag('interactable');
  console.log(`Found ${interactables.length} interactable objects`);
  
  // Get entities with both Position and AI (enemies with AI)
  const aiEntities = entityManager.getEntitiesWithComponents('Position', 'AI');
  console.log(`Found ${aiEntities.length} AI-controlled entities`);
  
  return { damageable, enemies, interactables, aiEntities };
}

/**
 * Example 8: Main Game Loop Integration
 * Shows how to update ECS in your game loop
 */
export function exampleGameLoop(entityManager, lastTime = 0) {
  function loop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;
    
    // Update all systems (they process entities automatically)
    entityManager.update(deltaTime);
    
    // Continue loop
    requestAnimationFrame(loop);
  }
  
  // Start the loop
  requestAnimationFrame(loop);
}

/**
 * Example 9: Custom Entity Creation
 * Shows how to create entities with custom component combinations
 */
export function exampleCustomEntity(entityManager) {
  // Example: Create a flying enemy with different behavior
  const flyingEnemy = createEnemy({
    x: 600,
    y: 200,
    tier: 2,
    maxHealth: 75,
    damage: 15,
    color: '#E91E63'
  });
  
  // Modify physics to allow flying
  const physics = flyingEnemy.getComponent('Physics');
  physics.mass = 0.5; // Lighter
  
  // Modify AI for flying behavior
  const ai = flyingEnemy.getComponent('AI');
  ai.detectionRange = 300; // See farther
  ai.state.flying = true; // Custom state flag
  
  entityManager.addEntity(flyingEnemy);
  return flyingEnemy;
}

/**
 * Example 10: Saving and Loading Entities
 * Shows how to serialize/deserialize entities
 */
export function exampleSaveLoad(entityManager) {
  // Save all entities
  const savedData = {
    entities: entityManager.getAllEntities().map(e => e.serialize())
  };
  
  console.log('Saved game state:', savedData);
  
  // TODO: Load would require deserialization logic
  // This would involve recreating entities from the saved data
  
  return savedData;
}

/**
 * Entity Factory - Helper functions to create common entity types
 * Makes it easy to create entities with the right component mix
 */

import { Entity } from './Entity.js';
import { 
  PositionComponent, 
  RenderComponent, 
  PhysicsComponent, 
  HealthComponent 
} from './components/CoreComponents.js';
import {
  InteractableComponent,
  DialogueComponent,
  AIComponent,
  InputComponent,
  ProjectileComponent,
  EnemyComponent,
  PlayerComponent
} from './components/GameplayComponents.js';

/**
 * Create a player entity
 * @param {Object} config
 * @param {number} config.x - Starting X position
 * @param {number} config.y - Starting Y position
 * @param {number} [config.maxHealth] - Max health
 * @returns {Entity} Player entity
 */
export function createPlayer({ x, y, maxHealth = 100 }) {
  const player = new Entity('Player');
  
  player
    .addComponent(new PositionComponent({ x, y }))
    .addComponent(new RenderComponent({
      width: 30,
      height: 30,
      color: '#4CAF50',
      shape: 'rect',
      layer: 10
    }))
    .addComponent(new PhysicsComponent({
      width: 30,
      height: 30,
      mass: 1,
      collisionLayers: ['player']
    }))
    .addComponent(new HealthComponent({
      maxHealth,
      regenRate: 0
    }))
    .addComponent(new PlayerComponent({
      coins: 0,
      score: 0,
      upgrades: {}
    }))
    .addComponent(new InputComponent({
      keyMap: {}
    }))
    .addTag('player');

  return player;
}

/**
 * Create an enemy entity
 * @param {Object} config
 * @param {number} config.x - Starting X position
 * @param {number} config.y - Starting Y position
 * @param {number} [config.tier] - Enemy tier (affects stats)
 * @param {number} [config.maxHealth] - Max health
 * @param {number} [config.damage] - Contact damage
 * @param {string} [config.color] - Visual color
 * @returns {Entity} Enemy entity
 */
export function createEnemy({ 
  x, 
  y, 
  tier = 1, 
  maxHealth = 50, 
  damage = 10,
  color = '#F44336'
}) {
  const enemy = new Entity(`Enemy_Tier${tier}`);
  
  enemy
    .addComponent(new PositionComponent({ x, y }))
    .addComponent(new RenderComponent({
      width: 40,
      height: 40,
      color,
      shape: 'rect',
      layer: 8
    }))
    .addComponent(new PhysicsComponent({
      width: 40,
      height: 40,
      mass: 1,
      collisionLayers: ['enemy']
    }))
    .addComponent(new HealthComponent({
      maxHealth,
      armor: tier * 2
    }))
    .addComponent(new EnemyComponent({
      tier,
      damage,
      scoreValue: tier * 10,
      coinValue: tier
    }))
    .addComponent(new AIComponent({
      behavior: 'idle',
      detectionRange: 200,
      attackRange: 50
    }))
    .addTag('enemy');

  return enemy;
}

/**
 * Create a projectile entity
 * @param {Object} config
 * @param {number} config.x - Starting X position
 * @param {number} config.y - Starting Y position
 * @param {number} config.vx - X velocity
 * @param {number} config.vy - Y velocity
 * @param {number} config.damage - Damage dealt
 * @param {Entity} config.owner - Entity that fired this
 * @param {number} [config.lifetime] - Max lifetime in seconds
 * @param {string[]} [config.targetTags] - Tags of entities to hit
 * @returns {Entity} Projectile entity
 */
export function createProjectile({ 
  x, 
  y, 
  vx, 
  vy, 
  damage, 
  owner,
  lifetime = 5,
  targetTags = ['enemy']
}) {
  const projectile = new Entity('Projectile');
  
  projectile
    .addComponent(new PositionComponent({ x, y, vx, vy }))
    .addComponent(new RenderComponent({
      width: 8,
      height: 8,
      color: '#FFEB3B',
      shape: 'circle',
      layer: 15
    }))
    .addComponent(new PhysicsComponent({
      width: 8,
      height: 8,
      mass: 0.1,
      isTrigger: true,
      collisionLayers: ['projectile']
    }))
    .addComponent(new ProjectileComponent({
      damage,
      owner,
      lifetime,
      piercing: 0,
      targetTags
    }))
    .addTag('projectile');

  return projectile;
}

/**
 * Create an NPC entity with dialogue
 * @param {Object} config
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {string} config.name - NPC name
 * @param {DialogueLine[]} config.dialogue - Dialogue lines
 * @param {string} [config.color] - Visual color
 * @returns {Entity} NPC entity
 */
export function createNPC({ 
  x, 
  y, 
  name, 
  dialogue = [],
  color = '#2196F3'
}) {
  const npc = new Entity(`NPC_${name}`);
  
  npc
    .addComponent(new PositionComponent({ x, y }))
    .addComponent(new RenderComponent({
      width: 30,
      height: 40,
      color,
      shape: 'rect',
      layer: 9
    }))
    .addComponent(new PhysicsComponent({
      width: 30,
      height: 40,
      isStatic: true,
      collisionLayers: ['npc']
    }))
    .addComponent(new InteractableComponent({
      range: 60,
      prompt: `Press E to talk to ${name}`,
      enabled: true
    }))
    .addComponent(new DialogueComponent({
      name,
      dialogue,
      repeatable: true
    }))
    .addTag('npc')
    .addTag('interactable');

  return npc;
}

/**
 * Create a collectible item entity
 * @param {Object} config
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {string} config.itemType - Type of item (coin, health, etc.)
 * @param {Function} config.onCollect - Callback when collected
 * @returns {Entity} Collectible entity
 */
export function createCollectible({ 
  x, 
  y, 
  itemType = 'coin',
  onCollect = null
}) {
  const collectible = new Entity(`Collectible_${itemType}`);
  
  const colors = {
    coin: '#FFD700',
    health: '#E91E63',
    powerup: '#9C27B0'
  };
  
  collectible
    .addComponent(new PositionComponent({ x, y }))
    .addComponent(new RenderComponent({
      width: 16,
      height: 16,
      color: colors[itemType] || '#FFFFFF',
      shape: 'circle',
      layer: 5
    }))
    .addComponent(new PhysicsComponent({
      width: 16,
      height: 16,
      isTrigger: true,
      collisionLayers: ['collectible']
    }))
    .addComponent(new InteractableComponent({
      range: 30,
      prompt: '',
      enabled: true,
      singleUse: true,
      onInteract: (item, player) => {
        if (onCollect) {
          onCollect(item, player);
        }
      }
    }))
    .addTag('collectible')
    .addTag(itemType);

  return collectible;
}

/**
 * Create a static platform/wall entity
 * @param {Object} config
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {number} config.width - Width
 * @param {number} config.height - Height
 * @param {string} [config.color] - Visual color
 * @returns {Entity} Platform entity
 */
export function createPlatform({ 
  x, 
  y, 
  width, 
  height,
  color = '#795548'
}) {
  const platform = new Entity('Platform');
  
  platform
    .addComponent(new PositionComponent({ x, y }))
    .addComponent(new RenderComponent({
      width,
      height,
      color,
      shape: 'rect',
      layer: 1
    }))
    .addComponent(new PhysicsComponent({
      width,
      height,
      isStatic: true,
      collisionLayers: ['terrain']
    }))
    .addTag('platform')
    .addTag('terrain');

  return platform;
}

/**
 * Create example dialogue for NPCs
 * @param {string} npcName - NPC name
 * @returns {DialogueLine[]} Array of dialogue lines
 */
export function createExampleDialogue(npcName) {
  return [
    {
      speaker: npcName,
      text: `Hello traveler! I'm ${npcName}.`,
      emotion: 'happy'
    },
    {
      speaker: npcName,
      text: 'This world is dangerous. Be careful out there!',
      emotion: 'concerned'
    },
    {
      speaker: npcName,
      text: 'Come back anytime you need to talk.',
      emotion: 'happy'
    }
  ];
}

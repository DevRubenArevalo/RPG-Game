/**
 * ECS Module - Barrel export
 * Import everything ECS-related from this single file
 */

// Core ECS classes
export { Entity } from './Entity.js';
export { Component } from './Component.js';
export { System } from './System.js';
export { EntityManager } from './EntityManager.js';

// Core components
export {
  PositionComponent,
  RenderComponent,
  PhysicsComponent,
  HealthComponent
} from './components/CoreComponents.js';

// Gameplay components
export {
  InteractableComponent,
  DialogueComponent,
  AIComponent,
  InputComponent,
  ProjectileComponent,
  EnemyComponent,
  PlayerComponent
} from './components/GameplayComponents.js';

// Core systems
export {
  PhysicsSystem,
  RenderSystem,
  CollisionSystem,
  InputSystem
} from './systems/CoreSystems.js';

// Gameplay systems
export {
  InteractionSystem,
  DialogueSystem,
  AISystem,
  ProjectileSystem,
  HealthSystem
} from './systems/GameplaySystems.js';

// Entity factory
export {
  createPlayer,
  createEnemy,
  createProjectile,
  createNPC,
  createCollectible,
  createPlatform,
  createExampleDialogue
} from './EntityFactory.js';

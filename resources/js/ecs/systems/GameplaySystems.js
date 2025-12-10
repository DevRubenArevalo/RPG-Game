import { System } from '../System.js';

/**
 * InteractionSystem - Handles entity interactions
 * Processes Interactable components and player input
 */
export class InteractionSystem extends System {
  /**
   * @param {Object} config
   * @param {EntityManager} config.entityManager
   * @param {EventBus} [config.eventBus]
   */
  constructor({ entityManager, eventBus = null }) {
    super({
      requiredComponents: ['Position', 'Interactable'],
      entityManager,
      eventBus,
      priority: 15
    });
  }

  process(entities, deltaTime) {
    // Find player
    const players = this.entityManager.getEntitiesWithTag('player');
    if (players.length === 0) return;
    
    const player = players[0];
    const playerPos = player.getComponent('Position');
    const playerInput = player.getComponent('Input');

    // Check each interactable
    for (const entity of entities) {
      const pos = entity.getComponent('Position');
      const interactable = entity.getComponent('Interactable');

      if (!interactable.enabled) {
        interactable.inRange = false;
        continue;
      }

      // Calculate distance to player
      const dx = (pos.x + entity.getComponent('Physics')?.width / 2 || 0) - 
                 (playerPos.x + player.getComponent('Physics')?.width / 2 || 0);
      const dy = (pos.y + entity.getComponent('Physics')?.height / 2 || 0) - 
                 (playerPos.y + player.getComponent('Physics')?.height / 2 || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Update inRange state
      interactable.inRange = distance <= interactable.range;

      // Handle interaction
      if (interactable.inRange && playerInput?.interact) {
        const success = interactable.interact(player);
        
        if (success && this.eventBus) {
          this.eventBus.emit('entity:interacted', {
            interactor: player,
            target: entity
          });
        }
      }
    }
  }
}

/**
 * DialogueSystem - Handles NPC dialogue
 * Works with InteractionSystem to start/advance dialogue
 */
export class DialogueSystem extends System {
  /**
   * @param {Object} config
   * @param {EntityManager} config.entityManager
   * @param {EventBus} [config.eventBus]
   * @param {Object} [config.uiManager] - For displaying dialogue
   */
  constructor({ entityManager, eventBus = null, uiManager = null }) {
    super({
      requiredComponents: ['Dialogue'],
      entityManager,
      eventBus,
      priority: 25
    });
    this.uiManager = uiManager;
    this.activeDialogue = null; // Currently active dialogue entity
  }

  init() {
    // Listen for interaction events
    if (this.eventBus) {
      this.eventBus.on('entity:interacted', ({ target }) => {
        const dialogue = target.getComponent('Dialogue');
        if (dialogue) {
          this.startDialogue(target);
        }
      });
    }
  }

  process(entities, deltaTime) {
    // Update active dialogue if any
    if (this.activeDialogue) {
      const dialogue = this.activeDialogue.getComponent('Dialogue');
      
      if (!dialogue || !dialogue.active) {
        this.activeDialogue = null;
        return;
      }

      // Check for input to advance (simplified - you'd use InputManager)
      // For now, dialogue advances via API calls
    }
  }

  /**
   * Start dialogue with an entity
   * @param {Entity} entity - Entity with Dialogue component
   */
  startDialogue(entity) {
    const dialogue = entity.getComponent('Dialogue');
    if (!dialogue) return false;

    if (dialogue.start()) {
      this.activeDialogue = entity;
      
      // Get first line
      const line = dialogue.next();
      
      if (this.eventBus) {
        this.eventBus.emit('dialogue:started', {
          entity,
          speaker: dialogue.name,
          line
        });
      }

      // Show in UI if available
      if (this.uiManager && line) {
        this.uiManager.showDialogue(dialogue.name, line.text);
      }

      return true;
    }

    return false;
  }

  /**
   * Advance to next dialogue line
   */
  advanceDialogue() {
    if (!this.activeDialogue) return null;

    const dialogue = this.activeDialogue.getComponent('Dialogue');
    if (!dialogue) {
      this.activeDialogue = null;
      return null;
    }

    const line = dialogue.next();

    if (line) {
      if (this.eventBus) {
        this.eventBus.emit('dialogue:advanced', {
          entity: this.activeDialogue,
          speaker: dialogue.name,
          line
        });
      }

      if (this.uiManager) {
        this.uiManager.showDialogue(dialogue.name, line.text);
      }
    } else {
      // Dialogue complete
      this.endDialogue();
    }

    return line;
  }

  /**
   * End current dialogue
   */
  endDialogue() {
    if (!this.activeDialogue) return;

    const dialogue = this.activeDialogue.getComponent('Dialogue');
    if (dialogue) {
      dialogue.end();
    }

    if (this.eventBus) {
      this.eventBus.emit('dialogue:ended', {
        entity: this.activeDialogue
      });
    }

    if (this.uiManager) {
      this.uiManager.hideDialogue();
    }

    this.activeDialogue = null;
  }
}

/**
 * AISystem - Basic AI behavior
 * Requires: Position, AI components
 */
export class AISystem extends System {
  /**
   * @param {Object} config
   * @param {EntityManager} config.entityManager
   * @param {EventBus} [config.eventBus]
   */
  constructor({ entityManager, eventBus = null }) {
    super({
      requiredComponents: ['Position', 'AI'],
      entityManager,
      eventBus,
      priority: 12
    });
  }

  process(entities, deltaTime) {
    // Find player for AI targeting
    const players = this.entityManager.getEntitiesWithTag('player');
    if (players.length === 0) return;
    
    const player = players[0];
    const playerPos = player.getComponent('Position');

    for (const entity of entities) {
      const pos = entity.getComponent('Position');
      const ai = entity.getComponent('AI');

      // Calculate distance to player
      const dx = playerPos.x - pos.x;
      const dy = playerPos.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Update AI behavior based on distance
      if (distance <= ai.detectionRange) {
        ai.target = player;
        ai.lastSeenPosition = { x: playerPos.x, y: playerPos.y };

        // Simple behavior switching
        if (distance <= ai.attackRange) {
          this.handleAttackBehavior(entity, player, deltaTime);
        } else {
          this.handleChaseBehavior(entity, player, deltaTime);
        }
      } else {
        ai.target = null;
        this.handleIdleBehavior(entity, deltaTime);
      }
    }
  }

  /**
   * Handle idle behavior
   * @param {Entity} entity
   * @param {number} deltaTime
   */
  handleIdleBehavior(entity, deltaTime) {
    const ai = entity.getComponent('AI');
    ai.behavior = 'idle';
    
    // Optional: Add idle wandering, patrolling, etc.
  }

  /**
   * Handle chase behavior
   * @param {Entity} entity
   * @param {Entity} target
   * @param {number} deltaTime
   */
  handleChaseBehavior(entity, target, deltaTime) {
    const ai = entity.getComponent('AI');
    const pos = entity.getComponent('Position');
    const targetPos = target.getComponent('Position');

    ai.behavior = 'chase';

    // Simple movement towards target
    const dx = targetPos.x - pos.x;
    const dy = targetPos.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const speed = 100; // pixels per second
      pos.vx = (dx / distance) * speed;
      // Don't modify vy for platformer-style movement
    }
  }

  /**
   * Handle attack behavior
   * @param {Entity} entity
   * @param {Entity} target
   * @param {number} deltaTime
   */
  handleAttackBehavior(entity, target, deltaTime) {
    const ai = entity.getComponent('AI');
    ai.behavior = 'attack';

    // Emit attack event for other systems to handle
    if (this.eventBus) {
      this.eventBus.emit('ai:attack', {
        attacker: entity,
        target: target
      });
    }
  }
}

/**
 * ProjectileSystem - Handles projectile lifecycle
 * Requires: Position, Projectile components
 */
export class ProjectileSystem extends System {
  /**
   * @param {Object} config
   * @param {EntityManager} config.entityManager
   * @param {EventBus} [config.eventBus]
   */
  constructor({ entityManager, eventBus = null }) {
    super({
      requiredComponents: ['Position', 'Projectile'],
      entityManager,
      eventBus,
      priority: 18
    });
  }

  init() {
    // Listen for collision events
    if (this.eventBus) {
      this.eventBus.on('collision', ({ entityA, entityB }) => {
        this.handleProjectileCollision(entityA, entityB);
      });
    }
  }

  process(entities, deltaTime) {
    for (const entity of entities) {
      const projectile = entity.getComponent('Projectile');

      // Update age
      projectile.age += deltaTime;

      // Destroy if expired
      if (projectile.age >= projectile.lifetime) {
        this.entityManager.destroyEntity(entity);
        
        if (this.eventBus) {
          this.eventBus.emit('projectile:expired', { projectile: entity });
        }
      }
    }
  }

  /**
   * Handle projectile collision
   * @param {Entity} entityA
   * @param {Entity} entityB
   */
  handleProjectileCollision(entityA, entityB) {
    let projectile = null;
    let target = null;

    if (entityA.hasComponent('Projectile')) {
      projectile = entityA;
      target = entityB;
    } else if (entityB.hasComponent('Projectile')) {
      projectile = entityB;
      target = entityA;
    } else {
      return; // Neither is a projectile
    }

    const projectileComp = projectile.getComponent('Projectile');
    
    // Check if can hit target
    if (!projectileComp.canHit(target)) return;

    // Apply damage if target has health
    const health = target.getComponent('Health');
    if (health) {
      const actualDamage = health.takeDamage(projectileComp.damage);
      
      if (this.eventBus) {
        this.eventBus.emit('projectile:hit', {
          projectile,
          target,
          damage: actualDamage
        });
      }
    }

    // Mark as hit
    projectileComp.markHit(target);

    // Destroy if no piercing left
    const hitCount = projectileComp.hitEntities.size;
    if (hitCount > projectileComp.piercing) {
      this.entityManager.destroyEntity(projectile);
    }
  }
}

/**
 * HealthSystem - Handles health regeneration and death
 * Requires: Health component
 */
export class HealthSystem extends System {
  /**
   * @param {Object} config
   * @param {EntityManager} config.entityManager
   * @param {EventBus} [config.eventBus]
   */
  constructor({ entityManager, eventBus = null }) {
    super({
      requiredComponents: ['Health'],
      entityManager,
      eventBus,
      priority: 22
    });
  }

  process(entities, deltaTime) {
    for (const entity of entities) {
      const health = entity.getComponent('Health');

      // Apply regeneration
      if (health.regenRate > 0 && health.currentHealth < health.maxHealth) {
        health.heal(health.regenRate * deltaTime);
      }

      // Check for death
      if (health.isDead() && entity.active) {
        entity.deactivate();
        
        if (this.eventBus) {
          this.eventBus.emit('entity:died', { entity });
        }

        // Mark for destruction (systems can listen to died event first)
        this.entityManager.destroyEntity(entity);
      }
    }
  }
}

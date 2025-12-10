import { System } from '../System.js';

/**
 * PhysicsSystem - Handles physics simulation and movement
 * Requires: Position, Physics components
 */
export class PhysicsSystem extends System {
  /**
   * @param {Object} config
   * @param {EntityManager} config.entityManager
   * @param {EventBus} [config.eventBus]
   * @param {number} [config.gravity] - Gravity acceleration (pixels/sec²)
   */
  constructor({ entityManager, eventBus = null, gravity = 980 }) {
    super({
      requiredComponents: ['Position', 'Physics'],
      entityManager,
      eventBus,
      priority: 10 // Run early
    });
    this.gravity = gravity;
  }

  process(entities, deltaTime) {
    for (const entity of entities) {
      const pos = entity.getComponent('Position');
      const physics = entity.getComponent('Physics');

      // Skip static objects
      if (physics.isStatic) continue;

      // Store previous position
      pos.updatePrevious();

      // Apply gravity if not grounded
      if (!physics.grounded) {
        pos.vy += this.gravity * deltaTime;
      }

      // Apply acceleration
      pos.vx += pos.ax * deltaTime;
      pos.vy += pos.ay * deltaTime;

      // Apply friction
      if (physics.grounded) {
        pos.vx *= Math.pow(physics.friction, deltaTime * 60);
      }

      // Update position
      pos.x += pos.vx * deltaTime;
      pos.y += pos.vy * deltaTime;

      // Reset acceleration
      pos.ax = 0;
      pos.ay = 0;
    }
  }
}

/**
 * RenderSystem - Handles rendering entities
 * Requires: Position, Render components
 */
export class RenderSystem extends System {
  /**
   * @param {Object} config
   * @param {EntityManager} config.entityManager
   * @param {CanvasRenderingContext2D} config.ctx - Canvas context
   * @param {Object} [config.camera] - Camera object with x, y properties
   */
  constructor({ entityManager, ctx, camera = { x: 0, y: 0 } }) {
    super({
      requiredComponents: ['Position', 'Render'],
      entityManager,
      priority: 100 // Run late (after all logic)
    });
    this.ctx = ctx;
    this.camera = camera;
  }

  process(entities, deltaTime) {
    // Sort by layer
    const sorted = entities.slice().sort((a, b) => {
      const renderA = a.getComponent('Render');
      const renderB = b.getComponent('Render');
      return renderA.layer - renderB.layer;
    });

    for (const entity of sorted) {
      const pos = entity.getComponent('Position');
      const render = entity.getComponent('Render');

      if (!render.visible) continue;

      // Calculate screen position
      const screenX = pos.x - this.camera.x;
      const screenY = pos.y - this.camera.y;

      this.ctx.save();
      this.ctx.globalAlpha = render.alpha;
      this.ctx.translate(screenX, screenY);
      
      if (render.rotation !== 0) {
        this.ctx.rotate(render.rotation);
      }
      
      this.ctx.scale(render.scaleX, render.scaleY);

      // Render based on shape type
      if (render.shape === 'rect') {
        this.ctx.fillStyle = render.color;
        this.ctx.fillRect(0, 0, render.width, render.height);
      } else if (render.shape === 'circle') {
        this.ctx.fillStyle = render.color;
        this.ctx.beginPath();
        this.ctx.arc(
          render.width / 2, 
          render.height / 2, 
          render.width / 2, 
          0, 
          Math.PI * 2
        );
        this.ctx.fill();
      }
      // Add sprite rendering later

      this.ctx.restore();
    }
  }
}

/**
 * CollisionSystem - Handles collision detection and response
 * Requires: Position, Physics components
 */
export class CollisionSystem extends System {
  /**
   * @param {Object} config
   * @param {EntityManager} config.entityManager
   * @param {EventBus} [config.eventBus]
   */
  constructor({ entityManager, eventBus = null }) {
    super({
      requiredComponents: ['Position', 'Physics'],
      entityManager,
      eventBus,
      priority: 20 // After physics, before rendering
    });
  }

  process(entities, deltaTime) {
    // Check all pairs
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        this.checkCollision(entities[i], entities[j]);
      }
    }
  }

  /**
   * Check collision between two entities
   * @param {Entity} entityA
   * @param {Entity} entityB
   */
  checkCollision(entityA, entityB) {
    const posA = entityA.getComponent('Position');
    const physicsA = entityA.getComponent('Physics');
    const posB = entityB.getComponent('Position');
    const physicsB = entityB.getComponent('Physics');

    // AABB collision detection
    if (this.aabbOverlap(
      posA.x, posA.y, physicsA.width, physicsA.height,
      posB.x, posB.y, physicsB.width, physicsB.height
    )) {
      // Emit collision event
      if (this.eventBus) {
        this.eventBus.emit('collision', { 
          entityA, 
          entityB,
          isTrigger: physicsA.isTrigger || physicsB.isTrigger
        });
      }

      // Apply collision response if not trigger
      if (!physicsA.isTrigger && !physicsB.isTrigger) {
        this.resolveCollision(entityA, entityB);
      }
    }
  }

  /**
   * AABB overlap test
   */
  aabbOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 &&
           x1 + w1 > x2 &&
           y1 < y2 + h2 &&
           y1 + h1 > y2;
  }

  /**
   * Resolve collision between two entities
   * @param {Entity} entityA
   * @param {Entity} entityB
   */
  resolveCollision(entityA, entityB) {
    const posA = entityA.getComponent('Position');
    const physicsA = entityA.getComponent('Physics');
    const posB = entityB.getComponent('Position');
    const physicsB = entityB.getComponent('Physics');

    // Don't resolve if both static
    if (physicsA.isStatic && physicsB.isStatic) return;

    // Calculate overlap
    const overlapX = Math.min(
      posA.x + physicsA.width - posB.x,
      posB.x + physicsB.width - posA.x
    );
    const overlapY = Math.min(
      posA.y + physicsA.height - posB.y,
      posB.y + physicsB.height - posA.y
    );

    // Separate on smallest overlap axis
    if (overlapX < overlapY) {
      // Separate horizontally
      const direction = posA.x < posB.x ? -1 : 1;
      if (!physicsA.isStatic) {
        posA.x += direction * overlapX / 2;
        posA.vx = 0;
      }
      if (!physicsB.isStatic) {
        posB.x -= direction * overlapX / 2;
        posB.vx = 0;
      }
    } else {
      // Separate vertically
      const direction = posA.y < posB.y ? -1 : 1;
      if (!physicsA.isStatic) {
        posA.y += direction * overlapY / 2;
        if (direction < 0) {
          posA.vy = 0;
          physicsA.grounded = true;
        }
      }
      if (!physicsB.isStatic) {
        posB.y -= direction * overlapY / 2;
        if (direction > 0) {
          posB.vy = 0;
          physicsB.grounded = true;
        }
      }
    }
  }
}

/**
 * InputSystem - Handles player input
 * Requires: Input component
 */
export class InputSystem extends System {
  /**
   * @param {Object} config
   * @param {EntityManager} config.entityManager
   * @param {Object} config.inputManager - Reference to InputManager
   */
  constructor({ entityManager, inputManager }) {
    super({
      requiredComponents: ['Input'],
      entityManager,
      priority: 5 // Very early
    });
    this.inputManager = inputManager;
  }

  process(entities, deltaTime) {
    for (const entity of entities) {
      const input = entity.getComponent('Input');

      // Update input state from InputManager
      input.moveLeft = this.inputManager.keys.a || this.inputManager.keys.ArrowLeft;
      input.moveRight = this.inputManager.keys.d || this.inputManager.keys.ArrowRight;
      input.jump = this.inputManager.keys.w || this.inputManager.keys[' '] || this.inputManager.keys.ArrowUp;
      input.shoot = this.inputManager.keys.j || this.inputManager.keys.x;
      input.interact = this.inputManager.keys.e;
      input.dash = this.inputManager.keys.Shift;
    }
  }
}

import { Component } from '../Component.js';

/**
 * PositionComponent - Stores 2D position, velocity, and acceleration
 */
export class PositionComponent extends Component {
  /**
   * @param {Object} config
   * @param {number} config.x - X position
   * @param {number} config.y - Y position
   * @param {number} [config.vx] - X velocity
   * @param {number} [config.vy] - Y velocity
   * @param {number} [config.ax] - X acceleration
   * @param {number} [config.ay] - Y acceleration
   */
  constructor({ x = 0, y = 0, vx = 0, vy = 0, ax = 0, ay = 0 }) {
    super('Position');
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.ax = ax;
    this.ay = ay;
    
    // Previous position for interpolation/collision
    this.prevX = x;
    this.prevY = y;
  }

  /**
   * Update previous position (call before moving)
   */
  updatePrevious() {
    this.prevX = this.x;
    this.prevY = this.y;
  }

  serialize() {
    return {
      ...super.serialize(),
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      ax: this.ax,
      ay: this.ay
    };
  }
}

/**
 * RenderComponent - Visual appearance data
 */
export class RenderComponent extends Component {
  /**
   * @param {Object} config
   * @param {number} config.width - Render width
   * @param {number} config.height - Render height
   * @param {string} [config.color] - Fill color
   * @param {string} [config.shape] - Shape type: 'rect', 'circle', 'sprite'
   * @param {number} [config.layer] - Render layer (higher = drawn on top)
   * @param {boolean} [config.visible] - Visibility flag
   * @param {number} [config.alpha] - Opacity (0-1)
   */
  constructor({ 
    width, 
    height, 
    color = '#ffffff', 
    shape = 'rect',
    layer = 0,
    visible = true,
    alpha = 1
  }) {
    super('Render');
    this.width = width;
    this.height = height;
    this.color = color;
    this.shape = shape;
    this.layer = layer;
    this.visible = visible;
    this.alpha = alpha;
    
    // Additional render properties
    this.sprite = null; // For sprite-based rendering
    this.animation = null; // Animation state
    this.rotation = 0; // Rotation in radians
    this.scaleX = 1;
    this.scaleY = 1;
  }

  serialize() {
    return {
      ...super.serialize(),
      width: this.width,
      height: this.height,
      color: this.color,
      shape: this.shape,
      layer: this.layer,
      visible: this.visible,
      alpha: this.alpha,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY
    };
  }
}

/**
 * PhysicsComponent - Physics properties and collision box
 */
export class PhysicsComponent extends Component {
  /**
   * @param {Object} config
   * @param {number} config.width - Collision box width
   * @param {number} config.height - Collision box height
   * @param {number} [config.mass] - Mass (affects physics)
   * @param {number} [config.friction] - Friction coefficient
   * @param {number} [config.restitution] - Bounciness (0-1)
   * @param {boolean} [config.isStatic] - Static objects don't move
   * @param {boolean} [config.isTrigger] - Triggers don't cause collision response
   * @param {string[]} [config.collisionLayers] - Layers this object collides with
   */
  constructor({ 
    width, 
    height, 
    mass = 1, 
    friction = 0.8,
    restitution = 0,
    isStatic = false,
    isTrigger = false,
    collisionLayers = ['default']
  }) {
    super('Physics');
    this.width = width;
    this.height = height;
    this.mass = mass;
    this.friction = friction;
    this.restitution = restitution;
    this.isStatic = isStatic;
    this.isTrigger = isTrigger;
    this.collisionLayers = collisionLayers;
    
    // Collision state
    this.grounded = false;
    this.onWall = false;
    this.onCeiling = false;
  }

  serialize() {
    return {
      ...super.serialize(),
      width: this.width,
      height: this.height,
      mass: this.mass,
      friction: this.friction,
      restitution: this.restitution,
      isStatic: this.isStatic,
      isTrigger: this.isTrigger,
      collisionLayers: this.collisionLayers
    };
  }
}

/**
 * HealthComponent - Health and damage tracking
 */
export class HealthComponent extends Component {
  /**
   * @param {Object} config
   * @param {number} config.maxHealth - Maximum health
   * @param {number} [config.currentHealth] - Current health (defaults to max)
   * @param {number} [config.armor] - Damage reduction
   * @param {boolean} [config.invulnerable] - Cannot take damage
   * @param {number} [config.regenRate] - HP regeneration per second
   */
  constructor({ 
    maxHealth, 
    currentHealth = null,
    armor = 0,
    invulnerable = false,
    regenRate = 0
  }) {
    super('Health');
    this.maxHealth = maxHealth;
    this.currentHealth = currentHealth ?? maxHealth;
    this.armor = armor;
    this.invulnerable = invulnerable;
    this.regenRate = regenRate;
    
    // Damage tracking
    this.lastDamageTime = 0;
    this.lastDamageAmount = 0;
  }

  /**
   * Take damage
   * @param {number} amount - Raw damage amount
   * @param {number} [currentTime] - Current game time
   * @returns {number} Actual damage dealt
   */
  takeDamage(amount, currentTime = 0) {
    if (this.invulnerable || this.currentHealth <= 0) {
      return 0;
    }

    const actualDamage = Math.max(0, amount - this.armor);
    this.currentHealth = Math.max(0, this.currentHealth - actualDamage);
    this.lastDamageTime = currentTime;
    this.lastDamageAmount = actualDamage;

    return actualDamage;
  }

  /**
   * Heal
   * @param {number} amount - Heal amount
   * @returns {number} Actual amount healed
   */
  heal(amount) {
    const before = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    return this.currentHealth - before;
  }

  /**
   * Check if dead
   * @returns {boolean} true if health <= 0
   */
  isDead() {
    return this.currentHealth <= 0;
  }

  /**
   * Get health percentage
   * @returns {number} 0-1 percentage
   */
  getHealthPercent() {
    return this.currentHealth / this.maxHealth;
  }

  serialize() {
    return {
      ...super.serialize(),
      maxHealth: this.maxHealth,
      currentHealth: this.currentHealth,
      armor: this.armor,
      invulnerable: this.invulnerable,
      regenRate: this.regenRate
    };
  }
}

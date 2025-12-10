import { Component } from '../Component.js';

/**
 * InteractableComponent - Makes entity interactable by player
 */
export class InteractableComponent extends Component {
  /**
   * @param {Object} config
   * @param {number} [config.range] - Interaction range in pixels
   * @param {string} [config.prompt] - Display prompt (e.g., "Press E to talk")
   * @param {boolean} [config.enabled] - Can be interacted with
   * @param {Function} [config.onInteract] - Callback when interacted
   * @param {boolean} [config.singleUse] - Can only be used once
   */
  constructor({ 
    range = 50, 
    prompt = 'Press E to interact',
    enabled = true,
    onInteract = null,
    singleUse = false
  }) {
    super('Interactable');
    this.range = range;
    this.prompt = prompt;
    this.enabled = enabled;
    this.onInteract = onInteract;
    this.singleUse = singleUse;
    this.used = false;
    this.inRange = false; // Set by InteractionSystem
  }

  /**
   * Trigger interaction
   * @param {Entity} interactor - Entity doing the interaction (usually player)
   */
  interact(interactor) {
    if (!this.enabled || (this.singleUse && this.used)) {
      return false;
    }

    if (this.onInteract) {
      this.onInteract(this.entity, interactor);
    }

    if (this.singleUse) {
      this.used = true;
      this.enabled = false;
    }

    return true;
  }

  serialize() {
    return {
      ...super.serialize(),
      range: this.range,
      prompt: this.prompt,
      enabled: this.enabled,
      singleUse: this.singleUse,
      used: this.used
    };
  }
}

/**
 * DialogueComponent - NPC dialogue system
 */
export class DialogueComponent extends Component {
  /**
   * @param {Object} config
   * @param {string} config.name - NPC name
   * @param {DialogueLine[]} config.dialogue - Array of dialogue lines
   * @param {number} [config.currentLine] - Current line index
   * @param {boolean} [config.repeatable] - Can dialogue be repeated
   */
  constructor({ 
    name, 
    dialogue = [],
    currentLine = 0,
    repeatable = true
  }) {
    super('Dialogue');
    this.name = name;
    this.dialogue = dialogue;
    this.currentLine = currentLine;
    this.repeatable = repeatable;
    this.completed = false;
    this.active = false; // Currently in dialogue
  }

  /**
   * Start dialogue
   */
  start() {
    if (this.completed && !this.repeatable) {
      return false;
    }
    
    this.active = true;
    if (this.completed) {
      this.currentLine = 0;
    }
    return true;
  }

  /**
   * Advance to next line
   * @returns {DialogueLine|null} Next line or null if done
   */
  next() {
    if (this.currentLine >= this.dialogue.length) {
      this.end();
      return null;
    }

    const line = this.dialogue[this.currentLine];
    this.currentLine++;
    return line;
  }

  /**
   * Get current line without advancing
   * @returns {DialogueLine|null}
   */
  getCurrentLine() {
    if (this.currentLine >= this.dialogue.length) {
      return null;
    }
    return this.dialogue[this.currentLine];
  }

  /**
   * End dialogue
   */
  end() {
    this.active = false;
    if (this.currentLine >= this.dialogue.length) {
      this.completed = true;
    }
  }

  /**
   * Reset dialogue to beginning
   */
  reset() {
    this.currentLine = 0;
    this.completed = false;
    this.active = false;
  }

  serialize() {
    return {
      ...super.serialize(),
      name: this.name,
      dialogue: this.dialogue,
      currentLine: this.currentLine,
      repeatable: this.repeatable,
      completed: this.completed
    };
  }
}

/**
 * @typedef {Object} DialogueLine
 * @property {string} speaker - Who is speaking
 * @property {string} text - Dialogue text
 * @property {string} [emotion] - Emotion/expression
 * @property {DialogueChoice[]} [choices] - Player dialogue choices
 */

/**
 * @typedef {Object} DialogueChoice
 * @property {string} text - Choice text
 * @property {number} nextLine - Index of next dialogue line
 * @property {Function} [action] - Optional action to perform
 */

/**
 * AIComponent - Basic AI behavior
 */
export class AIComponent extends Component {
  /**
   * @param {Object} config
   * @param {string} [config.behavior] - AI behavior type
   * @param {number} [config.detectionRange] - Range to detect player
   * @param {number} [config.attackRange] - Range to attack
   * @param {Object} [config.state] - Current AI state data
   */
  constructor({ 
    behavior = 'idle',
    detectionRange = 200,
    attackRange = 50,
    state = {}
  }) {
    super('AI');
    this.behavior = behavior;
    this.detectionRange = detectionRange;
    this.attackRange = attackRange;
    this.state = state;
    
    // AI state tracking
    this.target = null; // Current target entity
    this.lastSeenPosition = null;
    this.pathfinding = null; // Pathfinding data
  }

  serialize() {
    return {
      ...super.serialize(),
      behavior: this.behavior,
      detectionRange: this.detectionRange,
      attackRange: this.attackRange,
      state: this.state
    };
  }
}

/**
 * InputComponent - Player input handling
 */
export class InputComponent extends Component {
  /**
   * @param {Object} config
   * @param {Object} [config.keyMap] - Key mappings
   */
  constructor({ keyMap = {} }) {
    super('Input');
    this.keyMap = keyMap;
    
    // Current input state
    this.moveLeft = false;
    this.moveRight = false;
    this.jump = false;
    this.shoot = false;
    this.interact = false;
    this.dash = false;
    
    // Input tracking
    this.lastJumpTime = 0;
    this.lastShootTime = 0;
    this.lastDashTime = 0;
  }

  serialize() {
    return {
      ...super.serialize(),
      keyMap: this.keyMap
    };
  }
}

/**
 * ProjectileComponent - Projectile-specific data
 */
export class ProjectileComponent extends Component {
  /**
   * @param {Object} config
   * @param {number} config.damage - Damage dealt
   * @param {Entity} config.owner - Entity that fired this projectile
   * @param {number} [config.lifetime] - Max lifetime in seconds
   * @param {number} [config.piercing] - Number of enemies it can pierce
   * @param {string[]} [config.targetTags] - Tags of entities this can hit
   */
  constructor({ 
    damage, 
    owner,
    lifetime = 5,
    piercing = 0,
    targetTags = ['enemy']
  }) {
    super('Projectile');
    this.damage = damage;
    this.owner = owner;
    this.lifetime = lifetime;
    this.piercing = piercing;
    this.targetTags = targetTags;
    
    // Runtime state
    this.age = 0;
    this.hitEntities = new Set(); // Entities already hit
  }

  /**
   * Check if can hit entity
   * @param {Entity} entity
   * @returns {boolean}
   */
  canHit(entity) {
    if (entity === this.owner) return false;
    if (this.hitEntities.has(entity.id)) return false;
    
    return this.targetTags.some(tag => entity.hasTag(tag));
  }

  /**
   * Mark entity as hit
   * @param {Entity} entity
   */
  markHit(entity) {
    this.hitEntities.add(entity.id);
  }

  serialize() {
    return {
      ...super.serialize(),
      damage: this.damage,
      lifetime: this.lifetime,
      piercing: this.piercing,
      targetTags: this.targetTags,
      age: this.age
    };
  }
}

/**
 * EnemyComponent - Enemy-specific data
 */
export class EnemyComponent extends Component {
  /**
   * @param {Object} config
   * @param {number} config.tier - Enemy tier/difficulty
   * @param {number} config.damage - Contact damage
   * @param {number} [config.scoreValue] - Points awarded on death
   * @param {number} [config.coinValue] - Coins dropped on death
   */
  constructor({ 
    tier, 
    damage,
    scoreValue = 10,
    coinValue = 1
  }) {
    super('Enemy');
    this.tier = tier;
    this.damage = damage;
    this.scoreValue = scoreValue;
    this.coinValue = coinValue;
  }

  serialize() {
    return {
      ...super.serialize(),
      tier: this.tier,
      damage: this.damage,
      scoreValue: this.scoreValue,
      coinValue: this.coinValue
    };
  }
}

/**
 * PlayerComponent - Player-specific data
 */
export class PlayerComponent extends Component {
  /**
   * @param {Object} config
   * @param {number} [config.coins] - Coins collected
   * @param {number} [config.score] - Current score
   * @param {Object} [config.upgrades] - Applied upgrades
   */
  constructor({ 
    coins = 0,
    score = 0,
    upgrades = {}
  }) {
    super('Player');
    this.coins = coins;
    this.score = score;
    this.upgrades = upgrades;
  }

  serialize() {
    return {
      ...super.serialize(),
      coins: this.coins,
      score: this.score,
      upgrades: this.upgrades
    };
  }
}

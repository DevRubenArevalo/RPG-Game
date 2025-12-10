/**
 * System - Base class for all ECS systems
 * Systems contain all the logic and operate on entities with specific components.
 * Each system runs once per frame and processes entities that match its requirements.
 */
export class System {
  /**
   * @param {Object} config - System configuration
   * @param {string[]} config.requiredComponents - Component types this system needs
   * @param {EntityManager} config.entityManager - Reference to entity manager
   * @param {EventBus} [config.eventBus] - Optional event bus for communication
   * @param {number} [config.priority] - Execution priority (lower = earlier)
   */
  constructor({ requiredComponents = [], entityManager, eventBus = null, priority = 0 }) {
    this.requiredComponents = requiredComponents;
    this.entityManager = entityManager;
    this.eventBus = eventBus;
    this.priority = priority;
    this.enabled = true;
  }

  /**
   * Called once when system is added to the world
   */
  init() {
    // Override in subclasses if needed
  }

  /**
   * Main update loop - called every frame
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    if (!this.enabled) return;

    const entities = this.entityManager.getEntitiesWithComponents(...this.requiredComponents);
    this.process(entities, deltaTime);
  }

  /**
   * Process entities - override this in subclasses
   * @param {Entity[]} entities - Entities that match required components
   * @param {number} deltaTime - Time since last frame in seconds
   */
  process(entities, deltaTime) {
    // Override in subclasses
    throw new Error('System.process() must be implemented in subclass');
  }

  /**
   * Called once when system is removed or game ends
   */
  cleanup() {
    // Override in subclasses if needed
  }

  /**
   * Enable this system
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable this system (won't process entities)
   */
  disable() {
    this.enabled = false;
  }
}

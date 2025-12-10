import { eventBus } from '../core/EventBus.js';

/**
 * EntityManager - Central hub for managing all entities
 * Handles entity creation, destruction, and queries.
 */
export class EntityManager {
  constructor() {
    this.entities = new Map(); // entityId -> Entity
    this.entitiesToDestroy = new Set(); // Entities marked for destruction
    this.systems = []; // All systems sorted by priority
  }

  /**
   * Add an entity to the manager
   * @param {Entity} entity - Entity to add
   * @returns {Entity} The added entity
   */
  addEntity(entity) {
    this.entities.set(entity.id, entity);
    eventBus.emit('entity:created', { entity });
    return entity;
  }

  /**
   * Remove an entity immediately
   * @param {number|Entity} entityOrId - Entity or entity ID to remove
   */
  removeEntity(entityOrId) {
    const id = typeof entityOrId === 'number' ? entityOrId : entityOrId.id;
    const entity = this.entities.get(id);
    
    if (entity) {
      // Detach all components
      entity.getAllComponents().forEach(component => component.onDetach());
      
      this.entities.delete(id);
      eventBus.emit('entity:destroyed', { entity });
    }
  }

  /**
   * Mark entity for destruction at end of frame
   * @param {number|Entity} entityOrId - Entity or entity ID to destroy
   */
  destroyEntity(entityOrId) {
    const id = typeof entityOrId === 'number' ? entityOrId : entityOrId.id;
    this.entitiesToDestroy.add(id);
  }

  /**
   * Get entity by ID
   * @param {number} id - Entity ID
   * @returns {Entity|undefined} Entity or undefined if not found
   */
  getEntity(id) {
    return this.entities.get(id);
  }

  /**
   * Get all entities with specific components
   * @param {...string} componentTypes - Component types to filter by
   * @returns {Entity[]} Array of matching entities
   */
  getEntitiesWithComponents(...componentTypes) {
    const result = [];
    
    for (const entity of this.entities.values()) {
      if (!entity.active) continue;
      if (entity.hasComponents(...componentTypes)) {
        result.push(entity);
      }
    }
    
    return result;
  }

  /**
   * Get all entities with a specific tag
   * @param {string} tag - Tag to filter by
   * @returns {Entity[]} Array of matching entities
   */
  getEntitiesWithTag(tag) {
    const result = [];
    
    for (const entity of this.entities.values()) {
      if (entity.active && entity.hasTag(tag)) {
        result.push(entity);
      }
    }
    
    return result;
  }

  /**
   * Get all active entities
   * @returns {Entity[]} Array of all active entities
   */
  getAllEntities() {
    return Array.from(this.entities.values()).filter(e => e.active);
  }

  /**
   * Add a system to be updated each frame
   * @param {System} system - System to add
   */
  addSystem(system) {
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);
    system.init();
  }

  /**
   * Remove a system
   * @param {System} system - System to remove
   */
  removeSystem(system) {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      system.cleanup();
      this.systems.splice(index, 1);
    }
  }

  /**
   * Update all systems
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    // Update all systems
    for (const system of this.systems) {
      system.update(deltaTime);
    }

    // Clean up destroyed entities
    this.processDestructions();
  }

  /**
   * Process entities marked for destruction
   */
  processDestructions() {
    for (const id of this.entitiesToDestroy) {
      this.removeEntity(id);
    }
    this.entitiesToDestroy.clear();
  }

  /**
   * Remove all entities and systems
   */
  clear() {
    // Cleanup all systems
    for (const system of this.systems) {
      system.cleanup();
    }
    this.systems = [];

    // Remove all entities
    for (const entity of this.entities.values()) {
      entity.getAllComponents().forEach(component => component.onDetach());
    }
    this.entities.clear();
    this.entitiesToDestroy.clear();
  }

  /**
   * Get entity count
   * @returns {number} Number of active entities
   */
  getEntityCount() {
    return this.entities.size;
  }
}

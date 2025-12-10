/**
 * Entity - Container for components
 * An entity is just an ID with a collection of components attached.
 * All behavior comes from systems processing the components.
 */
export class Entity {
  static nextId = 1;

  /**
   * @param {string} [name] - Optional name for debugging
   */
  constructor(name = '') {
    this.id = Entity.nextId++;
    this.name = name || `Entity_${this.id}`;
    this.components = new Map(); // componentType -> component instance
    this.tags = new Set(); // For quick filtering (e.g., 'enemy', 'npc', 'player')
    this.active = true;
  }

  /**
   * Add a component to this entity
   * @param {Component} component - Component instance to add
   * @returns {Entity} this for chaining
   */
  addComponent(component) {
    if (this.components.has(component.type)) {
      console.warn(`Entity ${this.name} already has component ${component.type}`);
      return this;
    }
    
    this.components.set(component.type, component);
    component.onAttach(this);
    return this;
  }

  /**
   * Remove a component from this entity
   * @param {string} componentType - Type of component to remove
   * @returns {boolean} true if removed, false if not found
   */
  removeComponent(componentType) {
    const component = this.components.get(componentType);
    if (component) {
      component.onDetach();
      this.components.delete(componentType);
      return true;
    }
    return false;
  }

  /**
   * Get a component by type
   * @param {string} componentType - Type of component to get
   * @returns {Component|undefined} Component instance or undefined
   */
  getComponent(componentType) {
    return this.components.get(componentType);
  }

  /**
   * Check if entity has a component
   * @param {string} componentType - Type of component to check
   * @returns {boolean} true if has component
   */
  hasComponent(componentType) {
    return this.components.has(componentType);
  }

  /**
   * Check if entity has all specified components
   * @param {...string} componentTypes - Component types to check
   * @returns {boolean} true if has all components
   */
  hasComponents(...componentTypes) {
    return componentTypes.every(type => this.components.has(type));
  }

  /**
   * Add a tag for quick filtering
   * @param {string} tag - Tag to add (e.g., 'enemy', 'npc')
   * @returns {Entity} this for chaining
   */
  addTag(tag) {
    this.tags.add(tag);
    return this;
  }

  /**
   * Remove a tag
   * @param {string} tag - Tag to remove
   * @returns {boolean} true if removed
   */
  removeTag(tag) {
    return this.tags.delete(tag);
  }

  /**
   * Check if entity has a tag
   * @param {string} tag - Tag to check
   * @returns {boolean} true if has tag
   */
  hasTag(tag) {
    return this.tags.has(tag);
  }

  /**
   * Deactivate this entity (systems will skip it)
   */
  deactivate() {
    this.active = false;
  }

  /**
   * Activate this entity
   */
  activate() {
    this.active = true;
  }

  /**
   * Get all components
   * @returns {Component[]} Array of all components
   */
  getAllComponents() {
    return Array.from(this.components.values());
  }

  /**
   * Serialize entity to JSON-compatible object
   * @returns {Object} Serializable data
   */
  serialize() {
    return {
      id: this.id,
      name: this.name,
      tags: Array.from(this.tags),
      active: this.active,
      components: Array.from(this.components.values()).map(c => c.serialize())
    };
  }
}

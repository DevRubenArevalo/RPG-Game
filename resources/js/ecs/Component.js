/**
 * Component - Base class for all ECS components
 * Components are pure data containers with no logic.
 * Each component represents a single aspect of an entity (position, health, etc.)
 */
export class Component {
  /**
   * @param {string} type - Component type name (e.g., 'Position', 'Health')
   */
  constructor(type) {
    this.type = type;
    this.entity = null; // Reference to owning entity
  }

  /**
   * Called when component is added to an entity
   * @param {Entity} entity - The entity this component belongs to
   */
  onAttach(entity) {
    this.entity = entity;
  }

  /**
   * Called when component is removed from an entity
   */
  onDetach() {
    this.entity = null;
  }

  /**
   * Optional: Create a snapshot of component data for serialization
   * @returns {Object} Serializable data
   */
  serialize() {
    return { type: this.type };
  }
}

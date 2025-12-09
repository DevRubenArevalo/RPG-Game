/**
 * EventBus - Simple pub/sub event system for decoupling game systems
 * 
 * Usage:
 *   eventBus.emit('enemy:killed', { enemy, position });
 *   eventBus.on('enemy:killed', ({ enemy }) => { ... });
 *   eventBus.off('enemy:killed', handlerFunction);
 */

export class EventBus {
  constructor() {
    this.events = new Map();
    this.debugMode = false;
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} handler - Callback function to execute when event fires
   * @returns {Function} Unsubscribe function
   */
  on(eventName, handler) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    
    this.events.get(eventName).push(handler);
    
    // Return unsubscribe function
    return () => this.off(eventName, handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Handler to remove
   */
  off(eventName, handler) {
    if (!this.events.has(eventName)) return;
    
    const handlers = this.events.get(eventName);
    const index = handlers.indexOf(handler);
    
    if (index > -1) {
      handlers.splice(index, 1);
    }
    
    // Clean up empty event arrays
    if (handlers.length === 0) {
      this.events.delete(eventName);
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} eventName - Name of the event to emit
   * @param {*} data - Data to pass to handlers
   */
  emit(eventName, data) {
    if (this.debugMode) {
      console.log(`[EventBus] ${eventName}`, data);
    }
    
    if (!this.events.has(eventName)) return;
    
    const handlers = this.events.get(eventName);
    
    // Call all handlers (using slice to avoid issues if handler modifies array)
    handlers.slice().forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${eventName}:`, error);
      }
    });
  }

  /**
   * Subscribe to an event that auto-unsubscribes after first trigger
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Callback function
   */
  once(eventName, handler) {
    const onceHandler = (data) => {
      handler(data);
      this.off(eventName, onceHandler);
    };
    
    this.on(eventName, onceHandler);
  }

  /**
   * Remove all handlers for an event (or all events if no name provided)
   * @param {string} [eventName] - Optional event name to clear
   */
  clear(eventName) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get count of handlers for an event
   * @param {string} eventName - Name of the event
   * @returns {number} Number of handlers
   */
  listenerCount(eventName) {
    return this.events.has(eventName) ? this.events.get(eventName).length : 0;
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled - Whether to log events
   */
  setDebug(enabled) {
    this.debugMode = enabled;
  }

  /**
   * Get all registered event names
   * @returns {string[]} Array of event names
   */
  getEventNames() {
    return Array.from(this.events.keys());
  }
}

// Create singleton instance
export const eventBus = new EventBus();

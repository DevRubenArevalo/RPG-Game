import { eventBus } from '../core/EventBus.js';

/**
 * GameStateManager - Centralized state management with event-driven updates
 * 
 * Manages all major game state transitions (pause, shop, boss fights, game over).
 * Emits events so other systems can react without tight coupling.
 */
export class GameStateManager {
  /**
   * @param {Object} config - Configuration object
   * @param {GameState} config.state - Game state reference
   * @param {EventBus} [config.eventBus] - Optional event bus (defaults to singleton)
   */
  constructor({ state, eventBus: customEventBus = null }) {
    this.state = state;
    this.eventBus = customEventBus || eventBus;
  }

  // ==================== Pause Management ====================

  /**
   * Pause the game
   * @param {Object} [options] - Pause options
   * @param {string} [options.reason] - Reason for pausing (for logging/debugging)
   * @returns {boolean} True if state changed, false if already paused
   */
  pause(options = {}) {
    if (this.state.paused) return false;
    
    const { reason = 'manual' } = options;
    this.state.paused = true;
    
    this.eventBus.emit('game:paused', { reason });
    return true;
  }

  /**
   * Unpause the game
   * @returns {boolean} True if state changed, false if already unpaused
   */
  unpause() {
    if (!this.state.paused) return false;
    
    this.state.paused = false;
    this.state.platformPauseActive = false;
    
    this.eventBus.emit('game:unpaused');
    return true;
  }

  /**
   * Toggle pause state
   * @param {boolean} [force] - Force specific pause state (true=pause, false=unpause)
   * @returns {boolean} New pause state
   */
  togglePause(force) {
    // Don't allow pause during certain game states
    if (this.state.gameOver || this.state.shopActive || this.state.levelComplete) {
      return this.state.paused;
    }

    const nextState = typeof force === 'boolean' ? force : !this.state.paused;
    
    if (nextState) {
      this.pause({ reason: 'user_toggle' });
    } else {
      this.unpause();
    }
    
    return this.state.paused;
  }

  /**
   * Check if game is currently paused
   * @returns {boolean}
   */
  isPaused() {
    return this.state.paused;
  }

  // ==================== Shop Management ====================

  /**
   * Open the shop
   * @param {Object} [options] - Shop options
   * @param {Array} [options.shopOptions] - Shop upgrade options to display
   * @param {boolean} [options.force] - Force shop open (debug mode)
   * @returns {boolean} True if shop opened, false if already open
   */
  openShop(options = {}) {
    if (this.state.shopActive) return false;
    
    const { shopOptions = [], force = false } = options;
    this.state.shopActive = true;
    this.state.currentShopOptions = shopOptions;
    
    this.eventBus.emit('shop:opened', { options: shopOptions, force });
    return true;
  }

  /**
   * Close the shop
   * @param {Object} [options] - Close options
   * @param {string} [options.message] - Message to display on close
   * @returns {boolean} True if shop closed, false if already closed
   */
  closeShop(options = {}) {
    if (!this.state.shopActive) return false;
    
    const { message = '' } = options;
    this.state.shopActive = false;
    this.state.currentShopOptions = [];
    
    this.eventBus.emit('shop:closed', { message });
    return true;
  }

  /**
   * Check if shop is currently active
   * @returns {boolean}
   */
  isShopActive() {
    return this.state.shopActive;
  }

  // ==================== Boss Fight Management ====================

  /**
   * Start a boss fight
   * @param {Object} options - Boss fight options
   * @param {Object} options.boss - Boss enemy reference
   * @returns {boolean} True if boss fight started, false if already active
   */
  startBossFight(options = {}) {
    if (this.state.bossFightActive) return false;
    
    const { boss } = options;
    this.state.bossFightActive = true;
    this.state.bossDefeated = false;
    this.state.boss = boss;
    
    // Close shop if open
    if (this.state.shopActive) {
      this.closeShop();
    }
    
    this.eventBus.emit('boss:fight:started', { boss });
    return true;
  }

  /**
   * End the boss fight
   * @param {Object} [options] - End options
   * @param {boolean} [options.defeated] - Whether boss was defeated (vs escaped/cancelled)
   * @returns {boolean} True if boss fight ended, false if not active
   */
  endBossFight(options = {}) {
    if (!this.state.bossFightActive) return false;
    
    const { defeated = false } = options;
    this.state.bossFightActive = false;
    
    if (defeated) {
      this.state.bossDefeated = true;
    }
    
    this.eventBus.emit('boss:fight:ended', { defeated, boss: this.state.boss });
    return true;
  }

  /**
   * Check if boss fight is currently active
   * @returns {boolean}
   */
  isBossFightActive() {
    return this.state.bossFightActive;
  }

  // ==================== Game Over Management ====================

  /**
   * Trigger game over
   * @param {Object} [options] - Game over options
   * @param {string} [options.deathMessage] - Death message to display
   * @returns {boolean} True if game over triggered, false if already game over
   */
  gameOver(options = {}) {
    if (this.state.gameOver) return false;
    
    const { deathMessage = 'You have been defeated' } = options;
    this.state.gameOver = true;
    this.state.deathMessage = deathMessage;
    
    // Close shop if open
    if (this.state.shopActive) {
      this.closeShop();
    }
    
    this.eventBus.emit('game:over', { deathMessage });
    return true;
  }

  /**
   * Reset from game over state
   * @returns {boolean} True if reset, false if not in game over
   */
  resetGameOver() {
    if (!this.state.gameOver) return false;
    
    this.state.gameOver = false;
    this.state.deathMessage = null;
    
    this.eventBus.emit('game:over:reset');
    return true;
  }

  /**
   * Check if game is over
   * @returns {boolean}
   */
  isGameOver() {
    return this.state.gameOver;
  }

  // ==================== Level Complete Management ====================

  /**
   * Mark level as complete
   * @returns {boolean} True if level completed, false if already complete
   */
  completeLevel() {
    if (this.state.levelComplete) return false;
    
    this.state.levelComplete = true;
    this.state.levelCompleteTimer = 0;
    
    this.eventBus.emit('level:complete');
    return true;
  }

  /**
   * Reset level complete state
   * @returns {boolean} True if reset, false if not complete
   */
  resetLevelComplete() {
    if (!this.state.levelComplete) return false;
    
    this.state.levelComplete = false;
    this.state.levelCompleteTimer = 0;
    
    this.eventBus.emit('level:complete:reset');
    return true;
  }

  /**
   * Check if level is complete
   * @returns {boolean}
   */
  isLevelComplete() {
    return this.state.levelComplete;
  }

  // ==================== Composite State Queries ====================

  /**
   * Check if any blocking state is active (pause, shop, game over, etc.)
   * Useful for determining if gameplay should be blocked
   * @returns {boolean}
   */
  isGameplayBlocked() {
    return this.state.paused || 
           this.state.shopActive || 
           this.state.gameOver || 
           this.state.levelComplete ||
           this.state.debugPaused;
  }

  /**
   * Get current game state summary
   * @returns {Object} State summary object
   */
  getStateSummary() {
    return {
      paused: this.state.paused,
      shopActive: this.state.shopActive,
      bossFightActive: this.state.bossFightActive,
      gameOver: this.state.gameOver,
      levelComplete: this.state.levelComplete,
      debugPaused: this.state.debugPaused,
      gameplayBlocked: this.isGameplayBlocked(),
    };
  }

  /**
   * Reset all managed state to defaults (for new game)
   * Does NOT reset game over state - use resetGameOver() separately
   */
  resetAll() {
    this.state.paused = false;
    this.state.shopActive = false;
    this.state.bossFightActive = false;
    this.state.bossDefeated = false;
    this.state.levelComplete = false;
    this.state.levelCompleteTimer = 0;
    this.state.platformPauseActive = false;
    
    this.eventBus.emit('game:state:reset');
  }
}

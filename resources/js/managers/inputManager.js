/**
 * InputManager - Handles all keyboard input and controls
 */
export class InputManager {
  /**
   * @param {Object} config - Input manager configuration
   * @param {GameState} config.state - Game state
   * @param {Player} config.player - Player instance
   * @param {Set} config.keys - Active keys set
   * @param {Function} config.togglePause - Pause toggle function
   * @param {Function} config.openShop - Shop open function
   * @param {Object} config.gameOverManager - Game over manager
   * @param {Function} config.toggleMovementOverlay - Movement overlay toggle
   * @param {Function} config.toggleDebugMenu - Debug menu toggle
   * @param {Function} [config.triggerBossCutscene] - Boss cutscene trigger
   */
  constructor({
    state: gameState,
    player,
    keys,
    togglePause,
    openShop,
    gameOverManager,
    toggleMovementOverlay,
    toggleDebugMenu,
    triggerBossCutscene = null,
  }) {
    this.state = gameState;
    this.player = player;
    this.keys = keys;
    this.togglePause = togglePause;
    this.openShop = openShop;
    this.gameOverManager = gameOverManager;
    this.toggleMovementOverlay = toggleMovementOverlay;
    this.toggleDebugMenu = toggleDebugMenu;
    this.triggerBossCutscene = triggerBossCutscene;
    this.arrowKeys = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  onKeyDown(e) {
    const { state, player } = this;
    if (e.key === 'Escape') {
      if (!state.gameOver && !state.shopActive) {
        e.preventDefault();
        this.togglePause();
      }
      return;
    }
    const isRefreshKey = e.key === 'F5';
    const key = e.key.toLowerCase();
    if (key === 'f1') {
      state.debugShowCollisions = !state.debugShowCollisions;
      e.preventDefault();
      return;
    }
    if (key === 'f2') {
      state.debugShowBossStats = !state.debugShowBossStats;
      e.preventDefault();
      return;
    }
    if (key === 'p') {
      state.debugPaused = !state.debugPaused;
      console.log('🔍 [DEBUG PAUSE]', state.debugPaused ? 'PAUSED' : 'RESUMED');
      e.preventDefault();
      return;
    }
    if (key === 'k') {
      this.toggleMovementOverlay();
      e.preventDefault();
      return;
    }
    if (state.gameOver) {
      if (!isRefreshKey) {
        this.gameOverManager.handleKey(key);
        e.preventDefault();
      }
      return;
    }
    if (key === 'g') {
      this.toggleDebugMenu?.();
      e.preventDefault();
      return;
    }
    if (key === 'h') {
      player.coins += 100;
      return;
    }
    if (key === 'l') {
      if (player.x < 19000) {
        player.x = 19000;
        player.prevX = player.x;
        player.prevY = player.y;
        player.farthest = Math.max(player.farthest, player.x);
      }
      return;
    }
    if (key === 'j') {
      if (!state.shopActive) {
        this.openShop(true);
      }
      return;
    }
    if (state.paused) {
      if (isRefreshKey) return;
      e.preventDefault();
      return;
    }
    this.keys.add(key);
    if (this.arrowKeys.has(key)) {
      e.preventDefault();
    }
  }

  onKeyUp(e) {
    if (this.state.gameOver || this.state.paused) return;
    this.keys.delete(e.key.toLowerCase());
  }
}

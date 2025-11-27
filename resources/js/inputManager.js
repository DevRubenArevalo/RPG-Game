export class InputManager {
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
      if (player.x < 20000) {
        player.x = 20000;
        player.prevX = player.x;
        player.prevY = player.y;
        player.farthest = Math.max(player.farthest, player.x);
      }
      this.triggerBossCutscene?.();
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

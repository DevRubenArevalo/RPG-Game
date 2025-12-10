/**
 * Game - Main game loop controller
 * Handles the update-render cycle using requestAnimationFrame
 */
export class Game {
  /**
   * @param {Function} update - Update function called each frame
   * @param {Renderer} renderer - Renderer instance
   * @param {GameState} state - Game state instance
   */
  constructor(update, renderer, state) {
    this.update = update;
    this.renderer = renderer;
    this.state = state;
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.frameHandle = requestAnimationFrame(this.loop);
  }

  loop(timestamp) {
    // Check debug pause - skip update but continue render loop
    if (this.state.debugPaused) {
      this.renderer.draw(); // Still render frozen frame
      this.lastTime = timestamp; // Update time to prevent dt jump when unpaused
      this.frameHandle = requestAnimationFrame(this.loop);
      return;
    }
    
    const dt = Math.min(0.016, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    this.update(dt);
    this.renderer.draw();
    this.frameHandle = requestAnimationFrame(this.loop);
  }

  restartLoop() {
    if (this.frameHandle) {
      cancelAnimationFrame(this.frameHandle);
    }
    this.lastTime = performance.now();
    this.frameHandle = requestAnimationFrame(this.loop);
  }
}

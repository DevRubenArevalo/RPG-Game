export class Game {
  constructor(update, renderer) {
    this.update = update;
    this.renderer = renderer;
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.frameHandle = requestAnimationFrame(this.loop);
  }

  loop(timestamp) {
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

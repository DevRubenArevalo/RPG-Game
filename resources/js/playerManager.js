export class PlayerManager {
  constructor({ player, world, keys }) {
    this.player = player;
    this.world = world;
    this.keys = keys;
  }

  resetMovementState() {
    this.keys.clear();
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.prevX = this.player.x;
    this.player.prevY = this.player.y;
    this.player.grounded = true;
    this.player.wallMode = false;
    this.player.ducking = false;
    this.player.flingCharge = 0;
    this.player.flingDirection = 1;
    this.player.dropThroughTimer = 0;
    this.player.swallowHeld = false;
    this.player.idleTimer = 0;
    this.player.squish = 0;
  }

  applyScale() {
    this.player.applyScale(this.world);
  }

  heal(amount) {
    const prev = this.player.health;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
    if (this.player.health !== prev) {
      this.applyScale();
    }
  }
}

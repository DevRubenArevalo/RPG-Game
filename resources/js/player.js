export const PLAYER_CONFIG = {
  baseWidth: 56,
  baseHeight: 48,
  duckHeight: 28,
  maxSpeed: 420,
  accel: 2800,
  jumpSpeed: 820,
  jumpBoostThreshold: 30,
  jumpBoostMultiplier: 1.5,
  maxHealth: 30,
  startingHealth: 1,
  invulnerability: 1,
};

export class Player {
  constructor(config = PLAYER_CONFIG, world, shopInterval) {
    this.config = config;
    this.baseW = config.baseWidth;
    this.baseH = config.baseHeight;
    this.color = '#5dffba';
    this.shopInterval = shopInterval;
    this.reset(world);
  }

  reset(world, overrides = {}) {
    this.x = overrides.x ?? 120;
    this.y = overrides.y ?? world.groundY - this.baseH;
    this.prevX = overrides.prevX ?? this.x;
    this.prevY = overrides.prevY ?? this.y;
    this.w = overrides.w ?? this.baseW;
    this.h = overrides.h ?? this.baseH;
    this.duckHeight = overrides.duckHeight ?? this.config.duckHeight;
    this.vx = overrides.vx ?? 0;
    this.vy = overrides.vy ?? 0;
    this.maxSpeed = overrides.maxSpeed ?? this.config.maxSpeed;
    this.accel = overrides.accel ?? this.config.accel;
    this.jumpSpeed = overrides.jumpSpeed ?? this.config.jumpSpeed;
    this.grounded = overrides.grounded ?? false;
    this.ducking = overrides.ducking ?? false;
    this.duckTransition = overrides.duckTransition ?? 0;  // 0 = fully up, 1 = fully down
    this.alive = overrides.alive ?? true;
    this.squish = overrides.squish ?? 0;
    this.maxHealth = overrides.maxHealth ?? this.config.maxHealth;
    this.health = overrides.health ?? this.config.startingHealth;
    this.invulnTimer = overrides.invulnTimer ?? 0;
    this.mutationLevel = overrides.mutationLevel ?? 0;
    this.acidTrailChunks = overrides.acidTrailChunks ?? 0;
    this.hasAcidTrail = overrides.hasAcidTrail ?? false;
    this.mutationTimer = overrides.mutationTimer ?? 0;
    this.swallowHeld = overrides.swallowHeld ?? false;
    this.farthest = overrides.farthest ?? 0;
    this.coins = overrides.coins ?? 0;
    this.coinMultiplier = overrides.coinMultiplier ?? 1;
    this.regenUnlocked = overrides.regenUnlocked ?? false;
    this.regenTimer = overrides.regenTimer ?? 0;
    this.nextShopAt = overrides.nextShopAt ?? this.shopInterval;
    this.idleTimer = overrides.idleTimer ?? 0;
    this.flingCharge = overrides.flingCharge ?? 0;
    this.flingDirection = overrides.flingDirection ?? 1;
    this.wallMode = overrides.wallMode ?? false;
    this.dropThroughTimer = overrides.dropThroughTimer ?? 0;
    this.duckInputPrev = overrides.duckInputPrev ?? false;
  }

  applyScale(world) {
    const scale = 0.45 + (this.health / this.maxHealth) * 0.75;
    const bottom = this.y + this.h;
    const center = this.x + this.w / 2;
    this.w = this.baseW * scale;
    this.h = this.baseH * scale;
    this.duckHeight = Math.max(18, this.h * 0.6);
    this.y = bottom - this.h;
    this.x = center - this.w / 2;
    if (this.x < 0) this.x = 0;
    if (this.x + this.w > world.width) this.x = world.width - this.w;
  }
}

export function updatePlayerMovement(player, dt, input, world, {
  mutateSlime,
  applyPlayerScale,
  spawnSlimeGlob,
  playJumpSound,
  ensureWorldAhead,
  resolvePlatformCollisions,
  getSlimeFlingCooldown,
  setSlimeFlingCooldown,
  allowMovement = true,
  allowWallMode = false,
  allowFling = false,
}) {
  const { left, right, jump, duck, swallow } = input;
  const duckJustPressed = duck && !player.duckInputPrev;
  player.duckInputPrev = duck;
  if (duck && swallow) {
    if (!player.swallowHeld && mutateSlime) {
      mutateSlime();
    }
    player.swallowHeld = true;
  } else {
    player.swallowHeld = false;
  }

  if (player.regenUnlocked) {
    if (player.health < 10) {
      player.regenTimer += dt;
      if (player.regenTimer >= 0.8) {
        player.health = Math.min(10, player.health + 1);
        player.regenTimer = 0;
        applyPlayerScale();
      }
    } else {
      player.regenTimer = 0;
    }
  }

  if (!allowMovement) {
    return;
  }

  player.idleTimer += dt * (player.grounded ? 1 : 1.3);

  const prevVX = player.vx;
  player.prevX = player.x;
  player.prevY = player.y;

  player.dropThroughTimer = Math.max(0, (player.dropThroughTimer || 0) - dt);
  if (duckJustPressed && player.grounded) {
    player.dropThroughTimer = 0.1;
  }
  const dropActive = player.dropThroughTimer > 0;
  const wallActive = allowWallMode && duck && player.grounded && !dropActive;
  player.wallMode = wallActive;
  player.ducking = duck && player.grounded;
  
  // Smooth duck transition animation (0.25 seconds)
  const targetDuckTransition = player.ducking ? 1 : 0;
  const duckTransitionSpeed = 1 / 0.25;  // 4 units per second for 0.25s transition
  if (player.duckTransition < targetDuckTransition) {
    player.duckTransition = Math.min(targetDuckTransition, player.duckTransition + dt * duckTransitionSpeed);
  } else if (player.duckTransition > targetDuckTransition) {
    player.duckTransition = Math.max(targetDuckTransition, player.duckTransition - dt * duckTransitionSpeed);
  }
  
  const prevBottom = player.y + player.h;
  const prevCenter = player.x + player.w / 2;
  const normalScale = 0.45 + (player.health / player.maxHealth) * 0.75;
  const normalHeight = player.baseH * normalScale;
  const normalWidth = player.baseW * normalScale;
  const targetHeight = wallActive ? normalHeight * 1.35 : normalHeight;
  const targetWidth = wallActive ? Math.max(24, normalWidth * 0.5) : normalWidth;
  player.h = targetHeight;
  player.w = targetWidth;
  player.y = prevBottom - player.h;
  player.x = prevCenter - player.w / 2;
  if (player.y + player.h > world.groundY) {
    player.y = world.groundY - player.h;
  }
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > world.width) player.x = world.width - player.w;

  if (!wallActive) {
    if (left && !right) {
      player.vx -= player.accel * dt;
    } else if (right && !left) {
      player.vx += player.accel * dt;
    } else {
      const friction = player.grounded ? world.frictionGround : world.frictionAir;
      if (player.vx > 0) player.vx = Math.max(0, player.vx - friction * dt);
      if (player.vx < 0) player.vx = Math.min(0, player.vx + friction * dt);
    }
  } else {
    player.vx *= 0.35;
    if (player.grounded) player.vx = 0;
    if (player.vy > 0) player.vy = 0;
  }

  // Apply 50% speed reduction when ducking
  const duckSpeedMultiplier = player.ducking ? 0.5 : 1;
  player.vx = Math.max(-player.maxSpeed * duckSpeedMultiplier, Math.min(player.maxSpeed * duckSpeedMultiplier, player.vx));
  if (left || right) {
    player.flingCharge = Math.max(player.flingCharge, Math.abs(prevVX));
    const currentDir = Math.sign(player.vx || prevVX);
    if (currentDir) {
      player.flingDirection = currentDir;
    }
  } else if (player.flingCharge > 0) {
    player.flingCharge = Math.max(0, player.flingCharge - 480 * dt);
  }

  attemptSlimeFling({
    player,
    prevVX,
    inputLeft: left,
    inputRight: right,
    spawnSlimeGlob,
    getSlimeFlingCooldown,
    setSlimeFlingCooldown,
    enabled: allowFling,
  });

  if (jump && player.grounded && !player.wallMode) {
    const boosted = player.health >= PLAYER_CONFIG.jumpBoostThreshold;
    const jumpPower = boosted ? player.jumpSpeed * PLAYER_CONFIG.jumpBoostMultiplier : player.jumpSpeed;
    player.vy = -jumpPower;
    player.grounded = false;
    playJumpSound();
  }

  player.vy += world.gravity * dt;

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.squish = Math.max(0, player.squish - dt * 2.4);
  player.farthest = Math.max(player.farthest, player.x);

  if (player.x < 0) player.x = 0;
  ensureWorldAhead();
  if (player.x + player.w > world.width) player.x = world.width - player.w;

  player.grounded = false;
  resolvePlatformCollisions(player);
}

function attemptSlimeFling({
  player,
  prevVX,
  inputLeft,
  inputRight,
  spawnSlimeGlob,
  getSlimeFlingCooldown,
  setSlimeFlingCooldown,
  enabled = true,
}) {
  if (!enabled) return;
  if (getSlimeFlingCooldown() > 0) return;
  const storedCharge = player.flingCharge;
  const charge = storedCharge > 0 ? storedCharge : Math.abs(prevVX);
  if (charge === 0) return;
  const fast = charge > 230;
  const slowed = Math.abs(player.vx) < 120;
  const airborne = !player.grounded;
  const releaseWindow = airborne ? Math.abs(player.vy) < 120 : true;
  const noInput = !inputLeft && !inputRight;
  const directionInput = inputRight ? 1 : (inputLeft ? -1 : 0);
  const priorDir = Math.sign(player.flingDirection || prevVX || directionInput || 1) || 1;
  const sharpAirFlip = airborne &&
    directionInput !== 0 &&
    Math.sign(directionInput) === -priorDir &&
    Math.abs(player.vx) < 120 &&
    charge > 230;

  if ((fast && slowed && noInput && releaseWindow) || sharpAirFlip) {
    const fallbackDir = sharpAirFlip ? -directionInput : 1;
    const direction = player.flingDirection || Math.sign(prevVX) || fallbackDir;
    spawnSlimeGlob(direction, charge);
    setSlimeFlingCooldown(3);
    player.flingCharge = 0;
  }
}

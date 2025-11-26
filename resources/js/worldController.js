import { randomRange } from './utils.js';

export class WorldController {
  constructor({
    state,
    player,
    enemyConfig,
    createEnemy,
    platformUnit,
    acidTickInterval,
    playerDamagePerTick,
    playCorrosionSound,
  }) {
    this.state = state;
    this.player = player;
    this.canvas = state.canvas;
    this.world = state.world;
    this.camera = state.camera;
    this.platforms = state.platforms;
    this.traps = state.traps;
    this.enemies = state.enemies;
    this.trailSegments = state.trailSegments;
    this.platformBounds = state.platformBounds;
    this.corrodedPlatformIds = state.corrodedPlatformIds;
    this.safeZoneEnd = state.safeZoneEnd;
    this.chunkWidth = state.chunkWidth;
    this.generationMargin = state.generationMargin;
    this.cleanupBuffer = state.cleanupBuffer;
    this.platformIdCounter = 0;
    this.enemyIdCounter = 0;
    this.enemyConfig = enemyConfig;
    this.createEnemy = createEnemy;
    this.platformUnit = platformUnit;
    this.acidTickInterval = acidTickInterval;
    this.playerDamagePerTick = playerDamagePerTick;
    this.playCorrosionSound = playCorrosionSound;
    this.enemyTiers = enemyConfig?.tiers ?? [];
    this.enemyWidth = enemyConfig?.width ?? 0;
    this.enemyHalfWidth = this.enemyWidth / 2;
  }

  get maxPlatformStep() {
    const { player, world } = this;
    return Math.max(60, Math.floor((player.jumpSpeed * player.jumpSpeed) / (2 * world.gravity) - player.baseH));
  }

  createPlatform(x, y, w, h, integrityOverride, maxIntegrityOverride) {
    const baseMax = maxIntegrityOverride ?? randomRange(4, 7);
    const baseIntegrity = Math.min(baseMax, integrityOverride ?? baseMax);
    return {
      id: this.platformIdCounter++,
      x,
      y,
      w,
      h,
      color: '#243b61',
      passable: true,
      integrity: baseIntegrity,
      maxIntegrity: baseMax,
    };
  }

  createPlatformUnits(x, y, totalWidth, height) {
    const unitWidth = this.platformUnit;
    const count = Math.max(1, Math.round(totalWidth / unitWidth));
    const segments = [];
    for (let i = 0; i < count; i++) {
      segments.push(this.createPlatform(x + i * unitWidth, y, unitWidth, height));
    }
    return { segments, width: count * unitWidth };
  }

  splitPlatform(original, start, end) {
    const begin = Math.max(original.x, Math.min(start, original.x + original.w));
    const finish = Math.max(begin, Math.min(end, original.x + original.w));
    const leftWidth = begin - original.x;
    const centerWidth = finish - begin;
    const rightWidth = original.x + original.w - finish;
    if (centerWidth <= 2 && leftWidth <= 6 && rightWidth <= 6) {
      return original;
    }
    const index = this.platforms.indexOf(original);
    if (index === -1) return original;
    const newPlats = [];
    if (leftWidth > 6) {
      newPlats.push(this.createPlatform(
        original.x,
        original.y,
        leftWidth,
        original.h,
        original.maxIntegrity,
        original.maxIntegrity,
      ));
    }
    let centerPlat = original;
    if (centerWidth > 2) {
      centerPlat = this.createPlatform(
        begin,
        original.y,
        centerWidth,
        original.h,
        original.integrity,
        original.maxIntegrity,
      );
      newPlats.push(centerPlat);
    }
    if (rightWidth > 6) {
      newPlats.push(this.createPlatform(
        finish,
        original.y,
        rightWidth,
        original.h,
        original.maxIntegrity,
        original.maxIntegrity,
      ));
    }
    if (!newPlats.length) {
      return original;
    }
    this.platforms.splice(index, 1, ...newPlats);
    return centerPlat;
  }

  getChunkDifficulty(chunkStart) {
    return Math.min(4, 1 + Math.floor(chunkStart / 800));
  }

  generateChunk() {
    const start = this.state.generatedUntil;
    const end = start + this.chunkWidth;
    const difficulty = this.getChunkDifficulty(start);
    const platformCount = 1 + Math.floor(Math.random() * 2);
    const chunkPlatforms = [];
    const startClamp = start === 0 ? Math.max(this.safeZoneEnd + 80, start + 80) : start + 80;
    let position = startClamp;
    let lastY = this.world.groundY - 110;
    let attempts = 0;
    while (chunkPlatforms.length < platformCount && position < end - 160 && attempts < platformCount + 4) {
      attempts++;
      let width = randomRange(200, 320);
      const height = 14 + Math.random() * 6;
      let x = position;
      if (x + width > end - 60) {
        x = Math.max(start + 60, end - width - 60);
      }
      if (start === 0) {
        x = Math.max(x, this.safeZoneEnd + 80);
      }
      if (x + width <= start + 40) break;
      const maxStep = this.maxPlatformStep;
      let y = this.world.groundY - randomRange(80, this.maxPlatformStep + 120) + 50;
      y = Math.max(lastY - maxStep, Math.min(lastY + maxStep, y));
      y = Math.min(this.world.groundY - 10, Math.max(this.world.groundY - (this.maxPlatformStep + 40), y));
      const unitData = this.createPlatformUnits(x, y, width, height);
      unitData.segments.forEach((seg) => {
        this.platforms.push(seg);
        this.platformBounds.set(seg.id, { min: x, max: x + unitData.width });
      });
      chunkPlatforms.push({ x, y, w: unitData.width, h: height, segments: unitData.segments });
      lastY = y;
      position = x + unitData.width + randomRange(200, 360);
    }
    if (!chunkPlatforms.length) {
      const fallbackWidth = 220;
      const fallbackX = Math.max(startClamp, start + 60);
      const unitData = this.createPlatformUnits(fallbackX, this.world.groundY - 70, fallbackWidth, 16);
      unitData.segments.forEach((seg) => {
        this.platforms.push(seg);
        this.platformBounds.set(seg.id, { min: fallbackX, max: fallbackX + unitData.width });
      });
      chunkPlatforms.push({ x: fallbackX, y: this.world.groundY - 70, w: unitData.width, h: 16, segments: unitData.segments });
    }
    if (!this.enemyTiers.length) {
      this.state.generatedUntil = end;
      this.world.width = Math.max(this.world.width, end + this.canvasWidthBuffer());
      return;
    }
    const enemySpawns = 1 + Math.floor(Math.random() * (difficulty + 1));
    for (let i = 0; i < enemySpawns; i++) {
      let spawnX = start + randomRange(80, this.chunkWidth - 80);
      if (spawnX <= this.safeZoneEnd + 60) continue;
      const tier = this.enemyTiers[Math.floor(Math.random() * this.enemyTiers.length)];
      const enemyHealth = tier.health;
      const enemyDamage = tier.damage;
      const enemyColor = tier.color;
      const platform = this.findPlatformAt(spawnX + this.enemyHalfWidth);
      let spawnY = this.world.groundY - 34;
      let supportId = null;
      let patrolMin;
      let patrolMax;
      if (platform && platform.y > this.world.groundY - (this.maxPlatformStep + 70)) {
        spawnY = platform.y - 34;
        supportId = platform.id;
        const bounds = this.platformBounds.get(platform.id);
        const minBound = bounds ? bounds.min : platform.x;
        const maxBound = bounds ? bounds.max : platform.x + platform.w;
        patrolMin = minBound;
        patrolMax = maxBound;
      } else {
        patrolMin = spawnX - randomRange(100, 200);
        patrolMax = spawnX + randomRange(100, 200);
      }
      patrolMin = Math.max(0, patrolMin);
      patrolMax = Math.min(this.world.width, patrolMax);
      if (patrolMin > patrolMax) [patrolMin, patrolMax] = [patrolMax, patrolMin];
      if (patrolMax - patrolMin < this.enemyWidth) {
        patrolMax = Math.min(this.world.width, patrolMin + this.enemyWidth);
        patrolMin = Math.max(0, patrolMax - this.enemyWidth);
      }
      this.enemies.push(this.createEnemy({
        id: this.enemyIdCounter++,
        x: spawnX,
        y: spawnY,
        minX: patrolMin,
        maxX: patrolMax,
        speed: randomRange(55, 100),
        health: enemyHealth,
        damage: enemyDamage,
        supportId,
        color: enemyColor,
        tier: tier.tier,
        worldWidth: this.world.width,
        acidTickInterval: this.acidTickInterval,
      }));
    }
    this.state.generatedUntil = end;
    this.world.width = Math.max(this.world.width, end + this.canvasWidthBuffer());
    if (Math.random() < 0.35) {
      const trapWidth = randomRange(40, 80);
      const trapDamage = 1 + Math.floor(Math.random() * Math.max(1, difficulty - 1));
      const trapStartMin = Math.max(start + 60, this.safeZoneEnd + 40);
      const available = Math.max(0, end - trapWidth - trapStartMin - 40);
      if (available > 0) {
        const trapX = trapStartMin + randomRange(0, available);
        this.traps.push({
          x: trapX,
          y: this.world.groundY - 14,
          w: trapWidth,
          h: 14,
          damage: Math.max(1, trapDamage),
        });
      }
    }
  }

  canvasWidthBuffer() {
    return this.canvas.width * 0.5;
  }

  seedWorld() {
    while (this.state.generatedUntil < this.state.canvas.width * 1.3) {
      this.generateChunk();
    }
  }

  ensureWorldAhead() {
    const viewEnd = Math.max(this.camera.x + this.state.canvas.width, this.player.x + this.state.canvas.width * 0.5) + this.generationMargin;
    while (this.state.generatedUntil < viewEnd) {
      this.generateChunk();
    }
  }

  cleanupOldEntities() {
    const minX = this.camera.x - this.cleanupBuffer;
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      if (this.platforms[i].x + this.platforms[i].w < minX) {
        const removed = this.platforms.splice(i, 1)[0];
        this.releaseSegmentsFromSupport(removed.id);
        this.releaseEnemiesFromSupport(removed.id);
      }
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].x + this.enemies[i].w < minX) {
        this.enemies.splice(i, 1);
      }
    }
    for (let i = this.traps.length - 1; i >= 0; i--) {
      if (this.traps[i].x + this.traps[i].w < minX) {
        this.traps.splice(i, 1);
      }
    }
  }

  findPlatformById(id) {
    return this.platforms.find((plat) => plat.id === id);
  }

  findPlatformAt(x) {
    let candidate = null;
    for (const plat of this.platforms) {
      if (x >= plat.x - 1 && x <= plat.x + plat.w + 1) {
        if (!candidate || plat.y < candidate.y) {
          candidate = plat;
        }
      }
    }
    return candidate;
  }

  releaseSegmentsFromSupport(platformId) {
    this.trailSegments.forEach((seg) => {
      if (seg.supportId === platformId) {
        seg.supportId = null;
        seg.grounded = false;
      }
    });
  }

  releaseEnemiesFromSupport(platformId) {
    for (const enemy of this.enemies) {
      if (enemy.supportId === platformId) {
        enemy.supportId = null;
        enemy.grounded = false;
      }
    }
  }

  markPlatformForRemoval(id) {
    this.corrodedPlatformIds.add(id);
  }

  removeCorrodedPlatforms() {
    if (!this.corrodedPlatformIds.size) return;
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const plat = this.platforms[i];
      if (this.corrodedPlatformIds.has(plat.id)) {
        this.platforms.splice(i, 1);
        this.releaseSegmentsFromSupport(plat.id);
        this.releaseEnemiesFromSupport(plat.id);
        this.platformBounds.delete(plat.id);
      }
    }
    this.corrodedPlatformIds.clear();
  }

  corrodePlatform(plat, seg, dt) {
    if (!plat) return null;
    const overlapStart = Math.max(plat.x, seg.x);
    const overlapEnd = Math.min(plat.x + plat.w, seg.x + seg.w);
    if (overlapEnd <= overlapStart) return plat;
    seg.supportId = plat.id;
    if (!this.state.upgrades.melt_platforms) {
      seg.vy = 0;
      seg.y = plat.y - seg.h;
      return plat;
    }
    const meltMultiplier = 0.45 + this.playerDamagePerTick() * 0.15;
    plat.integrity -= seg.damagePerSecond * dt * meltMultiplier;
    if (plat.integrity < plat.maxIntegrity) {
      this.playCorrosionSound?.();
    }
    if (plat.integrity <= 0) {
      this.markPlatformForRemoval(plat.id);
      return null;
    }
    return plat;
  }
}

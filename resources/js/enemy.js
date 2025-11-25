import { Projectile } from './projectile.js';

export const ENEMY_CONFIG = {
  width: 44,
  projectile: {
    interval: 3,
    modeSwitch: 3,
    speed: 320,
  },
  tiers: [
    { tier: 'weak', health: 10, damage: 3, color: '#5dff5d' },
    { tier: 'medium', health: 20, damage: 6, color: '#ffd25d' },
    { tier: 'hard', health: 30, damage: 9, color: '#ff5d6c' },
  ],
};

export class Enemy {
  constructor(props) {
    Object.assign(this, props);
  }
}

export function createEnemy({
  id,
  x,
  y,
  minX,
  maxX,
  speed,
  health,
  damage,
  worldWidth,
  supportId = null,
  color = '#ff5d6c',
  tier = 'weak',
  acidTickInterval = 0.5,
}) {
  const roamMin = tier === 'hard' ? 0 : minX;
  const roamMax = tier === 'hard' ? Math.max(minX, worldWidth - ENEMY_CONFIG.width) : maxX;
  return new Enemy({
    id,
    x,
    y,
    w: ENEMY_CONFIG.width,
    h: 34,
    speed,
    minX: roamMin,
    maxX: roamMax,
    dir: 1,
    prevY: y,
    vy: 0,
    grounded: supportId !== null,
    color,
    health,
    maxHealth: health,
    acidTimer: 0,
    damage,
    acidDuration: 0,
    acidTickTimer: acidTickInterval,
    supportId,
    patrolMin: roamMin,
    patrolMax: roamMax,
    groundMin: roamMin,
    groundMax: roamMax,
    tier,
    projectileCooldown: 0,
    projectileModeTimer: 0,
    projectileMode: 'vertical',
    acidStacks: 0,
    acidStackTimer: 0,
    acidStackCooldown: 0,
  });
}

export function updateEnemies({
  enemies,
  dt,
  world,
  player,
  platformBounds,
  findPlatformAt,
  findPlatformById,
  trailSegments,
  slimeGlobs,
  enemyProjectiles,
  spawnSlimeChunks,
  spawnCoins,
  playEnemyDeathSound,
  hurtPlayer,
  playerDamagePerTick,
  spawnDamageNumber,
  ACID_DEBUFF_DURATION,
  ACID_TICK_INTERVAL,
  PROJECTILE_INTERVAL,
  PROJECTILE_MODE_SWITCH,
  PROJECTILE_SPEED,
  spikedShoes = false,
}) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.prevY = enemy.y;

    const attachToPlatform = (plat) => {
      if (!plat) return false;
      enemy.supportId = plat.id;
      enemy.grounded = true;
      enemy.vy = 0;
      enemy.y = plat.y - enemy.h;
      if (enemy.tier !== 'hard') {
        const bounds = platformBounds.get(plat.id);
        const minBound = bounds ? bounds.min : plat.x;
        const maxBound = bounds ? bounds.max : plat.x + plat.w;
        enemy.minX = minBound;
        enemy.maxX = maxBound;
        const maxLeft = Math.max(enemy.minX, enemy.maxX - enemy.w);
        enemy.x = Math.max(enemy.minX, Math.min(enemy.x, maxLeft));
      } else {
        enemy.minX = 0;
        enemy.maxX = world.width - enemy.w;
      }
      return true;
    };

    const platformUnder = findPlatformAt(enemy.x + enemy.w / 2);
    if (platformUnder && Math.abs(platformUnder.y - (enemy.y + enemy.h)) <= 6) {
      attachToPlatform(platformUnder);
    } else {
      enemy.supportId = null;
      enemy.grounded = false;
      enemy.minX = enemy.tier === 'hard' ? 0 : enemy.groundMin;
      enemy.maxX = enemy.tier === 'hard' ? world.width - enemy.w : enemy.groundMax;
    }

    if (!enemy.grounded) {
      enemy.vy += world.gravity * 0.85 * dt;
      enemy.y += enemy.vy * dt;
      if (enemy.y + enemy.h >= world.groundY) {
        enemy.y = world.groundY - enemy.h;
        enemy.vy = 0;
        enemy.grounded = true;
        enemy.supportId = null;
        if (enemy.tier === 'hard') {
          enemy.minX = 0;
          enemy.maxX = world.width - enemy.w;
        } else {
          enemy.minX = enemy.groundMin;
          enemy.maxX = enemy.groundMax;
        }
      } else if (platformUnder && enemy.vy >= 0) {
        attachToPlatform(platformUnder);
      }
    }

    const debuffSlow = enemy.acidDuration > 0 ? 0.6 : 1;
    if (enemy.tier === 'hard') {
      const targetX = Math.max(0, Math.min(world.width - enemy.w, player.x));
      const center = enemy.x + enemy.w / 2;
      const delta = targetX - center;
      if (Math.abs(delta) > 2) {
        enemy.dir = delta > 0 ? 1 : -1;
      }
    }
    enemy.x += enemy.speed * debuffSlow * enemy.dir * dt;
    if (enemy.tier === 'hard') {
      if (enemy.x < 0) {
        enemy.x = 0;
        enemy.dir = 1;
      } else if (enemy.x + enemy.w > world.width) {
        enemy.x = world.width - enemy.w;
        enemy.dir = -1;
      }
    } else {
      if (enemy.x <= enemy.minX) {
        enemy.x = enemy.minX;
        enemy.dir = 1;
      } else if (enemy.x + enemy.w >= enemy.maxX) {
        enemy.x = enemy.maxX - enemy.w;
        enemy.dir = -1;
      }
    }
    if (enemy.supportId) {
      const plat = findPlatformById(enemy.supportId);
      if (!plat || enemy.x + enemy.w / 2 < plat.x || enemy.x + enemy.w / 2 > plat.x + plat.w) {
        enemy.supportId = null;
        enemy.grounded = false;
      }
    }

    enemy.acidStackCooldown = Math.max(0, (enemy.acidStackCooldown || 0) - dt);
    let touchingAcidCount = 0;
    for (const seg of trailSegments) {
      if (seg.life > 0 && overlap(enemy, seg)) {
        touchingAcidCount += 1;
      }
    }
    for (const glob of slimeGlobs) {
      if (glob.life > 0 && overlap(enemy, glob)) {
        touchingAcidCount += 1;
        glob.life -= dt * 1.4;
      }
    }

    if (touchingAcidCount > 0) {
      if (!enemy.acidStacks || enemy.acidStacks < 1) {
        enemy.acidStacks = 1;
        enemy.acidStackTimer = 0;
      }
      enemy.acidStackTimer += dt * touchingAcidCount;
      while (
        enemy.acidStacks < 2 &&
        enemy.acidStackTimer >= ACID_TICK_INTERVAL &&
        enemy.acidStackCooldown <= 0
      ) {
        enemy.acidStackTimer -= ACID_TICK_INTERVAL;
        enemy.acidStacks += 1;
        enemy.acidStackCooldown = 1;
      }
      enemy.acidTimer = 0.25;
      enemy.acidDuration = ACID_DEBUFF_DURATION;
    } else {
      enemy.acidTimer = Math.max(0, enemy.acidTimer - dt);
      enemy.acidDuration = Math.max(0, enemy.acidDuration - dt);
      enemy.acidStackTimer = 0;
      if (enemy.acidDuration <= 0) {
        enemy.acidStacks = 0;
      }
    }

    if (enemy.acidDuration > 0) {
      enemy.acidTickTimer -= dt;
      while (enemy.acidTickTimer <= 0 && enemy.acidDuration > 0) {
        enemy.acidTickTimer += ACID_TICK_INTERVAL;
        const stackMultiplier = Math.max(1, enemy.acidStacks || 0);
        const tickDamage = playerDamagePerTick() * stackMultiplier;
        enemy.health -= tickDamage;
        spawnDamageNumber(enemy.x + enemy.w / 2, enemy.y, tickDamage, `enemy-${enemy.id}`);
      }
    } else {
      enemy.acidTickTimer = ACID_TICK_INTERVAL;
    }

    if (enemy.tier === 'medium') {
      enemy.projectileModeTimer += dt;
      if (enemy.projectileModeTimer >= PROJECTILE_MODE_SWITCH) {
        enemy.projectileModeTimer = 0;
        enemy.projectileMode = enemy.projectileMode === 'vertical' ? 'horizontal' : 'vertical';
      }
      enemy.projectileCooldown -= dt;
      if (enemy.projectileCooldown <= 0) {
        spawnEnemyProjectiles(enemy, enemyProjectiles, PROJECTILE_SPEED);
        enemy.projectileCooldown = PROJECTILE_INTERVAL;
      }
    }

    if (enemy.health <= 0) {
      playEnemyDeathSound();
      spawnSlimeChunks(enemy);
      spawnCoins(enemy);
      enemies.splice(i, 1);
      continue;
    }

    if (overlap(player, enemy)) {
      const stomping = spikedShoes &&
        player.vy > 0 &&
        player.prevY + player.h <= enemy.y + Math.min(enemy.h, 12);
      if (stomping) {
        enemy.health -= 2;
        spawnDamageNumber(enemy.x + enemy.w / 2, enemy.y, 2, `enemy-${enemy.id}`);
        player.vy = -player.jumpSpeed * 0.5;
        player.grounded = false;
        if (enemy.health <= 0) {
          playEnemyDeathSound();
          spawnSlimeChunks(enemy);
          spawnCoins(enemy);
          enemies.splice(i, 1);
          continue;
        }
        continue;
      }
      hurtPlayer(enemy.damage ?? 1, enemy.x + enemy.w / 2);
      if (!player.alive) return;
    }
  }
}

function spawnEnemyProjectiles(enemy, enemyProjectiles, speed) {
  const centerX = enemy.x + enemy.w / 2;
  const centerY = enemy.y + enemy.h / 2;
  const damage = Math.max(2, Math.round(enemy.damage * 0.6));
  if (enemy.projectileMode === 'vertical') {
    enemyProjectiles.push(new Projectile({
      x: centerX - 5,
      y: centerY - 12,
      w: 10,
      h: 16,
      vx: 0,
      vy: -speed,
      damage,
      reflected: false,
      trailTimer: 0,
    }));
    enemyProjectiles.push(new Projectile({
      x: centerX - 5,
      y: centerY,
      w: 10,
      h: 16,
      vx: 0,
      vy: speed,
      damage,
      reflected: false,
      trailTimer: 0,
    }));
  } else {
    enemyProjectiles.push(new Projectile({
      x: centerX - 14,
      y: centerY - 6,
      w: 16,
      h: 10,
      vx: -speed,
      vy: 0,
      damage,
      reflected: false,
      trailTimer: 0,
    }));
    enemyProjectiles.push(new Projectile({
      x: centerX - 2,
      y: centerY - 6,
      w: 16,
      h: 10,
      vx: speed,
      vy: 0,
      damage,
      reflected: false,
      trailTimer: 0,
    }));
  }
}

function overlap(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

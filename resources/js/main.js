import { CONSTANTS } from './constants.js';
import { AudioManager, AUDIO_TRACKS } from './audioManager.js';
import { ShopManager, SHOP_INTERVAL } from './shopManager.js';
import { GameState } from './gameState.js';
import { ENEMY_CONFIG, createEnemy, createBossEnemy, updateEnemies } from './enemy.js';
import { Player, PLAYER_CONFIG, updatePlayerMovement } from './player.js';
import { UPGRADES } from './upgrades.js';
import { clamp, overlap, checkBossCollision } from './utils.js';
import { InputManager } from './inputManager.js';
import { PlayerManager } from './playerManager.js';
import { ShopController } from './shopController.js';
import { WorldController } from './worldController.js';
import { GameOverManager } from './gameOverManager.js';
import { UIManager } from './uiManager.js';
import { Renderer } from './renderer.js';
import { Game } from './gameLoop.js';

const muteToggle = document.getElementById('muteToggle');
const shopRefreshButton = document.getElementById('shopRefresh');
const shopSkipButton = document.getElementById('shopSkip');
const gameOverYesButton = document.getElementById('gameOverYes');
const gameOverNoButton = document.getElementById('gameOverNo');
const state = new GameState(CONSTANTS);
state.upgrades = {};
state.purchasedUpgrades = new Set();
UPGRADES.forEach((upgrade) => {
  state.upgrades[upgrade.id] = false;
});
state.magnetRange = 0;
state.godMode = false;
state.currentShopOptions = [];
state.homeScreenActive = true;
state.gameOverTears = [];
state.gameOverTearTimer = 0;
state.gameOverNextTearSide = 'left';
const audio = new AudioManager(AUDIO_TRACKS, muteToggle);
let gameInstance;
const shopManager = new ShopManager();

const {
  canvas,
  ctx,
  statusEl,
  coinImage,
  player,
  keys,
  world,
  camera,
  platforms,
  enemies,
  traps,
  trailSegments,
  slimeChunks,
  coins,
  slimeGlobs,
  enemyProjectiles,
  damageNumbers,
  corrodedPlatformIds,
  platformBounds,
  damageLimitStates,
  highScores,
  gameOverState,
} = state;
const viewRightMargin = state.viewRightMargin;




const playerManager = new PlayerManager({ player, world, keys });
const shopController = new ShopController({
  state,
  player,
  playerManager,
  shopManager,
  shopRefreshButton,
  shopSkipButton,
});
const ACID_VALUES = {
  trailInterval: 0.11,
  tickInterval: 0.5,
  debuffDuration: 3,
  damageNumbersPerSecond: 2,
  trailDamage: 3.6,
  globDamage: 7.5,
  globLifetime: 2.6,
};
const PROJECTILE_INTERVAL = ENEMY_CONFIG.projectile.interval;
const PROJECTILE_MODE_SWITCH = ENEMY_CONFIG.projectile.modeSwitch;
const PROJECTILE_SPEED = ENEMY_CONFIG.projectile.speed;
const TRAIL_INTERVAL = ACID_VALUES.trailInterval;
const ACID_TICK_INTERVAL = ACID_VALUES.tickInterval;
const ACID_DEBUFF_DURATION = ACID_VALUES.debuffDuration;
const MARKER_SPACING = CONSTANTS.level.markerSpacing;
const PLATFORM_UNIT = CONSTANTS.level.platformUnit;
const PLATFORM_SEAM_EPSILON = 0.8;
const worldController = new WorldController({
  state,
  player,
  enemyConfig: ENEMY_CONFIG,
  createEnemy,
  platformUnit: PLATFORM_UNIT,
  acidTickInterval: ACID_TICK_INTERVAL,
  playerDamagePerTick,
  playCorrosionSound,
});
const BOSS_TRIGGER_DISTANCE = 20000;
function lerp(a, b, t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return a + (b - a) * clamped;
}

function update(dt) {
  if (state.homeScreenActive) {
    statusEl.textContent = 'Home - click Start to run';
    return;
  }
  if (state.gameOver) {
    gameOverState.animTime += dt;
    gameOverManager.updateTears(dt);
    statusEl.textContent = 'Game Over - press Y to continue';
    return;
  }
  
  // Always update cinematic even if paused (for defeat cinematic)
  updateCinematic(dt);
  
  if (state.paused) {
    statusEl.textContent = 'Paused - press Esc to continue';
    return;
  }
  if (state.levelComplete) {
    state.levelCompleteTimer += dt;
    statusEl.textContent = 'Level Complete - press Play Again';
    return;
  }
  checkBossSpawn();
  state.slimeFlingCooldown -= dt;
  if (state.slimeFlingCooldown <= 0) {
    state.slimeFlingCooldown = 0;
    state.slimeFlingCooldownMax = 0;
  }
  player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  const best = highScores.length ? Math.floor(highScores[0]) : 0;
  statusEl.textContent = `HP ${player.health}/${player.maxHealth} | Dist ${Math.floor(player.farthest)} | Coins ${Math.floor(player.coins)} | Top ${best}`;
  const input = {
    left: keys.has('arrowleft') || keys.has('a'),
    right: keys.has('arrowright') || keys.has('d'),
    jump: keys.has(' ') || keys.has('arrowup') || keys.has('w'),
    duck: keys.has('arrowdown') || keys.has('s'),
    swallow: keys.has('f'),
  };
  const allowMovement = !state.shopActive && !state.levelComplete;
  updatePlayerMovement(player, dt, input, world, {
    swallowShield,
    applyPlayerScale: () => playerManager.applyScale(),
    spawnSlimeGlob,
    playJumpSound,
    ensureWorldAhead: () => worldController.ensureWorldAhead(),
    resolvePlatformCollisions,
    getSlimeFlingCooldown: () => state.slimeFlingCooldown,
    setSlimeFlingCooldown: (value) => {
      state.slimeFlingCooldown = value;
      state.slimeFlingCooldownMax = value;
    },
    allowMovement,
    allowWallMode: state.upgrades.slime_wall,
    allowFling: state.upgrades.slime_fling,
  });
  if (!state.shopActive && player.farthest >= player.nextShopAt) {
    shopController.openShop();
  }
  if (state.shopActive) {
    return;
  }
  updateCamera();
  updateTrail(dt);
  updateGlobs(dt);
  updateChunks(dt);
  updateCoins(dt);
  updateEnemyProjectiles(dt);
  checkBossCollision_Update();
  updateEnemies({
    enemies,
    dt,
    world,
    player,
    platformBounds,
    findPlatformAt: worldController.findPlatformAt.bind(worldController),
    findPlatformById: worldController.findPlatformById.bind(worldController),
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
    spikedShoes: state.upgrades.spiked_shoes,
    onBossDefeated: handleBossDefeat,
    debug999Damage: state.debug999Damage,
  });
  if (!state.bossFightActive) {
    checkTraps();
  }
  updateDamageNumbers(dt);
  worldController.cleanupOldEntities();
  updatePlatformDebugInfo();
}

gameOverYesButton?.addEventListener('click', () => {
  if (!state.gameOver) return;
  stopGameOverSound();
  resetGame();
  gameInstance?.restartLoop();
});
gameOverNoButton?.addEventListener('click', () => {
  if (!state.gameOver) return;
  resetGame(true);
});
let trailTimer = 0;
const damageFloatSpeed = 28;
const damageLifetime = 0.8;
playerManager.applyScale();
worldController.seedWorld();

const uiManager = new UIManager({
  state,
  audio,
  player,
  onTogglePause: togglePause,
  onResetGame: resetGame,
  debugActions: {
    toggleGodMode: () => toggleGodMode(),
    addCoins: () => addDebugCoins(),
    unlockAllAbilities: () => unlockAllAbilities(),
    travelDistance: () => travelDebugDistance(),
    forceShop: () => openDebugShop(),
    toggle999Damage: () => toggle999Damage(),
  },
});
shopController.setAbilityListUpdater(() => uiManager.updateAbilityList());

const gameOverManager = new GameOverManager({
  state,
  player,
  audio,
  uiManager,
  shopManager,
  keys,
  statusEl,
  resetGame,
  restartLoop: () => gameInstance?.restartLoop(),
  yesButton: gameOverYesButton,
  noButton: gameOverNoButton,
  playGameOverSound,
  stopGameOverSound,
  stopAllSoundsExceptGameOver,
});

const inputManager = new InputManager({
  state,
  player,
  keys,
  togglePause,
  openShop: shopController.openShop.bind(shopController),
  gameOverManager,
  toggleMovementOverlay: uiManager.toggleMovementOverlay.bind(uiManager),
  toggleDebugMenu: uiManager.toggleDebugMenu.bind(uiManager),
});

const renderer = new Renderer({
  state,
  gameOverManager,
  markerSpacing: MARKER_SPACING,
  acidDebuffDuration: ACID_DEBUFF_DURATION,
  damageLifetime,
});

function togglePause(force) {
  if (state.gameOver || state.shopActive || state.levelComplete) return;
  const next = typeof force === 'boolean' ? force : !state.paused;
  if (state.paused === next) return;
  state.paused = next;
  uiManager.setPauseOverlay(state.paused);
  if (state.paused) {
    keys.clear();
    statusEl.textContent = 'Paused - press Esc to continue';
  } else {
    state.platformPauseActive = false;
  }
}

function toggleGodMode(force) {
  const next = typeof force === 'boolean' ? force : !state.godMode;
  if (state.godMode === next) return;
  state.godMode = next;
  if (next) {
    state.godModePrevHealth = state.godModePrevHealth ?? player.health;
    player.health = player.maxHealth;
    playerManager.applyScale();
  } else {
    if (state.godModePrevHealth != null) {
      player.health = Math.min(player.maxHealth, state.godModePrevHealth);
    }
    state.godModePrevHealth = null;
    playerManager.applyScale();
  }
}

function addDebugCoins(amount = 1000) {
  player.coins += amount;
}

function unlockAllAbilities() {
  UPGRADES.forEach((upgrade) => {
    if (!state.upgrades[upgrade.id]) {
      shopController.applyUpgrade(upgrade);
    }
  });
}

function travelDebugDistance(amount = 9000) {
  const targetX = clamp(player.x + amount, 0, world.width - player.w);
  player.x = targetX;
  player.prevX = targetX;
  player.farthest = Math.max(player.farthest, targetX);
  worldController.ensureWorldAhead();
}

function openDebugShop() {
  if (state.shopActive || state.bossFightActive || state.levelComplete) return;
  shopController.openShop(true);
}

function toggle999Damage() {
  state.debug999Damage = !state.debug999Damage;
  statusEl.textContent = `999 Damage Mode: ${state.debug999Damage ? 'ON' : 'OFF'}`;
}

function updateCamera() {
  const maxCameraX = Math.max(0, world.width - canvas.width);
  if (state.cinematicCameraX != null) {
    camera.x = clamp(state.cinematicCameraX, 0, maxCameraX);
    return;
  }
  const desired = player.x - viewRightMargin;
  camera.x = clamp(desired, 0, maxCameraX);
}

function updatePlatformDebugInfo() {
  state.lastPlatformStats = null;
}

function getSlimeTrailScale() {
  return Math.max(0.35, player.health / player.maxHealth);
}

function resolvePlatformCollisions(playerEntity) {
  const dropActive = (playerEntity.dropThroughTimer || 0) > 0;
  const prevBottom = playerEntity.prevY + playerEntity.h;
  const bottom = playerEntity.y + playerEntity.h;
  let grounded = false;

  if (bottom >= world.groundY) {
    playerEntity.y = world.groundY - playerEntity.h;
    playerEntity.vy = Math.min(0, playerEntity.vy);
    grounded = true;
  }

  if (!grounded && !dropActive) {
    const prevTop = playerEntity.prevY;
    const top = playerEntity.y;
    for (const plat of platforms) {
      if (playerEntity.x + playerEntity.w <= plat.x || playerEntity.x >= plat.x + plat.w) {
        continue;
      }
      if (
        playerEntity.vy >= 0 &&
        prevBottom <= plat.y + PLATFORM_SEAM_EPSILON &&
        bottom >= plat.y - PLATFORM_SEAM_EPSILON
      ) {
        playerEntity.y = plat.y - playerEntity.h;
        playerEntity.vy = 0;
        grounded = true;
        break;
      }
      if (!plat.passable && playerEntity.vy < 0 && prevTop >= plat.y + plat.h && top <= plat.y + plat.h) {
        playerEntity.y = plat.y + plat.h;
        playerEntity.vy = 0;
      }
    }
  }

  playerEntity.grounded = grounded;
  if (grounded) {
    playerEntity.dropThroughTimer = 0;
  }
}

function spawnTrailSegment() {
  const scale = getSlimeTrailScale();
  const width = 42 * scale;
  const height = 14 * scale;
  const life = 1.6 * scale;
  addTrailSegmentAt(
    player.x + player.w / 2 - width / 2,
    player.y + player.h - height,
    width,
    height,
    life,
    3.6
  );
}

function addTrailSegmentAt(x, y, width, height, life, damagePerSecond) {
  trailSegments.push({
    x,
    y,
    w: width,
    h: height,
    life,
    maxLife: life,
    damagePerSecond,
    vy: 0,
    grounded: false,
    supportId: null,
  });
}

function applyMagnetism(entity, dt) {
  if (!state.upgrades.magnet || !state.magnetRange) return;
  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;
  const entityCenterX = entity.x + entity.w / 2;
  const entityCenterY = entity.y + entity.h / 2;
  const dx = playerCenterX - entityCenterX;
  const dy = playerCenterY - entityCenterY;
  const distance = Math.hypot(dx, dy);
  const range = state.magnetRange;
  if (distance <= 0 || distance > range) return;
  const pull = (1 - distance / range) * 4800;
  const nx = dx / distance;
  const ny = dy / distance;
  entity.vx = (entity.vx ?? 0) + nx * pull * dt;
  entity.vy = (entity.vy ?? 0) + ny * pull * dt;
  entity.magnetActive = true;
  if (distance < range * 0.6) {
    const minSpeed = 780;
    entity.vx = nx * Math.max(minSpeed, Math.abs(entity.vx));
    entity.vy = ny * Math.max(minSpeed, Math.abs(entity.vy));
  }
}

function spawnSlimeGlob(direction, prevSpeed) {
  if (!direction) direction = 1;
  const baseSpeed = Math.max(320, prevSpeed);
  const launchAngle = Math.PI / 4; // 45-degree launch for clear arcing motion
  const speed = baseSpeed + 140;
  const directionSign = Math.sign(direction) || 1;
  slimeGlobs.push({
    x: player.x + player.w / 2 - 14 + direction * 18,
    y: player.y + player.h - 22,
    w: 30,
    h: 18,
    vx: Math.cos(launchAngle) * speed * directionSign,
    vy: -Math.sin(launchAngle) * speed,
    life: 2.6,
    damagePerSecond: 7.5,
    bounces: 3,
    residueTimer: 0.08,
  });
}

function spawnSlimeChunks(enemy) {
  let chunkCount = 2;
  if (enemy.maxHealth >= 30) chunkCount = 6;
  else if (enemy.maxHealth >= 20) chunkCount = 4;
  for (let i = 0; i < chunkCount; i++) {
    const angle = (i / chunkCount) * Math.PI - Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    const speed = 160 + Math.random() * 80;
    slimeChunks.push({
      x: enemy.x + enemy.w / 2 - 9,
      y: enemy.y,
      w: 18,
      h: 14,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      collected: false,
    });
}
}

function spawnCoins(enemy) {
  let count;
  if (enemy.maxHealth >= 30) {
    count = 15 + Math.floor(Math.random() * 16);
  } else if (enemy.maxHealth >= 20) {
  count = 5 + Math.floor(Math.random() * 6);
} else {
count = 1 + Math.floor(Math.random() * 3);
}
for (let i = 0; i < count; i++) {
  const angle = (Math.random() * Math.PI) - Math.PI / 2;
  const speed = 120 + Math.random() * 70;
  coins.push({
    x: enemy.x + enemy.w / 2 - 8,
    y: enemy.y,
    w: 16,
    h: 16,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    value: 1,
  });
}
}

function updateTrail(dt) {
  let corrosionActive = false;
  trailTimer -= dt;
  if (trailTimer <= 0) {
    spawnTrailSegment();
    trailTimer = TRAIL_INTERVAL;
  }

for (let i = trailSegments.length - 1; i >= 0; i--) {
  const seg = trailSegments[i];
  let supportingPlat = seg.supportId != null ? worldController.findPlatformById(seg.supportId) : null;
  if (seg.grounded && seg.supportId != null) {
    if (!supportingPlat) {
      seg.grounded = false;
      seg.supportId = null;
    } else {
    const updatedPlat = worldController.corrodePlatform(supportingPlat, seg, dt);
    if (!updatedPlat) {
      seg.grounded = false;
      seg.supportId = null;
      supportingPlat = null;
    } else {
    supportingPlat = updatedPlat;
    seg.supportId = supportingPlat.id;
    seg.vy = 0;
    seg.y = supportingPlat.y - seg.h;
    corrosionActive = true;
  }
}
}

if (!seg.grounded) {
  seg.vy += world.gravity * 0.6 * dt;
  seg.y += seg.vy * dt;
  let landed = false;
  if (seg.y + seg.h >= world.groundY) {
    seg.y = world.groundY - seg.h;
    seg.vy = 0;
    seg.grounded = true;
    seg.supportId = null;
    landed = true;
  } else {
  for (const plat of platforms) {
    if (seg.x + seg.w > plat.x && seg.x < plat.x + plat.w &&
    seg.y + seg.h > plat.y && seg.y < plat.y + plat.h) {
      const landedPlat = worldController.corrodePlatform(plat, seg, dt);
      if (!landedPlat) {
        continue;
      }
    seg.y = landedPlat.y - seg.h;
    seg.vy = 0;
    seg.grounded = true;
    seg.supportId = landedPlat.id;
    corrosionActive = true;
    landed = true;
    break;
  }
}
}
if (!landed) {
  seg.supportId = null;
}
}
seg.life -= dt;
if (seg.life <= 0) {
  trailSegments.splice(i, 1);
}
}
worldController.removeCorrodedPlatforms();
if (!corrosionActive) {
  stopCorrosionSound();
}
}

function updateGlobs(dt) {
  for (let i = slimeGlobs.length - 1; i >= 0; i--) {
    const glob = slimeGlobs[i];
    glob.vy += world.gravity * 0.9 * dt;
    glob.x += glob.vx * dt;
    glob.y += glob.vy * dt;

    let landed = false;
    let surfaceY = null;
    if (glob.vy >= 0) {
      if (glob.y + glob.h >= world.groundY) {
        surfaceY = world.groundY;
      } else {
        for (const plat of platforms) {
          if (
            glob.x + glob.w > plat.x &&
            glob.x < plat.x + plat.w &&
            glob.y + glob.h >= plat.y - 4 &&
            glob.y + glob.h <= plat.y + plat.h
          ) {
            if (surfaceY === null || plat.y < surfaceY) {
              surfaceY = plat.y;
            }
          }
        }
      }
    }

    if (surfaceY !== null) {
      glob.y = surfaceY - glob.h;
      if (glob.bounces > 0 && Math.abs(glob.vy) > 120) {
        glob.vy = -glob.vy * 0.45;
        glob.vx *= 0.82;
        glob.bounces -= 1;
      } else {
        glob.vy = 0;
      }
      landed = true;
    }

    glob.residueTimer -= dt;
    if (glob.residueTimer <= 0) {
      const segWidth = 24;
      const segHeight = 10;
      const trailScale = getSlimeTrailScale();
      const segLife = 1.2 * (0.6 + trailScale);
      addTrailSegmentAt(
        glob.x + glob.w / 2 - segWidth / 2,
        glob.y + glob.h - segHeight / 2,
        segWidth,
        segHeight,
        segLife,
        glob.damagePerSecond * 0.8
      );
      glob.residueTimer = landed ? 0.08 : 0.15;
    }

    glob.life -= dt;
    if (glob.life <= 0) {
      slimeGlobs.splice(i, 1);
    }
}
}

function updateChunks(dt) {
  for (let i = slimeChunks.length - 1; i >= 0; i--) {
    const chunk = slimeChunks[i];
    chunk.magnetActive = false;
    chunk.vy += world.gravity * 0.9 * dt;
    chunk.x += chunk.vx * dt;
    chunk.y += chunk.vy * dt;

    const wasAboveGround = chunk.y + chunk.h <= world.groundY + 1;
        if (chunk.y + chunk.h >= world.groundY) {
          chunk.y = world.groundY - chunk.h;
          chunk.vy = 0;
          if (!chunk.magnetActive) {
            chunk.vx *= 0.7;
          }
        } else {
          let bounced = false;
          for (const trap of traps) {
        if (chunk.x + chunk.w > trap.x && chunk.x < trap.x + trap.w &&
          chunk.y + chunk.h > trap.y && chunk.y < trap.y + trap.h) {
          chunk.y = trap.y - chunk.h;
              chunk.vy = -Math.abs(chunk.vy * 0.4);
              const trapCenter = trap.x + trap.w / 2;
              const chunkCenter = chunk.x + chunk.w / 2;
              const pushDir = chunkCenter < trapCenter ? -1 : 1;
              const baseSpeed = Math.max(60, Math.abs(chunk.vx) * 0.6 + 40);
              if (!chunk.magnetActive) {
                chunk.vx = pushDir * baseSpeed;
              }
              bounced = true;
              break;
            }
  }
          if (!bounced && wasAboveGround && chunk.y + chunk.h >= world.groundY) {
            chunk.y = world.groundY - chunk.h;
            chunk.vy = 0;
            if (!chunk.magnetActive) {
              chunk.vx *= 0.7;
            }
          }
        }

        applyMagnetism(chunk, dt);

        if (overlap(player, chunk)) {
  slimeChunks.splice(i, 1);
  playerManager.heal(1);
  playChunkSound();
}
}
}

function updateCoins(dt) {
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.magnetActive = false;
    coin.vy += world.gravity * 0.9 * dt;
    coin.x += coin.vx * dt;
    coin.y += coin.vy * dt;

        if (coin.y + coin.h >= world.groundY) {
          coin.y = world.groundY - coin.h;
          coin.vy = -Math.abs(coin.vy * 0.4);
          if (!coin.magnetActive) {
            coin.vx *= 0.7;
          }
        } else {
          for (const trap of traps) {
      if (coin.x + coin.w > trap.x && coin.x < trap.x + trap.w &&
      coin.y + coin.h > trap.y && coin.y < trap.y + trap.h) {
        coin.y = trap.y - coin.h;
              coin.vy = -Math.abs(coin.vy * 0.5);
              const trapCenter = trap.x + trap.w / 2;
              const coinCenter = coin.x + coin.w / 2;
              const pushDir = coinCenter < trapCenter ? -1 : 1;
              const baseSpeed = Math.max(50, Math.abs(coin.vx) * 0.5 + 35);
              if (!coin.magnetActive) {
                coin.vx = pushDir * baseSpeed;
              }
            }
          }
        }

        applyMagnetism(coin, dt);

        if (overlap(player, coin)) {
  coins.splice(i, 1);
  const gain = Math.max(1, Math.round(coin.value * player.coinMultiplier));
  player.coins += gain;
  playCoinSound();
}
}
}

function checkBossCollision_Update() {
  if (!state.boss || !player.alive) return;
  
  // Check if player collides with boss using morphing-aware collision detection
  if (checkBossCollision(state.boss, player)) {
    // Apply contact damage to player
    const bossContactDamage = state.boss.damage || 5;
    hurtPlayer(bossContactDamage, state.boss.x + state.boss.w / 2, state.boss);
  }
}

function updateEnemyProjectiles(dt) {
  const minX = camera.x - 200;
  const maxX = camera.x + canvas.width + 200;
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const proj = enemyProjectiles[i];
    if (proj.reflected === undefined) {
      proj.reflected = false;
      proj.trailTimer = 0;
    }
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    if (proj.x + proj.w < minX || proj.x > maxX || proj.y > canvas.height + 200 || proj.y + proj.h < -200) {
      enemyProjectiles.splice(i, 1);
      continue;
    }
    // Only boss projectiles pierce through platforms and destroy them
    if (proj.type === 'shockwave') {
      for (let p = platforms.length - 1; p >= 0; p--) {
        const plat = platforms[p];
        if (proj.x + proj.w > plat.x && proj.x < plat.x + plat.w &&
          proj.y + proj.h > plat.y && proj.y < plat.y + plat.h) {
          platforms.splice(p, 1);
        }
      }
    }
    if (proj.y + proj.h >= world.groundY) {
      if (proj.ignoreGround) {
        proj.y = world.groundY - proj.h;
        proj.vy = 0;
      } else {
        enemyProjectiles.splice(i, 1);
        continue;
      }
    }

    if (proj.reflected) {
      let enemyHit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (overlap(enemy, proj)) {
          // Don't damage boss if invulnerable
          if (!(enemy.isBoss && enemy.invulnerabilityTimer > 0)) {
            enemy.health -= proj.damage ?? 1;
            spawnDamageNumber(enemy.x + enemy.w / 2, enemy.y, proj.damage ?? 1, `enemy-${enemy.id}`);
          }
          if (enemy.health <= 0) {
            playEnemyDeathSound();
            spawnSlimeChunks(enemy);
            spawnCoins(enemy);
            enemies.splice(j, 1);
          }
          enemyHit = true;
          break;
        }
      }
      if (enemyHit) {
        enemyProjectiles.splice(i, 1);
        continue;
      }
      proj.trailTimer -= dt;
      if (proj.trailTimer <= 0) {
        const trailWidth = 18;
        const trailHeight = 8;
        addTrailSegmentAt(
          proj.x + proj.w / 2 - trailWidth / 2,
          proj.y + proj.h / 2 - trailHeight / 2,
          trailWidth,
          trailHeight,
          0.7,
          2.4
        );
        proj.trailTimer = 0.06;
      }
    }

    if (overlap(player, proj)) {
      if (player.wallMode) {
        const playerCenter = player.x + player.w / 2;
        const projCenter = proj.x + proj.w / 2;
        const outDir = projCenter < playerCenter ? -1 : 1;
        const speed = Math.max(220, Math.hypot(proj.vx, proj.vy));
        proj.vx = speed * outDir;
        proj.vy = -Math.abs(proj.vy) * 0.2;
        proj.reflected = true;
        proj.trailTimer = 0.03;
        proj.x = outDir === -1 ? player.x - proj.w - 2 : player.x + player.w + 2;
        proj.y = Math.min(proj.y, player.y + player.h - proj.h - 2);
        continue;
      }
      const deathMsg = proj.type === 'shockwave' ? 'Hit by boss shockwave' : 'Hit by enemy projectile';
      hurtPlayer(proj.damage, proj.x + proj.w / 2, { deathMessage: deathMsg });
      continue;
    }
  }
}

function spawnDamageNumber(x, y, damage, key = 'global') {
  const now = performance.now();
  const state = damageLimitStates[key] ?? { nextReset: now + 1000, count: 0 };
  if (now >= state.nextReset) {
    state.count = 0;
    state.nextReset = now + 1000;
  }
if (state.count >= 2) {
  damageLimitStates[key] = state;
  return;
}
state.count += 1;
damageLimitStates[key] = state;
const rounded = Math.max(1, Math.round(Math.abs(damage)));
damageNumbers.push({
  x,
  y,
  life: damageLifetime,
  value: rounded,
});
}

function updateDamageNumbers(dt) {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const num = damageNumbers[i];
    num.y -= damageFloatSpeed * dt;
    num.life -= dt;
    if (num.life <= 0) {
      damageNumbers.splice(i, 1);
    }
}
}

function hurtPlayer(amount, sourceX, source) {
  if (state.godMode || player.invulnTimer > 0 || !player.alive) return;
  if (player.shieldActive) {
    player.shieldActive = false;
  } else {
  player.health -= amount;
  spawnDamageNumber(player.x + player.w / 2, player.y, amount, 'player');
}
playHitSound();
player.invulnTimer = 1;
const dir = sourceX >= player.x + player.w / 2 ? -1 : 1;
player.vx = dir * player.maxSpeed * 0.5;
player.vy = -player.jumpSpeed * 0.6;
player.grounded = false;
player.squish = Math.min(0.35, player.squish + 0.22);
player.x += dir * player.w * 0.5;
clampPlayerHorizontal();
playerManager.applyScale();
if (player.health <= 0) {
  player.health = 0;
  player.alive = false;
  state.deathMessage = source?.deathMessage || 'Unknown cause';
  recordHighScore(player.farthest);
  gameOverManager.trigger();
}
}

function clampPlayerHorizontal() {
  player.x = clamp(player.x, 0, world.width - player.w);
}

function checkTraps() {
  for (const trap of traps) {
    if (overlap(player, trap)) {
      hurtPlayer(trap.damage ?? 1, trap.x + trap.w / 2, trap);
    }
  }
}

function checkBossSpawn() {
  if (state.bossFightActive || state.levelComplete || state.gameOver) return;
  if (player.farthest < BOSS_TRIGGER_DISTANCE) return;
  spawnBoss();
}

function spawnBoss() {
  const boss = createBossEnemy({ canvas, world, player });
  state.boss = boss;
  state.bossFightActive = true;
  state.bossDefeated = false;
  state.shopActive = false;
  shopManager.close();
  enemies.length = 0;
  enemyProjectiles.length = 0;
  coins.length = 0;
  slimeChunks.length = 0;
  slimeGlobs.length = 0;
  enemies.push(boss);
  player.nextShopAt = Infinity;
  statusEl.textContent = 'A colossal slime descends...';
  audio.playBossMusic?.();
  startBossCinematic(boss);
}

function startBossCinematic(boss) {
  const cine = {
    phase: 'toBoss',
    timer: 0,
    toBossDuration: 2,
    roarDuration: 1.4,
    backDuration: 1.6,
    startCameraX: camera.x,
    zoom: 1.2,
    bossCameraX: getBossCameraX(boss),
    returnStartCameraX: null,
  };
  state.cinematic = cine;
  state.cinematicCameraX = camera.x;
  state.cameraZoom = 1;
  state.cameraZoomTarget = 1;
  state.bossRoarWave = null;
  if (boss) {
    boss.awake = false;
    boss.bossPhase = 'idle';
    boss.bossTimer = 0;
  }
}

function updateCinematic(dt) {
  state.cameraZoomTarget = state.cameraZoomTarget || 1;
  
  // Handle defeat cinematic
  if (state.defeatCinematic) {
    updateDefeatCinematic(dt);
    return;
  }
  
  const cine = state.cinematic;
  if (!cine) {
    state.cameraZoomTarget = 1;
    state.cinematicCameraX = null;
    if (state.bossRoarWave) {
      state.bossRoarWave.timer += dt;
      if (state.bossRoarWave.timer >= state.bossRoarWave.duration) {
        state.bossRoarWave = null;
        if (state.boss) state.boss.roarActive = false;
      }
    }
    state.cameraZoom += (state.cameraZoomTarget - state.cameraZoom) * Math.min(1, dt * 5);
    return;
  }
  const boss = state.boss;
  if (!boss) {
    finishBossCinematic(true);
    return;
  }
  switch (cine.phase) {
    case 'toBoss': {
      cine.timer += dt;
      const progress = Math.min(1, cine.timer / cine.toBossDuration);
      const targetCam = getBossCameraX(boss);
      state.cinematicCameraX = lerp(cine.startCameraX, targetCam, progress);
      state.cameraZoomTarget = lerp(1, cine.zoom, progress);
      if (cine.timer >= cine.toBossDuration) {
        cine.phase = 'roar';
        cine.timer = 0;
        state.cinematicCameraX = targetCam;
        state.cameraZoomTarget = cine.zoom;
        boss.roarActive = true;
        state.bossRoarWave = { timer: 0, duration: 1.2 };
        audio.playEffect('bossRoar');
      }
      break;
    }
    case 'roar': {
      cine.timer += dt;
      state.cinematicCameraX = getBossCameraX(boss);
      state.cameraZoomTarget = cine.zoom;
      if (state.bossRoarWave) {
        state.bossRoarWave.timer += dt;
        if (state.bossRoarWave.timer >= state.bossRoarWave.duration) {
          state.bossRoarWave = null;
          boss.roarActive = false;
        }
      }
      if (cine.timer >= cine.roarDuration) {
        cine.phase = 'back';
        cine.timer = 0;
        cine.returnStartCameraX = state.cinematicCameraX;
        boss.roarActive = false;
      }
      break;
    }
    case 'back':
    default: {
      cine.timer += dt;
      const progress = Math.min(1, cine.timer / cine.backDuration);
      const playerCam = clamp(player.x - viewRightMargin, 0, Math.max(0, world.width - canvas.width));
      const startCam = cine.returnStartCameraX ?? playerCam;
      state.cinematicCameraX = lerp(startCam, playerCam, progress);
      state.cameraZoomTarget = lerp(cine.zoom, 1, progress);
      if (cine.timer >= cine.backDuration) {
        finishBossCinematic();
      }
      break;
    }
  }
  state.cameraZoom += (state.cameraZoomTarget - state.cameraZoom) * Math.min(1, dt * 5);
}

function finishBossCinematic(skipAwakening = false) {
  state.cinematic = null;
  state.cinematicCameraX = null;
  state.cameraZoomTarget = 1;
  state.cameraZoom = 1;
  state.bossRoarWave = null;
  if (!skipAwakening && state.boss) {
    state.boss.awake = true;
    state.boss.bossPhase = 'windup';
    state.boss.bossTimer = 0;
  }
}

function getBossCameraX(boss) {
  const maxCameraX = Math.max(0, world.width - canvas.width);
  const desired = boss.x + boss.w / 2 - canvas.width / 2;
  return clamp(desired, 0, maxCameraX);
}

function updateDefeatCinematic(dt) {
  if (!state.defeatCinematic) return;
  
  const def = state.defeatCinematic;
  // Use boss reference from defeat cinematic data, falls back to state.boss
  let boss = state.boss;
  if (!boss && def.bossRef) {
    boss = def.bossRef;
  }
  
  // Only need boss reference for phases before rain completes
  if (!boss && def.phase !== 'rain') return;
  
  def.timer += dt;
  
  switch (def.phase) {
    case 'pause': {
      if (def.timer >= def.pauseDuration) {
        console.log('⏸️  PAUSE COMPLETE → PAN PHASE');
        def.phase = 'pan';
        def.timer = 0;
      }
      break;
    }
    
    case 'pan': {
      const progress = Math.min(1, def.timer / def.panDuration);
      const currentZoom = lerp(1, 1.3, progress);
      const zoomedCanvasWidth = canvas.width / currentZoom;
      
      const maxCameraX = Math.max(0, world.width - zoomedCanvasWidth);
      const bossCenter = boss.x + boss.w / 2;
      const targetCam = clamp(bossCenter - zoomedCanvasWidth / 2, 0, maxCameraX);
      
      state.cinematicCameraX = lerp(camera.x, targetCam, progress);
      state.cameraZoomTarget = currentZoom;
      
      if (def.timer >= def.panDuration) {
        console.log('🎬 PAN COMPLETE → MORPH PHASE');
        def.phase = 'morph';
        def.timer = 0;
        boss.defeatMorphMode = 'amoeba';
      }
      break;
    }
    
    case 'morph': {
      const progress = Math.min(1, def.timer / def.morphDuration);
      boss.defeatMorphProgress = progress;
      
      if (def.timer >= def.morphDuration) {
        console.log('🌊 MORPH COMPLETE → SWELL PHASE');
        def.phase = 'swell';
        def.timer = 0;
      }
      break;
    }
    
    case 'swell': {
      const progress = Math.min(1, def.timer / def.swellDuration);
      boss.defeatSwellProgress = progress;
      
      if (def.timer >= def.swellDuration) {
        console.log('💥 SWELL COMPLETE → EXPLOSION PHASE');
        def.phase = 'explosion';
        def.timer = 0;
        triggerBossExplosion(def, boss);
      }
      break;
    }
    
    case 'explosion': {
      if (state.whiteFlash) {
        state.whiteFlash.timer += dt;
        if (state.whiteFlash.timer >= state.whiteFlash.duration) {
          state.whiteFlash = null;
        }
      }
      
      if (def.timer >= def.explosionDuration) {
        console.log('✨ EXPLOSION COMPLETE → RAIN PHASE (Game Resume)');
        def.phase = 'rain';
        def.timer = 0;
        boss.dead = true;
        boss.invisible = true;
        player.health = player.maxHealth;
        playerManager.applyScale();
        
        // Clear all obstacles during rain collection phase
        state.enemies.length = 0;
        state.platforms.length = 0;
        state.traps.length = 0;
        state.enemyProjectiles.length = 0;
        console.log('🧹 Cleared enemies, platforms, traps, and projectiles for rain collection');
        
        spawnDefeatRain(def);
      }
      break;
    }
    
    case 'rain': {
      // Initialize camera reset on first rain frame
      if (!def.rainStarted) {
        def.rainStarted = true;
        console.log('🌧️  RAIN STARTED - Boss deleted from game');
        // Remove boss from enemies array
        const bossIndex = enemies.findIndex(e => e.id === boss.id);
        if (bossIndex !== -1) {
          enemies.splice(bossIndex, 1);
        }
        // Clear boss reference
        state.boss = null;
        // Set camera reset targets (zoom back out and pan to player)
        state.cameraZoomTarget = 1;
        def.rainCameraResetDuration = 0.8; // 0.8 seconds to reset camera
        def.rainCameraResetTimer = 0;
        // Resume the game
        state.paused = false;
        console.log('▶️  GAME RESUMED - Resetting camera...');
      }
      
      // Reset camera during first part of rain phase
      if (def.rainCameraResetTimer < (def.rainCameraResetDuration || 0)) {
        def.rainCameraResetTimer += dt;
        const cameraResetProgress = Math.min(1, def.rainCameraResetTimer / def.rainCameraResetDuration);
        
        // Pan camera back to player
        const playerCameraX = player.x + player.w / 2 - canvas.width / 2;
        const maxCameraX = Math.max(0, world.width - canvas.width);
        const targetCameraX = clamp(playerCameraX, 0, maxCameraX);
        
        state.cinematicCameraX = lerp(state.cinematicCameraX || camera.x, targetCameraX, cameraResetProgress);
      } else {
        // After reset completes, release cinematic camera control
        state.cinematicCameraX = null;
        console.log('📹 Camera reset complete - Back to player');
      }
      
      // Spawn rain items rapidly within first 5 seconds (cap at 40 total)
      if (def.timer < 5) {
        def.rainSpawnTimer += dt;
        const itemsToSpawn = Math.floor(def.rainSpawnTimer * def.rainSpawnRate);
        if (itemsToSpawn > 0 && def.rainItemsSpawned < 40) {
          const canSpawn = Math.min(itemsToSpawn, 40 - def.rainItemsSpawned);
          console.log(`🌧️  Rain phase: spawning ${canSpawn} items (timer: ${def.rainSpawnTimer.toFixed(2)}, rate: ${def.rainSpawnRate.toFixed(2)}, total: ${def.rainItemsSpawned}/${40})`);
          for (let i = 0; i < canSpawn; i++) {
            spawnSingleRainItem(def);
          }
          def.rainSpawnTimer -= itemsToSpawn / def.rainSpawnRate;
        }
      }
      
      updateDefeatRain(def, dt);
      
      // Check if all rain items collected (no time limit, just wait for collection)
      const totalRainItems = state.slimeChunks.filter(c => c.rainItem).length + state.coins.filter(c => c.rainItem).length;
      if (totalRainItems === 0 && def.rainItemsSpawned > 0) {
        console.log(`🎉 RAIN COMPLETE → All items collected (${def.rainItemsCollected}/${def.rainItemsSpawned})`);
        finishDefeatCinematic();
      }
      break;
    }
  }
  
  state.cameraZoom += (state.cameraZoomTarget - state.cameraZoom) * Math.min(1, dt * 5);
}

function triggerBossExplosion(def, boss) {
  state.whiteFlash = { timer: 0, duration: 0.15 };
  
  const particleCount = 40;
  const centerX = boss.x + boss.w / 2;
  const centerY = boss.y + boss.h / 2;
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 200 + Math.random() * 400;
    def.explosionParticles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8,
      maxLife: 0.8,
      size: 4 + Math.random() * 8,
      color: '#20d9d9',
    });
  }
}

function spawnDefeatRain(def) {
  console.log('📧 spawnDefeatRain called - spawning initial rain items');
  def.rainItemsSpawned = 0;
  for (let i = 0; i < 3; i++) {
    spawnSingleRainItem(def);
  }
  console.log(`   Total rain items spawned: ${def.rainItemsSpawned}`);
}

function spawnSingleRainItem(def) {
  const isChunk = Math.random() > 0.55;
  const screenStartX = canvas.width * 0.35;
  const screenEndX = canvas.width * 0.65;
  const x = Math.random() * (screenEndX - screenStartX) + screenStartX + camera.x;
  const y = -50;
  const initialVy = 35;
  
  if (isChunk) {
    state.slimeChunks.push({
      x,
      y,
      w: 18,
      h: 14,
      vx: (Math.random() - 0.5) * 80,
      vy: initialVy,
      life: 25,
      rainItem: true,
    });
    def.rainItemsSpawned++;
    console.log(`✨ Spawned chunk at x=${Math.round(x)}, vy=${initialVy}`);
  } else {
    state.coins.push({
      x,
      y,
      w: 16,
      h: 16,
      vx: (Math.random() - 0.5) * 80,
      vy: initialVy,
      life: 25,
      rainItem: true,
    });
    def.rainItemsSpawned++;
    console.log(`✨ Spawned coin at x=${Math.round(x)}, vy=${initialVy}`);
  }
}

function updateDefeatRain(def, dt) {
  const initialChunks = state.slimeChunks.length;
  const initialCoins = state.coins.length;
  
  // Update rain chunks
  for (let i = state.slimeChunks.length - 1; i >= 0; i--) {
    const chunk = state.slimeChunks[i];
    chunk.vy += world.gravity * 0.8 * dt;
    chunk.y += chunk.vy * dt;
    chunk.x += chunk.vx * dt;
    chunk.life -= dt;
    
    // Check if chunk hit ground
    if (chunk.y + chunk.h >= world.groundY) {
      chunk.y = world.groundY - chunk.h;
      chunk.vy = 0;
    }
    
    // Check collision with player
    if (overlap(player, chunk)) {
      player.maxHealth += 10;
      player.health = Math.min(player.health + 10, player.maxHealth);
      playChunkSound();
      if (chunk.rainItem) {
        def.rainItemsCollected++;
      }
      state.slimeChunks.splice(i, 1);
      continue;
    }
    
    // Remove if life expired
    if (chunk.life <= 0) {
      state.slimeChunks.splice(i, 1);
    }
  }
  
  // Update rain coins
  for (let i = state.coins.length - 1; i >= 0; i--) {
    const coin = state.coins[i];
    coin.vy += world.gravity * 0.8 * dt;
    coin.y += coin.vy * dt;
    coin.x += coin.vx * dt;
    coin.life -= dt;
    
    // Check if coin hit ground
    if (coin.y + coin.h >= world.groundY) {
      coin.y = world.groundY - coin.h;
      coin.vy = 0;
    }
    
    // Check collision with player
    if (overlap(player, coin)) {
      state.money += 5;
      playCoinSound();
      if (coin.rainItem) {
        def.rainItemsCollected++;
      }
      state.coins.splice(i, 1);
      continue;
    }
    
    // Remove if life expired
    if (coin.life <= 0) {
      state.coins.splice(i, 1);
    }
  }
  
  // Update explosion particles
  for (let i = def.explosionParticles.length - 1; i >= 0; i--) {
    const p = def.explosionParticles[i];
    p.vy += world.gravity * 0.6 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    
    if (p.life <= 0) {
      def.explosionParticles.splice(i, 1);
    }
  }
  
  if (initialChunks > 0 || initialCoins > 0 || def.explosionParticles.length > 0) {
    console.log(`   Rain - Chunks: ${state.slimeChunks.length} (was ${initialChunks}), Coins: ${state.coins.length} (was ${initialCoins}), Particles: ${def.explosionParticles.length}`);
  }
}

function finishDefeatCinematic() {
  console.log('🏆 LEVEL COMPLETE - Sanctuary Secured');
  // Clean up any remaining boss projectiles
  if (state.boss) {
    for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
      if (state.enemyProjectiles[i].enemySource === state.boss) {
        state.enemyProjectiles.splice(i, 1);
      }
    }
  }
  state.defeatCinematic = null;
  state.cinematicCameraX = null;
  state.cameraZoomTarget = 1;
  state.cameraZoom = 1;
  state.boss = null;
  state.bossDefeated = true;
  state.bossFightActive = false;
  state.levelComplete = true;
  state.levelCompleteTimer = 0;
  state.paused = false;
  uiManager.setLevelCompleteVisible(true);
  statusEl.textContent = 'Level Complete - press Play Again';
  audio.startMusic?.();
}

function handleBossDefeat() {
  if (state.levelComplete || state.defeatCinematic) return;
  console.log('🔴 BOSS DEFEAT TRIGGERED');
  audio.stopBossMusic?.();
  state.paused = true;
  const bossRef = state.boss;
  state.defeatCinematic = {
    phase: 'pause',
    timer: 0,
    pauseDuration: 0.4,
    panDuration: 1.2,
    morphDuration: 1.5,
    swellDuration: 1.0,
    explosionDuration: 0.3,
    rainDuration: 15,
    rainStartY: -100,
    rainSpawnRate: 40 / 5, // 40 items over 5 seconds = 8 per second
    rainSpawnTimer: 0,
    explosionParticles: [],
    rainItemsSpawned: 0,
    rainItemsCollected: 0,
    bossRef: bossRef,
    bossStartX: bossRef?.x ?? 0,
    bossStartY: bossRef?.y ?? 0,
    playerStartX: player.x,
  };
}

function resetBossState() {
  state.boss = null;
  state.bossFightActive = false;
  state.bossDefeated = false;
  state.cinematic = null;
  state.cinematicCameraX = null;
  state.defeatCinematic = null;
  state.bossRoarWave = null;
  state.cameraZoomTarget = 1;
  state.cameraZoom = 1;
  audio.stopBossMusic?.();
}

function playEnemyDeathSound() {
  audio.playEffect('death');
}

function playJumpSound() {
  audio.playEffect('jump');
}

function playCoinSound() {
  audio.playEffect('coin');
}

function playChunkSound() {
  audio.playEffect('chunk');
}

function playGameOverSound() {
  audio.playEffect('gameOver');
}

function stopGameOverSound() {
  audio.stopLoop('gameOver');
}

function playHitSound() {
  audio.playEffect('hit');
}

function stopAllSoundsExceptGameOver() {
  audio.stopAllExceptGameOver();
}

function resumeBackgroundMusic() {
  audio.resumeMusic();
}

function playCorrosionSound() {
  audio.ensureLoop('corrosion');
}

function stopCorrosionSound() {
  audio.stopLoop('corrosion');
}


function playerDamagePerTick() {
  if (player.health >= 40) return 5;
  if (player.health >= 30) return 4;
  if (player.health >= 20) return 3;
  if (player.health >= 10) return 2;
  return 1;
}

function swallowShield() {
  if (player.health < 11 || player.shieldActive) return;
  player.health -= 10;
  player.shieldActive = true;
  playerManager.applyScale();
}

function recordHighScore(distance) {
  if (distance <= 0) return;
  if (highScores.length < 3 || distance > highScores[highScores.length - 1]) {
    highScores.push(distance);
    highScores.sort((a, b) => b - a);
    if (highScores.length > 3) {
      highScores.length = 3;
    }
}
}

function resetGame(toHome = false) {
  shopController.resetUpgradeFlags();
  resetBossState();
  state.levelComplete = false;
  state.levelCompleteTimer = 0;
  uiManager.setLevelCompleteVisible(false);
  state.paused = false;
  const savedCoins = player.coins;
  const baseMaxHealth = PLAYER_CONFIG.maxHealth;
  const baseCoinMultiplier = 1;
  state.gameOver = false;
  gameOverManager.resetState();
  uiManager.setGameOverControlsVisible(false);
  stopGameOverSound();
  statusEl.textContent = '';
  state.shopActive = false;
  shopManager.close();
  state.slimeFlingCooldown = 0;
  state.slimeFlingCooldownMax = 0;
  trailTimer = 0;
  trailSegments.length = 0;
  slimeChunks.length = 0;
  coins.length = 0;
  slimeGlobs.length = 0;
  enemyProjectiles.length = 0;
  platforms.length = 0;
  enemies.length = 0;
  traps.length = 0;
  damageNumbers.length = 0;
  corrodedPlatformIds.clear();
  platformBounds.clear();
  state.room.reset();
  state.generatedUntil = 0;
  // Reset world controller counters to ensure proper regeneration
  worldController.platformIdCounter = 0;
  worldController.enemyIdCounter = 0;
  world.width = canvas.width * 1.5;
  camera.x = 0;
  const newCoins = toHome ? 0 : savedCoins;
  const freshPlayer = new Player(PLAYER_CONFIG, world, SHOP_INTERVAL);
  Object.keys(player).forEach((key) => {
    delete player[key];
  });
  Object.assign(player, freshPlayer);
  player.maxHealth = baseMaxHealth;
  player.health = Math.min(baseMaxHealth, PLAYER_CONFIG.startingHealth);
  player.coins = newCoins;
  player.coinMultiplier = baseCoinMultiplier;
  player.regenUnlocked = false;
  player.nextShopAt = SHOP_INTERVAL;
  playerManager.applyScale();
  player.y = world.groundY - player.h;
  player.prevY = player.y;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
  player.wallMode = false;
  player.ducking = false;
  resolvePlatformCollisions(player);
  playerManager.resetMovementState();
  player.farthest = 0;
  worldController.seedWorld();
  if (toHome) {
    state.homeScreenActive = true;
    uiManager.setHomeScreenVisible(true);
    audio.stopLoop?.('music');
    audio.playHomeMusic?.();
  } else {
    state.homeScreenActive = false;
    uiManager.setHomeScreenVisible(false);
    audio.startMusic?.();
  }
}

function triggerBossCinematicTeleport() {
  if (state.gameOver || state.levelComplete) return;
  player.x = 20000;
  player.prevX = player.x;
  player.prevY = player.y;
  player.farthest = Math.max(player.farthest, player.x);
  playerManager.resetMovementState();
  resolvePlatformCollisions(player);
  checkBossSpawn();
  if (!state.bossFightActive) {
    spawnBoss();
  }
}

gameInstance = new Game(update, renderer);

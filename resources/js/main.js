import { CONSTANTS, ENEMY_CONFIG } from './config/index.js';
import { AudioManager, AUDIO_TRACKS } from './audioManager.js';
import { ShopManager, SHOP_INTERVAL } from './shopManager.js';
import { GameState } from './gameState.js';
import { createEnemy, createBossEnemy, updateEnemies } from './enemy.js';
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
import { RoomController } from './roomController.js';
import { eventBus } from './core/EventBus.js';

// Enable event debugging during development (set to false in production)
// eventBus.setDebug(true);

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
// Initialize mutation-only abilities
state.upgrades.acid_trail = false;
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
const roomController = new RoomController();
state.audio = audio;

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

function getSlimeFlingCooldown() {
  return state.slimeFlingCooldown;
}

function setSlimeFlingCooldown(value) {
  state.slimeFlingCooldown = value;
  state.slimeFlingCooldownMax = value;
}

function lerp(a, b, t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return a + (b - a) * clamped;
}

function update(dt) {
  if (state.homeScreenActive) {
    statusEl.textContent = 'Home - click Start to run';
    return;
  }
  
  // Use room controller to handle room-specific updates
  if (roomController.isTutorial()) {
    statusEl.textContent = 'Opening Cutscene - Explore the poison pool (Press ENTER to continue)';
    roomController.updateRoom(dt, state, world, canvas, {
      player,
      platforms,
      enemies,
      trailSegments,
      slimeGlobs,
      slimeChunks,
      coins,
      enemyProjectiles,
      damageNumbers,
      updatePlayerMovement,
      updateTrail,
      updateGlobs,
      updateChunks,
      updateCoins,
      updateEnemyProjectiles,
      updateEnemies,
      updatePoisonParticles,
      startPoisonEmission,
      checkPlayerInPoisonPool,
      autoCloseDialogIfTooFar,
      updateCutsceneCamera,
      updateOpeningCutscene,
      playJumpSound,
      spawnSlimeGlob,
      getSlimeFlingCooldown: getSlimeFlingCooldown,
      setSlimeFlingCooldown: setSlimeFlingCooldown,
      mutateSlime,
      playerManager,
      worldController,
    });
    return;
  }
  
  if (state.gameOver) {
    gameOverState.animTime += dt;
    gameOverManager.updateTears(dt);
    statusEl.textContent = 'Game Over - press Y to continue';
    return;
  }
  
  // Log first frame to confirm update is being called
  if (!state.cutsceneDebugLogged) {
    console.log('ℹ️ First update frame after cutscene check - state.openingCutscene:', state.openingCutscene);
    state.cutsceneDebugLogged = true;
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
  player.mutationTimer = Math.max(0, player.mutationTimer - dt);
  
  // Update mutation cutscene if active
  if (state.mutationCutscene) {
    updateMutationCutscene(dt);
    // Update camera zoom smoothly
    const zoomDiff = state.cameraZoomTarget - state.cameraZoom;
    state.cameraZoom += zoomDiff * (1 - Math.pow(0.95, dt * 60)); // Smooth lerp
    
    if (!state.mutationDebugLogged2) {
      console.log('🔍 [MAIN LOOP] Mutation active during main game, zoom:', state.cameraZoom.toFixed(2));
      state.mutationDebugLogged2 = true;
    }
    
    // Only update chunks and camera during cutscene, skip other updates
    updateCamera();
    updateChunks(dt);
    
    // Update mutation cutscene particles
    if (state.mutationCutsceneParticles && state.mutationCutsceneParticles.length > 0) {
      for (let i = state.mutationCutsceneParticles.length - 1; i >= 0; i--) {
        const p = state.mutationCutsceneParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt; // Gravity
        p.life -= dt;
        if (p.life <= 0) {
          state.mutationCutsceneParticles.splice(i, 1);
        }
      }
    }
    
    return;
  }
  
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
    mutateSlime,
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
    eventBus.emit('shop:reached');
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
  
  // Skip enemy updates during defeat cinematic to freeze boss position
  if (!state.defeatCinematic) {
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
      onBossShieldActivated: handleBossShieldActivated,
      debug999Damage: state.debug999Damage,
    });
  }
  
  // Check poison pool healing
  checkPlayerInPoisonPool(dt);
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
  const maxCameraY = Math.max(0, world.height - canvas.height);
  
  if (state.cinematicCameraX != null) {
    camera.x = clamp(state.cinematicCameraX, 0, maxCameraX);
  } else {
    // During cutscene mutation, camera stays locked at 0 (entire scene fits in viewport)
    // Only move camera in normal gameplay
    if (state.mutationCutscene || state.mutationCutsceneEnded) {
      if (!state.cameraLockedDuringMutation) {
        console.log('🎥 [MUTATION] Camera locked at 0 (cutscene scene fits in viewport)');
        state.cameraLockedDuringMutation = true;
      }
      camera.x = 0; // Keep camera locked during cutscene mutation
    } else {
      // Normal gameplay camera following
      const desired = player.x - viewRightMargin;
      camera.x = clamp(desired, 0, maxCameraX);
    }
  }
  
  if (state.cinematicCameraY != null) {
    camera.y = clamp(state.cinematicCameraY, 0, maxCameraY);
  } else {
    camera.y = 0; // Default to top of world
  }
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

function spawnBossChunksOnHealthBarDepletion(boss, chunkCount = 10) {
  // Drop chunks in a burst pattern around the boss
  for (let i = 0; i < chunkCount; i++) {
    const angle = (i / chunkCount) * Math.PI * 2; // Full circle
    const speed = 140 + Math.random() * 100;
    slimeChunks.push({
      x: boss.x + boss.w / 2 - 9,
      y: boss.y + boss.h / 2,
      w: 18,
      h: 14,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50, // Slight upward bias
      collected: false,
    });
  }
  // Play chunk spawn sound
  playChunkSound();
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
  if (trailTimer <= 0 && state.upgrades.acid_trail) {
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
    
    // Skip rain items - they're handled by updateDefeatRain
    if (chunk.rainItem && state.defeatCinematic) {
      continue;
    }
    
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
  eventBus.emit('player:collected:chunk', { chunk });
  slimeChunks.splice(i, 1);
}
}
}

function updateCoins(dt) {
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    
    // Skip rain items - they're handled by updateDefeatRain
    if (coin.rainItem && state.defeatCinematic) {
      continue;
    }
    
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
  const gain = Math.max(1, Math.round(coin.value * player.coinMultiplier));
  eventBus.emit('player:collected:coin', { coin, amount: gain });
  coins.splice(i, 1);
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
            const prevHealth = enemy.health;
            enemy.health -= proj.damage ?? 1;
            spawnDamageNumber(enemy.x + enemy.w / 2, enemy.y, proj.damage ?? 1, `enemy-${enemy.id}`);
            
            // Boss health bar depletion drops chunks
            if (enemy.isBoss && prevHealth > 0) {
              const maxHealth = enemy.maxHealth || 160;
              const perRow = Math.ceil(maxHealth / 4); // 40 for 160 health
              
              // Check each health bar boundary (120, 80, 40, 0)
              for (let bar = 1; bar <= 4; bar++) {
                const threshold = maxHealth - (bar * perRow);
                // If health crossed this boundary downward, drop chunks
                if (prevHealth > threshold && enemy.health <= threshold) {
                  spawnBossChunksOnHealthBarDepletion(enemy, 10);
                  console.log(`💚 Boss health bar ${bar} depleted! Health: ${Math.round(enemy.health)}/${maxHealth}`);
                }
              }
            }
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
  eventBus.emit('player:damaged', { amount, source, sourceX });
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
  traps.length = 0;
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
      
      const screenCenterX = canvas.width / 2;
      const screenCenterY = canvas.height / 2;
      
      // Target: center the boss on screen (no zoom yet)
      const targetCamX = def.bossCenterX - screenCenterX;
      const targetCamY = def.bossCenterY - screenCenterY;
      
      const maxCameraX = Math.max(0, world.width - canvas.width);
      const maxCameraY = Math.max(0, world.height - canvas.height);
      
      const clampedTargetX = clamp(targetCamX, 0, maxCameraX);
      const clampedTargetY = clamp(targetCamY, 0, maxCameraY);
      
      // Lerp from the CAPTURED starting position to the target
      state.cinematicCameraX = lerp(def.startCameraX, clampedTargetX, progress);
      state.cinematicCameraY = lerp(def.startCameraY, clampedTargetY, progress);
      state.cameraZoomTarget = 1;  // No zoom during pan
      
      if (def.timer >= def.panDuration) {
        console.log('🎬 PAN COMPLETE → ZOOM PHASE');
        def.phase = 'zoom';
        def.timer = 0;
      }
      break;
    }
    
    case 'zoom': {
      const progress = Math.min(1, def.timer / def.zoomDuration);
      const currentZoom = lerp(1, 1.3, progress);
      
      // Keep camera at centered position, just zoom in
      state.cameraZoomTarget = currentZoom;
      
      if (def.timer >= def.zoomDuration) {
        console.log('🎬 ZOOM COMPLETE → MORPH PHASE');
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
        state.whiteFlash = null;
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
      
      // Keep spawning rain items until 40 are collected (spawn until we have 40 spawned, then wait for collection)
      if (def.rainItemsSpawned < 40) {
        def.rainSpawnTimer += dt;
        const itemsToSpawn = Math.floor(def.rainSpawnTimer * def.rainSpawnRate);
        if (itemsToSpawn > 0 && def.rainItemsSpawned < 40) {
          const canSpawn = Math.min(itemsToSpawn, 40 - def.rainItemsSpawned);
          for (let i = 0; i < canSpawn; i++) {
            spawnSingleRainItem(def);
          }
          def.rainSpawnTimer -= itemsToSpawn / def.rainSpawnRate;
        }
      }
      
      updateDefeatRain(def, dt);
      
      // Only exit rain phase when all 40 items have been collected
      if (def.rainItemsCollected >= 40 && def.rainItemsSpawned >= 40) {
        console.log(`🎉 RAIN COMPLETE → All items collected (${def.rainItemsCollected}/${def.rainItemsSpawned})`);
        finishDefeatCinematic();
      }
      break;
    }
  }
  
  // Do NOT check completion outside rain phase - stay in rain until all collected
  
  state.cameraZoom += (state.cameraZoomTarget - state.cameraZoom) * Math.min(1, dt * 5);
}

function triggerBossExplosion(def, boss) {
  // Extended white flash for smooth fade - no rapid flashing
  state.whiteFlash = { timer: 0, duration: 0.6, fadeStart: 0.2 };
  
  const particleCount = 60;
  const centerX = boss.x + boss.w / 2;
  const centerY = boss.y + boss.h / 2;
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 200 + Math.random() * 500;
    def.explosionParticles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      life: 1.2,
      maxLife: 1.2,
      size: 3 + Math.random() * 12,
      color: '#ffffff',
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
      life: 60,
      rainItem: true,
    });
    def.rainItemsSpawned++;
  } else {
    state.coins.push({
      x,
      y,
      w: 16,
      h: 16,
      vx: (Math.random() - 0.5) * 80,
      vy: initialVy,
      life: 60,
      rainItem: true,
    });
    def.rainItemsSpawned++;
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
      eventBus.emit('player:collected:chunk', { chunk });
      if (chunk.rainItem) {
        def.rainItemsCollected++;
        console.log(`💚 Rain chunk collected! (${def.rainItemsCollected}/${def.rainItemsSpawned}) - def object:`, def);
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
      const gain = 5;
      state.money += gain;
      eventBus.emit('player:collected:coin', { coin, amount: gain });
      if (coin.rainItem) {
        def.rainItemsCollected++;
        console.log(`💛 Rain coin collected! (${def.rainItemsCollected}/${def.rainItemsSpawned}) - def object:`, def);
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

function handleBossShieldActivated(boss) {
  eventBus.emit('boss:shield:activated', { boss });
}

function handleBossDefeat() {
  eventBus.emit('boss:defeated', { boss: state.boss });
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
function updatePreMutationTransition(dt) {
  if (!state.preMutationTransition) return;
  
  const transition = state.preMutationTransition;
  transition.elapsed += dt;
  
  console.log('🔄 Pre-mutation transition progress:', (transition.elapsed / transition.duration * 100).toFixed(1) + '%', 'duckTransition:', player.duckTransition.toFixed(3));
  
  // Wait for duck transition to complete (or timeout)
  if (player.duckTransition <= 0.01 || transition.elapsed >= transition.duration) {
    console.log('✅ Pre-mutation transition complete, starting mutation cutscene');
    state.preMutationTransition = null;
    player.duckTransition = 0;
    player.ducking = false;
    startMutationCutscene();
  }
}

function updateMutationCutscene(dt) {
  if (!state.mutationCutscene) return;
  
  const cutscene = state.mutationCutscene;
  cutscene.elapsed += dt;
  const progress = Math.min(cutscene.elapsed / cutscene.duration, 1);
  
  // Phase 1: Zoom in (0 - 0.4)
  if (progress < 0.4) {
    const zoomPhase = progress / 0.4;
    cutscene.zoom = 1 + zoomPhase * 1.5; // Zoom from 1 to 2.5
    cutscene.zoomPhase = 'in';
    if (!cutscene.phaseDebugIn) {
      console.log('🎬 MUTATION PHASE: IN - Zoom starting');
      cutscene.phaseDebugIn = true;
    }
  }
  // Phase 2: Wavey animation (0.4 - 0.8)
  else if (progress < 0.8) {
    const waveyPhase = (progress - 0.4) / 0.4;
    cutscene.zoom = 2.5; // Hold at max zoom
    cutscene.waveIntensity = Math.sin(waveyPhase * Math.PI * 4) * 0.5; // Oscillate
    if (!cutscene.phaseDebugWavey) {
      console.log('🎬 MUTATION PHASE: WAVEY - Max zoom hold');
      cutscene.phaseDebugWavey = true;
    }
    
    // Grow and shrink the player
    const scale = 1 + Math.sin(waveyPhase * Math.PI * 3) * 0.3;
    cutscene.playerScale = scale;
    
    // Spawn visual drip particles (non-collectable)
    if (waveyPhase < 0.5) {
      cutscene.dripSpawnRate = waveyPhase * 20; // Increasing spawn rate
    } else {
      cutscene.dripSpawnRate = (1 - waveyPhase) * 20; // Decreasing spawn rate
    }
    
    // Spawn drip particles randomly (visual only, not added to slimeChunks)
    if (!state.mutationCutsceneParticles) {
      state.mutationCutsceneParticles = [];
    }
    for (let i = 0; i < cutscene.dripSpawnRate * dt; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      const size = 3 + Math.random() * 5;
      state.mutationCutsceneParticles.push({
        x: player.x + player.w / 2 + Math.cos(angle) * 30,
        y: player.y + player.h / 2 + Math.sin(angle) * 30,
        w: size,
        h: size,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2,
        maxLife: 2,
        size: size,
      });
    }
    
    cutscene.zoomPhase = 'wavey';
  }
  // Phase 3: Explosion (0.8 - 1.0)
  else {
    const explosionPhase = (progress - 0.8) / 0.2;
    cutscene.zoom = 2.5 + explosionPhase * 0.5; // Slight additional zoom
    if (!cutscene.phaseDebugExplosion) {
      console.log('🎬 MUTATION PHASE: EXPLOSION START');
      cutscene.phaseDebugExplosion = true;
    }
    
    // Massive slime explosion (visual only, not added to slimeChunks)
    if (!state.mutationCutsceneParticles) {
      state.mutationCutsceneParticles = [];
    }
    const particleCount = Math.floor(explosionPhase * 30);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random() * 300;
      const distance = 40 + Math.random() * 80;
      const size = 5 + Math.random() * 10;
      
      state.mutationCutsceneParticles.push({
        x: player.x + player.w / 2 + Math.cos(angle) * distance,
        y: player.y + player.h / 2 + Math.sin(angle) * distance,
        w: size,
        h: size,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100, // Add upward bias
        life: 1.5 + Math.random() * 1,
        maxLife: 1.5 + Math.random() * 1,
        size: size,
      });
    }
    
    cutscene.zoomPhase = 'explosion';
  }
  
  // End cutscene
  if (progress >= 1) {
    console.log('🎬 MUTATION CUTSCENE COMPLETE - Resuming gameplay');
    // Preserve zoom center for zoom-out phase
    state.mutationZoomCenter = {
      x: state.mutationCutscene.zoomCenterScreenX,
      y: state.mutationCutscene.zoomCenterScreenY
    };
    // Store player scale for smooth transition
    state.mutationPlayerScale = cutscene.playerScale || 1;
    state.mutationCutscene = null;
    state.mutationCutsceneEnded = true;
    // Camera will smoothly zoom out in next frame
    state.cameraZoomTarget = 1;
  }
}

function mutateSlime() {
  // Check if already mutated to level 1 or higher
  if (player.mutationLevel >= 1) {
    console.log('❌ Cannot mutate: already at mutation level', player.mutationLevel);
    return;
  }
  
  // Check if player has at least 5 HP to mutate
  if (player.health < 5) {
    console.log('❌ Cannot mutate: health is', player.health, 'needs at least 5');
    return;
  }
  
  console.log('✨ MUTATION TRIGGERED!');
  console.log('  Camera pos:', {x: camera.x.toFixed(1), y: camera.y.toFixed(1)});
  console.log('  Player pos:', {x: player.x.toFixed(1), y: player.y.toFixed(1)});
  console.log('  Player ducking:', player.ducking, 'duckTransition:', player.duckTransition);
  
  // If player is ducking, start pre-mutation transition to idle
  if (player.duckTransition > 0) {
    console.log('🔄 Starting pre-mutation transition: duck -> idle');
    state.preMutationTransition = {
      elapsed: 0,
      duration: 0.25, // Match the duck transition duration
      targetDuckTransition: 0,
    };
    // Set ducking to false so the animation transitions to idle
    player.ducking = false;
    return; // Wait for transition to complete before starting mutation
  }
  
  // Start actual mutation cutscene
  startMutationCutscene();
}

function startMutationCutscene() {
  console.log('✨ Starting mutation cutscene animation');
  
  // Increase mutation level
  player.mutationLevel += 1;
  
  // Grant acid trail ability upgrade
  state.upgrades.acid_trail = true;
  console.log('✨ Acid trail enabled:', state.upgrades.acid_trail);
  
  // Ensure player is not ducking
  player.ducking = false;
  player.duckTransition = 0;
  
  // Start mutation cutscene
  state.mutationCutscene = {
    elapsed: 0,
    duration: 2.2, // Total cutscene duration
    zoom: 1,
    zoomPhase: 'in',
    waveIntensity: 0,
    playerScale: 1,
    dripSpawnRate: 0,
    // Store the initial zoom center position (at start of cutscene)
    zoomCenterScreenX: player.x + player.w / 2 - camera.x,
    zoomCenterScreenY: player.y + player.h / 2,
  };
  state.cameraZoomTarget = 2.5; // Will be managed by cutscene
  
  // Reduce health to 1
  player.health = 1;
  
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

function resetGame(toHome = false, skipTutorial = true) {
  console.log(`🔄 resetGame called (toHome: ${toHome}, skipTutorial: ${skipTutorial})`);
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
  if (toHome) {
    state.homeScreenActive = true;
    uiManager.setHomeScreenVisible(true);
    audio.stopLoop?.('music');
    audio.playHomeMusic?.();
    worldController.seedWorld();
  } else if (skipTutorial) {
    console.log('⏭️ Skipping tutorial - starting main game room');
    state.homeScreenActive = false;
    uiManager.setHomeScreenVisible(false);
    
    // Grant acid trail ability when skipping tutorial
    state.upgrades.acid_trail = true;
    console.log('✨ Acid trail enabled (tutorial skipped):', state.upgrades.acid_trail);
    
    // Update ability list to show new abilities
    uiManager.updateAbilityList();
    
    roomController.initMainRoom(state, world);
    audio.playLoop?.('music', audio.tracks.music[0], 0.4);
  } else {
    console.log('🎮 Starting tutorial room');
    state.homeScreenActive = false;
    uiManager.setHomeScreenVisible(false);
    // Initialize tutorial room (opening cutscene)
    console.log('📍 Initializing tutorial room');
    roomController.initTutorialRoom(state, world, canvas);
    initializeOpeningCutscene();
    console.log('✅ Tutorial room initialized');
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

function initializeOpeningCutscene() {
  console.log('🎬 INITIALIZING OPENING CUTSCENE - START');
  console.log('  Player position:', { x: player.x, y: player.y });
  console.log('  World groundY:', world.groundY);
  
  // Stop music during cutscene
  audio.stopLoop?.('music');
  
  // Play slime creation sound
  audio.playEffect?.('slimeCreation');
  
  // Start opening cutscene with player spawning from poison pool
  const cutsceneObj = {
    phase: 'spawn',  // 'spawn' -> 'explore'
    timer: 0,
    spawnDuration: 2.0,  // 2 seconds for player to rise from pool
  };
  
  console.log('  Creating cutsceneObj:', cutsceneObj);
  state.openingCutscene = cutsceneObj;
  console.log('  After assignment - state.openingCutscene:', state.openingCutscene);
  
  // Position player on the floor for cutscene
  player.y = world.groundY - player.h;
  player.vy = 0;
  player.vx = 0;
  
  // Create poison pool on the floor
  state.poisonPool = {
    x: player.x - 100,
    y: world.groundY - 30,  // Sitting on top of the floor
    w: 200,
    h: 60,
    isActive: true,
    healTimer: 0,
    healInterval: 2.0,
  };
  
  console.log('🟢 Poison pool created:', state.poisonPool);
  
  // Lock camera to cutscene room (prevent scrolling right)
  state.cutsceneRoomBounds = {
    minX: 0,
    maxX: 800,  // Limit exploration to first 800 pixels
  };
  
  console.log('📺 Cutscene room bounds set:', state.cutsceneRoomBounds);
  
  // Create slime king statue in the middle-right of the screen
  const statueX = canvas.width * 0.6;  // Slightly to the right
  const statueY = world.groundY - 175;  // Pedestal bottom touches ground where player stands
  
  state.slimeKingStatue = {
    x: statueX,
    y: statueY,
    w: 80,
    h: 120,
    baseColor: '#2d9d7a',  // Teal green for statue
    crownColor: '#ffd25d',  // Gold for crown
    glowIntensity: 0,
    maxGlow: 1.0,
  };
  
  console.log('👑 Slime King Statue created:', state.slimeKingStatue);
  
  // Start particle emission from pool
  startPoisonEmission();
  console.log('✨ Particle emission started, particles count:', state.poisonParticles.length);
  console.log('🎬 INITIALIZING OPENING CUTSCENE - END, state.openingCutscene:', state.openingCutscene);
}

function createPoisonPool() {
  return {
    x: player.x - 100,
    y: world.groundY - 40,
    w: 200,
    h: 60,
    isActive: true,
    healTimer: 0,
    healInterval: 2.0,  // 1 HP every 2 seconds
  };
}

function startPoisonEmission() {
  // Emit poison cloud particles from the pool only if player is in it and needs healing
  if (!state.poisonPool) return;
  
  // Only emit particles if player is standing in the pool and health is 5 or below
  const poolX = state.poisonPool.x;
  const poolY = state.poisonPool.y;
  const poolW = state.poisonPool.w;
  const poolH = state.poisonPool.h;
  
  // Check if player is standing in pool (feet collision)
  const playerFeetY = player.y + player.h;
  const playerCenterX = player.x + player.w / 2;
  
  const playerInPool = playerCenterX > poolX && playerCenterX < poolX + poolW &&
                       playerFeetY > poolY && playerFeetY < poolY + poolH;
  
  // Don't emit if player is not in pool or health is above 5
  if (!playerInPool || player.health > 5) return;
  
  const poolCenterX = poolX + poolW / 2;
  const poolCenterY = poolY;
  
  // Emit 3-5 particles per frame
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 50;
    
    state.poisonParticles.push({
      x: poolCenterX + (Math.random() - 0.5) * 60,
      y: poolCenterY + (Math.random() - 0.5) * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,  // Bias upward
      life: 1.0,
      maxLife: 1.0,
      size: 3 + Math.random() * 8,
      color: 'rgba(100, 200, 100, ',  // Green poison color
    });
  }
}

function updatePoisonParticles(dt) {
  state.poisonParticles = state.poisonParticles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 20 * dt;  // Gravity
    p.life -= dt;
    return p.life > 0;
  });
}

function emitRegenerationParticles(player, dt) {
  // Only emit if poison pool exists
  if (!state.poisonPool) return;
  
  // Maximum particles at any one time
  const maxParticles = 4
  if (state.regenerationParticles.length >= maxParticles) return;
  
  // Emit green particles from the poison pool toward the player
  // Check if player is ducking in poison pool for enhanced effect
  const isDuckingInPool = player.ducking && 
    (player.x + player.w / 2) > state.poisonPool.x && 
    (player.x + player.w / 2) < state.poisonPool.x + state.poisonPool.w;
  
  // Ensure minimum 40 particles are always emitting
  const minimumParticles = 2;
  const particleCount = minimumParticles * dt;  // Spread 40 particles across 1 second of frames
  
  for (let i = 0; i < Math.ceil(particleCount); i++) {
    // Spawn particles from random points within the poison pool circle
    const poolCenterX = state.poisonPool.x + state.poisonPool.w / 2;
    const poolCenterY = state.poisonPool.y + state.poisonPool.h / 2;
    const basePoolRadius = state.poisonPool.w / 2;
    
    // Double the pool radius when ducking for particles to start farther away
    const poolRadius = isDuckingInPool ? basePoolRadius * 2 : basePoolRadius;
    
    // Random point within circle using random radius and angle
    const angle = Math.random() * Math.PI * 2;
    const randomRadius = Math.sqrt(Math.random()) * poolRadius;  // sqrt for uniform distribution in circle
    
    const spawnX = poolCenterX + Math.cos(angle) * randomRadius;
    const spawnY = poolCenterY + Math.sin(angle) * randomRadius;
    
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    
    // Initial velocity toward player (slower)
    const speed = 50 + Math.random() * 30;  // 50-80 initial speed
    const dirX = playerCenterX - spawnX;
    const dirY = playerCenterY - spawnY;
    const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
    
    // Increase acceleration by 400% when ducking in pool (450 * 5 = 2250)
    const baseAcceleration = 450;
    const acceleration = isDuckingInPool ? baseAcceleration * 5 : baseAcceleration;
    
    const particle = {
      x: spawnX,
      y: spawnY,
      targetX: playerCenterX,
      targetY: playerCenterY,
      vx: (dirX / dirLength) * speed,
      vy: (dirY / dirLength) * speed,
      life: 1.0,  // 1 second lifetime
      maxLife: 1.0,
      size: 1.5 + Math.random() * 1,  // 1.5-2.5 pixel size
      type: 'regeneration',
      acceleration: acceleration,
    };
    
    state.regenerationParticles.push(particle);
  }
}

function updateRegenerationParticles(dt) {
  state.regenerationParticles = state.regenerationParticles.filter(p => {
    // Get direction to player
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    
    const dirX = playerCenterX - p.x;
    const dirY = playerCenterY - p.y;
    const distToPlayer = Math.sqrt(dirX * dirX + dirY * dirY);
    
    // Remove particle if it collides with player (distance < player radius doubled)
    const playerRadius = player.w / 2 * 2;  // Double the collision radius
    if (distToPlayer < playerRadius) {
      return false;  // Remove particle
    }
    
    // Apply acceleration toward player center
    if (distToPlayer > 5) {
      const normDirX = dirX / distToPlayer;
      const normDirY = dirY / distToPlayer;
      
      // Apply acceleration (gravity-like pull toward center)
      p.vx += normDirX * p.acceleration * dt;
      p.vy += normDirY * p.acceleration * dt;
    }
    
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    return p.life > 0;
  });
}

function updateOpeningCutscene(dt) {
  if (!state.openingCutscene) {
    console.warn('⚠️ updateOpeningCutscene called but state.openingCutscene is null');
    return;
  }
  
  // Handle pre-mutation transition if active (takes priority before mutation cutscene)
  if (state.preMutationTransition) {
    updatePreMutationTransition(dt);
    return;
  }
  
  // Handle mutation cutscene if active (takes priority over normal cutscene phases)
  if (state.mutationCutscene) {
    updateMutationCutscene(dt);
    // Update camera zoom smoothly
    const zoomDiff = state.cameraZoomTarget - state.cameraZoom;
    state.cameraZoom += zoomDiff * (1 - Math.pow(0.95, dt * 60)); // Smooth lerp
    
    // Update camera to follow player during mutation
    updateCamera();
    
    if (!state.mutationDebugLogged) {
      console.log('🔍 [TUTORIAL] Mutation active, zoom target:', state.cameraZoomTarget, 'current zoom:', state.cameraZoom.toFixed(2), 'Camera:', {x: camera.x.toFixed(1), y: camera.y.toFixed(1)}, 'Player:', {x: player.x.toFixed(1), y: player.y.toFixed(1)});
      state.mutationDebugLogged = true;
    }
    
    // Update chunks during mutation cutscene
    updateChunks(dt);
    
    // Update mutation cutscene particles
    if (state.mutationCutsceneParticles && state.mutationCutsceneParticles.length > 0) {
      for (let i = state.mutationCutsceneParticles.length - 1; i >= 0; i--) {
        const p = state.mutationCutsceneParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt; // Gravity
        p.life -= dt;
        // Remove only after life has gone past 0 (allows full fade to alpha 0)
        if (p.life < -0.1) {
          state.mutationCutsceneParticles.splice(i, 1);
        }
      }
    }
    return; // Skip normal cutscene phases while mutation is active
  }
  
  // Handle zoom-out after mutation ends
  if (state.mutationCutsceneEnded) {
    // After mutation ends, continue smooth zoom out and update camera
    const zoomDiff = state.cameraZoomTarget - state.cameraZoom;
    state.cameraZoom += zoomDiff * (1 - Math.pow(0.95, dt * 60)); // Smooth lerp
    
    // Smoothly transition player scale back to 1.0
    if (state.mutationPlayerScale !== undefined && state.mutationPlayerScale !== 1) {
      const scaleDiff = 1 - state.mutationPlayerScale;
      state.mutationPlayerScale += scaleDiff * (1 - Math.pow(0.9, dt * 60)); // Smooth lerp to 1.0
    }
    
    // Keep updating camera during zoom-out
    updateCamera();
    
    // Log camera and player positions periodically during zoom-out
    if (!state.mutationZoomOutLogged) {
      console.log('🔍 ZOOM-OUT START - Camera:', {x: camera.x.toFixed(1), y: camera.y.toFixed(1)}, 'Player:', {x: player.x.toFixed(1), y: player.y.toFixed(1)});
      state.mutationZoomOutLogged = true;
    }
    
    // Update mutation cutscene particles still falling
    if (state.mutationCutsceneParticles && state.mutationCutsceneParticles.length > 0) {
      for (let i = state.mutationCutsceneParticles.length - 1; i >= 0; i--) {
        const p = state.mutationCutsceneParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt; // Gravity
        p.life -= dt;
        // Remove only after life has gone past 0 (allows full fade to alpha 0)
        if (p.life < -0.1) {
          state.mutationCutsceneParticles.splice(i, 1);
        }
      }
    }
    
    // If zoom is back to normal, clear the mutation ended flag and resume explore phase
    if (Math.abs(state.cameraZoom - 1) < 0.01) {
      console.log('✅ [TUTORIAL] Zoom complete! Resuming normal explore phase');
      state.mutationCutsceneEnded = false;
      state.mutationZoomCenter = null;
      state.mutationPlayerScale = undefined;
      state.mutationDebugLogged = false;
      state.mutationZoomOutLogged = false;
      state.cameraLockedDuringMutation = false;
      state.mutationComplete = true; // Flag that mutation is done and player can proceed
      console.log('✅ Setting mutationComplete = true - player can now move to right edge to transition');
      // Fall through to normal cutscene phase handling below
    } else {
      // Still zooming out, skip normal cutscene phases
      return;
    }
  }
  
  const cs = state.openingCutscene;
  cs.timer += dt;
  
  switch (cs.phase) {
    case 'spawn': {
      const progress = Math.min(1, cs.timer / cs.spawnDuration);
      
      if (cs.timer < 0.1) {
        console.log('🌊 SPAWN phase - Progress:', progress.toFixed(3), 'Timer:', cs.timer.toFixed(3), 'spawnDuration:', cs.spawnDuration);
      }
      
      // Rise player up from poison pool
      const poolY = state.poisonPool.y - player.h;  // Player standing on pool
      const startY = world.groundY - player.h;  // Player on floor
      player.y = startY + (poolY - startY) * progress;
      
      // Bobbing motion as rising
      const bobAmount = Math.sin(progress * Math.PI * 4) * 15;
      player.y += bobAmount;
      
      // Grow player from 0.1 scale to 1.0 scale during spawn
      const scaleProgress = Math.min(1, progress * 1.5);  // Finish growing before spawn ends
      player.squish = scaleProgress - 1;  // squish goes from -1 to 0, making scale go from 0 to 1
      
      // Store animation progress for health bar rendering
      state.spawnAnimationProgress = progress;
      
      // Freeze player velocity during spawn
      player.vy = 0;
      player.vx = 0;
      player.grounded = false;
      
      // Update particles (but don't emit during spawn - pool stays still)
      updatePoisonParticles(dt);
      
      if (cs.timer >= cs.spawnDuration) {
        console.log('✅ SPAWN phase complete, transitioning to EXPLORE');
        cs.phase = 'explore';
        cs.timer = 0;
        player.y = poolY;
        player.grounded = false;
        player.squish = 0;  // Reset to normal size
        state.spawnAnimationProgress = 1;  // Keep showing full health bar
      }
      break;
    }
    
    case 'explore': {
      // Player can now move around freely in the cutscene room
      // Handle input and movement just like normal game
      const input = {
        left: keys.has('arrowleft') || keys.has('a'),
        right: keys.has('arrowright') || keys.has('d'),
        jump: keys.has(' ') || keys.has('arrowup') || keys.has('w'),
        duck: keys.has('arrowdown') || keys.has('s'),
        swallow: keys.has('f'),
      };
      
      // Update player movement (without world generation or platform collisions)
      updatePlayerMovement(player, dt, input, world, {
        mutateSlime,
        applyPlayerScale: () => playerManager.applyScale(),
        spawnSlimeGlob,
        playJumpSound,
        ensureWorldAhead: () => {}, // Don't spawn world during cutscene
        resolvePlatformCollisions: () => {
          // Simple ground collision only - keep player on the floor
          if (player.y + player.h > world.groundY) {
            player.y = world.groundY - player.h;
            player.vy = 0;
            player.grounded = true;
          }
        },
        getSlimeFlingCooldown: () => state.slimeFlingCooldown,
        setSlimeFlingCooldown: (value) => {
          state.slimeFlingCooldown = value;
          state.slimeFlingCooldownMax = value;
        },
        allowMovement: true,
        allowWallMode: state.upgrades.slime_wall,
        allowFling: state.upgrades.slime_fling,
      });
      
      // Constrain camera to cutscene room
      updateCutsceneCamera();
      
      // Lock player within cutscene viewport
      const viewportWidth = canvas.width;
      const maxPlayerX = viewportWidth - player.w;
      player.x = Math.max(0, Math.min(player.x, maxPlayerX));
      
      // Update trail effects if acid trail is active
      updateTrail(dt);
      
      // Update particles and poison effects
      updatePoisonParticles(dt);
      startPoisonEmission();
      checkPlayerInPoisonPool(dt);
      
      // Update mutation cutscene particles if any are still falling
      if (state.mutationCutsceneParticles && state.mutationCutsceneParticles.length > 0) {
        for (let i = state.mutationCutsceneParticles.length - 1; i >= 0; i--) {
          const p = state.mutationCutsceneParticles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 400 * dt; // Gravity
          p.life -= dt;
          if (p.life < -0.1) {
            state.mutationCutsceneParticles.splice(i, 1);
          }
        }
      }
      
      // Auto-close dialog if player walks away from interactable
      autoCloseDialogIfTooFar();
      
      // Check if mutation is complete and player touches right wall to proceed to main game
      if (state.mutationComplete) {
        const viewportWidth = canvas.width;
        const rightEdgeThreshold = viewportWidth - 10;
        const playerRightEdge = player.x + player.w;
        const atRightEdge = playerRightEdge >= rightEdgeThreshold;
        
        if (!state.transitionCheckLogged) {
          console.log('✅ Mutation complete - watching for player to reach right edge to transition');
          state.transitionCheckLogged = true;
        }
        
        if (atRightEdge) {
          console.log('🚀 Player touched right wall - transitioning to main game');
          exitCutsceneToMainGame();
          return;
        }
      }
      
      break;
    }
  }
}

function updateCutsceneCamera() {
  // Keep camera locked to cutscene room bounds - no scrolling
  if (!state.cutsceneRoomBounds) return;
  
  // During mutation cutscene or zoom-out, allow camera to follow player (don't lock it)
  if (state.mutationCutscene || state.mutationCutsceneEnded) {
    if (!state.cutsceneCameraSkipLogged) {
      console.log('🎥 [CUTSCENE CAMERA] Skipping lock - mutation active, letting updateCamera() handle it');
      state.cutsceneCameraSkipLogged = true;
    }
    state.cutsceneCameraLockLogged = false; // Reset lock flag when skipping
    return;
  }
  
  // Lock camera at starting position (no movement)
  if (!state.cutsceneCameraLockLogged) {
    console.log('🎥 [CUTSCENE CAMERA] Locking camera to (0, 0)');
    state.cutsceneCameraLockLogged = true;
  }
  state.cutsceneCameraSkipLogged = false; // Reset skip flag when locking
  camera.x = 0;
  camera.y = 0;
}

function exitCutsceneToMainGame() {
  console.log('🚀 EXITING CUTSCENE TO MAIN GAME');
  
  // Use room controller to transition from tutorial to main game
  roomController.transitionToMainRoom(state);
  
  // Seed the world now that we're entering the main game
  worldController.seedWorld();
  console.log('✅ World seeded, main game should start now');
  
  // Position player at left entrance (safe zone)
  player.x = 100; // Start well into the safe zone
  player.y = world.groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  
  // Start entrance cutscene: zoom in on player, then zoom out
  state.entranceCutscene = {
    active: true,
    phase: 'zoom-in', // 'zoom-in' -> 'pause' -> 'zoom-out' -> 'complete'
    timer: 0,
    zoomInDuration: 1.0,   // 1 second to zoom in
    pauseDuration: 0.5,    // 0.5 second pause
    zoomOutDuration: 2.0,  // 2 seconds to zoom out
    startZoom: 1.0,
    targetZoom: 2.5,
  };
  
  // Set camera to follow player at entrance
  camera.x = player.x + player.w / 2 - canvas.width / 2;
  camera.y = player.y + player.h / 2 - canvas.height / 2;
  
  console.log('🎬 Starting entrance cutscene - player at entrance (x:', player.x, ')');
}

function checkPlayerInPoisonPool(dt) {
  if (!state.poisonPool) return;
  
  const poolX = state.poisonPool.x;
  const poolY = state.poisonPool.y;
  const poolW = state.poisonPool.w;
  const poolH = state.poisonPool.h;
  
  // Check if player is standing in pool (feet collision)
  const playerFeetY = player.y + player.h;
  const playerCenterX = player.x + player.w / 2;
  
  if (playerCenterX > poolX && playerCenterX < poolX + poolW &&
      playerFeetY > poolY && playerFeetY < poolY + poolH) {
    
    // Only heal and show effects if player health is 5 HP or below
    if (player.health <= 5) {
      // Determine heal interval based on duck state (1s when ducking, 2s normally)
      const healInterval = player.ducking ? 1.0 : 2.0;
      
      // Player is in poison pool - heal
      state.poisonPool.healTimer += dt;
      if (state.poisonPool.healTimer >= healInterval) {
        player.health = Math.min(6, player.health + 1);
        state.poisonPool.healTimer = 0;
      }
      
      // Emit healing regeneration particles around player
      emitRegenerationParticles(player, dt);
      
      // Emit poison cloud particles from pool
      startPoisonEmission();
    }
  } else {
    state.poisonPool.healTimer = 0;
  }
  
  // Update all particle types
  updatePoisonParticles(dt);
  updateRegenerationParticles(dt);
}

// Add keyboard listener for cutscene progression and interactions
window.addEventListener('keydown', (e) => {
  if (state.openingCutscene) {
    if (e.key === 'Enter') {
      console.log('↩️  ENTER key pressed during cutscene, transitioning to main game');
      e.preventDefault();
      exitCutsceneToMainGame();
    } else if (e.key === 'f' || e.key === 'F') {
      console.log('🎮 F key pressed, checking for interactions');
      e.preventDefault();
      checkAndInteract();
    }
  }
});

function checkAndInteract() {
  if (!state.openingCutscene || !state.player) return;
  
  const player = state.player;
  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;
  
  // Check statue interaction
  if (state.slimeKingStatue) {
    const statue = state.slimeKingStatue;
    const statueCenterX = statue.x + statue.w / 2;
    const statueCenterY = statue.y + statue.h / 2;
    
    const statueDistance = Math.sqrt(
      Math.pow(playerCenterX - statueCenterX, 2) + 
      Math.pow(playerCenterY - statueCenterY, 2)
    );
    
    if (statueDistance < 150) {
      toggleDialog('statue');
      return;
    }
  }
  
  // Check poison pool interaction
  if (state.poisonPool) {
    const pool = state.poisonPool;
    const poolCenterX = pool.x + pool.w / 2;
    const poolCenterY = pool.y + pool.h / 2;
    
    const poolDistance = Math.sqrt(
      Math.pow(playerCenterX - poolCenterX, 2) + 
      Math.pow(playerCenterY - poolCenterY, 2)
    );
    
    if (poolDistance < 120) {
      toggleDialog('pool');
      return;
    }
  }
}

function toggleDialog(objectType) {
  // If dialog is open for a different object, close it first
  if (state.pedestalTextVisible && state.currentInteractable !== objectType) {
    state.pedestalTextVisible = false;
    state.pedestalTextDialog = null;
    state.currentInteractable = null;
    state.dialogIndex = 0;
  }
  
  // If dialog is open for the same object, advance to next line
  if (state.pedestalTextVisible && state.currentInteractable === objectType) {
    let dialogLines = [];
    
    if (objectType === 'statue') {
      dialogLines = [
        "Slime King the great!",
        "Born of lowly slime in the lowly slime pools nearby.",
        "It is said slimes can be soothed by slime pools.",
        "Even some slime mutate when consuming enough slime."
      ];
    } else if (objectType === 'pool') {
      dialogLines = [
        "You see a poison marsh that birthed you..."
      ];
    }
    
    state.dialogIndex++;
    
    if (state.dialogIndex >= dialogLines.length) {
      // End of dialog, close it
      state.pedestalTextVisible = false;
      state.pedestalTextDialog = null;
      state.currentInteractable = null;
      state.dialogIndex = 0;
    } else {
      // Show next line
      showDialogLine(objectType, state.dialogIndex, dialogLines);
    }
  } else {
    // Open dialog for the object - show first line
    let dialogLines = [];
    
    if (objectType === 'statue') {
      dialogLines = [
        "Slime King the great!",
        "Born of lowly slime in the lowly slime pools nearby.",
        "It is said slimes can be soothed by slime pools.",
        "Even some slime mutate when consuming enough slime."
      ];
    } else if (objectType === 'pool') {
      dialogLines = [
        "You see a poison marsh that birthed you..."
      ];
    }
    
    state.dialogIndex = 0;
    showDialogLine(objectType, 0, dialogLines);
    state.pedestalTextVisible = true;
    state.currentInteractable = objectType;
  }
}

function showDialogLine(objectType, lineIndex, dialogLines) {
  if (lineIndex >= dialogLines.length) return;
  
  let dialogContent = {};
  const text = dialogLines[lineIndex];
  
  if (objectType === 'statue') {
    const statue = state.slimeKingStatue;
    dialogContent = {
      x: statue.x + statue.w / 2,
      y: statue.y - 80,
      text: text,
      maxWidth: 200
    };
  } else if (objectType === 'pool') {
    const pool = state.poisonPool;
    dialogContent = {
      x: pool.x + pool.w / 2,
      y: pool.y - 40,
      text: text,
      maxWidth: 180
    };
  }
  
  state.pedestalTextDialog = dialogContent;
}

function autoCloseDialogIfTooFar() {
  if (!state.pedestalTextVisible || !state.currentInteractable || !state.player) return;
  
  const player = state.player;
  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;
  
  let objectCenterX, objectCenterY, interactRange;
  
  // Get the center and range of the current interactable
  if (state.currentInteractable === 'statue' && state.slimeKingStatue) {
    const statue = state.slimeKingStatue;
    objectCenterX = statue.x + statue.w / 2;
    objectCenterY = statue.y + statue.h / 2;
    interactRange = 150;
  } else if (state.currentInteractable === 'pool' && state.poisonPool) {
    const pool = state.poisonPool;
    objectCenterX = pool.x + pool.w / 2;
    objectCenterY = pool.y + pool.h / 2;
    interactRange = 120;
  } else {
    return;
  }
  
  // Calculate distance
  const distance = Math.sqrt(
    Math.pow(playerCenterX - objectCenterX, 2) + 
    Math.pow(playerCenterY - objectCenterY, 2)
  );
  
  // Close dialog if player is too far away
  if (distance >= interactRange) {
    state.pedestalTextVisible = false;
    state.pedestalTextDialog = null;
    state.currentInteractable = null;
    state.dialogIndex = 0;
  }
}

// ============================================================================
// EVENT LISTENERS - Decoupled game event handlers
// ============================================================================

// Enemy killed event - handles all death-related effects
eventBus.on('enemy:killed', ({ enemy, position }) => {
  // Play death sound
  playEnemyDeathSound();
  
  // Spawn visual effects and rewards
  spawnSlimeChunks(enemy);
  spawnCoins(enemy);
});

// Player damaged event - handles damage feedback
eventBus.on('player:damaged', ({ amount, source, sourceX }) => {
  if (state.godMode || player.invulnTimer > 0 || !player.alive) return;
  
  player.health -= amount;
  spawnDamageNumber(player.x + player.w / 2, player.y, amount, 'player');
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
});

// Player collected chunk event
eventBus.on('player:collected:chunk', ({ chunk }) => {
  playerManager.heal(1);
  playChunkSound();
});

// Player collected coin event
eventBus.on('player:collected:coin', ({ coin, amount }) => {
  player.coins += amount;
  playCoinSound();
});

// Shop reached event
eventBus.on('shop:reached', () => {
  shopController.openShop();
});

// Boss defeated event
eventBus.on('boss:defeated', ({ boss }) => {
  if (state.levelComplete || state.defeatCinematic) return;
  console.log('🔴 BOSS DEFEAT TRIGGERED');
  audio.stopBossMusic?.();
  state.paused = true;
  
  // Reset player inputs to prevent unintended movement after cinematic
  keys.clear();
  
  // Reset player movement state to allow falling to floor
  player.vx = 0;
  player.vy = 0;
  
  const bossRef = boss;
  const bossCenterX = (bossRef?.x ?? 0) + (bossRef?.w ?? 0) / 2;
  const bossCenterY = (bossRef?.y ?? 0) + (bossRef?.h ?? 0) / 2;
  console.log(`Captured boss center at defeat: (${bossCenterX}, ${bossCenterY})`);
  state.defeatCinematic = {
    phase: 'pause',
    timer: 0,
    pauseDuration: 0.4,
    panDuration: 1.0,
    zoomDuration: 0.8,
    morphDuration: 1.5,
    swellDuration: 1.0,
    explosionDuration: 0.3,
    rainDuration: 15,
    rainStartY: -100,
    rainSpawnRate: 40 / 2,
    rainSpawnTimer: 0,
    explosionParticles: [],
    rainItemsSpawned: 0,
    rainItemsCollected: 0,
    bossRef: bossRef,
    bossStartX: bossRef?.x ?? 0,
    bossStartY: bossRef?.y ?? 0,
    bossCenterX: bossCenterX,
    bossCenterY: bossCenterY,
    playerStartX: player.x,
    startCameraX: camera.x,
    startCameraY: camera.y,
  };
});

// Boss shield activated event
eventBus.on('boss:shield:activated', ({ boss }) => {
  spawnBossChunksOnHealthBarDepletion(boss, 10);
  console.log('🛡️ Boss shield activated! Dropped 10 chunks');
});

// ============================================================================
// GAME INITIALIZATION
// ============================================================================

gameInstance = new Game(update, renderer, state);


import { CONSTANTS } from './constants.js';
import { AudioManager, AUDIO_TRACKS } from './audioManager.js';
import { ShopManager, SHOP_INTERVAL } from './shopManager.js';
import { GameState } from './gameState.js';
import { ENEMY_CONFIG, createEnemy, updateEnemies } from './enemy.js';
import { PLAYER_CONFIG, updatePlayerMovement } from './player.js';
import { UPGRADES } from './upgrades.js';

const BASE_ABILITIES = [
  {
    id: 'acid_trail',
    title: 'Acid Trail',
    desc: 'Moving leaves a damaging trail that stacks damage.',
  },
  {
    id: 'swallow_shield',
    title: 'Swallow Shield',
    desc: 'Duck + F to spend 10 HP for a one-hit shield.',
  },
];
const HOME_INFO = {
  howto: {
    title: 'How to Play',
    body: `<p>Master the basics before you ooze out:</p>
      <ul>
        <li><strong>Move</strong>: A/D or ← →</li>
        <li><strong>Jump</strong>: Space, W, or ↑</li>
        <li><strong>Duck</strong>: S or ↓ to slip through platforms</li>
        <li><strong>Trail</strong>: Your slime burns foes—kite them through it!</li>
      </ul>`,
  },
  options: {
    title: 'Options',
    body: `<p>Quick tweaks before diving in:</p>
      <ul>
        <li>Use the <strong>Mute Audio</strong> button to silence SFX/music.</li>
        <li><strong>Debug keys</strong>: G toggles god mode, H grants coins, J opens the shop.</li>
        <li>Visit shops every 5,000 distance to buy upgrades or reroll.</li>
      </ul>`,
  },
  credits: {
    title: 'Credits',
    body: `<p>From Nothing: A Slime's Journey</p>
      <ul>
        <li><strong>Design & Code</strong>: Ruben Arevalo</li>
        <li><strong>Music & SFX</strong>: Ruben Arevalo</li>
        <li><strong>Special Thanks</strong>: Mackenzie O'Brien and the brave slime scouts who paved the way</li>
      </ul>`,
  },
};

const muteToggle = document.getElementById('muteToggle');
const abilityListEl = document.getElementById('abilityList');
const homeInfoEl = document.getElementById('homeInfo');
const homeStartButton = document.getElementById('homeStart');
const homeOptionsButton = document.getElementById('homeOptions');
const homeCreditsButton = document.getElementById('homeCredits');
const homeScreenEl = document.getElementById('homeScreen');
const gameOverControls = document.getElementById('gameOverControls');
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
resetUpgradeFlags();
updateHomeInfoContent();
updateAbilityList();
state.homeScreenActive = true;
setHomeScreenVisible(true);
state.gameOverTears = [];
state.gameOverTearTimer = 0;
state.gameOverNextTearSide = 'left';
setGameOverControlsVisible(false);
const audio = new AudioManager(AUDIO_TRACKS, muteToggle);
const shopManager = new ShopManager();
const pauseOverlay = document.getElementById('pauseOverlay');
const pauseContinue = document.getElementById('pauseContinue');
const pauseRetry = document.getElementById('pauseRetry');
const shopRefreshButton = document.getElementById('shopRefresh');

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
const ACID_VALUES = {
  trailInterval: 0.11,
  tickInterval: 0.5,
  debuffDuration: 3,
  damageNumbersPerSecond: 2,
  trailDamage: 3.6,
  globDamage: 7.5,
  globLifetime: 2.6,
};
const ENEMY_TIERS = ENEMY_CONFIG.tiers;
const ENEMY_WIDTH = ENEMY_CONFIG.width;
const ENEMY_HALF_WIDTH = ENEMY_WIDTH / 2;
const PROJECTILE_INTERVAL = ENEMY_CONFIG.projectile.interval;
const PROJECTILE_MODE_SWITCH = ENEMY_CONFIG.projectile.modeSwitch;
const PROJECTILE_SPEED = ENEMY_CONFIG.projectile.speed;
const TRAIL_INTERVAL = ACID_VALUES.trailInterval;
const ACID_TICK_INTERVAL = ACID_VALUES.tickInterval;
const ACID_DEBUFF_DURATION = ACID_VALUES.debuffDuration;
const MARKER_SPACING = CONSTANTS.level.markerSpacing;
const PLATFORM_UNIT = CONSTANTS.level.platformUnit;
const SHOP_REFRESH_COST = 100;

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!state.gameOver && !state.shopActive) {
      e.preventDefault();
      togglePause();
    }
    return;
  }
  const isRefreshKey = e.key === 'F5';
  const key = e.key.toLowerCase();
  if (state.gameOver) {
    if (!isRefreshKey) {
      handleGameOverKey(key);
      e.preventDefault();
    }
    return;
  }
  if (key === 'g') {
    state.godMode = !state.godMode;
    return;
  }
  if (key === 'h') {
    player.coins += 100;
    return;
  }
  if (key === 'j') {
    if (!state.shopActive) {
      openShop(true);
    }
    return;
  }
  if (state.paused) {
    if (isRefreshKey) return;
    e.preventDefault();
    return;
  }
  keys.add(key);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
});

shopRefreshButton?.addEventListener('click', () => {
  if (!state.shopActive) return;
  refreshShopOptions();
});
homeOptionsButton?.addEventListener('click', () => {
  updateHomeInfoContent('options');
});
homeCreditsButton?.addEventListener('click', () => {
  updateHomeInfoContent('credits');
});
homeStartButton?.addEventListener('click', () => {
  updateHomeInfoContent('howto');
  if (!state.homeScreenActive) return;
  state.homeScreenActive = false;
  setHomeScreenVisible(false);
  audio.stopLoop?.('home');
  audio.startMusic?.();
});
gameOverYesButton?.addEventListener('click', () => {
  if (!state.gameOver) return;
  stopGameOverSound();
  resetGame();
  lastTime = performance.now();
  loop(lastTime);
});
gameOverNoButton?.addEventListener('click', () => {
  if (!state.gameOver) return;
  resetGame(true);
});
homeStartButton?.addEventListener('click', () => {
  updateHomeInfoContent('howto');
  if (!state.homeScreenActive) return;
  state.homeScreenActive = false;
  setHomeScreenVisible(false);
  audio.stopLoop('home');
  audio.startMusic();
});
window.addEventListener('keyup', (e) => {
  if (state.gameOver || state.paused) return;
  keys.delete(e.key.toLowerCase());
});

const viewRightMargin = state.viewRightMargin;
let trailTimer = 0;
const damageFloatSpeed = 28;
const damageLifetime = 0.8;
const safeZoneEnd = state.safeZoneEnd;
const chunkWidth = state.chunkWidth;
const generationMargin = state.generationMargin;
const cleanupBuffer = state.cleanupBuffer;
const MAX_PLATFORM_STEP = Math.max(60, Math.floor((player.jumpSpeed * player.jumpSpeed) / (2 * world.gravity) - player.baseH));
let enemyIdCounter = 0;
let platformIdCounter = 0;

applyPlayerScale();

pauseContinue.addEventListener('click', () => togglePause(false));
pauseRetry.addEventListener('click', () => {
  togglePause(false);
  resetGame();
});

function setPauseOverlay(visible) {
  if (!pauseOverlay) return;
  pauseOverlay.classList.toggle('visible', visible);
  pauseOverlay.classList.toggle('hidden', !visible);
}

function updateHomeInfoContent(section = 'howto') {
  if (!homeInfoEl) return;
  const info = HOME_INFO[section] || HOME_INFO.howto;
  homeInfoEl.innerHTML = `<h3>${info.title}</h3>${info.body}`;
}

function updateAbilityList() {
  if (!abilityListEl) return;
  abilityListEl.innerHTML = '';
  BASE_ABILITIES.forEach((entry) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${entry.title}</strong><small>${entry.desc}</small>`;
    abilityListEl.appendChild(li);
  });
}

function setHomeScreenVisible(visible) {
  if (!homeScreenEl) return;
  homeScreenEl.classList.toggle('hidden', !visible);
}

function setGameOverControlsVisible(visible) {
  if (!gameOverControls) return;
  gameOverControls.classList.toggle('hidden', !visible);
  gameOverControls.classList.toggle('visible', visible);
}

function togglePause(force) {
  if (state.gameOver || state.shopActive) return;
  const next = typeof force === 'boolean' ? force : !state.paused;
  if (state.paused === next) return;
  state.paused = next;
  setPauseOverlay(state.paused);
  if (state.paused) {
    keys.clear();
    statusEl.textContent = 'Paused - press Esc to continue';
  }
}

function createPlatform(x, y, w, h, integrityOverride, maxIntegrityOverride) {
  const baseMax = maxIntegrityOverride ?? randomRange(4, 7);
  const baseIntegrity = Math.min(baseMax, integrityOverride ?? baseMax);
  return {
    id: platformIdCounter++,
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

function createPlatformUnits(x, y, totalWidth, height) {
  const unitWidth = PLATFORM_UNIT;
  const count = Math.max(1, Math.round(totalWidth / unitWidth));
  const segments = [];
  for (let i = 0; i < count; i++) {
    segments.push(createPlatform(x + i * unitWidth, y, unitWidth, height));
  }
return { segments, width: count * unitWidth };
}

function splitPlatform(original, start, end) {
  const begin = Math.max(original.x, Math.min(start, original.x + original.w));
  const finish = Math.max(begin, Math.min(end, original.x + original.w));
  const leftWidth = begin - original.x;
  const centerWidth = finish - begin;
  const rightWidth = original.x + original.w - finish;
  if (centerWidth <= 2 && leftWidth <= 6 && rightWidth <= 6) {
    return original;
  }
const index = platforms.indexOf(original);
if (index === -1) return original;
const newPlats = [];
if (leftWidth > 6) {
  newPlats.push(createPlatform(
  original.x,
  original.y,
  leftWidth,
  original.h,
  original.maxIntegrity,
  original.maxIntegrity
  ));
}
let centerPlat = original;
if (centerWidth > 2) {
  centerPlat = createPlatform(
  begin,
  original.y,
  centerWidth,
  original.h,
  original.integrity,
  original.maxIntegrity
);
newPlats.push(centerPlat);
}
if (rightWidth > 6) {
  newPlats.push(createPlatform(
  finish,
  original.y,
  rightWidth,
  original.h,
  original.maxIntegrity,
  original.maxIntegrity
  ));
}
if (!newPlats.length) {
  return original;
}
platforms.splice(index, 1, ...newPlats);
return centerPlat;
}

function getChunkDifficulty(chunkStart) {
  return Math.min(4, 1 + Math.floor(chunkStart / 800));
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function generateChunk() {
  const start = state.generatedUntil;
  const end = start + chunkWidth;
  const difficulty = getChunkDifficulty(start);
  const platformCount = 1 + Math.floor(Math.random() * 2);
  const chunkPlatforms = [];
  const startClamp = start === 0 ? Math.max(safeZoneEnd + 80, start + 80) : start + 80;
  let position = startClamp;
  let lastY = world.groundY - 110;
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
    x = Math.max(x, safeZoneEnd + 80);
  }
if (x + width <= start + 40) break;
const maxStep = MAX_PLATFORM_STEP;
let y = world.groundY - randomRange(80, MAX_PLATFORM_STEP + 120) + 50;
y = Math.max(lastY - maxStep, Math.min(lastY + maxStep, y));
y = Math.min(world.groundY - 10, Math.max(world.groundY - (MAX_PLATFORM_STEP + 40), y));
const unitData = createPlatformUnits(x, y, width, height);
unitData.segments.forEach((seg) => {
  platforms.push(seg);
  platformBounds.set(seg.id, { min: x, max: x + unitData.width });
});
chunkPlatforms.push({ x, y, w: unitData.width, h: height, segments: unitData.segments });
lastY = y;
position = x + unitData.width + randomRange(200, 360);
}

if (!chunkPlatforms.length) {
  const fallbackWidth = 220;
  const fallbackX = Math.max(startClamp, start + 60);
  const unitData = createPlatformUnits(fallbackX, world.groundY - 70, fallbackWidth, 16);
  unitData.segments.forEach((seg) => {
    platforms.push(seg);
    platformBounds.set(seg.id, { min: fallbackX, max: fallbackX + unitData.width });
  });
chunkPlatforms.push({ x: fallbackX, y: world.groundY - 70, w: unitData.width, h: 16, segments: unitData.segments });
}

const enemySpawns = 1 + Math.floor(Math.random() * (difficulty + 1));
for (let i = 0; i < enemySpawns; i++) {
  let spawnX = start + randomRange(80, chunkWidth - 80);
  if (spawnX <= safeZoneEnd + 60) continue;
  const tier = ENEMY_TIERS[Math.floor(Math.random() * ENEMY_TIERS.length)];
  const enemyHealth = tier.health;
  const enemyDamage = tier.damage;
  const enemyColor = tier.color;
  const platform = findPlatformAt(spawnX + ENEMY_HALF_WIDTH);
  let spawnY = world.groundY - 34;
  let supportId = null;
  let patrolMin;
  let patrolMax;
  if (platform && platform.y > world.groundY - (MAX_PLATFORM_STEP + 70)) {
    spawnY = platform.y - 34;
    supportId = platform.id;
    const bounds = platformBounds.get(platform.id);
    const minBound = bounds ? bounds.min : platform.x;
    const maxBound = bounds ? bounds.max : platform.x + platform.w;
    patrolMin = minBound;
    patrolMax = maxBound;
  } else {
  patrolMin = spawnX - randomRange(100, 200);
  patrolMax = spawnX + randomRange(100, 200);
}
patrolMin = Math.max(0, patrolMin);
patrolMax = Math.min(world.width, patrolMax);
if (patrolMin > patrolMax) [patrolMin, patrolMax] = [patrolMax, patrolMin];
if (patrolMax - patrolMin < ENEMY_WIDTH) {
  patrolMax = Math.min(world.width, patrolMin + ENEMY_WIDTH);
  patrolMin = Math.max(0, patrolMax - ENEMY_WIDTH);
}
enemies.push(createEnemy({
  id: enemyIdCounter++,
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
  worldWidth: world.width,
  acidTickInterval: ACID_TICK_INTERVAL,
}));
}

state.generatedUntil = end;
world.width = Math.max(world.width, end + canvas.width * 0.5);

if (Math.random() < 0.35) {
  const trapWidth = randomRange(40, 80);
  const trapDamage = 1 + Math.floor(Math.random() * Math.max(1, difficulty - 1));
  const trapStartMin = Math.max(start + 60, safeZoneEnd + 40);
  const available = Math.max(0, end - trapWidth - trapStartMin - 40);
  if (available > 0) {
    const trapX = trapStartMin + randomRange(0, available);
    traps.push({
      x: trapX,
      y: world.groundY - 14,
      w: trapWidth,
      h: 14,
      damage: Math.max(1, trapDamage),
    });
}
}
}

function seedWorld() {
  while (state.generatedUntil < canvas.width * 1.3) {
    generateChunk();
  }
}

seedWorld();

function ensureWorldAhead() {
  const viewEnd = Math.max(camera.x + canvas.width, player.x + canvas.width * 0.5) + generationMargin;
  while (state.generatedUntil < viewEnd) {
    generateChunk();
  }
}

function cleanupOldEntities() {
  const minX = camera.x - cleanupBuffer;
  for (let i = platforms.length - 1; i >= 0; i--) {
    if (platforms[i].x + platforms[i].w < minX) {
      const removed = platforms.splice(i, 1)[0];
      releaseSegmentsFromSupport(removed.id);
    }
}
for (let i = enemies.length - 1; i >= 0; i--) {
  if (enemies[i].x + enemies[i].w < minX) {
    enemies.splice(i, 1);
  }
}
for (let i = traps.length - 1; i >= 0; i--) {
  if (traps[i].x + traps[i].w < minX) {
    traps.splice(i, 1);
  }
}
}

function findPlatformById(id) {
  return platforms.find((plat) => plat.id === id);
}
function findPlatformAt(x) {
  let candidate = null;
  for (const plat of platforms) {
    if (x >= plat.x - 1 && x <= plat.x + plat.w + 1) {
      if (!candidate || plat.y < candidate.y) {
        candidate = plat;
      }
  }
}
return candidate;
}

function findPlatformUnderEnemy(enemy) {
  const center = enemy.x + enemy.w / 2;
  for (const plat of platforms) {
    if (center >= plat.x - 1 && center <= plat.x + plat.w + 1) {
      const feet = enemy.y + enemy.h;
      if (feet >= plat.y - 2 && feet <= plat.y + 8) {
        return plat;
      }
  }
}
return null;
}

function corrodePlatform(plat, seg, dt) {
  if (!plat) return null;
  const overlapStart = Math.max(plat.x, seg.x);
  const overlapEnd = Math.min(plat.x + plat.w, seg.x + seg.w);
  if (overlapEnd <= overlapStart) return plat;

  seg.supportId = plat.id;
  if (!state.upgrades.melt_platforms) {
    seg.vy = 0;
    seg.y = plat.y - seg.h;
    return plat;
  }
  const meltMultiplier = 0.45 + playerDamagePerTick() * 0.15;
  plat.integrity -= seg.damagePerSecond * dt * meltMultiplier;
  if (plat.integrity < plat.maxIntegrity) {
    playCorrosionSound();
  }
if (plat.integrity <= 0) {
  markPlatformForRemoval(plat.id);
  return null;
}
return plat;
}

function markPlatformForRemoval(id) {
  corrodedPlatformIds.add(id);
}

function removeCorrodedPlatforms() {
  if (!corrodedPlatformIds.size) return;
  for (let i = platforms.length - 1; i >= 0; i--) {
    const plat = platforms[i];
    if (corrodedPlatformIds.has(plat.id)) {
      platforms.splice(i, 1);
      releaseSegmentsFromSupport(plat.id);
      releaseEnemiesFromSupport(plat.id);
      platformBounds.delete(plat.id);
    }
}
corrodedPlatformIds.clear();
}

function releaseSegmentsFromSupport(platformId) {
  for (const seg of trailSegments) {
    if (seg.supportId === platformId) {
      seg.supportId = null;
      seg.grounded = false;
    }
}
}

function releaseEnemiesFromSupport(platformId) {
  for (const enemy of enemies) {
    if (enemy.supportId === platformId) {
      enemy.supportId = null;
      enemy.grounded = false;
    }
}
}

let lastTime = performance.now();

function update(dt) {
  if (state.homeScreenActive) {
    statusEl.textContent = 'Home - click Start to run';
    return;
  }
  if (state.gameOver) {
    gameOverState.animTime += dt;
    updateGameOverTears(dt);
    statusEl.textContent = 'Game Over - press Y to continue';
    return;
  }
  if (state.paused) {
    statusEl.textContent = 'Paused - press Esc to continue';
    return;
  }
  state.slimeFlingCooldown -= dt;
  if (state.slimeFlingCooldown <= 0) {
    state.slimeFlingCooldown = 0;
    state.slimeFlingCooldownMax = 0;
  }
  player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  if (!state.gameOver) {
    const best = highScores.length ? Math.floor(highScores[0]) : 0;
    statusEl.textContent = `HP ${player.health}/${player.maxHealth} | Dist ${Math.floor(player.farthest)} | Coins ${Math.floor(player.coins)} | Top ${best}`;
  }
  const input = {
    left: keys.has('arrowleft') || keys.has('a'),
    right: keys.has('arrowright') || keys.has('d'),
    jump: keys.has(' ') || keys.has('arrowup') || keys.has('w'),
    duck: keys.has('arrowdown') || keys.has('s'),
    swallow: keys.has('f'),
  };

  const allowMovement = !state.shopActive;
  updatePlayerMovement(player, dt, input, world, {
    swallowShield,
    applyPlayerScale,
    spawnSlimeGlob,
    playJumpSound,
    ensureWorldAhead,
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
    openShop();
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
  updateEnemies({
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
    spikedShoes: state.upgrades.spiked_shoes,
  });
  updateDamageNumbers(dt);
  checkTraps();
  cleanupOldEntities();
}

function resolvePlatformCollisions(entity) {
  const platformsToCheck = [
  ...platforms,
  { x: 0, y: world.groundY, w: world.width, h: 40 },
];

for (const plat of platformsToCheck) {
  const overlapX = entity.x < plat.x + plat.w && entity.x + entity.w > plat.x;
  const overlapY = entity.y < plat.y + plat.h && entity.y + entity.h > plat.y;
    if (overlapX && overlapY) {
      const passableForPlayer = plat.passable && entity === player;
    const entityBottom = entity.y + entity.h;
    const platformTop = plat.y;
    const entityTop = entity.y;
    const platformBottom = plat.y + plat.h;

    const distTop = entityBottom - platformTop;
    const distBottom = platformBottom - entityTop;
    const distLeft = entity.x + entity.w - plat.x;
    const distRight = plat.x + plat.w - entity.x;

    const minDist = Math.min(distTop, distBottom, distLeft, distRight);

          if (minDist === distTop) {
            if (entity === player && passableForPlayer && player.dropThroughTimer > 0) {
              continue;
            }
            if (passableForPlayer) {
              const wasAbove = player.prevY + player.h <= platformTop + 1;
              if (!wasAbove) {
                continue;
              }
    }
  entity.y = platformTop - entity.h;
  entity.vy = 0;
  entity.grounded = true;
  if (entity === player) {
    player.squish = Math.min(0.25, player.squish + 0.18);
  }
} else if (minDist === distBottom) {
if (passableForPlayer) continue;
entity.y = platformBottom;
entity.vy = 0;
} else if (minDist === distLeft) {
if (passableForPlayer) continue;
entity.x = plat.x - entity.w;
entity.vx = Math.min(0, entity.vx);
} else if (minDist === distRight) {
if (passableForPlayer) continue;
entity.x = plat.x + plat.w;
entity.vx = Math.max(0, entity.vx);
}
}
}
}

function updateCamera() {
  const desired = player.x - viewRightMargin;
  const maxCameraX = Math.max(0, world.width - canvas.width);
  camera.x = Math.max(0, Math.min(maxCameraX, desired));
}

function getSlimeTrailScale() {
  return Math.max(0.35, player.health / player.maxHealth);
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
  let supportingPlat = seg.supportId != null ? findPlatformById(seg.supportId) : null;
  if (seg.grounded && seg.supportId != null) {
    if (!supportingPlat) {
      seg.grounded = false;
      seg.supportId = null;
    } else {
    const updatedPlat = corrodePlatform(supportingPlat, seg, dt);
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
      const landedPlat = corrodePlatform(plat, seg, dt);
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
removeCorrodedPlatforms();
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
  healPlayer(1);
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
  let removed = false;
    for (const plat of platforms) {
      if (proj.x + proj.w > plat.x && proj.x < plat.x + plat.w &&
        proj.y + proj.h > plat.y && proj.y < plat.y + plat.h) {
        enemyProjectiles.splice(i, 1);
        removed = true;
        break;
    }
}
if (removed) continue;
    if (proj.y + proj.h >= world.groundY) {
      enemyProjectiles.splice(i, 1);
      continue;
    }

    if (proj.reflected) {
      let enemyHit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (overlap(enemy, proj)) {
          enemy.health -= proj.damage ?? 1;
          spawnDamageNumber(enemy.x + enemy.w / 2, enemy.y, proj.damage ?? 1, `enemy-${enemy.id}`);
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
      enemyProjectiles.splice(i, 1);
      hurtPlayer(proj.damage, proj.x + proj.w / 2);
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

function hurtPlayer(amount, sourceX) {
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
applyPlayerScale();
if (player.health <= 0) {
  player.health = 0;
  player.alive = false;
  recordHighScore(player.farthest);
  triggerGameOver();
}
}

function clampPlayerHorizontal() {
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > world.width) player.x = world.width - player.w;
}

function checkTraps() {
  for (const trap of traps) {
    if (overlap(player, trap)) {
      hurtPlayer(trap.damage ?? 1, trap.x + trap.w / 2);
    }
}
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

function healPlayer(amount) {
  const prev = player.health;
  player.health = Math.min(player.maxHealth, player.health + amount);
  if (player.health !== prev) {
    applyPlayerScale();
  }
}

function applyPlayerScale() {
  player.applyScale(world);
}

function playCorrosionSound() {
  audio.ensureLoop('corrosion');
}

function stopCorrosionSound() {
  audio.stopLoop('corrosion');
}

function openShop(force = false) {
  if (state.shopActive) return;
  const selections = pickShopOptions(3);
  if (!selections.length) {
    if (!force) {
      player.nextShopAt += SHOP_INTERVAL;
    } else {
      shopManager.updateMessage('No upgrades available.');
    }
    return;
  }
  state.shopActive = true;
  state.currentShopOptions = selections;
  shopManager.open(selections, handleShopSelection);
}

function closeShop(message) {
  if (message) shopManager.updateMessage(message);
  state.shopActive = false;
  shopManager.close();
  player.nextShopAt += SHOP_INTERVAL;
}

function handleShopSelection(option) {
  if (!state.shopActive) return;
  const upgrade = UPGRADES.find((upg) => upg.id === option);
  if (!upgrade) {
    shopManager.updateMessage('Unknown upgrade, pick another.');
    return;
  }
  if (state.upgrades[upgrade.id]) {
    shopManager.updateMessage('Already acquired.');
    return;
  }
  const costResult = attemptPurchase(upgrade.cost || {});
  if (!costResult.success) {
    shopManager.updateMessage(costResult.message);
    return;
  }
  applyUpgrade(upgrade);
  shopManager.updateMessage(`${upgrade.title} unlocked!`);
  closeShop();
}

function refreshShopOptions() {
  if (player.coins < SHOP_REFRESH_COST) {
    shopManager.updateMessage(`${SHOP_REFRESH_COST} coins required to refresh.`);
    return;
  }
  const options = pickShopOptions(3);
  if (!options.length) {
    shopManager.updateMessage('No upgrades left to refresh.');
    return;
  }
  player.coins -= SHOP_REFRESH_COST;
  state.currentShopOptions = options;
  shopManager.open(options, handleShopSelection);
  shopManager.updateMessage('Shop refreshed!');
}

function resetUpgradeFlags() {
  if (state.upgrades) {
    Object.keys(state.upgrades).forEach((key) => {
      state.upgrades[key] = false;
    });
  }
  state.magnetRange = 0;
  state.purchasedUpgrades?.clear?.();
}

function pickShopOptions(limit = 3) {
  const locked = UPGRADES.filter((upg) => !state.upgrades[upg.id]);
  if (!locked.length) return [];
  const pool = locked.slice();
  const selection = [];
  while (selection.length < Math.min(limit, pool.length)) {
    const idx = Math.floor(Math.random() * pool.length);
    selection.push(pool.splice(idx, 1)[0]);
  }
  return selection.map((upg) => ({
    ...upg,
    costText: formatCost(upg.cost || {}),
  }));
}

function formatCost(cost = {}) {
  const parts = [];
  if (cost.hp) parts.push(`${cost.hp} HP`);
  if (cost.coins) parts.push(`${cost.coins} Coins`);
  if (!parts.length) return 'Cost: Free';
  return `Cost: ${parts.join(' + ')}`;
}

function attemptPurchase(cost = {}) {
  const hpCost = cost.hp ?? 0;
  const coinCost = cost.coins ?? 0;
  if (hpCost > 0 && player.health <= hpCost) {
    return { success: false, message: `Need more than ${hpCost} HP.` };
  }
  if (coinCost > 0 && player.coins < coinCost) {
    return { success: false, message: `${coinCost} coins required.` };
  }
  if (hpCost > 0) {
    player.health -= hpCost;
    applyPlayerScale();
  }
  if (coinCost > 0) {
    player.coins -= coinCost;
  }
  return { success: true };
}

function applyUpgrade(upgrade) {
  state.upgrades[upgrade.id] = true;
  switch (upgrade.id) {
    case 'slime_wall':
      player.wallMode = false;
      break;
    case 'slime_fling':
      state.slimeFlingCooldown = 0;
      break;
    case 'regen':
      player.regenUnlocked = true;
      player.regenTimer = 0;
      break;
    case 'melt_platforms':
      break;
    case 'magnet':
      state.magnetRange = (upgrade.magnetRange ?? PLATFORM_UNIT * 2) + PLATFORM_UNIT * 2;
      break;
    case 'spiked_shoes':
      break;
    case 'royal_slime':
      player.maxHealth = 40;
      applyPlayerScale();
      break;
  }
}

function handleGameOverKey(key) {
  if (!state.gameOver) return;
  if (key === 'y') {
    stopGameOverSound();
    resetGame();
    lastTime = performance.now();
    loop(lastTime);
  } else if (key === 'n') {
    resetGame(true);
  }
}

function triggerGameOver() {
  if (state.gameOver) return;
  state.gameOver = true;
  state.shopActive = false;
  shopManager.close();
  keys.clear();
  const screenX = Math.max(0, Math.min(canvas.width, (player.x - camera.x) + player.w / 2));
  const screenY = Math.max(0, Math.min(canvas.height, player.y + player.h / 2));
  gameOverState.startScreenX = screenX;
  gameOverState.startScreenY = screenY;
  gameOverState.startW = player.w;
  gameOverState.startH = player.h;
  gameOverState.playerW = player.w;
  gameOverState.playerH = player.h;
  gameOverState.animTime = 0;
  gameOverState.info = '';
  state.gameOverTears.length = 0;
  state.gameOverTearTimer = 0;
  state.gameOverNextTearSide = 'left';
  setGameOverControlsVisible(true);
  statusEl.textContent = 'Game Over - press Y to continue';
  stopAllSoundsExceptGameOver();
  playGameOverSound();
  audio.setMusicResumeEnabled(false);
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
  applyPlayerScale();
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
  resetUpgradeFlags();
  const savedCoins = player.coins;
  const baseMaxHealth = PLAYER_CONFIG.maxHealth;
  const baseCoinMultiplier = 1;
  state.gameOver = false;
  setGameOverControlsVisible(false);
  stopGameOverSound();
  statusEl.textContent = '';
  state.shopActive = false;
  shopManager.close();
  gameOverState.info = '';
  gameOverState.animTime = 0;
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
  world.width = canvas.width * 1.5;
  camera.x = 0;
  state.gameOverTears.length = 0;
  state.gameOverTearTimer = 0;
  state.gameOverNextTearSide = 'left';

  const newCoins = toHome ? 0 : savedCoins;
  player.reset(world, {
    maxHealth: baseMaxHealth,
    health: Math.min(baseMaxHealth, 10),
    coins: newCoins,
    coinMultiplier: baseCoinMultiplier,
    regenUnlocked: false,
    nextShopAt: SHOP_INTERVAL,
  });
applyPlayerScale();
seedWorld();
  if (toHome) {
    state.homeScreenActive = true;
    setHomeScreenVisible(true);
    audio.stopLoop?.('music');
  } else {
    audio.startMusic?.();
  }
}

function overlap(a, b) {
  return a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;
}

function drawParallaxBackground() {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, '#040816');
  skyGradient.addColorStop(0.45, '#0a1730');
  skyGradient.addColorStop(1, '#071024');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const layers = [
  { speed: 0.12, color: '#0b1831', tree: '#122640', spacing: 240, height: 130, canopy: '#1d3556', offsetY: 160 },
  { speed: 0.25, color: '#0f223f', tree: '#163454', spacing: 180, height: 150, canopy: '#20486e', offsetY: 100 },
  { speed: 0.4, color: '#142d4e', tree: '#1a4369', spacing: 150, height: 170, canopy: '#246087', offsetY: 60 },
];

layers.forEach((layer) => {
  const baseY = world.groundY - layer.offsetY;
  const offset = (camera.x * layer.speed) % layer.spacing;
  ctx.fillStyle = layer.color;
  ctx.fillRect(0, baseY, canvas.width, canvas.height - baseY);
  for (let x = -layer.spacing; x < canvas.width + layer.spacing; x += layer.spacing) {
    const treeX = x - offset;
    drawTree(treeX, baseY, layer.height, layer.tree, layer.canopy);
  }
});
}

function drawTree(x, baseY, height, trunkColor, canopyColor) {
  const trunkWidth = 18;
  const canopyWidth = 70;
  const canopyHeight = height * 0.7;
  ctx.fillStyle = trunkColor;
  ctx.fillRect(x, baseY - height, trunkWidth, height);
  ctx.fillStyle = canopyColor;
  ctx.beginPath();
  ctx.moveTo(x - canopyWidth / 2, baseY - height * 0.55);
  ctx.lineTo(x + trunkWidth / 2, baseY - height - canopyHeight);
  ctx.lineTo(x + trunkWidth + canopyWidth / 2, baseY - height * 0.55);
  ctx.closePath();
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawParallaxBackground();
  if (state.gameOver) {
    drawGameOverScene();
    return;
  }

ctx.save();
ctx.translate(-camera.x, 0);

ctx.fillStyle = '#162344';
const groundStart = camera.x - 200;
ctx.fillRect(groundStart, world.groundY, canvas.width + 400, canvas.height - world.groundY);

const markerStart = Math.max(0, Math.floor((camera.x - MARKER_SPACING * 2) / MARKER_SPACING) * MARKER_SPACING);
const markerEnd = camera.x + canvas.width + MARKER_SPACING;
for (let mark = markerStart; mark <= markerEnd; mark += MARKER_SPACING) {
  ctx.fillStyle = 'rgba(53, 208, 186, 0.35)';
  ctx.fillRect(mark - 1, world.groundY - 6, 2, 6);
}
ctx.fillStyle = '#ff5d6c';
ctx.font = '12px Arial';
highScores.forEach((score, index) => {
  if (score >= markerStart && score <= markerEnd) {
    ctx.fillRect(score - 2, world.groundY - 14 - index * 10, 4, 14);
    ctx.fillText(`HS${index + 1}`, score, world.groundY - 18 - index * 10);
  }
});

traps.forEach((trap) => {
  ctx.fillStyle = '#60192a';
  ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
  ctx.fillStyle = '#a9334b';
  ctx.fillRect(trap.x + 4, trap.y + 4, trap.w - 8, trap.h - 8);
});

platforms.forEach((plat) => {
  ctx.fillStyle = plat.color;
  ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  if (plat.integrity < plat.maxIntegrity) {
    const wear = Math.min(1, 1 - (plat.integrity / plat.maxIntegrity));
    ctx.fillStyle = `rgba(93, 255, 186, ${0.35 * wear})`;
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  }
ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
ctx.lineWidth = 1;
ctx.strokeRect(plat.x + 0.5, plat.y + 0.5, plat.w - 1, plat.h - 1);
});

trailSegments.forEach((seg) => {
  const alpha = seg.life / seg.maxLife;
  ctx.fillStyle = `rgba(93, 255, 186, ${0.12 + 0.3 * alpha})`;
  ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
  ctx.fillStyle = `rgba(53, 208, 186, ${0.35 * alpha})`;
  ctx.fillRect(seg.x + 8, seg.y + 4, seg.w - 16, seg.h - 8);
});

slimeGlobs.forEach((glob) => {
  const alpha = Math.max(0.2, glob.life / 2.6);
  ctx.fillStyle = `rgba(93, 255, 186, ${0.45 * alpha})`;
  ctx.beginPath();
  ctx.ellipse(glob.x + glob.w / 2, glob.y + glob.h / 2, glob.w / 2, glob.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(59, 163, 137, ${0.35 * alpha})`;
  ctx.beginPath();
  ctx.ellipse(glob.x + glob.w / 2, glob.y + glob.h / 2 - 4, glob.w / 3, glob.h / 3, 0, 0, Math.PI * 2);
  ctx.fill();
});

slimeChunks.forEach((chunk) => {
  ctx.fillStyle = '#5dffba';
  ctx.fillRect(chunk.x, chunk.y, chunk.w, chunk.h);
  ctx.fillStyle = '#3ba389';
  ctx.fillRect(chunk.x + 3, chunk.y + 3, chunk.w - 6, chunk.h - 6);
});

coins.forEach((coin) => {
  if (coinImage.complete) {
    ctx.drawImage(coinImage, coin.x, coin.y, coin.w, coin.h);
  } else {
  ctx.fillStyle = '#ffd25d';
  ctx.beginPath();
  ctx.arc(coin.x + coin.w / 2, coin.y + coin.h / 2, coin.w / 2, 0, Math.PI * 2);
  ctx.fill();
}
});

enemyProjectiles.forEach((proj) => {
  if (proj.reflected) {
    ctx.fillStyle = '#35d0ba';
    ctx.strokeStyle = '#d9fef9';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.95;
    ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
    ctx.strokeRect(proj.x, proj.y, proj.w, proj.h);
  } else {
    ctx.fillStyle = '#ffd25d';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
  }
  ctx.globalAlpha = 1;
});

const invuln = player.invulnTimer > 0;
if (invuln) {
  const flash = 0.5 + 0.5 * Math.sin(performance.now() * 0.02);
  ctx.globalAlpha = 0.4 + 0.5 * flash;
}
const idleBreathe = 1 + 0.04 * Math.sin(player.idleTimer * 3.2);
const idleSquish = 1 - 0.04 * Math.sin(player.idleTimer * 3.2 + Math.PI / 2);
const squishX = (1 + player.squish * 0.5) * idleBreathe;
const squishY = Math.max(0.4, 1 - player.squish * 0.5) * idleSquish;
const baseX = player.x + player.w / 2;
const baseY = player.y + player.h - 10;
if (player.wallMode) {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = 'rgba(59, 163, 137, 0.8)';
  ctx.fillRect(player.x + 3, player.y + 6, player.w - 6, player.h - 12);
  ctx.strokeStyle = 'rgba(93, 255, 186, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(player.x + 1, player.y + 1, player.w - 2, player.h - 2);
} else {
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.ellipse(baseX, baseY, (player.w / 2) * squishX, (player.h / 2) * squishY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3ba389';
  ctx.beginPath();
  ctx.ellipse(baseX, baseY - 8, (player.w / 2.5) * squishX, (player.h / 3) * squishY, 0, 0, Math.PI * 2);
  ctx.fill();
}
if (invuln) ctx.globalAlpha = 1;

if (player.shieldActive) {
  ctx.save();
  ctx.strokeStyle = 'rgba(80, 147, 255, 0.5)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(baseX, baseY - player.h / 4, (player.w / 2) * 1.25, (player.h / 2) * 1.25, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

enemies.forEach((enemy) => {
  ctx.fillStyle = enemy.acidTimer > 0 ? '#ffa1b1' : enemy.color;
  ctx.beginPath();
  ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h - 8, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffb3bc';
  ctx.beginPath();
  ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h - 14, enemy.w / 2.4, enemy.h / 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (enemy.acidDuration > 0) {
    const acidAlpha = Math.min(0.7, 0.3 + (enemy.acidDuration / ACID_DEBUFF_DURATION) * 0.4);
    ctx.fillStyle = `rgba(93, 255, 186, ${acidAlpha})`;
    ctx.beginPath();
    ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h - 10, enemy.w / 2.1, enemy.h / 2.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
drawHealthBar(enemy.x + enemy.w / 2, enemy.y - 14, enemy.health, enemy.maxHealth);
});

drawHealthBar(player.x + player.w / 2, player.y - 20, player.health, player.maxHealth);
drawFlingCooldownIndicator();

damageNumbers.forEach((num) => {
  const alpha = Math.max(0, num.life / damageLifetime);
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`-${num.value}`, num.x, num.y);
});

ctx.restore();

if (state.godMode) {
  ctx.save();
  ctx.fillStyle = '#ffef5d';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('God Mode Enabled', 20, 40);
  ctx.restore();
}

if (!player.alive) {
  ctx.fillStyle = 'rgba(10, 10, 20, 0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff8a9e';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
  ctx.font = '24px Arial';
  ctx.fillText('Refresh to try again.', canvas.width / 2, canvas.height / 2 + 40);
}
}

function getGameOverPresentation() {
  const duration = Math.max(0.1, gameOverState.duration || 1.4);
  const progress = Math.min(1, gameOverState.animTime / duration);
  const ease = 1 - Math.pow(1 - progress, 3);
  const centerX = canvas.width / 2;
  const stageTop = canvas.height - 180;
  const stageHeight = 90;
  const stageWidth = canvas.width * 0.55;
  const stageX = centerX - stageWidth / 2;
  const startX = gameOverState.startScreenX ?? centerX;
  const startY = gameOverState.startScreenY ?? stageTop;
  const targetY = stageTop - 10;
  const currentX = startX + (centerX - startX) * ease;
  const currentY = startY + (targetY - startY) * ease;
  const startW = gameOverState.startW ?? player.baseW;
  const startH = gameOverState.startH ?? player.baseH;
  const targetScale = 10;
  const scale = 1 + (targetScale - 1) * ease;
  const displayW = startW * scale;
  const displayH = startH * scale;
  const settleTime = Math.max(0, gameOverState.animTime - duration);
  const huffStrength = Math.min(1, settleTime * 1.2);
  return {
    ease,
    centerX,
    stageTop,
    stageHeight,
    stageWidth,
    stageX,
    currentX,
    currentY,
    displayW,
    displayH,
    settleTime,
    huffStrength,
    eyeOffsetX: displayW * 0.25,
    eyeY: currentY - displayH * 0.1,
    stageFloor: stageTop + stageHeight,
  };
}

function updateGameOverTears(dt) {
  if (!state.gameOver) return;
  const presentation = getGameOverPresentation();
  if (!presentation) return;
  const {
    currentX,
    eyeOffsetX,
    eyeY,
    displayW,
    displayH,
    stageFloor,
    ease,
  } = presentation;
  state.gameOverTearTimer = Math.max(0, state.gameOverTearTimer - dt);
  for (let i = state.gameOverTears.length - 1; i >= 0; i--) {
    const tear = state.gameOverTears[i];
    tear.y += tear.speed * dt;
    tear.height = Math.min(tear.maxHeight, tear.height + tear.extendRate * dt);
    if (tear.y - tear.height > canvas.height + 60) {
      state.gameOverTears.splice(i, 1);
    }
  }
  if (ease <= 0.05 || state.gameOverTearTimer > 0) return;
  const side = state.gameOverNextTearSide ?? 'left';
  const sign = side === 'left' ? -1 : 1;
  spawnGameOverTear(currentX + sign * eyeOffsetX, eyeY, displayW, displayH, stageFloor);
  state.gameOverNextTearSide = side === 'left' ? 'right' : 'left';
  state.gameOverTearTimer = Math.max(0.18, 0.35 - ease * 0.15);
}

function spawnGameOverTear(x, eyeY, displayW, displayH, stageFloor) {
  const baseWidth = Math.max(12, displayW * 0.07);
  const initialHeight = Math.max(20, displayH * 0.2);
  const maxHeight = Math.max(initialHeight * 1.5, stageFloor - eyeY + 30);
  const speed = 220 + displayH * 0.3;
  const extendRate = Math.max(120, displayH * 0.35);
  state.gameOverTears.push({
    x,
    y: eyeY,
    width: baseWidth,
    height: initialHeight,
    maxHeight,
    speed,
    extendRate,
  });
}

function drawGameOverTears(ease) {
  if (!state.gameOverTears.length) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, 0.4 + ease * 0.6);
  state.gameOverTears.forEach((tear) => {
    const gradient = ctx.createLinearGradient(tear.x, tear.y, tear.x, tear.y + tear.height);
    gradient.addColorStop(0, 'rgba(200, 240, 255, 0.95)');
    gradient.addColorStop(1, 'rgba(93, 160, 255, 0.35)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(tear.x, tear.y);
    ctx.lineTo(tear.x - tear.width / 2, tear.y + tear.height);
    ctx.lineTo(tear.x + tear.width / 2, tear.y + tear.height);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

function drawGameOverScene() {
  const presentation = getGameOverPresentation();
  if (!presentation) return;
  const {
    ease,
    centerX,
    stageTop,
    stageHeight,
    stageWidth,
    stageX,
    currentX,
    currentY,
    displayW,
    displayH,
    settleTime,
    huffStrength,
    eyeOffsetX,
    eyeY,
  } = presentation;
  const breathe = 1 + (0.04 + 0.06 * huffStrength) * Math.sin(gameOverState.animTime * 3.4);
  const puff = 1 - (0.04 + 0.05 * huffStrength) * Math.sin(gameOverState.animTime * 3.4 + Math.PI / 2);

  ctx.fillStyle = `rgba(5, 7, 20, ${0.75 * ease})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = ease;
  ctx.fillStyle = '#111a2d';
  ctx.fillRect(stageX, stageTop, stageWidth, stageHeight);
  ctx.fillStyle = '#0a101f';
  ctx.fillRect(stageX, stageTop + stageHeight - 18, stageWidth, 18);
  ctx.strokeStyle = '#35d0ba';
  ctx.lineWidth = 2;
  ctx.strokeRect(stageX, stageTop, stageWidth, stageHeight);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = ease;
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.ellipse(currentX, currentY, (displayW / 2) * breathe, (displayH / 2) * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3ba389';
  ctx.beginPath();
  ctx.ellipse(currentX, currentY - 12, (displayW / 2.5) * breathe, (displayH / 3) * puff, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0b1f1c';
  ctx.lineWidth = Math.max(3, displayH * 0.04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  const eyeWidth = displayW * 0.15;
  ctx.moveTo(currentX - eyeOffsetX - eyeWidth / 2, eyeY);
  ctx.lineTo(currentX - eyeOffsetX + eyeWidth / 2, eyeY);
  ctx.moveTo(currentX + eyeOffsetX - eyeWidth / 2, eyeY);
  ctx.lineTo(currentX + eyeOffsetX + eyeWidth / 2, eyeY);
  ctx.stroke();
  ctx.restore();

  drawGameOverTears(ease);

  ctx.fillStyle = `rgba(255, 138, 158, ${ease})`;
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Slime is in pain...', centerX, 140);
  ctx.fillStyle = `rgba(212, 253, 245, ${ease})`;
  ctx.font = '24px Arial';
  ctx.fillText('Continue?', centerX, 180);
}

function drawHealthBar(centerX, y, health, maxHealth) {
  const totalUnits = 10;
  const unitWidth = 12;
  const unitHeight = 6;
  const spacing = 3;
  const barWidth = totalUnits * unitWidth + (totalUnits - 1) * spacing;
  let startX = centerX - barWidth / 2;
  const safeHealth = Math.max(0, Math.min(40, Math.round(health)));

  const purpleCount = Math.max(0, Math.min(totalUnits, Math.floor(safeHealth - 30)));
  const redPotential = Math.max(0, Math.floor(Math.min(safeHealth, 30) - 20));
  const redCount = Math.max(0, Math.min(totalUnits - purpleCount, redPotential));
  const yellowPotential = Math.max(0, Math.floor(Math.min(safeHealth, 20) - 10));
  const yellowCount = Math.max(0, Math.min(totalUnits - purpleCount - redCount, yellowPotential));
  const greenPotential = Math.max(0, Math.min(safeHealth, 10));
  const greenCount = Math.max(0, Math.min(totalUnits - purpleCount - redCount - yellowCount, greenPotential));
  const emptyCount = Math.max(0, totalUnits - purpleCount - redCount - yellowCount - greenCount);

  const segments = [
  ...Array(purpleCount).fill('#c05dff'),
  ...Array(redCount).fill('#ff5d6c'),
  ...Array(yellowCount).fill('#ffd25d'),
  ...Array(greenCount).fill('#5dffba'),
  ...Array(emptyCount).fill('rgba(93, 255, 186, 0.2)'),
];

segments.slice(0, totalUnits).forEach((color) => {
  ctx.strokeStyle = '#09101f';
  ctx.lineWidth = 1;
  ctx.strokeRect(startX, y, unitWidth, unitHeight);
  ctx.fillStyle = color;
  ctx.fillRect(startX, y, unitWidth, unitHeight);
  startX += unitWidth + spacing;
});
}

function drawFlingCooldownIndicator() {
  if (state.slimeFlingCooldown <= 0 || state.slimeFlingCooldownMax <= 0) return;
  const size = 36;
  const baseX = player.x + player.w / 2 - size / 2;
  const baseY = player.y - size - 36;
  const remaining = Math.max(0, state.slimeFlingCooldown);
  const total = Math.max(remaining, state.slimeFlingCooldownMax);
  const progress = 1 - remaining / total;

  ctx.save();
  ctx.fillStyle = 'rgba(8, 14, 26, 0.85)';
  ctx.strokeStyle = '#35d0ba';
  ctx.lineWidth = 2;
  ctx.fillRect(baseX, baseY, size, size);
  ctx.strokeRect(baseX, baseY, size, size);

  const centerX = baseX + size / 2;
  const centerY = baseY + size / 2;
  const radius = size / 2 - 6;

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(53, 208, 186, 0.75)';
  ctx.lineWidth = 2;
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.fillStyle = 'rgba(53, 208, 186, 0.45)';
  ctx.arc(centerX, centerY, radius - 2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#d9fef9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX, centerY - radius + 4);
  ctx.stroke();
  ctx.beginPath();
  const handAngle = -Math.PI / 2 + (progress * Math.PI * 2);
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + (radius - 6) * Math.cos(handAngle), centerY + (radius - 6) * Math.sin(handAngle));
  ctx.stroke();

  ctx.fillStyle = '#f2fffb';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(remaining.toFixed(1), centerX, centerY + 4);
  ctx.restore();
}

function loop(timestamp) {
  const dt = Math.min(0.016, (timestamp - lastTime) / 1000);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
loop(lastTime);

/**
 * UI & Visual Configuration
 * All constants related to UI rendering, animations, and visual effects
 */

/**
 * @typedef {Object} DamageNumbersConfig
 * @property {number} floatSpeed - Upward float speed
 * @property {number} lifetime - Display duration (seconds)
 * @property {number} limitPerSecond - Max damage numbers per second per entity
 */

/**
 * @typedef {Object} BossHealthConfig
 * @property {number} barCount - Number of health bars
 * @property {number} barWidth - Width of each bar
 * @property {number} barHeight - Height of each bar
 * @property {number} barSpacing - Space between bars
 * @property {number} yOffset - Distance from top of screen
 */

/**
 * @typedef {Object} ShieldIconConfig
 * @property {number} size - Icon dimensions (square)
 * @property {number} xOffset - Distance from right of health bars
 * @property {string} cooldownColor - Color during cooldown
 * @property {number} glowCycle - Glow animation cycle duration
 */

/**
 * @typedef {Object} MetallicSheenConfig
 * @property {number} lineWidth - Width of each sheen line
 * @property {number} lineSpacing - Space between lines
 * @property {number} opacity1 - First line opacity
 * @property {number} opacity2 - Second line opacity
 * @property {number} sweepDuration - Animation duration
 * @property {number} sweepInterval - Time between sweeps
 */

/**
 * @typedef {Object} ScreenEffectsConfig
 * @property {number} whiteFlashDuration - White flash duration
 * @property {number} whiteFlashFadeStart - When fade starts
 * @property {number} hitFlashDuration - Hit flash duration
 */

/**
 * @typedef {Object} AbilityListConfig
 * @property {number} maxVisible - Max abilities shown at once
 */

/**
 * @typedef {Object} FlingCooldownConfig
 * @property {number} barHeight - Cooldown bar height
 * @property {number} yOffset - Distance below player
 */

/**
 * @typedef {Object} GameOverTearsConfig
 * @property {number} spawnRate - Seconds between tears
 * @property {number} fallSpeed - Tear fall velocity
 * @property {number} size - Tear radius
 */

/**
 * @typedef {Object} UIConfig
 * @property {DamageNumbersConfig} damageNumbers - Damage number display settings
 * @property {BossHealthConfig} bossHealth - Boss health bar settings
 * @property {ShieldIconConfig} shieldIcon - Boss shield icon settings
 * @property {MetallicSheenConfig} metallicSheen - Metallic animation settings
 * @property {ScreenEffectsConfig} effects - Screen effect settings
 * @property {AbilityListConfig} abilityList - Ability list settings
 * @property {FlingCooldownConfig} flingCooldown - Fling cooldown indicator settings
 * @property {GameOverTearsConfig} gameOverTears - Game over tear settings
 */

/** @type {UIConfig} */
export const UI_CONFIG = {
  // Damage numbers
  damageNumbers: {
    floatSpeed: 28,           // Upward float speed
    lifetime: 0.8,            // Display duration (seconds)
    limitPerSecond: 2,        // Max damage numbers per second per entity
  },
  
  // Boss health bars
  bossHealth: {
    barCount: 4,              // Number of health bars
    barWidth: 200,            // Width of each bar
    barHeight: 20,            // Height of each bar
    barSpacing: 4,            // Space between bars
    yOffset: 30,              // Distance from top of screen
  },
  
  // Boss shield buff icon
  shieldIcon: {
    size: 60,                 // Icon dimensions (square)
    xOffset: 20,              // Distance from right of health bars
    cooldownColor: 'rgba(0, 0, 0, 0.6)',
    glowCycle: 2.0,           // Glow animation cycle duration
  },
  
  // Metallic sheen animation
  metallicSheen: {
    lineWidth: 15,            // Width of each sheen line
    lineSpacing: 60,          // Space between lines
    opacity1: 0.85,           // First line opacity
    opacity2: 0.425,          // Second line opacity (50% of first)
    sweepDuration: 0.6,       // Animation duration
    sweepInterval: 2.0,       // Time between sweeps
  },
  
  // Screen effects
  effects: {
    whiteFlashDuration: 0.6,
    whiteFlashFadeStart: 0.2,
    hitFlashDuration: 0.2,
  },
  
  // Ability list
  abilityList: {
    maxVisible: 5,            // Max abilities shown at once
  },
  
  // Fling cooldown indicator
  flingCooldown: {
    barHeight: 6,
    yOffset: 10,              // Distance below player
  },
  
  // Game over tears
  gameOverTears: {
    spawnRate: 0.15,          // Seconds between tears
    fallSpeed: 120,           // Tear fall velocity
    size: 12,                 // Tear radius
  },
};

/**
 * @typedef {Object} PlayerAnimationConfig
 * @property {number} squishRecovery - Squish recovery speed (per second)
 * @property {number} duckTransitionSpeed - Duck animation speed
 * @property {number} wallModeRotation - Wall mode rotation angle (radians)
 */

/**
 * @typedef {Object} ChunkAnimationConfig
 * @property {number} gravity - Gravity multiplier for chunks
 * @property {number} bounceDecay - Velocity retained after bounce
 * @property {number} magnetPull - Magnet force
 * @property {number} minMagnetSpeed - Minimum speed when magnetized
 * @property {number} magnetActiveDistance - Distance ratio to activate strong pull
 */

/**
 * @typedef {Object} CoinAnimationConfig
 * @property {number} gravity - Gravity multiplier
 * @property {number} bounceDecay - Velocity retained after bounce
 * @property {number} magnetPull - Magnet force
 * @property {number} minMagnetSpeed - Minimum speed when magnetized
 * @property {number} magnetActiveDistance - Distance ratio to activate strong pull
 */

/**
 * @typedef {Object} AnimationConfig
 * @property {PlayerAnimationConfig} player - Player animation settings
 * @property {ChunkAnimationConfig} chunks - Chunk animation settings
 * @property {CoinAnimationConfig} coins - Coin animation settings
 */

/** @type {AnimationConfig} */
export const ANIMATION_CONFIG = {
  // Player animations
  player: {
    squishRecovery: 10,       // Squish recovery speed (per second)
    duckTransitionSpeed: 8,   // Duck animation speed
    wallModeRotation: Math.PI / 2,  // 90 degrees
  },
  
  // Slime chunks
  chunks: {
    gravity: 0.9,             // Gravity multiplier for chunks
    bounceDecay: 0.6,         // Velocity retained after bounce
    magnetPull: 4800,         // Magnet force
    minMagnetSpeed: 780,      // Minimum speed when magnetized
    magnetActiveDistance: 0.6, // Distance ratio to activate strong pull
  },
  
  // Coins
  coins: {
    gravity: 0.9,             // Gravity multiplier
    bounceDecay: 0.6,         // Velocity retained after bounce
    magnetPull: 4800,         // Magnet force
    minMagnetSpeed: 780,      // Minimum speed when magnetized
  },
  
  // Enemy death
  enemyDeath: {
    chunkSpread: 0.4,         // Random angle spread
    baseSpeed: 160,
    speedVariance: 80,
    chunkCounts: {
      weak: 2,
      medium: 4,
      hard: 6,
    },
  },
  
  // Coin drops
  coinDrops: {
    weak: { min: 3, max: 8 },
    medium: { min: 8, max: 15 },
    hard: { min: 15, max: 30 },
    baseSpeed: 120,
    speedVariance: 70,
  },
};

export const COLOR_CONFIG = {
  // Enemy colors (already in enemyConfig, but keeping for reference)
  enemies: {
    weak: '#5dff5d',
    medium: '#ffd25d',
    hard: '#ff5d6c',
  },
  
  // Boss colors
  boss: {
    base: '#35d0ba',
    metallic: '#8b9a9d',      // When shield active
    poisonCloud: '#9b59b6',
  },
  
  // Player colors
  player: {
    base: '#35d0ba',          // Normal slime color
    mutated: '#35d0ba',       // Post-mutation (same for now)
  },
  
  // Acid trail
  acid: {
    trail: 'rgba(139, 195, 74, 0.7)',
    glob: 'rgba(139, 195, 74, 0.85)',
  },
  
  // UI colors
  ui: {
    healthBar: '#4caf50',
    healthBarBg: 'rgba(0, 0, 0, 0.3)',
    damageNumber: '#ff5252',
    coinText: '#ffd700',
  },
};

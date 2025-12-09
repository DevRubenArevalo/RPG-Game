/**
 * UI & Visual Configuration
 * All constants related to UI rendering, animations, and visual effects
 */

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

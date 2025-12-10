/**
 * Enemy Configuration
 * All constants related to enemy behavior, stats, and appearance
 */

/**
 * @typedef {Object} EnemyProjectileConfig
 * @property {number} interval - Seconds between projectile spawns
 * @property {number} modeSwitch - Seconds between vertical/horizontal mode switch
 * @property {number} speed - Projectile velocity
 */

/**
 * @typedef {Object} EnemyTier
 * @property {string} tier - Tier name ('weak', 'medium', 'hard')
 * @property {number} health - Enemy health points
 * @property {number} damage - Damage dealt to player
 * @property {string} color - Hex color code
 * @property {string} deathMessage - Message displayed when player dies
 */

/**
 * @typedef {Object} EnemyConfig
 * @property {number} width - Enemy width in pixels
 * @property {number} height - Enemy height in pixels
 * @property {EnemyProjectileConfig} projectile - Projectile behavior configuration
 * @property {EnemyTier[]} tiers - Array of enemy tier configurations
 */

/** @type {EnemyConfig} */
export const ENEMY_CONFIG = {
  // Base enemy dimensions
  width: 44,
  height: 34,
  
  // Projectile behavior (for medium tier enemies)
  projectile: {
    interval: 3,        // Seconds between projectile spawns
    modeSwitch: 3,      // Seconds between vertical/horizontal mode switch
    speed: 320,         // Projectile velocity
  },
  
  // Enemy tiers with stats
  tiers: [
    { 
      tier: 'weak', 
      health: 10, 
      damage: 3, 
      color: '#5dff5d', 
      deathMessage: 'Slimed by a weak slime' 
    },
    { 
      tier: 'medium', 
      health: 20, 
      damage: 6, 
      color: '#ffd25d', 
      deathMessage: 'Crushed by a medium slime' 
    },
    { 
      tier: 'hard', 
      health: 30, 
      damage: 9, 
      color: '#ff5d6c', 
      deathMessage: 'Destroyed by a hard slime' 
    },
  ],
};

/**
 * @typedef {Object} BossConfig
 * @property {number} sizeRatio - Ratio of canvas height
 * @property {string} color - Base boss color (hex)
 * @property {number} eyeOffsetRatio - Eye position offset ratio
 * @property {number} health - Total boss health points
 * @property {number} contactDamage - Damage on player collision
 * @property {number} regenRate - HP regeneration per second
 * @property {number} shieldDuration - Invulnerability duration in seconds
 * @property {number} windup - Wind-up time before jump (seconds)
 * @property {number} jumpDuration - Time in air during jump
 * @property {number} recoverDuration - Recovery time after landing
 * @property {number} jumpDistanceRatio - Jump distance as ratio of screen width
 * @property {Object} shockwave - Shockwave attack configuration
 * @property {number} shockwave.count - Number of shockwaves per attack
 * @property {number} shockwave.interval - Time between shockwaves
 * @property {number[]} shockwave.heights - Height percentages for each wave
 * @property {number} shockwave.warningDuration - Warning display time
 * @property {number} shockwave.activeDuration - Active damage time
 * @property {number} shockwave.damage - Damage dealt by shockwave
 */

/** @type {BossConfig} */
export const BOSS_CONFIG = {
  // Size and appearance
  sizeRatio: 0.6,              // Ratio of canvas height
  color: '#35d0ba',            // Base boss color
  eyeOffsetRatio: 0.18,        // Eye position offset ratio
  
  // Combat stats
  health: 160,                 // Total boss health (4 bars of 40 each)
  contactDamage: 5,            // Damage on player collision
  regenRate: 1,                // HP regeneration per second
  shieldDuration: 10,          // Invulnerability duration in seconds
  
  // Attack patterns
  windup: 2.4,                 // Wind-up time before jump (seconds)
  jumpDuration: 1.8,           // Time in air during jump
  recoverDuration: 1.2,        // Recovery time after landing
  jumpDistanceRatio: 0.5,      // Jump distance as ratio of screen width
  jumpHeightRatio: 0.7,        // Jump height as ratio of screen height
  poisonInterval: 2,           // Poison cloud spawn interval
  
  // Morph animation
  morphDuration: 0.25,         // Circle <-> square morph time
  
  // Shockwave projectiles (level-based scaling)
  shockwave: {
    baseHeight: 18,            // Height at difficulty level 1-2
    tallHeight: 150,           // Height at difficulty level 3-4
    baseWidth: 36,             // Width at difficulty level 1-2
    tallWidth: 30,             // Width at difficulty level 3-4
    speed: 420,                // Horizontal velocity
    damage: 4,                 // Damage per hit
    
    // Wave scaling (for multiple waves at higher difficulties)
    wave1Height: 1.0,          // 100% of base height
    wave2Height: 0.65,         // 65% of base height
    wave3Height: 0.35,         // 35% of base height
    
    // Timing between waves
    level3WaveDelay: 0.3,      // Delay for second wave at level 3
    level4Wave2Delay: 0.2,     // Delay for second wave at level 4
    level4Wave3Delay: 0.4,     // Delay for third wave at level 4
  },
  
  // Difficulty scaling (based on health bars depleted)
  difficulty: {
    healthPerBar: 40,          // Health per bar (160 / 4)
    level1JumpSpeed: 1.0,      // Normal jump speed
    level2JumpSpeed: 1.0,      // Normal jump speed
    level3JumpSpeed: 1.5,      // 50% faster
    level4JumpSpeed: 1.75,     // 75% faster
  },
  
  // Cinematic settings
  cinematic: {
    toBossDuration: 2.0,       // Camera pan to boss duration
    roarDuration: 1.4,         // Boss roar animation duration
    backDuration: 1.6,         // Camera return to player duration
    zoom: 1.2,                 // Zoom level during cinematic
  },
  
  // Defeat cinematic
  defeat: {
    pauseDuration: 0.4,        // Pause before cinematic starts
    panDuration: 1.0,          // Pan to boss
    zoomDuration: 0.8,         // Zoom in on boss
    morphDuration: 1.5,        // Morph animation
    swellDuration: 1.0,        // Swell before explosion
    explosionDuration: 0.3,    // Explosion animation
    rainDuration: 15,          // Rain of items duration
    rainSpawnRate: 20,         // Items spawned per second (40 total over 2s)
    explosionParticles: 60,    // Number of particles in explosion
    whiteFlashDuration: 0.6,   // Screen flash duration
    whiteFlashFadeStart: 0.2,  // When flash starts fading
  },
};

// Boss spawn trigger
export const BOSS_TRIGGER_DISTANCE = 20000;

// Chunk drops on shield activation
export const BOSS_SHIELD_CHUNK_COUNT = 10;

/**
 * Player Configuration
 * All constants related to player behavior, stats, and physics
 */

export const PLAYER_CONFIG = {
  // Dimensions
  baseWidth: 56,              // Normal player width
  baseHeight: 48,             // Normal player height
  duckHeight: 28,             // Height when ducking
  
  // Movement physics
  maxSpeed: 420,              // Maximum horizontal velocity
  accel: 2800,                // Horizontal acceleration rate
  jumpSpeed: 820,             // Initial jump velocity
  
  // Jump boost (when health is high)
  jumpBoostThreshold: 30,     // Health required for jump boost
  jumpBoostMultiplier: 1.5,   // Jump power multiplier when boosted
  
  // Combat stats
  maxHealth: 30,              // Default maximum health
  startingHealth: 1,          // Health at game start
  invulnerability: 1,         // Invulnerability duration after hit (seconds)
  
  // Mutation system
  mutationHealthCost: 5,      // Health required to mutate
  mutationResultHealth: 1,    // Health after mutation
  
  // Visual effects
  squishRecovery: 0.1,        // Squish effect recovery rate per frame
  maxSquish: 0.35,            // Maximum squish amount
  
  // Fling ability
  flingChargeRate: 1800,      // Charge accumulation rate
  flingMinCharge: 230,        // Minimum charge to trigger fling
  flingSlowThreshold: 120,    // Speed threshold for "slowing down"
  flingCooldown: 3,           // Cooldown after fling (seconds)
  
  // Wall mode
  wallModeGravity: 0.85,      // Gravity multiplier in wall mode
  
  // Coin pickup
  coinMultiplierBase: 1,      // Base coin value multiplier
};

// Shop intervals
export const SHOP_INTERVAL = 4800;  // Distance between shops

// Acid trail configuration
export const ACID_CONFIG = {
  trailInterval: 0.11,        // Time between trail segments
  tickInterval: 0.5,          // Time between acid damage ticks
  debuffDuration: 3,          // How long acid debuff lasts
  damageNumbersPerSecond: 2,  // Limit damage numbers to prevent spam
  trailDamage: 3.6,           // Damage per second from trail
  globDamage: 7.5,            // Damage per second from glob
  globLifetime: 2.6,          // How long globs persist
  
  // Trail scaling with health
  minTrailScale: 0.35,        // Minimum trail size (at low health)
  trailBaseWidth: 42,         // Base trail width
  trailBaseHeight: 14,        // Base trail height
  trailBaseLife: 1.6,         // Base trail lifetime
  
  // Glob properties
  globWidth: 30,              // Glob width
  globHeight: 18,             // Glob height
  globLaunchAngle: Math.PI / 4,  // 45 degrees
  globBaseSpeed: 320,         // Minimum glob speed
  globSpeedBoost: 140,        // Additional speed added
  globMaxBounces: 3,          // Bounces before disappearing
  globResidueTimer: 0.08,     // Time between residue drops
  
  // Stack system
  maxStacks: 2,               // Maximum acid stacks on enemy
  stackCooldown: 1,           // Cooldown between stack applications
};

// Damage scaling by player health
export const DAMAGE_SCALING = {
  tier1: { threshold: 40, damage: 5 },  // 40+ HP
  tier2: { threshold: 30, damage: 4 },  // 30-39 HP
  tier3: { threshold: 20, damage: 3 },  // 20-29 HP
  tier4: { threshold: 10, damage: 2 },  // 10-19 HP
  tier5: { threshold: 0,  damage: 1 },  // 0-9 HP
};

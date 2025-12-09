/**
 * Configuration Index
 * Central export point for all game configuration
 * Import from here instead of individual config files for cleaner imports
 * 
 * Usage:
 * import { PLAYER_CONFIG, ENEMY_CONFIG, BOSS_CONFIG } from './config/index.js';
 */

export * from './enemyConfig.js';
export * from './playerConfig.js';
export * from './worldConfig.js';
export * from './uiConfig.js';

// Re-export legacy CONSTANTS for backward compatibility
// TODO: Gradually migrate all code to use specific configs above
import { WORLD_CONFIG, CANVAS_CONFIG, GENERATION_CONFIG } from './worldConfig.js';

export const CONSTANTS = {
  canvas: CANVAS_CONFIG,
  world: {
    gravity: WORLD_CONFIG.gravity,
    groundOffset: WORLD_CONFIG.groundOffset,
    frictionGround: WORLD_CONFIG.frictionGround,
    frictionAir: WORLD_CONFIG.frictionAir,
    widthMultiplier: WORLD_CONFIG.widthMultiplier,
  },
  generation: {
    chunkWidth: GENERATION_CONFIG.chunkWidth,
    generationMarginMultiplier: GENERATION_CONFIG.generationMarginMultiplier,
    cleanupBufferMultiplier: GENERATION_CONFIG.cleanupBufferMultiplier,
    safeZoneEnd: GENERATION_CONFIG.safeZoneEnd,
  },
  level: {
    platformUnit: GENERATION_CONFIG.platformUnit,
    markerSpacing: GENERATION_CONFIG.markerSpacing,
  },
};

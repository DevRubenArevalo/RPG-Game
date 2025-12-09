/**
 * World & Physics Configuration
 * All constants related to game world, physics, and level generation
 */

export const WORLD_CONFIG = {
  // Physics
  gravity: 1800,              // Gravity acceleration (pixels/second²)
  frictionGround: 1400,       // Ground friction deceleration
  frictionAir: 150,           // Air friction deceleration
  
  // World dimensions
  groundOffset: 80,           // Distance from bottom of canvas to ground
  widthMultiplier: 1.5,       // Initial world width relative to canvas
  
  // Platform/trap physics
  platformGravity: 0.85,      // Gravity multiplier for objects on platforms
  trapFallSpeed: 480,         // Falling trap velocity
};

export const CANVAS_CONFIG = {
  width: 1280,                // Canvas width
  height: 640,                // Canvas height
};

export const GENERATION_CONFIG = {
  // Chunk generation
  chunkWidth: 760,            // Width of each generation chunk
  safeZoneEnd: 360,           // Distance before enemies/traps spawn
  generationMarginMultiplier: 1.2,  // Generate when player within this ratio of canvas
  cleanupBufferMultiplier: 0.8,     // Cleanup entities outside this ratio of canvas
  
  // Platform generation
  platformUnit: 48,           // Base platform size unit
  platformSeamEpsilon: 0.8,   // Tolerance for platform alignment
  
  // Distance markers
  markerSpacing: 100,         // Distance between distance markers
};

// View/camera settings
export const CAMERA_CONFIG = {
  viewRightMargin: 400,       // Player position relative to right edge
};

// Cutscene room configuration
export const CUTSCENE_CONFIG = {
  roomBounds: {
    minX: 0,
    maxX: 800,                // Width of tutorial/cutscene room
  },
  
  // Poison pool
  poisonPool: {
    width: 200,
    height: 60,
    yOffset: 30,              // Distance above ground
    healInterval: 2.0,        // Seconds between heal ticks
    healAmount: 1,            // HP restored per tick
    particleEmitRate: 4,      // Particles per frame when healing
    interactRange: 100,       // Distance for interaction prompt
  },
  
  // Slime King statue
  statue: {
    width: 80,
    height: 120,
    xRatio: 0.6,              // Position relative to canvas width
    yOffset: 175,             // Distance above ground (pedestal included)
    baseColor: '#2d9d7a',
    crownColor: '#ffd25d',
    interactRange: 120,       // Distance for interaction prompt
  },
  
  // Opening cutscene timing
  spawnDuration: 2.0,         // Player spawn animation duration
  
  // Mutation cutscene
  mutation: {
    duration: 2.2,            // Total mutation animation time
    zoomTarget: 2.5,          // Max zoom during mutation
    zoomInEnd: 0.4,           // When zoom-in phase ends (0-1)
    waveyEnd: 0.8,            // When wavey phase ends (0-1)
  },
  
  // Entrance cutscene (after tutorial)
  entrance: {
    zoomInDuration: 1.0,
    pauseDuration: 0.5,
    zoomOutDuration: 2.0,
    startZoom: 1.0,
    targetZoom: 2.5,
  },
};

// Particle system
export const PARTICLE_CONFIG = {
  // Poison particles
  poison: {
    minSpeed: 30,
    maxSpeed: 80,
    lifespan: 1.5,            // Seconds
    sizeMin: 3,
    sizeMax: 8,
  },
  
  // Regeneration particles
  regeneration: {
    maxParticles: 40,         // Max simultaneous particles
    minSpeed: 60,
    maxSpeed: 120,
    lifespan: 1.2,            // Seconds
    sizeMin: 4,
    sizeMax: 7,
  },
  
  // Mutation cutscene particles
  mutation: {
    dripSpawnRateMax: 6,      // Max drips per frame
  },
};

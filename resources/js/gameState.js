import { Player, PLAYER_CONFIG } from './player.js';
import { Room } from './room.js';
import { SHOP_INTERVAL } from './shopManager.js';

export class GameState {
  constructor(constants) {
    this.constants = constants;
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');
    this.coinImage = new Image();
    this.coinImage.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOSIgc3Ryb2tlPSIjZjZhNDAwIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IiNmZmQyNWQiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI1IiBmaWxsPSIjZmZmZmZmIiBvcGFjaXR5PSIwLjQiLz48L3N2Zz4=';
    this.keys = new Set();
    this.world = {
      gravity: constants.world.gravity,
      groundY: this.canvas.height - constants.world.groundOffset,
      frictionGround: constants.world.frictionGround,
      frictionAir: constants.world.frictionAir,
      width: this.canvas.width * constants.world.widthMultiplier,
    };
    this.camera = { x: 0 };
    this.player = new Player(PLAYER_CONFIG, this.world, SHOP_INTERVAL);
    this.room = new Room();
    this.platforms = this.room.platforms;
    this.enemies = [];
    this.traps = this.room.traps;
    this.trailSegments = [];
    this.slimeChunks = [];
    this.coins = [];
    this.slimeGlobs = [];
    this.enemyProjectiles = [];
    this.damageNumbers = [];
    this.corrodedPlatformIds = new Set();
    this.platformBounds = new Map();
    this.damageLimitStates = {};
    this.highScores = [];
    this.gameOverState = {
      prompt: 'Continue? Y / N',
      info: '',
      startScreenX: this.canvas.width / 2,
      startScreenY: this.canvas.height / 2,
      startW: PLAYER_CONFIG.baseWidth,
      startH: PLAYER_CONFIG.baseHeight,
      playerW: PLAYER_CONFIG.baseWidth,
      playerH: PLAYER_CONFIG.baseHeight,
      animTime: 0,
      duration: 1.4,
    };
    this.shopActive = false;
    this.gameOver = false;
    this.paused = false;
    this.slimeFlingCooldown = 0;
    this.slimeFlingCooldownMax = 0;
    this.generatedUntil = 0;
    this.safeZoneEnd = constants.generation.safeZoneEnd;
    this.chunkWidth = constants.generation.chunkWidth;
    this.generationMargin = this.canvas.width * constants.generation.generationMarginMultiplier;
    this.cleanupBuffer = this.canvas.width * constants.generation.cleanupBufferMultiplier;
    this.viewRightMargin = this.canvas.width * 0.4;
    this.boss = null;
    this.bossFightActive = false;
    this.bossDefeated = false;
    this.levelComplete = false;
    this.levelCompleteTimer = 0;
    this.cameraZoom = 1;
    this.cameraZoomTarget = 1;
    this.cinematic = null;
    this.cinematicCameraX = null;
    this.bossRoarWave = null;
    this.lastPlatformStats = null;
    this.godModePrevHealth = null;
    this.debugShowCollisions = false;
    this.debugShowBossStats = false;
    this.debug999Damage = false;
    this.deathMessage = null;
    this.openingCutscene = null;  // Opening cutscene state
    this.poisonPool = null;  // Poison pool object
    this.poisonParticles = [];  // Poison cloud particles
    this.regenerationParticles = [];  // Player regeneration effect particles
    this.slimeKingStatue = null;  // Regal slime king statue in cutscene
    this.openingComplete = false;  // Flag for opening cutscene completion
    this.pedestalTextDialog = null;  // Dialog bubble for pedestal text
    this.pedestalTextVisible = false;  // Whether dialog is currently shown
    this.currentInteractable = null;  // Currently interacted object type (statue, pool, etc)
    this.dialogIndex = 0;  // Current index in multi-line dialog sequence
    this.mutationCutscene = null;  // Mutation cutscene state
    this.mutationCutsceneEnded = false;  // Flag to know when to transition back to normal rendering
    this.mutationCutsceneParticles = [];  // Visual-only particles for mutation cutscene
  }
}

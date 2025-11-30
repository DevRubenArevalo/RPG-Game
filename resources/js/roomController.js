/**
 * Room Controller - Manages different game rooms with their own update logic
 * Supports: Tutorial (opening cutscene), Main Game, etc.
 */

export class RoomController {
  constructor() {
    this.currentRoom = null;
    this.roomType = 'main'; // 'tutorial' or 'main'
  }

  /**
   * Initialize the tutorial room (opening cutscene)
   */
  initTutorialRoom(state, world, canvas) {
    this.roomType = 'tutorial';
    this.currentRoom = {
      type: 'tutorial',
      tutorialComplete: false,
      transitionActive: false,
      transitionTimer: 0,
    };
    return this.currentRoom;
  }

  /**
   * Initialize main game room
   */
  initMainRoom(state, world) {
    this.roomType = 'main';
    this.currentRoom = {
      type: 'main',
    };
    return this.currentRoom;
  }

  /**
   * Update the current room based on its type
   */
  updateRoom(dt, state, world, canvas, {
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
    getSlimeFlingCooldown,
    setSlimeFlingCooldown,
    mutateSlime,
    playerManager,
    worldController,
  }) {
    if (!this.currentRoom) {
      console.warn('RoomController: No current room set');
      return;
    }

    switch (this.roomType) {
      case 'tutorial':
        return this.updateTutorialRoom(dt, state, world, canvas, {
          player,
          updatePlayerMovement,
          updateTrail,
          updatePoisonParticles,
          startPoisonEmission,
          checkPlayerInPoisonPool,
          autoCloseDialogIfTooFar,
          updateCutsceneCamera,
          updateOpeningCutscene,
          playJumpSound,
          spawnSlimeGlob,
          getSlimeFlingCooldown,
          setSlimeFlingCooldown,
          mutateSlime,
          playerManager,
        });

      case 'main':
        return this.updateMainRoom(dt, state, world, canvas, {
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
          playJumpSound,
          spawnSlimeGlob,
          getSlimeFlingCooldown,
          setSlimeFlingCooldown,
          mutateSlime,
          playerManager,
          worldController,
        });

      default:
        console.warn(`RoomController: Unknown room type: ${this.roomType}`);
    }
  }

  /**
   * Tutorial room update - opening cutscene with poison pool
   */
  updateTutorialRoom(dt, state, world, canvas, {
    player,
    updatePlayerMovement,
    updateTrail,
    updatePoisonParticles,
    startPoisonEmission,
    checkPlayerInPoisonPool,
    autoCloseDialogIfTooFar,
    updateCutsceneCamera,
    updateOpeningCutscene,
    playJumpSound,
    spawnSlimeGlob,
    getSlimeFlingCooldown,
    setSlimeFlingCooldown,
    mutateSlime,
    playerManager,
  }) {
    // Handle opening cutscene phases (spawn, explore)
    if (state.openingCutscene) {
      updateOpeningCutscene(dt);
      return;
    }

    // After cutscene spawning, check for room exit condition
    // Player moves to right edge of screen to proceed to main game
    const viewportWidth = canvas.width;
    if (player.x + player.w > viewportWidth * 0.9) {
      // Trigger transition to main game
      this.transitionToMainRoom(state);
      return;
    }
  }

  /**
   * Main game room update - standard gameplay loop
   */
  updateMainRoom(dt, state, world, canvas, {
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
    playJumpSound,
    spawnSlimeGlob,
    getSlimeFlingCooldown,
    setSlimeFlingCooldown,
    mutateSlime,
    playerManager,
    worldController,
  }) {
    // Standard main game loop updates
    // All the normal game updates happen here
    const input = {
      left: state.keys?.has('arrowleft') || state.keys?.has('a'),
      right: state.keys?.has('arrowright') || state.keys?.has('d'),
      jump: state.keys?.has(' ') || state.keys?.has('arrowup') || state.keys?.has('w'),
      duck: state.keys?.has('arrowdown') || state.keys?.has('s'),
      swallow: state.keys?.has('f'),
    };

    const allowMovement = !state.shopActive && !state.levelComplete;
    updatePlayerMovement(player, dt, input, world, {
      mutateSlime,
      applyPlayerScale: () => playerManager.applyScale(),
      spawnSlimeGlob,
      playJumpSound,
      ensureWorldAhead: () => worldController.ensureWorldAhead(),
      resolvePlatformCollisions: () => worldController.resolvePlatformCollisions(player),
      getSlimeFlingCooldown,
      setSlimeFlingCooldown,
      allowMovement,
      allowWallMode: state.upgrades.slime_wall,
      allowFling: state.upgrades.slime_fling,
    });

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
      platformBounds: state.platformBounds,
      findPlatformAt: worldController.findPlatformAt.bind(worldController),
      findPlatformById: worldController.findPlatformById.bind(worldController),
      trailSegments,
      slimeGlobs,
      enemyProjectiles,
    });
  }

  /**
   * Transition from tutorial room to main game room
   */
  transitionToMainRoom(state) {
    console.log('🎬 Transitioning from Tutorial to Main Game Room');
    
    // Clean up tutorial room state
    state.openingCutscene = null;
    state.cutsceneRoomBounds = null;
    state.poisonPool = null;
    state.poisonParticles.length = 0;
    state.regenerationParticles.length = 0;
    state.slimeKingStatue = null;

    // Resume main game music
    if (state.audio?.startMusic) {
      state.audio.startMusic();
    }

    // Switch to main room
    this.initMainRoom(state);
    state.openingComplete = true;

    console.log('✅ Tutorial complete, main game started');
  }

  /**
   * Get the current room type
   */
  getRoomType() {
    return this.roomType;
  }

  /**
   * Check if currently in tutorial room
   */
  isTutorial() {
    return this.roomType === 'tutorial';
  }

  /**
   * Check if currently in main game room
   */
  isMainGame() {
    return this.roomType === 'main';
  }
}

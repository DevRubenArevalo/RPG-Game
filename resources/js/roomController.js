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
    // Handle entrance cutscene if active
    if (state.entranceCutscene?.active) {
      this.updateEntranceCutscene(dt, state, player, canvas);
      return; // Skip normal gameplay during entrance cutscene
    }
    
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

  /**
   * Update entrance cutscene (zoom in, pause, zoom out)
   */
  updateEntranceCutscene(dt, state, player, canvas) {
    const cutscene = state.entranceCutscene;
    cutscene.timer += dt;

    switch (cutscene.phase) {
      case 'zoom-in':
        // Zoom from 1.0 to 2.5 over zoomInDuration
        const zoomInProgress = Math.min(cutscene.timer / cutscene.zoomInDuration, 1);
        const easedZoomIn = this.easeInOutCubic(zoomInProgress);
        state.cameraZoom = cutscene.startZoom + (cutscene.targetZoom - cutscene.startZoom) * easedZoomIn;
        
        if (zoomInProgress >= 1) {
          console.log('🎬 Entrance: Zoom-in complete, pausing');
          cutscene.phase = 'pause';
          cutscene.timer = 0;
        }
        break;

      case 'pause':
        // Hold at zoomed-in view
        state.cameraZoom = cutscene.targetZoom;
        
        if (cutscene.timer >= cutscene.pauseDuration) {
          console.log('🎬 Entrance: Pause complete, zooming out');
          cutscene.phase = 'zoom-out';
          cutscene.timer = 0;
        }
        break;

      case 'zoom-out':
        // Zoom from 2.5 back to 1.0 over zoomOutDuration
        const zoomOutProgress = Math.min(cutscene.timer / cutscene.zoomOutDuration, 1);
        const easedZoomOut = this.easeInOutCubic(zoomOutProgress);
        state.cameraZoom = cutscene.targetZoom - (cutscene.targetZoom - cutscene.startZoom) * easedZoomOut;
        
        if (zoomOutProgress >= 1) {
          console.log('✅ Entrance cutscene complete - gameplay begins!');
          state.cameraZoom = 1.0;
          cutscene.phase = 'complete';
          cutscene.active = false;
        }
        break;
    }

    // Keep camera centered on player during entire entrance cutscene
    state.camera.x = player.x + player.w / 2 - canvas.width / (2 * state.cameraZoom);
    state.camera.y = player.y + player.h / 2 - canvas.height / (2 * state.cameraZoom);
  }

  /**
   * Easing function for smooth animations
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

import { snapshot } from '../utils/utils.js';

/**
 * GameOverManager - Handles game over state, high scores, and restart logic
 */
export class GameOverManager {
  /**
   * @param {Object} config - Game over manager configuration
   * @param {GameState} config.state - Game state
   * @param {Player} config.player - Player instance
   * @param {AudioManager} config.audio - Audio manager
   * @param {UIManager} config.uiManager - UI manager
   * @param {ShopManager} config.shopManager - Shop manager
   * @param {Set} config.keys - Active keys set
   * @param {HTMLElement} config.statusEl - Status element
   * @param {Function} config.resetGame - Game reset function
   * @param {Function} config.restartLoop - Loop restart function
   * @param {HTMLElement} config.yesButton - Yes button element
   * @param {HTMLElement} config.noButton - No button element
   * @param {Function} config.playGameOverSound - Play game over sound
   * @param {Function} config.stopGameOverSound - Stop game over sound
   * @param {Function} config.stopAllSoundsExceptGameOver - Stop all other sounds
   */
  constructor({
    state: gameState,
    player,
    audio,
    uiManager,
    shopManager,
    keys,
    statusEl,
    resetGame,
    restartLoop,
    yesButton,
    noButton,
    playGameOverSound,
    stopGameOverSound,
    stopAllSoundsExceptGameOver,
  }) {
    this.state = gameState;
    this.player = player;
    this.audio = audio;
    this.uiManager = uiManager;
    this.shopManager = shopManager;
    this.keys = keys;
    this.statusEl = statusEl;
    this.resetGame = resetGame;
    this.restartLoop = restartLoop;
    this.yesButton = yesButton;
    this.noButton = noButton;
    this.playGameOverSound = playGameOverSound;
    this.stopGameOverSound = stopGameOverSound;
    this.stopAllSoundsExceptGameOver = stopAllSoundsExceptGameOver;
    this.bindButtons();
  }

  bindButtons() {
    this.yesButton?.addEventListener('click', () => this.confirmContinue());
    this.noButton?.addEventListener('click', () => this.decline());
  }

  confirmContinue() {
    if (!this.state.gameOver) return;
    this.stopGameOverSound?.();
    this.resetGame();
    this.restartLoop();
  }

  decline() {
    if (!this.state.gameOver) return;
    this.resetGame(true);
  }

  handleKey(key) {
    if (!this.state.gameOver) return;
    if (key === 'y') {
      this.confirmContinue();
    } else if (key === 'n') {
      this.decline();
    }
  }

  trigger() {
    if (this.state.gameOver) return;
    this.state.gameOver = true;
    this.state.shopActive = false;
    this.shopManager.close();
    this.keys.clear();
    const { canvas, camera, gameOverState } = this.state;
    const screenX = Math.max(0, Math.min(canvas.width, (this.player.x - camera.x) + this.player.w / 2));
    const screenY = Math.max(0, Math.min(canvas.height, this.player.y + this.player.h / 2));
    const metrics = snapshot(this.player, ['w', 'h']);
    Object.assign(gameOverState, {
      startScreenX: screenX,
      startScreenY: screenY,
      startW: metrics.w,
      startH: metrics.h,
      playerW: metrics.w,
      playerH: metrics.h,
      animTime: 0,
      info: '',
    });
    this.state.gameOverTears.length = 0;
    this.state.gameOverTearTimer = 0;
    this.state.gameOverNextTearSide = 'left';
    this.uiManager.setGameOverControlsVisible(true);
    this.statusEl.textContent = 'Game Over - press Y to continue';
    this.stopAllSoundsExceptGameOver?.();
    this.playGameOverSound?.();
    this.audio.setMusicResumeEnabled(false);
  }

  resetState() {
    this.state.gameOver = false;
    this.state.gameOverTears.length = 0;
    this.state.gameOverTearTimer = 0;
    this.state.gameOverNextTearSide = 'left';
    this.state.gameOverState.info = '';
    this.state.gameOverState.animTime = 0;
    this.audio.setMusicResumeEnabled(true);
  }

  getPresentation() {
    const { canvas, gameOverState } = this.state;
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
    const startW = gameOverState.startW ?? this.player.baseW;
    const startH = gameOverState.startH ?? this.player.baseH;
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

  updateTears(dt) {
    if (!this.state.gameOver) return;
    const presentation = this.getPresentation();
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
    this.state.gameOverTearTimer = Math.max(0, this.state.gameOverTearTimer - dt);
    for (let i = this.state.gameOverTears.length - 1; i >= 0; i--) {
      const tear = this.state.gameOverTears[i];
      tear.y += tear.speed * dt;
      tear.height = Math.min(tear.maxHeight, tear.height + tear.extendRate * dt);
      if (tear.y - tear.height > this.state.canvas.height + 60) {
        this.state.gameOverTears.splice(i, 1);
      }
    }
    if (ease <= 0.05 || this.state.gameOverTearTimer > 0) return;
    const side = this.state.gameOverNextTearSide ?? 'left';
    const sign = side === 'left' ? -1 : 1;
    this.spawnGameOverTear(currentX + sign * eyeOffsetX, eyeY, displayW, displayH, stageFloor);
    this.state.gameOverNextTearSide = side === 'left' ? 'right' : 'left';
    this.state.gameOverTearTimer = Math.max(0.18, 0.35 - ease * 0.15);
  }

  spawnGameOverTear(x, eyeY, displayW, displayH, stageFloor) {
    const baseWidth = Math.max(12, displayW * 0.07);
    const initialHeight = Math.max(20, displayH * 0.2);
    const maxHeight = Math.max(initialHeight * 1.5, stageFloor - eyeY + 30);
    const speed = 220 + displayH * 0.3;
    const extendRate = Math.max(120, displayH * 0.35);
    this.state.gameOverTears.push({
      x,
      y: eyeY,
      width: baseWidth,
      height: initialHeight,
      maxHeight,
      speed,
      extendRate,
    });
  }
}

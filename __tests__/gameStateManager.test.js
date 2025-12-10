import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GameStateManager } from '../resources/js/managers/gameStateManager.js';

describe('GameStateManager', () => {
  let state;
  let mockEventBus;
  let stateManager;

  beforeEach(() => {
    // Create mock state object
    state = {
      paused: false,
      shopActive: false,
      bossFightActive: false,
      bossDefeated: false,
      gameOver: false,
      levelComplete: false,
      levelCompleteTimer: 0,
      debugPaused: false,
      platformPauseActive: false,
      boss: null,
      deathMessage: null,
      currentShopOptions: []
    };

    // Create mock EventBus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn()
    };

    // Create GameStateManager with mocks
    stateManager = new GameStateManager({ state, eventBus: mockEventBus });
  });

  describe('Pause Management', () => {
    describe('pause', () => {
      it('should pause the game and emit event', () => {
        const result = stateManager.pause({ reason: 'test' });
        
        expect(result).toBe(true);
        expect(state.paused).toBe(true);
        expect(mockEventBus.emit).toHaveBeenCalledWith('game:paused', { reason: 'test' });
      });

      it('should not pause if already paused', () => {
        state.paused = true;
        const result = stateManager.pause();
        
        expect(result).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });

      it('should use default reason if not provided', () => {
        stateManager.pause();
        expect(mockEventBus.emit).toHaveBeenCalledWith('game:paused', { reason: 'manual' });
      });
    });

    describe('unpause', () => {
      it('should unpause the game and emit event', () => {
        state.paused = true;
        const result = stateManager.unpause();
        
        expect(result).toBe(true);
        expect(state.paused).toBe(false);
        expect(state.platformPauseActive).toBe(false);
        expect(mockEventBus.emit).toHaveBeenCalledWith('game:unpaused');
      });

      it('should not unpause if already unpaused', () => {
        state.paused = false;
        const result = stateManager.unpause();
        
        expect(result).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });
    });

    describe('togglePause', () => {
      it('should toggle pause state', () => {
        stateManager.togglePause();
        expect(state.paused).toBe(true);
        
        stateManager.togglePause();
        expect(state.paused).toBe(false);
      });

      it('should force pause when force=true', () => {
        state.paused = false;
        stateManager.togglePause(true);
        expect(state.paused).toBe(true);
      });

      it('should force unpause when force=false', () => {
        state.paused = true;
        stateManager.togglePause(false);
        expect(state.paused).toBe(false);
      });

      it('should not pause during game over', () => {
        state.gameOver = true;
        stateManager.togglePause();
        expect(state.paused).toBe(false);
      });

      it('should not pause during shop', () => {
        state.shopActive = true;
        stateManager.togglePause();
        expect(state.paused).toBe(false);
      });

      it('should not pause during level complete', () => {
        state.levelComplete = true;
        stateManager.togglePause();
        expect(state.paused).toBe(false);
      });
    });

    describe('isPaused', () => {
      it('should return current pause state', () => {
        expect(stateManager.isPaused()).toBe(false);
        state.paused = true;
        expect(stateManager.isPaused()).toBe(true);
      });
    });
  });

  describe('Shop Management', () => {
    describe('openShop', () => {
      it('should open shop and emit event', () => {
        const options = ['upgrade1', 'upgrade2'];
        const result = stateManager.openShop({ shopOptions: options, force: true });
        
        expect(result).toBe(true);
        expect(state.shopActive).toBe(true);
        expect(state.currentShopOptions).toEqual(options);
        expect(mockEventBus.emit).toHaveBeenCalledWith('shop:opened', { options, force: true });
      });

      it('should not open if already open', () => {
        state.shopActive = true;
        const result = stateManager.openShop();
        
        expect(result).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });

      it('should use default options if not provided', () => {
        stateManager.openShop();
        expect(state.currentShopOptions).toEqual([]);
        expect(mockEventBus.emit).toHaveBeenCalledWith('shop:opened', { options: [], force: false });
      });
    });

    describe('closeShop', () => {
      it('should close shop and emit event', () => {
        state.shopActive = true;
        state.currentShopOptions = ['upgrade1'];
        
        const result = stateManager.closeShop({ message: 'Shop closed' });
        
        expect(result).toBe(true);
        expect(state.shopActive).toBe(false);
        expect(state.currentShopOptions).toEqual([]);
        expect(mockEventBus.emit).toHaveBeenCalledWith('shop:closed', { message: 'Shop closed' });
      });

      it('should not close if already closed', () => {
        state.shopActive = false;
        const result = stateManager.closeShop();
        
        expect(result).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });
    });

    describe('isShopActive', () => {
      it('should return current shop state', () => {
        expect(stateManager.isShopActive()).toBe(false);
        state.shopActive = true;
        expect(stateManager.isShopActive()).toBe(true);
      });
    });
  });

  describe('Boss Fight Management', () => {
    describe('startBossFight', () => {
      it('should start boss fight and emit event', () => {
        const boss = { x: 100, y: 100, health: 1000 };
        const result = stateManager.startBossFight({ boss });
        
        expect(result).toBe(true);
        expect(state.bossFightActive).toBe(true);
        expect(state.bossDefeated).toBe(false);
        expect(state.boss).toBe(boss);
        expect(mockEventBus.emit).toHaveBeenCalledWith('boss:fight:started', { boss });
      });

      it('should not start if already active', () => {
        state.bossFightActive = true;
        const result = stateManager.startBossFight({ boss: {} });
        
        expect(result).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });

      it('should close shop when starting boss fight', () => {
        state.shopActive = true;
        stateManager.startBossFight({ boss: {} });
        
        expect(state.shopActive).toBe(false);
        expect(mockEventBus.emit).toHaveBeenCalledWith('shop:closed', { message: '' });
      });
    });

    describe('endBossFight', () => {
      it('should end boss fight and emit event', () => {
        state.bossFightActive = true;
        state.boss = { x: 100, y: 100 };
        
        const result = stateManager.endBossFight({ defeated: true });
        
        expect(result).toBe(true);
        expect(state.bossFightActive).toBe(false);
        expect(state.bossDefeated).toBe(true);
        expect(mockEventBus.emit).toHaveBeenCalledWith('boss:fight:ended', { 
          defeated: true, 
          boss: state.boss 
        });
      });

      it('should not end if not active', () => {
        state.bossFightActive = false;
        const result = stateManager.endBossFight();
        
        expect(result).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });

      it('should not set bossDefeated when defeated=false', () => {
        state.bossFightActive = true;
        stateManager.endBossFight({ defeated: false });
        
        expect(state.bossDefeated).toBe(false);
      });
    });

    describe('isBossFightActive', () => {
      it('should return current boss fight state', () => {
        expect(stateManager.isBossFightActive()).toBe(false);
        state.bossFightActive = true;
        expect(stateManager.isBossFightActive()).toBe(true);
      });
    });
  });

  describe('Game Over Management', () => {
    describe('gameOver', () => {
      it('should trigger game over and emit event', () => {
        const result = stateManager.gameOver({ deathMessage: 'You died!' });
        
        expect(result).toBe(true);
        expect(state.gameOver).toBe(true);
        expect(state.deathMessage).toBe('You died!');
        expect(mockEventBus.emit).toHaveBeenCalledWith('game:over', { deathMessage: 'You died!' });
      });

      it('should not trigger if already game over', () => {
        state.gameOver = true;
        const result = stateManager.gameOver();
        
        expect(result).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });

      it('should use default death message', () => {
        stateManager.gameOver();
        expect(state.deathMessage).toBe('You have been defeated');
      });

      it('should close shop when game over', () => {
        state.shopActive = true;
        stateManager.gameOver();
        
        expect(state.shopActive).toBe(false);
        expect(mockEventBus.emit).toHaveBeenCalledWith('shop:closed', { message: '' });
      });
    });

    describe('resetGameOver', () => {
      it('should reset game over and emit event', () => {
        state.gameOver = true;
        state.deathMessage = 'You died!';
        
        const result = stateManager.resetGameOver();
        
        expect(result).toBe(true);
        expect(state.gameOver).toBe(false);
        expect(state.deathMessage).toBe(null);
        expect(mockEventBus.emit).toHaveBeenCalledWith('game:over:reset');
      });

      it('should not reset if not game over', () => {
        state.gameOver = false;
        const result = stateManager.resetGameOver();
        
        expect(result).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });
    });

    describe('isGameOver', () => {
      it('should return current game over state', () => {
        expect(stateManager.isGameOver()).toBe(false);
        state.gameOver = true;
        expect(stateManager.isGameOver()).toBe(true);
      });
    });
  });

  describe('Level Complete Management', () => {
    describe('completeLevel', () => {
      it('should mark level as complete and emit event', () => {
        const result = stateManager.completeLevel();
        
        expect(result).toBe(true);
        expect(state.levelComplete).toBe(true);
        expect(state.levelCompleteTimer).toBe(0);
        expect(mockEventBus.emit).toHaveBeenCalledWith('level:complete');
      });

      it('should not complete if already complete', () => {
        state.levelComplete = true;
        const result = stateManager.completeLevel();
        
        expect(result).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });
    });

    describe('resetLevelComplete', () => {
      it('should reset level complete and emit event', () => {
        state.levelComplete = true;
        state.levelCompleteTimer = 5.2;
        
        const result = stateManager.resetLevelComplete();
        
        expect(result).toBe(true);
        expect(state.levelComplete).toBe(false);
        expect(state.levelCompleteTimer).toBe(0);
        expect(mockEventBus.emit).toHaveBeenCalledWith('level:complete:reset');
      });

      it('should not reset if not complete', () => {
        state.levelComplete = false;
        const result = stateManager.resetLevelComplete();
        
        expect(result).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });
    });

    describe('isLevelComplete', () => {
      it('should return current level complete state', () => {
        expect(stateManager.isLevelComplete()).toBe(false);
        state.levelComplete = true;
        expect(stateManager.isLevelComplete()).toBe(true);
      });
    });
  });

  describe('Composite State Queries', () => {
    describe('isGameplayBlocked', () => {
      it('should return false when no blocking states', () => {
        expect(stateManager.isGameplayBlocked()).toBe(false);
      });

      it('should return true when paused', () => {
        state.paused = true;
        expect(stateManager.isGameplayBlocked()).toBe(true);
      });

      it('should return true when shop active', () => {
        state.shopActive = true;
        expect(stateManager.isGameplayBlocked()).toBe(true);
      });

      it('should return true when game over', () => {
        state.gameOver = true;
        expect(stateManager.isGameplayBlocked()).toBe(true);
      });

      it('should return true when level complete', () => {
        state.levelComplete = true;
        expect(stateManager.isGameplayBlocked()).toBe(true);
      });

      it('should return true when debug paused', () => {
        state.debugPaused = true;
        expect(stateManager.isGameplayBlocked()).toBe(true);
      });
    });

    describe('getStateSummary', () => {
      it('should return complete state snapshot', () => {
        state.paused = true;
        state.shopActive = true;
        
        const summary = stateManager.getStateSummary();
        
        expect(summary).toEqual({
          paused: true,
          shopActive: true,
          bossFightActive: false,
          gameOver: false,
          levelComplete: false,
          debugPaused: false,
          gameplayBlocked: true
        });
      });
    });

    describe('resetAll', () => {
      it('should reset all managed state', () => {
        state.paused = true;
        state.shopActive = true;
        state.bossFightActive = true;
        state.bossDefeated = true;
        state.levelComplete = true;
        state.levelCompleteTimer = 10;
        state.platformPauseActive = true;
        
        stateManager.resetAll();
        
        expect(state.paused).toBe(false);
        expect(state.shopActive).toBe(false);
        expect(state.bossFightActive).toBe(false);
        expect(state.bossDefeated).toBe(false);
        expect(state.levelComplete).toBe(false);
        expect(state.levelCompleteTimer).toBe(0);
        expect(state.platformPauseActive).toBe(false);
        expect(mockEventBus.emit).toHaveBeenCalledWith('game:state:reset');
      });

      it('should not reset game over state', () => {
        state.gameOver = true;
        state.deathMessage = 'Test';
        
        stateManager.resetAll();
        
        expect(state.gameOver).toBe(true);
        expect(state.deathMessage).toBe('Test');
      });
    });
  });

  describe('EventBus Integration', () => {
    it('should use provided eventBus', () => {
      stateManager.pause();
      expect(mockEventBus.emit).toHaveBeenCalled();
    });

    it('should emit correct events with correct payloads', () => {
      // Test multiple operations
      stateManager.pause({ reason: 'cutscene' });
      stateManager.openShop({ shopOptions: ['a', 'b'] });
      stateManager.startBossFight({ boss: { id: 1 } });
      
      expect(mockEventBus.emit).toHaveBeenCalledTimes(4); // pause, shop:opened, shop:closed (from boss start), boss:fight:started
    });
  });
});

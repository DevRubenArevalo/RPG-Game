import { SHOP_INTERVAL } from '../managers/shopManager.js';
import { UPGRADES } from '../config/upgrades.js';
import { CONSTANTS } from '../config/index.js';
import { eventBus } from '../core/EventBus.js';

const SHOP_REFRESH_COST = 100;
const PLATFORM_UNIT = CONSTANTS.level.platformUnit;

/**
 * ShopController - Manages shop functionality and upgrade purchasing
 */
export class ShopController {
  /**
   * @param {Object} config - Shop controller configuration
   * @param {GameState} config.state - Game state
   * @param {Player} config.player - Player instance
   * @param {PlayerManager} config.playerManager - Player manager
   * @param {ShopManager} config.shopManager - Shop manager
   * @param {HTMLElement} config.shopRefreshButton - Refresh button element
   * @param {HTMLElement} config.shopSkipButton - Skip button element
   */
  constructor({
    state: gameState,
    player,
    playerManager,
    shopManager,
    shopRefreshButton,
    shopSkipButton,
  }) {
    this.state = gameState;
    this.player = player;
    this.playerManager = playerManager;
    this.shopManager = shopManager;
    this.shopRefreshButton = shopRefreshButton;
    this.shopSkipButton = shopSkipButton;
    this.onAbilityListUpdate = null;
    this.handleSelection = this.handleSelection.bind(this);
    this.bindEvents();
    this.resetUpgradeFlags();
  }

  setAbilityListUpdater(cb) {
    this.onAbilityListUpdate = cb;
  }

  notifyAbilityUpdate() {
    this.onAbilityListUpdate?.();
  }

  bindEvents() {
    this.shopRefreshButton?.addEventListener('click', () => this.refreshOptions());
    this.shopSkipButton?.addEventListener('click', () => this.skipShop());
  }

  skipShop() {
    if (!this.state.shopActive) return;
    this.closeShop('Shop skipped. Onward!');
    this.state.homeScreenActive = false;
  }

  openShop(force = false) {
    if (this.state.shopActive) return;
    const selections = this.pickShopOptions(3);
    if (!selections.length) {
      if (!force) {
        this.player.nextShopAt += SHOP_INTERVAL;
      } else {
        this.shopManager.updateMessage('No upgrades available.');
      }
      return;
    }
    this.state.stateManager.openShop({ shopOptions: selections, force });
    this.shopManager.open(selections, this.handleSelection);
  }

  closeShop(message) {
    if (message) this.shopManager.updateMessage(message);
    this.state.stateManager.closeShop({ message });
    this.shopManager.close();
    this.player.nextShopAt += SHOP_INTERVAL;
  }

  handleSelection(option) {
    if (!this.state.shopActive) return;
    const upgrade = UPGRADES.find((upg) => upg.id === option);
    if (!upgrade) {
      this.shopManager.updateMessage('Unknown upgrade, pick another.');
      return;
    }
    if (this.state.upgrades[upgrade.id]) {
      this.shopManager.updateMessage('Already acquired.');
      return;
    }
    const costResult = this.attemptPurchase(upgrade.cost || {});
    if (!costResult.success) {
      this.shopManager.updateMessage(costResult.message);
      return;
    }
    this.applyUpgrade(upgrade);
    eventBus.emit('upgrade:purchased', { upgrade, player: this.player });
    this.shopManager.updateMessage(`${upgrade.title} unlocked!`);
    this.closeShop();
  }

  refreshOptions() {
    if (!this.state.shopActive) return;
    if (this.player.coins < SHOP_REFRESH_COST) {
      this.shopManager.updateMessage(`${SHOP_REFRESH_COST} coins required to refresh.`);
      return;
    }
    const options = this.pickShopOptions(3);
    if (!options.length) {
      this.shopManager.updateMessage('No upgrades left to refresh.');
      return;
    }
    this.player.coins -= SHOP_REFRESH_COST;
    this.state.currentShopOptions = options;
    this.shopManager.open(options, this.handleSelection);
    this.shopManager.updateMessage('Shop refreshed!');
  }

  resetUpgradeFlags() {
    const upgrades = this.state.upgrades;
    if (upgrades) {
      Object.keys(upgrades).forEach((key) => {
        upgrades[key] = false;
      });
    }
    this.state.magnetRange = 0;
    this.state.purchasedUpgrades?.clear?.();
    this.notifyAbilityUpdate();
  }

  pickShopOptions(limit = 3) {
    const locked = UPGRADES.filter((upg) => !this.state.upgrades[upg.id]);
    if (!locked.length) return [];
    const pool = locked.slice();
    const selection = [];
    while (selection.length < Math.min(limit, pool.length)) {
      const idx = Math.floor(Math.random() * pool.length);
      selection.push(pool.splice(idx, 1)[0]);
    }
    return selection.map((upg) => ({
      ...upg,
      costText: this.formatCost(upg.cost || {}),
    }));
  }

  formatCost(cost = {}) {
    const parts = [];
    if (cost.hp) parts.push(`${cost.hp} HP`);
    if (cost.coins) parts.push(`${cost.coins} Coins`);
    if (!parts.length) return 'Cost: Free';
    return `Cost: ${parts.join(' + ')}`;
  }

  attemptPurchase(cost = {}) {
    const hpCost = cost.hp ?? 0;
    const coinCost = cost.coins ?? 0;
    if (hpCost > 0 && this.player.health <= hpCost) {
      return { success: false, message: `Need more than ${hpCost} HP.` };
    }
    if (coinCost > 0 && this.player.coins < coinCost) {
      return { success: false, message: `${coinCost} coins required.` };
    }
    if (hpCost > 0) {
      this.player.health -= hpCost;
      this.playerManager.applyScale();
    }
    if (coinCost > 0) {
      this.player.coins -= coinCost;
    }
    return { success: true };
  }

  applyUpgrade(upgrade) {
    this.state.upgrades[upgrade.id] = true;
    this.state.purchasedUpgrades?.add?.(upgrade.id);
    switch (upgrade.id) {
      case 'slime_wall':
        this.player.wallMode = false;
        break;
      case 'slime_fling':
        this.state.slimeFlingCooldown = 0;
        break;
      case 'regen':
        this.player.regenUnlocked = true;
        this.player.regenTimer = 0;
        break;
      case 'melt_platforms':
        break;
      case 'magnet':
        this.state.magnetRange = (upgrade.magnetRange ?? PLATFORM_UNIT * 2) + PLATFORM_UNIT * 2;
        break;
      case 'spiked_shoes':
        break;
      case 'royal_slime':
        this.player.maxHealth = 40;
        this.playerManager.applyScale();
        break;
      default:
        break;
    }
    this.notifyAbilityUpdate();
  }
}

export { SHOP_REFRESH_COST };

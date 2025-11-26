import { UPGRADES } from './upgrades.js';

const BASE_ABILITIES = [
  {
    id: 'acid_trail',
    title: 'Acid Trail',
    desc: 'Moving leaves a damaging trail that stacks damage.',
  },
  {
    id: 'swallow_shield',
    title: 'Swallow Shield',
    desc: 'Duck + F to spend 10 HP for a one-hit shield.',
  },
];

const HOME_INFO = {
  howto: {
    title: 'How to Play',
    body: `<p>Master the basics before you ooze out:</p>
      <ul>
        <li><strong>Move</strong>: A/D or ← →</li>
        <li><strong>Jump</strong>: Space, W, or ↑</li>
        <li><strong>Duck</strong>: S or ↓ to slip through platforms</li>
        <li><strong>Trail</strong>: Your slime burns foes—kite them through it!</li>
      </ul>`,
  },
  options: {
    title: 'Options',
    body: `<p>Quick tweaks before diving in:</p>
      <ul>
        <li>Use the <strong>Mute Audio</strong> button to silence SFX/music.</li>
        <li><strong>Debug keys</strong>: G opens debug controls, H grants coins, J opens the shop.</li>
        <li>Visit shops every 5,000 distance to buy upgrades or reroll.</li>
      </ul>`,
  },
  credits: {
    title: 'Credits',
    body: `<p>From Nothing: A Slime's Journey</p>
      <ul>
        <li><strong>Design & Code</strong>: Ruben Arevalo</li>
        <li><strong>Music & SFX</strong>: Ruben Arevalo</li>
        <li><strong>Special Thanks</strong>: Mackenzie O'Brien and the brave slime scouts who paved the way</li>
      </ul>`,
  },
};

export class UIManager {
  constructor({
    state: gameState,
    audio,
    player,
    onTogglePause,
    onResetGame,
    debugActions = {},
  }) {
    this.state = gameState;
    this.audio = audio;
    this.player = player;
    this.onTogglePause = onTogglePause;
    this.onResetGame = onResetGame;
    this.debugActions = debugActions;
    this.abilityListEl = document.getElementById('abilityList');
    this.homeInfoEl = document.getElementById('homeInfo');
    this.homeStartButton = document.getElementById('homeStart');
    this.homeOptionsButton = document.getElementById('homeOptions');
    this.homeCreditsButton = document.getElementById('homeCredits');
    this.homeScreenEl = document.getElementById('homeScreen');
    this.gameOverControls = document.getElementById('gameOverControls');
    this.pauseOverlay = document.getElementById('pauseOverlay');
    this.pauseContinue = document.getElementById('pauseContinue');
    this.pauseRetry = document.getElementById('pauseRetry');
    this.movementOverlayEl = document.getElementById('movementOverlay');
    this.movementStatsEl = document.getElementById('movementStats');
    this.debugMenuEl = document.getElementById('debugMenu');
    this.debugToggleGodBtn = document.getElementById('debugToggleGod');
    this.debugCoinsBtn = document.getElementById('debugAddCoins');
    this.debugAbilitiesBtn = document.getElementById('debugUnlockAbilities');
    this.debugTravelBtn = document.getElementById('debugTravelBoost');
    this.debugShopBtn = document.getElementById('debugOpenShop');
    this.levelCompleteOverlay = document.getElementById('levelCompleteOverlay');
    this.levelCompleteReplay = document.getElementById('levelCompleteReplay');
    this.movementDebugVisible = false;
    this.debugMenuVisible = false;
    this.lastMovementStatsHtml = '';
    this.init();
  }

  init() {
    this.updateHomeInfoContent();
    this.updateAbilityList();
    this.setHomeScreenVisible(true);
    this.setGameOverControlsVisible(false);
    this.setLevelCompleteVisible(false);
    this.setDebugMenuVisible(false);
    this.bindHomeEvents();
    this.bindPauseEvents();
    this.bindDebugMenuEvents();
    this.bindLevelCompleteEvents();
    this.setupHomeAudio();
  }

  setupHomeAudio() {
    this.audio.playHomeMusic?.();
    const requestHomePlayback = () => {
      if (!this.state.homeScreenActive) return;
      this.audio.playHomeMusic?.();
    };
    window.addEventListener('pointerdown', requestHomePlayback, { once: true });
    window.addEventListener('keydown', requestHomePlayback, { once: true });
  }

  bindHomeEvents() {
    this.homeOptionsButton?.addEventListener('click', () => this.updateHomeInfoContent('options'));
    this.homeCreditsButton?.addEventListener('click', () => this.updateHomeInfoContent('credits'));
    this.homeStartButton?.addEventListener('click', () => this.handleStartClick());
  }

  bindPauseEvents() {
    this.pauseContinue?.addEventListener('click', () => this.onTogglePause(false));
    this.pauseRetry?.addEventListener('click', () => {
      this.onTogglePause(false);
      this.onResetGame();
    });
  }

  bindDebugMenuEvents() {
    this.debugToggleGodBtn?.addEventListener('click', () => this.debugActions.toggleGodMode?.());
    this.debugCoinsBtn?.addEventListener('click', () => this.debugActions.addCoins?.());
    this.debugAbilitiesBtn?.addEventListener('click', () => this.debugActions.unlockAllAbilities?.());
    this.debugTravelBtn?.addEventListener('click', () => this.debugActions.travelDistance?.());
    this.debugShopBtn?.addEventListener('click', () => this.debugActions.forceShop?.());
  }

  bindLevelCompleteEvents() {
    this.levelCompleteReplay?.addEventListener('click', () => {
      this.setLevelCompleteVisible(false);
      this.onResetGame();
    });
  }

  handleStartClick() {
    this.updateHomeInfoContent('howto');
    if (!this.state.homeScreenActive) return;
    this.state.homeScreenActive = false;
    this.setHomeScreenVisible(false);
    this.audio.stopHomeMusic?.();
    this.audio.startMusic?.();
  }

  updateHomeInfoContent(section = 'howto') {
    if (!this.homeInfoEl) return;
    const info = HOME_INFO[section] || HOME_INFO.howto;
    this.homeInfoEl.innerHTML = `<h3>${info.title}</h3>${info.body}`;
  }

  updateAbilityList() {
    if (!this.abilityListEl) return;
    this.abilityListEl.innerHTML = '';
    const unlockedAbilities = (this.state.upgrades && Array.isArray(UPGRADES))
      ? UPGRADES.filter((upg) => this.state.upgrades[upg.id])
      : [];
    const entries = [...BASE_ABILITIES, ...unlockedAbilities];
    entries.forEach((entry) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${entry.title}</strong><small>${entry.desc}</small>`;
      this.abilityListEl.appendChild(li);
    });
  }

  setHomeScreenVisible(visible) {
    if (!this.homeScreenEl) return;
    this.homeScreenEl.classList.toggle('hidden', !visible);
  }

  setGameOverControlsVisible(visible) {
    if (!this.gameOverControls) return;
    this.gameOverControls.classList.toggle('hidden', !visible);
    this.gameOverControls.classList.toggle('visible', visible);
  }

  setLevelCompleteVisible(visible) {
    if (!this.levelCompleteOverlay) return;
    this.levelCompleteOverlay.classList.toggle('hidden', !visible);
  }

  setDebugMenuVisible(visible) {
    if (!this.debugMenuEl) return;
    this.debugMenuEl.classList.toggle('hidden', !visible);
  }

  setPauseOverlay(visible) {
    if (!this.pauseOverlay) return;
    this.pauseOverlay.classList.toggle('visible', visible);
    this.pauseOverlay.classList.toggle('hidden', !visible);
  }

  toggleDebugMenu(force) {
    const next = typeof force === 'boolean' ? force : !this.debugMenuVisible;
    if (next === this.debugMenuVisible) return this.debugMenuVisible;
    this.debugMenuVisible = next;
    this.setDebugMenuVisible(next);
    return this.debugMenuVisible;
  }

  toggleMovementOverlay(force) {
    if (!this.movementOverlayEl) return;
    const next = typeof force === 'boolean' ? force : !this.movementDebugVisible;
    if (next === this.movementDebugVisible) return;
    this.movementDebugVisible = next;
    this.movementOverlayEl.classList.toggle('hidden', !next);
    if (next) {
      this.updateMovementOverlay(true);
    }
  }

  updateMovementOverlay(force = false) {
    if (!this.movementDebugVisible || !this.movementStatsEl) return;
    const stats = [
      ['Position X', this.player.x.toFixed(2)],
      ['Position Y', this.player.y.toFixed(2)],
      ['Velocity X', this.player.vx.toFixed(2)],
      ['Velocity Y', this.player.vy.toFixed(2)],
      ['Grounded', this.player.grounded ? 'Yes' : 'No'],
      ['Wall Mode', this.player.wallMode ? 'Yes' : 'No'],
      ['Ducking', this.player.ducking ? 'Yes' : 'No'],
      ['Max Speed', this.player.maxSpeed.toFixed(0)],
      ['Acceleration', this.player.accel.toFixed(0)],
      ['Jump Speed', this.player.jumpSpeed.toFixed(0)],
      ['Fling Charge', this.player.flingCharge.toFixed(2)],
      ['Fling Direction', this.player.flingDirection.toFixed(2)],
      ['Drop Timer', (this.player.dropThroughTimer || 0).toFixed(2)],
      ['Idle Timer', this.player.idleTimer.toFixed(2)],
    ];
    const html = stats.map(([label, value]) => `<li><span>${label}</span><span>${value}</span></li>`).join('');
    if (!force && html === this.lastMovementStatsHtml) return;
    this.movementStatsEl.innerHTML = html;
    this.lastMovementStatsHtml = html;
  }
}

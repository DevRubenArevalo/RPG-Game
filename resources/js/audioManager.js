export const AUDIO_TRACKS = {
  music: 'resources/audio/Time To Slime.mp3',
  home: 'resources/audio/The Lonely Slime.mp3',
  bossMusic: 'resources/audio/From Nothing - Boss Battle 1.mp3',
  jump: 'resources/audio/a-jump.mp3',
  death: 'resources/audio/dead-slime.mp3',
  corrosion: 'resources/audio/plaform-corrosion.mp3',
  coin: 'resources/audio/coin.mp3',
  chunk: 'resources/audio/slime-chunk-pick-up.mp3',
  gameOver: 'resources/audio/Game Over.mp3',
  hit: 'resources/audio/slime-hit.mp3',
  bossRoar: 'resources/audio/Slime-Boss-Roar.mp3',
};

export class AudioManager {
  constructor(paths = AUDIO_TRACKS, muteToggle) {
    this.music = this.create(paths.music, { loop: true, volume: 0.2 });
    this.home = this.create(paths.home, { loop: true, volume: 0.2 });
    this.bossMusic = this.create(paths.bossMusic, { loop: true, volume: 0.25 });
    this.jump = this.create(paths.jump, { volume: 0.2 });
    this.death = this.create(paths.death, { volume: 0.75 });
    this.corrosion = this.create(paths.corrosion, { volume: 0.36, loop: true });
    this.coin = this.create(paths.coin, { volume: 0.4 });
    this.chunk = this.create(paths.chunk, { volume: 0.35 });
    this.gameOver = this.create(paths.gameOver, { volume: 0.5 });
    this.hit = this.create(paths.hit, { volume: 0.55 });
    this.bossRoar = this.create(paths.bossRoar, { volume: 0.85 });
    this.muteToggle = muteToggle;
    this.musicStarted = false;
    this.muted = false;
    this.trackNames = [
      'home',
      'music',
      'bossMusic',
      'jump',
      'death',
      'corrosion',
      'coin',
      'chunk',
      'gameOver',
      'hit',
      'bossRoar',
    ];
    this.allowMusicResume = true;
    if (this.muteToggle) {
      this.muteToggle.addEventListener('click', () => this.toggleMute());
    }
  }

  create(src, { loop = false, volume = 1 } = {}) {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = volume;
    return audio;
  }

  toggleMute() {
    this.muted = !this.muted;
    this.applyMuteState();
    if (this.muteToggle) {
      this.muteToggle.textContent = this.muted ? 'Unmute Audio' : 'Mute Audio';
    }
  }

  applyMuteState() {
    this.trackNames.forEach((name) => {
      const audio = this[name];
      if (!audio) return;
      audio.muted = this.muted;
      if (this.muted && !audio.paused) {
        audio.pause();
      }
    });
    if (!this.muted && this.musicStarted && this.allowMusicResume) {
      this.music.play().catch(() => {});
    }
  }

  startMusic(track = 'music') {
    const target = this[track];
    if (!target || this.muted) return;
    if (track === 'music' && this.musicStarted) {
      this.resumeMusic();
      return;
    }
    target.play().then(() => {
      if (track === 'music') {
        this.musicStarted = true;
      }
    }).catch(() => {
      if (track === 'music') {
        this.musicStarted = false;
      }
    });
  }

  playEffect(track) {
    const audio = this[track];
    if (!audio || this.muted) return;
    if (audio.paused) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      audio.currentTime = 0;
    }
  }

  stopLoop(track) {
    const audio = this[track];
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
    }
    audio.currentTime = 0;
  }

  stopAllExceptGameOver() {
    this.trackNames.forEach((name) => {
      if (name === 'gameOver') return;
      this.stopLoop(name);
    });
  }

  resumeMusic() {
    if (!this.musicStarted || this.muted || !this.allowMusicResume) return;
    this.music.play().catch(() => {});
  }

  ensureLoop(track) {
    const audio = this[track];
    if (!audio || this.muted) return;
    if (audio.loop && audio.paused) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }

  setMusicResumeEnabled(enabled) {
    this.allowMusicResume = enabled;
    if (!enabled && !this.music.paused) {
      this.music.pause();
    }
  }

  playHomeMusic() {
    this.stopLoop('music');
    if (this.muted) return;
    this.home.currentTime = 0;
    this.home.play().catch(() => {});
  }

  stopHomeMusic() {
    this.stopLoop('home');
  }

  playBossMusic() {
    this.stopLoop('music');
    this.stopLoop('home');
    if (this.muted) return;
    this.bossMusic.currentTime = 0;
    this.bossMusic.play().catch(() => {});
  }

  stopBossMusic() {
    this.stopLoop('bossMusic');
  }
}

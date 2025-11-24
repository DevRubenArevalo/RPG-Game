export class Room {
  constructor() {
    this.platforms = [];
    this.traps = [];
  }

  reset() {
    this.platforms.length = 0;
    this.traps.length = 0;
  }
}

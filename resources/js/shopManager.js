export const SHOP_INTERVAL = 5000;

export class ShopManager {
  constructor() {
    this.overlay = document.getElementById('shopOverlay');
    this.messageEl = document.getElementById('shopMessage');
    this.tilesEl = document.getElementById('shopTiles');
    this.options = [];
    this.active = false;
    this.onSelect = null;
  }

  open(options, handler) {
    this.options = options;
    this.active = true;
    this.onSelect = handler;
    this.overlay?.classList.add('visible');
    this.renderTiles();
    this.updateMessage('Click a boon to claim it.');
  }

  close(message = '') {
    this.updateMessage(message);
    this.active = false;
    this.overlay?.classList.remove('visible');
    if (this.tilesEl) this.tilesEl.innerHTML = '';
    this.onSelect = null;
  }

  updateMessage(text) {
    if (this.messageEl) this.messageEl.textContent = text || '';
  }

  renderTiles() {
    if (!this.tilesEl) return;
    this.tilesEl.innerHTML = '';
    const shuffled = this.options.slice().sort(() => Math.random() - 0.5);
    shuffled.forEach((opt) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'shop-tile';
      tile.innerHTML = `
        <div class="tile-art ${opt.artClass}"></div>
        <h4>${opt.title}</h4>
        <p class="cost">${opt.costText}</p>
        <p class="desc">${opt.desc}</p>
      `;
      tile.addEventListener('click', () => this.onSelect && this.onSelect(opt.id));
      this.tilesEl.appendChild(tile);
    });
  }
}

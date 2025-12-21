/**
 * MainMenu - главное меню выбора игр
 */
export class MainMenu {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="main-menu">
        <div class="menu-header">
          <h1>🎮 Game Arena</h1>
          <p class="menu-subtitle">Choose your game</p>
        </div>
        
        <div class="games-grid" id="games-grid">
          <!-- Игры будут добавлены динамически -->
        </div>

        <div class="menu-footer">
          <div class="menu-actions">
            <button id="menu-connect-wallet" class="menu-btn">Connect Wallet</button>
            <button id="menu-show-leaderboard" class="menu-btn">Show Leaderboard</button>
            <button id="menu-music-toggle" class="menu-btn">Music: OFF</button>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Web3 кнопки будут обрабатываться в web3.js
    // Здесь только UI логика
  }

  getGamesGrid() {
    return this.container.querySelector('#games-grid');
  }
}


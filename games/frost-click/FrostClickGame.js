/**
 * FrostClickGame - упрощенная версия игры Frost Click
 * Все в одном классе для простоты и читаемости
 */
import { GameBase } from '../../core/GameBase.js';
import { CONFIG } from '../../config.js';
import { eventBus } from '../../core/EventBus.js';

export class FrostClickGame extends GameBase {
  constructor() {
    super(
      'frost-click',
      'Frost Click',
      'Survive 10 minutes • Avoid bombs • Collect gifts',
      '❄️'
    );

    // Canvas
    this.canvas = null;
    this.ctx = null;
    
    // Игровое состояние
    this.score = 0;
    this.isFrozen = false;
    this.objects = []; // Простой массив вместо ObjectPool
    this.MAX_OBJECTS = 50;
    
    this.startTime = 0;
    this.pausedAccum = 0;
    this.pauseStart = null;
    
    // Таймеры через RAF
    this.spawnAccumulator = 0;
    this.SPAWN_TICK_SECONDS = 0.15;
    this.timerAccumulator = 0;
    this.freezeTimeLeft = 0;
    
    // Настройки спавна
    this.SPAWN_CHANCE_SNOW = 0.60;
    this.SPAWN_CHANCE_BOMB = 0.60;
    this.SPAWN_CHANCE_GIFT = 0.18;
    this.ICE_INTERVAL = 45 * 1000;
    this.lastIceSpawn = 0;
    
    // Somnia
    this.SOMNIA_INTERVAL_MS = 58_000;
    this.SOMNIA_TOTAL = 10;
    this.nextSomniaIndex = 0;
    
    // Размеры
    this.OBJECT_SIZE = 28;
    this.SPRITE_SIZE = this.OBJECT_SIZE * 2;
    this.HIT_PADDING = 10;
    
    // UI элементы
    this.scoreEl = null;
    this.timerEl = null;
    this.pbScoreEl = null;
    this.pauseBtn = null;
    this.gameOverEl = null;
    this.pauseOverlay = null;
    this.freezeTimer = null;
    this.leaderboardBtn = null;
    this.connectWalletBtn = null;
    
    // Эффекты
    this.flashEffects = [];
    this.explosionEffects = [];
    
    // Спрайты
    this.emojiSprites = new Map();
    
    // Event listeners
    this._handleResize = null;
    this._onAccountChanged = null;
  }

  async onInit() {
    await this.loadSprites();
    this.createUI();
    this.setupEventListeners();
  }

  async loadSprites() {
    const emojis = { 'snow': '❄️', 'bomb': '💣', 'gift': '🎁', 'ice': '🧊' };

    for (const [key, emoji] of Object.entries(emojis)) {
      const canvas = document.createElement('canvas');
      canvas.width = this.SPRITE_SIZE;
      canvas.height = this.SPRITE_SIZE;
      const ctx = canvas.getContext('2d');
      ctx.font = `${this.OBJECT_SIZE * 1.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, canvas.width / 2, canvas.height / 2);
      this.emojiSprites.set(key, canvas);
    }

    // Somnia SVG
    const somniaSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 25 24' fill='none'%3E%3Cpath d='M12.0224 3.58728C12.0281 3.35631 12.3279 3.27146 12.4561 3.46284C14.0002 5.76973 16.6294 7.28848 19.6139 7.28848C20.7329 7.28848 21.8019 7.07448 22.7823 6.68607C20.8309 2.74069 16.7745 0.0227692 12.0809 0.000143355C5.4924 -0.0319099 0.0747474 5.31532 0.0228993 11.9041C0.0125297 13.2249 0.216151 14.4976 0.600769 15.6883C3.43639 15.4536 6.2079 14.2525 8.37704 12.0823C10.73 9.72924 11.9451 6.67004 12.0224 3.58728Z' fill='url(%23paint0_linear_728_4516)'/%3E%3Cpath d='M11.9651 23.9999C18.5526 24.031 23.9694 18.6866 24.0222 12.0987C24.0325 10.7779 23.8289 9.50616 23.4452 8.31548C20.6087 8.55022 17.8381 9.75127 15.668 11.9215C13.315 14.2745 12.1008 17.3337 12.0235 20.4165C12.0179 20.6475 11.7181 20.7323 11.5899 20.5409C10.0458 18.2341 7.41658 16.7153 4.43201 16.7153C3.31398 16.7153 2.24496 16.9284 1.26456 17.3168C3.21688 21.2603 7.27235 23.9772 11.9651 23.9999Z' fill='url(%23paint1_linear_728_4516)'/%3E%3Cdefs%3E%3ClinearGradient id='paint0_linear_728_4516' x1='22.7823' y1='0' x2='9.57872' y2='18.4678' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%234B1BF9'/%3E%3Cstop offset='1' stop-color='%233ECCEE'/%3E%3C/linearGradient%3E%3ClinearGradient id='paint1_linear_728_4516' x1='24.0225' y1='8.31547' x2='10.8228' y2='26.7809' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%23F20A49'/%3E%3Cstop offset='0.52' stop-color='%23C119E7'/%3E%3Cstop offset='1' stop-color='%234675F3'/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";
    
    const somniaImg = new Image();
    somniaImg.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      somniaImg.onload = () => {
        const somniaCanvas = document.createElement('canvas');
        somniaCanvas.width = this.SPRITE_SIZE;
        somniaCanvas.height = this.SPRITE_SIZE;
        const somniaCtx = somniaCanvas.getContext('2d');
        somniaCtx.drawImage(somniaImg, 0, 0, somniaCanvas.width, somniaCanvas.height);
        this.emojiSprites.set('somnia', somniaCanvas);
        resolve();
      };
      somniaImg.onerror = reject;
      somniaImg.src = somniaSVG;
    });
  }

  createUI() {
    if (!this.container) return;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'fc-canvas';
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    this.canvas.width = w;
    this.canvas.height = h;
    Object.assign(this.canvas.style, {
      position: 'absolute', top: '0', left: '0',
      width: w + 'px', height: h + 'px',
      zIndex: '1', imageRendering: 'crisp-edges'
    });
    
    this.ctx = this.canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false
    });
    this.ctx.imageSmoothingEnabled = false;
    
    this.container.appendChild(this.canvas);

    // HUD
    this.scoreEl = document.createElement('div');
    this.scoreEl.id = 'fc-score';
    this.scoreEl.textContent = 'Score: 0';
    this.scoreEl.className = 'fc-hud fc-score';

    this.pbScoreEl = document.createElement('div');
    this.pbScoreEl.id = 'fc-pb-score';
    this.pbScoreEl.textContent = 'Best: 0';
    this.pbScoreEl.className = 'fc-hud fc-pb-score';

    this.timerEl = document.createElement('div');
    this.timerEl.id = 'fc-timer';
    this.timerEl.textContent = '10:00';
    this.timerEl.className = 'fc-hud fc-timer';

    // Кнопки
    this.connectWalletBtn = document.createElement('button');
    this.connectWalletBtn.id = 'fc-connect-wallet-btn';
    this.connectWalletBtn.textContent = 'Connect Wallet';
    this.connectWalletBtn.className = 'fc-btn fc-connect-wallet-btn';
    this.connectWalletBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        if (window.handleConnectWallet) {
          await window.handleConnectWallet();
        } else {
          const { handleConnectWallet } = await import('../../web3.js');
          await handleConnectWallet();
        }
        this.connectWalletBtn.textContent = window.userAccount
          ? window.userAccount.slice(0, 6) + '...' + window.userAccount.slice(-4)
          : 'Connect Wallet';
      } catch (error) {
        console.error('Connect wallet error:', error);
      }
    });

    this.leaderboardBtn = document.createElement('button');
    this.leaderboardBtn.id = 'fc-leaderboard-btn';
    this.leaderboardBtn.textContent = 'Leaderboard';
    this.leaderboardBtn.className = 'fc-btn fc-leaderboard-btn';
    this.leaderboardBtn.addEventListener('click', async () => {
      if (window.showLeaderboard) {
        await window.showLeaderboard();
      } else if (window.userAccount) {
        const { showLeaderboard } = await import('../../web3.js');
        await showLeaderboard();
      } else {
        alert('Please connect wallet first');
      }
    });

    this.pauseBtn = document.createElement('button');
    this.pauseBtn.id = 'fc-pause-btn';
    this.pauseBtn.textContent = 'Pause';
    this.pauseBtn.className = 'fc-btn fc-pause-btn';

    this.pauseOverlay = document.createElement('div');
    this.pauseOverlay.id = 'fc-pause-overlay';
    this.pauseOverlay.className = 'fc-pause-overlay';
    this.pauseOverlay.innerHTML = `
      <span>PAUSED</span>
      <button id="fc-resume-btn" class="fc-btn">Resume</button>
    `;
    this.pauseOverlay.style.display = 'none';

    this.gameOverEl = document.createElement('div');
    this.gameOverEl.id = 'fc-game-over';
    this.gameOverEl.className = 'fc-game-over';
    this.gameOverEl.innerHTML = `
      <h2 id="fc-result-title">Game Over!</h2>
      <p id="fc-final-score">Your score: 0</p>
      <p id="fc-time-survived">Time: 0s</p>
      <button id="fc-restart" class="fc-btn">Play Again</button>
    `;
    this.gameOverEl.style.display = 'none';

    const backBtn = document.createElement('button');
    backBtn.id = 'fc-back-btn';
    backBtn.textContent = '← Back to Menu';
    backBtn.className = 'fc-btn fc-back-btn';
    backBtn.addEventListener('click', () => {
      this.stop();
      if (window.gameManager) {
        window.gameManager.showMainMenu();
      }
    });

    // Добавляем в контейнер
    this.container.appendChild(this.scoreEl);
    this.container.appendChild(this.pbScoreEl);
    this.container.appendChild(this.timerEl);
    this.container.appendChild(this.connectWalletBtn);
    this.container.appendChild(this.leaderboardBtn);
    this.container.appendChild(this.pauseBtn);
    this.container.appendChild(this.pauseOverlay);
    this.container.appendChild(this.gameOverEl);
    this.container.appendChild(backBtn);

    // Resize handler
    this._handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
    };
    window.addEventListener('resize', this._handleResize);

    // Обновление кнопки кошелька
    this.connectWalletBtn.textContent = window.userAccount
      ? window.userAccount.slice(0, 6) + '...' + window.userAccount.slice(-4)
      : 'Connect Wallet';
    
    this._onAccountChanged = () => this.updatePersonalBest();
    window.eventBus?.on('web3:accountChanged', this._onAccountChanged);
  }

  setupEventListeners() {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.pauseBtn.addEventListener('click', () => this.isPaused ? this.resume() : this.pause());
    this.pauseOverlay.querySelector('#fc-resume-btn').addEventListener('click', () => this.resume());
    this.gameOverEl.querySelector('#fc-restart').addEventListener('click', () => {
      this.gameOverEl.style.display = 'none';
      this.stop();
      this.start();
    });
  }

  onStart() {
    this.score = 0;
    this.isFrozen = false;
    this.freezeTimeLeft = 0;
    this.objects = [];
    this.flashEffects = [];
    this.explosionEffects = [];
    this.pausedAccum = 0;
    this.pauseStart = null;
    this.spawnAccumulator = 0;
    this.timerAccumulator = 0;
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.clearRect(0, 0, w, h);

    this.scoreEl.textContent = 'Score: 0';
    this.timerEl.textContent = '10:00';
    this.gameOverEl.style.display = 'none';
    this.pauseOverlay.style.display = 'none';
    this.pauseBtn.textContent = 'Pause';
    this.pauseBtn.style.display = 'block';

    this.freezeTimer?.remove();
    this.freezeTimer = null;

    this.startTime = performance.now();
    this.lastIceSpawn = this.startTime;

    this.nextSomniaIndex = 0;

    this.updatePersonalBest();
  }

  onStop() {
    this.objects = [];
    this.flashEffects = [];
    this.explosionEffects = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.freezeTimer?.remove();
    this.freezeTimer = null;
  }

  onPause() {
    this.pauseBtn.style.display = 'none';
    this.pauseOverlay.style.display = 'flex';
    this.pauseStart = performance.now();
  }

  onResume() {
    this.pauseBtn.style.display = 'block';
    this.pauseOverlay.style.display = 'none';
    if (this.pauseStart) {
      this.pausedAccum += performance.now() - this.pauseStart;
      this.pauseStart = null;
    }
  }

  update(deltaTime) {
    // Таймер
    this.timerAccumulator += deltaTime;
    if (this.timerAccumulator >= 1.0) {
      this.timerAccumulator -= 1.0;
      
      if (!this.isPaused) {
        const elapsed = performance.now() - this.startTime - this.pausedAccum;
        const remaining = CONFIG.GAME_DURATION - elapsed;

        if (remaining <= 0) {
          this.endGame(true);
        } else {
          this.timerEl.textContent = this.formatTime(remaining);
        }
      }
    }
    
    // Спавн
    this.spawnAccumulator += deltaTime;
    if (this.spawnAccumulator >= this.SPAWN_TICK_SECONDS) {
      this.spawnAccumulator -= this.SPAWN_TICK_SECONDS;
      this.spawnTick();
    }
    
    // Freeze
    if (this.isFrozen && this.freezeTimeLeft > 0) {
      this.freezeTimeLeft -= deltaTime;
      if (this.freezeTimeLeft <= 0) {
        this.isFrozen = false;
        this.freezeTimeLeft = 0;
        this.freezeTimer?.remove();
        this.freezeTimer = null;
      } else {
        this.freezeTimer.textContent = `Freeze: ${Math.ceil(this.freezeTimeLeft)}s`;
      }
    }
    
    // Обновление объектов
    const maxY = this.canvas.height + this.SPRITE_SIZE;
    
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];

      if (!this.isFrozen) {
        obj.y += obj.speed * deltaTime;

        if (obj.y > maxY) {
          this.objects.splice(i, 1);
        }
      }
    }

    // Обновление эффектов
    const lifeDelta = deltaTime * 1000;
    
    for (let i = this.flashEffects.length - 1; i >= 0; i--) {
      this.flashEffects[i].life -= lifeDelta;
      if (this.flashEffects[i].life <= 0) {
        this.flashEffects.splice(i, 1);
      }
    }

    for (let i = this.explosionEffects.length - 1; i >= 0; i--) {
      const exp = this.explosionEffects[i];
      exp.life -= lifeDelta;
      exp.size += exp.speed * deltaTime;
      exp.x += Math.cos(exp.angle) * exp.speed * deltaTime * 0.5;
      exp.y += Math.sin(exp.angle) * exp.speed * deltaTime * 0.5;
      
      if (exp.life <= 0) {
        this.explosionEffects.splice(i, 1);
      }
    }
  }

  render() {
    if (!this.ctx) return;
    
    const screenWidth = this.canvas.width;
    const screenHeight = this.canvas.height;
    const halfSize = this.SPRITE_SIZE / 2;

    // Очистка
    this.ctx.clearRect(0, 0, screenWidth, screenHeight);

    // Рендер объектов
    for (const obj of this.objects) {
      const sprite = this.emojiSprites.get(obj.type);
      if (sprite) {
        this.ctx.drawImage(sprite, obj.x - halfSize, obj.y - halfSize);
      }
      
      // Эффект пульсации для бомб
      if (obj.type === 'bomb') {
        this.ctx.save();
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = 'rgba(255, 40, 40, 0.9)';
        this.ctx.fillStyle = 'rgba(255, 40, 40, 0.3)';
        const bombRadius = this.OBJECT_SIZE / 2 + 5;
        this.ctx.beginPath();
        this.ctx.arc(obj.x, obj.y, bombRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    }

    // Flash эффекты
    for (const flash of this.flashEffects) {
      const lifeRatio = flash.life / 250;
      const size = (1 - lifeRatio) * 80;
      this.ctx.save();
      this.ctx.globalAlpha = lifeRatio;
      const gradient = this.ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, size);
      gradient.addColorStop(0, 'rgba(0, 255, 255, 1)');
      gradient.addColorStop(0.5, 'rgba(77, 255, 204, 0.5)');
      gradient.addColorStop(1, 'rgba(77, 255, 204, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(flash.x, flash.y, size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Explosion эффекты
    for (const exp of this.explosionEffects) {
      const lifeRatio = exp.life / exp.maxLife;
      const size = exp.size * 0.5;
      this.ctx.save();
      this.ctx.globalAlpha = lifeRatio * 0.8;
      const gradient = this.ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, size);
      gradient.addColorStop(0, 'rgba(255, 200, 0, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 100, 0, 0.8)');
      gradient.addColorStop(0.6, 'rgba(255, 40, 40, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 40, 40, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(exp.x, exp.y, size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Freeze overlay
    if (this.isFrozen) {
      this.ctx.fillStyle = 'rgba(200, 240, 255, 0.3)';
      this.ctx.fillRect(0, 0, screenWidth, screenHeight);
    }
  }

  spawnTick() {
    if (!this.isActive || this.isPaused || this.isFrozen) return;

    const now = performance.now();

    // Ice
    if (now - this.lastIceSpawn >= this.ICE_INTERVAL) {
      this.createObject('ice', 80);
      this.lastIceSpawn = now;
    }

    // Somnia
    const elapsed = now - this.startTime - this.pausedAccum;
    const expectedTime = (this.nextSomniaIndex + 1) * this.SOMNIA_INTERVAL_MS;
    if (this.nextSomniaIndex < this.SOMNIA_TOTAL && elapsed >= expectedTime) {
      this.createObject('somnia', 50 + Math.random() * 20);
      this.nextSomniaIndex++;
    }

    // Random spawns
    if (Math.random() < this.SPAWN_CHANCE_SNOW) {
      this.createObject('snow', 140 + Math.random() * 70);
    }
    if (Math.random() < this.SPAWN_CHANCE_BOMB) {
      this.createObject('bomb', 160 + Math.random() * 90);
    }
    if (Math.random() < this.SPAWN_CHANCE_GIFT) {
      this.createObject('gift', 120 + Math.random() * 60);
    }
  }

  createObject(type, speed) {
    if (!this.isActive || this.isPaused) return;
    
    // Удаляем только объекты за экраном, если достигнут лимит
    if (this.objects.length >= this.MAX_OBJECTS) {
      const maxY = this.canvas.height + this.SPRITE_SIZE;
      // Ищем первый объект за экраном
      for (let i = 0; i < this.objects.length; i++) {
        if (this.objects[i].y > maxY) {
          this.objects.splice(i, 1);
          break;
        }
      }
      // Если все объекты на экране, удаляем самый старый (первый)
      if (this.objects.length >= this.MAX_OBJECTS) {
        this.objects.shift();
      }
    }

    const canvasWidth = this.canvas.width;
    const x = Math.random() * (canvasWidth - this.SPRITE_SIZE) + this.SPRITE_SIZE / 2;
    const y = -this.SPRITE_SIZE;

    this.objects.push({
      type,
      x,
      y,
      speed
    });
  }

  handleCanvasClick(e) {
    if (!this.isActive || this.isPaused) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Проверяем с конца (сверху вниз)
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      const halfSize = this.SPRITE_SIZE / 2;
      const dx = x - obj.x;
      const dy = y - obj.y;
      
      if (Math.abs(dx) <= halfSize && dy >= -halfSize - this.HIT_PADDING && dy <= halfSize) {
        const type = obj.type;
        this.objects.splice(i, 1);
        this.createFlash(obj.x, obj.y);
        
        const scores = { snow: 1, bomb: 3, gift: 5, ice: 2, somnia: 100 };
        
        if (this.isFrozen) {
          this.addScore(scores[type] || 0);
          return;
        }

        if (type === 'bomb') {
          this.createExplosion(obj.x, obj.y);
          setTimeout(() => this.endGame(false), 300);
          return;
        }

        if (type === 'ice') {
          this.activateFreeze();
        }
        this.addScore(scores[type] || 0);
        return;
      }
    }
  }

  activateFreeze() {
    if (this.isFrozen) return;

    this.isFrozen = true;
    this.freezeTimeLeft = 5.0;

    if (!this.freezeTimer) {
      this.freezeTimer = document.createElement('div');
      this.freezeTimer.id = 'fc-freeze-timer';
      Object.assign(this.freezeTimer.style, {
        position: 'absolute', top: '50px', right: '20px',
        color: '#a0e0ff', fontSize: '20px', zIndex: '10',
        textShadow: '0 0 10px rgba(160, 224, 255, 0.8)'
      });
      this.container.appendChild(this.freezeTimer);
    }
    this.freezeTimer.textContent = 'Freeze: 5s';
  }

  endGame(isWin) {
    this.isActive = false;
    this.spawnAccumulator = 0;
    this.timerAccumulator = 0;

    const elapsed = performance.now() - this.startTime - this.pausedAccum;
    const resultTitle = this.gameOverEl.querySelector('#fc-result-title');
    const finalScoreEl = this.gameOverEl.querySelector('#fc-final-score');
    const timeSurvivedEl = this.gameOverEl.querySelector('#fc-time-survived');

    resultTitle.textContent = isWin ? '🎉 You Survived 10 Minutes! 🎉' : 'Game Over!';
    finalScoreEl.textContent = `Final Score: ${this.score}`;
    timeSurvivedEl.textContent = `Time: ${this.formatTime(elapsed)}`;
    this.gameOverEl.style.display = 'block';

    if (window.userAccount) {
      let submitBtn = this.gameOverEl.querySelector('#fc-submit-score');
      if (!submitBtn) {
        submitBtn = document.createElement('button');
        submitBtn.id = 'fc-submit-score';
        submitBtn.className = 'fc-btn';
        submitBtn.textContent = 'Submit Score';
        submitBtn.addEventListener('click', () => {
          eventBus.emit('game:score:submit', { gameId: this.id, score: this.score });
        });
        this.gameOverEl.appendChild(submitBtn);
      }
      submitBtn.style.display = 'block';
    }
  }

  createFlash(x, y) {
    if (this.flashEffects.length >= 10) this.flashEffects.shift();
    this.flashEffects.push({ x, y, life: 250 });
  }

  createExplosion(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      this.explosionEffects.push({
        x,
        y,
        angle,
        size: 5,
        speed: 200 + Math.random() * 100,
        life: 500,
        maxLife: 500
      });
    }
  }

  addScore(points) {
    this.score += points;
    this.scoreEl.textContent = `Score: ${this.score}`;
  }

  formatTime(ms) {
    const sec = Math.floor(ms / 1000);
    return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
  }

  async updatePersonalBest() {
    if (!window.contract || !window.ethereum || !window.userAccount) {
      this.pbScoreEl.textContent = 'Best: 0';
      return;
    }
    try {
      const idxPlusOne = await window.contract.methods.indexPlusOne(window.userAccount).call();
      if (idxPlusOne === '0' || idxPlusOne === 0) {
        this.pbScoreEl.textContent = 'Best: 0';
      } else {
        const entry = await window.contract.methods.leaderboard(Number(idxPlusOne) - 1).call();
        this.pbScoreEl.textContent = 'Best: ' + entry.score;
      }
    } catch (e) {
      this.pbScoreEl.textContent = 'Best: ?';
    }
  }

  onCleanup() {
    this.onStop();
    this.flashEffects = [];
    this.explosionEffects = [];
    
    if (this._handleResize) {
      window.removeEventListener('resize', this._handleResize);
    }
    
    if (this._onAccountChanged && window.eventBus) {
      window.eventBus.off('web3:accountChanged', this._onAccountChanged);
    }
  }
}

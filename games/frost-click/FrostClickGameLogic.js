/**
 * FrostClickGameLogic - модуль игровой логики для Frost Click
 * Отвечает за спавн объектов, обработку кликов, игровую механику
 */
import { CONFIG } from '../../config.js';
import { eventBus } from '../../core/EventBus.js';

export class FrostClickGameLogic {
  constructor(game) {
    this.game = game;
  }

  /**
   * Создание UI элементов
   */
  createUI() {
    if (!this.game.container) return;

    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Фиксированный внутренний resolution canvas
    this.game.canvas = document.createElement('canvas');
    this.game.canvas.id = 'fc-canvas';
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Canvas 1:1 с экраном БЕЗ CSS масштабирования
    // Используем реальные размеры экрана
    const realWidth = window.innerWidth;
    const realHeight = window.innerHeight;
    
    // Устанавливаем canvas в реальный размер экрана (1:1)
    this.game.canvas.width = realWidth;
    this.game.canvas.height = realHeight;
    this.game.canvasBaseWidth = realWidth;
    this.game.canvasBaseHeight = realHeight;
    
    // CSS размеры ДОЛЖНЫ совпадать с реальными пикселями canvas
    // Иначе координаты клика не будут соответствовать координатам рендера
    this.game.canvas.style.position = 'absolute';
    this.game.canvas.style.top = '0';
    this.game.canvas.style.left = '0';
    this.game.canvas.style.width = realWidth + 'px';  // Точные пиксели, не %
    this.game.canvas.style.height = realHeight + 'px'; // Точные пиксели, не %
    this.game.canvas.style.zIndex = '1';
    this.game.canvas.style.imageRendering = 'crisp-edges';
    
    this.game.ctx = this.game.canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false
    });
    
    // НЕ масштабируем контекст - canvas 1:1 с экраном
    
    // Оптимизация: отключаем сглаживание для лучшей производительности
    this.game.ctx.imageSmoothingEnabled = false;
    
    this.game.container.appendChild(this.game.canvas);

    // HUD элементы
    this.game.scoreEl = document.createElement('div');
    this.game.scoreEl.id = 'fc-score';
    this.game.scoreEl.textContent = 'Score: 0';
    this.game.scoreEl.className = 'fc-hud fc-score';

    this.game.pbScoreEl = document.createElement('div');
    this.game.pbScoreEl.id = 'fc-pb-score';
    this.game.pbScoreEl.textContent = 'Best: 0';
    this.game.pbScoreEl.className = 'fc-hud fc-pb-score';

    this.game.timerEl = document.createElement('div');
    this.game.timerEl.id = 'fc-timer';
    this.game.timerEl.textContent = '10:00';
    this.game.timerEl.className = 'fc-hud fc-timer';

    // Кнопка подключения кошелька (в HUD, между таймером и лидербордом)
    this.game.connectWalletBtn = document.createElement('button');
    this.game.connectWalletBtn.id = 'fc-connect-wallet-btn';
    this.game.connectWalletBtn.textContent = 'Connect Wallet';
    this.game.connectWalletBtn.className = 'fc-btn fc-connect-wallet-btn';
    this.game.connectWalletBtn.style.display = 'block'; // Всегда видна
    this.game.connectWalletBtn.style.pointerEvents = 'auto';
    this.game.connectWalletBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        if (window.handleConnectWallet) {
          await window.handleConnectWallet();
        } else {
          const { handleConnectWallet } = await import('../../web3.js');
          await handleConnectWallet();
        }
        // Обновляем текст кнопки после подключения
        this.updateConnectWalletButton();
      } catch (error) {
        console.error('Connect wallet error:', error);
      }
    });

    // Кнопка лидерборда (в HUD, слева от таймера)
    this.game.leaderboardBtn = document.createElement('button');
    this.game.leaderboardBtn.id = 'fc-leaderboard-btn';
    this.game.leaderboardBtn.textContent = 'Leaderboard';
    this.game.leaderboardBtn.className = 'fc-btn fc-leaderboard-btn';
    this.game.leaderboardBtn.style.display = 'block'; // Всегда видна
    this.game.leaderboardBtn.addEventListener('click', async () => {
      if (window.showLeaderboard) {
        await window.showLeaderboard();
      } else if (window.userAccount) {
        // Если кошелек подключен, но функция еще не загружена
        const { showLeaderboard } = await import('../../web3.js');
        await showLeaderboard();
      } else {
        alert('Please connect wallet first');
      }
    });

    this.game.pauseBtn = document.createElement('button');
    this.game.pauseBtn.id = 'fc-pause-btn';
    this.game.pauseBtn.textContent = 'Pause';
    this.game.pauseBtn.className = 'fc-btn fc-pause-btn';

    // Overlay паузы
    this.game.pauseOverlay = document.createElement('div');
    this.game.pauseOverlay.id = 'fc-pause-overlay';
    this.game.pauseOverlay.className = 'fc-pause-overlay';
    this.game.pauseOverlay.innerHTML = `
      <span>PAUSED</span>
      <button id="fc-resume-btn" class="fc-btn">Resume</button>
    `;
    this.game.pauseOverlay.style.display = 'none';

    // Game Over
    this.game.gameOverEl = document.createElement('div');
    this.game.gameOverEl.id = 'fc-game-over';
    this.game.gameOverEl.className = 'fc-game-over';
    this.game.gameOverEl.innerHTML = `
      <h2 id="fc-result-title">Game Over!</h2>
      <p id="fc-final-score">Your score: 0</p>
      <p id="fc-time-survived">Time: 0s</p>
      <button id="fc-restart" class="fc-btn">Play Again</button>
    `;
    this.game.gameOverEl.style.display = 'none';

    this.game.resultTitle = this.game.gameOverEl.querySelector('#fc-result-title');
    this.game.finalScoreEl = this.game.gameOverEl.querySelector('#fc-final-score');
    this.game.timeSurvivedEl = this.game.gameOverEl.querySelector('#fc-time-survived');
    this.game.restartBtn = this.game.gameOverEl.querySelector('#fc-restart');

    // Добавляем в контейнер
    this.game.container.appendChild(this.game.scoreEl);
    this.game.container.appendChild(this.game.pbScoreEl);
    this.game.container.appendChild(this.game.timerEl);
    this.game.container.appendChild(this.game.connectWalletBtn);
    this.game.container.appendChild(this.game.leaderboardBtn);
    this.game.container.appendChild(this.game.pauseBtn);
    this.game.container.appendChild(this.game.pauseOverlay);
    this.game.container.appendChild(this.game.gameOverEl);

    // Кнопка "Назад в меню"
    const backBtn = document.createElement('button');
    backBtn.id = 'fc-back-btn';
    backBtn.textContent = '← Back to Menu';
    backBtn.className = 'fc-btn fc-back-btn';
    backBtn.addEventListener('click', () => {
      this.game.stop();
      if (window.gameManager) {
        window.gameManager.showMainMenu();
      }
    });
    this.game.container.appendChild(backBtn);

    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Обработчик resize для 1:1 canvas
    this._handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      this.game.canvas.width = newWidth;
      this.game.canvas.height = newHeight;
      this.game.canvas.style.width = newWidth + 'px';
      this.game.canvas.style.height = newHeight + 'px';
      this.game.canvasBaseWidth = newWidth;
      this.game.canvasBaseHeight = newHeight;
      
      // Требуется перерисовка
      this.game.needsRedrawObjects = true;
      this.game.needsRedrawUI = true;
    };
    window.addEventListener('resize', this._handleResize);

    // Обновление текста кнопки Connect Wallet при изменении аккаунта
    this.updateConnectWalletButton();
    if (window.eventBus) {
      window.eventBus.on('web3:accountChanged', () => {
        this.updateConnectWalletButton();
      });
    }
  }

  /**
   * Обновление текста кнопки Connect Wallet
   */
  updateConnectWalletButton() {
    if (this.game.connectWalletBtn) {
      if (window.userAccount) {
        this.game.connectWalletBtn.textContent = window.userAccount.slice(0, 6) + '...' + window.userAccount.slice(-4);
      } else {
        this.game.connectWalletBtn.textContent = 'Connect Wallet';
      }
    }
  }

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners() {
    // Клик по Canvas
    this.game.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

    // Пауза
    if (this.game.pauseBtn) {
      this.game.pauseBtn.addEventListener('click', () => {
        if (this.game.isPaused) {
          this.game.resume();
        } else {
          this.game.pause();
        }
      });
    }

    // Resume
    const resumeBtn = this.game.pauseOverlay?.querySelector('#fc-resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => this.game.resume());
    }

    // Restart
    if (this.game.restartBtn) {
      this.game.restartBtn.addEventListener('click', () => {
        this.game.gameOverEl.style.display = 'none';
        this.game.start();
      });
    }

    // Подписка на обновление аккаунта (сохраняем ссылку для отписки)
    this._onAccountChanged = () => {
      this.game.updatePersonalBest();
    };
    eventBus.on('web3:accountChanged', this._onAccountChanged);
  }

  /**
   * Спавн объектов
   * ИДЕАЛЬНАЯ АРХИТЕКТУРА: Вызывается из RAF-цикла через deltaTime
   */
  spawnTick() {
    if (!this.game.isActive || this.game.isPaused || this.game.isFrozen) return;

    const now = performance.now();

    // Ice spawn
    if (now - this.game.lastIceSpawn >= this.game.ICE_INTERVAL) {
      this.createObject('ice', 80);
      this.game.lastIceSpawn = now;
    }

    // Somnia spawn
    const elapsed = now - this.game.startTime - this.game.pausedAccum;
    if (this.game.nextSomniaIndex < this.game.somniaSchedule.length &&
        elapsed >= this.game.somniaSchedule[this.game.nextSomniaIndex]) {
      this.createObject('somnia', 50 + Math.random() * 20);
      this.game.nextSomniaIndex++;
    }

    // Random spawns
    if (Math.random() < this.game.SPAWN_CHANCE_SNOW) {
      this.createObject('snow', 140 + Math.random() * 70);
    }
    if (Math.random() < this.game.SPAWN_CHANCE_BOMB) {
      this.createObject('bomb', 160 + Math.random() * 90);
    }
    if (Math.random() < this.game.SPAWN_CHANCE_GIFT) {
      this.createObject('gift', 120 + Math.random() * 60);
    }
  }

  /**
   * Создание нового объекта
   * ИДЕАЛЬНАЯ АРХИТЕКТУРА: Использует Object Pool
   */
  createObject(type, speed) {
    if (!this.game.isActive || this.game.isPaused) return;
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Object Pool - ограничиваем количество объектов
    // Используем getActive() один раз (он уже делает compact)
    const objects = this.game.objectPool.getActive();
    if (objects.length >= this.game.MAX_OBJECTS_ON_SCREEN) {
      // Удаляем самый старый объект (первый в массиве активных)
      if (objects.length > 0) {
        this.game.objectPool.release(objects[0]);
      }
    }

    // Используем реальную ширину canvas
    const canvasWidth = this.game.canvasBaseWidth || this.game.canvas.width || window.innerWidth;
    const x = Math.random() * (canvasWidth - this.game.SPRITE_SIZE) + this.game.SPRITE_SIZE / 2;
    const y = -this.game.SPRITE_SIZE;

    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Object Pool - получаем и инициализируем объект
    const obj = this.game.objectPool.acquire();
    this.game.objectPool.init(obj, type, x, y, speed);
    
    // Новый объект = нужен рендер
    this.game.needsRedrawObjects = true;
  }

  /**
   * Обработка клика по Canvas
   */
  handleCanvasClick(e) {
    if (!this.game.isActive || this.game.isPaused) return;
    
    // Оптимизация: троттлинг кликов для предотвращения лагов
    const now = Date.now();
    if (now - this.game.lastClickTime < this.game.CLICK_THROTTLE_MS) {
      return; // Пропускаем клик, если прошло слишком мало времени
    }
    this.game.lastClickTime = now;

    // Canvas 1:1 с экраном - координаты клика = координаты canvas
    // Всегда получаем свежий rect для точности (getBoundingClientRect быстрый при статичном элементе)
    const rect = this.game.canvas.getBoundingClientRect();
    
    // Вычисляем координаты клика напрямую
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: БЕЗ сортировки - проверяем все объекты (рендерим по слоям)
    const objects = this.game.objectPool.getActive();
    const objCount = objects.length;
    if (objCount === 0) return;
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Обратный цикл для проверки клика (сверху вниз)
    // После getActive() все объекты гарантированно активны
    for (let i = objCount - 1; i >= 0; i--) {
      const obj = objects[i];
      const halfSize = this.game.SPRITE_SIZE / 2;
      const hitPadding = this.game.HIT_PADDING;
      const objX = obj.x;
      const objY = obj.y;
      
      const dx = x - objX;
      const dy = y - objY;
      
      if (Math.abs(dx) <= halfSize && dy >= -halfSize - hitPadding && dy <= halfSize) {
        const type = obj.type;
        
        // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Object Pool - освобождаем объект
        this.game.objectPool.release(obj);
        this.game.needsRedrawObjects = true;
        this.game.createFlash(objX, objY);
        
        if (this.game.isFrozen) {
          if (type === 'snow') this.game.addScore(1);
          else if (type === 'bomb') this.game.addScore(3);
          else if (type === 'gift') this.game.addScore(5);
          else if (type === 'ice') this.game.addScore(2);
          else if (type === 'somnia') this.game.addScore(100);
          return;
        }

        if (type === 'bomb') {
          this.game.createExplosion(objX, objY);
          setTimeout(() => this.endGame(false), 300);
          return;
        }

        if (type === 'ice') {
          this.activateFreeze();
          this.game.addScore(2);
        } else if (type === 'somnia') {
          this.game.addScore(100);
        } else if (type === 'gift') {
          this.game.addScore(5);
        } else {
          this.game.addScore(1);
        }
        return;
      }
    }
  }

  /**
   * Активация эффекта заморозки
   * ИДЕАЛЬНАЯ АРХИТЕКТУРА: Freeze через RAF, без setInterval
   */
  activateFreeze() {
    if (this.game.isFrozen) return;

    this.game.isFrozen = true;
    this.game.freezeTimeLeft = 5.0; // 5 секунд

    // Freeze timer UI
    if (!this.game.freezeTimer) {
      this.game.freezeTimer = document.createElement('div');
      this.game.freezeTimer.id = 'fc-freeze-timer';
      Object.assign(this.game.freezeTimer.style, {
        position: 'absolute', top: '50px', right: '20px',
        color: '#a0e0ff', fontSize: '20px', zIndex: '10',
        textShadow: '0 0 10px rgba(160, 224, 255, 0.8)'
      });
      this.game.container.appendChild(this.game.freezeTimer);
    }
    this.game.freezeTimer.textContent = 'Freeze: 5s';
    this.game.needsRedrawFreeze = true;
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Убран setInterval - управляется через RAF в update()
  }

  /**
   * Завершение игры
   */
  endGame(isWin) {
    this.game.isActive = false;

    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Убраны все clearInterval - больше не используются

    const elapsed = performance.now() - this.game.startTime - this.game.pausedAccum;

    if (this.game.resultTitle) {
      this.game.resultTitle.textContent = isWin
        ? '🎉 You Survived 10 Minutes! 🎉'
        : 'Game Over!';
    }
    if (this.game.finalScoreEl) {
      this.game.finalScoreEl.textContent = `Final Score: ${this.game.score}`;
    }
    if (this.game.timeSurvivedEl) {
      this.game.timeSurvivedEl.textContent = `Time: ${this.game.formatTime(elapsed)}`;
    }

    if (this.game.gameOverEl) {
      this.game.gameOverEl.style.display = 'block';
    }

    if (window.userAccount) {
      this.showWeb3Buttons();
    }
  }

  /**
   * Показать кнопки Web3
   */
  showWeb3Buttons() {
    if (!window.userAccount) return;

    // Кнопка Submit Score в Game Over
    let submitBtn = this.game.gameOverEl.querySelector('#fc-submit-score');
    if (!submitBtn) {
      submitBtn = document.createElement('button');
      submitBtn.id = 'fc-submit-score';
      submitBtn.className = 'fc-btn';
      submitBtn.textContent = 'Submit Score';
      submitBtn.addEventListener('click', () => {
        eventBus.emit('game:score:submit', { gameId: this.game.id, score: this.game.score });
      });
      this.game.gameOverEl.appendChild(submitBtn);
    }
    submitBtn.style.display = 'block';

    // Кнопка лидерборда всегда видна в HUD
  }
}


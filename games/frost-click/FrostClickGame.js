/**
 * FrostClickGame - основной класс игры Frost Click
 * Координирует работу модулей рендеринга и игровой логики
 */
import { GameBase } from '../../core/GameBase.js';
import { CONFIG } from '../../config.js';
import { FrostClickRenderer } from './FrostClickRenderer.js';
import { FrostClickGameLogic } from './FrostClickGameLogic.js';
import { ObjectPool } from '../../utils/ObjectPool.js';
import { eventBus } from '../../core/EventBus.js';

export class FrostClickGame extends GameBase {
  constructor() {
    super(
      'frost-click',
      'Frost Click',
      'Survive 10 minutes • Avoid bombs • Collect gifts',
      '❄️'
    );

    // Canvas элементы
    this.canvas = null;
    this.ctx = null;
    
    // Игровое состояние
    this.score = 0;
    this.isFrozen = false;
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: objects теперь getter, который возвращает objectPool.getActive()
    // Не устанавливаем this.objects = [] здесь
    this.startTime = 0;
    this.pausedAccum = 0;
    this.pauseStart = null;

    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Один RAF-цикл - все через deltaTime
    this.spawnAccumulator = 0;
    this.SPAWN_TICK_SECONDS = 0.15; // 150ms в секундах
    this.timerAccumulator = 0;
    this.freezeTimeLeft = 0;
    
    this.SPAWN_CHANCE_SNOW = 0.60;
    this.SPAWN_CHANCE_BOMB = 0.60;
    this.SPAWN_CHANCE_GIFT = 0.18;
    this.SPAWN_CHANCE_ICE = 0.0033;
    
    // Object Pool для объектов
    this.objectPool = new ObjectPool(() => ({
      type: 'snow',
      x: 0,
      y: 0,
      speed: 0,
      active: false
    }), 100);
    
    // Оптимизация: ограничение максимального количества объектов на экране
    this.MAX_OBJECTS_ON_SCREEN = 50;

    // Somnia
    this.SOMNIA_INTERVAL_MS = 58_000;
    this.SOMNIA_TOTAL = 10;
    this.somniaSchedule = [];
    this.nextSomniaIndex = 0;

    // Ice
    this.lastIceSpawn = 0;
    this.ICE_INTERVAL = 45 * 1000;

    // Hitbox размеры
    this.OBJECT_SIZE = 28; // Уменьшено с 40 до 28
    this.SPRITE_SIZE = this.OBJECT_SIZE * 2; // Реальный размер спрайта (56px)
    this.HIT_PADDING = 10; // Увеличено для лучшей точности клика

    // DOM элементы для UI
    this.scoreEl = null;
    this.timerEl = null;
    this.pbScoreEl = null;
    this.pauseBtn = null;
    this.gameOverEl = null;
    this.resultTitle = null;
    this.finalScoreEl = null;
    this.timeSurvivedEl = null;
    this.restartBtn = null;
    this.pauseOverlay = null;
    this.freezeTimer = null;
    this.leaderboardBtn = null;
    this.connectWalletBtn = null;

    // Flash эффекты
    this.flashEffects = [];
    this.MAX_FLASH_EFFECTS = 10; // Ограничение количества flash эффектов
    
    // Эффекты взрыва
    this.explosionEffects = [];
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Детализация dirty flags
    this.needsRedrawObjects = true;
    this.needsRedrawEffects = false;
    this.needsRedrawUI = false;
    this.needsRedrawFreeze = false;
    
    // Оптимизация кликов: кэш для сортировки объектов
    this.objectsSortedCache = null;
    this.lastClickTime = 0;
    this.CLICK_THROTTLE_MS = 16; // ~60 FPS для кликов

    // Модули
    this.renderer = new FrostClickRenderer(this);
    this.logic = new FrostClickGameLogic(this);
  }

  async onInit() {
    try {
      await this.renderer.loadEmojiSprites();
      this.logic.createUI();
      this.logic.setupEventListeners();
    } catch (error) {
      console.error('Error in FrostClickGame.onInit():', error);
      // Пытаемся создать UI даже если спрайты не загрузились
      try {
        this.logic.createUI();
        this.logic.setupEventListeners();
      } catch (uiError) {
        console.error('Error creating UI:', uiError);
      }
      throw error; // Пробрасываем ошибку дальше
    }
  }

  onStart() {
    this.score = 0;
    this.isFrozen = false;
    this.freezeTimeLeft = 0;
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Object Pool - освобождаем все объекты
    this.objectPool.releaseAll();
    this.flashEffects = [];
    this.explosionEffects = [];
    this.pausedAccum = 0;
    this.pauseStart = null;
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Сброс аккумуляторов для RAF-цикла
    this.spawnAccumulator = 0;
    this.timerAccumulator = 0;
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Обновляем размеры canvas при старте игры (1:1 с экраном)
    if (this.canvas) {
      const realWidth = window.innerWidth;
      const realHeight = window.innerHeight;
      
      this.canvas.width = realWidth;
      this.canvas.height = realHeight;
      this.canvasBaseWidth = realWidth;
      this.canvasBaseHeight = realHeight;
    }
    
    // Первый рендер обязателен
    this.needsRedrawObjects = true;
    this.needsRedrawEffects = false;
    this.needsRedrawUI = false;
    this.needsRedrawFreeze = false;

    // Очистка Canvas
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Обновление UI
    if (this.scoreEl) this.scoreEl.textContent = 'Score: 0';
    if (this.timerEl) this.timerEl.textContent = '10:00';
    if (this.gameOverEl) this.gameOverEl.style.display = 'none';
    if (this.pauseOverlay) this.pauseOverlay.style.display = 'none';
    if (this.pauseBtn) {
      this.pauseBtn.textContent = 'Pause';
      this.pauseBtn.style.display = 'block';
    }

    // Удаление freeze overlay если есть
    if (this.freezeTimer) {
      this.freezeTimer.remove();
      this.freezeTimer = null;
    }

    this.startTime = performance.now();
    this.lastIceSpawn = this.startTime;

    // Somnia schedule
    this.somniaSchedule = Array.from(
      { length: this.SOMNIA_TOTAL },
      (_, i) => (i + 1) * this.SOMNIA_INTERVAL_MS
    );
    this.nextSomniaIndex = 0;

    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Убраны все setInterval - все через RAF

    // Обновление PB
    this.updatePersonalBest();
  }

  onStop() {
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Убраны все clearInterval - больше не используются

    // Очистка объектов через Object Pool
    this.objectPool.releaseAll();
    this.flashEffects = [];
    this.explosionEffects = [];

    // Очистка Canvas
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Удаление overlays
    if (this.freezeTimer) {
      this.freezeTimer.remove();
      this.freezeTimer = null;
    }
  }

  onPause() {
    if (this.pauseBtn) {
      this.pauseBtn.style.display = 'none';
    }
    if (this.pauseOverlay) {
      this.pauseOverlay.style.display = 'flex';
    }
    this.pauseStart = performance.now();
  }

  onResume() {
    if (this.pauseBtn) {
      this.pauseBtn.style.display = 'block';
    }
    if (this.pauseOverlay) {
      this.pauseOverlay.style.display = 'none';
    }
    if (this.pauseStart) {
      this.pausedAccum += performance.now() - this.pauseStart;
      this.pauseStart = null;
    }
  }

  update(deltaTime) {
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Таймер через RAF
    this.timerAccumulator += deltaTime;
    if (this.timerAccumulator >= 1.0) {
      this.timerAccumulator -= 1.0;
      
      if (!this.isPaused) {
        const elapsed = performance.now() - this.startTime - this.pausedAccum;
        const remaining = CONFIG.GAME_DURATION - elapsed;

        if (remaining <= 0) {
          this.logic.endGame(true);
        } else {
          if (this.timerEl) {
            this.timerEl.textContent = this.formatTime(remaining);
          }
        }
      }
    }
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Spawner через RAF
    this.spawnAccumulator += deltaTime;
    if (this.spawnAccumulator >= this.SPAWN_TICK_SECONDS) {
      this.spawnAccumulator -= this.SPAWN_TICK_SECONDS;
      this.logic.spawnTick();
    }
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Freeze через RAF
    if (this.isFrozen && this.freezeTimeLeft > 0) {
      this.freezeTimeLeft -= deltaTime;
      if (this.freezeTimeLeft <= 0) {
        this.isFrozen = false;
        this.freezeTimeLeft = 0;
        if (this.freezeTimer) {
          this.freezeTimer.remove();
          this.freezeTimer = null;
        }
        this.needsRedrawFreeze = true;
      } else {
        // Обновляем текст freeze timer
        const seconds = Math.ceil(this.freezeTimeLeft);
        if (this.freezeTimer) {
          this.freezeTimer.textContent = `Freeze: ${seconds}s`;
        }
        this.needsRedrawFreeze = true;
      }
    }
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Object Pool - обновляем только активные объекты
    const objects = this.objectPool.getActive();
    const objectCount = objects.length;
    
    // Используем реальную высоту canvas
    const screenHeight = this.canvas ? this.canvas.height : window.innerHeight;
    // Объекты должны исчезать только когда полностью уйдут за экран
    const maxY = screenHeight + this.SPRITE_SIZE;
    
    let objectsMoved = false;
    let objectsRemoved = false;
    
    // Обратный цикл для безопасного удаления
    // После getActive() все объекты гарантированно активны (compact уже выполнен)
    for (let i = objectCount - 1; i >= 0; i--) {
      const obj = objects[i];

      if (!this.isFrozen) {
        obj.y += obj.speed * deltaTime;
        objectsMoved = true;

        // Удаление объектов за экраном через Object Pool
        if (obj.y > maxY) {
          this.objectPool.release(obj);
          objectsRemoved = true;
        }
      }
    }
    
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Детализация dirty flags
    if (objectsMoved || objectsRemoved) {
      this.needsRedrawObjects = true;
    }

    // Обновление flash эффектов (без splice - используем swap-and-pop)
    if (this.flashEffects.length > 0) {
      const lifeDelta = deltaTime * 1000;
      let hasActive = false;
      let writeIdx = 0;
      
      for (let i = 0; i < this.flashEffects.length; i++) {
        const flash = this.flashEffects[i];
        flash.life -= lifeDelta;
        if (flash.life > 0) {
          if (writeIdx !== i) {
            this.flashEffects[writeIdx] = flash;
          }
          writeIdx++;
          hasActive = true;
        }
      }
      this.flashEffects.length = writeIdx;
      this.needsRedrawEffects = hasActive;
    } else {
      this.needsRedrawEffects = false;
    }

    // Обновление эффектов взрыва (без splice)
    if (this.explosionEffects.length > 0) {
      const lifeDelta = deltaTime * 1000;
      let hasActive = false;
      let writeIdx = 0;
      
      for (let i = 0; i < this.explosionEffects.length; i++) {
        const explosion = this.explosionEffects[i];
        explosion.life -= lifeDelta;
        explosion.size += explosion.speed * deltaTime;
        // Движение по углу
        explosion.x += Math.cos(explosion.angle) * explosion.speed * deltaTime * 0.5;
        explosion.y += Math.sin(explosion.angle) * explosion.speed * deltaTime * 0.5;
        
        if (explosion.life > 0) {
          if (writeIdx !== i) {
            this.explosionEffects[writeIdx] = explosion;
          }
          writeIdx++;
          hasActive = true;
        }
      }
      this.explosionEffects.length = writeIdx;
      this.needsRedrawEffects = hasActive || this.needsRedrawEffects;
    }
    
    // Бомбы пульсируют - нужен рендер если есть бомбы
    // Используем счётчик из ObjectPool вместо .some()
    if (this.objectPool.hasType('bomb')) {
      this.needsRedrawObjects = true;
    }
  }

  render() {
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Условный рендер с детализацией флагов
    if (this.needsRedrawObjects || this.needsRedrawEffects || this.needsRedrawFreeze) {
      this.renderer.render();
      this.needsRedrawObjects = false;
      this.needsRedrawEffects = false;
      this.needsRedrawFreeze = false;
    }
  }

  // Вспомогательные методы
  createFlash(x, y) {
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Ограничиваем количество flash эффектов
    if (this.flashEffects.length >= this.MAX_FLASH_EFFECTS) {
      // Удаляем самый старый flash эффект
      this.flashEffects.shift();
    }
    this.flashEffects.push({ x, y, life: 250 });
    this.needsRedrawEffects = true;
  }

  createExplosion(x, y) {
    // ИДЕАЛЬНАЯ АРХИТЕКТУРА: Создаем эффект взрыва с несколькими частицами
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
    this.needsRedrawEffects = true;
  }
  
  /**
   * Получить все активные объекты (для совместимости)
   */
  get objects() {
    return this.objectPool.getActive();
  }

  addScore(points) {
    this.score += points;
    if (this.scoreEl) {
      this.scoreEl.textContent = `Score: ${this.score}`;
    }
  }

  formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  async updatePersonalBest() {
    if (!window.contract || !window.ethereum || !window.userAccount) {
      if (this.pbScoreEl) this.pbScoreEl.textContent = 'Best: 0';
      return;
    }
    try {
      const idxPlusOne = await window.contract.methods.indexPlusOne(window.userAccount).call();
      if (idxPlusOne === '0' || idxPlusOne === 0) {
        if (this.pbScoreEl) this.pbScoreEl.textContent = 'Best: 0';
      } else {
        const idx = Number(idxPlusOne) - 1;
        const entry = await window.contract.methods.leaderboard(idx).call();
        if (this.pbScoreEl) {
          this.pbScoreEl.textContent = 'Best: ' + entry.score;
        }
      }
    } catch (e) {
      if (this.pbScoreEl) this.pbScoreEl.textContent = 'Best: ?';
    }
  }

  getScore() {
    return this.score;
  }

  onCleanup() {
    this.onStop();
    this.flashEffects = [];
    this.explosionEffects = [];
    
    // Отписываемся от resize
    if (this.logic._handleResize) {
      window.removeEventListener('resize', this.logic._handleResize);
    }
    
    // Отписываемся от eventBus
    if (this.logic._onAccountChanged) {
      eventBus.off('web3:accountChanged', this.logic._onAccountChanged);
    }
  }
}

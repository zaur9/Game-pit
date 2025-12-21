/**
 * FrostClickGame - основной класс игры Frost Click
 * Координирует работу модулей рендеринга и игровой логики
 */
import { GameBase } from '../../core/GameBase.js';
import { CONFIG } from '../../config.js';
import { FrostClickRenderer } from './FrostClickRenderer.js';
import { FrostClickGameLogic } from './FrostClickGameLogic.js';

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
    this.objects = [];
    this.startTime = 0;
    this.pausedAccum = 0;
    this.pauseStart = null;

    // Таймеры
    this.timerInterval = null;
    this.spawnIntervalId = null;

    // Spawn настройки
    this.SPAWN_TICK_MS = 150;
    this.SPAWN_CHANCE_SNOW = 0.60;
    this.SPAWN_CHANCE_BOMB = 0.60;
    this.SPAWN_CHANCE_GIFT = 0.18;
    this.SPAWN_CHANCE_ICE = 0.0033;

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

    // Flash эффекты
    this.flashEffects = [];
    
    // Эффекты взрыва
    this.explosionEffects = [];
    
    // Оптимизация рендеринга
    this.needsRedraw = true;

    // Модули
    this.renderer = new FrostClickRenderer(this);
    this.logic = new FrostClickGameLogic(this);
  }

  async onInit() {
    await this.renderer.loadEmojiSprites();
    this.logic.createUI();
    this.logic.setupEventListeners();
  }

  onStart() {
    this.score = 0;
    this.isFrozen = false;
    this.objects = [];
    this.flashEffects = [];
    this.explosionEffects = [];
    this.pausedAccum = 0;
    this.pauseStart = null;
    this.needsRedraw = true;

    // Очистка Canvas
    if (this.ctx) {
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

    this.startTime = Date.now();
    this.lastIceSpawn = this.startTime;

    // Somnia schedule
    this.somniaSchedule = Array.from(
      { length: this.SOMNIA_TOTAL },
      (_, i) => (i + 1) * this.SOMNIA_INTERVAL_MS
    );
    this.nextSomniaIndex = 0;

    // Таймер
    this.timerInterval = setInterval(() => {
      if (this.isPaused) return;

      const elapsed = Date.now() - this.startTime - this.pausedAccum;
      const remaining = CONFIG.GAME_DURATION - elapsed;

      if (remaining <= 0) {
        clearInterval(this.timerInterval);
        this.logic.endGame(true);
      } else {
        if (this.timerEl) {
          this.timerEl.textContent = this.formatTime(remaining);
        }
      }
    }, 1000);

    // Spawner
    this.spawnIntervalId = setInterval(() => this.logic.spawnTick(), this.SPAWN_TICK_MS);

    // Обновление PB
    this.updatePersonalBest();
  }

  onStop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.spawnIntervalId) {
      clearInterval(this.spawnIntervalId);
      this.spawnIntervalId = null;
    }

    // Очистка объектов
    this.objects = [];
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
    this.pauseStart = Date.now();
  }

  onResume() {
    if (this.pauseBtn) {
      this.pauseBtn.style.display = 'block';
    }
    if (this.pauseOverlay) {
      this.pauseOverlay.style.display = 'none';
    }
    if (this.pauseStart) {
      this.pausedAccum += Date.now() - this.pauseStart;
      this.pauseStart = null;
    }
  }

  update(deltaTime) {
    // Обновление позиций объектов
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];

      if (!this.isFrozen) {
        obj.y += obj.speed * deltaTime;

        // Удаление объектов за экраном
        if (obj.y > window.innerHeight + this.SPRITE_SIZE) {
          this.objects.splice(i, 1);
          this.needsRedraw = true;
        }
      }
    }

    // Обновление flash эффектов
    for (let i = this.flashEffects.length - 1; i >= 0; i--) {
      this.flashEffects[i].life -= deltaTime * 1000;
      if (this.flashEffects[i].life <= 0) {
        this.flashEffects.splice(i, 1);
      }
    }

    // Обновление эффектов взрыва
    for (let i = this.explosionEffects.length - 1; i >= 0; i--) {
      const explosion = this.explosionEffects[i];
      explosion.life -= deltaTime * 1000;
      explosion.size += explosion.speed * deltaTime;
      
      if (explosion.life <= 0) {
        this.explosionEffects.splice(i, 1);
      }
    }
  }

  render() {
    this.renderer.render();
  }

  // Вспомогательные методы
  createFlash(x, y) {
    this.flashEffects.push({ x, y, life: 250 });
  }

  createExplosion(x, y) {
    // Создаем эффект взрыва с несколькими частицами
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
  }
}

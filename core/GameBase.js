/**
 * GameBase - базовый класс для всех мини-игр
 * Определяет интерфейс и общую функциональность
 */
import { eventBus } from './EventBus.js';

export class GameBase {
  constructor(id, name, description, icon = '🎮') {
    this.id = id;
    this.name = name;
    this.description = description;
    this.icon = icon;
    
    this.isActive = false;
    this.isPaused = false;
    this.container = null;
    this.gameLoopId = null;
    this.lastFrameTime = null;
    this._initialized = false;
    
    // Статистика производительности
    this.stats = {
      fps: 0,
      frameCount: 0,
      lastStatsTime: performance.now()
    };
  }

  /**
   * Инициализация игры (вызывается один раз при загрузке)
   * @param {HTMLElement} container - контейнер для игры
   */
  async init(container) {
    // Если контейнер изменился, сбрасываем флаг инициализации
    if (this.container !== container) {
      this._initialized = false;
    }
    
    // Если уже инициализирован с тем же контейнером, пропускаем
    if (this.container === container && this._initialized) {
      return;
    }
    
    this.container = container;
    try {
      await this.onInit();
      this._initialized = true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Начать игру
   */
  start() {
    // Если уже активна, не запускаем повторно
    if (this.isActive) return;
    
    // Останавливаем предыдущий цикл если есть
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
    
    this.isActive = true;
    this.isPaused = false;
    this.lastFrameTime = null;
    this.resetStats();
    
    this.onStart();
    this.gameLoop();
    eventBus.emit('game:started', { gameId: this.id });
  }

  /**
   * Остановить игру
   */
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.isPaused = false;
    
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
    
    this.onStop();
    eventBus.emit('game:stopped', { gameId: this.id });
  }

  /**
   * Поставить игру на паузу
   */
  pause() {
    if (!this.isActive || this.isPaused) return;
    
    this.isPaused = true;
    this.onPause();
    eventBus.emit('game:paused', { gameId: this.id });
  }

  /**
   * Возобновить игру
   */
  resume() {
    if (!this.isActive || !this.isPaused) return;
    
    this.isPaused = false;
    this.lastFrameTime = null; // Сброс для избежания скачка deltaTime
    this.onResume();
    eventBus.emit('game:resumed', { gameId: this.id });
  }

  /**
   * Игровой цикл (оптимизированный)
   */
  gameLoop(timestamp = performance.now()) {
    if (!this.isActive) return;
    
    if (this.lastFrameTime === null) {
      this.lastFrameTime = timestamp;
    }
    
    let deltaTime = (timestamp - this.lastFrameTime) / 1000; // в секундах
    this.lastFrameTime = timestamp;
    
    // КРИТИЧНО: Ограничиваем deltaTime чтобы избежать "прыжков"
    // Минимум 0 (защита от отрицательных значений)
    // Максимум 0.05 (50ms = 20 FPS минимум) - строже для стабильной физики
    if (deltaTime < 0) {
      deltaTime = 0;
    } else if (deltaTime > 0.05) {
      deltaTime = 0.05;
    }
    
    if (!this.isPaused) {
      this.update(deltaTime);
      this.render();
      this.updateStats(timestamp);
    }
    
    this.gameLoopId = requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  /**
   * Обновление статистики FPS
   */
  updateStats(timestamp) {
    this.stats.frameCount++;
    const elapsed = timestamp - this.stats.lastStatsTime;
    
    if (elapsed >= 1000) {
      this.stats.fps = Math.round((this.stats.frameCount * 1000) / elapsed);
      this.stats.frameCount = 0;
      this.stats.lastStatsTime = timestamp;
    }
  }

  /**
   * Сброс статистики
   */
  resetStats() {
    this.stats = {
      fps: 0,
      frameCount: 0,
      lastStatsTime: performance.now()
    };
  }

  /**
   * Получить FPS
   */
  getFPS() {
    return this.stats.fps;
  }

  /**
   * Очистка ресурсов
   */
  cleanup() {
    this.stop();
    this.onCleanup();
  }

  // === Виртуальные методы (переопределяются в дочерних классах) ===
  
  onInit() {
    // Переопределить в дочернем классе
  }

  onStart() {
    // Переопределить в дочернем классе
  }

  onStop() {
    // Переопределить в дочернем классе
  }

  onPause() {
    // Переопределить в дочернем классе
  }

  onResume() {
    // Переопределить в дочернем классе
  }

  update(deltaTime) {
    // Переопределить в дочернем классе
    // deltaTime в секундах
  }

  render() {
    // Переопределить в дочернем классе
  }

  onCleanup() {
    // Переопределить в дочернем классе для освобождения ресурсов
  }

  /**
   * Получить HTML для меню игры
   */
  getMenuHTML() {
    return `
      <div class="game-card" data-game-id="${this.id}">
        <div class="game-icon">${this.icon}</div>
        <div class="game-info">
          <h3>${this.name}</h3>
          <p>${this.description}</p>
        </div>
      </div>
    `;
  }
}


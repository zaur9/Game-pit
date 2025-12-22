/**
 * GameManager - централизованное управление играми
 * Отвечает за переключение между играми, управление состоянием
 */
import { eventBus } from './EventBus.js';

export class GameManager {
  constructor() {
    this.games = new Map();
    this.currentGame = null;
    this.gameContainer = null;
    this.mainMenu = null;
    this.snowInterval = null; // Интервал для создания снега
  }

  /**
   * Инициализация менеджера
   * @param {HTMLElement} gameContainer - контейнер для игр
   * @param {HTMLElement} mainMenu - элемент главного меню
   */
  init(gameContainer, mainMenu) {
    this.gameContainer = gameContainer;
    this.mainMenu = mainMenu;
    
    // Подписка на события
    eventBus.on('game:request:start', (data) => this.startGame(data.gameId));
    eventBus.on('game:request:stop', () => this.stopCurrentGame());
    eventBus.on('game:request:menu', () => this.showMainMenu());
  }

  /**
   * Регистрация игры
   * @param {GameBase} game - экземпляр игры
   */
  registerGame(game) {
    if (this.games.has(game.id)) {
      return;
    }
    
    this.games.set(game.id, game);
    
    // Добавляем карточку в меню
    if (!this.mainMenu) {
      return;
    }
    
    // Ищем games-grid внутри main-menu контейнера
    const menuContent = this.mainMenu.querySelector('#games-grid') || 
                       this.mainMenu.querySelector('.games-grid') ||
                       document.querySelector('#games-grid');
    
    if (!menuContent) {
      return;
    }
    
    // Создаем карточку игры
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = game.getMenuHTML().trim();
    const gameCard = tempDiv.firstElementChild;
    
    if (!gameCard) {
      return;
    }
    
    // Добавляем обработчик клика
    const gameId = game.id;
    gameCard.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.startGame(gameId);
    });
    
    gameCard.style.cursor = 'pointer';
    
    // Добавляем карточку в меню
    menuContent.appendChild(gameCard);
    
    // Инициализация будет выполнена при первом запуске игры
    // Не инициализируем здесь, чтобы избежать двойной инициализации
    
    eventBus.emit('game:registered', { gameId: game.id });
  }

  /**
   * Получить игру по ID
   */
  getGame(gameId) {
    return this.games.get(gameId);
  }

  /**
   * Получить список всех игр
   */
  getAllGames() {
    return Array.from(this.games.values());
  }

  /**
   * Начать игру
   */
  startGame(gameId) {
    const game = this.games.get(gameId);
    if (!game) {
      console.error(`Game "${gameId}" not found`);
      return;
    }

    // Останавливаем текущую игру, если есть
    if (this.currentGame && this.currentGame.id !== gameId) {
      this.currentGame.stop();
    }

    // Скрываем меню
    if (this.mainMenu) {
      this.mainMenu.style.display = 'none';
    }

    // Показываем контейнер игры
    if (this.gameContainer) {
      this.gameContainer.style.display = 'block';
      // Очищаем контейнер
      this.gameContainer.innerHTML = '';
    }

    // Запускаем снег для игры
    this.startSnow();

    // Инициализируем и запускаем новую игру
    this.currentGame = game;
    
    // Если игра еще не инициализирована, инициализируем ее
    if (!game.container || game.container !== this.gameContainer) {
      game.init(this.gameContainer).then(() => {
        game.start();
      }).catch(error => {
        // Возвращаемся в меню при ошибке
        this.showMainMenu();
      });
    } else {
      // Игра уже инициализирована, просто запускаем
      game.start();
    }
  }

  /**
   * Остановить текущую игру
   */
  stopCurrentGame() {
    if (this.currentGame) {
      this.currentGame.stop();
      this.currentGame = null;
    }
  }

  /**
   * Показать главное меню
   */
  showMainMenu() {
    // Останавливаем текущую игру
    this.stopCurrentGame();

    // Останавливаем снег
    this.stopSnow();

    // Скрываем контейнер игры
    if (this.gameContainer) {
      this.gameContainer.style.display = 'none';
    }

    // Показываем меню
    if (this.mainMenu) {
      this.mainMenu.style.display = 'flex';
    }

    eventBus.emit('menu:shown');
  }

  /**
   * Запустить снег (только во время игры)
   */
  startSnow() {
    // Останавливаем предыдущий интервал, если есть
    this.stopSnow();

    // Снег должен создаваться только в контейнере игры, а не в body
    if (!this.gameContainer) return;

    const createSnow = () => {
      const snow = document.createElement("div");
      snow.classList.add("snowflake");
      snow.textContent = "•";
      snow.style.left = Math.random() * 100 + "vw";
      snow.style.fontSize = (8 + Math.random() * 8) + "px";
      snow.style.animationDuration = (6 + Math.random() * 8) + "s";
      // Добавляем снежинку в контейнер игры, а не в body
      this.gameContainer.appendChild(snow);
      setTimeout(() => {
        if (snow.parentNode) {
          snow.remove();
        }
      }, 15000);
    };

    // Создаем снег каждые 220ms
    this.snowInterval = setInterval(createSnow, 220);
  }

  /**
   * Остановить снег
   */
  stopSnow() {
    // Останавливаем интервал создания новых снежинок
    if (this.snowInterval) {
      clearInterval(this.snowInterval);
      this.snowInterval = null;
    }
    
    // Удаляем все существующие снежинки из контейнера игры
    if (this.gameContainer) {
      const snowflakes = this.gameContainer.querySelectorAll('.snowflake');
      snowflakes.forEach(snow => snow.remove());
    }
  }

  /**
   * Получить текущую игру
   */
  getCurrentGame() {
    return this.currentGame;
  }

  /**
   * Очистка всех ресурсов
   */
  cleanup() {
    // Останавливаем все игры
    this.games.forEach(game => game.cleanup());
    this.games.clear();
    this.currentGame = null;
  }
}

// Создаем глобальный экземпляр
export const gameManager = new GameManager();


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
      console.warn(`Game with id "${game.id}" already registered`);
      return;
    }
    
    this.games.set(game.id, game);
    game.init(this.gameContainer);
    
    // Добавляем карточку в меню
    if (this.mainMenu) {
      const menuContent = this.mainMenu.querySelector('.games-grid');
      if (menuContent) {
        const card = document.createElement('div');
        card.innerHTML = game.getMenuHTML();
        const gameCard = card.firstElementChild;
        gameCard.addEventListener('click', () => {
          this.startGame(game.id);
        });
        menuContent.appendChild(gameCard);
      }
    }
    
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

    // Инициализируем и запускаем новую игру
    this.currentGame = game;
    game.init(this.gameContainer);
    game.start();
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


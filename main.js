/**
 * main.js - главный файл инициализации Game Arena
 * Инициализирует все системы и регистрирует игры
 */
import { gameManager } from './core/GameManager.js';
import { MainMenu } from './ui/MainMenu.js';
import { FrostClickGame } from './games/frost-click/FrostClickGame.js';
import { initWeb3, setupWeb3Buttons } from './web3.js';

// Глобальные переменные для совместимости
window.gameManager = gameManager;
window.userAccount = null;

// Инициализация музыки
let musicEnabled = false;
const bgMusic = document.getElementById('bg-music');

function updateMusicButton() {
  const btn = document.getElementById('menu-music-toggle');
  if (btn) {
    btn.textContent = musicEnabled ? 'Music: ON' : 'Music: OFF';
  }
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  try {
    if (musicEnabled) {
      if (bgMusic) {
        bgMusic.volume = 0.45;
        bgMusic.play().catch(() => {});
      }
    } else {
      if (bgMusic) bgMusic.pause();
    }
  } catch (e) {
    // silent
  }
  updateMusicButton();
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  // Создаем главное меню
  const mainMenuContainer = document.getElementById('main-menu');
  const mainMenu = new MainMenu(mainMenuContainer);
  
  // Создаем контейнер для игр
  const gameContainer = document.getElementById('game-arena-container');
  
  // Инициализируем GameManager
  gameManager.init(gameContainer, mainMenuContainer);
  
  // Регистрируем игры
  const frostClickGame = new FrostClickGame();
  gameManager.registerGame(frostClickGame);
  
  // Настройка музыки
  const musicBtn = document.getElementById('menu-music-toggle');
  if (musicBtn) {
    musicBtn.addEventListener('click', toggleMusic);
  }
  updateMusicButton();
  
  // Инициализация Web3
  initWeb3();
  setupWeb3Buttons();
  
  // Экспорт функций для глобального доступа
  window.submitScore = async (score) => {
    const { submitScore } = await import('./web3.js');
    return await submitScore(score);
  };
  
  window.showLeaderboard = async () => {
    const { showLeaderboard } = await import('./web3.js');
    return await showLeaderboard();
  };
  
  window.handleConnectWallet = async () => {
    const { handleConnectWallet } = await import('./web3.js');
    return await handleConnectWallet();
  };
  
  // Показываем главное меню
  gameManager.showMainMenu();
  
  console.log('🎮 Game Arena initialized!');
});


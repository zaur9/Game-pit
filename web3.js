/**
 * web3.js - интеграция с блокчейном
 * Адаптировано для новой архитектуры Game Arena
 */
import { CONFIG } from './config.js';
import { eventBus } from './core/EventBus.js';

let web3 = null;
let contract = null;

// ABI контракта
const contractABI = [
  {
    "inputs": [
      { "internalType": "uint32", "name": "score_", "type": "uint32" },
      { "internalType": "uint32", "name": "timestamp_", "type": "uint32" },
      { "internalType": "uint8", "name": "v", "type": "uint8" },
      { "internalType": "bytes32", "name": "r", "type": "bytes32" },
      { "internalType": "bytes32", "name": "s", "type": "bytes32" }
    ],
    "name": "submitScoreSigned",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLeaderboard",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "player", "type": "address" },
          { "internalType": "uint32", "name": "score", "type": "uint32" },
          { "internalType": "uint32", "name": "timestamp", "type": "uint32" }
        ],
        "internalType": "struct FrostClickLeaderboard.ScoreEntry[100]",
        "name": "",
        "type": "tuple[100]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "indexPlusOne",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "leaderboard",
    "outputs": [
      { "internalType": "address", "name": "player", "type": "address" },
      { "internalType": "uint32", "name": "score", "type": "uint32" },
      { "internalType": "uint32", "name": "timestamp", "type": "uint32" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "entriesCount",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_SCORE",
    "outputs": [
      { "internalType": "uint32", "name": "", "type": "uint32" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "", "type": "bytes32" }
    ],
    "name": "usedMessages",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Установка аккаунта пользователя
 */
export function setUserAccount(addr) {
  window.userAccount = addr;
  eventBus.emit('web3:accountChanged', { account: addr });
  
  // Обновляем PB для текущей игры
  const currentGame = window.gameManager?.getCurrentGame();
  if (currentGame && currentGame.updatePersonalBest) {
    currentGame.updatePersonalBest();
  }
}

/**
 * Инициализация Web3
 */
export async function initWeb3() {
  if (typeof window.ethereum === 'undefined') {
    console.warn('Please install MetaMask or Somnia Wallet!');
    return false;
  }

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });

    if (parseInt(chainId, 16) !== CONFIG.SOMNIA_CHAIN_ID) {
      console.warn('Please switch to Somnia Mainnet (5031)');
      return false;
    }

    web3 = new Web3(window.ethereum);

    try {
      contract = new web3.eth.Contract(contractABI, CONFIG.CONTRACT_ADDRESS);
      window.contract = contract;
    } catch (e) {
      console.error('Contract init failed', e);
      contract = null;
      window.contract = null;
    }

    // Обработка изменений аккаунта/сети
    ethereum.on('accountsChanged', (accounts) => {
      const addr = (accounts && accounts.length) ? accounts[0] : null;
      setUserAccount(addr);
      updateWeb3Buttons();
    });

    ethereum.on('chainChanged', () => {
      contract = null;
      window.contract = null;
      setUserAccount(null);
      updateWeb3Buttons();
    });

    return true;
  } catch (err) {
    console.error('Web3 init error:', err);
    return false;
  }
}

/**
 * Подключение кошелька
 */
export async function handleConnectWallet() {
  const ready = await initWeb3();
  if (!ready) {
    alert('Please install MetaMask or Somnia Wallet and switch to Somnia Mainnet (5031)');
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    const account = accounts[0];
    setUserAccount(account);

    if (!contract) {
      try {
        contract = new web3.eth.Contract(contractABI, CONFIG.CONTRACT_ADDRESS);
        window.contract = contract;
      } catch (e) {
        console.error('Contract init failed', e);
        contract = null;
        window.contract = null;
      }
    }

    updateWeb3Buttons();
  } catch (error) {
    console.error('Connect wallet error:', error);
    if (error.code === 4001) {
      alert('Please connect your wallet');
    }
  }
}

/**
 * Отправка счета
 */
export async function submitScore(score) {
  if (!contract) {
    alert('Connect wallet first');
    return false;
  }

  if (score <= 0) {
    alert('Score must be > 0');
    return false;
  }

  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  const account = accounts[0];

  if (!account) {
    alert('Please connect wallet first');
    return false;
  }

  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (parseInt(chainId, 16) !== CONFIG.SOMNIA_CHAIN_ID) {
    alert('Wrong chain, switch to Somnia Mainnet');
    return false;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const messageHash = web3.utils.soliditySha3(
      { t: 'address', v: account },
      { t: 'uint32', v: score },
      { t: 'uint32', v: timestamp },
      { t: 'address', v: CONFIG.CONTRACT_ADDRESS },
      { t: 'uint256', v: CONFIG.SOMNIA_CHAIN_ID }
    );

    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [messageHash, account]
    });

    const sig = signature.startsWith("0x") ? signature.slice(2) : signature;

    const r = "0x" + sig.slice(0, 64);
    const s = "0x" + sig.slice(64, 128);
    let v = parseInt(sig.slice(128, 130), 16);
    if (v < 27) v += 27;

    await contract.methods.submitScoreSigned(score, timestamp, v, r, s)
      .send({ from: account });

    alert("Score submitted!");
    return true;
  } catch (err) {
    console.error('Submit score error:', err);
    if (err.message) {
      alert(`Error: ${err.message}`);
    } else {
      alert("Error submitting score");
  }
    return false;
  }
}

/**
 * Показать лидерборд
 */
export async function showLeaderboard() {
  if (!contract) {
    alert('Connect wallet first');
    return;
  }

  const prevModal = document.getElementById('leaderboard-modal');
  if (prevModal) prevModal.remove();

  try {
    const leaderboard = await contract.methods.getLeaderboard().call();

    const top50 = leaderboard
      .filter(e => e.player !== '0x0000000000000000000000000000000000000000' && Number(e.score) > 0)
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 50);

    let html = '<h3>Frost Click Top 50</h3><ol>';

    if (top50.length === 0) {
      html += '<li>No scores yet</li>';
    } else {
      for (let e of top50) {
        const addr = e.player.slice(0, 6) + '...' + e.player.slice(-4);
        html += `<li>${addr}: ${e.score}</li>`;
      }
    }

    html += `</ol><button id="close-lb" class="fc-btn">Close</button>`;

    const modal = document.createElement('div');
    modal.id = 'leaderboard-modal';
    modal.innerHTML = html;
    document.body.appendChild(modal);

    document.getElementById('close-lb').onclick = () => modal.remove();
  } catch (err) {
    console.error('Leaderboard error:', err);
    alert('Error fetching leaderboard');
  }
}

/**
 * Обновление кнопок Web3
 */
function updateWeb3Buttons() {
  const connectBtn = document.getElementById('menu-connect-wallet');
  const leaderboardBtn = document.getElementById('menu-show-leaderboard');

  if (window.userAccount) {
    if (connectBtn) {
      connectBtn.textContent = window.userAccount.slice(0, 6) + '...' + window.userAccount.slice(-4);
    }
    if (leaderboardBtn) {
      leaderboardBtn.style.display = 'block';
    }
  } else {
    if (connectBtn) {
      connectBtn.textContent = 'Connect Wallet';
    }
    if (leaderboardBtn) {
      leaderboardBtn.style.display = 'block'; // Всегда показываем, но может быть неактивна
    }
  }
}

/**
 * Настройка кнопок Web3 в меню
 */
export function setupWeb3Buttons() {
  const connectBtn = document.getElementById('menu-connect-wallet');
  const leaderboardBtn = document.getElementById('menu-show-leaderboard');

  if (connectBtn) {
    connectBtn.addEventListener('click', handleConnectWallet);
  }

  if (leaderboardBtn) {
    leaderboardBtn.addEventListener('click', showLeaderboard);
  }

  // Подписка на события для обновления кнопок
  eventBus.on('web3:accountChanged', () => {
    updateWeb3Buttons();
  });

  // Подписка на события игры для отправки счета
  eventBus.on('game:score:submit', async (data) => {
    if (data.gameId === 'frost-click' && data.score) {
      await submitScore(data.score);
    }
  });

  updateWeb3Buttons();
}

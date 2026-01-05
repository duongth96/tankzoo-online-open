import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import MainScene from './scenes/MainScene';
import { socketClient } from './utils/socket';

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    parent: 'game-container',
    scene: [PreloadScene, MainScene]
};

// UI Logic
const loginOverlay = document.getElementById('loginOverlay');
const nameInput = document.getElementById('playerNameInput');
const startBtn = document.getElementById('startButton');
const randomBtn = document.getElementById('randomNameBtn');

// Load saved name
const savedName = localStorage.getItem('tank_playerName');
if (savedName) {
    nameInput.value = savedName;
}

function generateRandomName() {
    const adjectives = ['Mạnh Mẽ', 'Nhanh Nhẹn', 'Dũng Cảm', 'Siêu Đẳng', 'Bất Bại', 'Vui Vẻ', 'Ngầu Lòi', 'Huyền Thoại', 'Bá Đạo'];
    const nouns = ['Tank', 'Chiến Binh', 'Xạ Thủ', 'Đại Bàng', 'Hổ Báo', 'Rồng', 'Sói', 'Sư Tử', 'Gấu'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj} ${noun} ${num}`;
}

if (randomBtn) {
    randomBtn.addEventListener('click', () => {
        nameInput.value = generateRandomName();
    });
}

function startGame() {
    let name = nameInput.value.trim();
    if (!name) {
        name = generateRandomName();
    }
    
    // Save name
    localStorage.setItem('tank_playerName', name);

    loginOverlay.style.display = 'none';
    
    // Connect Socket
    socketClient.connect(name);
    
    // Start Game
    new Phaser.Game(config);
}

if (startBtn) {
    startBtn.addEventListener('click', startGame);
}

if (nameInput) {
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startGame();
    });
}

// Leaderboard Event Listener
window.addEventListener('updateLeaderboard', (e) => {
    const players = e.detail;
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    
    const sortedPlayers = Object.values(players).sort((a, b) => {
        return (b.score || 0) - (a.score || 0);
    });
    
    const topPlayers = sortedPlayers.slice(0, 5);
    
    leaderboardList.innerHTML = topPlayers.map((player, index) => {
        return `<li><span>${index + 1}. ${player.name}</span><span>${player.score || 0}</span></li>`;
    }).join('');
});

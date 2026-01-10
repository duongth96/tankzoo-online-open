import Phaser from 'phaser';
import PreloadScene from './scenes/PreloadScene';
import MainScene from './scenes/MainScene';
import UIScene from './scenes/UIScene';
import { socketClient } from './utils/socket';
import { GameConfig } from './config';

    // Check for mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Set resolution based on device
    // Desktop: Full HD (1920x1080)
    // Mobile: HD+ (1600x720) or similar landscape aspect ratio that fits modern phones well
    // Actually, for mobile performance and text readability, HD (1280x720) is often safer, 
    // but 1600x720 is good for wide screens. Let's stick to a solid baseline.
    const width = isMobile ? 1600 : 1920;
    const height = isMobile ? 720 : 1080;

    const config = {
    type: Phaser.AUTO,
    width: width,
    height: height,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        fullscreenTarget: 'fullscreen-wrapper',
        width: width, 
        height: height, 
    },
    render: {
        antialias: true,
        mipmapFilter: 'LINEAR_MIPMAP_LINEAR', // Giúp giảm răng cưa khi scale nhỏ
    },
     // Quan trọng: Tận dụng độ sắc nét của màn hình điện thoại
    pixelArt: false, // Để true nếu là game pixel
    antialias: true, // Bật chống răng cưa cho game đồ họa mượt
    roundPixels: true, // Tránh vật thể nằm giữa các pixel gây nhòe

    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    parent: 'game-container',
    scene: [PreloadScene, MainScene, UIScene]
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

function fetchAvailableMaps() {
    fetch(`${GameConfig.SERVER_URL}/api/maps`)
        .then(res => res.json())
        .then(maps => {
            console.log('Available maps:', maps);
            window.availableMaps = maps;
        })
        .catch(err => console.error('Failed to fetch maps:', err));
}

// Fetch available maps when the game starts
fetchAvailableMaps();

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
        return `<li><span>${index + 1}. ${player.name}</span>&nbsp;&nbsp;<span class="score">${player.score || 0}</span></li>`;
    }).join('');
});

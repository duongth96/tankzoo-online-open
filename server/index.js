const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameManager = require('./src/managers/GameManager');
const setupSocket = require('./src/socket/SocketHandler');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    allowEIO3: true
});

// Serve static files
// Priority 1: Check for new game client build (game/dist)
// Priority 2: Fallback to old public folder (public)
const GAME_DIST_PATH = path.join(__dirname, '../game/dist');
const PUBLIC_PATH = path.join(__dirname, '../public');

// Check if game/dist exists
const fs = require('fs');
if (fs.existsSync(GAME_DIST_PATH)) {
    console.log('Serving game client from game/dist');
    app.use(express.static(GAME_DIST_PATH));
    app.get('/', (req, res) => {
        res.sendFile(path.join(GAME_DIST_PATH, 'index.html'));
    });
} else {
    console.log('Serving legacy client from public');
    app.use(express.static(PUBLIC_PATH));
    app.get('/', (req, res) => {
        res.sendFile(path.join(PUBLIC_PATH, 'index.html'));
    });
}

// Initialize Game
const gameManager = new GameManager(io);
gameManager.start();

// Setup Socket
setupSocket(io, gameManager);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RoomManager = require('./src/managers/RoomManager');
const MapManager = require('./src/managers/MapManager');
const setupSocket = require('./src/socket/SocketHandler');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    allowEIO3: true
});

// Independent Server Mode
// The server only handles Socket.IO connections and API requests.
// Static files are served by the Client project (Vite) or a separate web server.

// Global MapManager for API (independent of rooms for listing)
const globalMapManager = new MapManager();

app.get('/api/maps', (req, res) => {
    res.json(globalMapManager.getAvailableMaps());
});

app.get('/', (req, res) => {
    let totalPlayers = 0;
    // Calculate total players across all rooms
    if (roomManager && roomManager.rooms) {
        Object.values(roomManager.rooms).forEach(room => {
            totalPlayers += room.players.size;
        });
    }

    res.send({
        status: 'online',
        message: 'Tank Dien Server is running',
        players: totalPlayers,
        rooms: roomManager ? Object.keys(roomManager.rooms).length : 0
    });
});

// Initialize Room Manager
const roomManager = new RoomManager(io);

// Setup Socket
setupSocket(io, roomManager);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    let localIp = 'localhost';

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                localIp = net.address;
                break;
            }
        }
    }
    console.log(`Server is running on:`);
    console.log(`- Local:   http://localhost:${PORT}`);
    console.log(`- Network: http://${localIp}:${PORT}`);
});

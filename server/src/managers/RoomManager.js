const GameManager = require('./GameManager');
const { randomUUID } = require('crypto');

class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = {}; // { roomId: { gameManager, type, players: Set } }
        this.MAX_PLAYERS = 10;
        this.socketRoomMap = {}; // { socketId: roomId }
    }

    findOrCreateRoom(deviceType) {
        // 1. Try to find an available room for this device type
        for (const roomId in this.rooms) {
            const room = this.rooms[roomId];
            if (room.type === deviceType && room.players.size < this.MAX_PLAYERS) {
                return roomId;
            }
        }

        // 2. Create new room if none available
        return this.createRoom(deviceType);
    }

    createRoom(deviceType) {
        const roomId = randomUUID();
        console.log(`Creating new room ${roomId} for ${deviceType}`);
        
        const gameManager = new GameManager(this.io, roomId);
        gameManager.start();

        this.rooms[roomId] = {
            id: roomId,
            gameManager: gameManager,
            type: deviceType,
            players: new Set()
        };

        return roomId;
    }

    addPlayerToRoom(socket, roomId) {
        if (!this.rooms[roomId]) return false;

        const room = this.rooms[roomId];
        room.players.add(socket.id);
        this.socketRoomMap[socket.id] = roomId;
        
        socket.join(roomId);
        return room.gameManager;
    }

    removePlayer(socket) {
        const roomId = this.socketRoomMap[socket.id];
        if (roomId && this.rooms[roomId]) {
            const room = this.rooms[roomId];
            room.players.delete(socket.id);
            delete this.socketRoomMap[socket.id];

            // Remove player from game logic
            room.gameManager.playerManager.removePlayer(socket.id);

            // Cleanup empty room
            if (room.players.size === 0) {
                this.destroyRoom(roomId);
            }
        }
    }

    destroyRoom(roomId) {
        console.log(`Destroying empty room ${roomId}`);
        if (this.rooms[roomId]) {
            this.rooms[roomId].gameManager.stop(); // Ensure GameManager has a stop method
            delete this.rooms[roomId];
        }
    }

    getGameManager(socketId) {
        const roomId = this.socketRoomMap[socketId];
        if (roomId && this.rooms[roomId]) {
            return this.rooms[roomId].gameManager;
        }
        return null;
    }
}

module.exports = RoomManager;

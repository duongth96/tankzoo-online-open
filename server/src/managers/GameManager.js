const ObstacleManager = require('./ObstacleManager');
const PowerUpManager = require('./PowerUpManager');
const PlayerManager = require('./PlayerManager');
const MapManager = require('./MapManager');
const { loadProtobufs } = require('../utils/protobufLoader');

class GameManager {
    constructor(io, roomId) {
        this.io = io;
        this.roomId = roomId;
        this.mapManager = new MapManager();
        this.obstacleManager = new ObstacleManager(io, roomId);
        this.powerUpManager = new PowerUpManager(io, this.obstacleManager, roomId);
        this.playerManager = new PlayerManager(io, this, roomId);
    }

    async start() {
        try {
            // Start Spawner immediately so powerups are ready for initial sync
            this.powerUpManager.startSpawner(() => Object.keys(this.playerManager.getPlayers()).length);
            
            await loadProtobufs();
            console.log(`Game Manager Started for Room: ${this.roomId}`);
        } catch (error) {
            console.error("Failed to start Game Manager:", error);
        }
    }

    stop() {
        if (this.powerUpManager) {
            this.powerUpManager.stopSpawner();
        }
    }
}

module.exports = GameManager;

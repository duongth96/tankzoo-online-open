const ObstacleManager = require('./ObstacleManager');
const PowerUpManager = require('./PowerUpManager');
const PlayerManager = require('./PlayerManager');
const { loadProtobufs } = require('../utils/protobufLoader');

class GameManager {
    constructor(io) {
        this.io = io;
        this.obstacleManager = new ObstacleManager(io);
        this.powerUpManager = new PowerUpManager(io, this.obstacleManager);
        this.playerManager = new PlayerManager(io, this);
    }

    async start() {
        try {
            await loadProtobufs();
            this.powerUpManager.startSpawner(() => Object.keys(this.playerManager.getPlayers()).length);
            console.log("Game Manager Started");
        } catch (error) {
            console.error("Failed to start Game Manager:", error);
        }
    }
}

module.exports = GameManager;

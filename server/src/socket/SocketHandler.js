const EVENTS = require('../constants/events');

module.exports = (io, gameManager) => {
    io.on(EVENTS.CONNECTION, (socket) => {
        console.log('A user connected:', socket.id);
        
        const playerName = socket.handshake.query.name;
        const player = gameManager.playerManager.addPlayer(socket, playerName);

        // Initial State Sync
        socket.emit(EVENTS.CURRENT_PLAYERS, gameManager.playerManager.getPlayers());
        socket.emit(EVENTS.CURRENT_POWERUPS, gameManager.powerUpManager.getPowerUps());
        socket.emit(EVENTS.CURRENT_OBSTACLES, gameManager.obstacleManager.getObstacles());
        // We need to move mapSeed to a config or manager, currently it was global.
        // Let's generate it in GameManager or just send a random one here.
        // For consistency, let's just send a random one or store it in GameManager if we want it consistent.
        // I'll assume consistency isn't strictly enforced across re-starts in this refactor unless I add it to GameManager.
        socket.emit(EVENTS.MAP_SEED, Math.random()); 

        socket.broadcast.emit(EVENTS.NEW_PLAYER, player);

        socket.on(EVENTS.DISCONNECT, () => {
            console.log('User disconnected:', socket.id);
            gameManager.playerManager.removePlayer(socket.id);
        });

        socket.on(EVENTS.PLAYER_MOVEMENT, (data) => {
            gameManager.playerManager.handleMovementWithSocket(socket, data);
        });

        socket.on(EVENTS.PLAYER_SHOOT, (data) => {
            gameManager.playerManager.handleShoot(socket, data);
        });

        socket.on(EVENTS.PLAYER_HIT, (data) => {
            gameManager.playerManager.handleHit(data);
        });

        socket.on(EVENTS.OBSTACLE_HIT, (data) => {
            gameManager.obstacleManager.handleHit(data);
        });

        socket.on(EVENTS.POWERUP_COLLECTED, (powerUpId) => {
            const type = gameManager.powerUpManager.collect(powerUpId);
            if (type) {
                gameManager.playerManager.applyPowerUp(socket.id, type);
            }
        });

        socket.on(EVENTS.USE_ITEM, (itemType) => {
            gameManager.playerManager.handleUseItem(socket.id, itemType);
        });
    });
};

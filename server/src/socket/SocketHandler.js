const EVENTS = require('../constants/events');

module.exports = (io, roomManager) => {
    io.on(EVENTS.CONNECTION, (socket) => {
        console.log('A user connected:', socket.id);

        // Device Detection
        let deviceType = socket.handshake.query.deviceType;
        if (!deviceType) {
            const userAgent = socket.handshake.headers['user-agent'] || '';
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            deviceType = isMobile ? 'mobile' : 'pc';
        }
        console.log(`User ${socket.id} detected as ${deviceType}`);

        // Find or Create Room
        const roomId = roomManager.findOrCreateRoom(deviceType);
        const gameManager = roomManager.addPlayerToRoom(socket, roomId);

        if (!gameManager) {
            console.error('Failed to join room');
            socket.disconnect();
            return;
        }

        const playerName = socket.handshake.query.name;
        const player = gameManager.playerManager.addPlayer(socket, playerName);

        // Initial State Sync
        socket.emit(EVENTS.CURRENT_PLAYERS, gameManager.playerManager.getPlayers());
        socket.emit(EVENTS.CURRENT_POWERUPS, gameManager.powerUpManager.getPowerUps());
        socket.emit(EVENTS.CURRENT_OBSTACLES, gameManager.obstacleManager.getObstacles());
        
        // Use MapManager to get the consistent map seed
        socket.emit(EVENTS.MAP_SEED, gameManager.mapManager.getMapSeed());

        // Notify room members
        socket.to(roomId).emit(EVENTS.NEW_PLAYER, player);

        socket.on(EVENTS.DISCONNECT, () => {
            console.log('User disconnected:', socket.id);
            roomManager.removePlayer(socket);
        });

        socket.on(EVENTS.PLAYER_MOVEMENT, (data) => {
            // Re-fetch gameManager in case of room change? 
            // Usually not needed if socket stays in same room scope.
            // But let's assume gameManager reference is stable for the session.
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
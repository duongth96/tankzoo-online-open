module.exports = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    
    // Player Events
    NEW_PLAYER: 'newPlayer',
    CURRENT_PLAYERS: 'currentPlayers',
    PLAYER_MOVEMENT: 'playerMovement',
    PLAYER_MOVED: 'playerMoved',
    PLAYER_SHOOT: 'playerShoot',
    BULLET_FIRED: 'bulletFired',
    PLAYER_HIT: 'playerHit',
    PLAYER_DIED: 'playerDied',
    PLAYER_RESPAWNED: 'playerRespawned',
    PLAYER_HEALTH_UPDATE: 'playerHealthUpdate',
    PLAYER_ALPHA_CHANGED: 'playerAlphaChanged',
    SCORE_UPDATE: 'scoreUpdate',
    DISCONNECT_PLAYER: 'disconnectPlayer',
    
    // Obstacle Events
    CURRENT_OBSTACLES: 'currentObstacles',
    OBSTACLE_HIT: 'obstacleHit',
    OBSTACLE_REMOVED: 'obstacleRemoved',
    OBSTACLE_HEALTH_UPDATE: 'obstacleHealthUpdate',
    
    // PowerUp Events
    CURRENT_POWERUPS: 'currentPowerUps',
    POWERUP_SPAWNED: 'powerUpSpawned',
    POWERUP_COLLECTED: 'powerUpCollected',
    POWERUP_REMOVED: 'powerUpRemoved',
    APPLY_POWERUP: 'applyPowerUp',
    REMOVE_POWERUP_EFFECT: 'removePowerUpEffect',
    
    // Inventory/Item Events
    INVENTORY_UPDATE: 'inventoryUpdate',
    USE_ITEM: 'useItem',
    MISSILE_FIRED: 'missileFired',
    BOMB_DROPPED: 'bombDropped',
    BOMB_EXPLODED: 'bombExploded',
    
    // Game Config
    MAP_SEED: 'mapSeed'
};

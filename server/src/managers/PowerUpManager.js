const { 
    MAP_WIDTH, MAP_HEIGHT, MAX_POWERUPS_PER_PLAYER, 
    MIN_POWERUPS, MAX_POWERUPS, POWERUP_SPAWN_INTERVAL, POWERUP_DURATION 
} = require('../constants/gameConfig');
const EVENTS = require('../constants/events');

class PowerUpManager {
    constructor(io, obstacleManager) {
        this.io = io;
        this.obstacleManager = obstacleManager;
        this.powerUps = {};
        this.powerUpTypes = ['invisible', 'multiShot', 'speed', 'damage', 'health', 'missile', 'bomb'];
        this.interval = null;
    }

    startSpawner(playerCountFn) {
        console.log('Starting PowerUp Spawner...');
        
        // Initial fill
        this.fillPowerUps(playerCountFn());

        this.interval = setInterval(() => {
            try {
                this.spawnRoutine(playerCountFn());
            } catch (err) {
                console.error('Error in PowerUp Spawner:', err);
            }
        }, POWERUP_SPAWN_INTERVAL);
    }

    stopSpawner() {
        if (this.interval) clearInterval(this.interval);
    }

    getMaxPowerUps(playerCount) {
        return Math.max(MIN_POWERUPS, Math.min(MAX_POWERUPS, playerCount * MAX_POWERUPS_PER_PLAYER));
    }

    spawnRoutine(playerCount) {
        const maxPowerUps = this.getMaxPowerUps(playerCount);
        const currentCount = Object.keys(this.powerUps).length;

        if (currentCount < maxPowerUps) {
            const needed = maxPowerUps - currentCount;
            const spawnBatch = Math.min(needed, 5);
            
            for (let i = 0; i < spawnBatch; i++) {
                this.spawnPowerUp();
            }
        }
    }

    fillPowerUps(playerCount) {
        const max = this.getMaxPowerUps(playerCount);
        const current = Object.keys(this.powerUps).length;
        if (current < max) {
            const needed = max - current;
            console.log(`Initial powerup fill: spawning ${needed} items.`);
            for(let i=0; i<needed; i++) this.spawnPowerUp();
        }
    }

    spawnPowerUp() {
        const maxPowerUps = MAX_POWERUPS; // Global max safety
        if (Object.keys(this.powerUps).length >= maxPowerUps) return;

        const id = Math.random().toString(36).substr(2, 9);
        let position = this.findValidPosition();

        this.powerUps[id] = {
            id: id,
            x: position.x,
            y: position.y,
            type: this.powerUpTypes[Math.floor(Math.random() * this.powerUpTypes.length)]
        };

        this.io.emit(EVENTS.POWERUP_SPAWNED, this.powerUps[id]);
    }

    findValidPosition() {
        let x, y;
        let attempts = 0;
        let validPosition = false;
        const obstacles = this.obstacleManager.getObstacles();

        while (!validPosition && attempts < 10) {
            x = Math.floor(Math.random() * (MAP_WIDTH - 100)) + 50;
            y = Math.floor(Math.random() * (MAP_HEIGHT - 100)) + 50;
            validPosition = true;

            for (const obsId in obstacles) {
                const obs = obstacles[obsId];
                const dist = Math.sqrt((x - obs.x) ** 2 + (y - obs.y) ** 2);
                if (dist < 80) {
                    validPosition = false;
                    break;
                }
            }
            attempts++;
        }

        if (!validPosition) {
            x = Math.floor(Math.random() * (MAP_WIDTH - 100)) + 50;
            y = Math.floor(Math.random() * (MAP_HEIGHT - 100)) + 50;
        }

        return { x, y };
    }

    collect(powerUpId) {
        if (this.powerUps[powerUpId]) {
            const type = this.powerUps[powerUpId].type;
            delete this.powerUps[powerUpId];
            this.io.emit(EVENTS.POWERUP_REMOVED, powerUpId);
            return type;
        }
        return null;
    }

    getPowerUps() {
        return this.powerUps;
    }
}

module.exports = PowerUpManager;

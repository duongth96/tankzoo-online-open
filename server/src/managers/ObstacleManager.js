const { OBSTACLE_COUNT, MAP_WIDTH, MAP_HEIGHT } = require('../constants/gameConfig');
const EVENTS = require('../constants/events');

class ObstacleManager {
    constructor(io) {
        this.io = io;
        this.obstacles = {};
        this.obstacleVariants = {
            hard: ['box', 'wall_h', 'wall_v', 'corner'],
            soft: ['box', 'bush', 'barrel']
        };
        this.init();
    }

    init() {
        const generated = this.generateObstacles(OBSTACLE_COUNT);
        generated.forEach(obs => {
            this.obstacles[obs.id] = obs;
        });
    }

    generateObstacles(count) {
        const generated = [];
        for (let i = 0; i < count; i++) {
            const type = Math.random() > 0.4 ? 'hard' : 'soft';
            const variants = this.obstacleVariants[type];
            const variant = variants[Math.floor(Math.random() * variants.length)];

            // Simple random position
            const x = Math.floor(Math.random() * (MAP_WIDTH - 200)) + 100;
            const y = Math.floor(Math.random() * (MAP_HEIGHT - 200)) + 100;

            const obstacle = {
                id: `obs_${i}`,
                x: x,
                y: y,
                type: type,
                variant: variant
            };

            if (type === 'soft') {
                obstacle.health = 100;
            }

            generated.push(obstacle);
        }
        return generated;
    }

    getObstacles() {
        return this.obstacles;
    }

    handleHit(data) {
        const { obstacleId, damage } = data;
        if (this.obstacles[obstacleId] && this.obstacles[obstacleId].type === 'soft') {
            this.obstacles[obstacleId].health -= damage;
            if (this.obstacles[obstacleId].health <= 0) {
                delete this.obstacles[obstacleId];
                this.io.emit(EVENTS.OBSTACLE_REMOVED, obstacleId);
            } else {
                this.io.emit(EVENTS.OBSTACLE_HEALTH_UPDATE, {
                    id: obstacleId,
                    health: this.obstacles[obstacleId].health
                });
            }
        }
    }
}

module.exports = ObstacleManager;

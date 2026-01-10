export default class ClientObstacleManager {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = this.scene.physics.add.staticGroup();
        this.obstacleMap = {};
    }

    displayObstacle(obs) {
        if (this.obstacleMap[obs.id]) return;

        let texture = '';
        if (obs.type === 'hard') {
            if (obs.variant === 'box') texture = 'obstacle_hard_box';
            else if (obs.variant === 'wall_h') texture = 'obstacle_hard_wall_h';
            else if (obs.variant === 'wall_v') texture = 'obstacle_hard_wall_v';
            else if (obs.variant === 'corner') texture = 'obstacle_hard_corner';
        } else {
            if (obs.variant === 'box') texture = 'obstacle_soft_box';
            else if (obs.variant === 'bush') texture = 'obstacle_soft_bush';
            else if (obs.variant === 'barrel') texture = 'obstacle_soft_barrel';
        }

        const obstacle = this.obstacles.create(obs.x, obs.y, texture);
        obstacle.id = obs.id;
        obstacle.obstacleType = obs.type;
        obstacle.setDepth(2);

        if (obs.type === 'soft') {
            obstacle.maxHealth = 100;
            obstacle.currentHealth = obs.health !== undefined ? obs.health : 100;
            
            // Set initial alpha
            if (obstacle.currentHealth < obstacle.maxHealth) {
                 const alpha = Math.max(0.2, obstacle.currentHealth / obstacle.maxHealth);
                 obstacle.setAlpha(alpha);
             }
         }
         
         obstacle.refreshBody();

         // Shadow
        const shadow = this.scene.add.sprite(obs.x + 5, obs.y + 5, 'shadow');
        shadow.setDepth(1);
        shadow.scaleX = obstacle.width / 40;
        shadow.scaleY = obstacle.height / 40;
        
        this.obstacleMap[obs.id] = { sprite: obstacle, shadow: shadow };
    }

    removeObstacle(id) {
        const obs = this.obstacleMap[id];
        if (obs) {
            if (obs.shadow) obs.shadow.destroy();
            if (obs.sprite) obs.sprite.destroy();
            delete this.obstacleMap[id];
        }
    }

    updateObstacleHealth(id, health) {
        const obs = this.obstacleMap[id];
        console.log('ClientObstacleManager updateHealth:', id, health, obs ? 'found' : 'not found');
        if (obs && obs.sprite && obs.sprite.obstacleType === 'soft') {
            obs.sprite.currentHealth = health;
            const alpha = Math.max(0.2, health / obs.sprite.maxHealth);
            obs.sprite.setAlpha(alpha);
        }
    }

    getGroup() {
        return this.obstacles;
    }
}

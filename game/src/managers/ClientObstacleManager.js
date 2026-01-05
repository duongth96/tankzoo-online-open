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
        obstacle.setDepth(2);
        
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

    getGroup() {
        return this.obstacles;
    }
}

export default class ClientPowerUpManager {
    constructor(scene) {
        this.scene = scene;
        this.powerUps = this.scene.physics.add.group();
        this.powerUpMap = {};
    }

    displayPowerUp(info) {
        if (this.powerUpMap[info.id]) return;

        const texture = `powerup_${info.type}`;
        const p = this.powerUps.create(info.x, info.y, texture);
        p.id = info.id;
        p.type = info.type;
        p.setDepth(2);
        
        const shadow = this.scene.add.sprite(info.x + 3, info.y + 3, 'shadow');
        shadow.setScale(0.5);
        shadow.setDepth(1);
        
        this.powerUpMap[info.id] = { sprite: p, shadow: shadow };
        
        // Floating animation
        this.scene.tweens.add({
            targets: p,
            y: info.y - 5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    removePowerUp(id) {
        const p = this.powerUpMap[id];
        if (p) {
            if (p.shadow) p.shadow.destroy();
            if (p.sprite) p.sprite.destroy();
            delete this.powerUpMap[id];
        }
    }

    getGroup() {
        return this.powerUps;
    }
}

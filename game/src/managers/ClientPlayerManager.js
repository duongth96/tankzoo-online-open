export default class ClientPlayerManager {
    constructor(scene) {
        this.scene = scene;
        this.players = {}; // Stores Phaser objects and data: { sprite, turret, shadow, nameText, healthBar, ... }
    }

    addPlayer(playerInfo, isLocal = false) {
        const x = playerInfo.x;
        const y = playerInfo.y;
        
        // Body
        const tank = this.scene.physics.add.sprite(x, y, 'tankBody');
        tank.setTint(playerInfo.color);
        tank.setDepth(2);
        tank.playerId = playerInfo.playerId;
        tank.playerColor = playerInfo.color;
        
        // Shadow
        const shadow = this.scene.add.sprite(x + 5, y + 5, 'shadow');
        shadow.setDepth(1);

        // Turret
        const turret = this.scene.add.sprite(x, y, 'tankTurret');
        turret.setDepth(3);

        // Name
        const nameText = this.scene.add.text(x, y - 40, playerInfo.name, { 
            fontSize: '16px', 
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        nameText.setDepth(10);

        // Health Bar
        const healthBar = this.scene.add.graphics();
        this.updateHealthBar(healthBar, playerInfo.health, x, y);

        const playerData = {
            tank,
            shadow,
            turret,
            nameText,
            healthBar,
            id: playerInfo.playerId,
            isLocal,
            health: playerInfo.health
        };

        if (isLocal) {
            tank.setCollideWorldBounds(true);
            this.scene.cameras.main.startFollow(tank);
            this.localPlayer = playerData;
        }

        this.players[playerInfo.playerId] = playerData;
        return playerData;
    }

    removePlayer(playerId) {
        const player = this.players[playerId];
        if (player) {
            if (player.shadow) player.shadow.destroy();
            if (player.turret) player.turret.destroy();
            if (player.healthBar) player.healthBar.destroy();
            if (player.nameText) player.nameText.destroy();
            if (player.tank) player.tank.destroy();
            delete this.players[playerId];
        }
    }

    updatePlayerPosition(playerId, data) {
        const player = this.players[playerId];
        if (player && player.tank) {
            player.tank.setRotation(data.rotation);
            player.tank.setPosition(data.x, data.y);
            
            if (player.shadow) player.shadow.setPosition(data.x + 5, data.y + 5);
            
            if (player.turret) {
                player.turret.setPosition(data.x, data.y);
                player.turret.setRotation(data.turretRotation);
            }
            
            if (player.nameText) player.nameText.setPosition(data.x, data.y - 40);
            
            if (player.healthBar) {
                this.updateHealthBar(player.healthBar, player.health, data.x, data.y);
            }
        }
    }

    updateHealth(playerId, health) {
        const player = this.players[playerId];
        if (player) {
            player.health = health;
            if (player.tank) {
                this.updateHealthBar(player.healthBar, health, player.tank.x, player.tank.y);
            }
        }
    }

    updateHealthBar(graphics, health, x, y) {
        if (!graphics) return;
        graphics.clear();
        graphics.fillStyle(0xff0000);
        graphics.fillRect(x - 20, y - 30, 40, 5);
        graphics.fillStyle(0x00ff00);
        graphics.fillRect(x - 20, y - 30, 40 * (health / 100), 5);
    }

    handleDeath(playerId) {
        const player = this.players[playerId];
        if (player) {
            this.setVisible(playerId, false);
        }
    }

    handleRespawn(playerInfo) {
        const player = this.players[playerInfo.playerId];
        if (player) {
            this.setVisible(playerInfo.playerId, true);
            this.updatePlayerPosition(playerInfo.playerId, playerInfo);
            this.updateHealth(playerInfo.playerId, playerInfo.health);
        }
    }

    setVisible(playerId, visible) {
        const player = this.players[playerId];
        if (player) {
            if (player.tank) player.tank.setVisible(visible);
            if (player.turret) player.turret.setVisible(visible);
            if (player.shadow) player.shadow.setVisible(visible);
            if (player.nameText) player.nameText.setVisible(visible);
            if (player.healthBar) player.healthBar.setVisible(visible ? true : false);
            if (!visible && player.healthBar) player.healthBar.clear();
        }
    }

    getPlayersGroup() {
        // Return array of sprites for collision if needed, 
        // or we can manage a Phaser Group inside this manager
        // But for now MainScene manages groups.
        // We can expose the sprites.
        return Object.values(this.players).map(p => p.tank).filter(t => t);
    }
}

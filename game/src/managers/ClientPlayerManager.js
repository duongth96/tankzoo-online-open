export default class ClientPlayerManager {
    constructor(scene) {
        this.scene = scene;
        this.players = {}; // Stores Phaser objects and data: { sprite, turret, shadow, nameText, healthBar, ... }
        this.remotePlayersGroup = this.scene.physics.add.group();
    }

    getRemoteGroup() {
        return this.remotePlayersGroup;
    }

    addPlayer(playerInfo, isLocal = false) {
        if (this.players[playerInfo.playerId]) {
            return this.players[playerInfo.playerId];
        }
        const x = playerInfo.x;
        const y = playerInfo.y;
        
        // Body
        const tank = this.scene.physics.add.sprite(x, y, 'tankBody');
        tank.body.setSize(30, 30); // Set physics body to square
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
        turret.setOrigin(0, 0.5); // Set pivot to the start of the barrel

        // Name
        const nameText = this.scene.add.text(x, y - 40, playerInfo.name, { 
            fontSize: '15pt', 
            fill: '#fff',
            stroke: isLocal ? '#000' : '#ff0000',
            strokeThickness: 2
        }).setOrigin(0.5);
        nameText.setDepth(10);

        // Health Bar
        const healthBar = this.scene.add.graphics();
        this.updateHealthBar(healthBar, playerInfo.health, x, y);
        healthBar.setDepth(10);
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
        } else {
            this.remotePlayersGroup.add(tank);
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
            // Update rotation immediately
            player.tank.setRotation(data.rotation);
            if (player.turret) player.turret.setRotation(data.turretRotation);
            
            // Store velocity
            player.vx = data.vx || 0;
            player.vy = data.vy || 0;

            // Initialize target if first time
            if (player.targetX === undefined) {
                player.targetX = data.x;
                player.targetY = data.y;
                player.tank.setPosition(data.x, data.y);
            }
            
            // Distance check for teleporting
            const dist = Phaser.Math.Distance.Between(player.tank.x, player.tank.y, data.x, data.y);
            if (dist > 100) {
                player.targetX = data.x;
                player.targetY = data.y;
                player.tank.setPosition(data.x, data.y);
                // Update components immediately for teleport
                if (player.shadow) player.shadow.setPosition(data.x + 5, data.y + 5);
                if (player.turret) player.turret.setPosition(data.x, data.y);
                if (player.nameText) player.nameText.setPosition(data.x, data.y - 40);
                if (player.healthBar) this.updateHealthBar(player.healthBar, player.health, data.x, data.y);
            } else {
                // Update target to latest server position
                // The update() loop will extrapolate from here
                player.targetX = data.x;
                player.targetY = data.y;
            }
        }
    }

    update(time, delta) {
        const deltaSeconds = delta / 1000;
        for (const playerId in this.players) {
            const player = this.players[playerId];
            if (player.isLocal) continue;

            if (player.tank && player.targetX !== undefined) {
                // Extrapolate target position based on velocity (Dead Reckoning)
                if (player.vx || player.vy) {
                    player.targetX += player.vx * deltaSeconds;
                    player.targetY += player.vy * deltaSeconds;
                }

                // Smoothly interpolate visual position towards target
                const lerpFactor = 0.2; 
                const newX = Phaser.Math.Linear(player.tank.x, player.targetX, lerpFactor);
                const newY = Phaser.Math.Linear(player.tank.y, player.targetY, lerpFactor);

                player.tank.setPosition(newX, newY);

                // Update components
                if (player.shadow) player.shadow.setPosition(newX + 5, newY + 5);
                if (player.turret) player.turret.setPosition(newX, newY);
                if (player.nameText) player.nameText.setPosition(newX, newY - 40);
                if (player.healthBar) this.updateHealthBar(player.healthBar, player.health, newX, newY);
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

    updatePlayerAlpha(playerId, alpha) {
        const player = this.players[playerId];
        if (!player || !player.tank) return;

        if (alpha === 0) {
            // Invisible
             if (player.isLocal) {
                player.tank.setAlpha(0.5);
                if (player.turret) player.turret.setAlpha(0.5);
                if (player.shadow) player.shadow.setAlpha(0.5);
            } else {
                player.tank.setAlpha(0);
                if (player.turret) player.turret.setAlpha(0);
                if (player.shadow) player.shadow.setAlpha(0);
                if (player.nameText) player.nameText.setAlpha(0);
                if (player.healthBar) player.healthBar.setAlpha(0);
            }
        } else {
            // Visible
            player.tank.setAlpha(1);
            if (player.turret) player.turret.setAlpha(1);
            if (player.shadow) player.shadow.setAlpha(0.5);
            if (player.nameText) player.nameText.setAlpha(1);
            if (player.healthBar) player.healthBar.setAlpha(1);
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

    applyPowerUpEffect(playerId, type) {
        const player = this.players[playerId];
        if (!player || !player.tank) return;

        switch (type) {
            case 'speed':
                // Blue tint for speed
                player.tank.setTint(0x0000ff);
                if (player.turret) player.turret.setTint(0x0000ff);
                break;
            case 'damage':
                // Red tint for damage
                player.tank.setTint(0xff0000);
                if (player.turret) player.turret.setTint(0xff0000);
                break;
            case 'health':
                // Visual healing effect
                this.showFloatingText(player.tank.x, player.tank.y - 40, '+50 HP', '#00ff00');
                // Green flash
                player.tank.setTint(0x00ff00);
                if (player.turret) player.turret.setTint(0x00ff00);
                // this.scene.time.delayedCall(200, () => {
                //     if (player && player.tank) {
                //         player.tank.clearTint();
                //         if (player.turret) player.turret.clearTint();
                //         // Restore other buffs if any (simplified: just clear for now, ideally check flags)
                //         if (player.tank.getData('color')) player.tank.setTint(player.tank.getData('color'));
                //     }
                // });
                break;
            case 'invisible':
                // Semi-transparent
                if (player.isLocal) {
                    player.tank.setAlpha(0.5); // Local player sees themselves semi-transparent
                    if (player.turret) player.turret.setAlpha(0.5);
                    if (player.shadow) player.shadow.setAlpha(0.5);
                } else {
                    player.tank.setAlpha(0); // Others see nothing (or maybe 0.05 for faint shimmer)
                    if (player.turret) player.turret.setAlpha(0);
                    if (player.shadow) player.shadow.setAlpha(0);
                    if (player.nameText) player.nameText.setAlpha(0);
                    if (player.healthBar) player.healthBar.setAlpha(0);
                }
                break;
            case 'multiShot':
                // Magenta tint for multi-shot
                player.tank.setTint(0xff00ff);
                if (player.turret) player.turret.setTint(0xff00ff);
                break;
        }
    }

    removePowerUpEffect(playerId, type) {
        const player = this.players[playerId];
        if (!player || !player.tank) return;

        // Reset to original state
        // Note: This simplistic approach assumes only one effect at a time or resets all.
        // For multiple effects, we'd need a more complex state management.
        // For now, we reset to default.
        
        player.tank.clearTint();
        // Restore original player color if we had one, or just white/default
        if (player.tank.playerColor) {
            player.tank.setTint(player.tank.playerColor);
        }
        
        if (player.turret) player.turret.clearTint();
        
        player.tank.setAlpha(1);
        if (player.turret) player.turret.setAlpha(1);
        if (player.shadow) player.shadow.setAlpha(0.5); // Default shadow alpha
        if (player.nameText) player.nameText.setAlpha(1);
        if (player.healthBar) player.healthBar.setAlpha(1);
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

    showFloatingText(x, y, message, color) {
        const text = this.scene.add.text(x, y, message, {
            fontSize: '20px',
            fill: color,
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }
}

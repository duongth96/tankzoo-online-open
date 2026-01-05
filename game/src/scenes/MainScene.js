import Phaser from 'phaser';
import { socketClient } from '../utils/socket';
import { EVENTS } from '../constants/events';
import protobuf from 'protobufjs';
import ClientPlayerManager from '../managers/ClientPlayerManager';
import ClientObstacleManager from '../managers/ClientObstacleManager';
import ClientPowerUpManager from '../managers/ClientPowerUpManager';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.mapWidth = 4000;
        this.mapHeight = 4000;
    }

    create() {
        this.playerManager = new ClientPlayerManager(this);
        this.obstacleManager = new ClientObstacleManager(this);
        this.powerUpManager = new ClientPowerUpManager(this);

        this.setupGraphics();
        this.setupGroups(); // Bullets, etc.
        this.setupSocketListeners();
        this.setupInput();
        this.setupCamera();
        
        protobuf.load("/assets/game.proto", (err, root) => {
            if (err) {
                console.error("Protobuf load error:", err);
                return;
            }
            this.Movement = root.lookupType("game.Movement");
            this.Shoot = root.lookupType("game.Shoot");
        });
    }

    setupGraphics() {
        // ... (Same graphics generation as before)
        // For brevity, assuming graphics generation code is here or extracted to utils
        // I will re-include the graphics generation code to ensure it works.
        const bodyGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        bodyGraphics.fillStyle(0xffffff, 1);
        bodyGraphics.fillRect(0, 0, 40, 30);
        bodyGraphics.generateTexture('tankBody', 40, 30);

        const turretGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        turretGraphics.fillStyle(0x888888, 1);
        turretGraphics.fillRect(0, 0, 30, 10);
        turretGraphics.lineStyle(1, 0x000000, 1);
        turretGraphics.strokeRect(0, 0, 30, 10);
        turretGraphics.generateTexture('tankTurret', 30, 10);

        const bulletGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        bulletGraphics.fillStyle(0xff0000, 1);
        bulletGraphics.fillRect(-5, -2.5, 10, 5);
        bulletGraphics.generateTexture('bullet', 10, 5);

        const shadowGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        shadowGraphics.fillStyle(0x000000, 0.3);
        shadowGraphics.fillRect(0, 0, 40, 40);
        shadowGraphics.generateTexture('shadow', 40, 40);

        this.generateTextureHelper('powerup_invisible', 0x00ff00, 'circle');
        this.generateTextureHelper('powerup_multiShot', 0xff00ff, 'circle');
        this.generateTextureHelper('powerup_speed', 0x0000ff, 'circle');
        this.generateTextureHelper('powerup_damage', 0xff0000, 'circle');
        this.generateTextureHelper('powerup_health', 0xffffff, 'health');
        this.generateTextureHelper('powerup_missile', 0x00ffff, 'missile');
        this.generateTextureHelper('powerup_bomb', 0x000000, 'bomb');

        this.generateObstacleTextures();
        this.generateGroundTextures();
    }

    generateTextureHelper(key, color, type) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(color, 1);
        if (type === 'circle') {
            g.fillCircle(10, 10, 10);
            g.generateTexture(key, 20, 20);
        } else if (type === 'health') {
            g.fillCircle(10, 10, 10);
            g.fillStyle(0xff0000, 1);
            g.fillRect(8, 4, 4, 12);
            g.fillRect(4, 8, 12, 4);
            g.generateTexture(key, 20, 20);
        } else if (type === 'missile') {
            g.fillCircle(10, 10, 10);
            g.fillStyle(0x000000, 1);
            g.fillTriangle(10, 4, 4, 16, 16, 16);
            g.generateTexture(key, 20, 20);
        } else if (type === 'bomb') {
            g.fillCircle(10, 10, 10);
            g.fillStyle(0xff0000, 1);
            g.fillCircle(10, 10, 4);
            g.generateTexture(key, 20, 20);
        }
    }

    generateObstacleTextures() {
        this.createRectTexture('obstacle_hard_box', 40, 40, 0x666666, 0x000000);
        this.createRectTexture('obstacle_hard_wall_h', 120, 40, 0x555555, 0x000000);
        this.createRectTexture('obstacle_hard_wall_v', 40, 120, 0x555555, 0x000000);
        
        const hObsCorner = this.make.graphics({ x: 0, y: 0, add: false });
        hObsCorner.fillStyle(0x555555, 1);
        hObsCorner.fillRect(0, 0, 80, 40);
        hObsCorner.fillRect(0, 40, 40, 40);
        hObsCorner.lineStyle(2, 0x000000, 1);
        hObsCorner.strokeRect(0, 0, 80, 40);
        hObsCorner.strokeRect(0, 40, 40, 40);
        hObsCorner.generateTexture('obstacle_hard_corner', 80, 80);

        this.createRectTexture('obstacle_soft_box', 40, 40, 0x8b4513, 0x4b2506);
        
        const sObsBush = this.make.graphics({ x: 0, y: 0, add: false });
        sObsBush.fillStyle(0x228b22, 1);
        sObsBush.fillCircle(20, 20, 20);
        sObsBush.lineStyle(2, 0x006400, 1);
        sObsBush.strokeCircle(20, 20, 20);
        sObsBush.generateTexture('obstacle_soft_bush', 40, 40);

        const sObsBarrel = this.make.graphics({ x: 0, y: 0, add: false });
        sObsBarrel.fillStyle(0x708090, 1);
        sObsBarrel.fillCircle(15, 15, 15);
        sObsBarrel.lineStyle(2, 0x2f4f4f, 1);
        sObsBarrel.strokeCircle(15, 15, 15);
        sObsBarrel.generateTexture('obstacle_soft_barrel', 30, 30);
    }

    createRectTexture(key, w, h, fill, stroke) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(fill, 1);
        g.fillRect(0, 0, w, h);
        g.lineStyle(2, stroke, 1);
        g.strokeRect(0, 0, w, h);
        g.generateTexture(key, w, h);
    }

    generateGroundTextures() {
        this.createRectTexture('ground_grass', 40, 40, 0xd5e8d4, 0xc0dcc0);
        this.createRectTexture('ground_dirt', 40, 40, 0xf5f5f5, 0xe0e0e0);
        this.createRectTexture('ground_sand', 40, 40, 0xfff2cc, 0xffe699);
    }

    setupGroups() {
        this.bullets = this.physics.add.group();
        this.missiles = this.physics.add.group();
        this.bombs = this.physics.add.group();
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.on('pointerdown', (pointer) => {
            this.fireBullet(pointer);
        });
        
        this.input.keyboard.on('keydown-Z', () => {
            socketClient.emit(EVENTS.USE_ITEM, 'missile');
        });
        this.input.keyboard.on('keydown-X', () => {
            socketClient.emit(EVENTS.USE_ITEM, 'bomb');
        });
    }

    setupCamera() {
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
    }

    fireBullet(pointer) {
        const localPlayer = this.playerManager.localPlayer;
        if (localPlayer && localPlayer.tank && !localPlayer.tank.isDead) {
            const tank = localPlayer.tank;
            const angle = Phaser.Math.Angle.Between(tank.x, tank.y, pointer.worldX, pointer.worldY);
            
            if (this.Shoot) {
                const payload = {
                    x: tank.x + Math.cos(angle) * 30,
                    y: tank.y + Math.sin(angle) * 30,
                    rotation: angle
                };
                const buffer = this.Shoot.encode(this.Shoot.create(payload)).finish();
                socketClient.emit(EVENTS.PLAYER_SHOOT, buffer);
            } else {
                socketClient.emit(EVENTS.PLAYER_SHOOT, {
                    x: tank.x + Math.cos(angle) * 30,
                    y: tank.y + Math.sin(angle) * 30,
                    rotation: angle
                });
            }
        }
    }

    setupSocketListeners() {
        const socket = socketClient.getSocket();
        if (!socket) return;

        socket.on(EVENTS.MAP_SEED, (seed) => {
            this.generateBackground(seed);
        });

        socket.on(EVENTS.CURRENT_PLAYERS, (players) => {
            window.allPlayersData = players;
            this.updateLeaderboard();
            Object.keys(players).forEach((id) => {
                if (players[id].playerId === socket.id) {
                    const p = this.playerManager.addPlayer(players[id], true);
                    // Add collision with obstacles for local player
                    this.physics.add.collider(p.tank, this.obstacleManager.getGroup());
                    // Add overlap with powerups
                    this.physics.add.overlap(p.tank, this.powerUpManager.getGroup(), (tank, powerUp) => {
                        socketClient.emit(EVENTS.POWERUP_COLLECTED, powerUp.id);
                    }, null, this);
                } else {
                    this.playerManager.addPlayer(players[id], false);
                }
            });
        });

        socket.on(EVENTS.NEW_PLAYER, (playerInfo) => {
            if (!window.allPlayersData) window.allPlayersData = {};
            window.allPlayersData[playerInfo.playerId] = playerInfo;
            this.updateLeaderboard();
            this.playerManager.addPlayer(playerInfo, false);
        });

        socket.on(EVENTS.DISCONNECT_PLAYER, (playerId) => {
            if (window.allPlayersData && window.allPlayersData[playerId]) {
                delete window.allPlayersData[playerId];
                this.updateLeaderboard();
            }
            this.playerManager.removePlayer(playerId);
        });

        socket.on(EVENTS.PLAYER_MOVED, (data) => {
            let playerInfo = data;
            if ((data instanceof ArrayBuffer || data instanceof Uint8Array) && this.Movement) {
                try {
                    playerInfo = this.Movement.decode(new Uint8Array(data));
                } catch (e) { console.error(e); return; }
            }
            this.playerManager.updatePlayerPosition(playerInfo.playerId, playerInfo);
        });

        socket.on(EVENTS.BULLET_FIRED, (data) => {
            this.handleBulletFired(data);
        });

        socket.on(EVENTS.PLAYER_HEALTH_UPDATE, (data) => {
            this.playerManager.updateHealth(data.playerId, data.health);
        });

        socket.on(EVENTS.PLAYER_DIED, (playerId) => {
            if (socket.id === playerId) {
                 this.playerManager.handleDeath(playerId);
                 document.getElementById('respawnOverlay').style.display = 'flex';
                 this.startRespawnTimer();
            } else {
                this.playerManager.handleDeath(playerId);
            }
        });

        socket.on(EVENTS.PLAYER_RESPAWNED, (playerInfo) => {
            if (socket.id === playerInfo.playerId) {
                this.playerManager.handleRespawn(playerInfo);
                document.getElementById('respawnOverlay').style.display = 'none';
            } else {
                this.playerManager.handleRespawn(playerInfo);
            }
        });

        socket.on(EVENTS.CURRENT_OBSTACLES, (obstacles) => {
            Object.keys(obstacles).forEach((id) => {
                this.obstacleManager.displayObstacle(obstacles[id]);
            });
        });
        
        socket.on(EVENTS.OBSTACLE_REMOVED, (id) => {
            this.obstacleManager.removeObstacle(id);
        });

        socket.on(EVENTS.CURRENT_POWERUPS, (powerUps) => {
            Object.keys(powerUps).forEach((id) => {
                this.powerUpManager.displayPowerUp(powerUps[id]);
            });
        });

        socket.on(EVENTS.POWERUP_SPAWNED, (info) => {
            this.powerUpManager.displayPowerUp(info);
        });

        socket.on(EVENTS.POWERUP_REMOVED, (id) => {
            this.powerUpManager.removePowerUp(id);
        });
    }

    handleBulletFired(data) {
        let bulletData = data;
        if ((data instanceof ArrayBuffer || data instanceof Uint8Array) && this.Shoot) {
            try {
                bulletData = this.Shoot.decode(new Uint8Array(data));
            } catch(e) { console.error(e); return; }
        }

        const bullet = this.bullets.create(bulletData.x, bulletData.y, 'bullet');
        if (bullet) {
            bullet.setRotation(bulletData.rotation);
            bullet.setDepth(5);
            bullet.damage = bulletData.damage;
            bullet.attackerId = bulletData.playerId;
            this.physics.velocityFromRotation(bulletData.rotation, 500, bullet.body.velocity);
            
            const localPlayer = this.playerManager.localPlayer;
            if (localPlayer && localPlayer.tank) {
                this.physics.add.overlap(localPlayer.tank, bullet, () => {
                    bullet.destroy();
                    socketClient.emit(EVENTS.PLAYER_HIT, { 
                        playerId: socketClient.getSocket().id, 
                        damage: bullet.damage, 
                        attackerId: bullet.attackerId 
                    });
                }, null, this);
            }
            
            setTimeout(() => { if(bullet.active) bullet.destroy(); }, 2000);
        }
    }

    update() {
        const localPlayer = this.playerManager.localPlayer;
        if (localPlayer && localPlayer.tank && !localPlayer.tank.isDead) {
            const tank = localPlayer.tank;
            const speed = 200; // or from speed buff
            tank.body.setVelocity(0);
            
            let moved = false;
            let velocity = new Phaser.Math.Vector2();

            if (this.cursors.left.isDown || this.input.keyboard.addKey('A').isDown) {
                velocity.x = -1;
            } else if (this.cursors.right.isDown || this.input.keyboard.addKey('D').isDown) {
                velocity.x = 1;
            }

            if (this.cursors.up.isDown || this.input.keyboard.addKey('W').isDown) {
                velocity.y = -1;
            } else if (this.cursors.down.isDown || this.input.keyboard.addKey('S').isDown) {
                velocity.y = 1;
            }

            if (velocity.length() > 0) {
                velocity.normalize().scale(speed);
                tank.setVelocity(velocity.x, velocity.y);
                tank.setRotation(velocity.angle());
                moved = true;
            }

            const pointer = this.input.activePointer;
            const angle = Phaser.Math.Angle.Between(tank.x, tank.y, pointer.worldX, pointer.worldY);
            
            // Access turret via player data
            if (localPlayer.turret) {
                localPlayer.turret.setRotation(angle);
                localPlayer.turret.setPosition(tank.x, tank.y);
            }
            
            if (localPlayer.shadow) {
                localPlayer.shadow.setPosition(tank.x + 5, tank.y + 5);
                localPlayer.shadow.setRotation(tank.rotation);
            }

            if (localPlayer.nameText) {
                localPlayer.nameText.setPosition(tank.x, tank.y - 40);
            }
            
            if (localPlayer.healthBar) {
                this.playerManager.updateHealthBar(localPlayer.healthBar, localPlayer.health, tank.x, tank.y);
            }

            if (moved || this.lastTurretRotation !== angle) {
                this.lastTurretRotation = angle;
                
                if (this.Movement) {
                    const payload = {
                        playerId: socketClient.getSocket().id,
                        x: tank.x,
                        y: tank.y,
                        rotation: tank.rotation,
                        turretRotation: angle
                    };
                    const buffer = this.Movement.encode(this.Movement.create(payload)).finish();
                    socketClient.emit(EVENTS.PLAYER_MOVEMENT, buffer);
                } else {
                    socketClient.emit(EVENTS.PLAYER_MOVEMENT, {
                        x: tank.x,
                        y: tank.y,
                        rotation: tank.rotation,
                        turretRotation: angle
                    });
                }
            }
        }
    }

    generateBackground(seed) {
        for (let x = 0; x < this.mapWidth; x += 40) {
            for (let y = 0; y < this.mapHeight; y += 40) {
                const r = Math.random(); // In real game use seeded random
                let key = 'ground_grass';
                if (r > 0.8) key = 'ground_dirt';
                else if (r > 0.95) key = 'ground_sand';
                this.add.image(x, y, key).setOrigin(0).setDepth(0);
            }
        }
    }
    
    updateLeaderboard() {
        const event = new CustomEvent('updateLeaderboard', { detail: window.allPlayersData });
        window.dispatchEvent(event);
    }
    
    startRespawnTimer() {
        let count = 3;
        const el = document.getElementById('respawnCount');
        if (el) el.innerText = count;
        const interval = setInterval(() => {
            count--;
            if (el) el.innerText = count;
            if (count <= 0) clearInterval(interval);
        }, 1000);
    }
}

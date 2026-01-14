import Phaser from 'phaser';
import { socketClient } from '../utils/socket';
import { EVENTS } from '../constants/events';
import protobuf from 'protobufjs';
import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';
import ClientPlayerManager from '../managers/ClientPlayerManager';
import ClientObstacleManager from '../managers/ClientObstacleManager';
import ClientPowerUpManager from '../managers/ClientPowerUpManager';
import ClientMapManager from '../managers/ClientMapManager';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.mapWidth = 4000;
        this.mapHeight = 4000;
    }

    create() {
        // Detect mobile device
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('Is Mobile:', this.isMobile);

        this.clientMapManager = new ClientMapManager(this);
        this.playerManager = new ClientPlayerManager(this);
        this.obstacleManager = new ClientObstacleManager(this);
        this.powerUpManager = new ClientPowerUpManager(this);

        this.setupGraphics();
        this.setupGroups(); // Bullets, etc.
        this.setupSocketListeners();
        this.setupInput();
        this.setupCamera();
        
        // Launch UI Scene
        this.scene.launch('UIScene');
        
        // Listen for Mobile Shoot event from UIScene
        this.events.on('mobileShoot', () => {
            this.fireBullet(this.input.activePointer);
        });

        // Listen for Mobile Item Usage from UIScene
        this.events.on('useItem', (type) => {
            socketClient.emit(EVENTS.USE_ITEM, type);
        });
        
        // Initialize map immediately if seed was received before scene started
        const bufferedSeed = socketClient.getMapSeed && socketClient.getMapSeed();
        if (bufferedSeed !== null && bufferedSeed !== undefined) {
            this.clientMapManager.init(bufferedSeed);
            this.clientMapManager.generateMap();
        }
        
        // Load Protobuf from cache (loaded in PreloadScene)
        const protoContent = this.cache.text.get('game-proto');
        if (protoContent) {
            try {
                const root = protobuf.parse(protoContent).root;
                this.Movement = root.lookupType("game.Movement");
                this.Shoot = root.lookupType("game.Shoot");
            } catch (err) {
                console.error("Protobuf parse error:", err);
            }
        } else {
            console.error("Game Proto not found in cache!");
        }
        // Throttling state
        this.lastSentTime = 0;
        this.lastSentVelocity = new Phaser.Math.Vector2(0, 0);
        this.lastSentTurretRotation = 0;
        
        // Acceleration system
        this.acceleration = 100; // Max 100
        this.accelerationMax = 100;
        this.accelerationDrainRate = 10; // Per second when boosting
        this.accelerationRegenRate = 5; // Per second when not boosting
        this.lastAccelerationUpdate = 0;
        this.isBoosting = false;
        this.trailParticles = []; // Array to store trail particles
        this.lastTrailTime = 0; // Throttle trail particle creation
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
        bulletGraphics.fillRect(0, 0, 10, 5); // Adjusted to start at 0,0 for correct texture generation
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
        this.physics.add.collider(this.bullets, this.obstacleManager.getGroup(), this.handleBulletObstacleCollision, null, this);
        
        // Add collision between bullets and remote players for visual feedback
        this.physics.add.overlap(this.bullets, this.playerManager.getRemoteGroup(), (bullet, playerTank) => {
            // Only destroy if it's NOT the attacker (prevent self-hit immediately if spawn overlaps)
            // But usually bullet spawns outside.
            // Also need to check if bullet is mine? 
            // If bullet is remote, it should hit ME (handled elsewhere).
            // If bullet is MINE, it should hit REMOTE.
            const socket = socketClient.getSocket();
            if (socket && bullet.attackerId === socket.id) {
                 bullet.destroy();
                 // We could emit PLAYER_HIT here if we wanted client-side hit detection trust,
                 // but currently the VICTIM reports the hit.
                 // So this is purely for visual "bullet stops on tank" effect.
            } else if (bullet.attackerId !== playerTank.playerId) {
                 // Remote bullet hitting remote tank (visual only)
                 bullet.destroy();
            }
        }, null, this);
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.on('pointerdown', (pointer) => {
            // Only fire if not clicking on UI elements (like joystick or buttons)
            // But checking that is tricky without proper UI manager.
            // For now, if mobile, rely on button. If PC, click anywhere.
            if (!this.isMobile) {
                this.fireBullet(pointer);
            }
        });
        
        this.input.keyboard.on('keydown-SPACE', () => {
            this.fireBullet(this.input.activePointer);
        });

        this.input.keyboard.on('keydown-ONE', () => {
            socketClient.emit(EVENTS.USE_ITEM, 'missile');
        });
        this.input.keyboard.on('keydown-TWO', () => {
            socketClient.emit(EVENTS.USE_ITEM, 'bomb');
        });

        // Tab key for minimap
        this.tabKey = this.input.keyboard.addKey('TAB');
        this.tabKey.on('down', () => {
            const uiScene = this.scene.get('UIScene');
            if (uiScene) {
                uiScene.showMinimap(true);
            }
        });
        this.tabKey.on('up', () => {
            const uiScene = this.scene.get('UIScene');
            if (uiScene) {
                uiScene.showMinimap(false);
            }
        });

        // Shift key for boost/acceleration
        this.shiftKey = this.input.keyboard.addKey('SHIFT');

        // Debug: Toggle Mobile Mode with 'P'
        this.input.keyboard.on('keydown-P', () => {
            this.isMobile = !this.isMobile;
            console.log('Mobile Mode toggled:', this.isMobile);
            
            // Re-run setupMobileControls logic
            if (this.isMobile) {
                this.setupMobileControls();
            } else {
                if (this.joyStick) {
                    this.joyStick.destroy();
                    this.joyStick = null;
                }
                if (this.shootBtn) {
                    this.shootBtn.destroy();
                    this.shootBtn = null;
                }
            }
        });

        // Mobile Fullscreen & Orientation
        if (this.isMobile) {
            this.input.on('pointerdown', () => {
                if (this.scale.fullscreen && !this.scale.isFullscreen) {
                    this.scale.startFullscreen();
                }
            });
            
            // Lock orientation if supported (mostly Android with PWA/Chrome)
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        }
    }

    setupMobileControls() {
        if (!this.isMobile) return;
        
        // Cleanup existing if any (to prevent duplicates on toggle)
        if (this.joyStick) this.joyStick.destroy();
        if (this.shootBtn) this.shootBtn.destroy();

        // Virtual Joystick (Left)
        // Ensure we add base/thumb to scene but keep them fixed to camera
        const base = this.add.circle(0, 0, 60, 0x888888).setAlpha(0.5).setDepth(100).setScrollFactor(0);
        const thumb = this.add.circle(0, 0, 30, 0xcccccc).setAlpha(0.8).setDepth(101).setScrollFactor(0);

        this.joyStick = new VirtualJoystick(this, {
            x: 100,
            y: this.cameras.main.height - 100,
            radius: 60,
            base: base,
            thumb: thumb,
            dir: '8dir',
            forceMin: 16,
            enable: true
        });

        // Shoot Button (Right)
        const shootBtnRadius = 40;
        const shootBtnX = this.cameras.main.width - 80;
        const shootBtnY = this.cameras.main.height - 80;
        
        this.shootBtn = this.add.circle(shootBtnX, shootBtnY, shootBtnRadius, 0xff0000)
            .setAlpha(0.6)
            .setScrollFactor(0)
            .setInteractive()
            .setDepth(100);
            
        this.shootBtn.on('pointerdown', () => {
            this.shootBtn.setAlpha(0.9);
            this.fireBullet(this.input.activePointer);
        });

        this.shootBtn.on('pointerup', () => {
            this.shootBtn.setAlpha(0.6);
        });
        
        this.shootBtn.on('pointerout', () => {
            this.shootBtn.setAlpha(0.6);
        });
    }

    setupCamera() {
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
        this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);
        if (this.isMobile) {
            this.cameras.main.setZoom(1); // Zoom in to make objects bigger on high res mobile screen
        }
    }

    fireBullet(pointer) {
        const now = this.time.now;
        if (now < this.lastFired + this.fireRate) {
            return;
        }
        this.lastFired = now;

        const localPlayer = this.playerManager.localPlayer;
        if (localPlayer && localPlayer.tank && !localPlayer.tank.isDead) {
            const tank = localPlayer.tank;
            let baseAngle;

            if (this.isMobile) {
                // Mobile: Shoot in direction of tank facing
                baseAngle = tank.rotation;
            } else {
                // Desktop: Shoot towards mouse
                baseAngle = Phaser.Math.Angle.Between(tank.x, tank.y, pointer.worldX, pointer.worldY);
            }
            
            const offset = 45; // Increased from 30 to 45 to clearly show bullet leaving barrel (Turret length is 30)
            
            const angles = [baseAngle];
            if (localPlayer.multiShotBuff) {
                angles.push(baseAngle - 0.35); // ~20 degrees
                angles.push(baseAngle + 0.35);
            }

            angles.forEach(angle => {
                if (this.Shoot) {
                    const payload = {
                        x: tank.x + Math.cos(angle) * offset,
                        y: tank.y + Math.sin(angle) * offset,
                        rotation: angle
                    };
                    const buffer = this.Shoot.encode(this.Shoot.create(payload)).finish();
                    socketClient.emit(EVENTS.PLAYER_SHOOT, buffer);
                } else {
                    socketClient.emit(EVENTS.PLAYER_SHOOT, {
                        x: tank.x + Math.cos(angle) * offset,
                        y: tank.y + Math.sin(angle) * offset,
                        rotation: angle
                    });
                }
            });
        }
    }

    setupSocketListeners() {
        const socket = socketClient.getSocket();
        if (!socket) return;

        // Consume any initial state buffered before listeners were registered
        const initial = socketClient.consumeInitialState ? socketClient.consumeInitialState() : {};
        if (initial.players) {
            window.allPlayersData = initial.players;
            this.updateLeaderboard();
            Object.keys(initial.players).forEach((id) => {
                if (initial.players[id].playerId === socket.id) {
                    const p = this.playerManager.addPlayer(initial.players[id], true);
                    this.physics.add.collider(p.tank, this.obstacleManager.getGroup());
                    this.physics.add.overlap(p.tank, this.powerUpManager.getGroup(), (tank, powerUp) => {
                        socketClient.emit(EVENTS.POWERUP_COLLECTED, powerUp.id);
                    }, null, this);
                    if (initial.players[id].inventory) {
                         this.events.emit('updateInventory', initial.players[id].inventory);
                    }
                } else {
                    this.playerManager.addPlayer(initial.players[id], false);
                }
            });
        }
        if (initial.obstacles) {
            Object.keys(initial.obstacles).forEach((id) => {
                this.obstacleManager.displayObstacle(initial.obstacles[id]);
            });
        }
        if (initial.powerUps) {
            Object.keys(initial.powerUps).forEach((id) => {
                this.powerUpManager.displayPowerUp(initial.powerUps[id]);
            });
        }
        if (initial.mapSeed !== null && initial.mapSeed !== undefined) {
            this.clientMapManager.init(initial.mapSeed);
            this.clientMapManager.generateMap();
        }
        
        socket.on(EVENTS.MAP_SEED, (seed) => {
            this.clientMapManager.init(seed);
            this.clientMapManager.generateMap();
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
                    if (players[id].inventory) {
                         if (this.missileText) this.missileText.setText(`1: ${players[id].inventory.missile || 0}`);
                         if (this.bombText) this.bombText.setText(`2: ${players[id].inventory.bomb || 0}`);
                    }
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

        socket.on(EVENTS.PLAYER_ALPHA_CHANGED, (data) => {
            this.playerManager.updatePlayerAlpha(data.playerId, data.alpha);
        });

        socket.on(EVENTS.SCORE_UPDATE, (data) => {
            if (window.allPlayersData && window.allPlayersData[data.playerId]) {
                window.allPlayersData[data.playerId].score = data.score;
                this.updateLeaderboard();
            }
        });

        socket.on(EVENTS.PLAYER_DIED, (playerId) => {
            console.log('PLAYER_DIED event received for:', playerId);
            if (socket.id === playerId) {
                 console.log('Local player died, showing respawn overlay');
                 this.playerManager.handleDeath(playerId);
                 const overlay = document.getElementById('respawnOverlay');
                 if (overlay) {
                     overlay.style.display = 'flex';
                     this.startRespawnTimer();
                 } else {
                     console.error('Respawn overlay not found!');
                 }
            } else {
                this.playerManager.handleDeath(playerId);
            }
        });

        socket.on(EVENTS.PLAYER_RESPAWNED, (playerInfo) => {
            if (socket.id === playerInfo.playerId) {
                this.playerManager.handleRespawn(playerInfo);
                document.getElementById('respawnOverlay').style.display = 'none';
                // Reset acceleration on respawn
                this.acceleration = this.accelerationMax;
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
        
        socket.on(EVENTS.OBSTACLE_HEALTH_UPDATE, (data) => {
            console.log('MainScene updateObstacleHealth:', data);
            this.obstacleManager.updateObstacleHealth(data.id, data.health);
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

        socket.on(EVENTS.APPLY_POWERUP, (data) => {
            const { playerId, type } = data;
            this.playerManager.applyPowerUpEffect(playerId, type);
            
            if (this.playerManager.localPlayer && playerId === socket.id) {
                if (type === 'speed') {
                    this.playerManager.localPlayer.speedBuff = true;
                } else if (type === 'damage') {
                    this.playerManager.localPlayer.damageBuff = true;
                } else if (type === 'invisible') {
                    this.playerManager.localPlayer.invisibleBuff = true;
                } else if (type === 'multiShot') {
                    this.playerManager.localPlayer.multiShotBuff = true;
                }
            }
        });

        socket.on(EVENTS.REMOVE_POWERUP_EFFECT, (data) => {
            const { playerId, type } = data;
            this.playerManager.removePowerUpEffect(playerId, type);

            if (this.playerManager.localPlayer && playerId === socket.id) {
                if (type === 'speed') {
                    this.playerManager.localPlayer.speedBuff = false;
                } else if (type === 'damage') {
                    this.playerManager.localPlayer.damageBuff = false;
                } else if (type === 'invisible') {
                    this.playerManager.localPlayer.invisibleBuff = false;
                } else if (type === 'multiShot') {
                    this.playerManager.localPlayer.multiShotBuff = false;
                }
            }
        });

        socket.on(EVENTS.MISSILE_FIRED, (data) => {
            this.handleMissileFired(data);
        });

        socket.on(EVENTS.BOMB_DROPPED, (data) => {
            this.handleBombDropped(data);
        });

        socket.on(EVENTS.BOMB_EXPLODED, (data) => {
            this.handleBombExploded(data);
        });

        socket.on(EVENTS.INVENTORY_UPDATE, (inventory) => {
            this.events.emit('updateInventory', inventory);
        });
    }

    handleMissileFired(data) {
        const missile = this.missiles.create(data.x, data.y, 'powerup_missile');
        if (missile) {
            missile.setRotation(data.rotation + Math.PI / 2); // Rotate to face direction (texture points Up, Phaser needs Right)
            missile.setDepth(5);
            missile.damage = data.damage || 50;
            missile.attackerId = data.playerId;
            missile.body.setSize(16, 16);
            
            this.physics.velocityFromRotation(data.rotation, 400, missile.body.velocity);

            // Add collision with local player if not attacker
            const localPlayer = this.playerManager.localPlayer;
            if (localPlayer && localPlayer.tank && localPlayer.id !== data.playerId) {
                this.physics.add.overlap(localPlayer.tank, missile, () => {
                    this.explodeMissile(missile);
                }, null, this);
            }

            // Add collision with obstacles
            this.physics.add.collider(missile, this.obstacleManager.getGroup(), () => {
                this.explodeMissile(missile);
            });

            // Destroy after 3 seconds if no hit (also explode)
            setTimeout(() => { 
                if(missile.active) {
                    this.explodeMissile(missile);
                } 
            }, 3000);
        }
    }

    explodeMissile(missile) {
        if (!missile.active) return;
        
        const x = missile.x;
        const y = missile.y;
        const radius = 80; // Increased explosion radius for AOE

        // Visual explosion
        this.createExplosion(x, y, radius); 
        
        // AOE Damage Logic
        
        // 1. Check Local Player (Victim reports hit)
        const localPlayer = this.playerManager.localPlayer;
        if (localPlayer && localPlayer.tank && !localPlayer.tank.isDead) {
             const dist = Phaser.Math.Distance.Between(x, y, localPlayer.tank.x, localPlayer.tank.y);
             if (dist <= radius) {
                 socketClient.emit(EVENTS.PLAYER_HIT, { 
                     playerId: socketClient.getSocket().id, 
                     damage: missile.damage, 
                     attackerId: missile.attackerId 
                 });
             }
        }
        
        // 2. Check Soft Obstacles (Attacker reports hit)
        const socket = socketClient.getSocket();
        if (socket && missile.attackerId === socket.id) {
            this.obstacleManager.obstacles.getChildren().forEach(obs => {
                if (obs.active && obs.obstacleType === 'soft') {
                    const dist = Phaser.Math.Distance.Between(x, y, obs.x, obs.y);
                    if (dist <= radius) {
                         socketClient.emit(EVENTS.OBSTACLE_HIT, {
                            obstacleId: obs.id,
                            damage: missile.damage
                        });
                    }
                }
            });
        }

        missile.destroy();
    }

    handleBombDropped(data) {
        const bomb = this.bombs.create(data.x, data.y, 'powerup_bomb');
        bomb.setDepth(4);
        bomb.id = data.id;
        bomb.attackerId = data.playerId;
        
        // Blinking effect to indicate danger
        this.tweens.add({
            targets: bomb,
            alpha: 0.5,
            scale: 1.2,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    handleBombExploded(data) {
        // Find bomb by id and destroy it
        const bomb = this.bombs.getChildren().find(b => b.id === data.id);
        if (bomb) {
            this.createExplosion(bomb.x, bomb.y, 200);
            bomb.destroy();
        } else {
            // If bomb not found (maybe sync issue), still show explosion at coords
            this.createExplosion(data.x, data.y, 200);
        }
    }

    createExplosion(x, y, radius) {
        const explosion = this.add.circle(x, y, 10, 0xff0000);
        this.tweens.add({
            targets: explosion,
            scale: radius / 10, 
            alpha: 0,
            duration: 500,
            onComplete: () => explosion.destroy()
        });
        
        // Camera shake for large explosions
        if (radius > 100) {
            this.cameras.main.shake(200, 0.01);
        }
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
            bullet.startX = bulletData.x;
            bullet.startY = bulletData.y;
            bullet.setRotation(bulletData.rotation);
            bullet.setDepth(5);
            bullet.damage = Number(bulletData.damage) || 20;
            bullet.distance = Number(bulletData.distance) || 200;
            bullet.attackerId = bulletData.playerId;
            bullet.body.setSize(12, 12); // Increase size slightly to ensure collision
            this.physics.velocityFromRotation(bulletData.rotation, 500, bullet.body.velocity);
            
            // Immediate collision check for spawn-inside-obstacle case
            if (this.physics.overlap(bullet, this.obstacleManager.getGroup(), this.handleBulletObstacleCollision, null, this)) {
                return;
            }

            const localPlayer = this.playerManager.localPlayer;
            if (localPlayer && localPlayer.tank) {
                this.physics.add.overlap(localPlayer.tank, bullet, () => {
                    if (bullet.attackerId === localPlayer.id) return;
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

    handleBulletObstacleCollision(bullet, obstacle) {
        if (!bullet.active) return;
        
        console.log('Collision detected:', bullet.attackerId, obstacle.id, obstacle.obstacleType);

        // Only the attacker sends the hit event to server
        const socket = socketClient.getSocket();
        if (socket && bullet.attackerId === socket.id) {
            console.log('Attacker matches local player');
            if (obstacle.obstacleType === 'soft') {
                console.log('Emitting OBSTACLE_HIT', obstacle.id, bullet.damage);
                socketClient.emit(EVENTS.OBSTACLE_HIT, {
                    obstacleId: obstacle.id,
                    damage: bullet.damage
                });
            }
        }
        
        bullet.destroy();
    }

    // TODO:
    // Một số bug cần fix.
    // 1. Phía current tank hiện tại đạn đang bay xuyên qua các tank khác
    // 2. Giới hạn khoảng cách bay của đạn là 200, chưa hoạt động chính xác.
    // 3. Hiển thị trên mobile đang đang quá to, cần scale nhỏ xuống.
    // 4. Fullscreen mode trên mobile, và xoay ngang màn hình.


    update(time, delta) {
        // Update bullets range
        this.bullets.getChildren().forEach(bullet => {
            if (bullet.active) {
                const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, bullet.startX, bullet.startY);
                if (dist > bullet.distance) {
                    console.log('Bullet out of range:', dist, bullet.distance);
                    bullet.destroy();
                }
            }
        });

        const localPlayer = this.playerManager.localPlayer;
        if (localPlayer && localPlayer.tank && !localPlayer.tank.isDead) {
            if (!this.cameras.main.deadzone) {
                this.cameras.main.startFollow(localPlayer.tank, true, 0.1, 0.1);
                this.cameras.main.setDeadzone(50, 50);
            }
            const tank = localPlayer.tank;
            let baseSpeed = localPlayer.speedBuff ? 200 : 150;
            
            tank.body.setVelocity(0);
            
            let moved = false;
            let velocity = new Phaser.Math.Vector2();

            const uiScene = this.scene.get('UIScene');
            const joyStick = uiScene ? uiScene.joyStick : null;

            // Analog movement for mobile joystick
            if (joyStick && joyStick.force > 0) {
                velocity.setToPolar(joyStick.rotation, speed);
            } else {
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
                    velocity.normalize().scale(baseSpeed);
                }
            }
            
            // Update acceleration
            const deltaSeconds = delta / 1000;
            
            // Check if boosting (Shift held, has acceleration, and moving)
            const canBoost = this.shiftKey && this.shiftKey.isDown && this.acceleration > 0 && velocity.length() > 0;
            
            // Boost multiplier depends on current acceleration percentage (0-100%)
            // At 100% acceleration, boost is 3.0x (300% speed increase)
            // At 50% acceleration, boost is 2.0x (200% speed increase)
            // Linear scaling based on acceleration percentage
            const accelerationPercent = this.acceleration / this.accelerationMax;
            const maxBoostMultiplier = 3.0; // Maximum boost at 100% acceleration (300% speed)
            const boostMultiplier = canBoost ? (1.0 + (maxBoostMultiplier - 1.0) * accelerationPercent) : 1.0;
            const speed = baseSpeed * boostMultiplier;
            
            this.isBoosting = canBoost;
            this.updateAcceleration(deltaSeconds);
            
            // Apply speed multiplier to velocity
            if (velocity.length() > 0) {
                velocity.normalize().scale(speed);
            }

            if (velocity.length() > 0) {
                tank.setVelocity(velocity.x, velocity.y);
                tank.setRotation(velocity.angle());
                moved = true;
                
                // Create trail effect when boosting (throttle to avoid too many particles)
                if (this.isBoosting) {
                    if (!this.lastTrailTime || this.time.now - this.lastTrailTime > 50) { // Create trail every 50ms
                        this.createTrailParticle(tank.x, tank.y, tank.rotation);
                        this.lastTrailTime = this.time.now;
                    }
                }
            }
            
            // Update and cleanup trail particles
            this.updateTrailParticles(delta);

            const pointer = this.input.activePointer;
            let angle;

            if (this.isMobile) {
                // Mobile: Turret locks to tank body rotation (or movement direction)
                // If moving, face movement. If stopped, keep last tank rotation.
                angle = tank.rotation;
            } else {
                // Desktop: Turret follows mouse
                angle = Phaser.Math.Angle.Between(tank.x, tank.y, pointer.worldX, pointer.worldY);
            }
            
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

            // Throttling Logic
            const now = time;
            const THROTTLE_INTERVAL = 50; // 50ms = 20 updates/sec

            // Check if velocity changed significantly (including stopping)
            // Note: velocity is already scaled by speed if moving, or 0 if not.
            const velocityChanged = !this.lastSentVelocity.equals(velocity);
            
            // Check if turret rotation changed significantly
            const rotationChanged = Math.abs(angle - this.lastSentTurretRotation) > 0.05;

            const timeToUpdate = (now - this.lastSentTime) > THROTTLE_INTERVAL;

            // We send if:
            // 1. Velocity changed (started/stopped/changed direction) - IMMEDIATE
            // 2. Turret rotated AND enough time passed - THROTTLED
            // 3. Moving AND enough time passed (position sync) - THROTTLED
            
            let shouldSend = false;
            
            if (velocityChanged) {
                shouldSend = true;
            } else if ((moved || rotationChanged) && timeToUpdate) {
                shouldSend = true;
            }

            if (shouldSend) {
                this.lastSentTime = now;
                this.lastSentVelocity.copy(velocity);
                this.lastSentTurretRotation = angle;
                
                const payload = {
                    playerId: socketClient.getSocket().id,
                    x: tank.x,
                    y: tank.y,
                    rotation: tank.rotation,
                    turretRotation: angle,
                    vx: velocity.x,
                    vy: velocity.y
                };
                
                if (this.Movement) {
                    const buffer = this.Movement.encode(this.Movement.create(payload)).finish();
                    socketClient.emit(EVENTS.PLAYER_MOVEMENT, buffer);
                } else {
                    socketClient.emit(EVENTS.PLAYER_MOVEMENT, payload);
                }
            }
        }
        
        // Update remote players interpolation
        this.playerManager.update(time, delta);
        
        // Update minimap if Tab is held
        if (this.tabKey && this.tabKey.isDown) {
            const uiScene = this.scene.get('UIScene');
            if (uiScene && uiScene.minimapContainer) {
                uiScene.updateMinimap(this);
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

    updateAcceleration(deltaSeconds) {
        if (this.isBoosting && this.acceleration > 0) {
            // Drain acceleration when boosting
            this.acceleration = Math.max(0, this.acceleration - this.accelerationDrainRate * deltaSeconds);
        } else {
            // Regenerate acceleration when not boosting
            this.acceleration = Math.min(this.accelerationMax, this.acceleration + this.accelerationRegenRate * deltaSeconds);
        }
        
        // Update UI
        const uiScene = this.scene.get('UIScene');
        if (uiScene) {
            uiScene.updateAccelerationBar(this.acceleration, this.accelerationMax);
        }
    }

    createTrailParticle(x, y, rotation) {
        // Create dashed line trail behind the tank with yellow and orange colors
        const offsetDistance = 18; // Distance behind tank
        const offsetX = -Math.cos(rotation) * offsetDistance;
        const offsetY = -Math.sin(rotation) * offsetDistance;
        
        // Create larger line segments for dashed line effect
        const segmentLength = 1; // Length of each dash (1px)
        const segmentGap = 3; // Gap between dashes
        const segmentWidth = 5; // Width of dash line (5px)
        const numSegments = 3; // Number of dash segments
        
        // Perpendicular direction (for line width)
        const perpAngle = rotation + Math.PI / 2;
        const perpX = Math.cos(perpAngle) * segmentWidth / 2;
        const perpY = Math.sin(perpAngle) * segmentWidth / 2;
        
        // Colors: yellow and orange
        const colors = [0xffff00, 0xff8800]; // Yellow and orange
        
        for (let i = 0; i < numSegments; i++) {
            const segmentOffset = i * (segmentLength + segmentGap);
            const segX = x + offsetX - Math.cos(rotation) * segmentOffset;
            const segY = y + offsetY - Math.sin(rotation) * segmentOffset;
            
            // Alternate between yellow and orange
            const color = colors[i % colors.length];
            
            // Create line segment (dash)
            const dash = this.add.graphics();
            dash.lineStyle(segmentWidth, color, 0.9);
            
            // Draw a line perpendicular to tank direction
            const startX = segX - perpX;
            const startY = segY - perpY;
            const endX = segX + perpX;
            const endY = segY + perpY;
            
            dash.lineBetween(startX, startY, endX, endY);
            
            dash.setDepth(4);
            dash.lifeTime = 2000; // 2 seconds
            dash.startTime = this.time.now;
            
            // Fade out animation
            this.tweens.add({
                targets: dash,
                alpha: 0,
                duration: dash.lifeTime,
                onComplete: () => {
                    if (dash.active) {
                        dash.destroy();
                    }
                }
            });
            
            this.trailParticles.push(dash);
        }
    }

    updateTrailParticles(delta) {
        const now = this.time.now;
        this.trailParticles = this.trailParticles.filter(particle => {
            if (!particle.active) {
                return false;
            }
            
            // Remove particles that have exceeded their lifetime
            if (now - particle.startTime >= particle.lifeTime) {
                particle.destroy();
                return false;
            }
            
            return true;
        });
    }
}

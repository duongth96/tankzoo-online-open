const { 
    MAP_WIDTH, MAP_HEIGHT, DEFAULT_HEALTH, DEFAULT_DAMAGE, 
    BUFFED_DAMAGE, POWERUP_DURATION, RESPAWN_TIME,
    MISSILE_DAMAGE, BOMB_DAMAGE, BOMB_RADIUS, BOMB_FUSE, DEFAULT_BULLET_DISTANCE
} = require('../constants/gameConfig');
const EVENTS = require('../constants/events');
const { getMovement, getShoot } = require('../utils/protobufLoader');

class PlayerManager {
    constructor(io, gameManager, roomId) {
        this.io = io;
        this.gameManager = gameManager;
        this.roomId = roomId;
        this.players = {};
    }

    // Helper to emit to the specific room
    emitToRoom(event, data) {
        this.io.to(this.roomId).emit(event, data);
    }

    addPlayer(socket, name) {
        this.players[socket.id] = {
            rotation: 0,
            turretRotation: 0,
            x: Math.floor(Math.random() * (MAP_WIDTH - 100)) + 50,
            y: Math.floor(Math.random() * (MAP_HEIGHT - 100)) + 50,
            playerId: socket.id,
            color: Math.random() * 0xffffff,
            alpha: 1,
            isDead: false,
            damageBuff: false,
            speedBuff: false,
            powerUp: null,
            health: DEFAULT_HEALTH,
            maxHealth: DEFAULT_HEALTH,
            name: name || 'Unknown',
            score: 0,
            inventory: { missile: 0, bomb: 0 }
        };
        return this.players[socket.id];
    }

    removePlayer(socketId) {
        if (this.players[socketId]) {
            delete this.players[socketId];
            this.emitToRoom(EVENTS.DISCONNECT_PLAYER, socketId);
        }
    }

    getPlayers() {
        return this.players;
    }

    getPlayer(id) {
        return this.players[id];
    }

    handleMovement(socketId, data) {
        if (!this.players[socketId]) return;
        
        let movementData = data;
        const Movement = getMovement();

        if ((Buffer.isBuffer(data) || data instanceof Uint8Array) && Movement) {
            try {
                movementData = Movement.decode(data);
            } catch (e) {
                console.error('Error decoding movement:', e);
                return;
            }
        }

        const player = this.players[socketId];
        player.x = movementData.x;
        player.y = movementData.y;
        player.rotation = movementData.rotation;
        player.turretRotation = movementData.turretRotation;

        if (Movement) {
            const payload = {
                playerId: socketId,
                x: player.x,
                y: player.y,
                rotation: player.rotation,
                turretRotation: player.turretRotation
            };
            const buffer = Movement.encode(Movement.create(payload)).finish();
            this.emitToRoom(EVENTS.PLAYER_MOVED, buffer); // Using io.emit to broadcast to all (including sender? usually broadcast)
            // Original code used socket.broadcast.emit. 
            // Here I only have io. 
            // I should probably use socket.broadcast.emit in the handler or pass socket here.
            // But for cleaner manager code, I can use io.except(socketId).emit or just io.emit (client ignores own?)
            // Let's stick to the pattern: Manager updates state and notifies.
            // To replicate `socket.broadcast`, I need the socket.
        } else {
            // Logic handled in SocketHandler to use broadcast if needed, or I emit to all.
            // Emitting to all is fine for movement usually, though wasteful for self.
            this.emitToRoom(EVENTS.PLAYER_MOVED, player);
        }
    }

    // New helper to handle broadcast if socket is passed
    handleMovementWithSocket(socket, data) {
        if (!this.players[socket.id]) return;
        
        let movementData = data;
        const Movement = getMovement();

        if ((Buffer.isBuffer(data) || data instanceof Uint8Array) && Movement) {
            try {
                movementData = Movement.decode(data);
            } catch (e) {
                console.error('Error decoding movement:', e);
                return;
            }
        }

        const player = this.players[socket.id];
        player.x = movementData.x;
        player.y = movementData.y;
        player.rotation = movementData.rotation;
        player.turretRotation = movementData.turretRotation;

        if (Movement) {
            const payload = {
                playerId: socket.id,
                x: player.x,
                y: player.y,
                rotation: player.rotation,
                turretRotation: player.turretRotation
            };
            const buffer = Movement.encode(Movement.create(payload)).finish();
            socket.to(this.roomId).emit(EVENTS.PLAYER_MOVED, buffer);
        } else {
            socket.to(this.roomId).emit(EVENTS.PLAYER_MOVED, player);
        }
    }

    handleShoot(socket, data) {
        let shootData = data;
        const Shoot = getShoot();

        if ((Buffer.isBuffer(data) || data instanceof Uint8Array) && Shoot) {
            try {
                shootData = Shoot.decode(data);
            } catch (e) {
                console.error('Error decoding shoot:', e);
                return;
            }
        }

        let damage = DEFAULT_DAMAGE;
        let distance = DEFAULT_BULLET_DISTANCE;
        if (this.players[socket.id] && this.players[socket.id].damageBuff) {
            damage = BUFFED_DAMAGE;
        }

        if (Shoot) {
            const payload = {
                playerId: socket.id,
                x: shootData.x,
                y: shootData.y,
                rotation: shootData.rotation,
                damage: damage,
                distance: distance
            };
            const buffer = Shoot.encode(Shoot.create(payload)).finish();
            this.emitToRoom(EVENTS.BULLET_FIRED, buffer);
        } else {
            this.emitToRoom(EVENTS.BULLET_FIRED, {
                x: shootData.x,
                y: shootData.y,
                rotation: shootData.rotation,
                playerId: socket.id,
                damage: damage,
                distance: distance
            });
        }
    }

    handleHit(data) {
        const { playerId, damage, attackerId } = data;
        
        // Prevent self-damage
        if (playerId === attackerId) return;

        const player = this.players[playerId];

        if (player && !player.isDead) {
            player.health -= damage;
            
            if (player.health <= 0) {
                this.killPlayer(playerId, attackerId);
            } else {
                this.emitToRoom(EVENTS.PLAYER_HEALTH_UPDATE, {
                    playerId: playerId,
                    health: player.health
                });
            }
        }
    }

    killPlayer(victimId, attackerId) {
        const victim = this.players[victimId];
        victim.health = 0;
        victim.isDead = true;
        
        this.emitToRoom(EVENTS.PLAYER_DIED, victimId);
        
        if (attackerId && this.players[attackerId]) {
            this.players[attackerId].score += 1;
            this.emitToRoom(EVENTS.SCORE_UPDATE, {
                playerId: attackerId,
                score: this.players[attackerId].score
            });
        }

        setTimeout(() => this.respawnPlayer(victimId), RESPAWN_TIME);
    }

    respawnPlayer(playerId) {
        if (this.players[playerId]) {
            const p = this.players[playerId];
            p.isDead = false;
            p.health = DEFAULT_HEALTH;
            p.x = Math.floor(Math.random() * (MAP_WIDTH - 100)) + 50;
            p.y = Math.floor(Math.random() * (MAP_HEIGHT - 100)) + 50;
            this.emitToRoom(EVENTS.PLAYER_RESPAWNED, p);
        }
    }

    applyPowerUp(socketId, type) {
        const player = this.players[socketId];
        if (!player) return;

        // Inventory Logic
        if (type === 'missile' || type === 'bomb') {
            if (!player.inventory[type]) player.inventory[type] = 0;
            if (player.inventory[type] < 2) {
                player.inventory[type]++;
                this.io.to(socketId).emit(EVENTS.INVENTORY_UPDATE, player.inventory);
            }
            return;
        }

        // Effect Logic
        this.emitToRoom(EVENTS.APPLY_POWERUP, { playerId: socketId, type: type });

        if (type === 'health') {
            player.health += 50;
            if (player.health > player.maxHealth) player.health = player.maxHealth;
            this.emitToRoom(EVENTS.PLAYER_HEALTH_UPDATE, { playerId: socketId, health: player.health });
        } else if (type === 'speed') {
            player.speedBuff = true;
            setTimeout(() => {
                if (this.players[socketId]) {
                    this.players[socketId].speedBuff = false;
                    this.emitToRoom(EVENTS.REMOVE_POWERUP_EFFECT, { playerId: socketId, type: 'speed' });
                }
            }, POWERUP_DURATION);
        } else if (type === 'damage') {
            player.damageBuff = true;
            setTimeout(() => {
                if (this.players[socketId]) {
                    this.players[socketId].damageBuff = false;
                    this.emitToRoom(EVENTS.REMOVE_POWERUP_EFFECT, { playerId: socketId, type: 'damage' });
                }
            }, POWERUP_DURATION);
        } else if (type === 'invisible') {
            player.alpha = 0;
            this.emitToRoom(EVENTS.PLAYER_ALPHA_CHANGED, { playerId: socketId, alpha: 0 });
            setTimeout(() => {
                if (this.players[socketId]) {
                    player.alpha = 1;
                    this.emitToRoom(EVENTS.PLAYER_ALPHA_CHANGED, { playerId: socketId, alpha: 1 });
                    this.emitToRoom(EVENTS.REMOVE_POWERUP_EFFECT, { playerId: socketId, type: 'invisible' });
                }
            }, POWERUP_DURATION);
        } else if (type === 'multiShot') {
            player.multiShotBuff = true;
            setTimeout(() => {
                if (this.players[socketId]) {
                    this.players[socketId].multiShotBuff = false;
                    this.emitToRoom(EVENTS.REMOVE_POWERUP_EFFECT, { playerId: socketId, type: 'multiShot' });
                }
            }, POWERUP_DURATION);
        }
    }

    handleUseItem(socketId, itemType) {
        const player = this.players[socketId];
        if (player && player.inventory[itemType] > 0 && !player.isDead) {
            player.inventory[itemType]--;
            this.io.to(socketId).emit(EVENTS.INVENTORY_UPDATE, player.inventory);

            if (itemType === 'missile') {
                const spawnDist = 45;
                const missileData = {
                    x: player.x + Math.cos(player.turretRotation) * spawnDist,
                    y: player.y + Math.sin(player.turretRotation) * spawnDist,
                    rotation: player.turretRotation,
                    playerId: socketId,
                    damage: MISSILE_DAMAGE
                };
                this.emitToRoom(EVENTS.MISSILE_FIRED, missileData);
            } else if (itemType === 'bomb') {
                const bombId = Math.random().toString(36).substr(2, 9);
                const bombData = {
                    id: bombId,
                    x: player.x,
                    y: player.y,
                    playerId: socketId
                };
                this.emitToRoom(EVENTS.BOMB_DROPPED, bombData);

                setTimeout(() => {
                    this.handleBombExplosion(bombId, bombData.x, bombData.y, socketId);
                }, BOMB_FUSE);
            }
        }
    }

    handleBombExplosion(bombId, x, y, attackerId) {
        this.emitToRoom(EVENTS.BOMB_EXPLODED, { id: bombId, x, y });
        
        // Damage Players
        Object.keys(this.players).forEach(pId => {
            const p = this.players[pId];
            if (!p.isDead) {
                const dist = Math.sqrt((p.x - x)**2 + (p.y - y)**2);
                if (dist <= BOMB_RADIUS) {
                    p.health -= BOMB_DAMAGE;
                    if (p.health <= 0) {
                        this.killPlayer(pId, attackerId);
                    } else {
                        this.emitToRoom(EVENTS.PLAYER_HEALTH_UPDATE, { playerId: pId, health: p.health });
                    }
                }
            }
        });

        // Damage Obstacles
        // Accessing ObstacleManager via GameManager
        if (this.gameManager && this.gameManager.obstacleManager) {
            const obstacles = this.gameManager.obstacleManager.getObstacles();
            Object.keys(obstacles).forEach(obsId => {
                const obs = obstacles[obsId];
                if (obs.type === 'soft') {
                    const dist = Math.sqrt((obs.x - x)**2 + (obs.y - y)**2);
                    if (dist <= BOMB_RADIUS) {
                        // Assuming 100 damage destroys it
                         this.gameManager.obstacleManager.handleHit({ obstacleId: obsId, damage: 100 });
                    }
                }
            });
        }
    }
}

module.exports = PlayerManager;

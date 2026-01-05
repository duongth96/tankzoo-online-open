const express = require('express');
const app = express();
const server = require('http').Server(app);
const { Server } = require('socket.io');
//const io = require('socket.io')(server);
const protobuf = require('protobufjs');
const path = require('path');


const io = new Server(server, {
    cors: {
        origin: "*", // Hoặc "https://tankzoo.io.vn"
        methods: ["GET", "POST"]
    },
    allowEIO3: true // Tăng tương thích cho các bản cũ
});


let Movement, Shoot;

// Load Protobuf definitions
protobuf.load(path.join(__dirname, 'public/assets/game.proto'), (err, root) => {
    if (err) throw err;
    Movement = root.lookupType("game.Movement");
    Shoot = root.lookupType("game.Shoot");
});

const players = {};
const powerUps = {};
const obstacles = {};
const mapSeed = Math.random();
const MAP_WIDTH = 4000;
const MAP_HEIGHT = 4000;

// Generate random obstacles
const obstacleVariants = {
  hard: ['box', 'wall_h', 'wall_v', 'corner'],
  soft: ['box', 'bush', 'barrel']
};

function generateObstacles(count) {
  const generated = [];
  for (let i = 0; i < count; i++) {
    const type = Math.random() > 0.4 ? 'hard' : 'soft';
    const variants = obstacleVariants[type];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    
    // Simple random position (could be improved with grid or collision check)
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

const obstacleList = generateObstacles(150);
obstacleList.forEach(obs => {
  obstacles[obs.id] = obs;
});

const powerUpTypes = ['invisible', 'multiShot', 'speed', 'damage', 'health', 'missile', 'bomb'];

// Calculate desired powerup count based on players
function getMaxPowerUps() {
    const playerCount = Object.keys(players).length;
    // At least 50, max 150, or 10 per player
    return Math.max(50, Math.min(150, playerCount * 10));
}

// Helper to spawn powerup
function spawnPowerUp() {
  try {
    const maxPowerUps = getMaxPowerUps();
    
    if (Object.keys(powerUps).length >= maxPowerUps) return;

    const id = Math.random().toString(36).substr(2, 9);
    
    // Attempt to find a position that does not overlap with obstacles
    let x, y;
    let attempts = 0;
    let validPosition = false;
    
    while (!validPosition && attempts < 10) {
        x = Math.floor(Math.random() * (MAP_WIDTH - 100)) + 50;
        y = Math.floor(Math.random() * (MAP_HEIGHT - 100)) + 50;
        validPosition = true;
        
        // Check collision with obstacles
        for (const obsId in obstacles) {
            const obs = obstacles[obsId];
            const dist = Math.sqrt((x - obs.x) ** 2 + (y - obs.y) ** 2);
            if (dist < 80) { // If closer than 80px to an obstacle center
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

    powerUps[id] = {
      id: id,
      x: x,
      y: y,
      type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
    };
    console.log(`Spawned powerup ${id} (${powerUps[id].type}) at ${x}, ${y}`);
    io.emit('powerUpSpawned', powerUps[id]);
  } catch (err) {
    console.error('Error in spawnPowerUp:', err);
  }
}

// Function to handle spawning interval
function startPowerUpSpawner() {
  console.log('Starting PowerUp Spawner...');
  
  // Use setInterval for robust looping (won't crash the loop if an error occurs inside)
  setInterval(() => {
      try {
          const maxPowerUps = getMaxPowerUps();
          const currentCount = Object.keys(powerUps).length;
          
          if (currentCount < maxPowerUps) {
              // Calculate how many to spawn
              const needed = maxPowerUps - currentCount;
              
              // Spawn in small batches to avoid blocking event loop if many are needed
              // But ensure we spawn at least 1 if needed
              const spawnBatch = Math.min(needed, 5); 
              
              for (let i = 0; i < spawnBatch; i++) {
                  spawnPowerUp();
              }
              
              if (needed > 0) {
                  // console.log(`Refilling powerups: ${currentCount}/${maxPowerUps}. Added ${spawnBatch}.`);
              }
          }
      } catch (err) {
          console.error('Error in startPowerUpSpawner interval:', err);
      }
  }, 2000); // Check every 2 seconds
  
  // Initial fill
  try {
      const max = getMaxPowerUps();
      const current = Object.keys(powerUps).length;
      if (current < max) {
          const needed = max - current;
          console.log(`Initial powerup fill: spawning ${needed} items.`);
          for(let i=0; i<needed; i++) spawnPowerUp();
      }
  } catch(e) {
      console.error("Error in initial powerup fill:", e);
  }
}

startPowerUpSpawner();

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  const playerName = socket.handshake.query.name || 'Unknown';

  // Create a new player and add it to our players object
  players[socket.id] = {
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
    health: 100,
    maxHealth: 100,
    name: playerName,
    score: 0
  };

  // Send the players object to the new player
  socket.emit('currentPlayers', players);
  // Send current powerups
  socket.emit('currentPowerUps', powerUps);
  // Send obstacles
  socket.emit('currentObstacles', obstacles);
  // Send map seed
  socket.emit('mapSeed', mapSeed);

  // Update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // When a player disconnects, remove them from our players object
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    // Emit a message to all players to remove this player
    io.emit('disconnectPlayer', socket.id);
  });

  // When a player moves, update the player data
  socket.on('playerMovement', (data) => {
    let movementData = data;
    
    // Check if data is binary (buffer)
    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
        try {
            if (Movement) {
                movementData = Movement.decode(data);
            }
        } catch (e) {
            console.error('Error decoding movement:', e);
            return;
        }
    }

    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    players[socket.id].turretRotation = movementData.turretRotation;
    
    // Emit a message to all players about the player that moved using Protobuf
    if (Movement) {
        const payload = {
            playerId: socket.id,
            x: players[socket.id].x,
            y: players[socket.id].y,
            rotation: players[socket.id].rotation,
            turretRotation: players[socket.id].turretRotation
        };
        const buffer = Movement.encode(Movement.create(payload)).finish();
        socket.broadcast.emit('playerMoved', buffer);
    } else {
        socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // Handle shooting
  socket.on('playerShoot', (data) => {
    let shootData = data;

    // Check if data is binary (buffer)
    if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
        try {
            if (Shoot) {
                shootData = Shoot.decode(data);
            }
        } catch (e) {
            console.error('Error decoding shoot:', e);
            return;
        }
    }

    let damage = 20;
    if (players[socket.id] && players[socket.id].damageBuff) {
      damage = 40;
    }
    
    if (Shoot) {
        const payload = {
            playerId: socket.id,
            x: shootData.x,
            y: shootData.y,
            rotation: shootData.rotation,
            damage: damage
        };
        const buffer = Shoot.encode(Shoot.create(payload)).finish();
        socket.broadcast.emit('bulletFired', buffer);
    } else {
        socket.broadcast.emit('bulletFired', {
            x: shootData.x,
            y: shootData.y,
            rotation: shootData.rotation,
            playerId: socket.id,
            damage: damage
        });
    }
  });

  // Handle player hit
  socket.on('playerHit', (data) => {
    if (players[data.playerId] && !players[data.playerId].isDead) {
      // Update player health and check for death
      players[data.playerId].health -= data.damage;
      
      if (players[data.playerId].health <= 0) {
        players[data.playerId].health = 0;
        players[data.playerId].isDead = true;
        
        // Notify everyone that this player died
        io.emit('playerDied', data.playerId);
        
        // Increase score for the shooter (attackerId need to be passed in bulletHit)
        // Since we don't have attackerId in bulletHit data here (based on previous code), 
        // we might need to rely on the client sending who shot it, OR better, 
        // the client sends 'bulletHit' but the server should probably track who shot the bullet if we want to be secure.
        // For now, let's assume the client sends attackerId in bulletHit event.
        
        if (data.attackerId && players[data.attackerId]) {
          players[data.attackerId].score += 1;
          io.emit('scoreUpdate', {
            playerId: data.attackerId,
            score: players[data.attackerId].score
          });
        }

        // Respawn after 3 seconds
        setTimeout(() => {
          if (players[data.playerId]) {
            players[data.playerId].isDead = false;
            players[data.playerId].health = 100;
            players[data.playerId].x = Math.floor(Math.random() * (MAP_WIDTH - 100)) + 50;
            players[data.playerId].y = Math.floor(Math.random() * (MAP_HEIGHT - 100)) + 50;
            io.emit('playerRespawned', players[data.playerId]);
          }
        }, 3000);
      } else {
        io.emit('playerHealthUpdate', {
          playerId: data.playerId,
          health: players[data.playerId].health
        });
      }
    }
  });

  // Handle obstacle hit
  socket.on('obstacleHit', (data) => {
    if (obstacles[data.obstacleId] && obstacles[data.obstacleId].type === 'soft') {
      obstacles[data.obstacleId].health -= data.damage;
      if (obstacles[data.obstacleId].health <= 0) {
        delete obstacles[data.obstacleId];
        io.emit('obstacleRemoved', data.obstacleId);
      } else {
        io.emit('obstacleHealthUpdate', {
          id: data.obstacleId,
          health: obstacles[data.obstacleId].health
        });
      }
    }
  });

  // Handle powerup collection
  socket.on('powerUpCollected', (powerUpId) => {
    if (powerUps[powerUpId]) {
      const type = powerUps[powerUpId].type;
      delete powerUps[powerUpId];
      io.emit('powerUpRemoved', powerUpId);
      
      if (players[socket.id]) {
          // Inventory items
          if (type === 'missile' || type === 'bomb') {
              if (!players[socket.id].inventory) {
                  players[socket.id].inventory = { missile: 0, bomb: 0 };
              }
              if (!players[socket.id].inventory[type]) {
                  players[socket.id].inventory[type] = 0;
              }
              if (players[socket.id].inventory[type] < 2) {
                  players[socket.id].inventory[type]++;
                  socket.emit('inventoryUpdate', players[socket.id].inventory);
              }
          } else {
              // Immediate effect items
              // Notify player of powerup effect
              socket.emit('applyPowerUp', type);
              
              if (type === 'health') {
                  players[socket.id].health += 50;
                  if (players[socket.id].health > 100) players[socket.id].health = 100;
                  io.emit('playerHealthUpdate', {
                    playerId: socket.id,
                    health: players[socket.id].health
                  });
              } else if (type === 'speed') {
                  players[socket.id].speedBuff = true;
                  setTimeout(() => {
                    if (players[socket.id]) {
                      players[socket.id].speedBuff = false;
                      socket.emit('removePowerUpEffect', 'speed');
                    }
                  }, 10000);
              } else if (type === 'damage') {
                  players[socket.id].damageBuff = true;
                  setTimeout(() => {
                    if (players[socket.id]) {
                      players[socket.id].damageBuff = false;
                      socket.emit('removePowerUpEffect', 'damage');
                    }
                  }, 10000);
              } else if (type === 'invisible') {
                  players[socket.id].alpha = 0; // Completely invisible to others
                  socket.broadcast.emit('playerAlphaChanged', { playerId: socket.id, alpha: 0 });
                  
                  setTimeout(() => {
                    if (players[socket.id]) {
                      players[socket.id].alpha = 1;
                      io.emit('playerAlphaChanged', { playerId: socket.id, alpha: 1 });
                    }
                  }, 10000);
              }
          }
      }
    }
  });

  // Handle item usage
  socket.on('useItem', (itemType) => {
      const player = players[socket.id];
      if (player && player.inventory && player.inventory[itemType] > 0 && !player.isDead) {
          player.inventory[itemType]--;
          socket.emit('inventoryUpdate', player.inventory);
          
          if (itemType === 'missile') {
              // Missile logic: Fires a special projectile
              const spawnDist = 45;
              const missileData = {
                  x: player.x + Math.cos(player.turretRotation) * spawnDist,
                  y: player.y + Math.sin(player.turretRotation) * spawnDist,
                  rotation: player.turretRotation, // Fire in turret direction
                  playerId: socket.id,
                  damage: 1000 // One shot kill
              };
              // We can reuse bulletFired but with a type field or a separate event
              // Let's use a new event for clarity and custom handling on client
              io.emit('missileFired', missileData);
              
           } else if (itemType === 'bomb') {
              // Bomb logic: Drops at current location
              const bombId = Math.random().toString(36).substr(2, 9);
              const bombData = {
                  id: bombId,
                  x: player.x,
                  y: player.y,
                  playerId: socket.id
              };
              io.emit('bombDropped', bombData);
              
              // Explode after 3 seconds
              setTimeout(() => {
                  io.emit('bombExploded', { id: bombId, x: bombData.x, y: bombData.y });
                  
                  // Calculate AoE damage on server
                  const explosionRadius = 150;
                  Object.keys(players).forEach(pId => {
                      const p = players[pId];
                      if (!p.isDead) {
                          const dist = Math.sqrt((p.x - bombData.x)**2 + (p.y - bombData.y)**2);
                          if (dist <= explosionRadius) {
                              // Full damage (100) if close, less if far? Or just flat damage.
                              // User said "bomb affects a wide area". Let's give significant damage.
                              const dmg = 80;
                              p.health -= dmg;
                              if (p.health <= 0) {
                                  p.health = 0;
                                  p.isDead = true;
                                  io.emit('playerDied', pId);
                                  // Credit score to bomber
                                  if (players[socket.id]) {
                                      players[socket.id].score += 1;
                                      io.emit('scoreUpdate', { playerId: socket.id, score: players[socket.id].score });
                                  }
                                  
                                  // Respawn logic (duplicated from playerHit, maybe refactor later)
                                  setTimeout(() => {
                                    if (players[pId]) {
                                        players[pId].isDead = false;
                                        players[pId].health = 100;
                                        players[pId].x = Math.floor(Math.random() * (MAP_WIDTH - 100)) + 50;
                                        players[pId].y = Math.floor(Math.random() * (MAP_HEIGHT - 100)) + 50;
                                        io.emit('playerRespawned', players[pId]);
                                    }
                                  }, 3000);
                              } else {
                                  io.emit('playerHealthUpdate', { playerId: pId, health: p.health });
                              }
                          }
                      }
                  });
                  
                  // Also damage obstacles
                  Object.keys(obstacles).forEach(obsId => {
                      const obs = obstacles[obsId];
                      if (obs.type === 'soft') {
                          const dist = Math.sqrt((obs.x - bombData.x)**2 + (obs.y - bombData.y)**2);
                          if (dist <= explosionRadius) {
                              obs.health -= 100; // Destroy soft obstacles
                              if (obs.health <= 0) {
                                  delete obstacles[obsId];
                                  io.emit('obstacleRemoved', obsId);
                              } else {
                                  io.emit('obstacleHealthUpdate', { id: obsId, health: obs.health });
                              }
                          }
                      }
                  });
                  
              }, 2000); // 2 seconds fuse
          }
      }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  input: {
    // keyboard: {
    //   disableGlobalCapture: true,
    //   capture: ['left', 'up', 'down', 'space', 'shift'] // exclude 'right'
    // },
    // mouse: {
    //   disableGlobalCapture: true,  // disable right-click context menu
    //   capture: ['left']             // only capture left mouse button
    // }
  }
};

window.launchGame = function(playerName) {
  window.currentPlayerName = playerName;
  new Phaser.Game(config);
};

function preload() {
  // We'll create textures programmatically in 'create' instead of loading images
}

function create() {
  const self = this;
  
  // Load Protobuf definitions
  protobuf.load("/assets/game.proto", function(err, root) {
      if (err) throw err;
      self.Movement = root.lookupType("game.Movement");
      self.Shoot = root.lookupType("game.Shoot");
  });

  this.socket = io({
    transports: ['polling','websocket'],
    upgrade: true,
    reconnectionAttempts: 5,
    query: {
      name: window.currentPlayerName
    }
  });
  this.otherPlayers = this.physics.add.group();
  this.bullets = this.physics.add.group();
  this.powerUps = this.physics.add.group();
  this.missiles = this.physics.add.group();
  this.bombs = this.physics.add.group(); // Visual only group for bombs
  this.obstacles = this.physics.add.staticGroup();

  // Create tank body texture
  const bodyGraphics = this.make.graphics({ x: 0, y: 0, add: false });
  bodyGraphics.fillStyle(0xffffff, 1);
  bodyGraphics.fillRect(0, 0, 40, 30);
  bodyGraphics.generateTexture('tankBody', 40, 30);

  // Create turret texture
  const turretGraphics = this.make.graphics({ x: 0, y: 0, add: false });
  turretGraphics.fillStyle(0x888888, 1); // Darker color for turret
  turretGraphics.fillRect(0, 0, 30, 10);
  turretGraphics.lineStyle(1, 0x000000, 1); // Add outline
  turretGraphics.strokeRect(0, 0, 30, 10);
  turretGraphics.generateTexture('tankTurret', 30, 10);

  // Create bullet texture (centered)
  const bulletGraphics = this.make.graphics({ x: 0, y: 0, add: false });
  bulletGraphics.fillStyle(0xff0000, 1);
  bulletGraphics.fillRect(-5, -2.5, 10, 5); // Center the rectangle
  bulletGraphics.generateTexture('bullet', 10, 5);

  // Create shadow texture
  const shadowGraphics = this.make.graphics({ x: 0, y: 0, add: false });
  shadowGraphics.fillStyle(0x000000, 0.3);
  shadowGraphics.fillRect(0, 0, 40, 40);
  shadowGraphics.generateTexture('shadow', 40, 40);

  // Create powerup textures
  const p1 = this.make.graphics({ x: 0, y: 0, add: false });
  p1.fillStyle(0x00ff00, 1);
  p1.fillCircle(10, 10, 10);
  p1.generateTexture('powerup_invisible', 20, 20);

  const p2 = this.make.graphics({ x: 0, y: 0, add: false });
  p2.fillStyle(0xff00ff, 1);
  p2.fillCircle(10, 10, 10);
  p2.generateTexture('powerup_multiShot', 20, 20);

  // Powerup: Speed (Blue)
  const p3 = this.make.graphics({ x: 0, y: 0, add: false });
  p3.fillStyle(0x0000ff, 1);
  p3.fillCircle(10, 10, 10);
  p3.generateTexture('powerup_speed', 20, 20);

  // Powerup: Damage (Red)
  const p4 = this.make.graphics({ x: 0, y: 0, add: false });
  p4.fillStyle(0xff0000, 1);
  p4.fillCircle(10, 10, 10);
  p4.generateTexture('powerup_damage', 20, 20);

  // Powerup: Health (White with Red Cross - simplified to Green for now or White)
  const p5 = this.make.graphics({ x: 0, y: 0, add: false });
  p5.fillStyle(0xffffff, 1);
  p5.fillCircle(10, 10, 10);
  p5.fillStyle(0xff0000, 1);
  p5.fillRect(8, 4, 4, 12);
  p5.fillRect(4, 8, 12, 4);
  p5.generateTexture('powerup_health', 20, 20);

  // Powerup: Missile (Cyan)
  const p6 = this.make.graphics({ x: 0, y: 0, add: false });
  p6.fillStyle(0x00ffff, 1);
  p6.fillCircle(10, 10, 10);
  p6.fillStyle(0x000000, 1);
  p6.fillTriangle(10, 4, 4, 16, 16, 16);
  p6.generateTexture('powerup_missile', 20, 20);

  // Powerup: Bomb (Black)
  const p7 = this.make.graphics({ x: 0, y: 0, add: false });
  p7.fillStyle(0x000000, 1);
  p7.fillCircle(10, 10, 10);
  p7.fillStyle(0xff0000, 1);
  p7.fillCircle(10, 10, 4);
  p7.generateTexture('powerup_bomb', 20, 20);

  // Create obstacle textures
  // Hard Obstacle: Box
  const hObs = this.make.graphics({ x: 0, y: 0, add: false });
  hObs.fillStyle(0x666666, 1);
  hObs.fillRect(0, 0, 40, 40);
  hObs.lineStyle(2, 0x000000, 1);
  hObs.strokeRect(0, 0, 40, 40);
  hObs.generateTexture('obstacle_hard_box', 40, 40);

  // Hard Obstacle: Wall Horizontal
  const hObsWallH = this.make.graphics({ x: 0, y: 0, add: false });
  hObsWallH.fillStyle(0x555555, 1);
  hObsWallH.fillRect(0, 0, 120, 40);
  hObsWallH.lineStyle(2, 0x000000, 1);
  hObsWallH.strokeRect(0, 0, 120, 40);
  hObsWallH.generateTexture('obstacle_hard_wall_h', 120, 40);

  // Hard Obstacle: Wall Vertical
  const hObsWallV = this.make.graphics({ x: 0, y: 0, add: false });
  hObsWallV.fillStyle(0x555555, 1);
  hObsWallV.fillRect(0, 0, 40, 120);
  hObsWallV.lineStyle(2, 0x000000, 1);
  hObsWallV.strokeRect(0, 0, 40, 120);
  hObsWallV.generateTexture('obstacle_hard_wall_v', 40, 120);

  // Hard Obstacle: Corner
  const hObsCorner = this.make.graphics({ x: 0, y: 0, add: false });
  hObsCorner.fillStyle(0x555555, 1);
  hObsCorner.fillRect(0, 0, 80, 40);
  hObsCorner.fillRect(0, 40, 40, 40);
  hObsCorner.lineStyle(2, 0x000000, 1);
  hObsCorner.strokeRect(0, 0, 80, 40);
  hObsCorner.strokeRect(0, 40, 40, 40);
  hObsCorner.generateTexture('obstacle_hard_corner', 80, 80);

  // Soft Obstacle: Box
  const sObs = this.make.graphics({ x: 0, y: 0, add: false });
  sObs.fillStyle(0x8b4513, 1);
  sObs.fillRect(0, 0, 40, 40);
  sObs.lineStyle(2, 0x4b2506, 1);
  sObs.strokeRect(0, 0, 40, 40);
  sObs.generateTexture('obstacle_soft_box', 40, 40);

  // Soft Obstacle: Bush (Circle)
  const sObsBush = this.make.graphics({ x: 0, y: 0, add: false });
  sObsBush.fillStyle(0x228b22, 1);
  sObsBush.fillCircle(20, 20, 20);
  sObsBush.lineStyle(2, 0x006400, 1);
  sObsBush.strokeCircle(20, 20, 20);
  sObsBush.generateTexture('obstacle_soft_bush', 40, 40);

  // Soft Obstacle: Barrel (Circle)
  const sObsBarrel = this.make.graphics({ x: 0, y: 0, add: false });
  sObsBarrel.fillStyle(0x708090, 1);
  sObsBarrel.fillCircle(15, 15, 15);
  sObsBarrel.lineStyle(2, 0x2f4f4f, 1);
  sObsBarrel.strokeCircle(15, 15, 15);
  sObsBarrel.generateTexture('obstacle_soft_barrel', 30, 30);

  // Create ground textures (Lighter colors for better visibility of objects)
  const g1 = this.make.graphics({ x: 0, y: 0, add: false });
  g1.fillStyle(0xd5e8d4, 1); // Light Grass (Pale Green)
  g1.fillRect(0, 0, 40, 40);
  g1.lineStyle(1, 0xc0dcc0, 1);
  g1.strokeRect(0, 0, 40, 40);
  g1.generateTexture('ground_grass', 40, 40);

  const g2 = this.make.graphics({ x: 0, y: 0, add: false });
  g2.fillStyle(0xf5f5f5, 1); // Light Dirt (Very Pale Gray/Brown)
  g2.fillRect(0, 0, 40, 40);
  g2.lineStyle(1, 0xe0e0e0, 1);
  g2.strokeRect(0, 0, 40, 40);
  g2.generateTexture('ground_dirt', 40, 40);

  const g3 = this.make.graphics({ x: 0, y: 0, add: false });
  g3.fillStyle(0xfff2cc, 1); // Light Sand (Pale Yellow)
  g3.fillRect(0, 0, 40, 40);
  g3.lineStyle(1, 0xffe699, 1);
  g3.strokeRect(0, 0, 40, 40);
  g3.generateTexture('ground_sand', 40, 40);

  this.socket.on('mapSeed', (seed) => {
    generateBackground(self, seed);
    
    // Set world bounds
    self.physics.world.setBounds(0, 0, 2000, 2000);
    self.cameras.main.setBounds(0, 0, 2000, 2000);
  });

  this.socket.on('scoreUpdate', (data) => {
      if (window.allPlayersData) {
          if (window.allPlayersData[data.playerId]) {
              window.allPlayersData[data.playerId].score = data.score;
              updateLeaderboardUI();
          }
      }
  });

function updateLeaderboardUI() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList || !window.allPlayersData) return;
    
    // Convert object to array and sort by score (descending)
    const sortedPlayers = Object.values(window.allPlayersData).sort((a, b) => {
        return (b.score || 0) - (a.score || 0);
    });
    
    // Take top 5
    const topPlayers = sortedPlayers.slice(0, 5);
    
    // Build HTML
    leaderboardList.innerHTML = topPlayers.map((player, index) => {
        return `<li><span>${index + 1}. ${player.name}</span><span>${player.score || 0}</span></li>`;
    }).join('');
}

  // Maintain a global list of player data for leaderboard
  window.allPlayersData = {};

  // Update window.allPlayersData on events
  this.socket.on('currentPlayers', (players) => {
      window.allPlayersData = players;
      updateLeaderboardUI();
      // ... existing logic ...
      Object.keys(players).forEach((id) => {
          if (players[id].playerId === self.socket.id) {
              addPlayer(self, players[id]);
          } else {
              addOtherPlayers(self, players[id]);
          }
      });
  });

  this.socket.on('newPlayer', (playerInfo) => {
      window.allPlayersData[playerInfo.playerId] = playerInfo;
      updateLeaderboardUI();
      addOtherPlayers(self, playerInfo);
  });

  this.socket.on('disconnectPlayer', (playerId) => {
      if (window.allPlayersData[playerId]) {
          delete window.allPlayersData[playerId];
          updateLeaderboardUI();
      }
      self.otherPlayers.getChildren().forEach((otherPlayer) => {
          if (playerId === otherPlayer.playerId) {
              if (otherPlayer.shadow) otherPlayer.shadow.destroy();
              if (otherPlayer.turret) otherPlayer.turret.destroy();
              if (otherPlayer.healthBar) otherPlayer.healthBar.destroy();
              if (otherPlayer.nameText) otherPlayer.nameText.destroy();
              otherPlayer.destroy();
          }
      });
  });

  this.socket.on('currentObstacles', (obstacles) => {
    Object.keys(obstacles).forEach((id) => {
      displayObstacle(self, obstacles[id]);
    });
  });

  this.socket.on('obstacleHealthUpdate', (data) => {
    self.obstacles.getChildren().forEach((obstacle) => {
      if (obstacle.id === data.id) {
        obstacle.setAlpha(0.2 + (data.health / 100) * 0.8);
      }
    });
  });

  this.socket.on('obstacleRemoved', (id) => {
    self.obstacles.getChildren().forEach((obstacle) => {
      if (obstacle.id === id) {
        if (obstacle.shadow) obstacle.shadow.destroy();
        obstacle.destroy();
      }
    });
  });

  this.socket.on('currentPowerUps', (powerUps) => {
    Object.keys(powerUps).forEach((id) => {
      displayPowerUp(self, powerUps[id]);
    });
  });

  this.socket.on('powerUpSpawned', (powerUpInfo) => {
    displayPowerUp(self, powerUpInfo);
  });

  this.socket.on('powerUpRemoved', (powerUpId) => {
    self.powerUps.getChildren().forEach((powerUp) => {
      if (powerUp.id === powerUpId) {
        if (powerUp.shadow) powerUp.shadow.destroy();
        powerUp.destroy();
      }
    });
  });

  this.socket.on('playerAlphaChanged', (data) => {
    self.otherPlayers.getChildren().forEach((otherPlayer) => {
      if (otherPlayer.playerId === data.playerId) {
        otherPlayer.setAlpha(data.alpha);
        if (otherPlayer.turret) otherPlayer.turret.setAlpha(data.alpha);
        if (otherPlayer.nameText) otherPlayer.nameText.setAlpha(data.alpha);
        if (otherPlayer.shadow) otherPlayer.shadow.setAlpha(data.alpha);
        if (otherPlayer.healthBar) otherPlayer.healthBar.setAlpha(data.alpha);
      }
    });
  });

  this.socket.on('applyPowerUp', (type) => {
    if (type === 'invisible') {
      self.tank.setAlpha(0.3);
      self.turret.setAlpha(0.3);
      if (self.playerNameText) self.playerNameText.setAlpha(0.3);
      setTimeout(() => {
        if (self.tank) {
          self.tank.setAlpha(1);
          self.turret.setAlpha(1);
          if (self.playerNameText) self.playerNameText.setAlpha(1);
        }
      }, 10000);
    } else if (type === 'multiShot') {
      self.multiShotActive = true;
      setTimeout(() => {
        self.multiShotActive = false;
      }, 10000);
    } else if (type === 'speed') {
      self.moveSpeed = 350; // Boost speed
    } else if (type === 'damage') {
      // Visual feedback for damage boost
      self.tank.setTint(0xff0000); 
    }
  });

  this.socket.on('removePowerUpEffect', (type) => {
    if (type === 'speed') {
        self.moveSpeed = 200; // Reset speed
    } else if (type === 'damage') {
        self.tank.clearTint(); // Reset tint
        self.tank.setTint(self.tank.playerColor); // Restore original color
    }
  });

  this.socket.on('playerMoved', (data) => {
    let playerInfo = data;
    // Decode Protobuf if received binary
    if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        try {
            if (self.Movement) {
                playerInfo = self.Movement.decode(new Uint8Array(data));
            }
        } catch (e) {
            console.error('Error decoding playerMoved:', e);
            return;
        }
    }

    self.otherPlayers.getChildren().forEach((otherPlayer) => {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
        if (otherPlayer.shadow) otherPlayer.shadow.setPosition(playerInfo.x + 5, playerInfo.y + 5);
        if (otherPlayer.turret) {
          otherPlayer.turret.setPosition(playerInfo.x, playerInfo.y);
          otherPlayer.turret.setRotation(playerInfo.turretRotation);
        }
        if (otherPlayer.nameText) {
          otherPlayer.nameText.setPosition(playerInfo.x, playerInfo.y - 40);
        }
        if (otherPlayer.healthBar) {
          otherPlayer.healthBar.x = playerInfo.x - 20;
          otherPlayer.healthBar.y = playerInfo.y - 30;
        }
      }
    });
  });

  this.socket.on('bulletFired', (data) => {
    let bulletData = data;
    // Decode Protobuf if received binary
    if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        try {
            if (self.Shoot) {
                bulletData = self.Shoot.decode(new Uint8Array(data));
            }
        } catch (e) {
            console.error('Error decoding bulletFired:', e);
            return;
        }
    }

    const bullet = self.bullets.create(bulletData.x, bulletData.y, 'bullet');
    if (bullet) {
      bullet.setRotation(bulletData.rotation);
      bullet.setDepth(5); // Bullet above tanks and obstacles
      bullet.damage = bulletData.damage;
      bullet.attackerId = bulletData.playerId;
      bullet.startX = bulletData.x;
      bullet.startY = bulletData.y;
      self.physics.velocityFromRotation(bulletData.rotation, 500, bullet.body.velocity);
      
      // Add collision between this bullet and the local player
      if (self.tank) {
          self.physics.add.overlap(self.tank, bullet, function() {
              bullet.destroy();
              self.socket.emit('playerHit', { playerId: self.socket.id, damage: bullet.damage, attackerId: bullet.attackerId });
          }, null, self);
      }
    }
  });

  this.socket.on('missileFired', (data) => {
      // Create missile sprite
      const missile = self.missiles.create(data.x, data.y, 'powerup_missile');
      missile.setRotation(data.rotation);
      missile.setDepth(5);
      missile.damage = data.damage;
      missile.attackerId = data.playerId;
      
      self.physics.velocityFromRotation(data.rotation, 600, missile.body.velocity);
      
      // Collision with local player
      if (self.tank) {
          self.physics.add.overlap(self.tank, missile, function() {
              missile.destroy();
              self.socket.emit('playerHit', { playerId: self.socket.id, damage: missile.damage, attackerId: missile.attackerId });
          }, null, self);
      }
  });

  this.socket.on('bombDropped', (data) => {
      // Create bomb sprite
      const bomb = self.bombs.create(data.x, data.y, 'powerup_bomb');
      bomb.setDepth(1);
      
      // Explosion effect after 2 seconds
      setTimeout(() => {
          if (bomb.scene) { // Check if bomb still exists (scene active)
              // Visual explosion
              const explosion = self.add.circle(bomb.x, bomb.y, 10, 0xff0000, 0.5);
              explosion.setDepth(10);
              
              self.tweens.add({
                  targets: explosion,
                  scale: 15, // 150px radius
                  alpha: 0,
                  duration: 500,
                  onComplete: () => { explosion.destroy(); }
              });
              
              // Check damage to local player
              if (self.tank && !self.tank.isDead) {
                  const dist = Phaser.Math.Distance.Between(self.tank.x, self.tank.y, bomb.x, bomb.y);
                  if (dist < 150) {
                      // Damage inversely proportional to distance? Or flat damage?
                      // Let's say 50 damage
                      self.socket.emit('playerHit', { playerId: self.socket.id, damage: 50, attackerId: data.playerId });
                  }
              }
              
              bomb.destroy();
          }
      }, 2000);
  });

  this.socket.on('playerHealthUpdate', (data) => {
    if (self.socket.id === data.playerId) {
      self.tank.health = data.health;
      updateHealthBar(self.tank.healthBar, self.tank.health);
    } else {
      self.otherPlayers.getChildren().forEach((otherPlayer) => {
        if (otherPlayer.playerId === data.playerId) {
          otherPlayer.health = data.health;
          updateHealthBar(otherPlayer.healthBar, otherPlayer.health);
        }
      });
    }
  });

  this.socket.on('playerDied', (playerId) => {
    if (self.socket.id === playerId) {
      // Show popup
      document.getElementById('respawnOverlay').style.display = 'flex';
      let count = 3;
      document.getElementById('respawnCount').innerText = count;
      const interval = setInterval(() => {
        count--;
        if (count > 0) {
            document.getElementById('respawnCount').innerText = count;
        } else {
            clearInterval(interval);
        }
      }, 1000);
      
      // Hide my tank components
      self.tank.setActive(false).setVisible(false);
      self.turret.setActive(false).setVisible(false);
      self.tankShadow.setActive(false).setVisible(false);
      self.playerNameText.setActive(false).setVisible(false);
      self.tank.healthBar.clear();
    } else {
      // Hide other player components
      self.otherPlayers.getChildren().forEach((otherPlayer) => {
        if (otherPlayer.playerId === playerId) {
            otherPlayer.setActive(false).setVisible(false);
            if (otherPlayer.turret) otherPlayer.turret.setActive(false).setVisible(false);
            if (otherPlayer.shadow) otherPlayer.shadow.setActive(false).setVisible(false);
            if (otherPlayer.nameText) otherPlayer.nameText.setActive(false).setVisible(false);
            if (otherPlayer.healthBar) otherPlayer.healthBar.clear();
        }
      });
    }
  });

  this.socket.on('playerRespawned', (playerInfo) => {
    if (self.socket.id === playerInfo.playerId) {
      // Hide popup
      document.getElementById('respawnOverlay').style.display = 'none';
      
      // Show my tank
      self.tank.setActive(true).setVisible(true);
      self.turret.setActive(true).setVisible(true);
      self.tankShadow.setActive(true).setVisible(true);
      self.playerNameText.setActive(true).setVisible(true);
      
      self.tank.setPosition(playerInfo.x, playerInfo.y);
      self.tank.health = playerInfo.health;
      updateHealthBar(self.tank.healthBar, self.tank.health);
    } else {
      self.otherPlayers.getChildren().forEach((otherPlayer) => {
        if (otherPlayer.playerId === playerInfo.playerId) {
          // Show other player
          otherPlayer.setActive(true).setVisible(true);
          if (otherPlayer.turret) otherPlayer.turret.setActive(true).setVisible(true);
          if (otherPlayer.shadow) otherPlayer.shadow.setActive(true).setVisible(true);
          if (otherPlayer.nameText) otherPlayer.nameText.setActive(true).setVisible(true);

          otherPlayer.setPosition(playerInfo.x, playerInfo.y);
          otherPlayer.health = playerInfo.health;
          updateHealthBar(otherPlayer.healthBar, otherPlayer.health);
        }
      });
    }
  });

  // Collision between bullets and other players
  this.physics.add.overlap(this.otherPlayers, this.bullets, function(otherPlayer, bullet) {
    bullet.destroy();
  }, null, this);

  // Collision between missiles and other players (Visual/Logic cleanup)
  this.physics.add.overlap(this.otherPlayers, this.missiles, function(otherPlayer, missile) {
      missile.destroy();
      // Logic handled by the hit player sending 'playerHit'
  }, null, this);

  // Collision between bullets and obstacles
  this.physics.add.collider(this.bullets, this.obstacles, function(bullet, obstacle) {
    if (obstacle.type === 'soft') {
      self.socket.emit('obstacleHit', { obstacleId: obstacle.id, damage: bullet.damage || 20 });
    }
    bullet.destroy();
  }, null, this);

  // Collision between missiles and obstacles
  this.physics.add.collider(this.missiles, this.obstacles, function(missile, obstacle) {
      if (obstacle.type === 'soft') {
          self.socket.emit('obstacleHit', { obstacleId: obstacle.id, damage: missile.damage || 100 });
      }
      missile.destroy();
      
      // Missile explosion effect on hit
      const explosion = self.add.circle(missile.x, missile.y, 5, 0xffaa00, 0.8);
      explosion.setDepth(10);
      self.tweens.add({
          targets: explosion,
          scale: 5,
          alpha: 0,
          duration: 200,
          onComplete: () => { explosion.destroy(); }
      });
  }, null, this);

  
  // Inventory UI
  this.inventoryUI = this.add.container(this.cameras.main.width / 2, this.cameras.main.height - 50);
  this.inventoryUI.setScrollFactor(0); // Fixed to camera
  this.inventoryUI.setDepth(20);

  const invBg = this.add.graphics();
  invBg.fillStyle(0x000000, 0.5);
  invBg.fillRoundedRect(-100, -30, 200, 60, 10);
  this.inventoryUI.add(invBg);

  // Slot 1: Missile
  const slot1 = this.add.image(-50, 0, 'powerup_missile').setDisplaySize(30, 30);
  const text1 = this.add.text(-50, 20, '1', { fontSize: '12px', fill: '#ffffff' }).setOrigin(0.5);
  this.missileCountText = this.add.text(-30, -20, '0', { fontSize: '16px', fill: '#ffff00', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
  
  // Slot 2: Bomb
  const slot2 = this.add.image(50, 0, 'powerup_bomb').setDisplaySize(30, 30);
  const text2 = this.add.text(50, 20, '2', { fontSize: '12px', fill: '#ffffff' }).setOrigin(0.5);
  this.bombCountText = this.add.text(70, -20, '0', { fontSize: '16px', fill: '#ffff00', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);

  this.inventoryUI.add([slot1, text1, this.missileCountText, slot2, text2, this.bombCountText]);

  // Socket listener for inventory
  this.socket.on('inventoryUpdate', (inventory) => {
      if (this.missileCountText) this.missileCountText.setText(inventory.missile || 0);
      if (this.bombCountText) this.bombCountText.setText(inventory.bomb || 0);
  });

  // Input keys for items
  this.input.keyboard.on('keydown-ONE', () => {
      this.socket.emit('useItem', 'missile');
  });
  this.input.keyboard.on('keydown-TWO', () => {
      this.socket.emit('useItem', 'bomb');
  });
  
  this.moveSpeed = 200; // Default speed
  this.cursors = this.input.keyboard.createCursorKeys();
  this.wasd = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });
  this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  this.lastFired = 0;
}

function update(time, delta) {
  if (this.tank) {
    // Turret follows mouse (relative to camera)
    const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);
    const angle = Phaser.Math.Angle.Between(this.tank.x, this.tank.y, worldPoint.x, worldPoint.y);
    this.turret.setRotation(angle);
    this.turret.setPosition(this.tank.x, this.tank.y);
    this.tankShadow.setPosition(this.tank.x + 5, this.tank.y + 5);

    // Update name position
    if (this.playerNameText) {
      this.playerNameText.setPosition(this.tank.x, this.tank.y - 40);
    }

    // Update health bar position
    this.tank.healthBar.x = this.tank.x - 20;
    this.tank.healthBar.y = this.tank.y - 30;

    // Movement logic (Directional movement without body rotation)
    let vx = 0;
    let vy = 0;
    
    // Horizontal movement
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      vx = -this.moveSpeed;
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      vx = this.moveSpeed;
    }

    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      vy = -this.moveSpeed;
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      vy = this.moveSpeed;
    }

    // Normalize velocity for diagonal movement
    if (vx !== 0 && vy !== 0) {
      const factor = 1 / Math.sqrt(2);
      vx *= factor;
      vy *= factor;
    }

    this.tank.setVelocity(vx, vy);

    // Rotate tank body based on movement direction
    if (vx !== 0 || vy !== 0) {
        this.tank.setRotation(Math.atan2(vy, vx));
        this.tankShadow.setRotation(this.tank.rotation);
    }

    // Shooting logic with cooldown
    if ((Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.input.activePointer.isDown) && time > this.lastFired) {
      const shoot = (rot) => {
        // Spawn bullet slightly in front of the turret
        const spawnX = this.tank.x + Math.cos(rot) * 40;
        const spawnY = this.tank.y + Math.sin(rot) * 40;
        
        const bullet = this.bullets.create(spawnX, spawnY, 'bullet');
        if (bullet) {
          bullet.setRotation(rot);
          bullet.setDepth(3); // Bullet above tanks and obstacles
          bullet.startX = spawnX;
          bullet.startY = spawnY;
          this.physics.velocityFromRotation(rot, 500, bullet.body.velocity);
          
          if (this.Shoot) {
            const message = this.Shoot.create({ x: spawnX, y: spawnY, rotation: rot });
            const buffer = this.Shoot.encode(message).finish();
            this.socket.emit('playerShoot', buffer);
          } else {
            this.socket.emit('playerShoot', { x: spawnX, y: spawnY, rotation: rot });
          }
        }
      };

      shoot(this.turret.rotation);
      
      if (this.multiShotActive) {
        shoot(this.turret.rotation + 0.2);
        shoot(this.turret.rotation - 0.2);
      }
      this.lastFired = time + 250; // Cooldown 250ms
    }

    // Clean up bullets out of bounds or exceeded range
    this.bullets.getChildren().forEach((bullet) => {
      // Check range (limit to 700px)
      if (bullet.startX !== undefined && bullet.startY !== undefined) {
          const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, bullet.startX, bullet.startY);
          if (dist > 700) {
            bullet.destroy();
            return;
          }
      }
      
      if (bullet.x < 0 || bullet.x > 4000 || bullet.y < 0 || bullet.y > 4000) {
        bullet.destroy();
      }
    });

    // Cleanup missiles (if they go too far or off world)
    this.missiles.getChildren().forEach((missile) => {
        // Simple bounds check or distance check
        if (missile.x < 0 || missile.x > 2000 || missile.y < 0 || missile.y > 2000) {
            missile.destroy();
        }
    });

    // Emit player movement
    const x = this.tank.x;
    const y = this.tank.y;
    const r = this.tank.rotation;
    const tr = this.turret.rotation;
    if (this.tank.oldPosition && (x !== this.tank.oldPosition.x || y !== this.tank.oldPosition.y || r !== this.tank.oldPosition.rotation || tr !== this.tank.oldPosition.turretRotation)) {
      if (this.Movement) {
          const message = this.Movement.create({ x: this.tank.x, y: this.tank.y, rotation: this.tank.rotation, turretRotation: this.turret.rotation });
          const buffer = this.Movement.encode(message).finish();
          this.socket.emit('playerMovement', buffer);
      } else {
          this.socket.emit('playerMovement', { x: this.tank.x, y: this.tank.y, rotation: this.tank.rotation, turretRotation: this.turret.rotation });
      }
    }
    this.tank.oldPosition = {
      x: this.tank.x,
      y: this.tank.y,
      rotation: this.tank.rotation,
      turretRotation: this.turret.rotation
    };
  }
}

function addPlayer(self, playerInfo) {
  self.tankShadow = self.add.image(playerInfo.x + 5, playerInfo.y + 5, 'shadow').setOrigin(0.5, 0.5).setDisplaySize(40, 30);
  self.tankShadow.setDepth(0);

  self.tank = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'tankBody').setOrigin(0.5, 0.5).setDisplaySize(40, 30);
  self.turret = self.add.sprite(playerInfo.x, playerInfo.y, 'tankTurret').setOrigin(0, 0.5).setDisplaySize(30, 10);
  
  self.tank.setDepth(1);
  self.turret.setDepth(2);

  // Camera follows player
  self.cameras.main.startFollow(self.tank);

  self.tank.health = playerInfo.health;
  self.tank.maxHealth = playerInfo.maxHealth;
  self.tank.healthBar = self.add.graphics();
  self.tank.healthBar.setDepth(4);
  updateHealthBar(self.tank.healthBar, self.tank.health);

  self.tank.setCollideWorldBounds(true);
  self.tank.setTint(playerInfo.color);
  self.tank.playerColor = playerInfo.color; // Save original color
  self.turret.setTint(playerInfo.color);
  
  // Player Name
  self.playerNameText = self.add.text(playerInfo.x, playerInfo.y - 40, playerInfo.name, { 
    fontSize: '16px', 
    fill: '#ffffff',
    align: 'center'
  }).setOrigin(0.5);
  self.playerNameText.setDepth(5);
  self.playerNameText.setStroke('#000000', 3);

  self.tank.setDrag(0);
  self.tank.setAngularDrag(0);
  self.tank.setMaxVelocity(200);

  // Tank and obstacles collision
  self.physics.add.collider(self.tank, self.obstacles);

  // Powerup overlap
  self.physics.add.overlap(self.tank, self.powerUps, function(tank, powerUp) {
    self.socket.emit('powerUpCollected', powerUp.id);
    if (powerUp.shadow) {
      powerUp.shadow.destroy();
    }
    powerUp.destroy();
  }, null, self);
}

function addOtherPlayers(self, playerInfo) {
  const otherShadow = self.add.image(playerInfo.x + 5, playerInfo.y + 5, 'shadow').setOrigin(0.5, 0.5).setDisplaySize(40, 30);
  otherShadow.setDepth(0);

  const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'tankBody').setOrigin(0.5, 0.5).setDisplaySize(40, 30);
  const otherTurret = self.add.sprite(playerInfo.x, playerInfo.y, 'tankTurret').setOrigin(0, 0.5).setDisplaySize(30, 10);
  
  otherPlayer.setDepth(1);
  otherTurret.setDepth(2);

  otherPlayer.health = playerInfo.health;
  otherPlayer.maxHealth = playerInfo.maxHealth;
  otherPlayer.healthBar = self.add.graphics();
  otherPlayer.healthBar.setDepth(4);
  updateHealthBar(otherPlayer.healthBar, otherPlayer.health);

  otherPlayer.playerId = playerInfo.playerId;
  otherPlayer.setTint(playerInfo.color);
  otherTurret.setTint(playerInfo.color);
  
  otherPlayer.turret = otherTurret;
  otherPlayer.shadow = otherShadow;
  otherPlayer.setAlpha(playerInfo.alpha);
  otherTurret.setAlpha(playerInfo.alpha);
  otherShadow.setAlpha(playerInfo.alpha);
  otherPlayer.healthBar.setAlpha(playerInfo.alpha);
  
  // Player Name
  const otherNameText = self.add.text(playerInfo.x, playerInfo.y - 40, playerInfo.name, { 
    fontSize: '16px', 
    fill: '#ffffff',
    align: 'center'
  }).setOrigin(0.5);
  otherNameText.setDepth(5);
  otherNameText.setStroke('#000000', 3);
  otherNameText.setAlpha(playerInfo.alpha);
  otherPlayer.nameText = otherNameText;

  self.otherPlayers.add(otherPlayer);
}

function displayPowerUp(self, powerUpInfo) {
  // console.log('Displaying powerup:', powerUpInfo);
  const shadow = self.add.image(powerUpInfo.x + 3, powerUpInfo.y + 3, 'shadow').setOrigin(0.5, 0.5).setDisplaySize(20, 20);
  shadow.setDepth(1); // Above ground, below objects

  let textureName = 'powerup_' + powerUpInfo.type;
  if (!self.textures.exists(textureName)) {
      console.warn(`Texture ${textureName} missing, using default`);
      textureName = 'powerup_health'; // Fallback
  }

  const powerUp = self.physics.add.sprite(powerUpInfo.x, powerUpInfo.y, textureName);
  powerUp.id = powerUpInfo.id;
  powerUp.shadow = shadow;
  powerUp.setDepth(3); // Above obstacles (depth 1)
  self.powerUps.add(powerUp);
  
  // Tween for floating effect
  self.tweens.add({
      targets: powerUp,
      y: powerUpInfo.y - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
  });
}

function displayObstacle(self, obsInfo) {
  let texture = 'obstacle_' + obsInfo.type + '_' + obsInfo.variant;
  // Fallback for old obstacles or missing variants
  if (!self.textures.exists(texture)) {
    texture = 'obstacle_' + obsInfo.type + '_box';
  }

  // Adjust shadow size based on variant
  let shadowWidth = 40;
  let shadowHeight = 40;

  if (obsInfo.variant === 'wall_h') {
    shadowWidth = 120;
    shadowHeight = 40;
  } else if (obsInfo.variant === 'wall_v') {
    shadowWidth = 40;
    shadowHeight = 120;
  } else if (obsInfo.variant === 'corner') {
    shadowWidth = 80;
    shadowHeight = 80;
  } else if (obsInfo.variant === 'barrel') {
    shadowWidth = 30;
    shadowHeight = 30;
  }

  const shadow = self.add.image(obsInfo.x + 4, obsInfo.y + 4, 'shadow').setOrigin(0.5, 0.5).setDisplaySize(shadowWidth, shadowHeight);
  shadow.setDepth(0);

  const obstacle = self.obstacles.create(obsInfo.x, obsInfo.y, texture);
  obstacle.id = obsInfo.id;
  obstacle.type = obsInfo.type;
  obstacle.shadow = shadow;
  obstacle.setDepth(1);
  
  // Adjust body size for physics if needed (especially for non-square shapes)
  if (obsInfo.variant === 'wall_h') {
    obstacle.body.setSize(120, 40);
  } else if (obsInfo.variant === 'wall_v') {
    obstacle.body.setSize(40, 120);
  } else if (obsInfo.variant === 'corner') {
    // Physics body for L-shape is tricky with single body, using bounding box for now
    obstacle.body.setSize(80, 80);
  } else if (obsInfo.variant === 'barrel') {
    obstacle.body.setCircle(15);
  } else if (obsInfo.variant === 'bush') {
    obstacle.body.setCircle(20);
  }

  if (obsInfo.type === 'soft') {
    obstacle.setAlpha(0.2 + (obsInfo.health / 100) * 0.8);
  }
}

function updateHealthBar(graphics, health) {
  graphics.clear();
  
  // Background (red)
  graphics.fillStyle(0xff0000);
  graphics.fillRect(0, 0, 40, 5);
  
  // Foreground (green)
  if (health > 0) {
    graphics.fillStyle(0x00ff00);
    graphics.fillRect(0, 0, 40 * (health / 100), 5);
  }
}

function generateBackground(self, seed) {
  const tileSize = 40;
  const MAP_WIDTH = 4000;
  const MAP_HEIGHT = 4000;
  const cols = MAP_WIDTH / tileSize;
  const rows = MAP_HEIGHT / tileSize;
  
  const groundTypes = ['ground_grass', 'ground_dirt', 'ground_sand'];
  
  // Simple LCG PRNG
  let currentSeed = seed * 1000000;
  function seededRandom() {
    currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
    return currentSeed / 4294967296;
  }

  const backgroundLayer = self.add.group();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Create a pattern or random distribution
      // We can use the random to pick a tile
      const rand = seededRandom();
      let typeIndex = 0; // Default grass
      
      if (rand > 0.8) {
        typeIndex = 1; // Dirt
      } else if (rand > 0.7) {
        typeIndex = 2; // Sand
      }
      
      const tile = self.add.image(x * tileSize, y * tileSize, groundTypes[typeIndex]).setOrigin(0, 0);
      tile.setDepth(-1); // Ensure it's behind everything
      backgroundLayer.add(tile);
    }
  }
}

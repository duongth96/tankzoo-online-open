import Phaser from 'phaser';
import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';
import { socketClient } from '../utils/socket';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        // Detect mobile device (can pass from MainScene, but checking again is cheap)
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            this.input.addPointer(3);
        }

        // Get reference to MainScene
        this.mainScene = this.scene.get('MainScene');

        this.setupUI();
        this.setupMobileControls();
        this.setupMinimap();

        // Listen for inventory updates from MainScene
        this.mainScene.events.on('updateInventory', this.updateInventory, this);
        
        // Listen for mobile toggle debug
        this.mainScene.events.on('toggleMobile', (isMobile) => {
            this.isMobile = isMobile;
            this.setupMobileControls();
        });

        // Listen for leaderboard updates
        window.addEventListener('updateLeaderboard', () => {
            if (this.minimapContainer && this.minimapContainer.visible) {
                this.updateMinimapLeaderboard();
            }
        });

        // Handle resize
        this.scale.on('resize', this.handleResize, this);
    }

    handleResize(gameSize) {
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
        // const zoomLevel = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
        // this.cameras.main.setZoom(zoomLevel);
        this.setupUI();
        this.setupMobileControls();
        this.setupMinimap();
    }

    setupUI() {
        if (this.inventoryUI) {
            this.inventoryUI.destroy();
        }
        if (this.accelerationBar) {
            this.accelerationBar.destroy();
        }
        if (this.accelerationBarBg) {
            this.accelerationBarBg.destroy();
        }
        if (this.accelerationText) {
            this.accelerationText.destroy();
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Inventory UI Container - expanded to include acceleration bar
        const containerY = height - 40;
        this.inventoryUI = this.add.container(width / 2, containerY);
        
        // Expanded background to fit both items and acceleration bar
        const bgHeight = 40 + 30 + 20; // Items height + spacing + acceleration bar height
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.3);
        bg.fillRoundedRect(-100, -bgHeight/2, 170, bgHeight, 10);
        this.inventoryUI.add(bg);

        // Missile Icon & Text
        const itemYpos = -30; // Moved up to make room for acceleration bar
        const missileIcon = this.add.image(-60, itemYpos, 'powerup_missile').setDisplaySize(20, 20);
        this.missileText = this.add.text(-40, itemYpos, '0', { 
            fontSize: '16px', 
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        
        // Bomb Icon & Text
        const bombIcon = this.add.image(10, itemYpos, 'powerup_bomb').setDisplaySize(20, 20);
        this.bombText = this.add.text(30, itemYpos, '0', {  
            fontSize: '16px', 
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        this.inventoryUI.add([missileIcon, this.missileText, bombIcon, this.bombText]);
        
        // Acceleration Bar - below items, 30px spacing
        const accelYpos = itemYpos + 30; // 30px below items
        const accelWidth = 150; // Width of acceleration bar
        const accelHeight = 15; // Height of acceleration bar
        
        // Background bar (relative to container)
        this.accelerationBarBg = this.add.graphics();
        this.accelerationBarBg.fillStyle(0x000000, 0.5);
        this.accelerationBarBg.fillRoundedRect(-accelWidth/2, accelYpos - accelHeight/2, accelWidth, accelHeight, 5);
        this.accelerationBarBg.lineStyle(2, 0xffffff, 0.8);
        this.accelerationBarBg.strokeRoundedRect(-accelWidth/2, accelYpos - accelHeight/2, accelWidth, accelHeight, 5);
        this.accelerationBarBg.setScrollFactor(0);
        this.accelerationBarBg.setDepth(100);
        this.inventoryUI.add(this.accelerationBarBg);
        
        // Fill bar (relative to container)
        this.accelerationBar = this.add.graphics();
        this.accelerationBar.setScrollFactor(0);
        this.accelerationBar.setDepth(101);
        this.inventoryUI.add(this.accelerationBar);
        
        // Store positions relative to container for update function
        this.accelContainerX = width / 2;
        this.accelContainerY = containerY;
        this.accelYpos = accelYpos;
        this.accelWidth = accelWidth;
        this.accelHeight = accelHeight;
        
        // Initialize bar
        this.updateAccelerationBar(100, 100);
    }

    updateInventory(inventory) {
        if (this.missileText) this.missileText.setText(`${inventory.missile || 0}`);
        if (this.bombText) this.bombText.setText(`${inventory.bomb || 0}`);
    }

    updateAccelerationBar(current, max) {
        if (!this.accelerationBar) return;
        
        const padding = 2;
        const percentage = Math.max(0, Math.min(1, current / max));
        const fillWidth = (this.accelWidth - padding * 2) * percentage;
        
        // Clear and redraw fill bar (relative to container)
        this.accelerationBar.clear();
        
        // Color based on percentage (green -> yellow -> red)
        let color = 0x00ff00; // Green
        if (percentage < 0.3) {
            color = 0xff0000; // Red when low
        } else if (percentage < 0.6) {
            color = 0xffff00; // Yellow when medium
        }
        
        this.accelerationBar.fillStyle(color, 0.9);
        this.accelerationBar.fillRoundedRect(
            -this.accelWidth/2 + padding, 
            this.accelYpos - this.accelHeight/2 + padding, 
            fillWidth, 
            this.accelHeight - padding * 2, 
            3
        );
    }

    setupMobileControls() {
        // Cleanup existing
        if (this.joyStick) {
            this.joyStick.destroy();
            this.joyStick = null;
        }
        if (this.shootBtn) {
            this.shootBtn.destroy();
            this.shootBtn = null;
        }
        if (this.missileBtn) {
            this.missileBtn.destroy();
            this.missileBtn = null;
        }
        if (this.bombBtn) {
            this.bombBtn.destroy();
            this.bombBtn = null;
        }

        if (!this.isMobile) return;

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Virtual Joystick (Left) - Closer to edge
        // Position: Bottom Left
        const joyX = 150;
        const joyY = height - 150;
        
        const base = this.add.circle(0, 0, 100, 0x888888).setAlpha(0.5).setDepth(100);
        const thumb = this.add.circle(0, 0, 50, 0xcccccc).setAlpha(0.8).setDepth(101);

        this.joyStick = new VirtualJoystick(this, {
            x: joyX,
            y: joyY,
            radius: 100,
            base: base,
            thumb: thumb,
            dir: '8dir',
            forceMin: 16,
            enable: true
        });

        // Shoot Button (Right) - Closer to edge
        // Position: Bottom Right
        const shootBtnRadius = 80;
        const shootBtnX = width - 120;
        const shootBtnY = height - 120;
        
        this.shootBtn = this.add.circle(shootBtnX, shootBtnY, shootBtnRadius, 0xff0000)
            .setAlpha(0.3)
            .setInteractive()
            .setDepth(100);
            
        this.shootBtn.on('pointerdown', () => {
            this.shootBtn.setAlpha(0.9);
            // Notify MainScene
            this.mainScene.events.emit('mobileShoot');
        });

        this.shootBtn.on('pointerup', () => {
            this.shootBtn.setAlpha(0.6);
        });
        
        this.shootBtn.on('pointerout', () => {
            this.shootBtn.setAlpha(0.6);
        });

        // Missile Button (Skill 1) - Left of Shoot Button
        this.missileBtn = this.createSkillButton(shootBtnX - 150, shootBtnY, 'powerup_missile', () => {
            this.mainScene.events.emit('useItem', 'missile');
        });

        // Bomb Button (Skill 2) - Above Shoot Button
        this.bombBtn = this.createSkillButton(shootBtnX, shootBtnY - 150, 'powerup_bomb', () => {
            this.mainScene.events.emit('useItem', 'bomb');
        });
        
        // Fullscreen on touch (background)
        this.input.on('pointerdown', (pointer) => {
             if (this.scale.fullscreen && !this.scale.isFullscreen) {
                 this.scale.startFullscreen();
             }
        });
    }

    createSkillButton(x, y, key, callback) {
        const btn = this.add.container(x, y);
        btn.setDepth(100);

        const bg = this.add.circle(0, 0, 50, 0x333333).setAlpha(0.3);
        const icon = this.add.image(0, 0, key).setDisplaySize(50, 50);

        btn.add([bg, icon]);

        btn.setInteractive(new Phaser.Geom.Circle(0, 0, 60), Phaser.Geom.Circle.Contains);

        btn.on('pointerdown', () => {
            bg.setAlpha(0.8);
            bg.setFillStyle(0x666666);
            callback();
        });

        btn.on('pointerup', () => {
            bg.setAlpha(0.5);
            bg.setFillStyle(0x333333);
        });

        btn.on('pointerout', () => {
            bg.setAlpha(0.5);
            bg.setFillStyle(0x333333);
        });

        return btn;
    }

    setupMinimap() {
        // Cleanup existing minimap if any
        if (this.minimapContainer) {
            this.minimapContainer.destroy();
        }
        if (this.minimapGraphics) {
            this.minimapGraphics.destroy();
        }
        if (this.leaderboardText) {
            this.leaderboardText.destroy();
        }
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Minimap container - positioned at top-left
        this.minimapContainer = this.add.container(0, 0);
        this.minimapContainer.setScrollFactor(0);
        this.minimapContainer.setDepth(200);
        this.minimapContainer.setVisible(false);
        
        // Minimap background
        const minimapSize = Math.min(width * 0.3, height * 0.4, 300);
        const minimapX = 20;
        const minimapY = 20;
        
        const minimapBg = this.add.graphics();
        minimapBg.fillStyle(0x000000, 0.7);
        minimapBg.fillRoundedRect(minimapX, minimapY, minimapSize, minimapSize, 10);
        minimapBg.lineStyle(2, 0xffffff, 1);
        minimapBg.strokeRoundedRect(minimapX, minimapY, minimapSize, minimapSize, 10);
        
        // Minimap title
        const minimapTitle = this.add.text(minimapX + minimapSize / 2, minimapY + 15, 'BẢN ĐỒ', {
            fontSize: '16px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Leaderboard container on minimap
        const leaderboardX = minimapX;
        const leaderboardY = minimapY + minimapSize + 10;
        const leaderboardWidth = minimapSize;
        const leaderboardHeight = Math.min(height * 0.3, 200);
        
        const leaderboardBg = this.add.graphics();
        leaderboardBg.fillStyle(0x000000, 0.7);
        leaderboardBg.fillRoundedRect(leaderboardX, leaderboardY, leaderboardWidth, leaderboardHeight, 10);
        leaderboardBg.lineStyle(2, 0xffffff, 1);
        leaderboardBg.strokeRoundedRect(leaderboardX, leaderboardY, leaderboardWidth, leaderboardHeight, 10);
        
        // Leaderboard title
        const leaderboardTitle = this.add.text(leaderboardX + leaderboardWidth / 2, leaderboardY + 15, 'BẢNG XẾP HẠNG', {
            fontSize: '14px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Leaderboard text
        this.leaderboardText = this.add.text(leaderboardX + 10, leaderboardY + 35, '', {
            fontSize: '12px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            wordWrap: { width: leaderboardWidth - 20 }
        });
        
        this.minimapContainer.add([
            minimapBg,
            minimapTitle,
            leaderboardBg,
            leaderboardTitle,
            this.leaderboardText
        ]);
        
        // Minimap graphics for drawing player positions (separate, not in container for easier coordinate handling)
        this.minimapGraphics = this.add.graphics();
        this.minimapGraphics.setScrollFactor(0);
        this.minimapGraphics.setDepth(201);
        this.minimapGraphics.setVisible(false);
        
        // Store minimap properties
        this.minimapX = minimapX;
        this.minimapY = minimapY;
        this.minimapSize = minimapSize;
        this.leaderboardX = leaderboardX;
        this.leaderboardY = leaderboardY;
        this.leaderboardWidth = leaderboardWidth;
    }

    showMinimap(show) {
        if (this.minimapContainer) {
            this.minimapContainer.setVisible(show);
        }
        if (this.minimapGraphics) {
            this.minimapGraphics.setVisible(show);
        }
    }

    updateMinimap(mainScene) {
        if (!this.minimapContainer || !this.minimapContainer.visible) return;
        
        const mapWidth = mainScene.mapWidth || 4000;
        const mapHeight = mainScene.mapHeight || 4000;
        const scaleX = this.minimapSize / mapWidth;
        const scaleY = this.minimapSize / mapHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // Clear previous minimap graphics
        this.minimapGraphics.clear();
        
        // Draw map border
        const mapDisplayWidth = mapWidth * scale;
        const mapDisplayHeight = mapHeight * scale;
        const mapOffsetX = this.minimapX + (this.minimapSize - mapDisplayWidth) / 2 + 5;
        const mapOffsetY = this.minimapY + 30 + (this.minimapSize - mapDisplayHeight) / 2;
        
        this.minimapGraphics.lineStyle(1, 0x666666, 0.5);
        this.minimapGraphics.strokeRect(mapOffsetX, mapOffsetY, mapDisplayWidth, mapDisplayHeight);
        
        // Get all players
        const players = mainScene.playerManager.players || {};
        const localPlayerId = socketClient.getSocket() ? socketClient.getSocket().id : null;
        
        // Draw all players
        Object.values(players).forEach(player => {
            if (!player.tank || !player.tank.active) return;
            
            const x = mapOffsetX + player.tank.x * scale;
            const y = mapOffsetY + player.tank.y * scale;
            const isLocal = player.id === localPlayerId;
            
            // Draw player dot
            if (isLocal) {
                // Local player - larger, green with border
                this.minimapGraphics.fillStyle(0x00ff00, 1);
                this.minimapGraphics.fillCircle(x, y, 4);
                this.minimapGraphics.lineStyle(2, 0xffffff, 1);
                this.minimapGraphics.strokeCircle(x, y, 4);
                this.minimapGraphics.lineStyle(1, 0x666666, 0.5); // Reset to map border style
            } else {
                // Enemy - red
                this.minimapGraphics.fillStyle(0xff0000, 1);
                this.minimapGraphics.fillCircle(x, y, 3);
            }
        });
        
        // Update leaderboard
        this.updateMinimapLeaderboard();
    }

    updateMinimapLeaderboard() {
        if (!this.leaderboardText) return;
        
        const players = window.allPlayersData || {};
        const sortedPlayers = Object.values(players).sort((a, b) => {
            return (b.score || 0) - (a.score || 0);
        });
        
        const topPlayers = sortedPlayers.slice(0, 5);
        const localPlayerId = socketClient.getSocket() ? socketClient.getSocket().id : null;
        
        let leaderboardHTML = '';
        topPlayers.forEach((player, index) => {
            const isLocal = player.playerId === localPlayerId;
            const prefix = isLocal ? '▶ ' : '';
            const name = player.name || 'Unknown';
            const score = player.score || 0;
            leaderboardHTML += `${prefix}${index + 1}. ${name}: ${score}\n`;
        });
        
        this.leaderboardText.setText(leaderboardHTML);
    }
}
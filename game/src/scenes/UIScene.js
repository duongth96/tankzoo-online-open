import Phaser from 'phaser';
import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';

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

        // Listen for inventory updates from MainScene
        this.mainScene.events.on('updateInventory', this.updateInventory, this);
        
        // Listen for mobile toggle debug
        this.mainScene.events.on('toggleMobile', (isMobile) => {
            this.isMobile = isMobile;
            this.setupMobileControls();
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
    }

    setupUI() {
        if (this.inventoryUI) {
            this.inventoryUI.destroy();
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Inventory UI Container
        this.inventoryUI = this.add.container(width / 2, height - 40); // Moved lower (50 -> 40)
        
        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.3);
        bg.fillRoundedRect(-100, -30, 170, 40, 10);
        this.inventoryUI.add(bg);

        // Missile Icon & Text
        // Note: Textures must be generated/loaded in MainScene or PreloadScene

        const itemYpos = -10;

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
    }

    updateInventory(inventory) {
        if (this.missileText) this.missileText.setText(`${inventory.missile || 0}`);
        if (this.bombText) this.bombText.setText(`${inventory.bomb || 0}`);
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
}
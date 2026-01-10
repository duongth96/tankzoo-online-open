import Phaser from 'phaser';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Load assets here if any (images, sounds)
        // Currently we generate textures in Create, but good practice to have a preload scene
        this.load.text('game-proto', '/assets/game.proto');
    }

    create() {
        this.scene.start('MainScene');
    }
}

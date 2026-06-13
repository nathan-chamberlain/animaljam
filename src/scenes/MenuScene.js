import Phaser from 'phaser';
import { GAME } from '../config.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width, height } = this.cameras.main;
    const font = { fontFamily: '"Press Start 2P", monospace' };

    this.add
      .text(width / 2, height * 0.22, 'FARM ROGUE', {
        ...font,
        fontSize: '28px',
        color: '#ffe066',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.34, 'Breed animals. Fight predators.', {
        ...font,
        fontSize: '10px',
        color: '#c8e6c9',
        align: 'center',
      })
      .setOrigin(0.5);

    const startBtn = this.add
      .text(width / 2, height * 0.52, '[ START FARM ]', {
        ...font,
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#7cba3d'));
    startBtn.on('pointerout', () => startBtn.setColor('#ffffff'));
    startBtn.on('pointerdown', () => {
      this.scene.start('Game');
      this.scene.launch('UI');
    });

    const controls = [
      'WASD — Move',
      'SPACE — Dash',
      'MOUSE — Shoot / place turret / feed',
      'SCROLL — Switch hotbar item',
      'Q / E — Switch turret type',
      '1-3 — Select hotbar item',
      'U / ESC — Upgrade shop',
    ];

    controls.forEach((line, i) => {
      this.add
        .text(width / 2, height * 0.62 + i * 18, line, {
          ...font,
          fontSize: '8px',
          color: '#8899aa',
        })
        .setOrigin(0.5);
    });

    this.add
      .text(width / 2, height - 24, 'Sprites: Kenney CC0  |  Font: Press Start 2P', {
        ...font,
        fontSize: '6px',
        color: '#556677',
      })
      .setOrigin(0.5);
  }
}

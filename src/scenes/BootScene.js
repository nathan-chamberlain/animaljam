import Phaser from 'phaser';
import { GAME } from '../config.js';

const DUNGEON_TILES = [
  0, 48, 49, 20, 65, 109, 115, 113, 110,
];

const CREATURE_TILES = [
  151, 152, 153, 154, 161, 164, 165,
];

function drawGunShotgun(g) {
  g.fillStyle(0x5c3a1e, 1);
  g.fillRect(2, 10, 6, 4);
  g.fillStyle(0x888888, 1);
  g.fillRect(7, 8, 7, 3);
  g.fillRect(7, 12, 7, 2);
  g.fillStyle(0xaaaaaa, 1);
  g.fillRect(14, 7, 2, 7);
}

function drawGunRifle(g) {
  g.fillStyle(0x5c3a1e, 1);
  g.fillRect(1, 10, 7, 3);
  g.fillStyle(0x666666, 1);
  g.fillRect(8, 9, 7, 2);
  g.fillStyle(0x999999, 1);
  g.fillRect(15, 8, 1, 4);
}

function drawGunSprayer(g) {
  g.fillStyle(0x4488cc, 1);
  g.fillRect(3, 6, 5, 7);
  g.fillStyle(0x5c3a1e, 1);
  g.fillRect(8, 10, 5, 3);
  g.fillStyle(0x888888, 1);
  g.fillRect(13, 9, 3, 2);
  g.fillStyle(0x66ccff, 1);
  g.fillRect(14, 7, 2, 2);
}

function drawGunRpg(g) {
  g.fillStyle(0x5c3a1e, 1);
  g.fillRect(1, 11, 8, 3);
  g.fillStyle(0x444444, 1);
  g.fillRect(9, 7, 6, 6);
  g.fillStyle(0xff4400, 1);
  g.fillRect(10, 8, 4, 4);
  g.fillStyle(0xffaa00, 1);
  g.fillRect(15, 9, 1, 2);
}

function drawGrass(g) {
  g.fillStyle(0x4a9e3d, 1);
  g.fillRect(0, 0, 16, 16);
  g.fillStyle(0x5cb849, 1);
  g.fillRect(2, 2, 4, 4);
  g.fillRect(9, 3, 3, 3);
  g.fillRect(6, 9, 5, 4);
  g.fillRect(11, 11, 3, 3);
  g.fillStyle(0x3d8a32, 1);
  g.fillRect(0, 12, 6, 4);
  g.fillRect(10, 0, 4, 3);
}

function drawTree(g) {
  g.fillStyle(0x2d6b1f, 1);
  g.fillRect(4, 2, 8, 8);
  g.fillRect(2, 5, 12, 6);
  g.fillStyle(0x5c3a1e, 1);
  g.fillRect(6, 10, 4, 5);
}

function drawWallWood(g) {
  g.fillStyle(0x5c3a1e, 1);
  g.fillRect(1, 4, 14, 10);
  g.fillStyle(0x8b5a2b, 1);
  g.fillRect(2, 5, 12, 2);
  g.fillRect(2, 9, 12, 2);
}

function drawWallStone(g) {
  g.fillStyle(0x666666, 1);
  g.fillRect(1, 4, 14, 10);
  g.fillStyle(0x888888, 1);
  g.fillRect(2, 5, 5, 3);
  g.fillRect(9, 5, 5, 3);
  g.fillRect(2, 10, 5, 3);
  g.fillRect(9, 10, 5, 3);
}

function drawWallIron(g) {
  g.fillStyle(0x444455, 1);
  g.fillRect(1, 3, 14, 11);
  g.fillStyle(0x778899, 1);
  g.fillRect(3, 5, 10, 7);
  g.fillStyle(0x99aabb, 1);
  g.fillRect(5, 7, 6, 3);
}

function drawRocket(g) {
  g.fillStyle(0xff6600, 1);
  g.fillRect(3, 2, 4, 10);
  g.fillStyle(0xffaa00, 1);
  g.fillRect(4, 0, 2, 3);
  g.fillStyle(0xcccccc, 1);
  g.fillRect(2, 10, 6, 2);
}

function generateTextures(scene) {
  const items = [
    ['gun_shotgun', drawGunShotgun],
    ['gun_rifle', drawGunRifle],
    ['gun_sprayer', drawGunSprayer],
    ['gun_rpg', drawGunRpg],
    ['tile_grass', drawGrass],
    ['tile_tree', drawTree],
    ['wall_wood', drawWallWood],
    ['wall_stone', drawWallStone],
    ['wall_iron', drawWallIron],
    ['tile_rocket', drawRocket],
  ];
  items.forEach(([key, draw]) => {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, 16, 16);
    g.destroy();
  });
}

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const bar = this.add.graphics();
    const { width, height } = this.cameras.main;
    const label = this.add
      .text(width / 2, height / 2 - 20, 'Loading...', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0x333333, 1);
      bar.fillRect(width / 2 - 120, height / 2 + 10, 240, 16);
      bar.fillStyle(0x7cba3d, 1);
      bar.fillRect(width / 2 - 118, height / 2 + 12, 236 * value, 12);
    });

    this.load.on('complete', () => {
      bar.destroy();
      label.destroy();
    });

    DUNGEON_TILES.forEach((id) => {
      this.load.image(`dungeon_${id}`, `assets/dungeon/tile_${String(id).padStart(4, '0')}.png`);
    });

    CREATURE_TILES.forEach((id) => {
      this.load.image(`creature_${id}`, `assets/creatures/tile_${String(id).padStart(4, '0')}.png`);
    });
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffcc00, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('pellet', 8, 8);
    g.destroy();

    const slot = this.make.graphics({ x: 0, y: 0, add: false });
    slot.fillStyle(0x2a2a3e, 1);
    slot.fillRect(0, 0, 40, 40);
    slot.lineStyle(2, 0x666688, 1);
    slot.strokeRect(1, 1, 38, 38);
    slot.generateTexture('hotbar_slot', 40, 40);
    slot.destroy();

    generateTextures(this);

    this.scene.start('Menu');
  }
}

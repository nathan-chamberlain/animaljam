import Phaser from 'phaser';
import {
  GAME,
  HOTBAR_ITEMS,
  UPGRADES,
  GUN_TIERS,
  ANIMAL_TIERS,
  WALL_TIERS,
  TURRET_TYPES,
} from '../config.js';

const HUD = {
  stroke: '#000000',
  strokeThickness: 4,
};

function hudText(scene, x, y, style, originX = 0, originY = 0) {
  return scene.add
    .text(x, y, '', {
      fontFamily: '"Press Start 2P", monospace',
      stroke: HUD.stroke,
      strokeThickness: HUD.strokeThickness,
      ...style,
    })
    .setOrigin(originX, originY)
    .setScrollFactor(0)
    .setDepth(110);
}

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.gameScene = this.scene.get('Game');
    this.predatorIndicators = [];

    this.add
      .rectangle(0, 0, GAME.WIDTH, 76, 0x000000, 0.65)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(105);

    this.add
      .rectangle(0, GAME.HEIGHT - 100, GAME.WIDTH, 100, 0x000000, 0.65)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(105);

    this.scoreText = hudText(this, 12, 10, { fontSize: '10px', color: '#ffe066' });
    this.waveText = hudText(this, 12, 28, { fontSize: '8px', color: '#ffffff' });
    this.coinText = hudText(this, 12, 44, { fontSize: '8px', color: '#ffdd55' });
    this.tierText = hudText(this, 12, 60, { fontSize: '7px', color: '#99ddff' });
    this.healthText = hudText(this, GAME.WIDTH - 12, 10, { fontSize: '10px', color: '#ff8888' }, 1, 0);
    this.animalText = hudText(this, GAME.WIDTH - 12, 28, { fontSize: '8px', color: '#99ff99' }, 1, 0);
    this.wallText = hudText(this, GAME.WIDTH - 12, 44, { fontSize: '7px', color: '#ddbb88' }, 1, 0);
    this.timerText = hudText(this, GAME.WIDTH / 2, 12, { fontSize: '9px', color: '#ffffff' }, 0.5, 0);

    this.hintText = hudText(
      this,
      GAME.WIDTH / 2,
      GAME.HEIGHT - 96,
      { fontSize: '7px', color: '#ffffff', align: 'center', wordWrap: { width: GAME.WIDTH - 48 } },
      0.5,
      0,
    );

    this.hotbarSlots = [];
    this.hotbarIcons = [];
    this.hotbarLabels = [];

    const barY = GAME.HEIGHT - 48;
    this.hotbarStartX = GAME.WIDTH / 2 - (HOTBAR_ITEMS.length * 46) / 2;
    const font = { fontFamily: '"Press Start 2P", monospace', stroke: HUD.stroke, strokeThickness: 3 };

    HOTBAR_ITEMS.forEach((item, i) => {
      const x = this.hotbarStartX + i * 46 + 20;
      const slot = this.add.image(x, barY, 'hotbar_slot').setScrollFactor(0).setDepth(100);
      const icon = this.add.image(x, barY - 2, 'gun_shotgun').setScrollFactor(0).setDepth(101).setScale(1.5);
      const label = this.add
        .text(x, barY + 24, item.label, { ...font, fontSize: '5px', color: '#ffffff' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101);

      this.hotbarSlots.push(slot);
      this.hotbarIcons.push(icon);
      this.hotbarLabels.push(label);
    });

    this.selectedHighlight = this.add
      .rectangle(this.hotbarStartX + 20, barY, 44, 44)
      .setStrokeStyle(2, 0x7cba3d)
      .setFillStyle(0x000000, 0)
      .setScrollFactor(0)
      .setDepth(102);

    this.indicatorLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(115);

    this.shopPanel = this.add
      .container(GAME.WIDTH / 2, GAME.HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);
    this.buildShopPanel(font);

    this.gameOverPanel = this.add
      .container(GAME.WIDTH / 2, GAME.HEIGHT / 2)
      .setScrollFactor(0)
      .setDepth(300)
      .setVisible(false);
    this.buildGameOverPanel(font);

    this.registry.events.on('changedata-gameData', this.onGameUpdate, this);
    this.gameScene.events.on('gameUpdate', this.onGameUpdate, this);
    this.onGameUpdate();
  }

  buildShopPanel(font) {
    const bg = this.add
      .rectangle(0, 0, 560, 480, 0x1a1a2e, 0.96)
      .setStrokeStyle(3, 0x7cba3d);
    const title = this.add
      .text(0, -215, 'UPGRADE SHOP', { ...font, fontSize: '14px', color: '#ffe066' })
      .setOrigin(0.5);
    const hint = this.add
      .text(0, 215, 'Press U or ESC to close', { ...font, fontSize: '8px', color: '#cccccc' })
      .setOrigin(0.5);

    this.shopPanel.add([bg, title, hint]);
    this.upgradeButtons = [];

    UPGRADES.forEach((upgrade, i) => {
      const y = -175 + i * 38;
      const btn = this.add
        .text(-230, y, `[ ${upgrade.name} ]`, { ...font, fontSize: '7px', color: '#ffffff' })
        .setInteractive({ useHandCursor: true });
      const desc = this.add.text(-230, y + 12, upgrade.desc, { ...font, fontSize: '5px', color: '#bbbbbb' });
      const cost = this.add
        .text(230, y + 2, '0c', { ...font, fontSize: '7px', color: '#ffdd55' })
        .setOrigin(1, 0);
      const level = this.add
        .text(230, y + 14, '', { ...font, fontSize: '5px', color: '#99ddff' })
        .setOrigin(1, 0);

      btn.upgradeId = upgrade.id;
      btn.on('pointerdown', () => this.gameScene.events.emit('buyUpgrade', upgrade.id));
      btn.on('pointerover', () => btn.setColor('#7cba3d'));
      btn.on('pointerout', () => btn.setColor('#ffffff'));

      this.upgradeButtons.push({ btn, desc, cost, level, upgrade });
      this.shopPanel.add([btn, desc, cost, level]);
    });
  }

  buildGameOverPanel(font) {
    const bg = this.add.rectangle(0, 0, 420, 240, 0x1a1a2e, 0.95).setStrokeStyle(3, 0xff4444);
    this.gameOverTitle = this.add
      .text(0, -70, 'FARM LOST', { ...font, fontSize: '18px', color: '#ff6666' })
      .setOrigin(0.5);
    this.gameOverReason = this.add
      .text(0, -30, '', { ...font, fontSize: '8px', color: '#ffaaaa' })
      .setOrigin(0.5);
    this.gameOverScore = this.add
      .text(0, 10, '', { ...font, fontSize: '9px', color: '#ffffff' })
      .setOrigin(0.5);
    const restart = this.add
      .text(0, 60, '[ TRY AGAIN ]', { ...font, fontSize: '12px', color: '#7cba3d' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    restart.on('pointerdown', () => {
      this.scene.stop('UI');
      this.scene.stop('Game');
      this.scene.start('Game');
      this.scene.launch('UI');
    });
    restart.on('pointerover', () => restart.setColor('#ffffff'));
    restart.on('pointerout', () => restart.setColor('#7cba3d'));

    this.gameOverPanel.add([bg, this.gameOverTitle, this.gameOverReason, this.gameOverScore, restart]);
  }

  getHotbarIcon(item, data) {
    if (item.type === 'weapon') return GUN_TIERS[data.gunTier]?.sprite ?? 'gun_shotgun';
    if (item.type === 'deploy') {
      const gs = this.gameScene;
      const id = gs?.unlockedTurrets?.[gs.selectedTurretIndex] ?? 'hose';
      return TURRET_TYPES[id]?.sprite ?? 'dungeon_65';
    }
    return 'dungeon_115';
  }

  updatePredatorIndicators(predators) {
    this.indicatorLayer.removeAll(true);

    if (!predators?.length) return;

    const cam = this.gameScene.cameras.main;
    const margin = 28;
    const pad = 20;
    const zoom = cam.zoom;
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    const halfW = GAME.WIDTH / 2 - margin;
    const halfH = GAME.HEIGHT / 2 - margin;

    predators.forEach((p) => {
      const screenX = (p.x - cam.scrollX) * zoom;
      const screenY = (p.y - cam.scrollY) * zoom;

      if (
        screenX >= pad && screenX <= GAME.WIDTH - pad
        && screenY >= pad && screenY <= GAME.HEIGHT - pad
      ) {
        return;
      }

      const dx = screenX - cx;
      const dy = screenY - cy;
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;

      const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
      const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
      const scale = Math.min(scaleX, scaleY);
      const ix = cx + dx * scale;
      const iy = cy + dy * scale;
      const angle = Math.atan2(dy, dx);

      const arrow = this.add
        .text(ix, iy, '►', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '10px',
          color: '#ff3333',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setRotation(angle);

      const icon = this.add
        .image(ix + Math.cos(angle) * 14, iy + Math.sin(angle) * 14, p.key)
        .setScale(1.2)
        .setTint(0xff6666);

      this.indicatorLayer.add([arrow, icon]);
    });
  }

  onGameUpdate() {
    const data = this.registry.get('gameData');
    if (!data) return;

    this.scoreText.setText(`Score: ${data.score}`);
    this.coinText.setText(`Coins: ${data.coins}`);
    this.waveText.setText(`Wave: ${data.wave}${data.waveActive ? ' — ATTACK!' : ''}`);
    this.tierText.setText(`${data.animalName} | ${data.gunName}`);
    this.healthText.setText(`HP: ${this.gameScene.player?.health ?? '?'}`);
    this.animalText.setText(`Animals: ${data.animalCount}`);
    this.wallText.setText(`Pen: ${data.wallHp}/${data.wallMax} (${data.wallName})`);

    if (data.waveActive) {
      this.timerText.setText('Predators incoming!');
      this.timerText.setColor('#ff6666');
    } else if (data.peaceTime > 0) {
      this.timerText.setText(`Next wave: ${Math.ceil(data.peaceTime / 1000)}s`);
      this.timerText.setColor('#ffffff');
    } else {
      this.timerText.setText('');
    }

    this.updatePredatorIndicators(data.predators);

    const item = HOTBAR_ITEMS[data.hotbarIndex];
    if (item.type === 'weapon') {
      const gun = GUN_TIERS[data.gunTier];
      const aoe = gun.aoe ? `  AOE ${gun.aoeRadius}px` : '';
      this.hintText.setText(`Click to fire ${gun.name}  DMG ${gun.damage}${aoe}`);
    } else if (item.type === 'deploy') {
      const turretHint = data.unlockedTurrets.length > 1 ? '  Q/E switch type' : '';
      this.hintText.setText(
        `Snap place ${data.turretName} (${this.gameScene.getSelectedTurretType()?.cost ?? 0}c)`
        + `  [${data.turretCount}/${data.maxTurrets}]${turretHint}`,
      );
    } else {
      this.hintText.setText('Click to boost breeding (+2500 progress, 10c)');
    }

    this.selectedHighlight.x = this.hotbarStartX + data.hotbarIndex * 46 + 20;

    HOTBAR_ITEMS.forEach((hotItem, i) => {
      this.hotbarSlots[i].setTint(i === data.hotbarIndex ? 0xaaffaa : 0xffffff);
      const iconKey = this.getHotbarIcon(hotItem, data);
      if (this.textures.exists(iconKey)) {
        this.hotbarIcons[i].setTexture(iconKey);
      }
    });

    this.shopPanel.setVisible(!!data.showShop);
    if (data.showShop) {
      UPGRADES.forEach((upgrade, i) => {
        const btn = this.upgradeButtons[i];
        const maxed = this.gameScene.isUpgradeMaxed(upgrade);
        const cost = this.gameScene.getUpgradeCost(upgrade);

        if (upgrade.type === 'animal') {
          const next = ANIMAL_TIERS[this.gameScene.animalTier + 1];
          btn.desc.setText(next ? `→ ${next.name} (+${next.coinPerBreed}c/breed)` : upgrade.desc);
          btn.level.setText(next ? `Now: ${data.animalName}` : 'MAX');
        } else if (upgrade.type === 'gun') {
          const next = GUN_TIERS[this.gameScene.gunTier + 1];
          btn.desc.setText(next ? `→ ${next.name}${next.aoe ? ' AOE blast' : ''}` : upgrade.desc);
          btn.level.setText(next ? `Now: ${data.gunName}` : 'MAX');
        } else if (upgrade.type === 'wall') {
          const next = WALL_TIERS[this.gameScene.wallTier + 1];
          btn.desc.setText(next ? `→ ${next.name} (${next.hp} HP)` : upgrade.desc);
          btn.level.setText(next ? `Now: ${data.wallName}` : 'MAX');
        } else if (upgrade.type === 'turret') {
          btn.level.setText(maxed ? 'Unlocked' : 'Locked');
        } else if (upgrade.type === 'repair') {
          const rc = this.gameScene.getRepairCost();
          btn.level.setText(rc > 0 ? 'Damaged' : 'Full HP');
        } else {
          const level = this.gameScene.upgradeLevels[upgrade.id] ?? 0;
          btn.level.setText(`Lv ${level}/${upgrade.max}`);
        }

        btn.btn.setAlpha(maxed ? 0.4 : cost !== null && data.coins >= cost ? 1 : 0.6);
        if (upgrade.type === 'repair') {
          const rc = this.gameScene.getRepairCost();
          btn.cost.setText(rc > 0 ? `${rc}c` : 'OK');
        } else {
          btn.cost.setText(maxed ? 'MAX' : cost !== null ? `${cost}c` : '—');
        }
      });
    }

    this.gameOverPanel.setVisible(!!data.gameOver);
    if (data.gameOver) {
      this.gameOverTitle.setText(data.gameOverReason === 'animals' ? 'HERD LOST' : 'FARM LOST');
      this.gameOverReason.setText(
        data.gameOverReason === 'animals'
          ? 'All your animals were eaten!'
          : 'The farm could not survive.',
      );
      this.gameOverScore.setText(`Final Score: ${data.score}\nWaves Survived: ${data.wave}`);
    }
  }

  shutdown() {
    this.registry.events.off('changedata-gameData', this.onGameUpdate, this);
    if (this.gameScene) {
      this.gameScene.events.off('gameUpdate', this.onGameUpdate, this);
    }
  }
}

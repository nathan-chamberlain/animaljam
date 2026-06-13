import Phaser from 'phaser';
import {
  GAME,
  MAP_W,
  MAP_H,
  PEN,
  SPRITES,
  HOTBAR_ITEMS,
  UPGRADES,
  ANIMAL_TIERS,
  ANIMAL_UPGRADE_COSTS,
  GUN_TIERS,
  GUN_UPGRADE_COSTS,
  TURRET_TYPES,
  TURRET_UNLOCK_ORDER,
  WALL_TIERS,
  WALL_UPGRADE_COSTS,
} from '../config.js';

const T = GAME.TILE;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.score = 0;
    this.coins = 40;
    this.wave = 0;
    this.waveActive = false;
    this.waveInterval = 18000;
    this.peaceTimer = 0;
    this.gameOver = false;
    this.gameOverReason = '';
    this.showShop = false;

    this.upgradeLevels = {};
    UPGRADES.forEach((u) => {
      this.upgradeLevels[u.id] = 0;
    });

    this.animalTier = 0;
    this.gunTier = 0;
    this.wallTier = 0;
    this.unlockedTurrets = ['hose'];
    this.selectedTurretIndex = 0;
    this.hotbarIndex = 0;
    this.turretCount = 0;
    this.maxTurrets = 4;
    this.breedMultiplier = 1;
    this.dashCooldownMult = 1;
    this.autoFeed = false;
    this.breedTimer = 0;

    this.walls = [];
    this.turretCells = new Set();
    this.mapData = [];

    this.generateMap();
    this.createGroups();
    this.createGridOverlay();
    this.createTurretGhost();
    this.createPlayer();
    this.setupInput();
    this.setupCollisions();
    this.spawnInitialAnimals();

    this.peaceTimer = this.waveInterval;
    this.syncUI();
    this.events.on('buyUpgrade', (id) => this.buyUpgrade(id));
  }

  tileToWorld(tx, ty) {
    return { x: tx * T + T / 2, y: ty * T + T / 2 };
  }

  worldToTile(worldX, worldY) {
    return { x: Math.floor(worldX / T), y: Math.floor(worldY / T) };
  }

  snapToTile(worldX, worldY) {
    const tx = Math.floor(worldX / T);
    const ty = Math.floor(worldY / T);
    return { tx, ty, ...this.tileToWorld(tx, ty) };
  }

  tileKey(tx, ty) {
    return `${tx},${ty}`;
  }

  isInPenInterior(tx, ty) {
    return tx > PEN.x && tx < PEN.x + PEN.w - 1 && ty > PEN.y && ty < PEN.y + PEN.h - 1;
  }

  getPenWorldBounds() {
    return {
      minX: (PEN.x + 1) * T + 3,
      maxX: (PEN.x + PEN.w - 1) * T + T - 3,
      minY: (PEN.y + 1) * T + 3,
      maxY: (PEN.y + PEN.h - 1) * T + T - 3,
    };
  }

  constrainAnimalToPen(animal) {
    const b = this.getPenWorldBounds();
    let vx = animal.body.velocity.x;
    let vy = animal.body.velocity.y;

    if (animal.x < b.minX) {
      animal.x = b.minX;
      vx = Math.abs(vx) || 20;
    } else if (animal.x > b.maxX) {
      animal.x = b.maxX;
      vx = -Math.abs(vx) || -20;
    }

    if (animal.y < b.minY) {
      animal.y = b.minY;
      vy = Math.abs(vy) || 20;
    } else if (animal.y > b.maxY) {
      animal.y = b.maxY;
      vy = -Math.abs(vy) || -20;
    }

    animal.setVelocity(vx, vy);
  }

  updateAnimalsInPen() {
    this.animals.children.each((animal) => {
      if (animal.active) this.constrainAnimalToPen(animal);
    });
  }

  isPenWall(tx, ty) {
    const onBorder = (tx >= PEN.x && tx < PEN.x + PEN.w && ty >= PEN.y && ty < PEN.y + PEN.h);
    return onBorder && !this.isInPenInterior(tx, ty);
  }

  getAnimalTier() {
    return ANIMAL_TIERS[this.animalTier];
  }

  getGunTier() {
    return GUN_TIERS[this.gunTier];
  }

  getWallTier() {
    return WALL_TIERS[this.wallTier];
  }

  getSelectedTurretType() {
    return TURRET_TYPES[this.unlockedTurrets[this.selectedTurretIndex]];
  }

  getGameData() {
    const animal = this.getAnimalTier();
    const gun = this.getGunTier();
    const turret = this.getSelectedTurretType();
    const wallHp = this.walls.reduce((s, w) => s + w.hp, 0);
    const wallMax = this.walls.reduce((s, w) => s + w.maxHp, 0);
    return {
      score: this.score,
      coins: this.coins,
      wave: this.wave,
      waveActive: this.waveActive,
      peaceTime: Math.max(0, this.peaceTimer),
      hotbarIndex: this.hotbarIndex,
      animalCount: this.animals?.countActive() ?? 0,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
      showShop: this.showShop,
      animalTier: this.animalTier,
      animalName: animal.name,
      gunTier: this.gunTier,
      gunName: gun.name,
      turretName: turret?.name ?? 'None',
      turretCount: this.turretCount,
      maxTurrets: this.maxTurrets,
      unlockedTurrets: [...this.unlockedTurrets],
      wallTier: this.wallTier,
      wallName: this.getWallTier().name,
      wallHp,
      wallMax,
      predators: this.getPredatorIndicatorData(),
    };
  }

  getPredatorIndicatorData() {
    const list = [];
    this.predators?.children.each((p) => {
      if (!p.active) return;
      const template = SPRITES.predators.find((pr) => pr.key === p.texture.key);
      list.push({ x: p.x, y: p.y, key: p.texture.key, name: template?.name ?? '?' });
    });
    return list;
  }

  syncUI() {
    this.registry.set('gameData', this.getGameData());
    this.events.emit('gameUpdate');
  }

  generateMap() {
    for (let y = 0; y < MAP_H; y++) {
      const row = [];
      for (let x = 0; x < MAP_W; x++) {
        const edge = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1;
        if (edge) row.push('tree');
        else if (this.isInPenInterior(x, y)) row.push('pen_grass');
        else if (this.isPenWall(x, y)) row.push('wall');
        else if (Math.random() < 0.1) row.push('tilled');
        else row.push('grass');
      }
      this.mapData.push(row);
    }

    this.mapLayer = this.add.group();
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        this.paintTile(x, y, this.mapData[y][x]);
      }
    }

    this.buildPenWalls();
    this.physics.world.setBounds(T, T, (MAP_W - 2) * T, (MAP_H - 2) * T);
  }

  paintTile(tx, ty, type) {
    const { x, y } = this.tileToWorld(tx, ty);
    let key = SPRITES.grass;
    if (type === 'tree') key = SPRITES.tree;
    else if (type === 'tilled') key = SPRITES.tilled;
    else if (type === 'pen_grass') key = SPRITES.penGrass;

    const existing = this.mapLayer.getChildren().find(
      (c) => c.getData('tx') === tx && c.getData('ty') === ty,
    );
    if (existing) existing.destroy();

    if (type === 'wall') return;

    const tile = this.add.image(x, y, key).setDepth(0);
    tile.setData('tx', tx);
    tile.setData('ty', ty);
    this.mapLayer.add(tile);
  }

  buildPenWalls() {
    this.walls.forEach((w) => {
      w.sprite?.destroy();
      w.hpBarBg?.destroy();
      w.hpBarFill?.destroy();
      w.body?.destroy();
    });
    this.walls = [];
    if (this.wallColliders) this.wallColliders.clear(true, true);

    const tier = this.getWallTier();

    for (let y = PEN.y; y < PEN.y + PEN.h; y++) {
      for (let x = PEN.x; x < PEN.x + PEN.w; x++) {
        if (!this.isPenWall(x, y)) continue;
        this.mapData[y][x] = 'wall';
        this.paintTile(x, y, 'wall');
        const { x: wx, y: wy } = this.tileToWorld(x, y);
        const sprite = this.add.image(wx, wy, tier.sprite).setDepth(3);

        const hpBarBg = this.add.rectangle(wx, wy - 11, 14, 4, 0x111111, 0.85).setDepth(4);
        const hpBarFill = this.add
          .rectangle(wx, wy - 11, 14, 4, 0x55ee55, 1)
          .setDepth(4);

        const body = this.wallColliders.create(wx, wy, 'pellet');
        body.setVisible(false);
        body.setDisplaySize(T, T);
        body.refreshBody();

        this.walls.push({
          tx: x,
          ty: y,
          hp: tier.hp,
          maxHp: tier.hp,
          sprite,
          hpBarBg,
          hpBarFill,
          body,
        });
        this.updateWallHpBar(this.walls[this.walls.length - 1]);
      }
    }
  }

  getExpectedWallCount() {
    return 2 * PEN.w + 2 * PEN.h - 4;
  }

  hasPenEntrance() {
    return this.walls.length < this.getExpectedWallCount();
  }

  findNearestWall(worldX, worldY) {
    let nearest = null;
    let nearestDist = Infinity;
    this.walls.forEach((wall) => {
      const d = Phaser.Math.Distance.Between(worldX, worldY, wall.sprite.x, wall.sprite.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = wall;
      }
    });
    return nearest ? { wall: nearest, dist: nearestDist } : null;
  }

  updateWallHpBar(wall) {
    const ratio = Phaser.Math.Clamp(wall.hp / wall.maxHp, 0, 1);
    wall.hpBarFill.width = 14 * ratio;
    const color = ratio > 0.5 ? 0x55ee55 : ratio > 0.25 ? 0xdddd44 : 0xff4444;
    wall.hpBarFill.setFillStyle(color);
    wall.sprite.setAlpha(0.55 + ratio * 0.45);
  }

  createGroups() {
    this.animals = this.physics.add.group();
    this.predators = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.turrets = this.add.group();
    this.wallColliders = this.physics.add.staticGroup();
    this.physics.add.collider(this.predators, this.wallColliders);
  }

  createGridOverlay() {
    this.gridGraphics = this.add.graphics().setDepth(4).setAlpha(0.2);
  }

  createTurretGhost() {
    this.turretGhost = this.add.image(0, 0, 'dungeon_65').setDepth(14).setAlpha(0.55).setVisible(false);
  }

  createPlayer() {
    const { x, y } = this.tileToWorld(PEN.x + Math.floor(PEN.w / 2), PEN.y + Math.floor(PEN.h / 2));
    this.player = this.physics.add.sprite(x, y, SPRITES.farmer);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setSize(10, 10);
    this.player.setOffset(3, 6);
    this.player.health = 5;
    this.player.dashSpeed = 420;
    this.player.walkSpeed = 140;
    this.player.isDashing = false;
    this.player.dashCooldown = 0;
    this.player.shootCooldown = 0;
    this.player.invincible = 0;

    this.cameras.main.startFollow(this.player, true, 0.07, 0.07);
    this.cameras.main.setBounds(0, 0, MAP_W * T, MAP_H * T);
    this.cameras.main.setZoom(GAME.CAMERA_ZOOM);
    this.cameras.main.roundPixels = true;
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
      shop: Phaser.Input.Keyboard.KeyCodes.U,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    for (let i = 1; i <= HOTBAR_ITEMS.length; i++) {
      this.input.keyboard.on(`keydown-${i}`, () => {
        this.hotbarIndex = i - 1;
        this.syncUI();
      });
    }

    this.input.on('wheel', (_pointer, _gameObjects, _deltaX, deltaY) => {
      const dir = deltaY > 0 ? 1 : -1;
      this.hotbarIndex = (this.hotbarIndex + dir + HOTBAR_ITEMS.length) % HOTBAR_ITEMS.length;
      this.syncUI();
    });

    this.input.keyboard.on('keydown-Q', () => this.cycleTurretType(-1));
    this.input.keyboard.on('keydown-E', () => this.cycleTurretType(1));

    this.input.on('pointerdown', (pointer) => {
      if (this.gameOver || this.showShop) return;
      if (pointer.leftButtonDown()) this.handlePrimaryAction(pointer);
    });

    this.input.on('pointermove', (pointer) => {
      if (this.gameOver || this.showShop) return;
      this.updateTurretGhost(pointer);
    });
  }

  setupCollisions() {
    this.physics.add.overlap(this.bullets, this.predators, this.hitPredator, null, this);
    this.physics.add.overlap(this.predators, this.animals, this.predatorEatAnimal, null, this);
    this.physics.add.overlap(this.predators, this.player, this.predatorHitPlayer, null, this);
  }

  spawnInitialAnimals() {
    const cx = PEN.x + Math.floor(PEN.w / 2);
    const cy = PEN.y + Math.floor(PEN.h / 2);
    [
      this.tileToWorld(cx - 2, cy),
      this.tileToWorld(cx + 2, cy),
      this.tileToWorld(cx, cy + 1),
    ].forEach((pos) => this.placeAnimal(pos.x, pos.y));
  }

  cycleTurretType(dir) {
    if (this.unlockedTurrets.length <= 1) return;
    this.selectedTurretIndex = (this.selectedTurretIndex + dir + this.unlockedTurrets.length)
      % this.unlockedTurrets.length;
    this.syncUI();
  }

  isDeployMode() {
    return HOTBAR_ITEMS[this.hotbarIndex]?.type === 'deploy';
  }

  canPlaceTurretAt(tx, ty) {
    if (tx < 1 || ty < 1 || tx >= MAP_W - 1 || ty >= MAP_H - 1) return false;
    const type = this.mapData[ty][tx];
    if (type === 'tree' || type === 'wall') return false;
    if (this.turretCells.has(this.tileKey(tx, ty))) return false;
    return true;
  }

  updateGridOverlay() {
    this.gridGraphics.clear();
    if (!this.isDeployMode()) return;

    const cam = this.cameras.main;
    const startTx = Math.max(0, Math.floor(cam.scrollX / T));
    const endTx = Math.min(MAP_W - 1, Math.ceil((cam.scrollX + cam.width) / T));
    const startTy = Math.max(0, Math.floor(cam.scrollY / T));
    const endTy = Math.min(MAP_H - 1, Math.ceil((cam.scrollY + cam.height) / T));

    this.gridGraphics.lineStyle(1, 0xffffff, 0.35);
    for (let tx = startTx; tx <= endTx; tx++) {
      const x = tx * T;
      this.gridGraphics.lineBetween(x, startTy * T, x, (endTy + 1) * T);
    }
    for (let ty = startTy; ty <= endTy; ty++) {
      const y = ty * T;
      this.gridGraphics.lineBetween(startTx * T, y, (endTx + 1) * T, y);
    }
  }

  updateTurretGhost(pointer) {
    if (!this.isDeployMode()) {
      this.turretGhost.setVisible(false);
      return;
    }
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const snap = this.snapToTile(world.x, world.y);
    const def = this.getSelectedTurretType();
    this.turretGhost.setVisible(true);
    this.turretGhost.setPosition(snap.x, snap.y);
    this.turretGhost.setTexture(def.sprite);
    if (def.tint) this.turretGhost.setTint(def.tint);
    else this.turretGhost.clearTint();
    const ok = this.canPlaceTurretAt(snap.tx, snap.ty) && this.turretCount < this.maxTurrets;
    this.turretGhost.setAlpha(ok ? 0.65 : 0.35);
    this.turretGhost.setTint(ok ? (def.tint ?? 0xffffff) : 0xff4444);
  }

  handlePrimaryAction(pointer) {
    const item = HOTBAR_ITEMS[this.hotbarIndex];
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (item.type === 'weapon') this.fireGun(worldPoint.x, worldPoint.y);
    else if (item.type === 'deploy') this.tryPlaceTurret(worldPoint.x, worldPoint.y);
    else if (item.type === 'feed') this.useFeed(worldPoint.x, worldPoint.y);
  }

  fireGun(targetX, targetY) {
    const gun = this.getGunTier();
    if (this.player.shootCooldown > 0) return;
    this.player.shootCooldown = gun.cooldown;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);

    if (gun.aoe) {
      const rocket = this.bullets.create(this.player.x, this.player.y, 'tile_rocket');
      rocket.setDepth(12);
      rocket.setCircle(5);
      rocket.damage = gun.damage;
      rocket.aoeRadius = gun.aoeRadius;
      rocket.isRocket = true;
      rocket.targetX = targetX;
      rocket.targetY = targetY;
      this.physics.velocityFromRotation(angle, gun.bulletSpeed, rocket.body.velocity);
      rocket.maxDist = gun.range;
      rocket.startX = this.player.x;
      rocket.startY = this.player.y;
      return;
    }

    for (let i = 0; i < gun.pellets; i++) {
      const a = angle + Phaser.Math.FloatBetween(-gun.spread, gun.spread);
      const bullet = this.bullets.create(this.player.x, this.player.y, 'pellet');
      bullet.setDepth(12);
      bullet.setCircle(3);
      bullet.setTint(gun.id === 'sprayer' ? 0x66ccff : 0xffcc00);
      this.physics.velocityFromRotation(a, gun.bulletSpeed, bullet.body.velocity);
      bullet.damage = gun.damage;
      bullet.maxDist = gun.range;
      bullet.startX = this.player.x;
      bullet.startY = this.player.y;
    }
  }

  explodeRocket(rocket) {
    if (!rocket.active || rocket.exploded) return;
    rocket.exploded = true;
    const damage = rocket.damage ?? 150;
    const radius = rocket.aoeRadius ?? 90;
    const x = rocket.x;
    const y = rocket.y;
    rocket.destroy();

    const boom = this.add.circle(x, y, 8, 0xff4400, 0.85).setDepth(15);
    this.tweens.add({
      targets: boom,
      scale: radius / 8,
      alpha: 0,
      duration: 350,
      onComplete: () => boom.destroy(),
    });

    this.predators.children.each((predator) => {
      const d = Phaser.Math.Distance.Between(x, y, predator.x, predator.y);
      if (d <= radius) {
        predator.hp -= damage;
        predator.setTint(0xff4400);
        this.time.delayedCall(100, () => predator.clearTint());
        if (predator.hp <= 0) {
          this.addScore(predator.scoreValue);
          this.coins += Math.floor(predator.scoreValue / 3);
          predator.destroy();
        }
      }
    });
    this.cameras.main.shake(120, 0.012);
    this.syncUI();
  }

  placeAnimal(x, y) {
    const tier = this.getAnimalTier();
    const b = this.getPenWorldBounds();
    x = Phaser.Math.Clamp(x, b.minX, b.maxX);
    y = Phaser.Math.Clamp(y, b.minY, b.maxY);

    const animal = this.animals.create(x, y, tier.key);
    animal.setDepth(8);
    animal.setCircle(6);
    animal.animalType = tier.id;
    animal.setCollideWorldBounds(false);
    animal.setBounce(1);
    animal.setDrag(80);

    const speed = 18 + Math.random() * 12;
    animal.wanderSpeed = speed;
    animal.setVelocity(Phaser.Math.Between(-speed, speed), Phaser.Math.Between(-speed, speed));

    this.time.addEvent({
      delay: 2000 + Math.random() * 3000,
      loop: true,
      callback: () => {
        if (!animal.active) return;
        animal.setVelocity(
          Phaser.Math.Between(-speed, speed),
          Phaser.Math.Between(-speed, speed),
        );
      },
    });
  }

  convertAllAnimals() {
    const tier = this.getAnimalTier();
    this.animals.children.each((animal) => {
      if (!animal.active) return;
      animal.animalType = tier.id;
      animal.setTexture(tier.key);
    });
    this.breedTimer = 0;
  }

  upgradeAllTurrets(typeId) {
    const def = TURRET_TYPES[typeId];
    this.turrets.children.each((turret) => {
      turret.turretType = typeId;
      turret.setTexture(def.sprite);
      if (def.tint) turret.setTint(def.tint);
      else turret.clearTint();
    });
  }

  tryPlaceTurret(x, y) {
    if (this.turretCount >= this.maxTurrets) return;
    const turretType = this.getSelectedTurretType();
    if (!turretType || this.coins < turretType.cost) return;

    const snap = this.snapToTile(x, y);
    if (!this.canPlaceTurretAt(snap.tx, snap.ty)) return;

    this.coins -= turretType.cost;
    this.turretCount++;
    this.turretCells.add(this.tileKey(snap.tx, snap.ty));

    const turret = this.add.sprite(snap.x, snap.y, turretType.sprite).setDepth(9);
    if (turretType.tint) turret.setTint(turretType.tint);
    turret.turretType = turretType.id;
    turret.fireCooldown = 0;
    turret.tx = snap.tx;
    turret.ty = snap.ty;
    this.turrets.add(turret);
    this.syncUI();
  }

  useFeed(x, y) {
    if (this.coins < 10) return;
    this.coins -= 10;
    this.breedTimer += 2500;
    const burst = this.add.circle(x, y, 4, 0x7cba3d, 0.6).setDepth(15);
    this.tweens.add({ targets: burst, scale: 8, alpha: 0, duration: 400, onComplete: () => burst.destroy() });
    this.syncUI();
  }

  updateBreeding(delta) {
    if (this.animals.countActive() < 2) return;
    const tier = this.getAnimalTier();
    const breedSpeed = this.breedMultiplier * (this.autoFeed ? 1.25 : 1);
    this.breedTimer += delta * breedSpeed;
    if (this.breedTimer < tier.breedTime) return;

    this.breedTimer = 0;
    const animals = this.animals.getChildren().filter((a) => a.active);
    const parent = Phaser.Utils.Array.GetRandom(animals);
    const snap = this.snapToTile(
      parent.x + Phaser.Math.Between(-T, T),
      parent.y + Phaser.Math.Between(-T, T),
    );
    if (this.isInPenInterior(snap.tx, snap.ty)) {
      this.placeAnimal(snap.x, snap.y);
    } else {
      this.placeAnimal(parent.x, parent.y);
    }
    this.addScore(tier.scorePerBreed);
    this.coins += tier.coinPerBreed;
    this.syncUI();
  }

  startWave() {
    this.wave++;
    this.waveActive = true;
    this.peaceTimer = 0;
    const count = 1 + Math.floor(this.wave * 0.5);
    const difficulty = Math.min(Math.floor(this.wave / 5), SPRITES.predators.length - 1);
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 1200, () => {
        const tier = Math.min(difficulty + (Math.random() < 0.15 ? 1 : 0), SPRITES.predators.length - 1);
        this.spawnPredator(tier);
      });
    }
    this.syncUI();
  }

  spawnPredator(tier) {
    const template = SPRITES.predators[tier];
    const edge = Phaser.Math.Between(0, 3);
    let x; let y;
    switch (edge) {
      case 0: x = T * 1.5; y = Phaser.Math.Between(T * 2, (MAP_H - 2) * T); break;
      case 1: x = (MAP_W - 1.5) * T; y = Phaser.Math.Between(T * 2, (MAP_H - 2) * T); break;
      case 2: x = Phaser.Math.Between(T * 2, (MAP_W - 2) * T); y = T * 1.5; break;
      default: x = Phaser.Math.Between(T * 2, (MAP_W - 2) * T); y = (MAP_H - 1.5) * T;
    }
    const scale = 1 + this.wave * 0.015;
    const predator = this.predators.create(x, y, template.key);
    predator.setDepth(11);
    predator.setCircle(7);
    predator.hp = Math.floor(template.hp * scale);
    predator.speed = template.speed + this.wave * 0.5;
    predator.damage = template.damage;
    predator.scoreValue = template.score;
    predator.wallCooldown = 0;
    predator.eatCooldown = 0;
    predator.pushCooldown = 0;
    predator.setCollideWorldBounds(true);
  }

  hitPredator(bullet, predator) {
    if (bullet.isRocket) {
      this.explodeRocket(bullet);
      return;
    }
    bullet.destroy();
    predator.hp -= bullet.damage ?? 12;
    predator.setTint(0xffaaaa);
    this.time.delayedCall(80, () => predator.clearTint());
    if (predator.hp <= 0) {
      this.addScore(predator.scoreValue);
      this.coins += Math.floor(predator.scoreValue / 3);
      predator.destroy();
      this.syncUI();
    }
  }

  damageWall(wall, amount) {
    wall.hp -= amount;
    this.updateWallHpBar(wall);

    wall.sprite.setTint(0xffaaaa);
    this.time.delayedCall(80, () => wall.sprite.clearTint());

    if (wall.hp <= 0) {
      const interior = this.isInPenInterior(wall.tx, wall.ty);
      this.mapData[wall.ty][wall.tx] = interior ? 'pen_grass' : 'grass';
      this.paintTile(wall.tx, wall.ty, this.mapData[wall.ty][wall.tx]);

      wall.hpBarBg?.destroy();
      wall.hpBarFill?.destroy();
      wall.body?.destroy();
      wall.sprite.destroy();
      this.walls = this.walls.filter((w) => w !== wall);
      this.syncUI();
    }
  }

  getRepairCost() {
    const tier = this.getWallTier();
    let cost = 0;
    this.walls.forEach((wall) => {
      if (wall.hp < wall.maxHp) {
        cost += Math.ceil((1 - wall.hp / wall.maxHp) * tier.repairCost);
      }
    });
    const missing = this.getExpectedWallCount() - this.walls.length;
    if (missing > 0) cost += missing * tier.repairCost;
    return cost;
  }

  repairAllWalls() {
    if (this.walls.length < this.getExpectedWallCount()) {
      this.buildPenWalls();
      return;
    }
    this.walls.forEach((wall) => {
      wall.hp = wall.maxHp;
      this.updateWallHpBar(wall);
    });
  }

  predatorEatAnimal(predator, animal) {
    if (predator.eatCooldown > 0) return;
    predator.eatCooldown = 1800;
    const tier = ANIMAL_TIERS.find((t) => t.id === animal.animalType) ?? this.getAnimalTier();
    this.addScore(-Math.floor(tier.scorePerBreed / 2));
    animal.destroy();
    this.checkAnimalsAlive();
    this.syncUI();
  }

  checkAnimalsAlive() {
    if (this.animals.countActive() === 0 && !this.gameOver) {
      this.gameOverReason = 'animals';
      this.triggerGameOver();
    }
  }

  predatorHitPlayer(_predator, player) {
    if (player.invincible > 0 || player.isDashing) return;
    player.health -= 1;
    player.invincible = 1200;
    player.setTint(0xff4444);
    this.time.delayedCall(200, () => player.clearTint());
    this.cameras.main.shake(150, 0.008);
    this.syncUI();
  }

  findNearestPredator(x, y, range) {
    let nearest = null;
    let nearestDist = range;
    this.predators.children.each((p) => {
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = p;
      }
    });
    return nearest;
  }

  updateTurrets(delta) {
    this.turrets.children.each((turret) => {
      const def = TURRET_TYPES[turret.turretType];
      if (!def) return;
      turret.fireCooldown -= delta;
      if (turret.fireCooldown > 0) return;
      const target = this.findNearestPredator(turret.x, turret.y, def.range);
      if (!target) return;
      turret.fireCooldown = def.cooldown;

      if (def.type === 'push') {
        const angle = Phaser.Math.Angle.Between(turret.x, turret.y, target.x, target.y);
        this.physics.velocityFromRotation(angle, def.pushForce, target.body.velocity);
        target.pushCooldown = 300;
      } else {
        const angle = Phaser.Math.Angle.Between(turret.x, turret.y, target.x, target.y);
        const bullet = this.bullets.create(turret.x, turret.y, 'pellet');
        bullet.setTint(def.tint ?? 0x66ccff);
        bullet.setDepth(12);
        bullet.setCircle(3);
        this.physics.velocityFromRotation(angle, 300, bullet.body.velocity);
        bullet.damage = def.damage;
        this.time.delayedCall(800, () => bullet.active && bullet.destroy());
      }
    });
  }

  updatePredatorAI() {
    const penSealed = !this.hasPenEntrance();
    const attackRange = T * 0.85;

    this.predators.children.each((predator) => {
      if (predator.eatCooldown > 0) predator.eatCooldown -= 16;
      if (predator.wallCooldown > 0) predator.wallCooldown -= 16;

      if (predator.pushCooldown > 0) {
        predator.pushCooldown -= 16;
        return;
      }

      if (penSealed) {
        const nearWall = this.findNearestWall(predator.x, predator.y);
        if (nearWall) {
          if (nearWall.dist <= attackRange) {
            predator.setVelocity(0, 0);
            if (predator.wallCooldown <= 0) {
              predator.wallCooldown = 750;
              this.damageWall(nearWall.wall, predator.damage * 15);
            }
            return;
          }
          this.physics.moveToObject(predator, nearWall.wall.sprite, predator.speed);
          return;
        }
      }

      let target = null;
      let targetDist = Infinity;

      this.animals.children.each((animal) => {
        const d = Phaser.Math.Distance.Between(predator.x, predator.y, animal.x, animal.y);
        if (d < targetDist) {
          targetDist = d;
          target = animal;
        }
      });

      if (!target || targetDist > 220) {
        const d = Phaser.Math.Distance.Between(predator.x, predator.y, this.player.x, this.player.y);
        if (d < targetDist) target = this.player;
      }

      if (target) this.physics.moveToObject(predator, target, predator.speed);
    });
  }

  addScore(amount) {
    this.score = Math.max(0, this.score + amount);
  }

  tryDash() {
    if (this.player.isDashing || this.player.dashCooldown > 0) return;
    const vx = (this.cursors.left.isDown || this.wasd.left.isDown ? -1 : 0)
      + (this.cursors.right.isDown || this.wasd.right.isDown ? 1 : 0);
    const vy = (this.cursors.up.isDown || this.wasd.up.isDown ? -1 : 0)
      + (this.cursors.down.isDown || this.wasd.down.isDown ? 1 : 0);
    let dirX = vx || 1;
    let dirY = vy;
    const len = Math.hypot(dirX, dirY) || 1;
    this.player.isDashing = true;
    this.player.invincible = 300;
    this.player.dashCooldown = 900 * this.dashCooldownMult;
    this.player.setVelocity((dirX / len) * this.player.dashSpeed, (dirY / len) * this.player.dashSpeed);
    this.time.delayedCall(180, () => {
      this.player.isDashing = false;
      this.player.setVelocity(0, 0);
    });
  }

  getUpgradeCost(upgrade) {
    if (upgrade.type === 'animal') {
      const next = this.animalTier + 1;
      return next < ANIMAL_UPGRADE_COSTS.length ? ANIMAL_UPGRADE_COSTS[next] : null;
    }
    if (upgrade.type === 'gun') {
      const next = this.gunTier + 1;
      return next < GUN_UPGRADE_COSTS.length ? GUN_UPGRADE_COSTS[next] : null;
    }
    if (upgrade.type === 'wall') {
      const next = this.wallTier + 1;
      return next < WALL_UPGRADE_COSTS.length ? WALL_UPGRADE_COSTS[next] : null;
    }
    if (upgrade.type === 'repair') {
      const cost = this.getRepairCost();
      return cost > 0 ? cost : null;
    }
    return upgrade.cost;
  }

  isUpgradeMaxed(upgrade) {
    if (upgrade.type === 'animal') return this.animalTier >= ANIMAL_TIERS.length - 1;
    if (upgrade.type === 'gun') return this.gunTier >= GUN_TIERS.length - 1;
    if (upgrade.type === 'wall') return this.wallTier >= WALL_TIERS.length - 1;
    if (upgrade.type === 'turret') return this.unlockedTurrets.includes(upgrade.turretId);
    if (upgrade.type === 'repair') return false;
    return (this.upgradeLevels[upgrade.id] ?? 0) >= upgrade.max;
  }

  buyUpgrade(id) {
    const upgrade = UPGRADES.find((u) => u.id === id);
    if (!upgrade || this.isUpgradeMaxed(upgrade)) return;

    let cost = this.getUpgradeCost(upgrade);
    if (upgrade.type === 'repair') {
      cost = this.getRepairCost();
      if (cost <= 0) return;
    }
    if (cost === null || this.coins < cost) return;

    this.coins -= cost;

    if (upgrade.type === 'animal') {
      this.animalTier += 1;
      this.convertAllAnimals();
    } else if (upgrade.type === 'gun') {
      this.gunTier += 1;
    } else if (upgrade.type === 'wall') {
      this.wallTier += 1;
      const tier = this.getWallTier();
      this.walls.forEach((wall) => {
        wall.maxHp = tier.hp;
        wall.hp = tier.hp;
        wall.sprite.setTexture(tier.sprite);
        this.updateWallHpBar(wall);
      });
    } else if (upgrade.type === 'repair') {
      this.repairAllWalls();
    } else if (upgrade.type === 'turret') {
      if (!this.unlockedTurrets.includes(upgrade.turretId)) {
        this.unlockedTurrets.push(upgrade.turretId);
        this.unlockedTurrets.sort(
          (a, b) => TURRET_UNLOCK_ORDER.indexOf(a) - TURRET_UNLOCK_ORDER.indexOf(b),
        );
      }
      this.upgradeAllTurrets(upgrade.turretId);
      this.selectedTurretIndex = this.unlockedTurrets.indexOf(upgrade.turretId);
      this.upgradeLevels[id] = 1;
    } else {
      this.upgradeLevels[id] = (this.upgradeLevels[id] ?? 0) + 1;
      this.applyUpgrade(id);
    }
    this.syncUI();
  }

  applyUpgrade(id) {
    if (id === 'turret_slot') this.maxTurrets += 1;
    else if (id === 'breed_speed') this.breedMultiplier *= 1.3;
    else if (id === 'dash_cd') this.dashCooldownMult *= 0.8;
    else if (id === 'auto_feed') this.autoFeed = true;
  }

  openShop() {
    if (this.waveActive || this.gameOver) return;
    this.showShop = true;
    this.physics.pause();
    this.syncUI();
  }

  closeShop() {
    this.showShop = false;
    this.physics.resume();
    this.syncUI();
  }

  triggerGameOver() {
    this.gameOver = true;
    this.physics.pause();
    this.syncUI();
  }

  checkWaveComplete() {
    if (!this.waveActive) return;
    if (this.predators.countActive() === 0) {
      this.waveActive = false;
      this.peaceTimer = this.waveInterval;
      this.coins += 20 + this.wave * 5;
      this.syncUI();
    }
  }

  updateBullets() {
    this.bullets.children.each((bullet) => {
      if (!bullet.active) return;
      if (bullet.isRocket) {
        const dist = Phaser.Math.Distance.Between(bullet.startX, bullet.startY, bullet.x, bullet.y);
        const toTarget = Phaser.Math.Distance.Between(bullet.x, bullet.y, bullet.targetX, bullet.targetY);
        if (dist > bullet.maxDist || toTarget < 20) {
          this.explodeRocket(bullet);
        }
        return;
      }
      if (!bullet.maxDist) return;
      const dist = Phaser.Math.Distance.Between(bullet.startX, bullet.startY, bullet.x, bullet.y);
      if (dist > bullet.maxDist) bullet.destroy();
    });
  }

  update(_time, delta) {
    if (this.gameOver) return;

    if (this.showShop) {
      if (Phaser.Input.Keyboard.JustDown(this.wasd.shop) || Phaser.Input.Keyboard.JustDown(this.wasd.esc)) {
        this.closeShop();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.wasd.shop) && !this.waveActive) this.openShop();

    if (this.player.dashCooldown > 0) this.player.dashCooldown -= delta;
    if (this.player.shootCooldown > 0) this.player.shootCooldown -= delta;
    if (this.player.invincible > 0) this.player.invincible -= delta;
    if (Phaser.Input.Keyboard.JustDown(this.wasd.dash)) this.tryDash();

    if (!this.player.isDashing) {
      let vx = 0;
      let vy = 0;
      if (this.cursors.left.isDown || this.wasd.left.isDown) vx -= 1;
      if (this.cursors.right.isDown || this.wasd.right.isDown) vx += 1;
      if (this.cursors.up.isDown || this.wasd.up.isDown) vy -= 1;
      if (this.cursors.down.isDown || this.wasd.down.isDown) vy += 1;
      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        this.player.setVelocity((vx / len) * this.player.walkSpeed, (vy / len) * this.player.walkSpeed);
      } else {
        this.player.setVelocity(0, 0);
      }
    }

    if (!this.waveActive) {
      this.peaceTimer -= delta;
      if (this.peaceTimer <= 0) this.startWave();
    }

    this.updateGridOverlay();
    this.updateAnimalsInPen();
    this.updateBreeding(delta);
    this.updatePredatorAI();
    this.updateTurrets(delta);
    this.updateBullets();
    this.checkWaveComplete();

    if (_time % 100 < delta) this.syncUI();
  }
}

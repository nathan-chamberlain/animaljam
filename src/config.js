export const GAME = {
  WIDTH: 960,
  HEIGHT: 640,
  TILE: 16,
  SCALE: 3,
  CAMERA_ZOOM: 2,
};

export const MAP_W = 72;
export const MAP_H = 52;

export const PEN = {
  x: 29,
  y: 21,
  w: 14,
  h: 10,
};

export const ANIMAL_TIERS = [
  { id: 'chicken', name: 'Chicken', key: 'creature_151', breedTime: 8000, coinPerBreed: 5, scorePerBreed: 10 },
  { id: 'sheep', name: 'Sheep', key: 'creature_154', breedTime: 7500, coinPerBreed: 12, scorePerBreed: 18 },
  { id: 'goat', name: 'Goat', key: 'creature_153', breedTime: 7000, coinPerBreed: 20, scorePerBreed: 28 },
  { id: 'cow', name: 'Cow', key: 'creature_152', breedTime: 6500, coinPerBreed: 35, scorePerBreed: 40 },
];

export const ANIMAL_UPGRADE_COSTS = [0, 45, 90, 160];

export const GUN_TIERS = [
  {
    id: 'shotgun',
    name: 'Shotgun',
    sprite: 'gun_shotgun',
    damage: 12,
    pellets: 5,
    spread: 0.22,
    bulletSpeed: 380,
    range: 550,
    cooldown: 380,
    aoe: false,
  },
  {
    id: 'rifle',
    name: 'Rifle',
    sprite: 'gun_rifle',
    damage: 22,
    pellets: 1,
    spread: 0.04,
    bulletSpeed: 520,
    range: 900,
    cooldown: 260,
    aoe: false,
  },
  {
    id: 'sprayer',
    name: 'Spray Gun',
    sprite: 'gun_sprayer',
    damage: 7,
    pellets: 9,
    spread: 0.4,
    bulletSpeed: 320,
    range: 420,
    cooldown: 180,
    aoe: false,
  },
  {
    id: 'rpg',
    name: 'Farm RPG',
    sprite: 'gun_rpg',
    damage: 150,
    pellets: 1,
    spread: 0.02,
    bulletSpeed: 260,
    range: 650,
    cooldown: 850,
    aoe: true,
    aoeRadius: 90,
  },
];

export const GUN_UPGRADE_COSTS = [0, 55, 110, 200];

export const WALL_TIERS = [
  { name: 'Wood Pen', hp: 60, sprite: 'wall_wood', repairCost: 10 },
  { name: 'Stone Pen', hp: 120, sprite: 'wall_stone', repairCost: 18 },
  { name: 'Iron Pen', hp: 200, sprite: 'wall_iron', repairCost: 28 },
];

export const WALL_UPGRADE_COSTS = [0, 70, 140];

export const TURRET_TYPES = {
  hose: {
    id: 'hose',
    name: 'Hose Turret',
    sprite: 'dungeon_65',
    type: 'push',
    pushForce: 300,
    range: 150,
    cooldown: 350,
    cost: 25,
    tint: 0x66ccff,
  },
  pea: {
    id: 'pea',
    name: 'Pea Shooter',
    sprite: 'dungeon_20',
    type: 'bullet',
    damage: 10,
    range: 190,
    cooldown: 650,
    cost: 45,
    tint: 0x88ff88,
  },
  sniper: {
    id: 'sniper',
    name: 'Snipe Tower',
    sprite: 'dungeon_117',
    type: 'bullet',
    damage: 28,
    range: 300,
    cooldown: 1100,
    cost: 70,
    tint: 0xffaa66,
  },
};

export const TURRET_UNLOCK_ORDER = ['hose', 'pea', 'sniper'];

export const SPRITES = {
  farmer: 'dungeon_109',
  grass: 'dungeon_48',
  penGrass: 'tile_grass',
  tilled: 'dungeon_49',
  tree: 'tile_tree',
  pellet: 'pellet',
  rocket: 'tile_rocket',
  predators: [
    { key: 'creature_161', name: 'Boar', hp: 18, speed: 50, damage: 1, score: 15 },
    { key: 'creature_165', name: 'Wolf', hp: 30, speed: 65, damage: 1, score: 30 },
    { key: 'creature_164', name: 'Bear', hp: 50, speed: 45, damage: 2, score: 60 },
    { key: 'dungeon_110', name: 'Crab', hp: 70, speed: 55, damage: 2, score: 100 },
  ],
};

export const HOTBAR_ITEMS = [
  { id: 'gun', label: 'Gun', type: 'weapon' },
  { id: 'turret', label: 'Turret', type: 'deploy' },
  { id: 'feed', label: 'Feed', type: 'feed' },
];

export const UPGRADES = [
  { id: 'animal', name: 'Better Livestock', desc: 'Upgrade & convert all animals', type: 'animal', max: ANIMAL_TIERS.length - 1 },
  { id: 'gun', name: 'Better Gun', desc: 'Upgrade weapon stats', type: 'gun', max: GUN_TIERS.length - 1 },
  { id: 'unlock_pea', name: 'Pea Shooter', desc: 'Unlock & upgrade all turrets', type: 'turret', turretId: 'pea', cost: 50, max: 1 },
  { id: 'unlock_sniper', name: 'Snipe Tower', desc: 'Unlock & upgrade all turrets', type: 'turret', turretId: 'sniper', cost: 130, max: 1 },
  { id: 'pen_wall', name: 'Stronger Pen', desc: 'Upgrade pen walls', type: 'wall', max: WALL_TIERS.length - 1 },
  { id: 'repair_walls', name: 'Repair Pen', desc: 'Restore all pen walls', type: 'repair', cost: 25, max: 99 },
  { id: 'turret_slot', name: 'Extra Turret', desc: '+1 turret capacity', cost: 80, max: 4 },
  { id: 'breed_speed', name: 'Breeding Boost', desc: 'Animals breed 30% faster', cost: 60, max: 4 },
  { id: 'dash_cd', name: 'Quick Dash', desc: 'Dash cooldown -20%', cost: 50, max: 3 },
  { id: 'auto_feed', name: 'Auto Feeder', desc: 'Passive breed timer boost', cost: 100, max: 1 },
];

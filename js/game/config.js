"use strict";

// Shared battlefield constants, path geometry, and small data-building helpers.

const canvas = document.getElementById("gameCanvas");

const W = canvas.width;
const H = canvas.height;
const CELL = 80;
const COLS = 12;
const ROWS = 8;
const GOLD_INCOME_RATE = .345;
const REPEAT_PLACEMENT_MULTIPLIER = 1.1;
const TREE_REMOVAL_COST = 400;
const MAX_RELICS_PER_TOWER = 3;
const MAX_MERCHANT_RELICS = 5;
const MAX_MERCHANT_FAVOUR = 5;
const DRACULA_BAT_COUNT = 5;
const DRACULA_BAT_DURATION = 5;
const DRACULA_BAT_COOLDOWN = 8;
const DRACULA_BAT_DAMAGE_MULTIPLIER = 1.3;
const UMBRAL_POSSESSION_DURATION = 4;
const UMBRAL_POSSESSION_RANGE = 110;
const UMBRAL_POSSESSION_ATTACK_COOLDOWN = .85;
const UMBRAL_BOSS_FEAR_DURATION = 1;
const MAX_MINE_WORKERS = 3;
const MINE_GOLD_PER_WORKER_PER_ROUND = 15;
const TREASURE_COVE_COST = 420;
const TREASURE_COVE_RELIC_CHANCE = .5;
const TINY_CASTLE_AURA_MULTIPLIER = 1.2;

const merchantRelics = {
  sword: { name: "Mercenary Sword", tier: "common", icon: "⚔", color: "#df5f48", cost: 160, description: "+25% damage", modifiers: { damage: 1.25 }, allowed: tower => tower.type !== "mine" && tower.type !== "ghost" && tower.type !== "castle" },
  amulet: { name: "Sun Amulet", tier: "common", icon: "◈", color: "#f1c65d", cost: 140, description: "+20% range", modifiers: { range: 1.2 }, allowed: tower => tower.type !== "mine" && tower.type !== "castle" },
  boots: { name: "Swift Boots", tier: "common", icon: "➟", color: "#7fcf79", cost: 150, description: "18% faster attacks", modifiers: { cooldown: .82 }, allowed: tower => tower.type !== "mine" && tower.type !== "castle" },
  shield: { name: "Guardian Shield", tier: "common", icon: "⬟", color: "#9fc6d4", cost: 180, description: "+30% Barracks troop health", modifiers: { troopHealth: 1.3 }, allowed: tower => tower.type === "barracks" },
  ring: { name: "Fortune Ring", tier: "common", icon: "●", color: "#c99cf2", cost: 175, description: "+50% Mine income or +20% Cove relic chance", modifiers: { mineIncome: 1.5, coveChance: 1.2 }, allowed: tower => tower.type === "mine" },

  runeblade: { name: "Runeblade", tier: "rare", icon: "◆", color: "#50a9ff", cost: 330, description: "+40% damage", modifiers: { damage: 1.4 }, allowed: tower => tower.type !== "mine" && tower.type !== "ghost" && tower.type !== "castle" },
  huntersLens: { name: "Hunter's Lens", tier: "rare", icon: "◉", color: "#57c9ff", cost: 310, description: "+35% range", modifiers: { range: 1.35 }, allowed: tower => tower.type !== "mine" && tower.type !== "castle" },
  silverHourglass: { name: "Silver Hourglass", tier: "rare", icon: "⧖", color: "#87bfff", cost: 350, description: "28% faster attacks", modifiers: { cooldown: .72 }, allowed: tower => tower.type !== "mine" && tower.type !== "castle" },
  emberstone: { name: "Emberstone", tier: "rare", icon: "✦", color: "#ff8a55", cost: 340, description: "+28% damage and +12% range", modifiers: { damage: 1.28, range: 1.12 }, allowed: tower => !["mine", "ghost", "castle"].includes(tower.type) },
  battlemarchHorn: { name: "Battlemarch Horn", tier: "rare", icon: "♬", color: "#68bce8", cost: 360, description: "+40% troop health and 18% faster attacks", modifiers: { troopHealth: 1.4, cooldown: .82 }, allowed: tower => tower.type === "barracks" },
  witchglass: { name: "Witchglass Prism", tier: "rare", icon: "◇", color: "#65d4ff", cost: 370, description: "+30% damage and +25% range for magic units", modifiers: { damage: 1.3, range: 1.25 }, allowed: tower => ["mage", "vampire", "ufo"].includes(tower.type) },
  giantGrip: { name: "Giant's Grip", tier: "rare", icon: "✊", color: "#75aee7", cost: 390, description: "+50% Stoneback Ogre damage", modifiers: { damage: 1.5 }, allowed: tower => tower.type === "ogre" },
  eagleFeather: { name: "Eagle Feather", tier: "rare", icon: "➶", color: "#8ed5ff", cost: 355, description: "+25% range and 16% faster attacks", modifiers: { range: 1.25, cooldown: .84 }, allowed: tower => ["archer", "ballista"].includes(tower.type) },

  starforgedCore: { name: "Starforged Core", tier: "epic", icon: "✹", color: "#d477ff", cost: 620, description: "+45% damage and 25% faster attacks", modifiers: { damage: 1.45, cooldown: .75 }, allowed: tower => tower.type !== "mine" && tower.type !== "ghost" && tower.type !== "castle" },
  oracleEye: { name: "Oracle Eye", tier: "epic", icon: "◈", color: "#bd6dff", cost: 590, description: "+55% range and 12% faster attacks", modifiers: { range: 1.55, cooldown: .88 }, allowed: tower => tower.type !== "mine" && tower.type !== "castle" },
  titanheart: { name: "Titanheart", tier: "epic", icon: "♥", color: "#e06cff", cost: 650, description: "+75% Barracks troop health and +30% damage", modifiers: { troopHealth: 1.75, damage: 1.3 }, allowed: tower => tower.type === "barracks" },
  stormCrown: { name: "Storm Crown", tier: "epic", icon: "♛", color: "#e28cff", cost: 680, description: "+40% damage and +35% range", modifiers: { damage: 1.4, range: 1.35 }, allowed: tower => !["mine", "ghost", "castle"].includes(tower.type) },
  phoenixAsh: { name: "Phoenix Ash", tier: "epic", icon: "♨", color: "#ff72d9", cost: 720, description: "+70% damage", modifiers: { damage: 1.7 }, allowed: tower => !["mine", "ghost", "castle"].includes(tower.type) },
  eternityDial: { name: "Eternity Dial", tier: "epic", icon: "◴", color: "#cf82ff", cost: 700, description: "40% faster attacks", modifiers: { cooldown: .6 }, allowed: tower => !["mine", "ghost", "castle"].includes(tower.type) },
  legionStandard: { name: "Legion Standard", tier: "epic", icon: "⚑", color: "#ec79ff", cost: 740, description: "+100% troop health and +50% damage", modifiers: { troopHealth: 2, damage: 1.5 }, allowed: tower => tower.type === "barracks" },
  midasSeal: { name: "Midas Seal", tier: "epic", icon: "⬢", color: "#f2a5ff", cost: 690, description: "+100% Mine income or +50% Cove relic chance", modifiers: { mineIncome: 2, coveChance: 1.5 }, allowed: tower => tower.type === "mine" },

  draculaCloak: { name: "Dracula's Cloak", tier: "unique", icon: "☾", color: "#ff8a32", cost: 1100, description: "Dracula form: 3× max-level damage, bat curse, and retains its path ability", modifiers: { draculaPower: 3 }, allowed: tower => tower.type === "vampire" },
  umbralForm: { name: "Umbral Form", tier: "unique", icon: "◉", color: "#ff8a32", cost: 1050, description: "Ghost becomes an Umbral Horror: possesses normal enemies for 4s and briefly fears bosses", modifiers: {}, allowed: tower => tower.type === "ghost" }
};

function relicMultiplier(tower, modifier) {
  return (tower?.items || []).reduce((multiplier, type) => multiplier * (merchantRelics[type]?.modifiers?.[modifier] || 1), 1);
}

function hasRelic(tower, type) {
  return Boolean(tower?.items?.includes(type));
}

const TREE_LAYOUT = [
  // Keep the first tree beside (not on) the enemy entrance at row 0, column 0.
  [0.45, 1.55, 0.8], [2.8, 1.45, .8], [5.5, 1.4, 1], [8, 1.5, .8], [11.55, 1.35, 1.05],
  [.25, 3.5, .9], [3.7, 3.4, .8], [6.2, 3.5, 1], [8.8, 3.4, .78], [11.55, 3.45, .95],
  [.3, 5.5, 1], [3, 5.45, .8], [5.6, 5.5, .95], [8, 5.4, .8], [11.55, 5.3, 1],
  [.35, 7.45, .9], [3.2, 7.5, .82], [6.1, 7.45, 1], [8.7, 7.5, .85]
].map(([x, z, scale], index) => ({ id: `tree-${index}`, col: Math.floor(x), row: Math.floor(z), x, z, scale, variant: index }));

const pathCells = [];
for (let x = -1; x <= 10; x++) pathCells.push([x, 0]);
for (let y = 1; y <= 2; y++) pathCells.push([10, y]);
for (let x = 9; x >= 1; x--) pathCells.push([x, 2]);
for (let y = 3; y <= 4; y++) pathCells.push([1, y]);
for (let x = 2; x <= 10; x++) pathCells.push([x, 4]);
for (let y = 5; y <= 7; y++) pathCells.push([10, y]);
for (let x = 11; x <= 12; x++) pathCells.push([x, 7]);
const pathSet = new Set(pathCells.filter(([x, y]) => x >= 0 && x < COLS && y >= 0 && y < ROWS).map(([x, y]) => `${x},${y}`));
const pathPoints = pathCells.map(([x, y]) => ({ x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 }));

function sequence(type, count, gap) {
  return Array.from({ length: count }, () => ({ type, gap }));
}

function mix(groups, gap) {
  const pools = groups.map(([type, count]) => ({ type, left: count }));
  const result = [];
  while (pools.some(p => p.left > 0)) {
    for (const pool of pools) {
      if (pool.left > 0) { result.push({ type: pool.type, gap }); pool.left--; }
    }
  }
  return result;
}

function combineWaveAndEvent(waveUnits, eventUnits) {
  const combined = [];
  let waveIndex = 0;
  let eventIndex = 0;
  while (waveIndex < waveUnits.length || eventIndex < eventUnits.length) {
    for (let index = 0; index < 2 && waveIndex < waveUnits.length; index++) {
      combined.push({ ...waveUnits[waveIndex++] });
    }
    if (eventIndex < eventUnits.length) combined.push({ ...eventUnits[eventIndex++] });
  }
  return combined;
}

"use strict";

// Defense placement, validation, derived stats, upgrades, and Gold Mine workers.

function placeTower(col, row) {
  if (!state.selectedBuild || !canPlace(col, row)) return;
  const type = towerTypes[state.selectedBuild];
  if (state.gold < type.cost) return;
  const tower = {
    type: state.selectedBuild,
    col, row,
    x: col * CELL + CELL / 2,
    y: row * CELL + CELL / 2,
    level: 1,
    cooldown: Math.random() * .15,
    angle: -Math.PI / 2,
    kills: 0,
    specialization: null,
    workers: 0,
    productionTimer: 0,
    summonTimer: 4,
    goldMined: 0,
    throwSwing: 0,
    fearPulse: 0,
    enemiesFeared: 0,
    volleyShotsRemaining: 0,
    volleyTimer: 0,
    archerShotTimers: [0, 0, 0],
    slingShotTimer: 0,
    bloodDrainTimer: 0,
    bloodDrainTarget: null,
    bloodDrainTargets: [],
    bloodParticleTimer: 0,
    minionsRaised: 0,
    items: [],
    spent: type.cost
  };
  state.gold -= type.cost;
  state.towers.push(tower);
  if (tower.type === "barracks") ensureBarracksKnights(tower);
  state.selectedBuild = null;
  state.selectedTower = tower;
  showInspectPanel(tower);
  updateUI();
}
function canPlace(col, row) {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS &&
    !pathSet.has(`${col},${row}`) &&
    !state.trees.some(tree => tree.col === col && tree.row === row) &&
    !state.towers.some(t => t.col === col && t.row === row);
}

function towerStats(tower) {
  const base = towerTypes[tower.type];
  const n = tower.level - 1;
  const stats = {
    range: base.range * (1 + n * .08),
    damage: base.damage * Math.pow(1.55, n),
    cooldown: base.cooldown * Math.pow(.9, n),
    splash: base.splash * (1 + n * .12),
    knockback: (base.knockback || 0) * (1 + n * .22),
    fearDuration: base.fearDuration || 0,
    fearCount: base.fearCount || 0,
    drainCount: tower.type === "vampire" && tower.specialization === "bloodstorm" ? 5 : 1
  };
  if (tower.type === "mage" && tower.specialization === "frost") {
    stats.damage *= .82;
    stats.splash *= 1.22;
  }
  if (tower.type === "archer" && tower.specialization === "riflemen") {
    stats.damage *= 2.15;
    stats.cooldown *= 1.7;
  } else if (tower.type === "archer" && tower.specialization === "slingshooters") {
    stats.damage *= 1.5;
    stats.cooldown *= 1.85;
    stats.splash = 72;
    stats.projectileSpeed = 310;
  }
  if (tower.type === "barracks" && tower.specialization === "graveyard") {
    stats.damage *= .62;
    stats.cooldown *= 1.15;
  } else if (tower.type === "barracks" && tower.specialization === "gladiators") {
    stats.damage *= 1.5;
    stats.cooldown *= .85;
  }
  if (tower.items?.includes("sword")) stats.damage *= 1.25;
  if (tower.items?.includes("amulet")) stats.range *= 1.2;
  if (tower.items?.includes("boots")) stats.cooldown *= .82;
  return stats;
}

function upgradeCost(tower) {
  if (tower.type === "mine") return null;
  return tower.level >= 3 ? null : Math.round(towerTypes[tower.type].cost * (.85 + tower.level * .55));
}

function upgradeTower() {
  const tower = state.selectedTower;
  if (!tower || tower.type === "mine") return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  if (tower.type === "mage" && tower.level === 2) tower.specialization = "arcane";
  if (tower.type === "barracks" && tower.level === 2) tower.specialization = "gladiators";
  if (tower.type === "archer" && tower.level === 2) tower.specialization = "riflemen";
  if (tower.type === "vampire" && tower.level === 2) tower.specialization = "bloodstorm";
  tower.level++;
  if (tower.type === "barracks") ensureBarracksKnights(tower, true);
  burst(tower.x, tower.y, towerTypes[tower.type].color, 18);
  showInspectPanel(tower);
  updateUI();
}

function workerCost(mine) {
  if (!mine || mine.type !== "mine" || mine.workers >= 3) return null;
  return [45, 65, 85][mine.workers];
}

function hireWorker() {
  const mine = state.selectedTower;
  if (!mine || mine.type !== "mine") return;
  const cost = workerCost(mine);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  mine.spent += cost;
  mine.workers++;
  burst(mine.x, mine.y, "#e7bd52", 14);
  showAnnouncement(`Worker hired — ${mine.workers} of 3 assigned`);
  showInspectPanel(mine);
  updateUI();
}

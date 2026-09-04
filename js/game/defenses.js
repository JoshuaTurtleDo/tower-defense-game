"use strict";

// Defense placement, validation, derived stats, upgrades, and Gold Mine workers.

function placementCost(type) {
  const placements = state.placementCounts[type] || 0;
  return Math.round(towerTypes[type].cost * Math.pow(REPEAT_PLACEMENT_MULTIPLIER, placements));
}

function placeTower(col, row) {
  if (!state.selectedBuild || !canPlace(col, row)) return;
  const towerType = state.selectedBuild;
  const type = towerTypes[towerType];
  const cost = placementCost(towerType);
  if (state.gold < cost) return;
  const tower = {
    type: towerType,
    col, row,
    x: col * CELL + CELL / 2,
    y: row * CELL + CELL / 2,
    level: 1,
    cooldown: Math.random() * .15,
    angle: -Math.PI / 2,
    kills: 0,
    specialization: null,
    workers: 0,
    incomeRemainder: 0,
    summonTimer: 4,
    goldMined: 0,
    relicsExcavated: 0,
    throwSwing: 0,
    stoneThrowTimer: 0,
    toggaUnit: null,
    fearPulse: 0,
    enemiesFeared: 0,
    enemiesPossessed: 0,
    volleyShotsRemaining: 0,
    volleyTimer: 0,
    archerShotTimers: [0, 0, 0],
    slingShotTimer: 0,
    bloodDrainTimer: 0,
    bloodDrainTarget: null,
    bloodDrainTargets: [],
    bloodParticleTimer: 0,
    batCurseCooldown: 0,
    batCursePulse: 0,
    enemiesBatCursed: 0,
    minionsRaised: 0,
    items: [],
    spent: cost
  };
  state.gold -= cost;
  state.placementCounts[towerType] = (state.placementCounts[towerType] || 0) + 1;
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

function towersAreAdjacent(first, second) {
  if (!first || !second || first === second) return false;
  return Math.max(Math.abs(first.col - second.col), Math.abs(first.row - second.row)) === 1;
}

function hasTinyCastleAura(tower) {
  if (!tower || tower.type === "castle" || tower.type === "mine") return false;
  return state.towers.some(castle => castle.type === "castle" && towersAreAdjacent(castle, tower));
}

function tinyCastleBuffedTowers(castle) {
  if (!castle || castle.type !== "castle") return [];
  return state.towers.filter(tower => tower.type !== "castle" && tower.type !== "mine" && towersAreAdjacent(castle, tower));
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
    fearCount: (base.fearCount || 0) + (tower.type === "ghost" ? n : 0),
    drainCount: tower.type === "vampire" && tower.specialization === "bloodstorm" ? 5 : 1,
    laserCount: tower.type === "ufo" && tower.specialization === "twinlaser" ? 2 : 1
  };
  if (tower.type === "mage" && tower.specialization === "frost") {
    stats.damage *= .82;
    stats.splash *= 1.22;
  }
  if (tower.type === "archer" && tower.specialization === "riflemen") {
    stats.damage *= base.rifleDamageMultiplier;
    stats.cooldown *= 1.7;
  } else if (tower.type === "archer" && tower.specialization === "slingshooters") {
    stats.damage = base.slingshooterDamage;
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
  if (tower.type === "ogre" && tower.specialization === "togga") {
    stats.damage = base.warriorDamage;
    stats.cooldown = base.warriorCooldown;
    stats.splash = 0;
  } else if (tower.type === "ogre" && tower.specialization === "stoneThrow") {
    stats.damage = base.stoneDamage;
    stats.cooldown = base.stoneCooldown;
    stats.splash = base.stoneSplash;
    stats.splashDamage = base.stoneSplashDamage;
    stats.projectileSpeed = base.stoneProjectileSpeed;
  }
  if (tower.type === "ballista") {
    stats.burnRatio = tower.specialization === "flameBazooka" ? base.flameBurnRatio : 0;
    stats.burnDuration = tower.specialization === "flameBazooka" ? base.flameBurnDuration : 0;
    stats.shockDuration = tower.specialization === "zeusBow" ? base.shockDuration : 0;
    stats.shockDamageTakenMultiplier = tower.specialization === "zeusBow" ? base.shockDamageTakenMultiplier : 1;
    stats.shockStunDuration = tower.specialization === "zeusBow" ? base.shockStunDuration : 0;
  }
  if (tower.type === "ufo" && tower.specialization === "massivebeam") {
    stats.damage *= base.massiveDamageMultiplier;
    stats.cooldown *= base.massiveCooldownMultiplier;
    stats.splash = base.massiveSplash;
    stats.projectileSpeed = 760;
  }
  stats.damage *= relicMultiplier(tower, "damage");
  if (stats.splashDamage !== undefined) stats.splashDamage *= relicMultiplier(tower, "damage");
  if (tower.type === "vampire" && hasRelic(tower, "draculaCloak")) {
    const maxLevelDamage = base.damage * Math.pow(1.55, 2);
    stats.damage = maxLevelDamage * relicMultiplier(tower, "draculaPower") * relicMultiplier(tower, "damage");
  }
  stats.range *= relicMultiplier(tower, "range");
  stats.cooldown *= relicMultiplier(tower, "cooldown");
  if (hasTinyCastleAura(tower)) {
    stats.damage *= TINY_CASTLE_AURA_MULTIPLIER;
    if (stats.splashDamage !== undefined) stats.splashDamage *= TINY_CASTLE_AURA_MULTIPLIER;
    stats.range *= TINY_CASTLE_AURA_MULTIPLIER;
    stats.cooldown /= TINY_CASTLE_AURA_MULTIPLIER;
  }
  return stats;
}

function upgradeCost(tower) {
  if (tower.type === "mine" || tower.type === "castle") return null;
  const base = towerTypes[tower.type];
  return tower.level >= 3 ? null : Math.round(base.cost * (.85 + tower.level * .55) * (base.upgradeCostMultiplier || 1));
}

function upgradeTower() {
  const tower = state.selectedTower;
  if (!tower || tower.type === "mine" || tower.type === "castle") return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  if (tower.type === "mage" && tower.level === 2) tower.specialization = "arcane";
  if (tower.type === "barracks" && tower.level === 2) tower.specialization = "gladiators";
  if (tower.type === "archer" && tower.level === 2) tower.specialization = "riflemen";
  if (tower.type === "vampire" && tower.level === 2) tower.specialization = "bloodstorm";
  if (tower.type === "ogre" && tower.level === 2) tower.specialization = "togga";
  if (tower.type === "ballista" && tower.level === 2) tower.specialization = "flameBazooka";
  tower.level++;
  if (tower.type === "barracks") ensureBarracksKnights(tower, true);
  if (tower.type === "ogre" && tower.specialization === "togga") ensureToggaWarrior(tower, true);
  burst(tower.x, tower.y, towerTypes[tower.type].color, 18);
  showInspectPanel(tower);
  updateUI();
}

function workerCost(mine) {
  if (!mine || mine.type !== "mine" || mine.specialization === "treasureCove" || mine.workers >= MAX_MINE_WORKERS) return null;
  return [45, 65, 85, 110, 140][mine.workers];
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
  showAnnouncement(`Worker hired — ${mine.workers} of ${MAX_MINE_WORKERS} assigned`);
  showInspectPanel(mine);
  updateUI();
}

function treasureCoveRelicChance(mine) {
  return Math.min(1, TREASURE_COVE_RELIC_CHANCE * relicMultiplier(mine, "coveChance"));
}

function upgradeTreasureCove() {
  const mine = state.selectedTower;
  if (!mine || mine.type !== "mine" || mine.specialization === "treasureCove" || mine.workers < MAX_MINE_WORKERS || state.gold < TREASURE_COVE_COST) return;
  state.gold -= TREASURE_COVE_COST;
  mine.spent += TREASURE_COVE_COST;
  mine.specialization = "treasureCove";
  mine.level = 2;
  mine.incomeRemainder = 0;
  burst(mine.x, mine.y, "#8cd6d1", 15);
  burst(mine.x, mine.y, "#c18bea", 15);
  burst(mine.x, mine.y, "#efbc55", 15);
  showAnnouncement("Treasure Cove established — the workers now excavate relics!");
  showInspectPanel(mine);
  updateUI();
}

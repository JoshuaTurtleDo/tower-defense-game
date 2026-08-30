"use strict";

const canvas = document.getElementById("gameCanvas");

const W = canvas.width;
const H = canvas.height;
const CELL = 80;
const COLS = 12;
const ROWS = 8;

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

const towerTypes = {
  archer: { name: "Archer Tower", cost: 70, range: 145, damage: 14, cooldown: .65, projectileSpeed: 480, color: "#d6d19c", splash: 0, emblem: "➶", className: "archer-emblem" },
  mage: { name: "Mage Spire", cost: 110, range: 128, damage: 28, cooldown: 1.15, projectileSpeed: 330, color: "#a788eb", splash: 62, emblem: "✦", className: "mage-emblem" },
  ballista: { name: "Royal Ballista", cost: 160, range: 215, damage: 62, cooldown: 2.05, projectileSpeed: 650, color: "#e5a654", splash: 0, emblem: "✧", className: "ballista-emblem" },
  barracks: { name: "Royal Barracks", cost: 135, range: 138, damage: 12, cooldown: .85, projectileSpeed: 0, color: "#b9c8cf", splash: 0, emblem: "⚔", className: "barracks-emblem" },
  ogre: { name: "Stoneback Ogre", cost: 185, range: 132, damage: 52, cooldown: 3.8, projectileSpeed: 0, color: "#8e8050", splash: 0, knockback: 150, emblem: "✊", className: "ogre-emblem" },
  mine: { name: "Gold Mine", cost: 125, range: 0, damage: 0, cooldown: 1, projectileSpeed: 0, color: "#e2b84f", splash: 0, emblem: "⚒", className: "mine-emblem" }
};

const enemyTypes = {
  goblin: { name: "Goblin", hp: 48, speed: 78, reward: 8, damage: 1, color: "#66833e", armor: 0, symbol: "G", scale: .82, barWidth: 27, barOffset: 23 },
  skeleton: { name: "Skeleton", hp: 88, speed: 59, reward: 11, damage: 1, color: "#d8d0b7", armor: .06, symbol: "☠", scale: .94, barWidth: 30, barOffset: 27 },
  orc: { name: "Armored Orc", hp: 178, speed: 43, reward: 17, damage: 2, color: "#536f3c", armor: .2, symbol: "O", scale: 1.08, barWidth: 35, barOffset: 30 },
  ogre: { name: "Ogre", hp: 340, speed: 31, reward: 31, damage: 3, color: "#7b7045", armor: .12, symbol: "Ω", scale: 1.34, barWidth: 43, barOffset: 35 },
  dragon: { name: "Ancient Dragon", hp: 1080, speed: 34, reward: 130, damage: 8, color: "#9b382d", armor: .18, symbol: "D", scale: 1.65, barWidth: 58, barOffset: 43 }
};

const waves = [
  { name: "Goblin Scouts", units: sequence("goblin", 8, .7) },
  { name: "Grinning Horde", units: mix([["goblin", 11], ["skeleton", 3]], .58) },
  { name: "The Restless Dead", units: mix([["skeleton", 8], ["goblin", 8]], .58) },
  { name: "Orc Vanguard", units: mix([["orc", 5], ["goblin", 10], ["skeleton", 4]], .58) },
  { name: "Bone and Iron", units: mix([["skeleton", 11], ["orc", 7], ["goblin", 6]], .48) },
  { name: "Ogres at the Gate", units: mix([["ogre", 3], ["goblin", 12], ["skeleton", 8]], .52) },
  { name: "The Green Tide", units: mix([["orc", 11], ["ogre", 4], ["goblin", 14]], .42) },
  { name: "Graveborn Legion", units: mix([["skeleton", 18], ["orc", 10], ["ogre", 5]], .38) },
  { name: "Monstrous Siege", units: mix([["ogre", 8], ["orc", 15], ["skeleton", 14], ["goblin", 10]], .34) },
  { name: "Wrath of the Dragon", units: mix([["goblin", 10], ["skeleton", 10], ["orc", 9], ["ogre", 5], ["dragon", 1]], .46) }
];

const graphics3D = new ThreeGraphics(canvas, {
  W, H, CELL, COLS, ROWS, pathPoints, pathCells, towerTypes, enemyTypes
});

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

let state;
let lastTime = performance.now();
let hoverCell = null;
let announcementTimer = 0;
const cameraDrag = {
  active: false,
  dragged: false,
  suppressClick: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0
};

function freshState() {
  return {
    gold: 250,
    lives: 20,
    wave: 0,
    enemies: [],
    towers: [],
    knights: [],
    projectiles: [],
    particles: [],
    selectedBuild: null,
    selectedTower: null,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    paused: false,
    speed: 1,
    totalKills: 0,
    ended: false,
    elapsed: 0
  };
}

function resetGame() {
  state = freshState();
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("pauseOverlay").classList.add("hidden");
  document.getElementById("pauseButton").textContent = "Ⅱ";
  document.getElementById("speedButton").textContent = "1×";
  showBuildPanel();
  updateUI();
}

function startWave() {
  if (state.waveActive || state.ended || state.wave >= waves.length) return;
  state.waveActive = true;
  state.spawnQueue = waves[state.wave].units.map(unit => ({ ...unit }));
  state.spawnTimer = .35;
  state.wave++;
  showAnnouncement(`Wave ${state.wave} — ${waves[state.wave - 1].name}`);
  updateUI();
}

function spawnEnemy(type) {
  const base = enemyTypes[type];
  const scale = 1 + Math.max(0, state.wave - 1) * .11;
  state.enemies.push({
    type,
    x: pathPoints[0].x,
    y: pathPoints[0].y,
    pathIndex: 1,
    hp: base.hp * scale,
    maxHp: base.hp * scale,
    speed: base.speed * (1 + Math.max(0, state.wave - 1) * .012),
    reward: base.reward,
    damage: base.damage,
    armor: base.armor,
    meleeCooldown: .4 + Math.random() * .4,
    attackSwing: 0,
    blocked: false,
    moving: true,
    combatAngle: 0,
    thrown: false,
    throwArc: 0,
    throwSpin: 0,
    slowTimer: 0,
    slowStrength: 0,
    facing: 1,
    phase: Math.random() * Math.PI * 2,
    dead: false,
    reached: false,
    hitFlash: 0
  });
}

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
    goldMined: 0,
    throwSwing: 0,
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
    !pathSet.has(`${col},${row}`) && !state.towers.some(t => t.col === col && t.row === row);
}

function towerStats(tower) {
  const base = towerTypes[tower.type];
  const n = tower.level - 1;
  const stats = {
    range: base.range * (1 + n * .08),
    damage: base.damage * Math.pow(1.55, n),
    cooldown: base.cooldown * Math.pow(.9, n),
    splash: base.splash * (1 + n * .12),
    knockback: (base.knockback || 0) * (1 + n * .22)
  };
  if (tower.type === "mage" && tower.specialization === "frost") {
    stats.damage *= .82;
    stats.splash *= 1.22;
  }
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

function barracksCapacity(tower) {
  return Math.min(4, tower.level + 1);
}

function knightMaxHp(tower) {
  return Math.round(72 * Math.pow(1.5, tower.level - 1));
}

function ensureBarracksKnights(tower, healExisting = false) {
  if (!tower || tower.type !== "barracks") return;
  if (tower.rallyIndex === undefined) {
    let nearestIndex = 1;
    let nearestDistance = Infinity;
    for (let i = 1; i < pathPoints.length - 1; i++) {
      const distance = Math.hypot(pathPoints[i].x - tower.x, pathPoints[i].y - tower.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    tower.rallyIndex = nearestIndex;
  }
  const capacity = barracksCapacity(tower);
  const owned = state.knights.filter(knight => knight.owner === tower);
  while (owned.length < capacity) {
    const knight = {
      owner: tower,
      slot: owned.length,
      x: tower.x,
      y: tower.y,
      hp: knightMaxHp(tower),
      maxHp: knightMaxHp(tower),
      alive: true,
      target: null,
      attackCooldown: Math.random() * .3,
      respawnTimer: 0,
      angle: 0,
      hitFlash: 0,
      swing: 0,
      moving: false,
      clashing: false,
      phase: Math.random() * Math.PI * 2
    };
    state.knights.push(knight);
    owned.push(knight);
  }
  for (const knight of owned) {
    knight.maxHp = knightMaxHp(tower);
    if (healExisting) {
      knight.hp = knight.maxHp;
      knight.alive = true;
      knight.respawnTimer = 0;
    } else knight.hp = Math.min(knight.hp, knight.maxHp);
  }
}

function knightRallyPoint(knight) {
  const tower = knight.owner;
  const index = tower.rallyIndex;
  const point = pathPoints[index];
  const previous = pathPoints[Math.max(0, index - 1)];
  const next = pathPoints[Math.min(pathPoints.length - 1, index + 1)];
  const dx = next.x - previous.x;
  const dy = next.y - previous.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = (knight.slot - (barracksCapacity(tower) - 1) / 2) * 21;
  return { x: point.x + dx / length * offset, y: point.y + dy / length * offset };
}

function defeatKnight(knight) {
  knight.alive = false;
  knight.hp = 0;
  knight.target = null;
  knight.respawnTimer = 8;
  burst(knight.x, knight.y, "#aebbc0", 9);
  if (state.selectedTower === knight.owner) showInspectPanel(knight.owner);
}

function enemyMeleeDamage(enemy) {
  const baseDamage = { goblin: 7, skeleton: 9, orc: 14, ogre: 24, dragon: 40 }[enemy.type] || 8;
  return baseDamage * (1 + Math.max(0, state.wave - 1) * .04);
}

function updateKnights(dt) {
  for (const knight of state.knights) {
    const tower = knight.owner;
    if (!state.towers.includes(tower)) continue;
    knight.hitFlash = Math.max(0, knight.hitFlash - dt);
    knight.swing = Math.max(0, knight.swing - dt);
    knight.moving = false;
    knight.clashing = false;
    if (!knight.alive) {
      knight.respawnTimer -= dt;
      if (knight.respawnTimer <= 0) {
        knight.alive = true;
        knight.hp = knight.maxHp;
        knight.x = tower.x;
        knight.y = tower.y;
        burst(knight.x, knight.y, "#d9e2e5", 8);
        if (state.selectedTower === tower) showInspectPanel(tower);
      }
      continue;
    }

    const stats = towerStats(tower);
    if (!knight.target || knight.target.dead || knight.target.reached || knight.target.thrown || Math.hypot(knight.target.x - tower.x, knight.target.y - tower.y) > stats.range + 28) {
      const claimed = new Set(state.knights.filter(other => other !== knight && other.alive && other.owner === tower && other.target && !other.target.dead).map(other => other.target));
      const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
      candidates.sort((a, b) => enemyProgress(b) - enemyProgress(a));
      knight.target = candidates.find(enemy => !claimed.has(enemy)) || candidates[0] || null;
    }

    const destination = knight.target || knightRallyPoint(knight);
    const dx = destination.x - knight.x;
    const dy = destination.y - knight.y;
    const distance = Math.hypot(dx, dy);
    knight.angle = Math.atan2(dy, dx);
    knight.attackCooldown -= dt;
    if (knight.target && distance <= 22) {
      knight.clashing = true;
      if (knight.attackCooldown <= 0) {
        damageEnemy(knight.target, stats.damage, tower, false);
        knight.attackCooldown = stats.cooldown;
        knight.swing = .34;
        burst(knight.target.x, knight.target.y, "#d3dfe3", 3);
      }
    } else if (distance > 3) {
      knight.moving = true;
      const step = Math.min(distance, 105 * dt);
      knight.x += dx / distance * step;
      knight.y += dy / distance * step;
    }
  }
}

function chooseFrostPath() {
  const tower = state.selectedTower;
  if (!tower || tower.type !== "mage" || tower.level !== 2) return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  tower.level++;
  tower.specialization = "frost";
  burst(tower.x, tower.y, "#8fe8f4", 26);
  showAnnouncement("Frost Path unlocked — group slowing enabled");
  showInspectPanel(tower);
  updateUI();
}

function sellTower() {
  const tower = state.selectedTower;
  if (!tower) return;
  state.gold += Math.round(tower.spent * .65);
  state.towers = state.towers.filter(t => t !== tower);
  state.knights = state.knights.filter(knight => knight.owner !== tower);
  state.selectedTower = null;
  showBuildPanel();
  updateUI();
}

function rewindEnemyAlongPath(enemy, distance) {
  let x = enemy.x;
  let y = enemy.y;
  let segmentIndex = Math.min(pathPoints.length - 1, Math.max(1, enemy.pathIndex));
  let remaining = distance;
  while (remaining > 0 && segmentIndex > 0) {
    const previous = pathPoints[segmentIndex - 1];
    const segmentLength = Math.hypot(x - previous.x, y - previous.y);
    if (segmentLength >= remaining && segmentLength > 0) {
      const ratio = remaining / segmentLength;
      x += (previous.x - x) * ratio;
      y += (previous.y - y) * ratio;
      remaining = 0;
    } else {
      x = previous.x;
      y = previous.y;
      remaining -= segmentLength;
      segmentIndex--;
    }
  }
  return { x, y, pathIndex: Math.max(1, segmentIndex) };
}

function throwEnemyBack(tower, enemy, stats) {
  const landing = rewindEnemyAlongPath(enemy, stats.knockback);
  enemy.thrown = true;
  enemy.blocked = false;
  enemy.moving = false;
  enemy.throwDuration = .9;
  enemy.throwTimer = enemy.throwDuration;
  enemy.throwProgress = 0;
  enemy.throwArc = 0;
  enemy.throwSpin = 0;
  enemy.throwFromX = enemy.x;
  enemy.throwFromY = enemy.y;
  enemy.throwGrabX = tower.x + Math.cos(tower.angle) * 24;
  enemy.throwGrabY = tower.y + Math.sin(tower.angle) * 24;
  enemy.throwToX = landing.x;
  enemy.throwToY = landing.y;
  enemy.throwPathIndex = landing.pathIndex;
  enemy.throwDamage = stats.damage;
  enemy.throwOwner = tower;
  tower.throwSwing = enemy.throwDuration;
  for (const knight of state.knights) if (knight.target === enemy) knight.target = null;
  burst(enemy.x, enemy.y, "#b7a56b", 7);
}

function updateThrownEnemy(enemy, dt) {
  enemy.throwTimer -= dt;
  const progress = THREE.MathUtils.clamp(1 - enemy.throwTimer / enemy.throwDuration, 0, 1);
  enemy.throwProgress = progress;
  if (progress < .34) {
    const t = progress / .34;
    const eased = t * t * (3 - 2 * t);
    enemy.x = enemy.throwFromX + (enemy.throwGrabX - enemy.throwFromX) * eased;
    enemy.y = enemy.throwFromY + (enemy.throwGrabY - enemy.throwFromY) * eased;
    enemy.throwArc = Math.sin(t * Math.PI / 2) * .52;
    enemy.throwSpin = 0;
  } else {
    const t = (progress - .34) / .66;
    const eased = 1 - Math.pow(1 - t, 2);
    enemy.x = enemy.throwGrabX + (enemy.throwToX - enemy.throwGrabX) * eased;
    enemy.y = enemy.throwGrabY + (enemy.throwToY - enemy.throwGrabY) * eased;
    enemy.throwArc = (1 - t) * .52 + Math.sin(t * Math.PI) * .92;
    enemy.throwSpin = t * Math.PI * 2;
  }
  if (enemy.throwTimer > 0) return;
  enemy.x = enemy.throwToX;
  enemy.y = enemy.throwToY;
  enemy.pathIndex = enemy.throwPathIndex;
  enemy.thrown = false;
  enemy.throwArc = 0;
  enemy.throwSpin = 0;
  burst(enemy.x, enemy.y, "#8e8050", 12);
  const owner = enemy.throwOwner;
  const damage = enemy.throwDamage;
  enemy.throwOwner = null;
  if (!enemy.dead && owner) damageEnemy(enemy, damage, owner, false);
}

function update(dt) {
  if (state.paused || state.ended) return;
  state.elapsed += dt;

  if (state.waveActive && state.spawnQueue.length) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const next = state.spawnQueue.shift();
      spawnEnemy(next.type);
      state.spawnTimer = next.gap;
    }
  }

  updateKnights(dt);

  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.reached) continue;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackSwing = Math.max(0, enemy.attackSwing - dt);
    enemy.blocked = false;
    enemy.moving = false;
    if (enemy.thrown) {
      updateThrownEnemy(enemy, dt);
      continue;
    }
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
    if (enemy.slowTimer === 0) enemy.slowStrength = 0;
    const blocker = state.knights.find(knight => knight.alive && knight.target === enemy && Math.hypot(knight.x - enemy.x, knight.y - enemy.y) <= 24);
    if (blocker) {
      enemy.blocked = true;
      enemy.combatAngle = Math.atan2(blocker.y - enemy.y, blocker.x - enemy.x);
      enemy.meleeCooldown -= dt;
      if (enemy.meleeCooldown <= 0) {
        blocker.hp -= enemyMeleeDamage(enemy);
        blocker.hitFlash = .12;
        enemy.meleeCooldown = 1;
        enemy.attackSwing = .46;
        if (blocker.hp <= 0) defeatKnight(blocker);
      }
      continue;
    }
    const target = pathPoints[enemy.pathIndex];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    if (Math.abs(dx) > 1) enemy.facing = Math.sign(dx);
    const distance = Math.hypot(dx, dy);
    const slowMultiplier = enemy.slowTimer > 0 ? 1 - enemy.slowStrength : 1;
    const step = enemy.speed * slowMultiplier * dt;
    enemy.moving = distance > .5 && step > 0;
    if (distance <= step) {
      enemy.x = target.x;
      enemy.y = target.y;
      enemy.pathIndex++;
      if (enemy.pathIndex >= pathPoints.length) {
        enemy.reached = true;
        state.lives = Math.max(0, state.lives - enemy.damage);
        updateUI();
        if (state.lives <= 0) endGame(false);
      }
    } else {
      enemy.x += dx / distance * step;
      enemy.y += dy / distance * step;
    }
  }

  for (const tower of state.towers) {
    tower.throwSwing = Math.max(0, tower.throwSwing - dt);
    if (tower.type === "mine") {
      if (state.waveActive && tower.workers > 0) {
        tower.productionTimer += dt;
        while (tower.productionTimer >= 3) {
          tower.productionTimer -= 3;
          const earnings = tower.workers * 2;
          tower.goldMined += earnings;
          state.gold += earnings;
          burst(tower.x, tower.y, "#e7bd52", 5 + tower.workers * 2);
          updateUI();
        }
      }
      continue;
    }
    if (tower.type === "barracks") {
      ensureBarracksKnights(tower);
      continue;
    }
    if (tower.type === "ogre") {
      tower.cooldown -= dt;
      const stats = towerStats(tower);
      const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
      candidates.sort((a, b) => enemyProgress(b) - enemyProgress(a));
      const target = candidates.find(enemy => enemy.type !== "dragon") || candidates[0];
      if (target) {
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        if (tower.cooldown <= 0) {
          if (target.type === "dragon") {
            tower.throwSwing = .9;
            damageEnemy(target, stats.damage, tower, false);
            burst(target.x, target.y, "#8e8050", 8);
          } else {
            throwEnemyBack(tower, target, stats);
          }
          tower.cooldown = stats.cooldown;
        }
      }
      continue;
    }
    tower.cooldown -= dt;
    const stats = towerStats(tower);
    const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
    candidates.sort((a, b) => enemyProgress(b) - enemyProgress(a));
    const target = candidates[0];
    if (target) {
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cooldown <= 0) {
        fireProjectile(tower, target, stats);
        tower.cooldown = stats.cooldown;
      }
    }
  }

  for (const projectile of state.projectiles) {
    if (projectile.dead) continue;
    const target = projectile.target;
    if (!target || target.dead || target.reached) {
      projectile.dead = true;
      continue;
    }
    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const distance = Math.hypot(dx, dy);
    const step = projectile.speed * dt;
    if (distance <= step + 6) {
      hitEnemy(projectile, target);
      projectile.dead = true;
    } else {
      projectile.x += dx / distance * step;
      projectile.y += dy / distance * step;
    }
  }

  for (const particle of state.particles) {
    if (particle.kind === "debris") {
      if (!particle.settled) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.height += particle.verticalVelocity * dt;
        particle.verticalVelocity -= 6.5 * dt;
        particle.vx *= Math.pow(.3, dt);
        particle.vy *= Math.pow(.3, dt);
        particle.rotationX += particle.spinX * dt;
        particle.rotationY += particle.spinY * dt;
        particle.rotationZ += particle.spinZ * dt;
        if (particle.height <= particle.groundHeight) {
          particle.height = particle.groundHeight;
          particle.vx = 0;
          particle.vy = 0;
          particle.settled = true;
          particle.groundTimer = 3;
          particle.life = 3;
        }
      } else {
        particle.groundTimer -= dt;
        particle.life = particle.groundTimer;
      }
    } else {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 28 * dt;
    }
  }

  state.enemies = state.enemies.filter(e => !e.dead && !e.reached);
  state.projectiles = state.projectiles.filter(p => !p.dead);
  state.particles = state.particles.filter(p => p.life > 0);

  if (state.waveActive && !state.spawnQueue.length && !state.enemies.length) {
    state.waveActive = false;
    if (state.wave >= waves.length) endGame(true);
    else {
      const bonus = 18 + state.wave * 3;
      state.gold += bonus;
      showAnnouncement(`Wave cleared — ${bonus} gold earned`);
      updateUI();
    }
  }
}

function enemyProgress(enemy) {
  return enemy.pathIndex * 1000 - Math.hypot(pathPoints[enemy.pathIndex]?.x - enemy.x || 0, pathPoints[enemy.pathIndex]?.y - enemy.y || 0);
}

function fireProjectile(tower, target, stats) {
  const base = towerTypes[tower.type];
  const projectileColor = tower.type === "mage" && tower.specialization === "frost" ? "#8fe8f4" : base.color;
  state.projectiles.push({
    x: tower.x + Math.cos(tower.angle) * 17,
    y: tower.y + Math.sin(tower.angle) * 17,
    target,
    owner: tower,
    type: tower.type,
    damage: stats.damage,
    splash: stats.splash,
    speed: base.projectileSpeed,
    color: projectileColor,
    dead: false
  });
}

function hitEnemy(projectile, target) {
  if (projectile.splash > 0) {
    burst(target.x, target.y, projectile.color, 12);
    for (const enemy of state.enemies) {
      if (!enemy.dead && !enemy.reached && Math.hypot(enemy.x - target.x, enemy.y - target.y) <= projectile.splash) {
        damageEnemy(enemy, projectile.damage * (enemy === target ? 1 : .7), projectile.owner, true);
        if (projectile.owner.type === "mage" && projectile.owner.specialization === "frost" && !enemy.dead) {
          applyFrostSlow(enemy);
        }
      }
    }
  } else {
    burst(target.x, target.y, projectile.color, 4);
    damageEnemy(target, projectile.damage, projectile.owner, false);
  }
}

function applyFrostSlow(enemy) {
  enemy.slowStrength = Math.max(enemy.slowStrength, .38);
  enemy.slowTimer = Math.max(enemy.slowTimer, 2.75);
}

function damageEnemy(enemy, amount, owner, magic) {
  const actual = magic ? amount : amount * (1 - enemy.armor);
  enemy.hp -= actual;
  enemy.hitFlash = .09;
  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    state.gold += enemy.reward;
    state.totalKills++;
    owner.kills++;
    spawnEnemyDebris(enemy);
    burst(enemy.x, enemy.y, "#e2b958", 9);
    if (state.selectedTower === owner) showInspectPanel(owner);
    updateUI();
  }
}

function spawnEnemyDebris(enemy) {
  const palettes = {
    goblin: ["#729547", "#58733a", "#6b3529"],
    skeleton: ["#d9d1b9", "#bcb49f", "#6f6b62"],
    orc: ["#587741", "#3d4244", "#2f3828"],
    ogre: ["#81754a", "#5f5839", "#4f3522"],
    dragon: ["#9c372d", "#63251f", "#d7aa48"]
  };
  const counts = { goblin: 9, skeleton: 11, orc: 13, ogre: 16, dragon: 24 };
  const heights = { goblin: .34, skeleton: .43, orc: .5, ogre: .63, dragon: .82 };
  const palette = palettes[enemy.type] || palettes.goblin;
  const count = counts[enemy.type] || 10;
  const baseHeight = heights[enemy.type] || .4;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 14 + Math.random() * (enemy.type === "dragon" ? 52 : 36);
    const size = 2.6 + Math.random() * (enemy.type === "dragon" ? 4.8 : 3.4);
    const blockWorldSize = .035 + size * .006;
    state.particles.push({
      kind: "debris",
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      height: .2 + Math.random() * baseHeight,
      groundHeight: .15 + blockWorldSize / 2,
      verticalVelocity: 1.35 + Math.random() * (enemy.type === "dragon" ? 3.2 : 2.35),
      rotationX: Math.random() * Math.PI,
      rotationY: Math.random() * Math.PI,
      rotationZ: Math.random() * Math.PI,
      spinX: (Math.random() - .5) * 10,
      spinY: (Math.random() - .5) * 10,
      spinZ: (Math.random() - .5) * 10,
      settled: false,
      groundTimer: 3,
      life: 3,
      maxLife: 3,
      color: palette[i % palette.length],
      size
    });
  }
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 25 + Math.random() * 65;
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .25 + Math.random() * .35, maxLife: .6, color, size: 1.5 + Math.random() * 2.5 });
  }
}

function endGame(victory) {
  state.ended = true;
  const modal = document.getElementById("modal");
  document.getElementById("modalIcon").textContent = victory ? "♛" : "♜";
  document.getElementById("modalKicker").textContent = victory ? "THE KEEP STANDS" : "THE WALLS HAVE FALLEN";
  document.getElementById("modalTitle").textContent = victory ? "Victory!" : "Defeat";
  document.getElementById("modalText").textContent = victory ? "Your defenses held. Songs of Stonewatch will echo through the realm." : "The invaders breached the keep. Rebuild, adjust your towers, and meet them again.";
  document.getElementById("finalWaves").textContent = state.wave;
  document.getElementById("finalKills").textContent = state.totalKills;
  modal.classList.remove("hidden");
}

function draw() {
  graphics3D.render(state, hoverCell, canPlace, towerStats);
}

function drawGround() {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#587248");
  gradient.addColorStop(1, "#3e5939");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = .13;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const n = hash(x * 17 + y * 47);
      ctx.fillStyle = n > .5 ? "#91a36e" : "#263e2a";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
  ctx.globalAlpha = 1;
}

function drawPath() {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(34,31,24,.25)";
  ctx.lineWidth = 70;
  tracePath();
  ctx.stroke();
  ctx.strokeStyle = "#a38b68";
  ctx.lineWidth = 61;
  tracePath();
  ctx.stroke();
  ctx.strokeStyle = "rgba(218,191,143,.2)";
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 15]);
  tracePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

function tracePath() {
  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  for (let i = 1; i < pathPoints.length; i++) ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
}

function drawScenery() {
  const trees = [[.3,.3,1], [1.15,.5,.8], [3.1,.35,1.1], [4.25,.75,.75], [6.45,.55,1], [8.4,.6,.9], [10.7,.45,1.15], [11.5,2.2,.9], [.55,4.1,1.1], [1.25,5.8,.85], [3.5,5.4,1], [5.7,6.35,.8], [7.4,6.55,1.1], [8.6,6.7,.8], [11.2,7,.9]];
  for (const [gx, gy, s] of trees) drawTree(gx * CELL, gy * CELL, s);
  drawKeep(905, 442);
  drawCamp(25, 80);
}

function drawTree(x, y, scale) {
  ctx.fillStyle = "rgba(20,25,16,.28)";
  ctx.beginPath(); ctx.ellipse(x + 5, y + 13, 24 * scale, 10 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#493c29"; ctx.fillRect(x - 3 * scale, y, 6 * scale, 20 * scale);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 0 ? "#243e2c" : i === 1 ? "#2d4b32" : "#38583a";
    ctx.beginPath(); ctx.arc(x + (i - 1) * 7 * scale, y - (3 + i * 4) * scale, (14 - i) * scale, 0, Math.PI * 2); ctx.fill();
  }
}

function drawKeep(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(22,20,17,.35)"; ctx.fillRect(-34, 9, 68, 61);
  ctx.fillStyle = "#68675e"; ctx.fillRect(-31, -2, 62, 61);
  ctx.fillStyle = "#77756a";
  for (const ox of [-30, -10, 10]) ctx.fillRect(ox, -12, 14, 16);
  ctx.fillStyle = "#33312d"; ctx.fillRect(-8, 31, 16, 28);
  ctx.fillStyle = "#b7a36c"; ctx.fillRect(-3, 4, 6, 11);
  ctx.strokeStyle = "rgba(35,33,29,.4)"; ctx.lineWidth = 1;
  for (let yy = 9; yy < 50; yy += 11) { ctx.beginPath(); ctx.moveTo(-31, yy); ctx.lineTo(31, yy); ctx.stroke(); }
  ctx.restore();
}

function drawCamp(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "#6b3a2d"; ctx.beginPath(); ctx.moveTo(-24, 18); ctx.lineTo(0, -8); ctx.lineTo(25, 18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33261e"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0,-15); ctx.lineTo(0,22); ctx.stroke();
  ctx.fillStyle = "#a44334"; ctx.beginPath(); ctx.moveTo(1,-13); ctx.lineTo(21,-7); ctx.lineTo(1,1); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawPlacement() {
  if (!state.selectedBuild || !hoverCell) return;
  const { col, row } = hoverCell;
  const valid = canPlace(col, row) && state.gold >= towerTypes[state.selectedBuild].cost;
  const x = col * CELL;
  const y = row * CELL;
  ctx.fillStyle = valid ? "rgba(203,220,139,.28)" : "rgba(191,73,58,.32)";
  ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
  const range = towerTypes[state.selectedBuild].range;
  ctx.fillStyle = valid ? "rgba(222,228,177,.09)" : "rgba(190,60,50,.08)";
  ctx.strokeStyle = valid ? "rgba(237,228,170,.65)" : "rgba(220,90,70,.65)";
  ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawTowers() {
  for (const tower of state.towers) {
    if (state.selectedTower === tower) {
      const stats = towerStats(tower);
      ctx.fillStyle = "rgba(240,220,150,.08)"; ctx.strokeStyle = "rgba(241,215,128,.45)";
      ctx.beginPath(); ctx.arc(tower.x, tower.y, stats.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#e4c36b"; ctx.lineWidth = 2; ctx.strokeRect(tower.col * CELL + 5, tower.row * CELL + 5, CELL - 10, CELL - 10);
    }
    drawTower(tower);
  }
}

function drawTower(tower) {
  ctx.save(); ctx.translate(tower.x, tower.y);
  ctx.fillStyle = "rgba(20,18,14,.3)"; ctx.beginPath(); ctx.ellipse(5, 20, 28, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5c5a52"; ctx.beginPath(); ctx.arc(0, 5, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#77746a"; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3e3c38"; ctx.lineWidth = 3; ctx.stroke();
  const color = tower.type === "mage" && tower.specialization === "frost" ? "#8fe8f4" : towerTypes[tower.type].color;
  if (tower.type === "mage") {
    ctx.fillStyle = "#3f3452"; ctx.beginPath(); ctx.moveTo(-16, 12); ctx.lineTo(0,-25); ctx.lineTo(16,12); ctx.closePath(); ctx.fill();
    ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0,-23,6 + tower.level,0,Math.PI*2); ctx.fill();
  } else {
    ctx.rotate(tower.angle);
    ctx.strokeStyle = tower.type === "archer" ? "#392c1d" : "#30291f";
    ctx.lineWidth = tower.type === "archer" ? 4 : 7;
    ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(20,0); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(22,0); ctx.lineTo(10,-5); ctx.lineTo(10,5); ctx.closePath(); ctx.fill();
    if (tower.type === "archer") { ctx.strokeStyle = "#c9b170"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(3,0,13,-1.15,1.15); ctx.stroke(); }
  }
  ctx.restore();
  for (let i = 0; i < tower.level; i++) {
    ctx.fillStyle = "#e3bd60"; ctx.beginPath(); ctx.arc(tower.x - 7 + i * 7, tower.y + 28, 2.2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    const base = enemyTypes[enemy.type];
    const bob = Math.sin(state.elapsed * (enemy.type === "dragon" ? 3 : 7) + enemy.phase) * (enemy.type === "dragon" ? 2.2 : 1.1);
    ctx.save();
    ctx.translate(enemy.x, enemy.y + bob);
    if (enemy.slowTimer > 0) {
      ctx.fillStyle = "rgba(115,220,239,.18)";
      ctx.strokeStyle = "rgba(152,235,245,.72)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 9 * base.scale, 16 * base.scale, 8 * base.scale, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "rgba(20,15,12,.3)";
    ctx.beginPath();
    ctx.ellipse(3, 15 * base.scale, 14 * base.scale, 6 * base.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(enemy.facing * base.scale, base.scale);
    drawEnemySprite(enemy.type, enemy.hitFlash > 0, enemy.phase);
    ctx.restore();
    const barWidth = base.barWidth;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = "rgba(27,20,16,.78)"; ctx.fillRect(enemy.x - barWidth / 2, enemy.y - base.barOffset, barWidth, 4);
    ctx.fillStyle = ratio > .5 ? "#75a552" : ratio > .25 ? "#d19b42" : "#bb4b3e"; ctx.fillRect(enemy.x - barWidth / 2, enemy.y - base.barOffset, barWidth * ratio, 4);
  }
}

function drawEnemySprite(type, hit, phase) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (type === "goblin") drawGoblin(hit);
  else if (type === "skeleton") drawSkeleton(hit);
  else if (type === "orc") drawOrc(hit);
  else if (type === "ogre") drawOgre(hit);
  else drawDragon(hit, phase);
}

function drawGoblin(hit) {
  const skin = hit ? "#fff1cf" : "#76964a";
  ctx.fillStyle = "#6c3528";
  ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(7, 4); ctx.lineTo(5, 17); ctx.lineTo(-5, 17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(-17, -9); ctx.lineTo(-9, 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(7, -5); ctx.lineTo(17, -9); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -3, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#231d15"; ctx.beginPath(); ctx.arc(-4, -5, 1.4, 0, Math.PI * 2); ctx.arc(4, -5, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d9c9a2"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(0, 5); ctx.lineTo(3, 3); ctx.stroke();
  ctx.strokeStyle = "#4b3422"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(16, 15); ctx.stroke();
  ctx.fillStyle = "#cbc2a2"; ctx.beginPath(); ctx.moveTo(15, 14); ctx.lineTo(19, 18); ctx.lineTo(13, 17); ctx.closePath(); ctx.fill();
}

function drawSkeleton(hit) {
  const bone = hit ? "#fff7df" : "#d8d0b7";
  ctx.strokeStyle = "#403b32"; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 17); ctx.moveTo(0, 9); ctx.lineTo(-9, 14); ctx.moveTo(0, 9); ctx.lineTo(9, 14); ctx.moveTo(0, 16); ctx.lineTo(-6, 22); ctx.moveTo(0, 16); ctx.lineTo(7, 22); ctx.stroke();
  ctx.strokeStyle = bone; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.fillStyle = bone; ctx.beginPath(); ctx.arc(0, -4, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#39342c"; ctx.beginPath(); ctx.ellipse(-3.4, -5, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.ellipse(3.4, -5, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(-1.8, 2); ctx.lineTo(1.8, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#625b4e"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(5, 4); ctx.moveTo(-3, 4); ctx.lineTo(-3, 7); ctx.moveTo(0, 4); ctx.lineTo(0, 7); ctx.moveTo(3, 4); ctx.lineTo(3, 7); ctx.stroke();
  ctx.strokeStyle = "#b6aa8e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(9, 13); ctx.lineTo(15, 2); ctx.stroke();
  ctx.fillStyle = "#a5a095"; ctx.beginPath(); ctx.moveTo(15, 1); ctx.lineTo(12, 7); ctx.lineTo(18, 5); ctx.closePath(); ctx.fill();
}

function drawOrc(hit) {
  const skin = hit ? "#fff1cf" : "#5f7c43";
  ctx.fillStyle = "#424a48"; ctx.beginPath(); ctx.ellipse(0, 8, 13, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#72756f"; ctx.beginPath(); ctx.arc(-11, 3, 6, 0, Math.PI * 2); ctx.arc(11, 3, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, -5, 11, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#28231b"; ctx.beginPath(); ctx.moveTo(-11, -9); ctx.lineTo(-5, -16); ctx.lineTo(0, -11); ctx.lineTo(6, -16); ctx.lineTo(11, -8); ctx.lineTo(7, -11); ctx.lineTo(-7, -11); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#221d17"; ctx.beginPath(); ctx.arc(-4, -6, 1.5, 0, Math.PI * 2); ctx.arc(4, -6, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#eee1ba"; ctx.beginPath(); ctx.moveTo(-6, 1); ctx.lineTo(-3, 8); ctx.lineTo(-1, 2); ctx.closePath(); ctx.moveTo(6, 1); ctx.lineTo(3, 8); ctx.lineTo(1, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#25211a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, 7); ctx.lineTo(18, 18); ctx.stroke();
  ctx.fillStyle = "#77766e"; ctx.fillRect(14, 13, 7, 6);
}

function drawOgre(hit) {
  const skin = hit ? "#fff1cf" : "#82794c";
  ctx.fillStyle = "#503b2c"; ctx.beginPath(); ctx.ellipse(0, 8, 15, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, 7, 12, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -8, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#30271c"; ctx.beginPath(); ctx.arc(-4, -9, 1.4, 0, Math.PI * 2); ctx.arc(4, -9, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#473a28"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, -3); ctx.quadraticCurveTo(0, 1, 6, -3); ctx.stroke();
  ctx.fillStyle = "#d8c59d"; ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(6, 3); ctx.lineTo(8, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#49321f"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(11, 3); ctx.lineTo(20, 20); ctx.stroke();
  ctx.fillStyle = "#62513c"; ctx.beginPath(); ctx.ellipse(10, 1, 6, 9, -.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#aa9b73"; ctx.fillRect(-11, 6, 22, 4);
}

function drawDragon(hit, phase) {
  const wingLift = Math.sin(state.elapsed * 5 + phase) * 3;
  const hide = hit ? "#fff0d2" : "#a43c30";
  const darkHide = hit ? "#f4d7b9" : "#64251f";
  ctx.fillStyle = "rgba(126,38,29,.85)";
  ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(-28, -13 - wingLift); ctx.lineTo(-22, 8); ctx.lineTo(-10, 14); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, 3); ctx.lineTo(28, -13 - wingLift); ctx.lineTo(22, 8); ctx.lineTo(10, 14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#51201c"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-26, -10 - wingLift); ctx.moveTo(8, 4); ctx.lineTo(26, -10 - wingLift); ctx.stroke();
  ctx.fillStyle = hide; ctx.beginPath(); ctx.ellipse(0, 7, 11, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = darkHide; ctx.beginPath(); ctx.moveTo(-4, 18); ctx.quadraticCurveTo(-12, 29, -3, 35); ctx.lineTo(2, 30); ctx.quadraticCurveTo(-5, 28, 4, 19); ctx.closePath(); ctx.fill();
  ctx.fillStyle = hide; ctx.beginPath(); ctx.ellipse(0, -10, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-7, -15); ctx.lineTo(-12, -24); ctx.lineTo(-2, -17); ctx.closePath(); ctx.moveTo(7, -15); ctx.lineTo(12, -24); ctx.lineTo(2, -17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f1c35d"; ctx.beginPath(); ctx.arc(-3.5, -12, 1.5, 0, Math.PI * 2); ctx.arc(3.5, -12, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e5c78c"; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-2, 0); ctx.lineTo(0, -5); ctx.moveTo(5, -5); ctx.lineTo(2, 0); ctx.lineTo(0, -5); ctx.fill();
  ctx.fillStyle = "#d48a36"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4, 9); ctx.lineTo(0, 6); ctx.lineTo(4, 9); ctx.closePath(); ctx.fill();
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    ctx.save();
    ctx.shadowColor = p.color; ctx.shadowBlur = p.type === "mage" ? 14 : 2;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.type === "mage" ? 5 : 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawPaused() {
  ctx.fillStyle = "rgba(15,13,10,.55)"; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = "#eee4c8"; ctx.textAlign = "center"; ctx.font = "34px Georgia"; ctx.fillText("Battle Paused", W/2, H/2);
  ctx.font = "13px Inter, sans-serif"; ctx.fillStyle = "#bdb39d"; ctx.fillText("Press the pause button to continue", W/2, H/2 + 29);
}

function hash(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

function showBuildPanel() {
  document.getElementById("buildPanel").classList.remove("hidden");
  document.getElementById("inspectPanel").classList.add("hidden");
}

function showInspectPanel(tower) {
  state.selectedTower = tower;
  state.selectedBuild = null;
  document.querySelectorAll(".tower-card").forEach(card => card.classList.remove("selected"));
  document.getElementById("buildPanel").classList.add("hidden");
  document.getElementById("inspectPanel").classList.remove("hidden");
  const base = towerTypes[tower.type];
  const emblem = document.getElementById("selectedEmblem");
  emblem.textContent = base.emblem;
  emblem.className = `tower-emblem ${base.className}`;
  document.getElementById("selectedName").textContent = base.name;
  const upgradeButton = document.getElementById("upgradeButton");
  const frostButton = document.getElementById("frostUpgradeButton");
  const branchHint = document.getElementById("branchHint");
  const specialRow = document.getElementById("specialStatRow");
  const mineControls = document.getElementById("mineControls");
  const isMine = tower.type === "mine";

  upgradeButton.classList.toggle("hidden", isMine);
  mineControls.classList.toggle("hidden", !isMine);

  if (isMine) {
    document.getElementById("selectedLevel").textContent = "Economic building";
    document.getElementById("damageLabel").textContent = "Production";
    document.getElementById("rangeLabel").textContent = "Workers";
    document.getElementById("speedLabel").textContent = "Operation";
    document.getElementById("killsLabel").textContent = "Gold mined";
    document.getElementById("damageStat").textContent = tower.workers ? `${tower.workers * 2} gold / 3s` : "No income";
    document.getElementById("rangeStat").textContent = `${tower.workers} / 3`;
    document.getElementById("speedStat").textContent = "During waves";
    document.getElementById("killsStat").textContent = tower.goldMined;
    branchHint.classList.add("hidden");
    frostButton.classList.add("hidden");
    specialRow.classList.add("hidden");
    const cost = workerCost(tower);
    const hireButton = document.getElementById("hireWorkerButton");
    hireButton.firstElementChild.textContent = cost === null ? "Fully staffed" : "Hire worker";
    document.getElementById("workerCost").textContent = cost === null ? "3 / 3" : `${cost} gold`;
    hireButton.disabled = cost === null || state.gold < cost;
  } else {
    const stats = towerStats(tower);
    const isBarracks = tower.type === "barracks";
    const isOgreTower = tower.type === "ogre";
    document.getElementById("selectedLevel").textContent = `Level ${tower.level}`;
    document.getElementById("damageLabel").textContent = isBarracks ? "Knight damage" : isOgreTower ? "Impact damage" : "Damage";
    document.getElementById("rangeLabel").textContent = isBarracks ? "Command range" : isOgreTower ? "Grab range" : "Range";
    document.getElementById("speedLabel").textContent = "Attack time";
    document.getElementById("killsLabel").textContent = "Enemies felled";
    document.getElementById("damageStat").textContent = Math.round(stats.damage);
    document.getElementById("rangeStat").textContent = Math.round(stats.range);
    document.getElementById("speedStat").textContent = `${stats.cooldown.toFixed(2)}s`;
    document.getElementById("killsStat").textContent = tower.kills;
    const cost = upgradeCost(tower);
    const choosingMagePath = tower.type === "mage" && tower.level === 2;
    const completedMagePath = tower.type === "mage" && tower.level === 3;
    document.getElementById("upgradeLabel").textContent = choosingMagePath ? "Arcane Path" : completedMagePath ? `${tower.specialization === "frost" ? "Frost" : "Arcane"} Path` : "Upgrade";
    document.getElementById("upgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    upgradeButton.disabled = cost === null || state.gold < cost;
    branchHint.classList.toggle("hidden", !choosingMagePath);
    frostButton.classList.toggle("hidden", !choosingMagePath);
    document.getElementById("frostUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    frostButton.disabled = cost === null || state.gold < cost;
    specialRow.classList.toggle("hidden", !completedMagePath && !isBarracks && !isOgreTower);
    if (completedMagePath) {
      document.getElementById("specialStat").textContent = tower.specialization === "frost" ? "38% group slow" : "Maximum damage";
    } else if (isBarracks) {
      const readyKnights = state.knights.filter(knight => knight.owner === tower && knight.alive).length;
      document.getElementById("specialStat").textContent = `${readyKnights} / ${barracksCapacity(tower)} knights ready`;
    } else if (isOgreTower) {
      document.getElementById("specialStat").textContent = `Throws ${Math.round(stats.knockback / CELL * 10) / 10} tiles backward`;
    }
  }
  document.getElementById("sellValue").textContent = `${Math.round(tower.spent * .65)} gold`;
}

function showAnnouncement(text) {
  const banner = document.getElementById("announcement");
  banner.textContent = text;
  banner.classList.remove("hidden");
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => banner.classList.add("hidden"), 2200);
}

function updateUI() {
  document.getElementById("goldValue").textContent = state.gold;
  document.getElementById("livesValue").textContent = state.lives;
  document.getElementById("waveValue").textContent = `${state.wave} / ${waves.length}`;
  document.querySelectorAll(".tower-card").forEach(card => {
    const type = card.dataset.tower;
    card.disabled = state.gold < towerTypes[type].cost;
    card.classList.toggle("selected", state.selectedBuild === type);
  });
  const button = document.getElementById("startWaveButton");
  button.disabled = state.waveActive || state.wave >= waves.length || state.ended;
  button.firstChild.textContent = state.waveActive ? "Wave underway " : state.wave >= waves.length ? "Final wave " : "Begin wave ";
  const next = waves[state.wave];
  document.getElementById("nextWaveText").textContent = next ? next.name : "—";
  document.getElementById("waveStatus").textContent = state.waveActive ? `${state.spawnQueue.length + state.enemies.length} enemies remain in this assault.` : state.wave === 0 ? "Build your defenses before the first assault." : state.wave >= waves.length ? "Defeat the remaining invaders." : "The road is quiet. Prepare when ready.";
  drawWavePreview(next);
  if (state.selectedTower) showInspectPanel(state.selectedTower);
}

function drawWavePreview(wave) {
  const preview = document.getElementById("wavePreview");
  preview.innerHTML = "";
  if (!wave) return;
  const counts = {};
  wave.units.forEach(unit => counts[unit.type] = (counts[unit.type] || 0) + 1);
  Object.entries(counts).forEach(([type, count]) => {
    const pip = document.createElement("span");
    pip.className = `enemy-pip ${type}`;
    pip.title = `${count} ${enemyTypes[type].name}${count > 1 ? "s" : ""}`;
    pip.textContent = `${enemyTypes[type].symbol}${count}`;
    preview.appendChild(pip);
  });
}

document.querySelectorAll(".tower-card").forEach(card => {
  card.addEventListener("click", () => {
    state.selectedTower = null;
    state.selectedBuild = state.selectedBuild === card.dataset.tower ? null : card.dataset.tower;
    updateUI();
  });
});

canvas.addEventListener("pointerdown", event => {
  if (event.button !== 2) return;
  cameraDrag.active = true;
  cameraDrag.dragged = false;
  cameraDrag.suppressClick = false;
  cameraDrag.pointerId = event.pointerId;
  cameraDrag.startX = cameraDrag.lastX = event.clientX;
  cameraDrag.startY = cameraDrag.lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = "grabbing";
});

canvas.addEventListener("pointermove", event => {
  if (cameraDrag.active && event.pointerId === cameraDrag.pointerId) {
    const deltaX = event.clientX - cameraDrag.lastX;
    const deltaY = event.clientY - cameraDrag.lastY;
    if (!cameraDrag.dragged && Math.hypot(event.clientX - cameraDrag.startX, event.clientY - cameraDrag.startY) > 5) {
      cameraDrag.dragged = true;
      hoverCell = null;
    }
    if (cameraDrag.dragged) graphics3D.orbitBy(deltaX, deltaY);
    cameraDrag.lastX = event.clientX;
    cameraDrag.lastY = event.clientY;
    return;
  }
  hoverCell = graphics3D.pickGrid(event.clientX, event.clientY);
  if (!hoverCell) return;
  canvas.style.cursor = state.selectedBuild ? (canPlace(hoverCell.col, hoverCell.row) ? "crosshair" : "not-allowed") : "default";
});

function finishCameraDrag(event, cancelled = false) {
  if (!cameraDrag.active || event.pointerId !== cameraDrag.pointerId) return;
  cameraDrag.suppressClick = false;
  cameraDrag.active = false;
  cameraDrag.pointerId = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  hoverCell = graphics3D.pickGrid(event.clientX, event.clientY);
  canvas.style.cursor = state.selectedBuild && hoverCell ? (canPlace(hoverCell.col, hoverCell.row) ? "crosshair" : "not-allowed") : "default";
}

canvas.addEventListener("pointerup", event => finishCameraDrag(event));
canvas.addEventListener("pointercancel", event => finishCameraDrag(event, true));
canvas.addEventListener("pointerleave", () => { if (!cameraDrag.active) hoverCell = null; });
canvas.addEventListener("contextmenu", event => event.preventDefault());
canvas.addEventListener("wheel", event => {
  event.preventDefault();
  const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? event.deltaY * 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? event.deltaY * canvas.clientHeight
      : event.deltaY;
  graphics3D.zoomBy(delta);
}, { passive: false });

canvas.addEventListener("click", event => {
  if (cameraDrag.suppressClick) {
    cameraDrag.suppressClick = false;
    return;
  }
  const picked = graphics3D.pickGrid(event.clientX, event.clientY);
  if (!picked) return;
  const { col, row } = picked;
  if (state.selectedBuild) placeTower(col, row);
  else {
    const tower = state.towers.find(t => t.col === col && t.row === row);
    if (tower) showInspectPanel(tower);
    else { state.selectedTower = null; showBuildPanel(); }
  }
});

document.getElementById("startWaveButton").addEventListener("click", startWave);
document.getElementById("upgradeButton").addEventListener("click", upgradeTower);
document.getElementById("frostUpgradeButton").addEventListener("click", chooseFrostPath);
document.getElementById("hireWorkerButton").addEventListener("click", hireWorker);
document.getElementById("sellButton").addEventListener("click", sellTower);
document.getElementById("backButton").addEventListener("click", () => { state.selectedTower = null; showBuildPanel(); });
document.getElementById("restartButton").addEventListener("click", resetGame);
document.getElementById("cameraResetButton").addEventListener("click", () => graphics3D.resetCamera());
document.getElementById("pauseButton").addEventListener("click", () => {
  state.paused = !state.paused;
  document.getElementById("pauseButton").textContent = state.paused ? "▶" : "Ⅱ";
  document.getElementById("pauseOverlay").classList.toggle("hidden", !state.paused);
});
document.getElementById("speedButton").addEventListener("click", () => {
  state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
  document.getElementById("speedButton").textContent = `${state.speed}×`;
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    state.selectedBuild = null;
    state.selectedTower = null;
    showBuildPanel();
    updateUI();
  }
  if (event.code === "Space" && !event.repeat) {
    event.preventDefault();
    if (!state.waveActive) startWave();
  }
});

function gameLoop(now) {
  const rawDt = Math.min(.05, (now - lastTime) / 1000);
  lastTime = now;
  update(rawDt * state.speed);
  draw();
  requestAnimationFrame(gameLoop);
}

resetGame();
requestAnimationFrame(gameLoop);

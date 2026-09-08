"use strict";

// Barracks troops, Vampire minions, Togga, enemy troop attacks, and friendly-unit simulation.

function barracksCapacity(tower) {
  if (tower.specialization === "graveyard") return 8;
  if (tower.specialization === "gladiators") return 3;
  return Math.min(4, tower.level + 1);
}

function ensureRallyIndex(tower) {
  if (tower.rallyIndex !== undefined) return;
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

function knightMaxHp(tower) {
  const baseHp = tower.specialization === "graveyard" ? 90 : tower.specialization === "gladiators" ? 240 : 72 * Math.pow(1.5, tower.level - 1);
  return Math.round(baseHp * relicMultiplier(tower, "troopHealth") * passiveTowerMultiplier(tower, "troopHealth"));
}

function barracksUnitType(tower) {
  if (tower.specialization === "graveyard") return "zombie";
  if (tower.specialization === "gladiators") return "gladiator";
  return "knight";
}

function spawnBarracksUnit(tower, unitType = barracksUnitType(tower)) {
  const capacity = barracksCapacity(tower);
  const usedSlots = new Set(state.knights.filter(unit => unit.owner === tower && !unit.expired).map(unit => unit.slot));
  let slot = 0;
  while (slot < capacity && usedSlots.has(slot)) slot++;
  if (slot >= capacity) return null;
  const unit = {
    owner: tower,
    unitType,
    slot,
    x: tower.x,
    y: tower.y,
    hp: knightMaxHp(tower),
    maxHp: knightMaxHp(tower),
    alive: true,
    expired: false,
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
  state.knights.push(unit);
  return unit;
}

function ensureBarracksKnights(tower, healExisting = false) {
  if (!tower || tower.type !== "barracks") return;
  ensureRallyIndex(tower);
  const unitType = barracksUnitType(tower);
  if (unitType === "zombie") return;
  state.knights = state.knights.filter(unit => unit.owner !== tower || unit.unitType === unitType);
  const capacity = barracksCapacity(tower);
  const owned = state.knights.filter(knight => knight.owner === tower);
  while (owned.length < capacity) {
    const knight = spawnBarracksUnit(tower, unitType);
    if (!knight) break;
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

function spawnToggaWarrior(tower) {
  ensureRallyIndex(tower);
  const unit = {
    owner: tower,
    unitType: "togga",
    slot: 0,
    x: tower.x,
    y: tower.y,
    hp: towerTypes.ogre.warriorHp,
    maxHp: towerTypes.ogre.warriorHp,
    alive: true,
    expired: false,
    target: null,
    engagedEnemies: [],
    attackCooldown: 0,
    respawnTimer: 0,
    retreating: false,
    retreatTimer: 0,
    angle: tower.angle,
    hitFlash: 0,
    swing: 0,
    groundPound: 0,
    moving: false,
    clashing: false,
    phase: Math.random() * Math.PI * 2
  };
  state.knights.push(unit);
  tower.toggaUnit = unit;
  return unit;
}

function ensureToggaWarrior(tower, healExisting = false) {
  if (!tower || tower.type !== "ogre" || tower.specialization !== "togga") return null;
  let unit = state.knights.find(candidate => candidate.owner === tower && candidate.unitType === "togga" && !candidate.expired);
  if (!unit) unit = spawnToggaWarrior(tower);
  tower.toggaUnit = unit;
  unit.maxHp = towerTypes.ogre.warriorHp;
  if (healExisting) {
    unit.hp = unit.maxHp;
    unit.alive = true;
    unit.respawnTimer = 0;
    unit.retreating = false;
    unit.retreatTimer = 0;
  }
  return unit;
}
function raiseVampireMinion(tower, enemy) {
  ensureRallyIndex(tower);
  const slot = tower.minionsRaised || 0;
  tower.minionsRaised = slot + 1;
  const minion = {
    owner: tower,
    unitType: "vampireMinion",
    slot,
    x: enemy.x,
    y: enemy.y,
    hp: 300,
    maxHp: 300,
    alive: true,
    expired: false,
    target: null,
    attackCooldown: .35,
    respawnTimer: 0,
    angle: tower.angle,
    hitFlash: 0,
    swing: 0,
    moving: false,
    clashing: false,
    phase: Math.random() * Math.PI * 2
  };
  state.knights.push(minion);
  burst(enemy.x, enemy.y, "#b51d36", 18);
  showAnnouncement("A fallen enemy rises as a Vampire Minion");
  return minion;
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
  if (knight.unitType === "togga") return { x: point.x, y: point.y };
  const isVampireMinion = knight.unitType === "vampireMinion";
  const spacing = knight.unitType === "zombie" ? 15 : isVampireMinion ? 14 : 21;
  const formationSlot = isVampireMinion ? knight.slot % 7 : knight.slot;
  const formationSize = isVampireMinion ? 7 : barracksCapacity(tower);
  const offset = (formationSlot - (formationSize - 1) / 2) * spacing;
  return { x: point.x + dx / length * offset, y: point.y + dy / length * offset };
}

function explodeEvolvedBoomer(zombie) {
  const tower = zombie.owner;
  const base = towerTypes.barracks;
  if (!tower?.evolvedBoomers || zombie.unitType !== "zombie") return [];
  const targets = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && Math.hypot(enemy.x - zombie.x, enemy.y - zombie.y) <= base.evolvedBoomersRadius);
  const colors = ["#75ff3d", "#baff58", "#35d92f", "#d2ff70"];

  function addGooBlock(angle, speed, index) {
    const size = 2.8 + Math.random() * 3.8;
    const blockWorldSize = .035 + size * .006;
    state.particles.push({
      kind: "gooDebris",
      x: zombie.x,
      y: zombie.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      height: .18 + Math.random() * .22,
      groundHeight: .15 + blockWorldSize / 2,
      verticalVelocity: 1.7 + Math.random() * 2.1,
      rotationX: Math.random() * Math.PI,
      rotationY: Math.random() * Math.PI,
      rotationZ: Math.random() * Math.PI,
      spinX: (Math.random() - .5) * 13,
      spinY: (Math.random() - .5) * 13,
      spinZ: (Math.random() - .5) * 13,
      settled: false,
      groundDuration: base.evolvedBoomersGooDuration,
      groundTimer: base.evolvedBoomersGooDuration,
      life: base.evolvedBoomersGooDuration,
      maxLife: base.evolvedBoomersGooDuration,
      color: colors[index % colors.length],
      size
    });
  }

  for (let index = 0; index < 28; index++) addGooBlock(Math.random() * Math.PI * 2, 20 + Math.random() * 75, index);
  targets.forEach((enemy, targetIndex) => {
    const targetAngle = Math.atan2(enemy.y - zombie.y, enemy.x - zombie.x);
    for (let index = 0; index < 3; index++) addGooBlock(targetAngle + (Math.random() - .5) * .34, 42 + Math.random() * 45, targetIndex * 3 + index);
    damageEnemy(enemy, base.evolvedBoomersDamage, tower, "physical", zombie);
  });
  return targets;
}

function defeatKnight(knight) {
  const evolvedExplosion = knight.unitType === "zombie" && knight.owner?.evolvedBoomers;
  knight.alive = false;
  knight.hp = 0;
  knight.target = null;
  if (knight.unitType === "zombie" || knight.unitType === "vampireMinion") {
    knight.expired = true;
    knight.respawnTimer = 0;
    if (evolvedExplosion) explodeEvolvedBoomer(knight);
    else burst(knight.x, knight.y, knight.unitType === "vampireMinion" ? "#a71931" : "#6f8b55", 9);
  } else {
    knight.respawnTimer = knight.unitType === "togga" ? towerTypes.ogre.warriorRespawnDuration : knight.unitType === "gladiator" ? 10 : 8;
    knight.retreating = false;
    knight.retreatTimer = 0;
    knight.engagedEnemies = [];
    burst(knight.x, knight.y, knight.unitType === "togga" ? "#9d7e45" : knight.unitType === "gladiator" ? "#d1a34e" : "#aebbc0", knight.unitType === "togga" ? 22 : 9);
  }
  if (state.selectedTower === knight.owner) showInspectPanel(knight.owner);
}

function dismissVampireMinions() {
  const minions = state.knights.filter(unit => unit.unitType === "vampireMinion");
  for (const minion of minions) burst(minion.x, minion.y, "#9f1830", 9);
  state.knights = state.knights.filter(unit => unit.unitType !== "vampireMinion");
  for (const tower of state.towers) {
    if (tower.type === "vampire") tower.minionsRaised = 0;
  }
  return minions.length;
}

function enemyMeleeDamage(enemy) {
  const baseDamage = {
    goblin: 10.5,
    skeleton: 13.5,
    orc: 21,
    ogre: 36,
    pirate: 15,
    werewolf: 22.5,
    viking: 27,
    wraith: 30,
    demon: 40.5,
    davyjones: 55,
    moonalpha: 65,
    longship: 75,
    covenwitch: 60,
    riftlord: 95,
    dragon: 150,
    horseman: 190,
    cyclops: 240,
    yeti: 300
  }[enemy.type] || 12;
  if (enemyTypes[enemy.type]?.boss && !enemy.isBossMinion) return baseDamage * (enemy.damageMultiplier || 1);
  return baseDamage * (enemy.damageMultiplier || 1) * (1 + Math.max(0, state.wave - 1) * .04);
}

function bossIgnoresBarracks(enemy) {
  return Boolean((enemy.isBoss || enemy.isMiniBoss) && !enemy.barracksProvoked);
}

function moveFriendlyUnit(unit, destination, speed, dt) {
  const dx = destination.x - unit.x;
  const dy = destination.y - unit.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 3) {
    unit.angle = Math.atan2(dy, dx);
    const step = Math.min(distance, speed * dt);
    unit.x += dx / distance * step;
    unit.y += dy / distance * step;
    unit.moving = true;
  }
  return distance;
}

function updateToggaWarrior(unit, dt) {
  const tower = unit.owner;
  const base = towerTypes.ogre;
  unit.hitFlash = Math.max(0, unit.hitFlash - dt);
  unit.swing = Math.max(0, unit.swing - dt);
  unit.groundPound = Math.max(0, unit.groundPound - dt);
  unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);
  unit.moving = false;
  unit.clashing = false;
  unit.engagedEnemies = [];

  if (!unit.alive) {
    unit.respawnTimer -= dt;
    if (unit.respawnTimer <= 0) {
      unit.alive = true;
      unit.hp = unit.maxHp;
      unit.x = tower.x;
      unit.y = tower.y;
      unit.target = null;
      unit.attackCooldown = 0;
      burst(unit.x, unit.y, "#d0b062", 24);
      if (state.selectedTower === tower) showInspectPanel(tower);
    }
    return;
  }

  if (!unit.retreating && unit.hp <= base.warriorRetreatHealth) {
    unit.retreating = true;
    unit.retreatTimer = base.warriorRetreatDuration;
    unit.target = null;
    showAnnouncement("Togga retreats to recover his strength");
    if (state.selectedTower === tower) showInspectPanel(tower);
  }

  if (unit.retreating) {
    const distanceHome = moveFriendlyUnit(unit, tower, 125, dt);
    if (distanceHome <= 3) {
      unit.x = tower.x;
      unit.y = tower.y;
      unit.moving = false;
      unit.retreatTimer = Math.max(0, unit.retreatTimer - dt);
      if (unit.retreatTimer <= 0) {
        unit.retreating = false;
        unit.hp = unit.maxHp;
        unit.attackCooldown = 0;
        burst(unit.x, unit.y, "#d8b966", 20);
        if (state.selectedTower === tower) showInspectPanel(tower);
      }
    }
    return;
  }

  if (!state.waveActive) {
    unit.target = null;
    moveFriendlyUnit(unit, tower, 110, dt);
    return;
  }

  const stats = towerStats(tower);
  const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && enemy.fearTimer <= 0 && enemy.possessionTimer <= 0 && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
  candidates.sort((first, second) => enemyProgress(second) - enemyProgress(first));
  unit.target = candidates[0] || null;
  const closeEnemies = candidates.filter(enemy => Math.hypot(enemy.x - unit.x, enemy.y - unit.y) <= 38);
  closeEnemies.sort((first, second) => Math.hypot(first.x - unit.x, first.y - unit.y) - Math.hypot(second.x - unit.x, second.y - unit.y));
  unit.engagedEnemies = closeEnemies.slice(0, base.warriorBlockers);

  if (unit.engagedEnemies.length) {
    unit.clashing = true;
    unit.target = unit.engagedEnemies[0];
    unit.angle = Math.atan2(unit.target.y - unit.y, unit.target.x - unit.x);
    if (unit.attackCooldown <= 0) {
      const victims = unit.engagedEnemies.slice(0, base.warriorAttackTargets);
      for (const enemy of victims) {
        damageEnemy(enemy, stats.damage, tower, "physical", unit);
        if (!enemy.dead) enemy.stunTimer = Math.max(enemy.stunTimer || 0, base.warriorStunDuration);
      }
      unit.attackCooldown = stats.cooldown;
      unit.swing = .72;
      unit.groundPound = .72;
      burst(unit.x, unit.y, "#c7aa68", 28);
      if (state.selectedTower === tower) showInspectPanel(tower);
    }
    return;
  }

  const destination = unit.target || knightRallyPoint(unit);
  moveFriendlyUnit(unit, destination, 92, dt);
}

function breatheDragonFire(dragon, blocker) {
  const radius = 72;
  const damage = enemyMeleeDamage(dragon);
  const angle = Math.atan2(blocker.y - dragon.y, blocker.x - dragon.x);
  dragon.combatAngle = angle;
  dragon.fireBreathTimer = .8;
  dragon.attackSwing = .8;
  dragon.fireBreathCooldown = 2.6;

  for (const unit of state.knights) {
    if (!unit.alive || unit.expired || Math.hypot(unit.x - blocker.x, unit.y - blocker.y) > radius) continue;
    unit.hp -= damage;
    unit.hitFlash = .18;
    if (unit.hp <= 0) defeatKnight(unit);
  }

  const colors = ["#ffcf52", "#ff8a2a", "#d83d1f"];
  for (let index = 0; index < 34; index++) {
    const spread = (Math.random() - .5) * .95;
    const speed = 55 + Math.random() * 95;
    const startDistance = 8 + Math.random() * 13;
    state.particles.push({
      kind: "dragonFire",
      x: dragon.x + Math.cos(angle) * startDistance,
      y: dragon.y + Math.sin(angle) * startDistance,
      vx: Math.cos(angle + spread) * speed,
      vy: Math.sin(angle + spread) * speed,
      life: .34 + Math.random() * .42,
      maxLife: .76,
      color: colors[index % colors.length],
      size: 3 + Math.random() * 4
    });
  }
  burst(blocker.x, blocker.y, "#ff7626", 18);
}

function summonWraiths(witch) {
  const amount = Math.min(2, witch.summonsRemaining);
  for (let index = 0; index < amount; index++) {
    spawnEnemy("wraith");
    const wraith = state.enemies[state.enemies.length - 1];
    const angle = witch.combatAngle || 0;
    const side = index === 0 ? -1 : 1;
    wraith.x = witch.x - Math.sin(angle) * side * 11;
    wraith.y = witch.y + Math.cos(angle) * side * 11;
    wraith.pathIndex = Math.max(1, witch.pathIndex);
    wraith.phase = witch.phase + side * 1.4;
  }
  witch.summonsRemaining -= amount;
  witch.summonCooldown = 4.5;
  burst(witch.x, witch.y, "#9be7d7", 18);
}

function summonBossMinions(boss) {
  const base = enemyTypes[boss.type];
  const count = base.bossSummonCount || 5;
  const interval = base.bossSummonInterval || 15;
  const angle = boss.combatAngle || Math.atan2(pathPoints[Math.min(pathPoints.length - 1, boss.pathIndex + 1)].y - boss.y, pathPoints[Math.min(pathPoints.length - 1, boss.pathIndex + 1)].x - boss.x);
  for (let index = 0; index < count; index++) {
    spawnEnemy(boss.type, { bossMinion: true });
    const minion = state.enemies[state.enemies.length - 1];
    const side = (index - (count - 1) / 2) * 10;
    minion.x = boss.x - Math.cos(angle) * 13 - Math.sin(angle) * side;
    minion.y = boss.y - Math.sin(angle) * 13 + Math.cos(angle) * side;
    minion.pathIndex = Math.max(1, boss.pathIndex);
    minion.phase = boss.phase + index * .8;
  }
  boss.bossSummonTimer = interval;
  boss.bossSummonsMade = (boss.bossSummonsMade || 0) + count;
  burst(boss.x, boss.y, base.color, 24);
}

function fireWitchProjectile(witch, target) {
  state.projectiles.push({
    x: witch.x,
    y: witch.y,
    target,
    owner: witch,
    type: "witchMagic",
    hostile: true,
    damage: enemyMeleeDamage(witch),
    splash: 68,
    speed: 230,
    color: "#aef9e5",
    dead: false
  });
  witch.rangedCooldown = 2.6;
  witch.attackSwing = .5;
  witch.combatAngle = Math.atan2(target.y - witch.y, target.x - witch.x);
}

function hitBarracksWithMagic(projectile, target) {
  burst(target.x, target.y, projectile.color, 18);
  for (const unit of state.knights) {
    if (!unit.alive || unit.expired || Math.hypot(unit.x - target.x, unit.y - target.y) > projectile.splash) continue;
    unit.hp -= projectile.damage;
    unit.hitFlash = .2;
    if (unit.hp <= 0) defeatKnight(unit);
  }
}

function emitBloodDrainParticle(tower, targetOverride = null) {
  const targets = tower.bloodDrainTargets?.length ? tower.bloodDrainTargets : tower.bloodDrainTarget ? [tower.bloodDrainTarget] : [];
  const target = targetOverride || targets[Math.floor(Math.random() * targets.length)];
  if (!target) return;
  const startX = target.x + (Math.random() - .5) * 8;
  const startY = target.y + (Math.random() - .5) * 8;
  const dx = tower.x - startX;
  const dy = tower.y - startY;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = 235 + Math.random() * 55;
  state.particles.push({
    kind: "bloodDrain",
    x: startX,
    y: startY,
    vx: dx / distance * speed,
    vy: dy / distance * speed,
    life: Math.max(.2, distance / speed),
    maxLife: Math.max(.2, distance / speed),
    color: Math.random() < .35 ? "#ff5a5f" : "#a80f2b",
    size: 2.5 + Math.random() * 2.6,
    height: .42 + Math.random() * .22
  });
}

function updateBloodDrainEffect(tower, dt) {
  if (tower.bloodDrainTimer <= 0 || (!tower.bloodDrainTarget && !tower.bloodDrainTargets?.length)) return;
  tower.bloodParticleTimer -= dt;
  while (tower.bloodParticleTimer <= 0) {
    emitBloodDrainParticle(tower);
    tower.bloodParticleTimer += .045;
  }
}

function updateKnights(dt) {
  for (const knight of state.knights) {
    if (knight.expired) continue;
    const tower = knight.owner;
    if (!state.towers.includes(tower)) continue;
    if (knight.unitType === "togga") {
      updateToggaWarrior(knight, dt);
      continue;
    }
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
        burst(knight.x, knight.y, knight.unitType === "gladiator" ? "#e4bd68" : "#d9e2e5", 8);
        if (state.selectedTower === tower) showInspectPanel(tower);
      }
      continue;
    }

    const stats = towerStats(tower);
    if (!knight.target || knight.target.dead || knight.target.reached || knight.target.thrown || knight.target.ignoresBarracks || knight.target.fearTimer > 0 || knight.target.possessionTimer > 0 || Math.hypot(knight.target.x - tower.x, knight.target.y - tower.y) > stats.range + 28) {
      const claimed = new Set(state.knights.filter(other => other !== knight && other.alive && other.owner === tower && other.target && !other.target.dead).map(other => other.target));
      const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && !enemy.ignoresBarracks && enemy.fearTimer <= 0 && enemy.possessionTimer <= 0 && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
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
        const damage = knight.unitType === "vampireMinion" ? 90 : stats.damage;
        damageEnemy(knight.target, damage, tower, "physical", knight);
        knight.attackCooldown = knight.unitType === "vampireMinion" ? 1.15 : stats.cooldown;
        knight.swing = .34;
        burst(knight.target.x, knight.target.y, "#d3dfe3", 3);
      }
    } else if (distance > 3) {
      knight.moving = true;
      const moveSpeed = knight.unitType === "zombie" ? 72 : knight.unitType === "gladiator" ? 116 : knight.unitType === "vampireMinion" ? 120 : 105;
      const step = Math.min(distance, moveSpeed * dt);
      knight.x += dx / distance * step;
      knight.y += dy / distance * step;
    }
  }
}

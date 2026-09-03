"use strict";

// Stoneback Ogre throws, Dread Ghost control, and Dracula's Cloak bat curses.

function curseEnemiesIntoBats(tower) {
  if (!hasRelic(tower, "draculaCloak")) return [];
  const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && enemy.batFormTimer <= 0);
  candidates.sort((first, second) => Math.hypot(first.x - tower.x, first.y - tower.y) - Math.hypot(second.x - tower.x, second.y - tower.y));
  const victims = candidates.slice(0, DRACULA_BAT_COUNT);
  for (const enemy of victims) {
    enemy.batFormTimer = DRACULA_BAT_DURATION;
    burst(enemy.x, enemy.y, "#ff7b29", 9);
    burst(enemy.x, enemy.y, "#321126", 7);
  }
  if (victims.length) {
    tower.batCurseCooldown = DRACULA_BAT_COOLDOWN;
    tower.batCursePulse = .9;
    tower.enemiesBatCursed = (tower.enemiesBatCursed || 0) + victims.length;
    burst(tower.x, tower.y, "#ff8a32", 22);
    if (state.selectedTower === tower) showInspectPanel(tower);
  }
  return victims;
}

function updateDraculaBatCurse(tower, dt) {
  if (!hasRelic(tower, "draculaCloak")) {
    tower.batCurseCooldown = 0;
    return [];
  }
  tower.batCurseCooldown = Math.max(0, (tower.batCurseCooldown || 0) - dt);
  return tower.batCurseCooldown <= 0 ? curseEnemiesIntoBats(tower) : [];
}

function updateBatForm(enemy, dt) {
  if (enemy.batFormTimer <= 0) return;
  enemy.batFormTimer = Math.max(0, enemy.batFormTimer - dt);
  if (enemy.batFormTimer === 0) burst(enemy.x, enemy.y, "#5b233c", 7);
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

function enemyFearCooldown(enemy) {
  const base = towerTypes.ghost?.bossFearCooldown || 8;
  return enemy.isBoss || enemy.isMiniBoss ? base : 4;
}

function throwEnemyBack(tower, enemy, stats) {
  const landing = rewindEnemyAlongPath(enemy, stats.knockback);
  if (enemy.fearTimer > 0) enemy.fearCooldown = Math.max(enemy.fearCooldown, enemyFearCooldown(enemy));
  enemy.fearTimer = 0;
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

function fearEnemy(enemy, duration) {
  enemy.fearTimer = duration;
  enemy.fearTargetIndex = Math.max(0, enemy.pathIndex - 1);
  enemy.fearResumeIndex = Math.max(1, enemy.pathIndex);
  enemy.blocked = false;
  enemy.moving = true;
  for (const knight of state.knights) if (knight.target === enemy) knight.target = null;
}

function updateFearedEnemy(enemy, dt) {
  enemy.fearTimer = Math.max(0, enemy.fearTimer - dt);
  if (enemy.fearTimer <= 0) {
    enemy.fearCooldown = Math.max(enemy.fearCooldown, enemyFearCooldown(enemy));
    enemy.pathIndex = Math.min(pathPoints.length - 1, Math.max(1, enemy.fearResumeIndex));
    enemy.moving = false;
    return;
  }

  const target = pathPoints[enemy.fearTargetIndex];
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
    if (enemy.fearTargetIndex > 0) {
      enemy.fearResumeIndex = enemy.fearTargetIndex;
      enemy.fearTargetIndex--;
    } else {
      enemy.fearResumeIndex = 1;
      enemy.moving = false;
    }
  } else if (distance > 0) {
    enemy.x += dx / distance * step;
    enemy.y += dy / distance * step;
  }
}

function possessEnemy(enemy, tower, duration = UMBRAL_POSSESSION_DURATION) {
  if (enemy.isBoss || enemy.isMiniBoss || enemy.dead || enemy.reached || enemy.thrown) return false;
  enemy.fearTimer = 0;
  enemy.possessionTimer = duration;
  enemy.possessionOwner = tower;
  enemy.possessionTarget = null;
  enemy.possessionAttackCooldown = 0;
  enemy.blocked = false;
  enemy.moving = false;
  for (const knight of state.knights) if (knight.target === enemy) knight.target = null;
  burst(enemy.x, enemy.y, "#9a43ff", 13);
  return true;
}

function updatePossessedEnemy(enemy, dt) {
  if (enemy.possessionTimer <= 0) return false;
  enemy.possessionTimer = Math.max(0, enemy.possessionTimer - dt);
  enemy.blocked = false;
  enemy.moving = false;
  if (enemy.possessionTimer <= 0) {
    enemy.possessionOwner = null;
    enemy.possessionTarget = null;
    enemy.possessionAttackCooldown = 0;
    burst(enemy.x, enemy.y, "#5d257f", 7);
    return false;
  }

  const candidates = state.enemies.filter(target => target !== enemy && !target.dead && !target.reached && !target.thrown && target.possessionTimer <= 0 && Math.hypot(target.x - enemy.x, target.y - enemy.y) <= UMBRAL_POSSESSION_RANGE);
  candidates.sort((first, second) => Math.hypot(first.x - enemy.x, first.y - enemy.y) - Math.hypot(second.x - enemy.x, second.y - enemy.y));
  enemy.possessionTarget = candidates[0] || null;
  enemy.possessionAttackCooldown -= dt;
  if (!enemy.possessionTarget) return true;

  const target = enemy.possessionTarget;
  enemy.combatAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
  if (Math.abs(target.x - enemy.x) > 1) enemy.facing = Math.sign(target.x - enemy.x);
  if (enemy.possessionAttackCooldown <= 0) {
    damageEnemy(target, enemyMeleeDamage(enemy), enemy.possessionOwner, "physical", enemy);
    enemy.possessionAttackCooldown = UMBRAL_POSSESSION_ATTACK_COOLDOWN;
    enemy.attackSwing = .46;
    burst(target.x, target.y, "#b66cff", 8);
  }
  return true;
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
  if (!enemy.dead && owner) damageEnemy(enemy, damage, owner, "physical");
}

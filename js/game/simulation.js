"use strict";

// The main per-frame world simulation for waves, enemies, defenses, and projectiles.

function update(dt) {
  if (state.paused || state.ended || state.storeOpen || state.menuOpen) return;
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
    enemy.fireBreathTimer = Math.max(0, (enemy.fireBreathTimer || 0) - dt);
    enemy.blocked = false;
    enemy.moving = false;
    if (enemy.thrown) {
      updateThrownEnemy(enemy, dt);
      continue;
    }
    if (enemy.type === "covenwitch" && enemy.summonsRemaining > 0) {
      enemy.summonCooldown -= dt;
      if (enemy.summonCooldown <= 0) summonWraiths(enemy);
    }
    if (enemy.type === "covenwitch") {
      enemy.rangedCooldown -= dt;
      const rangedTargets = state.knights.filter(unit => unit.alive && !unit.expired && Math.hypot(unit.x - enemy.x, unit.y - enemy.y) <= 150);
      rangedTargets.sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y));
      if (rangedTargets.length && enemy.rangedCooldown <= 0) fireWitchProjectile(enemy, rangedTargets[0]);
    }
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
    if (enemy.slowTimer === 0) enemy.slowStrength = 0;
    if (enemy.fearTimer > 0) {
      updateFearedEnemy(enemy, dt);
      continue;
    }
    enemy.fearCooldown = Math.max(0, enemy.fearCooldown - dt);
    const blocker = enemy.ignoresBarracks ? null : state.knights.find(knight => knight.alive && knight.target === enemy && Math.hypot(knight.x - enemy.x, knight.y - enemy.y) <= 24);
    if (blocker) {
      enemy.blocked = true;
      enemy.combatAngle = Math.atan2(blocker.y - enemy.y, blocker.x - enemy.x);
      if (enemy.type === "dragon") {
        enemy.fireBreathCooldown -= dt;
        if (enemy.fireBreathCooldown <= 0) breatheDragonFire(enemy, blocker);
        continue;
      }
      if (enemy.type === "covenwitch") continue;
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
        if (enemy.isBoss) {
          state.lives = 0;
          updateUI();
          endGame(false, `The ${enemyTypes[enemy.type].name} reached Stonewatch Keep. Any boss breach ends the defense immediately.`);
        } else {
          state.lives = Math.max(0, state.lives - enemy.damage);
          updateUI();
          if (state.lives <= 0) endGame(false);
        }
      }
    } else {
      enemy.x += dx / distance * step;
      enemy.y += dy / distance * step;
    }
  }

  for (const tower of state.towers) {
    tower.throwSwing = Math.max(0, tower.throwSwing - dt);
    tower.fearPulse = Math.max(0, (tower.fearPulse || 0) - dt);
    tower.bloodDrainTimer = Math.max(0, (tower.bloodDrainTimer || 0) - dt);
    if (tower.type === "mine") {
      if (state.waveActive && tower.workers > 0) {
        tower.productionTimer += dt;
        while (tower.productionTimer >= 3) {
          tower.productionTimer -= 3;
          const relicMultiplier = tower.items?.includes("ring") ? 1.5 : 1;
          const earnings = awardGold(tower.workers * 2 * relicMultiplier);
          tower.goldMined += earnings;
          burst(tower.x, tower.y, "#e7bd52", 5 + tower.workers * 2);
          updateUI();
        }
      }
      continue;
    }
    if (tower.type === "vampire") {
      tower.cooldown -= dt;
      updateBloodDrainEffect(tower, dt);
      const stats = towerStats(tower);
      const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
      candidates.sort((a, b) => enemyProgress(b) - enemyProgress(a));
      const targets = candidates.slice(0, stats.drainCount);
      const target = targets[0];
      if (target) {
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        if (tower.cooldown <= 0) {
          tower.bloodDrainTargets = targets;
          tower.bloodDrainTarget = target;
          tower.bloodDrainTimer = .85;
          tower.bloodParticleTimer = 0;
          targets.forEach(victim => damageEnemy(victim, stats.damage, tower, "magic"));
          targets.forEach(victim => emitBloodDrainParticle(tower, victim));
          tower.bloodParticleTimer = .045;
          tower.cooldown = stats.cooldown;
        }
      }
      continue;
    }
    if (tower.type === "ghost") {
      tower.cooldown -= dt;
      const stats = towerStats(tower);
      const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && enemy.fearTimer <= 0 && enemy.fearCooldown <= 0 && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
      candidates.sort((a, b) => Math.hypot(a.x - tower.x, a.y - tower.y) - Math.hypot(b.x - tower.x, b.y - tower.y));
      const target = candidates[0];
      if (target) {
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        if (tower.cooldown <= 0) {
          const victims = candidates.slice(0, stats.fearCount);
          victims.forEach(enemy => fearEnemy(enemy, stats.fearDuration));
          tower.enemiesFeared += victims.length;
          tower.fearPulse = .8;
          tower.cooldown = stats.cooldown;
          burst(tower.x, tower.y, towerTypes.ghost.color, 20);
          if (state.selectedTower === tower) showInspectPanel(tower);
        }
      }
      continue;
    }
    if (tower.type === "barracks") {
      if (tower.specialization === "graveyard") {
        let activeZombies = state.knights.filter(unit => unit.owner === tower && unit.unitType === "zombie" && !unit.expired).length;
        if (activeZombies < 8) {
          tower.summonTimer -= dt;
          while (tower.summonTimer <= 0 && activeZombies < 8) {
            const zombie = spawnBarracksUnit(tower, "zombie");
            if (!zombie) break;
            activeZombies++;
            tower.summonTimer += 4;
            burst(tower.x, tower.y, "#79a861", 10);
            if (state.selectedTower === tower) showInspectPanel(tower);
          }
        } else {
          tower.summonTimer = 4;
        }
      } else {
        ensureBarracksKnights(tower);
      }
      continue;
    }
    if (tower.type === "ogre") {
      tower.cooldown -= dt;
      const stats = towerStats(tower);
      const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
      candidates.sort((a, b) => enemyProgress(b) - enemyProgress(a));
      const target = candidates.find(enemy => !enemy.isBoss && !enemy.isMiniBoss) || candidates[0];
      if (target) {
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        if (tower.cooldown <= 0) {
          if (target.isBoss || target.isMiniBoss) {
            tower.throwSwing = .9;
            damageEnemy(target, stats.damage, tower, "physical");
            burst(target.x, target.y, "#8e8050", 8);
          } else {
            throwEnemyBack(tower, target, stats);
          }
          tower.cooldown = stats.cooldown;
        }
      }
      continue;
    }
    if (tower.type === "archer") {
      tower.cooldown -= dt;
      tower.volleyTimer = Math.max(0, (tower.volleyTimer || 0) - dt);
      tower.slingShotTimer = Math.max(0, (tower.slingShotTimer || 0) - dt);
      if (!Array.isArray(tower.archerShotTimers)) tower.archerShotTimers = [0, 0, 0];
      tower.archerShotTimers = tower.archerShotTimers.map(timer => Math.max(0, timer - dt));
      const stats = towerStats(tower);
      const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
      candidates.sort((a, b) => enemyProgress(b) - enemyProgress(a));
      const target = candidates[0];
      if (target) tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);

      if (tower.specialization === "slingshooters") {
        tower.volleyShotsRemaining = 0;
        if (target && tower.cooldown <= 0) {
          fireProjectile(tower, target, stats);
          tower.slingShotTimer = .72;
          tower.cooldown = stats.cooldown;
        }
        continue;
      }

      if (tower.volleyShotsRemaining > 0 && tower.volleyTimer <= 0) {
        if (target) {
          const archerIndex = 3 - tower.volleyShotsRemaining;
          fireProjectile(tower, target, stats, archerIndex);
          tower.archerShotTimers[archerIndex] = .22;
          tower.volleyShotsRemaining--;
          tower.volleyTimer = .14;
          if (tower.volleyShotsRemaining === 0) tower.cooldown = stats.cooldown;
        } else {
          tower.volleyShotsRemaining = 0;
          tower.cooldown = .12;
        }
      } else if (tower.volleyShotsRemaining <= 0 && target && tower.cooldown <= 0) {
        tower.volleyShotsRemaining = 3;
        tower.volleyTimer = 0;
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
    if (!target || (projectile.hostile ? !target.alive || target.expired : target.dead || target.reached)) {
      projectile.dead = true;
      continue;
    }
    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const distance = Math.hypot(dx, dy);
    const step = projectile.speed * dt;
    if (distance <= step + 6) {
      if (projectile.hostile) hitBarracksWithMagic(projectile, target);
      else hitEnemy(projectile, target);
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
    } else if (particle.kind === "bloodDrain") {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    } else {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 28 * dt;
    }
  }

  state.enemies = state.enemies.filter(e => !e.dead && !e.reached);
  state.knights = state.knights.filter(unit => !unit.expired);
  state.projectiles = state.projectiles.filter(p => !p.dead);
  state.particles = state.particles.filter(p => p.life > 0);

  if (!state.ended && state.waveActive && !state.spawnQueue.length && !state.enemies.length) {
    state.waveActive = false;
    state.activeEvent = null;
    dismissVampireMinions();
    if (state.gameMode === "campaign" && state.wave >= CAMPAIGN_WAVE_COUNT) endGame(true);
    else {
      const bonus = 18 + state.wave * 3;
      state.gold += bonus;
      showAnnouncement(`Wave cleared — ${bonus} gold earned`);
      updateUI();
    }
  }
}

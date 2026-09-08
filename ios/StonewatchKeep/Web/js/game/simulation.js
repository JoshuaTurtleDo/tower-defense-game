"use strict";

// The main per-frame world simulation for waves, enemies, defenses, and projectiles.

function update(dt) {
  if (state.paused || state.ended || state.storeOpen || state.monsterIndexOpen || state.menuOpen) return;
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
    updateBatForm(enemy, dt);
    updateBallistaStatusEffects(enemy, dt);
    if (enemy.dead) continue;
    enemy.attackSwing = Math.max(0, enemy.attackSwing - dt);
    enemy.fireBreathTimer = Math.max(0, (enemy.fireBreathTimer || 0) - dt);
    enemy.snowballThrowTimer = Math.max(0, (enemy.snowballThrowTimer || 0) - dt);
    enemy.blocked = false;
    enemy.moving = false;
    if (enemy.thrown) {
      updateThrownEnemy(enemy, dt);
      continue;
    }
    if (enemy.stunTimer > 0) {
      enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
      continue;
    }
    if (state.wave >= BOSS_SUMMON_UNLOCK_WAVE && !enemy.isBossMinion && (enemy.isBoss || enemy.isMiniBoss)) {
      enemy.bossSummonTimer -= dt;
      if (enemy.bossSummonTimer <= 0) summonBossMinions(enemy);
    }
    if (!enemy.isBossMinion && enemy.type === "yeti") {
      enemy.snowballCooldown -= dt;
      if (enemy.snowballCooldown <= 0) fireYetiSnowball(enemy);
    }
    if (!enemy.isBossMinion && enemy.type === "covenwitch" && enemy.summonsRemaining > 0) {
      enemy.summonCooldown -= dt;
      if (enemy.summonCooldown <= 0) summonWraiths(enemy);
    }
    if (!enemy.isBossMinion && enemy.type === "covenwitch") {
      enemy.rangedCooldown -= dt;
      const rangedTargets = state.knights.filter(unit => unit.alive && !unit.expired && (unit.unitType === "togga" || !bossIgnoresBarracks(enemy)) && Math.hypot(unit.x - enemy.x, unit.y - enemy.y) <= 150);
      rangedTargets.sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y));
      if (rangedTargets.length && enemy.rangedCooldown <= 0) fireWitchProjectile(enemy, rangedTargets[0]);
    }
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
    if (enemy.slowTimer === 0) enemy.slowStrength = 0;
    if (enemy.possessionTimer > 0 && updatePossessedEnemy(enemy, dt)) continue;
    if (enemy.fearTimer > 0) {
      updateFearedEnemy(enemy, dt);
      continue;
    }
    enemy.fearCooldown = Math.max(0, enemy.fearCooldown - dt);
    const toggaBlocker = enemy.ignoresBarracks ? null : state.knights.find(unit => unit.unitType === "togga" && unit.alive && !unit.retreating && unit.engagedEnemies?.includes(enemy) && Math.hypot(unit.x - enemy.x, unit.y - enemy.y) <= 42);
    const barracksBlocker = enemy.ignoresBarracks || bossIgnoresBarracks(enemy) ? null : state.knights.find(knight => knight.unitType !== "togga" && knight.alive && knight.target === enemy && Math.hypot(knight.x - enemy.x, knight.y - enemy.y) <= 24);
    const blocker = toggaBlocker || barracksBlocker;
    if (blocker) {
      enemy.blocked = true;
      enemy.combatAngle = Math.atan2(blocker.y - enemy.y, blocker.x - enemy.x);
      if (enemy.type === "dragon" && !enemy.isBossMinion) {
        enemy.fireBreathCooldown -= dt;
        if (enemy.fireBreathCooldown <= 0) breatheDragonFire(enemy, blocker);
        continue;
      }
      if (enemy.type === "covenwitch" && !enemy.isBossMinion) continue;
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
        if (enemy.isBossMinion || enemy.type === "merchant") {
          updateUI();
        } else if (enemy.isBoss) {
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
    tower.stoneThrowTimer = Math.max(0, (tower.stoneThrowTimer || 0) - dt);
    tower.fearPulse = Math.max(0, (tower.fearPulse || 0) - dt);
    tower.bloodDrainTimer = Math.max(0, (tower.bloodDrainTimer || 0) - dt);
    tower.batCursePulse = Math.max(0, (tower.batCursePulse || 0) - dt);
    const wasFrozen = tower.freezeTimer > 0;
    tower.freezeTimer = Math.max(0, (tower.freezeTimer || 0) - dt);
    if (tower.freezeTimer > 0) {
      if (state.selectedTower === tower) showFrozenDefenseStatus(tower);
      continue;
    }
    if (wasFrozen && state.selectedTower === tower) showInspectPanel(tower);
    if (tower.type === "mine") {
      continue;
    }
    if (tower.type === "castle") {
      if (hasPassiveUnlock("castleCannon")) {
        tower.cannonCooldown = Math.max(0, (tower.cannonCooldown || 0) - dt);
        const cannonRange = 175 * passiveTowerMultiplier(tower, "range");
        const targets = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= cannonRange);
        targets.sort((a, b) => enemyProgress(b) - enemyProgress(a));
        const target = targets[0];
        if (target) {
          tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
          if (tower.cannonCooldown <= 0) {
            fireProjectile(tower, target, { damage: 200, damageType: "physical", splash: CELL * .75, projectileSpeed: 460 }, null, {
              variant: "castleCannon", color: "#ffcf68", damage: 200, damageType: "physical", splash: CELL * .75, splashDamage: 120, speed: 460
            });
            tower.cannonCooldown = 2.5;
          }
        }
      }
      continue;
    }
    if (tower.type === "vampire") {
      tower.cooldown -= dt;
      updateBloodDrainEffect(tower, dt);
      updateDraculaBatCurse(tower, dt);
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
      const umbral = hasRelic(tower, "umbralForm");
      const candidates = state.enemies.filter(enemy => {
        if (enemy.dead || enemy.reached || enemy.thrown || Math.hypot(enemy.x - tower.x, enemy.y - tower.y) > stats.range) return false;
        if (!umbral || enemy.isBoss || enemy.isMiniBoss) return enemy.fearTimer <= 0 && enemy.fearCooldown <= 0;
        return enemy.possessionTimer <= 0;
      });
      candidates.sort((a, b) => Math.hypot(a.x - tower.x, a.y - tower.y) - Math.hypot(b.x - tower.x, b.y - tower.y));
      const target = candidates[0];
      if (target) {
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        if (tower.cooldown <= 0) {
          const victims = candidates.slice(0, stats.fearCount);
          if (umbral) {
            let possessed = 0;
            let bossesFeared = 0;
            for (const enemy of victims) {
              if (enemy.isBoss || enemy.isMiniBoss) {
                fearEnemy(enemy, UMBRAL_BOSS_FEAR_DURATION);
                bossesFeared++;
              } else if (possessEnemy(enemy, tower)) possessed++;
            }
            tower.enemiesPossessed += possessed;
            tower.enemiesFeared += bossesFeared;
          } else {
            victims.forEach(enemy => fearEnemy(enemy, stats.fearDuration));
            tower.enemiesFeared += victims.length;
          }
          tower.fearPulse = .8;
          tower.cooldown = stats.cooldown;
          burst(tower.x, tower.y, umbral ? "#a441ff" : towerTypes.ghost.color, umbral ? 28 : 20);
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
      if (tower.specialization === "togga") {
        ensureToggaWarrior(tower);
        continue;
      }
      tower.cooldown -= dt;
      const stats = towerStats(tower);
      const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
      candidates.sort((a, b) => enemyProgress(b) - enemyProgress(a));
      const target = candidates.find(enemy => !enemy.isBoss && !enemy.isMiniBoss) || candidates[0];
      if (target) {
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        if (tower.cooldown <= 0) {
          if (tower.specialization === "stoneThrow") {
            fireProjectile(tower, target, stats, null, { variant: "ogreRock", color: "#9d8d64", splashDamage: stats.splashDamage });
            tower.throwSwing = .9;
            tower.stoneThrowTimer = .9;
          } else if (target.isBoss || target.isMiniBoss) {
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
    if (tower.type === "ufo") {
      tower.cooldown -= dt;
      const stats = towerStats(tower);
      const candidates = state.enemies.filter(enemy => !enemy.dead && !enemy.reached && !enemy.thrown && Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range);
      candidates.sort((a, b) => enemyProgress(b) - enemyProgress(a));
      const target = candidates[0];
      if (target) {
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        if (tower.cooldown <= 0) {
          fireProjectile(tower, target, stats);
          if (tower.specialization === "twinlaser") {
            fireProjectile(tower, target, stats, null, { variant: "ufoLaserRed", color: towerTypes.ufo.twinLaserColor, sideOffset: 8 });
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
    let target = projectile.target;
    if (projectile.variant === "arcaneBounce" && (!target || target.dead || target.reached || target.thrown)) {
      target = nextArcaneBounceTarget(projectile, projectile.arcaneLastTarget);
      projectile.target = target;
    }
    const invalidTowerTarget = projectile.targetsTower && (!target || !state.towers.includes(target));
    const invalidUnitTarget = !projectile.targetsTower && projectile.hostile && (!target || !target.alive || target.expired);
    const invalidEnemyTarget = !projectile.targetsTower && !projectile.hostile && (!target || target.dead || target.reached);
    if (invalidTowerTarget || invalidUnitTarget || invalidEnemyTarget) {
      projectile.dead = true;
      continue;
    }
    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const distance = Math.hypot(dx, dy);
    const step = projectile.speed * dt;
    if (distance <= step + 6) {
      let continues = false;
      if (projectile.targetsTower) freezeDefense(target);
      else if (projectile.hostile) hitBarracksWithMagic(projectile, target);
      else continues = hitEnemy(projectile, target) === true;
      projectile.dead = !continues;
    } else {
      projectile.x += dx / distance * step;
      projectile.y += dy / distance * step;
    }
  }

  for (const particle of state.particles) {
    if (particle.kind === "debris" || particle.kind === "gooDebris") {
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
          particle.groundTimer = particle.groundDuration || 3;
          particle.life = particle.groundTimer;
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
    if (state.lives >= state.waveStartLives) state.wavesWithoutLifeLoss++;
    else state.wavesWithoutLifeLoss = 0;
    dismissVampireMinions();
    const minePayout = payGoldMineRoundIncome();
    const coveRelics = rollTreasureCoveRoundRelics();
    if (state.gameMode === "campaign" && state.wave >= CAMPAIGN_WAVE_COUNT) endGame(true);
    else {
      const bonus = 18 + state.wave * 3;
      state.gold += bonus;
      const coveMessage = coveRelics ? ` + ${coveRelics} cove relic` : "";
      showAnnouncement(`Wave cleared — ${bonus} bonus gold${minePayout ? ` + ${minePayout} mine gold` : ""}${coveMessage}${coveRelics === 1 ? "" : coveRelics ? "s" : ""}`);
      updateUI();
    }
  }
}

function payGoldMineRoundIncome() {
  let totalPayout = 0;
  for (const mine of state.towers) {
    if (mine.type !== "mine" || mine.specialization === "treasureCove" || mine.workers <= 0 || mine.freezeTimer > 0) continue;
    const ringMultiplier = relicMultiplier(mine, "mineIncome");
    const exactIncome = mine.workers * MINE_GOLD_PER_WORKER_PER_ROUND * ringMultiplier + (mine.incomeRemainder || 0);
    const payout = Math.floor(exactIncome + 1e-9);
    mine.incomeRemainder = exactIncome - payout;
    mine.goldMined += payout;
    state.gold += payout;
    totalPayout += payout;
    burst(mine.x, mine.y, "#e7bd52", 8 + mine.workers * 2);
  }
  return totalPayout;
}

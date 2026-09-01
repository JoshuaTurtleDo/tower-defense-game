"use strict";

// Target progress, projectile impacts, damage, death debris, particles, and match endings.

function enemyProgress(enemy) {
  return enemy.pathIndex * 1000 - Math.hypot(pathPoints[enemy.pathIndex]?.x - enemy.x || 0, pathPoints[enemy.pathIndex]?.y - enemy.y || 0);
}

function fireProjectile(tower, target, stats, archerIndex = null) {
  const base = towerTypes[tower.type];
  const flamingBallista = tower.type === "ballista" && tower.level >= 3;
  const projectileColor = flamingBallista ? "#ff7429" : tower.type === "mage" && tower.specialization === "frost" ? "#8fe8f4" : base.color;
  const variant = tower.type === "archer" ? tower.specialization === "slingshooters" ? "slingRock" : tower.specialization === "riflemen" ? "rifle" : "arrow" : flamingBallista ? "flamingBolt" : null;
  let originX = tower.x + Math.cos(tower.angle) * 17;
  let originY = tower.y + Math.sin(tower.angle) * 17;
  if (tower.type === "archer" && archerIndex !== null) {
    const formation = [{ lateral: -19, forward: -5 }, { lateral: 0, forward: 9 }, { lateral: 19, forward: -5 }][archerIndex];
    const forward = 17 + formation.forward;
    originX = tower.x + Math.cos(tower.angle) * forward - Math.sin(tower.angle) * formation.lateral;
    originY = tower.y + Math.sin(tower.angle) * forward + Math.cos(tower.angle) * formation.lateral;
  }
  state.projectiles.push({
    x: originX,
    y: originY,
    target,
    owner: tower,
    type: tower.type,
    damage: stats.damage,
    damageType: base.damageType,
    splash: stats.splash,
    speed: stats.projectileSpeed || base.projectileSpeed,
    color: projectileColor,
    variant,
    dead: false
  });
}

function hitEnemy(projectile, target) {
  if (projectile.splash > 0) {
    burst(target.x, target.y, projectile.color, 12);
    for (const enemy of state.enemies) {
      if (!enemy.dead && !enemy.reached && Math.hypot(enemy.x - target.x, enemy.y - target.y) <= projectile.splash) {
        damageEnemy(enemy, projectile.damage * (enemy === target ? 1 : .7), projectile.owner, projectile.damageType);
        if (projectile.owner.type === "mage" && projectile.owner.specialization === "frost" && !enemy.dead) {
          applyFrostSlow(enemy);
        }
      }
    }
  } else {
    if (projectile.variant === "flamingBolt") {
      burst(target.x, target.y, "#ff5b20", 13);
      burst(target.x, target.y, "#ffd35a", 7);
    } else {
      burst(target.x, target.y, projectile.color, 4);
    }
    damageEnemy(target, projectile.damage, projectile.owner, projectile.damageType);
  }
}

function applyFrostSlow(enemy) {
  enemy.slowStrength = Math.max(enemy.slowStrength, .38);
  enemy.slowTimer = Math.max(enemy.slowTimer, 2.75);
}

function damageEnemy(enemy, amount, owner, damageType = "physical", source = owner) {
  const resistance = damageType === "magic" ? enemy.magicResistance : enemy.physicalResistance;
  const actual = amount * (1 - THREE.MathUtils.clamp(resistance || 0, 0, .8));
  enemy.hp -= actual;
  enemy.lastDamageType = damageType;
  enemy.lastResistance = resistance || 0;
  enemy.hitFlash = .09;
  if (enemy.hp <= 0 && !enemy.dead) {
    const merchantDefeated = enemy.type === "merchant";
    enemy.dead = true;
    awardGold(enemy.reward);
    state.totalKills++;
    owner.kills++;
    if (owner.type === "vampire" && owner.specialization === "nightspawn" && source === owner && state.towers.includes(owner)) raiseVampireMinion(owner, enemy);
    spawnEnemyDebris(enemy);
    burst(enemy.x, enemy.y, "#e2b958", 9);
    if (state.selectedTower === owner) showInspectPanel(owner);
    updateUI();
    if (merchantDefeated) openMerchantStore();
  }
}

function spawnEnemyDebris(enemy) {
  const palettes = {
    goblin: ["#729547", "#58733a", "#6b3529"],
    skeleton: ["#d9d1b9", "#bcb49f", "#6f6b62"],
    orc: ["#587741", "#3d4244", "#2f3828"],
    ogre: ["#81754a", "#5f5839", "#4f3522"],
    dragon: ["#9c372d", "#63251f", "#d7aa48"],
    horseman: ["#a7d3c5", "#4b6862", "#ef8a32"],
    cyclops: ["#887653", "#5a4933", "#b58a3d"],
    merchant: ["#7d382c", "#d49a45", "#315c58", "#d8bd79"],
    pirate: ["#913732", "#d7c39b", "#3c2720"],
    werewolf: ["#69605a", "#3d3835", "#c3b49a"],
    viking: ["#56778b", "#c2b99f", "#7b5233"],
    wraith: ["#83c8bd", "#447e78", "#c2fff0"],
    demon: ["#a53b44", "#562229", "#ef7e3b"],
    davyjones: ["#3a7770", "#33241f", "#b38b47"],
    moonalpha: ["#aaa29a", "#4f4a47", "#d7c7a5"],
    longship: ["#765036", "#39271d", "#ae4035"],
    covenwitch: ["#7657a3", "#312442", "#9de7d8"],
    riftlord: ["#7e202c", "#36131a", "#f06a36"]
  };
  const counts = { goblin: 9, skeleton: 11, orc: 13, ogre: 16, dragon: 24, horseman: 28, cyclops: 32, merchant: 15, pirate: 11, werewolf: 13, viking: 14, wraith: 13, demon: 16, davyjones: 22, moonalpha: 23, longship: 26, covenwitch: 22, riftlord: 28 };
  const heights = { goblin: .34, skeleton: .43, orc: .5, ogre: .63, dragon: .82, horseman: 1.05, cyclops: 1.15, merchant: .68, pirate: .44, werewolf: .52, viking: .54, wraith: .58, demon: .66, davyjones: .85, moonalpha: .9, longship: .72, covenwitch: .88, riftlord: 1.05 };
  const palette = palettes[enemy.type] || palettes.goblin;
  const count = counts[enemy.type] || 10;
  const baseHeight = heights[enemy.type] || .4;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const isBoss = enemy.isBoss || enemy.isMiniBoss;
    const speed = 14 + Math.random() * (isBoss ? 52 : 36);
    const size = 2.6 + Math.random() * (isBoss ? 4.8 : 3.4);
    const blockWorldSize = .035 + size * .006;
    state.particles.push({
      kind: "debris",
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      height: .2 + Math.random() * baseHeight,
      groundHeight: .15 + blockWorldSize / 2,
      verticalVelocity: 1.35 + Math.random() * (isBoss ? 3.2 : 2.35),
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

function endGame(victory, defeatReason = "") {
  state.ended = true;
  const modal = document.getElementById("modal");
  document.getElementById("modalIcon").textContent = victory ? "♛" : "♜";
  document.getElementById("modalKicker").textContent = victory ? "THE KEEP STANDS" : "THE WALLS HAVE FALLEN";
  document.getElementById("modalTitle").textContent = victory ? "Victory!" : "Defeat";
  document.getElementById("modalText").textContent = victory ? "Your defenses held. Songs of Stonewatch will echo through the realm." : defeatReason || "The invaders breached the keep. Rebuild, adjust your towers, and meet them again.";
  document.getElementById("finalWaves").textContent = state.wave;
  document.getElementById("finalKills").textContent = state.totalKills;
  modal.classList.remove("hidden");
}

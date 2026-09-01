"use strict";

const path = require("node:path");
const { app, BrowserWindow, Menu } = require("electron");

if (require("electron-squirrel-startup")) app.quit();

const isSmokeTest = process.argv.includes("--smoke-test");
let mainWindow = null;
let smokeTestTimer = null;

function finishSmokeTest(code, details) {
  if (smokeTestTimer) clearTimeout(smokeTestTimer);
  if (details) console.log(JSON.stringify(details));
  app.exit(code);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1050,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#1c281e",
    icon: path.join(__dirname, "assets", "stonewatch-keep.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", event => event.preventDefault());
  mainWindow.webContents.on("before-input-event", (event, input) => {
    const toggleFullscreen = input.type === "keyDown" &&
      (input.key === "F11" || (input.alt && input.key === "Enter"));
    if (!toggleFullscreen) return;
    event.preventDefault();
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  if (isSmokeTest) {
    smokeTestTimer = setTimeout(() => finishSmokeTest(1, { ok: false, error: "Game load timed out." }), 15000);
    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      finishSmokeTest(1, { ok: false, errorCode, errorDescription });
    });
    mainWindow.webContents.on("render-process-gone", (_event, details) => {
      finishSmokeTest(1, { ok: false, error: "Renderer stopped unexpectedly.", details });
    });
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const result = await mainWindow.webContents.executeJavaScript(`({
          title: document.title,
          hasCanvas: document.querySelector("#gameCanvas") instanceof HTMLCanvasElement,
          hasThree: typeof window.THREE === "object",
          hasGraphics: typeof window.ThreeGraphics === "function",
          hasWheelZoom: typeof window.ThreeGraphics?.prototype?.zoomBy === "function",
          hasCameraReset: Boolean(document.querySelector("#cameraResetButton")),
          towerCards: document.querySelectorAll(".tower-card").length,
          menuModes: (() => {
            try {
              const initialMenuVisible = state.menuOpen && !document.getElementById("mainMenu").classList.contains("hidden") && Boolean(document.getElementById("playMenuButton")) && Boolean(document.getElementById("settingsMenuButton"));
              showMenuView("play");
              const modeChoicesVisible = !document.getElementById("playModeMenu").classList.contains("hidden") && Boolean(document.getElementById("campaignModeButton")) && Boolean(document.getElementById("endlessModeButton"));

              beginGameMode("endless");
              const endlessStarted = state.gameMode === "endless" && state.gameStarted && !state.menuOpen && document.getElementById("mainMenu").classList.contains("hidden");
              const wave31 = getWaveDefinition(31, "endless");
              const growingArmy = wave31.units.length > waves[0].units.length;
              const loopedBosses = [[40, "dragon"], [50, "horseman"], [60, "cyclops"]].every(([waveNumber, bossType]) => {
                const units = getWaveDefinition(waveNumber, "endless").units;
                const bossIndex = units.findIndex(unit => unit.type === bossType);
                return bossIndex >= 0 && units[bossIndex + 1]?.type === "merchant";
              });
              const loopedThemes = [[36, "pirate"], [42, "werewolf"], [48, "viking"], [54, "wraith"], [60, "demon"]].every(([waveNumber, type]) => getWaveEvent(waveNumber, "endless")?.type === type);
              state.wave = 30;
              startWave();
              const continuesAfterThirty = state.waveActive && state.wave === 31 && state.spawnQueue.length === wave31.units.length;

              resetGame("campaign");
              state.wave = 30;
              startWave();
              const campaignStopsAtThirty = !state.waveActive && state.wave === 30;

              resetGame("campaign");
              spawnEnemy("goblin");
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const settingsControlsExist = Boolean(document.getElementById("shadowsSettingButton")) && Boolean(document.getElementById("healthBarsSettingButton")) && Boolean(document.getElementById("cameraSpeedSettingButton"));
              gameSettings.healthBars = false;
              applyGameSettings();
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const healthBarsToggle = graphics3D.enemyBars.get(state.enemies[0])?.visible === false;
              gameSettings.healthBars = true;
              gameSettings.shadows = true;
              gameSettings.cameraSensitivity = 1;
              applyGameSettings();
              resetGame("campaign");

              return initialMenuVisible && modeChoicesVisible && endlessStarted && growingArmy && loopedBosses && loopedThemes && continuesAfterThirty && campaignStopsAtThirty && settingsControlsExist && healthBarsToggle;
            } catch (error) {
              return "Menu and modes error: " + (error.stack || error.message);
            }
          })(),
          treeObstacles: (() => {
            try {
              resetGame();
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const tree = state.trees[0];
              const startingCount = state.trees.length;
              const renderedInitially = graphics3D.treeGroups.has(tree.id);
              const firstTreeIsOffSpawn = !pathSet.has(tree.col + "," + tree.row);
              const tileBlocked = !canPlace(tree.col, tree.row);
              showTreePanel(tree);
              state.gold = TREE_REMOVAL_COST - 1;
              updateUI();
              const unaffordableDisabled = document.getElementById("digUpTreeButton").disabled && !document.getElementById("treePanel").classList.contains("hidden");
              state.gold = TREE_REMOVAL_COST;
              digUpTree();
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const removalWorks = state.gold === 0 && state.trees.length === startingCount - 1 && !graphics3D.treeGroups.has(tree.id) && canPlace(tree.col, tree.row);
              resetGame();
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const resetRestoresForest = state.trees.length === startingCount && graphics3D.treeGroups.has(tree.id) && !canPlace(tree.col, tree.row);
              return startingCount === TREE_LAYOUT.length && renderedInitially && firstTreeIsOffSpawn && tileBlocked && unaffordableDisabled && removalWorks && resetRestoresForest;
            } catch (error) {
              return "Tree obstacle error: " + (error.stack || error.message);
            }
          })(),
          archerVolley: (() => {
            state.gold = 9999;
            state.selectedBuild = "archer";
            placeTower(1, 1);
            const archers = state.towers.find(tower => tower.type === "archer");
            spawnEnemy("ogre");
            const target = state.enemies[state.enemies.length - 1];
            target.x = archers.x + 135;
            target.y = archers.y;
            target.speed = 0;
            archers.cooldown = 0;
            for (let index = 0; index < 34; index++) update(.01);
            graphics3D.render(state, hoverCell, canPlace, towerStats);
            const archerModel = graphics3D.towerMeshes.get(archers);
            const hillRendered = Boolean(archerModel?.userData.archerHill) && archerModel.userData.archers.every(archer => archer.baseY === .28);
            return archers.volleyShotsRemaining === 0 && archers.archerShotTimers[2] > 0 && hillRendered;
          })(),
          archerPaths: (() => {
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "archer";
              placeTower(1, 1);
              const rifleTower = state.towers[0];
              upgradeTower();
              const unbranchedLevelThree = towerStats({ type: "archer", level: 3, specialization: null });
              upgradeTower();
              const rifleStats = towerStats(rifleTower);
              spawnEnemy("ogre");
              const rifleTarget = state.enemies[0];
              rifleTarget.x = rifleTower.x + 100;
              rifleTarget.y = rifleTower.y;
              rifleTarget.speed = 0;
              rifleTower.cooldown = 0;
              update(.01);
              update(.01);
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const rifleProjectile = state.projectiles.find(projectile => projectile.variant === "rifle");
              const rifleModel = graphics3D.towerMeshes.get(rifleTower);
              const riflePathWorks = rifleTower.specialization === "riflemen" && rifleStats.damage > unbranchedLevelThree.damage * 2 && rifleStats.cooldown > unbranchedLevelThree.cooldown && Boolean(rifleProjectile) && Boolean(rifleModel?.userData.rifleSquad) && rifleModel.userData.riflemen.length === 3;

              resetGame();
              state.gold = 9999;
              state.selectedBuild = "archer";
              placeTower(1, 1);
              const slingTower = state.towers[0];
              upgradeTower();
              chooseSlingshooterPath();
              const slingStats = towerStats(slingTower);
              for (let index = 0; index < 2; index++) {
                spawnEnemy("ogre");
                const enemy = state.enemies[index];
                enemy.x = slingTower.x + 100 + index * 8;
                enemy.y = slingTower.y;
                enemy.speed = 0;
              }
              slingTower.cooldown = 0;
              update(.01);
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const slingProjectile = state.projectiles.find(projectile => projectile.variant === "slingRock");
              const projectileRendered = Boolean(slingProjectile && graphics3D.projectileMeshes.get(slingProjectile)?.userData.rock);
              const startingHealth = state.enemies.map(enemy => enemy.hp);
              if (slingProjectile) hitEnemy(slingProjectile, slingProjectile.target);
              const areaDamaged = state.enemies.every((enemy, index) => enemy.hp < startingHealth[index]);
              const slingModel = graphics3D.towerMeshes.get(slingTower);
              const slingPathWorks = slingTower.specialization === "slingshooters" && slingStats.splash === 72 && slingStats.cooldown > unbranchedLevelThree.cooldown && Boolean(slingModel?.userData.slingshot) && slingModel.userData.slingWorkers.length === 3 && projectileRendered && areaDamaged;

              return riflePathWorks && slingPathWorks;
            } catch (error) {
              return "Archer path error: " + (error.stack || error.message);
            }
          })(),
          ballistaFlame: (() => {
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "ballista";
              placeTower(1, 1);
              const ballista = state.towers[0];
              upgradeTower();
              upgradeTower();
              spawnEnemy("ogre");
              const target = state.enemies[0];
              target.x = ballista.x + 120;
              target.y = ballista.y;
              target.speed = 0;
              target.physicalResistance = 0;
              const startingHealth = target.hp;
              ballista.cooldown = 0;
              update(.01);
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const projectile = state.projectiles.find(item => item.variant === "flamingBolt");
              const projectileModel = projectile ? graphics3D.projectileMeshes.get(projectile) : null;
              if (projectile) hitEnemy(projectile, target);
              const impactFire = state.particles.some(particle => particle.color === "#ff5b20") && state.particles.some(particle => particle.color === "#ffd35a");
              const damageCorrect = Math.abs(startingHealth - target.hp - towerStats(ballista).damage) < .001;
              return ballista.level === 3 && projectile?.damageType === "physical" && projectileModel?.userData.flamingBolt === true && projectileModel.userData.fireLight.intensity > 0 && impactFire && damageCorrect;
            } catch (error) {
              return "Ballista flame error: " + (error.stack || error.message);
            }
          })(),
          vampireDrain: (() => {
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "vampire";
              placeTower(1, 1);
              const vampire = state.towers[0];
              spawnEnemy("ogre");
              spawnEnemy("ogre");
              const victim = state.enemies[0];
              const bystander = state.enemies[1];
              victim.x = vampire.x + 95;
              victim.y = vampire.y;
              victim.pathIndex = 10;
              victim.speed = 0;
              bystander.x = vampire.x + 103;
              bystander.y = vampire.y + 5;
              bystander.pathIndex = 2;
              bystander.speed = 0;
              const victimHealth = victim.hp;
              const bystanderHealth = bystander.hp;
              vampire.cooldown = 0;
              update(.01);
              const bloodParticle = state.particles.find(particle => particle.kind === "bloodDrain");
              const inwardFlow = bloodParticle && (vampire.x - bloodParticle.x) * bloodParticle.vx + (vampire.y - bloodParticle.y) * bloodParticle.vy > 0;
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const vampireModel = graphics3D.towerMeshes.get(vampire);
              const bloodMesh = bloodParticle ? graphics3D.particleMeshes.get(bloodParticle) : null;
              const cubicBloodDrops = bloodMesh?.geometry?.type === "BoxGeometry";
              const slickBackHair = vampireModel?.userData.vampireSlickHair?.children.length >= 5;
              return victim.hp < victimHealth && bystander.hp === bystanderHealth && victim.lastDamageType === "magic" && Math.abs(towerStats(vampire).damage - 72) < .001 && vampire.bloodDrainTimer > .8 && inwardFlow && cubicBloodDrops && slickBackHair && Boolean(vampireModel?.userData.vampireBody) && vampireModel.userData.vampireBloodOrb.visible;
            } catch (error) {
              return "Vampire drain error: " + (error.stack || error.message);
            }
          })(),
          vampirePaths: (() => {
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "vampire";
              placeTower(1, 1);
              const bloodstorm = state.towers[0];
              upgradeTower();
              upgradeTower();
              for (let index = 0; index < 6; index++) {
                spawnEnemy("ogre");
                const enemy = state.enemies[index];
                enemy.x = bloodstorm.x + 82 + index * 7;
                enemy.y = bloodstorm.y;
                enemy.pathIndex = 12 - index;
                enemy.speed = 0;
              }
              const beforeStorm = state.enemies.map(enemy => enemy.hp);
              bloodstorm.cooldown = 0;
              update(.01);
              const damagedByStorm = state.enemies.filter((enemy, index) => enemy.hp < beforeStorm[index]).length;
              const bloodstormWorks = bloodstorm.level === 3 && bloodstorm.specialization === "bloodstorm" && towerStats(bloodstorm).drainCount === 5 && damagedByStorm === 5 && bloodstorm.bloodDrainTargets.length === 5;

              resetGame();
              state.gold = 9999;
              state.selectedBuild = "vampire";
              placeTower(1, 1);
              const nightspawn = state.towers[0];
              upgradeTower();
              chooseNightspawnPath();
              spawnEnemy("goblin");
              const victim = state.enemies[0];
              victim.x = nightspawn.x + 85;
              victim.y = nightspawn.y;
              victim.pathIndex = 10;
              victim.speed = 0;
              victim.hp = 1;
              nightspawn.cooldown = 0;
              update(.01);
              const minion = state.knights[0];
              const raisedCorrectly = state.knights.length === 1 && minion?.unitType === "vampireMinion" && minion.hp === 300 && minion.maxHp === 300 && minion.alive && !minion.expired;

              spawnEnemy("ogre");
              const combatTarget = state.enemies[0];
              combatTarget.x = minion.x;
              combatTarget.y = minion.y;
              combatTarget.pathIndex = 10;
              combatTarget.speed = 0;
              combatTarget.hp = 500;
              combatTarget.maxHp = 500;
              combatTarget.physicalResistance = 0;
              minion.target = combatTarget;
              minion.attackCooldown = 0;
              updateKnights(.01);
              const exactDamage = combatTarget.hp === 410;
              combatTarget.hp = 1;
              minion.attackCooldown = 0;
              updateKnights(.01);
              const noRecursiveRaising = state.knights.length === 1;
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const minionModel = graphics3D.knightMeshes.get(minion);
              const minionBar = graphics3D.knightBars.get(minion);
              const minionRendered = Boolean(minionModel?.userData.vampireMinion) && Boolean(minionBar?.userData.friendly);
              defeatKnight(minion);
              const deathIsPermanent = minion.expired && !minion.alive;
              const survivingMinion = raiseVampireMinion(nightspawn, { x: nightspawn.x + 20, y: nightspawn.y + 10 });
              state.enemies = [];
              state.spawnQueue = [];
              state.waveActive = true;
              update(.01);
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const clearedAfterWave = !state.knights.some(unit => unit.unitType === "vampireMinion") && !graphics3D.knightMeshes.has(survivingMinion) && nightspawn.minionsRaised === 0;
              return bloodstormWorks && nightspawn.level === 3 && nightspawn.specialization === "nightspawn" && raisedCorrectly && exactDamage && noRecursiveRaising && minionRendered && deathIsPermanent && clearedAfterWave;
            } catch (error) {
              return "Vampire path error: " + (error.stack || error.message);
            }
          })(),
          ghostFear: (() => {
            try {
            resetGame();
            state.gold = 9999;
            state.selectedBuild = "ghost";
            placeTower(1, 1);
            const ghost = state.towers.find(tower => tower.type === "ghost");
            for (let index = 0; index < 3; index++) {
              spawnEnemy(index === 0 ? "skeleton" : "goblin");
              const enemy = state.enemies[state.enemies.length - 1];
              enemy.x = 92 + index * 9;
              enemy.y = pathPoints[1].y;
              enemy.pathIndex = 2;
            }
            ghost.cooldown = 0;
            update(.01);
            const feared = state.enemies.length === 3 && state.enemies.every(enemy => enemy.fearTimer > 1.9);
            const attackPositions = state.enemies.map(enemy => enemy.x);
            update(.5);
            const reversed = state.enemies.every((enemy, index) => enemy.x < attackPositions[index]);
            for (let index = 0; index < 160; index++) update(.01);
            const resumePositions = state.enemies.map(enemy => enemy.x);
            update(.2);
            const resumed = state.enemies.every((enemy, index) => enemy.fearTimer === 0 && enemy.x > resumePositions[index]);
            const cooldownActive = state.enemies.every(enemy => enemy.fearCooldown > 3.6 && enemy.fearCooldown <= 4);
            ghost.cooldown = 0;
            update(.01);
            const resistedRepeatFear = state.enemies.every(enemy => enemy.fearTimer === 0);
            fearEnemy(state.enemies[0], 2);
            graphics3D.render(state, hoverCell, canPlace, towerStats);
            const rendered = graphics3D.towerMeshes.has(ghost) && state.enemies.every(enemy => graphics3D.enemyMeshes.has(enemy));
            return feared && reversed && resumed && cooldownActive && resistedRepeatFear && ghost.enemiesFeared === 3 && rendered;
            } catch (error) {
              return "Ghost render error: " + (error.stack || error.message);
            }
          })(),
          damageTypes: (() => {
            resetGame();
            spawnEnemy("ogre");
            const enemy = state.enemies[0];
            const testOwner = { type: "archer", kills: 0 };
            const startingHp = enemy.hp;
            damageEnemy(enemy, 100, testOwner, "physical");
            const physicalDamage = startingHp - enemy.hp;
            enemy.hp = startingHp;
            damageEnemy(enemy, 100, testOwner, "magic");
            const magicDamage = startingHp - enemy.hp;
            return Math.abs(physicalDamage - 60) < .001 && Math.abs(magicDamage - 95) < .001 &&
              magicDamage > physicalDamage && towerTypes.mage.damageType === "magic" && towerTypes.ogre.damageType === "physical";
          })(),
          barracksPaths: (() => {
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "barracks";
              placeTower(1, 1);
              const graveTower = state.towers[0];
              upgradeTower();
              chooseGravestonePath();
              const graveStartsEmpty = graveTower.level === 3 && graveTower.specialization === "graveyard" && state.knights.length === 0;
              update(3.99);
              const waitsFourSeconds = state.knights.length === 0;
              update(.02);
              const firstZombie = state.knights.length === 1 && state.knights[0].unitType === "zombie";
              for (let index = 0; index < 7; index++) update(4.01);
              const reachesEight = state.knights.length === 8 && state.knights.every(unit => unit.unitType === "zombie");
              update(8);
              const respectsMaximum = state.knights.length === 8;
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const graveRendered = Boolean(graphics3D.towerMeshes.get(graveTower)?.userData.gravestone);
              const zombieModelsCorrect = state.knights.every(unit => {
                const model = graphics3D.knightMeshes.get(unit);
                return model && Math.abs(model.scale.x - .47) < .001 && !model.userData.sword;
              });

              resetGame();
              state.gold = 9999;
              state.selectedBuild = "barracks";
              placeTower(1, 1);
              const arenaTower = state.towers[0];
              upgradeTower();
              upgradeTower();
              const threeGladiators = arenaTower.level === 3 && arenaTower.specialization === "gladiators" && state.knights.length === 3 && state.knights.every(unit => unit.unitType === "gladiator");
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const arenaRendered = Boolean(graphics3D.towerMeshes.get(arenaTower)?.userData.gladiatorCamp) && state.knights.every(unit => graphics3D.knightMeshes.has(unit));
              const gladiatorsHalfSize = state.knights.every(unit => Math.abs(graphics3D.knightMeshes.get(unit).scale.x - .57) < .001);
              return graveStartsEmpty && waitsFourSeconds && firstZombie && reachesEight && respectsMaximum && graveRendered && zombieModelsCorrect && threeGladiators && arenaRendered && gladiatorsHalfSize;
            } catch (error) {
              return "Barracks path error: " + (error.stack || error.message);
            }
          })(),
          dragonFire: (() => {
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "barracks";
              placeTower(1, 1);
              upgradeTower();
              const units = [...state.knights];
              units.forEach((unit, index) => {
                unit.x = 96 + index * 5;
                unit.y = pathPoints[1].y;
                unit.hp = 500;
                unit.maxHp = 500;
                unit.attackCooldown = 10;
              });
              spawnEnemy("dragon");
              const dragon = state.enemies[0];
              dragon.x = 100;
              dragon.y = pathPoints[1].y;
              dragon.pathIndex = 2;
              dragon.speed = 0;
              dragon.fireBreathCooldown = 0;
              breatheDragonFire(dragon, units[0]);
              const quadrupleHealth = dragon.maxHp === 4320 && enemyTypes.dragon.hp === 4320;
              const exactAreaDamage = units.length === 3 && units.every(unit => unit.hp === 350);
              state.wave = 30;
              const damageBalance = Math.abs(enemyMeleeDamage({ type: "goblin" }) - 22.68) < .001 && enemyMeleeDamage({ type: "dragon" }) === 150 && enemyMeleeDamage({ type: "horseman" }) === 190 && enemyMeleeDamage({ type: "cyclops" }) === 240;
              const emittedFire = dragon.fireBreathTimer > .7 && state.particles.some(particle => particle.kind === "dragonFire");
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const flameRendered = graphics3D.enemyMeshes.get(dragon)?.userData.fireBreath?.visible === true;
              const works = quadrupleHealth && exactAreaDamage && damageBalance && emittedFire && flameRendered;
              return works || "Dragon balance mismatch: hp=" + units.map(unit => unit.hp).join(",") + " damage=" + enemyMeleeDamage({ type: "dragon" }) + "/" + enemyMeleeDamage({ type: "horseman" }) + "/" + enemyMeleeDamage({ type: "cyclops" }) + " health=" + quadrupleHealth + " fire=" + emittedFire + " rendered=" + flameRendered;
            } catch (error) {
              return "Dragon fire error: " + (error.stack || error.message);
            }
          })(),
          bossRoster: (() => {
            try {
              const milestoneBosses = [waves[9], waves[19], waves[29]].map(wave => wave.units.find(unit => enemyTypes[unit.type].boss)?.type);
              const rosterCorrect = milestoneBosses.join(",") === "dragon,horseman,cyclops";
              const healthOrdering = enemyTypes.horseman.hp > enemyTypes.dragon.hp && enemyTypes.cyclops.hp > enemyTypes.horseman.hp;
              const oversized = ["dragon", "horseman", "cyclops"].every(type => enemyTypes[type].modelScale > 1);

              resetGame();
              ["ogre", "dragon", "horseman", "cyclops"].forEach((type, index) => {
                spawnEnemy(type);
                const enemy = state.enemies[index];
                enemy.x = 120 + index * 55;
                enemy.y = 120;
                enemy.speed = 0;
              });
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const [normalOgre, dragon, horseman, cyclops] = state.enemies;
              const normalScale = graphics3D.enemyMeshes.get(normalOgre).scale.x;
              const dragonScale = graphics3D.enemyMeshes.get(dragon).scale.x;
              const horsemanScale = graphics3D.enemyMeshes.get(horseman).scale.x;
              const cyclopsScale = graphics3D.enemyMeshes.get(cyclops).scale.x;
              const modelOrdering = normalScale < dragonScale && dragonScale < horsemanScale && horsemanScale < cyclopsScale;
              const horsemanModel = graphics3D.enemyMeshes.get(horseman);
              const horseShape = horsemanModel?.userData.horseSkull?.scale.z > horsemanModel?.userData.horseSkull?.scale.x * 1.5 && horsemanModel?.userData.horseHooves?.length === 4 && horsemanModel.userData.horseHooves.every(hoof => hoof.geometry.parameters.width <= .14) && horsemanModel?.userData.horseEyeHoles?.length === 2;
              const distinctModels = horsemanModel?.userData.bossModel === "horseman" && Boolean(horsemanModel?.userData.phantomHorse) && horsemanModel?.userData.skeletonHorse === true && horseShape && horsemanModel?.userData.blueFlames?.length === 0 && Boolean(horsemanModel?.userData.halberd) && Boolean(horsemanModel?.userData.halberdBlade) && graphics3D.enemyMeshes.get(cyclops)?.userData.bossModel === "cyclops" && Boolean(graphics3D.enemyMeshes.get(cyclops)?.userData.cyclopsEye);
              const healthBarsGrow = graphics3D.enemyBars.get(dragon).scale.x < graphics3D.enemyBars.get(horseman).scale.x && graphics3D.enemyBars.get(horseman).scale.x < graphics3D.enemyBars.get(cyclops).scale.x;

              resetGame();
              state.gold = 9999;
              state.selectedBuild = "ogre";
              placeTower(1, 1);
              const ogreTower = state.towers[0];
              spawnEnemy("horseman");
              const bossTarget = state.enemies[0];
              bossTarget.x = ogreTower.x + 80;
              bossTarget.y = ogreTower.y;
              bossTarget.pathIndex = 2;
              bossTarget.speed = 0;
              const bossHealth = bossTarget.hp;
              ogreTower.cooldown = 0;
              update(.01);
              const throwImmune = !bossTarget.thrown && bossTarget.hp < bossHealth;

              resetGame();
              state.wave = 20;
              state.gold = 9999;
              state.selectedBuild = "barracks";
              placeTower(1, 1);
              const victim = state.knights[0];
              spawnEnemy("horseman");
              const attackingHorseman = state.enemies[0];
              attackingHorseman.x = victim.x;
              attackingHorseman.y = victim.y;
              attackingHorseman.pathIndex = 2;
              attackingHorseman.speed = 0;
              attackingHorseman.meleeCooldown = 0;
              victim.target = attackingHorseman;
              victim.attackCooldown = 10;
              update(.01);
              const halberdDealsDamage = !victim.alive && victim.hp === 0 && attackingHorseman.attackSwing > .4 && enemyMeleeDamage(attackingHorseman) === 190;
              update(.12);
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const attackModel = graphics3D.enemyMeshes.get(attackingHorseman);
              const halberdSwings = attackModel?.userData.halberd && attackModel.userData.horsemanRightArm.rotation.x < -.7;
              return rosterCorrect && healthOrdering && oversized && modelOrdering && distinctModels && healthBarsGrow && throwImmune && halberdDealsDamage && halberdSwings;
            } catch (error) {
              return "Boss roster error: " + (error.stack || error.message);
            }
          })(),
          campaignWaves: (() => {
            try {
              const bossWaves = waves
                .map((wave, index) => wave.units.some(unit => enemyTypes[unit.type].boss) ? index + 1 : null)
                .filter(Boolean);
              const bossScheduleCorrect = waves.length === 30 && bossWaves.join(",") === "10,20,30";
              const finish = pathPoints[pathPoints.length - 1];

              resetGame();
              spawnEnemy("goblin");
              const normalEnemy = state.enemies[0];
              normalEnemy.x = finish.x;
              normalEnemy.y = finish.y;
              normalEnemy.pathIndex = pathPoints.length - 1;
              normalEnemy.speed = 100;
              update(.01);
              const normalEnemyCostsOneLife = state.lives === 19 && !state.ended;

              resetGame();
              spawnEnemy("dragon");
              const boss = state.enemies[0];
              boss.x = finish.x;
              boss.y = finish.y;
              boss.pathIndex = pathPoints.length - 1;
              boss.speed = 100;
              update(.01);
              const bossBreachEndsRun = state.ended && state.lives === 0;

              return bossScheduleCorrect && normalEnemyCostsOneLife && bossBreachEndsRun;
            } catch (error) {
              return "Campaign wave error: " + (error.stack || error.message);
            }
          })(),
          merchantEscort: (() => {
            try {
              const bossPairs = [[9, "dragon"], [19, "horseman"], [29, "cyclops"]];
              const scheduledWithBosses = bossPairs.every(([waveIndex, bossType]) => {
                const units = waves[waveIndex].units;
                const bossIndex = units.findIndex(unit => unit.type === bossType);
                const merchantIndices = units.map((unit, index) => unit.type === "merchant" ? index : -1).filter(index => index >= 0);
                return merchantIndices.length === 1 && bossIndex >= 0 && merchantIndices[0] === bossIndex + 1;
              }) && waves.every((wave, index) => bossPairs.some(([bossWave]) => bossWave === index) || !wave.units.some(unit => unit.type === "merchant"));

              resetGame();
              state.gold = 9999;
              state.selectedBuild = "barracks";
              placeTower(1, 1);
              const knight = state.knights[0];
              spawnEnemy("merchant");
              const merchant = state.enemies[0];
              merchant.x = pathPoints[1].x;
              merchant.y = pathPoints[1].y;
              merchant.pathIndex = 2;
              knight.x = merchant.x;
              knight.y = merchant.y;
              knight.target = merchant;
              const startX = merchant.x;
              update(.1);
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const model = graphics3D.enemyMeshes.get(merchant);
              const bar = graphics3D.enemyBars.get(merchant);
              const ignoresBarracks = merchant.ignoresBarracks && knight.target !== merchant && !merchant.blocked && merchant.x > startX;
              const detailedModel = model?.userData.merchantModel === true && Boolean(model.userData.merchantPack) && model.userData.merchantPouches?.length === 2 && Boolean(model.userData.merchantCoin) && Boolean(model.userData.merchantPotion);

              state.wave = 9;
              updateUI();
              const previewShowsMerchant = document.querySelector("#wavePreview .enemy-pip.merchant")?.textContent === "$1";
              return scheduledWithBosses && ignoresBarracks && detailedModel && Number.isFinite(bar?.scale.x) && bar.scale.x > 0 && previewShowsMerchant;
            } catch (error) {
              return "Merchant escort error: " + (error.stack || error.message);
            }
          })(),
          merchantRelicStore: (() => {
            try {
              resetGame();
              state.gold = 2000;
              spawnEnemy("merchant");
              const merchant = state.enemies[0];
              merchant.hp = 1;
              const testOwner = { type: "archer", kills: 0 };
              damageEnemy(merchant, 10, testOwner, "physical");
              const shopOpensOnKill = state.storeOpen && !document.getElementById("merchantStoreModal").classList.contains("hidden") && document.querySelectorAll(".merchant-item-card").length === 5;
              Object.keys(merchantRelics).forEach(type => buyMerchantRelic(type));
              const purchasesWork = state.inventory.length === 5 && state.merchantStoreStock.length === 0 && document.querySelectorAll(".merchant-item-card:disabled").length === 5;
              closeMerchantStore();

              state.selectedBuild = "archer";
              placeTower(1, 1);
              const archer = state.towers[0];
              const baseStats = towerStats(archer);
              state.selectedRelic = "sword";
              const swordEquipped = equipSelectedRelic(archer);
              state.selectedRelic = "amulet";
              const amuletEquipped = equipSelectedRelic(archer);
              state.selectedRelic = "boots";
              const bootsEquipped = equipSelectedRelic(archer);
              const relicStats = towerStats(archer);
              state.selectedRelic = "shield";
              const fourthRejected = !equipSelectedRelic(archer) && archer.items.length === 3 && state.inventory.includes("shield");
              const threeSlotUi = document.getElementById("equippedRelicCount").textContent === "3 / 3" && document.querySelectorAll("#equippedRelics .filled").length === 3;
              const universalBonusesWork = Math.abs(relicStats.damage / baseStats.damage - 1.25) < .001 && Math.abs(relicStats.range / baseStats.range - 1.2) < .001 && Math.abs(relicStats.cooldown / baseStats.cooldown - .82) < .001;

              resetGame();
              state.gold = 9999;
              state.selectedBuild = "barracks";
              placeTower(1, 1);
              const barracks = state.towers[0];
              state.inventory.push("shield");
              state.selectedRelic = "shield";
              const shieldEquipped = equipSelectedRelic(barracks);
              const shieldBoostsTroops = shieldEquipped && state.knights.every(unit => unit.maxHp === 94);

              resetGame();
              state.gold = 9999;
              state.selectedBuild = "mine";
              placeTower(1, 1);
              const mine = state.towers[0];
              hireWorker();
              state.inventory.push("ring");
              state.selectedRelic = "ring";
              const ringEquipped = equipSelectedRelic(mine);
              const beforeProduction = state.gold;
              state.waveActive = true;
              state.spawnQueue = [{ type: "goblin", gap: 999 }];
              state.spawnTimer = 999;
              update(12.01);
              const ringBoostsMine = ringEquipped && state.gold - beforeProduction === 3 && mine.goldMined === 3;

              resetGame();
              spawnEnemy("merchant");
              const escapedMerchant = state.enemies[0];
              const finish = pathPoints[pathPoints.length - 1];
              escapedMerchant.x = finish.x;
              escapedMerchant.y = finish.y;
              escapedMerchant.pathIndex = pathPoints.length - 1;
              escapedMerchant.speed = 100;
              update(.01);
              const escapeGivesNoShop = escapedMerchant.reached && !state.storeOpen && document.getElementById("merchantStoreModal").classList.contains("hidden");

              return shopOpensOnKill && purchasesWork && swordEquipped && amuletEquipped && bootsEquipped && fourthRejected && threeSlotUi && universalBonusesWork && shieldBoostsTroops && ringBoostsMine && escapeGivesNoShop;
            } catch (error) {
              return "Merchant relic store error: " + (error.stack || error.message);
            }
          })(),
          incomeScaling: (() => {
            try {
              resetGame();
              const startingGoldUnchanged = state.gold === 250;
              const quarterPayouts = [awardGold(1), awardGold(1), awardGold(1), awardGold(1)];
              const fractionsCarryForward = quarterPayouts.join(",") === "0,0,0,1" && state.gold === 251 && state.goldIncomeRemainder === 0;

              resetGame();
              spawnEnemy("goblin");
              const rewardTarget = state.enemies[0];
              rewardTarget.hp = 1;
              const rewardOwner = { type: "archer", kills: 0 };
              damageEnemy(rewardTarget, 10, rewardOwner, "physical");
              const killRewardQuarter = state.gold === 252;

              resetGame();
              state.gold = 9999;
              state.selectedBuild = "mine";
              placeTower(1, 1);
              const mine = state.towers[0];
              hireWorker();
              const preProductionGold = state.gold;
              state.waveActive = true;
              state.spawnQueue = [{ type: "goblin", gap: 999 }];
              state.spawnTimer = 999;
              update(6.01);
              const mineQuarter = state.gold - preProductionGold === 1 && mine.goldMined === 1;

              resetGame();
              state.wave = 1;
              state.waveActive = true;
              update(.01);
              const waveBonusRestored = state.gold === 271 && state.goldIncomeRemainder === 0;
              return GOLD_INCOME_RATE === .25 && startingGoldUnchanged && fractionsCarryForward && killRewardQuarter && mineQuarter && waveBonusRestored;
            } catch (error) {
              return "Income scaling error: " + (error.stack || error.message);
            }
          })(),
          themedEvents: (() => {
            try {
              const eventWaves = Object.keys(waveEvents).map(Number);
              const cadenceCorrect = eventWaves.join(",") === "6,12,18,24,30";
              const eventTypes = eventWaves.map(wave => waveEvents[wave].type);
              const miniBossTypes = eventWaves.map(wave => waveEvents[wave].bossType);
              const themesCorrect = eventTypes.join(",") === "pirate,werewolf,viking,wraith,demon";
              const bossesCorrect = miniBossTypes.join(",") === "davyjones,moonalpha,longship,covenwitch,riftlord" && miniBossTypes.every(type => enemyTypes[type].miniBoss);
              const allHaveFloods = eventWaves.every(wave => {
                const event = waveEvents[wave];
                return event.units.filter(unit => unit.type === event.type).length >= 14 && event.units.filter(unit => unit.type === event.bossType).length === 1;
              });

              resetGame();
              state.wave = 5;
              updateUI();
              const previewWorks = document.querySelector("#nextWaveText").textContent.includes("Pirate Raid") &&
                document.querySelector("#wavePreview .event-marker")?.textContent === "EVENT" &&
                document.querySelector("#wavePreview .enemy-pip.pirate")?.textContent === "P14" &&
                document.querySelector("#wavePreview .enemy-pip.davyjones")?.textContent === "DJ1";
              const normalCount = waves[5].units.length;
              startWave();
              const queueCombined = state.activeEvent?.name === "Pirate Raid" && state.spawnQueue.length === normalCount + 15 &&
                state.spawnQueue[2]?.type === "pirate" && state.spawnQueue.some(unit => unit.type === "ogre") && state.spawnQueue.some(unit => unit.type === "davyjones");

              resetGame();
              eventTypes.forEach((type, index) => {
                spawnEnemy(type);
                const enemy = state.enemies[index];
                enemy.x = 120 + index * 55;
                enemy.y = 120;
                enemy.speed = 0;
              });
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const modelsRendered = state.enemies.every(enemy => {
                const model = graphics3D.enemyMeshes.get(enemy);
                const bar = graphics3D.enemyBars.get(enemy);
                return model?.userData.eventModel === enemy.type && Number.isFinite(bar?.scale.x) && bar.scale.x > 0;
              });

              resetGame();
              miniBossTypes.forEach((type, index) => {
                spawnEnemy(type);
                const enemy = state.enemies[index];
                enemy.x = 120 + index * 65;
                enemy.y = 120;
                enemy.speed = 0;
              });
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const miniBossModelsRendered = state.enemies.every(enemy => {
                const model = graphics3D.enemyMeshes.get(enemy);
                const bar = graphics3D.enemyBars.get(enemy);
                return enemy.isMiniBoss && !enemy.isBoss && model?.userData.miniBossModel === enemy.type && Number.isFinite(bar?.scale.x) && bar.scale.x > .8;
              });

              resetGame();
              state.wave = 23;
              spawnEnemy("covenwitch");
              const witch = state.enemies[0];
              witch.speed = 0;
              update(3.51);
              update(4.51);
              update(4.51);
              const witchSummons = witch.summonsRemaining === 0 && state.enemies.filter(enemy => enemy.type === "wraith").length === 6;

              resetGame();
              state.wave = 23;
              state.gold = 9999;
              state.selectedBuild = "barracks";
              placeTower(1, 1);
              const barracks = state.towers[0];
              const rangedVictims = [...state.knights];
              spawnEnemy("covenwitch");
              const rangedWitch = state.enemies[0];
              rangedWitch.x = barracks.x + 110;
              rangedWitch.y = barracks.y;
              rangedWitch.pathIndex = 2;
              rangedWitch.speed = 0;
              rangedWitch.rangedCooldown = 0;
              rangedWitch.summonCooldown = 99;
              update(.01);
              const witchProjectile = state.projectiles.find(projectile => projectile.type === "witchMagic" && projectile.hostile);
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const projectileRendered = Boolean(witchProjectile && graphics3D.projectileMeshes.get(witchProjectile)?.userData.witchMagic);
              update(.6);
              const witchRangedArea = projectileRendered && !state.projectiles.includes(witchProjectile) && rangedVictims.length >= 2 && rangedVictims.every(unit => !unit.alive && unit.hp === 0);

              resetGame();
              state.gold = 9999;
              state.selectedBuild = "ogre";
              placeTower(1, 1);
              const ogreTower = state.towers[0];
              spawnEnemy("davyjones");
              const davy = state.enemies[0];
              davy.x = ogreTower.x + 80;
              davy.y = ogreTower.y;
              davy.pathIndex = 2;
              davy.speed = 0;
              const davyHealth = davy.hp;
              ogreTower.cooldown = 0;
              update(.01);
              const miniBossThrowImmune = !davy.thrown && davy.hp < davyHealth;

              resetGame();
              state.wave = 5;
              startWave();
              state.spawnQueue = [];
              state.enemies = [];
              update(.01);
              const eventClears = !state.waveActive && state.activeEvent === null;
              return cadenceCorrect && themesCorrect && bossesCorrect && allHaveFloods && previewWorks && queueCombined && modelsRendered && miniBossModelsRendered && witchSummons && witchRangedArea && miniBossThrowImmune && eventClears;
            } catch (error) {
              return "Themed event error: " + (error.stack || error.message);
            }
          })()
        })`);
        const ok = result.title === "Stonewatch Keep" && result.hasCanvas && result.hasThree &&
          result.hasGraphics && result.hasWheelZoom && result.hasCameraReset && result.towerCards >= 8 && result.menuModes === true && result.treeObstacles === true && result.archerVolley === true && result.archerPaths === true && result.ballistaFlame === true && result.vampireDrain === true && result.vampirePaths === true && result.ghostFear === true && result.damageTypes === true && result.barracksPaths === true && result.dragonFire === true && result.bossRoster === true && result.campaignWaves === true && result.merchantEscort === true && result.merchantRelicStore === true && result.incomeScaling === true && result.themedEvents === true;
        finishSmokeTest(ok ? 0 : 1, { ok, ...result });
      } catch (error) {
        finishSmokeTest(1, { ok: false, error: error.message });
      }
    });
  } else {
    mainWindow.once("ready-to-show", () => mainWindow.show());
  }

  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

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
          speedHotkey: (() => {
            resetGame();
            const speedButton = document.getElementById("speedButton");
            const pressSpace = (key, code = "") => window.dispatchEvent(new KeyboardEvent("keydown", { code, key, bubbles: true }));
            pressSpace(" ");
            const reachesTwo = state.speed === 2 && speedButton.textContent === "2×" && !state.waveActive;
            pressSpace("Spacebar");
            const reachesThree = state.speed === 3 && speedButton.textContent === "3×";
            pressSpace("Unidentified", "Space");
            const returnsToOne = state.speed === 1 && speedButton.textContent === "1×";
            speedButton.click();
            const buttonSharesCycle = state.speed === 2 && speedButton.textContent === "2×";
            resetGame();
            state.gameStarted = false;
            openMainMenu();
            return reachesTwo && reachesThree && returnsToOne && buttonSharesCycle;
          })(),
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
                return units.some(unit => unit.type === bossType) && !units.some(unit => unit.type === "merchant");
              });
              const loopedThemes = [[36, "pirate"], [42, "werewolf"], [48, "viking"], [54, "wraith"], [60, "demon"]].every(([waveNumber, type]) => {
                const event = getWaveEvent(waveNumber, "endless");
                return event?.type === type && event.units.filter(unit => unit.type === "merchant").length === 1;
              });
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
          supportCastle: (() => {
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "castle";
              placeTower(6, 5);
              const firstCastle = state.towers[0];
              state.selectedBuild = "archer";
              placeTower(7, 5);
              const archer = state.towers[1];
              const oneAuraStats = towerStats(archer);

              state.selectedBuild = "castle";
              placeTower(7, 6);
              const twoAuraStats = towerStats(archer);
              state.selectedBuild = "mage";
              placeTower(1, 1);
              const distantMage = state.towers[3];
              const distantStats = towerStats(distantMage);

              showInspectPanel(firstCastle);
              const castleUi = document.getElementById("selectedName").textContent === "Tiny Castle" &&
                document.getElementById("damageStat").textContent.includes("+20%") &&
                document.getElementById("specialStat").textContent.includes("1 adjacent defense");

              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const castleModel = graphics3D.towerMeshes.get(firstCastle);
              const archerModel = graphics3D.towerMeshes.get(archer);
              const mageModel = graphics3D.towerMeshes.get(distantMage);
              const modelWorks = Boolean(castleModel?.userData.tinyCastle && castleModel.userData.castleAura && archerModel?.userData.castleBuffAura?.visible && !mageModel?.userData.castleBuffAura?.visible);
              const exactBuff = Math.abs(oneAuraStats.damage - 20.16) < .001 && oneAuraStats.range === 174 && Math.abs(oneAuraStats.cooldown - 1.125) < .001;
              const doesNotStack = Math.abs(twoAuraStats.damage - oneAuraStats.damage) < .001 && Math.abs(twoAuraStats.range - oneAuraStats.range) < .001 && Math.abs(twoAuraStats.cooldown - oneAuraStats.cooldown) < .001;
              const distantUnchanged = distantStats.damage === 35 && distantStats.range === 128 && distantStats.cooldown === 1.15;
              const supportRules = towerTypes.castle.cost === 225 && upgradeCost(firstCastle) === null && tinyCastleBuffedTowers(firstCastle).length === 1 && document.querySelector('[data-tower="castle"]');
              return exactBuff && doesNotStack && distantUnchanged && supportRules && castleUi && modelWorks;
            } catch (error) {
              return "Tiny Castle error: " + (error.stack || error.message);
            }
          })(),
          ufoDefense: (() => {
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "ufo";
              placeTower(1, 1);
              const ufo = state.towers[0];
              const placementWorks = ufo?.type === "ufo" && ufo.spent === 400 && state.gold === 9599 && placementCost("ufo") === 440;
              const stats = towerStats(ufo);
              const rapidMagicStats = stats.damage === 24 && stats.range === 185 && stats.cooldown === .3 && towerTypes.ufo.damageType === "magic" && upgradeCost(ufo) === 560;

              spawnEnemy("goblin");
              const target = state.enemies[0];
              target.x = ufo.x + 100;
              target.y = ufo.y;
              target.speed = 0;
              target.hp = target.maxHp = 100;
              ufo.cooldown = 0;
              update(.01);
              const laser = state.projectiles.find(projectile => projectile.owner === ufo);
              const laserFired = laser?.variant === "ufoLaser" && laser.color === "#52ff78" && laser.damage === 24 && laser.damageType === "magic" && laser.speed === 1100;

              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const ufoModel = graphics3D.towerMeshes.get(ufo);
              const laserModel = laser && graphics3D.projectileMeshes.get(laser);
              const visualsWork = Boolean(ufoModel?.userData.ufoBody && ufoModel.userData.ufoLights?.length === 10 && ufoModel.userData.ufoGlow && laserModel?.userData.ufoLaser);

              const hpBefore = target.hp;
              hitEnemy(laser, target);
              const laserDamages = target.hp === hpBefore - 24;
              showInspectPanel(ufo);
              const ufoUi = document.getElementById("selectedName").textContent === "Alien UFO" && document.getElementById("damageStat").textContent === "24" && document.getElementById("speedStat").textContent === "0.30s" && Boolean(document.querySelector('[data-tower="ufo"]'));
              return placementWorks && rapidMagicStats && laserFired && visualsWork && laserDamages && ufoUi;
            } catch (error) {
              return "Alien UFO error: " + (error.stack || error.message);
            }
          })(),
          ufoPaths: (() => {
            try {
              resetGame();
              state.gold = 99999;
              state.selectedBuild = "ufo";
              placeTower(1, 1);
              const twin = state.towers[0];
              upgradeTower();
              const pathCost = upgradeCost(twin);
              chooseTwinLaserPath();
              spawnEnemy("goblin");
              const twinTarget = state.enemies[0];
              twinTarget.x = twin.x + 100;
              twinTarget.y = twin.y;
              twinTarget.speed = 0;
              twinTarget.hp = twinTarget.maxHp = 1000;
              twin.cooldown = 0;
              update(.01);
              const twinShots = state.projectiles.filter(projectile => projectile.owner === twin);
              const twinWorks = twin.level === 3 && twin.specialization === "twinlaser" && twinShots.some(projectile => projectile.variant === "ufoLaser" && projectile.color === "#52ff78") && twinShots.some(projectile => projectile.variant === "ufoLaserRed" && projectile.color === towerTypes.ufo.twinLaserColor);

              resetGame();
              state.gold = 99999;
              state.selectedBuild = "ufo";
              placeTower(1, 1);
              const massive = state.towers[0];
              upgradeTower();
              chooseMassiveBeamPath();
              spawnEnemy("goblin");
              spawnEnemy("goblin");
              const massiveTarget = state.enemies[0];
              const splashTarget = state.enemies[1];
              massiveTarget.x = massive.x + 100;
              massiveTarget.y = massive.y;
              splashTarget.x = massiveTarget.x + 50;
              splashTarget.y = massiveTarget.y;
              massiveTarget.speed = splashTarget.speed = 0;
              massiveTarget.hp = massiveTarget.maxHp = 1000;
              splashTarget.hp = splashTarget.maxHp = 1000;
              massive.cooldown = 0;
              update(.01);
              const massiveProjectile = state.projectiles.find(projectile => projectile.owner === massive);
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const massiveModel = massiveProjectile && graphics3D.projectileMeshes.get(massiveProjectile);
              const beforeSplash = splashTarget.hp;
              hitEnemy(massiveProjectile, massiveTarget);
              const massiveWorks = massive.level === 3 && massive.specialization === "massivebeam" && towerStats(massive).splash === towerTypes.ufo.massiveSplash && towerStats(massive).damage > 150 && massiveProjectile?.variant === "ufoMassiveLaser" && massiveModel?.userData.massiveLaser && splashTarget.hp < beforeSplash;
              showInspectPanel(massive);
              const ufoUi = document.getElementById("selectedName").textContent === "Massive-Beam UFO" && document.getElementById("specialStat").textContent.includes("105 area splash");
              return pathCost === 780 && twinWorks && massiveWorks && ufoUi;
            } catch (error) {
              return "Alien UFO paths error: " + (error.stack || error.message);
            }
          })(),
          bossSummons: (() => {
            try {
              resetGame();
              spawnEnemy("dragon");
              const dragon = state.enemies[0];
              dragon.speed = 0;
              update(15.01);
              const dragonMinions = state.enemies.filter(enemy => enemy.isBossMinion);
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const dragonMinionModel = graphics3D.enemyMeshes.get(dragonMinions[0]);
              const dragonModel = graphics3D.enemyMeshes.get(dragon);
              const waveBossWorks = dragonMinions.length === 5 && dragonMinions.every(minion => !minion.isBoss && !minion.isMiniBoss && minion.reward === 0 && Math.abs(minion.maxHp - dragon.maxHp * .05) < .001 && Math.abs(enemyMeleeDamage(minion) - 7.5) < .001) && dragonMinionModel?.scale.x < dragonModel?.scale.x;

              resetGame();
              spawnEnemy("davyjones");
              const eventBoss = state.enemies[0];
              eventBoss.speed = 0;
              update(15.01);
              const eventMinions = state.enemies.filter(enemy => enemy.isBossMinion);
              const eventBossWorks = eventMinions.length === 5 && eventBoss.isMiniBoss && eventMinions.every(minion => Math.abs(minion.maxHp - eventBoss.maxHp * .05) < .001);
              return enemyTypes.dragon.bossSummonInterval === 15 && enemyTypes.dragon.bossSummonCount === 5 && enemyTypes.dragon.bossSummonScale === .05 && waveBossWorks && eventBossWorks;
            } catch (error) {
              return "Boss summon error: " + (error.stack || error.message);
            }
          })(),
          bossBarracksRetaliation: (() => {
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "barracks";
              placeTower(1, 1);
              const barracks = state.towers[0];
              const troops = state.knights.filter(unit => unit.owner === barracks);
              spawnEnemy("dragon");
              const boss = state.enemies[0];
              boss.x = barracks.x;
              boss.y = barracks.y;
              troops.forEach(unit => {
                unit.x = boss.x;
                unit.y = boss.y;
                unit.target = boss;
                unit.attackCooldown = 99;
              });
              const startX = boss.x;
              const startY = boss.y;
              update(.05);
              const ignoresBeforeAttack = bossIgnoresBarracks(boss) && !boss.blocked && Math.hypot(boss.x - startX, boss.y - startY) > 0;

              troops.forEach(unit => {
                unit.x = boss.x;
                unit.y = boss.y;
                unit.target = boss;
                unit.attackCooldown = 99;
              });
              troops[0].attackCooldown = 0;
              const hpBeforeRetaliation = boss.hp;
              update(.01);
              const retaliatesAfterHit = boss.hp < hpBeforeRetaliation && boss.barracksProvoked && !bossIgnoresBarracks(boss) && boss.blocked;

              spawnEnemy("davyjones");
              const eventBoss = state.enemies.at(-1);
              const miniBossStartsUnprovoked = bossIgnoresBarracks(eventBoss);
              damageEnemy(eventBoss, 1, barracks, "physical", troops[0]);
              const miniBossCanBeProvoked = eventBoss.barracksProvoked && !bossIgnoresBarracks(eventBoss);
              return ignoresBeforeAttack && retaliatesAfterHit && miniBossStartsUnprovoked && miniBossCanBeProvoked;
            } catch (error) {
              return "Boss Barracks retaliation error: " + (error.stack || error.message);
            }
          })(),
          monsterIndex: (() => {
            const savedDiscoveries = localStorage.getItem(MONSTER_INDEX_STORAGE_KEY);
            try {
              localStorage.removeItem(MONSTER_INDEX_STORAGE_KEY);
              discoveredMonsters.clear();
              renderMonsterIndex();
              resetGame("campaign");
              const startsEmpty = document.getElementById("monsterIndexGrid").classList.contains("hidden") && !document.getElementById("monsterIndexEmpty").classList.contains("hidden");

              spawnEnemy("goblin");
              const discoveryRecorded = discoveredMonsters.has("goblin") && document.getElementById("monsterIndexCount").textContent === "1/18";
              resetGame("campaign");
              const survivesNewBattle = discoveredMonsters.has("goblin");

              openMonsterIndex();
              const goblinCard = document.querySelector('[data-monster="goblin"]');
              const cardText = goblinCard?.textContent || "";
              const displaysStats = cardText.includes("Goblin") && cardText.includes("Base health") && cardText.includes("48") && cardText.includes("Physical resistance") && cardText.includes("Magic resistance");
              state.elapsed = 10;
              update(.5);
              const pausesSimulation = state.monsterIndexOpen && state.elapsed === 10 && !document.getElementById("monsterIndexModal").classList.contains("hidden");
              closeMonsterIndex();
              const closesCleanly = !state.monsterIndexOpen && document.getElementById("monsterIndexModal").classList.contains("hidden");
              const saved = JSON.parse(localStorage.getItem(MONSTER_INDEX_STORAGE_KEY) || "[]");
              const persistsToStorage = saved.includes("goblin");
              return startsEmpty && discoveryRecorded && survivesNewBattle && displaysStats && pausesSimulation && closesCleanly && persistsToStorage;
            } catch (error) {
              return "Monster Index error: " + (error.stack || error.message);
            } finally {
              if (savedDiscoveries === null) localStorage.removeItem(MONSTER_INDEX_STORAGE_KEY);
              else localStorage.setItem(MONSTER_INDEX_STORAGE_KEY, savedDiscoveries);
              discoveredMonsters.clear();
              try {
                const restored = JSON.parse(savedDiscoveries || "[]");
                if (Array.isArray(restored)) restored.filter(type => enemyTypes[type]).forEach(type => discoveredMonsters.add(type));
              } catch (_error) {}
              closeMonsterIndex();
              renderMonsterIndex();
              resetGame("campaign");
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
            return towerTypes.archer.damage === 16.8 && archers.volleyShotsRemaining === 0 && archers.archerShotTimers[2] > 0 && hillRendered;
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
              const riflePathWorks = rifleTower.specialization === "riflemen" && Math.abs(rifleStats.damage - 95.45613) < .001 && rifleStats.cooldown > unbranchedLevelThree.cooldown && Boolean(rifleProjectile) && Boolean(rifleModel?.userData.rifleSquad) && rifleModel.userData.riflemen.length === 3;

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
              const slingPathWorks = slingTower.specialization === "slingshooters" && slingStats.damage === 120 && slingStats.splash === 72 && slingStats.cooldown > unbranchedLevelThree.cooldown && Boolean(slingModel?.userData.slingshot) && slingModel.userData.slingWorkers.length === 3 && projectileRendered && areaDamaged;

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
              const firstUpgradeDiscounted = towerTypes.ballista.upgradeCostMultiplier === .9 && upgradeCost(ballista) === 202;
              upgradeTower();
              const finalUpgradeDiscounted = upgradeCost(ballista) === 281;
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
              return firstUpgradeDiscounted && finalUpgradeDiscounted && ballista.level === 3 && projectile?.damageType === "physical" && projectileModel?.userData.flamingBolt === true && projectileModel.userData.fireLight.intensity > 0 && impactFire && damageCorrect;
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
            const fearScales = [1, 2, 3].map(level => towerStats({ type: "ghost", level, specialization: null }).fearCount);
            for (let index = 0; index < 3; index++) {
              spawnEnemy(index === 0 ? "skeleton" : "goblin");
              const enemy = state.enemies[state.enemies.length - 1];
              enemy.x = 92 + index * 9;
              enemy.y = pathPoints[1].y;
              enemy.pathIndex = 2;
            }
            ghost.cooldown = 0;
            update(.01);
            const feared = state.enemies.length === 3 && state.enemies.filter(enemy => enemy.fearTimer > 1.9).length === 1;
            const fearedEnemy = state.enemies.find(enemy => enemy.fearTimer > 0);
            const attackPositions = state.enemies.map(enemy => enemy.x);
            update(.5);
            const reversed = fearedEnemy && fearedEnemy.x < attackPositions[state.enemies.indexOf(fearedEnemy)] && state.enemies.filter(enemy => enemy !== fearedEnemy).every(enemy => enemy.x >= attackPositions[state.enemies.indexOf(enemy)]);
            for (let index = 0; index < 160; index++) update(.01);
            const resumePositions = state.enemies.map(enemy => enemy.x);
            update(.2);
            const fearedIndex = state.enemies.indexOf(fearedEnemy);
            const resumed = fearedEnemy && fearedEnemy.fearTimer === 0 && fearedEnemy.x > resumePositions[fearedIndex];
            const cooldownActive = fearedEnemy && fearedEnemy.fearCooldown > 3.6 && fearedEnemy.fearCooldown <= 4;
            ghost.cooldown = 99;
            update(.01);
            const resistedRepeatFear = fearedEnemy && fearedEnemy.fearTimer === 0;
            fearEnemy(fearedEnemy, 2);
            graphics3D.render(state, hoverCell, canPlace, towerStats);
            const rendered = graphics3D.towerMeshes.has(ghost) && state.enemies.every(enemy => graphics3D.enemyMeshes.has(enemy));

            resetGame();
            state.gold = 9999;
            state.selectedBuild = "ghost";
            placeTower(1, 1);
            const bossGhost = state.towers.find(tower => tower.type === "ghost");
            spawnEnemy("dragon");
            const boss = state.enemies[0];
            boss.x = bossGhost.x + 80;
            boss.y = bossGhost.y;
            boss.speed = 0;
            bossGhost.cooldown = 0;
            update(.01);
            const bossFeared = boss.fearTimer > 1.9;
            for (let index = 0; index < 205; index++) update(.01);
            const bossCooldownActive = boss.fearCooldown > 7.9 && boss.fearCooldown <= 8;
            bossGhost.cooldown = 0;
            update(.01);
            const bossResisted = boss.fearTimer === 0;
            return fearScales.join(",") === "1,2,3" && feared && reversed && resumed && cooldownActive && resistedRepeatFear && ghost.enemiesFeared === 1 && rendered && bossFeared && bossCooldownActive && bossResisted;
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
          combatBalance: (() => {
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "mage";
              placeTower(1, 1);
              const wizard = state.towers[0];
              const wizardCostsScale = towerTypes.mage.cost === 130 && towerTypes.mage.upgradeCostMultiplier === .9 && upgradeCost(wizard) === 164;
              upgradeTower();
              const finalWizardUpgradeScales = wizard.level === 2 && upgradeCost(wizard) === 228;
              chooseFrostPath();
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const wizardModel = graphics3D.towerMeshes.get(wizard);
              const frostRobesRendered = wizard.specialization === "frost" && wizardModel?.userData.wizardRobePieces?.length >= 7 && wizardModel.userData.wizardRobePieces.every(piece => piece.material === graphics3D.mat.frostCloth);

              spawnEnemy("skeleton");
              const skeleton = state.enemies[0];
              const testOwner = { type: "archer", kills: 0 };
              skeleton.hp = 100;
              damageEnemy(skeleton, 40, testOwner, "physical");
              const physicalDamage = 100 - skeleton.hp;
              skeleton.hp = 100;
              damageEnemy(skeleton, 40, testOwner, "magic");
              const magicDamage = 100 - skeleton.hp;

              return towerTypes.ballista.damage === 120 && towerTypes.mage.damage === 35 && wizardCostsScale && finalWizardUpgradeScales && frostRobesRendered &&
                enemyTypes.skeleton.physicalResistance === 0 && enemyTypes.skeleton.magicResistance === .25 &&
                physicalDamage === 40 && magicDamage === 30;
            } catch (error) {
              return "Combat balance error: " + (error.stack || error.message);
            }
          })(),
          placementScaling: (() => {
            try {
              resetGame();
              state.gold = 9999;
              const startingGold = state.gold;
              state.selectedBuild = "ogre";
              const firstCost = placementCost("ogre");
              placeTower(1, 1);
              const firstOgre = state.towers[0];
              const secondCost = placementCost("ogre");
              state.selectedBuild = "ogre";
              placeTower(3, 1);
              const secondOgre = state.towers[1];
              const thirdCost = placementCost("ogre");
              const displayedCost = document.querySelector('[data-tower="ogre"] .tower-cost').textContent;
              state.selectedTower = secondOgre;
              sellTower();

              return REPEAT_PLACEMENT_MULTIPLIER === 1.1 && towerTypes.ogre.damage === 200 && firstCost === 150 && secondCost === 165 && thirdCost === 182 &&
                firstOgre.spent === firstCost && secondOgre.spent === secondCost &&
                startingGold - firstOgre.spent - secondOgre.spent + Math.round(secondOgre.spent * .65) === state.gold &&
                placementCost("ogre") === thirdCost && displayedCost === String(thirdCost) && placementCost("mage") === towerTypes.mage.cost;
            } catch (error) {
              return "Placement scaling error: " + (error.stack || error.message);
            }
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
              const balancedHealth = dragon.maxHp === 2160 && enemyTypes.dragon.hp === 2160;
              const exactAreaDamage = units.length === 3 && units.every(unit => unit.hp === 350);
              state.wave = 30;
              const damageBalance = Math.abs(enemyMeleeDamage({ type: "goblin" }) - 22.68) < .001 && enemyMeleeDamage({ type: "dragon" }) === 150 && enemyMeleeDamage({ type: "horseman" }) === 190 && enemyMeleeDamage({ type: "cyclops" }) === 240;
              const emittedFire = dragon.fireBreathTimer > .7 && state.particles.some(particle => particle.kind === "dragonFire");
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const flameRendered = graphics3D.enemyMeshes.get(dragon)?.userData.fireBreath?.visible === true;
              const works = balancedHealth && exactAreaDamage && damageBalance && emittedFire && flameRendered;
              return works || "Dragon balance mismatch: hp=" + units.map(unit => unit.hp).join(",") + " damage=" + enemyMeleeDamage({ type: "dragon" }) + "/" + enemyMeleeDamage({ type: "horseman" }) + "/" + enemyMeleeDamage({ type: "cyclops" }) + " health=" + balancedHealth + " fire=" + emittedFire + " rendered=" + flameRendered;
            } catch (error) {
              return "Dragon fire error: " + (error.stack || error.message);
            }
          })(),
          bossRoster: (() => {
            try {
              const milestoneBosses = [waves[9], waves[19], waves[29]].map(wave => wave.units.find(unit => enemyTypes[unit.type].boss)?.type);
              const rosterCorrect = milestoneBosses.join(",") === "dragon,horseman,cyclops";
              const healthOrdering = enemyTypes.dragon.hp === 2160 && enemyTypes.horseman.hp === 6480 && enemyTypes.cyclops.hp === 9720;
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
              damageEnemy(attackingHorseman, 1, state.towers[0], "physical", victim);
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
              const eventPairs = [[6, "davyjones"], [12, "moonalpha"], [18, "longship"], [24, "covenwitch"], [30, "riftlord"]];
              const scheduledWithEvents = eventPairs.every(([waveNumber, bossType]) => {
                const units = waveEvents[waveNumber].units;
                const bossIndex = units.findIndex(unit => unit.type === bossType);
                const merchantIndices = units.map((unit, index) => unit.type === "merchant" ? index : -1).filter(index => index >= 0);
                return merchantIndices.length === 1 && bossIndex >= 0 && merchantIndices[0] === bossIndex + 1;
              }) && waves.every(wave => !wave.units.some(unit => unit.type === "merchant"));

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
              const merchantBalance = merchant.maxHp === 624 && enemyTypes.merchant.hp === 624 && merchant.speed === 52.5 && enemyTypes.merchant.speed === 52.5;
              const detailedModel = model?.userData.merchantModel === true && Boolean(model.userData.merchantPack) && model.userData.merchantPouches?.length === 2 && Boolean(model.userData.merchantCoin) && Boolean(model.userData.merchantPotion);

              state.wave = 5;
              updateUI();
              const previewShowsMerchant = document.querySelector("#wavePreview .enemy-pip.merchant")?.textContent === "$1";
              return scheduledWithEvents && merchantBalance && ignoresBarracks && detailedModel && Number.isFinite(bar?.scale.x) && bar.scale.x > 0 && previewShowsMerchant;
            } catch (error) {
              return "Merchant escort error: " + (error.stack || error.message);
            }
          })(),
          merchantRelicStore: (() => {
            try {
              resetGame();
              state.gold = 2000;
              state.wave = 6;
              state.merchantEncounterCount = 1;
              state.merchantStoreGateType = "davyjones";
              spawnEnemy("davyjones");
              spawnEnemy("merchant");
              spawnEnemy("dragon");
              const eventBoss = state.enemies[0];
              const merchant = state.enemies[1];
              const unrelatedBoss = state.enemies[2];
              merchant.hp = 1;
              const testOwner = { type: "archer", kills: 0 };
              damageEnemy(merchant, 10, testOwner, "physical");
              const shopWaitsForBoss = state.merchantStorePending && !state.storeOpen && document.getElementById("merchantStoreModal").classList.contains("hidden");
              unrelatedBoss.hp = 1;
              damageEnemy(unrelatedBoss, 10, testOwner, "physical");
              const unrelatedBossDoesNotUnlock = state.merchantStorePending && !state.storeOpen;
              eventBoss.hp = 1;
              damageEnemy(eventBoss, 10, testOwner, "physical");
              const shopOpensAfterBoss = state.bossDefeatedThisWave && !state.merchantStorePending && state.storeOpen && !document.getElementById("merchantStoreModal").classList.contains("hidden") && document.querySelectorAll(".merchant-item-card").length === 5;
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
              const firstRingPayout = payGoldMineRoundIncome();
              const firstRingRoundCarriesFraction = firstRingPayout === 22 && state.gold - beforeProduction === 22 && mine.goldMined === 22 && mine.incomeRemainder === .5;
              const secondRingPayout = payGoldMineRoundIncome();
              const ringBoostsMine = ringEquipped && firstRingRoundCarriesFraction && secondRingPayout === 23 && state.gold - beforeProduction === 45 && mine.goldMined === 45 && mine.incomeRemainder === 0 && Number.isInteger(state.gold);

              resetGame();
              spawnEnemy("dragon");
              const defeatedBoss = state.enemies[0];
              defeatedBoss.hp = 1;
              damageEnemy(defeatedBoss, 10, { type: "archer", kills: 0 }, "physical");
              spawnEnemy("merchant");
              const escapedMerchant = state.enemies[1];
              const finish = pathPoints[pathPoints.length - 1];
              escapedMerchant.x = finish.x;
              escapedMerchant.y = finish.y;
              escapedMerchant.pathIndex = pathPoints.length - 1;
              escapedMerchant.speed = 100;
              update(.01);
              const escapeGivesNoShop = escapedMerchant.reached && !state.merchantStorePending && !state.storeOpen && document.getElementById("merchantStoreModal").classList.contains("hidden");

              return shopWaitsForBoss && unrelatedBossDoesNotUnlock && shopOpensAfterBoss && purchasesWork && swordEquipped && amuletEquipped && bootsEquipped && fourthRejected && threeSlotUi && universalBonusesWork && shieldBoostsTroops && ringBoostsMine && escapeGivesNoShop;
            } catch (error) {
              return "Merchant relic store error: " + (error.stack || error.message);
            }
          })(),
          relicTiers: (() => {
            try {
              const commonTypes = Object.keys(merchantRelics).filter(type => merchantRelics[type].tier === "common");
              const rareTypes = Object.keys(merchantRelics).filter(type => merchantRelics[type].tier === "rare");
              const epicTypes = Object.keys(merchantRelics).filter(type => merchantRelics[type].tier === "epic");

              resetGame();
              state.wave = 6;
              state.merchantEncounterCount = 1;
              state.gold = 99999;
              openMerchantStore();
              const firstMerchantCommonOnly = state.merchantStoreStock.length === 5 && document.querySelectorAll(".merchant-item-card").length === 5 && !state.merchantStoreStock.some(type => merchantRelics[type].tier !== "common");
              const favourStartsEmpty = document.getElementById("merchantFavourValue").textContent === "0 / 5" && document.getElementById("merchantFavourFill").style.width === "0%" && document.getElementById("merchantFavourTrack").getAttribute("aria-valuenow") === "0";
              closeMerchantStore();

              resetGame();
              state.wave = 12;
              state.merchantEncounterCount = 2;
              state.gold = 99999;
              openMerchantStore();
              const secondMerchantGuaranteesHigherTiers = state.merchantStoreStock.length === 9 && document.querySelectorAll(".merchant-item-card.relic-tier-rare").length === 3 && document.querySelectorAll(".merchant-item-card.relic-tier-epic").length === 1;
              buyMerchantRelic(state.merchantStoreStock[0]);
              const firstPurchaseBuildsFavour = document.getElementById("merchantFavourValue").textContent === "1 / 5" && document.getElementById("merchantFavourFill").style.width === "20%" && document.getElementById("merchantFavourTrack").getAttribute("aria-valuenow") === "1";
              closeMerchantStore();

              state.wave = 18;
              state.merchantEncounterCount = 3;
              openMerchantStore();
              const firstPurchaseImprovesFutureStock = state.merchantStoreStock.length === MAX_MERCHANT_RELICS && document.querySelectorAll(".merchant-item-card.relic-tier-rare").length === 4 && document.querySelectorAll(".merchant-item-card.relic-tier-epic").length === 2 && document.querySelectorAll(".merchant-item-card:not(.relic-tier-rare):not(.relic-tier-epic)").length === 4;
              buyMerchantRelic(state.merchantStoreStock[0]);
              const secondPurchaseBuildsFavour = document.getElementById("merchantFavourValue").textContent === "2 / 5" && document.getElementById("merchantFavourFill").style.width === "40%";
              closeMerchantStore();

              state.wave = 24;
              state.merchantEncounterCount = 4;
              openMerchantStore();
              const secondPurchaseContinuesProgression = state.merchantStoreStock.length === MAX_MERCHANT_RELICS && document.querySelectorAll(".merchant-item-card.relic-tier-rare").length === 5 && document.querySelectorAll(".merchant-item-card.relic-tier-epic").length === 2 && document.querySelectorAll(".merchant-item-card:not(.relic-tier-rare):not(.relic-tier-epic)").length === 3;
              closeMerchantStore();

              resetGame();
              state.gold = 99999;
              state.inventory.push("runeblade", "starforgedCore", "oracleEye");
              state.selectedBuild = "archer";
              placeTower(1, 1);
              const archer = state.towers[0];
              const baseStats = towerStats(archer);
              for (const type of ["runeblade", "starforgedCore", "oracleEye"]) {
                state.selectedRelic = type;
                equipSelectedRelic(archer);
              }
              const relicStats = towerStats(archer);
              const tierBonusesWork = Math.abs(relicStats.damage / baseStats.damage - 2.03) < .001 && Math.abs(relicStats.range / baseStats.range - 1.55) < .001 && Math.abs(relicStats.cooldown / baseStats.cooldown - .66) < .001;

              resetGame();
              state.gold = 99999;
              state.selectedBuild = "barracks";
              placeTower(1, 1);
              const barracks = state.towers[0];
              state.inventory.push("titanheart");
              state.selectedRelic = "titanheart";
              const titanheartEquipped = equipSelectedRelic(barracks);
              const titanheartWorks = titanheartEquipped && knightMaxHp(barracks) === 126 && Math.abs(towerStats(barracks).damage - 15.6) < .001;
              const covePoolIsCommonOnly = commonTypes.length === 5;
              return commonTypes.length === 5 && rareTypes.length === 8 && epicTypes.length === 8 && firstMerchantCommonOnly && favourStartsEmpty && secondMerchantGuaranteesHigherTiers && firstPurchaseBuildsFavour && firstPurchaseImprovesFutureStock && secondPurchaseBuildsFavour && secondPurchaseContinuesProgression && tierBonusesWork && titanheartWorks && covePoolIsCommonOnly;
            } catch (error) {
              return "Relic tier error: " + (error.stack || error.message);
            }
          })(),
          uniqueRelic: (() => {
            try {
              const uniqueTypes = Object.keys(merchantRelics).filter(type => merchantRelics[type].tier === "unique");

              resetGame();
              state.wave = 30;
              state.merchantEncounterCount = 5;
              state.merchantRelicsPurchased = 4;
              state.gold = 99999;
              openMerchantStore();
              const lockedBeforeFullFavour = !state.merchantStoreOffering.some(type => merchantRelics[type].tier === "unique") && document.querySelectorAll(".merchant-item-card.relic-tier-unique").length === 0;
              closeMerchantStore();

              resetGame();
              state.wave = 36;
              state.merchantEncounterCount = 6;
              state.merchantRelicsPurchased = MAX_MERCHANT_FAVOUR;
              state.gold = 99999;
              openMerchantStore();
              const uniqueOffering = state.merchantStoreOffering.filter(type => merchantRelics[type].tier === "unique");
              const unlockedAtFullFavour = state.merchantStoreOffering.length === MAX_MERCHANT_RELICS && uniqueOffering.length === 1 && document.querySelectorAll(".merchant-item-card.relic-tier-unique").length === 1 && document.getElementById("merchantFavourFill").style.width === "100%";
              closeMerchantStore();

              state.inventory.push("draculaCloak");
              state.selectedBuild = "vampire";
              placeTower(1, 1);
              const vampire = state.towers[0];
              vampire.level = 3;
              vampire.specialization = "bloodstorm";
              const maxedDamage = towerStats(vampire).damage;
              state.selectedRelic = "draculaCloak";
              const cloakEquipped = equipSelectedRelic(vampire);
              const draculaDamage = towerStats(vampire).damage;

              for (let index = 0; index < 6; index++) {
                spawnEnemy("ogre");
                const enemy = state.enemies[index];
                enemy.x = vampire.x + 50 + index * 16;
                enemy.y = vampire.y;
                enemy.pathIndex = 8 + index;
                enemy.speed = 0;
                enemy.hp = 10000;
                enemy.maxHp = 10000;
                enemy.physicalResistance = 0;
                enemy.magicResistance = 0;
              }
              vampire.cooldown = 0;
              update(.01);
              const bloodstormRetained = towerStats(vampire).drainCount === 5 && vampire.bloodDrainTargets.length === 5;
              const cursedEnemies = state.enemies.filter(enemy => enemy.batFormTimer > 0);
              const normalEnemy = state.enemies.find(enemy => enemy.batFormTimer <= 0);
              const cursedBefore = cursedEnemies[0].hp;
              const normalBefore = normalEnemy.hp;
              const testOwner = { type: "archer", kills: 0 };
              damageEnemy(cursedEnemies[0], 100, testOwner, "physical");
              damageEnemy(normalEnemy, 100, testOwner, "physical");
              const vulnerabilityWorks = cursedBefore - cursedEnemies[0].hp === 130 && normalBefore - normalEnemy.hp === 100 && cursedEnemies[0].lastDamageTakenMultiplier === DRACULA_BAT_DAMAGE_MULTIPLIER;

              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const vampireModel = graphics3D.towerMeshes.get(vampire);
              const batModel = graphics3D.enemyMeshes.get(cursedEnemies[0]);
              const transformationRendered = vampireModel?.userData.draculaCape?.visible === true && vampireModel.userData.draculaAura?.visible === true && vampireModel.userData.vampireBody.scale.x > .95 && batModel?.userData.batForm?.visible === true && batModel.userData.enemyModelRoot?.visible === false;

              update(DRACULA_BAT_DURATION + .01);
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const restoredAfterFiveSeconds = state.enemies.every(enemy => enemy.batFormTimer === 0) && batModel.userData.batForm.visible === false && batModel.userData.enemyModelRoot.visible === true;
              update(DRACULA_BAT_COOLDOWN - DRACULA_BAT_DURATION);
              const recastsEveryEightSeconds = state.enemies.filter(enemy => enemy.batFormTimer > 0).length === DRACULA_BAT_COUNT && vampire.enemiesBatCursed === DRACULA_BAT_COUNT * 2;

              vampire.specialization = "nightspawn";
              spawnEnemy("goblin");
              const nightspawnVictim = state.enemies.at(-1);
              nightspawnVictim.hp = 1;
              damageEnemy(nightspawnVictim, 10, vampire, "magic");
              const nightspawnRetained = state.knights.some(unit => unit.owner === vampire && unit.unitType === "vampireMinion" && unit.hp === 300);

              return uniqueTypes.length === 2 && lockedBeforeFullFavour && unlockedAtFullFavour && cloakEquipped && Math.abs(draculaDamage / maxedDamage - 3) < .001 && bloodstormRetained && nightspawnRetained && cursedEnemies.length === DRACULA_BAT_COUNT && vulnerabilityWorks && transformationRendered && restoredAfterFiveSeconds && recastsEveryEightSeconds;
            } catch (error) {
              return "Unique relic error: " + (error.stack || error.message);
            }
          })(),
          umbralRelic: (() => {
            try {
              resetGame();
              state.gold = 99999;
              state.selectedBuild = "ghost";
              placeTower(1, 1);
              const ghost = state.towers[0];
              ghost.level = 2;
              state.inventory.push("umbralForm");
              state.selectedRelic = "umbralForm";
              const formEquipped = equipSelectedRelic(ghost);
              const ghostOnly = merchantRelics.umbralForm.tier === "unique" && merchantRelics.umbralForm.allowed(ghost) && !merchantRelics.umbralForm.allowed({ type: "vampire" });

              spawnEnemy("dragon");
              spawnEnemy("goblin");
              spawnEnemy("ogre");
              const [boss, possessed, nearbyEnemy] = state.enemies;
              boss.x = ghost.x + 30;
              boss.y = ghost.y;
              possessed.x = ghost.x + 50;
              possessed.y = ghost.y;
              nearbyEnemy.x = ghost.x + 75;
              nearbyEnemy.y = ghost.y;
              for (const enemy of state.enemies) {
                enemy.speed = 0;
                enemy.hp = 10000;
                enemy.maxHp = 10000;
                enemy.physicalResistance = 0;
                enemy.magicResistance = 0;
              }
              ghost.cooldown = 0;
              update(.01);
              const bossFearOnly = boss.fearTimer > 0 && boss.fearTimer <= UMBRAL_BOSS_FEAR_DURATION && boss.possessionTimer === 0;
              const normalPossessed = possessed.possessionTimer > 3.9 && possessed.possessionTimer <= UMBRAL_POSSESSION_DURATION && nearbyEnemy.possessionTimer === 0 && ghost.enemiesPossessed === 1;

              const bossHpBefore = boss.hp;
              update(.01);
              const attacksNearbyEnemy = boss.hp < bossHpBefore && possessed.possessionTarget === boss && possessed.moving === false && possessed.attackSwing > 0;

              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const ghostModel = graphics3D.towerMeshes.get(ghost);
              const possessedModel = graphics3D.enemyMeshes.get(possessed);
              const transformedModel = ghostModel?.userData.umbralFeatures?.visible === true && ghostModel.userData.ghostBody.scale.x > 1.1 && ghostModel.userData.ghostLight.color.getHex() === 0xa347ff;
              const possessionRendered = possessedModel?.userData.possessionAura?.visible === true;
              const uiExplainsPower = document.getElementById("selectedName").textContent === "Umbral Horror" && document.getElementById("damageLabel").textContent === "Possess targets" && document.getElementById("specialStat").textContent.includes("4s possession");

              ghost.cooldown = 999;
              update(UMBRAL_POSSESSION_DURATION + .01);
              const expiresAfterFourSeconds = possessed.possessionTimer === 0 && possessed.possessionOwner === null && possessed.possessionTarget === null;
              return formEquipped && ghostOnly && bossFearOnly && normalPossessed && attacksNearbyEnemy && transformedModel && possessionRendered && uiExplainsPower && expiresAfterFourSeconds;
            } catch (error) {
              return "Umbral relic error: " + (error.stack || error.message);
            }
          })(),
          treasureCove: (() => {
            const originalRandom = Math.random;
            try {
              resetGame();
              state.gold = 9999;
              state.selectedBuild = "mine";
              placeTower(1, 1);
              const mine = state.towers[0];
              const lockedUntilStaffed = document.getElementById("treasureCoveUpgradeButton").classList.contains("hidden");
              for (let index = 0; index < MAX_MINE_WORKERS; index++) hireWorker();
              const fiveWorkers = mine.workers === 5 && workerCost(mine) === null && mine.spent === 595;
              const upgradeOptionAppears = !document.getElementById("treasureCoveUpgradeButton").classList.contains("hidden") && document.getElementById("treasureCoveUpgradeCost").textContent === "420 gold";

              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const mineModel = graphics3D.towerMeshes.get(mine);
              const fiveWorkersVisible = mineModel.userData.workers.length === 5 && mineModel.userData.workers.every(worker => worker.visible);
              const goldBeforeUpgrade = state.gold;
              upgradeTreasureCove();
              graphics3D.render(state, hoverCell, canPlace, towerStats);
              const coveModel = graphics3D.towerMeshes.get(mine);
              const converted = mine.specialization === "treasureCove" && mine.level === 2 && mine.spent === 1015 && state.gold === goldBeforeUpgrade - TREASURE_COVE_COST;
              const detailedCoveModel = coveModel.userData.treasureCove === true && coveModel.userData.coveMinerals.length >= 6 && coveModel.userData.workers.length === 5;
              const coveUi = document.getElementById("selectedName").textContent === "Treasure Cove" && document.getElementById("damageStat").textContent === "50% relic / round" && document.getElementById("killsLabel").textContent === "Relics unearthed" && treasureCoveRelicChance(mine) === .5;

              Math.random = () => 0;
              const inventoryBefore = state.inventory.length;
              const goldBeforeExcavation = state.gold;
              const producedOnSuccessfulRoll = rollTreasureCoveRoundRelics();
              const successfulRoundRoll = producedOnSuccessfulRoll === 1 && state.inventory.length === inventoryBefore + 1 && state.inventory.at(-1) === "sword" && mine.relicsExcavated === 1 && state.gold === goldBeforeExcavation && mine.goldMined === 0;
              Math.random = () => .5;
              const producedOnFailedRoll = rollTreasureCoveRoundRelics();
              const failedRoundRoll = producedOnFailedRoll === 0 && state.inventory.length === inventoryBefore + 1 && mine.relicsExcavated === 1;
              return lockedUntilStaffed && fiveWorkers && upgradeOptionAppears && fiveWorkersVisible && converted && detailedCoveModel && coveUi && successfulRoundRoll && failedRoundRoll;
            } catch (error) {
              return "Treasure Cove error: " + (error.stack || error.message);
            } finally {
              Math.random = originalRandom;
            }
          })(),
          incomeScaling: (() => {
            try {
              resetGame();
              const startingGoldUnchanged = state.gold === 250;
              const scaledPayouts = Array.from({ length: 10 }, () => awardGold(1));
              const fractionsCarryForward = scaledPayouts.reduce((total, payout) => total + payout, 0) === 3 && state.gold === 253 && Math.abs(state.goldIncomeRemainder - .45) < .001;

              resetGame();
              spawnEnemy("goblin");
              const rewardTarget = state.enemies[0];
              rewardTarget.hp = 1;
              const rewardOwner = { type: "archer", kills: 0 };
              damageEnemy(rewardTarget, 10, rewardOwner, "physical");
              const killRewardIncrease = state.gold === 252 && Math.abs(state.goldIncomeRemainder - .76) < .001;

              resetGame();
              state.gold = 9999;
              state.selectedBuild = "mine";
              placeTower(1, 1);
              const mine = state.towers[0];
              hireWorker();
              const preProductionGold = state.gold;
              state.wave = 1;
              state.waveActive = true;
              state.spawnQueue = [{ type: "goblin", gap: 999 }];
              state.spawnTimer = 999;
              update(6.01);
              const noContinuousIncome = state.gold === preProductionGold && mine.goldMined === 0;
              state.spawnQueue = [];
              update(.01);
              const mineRoundPayout = state.gold - preProductionGold === 36 && mine.goldMined === 15 && mine.incomeRemainder === 0 && !state.waveActive;

              resetGame();
              state.wave = 1;
              state.waveActive = true;
              update(.01);
              const waveBonusRestored = state.gold === 271 && state.goldIncomeRemainder === 0;
              return GOLD_INCOME_RATE === .345 && MINE_GOLD_PER_WORKER_PER_ROUND === 15 && towerTypes.mine.cost === 150 && startingGoldUnchanged && fractionsCarryForward && killRewardIncrease && noContinuousIncome && mineRoundPayout && waveBonusRestored;
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
              const queueCombined = state.activeEvent?.name === "Pirate Raid" && state.spawnQueue.length === normalCount + 16 &&
                state.spawnQueue[2]?.type === "pirate" && state.spawnQueue.some(unit => unit.type === "ogre") && state.spawnQueue.some(unit => unit.type === "davyjones") && state.spawnQueue.some(unit => unit.type === "merchant");

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
              damageEnemy(rangedWitch, 1, barracks, "physical", rangedVictims[0]);
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
          result.hasGraphics && result.hasWheelZoom && result.hasCameraReset && result.speedHotkey === true && result.towerCards >= 10 && result.menuModes === true && result.supportCastle === true && result.ufoDefense === true && result.ufoPaths === true && result.bossSummons === true && result.bossBarracksRetaliation === true && result.monsterIndex === true && result.treeObstacles === true && result.archerVolley === true && result.archerPaths === true && result.ballistaFlame === true && result.vampireDrain === true && result.vampirePaths === true && result.ghostFear === true && result.damageTypes === true && result.combatBalance === true && result.placementScaling === true && result.barracksPaths === true && result.dragonFire === true && result.bossRoster === true && result.campaignWaves === true && result.merchantEscort === true && result.merchantRelicStore === true && result.relicTiers === true && result.uniqueRelic === true && result.umbralRelic === true && result.treasureCove === true && result.incomeScaling === true && result.themedEvents === true;
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

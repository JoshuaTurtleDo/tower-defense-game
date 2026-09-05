"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");
const ogreCloseup = process.argv.includes("--ogre-closeup");
const wizardCloseup = process.argv.includes("--wizard-closeup");
const archerCloseup = process.argv.includes("--archer-closeup");
const eventShowcase = process.argv.includes("--event-showcase");
const eventBossShowcase = process.argv.includes("--event-boss-showcase");
const horsemanCloseup = process.argv.includes("--horseman-closeup");
const yetiCloseup = process.argv.includes("--yeti-closeup");
const flameBallistaCloseup = process.argv.includes("--flame-ballista-closeup");
const witchCombat = process.argv.includes("--witch-combat");

async function capturePreview() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    backgroundColor: "#10271c",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });

  await window.loadFile(path.join(__dirname, "..", "index.html"));
  window.setOpacity(0);
  window.showInactive();
  await new Promise(resolve => setTimeout(resolve, 250));
  const showcaseState = await window.webContents.executeJavaScript(`(() => {
    state.gold = 9999;
    const showcase = [
      ["archer", 2, 1], ["mage", 4, 1], ["ballista", 6, 1],
      ["barracks", 3, 3], ["ogre", 5, 3], ["mine", 7, 3]
    ];
    for (const [type, col, row] of showcase) {
      state.selectedBuild = type;
      placeTower(col, row);
    }
    ["goblin", "skeleton", "orc", "ogre", "dragon"].forEach((type, index) => {
      spawnEnemy(type);
      const enemy = state.enemies[state.enemies.length - 1];
      enemy.x = (2.2 + index * 1.55) * CELL;
      enemy.y = 6.25 * CELL;
      enemy.pathIndex = pathPoints.length - 2;
      enemy.moving = false;
    });
    const projectileTarget = state.enemies[state.enemies.length - 1];
    [
      ["archer", "#d6d19c", 3.1],
      ["mage", "#a788eb", 5.1],
      ["ballista", "#e5a654", 7.1]
    ].forEach(([type, color, column]) => state.projectiles.push({
      x: column * CELL,
      y: 5.35 * CELL,
      target: projectileTarget,
      type,
      color,
      dead: false
    }));
    state.paused = true;
    document.querySelector("#pauseOverlay").classList.add("hidden");
    showBuildPanel();
    updateUI();
    if (${ogreCloseup}) {
      const ogre = state.towers.find(tower => tower.type === "ogre");
      const focus = graphics3D.worldFromGame(ogre.x, ogre.y, .55);
      graphics3D.orbitTarget.copy(focus);
      graphics3D.setOrbitFromPosition(new THREE.Vector3(focus.x + 2.55, focus.y + 2.15, focus.z - 2.8));
    }
    if (${wizardCloseup}) {
      const wizard = state.towers.find(tower => tower.type === "mage");
      state.selectedTower = wizard;
      showInspectPanel(wizard);
      updateUI();
      state.projectiles.push({ x: wizard.x + 38, y: wizard.y + 18, target: projectileTarget, type: "mage", color: "#a788eb", dead: false });
      const focus = graphics3D.worldFromGame(wizard.x, wizard.y, .55);
      graphics3D.orbitTarget.copy(focus);
      graphics3D.setOrbitFromPosition(new THREE.Vector3(focus.x + 2.4, focus.y + 2.05, focus.z - 2.65));
    }
    if (${archerCloseup}) {
      const archers = state.towers.find(tower => tower.type === "archer");
      state.towers = [archers];
      archers.col = 5;
      archers.row = 6;
      archers.x = 5.5 * CELL;
      archers.y = 6.5 * CELL;
      state.enemies = [projectileTarget];
      projectileTarget.x = 9.5 * CELL;
      projectileTarget.y = 6.5 * CELL;
      projectileTarget.moving = false;
      state.projectiles = [];
      state.selectedTower = archers;
      archers.angle = Math.atan2(projectileTarget.y - archers.y, projectileTarget.x - archers.x);
      archers.archerShotTimers = [.2, .12, .04];
      showInspectPanel(archers);
      updateUI();
      [0, 1, 2].forEach(index => fireProjectile(archers, projectileTarget, towerStats(archers), index));
      const focus = graphics3D.worldFromGame(archers.x, archers.y, .45);
      graphics3D.orbitTarget.copy(focus);
      graphics3D.setOrbitFromPosition(new THREE.Vector3(focus.x + 2.15, focus.y + 1.85, focus.z - 2.35));
    }
    if (${eventShowcase}) {
      state.towers = [];
      state.selectedTower = null;
      state.enemies = [];
      state.projectiles = [];
      ["pirate", "werewolf", "viking", "wraith", "demon"].forEach((type, index) => {
        spawnEnemy(type);
        const enemy = state.enemies[index];
        enemy.x = (2.55 + index * 1.55) * CELL;
        enemy.y = 6.2 * CELL;
        enemy.pathIndex = pathPoints.length - 2;
        enemy.moving = false;
      });
      state.wave = 5;
      state.waveActive = false;
      state.activeEvent = null;
      showBuildPanel();
      updateUI();
      const focus = graphics3D.worldFromGame(5.65 * CELL, 6.2 * CELL, .58);
      graphics3D.orbitTarget.copy(focus);
      graphics3D.setOrbitFromPosition(new THREE.Vector3(focus.x + 3.6, focus.y + 2.7, focus.z - 4.2));
    }
    if (${eventBossShowcase}) {
      state.towers = [];
      state.selectedTower = null;
      state.enemies = [];
      state.projectiles = [];
      const positions = [2, 3.6, 5.2, 6.8, 8.4];
      ["davyjones", "moonalpha", "longship", "covenwitch", "riftlord"].forEach((type, index) => {
        spawnEnemy(type);
        const enemy = state.enemies[index];
        enemy.x = positions[index] * CELL;
        enemy.y = .5 * CELL;
        enemy.pathIndex = Math.min(pathPoints.length - 1, Math.max(2, Math.round(positions[index]) + 1));
        enemy.moving = false;
        enemy.speed = 0;
      });
      state.wave = 5;
      state.waveActive = false;
      state.activeEvent = null;
      showBuildPanel();
      updateUI();
      const focus = graphics3D.worldFromGame(5.2 * CELL, .5 * CELL, .8);
      graphics3D.orbitTarget.copy(focus);
      graphics3D.setOrbitFromPosition(new THREE.Vector3(focus.x, focus.y + 3.05, focus.z - 6.5));
    }
    if (${horsemanCloseup}) {
      state.towers = [];
      state.knights = [];
      state.selectedTower = null;
      state.enemies = [];
      state.projectiles = [];
      spawnEnemy("horseman");
      const horseman = state.enemies[0];
      horseman.x = 5.5 * CELL;
      horseman.y = .5 * CELL;
      horseman.pathIndex = 7;
      horseman.moving = false;
      horseman.speed = 0;
      showBuildPanel();
      updateUI();
      const focus = graphics3D.worldFromGame(horseman.x, horseman.y, 1.05);
      graphics3D.orbitTarget.copy(focus);
      graphics3D.setOrbitFromPosition(new THREE.Vector3(focus.x + 2.3, focus.y + 1.55, focus.z - 3.15));
    }
    if (${yetiCloseup}) {
      state.towers = [];
      state.knights = [];
      state.selectedTower = null;
      state.enemies = [];
      state.projectiles = [];
      spawnEnemy("yeti");
      const yeti = state.enemies[0];
      yeti.x = 5.5 * CELL;
      yeti.y = .5 * CELL;
      yeti.pathIndex = 7;
      yeti.moving = false;
      yeti.speed = 0;
      showBuildPanel();
      updateUI();
      const focus = graphics3D.worldFromGame(yeti.x, yeti.y, 1.2);
      graphics3D.orbitTarget.copy(focus);
      graphics3D.setOrbitFromPosition(new THREE.Vector3(focus.x + 2.9, focus.y + 2.15, focus.z - 3.85));
    }
    if (${flameBallistaCloseup}) {
      state.towers = [];
      state.knights = [];
      state.enemies = [];
      state.projectiles = [];
      state.selectedBuild = "ballista";
      placeTower(1, 1);
      const ballista = state.towers[0];
      upgradeTower();
      upgradeTower();
      ballista.col = 5;
      ballista.row = 6;
      ballista.x = 5.5 * CELL;
      ballista.y = 6.5 * CELL;
      spawnEnemy("ogre");
      const target = state.enemies[0];
      target.x = 9.5 * CELL;
      target.y = 6.5 * CELL;
      target.pathIndex = pathPoints.length - 2;
      target.moving = false;
      target.speed = 0;
      ballista.angle = Math.atan2(target.y - ballista.y, target.x - ballista.x);
      state.selectedTower = ballista;
      fireProjectile(ballista, target, towerStats(ballista));
      const bolt = state.projectiles[0];
      bolt.x = ballista.x + 55;
      bolt.y = ballista.y;
      showInspectPanel(ballista);
      updateUI();
      const focus = graphics3D.worldFromGame(ballista.x, ballista.y, .55);
      graphics3D.orbitTarget.copy(focus);
      graphics3D.setOrbitFromPosition(new THREE.Vector3(focus.x + 2.25, focus.y + 1.75, focus.z - 2.75));
    }
    if (${witchCombat}) {
      state.towers = [];
      state.knights = [];
      state.enemies = [];
      state.projectiles = [];
      state.selectedBuild = "barracks";
      placeTower(5, 1);
      const barracks = state.towers[0];
      spawnEnemy("covenwitch");
      const witch = state.enemies[0];
      witch.x = barracks.x;
      witch.y = .5 * CELL;
      witch.pathIndex = 7;
      witch.moving = false;
      witch.speed = 0;
      const victim = state.knights[0];
      victim.x = barracks.x;
      victim.y = barracks.y - 12;
      fireWitchProjectile(witch, victim);
      const spell = state.projectiles[0];
      spell.x = (witch.x + victim.x) / 2;
      spell.y = (witch.y + victim.y) / 2;
      state.selectedTower = barracks;
      showInspectPanel(barracks);
      updateUI();
      const focus = graphics3D.worldFromGame(barracks.x, (witch.y + barracks.y) / 2, .72);
      graphics3D.orbitTarget.copy(focus);
      graphics3D.setOrbitFromPosition(new THREE.Vector3(focus.x + 2.4, focus.y + 1.8, focus.z - 3.25));
    }
    return { gold: state.gold, towers: state.towers.length, enemies: state.enemies.length };
  })()`);
  console.log(JSON.stringify(showcaseState));
  await new Promise(resolve => setTimeout(resolve, 1200));
  await window.webContents.executeJavaScript(`({ gold: state.gold, towers: state.towers.length, enemies: state.enemies.length, paused: state.paused })`);
  await window.webContents.executeJavaScript(`graphics3D.render(state, hoverCell, canPlace, towerStats)`);
  const image = await window.webContents.capturePage();
  const outputDirectory = path.join(__dirname, "..", "out");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputName = ogreCloseup ? "ogre-closeup.png" : wizardCloseup ? "wizard-closeup.png" : archerCloseup ? "archer-closeup.png" : eventShowcase ? "event-showcase.png" : eventBossShowcase ? "event-miniboss-showcase.png" : horsemanCloseup ? "horseman-skeletal-closeup.png" : yetiCloseup ? "glacier-yeti-closeup.png" : flameBallistaCloseup ? "flame-ballista-closeup.png" : witchCombat ? "witch-ranged-combat.png" : "visual-preview.png";
  const outputPath = path.join(outputDirectory, outputName);
  fs.writeFileSync(outputPath, image.toPNG());
  console.log(outputPath);
  app.quit();
}

app.whenReady().then(capturePreview).catch(error => {
  console.error(error);
  app.exit(1);
});

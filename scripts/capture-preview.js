"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

async function capturePreview() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    backgroundColor: "#10271c",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await window.loadFile(path.join(__dirname, "..", "index.html"));
  await window.webContents.executeJavaScript(`(() => {
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
    state.paused = true;
    document.querySelector("#pauseOverlay").classList.add("hidden");
    showBuildPanel();
    updateUI();
  })()`);
  await new Promise(resolve => setTimeout(resolve, 1200));
  const image = await window.webContents.capturePage();
  const outputDirectory = path.join(__dirname, "..", "out");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, "visual-preview.png");
  fs.writeFileSync(outputPath, image.toPNG());
  console.log(outputPath);
  app.quit();
}

app.whenReady().then(capturePreview).catch(error => {
  console.error(error);
  app.exit(1);
});

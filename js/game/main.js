"use strict";

// Game loop, special preview setup, and application bootstrap.

function gameLoop(now) {
  const rawDt = Math.min(.05, (now - lastTime) / 1000);
  lastTime = now;
  update(rawDt * state.speed);
  draw();
  requestAnimationFrame(gameLoop);
}

function applyRequestedPreview() {
  if (new URLSearchParams(window.location.search).get("merchant-preview") !== "1") return;
  state.wave = 9;
  spawnEnemy("merchant");
  const merchant = state.enemies[0];
  merchant.x = 520;
  merchant.y = 360;
  merchant.pathIndex = pathPoints.findIndex(point => point.x === 600 && point.y === 360);
  merchant.speed = 0;
  merchant.moving = true;
  showAnnouncement("Event Merchant — event escort preview");
  updateUI();
}

resetGame("campaign");
applyGameSettings();
if (new URLSearchParams(window.location.search).get("merchant-preview") === "1") {
  applyRequestedPreview();
} else {
  state.gameStarted = false;
  openMainMenu();
}
requestAnimationFrame(gameLoop);

"use strict";

// Mouse, camera, keyboard, and interface event bindings.

document.querySelectorAll(".tower-card").forEach(card => {
  card.addEventListener("click", () => {
    state.selectedTower = null;
    state.selectedTreeId = null;
    state.selectedRelic = null;
    state.selectedBuild = state.selectedBuild === card.dataset.tower ? null : card.dataset.tower;
    showBuildPanel();
    updateUI();
  });
});

canvas.addEventListener("pointerdown", event => {
  if (event.button !== 2) return;
  cameraDrag.active = true;
  cameraDrag.dragged = false;
  cameraDrag.suppressClick = false;
  cameraDrag.pointerId = event.pointerId;
  cameraDrag.startX = cameraDrag.lastX = event.clientX;
  cameraDrag.startY = cameraDrag.lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = "grabbing";
});

canvas.addEventListener("pointermove", event => {
  if (cameraDrag.active && event.pointerId === cameraDrag.pointerId) {
    const deltaX = event.clientX - cameraDrag.lastX;
    const deltaY = event.clientY - cameraDrag.lastY;
    if (!cameraDrag.dragged && Math.hypot(event.clientX - cameraDrag.startX, event.clientY - cameraDrag.startY) > 5) {
      cameraDrag.dragged = true;
      hoverCell = null;
    }
    if (cameraDrag.dragged) graphics3D.orbitBy(deltaX * gameSettings.cameraSensitivity, deltaY * gameSettings.cameraSensitivity);
    cameraDrag.lastX = event.clientX;
    cameraDrag.lastY = event.clientY;
    return;
  }
  hoverCell = graphics3D.pickGrid(event.clientX, event.clientY);
  if (!hoverCell) return;
  const hoveredTree = graphics3D.pickTree(event.clientX, event.clientY);
  const hoveredTower = state.towers.some(tower => tower.col === hoverCell.col && tower.row === hoverCell.row);
  canvas.style.cursor = state.selectedRelic ? (hoveredTower ? "pointer" : "not-allowed") : hoveredTree ? (state.selectedBuild ? "not-allowed" : "pointer") : state.selectedBuild ? (canPlace(hoverCell.col, hoverCell.row) ? "crosshair" : "not-allowed") : "default";
});

function finishCameraDrag(event, cancelled = false) {
  if (!cameraDrag.active || event.pointerId !== cameraDrag.pointerId) return;
  cameraDrag.suppressClick = false;
  cameraDrag.active = false;
  cameraDrag.pointerId = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  hoverCell = graphics3D.pickGrid(event.clientX, event.clientY);
  const hoveredTree = graphics3D.pickTree(event.clientX, event.clientY);
  const hoveredTower = hoverCell && state.towers.some(tower => tower.col === hoverCell.col && tower.row === hoverCell.row);
  canvas.style.cursor = state.selectedRelic ? (hoveredTower ? "pointer" : "not-allowed") : hoveredTree ? (state.selectedBuild ? "not-allowed" : "pointer") : state.selectedBuild && hoverCell ? (canPlace(hoverCell.col, hoverCell.row) ? "crosshair" : "not-allowed") : "default";
}

canvas.addEventListener("pointerup", event => finishCameraDrag(event));
canvas.addEventListener("pointercancel", event => finishCameraDrag(event, true));
canvas.addEventListener("pointerleave", () => { if (!cameraDrag.active) hoverCell = null; });
canvas.addEventListener("contextmenu", event => event.preventDefault());
canvas.addEventListener("wheel", event => {
  event.preventDefault();
  const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? event.deltaY * 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? event.deltaY * canvas.clientHeight
      : event.deltaY;
  graphics3D.zoomBy(delta);
}, { passive: false });

canvas.addEventListener("click", event => {
  if (cameraDrag.suppressClick) {
    cameraDrag.suppressClick = false;
    return;
  }
  const picked = graphics3D.pickGrid(event.clientX, event.clientY);
  if (state.selectedRelic) {
    const tower = picked && state.towers.find(item => item.col === picked.col && item.row === picked.row);
    if (tower) equipSelectedRelic(tower);
    else showAnnouncement("Relics must be placed onto a compatible defense");
    return;
  }
  const treeId = graphics3D.pickTree(event.clientX, event.clientY);
  if (treeId) {
    const tree = state.trees.find(item => item.id === treeId);
    if (tree) {
      showTreePanel(tree);
      updateUI();
      return;
    }
  }
  if (!picked) return;
  const { col, row } = picked;
  if (state.selectedBuild) placeTower(col, row);
  else {
    const tower = state.towers.find(t => t.col === col && t.row === row);
    if (tower) showInspectPanel(tower);
    else { state.selectedTower = null; state.selectedTreeId = null; showBuildPanel(); }
  }
});
document.getElementById("startWaveButton").addEventListener("click", startWave);
document.getElementById("upgradeButton").addEventListener("click", upgradeTower);
document.getElementById("frostUpgradeButton").addEventListener("click", chooseFrostPath);
document.getElementById("graveUpgradeButton").addEventListener("click", chooseGravestonePath);
document.getElementById("slingUpgradeButton").addEventListener("click", chooseSlingshooterPath);
document.getElementById("nightspawnUpgradeButton").addEventListener("click", chooseNightspawnPath);
document.getElementById("hireWorkerButton").addEventListener("click", hireWorker);
document.getElementById("treasureCoveUpgradeButton").addEventListener("click", upgradeTreasureCove);
document.getElementById("sellButton").addEventListener("click", sellTower);
document.getElementById("closeMerchantStoreButton").addEventListener("click", closeMerchantStore);
document.getElementById("digUpTreeButton").addEventListener("click", digUpTree);
document.getElementById("backButton").addEventListener("click", () => { state.selectedTower = null; showBuildPanel(); });
document.getElementById("treeBackButton").addEventListener("click", () => { state.selectedTreeId = null; showBuildPanel(); updateUI(); });
document.getElementById("restartButton").addEventListener("click", () => resetGame(activeGameMode));
document.getElementById("cameraResetButton").addEventListener("click", () => graphics3D.resetCamera());
document.getElementById("monsterIndexButton").addEventListener("click", openMonsterIndex);
document.getElementById("closeMonsterIndexButton").addEventListener("click", closeMonsterIndex);
document.getElementById("menuButton").addEventListener("click", openMainMenu);
document.getElementById("continueGameButton").addEventListener("click", resumeGame);
document.getElementById("playMenuButton").addEventListener("click", () => showMenuView("play"));
document.getElementById("settingsMenuButton").addEventListener("click", () => showMenuView("settings"));
document.querySelectorAll("[data-menu-view='home']").forEach(button => button.addEventListener("click", () => showMenuView("home")));
document.getElementById("campaignModeButton").addEventListener("click", () => beginGameMode("campaign"));
document.getElementById("endlessModeButton").addEventListener("click", () => beginGameMode("endless"));
document.getElementById("shadowsSettingButton").addEventListener("click", () => { gameSettings.shadows = !gameSettings.shadows; applyGameSettings(); });
document.getElementById("healthBarsSettingButton").addEventListener("click", () => { gameSettings.healthBars = !gameSettings.healthBars; applyGameSettings(); });
document.getElementById("cameraSpeedSettingButton").addEventListener("click", () => { gameSettings.cameraSensitivity = gameSettings.cameraSensitivity > 1 ? 1 : 1.55; applyGameSettings(); });
document.getElementById("pauseButton").addEventListener("click", () => {
  state.paused = !state.paused;
  document.getElementById("pauseButton").textContent = state.paused ? "▶" : "Ⅱ";
  document.getElementById("pauseOverlay").classList.toggle("hidden", !state.paused);
});
document.getElementById("speedButton").addEventListener("click", () => {
  state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
  document.getElementById("speedButton").textContent = `${state.speed}×`;
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (state.monsterIndexOpen) {
      closeMonsterIndex();
      return;
    }
    state.selectedBuild = null;
    state.selectedTower = null;
    state.selectedTreeId = null;
    state.selectedRelic = null;
    showBuildPanel();
    updateUI();
  }
  if (event.code === "Space" && !event.repeat) {
    event.preventDefault();
    if (!state.waveActive) startWave();
  }
});

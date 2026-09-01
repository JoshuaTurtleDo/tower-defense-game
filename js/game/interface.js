"use strict";

// Build/inspection panels, menus, settings, HUD updates, and wave previews.

function showBuildPanel() {
  document.getElementById("buildPanel").classList.remove("hidden");
  document.getElementById("inspectPanel").classList.add("hidden");
  document.getElementById("treePanel").classList.add("hidden");
}

function showInspectPanel(tower) {
  state.selectedTower = tower;
  state.selectedTreeId = null;
  state.selectedBuild = null;
  document.querySelectorAll(".tower-card").forEach(card => card.classList.remove("selected"));
  document.getElementById("buildPanel").classList.add("hidden");
  document.getElementById("inspectPanel").classList.remove("hidden");
  document.getElementById("treePanel").classList.add("hidden");
  const base = towerTypes[tower.type];
  const emblem = document.getElementById("selectedEmblem");
  emblem.textContent = base.emblem;
  emblem.className = `tower-emblem ${base.className}`;
  document.getElementById("selectedName").textContent = base.name;
  renderEquippedRelics(tower);
  const upgradeButton = document.getElementById("upgradeButton");
  const frostButton = document.getElementById("frostUpgradeButton");
  const graveButton = document.getElementById("graveUpgradeButton");
  const slingButton = document.getElementById("slingUpgradeButton");
  const nightspawnButton = document.getElementById("nightspawnUpgradeButton");
  const branchHint = document.getElementById("branchHint");
  const specialRow = document.getElementById("specialStatRow");
  const damageTypeRow = document.getElementById("damageTypeStatRow");
  const mineControls = document.getElementById("mineControls");
  const treasureCoveButton = document.getElementById("treasureCoveUpgradeButton");
  const isMine = tower.type === "mine";

  upgradeButton.classList.toggle("hidden", isMine);
  mineControls.classList.toggle("hidden", !isMine);

  if (isMine) {
    const isTreasureCove = tower.specialization === "treasureCove";
    const excavationInterval = isTreasureCove ? treasureCoveExcavationInterval(tower) : 0;
    const excavationIntervalLabel = Number.isInteger(excavationInterval) ? excavationInterval : excavationInterval.toFixed(1);
    const mineIncome = tower.workers * MINE_GOLD_PER_WORKER_PER_SECOND * (tower.items?.includes("ring") ? 1.5 : 1);
    const mineIncomeLabel = Number.isInteger(mineIncome) ? mineIncome : mineIncome.toFixed(2).replace(/0+$/, "");
    if (isTreasureCove) {
      emblem.textContent = "◆";
      emblem.className = "tower-emblem treasure-cove-emblem";
      document.getElementById("selectedName").textContent = "Treasure Cove";
    }
    document.getElementById("selectedLevel").textContent = isTreasureCove ? "Relic excavation" : "Economic building";
    document.getElementById("damageLabel").textContent = isTreasureCove ? "Excavation" : "Production";
    document.getElementById("rangeLabel").textContent = "Workers";
    document.getElementById("speedLabel").textContent = "Operation";
    document.getElementById("killsLabel").textContent = isTreasureCove ? "Relics unearthed" : "Gold mined";
    document.getElementById("damageStat").textContent = isTreasureCove ? `1 relic / ${excavationIntervalLabel}s` : tower.workers ? `${mineIncomeLabel} gold / second` : "No income";
    document.getElementById("rangeStat").textContent = `${tower.workers} / ${MAX_MINE_WORKERS}`;
    document.getElementById("speedStat").textContent = "During waves";
    document.getElementById("killsStat").textContent = isTreasureCove ? tower.relicsExcavated : tower.goldMined;
    branchHint.classList.add("hidden");
    frostButton.classList.add("hidden");
    graveButton.classList.add("hidden");
    slingButton.classList.add("hidden");
    nightspawnButton.classList.add("hidden");
    specialRow.classList.add("hidden");
    damageTypeRow.classList.add("hidden");
    const cost = workerCost(tower);
    const hireButton = document.getElementById("hireWorkerButton");
    hireButton.firstElementChild.textContent = cost === null ? "Fully staffed" : "Hire worker";
    document.getElementById("workerCost").textContent = cost === null ? `${MAX_MINE_WORKERS} / ${MAX_MINE_WORKERS}` : `${cost} gold`;
    hireButton.disabled = cost === null || state.gold < cost;
    hireButton.classList.toggle("hidden", isTreasureCove || tower.workers >= MAX_MINE_WORKERS);
    treasureCoveButton.classList.toggle("hidden", isTreasureCove || tower.workers < MAX_MINE_WORKERS);
    treasureCoveButton.disabled = isTreasureCove || state.gold < TREASURE_COVE_COST;
    document.getElementById("treasureCoveUpgradeCost").textContent = `${TREASURE_COVE_COST} gold`;
    document.getElementById("mineControlCopy").textContent = isTreasureCove
      ? "All five workers now search the cave for relics while an assault is underway. Gold production has stopped."
      : tower.workers >= MAX_MINE_WORKERS
        ? "The mine is fully staffed. Convert it into a Treasure Cove to excavate relics instead of gold."
        : "Each worker produces 1 gold every second while an assault is underway.";
  } else {
    const stats = towerStats(tower);
    const isBarracks = tower.type === "barracks";
    const isOgreTower = tower.type === "ogre";
    const isArcherSquad = tower.type === "archer";
    const isGhost = tower.type === "ghost";
    const isVampire = tower.type === "vampire";
    const barracksUnit = tower.specialization === "graveyard" ? "Zombie" : tower.specialization === "gladiators" ? "Gladiator" : "Knight";
    const damageType = base.damageType;
    const damageTypeStat = document.getElementById("damageTypeStat");
    damageTypeRow.classList.remove("hidden");
    damageTypeStat.textContent = damageType === "magic" ? "Magic" : damageType === "physical" ? "Physical" : "Control";
    damageTypeStat.className = `damage-type ${damageType}`;
    document.getElementById("selectedLevel").textContent = `Level ${tower.level}`;
    document.getElementById("damageLabel").textContent = isGhost ? "Fear targets" : isBarracks ? `${barracksUnit} damage` : isOgreTower ? "Impact damage" : "Damage";
    document.getElementById("rangeLabel").textContent = isGhost ? "Fear range" : isBarracks ? "Command range" : isOgreTower ? "Grab range" : "Range";
    document.getElementById("speedLabel").textContent = "Attack time";
    document.getElementById("killsLabel").textContent = isGhost ? "Enemies feared" : "Enemies felled";
    document.getElementById("damageStat").textContent = isGhost ? stats.fearCount : Math.round(stats.damage);
    document.getElementById("rangeStat").textContent = Math.round(stats.range);
    document.getElementById("speedStat").textContent = `${stats.cooldown.toFixed(2)}s`;
    document.getElementById("killsStat").textContent = isGhost ? tower.enemiesFeared : tower.kills;
    const cost = upgradeCost(tower);
    const choosingMagePath = tower.type === "mage" && tower.level === 2;
    const choosingBarracksPath = tower.type === "barracks" && tower.level === 2;
    const choosingArcherPath = tower.type === "archer" && tower.level === 2;
    const choosingVampirePath = tower.type === "vampire" && tower.level === 2;
    const choosingBallistaFlame = tower.type === "ballista" && tower.level === 2;
    const completedMagePath = tower.type === "mage" && tower.level === 3;
    const completedBarracksPath = tower.type === "barracks" && tower.level === 3;
    const completedArcherPath = tower.type === "archer" && tower.level === 3;
    const completedVampirePath = tower.type === "vampire" && tower.level === 3;
    const completedBallistaFlame = tower.type === "ballista" && tower.level === 3;
    document.getElementById("selectedName").textContent = completedArcherPath ? tower.specialization === "slingshooters" ? "Royal Slingshooters" : "Royal Riflemen" : completedBallistaFlame ? "Flamebolt Ballista" : base.name;
    document.getElementById("upgradeLabel").textContent = choosingMagePath ? "Arcane Path" : choosingBarracksPath ? "Gladiator Path" : choosingArcherPath ? "Riflemen Path" : choosingVampirePath ? "Bloodstorm Path" : choosingBallistaFlame || completedBallistaFlame ? "Flaming Greatbolt" : completedMagePath ? `${tower.specialization === "frost" ? "Frost" : "Arcane"} Path` : completedBarracksPath ? `${tower.specialization === "graveyard" ? "Gravestone" : "Gladiator"} Path` : completedArcherPath ? `${tower.specialization === "slingshooters" ? "Slingshooter" : "Riflemen"} Path` : completedVampirePath ? `${tower.specialization === "nightspawn" ? "Nightspawn" : "Bloodstorm"} Path` : "Upgrade";
    document.getElementById("upgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    upgradeButton.disabled = cost === null || state.gold < cost;
    branchHint.classList.toggle("hidden", !choosingMagePath && !choosingBarracksPath && !choosingArcherPath && !choosingVampirePath);
    branchHint.textContent = choosingMagePath ? "Choose this wizard's final discipline. This choice is permanent." : choosingBarracksPath ? "Choose this barracks' final warband. This choice is permanent." : choosingArcherPath ? "Choose this squad's final weapon. This choice is permanent." : "Choose this Vampire's final blood discipline. This choice is permanent.";
    frostButton.classList.toggle("hidden", !choosingMagePath);
    document.getElementById("frostUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    frostButton.disabled = cost === null || state.gold < cost;
    graveButton.classList.toggle("hidden", !choosingBarracksPath);
    document.getElementById("graveUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    graveButton.disabled = cost === null || state.gold < cost;
    slingButton.classList.toggle("hidden", !choosingArcherPath);
    document.getElementById("slingUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    slingButton.disabled = cost === null || state.gold < cost;
    nightspawnButton.classList.toggle("hidden", !choosingVampirePath);
    document.getElementById("nightspawnUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    nightspawnButton.disabled = cost === null || state.gold < cost;
    specialRow.classList.toggle("hidden", !completedMagePath && !completedBallistaFlame && !isBarracks && !isOgreTower && !isArcherSquad && !isGhost && !isVampire);
    if (completedMagePath) {
      document.getElementById("specialStat").textContent = tower.specialization === "frost" ? "38% group slow" : "Maximum damage";
    } else if (completedBallistaFlame) {
      document.getElementById("specialStat").textContent = "Flaming bolt with a fiery impact";
    } else if (isBarracks) {
      const readyUnits = state.knights.filter(unit => unit.owner === tower && unit.alive && !unit.expired).length;
      if (tower.specialization === "graveyard") document.getElementById("specialStat").textContent = `${readyUnits} / 8 zombies • raises one every 4s`;
      else if (tower.specialization === "gladiators") document.getElementById("specialStat").textContent = `${readyUnits} / 3 gladiators ready`;
      else document.getElementById("specialStat").textContent = `${readyUnits} / ${barracksCapacity(tower)} knights ready`;
    } else if (isOgreTower) {
      document.getElementById("specialStat").textContent = `Throws ${Math.round(stats.knockback / CELL * 10) / 10} tiles backward`;
    } else if (isArcherSquad) {
      document.getElementById("specialStat").textContent = tower.specialization === "riflemen" ? "Heavy 3-shot rifle volley" : tower.specialization === "slingshooters" ? "72 range area boulder" : "3-shot rapid volley";
    } else if (isGhost) {
      document.getElementById("specialStat").textContent = `2s fear, then 4s resistance`;
    } else if (isVampire) {
      if (tower.specialization === "bloodstorm") document.getElementById("specialStat").textContent = "Drains up to 5 enemies at once";
      else if (tower.specialization === "nightspawn") {
        const activeMinions = state.knights.filter(unit => unit.owner === tower && unit.unitType === "vampireMinion" && unit.alive && !unit.expired).length;
        document.getElementById("specialStat").textContent = `${activeMinions} minions • 300 HP • 90 damage`;
      } else document.getElementById("specialStat").textContent = "High-damage single-target blood drain";
    }
  }
  document.getElementById("sellValue").textContent = `${Math.round(tower.spent * .65)} gold`;
}

function showAnnouncement(text) {
  const banner = document.getElementById("announcement");
  banner.textContent = text;
  banner.classList.remove("hidden");
  clearTimeout(announcementTimer);
  announcementTimer = setTimeout(() => banner.classList.add("hidden"), 2200);
}

function showMenuView(view) {
  document.getElementById("mainMenuHome").classList.toggle("hidden", view !== "home");
  document.getElementById("playModeMenu").classList.toggle("hidden", view !== "play");
  document.getElementById("settingsMenu").classList.toggle("hidden", view !== "settings");
  if (view === "settings") updateSettingsMenu();
}

function openMainMenu() {
  state.menuOpen = true;
  state.selectedBuild = null;
  state.selectedRelic = null;
  document.getElementById("mainMenu").classList.remove("hidden");
  document.getElementById("continueGameButton").classList.toggle("hidden", !state.gameStarted || state.ended);
  showMenuView("home");
  updateUI();
}

function resumeGame() {
  if (!state.gameStarted || state.ended) return;
  state.menuOpen = false;
  document.getElementById("mainMenu").classList.add("hidden");
  updateUI();
}

function beginGameMode(mode) {
  resetGame(mode);
  state.gameStarted = true;
  state.menuOpen = false;
  document.getElementById("mainMenu").classList.add("hidden");
  showAnnouncement(mode === "endless" ? "Endless Siege — survive for as long as you can" : "Thirty-Wave Campaign — defend the keep");
  updateUI();
}

function applyGameSettings() {
  graphics3D.setShadowsEnabled(gameSettings.shadows);
  graphics3D.setHealthBarsVisible(gameSettings.healthBars);
  updateSettingsMenu();
}

function updateSettingsMenu() {
  document.querySelector("#shadowsSettingButton em").textContent = gameSettings.shadows ? "On" : "Off";
  document.querySelector("#healthBarsSettingButton em").textContent = gameSettings.healthBars ? "On" : "Off";
  document.querySelector("#cameraSpeedSettingButton em").textContent = gameSettings.cameraSensitivity > 1 ? "Fast" : "Normal";
}

function updateUI() {
  document.getElementById("goldValue").textContent = state.gold;
  document.getElementById("livesValue").textContent = state.lives;
  document.getElementById("waveValue").textContent = state.gameMode === "endless" ? `${state.wave} / ∞` : `${state.wave} / ${CAMPAIGN_WAVE_COUNT}`;
  document.getElementById("objectiveText").textContent = state.gameMode === "endless"
    ? "Defend the keep • Endure the Endless Siege"
    : `Defend the keep • Survive all ${CAMPAIGN_WAVE_COUNT} waves`;
  document.querySelectorAll(".tower-card").forEach(card => {
    const type = card.dataset.tower;
    const cost = placementCost(type);
    card.querySelector(".tower-cost").textContent = cost;
    card.disabled = state.gold < cost;
    card.classList.toggle("selected", state.selectedBuild === type);
  });
  const button = document.getElementById("startWaveButton");
  const campaignComplete = state.gameMode === "campaign" && state.wave >= CAMPAIGN_WAVE_COUNT;
  button.disabled = state.waveActive || campaignComplete || state.ended || state.menuOpen;
  button.firstChild.textContent = state.waveActive ? "Wave underway " : campaignComplete ? "Final wave " : "Begin wave ";
  const nextWaveNumber = state.wave + 1;
  const next = getWaveDefinition(nextWaveNumber);
  const nextEvent = next ? getWaveEvent(nextWaveNumber) : null;
  document.getElementById("nextWaveText").textContent = next ? `${next.name}${nextEvent ? ` • Event: ${nextEvent.name}` : ""}` : "—";
  document.getElementById("waveStatus").textContent = state.waveActive
    ? `${state.activeEvent ? `${state.activeEvent.name} • ` : ""}${state.spawnQueue.length + state.enemies.length} enemies remain in this assault.`
    : state.wave === 0
      ? "Build your defenses before the first assault. Events strike every 6 waves."
      : campaignComplete
        ? "Defeat the remaining invaders."
        : state.gameMode === "endless" && state.wave >= CAMPAIGN_WAVE_COUNT
          ? `Endless cycle ${Math.floor(state.wave / CAMPAIGN_WAVE_COUNT) + 1} awaits. The enemy continues to grow stronger.`
          : "The road is quiet. Prepare when ready.";
  drawWavePreview(next, nextEvent);
  renderInventory();
  if (state.storeOpen) renderMerchantStore();
  if (state.selectedTower) showInspectPanel(state.selectedTower);
  else if (state.selectedTreeId) {
    const selectedTree = state.trees.find(tree => tree.id === state.selectedTreeId);
    if (selectedTree) showTreePanel(selectedTree);
    else showBuildPanel();
  }
}

function drawWavePreview(wave, event = null) {
  const preview = document.getElementById("wavePreview");
  preview.innerHTML = "";
  if (!wave) return;
  if (event) {
    const marker = document.createElement("span");
    marker.className = "event-marker";
    marker.title = `${event.name}: ${event.description}`;
    marker.textContent = "EVENT";
    preview.appendChild(marker);
  }
  const counts = {};
  wave.units.forEach(unit => counts[unit.type] = (counts[unit.type] || 0) + 1);
  if (event) event.units.forEach(unit => counts[unit.type] = (counts[unit.type] || 0) + 1);
  Object.entries(counts).forEach(([type, count]) => {
    const pip = document.createElement("span");
    pip.className = `enemy-pip ${type}`;
    const enemyType = enemyTypes[type];
    pip.title = `${count} ${enemyType.name}${count > 1 ? "s" : ""} • Base HP ${enemyType.hp} • Physical resistance ${Math.round(enemyType.physicalResistance * 100)}% • Magic resistance ${Math.round(enemyType.magicResistance * 100)}%`;
    pip.textContent = `${enemyTypes[type].symbol}${count}`;
    preview.appendChild(pip);
  });
}

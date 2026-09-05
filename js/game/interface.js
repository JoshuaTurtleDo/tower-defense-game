"use strict";

// Build/inspection panels, menus, settings, HUD updates, and wave previews.

function showBuildPanel() {
  document.getElementById("buildPanel").classList.remove("hidden");
  document.getElementById("inspectPanel").classList.add("hidden");
  document.getElementById("treePanel").classList.add("hidden");
  renderInventory();
}

function showFrozenDefenseStatus(tower) {
  if (!tower || tower.freezeTimer <= 0) return;
  const specialRow = document.getElementById("specialStatRow");
  specialRow.classList.remove("hidden");
  document.getElementById("specialStat").textContent = `Frozen solid • disabled for ${tower.freezeTimer.toFixed(1)}s`;
}

function showInspectPanel(tower) {
  state.selectedTower = tower;
  state.selectedTreeId = null;
  state.selectedBuild = null;
  document.querySelectorAll(".tower-card").forEach(card => card.classList.remove("selected"));
  document.getElementById("buildPanel").classList.add("hidden");
  document.getElementById("inspectPanel").classList.remove("hidden");
  document.getElementById("treePanel").classList.add("hidden");
  renderInventory();
  const base = towerTypes[tower.type];
  const emblem = document.getElementById("selectedEmblem");
  emblem.textContent = base.emblem;
  emblem.className = `tower-emblem ${base.className}`;
  document.getElementById("selectedName").textContent = base.name;
  renderEquippedRelics(tower);
  const upgradeButton = document.getElementById("upgradeButton");
  const frostButton = document.getElementById("frostUpgradeButton");
  const graveButton = document.getElementById("graveUpgradeButton");
  const evolvedBoomersButton = document.getElementById("evolvedBoomersUpgradeButton");
  const slingButton = document.getElementById("slingUpgradeButton");
  const stoneThrowButton = document.getElementById("stoneThrowUpgradeButton");
  const zeusBowButton = document.getElementById("zeusBowUpgradeButton");
  const nightspawnButton = document.getElementById("nightspawnUpgradeButton");
  const twinLaserButton = document.getElementById("twinLaserUpgradeButton");
  const massiveBeamButton = document.getElementById("massiveBeamUpgradeButton");
  const branchHint = document.getElementById("branchHint");
  const specialRow = document.getElementById("specialStatRow");
  const damageTypeRow = document.getElementById("damageTypeStatRow");
  const mineControls = document.getElementById("mineControls");
  const treasureCoveButton = document.getElementById("treasureCoveUpgradeButton");
  const isMine = tower.type === "mine";
  const isCastle = tower.type === "castle";
  document.querySelector("#inspectPanel .equipped-relics-panel").classList.toggle("hidden", isCastle);

  upgradeButton.classList.toggle("hidden", isMine || isCastle);
  mineControls.classList.toggle("hidden", !isMine);

  if (isMine) {
    const isTreasureCove = tower.specialization === "treasureCove";
    const relicChance = isTreasureCove ? treasureCoveRelicChance(tower) * 100 : 0;
    const relicChanceLabel = Number.isInteger(relicChance) ? relicChance : relicChance.toFixed(1);
    const mineIncome = tower.workers * MINE_GOLD_PER_WORKER_PER_ROUND * relicMultiplier(tower, "mineIncome");
    const mineIncomeLabel = Number.isInteger(mineIncome) ? mineIncome : mineIncome.toFixed(2).replace(/0+$/, "");
    if (isTreasureCove) {
      emblem.textContent = "◆";
      emblem.className = "tower-emblem treasure-cove-emblem";
      document.getElementById("selectedName").textContent = "Treasure Cove";
    }
    document.getElementById("selectedLevel").textContent = isTreasureCove ? "Relic excavation" : "Economic building";
    document.getElementById("damageLabel").textContent = isTreasureCove ? "Excavation" : "Round payout";
    document.getElementById("rangeLabel").textContent = "Workers";
    document.getElementById("speedLabel").textContent = "Operation";
    document.getElementById("killsLabel").textContent = isTreasureCove ? "Relics unearthed" : "Gold mined";
    document.getElementById("damageStat").textContent = isTreasureCove ? `${relicChanceLabel}% relic / round` : tower.workers ? `${mineIncomeLabel} gold / round` : "No income";
    document.getElementById("rangeStat").textContent = `${tower.workers} / ${MAX_MINE_WORKERS}`;
    document.getElementById("speedStat").textContent = isTreasureCove ? "After wave clear" : "On wave clear";
    document.getElementById("killsStat").textContent = isTreasureCove ? tower.relicsExcavated : tower.goldMined;
    branchHint.classList.add("hidden");
    frostButton.classList.add("hidden");
    graveButton.classList.add("hidden");
    evolvedBoomersButton.classList.add("hidden");
    slingButton.classList.add("hidden");
    stoneThrowButton.classList.add("hidden");
    zeusBowButton.classList.add("hidden");
    nightspawnButton.classList.add("hidden");
    twinLaserButton.classList.add("hidden");
    massiveBeamButton.classList.add("hidden");
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
      ? `Each cleared wave has a ${relicChanceLabel}% chance to uncover a relic. Gold production has stopped.`
      : tower.workers >= MAX_MINE_WORKERS
        ? "The mine is fully staffed. Convert it into a Treasure Cove to excavate relics instead of gold."
        : "Each worker produces 15 gold when the current wave is cleared.";
  } else if (isCastle) {
    const buffedTowers = tinyCastleBuffedTowers(tower);
    document.getElementById("selectedLevel").textContent = "Support structure";
    document.getElementById("damageLabel").textContent = "Aura bonus";
    document.getElementById("rangeLabel").textContent = "Affected tiles";
    document.getElementById("speedLabel").textContent = "Stacking";
    document.getElementById("killsLabel").textContent = "Defenses empowered";
    document.getElementById("damageStat").textContent = "+20% damage, range & speed";
    document.getElementById("rangeStat").textContent = "8 surrounding tiles";
    document.getElementById("speedStat").textContent = "One aura maximum";
    document.getElementById("killsStat").textContent = buffedTowers.length;
    damageTypeRow.classList.add("hidden");
    branchHint.classList.add("hidden");
    frostButton.classList.add("hidden");
    graveButton.classList.add("hidden");
    evolvedBoomersButton.classList.add("hidden");
    slingButton.classList.add("hidden");
    stoneThrowButton.classList.add("hidden");
    zeusBowButton.classList.add("hidden");
    nightspawnButton.classList.add("hidden");
    twinLaserButton.classList.add("hidden");
    massiveBeamButton.classList.add("hidden");
    specialRow.classList.remove("hidden");
    document.getElementById("specialStat").textContent = buffedTowers.length
      ? `${buffedTowers.length} adjacent defense${buffedTowers.length === 1 ? "" : "s"} receiving the Royal Command aura`
      : "Place combat defenses on a neighboring tile to empower them";
  } else {
    const stats = towerStats(tower);
    const isBarracks = tower.type === "barracks";
    const isOgreTower = tower.type === "ogre";
    const isArcherSquad = tower.type === "archer";
    const isGhost = tower.type === "ghost";
    const umbralEmpowered = isGhost && hasRelic(tower, "umbralForm");
    const isVampire = tower.type === "vampire";
    const draculaEmpowered = isVampire && hasRelic(tower, "draculaCloak");
    const isUfo = tower.type === "ufo";
    const isEvolvedBoomers = isBarracks && tower.specialization === "graveyard" && tower.evolvedBoomers;
    const castleBuffed = hasTinyCastleAura(tower);
    const barracksUnit = tower.specialization === "graveyard" ? isEvolvedBoomers ? "Evolved Boomer" : "Zombie" : tower.specialization === "gladiators" ? "Gladiator" : "Knight";
    const damageType = base.damageType;
    const damageTypeStat = document.getElementById("damageTypeStat");
    damageTypeRow.classList.remove("hidden");
    damageTypeStat.textContent = damageType === "magic" ? "Magic" : damageType === "physical" ? "Physical" : "Control";
    damageTypeStat.className = `damage-type ${damageType}`;
    document.getElementById("selectedLevel").textContent = isEvolvedBoomers ? "Level 4 • Evolved" : `Level ${tower.level}`;
    const isToggaWarrior = isOgreTower && tower.specialization === "togga";
    const isStoneThrowOgre = isOgreTower && tower.specialization === "stoneThrow";
    document.getElementById("damageLabel").textContent = umbralEmpowered ? "Possess targets" : isGhost ? "Fear targets" : isBarracks ? `${barracksUnit} damage` : isToggaWarrior ? "Ground-pound damage" : isStoneThrowOgre ? "Direct-hit damage" : isOgreTower ? "Impact damage" : "Damage";
    document.getElementById("rangeLabel").textContent = umbralEmpowered ? "Umbral range" : isGhost ? "Fear range" : isBarracks ? "Command range" : isToggaWarrior ? "Patrol range" : isStoneThrowOgre ? "Blast radius" : isOgreTower ? "Grab range" : "Range";
    document.getElementById("speedLabel").textContent = "Attack time";
    document.getElementById("killsLabel").textContent = umbralEmpowered ? "Enemies possessed" : isGhost ? "Enemies feared" : "Enemies felled";
    document.getElementById("damageStat").textContent = isGhost ? stats.fearCount : Math.round(stats.damage);
    document.getElementById("rangeStat").textContent = isStoneThrowOgre ? `${Math.round(stats.splash / CELL * 10) / 10} tile` : Math.round(stats.range);
    document.getElementById("speedStat").textContent = `${stats.cooldown.toFixed(2)}s`;
    document.getElementById("killsStat").textContent = umbralEmpowered ? tower.enemiesPossessed : isGhost ? tower.enemiesFeared : tower.kills;
    const cost = upgradeCost(tower);
    const choosingMagePath = tower.type === "mage" && tower.level === 2;
    const choosingBarracksPath = tower.type === "barracks" && tower.level === 2;
    const choosingArcherPath = tower.type === "archer" && tower.level === 2;
    const choosingVampirePath = tower.type === "vampire" && tower.level === 2;
    const choosingOgrePath = isOgreTower && tower.level === 2;
    const choosingBallistaPath = tower.type === "ballista" && tower.level === 2;
    const choosingUfoPath = isUfo && tower.level === 2;
    const evolvedCost = evolvedBoomersCost(tower);
    const choosingEvolvedBoomers = evolvedCost !== null;
    const completedMagePath = tower.type === "mage" && tower.level === 3;
    const completedBarracksPath = tower.type === "barracks" && tower.level === 3;
    const completedArcherPath = tower.type === "archer" && tower.level === 3;
    const completedVampirePath = tower.type === "vampire" && tower.level === 3;
    const completedOgrePath = isOgreTower && tower.level === 3;
    const completedBallistaPath = tower.type === "ballista" && tower.level === 3;
    const completedUfoPath = isUfo && tower.level === 3;
    upgradeButton.classList.toggle("hidden", choosingUfoPath || choosingEvolvedBoomers);
    document.getElementById("selectedName").textContent = isEvolvedBoomers ? "Evolved Boomers" : isToggaWarrior ? "Togga's Strongest Warrior" : isStoneThrowOgre ? "StoneThrow Ogre" : umbralEmpowered ? "Umbral Horror" : draculaEmpowered ? "Dracula Vampire" : completedArcherPath ? tower.specialization === "slingshooters" ? "Royal Slingshooters" : "Royal Riflemen" : completedBallistaPath ? tower.specialization === "zeusBow" ? "Zeus's Bow" : "Flame Bazooka" : completedUfoPath ? tower.specialization === "twinlaser" ? "Twin-Laser UFO" : "Massive-Beam UFO" : base.name;
    document.getElementById("upgradeLabel").textContent = choosingMagePath ? "Arcane Path" : choosingBarracksPath ? "Gladiator Path" : choosingArcherPath ? "Riflemen Path" : choosingVampirePath ? "Bloodstorm Path" : choosingOgrePath ? "Togga's Strongest Warrior" : choosingBallistaPath ? "Flame Bazooka" : choosingUfoPath ? "UFO Path" : completedMagePath ? `${tower.specialization === "frost" ? "Frost" : "Arcane"} Path` : completedBarracksPath ? `${tower.specialization === "graveyard" ? "Gravestone" : "Gladiator"} Path` : completedArcherPath ? `${tower.specialization === "slingshooters" ? "Slingshooter" : "Riflemen"} Path` : completedVampirePath ? `${tower.specialization === "nightspawn" ? "Nightspawn" : "Bloodstorm"} Path` : completedOgrePath ? `${tower.specialization === "togga" ? "Togga Warrior" : "StoneThrow"} Path` : completedBallistaPath ? `${tower.specialization === "zeusBow" ? "Zeus's Bow" : "Flame Bazooka"} Path` : completedUfoPath ? `${tower.specialization === "twinlaser" ? "Twin Lasers" : "Massive Beam"} Path` : "Upgrade";
    document.getElementById("upgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    upgradeButton.disabled = cost === null || state.gold < cost;
    branchHint.classList.toggle("hidden", !choosingMagePath && !choosingBarracksPath && !choosingArcherPath && !choosingVampirePath && !choosingOgrePath && !choosingBallistaPath && !choosingUfoPath && !choosingEvolvedBoomers);
    branchHint.textContent = choosingMagePath ? "Choose this wizard's final discipline. This choice is permanent." : choosingBarracksPath ? "Choose this barracks' final warband. This choice is permanent." : choosingArcherPath ? "Choose this squad's final weapon. This choice is permanent." : choosingVampirePath ? "Choose this Vampire's final blood discipline. This choice is permanent." : choosingOgrePath ? "Choose Togga's permanent final fighting style." : choosingBallistaPath ? "Choose this Ballista's permanent final ammunition." : choosingEvolvedBoomers ? "Further evolve the Gravestone's Zombies into volatile Boomers." : "Choose this UFO's final weapon. This choice is permanent.";
    frostButton.classList.toggle("hidden", !choosingMagePath);
    document.getElementById("frostUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    frostButton.disabled = cost === null || state.gold < cost;
    graveButton.classList.toggle("hidden", !choosingBarracksPath);
    document.getElementById("graveUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    graveButton.disabled = cost === null || state.gold < cost;
    evolvedBoomersButton.classList.toggle("hidden", !choosingEvolvedBoomers);
    document.getElementById("evolvedBoomersUpgradeCost").textContent = evolvedCost === null ? "Purchased" : `${evolvedCost} gold`;
    evolvedBoomersButton.disabled = evolvedCost === null || state.gold < evolvedCost;
    slingButton.classList.toggle("hidden", !choosingArcherPath);
    document.getElementById("slingUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    slingButton.disabled = cost === null || state.gold < cost;
    stoneThrowButton.classList.toggle("hidden", !choosingOgrePath);
    document.getElementById("stoneThrowUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    stoneThrowButton.disabled = cost === null || state.gold < cost;
    zeusBowButton.classList.toggle("hidden", !choosingBallistaPath);
    document.getElementById("zeusBowUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    zeusBowButton.disabled = cost === null || state.gold < cost;
    nightspawnButton.classList.toggle("hidden", !choosingVampirePath);
    document.getElementById("nightspawnUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    nightspawnButton.disabled = cost === null || state.gold < cost;
    twinLaserButton.classList.toggle("hidden", !choosingUfoPath);
    document.getElementById("twinLaserUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    twinLaserButton.disabled = cost === null || state.gold < cost;
    massiveBeamButton.classList.toggle("hidden", !choosingUfoPath);
    document.getElementById("massiveBeamUpgradeCost").textContent = cost === null ? "Max level" : `${cost} gold`;
    massiveBeamButton.disabled = cost === null || state.gold < cost;
    const hasOwnSpecial = completedMagePath || completedBallistaPath || completedUfoPath || isBarracks || isOgreTower || isArcherSquad || isGhost || isVampire;
    specialRow.classList.toggle("hidden", !hasOwnSpecial && !castleBuffed);
    if (completedMagePath) {
      document.getElementById("specialStat").textContent = tower.specialization === "frost"
        ? `${Math.round(towerTypes.mage.frostSlowStrength * 100)}% slow in a 1-tile blast for ${towerTypes.mage.frostSlowDuration}s`
        : "+20% damage • 5 half-tile chain hits at 20% each";
    } else if (completedBallistaPath) {
      document.getElementById("specialStat").textContent = tower.specialization === "zeusBow"
        ? "3s shock: +10% damage taken • 0.2s stun"
        : "2s burn: 50% of initial hit damage";
    } else if (isBarracks) {
      const readyUnits = state.knights.filter(unit => unit.owner === tower && unit.alive && !unit.expired).length;
      if (isEvolvedBoomers) document.getElementById("specialStat").textContent = `${readyUnits} / 8 Boomers • 150 death damage • 0.5-tile blast • 5s goo`;
      else if (tower.specialization === "graveyard") document.getElementById("specialStat").textContent = `${readyUnits} / 8 zombies • raises one every 4s`;
      else if (tower.specialization === "gladiators") document.getElementById("specialStat").textContent = `${readyUnits} / 3 gladiators ready`;
      else document.getElementById("specialStat").textContent = `${readyUnits} / ${barracksCapacity(tower)} knights ready`;
    } else if (isOgreTower) {
      if (isToggaWarrior) {
        const unit = ensureToggaWarrior(tower);
        const status = !unit.alive ? `respawning in ${Math.ceil(unit.respawnTimer)}s` : unit.retreating ? `recovering for ${Math.ceil(unit.retreatTimer)}s` : state.waveActive ? `blocking ${unit.engagedEnemies.length} / ${towerTypes.ogre.warriorBlockers}` : "waiting at his tile";
        document.getElementById("specialStat").textContent = `${Math.ceil(unit.hp)} / ${unit.maxHp} HP • ${status} • hits 6 + 1s stun`;
      } else if (isStoneThrowOgre) {
        document.getElementById("specialStat").textContent = `${Math.round(stats.splashDamage)} splash damage • boulder returns after every throw`;
      } else document.getElementById("specialStat").textContent = `Throws ${Math.round(stats.knockback / CELL * 10) / 10} tiles backward`;
    } else if (isArcherSquad) {
      document.getElementById("specialStat").textContent = tower.specialization === "riflemen" ? "Heavy 3-shot rifle volley" : tower.specialization === "slingshooters" ? "72 range area boulder" : "3-shot rapid volley";
    } else if (isGhost) {
      document.getElementById("specialStat").textContent = umbralEmpowered
        ? `4s possession • enemies attack allies • bosses feared ${UMBRAL_BOSS_FEAR_DURATION}s`
        : `2s fear • 4s normal / 8s boss resistance`;
    } else if (isVampire) {
      if (draculaEmpowered) {
        const retainedPath = tower.specialization === "bloodstorm" ? "Bloodstorm 5-target drain" : tower.specialization === "nightspawn" ? "Nightspawn minions" : "Single-target drain";
        document.getElementById("specialStat").textContent = `Dracula • ${retainedPath} • 5-bat curse / 8s`;
      }
      else if (tower.specialization === "bloodstorm") document.getElementById("specialStat").textContent = "Drains up to 5 enemies at once";
      else if (tower.specialization === "nightspawn") {
        const activeMinions = state.knights.filter(unit => unit.owner === tower && unit.unitType === "vampireMinion" && unit.alive && !unit.expired).length;
        document.getElementById("specialStat").textContent = `${activeMinions} minions • 300 HP • 90 damage`;
      } else document.getElementById("specialStat").textContent = "High-damage single-target blood drain";
    } else if (isUfo) {
      if (tower.specialization === "twinlaser") document.getElementById("specialStat").textContent = "Twin rapid lasers: green + red";
      else if (tower.specialization === "massivebeam") document.getElementById("specialStat").textContent = "Massive laser with 105 area splash";
      else document.getElementById("specialStat").textContent = "Rapid green laser fire";
    } else if (castleBuffed) {
      document.getElementById("specialStat").textContent = "Tiny Castle aura: +20% damage, range & attack speed";
    }
    if (castleBuffed && hasOwnSpecial) document.getElementById("specialStat").textContent += " • Tiny Castle aura active";
  }
  showFrozenDefenseStatus(tower);
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
  showAnnouncement(mode === "endless" ? "Endless Siege — survive for as long as you can" : "Forty-Wave Campaign — defend the keep");
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

"use strict";

// Merchant relic store, inventory/equipment, and removable tree obstacles.

function merchantStockCounts() {
  const encounter = state.merchantEncounterCount || Math.max(1, Math.ceil(state.wave / 6));
  if (encounter <= 1) return { common: 5, rare: 0, epic: 0, unique: 0 };

  // Five-slot shops begin with the second Merchant's guaranteed 3 Rares and
  // 1 Epic. Each purchase replaces the weakest remaining slot with a higher
  // tier, culminating in 4 Epics and 1 Unique at maximum favour.
  const progression = Math.min(MAX_MERCHANT_FAVOUR, state.merchantRelicsPurchased || 0);
  return [
    { common: 1, rare: 3, epic: 1, unique: 0 },
    { common: 0, rare: 3, epic: 2, unique: 0 },
    { common: 0, rare: 2, epic: 3, unique: 0 },
    { common: 0, rare: 1, epic: 4, unique: 0 },
    { common: 0, rare: 0, epic: 5, unique: 0 },
    { common: 0, rare: 0, epic: 4, unique: 1 }
  ][progression];
}

function takeRotatingRelics(pool, count, offset) {
  if (!pool.length || count <= 0) return [];
  const selected = [];
  for (let index = 0; index < Math.min(count, pool.length); index++) {
    selected.push(pool[(offset + index) % pool.length]);
  }
  return selected;
}

function createMerchantStock() {
  const counts = merchantStockCounts();
  const encounter = state.merchantEncounterCount || Math.max(1, Math.ceil(state.wave / 6));
  const purchases = state.merchantRelicsPurchased || 0;
  const pools = { common: [], rare: [], epic: [], unique: [] };
  for (const [type, relic] of Object.entries(merchantRelics)) pools[relic.tier || "common"].push(type);

  const stock = [
    ...takeRotatingRelics(pools.common, counts.common, encounter + purchases),
    ...takeRotatingRelics(pools.rare, counts.rare, encounter * 2 + purchases),
    ...takeRotatingRelics(pools.epic, counts.epic, encounter * 3 + purchases),
    ...takeRotatingRelics(pools.unique, counts.unique, encounter * 5 + purchases)
  ];
  return stock.slice(0, MAX_MERCHANT_RELICS);
}

function openMerchantStore() {
  state.merchantStorePending = false;
  state.storeOpen = true;
  state.merchantStoreOffering = createMerchantStock();
  state.merchantStoreStock = [...state.merchantStoreOffering];
  state.selectedRelic = null;
  document.getElementById("merchantStoreModal").classList.remove("hidden");
  renderMerchantStore();
  renderInventory();
}

function queueMerchantStore() {
  state.merchantStorePending = true;
  if (state.bossDefeatedThisWave) openMerchantStore();
  else showAnnouncement("Merchant defeated — defeat the event boss to unlock his relic shop");
}

function recordBossDefeat(enemy) {
  if (state.merchantStoreGateType && enemy?.type !== state.merchantStoreGateType) return;
  state.bossDefeatedThisWave = true;
  if (state.merchantStorePending) openMerchantStore();
}

function closeMerchantStore() {
  state.storeOpen = false;
  document.getElementById("merchantStoreModal").classList.add("hidden");
  updateUI();
}
function buyMerchantRelic(type) {
  const relic = merchantRelics[type];
  if (!state.storeOpen || !relic || state.merchantStoreStock.length !== state.merchantStoreOffering.length || !state.merchantStoreStock.includes(type) || state.gold < relic.cost) return;
  state.gold -= relic.cost;
  state.inventory.push(type);
  state.merchantRelicsPurchased++;
  // Each Merchant's visit allows exactly one purchase. Emptying the stock
  // also makes every remaining card visibly unavailable in the refreshed UI.
  state.merchantStoreStock = [];
  showAnnouncement(`${relic.name} added to your relic satchel`);
  renderMerchantStore();
  updateUI();
}

function renderMerchantStore() {
  const list = document.getElementById("merchantStoreItems");
  if (!list) return;
  document.getElementById("merchantStoreGold").textContent = state.gold;
  list.innerHTML = "";
  for (const type of state.merchantStoreOffering) {
    const relic = merchantRelics[type];
    const available = state.merchantStoreStock.includes(type);
    const button = document.createElement("button");
    const tier = relic.tier || "common";
    button.className = `merchant-item-card relic-tier-${tier}`;
    button.dataset.relic = type;
    button.disabled = !available || state.gold < relic.cost;
    button.innerHTML = `<span class="merchant-item-icon">${relic.icon}</span><span class="merchant-item-copy"><strong>${relic.name}</strong><span class="relic-tier-label">${tier}</span><small>${relic.description}</small></span><span class="merchant-item-price">${available ? `${relic.cost} gold` : "Sold out"}</span>`;
    button.addEventListener("click", () => buyMerchantRelic(type));
    list.appendChild(button);
  }

  const favour = Math.min(state.merchantRelicsPurchased || 0, MAX_MERCHANT_FAVOUR);
  const percent = favour / MAX_MERCHANT_FAVOUR * 100;
  const track = document.getElementById("merchantFavourTrack");
  document.getElementById("merchantFavourValue").textContent = `${favour} / ${MAX_MERCHANT_FAVOUR}`;
  document.getElementById("merchantFavourFill").style.width = `${percent}%`;
  track.setAttribute("aria-valuenow", favour);
  const purchaseLimitReached = state.merchantStoreOffering.length > 0 && state.merchantStoreStock.length === 0;
  document.getElementById("merchantFavourHint").textContent = purchaseLimitReached
    ? "One relic claimed — this Merchant's shop is closed."
    : favour >= MAX_MERCHANT_FAVOUR
    ? "Maximum favour — future shops offer the strongest available relic mix."
    : favour === 0
      ? "Choose one relic to claim and earn Merchant favour."
      : `${MAX_MERCHANT_FAVOUR - favour} more purchase${MAX_MERCHANT_FAVOUR - favour === 1 ? "" : "s"} to reach maximum favour.`;
}

function hideRelicTooltip() {
  const tooltip = document.getElementById("relicTooltip");
  if (!tooltip) return;
  tooltip.classList.remove("visible");
  tooltip.setAttribute("aria-hidden", "true");
}

function showRelicTooltip(element, type) {
  const relic = merchantRelics[type];
  const tooltip = document.getElementById("relicTooltip");
  if (!relic || !tooltip) return;
  const tier = relic.tier || "common";
  tooltip.className = `relic-tooltip relic-tooltip-${tier}`;
  tooltip.innerHTML = `<strong>${relic.name}</strong><span>${tier} relic</span><p>${relic.description}</p>`;
  tooltip.setAttribute("aria-hidden", "false");
  tooltip.classList.add("visible");
  const rect = element.getBoundingClientRect();
  const width = 220;
  const maxLeft = Math.max(10, window.innerWidth - width - 10);
  const left = Math.min(maxLeft, Math.max(10, rect.left));
  const tooltipHeight = tooltip.offsetHeight || 72;
  const top = rect.bottom + tooltipHeight < window.innerHeight ? rect.bottom + 8 : rect.top - tooltipHeight - 8;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(10, top)}px`;
}

function bindRelicTooltip(element, type) {
  if (!type) return;
  element.addEventListener("mouseenter", () => showRelicTooltip(element, type));
  element.addEventListener("mouseleave", hideRelicTooltip);
  element.addEventListener("focus", () => showRelicTooltip(element, type));
  element.addEventListener("blur", hideRelicTooltip);
}

function renderInventory() {
  const list = document.getElementById("relicInventoryItems");
  if (!list) return;
  hideRelicTooltip();
  const counts = {};
  state.inventory.forEach(type => counts[type] = (counts[type] || 0) + 1);
  const activeDefense = state.selectedTower && state.towers.includes(state.selectedTower) ? state.selectedTower : null;
  const inventoryPanel = document.getElementById("relicInventoryPanel");
  inventoryPanel?.classList.toggle("active", Boolean(activeDefense));
  document.getElementById("relicInventoryCount").textContent = `${state.inventory.length}`;
  list.innerHTML = "";
  for (const [type, count] of Object.entries(counts)) {
    const relic = merchantRelics[type];
    const button = document.createElement("button");
    const tier = relic.tier || "common";
    button.className = `relic-chip relic-tier-${tier}`;
    button.draggable = Boolean(activeDefense);
    button.title = activeDefense
      ? `${tier[0].toUpperCase()}${tier.slice(1)} ${relic.name}: ${relic.description}. Click to equip or drag to a slot.`
      : `${tier[0].toUpperCase()}${tier.slice(1)} ${relic.name}: ${relic.description}. Select a defense first.`;
    button.innerHTML = `<span>${relic.icon}</span><strong>${count}</strong>`;
    bindRelicTooltip(button, type);
    button.addEventListener("click", () => {
      if (!activeDefense) {
        showAnnouncement("Select a defense before equipping a relic");
        return;
      }
      equipRelic(activeDefense, type);
    });
    button.addEventListener("dragstart", event => {
      if (!activeDefense) {
        event.preventDefault();
        return;
      }
      event.dataTransfer?.setData("text/relic-type", type);
      event.dataTransfer?.setData("text/plain", type);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
      button.classList.add("dragging");
    });
    button.addEventListener("dragend", () => button.classList.remove("dragging"));
    list.appendChild(button);
  }
  document.getElementById("relicInventoryHint").textContent = activeDefense
    ? state.inventory.length ? `Equipping to ${towerTypes[activeDefense.type].name} • click a relic or drag it to a slot.` : "This defense has no relics available in your satchel."
    : state.inventory.length ? "Select a defense to equip a relic." : "Defeat an Event Merchant or establish a Treasure Cove to uncover relics.";
}

function excavateTreasureCoveRelic(cove) {
  const relicTypes = Object.keys(merchantRelics).filter(type => (merchantRelics[type].tier || "common") === "common");
  const type = relicTypes[Math.floor(Math.random() * relicTypes.length)];
  const relic = merchantRelics[type];
  state.inventory.push(type);
  cove.relicsExcavated++;
  burst(cove.x, cove.y, relic.color, 20);
  showAnnouncement(`Treasure Cove uncovered a ${relic.name}!`);
  renderInventory();
  updateUI();
  return type;
}

function rollTreasureCoveRoundRelics() {
  let produced = 0;
  for (const cove of state.towers) {
    if (cove.type !== "mine" || cove.specialization !== "treasureCove" || cove.workers <= 0 || cove.freezeTimer > 0) continue;
    if (Math.random() < treasureCoveRelicChance(cove)) {
      excavateTreasureCoveRelic(cove);
      produced++;
    }
  }
  return produced;
}

function refreshBarracksRelicHealth(tower) {
  if (tower.type !== "barracks") return;
  for (const unit of state.knights.filter(knight => knight.owner === tower && !knight.expired)) {
    const oldMax = unit.maxHp || 1;
    const ratio = unit.alive ? unit.hp / oldMax : 0;
    unit.maxHp = knightMaxHp(tower);
    unit.hp = unit.alive ? Math.max(1, Math.round(unit.maxHp * ratio)) : 0;
  }
}

function equipSelectedRelic(tower) {
  return equipRelic(tower, state.selectedRelic);
}

function equipRelic(tower, type) {
  const relic = merchantRelics[type];
  if (!tower || !relic || !state.inventory.includes(type)) return false;
  tower.items ||= [];
  if (tower.items.length >= MAX_RELICS_PER_TOWER) {
    showAnnouncement("This defense already carries the maximum of 3 relics");
    return false;
  }
  if (tower.items.includes(type)) {
    showAnnouncement("A defense can only carry one of each relic");
    return false;
  }
  if (!relic.allowed(tower)) {
    showAnnouncement(`${relic.name} is not compatible with ${towerTypes[tower.type].name}`);
    return false;
  }
  state.inventory.splice(state.inventory.indexOf(type), 1);
  tower.items.push(type);
  state.selectedRelic = null;
  refreshBarracksRelicHealth(tower);
  burst(tower.x, tower.y, "#ffd978", 16);
  showAnnouncement(`${relic.name} equipped to ${towerTypes[tower.type].name}`);
  showInspectPanel(tower);
  updateUI();
  return true;
}

function unequipRelic(tower, index) {
  if (!tower?.items?.[index]) return;
  const [type] = tower.items.splice(index, 1);
  state.inventory.push(type);
  refreshBarracksRelicHealth(tower);
  showAnnouncement(`${merchantRelics[type].name} returned to your satchel`);
  showInspectPanel(tower);
  updateUI();
}

function renderEquippedRelics(tower) {
  const list = document.getElementById("equippedRelics");
  if (!list) return;
  hideRelicTooltip();
  tower.items ||= [];
  document.getElementById("equippedRelicCount").textContent = `${tower.items.length} / ${MAX_RELICS_PER_TOWER}`;
  list.innerHTML = "";
  for (let slot = 0; slot < MAX_RELICS_PER_TOWER; slot++) {
    const type = tower.items[slot];
    const button = document.createElement("button");
    button.className = `equipped-relic-slot${type ? ` filled relic-tier-${merchantRelics[type]?.tier || "common"}` : ""}`;
    if (type) {
      const relic = merchantRelics[type];
      button.textContent = relic.icon;
      const tier = relic.tier || "common";
      button.title = `${tier[0].toUpperCase()}${tier.slice(1)} ${relic.name}: ${relic.description}. Click to unequip.`;
      bindRelicTooltip(button, type);
      button.addEventListener("click", () => unequipRelic(tower, slot));
    } else {
      button.textContent = "+";
      button.title = "Empty relic slot — drop a relic here";
    }
    button.addEventListener("dragover", event => {
      event.preventDefault();
      button.classList.add("drag-over");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    });
    button.addEventListener("dragleave", () => button.classList.remove("drag-over"));
    button.addEventListener("drop", event => {
      event.preventDefault();
      button.classList.remove("drag-over");
      const droppedType = event.dataTransfer?.getData("text/relic-type") || event.dataTransfer?.getData("text/plain");
      if (droppedType) equipRelic(tower, droppedType);
    });
    list.appendChild(button);
  }
}

function showTreePanel(tree) {
  if (!tree) return;
  state.selectedTower = null;
  state.selectedBuild = null;
  state.selectedTreeId = tree.id;
  document.querySelectorAll(".tower-card").forEach(card => card.classList.remove("selected"));
  document.getElementById("buildPanel").classList.add("hidden");
  document.getElementById("inspectPanel").classList.add("hidden");
  document.getElementById("treePanel").classList.remove("hidden");
  document.getElementById("treeTileStat").textContent = `${tree.col + 1}, ${tree.row + 1}`;
  document.getElementById("digUpTreeButton").disabled = state.gold < TREE_REMOVAL_COST;
}

function digUpTree() {
  const tree = state.trees.find(item => item.id === state.selectedTreeId);
  if (!tree || state.gold < TREE_REMOVAL_COST) return;
  state.gold -= TREE_REMOVAL_COST;
  state.trees = state.trees.filter(item => item !== tree);
  state.selectedTreeId = null;
  burst(tree.x * CELL, tree.z * CELL, "#6f4b2d", 18);
  burst(tree.x * CELL, tree.z * CELL, "#4f873e", 12);
  showAnnouncement("Tree dug up — this tile is now open");
  showBuildPanel();
  updateUI();
}

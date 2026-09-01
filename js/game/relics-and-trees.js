"use strict";

// Merchant relic store, inventory/equipment, and removable tree obstacles.

function openMerchantStore() {
  state.storeOpen = true;
  state.merchantStoreStock = Object.keys(merchantRelics);
  state.selectedRelic = null;
  document.getElementById("merchantStoreModal").classList.remove("hidden");
  renderMerchantStore();
  renderInventory();
}

function closeMerchantStore() {
  state.storeOpen = false;
  document.getElementById("merchantStoreModal").classList.add("hidden");
  updateUI();
}
function buyMerchantRelic(type) {
  const relic = merchantRelics[type];
  if (!state.storeOpen || !relic || !state.merchantStoreStock.includes(type) || state.gold < relic.cost) return;
  state.gold -= relic.cost;
  state.inventory.push(type);
  state.merchantStoreStock = state.merchantStoreStock.filter(item => item !== type);
  showAnnouncement(`${relic.name} added to your relic satchel`);
  renderMerchantStore();
  updateUI();
}

function renderMerchantStore() {
  const list = document.getElementById("merchantStoreItems");
  if (!list) return;
  document.getElementById("merchantStoreGold").textContent = state.gold;
  list.innerHTML = "";
  for (const [type, relic] of Object.entries(merchantRelics)) {
    const available = state.merchantStoreStock.includes(type);
    const button = document.createElement("button");
    button.className = "merchant-item-card";
    button.dataset.relic = type;
    button.disabled = !available || state.gold < relic.cost;
    button.innerHTML = `<span class="merchant-item-icon">${relic.icon}</span><span class="merchant-item-copy"><strong>${relic.name}</strong><small>${relic.description}</small></span><span class="merchant-item-price">${available ? `${relic.cost} gold` : "Sold"}</span>`;
    button.addEventListener("click", () => buyMerchantRelic(type));
    list.appendChild(button);
  }
}

function renderInventory() {
  const list = document.getElementById("relicInventoryItems");
  if (!list) return;
  const counts = {};
  state.inventory.forEach(type => counts[type] = (counts[type] || 0) + 1);
  if (!counts[state.selectedRelic]) state.selectedRelic = null;
  document.getElementById("relicInventoryCount").textContent = `${state.inventory.length}`;
  list.innerHTML = "";
  for (const [type, count] of Object.entries(counts)) {
    const relic = merchantRelics[type];
    const button = document.createElement("button");
    button.className = `relic-chip${state.selectedRelic === type ? " selected" : ""}`;
    button.title = `${relic.name}: ${relic.description}. Select, then click a compatible defense.`;
    button.innerHTML = `<span>${relic.icon}</span><strong>${count}</strong>`;
    button.addEventListener("click", () => {
      state.selectedRelic = state.selectedRelic === type ? null : type;
      state.selectedBuild = null;
      document.querySelectorAll(".tower-card").forEach(card => card.classList.remove("selected"));
      renderInventory();
      showAnnouncement(state.selectedRelic ? `${relic.name} selected — click a defense to equip it` : "Relic placement cancelled");
    });
    list.appendChild(button);
  }
  document.getElementById("relicInventoryHint").textContent = state.selectedRelic
    ? `${merchantRelics[state.selectedRelic].name} selected • click a defense`
    : state.inventory.length ? "Select a relic, then click a defense to equip it." : "Defeat a Boss Merchant or establish a Treasure Cove to uncover relics.";
}

function excavateTreasureCoveRelic(cove) {
  const relicTypes = Object.keys(merchantRelics);
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
  const type = state.selectedRelic;
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
  tower.items ||= [];
  document.getElementById("equippedRelicCount").textContent = `${tower.items.length} / ${MAX_RELICS_PER_TOWER}`;
  list.innerHTML = "";
  for (let slot = 0; slot < MAX_RELICS_PER_TOWER; slot++) {
    const type = tower.items[slot];
    const button = document.createElement("button");
    button.className = `equipped-relic-slot${type ? " filled" : ""}`;
    if (type) {
      const relic = merchantRelics[type];
      button.textContent = relic.icon;
      button.title = `${relic.name}: ${relic.description}. Click to unequip.`;
      button.addEventListener("click", () => unequipRelic(tower, slot));
    } else {
      button.textContent = "+";
      button.title = "Empty relic slot";
      button.disabled = true;
    }
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

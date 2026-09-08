"use strict";

// Persistent account progression: resource rewards and the nine-branch passive tree.

const PASSIVE_PROFILE_KEY = "stonewatch-keep-passive-tree-v1";
const PASSIVE_RESOURCES = {
  emeralds: { name: "Emeralds", icon: "◆", className: "emerald" },
  sapphires: { name: "Sapphires", icon: "◇", className: "sapphire" },
  rubies: { name: "Rubies", icon: "♦", className: "ruby" }
};

const PASSIVE_TREE_BRANCHES = [
  { id: "marksman", name: "Marksman's Reach", target: "archer", direction: "North", nodes: [
    { id: "archer_damage_1", name: "Keen Fletching", description: "+4% Royal Archer damage", costs: { rubies: 3, sapphires: 1 }, effects: { damage: 1.04 } },
    { id: "archer_damage_2", name: "Barbed Shafts", description: "+8% Royal Archer damage", costs: { rubies: 6, sapphires: 2 }, effects: { damage: 1.08 } },
    { id: "archer_damage_3", name: "Eagle Volley", description: "+14% Royal Archer damage", costs: { rubies: 12, sapphires: 3 }, effects: { damage: 1.14 } }
  ] },
  { id: "arcana", name: "Arcane Wisdom", target: "mage", direction: "Northeast", nodes: [
    { id: "mage_range_1", name: "Clear Sight", description: "+4% Royal Wizard range", costs: { rubies: 3, sapphires: 1 }, effects: { range: 1.04 } },
    { id: "mage_range_2", name: "Runic Focus", description: "+8% Royal Wizard range", costs: { rubies: 6, sapphires: 2 }, effects: { range: 1.08 } },
    { id: "mage_range_3", name: "Astral Reach", description: "+14% Royal Wizard range", costs: { rubies: 12, sapphires: 3 }, effects: { range: 1.14 } }
  ] },
  { id: "siegecraft", name: "Siegecraft", target: "ballista", direction: "East-Northeast", nodes: [
    { id: "ballista_damage_1", name: "True Aim", description: "+4% Royal Ballista damage", costs: { rubies: 3, sapphires: 1 }, effects: { damage: 1.04 } },
    { id: "ballista_damage_2", name: "Braced Limbs", description: "+9% Royal Ballista damage", costs: { rubies: 6, sapphires: 2 }, effects: { damage: 1.09 } },
    { id: "ballista_damage_3", name: "Siege Mastery", description: "+15% Royal Ballista damage", costs: { rubies: 12, sapphires: 3 }, effects: { damage: 1.15 } }
  ] },
  { id: "legion", name: "Royal Legion", target: "barracks", direction: "Southeast", nodes: [
    { id: "barracks_health_1", name: "Drilled Recruits", description: "+5% Barracks troop health", costs: { rubies: 3, sapphires: 1 }, effects: { troopHealth: 1.05 } },
    { id: "barracks_health_2", name: "Hardened Shields", description: "+10% Barracks troop health", costs: { rubies: 6, sapphires: 2 }, effects: { troopHealth: 1.10 } },
    { id: "barracks_health_3", name: "Unbroken Line", description: "+18% Barracks troop health", costs: { rubies: 12, sapphires: 3 }, effects: { troopHealth: 1.18 } }
  ] },
  { id: "stoneblood", name: "Stoneblood", target: "ogre", direction: "South", nodes: [
    { id: "ogre_damage_1", name: "Heavy Knuckles", description: "+5% Stoneback Ogre damage", costs: { rubies: 3, sapphires: 1 }, effects: { damage: 1.05 } },
    { id: "ogre_damage_2", name: "Granite Grip", description: "+10% Stoneback Ogre damage", costs: { rubies: 6, sapphires: 2 }, effects: { damage: 1.10 } },
    { id: "ogre_damage_3", name: "Mountain Might", description: "+18% Stoneback Ogre damage", costs: { rubies: 12, sapphires: 3 }, effects: { damage: 1.18 } }
  ] },
  { id: "veil", name: "Veilwalking", target: "ghost", direction: "Southwest", nodes: [
    { id: "ghost_range_1", name: "Whispering Veil", description: "+5% Dread Ghost range", costs: { rubies: 3, sapphires: 1 }, effects: { range: 1.05 } },
    { id: "ghost_range_2", name: "Long Haunting", description: "+10% Dread Ghost range", costs: { rubies: 6, sapphires: 2 }, effects: { range: 1.10 } },
    { id: "ghost_range_3", name: "Endless Shadow", description: "+18% Dread Ghost range", costs: { rubies: 12, sapphires: 3 }, effects: { range: 1.18 } }
  ] },
  { id: "bloodcourt", name: "Blood Court", target: "vampire", direction: "West-Southwest", nodes: [
    { id: "vampire_damage_1", name: "Hungry Fangs", description: "+5% Crimson Vampire damage", costs: { rubies: 3, sapphires: 1 }, effects: { damage: 1.05 } },
    { id: "vampire_damage_2", name: "Crimson Veins", description: "+10% Crimson Vampire damage", costs: { rubies: 6, sapphires: 2 }, effects: { damage: 1.10 } },
    { id: "vampire_damage_3", name: "Night Sovereign", description: "+18% Crimson Vampire damage", costs: { rubies: 12, sapphires: 3 }, effects: { damage: 1.18 } }
  ] },
  { id: "starfall", name: "Starfall", target: "ufo", direction: "West-Northwest", nodes: [
    { id: "ufo_speed_1", name: "Charged Coils", description: "4% faster Alien UFO attacks", costs: { rubies: 3, sapphires: 1 }, effects: { cooldown: .96 } },
    { id: "ufo_speed_2", name: "Ion Drive", description: "8% faster Alien UFO attacks", costs: { rubies: 6, sapphires: 2 }, effects: { cooldown: .92 } },
    { id: "ufo_speed_3", name: "Singularity Engine", description: "14% faster Alien UFO attacks", costs: { rubies: 12, sapphires: 3 }, effects: { cooldown: .86 } }
  ] },
  { id: "crown", name: "Crown of Stonewatch", target: "castle", direction: "Northwest", nodes: [
    { id: "castle_aura_1", name: "Royal Foundation", description: "+5% Tiny Castle aura strength", costs: { rubies: 3, sapphires: 1 }, effects: { aura: .05 } },
    { id: "castle_aura_2", name: "Blessed Masonry", description: "+10% Tiny Castle aura strength", costs: { rubies: 6, sapphires: 2 }, effects: { aura: .10 } },
    { id: "castle_cannon", name: "Keepwatch Cannon", description: "Tiny Castle gains a 200-damage area cannon", special: "castleCannon", costs: { emeralds: 1, sapphires: 4 }, effects: {} }
  ] }
];

const PASSIVE_TREE_NODE_LOOKUP = new Map(PASSIVE_TREE_BRANCHES.flatMap(branch => branch.nodes.map((node, index) => [node.id, { branch, node, index }])));
let passiveTreeReturnView = "menu";

function defaultPassiveProfile() {
  return { emeralds: 0, sapphires: 0, rubies: 0, nodes: {}, lifetimeDamage: 0, completedRuns: 0 };
}

function loadPassiveProfile() {
  const fallback = defaultPassiveProfile();
  try {
    const saved = JSON.parse(localStorage.getItem(PASSIVE_PROFILE_KEY) || "null");
    if (!saved || typeof saved !== "object") return fallback;
    return {
      ...fallback,
      emeralds: Math.max(0, Math.floor(Number(saved.emeralds) || 0)),
      sapphires: Math.max(0, Math.floor(Number(saved.sapphires) || 0)),
      rubies: Math.max(0, Math.floor(Number(saved.rubies) || 0)),
      nodes: saved.nodes && typeof saved.nodes === "object" ? saved.nodes : {},
      lifetimeDamage: Math.max(0, Number(saved.lifetimeDamage) || 0),
      completedRuns: Math.max(0, Math.floor(Number(saved.completedRuns) || 0))
    };
  } catch {
    return fallback;
  }
}

const passiveProfile = loadPassiveProfile();

function savePassiveProfile() {
  try { localStorage.setItem(PASSIVE_PROFILE_KEY, JSON.stringify(passiveProfile)); } catch { /* Storage may be unavailable in private browsing. */ }
}

function passiveNodePurchased(node) {
  return Boolean(passiveProfile.nodes[node.id]);
}

function hasPassiveUnlock(special) {
  const match = PASSIVE_TREE_BRANCHES.flatMap(branch => branch.nodes).find(node => node.special === special);
  return Boolean(match && passiveNodePurchased(match));
}

function passiveTowerMultiplier(tower, modifier) {
  if (!tower) return 1;
  return PASSIVE_TREE_BRANCHES.reduce((multiplier, branch) => {
    if (branch.target !== tower.type) return multiplier;
    return branch.nodes.reduce((value, node) => value * (passiveNodePurchased(node) ? node.effects?.[modifier] || 1 : 1), multiplier);
  }, 1);
}

function passiveCastleAuraMultiplier() {
  const branch = PASSIVE_TREE_BRANCHES.find(item => item.target === "castle");
  return TINY_CASTLE_AURA_MULTIPLIER + (branch?.nodes || []).reduce((bonus, node) => bonus + (passiveNodePurchased(node) ? node.effects?.aura || 0 : 0), 0);
}

function passiveNodeCanPurchase(entry) {
  if (!entry || passiveNodePurchased(entry.node)) return { ok: false, reason: "Already unlocked" };
  if (entry.index > 0 && !passiveNodePurchased(entry.branch.nodes[entry.index - 1])) return { ok: false, reason: "Unlock the previous node first" };
  for (const [resource, amount] of Object.entries(entry.node.costs || {})) {
    if ((passiveProfile[resource] || 0) < amount) return { ok: false, reason: `Need ${amount} more ${PASSIVE_RESOURCES[resource].name}` };
  }
  return { ok: true };
}

function purchasePassiveNode(id) {
  const entry = PASSIVE_TREE_NODE_LOOKUP.get(id);
  const check = passiveNodeCanPurchase(entry);
  if (!check.ok) {
    document.getElementById("passiveTreeStatus").textContent = check.reason;
    return false;
  }
  for (const [resource, amount] of Object.entries(entry.node.costs || {})) passiveProfile[resource] -= amount;
  passiveProfile.nodes[id] = true;
  savePassiveProfile();
  document.getElementById("passiveTreeStatus").textContent = `${entry.node.name} unlocked — ${entry.node.description}.`;
  if (typeof showAnnouncement === "function") showAnnouncement(`${entry.node.name} unlocked`);
  renderPassiveTree();
  return true;
}

function passiveResourceMarkup(resource, amount) {
  const data = PASSIVE_RESOURCES[resource];
  return `<span class="passive-resource ${data.className}"><i>${data.icon}</i><strong>${amount}</strong><small>${data.name}</small></span>`;
}

function showPassiveNodeTooltip(node, check) {
  const tooltip = document.getElementById("passiveNodeTooltip");
  if (!tooltip || !node) return;
  const purchased = passiveNodePurchased(node);
  const costs = Object.entries(node.costs || {})
    .filter(([, amount]) => amount > 0)
    .map(([resource, amount]) => `<span class="node-cost ${PASSIVE_RESOURCES[resource].className}">${PASSIVE_RESOURCES[resource].icon} ${amount}</span>`)
    .join("");
  const stateText = purchased ? "Unlocked" : check.ok ? "Click to purchase" : check.reason;
  tooltip.innerHTML = `<strong>${node.name}${node.special ? " • Special unlock" : ""}</strong><p>${node.description}</p><small>${stateText}${costs ? ` · ${costs}` : ""}</small>`;
  tooltip.classList.remove("hidden");
}

function renderPassiveResources() {
  const list = document.getElementById("passiveResourceList");
  if (!list) return;
  list.innerHTML = Object.keys(PASSIVE_RESOURCES).map(resource => passiveResourceMarkup(resource, passiveProfile[resource] || 0)).join("");
}

function renderPassiveTree() {
  const branchesElement = document.getElementById("passiveTreeBranches");
  const linesElement = document.getElementById("passiveTreeLines");
  if (!branchesElement || !linesElement) return;
  renderPassiveResources();
  const positions = [[50, 6], [73, 15], [88, 37], [80, 67], [62, 91], [38, 91], [20, 67], [12, 37], [27, 15]];
  linesElement.innerHTML = positions.map(([x, y]) => `<line x1="50" y1="50" x2="${x}" y2="${y}"></line>`).join("");
  branchesElement.innerHTML = "";
  PASSIVE_TREE_BRANCHES.forEach((branch, branchIndex) => {
    const branchElement = document.createElement("section");
    branchElement.className = "passive-branch";
    branchElement.style.left = `${positions[branchIndex][0]}%`;
    branchElement.style.top = `${positions[branchIndex][1]}%`;
    branchElement.innerHTML = `<h3>${branch.name}</h3><small>${branch.direction} • ${towerTypes[branch.target].name}</small>`;
    const nodeList = document.createElement("div");
    nodeList.className = "passive-node-list";
    branch.nodes.forEach((node, nodeIndex) => {
      const button = document.createElement("button");
      const purchased = passiveNodePurchased(node);
      const check = passiveNodeCanPurchase({ branch, node, index: nodeIndex });
      button.className = `passive-node${purchased ? " purchased" : ""}${node.special ? " special" : ""}`;
      button.disabled = purchased;
      button.title = `${node.name}: ${node.description}`;
      button.setAttribute("aria-describedby", "passiveNodeTooltip");
      const costs = Object.entries(node.costs || {}).filter(([, amount]) => amount > 0).map(([resource, amount]) => `<span class="node-cost ${PASSIVE_RESOURCES[resource].className}">${PASSIVE_RESOURCES[resource].icon} ${amount}</span>`).join("");
      button.innerHTML = `<b>${purchased ? "✓" : node.special ? "✦" : nodeIndex + 1}</b><span>${node.name}</span><em>${node.description}</em><small>${purchased ? "Unlocked" : check.ok ? costs : check.reason}</small>`;
      button.addEventListener("click", () => purchasePassiveNode(node.id));
      button.addEventListener("mouseenter", () => showPassiveNodeTooltip(node, check));
      button.addEventListener("focus", () => showPassiveNodeTooltip(node, check));
      nodeList.appendChild(button);
    });
    branchElement.appendChild(nodeList);
    branchesElement.appendChild(branchElement);
  });
  const unlocked = Object.values(passiveProfile.nodes).filter(Boolean).length;
  document.getElementById("passiveTreeProgress").textContent = `${unlocked} / ${PASSIVE_TREE_NODE_LOOKUP.size} nodes unlocked`;
}

function renderPassiveRewardSummary(rewards) {
  const summary = document.getElementById("passiveRewardSummary");
  const list = document.getElementById("passiveRewardList");
  if (!summary || !list || !rewards) return;
  list.innerHTML = Object.keys(PASSIVE_RESOURCES).map(resource => passiveResourceMarkup(resource, rewards[resource] || 0)).join("");
  summary.classList.remove("hidden");
}

function awardPassiveRunRewards(victory) {
  if (state.passiveRewardsAwarded) return state.passiveRewards;
  const damage = Math.max(0, state.totalDamageDealt || 0);
  const rewards = {
    rubies: Math.max(1, Math.min(100, 1 + Math.floor(damage / 2500))),
    sapphires: Math.floor(Math.max(0, state.wavesWithoutLifeLoss || 0) / 10),
    emeralds: victory && state.gameMode === "campaign" && state.wave >= CAMPAIGN_WAVE_COUNT ? 1 : 0
  };
  passiveProfile.rubies += rewards.rubies;
  passiveProfile.sapphires += rewards.sapphires;
  passiveProfile.emeralds += rewards.emeralds;
  passiveProfile.lifetimeDamage += damage;
  passiveProfile.completedRuns++;
  savePassiveProfile();
  state.passiveRewards = rewards;
  state.passiveRewardsAwarded = true;
  return rewards;
}

function openPassiveTree(returnView = "menu") {
  passiveTreeReturnView = returnView;
  state.passiveTreeOpen = true;
  state.menuOpen = true;
  document.getElementById("mainMenu").classList.add("hidden");
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("passiveTreeModal").classList.remove("hidden");
  const tooltip = document.getElementById("passiveNodeTooltip");
  tooltip.classList.add("hidden");
  tooltip.textContent = "Hover an upgrade block to see its effect and cost.";
  renderPassiveTree();
}

function closePassiveTree() {
  state.passiveTreeOpen = false;
  document.getElementById("passiveTreeModal").classList.add("hidden");
  document.getElementById("passiveNodeTooltip").classList.add("hidden");
  if (passiveTreeReturnView === "result" && state.ended) document.getElementById("modal").classList.remove("hidden");
  else document.getElementById("mainMenu").classList.remove("hidden");
  if (!state.ended) state.menuOpen = passiveTreeReturnView === "menu";
}

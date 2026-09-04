"use strict";

// Persistent monster discovery and the player-facing enemy encyclopedia.

const MONSTER_INDEX_STORAGE_KEY = "stonewatch-keep.monster-index.v1";
const discoveredMonsters = loadMonsterDiscoveries();
let monsterDiscoveryTimer = 0;

function loadMonsterDiscoveries() {
  try {
    const stored = JSON.parse(localStorage.getItem(MONSTER_INDEX_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(stored) ? stored.filter(type => enemyTypes[type]) : []);
  } catch (_error) {
    return new Set();
  }
}

function saveMonsterDiscoveries() {
  try {
    localStorage.setItem(MONSTER_INDEX_STORAGE_KEY, JSON.stringify([...discoveredMonsters]));
  } catch (_error) {
    // Discovery still works for this session when browser storage is unavailable.
  }
}

function monsterThreatLabel(type, monster) {
  if (monster.boss) return "Realm Boss";
  if (monster.miniBoss) return "Event Boss";
  if (monster.ignoresBarracks) return "Special Enemy";
  if (["pirate", "werewolf", "viking", "wraith", "demon"].includes(type)) return "Event Enemy";
  return "Common Enemy";
}

function discoverMonster(type) {
  if (!enemyTypes[type] || discoveredMonsters.has(type)) return false;
  discoveredMonsters.add(type);
  saveMonsterDiscoveries();
  updateMonsterIndexButton();
  if (state?.monsterIndexOpen) renderMonsterIndex();

  const button = document.getElementById("monsterIndexButton");
  button.classList.remove("new-discovery");
  void button.offsetWidth;
  button.classList.add("new-discovery");
  clearTimeout(monsterDiscoveryTimer);
  monsterDiscoveryTimer = setTimeout(() => button.classList.remove("new-discovery"), 1800);
  return true;
}

function updateMonsterIndexButton() {
  const count = discoveredMonsters.size;
  const total = Object.keys(enemyTypes).length;
  document.getElementById("monsterIndexCount").textContent = `${count}/${total}`;
  document.getElementById("monsterIndexButton").setAttribute("aria-label", `Open Monster Index. ${count} of ${total} enemies discovered.`);
  document.getElementById("monsterIndexProgress").textContent = `${count} of ${total} discovered`;
}

function addMonsterStat(container, label, value, className = "") {
  const stat = document.createElement("div");
  if (className) stat.className = className;
  const name = document.createElement("span");
  name.textContent = label;
  const amount = document.createElement("strong");
  amount.textContent = value;
  stat.append(name, amount);
  container.appendChild(stat);
}

function renderMonsterIndex() {
  const grid = document.getElementById("monsterIndexGrid");
  const empty = document.getElementById("monsterIndexEmpty");
  grid.innerHTML = "";
  const entries = Object.entries(enemyTypes).filter(([type]) => discoveredMonsters.has(type));
  empty.classList.toggle("hidden", entries.length > 0);
  grid.classList.toggle("hidden", entries.length === 0);

  for (const [type, monster] of entries) {
    const card = document.createElement("article");
    card.className = `monster-entry ${monster.boss ? "boss" : monster.miniBoss ? "mini-boss" : ""}`;
    card.dataset.monster = type;
    card.style.setProperty("--monster-color", monster.color);

    const heading = document.createElement("div");
    heading.className = "monster-entry-heading";
    const emblem = document.createElement("span");
    emblem.className = "monster-entry-emblem";
    emblem.textContent = monster.symbol;
    const identity = document.createElement("div");
    const threat = document.createElement("small");
    threat.textContent = monsterThreatLabel(type, monster);
    const name = document.createElement("h3");
    name.textContent = monster.name;
    identity.append(threat, name);
    heading.append(emblem, identity);

    const stats = document.createElement("div");
    stats.className = "monster-entry-stats";
    addMonsterStat(stats, "Base health", Math.round(monster.hp).toLocaleString());
    addMonsterStat(stats, "Physical resistance", `${Math.round(monster.physicalResistance * 100)}%`, "physical-resistance");
    addMonsterStat(stats, "Magic resistance", `${Math.round(monster.magicResistance * 100)}%`, "magic-resistance");
    addMonsterStat(stats, "Movement speed", Math.round(monster.speed));
    addMonsterStat(stats, "Keep damage", monster.damage);
    card.append(heading, stats);
    grid.appendChild(card);
  }

  updateMonsterIndexButton();
}

function openMonsterIndex() {
  state.monsterIndexOpen = true;
  renderMonsterIndex();
  document.getElementById("monsterIndexModal").classList.remove("hidden");
  document.getElementById("closeMonsterIndexButton").focus();
}

function closeMonsterIndex() {
  if (state) state.monsterIndexOpen = false;
  document.getElementById("monsterIndexModal").classList.add("hidden");
}

updateMonsterIndexButton();
renderMonsterIndex();

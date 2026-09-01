"use strict";

// Shared battlefield constants, path geometry, and small data-building helpers.

const canvas = document.getElementById("gameCanvas");

const W = canvas.width;
const H = canvas.height;
const CELL = 80;
const COLS = 12;
const ROWS = 8;
const GOLD_INCOME_RATE = .25;
const TREE_REMOVAL_COST = 400;
const MAX_RELICS_PER_TOWER = 3;

const merchantRelics = {
  sword: { name: "Mercenary Sword", icon: "⚔", cost: 160, description: "+25% damage", allowed: tower => tower.type !== "mine" && tower.type !== "ghost" },
  amulet: { name: "Sun Amulet", icon: "◈", cost: 140, description: "+20% range", allowed: tower => tower.type !== "mine" },
  boots: { name: "Swift Boots", icon: "➟", cost: 150, description: "18% faster attacks", allowed: tower => tower.type !== "mine" },
  shield: { name: "Guardian Shield", icon: "⬟", cost: 180, description: "+30% Barracks troop health", allowed: tower => tower.type === "barracks" },
  ring: { name: "Fortune Ring", icon: "●", cost: 175, description: "+50% Gold Mine production", allowed: tower => tower.type === "mine" }
};

const TREE_LAYOUT = [
  // Keep the first tree beside (not on) the enemy entrance at row 0, column 0.
  [0.45, 1.55, 0.8], [2.8, 1.45, .8], [5.5, 1.4, 1], [8, 1.5, .8], [11.55, 1.35, 1.05],
  [.25, 3.5, .9], [3.7, 3.4, .8], [6.2, 3.5, 1], [8.8, 3.4, .78], [11.55, 3.45, .95],
  [.3, 5.5, 1], [3, 5.45, .8], [5.6, 5.5, .95], [8, 5.4, .8], [11.55, 5.3, 1],
  [.35, 7.45, .9], [3.2, 7.5, .82], [6.1, 7.45, 1], [8.7, 7.5, .85]
].map(([x, z, scale], index) => ({ id: `tree-${index}`, col: Math.floor(x), row: Math.floor(z), x, z, scale, variant: index }));

const pathCells = [];
for (let x = -1; x <= 10; x++) pathCells.push([x, 0]);
for (let y = 1; y <= 2; y++) pathCells.push([10, y]);
for (let x = 9; x >= 1; x--) pathCells.push([x, 2]);
for (let y = 3; y <= 4; y++) pathCells.push([1, y]);
for (let x = 2; x <= 10; x++) pathCells.push([x, 4]);
for (let y = 5; y <= 7; y++) pathCells.push([10, y]);
for (let x = 11; x <= 12; x++) pathCells.push([x, 7]);
const pathSet = new Set(pathCells.filter(([x, y]) => x >= 0 && x < COLS && y >= 0 && y < ROWS).map(([x, y]) => `${x},${y}`));
const pathPoints = pathCells.map(([x, y]) => ({ x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 }));

function sequence(type, count, gap) {
  return Array.from({ length: count }, () => ({ type, gap }));
}

function mix(groups, gap) {
  const pools = groups.map(([type, count]) => ({ type, left: count }));
  const result = [];
  while (pools.some(p => p.left > 0)) {
    for (const pool of pools) {
      if (pool.left > 0) { result.push({ type: pool.type, gap }); pool.left--; }
    }
  }
  return result;
}

function combineWaveAndEvent(waveUnits, eventUnits) {
  const combined = [];
  let waveIndex = 0;
  let eventIndex = 0;
  while (waveIndex < waveUnits.length || eventIndex < eventUnits.length) {
    for (let index = 0; index < 2 && waveIndex < waveUnits.length; index++) {
      combined.push({ ...waveUnits[waveIndex++] });
    }
    if (eventIndex < eventUnits.length) combined.push({ ...eventUnits[eventIndex++] });
  }
  return combined;
}

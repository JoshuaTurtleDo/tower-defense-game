"use strict";

// Renderer setup, mutable match state, resets, wave starts, and enemy spawning.

const graphics3D = new ThreeGraphics(canvas, {
  W, H, CELL, COLS, ROWS, pathPoints, pathCells, towerTypes, enemyTypes, treeLayout: TREE_LAYOUT
});

let activeGameMode = "campaign";
const gameSettings = { shadows: true, healthBars: true, cameraSensitivity: 1 };


let state;
let lastTime = performance.now();
let hoverCell = null;
let announcementTimer = 0;
const cameraDrag = {
  active: false,
  dragged: false,
  suppressClick: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0
};

function freshState() {
  return {
    gameMode: activeGameMode,
    gameStarted: true,
    menuOpen: false,
    gold: 250,
    lives: 20,
    wave: 0,
    enemies: [],
    towers: [],
    knights: [],
    projectiles: [],
    particles: [],
    trees: TREE_LAYOUT.map(tree => ({ ...tree })),
    placementCounts: {},
    selectedBuild: null,
    selectedTower: null,
    selectedTreeId: null,
    inventory: [],
    selectedRelic: null,
    merchantStoreStock: [],
    merchantStorePending: false,
    bossDefeatedThisWave: false,
    storeOpen: false,
    monsterIndexOpen: false,
    waveActive: false,
    activeEvent: null,
    spawnQueue: [],
    spawnTimer: 0,
    paused: false,
    speed: 1,
    totalKills: 0,
    goldIncomeRemainder: 0,
    ended: false,
    elapsed: 0
  };
}

function resetGame(mode = activeGameMode) {
  activeGameMode = mode;
  state = freshState();
  document.getElementById("modal").classList.add("hidden");
  document.getElementById("merchantStoreModal").classList.add("hidden");
  document.getElementById("monsterIndexModal").classList.add("hidden");
  document.getElementById("mainMenu").classList.add("hidden");
  document.getElementById("pauseOverlay").classList.add("hidden");
  document.getElementById("pauseButton").textContent = "Ⅱ";
  document.getElementById("speedButton").textContent = "1×";
  showBuildPanel();
  renderInventory();
  updateUI();
}

function awardGold(baseAmount) {
  const scaledAmount = baseAmount * GOLD_INCOME_RATE + state.goldIncomeRemainder;
  const payout = Math.floor(scaledAmount + 1e-9);
  state.goldIncomeRemainder = scaledAmount - payout;
  state.gold += payout;
  return payout;
}

function awardUnscaledGold(amount) {
  const total = amount + state.goldIncomeRemainder;
  const payout = Math.floor(total + 1e-9);
  state.goldIncomeRemainder = total - payout;
  state.gold += payout;
  return payout;
}

function startWave() {
  const waveNumber = state.wave + 1;
  const wave = getWaveDefinition(waveNumber);
  if (state.waveActive || state.ended || state.menuOpen || !wave) return;
  const event = getWaveEvent(waveNumber);
  state.waveActive = true;
  state.merchantStorePending = false;
  state.bossDefeatedThisWave = false;
  state.activeEvent = event;
  state.spawnQueue = event
    ? combineWaveAndEvent(wave.units, event.units)
    : wave.units.map(unit => ({ ...unit }));
  state.spawnTimer = .35;
  state.wave++;
  showAnnouncement(event ? `Wave ${state.wave} — Event: ${event.name}!` : `Wave ${state.wave} — ${wave.name}`);
  updateUI();
}

function spawnEnemy(type) {
  const base = enemyTypes[type];
  discoverMonster(type);
  const scale = 1 + Math.max(0, state.wave - 1) * .11;
  state.enemies.push({
    type,
    x: pathPoints[0].x,
    y: pathPoints[0].y,
    pathIndex: 1,
    hp: base.hp * scale,
    maxHp: base.hp * scale,
    speed: base.speed * (1 + Math.max(0, state.wave - 1) * .012),
    reward: base.reward,
    damage: base.damage,
    isBoss: Boolean(base.boss),
    isMiniBoss: Boolean(base.miniBoss),
    ignoresBarracks: Boolean(base.ignoresBarracks),
    physicalResistance: base.physicalResistance,
    magicResistance: base.magicResistance,
    meleeCooldown: .4 + Math.random() * .4,
    attackSwing: 0,
    fireBreathCooldown: type === "dragon" ? 1.1 : 0,
    fireBreathTimer: 0,
    summonCooldown: type === "covenwitch" ? 3.5 : 0,
    summonsRemaining: type === "covenwitch" ? 6 : 0,
    rangedCooldown: type === "covenwitch" ? 1.2 : 0,
    blocked: false,
    moving: true,
    combatAngle: 0,
    thrown: false,
    throwArc: 0,
    throwSpin: 0,
    slowTimer: 0,
    slowStrength: 0,
    fearTimer: 0,
    fearCooldown: 0,
    fearTargetIndex: 0,
    fearResumeIndex: 1,
    facing: 1,
    phase: Math.random() * Math.PI * 2,
    dead: false,
    reached: false,
    hitFlash: 0
  });
}

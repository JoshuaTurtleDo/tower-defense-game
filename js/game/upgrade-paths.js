"use strict";

// Permanent defense specialization choices and defense selling.

function chooseGravestonePath() {
  const tower = state.selectedTower;
  if (!tower || tower.type !== "barracks" || tower.level !== 2) return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  tower.level++;
  tower.specialization = "graveyard";
  tower.summonTimer = 4;
  state.knights = state.knights.filter(unit => unit.owner !== tower);
  burst(tower.x, tower.y, "#79a861", 28);
  showAnnouncement("Gravestone Path unlocked — the dead will rise");
  showInspectPanel(tower);
  updateUI();
}
function chooseFrostPath() {
  const tower = state.selectedTower;
  if (!tower || tower.type !== "mage" || tower.level !== 2) return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  tower.level++;
  tower.specialization = "frost";
  burst(tower.x, tower.y, "#8fe8f4", 26);
  showAnnouncement("Frost Path unlocked — group slowing enabled");
  showInspectPanel(tower);
  updateUI();
}

function chooseNightspawnPath() {
  const tower = state.selectedTower;
  if (!tower || tower.type !== "vampire" || tower.level !== 2) return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  tower.level++;
  tower.specialization = "nightspawn";
  burst(tower.x, tower.y, "#b51d36", 30);
  showAnnouncement("Nightspawn Path unlocked — slain enemies will rise");
  showInspectPanel(tower);
  updateUI();
}

function chooseSlingshooterPath() {
  const tower = state.selectedTower;
  if (!tower || tower.type !== "archer" || tower.level !== 2) return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  tower.level++;
  tower.specialization = "slingshooters";
  tower.volleyShotsRemaining = 0;
  tower.volleyTimer = 0;
  burst(tower.x, tower.y, "#c79a58", 28);
  showAnnouncement("Slingshooter Path unlocked — boulders now damage groups");
  showInspectPanel(tower);
  updateUI();
}

function chooseStoneThrowPath() {
  const tower = state.selectedTower;
  if (!tower || tower.type !== "ogre" || tower.level !== 2) return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  tower.level++;
  tower.specialization = "stoneThrow";
  tower.cooldown = 0;
  tower.stoneThrowTimer = 0;
  state.knights = state.knights.filter(unit => unit.owner !== tower);
  tower.toggaUnit = null;
  burst(tower.x, tower.y, "#9d8d64", 30);
  showAnnouncement("StoneThrow Path unlocked — crushing boulders damage groups");
  showInspectPanel(tower);
  updateUI();
}

function chooseZeusBowPath() {
  const tower = state.selectedTower;
  if (!tower || tower.type !== "ballista" || tower.level !== 2) return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  tower.level++;
  tower.specialization = "zeusBow";
  tower.cooldown = 0;
  burst(tower.x, tower.y, "#78cfff", 30);
  burst(tower.x, tower.y, "#fff4a8", 16);
  showAnnouncement("Zeus's Bow unlocked — lightning exposes and stuns its targets");
  showInspectPanel(tower);
  updateUI();
}

function chooseTwinLaserPath() {
  const tower = state.selectedTower;
  if (!tower || tower.type !== "ufo" || tower.level !== 2) return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  tower.level++;
  tower.specialization = "twinlaser";
  burst(tower.x, tower.y, towerTypes.ufo.twinLaserColor, 30);
  showAnnouncement("Twin Laser Path unlocked — a red beam joins the green laser");
  showInspectPanel(tower);
  updateUI();
}

function chooseMassiveBeamPath() {
  const tower = state.selectedTower;
  if (!tower || tower.type !== "ufo" || tower.level !== 2) return;
  const cost = upgradeCost(tower);
  if (cost === null || state.gold < cost) return;
  state.gold -= cost;
  tower.spent += cost;
  tower.level++;
  tower.specialization = "massivebeam";
  burst(tower.x, tower.y, "#b9ffd0", 34);
  showAnnouncement("Massive Beam Path unlocked — area laser online");
  showInspectPanel(tower);
  updateUI();
}

function sellTower() {
  const tower = state.selectedTower;
  if (!tower) return;
  state.gold += Math.round(tower.spent * .65);
  state.inventory.push(...(tower.items || []));
  state.towers = state.towers.filter(t => t !== tower);
  state.knights = state.knights.filter(knight => knight.owner !== tower);
  state.selectedTower = null;
  showBuildPanel();
  updateUI();
}

"use strict";

// Editable tower, enemy, campaign-wave, event, and endless-mode definitions.

const towerTypes = {
  archer: { name: "Royal Archers", cost: 70, range: 145, damage: 14, damageType: "physical", cooldown: 1.35, projectileSpeed: 480, color: "#d6d19c", splash: 0, emblem: "➶", className: "archer-emblem" },
  mage: { name: "Royal Wizard", cost: 150, range: 128, damage: 28, damageType: "magic", cooldown: 1.15, projectileSpeed: 330, color: "#a788eb", splash: 62, emblem: "✦", className: "mage-emblem" },
  ballista: { name: "Royal Ballista", cost: 160, range: 215, damage: 120, damageType: "physical", cooldown: 2.05, projectileSpeed: 650, color: "#e5a654", splash: 0, emblem: "✧", className: "ballista-emblem" },
  barracks: { name: "Royal Barracks", cost: 135, range: 138, damage: 12, damageType: "physical", cooldown: .85, projectileSpeed: 0, color: "#b9c8cf", splash: 0, emblem: "⚔", className: "barracks-emblem" },
  ogre: { name: "Stoneback Ogre", cost: 185, range: 132, damage: 200, damageType: "physical", cooldown: 3.8, projectileSpeed: 0, color: "#8e8050", splash: 0, knockback: 150, emblem: "✊", className: "ogre-emblem" },
  ghost: { name: "Dread Ghost", cost: 175, range: 145, damage: 0, damageType: "control", cooldown: 3.8, projectileSpeed: 0, color: "#9be3d6", splash: 0, fearDuration: 2, fearCount: 3, emblem: "◉", className: "ghost-emblem" },
  vampire: { name: "Crimson Vampire", cost: 205, range: 142, damage: 72, damageType: "magic", cooldown: 2.85, projectileSpeed: 0, color: "#c83645", splash: 0, emblem: "♠", className: "vampire-emblem" },
  mine: { name: "Gold Mine", cost: 150, range: 0, damage: 0, damageType: "economy", cooldown: 1, projectileSpeed: 0, color: "#e2b84f", splash: 0, emblem: "⚒", className: "mine-emblem" }
};

const enemyTypes = {
  goblin: { name: "Goblin", hp: 48, speed: 78, reward: 8, damage: 1, color: "#66833e", physicalResistance: 0, magicResistance: 0, symbol: "G", scale: .82, barWidth: 27, barOffset: 23 },
  skeleton: { name: "Skeleton", hp: 88, speed: 59, reward: 11, damage: 1, color: "#d8d0b7", physicalResistance: 0, magicResistance: .25, symbol: "☠", scale: .94, barWidth: 30, barOffset: 27 },
  orc: { name: "Armored Orc", hp: 178, speed: 43, reward: 17, damage: 2, color: "#536f3c", physicalResistance: .3, magicResistance: .1, symbol: "O", scale: 1.08, barWidth: 35, barOffset: 30 },
  ogre: { name: "Ogre", hp: 340, speed: 31, reward: 31, damage: 3, color: "#7b7045", physicalResistance: .4, magicResistance: .05, symbol: "Ω", scale: 1.34, barWidth: 43, barOffset: 35 },
  dragon: { name: "Ancient Dragon", hp: 2160, speed: 34, reward: 130, damage: 8, color: "#9b382d", physicalResistance: .22, magicResistance: .35, symbol: "D", scale: 1.65, barWidth: 58, barOffset: 43, modelScale: 1.25, boss: true },
  horseman: { name: "Headless Horseman", hp: 6480, speed: 38, reward: 220, damage: 12, color: "#6a8d83", physicalResistance: .32, magicResistance: .48, symbol: "H", scale: 2.05, barWidth: 72, barOffset: 55, modelScale: 1.35, boss: true },
  cyclops: { name: "Titan Cyclops", hp: 9720, speed: 25, reward: 360, damage: 16, color: "#806f4d", physicalResistance: .48, magicResistance: .18, symbol: "C", scale: 2.35, barWidth: 82, barOffset: 62, modelScale: 1.5, boss: true },
  merchant: { name: "Boss Merchant", hp: 624, speed: 52.5, reward: 160, damage: 1, color: "#b7803d", physicalResistance: .1, magicResistance: .1, symbol: "$", scale: 1.12, barWidth: 40, barOffset: 34, modelScale: 1.08, ignoresBarracks: true },
  pirate: { name: "Pirate Cutthroat", hp: 105, speed: 62, reward: 13, damage: 1, color: "#8f3530", physicalResistance: .08, magicResistance: 0, symbol: "P", scale: .96, barWidth: 31, barOffset: 27 },
  werewolf: { name: "Moonfang Werewolf", hp: 155, speed: 72, reward: 18, damage: 2, color: "#635b55", physicalResistance: .12, magicResistance: .08, symbol: "W", scale: 1.05, barWidth: 34, barOffset: 30 },
  viking: { name: "Frost Viking", hp: 225, speed: 46, reward: 25, damage: 2, color: "#527184", physicalResistance: .3, magicResistance: .05, symbol: "V", scale: 1.08, barWidth: 36, barOffset: 31 },
  wraith: { name: "Spectral Wraith", hp: 290, speed: 53, reward: 31, damage: 2, color: "#6cb5ad", physicalResistance: .05, magicResistance: .5, symbol: "R", scale: 1.08, barWidth: 37, barOffset: 33 },
  demon: { name: "Rift Demon", hp: 375, speed: 41, reward: 40, damage: 3, color: "#a13a43", physicalResistance: .25, magicResistance: .3, symbol: "I", scale: 1.16, barWidth: 41, barOffset: 35 },
  davyjones: { name: "Davy Jones", hp: 850, speed: 37, reward: 95, damage: 5, color: "#386d69", physicalResistance: .24, magicResistance: .3, symbol: "DJ", scale: 1.45, barWidth: 54, barOffset: 44, modelScale: 1.45, miniBoss: true },
  moonalpha: { name: "Moonfang Alpha", hp: 1100, speed: 58, reward: 120, damage: 5, color: "#9b938d", physicalResistance: .3, magicResistance: .18, symbol: "A", scale: 1.5, barWidth: 57, barOffset: 46, modelScale: 1.5, miniBoss: true },
  longship: { name: "Viking Longship", hp: 1350, speed: 29, reward: 145, damage: 6, color: "#725037", physicalResistance: .42, magicResistance: .08, symbol: "S", scale: 1.75, barWidth: 64, barOffset: 52, modelScale: 1.72, miniBoss: true },
  covenwitch: { name: "Coven Witch", hp: 1200, speed: 35, reward: 155, damage: 5, color: "#7558a5", physicalResistance: .12, magicResistance: .58, symbol: "✦", scale: 1.48, barWidth: 57, barOffset: 48, modelScale: 1.48, miniBoss: true },
  riftlord: { name: "Rift Overlord", hp: 1800, speed: 27, reward: 210, damage: 8, color: "#7d202b", physicalResistance: .4, magicResistance: .4, symbol: "R", scale: 1.85, barWidth: 70, barOffset: 57, modelScale: 1.78, miniBoss: true }
};

const waves = [
  { name: "Goblin Scouts", units: sequence("goblin", 8, .7) },
  { name: "Grinning Horde", units: mix([["goblin", 11], ["skeleton", 3]], .58) },
  { name: "The Restless Dead", units: mix([["skeleton", 8], ["goblin", 8]], .58) },
  { name: "Orc Vanguard", units: mix([["orc", 5], ["goblin", 10], ["skeleton", 4]], .58) },
  { name: "Bone and Iron", units: mix([["skeleton", 11], ["orc", 7], ["goblin", 6]], .48) },
  { name: "Ogres at the Gate", units: mix([["ogre", 3], ["goblin", 12], ["skeleton", 8]], .52) },
  { name: "The Green Tide", units: mix([["orc", 11], ["ogre", 4], ["goblin", 14]], .42) },
  { name: "Graveborn Legion", units: mix([["skeleton", 18], ["orc", 10], ["ogre", 5]], .38) },
  { name: "Monstrous Siege", units: mix([["ogre", 8], ["orc", 15], ["skeleton", 14], ["goblin", 10]], .34) },
  { name: "Wrath of the Dragon", units: mix([["goblin", 10], ["skeleton", 10], ["orc", 9], ["ogre", 5], ["dragon", 1], ["merchant", 1]], .46) },
  { name: "Ashen Reinforcements", units: mix([["goblin", 18], ["skeleton", 12], ["orc", 8]], .34) },
  { name: "Bonewind Host", units: mix([["skeleton", 22], ["orc", 10], ["goblin", 10]], .32) },
  { name: "Ironjaw Raiders", units: mix([["orc", 16], ["goblin", 18], ["ogre", 4]], .31) },
  { name: "Tombroad March", units: mix([["skeleton", 24], ["ogre", 6], ["orc", 12]], .30) },
  { name: "Siegebreakers", units: mix([["ogre", 10], ["orc", 18], ["goblin", 15]], .29) },
  { name: "Nightfall Horde", units: mix([["goblin", 22], ["skeleton", 20], ["orc", 14], ["ogre", 8]], .28) },
  { name: "Heavy Footfall", units: mix([["ogre", 14], ["orc", 22], ["skeleton", 18]], .28) },
  { name: "Legion of the Barrow", units: mix([["skeleton", 28], ["orc", 24], ["ogre", 12], ["goblin", 16]], .27) },
  { name: "Heralds of Flame", units: mix([["ogre", 16], ["orc", 26], ["skeleton", 22], ["goblin", 20]], .26) },
  { name: "Ride of the Headless Horseman", units: mix([["goblin", 18], ["skeleton", 20], ["orc", 18], ["ogre", 10], ["horseman", 1], ["merchant", 1]], .34) },
  { name: "Ruinous Vanguard", units: mix([["goblin", 26], ["skeleton", 22], ["orc", 20], ["ogre", 10]], .25) },
  { name: "Endless Bones", units: mix([["skeleton", 36], ["orc", 22], ["ogre", 12]], .24) },
  { name: "Iron and Fang", units: mix([["orc", 30], ["goblin", 28], ["ogre", 14]], .24) },
  { name: "Giants of the Mire", units: mix([["ogre", 20], ["orc", 28], ["skeleton", 24]], .23) },
  { name: "The Dread Host", units: mix([["goblin", 32], ["skeleton", 30], ["orc", 26], ["ogre", 16]], .23) },
  { name: "March of Ash", units: mix([["skeleton", 34], ["orc", 32], ["ogre", 18], ["goblin", 26]], .22) },
  { name: "The Crushing Tide", units: mix([["orc", 36], ["ogre", 22], ["skeleton", 28]], .22) },
  { name: "No Dawn Comes", units: mix([["goblin", 36], ["skeleton", 36], ["orc", 32], ["ogre", 20]], .21) },
  { name: "The Last Siege", units: mix([["ogre", 26], ["orc", 40], ["skeleton", 34], ["goblin", 30]], .21) },
  { name: "Doom of the Titan Cyclops", units: mix([["goblin", 30], ["skeleton", 30], ["orc", 34], ["ogre", 22], ["cyclops", 1], ["merchant", 1]], .30) }
];

const waveEvents = {
  6: { name: "Pirate Raid", description: "Cutthroats pour ashore under Davy Jones.", type: "pirate", bossType: "davyjones", units: [...sequence("pirate", 14, .2), { type: "davyjones", gap: .72 }] },
  12: { name: "Moonlit Hunt", description: "A moonfang pack races behind its enormous Alpha.", type: "werewolf", bossType: "moonalpha", units: [...sequence("werewolf", 14, .18), { type: "moonalpha", gap: .72 }] },
  18: { name: "Viking Invasion", description: "Frost Vikings drag a war longship down the road.", type: "viking", bossType: "longship", units: [...sequence("viking", 16, .19), { type: "longship", gap: .8 }] },
  24: { name: "Spectral Procession", description: "A Coven Witch summons more Wraiths as she advances.", type: "wraith", bossType: "covenwitch", units: [...sequence("wraith", 18, .17), { type: "covenwitch", gap: .75 }] },
  30: { name: "Infernal Rift", description: "Rift Demons march beneath a gigantic Rift Overlord.", type: "demon", bossType: "riftlord", units: [...sequence("demon", 20, .16), { type: "riftlord", gap: .85 }] }
};

const CAMPAIGN_WAVE_COUNT = waves.length;

function scaleEndlessUnits(units, cycle) {
  if (cycle <= 0) return units.map(unit => ({ ...unit }));
  const extraRate = Math.min(1.8, cycle * .18);
  let extraCarry = 0;
  const result = [];
  for (const unit of units) {
    const copy = { ...unit, gap: Math.max(.11, unit.gap * Math.max(.62, 1 - cycle * .025)) };
    result.push(copy);
    const type = enemyTypes[unit.type];
    if (type.boss || type.miniBoss || unit.type === "merchant") continue;
    extraCarry += extraRate;
    while (extraCarry >= 1) {
      result.push({ ...copy });
      extraCarry--;
    }
  }
  return result;
}

function getWaveDefinition(waveNumber, mode = state?.gameMode || "campaign") {
  if (waveNumber <= CAMPAIGN_WAVE_COUNT) return waves[waveNumber - 1] || null;
  if (mode !== "endless") return null;
  const cycle = Math.floor((waveNumber - 1) / CAMPAIGN_WAVE_COUNT);
  const loopWave = (waveNumber - 1) % CAMPAIGN_WAVE_COUNT + 1;
  const template = waves[loopWave - 1];
  return {
    name: `Endless Cycle ${cycle + 1} — ${template.name}`,
    units: scaleEndlessUnits(template.units, cycle)
  };
}
function getWaveEvent(waveNumber, mode = state?.gameMode || "campaign") {
  if (waveNumber <= CAMPAIGN_WAVE_COUNT) return waveEvents[waveNumber] || null;
  if (mode !== "endless") return null;
  const cycle = Math.floor((waveNumber - 1) / CAMPAIGN_WAVE_COUNT);
  const loopWave = (waveNumber - 1) % CAMPAIGN_WAVE_COUNT + 1;
  const template = waveEvents[loopWave];
  if (!template) return null;
  return {
    ...template,
    name: `${template.name} • Endless Cycle ${cycle + 1}`,
    units: scaleEndlessUnits(template.units, cycle)
  };
}

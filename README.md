# Stonewatch Keep

A medieval tower-defense game for Windows that can also run directly in a web browser. The battlefield is rendered as a fully lit 3D low-poly diorama using WebGL and a local copy of Three.js. Electron provides the Windows desktop application while the editable game remains ordinary HTML, CSS, and JavaScript.

## Play the Windows game

Run `Stonewatch Keep Setup.exe` and then launch **Stonewatch Keep** from its Desktop or Start Menu shortcut. Press `F11` or `Alt+Enter` to switch between windowed and fullscreen play.

## Play in a browser

Double-click `index.html`. It will open in your usual browser. Choose **Play** on the title screen, then select a mode.

1. Choose **30-Wave Campaign** for the original battle or **Endless Siege** for an unending challenge.
2. Choose a defense in the armory and click an open grassy square to place it.
3. Press **Begin wave** when you are ready.
4. Click a built defense to upgrade, equip relics, or sell it.
5. Protect all 20 keep health. Waves 10, 20, and 30 contain the Ancient Dragon, Headless Horseman, and Titan Cyclops respectively; if any boss reaches the castle, the battle is lost immediately.

## Game modes and settings

- **30-Wave Campaign:** the original complete battle, ending in victory after the Titan Cyclops and its remaining army are defeated on wave 30.
- **Endless Siege:** begins with the same 30-wave campaign, then loops its enemy formations forever. Every new 30-wave cycle adds more ordinary enemies, shortens their arrival gaps, and combines those increases with the game's existing wave-based health and speed scaling. The Dragon, Horseman, and Cyclops return every ten waves, each escorted by a Merchant, while the five event themes repeat every six waves.

Use the **Menu** button above the battlefield to resume, begin a fresh mode, or open Settings. Settings can toggle dynamic shadows and enemy health bars, and switch camera orbiting between normal and fast sensitivity.

## Wave events

Every sixth wave now triggers a themed event on top of the normal assault. The event enemies are interleaved into the ordinary spawn queue, appear in the next-wave preview, use their own detailed 3D models, and retain the same wave-based health and speed scaling as the rest of the army.

- **Wave 6 — Pirate Raid:** 14 quick Pirate Cutthroats land with the tentacle-faced mini-boss Davy Jones.
- **Wave 12 — Moonlit Hunt:** 14 very fast Moonfang Werewolves join their oversized Moonfang Alpha.
- **Wave 18 — Viking Invasion:** 16 physically armored Frost Vikings drag a full Viking Longship down the road.
- **Wave 24 — Spectral Procession:** 18 magic-resistant Spectral Wraiths accompany a Coven Witch. The Witch summons two more Wraiths every 4.5 seconds, up to six additional ghosts. She also attacks Barracks troops from 150 units away with homing magical projectiles that explode across a 68-unit area instead of using melee attacks.
- **Wave 30 — Infernal Rift:** 20 durable Rift Demons and a gigantic Rift Overlord flood the final Cyclops battle.

Event mini-bosses have substantially more health, larger models, stronger attacks, unique resistance profiles, and immunity to the Stoneback Ogre's throw. Unlike the campaign bosses, they damage the keep normally instead of causing an immediate defeat on their own.

The pause, game-speed, and reset-camera controls are in the lower-left of the battlefield. Hold the right mouse button and drag over the battlefield to orbit around it, and use the scroll wheel to zoom in or out; the platform remains the fixed center of the view. The reset button returns both the angle and zoom to the centered isometric overview. You can also press `Esc` to cancel tower placement and the space bar to begin the next wave.

## Desktop development

- `npm start` launches the editable source as an Electron desktop game.
- `npm run smoke` runs an invisible load test of the game and desktop wrapper.
- `npm run make` creates the x64 Windows installer in `out/make`.
- `npm run icon` rebuilds the Windows icon from the source PNG.

The generated `out` directory is intentionally excluded from Git. Make changes to the source files, test them, and rebuild the installer rather than editing the packaged `.exe`.

## Enemy threat levels

- **Goblins:** fragile and quick, with no physical or magic resistance.
- **Skeletons:** resist 25% of physical damage but have no magic resistance.
- **Armored Orcs:** resist 30% of physical damage and 10% of magic damage.
- **Ogres:** heavily resist physical damage by 40%, but resist only 5% of magic damage.
- **Ancient Dragon:** the 4,320-health wave-10 boss resists 22% of physical damage and 35% of magic damage. When blocked, it breathes fire every 2.6 seconds, dealing area damage to every Barracks unit within the blast.
- **Headless Horseman:** the oversized spectral wave-20 boss has 6,480 base health, 50% more than the Dragon, and rides a neutral white-and-gray voxel skeletal warhorse modeled after a classic block-game skeleton horse, with a hollow rectangular rib cage, square vertebrae and legs, four compact black cube hooves, and a proportionally smaller lowered cuboid skull. Two recessed black sockets form empty eye holes; the mount has no eyes, flame, or aura effects. The rider carries a long halberd with a spear point, broad axe blade, and rear hook, sweeping it through a full attack arc to deal 190 damage to Barracks troops.
- **Titan Cyclops:** the enormous wave-30 boss has 9,720 base health, 50% more than the Horseman, and carries a massive tree-trunk club.

Every boss causes immediate defeat if it reaches the castle and is too massive for the Stoneback Ogre to throw backward.

Every main boss wave—10, 20, and 30—also brings one Boss Merchant onto the road immediately beside the boss. This fast, loot-laden enemy refuses to fight or stop for Barracks troops, running straight past their blockade toward Stonewatch Keep. Other defenses can still target him, and defeating him grants a valuable reward.

Killing a Boss Merchant pauses the assault and opens his relic store; letting him reach the castle never opens it. Each visit stocks one Mercenary Sword (+25% damage), Sun Amulet (+20% range), Swift Boots (18% faster attacks), Guardian Shield (+30% Barracks troop health), and Fortune Ring (+50% Gold Mine production). Purchased relics enter the Relic Satchel. Select a relic there and click a compatible defense to equip it. Each defense has three slots and may carry only one copy of each relic; click an equipped relic to return it to the satchel. Selling a defense also returns its relics.

Every main boss wave—10, 20, and 30—also brings one Boss Merchant onto the road immediately beside the boss. This fast, loot-laden enemy refuses to fight or stop for Barracks troops, running straight past their blockade toward Stonewatch Keep. Other defenses can still target him, and defeating him grants a valuable reward.

Enemy attacks against Barracks troops are intentionally dangerous: ordinary and themed enemies deal 50% more clash damage than the original balance. Ancient Dragon fire deals exactly 150 area damage, while the later Headless Horseman and Titan Cyclops deal 190 and 240 damage per hit respectively. Keep-breach damage remains in whole-heart values.

Defeated enemies break into creature-colored block debris. The pieces tumble onto the battlefield, remain on the ground for three seconds, and then fade away.

## Tower roles

- **Royal Archers:** three ground-standing archers fire a rapid one-two-three volley at a single target. Their final upgrade permanently chooses the Riflemen or Slingshooter path.
- **Royal Wizard:** magic attacks damage groups of enemies and are especially effective against physically resistant troops.
- **Royal Ballista:** expensive, slow, very long-ranged heavy damage. Its final upgrade replaces ordinary bolts with brightly burning Flaming Greatbolts and a fiery impact burst.
- **Royal Barracks:** deploys two small knights to the nearest road. Knights block enemies, fight in melee, take damage, and respawn after eight seconds. Level 2 adds a third knight; the final upgrade permanently chooses the Gravestone or Gladiator path.
- **Stoneback Ogre:** a single-target living tower that grabs one non-boss enemy, pulls it into its hands, and throws it backward along the road. Upgrades improve its impact damage, grab range, recovery time, and throw distance. Bosses are too massive to displace but still take impact damage.
- **Dread Ghost:** a spectral living defense that fears the three nearest enemies in range. Feared enemies turn around, disengage from barracks knights, and retrace the road for exactly two seconds. Afterward, each affected enemy resists further fear for four seconds, even from other Ghosts. Its 3.8-second base recovery matches the Stoneback Ogre, while upgrades improve its range and recovery time.
- **Crimson Vampire:** a focused single-target magical attacker whose damage is set to 60% of its previous balance. Each strike drains blood from the foremost enemy in range, shown as a stream of glowing crimson cubes flowing from the victim into the Vampire. Its final upgrade permanently chooses the Bloodstorm or Nightspawn path.
- **Gold Mine:** a non-combat economy building. Hire up to three visible workers; production is processed every 3 seconds while a wave is active.

Gold Mines cost 125 gold. Their workers cost 45, 65, and 85 gold, making each additional worker a larger investment. Mines and hired workers are included when calculating the building's resale value.

Every visible pine tree occupies and blocks its underlying grass tile. Left-click a tree to inspect it, then spend 400 gold to dig it up and permanently open that tile for defense placement during the current battle. Starting a new game restores the forest.

Enemy rewards and Gold Mine production are reduced to 25% of their original values. Fractional quarters are carried forward internally and paid as whole gold later, so the displayed balance never contains decimals. Wave-clear bonuses remain at their original full value. Starting gold, building costs, upgrade costs, worker prices, and tower sale refunds are unchanged.

At level 2, each Royal Wizard gains a permanent final-upgrade choice:

- **Arcane Path:** keeps the spire's maximum magical damage.
- **Frost Path:** trades some damage for a larger blast and slows every surviving enemy caught in the blast by 38% for 2.75 seconds.

At level 2, each Royal Barracks also gains a permanent final-upgrade choice:

- **Gravestone Path:** replaces the barracks and knights with a glowing grave marker. It raises one expendable Zombie every four seconds until eight are active; fallen Zombies must be raised again through the same timer.
- **Gladiator Path:** replaces the knight squad with exactly three elite Gladiators. They have substantially more health and physical damage, move faster, and respawn ten seconds after defeat.

At level 2, each Royal Archer squad gains a permanent final-upgrade choice:

- **Riflemen Path:** equips all three troops with rifles. They continue firing in a coordinated one-two-three sequence, dealing substantially more physical damage per shot but taking much longer to reload between volleys.
- **Slingshooters Path:** replaces the bows with a large crew-operated slingshot. All three troops load and release one heavy rock that travels more slowly and damages every enemy within a 72-unit blast radius.

At level 2, each Crimson Vampire gains a permanent final-upgrade choice:

- **Bloodstorm Path:** expands each blood drain to strike as many as five enemies at the same time.
- **Nightspawn Path:** keeps the single-target drain, but every enemy personally killed by the Vampire rises where it fell as a disposable Vampire Minion. Each minion has exactly 300 health, deals 90 physical damage per hit, moves and blocks like a Barracks troop, does not respawn after being slain, and dissolves when the current wave ends.

## Project files

- `index.html` contains the page structure and interface.
- `styles.css` controls the visual design and responsive layout.
- `js/game/` contains the gameplay as small purpose-based modules. Its own `README.md` is a map showing exactly where each kind of feature belongs.
- `graphics3d.js` builds and animates the 3D terrain, models, lighting, shadows, health bars, and effects.
- `electron-main.js` creates and secures the Windows game window.
- `forge.config.js` configures the x64 Windows package and Squirrel installer.
- `assets/stonewatch-keep.png` is the source artwork for the application icon.
- `scripts/build-icon.mjs` converts the icon artwork into Windows `.ico` format.
- `package.json` records the game dependencies and desktop development commands.

## Good next additions

Future versions could add sound and music, a campaign map, more levels and tower branches, heroes and spells, enemy resistances, a save system, and original illustrated art.

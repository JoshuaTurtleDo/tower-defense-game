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
- **Endless Siege:** begins with the same 30-wave campaign, then loops its enemy formations forever. Every new 30-wave cycle adds more ordinary enemies, shortens their arrival gaps, and combines those increases with the game's existing wave-based health and speed scaling. The Dragon, Horseman, and Cyclops return every ten waves, while the five event themes and their Merchants repeat every six waves.

Use the **Menu** button above the battlefield to resume, begin a fresh mode, or open Settings. Settings can toggle dynamic shadows and enemy health bars, and switch camera orbiting between normal and fast sensitivity.

## Wave events

Every sixth wave now triggers a themed event on top of the normal assault. The event enemies and one Event Merchant are interleaved into the ordinary spawn queue, appear in the next-wave preview, use their own detailed 3D models, and retain the same wave-based health and speed scaling as the rest of the army.

- **Wave 6 — Pirate Raid:** 14 quick Pirate Cutthroats land with the tentacle-faced mini-boss Davy Jones.
- **Wave 12 — Moonlit Hunt:** 14 very fast Moonfang Werewolves join their oversized Moonfang Alpha.
- **Wave 18 — Viking Invasion:** 16 physically armored Frost Vikings drag a full Viking Longship down the road.
- **Wave 24 — Spectral Procession:** 18 magic-resistant Spectral Wraiths accompany a Coven Witch. The Witch summons two more Wraiths every 4.5 seconds, up to six additional ghosts. She also attacks Barracks troops from 150 units away with homing magical projectiles that explode across a 68-unit area instead of using melee attacks.
- **Wave 30 — Infernal Rift:** 20 durable Rift Demons and a gigantic Rift Overlord flood the final Cyclops battle.

Event mini-bosses have substantially more health, larger models, stronger attacks, unique resistance profiles, and immunity to the Stoneback Ogre's throw. Unlike the campaign bosses, they damage the keep normally instead of causing an immediate defeat on their own.

The pause, game-speed, and reset-camera controls are in the lower-left of the battlefield. Hold the right mouse button and drag over the battlefield to orbit around it, and use the scroll wheel to zoom in or out; the platform remains the fixed center of the view. The reset button returns both the angle and zoom to the centered isometric overview. Press `Esc` to cancel tower placement, or press the Space bar to cycle through 1×, 2×, and 3× game speed.

The **Monster Index** button sits in the lower-right of the battlefield. Every enemy is permanently recorded the first time it spawns, and the index shows its name, threat class, base health, movement speed, keep damage, physical resistance, and magic resistance. Discoveries remain unlocked across new battles and app restarts. Opening the index pauses the battle until it is closed.

## Desktop development

- `npm start` launches the editable source as an Electron desktop game.
- `npm run smoke` runs an invisible load test of the game and desktop wrapper.
- `npm run make` creates the x64 Windows installer in `out/make`.
- `npm run icon` rebuilds the Windows icon from the source PNG.

The generated `out` directory is intentionally excluded from Git. Make changes to the source files, test them, and rebuild the installer rather than editing the packaged `.exe`.

## Enemy threat levels

- **Goblins:** fragile and quick, with no physical or magic resistance.
- **Skeletons:** resist 25% of magic damage but have no physical resistance.
- **Armored Orcs:** resist 30% of physical damage and 10% of magic damage.
- **Ogres:** heavily resist physical damage by 40%, but resist only 5% of magic damage.
- **Ancient Dragon:** the 2,160-health wave-10 boss resists 22% of physical damage and 35% of magic damage. When blocked, it breathes fire every 2.6 seconds, dealing area damage to every Barracks unit within the blast.
- **Headless Horseman:** the oversized spectral wave-20 boss has 6,480 base health and rides a neutral white-and-gray voxel skeletal warhorse modeled after a classic block-game skeleton horse, with a hollow rectangular rib cage, square vertebrae and legs, four compact black cube hooves, and a proportionally smaller lowered cuboid skull. Two recessed black sockets form empty eye holes; the mount has no eyes, flame, or aura effects. The rider carries a long halberd with a spear point, broad axe blade, and rear hook, sweeping it through a full attack arc to deal 190 damage to Barracks troops.
- **Titan Cyclops:** the enormous wave-30 boss has 9,720 base health, 50% more than the Horseman, and carries a massive tree-trunk club.

Every boss causes immediate defeat if it reaches the castle and is too massive for the Stoneback Ogre to throw backward. Wave bosses and event mini-bosses initially ignore Barracks troops and continue down the road; once a Barracks troop lands its first hit, that boss becomes provoked and retaliates against blocking troops normally.

Every event wave—6, 12, 18, 24, and 30—brings one Event Merchant onto the road beside the themed army. This loot-laden enemy has 624 base health and 52.5 movement speed, refuses to fight or stop for Barracks troops, and runs straight toward Stonewatch Keep. Other defenses can still target him. Killing the Merchant preserves his store, but it opens only after that event's themed mini-boss is defeated; an escaped Merchant offers no shop.

The first Event Merchant offers the five Common relics. The second Merchant always offers at least three Rares and one Epic. A store contains no more than ten relics, drawn from five Commons, eight Rares, eight Epics, and any unlocked Uniques. Buying any relic improves future stores: Common slots are progressively replaced by additional Rare and Epic choices. The Merchant Favour bar at the bottom of the shop advances with every purchase and reaches maximum favour after five purchases. Filling it unlocks orange-framed Unique relics in future shops. If the player buys nothing, later stores keep the second Merchant's baseline mix. Purchased relics enter the Relic Satchel. Select one there and click a compatible defense to equip it. Each defense has three slots and may carry only one copy of each relic; click an equipped relic to return it to the satchel. Selling a defense also returns its relics.

Enemy attacks against Barracks troops are intentionally dangerous: ordinary and themed enemies deal 50% more clash damage than the original balance. Ancient Dragon fire deals exactly 150 area damage, while the later Headless Horseman and Titan Cyclops deal 190 and 240 damage per hit respectively. Keep-breach damage remains in whole-heart values.

Defeated enemies break into creature-colored block debris. The pieces tumble onto the battlefield, remain on the ground for three seconds, and then fade away.

## Tower roles

- **Royal Archers:** three ground-standing archers deal 16.8 base physical damage per arrow while firing a rapid one-two-three volley at a single target. Their final upgrade permanently chooses the Riflemen path, which deals about 95.46 damage per shot, or the Slingshooter path, which deals 120 area damage per rock.
- **Royal Wizard:** costs 130 gold and deals 35 base magic area damage, making it especially effective against physically resistant troops. Its discounted upgrades cost 164 gold for level 2 and 228 gold for the final path choice.
- **Royal Ballista:** expensive, slow, very long-ranged heavy damage. Its discounted upgrades cost 202 gold for level 2 and 281 gold for level 3, whose Flaming Greatbolts replace ordinary bolts with a fiery impact burst.
- **Royal Barracks:** deploys two small knights to the nearest road. Knights block enemies, fight in melee, take damage, and respawn after eight seconds. Level 2 adds a third knight; the final upgrade permanently chooses the Gravestone or Gladiator path.
- **Stoneback Ogre:** a 150-gold single-target living tower with 200 base physical damage that grabs one non-boss enemy, pulls it into its hands, and throws it backward along the road. Upgrades improve its impact damage, grab range, recovery time, and throw distance. Bosses are too massive to displace but still take impact damage.
- **Dread Ghost:** a spectral living defense that fears one enemy at level 1, adding one more target with each upgrade. Feared enemies turn around, disengage from barracks knights, and retrace the road for exactly two seconds. Afterward, normal enemies resist further fear for four seconds and bosses or mini-bosses resist it for eight seconds, even from other Ghosts. Its 3.8-second base recovery matches the Stoneback Ogre, while upgrades improve its range, recovery time, and fear count. Equipping the orange Unique **Umbral Form** transforms it into a larger, purple, horned Umbral Horror. Its normal fear becomes four-second possession: affected non-boss enemies stop marching and attack the nearest unpossessed monster with their own physical damage until possession expires or they die. Bosses and event mini-bosses cannot be possessed, so Umbral Form briefly fears them for one second instead.
- **Boss summons:** every wave boss and event mini-boss periodically summons five miniature copies after 15 seconds. These copies use the boss's model at a smaller scale, have 5% of its health and damage, and grant no gold when defeated; they are dangerous reinforcements but do not count as bosses for castle-breach defeat rules.
- **Alien UFO:** a 400-gold hovering magical defense that rapidly fires bright green laser bolts. It deals 24 base damage every 0.3 seconds at 185 range and follows the standard three-level upgrade curve.
- **Tiny Castle:** a 225-gold support defense that empowers combat defenses on any of its eight surrounding tiles. Affected defenses gain 20% damage, 20% range, and 20% attack speed. The aura does not stack when a defense is beside more than one Tiny Castle.
- **Crimson Vampire:** a focused single-target magical attacker whose damage is set to 60% of its previous balance. Each strike drains blood from the foremost enemy in range, shown as a stream of glowing crimson cubes flowing from the victim into the Vampire. Its final upgrade permanently chooses the Bloodstorm or Nightspawn path. Equipping the Unique **Dracula's Cloak** transforms it into a larger, orange-lit Dracula Vampire dealing triple the damage of an otherwise max-level Vampire. Every eight seconds it turns the nearest five enemies into animated bats for five seconds; bat-form enemies take 30% increased damage from every source, then return to their normal models and defenses. Dracula retains the Vampire's chosen final path: Bloodstorm continues draining five enemies at once, while Nightspawn continues raising slain enemies as Vampire Minions.
- **Gold Mine:** a non-combat economy building. Hire up to five visible workers; each worker produces 15 gold when a wave is cleared, for a maximum payout of 75 gold per round. Once fully staffed, it can be permanently converted into a Treasure Cove.
- **Treasure Cove:** replaces the mine's gold production with relic excavation. After each cleared wave, its five workers have a 50% chance to uncover one random Common relic and place it directly into the Relic Satchel. Rare and Epic relics remain exclusive to Event Merchants. A Fortune Ring increases the excavation chance to 60%.

Gold Mines cost 150 gold. Their five workers cost 45, 65, 85, 110, and 140 gold, making each additional worker a larger investment. Converting a fully staffed mine into a Treasure Cove costs another 420 gold. The mine, every hired worker, and the Cove conversion are included when calculating the building's resale value.

Repeated placements have escalating prices. The first defense of each type uses its listed base price, and every additional defense of that same type costs 10% more than the previous one. Each defense type tracks this increase separately, and selling a defense does not reset its placement history.

Every visible pine tree occupies and blocks its underlying grass tile. Left-click a tree to inspect it, then spend 400 gold to dig it up and permanently open that tile for defense placement during the current battle. Starting a new game restores the forest.

Enemy defeat rewards pay 34.5% of their listed values, which is 15% more gold than the previous 30% rate. Fractional gold is carried forward internally and paid as whole gold later, so the displayed balance never contains decimals. Gold Mines pay a separate 15 gold per worker when each wave is cleared, and wave-clear bonuses remain at their original full value.

At level 2, each Royal Wizard gains a permanent final-upgrade choice:

- **Arcane Path:** keeps the spire's maximum magical damage.
- **Frost Path:** turns the Wizard's robes and hat icy blue, trades some damage for a larger blast, and slows every surviving enemy caught in the blast by 38% for 2.75 seconds.

At level 2, each Royal Barracks also gains a permanent final-upgrade choice:

- **Gravestone Path:** replaces the barracks and knights with a glowing grave marker. It raises one expendable Zombie every four seconds until eight are active; fallen Zombies must be raised again through the same timer.
- **Gladiator Path:** replaces the knight squad with exactly three elite Gladiators. They have substantially more health and physical damage, move faster, and respawn ten seconds after defeat.

At level 2, each Royal Archer squad gains a permanent final-upgrade choice:

- **Riflemen Path:** equips all three troops with rifles. They continue firing in a coordinated one-two-three sequence, dealing substantially more physical damage per shot but taking much longer to reload between volleys.
- **Slingshooters Path:** replaces the bows with a large crew-operated slingshot. All three troops load and release one heavy rock that travels more slowly and damages every enemy within a 72-unit blast radius.

At level 2, each Crimson Vampire gains a permanent final-upgrade choice:

- **Bloodstorm Path:** expands each blood drain to strike as many as five enemies at the same time.
- **Nightspawn Path:** keeps the single-target drain, but every enemy personally killed by the Vampire rises where it fell as a disposable Vampire Minion. Each minion has exactly 300 health, deals 90 physical damage per hit, moves and blocks like a Barracks troop, does not respawn after being slain, and dissolves when the current wave ends.

At level 2, each Alien UFO gains a permanent final-upgrade choice:

- **Twin Laser Path:** keeps the rapid fire and adds a second beam to every attack. The new beam is bright red, while the original remains green.
- **Massive Beam Path:** replaces rapid fire with one much larger laser that deals roughly 3.3× the upgraded damage and hits every enemy within a 105-unit area around its target.

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

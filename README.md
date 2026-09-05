# Stonewatch Keep

A medieval tower-defense game for iPhone, iPad, Windows, and web browsers. The battlefield is rendered as a fully lit 3D low-poly diorama using WebGL and a local copy of Three.js. The iOS app uses Apple's WKWebView, Electron provides the Windows desktop application, and the editable game remains ordinary HTML, CSS, and JavaScript.

## Run on an iPhone

1. Install Xcode on a Mac and connect the iPhone by cable (or enable wireless development in Xcode).
2. Run `npm run ios:open` from this project. This refreshes the bundled game files and opens `ios/StonewatchKeep.xcodeproj`.
3. In Xcode, select the **Stonewatch Keep** project, open **Signing & Capabilities**, and choose your Apple ID's development team. A free Apple ID works for installing on your own phone.
4. Choose the connected iPhone in Xcode's device menu and press the Run button (▶). If prompted on the phone, enable Developer Mode and trust the developer certificate.

The app is landscape-only. Tap to build or inspect, drag one finger over the battlefield to orbit, and use the −/+ battlefield buttons to zoom. The complete game is bundled in the app and does not need a network connection. After changing web game files, run `npm run ios:sync` before the next Xcode build.

## Play the Windows game

Run `Stonewatch Keep Setup.exe` and then launch **Stonewatch Keep** from its Desktop or Start Menu shortcut. Press `F11` or `Alt+Enter` to switch between windowed and fullscreen play.

## Play in a browser

Double-click `index.html`. It will open in your usual browser. Choose **Play** on the title screen, then select a mode.

1. Choose **40-Wave Campaign** for the complete battle or **Endless Siege** for an unending challenge.
2. Choose a defense in the armory and click an open grassy square to place it.
3. Press **Begin wave** when you are ready.
4. Click a built defense to upgrade, equip relics, or sell it.
5. Protect all 20 keep health. Waves 10, 20, 30, and 40 contain the Ancient Dragon, Headless Horseman, Titan Cyclops, and Glacier Yeti respectively; if any boss reaches the castle, the battle is lost immediately.

## Game modes and settings

- **40-Wave Campaign:** the complete battle, ending in victory after the Glacier Yeti and its remaining army are defeated on wave 40.
- **Endless Siege:** begins with the same 40-wave campaign, then loops its enemy formations forever. Every new 40-wave cycle adds more ordinary enemies, shortens their arrival gaps, and combines those increases with the game's existing wave-based health and speed scaling. The Dragon, Horseman, Cyclops, and Yeti return every ten waves, while themed events and their Merchants continue every six waves.

Use the **Menu** button above the battlefield to resume, begin a fresh mode, or open Settings. Settings can toggle dynamic shadows and enemy health bars, and switch camera orbiting between normal and fast sensitivity.

## Passive Tree progression

The **Passive Tree** is available from the opening screen and from every victory/defeat results screen. It is a permanent nine-branch tree with a central starting point; each branch improves one defense, with stronger nodes farther from the center. Normal nodes use Rubies and Sapphires, while special function unlocks (such as the Tiny Castle's 200-damage area cannon) also require Emeralds. Progress is saved in the browser or desktop app's local storage and carries into future games.

- **Ruby:** awarded after each completed run, with the amount increasing from the total damage dealt by player defenses (up to 100 per run).
- **Sapphire:** awarded for each set of 10 consecutive waves cleared without losing keep health.
- **Emerald:** a deliberately scarce reward: one is granted for completing the 40-wave campaign.

After a run ends, the results screen shows the three resource icons and the amounts earned. Open **Passive Tree** there (or from the title screen) to spend those resources and permanently strengthen future defenses. Upgrade nodes are compact cards: hover or focus one to see its full effect, cost, and unlock requirement. The tree canvas has its own wheel-scrolling viewport so it never changes the battlefield camera zoom.

## Wave events

Every sixth wave now triggers a themed event on top of the normal assault. The event enemies and one Event Merchant are interleaved into the ordinary spawn queue, appear in the next-wave preview, use their own detailed 3D models, and retain the same wave-based health and speed scaling as the rest of the army.

- **Wave 6 — Pirate Raid:** 14 quick Pirate Cutthroats land with the tentacle-faced mini-boss Davy Jones.
- **Wave 12 — Moonlit Hunt:** 14 very fast Moonfang Werewolves join their oversized Moonfang Alpha.
- **Wave 18 — Viking Invasion:** 16 physically armored Frost Vikings drag a full Viking Longship down the road.
- **Wave 24 — Spectral Procession:** 18 magic-resistant Spectral Wraiths accompany a Coven Witch. The Witch summons two more Wraiths every 4.5 seconds, up to six additional ghosts. She also attacks Barracks troops from 150 units away with homing magical projectiles that explode across a 68-unit area instead of using melee attacks.
- **Wave 30 — Infernal Rift:** 20 durable Rift Demons and a gigantic Rift Overlord flood the final Cyclops battle.
- **Wave 36 — Davy Jones' Revenge:** a stronger returning Pirate fleet brings 24 Cutthroats, Davy Jones, and another Event Merchant.

Event mini-bosses have substantially more health, larger models, stronger attacks, unique resistance profiles, and immunity to the Stoneback Ogre's throw. Unlike the campaign bosses, they damage the keep normally instead of causing an immediate defeat on their own.

The pause, game-speed, and reset-camera controls are in the lower-left of the battlefield. Hold the right mouse button and drag over the battlefield to orbit around it, and use the scroll wheel to zoom in or out; the platform remains the fixed center of the view. The reset button returns both the angle and zoom to the centered isometric overview. Press `Esc` to cancel tower placement, or press the Space bar to cycle through 1×, 2×, and 3× game speed.

The **Monster Index** button sits in the lower-right of the battlefield. Every enemy is permanently recorded the first time it spawns, and the index shows its name, threat class, base health, movement speed, keep damage, physical resistance, and magic resistance. Discoveries remain unlocked across new battles and app restarts. Opening the index pauses the battle until it is closed.

## Desktop development

- `npm start` launches the editable source as an Electron desktop game.
- `npm run smoke` runs an invisible load test of the game and desktop wrapper.
- `npm run make` creates the x64 Windows installer in `out/make`.
- `npm run icon` rebuilds the Windows icon from the source PNG.
- `npm run ios:sync` refreshes the offline web bundle embedded by the Xcode project.
- `npm run ios:open` syncs that bundle and opens the ready-to-run iOS project.

The generated `out` directory is intentionally excluded from Git. Make changes to the source files, test them, and rebuild the installer rather than editing the packaged `.exe`.

## Enemy threat levels

- **Goblins:** fragile and quick, with no physical or magic resistance.
- **Skeletons:** resist 25% of magic damage but have no physical resistance.
- **Armored Orcs:** resist 30% of physical damage and 10% of magic damage.
- **Ogres:** heavily resist physical damage by 40%, but resist only 5% of magic damage.
- **Ancient Dragon:** the 2,160-health wave-10 boss resists 22% of physical damage and 35% of magic damage. When blocked, it breathes fire every 2.6 seconds, dealing area damage to every Barracks unit within the blast.
- **Headless Horseman:** the oversized spectral wave-20 boss has 3,240 base health and rides a neutral white-and-gray voxel skeletal warhorse modeled after a classic block-game skeleton horse, with a hollow rectangular rib cage, square vertebrae and legs, four compact black cube hooves, and a proportionally smaller lowered cuboid skull. Two recessed black sockets form empty eye holes; the mount has no eyes, flame, or aura effects. The rider carries a long halberd with a spear point, broad axe blade, and rear hook, sweeping it through a full attack arc to deal 190 damage to Barracks troops.
- **Titan Cyclops:** the enormous wave-30 boss has 4,860 base health, 50% more than the Horseman, and carries a massive tree-trunk club.
- **Glacier Yeti:** the largest wave-40 boss has 7,290 base health, 50% more than the Cyclops. Every five seconds it throws a huge snowball at a random defense within one tile, encasing it in ice and completely disabling it for eight seconds.

Every boss causes immediate defeat if it reaches the castle and is too massive for the Stoneback Ogre to throw backward. Wave bosses and event mini-bosses initially ignore Barracks troops and continue down the road; once a Barracks troop lands its first hit, that boss becomes provoked and retaliates against blocking troops normally.

Every event wave—6, 12, 18, 24, 30, and 36 during the campaign—brings one Event Merchant onto the road beside the themed army. This loot-laden enemy has 624 base health and 52.5 movement speed, refuses to fight or stop for Barracks troops, and runs straight toward Stonewatch Keep. Other defenses can still target him. Killing the Merchant preserves his store, but it opens only after that event's themed mini-boss is defeated; an escaped Merchant offers no shop and causes no Keep damage.

The first Event Merchant offers five Common relics. Every later Merchant offers exactly five relics, beginning with one Common, three Rares, and one Epic. The player may claim only one relic per Merchant visit; after a purchase, that shop closes and its remaining cards become unavailable. Buying relics improves future stores by replacing lower-tier slots with Epics; at maximum favour, the shop contains four Epics and one orange-framed Unique. The Merchant Favour bar at the bottom of the shop advances with every purchase and reaches maximum favour after five purchases. If the player buys nothing, later stores keep the second Merchant's baseline mix. Purchased relics enter the Relic Satchel. Select a defense first to activate its satchel, then click a compatible relic to equip it or drag the relic onto any of the three equipped slots. Hover or focus a relic to see its name, tier, and exact effect. Each defense may carry only one copy of each relic; click an equipped relic to return it to the satchel. Selling a defense also returns its relics.

Enemy attacks against Barracks troops are intentionally dangerous: ordinary and themed enemies deal 50% more clash damage than the original balance. Ancient Dragon fire deals exactly 150 area damage, while the later Headless Horseman, Titan Cyclops, and Glacier Yeti deal 190, 240, and 300 damage per hit respectively. Keep-breach damage remains in whole-heart values.

Defeated enemies break into creature-colored block debris. The pieces tumble onto the battlefield, remain on the ground for three seconds, and then fade away.

## Tower roles

- **Royal Archers:** three ground-standing archers deal 16.8 base physical damage per arrow while firing a rapid one-two-three volley at a single target. Their final upgrade permanently chooses the Riflemen path, which deals about 95.46 damage per shot, or the Slingshooter path, which deals 120 area damage per rock.
- **Royal Wizard:** costs 130 gold and deals 35 base magic area damage, making it especially effective against physically resistant troops. Its discounted upgrades cost 164 gold for level 2 and 228 gold for the final path choice. The Arcane final path deals 20% more primary damage.
- **Royal Ballista:** expensive, slow, very long-ranged heavy damage. Its discounted upgrades cost 202 gold for level 2 and 281 gold for its permanent level-three choice.
  - **Flame Bazooka:** retains the Royal Ballista's wooden frame and crossbow silhouette, but wreathes its limbs and loaded ammunition in animated flame. It fires burning greatbolts; each hit ignites its target for two seconds, dealing another 50% of the initial damage over that duration. Repeated hits create independent burns.
  - **Zeus's Bow:** launches 350-damage lightning bolts that stun for 0.2 seconds and shock targets for three seconds. Shocked enemies take 10% increased damage from all sources.
- **Royal Barracks:** deploys two small knights to the nearest road. Knights block enemies, fight in melee, take damage, and respawn after eight seconds. Level 2 adds a third knight; the final upgrade permanently chooses the Gravestone or Gladiator path.
- **Stoneback Ogre:** a 150-gold single-target living tower with 200 base physical damage that grabs one non-boss enemy, pulls it into its hands, and throws it backward along the road. Its final upgrade permanently chooses between becoming Togga's Strongest Warrior or a StoneThrow Ogre.
- **Dread Ghost:** a spectral living defense that fears one enemy at level 1, adding one more target with each upgrade. Feared enemies turn around, disengage from barracks knights, and retrace the road for exactly two seconds. Afterward, normal enemies resist further fear for four seconds and bosses or mini-bosses resist it for eight seconds, even from other Ghosts. Its 3.8-second base recovery matches the Stoneback Ogre, while upgrades improve its range, recovery time, and fear count. Equipping the orange Unique **Umbral Form** transforms it into a larger, purple, horned Umbral Horror. Its normal fear becomes four-second possession: affected non-boss enemies stop marching and attack the nearest unpossessed monster with their own physical damage until possession expires or they die. Bosses and event mini-bosses cannot be possessed, so Umbral Form briefly fears them for one second instead.
- **Boss summons:** this ability begins with the wave-20 Headless Horseman. From wave 20 onward, wave bosses and event mini-bosses periodically summon five miniature copies every 15 seconds. These copies use the boss's model at a smaller scale, have 2% of its health and 5% of its damage, grant no gold when defeated, and cause no Keep damage if they reach the castle.
- **Alien UFO:** a 700-gold hovering magical defense that rapidly fires bright green laser bolts. It deals 24 base damage every 0.3 seconds at 185 range and follows the standard three-level upgrade curve.
- **Tiny Castle:** a 600-gold support defense that empowers combat defenses on any of its eight surrounding tiles. Affected defenses gain 20% damage, 20% range, and 20% attack speed. The aura does not stack when a defense is beside more than one Tiny Castle.
- **Crimson Vampire:** a 175-gold focused single-target magical attacker whose damage is set to 60% of its previous balance. Each strike drains blood from the foremost enemy in range, shown as a stream of glowing crimson cubes flowing from the victim into the Vampire. Its final upgrade permanently chooses the Bloodstorm or Nightspawn path. Equipping the Unique **Dracula's Cloak** transforms it into a larger, orange-lit Dracula Vampire dealing triple the damage of an otherwise max-level Vampire. Every eight seconds it turns the nearest five enemies into animated bats for five seconds; bat-form enemies take 30% increased damage from every source, then return to their normal models and defenses. Dracula retains the Vampire's chosen final path: Bloodstorm continues draining five enemies at once, while Nightspawn continues raising slain enemies as Vampire Minions.
- **Gold Mine:** a non-combat economy building. Hire up to three visible workers; each worker produces 15 gold when a wave is cleared, for a maximum payout of 45 gold per round. Once fully staffed, it can be permanently converted into a Treasure Cove.
- **Treasure Cove:** replaces the mine's gold production with relic excavation. After each cleared wave, its three workers have a 50% chance to uncover one random Common relic and place it directly into the Relic Satchel. Rare and Epic relics remain exclusive to Event Merchants. A Fortune Ring increases the excavation chance to 60%.

Gold Mines cost 150 gold. Their three workers cost 45, 65, and 85 gold, making each additional worker a larger investment. Converting a fully staffed mine into a Treasure Cove costs another 420 gold. The mine, every hired worker, and the Cove conversion are included when calculating the building's resale value.

Repeated placements have escalating prices. The first defense of each type uses its listed base price, and every additional defense of that same type costs 10% more than the previous one. Each defense type tracks this increase separately, and selling a defense does not reset its placement history.

Every visible pine tree occupies and blocks its underlying grass tile. Left-click a tree to inspect it, then spend 400 gold to dig it up and permanently open that tile for defense placement during the current battle. Starting a new game restores the forest.

Enemy defeat rewards pay 34.5% of their listed values, which is 15% more gold than the previous 30% rate. Fractional gold is carried forward internally and paid as whole gold later, so the displayed balance never contains decimals. Gold Mines pay a separate 15 gold per worker when each wave is cleared, and wave-clear bonuses remain at their original full value.

At level 2, each Stoneback Ogre gains a permanent final-upgrade choice:

- **Togga's Strongest Warrior:** replaces the stationary Ogre with a fully armored 900-health frontline warrior and leaves a rally marker on his tile. Togga can hold up to ten enemies at once and pounds as many as six of them for 500 base physical damage every three seconds, stunning survivors for one second. At 450 health he retreats to his tile, recovers there for six seconds, and returns with full health. If killed, he respawns after fifteen seconds. He also returns to his tile between waves.
- **StoneThrow Ogre:** remains on its tile beside a replenishing rock pile and throws an overhead boulder every three seconds. The directly struck monster takes 400 base physical damage, while every other enemy within a one-tile radius takes 250 base physical damage. A fresh rock reappears beside the Ogre after each throw.

At level 2, each Royal Wizard gains a permanent final-upgrade choice:

- **Arcane Path:** deals 20% increased primary magic damage. The initial projectile then chains for five secondary hits, jumping no farther than half a tile each time and dealing 20% of the primary hit's raw damage per hit. It prefers new enemies, but can bounce back and forth between reachable enemies to finish all five hits.
- **Frost Path:** turns the Wizard's robes and hat icy blue, trades some damage for a one-tile-radius blast, and slows every surviving enemy caught in the blast by 38% for 2.75 seconds.

At level 2, each Royal Barracks also gains a permanent final-upgrade choice:

- **Gravestone Path:** replaces the barracks and knights with a glowing grave marker. It raises one expendable Zombie every four seconds until eight are active; fallen Zombies must be raised again through the same timer. Its 360-gold **Evolved Boomers** upgrade makes every fallen Zombie explode for 150 base physical damage in a 0.5-tile radius. Bright toxic-green cube splashes fly toward nearby enemies and remain on the ground for five seconds.
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

The fantasy art direction uses offline painted material textures, soft grass variation, stone road edging, flowers, layered evergreen branches, weathered masonry and timber, metal accents, and short glowing spell trails. Warm sunlight and cool fill lighting keep units readable against the original dark green battlefield background. Defense icons and menu frames share a muted gold-and-forest palette. Decorative grass and road edging do not affect placement or combat.

- `js/rendering/art-direction.js` owns procedural textures, batched scenery, unit accents, spell trails, and illustrated defense icons.
- `css/art-direction.css` owns the shared fantasy interface styling.
- `npm run capture -- --art-showcase` and `npm run capture -- --menu-showcase` save visual previews under `out/`.

- `index.html` contains the page structure and interface.
- `styles.css` controls the visual design and responsive layout.
- `js/game/` contains the gameplay as small purpose-based modules. Its own `README.md` is a map showing exactly where each kind of feature belongs.
- `graphics3d.js` builds and animates the 3D terrain, models, lighting, shadows, health bars, and effects.
- `electron-main.js` creates and secures the Windows game window.
- `ios/StonewatchKeep.xcodeproj` and `ios/StonewatchKeep/` contain the lightweight native iOS wrapper, app icon, and offline game bundle.
- `forge.config.js` configures the x64 Windows package and Squirrel installer.
- `assets/stonewatch-keep.png` is the source artwork for the application icon.
- `scripts/build-icon.mjs` converts the icon artwork into Windows `.ico` format.
- `package.json` records the game dependencies and desktop development commands.

## Good next additions

Future versions could add sound and music, a campaign map, more levels and tower branches, heroes and spells, enemy resistances, a save system, and original illustrated art.

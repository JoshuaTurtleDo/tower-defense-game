# Stonewatch Keep

A medieval tower-defense game that runs directly in a web browser. The battlefield is rendered as a fully lit 3D low-poly diorama using WebGL and a local copy of Three.js. There is nothing to install and no build step.

## Play the game

Double-click `index.html`. It will open in your usual browser.

1. Choose a tower in the armory.
2. Click an open grassy square to build it.
3. Press **Begin wave** when you are ready.
4. Click a built tower to upgrade or sell it.
5. Survive all 10 waves without losing all 20 keep health.

The pause, game-speed, and reset-camera controls are in the lower-left of the battlefield. Hold the right mouse button and drag over the battlefield to orbit around it; the platform remains the fixed center of the view. The reset button returns to the centered isometric overview. You can also press `Esc` to cancel tower placement and the space bar to begin the next wave.

## Enemy threat levels

- **Goblins:** fragile and quick; these are the lowest-health enemies.
- **Skeletons:** slightly tougher light infantry with a little physical resistance.
- **Armored Orcs:** slower, well-protected troops that reward magical damage.
- **Ogres:** large, high-health bruisers that deal extra damage if they reach the keep.
- **Ancient Dragon:** the enormous final boss, with the most health, armor, reward, and keep damage.

Defeated enemies break into creature-colored block debris. The pieces tumble onto the battlefield, remain on the ground for three seconds, and then fade away.

## Tower roles

- **Archer Tower:** inexpensive, fast, dependable single-target damage.
- **Mage Spire:** magical attacks damage groups of enemies and ignore armor.
- **Royal Ballista:** expensive, slow, very long-ranged heavy damage.
- **Royal Barracks:** deploys two small knights to the nearest road. Knights block enemies, fight in melee, take damage, and respawn after eight seconds. Upgrades add a third and fourth knight while improving their health and damage.
- **Stoneback Ogre:** a single-target living tower that grabs one non-boss enemy, pulls it into its hands, and throws it backward along the road. Upgrades improve its impact damage, grab range, recovery time, and throw distance. Ancient Dragons are too heavy to displace but still take impact damage.
- **Gold Mine:** a non-combat economy building. Hire up to three visible workers; each produces 2 gold every 3 seconds while a wave is active.

Gold Mines cost 125 gold. Their workers cost 45, 65, and 85 gold, making each additional worker a larger investment. Mines and hired workers are included when calculating the building's resale value.

At level 2, each Mage Spire gains a permanent final-upgrade choice:

- **Arcane Path:** keeps the spire's maximum magical damage.
- **Frost Path:** trades some damage for a larger blast and slows every surviving enemy caught in the blast by 38% for 2.75 seconds.

## Project files

- `index.html` contains the page structure and interface.
- `styles.css` controls the visual design and responsive layout.
- `game.js` contains the gameplay, waves, enemies, towers, upgrades, and combat logic.
- `graphics3d.js` builds and animates the 3D terrain, models, lighting, shadows, health bars, and effects.
- `package.json` records the local Three.js rendering dependency.

## Good next additions

Future versions could add sound and music, a campaign map, more levels and tower branches, heroes and spells, enemy resistances, a save system, and original illustrated art.

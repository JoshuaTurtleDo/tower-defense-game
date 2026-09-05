# Game code map

Stonewatch Keep uses ordinary browser scripts so it still runs by double-clicking `index.html`; there is no compiler or bundler. The files are loaded in the order listed below because they share the same browser scope.

## Where to make changes

1. `config.js` — board dimensions, road geometry, shared constants, and small content-building helpers.
2. `content.js` — tower/enemy stats, the 40 campaign waves, themed events, and endless-wave generation. Start here for most balance or roster changes.
3. `progression.js` — persistent Emerald, Sapphire, and Ruby resources, end-of-run rewards, and the nine-branch Passive Tree.
4. `state.js` — renderer creation, new-match state, resets, starting waves, and spawning enemies.
5. `defenses.js` — placing defenses, placement rules, calculated tower stats, standard upgrades, Gold Mine workers, and Treasure Cove conversion.
6. `troops.js` — Barracks troops, Zombies and Evolved Boomer death blasts, Gladiators, Vampire Minions, Togga's frontline behavior, dragon/witch troop attacks, and friendly-unit movement.
7. `upgrade-paths.js` — permanent specialization choices and selling defenses.
8. `relics-and-trees.js` — Merchant shop, Treasure Cove excavation, relic inventory/equipment, and tree removal.
9. `control-effects.js` — Ballista burn/shock ailments, Stoneback Ogre throws, Dread Ghost fear, and Umbral possession behavior.
10. `simulation.js` — the per-frame gameplay update for enemies, defenses, projectiles, waves, and income.
11. `combat.js` — targeting progress, hits, resistances, damage, kills, debris, particles, and victory/defeat.
12. `fallback-renderer.js` — retained 2D drawing helpers. The active 3D presentation remains in the root `graphics3d.js` file.
13. `interface.js` — HUD, build/inspect panels, menus, settings, announcements, and wave previews. It uses `js/rendering/defense-icons.js` for illustrated defense emblems.
14. `monster-index.js` — persistent enemy discovery and the Monster Index encyclopedia UI.
15. `input.js` — mouse, camera, keyboard, and button event handlers.
16. `main.js` — the animation loop and one-time startup. This should stay small.

## Structure rules

- Put editable game definitions in `content.js`, not inside simulation code.
- Put a new behavior beside the system responsible for it; for example, a new status effect belongs in `control-effects.js` and a new UI panel belongs in `interface.js`.
- Keep `main.js` limited to initialization and the frame loop.
- When adding a new file, place it in dependency order in `index.html` before `main.js`.
- Run `npm run smoke` after structural or gameplay changes. The smoke test loads every module in Electron and exercises the major game systems.

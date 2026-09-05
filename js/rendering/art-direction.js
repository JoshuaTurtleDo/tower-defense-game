"use strict";

// Presentation only. Seeded, offline textures and instanced scenery never affect
// placement, targeting, enemy stats, or the player's saved progression.
window.FantasyArt = {
  random(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  },

  texture(kind, renderer) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const random = this.random(721 + kind.length * 51);
    ctx.fillStyle = "#dedbd3";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4200; i++) {
      const value = 135 + Math.floor(random() * 105);
      ctx.fillStyle = `rgba(${value},${value},${value},${kind === "grass" ? .28 : .15})`;
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 5, 1 + random() * 3);
    }
    if (kind === "stone") {
      for (let row = 0; row < 4; row++) for (let col = -1; col < 4; col++) {
        const x = col * 86 + (row % 2) * 43;
        ctx.strokeStyle = "rgba(65,62,57,.35)";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, row * 64 + 2, 82, 60);
        ctx.strokeStyle = "rgba(255,252,235,.55)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 5, row * 64 + 6); ctx.lineTo(x + 80, row * 64 + 6); ctx.stroke();
      }
    } else if (kind === "wood") {
      for (let i = 0; i < 45; i++) {
        ctx.strokeStyle = `rgba(67,52,40,${.06 + random() * .2})`;
        const x = random() * 256;
        ctx.beginPath(); ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 16, 80, x - 12, 170, x + 2, 256); ctx.stroke();
      }
    } else if (kind === "cloth") {
      ctx.fillStyle = "rgba(255,255,255,.17)";
      for (let i = 0; i < 256; i += 4) { ctx.fillRect(i, 0, 1, 256); ctx.fillRect(0, i, 256, 1); }
    } else if (kind === "grass") {
      for (let i = 0; i < 180; i++) {
        ctx.fillStyle = i % 2 ? "rgba(73,90,42,.13)" : "rgba(250,242,187,.22)";
        ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 4 + random() * 18, 2 + random() * 8, random() * 6, 0, Math.PI * 2); ctx.fill();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  },

  materials(graphics) {
    const m = graphics.mat;
    const groups = {
      grass: ["grassA", "grassB", "grassC", "grassEdge", "leaf", "leafMid", "leafLight"],
      stone: ["stone", "stoneLight", "darkStone"],
      wood: ["wood", "lightWood"],
      cloth: ["cloth", "roofRed", "roofLight", "red", "darkRed", "frostCloth"],
      grain: ["soil", "soilEdge", "earth", "bone", "goblin", "orc", "ogre"]
    };
    for (const [kind, names] of Object.entries(groups)) {
      const map = this.texture(kind, graphics.renderer);
      for (const name of names) { m[name].map = map; }
    }
    // Close hues keep placement cells legible without the old chessboard contrast.
    m.grassA.color.setHex(0x557547); m.grassB.color.setHex(0x4f7043); m.grassC.color.setHex(0x5b7a4b);
    m.soil.color.setHex(0xc4ae82); m.soilEdge.color.setHex(0x887559); m.soilMark.color.setHex(0xa28e69);
    m.stone.color.setHex(0x8e9b9a); m.stoneLight.color.setHex(0xc0c4b8);
    m.iron.color.setHex(0x65767e); m.iron.roughness = .34; m.iron.metalness = .45;
    m.gold.color.setHex(0xcfa760); m.gold.metalness = .45;
    m.roofRed.color.setHex(0x863c37); m.roofLight.color.setHex(0xac5143);
  },

  instances(graphics, geometry, material, transforms, parent = graphics.scene) {
    if (!transforms.length) return;
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.angle || 0, 0);
      dummy.scale.set(t.sx || 1, t.sy || 1, t.sz || 1);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    parent.add(mesh);
    return mesh;
  },

  world(graphics, road) {
    const { COLS, ROWS, pathCells } = graphics.config;
    const random = this.random(9034);
    const blocks = [];
    for (let x = -COLS / 2; x <= COLS / 2; x += .65) {
      for (const side of [-1, 1]) blocks.push({ x, y: -.3, z: side * (ROWS / 2 + .31), sx: .61, sy: .3, sz: .18 });
    }
    for (let z = -ROWS / 2; z < ROWS / 2; z += .65) {
      for (const side of [-1, 1]) blocks.push({ x: side * (COLS / 2 + .31), y: -.3, z, sx: .18, sy: .3, sz: .61 });
    }
    this.instances(graphics, new THREE.BoxGeometry(1, 1, 1), graphics.mat.darkStone, blocks);
    const kerbs = [];
    for (let i = 2; i < road.length - 2; i += 3) {
      const p = road[i], next = road[i + 1];
      const angle = Math.atan2(next.z - p.z, next.x - p.x);
      for (const side of [-1, 1]) kerbs.push({
        x: p.x - Math.sin(angle) * .43 * side, z: p.z + Math.cos(angle) * .43 * side,
        y: .12, angle: -angle, sx: .14 + random() * .04, sy: .035 + random() * .015, sz: .095
      });
    }
    this.instances(graphics, new THREE.BoxGeometry(1, 1, 1), graphics.mat.stone, kerbs);
    const roadCells = new Set(pathCells.map(([x, y]) => `${x},${y}`));
    const grass = [], flowers = [], pebbles = [];
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      if (roadCells.has(`${col},${row}`)) continue;
      // Only decorate the edges of buildable squares; their centers stay clear.
      for (let i = 0; i < 7; i++) {
        const x = col - COLS / 2 + .08 + random() * .18;
        const z = row - ROWS / 2 + random();
        grass.push({ x, y: .075, z, angle: random() * 6, sx: .025, sy: .10 + random() * .08, sz: .045 });
        if (i === 0 && (row + col) % 3 === 0) flowers.push({ x, y: .16, z, sx: .043, sy: .025, sz: .043 });
        if (i === 1 && (row + col) % 4 === 0) pebbles.push({ x, y: .06, z, sx: .07, sy: .035, sz: .06 });
      }
    }
    this.instances(graphics, new THREE.ConeGeometry(1, 1, 3), graphics.mat.leafLight, grass);
    this.instances(graphics, new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xb7a5cf, roughness: .85 }), flowers);
    this.instances(graphics, new THREE.DodecahedronGeometry(1, 0), graphics.mat.stoneLight, pebbles);
  },

  tree(graphics, crown, variant) {
    // Offset boughs break up the perfectly stacked-cone silhouette.
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4 + variant;
      const radius = .20 - i * .026;
      const bough = graphics.mesh(new THREE.ConeGeometry(.23 - i * .018, .42, 5),
        i % 2 ? graphics.mat.leafLight : graphics.mat.leafMid,
        Math.cos(angle) * radius, .63 + i * .13, Math.sin(angle) * radius, crown);
      bough.rotation.z = Math.cos(angle) * .18;
      bough.rotation.x = Math.sin(angle) * .18;
    }
  },

  enemy(graphics, group, type) {
    const m = graphics.mat;
    if (type === "goblin") {
      graphics.mesh(new THREE.BoxGeometry(.11, .13, .08), m.lightWood, -.14, .33, .12, group).rotation.z = -.15;
      graphics.mesh(new THREE.BoxGeometry(.045, .04, .015), m.gold, -.14, .36, .17, group);
    }
    if (type === "orc" || type === "ogre") {
      const rivets = [];
      const width = type === "orc" ? .10 : .15;
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) rivets.push({
        x: side * width, y: .31 + i * .1, z: type === "orc" ? .29 : .39,
        sx: .018, sy: .018, sz: .014
      });
      this.instances(graphics, new THREE.OctahedronGeometry(1), m.goldLight, rivets, group);
    }
    if (type === "skeleton") {
      const teeth = Array.from({length: 4}, (_, i) => ({ x: -.06 + i * .04, y: .69, z: .155, sx: .026, sy: .05, sz: .023 }));
      this.instances(graphics, new THREE.BoxGeometry(1, 1, 1), m.bone, teeth, group);
    }
    if (type === "dragon") {
      const scales = [];
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) scales.push({
        x: side * (.25 - Math.abs(i - 3) * .014), y: .4 + i * .11, z: -.1,
        sx: .055, sy: .085, sz: .11, angle: side * .35
      });
      this.instances(graphics, new THREE.OctahedronGeometry(1), m.darkRed, scales, group);
    }
  },

  trails(graphics, projectiles) {
    // A fixed pool keeps spell trails to one draw call even during large waves.
    if (!graphics.spellTrails) {
      graphics.spellTrails = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .65, toneMapped: false, depthWrite: false }), 160);
      graphics.spellTrails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      graphics.spellTrails.frustumCulled = false;
      graphics.spellTrails.count = 0;
      graphics.scene.add(graphics.spellTrails);
      graphics.spellTrailHistory = new WeakMap();
      graphics.spellTrailDummy = new THREE.Object3D();
      graphics.spellTrailColor = new THREE.Color();
    }
    let count = 0;
    const now = performance.now();
    const dummy = graphics.spellTrailDummy;
    for (const projectile of projectiles) {
      if (projectile.dead || !["mage", "ufo", "witchMagic"].includes(projectile.type) && !["flamingBolt", "lightningBolt"].includes(projectile.variant)) continue;
      const current = graphics.projectileMeshes.get(projectile);
      if (!current) continue;
      let history = graphics.spellTrailHistory.get(projectile);
      if (!history) { history = []; graphics.spellTrailHistory.set(projectile, history); }
      if (!history.length || now - history[0].time > 24) history.unshift({ position: current.position.clone(), time: now });
      if (history.length > 5) history.pop();
      graphics.spellTrailColor.set(projectile.color || "#c897ff");
      for (let i = 1; i < history.length && count < 160; i++) {
        const age = now - history[i].time;
        if (age > 200) continue;
        dummy.position.copy(history[i].position);
        dummy.scale.setScalar(.037 * (1 - i / 6) * (1 - age / 230));
        dummy.rotation.set(i, now * .002, i * .7); dummy.updateMatrix();
        graphics.spellTrails.setMatrixAt(count, dummy.matrix);
        graphics.spellTrails.setColorAt(count++, graphics.spellTrailColor);
      }
    }
    graphics.spellTrails.count = count;
    graphics.spellTrails.instanceMatrix.needsUpdate = true;
    if (graphics.spellTrails.instanceColor) graphics.spellTrails.instanceColor.needsUpdate = true;
  },

  interface() {
    const paths = {
      archer: '<path d="M12 5Q36 24 12 43L19 24Z"/><path d="M7 24H40M33 18L40 24 33 30"/>',
      mage: '<path d="M24 4 7 34H41ZM12 40H36M16 28 24 9 32 28"/><path d="m35 5 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z"/>',
      ballista: '<path d="M7 12Q24 27 41 12M7 12 24 33 41 12M24 5V40M19 10 24 5 29 10M12 42 24 33 36 42"/>',
      barracks: '<path d="M8 40 37 6 42 6 42 11 13 44ZM7 31 20 42M7 6 12 6 41 40 36 44 7 11ZM28 42 41 31"/>',
      ogre: '<path d="m9 18 6-9 7 3 6-5 9 9 3 17-8 9H17L8 33ZM15 23 20 25M29 25 34 23M17 34H31M14 31 17 37M34 31 31 37"/>',
      ghost: '<path d="M8 42 11 18Q13 4 24 5T37 18L41 42 33 37 24 42 16 37ZM18 18V23M30 18V23M21 29Q24 26 27 29V34H21Z"/>',
      vampire: '<path d="M15 10 24 5 33 10 31 28 24 33 17 28ZM17 19H20M28 19H31M20 26 21 30M28 26 27 30M17 30 4 24 10 43H38L44 24 31 30"/>',
      ufo: '<ellipse cx="24" cy="28" rx="20" ry="8"/><path d="M13 24Q14 6 24 7T35 24M10 28H15M22 30H27M33 28H38M17 40 14 45M31 40 34 45"/>',
      castle: '<path d="M7 43V10H13V16H19V10H29V16H35V10H41V43ZM19 43V32Q24 24 29 32V43M14 23V27M34 23V27M24 10V3L34 6 24 9"/>',
      mine: '<path d="M5 40 11 15 24 6 37 15 43 40ZM16 40V26Q24 17 32 26V40M13 14 21 20M29 12 34 19"/><path d="m7 7 4 2-2 4-4-2Z"/>'
    };
    this.icons = paths;
    document.querySelectorAll('.tower-card[data-tower]').forEach(card => {
      const icon = card.querySelector('.tower-emblem');
      const drawing = paths[card.dataset.tower];
      if (icon && drawing) icon.innerHTML = this.icon(card.dataset.tower);
    });
  },

  icon(type) {
    return `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${this.icons[type] || ""}</svg>`;
  }
};

window.FantasyArt.interface();

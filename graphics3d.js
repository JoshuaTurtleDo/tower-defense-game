"use strict";

class ThreeGraphics {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10271c);
    this.scene.fog = new THREE.Fog(0x10271c, 21, 34);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.camera = new THREE.PerspectiveCamera(39, 1, .1, 60);
    this.orbitTarget = new THREE.Vector3(0, 0, .45);
    this.initialCameraPosition = new THREE.Vector3(0, 10.4, -11.94);
    this.minOrbitDistance = 8;
    this.maxOrbitDistance = 24;
    this.setOrbitFromPosition(this.initialCameraPosition);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hitPoint = new THREE.Vector3();

    this.towerMeshes = new Map();
    this.enemyMeshes = new Map();
    this.enemyBars = new Map();
    this.knightMeshes = new Map();
    this.knightBars = new Map();
    this.projectileMeshes = new Map();
    this.particleMeshes = new Map();
    this.treeGroups = new Map();
    this.animatedScenery = [];
    this.torchFlames = [];
    this.flags = [];
    this.towerModelScale = .5;
    this.enemyModelScale = .5;
    this.showHealthBars = true;

    this.makeMaterials();
    FantasyArt.materials(this);
    this.buildLighting();
    this.buildWorld();
    this.buildIndicators();
  }

  makeMaterials() {
    const mat = (color, roughness = .78, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      flatShading: true,
      ...extra
    });
    this.mat = {
      grassA: mat(0x3f6d34), grassB: mat(0x315b2d), grassC: mat(0x527d3d), grassEdge: mat(0x294625),
      soil: mat(0xc69a57), soilEdge: mat(0x745032), soilMark: mat(0x9e7644), earth: mat(0x4e3927),
      stone: mat(0x8d8a7d, .72), stoneLight: mat(0xb5aa91, .68), darkStone: mat(0x464a45, .82),
      wood: mat(0x4a2c1b, .88), lightWood: mat(0x87522a, .8), iron: mat(0x333b3d, .4, .62),
      gold: mat(0xe1aa3d, .32, .58), goldLight: mat(0xffcf62, .26, .62), goldDark: mat(0x8c5d1f, .46, .42),
      leaf: mat(0x163f28), leafMid: mat(0x235632), leafLight: mat(0x347044),
      bone: mat(0xddd3b6), goblin: mat(0x719849), orc: mat(0x476f42), ogre: mat(0x81764d),
      red: mat(0xaf3f2e), roofRed: mat(0x923125), roofLight: mat(0xc85034), darkRed: mat(0x5d201d), cloth: mat(0x673128),
      purple: mat(0x8f6cdd, .28, .08, { emissive: 0x35245f, emissiveIntensity: .85 }),
      frostCloth: mat(0x347fbd, .55, .04, { emissive: 0x173f68, emissiveIntensity: .5 }),
      frost: mat(0x91e9f3, .22, .12, { emissive: 0x2f8fa8, emissiveIntensity: 1.25 }),
      spectral: mat(0xf2fff9, .3, .01, { emissive: 0x7caf9f, emissiveIntensity: .72, transparent: true, opacity: .94, depthWrite: false, side: THREE.DoubleSide }),
      spectralDark: mat(0xc9e5dc, .45, .01, { emissive: 0x4e8177, emissiveIntensity: .5, transparent: true, opacity: .88, depthWrite: false, side: THREE.DoubleSide }),
      eye: mat(0xf1bd4c, .22, .08, { emissive: 0x8e3b12, emissiveIntensity: 1.55 })
    };
  }

  buildLighting() {
    const hemi = new THREE.HemisphereLight(0xd5e7ec, 0x263925, 1.85);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe2b3, 3.25);
    sun.position.set(-8, 14, -9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    sun.shadow.bias = -.0005;
    sun.shadow.normalBias = .025;
    sun.shadow.radius = 2;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0xf0bc79, 1.05);
    rim.position.set(9, 8, 7);
    this.scene.add(rim);
    const coolFill = new THREE.DirectionalLight(0x92b9df, .85);
    coolFill.position.set(4, 6, -8);
    this.scene.add(coolFill);
    const warmFill = new THREE.PointLight(0xf0a13c, 12, 13, 2);
    warmFill.position.set(5.3, 3.2, 3.4);
    this.scene.add(warmFill);
  }

  buildWorld() {
    const { COLS, ROWS, pathPoints } = this.config;
    const foundation = this.mesh(new THREE.BoxGeometry(COLS + .9, .46, ROWS + .9), this.mat.earth, 0, -.34, 0);
    foundation.receiveShadow = true;
    const lowerStone = this.mesh(new THREE.BoxGeometry(COLS + .72, .13, ROWS + .72), this.mat.soilEdge, 0, -.09, 0);
    lowerStone.receiveShadow = true;
    const gildedRim = this.mesh(new THREE.BoxGeometry(COLS + .5, .065, ROWS + .5), this.mat.goldDark, 0, -.025, 0);
    gildedRim.receiveShadow = true;
    const grassBed = this.mesh(new THREE.BoxGeometry(COLS + .28, .05, ROWS + .28), this.mat.grassEdge, 0, -.005, 0);
    grassBed.receiveShadow = true;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tone = (col * 17 + row * 31) % 3;
        const material = tone === 0 ? this.mat.grassA : tone === 1 ? this.mat.grassB : this.mat.grassC;
        const tile = this.mesh(new THREE.BoxGeometry(1.005, .055, 1.005), material, col - COLS / 2 + .5, 0, row - ROWS / 2 + .5);
        tile.receiveShadow = true;
      }
    }

    const roadPoints = pathPoints.map(point => this.worldFromGame(point.x, point.y));
    const roadCurve = new THREE.CatmullRomCurve3(roadPoints, false, "centripetal", .35);
    const smoothRoadPoints = roadCurve.getSpacedPoints(220);
    this.createRoadRibbon(smoothRoadPoints, .9, .085, this.mat.soilEdge);
    this.createRoadRibbon(smoothRoadPoints, .72, .125, this.mat.soil);
    this.createRoadRibbon(this.offsetCurvePoints(smoothRoadPoints, .17), .035, .139, this.mat.soilMark);
    this.createRoadRibbon(this.offsetCurvePoints(smoothRoadPoints, -.17), .035, .139, this.mat.soilMark);
    this.addRoadStones(smoothRoadPoints);
    this.addScenery();
    FantasyArt.world(this, smoothRoadPoints);
  }

  offsetCurvePoints(points, distance) {
    return points.map((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      const tangentX = next.x - previous.x;
      const tangentZ = next.z - previous.z;
      const length = Math.hypot(tangentX, tangentZ) || 1;
      return new THREE.Vector3(point.x - tangentZ / length * distance, point.y, point.z + tangentX / length * distance);
    });
  }

  createRoadRibbon(points, width, elevation, material) {
    const positions = [];
    const indices = [];
    const uvs = [];
    let distanceAlong = 0;
    const halfWidth = width / 2;
    for (let i = 0; i < points.length; i++) {
      if (i > 0) distanceAlong += points[i].distanceTo(points[i - 1]);
      uvs.push(0, distanceAlong, 1, distanceAlong);
      const previous = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const tangentX = next.x - previous.x;
      const tangentZ = next.z - previous.z;
      const length = Math.hypot(tangentX, tangentZ) || 1;
      const normalX = -tangentZ / length;
      const normalZ = tangentX / length;
      positions.push(points[i].x + normalX * halfWidth, elevation, points[i].z + normalZ * halfWidth);
      positions.push(points[i].x - normalX * halfWidth, elevation, points[i].z - normalZ * halfWidth);
      if (i < points.length - 1) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const ribbon = this.mesh(geometry, material);
    ribbon.castShadow = false;
    ribbon.receiveShadow = true;
    return ribbon;
  }

  addRoadStones(points) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb9a07a, roughness: 1 });
    for (let i = 10; i < points.length - 10; i += 14) {
      const point = points[i];
      const previous = points[i - 1];
      const next = points[i + 1];
      const tangentX = next.x - previous.x;
      const tangentZ = next.z - previous.z;
      const length = Math.hypot(tangentX, tangentZ) || 1;
      const side = i % 2 ? 1 : -1;
      const offsetX = -tangentZ / length * .14 * side;
      const offsetZ = tangentX / length * .14 * side;
      const stone = this.mesh(new THREE.BoxGeometry(.105, .026, .04), stoneMat, point.x + offsetX, .145, point.z + offsetZ);
      stone.rotation.y = -Math.atan2(tangentZ, tangentX) + (i % 3 - 1) * .22;
    }
  }

  addScenery() {
    this.createCastle(5.22, 3.42);
    this.createEnemyCamp(-5.62, -3.45);
    this.createRocks();
    this.createGrassDetails();
  }

  createTree(tree) {
    const { id, x, z, scale, variant } = tree;
    const group = new THREE.Group();
    group.position.set(x - this.config.COLS / 2, 0, z - this.config.ROWS / 2);
    group.scale.setScalar(scale);
    this.scene.add(group);
    this.mesh(new THREE.DodecahedronGeometry(.16, 0), this.mat.darkStone, 0, .08, 0, group).scale.set(1.4, .42, 1.1);
    this.mesh(new THREE.CylinderGeometry(.07, .115, .7, 7), this.mat.wood, 0, .35, 0, group);
    this.mesh(new THREE.CylinderGeometry(.09, .09, .055, 8), this.mat.goldDark, 0, .16, 0, group);
    const crown = new THREE.Group();
    group.add(crown);
    const crownMat = variant % 2 ? this.mat.leaf : this.mat.leafMid;
    this.mesh(new THREE.ConeGeometry(.42, .7, 7), crownMat, 0, .64, 0, crown);
    this.mesh(new THREE.ConeGeometry(.34, .66, 7), variant % 3 ? this.mat.leafMid : this.mat.leafLight, 0, .98, 0, crown);
    this.mesh(new THREE.ConeGeometry(.23, .52, 7), this.mat.leafLight, 0, 1.3, 0, crown);
    FantasyArt.tree(this, crown, variant);
    const animationEntry = { object: crown, phase: variant * .71, strength: .012 + (variant % 3) * .003 };
    this.animatedScenery.push(animationEntry);
    group.userData.treeId = id;
    group.userData.animationEntry = animationEntry;
    group.traverse(object => object.userData.treeId = id);
    this.treeGroups.set(id, group);
    return group;
  }

  createCastle(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(1.08);
    this.scene.add(group);
    this.mesh(new THREE.BoxGeometry(1.22, .16, 1.02), this.mat.darkStone, 0, .13, 0, group);
    this.mesh(new THREE.BoxGeometry(1.08, .82, .82), this.mat.stone, 0, .58, 0, group);
    this.mesh(new THREE.BoxGeometry(1.13, .08, .87), this.mat.goldDark, 0, .97, 0, group);
    for (let course = 0; course < 3; course++) {
      const y = .34 + course * .24;
      for (const ox of [-.38, 0, .38]) {
        const brick = this.mesh(new THREE.BoxGeometry(.31, .12, .045), course % 2 ? this.mat.stoneLight : this.mat.darkStone, ox + (course % 2 ? .08 : 0), y, -.435, group);
        brick.position.x = THREE.MathUtils.clamp(brick.position.x, -.4, .4);
      }
    }
    for (const ox of [-.48, .48]) {
      this.mesh(new THREE.CylinderGeometry(.29, .34, 1.28, 10), this.mat.darkStone, ox, .69, 0, group);
      this.mesh(new THREE.CylinderGeometry(.32, .32, .09, 10), this.mat.gold, ox, 1.29, 0, group);
      this.mesh(new THREE.ConeGeometry(.35, .31, 10), this.mat.roofRed, ox, 1.49, 0, group);
      this.mesh(new THREE.ConeGeometry(.28, .28, 10), this.mat.roofLight, ox, 1.68, 0, group);
      this.mesh(new THREE.ConeGeometry(.045, .24, 6), this.mat.goldLight, ox, 1.94, 0, group);
      this.mesh(new THREE.BoxGeometry(.12, .2, .035), this.mat.earth, ox, .77, -.305, group);
    }
    [-.48, -.16, .16, .48].forEach((ox, index) => this.mesh(new THREE.BoxGeometry(.2, .23, .2), index % 2 ? this.mat.stoneLight : this.mat.stone, ox, 1.12, -.34, group));
    this.mesh(new THREE.BoxGeometry(.34, .48, .055), this.mat.wood, 0, .34, -.45, group);
    const arch = this.mesh(new THREE.TorusGeometry(.17, .04, 6, 16, Math.PI), this.mat.goldDark, 0, .58, -.48, group);
    arch.rotation.z = Math.PI;
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, .16); shieldShape.lineTo(.16, .08); shieldShape.lineTo(.12, -.13); shieldShape.lineTo(0, -.23); shieldShape.lineTo(-.12, -.13); shieldShape.lineTo(-.16, .08); shieldShape.closePath();
    const shield = this.mesh(new THREE.ShapeGeometry(shieldShape), this.mat.goldLight, 0, .78, -.475, group);
    shield.rotation.y = Math.PI;
    shield.scale.setScalar(.72);
    const flagPole = this.mesh(new THREE.CylinderGeometry(.017, .017, .95, 6), this.mat.goldDark, 0, 1.55, 0, group);
    flagPole.rotation.z = 0;
    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0); flagShape.lineTo(.42, .08); flagShape.lineTo(.28, -.12); flagShape.lineTo(0, -.1); flagShape.closePath();
    const flag = this.mesh(new THREE.ShapeGeometry(flagShape), this.mat.roofLight, .02, 1.82, 0, group);
    flag.rotation.y = Math.PI / 2;
    this.flags.push({ object: flag, baseRotation: flag.rotation.y, phase: .4 });
    this.createTorch(group, -.27, .56, -.49, 0);
    this.createTorch(group, .27, .56, -.49, 1.7);
  }

  createEnemyCamp(x, z) {
    const group = new THREE.Group();
    group.position.set(x, .02, z);
    this.scene.add(group);
    this.mesh(new THREE.CylinderGeometry(.48, .5, .08, 8), this.mat.darkStone, 0, .08, 0, group);
    const tent = this.mesh(new THREE.ConeGeometry(.45, .68, 4), this.mat.cloth, 0, .4, 0, group);
    tent.rotation.y = Math.PI / 4;
    this.mesh(new THREE.ConeGeometry(.36, .52, 4), this.mat.red, 0, .48, 0, group).rotation.y = Math.PI / 4;
    this.mesh(new THREE.CylinderGeometry(.018, .018, 1.05, 6), this.mat.goldDark, -.28, .55, 0, group);
    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0); flagShape.lineTo(.36, .09); flagShape.lineTo(.28, -.12); flagShape.lineTo(0, -.1); flagShape.closePath();
    const flag = this.mesh(new THREE.ShapeGeometry(flagShape), this.mat.red, -.26, .92, 0, group);
    flag.rotation.y = Math.PI / 2;
    this.flags.push({ object: flag, baseRotation: flag.rotation.y, phase: 2.2 });
    this.createTorch(group, .34, .28, .28, 3.1);
  }

  createRocks() {
    const positions = [[-4.2,2.75,.16],[-2.1,3.2,.11],[2.8,-3.1,.14],[4.6,-1.8,.12],[-.7,-3.3,.1]];
    positions.forEach(([x,z,s], i) => {
      const rock = this.mesh(new THREE.DodecahedronGeometry(s, 0), i % 2 ? this.mat.stone : this.mat.darkStone, x, s * .55, z);
      rock.scale.y = .65;
      rock.rotation.set(i, i * .7, 0);
    });
  }

  createGrassDetails() {
    const pathSet = new Set(this.config.pathCells.filter(([x, y]) => x >= 0 && x < this.config.COLS && y >= 0 && y < this.config.ROWS).map(([x, y]) => `${x},${y}`));
    for (let row = 0; row < this.config.ROWS; row++) {
      for (let col = 0; col < this.config.COLS; col++) {
        if (pathSet.has(`${col},${row}`) || (col * 19 + row * 23) % 4 !== 0) continue;
        const tuft = new THREE.Group();
        tuft.position.set(col - this.config.COLS / 2 + .22 + ((row * 7) % 5) * .11, .09, row - this.config.ROWS / 2 + .2 + ((col * 11) % 5) * .1);
        tuft.rotation.y = (col + row) * .7;
        this.scene.add(tuft);
        for (let blade = 0; blade < 3; blade++) {
          const grass = this.mesh(new THREE.ConeGeometry(.035, .18 + blade * .025, 4), blade === 1 ? this.mat.grassC : this.mat.leafLight, (blade - 1) * .055, .08, 0, tuft);
          grass.rotation.z = (blade - 1) * -.22;
          grass.castShadow = false;
        }
        if ((col + row) % 5 === 0) this.mesh(new THREE.OctahedronGeometry(.025, 0), this.mat.goldLight, .08, .14, .02, tuft);
        this.animatedScenery.push({ object: tuft, phase: col * .53 + row, strength: .018 });
      }
    }
  }

  createTorch(parent, x, y, z, phase) {
    this.mesh(new THREE.CylinderGeometry(.018, .022, .22, 6), this.mat.iron, x, y - .06, z, parent);
    const bowl = this.mesh(new THREE.CylinderGeometry(.07, .045, .055, 7), this.mat.goldDark, x, y + .06, z, parent);
    const flame = this.mesh(new THREE.ConeGeometry(.045, .16, 7), this.mat.eye, x, y + .17, z, parent);
    flame.castShadow = false;
    const light = new THREE.PointLight(0xff9b36, 2.4, 2.2, 2);
    light.position.set(x, y + .2, z);
    parent.add(light);
    this.torchFlames.push({ object: flame, light, phase, baseY: y + .17 });
    return bowl;
  }

  buildIndicators() {
    this.rangeDisc = new THREE.Mesh(
      new THREE.RingGeometry(.97, 1, 64),
      new THREE.MeshBasicMaterial({ color: 0xf2d682, transparent: true, opacity: .23, side: THREE.DoubleSide, depthWrite: false })
    );
    this.rangeDisc.rotation.x = -Math.PI / 2;
    this.rangeDisc.position.y = .17;
    this.rangeDisc.visible = false;
    this.scene.add(this.rangeDisc);

    this.hoverTile = new THREE.Mesh(
      new THREE.BoxGeometry(.9, .06, .9),
      new THREE.MeshBasicMaterial({ color: 0xbfe184, transparent: true, opacity: .34, depthWrite: false })
    );
    this.hoverTile.position.y = .18;
    this.hoverTile.visible = false;
    this.scene.add(this.hoverTile);

    this.treeSelectionRing = new THREE.Mesh(
      new THREE.RingGeometry(.42, .52, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd86a, transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false })
    );
    this.treeSelectionRing.rotation.x = -Math.PI / 2;
    this.treeSelectionRing.position.y = .15;
    this.treeSelectionRing.visible = false;
    this.scene.add(this.treeSelectionRing);
  }

  worldFromGame(x, y, elevation = 0) {
    const { CELL, COLS, ROWS } = this.config;
    return new THREE.Vector3(x / CELL - COLS / 2, elevation, y / CELL - ROWS / 2);
  }

  pickGrid(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.hitPoint)) return null;
    return {
      col: Math.floor(this.hitPoint.x + this.config.COLS / 2),
      row: Math.floor(this.hitPoint.z + this.config.ROWS / 2)
    };
  }

  pickTree(clientX, clientY) {
    if (!this.treeGroups.size) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([...this.treeGroups.values()], true);
    return hits[0]?.object?.userData?.treeId || null;
  }

  setOrbitFromPosition(position) {
    const offset = new THREE.Vector3().subVectors(position, this.orbitTarget);
    this.orbitDistance = offset.length();
    this.orbitYaw = Math.atan2(offset.x, offset.z);
    this.orbitPitch = Math.asin(offset.y / this.orbitDistance);
    this.updateOrbitCamera();
  }

  orbitBy(deltaX, deltaY) {
    this.orbitYaw -= deltaX * .0065;
    this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + deltaY * .005, .38, 1.16);
    this.updateOrbitCamera();
  }

  zoomBy(deltaY) {
    const zoomFactor = Math.exp(deltaY * .0012);
    this.orbitDistance = THREE.MathUtils.clamp(
      this.orbitDistance * zoomFactor,
      this.minOrbitDistance,
      this.maxOrbitDistance
    );
    this.updateOrbitCamera();
  }

  setShadowsEnabled(enabled) {
    this.renderer.shadowMap.enabled = Boolean(enabled);
  }

  setHealthBarsVisible(enabled) {
    this.showHealthBars = Boolean(enabled);
  }

  updateOrbitCamera() {
    const horizontalDistance = this.orbitDistance * Math.cos(this.orbitPitch);
    this.camera.position.set(
      this.orbitTarget.x + Math.sin(this.orbitYaw) * horizontalDistance,
      this.orbitTarget.y + Math.sin(this.orbitPitch) * this.orbitDistance,
      this.orbitTarget.z + Math.cos(this.orbitYaw) * horizontalDistance
    );
    this.camera.lookAt(this.orbitTarget);
    this.camera.updateMatrixWorld();
  }

  resetCamera() {
    this.setOrbitFromPosition(this.initialCameraPosition);
  }

  render(state, hoverCell, canPlace, towerStats) {
    this.resize();
    this.syncTrees(state.trees);
    this.animateWorld(performance.now() * .001);
    this.syncTowers(state.towers);
    this.syncKnights(state.knights);
    this.syncEnemies(state.enemies);
    this.syncProjectiles(state.projectiles);
    FantasyArt.trails(this, state.projectiles);
    this.syncParticles(state.particles);
    this.updateIndicators(state, hoverCell, canPlace, towerStats);
    this.renderer.render(this.scene, this.camera);
  }

  animateWorld(now) {
    for (const item of this.animatedScenery) {
      item.object.rotation.z = Math.sin(now * 1.15 + item.phase) * item.strength;
      item.object.rotation.x = Math.cos(now * .82 + item.phase) * item.strength * .45;
    }
    for (const torch of this.torchFlames) {
      const flicker = Math.sin(now * 11 + torch.phase) * .1 + Math.sin(now * 17.3 + torch.phase) * .06;
      torch.object.scale.set(1 - flicker * .35, 1 + flicker, 1 - flicker * .35);
      torch.object.position.y = torch.baseY + Math.sin(now * 13 + torch.phase) * .014;
      torch.light.intensity = 2.25 + flicker * 2.2;
    }
    for (const flag of this.flags) {
      flag.object.rotation.y = flag.baseRotation + Math.sin(now * 2.2 + flag.phase) * .055;
      flag.object.scale.y = 1 + Math.sin(now * 3.4 + flag.phase) * .045;
    }
  }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const neededWidth = Math.floor(width * this.renderer.getPixelRatio());
    const neededHeight = Math.floor(height * this.renderer.getPixelRatio());
    if (this.canvas.width !== neededWidth || this.canvas.height !== neededHeight) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  syncTrees(trees) {
    const liveIds = new Set(trees.map(tree => tree.id));
    for (const [id, group] of this.treeGroups) {
      if (liveIds.has(id)) continue;
      this.scene.remove(group);
      this.animatedScenery = this.animatedScenery.filter(item => item !== group.userData.animationEntry);
      group.traverse(object => object.geometry?.dispose());
      this.treeGroups.delete(id);
    }
    for (const tree of trees) {
      if (!this.treeGroups.has(tree.id)) this.createTree(tree);
    }
  }

  syncTowers(towers) {
    this.removeMissing(this.towerMeshes, towers);
    for (const tower of towers) {
      let group = this.towerMeshes.get(tower);
      const tracksVisualSpecialization = tower.type === "barracks" || tower.type === "archer" || tower.type === "ballista" || tower.type === "ogre" || tower.type === "mine";
      const visualSpecialization = tracksVisualSpecialization ? tower.specialization || null : null;
      if (group && tracksVisualSpecialization && group.userData.visualSpecialization !== visualSpecialization) {
        this.scene.remove(group);
        this.towerMeshes.delete(tower);
        group = null;
      }
      if (!group) {
        group = this.createTower(tower);
        this.towerMeshes.set(tower, group);
        this.scene.add(group);
      }
      const p = this.worldFromGame(tower.x, tower.y);
      group.position.set(p.x, 0, p.z);
      group.scale.setScalar(this.towerModelScale * (tower.type === "ogre" ? 1.1 : 1));
      if (group.userData.castleCannon) {
        const unlocked = typeof hasPassiveUnlock === "function" && hasPassiveUnlock("castleCannon");
        group.userData.castleCannon.visible = unlocked;
        if (unlocked) {
          group.userData.castleCannon.rotation.y = -tower.angle;
          group.userData.castleCannon.rotation.z = Math.sin(performance.now() * .006 + tower.col) * .018;
          group.userData.castleCannonLight.intensity = 2.2 + Math.sin(performance.now() * .012) * .7;
        }
      }
      if (group.userData.frozenAura) {
        const frozen = tower.freezeTimer > 0;
        group.userData.frozenAura.visible = frozen;
        if (frozen) {
          const now = performance.now() * .001;
          group.userData.frozenAura.rotation.y = now * .35;
          group.userData.frozenCrystals.forEach((crystal, index) => {
            crystal.position.y = crystal.userData.baseY + Math.sin(now * 2.4 + index * 1.8) * .025;
          });
          group.userData.frozenLight.intensity = 3.2 + Math.sin(now * 5) * .7;
        }
      }
      const receivesCastleAura = tower.type !== "castle" && tower.type !== "mine" && towers.some(castle =>
        castle.type === "castle" && (castle.freezeTimer || 0) <= 0 && Math.max(Math.abs(castle.col - tower.col), Math.abs(castle.row - tower.row)) === 1
      );
      if (group.userData.castleBuffAura) {
        const aura = group.userData.castleBuffAura;
        aura.visible = receivesCastleAura;
        if (aura.visible) {
          const pulse = 1 + Math.sin(performance.now() * .004 + tower.col) * .06;
          aura.scale.setScalar(pulse);
          aura.material.opacity = .3 + Math.sin(performance.now() * .005 + tower.row) * .08;
        }
      }
      if (group.userData.castleAura) {
        const pulse = 1 + Math.sin(performance.now() * .0035 + tower.row) * .05;
        group.userData.castleAura.scale.setScalar(pulse);
        group.userData.castleAura.material.opacity = .22 + Math.sin(performance.now() * .0045 + tower.col) * .06;
      }
      if (group.userData.turret) group.userData.turret.rotation.y = -tower.angle;
      if (group.userData.ballistaFlames) {
        const now = performance.now() * .001;
        group.userData.ballistaFlames.forEach((flame, index) => {
          const flicker = Math.sin(now * 11 + flame.userData.phase) * .12;
          flame.scale.set(1 + flicker, 1 - flicker * .45, 1 + flicker);
          flame.position.y = flame.userData.baseY + Math.sin(now * 8 + index * 1.7) * .018;
          flame.rotation.y = Math.sin(now * 6 + index) * .12;
        });
        group.userData.ballistaFireLight.intensity = 3.8 + Math.sin(now * 13) * 1.1;
      }
      if (group.userData.zeusCrystal) {
        const now = performance.now() * .001;
        const pulse = 1 + Math.sin(now * 9 + tower.col) * .16;
        group.userData.zeusCrystal.rotation.x += .045;
        group.userData.zeusCrystal.rotation.y += .07;
        group.userData.zeusCrystal.scale.setScalar(pulse);
        group.userData.zeusLight.intensity = 4.2 + Math.sin(now * 12) * 1.4;
      }
      if (group.userData.crystal) {
        group.userData.crystal.rotation.y += .018;
        group.userData.crystal.position.y = group.userData.crystal.userData.baseY + Math.sin(performance.now() * .003) * .045;
        const frost = tower.specialization === "frost";
        if (group.userData.frost !== frost) {
          group.userData.crystal.material = frost ? this.mat.frost : this.mat.purple;
          if (group.userData.wizardFocus) group.userData.wizardFocus.material = frost ? this.mat.frost : this.mat.purple;
          if (group.userData.wizardLight) group.userData.wizardLight.color.setHex(frost ? 0x91e9f3 : 0x9c7de9);
          if (group.userData.wizardRobePieces) {
            group.userData.wizardRobePieces.forEach(piece => { piece.material = frost ? this.mat.frostCloth : this.mat.purple; });
          }
          group.userData.frost = frost;
        }
      }
      if (group.userData.workers) {
        group.userData.workers.forEach((worker, index) => {
          worker.visible = index < tower.workers;
          if (worker.visible) {
            worker.userData.pickaxe.rotation.z = -.45 + Math.sin(performance.now() * .008 + worker.userData.phase) * .62;
          }
        });
      }
      if (group.userData.goldVein) group.userData.goldVein.rotation.y += .02;
      if (group.userData.coveMinerals) {
        const mineralTime = performance.now() * .001;
        group.userData.coveMinerals.forEach((mineral, index) => {
          mineral.rotation.y += .008 + index * .001;
          mineral.position.y = mineral.userData.baseY + Math.sin(mineralTime * 2 + index * 1.7) * .012;
        });
      }
      if (group.userData.graveWisps) {
        const now = performance.now() * .001;
        group.userData.graveWisps.rotation.y = now * .8;
        group.userData.graveWisps.children.forEach((wisp, index) => {
          wisp.position.y = wisp.userData.baseY + Math.sin(now * 2.2 + index * 2.1) * .07;
        });
      }
      if (group.userData.archerSquad) {
        const squad = group.userData.archerSquad;
        const now = performance.now() * .001;
        squad.rotation.y = Math.PI / 2 - tower.angle;
        group.userData.archers.forEach((archer, index) => {
          const phase = index * 1.9 + tower.col;
          const timer = tower.archerShotTimers?.[index] || 0;
          const shotProgress = timer > 0 ? 1 - timer / .22 : 0;
          const release = timer > 0 ? Math.sin(THREE.MathUtils.clamp(shotProgress, 0, 1) * Math.PI) : 0;
          archer.unit.position.y = archer.baseY + Math.sin(now * 1.8 + phase) * .01;
          archer.unit.rotation.z = Math.sin(now * .85 + phase) * .018;
          archer.bowArm.rotation.x = -.72 - release * .18;
          archer.drawArm.rotation.x = -.72 - release * .72;
          archer.drawArm.rotation.z = .08 + release * .18;
          archer.body.rotation.y = -release * .12;
          archer.arrow.visible = timer <= 0 || shotProgress < .48;
        });
      }
      if (group.userData.rifleSquad) {
        const now = performance.now() * .001;
        group.userData.rifleSquad.rotation.y = Math.PI / 2 - tower.angle;
        group.userData.riflemen.forEach((rifleman, index) => {
          const timer = tower.archerShotTimers?.[index] || 0;
          const progress = timer > 0 ? 1 - timer / .22 : 0;
          const recoil = timer > 0 ? Math.sin(THREE.MathUtils.clamp(progress, 0, 1) * Math.PI) : 0;
          rifleman.unit.position.y = rifleman.baseY + Math.sin(now * 1.55 + index * 1.7) * .009;
          rifleman.unit.rotation.z = Math.sin(now * .75 + index) * .014;
          rifleman.body.rotation.x = recoil * .11;
          rifleman.rifle.position.z = .08 - recoil * .08;
          rifleman.rifle.rotation.x = -.04 + recoil * .08;
          rifleman.leftArm.rotation.x = -.92 + recoil * .12;
          rifleman.rightArm.rotation.x = -.84 + recoil * .2;
        });
      }
      if (group.userData.slingSquad) {
        const now = performance.now() * .001;
        const timer = tower.slingShotTimer || 0;
        const progress = timer > 0 ? 1 - timer / .72 : 0;
        const launch = timer > 0 ? Math.sin(THREE.MathUtils.clamp(progress, 0, 1) * Math.PI) : 0;
        group.userData.slingSquad.rotation.y = Math.PI / 2 - tower.angle;
        group.userData.slingPouch.position.z = -.18 + launch * .34;
        group.userData.slingPouch.rotation.x = launch * .45;
        group.userData.slingRock.visible = timer <= 0;
        group.userData.slingWorkers.forEach((worker, index) => {
          const effort = Math.sin(now * 2.2 + index * 1.8) * .035;
          worker.unit.position.y = worker.baseY + Math.sin(now * 1.7 + index) * .008;
          worker.body.rotation.z = effort + launch * (index - 1) * .055;
          worker.leftArm.rotation.x = -.7 - launch * .45;
          worker.rightArm.rotation.x = -.7 - launch * .45;
        });
      }
      if (group.userData.wizardBody) {
        const wizard = group.userData.wizardBody;
        const castingArm = group.userData.wizardCastingArm;
        const staffArm = group.userData.wizardStaffArm;
        const staff = group.userData.wizardStaff;
        const head = group.userData.wizardHead;
        const focus = group.userData.wizardFocus;
        const now = performance.now() * .001;
        const breathe = Math.sin(now * 1.9 + tower.col * .5);
        const gatherMagic = Math.sin(now * 3.1 + tower.row) * .5 + .5;
        wizard.rotation.y = Math.PI / 2 - tower.angle;
        wizard.rotation.z = Math.sin(now * .8 + tower.col) * .018;
        wizard.position.y = -.019 + breathe * .006;
        staffArm.rotation.z = -.3 + breathe * .035;
        castingArm.rotation.x = -.92 + breathe * .08;
        castingArm.rotation.z = .15 + Math.sin(now * 1.25) * .045;
        staff.rotation.z = -.035 + breathe * .018;
        head.rotation.y = Math.sin(now * .7 + tower.row) * .09;
        head.rotation.x = -.035 + breathe * .018;
        focus.rotation.x += .035;
        focus.rotation.y += .052;
        focus.scale.setScalar(.9 + gatherMagic * .22);
      }
      if (group.userData.playerOgre) {
        const body = group.userData.playerOgre;
        const leftArm = group.userData.ogreLeftArm;
        const rightArm = group.userData.ogreRightArm;
        const leftForearm = group.userData.ogreLeftForearm;
        const rightForearm = group.userData.ogreRightForearm;
        const leftLeg = group.userData.ogreLeftLeg;
        const rightLeg = group.userData.ogreRightLeg;
        const leftLowerLeg = group.userData.ogreLeftLowerLeg;
        const rightLowerLeg = group.userData.ogreRightLowerLeg;
        const head = group.userData.ogreHead;
        const torso = group.userData.ogreTorso;
        const now = performance.now() * .001;
        body.rotation.y = Math.PI / 2 - tower.angle;
        if (tower.throwSwing > 0) {
          const progress = THREE.MathUtils.clamp(1 - tower.throwSwing / .9, 0, 1);
          const heave = Math.sin(progress * Math.PI);
          leftArm.rotation.x = -.52 - heave * 1.28;
          rightArm.rotation.x = -.52 - heave * 1.28;
          leftArm.rotation.z = -.18 - heave * .22;
          rightArm.rotation.z = .18 + heave * .22;
          leftForearm.rotation.x = -.82 - heave * .45;
          rightForearm.rotation.x = -.82 - heave * .45;
          leftLeg.rotation.x = -.68 - heave * .08;
          rightLeg.rotation.x = -.68 - heave * .08;
          leftLowerLeg.rotation.x = 1.24 + heave * .16;
          rightLowerLeg.rotation.x = 1.24 + heave * .16;
          body.rotation.z = -Math.sin(progress * Math.PI * 2) * .09;
          body.position.y = .08 - heave * .045;
          head.rotation.x = -.08 - heave * .12;
          head.rotation.y = 0;
          torso.scale.y = 1.18;
        } else {
          const breath = Math.sin(now * 1.7 + tower.col * .6);
          const weightShift = Math.sin(now * .85 + tower.row) * .035;
          leftArm.rotation.x = -.54 + breath * .045;
          rightArm.rotation.x = -.54 - breath * .045;
          leftArm.rotation.z = -.2 + weightShift;
          rightArm.rotation.z = .2 + weightShift;
          leftForearm.rotation.x = -.82 - breath * .06;
          rightForearm.rotation.x = -.82 + breath * .06;
          leftLeg.rotation.x = -.68 + weightShift * .32;
          rightLeg.rotation.x = -.68 - weightShift * .32;
          leftLowerLeg.rotation.x = 1.24 - weightShift * .24;
          rightLowerLeg.rotation.x = 1.24 + weightShift * .24;
          body.rotation.z = weightShift * .42;
          body.position.y = .08 + breath * .009;
          head.rotation.x = -.06 + breath * .025;
          head.rotation.y = Math.sin(now * .72 + tower.col) * .075;
          torso.scale.y = 1.18 + breath * .025;
        }
        if (group.userData.stonePile) group.userData.stonePile.visible = (tower.stoneThrowTimer || 0) <= 0;
      }
      if (group.userData.ghostBody) {
        const now = performance.now() * .001;
        const ghost = group.userData.ghostBody;
        const umbralEmpowered = tower.items?.includes("umbralForm");
        const pulse = THREE.MathUtils.clamp((tower.fearPulse || 0) / .8, 0, 1);
        const cast = Math.sin((1 - pulse) * Math.PI);
        if (group.userData.umbralActive !== umbralEmpowered) {
          group.userData.umbralActive = umbralEmpowered;
          group.userData.ghostMaterialBindings.forEach(binding => {
            binding.mesh.material = umbralEmpowered ? binding.umbral : binding.normal;
          });
          group.userData.ghostFacePieces.forEach(piece => {
            piece.material = umbralEmpowered ? group.userData.umbralFaceMaterial : group.userData.normalGhostFaceMaterial;
          });
          group.userData.umbralFeatures.visible = umbralEmpowered;
          group.userData.ghostAura.material.color.setHex(umbralEmpowered ? 0x9a43ff : 0x9be3d6);
          group.userData.ghostAuraWisps.forEach(wisp => wisp.material.color.setHex(umbralEmpowered ? 0xd8a0ff : 0xc6fff3));
          group.userData.ghostLight.color.setHex(umbralEmpowered ? 0xa347ff : 0x7de8d3);
        }
        ghost.rotation.y = Math.PI / 2 - tower.angle;
        ghost.rotation.z = Math.sin(now * 1.45 + tower.col) * .035;
        ghost.position.y = .09 + Math.sin(now * 2.15 + tower.row * .7) * .055 + cast * .08;
        ghost.scale.setScalar((umbralEmpowered ? 1.14 : 1) + cast * .12);
        group.userData.ghostHead.rotation.y = Math.sin(now * .9 + tower.col) * .12;
        const blanket = group.userData.ghostBlanket;
        blanket.rotation.z = Math.sin(now * 1.35 + tower.row) * .018;
        blanket.scale.set(1 + Math.sin(now * 1.8) * .025 + cast * .18, 1 + cast * .04, 1);
        group.userData.ghostStreamers.forEach((streamer, index) => {
          streamer.rotation.z = Math.sin(now * 1.55 + index * 1.3) * .045 + cast * (index - 2) * .012;
        });
        group.userData.ghostAura.rotation.y += .035 + cast * .06;
        group.userData.ghostAura.scale.setScalar(1 + cast * .55);
        group.userData.ghostAura.material.opacity = .24 + pulse * .36;
        group.userData.ghostLight.intensity = (umbralEmpowered ? 4 : 2.2) + cast * 5.5;
        group.userData.umbralFeatures.rotation.y = Math.sin(now * 1.2) * .035;
        group.userData.umbralFeatures.scale.setScalar(1 + Math.sin(now * 3.1) * .025 + cast * .08);
      }
      if (group.userData.vampireBody) {
        const now = performance.now() * .001;
        const vampire = group.userData.vampireBody;
        const timer = tower.bloodDrainTimer || 0;
        const progress = timer > 0 ? THREE.MathUtils.clamp(1 - timer / .85, 0, 1) : 0;
        const cast = timer > 0 ? Math.sin(progress * Math.PI) : 0;
        const breathe = Math.sin(now * 1.65 + tower.col * .6);
        const draculaEmpowered = tower.items?.includes("draculaCloak");
        vampire.rotation.y = Math.PI / 2 - tower.angle;
        vampire.scale.setScalar(.82 * (draculaEmpowered ? 1.24 : 1));
        vampire.position.y = .03 + breathe * .008 + cast * .035;
        vampire.rotation.z = breathe * .012;
        group.userData.vampireLeftArm.rotation.x = -.62 - cast * .72;
        group.userData.vampireRightArm.rotation.x = -.62 - cast * .72;
        group.userData.vampireLeftArm.rotation.z = -.3 + cast * .24;
        group.userData.vampireRightArm.rotation.z = .3 - cast * .24;
        group.userData.vampireCape.scale.set(1 + cast * .18, 1 + breathe * .012, 1 + cast * .12);
        group.userData.vampireCape.rotation.z = Math.sin(now * 1.1) * .018;
        group.userData.vampireCape.visible = !draculaEmpowered;
        group.userData.draculaCape.visible = draculaEmpowered;
        group.userData.draculaCape.scale.set(1 + cast * .25, 1 + breathe * .018, 1 + cast * .16);
        group.userData.draculaCape.rotation.z = Math.sin(now * 1.1) * .025;
        group.userData.draculaAura.visible = draculaEmpowered;
        group.userData.draculaAura.rotation.z = now * .65;
        group.userData.draculaAura.scale.setScalar(1 + Math.sin(now * 3.4) * .08 + (tower.batCursePulse || 0) * .32);
        group.userData.draculaLight.intensity = draculaEmpowered ? 2.8 + cast * 7 + (tower.batCursePulse || 0) * 5 : 0;
        group.userData.vampireHead.rotation.y = Math.sin(now * .7 + tower.row) * .055;
        group.userData.vampireBloodOrb.visible = timer > 0;
        group.userData.vampireBloodOrb.scale.setScalar(.75 + cast * 1.15);
        group.userData.vampireBloodOrb.rotation.y += .08;
        group.userData.vampireBloodOrb.rotation.x += .045;
        group.userData.vampireLight.intensity = timer > 0 ? 2.5 + cast * 6 : .45;
      }
      if (group.userData.ufoBody) {
        const now = performance.now() * .001;
        const ufo = group.userData.ufoBody;
        ufo.position.y = ufo.userData.baseY + Math.sin(now * 2.4 + tower.col * .7) * .065;
        ufo.rotation.z = Math.sin(now * 1.35 + tower.row) * .025;
        group.userData.ufoLightRing.rotation.y += .055;
        group.userData.ufoDome.rotation.y -= .018;
        group.userData.ufoLights.forEach((light, index) => {
          const pulse = .78 + (Math.sin(now * 8 + index * .9) * .5 + .5) * .42;
          light.scale.setScalar(pulse);
        });
        group.userData.ufoGlow.intensity = 2.6 + Math.sin(now * 9) * .8;
      }
      group.userData.levelPips.forEach((pip, i) => pip.visible = i < tower.level);
    }
  }

  createTower(tower) {
    const group = new THREE.Group();
    if (tower.type !== "ogre" && tower.type !== "mage" && tower.type !== "archer" && tower.type !== "ghost" && tower.type !== "vampire" && tower.type !== "ufo") {
      const trim = this.mesh(new THREE.CylinderGeometry(.47, .5, .085, 10), this.mat.goldDark, 0, .055, 0, group);
      trim.receiveShadow = true;
      const base = this.mesh(new THREE.CylinderGeometry(.39, .46, .24, 10), this.mat.darkStone, 0, .13, 0, group);
      base.receiveShadow = true;
      this.mesh(new THREE.CylinderGeometry(.4, .4, .045, 10), this.mat.gold, 0, .255, 0, group);
    }
    if (tower.type === "archer" && tower.specialization === "riflemen") this.buildRiflemanTower(group);
    else if (tower.type === "archer" && tower.specialization === "slingshooters") this.buildSlingshooterTower(group);
    else if (tower.type === "archer") this.buildArcherTower(group);
    else if (tower.type === "mage") this.buildMageTower(group);
    else if (tower.type === "ballista") this.buildBallista(group, tower.specialization);
    else if (tower.type === "barracks" && tower.specialization === "graveyard") this.buildGravestone(group);
    else if (tower.type === "barracks" && tower.specialization === "gladiators") this.buildGladiatorCamp(group);
    else if (tower.type === "barracks") this.buildBarracks(group);
    else if (tower.type === "ogre" && tower.specialization === "togga") this.buildToggaRally(group);
    else if (tower.type === "ogre" && tower.specialization === "stoneThrow") this.buildStoneThrowOgre(group);
    else if (tower.type === "ogre") this.buildPlayerOgre(group);
    else if (tower.type === "ghost") this.buildGhost(group);
    else if (tower.type === "vampire") this.buildVampire(group);
    else if (tower.type === "ufo") this.buildUfo(group);
    else if (tower.type === "castle") this.buildTinyCastle(group);
    else if (tower.type === "mine" && tower.specialization === "treasureCove") this.buildTreasureCove(group);
    else this.buildGoldMine(group);
    const frozenAura = new THREE.Group();
    frozenAura.visible = false;
    const iceMaterial = new THREE.MeshBasicMaterial({ color: 0x9eeeff, transparent: true, opacity: .72, depthWrite: false, toneMapped: false });
    const frozenRing = this.mesh(new THREE.TorusGeometry(.54, .035, 6, 24), iceMaterial, 0, .14, 0, frozenAura);
    frozenRing.rotation.x = Math.PI / 2;
    const frozenCrystals = [];
    for (let index = 0; index < 7; index++) {
      const angle = index / 7 * Math.PI * 2;
      const crystal = this.mesh(new THREE.ConeGeometry(.075, .34 + index % 3 * .06, 5), iceMaterial, Math.cos(angle) * .48, .26, Math.sin(angle) * .48, frozenAura);
      crystal.userData.baseY = crystal.position.y;
      crystal.rotation.z = Math.cos(angle) * .2;
      frozenCrystals.push(crystal);
    }
    const frozenLight = new THREE.PointLight(0x83ddff, 3.5, 2.6, 2);
    frozenLight.position.y = .55;
    frozenAura.add(frozenLight);
    group.add(frozenAura);
    group.userData.frozenAura = frozenAura;
    group.userData.frozenCrystals = frozenCrystals;
    group.userData.frozenLight = frozenLight;
    if (tower.type !== "mine" && tower.type !== "castle") {
      const auraMaterial = new THREE.MeshBasicMaterial({ color: 0xffd77a, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
      const buffAura = this.mesh(new THREE.RingGeometry(.56, .64, 28), auraMaterial, 0, .145, 0, group);
      buffAura.rotation.x = -Math.PI / 2;
      buffAura.visible = false;
      buffAura.castShadow = false;
      group.userData.castleBuffAura = buffAura;
    }
    group.userData.levelPips = [];
    if (tower.type !== "mine" && tower.type !== "castle") {
      const pipHeight = tower.type === "archer" ? .31 : .08;
      for (let i = 0; i < 3; i++) {
        const pip = this.mesh(new THREE.OctahedronGeometry(.045), this.mat.gold, -.11 + i * .11, pipHeight, -.48, group);
        group.userData.levelPips.push(pip);
      }
    }
    group.scale.setScalar(this.towerModelScale);
    if (tower.type === "barracks" || tower.type === "archer" || tower.type === "ballista" || tower.type === "ogre" || tower.type === "mine") group.userData.visualSpecialization = tower.specialization || null;
    return group;
  }

  buildArcherHill(group) {
    const earthMound = this.mesh(new THREE.SphereGeometry(.76, 12, 7), this.mat.earth, 0, .045, 0, group);
    earthMound.scale.set(1, .28, .78);
    earthMound.receiveShadow = true;
    const grassMound = this.mesh(new THREE.SphereGeometry(.71, 12, 7), this.mat.grassC, 0, .095, 0, group);
    grassMound.scale.set(1, .22, .76);
    grassMound.receiveShadow = true;
    for (const [x, z, scale] of [[-.55, .18, .08], [.51, -.22, .065], [-.18, -.52, .055]]) {
      const stone = this.mesh(new THREE.DodecahedronGeometry(scale, 0), this.mat.stone, x, .22, z, group);
      stone.scale.y = .65;
    }
    return grassMound;
  }

  buildArcherTower(group) {
    const grassMound = this.buildArcherHill(group);
    const squad = new THREE.Group();
    group.add(squad);
    const skin = new THREE.MeshStandardMaterial({ color: 0xc89a73, roughness: .9, flatShading: true });
    const royalBlue = new THREE.MeshStandardMaterial({ color: 0x315f7d, roughness: .76, flatShading: true });
    const formation = [[-.48, -.12], [0, .2], [.48, -.12]];
    const archers = formation.map(([x, z], index) => {
      const unit = new THREE.Group();
      unit.position.set(x, .28, z);
      unit.scale.setScalar(1.14);
      squad.add(unit);

      const body = new THREE.Group();
      unit.add(body);
      this.mesh(new THREE.CylinderGeometry(.105, .15, .36, 8), royalBlue, 0, .36, 0, body);
      this.mesh(new THREE.BoxGeometry(.22, .055, .18), this.mat.goldDark, 0, .39, 0, body);
      this.mesh(new THREE.BoxGeometry(.1, .12, .035), this.mat.gold, 0, .42, .145, body).rotation.z = Math.PI / 4;
      const cape = this.mesh(new THREE.BoxGeometry(.23, .34, .035), index === 1 ? this.mat.roofRed : this.mat.darkRed, 0, .37, -.12, body);
      cape.rotation.x = -.08;

      const head = new THREE.Group();
      head.position.set(0, .64, .01);
      body.add(head);
      this.mesh(new THREE.SphereGeometry(.105, 10, 7), skin, 0, 0, 0, head);
      this.addEyes(head, .038, .018, .095, .013, 0x252015);
      this.mesh(new THREE.ConeGeometry(.145, .22, 7), index === 1 ? this.mat.roofRed : this.mat.leafMid, 0, .17, -.015, head);
      this.mesh(new THREE.CylinderGeometry(.15, .15, .035, 8), this.mat.goldDark, 0, .08, 0, head);

      const leftLeg = this.addJointedLimb(body, -.075, .2, 0, .25, .04, this.mat.darkStone);
      const rightLeg = this.addJointedLimb(body, .075, .2, 0, .25, .04, this.mat.darkStone);
      this.mesh(new THREE.BoxGeometry(.09, .055, .15), this.mat.wood, 0, -.24, .035, leftLeg);
      this.mesh(new THREE.BoxGeometry(.09, .055, .15), this.mat.wood, 0, -.24, .035, rightLeg);

      const bowArm = this.addJointedLimb(body, -.15, .53, .02, .31, .04, royalBlue);
      const drawArm = this.addJointedLimb(body, .15, .53, .02, .31, .04, royalBlue);
      bowArm.rotation.x = -.72;
      bowArm.rotation.z = -.12;
      drawArm.rotation.x = -.72;
      drawArm.rotation.z = .08;
      this.mesh(new THREE.SphereGeometry(.052, 8, 6), skin, 0, -.3, .065, bowArm);
      this.mesh(new THREE.SphereGeometry(.052, 8, 6), skin, 0, -.3, .01, drawArm);

      const bow = new THREE.Group();
      bow.position.set(0, -.3, .065);
      bowArm.add(bow);
      this.mesh(new THREE.CylinderGeometry(.026, .026, .14, 6), this.mat.wood, 0, 0, 0, bow);
      this.addBone(bow, new THREE.Vector3(0, .055, 0), new THREE.Vector3(-.085, .18, 0), .018, this.mat.lightWood);
      this.addBone(bow, new THREE.Vector3(-.085, .18, 0), new THREE.Vector3(-.025, .32, 0), .016, this.mat.lightWood);
      this.addBone(bow, new THREE.Vector3(0, -.055, 0), new THREE.Vector3(-.085, -.18, 0), .018, this.mat.lightWood);
      this.addBone(bow, new THREE.Vector3(-.085, -.18, 0), new THREE.Vector3(-.025, -.32, 0), .016, this.mat.lightWood);
      this.addBone(bow, new THREE.Vector3(-.025, .32, .008), new THREE.Vector3(0, 0, .008), .006, this.mat.bone);
      this.addBone(bow, new THREE.Vector3(0, 0, .008), new THREE.Vector3(-.025, -.32, .008), .006, this.mat.bone);
      const arrow = this.mesh(new THREE.CylinderGeometry(.009, .009, .34, 5), this.mat.goldLight, 0, -.28, .16, drawArm);
      arrow.rotation.x = Math.PI / 2;
      this.mesh(new THREE.CylinderGeometry(.065, .075, .28, 7), this.mat.wood, .12, .42, -.14, body).rotation.z = -.18;
      for (const offset of [-.035, .035]) {
        const spareArrow = this.mesh(new THREE.CylinderGeometry(.007, .007, .34, 5), this.mat.goldLight, .12 + offset, .55, -.14, body);
        spareArrow.rotation.z = -.18;
      }

      return { unit, body, bowArm, drawArm, arrow, baseY: unit.position.y };
    });
    group.userData.archerSquad = squad;
    group.userData.archers = archers;
    group.userData.archerHill = grassMound;
  }

  buildRiflemanTower(group) {
    const grassMound = this.buildArcherHill(group);
    const squad = new THREE.Group();
    group.add(squad);
    const skin = new THREE.MeshStandardMaterial({ color: 0xc89a73, roughness: .9, flatShading: true });
    const rifleBlue = new THREE.MeshStandardMaterial({ color: 0x294c64, roughness: .8, flatShading: true });
    const formation = [[-.48, -.12], [0, .2], [.48, -.12]];
    const riflemen = formation.map(([x, z], index) => {
      const unit = new THREE.Group();
      unit.position.set(x, .28, z);
      unit.scale.setScalar(1.14);
      squad.add(unit);

      const body = new THREE.Group();
      unit.add(body);
      this.mesh(new THREE.CylinderGeometry(.105, .15, .36, 8), rifleBlue, 0, .36, 0, body);
      this.mesh(new THREE.BoxGeometry(.23, .06, .19), this.mat.goldDark, 0, .39, 0, body);
      this.mesh(new THREE.BoxGeometry(.09, .1, .04), this.mat.gold, 0, .43, .13, body).rotation.z = Math.PI / 4;
      const cape = this.mesh(new THREE.BoxGeometry(.23, .32, .035), index === 1 ? this.mat.roofRed : this.mat.darkRed, 0, .37, -.12, body);
      cape.rotation.x = -.08;

      const head = new THREE.Group();
      head.position.set(0, .64, .01);
      body.add(head);
      this.mesh(new THREE.SphereGeometry(.105, 10, 7), skin, 0, 0, 0, head);
      this.addEyes(head, .038, .018, .095, .013, 0x252015);
      this.mesh(new THREE.CylinderGeometry(.13, .145, .12, 8), this.mat.darkStone, 0, .1, 0, head);
      const brim = this.mesh(new THREE.CylinderGeometry(.175, .175, .025, 9), this.mat.goldDark, 0, .055, 0, head);
      brim.scale.z = .78;

      const leftLeg = this.addJointedLimb(body, -.075, .2, 0, .25, .04, this.mat.darkStone);
      const rightLeg = this.addJointedLimb(body, .075, .2, 0, .25, .04, this.mat.darkStone);
      this.mesh(new THREE.BoxGeometry(.09, .055, .15), this.mat.wood, 0, -.24, .035, leftLeg);
      this.mesh(new THREE.BoxGeometry(.09, .055, .15), this.mat.wood, 0, -.24, .035, rightLeg);

      const leftArm = this.addJointedLimb(body, -.15, .52, .02, .3, .04, rifleBlue);
      const rightArm = this.addJointedLimb(body, .15, .52, .02, .3, .04, rifleBlue);
      leftArm.rotation.x = -.92;
      leftArm.rotation.z = -.2;
      rightArm.rotation.x = -.84;
      rightArm.rotation.z = .28;
      this.mesh(new THREE.SphereGeometry(.05, 8, 6), skin, 0, -.29, .04, leftArm);
      this.mesh(new THREE.SphereGeometry(.05, 8, 6), skin, 0, -.29, .04, rightArm);

      const rifle = new THREE.Group();
      rifle.position.set(0, .47, .08);
      body.add(rifle);
      this.mesh(new THREE.BoxGeometry(.1, .09, .43), this.mat.wood, 0, 0, .1, rifle);
      const barrel = this.mesh(new THREE.CylinderGeometry(.018, .022, .48, 7), this.mat.iron, 0, .025, .49, rifle);
      barrel.rotation.x = Math.PI / 2;
      this.mesh(new THREE.BoxGeometry(.07, .16, .13), this.mat.darkWood, .07, -.1, -.08, rifle).rotation.z = -.35;
      const muzzle = this.mesh(new THREE.CylinderGeometry(.03, .03, .05, 7), this.mat.goldDark, 0, .025, .735, rifle);
      muzzle.rotation.x = Math.PI / 2;

      return { unit, body, rifle, leftArm, rightArm, baseY: unit.position.y };
    });
    group.userData.rifleSquad = squad;
    group.userData.riflemen = riflemen;
    group.userData.archerHill = grassMound;
  }

  buildSlingshooterTower(group) {
    const grassMound = this.buildArcherHill(group);
    const squad = new THREE.Group();
    group.add(squad);
    const frame = new THREE.Group();
    squad.add(frame);
    this.addBone(frame, new THREE.Vector3(0, .18, 0), new THREE.Vector3(0, .67, 0), .065, this.mat.darkWood);
    this.addBone(frame, new THREE.Vector3(0, .58, 0), new THREE.Vector3(-.34, .98, 0), .055, this.mat.wood);
    this.addBone(frame, new THREE.Vector3(0, .58, 0), new THREE.Vector3(.34, .98, 0), .055, this.mat.wood);
    this.addBone(frame, new THREE.Vector3(-.43, .12, -.16), new THREE.Vector3(0, .3, 0), .055, this.mat.darkWood);
    this.addBone(frame, new THREE.Vector3(.43, .12, -.16), new THREE.Vector3(0, .3, 0), .055, this.mat.darkWood);
    this.addBone(frame, new THREE.Vector3(-.34, .98, .01), new THREE.Vector3(-.07, .72, -.18), .012, this.mat.darkStone);
    this.addBone(frame, new THREE.Vector3(.34, .98, .01), new THREE.Vector3(.07, .72, -.18), .012, this.mat.darkStone);
    const pouch = this.mesh(new THREE.BoxGeometry(.2, .08, .13), this.mat.darkLeather || this.mat.darkWood, 0, .72, -.18, frame);
    const rock = this.mesh(new THREE.DodecahedronGeometry(.115, 0), this.mat.stone, 0, .07, 0, pouch);

    const skin = new THREE.MeshStandardMaterial({ color: 0xc89a73, roughness: .9, flatShading: true });
    const tunic = new THREE.MeshStandardMaterial({ color: 0x506a3a, roughness: .86, flatShading: true });
    const formation = [[-.48, .05], [.48, .05], [0, -.4]];
    const workers = formation.map(([x, z], index) => {
      const unit = new THREE.Group();
      unit.position.set(x, .26, z);
      unit.scale.setScalar(1.02);
      squad.add(unit);
      const body = new THREE.Group();
      unit.add(body);
      this.mesh(new THREE.CylinderGeometry(.1, .145, .34, 8), tunic, 0, .35, 0, body);
      this.mesh(new THREE.BoxGeometry(.22, .05, .17), this.mat.goldDark, 0, .37, 0, body);
      const head = new THREE.Group();
      head.position.set(0, .61, .01);
      body.add(head);
      this.mesh(new THREE.SphereGeometry(.1, 9, 7), skin, 0, 0, 0, head);
      this.addEyes(head, .036, .017, .09, .012, 0x282117);
      const cap = this.mesh(new THREE.ConeGeometry(.13, .18, 7), index === 2 ? this.mat.roofRed : this.mat.leafMid, 0, .14, 0, head);
      cap.rotation.z = (index - 1) * .08;
      const leftArm = this.addJointedLimb(body, -.14, .49, .02, .28, .038, tunic);
      const rightArm = this.addJointedLimb(body, .14, .49, .02, .28, .038, tunic);
      leftArm.rotation.x = -.7;
      rightArm.rotation.x = -.7;
      leftArm.rotation.z = -.2;
      rightArm.rotation.z = .2;
      this.addJointedLimb(body, -.07, .19, 0, .23, .038, this.mat.darkStone);
      this.addJointedLimb(body, .07, .19, 0, .23, .038, this.mat.darkStone);
      return { unit, body, leftArm, rightArm, baseY: unit.position.y };
    });
    group.userData.slingSquad = squad;
    group.userData.slingWorkers = workers;
    group.userData.slingPouch = pouch;
    group.userData.slingRock = rock;
    group.userData.slingshot = frame;
    group.userData.archerHill = grassMound;
  }

  buildMageTower(group) {
    const wizard = new THREE.Group();
    wizard.position.y = -.019;
    wizard.scale.setScalar(.675);
    group.add(wizard);
    const skin = new THREE.MeshStandardMaterial({ color: 0xc79a76, roughness: .88, flatShading: true });
    const beard = new THREE.MeshStandardMaterial({ color: 0xd8d0bc, roughness: .92, flatShading: true });

    const robe = this.mesh(new THREE.CylinderGeometry(.17, .34, .68, 8), this.mat.purple, 0, .39, 0, wizard);
    robe.scale.z = .9;
    this.mesh(new THREE.TorusGeometry(.22, .032, 5, 10), this.mat.goldDark, 0, .48, 0, wizard).rotation.x = Math.PI / 2;
    this.mesh(new THREE.BoxGeometry(.09, .1, .055), this.mat.goldLight, 0, .48, .25, wizard).rotation.z = Math.PI / 4;
    for (const x of [-.13, .13]) {
      this.mesh(new THREE.BoxGeometry(.16, .09, .25), this.mat.darkStone, x, .075, .065, wizard).rotation.y = x < 0 ? -.12 : .12;
    }

    const head = new THREE.Group();
    head.position.set(0, .82, .015);
    wizard.add(head);
    this.mesh(new THREE.SphereGeometry(.16, 11, 8), skin, 0, 0, 0, head);
    this.addEyes(head, .055, .025, .145, .018);
    const beardMesh = this.mesh(new THREE.ConeGeometry(.11, .3, 7), beard, 0, -.16, .115, head);
    beardMesh.rotation.z = Math.PI;
    const hatBrim = this.mesh(new THREE.CylinderGeometry(.29, .29, .045, 10), this.mat.purple, 0, .145, 0, head);
    const hat = this.mesh(new THREE.ConeGeometry(.235, .42, 9), this.mat.purple, 0, .36, 0, head);
    hat.rotation.z = -.08;
    const hatTip = this.mesh(new THREE.ConeGeometry(.11, .25, 8), this.mat.roofLight, -.08, .61, 0, head);
    hatTip.rotation.z = -.48;
    this.mesh(new THREE.CylinderGeometry(.12, .12, .035, 8), this.mat.gold, 0, .22, 0, head);

    const staffArm = this.addJointedLimb(wizard, -.21, .65, 0, .35, .055, this.mat.purple);
    staffArm.rotation.z = -.3;
    const castingArm = this.addJointedLimb(wizard, .21, .66, .02, .35, .055, this.mat.purple);
    castingArm.rotation.x = -.92;
    castingArm.rotation.z = .15;
    this.mesh(new THREE.SphereGeometry(.075, 8, 6), skin, 0, -.35, 0, staffArm);
    this.mesh(new THREE.SphereGeometry(.075, 8, 6), skin, 0, -.35, .01, castingArm);
    const focus = this.mesh(new THREE.ConeGeometry(.065, .11, 4), this.mat.purple, 0, -.39, .12, castingArm);
    focus.rotation.x = Math.PI / 2;

    const staff = new THREE.Group();
    staff.position.set(-.34, .58, 0);
    wizard.add(staff);
    this.mesh(new THREE.CylinderGeometry(.022, .028, 1.05, 7), this.mat.lightWood, 0, 0, 0, staff);
    this.mesh(new THREE.TorusGeometry(.11, .025, 6, 10), this.mat.gold, 0, .55, 0, staff).rotation.x = Math.PI / 2;
    const crystal = this.mesh(new THREE.ConeGeometry(.13, .23, 4), this.mat.purple, 0, .67, 0, staff);
    crystal.userData.baseY = .67;
    group.userData.crystal = crystal;
    const light = new THREE.PointLight(0x9c7de9, 3, 2.2, 2);
    light.position.y = .67;
    staff.add(light);
    group.userData.wizardBody = wizard;
    group.userData.wizardHead = head;
    group.userData.wizardStaffArm = staffArm;
    group.userData.wizardCastingArm = castingArm;
    group.userData.wizardStaff = staff;
    group.userData.wizardFocus = focus;
    group.userData.wizardLight = light;
    group.userData.wizardRobePieces = [robe, hatBrim, hat];
    for (const arm of [staffArm, castingArm]) {
      arm.traverse(object => { if (object.isMesh && object.material === this.mat.purple) group.userData.wizardRobePieces.push(object); });
    }
  }

  buildBallista(group, specialization = null) {
    this.mesh(new THREE.CylinderGeometry(.34, .38, .46, 10), this.mat.stone, 0, .35, 0, group);
    this.mesh(new THREE.CylinderGeometry(.355, .355, .055, 10), this.mat.goldDark, 0, .58, 0, group);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      this.mesh(new THREE.BoxGeometry(.15, .14, .08), this.mat.stoneLight, Math.cos(a) * .32, .47, Math.sin(a) * .32, group).rotation.y = -a;
    }
    const turret = new THREE.Group();
    turret.position.y = .72;
    group.add(turret);
    this.mesh(new THREE.BoxGeometry(.75, .1, .12), this.mat.wood, .1, 0, 0, turret);
    this.mesh(new THREE.BoxGeometry(.08, .1, .8), this.mat.lightWood, .18, 0, 0, turret);
    this.mesh(new THREE.BoxGeometry(.56, .045, .045), this.mat.gold, .18, .08, 0, turret);
    const leftBrace = this.mesh(new THREE.BoxGeometry(.42, .045, .045), this.mat.iron, -.02, -.04, -.22, turret); leftBrace.rotation.y = -.55;
    const rightBrace = this.mesh(new THREE.BoxGeometry(.42, .045, .045), this.mat.iron, -.02, -.04, .22, turret); rightBrace.rotation.y = .55;
    this.mesh(new THREE.ConeGeometry(.07, .22, 6), this.mat.iron, .58, 0, 0, turret).rotation.z = -Math.PI / 2;
    group.userData.standardBallistaFrame = true;
    if (specialization === "flameBazooka") {
      const flameOuter = new THREE.MeshBasicMaterial({ color: 0xff5b20, transparent: true, opacity: .86, depthWrite: false, toneMapped: false });
      const flameInner = new THREE.MeshBasicMaterial({ color: 0xffdf63, transparent: true, opacity: .96, depthWrite: false, toneMapped: false });
      const flames = [];
      for (const [x, y, z, scale, phase] of [[.18, .18, -.39, 1, 0], [.18, .18, .39, 1, 2.1], [.49, .11, 0, .82, 4.2]]) {
        const outer = this.mesh(new THREE.ConeGeometry(.065 * scale, .24 * scale, 7), flameOuter, x, y, z, turret);
        outer.castShadow = false;
        outer.userData.baseY = y;
        outer.userData.phase = phase;
        flames.push(outer);
        const inner = this.mesh(new THREE.ConeGeometry(.032 * scale, .15 * scale, 7), flameInner, x, y - .012, z, turret);
        inner.castShadow = false;
        inner.userData.baseY = y - .012;
        inner.userData.phase = phase + .7;
        flames.push(inner);
      }
      const fireLight = new THREE.PointLight(0xff6a24, 4.2, 2.5, 2);
      fireLight.position.set(.28, .2, 0);
      turret.add(fireLight);
      group.userData.flameBallista = true;
      group.userData.ballistaFlames = flames;
      group.userData.ballistaFireLight = fireLight;
    } else if (specialization === "zeusBow") {
      const lightningMaterial = new THREE.MeshStandardMaterial({ color: 0x9fe7ff, roughness: .24, metalness: .35, emissive: 0x238fe0, emissiveIntensity: 1.7, flatShading: true });
      for (const side of [-1, 1]) {
        const limb = this.mesh(new THREE.BoxGeometry(.1, .08, .52), lightningMaterial, .14, .04, side * .25, turret);
        limb.rotation.x = side * .42;
        const coil = this.mesh(new THREE.TorusGeometry(.075, .018, 5, 12), this.mat.goldLight, .25, .08, side * .17, turret);
        coil.rotation.y = Math.PI / 2;
      }
      const crystal = this.mesh(new THREE.OctahedronGeometry(.105, 0), lightningMaterial, .48, .08, 0, turret);
      crystal.rotation.z = Math.PI / 4;
      const light = new THREE.PointLight(0x67cfff, 4.5, 2.4, 2);
      light.position.set(.43, .12, 0);
      turret.add(light);
      group.userData.zeusBow = true;
      group.userData.zeusCrystal = crystal;
      group.userData.zeusLight = light;
    }
    group.userData.turret = turret;
  }

  buildBarracks(group) {
    const blueCloth = new THREE.MeshStandardMaterial({ color: 0x315b75, roughness: .78, flatShading: true });
    const doorway = new THREE.MeshStandardMaterial({ color: 0x1c1a17, roughness: 1, flatShading: true });
    this.mesh(new THREE.BoxGeometry(.72, .62, .68), this.mat.stone, 0, .48, 0, group);
    for (const x of [-.27, .27]) this.mesh(new THREE.BoxGeometry(.19, .13, .055), this.mat.stoneLight, x, .52, .365, group);
    this.mesh(new THREE.BoxGeometry(.77, .055, .74), this.mat.goldDark, 0, .79, 0, group);
    const roof = this.mesh(new THREE.ConeGeometry(.6, .38, 4), this.mat.roofRed, 0, .98, 0, group);
    roof.rotation.y = Math.PI / 4;
    const roofCap = this.mesh(new THREE.ConeGeometry(.43, .32, 4), this.mat.roofLight, 0, 1.19, 0, group);
    roofCap.rotation.y = Math.PI / 4;
    this.mesh(new THREE.ConeGeometry(.055, .22, 5), this.mat.goldLight, 0, 1.47, 0, group);
    this.mesh(new THREE.BoxGeometry(.28, .43, .05), doorway, 0, .36, .365, group);
    this.mesh(new THREE.BoxGeometry(.86, .09, .09), this.mat.lightWood, 0, .75, .37, group);
    for (const x of [-.35, .35]) this.mesh(new THREE.BoxGeometry(.08, .72, .08), this.mat.wood, x, .42, .37, group);
    this.mesh(new THREE.CylinderGeometry(.015, .015, .92, 6), this.mat.iron, .42, 1.18, 0, group);
    const bannerShape = new THREE.Shape();
    bannerShape.moveTo(0, 0); bannerShape.lineTo(.38, .08); bannerShape.lineTo(.28, -.15); bannerShape.lineTo(0, -.12); bannerShape.closePath();
    const banner = this.mesh(new THREE.ShapeGeometry(bannerShape), blueCloth, .43, 1.48, 0, group);
    banner.rotation.y = Math.PI / 2;
    const shield = this.mesh(new THREE.CylinderGeometry(.13, .13, .035, 8), blueCloth, -.48, .27, -.18, group);
    shield.rotation.x = Math.PI / 2;
    this.mesh(new THREE.CylinderGeometry(.07, .07, .04, 8), this.mat.gold, -.48, .27, -.2, group).rotation.x = Math.PI / 2;
    this.mesh(new THREE.BoxGeometry(.035, .5, .035), this.mat.wood, -.46, .27, -.25, group);
  }

  buildTinyCastle(group) {
    const castle = new THREE.Group();
    castle.position.y = .04;
    castle.scale.setScalar(.86);
    group.add(castle);

    const doorway = new THREE.MeshStandardMaterial({ color: 0x171512, roughness: 1, flatShading: true });
    const royalBlue = new THREE.MeshStandardMaterial({ color: 0x315b75, roughness: .78, flatShading: true, side: THREE.DoubleSide });
    const windowGlow = new THREE.MeshBasicMaterial({ color: 0xffd978, toneMapped: false });

    const outerWall = this.mesh(new THREE.BoxGeometry(.92, .4, .76), this.mat.stone, 0, .46, 0, castle);
    outerWall.receiveShadow = true;
    this.mesh(new THREE.BoxGeometry(.96, .075, .8), this.mat.goldDark, 0, .68, 0, castle);

    const keep = this.mesh(new THREE.BoxGeometry(.5, .62, .48), this.mat.stoneLight, 0, .75, -.04, castle);
    keep.receiveShadow = true;
    this.mesh(new THREE.BoxGeometry(.54, .07, .52), this.mat.goldDark, 0, 1.07, -.04, castle);

    for (const [x, z] of [[-.38, -.31], [.38, -.31], [-.38, .31], [.38, .31]]) {
      const turret = this.mesh(new THREE.CylinderGeometry(.16, .18, .65, 10), this.mat.stoneLight, x, .67, z, castle);
      turret.receiveShadow = true;
      this.mesh(new THREE.CylinderGeometry(.18, .18, .07, 10), this.mat.goldDark, x, 1.01, z, castle);
      const roof = this.mesh(new THREE.ConeGeometry(.24, .32, 8), this.mat.roofRed, x, 1.2, z, castle);
      roof.rotation.y = Math.PI / 8;
      this.mesh(new THREE.SphereGeometry(.035, 7, 5), this.mat.goldLight, x, 1.38, z, castle);
    }

    const battlements = [
      [-.2, 1.16, -.22], [0, 1.16, -.22], [.2, 1.16, -.22],
      [-.2, 1.16, .14], [0, 1.16, .14], [.2, 1.16, .14],
      [-.24, 1.16, -.04], [.24, 1.16, -.04]
    ];
    battlements.forEach(([x, y, z]) => this.mesh(new THREE.BoxGeometry(.12, .18, .12), this.mat.stoneLight, x, y, z, castle));

    this.mesh(new THREE.BoxGeometry(.22, .3, .035), doorway, 0, .39, .4, castle);
    const doorArch = this.mesh(new THREE.SphereGeometry(.11, 9, 6, 0, Math.PI * 2, 0, Math.PI * .55), doorway, 0, .54, .4, castle);
    doorArch.scale.z = .16;
    const drawbridge = this.mesh(new THREE.BoxGeometry(.3, .045, .34), this.mat.lightWood, 0, .19, .55, castle);
    drawbridge.rotation.x = -.08;
    for (const x of [-.08, .08]) this.mesh(new THREE.BoxGeometry(.018, .06, .33), this.mat.goldDark, x, .215, .55, castle).rotation.x = -.08;

    for (const x of [-.16, .16]) {
      const window = this.mesh(new THREE.BoxGeometry(.075, .13, .025), windowGlow, x, .78, .215, castle);
      window.scale.y = 1.15;
    }

    const flagPole = this.mesh(new THREE.CylinderGeometry(.014, .018, .62, 7), this.mat.iron, 0, 1.42, -.04, castle);
    flagPole.castShadow = true;
    const bannerShape = new THREE.Shape();
    bannerShape.moveTo(0, .16);
    bannerShape.lineTo(.34, .11);
    bannerShape.lineTo(.27, -.07);
    bannerShape.lineTo(.34, -.2);
    bannerShape.lineTo(0, -.16);
    bannerShape.closePath();
    const banner = this.mesh(new THREE.ShapeGeometry(bannerShape), royalBlue, .015, 1.58, -.04, castle);
    banner.rotation.y = Math.PI / 2;
    this.mesh(new THREE.BoxGeometry(.12, .055, .025), this.mat.gold, .02, 1.58, .005, castle).rotation.z = Math.PI / 4;

    const cannon = new THREE.Group();
    cannon.position.set(0, .03, -.04);
    const cannonMount = this.mesh(new THREE.CylinderGeometry(.11, .13, .07, 8), this.mat.darkStone, 0, 1.22, 0, cannon);
    cannonMount.castShadow = true;
    const cannonBarrel = this.mesh(new THREE.CylinderGeometry(.052, .07, .42, 8), this.mat.iron, 0, 1.4, 0, cannon);
    cannonBarrel.rotation.z = Math.PI / 2;
    cannonBarrel.castShadow = true;
    const cannonMuzzle = this.mesh(new THREE.TorusGeometry(.07, .018, 6, 10), this.mat.gold, .21, 1.4, 0, cannon);
    cannonMuzzle.rotation.y = Math.PI / 2;
    const cannonLight = new THREE.PointLight(0xffb43d, 2.2, 1.8, 2);
    cannonLight.position.set(.2, 1.4, 0);
    cannon.add(cannonLight);
    cannon.visible = false;
    group.add(cannon);

    const auraMaterial = new THREE.MeshBasicMaterial({ color: 0xffd978, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const aura = this.mesh(new THREE.RingGeometry(.93, 1.04, 36), auraMaterial, 0, .16, 0, group);
    aura.rotation.x = -Math.PI / 2;
    aura.castShadow = false;
    const auraLight = new THREE.PointLight(0xffcf69, 1.15, 2.2, 2);
    auraLight.position.set(0, .65, 0);
    group.add(auraLight);

    group.userData.tinyCastle = castle;
    group.userData.castleAura = aura;
    group.userData.castleBanner = banner;
    group.userData.castleCannon = cannon;
    group.userData.castleCannonLight = cannonLight;
  }

  buildGravestone(group) {
    const graveSoil = new THREE.MeshStandardMaterial({ color: 0x40382e, roughness: 1, flatShading: true });
    const graveGlow = new THREE.MeshStandardMaterial({ color: 0x8fc47a, roughness: .38, emissive: 0x365f31, emissiveIntensity: 1.3, flatShading: true });
    const mound = this.mesh(new THREE.SphereGeometry(.47, 12, 7), graveSoil, 0, .22, 0, group);
    mound.scale.set(1.15, .42, .82);
    const stone = this.mesh(new THREE.BoxGeometry(.5, .82, .17), this.mat.darkStone, 0, .66, 0, group);
    stone.rotation.z = -.04;
    this.mesh(new THREE.SphereGeometry(.25, 12, 7, 0, Math.PI * 2, 0, Math.PI * .55), this.mat.darkStone, 0, 1.07, 0, group);
    this.mesh(new THREE.BoxGeometry(.34, .055, .035), graveGlow, 0, .75, .095, group);
    this.mesh(new THREE.BoxGeometry(.06, .33, .035), graveGlow, 0, .75, .098, group);
    for (const x of [-.31, .31]) {
      const bone = this.mesh(new THREE.CylinderGeometry(.025, .025, .48, 6), this.mat.bone, x, .24, .16, group);
      bone.rotation.z = x < 0 ? -.72 : .72;
    }
    for (const x of [-.26, .26]) {
      this.mesh(new THREE.CylinderGeometry(.035, .045, .2, 7), this.mat.bone, x, .25, -.28, group);
      this.mesh(new THREE.SphereGeometry(.04, 7, 5), graveGlow, x, .38, -.28, group);
    }
    const wisps = new THREE.Group();
    group.add(wisps);
    for (let index = 0; index < 3; index++) {
      const angle = index / 3 * Math.PI * 2;
      const wisp = this.mesh(new THREE.TetrahedronGeometry(.07, 0), graveGlow, Math.cos(angle) * .39, .66 + index * .09, Math.sin(angle) * .28, wisps);
      wisp.userData.baseY = wisp.position.y;
    }
    const light = new THREE.PointLight(0x83c873, 4, 2.6, 2);
    light.position.set(0, .78, .18);
    group.add(light);
    group.userData.graveWisps = wisps;
    group.userData.gravestone = stone;
  }

  buildGladiatorCamp(group) {
    const crimson = new THREE.MeshStandardMaterial({ color: 0x8b2925, roughness: .72, flatShading: true });
    const bronze = new THREE.MeshStandardMaterial({ color: 0xa56f2a, roughness: .42, metalness: .5, flatShading: true });
    this.mesh(new THREE.CylinderGeometry(.47, .49, .18, 12), this.mat.stone, 0, .34, 0, group);
    const arenaFloor = this.mesh(new THREE.CylinderGeometry(.4, .42, .07, 12), this.mat.soil, 0, .46, 0, group);
    arenaFloor.receiveShadow = true;
    for (let index = 0; index < 8; index++) {
      const angle = index / 8 * Math.PI * 2;
      const wall = this.mesh(new THREE.BoxGeometry(.22, .2, .09), index % 2 ? this.mat.stoneLight : this.mat.stone, Math.cos(angle) * .43, .54, Math.sin(angle) * .43, group);
      wall.rotation.y = -angle;
    }
    for (const side of [-1, 1]) {
      const pole = this.mesh(new THREE.CylinderGeometry(.018, .022, .88, 7), bronze, side * .38, .86, -.28, group);
      const banner = this.mesh(new THREE.BoxGeometry(.28, .34, .025), crimson, side * .38, 1.12, -.26, group);
      banner.rotation.y = side * .08;
      this.mesh(new THREE.BoxGeometry(.2, .045, .035), this.mat.gold, side * .38, 1.12, -.242, group);
    }
    const rack = new THREE.Group();
    rack.position.set(0, .62, .12);
    group.add(rack);
    for (const x of [-.12, 0, .12]) {
      const spear = this.mesh(new THREE.CylinderGeometry(.012, .012, .74, 6), this.mat.wood, x, .28, 0, rack);
      spear.rotation.z = x * 1.5;
      this.mesh(new THREE.ConeGeometry(.035, .14, 5), this.mat.iron, x - x * .27, .65, 0, rack).rotation.z = -x * 1.5;
    }
    group.userData.gladiatorCamp = arenaFloor;
  }

  buildPlayerOgre(group) {
    const body = new THREE.Group();
    body.position.y = .08;
    group.add(body);
    const warPaint = new THREE.MeshStandardMaterial({ color: 0x315b75, roughness: .78, flatShading: true });
    const hide = new THREE.MeshStandardMaterial({ color: 0x4b3826, roughness: .92, flatShading: true });
    const torso = this.mesh(new THREE.SphereGeometry(.4, 14, 10), this.mat.ogre, 0, .53, 0, body);
    torso.scale.set(1.04, 1.18, .9);
    const head = new THREE.Group();
    head.position.set(0, 1.03, .04);
    body.add(head);
    this.mesh(new THREE.SphereGeometry(.24, 12, 9), this.mat.ogre, 0, 0, 0, head);
    this.mesh(new THREE.BoxGeometry(.64, .13, .35), hide, 0, .42, 0, body);
    const shoulderA = this.mesh(new THREE.DodecahedronGeometry(.16, 0), this.mat.goldDark, -.37, .8, 0, body); shoulderA.scale.set(1.25, .72, 1);
    const shoulderB = this.mesh(new THREE.DodecahedronGeometry(.16, 0), this.mat.goldDark, .37, .8, 0, body); shoulderB.scale.set(1.25, .72, 1);
    this.mesh(new THREE.CylinderGeometry(.17, .17, .06, 8), this.mat.gold, 0, .62, .31, body).rotation.x = Math.PI / 2;
    const sash = this.mesh(new THREE.BoxGeometry(.13, .72, .4), warPaint, -.08, .61, .02, body);
    sash.rotation.z = -.52;
    this.addEyes(head, .085, .05, .19, .032);
    const tuskA = this.mesh(new THREE.ConeGeometry(.035, .17, 5), this.mat.bone, -.09, -.11, .21, head); tuskA.rotation.x = Math.PI;
    const tuskB = this.mesh(new THREE.ConeGeometry(.035, .17, 5), this.mat.bone, .09, -.11, .21, head); tuskB.rotation.x = Math.PI;
    const buildCrouchedLeg = side => {
      const upper = this.addJointedLimb(body, side * .23, .4, .08, .3, .11, this.mat.ogre);
      upper.rotation.set(-.68, 0, side * .24);
      const knee = this.mesh(new THREE.DodecahedronGeometry(.115, 0), this.mat.goldDark, 0, -.3, .015, upper);
      knee.scale.set(1.15, .78, 1.05);
      const lower = this.addJointedLimb(upper, 0, -.29, 0, .28, .096, this.mat.ogre);
      lower.rotation.x = 1.24;
      this.mesh(new THREE.CylinderGeometry(.105, .105, .055, 7), this.mat.goldDark, 0, -.08, 0, lower);
      const foot = this.mesh(new THREE.BoxGeometry(.2, .1, .29), this.mat.ogre, 0, -.29, .09, lower);
      foot.rotation.y = side * .08;
      for (const toeX of [-.06, .06]) this.mesh(new THREE.ConeGeometry(.025, .105, 5), this.mat.bone, toeX, -.3, .235, lower).rotation.x = Math.PI / 2;
      return { upper, lower };
    };
    const leftLegParts = buildCrouchedLeg(-1);
    const rightLegParts = buildCrouchedLeg(1);

    const buildGuardedArm = side => {
      const upper = this.addJointedLimb(body, side * .38, .78, 0, .34, .115, this.mat.ogre);
      upper.rotation.set(-.54, 0, side * .2);
      const forearm = this.addJointedLimb(upper, 0, -.32, 0, .31, .105, this.mat.ogre);
      forearm.rotation.x = -.82;
      this.mesh(new THREE.CylinderGeometry(.12, .12, .06, 7), this.mat.goldDark, 0, -.08, 0, forearm);
      this.mesh(new THREE.SphereGeometry(.15, 9, 7), this.mat.ogre, 0, -.32, .02, forearm);
      return { upper, forearm };
    };
    const leftArmParts = buildGuardedArm(-1);
    const rightArmParts = buildGuardedArm(1);
    this.mesh(new THREE.CylinderGeometry(.23, .25, .13, 10), warPaint, 0, .3, 0, body);
    group.userData.playerOgre = body;
    group.userData.ogreTorso = torso;
    group.userData.ogreHead = head;
    group.userData.ogreLeftArm = leftArmParts.upper;
    group.userData.ogreRightArm = rightArmParts.upper;
    group.userData.ogreLeftForearm = leftArmParts.forearm;
    group.userData.ogreRightForearm = rightArmParts.forearm;
    group.userData.ogreLeftLeg = leftLegParts.upper;
    group.userData.ogreRightLeg = rightLegParts.upper;
    group.userData.ogreLeftLowerLeg = leftLegParts.lower;
    group.userData.ogreRightLowerLeg = rightLegParts.lower;
  }

  buildToggaRally(group) {
    const plate = this.mesh(new THREE.CylinderGeometry(.55, .62, .12, 10), this.mat.darkStone, 0, .07, 0, group);
    plate.receiveShadow = true;
    this.mesh(new THREE.RingGeometry(.35, .48, 10), this.mat.goldDark, 0, .135, 0, group).rotation.x = -Math.PI / 2;
    const pole = this.mesh(new THREE.CylinderGeometry(.025, .032, .95, 7), this.mat.wood, -.28, .58, -.18, group);
    pole.rotation.z = -.04;
    const banner = new THREE.MeshStandardMaterial({ color: 0x315b75, roughness: .82, side: THREE.DoubleSide, flatShading: true });
    const cloth = this.mesh(new THREE.BoxGeometry(.45, .34, .025), banner, -.08, .88, -.18, group);
    cloth.rotation.z = -.06;
    this.mesh(new THREE.BoxGeometry(.31, .055, .04), this.mat.gold, -.08, .88, -.155, group).rotation.z = -.06;
    group.userData.toggaRally = plate;
  }

  buildStoneThrowOgre(group) {
    this.buildPlayerOgre(group);
    const stones = new THREE.Group();
    stones.position.set(.56, .08, .28);
    group.add(stones);
    const mainRock = this.mesh(new THREE.DodecahedronGeometry(.24, 0), this.mat.stone, 0, .19, 0, stones);
    mainRock.scale.set(1.1, .9, 1);
    this.mesh(new THREE.DodecahedronGeometry(.11, 0), this.mat.stoneLight, -.19, .08, .08, stones);
    this.mesh(new THREE.DodecahedronGeometry(.095, 0), this.mat.darkStone, .19, .07, -.04, stones);
    group.userData.stonePile = stones;
    group.userData.stoneThrowRock = mainRock;
  }

  buildToggaWarrior(group) {
    this.buildPlayerOgre(group);
    const body = group.userData.playerOgre;
    const armor = new THREE.MeshStandardMaterial({ color: 0x4b5558, roughness: .38, metalness: .72, flatShading: true });
    const armorLight = new THREE.MeshStandardMaterial({ color: 0x798386, roughness: .3, metalness: .76, flatShading: true });
    const blue = new THREE.MeshStandardMaterial({ color: 0x244e68, roughness: .76, flatShading: true });
    const chest = this.mesh(new THREE.BoxGeometry(.62, .62, .24), armor, 0, .62, .22, body);
    chest.scale.set(1, 1, .72);
    this.mesh(new THREE.BoxGeometry(.48, .1, .3), armorLight, 0, .78, .24, body);
    for (const side of [-1, 1]) {
      const shoulder = this.mesh(new THREE.DodecahedronGeometry(.22, 0), armor, side * .42, .82, .02, body);
      shoulder.scale.set(1.22, .72, 1.05);
      this.mesh(new THREE.CylinderGeometry(.13, .15, .29, 8), armor, 0, -.18, .025, side < 0 ? group.userData.ogreLeftForearm : group.userData.ogreRightForearm);
      this.mesh(new THREE.BoxGeometry(.22, .18, .25), armor, 0, -.15, .1, side < 0 ? group.userData.ogreLeftLowerLeg : group.userData.ogreRightLowerLeg);
    }
    const head = group.userData.ogreHead;
    const helmet = this.mesh(new THREE.SphereGeometry(.265, 12, 8, 0, Math.PI * 2, 0, Math.PI * .58), armor, 0, .04, -.015, head);
    helmet.scale.set(1.05, .95, 1);
    this.mesh(new THREE.BoxGeometry(.42, .075, .09), armorLight, 0, -.015, .22, head);
    const crest = this.mesh(new THREE.ConeGeometry(.075, .38, 6), blue, 0, .34, -.06, head);
    crest.rotation.x = -.18;
    const belt = this.mesh(new THREE.BoxGeometry(.7, .12, .4), armor, 0, .34, 0, body);
    this.mesh(new THREE.CylinderGeometry(.1, .1, .055, 8), this.mat.gold, 0, .34, .23, body).rotation.x = Math.PI / 2;
    group.userData.toggaWarrior = true;
    group.userData.toggaChest = chest;
    group.userData.toggaHelmet = helmet;
    group.userData.toggaBelt = belt;
  }

  buildGhost(group) {
    const ghost = new THREE.Group();
    ghost.position.y = .09;
    group.add(ghost);

    const makeRibbon = (parent, points, widths, material, z = 0) => {
      const positions = [];
      const indices = [];
      points.forEach((point, index) => {
        const previous = points[Math.max(0, index - 1)];
        const next = points[Math.min(points.length - 1, index + 1)];
        const dx = next[0] - previous[0];
        const dy = next[1] - previous[1];
        const length = Math.hypot(dx, dy) || 1;
        const normalX = -dy / length;
        const normalY = dx / length;
        const halfWidth = widths[index] / 2;
        positions.push(point[0] + normalX * halfWidth, point[1] + normalY * halfWidth, z);
        positions.push(point[0] - normalX * halfWidth, point[1] - normalY * halfWidth, z);
        if (index < points.length - 1) {
          const a = index * 2;
          indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      const ribbon = this.mesh(geometry, material, 0, 0, 0, parent);
      ribbon.receiveShadow = false;
      return ribbon;
    };

    const shroud = this.mesh(new THREE.ConeGeometry(.3, .72, 10), this.mat.spectral, 0, .49, 0, ghost);
    shroud.scale.z = .76;
    const shoulders = this.mesh(new THREE.SphereGeometry(.3, 12, 8), this.mat.spectral, 0, .72, 0, ghost);
    shoulders.scale.set(1.05, .62, .72);

    const head = new THREE.Group();
    head.position.set(0, .94, .015);
    ghost.add(head);
    const crown = this.mesh(new THREE.SphereGeometry(.255, 14, 10), this.mat.spectral, 0, 0, 0, head);
    crown.scale.set(.9, 1.2, .78);
    const faceMaterial = new THREE.MeshBasicMaterial({ color: 0x111014, side: THREE.DoubleSide });
    const umbralFaceMaterial = new THREE.MeshBasicMaterial({ color: 0xff8cf5, toneMapped: false, side: THREE.DoubleSide });
    const leftEye = this.mesh(new THREE.SphereGeometry(.052, 10, 7), faceMaterial, -.08, .035, .205, head);
    const rightEye = this.mesh(new THREE.SphereGeometry(.052, 10, 7), faceMaterial, .08, .035, .205, head);
    leftEye.scale.set(.72, 1.42, .28);
    rightEye.scale.set(.72, 1.42, .28);
    const mouth = this.mesh(new THREE.SphereGeometry(.065, 10, 8), faceMaterial, 0, -.13, .215, head);
    mouth.scale.set(.72, 1.48, .25);

    const blanket = new THREE.Group();
    blanket.position.z = -.035;
    ghost.add(blanket);
    makeRibbon(blanket,
      [[0, .9], [.018, .76], [-.018, .6], [.025, .42], [-.02, .23], [.01, .04]],
      [.34, .8, 1.3, 1.66, 1.5, .72], this.mat.spectral, 0);
    makeRibbon(blanket,
      [[-.2, .72], [-.28, .56], [-.43, .38], [-.5, .19], [-.38, .04]],
      [.1, .095, .08, .055, .012], this.mat.spectralDark, .018);
    makeRibbon(blanket,
      [[.2, .72], [.28, .56], [.43, .38], [.5, .19], [.38, .04]],
      [.1, .095, .08, .055, .012], this.mat.spectralDark, .018);
    makeRibbon(blanket,
      [[0, .72], [-.025, .54], [.035, .36], [-.015, .14]],
      [.075, .065, .05, .012], this.mat.spectralDark, .022);

    const streamerSpecs = [
      { x: -.23, points: [[0, .34], [-.03, .16], [-.13, -.01], [-.29, -.08]] },
      { x: -.12, points: [[0, .33], [-.04, .13], [-.02, -.06], [-.12, -.18]] },
      { x: 0, points: [[0, .34], [.025, .13], [-.02, -.08], [.08, -.22]] },
      { x: .12, points: [[0, .33], [.04, .14], [.03, -.05], [.18, -.15]] },
      { x: .23, points: [[0, .34], [.03, .17], [.13, .01], [.31, -.04]] }
    ];
    const streamers = streamerSpecs.map((spec, index) => {
      const streamer = new THREE.Group();
      streamer.position.x = spec.x;
      ghost.add(streamer);
      makeRibbon(streamer, spec.points, [.14, .12, .075, .012], index % 2 ? this.mat.spectralDark : this.mat.spectral, -.01 + index * .006);
      return streamer;
    });

    const umbralSpectral = new THREE.MeshStandardMaterial({ color: 0x7220a8, roughness: .52, transparent: true, opacity: .94, emissive: 0x26003f, emissiveIntensity: 1.05, flatShading: true, side: THREE.DoubleSide });
    const umbralDark = new THREE.MeshStandardMaterial({ color: 0x260032, roughness: .68, emissive: 0x16001f, emissiveIntensity: .8, flatShading: true, side: THREE.DoubleSide });
    const ghostMaterialBindings = [];
    ghost.traverse(piece => {
      if (!piece.isMesh || (piece.material !== this.mat.spectral && piece.material !== this.mat.spectralDark)) return;
      ghostMaterialBindings.push({ mesh: piece, normal: piece.material, umbral: piece.material === this.mat.spectral ? umbralSpectral : umbralDark });
    });

    const umbralFeatures = new THREE.Group();
    umbralFeatures.visible = false;
    ghost.add(umbralFeatures);
    for (const side of [-1, 1]) {
      const horn = this.mesh(new THREE.ConeGeometry(.065, .3, 6), umbralDark, side * .18, 1.17, -.015, umbralFeatures);
      horn.rotation.z = side * -.48;
      const shoulderSpike = this.mesh(new THREE.ConeGeometry(.055, .28, 5), umbralDark, side * .42, .72, -.02, umbralFeatures);
      shoulderSpike.rotation.z = side * -.92;
      const claw = this.mesh(new THREE.ConeGeometry(.045, .25, 5), umbralFaceMaterial, side * .51, .26, .035, umbralFeatures);
      claw.rotation.z = side * -.64;
    }
    const browLeft = this.mesh(new THREE.BoxGeometry(.12, .028, .035), umbralDark, -.08, .995, .232, umbralFeatures);
    const browRight = this.mesh(new THREE.BoxGeometry(.12, .028, .035), umbralDark, .08, .995, .232, umbralFeatures);
    browLeft.rotation.z = -.22;
    browRight.rotation.z = .22;
    for (const side of [-1, 1]) {
      const fang = this.mesh(new THREE.ConeGeometry(.018, .11, 5), umbralFaceMaterial, side * .035, .77, .245, umbralFeatures);
      fang.rotation.z = Math.PI;
    }

    const auraMaterial = new THREE.MeshBasicMaterial({ color: 0x9be3d6, transparent: true, opacity: .24, side: THREE.DoubleSide, depthWrite: false });
    const auraWispMaterial = new THREE.MeshBasicMaterial({ color: 0xc6fff3, transparent: true, opacity: .98, depthWrite: false });
    const aura = this.mesh(new THREE.RingGeometry(.37, .43, 28), auraMaterial, 0, .12, 0, group);
    aura.rotation.x = -Math.PI / 2;
    const auraWisps = [];
    for (let index = 0; index < 3; index++) {
      const angle = index / 3 * Math.PI * 2;
      const wisp = this.mesh(new THREE.TetrahedronGeometry(.055, 0), auraWispMaterial, Math.cos(angle) * .36, .12, Math.sin(angle) * .36, group);
      aura.add(wisp);
      auraWisps.push(wisp);
    }
    const light = new THREE.PointLight(0x7de8d3, 2.2, 2.4, 2);
    light.position.set(0, .72, .08);
    ghost.add(light);

    group.userData.ghostBody = ghost;
    group.userData.ghostHead = head;
    group.userData.ghostBlanket = blanket;
    group.userData.ghostStreamers = streamers;
    group.userData.ghostAura = aura;
    group.userData.ghostAuraWisps = auraWisps;
    group.userData.ghostLight = light;
    group.userData.ghostMaterialBindings = ghostMaterialBindings;
    group.userData.ghostFacePieces = [leftEye, rightEye, mouth];
    group.userData.normalGhostFaceMaterial = faceMaterial;
    group.userData.umbralFaceMaterial = umbralFaceMaterial;
    group.userData.umbralFeatures = umbralFeatures;
    group.userData.umbralActive = false;
  }

  buildVampire(group) {
    const vampire = new THREE.Group();
    vampire.position.y = .03;
    vampire.scale.setScalar(.82);
    group.add(vampire);
    const pale = new THREE.MeshStandardMaterial({ color: 0xe5d4cc, roughness: .76, flatShading: true });
    const blackCloth = new THREE.MeshStandardMaterial({ color: 0x171419, roughness: .88, flatShading: true });
    const crimson = new THREE.MeshStandardMaterial({ color: 0x8e1729, roughness: .72, flatShading: true });
    const bloodGlow = new THREE.MeshBasicMaterial({ color: 0xff2648, toneMapped: false });
    const eyeGlow = new THREE.MeshBasicMaterial({ color: 0xff304c, toneMapped: false });

    const cape = new THREE.Group();
    cape.position.set(0, .53, -.12);
    vampire.add(cape);
    const capeBack = this.mesh(new THREE.ConeGeometry(.5, .92, 5), blackCloth, 0, 0, 0, cape);
    capeBack.scale.set(1.15, 1, .44);
    capeBack.rotation.y = Math.PI;
    const capeLeft = this.mesh(new THREE.ConeGeometry(.35, .78, 4), crimson, -.24, -.05, -.04, cape);
    capeLeft.scale.z = .35;
    capeLeft.rotation.z = -.18;
    const capeRight = this.mesh(new THREE.ConeGeometry(.35, .78, 4), crimson, .24, -.05, -.04, cape);
    capeRight.scale.z = .35;
    capeRight.rotation.z = .18;

    const draculaBlack = new THREE.MeshStandardMaterial({ color: 0x100b12, roughness: .68, metalness: .08, flatShading: true });
    const draculaCrimson = new THREE.MeshStandardMaterial({ color: 0xb41e2f, roughness: .58, emissive: 0x3b070d, emissiveIntensity: .5, flatShading: true });
    const draculaOrange = new THREE.MeshBasicMaterial({ color: 0xff8a32, toneMapped: false });
    const draculaCape = new THREE.Group();
    draculaCape.position.copy(cape.position);
    draculaCape.visible = false;
    vampire.add(draculaCape);
    const draculaCapeBack = this.mesh(new THREE.ConeGeometry(.58, 1.04, 5), draculaBlack, 0, -.02, 0, draculaCape);
    draculaCapeBack.scale.set(1.18, 1, .46);
    draculaCapeBack.rotation.y = Math.PI;
    for (const side of [-1, 1]) {
      const flare = this.mesh(new THREE.ConeGeometry(.38, .92, 4), draculaCrimson, side * .29, -.08, -.025, draculaCape);
      flare.scale.z = .38;
      flare.rotation.z = side * .22;
      const clasp = this.mesh(new THREE.OctahedronGeometry(.042, 0), draculaOrange, side * .15, .36, .15, draculaCape);
      clasp.castShadow = false;
    }

    const torso = this.mesh(new THREE.CylinderGeometry(.17, .27, .58, 8), blackCloth, 0, .57, 0, vampire);
    torso.scale.z = .72;
    this.mesh(new THREE.BoxGeometry(.32, .06, .2), crimson, 0, .57, .02, vampire);
    const shirt = this.mesh(new THREE.ConeGeometry(.095, .24, 3), pale, 0, .71, .19, vampire);
    shirt.rotation.z = Math.PI;
    this.mesh(new THREE.SphereGeometry(.045, 8, 6), this.mat.gold, 0, .57, .2, vampire);

    for (const side of [-1, 1]) {
      const leg = this.addJointedLimb(vampire, side * .1, .3, 0, .34, .055, blackCloth);
      leg.rotation.z = side * .05;
      const boot = this.mesh(new THREE.BoxGeometry(.12, .11, .24), blackCloth, 0, -.32, .07, leg);
      boot.rotation.y = side * .08;
    }

    const head = new THREE.Group();
    head.position.set(0, .96, .015);
    vampire.add(head);
    const face = this.mesh(new THREE.SphereGeometry(.18, 12, 9), pale, 0, 0, 0, head);
    face.scale.set(.83, 1.08, .8);
    const slickHair = new THREE.Group();
    head.add(slickHair);
    const hairCap = this.mesh(new THREE.SphereGeometry(.19, 10, 7, 0, Math.PI * 2, 0, Math.PI * .54), blackCloth, 0, .095, -.035, slickHair);
    hairCap.scale.set(.91, .72, .88);
    const hairline = this.mesh(new THREE.BoxGeometry(.27, .055, .045), blackCloth, 0, .115, .13, slickHair);
    hairline.rotation.x = -.22;
    for (const [x, length, tilt] of [[-.1, .22, -.08], [0, .3, 0], [.1, .22, .08]]) {
      const sweptLock = this.mesh(new THREE.ConeGeometry(.055, length, 5), blackCloth, x, .105, -.135, slickHair);
      sweptLock.rotation.x = -Math.PI / 2;
      sweptLock.rotation.z = tilt;
      sweptLock.scale.z = .72;
    }
    for (const side of [-1, 1]) {
      const ear = this.mesh(new THREE.ConeGeometry(.045, .16, 5), pale, side * .175, .01, 0, head);
      ear.rotation.z = side * -Math.PI / 2;
      const eye = this.mesh(new THREE.SphereGeometry(.03, 8, 6), eyeGlow, side * .065, .02, .145, head);
      eye.scale.set(1, .65, .36);
      const fang = this.mesh(new THREE.ConeGeometry(.012, .085, 5), this.mat.bone, side * .043, -.105, .15, head);
      fang.rotation.z = Math.PI;
    }
    const collarLeft = this.mesh(new THREE.ConeGeometry(.16, .36, 4), crimson, -.15, .82, -.08, vampire);
    collarLeft.rotation.z = -.32;
    collarLeft.scale.z = .42;
    const collarRight = this.mesh(new THREE.ConeGeometry(.16, .36, 4), crimson, .15, .82, -.08, vampire);
    collarRight.rotation.z = .32;
    collarRight.scale.z = .42;

    const leftArm = this.addJointedLimb(vampire, -.22, .75, .02, .43, .058, blackCloth);
    const rightArm = this.addJointedLimb(vampire, .22, .75, .02, .43, .058, blackCloth);
    leftArm.rotation.set(-.62, 0, -.3);
    rightArm.rotation.set(-.62, 0, .3);
    for (const arm of [leftArm, rightArm]) {
      const hand = this.mesh(new THREE.SphereGeometry(.07, 9, 7), pale, 0, -.42, .025, arm);
      hand.scale.set(.8, 1.08, .72);
      for (const finger of [-.035, 0, .035]) {
        const claw = this.mesh(new THREE.ConeGeometry(.009, .07, 5), pale, finger, -.49, .045, arm);
        claw.rotation.x = Math.PI;
      }
    }

    const bloodOrb = this.mesh(new THREE.IcosahedronGeometry(.075, 1), bloodGlow, 0, .67, .48, vampire);
    bloodOrb.visible = false;
    bloodOrb.castShadow = false;
    const light = new THREE.PointLight(0xff173e, .45, 2.5, 2);
    light.position.set(0, .7, .3);
    vampire.add(light);

    const draculaAura = this.mesh(new THREE.RingGeometry(.39, .48, 28), new THREE.MeshBasicMaterial({ color: 0xff7b29, transparent: true, opacity: .72, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }), 0, .045, 0, group);
    draculaAura.rotation.x = -Math.PI / 2;
    draculaAura.visible = false;
    draculaAura.castShadow = false;
    const draculaLight = new THREE.PointLight(0xff4a1c, 0, 3.2, 2);
    draculaLight.position.set(0, .75, .15);
    group.add(draculaLight);

    group.userData.vampireBody = vampire;
    group.userData.vampireHead = head;
    group.userData.vampireSlickHair = slickHair;
    group.userData.vampireCape = cape;
    group.userData.draculaCape = draculaCape;
    group.userData.draculaAura = draculaAura;
    group.userData.draculaLight = draculaLight;
    group.userData.vampireLeftArm = leftArm;
    group.userData.vampireRightArm = rightArm;
    group.userData.vampireBloodOrb = bloodOrb;
    group.userData.vampireLight = light;
  }

  buildUfo(group) {
    const ufo = new THREE.Group();
    ufo.position.y = .72;
    ufo.userData.baseY = .72;
    ufo.scale.setScalar(.96);
    group.add(ufo);

    const silver = new THREE.MeshStandardMaterial({ color: 0x98a7aa, metalness: .72, roughness: .26, flatShading: true });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x273137, metalness: .58, roughness: .34, flatShading: true });
    const greenGlow = new THREE.MeshBasicMaterial({ color: 0x52ff78, toneMapped: false });
    const paleGlow = new THREE.MeshBasicMaterial({ color: 0xd6ffe0, toneMapped: false });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x5ecf9c,
      emissive: 0x174f38,
      emissiveIntensity: 1.15,
      metalness: .08,
      roughness: .12,
      transparent: true,
      opacity: .72,
      flatShading: true
    });

    const lowerHull = this.mesh(new THREE.CylinderGeometry(.34, .5, .16, 18), darkMetal, 0, -.04, 0, ufo);
    lowerHull.castShadow = true;
    const upperHull = this.mesh(new THREE.CylinderGeometry(.32, .48, .15, 18), silver, 0, .08, 0, ufo);
    upperHull.castShadow = true;
    this.mesh(new THREE.TorusGeometry(.43, .055, 7, 24), darkMetal, 0, .035, 0, ufo).rotation.x = Math.PI / 2;
    this.mesh(new THREE.TorusGeometry(.36, .022, 6, 24), greenGlow, 0, -.055, 0, ufo).rotation.x = Math.PI / 2;

    const dome = this.mesh(new THREE.SphereGeometry(.29, 16, 10, 0, Math.PI * 2, 0, Math.PI * .55), glass, 0, .14, 0, ufo);
    dome.scale.set(1, .78, 1);
    dome.castShadow = false;
    this.mesh(new THREE.TorusGeometry(.29, .025, 7, 22), silver, 0, .14, 0, ufo).rotation.x = Math.PI / 2;

    const antenna = this.mesh(new THREE.CylinderGeometry(.012, .018, .24, 7), silver, 0, .48, 0, ufo);
    antenna.rotation.z = -.14;
    this.mesh(new THREE.SphereGeometry(.045, 8, 6), paleGlow, -.017, .6, 0, ufo);

    const lightRing = new THREE.Group();
    ufo.add(lightRing);
    const lights = [];
    for (let index = 0; index < 10; index++) {
      const angle = index / 10 * Math.PI * 2;
      const lamp = this.mesh(new THREE.SphereGeometry(.035, 8, 6), index % 2 ? greenGlow : paleGlow, Math.cos(angle) * .43, -.075, Math.sin(angle) * .43, lightRing);
      lamp.castShadow = false;
      lights.push(lamp);
    }

    const emitter = this.mesh(new THREE.CylinderGeometry(.11, .16, .09, 12), darkMetal, 0, -.17, 0, ufo);
    emitter.castShadow = true;
    const emitterCore = this.mesh(new THREE.SphereGeometry(.075, 10, 7), greenGlow, 0, -.225, 0, ufo);
    emitterCore.scale.y = .55;
    emitterCore.castShadow = false;
    const glow = new THREE.PointLight(0x52ff78, 2.6, 3.1, 2);
    glow.position.set(0, -.16, 0);
    ufo.add(glow);

    group.userData.ufoBody = ufo;
    group.userData.ufoDome = dome;
    group.userData.ufoLightRing = lightRing;
    group.userData.ufoLights = lights;
    group.userData.ufoEmitter = emitter;
    group.userData.ufoGlow = glow;
  }

  buildGoldMine(group) {
    const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x17140f, roughness: 1, flatShading: true });
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x65513a, roughness: 1, flatShading: true });
    const mound = this.mesh(new THREE.DodecahedronGeometry(.44, 1), earthMat, 0, .35, .04, group);
    mound.scale.set(1.08, .76, .9);
    this.mesh(new THREE.CylinderGeometry(.24, .24, .07, 16), tunnelMat, 0, .36, .38, group).rotation.x = Math.PI / 2;
    this.mesh(new THREE.BoxGeometry(.11, .64, .1), this.mat.lightWood, -.27, .39, .39, group);
    this.mesh(new THREE.BoxGeometry(.11, .64, .1), this.mat.lightWood, .27, .39, .39, group);
    this.mesh(new THREE.BoxGeometry(.68, .12, .12), this.mat.lightWood, 0, .69, .39, group);
    this.mesh(new THREE.BoxGeometry(.72, .035, .14), this.mat.goldDark, 0, .75, .39, group);
    this.mesh(new THREE.BoxGeometry(.05, .05, .72), this.mat.iron, -.13, .1, .56, group);
    this.mesh(new THREE.BoxGeometry(.05, .05, .72), this.mat.iron, .13, .1, .56, group);

    const cart = new THREE.Group();
    cart.position.set(-.38, .12, -.18);
    cart.rotation.y = -.35;
    group.add(cart);
    this.mesh(new THREE.BoxGeometry(.38, .2, .28), this.mat.lightWood, 0, .16, 0, cart);
    for (const x of [-.16, .16]) {
      const wheel = this.mesh(new THREE.CylinderGeometry(.09, .09, .035, 10), this.mat.iron, x, .06, .15, cart);
      wheel.rotation.x = Math.PI / 2;
    }

    const goldVein = new THREE.Group();
    goldVein.position.set(-.02, .73, .02);
    group.add(goldVein);
    this.mesh(new THREE.OctahedronGeometry(.09, 0), this.mat.gold, 0, 0, 0, goldVein);
    this.mesh(new THREE.OctahedronGeometry(.055, 0), this.mat.gold, .11, -.04, .02, goldVein);
    this.mesh(new THREE.OctahedronGeometry(.05, 0), this.mat.gold, -.1, -.05, -.01, goldVein);
    this.mesh(new THREE.OctahedronGeometry(.055, 0), this.mat.eye, .33, .69, .4, group);
    group.userData.goldVein = goldVein;

    group.userData.workers = [
      this.buildMiningWorker(group, -.38, .48, .18, 0),
      this.buildMiningWorker(group, .4, .46, -.18, 2.1),
      this.buildMiningWorker(group, .34, -.32, 2.5, 4.2)
    ];
  }

  buildTreasureCove(group) {
    const caveRock = new THREE.MeshStandardMaterial({ color: 0x4e4b4a, roughness: .96, flatShading: true });
    const caveRockDark = new THREE.MeshStandardMaterial({ color: 0x302f31, roughness: 1, flatShading: true });
    const caveMouth = new THREE.MeshStandardMaterial({ color: 0x080a0c, roughness: 1, flatShading: true, side: THREE.DoubleSide });
    const mineralMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x65d9d0, emissive: 0x174f52, emissiveIntensity: .85, roughness: .28, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0xbd79e0, emissive: 0x48205f, emissiveIntensity: .82, roughness: .28, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0xefb64f, emissive: 0x6c3e0d, emissiveIntensity: .78, roughness: .3, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0xe96a72, emissive: 0x651c2c, emissiveIntensity: .75, roughness: .3, flatShading: true })
    ];

    const mound = this.mesh(new THREE.DodecahedronGeometry(.56, 1), caveRockDark, 0, .39, .02, group);
    mound.scale.set(1.16, .88, .92);
    mound.receiveShadow = true;
    const mouth = this.mesh(new THREE.CircleGeometry(.3, 14), caveMouth, 0, .36, .53, group);
    mouth.scale.set(.92, 1.16, 1);

    const archStones = [
      [-.34, .33, .5, .18], [-.29, .57, .49, .17], [-.14, .73, .47, .16],
      [.08, .78, .46, .16], [.27, .66, .48, .17], [.35, .43, .5, .18]
    ];
    for (const [x, y, z, size] of archStones) {
      const rock = this.mesh(new THREE.DodecahedronGeometry(size, 0), caveRock, x, y, z, group);
      rock.scale.set(1.05, .82, .8);
      rock.rotation.set(x * .7, y * .35, z * .3);
    }

    this.mesh(new THREE.BoxGeometry(.7, .075, .55), this.mat.lightWood, 0, .08, .53, group);
    for (const x of [-.25, 0, .25]) this.mesh(new THREE.BoxGeometry(.055, .035, .62), this.mat.iron, x, .13, .53, group);

    const mineralSpecs = [
      [-.48, .42, .24, .1, .34, -.35, 0], [-.35, .58, -.12, .075, .26, .22, 1],
      [.47, .46, .08, .095, .32, .3, 2], [.34, .66, -.2, .065, .23, -.28, 3],
      [-.25, .16, .58, .07, .25, -.18, 1], [.28, .17, .6, .07, .24, .2, 0]
    ];
    const minerals = mineralSpecs.map(([x, y, z, radius, height, lean, materialIndex], index) => {
      const crystal = this.mesh(new THREE.ConeGeometry(radius, height, 5), mineralMaterials[materialIndex], x, y, z, group);
      crystal.rotation.z = lean;
      crystal.rotation.y = index * .9;
      crystal.userData.baseY = y;
      return crystal;
    });
    group.userData.coveMinerals = minerals;
    group.userData.treasureCove = true;

    group.userData.workers = [
      this.buildMiningWorker(group, -.48, .44, .32, 0),
      this.buildMiningWorker(group, .49, .42, -.3, 1.6),
      this.buildMiningWorker(group, -.43, -.28, 2.3, 3.1)
    ];
  }

  buildMiningWorker(parent, x, z, rotation, phase) {
    const worker = new THREE.Group();
    worker.position.set(x, .09, z);
    worker.rotation.y = rotation;
    worker.scale.setScalar(.72);
    parent.add(worker);
    this.mesh(new THREE.CylinderGeometry(.075, .1, .25, 7), this.mat.cloth, 0, .18, 0, worker);
    this.mesh(new THREE.SphereGeometry(.085, 10, 7), new THREE.MeshStandardMaterial({ color: 0xc99a6b, roughness: .9, flatShading: true }), 0, .38, .015, worker);
    this.mesh(new THREE.ConeGeometry(.12, .12, 8), this.mat.gold, 0, .48, 0, worker);
    const pickaxe = new THREE.Group();
    pickaxe.position.set(.11, .29, .03);
    worker.add(pickaxe);
    this.mesh(new THREE.CylinderGeometry(.014, .014, .42, 6), this.mat.wood, 0, 0, 0, pickaxe);
    const head = this.mesh(new THREE.BoxGeometry(.22, .035, .045), this.mat.iron, 0, .2, 0, pickaxe);
    head.rotation.z = 0;
    worker.userData.pickaxe = pickaxe;
    worker.userData.phase = phase;
    worker.visible = false;
    return worker;
  }

  syncKnights(knights) {
    const now = performance.now() * .001;
    const live = new Set(knights);
    for (const [knight, group] of this.knightMeshes) {
      if (!live.has(knight)) {
        this.scene.remove(group);
        this.knightMeshes.delete(knight);
        const bar = this.knightBars.get(knight);
        if (bar) {
          this.scene.remove(bar);
          bar.userData.texture.dispose();
          bar.material.dispose();
        }
        this.knightBars.delete(knight);
      }
    }
    for (const knight of knights) {
      let group = this.knightMeshes.get(knight);
      if (!group) {
        group = this.createKnight(knight.unitType || "knight");
        this.knightMeshes.set(knight, group);
        this.scene.add(group);
        const bar = this.createHealthBar(knight.unitType || "knight");
        this.knightBars.set(knight, bar);
        this.scene.add(bar);
      }
      const bar = this.knightBars.get(knight);
      group.visible = knight.alive;
      bar.visible = knight.alive && this.showHealthBars;
      if (!knight.alive) continue;
      const p = this.worldFromGame(knight.x, knight.y);
      if (knight.unitType === "togga") {
        const stride = Math.sin(now * 7.2 + knight.phase);
        const walking = knight.moving && !knight.clashing;
        const bob = walking ? Math.abs(stride) * .025 : Math.sin(now * 2.1 + knight.phase) * .006;
        const poundProgress = knight.groundPound > 0 ? 1 - knight.groundPound / .72 : 0;
        const pound = knight.groundPound > 0 ? Math.sin(THREE.MathUtils.clamp(poundProgress, 0, 1) * Math.PI) : 0;
        group.position.set(p.x, .035 + bob - pound * .035, p.z);
        group.rotation.y = Math.PI / 2 - knight.angle;
        group.rotation.z = walking ? stride * .045 : 0;
        group.scale.setScalar(.64 * (knight.hitFlash > 0 ? 1.07 : 1));
        group.userData.ogreLeftLeg.rotation.x = walking ? -.68 + stride * .35 : -.68;
        group.userData.ogreRightLeg.rotation.x = walking ? -.68 - stride * .35 : -.68;
        group.userData.ogreLeftArm.rotation.x = -.54 - pound * 1.3;
        group.userData.ogreRightArm.rotation.x = -.54 - pound * 1.3;
        group.userData.ogreLeftForearm.rotation.x = -.82 - pound * .55;
        group.userData.ogreRightForearm.rotation.x = -.82 - pound * .55;
        group.userData.playerOgre.rotation.z = -Math.sin(poundProgress * Math.PI * 2) * .08;
        group.userData.ogreTorso.scale.y = 1.18 - pound * .08;
        bar.position.set(p.x, 1.08 + bob, p.z);
        this.updateHealthBar(bar, knight.hp / knight.maxHp);
        continue;
      }
      const strideRate = knight.unitType === "zombie" ? 6.5 : knight.unitType === "gladiator" ? 10 : knight.unitType === "vampireMinion" ? 12 : 11;
      const stride = Math.sin(now * strideRate + knight.phase);
      const walking = knight.moving && !knight.clashing;
      const bob = walking ? Math.abs(stride) * .0175 : Math.sin(now * 2.6 + knight.phase) * .004;
      group.position.set(p.x, .035 + bob, p.z);
      group.rotation.y = Math.PI / 2 - knight.angle;
      group.rotation.z = walking ? stride * .035 : 0;
      const unitScale = (knight.unitType === "gladiator" ? 1.14 : knight.unitType === "zombie" ? .94 : knight.unitType === "vampireMinion" ? .96 : 1) * .5;
      group.scale.setScalar(unitScale * (knight.hitFlash > 0 ? 1.08 : 1));
      group.userData.leftLeg.rotation.x = walking ? stride * .72 : 0;
      group.userData.rightLeg.rotation.x = walking ? -stride * .72 : 0;
      if (knight.unitType === "zombie") {
        group.userData.leftArm.rotation.x = -.82 + (walking ? -stride * .18 : 0);
        group.userData.rightArm.rotation.x = -.7 + (walking ? stride * .18 : 0);
        const evolved = Boolean(knight.owner?.evolvedBoomers);
        group.userData.boomerGlow.visible = evolved;
        if (evolved) {
          group.userData.boomerGlow.rotation.y = now * 1.4 + knight.phase;
          group.userData.boomerGlow.scale.setScalar(1 + Math.sin(now * 6 + knight.phase) * .08);
          group.userData.boomerLight.intensity = 2.4 + Math.sin(now * 9 + knight.phase) * .9;
        }
      } else {
        group.userData.leftArm.rotation.x = walking ? -stride * .48 : knight.clashing ? -.72 : 0;
        group.userData.rightArm.rotation.x = walking ? stride * .48 : knight.clashing ? -.42 : 0;
      }
      group.userData.leftArm.rotation.z = knight.clashing ? -.18 : 0;
      group.userData.rightArm.rotation.z = knight.clashing ? -.14 : 0;
      if (knight.swing > 0) {
        const progress = 1 - knight.swing / .34;
        const strike = Math.sin(THREE.MathUtils.clamp(progress, 0, 1) * Math.PI);
        group.userData.rightArm.rotation.x = -.45 - strike * 1.7;
        group.userData.torso.rotation.y = -.22 * strike;
      } else {
        group.userData.torso.rotation.y = 0;
      }
      const barHeight = knight.unitType === "gladiator" ? .64 : knight.unitType === "zombie" ? .52 : knight.unitType === "vampireMinion" ? .55 : .57;
      bar.position.set(p.x, barHeight + bob, p.z);
      this.updateHealthBar(bar, knight.hp / knight.maxHp);
    }
  }

  createKnight(unitType = "knight") {
    const group = new THREE.Group();
    if (unitType === "togga") {
      this.buildToggaWarrior(group);
      return group;
    }
    const isZombie = unitType === "zombie";
    const isGladiator = unitType === "gladiator";
    const isVampireMinion = unitType === "vampireMinion";
    const blue = new THREE.MeshStandardMaterial({ color: 0x315f7d, roughness: .72, flatShading: true });
    const crimson = new THREE.MeshStandardMaterial({ color: 0x8f2925, roughness: .72, flatShading: true });
    const bronze = new THREE.MeshStandardMaterial({ color: 0xa86f2b, roughness: .42, metalness: .48, flatShading: true });
    const zombieCloth = new THREE.MeshStandardMaterial({ color: 0x4d4934, roughness: 1, flatShading: true });
    const vampireBlack = new THREE.MeshStandardMaterial({ color: 0x1b171d, roughness: .86, flatShading: true });
    const vampirePale = new THREE.MeshStandardMaterial({ color: 0xdfcec7, roughness: .8, flatShading: true });
    const vampireEyes = new THREE.MeshBasicMaterial({ color: 0xff2748, toneMapped: false });
    const skin = new THREE.MeshStandardMaterial({ color: isZombie ? 0x72805a : isVampireMinion ? 0xdfcec7 : 0xc99a72, roughness: .9, flatShading: true });
    const bodyMaterial = isZombie ? zombieCloth : isVampireMinion ? crimson : isGladiator ? crimson : blue;
    const armorMaterial = isVampireMinion ? vampireBlack : isGladiator ? bronze : this.mat.goldDark;
    const limbMaterial = isZombie ? skin : isVampireMinion ? vampireBlack : isGladiator ? bronze : this.mat.iron;
    const torso = new THREE.Group();
    group.add(torso);
    this.mesh(new THREE.CylinderGeometry(.11, .14, .34, 8), bodyMaterial, 0, .36, 0, torso);
    if (isZombie) {
      const tornPatch = this.mesh(new THREE.BoxGeometry(.19, .16, .04), this.mat.cloth, -.025, .39, .11, torso);
      tornPatch.rotation.z = -.18;
    } else if (isVampireMinion) {
      const vest = this.mesh(new THREE.BoxGeometry(.2, .21, .045), vampireBlack, 0, .4, .108, torso);
      vest.rotation.z = -.05;
      const cape = this.mesh(new THREE.ConeGeometry(.2, .45, 5), vampireBlack, 0, .4, -.11, torso);
      cape.scale.z = .34;
      this.mesh(new THREE.BoxGeometry(.055, .22, .025), this.mat.bone, 0, .4, .138, torso);
    } else {
      this.mesh(new THREE.BoxGeometry(.22, .19, .045), armorMaterial, 0, .4, .105, torso);
      this.mesh(new THREE.BoxGeometry(.12, .12, .052), this.mat.gold, 0, .4, .135, torso).rotation.z = Math.PI / 4;
      for (const x of [-.145, .145]) this.mesh(new THREE.DodecahedronGeometry(.07, 0), armorMaterial, x, .5, 0, torso).scale.set(1.15, .62, .88);
    }
    this.mesh(new THREE.SphereGeometry(.105, 10, 8), skin, 0, .62, .015, torso);
    if (isZombie) {
      this.addEyes(torso, .04, .635, .105, .018, 0xa7da72);
      const jaw = this.mesh(new THREE.BoxGeometry(.11, .06, .07), skin, .015, .54, .08, torso);
      jaw.rotation.z = .13;
      for (const x of [-.11, .09]) this.mesh(new THREE.BoxGeometry(.035, .12, .035), this.mat.bone, x, .72, 0, torso).rotation.z = x * 1.8;
    } else if (isVampireMinion) {
      this.addEyes(torso, .04, .635, .105, .018, 0xff2748);
      const hair = this.mesh(new THREE.SphereGeometry(.115, 9, 6, 0, Math.PI * 2, 0, Math.PI * .54), vampireBlack, 0, .68, -.01, torso);
      hair.scale.y = .7;
      for (const side of [-1, 1]) {
        const ear = this.mesh(new THREE.ConeGeometry(.025, .09, 5), vampirePale, side * .11, .625, 0, torso);
        ear.rotation.z = side * -Math.PI / 2;
        const fang = this.mesh(new THREE.ConeGeometry(.008, .055, 5), this.mat.bone, side * .026, .565, .105, torso);
        fang.rotation.z = Math.PI;
      }
      const eyeLight = this.mesh(new THREE.SphereGeometry(.018, 7, 5), vampireEyes, 0, .635, .112, torso);
      eyeLight.scale.set(3.2, .65, .35);
    } else {
      this.mesh(new THREE.SphereGeometry(.125, 10, 7, 0, Math.PI * 2, 0, Math.PI * .62), isGladiator ? bronze : this.mat.iron, 0, .67, .005, torso);
      this.mesh(new THREE.BoxGeometry(.19, .045, .025), isGladiator ? bronze : this.mat.iron, 0, .62, .11, torso);
      const plume = this.mesh(new THREE.ConeGeometry(isGladiator ? .055 : .035, isGladiator ? .27 : .19, 6), isGladiator ? crimson : blue, 0, isGladiator ? .88 : .83, -.015, torso);
      plume.rotation.x = -.18;
    }

    const leftLeg = this.addJointedLimb(group, -.075, .22, 0, .25, .04, limbMaterial);
    const rightLeg = this.addJointedLimb(group, .075, .22, 0, .25, .04, limbMaterial);
    this.mesh(new THREE.BoxGeometry(.09, .05, .13), limbMaterial, 0, -.24, .035, leftLeg);
    this.mesh(new THREE.BoxGeometry(.09, .05, .13), limbMaterial, 0, -.24, .035, rightLeg);
    const leftArm = this.addJointedLimb(group, -.14, .52, 0, .28, .035, isZombie ? skin : bodyMaterial);
    const rightArm = this.addJointedLimb(group, .14, .52, 0, .28, .035, isZombie ? skin : bodyMaterial);

    if (!isZombie && !isVampireMinion) {
      const shield = this.mesh(new THREE.CylinderGeometry(isGladiator ? .155 : .135, isGladiator ? .155 : .135, .035, isGladiator ? 12 : 8), isGladiator ? crimson : blue, 0, -.18, .1, leftArm);
      shield.rotation.x = Math.PI / 2;
      const shieldRim = this.mesh(new THREE.TorusGeometry(isGladiator ? .152 : .132, .014, 5, isGladiator ? 12 : 8), armorMaterial, 0, -.18, .122, leftArm);
      shieldRim.rotation.x = Math.PI / 2;
      this.mesh(new THREE.BoxGeometry(.035, .2, .025), this.mat.gold, 0, -.18, .125, leftArm);
      this.mesh(new THREE.BoxGeometry(.2, .035, .025), this.mat.gold, 0, -.18, .125, leftArm);
    }

    let sword = null;
    if (!isZombie && !isVampireMinion) {
      sword = new THREE.Group();
      sword.position.set(0, -.28, .03);
      sword.rotation.z = -.18;
      rightArm.add(sword);
      const blade = this.mesh(new THREE.BoxGeometry(.035, isGladiator ? .48 : .4, .025), this.mat.iron, 0, .2, 0, sword);
      blade.rotation.z = 0;
      this.mesh(new THREE.BoxGeometry(.16, .035, .04), this.mat.gold, 0, 0, 0, sword);
      this.mesh(new THREE.CylinderGeometry(.025, .025, .13, 6), this.mat.wood, 0, -.08, 0, sword);
    } else if (isVampireMinion) {
      for (const arm of [leftArm, rightArm]) {
        this.mesh(new THREE.SphereGeometry(.045, 8, 6), vampirePale, 0, -.27, .02, arm);
        for (const x of [-.025, 0, .025]) {
          const claw = this.mesh(new THREE.ConeGeometry(.006, .055, 5), vampirePale, x, -.32, .035, arm);
          claw.rotation.x = Math.PI;
        }
      }
    }
    if (isZombie) {
      const boomerGlow = new THREE.Group();
      boomerGlow.visible = false;
      const gooMaterial = new THREE.MeshBasicMaterial({ color: 0x75ff3d, transparent: true, opacity: .78, depthWrite: false, toneMapped: false });
      const ring = this.mesh(new THREE.TorusGeometry(.22, .025, 6, 18), gooMaterial, 0, .3, 0, boomerGlow);
      ring.rotation.x = Math.PI / 2;
      for (const [x, y, z, scale] of [[-.13, .46, .08, .055], [.12, .35, .11, .045], [.08, .63, .08, .038]]) {
        const blister = this.mesh(new THREE.DodecahedronGeometry(scale, 0), gooMaterial, x, y, z, boomerGlow);
        blister.scale.set(1.2, .8, .72);
      }
      const boomerLight = new THREE.PointLight(0x69ff35, 2.5, 1.5, 2);
      boomerLight.position.y = .42;
      boomerGlow.add(boomerLight);
      group.add(boomerGlow);
      group.userData.boomerGlow = boomerGlow;
      group.userData.boomerLight = boomerLight;
    }
    group.userData.torso = torso;
    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;
    group.userData.sword = sword;
    group.userData.vampireMinion = isVampireMinion;
    return group;
  }

  syncEnemies(enemies) {
    const now = performance.now() * .001;
    const live = new Set(enemies);
    for (const [enemy, group] of this.enemyMeshes) {
      if (!live.has(enemy)) {
        this.scene.remove(group);
        this.enemyMeshes.delete(enemy);
        const bar = this.enemyBars.get(enemy);
        if (bar) {
          this.scene.remove(bar);
          bar.userData.texture.dispose();
          bar.material.dispose();
        }
        this.enemyBars.delete(enemy);
      }
    }
    for (const enemy of enemies) {
      let group = this.enemyMeshes.get(enemy);
      if (!group) {
        group = this.createEnemy(enemy.type);
        this.enemyMeshes.set(enemy, group);
        this.scene.add(group);
        const bar = this.createHealthBar(enemy.type);
        this.enemyBars.set(enemy, bar);
        this.scene.add(bar);
      }
      const p = this.worldFromGame(enemy.x, enemy.y);
      const miniatureScale = enemy.isBossMinion ? .55 : 1;
      const renderScale = this.enemyModelScale * (this.config.enemyTypes[enemy.type].modelScale || 1) * miniatureScale;
      const bob = this.animateEnemy(group, enemy, now) * renderScale;
      const throwHeight = enemy.thrown ? enemy.throwArc : 0;
      group.position.set(p.x, .08 + bob + throwHeight, p.z);
      const batCursed = enemy.batFormTimer > 0;
      group.userData.enemyModelRoot.visible = !batCursed;
      group.userData.batForm.visible = batCursed;
      if (batCursed) {
        const flap = Math.sin(now * 14 + enemy.phase) * .72;
        group.userData.batForm.position.y = .18 + Math.sin(now * 5 + enemy.phase) * .08;
        group.userData.batForm.rotation.y = Math.sin(now * 2.2 + enemy.phase) * .18;
        group.userData.batLeftWing.rotation.z = -.15 - flap;
        group.userData.batRightWing.rotation.z = .15 + flap;
      }
      group.rotation.x = enemy.thrown ? enemy.throwSpin : 0;
      if (enemy.thrown) group.rotation.z = enemy.throwSpin * .55;
      if (enemy.blocked) {
        group.rotation.y = Math.PI / 2 - enemy.combatAngle;
      } else {
        const nextIndex = enemy.fearTimer > 0 ? enemy.fearTargetIndex : enemy.pathIndex;
        const next = this.config.pathPoints[nextIndex];
        if (next) {
          const target = this.worldFromGame(next.x, next.y);
          group.rotation.y = Math.atan2(target.x - p.x, target.z - p.z);
        }
      }
      if (group.userData.leftWing) {
        const flapRate = enemy.blocked ? 11 : enemy.moving ? 8 : 3.5;
        const flap = Math.sin(now * flapRate + enemy.phase) * (enemy.blocked ? .42 : .3);
        group.userData.leftWing.rotation.z = -.35 + flap;
        group.userData.rightWing.rotation.z = .35 - flap;
      }
      if (group.userData.blueFlames) {
        group.userData.blueFlames.forEach((flame, index) => {
          const flicker = 1 + Math.sin(now * (7.5 + index * .17) + flame.userData.phase) * .22;
          flame.scale.set(.82 + flicker * .18, flicker, .82 + flicker * .18);
          flame.position.y = flame.userData.baseY + Math.sin(now * 5.2 + flame.userData.phase) * .035;
          flame.rotation.y = now * .8 + flame.userData.phase;
        });
      }
      if (group.userData.fireBreath) {
        const fire = group.userData.fireBreath;
        fire.visible = enemy.fireBreathTimer > 0;
        if (fire.visible) {
          const flare = Math.sin(THREE.MathUtils.clamp(enemy.fireBreathTimer / .8, 0, 1) * Math.PI);
          fire.scale.set(.85 + flare * .35, .85 + flare * .35, .85 + flare * .5);
          fire.rotation.z = Math.sin(now * 24) * .08;
          group.userData.fireOuter.material.opacity = .62 + flare * .28;
          group.userData.fireLight.intensity = 4 + flare * 8;
        }
      }
      if (group.userData.shipSail) group.userData.shipSail.rotation.y = Math.sin(now * 1.8 + enemy.phase) * .045;
      if (group.userData.witchOrb) {
        group.userData.witchOrb.rotation.x = now * 2.8;
        group.userData.witchOrb.rotation.y = now * 3.7;
        group.userData.summonRing.rotation.z = now * .9;
        const summoning = enemy.type === "covenwitch" && enemy.summonsRemaining > 0 && enemy.summonCooldown < .7;
        group.userData.summonRing.scale.setScalar(summoning ? 1.25 + Math.sin(now * 16) * .12 : 1);
      }
      if (group.userData.miniBossAura) group.userData.miniBossAura.rotation.z = now * .45;
      if (group.userData.crownFlame) {
        const pulse = 1 + Math.sin(now * 7 + enemy.phase) * .16;
        group.userData.crownFlame.scale.setScalar(pulse);
      }
      if (group.userData.yetiFrostAura) {
        const throwPulse = enemy.snowballThrowTimer > 0 ? .28 : 0;
        group.userData.yetiFrostAura.rotation.z = now * .35;
        group.userData.yetiFrostAura.scale.setScalar(1 + Math.sin(now * 2.8 + enemy.phase) * .07 + throwPulse);
        group.userData.yetiFrostLight.intensity = 3.5 + Math.sin(now * 4.5 + enemy.phase) * .8 + throwPulse * 8;
        group.userData.yetiBackCrystals.forEach((crystal, index) => crystal.rotation.y = Math.sin(now * 1.2 + index) * .08);
      }
      group.userData.frostRing.visible = enemy.slowTimer > 0;
      group.userData.burnAura.visible = Boolean(enemy.burnEffects?.length);
      if (group.userData.burnAura.visible) {
        group.userData.burnFlames.forEach((flame, index) => {
          const flicker = 1 + Math.sin(now * (10 + index) + flame.userData.phase) * .28;
          flame.scale.set(.82 + flicker * .2, flicker, .82 + flicker * .2);
          flame.position.y = flame.userData.baseY + Math.sin(now * 8 + flame.userData.phase) * .035;
        });
        group.userData.burnLight.intensity = 3.8 + Math.sin(now * 13 + enemy.phase) * 1.6;
      }
      group.userData.shockAura.visible = enemy.shockTimer > 0;
      if (enemy.shockTimer > 0) {
        group.userData.shockAura.rotation.y = now * 7.5 + enemy.phase;
        group.userData.shockAura.rotation.z = Math.sin(now * 12 + enemy.phase) * .15;
        group.userData.shockAura.scale.setScalar(1 + Math.sin(now * 17) * .12);
        group.userData.shockLight.intensity = 3.5 + Math.sin(now * 20) * 1.8;
      }
      group.userData.stunAura.visible = enemy.stunTimer > 0;
      if (enemy.stunTimer > 0) {
        group.userData.stunAura.rotation.y = now * 4.8 + enemy.phase;
        group.userData.stunAura.position.y = .92 + Math.sin(now * 8 + enemy.phase) * .05;
      }
      group.userData.fearAura.visible = enemy.fearTimer > 0;
      if (enemy.fearTimer > 0) {
        group.userData.fearAura.rotation.y = now * 5 + enemy.phase;
        group.userData.fearAura.position.y = 1.02 + Math.sin(now * 5 + enemy.phase) * .08;
      }
      group.userData.possessionAura.visible = enemy.possessionTimer > 0;
      if (enemy.possessionTimer > 0) {
        group.userData.possessionAura.rotation.y = -now * 4.2 + enemy.phase;
        group.userData.possessionAura.position.y = .62 + Math.sin(now * 5.5 + enemy.phase) * .06;
        group.userData.possessionAura.scale.setScalar(1 + Math.sin(now * 7 + enemy.phase) * .12);
      }
      group.scale.setScalar(renderScale * (enemy.hitFlash > 0 ? 1.06 : 1));

      const bar = this.enemyBars.get(enemy);
      bar.visible = this.showHealthBars;
      const barScale = enemy.isBossMinion ? .62 : 1;
      bar.scale.set(bar.userData.baseScale * barScale, bar.userData.baseScale * bar.userData.baseAspect * barScale, 1);
      const height = batCursed ? .82 : this.enemyHeight(enemy.type);
      bar.position.set(p.x, .08 + height * renderScale + .13 + bob + throwHeight, p.z);
      const ratio = THREE.MathUtils.clamp(enemy.hp / enemy.maxHp, 0, 1);
      this.updateHealthBar(bar, ratio);
    }
  }

  createEnemy(type) {
    const group = new THREE.Group();
    const modelRoot = new THREE.Group();
    group.add(modelRoot);
    if (type === "goblin") this.buildGoblin(modelRoot);
    else if (type === "skeleton") this.buildSkeleton(modelRoot);
    else if (type === "orc") this.buildOrc(modelRoot);
    else if (type === "ogre") this.buildOgre(modelRoot);
    else if (type === "dragon") this.buildDragon(modelRoot);
    else if (type === "horseman") this.buildHeadlessHorseman(modelRoot);
    else if (type === "cyclops") this.buildCyclops(modelRoot);
    else if (type === "yeti") this.buildYeti(modelRoot);
    else if (type === "merchant") this.buildMerchant(modelRoot);
    else if (type === "davyjones") this.buildDavyJones(modelRoot);
    else if (type === "moonalpha") this.buildMoonfangAlpha(modelRoot);
    else if (type === "longship") this.buildVikingLongship(modelRoot);
    else if (type === "covenwitch") this.buildCovenWitch(modelRoot);
    else if (type === "riftlord") this.buildRiftOverlord(modelRoot);
    else if (type === "pirate") this.buildPirate(modelRoot);
    else if (type === "werewolf") this.buildWerewolf(modelRoot);
    else if (type === "viking") this.buildViking(modelRoot);
    else if (type === "wraith") this.buildWraith(modelRoot);
    else if (type === "demon") this.buildDemon(modelRoot);
    else this.buildGoblin(modelRoot);
    FantasyArt.enemy(this, modelRoot, type);
    Object.assign(group.userData, modelRoot.userData);
    group.userData.enemyModelRoot = modelRoot;
    this.buildBatForm(group);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.22, .29, 24), new THREE.MeshBasicMaterial({ color: 0x8fe8f4, transparent: true, opacity: .68, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .02;
    ring.visible = false;
    group.add(ring);
    group.userData.frostRing = ring;
    const fearAura = new THREE.Group();
    fearAura.visible = false;
    const fearRing = new THREE.Mesh(new THREE.TorusGeometry(.27, .025, 6, 20), new THREE.MeshBasicMaterial({ color: 0xb8fff1, transparent: true, opacity: .82, depthWrite: false }));
    fearRing.rotation.x = Math.PI / 2;
    fearAura.add(fearRing);
    const fearMaterial = new THREE.MeshBasicMaterial({ color: 0x85decf, transparent: true, opacity: .9, depthWrite: false });
    for (let index = 0; index < 3; index++) {
      const angle = index / 3 * Math.PI * 2;
      const wisp = this.mesh(new THREE.TetrahedronGeometry(.06, 0), fearMaterial, Math.cos(angle) * .3, index % 2 ? .08 : -.06, Math.sin(angle) * .3, fearAura);
      wisp.rotation.z = angle;
    }
    group.add(fearAura);
    group.userData.fearAura = fearAura;
    const stunAura = new THREE.Group();
    stunAura.visible = false;
    const stunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd45b, toneMapped: false, transparent: true, opacity: .96, depthWrite: false });
    for (let index = 0; index < 3; index++) {
      const angle = index / 3 * Math.PI * 2;
      const star = this.mesh(new THREE.OctahedronGeometry(.07, 0), stunMaterial, Math.cos(angle) * .31, 0, Math.sin(angle) * .31, stunAura);
      star.scale.set(1.45, .55, 1.45);
    }
    group.add(stunAura);
    group.userData.stunAura = stunAura;
    const burnAura = new THREE.Group();
    burnAura.visible = false;
    const burnOuter = new THREE.MeshBasicMaterial({ color: 0xff5b20, transparent: true, opacity: .82, depthWrite: false, toneMapped: false });
    const burnInner = new THREE.MeshBasicMaterial({ color: 0xffdc58, transparent: true, opacity: .94, depthWrite: false, toneMapped: false });
    const burnFlames = [];
    for (let index = 0; index < 5; index++) {
      const angle = index / 5 * Math.PI * 2;
      const flame = this.mesh(new THREE.ConeGeometry(.075, .28 + index % 2 * .06, 6), index % 2 ? burnInner : burnOuter, Math.cos(angle) * .24, .2 + index % 2 * .08, Math.sin(angle) * .24, burnAura);
      flame.userData.baseY = flame.position.y;
      flame.userData.phase = index * 1.37;
      burnFlames.push(flame);
    }
    const burnLight = new THREE.PointLight(0xff6428, 4, 2.1, 2);
    burnLight.position.y = .42;
    burnAura.add(burnLight);
    group.add(burnAura);
    group.userData.burnAura = burnAura;
    group.userData.burnFlames = burnFlames;
    group.userData.burnLight = burnLight;
    const shockAura = new THREE.Group();
    shockAura.visible = false;
    const shockMaterial = new THREE.MeshBasicMaterial({ color: 0x72d8ff, transparent: true, opacity: .9, depthWrite: false, toneMapped: false });
    const shockRing = this.mesh(new THREE.TorusGeometry(.31, .025, 5, 18), shockMaterial, 0, .52, 0, shockAura);
    shockRing.rotation.x = Math.PI / 2;
    const shockCrossRing = this.mesh(new THREE.TorusGeometry(.27, .018, 5, 16), shockMaterial, 0, .52, 0, shockAura);
    shockCrossRing.rotation.z = Math.PI / 2;
    for (let index = 0; index < 4; index++) {
      const angle = index / 4 * Math.PI * 2;
      const spark = this.mesh(new THREE.TetrahedronGeometry(.065, 0), shockMaterial, Math.cos(angle) * .34, .52 + (index % 2 ? .18 : -.18), Math.sin(angle) * .34, shockAura);
      spark.rotation.z = angle;
    }
    const shockLight = new THREE.PointLight(0x67cfff, 4, 2.3, 2);
    shockLight.position.y = .55;
    shockAura.add(shockLight);
    group.add(shockAura);
    group.userData.shockAura = shockAura;
    group.userData.shockLight = shockLight;
    const possessionAura = new THREE.Group();
    possessionAura.visible = false;
    const possessionMaterial = new THREE.MeshBasicMaterial({ color: 0xae55ff, transparent: true, opacity: .92, depthWrite: false, toneMapped: false });
    const possessionRing = this.mesh(new THREE.TorusGeometry(.31, .035, 6, 22), possessionMaterial, 0, 0, 0, possessionAura);
    possessionRing.rotation.x = Math.PI / 2;
    for (let index = 0; index < 4; index++) {
      const angle = index / 4 * Math.PI * 2;
      const shard = this.mesh(new THREE.OctahedronGeometry(.055, 0), possessionMaterial, Math.cos(angle) * .35, index % 2 ? .13 : -.1, Math.sin(angle) * .35, possessionAura);
      shard.rotation.z = angle;
    }
    group.add(possessionAura);
    group.userData.possessionAura = possessionAura;
    return group;
  }

  buildBatForm(group) {
    const bat = new THREE.Group();
    bat.visible = false;
    group.add(bat);
    const fur = new THREE.MeshStandardMaterial({ color: 0x171119, roughness: .92, flatShading: true });
    const wing = new THREE.MeshStandardMaterial({ color: 0x301326, roughness: .84, emissive: 0x12040b, emissiveIntensity: .4, flatShading: true, side: THREE.DoubleSide });
    const glow = new THREE.MeshBasicMaterial({ color: 0xff7b29, toneMapped: false });
    const body = this.mesh(new THREE.SphereGeometry(.13, 8, 6), fur, 0, .43, 0, bat);
    body.scale.set(.72, 1.45, .68);
    this.mesh(new THREE.SphereGeometry(.1, 8, 6), fur, 0, .59, .015, bat);
    for (const side of [-1, 1]) {
      const ear = this.mesh(new THREE.ConeGeometry(.035, .13, 4), fur, side * .055, .71, 0, bat);
      ear.rotation.z = side * -.18;
      const eye = this.mesh(new THREE.SphereGeometry(.016, 6, 4), glow, side * .035, .61, .085, bat);
      eye.castShadow = false;
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * .08, .49, 0);
      bat.add(wingPivot);
      const membrane = this.mesh(new THREE.ConeGeometry(.2, .48, 3), wing, side * .19, 0, 0, wingPivot);
      membrane.rotation.z = side * -Math.PI / 2;
      membrane.scale.z = .35;
      group.userData[side < 0 ? "batLeftWing" : "batRightWing"] = wingPivot;
    }
    group.userData.batForm = bat;
  }

  buildMerchant(group) {
    const skin = new THREE.MeshStandardMaterial({ color: 0xc98f68, roughness: .9, flatShading: true });
    const coat = new THREE.MeshStandardMaterial({ color: 0x7d382c, roughness: .88, flatShading: true });
    const coatTrim = new THREE.MeshStandardMaterial({ color: 0xd49a45, roughness: .72, flatShading: true });
    const leather = new THREE.MeshStandardMaterial({ color: 0x4d2d1d, roughness: .94, flatShading: true });
    const packCloth = new THREE.MeshStandardMaterial({ color: 0x315c58, roughness: .9, flatShading: true });
    const hair = new THREE.MeshStandardMaterial({ color: 0x35231d, roughness: 1, flatShading: true });
    const potionBlue = new THREE.MeshStandardMaterial({ color: 0x54bfc9, roughness: .3, emissive: 0x163f47, emissiveIntensity: .65, flatShading: true });
    const parchment = new THREE.MeshStandardMaterial({ color: 0xd8bd79, roughness: .95, flatShading: true });

    const torso = this.mesh(new THREE.CylinderGeometry(.23, .31, .62, 8), coat, 0, .68, 0, group);
    this.mesh(new THREE.BoxGeometry(.52, .075, .34), leather, 0, .58, .015, group);
    this.mesh(new THREE.BoxGeometry(.1, .1, .045), this.mat.gold, 0, .58, .2, group);
    this.mesh(new THREE.BoxGeometry(.12, .4, .05), coatTrim, 0, .78, .2, group);
    const coin = this.mesh(new THREE.CylinderGeometry(.085, .085, .025, 12), this.mat.goldLight, 0, .83, .235, group);
    coin.rotation.x = Math.PI / 2;
    this.mesh(new THREE.TorusGeometry(.055, .012, 5, 12), this.mat.goldDark, 0, .83, .25, group).rotation.x = Math.PI / 2;

    const leftLeg = this.addJointedLimb(group, -.13, .4, 0, .43, .058, leather);
    const rightLeg = this.addJointedLimb(group, .13, .4, 0, .43, .058, leather);
    for (const leg of [leftLeg, rightLeg]) this.mesh(new THREE.BoxGeometry(.12, .08, .2), this.mat.darkStone, 0, -.42, .055, leg);
    const leftArm = this.addJointedLimb(group, -.29, .88, 0, .5, .055, coat);
    const rightArm = this.addJointedLimb(group, .29, .88, 0, .5, .055, coat);
    this.mesh(new THREE.SphereGeometry(.065, 8, 6), skin, 0, -.48, .02, leftArm);
    this.mesh(new THREE.SphereGeometry(.065, 8, 6), skin, 0, -.48, .02, rightArm);

    const head = this.mesh(new THREE.SphereGeometry(.205, 11, 8), skin, 0, 1.15, 0, group);
    head.scale.set(1, 1.05, .92);
    this.addEyes(group, .075, 1.19, .18, .025, 0x2a1b16);
    const nose = this.mesh(new THREE.ConeGeometry(.055, .16, 7), skin, 0, 1.12, .22, group);
    nose.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const moustache = this.mesh(new THREE.ConeGeometry(.04, .17, 6), hair, side * .055, 1.055, .19, group);
      moustache.rotation.z = side * .82;
      moustache.rotation.x = Math.PI / 2;
    }
    const beard = this.mesh(new THREE.ConeGeometry(.14, .34, 7), hair, 0, .98, .04, group);
    beard.rotation.x = Math.PI;

    const hatBrim = this.mesh(new THREE.CylinderGeometry(.3, .3, .055, 10), coatTrim, 0, 1.36, 0, group);
    const hat = this.mesh(new THREE.ConeGeometry(.22, .36, 8), coat, 0, 1.54, 0, group);
    hat.rotation.z = -.14;
    const feather = this.mesh(new THREE.ConeGeometry(.035, .42, 6), this.mat.roofLight, .2, 1.57, 0, group);
    feather.rotation.z = -.72;

    const backpack = new THREE.Group();
    backpack.position.set(0, .82, -.23);
    group.add(backpack);
    this.mesh(new THREE.BoxGeometry(.48, .58, .3), packCloth, 0, 0, 0, backpack);
    this.mesh(new THREE.BoxGeometry(.42, .08, .33), leather, 0, .24, 0, backpack);
    for (const x of [-.17, .17]) this.mesh(new THREE.BoxGeometry(.055, .58, .32), leather, x, 0, 0, backpack);
    const bedroll = this.mesh(new THREE.CylinderGeometry(.13, .13, .54, 9), parchment, 0, .38, -.02, backpack);
    bedroll.rotation.z = Math.PI / 2;
    for (const x of [-.18, .18]) this.mesh(new THREE.TorusGeometry(.13, .014, 5, 10), leather, x, .38, -.02, backpack).rotation.y = Math.PI / 2;

    const pouches = [];
    for (const side of [-1, 1]) {
      const pouch = this.mesh(new THREE.SphereGeometry(.13, 8, 6), leather, side * .29, .52, -.02, group);
      pouch.scale.set(.9, 1.15, .7);
      this.mesh(new THREE.BoxGeometry(.2, .055, .12), coatTrim, side * .29, .63, -.02, group);
      pouches.push(pouch);
    }
    const potion = this.mesh(new THREE.CylinderGeometry(.045, .06, .18, 7), potionBlue, .34, .7, .1, group);
    this.mesh(new THREE.CylinderGeometry(.032, .032, .07, 6), this.mat.goldDark, .34, .82, .1, group);
    const scroll = this.mesh(new THREE.CylinderGeometry(.055, .055, .3, 8), parchment, -.35, .72, .08, group);
    scroll.rotation.z = .25;

    Object.assign(group.userData, {
      torso, leftLeg, rightLeg, leftArm, rightArm, merchantModel: true,
      merchantPack: backpack, merchantPouches: pouches, merchantCoin: coin,
      merchantFeather: feather, merchantPotion: potion, merchantScroll: scroll
    });
  }

  buildDavyJones(group) {
    const seaSkin = new THREE.MeshStandardMaterial({ color: 0x477f76, roughness: .9, emissive: 0x153b37, emissiveIntensity: .38, flatShading: true });
    const captainCoat = new THREE.MeshStandardMaterial({ color: 0x342824, roughness: .84, flatShading: true });
    const barnacle = new THREE.MeshStandardMaterial({ color: 0x9d9674, roughness: 1, flatShading: true });
    const torso = this.mesh(new THREE.CylinderGeometry(.24, .34, .72, 8), captainCoat, 0, .72, 0, group);
    this.mesh(new THREE.BoxGeometry(.52, .08, .33), this.mat.goldDark, 0, .62, .01, group);
    this.mesh(new THREE.SphereGeometry(.25, 12, 9), seaSkin, 0, 1.22, 0, group);
    const brim = this.mesh(new THREE.CylinderGeometry(.36, .36, .06, 3), captainCoat, 0, 1.47, 0, group);
    brim.rotation.y = Math.PI / 2;
    this.mesh(new THREE.CylinderGeometry(.2, .26, .2, 7), captainCoat, 0, 1.55, 0, group);
    this.addEyes(group, .085, 1.27, .22, .032, 0xb8ffd9);
    for (let index = 0; index < 7; index++) {
      const angle = (index / 6 - .5) * 1.5;
      const tentacle = this.mesh(new THREE.ConeGeometry(.035, .48 + (index % 3) * .06, 6), seaSkin, Math.sin(angle) * .18, .93 - Math.abs(angle) * .04, .18 + Math.cos(angle) * .07, group);
      tentacle.rotation.z = -angle * .23;
      tentacle.rotation.x = Math.PI;
    }
    for (const position of [[-.25, 1.05, .05], [.25, .78, -.1], [-.18, .48, .17]]) {
      this.mesh(new THREE.DodecahedronGeometry(.055, 0), barnacle, position[0], position[1], position[2], group);
    }
    const leftLeg = this.addJointedLimb(group, -.13, .39, 0, .43, .065, captainCoat);
    const rightLeg = this.addJointedLimb(group, .13, .39, 0, .43, .065, captainCoat);
    this.mesh(new THREE.CylinderGeometry(.055, .045, .34, 6), this.mat.wood, 0, -.32, 0, rightLeg);
    const leftArm = this.addJointedLimb(group, -.32, .92, 0, .58, .07, seaSkin);
    const rightArm = this.addJointedLimb(group, .32, .92, 0, .58, .07, seaSkin);
    const claw = this.mesh(new THREE.TorusGeometry(.12, .045, 6, 10, Math.PI * 1.45), seaSkin, 0, -.55, .03, leftArm);
    claw.rotation.z = -.65;
    const cutlass = this.mesh(new THREE.BoxGeometry(.05, .68, .035), this.mat.iron, 0, -.38, .04, rightArm);
    cutlass.rotation.z = -.14;
    this.mesh(new THREE.BoxGeometry(.22, .045, .05), this.mat.gold, 0, -.06, .04, rightArm);
    Object.assign(group.userData, { torso, leftLeg, rightLeg, leftArm, rightArm, miniBossModel: "davyjones" });
  }

  buildMoonfangAlpha(group) {
    this.buildWerewolf(group);
    const paleFur = new THREE.MeshStandardMaterial({ color: 0xb8b1a7, roughness: 1, flatShading: true });
    const moonGlow = new THREE.MeshBasicMaterial({ color: 0xbbeaff, toneMapped: false });
    const mane = this.mesh(new THREE.TorusGeometry(.29, .11, 7, 13), paleFur, 0, .92, -.04, group);
    mane.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      this.mesh(new THREE.ConeGeometry(.028, .17, 5), paleFur, side * .21, 1.2, .02, group).rotation.z = side * -.25;
    }
    const rune = this.mesh(new THREE.RingGeometry(.075, .11, 8), moonGlow, 0, 1.03, .2, group);
    const aura = this.mesh(new THREE.RingGeometry(.38, .5, 28), new THREE.MeshBasicMaterial({ color: 0x9fdfff, transparent: true, opacity: .4, side: THREE.DoubleSide, depthWrite: false }), 0, .04, 0, group);
    aura.rotation.x = -Math.PI / 2;
    Object.assign(group.userData, { alphaMane: mane, alphaRune: rune, miniBossAura: aura, miniBossModel: "moonalpha" });
  }

  buildVikingLongship(group) {
    const sail = new THREE.MeshStandardMaterial({ color: 0xa53d35, roughness: .86, side: THREE.DoubleSide, flatShading: true });
    const hull = this.mesh(new THREE.BoxGeometry(.74, .3, 1.42), this.mat.wood, 0, .33, 0, group);
    hull.scale.set(1, .9, 1);
    const keel = this.mesh(new THREE.BoxGeometry(.5, .26, 1.62), this.mat.darkWood || this.mat.wood, 0, .23, 0, group);
    keel.rotation.x = .04;
    for (const side of [-1, 1]) {
      const rail = this.mesh(new THREE.BoxGeometry(.08, .18, 1.48), this.mat.lightWood, side * .39, .48, 0, group);
      for (let index = 0; index < 4; index++) {
        const shield = this.mesh(new THREE.CylinderGeometry(.13, .13, .035, 10), index % 2 ? this.mat.red : this.mat.iron, side * .44, .48, -.52 + index * .35, group);
        shield.rotation.z = Math.PI / 2;
      }
      for (let index = 0; index < 3; index++) {
        const oar = this.mesh(new THREE.BoxGeometry(.035, .035, .86), this.mat.lightWood, side * (.55 + index * .02), .32, -.4 + index * .42, group);
        oar.rotation.y = side * .92;
      }
    }
    this.mesh(new THREE.CylinderGeometry(.035, .045, 1.42, 8), this.mat.wood, 0, 1.12, 0, group);
    const sailPanel = this.mesh(new THREE.BoxGeometry(.92, .72, .035), sail, 0, 1.18, .01, group);
    for (const x of [-.3, 0, .3]) this.mesh(new THREE.BoxGeometry(.035, .72, .05), this.mat.bone, x, 1.18, .02, group);
    const prow = this.mesh(new THREE.ConeGeometry(.13, .7, 7), this.mat.lightWood, 0, .64, .93, group);
    prow.rotation.x = Math.PI / 2;
    const dragonHead = this.mesh(new THREE.SphereGeometry(.16, 9, 7), this.mat.goldDark, 0, .76, 1.18, group);
    dragonHead.scale.set(.72, .9, 1.3);
    for (const side of [-1, 1]) {
      const horn = this.mesh(new THREE.ConeGeometry(.035, .24, 5), this.mat.bone, side * .1, .92, 1.15, group);
      horn.rotation.z = side * -.35;
    }
    Object.assign(group.userData, { longshipHull: hull, shipSail: sailPanel, miniBossModel: "longship" });
  }

  buildCovenWitch(group) {
    const witchCloth = new THREE.MeshStandardMaterial({ color: 0x493366, roughness: .84, emissive: 0x1b1029, emissiveIntensity: .4, flatShading: true });
    const witchSkin = new THREE.MeshStandardMaterial({ color: 0x879b68, roughness: .94, flatShading: true });
    const magic = new THREE.MeshBasicMaterial({ color: 0xaef9e5, transparent: true, opacity: .94, toneMapped: false });
    const dress = this.mesh(new THREE.ConeGeometry(.32, .92, 8), witchCloth, 0, .55, 0, group);
    this.mesh(new THREE.SphereGeometry(.18, 11, 8), witchSkin, 0, 1.13, 0, group);
    const nose = this.mesh(new THREE.ConeGeometry(.035, .2, 5), witchSkin, 0, 1.08, .18, group);
    nose.rotation.x = Math.PI / 2;
    this.addEyes(group, .057, 1.17, .15, .024, 0xb7ffec);
    this.mesh(new THREE.CylinderGeometry(.32, .32, .055, 12), witchCloth, 0, 1.34, 0, group);
    const hat = this.mesh(new THREE.ConeGeometry(.23, .72, 8), witchCloth, 0, 1.67, 0, group);
    hat.rotation.z = -.14;
    const leftLeg = new THREE.Group(); const rightLeg = new THREE.Group();
    leftLeg.position.set(-.1, .3, 0); rightLeg.position.set(.1, .3, 0); group.add(leftLeg, rightLeg);
    const leftArm = this.addJointedLimb(group, -.28, .9, 0, .52, .05, witchSkin);
    const rightArm = this.addJointedLimb(group, .28, .9, 0, .52, .05, witchSkin);
    const staff = this.mesh(new THREE.CylinderGeometry(.025, .035, 1.45, 7), this.mat.wood, 0, -.22, 0, rightArm);
    staff.rotation.z = -.12;
    const orb = this.mesh(new THREE.IcosahedronGeometry(.11, 1), magic, .08, -.88, .02, rightArm);
    const light = new THREE.PointLight(0x88ead6, 3.2, 2.6, 2);
    light.position.copy(orb.position); rightArm.add(light);
    const summonRing = this.mesh(new THREE.RingGeometry(.35, .47, 26), new THREE.MeshBasicMaterial({ color: 0x9cf3df, transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite: false }), 0, .04, 0, group);
    summonRing.rotation.x = -Math.PI / 2;
    Object.assign(group.userData, { dress, leftLeg, rightLeg, leftArm, rightArm, witchOrb: orb, summonRing, miniBossModel: "covenwitch" });
  }

  buildRiftOverlord(group) {
    this.buildDemon(group);
    const infernalArmor = new THREE.MeshStandardMaterial({ color: 0x29131a, roughness: .5, metalness: .55, emissive: 0x4b1018, emissiveIntensity: .6, flatShading: true });
    const fire = new THREE.MeshBasicMaterial({ color: 0xff6b32, toneMapped: false });
    this.mesh(new THREE.BoxGeometry(.72, .22, .45), infernalArmor, 0, 1.08, 0, group);
    for (const side of [-1, 1]) {
      const shoulder = this.mesh(new THREE.DodecahedronGeometry(.24, 0), infernalArmor, side * .43, 1.06, 0, group);
      shoulder.scale.set(1.25, .72, 1);
      const greaterHorn = this.mesh(new THREE.ConeGeometry(.08, .62, 7), infernalArmor, side * .24, 1.62, -.03, group);
      greaterHorn.rotation.z = side * -.38;
    }
    const crownFlame = this.mesh(new THREE.IcosahedronGeometry(.13, 1), fire, 0, 1.55, .08, group);
    const core = this.mesh(new THREE.IcosahedronGeometry(.14, 1), fire, 0, .9, .28, group);
    const light = new THREE.PointLight(0xff512c, 5, 3.4, 2);
    light.position.set(0, 1.02, .2); group.add(light);
    const aura = this.mesh(new THREE.RingGeometry(.45, .62, 30), new THREE.MeshBasicMaterial({ color: 0xff552d, transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite: false }), 0, .04, 0, group);
    aura.rotation.x = -Math.PI / 2;
    Object.assign(group.userData, { overlordCore: core, crownFlame, miniBossAura: aura, miniBossModel: "riftlord" });
  }

  buildPirate(group) {
    const coat = new THREE.MeshStandardMaterial({ color: 0x8f302d, roughness: .82, flatShading: true });
    const skin = new THREE.MeshStandardMaterial({ color: 0xb9825a, roughness: .9, flatShading: true });
    const navy = new THREE.MeshStandardMaterial({ color: 0x26384c, roughness: .78, flatShading: true });
    const torso = this.mesh(new THREE.CylinderGeometry(.16, .22, .48, 7), coat, 0, .53, 0, group);
    this.mesh(new THREE.BoxGeometry(.34, .055, .23), this.mat.goldDark, 0, .46, .01, group);
    this.mesh(new THREE.SphereGeometry(.16, 11, 8), skin, 0, .84, 0, group);
    this.mesh(new THREE.CylinderGeometry(.235, .235, .045, 3), navy, 0, 1.01, 0, group).rotation.y = Math.PI / 2;
    this.mesh(new THREE.CylinderGeometry(.14, .18, .16, 6), navy, 0, 1.07, 0, group);
    this.addEyes(group, .055, .87, .145, .022, 0xe7ca75);
    const patch = this.mesh(new THREE.BoxGeometry(.09, .07, .025), this.mat.darkStone, -.055, .87, .157, group);
    patch.rotation.z = -.14;
    const leftLeg = this.addJointedLimb(group, -.09, .31, 0, .32, .045, navy);
    const rightLeg = this.addJointedLimb(group, .09, .31, 0, .32, .045, navy);
    this.mesh(new THREE.BoxGeometry(.13, .1, .23), this.mat.wood, -.0, -.29, .06, leftLeg);
    this.mesh(new THREE.CylinderGeometry(.045, .035, .28, 6), this.mat.wood, 0, -.18, 0, rightLeg);
    const leftArm = this.addJointedLimb(group, -.19, .68, 0, .39, .045, coat);
    const rightArm = this.addJointedLimb(group, .19, .68, 0, .39, .045, coat);
    const cutlass = this.mesh(new THREE.BoxGeometry(.035, .48, .025), this.mat.iron, 0, -.24, .03, rightArm);
    cutlass.rotation.z = -.16;
    this.mesh(new THREE.BoxGeometry(.17, .035, .04), this.mat.gold, 0, -.02, .03, rightArm);
    Object.assign(group.userData, { torso, leftLeg, rightLeg, leftArm, rightArm, eventModel: "pirate" });
  }

  buildWerewolf(group) {
    const fur = new THREE.MeshStandardMaterial({ color: 0x5e5854, roughness: 1, flatShading: true });
    const darkFur = new THREE.MeshStandardMaterial({ color: 0x343434, roughness: 1, flatShading: true });
    const torso = this.mesh(new THREE.SphereGeometry(.27, 10, 8), fur, 0, .65, 0, group);
    torso.scale.set(.92, 1.25, .75);
    const head = this.mesh(new THREE.SphereGeometry(.2, 10, 7), fur, 0, .98, .04, group);
    head.scale.set(.88, 1, .86);
    const muzzle = this.mesh(new THREE.ConeGeometry(.11, .28, 6), darkFur, 0, .91, .18, group);
    muzzle.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const ear = this.mesh(new THREE.ConeGeometry(.07, .25, 5), darkFur, side * .13, 1.18, 0, group);
      ear.rotation.z = side * -.17;
      const fang = this.mesh(new THREE.ConeGeometry(.018, .1, 5), this.mat.bone, side * .05, .88, .3, group);
      fang.rotation.x = Math.PI;
    }
    this.addEyes(group, .065, 1.02, .19, .027, 0xffb43c);
    const leftLeg = this.addJointedLimb(group, -.13, .43, 0, .46, .065, fur);
    const rightLeg = this.addJointedLimb(group, .13, .43, 0, .46, .065, fur);
    leftLeg.rotation.x = -.18;
    rightLeg.rotation.x = -.18;
    const leftArm = this.addJointedLimb(group, -.26, .78, .03, .55, .06, darkFur);
    const rightArm = this.addJointedLimb(group, .26, .78, .03, .55, .06, darkFur);
    leftArm.rotation.z = -.2;
    rightArm.rotation.z = .2;
    for (const arm of [leftArm, rightArm]) {
      for (const x of [-.035, 0, .035]) {
        const claw = this.mesh(new THREE.ConeGeometry(.012, .11, 5), this.mat.bone, x, -.55, .035, arm);
        claw.rotation.x = Math.PI;
      }
    }
    const tail = this.mesh(new THREE.ConeGeometry(.09, .6, 7), darkFur, 0, .47, -.28, group);
    tail.rotation.x = -Math.PI / 2;
    Object.assign(group.userData, { torso, leftLeg, rightLeg, leftArm, rightArm, tail, eventModel: "werewolf" });
  }

  buildViking(group) {
    const tunic = new THREE.MeshStandardMaterial({ color: 0x41697d, roughness: .86, flatShading: true });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc08d65, roughness: .9, flatShading: true });
    const torso = this.mesh(new THREE.CylinderGeometry(.17, .24, .54, 7), tunic, 0, .56, 0, group);
    this.mesh(new THREE.TorusGeometry(.19, .035, 6, 12), this.mat.iron, 0, .55, 0, group).rotation.x = Math.PI / 2;
    this.mesh(new THREE.SphereGeometry(.17, 11, 8), skin, 0, .91, 0, group);
    this.mesh(new THREE.SphereGeometry(.185, 10, 7, 0, Math.PI * 2, 0, Math.PI * .55), this.mat.iron, 0, .96, 0, group);
    for (const side of [-1, 1]) {
      const horn = this.mesh(new THREE.ConeGeometry(.045, .27, 6), this.mat.bone, side * .2, 1.07, 0, group);
      horn.rotation.z = side * -1.08;
    }
    this.addEyes(group, .057, .93, .15, .022, 0xdce9e8);
    const beard = this.mesh(new THREE.ConeGeometry(.13, .32, 7), this.mat.goldDark, 0, .77, .1, group);
    beard.rotation.x = .08;
    const leftLeg = this.addJointedLimb(group, -.1, .3, 0, .34, .05, tunic);
    const rightLeg = this.addJointedLimb(group, .1, .3, 0, .34, .05, tunic);
    const leftArm = this.addJointedLimb(group, -.21, .7, 0, .42, .055, skin);
    const rightArm = this.addJointedLimb(group, .21, .7, 0, .42, .055, skin);
    const shield = this.mesh(new THREE.CylinderGeometry(.22, .22, .055, 12), this.mat.wood, 0, -.28, .08, leftArm);
    shield.rotation.x = Math.PI / 2;
    this.mesh(new THREE.CylinderGeometry(.065, .065, .065, 9), this.mat.iron, 0, -.28, .12, leftArm).rotation.x = Math.PI / 2;
    this.mesh(new THREE.CylinderGeometry(.025, .025, .52, 7), this.mat.wood, 0, -.22, 0, rightArm);
    const axe = this.mesh(new THREE.ConeGeometry(.12, .27, 4), this.mat.iron, .09, -.43, 0, rightArm);
    axe.rotation.z = -Math.PI / 2;
    Object.assign(group.userData, { torso, leftLeg, rightLeg, leftArm, rightArm, eventModel: "viking" });
  }

  buildWraith(group) {
    const spectral = new THREE.MeshStandardMaterial({ color: 0x83c8bd, roughness: .42, emissive: 0x2b716a, emissiveIntensity: 1.15, transparent: true, opacity: .86, flatShading: true, depthWrite: false });
    const dark = new THREE.MeshStandardMaterial({ color: 0x315b59, roughness: .56, emissive: 0x173e3c, emissiveIntensity: .75, transparent: true, opacity: .9, flatShading: true, depthWrite: false });
    const shroud = this.mesh(new THREE.ConeGeometry(.34, .9, 8, 1, true), spectral, 0, .55, 0, group);
    this.mesh(new THREE.SphereGeometry(.25, 11, 8, 0, Math.PI * 2, 0, Math.PI * .72), dark, 0, 1.02, 0, group);
    this.addEyes(group, .07, 1.04, .18, .032, 0xb9fff1);
    for (const x of [-.22, 0, .22]) {
      const streamer = this.mesh(new THREE.ConeGeometry(.11, .52, 6), spectral, x, .13 + Math.abs(x) * .18, 0, group);
      streamer.rotation.x = Math.PI;
    }
    const leftLeg = new THREE.Group();
    const rightLeg = new THREE.Group();
    leftLeg.position.set(-.12, .28, 0); rightLeg.position.set(.12, .28, 0);
    group.add(leftLeg, rightLeg);
    const leftArm = this.addJointedLimb(group, -.28, .75, 0, .54, .045, spectral);
    const rightArm = this.addJointedLimb(group, .28, .75, 0, .54, .045, spectral);
    leftArm.rotation.z = -.55;
    rightArm.rotation.z = .55;
    Object.assign(group.userData, { shroud, leftLeg, rightLeg, leftArm, rightArm, eventModel: "wraith" });
  }

  buildDemon(group) {
    const hide = new THREE.MeshStandardMaterial({ color: 0x9d3540, roughness: .78, emissive: 0x3d0e16, emissiveIntensity: .48, flatShading: true });
    const darkHide = new THREE.MeshStandardMaterial({ color: 0x461c25, roughness: .86, flatShading: true });
    const torso = this.mesh(new THREE.SphereGeometry(.3, 11, 8), hide, 0, .69, 0, group);
    torso.scale.set(.9, 1.24, .74);
    this.mesh(new THREE.SphereGeometry(.2, 11, 8), hide, 0, 1.08, 0, group);
    for (const side of [-1, 1]) {
      const horn = this.mesh(new THREE.ConeGeometry(.055, .38, 6), darkHide, side * .16, 1.3, 0, group);
      horn.rotation.z = side * -.34;
    }
    this.addEyes(group, .065, 1.1, .18, .03, 0xff733d);
    const leftLeg = this.addJointedLimb(group, -.14, .43, 0, .48, .075, hide);
    const rightLeg = this.addJointedLimb(group, .14, .43, 0, .48, .075, hide);
    const leftArm = this.addJointedLimb(group, -.29, .84, 0, .57, .07, hide);
    const rightArm = this.addJointedLimb(group, .29, .84, 0, .57, .07, hide);
    const wingGeometry = new THREE.BufferGeometry();
    wingGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0,0,0, -.5,.2,-.04, -.44,-.42,.05, -.14,-.22,.03], 3));
    wingGeometry.setIndex([0,1,2,0,2,3]);
    wingGeometry.computeVertexNormals();
    const leftWing = new THREE.Mesh(wingGeometry, darkHide);
    leftWing.position.set(-.16, .92, -.1); leftWing.castShadow = true; group.add(leftWing);
    const rightWing = leftWing.clone(); rightWing.scale.x = -1; rightWing.position.x = .16; group.add(rightWing);
    const tail = this.mesh(new THREE.ConeGeometry(.07, .72, 7), darkHide, 0, .46, -.35, group);
    tail.rotation.x = -Math.PI / 2;
    Object.assign(group.userData, { torso, leftLeg, rightLeg, leftArm, rightArm, leftWing, rightWing, tail, eventModel: "demon" });
  }

  buildGoblin(group) {
    this.mesh(new THREE.ConeGeometry(.19, .42, 6), this.mat.cloth, 0, .34, 0, group);
    this.mesh(new THREE.TorusGeometry(.14, .025, 5, 10), this.mat.wood, 0, .38, 0, group).rotation.x = Math.PI / 2;
    this.mesh(new THREE.BoxGeometry(.075, .075, .035), this.mat.goldDark, 0, .38, .145, group);
    this.mesh(new THREE.SphereGeometry(.16, 12, 8), this.mat.goblin, 0, .61, .01, group);
    const leftEar = this.mesh(new THREE.ConeGeometry(.07, .25, 5), this.mat.goblin, -.2, .63, .01, group); leftEar.rotation.z = Math.PI / 2;
    const rightEar = this.mesh(new THREE.ConeGeometry(.07, .25, 5), this.mat.goblin, .2, .63, .01, group); rightEar.rotation.z = -Math.PI / 2;
    this.addEyes(group, .055, .65, .145, .022);
    const leftLeg = this.addJointedLimb(group, -.08, .22, 0, .23, .035, this.mat.goblin);
    const rightLeg = this.addJointedLimb(group, .08, .22, 0, .23, .035, this.mat.goblin);
    const leftArm = this.addJointedLimb(group, -.16, .48, 0, .29, .035, this.mat.goblin);
    const rightArm = this.addJointedLimb(group, .16, .48, 0, .29, .035, this.mat.goblin);
    this.mesh(new THREE.DodecahedronGeometry(.075, 0), this.mat.darkStone, -.17, .49, 0, group).scale.set(1.2, .65, .9);
    const dagger = this.mesh(new THREE.ConeGeometry(.035, .3, 5), this.mat.iron, 0, -.2, .035, rightArm);
    Object.assign(group.userData, { leftLeg, rightLeg, leftArm, rightArm });
  }

  buildSkeleton(group) {
    const bone = this.mat.bone;
    this.addBone(group, new THREE.Vector3(0,.25,0), new THREE.Vector3(0,.65,0), .035, bone);
    for (let i = 0; i < 3; i++) this.addBone(group, new THREE.Vector3(-.12,.46+i*.07,0), new THREE.Vector3(.12,.46+i*.07,0), .018, bone);
    this.mesh(new THREE.SphereGeometry(.16, 12, 9), bone, 0, .78, 0, group);
    this.mesh(new THREE.SphereGeometry(.175, 10, 7, 0, Math.PI * 2, 0, Math.PI * .55), this.mat.iron, 0, .83, -.01, group);
    this.mesh(new THREE.BoxGeometry(.17, .055, .055), this.mat.darkStone, 0, .69, .12, group);
    this.addEyes(group, .055, .8, .14, .03, 0x201e1a);
    const leftLeg = this.addJointedLimb(group, -.075, .27, 0, .32, .032, bone);
    const rightLeg = this.addJointedLimb(group, .075, .27, 0, .32, .032, bone);
    const leftArm = this.addJointedLimb(group, -.08, .58, 0, .36, .027, bone);
    const rightArm = this.addJointedLimb(group, .08, .58, 0, .36, .027, bone);
    const shield = this.mesh(new THREE.CylinderGeometry(.13, .13, .035, 7), this.mat.darkStone, 0, -.16, .09, leftArm);
    shield.rotation.x = Math.PI / 2;
    this.mesh(new THREE.CylinderGeometry(.045, .045, .04, 7), this.mat.goldDark, 0, -.16, .115, leftArm).rotation.x = Math.PI / 2;
    const rustySword = this.mesh(new THREE.BoxGeometry(.035, .42, .025), this.mat.iron, 0, -.14, .02, rightArm);
    rustySword.rotation.z = -.08;
    Object.assign(group.userData, { leftLeg, rightLeg, leftArm, rightArm });
  }

  buildOrc(group) {
    this.mesh(new THREE.SphereGeometry(.3, 12, 9), this.mat.iron, 0, .38, 0, group).scale.y = 1.2;
    this.mesh(new THREE.BoxGeometry(.25, .44, .055), this.mat.darkRed, 0, .42, .255, group);
    this.mesh(new THREE.TorusGeometry(.25, .035, 5, 10), this.mat.goldDark, 0, .4, 0, group).rotation.x = Math.PI / 2;
    this.mesh(new THREE.SphereGeometry(.2, 12, 9), this.mat.orc, 0, .78, .02, group);
    this.mesh(new THREE.BoxGeometry(.72, .18, .3), this.mat.iron, 0, .57, 0, group);
    for (const x of [-.31, .31]) this.mesh(new THREE.DodecahedronGeometry(.13, 0), this.mat.goldDark, x, .62, 0, group).scale.set(1.3, .64, 1);
    this.mesh(new THREE.SphereGeometry(.215, 10, 7, 0, Math.PI * 2, 0, Math.PI * .5), this.mat.darkStone, 0, .84, -.01, group);
    this.mesh(new THREE.BoxGeometry(.28, .045, .035), this.mat.gold, 0, .82, .19, group);
    this.addEyes(group, .07, .81, .17, .025);
    const tuskA = this.mesh(new THREE.ConeGeometry(.028, .14, 5), this.mat.bone, -.075, .69, .19, group); tuskA.rotation.x = Math.PI;
    const tuskB = this.mesh(new THREE.ConeGeometry(.028, .14, 5), this.mat.bone, .075, .69, .19, group); tuskB.rotation.x = Math.PI;
    const leftLeg = this.addJointedLimb(group, -.14, .24, 0, .31, .065, this.mat.orc);
    const rightLeg = this.addJointedLimb(group, .14, .24, 0, .31, .065, this.mat.orc);
    const leftArm = this.addJointedLimb(group, -.31, .62, 0, .43, .07, this.mat.orc);
    const rightArm = this.addJointedLimb(group, .31, .62, 0, .43, .07, this.mat.orc);
    this.mesh(new THREE.BoxGeometry(.055, .7, .055), this.mat.wood, 0, -.28, 0, rightArm);
    const blade = this.mesh(new THREE.ConeGeometry(.13, .25, 4), this.mat.iron, 0, .04, 0, rightArm); blade.rotation.z = Math.PI / 2;
    Object.assign(group.userData, { leftLeg, rightLeg, leftArm, rightArm });
  }

  buildOgre(group) {
    this.mesh(new THREE.SphereGeometry(.38, 14, 10), this.mat.ogre, 0, .46, 0, group).scale.y = 1.18;
    this.mesh(new THREE.BoxGeometry(.36, .5, .055), this.mat.wood, 0, .5, .35, group);
    this.mesh(new THREE.SphereGeometry(.23, 12, 9), this.mat.ogre, 0, .94, .02, group);
    this.mesh(new THREE.TorusGeometry(.31, .055, 6, 16), this.mat.lightWood, 0, .48, 0, group).rotation.x = Math.PI / 2;
    this.mesh(new THREE.BoxGeometry(.1, .1, .045), this.mat.goldDark, 0, .48, .34, group).rotation.z = Math.PI / 4;
    const shoulder = this.mesh(new THREE.DodecahedronGeometry(.2, 0), this.mat.darkStone, -.37, .75, 0, group); shoulder.scale.set(1.15, .68, 1);
    for (const x of [-.1, .1]) {
      const tusk = this.mesh(new THREE.ConeGeometry(.035, .18, 5), this.mat.bone, x, .86, .23, group);
      tusk.rotation.x = Math.PI;
    }
    this.addEyes(group, .08, .98, .2, .03);
    const leftLeg = this.addJointedLimb(group, -.18, .29, 0, .38, .095, this.mat.ogre);
    const rightLeg = this.addJointedLimb(group, .18, .29, 0, .38, .095, this.mat.ogre);
    const leftArm = this.addJointedLimb(group, -.35, .76, 0, .56, .1, this.mat.ogre);
    const rightArm = this.addJointedLimb(group, .35, .76, 0, .56, .1, this.mat.ogre);
    const club = this.mesh(new THREE.CylinderGeometry(.1, .055, .82, 7), this.mat.wood, 0, -.14, 0, rightArm); club.rotation.z = -.12;
    this.mesh(new THREE.DodecahedronGeometry(.17, 0), this.mat.darkStone, .06, .3, 0, rightArm);
    Object.assign(group.userData, { leftLeg, rightLeg, leftArm, rightArm });
  }

  buildDragon(group) {
    this.mesh(new THREE.SphereGeometry(.34, 14, 10), this.mat.red, 0, .65, 0, group).scale.set(.9, 1.45, 1.35);
    for (let i = 0; i < 4; i++) {
      const plate = this.mesh(new THREE.CylinderGeometry(.16 - i * .016, .18 - i * .016, .055, 7), i % 2 ? this.mat.goldDark : this.mat.gold, 0, .48 + i * .16, .37, group);
      plate.rotation.x = Math.PI / 2;
    }
    const head = new THREE.Group();
    head.position.set(0, 1.18, .15);
    group.add(head);
    this.mesh(new THREE.SphereGeometry(.25, 12, 9), this.mat.red, 0, 0, 0, head).scale.z = 1.35;
    this.mesh(new THREE.BoxGeometry(.31, .15, .3), this.mat.roofLight, 0, -.08, .24, head).scale.x = .86;
    this.mesh(new THREE.BoxGeometry(.28, .065, .22), this.mat.darkRed, 0, -.18, .24, head);
    for (const x of [-.12, .12]) {
      const brow = this.mesh(new THREE.ConeGeometry(.07, .2, 5), this.mat.goldDark, x, .1, .2, head);
      brow.rotation.z = x < 0 ? -.85 : .85;
    }
    this.addEyes(head, .09, .06, .23, .035);
    const hornA = this.mesh(new THREE.ConeGeometry(.045, .35, 6), this.mat.bone, -.15, .27, -.1, head); hornA.rotation.z = -.25;
    const hornB = this.mesh(new THREE.ConeGeometry(.045, .35, 6), this.mat.bone, .15, .27, -.1, head); hornB.rotation.z = .25;
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([0,0,0, -.95,.18,-.05, -.72,-.55,.08, -.22,-.28,.06], 3));
    wingGeo.setIndex([0,1,2,0,2,3]);
    wingGeo.computeVertexNormals();
    const leftWing = new THREE.Mesh(wingGeo, this.mat.darkRed);
    leftWing.position.set(-.18, .9, 0); leftWing.castShadow = true; group.add(leftWing);
    const rightWing = leftWing.clone(); rightWing.scale.x = -1; rightWing.position.x = .18; group.add(rightWing);
    for (const wing of [leftWing, rightWing]) {
      const leadingBone = this.mesh(new THREE.BoxGeometry(.92, .045, .045), this.mat.goldDark, -.42, .01, 0, wing);
      leadingBone.rotation.z = -.18;
    }
    group.userData.leftWing = leftWing;
    group.userData.rightWing = rightWing;
    const dragonLegs = [
      this.addJointedLimb(group, -.23, .5, .27, .4, .085, this.mat.darkRed),
      this.addJointedLimb(group, .23, .5, .27, .4, .085, this.mat.darkRed),
      this.addJointedLimb(group, -.23, .48, -.25, .4, .085, this.mat.darkRed),
      this.addJointedLimb(group, .23, .48, -.25, .4, .085, this.mat.darkRed)
    ];
    const tail = this.mesh(new THREE.ConeGeometry(.16, .95, 8), this.mat.darkRed, 0, .35, -.55, group); tail.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const spine = this.mesh(new THREE.ConeGeometry(.045 + i * .006, .18, 5), i % 2 ? this.mat.roofLight : this.mat.goldDark, 0, .65 + i * .13, -.2 + i * .035, group);
      spine.rotation.x = -.25;
    }
    this.mesh(new THREE.ConeGeometry(.16, .34, 6), this.mat.gold, 0, 1.05, .45, group).rotation.x = Math.PI / 2;
    const fireBreath = new THREE.Group();
    fireBreath.position.set(0, -.13, .18);
    fireBreath.visible = false;
    head.add(fireBreath);
    const fireOuterMaterial = new THREE.MeshBasicMaterial({ color: 0xff5a22, transparent: true, opacity: .78, depthWrite: false, toneMapped: false });
    const fireInnerMaterial = new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, opacity: .92, depthWrite: false, toneMapped: false });
    const fireOuter = this.mesh(new THREE.ConeGeometry(.28, 1.1, 9), fireOuterMaterial, 0, 0, .57, fireBreath);
    fireOuter.rotation.x = -Math.PI / 2;
    fireOuter.castShadow = false;
    const fireInner = this.mesh(new THREE.ConeGeometry(.14, .82, 8), fireInnerMaterial, 0, 0, .43, fireBreath);
    fireInner.rotation.x = -Math.PI / 2;
    fireInner.castShadow = false;
    const fireLight = new THREE.PointLight(0xff6a24, 4, 3.2, 2);
    fireLight.position.set(0, 0, .72);
    fireBreath.add(fireLight);
    group.userData.head = head;
    group.userData.headBaseZ = head.position.z;
    group.userData.dragonLegs = dragonLegs;
    group.userData.tail = tail;
    group.userData.fireBreath = fireBreath;
    group.userData.fireOuter = fireOuter;
    group.userData.fireLight = fireLight;
  }

  buildHeadlessHorseman(group) {
    const phantom = new THREE.MeshStandardMaterial({ color: 0x89989a, roughness: .6, emissive: 0x283435, emissiveIntensity: .25, transparent: true, opacity: .9, flatShading: true });
    const phantomDark = new THREE.MeshStandardMaterial({ color: 0x364044, roughness: .72, emissive: 0x171d20, emissiveIntensity: .2, transparent: true, opacity: .92, flatShading: true });
    const boneBlue = new THREE.MeshStandardMaterial({ color: 0xd8d8d5, roughness: .78, flatShading: true });
    const boneShadow = new THREE.MeshStandardMaterial({ color: 0x8c8f90, roughness: .84, flatShading: true });
    const blackArmor = new THREE.MeshStandardMaterial({ color: 0x202429, roughness: .55, metalness: .45, flatShading: true });
    const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xd96b24, roughness: .64, emissive: 0x6f260b, emissiveIntensity: .65, flatShading: true });
    const pumpkinGlow = new THREE.MeshBasicMaterial({ color: 0xffc04b, toneMapped: false });

    const horseBody = new THREE.Group();
    group.add(horseBody);
    this.mesh(new THREE.BoxGeometry(.14, .14, 1.24), boneBlue, 0, .91, -.05, horseBody);
    this.mesh(new THREE.BoxGeometry(.1, .1, 1.05), boneShadow, 0, .63, -.03, horseBody);
    this.mesh(new THREE.BoxGeometry(.62, .2, .18), boneBlue, 0, .82, -.55, horseBody);
    this.mesh(new THREE.BoxGeometry(.58, .22, .2), boneBlue, 0, .84, .46, horseBody);
    for (const z of [-.36, -.18, 0, .18, .36]) {
      this.mesh(new THREE.BoxGeometry(.62, .085, .09), z === 0 ? boneBlue : boneShadow, 0, .86, z, horseBody);
      this.mesh(new THREE.BoxGeometry(.48, .075, .08), boneShadow, 0, .56, z, horseBody);
      this.mesh(new THREE.BoxGeometry(.075, .39, .085), boneBlue, -.265, .71, z, horseBody);
      this.mesh(new THREE.BoxGeometry(.075, .39, .085), boneBlue, .265, .71, z, horseBody);
    }
    for (let index = 0; index < 5; index++) {
      const t = index / 4;
      const vertebra = this.mesh(new THREE.BoxGeometry(.15 - index * .008, .15 - index * .008, .15), index % 2 ? boneShadow : boneBlue, 0, .98 + t * .31, .45 + t * .3, horseBody);
      vertebra.rotation.x = -.18;
    }
    const horseHead = new THREE.Group();
    horseHead.position.set(0, 1.31, .78);
    horseHead.rotation.x = .14;
    group.add(horseHead);
    const horseSkull = this.mesh(new THREE.BoxGeometry(.3, .3, .42), boneBlue, 0, .035, 0, horseHead);
    horseSkull.scale.set(1, 1, 1.55);
    const foreheadPlate = this.mesh(new THREE.BoxGeometry(.25, .09, .27), this.mat.bone, 0, .16, .1, horseHead);
    foreheadPlate.rotation.x = -.08;
    const muzzle = this.mesh(new THREE.BoxGeometry(.25, .2, .38), boneShadow, 0, -.07, .365, horseHead);
    const lowerJaw = this.mesh(new THREE.BoxGeometry(.24, .06, .36), boneBlue, 0, -.19, .35, horseHead);
    this.mesh(new THREE.BoxGeometry(.22, .02, .29), this.mat.darkStone, 0, -.15, .36, horseHead);
    const horseEyeHoles = [];
    for (const side of [-1, 1]) {
      this.mesh(new THREE.BoxGeometry(.07, .17, .09), boneBlue, side * .1, .24, -.1, horseHead).rotation.z = side * -.08;
      const eyeHole = this.mesh(new THREE.BoxGeometry(.075, .085, .045), this.mat.darkStone, side * .085, .055, .33, horseHead);
      eyeHole.castShadow = false;
      horseEyeHoles.push(eyeHole);
      this.mesh(new THREE.BoxGeometry(.042, .04, .025), this.mat.darkStone, side * .055, -.055, .565, horseHead);
      this.mesh(new THREE.BoxGeometry(.055, .14, .14), boneBlue, side * .14, -.015, .13, horseHead);
    }

    const voxelLeg = (x, y, z, material) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      group.add(pivot);
      this.mesh(new THREE.BoxGeometry(.11, .34, .12), material, 0, -.17, 0, pivot);
      this.mesh(new THREE.BoxGeometry(.14, .13, .14), boneBlue, 0, -.36, 0, pivot);
      this.mesh(new THREE.BoxGeometry(.1, .3, .11), material, 0, -.54, .02, pivot);
      const hoof = this.mesh(new THREE.BoxGeometry(.14, .1, .21), blackArmor, 0, -.595, .075, pivot);
      return { pivot, hoof };
    };
    const voxelLegs = [
      voxelLeg(-.25, .72, .4, boneBlue), voxelLeg(.25, .72, .4, boneBlue),
      voxelLeg(-.25, .7, -.42, boneShadow), voxelLeg(.25, .7, -.42, boneShadow)
    ];
    const horseLegs = voxelLegs.map(entry => entry.pivot);
    const horseHooves = [];
    voxelLegs.forEach(entry => horseHooves.push(entry.hoof));

    const blueFlames = [];

    const rider = new THREE.Group();
    rider.position.set(0, .95, -.06);
    group.add(rider);
    const torso = this.mesh(new THREE.CylinderGeometry(.2, .29, .62, 8), blackArmor, 0, .48, 0, rider);
    torso.scale.z = .78;
    this.mesh(new THREE.BoxGeometry(.44, .19, .3), this.mat.darkRed, 0, .58, .02, rider);
    const cape = this.mesh(new THREE.ConeGeometry(.4, .92, 5), phantomDark, 0, .38, -.18, rider);
    cape.scale.z = .42;
    const collar = this.mesh(new THREE.TorusGeometry(.14, .04, 6, 12), this.mat.goldDark, 0, .82, 0, rider);
    collar.rotation.x = Math.PI / 2;
    this.mesh(new THREE.CylinderGeometry(.09, .1, .09, 8), phantomDark, 0, .85, 0, rider);
    for (const side of [-1, 1]) {
      const shoulder = this.mesh(new THREE.DodecahedronGeometry(.14, 0), blackArmor, side * .28, .68, 0, rider);
      shoulder.scale.set(1.25, .65, 1);
    }
    const leftArm = this.addJointedLimb(rider, -.27, .65, 0, .48, .065, blackArmor);
    const rightArm = this.addJointedLimb(rider, .27, .65, 0, .48, .065, blackArmor);
    leftArm.rotation.set(-.18, 0, -.18);
    rightArm.rotation.set(-.2, 0, .36);

    const pumpkin = new THREE.Group();
    pumpkin.position.set(0, -.48, .08);
    leftArm.add(pumpkin);
    const heldHead = this.mesh(new THREE.SphereGeometry(.18, 10, 7), pumpkinMat, 0, 0, 0, pumpkin);
    heldHead.scale.set(1.08, .9, .92);
    this.mesh(new THREE.CylinderGeometry(.025, .04, .13, 6), this.mat.leafMid, 0, .19, 0, pumpkin).rotation.z = .18;
    for (const side of [-1, 1]) {
      const eye = this.mesh(new THREE.ConeGeometry(.045, .08, 3), pumpkinGlow, side * .065, .035, .16, pumpkin);
      eye.rotation.x = Math.PI / 2;
    }
    const grin = this.mesh(new THREE.BoxGeometry(.18, .035, .025), pumpkinGlow, 0, -.07, .17, pumpkin);
    grin.rotation.z = -.08;

    const halberd = new THREE.Group();
    halberd.position.set(.08, -.45, .12);
    halberd.rotation.z = -.42;
    rightArm.add(halberd);
    const halberdSteel = new THREE.MeshStandardMaterial({ color: 0x89969b, roughness: .32, metalness: .72, flatShading: true });
    this.mesh(new THREE.CylinderGeometry(.028, .032, 1.36, 8), this.mat.wood, 0, .22, 0, halberd);
    this.mesh(new THREE.CylinderGeometry(.04, .04, .1, 8), this.mat.goldDark, 0, .65, 0, halberd);
    this.mesh(new THREE.CylinderGeometry(.04, .04, .09, 8), this.mat.goldDark, 0, -.24, 0, halberd);
    const spearTip = this.mesh(new THREE.ConeGeometry(.075, .38, 6), halberdSteel, 0, 1.05, 0, halberd);
    const halberdBlade = this.mesh(new THREE.ConeGeometry(.23, .46, 4), halberdSteel, .17, .76, 0, halberd);
    halberdBlade.rotation.z = -Math.PI / 2;
    halberdBlade.scale.y = .86;
    const rearHook = this.mesh(new THREE.ConeGeometry(.08, .34, 5), halberdSteel, -.14, .75, 0, halberd);
    rearHook.rotation.z = Math.PI / 2;
    rearHook.rotation.y = .2;
    this.mesh(new THREE.BoxGeometry(.34, .075, .06), halberdSteel, 0, .72, 0, halberd);

    group.userData.horseLegs = horseLegs;
    group.userData.horsemanLeftArm = leftArm;
    group.userData.horsemanRightArm = rightArm;
    group.userData.halberd = halberd;
    group.userData.halberdBlade = halberdBlade;
    group.userData.horsemanCape = cape;
    group.userData.pumpkin = pumpkin;
    group.userData.phantomHorse = horseBody;
    group.userData.skeletonHorse = true;
    group.userData.horseSkull = horseSkull;
    group.userData.horseHooves = horseHooves;
    group.userData.horseEyeHoles = horseEyeHoles;
    group.userData.blueFlames = blueFlames;
    group.userData.bossModel = "horseman";
  }

  buildCyclops(group) {
    const cyclopsSkin = new THREE.MeshStandardMaterial({ color: 0x8b7a56, roughness: .9, flatShading: true });
    const scarSkin = new THREE.MeshStandardMaterial({ color: 0x6d5b40, roughness: .95, flatShading: true });
    const leather = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: .92, flatShading: true });
    const eyeGlow = new THREE.MeshBasicMaterial({ color: 0xffbd45, toneMapped: false });
    const torso = this.mesh(new THREE.SphereGeometry(.55, 14, 10), cyclopsSkin, 0, .82, 0, group);
    torso.scale.set(1.08, 1.24, .9);
    this.mesh(new THREE.TorusGeometry(.42, .075, 7, 16), leather, 0, .72, 0, group).rotation.x = Math.PI / 2;
    const chestStrap = this.mesh(new THREE.BoxGeometry(.16, .95, .54), leather, -.08, .88, .02, group);
    chestStrap.rotation.z = -.52;
    for (const side of [-1, 1]) {
      const shoulder = this.mesh(new THREE.DodecahedronGeometry(.25, 0), this.mat.darkStone, side * .52, 1.12, 0, group);
      shoulder.scale.set(1.25, .68, 1);
    }

    const head = new THREE.Group();
    head.position.set(0, 1.55, .035);
    group.add(head);
    const skull = this.mesh(new THREE.SphereGeometry(.36, 13, 9), cyclopsSkin, 0, 0, 0, head);
    skull.scale.set(.92, 1.02, .88);
    const brow = this.mesh(new THREE.BoxGeometry(.38, .095, .12), scarSkin, 0, .08, .29, head);
    brow.rotation.z = -.04;
    const eyeSocket = this.mesh(new THREE.SphereGeometry(.105, 11, 8), scarSkin, 0, .02, .31, head);
    eyeSocket.scale.set(1.32, .88, .42);
    const eye = this.mesh(new THREE.SphereGeometry(.07, 10, 8), eyeGlow, 0, .02, .36, head);
    eye.scale.z = .55;
    const pupil = this.mesh(new THREE.SphereGeometry(.027, 8, 6), this.mat.darkStone, 0, .02, .405, head);
    pupil.scale.z = .35;
    const nose = this.mesh(new THREE.ConeGeometry(.08, .2, 6), cyclopsSkin, 0, -.12, .32, head);
    nose.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const tusk = this.mesh(new THREE.ConeGeometry(.035, .17, 5), this.mat.bone, side * .11, -.22, .3, head);
      tusk.rotation.x = Math.PI;
    }
    const hair = this.mesh(new THREE.SphereGeometry(.37, 11, 7, 0, Math.PI * 2, 0, Math.PI * .48), leather, 0, .13, -.03, head);
    hair.scale.set(.92, .68, .9);

    const leftLeg = this.addJointedLimb(group, -.25, .46, 0, .58, .13, cyclopsSkin);
    const rightLeg = this.addJointedLimb(group, .25, .46, 0, .58, .13, cyclopsSkin);
    for (const leg of [leftLeg, rightLeg]) {
      this.mesh(new THREE.CylinderGeometry(.145, .145, .12, 7), leather, 0, -.42, 0, leg);
      this.mesh(new THREE.BoxGeometry(.28, .14, .38), cyclopsSkin, 0, -.58, .1, leg);
    }
    const leftArm = this.addJointedLimb(group, -.52, 1.13, 0, .72, .14, cyclopsSkin);
    const rightArm = this.addJointedLimb(group, .52, 1.13, 0, .72, .14, cyclopsSkin);
    this.mesh(new THREE.CylinderGeometry(.15, .15, .12, 7), leather, 0, -.5, 0, leftArm);
    this.mesh(new THREE.CylinderGeometry(.15, .15, .12, 7), leather, 0, -.5, 0, rightArm);
    const club = this.mesh(new THREE.CylinderGeometry(.18, .09, 1.25, 8), this.mat.wood, 0, -.05, .02, rightArm);
    club.rotation.z = -.15;
    const clubHead = this.mesh(new THREE.DodecahedronGeometry(.26, 0), this.mat.darkWood || this.mat.wood, .08, .5, .02, rightArm);
    clubHead.scale.set(.82, 1.35, .82);
    for (const y of [.35, .52, .68]) {
      const spike = this.mesh(new THREE.ConeGeometry(.035, .16, 5), this.mat.iron, .24, y, .02, rightArm);
      spike.rotation.z = -Math.PI / 2;
    }
    const loincloth = this.mesh(new THREE.BoxGeometry(.48, .55, .06), this.mat.darkRed, 0, .47, .43, group);
    loincloth.rotation.x = -.06;

    Object.assign(group.userData, { leftLeg, rightLeg, leftArm, rightArm, cyclopsEye: eye, bossModel: "cyclops" });
  }

  buildYeti(group) {
    const snowFur = new THREE.MeshStandardMaterial({ color: 0xd9f1ef, roughness: 1, flatShading: true });
    const blueFur = new THREE.MeshStandardMaterial({ color: 0x8fc9d4, roughness: .96, emissive: 0x173b48, emissiveIntensity: .3, flatShading: true });
    const iceSkin = new THREE.MeshStandardMaterial({ color: 0x6a9eaa, roughness: .86, flatShading: true });
    const deepIce = new THREE.MeshStandardMaterial({ color: 0x315d70, roughness: .78, emissive: 0x0d2835, emissiveIntensity: .35, flatShading: true });
    const iceGlow = new THREE.MeshBasicMaterial({ color: 0xaaf5ff, toneMapped: false });
    const iceCrystal = new THREE.MeshStandardMaterial({ color: 0x8ee8ff, roughness: .25, metalness: .08, emissive: 0x245b76, emissiveIntensity: .72, transparent: true, opacity: .9, flatShading: true });

    const addBlockLimb = (parent, x, y, z, length, width, depth, material) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      parent.add(pivot);
      this.mesh(new THREE.BoxGeometry(width, length, depth), material, 0, -length / 2, 0, pivot);
      return pivot;
    };

    const torso = this.mesh(new THREE.BoxGeometry(1.16, 1.38, .86), snowFur, 0, .93, 0, group);
    const chest = this.mesh(new THREE.BoxGeometry(.82, .96, .12), blueFur, 0, .91, .49, group);
    this.mesh(new THREE.BoxGeometry(.42, .32, .78), snowFur, -.58, 1.31, 0, group);
    this.mesh(new THREE.BoxGeometry(.42, .32, .78), snowFur, .58, 1.31, 0, group);
    for (const [x, y, z, scale] of [[-.5, 1.22, .02, .22], [.5, 1.22, .02, .22], [-.37, .72, .48, .16], [.36, .68, .47, .15], [0, .42, .45, .18]]) {
      const tuft = this.mesh(new THREE.ConeGeometry(scale, scale * 2.1, 6), snowFur, x, y, z, group);
      tuft.rotation.x = Math.PI;
    }

    const head = new THREE.Group();
    head.position.set(0, 1.67, .08);
    group.add(head);
    const skull = this.mesh(new THREE.BoxGeometry(.72, .64, .62), snowFur, 0, 0, 0, head);
    const face = this.mesh(new THREE.BoxGeometry(.5, .38, .15), iceSkin, 0, -.06, .38, head);
    const brow = this.mesh(new THREE.BoxGeometry(.5, .13, .14), deepIce, 0, .08, .34, head);
    brow.rotation.z = -.03;
    for (const side of [-1, 1]) {
      this.mesh(new THREE.BoxGeometry(.13, .13, .045), deepIce, side * .13, .01, .485, head);
      this.mesh(new THREE.BoxGeometry(.055, .055, .025), iceGlow, side * .13, .015, .515, head);
      const fang = this.mesh(new THREE.ConeGeometry(.04, .18, 5), this.mat.bone, side * .115, -.23, .42, head);
      fang.rotation.x = Math.PI;
      const horn = this.mesh(new THREE.ConeGeometry(.065, .34, 6), iceCrystal, side * .3, .24, -.03, head);
      horn.rotation.z = side * -.48;
    }
    const muzzle = this.mesh(new THREE.BoxGeometry(.32, .16, .2), iceSkin, 0, -.16, .4, head);
    muzzle.rotation.x = -.08;
    this.mesh(new THREE.BoxGeometry(.22, .055, .045), deepIce, 0, -.24, .49, head);

    const leftLeg = addBlockLimb(group, -.31, .52, 0, .66, .34, .38, blueFur);
    const rightLeg = addBlockLimb(group, .31, .52, 0, .66, .34, .38, blueFur);
    for (const leg of [leftLeg, rightLeg]) {
      const foot = this.mesh(new THREE.BoxGeometry(.36, .16, .5), deepIce, 0, -.65, .13, leg);
      foot.scale.x = 1.08;
      for (const x of [-.1, 0, .1]) {
        const claw = this.mesh(new THREE.ConeGeometry(.035, .16, 5), this.mat.bone, x, -.65, .4, leg);
        claw.rotation.x = Math.PI / 2;
      }
    }
    const leftArm = addBlockLimb(group, -.69, 1.28, 0, .9, .38, .4, snowFur);
    const rightArm = addBlockLimb(group, .69, 1.28, 0, .9, .38, .4, snowFur);
    for (const arm of [leftArm, rightArm]) {
      this.mesh(new THREE.BoxGeometry(.4, .32, .43), iceSkin, 0, -.9, .03, arm);
    }

    const backCrystals = [];
    for (const [x, y, z, scale] of [[-.3, 1.35, -.42, .18], [.06, 1.52, -.48, .24], [.34, 1.2, -.4, .16]]) {
      const crystal = this.mesh(new THREE.ConeGeometry(scale * .55, scale * 2.5, 5), iceCrystal, x, y, z, group);
      crystal.rotation.x = -.34;
      crystal.rotation.z = x * .35;
      backCrystals.push(crystal);
    }
    const frostAura = this.mesh(new THREE.RingGeometry(.62, .76, 30), new THREE.MeshBasicMaterial({ color: 0x8fe8f4, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }), 0, .04, 0, group);
    frostAura.rotation.x = -Math.PI / 2;
    const frostLight = new THREE.PointLight(0x8fe8f4, 3.8, 3.8, 2);
    frostLight.position.set(0, 1.25, .15);
    group.add(frostLight);

    Object.assign(group.userData, {
      torso, leftLeg, rightLeg, leftArm, rightArm, yetiHead: head, yetiFrostAura: frostAura,
      yetiFrostLight: frostLight, yetiBackCrystals: backCrystals, yetiModel: true, bossModel: "yeti"
    });
  }

  addJointedLimb(parent, x, y, z, length, radius, material) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    parent.add(pivot);
    this.mesh(new THREE.CylinderGeometry(radius, radius * .88, length, 7), material, 0, -length / 2, 0, pivot);
    this.mesh(new THREE.SphereGeometry(radius * 1.08, 7, 5), material, 0, -length, 0, pivot);
    return pivot;
  }

  animateEnemy(group, enemy, now) {
    const walking = enemy.moving && !enemy.blocked;
    const rate = { goblin: 12, skeleton: 9, orc: 7.2, ogre: 5.2, dragon: 5.8, horseman: 8.6, cyclops: 4.2, yeti: 3.8, merchant: 13.5, pirate: 9.5, werewolf: 12.5, viking: 7.8, wraith: 5.5, demon: 7, davyjones: 6.2, moonalpha: 10.5, longship: 3.2, covenwitch: 5.4, riftlord: 4.8 }[enemy.type] || 8;
    const amplitude = { goblin: .9, skeleton: .82, orc: .63, ogre: .46, dragon: .38, horseman: .6, cyclops: .4, yeti: .36, merchant: .95, pirate: .8, werewolf: .88, viking: .65, wraith: .3, demon: .6, davyjones: .55, moonalpha: .72, longship: .12, covenwitch: .28, riftlord: .46 }[enemy.type] || .6;
    const stride = Math.sin(now * rate + enemy.phase);
    const attackDuration = enemy.type === "dragon" || enemy.type === "yeti" && enemy.snowballThrowTimer > 0 ? .8 : .46;
    const attackProgress = enemy.attackSwing > 0 ? 1 - enemy.attackSwing / attackDuration : 0;
    const strike = enemy.attackSwing > 0 ? Math.sin(THREE.MathUtils.clamp(attackProgress, 0, 1) * Math.PI) : 0;

    group.rotation.z = walking ? stride * (enemy.type === "ogre" ? .055 : .035) : enemy.blocked ? -strike * .07 : 0;
    if (group.userData.leftLeg) {
      group.userData.leftLeg.rotation.x = walking ? stride * amplitude : 0;
      group.userData.rightLeg.rotation.x = walking ? -stride * amplitude : 0;
      group.userData.leftArm.rotation.x = walking ? -stride * amplitude * .72 : enemy.blocked ? -.28 : 0;
      group.userData.rightArm.rotation.x = walking ? stride * amplitude * .72 : enemy.blocked ? -.52 - strike * 1.65 : 0;
      group.userData.leftArm.rotation.z = enemy.blocked ? -.12 : 0;
      group.userData.rightArm.rotation.z = enemy.blocked ? .08 : 0;
    }
    if (group.userData.dragonLegs) {
      const [frontLeft, frontRight, backLeft, backRight] = group.userData.dragonLegs;
      frontLeft.rotation.x = walking ? stride * amplitude : enemy.blocked ? -.24 : 0;
      backRight.rotation.x = walking ? stride * amplitude : enemy.blocked ? -.24 : 0;
      frontRight.rotation.x = walking ? -stride * amplitude : enemy.blocked ? .12 : 0;
      backLeft.rotation.x = walking ? -stride * amplitude : enemy.blocked ? .12 : 0;
      group.userData.head.position.z = group.userData.headBaseZ + (enemy.blocked ? strike * .32 : 0);
      group.userData.head.rotation.x = enemy.blocked ? -.16 - strike * .3 : walking ? stride * .035 : 0;
      group.userData.tail.rotation.z = walking ? stride * .16 : enemy.blocked ? -strike * .24 : 0;
    }
    if (group.userData.horseLegs) {
      const [frontLeft, frontRight, backLeft, backRight] = group.userData.horseLegs;
      frontLeft.rotation.x = walking ? stride * amplitude : 0;
      backRight.rotation.x = walking ? stride * amplitude : 0;
      frontRight.rotation.x = walking ? -stride * amplitude : 0;
      backLeft.rotation.x = walking ? -stride * amplitude : 0;
      group.userData.horsemanLeftArm.rotation.x = walking ? -stride * .12 : enemy.blocked ? -.5 : -.18;
      group.userData.horsemanRightArm.rotation.x = walking ? stride * .12 : enemy.blocked ? -.45 - strike * 1.7 : -.2;
      group.userData.horsemanRightArm.rotation.z = enemy.blocked ? .36 + strike * .52 : .36;
      if (group.userData.halberd) group.userData.halberd.rotation.z = enemy.blocked ? -.42 - strike * .34 : -.42;
      group.userData.horsemanCape.rotation.z = walking ? -stride * .035 : Math.sin(now * 1.8 + enemy.phase) * .025;
      group.userData.pumpkin.rotation.y = Math.sin(now * 1.2 + enemy.phase) * .08;
    }
    if (group.userData.yetiModel) {
      const throwing = enemy.snowballThrowTimer > 0;
      const throwProgress = throwing ? THREE.MathUtils.clamp(1 - enemy.snowballThrowTimer / .8, 0, 1) : 0;
      const heave = throwing ? Math.sin(throwProgress * Math.PI) : 0;
      group.userData.rightArm.rotation.x = throwing ? -.35 - heave * 2.25 : walking ? stride * amplitude * .72 : enemy.blocked ? -.52 - strike * 1.65 : -.18;
      group.userData.rightArm.rotation.z = throwing ? .18 + heave * .36 : 0;
      group.userData.leftArm.rotation.x = throwing ? -.4 - heave * .75 : walking ? -stride * amplitude * .72 : enemy.blocked ? -.28 : -.14;
      group.userData.torso.rotation.x = throwing ? -.12 - heave * .14 : 0;
      group.userData.yetiHead.rotation.x = throwing ? .1 + heave * .12 : walking ? stride * .02 : 0;
    }
    if (group.userData.merchantModel) {
      group.userData.merchantPack.rotation.z = walking ? -stride * .055 : Math.sin(now * 1.5 + enemy.phase) * .015;
      group.userData.merchantPouches.forEach((pouch, index) => pouch.rotation.z = walking ? stride * (index ? -.16 : .16) : 0);
      group.userData.merchantCoin.rotation.z = walking ? stride * .08 : 0;
      group.userData.merchantFeather.rotation.z = -.72 + (walking ? stride * .08 : Math.sin(now * 1.8 + enemy.phase) * .035);
      group.userData.merchantPotion.rotation.z = walking ? -stride * .1 : 0;
      group.userData.merchantScroll.rotation.z = .25 + (walking ? stride * .08 : 0);
    }
    if (enemy.blocked && enemy.attackSwing <= 0) group.rotation.z += Math.sin(now * 5 + enemy.phase) * .018;
    if (enemy.type === "dragon") return walking ? Math.abs(stride) * .055 : Math.sin(now * 2.2 + enemy.phase) * .025;
    if (enemy.type === "horseman") return walking ? Math.abs(stride) * .07 : Math.sin(now * 2 + enemy.phase) * .018;
    if (enemy.type === "wraith") return .045 + Math.sin(now * 3.1 + enemy.phase) * .035;
    if (enemy.type === "longship") return .03 + Math.sin(now * 2.4 + enemy.phase) * .025;
    if (enemy.type === "covenwitch") return .035 + Math.sin(now * 2.8 + enemy.phase) * .025;
    return walking ? Math.abs(stride) * (enemy.type === "ogre" || enemy.type === "cyclops" || enemy.type === "yeti" ? .032 : enemy.type === "merchant" ? .06 : .045) : Math.sin(now * 2.4 + enemy.phase) * .008;
  }

  addEyes(group, spread, y, z, radius, color = 0xf1bd4c) {
    const material = color === 0xf1bd4c ? this.mat.eye : new THREE.MeshBasicMaterial({ color });
    this.mesh(new THREE.SphereGeometry(radius, 8, 6), material, -spread, y, z, group);
    this.mesh(new THREE.SphereGeometry(radius, 8, 6), material, spread, y, z, group);
  }

  addBone(group, a, b, radius, material) {
    const direction = new THREE.Vector3().subVectors(b, a);
    const length = direction.length();
    const bone = this.mesh(new THREE.CylinderGeometry(radius, radius, length, 6), material, (a.x+b.x)/2, (a.y+b.y)/2, (a.z+b.z)/2, group);
    bone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), direction.normalize());
  }

  enemyHeight(type) {
    return { goblin: .82, skeleton: 1.02, orc: 1.18, ogre: 1.45, dragon: 1.85, horseman: 2.15, cyclops: 2.05, yeti: 2.25, merchant: 1.58, pirate: 1.18, werewolf: 1.3, viking: 1.2, wraith: 1.3, demon: 1.48, davyjones: 1.62, moonalpha: 1.42, longship: 1.58, covenwitch: 1.72, riftlord: 1.78, knight: .85, zombie: .78, gladiator: 1 }[type];
  }

  createHealthBar(type) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 18;
    const context = canvas.getContext("2d");
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.NearestFilter;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(material);
    const width = { goblin: .48, skeleton: .53, orc: .61, ogre: .71, dragon: 1.05, horseman: 1.18, cyclops: 1.28, yeti: 1.4, merchant: .68, pirate: .55, werewolf: .59, viking: .62, wraith: .64, demon: .69, davyjones: .9, moonalpha: .94, longship: 1.08, covenwitch: .92, riftlord: 1.12, knight: .43, zombie: .4, gladiator: .5, vampireMinion: .43, togga: .82 }[type];
    sprite.scale.set(width, width * canvas.height / canvas.width, 1);
    sprite.renderOrder = 30;
    sprite.userData.canvas = canvas;
    sprite.userData.context = context;
    sprite.userData.texture = texture;
    sprite.userData.baseScale = width;
    sprite.userData.baseAspect = canvas.height / canvas.width;
    sprite.userData.lastRatio = -1;
    sprite.userData.filledPixels = 0;
    sprite.userData.friendly = type === "knight" || type === "zombie" || type === "gladiator" || type === "vampireMinion" || type === "togga";
    this.updateHealthBar(sprite, 1);
    return sprite;
  }

  updateHealthBar(sprite, ratio) {
    const roundedRatio = Math.round(THREE.MathUtils.clamp(ratio, 0, 1) * 1000) / 1000;
    if (sprite.userData.lastRatio === roundedRatio) return;
    const canvas = sprite.userData.canvas;
    const context = sprite.userData.context;
    const innerX = 5;
    const innerY = 5;
    const innerWidth = canvas.width - innerX * 2;
    const innerHeight = canvas.height - innerY * 2;
    const filledPixels = Math.round(innerWidth * roundedRatio);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(25, 19, 15, 0.94)";
    context.fillRect(1, 1, canvas.width - 2, canvas.height - 2);
    context.strokeStyle = "rgba(239, 221, 178, 0.82)";
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.fillStyle = "rgba(8, 7, 6, 0.9)";
    context.fillRect(innerX, innerY, innerWidth, innerHeight);
    if (filledPixels > 0) {
      context.fillStyle = sprite.userData.friendly && roundedRatio > .5 ? "#5aa8d6" : roundedRatio > .5 ? "#72b34f" : roundedRatio > .25 ? "#e2a53c" : "#d3483e";
      context.fillRect(innerX, innerY, filledPixels, innerHeight);
      context.fillStyle = "rgba(255, 255, 255, 0.22)";
      context.fillRect(innerX, innerY, filledPixels, 2);
    }
    sprite.userData.lastRatio = roundedRatio;
    sprite.userData.filledPixels = filledPixels;
    sprite.userData.texture.needsUpdate = true;
  }

  syncProjectiles(projectiles) {
    this.removeMissing(this.projectileMeshes, projectiles);
    for (const projectile of projectiles) {
      let object = this.projectileMeshes.get(projectile);
      if (!object) {
        object = new THREE.Group();
        if (projectile.variant === "yetiSnowball") {
          const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xe9ffff, roughness: .88, emissive: 0x315a68, emissiveIntensity: .32, flatShading: true });
          const frostMaterial = new THREE.MeshBasicMaterial({ color: 0x8fe8f4, transparent: true, opacity: .55, depthWrite: false, toneMapped: false });
          const snowball = this.mesh(new THREE.IcosahedronGeometry(.23, 1), snowMaterial, 0, 0, 0, object);
          const frostShell = this.mesh(new THREE.IcosahedronGeometry(.27, 1), frostMaterial, 0, 0, 0, object);
          frostShell.scale.set(1.05, .96, 1.08);
          for (let index = 0; index < 5; index++) {
            const angle = index / 5 * Math.PI * 2;
            const clump = this.mesh(new THREE.SphereGeometry(.065, 7, 5), snowMaterial, Math.cos(angle) * .18, Math.sin(angle * 2) * .09, Math.sin(angle) * .18, object);
            clump.castShadow = false;
          }
          const light = new THREE.PointLight(0x9eeeff, 3.8, 2.7, 2);
          object.add(light);
          object.userData.yetiSnowball = true;
          object.userData.snowball = snowball;
          object.userData.frostShell = frostShell;
          object.userData.snowballLight = light;
        } else if (projectile.variant === "castleCannon") {
          const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x6f5b42, roughness: .78, flatShading: true });
          const emberMaterial = new THREE.MeshBasicMaterial({ color: 0xffd36b, toneMapped: false });
          const stone = this.mesh(new THREE.DodecahedronGeometry(.14, 1), stoneMaterial, 0, 0, 0, object);
          const ember = this.mesh(new THREE.SphereGeometry(.19, 8, 6), emberMaterial, 0, 0, 0, object);
          const light = new THREE.PointLight(0xffb43d, 4.5, 2.6, 2);
          object.add(light);
          object.userData.castleCannon = true;
          object.userData.cannonStone = stone;
          object.userData.cannonEmber = ember;
          object.userData.cannonLight = light;
        } else if (projectile.type === "witchMagic") {
          const magicMaterial = new THREE.MeshBasicMaterial({ color: 0xaef9e5, toneMapped: false });
          const auraMaterial = new THREE.MeshBasicMaterial({ color: 0x8067d8, transparent: true, opacity: .72, depthWrite: false, toneMapped: false });
          const core = this.mesh(new THREE.IcosahedronGeometry(.105, 1), magicMaterial, 0, 0, 0, object);
          core.castShadow = false;
          const aura = this.mesh(new THREE.TorusGeometry(.15, .022, 6, 18), auraMaterial, 0, 0, 0, object);
          aura.rotation.x = Math.PI / 2;
          const crossAura = this.mesh(new THREE.TorusGeometry(.125, .016, 6, 18), auraMaterial, 0, 0, 0, object);
          crossAura.rotation.y = Math.PI / 2;
          const light = new THREE.PointLight(0x9cebdc, 3.5, 2.4, 2);
          object.add(light);
          object.userData.witchMagic = true;
          object.userData.core = core;
          object.userData.aura = aura;
          object.userData.crossAura = crossAura;
        } else if (projectile.variant === "ufoLaser" || projectile.variant === "ufoLaserRed" || projectile.variant === "ufoMassiveLaser") {
          const massive = projectile.variant === "ufoMassiveLaser";
          const red = projectile.variant === "ufoLaserRed";
          const coreColor = red ? 0xffd0d8 : massive ? 0xe8fff0 : 0xd6ffe0;
          const beamColor = red ? 0xff4e68 : massive ? 0xb9ffd0 : 0x52ff78;
          const beamLength = massive ? .86 : .48;
          const coreMaterial = new THREE.MeshBasicMaterial({ color: coreColor, toneMapped: false });
          const beamMaterial = new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: massive ? .88 : .78, depthWrite: false, toneMapped: false });
          const core = this.mesh(new THREE.CylinderGeometry(massive ? .038 : .018, massive ? .052 : .026, beamLength, 7), coreMaterial, 0, 0, 0, object);
          core.rotation.x = Math.PI / 2;
          core.castShadow = false;
          const beam = this.mesh(new THREE.CylinderGeometry(massive ? .12 : .052, massive ? .15 : .064, beamLength + (massive ? .08 : .04), 9), beamMaterial, 0, 0, 0, object);
          beam.rotation.x = Math.PI / 2;
          beam.castShadow = false;
          const tip = this.mesh(new THREE.SphereGeometry(massive ? .14 : .07, 9, 7), coreMaterial, 0, 0, (beamLength / 2) + .02, object);
          tip.scale.z = 1.5;
          tip.castShadow = false;
          const light = new THREE.PointLight(beamColor, massive ? 6 : 3.5, massive ? 3.6 : 2.4, 2);
          light.position.z = beamLength * .38;
          object.add(light);
          object.userData.ufoLaser = true;
          object.userData.massiveLaser = massive;
          object.userData.laserCore = core;
          object.userData.laserBeam = beam;
          object.userData.laserLight = light;
        } else if (projectile.type === "mage") {
          const frostShot = String(projectile.color).toLowerCase() === "#8fe8f4";
          const glowColor = frostShot ? 0x8fe8f4 : 0xd94cff;
          const coreMaterial = new THREE.MeshBasicMaterial({ color: glowColor, toneMapped: false });
          const shellMaterial = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: .72, depthWrite: false, wireframe: true, toneMapped: false });
          const core = this.mesh(new THREE.ConeGeometry(.0525, .095, 4), coreMaterial, 0, 0, 0, object);
          core.castShadow = false;
          const shell = this.mesh(new THREE.ConeGeometry(.0725, .1275, 4), shellMaterial, 0, 0, 0, object);
          shell.castShadow = false;
          shell.receiveShadow = false;
          object.userData.core = core;
          object.userData.shell = shell;
          const randomSpin = () => (Math.random() * .12 + .075) * (Math.random() < .5 ? -1 : 1);
          object.userData.spin = new THREE.Vector3(randomSpin(), randomSpin(), randomSpin());
        } else if (projectile.variant === "slingRock" || projectile.variant === "ogreRock") {
          const ogreRock = projectile.variant === "ogreRock";
          const rock = this.mesh(new THREE.DodecahedronGeometry(ogreRock ? .22 : .125, 0), this.mat.stone, 0, 0, 0, object);
          rock.castShadow = true;
          object.userData.rock = rock;
          object.userData.ogreRock = ogreRock;
          object.userData.spin = new THREE.Vector3(.08 + Math.random() * .08, .07 + Math.random() * .09, .06 + Math.random() * .08);
        } else if (projectile.variant === "rifle") {
          const shot = this.mesh(new THREE.CylinderGeometry(.016, .02, .19, 7), this.mat.iron, 0, 0, 0, object);
          shot.rotation.x = Math.PI / 2;
          const tip = this.mesh(new THREE.ConeGeometry(.026, .07, 7), this.mat.goldLight, 0, 0, .125, object);
          tip.rotation.x = Math.PI / 2;
        } else if (projectile.variant === "lightningBolt") {
          const lightningMaterial = new THREE.MeshBasicMaterial({ color: 0xcaf5ff, toneMapped: false });
          const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x3aaeff, transparent: true, opacity: .5, depthWrite: false, toneMapped: false });
          const lightningSegments = [];
          const points = [
            new THREE.Vector3(0, 0, -.34), new THREE.Vector3(.075, .035, -.23),
            new THREE.Vector3(-.065, -.025, -.12), new THREE.Vector3(.07, .045, 0),
            new THREE.Vector3(-.055, -.035, .12), new THREE.Vector3(.045, .025, .23),
            new THREE.Vector3(0, 0, .36)
          ];
          for (let index = 1; index < points.length; index++) {
            const start = points[index - 1];
            const end = points[index];
            const delta = new THREE.Vector3().subVectors(end, start);
            const length = delta.length();
            const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(.5);
            const glow = this.mesh(new THREE.CylinderGeometry(.034, .034, length, 5), glowMaterial, midpoint.x, midpoint.y, midpoint.z, object);
            glow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
            const core = this.mesh(new THREE.CylinderGeometry(.014, .014, length, 5), lightningMaterial, midpoint.x, midpoint.y, midpoint.z, object);
            core.quaternion.copy(glow.quaternion);
            lightningSegments.push(glow, core);
          }
          const light = new THREE.PointLight(0x68d6ff, 5.5, 2.8, 2);
          object.add(light);
          object.userData.lightningBolt = true;
          object.userData.lightningSegments = lightningSegments;
          object.userData.lightningLight = light;
        } else {
          const bolt = projectile.type === "ballista";
          const flamingBolt = projectile.variant === "flamingBolt";
          const shaftLength = bolt ? .46 : .18;
          const shaftRadius = bolt ? .026 : .009;
          const shaft = this.mesh(new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 6), bolt ? this.mat.iron : this.mat.lightWood, 0, 0, 0, object);
          shaft.rotation.x = Math.PI / 2;
          const head = this.mesh(new THREE.ConeGeometry(bolt ? .065 : .024, bolt ? .16 : .07, 5), this.mat.goldLight, 0, 0, shaftLength / 2 + (bolt ? .07 : .03), object);
          head.rotation.x = Math.PI / 2;
          for (const x of [-1, 1]) {
            const fletching = this.mesh(new THREE.BoxGeometry(bolt ? .11 : .045, .014, bolt ? .11 : .05), this.mat.roofRed, x * (bolt ? .035 : .016), 0, -shaftLength / 2, object);
            fletching.rotation.z = x * .5;
          }
          if (flamingBolt) {
            const outerMaterial = new THREE.MeshBasicMaterial({ color: 0xff5b20, transparent: true, opacity: .82, depthWrite: false, toneMapped: false });
            const innerMaterial = new THREE.MeshBasicMaterial({ color: 0xffdf63, transparent: true, opacity: .95, depthWrite: false, toneMapped: false });
            const outerFlame = this.mesh(new THREE.ConeGeometry(.115, .3, 7), outerMaterial, 0, 0, -.36, object);
            outerFlame.rotation.x = -Math.PI / 2;
            outerFlame.castShadow = false;
            const innerFlame = this.mesh(new THREE.ConeGeometry(.06, .2, 7), innerMaterial, 0, 0, -.31, object);
            innerFlame.rotation.x = -Math.PI / 2;
            innerFlame.castShadow = false;
            const fireLight = new THREE.PointLight(0xff6a24, 5, 2.5, 2);
            fireLight.position.z = -.2;
            object.add(fireLight);
            object.userData.flamingBolt = true;
            object.userData.outerFlame = outerFlame;
            object.userData.innerFlame = innerFlame;
            object.userData.fireLight = fireLight;
          }
        }
        this.projectileMeshes.set(projectile, object);
        this.scene.add(object);
      }
      const p = this.worldFromGame(projectile.x, projectile.y, projectile.variant === "yetiSnowball" ? .92 : projectile.variant === "castleCannon" ? .7 : projectile.type === "ufo" ? .82 : projectile.type === "mage" ? .38 : projectile.type === "witchMagic" ? .58 : projectile.variant === "ogreRock" ? .78 : projectile.variant === "slingRock" ? .5 : .62);
      object.position.copy(p);
      if (projectile.variant === "yetiSnowball") {
        object.rotation.x += .11;
        object.rotation.y += .08;
        object.rotation.z += .095;
        const pulse = 1 + Math.sin(performance.now() * .022 + projectile.phase) * .08;
        object.userData.frostShell.scale.setScalar(pulse);
        object.userData.snowballLight.intensity = 3.4 + pulse * .8;
      } else if (projectile.variant === "castleCannon") {
        object.rotation.x += .12;
        object.rotation.y += .15;
        const pulse = 1 + Math.sin(performance.now() * .03) * .12;
        object.userData.cannonEmber.scale.setScalar(pulse);
        object.userData.cannonLight.intensity = 4 + pulse * 1.5;
      } else if (projectile.type === "witchMagic") {
        object.rotation.x += .09;
        object.rotation.y += .13;
        object.userData.aura.rotation.z += .18;
        object.userData.crossAura.rotation.x -= .14;
        const pulse = 1 + Math.sin(performance.now() * .018) * .14;
        object.userData.core.scale.setScalar(pulse);
      } else if ((projectile.variant === "ufoLaser" || projectile.variant === "ufoLaserRed" || projectile.variant === "ufoMassiveLaser") && projectile.target) {
        const target = this.worldFromGame(projectile.target.x, projectile.target.y);
        object.rotation.y = Math.atan2(target.x - p.x, target.z - p.z);
        const pulse = 1 + Math.sin(performance.now() * .045) * .16;
        object.userData.laserBeam.scale.set(pulse, 1, pulse);
        object.userData.laserBeam.material.opacity = .68 + Math.sin(performance.now() * .04) * .16;
        object.userData.laserLight.intensity = 3.2 + Math.sin(performance.now() * .05) * 1.2;
      } else if (projectile.type === "mage") {
        object.rotation.x += object.userData.spin.x;
        object.rotation.y += object.userData.spin.y;
        object.rotation.z += object.userData.spin.z;
        object.userData.shell.rotation.y -= object.userData.spin.y * .7;
        object.userData.shell.rotation.x += object.userData.spin.z * .45;
      } else if (projectile.variant === "slingRock" || projectile.variant === "ogreRock") {
        object.rotation.x += object.userData.spin.x;
        object.rotation.y += object.userData.spin.y;
        object.rotation.z += object.userData.spin.z;
      } else if (projectile.variant === "lightningBolt" && projectile.target) {
        const target = this.worldFromGame(projectile.target.x, projectile.target.y);
        object.rotation.y = Math.atan2(target.x - p.x, target.z - p.z);
        const pulse = 1 + Math.sin(performance.now() * .08) * .24;
        object.userData.lightningSegments.forEach((segment, index) => segment.scale.setScalar(index % 2 ? pulse : 1 + (pulse - 1) * .5));
        object.userData.lightningLight.intensity = 4.8 + Math.sin(performance.now() * .09) * 2;
      } else if (projectile.variant === "flamingBolt" && projectile.target) {
        const target = this.worldFromGame(projectile.target.x, projectile.target.y);
        object.rotation.y = Math.atan2(target.x - p.x, target.z - p.z);
        const flicker = Math.sin(performance.now() * .035) * .12;
        object.userData.outerFlame.scale.set(1 + flicker, 1 - flicker * .35, 1 + flicker);
        object.userData.innerFlame.scale.set(1 - flicker * .5, 1 + flicker * .4, 1 - flicker * .5);
        object.userData.fireLight.intensity = 4.5 + flicker * 8;
      } else if (projectile.target) {
        const target = this.worldFromGame(projectile.target.x, projectile.target.y);
        object.rotation.y = Math.atan2(target.x - p.x, target.z - p.z);
      }
    }
  }

  syncParticles(particles) {
    const live = new Set(particles);
    for (const [particle, mesh] of this.particleMeshes) {
      if (!live.has(particle)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.particleMeshes.delete(particle);
      }
    }
    for (const particle of particles) {
      let mesh = this.particleMeshes.get(particle);
      if (!mesh) {
        if (particle.kind === "debris" || particle.kind === "gooDebris") {
          const blockSize = .035 + particle.size * .006;
          mesh = new THREE.Mesh(
            new THREE.BoxGeometry(blockSize, blockSize, blockSize),
            particle.kind === "gooDebris"
              ? new THREE.MeshBasicMaterial({ color: particle.color, transparent: true, toneMapped: false })
              : new THREE.MeshStandardMaterial({ color: particle.color, roughness: .82, transparent: true, flatShading: true })
          );
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        } else if (particle.kind === "bloodDrain") {
          const cubeSize = .055 + particle.size * .006;
          mesh = new THREE.Mesh(
            new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
            new THREE.MeshBasicMaterial({ color: particle.color, transparent: true, toneMapped: false })
          );
        } else {
          mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.025 + particle.size * .004), new THREE.MeshBasicMaterial({ color: particle.color, transparent: true }));
        }
        this.particleMeshes.set(particle, mesh);
        this.scene.add(mesh);
      }
      if (particle.kind === "debris" || particle.kind === "gooDebris") {
        const p = this.worldFromGame(particle.x, particle.y, particle.height);
        mesh.position.copy(p);
        mesh.rotation.set(particle.rotationX, particle.rotationY, particle.rotationZ);
        const fadeWindow = particle.kind === "gooDebris" ? .75 : .45;
        mesh.material.opacity = particle.settled && particle.groundTimer < fadeWindow ? Math.max(0, particle.groundTimer / fadeWindow) : 1;
      } else if (particle.kind === "bloodDrain") {
        const p = this.worldFromGame(particle.x, particle.y, particle.height);
        mesh.position.copy(p);
        mesh.rotation.y = Math.atan2(particle.vx, particle.vy);
        mesh.rotation.x += .09;
        mesh.rotation.z += .07;
        mesh.material.opacity = Math.min(1, particle.life / Math.min(.16, particle.maxLife));
      } else {
        const p = this.worldFromGame(particle.x, particle.y, .25 + particle.life * .4);
        mesh.position.copy(p);
        mesh.material.opacity = Math.min(1, particle.life / particle.maxLife);
      }
    }
  }

  updateIndicators(state, hoverCell, canPlace, towerStats) {
    const chosen = state.selectedTower;
    if (chosen && chosen.type !== "mine") {
      const p = this.worldFromGame(chosen.x, chosen.y, .16);
      const range = towerStats(chosen).range / this.config.CELL;
      this.rangeDisc.visible = true;
      this.rangeDisc.position.set(p.x, .17, p.z);
      this.rangeDisc.scale.setScalar(range);
      this.rangeDisc.material.color.setHex(chosen.type === "ufo" ? 0x52ff78 : chosen.specialization === "frost" ? 0x8fe8f4 : 0xf2d682);
    } else if (state.selectedBuild && state.selectedBuild !== "mine" && hoverCell) {
      const base = this.config.towerTypes[state.selectedBuild];
      this.rangeDisc.visible = true;
      this.rangeDisc.position.set(hoverCell.col - this.config.COLS / 2 + .5, .17, hoverCell.row - this.config.ROWS / 2 + .5);
      this.rangeDisc.scale.setScalar(base.range / this.config.CELL);
      this.rangeDisc.material.color.setHex(state.selectedBuild === "ufo" ? 0x52ff78 : 0xe7d88d);
    } else this.rangeDisc.visible = false;

    if (state.selectedBuild && hoverCell) {
      const valid = canPlace(hoverCell.col, hoverCell.row) && state.gold >= this.config.towerTypes[state.selectedBuild].cost;
      this.hoverTile.visible = true;
      this.hoverTile.position.set(hoverCell.col - this.config.COLS / 2 + .5, .2, hoverCell.row - this.config.ROWS / 2 + .5);
      this.hoverTile.material.color.setHex(valid ? 0xbfe184 : 0xcc4d42);
    } else this.hoverTile.visible = false;

    const selectedTree = state.trees.find(tree => tree.id === state.selectedTreeId);
    if (selectedTree) {
      this.treeSelectionRing.visible = true;
      this.treeSelectionRing.position.set(selectedTree.x - this.config.COLS / 2, .15, selectedTree.z - this.config.ROWS / 2);
      const pulse = 1 + Math.sin(performance.now() * .006) * .08;
      this.treeSelectionRing.scale.setScalar(pulse);
    } else {
      this.treeSelectionRing.visible = false;
    }
  }

  removeMissing(map, liveItems) {
    const live = new Set(liveItems);
    for (const [item, object] of map) {
      if (!live.has(item)) {
        this.scene.remove(object);
        map.delete(item);
      }
    }
  }

  mesh(geometry, material, x = 0, y = 0, z = 0, parent = this.scene) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

window.ThreeGraphics = ThreeGraphics;

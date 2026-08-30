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
    this.renderer.toneMappingExposure = 1.34;

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
    this.towerModelScale = .5;
    this.enemyModelScale = .5;

    this.makeMaterials();
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
      soil: mat(0xc69a57), soilEdge: mat(0x745032), earth: mat(0x4e3927),
      stone: mat(0x8d8a7d, .72), stoneLight: mat(0xb5aa91, .68), darkStone: mat(0x464a45, .82),
      wood: mat(0x4a2c1b, .88), lightWood: mat(0x87522a, .8), iron: mat(0x333b3d, .4, .62),
      gold: mat(0xe1aa3d, .32, .58), goldLight: mat(0xffcf62, .26, .62), goldDark: mat(0x8c5d1f, .46, .42),
      leaf: mat(0x163f28), leafMid: mat(0x235632), leafLight: mat(0x347044),
      bone: mat(0xddd3b6), goblin: mat(0x719849), orc: mat(0x476f42), ogre: mat(0x81764d),
      red: mat(0xaf3f2e), roofRed: mat(0x923125), roofLight: mat(0xc85034), darkRed: mat(0x5d201d), cloth: mat(0x673128),
      purple: mat(0x8f6cdd, .28, .08, { emissive: 0x35245f, emissiveIntensity: .85 }),
      frost: mat(0x91e9f3, .22, .12, { emissive: 0x2f8fa8, emissiveIntensity: 1.25 }),
      eye: mat(0xf1bd4c, .22, .08, { emissive: 0x8e3b12, emissiveIntensity: 1.55 })
    };
  }

  buildLighting() {
    const hemi = new THREE.HemisphereLight(0xf2ead2, 0x13281c, 2.35);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffd28a, 4.1);
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
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0xffa640, 1.45);
    rim.position.set(9, 8, 7);
    this.scene.add(rim);
    const coolFill = new THREE.DirectionalLight(0x8cc8b1, .65);
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
        const tile = this.mesh(new THREE.BoxGeometry(1.015, .055 + (tone === 2 ? .015 : 0), 1.015), material, col - COLS / 2 + .5, 0, row - ROWS / 2 + .5);
        tile.receiveShadow = true;
      }
    }

    const roadPoints = pathPoints.map(point => this.worldFromGame(point.x, point.y));
    const roadCurve = new THREE.CatmullRomCurve3(roadPoints, false, "centripetal", .35);
    const smoothRoadPoints = roadCurve.getSpacedPoints(220);
    this.createRoadRibbon(smoothRoadPoints, .9, .085, this.mat.soilEdge);
    this.createRoadRibbon(smoothRoadPoints, .72, .125, this.mat.soil);
    this.addRoadStones(smoothRoadPoints);
    this.addScenery();
  }

  createRoadRibbon(points, width, elevation, material) {
    const positions = [];
    const indices = [];
    const halfWidth = width / 2;
    for (let i = 0; i < points.length; i++) {
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
    const treeData = [[.3,1.5,.9], [2.8,1.45,.8], [5.5,1.4,1], [8.0,1.5,.8], [11.55,1.35,1.05], [.25,3.5,.9], [3.7,3.4,.8], [6.2,3.5,1], [8.8,3.4,.78], [11.55,3.45,.95], [.3,5.5,1], [3.0,5.45,.8], [5.6,5.5,.95], [8.0,5.4,.8], [11.55,5.3,1], [.35,7.45,.9], [3.2,7.5,.82], [6.1,7.45,1], [8.7,7.5,.85]];
    treeData.forEach(([x, z, scale], index) => this.createTree(x - 6, z - 4, scale, index));
    this.createCastle(5.22, 3.42);
    this.createEnemyCamp(-5.62, -3.45);
    this.createRocks();
  }

  createTree(x, z, scale, variant) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    this.scene.add(group);
    this.mesh(new THREE.DodecahedronGeometry(.16, 0), this.mat.darkStone, 0, .08, 0, group).scale.set(1.4, .42, 1.1);
    this.mesh(new THREE.CylinderGeometry(.07, .115, .7, 7), this.mat.wood, 0, .35, 0, group);
    this.mesh(new THREE.CylinderGeometry(.09, .09, .055, 8), this.mat.goldDark, 0, .16, 0, group);
    const crownMat = variant % 2 ? this.mat.leaf : this.mat.leafMid;
    this.mesh(new THREE.ConeGeometry(.42, .7, 7), crownMat, 0, .64, 0, group);
    this.mesh(new THREE.ConeGeometry(.34, .66, 7), variant % 3 ? this.mat.leafMid : this.mat.leafLight, 0, .98, 0, group);
    this.mesh(new THREE.ConeGeometry(.23, .52, 7), this.mat.leafLight, 0, 1.3, 0, group);
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
  }

  createRocks() {
    const positions = [[-4.2,2.75,.16],[-2.1,3.2,.11],[2.8,-3.1,.14],[4.6,-1.8,.12],[-.7,-3.3,.1]];
    positions.forEach(([x,z,s], i) => {
      const rock = this.mesh(new THREE.DodecahedronGeometry(s, 0), i % 2 ? this.mat.stone : this.mat.darkStone, x, s * .55, z);
      rock.scale.y = .65;
      rock.rotation.set(i, i * .7, 0);
    });
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
    this.syncTowers(state.towers);
    this.syncKnights(state.knights);
    this.syncEnemies(state.enemies);
    this.syncProjectiles(state.projectiles);
    this.syncParticles(state.particles);
    this.updateIndicators(state, hoverCell, canPlace, towerStats);
    this.renderer.render(this.scene, this.camera);
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

  syncTowers(towers) {
    this.removeMissing(this.towerMeshes, towers);
    for (const tower of towers) {
      let group = this.towerMeshes.get(tower);
      if (!group) {
        group = this.createTower(tower);
        this.towerMeshes.set(tower, group);
        this.scene.add(group);
      }
      const p = this.worldFromGame(tower.x, tower.y);
      group.position.set(p.x, 0, p.z);
      group.scale.setScalar(this.towerModelScale);
      if (group.userData.turret) group.userData.turret.rotation.y = -tower.angle;
      if (group.userData.crystal) {
        group.userData.crystal.rotation.y += .018;
        group.userData.crystal.position.y = group.userData.crystal.userData.baseY + Math.sin(performance.now() * .003) * .045;
        const frost = tower.specialization === "frost";
        if (group.userData.frost !== frost) {
          group.userData.crystal.material = frost ? this.mat.frost : this.mat.purple;
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
      if (group.userData.playerOgre) {
        const body = group.userData.playerOgre;
        const leftArm = group.userData.ogreLeftArm;
        const rightArm = group.userData.ogreRightArm;
        const now = performance.now() * .001;
        body.rotation.y = Math.PI / 2 - tower.angle;
        if (tower.throwSwing > 0) {
          const progress = THREE.MathUtils.clamp(1 - tower.throwSwing / .9, 0, 1);
          const heave = Math.sin(progress * Math.PI);
          leftArm.rotation.x = -.35 - heave * 1.45;
          rightArm.rotation.x = -.35 - heave * 1.45;
          leftArm.rotation.z = -.18 - heave * .22;
          rightArm.rotation.z = .18 + heave * .22;
          body.rotation.z = -Math.sin(progress * Math.PI * 2) * .09;
          body.position.y = .08 + heave * .08;
        } else {
          const idle = Math.sin(now * 2.2 + tower.col) * .035;
          leftArm.rotation.x = -.08 + idle;
          rightArm.rotation.x = -.08 - idle;
          leftArm.rotation.z = -.1;
          rightArm.rotation.z = .1;
          body.rotation.z = 0;
          body.position.y = .08 + Math.sin(now * 1.8 + tower.row) * .018;
        }
      }
      group.userData.levelPips.forEach((pip, i) => pip.visible = i < tower.level);
    }
  }

  createTower(tower) {
    const group = new THREE.Group();
    const trim = this.mesh(new THREE.CylinderGeometry(.47, .5, .085, 10), this.mat.goldDark, 0, .055, 0, group);
    trim.receiveShadow = true;
    const base = this.mesh(new THREE.CylinderGeometry(.39, .46, .24, 10), this.mat.darkStone, 0, .13, 0, group);
    base.receiveShadow = true;
    this.mesh(new THREE.CylinderGeometry(.4, .4, .045, 10), this.mat.gold, 0, .255, 0, group);
    if (tower.type === "archer") this.buildArcherTower(group);
    else if (tower.type === "mage") this.buildMageTower(group);
    else if (tower.type === "ballista") this.buildBallista(group);
    else if (tower.type === "barracks") this.buildBarracks(group);
    else if (tower.type === "ogre") this.buildPlayerOgre(group);
    else this.buildGoldMine(group);
    group.userData.levelPips = [];
    if (tower.type !== "mine") {
      for (let i = 0; i < 3; i++) {
        const pip = this.mesh(new THREE.OctahedronGeometry(.045), this.mat.gold, -.11 + i * .11, .08, -.48, group);
        group.userData.levelPips.push(pip);
      }
    }
    group.scale.setScalar(this.towerModelScale);
    return group;
  }

  buildArcherTower(group) {
    this.mesh(new THREE.CylinderGeometry(.25, .34, .72, 10), this.mat.stone, 0, .52, 0, group);
    this.mesh(new THREE.CylinderGeometry(.285, .285, .055, 10), this.mat.goldDark, 0, .76, 0, group);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      this.mesh(new THREE.BoxGeometry(.13, .12, .055), this.mat.stoneLight, Math.cos(a) * .27, .55 + (i % 2) * .14, Math.sin(a) * .27, group).rotation.y = -a;
    }
    const top = this.mesh(new THREE.CylinderGeometry(.36, .36, .16, 10), this.mat.lightWood, 0, .91, 0, group);
    this.mesh(new THREE.CylinderGeometry(.39, .39, .045, 10), this.mat.gold, 0, .99, 0, group);
    for (let i = 0; i < 8; i += 2) {
      const a = i / 8 * Math.PI * 2;
      this.mesh(new THREE.BoxGeometry(.12, .18, .12), this.mat.stone, Math.cos(a) * .29, 1.05, Math.sin(a) * .29, group);
    }
    const turret = new THREE.Group();
    turret.position.y = 1.08;
    group.add(turret);
    this.mesh(new THREE.BoxGeometry(.5, .055, .055), this.mat.wood, .05, .02, 0, turret);
    this.mesh(new THREE.CylinderGeometry(.018, .018, .5, 6), this.mat.gold, .2, .02, 0, turret).rotation.z = Math.PI / 2;
    const bow = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 5, 12, Math.PI), this.mat.lightWood);
    bow.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    bow.position.x = .25;
    bow.castShadow = true;
    turret.add(bow);
    group.userData.turret = turret;
    top.receiveShadow = true;
  }

  buildMageTower(group) {
    this.mesh(new THREE.CylinderGeometry(.2, .33, .8, 8), this.mat.stone, 0, .55, 0, group);
    this.mesh(new THREE.CylinderGeometry(.24, .24, .05, 8), this.mat.goldDark, 0, .74, 0, group);
    for (const [x, z] of [[-.23,0],[.23,0],[0,-.23],[0,.23]]) {
      const buttress = this.mesh(new THREE.ConeGeometry(.09, .5, 5), this.mat.darkStone, x, .4, z, group);
      buttress.rotation.y = Math.atan2(x, z);
    }
    this.mesh(new THREE.ConeGeometry(.36, .38, 8), this.mat.purple, 0, .96, 0, group);
    this.mesh(new THREE.ConeGeometry(.27, .31, 8), this.mat.roofLight, 0, 1.18, 0, group);
    this.mesh(new THREE.CylinderGeometry(.2, .2, .045, 8), this.mat.gold, 0, 1.22, 0, group);
    const crystal = this.mesh(new THREE.OctahedronGeometry(.15, 0), this.mat.purple, 0, 1.42, 0, group);
    crystal.userData.baseY = 1.42;
    group.userData.crystal = crystal;
    const light = new THREE.PointLight(0x9c7de9, 3, 2.2, 2);
    light.position.y = 1.4;
    group.add(light);
  }

  buildBallista(group) {
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

  buildPlayerOgre(group) {
    const body = new THREE.Group();
    body.position.y = .08;
    group.add(body);
    const warPaint = new THREE.MeshStandardMaterial({ color: 0x315b75, roughness: .78, flatShading: true });
    const hide = new THREE.MeshStandardMaterial({ color: 0x4b3826, roughness: .92, flatShading: true });
    const torso = this.mesh(new THREE.SphereGeometry(.4, 14, 10), this.mat.ogre, 0, .53, 0, body);
    torso.scale.set(1.04, 1.18, .9);
    this.mesh(new THREE.SphereGeometry(.24, 12, 9), this.mat.ogre, 0, 1.03, .04, body);
    this.mesh(new THREE.BoxGeometry(.64, .13, .35), hide, 0, .42, 0, body);
    const shoulderA = this.mesh(new THREE.DodecahedronGeometry(.16, 0), this.mat.goldDark, -.37, .8, 0, body); shoulderA.scale.set(1.25, .72, 1);
    const shoulderB = this.mesh(new THREE.DodecahedronGeometry(.16, 0), this.mat.goldDark, .37, .8, 0, body); shoulderB.scale.set(1.25, .72, 1);
    this.mesh(new THREE.CylinderGeometry(.17, .17, .06, 8), this.mat.gold, 0, .62, .31, body).rotation.x = Math.PI / 2;
    const sash = this.mesh(new THREE.BoxGeometry(.13, .72, .4), warPaint, -.08, .61, .02, body);
    sash.rotation.z = -.52;
    this.addEyes(body, .085, 1.08, .23, .032);
    const tuskA = this.mesh(new THREE.ConeGeometry(.035, .17, 5), this.mat.bone, -.09, .92, .25, body); tuskA.rotation.x = Math.PI;
    const tuskB = this.mesh(new THREE.ConeGeometry(.035, .17, 5), this.mat.bone, .09, .92, .25, body); tuskB.rotation.x = Math.PI;
    const leftLeg = this.addJointedLimb(body, -.2, .3, 0, .38, .1, this.mat.ogre);
    const rightLeg = this.addJointedLimb(body, .2, .3, 0, .38, .1, this.mat.ogre);
    leftLeg.rotation.x = .08;
    rightLeg.rotation.x = -.08;
    const leftArm = this.addJointedLimb(body, -.38, .78, 0, .6, .115, this.mat.ogre);
    const rightArm = this.addJointedLimb(body, .38, .78, 0, .6, .115, this.mat.ogre);
    this.mesh(new THREE.SphereGeometry(.15, 9, 7), this.mat.ogre, 0, -.63, .02, leftArm);
    this.mesh(new THREE.SphereGeometry(.15, 9, 7), this.mat.ogre, 0, -.63, .02, rightArm);
    this.mesh(new THREE.CylinderGeometry(.23, .25, .13, 10), warPaint, 0, .3, 0, body);
    group.userData.playerOgre = body;
    group.userData.ogreLeftArm = leftArm;
    group.userData.ogreRightArm = rightArm;
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
        group = this.createKnight();
        this.knightMeshes.set(knight, group);
        this.scene.add(group);
        const bar = this.createHealthBar("knight");
        this.knightBars.set(knight, bar);
        this.scene.add(bar);
      }
      const bar = this.knightBars.get(knight);
      group.visible = knight.alive;
      bar.visible = knight.alive;
      if (!knight.alive) continue;
      const p = this.worldFromGame(knight.x, knight.y);
      const stride = Math.sin(now * 11 + knight.phase);
      const walking = knight.moving && !knight.clashing;
      const bob = walking ? Math.abs(stride) * .035 : Math.sin(now * 2.6 + knight.phase) * .008;
      group.position.set(p.x, .07 + bob, p.z);
      group.rotation.y = Math.PI / 2 - knight.angle;
      group.rotation.z = walking ? stride * .035 : 0;
      group.scale.setScalar(knight.hitFlash > 0 ? 1.08 : 1);
      group.userData.leftLeg.rotation.x = walking ? stride * .72 : 0;
      group.userData.rightLeg.rotation.x = walking ? -stride * .72 : 0;
      group.userData.leftArm.rotation.x = walking ? -stride * .48 : knight.clashing ? -.72 : 0;
      group.userData.rightArm.rotation.x = walking ? stride * .48 : knight.clashing ? -.42 : 0;
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
      bar.position.set(p.x, 1.03 + bob, p.z);
      this.updateHealthBar(bar, knight.hp / knight.maxHp);
    }
  }

  createKnight() {
    const group = new THREE.Group();
    const blue = new THREE.MeshStandardMaterial({ color: 0x315f7d, roughness: .72, flatShading: true });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc99a72, roughness: .9, flatShading: true });
    const torso = new THREE.Group();
    group.add(torso);
    this.mesh(new THREE.CylinderGeometry(.11, .14, .34, 8), blue, 0, .36, 0, torso);
    this.mesh(new THREE.BoxGeometry(.22, .19, .045), this.mat.goldDark, 0, .4, .105, torso);
    this.mesh(new THREE.BoxGeometry(.12, .12, .052), this.mat.gold, 0, .4, .135, torso).rotation.z = Math.PI / 4;
    for (const x of [-.145, .145]) this.mesh(new THREE.DodecahedronGeometry(.07, 0), this.mat.goldDark, x, .5, 0, torso).scale.set(1.15, .62, .88);
    this.mesh(new THREE.SphereGeometry(.105, 10, 8), skin, 0, .62, .015, torso);
    this.mesh(new THREE.SphereGeometry(.125, 10, 7, 0, Math.PI * 2, 0, Math.PI * .62), this.mat.iron, 0, .67, .005, torso);
    this.mesh(new THREE.BoxGeometry(.19, .045, .025), this.mat.iron, 0, .62, .11, torso);
    const plume = this.mesh(new THREE.ConeGeometry(.035, .19, 6), blue, 0, .83, -.015, torso);
    plume.rotation.x = -.18;

    const leftLeg = this.addJointedLimb(group, -.075, .22, 0, .25, .04, this.mat.iron);
    const rightLeg = this.addJointedLimb(group, .075, .22, 0, .25, .04, this.mat.iron);
    this.mesh(new THREE.BoxGeometry(.09, .05, .13), this.mat.iron, 0, -.24, .035, leftLeg);
    this.mesh(new THREE.BoxGeometry(.09, .05, .13), this.mat.iron, 0, -.24, .035, rightLeg);
    const leftArm = this.addJointedLimb(group, -.14, .52, 0, .28, .035, blue);
    const rightArm = this.addJointedLimb(group, .14, .52, 0, .28, .035, blue);

    const shield = this.mesh(new THREE.CylinderGeometry(.135, .135, .035, 8), blue, 0, -.18, .1, leftArm);
    shield.rotation.x = Math.PI / 2;
    const shieldRim = this.mesh(new THREE.TorusGeometry(.132, .014, 5, 8), this.mat.goldDark, 0, -.18, .122, leftArm);
    shieldRim.rotation.x = Math.PI / 2;
    this.mesh(new THREE.BoxGeometry(.035, .2, .025), this.mat.gold, 0, -.18, .125, leftArm);
    this.mesh(new THREE.BoxGeometry(.2, .035, .025), this.mat.gold, 0, -.18, .125, leftArm);

    const sword = new THREE.Group();
    sword.position.set(0, -.28, .03);
    sword.rotation.z = -.18;
    rightArm.add(sword);
    const blade = this.mesh(new THREE.BoxGeometry(.035, .4, .025), this.mat.iron, 0, .2, 0, sword);
    blade.rotation.z = 0;
    this.mesh(new THREE.BoxGeometry(.16, .035, .04), this.mat.gold, 0, 0, 0, sword);
    this.mesh(new THREE.CylinderGeometry(.025, .025, .13, 6), this.mat.wood, 0, -.08, 0, sword);
    group.userData.torso = torso;
    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;
    group.userData.sword = sword;
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
      const bob = this.animateEnemy(group, enemy, now) * this.enemyModelScale;
      const throwHeight = enemy.thrown ? enemy.throwArc : 0;
      group.position.set(p.x, .08 + bob + throwHeight, p.z);
      group.rotation.x = enemy.thrown ? enemy.throwSpin : 0;
      if (enemy.thrown) group.rotation.z = enemy.throwSpin * .55;
      if (enemy.blocked) {
        group.rotation.y = Math.PI / 2 - enemy.combatAngle;
      } else {
        const next = this.config.pathPoints[enemy.pathIndex];
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
      group.userData.frostRing.visible = enemy.slowTimer > 0;
      group.scale.setScalar(this.enemyModelScale * (enemy.hitFlash > 0 ? 1.06 : 1));

      const bar = this.enemyBars.get(enemy);
      const height = this.enemyHeight(enemy.type);
      bar.position.set(p.x, .08 + height * this.enemyModelScale + .13 + bob + throwHeight, p.z);
      const ratio = THREE.MathUtils.clamp(enemy.hp / enemy.maxHp, 0, 1);
      this.updateHealthBar(bar, ratio);
    }
  }

  createEnemy(type) {
    const group = new THREE.Group();
    if (type === "goblin") this.buildGoblin(group);
    else if (type === "skeleton") this.buildSkeleton(group);
    else if (type === "orc") this.buildOrc(group);
    else if (type === "ogre") this.buildOgre(group);
    else this.buildDragon(group);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.22, .29, 24), new THREE.MeshBasicMaterial({ color: 0x8fe8f4, transparent: true, opacity: .68, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .02;
    ring.visible = false;
    group.add(ring);
    group.userData.frostRing = ring;
    return group;
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
    group.userData.head = head;
    group.userData.headBaseZ = head.position.z;
    group.userData.dragonLegs = dragonLegs;
    group.userData.tail = tail;
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
    const rate = { goblin: 12, skeleton: 9, orc: 7.2, ogre: 5.2, dragon: 5.8 }[enemy.type] || 8;
    const amplitude = { goblin: .9, skeleton: .82, orc: .63, ogre: .46, dragon: .38 }[enemy.type] || .6;
    const stride = Math.sin(now * rate + enemy.phase);
    const attackProgress = enemy.attackSwing > 0 ? 1 - enemy.attackSwing / .46 : 0;
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
    if (enemy.blocked && enemy.attackSwing <= 0) group.rotation.z += Math.sin(now * 5 + enemy.phase) * .018;
    if (enemy.type === "dragon") return walking ? Math.abs(stride) * .055 : Math.sin(now * 2.2 + enemy.phase) * .025;
    return walking ? Math.abs(stride) * (enemy.type === "ogre" ? .032 : .045) : Math.sin(now * 2.4 + enemy.phase) * .008;
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
    return { goblin: .82, skeleton: 1.02, orc: 1.18, ogre: 1.45, dragon: 1.85, knight: .85 }[type];
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
    const width = { goblin: .48, skeleton: .53, orc: .61, ogre: .71, dragon: .94, knight: .43 }[type];
    sprite.scale.set(width, width * canvas.height / canvas.width, 1);
    sprite.renderOrder = 30;
    sprite.userData.canvas = canvas;
    sprite.userData.context = context;
    sprite.userData.texture = texture;
    sprite.userData.lastRatio = -1;
    sprite.userData.filledPixels = 0;
    sprite.userData.friendly = type === "knight";
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
      let mesh = this.projectileMeshes.get(projectile);
      if (!mesh) {
        const material = new THREE.MeshStandardMaterial({ color: projectile.color, emissive: projectile.color, emissiveIntensity: 1.6 });
        mesh = new THREE.Mesh(new THREE.SphereGeometry(projectile.type === "mage" ? .075 : .035, 8, 6), material);
        this.projectileMeshes.set(projectile, mesh);
        this.scene.add(mesh);
      }
      const p = this.worldFromGame(projectile.x, projectile.y, projectile.type === "mage" ? .72 : .62);
      mesh.position.copy(p);
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
        if (particle.kind === "debris") {
          const blockSize = .035 + particle.size * .006;
          mesh = new THREE.Mesh(
            new THREE.BoxGeometry(blockSize, blockSize, blockSize),
            new THREE.MeshStandardMaterial({ color: particle.color, roughness: .82, transparent: true })
          );
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        } else {
          mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.025 + particle.size * .004), new THREE.MeshBasicMaterial({ color: particle.color, transparent: true }));
        }
        this.particleMeshes.set(particle, mesh);
        this.scene.add(mesh);
      }
      if (particle.kind === "debris") {
        const p = this.worldFromGame(particle.x, particle.y, particle.height);
        mesh.position.copy(p);
        mesh.rotation.set(particle.rotationX, particle.rotationY, particle.rotationZ);
        mesh.material.opacity = particle.settled && particle.groundTimer < .45 ? Math.max(0, particle.groundTimer / .45) : 1;
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
      this.rangeDisc.material.color.setHex(chosen.specialization === "frost" ? 0x8fe8f4 : 0xf2d682);
    } else if (state.selectedBuild && state.selectedBuild !== "mine" && hoverCell) {
      const base = this.config.towerTypes[state.selectedBuild];
      this.rangeDisc.visible = true;
      this.rangeDisc.position.set(hoverCell.col - this.config.COLS / 2 + .5, .17, hoverCell.row - this.config.ROWS / 2 + .5);
      this.rangeDisc.scale.setScalar(base.range / this.config.CELL);
      this.rangeDisc.material.color.setHex(0xe7d88d);
    } else this.rangeDisc.visible = false;

    if (state.selectedBuild && hoverCell) {
      const valid = canPlace(hoverCell.col, hoverCell.row) && state.gold >= this.config.towerTypes[state.selectedBuild].cost;
      this.hoverTile.visible = true;
      this.hoverTile.position.set(hoverCell.col - this.config.COLS / 2 + .5, .2, hoverCell.row - this.config.ROWS / 2 + .5);
      this.hoverTile.material.color.setHex(valid ? 0xbfe184 : 0xcc4d42);
    } else this.hoverTile.visible = false;
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

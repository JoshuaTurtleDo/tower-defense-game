"use strict";

// Legacy 2D drawing helpers retained as a lightweight fallback/reference renderer.

function draw() {
  graphics3D.render(state, hoverCell, canPlace, towerStats);
}

function drawGround() {
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#587248");
  gradient.addColorStop(1, "#3e5939");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = .13;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const n = hash(x * 17 + y * 47);
      ctx.fillStyle = n > .5 ? "#91a36e" : "#263e2a";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
  ctx.globalAlpha = 1;
}

function drawPath() {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(34,31,24,.25)";
  ctx.lineWidth = 70;
  tracePath();
  ctx.stroke();
  ctx.strokeStyle = "#a38b68";
  ctx.lineWidth = 61;
  tracePath();
  ctx.stroke();
  ctx.strokeStyle = "rgba(218,191,143,.2)";
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 15]);
  tracePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

function tracePath() {
  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  for (let i = 1; i < pathPoints.length; i++) ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
}

function drawScenery() {
  const trees = [[.3,1.4,1], [1.15,.5,.8], [3.1,.35,1.1], [4.25,.75,.75], [6.45,.55,1], [8.4,.6,.9], [10.7,.45,1.15], [11.5,2.2,.9], [.55,4.1,1.1], [1.25,5.8,.85], [3.5,5.4,1], [5.7,6.35,.8], [7.4,6.55,1.1], [8.6,6.7,.8], [11.2,7,.9]];
  for (const [gx, gy, s] of trees) drawTree(gx * CELL, gy * CELL, s);
  drawKeep(905, 442);
  drawCamp(25, 80);
}

function drawTree(x, y, scale) {
  ctx.fillStyle = "rgba(20,25,16,.28)";
  ctx.beginPath(); ctx.ellipse(x + 5, y + 13, 24 * scale, 10 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#493c29"; ctx.fillRect(x - 3 * scale, y, 6 * scale, 20 * scale);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 0 ? "#243e2c" : i === 1 ? "#2d4b32" : "#38583a";
    ctx.beginPath(); ctx.arc(x + (i - 1) * 7 * scale, y - (3 + i * 4) * scale, (14 - i) * scale, 0, Math.PI * 2); ctx.fill();
  }
}

function drawKeep(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(22,20,17,.35)"; ctx.fillRect(-34, 9, 68, 61);
  ctx.fillStyle = "#68675e"; ctx.fillRect(-31, -2, 62, 61);
  ctx.fillStyle = "#77756a";
  for (const ox of [-30, -10, 10]) ctx.fillRect(ox, -12, 14, 16);
  ctx.fillStyle = "#33312d"; ctx.fillRect(-8, 31, 16, 28);
  ctx.fillStyle = "#b7a36c"; ctx.fillRect(-3, 4, 6, 11);
  ctx.strokeStyle = "rgba(35,33,29,.4)"; ctx.lineWidth = 1;
  for (let yy = 9; yy < 50; yy += 11) { ctx.beginPath(); ctx.moveTo(-31, yy); ctx.lineTo(31, yy); ctx.stroke(); }
  ctx.restore();
}

function drawCamp(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "#6b3a2d"; ctx.beginPath(); ctx.moveTo(-24, 18); ctx.lineTo(0, -8); ctx.lineTo(25, 18); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#33261e"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0,-15); ctx.lineTo(0,22); ctx.stroke();
  ctx.fillStyle = "#a44334"; ctx.beginPath(); ctx.moveTo(1,-13); ctx.lineTo(21,-7); ctx.lineTo(1,1); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawPlacement() {
  if (!state.selectedBuild || !hoverCell) return;
  const { col, row } = hoverCell;
  const valid = canPlace(col, row) && state.gold >= towerTypes[state.selectedBuild].cost;
  const x = col * CELL;
  const y = row * CELL;
  ctx.fillStyle = valid ? "rgba(203,220,139,.28)" : "rgba(191,73,58,.32)";
  ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
  const range = towerTypes[state.selectedBuild].range;
  ctx.fillStyle = valid ? "rgba(222,228,177,.09)" : "rgba(190,60,50,.08)";
  ctx.strokeStyle = valid ? "rgba(237,228,170,.65)" : "rgba(220,90,70,.65)";
  ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

function drawTowers() {
  for (const tower of state.towers) {
    if (state.selectedTower === tower) {
      const stats = towerStats(tower);
      ctx.fillStyle = "rgba(240,220,150,.08)"; ctx.strokeStyle = "rgba(241,215,128,.45)";
      ctx.beginPath(); ctx.arc(tower.x, tower.y, stats.range, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#e4c36b"; ctx.lineWidth = 2; ctx.strokeRect(tower.col * CELL + 5, tower.row * CELL + 5, CELL - 10, CELL - 10);
    }
    drawTower(tower);
  }
}

function drawTower(tower) {
  ctx.save(); ctx.translate(tower.x, tower.y);
  ctx.fillStyle = "rgba(20,18,14,.3)"; ctx.beginPath(); ctx.ellipse(5, 20, 28, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5c5a52"; ctx.beginPath(); ctx.arc(0, 5, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#77746a"; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#3e3c38"; ctx.lineWidth = 3; ctx.stroke();
  const color = tower.type === "mage" && tower.specialization === "frost" ? "#8fe8f4" : towerTypes[tower.type].color;
  if (tower.type === "mage") {
    ctx.fillStyle = "#3f3452"; ctx.beginPath(); ctx.moveTo(-16, 12); ctx.lineTo(0,-25); ctx.lineTo(16,12); ctx.closePath(); ctx.fill();
    ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0,-23,6 + tower.level,0,Math.PI*2); ctx.fill();
  } else {
    ctx.rotate(tower.angle);
    ctx.strokeStyle = tower.type === "archer" ? "#392c1d" : "#30291f";
    ctx.lineWidth = tower.type === "archer" ? 4 : 7;
    ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(20,0); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(22,0); ctx.lineTo(10,-5); ctx.lineTo(10,5); ctx.closePath(); ctx.fill();
    if (tower.type === "archer") { ctx.strokeStyle = "#c9b170"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(3,0,13,-1.15,1.15); ctx.stroke(); }
  }
  ctx.restore();
  for (let i = 0; i < tower.level; i++) {
    ctx.fillStyle = "#e3bd60"; ctx.beginPath(); ctx.arc(tower.x - 7 + i * 7, tower.y + 28, 2.2, 0, Math.PI * 2); ctx.fill();
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    const base = enemyTypes[enemy.type];
    const bob = Math.sin(state.elapsed * (enemy.type === "dragon" ? 3 : 7) + enemy.phase) * (enemy.type === "dragon" ? 2.2 : 1.1);
    ctx.save();
    ctx.translate(enemy.x, enemy.y + bob);
    if (enemy.slowTimer > 0) {
      ctx.fillStyle = "rgba(115,220,239,.18)";
      ctx.strokeStyle = "rgba(152,235,245,.72)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 9 * base.scale, 16 * base.scale, 8 * base.scale, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "rgba(20,15,12,.3)";
    ctx.beginPath();
    ctx.ellipse(3, 15 * base.scale, 14 * base.scale, 6 * base.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(enemy.facing * base.scale, base.scale);
    drawEnemySprite(enemy.type, enemy.hitFlash > 0, enemy.phase);
    ctx.restore();
    const barWidth = base.barWidth;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = "rgba(27,20,16,.78)"; ctx.fillRect(enemy.x - barWidth / 2, enemy.y - base.barOffset, barWidth, 4);
    ctx.fillStyle = ratio > .5 ? "#75a552" : ratio > .25 ? "#d19b42" : "#bb4b3e"; ctx.fillRect(enemy.x - barWidth / 2, enemy.y - base.barOffset, barWidth * ratio, 4);
  }
}

function drawEnemySprite(type, hit, phase) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (type === "goblin") drawGoblin(hit);
  else if (type === "skeleton") drawSkeleton(hit);
  else if (type === "orc") drawOrc(hit);
  else if (type === "ogre") drawOgre(hit);
  else drawDragon(hit, phase);
}

function drawGoblin(hit) {
  const skin = hit ? "#fff1cf" : "#76964a";
  ctx.fillStyle = "#6c3528";
  ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(7, 4); ctx.lineTo(5, 17); ctx.lineTo(-5, 17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(-17, -9); ctx.lineTo(-9, 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(7, -5); ctx.lineTo(17, -9); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -3, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#231d15"; ctx.beginPath(); ctx.arc(-4, -5, 1.4, 0, Math.PI * 2); ctx.arc(4, -5, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d9c9a2"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(0, 5); ctx.lineTo(3, 3); ctx.stroke();
  ctx.strokeStyle = "#4b3422"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(16, 15); ctx.stroke();
  ctx.fillStyle = "#cbc2a2"; ctx.beginPath(); ctx.moveTo(15, 14); ctx.lineTo(19, 18); ctx.lineTo(13, 17); ctx.closePath(); ctx.fill();
}

function drawSkeleton(hit) {
  const bone = hit ? "#fff7df" : "#d8d0b7";
  ctx.strokeStyle = "#403b32"; ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 17); ctx.moveTo(0, 9); ctx.lineTo(-9, 14); ctx.moveTo(0, 9); ctx.lineTo(9, 14); ctx.moveTo(0, 16); ctx.lineTo(-6, 22); ctx.moveTo(0, 16); ctx.lineTo(7, 22); ctx.stroke();
  ctx.strokeStyle = bone; ctx.lineWidth = 2.4; ctx.stroke();
  ctx.fillStyle = bone; ctx.beginPath(); ctx.arc(0, -4, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#39342c"; ctx.beginPath(); ctx.ellipse(-3.4, -5, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.ellipse(3.4, -5, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(-1.8, 2); ctx.lineTo(1.8, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#625b4e"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5, 4); ctx.lineTo(5, 4); ctx.moveTo(-3, 4); ctx.lineTo(-3, 7); ctx.moveTo(0, 4); ctx.lineTo(0, 7); ctx.moveTo(3, 4); ctx.lineTo(3, 7); ctx.stroke();
  ctx.strokeStyle = "#b6aa8e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(9, 13); ctx.lineTo(15, 2); ctx.stroke();
  ctx.fillStyle = "#a5a095"; ctx.beginPath(); ctx.moveTo(15, 1); ctx.lineTo(12, 7); ctx.lineTo(18, 5); ctx.closePath(); ctx.fill();
}

function drawOrc(hit) {
  const skin = hit ? "#fff1cf" : "#5f7c43";
  ctx.fillStyle = "#424a48"; ctx.beginPath(); ctx.ellipse(0, 8, 13, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#72756f"; ctx.beginPath(); ctx.arc(-11, 3, 6, 0, Math.PI * 2); ctx.arc(11, 3, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, -5, 11, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#28231b"; ctx.beginPath(); ctx.moveTo(-11, -9); ctx.lineTo(-5, -16); ctx.lineTo(0, -11); ctx.lineTo(6, -16); ctx.lineTo(11, -8); ctx.lineTo(7, -11); ctx.lineTo(-7, -11); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#221d17"; ctx.beginPath(); ctx.arc(-4, -6, 1.5, 0, Math.PI * 2); ctx.arc(4, -6, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#eee1ba"; ctx.beginPath(); ctx.moveTo(-6, 1); ctx.lineTo(-3, 8); ctx.lineTo(-1, 2); ctx.closePath(); ctx.moveTo(6, 1); ctx.lineTo(3, 8); ctx.lineTo(1, 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#25211a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, 7); ctx.lineTo(18, 18); ctx.stroke();
  ctx.fillStyle = "#77766e"; ctx.fillRect(14, 13, 7, 6);
}

function drawOgre(hit) {
  const skin = hit ? "#fff1cf" : "#82794c";
  ctx.fillStyle = "#503b2c"; ctx.beginPath(); ctx.ellipse(0, 8, 15, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(0, 7, 12, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -8, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#30271c"; ctx.beginPath(); ctx.arc(-4, -9, 1.4, 0, Math.PI * 2); ctx.arc(4, -9, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#473a28"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, -3); ctx.quadraticCurveTo(0, 1, 6, -3); ctx.stroke();
  ctx.fillStyle = "#d8c59d"; ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(6, 3); ctx.lineTo(8, -2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#49321f"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(11, 3); ctx.lineTo(20, 20); ctx.stroke();
  ctx.fillStyle = "#62513c"; ctx.beginPath(); ctx.ellipse(10, 1, 6, 9, -.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#aa9b73"; ctx.fillRect(-11, 6, 22, 4);
}

function drawDragon(hit, phase) {
  const wingLift = Math.sin(state.elapsed * 5 + phase) * 3;
  const hide = hit ? "#fff0d2" : "#a43c30";
  const darkHide = hit ? "#f4d7b9" : "#64251f";
  ctx.fillStyle = "rgba(126,38,29,.85)";
  ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(-28, -13 - wingLift); ctx.lineTo(-22, 8); ctx.lineTo(-10, 14); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, 3); ctx.lineTo(28, -13 - wingLift); ctx.lineTo(22, 8); ctx.lineTo(10, 14); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#51201c"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-26, -10 - wingLift); ctx.moveTo(8, 4); ctx.lineTo(26, -10 - wingLift); ctx.stroke();
  ctx.fillStyle = hide; ctx.beginPath(); ctx.ellipse(0, 7, 11, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = darkHide; ctx.beginPath(); ctx.moveTo(-4, 18); ctx.quadraticCurveTo(-12, 29, -3, 35); ctx.lineTo(2, 30); ctx.quadraticCurveTo(-5, 28, 4, 19); ctx.closePath(); ctx.fill();
  ctx.fillStyle = hide; ctx.beginPath(); ctx.ellipse(0, -10, 10, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-7, -15); ctx.lineTo(-12, -24); ctx.lineTo(-2, -17); ctx.closePath(); ctx.moveTo(7, -15); ctx.lineTo(12, -24); ctx.lineTo(2, -17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f1c35d"; ctx.beginPath(); ctx.arc(-3.5, -12, 1.5, 0, Math.PI * 2); ctx.arc(3.5, -12, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e5c78c"; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-2, 0); ctx.lineTo(0, -5); ctx.moveTo(5, -5); ctx.lineTo(2, 0); ctx.lineTo(0, -5); ctx.fill();
  ctx.fillStyle = "#d48a36"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4, 9); ctx.lineTo(0, 6); ctx.lineTo(4, 9); ctx.closePath(); ctx.fill();
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    ctx.save();
    ctx.shadowColor = p.color; ctx.shadowBlur = p.type === "mage" ? 14 : 2;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.type === "mage" ? 5 : 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawPaused() {
  ctx.fillStyle = "rgba(15,13,10,.55)"; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = "#eee4c8"; ctx.textAlign = "center"; ctx.font = "34px Georgia"; ctx.fillText("Battle Paused", W/2, H/2);
  ctx.font = "13px Inter, sans-serif"; ctx.fillStyle = "#bdb39d"; ctx.fillText("Press the pause button to continue", W/2, H/2 + 29);
}

function hash(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

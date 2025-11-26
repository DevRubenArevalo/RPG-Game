export class Renderer {
  constructor({ state, gameOverManager, markerSpacing, acidDebuffDuration, damageLifetime }) {
    this.state = state;
    this.canvas = state.canvas;
    this.ctx = state.ctx;
    this.gameOverManager = gameOverManager;
    this.markerSpacing = markerSpacing;
    this.acidDebuffDuration = acidDebuffDuration;
    this.damageLifetime = damageLifetime;
  }

  draw() {
    const { state, ctx, canvas } = this;
    const {
      player,
      camera,
      world,
      traps,
      platforms,
      trailSegments,
      slimeGlobs,
      slimeChunks,
      coins,
      enemyProjectiles,
      enemies,
      damageNumbers,
      damageNumbers: damageNums,
      coinImage,
      highScores,
      godMode,
    } = state;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawParallaxBackground();
    if (state.gameOver) {
      this.drawGameOverScene();
      return;
    }
    ctx.save();
    ctx.translate(-camera.x, 0);
    ctx.fillStyle = '#162344';
    const groundStart = camera.x - 200;
    ctx.fillRect(groundStart, world.groundY, canvas.width + 400, canvas.height - world.groundY);
    const markerStart = Math.max(0, Math.floor((camera.x - this.markerSpacing * 2) / this.markerSpacing) * this.markerSpacing);
    const markerEnd = camera.x + canvas.width + this.markerSpacing;
    for (let mark = markerStart; mark <= markerEnd; mark += this.markerSpacing) {
      ctx.fillStyle = 'rgba(53, 208, 186, 0.35)';
      ctx.fillRect(mark - 1, world.groundY - 6, 2, 6);
    }
    ctx.fillStyle = '#ff5d6c';
    ctx.font = '12px Arial';
    highScores.forEach((score, index) => {
      if (score >= markerStart && score <= markerEnd) {
        ctx.fillRect(score - 2, world.groundY - 14 - index * 10, 4, 14);
        ctx.fillText(`HS${index + 1}`, score, world.groundY - 18 - index * 10);
      }
    });
    traps.forEach((trap) => {
      ctx.fillStyle = '#60192a';
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
      ctx.fillStyle = '#a9334b';
      ctx.fillRect(trap.x + 4, trap.y + 4, trap.w - 8, trap.h - 8);
    });
    platforms.forEach((plat) => {
      ctx.fillStyle = plat.color;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      if (plat.integrity < plat.maxIntegrity) {
        const wear = Math.min(1, 1 - (plat.integrity / plat.maxIntegrity));
        ctx.fillStyle = `rgba(93, 255, 186, ${0.35 * wear})`;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(plat.x + 0.5, plat.y + 0.5, plat.w - 1, plat.h - 1);
    });
    trailSegments.forEach((seg) => {
      const alpha = seg.life / seg.maxLife;
      ctx.fillStyle = `rgba(93, 255, 186, ${0.12 + 0.3 * alpha})`;
      ctx.fillRect(seg.x, seg.y, seg.w, seg.h);
      ctx.fillStyle = `rgba(53, 208, 186, ${0.35 * alpha})`;
      ctx.fillRect(seg.x + 8, seg.y + 4, seg.w - 16, seg.h - 8);
    });
    slimeGlobs.forEach((glob) => {
      const alpha = Math.max(0.2, glob.life / 2.6);
      ctx.fillStyle = `rgba(93, 255, 186, ${0.45 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(glob.x + glob.w / 2, glob.y + glob.h / 2, glob.w / 2, glob.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(59, 163, 137, ${0.35 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(glob.x + glob.w / 2, glob.y + glob.h / 2 - 4, glob.w / 3, glob.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    slimeChunks.forEach((chunk) => {
      ctx.fillStyle = '#5dffba';
      ctx.fillRect(chunk.x, chunk.y, chunk.w, chunk.h);
      ctx.fillStyle = '#3ba389';
      ctx.fillRect(chunk.x + 3, chunk.y + 3, chunk.w - 6, chunk.h - 6);
    });
    coins.forEach((coin) => {
      if (coinImage.complete) {
        ctx.drawImage(coinImage, coin.x, coin.y, coin.w, coin.h);
      } else {
        ctx.fillStyle = '#ffd25d';
        ctx.beginPath();
        ctx.arc(coin.x + coin.w / 2, coin.y + coin.h / 2, coin.w / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    enemyProjectiles.forEach((proj) => {
      if (proj.reflected) {
        ctx.fillStyle = '#35d0ba';
        ctx.strokeStyle = '#d9fef9';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.95;
        ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
        ctx.strokeRect(proj.x, proj.y, proj.w, proj.h);
      } else {
        ctx.fillStyle = '#ffd25d';
        ctx.globalAlpha = 0.85;
        ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
      }
      ctx.globalAlpha = 1;
    });
    const invuln = player.invulnTimer > 0;
    if (invuln) {
      const flash = 0.5 + 0.5 * Math.sin(performance.now() * 0.02);
      ctx.globalAlpha = 0.4 + 0.5 * flash;
    }
    const idleBreathe = 1 + 0.04 * Math.sin(player.idleTimer * 3.2);
    const idleSquish = 1 - 0.04 * Math.sin(player.idleTimer * 3.2 + Math.PI / 2);
    const squishX = (1 + player.squish * 0.5) * idleBreathe;
    const squishY = Math.max(0.4, 1 - player.squish * 0.5) * idleSquish;
    const baseX = player.x + player.w / 2;
    const baseY = player.y + player.h - 10;
    if (player.wallMode) {
      ctx.fillStyle = player.color;
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.fillStyle = 'rgba(59, 163, 137, 0.8)';
      ctx.fillRect(player.x + 3, player.y + 6, player.w - 6, player.h - 12);
      ctx.strokeStyle = 'rgba(93, 255, 186, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(player.x + 1, player.y + 1, player.w - 2, player.h - 2);
    } else {
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.ellipse(baseX, baseY, (player.w / 2) * squishX, (player.h / 2) * squishY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3ba389';
      ctx.beginPath();
      ctx.ellipse(baseX, baseY - 8, (player.w / 2.5) * squishX, (player.h / 3) * squishY, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (invuln) ctx.globalAlpha = 1;
    if (player.shieldActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(80, 147, 255, 0.5)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(baseX, baseY - player.h / 4, (player.w / 2) * 1.25, (player.h / 2) * 1.25, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    enemies.forEach((enemy) => {
      ctx.fillStyle = enemy.acidTimer > 0 ? '#ffa1b1' : enemy.color;
      ctx.beginPath();
      ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h - 8, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb3bc';
      ctx.beginPath();
      ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h - 14, enemy.w / 2.4, enemy.h / 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (enemy.acidDuration > 0) {
        const acidAlpha = Math.min(0.7, 0.3 + (enemy.acidDuration / this.acidDebuffDuration) * 0.4);
        ctx.fillStyle = `rgba(93, 255, 186, ${acidAlpha})`;
        ctx.beginPath();
        ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h - 10, enemy.w / 2.1, enemy.h / 2.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      this.drawHealthBar(enemy.x + enemy.w / 2, enemy.y - 14, enemy.health, enemy.maxHealth);
    });
    this.drawHealthBar(player.x + player.w / 2, player.y - 20, player.health, player.maxHealth);
    this.drawFlingCooldownIndicator();
    damageNums.forEach((num) => {
      const alpha = Math.max(0, num.life / this.damageLifetime);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`-${num.value}`, num.x, num.y);
    });
    ctx.restore();
    if (godMode) {
      ctx.save();
      ctx.fillStyle = '#ffef5d';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('God Mode Enabled', 20, 40);
      ctx.restore();
    }
    if (!player.alive) {
      ctx.fillStyle = 'rgba(10, 10, 20, 0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff8a9e';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
      ctx.font = '24px Arial';
      ctx.fillText('Refresh to try again.', canvas.width / 2, canvas.height / 2 + 40);
    }
  }

  drawParallaxBackground() {
    const { ctx, canvas, state } = this;
    const cameraX = state.camera.x;
    ctx.fillStyle = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#040816');
    skyGradient.addColorStop(0.45, '#0a1730');
    skyGradient.addColorStop(1, '#071024');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const layers = [
      { speed: 0.12, color: '#0b1831', tree: '#122640', spacing: 240, height: 130, canopy: '#1d3556', offsetY: 160 },
      { speed: 0.25, color: '#0f223f', tree: '#163454', spacing: 180, height: 150, canopy: '#20486e', offsetY: 100 },
      { speed: 0.45, color: '#152b4d', tree: '#20415f', spacing: 140, height: 190, canopy: '#2a5676', offsetY: 60 },
    ];
    layers.forEach((layer) => {
      const rawOffset = (cameraX * layer.speed) % layer.spacing;
      const offset = (rawOffset + layer.spacing) % layer.spacing;
      ctx.fillStyle = layer.color;
      ctx.fillRect(0, canvas.height - layer.offsetY, canvas.width, layer.offsetY);
      for (let x = -offset; x < canvas.width + layer.spacing; x += layer.spacing) {
        this.drawTree(x, canvas.height - layer.offsetY, layer.height, layer.tree, layer.canopy);
      }
    });
  }

  drawTree(x, baseY, height, trunkColor, canopyColor) {
    const { ctx } = this;
    const trunkWidth = 12;
    ctx.fillStyle = trunkColor;
    ctx.fillRect(x, baseY - height, trunkWidth, height);
    ctx.fillStyle = canopyColor;
    const canopyWidth = trunkWidth * 3.8;
    const canopyHeight = height * 0.45;
    ctx.beginPath();
    ctx.moveTo(x - canopyWidth / 2, baseY - height * 0.55);
    ctx.lineTo(x + trunkWidth / 2, baseY - height - canopyHeight);
    ctx.lineTo(x + trunkWidth + canopyWidth / 2, baseY - height * 0.55);
    ctx.closePath();
    ctx.fill();
  }

  drawGameOverTears(ease) {
    const { ctx, state } = this;
    if (!state.gameOverTears.length) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.4 + ease * 0.6);
    state.gameOverTears.forEach((tear) => {
      const gradient = ctx.createLinearGradient(tear.x, tear.y, tear.x, tear.y + tear.height);
      gradient.addColorStop(0, 'rgba(200, 240, 255, 0.95)');
      gradient.addColorStop(1, 'rgba(93, 160, 255, 0.35)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(tear.x, tear.y);
      ctx.lineTo(tear.x - tear.width / 2, tear.y + tear.height);
      ctx.lineTo(tear.x + tear.width / 2, tear.y + tear.height);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  drawGameOverScene() {
    const { ctx, canvas, state } = this;
    const presentation = this.gameOverManager.getPresentation();
    if (!presentation) return;
    const {
      ease,
      centerX,
      stageTop,
      stageHeight,
      stageWidth,
      stageX,
      currentX,
      currentY,
      displayW,
      displayH,
      settleTime,
      huffStrength,
      eyeOffsetX,
      eyeY,
    } = presentation;
    const breathe = 1 + (0.04 + 0.06 * huffStrength) * Math.sin(state.gameOverState.animTime * 3.4);
    const puff = 1 - (0.04 + 0.05 * huffStrength) * Math.sin(state.gameOverState.animTime * 3.4 + Math.PI / 2);
    ctx.fillStyle = `rgba(5, 7, 20, ${0.75 * ease})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = ease;
    ctx.fillStyle = '#111a2d';
    ctx.fillRect(stageX, stageTop, stageWidth, stageHeight);
    ctx.fillStyle = '#0a101f';
    ctx.fillRect(stageX, stageTop + stageHeight - 18, stageWidth, 18);
    ctx.strokeStyle = '#35d0ba';
    ctx.lineWidth = 2;
    ctx.strokeRect(stageX, stageTop, stageWidth, stageHeight);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = ease;
    ctx.fillStyle = state.player.color;
    ctx.beginPath();
    ctx.ellipse(currentX, currentY, (displayW / 2) * breathe, (displayH / 2) * puff, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3ba389';
    ctx.beginPath();
    ctx.ellipse(currentX, currentY - 12, (displayW / 2.5) * breathe, (displayH / 3) * puff, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0b1f1c';
    ctx.lineWidth = Math.max(3, displayH * 0.04);
    ctx.lineCap = 'round';
    ctx.beginPath();
    const eyeWidth = displayW * 0.15;
    ctx.moveTo(currentX - eyeOffsetX - eyeWidth / 2, eyeY);
    ctx.lineTo(currentX - eyeOffsetX + eyeWidth / 2, eyeY);
    ctx.moveTo(currentX + eyeOffsetX - eyeWidth / 2, eyeY);
    ctx.lineTo(currentX + eyeOffsetX + eyeWidth / 2, eyeY);
    ctx.stroke();
    ctx.restore();
    this.drawGameOverTears(ease);
    ctx.fillStyle = `rgba(255, 138, 158, ${ease})`;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Slime is in pain...', centerX, 140);
    ctx.fillStyle = `rgba(212, 253, 245, ${ease})`;
    ctx.font = '24px Arial';
    ctx.fillText('Continue?', centerX, 180);
  }

  drawHealthBar(centerX, y, health, maxHealth) {
    const { ctx } = this;
    const totalUnits = 10;
    const unitWidth = 12;
    const unitHeight = 6;
    const spacing = 3;
    const barWidth = totalUnits * unitWidth + (totalUnits - 1) * spacing;
    let startX = centerX - barWidth / 2;
    const safeHealth = Math.max(0, Math.min(maxHealth ?? 40, Math.round(health)));
    const purpleCount = Math.max(0, Math.min(totalUnits, Math.floor(safeHealth - 30)));
    const redPotential = Math.max(0, Math.floor(Math.min(safeHealth, 30) - 20));
    const redCount = Math.max(0, Math.min(totalUnits - purpleCount, redPotential));
    const yellowPotential = Math.max(0, Math.floor(Math.min(safeHealth, 20) - 10));
    const yellowCount = Math.max(0, Math.min(totalUnits - purpleCount - redCount, yellowPotential));
    const greenPotential = Math.max(0, Math.min(safeHealth, 10));
    const greenCount = Math.max(0, Math.min(totalUnits - purpleCount - redCount - yellowCount, greenPotential));
    const emptyCount = Math.max(0, totalUnits - purpleCount - redCount - yellowCount - greenCount);
    const segments = [
      ...Array(purpleCount).fill('#c05dff'),
      ...Array(redCount).fill('#ff5d6c'),
      ...Array(yellowCount).fill('#ffd25d'),
      ...Array(greenCount).fill('#5dffba'),
      ...Array(emptyCount).fill('rgba(93, 255, 186, 0.2)'),
    ];
    segments.slice(0, totalUnits).forEach((color) => {
      ctx.strokeStyle = '#09101f';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, y, unitWidth, unitHeight);
      ctx.fillStyle = color;
      ctx.fillRect(startX, y, unitWidth, unitHeight);
      startX += unitWidth + spacing;
    });
  }

  drawFlingCooldownIndicator() {
    const { ctx, state } = this;
    const { player } = state;
    if (state.slimeFlingCooldown <= 0 || state.slimeFlingCooldownMax <= 0) return;
    const size = 36;
    const baseX = player.x + player.w / 2 - size / 2;
    const baseY = player.y - size - 36;
    const remaining = Math.max(0, state.slimeFlingCooldown);
    const total = Math.max(remaining, state.slimeFlingCooldownMax);
    const progress = 1 - remaining / total;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 14, 26, 0.85)';
    ctx.strokeStyle = '#35d0ba';
    ctx.lineWidth = 2;
    ctx.fillRect(baseX, baseY, size, size);
    ctx.strokeRect(baseX, baseY, size, size);
    const centerX = baseX + size / 2;
    const centerY = baseY + size / 2;
    const radius = size / 2 - 6;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(53, 208, 186, 0.75)';
    ctx.lineWidth = 2;
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.fillStyle = 'rgba(53, 208, 186, 0.45)';
    ctx.arc(centerX, centerY, radius - 2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d9fef9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - radius + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.lineTo(centerX + (radius - 6) * Math.cos(-Math.PI / 2 + progress * Math.PI * 2), centerY + (radius - 6) * Math.sin(-Math.PI / 2 + progress * Math.PI * 2));
    ctx.stroke();
    ctx.fillStyle = '#f2fffb';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(remaining.toFixed(1), centerX, centerY + 4);
    ctx.restore();
  }
}

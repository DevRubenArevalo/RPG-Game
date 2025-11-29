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
    let {
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
      boss,
      cameraZoom = 1,
    } = state;
    
    // Use cinematic camera if active (for defeat sequence)
    if (state.cinematicCameraX != null) {
      camera = { x: state.cinematicCameraX, y: state.cinematicCameraY };
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawParallaxBackground();
    
    // Only render opening cutscene, skip main game rendering
    if (state.openingCutscene) {
      if (!state.rendererDebugLogged) {
        console.log('🎨 Renderer: Rendering cutscene only, hiding main game');
        state.rendererDebugLogged = true;
      }
      
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(cameraZoom, cameraZoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      ctx.translate(-camera.x, 0);
      
      // Draw floor (same as main game)
      ctx.fillStyle = '#162344';
      ctx.fillRect(camera.x - 200, world.groundY, canvas.width + 400, canvas.height - world.groundY);
      
      // Draw slime king statue
      if (state.slimeKingStatue) {
        this.drawSlimeKingStatue(state.slimeKingStatue);
      }
      
      // Draw poison pool and particles on top of floor
      if (state.poisonPool) {
        this.drawPoisonPool(state.poisonPool);
      }
      if (state.poisonParticles && state.poisonParticles.length > 0) {
        this.drawPoisonParticles(state.poisonParticles);
      }
      
      // Draw regeneration particles (healing effect on player)
      if (state.regenerationParticles && state.regenerationParticles.length > 0) {
        this.drawRegenerationParticles(state.regenerationParticles);
      }
      
      // Draw player
      const invuln = player.invulnTimer > 0;
      if (invuln) ctx.globalAlpha = 0.5;
      const idleBreathe = 1 + 0.02 * Math.sin(player.idleTimer * 2.5);
      const idleSquish = 1 - 0.04 * Math.sin(player.idleTimer * 3.2 + Math.PI / 2);
      const duckTransition = player.duckTransition || 0;
      const duckSquish = 0.6 * duckTransition + 1 * (1 - duckTransition);
      const squishX = (1 + player.squish * 0.5) * idleBreathe * (1 + duckTransition * 1);  // 2x wider when ducking
      const squishY = Math.max(0.4, 1 - player.squish * 0.5) * idleSquish * duckSquish;
      const baseX = player.x + player.w / 2;
      const baseY = player.y + player.h - 10;
      const eyeOffsetY = 8 - duckTransition * 6;  // Smoothly transition from 8 to 2
      
      // Keep visual center fixed by not adjusting - ellipse already centers correctly
      const visualBaseX = baseX;
      
      // Draw mutation pulse effect if active
      if (player.mutationTimer > 0) {
        const mutationPulse = 1 - (player.mutationTimer / 0.6); // 0 to 1 over 0.6 seconds
        const pulseSize = 1 + mutationPulse * 0.5; // Expands outward
        const pulseAlpha = (1 - mutationPulse) * 0.6; // Fades out
        ctx.fillStyle = `rgba(100, 255, 150, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.ellipse(visualBaseX, baseY, (player.w / 2) * squishX * pulseSize, (player.h / 2) * squishY * pulseSize, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.ellipse(visualBaseX, baseY, (player.w / 2) * squishX, (player.h / 2) * squishY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3ba389';
      ctx.beginPath();
      ctx.ellipse(visualBaseX, baseY - eyeOffsetY, (player.w / 2.5) * squishX, (player.h / 3) * squishY, 0, 0, Math.PI * 2);
      ctx.fill();
      
      if (invuln) ctx.globalAlpha = 1;
      
      // Draw health bar with pop-in animation during spawn
      if (state.spawnAnimationProgress !== undefined) {
        ctx.save();
        
        // Pop-in scale animation (0.3 to 1.0)
        const popProgress = Math.min(1, state.spawnAnimationProgress * 2);
        const popScale = 0.3 + popProgress * 0.7;
        
        // Get health bar position
        const healthBarY = baseY - player.h / 2 - 30;
        
        // Apply scale transformation centered on health bar
        ctx.translate(baseX, healthBarY);
        ctx.scale(popScale, popScale);
        ctx.translate(-baseX, -healthBarY);
        
        // Draw normal health bar using standard function
        this.drawHealthBar(baseX, healthBarY, player.health, player.maxHealth);
        
        ctx.restore();
      }
      
      // Draw dialog bubble if pedestal text is visible
      if (state.pedestalTextVisible && state.pedestalTextDialog) {
        ctx.restore(); // Restore transform to draw dialog in screen space
        this.drawDialogBubble(
          state.pedestalTextDialog.x,
          state.pedestalTextDialog.y,
          state.pedestalTextDialog.text,
          state.pedestalTextDialog.maxWidth
        );
        return;
      }
      
      // Draw interact prompt if player is near statue
      // Prompt is hidden - dialog only shows when F is pressed
      
      
      ctx.restore();
      return;
    }
    
    if (state.gameOver) {
      this.drawGameOverScene();
      return;
    }
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(cameraZoom, cameraZoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
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
      if (trap.type === 'lava') {
        // Draw lava trap
        ctx.fillStyle = '#60192a';
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        ctx.fillStyle = '#a9334b';
        ctx.fillRect(trap.x + 4, trap.y + 4, trap.w - 8, trap.h - 8);
      } else {
        // Draw spike trap - shiny steel
        // Draw trap base - dark gray with black border
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h / 2);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(trap.x, trap.y, trap.w, trap.h / 2);
        
        // Draw shiny highlight
        ctx.fillStyle = 'rgba(200, 200, 200, 0.6)';
        ctx.fillRect(trap.x + 2, trap.y + 2, trap.w - 4, trap.h / 4);
        
        // Draw spikes
        const spikeCount = Math.ceil(trap.w / 12);
        for (let i = 0; i < spikeCount; i++) {
          const spikeX = trap.x + (i * trap.w / spikeCount);
          const spikeWidth = trap.w / spikeCount;
          // Draw spike shadow/dark side
          ctx.fillStyle = '#555555';
          ctx.beginPath();
          ctx.moveTo(spikeX, trap.y + trap.h / 2);
          ctx.lineTo(spikeX + spikeWidth / 2, trap.y - 4);
          ctx.lineTo(spikeX + spikeWidth / 2 - 2, trap.y - 2);
          ctx.fill();
          // Draw spike light side
          ctx.fillStyle = '#cccccc';
          ctx.beginPath();
          ctx.moveTo(spikeX + spikeWidth / 2, trap.y - 4);
          ctx.lineTo(spikeX + spikeWidth, trap.y + trap.h / 2);
          ctx.lineTo(spikeX + spikeWidth / 2 + 2, trap.y - 2);
          ctx.fill();
          // Draw spike outline
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(spikeX, trap.y + trap.h / 2);
          ctx.lineTo(spikeX + spikeWidth / 2, trap.y - 4);
          ctx.lineTo(spikeX + spikeWidth, trap.y + trap.h / 2);
          ctx.closePath();
          ctx.stroke();
        }
      }
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
    if (state.debugShowCollisions) {
      this.drawPlayerCollisionDebug(player);
      enemyProjectiles.forEach((proj) => this.drawProjectileCollisionDebug(proj));
    }
    if (boss) {
      this.drawBoss(boss);
      if (state.debugShowCollisions) {
        this.drawBossCollisionDebug(boss);
      }
      this.drawBossHealthBarsWorld(boss);
      this.drawBossRoarWave(boss);
    }
    enemies.forEach((enemy) => {
      if (enemy.isBoss) return;
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
      const enemyHealthBarData = this.drawHealthBar(enemy.x + enemy.w / 2, enemy.y - 14, enemy.health, enemy.maxHealth);
      // Draw enemy buffs if any
      this.drawBuffsNextToHealthBar(enemyHealthBarData, enemy.buffs || []);
    });
    const playerHealthBarData = this.drawHealthBar(player.x + player.w / 2, player.y - 20, player.health, player.maxHealth);
    // Draw player buffs if any, with test buff
    const playerBuffs = player.buffs || [{ label: 'T', color: '#ffd25d' }];
    this.drawBuffsNextToHealthBar(playerHealthBarData, playerBuffs);
    this.drawFlingCooldownIndicator();
    
    // Draw poison pool and particles
    if (state.poisonPool) {
      this.drawPoisonPool(state.poisonPool);
    }
    if (state.poisonParticles && state.poisonParticles.length > 0) {
      this.drawPoisonParticles(state.poisonParticles);
    }
    
    damageNums.forEach((num) => {
      const alpha = Math.max(0, num.life / this.damageLifetime);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`-${num.value}`, num.x, num.y);
    });
    if (state.debugShowCollisions) {
      this.drawAllCollisionDebug(state, platforms, traps, world);
    }
    
    ctx.restore();
    
    // Draw defeat cinematic particles and rain (after restore to use screen coordinates)
    if (state.defeatCinematic) {
      this.drawDefeatCinematicElements(state.defeatCinematic);
    }
    
    if (godMode) {
      ctx.save();
      ctx.fillStyle = '#ffef5d';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('God Mode Enabled', 20, 40);
      ctx.restore();
    }
    if (state.debugShowBossStats && state.boss) {
      this.drawBossStatsWindow(state.boss);
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

  drawDefeatCinematicElements(defeatCinematic) {
    const { ctx, canvas } = this;
    
    // Draw white flash first (background)
    if (this.state.whiteFlash) {
      const flash = this.state.whiteFlash;
      const fadeStart = flash.fadeStart || 0;
      const timeSinceFadeStart = flash.timer - fadeStart;
      const fadeDuration = flash.duration - fadeStart;
      
      // Two-phase fade: quick peak, then slow fade
      let alpha;
      if (flash.timer < fadeStart) {
        // Initial bright white phase
        alpha = Math.min(flash.timer / fadeStart, 1);
      } else {
        // Smooth fade out phase
        alpha = Math.max(0, 1 - (timeSinceFadeStart / fadeDuration));
      }
      
      // Only draw if alpha is greater than 0
      if (alpha > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }
    
    // Draw explosion particles (white, subtle)
    ctx.save();
    defeatCinematic.explosionParticles.forEach((p) => {
      const alpha = (p.life / p.maxLife) * 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
    
    // Rain collection counter hidden from player - tracked internally only
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
    
    // Draw smiling face if level complete
    if (state.levelComplete && state.bossDefeated) {
      const mouthY = eyeY + displayH * 0.15;
      const mouthWidth = displayW * 0.2;
      ctx.strokeStyle = '#0b1f1c';
      ctx.lineWidth = Math.max(2, displayH * 0.03);
      ctx.beginPath();
      ctx.arc(currentX, mouthY, mouthWidth / 2, 0, Math.PI);
      ctx.stroke();
    }
    
    ctx.restore();
    this.drawGameOverTears(ease);
    ctx.fillStyle = `rgba(255, 138, 158, ${ease})`;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Slime is in pain...' + (state.deathMessage ? ' ' + state.deathMessage : ''), centerX, 140);
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
    return { barStartX: centerX - barWidth / 2, barEndX: centerX + barWidth / 2, barY: y, barHeight: unitHeight };
  }

  drawBuffsNextToHealthBar(healthBarData, buffs = []) {
    const { ctx } = this;
    const buffSize = healthBarData.barHeight * 2; // 2 health bar heights per buff
    const buffSpacing = 2;
    let buffX = healthBarData.barEndX + buffSpacing;
    const buffY = healthBarData.barY;

    buffs.forEach((buff) => {
      // Draw buff box
      ctx.strokeStyle = buff.color || '#5dffba';
      ctx.lineWidth = 1;
      ctx.strokeRect(buffX, buffY, buffSize, buffSize);
      
      // Draw buff background
      ctx.fillStyle = `${buff.color || '#5dffba'}33`;
      ctx.fillRect(buffX, buffY, buffSize, buffSize);
      
      // Draw buff icon/text
      ctx.fillStyle = buff.color || '#5dffba';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(buff.label || '●', buffX + buffSize / 2, buffY + buffSize / 2);
      
      buffX += buffSize + buffSpacing;
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

  drawBoss(boss) {
    const { ctx } = this;
    
    // Don't draw if invisible (after explosion)
    if (boss.invisible) {
      return;
    }
    
    ctx.save();
    
    // Handle defeat morphing and swelling
    if (boss.defeatMorphMode === 'amoeba') {
      this.drawBossAmoeba(ctx, boss);
      ctx.restore();
      return;
    }
    
    const baseColor = boss.color || '#35d0ba';
    const flashAlpha = boss.hitFlash ? Math.min(1, boss.hitFlash * 4) : 0;
    const fillColor = flashAlpha > 0 ? `rgba(255, 255, 255, ${flashAlpha})` : baseColor;
    const blend = Math.max(0, Math.min(1, boss.morphBlend ?? (boss.morphMode === 'square' ? 1 : 0)));
    const radius = (boss.w / 2) * (1 - blend);
    const centerX = boss.x + boss.w / 2;
    const centerY = boss.y + boss.h / 2;
    ctx.fillStyle = fillColor;
    this.drawRoundedRect(ctx, boss.x, boss.y, boss.w, boss.h, radius);
    ctx.fillStyle = 'rgba(45, 147, 122, 0.85)';
    const inset = 0.15 - blend * 0.05;
    this.drawRoundedRect(
      ctx,
      boss.x + boss.w * inset,
      boss.y + boss.h * inset,
      boss.w * (1 - inset * 2),
      boss.h * (1 - inset * 2),
      Math.max(4, radius * 0.6),
    );
    ctx.strokeStyle = '#0b1f1c';
    ctx.lineWidth = Math.max(6, boss.h * 0.04);
    ctx.lineCap = 'round';
    const eyeOffset = boss.w * 0.18;
    const eyeWidth = boss.w * 0.14;
    const eyeY = boss.y + boss.h * 0.55;
    ctx.beginPath();
    ctx.moveTo(centerX - eyeOffset - eyeWidth / 2, eyeY);
    ctx.lineTo(centerX - eyeOffset + eyeWidth / 2, eyeY);
    ctx.moveTo(centerX + eyeOffset - eyeWidth / 2, eyeY);
    ctx.lineTo(centerX + eyeOffset + eyeWidth / 2, eyeY);
    ctx.stroke();
    if (boss.bossPhase === 'windup') {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
      ctx.strokeStyle = `rgba(255, 210, 93, ${0.35 + pulse * 0.3})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(centerX, boss.groundY, boss.w * 0.65, boss.h * 0.1 + pulse * 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBossAmoeba(ctx, boss) {
    const centerX = boss.x + boss.w / 2;
    const centerY = boss.y + boss.h / 2;
    const morphProgress = boss.defeatMorphProgress ?? 0;
    const swellProgress = boss.defeatSwellProgress ?? 0;
    
    // Base radius
    let baseRadius = boss.w / 2;
    
    // Swell effect: pulses outward then contracts
    const swellAmount = Math.sin(swellProgress * Math.PI) * baseRadius * 0.3;
    const currentRadius = baseRadius + swellAmount;
    
    // Draw amoeba with wavy edges
    const waveCount = 6 + Math.floor(morphProgress * 4);
    const waveAmplitude = baseRadius * 0.15 * (1 + morphProgress * 0.5);
    
    ctx.fillStyle = '#20d9d9';
    ctx.beginPath();
    
    for (let i = 0; i <= waveCount * 2; i++) {
      const angle = (i / (waveCount * 2)) * Math.PI * 2;
      const wave = Math.sin(angle * waveCount + swellProgress * Math.PI * 2) * waveAmplitude;
      const radius = currentRadius + wave;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Inner shading
    ctx.fillStyle = 'rgba(32, 217, 217, 0.5)';
    ctx.beginPath();
    for (let i = 0; i <= waveCount * 2; i++) {
      const angle = (i / (waveCount * 2)) * Math.PI * 2;
      const wave = Math.sin(angle * waveCount + swellProgress * Math.PI * 2) * waveAmplitude;
      const radius = (currentRadius + wave) * 0.5;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Draw eyes if not too far into swell
    if (swellProgress < 0.8) {
      ctx.strokeStyle = '#0b1f1c';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      const eyeOffset = currentRadius * 0.4;
      const eyeY = centerY;
      const eyeWidth = currentRadius * 0.3;
      
      ctx.beginPath();
      ctx.moveTo(centerX - eyeOffset - eyeWidth / 2, eyeY);
      ctx.lineTo(centerX - eyeOffset + eyeWidth / 2, eyeY);
      ctx.moveTo(centerX + eyeOffset - eyeWidth / 2, eyeY);
      ctx.lineTo(centerX + eyeOffset + eyeWidth / 2, eyeY);
      ctx.stroke();
    }
  }

  drawBossCollisionDebug(boss) {
    const { ctx } = this;
    if (!boss) return;
    
    ctx.save();
    
    if (boss.morphMode === 'square') {
      // Draw full rectangle collision visualization (no inset)
      ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
      ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
      
      ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(boss.x, boss.y, boss.w, boss.h);
    } else {
      // Draw full circle collision visualization
      const radius = boss.w / 2;
      const centerX = boss.x + boss.w / 2;
      const centerY = boss.y + boss.h / 2;
      
      ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    ctx.restore();
  }

  drawPlayerCollisionDebug(player) {
    const { ctx } = this;
    if (!player) return;
    
    ctx.save();
    
    // Draw the player's collision circle in blue (matching the visual ellipse)
    const baseX = player.x + player.w / 2;
    const baseY = player.y + player.h - 10;
    
    ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(baseX, baseY, player.w / 2, player.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(50, 150, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(baseX, baseY, player.w / 2, player.h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw a center point for reference
    ctx.fillStyle = 'rgba(50, 150, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(baseX, baseY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  drawEnemyCollisionDebug(enemy) {
    const { ctx } = this;
    if (!enemy) return;
    
    ctx.save();
    
    // Draw enemy collision circle in yellow (matching the visual ellipse)
    const centerX = enemy.x + enemy.w / 2;
    const centerY = enemy.y + enemy.h - 8;
    
    ctx.fillStyle = 'rgba(255, 255, 100, 0.3)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 50, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }

  drawProjectileCollisionDebug(proj) {
    const { ctx } = this;
    if (!proj) return;
    
    ctx.save();
    
    // Draw projectile collision rectangle in orange
    ctx.fillStyle = 'rgba(255, 165, 50, 0.3)';
    ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
    
    ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(proj.x, proj.y, proj.w, proj.h);
    
    ctx.restore();
  }

  drawAllCollisionDebug(state, platforms, traps, world) {
    const { ctx, canvas } = this;
    
    ctx.save();
    
    // Draw ground/floor collision first (so it appears behind other boxes)
    const groundHeight = canvas.height - world.groundY;
    ctx.fillStyle = 'rgba(150, 150, 255, 0.25)';
    ctx.fillRect(state.camera.x - 200, world.groundY, canvas.width + 400, groundHeight);
    
    ctx.strokeStyle = 'rgba(100, 100, 200, 1)';
    ctx.lineWidth = 3;
    ctx.strokeRect(state.camera.x - 200, world.groundY, canvas.width + 400, 2);
    
    // Draw platform collisions in green with higher opacity
    platforms.forEach((plat) => {
      ctx.fillStyle = 'rgba(100, 255, 100, 0.35)';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      
      ctx.strokeStyle = 'rgba(50, 200, 50, 1)';
      ctx.lineWidth = 3;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    });
    
    // Draw traps in dark red with higher opacity
    traps.forEach((trap) => {
      ctx.fillStyle = 'rgba(255, 100, 100, 0.35)';
      ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
      
      ctx.strokeStyle = 'rgba(200, 50, 50, 1)';
      ctx.lineWidth = 3;
      ctx.strokeRect(trap.x, trap.y, trap.w, trap.h);
    });
    
    ctx.restore();
  }

  drawBossHealthBarsWorld(boss) {
    if (!boss) return;
    const rows = 4;
    const perRow = Math.ceil((boss.maxHealth || 160) / rows);
    let rowY = boss.y - 24;
    let firstRowHealthData = null;
    for (let i = 0; i < rows; i++) {
      const chunkStart = i * perRow;
      const chunkMax = Math.min(perRow, (boss.maxHealth || 0) - chunkStart);
      const chunkVal = Math.max(0, Math.min(chunkMax, boss.health - chunkStart));
      const healthData = this.drawHealthBar(boss.x + boss.w / 2, rowY, chunkVal, chunkMax);
      if (i === 0) firstRowHealthData = healthData; // Store first row for buff display
      rowY -= 18;
    }
    // Draw boss buffs if any
    if (firstRowHealthData) {
      this.drawBuffsNextToHealthBar(firstRowHealthData, boss.buffs || []);
    }
    // Draw invulnerability buff if active (legacy support)
    if (boss.invulnerabilityTimer > 0) {
      this.drawBossInvulnerabilityBuff(boss);
    }
  }

  drawBossInvulnerabilityBuff(boss) {
    const { ctx } = this;
    const barWidth = 40;
    const barHeight = 16;
    // Position to the right of the top health bar
    const topHealthBarY = boss.y - 24;
    const healthBarWidth = 40; // Standard health bar width from drawHealthBar
    const x = boss.x + boss.w / 2 + healthBarWidth / 2 + 10; // Right of health bar with padding
    const y = topHealthBarY - barHeight / 2; // Align with top health bar
    
    // Draw shield icon
    const shieldSize = 12;
    const shieldX = x - 20;
    const shieldY = y + barHeight / 2 - shieldSize / 2;
    
    ctx.save();
    ctx.fillStyle = 'rgba(80, 147, 255, 0.8)';
    // Draw shield shape (simplified rectangle with border)
    ctx.fillRect(shieldX - shieldSize / 2, shieldY, shieldSize, shieldSize);
    ctx.strokeStyle = 'rgba(100, 180, 255, 1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(shieldX - shieldSize / 2, shieldY, shieldSize, shieldSize);
    
    // Draw cooldown bar
    const progress = boss.invulnerabilityTimer / 10;
    ctx.fillStyle = 'rgba(80, 147, 255, 0.3)';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
    
    // Draw filled portion
    ctx.fillStyle = 'rgba(80, 147, 255, 0.8)';
    ctx.fillRect(x, y, barWidth * progress, barHeight);
    
    // Draw time text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(boss.invulnerabilityTimer.toFixed(1), x + barWidth / 2, y + barHeight + 10);
    
    ctx.restore();
  }

  drawBossRoarWave(boss) {
    const { ctx, state } = this;
    const wave = state.bossRoarWave;
    if (!boss || !wave) return;
    const progress = Math.min(1, wave.timer / wave.duration);
    const baseRadius = Math.max(boss.w, boss.h) * 0.6;
    const centerX = boss.x + boss.w / 2;
    const centerY = boss.y + boss.h / 2;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const local = Math.max(0, progress - i * 0.12);
      const alpha = Math.max(0, 0.5 - local);
      if (alpha <= 0) continue;
      const radius = baseRadius + local * baseRadius * 1.5 + i * 10;
      ctx.strokeStyle = `rgba(93, 255, 186, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius, radius * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(Math.min(width, height) / 2, radius || 0));
    if (r <= 0) {
      ctx.fillRect(x, y, width, height);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  drawBossStatsWindow(boss) {
    const { ctx, canvas } = this;
    const windowWidth = 400;
    const windowHeight = 500;
    const x = canvas.width - windowWidth - 20;
    const y = 20;

    // Get difficulty level
    const healthPerBar = boss.maxHealth / 4;
    const difficultyLevel = Math.min(4, 1 + Math.floor((boss.maxHealth - boss.health) / healthPerBar));
    
    // Calculate stats based on difficulty
    const speedMultiplier = difficultyLevel === 1 ? 1 : difficultyLevel === 2 ? 1 : difficultyLevel === 3 ? 1.5 : 1.75;
    let projectileCount = 0;
    let projectileWaves = 0;
    if (difficultyLevel === 1) {
      projectileCount = 0;
      projectileWaves = 0;
    } else if (difficultyLevel === 2) {
      projectileCount = 2;
      projectileWaves = 1;
    } else if (difficultyLevel === 3) {
      projectileCount = 4;
      projectileWaves = 2;
    } else if (difficultyLevel === 4) {
      projectileCount = 6;
      projectileWaves = 3;
    }

    const stats = [
      `Difficulty Level: ${difficultyLevel}`,
      `Health: ${boss.health.toFixed(0)} / ${boss.maxHealth}`,
      `Current Bar: ${Math.ceil(boss.health / healthPerBar)} / 4`,
      ``,
      `--- Combat Stats ---`,
      `Speed Multiplier: ${speedMultiplier}x`,
      `Jump Duration: ${(boss.bossJumpDuration / speedMultiplier).toFixed(2)}s`,
      ``,
      `--- Projectile Stats ---`,
      `Total Projectiles: ${projectileCount}`,
      `Projectile Waves: ${projectileWaves}`,
      `Projectile Size: ${difficultyLevel <= 2 ? '18x36px' : '150x30px'}`,
      `Projectile Speed: 420px/s`,
      `Projectile Damage: 4`,
      ``,
      `--- Phase Info ---`,
      `Current Phase: ${boss.bossPhase || 'N/A'}`,
      `Phase Timer: ${boss.bossTimer?.toFixed(2) || '0'}s`,
      `Morph Mode: ${boss.morphMode || 'circle'}`,
      `Morph Progress: ${boss.morphProgress?.toFixed(2) || '0'}%`,
      ``,
      `--- Status ---`,
      `Invulnerability: ${boss.invulnerabilityTimer > 0 ? boss.invulnerabilityTimer.toFixed(1) + 's' : 'None'}`,
      `Acid Duration: ${(boss.acidDuration || 0).toFixed(2)}s`,
      `Acid Stacks: ${boss.acidStacks || 0}`,
      `Regeneration: ${(boss.regenRate || 0).toFixed(2)}/s`,
    ];

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x, y, windowWidth, windowHeight);
    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, windowWidth, windowHeight);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Boss Stats (F2)', x + 12, y + 25);
    ctx.restore();

    // Setup scrolling
    if (!this.bossStatsScroll) {
      this.bossStatsScroll = 0;
    }

    // Draw scrollable content
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 5, y + 35, windowWidth - 10, windowHeight - 40);
    ctx.clip();

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'left';
    
    const lineHeight = 16;
    const contentStartY = y + 35 - this.bossStatsScroll;

    stats.forEach((stat, index) => {
      const statY = contentStartY + index * lineHeight;
      if (stat === '') {
        // Empty line - draw separator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 10, statY + 6);
        ctx.lineTo(x + windowWidth - 10, statY + 6);
        ctx.stroke();
      } else {
        ctx.fillText(stat, x + 10, statY + 12);
      }
    });

    ctx.restore();

    // Draw scroll indicator
    const totalHeight = stats.length * lineHeight;
    const visibleHeight = windowHeight - 40;
    if (totalHeight > visibleHeight) {
      const scrollBarHeight = (visibleHeight / totalHeight) * (windowHeight - 40);
      const scrollBarY = y + 35 + (this.bossStatsScroll / totalHeight) * (windowHeight - 40);
      ctx.save();
      ctx.fillStyle = 'rgba(233, 69, 96, 0.6)';
      ctx.fillRect(x + windowWidth - 8, scrollBarY, 4, scrollBarHeight);
      ctx.restore();
    }

    // Handle mouse wheel scrolling
    if (!window.bossStatsScrollListener) {
      window.bossStatsScrollListener = (e) => {
        if (this.state.debugShowBossStats && this.state.boss) {
          const totalHeight = stats.length * lineHeight;
          const visibleHeight = windowHeight - 40;
          if (totalHeight > visibleHeight) {
            this.bossStatsScroll = Math.max(0, Math.min(totalHeight - visibleHeight, this.bossStatsScroll + e.deltaY));
          }
        }
      };
      window.addEventListener('wheel', window.bossStatsScrollListener, { passive: false });
    }
  }

  drawPoisonPool(pool) {
    const { ctx } = this;
    
    // Draw pool water with gradient
    const gradient = ctx.createLinearGradient(pool.x, pool.y, pool.x, pool.y + pool.h);
    gradient.addColorStop(0, 'rgba(80, 180, 80, 0.6)');
    gradient.addColorStop(1, 'rgba(40, 120, 40, 0.8)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(pool.x + pool.w / 2, pool.y + pool.h / 2, pool.w / 2, pool.h / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw pool ripples (animated waves)
    ctx.strokeStyle = 'rgba(100, 200, 100, 0.4)';
    ctx.lineWidth = 2;
    
    const time = performance.now() * 0.001;  // Seconds
    for (let i = 1; i <= 3; i++) {
      const waveRadius = (i * 20 + time * 40) % 60;
      const waveAlpha = Math.max(0, 1 - (waveRadius / 60));
      ctx.strokeStyle = `rgba(100, 200, 100, ${waveAlpha * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(pool.x + pool.w / 2, pool.y + pool.h / 2.2, waveRadius, waveRadius / 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw pool outline/shine
    ctx.strokeStyle = 'rgba(150, 255, 150, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(pool.x + pool.w / 2, pool.y + pool.h / 2.5, pool.w / 2.2, pool.h / 2.8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawPoisonParticles(particles) {
    const { ctx } = this;
    
    particles.forEach((p) => {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color + alpha + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawRegenerationParticles(particles) {
    const { ctx } = this;
    
    particles.forEach((p) => {
      // Opacity starts at 1 and fades to 0 as particle approaches target
      const progressTowardsTarget = 1 - (p.life / p.maxLife);  // 0 at start, 1 at end
      const alpha = Math.max(0, 1 - progressTowardsTarget * 1.2);  // Fade as approaching
      
      if (alpha <= 0) return;
      
      // Twinkling effect that decreases as particle fades
      const twinkleFactor = 0.5 + 0.5 * Math.sin(performance.now() * 0.01 + p.life * 10);
      
      // Green glow with twinkling effect
      ctx.fillStyle = `rgba(93, 255, 186, ${alpha * twinkleFactor})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Outer glow
      ctx.strokeStyle = `rgba(93, 255, 186, ${alpha * twinkleFactor * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + 2, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  drawSlimeKingStatue(statue) {
    const { ctx } = this;
    
    const cx = statue.x + statue.w / 2;
    const cy = statue.y + statue.h / 2;
    
    // Background glow
    ctx.beginPath();
    ctx.arc(cx, cy - 20, 80, 0, Math.PI * 2);
    const glow = ctx.createRadialGradient(cx, cy - 20, 15, cx, cy - 20, 100);
    glow.addColorStop(0, "rgba(80, 255, 160, 0.25)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fill();
    
    // Pedestal base - Roman column style
    // Base platform
    ctx.fillStyle = "#444";
    ctx.beginPath();
    ctx.moveTo(statue.x + 8, cy + 35);
    ctx.lineTo(statue.x + statue.w - 8, cy + 35);
    ctx.lineTo(statue.x + statue.w - 2, cy + statue.h - 5);
    ctx.lineTo(statue.x + 2, cy + statue.h - 5);
    ctx.closePath();
    ctx.fill();
    
    // Base shadow
    ctx.fillStyle = "#333";
    ctx.fillRect(statue.x + 8, cy + 33, statue.w - 16, 4);
    
    // Column shaft - main body with fluting details
    ctx.fillStyle = "#555";
    ctx.fillRect(statue.x + 12, cy + 20, statue.w - 24, 15);
    
    // Inscription panel on column - carved area with squiggly lines
    const inscriptionX = statue.x + 13;
    const inscriptionY = cy + 50;
    const inscriptionW = statue.w - 26;
    const inscriptionH = 21;
    
    // Draw inscription in front by saving and restoring context
    ctx.save();
    
    // Inscription background (darker recessed area)
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(inscriptionX, inscriptionY, inscriptionW, inscriptionH);
    
    // Inscription border (carved frame)
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(inscriptionX, inscriptionY, inscriptionW, inscriptionH);
    
    // Inscription highlight (top edge light)
    ctx.strokeStyle = "#777";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(inscriptionX + 1, inscriptionY + 1);
    ctx.lineTo(inscriptionX + inscriptionW - 1, inscriptionY + 1);
    ctx.stroke();
    
    // Draw squiggly lines to look like ancient text
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Top squiggly line
    ctx.beginPath();
    ctx.moveTo(inscriptionX + 4, inscriptionY + 6);
    for (let x = inscriptionX + 4; x < inscriptionX + inscriptionW - 4; x += 2) {
      const y = inscriptionY + 6 + Math.sin(x * 0.3) * 1.5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Middle squiggly line
    ctx.beginPath();
    ctx.moveTo(inscriptionX + 4, inscriptionY + 12);
    for (let x = inscriptionX + 4; x < inscriptionX + inscriptionW - 4; x += 2) {
      const y = inscriptionY + 12 + Math.cos(x * 0.25) * 1.5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Bottom squiggly line
    ctx.beginPath();
    ctx.moveTo(inscriptionX + 4, inscriptionY + 18);
    for (let x = inscriptionX + 4; x < inscriptionX + inscriptionW - 4; x += 2) {
      const y = inscriptionY + 18 + Math.sin(x * 0.35 + 1) * 1.5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    ctx.restore();
    
    
    
    // Column fluting - vertical grooves for Roman style
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const fluteX = statue.x + 18 + (i * (statue.w - 36) / 4);
      ctx.beginPath();
      ctx.moveTo(fluteX, cy + 20);
      ctx.lineTo(fluteX, cy + 35);
      ctx.stroke();
    }
    
    // Column highlight for roundness
    ctx.strokeStyle = "#777";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(statue.x + 14, cy + 20);
    ctx.lineTo(statue.x + 14, cy + 35);
    ctx.stroke();
    
    // Capital (top of column) - wider ornate top
    ctx.fillStyle = "#666";
    ctx.beginPath();
    ctx.moveTo(statue.x + 10, cy + 20);
    ctx.lineTo(statue.x + statue.w - 10, cy + 20);
    ctx.lineTo(statue.x + statue.w - 14, cy + 15);
    ctx.lineTo(statue.x + 14, cy + 15);
    ctx.closePath();
    ctx.fill();
    
    // Capital detail - egg and dart pattern
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 4; i++) {
      const decorX = statue.x + 20 + (i * (statue.w - 40) / 3);
      ctx.beginPath();
      ctx.arc(decorX, cy + 17.5, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Base rim - decorative edge
    ctx.fillStyle = "#777";
    ctx.fillRect(statue.x + 10, cy + 35, statue.w - 20, 2);
    
    // Base shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(statue.x + 10, cy + 37, statue.w - 20, 3);
    
    // Inscription on base platform
    ctx.save();
    ctx.font = 'italic 11px serif';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SLIME KING', statue.x + statue.w / 2, cy + 46);
    ctx.restore();
    
    // Drop shadow for slime
    ctx.beginPath();
    ctx.ellipse(cx, cy + 18, 45, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fill();
    
    // Slime body - squishy blob with stone coloring
    ctx.save();
    ctx.translate(cx, cy - 5);
    ctx.scale(1.3, 0.95);
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    
    // Radial gradient for depth - stone grey-green
    const bodyGrad = ctx.createRadialGradient(-15, -15, 5, 0, 0, 45);
    bodyGrad.addColorStop(0, "#9a9a8e");
    bodyGrad.addColorStop(0.4, "#6d7369");
    bodyGrad.addColorStop(1, "#4a5147");
    
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.restore();
    
    // Top highlight on slime - stone shine
    ctx.beginPath();
    ctx.ellipse(cx - 20, cy - 30, 13, 7, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
    ctx.fill();
    
    // Eyes - closer together, no mouth - stone colored
    const eyeY = cy - 10;
    const eyeOffset = 12;
    const eyeRadius = 6;
    const pupilRadius = 3;
    
    // Eye whites - light grey stone
    ctx.fillStyle = "#c0c0b0";
    ctx.beginPath();
    ctx.arc(cx - eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Calculate pupil positions following the player
    let pupilOffsetX = 1;
    let pupilOffsetY = 1;
    
    if (this.state && this.state.player) {
      const player = this.state.player;
      const playerCenterX = player.x + player.w / 2;
      const playerCenterY = player.y + player.h / 2;
      
      // Calculate angle from statue to player for each eye
      const leftEyeX = cx - eyeOffset;
      const rightEyeX = cx + eyeOffset;
      
      // Left eye pupil direction
      const angleLeft = Math.atan2(playerCenterY - eyeY, playerCenterX - leftEyeX);
      pupilOffsetX = (pupilRadius - 0.5) * Math.cos(angleLeft);
      pupilOffsetY = (pupilRadius - 0.5) * Math.sin(angleLeft);
    }
    
    // Pupils - dark stone, following player
    ctx.fillStyle = "#4a4a40";
    ctx.beginPath();
    ctx.arc(cx - eyeOffset + pupilOffsetX, eyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffset + pupilOffsetX, eyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye highlights
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(cx - eyeOffset + pupilOffsetX + 2, eyeY + pupilOffsetY - 1, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffset + pupilOffsetX + 2, eyeY + pupilOffsetY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Crown
    const crownBaseY = cy - 35;
    const crownWidth = 85;
    const crownHeight = 28;
    
    // Crown base - stone grey
    ctx.fillStyle = "#7a7a70";
    ctx.beginPath();
    ctx.moveTo(cx - crownWidth / 2, crownBaseY);
    ctx.lineTo(cx + crownWidth / 2, crownBaseY);
    ctx.lineTo(cx + crownWidth / 2 - 8, crownBaseY - 8);
    ctx.lineTo(cx - crownWidth / 2 + 8, crownBaseY - 8);
    ctx.closePath();
    ctx.fill();
    
    // Crown spikes - stone grey
    ctx.beginPath();
    ctx.moveTo(cx - crownWidth / 2 + 8, crownBaseY - 8);
    ctx.lineTo(cx - crownWidth / 2 + 22, crownBaseY - crownHeight);
    ctx.lineTo(cx - crownWidth / 2 + 36, crownBaseY - 8);
    
    ctx.lineTo(cx - 8, crownBaseY - 8);
    ctx.lineTo(cx, crownBaseY - crownHeight - 4);
    ctx.lineTo(cx + 8, crownBaseY - 8);
    
    ctx.lineTo(cx + crownWidth / 2 - 36, crownBaseY - 8);
    ctx.lineTo(cx + crownWidth / 2 - 22, crownBaseY - crownHeight + 3);
    ctx.lineTo(cx + crownWidth / 2 - 8, crownBaseY - 8);
    ctx.closePath();
    ctx.fillStyle = "#6a6a60";
    ctx.fill();
    
    // Crown inner shadow line
    ctx.strokeStyle = "#5a5a50";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - crownWidth / 2 + 10, crownBaseY - 5);
    ctx.lineTo(cx + crownWidth / 2 - 10, crownBaseY - 5);
    ctx.stroke();
    
    // Center gem - diamond shape - grey stone
    ctx.fillStyle = "#8a8a7a";
    ctx.beginPath();
    ctx.moveTo(cx, crownBaseY - 20);
    ctx.lineTo(cx - 6, crownBaseY - 11);
    ctx.lineTo(cx, crownBaseY - 2);
    ctx.lineTo(cx + 6, crownBaseY - 11);
    ctx.closePath();
    ctx.fill();
    
    // Gem highlight - stone shine
    ctx.fillStyle = "rgba(200, 200, 200, 0.6)";
    ctx.beginPath();
    ctx.moveTo(cx - 1, crownBaseY - 16);
    ctx.lineTo(cx - 4, crownBaseY - 11);
    ctx.lineTo(cx - 1, crownBaseY - 6);
    ctx.closePath();
    ctx.fill();
  }

  drawScribblyText(x, y, text, size = 16) {
    const { ctx } = this;
    
    // Draw scribbly/wavy text by drawing it multiple times with slight offsets
    ctx.font = `bold ${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const offsetCount = 3;
    ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
    
    for (let i = 0; i < offsetCount; i++) {
      const offsetX = (Math.random() - 0.5) * 2;
      const offsetY = (Math.random() - 0.5) * 2;
      ctx.fillText(text, x + offsetX, y + offsetY);
    }
    
    ctx.fillStyle = '#666';
    ctx.fillText(text, x, y);
  }

  drawDialogBubble(x, y, text, maxWidth = 150) {
    const { ctx } = this;
    
    // Split text into lines
    const lines = [];
    const words = text.split(' ');
    let currentLine = '';
    
    ctx.font = 'bold 14px Arial';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Calculate bubble dimensions
    const padding = 15;
    const lineHeight = 18;
    const bubbleWidth = Math.max(...lines.map(line => ctx.measureText(line).width)) + padding * 2;
    const bubbleHeight = lines.length * lineHeight + padding * 2;
    const tailHeight = 15;
    const tailWidth = 20;
    const radius = 8;
    
    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y - bubbleHeight - tailHeight;
    
    // Draw combined bubble + tail shape with shadow first
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    // Top-left corner
    ctx.moveTo(bubbleX + radius + 2, bubbleY + 2);
    // Top edge
    ctx.lineTo(bubbleX + bubbleWidth - radius + 2, bubbleY + 2);
    // Top-right curve
    ctx.quadraticCurveTo(bubbleX + bubbleWidth + 2, bubbleY + 2, bubbleX + bubbleWidth + 2, bubbleY + radius + 2);
    // Right edge
    ctx.lineTo(bubbleX + bubbleWidth + 2, bubbleY + bubbleHeight - radius + 2);
    // Bottom-right curve
    ctx.quadraticCurveTo(bubbleX + bubbleWidth + 2, bubbleY + bubbleHeight + 2, bubbleX + bubbleWidth - radius + 2, bubbleY + bubbleHeight + 2);
    // Bottom-right to tail
    ctx.lineTo(x + tailWidth / 2 + 2, bubbleY + bubbleHeight + 2);
    // Tail point
    ctx.lineTo(x + 2, y + 2);
    // Tail back up
    ctx.lineTo(x - tailWidth / 2 + 2, bubbleY + bubbleHeight + 2);
    // Bottom-left to corner
    ctx.lineTo(bubbleX + radius + 2, bubbleY + bubbleHeight + 2);
    // Bottom-left curve
    ctx.quadraticCurveTo(bubbleX + 2, bubbleY + bubbleHeight + 2, bubbleX + 2, bubbleY + bubbleHeight - radius + 2);
    // Left edge
    ctx.lineTo(bubbleX + 2, bubbleY + radius + 2);
    // Top-left curve
    ctx.quadraticCurveTo(bubbleX + 2, bubbleY + 2, bubbleX + radius + 2, bubbleY + 2);
    ctx.closePath();
    ctx.fill();
    
    // Draw main bubble + tail
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    // Top-left corner
    ctx.moveTo(bubbleX + radius, bubbleY);
    // Top edge
    ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
    // Top-right curve
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
    // Right edge
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
    // Bottom-right curve
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
    // Bottom-right to tail
    ctx.lineTo(x + tailWidth / 2, bubbleY + bubbleHeight);
    // Tail point
    ctx.lineTo(x, y);
    // Tail back up
    ctx.lineTo(x - tailWidth / 2, bubbleY + bubbleHeight);
    // Bottom-left to corner
    ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
    // Bottom-left curve
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
    // Left edge
    ctx.lineTo(bubbleX, bubbleY + radius);
    // Top-left curve
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
    ctx.closePath();
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Top-left corner
    ctx.moveTo(bubbleX + radius, bubbleY);
    // Top edge
    ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
    // Top-right curve
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
    // Right edge
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
    // Bottom-right curve
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
    // Bottom-right to tail
    ctx.lineTo(x + tailWidth / 2, bubbleY + bubbleHeight);
    // Tail point
    ctx.lineTo(x, y);
    // Tail back up
    ctx.lineTo(x - tailWidth / 2, bubbleY + bubbleHeight);
    // Bottom-left to corner
    ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
    // Bottom-left curve
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
    // Left edge
    ctx.lineTo(bubbleX, bubbleY + radius);
    // Top-left curve
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
    ctx.closePath();
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let textY = y - bubbleHeight - tailHeight + padding + lineHeight / 2;
    for (const line of lines) {
      ctx.fillText(line, x, textY);
      textY += lineHeight;
    }
  }

  drawInteractPrompt(state, playerX, playerY) {
    const { ctx, canvas } = this;

    if (!state.player) return;

    const player = state.player;
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;

    let nearObject = false;

    // Check if player is close to the statue (within 150 pixels)
    if (state.slimeKingStatue) {
      const statue = state.slimeKingStatue;
      const statueCenterX = statue.x + statue.w / 2;
      const statueCenterY = statue.y + statue.h / 2;

      const statueDistance = Math.sqrt(
        Math.pow(playerCenterX - statueCenterX, 2) +
        Math.pow(playerCenterY - statueCenterY, 2)
      );

      if (statueDistance < 150) {
        nearObject = true;
      }
    }

    // Check if player is close to the poison pool (within 120 pixels)
    if (!nearObject && state.poisonPool) {
      const pool = state.poisonPool;
      const poolCenterX = pool.x + pool.w / 2;
      const poolCenterY = pool.y + pool.h / 2;

      const poolDistance = Math.sqrt(
        Math.pow(playerCenterX - poolCenterX, 2) +
        Math.pow(playerCenterY - poolCenterY, 2)
      );

      if (poolDistance < 120) {
        nearObject = true;
      }
    }

    // Show interact prompt if close enough and not already showing dialog
    if (nearObject && !state.pedestalTextVisible) {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.translate(0, 0);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Draw prompt above the player
      const promptX = playerX;
      const promptY = playerY - 60;

      // Background box
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(promptX - 50, promptY - 15, 100, 30);

      // Border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(promptX - 50, promptY - 15, 100, 30);

      // Text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Press F', promptX, promptY);

      ctx.restore();
    }
  }

}
/**
 * obstacles.js
 * Geração procedural dos obstáculos (pilares com um vão seguro no meio),
 * movimento, colisão e a curva de dificuldade progressiva.
 */

class ObstacleManager {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.obstacles = [];
    this.pillarWidth = 58;
    this.distanceSinceLast = 0;
    this.groundHeight = 60;
    this.ceilingHeight = 30;
    this.groundScroll = 0; // só cosmético — desloca a textura de grama do chão junto com a velocidade
  }

  reset() {
    this.obstacles = [];
    this.distanceSinceLast = 0;
    this.groundScroll = 0;
  }

  /**
   * Curva de dificuldade — baseada exatamente nas faixas pedidas:
   * 0-10, 10-20, 20-30, 30-40, 40+
   * Nunca deixa o vão menor que um mínimo seguro (gapMin), então
   * é matematicamente impossível gerar um obstáculo intransponível.
   */
  getDifficulty(score) {
    let speed, gap, spacing;

    if (score < 10) {
      speed = 190; gap = 200; spacing = 260;
    } else if (score < 20) {
      speed = 220; gap = 190; spacing = 250;
    } else if (score < 30) {
      speed = 240; gap = 175; spacing = 235;
    } else if (score < 40) {
      speed = 265; gap = 165; spacing = 225;
    } else {
      // 40+: continua subindo bem devagar, com piso de segurança
      const extra = Math.min(40, score - 40); // limita o crescimento
      speed = 265 + extra * 1.2;
      gap = Math.max(150, 165 - extra * 0.3); // nunca menor que 150px (piso seguro)
      spacing = Math.max(200, 225 - extra * 0.4);
    }

    return { speed, gap, spacing };
  }

  update(dt, score) {
    const { speed, gap, spacing } = this.getDifficulty(score);

    this.groundScroll = (this.groundScroll || 0) + speed * dt; // só cosmético (textura da grama)

    // move e remove obstáculos que já sairam da tela
    for (const o of this.obstacles) {
      o.x -= speed * dt;
    }
    this.obstacles = this.obstacles.filter(o => o.x + this.pillarWidth > -10);

    // gera novo obstáculo quando já passou a distância mínima
    this.distanceSinceLast += speed * dt;
    if (this.distanceSinceLast >= spacing) {
      this.distanceSinceLast = 0;
      return this.spawn(gap); // Etapa 2: retorna o obstáculo criado (usado por coins.js para posicionar moedas com segurança)
    }
    return null;
  }

  spawn(gapHeight) {
    const playableTop = this.ceilingHeight + 20;
    const playableBottom = this.canvasHeight - this.groundHeight - 20;
    const playableHeight = playableBottom - playableTop;

    // centro do vão em posição aleatória, respeitando margens de segurança
    const minCenter = playableTop + gapHeight / 2;
    const maxCenter = playableBottom - gapHeight / 2;
    const gapCenter = minCenter + Math.random() * Math.max(1, maxCenter - minCenter);

    const obstacle = {
      x: this.canvasWidth + 10,
      gapCenter,
      gapHeight,
      scored: false,
      textureSeed: Math.random() // só cosmético — usado pelo draw() para textura estável (não afeta colisão)
    };
    this.obstacles.push(obstacle);
    return obstacle;
  }

  /** Colisão circunferência (jogador) x dois retângulos (pilar superior e inferior) */
  checkCollision(playerBounds) {
    const { x: px, y: py, radius } = playerBounds;

    // chão e teto
    if (py + radius >= this.canvasHeight - this.groundHeight) return true;
    if (py - radius <= this.ceilingHeight) return true;

    for (const o of this.obstacles) {
      if (px + radius < o.x || px - radius > o.x + this.pillarWidth) continue;

      const gapTop = o.gapCenter - o.gapHeight / 2;
      const gapBottom = o.gapCenter + o.gapHeight / 2;

      const hitsTopPillar = py - radius < gapTop;
      const hitsBottomPillar = py + radius > gapBottom;

      if (hitsTopPillar || hitsBottomPillar) {
        // checagem mais precisa contra o retângulo (evita "quase acertos" injustos nas bordas)
        const rectX = Math.max(o.x, Math.min(px, o.x + this.pillarWidth));
        if (hitsTopPillar) {
          const rectY = Math.max(this.ceilingHeight, Math.min(py, gapTop));
          const dx = px - rectX, dy = py - rectY;
          if (dx * dx + dy * dy < radius * radius) return true;
        }
        if (hitsBottomPillar) {
          const rectY = Math.max(gapBottom, Math.min(py, this.canvasHeight - this.groundHeight));
          const dx = px - rectX, dy = py - rectY;
          if (dx * dx + dy * dy < radius * radius) return true;
        }
      }
    }
    return false;
  }

  /** Retorna quantos pontos novos o jogador fez neste frame (obstáculos que ele acabou de passar) */
  collectScore(playerX) {
    let scored = 0;
    for (const o of this.obstacles) {
      if (!o.scored && o.x + this.pillarWidth < playerX) {
        o.scored = true;
        scored++;
      }
    }
    return scored;
  }

  /** Pequeno "ruído" determinístico a partir de uma semente — nunca muda de frame a frame */
  _seededBlotches(seed, count, w, h) {
    const blotches = [];
    let s = seed * 9973;
    for (let i = 0; i < count; i++) {
      s = (s * 16807) % 2147483647;
      const r1 = (s / 2147483647);
      s = (s * 16807) % 2147483647;
      const r2 = (s / 2147483647);
      blotches.push({ x: r1 * w, y: r2 * h });
    }
    return blotches;
  }

  /** Desenha um segmento de pilar "vivo" (hera/cacto estilizado) com volume, textura e sombra */
  _drawPillarSegment(ctx, x, y, w, h, seed) {
    if (h <= 0) return;

    // sombra projetada sutil à direita do pilar (dá sensação de profundidade)
    ctx.fillStyle = 'rgba(10, 40, 20, 0.18)';
    ctx.fillRect(x + w - 6, y, 8, h);

    // corpo com gradiente (luz vindo da esquerda/topo — consistente com o resto do jogo)
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#bef7c6');
    grad.addColorStop(0.35, '#4ade80');
    grad.addColorStop(1, '#159c46');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // highlight vertical (lado esquerdo iluminado — "bevel" de luz)
    const hl = ctx.createLinearGradient(x, 0, x + w * 0.28, 0);
    hl.addColorStop(0, 'rgba(255,255,255,0.55)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(x, y, w * 0.28, h);

    // textura procedural: pequenas manchas/folhas estáveis (não recalculadas a cada frame)
    const blotches = this._seededBlotches(seed, Math.max(3, Math.floor(h / 26)), w, h);
    for (const b of blotches) {
      ctx.fillStyle = 'rgba(10, 70, 30, 0.16)';
      ctx.beginPath();
      ctx.ellipse(x + b.x, y + b.y, 6, 3.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // sombra interna na base (ambient occlusion simulada)
    ctx.fillStyle = 'rgba(6, 40, 18, 0.22)';
    ctx.fillRect(x, y + h - 10, w, 10);
  }

  draw(ctx) {
    // ---------- chão ----------
    const groundY = this.canvasHeight - this.groundHeight;

    const groundGrad = ctx.createLinearGradient(0, groundY, 0, this.canvasHeight);
    groundGrad.addColorStop(0, '#7a5236');
    groundGrad.addColorStop(1, '#4a2f1c');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, this.canvasWidth, this.groundHeight);

    // faixa de grama no topo do chão (borda viva, não lisa)
    const grassGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 12);
    grassGrad.addColorStop(0, '#7be495');
    grassGrad.addColorStop(1, '#3fae5c');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, groundY, this.canvasWidth, 10);

    // tufos de grama (dente-de-serra simples) — puramente decorativo
    ctx.fillStyle = '#3fae5c';
    const tuftW = 14;
    for (let gx = -((this.groundScroll || 0) % tuftW); gx < this.canvasWidth; gx += tuftW) {
      ctx.beginPath();
      ctx.moveTo(gx, groundY + 10);
      ctx.lineTo(gx + tuftW / 2, groundY + 2);
      ctx.lineTo(gx + tuftW, groundY + 10);
      ctx.closePath();
      ctx.fill();
    }

    // ---------- teto ----------
    const ceilGrad = ctx.createLinearGradient(0, 0, 0, this.ceilingHeight);
    ceilGrad.addColorStop(0, '#2f3252');
    ceilGrad.addColorStop(1, '#464b78');
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, this.canvasWidth, this.ceilingHeight);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, this.ceilingHeight - 4, this.canvasWidth, 4);

    // ---------- pilares ----------
    for (const o of this.obstacles) {
      const gapTop = o.gapCenter - o.gapHeight / 2;
      const gapBottom = o.gapCenter + o.gapHeight / 2;
      const seed = o.textureSeed || 0.5;

      // corpo do pilar de cima/baixo, com textura e volume
      this._drawPillarSegment(ctx, o.x, this.ceilingHeight, this.pillarWidth, gapTop - this.ceilingHeight, seed);
      this._drawPillarSegment(ctx, o.x, gapBottom, this.pillarWidth, (this.canvasHeight - this.groundHeight) - gapBottom, seed + 0.37);

      // "boca"/lábio arredondado em cada abertura do vão (dá acabamento, sem mudar a hitbox)
      this._drawLip(ctx, o.x, gapTop, this.pillarWidth, true);
      this._drawLip(ctx, o.x, gapBottom, this.pillarWidth, false);
    }
  }

  /** Lábio decorativo arredondado na boca do vão — puramente visual */
  _drawLip(ctx, x, edgeY, w, isTopEdge) {
    const lipH = 16;
    const y = isTopEdge ? edgeY - lipH : edgeY;

    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#f2fff4');
    grad.addColorStop(0.4, '#22c55e');
    grad.addColorStop(1, '#128a3e');
    ctx.fillStyle = grad;

    const r = 8;
    const lx = x - 4, lw = w + 8;
    ctx.beginPath();
    ctx.moveTo(lx + r, y);
    ctx.lineTo(lx + lw - r, y);
    ctx.quadraticCurveTo(lx + lw, y, lx + lw, y + r);
    ctx.lineTo(lx + lw, y + lipH - r);
    ctx.quadraticCurveTo(lx + lw, y + lipH, lx + lw - r, y + lipH);
    ctx.lineTo(lx + r, y + lipH);
    ctx.quadraticCurveTo(lx, y + lipH, lx, y + lipH - r);
    ctx.lineTo(lx, y + r);
    ctx.quadraticCurveTo(lx, y, lx + r, y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

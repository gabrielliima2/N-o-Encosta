/**
 * coins.js
 * Moedas coletáveis durante a partida.
 *
 * Estratégia de segurança: uma moeda só nasce dentro do "vão seguro" de um
 * obstáculo que acabou de ser gerado (no centro do gap). Como o jogador
 * precisa passar por esse vão de qualquer forma, a moeda nunca fica em
 * posição impossível ou injusta.
 */

class CoinManager {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.coins = [];
    this.radius = 11;
    this.spawnChance = 0.55; // nem todo obstáculo tem moeda — evita virar padrão repetitivo
    this.collectEffects = []; // pequenas animações de "coletado"
  }

  reset() {
    this.coins = [];
    this.collectEffects = [];
  }

  /** Chamado pelo game.js sempre que obstacles.js gera um novo obstáculo */
  trySpawnFromObstacle(obstacle, pillarWidth) {
    if (!obstacle) return;
    if (Math.random() > this.spawnChance) return;

    this.coins.push({
      x: obstacle.x + pillarWidth / 2,
      y: obstacle.gapCenter,
      collected: false,
      phase: Math.random() * Math.PI * 2
    });
  }

  update(dt, speed) {
    for (const c of this.coins) {
      c.x -= speed * dt;
      c.phase += dt * 6; // animação de "giro"
    }
    this.coins = this.coins.filter(c => c.x > -30 && !c.collected);

    // anima e limpa os efeitos de coleta (anel se expandindo e desaparecendo)
    for (const e of this.collectEffects) {
      e.age += dt;
    }
    this.collectEffects = this.collectEffects.filter(e => e.age < e.duration);
  }

  /** Colisão círculo x círculo — retorna true se coletou alguma moeda neste frame */
  checkCollision(playerBounds) {
    const { x: px, y: py, radius: pr } = playerBounds;
    let collectedAny = false;

    for (const c of this.coins) {
      if (c.collected) continue;
      const dx = px - c.x, dy = py - c.y;
      const distSq = dx * dx + dy * dy;
      const minDist = pr + this.radius;
      if (distSq < minDist * minDist) {
        c.collected = true;
        collectedAny = true;
        // pequenas fagulhas em direções fixas (determinístico — leve, sem Math.random() por frame)
        const sparkles = [0, 1, 2, 3, 4, 5].map(i => ({
          angle: (i / 6) * Math.PI * 2,
          dist: 16 + (i % 3) * 4
        }));
        this.collectEffects.push({ x: c.x, y: c.y, age: 0, duration: 0.55, sparkles });
      }
    }
    return collectedAny;
  }

  draw(ctx) {
    for (const c of this.coins) {
      const spin = Math.cos(c.phase); // -1..1 simula a moeda girando no eixo vertical
      const scaleX = Math.max(0.25, Math.abs(spin));

      // sombra suave abaixo da moeda (mesma linguagem visual do personagem/obstáculos)
      ctx.save();
      ctx.translate(c.x, c.y + this.radius * 0.9);
      ctx.scale(scaleX * 0.9, 0.28);
      const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
      shadowGrad.addColorStop(0, 'rgba(20,20,10,0.22)');
      shadowGrad.addColorStop(1, 'rgba(20,20,10,0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(scaleX, 1);

      // corpo da moeda — gradiente radial + anel de borda mais escuro (volume)
      const grad = ctx.createRadialGradient(-3, -4, 1, 0, 0, this.radius);
      grad.addColorStop(0, '#fffbe0');
      grad.addColorStop(0.55, '#ffd23f');
      grad.addColorStop(1, '#c9971a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#a67a12';
      ctx.lineWidth = 2;
      ctx.stroke();

      // anel interno (relevo do "cifrão"/moeda) — só decorativo
      ctx.strokeStyle = 'rgba(166, 122, 18, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.62, 0, Math.PI * 2);
      ctx.stroke();

      // reflexo de brilho
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.ellipse(-this.radius * 0.3, -this.radius * 0.35, this.radius * 0.32, this.radius * 0.16, -0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // efeitos de coleta: anel dourado + fagulhas + texto "+1" subindo e desaparecendo
    for (const e of this.collectEffects) {
      const t = e.age / e.duration;
      const fade = 1 - t;

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = '#f5c518';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, this.radius + t * 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (e.sparkles) {
        for (const s of e.sparkles) {
          const dist = s.dist + t * 22;
          const sx = e.x + Math.cos(s.angle) * dist;
          const sy = e.y + Math.sin(s.angle) * dist;
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.fillStyle = '#ffe89b';
          ctx.beginPath();
          ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // "+1" flutuando pra cima e desaparecendo
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#ffd23f';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 3;
      const ty = e.y - 18 - t * 22;
      ctx.strokeText('+1', e.x, ty);
      ctx.fillText('+1', e.x, ty);
      ctx.restore();
    }
  }
}

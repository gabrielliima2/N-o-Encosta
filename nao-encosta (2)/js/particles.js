/**
 * particles.js
 * Sistema de partículas leve e genérico — usado para pequenos efeitos visuais
 * (poeira ao pular, brilho discreto ao passar de obstáculo, explosão curta ao
 * morrer). Propositalmente simples e com um teto de partículas (MAX_PARTICLES)
 * para nunca pesar no desempenho, mesmo em celulares medianos.
 */

class ParticleSystem {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.particles = [];
    this.MAX_PARTICLES = 60; // teto de segurança para performance
  }

  _spawn(p) {
    if (this.particles.length >= this.MAX_PARTICLES) {
      this.particles.shift(); // remove a mais antiga em vez de deixar acumular
    }
    this.particles.push(p);
  }

  /** Poeira sutil ao pular */
  spawnJumpPuff(x, y) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI * 0.5 + (Math.random() - 0.5) * 1.4;
      const speed = 40 + Math.random() * 40;
      this._spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2,
        color: '255,255,255',
        life: 0, maxLife: 0.35 + Math.random() * 0.15
      });
    }
  }

  /** Brilho bem discreto ao passar por um obstáculo (pontuar) */
  spawnPassSparkle(x, y) {
    for (let i = 0; i < 3; i++) {
      this._spawn({
        x: x - 10, y: y + (Math.random() - 0.5) * 20,
        vx: -30 - Math.random() * 20,
        vy: (Math.random() - 0.5) * 30,
        size: 2 + Math.random() * 1.5,
        color: '255,210,90',
        life: 0, maxLife: 0.3
      });
    }
  }

  /** Explosão curta e discreta ao morrer */
  spawnDeathBurst(x, y) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this._spawn({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? '255,107,107' : '255,255,255',
        life: 0, maxLife: 0.4 + Math.random() * 0.3
      });
    }
  }

  update(dt) {
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt; // leve gravidade nas partículas — dá peso ao efeito
    }
    this.particles = this.particles.filter(p => p.life < p.maxLife);
  }

  draw(ctx) {
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      const alpha = 1 - t;
      const size = p.size * (1 - t * 0.4);

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = `rgb(${p.color})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/**
 * player.js
 * A criaturinha controlada pelo jogador: física de queda/impulso e desenho.
 */

class Player {
  constructor(canvasWidth, canvasHeight) {
    this.radius = 16;
    this.x = canvasWidth * 0.28;
    this.y = canvasHeight * 0.4;

    this.velocityY = 0;
    this.gravity = 1500;      // px/s^2
    this.jumpForce = -430;    // impulso ao tocar (px/s)
    this.maxFallSpeed = 700;
    this.rotation = 0;

    // pequena animação de "olhar" / balanço
    this.blinkTimer = Math.random() * 3;
    this.squash = 1;

    // Etapa 2: período de invulnerabilidade (usado após "CONTINUAR")
    this.invulnerableTimer = 0;
  }

  jump() {
    this.velocityY = this.jumpForce;
    this.squash = 1.25; // pequeno "esticão" ao subir
  }

  /** Ativa invulnerabilidade temporária (segundos) — usado ao continuar após Game Over */
  setInvulnerable(seconds) {
    this.invulnerableTimer = seconds;
  }

  isInvulnerable() {
    return this.invulnerableTimer > 0;
  }

  update(dt) {
    this.velocityY += this.gravity * dt;
    if (this.velocityY > this.maxFallSpeed) this.velocityY = this.maxFallSpeed;
    this.y += this.velocityY * dt;

    // rotação suave baseada na velocidade (sobe = nariz pra cima, cai = nariz pra baixo)
    const targetRotation = Math.max(-0.5, Math.min(0.9, this.velocityY / 700));
    this.rotation += (targetRotation - this.rotation) * Math.min(1, dt * 10);

    // volta o "squash" ao normal
    this.squash += (1 - this.squash) * Math.min(1, dt * 8);

    this.blinkTimer -= dt;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, radius: this.radius * 0.85 }; // colisão levemente generosa
  }

  draw(ctx, color) {
    ctx.save();

    // pisca levemente enquanto invulnerável (feedback visual do período de graça pós-CONTINUAR)
    if (this.invulnerableTimer > 0) {
      const blink = Math.sin(this.invulnerableTimer * 20) > 0;
      ctx.globalAlpha = blink ? 1 : 0.35;
    }

    // sombra suave "flutuante" (dá sensação de profundidade sem precisar saber onde é o chão)
    ctx.save();
    ctx.translate(this.x, this.y + this.radius * 1.6);
    ctx.scale(1, 0.35);
    const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 1.1);
    shadowGrad.addColorStop(0, 'rgba(20,20,35,0.28)');
    shadowGrad.addColorStop(1, 'rgba(20,20,35,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(1 / this.squash, this.squash);

    // pequenas "nadadeiras/orelhas" que balançam — dão sensação de movimento vivo
    const flap = Math.sin(this.blinkTimer * 3 + this.rotation * 2) * 0.3;
    ctx.fillStyle = shadeColor(color, -15);
    ctx.beginPath();
    ctx.ellipse(-this.radius * 0.55, this.radius * 0.15 + flap * 4, this.radius * 0.45, this.radius * 0.22, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // corpo — gradiente radial (luz vindo de cima-esquerda) em vez de cor chapada
    const bodyGrad = ctx.createRadialGradient(
      -this.radius * 0.35, -this.radius * 0.4, this.radius * 0.15,
      0, 0, this.radius * 1.15
    );
    bodyGrad.addColorStop(0, shadeColor(color, 35));
    bodyGrad.addColorStop(0.55, color);
    bodyGrad.addColorStop(1, shadeColor(color, -25));

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = shadeColor(color, -35);
    ctx.stroke();

    // highlight especular (brilho) no topo — reforça o volume
    ctx.beginPath();
    ctx.ellipse(-this.radius * 0.32, -this.radius * 0.42, this.radius * 0.38, this.radius * 0.22, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();

    // olho
    const blinking = this.blinkTimer < 0.08;
    ctx.fillStyle = '#1a1a2e';
    if (blinking) {
      ctx.fillRect(this.radius * 0.15, -this.radius * 0.15, this.radius * 0.35, 2);
    } else {
      ctx.beginPath();
      ctx.arc(this.radius * 0.32, -this.radius * 0.1, this.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // brilho no olho
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.radius * 0.4, -this.radius * 0.18, this.radius * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.blinkTimer < 0) this.blinkTimer = 2 + Math.random() * 3;

    // pequeno sorriso
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.radius * 0.15, this.radius * 0.25, this.radius * 0.3, 0.1 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }
}

/** Clareia (percent > 0) ou escurece (percent < 0) uma cor hex — usado para dar volume ao personagem */
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r}, ${g}, ${b})`;
}

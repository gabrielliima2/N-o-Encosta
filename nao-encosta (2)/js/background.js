/**
 * background.js
 * Cenário 2D em camadas com parallax (céu, nuvens, montanhas/vegetação).
 * Módulo independente do estado da partida — continua animando suavemente
 * mesmo no menu, na pausa etc., só para o fundo nunca parecer "morto".
 *
 * Tudo aqui é 100% procedural (gradientes + formas via Canvas), sem imagens,
 * pra manter o jogo leve em celulares medianos.
 */

const Background = (() => {
  let canvasWidth = 400, canvasHeight = 700;

  let clouds = [];
  let mountainOffset1 = 0; // camada mais distante (mais lenta)
  let mountainOffset2 = 0; // camada mais próxima (mais rápida)

  const CLOUD_COUNT = 5;

  function resize(w, h) {
    canvasWidth = w;
    canvasHeight = h;
    if (clouds.length === 0) initClouds();
  }

  function initClouds() {
    clouds = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
      clouds.push({
        x: Math.random() * canvasWidth,
        y: 40 + Math.random() * (canvasHeight * 0.28),
        scale: 0.6 + Math.random() * 0.9,
        speed: 6 + Math.random() * 10, // nuvens mais "na frente" andam um pouco mais rápido (parallax)
        opacity: 0.55 + Math.random() * 0.35
      });
    }
  }

  /** dt em segundos — chamado todo frame, independente do estado do jogo (ver game.js) */
  function update(dt) {
    if (clouds.length === 0) initClouds();

    for (const c of clouds) {
      c.x -= c.speed * dt;
      if (c.x < -80 * c.scale) {
        c.x = canvasWidth + 80 * c.scale;
        c.y = 40 + Math.random() * (canvasHeight * 0.28);
      }
    }

    mountainOffset1 = (mountainOffset1 + dt * 4) % 10000;  // camada distante: bem lenta
    mountainOffset2 = (mountainOffset2 + dt * 12) % 10000; // camada próxima: um pouco mais rápida
  }

  function drawCloud(ctx, c) {
    ctx.save();
    ctx.globalAlpha = c.opacity;
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale);
    ctx.fillStyle = '#ffffff';
    const puffs = [[0, 0, 22], [18, 4, 16], [-18, 4, 16], [8, -10, 14], [-8, -10, 14]];
    for (const [px, py, r] of puffs) {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Uma silhueta de "montanhas" (ou colinas com vegetação) que tileia horizontalmente */
  function drawMountainLayer(ctx, offset, baseY, amplitude, color, step) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-step, canvasHeight);
    for (let x = -step; x <= canvasWidth + step; x += step) {
      const t = x + offset;
      const y = baseY
        - amplitude * (0.6 + 0.4 * Math.sin(t * 0.012))
        - amplitude * 0.4 * Math.sin(t * 0.031 + 1.3);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvasWidth + step, canvasHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function draw(ctx) {
    // CAMADA 1 — céu (gradiente com leve variação de tom, dá sensação de luz)
    const sky = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    sky.addColorStop(0, '#6bc3ea');
    sky.addColorStop(0.45, '#8ed8f0');
    sky.addColorStop(1, '#c8ecf7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // um leve "sol"/glow no céu — só um gradiente radial suave, custo baixíssimo
    const glow = ctx.createRadialGradient(canvasWidth * 0.78, canvasHeight * 0.14, 4, canvasWidth * 0.78, canvasHeight * 0.14, 90);
    glow.addColorStop(0, 'rgba(255,255,255,0.55)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // CAMADA 2 — nuvens (parallax leve)
    for (const c of clouds) drawCloud(ctx, c);

    // CAMADA 3 — montanhas/vegetação, duas profundidades (a mais distante é mais clara/dessaturada)
    const baseY = canvasHeight * 0.62;
    drawMountainLayer(ctx, mountainOffset1, baseY, canvasHeight * 0.10, 'rgba(120,150,180,0.55)', 40);
    drawMountainLayer(ctx, mountainOffset2, baseY + canvasHeight * 0.05, canvasHeight * 0.075, 'rgba(70,130,95,0.6)', 34);
  }

  return { resize, update, draw };
})();

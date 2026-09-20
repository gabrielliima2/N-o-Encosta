/**
 * background.js
 * Cenário 2D em camadas com parallax (céu, nuvens, montanhas) + partículas
 * ambiente que mudam por mundo (estrelas, chuva, brasas, bolhas) — ver
 * worlds.js para o tema de cada mundo. Módulo independente do estado da
 * partida: continua animando mesmo fora do PLAYING (menu, pausa etc.).
 *
 * Troca de mundo: em vez de interpolar cor a cor (caro/complexo), o tema
 * novo é desenhado por CIMA do antigo com opacidade crescente por ~0.8s —
 * um crossfade simples e barato que já dá a sensação de "mudança gradual".
 *
 * Tudo aqui é 100% procedural (gradientes + formas via Canvas), sem
 * imagens, pra manter o jogo leve em celulares medianos.
 */

const Background = (() => {
  let canvasWidth = 400, canvasHeight = 700;

  let clouds = [];
  let mountainOffset1 = 0;
  let mountainOffset2 = 0;

  let currentTheme = null;
  let previousTheme = null;
  let transitionT = 1; // 1 = sem transição em andamento
  const TRANSITION_DURATION = 0.8;

  let ambientParticles = [];
  const MAX_AMBIENT = 16; // teto de segurança para performance

  let shootingStar = null;
  let shootingStarCooldown = 6 + Math.random() * 10; // primeira pode aparecer já nos primeiros segundos

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
        speed: 6 + Math.random() * 10,
        opacity: 0.55 + Math.random() * 0.35
      });
    }
  }

  /** Chamado pelo game.js sempre que o mundo (score) muda de faixa */
  function setWorld(theme) {
    if (currentTheme && currentTheme === theme) return;
    previousTheme = currentTheme || theme;
    currentTheme = theme;
    transitionT = 0;
    initAmbientParticles(theme.ambient);
  }

  function initAmbientParticles(ambient) {
    ambientParticles = [];
    if (!ambient || ambient.type === 'none') return;

    const count = Math.min(MAX_AMBIENT, ambient.type === 'rain' ? 16 : 10);
    for (let i = 0; i < count; i++) {
      ambientParticles.push(spawnAmbientParticle(ambient, true));
    }
  }

  function spawnAmbientParticle(ambient, randomY) {
    const base = { type: ambient.type, color: ambient.color };
    const y = randomY ? Math.random() * canvasHeight : -10;

    switch (ambient.type) {
      case 'stars':
        return { ...base, x: Math.random() * canvasWidth, y: Math.random() * canvasHeight * 0.7, size: 1 + Math.random() * 1.8, phase: Math.random() * Math.PI * 2 };
      case 'rain':
        return { ...base, x: Math.random() * canvasWidth, y, speed: 500 + Math.random() * 200, len: 14 + Math.random() * 10 };
      case 'embers':
        return { ...base, x: Math.random() * canvasWidth, y: canvasHeight - Math.random() * 80, speed: 20 + Math.random() * 25, size: 1.5 + Math.random() * 2, phase: Math.random() * Math.PI * 2 };
      case 'bubbles':
        return { ...base, x: Math.random() * canvasWidth, y: canvasHeight + Math.random() * 40, speed: 30 + Math.random() * 25, size: 2 + Math.random() * 3, wobble: Math.random() * Math.PI * 2 };
      default:
        return { ...base, x: Math.random() * canvasWidth, y: Math.random() * canvasHeight };
    }
  }

  function updateAmbientParticles(dt) {
    if (ambientParticles.length === 0 || !currentTheme) return;
    const ambient = currentTheme.ambient;

    for (const p of ambientParticles) {
      if (p.type === 'stars') {
        p.phase += dt * 2;
      } else if (p.type === 'rain') {
        p.y += p.speed * dt;
        p.x -= p.speed * 0.15 * dt;
        if (p.y > canvasHeight) { p.y = -10; p.x = Math.random() * canvasWidth; }
      } else if (p.type === 'embers') {
        p.y -= p.speed * dt;
        p.phase += dt * 3;
        if (p.y < canvasHeight * 0.2) { p.y = canvasHeight - Math.random() * 40; p.x = Math.random() * canvasWidth; }
      } else if (p.type === 'bubbles') {
        p.y -= p.speed * dt;
        p.wobble += dt * 2;
        if (p.y < -10) { p.y = canvasHeight + Math.random() * 40; p.x = Math.random() * canvasWidth; }
      }
    }
  }

  function updateShootingStar(dt) {
    if (shootingStar) {
      shootingStar.age += dt;
      if (shootingStar.age >= shootingStar.duration) shootingStar = null;
      return;
    }
    shootingStarCooldown -= dt;
    if (shootingStarCooldown <= 0) {
      shootingStar = {
        x: canvasWidth * (0.15 + Math.random() * 0.5),
        y: canvasHeight * (0.08 + Math.random() * 0.2),
        vx: 260 + Math.random() * 120,
        vy: 130 + Math.random() * 60,
        age: 0,
        duration: 0.6
      };
      // bem raro — próxima só depois de bastante tempo (momento de surpresa, não padrão previsível)
      shootingStarCooldown = 45 + Math.random() * 60;
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

    mountainOffset1 = (mountainOffset1 + dt * 4) % 10000;
    mountainOffset2 = (mountainOffset2 + dt * 12) % 10000;

    if (transitionT < 1) transitionT = Math.min(1, transitionT + dt / TRANSITION_DURATION);

    updateAmbientParticles(dt);
    updateShootingStar(dt);
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

  /** Desenha céu + montanhas de UM tema (usado 1x ou 2x — antigo e novo — durante o crossfade) */
  function drawThemeLayers(ctx, theme) {
    const sky = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(0.45, theme.sky[1]);
    sky.addColorStop(1, theme.sky[2]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const glow = ctx.createRadialGradient(canvasWidth * 0.78, canvasHeight * 0.14, 4, canvasWidth * 0.78, canvasHeight * 0.14, 90);
    glow.addColorStop(0, 'rgba(255,255,255,0.4)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const baseY = canvasHeight * 0.62;
    drawMountainLayer(ctx, mountainOffset1, baseY, canvasHeight * 0.10, theme.mountains[0], 40);
    drawMountainLayer(ctx, mountainOffset2, baseY + canvasHeight * 0.05, canvasHeight * 0.075, theme.mountains[1], 34);
  }

  function drawAmbientParticles(ctx) {
    for (const p of ambientParticles) {
      ctx.save();
      if (p.type === 'stars') {
        const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(p.phase));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${p.color})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'rain') {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = `rgb(${p.color})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 4, p.y + p.len);
        ctx.stroke();
      } else if (p.type === 'embers') {
        const alpha = 0.5 + 0.5 * Math.sin(p.phase);
        ctx.globalAlpha = Math.max(0.15, alpha);
        ctx.fillStyle = `rgb(${p.color})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bubbles') {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = `rgb(${p.color})`;
        ctx.lineWidth = 1.2;
        const wx = Math.sin(p.wobble) * 4;
        ctx.beginPath();
        ctx.arc(p.x + wx, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawShootingStar(ctx) {
    if (!shootingStar) return;
    const t = shootingStar.age / shootingStar.duration;
    const x = shootingStar.x + shootingStar.vx * shootingStar.age;
    const y = shootingStar.y + shootingStar.vy * shootingStar.age;
    const alpha = 1 - t;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - shootingStar.vx * 0.05, y - shootingStar.vy * 0.05);
    ctx.stroke();
    ctx.restore();
  }

  function draw(ctx) {
    const theme = currentTheme || { sky: ['#6bc3ea', '#8ed8f0', '#c8ecf7'], mountains: ['rgba(120,150,180,0.55)', 'rgba(70,130,95,0.6)'] };

    if (transitionT < 1 && previousTheme) {
      drawThemeLayers(ctx, previousTheme);
      ctx.save();
      ctx.globalAlpha = transitionT;
      drawThemeLayers(ctx, theme);
      ctx.restore();
    } else {
      drawThemeLayers(ctx, theme);
    }

    for (const c of clouds) drawCloud(ctx, c);
    drawAmbientParticles(ctx);
    drawShootingStar(ctx);
  }

  return { resize, update, draw, setWorld };
})();

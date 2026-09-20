/**
 * game.js
 * Orquestra tudo: canvas, loop principal, estados, input, colisão,
 * pontuação, moedas e integração com storage/audio/ads/ui.
 *
 * Estados:
 *   MENU | PLAYING | PAUSED | SETTINGS | GAME_OVER | CONFIRM_EXIT | SKINS | COUNTDOWN
 *
 * A física, o loop de update/draw e a curva de dificuldade são exatamente
 * os da Etapa 1 — nada disso foi alterado aqui.
 */

const Game = (() => {
  const STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    SETTINGS: 'settings',
    GAME_OVER: 'game_over',
    CONFIRM_EXIT: 'confirm_exit',
    SKINS: 'skins',
    COUNTDOWN: 'countdown'
  };

  let canvas, ctx;
  let width = 400, height = 700; // resolução lógica interna
  let state = STATE.MENU;

  // Para onde voltar depois de fechar a tela de Configurações
  // ('screenMenu' ou 'screenPause')
  let settingsReturnScreen = 'screenMenu';
  let settingsReturnState = STATE.MENU;

  let player, obstacles, coins, particles;
  let score = 0;
  let lastTime = 0;
  let running = false;
  let hasContinuedThisRun = false; // CONTINUAR só pode ser usado 1x por partida
  let continueRequestInProgress = false; // trava contra cliques duplicados durante anúncio/countdown

  // ---------- Progressão de mundos (ver worlds.js) ----------
  let currentWorld = Worlds.getAll()[0];
  let runStartHighestWorldId = 1; // "maior mundo" ANTES desta partida começar — usado pra saber se bateu um novo máximo
  let secretHintShown = false; // no máximo 1 dica de segredo por partida
  let ambientCueCooldown = 0; // som ambiente do mundo — bem ocasional, nunca em loop

  // ---------- Sequência de Game Over (evita clique acidental do toque que matou) ----------
  // Fases: 'none' -> 'title' -> 'counting' -> 'wait' -> 'buttons' -> 'interactive'
  // Só em 'interactive' um pointerdown NOVO libera os cliques dos botões.
  let gameOverPhase = 'none';
  let gameOverInputLocked = false;

  const CONTINUE_INVULNERABLE_SECONDS = 2;
  const COUNTDOWN_STEP_MS = 1000; // duração de cada número (3, 2, 1) — total ~3s

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    bindInput();
    UI.updateMenuRecord(Storage.getRecord());
    UI.updateCoins(Storage.getCoins());
    UI.updateMenuHighestWorld(Storage.getHighestWorld());
    UI.refreshSettingsToggles();

    // Diagnóstico de dev (Seção 13 do pedido) — visível no console
    const diag = AudioManager.getDiagnostics();
    console.log(`[Não Encosta!] Audio: ${diag.audioOk ? 'OK' : 'indisponível'} | Vibration API: ${diag.vibrationSupported ? 'Supported' : 'Not supported'}`);
    UI.setDiagnosticsText(diag);

    // Inicia o loop de desenho já no menu (só o fundo com parallax anima; gameplay
    // continua parado até "Jogar" — update() só age quando state === PLAYING).
    lastTime = performance.now();
    running = true;
    requestAnimationFrame(loop);
  }

  /** Mantém uma proporção parecida com celular (retrato) e ocupa a tela disponível */
  function resize() {
    const container = document.getElementById('game-container');
    const availW = container.clientWidth;
    const availH = container.clientHeight;

    const targetRatio = 400 / 700;
    let cw = availW;
    let ch = cw / targetRatio;

    if (ch > availH) {
      ch = availH;
      cw = ch * targetRatio;
    }

    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';

    canvas.width = width;
    canvas.height = height;

    if (obstacles) {
      obstacles.canvasWidth = width;
      obstacles.canvasHeight = height;
    }
    if (coins) {
      coins.canvasWidth = width;
      coins.canvasHeight = height;
    }
    if (particles) {
      particles.canvasWidth = width;
      particles.canvasHeight = height;
    }
    Background.resize(width, height); // só visual — fundo com parallax independente do estado do jogo
  }

  function bindInput() {
    const onPress = (e) => {
      e.preventDefault();
      Audio2D.unlock();
      if (state === STATE.PLAYING) {
        player.jump();
        Audio2D.playJump();
        Audio2D.vibrateTap();
        if (particles) particles.spawnJumpPuff(player.x, player.y); // só visual
      }
    };

    canvas.addEventListener('pointerdown', onPress);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') onPress(e);
    });

    // ---------- Trava de "novo toque" do Game Over ----------
    // Reaproveita a MESMA arquitetura de pointer events acima — não é um sistema
    // de input paralelo, só observa quando um toque/clique NOVO começa (capture
    // phase, roda antes do 'click' de qualquer botão). O toque que causou a
    // morte já tinha começado ANTES da fase virar 'interactive', então ele
    // nunca satisfaz esta condição — só um pointerdown genuinamente posterior
    // libera os botões.
    window.addEventListener('pointerdown', () => {
      if (gameOverPhase === 'interactive' && gameOverInputLocked) {
        gameOverInputLocked = false;
      }
    }, true);
  }

  // ---------- Início / reinício de partida ----------

  function startGame() {
    // Se viemos do Game Over, isso só executa de verdade quando o toque é NOVO
    // (ver a trava de input mais abaixo) — evita que o toque que matou o
    // personagem também inicie uma partida nova por acidente.
    if (state === STATE.GAME_OVER && gameOverInputLocked) return;
    gameOverPhase = 'none';
    gameOverInputLocked = false;

    score = 0;
    hasContinuedThisRun = false;
    continueRequestInProgress = false;
    secretHintShown = false;
    ambientCueCooldown = 8 + Math.random() * 12;
    runStartHighestWorldId = Storage.getHighestWorld().id; // referência pra saber, no Game Over, se bateu um novo máximo

    player = new Player(width, height);
    obstacles = new ObstacleManager(width, height);
    coins = new CoinManager(width, height);
    particles = new ParticleSystem(width, height);
    state = STATE.PLAYING;

    // Toda partida nova começa sempre no Mundo 1 (o progresso da PARTIDA reseta;
    // moedas/skins/recorde/maior-mundo, que são da CONTA, continuam intactos).
    currentWorld = Worlds.getWorldForScore(0);
    obstacles.setTheme(currentWorld);
    Background.setWorld(currentWorld);
    AudioManager.setWorldMusic(currentWorld.musicKey);

    UI.showScreen(null);
    UI.showHud(true);
    UI.showPauseButton(true);
    UI.showWorldHud(true);
    UI.updateScore(0);
    UI.updateCoins(Storage.getCoins());
    UI.updateWorldHud(currentWorld.name, currentWorld.id, Worlds.getProgress(0));

    AudioManager.playMusic(); // música começa ao iniciar a partida (Jogar / Jogar Novamente)

    // "PRIMEIRO VOO" — só desbloqueia mesmo na primeira vez (Storage.unlockAchievement dedupa sozinho)
    const unlocked = Achievements.checkAll({
      worldId: currentWorld.id,
      purchasedSkinsCount: Storage.getPurchasedSkins().length,
      isFirstPlay: true
    });
    unlocked.forEach(a => UI.showToast([a.title, a.desc], 2200, 'achievement'));

    lastTime = performance.now();
  }

  function endGame() {
    state = STATE.GAME_OVER;
    UI.showPauseButton(false);
    UI.showWorldHud(false);
    Audio2D.playHit();
    Audio2D.vibrateHit();
    AudioManager.stopMusic(); // música para ao morrer (não toca na tela de Game Over)
    if (particles) particles.spawnDeathBurst(player.x, player.y); // só visual

    const finalScore = score; // guardado em variável própria — a contagem visual sempre recomeça do 0

    const record = Storage.getRecord();
    const isNewRecord = finalScore > record;
    if (isNewRecord) Storage.setRecord(finalScore); // já persiste; o som/banner só aparecem depois da contagem

    const highest = Storage.getHighestWorld();
    const isNewMaxWorld = currentWorld.id > runStartHighestWorldId;

    UI.showHud(false);

    const continueAvailable = !hasContinuedThisRun;

    // Trava o input ANTES de qualquer coisa aparecer — o toque que causou a
    // morte (se ainda estiver "no ar") nunca vai satisfazer a condição de
    // desbloqueio (ver bindInput), então não corre o risco de clicar em nada.
    gameOverInputLocked = true;
    gameOverPhase = 'title';

    UI.showGameOverIntro(Math.max(finalScore, record), continueAvailable, {
      currentWorldId: currentWorld.id,
      currentWorldName: currentWorld.name,
      highestWorldId: highest.id,
      highestWorldName: highest.name || currentWorld.name
    });

    runGameOverSequence(finalScore, isNewRecord, isNewMaxWorld);
  }

  /**
   * Orquestra a pequena "apresentação" de resultado: GAME OVER -> pontuação
   * subindo de 0 até o valor real (com som a cada passo) -> pequena pausa ->
   * botões em fade-in. Só ao final disso a fase vira 'interactive', que é a
   * única condição em que um pointerdown novo destrava os botões.
   */
  function runGameOverSequence(finalScore, isNewRecord, isNewMaxWorld) {
    const TITLE_DELAY = 150;   // pequena pausa antes de "GAME OVER" aparecer
    const STATS_DELAY = 450;   // "PONTUAÇÃO" (começando em 0) aparece pouco depois
    const POST_COUNT_PAUSE = 500; // pausa pedida explicitamente antes dos botões

    setTimeout(() => {
      UI.revealGameOverStage('title');
      Audio2D.playGameOver(); // som já existente — nenhum efeito novo criado
    }, TITLE_DELAY);

    setTimeout(() => {
      gameOverPhase = 'counting';
      UI.revealGameOverStage('stats'); // já aparece mostrando "0"

      runScoreCountUp(finalScore, () => {
        if (isNewRecord) {
          Audio2D.playRecord();
          Audio2D.vibrateRecord();
        }
        UI.revealGameOverRecordBanners(isNewRecord, isNewMaxWorld);

        gameOverPhase = 'wait';
        setTimeout(() => {
          UI.revealGameOverStage('buttons');
          gameOverPhase = 'interactive'; // só agora um toque NOVO pode liberar os cliques
        }, POST_COUNT_PAUSE);
      });
    }, STATS_DELAY);
  }

  /**
   * Anima a pontuação de 0 até `finalScore`, chamando `onDone()` ao terminar.
   * Reaproveita Audio2D.playButton() (o "click" que já existe) como tic da
   * contagem — nenhum sistema de áudio novo é criado. Um único setTimeout
   * encadeado por vez (nunca setInterval nem múltiplos timers simultâneos).
   */
  function runScoreCountUp(finalScore, onDone) {
    if (finalScore <= 0) {
      UI.setGameOverScoreNumber(0);
      onDone();
      return;
    }

    const MAX_STEPS = 30; // teto de "tics" — mesmo com pontuações enormes, sem exagerar em som/DOM
    const steps = Math.min(finalScore, MAX_STEPS);
    const totalDuration = Math.min(1200, Math.max(600, 300 + finalScore * 4)); // 600–1200ms
    const stepInterval = totalDuration / steps;

    let currentStep = 0;
    const tick = () => {
      currentStep++;
      const value = currentStep >= steps ? finalScore : Math.round((finalScore / steps) * currentStep);
      UI.setGameOverScoreNumber(value);
      Audio2D.playButton(); // "tic" — reaproveita o clique já existente

      if (currentStep < steps) {
        setTimeout(tick, stepInterval);
      } else {
        onDone();
      }
    };
    setTimeout(tick, stepInterval);
  }

  /** Botão CONTINUAR da tela de Game Over — dispara o anúncio recompensado (placeholder) */
  function continueGame() {
    if (gameOverInputLocked) return; // mesma trava do toque que causou a morte
    if (hasContinuedThisRun) return; // só permite 1 continue por partida
    if (continueRequestInProgress) return; // evita cliques duplicados enquanto o anúncio carrega
    continueRequestInProgress = true;
    gameOverPhase = 'none'; // a partir daqui a sequência de Game Over já foi "usada"

    UI.showScreen('screenAdLoading');
    UI.setAdLoadingText('Carregando anúncio...');

    Ads.showRewardedAd({
      onSuccess: () => {
        // Recompensa concedida: SÓ AGORA o continue desta partida é consumido.
        hasContinuedThisRun = true;
        UI.setAdLoadingText('Anúncio concluído!');
        Audio2D.playContinue();
        Audio2D.vibrateContinue();

        setTimeout(() => {
          continueRequestInProgress = false;
          startCountdown();
        }, 500); // pequena pausa só pra "Anúncio concluído!" ser lido
      },
      onFail: () => {
        // Anúncio fechado/não concluído: NÃO concede o continue, mantém Game Over.
        continueRequestInProgress = false;
        UI.showScreen('screenGameover');
      }
    });
  }

  /**
   * Contagem regressiva "PREPARE-SE! 3, 2, 1, VAI!" exibida DEPOIS do anúncio
   * e ANTES do jogador renascer. O jogo (física/obstáculos/moedas/pontuação)
   * fica congelado o tempo todo, porque update() só roda em STATE.PLAYING.
   */
  function startCountdown() {
    state = STATE.COUNTDOWN;

    // Reposiciona o jogador em um ponto seguro (longe de qualquer obstáculo)
    // e ativa a invulnerabilidade ANTES do jogador ver a contagem, como pedido.
    player.y = height * 0.4;
    player.velocityY = 0;
    player.setInvulnerable(CONTINUE_INVULNERABLE_SECONDS);
    obstacles.obstacles = obstacles.obstacles.filter(o => o.x < width * 0.1);

    UI.showScreen('screenCountdown');
    Audio2D.playMenuOpen();

    UI.showCountdownStep('PREPARE-SE!', '');
    setTimeout(() => { UI.showCountdownStep('', '3'); Audio2D.playCountdown(); }, 500);
    setTimeout(() => { UI.showCountdownStep('', '2'); Audio2D.playCountdown(); }, 500 + COUNTDOWN_STEP_MS);
    setTimeout(() => { UI.showCountdownStep('', '1'); Audio2D.playCountdown(); }, 500 + COUNTDOWN_STEP_MS * 2);
    setTimeout(() => {
      UI.showCountdownStep('', 'VAI!');
      Audio2D.playGo();
      Audio2D.vibrateGo();
    }, 500 + COUNTDOWN_STEP_MS * 3);

    setTimeout(() => {
      state = STATE.PLAYING;
      UI.showScreen(null);
      UI.showHud(true);
      UI.showPauseButton(true);
      UI.showWorldHud(true);
      UI.updateScore(score);
      UI.updateWorldHud(currentWorld.name, currentWorld.id, Worlds.getProgress(score));
      AudioManager.playMusic(); // retoma a música junto com a partida, após o "VAI!"
      lastTime = performance.now(); // evita "salto" no dt após o tempo congelado
    }, 500 + COUNTDOWN_STEP_MS * 3 + 500);
  }

  /** Botão "Menu Inicial" da tela de Game Over — sem confirmação (o jogador já morreu) */
  function menuFromGameOver() {
    if (state === STATE.GAME_OVER && gameOverInputLocked) return; // mesma trava do toque que causou a morte
    gameOverPhase = 'none';
    gameOverInputLocked = false;

    state = STATE.MENU;
    UI.showHud(false);
    UI.showPauseButton(false);
    UI.updateMenuRecord(Storage.getRecord());
    UI.updateCoins(Storage.getCoins());
    UI.updateMenuHighestWorld(Storage.getHighestWorld());
    AudioManager.stopMusic(); // garante que a música pare ao voltar ao menu
    UI.showScreen('screenMenu');
  }

  // ---------- Pausa ----------

  function pauseGame() {
    if (state !== STATE.PLAYING) return;
    state = STATE.PAUSED;
    UI.showPauseButton(false);
    Audio2D.playMenuOpen();
    AudioManager.pauseMusic();
    UI.showScreen('screenPause');
  }

  function resumeGame() {
    if (state !== STATE.PAUSED) return;
    state = STATE.PLAYING;
    UI.showScreen(null);
    UI.showPauseButton(true);
    AudioManager.resumeMusic();
    lastTime = performance.now(); // evita "salto" no dt após o tempo pausado
  }

  // ---------- Configurações (acessível do Menu ou da Pausa) ----------

  function openSettings(fromState) {
    settingsReturnState = fromState;
    settingsReturnScreen = fromState === STATE.PAUSED ? 'screenPause' : 'screenMenu';
    state = STATE.SETTINGS;
    UI.refreshSettingsToggles();
    UI.showScreen('screenSettings');
  }

  function closeSettings() {
    state = settingsReturnState;
    UI.showScreen(settingsReturnScreen);
  }

  // ---------- Confirmação de saída (a partir da pausa) ----------

  function requestExitConfirm() {
    if (state !== STATE.PAUSED) return;
    state = STATE.CONFIRM_EXIT;
    UI.showScreen('screenConfirmExit');
  }

  function cancelExit() {
    state = STATE.PAUSED;
    UI.showScreen('screenPause');
  }

  function confirmExit() {
    state = STATE.MENU;
    UI.showHud(false);
    UI.showPauseButton(false);
    UI.showWorldHud(false);
    UI.updateMenuRecord(Storage.getRecord());
    UI.updateCoins(Storage.getCoins());
    UI.updateMenuHighestWorld(Storage.getHighestWorld());
    AudioManager.stopMusic(); // a partida foi abandonada — música para
    UI.showScreen('screenMenu');
  }

  // ---------- Skins (acessível apenas do Menu) ----------

  function openSkins() {
    state = STATE.SKINS;
    renderSkinsScreen();
    UI.showScreen('screenSkins');
  }

  function renderSkinsScreen() {
    UI.renderSkins(
      Skins.getAll(),
      (id) => { // onSelect
        Skins.select(id);
        Audio2D.playButton();
        renderSkinsScreen();
      },
      (id) => { // onPurchase
        const result = Skins.purchase(id);
        if (result.ok) {
          Audio2D.playCoin();
          UI.updateCoins(Storage.getCoins());
        } else {
          Audio2D.playButton();
        }
        renderSkinsScreen();
      }
    );
  }

  function closeSkins() {
    state = STATE.MENU;
    UI.showScreen('screenMenu');
  }

  // ---------- Loop principal ----------

  function update(dt) {
    if (state !== STATE.PLAYING) return; // congela física/obstáculos/moedas em qualquer outro estado

    player.update(dt);

    const newObstacle = obstacles.update(dt, score, currentWorld.obstacleSet);
    if (newObstacle) {
      coins.trySpawnFromObstacle(newObstacle, obstacles.pillarWidth);
    }

    const { speed } = obstacles.getDifficulty(score);
    coins.update(dt, speed);
    if (particles) particles.update(dt); // só visual

    // som ambiente do mundo — bem raro e discreto, nunca em loop contínuo
    ambientCueCooldown -= dt;
    if (ambientCueCooldown <= 0 && currentWorld.ambient.type !== 'none') {
      AudioManager.playWorldAmbientCue(currentWorld.ambient.type);
      ambientCueCooldown = 15 + Math.random() * 20;
    }

    const gained = obstacles.collectScore(player.x);
    if (gained > 0) {
      score += gained;
      UI.updateScore(score);
      Audio2D.playPoint();
      if (particles) particles.spawnPassSparkle(player.x, player.y); // só visual

      // ---------- Progressão de mundos ----------
      const newWorld = Worlds.getWorldForScore(score);
      if (newWorld.id !== currentWorld.id) {
        currentWorld = newWorld;
        obstacles.setTheme(currentWorld);
        Background.setWorld(currentWorld);
        AudioManager.setWorldMusic(currentWorld.musicKey);
        Audio2D.playMenuOpen(); // reaproveita o "chime" já existente como som de transição

        // "maior mundo alcançado" já atualiza aqui (você já está vivendo esse mundo agora,
        // não precisa sobreviver até o Game Over pra isso contar)
        Storage.setHighestWorldIfBigger(currentWorld.id, currentWorld.name);

        const displayName = Worlds.getDisplayName(currentWorld, Storage.getHighestWorld().id);
        UI.showToast(['NOVO MUNDO!', `MUNDO ${currentWorld.id} — ${displayName.toUpperCase()}`], 1700, 'world');

        // pequenas recompensas psicológicas (sem inventar ranking global) — mostradas
        // um pouco depois pra não competir com o toast de "NOVO MUNDO!" acima
        if (currentWorld.id === 5) {
          setTimeout(() => UI.showToast(['VOCÊ ESTÁ CHEGANDO LONGE!'], 1500, 'hint'), 1900);
        } else if (currentWorld.id === 7) {
          setTimeout(() => UI.showToast(['SEU MAIOR AVANÇO ATÉ AGORA!'], 1500, 'hint'), 1900);
        }

        const unlocked = Achievements.checkAll({
          worldId: currentWorld.id,
          purchasedSkinsCount: Storage.getPurchasedSkins().length,
          isFirstPlay: false
        });
        unlocked.forEach((a, i) => {
          setTimeout(() => UI.showToast([a.title, a.desc], 2200, 'achievement'), 1900 + i * 900);
        });
      } else if (!secretHintShown) {
        // "Será que existe?" — no máximo 1 dica por partida, só quando não há troca de mundo neste frame
        const hint = Worlds.getSecretHint(score);
        if (hint) {
          secretHintShown = true;
          UI.showToast([hint], 1600, 'hint');
        }
      }

      UI.updateWorldHud(currentWorld.name, currentWorld.id, Worlds.getProgress(score));
    }

    if (coins.checkCollision(player.getBounds())) {
      const total = Storage.addCoins(1);
      UI.updateCoins(total);
      Audio2D.playCoin();
      Audio2D.vibrateCoin();
    }

    if (!player.isInvulnerable() && obstacles.checkCollision(player.getBounds())) {
      endGame();
    }
  }

  function draw() {
    Background.draw(ctx); // céu + nuvens + montanhas com parallax (substitui o gradiente fixo antigo)

    if (obstacles) obstacles.draw(ctx);
    if (coins) coins.draw(ctx);
    if (player) player.draw(ctx, Skins.getSelected().color);
    if (particles) particles.draw(ctx);
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    Background.update(dt); // decorativo — continua animando mesmo fora do PLAYING (menu, pausa etc.)
    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  return {
    STATE,
    get state() { return state; },
    init,
    startGame,
    endGame,
    continueGame,
    menuFromGameOver,
    pauseGame,
    resumeGame,
    openSettings,
    closeSettings,
    requestExitConfirm,
    cancelExit,
    confirmExit,
    openSkins,
    closeSkins
  };
})();

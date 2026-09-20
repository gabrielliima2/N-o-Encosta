/**
 * audio.js
 *
 * Sistema de áudio centralizado (AudioManager) + vibração centralizada
 * (Vibration / triggerVibration).
 *
 * Estratégia de arquivos:
 *   - Cada efeito/música tenta tocar um arquivo real em assets/audio/
 *     (veja assets/audio/README.md para os nomes exatos esperados).
 *   - Se o arquivo não existir/falhar (é o caso "de fábrica" deste pacote,
 *     já que nenhum .mp3 foi incluído), o jogo cai automaticamente para um
 *     som sintetizado na hora via Web Audio API — então tudo já funciona
 *     de verdade mesmo sem nenhum arquivo de áudio presente.
 *   - Essa troca é decidida uma única vez por som (guardada em `fileFailed`),
 *     pra não ficar tentando carregar um arquivo quebrado repetidamente.
 *
 * `Audio2D` (usado pelo resto do projeto desde a Etapa 1/2) continua
 * existindo como uma camada fina de compatibilidade em cima do AudioManager
 * — nenhum arquivo que já chamava `Audio2D.playJump()` etc. precisou mudar.
 */

const AudioManager = (() => {
  const SFX_FILES = {
    jump: 'assets/audio/jump.mp3',
    coin: 'assets/audio/coin.mp3',
    score: 'assets/audio/score.mp3',
    death: 'assets/audio/death.mp3',
    click: 'assets/audio/click.mp3',
    countdown: 'assets/audio/countdown.mp3',
    go: 'assets/audio/go.mp3'
  };

  let webAudioCtx = null;
  function getWebAudioCtx() {
    if (!webAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      webAudioCtx = new AudioCtx();
    }
    return webAudioCtx;
  }

  // ---------- Sons sintetizados (fallback — sempre disponíveis) ----------

  function synthBeep({ freq = 440, duration = 0.1, type = 'sine', volume = 0.2, glideTo = null }) {
    try {
      const ctx = getWebAudioCtx();
      const vol = volume * (Storage.getSfxVolume() / 100);
      if (vol <= 0) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (glideTo !== null) {
        osc.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // ambiente sem suporte a Web Audio — falha silenciosamente
    }
  }

  const SYNTH_SFX = {
    jump:      () => synthBeep({ freq: 500, glideTo: 700, duration: 0.08, type: 'square', volume: 0.15 }),
    coin:      () => synthBeep({ freq: 900, glideTo: 1400, duration: 0.12, type: 'triangle', volume: 0.18 }),
    score:     () => synthBeep({ freq: 700, glideTo: 900, duration: 0.09, type: 'triangle', volume: 0.15 }),
    death:     () => synthBeep({ freq: 180, glideTo: 60, duration: 0.25, type: 'sawtooth', volume: 0.25 }),
    click:     () => synthBeep({ freq: 350, duration: 0.05, type: 'square', volume: 0.12 }),
    countdown: () => synthBeep({ freq: 520, duration: 0.12, type: 'triangle', volume: 0.18 }),
    go:        () => synthBeep({ freq: 700, glideTo: 1050, duration: 0.22, type: 'triangle', volume: 0.22 }),
    // extras que não têm arquivo pedido, mas continuam disponíveis:
    record:    () => {
      synthBeep({ freq: 600, duration: 0.1, type: 'triangle', volume: 0.2 });
      setTimeout(() => synthBeep({ freq: 800, duration: 0.1, type: 'triangle', volume: 0.2 }), 100);
      setTimeout(() => synthBeep({ freq: 1000, duration: 0.15, type: 'triangle', volume: 0.2 }), 200);
    },
    menuOpen:  () => synthBeep({ freq: 300, glideTo: 500, duration: 0.15, type: 'sine', volume: 0.12 }),
    gameOver:  () => synthBeep({ freq: 300, glideTo: 120, duration: 0.4, type: 'sawtooth', volume: 0.18 }),
    continueSfx: () => synthBeep({ freq: 500, glideTo: 800, duration: 0.18, type: 'triangle', volume: 0.2 })
  };

  /**
   * Sons ambiente OCASIONAIS por mundo (vento, trovão distante, bolha, brasa) —
   * bem discretos, disparados raramente pelo game.js (nunca em loop contínuo,
   * pra manter o custo mínimo). Não têm arquivo mapeado — sempre sintetizados.
   */
  function playWorldAmbientCue(ambientType) {
    if (!Storage.getSoundOn()) return;
    switch (ambientType) {
      case 'rain': // trovão distante, bem discreto
        synthBeep({ freq: 90, glideTo: 45, duration: 0.6, type: 'sawtooth', volume: 0.08 });
        break;
      case 'embers': // pequena "crepitação"
        synthBeep({ freq: 220, glideTo: 140, duration: 0.15, type: 'square', volume: 0.06 });
        break;
      case 'bubbles': // bolha subindo
        synthBeep({ freq: 500, glideTo: 900, duration: 0.2, type: 'sine', volume: 0.06 });
        break;
      case 'stars': // "brilho" sutil
        synthBeep({ freq: 1200, glideTo: 1600, duration: 0.12, type: 'triangle', volume: 0.05 });
        break;
      default:
        break;
    }
  }

  // ---------- SFX via arquivo (com fallback automático para o synth) ----------

  const sfxElements = {};
  const fileFailed = {}; // uma vez marcado true, nunca mais tenta o arquivo de novo

  function getSfxElement(name) {
    if (!sfxElements[name] && SFX_FILES[name]) {
      const el = new Audio(SFX_FILES[name]);
      el.preload = 'auto';
      el.addEventListener('error', () => { fileFailed[name] = true; });
      sfxElements[name] = el;
    }
    return sfxElements[name];
  }

  function playSFX(name) {
    if (!Storage.getSoundOn()) return;

    // som sem arquivo mapeado (ex.: record, menuOpen) ou arquivo já sabidamente indisponível
    if (!SFX_FILES[name] || fileFailed[name]) {
      if (SYNTH_SFX[name]) SYNTH_SFX[name]();
      return;
    }

    const el = getSfxElement(name);
    try {
      el.currentTime = 0;
      el.volume = Storage.getSfxVolume() / 100;
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          fileFailed[name] = true;
          if (SYNTH_SFX[name]) SYNTH_SFX[name]();
        });
      }
    } catch (e) {
      fileFailed[name] = true;
      if (SYNTH_SFX[name]) SYNTH_SFX[name]();
    }
  }

  // ---------- Música de fundo por mundo (arquivo real OU sintetizado por tema) ----------
  //
  // Estrutura de arquivos esperada (nenhum incluído neste pacote — ver
  // assets/audio/music/README.md): assets/audio/music/music_<key>.mp3
  // Enquanto não houver arquivo, cada mundo toca um TEMA SINTETIZADO
  // diferente (escala/tempo/timbre próprios) — já dá variedade real sem
  // depender de nenhum asset externo.

  const MUSIC_FILES = {
    menu: 'assets/audio/music/music_menu.mp3',
    world1: 'assets/audio/music/music_world_1.mp3',
    world2: 'assets/audio/music/music_world_2.mp3',
    world3: 'assets/audio/music/music_world_3.mp3',
    world4: 'assets/audio/music/music_world_4.mp3',
    world5: 'assets/audio/music/music_world_5.mp3',
    world6: 'assets/audio/music/music_world_6.mp3',
    world7: 'assets/audio/music/music_world_7.mp3',
    worldSecret: 'assets/audio/music/music_world_secret.mp3'
  };

  const SYNTH_THEMES = {
    menu:        { notes: [392.0, 440.0, 493.9, 440.0], tempo: 600, type: 'sine', vol: 0.05 },
    world1:      { notes: [261.6, 329.6, 392.0, 329.6, 293.7, 392.0, 440.0, 329.6], tempo: 450, type: 'sine', vol: 0.06 },
    world2:      { notes: [293.7, 349.2, 440.0, 349.2, 329.6, 440.0, 493.9, 349.2], tempo: 500, type: 'triangle', vol: 0.055 },
    world3:      { notes: [220.0, 261.6, 246.9, 220.0, 196.0, 220.0], tempo: 620, type: 'sine', vol: 0.045 },
    world4:      { notes: [196.0, 233.1, 196.0, 220.0, 207.7, 233.1], tempo: 300, type: 'sawtooth', vol: 0.05 },
    world5:      { notes: [246.9, 277.2, 311.1, 277.2, 246.9, 220.0], tempo: 260, type: 'square', vol: 0.055 },
    world6:      { notes: [174.6, 207.7, 196.0, 174.6, 155.6, 174.6], tempo: 700, type: 'sine', vol: 0.045 },
    world7:      { notes: [329.6, 392.0, 466.2, 392.0, 349.2, 440.0], tempo: 550, type: 'triangle', vol: 0.05 },
    worldSecret: { notes: [415.3, 493.9, 554.4, 466.2, 523.3, 392.0], tempo: 230, type: 'square', vol: 0.05 }
  };

  let currentMusicKey = 'world1';
  let musicState = 'stopped'; // 'stopped' | 'playing' | 'paused'
  let fadeGain = 1; // multiplicador aplicado por cima do volume (0..1) — usado na troca de mundo
  let fadeTimer = null;

  const musicElements = {};
  const musicFileFailed = {};

  let synthMusicTimer = null;
  let synthMusicStep = 0;

  function getMusicElement(key) {
    if (!musicElements[key] && MUSIC_FILES[key]) {
      const el = new Audio(MUSIC_FILES[key]);
      el.loop = true;
      el.preload = 'auto';
      el.addEventListener('error', () => { musicFileFailed[key] = true; });
      musicElements[key] = el;
    }
    return musicElements[key];
  }

  function synthMusicTick() {
    const theme = SYNTH_THEMES[currentMusicKey] || SYNTH_THEMES.world1;
    const ctx = getWebAudioCtx();
    const vol = theme.vol * (Storage.getMusicVolume() / 100) * fadeGain;
    if (vol > 0.0005) {
      const freq = theme.notes[synthMusicStep % theme.notes.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = theme.type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + theme.tempo / 1000 * 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + theme.tempo / 1000);
    }
    synthMusicStep++;

    clearTimeout(synthMusicTimer);
    synthMusicTimer = setTimeout(synthMusicTick, theme.tempo);
  }

  function startSynthMusicLoop() {
    if (synthMusicTimer) return;
    synthMusicTick();
  }

  function stopSynthMusicLoop(resetPattern) {
    if (synthMusicTimer) {
      clearTimeout(synthMusicTimer);
      synthMusicTimer = null;
    }
    if (resetPattern) synthMusicStep = 0;
  }

  function isUsingFile(key) {
    return !!MUSIC_FILES[key] && !musicFileFailed[key];
  }

  /** Aplica o fadeGain atual ao elemento de áudio ativo (se for o caso via arquivo) */
  function applyFadeToActiveElement() {
    if (isUsingFile(currentMusicKey) && musicElements[currentMusicKey]) {
      musicElements[currentMusicKey].volume = (Storage.getMusicVolume() / 100) * fadeGain;
    }
  }

  function rampFadeGain(from, to, durationMs, onDone) {
    clearInterval(fadeTimer);
    fadeGain = from;
    const steps = 10;
    let i = 0;
    fadeTimer = setInterval(() => {
      i++;
      fadeGain = from + (to - from) * (i / steps);
      applyFadeToActiveElement();
      if (i >= steps) {
        clearInterval(fadeTimer);
        fadeGain = to;
        applyFadeToActiveElement();
        if (onDone) onDone();
      }
    }, durationMs / steps);
  }

  function startKey(key) {
    currentMusicKey = key;
    if (isUsingFile(key)) {
      const el = getMusicElement(key);
      try {
        el.currentTime = 0;
        el.volume = (Storage.getMusicVolume() / 100) * fadeGain;
        const p = el.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            musicFileFailed[key] = true;
            if (musicState === 'playing') startSynthMusicLoop();
          });
        }
      } catch (e) {
        musicFileFailed[key] = true;
        if (musicState === 'playing') startSynthMusicLoop();
      }
    } else {
      startSynthMusicLoop();
    }
  }

  function stopKey(key) {
    if (isUsingFile(key) && musicElements[key]) {
      musicElements[key].pause();
      musicElements[key].currentTime = 0;
    }
    stopSynthMusicLoop(true);
  }

  /** Começa a música do mundo atual do zero (loop). Chamado ao iniciar uma partida. */
  function playMusic() {
    if (!Storage.getMusicOn()) { musicState = 'stopped'; return; }
    musicState = 'playing';
    fadeGain = 1;
    startKey(currentMusicKey);
  }

  /** Pausa exatamente onde está (não reinicia). Usado ao entrar em PAUSE. */
  function pauseMusic() {
    if (musicState !== 'playing') return;
    musicState = 'paused';
    clearInterval(fadeTimer);

    if (isUsingFile(currentMusicKey) && musicElements[currentMusicKey]) {
      musicElements[currentMusicKey].pause();
    } else {
      stopSynthMusicLoop(false); // mantém o "passo" do padrão — não volta ao início
    }
  }

  /** Retoma de onde parou. Usado ao sair do PAUSE. */
  function resumeMusic() {
    if (!Storage.getMusicOn()) return;

    if (musicState === 'stopped') { playMusic(); return; }
    if (musicState !== 'paused') return;
    musicState = 'playing';
    fadeGain = 1;

    if (isUsingFile(currentMusicKey) && musicElements[currentMusicKey]) {
      const p = musicElements[currentMusicKey].play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      startSynthMusicLoop();
    }
  }

  /** Para e reseta (Game Over, Menu Inicial). */
  function stopMusic() {
    musicState = 'stopped';
    clearInterval(fadeTimer);
    fadeGain = 1;
    stopKey(currentMusicKey);
  }

  /**
   * Troca para a música do mundo `key`, com fade-out da anterior e fade-in
   * da nova (crossfade simples e barato — ver comentário no topo do arquivo).
   * Se a música não estiver tocando agora (ex.: menu, pausa), só troca a
   * "música atual" silenciosamente — o próximo playMusic()/resumeMusic() já
   * usa a nova.
   */
  function setWorldMusic(key) {
    if (key === currentMusicKey) return;
    if (musicState !== 'playing') {
      currentMusicKey = key;
      return;
    }

    const oldKey = currentMusicKey;
    rampFadeGain(fadeGain, 0, 250, () => {
      stopKey(oldKey);
      startKey(key);
      rampFadeGain(0, 1, 400, null);
    });
  }

  // ---------- Volume ----------

  function setMusicVolume(percent) {
    Storage.setMusicVolume(percent);
    applyFadeToActiveElement();
  }

  function setSfxVolume(percent) {
    Storage.setSfxVolume(percent);
  }

  // ---------- Desbloqueio de áudio (política de autoplay dos navegadores) ----------

  function unlock() {
    try {
      const ctx = getWebAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  }

  // ---------- Diagnóstico (Seção 13 do pedido) ----------

  function getDiagnostics() {
    let audioOk = true;
    try { getWebAudioCtx(); } catch (e) { audioOk = false; }
    return {
      audioOk,
      vibrationSupported: typeof navigator !== 'undefined' && !!navigator.vibrate
    };
  }

  return {
    playSFX, playMusic, pauseMusic, resumeMusic, stopMusic, setWorldMusic,
    playWorldAmbientCue,
    setMusicVolume, setSfxVolume, unlock, getDiagnostics
  };
})();

/**
 * Vibração tátil centralizada.
 * Uso: triggerVibration(15) ou triggerVibration([0, 60, 40, 60])
 *
 * Preparado para, no futuro (Etapa de conversão mobile), trocar o miolo por
 * uma API nativa (ex. plugin Haptics do Capacitor) sem mudar quem chama.
 * No iOS o navegador não suporta navigator.vibrate — o fallback abaixo
 * simplesmente não faz nada, sem gerar nenhum erro pro jogador.
 */
function triggerVibration(pattern) {
  if (!Storage.getVibrationOn()) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return; // ex.: iOS Safari — fallback silencioso
  try {
    navigator.vibrate(pattern);
  } catch (e) {
    // nunca deixa a vibração quebrar o jogo
  }
}

/**
 * Audio2D — camada de compatibilidade com o código já existente desde a
 * Etapa 1/2 (game.js, ui.js, main.js chamam estes nomes). Por baixo, tudo
 * usa o AudioManager e o triggerVibration centralizados acima.
 */
const Audio2D = (() => {
  return {
    playJump:      () => AudioManager.playSFX('jump'),
    playCoin:      () => AudioManager.playSFX('coin'),
    playPoint:     () => AudioManager.playSFX('score'),
    playHit:       () => AudioManager.playSFX('death'),
    playButton:    () => AudioManager.playSFX('click'),
    playRecord:    () => AudioManager.playSFX('record'),
    playMenuOpen:  () => AudioManager.playSFX('menuOpen'),
    playGameOver:  () => AudioManager.playSFX('gameOver'),
    playContinue:  () => AudioManager.playSFX('continueSfx'),
    playCountdown: () => AudioManager.playSFX('countdown'),
    playGo:        () => AudioManager.playSFX('go'),

    unlock: () => AudioManager.unlock(),

    vibrateTap:      () => triggerVibration(15),
    vibrateCoin:     () => triggerVibration(20),
    vibrateHit:      () => triggerVibration([0, 60, 40, 60]),
    vibrateRecord:   () => triggerVibration([0, 40, 30, 40, 30, 80]),
    vibrateContinue: () => triggerVibration(25),
    vibrateGo:       () => triggerVibration(30)
  };
})();

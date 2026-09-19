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
  const MUSIC_FILE = 'assets/audio/music.mp3';

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

  // ---------- Música de fundo (arquivo real OU loop sintetizado de fallback) ----------

  let musicEl = null;
  let musicFileFailed = false;
  let musicState = 'stopped'; // 'stopped' | 'playing' | 'paused'

  // fallback: pequeno loop gerado (arpejo suave), original e leve — nunca usa material protegido
  let synthMusicTimer = null;
  let synthMusicStep = 0;
  const SYNTH_MUSIC_NOTES = [261.6, 329.6, 392.0, 329.6, 293.7, 392.0, 440.0, 329.6]; // C4 E4 G4 E4 D4 G4 A4 E4

  function synthMusicTick() {
    const ctx = getWebAudioCtx();
    const vol = 0.06 * (Storage.getMusicVolume() / 100);
    if (vol > 0) {
      const freq = SYNTH_MUSIC_NOTES[synthMusicStep % SYNTH_MUSIC_NOTES.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
    synthMusicStep++;
  }

  function startSynthMusicLoop() {
    if (synthMusicTimer) return; // já rodando
    synthMusicTick();
    synthMusicTimer = setInterval(synthMusicTick, 450);
  }

  function stopSynthMusicLoop(resetPattern) {
    if (synthMusicTimer) {
      clearInterval(synthMusicTimer);
      synthMusicTimer = null;
    }
    if (resetPattern) synthMusicStep = 0;
  }

  function getMusicElement() {
    if (!musicEl) {
      musicEl = new Audio(MUSIC_FILE);
      musicEl.loop = true;
      musicEl.preload = 'auto';
      musicEl.addEventListener('error', () => { musicFileFailed = true; });
    }
    return musicEl;
  }

  /** Começa a música do zero (loop). Chamado ao iniciar uma partida. */
  function playMusic() {
    if (!Storage.getMusicOn()) { musicState = 'stopped'; return; }
    musicState = 'playing';

    if (musicFileFailed) {
      startSynthMusicLoop();
      return;
    }

    const el = getMusicElement();
    try {
      el.currentTime = 0;
      el.volume = Storage.getMusicVolume() / 100;
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          musicFileFailed = true;
          if (musicState === 'playing') startSynthMusicLoop();
        });
      }
    } catch (e) {
      musicFileFailed = true;
      if (musicState === 'playing') startSynthMusicLoop();
    }
  }

  /** Pausa exatamente onde está (não reinicia). Usado ao entrar em PAUSE. */
  function pauseMusic() {
    if (musicState !== 'playing') return;
    musicState = 'paused';

    if (musicFileFailed) {
      stopSynthMusicLoop(false); // mantém o "passo" do padrão — não volta ao início
    } else if (musicEl) {
      musicEl.pause(); // HTMLAudio guarda a posição sozinho
    }
  }

  /** Retoma de onde parou. Usado ao sair do PAUSE. Se a música nunca chegou a
   *  tocar (ex.: estava OFF e o jogador ligou durante a pausa), começa do zero. */
  function resumeMusic() {
    if (!Storage.getMusicOn()) return;

    if (musicState === 'stopped') {
      playMusic();
      return;
    }
    if (musicState !== 'paused') return;
    musicState = 'playing';

    if (musicFileFailed) {
      startSynthMusicLoop();
    } else if (musicEl) {
      const p = musicEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }

  /** Para e reseta (Game Over, Menu Inicial). */
  function stopMusic() {
    musicState = 'stopped';
    stopSynthMusicLoop(true);
    if (musicEl) {
      musicEl.pause();
      musicEl.currentTime = 0;
    }
  }

  // ---------- Volume ----------

  function setMusicVolume(percent) {
    Storage.setMusicVolume(percent);
    if (musicEl) musicEl.volume = percent / 100;
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
    playSFX, playMusic, pauseMusic, resumeMusic, stopMusic,
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

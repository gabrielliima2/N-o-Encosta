/**
 * main.js
 * Ponto de entrada: inicializa o jogo e conecta os botões da interface
 * (menu, game over, pausa, confirmação de saída, skins/loja, configurações).
 */

window.addEventListener('load', () => {
  Game.init();

  // pequeno helper: toca o som de botão e executa a ação
  const on = (id, handler) => {
    document.getElementById(id).addEventListener('click', () => {
      Audio2D.playButton();
      handler();
    });
  };

  // ---------- Menu ----------
  on('btn-play', () => { Audio2D.unlock(); Game.startGame(); });
  on('btn-skins', () => Game.openSkins());
  on('btn-settings', () => Game.openSettings(Game.STATE.MENU));

  // ---------- Game Over ----------
  on('btn-restart', () => Game.startGame());
  on('btn-continue', () => Game.continueGame());
  on('btn-gameover-menu', () => Game.menuFromGameOver());

  // ---------- Pausa ----------
  on('btn-pause', () => Game.pauseGame());
  on('btn-pause-continue', () => Game.resumeGame());
  on('btn-pause-settings', () => Game.openSettings(Game.STATE.PAUSED));
  on('btn-pause-menu', () => Game.requestExitConfirm());

  // ---------- Confirmação de saída ----------
  on('btn-confirm-cancel', () => Game.cancelExit());
  on('btn-confirm-exit', () => Game.confirmExit());

  // ---------- Skins ----------
  on('btn-skins-back', () => Game.closeSkins());

  // ---------- Configurações ----------
  on('btn-settings-back', () => Game.closeSettings());

  const settingToggle = (buttonEl, getFn, setFn) => {
    buttonEl.addEventListener('click', () => {
      const newValue = !getFn();
      setFn(newValue);
      UI.setToggleState(buttonEl, newValue);
      Audio2D.unlock();
      Audio2D.playButton();
    });
  };

  settingToggle(UI.elements.toggleSound, Storage.getSoundOn, Storage.setSoundOn);
  settingToggle(UI.elements.toggleVibration, Storage.getVibrationOn, Storage.setVibrationOn);

  // Música tem um comportamento extra: ligar/desligar precisa refletir IMEDIATAMENTE
  // na música que já pode estar tocando (sem esperar a próxima partida).
  UI.elements.toggleMusic.addEventListener('click', () => {
    const newValue = !Storage.getMusicOn();
    Storage.setMusicOn(newValue);
    UI.setToggleState(UI.elements.toggleMusic, newValue);
    Audio2D.unlock();
    Audio2D.playButton();

    if (!newValue) {
      AudioManager.stopMusic();
    } else if (Game.state === Game.STATE.PLAYING) {
      AudioManager.playMusic();
    }
    // se estava pausado (ex.: configurações abertas pelo menu de pausa), a música
    // é retomada automaticamente por AudioManager.resumeMusic() quando o jogador
    // voltar a jogar — ver o novo comportamento de resumeMusic() em audio.js.
  });

  // ---------- Volume ----------
  UI.elements.sliderMusicVolume.addEventListener('input', (e) => {
    AudioManager.setMusicVolume(Number(e.target.value));
  });
  UI.elements.sliderSfxVolume.addEventListener('input', (e) => {
    AudioManager.setSfxVolume(Number(e.target.value));
  });
});

/**
 * ui.js
 * Toda manipulação do DOM (mostrar/esconder telas, atualizar textos, renderizar
 * listas dinâmicas) fica aqui. game.js e main.js chamam estas funções — não
 * manipulam o DOM diretamente.
 */

const UI = (() => {
  const el = {
    pauseBtn: document.getElementById('btn-pause'),

    hud: document.getElementById('hud'),
    hudScore: document.getElementById('hud-score'),
    hudCoins: document.getElementById('hud-coins-value'),

    screenMenu: document.getElementById('screen-menu'),
    menuRecord: document.getElementById('menu-record'),

    screenGameover: document.getElementById('screen-gameover'),
    gameoverScore: document.getElementById('gameover-score'),
    gameoverRecord: document.getElementById('gameover-record'),
    gameoverNewRecord: document.getElementById('gameover-newrecord'),
    btnContinue: document.getElementById('btn-continue'),

    screenPause: document.getElementById('screen-pause'),
    screenConfirmExit: document.getElementById('screen-confirm-exit'),

    screenSkins: document.getElementById('screen-skins'),
    skinsGrid: document.getElementById('skins-grid'),
    skinsCoinsValue: document.getElementById('skins-coins-value'),

    screenSettings: document.getElementById('screen-settings'),
    toggleSound: document.getElementById('toggle-sound'),
    toggleMusic: document.getElementById('toggle-music'),
    toggleVibration: document.getElementById('toggle-vibration'),
    sliderMusicVolume: document.getElementById('slider-music-volume'),
    sliderSfxVolume: document.getElementById('slider-sfx-volume'),
    settingsDiagnostics: document.getElementById('settings-diagnostics'),

    screenAdLoading: document.getElementById('screen-ad-loading'),
    adLoadingText: document.getElementById('ad-loading-text'),

    screenCountdown: document.getElementById('screen-countdown'),
    countdownLabel: document.getElementById('countdown-label'),
    countdownNumber: document.getElementById('countdown-number')
  };

  const ALL_SCREENS = [
    'screenMenu', 'screenGameover', 'screenPause', 'screenConfirmExit',
    'screenSkins', 'screenSettings', 'screenAdLoading', 'screenCountdown'
  ];

  function showScreen(name) {
    ALL_SCREENS.forEach(key => el[key].classList.add('hidden'));
    if (name) el[name].classList.remove('hidden');
  }

  function showHud(visible) {
    el.hud.classList.toggle('hidden', !visible);
  }

  function showPauseButton(visible) {
    el.pauseBtn.classList.toggle('hidden', !visible);
  }

  function updateScore(score) {
    el.hudScore.textContent = String(score);
  }

  function updateCoins(coins) {
    el.hudCoins.textContent = String(coins);
  }

  function updateMenuRecord(record) {
    el.menuRecord.textContent = String(record);
  }

  function showGameOver(score, record, isNewRecord, continueAvailable) {
    el.gameoverScore.textContent = String(score);
    el.gameoverRecord.textContent = String(record);
    el.gameoverNewRecord.classList.toggle('hidden', !isNewRecord);
    el.btnContinue.classList.toggle('hidden', !continueAvailable);
    showScreen('screenGameover');
  }

  function setAdLoadingText(text) {
    el.adLoadingText.textContent = text;
  }

  /**
   * Mostra um "passo" da contagem regressiva (label pequeno opcional + número/texto grande).
   * Reinicia a animação de escala/fade a cada chamada, mesmo que o texto se repita.
   */
  function showCountdownStep(label, bigText) {
    el.countdownLabel.textContent = label || '';
    el.countdownLabel.classList.toggle('hidden', !label);

    el.countdownNumber.textContent = bigText;
    // força o navegador a "esquecer" a animação anterior antes de reaplicar
    el.countdownNumber.classList.remove('pop');
    void el.countdownNumber.offsetWidth; // reflow
    el.countdownNumber.classList.add('pop');
  }

  /**
   * Renderiza a grade de skins. `onSelect`/`onPurchase` são callbacks
   * (id) => void, chamados quando o usuário toca em USAR / COMPRAR.
   */
  function renderSkins(skinsList, onSelect, onPurchase) {
    el.skinsCoinsValue.textContent = String(Storage.getCoins());
    el.skinsGrid.innerHTML = '';

    skinsList.forEach(skin => {
      const card = document.createElement('div');
      card.className = 'skin-card' + (skin.selected ? ' is-selected' : '');

      const preview = document.createElement('div');
      preview.className = 'skin-preview';
      preview.style.background = skin.color;
      card.appendChild(preview);

      const name = document.createElement('div');
      name.className = 'skin-name';
      name.textContent = skin.name;
      card.appendChild(name);

      if (skin.selected) {
        const status = document.createElement('div');
        status.className = 'skin-status';
        status.textContent = '✓ EQUIPADA';
        card.appendChild(status);
      } else if (skin.unlocked) {
        const btn = document.createElement('button');
        btn.className = 'skin-action equip';
        btn.textContent = 'USAR';
        btn.addEventListener('click', () => onSelect(skin.id));
        card.appendChild(btn);
      } else {
        const btn = document.createElement('button');
        btn.className = 'skin-action buy';
        btn.textContent = `COMPRAR (${skin.cost})`;
        btn.addEventListener('click', () => onPurchase(skin.id));
        card.appendChild(btn);
      }

      el.skinsGrid.appendChild(card);
    });
  }

  /** Atualiza a aparência (ON/OFF) dos 3 botões de configuração + os sliders de volume */
  function refreshSettingsToggles() {
    setToggleState(el.toggleSound, Storage.getSoundOn());
    setToggleState(el.toggleMusic, Storage.getMusicOn());
    setToggleState(el.toggleVibration, Storage.getVibrationOn());
    refreshVolumeSliders();
  }

  function setToggleState(buttonEl, isOn) {
    buttonEl.textContent = isOn ? 'ON' : 'OFF';
    buttonEl.classList.toggle('off', !isOn);
  }

  function refreshVolumeSliders() {
    el.sliderMusicVolume.value = String(Storage.getMusicVolume());
    el.sliderSfxVolume.value = String(Storage.getSfxVolume());
  }

  function setDiagnosticsText(diag) {
    el.settingsDiagnostics.textContent =
      `Áudio: ${diag.audioOk ? 'OK' : 'indisponível'} · Vibração: ${diag.vibrationSupported ? 'suportada' : 'não suportada'}`;
  }

  return {
    showScreen, showHud, showPauseButton,
    updateScore, updateCoins, updateMenuRecord,
    showGameOver, setAdLoadingText, showCountdownStep,
    renderSkins, refreshSettingsToggles, setToggleState,
    refreshVolumeSliders, setDiagnosticsText,
    elements: el
  };
})();

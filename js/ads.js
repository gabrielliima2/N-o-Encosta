/**
 * ads.js
 *
 * Arquitetura preparada para o Google AdMob (Etapa 4).
 * Nenhum anúncio real é carregado nesta versão — tudo aqui é placeholder.
 *
 * Quando o jogo for convertido para app (Capacitor/Cordova, por exemplo) e o
 * plugin do AdMob for instalado, é AQUI que as chamadas reais devem entrar:
 *
 *   - Banner:        exibido de forma fixa, ex. no menu ou HUD.
 *   - Interstitial:  exibido entre partidas (ex. a cada N game overs).
 *   - Rewarded:      usado no botão "CONTINUAR" da tela de Game Over.
 */

const Ads = (() => {

  // TODO (Etapa 4): inicializar o SDK do AdMob aqui
  // Ex.: AdMob.initialize({ appId: 'ca-app-pub-XXXXXXXX~XXXXXXXX' });
  function init() {
    // placeholder — nada a fazer ainda
  }

  // TODO (Etapa 4): carregar e exibir um banner real do AdMob
  function showBanner() {
    // placeholder
  }

  // TODO (Etapa 4): carregar e exibir um interstitial real do AdMob
  function showInterstitial() {
    // placeholder
  }

  /**
   * showRewardedAd({ onStart, onSuccess, onFail })
   *
   * TODO (Etapa 4): substituir a simulação abaixo pela chamada real do AdMob:
   * Ex.:
   *   onStart();
   *   AdMob.showRewardedAd({ adId: 'ca-app-pub-XXXXXXXX/XXXXXXXX' })
   *     .then(() => onSuccess())
   *     .catch(() => onFail());
   *
   * Por enquanto, simula o fluxo completo:
   *   onStart()   -> "Carregando anúncio..."
   *   (1.2s depois)
   *   onSuccess() -> "Anúncio concluído" -> volta para a partida
   *
   * Isso deixa o fluxo de CONTINUAR já funcionando de ponta a ponta,
   * mesmo sem o AdMob configurado.
   */
  function showRewardedAd({ onStart, onSuccess, onFail } = {}) {
    console.log('[ads.js] Simulando anúncio recompensado (placeholder)...');
    if (typeof onStart === 'function') onStart();

    setTimeout(() => {
      if (typeof onSuccess === 'function') onSuccess();
    }, 1200);
  }

  return { init, showBanner, showInterstitial, showRewardedAd };
})();

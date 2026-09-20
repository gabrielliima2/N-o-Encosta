/**
 * achievements.js
 * Conquistas locais simples — nada de servidor/conta, tudo via storage.js.
 * checkAll(ctx) roda todas as condições e retorna só as que acabaram de
 * ser desbloqueadas nesta chamada (pra exibir o toast uma única vez).
 */

const Achievements = (() => {
  const LIST = [
    { id: 'first_flight', title: 'PRIMEIRO VOO', desc: 'Jogue sua primeira partida.', test: (ctx) => ctx.isFirstPlay },
    { id: 'no_fear', title: 'SEM MEDO DO ESCURO', desc: 'Alcance o Mundo 3 — Noite Estrelada.', test: (ctx) => ctx.worldId >= 3 },
    { id: 'fire_heart', title: 'CORAÇÃO DE FOGO', desc: 'Alcance o Mundo 5 — Vulcão.', test: (ctx) => ctx.worldId >= 5 },
    { id: 'space_traveler', title: 'VIAJANTE ESPACIAL', desc: 'Alcance o Mundo 7 — Espaço Sideral.', test: (ctx) => ctx.worldId >= 7 },
    { id: 'beyond_limit', title: 'ALÉM DO LIMITE', desc: 'Alcance o Mundo 10.', test: (ctx) => ctx.worldId >= 10 },
    { id: 'collector', title: 'COLECIONADOR', desc: 'Compre 5 skins.', test: (ctx) => ctx.purchasedSkinsCount >= 5 }
  ];

  /** ctx: { worldId, purchasedSkinsCount, isFirstPlay } — retorna as recém-desbloqueadas */
  function checkAll(ctx) {
    const unlocked = [];
    for (const a of LIST) {
      if (a.test(ctx)) {
        if (Storage.unlockAchievement(a.id)) unlocked.push(a);
      }
    }
    return unlocked;
  }

  function getAll() {
    return LIST.map(a => ({ ...a, unlocked: Storage.getUnlockedAchievements().includes(a.id) }));
  }

  return { checkAll, getAll };
})();

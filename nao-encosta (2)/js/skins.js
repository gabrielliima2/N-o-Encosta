/**
 * skins.js
 * Define as skins disponíveis, controla desbloqueio/compra (com moedas) e seleção.
 * Para adicionar uma nova skin no futuro, basta adicionar um item em LIST.
 */

const Skins = (() => {
  const LIST = [
    { id: 'default', name: 'Padrão',   color: '#ffd23f', cost: 0 },
    { id: 'red',     name: 'Vermelho', color: '#ff6b6b', cost: 0 },
    { id: 'blue',    name: 'Azul',     color: '#4ea8ff', cost: 100 },
    { id: 'green',   name: 'Verde',    color: '#4ade80', cost: 250 },
    { id: 'gold',    name: 'Dourado',  color: '#f5c518', cost: 500 }
  ];

  function isUnlocked(id) {
    const skin = LIST.find(s => s.id === id);
    if (!skin) return false;
    if (skin.cost === 0) return true; // skins gratuitas já nascem desbloqueadas
    return Storage.getPurchasedSkins().includes(id);
  }

  /** Retorna a lista completa já com o status calculado (unlocked, selected) */
  function getAll() {
    const selectedId = Storage.getSkin();
    return LIST.map(s => ({
      ...s,
      unlocked: isUnlocked(s.id),
      selected: s.id === selectedId
    }));
  }

  function getSelected() {
    const id = Storage.getSkin();
    return LIST.find(s => s.id === id) || LIST[0];
  }

  /** Tenta comprar uma skin. Retorna { ok, reason } */
  function purchase(id) {
    const skin = LIST.find(s => s.id === id);
    if (!skin) return { ok: false, reason: 'not_found' };
    if (isUnlocked(id)) return { ok: false, reason: 'already_unlocked' };

    const success = Storage.spendCoins(skin.cost);
    if (!success) return { ok: false, reason: 'not_enough_coins' };

    Storage.addPurchasedSkin(id);
    return { ok: true };
  }

  function select(id) {
    if (isUnlocked(id)) {
      Storage.setSkin(id);
      return true;
    }
    return false;
  }

  return { getAll, getSelected, purchase, select, isUnlocked };
})();

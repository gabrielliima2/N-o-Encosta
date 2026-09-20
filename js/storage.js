/**
 * storage.js
 * Camada única de acesso ao localStorage.
 * Tudo que precisa persistir entre sessões passa por aqui.
 */

const Storage = (() => {
  const KEYS = {
    RECORD: 'naoEncosta_record',
    COINS: 'naoEncosta_coins',
    SKIN: 'naoEncosta_skin',
    PURCHASED_SKINS: 'naoEncosta_purchasedSkins',
    SOUND: 'naoEncosta_sound',
    MUSIC: 'naoEncosta_music',
    VIBRATION: 'naoEncosta_vibration',
    MUSIC_VOLUME: 'naoEncosta_musicVolume',
    SFX_VOLUME: 'naoEncosta_sfxVolume',
    HIGHEST_WORLD: 'naoEncosta_highestWorld',
    ACHIEVEMENTS: 'naoEncosta_achievements'
  };

  function getRecord() {
    return parseInt(localStorage.getItem(KEYS.RECORD) || '0', 10);
  }

  function setRecord(value) {
    localStorage.setItem(KEYS.RECORD, String(value));
  }

  function getCoins() {
    return parseInt(localStorage.getItem(KEYS.COINS) || '0', 10);
  }

  function addCoins(amount) {
    const total = getCoins() + amount;
    localStorage.setItem(KEYS.COINS, String(total));
    return total;
  }

  /** Retorna true e debita se houver saldo suficiente; caso contrário não altera nada e retorna false */
  function spendCoins(amount) {
    const total = getCoins();
    if (total < amount) return false;
    localStorage.setItem(KEYS.COINS, String(total - amount));
    return true;
  }

  function getSkin() {
    return localStorage.getItem(KEYS.SKIN) || 'default';
  }

  function setSkin(skinId) {
    localStorage.setItem(KEYS.SKIN, skinId);
  }

  /** Skins compradas/desbloqueadas (além das que já nascem gratuitas) */
  function getPurchasedSkins() {
    try {
      const raw = localStorage.getItem(KEYS.PURCHASED_SKINS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function addPurchasedSkin(skinId) {
    const list = getPurchasedSkins();
    if (!list.includes(skinId)) {
      list.push(skinId);
      localStorage.setItem(KEYS.PURCHASED_SKINS, JSON.stringify(list));
    }
  }

  // Preferências de som/música/vibração
  function getBoolPref(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  }

  function getSoundOn() {
    return getBoolPref(KEYS.SOUND, true);
  }
  function setSoundOn(value) {
    localStorage.setItem(KEYS.SOUND, String(value));
  }

  function getMusicOn() {
    return getBoolPref(KEYS.MUSIC, true);
  }
  function setMusicOn(value) {
    localStorage.setItem(KEYS.MUSIC, String(value));
  }

  function getVibrationOn() {
    return getBoolPref(KEYS.VIBRATION, true);
  }
  function setVibrationOn(value) {
    localStorage.setItem(KEYS.VIBRATION, String(value));
  }

  // Volume (0-100). Padrão: 70%.
  function getMusicVolume() {
    const raw = localStorage.getItem(KEYS.MUSIC_VOLUME);
    return raw === null ? 70 : parseInt(raw, 10);
  }
  function setMusicVolume(value) {
    localStorage.setItem(KEYS.MUSIC_VOLUME, String(value));
  }

  function getSfxVolume() {
    const raw = localStorage.getItem(KEYS.SFX_VOLUME);
    return raw === null ? 80 : parseInt(raw, 10);
  }
  function setSfxVolume(value) {
    localStorage.setItem(KEYS.SFX_VOLUME, String(value));
  }

  // ---------- Progressão de mundos ----------

  /** Maior mundo já alcançado (persistente — nunca reseta ao morrer) */
  function getHighestWorld() {
    try {
      const raw = localStorage.getItem(KEYS.HIGHEST_WORLD);
      return raw ? JSON.parse(raw) : { id: 1, name: null };
    } catch (e) {
      return { id: 1, name: null };
    }
  }

  /** Só grava se for realmente maior que o atual — retorna true se bateu um novo máximo */
  function setHighestWorldIfBigger(id, name) {
    const current = getHighestWorld();
    if (id > current.id) {
      localStorage.setItem(KEYS.HIGHEST_WORLD, JSON.stringify({ id, name }));
      return true;
    }
    return false;
  }

  // ---------- Conquistas ----------

  function getUnlockedAchievements() {
    try {
      const raw = localStorage.getItem(KEYS.ACHIEVEMENTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  /** Retorna true se ESTA chamada desbloqueou (ou seja, é a primeira vez) */
  function unlockAchievement(id) {
    const list = getUnlockedAchievements();
    if (list.includes(id)) return false;
    list.push(id);
    localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(list));
    return true;
  }

  return {
    getRecord, setRecord,
    getCoins, addCoins, spendCoins,
    getSkin, setSkin,
    getPurchasedSkins, addPurchasedSkin,
    getSoundOn, setSoundOn,
    getMusicOn, setMusicOn,
    getVibrationOn, setVibrationOn,
    getMusicVolume, setMusicVolume,
    getSfxVolume, setSfxVolume,
    getHighestWorld, setHighestWorldIfBigger,
    getUnlockedAchievements, unlockAchievement
  };
})();

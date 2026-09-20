/**
 * worlds.js
 * Sistema centralizado de mundos/progressão — em vez de espalhar
 * "if score > 100..." por vários arquivos, tudo mora aqui.
 *
 * Cada mundo tem: id, name, minScore, secret (se aparece como "???" até
 * ser alcançado), tema visual (cores de céu/montanha/chão/pilar) e o
 * "ambiente" (tipo de partícula de fundo + cor) e uma flag de mecânica de
 * obstáculo que passa a valer a partir dali (obstacleSet).
 *
 * Os limiares de pontuação foram ajustados a partir da curva de
 * dificuldade real de obstacles.js (não são os números de exemplo do
 * pedido) — a cada obstáculo vale 1 ponto, e o intervalo entre obstáculos
 * cai de ~1.4s (início) para ~0.8s (score 80+), então os limiares abaixo
 * crescem para que cada mundo dure de fato mais tempo que o anterior.
 */

const Worlds = (() => {
  const LIST = [
    {
      id: 1, name: 'Céu Azul', minScore: 0, secret: false,
      sky: ['#6bc3ea', '#8ed8f0', '#c8ecf7'],
      mountains: ['rgba(120,150,180,0.55)', 'rgba(70,130,95,0.6)'],
      ground: '#4a2f1c', pillar: ['#bef7c6', '#4ade80', '#159c46'],
      ambient: { type: 'none', color: '255,255,255' },
      obstacleSet: 'simple',
      musicKey: 'world1'
    },
    {
      id: 2, name: 'Pôr do Sol', minScore: 20, secret: false,
      sky: ['#ff9d5c', '#ffb37a', '#ffe0a3'],
      mountains: ['rgba(180,90,110,0.5)', 'rgba(140,60,90,0.6)'],
      ground: '#5a2f24', pillar: ['#ffd9a0', '#ff9d3f', '#c9691a'],
      ambient: { type: 'none', color: '255,220,180' },
      obstacleSet: 'simple',
      musicKey: 'world2'
    },
    {
      id: 3, name: 'Noite Estrelada', minScore: 50, secret: false,
      sky: ['#0e1a3d', '#1c2b5e', '#334a86'],
      mountains: ['rgba(30,40,80,0.6)', 'rgba(20,25,55,0.7)'],
      ground: '#1c1830', pillar: ['#c9c9ff', '#7d7ce0', '#4b49a8'],
      ambient: { type: 'stars', color: '255,255,255' },
      obstacleSet: 'simple',
      musicKey: 'world3'
    },
    {
      id: 4, name: 'Tempestade', minScore: 100, secret: false,
      sky: ['#3a3f4a', '#565c68', '#7c828e'],
      mountains: ['rgba(50,55,65,0.65)', 'rgba(35,38,46,0.75)'],
      ground: '#2b2d33', pillar: ['#d8dde6', '#8b95a3', '#565c68'],
      ambient: { type: 'rain', color: '210,225,245' },
      obstacleSet: 'oscillate', // introduz obstáculos com vão oscilando verticalmente
      musicKey: 'world4'
    },
    {
      id: 5, name: 'Vulcão', minScore: 180, secret: false,
      sky: ['#2b0f0a', '#5c1f12', '#a3411c'],
      mountains: ['rgba(90,30,15,0.6)', 'rgba(60,18,10,0.75)'],
      ground: '#2a120a', pillar: ['#ffb37a', '#ff6b3f', '#b33417'],
      ambient: { type: 'embers', color: '255,150,60' },
      obstacleSet: 'oscillate',
      musicKey: 'world5'
    },
    {
      id: 6, name: 'Fundo do Mar', minScore: 280, secret: false,
      sky: ['#012a4a', '#013a63', '#0466a8'],
      mountains: ['rgba(2,60,90,0.6)', 'rgba(1,40,65,0.75)'],
      ground: '#012238', pillar: ['#8fe3d8', '#2fb3a3', '#12786e'],
      ambient: { type: 'bubbles', color: '190,240,235' },
      obstacleSet: 'oscillate',
      musicKey: 'world6'
    },
    {
      id: 7, name: 'Espaço Sideral', minScore: 400, secret: false,
      sky: ['#05040f', '#11082b', '#241246'],
      mountains: ['rgba(40,20,70,0.55)', 'rgba(20,10,40,0.7)'],
      ground: '#0a0716', pillar: ['#d9c9ff', '#8f6bff', '#5a3fc9'],
      ambient: { type: 'stars', color: '220,200,255' },
      obstacleSet: 'oscillate-fast',
      musicKey: 'world7'
    },
    {
      id: 8, name: 'Dimensão Neon', minScore: 550, secret: true,
      sky: ['#0a0416', '#170a2e', '#2a0d4a'],
      mountains: ['rgba(255,0,180,0.18)', 'rgba(0,220,255,0.18)'],
      ground: '#0d0620', pillar: ['#ff9dfb', '#ff2fd6', '#00e0ff'],
      ambient: { type: 'stars', color: '255,60,220' },
      obstacleSet: 'oscillate-fast',
      musicKey: 'worldSecret'
    },
    {
      id: 9, name: 'Aurora Boreal', minScore: 750, secret: true,
      sky: ['#031014', '#04222a', '#063a3f'],
      mountains: ['rgba(30,150,110,0.3)', 'rgba(80,60,160,0.3)'],
      ground: '#02181c', pillar: ['#a6ffe0', '#3fd6a0', '#1f8f6e'],
      ambient: { type: 'stars', color: '140,255,210' },
      obstacleSet: 'oscillate-fast',
      musicKey: 'worldSecret'
    },
    {
      id: 10, name: 'Além do Vazio', minScore: 1000, secret: true,
      sky: ['#000000', '#0a0a0a', '#161616'],
      mountains: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.1)'],
      ground: '#000000', pillar: ['#ffffff', '#cfcfcf', '#8a8a8a'],
      ambient: { type: 'stars', color: '255,255,255' },
      obstacleSet: 'oscillate-fast',
      musicKey: 'worldSecret'
    }
  ];

  /** Mundo atual para uma dada pontuação (sempre existe — cai no último da lista) */
  function getWorldForScore(score) {
    let current = LIST[0];
    for (const w of LIST) {
      if (score >= w.minScore) current = w;
    }
    return current;
  }

  function getIndex(worldId) {
    return LIST.findIndex(w => w.id === worldId);
  }

  /** Progresso (0..1) dentro do mundo atual, para a barrinha do HUD */
  function getProgress(score) {
    const current = getWorldForScore(score);
    const idx = getIndex(current.id);
    const next = LIST[idx + 1];
    if (!next) return 1; // último mundo — barra sempre cheia
    const span = next.minScore - current.minScore;
    return Math.max(0, Math.min(1, (score - current.minScore) / span));
  }

  /**
   * Dica sutil de que existe algo além, mostrada só uma vez por partida,
   * pouco antes de alcançar um mundo secreto (não entrega o nome).
   */
  function getSecretHint(score) {
    for (let i = 0; i < LIST.length; i++) {
      const w = LIST[i];
      if (!w.secret) continue;
      const prev = LIST[i - 1];
      if (!prev) continue;
      const span = w.minScore - prev.minScore;
      const hintStart = w.minScore - Math.round(span * 0.25);
      if (score >= hintStart && score < w.minScore) {
        return 'Existe algo além daqui…';
      }
    }
    return null;
  }

  /** Nome de exibição — mundos secretos ainda não alcançados aparecem como "???" */
  function getDisplayName(world, highestWorldId) {
    if (world.secret && world.id > highestWorldId) return '???';
    return world.name;
  }

  function getAll() {
    return LIST;
  }

  return { getAll, getWorldForScore, getIndex, getProgress, getSecretHint, getDisplayName };
})();

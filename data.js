// Dados estáticos do Goblin Horde TD (sem lógica aqui)
const CFG = { W: 960, H: 600, baseX: 900, baseY: 300, baseR: 34, startGold: 400, baseHp: 30, intervaloOnda: 600 };

// Mapa: caminho em segmentos horizontais/verticais (último ponto = castelo). Torres não podem ser postas no caminho.
const MAPA = {
  nome: 'Campina', nivel: 1, larg: 72,
  // Horda única de `dur` segundos, calibrada para ser impossível sem melhorias permanentes.
  // Grupos nascem a cada gap quadros (gapIni→gapFim) com tam goblins (tamIni→tamFim); a mistura vai de peso0 a peso1;
  // vida e velocidade crescem até hpFim/velFim (multiplicadores) no fim da horda.
  horda: { dur: 300, gapIni: 120, gapFim: 30, tamIni: 6, tamFim: 24, peso0: { comum: 1, rapido: 0.1, bruto: 0 }, peso1: { comum: 0.5, rapido: 0.3, bruto: 0.2 }, hpFim: 6, velFim: 1.15 },
  pontos: [[-60, 100], [200, 100], [200, 480], [450, 480], [450, 200], [700, 200], [700, CFG.baseY], [CFG.baseX, CFG.baseY]],
};

const TOWERS = {
  arqueiro: { nome: 'Arqueiro', custo: 50,  dano: 7,  cd: 28, alcance: 130, tipo: 'flecha', vel: 7, cor: '#c8903c', cor2: '#7a5420' },
  canhao:   { nome: 'Canhão',   custo: 100, dano: 16, cd: 85, alcance: 150, tipo: 'bomba',  vel: 4, raio: 44, cor: '#8a8a95', cor2: '#4a4a55' },
  gelo:     { nome: 'Gelo',     custo: 75,  dano: 1,  cd: 70, alcance: 105, tipo: 'pulso',  slow: 0.45, slowT: 100, cor: '#6fd6ff', cor2: '#2a7aa0' },
};

const GOBLINS = {
  comum:  { hp: 20, vel: 0.85, r: 5, ouro: 2, dano: 1, cor: '#4cb85a', cor2: '#2a7a36' },
  rapido: { hp: 12, vel: 1.45, r: 4, ouro: 2, dano: 1, cor: '#b8d84c', cor2: '#7a9a2a' },
  bruto:  { hp: 100, vel: 0.5, r: 8, ouro: 9, dano: 3, cor: '#8a5a3a', cor2: '#5a3820' },
};

const custoUpgrade = (def, lvl) => Math.floor(def.custo * 0.7 * lvl);

// Escala por nível do mapa (nível 1 = Campina). Mapa novo: copie MAPA, aumente `nivel` e o jogador precisará de mais melhorias.
const dif = n => ({ qtd: 1 + 0.5 * (n - 1), hp: Math.pow(1.6, n - 1), vel: 1 + 0.05 * (n - 1) });

// Melhorias permanentes (compradas com moedas ganhas a cada tentativa). u = efeito por nível, b = custo base, mx = nível máximo
const PERKS = {
  ouro:  { n: 'Cofre',     d: '+50 ouro inicial',      u: 50,   b: 60,  mx: 8 },
  vida:  { n: 'Muralhas',  d: '+5 vida do castelo',    u: 5,    b: 80,  mx: 8 },
  dano:  { n: 'Afiação',   d: '+8% dano das torres',   u: 0.08, b: 100, mx: 8 },
  alc:   { n: 'Mira',      d: '+5% alcance',           u: 0.05, b: 80,  mx: 8 },
  cad:   { n: 'Cadência',  d: '-5% recarga',           u: 0.05, b: 120, mx: 8 },
  renda: { n: 'Saque',     d: '+10% ouro por goblin',  u: 0.10, b: 100, mx: 8 },
  feira: { n: 'Barganha',  d: '-4% custo das torres',  u: 0.04, b: 90,  mx: 8 },
};
const custoPerk = (p, l) => Math.round(p.b * Math.pow(1.45, l));
const moedasGanhas = (abates, venceu) => Math.floor(abates / 5) + (venceu ? 300 : 0);

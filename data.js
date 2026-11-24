// Dados estáticos do Goblin Horde TD (sem lógica aqui)
const CFG = { W: 960, H: 600, baseX: 900, baseY: 300, baseR: 34, startGold: 400, baseHp: 30, intervaloOnda: 600 };

// Mapa: caminho em segmentos horizontais/verticais (último ponto = castelo). Torres não podem ser postas no caminho.
const MAPA = {
  nome: 'Campina', nivel: 1, larg: 72,
  // Run de 6 min = 3 ondas de 2 min (dur em segundos), sem intervalo entre elas.
  // Grupos nascem a cada gap quadros (gapIni→gapFim) com tam goblins (tamIni→tamFim); a mistura vai de peso0 a peso1;
  // hp / vel = [início, fim] da onda (multiplicadores).
  ondas: [
    { dur: 120, gapIni: 120, gapFim: 70, tamIni: 4,  tamFim: 10, peso0: { comum: 1, rapido: 0.1, bruto: 0 },    peso1: { comum: 0.8, rapido: 0.3, bruto: 0.05 }, hp: [1, 1.5],   vel: [1, 1.05] },
    { dur: 120, gapIni: 90,  gapFim: 45, tamIni: 8,  tamFim: 16, peso0: { comum: 1, rapido: 0.3, bruto: 0.05 }, peso1: { comum: 0.6, rapido: 0.5, bruto: 0.2 },  hp: [2, 3],     vel: [1.05, 1.1] },
    { dur: 120, gapIni: 60,  gapFim: 25, tamIni: 14, tamFim: 26, peso0: { comum: 0.6, rapido: 0.5, bruto: 0.2 }, peso1: { comum: 0.4, rapido: 0.4, bruto: 0.4 },  hp: [3.5, 6],   vel: [1.1, 1.2] },
  ],
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

const RUN_FRAMES = MAPA.ondas.reduce((n, o) => n + o.dur * 60, 0);

// Escala por nível do mapa (nível 1 = Campina). Mapa novo: copie MAPA, aumente `nivel` e o jogador precisará de mais melhorias.
const dif = n => ({ qtd: 1 + 0.5 * (n - 1), hp: Math.pow(1.6, n - 1), vel: 1 + 0.05 * (n - 1) });

// Melhorias permanentes (compradas com moedas ganhas a cada tentativa). u = efeito por nível, b = custo base, mx = nível máximo
const PERKS = {
  slot:   { n: 'Unidade',   d: '+1 unidade em campo',   u: 1,    c: [22, 57, 115, 155, 250, 250, 315, 455] },
  canhao: { n: 'Canhão',    d: 'Libera o Canhão',       u: 1,    c: [1490] },
  gelo:   { n: 'Gelo',      d: 'Libera a torre de Gelo', u: 1,   c: [2910] },
  vida:  { n: 'Muralhas',  d: '+5 vida do castelo',    u: 5,    c: [22, 56, 155, 180, 200, 210, 490, 490] },
  arq_multi: { n: 'Tiro múltiplo', d: '+1 flecha por disparo (alvos distintos)', u: 1, c: [7, 34, 91, 135] },
  can_raio:  { n: 'Explosão',     d: '+10% raio da explosão',               u: 0.10, c: [260, 285, 435, 475, 480] },
  gel_dur:   { n: 'Congelar',     d: '+15% duração da lentidão',             u: 0.15, c: [465, 465, 485, 490, 490] },
};
// Custos por nível (moedas), gerados por simulação: cada passo custa ~R runs de renda da build naquele ponto
// (R=1 nas 1ªs melhorias, ~0.6 no meio, ~0.5 no fim, ~3 para liberar torre).
const CUSTOS = {
  arq_cad:  [2, 3, 4, 10, 160, 180, 200, 210],      arq_dano: [3, 4, 5, 10, 170, 190, 215, 235],      arq_alc:  [3, 4, 9, 11, 180, 205, 220, 250],
  can_cad:  [240, 240, 240, 265, 280, 380, 445, 460], can_dano: [240, 240, 240, 270, 300, 400, 450, 470], can_alc:  [245, 245, 260, 280, 385, 430, 455, 480],
  gel_cad:  [465, 465, 465, 465, 465, 475, 485, 485], gel_dano: [470, 470, 470, 470, 470, 475, 485, 490], gel_alc:  [470, 470, 470, 470, 470, 475, 485, 490],
};
// perks de dano / alcance / cadência: um conjunto por torre (prefixo arq_, can_, gel_)
for (const [p, nm] of [['arq', 'do Arqueiro'], ['can', 'do Canhão'], ['gel', 'do Gelo']]) {
  PERKS[p + '_dano'] = { n: 'Afiação',  d: `+20% dano ${nm}`,     u: 0.20, c: CUSTOS[p + '_dano'] };
  PERKS[p + '_alc']  = { n: 'Mira',      d: `+8% alcance ${nm}`,  u: 0.08, c: CUSTOS[p + '_alc'] };
  PERKS[p + '_cad']  = { n: 'Cadência',  d: `-7% recarga ${nm}`,  u: 0.07, c: CUSTOS[p + '_cad'] };
}
for (const k in PERKS) PERKS[k].mx = PERKS[k].c.length;
const custoPerk = (p, l) => p.c[l];
// Skill tree única (uma árvore por torre, todas no mesmo mapa). x/y em 960x600; pai = perk que precisa ter nível ≥ 1, ou uma raiz de ROOTS
const ROOTS = {
  BASE: { x: 90,  y: 330, pai: null,   ic: 'BAS', nome: 'BASE' },
  ARQ:  { x: 340, y: 320, pai: 'BASE', ic: 'ARQ', nome: 'ARQUEIRO' },
};
const PRE = { arqueiro: 'arq', canhao: 'can', gelo: 'gel' };
const TREE = {
  slot:      { x: 110, y: 190, pai: 'BASE',     ic: 'UNI', cor: '#c8903c' },
  vida:      { x: 110, y: 470, pai: 'BASE',     ic: 'HP',  cor: '#ff4c4c' },
  arq_dano:  { x: 240, y: 190, pai: 'ARQ',      ic: 'ATK', cor: '#ff6060' },
  arq_alc:   { x: 400, y: 190, pai: 'ARQ',      ic: 'RNG', cor: '#6fd6ff' },
  arq_multi: { x: 520, y: 190, pai: 'arq_alc',  ic: 'x2',  cor: '#ffffff' },
  arq_cad:   { x: 260, y: 470, pai: 'ARQ',      ic: 'CAD', cor: '#ffd84c' },
  canhao:    { x: 740, y: 190, pai: 'ARQ',      ic: 'CAN', cor: '#8a8a95' },
  can_dano:  { x: 650, y: 110, pai: 'canhao',   ic: 'ATK', cor: '#ff6060' },
  can_alc:   { x: 830, y: 110, pai: 'canhao',   ic: 'RNG', cor: '#6fd6ff' },
  can_raio:  { x: 900, y: 230, pai: 'can_alc',  ic: 'AOE', cor: '#ffffff' },
  can_cad:   { x: 640, y: 270, pai: 'canhao',   ic: 'CAD', cor: '#ffd84c' },
  gelo:      { x: 740, y: 440, pai: 'ARQ',      ic: 'ICE', cor: '#6fd6ff' },
  gel_dano:  { x: 640, y: 360, pai: 'gelo',     ic: 'ATK', cor: '#ff6060' },
  gel_alc:   { x: 840, y: 360, pai: 'gelo',     ic: 'RNG', cor: '#6fd6ff' },
  gel_dur:   { x: 905, y: 480, pai: 'gel_alc',  ic: 'DUR', cor: '#ffffff' },
  gel_cad:   { x: 650, y: 525, pai: 'gelo',     ic: 'CAD', cor: '#ffd84c' },
};
// BALANCEAMENTO (simulador headless): moedas = abates / ABATES_POR_MOEDA.
//   sem melhorias ~14 abates · +Mira/Tiro múltiplo ~120 · +2 unidades ~470 · arqueiros maxados ~2000 · +Canhão ~4600 (vitória).
//   Comprando sempre o mais barato: 1ª unidade extra ~run 12, Canhão ~33, 1ª vitória ~42, Gelo ~49, árvore completa ~63.
const ABATES_POR_MOEDA = 5;
const moedasGanhas = abates => Math.floor(abates / ABATES_POR_MOEDA);

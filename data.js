// Dados estáticos do Goblin Horde TD (sem lógica aqui)
const CFG = { W: 960, H: 600, baseX: 900, baseY: 300, baseR: 34, startGold: 400, baseHp: 30, intervaloOnda: 600 };

// Mapa: caminho em segmentos horizontais/verticais (último ponto = castelo). Torres não podem ser postas no caminho.
// Tema padrão (chão, caminho, obstáculos) usado quando o mapa não define `tema`
const TEMA0 = { g: ['#2f6a2a', '#2a6026', '#3c8034'], p: ['#5a4630', '#9a7a48', '#8a6a3c'], ob: ['#183018', '#2a5a24'] };
// Ondas dos mapas 2-6 (mesmo ritmo da Campina): mix[i] = [pesos início, pesos fim] da onda i; chefe[i] = segundo em que o chefe nasce na onda i
const ONDAS = (mix, chefe = []) => [
  { dur: 120, gapIni: 120, gapFim: 70, tamIni: 4,  tamFim: 10, hp: [1, 1.5], vel: [1, 1.05] },
  { dur: 120, gapIni: 90,  gapFim: 45, tamIni: 8,  tamFim: 16, hp: [2, 3],   vel: [1.05, 1.1] },
  { dur: 120, gapIni: 60,  gapFim: 25, tamIni: 14, tamFim: 26, hp: [3.5, 6], vel: [1.1, 1.2] },
].map((o, i) => ({ ...o, peso0: mix[i][0], peso1: mix[i][1], chefe: chefe[i] }));

// Mapas em ordem de dificuldade (o próximo só abre depois de vencer o anterior). Campos opcionais:
//   rotas (várias entradas) · bloq [x,y,w,h] (sem torres) · mod.alc (neblina) · perigos (gêiseres que atordoam torres) · dif (escala própria) · tema · desafio (texto do HUD)
const MAPAS = [{
  nome: 'Campina', nivel: 1, larg: 72, desafio: 'Sem desafios · aprenda o básico',
  // Run de 6 min = 3 ondas de 2 min (dur em segundos), sem intervalo entre elas.
  // Grupos nascem a cada gap quadros (gapIni→gapFim) com tam goblins (tamIni→tamFim); a mistura vai de peso0 a peso1;
  // hp / vel = [início, fim] da onda (multiplicadores).
  ondas: [
    { dur: 120, gapIni: 120, gapFim: 70, tamIni: 4,  tamFim: 10, peso0: { comum: 1, rapido: 0, bruto: 0 },    peso1: { comum: 1, rapido: 0, bruto: 0 }, hp: [1, 1.5],   vel: [1, 1.05] },
    { dur: 120, gapIni: 90,  gapFim: 45, tamIni: 8,  tamFim: 16, peso0: { comum: 1, rapido: 0.3, bruto: 0.05 }, peso1: { comum: 0.6, rapido: 0.5, bruto: 0.2 },  hp: [2, 3],     vel: [1.05, 1.1] },
    { dur: 120, gapIni: 60,  gapFim: 25, tamIni: 14, tamFim: 26, peso0: { comum: 0.6, rapido: 0.5, bruto: 0.2 }, peso1: { comum: 0.4, rapido: 0.4, bruto: 0.4 },  hp: [3.5, 6],   vel: [1.1, 1.2] },
  ],
  pontos: [[-60, 100], [200, 100], [200, 480], [450, 480], [450, 200], [700, 200], [700, CFG.baseY], [CFG.baseX, CFG.baseY]],
},
{ nome: 'Floresta', nivel: 2, larg: 64, desafio: 'Neblina -15% alcance · Blindados',
  tema: { g: ['#24502a', '#204824', '#2e6030'], p: ['#4a3a28', '#7a6040', '#6a5238'], ob: ['#102a10', '#1e4a1e'] },
  mod: { alc: 0.85 }, dif: { qtd: 1.1, hp: 1.4, vel: 1.03 },
  bloq: [[215, 215, 90, 140], [440, 230, 90, 110], [660, 330, 60, 70], [400, 500, 220, 70]],
  ondas: ONDAS([
    [{ comum: 1, rapido: .2, blindado: .05 }, { comum: .8, rapido: .3, bruto: .05, blindado: .15 }],
    [{ comum: .7, rapido: .4, bruto: .1, blindado: .25 }, { comum: .5, rapido: .4, bruto: .2, blindado: .4 }],
    [{ comum: .5, rapido: .4, bruto: .2, blindado: .4 }, { comum: .35, rapido: .35, bruto: .3, blindado: .55 }],
  ]),
  rotas: [[[-60, 160], [160, 160], [160, 430], [360, 430], [360, 150], [600, 150], [600, 450], [780, 450], [780, CFG.baseY], [CFG.baseX, CFG.baseY]]] },
{ nome: 'Pântano', nivel: 3, larg: 64, desafio: 'Gêiseres param torres · Xamãs curam',
  tema: { g: ['#3a5a2c', '#34502a', '#4a6a34'], p: ['#3a2e20', '#6a5a3a', '#5a4a30'], ob: ['#1a2a18', '#2e4a28'] },
  dif: { qtd: 1.2, hp: 1.8, vel: 1.05 },
  perigos: [
    { x: 310, y: 290, r: 56, per: 480, off: 0,   stun: 240, cor: '#3a2a4a', cor2: '#8a5aaa' },
    { x: 530, y: 290, r: 56, per: 480, off: 240, stun: 240, cor: '#3a2a4a', cor2: '#8a5aaa' },
    { x: 720, y: 250, r: 50, per: 480, off: 120, stun: 240, cor: '#3a2a4a', cor2: '#8a5aaa' },
  ],
  ondas: ONDAS([
    [{ comum: 1, rapido: .2, xama: .03 }, { comum: .8, rapido: .3, bruto: .05, xama: .08 }],
    [{ comum: .7, rapido: .4, bruto: .15, xama: .1, blindado: .1 }, { comum: .5, rapido: .4, bruto: .25, xama: .18, blindado: .15 }],
    [{ comum: .5, rapido: .4, bruto: .25, xama: .18, blindado: .2 }, { comum: .35, rapido: .35, bruto: .35, xama: .25, blindado: .25 }],
  ]),
  rotas: [[[-60, 500], [200, 500], [200, 150], [420, 150], [420, 430], [640, 430], [640, 150], [800, 150], [800, CFG.baseY], [CFG.baseX, CFG.baseY]]] },
{ nome: 'Desfiladeiro', nivel: 4, larg: 56, desafio: 'Morcegos voam direto ao castelo',
  tema: { g: ['#5a5a62', '#52525a', '#6a6a74'], p: ['#34343c', '#78787e', '#68686e'], ob: ['#2a2a30', '#4a4a54'] },
  dif: { qtd: 1.3, hp: 2.2, vel: 1.07 },
  bloq: [[230, 240, 100, 120], [440, 230, 100, 110], [0, 520, 170, 80], [600, 520, 200, 80]],
  ondas: ONDAS([
    [{ comum: .9, rapido: .2, morcego: .15 }, { comum: .7, rapido: .3, bruto: .05, morcego: .3 }],
    [{ comum: .6, rapido: .4, bruto: .15, morcego: .35, blindado: .1 }, { comum: .45, rapido: .4, bruto: .25, morcego: .5, blindado: .2 }],
    [{ comum: .45, rapido: .4, bruto: .25, morcego: .5, xama: .1, blindado: .25 }, { comum: .3, rapido: .35, bruto: .35, morcego: .65, xama: .15, blindado: .3 }],
  ]),
  rotas: [[[-60, 430], [170, 430], [170, 140], [390, 140], [390, 470], [590, 470], [590, 170], [770, 170], [770, CFG.baseY], [CFG.baseX, CFG.baseY]]] },
{ nome: 'Ruínas', nivel: 5, larg: 60, desafio: 'Duas rotas · Sapadores sabotam torres',
  tema: { g: ['#8a7a4a', '#827244', '#9a8a56'], p: ['#5a4a30', '#b8a070', '#a89060'], ob: ['#4a4030', '#7a6c50'] },
  dif: { qtd: 1.4, hp: 2.7, vel: 1.09 },
  bloq: [[540, 220, 50, 40], [540, 340, 50, 40], [700, 220, 50, 40], [700, 340, 50, 40]],
  ondas: ONDAS([
    [{ comum: .9, rapido: .3, sapador: .05 }, { comum: .7, rapido: .4, bruto: .05, sapador: .12 }],
    [{ comum: .6, rapido: .4, bruto: .15, sapador: .18, blindado: .15 }, { comum: .45, rapido: .4, bruto: .25, sapador: .28, blindado: .25 }],
    [{ comum: .45, rapido: .4, bruto: .25, sapador: .3, blindado: .25, morcego: .2 }, { comum: .3, rapido: .35, bruto: .35, sapador: .4, blindado: .3, morcego: .3 }],
  ]),
  rotas: [
    [[-60, 150], [300, 150], [300, 300], [CFG.baseX, CFG.baseY]],
    [[-60, 450], [300, 450], [300, 300], [CFG.baseX, CFG.baseY]],
  ] },
{ nome: 'Covil do Rei', nivel: 6, larg: 56, desafio: 'Chefe invoca hordas · tudo junto',
  tema: { g: ['#3a2030', '#341c2a', '#4a2a3c'], p: ['#1c0e16', '#6a3030', '#5a2828'], ob: ['#1a0c14', '#3a1c2a'] },
  dif: { qtd: 1.5, hp: 3.3, vel: 1.1 },
  perigos: [
    { x: 415, y: 300, r: 52, per: 420, off: 0,   stun: 240, cor: '#5a1810', cor2: '#e05020' },
    { x: 605, y: 300, r: 52, per: 420, off: 210, stun: 240, cor: '#5a1810', cor2: '#e05020' },
  ],
  ondas: ONDAS([
    [{ comum: .8, rapido: .3, blindado: .1, xama: .05 }, { comum: .6, rapido: .4, bruto: .1, blindado: .2, xama: .1, morcego: .15 }],
    [{ comum: .5, rapido: .4, bruto: .2, blindado: .3, xama: .15, morcego: .3, sapador: .15 }, { comum: .4, rapido: .4, bruto: .3, blindado: .4, xama: .2, morcego: .4, sapador: .25 }],
    [{ comum: .4, rapido: .4, bruto: .3, blindado: .4, xama: .2, morcego: .4, sapador: .25 }, { comum: .3, rapido: .3, bruto: .4, blindado: .5, xama: .25, morcego: .5, sapador: .35 }],
  ], [0, 90, 100]),
  rotas: [[[-60, 300], [130, 300], [130, 130], [320, 130], [320, 470], [510, 470], [510, 130], [700, 130], [700, 470], [820, 470], [820, CFG.baseY], [CFG.baseX, CFG.baseY]]] },
];
let MAPA = MAPAS[0];
MAPAS.forEach(m => { m.rotas = m.rotas || [m.pontos]; m.bloq = m.bloq || []; m.perigos = m.perigos || []; m.mod = m.mod || {}; });

const TOWERS = {
  arqueiro: { nome: 'Arqueiro', custo: 50,  dano: 7,  cd: 28, alcance: 130, tipo: 'flecha', vel: 7, cor: '#c8903c', cor2: '#7a5420', cone: 70 },
  canhao:   { nome: 'Canhão',   custo: 100, dano: 16, cd: 85, alcance: 150, tipo: 'bomba',  vel: 4, raio: 44, cor: '#8a8a95', cor2: '#4a4a55', cone: 40 },
  gelo:     { nome: 'Gelo',     custo: 75,  dano: 1,  cd: 70, alcance: 105, tipo: 'pulso',  slow: 0.45, slowT: 100, cor: '#6fd6ff', cor2: '#2a7aa0', cone: 100 },
  // Torres novas. balista: virote que atravessa TODOS na linha (multi) · tesla: mira sozinha no líder do cone e a descarga salta (cadeia/elo) ·
  // chamas: curto alcance, queimadura (ignora armadura, impede cura) · veneno: poça no chão (dano fixo + % da vida, ignora armadura, não acumula) · totem: sem ataque, aura de dano/cadência
  balista:  { nome: 'Balista',  dano: 30, cd: 100, alcance: 220, tipo: 'lanca',  vel: 10, multi: true, cor: '#b0b0c0', cor2: '#505068', cone: 22 },
  tesla:    { nome: 'Tesla',    dano: 7,  cd: 45,  alcance: 115, tipo: 'raio',   cadeia: 5, elo: 44, cor: '#ffe84c', cor2: '#a08010', cone: 80 },
  chamas:   { nome: 'Chamas',   dano: 2,  cd: 8,   alcance: 62,  tipo: 'fogo',   queima: 90, cor: '#ff7a1c', cor2: '#a03a08', cone: 50 },
  veneno:   { nome: 'Alquimista', dano: 1, cd: 160, alcance: 150, tipo: 'poca',  vel: 3.2, raio: 42, dur: 270, tick: 15, pct: 0.01, cor: '#6ae04c', cor2: '#2a8a28', cone: 36 },
  totem:    { nome: 'Totem',    dano: 0,  cd: 0,   alcance: 105, tipo: 'aura',   buffD: 0.25, buffC: 0.15, cor: '#e04ca0', cor2: '#802060', cone: 0 },
};

// Cone de tiro (graus): cada torre tem um `cone` padrão; o jogador ajusta direção (mouse) e abertura (roda) ao posicionar.
// passos = tiros por varredura (de uma ponta do cone à outra, indo e voltando).
const CONE_CFG = { passos: 7, min: 20, max: 140, passo: 10 };

const GOBLINS = {
  // fixo: ignora o multiplicador de vida das ondas (morre com 1 tiro) · enxame: quantas cópias nascem por goblin sorteado
  comum:  { hp: 6, vel: 0.77, r: 3, ouro: 2, dano: 1, fixo: true, enxame: 12, cor: '#4cb85a', cor2: '#2a7a36' },
  rapido: { hp: 4, vel: 1.3, r: 3, ouro: 2, dano: 1, fixo: true, enxame: 12, cor: '#b8d84c', cor2: '#7a9a2a' },
  bruto:  { hp: 100, vel: 0.45, r: 8, ouro: 9, dano: 3, cor: '#8a5a3a', cor2: '#5a3820' },
  // armor: reduz cada acerto (mín. 1) · cura: % da vida curada a cada 0,5s em raioCura · voa: ignora o caminho · sabota: atordoa torre a `sab` px ao explodir · invoca: 12 goblins a cada N quadros
  blindado: { hp: 40, vel: 0.55, r: 5, dano: 2, armor: 3, cor: '#7a8aa8', cor2: '#3a4a68' },
  xama:     { hp: 30, vel: 0.6, r: 5, dano: 1, cura: 0.06, raioCura: 70, cor: '#c04cf0', cor2: '#6a2a98' },
  morcego:  { hp: 7, vel: 1.1, r: 3, dano: 1, voa: true, fixo: true, enxame: 6, cor: '#8a5ac8', cor2: '#4a2a78' },
  sapador:  { hp: 14, vel: 0.9, r: 4, dano: 1, sabota: true, sab: 30, cor: '#f0a830', cor2: '#8a5a10' },
  chefe:    { hp: 400, vel: 0.3, r: 14, dano: 10, boss: true, invoca: 240, cor: '#d03838', cor2: '#701818' },
};

const runFrames = m => m.ondas.reduce((n, o) => n + o.dur * 60, 0);
let RUN_FRAMES = runFrames(MAPA);

// Escala por nível do mapa (nível 1 = Campina). Mapa novo: copie MAPA, aumente `nivel` e o jogador precisará de mais melhorias.
const dif = n => MAPA.dif || { qtd: 1 + 0.5 * (n - 1), hp: Math.pow(1.6, n - 1), vel: 1 + 0.05 * (n - 1) };

// Melhorias permanentes (compradas com moedas ganhas a cada tentativa). u = efeito por nível, b = custo base, mx = nível máximo
const PERKS = {
  arq_slot: { n: 'Unidade',   d: '+1 Arqueiro em campo',   u: 1, c: [22, 57, 115, 155, 250] },
  can_slot: { n: 'Unidade',   d: '+1 Canhão em campo',     u: 1, c: [250, 300, 380, 450, 480] },
  gel_slot: { n: 'Unidade',   d: '+1 torre de Gelo em campo', u: 1, c: [470, 470, 480, 485, 490] },
  canhao: { n: 'Canhão',    d: 'Libera o Canhão',       u: 1,    c: [1490] },
  gelo:   { n: 'Gelo',      d: 'Libera a torre de Gelo', u: 1,   c: [2910] },
  vida:  { n: 'Muralhas',  d: '+8 vida do castelo',    u: 8,    c: [22, 56, 155, 180, 200] },
  arq_multi: { n: 'Tiro múltiplo', d: '+1 flecha por disparo (em leque)', u: 1, c: [7, 34, 91, 135] },
  can_raio:  { n: 'Explosão',     d: '+10% raio da explosão',               u: 0.10, c: [260, 285, 435, 475, 480] },
  gel_dur:   { n: 'Congelar',     d: '+15% duração da lentidão',             u: 0.15, c: [465, 465, 485, 490, 490] },
};
// Custos por nível (moedas), gerados por simulação: cada passo custa ~R runs de renda da build naquele ponto
// (R=1 nas 1ªs melhorias, ~0.6 no meio, ~0.5 no fim, ~3 para liberar torre).
const CUSTOS = {
  arq_cad:  [2, 3, 4, 10, 160],      arq_dano: [3, 4, 5, 10, 170],      arq_alc:  [3, 4, 9, 11, 180],
  can_cad:  [240, 240, 240, 265, 280], can_dano: [240, 240, 240, 270, 300], can_alc:  [245, 245, 260, 280, 385],
  gel_cad:  [465, 465, 465, 465, 465], gel_dano: [470, 470, 470, 470, 470], gel_alc:  [470, 470, 470, 470, 470],
};
// perks de dano / alcance / cadência: um conjunto por torre (prefixo arq_, can_, gel_)
for (const [p, nm] of [['arq', 'do Arqueiro'], ['can', 'do Canhão'], ['gel', 'do Gelo']]) {
  PERKS[p + '_dano'] = { n: 'Afiação',  d: `+32% dano ${nm}`,     u: 0.32, c: CUSTOS[p + '_dano'] };
  PERKS[p + '_alc']  = { n: 'Mira',      d: `+13% alcance ${nm}`,  u: 0.13, c: CUSTOS[p + '_alc'] };
  PERKS[p + '_cad']  = { n: 'Cadência',  d: `-11% recarga ${nm}`,  u: 0.11, c: CUSTOS[p + '_cad'] };
}
// Arqueiro: Afiação virou Perfuração (u:0 = não altera dano; nível = nº de inimigos extras atravessados por flecha)
PERKS.arq_dano = { n: 'Perfuração', d: '+1 inimigo atravessado por flecha', u: 0, c: CUSTOS.arq_dano };
for (const k in PERKS) PERKS[k].mx = PERKS[k].c.length;
const custoPerk = (p, l) => p.c[l];
// Skill tree única (uma árvore por torre, todas no mesmo mapa). x/y em 960x600; pai = perk que precisa ter nível ≥ 1, ou uma raiz de ROOTS
const ROOTS = {
  BASE: { x: 90,  y: 330, pai: null,   ic: 'BAS', nome: 'BASE' },
  ARQ:  { x: 340, y: 320, pai: 'BASE', ic: 'ARQ', nome: 'ARQUEIRO' },
};
const PRE = { arqueiro: 'arq', canhao: 'can', gelo: 'gel' };
const TREE = {
  arq_slot:  { x: 400, y: 470, pai: 'ARQ',      ic: 'UNI', cor: '#c8903c' },
  can_slot:  { x: 770, y: 300, pai: 'canhao',   ic: 'UNI', cor: '#c8903c' },
  gel_slot:  { x: 775, y: 540, pai: 'gelo',     ic: 'UNI', cor: '#c8903c' },
  vida:      { x: 110, y: 470, pai: 'BASE',     ic: 'HP',  cor: '#ff4c4c' },
  arq_dano:  { x: 240, y: 190, pai: 'ARQ',      ic: 'PER', cor: '#ff6060' },
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
const ABATES_POR_MOEDA = 25;
const moedasGanhas = abates => abates > 0 ? Math.max(1, Math.floor(abates / ABATES_POR_MOEDA)) : 0;

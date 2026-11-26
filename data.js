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
//   rotas (várias entradas, cada uma começa fora da tela) · base [x,y] (posição do castelo; padrão CFG.baseX/baseY; último ponto de toda rota = castelo) · bloq [x,y,w,h] (sem torres) · muros [x,y,w,h] (sem torres e barram flechas/virotes) · nevoas {x,y,r,f} (alcance ×f nas torres dentro) ·
//   perigos (gêiseres/lava que atordoam torres dentro da zona) · nevoas (alcance ×f) · ambos aceitam círculo {x,y,r} ou formas {rs:[[cx,cy,w,h],...]} (união de retângulos) · tempestade {per,stun} (raio atordoa torre aleatória) · dif (escala própria) · tema · desafio (texto do HUD)
const MAPAS = [{
  nome: 'Campina', nivel: 1, larg: 60, grama: 'assets/tilesets/tileset_grama_campina.png', desafio: 'Serpente em S · aprenda o básico',
  // Run de 6 min = 3 ondas de 2 min (dur em segundos), sem intervalo entre elas.
  // Grupos nascem a cada gap quadros (gapIni→gapFim) com tam goblins (tamIni→tamFim); a mistura vai de peso0 a peso1;
  // hp / vel = [início, fim] da onda (multiplicadores).
  ondas: [
    { dur: 120, gapIni: 120, gapFim: 70, tamIni: 4,  tamFim: 10, peso0: { comum: 1, rapido: 0, bruto: 0 },    peso1: { comum: 1, rapido: 0, bruto: 0 }, hp: [1, 1.5],   vel: [1, 1.05] },
    { dur: 120, gapIni: 90,  gapFim: 45, tamIni: 8,  tamFim: 16, peso0: { comum: 1, rapido: 0.3, bruto: 0.05 }, peso1: { comum: 0.6, rapido: 0.5, bruto: 0.2 },  hp: [2, 3],     vel: [1.05, 1.1] },
    { dur: 120, gapIni: 60,  gapFim: 25, tamIni: 14, tamFim: 26, peso0: { comum: 0.6, rapido: 0.5, bruto: 0.2 }, peso1: { comum: 0.4, rapido: 0.4, bruto: 0.4 },  hp: [3.5, 6],   vel: [1.1, 1.2] },
  ],
  bloq: [[90, 240, 80, 60], [720, 350, 90, 60]],
  pontos: [[-60, 150], [600, 150], [600, 300], [280, 300], [280, 450], [CFG.baseX, 450], [CFG.baseX, CFG.baseY]],
},
{ nome: 'Floresta', nivel: 2, larg: 44, grama: 'assets/tilesets/tileset_grama_floresta.png', desafio: 'Pente · Duas entradas · Neblina',
  tema: { g: ['#24502a', '#204824', '#2e6030'], p: ['#4a3a28', '#7a6040', '#6a5238'], ob: ['#102a10', '#1e4a1e'] },
  dif: { qtd: 1.1, hp: 1.4, vel: 1.03 },
  nevoas: [
    { rs: [[375, 275, 100, 250]], f: 0.55 }, { rs: [[525, 330, 100, 250]], f: 0.55 },
    { rs: [[705, 345, 110, 84], [795, 430, 56, 180]], f: 0.55 }, { x: 225, y: 315, r: 75, f: 0.55 },
  ],
  bloq: [[40, 380, 80, 90], [560, 500, 80, 60]],
  ondas: ONDAS([
    [{ comum: 1, rapido: .2, blindado: .05 }, { comum: .8, rapido: .3, bruto: .05, blindado: .15 }],
    [{ comum: .7, rapido: .4, bruto: .1, blindado: .25 }, { comum: .5, rapido: .4, bruto: .2, blindado: .4 }],
    [{ comum: .5, rapido: .4, bruto: .2, blindado: .4 }, { comum: .35, rapido: .35, bruto: .3, blindado: .55 }],
  ]),
  rotas: [
    [[-60, 300], [150, 300], [150, 180], [300, 180], [300, 420], [450, 420], [450, 180], [600, 180], [600, 420], [760, 420], [760, 300], [CFG.baseX, CFG.baseY]],
    [[700, 660], [700, 550], [850, 550], [850, 300], [CFG.baseX, CFG.baseY]],
  ] },
{ nome: 'Pântano', nivel: 3, larg: 48, grama: 'assets/tilesets/tileset_grama_pantano.png', desafio: 'Serpentes + atalho · Gêiseres · Xamãs curam',
  tema: { g: ['#3a5a2c', '#34502a', '#4a6a34'], p: ['#3a2e20', '#6a5a3a', '#5a4a30'], ob: ['#1a2a18', '#2e4a28'] },
  dif: { qtd: 1.2, hp: 1.8, vel: 1.05 },
  bloq: [[760, 330, 80, 50]],
  // gêiseres em faixas sobre os melhores pontos de tiro (entre as serpentes) + dois grandes círculos na área aberta; ciclos defasados
  perigos: [
    { rs: [[380, 250, 324, 56]], per: 480, off: 0,   stun: 210, cor: '#3a2a4a', cor2: '#8a5aaa' },
    { rs: [[380, 350, 324, 56]], per: 480, off: 80,  stun: 210, cor: '#3a2a4a', cor2: '#8a5aaa' },
    { rs: [[320, 155, 264, 44]], per: 480, off: 160, stun: 210, cor: '#3a2a4a', cor2: '#8a5aaa' },
    { rs: [[320, 445, 264, 44]], per: 480, off: 240, stun: 210, cor: '#3a2a4a', cor2: '#8a5aaa' },
    { x: 630, y: 200, r: 64, per: 480, off: 320, stun: 210, cor: '#3a2a4a', cor2: '#8a5aaa' },
    { x: 630, y: 400, r: 64, per: 480, off: 400, stun: 210, cor: '#3a2a4a', cor2: '#8a5aaa' },
  ],
  ondas: ONDAS([
    [{ comum: 1, rapido: .2, xama: .03 }, { comum: .8, rapido: .3, bruto: .05, xama: .08 }],
    [{ comum: .7, rapido: .4, bruto: .15, xama: .1, blindado: .1 }, { comum: .5, rapido: .4, bruto: .25, xama: .18, blindado: .15 }],
    [{ comum: .5, rapido: .4, bruto: .25, xama: .18, blindado: .2 }, { comum: .35, rapido: .35, bruto: .35, xama: .25, blindado: .25 }],
  ]),
  rotas: [
    [[-60, 110], [520, 110], [520, 200], [200, 200], [200, 300], [CFG.baseX, CFG.baseY]],
    [[-60, 490], [520, 490], [520, 400], [200, 400], [200, 300], [CFG.baseX, CFG.baseY]],
    [[780, 660], [780, 430], [CFG.baseX, 430], [CFG.baseX, CFG.baseY]],
  ] },
{ nome: 'Desfiladeiro', nivel: 4, larg: 46, base: [560, 300], desafio: 'Espiral · Muralhas · Neblina · Morcegos',
  tema: { g: ['#5a5a62', '#52525a', '#6a6a74'], p: ['#34343c', '#78787e', '#68686e'], ob: ['#2a2a30', '#4a4a54'] },
  dif: { qtd: 1.3, hp: 2.2, vel: 1.07 },
  bloq: [[40, 190, 80, 70], [0, 520, 130, 80]],
  // muralhas altas dividem as duas faixas internas (barram flechas e virotes) e a neblina cobre os pontos de maior alcance
  muros: [[480, 156, 24, 112], [660, 156, 24, 112], [350, 332, 24, 112], [560, 334, 24, 110]],
  nevoas: [{ rs: [[340, 215, 150, 100]], f: 0.6 }, { rs: [[310, 385, 120, 110]], f: 0.6 }, { rs: [[700, 390, 130, 100]], f: 0.6 }],
  ondas: ONDAS([
    [{ comum: .9, rapido: .2, morcego: .15 }, { comum: .7, rapido: .3, bruto: .05, morcego: .3 }],
    [{ comum: .6, rapido: .4, bruto: .15, morcego: .35, blindado: .1 }, { comum: .45, rapido: .4, bruto: .25, morcego: .5, blindado: .2 }],
    [{ comum: .45, rapido: .4, bruto: .25, morcego: .5, xama: .1, blindado: .25 }, { comum: .3, rapido: .35, bruto: .35, morcego: .65, xama: .15, blindado: .3 }],
  ]),
  rotas: [
    [[-60, 130], [800, 130], [800, 470], [220, 470], [220, 300], [560, 300]],
    [[1020, 470], [220, 470], [220, 300], [560, 300]],
  ] },
{ nome: 'Ruínas', nivel: 5, larg: 48, desafio: 'Laço com cruzamento · Sapadores · Muralhas',
  tema: { g: ['#8a7a4a', '#827244', '#9a8a56'], p: ['#5a4a30', '#b8a070', '#a89060'], ob: ['#4a4030', '#7a6c50'] },
  dif: { qtd: 1.4, hp: 2.7, vel: 1.09 },
  bloq: [[820, 470, 70, 60], [100, 200, 60, 60]],
  muros: [[468, 183, 24, 84], [468, 333, 24, 84], [800, 176, 24, 90], [800, 334, 24, 90]],
  nevoas: [
    { rs: [[567, 225, 140, 96]], f: 0.62 }, { rs: [[567, 375, 140, 96]], f: 0.62 },
    { x: 750, y: 215, r: 62, f: 0.62 }, { x: 750, y: 385, r: 62, f: 0.62 }, { x: 150, y: 430, r: 65, f: 0.62 },
  ],
  ondas: ONDAS([
    [{ comum: .9, rapido: .3, sapador: .05 }, { comum: .7, rapido: .4, bruto: .05, sapador: .12 }],
    [{ comum: .6, rapido: .4, bruto: .15, sapador: .18, blindado: .15 }, { comum: .45, rapido: .4, bruto: .25, sapador: .28, blindado: .25 }],
    [{ comum: .45, rapido: .4, bruto: .25, sapador: .3, blindado: .25, morcego: .2 }, { comum: .3, rapido: .35, bruto: .35, sapador: .4, blindado: .3, morcego: .3 }],
  ]),
  rotas: [
    [[-60, 300], [300, 300], [300, 150], [660, 150], [660, 450], [300, 450], [300, 300], [CFG.baseX, CFG.baseY]],
    [[300, 660], [300, 300], [CFG.baseX, CFG.baseY]],
    [[660, -60], [660, 300], [CFG.baseX, CFG.baseY]],
  ] },
{ nome: 'Covil do Rei', nivel: 6, larg: 44, base: [480, 300], desafio: 'Cruzamento central · Raios · Lava · Chefe',
  tema: { g: ['#3a2030', '#341c2a', '#4a2a3c'], p: ['#1c0e16', '#6a3030', '#5a2828'], ob: ['#1a0c14', '#3a1c2a'] },
  dif: { qtd: 1.5, hp: 3.3, vel: 1.1 },
  bloq: [[40, 380, 90, 90], [830, 380, 90, 90]],
  muros: [[330, 380, 22, 80], [610, 380, 22, 80], [210, 350, 22, 70], [730, 350, 22, 70]],
  nevoas: [{ rs: [[490, 130, 224, 100]], f: 0.6 }, { rs: [[510, 490, 100, 110]], f: 0.6 }, { x: 150, y: 520, r: 65, f: 0.6 }, { x: 810, y: 520, r: 65, f: 0.6 }],
  tempestade: { per: 300, stun: 300 },
  // lava em oito pontos: junto ao castelo (blocos), nas faixas das serpentes, nos cantos (círculos) e nas bordas sul; ciclos defasados
  perigos: [
    { rs: [[370, 290, 110, 145]], per: 420, off: 0,   stun: 270, cor: '#5a1810', cor2: '#e05020' },
    { rs: [[600, 310, 110, 145]], per: 420, off: 70,  stun: 270, cor: '#5a1810', cor2: '#e05020' },
    { rs: [[300, 262, 176, 56]],  per: 420, off: 140, stun: 270, cor: '#5a1810', cor2: '#e05020' },
    { rs: [[660, 262, 176, 56]],  per: 420, off: 210, stun: 270, cor: '#5a1810', cor2: '#e05020' },
    { x: 230, y: 210, r: 78,      per: 420, off: 280, stun: 270, cor: '#5a1810', cor2: '#e05020' },
    { x: 730, y: 210, r: 78,      per: 420, off: 350, stun: 270, cor: '#5a1810', cor2: '#e05020' },
    { rs: [[300, 440, 200, 60]],  per: 420, off: 105, stun: 270, cor: '#5a1810', cor2: '#e05020' },
    { rs: [[660, 440, 200, 60]],  per: 420, off: 245, stun: 270, cor: '#5a1810', cor2: '#e05020' },
  ],
  ondas: ONDAS([
    [{ comum: .8, rapido: .3, blindado: .1, xama: .05 }, { comum: .6, rapido: .4, bruto: .1, blindado: .2, xama: .1, morcego: .15 }],
    [{ comum: .5, rapido: .4, bruto: .2, blindado: .3, xama: .15, morcego: .3, sapador: .15 }, { comum: .4, rapido: .4, bruto: .3, blindado: .4, xama: .2, morcego: .4, sapador: .25 }],
    [{ comum: .4, rapido: .4, bruto: .3, blindado: .4, xama: .2, morcego: .4, sapador: .25 }, { comum: .3, rapido: .3, bruto: .4, blindado: .5, xama: .25, morcego: .5, sapador: .35 }],
  ], [0, 90, 100]),
  rotas: [
    [[-60, 130], [360, 130], [360, 220], [140, 220], [140, 300], [480, 300]],
    [[1020, 130], [600, 130], [600, 220], [820, 220], [820, 300], [480, 300]],
    [[430, -60], [430, 190], [530, 190], [530, 250], [480, 250], [480, 300]],
    [[430, 660], [430, 410], [530, 410], [530, 350], [480, 350], [480, 300]],
  ] },
];
let MAPA = MAPAS[0];
MAPAS.forEach(m => { m.rotas = m.rotas || [m.pontos]; m.bloq = m.bloq || []; m.muros = m.muros || []; m.nevoas = m.nevoas || []; m.perigos = m.perigos || []; m.mod = m.mod || {}; });

const TOWERS = {
  arqueiro: { nome: 'Arqueiro', custo: 50,  dano: 7,  cd: 28, alcance: 130, tipo: 'flecha', vel: 7, cor: '#c8903c', cor2: '#7a5420', cone: 70 },
  canhao:   { nome: 'Canhão',   custo: 100, dano: 16, cd: 85, alcance: 150, tipo: 'bomba',  vel: 4, raio: 44, cor: '#8a8a95', cor2: '#4a4a55', cone: 40 },
  gelo:     { nome: 'Gelo',     custo: 75,  dano: 1,  cd: 70, alcance: 105, tipo: 'pulso',  slow: 0.45, slowT: 100, cor: '#6fd6ff', cor2: '#2a7aa0', cone: 100 },
  // Torres novas. balista: virote que atravessa TODOS na linha (multi) · tesla: mira sozinha no líder do cone e a descarga salta (cadeia/elo) ·
  // chamas: curto alcance, queimadura (ignora armadura, impede cura) · veneno: poça no chão (dano fixo + % da vida, ignora armadura, não acumula) · totem: sem ataque, aura de dano/cadência
  balista:  { nome: 'Balista',  dano: 30, cd: 100, alcance: 220, tipo: 'lanca',  vel: 10, multi: true, cor: '#b0b0c0', cor2: '#505068', cone: 22 },
  tesla:    { nome: 'Tesla',    dano: 7,  cd: 45,  alcance: 115, tipo: 'raio',   cadeia: 5, elo: 44, cor: '#ffe84c', cor2: '#a08010', cone: 80 },
  chamas:   { nome: 'Chamas',   dano: 2,  cd: 12,  alcance: 54,  tipo: 'fogo',   queima: 75, queimaD: 0.5, cor: '#ff7a1c', cor2: '#a03a08', cone: 50 },
  veneno:   { nome: 'Alquimista', dano: 1, cd: 160, alcance: 150, tipo: 'poca',  vel: 3.2, raio: 42, dur: 270, tick: 15, pct: 0.01, cor: '#6ae04c', cor2: '#2a8a28', cone: 36 },
  totem:    { nome: 'Totem',    dano: 0,  cd: 0,   alcance: 105, tipo: 'aura',   buffD: 0.25, buffC: 0.15, cor: '#e04ca0', cor2: '#802060', cone: 0 },
};

// Cone de tiro (graus): cada torre tem um `cone` padrão; o jogador ajusta direção (mouse) e abertura (roda) ao posicionar.
// passos = tiros por varredura (de uma ponta do cone à outra, indo e voltando).
const CONE_CFG = { passos: 7, min: 20, max: 140, passo: 10 };
// Zona morta (px): raio em volta da torre onde ela não acerta nem mira inimigos (tiros ignoram quem está dentro dela). 0 = sem zona morta.
const ZM = { arqueiro: 26, canhao: 48, gelo: 0, balista: 40, tesla: 24, chamas: 0, veneno: 38, totem: 0 };

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
};
// Torres novas: custos por escala geométrica cs(base, fator) — [dano/alcance/cadência base, unidade base] por torre; recalibrados pela simulação
const cs = (b, f = 1.2) => [0, 1, 2, 3, 4].map(i => Math.round(b * Math.pow(f, i)));
// Preços por tier (ordem da árvore): quanto mais avançada a torre, mais caro liberar e melhorar. [prefixo, base dano/alcance/cadência, base unidade]; níveis ×1.14 (perks) e ×1.22 (unidade)
const TIERS = [['can', 240, 310], ['bal', 300, 390], ['cha', 360, 470], ['tes', 430, 560], ['ven', 510, 660], ['gel', 600, 780], ['tot', 700, 910]];
for (const [p, b, bs] of TIERS) { CUSTOS[p + '_dano'] = cs(b, 1.14); CUSTOS[p + '_alc'] = cs(b, 1.14); CUSTOS[p + '_cad'] = cs(b, 1.14); CUSTOS[p + '_slot'] = cs(bs, 1.22); }
CUSTOS.can_raio = cs(380, 1.14); CUSTOS.gel_dur = cs(720, 1.14);
// perks de dano / alcance / cadência: um conjunto por torre (prefixo arq_, can_, gel_)
for (const [p, nm] of [['arq', 'do Arqueiro'], ['can', 'do Canhão'], ['gel', 'do Gelo'], ['bal', 'da Balista'], ['tes', 'do Tesla'], ['cha', 'das Chamas'], ['ven', 'do Alquimista'], ['tot', 'do Totem']]) {
  PERKS[p + '_dano'] = { n: 'Afiação',  d: `+32% dano ${nm}`,     u: 0.32, c: CUSTOS[p + '_dano'] };
  PERKS[p + '_alc']  = { n: 'Mira',      d: `+13% alcance ${nm}`,  u: 0.13, c: CUSTOS[p + '_alc'] };
  PERKS[p + '_cad']  = { n: 'Cadência',  d: `-11% recarga ${nm}`,  u: 0.11, c: CUSTOS[p + '_cad'] };
}
// Arqueiro: Afiação virou Perfuração (u:0 = não altera dano; nível = nº de inimigos extras atravessados por flecha)
PERKS.arq_dano = { n: 'Perfuração', d: '+1 inimigo atravessado por flecha', u: 0, c: CUSTOS.arq_dano };
// Torres novas: liberar (raiz ARSENAL) + unidades extras. Totem não ataca: seus perks reforçam a aura.
const NOVAS = [['balista', 'bal', 'Balista', 2200], ['tesla', 'tes', 'Tesla', 4000], ['chamas', 'cha', 'Chamas', 3000], ['veneno', 'ven', 'Alquimista', 5200], ['totem', 'tot', 'Totem', 8800]];
for (const [k, p, nm, c] of NOVAS) { PERKS[k] = { n: nm, d: `Libera ${nm}`, u: 1, c: [c] }; PERKS[p + '_slot'] = { n: 'Unidade', d: `+1 ${nm} em campo`, u: 1, c: CUSTOS[p + '_slot'] }; }
Object.assign(PERKS.tot_dano, { n: 'Fervor', d: '+30% bônus de dano da aura', u: 0.3 });
Object.assign(PERKS.tot_alc, { n: 'Aura', d: '+13% raio da aura' });
Object.assign(PERKS.tot_cad, { n: 'Ritmo', d: '+30% bônus de cadência da aura', u: 0.3 });
// Perks únicos (um por torre, além de Tiro múltiplo / Explosão / Congelar); os efeitos são aplicados em game.js
PERKS.bal_pen   = { n: 'Impacto',   d: '+4% dano por inimigo já atravessado (máx. +100%)', u: 0.04, c: cs(390, 1.14) };
PERKS.tes_salto = { n: 'Condutor',  d: '+1 salto da descarga elétrica', u: 1, c: cs(560, 1.14).slice(0, 3) };
PERKS.cha_brasa = { n: 'Brasa',     d: '+20% duração da queimadura', u: 0.2, c: cs(470, 1.14) };
PERKS.ven_corr  = { n: 'Corrosão',  d: '+20% dano percentual da poça', u: 0.2, c: cs(660, 1.14) };
PERKS.tot_prot  = { n: 'Escudo',    d: '-20% duração do atordoamento nas torres da aura', u: 0.2, c: cs(910, 1.14).slice(0, 4) };
// Canhão (1490) < Balista (2200) < Chamas (3000) < Tesla (4000) < Alquimista (5200) < Gelo (6800) < Totem (8800); unidades e especiais seguem o tier
PERKS.can_slot.c = CUSTOS.can_slot; PERKS.gel_slot.c = CUSTOS.gel_slot; PERKS.can_raio.c = CUSTOS.can_raio; PERKS.gel_dur.c = CUSTOS.gel_dur; PERKS.gelo.c = [6800];
// Evolução (um perk por torre, exige o perk especial dela): [habilidade única, custo em moedas]
const EVO_INFO = { arq: ['flechas +2 furo e passam muralhas', 1200], can: ['explosão com onda de choque', 1200], bal: ['virotes ignoram armadura', 1800], tes: ['dispara 2 descargas por vez', 3200],
  cha: ['queimadura se espalha', 2400], ven: ['poças deixam inimigos lentos', 4200], gel: ['pulso congela por 1s', 5400], tot: ['torres na aura imunes a stun', 7000] };
for (const p in EVO_INFO) PERKS[p + '_evo'] = { n: 'Evolução', d: `Evolui (+buffs): ${EVO_INFO[p][0]}`, u: 1, c: [EVO_INFO[p][1]] };
for (const k in PERKS) PERKS[k].mx = PERKS[k].c.length;
const custoPerk = (p, l) => p.c[l];
// Skill tree única, x/y em 960xTREE_H; pai = perk que precisa ter nível ≥ 1, ou uma raiz de ROOTS
const ROOTS = {
  BASE: { x: 120, y: 70,  pai: null,   ic: 'BAS', nome: 'BASE' },
  ARQ:  { x: 120, y: 210, pai: 'BASE', ic: 'ARQ', nome: 'ARQUEIRO' },
};
const PRE = { arqueiro: 'arq', canhao: 'can', gelo: 'gel', balista: 'bal', tesla: 'tes', chamas: 'cha', veneno: 'ven', totem: 'tot' };
// EVOLUÇÃO (por run): com o perk <torre>_evo comprado, a torre evolui até o fim da run ao somar `share` × (inimigos que nascem na run) abates (mín. `min`, múltiplos de 50; `mult` ajusta tudo).
// Abates creditados: da própria torre; no Gelo, de inimigos que ela retardou; no Totem, de torres dentro da aura. Evoluída: +dano/+alcance/−recarga (buff; `aura` = reforço da aura do Totem) e uma habilidade única.
// Run típica: ~56 mil inimigos na Campina e ~48 mil no Covil do Rei (enxames contam cópia a cópia).
const EVOL = { mult: 1, min: 200, buff: { dano: 0.35, alc: 0.15, cad: 0.2, aura: 0.5 },
  share: { arqueiro: 0.06, canhao: 0.08, balista: 0.07, tesla: 0.06, chamas: 0.05, veneno: 0.07, gelo: 0.08, totem: 0.14 } };
const TREE = { vida: { x: 240, y: 70, pai: 'BASE', ic: 'HP', cor: '#ff4c4c' } };
// Skill tree em serpentina: 8 torres em blocos de 240px; liberar uma exige a anterior (na ordem da serpentina). Cada bloco: liberar → dano/alcance/cadência/unidade (todos filhos diretos);
// o perk especial (Tiro múltiplo, Explosão, Congelar, Impacto, Condutor, Brasa, Corrosão, Escudo) fica sob o alcance. Linha 1 vai da esquerda p/ direita, linha 2 volta.
const TREE_H = 920;
const CADEIA = [['arqueiro', 'arq', 120, 210, 'ARQ'], ['canhao', 'can', 360, 210, 'CAN'], ['balista', 'bal', 600, 210, 'BAL'], ['gelo', 'gel', 840, 210, 'ICE'],
  ['tesla', 'tes', 840, 600, 'TES'], ['veneno', 'ven', 600, 600, 'ALQ'], ['chamas', 'cha', 360, 600, 'CHA'], ['totem', 'tot', 120, 600, 'TOT']];
const ESPECIAL = { arq: ['arq_multi', 'x2'], can: ['can_raio', 'AOE'], gel: ['gel_dur', 'DUR'], bal: ['bal_pen', 'PEN'], tes: ['tes_salto', 'ARC'], cha: ['cha_brasa', 'FOG'], ven: ['ven_corr', 'COR'], tot: ['tot_prot', 'ESC'] };
CADEIA.forEach(([k, p, x, y, ic], i) => {
  const raiz = i === 0;
  if (!raiz) TREE[k] = { x, y, pai: CADEIA[i - 1][0] === 'arqueiro' ? 'ARQ' : CADEIA[i - 1][0], ic, cor: TOWERS[k].cor };
  const f = raiz ? 'ARQ' : k;
  TREE[p + '_dano'] = { x: x - 90, y: y + 120, pai: f, ic: p === 'arq' ? 'PER' : 'ATK', cor: '#ff6060' };
  TREE[p + '_alc'] = { x: x - 30, y: y + 120, pai: f, ic: 'RNG', cor: '#6fd6ff' };
  TREE[p + '_cad'] = { x: x + 30, y: y + 120, pai: f, ic: 'CAD', cor: '#ffd84c' };
  TREE[p + '_slot'] = { x: x + 90, y: y + 120, pai: f, ic: 'UNI', cor: '#c8903c' };
  if (ESPECIAL[p]) {
    TREE[ESPECIAL[p][0]] = { x: x - 30, y: y + 230, pai: p + '_alc', ic: ESPECIAL[p][1], cor: '#ffffff' };
    TREE[p + '_evo'] = { x: x + 30, y: y + 230, pai: ESPECIAL[p][0], ic: 'EVO', cor: '#ff9bf0' };
  }
});
// BALANCEAMENTO (simulador headless): moedas = abates / ABATES_POR_MOEDA.
//   sem melhorias ~14 abates · +Mira/Tiro múltiplo ~120 · +2 unidades ~470 · arqueiros maxados ~2000 · +Canhão ~4600 (vitória).
//   Comprando sempre o mais barato: 1ª unidade extra ~run 12, Canhão ~33, 1ª vitória ~42, Gelo ~49, árvore completa ~63.
const ABATES_POR_MOEDA = 25;
const moedasGanhas = abates => abates > 0 ? Math.max(1, Math.floor(abates / ABATES_POR_MOEDA)) : 0;

// Goblin Horde TD - lógica principal (dados em data.js)
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
cv.width = CFG.W; cv.height = CFG.H;
const q = v => Math.floor(v / 2) * 2;
const rad = d => d * Math.PI / 180;
const angD = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const rnd = (a, b) => a + Math.random() * (b - a);
const BASE = [CFG.baseX, CFG.baseY];
// castelo por mapa: CFG.baseX/baseY e BASE seguem MAPA.base (padrão 900,300); chamado ao redesenhar o fundo, isto é, a cada troca de mapa
const aplicaBase = () => { const b = MAPA.base || [900, 300]; CFG.baseX = BASE[0] = b[0]; CFG.baseY = BASE[1] = b[1]; };
// zona de perigo/neblina: círculo (x, y, r) ou união de retângulos rs = [[centroX, centroY, larg, alt], ...] (permite L, cruz, faixas, anéis...)
const dentroF = (z, x, y) => z.rs ? z.rs.some(r => Math.abs(x - r[0]) < r[2] / 2 && Math.abs(y - r[1]) < r[3] / 2) : Math.hypot(x - z.x, y - z.y) < z.r;
// depois de preparada, a zona vira uma máscara de células 4x4 sem o caminho (z.m); antes disso vale a forma bruta
const dentro = (z, x, y) => z.m ? z.m.has((x >> 2) * 256 + (y >> 2)) : dentroF(z, x, y);
const caixaZ = z => z.rs ? [Math.min(...z.rs.map(r => r[0] - r[2] / 2)), Math.min(...z.rs.map(r => r[1] - r[3] / 2)), Math.max(...z.rs.map(r => r[0] + r[2] / 2)), Math.max(...z.rs.map(r => r[1] + r[3] / 2))] : [z.x - z.r, z.y - z.r, z.x + z.r, z.y + z.r];
// máscara da zona (a forma menos o caminho dos monstros, com folga de 3px), borda pontilhada (grade de 4px) e centro; calculados uma vez por troca de mapa
function preparaZona(z) {
  const [x0, y0, x1, y1] = caixaZ(z), lim = MAPA.larg / 2 + 3, m = new Set(); z.m = null; z.borda = [];
  if (z.rs) { z.x = (x0 + x1) / 2; z.y = (y0 + y1) / 2; }
  for (let y = Math.floor(y0 / 4) * 4; y <= y1; y += 4) for (let x = Math.floor(x0 / 4) * 4; x <= x1; x += 4) if (dentroF(z, x + 2, y + 2) && nearPath(x + 2, y + 2).d > lim) m.add((x >> 2) * 256 + (y >> 2));
  z.m = m;
  for (let y = Math.floor(y0 / 4) * 4; y <= y1; y += 4) for (let x = Math.floor(x0 / 4) * 4; x <= x1; x += 4) if (dentro(z, x, y) && !(dentro(z, x + 4, y) && dentro(z, x - 4, y) && dentro(z, x, y + 4) && dentro(z, x, y - 4))) z.borda.push([x, y]);
}
// erupção: faíscas subindo em pontos aleatórios dentro da zona
function zonaFx(h) {
  const [x0, y0, x1, y1] = caixaZ(h);
  for (let i = 0, n = 0; i < 90 && n < 40; i++) { const x = rnd(x0, x1), y = rnd(y0, y1); if (dentro(h, x, y)) { n++; S.part.push({ x, y, vx: 0, vy: rnd(-1.4, -0.3), life: 14, max: 14, c1: '#ffffff', c2: h.cor2 }); } }
}
// ponto mais próximo do caminho (para limitar a multidão e bloquear torres)
function nearPath(x, y) {
  let best = { d: 1e9, x: 0, y: 0 };
  for (const P of MAPA.rotas) for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], vx = b[0] - a[0], vy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy)));
    const nx = a[0] + vx * t, ny = a[1] + vy * t, d = Math.hypot(x - nx, y - ny);
    if (d < best.d) best = { d, x: nx, y: ny };
  }
  return best;
}
// versão rápida p/ goblins: só testa os segmentos perto do waypoint atual da própria rota
function nearRoute(x, y, P, wp) {
  let bd = 1e9, bx = 0, by = 0;
  for (let i = Math.max(0, wp - 2), e = Math.min(P.length - 2, wp + 1); i <= e; i++) {
    const a = P[i], b = P[i + 1], vx = b[0] - a[0], vy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy)));
    const nx = a[0] + vx * t, ny = a[1] + vy * t, d = Math.sqrt((x - nx) * (x - nx) + (y - ny) * (y - ny));
    if (d < bd) { bd = d; bx = nx; by = ny; }
  }
  return { d: bd, x: bx, y: by };
}
const CELL = 24, COLS = Math.ceil(CFG.W / CELL) + 1, ROWS = Math.ceil(CFG.H / CELL) + 1;
let S;
// meta-progressão: moedas e melhorias permanentes (salvas no navegador)
// um save por jogador: chave goblintd_meta_<nome>; lista em goblintd_jogadores; jogador atual em goblintd_atual
let META = { moedas: 0, lv: {} }, JOGADOR = 'Jogador';
const lerLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
const jogadores = () => lerLS('goblintd_jogadores', []);
// mapa i abre ao vencer o i-1; torres salvas ficam por mapa (META.torres[mapa]); formato antigo (lista) vira o mapa 0
const desbloq = i => i === 0 || JOGADOR.toLowerCase() === 'whittaker' || !!(META.vit && META.vit[i - 1]);
const tmapa = () => { if (Array.isArray(META.torres)) META.torres = { 0: META.torres }; return META.torres || (META.torres = {}); };
const mapaInicial = () => { const i = META.mapa || 0; return i < MAPAS.length && desbloq(i) ? i : 0; };
function carregarMeta(nome) {
  JOGADOR = nome; META = { moedas: 0, lv: {} };
  const m = lerLS('goblintd_meta_' + nome, null); if (m && m.lv) META = m;
}
function salvarMeta() {
  try {
    localStorage.setItem('goblintd_meta_' + JOGADOR, JSON.stringify(META)); localStorage.setItem('goblintd_atual', JSON.stringify(JOGADOR));
    const l = jogadores(); if (!l.includes(JOGADOR)) { l.push(JOGADOR); localStorage.setItem('goblintd_jogadores', JSON.stringify(l)); }
  } catch (e) {}
}
// Versão do cadastro de nomes: subir VER_NOME faz todo mundo digitar o nome de novo (o progresso salvo de cada nome é mantido)
const VER_NOME = 1;
if (lerLS('goblintd_vnome', 0) < VER_NOME) { try { localStorage.removeItem('goblintd_atual'); localStorage.setItem('goblintd_vnome', JSON.stringify(VER_NOME)); } catch (e) {} }
// migra o save antigo (único) para o jogador padrão, uma só vez
(function () {
  const velho = lerLS('goblintd_meta', null);
  if (velho && velho.lv && !jogadores().length) { carregarMeta('Jogador'); META = velho; salvarMeta(); localStorage.removeItem('goblintd_meta'); }
  carregarMeta(lerLS('goblintd_atual', 'Jogador'));
})();
const pk = id => META.lv[id] || 0, ef = id => pk(id) * PERKS[id].u;
const livre = k => k === 'arqueiro' || pk(k) > 0;
// limite de unidades individual por torre: 1 base + perk de Unidade da própria árvore
const vagas = k => 1 + pk(PRE[k] + '_slot'), usadas = k => S.tow.filter(t => t.k === k).length, cheio = k => usadas(k) >= vagas(k);
const zm = t => ZM[t.k] || 0; // zona morta da torre (data.js)

// fundo estático do mapa atual (tema, poças de perigo, caminho(s) e obstáculos); redesenhado a cada troca de mapa
const bg = document.createElement('canvas'); bg.width = CFG.W; bg.height = CFG.H;
// carrega o tileset de grama do mapa (cache); ao terminar de carregar, redesenha o fundo. Retorna null enquanto não estiver pronto (usa o fundo procedural)
const TILES = {};
function tileImg(src) {
  if (!TILES[src]) { const im = new Image(); im.onload = () => { if (MAPA.grama === src) { drawBg(); drawBgExtra(); } }; im.src = src; TILES[src] = im; }
  const im = TILES[src]; return im.complete && im.naturalWidth ? im : null;
}
// grama em tiles de 32px: linha 0 do sheet = lisa/variações (maioria), linha 1 = decorações (1 em 6), escolha fixa por posição
function drawGrama(b, im) {
  b.imageSmoothingEnabled = false;
  for (let y = 0; y < CFG.H; y += 32) for (let x = 0; x < CFG.W; x += 32) {
    const h = (((x / 32) * 73856093) ^ ((y / 32) * 19349663)) >>> 0, v = h % 20;
    const col = v < 5 ? 0 : v < 10 ? 1 : v < 13 ? 2 : v < 15 ? 3 : v < 16 ? 4 : v < 17 ? 7 : v < 18 ? 5 : 6;
    const deco = (h >> 8) % 6 === 0;
    b.drawImage(im, (deco ? (h >> 12) % 8 : col) * 32, deco ? 32 : 0, 32, 32, x, y, 32, 32);
  }
}
function drawBg() {
  aplicaBase(); const b = bg.getContext('2d'), T = MAPA.tema || TEMA0, gi = MAPA.grama && tileImg(MAPA.grama);
  if (gi) drawGrama(b, gi); else
  for (let y = 0; y < CFG.H; y += 16) for (let x = 0; x < CFG.W; x += 16) {
    b.fillStyle = ((x + y) / 16) % 2 ? T.g[0] : T.g[1]; b.fillRect(x, y, 16, 16);
    if ((x * 7 + y * 13) % 11 === 0) { b.fillStyle = T.g[2]; b.fillRect(x + 4, y + 6, 2, 2); }
  }
  // poças dos gêiseres/lava (fixas; o aviso piscando é desenhado em draw)
  for (const z of MAPA.perigos) { preparaZona(z); const [x0, y0, x1, y1] = caixaZ(z); for (let y = q(y0); y <= y1; y += 2) for (let x = q(x0); x <= x1; x += 2) if (dentro(z, x, y)) { b.fillStyle = (x * 3 + y * 5) % 11 === 0 ? z.cor2 : z.cor; b.fillRect(x, y, 2, 2); } }
  // caminho(s) de terra: borda escura, miolo claro, pedrinhas
  const h = MAPA.larg / 2, segs = [];
  for (const P of MAPA.rotas) for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], c = P[i + 1];
    segs.push([q(Math.min(a[0], c[0]) - h), q(Math.min(a[1], c[1]) - h), q(Math.abs(c[0] - a[0]) + 2 * h), q(Math.abs(c[1] - a[1]) + 2 * h)]);
  }
  b.fillStyle = T.p[0]; segs.forEach(s => b.fillRect(s[0] - 4, s[1] - 4, s[2] + 8, s[3] + 8));
  b.fillStyle = T.p[1]; segs.forEach(s => b.fillRect(s[0], s[1], s[2], s[3]));
  b.fillStyle = T.p[2];
  segs.forEach(s => { for (let y = s[1]; y < s[1] + s[3]; y += 8) for (let x = s[0]; x < s[0] + s[2]; x += 8) if ((x * 5 + y * 3) % 7 === 0) b.fillRect(x + 2, y + 2, 2, 2); });
  // obstáculos (sem torres): moitas/rochas em blocos 2px
  const ob = T.ob || TEMA0.ob;
  for (const [bx, by, bw, bh] of MAPA.bloq) for (let y = by; y < by + bh; y += 12) for (let x = bx; x < bx + bw; x += 12) {
    const jx = (x * 7 + y * 3) % 5 * 2, jy = (x * 3 + y * 5) % 5 * 2;
    b.fillStyle = ob[0]; b.fillRect(q(x + jx), q(y + jy), 14, 14); b.fillStyle = ob[1]; b.fillRect(q(x + jx + 2), q(y + jy + 2), 10, 8); b.fillStyle = '#5a3a1a'; b.fillRect(q(x + jx + 6), q(y + jy + 10), 4, 4);
  }
}
// neblina local (pontilhado cinza + borda) e muralhas de pedra, desenhadas sobre o fundo
function drawBgExtra() {
  const b = bg.getContext('2d');
  for (const z of MAPA.nevoas) {
    preparaZona(z); const [x0, y0, x1, y1] = caixaZ(z); b.fillStyle = '#aab4b8';
    for (let y = Math.floor(y0 / 4) * 4; y <= y1; y += 4) for (let x = Math.floor(x0 / 4) * 4; x <= x1; x += 4) if (dentro(z, x, y) && ((x + y) / 4) % 3 === 0) b.fillRect(x, y, 2, 2);
    b.fillStyle = '#ffffff'; for (const [x, y] of z.borda) b.fillRect(x, y, 2, 2);
  }
  for (const [mx, my, mw, mh] of MAPA.muros) {
    b.fillStyle = '#34343c'; b.fillRect(q(mx) - 2, q(my) - 2, q(mw) + 4, q(mh) + 4);
    b.fillStyle = '#6e6e78'; b.fillRect(q(mx), q(my), q(mw), q(mh));
    b.fillStyle = '#9a9aa6'; b.fillRect(q(mx), q(my), q(mw), 2);
    b.fillStyle = '#4a4a54';
    for (let y = q(my) + 8, r = 0; y < my + mh; y += 8, r++) { b.fillRect(q(mx), y, q(mw), 2); for (let x = q(mx) + (r % 2) * 8 + 6; x < mx + mw; x += 16) b.fillRect(x, y - 8, 2, 8); }
  }
}
let MI = 0;
function setMapa(i) { MI = i; MAPA = MAPAS[i]; RUN_FRAMES = runFrames(MAPA); META.mapa = i; drawBg(); drawBgExtra(); buildMapas(); }

function reset() {
  S = { run: 0, hp: CFG.baseHp + ef('vida'), kills: 0, ganho: 0, wave: 0, gob: [], tow: [], proj: [], part: [], zon: [], groups: [],
        sel: 'arqueiro', over: false, won: false, pause: false, speed: (S && S.speed) || 1, t: 0, mx: 0, my: 0, ativa: false, prox: 300, aim: null };
  S.plano = planoHorda(); S.total = S.plano.reduce((n, g) => n + g.list.length, 0); S.need = {}; for (const k in TOWERS) S.need[k] = evolNeed(k);
  // restaura as torres salvas ao fim da última run (respeitando unidades liberadas e vagas)
  for (const t of tmapa()[MI] || []) if (TOWERS[t.k] && livre(t.k) && !cheio(t.k) && canPlace(t.x, t.y)) S.tow.push({ x: t.x, y: t.y, def: TOWERS[t.k], k: t.k, lvl: t.lvl || 1, cd: 0, dir: t.dir, cone: t.cone, sw: 0, sd: 1 });
  buildShop();
}

function buildShop() {
  const el = document.getElementById('shop'); el.innerHTML = '';
  Object.keys(TOWERS).forEach((k, i) => {
    const b = document.createElement('button');
    b.textContent = livre(k) ? `${i + 1} ${TOWERS[k].nome} ${usadas(k)}/${vagas(k)}` : `${i + 1} 🔒 ${TOWERS[k].nome}`; b.disabled = !livre(k);
    b.className = k === S.sel ? 'sel' : '';
    b.onclick = () => { S.sel = k; buildShop(); };
    el.appendChild(b);
  });
}

// ---------- ondas: multidões em grupos ----------
// plano da horda: lista de grupos {delay (quadros), u (progresso 0-1), list}. Tudo vem de MAPA.horda e dif(MAPA.nivel)
function planoHorda() {
  const gr = [], D = dif(MAPA.nivel); let off = 0;
  MAPA.ondas.forEach(o => {
    const fim = o.dur * 60;
    for (let t = 0; t < fim;) {
      const u = t / fim, n = Math.round((o.tamIni + (o.tamFim - o.tamIni) * u) * D.qtd), w = {}, list = []; let tot = 0;
      for (const k in GOBLINS) { const a0 = o.peso0[k] || 0; w[k] = a0 + ((o.peso1[k] || 0) - a0) * u; tot += w[k]; }
      for (let i = 0; i < n; i++) { let r = Math.random() * tot, tipo = 'comum'; for (const k in w) if ((r -= w[k]) < 0) { tipo = k; break; } for (let c = GOBLINS[tipo].enxame || 1; c--;) list.push(tipo); }
      gr.push({ delay: off + t, u, o, list });
      t += o.gapIni + (o.gapFim - o.gapIni) * u;
    }
    if (o.chefe) gr.push({ delay: off + o.chefe * 60, u: 1, o, list: ['chefe'] });
    off += fim;
  });
  return gr;
}
function startWave() {
  if (S.over || S.wave) return;
  S.wave = 1; S.ativa = true;
  S.groups = S.plano;
}

const mkG = (tipo, x, y, wp, rt, vm, hp) => ({ tipo, d: GOBLINS[tipo], x, y, vx: 0, vy: 0, vm, wp, rt, prog: 0, hp, max: hp, r: GOBLINS[tipo].r, slow: 0, burn: 0, bd: 0, ph: rnd(0, 6.28), flash: 0, dead: false, lane: rnd(0.2, 1) });
function spawnGroup(gr) {
  const o = gr.o, D = dif(MAPA.nivel), rt = Math.floor(Math.random() * MAPA.rotas.length), P0 = MAPA.rotas[rt], a = P0[0], b = P0[1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, vm = D.vel * (o.vel[0] + (o.vel[1] - o.vel[0]) * gr.u);
  gr.list.forEach(tipo => {
    const d = GOBLINS[tipo], hp = d.fixo ? d.hp : Math.round(d.hp * D.hp * (o.hp[0] + (o.hp[1] - o.hp[0]) * gr.u));
    { const back = rnd(-54, 30), lat = rnd(-MAPA.larg / 2 + 8, MAPA.larg / 2 - 8); // nasce na entrada da rota, na direção do primeiro trecho (esquerda, topo ou base)
      S.gob.push(mkG(tipo, a[0] - ux * back - uy * lat, a[1] - uy * back + ux * lat, 1, rt, vm, hp)); }
  });
}

// ---------- efeitos (blocos sólidos, sem alpha) ----------
function burst(x, y, n, c1, c2, sp) {
  if (S.part.length > 700) return;
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.28), v = rnd(0.3, sp || 1.6);
    S.part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 24, max: 24, c1, c2 });
  }
}
function ringFx(x, y, r, c1, c2) {
  for (let a = 0; a < 6.28; a += 6 / r) S.part.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: 0, vy: 0, life: 14, max: 14, c1, c2 });
}

// EVOLUÇÃO: meta de abates por torre = EVOL.share × inimigos que nascem na run (S.total). Ao atingi-la a torre evolui até o fim da run (buffs em tStat/auraR/bonus/fire; habilidade única em fire/raio/updateTowers/updateGoblins/updateExtras/stunar)
const evolNeed = k => Math.max(EVOL.min, Math.round(S.total * EVOL.share[k] * EVOL.mult / 50) * 50);
function evolve(t) { t.evo = true; ringFx(t.x, t.y, 22, '#ffffff', t.def.cor); ringFx(t.x, t.y, 32, t.def.cor, t.def.cor2); burst(t.x, t.y, 28, '#ffffff', '#ffd84c', 3); }
function credita(t) { if (t.evo || !(pk(PRE[t.k] + '_evo') > 0)) return; t.kills = (t.kills || 0) + 1; if (t.kills >= S.need[t.k]) evolve(t); }
// abate de `src`: conta para ela, para os Totens cuja aura cobre `src` e, no Gelo, para a torre que retardou o inimigo
function credito(src, g) {
  credita(src);
  for (const o of S.tow) if (o !== src && o.def.tipo === 'aura' && !(o.stun > 0) && Math.hypot(o.x - src.x, o.y - src.y) <= auraR(o)) credita(o);
  if (g.slow > 0 && g.slowSrc && g.slowSrc !== src) credita(g.slowSrc);
}
// Chamas evoluída: a queimadura salta para até 3 vizinhos a cada tick (g.sp = saltos restantes)
function alastra(g, grid) {
  let n = 0;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const c = grid[g.ci + ox + oy * COLS]; if (c) for (const o of c) if (n < 3 && !o.dead && !(o.burn > 0) && Math.hypot(o.x - g.x, o.y - g.y) < 14) { o.burn = 45; o.bd = g.bd; o.sp = g.sp - 1; o.burnSrc = g.burnSrc; n++; } }
}
// barra de progresso da evolução sob a torre (só com o perk comprado)
function evoBar(t) {
  if (t.evo || !(pk(PRE[t.k] + '_evo') > 0)) return;
  ctx.fillStyle = '#10161e'; ctx.fillRect(q(t.x - 8), q(t.y + 15), 16, 2); ctx.fillStyle = '#ffd84c'; ctx.fillRect(q(t.x - 8), q(t.y + 15), q(16 * Math.min(1, (t.kills || 0) / S.need[t.k])), 2);
}
// abate de goblin em 3 estágios: 1) flash branco em cruz + anel quadrado, 2) estilhaços que tremem a cada 3 quadros (p.jit), 3) dissipação sólida (2px + tom escuro, feita no draw)
function killFx(g) {
  if (S.part.length > 700) return;
  const x = g.x, y = g.y, d = g.d, P = (px, py, vx, vy, life, c1, c2, jit) => S.part.push({ x: px, y: py, vx, vy, life, max: life, c1, c2, jit });
  if (d.enxame) { P(x, y, 0, 0, 6, '#ffffff', d.cor2); burst(x, y, 2, d.cor, d.cor2); return; }
  const n = d.boss ? 2 : 1, D8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  for (const [ox, oy] of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]]) P(x + ox * n, y + oy * n, 0, 0, 6, '#ffffff', '#ffffff');
  for (const [dx, dy] of D8) { const k = dx && dy ? 0.8 : 1.1; P(x + dx * 4, y + dy * 4, dx * k * n, dy * k * n, 12, '#ffffff', d.cor2); if (d.boss) P(x + dx * 8, y + dy * 8, dx * k * 2, dy * k * 2, 16, d.cor, d.cor2); }
  for (let i = 0; i < 6 * n; i++) { const a = rnd(0, 6.28), v = rnd(0.6, 1.8) * n; P(x, y, Math.cos(a) * v, Math.sin(a) * v, 22, i % 2 ? d.cor : '#ffd84c', d.cor2, true); }
}
function hit(g, dmg, pura, src) { if (g.d.armor && !pura) dmg = Math.max(1, dmg - g.d.armor); g.hp -= dmg; g.flash = 3; if (g.hp <= 0 && !g.dead) { g.dead = true; S.kills++; killFx(g); if (src) credito(src, g); } }

// ---------- torres ----------
// Totem: aura que soma dano/cadência às torres dentro do raio (acumula entre Totens; Totem atordoado não funciona)
// neblina local: torres dentro de uma zona têm o alcance multiplicado por f
const nevoaF = (x, y) => { let f = 1; for (const z of MAPA.nevoas) if (dentro(z, x, y)) f = Math.min(f, z.f); return f; };
const auraR = o => o.def.alcance * (1 + ef('tot_alc')) * (MAPA.mod.alc || 1) * nevoaF(o.x, o.y) * (o.evo ? 1 + EVOL.buff.alc : 1);
function bonus(t) {
  let d = 0, c = 0;
  for (const o of S.tow) if (o.def.tipo === 'aura' && o !== t && !(o.stun > 0) && Math.hypot(o.x - t.x, o.y - t.y) <= auraR(o)) { d += o.def.buffD * (1 + ef('tot_dano')) * (o.evo ? 1 + EVOL.buff.aura : 1); c += o.def.buffC * (1 + ef('tot_cad')) * (o.evo ? 1 + EVOL.buff.aura : 1); }
  return { d: Math.min(d, 1.5), c: Math.min(c, 1) };
}
const tStat = t => ({ dano: t.def.dano * (1 + 0.5 * (t.lvl - 1)) * (1 + ef(PRE[t.k] + '_dano')) * (1 + bonus(t).d) * (t.evo ? 1 + EVOL.buff.dano : 1), alc: t.def.alcance * (1 + 0.1 * (t.lvl - 1)) * (1 + ef(PRE[t.k] + '_alc')) * (MAPA.mod.alc || 1) * nevoaF(t.x, t.y) * (t.evo ? 1 + EVOL.buff.alc : 1) });
const baseDist = (x, y) => Math.hypot(CFG.baseX - x, CFG.baseY - y);
// atordoa a torre; Escudo do Totem encurta o atordoamento de torres dentro de uma aura; Totem evoluído torna as torres da aura imunes
const naAura = (t, f) => S.tow.some(o => o.def.tipo === 'aura' && !(o.stun > 0) && f(o) && Math.hypot(o.x - t.x, o.y - t.y) <= auraR(o));
const protegida = t => pk('tot_prot') > 0 && naAura(t, () => true);
const stunar = (t, d) => { if (naAura(t, o => o.evo)) return; t.stun = Math.max(t.stun || 0, Math.round(d * (1 - (protegida(t) ? ef('tot_prot') : 0)))); };

function arcFx(x, y, r, a0, a1, c1, c2) {
  for (let a = a0; a <= a1; a += 6 / r) S.part.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: 0, vy: 0, life: 14, max: 14, c1, c2 });
}
const mkProj = (t, ang, st, def) => ({ x: t.x, y: t.y, vx: Math.cos(ang) * def.vel, vy: Math.sin(ang) * def.vel, def, dano: st.dano, raio: def.raio ? def.raio * (def.tipo === 'bomba' ? 1 + ef('can_raio') : 1) : 0, rest: st.alc, furo: def.tipo === 'flecha' ? pk('arq_dano') + (t.evo ? 2 : 0) : 0, src: t });

// Tesla: mira sozinha (goblin mais adiantado dentro do cone) e a descarga salta entre vizinhos próximos; raio em blocos 4px (branco → tom escuro ao dissipar)
function lineFx(x0, y0, x1, y1) {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let i = 0; i <= n; i++) { const k = i / n, j = i > 0 && i < n ? rnd(-3, 3) : 0; S.part.push({ x: x0 + (x1 - x0) * k + j, y: y0 + (y1 - y0) * k + j, vx: 0, vy: 0, life: 8, max: 8, c1: '#ffffff', c2: '#a08010' }); }
}
function raio(t, st, ex) {
  const def = t.def; let g = null;
  for (const o of S.gob) { if (o.dead) continue; const dx = o.x - t.x, dy = o.y - t.y; if (dx * dx + dy * dy <= st.alc * st.alc && dx * dx + dy * dy >= zm(t) ** 2 && angD(Math.atan2(dy, dx), t.dir) <= t.cone / 2 + 0.1 && (!g || o.prog > g.prog) && !(ex && ex.has(o))) g = o; }
  if (!g) return;
  const vis = new Set(ex); let px = t.x, py = t.y;
  for (let i = 0; g && i <= def.cadeia + pk('tes_salto'); i++) {
    lineFx(px, py, g.x, g.y); hit(g, st.dano, false, t); vis.add(g); px = g.x; py = g.y;
    const ci = ((g.x / CELL) | 0) + 1 + ((g.y / CELL) | 0) * COLS; let nx = null, nd = def.elo;
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) { const c = GRID[ci + ox + oy * COLS]; if (c) for (const o of c) if (!o.dead && !vis.has(o)) { const d = Math.hypot(o.x - px, o.y - py); if (d < nd) { nd = d; nx = o; } } }
    g = nx;
  }
  return vis;
}
// Torres não miram: varrem o cone (ponta a ponta, ida e volta) e atiram em linha reta; só disparam se houver goblin dentro do cone
function fire(t) {
  const st = tStat(t), def = t.def, N = CONE_CFG.passos, Z = zm(t) ** 2;
  if (!S.gob.some(g => { if (g.dead) return false; const dx = g.x - t.x, dy = g.y - t.y; return dx * dx + dy * dy <= st.alc * st.alc && dx * dx + dy * dy >= Z && angD(Math.atan2(dy, dx), t.dir) <= t.cone / 2 + 0.1; })) return;
  t.cd = def.cd * (1 - ef(PRE[t.k] + '_cad')) / (1 + bonus(t).c) * (t.evo ? 1 - EVOL.buff.cad : 1);
  const a = t.dir - t.cone / 2 + t.sw * t.cone, step = 1 / (N - 1);
  let nx = t.sw + t.sd * step; if (nx > 1.0001 || nx < -0.0001) { t.sd = -t.sd; nx = t.sw + t.sd * step; } t.sw = nx;
  if (def.tipo === 'pulso' || def.tipo === 'fogo') {
    const hw = t.cone / N;
    for (const g of S.gob) {
      const dx = g.x - t.x, dy = g.y - t.y;
      if (!g.dead && dx * dx + dy * dy <= st.alc * st.alc && dx * dx + dy * dy >= Z && angD(Math.atan2(dy, dx), a) <= hw) { if (def.tipo === 'fogo') { g.burn = Math.round(def.queima * (1 + ef('cha_brasa'))); g.bd = st.dano * def.queimaD; g.burnSrc = t; g.sp = t.evo ? 3 : 0; } else { g.slow = def.slowT * (1 + ef('gel_dur')); g.slowSrc = t; if (t.evo && !g.d.boss) g.frz = 60; } hit(g, st.dano, false, t); }
    }
    arcFx(t.x, t.y, st.alc * 0.5, a - hw, a + hw, '#ffffff', def.cor2); arcFx(t.x, t.y, st.alc, a - hw, a + hw, def.cor, def.cor2);
  } else if (def.tipo === 'flecha') {
    const n = 1 + pk('arq_multi');
    for (let i = 0; i < n; i++) S.proj.push(mkProj(t, a + (i - (n - 1) / 2) * 0.14, st, def));
  } else if (def.tipo === 'raio') { const v = raio(t, st); if (t.evo && v) raio(t, st, v); }
  else S.proj.push(mkProj(t, a, st, def));
}

function updateTowers() {
  for (const t of S.tow) { if (t.stun > 0) { t.stun--; continue; } if (t.def.tipo === 'aura') continue; if (t.cd > 0) t.cd--; else fire(t); }
  for (const p of S.proj) {
    p.x += p.vx; p.y += p.vy; p.rest -= p.def.vel;
    // muralhas barram flechas e virotes (bombas e poças passam por cima)
    if (MAPA.muros.length && (p.def.tipo === 'flecha' || p.def.tipo === 'lanca') && !(p.def.tipo === 'flecha' && p.src.evo) && MAPA.muros.some(m => p.x > m[0] && p.x < m[0] + m[2] && p.y > m[1] && p.y < m[1] + m[3])) { p.done = true; burst(p.x, p.y, 4, '#ffffff', '#6e6e78', 1.2); continue; }
    let tg = null, mt = null; const ci = ((p.x / CELL) | 0) + 1 + ((p.y / CELL) | 0) * COLS;
    hitSearch: for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const c = GRID && GRID[ci + ox + oy * COLS]; if (!c) continue;
      for (const g of c) { const dx = g.x - p.x, dy = g.y - p.y, rr = g.r + 6; if (!g.dead && !(p.vis && p.vis.has(g)) && dx * dx + dy * dy < rr * rr && Math.hypot(p.x - p.src.x, p.y - p.src.y) >= zm(p.src)) { tg = g; if (!p.def.multi) break hitSearch; (mt = mt || []).push(g); } }
    }
    if (mt) { p.vis = p.vis || new Set(); for (const g of mt) { hit(g, p.dano * (1 + Math.min(1, ef('bal_pen') * p.vis.size)), !!p.src.evo, p.src); p.vis.add(g); } } // balista: atravessa todos na linha; Impacto soma dano por inimigo já atravessado
    else if (tg && p.furo > 0) { hit(tg, p.dano, false, p.src); p.furo--; (p.vis = p.vis || new Set()).add(tg); } // perfuração: atravessa e segue
    else if (tg || p.rest <= 0) {
      p.done = true;
      if (p.def.tipo === 'flecha' || p.def.tipo === 'lanca') { if (tg) hit(tg, p.dano, false, p.src); }
      else if (p.def.tipo === 'poca') { S.zon.push({ x: p.x, y: p.y, r: p.raio, life: p.def.dur, tick: p.def.tick, dano: p.dano, pct: p.def.pct * p.dano / p.def.dano * (1 + ef('ven_corr')), src: p.src, evo: p.src.evo }); burst(p.x, p.y, 10, '#b8ff8a', p.def.cor2, 1.4); }
      else {
        for (const g of S.gob) if (!g.dead && Math.hypot(g.x - p.x, g.y - p.y) < p.raio) hit(g, p.dano, false, p.src);
        if (p.src.evo) { const R2 = p.raio * 1.7; for (const g of S.gob) { const d = Math.hypot(g.x - p.x, g.y - p.y); if (!g.dead && d >= p.raio && d < R2) hit(g, p.dano * 0.5, false, p.src); } ringFx(p.x, p.y, R2 * 0.9, '#ffffff', '#ffb030'); }
        burst(p.x, p.y, 14, '#ffffff', '#ffb030', 2.4); ringFx(p.x, p.y, p.raio * 0.6, '#ffb030', '#7a3a10');
      }
    }
  }
  S.proj = S.proj.filter(p => !p.done);
}

// ---------- goblins: multidão com separação por grade ----------
let GRID = null; const COLIS_MAX = 6;
function updateGoblins() {
  const grid = GRID = new Array(COLS * ROWS), nasc = [], xamas = [];
  for (const g of S.gob) { const i = ((g.x / CELL) | 0) + 1 + (((g.y / CELL) | 0)) * COLS; (grid[i] = grid[i] || []).push(g); g.ci = i; }
  for (const g of S.gob) {
    if (g.dead) continue;
    const P = MAPA.rotas[g.rt], voa = g.d.voa, T = voa ? BASE : P[g.wp], dx = T[0] - g.x, dy = T[1] - g.y, d = Math.hypot(dx, dy) || 1;
    if (!voa && d < 30 && g.wp < P.length - 1) g.wp++;
    g.prog = (voa ? P.length : g.wp) * 1e4 - d;
    if (baseDist(g.x, g.y) < CFG.baseR) { S.hp -= g.d.dano; g.dead = true; burst(g.x, g.y, 8, '#ff4040', '#802020'); if (S.hp <= 0) { S.hp = 0; S.over = true; } continue; }
    if (g.burn > 0) { g.burn--; if (g.burn % 15 === 0) { if (g.sp > 0) alastra(g, grid); hit(g, g.bd, true, g.burnSrc); if (g.dead) continue; } } // queimadura ignora armadura
    if (g.d.sabota) { // sapador: explode perto de torre e a atordoa por 6s
      for (const t of S.tow) if (Math.hypot(t.x - g.x, t.y - g.y) < g.d.sab) { stunar(t, 360); g.dead = true; ringFx(g.x, g.y, 14, '#ffffff', g.d.cor2); burst(g.x, g.y, 10, g.d.cor, g.d.cor2, 2); break; }
      if (g.dead) continue;
    }
    if (g.d.cura) xamas.push(g);
    if (g.d.invoca && S.t % g.d.invoca === 0) for (let i = 0; i < 12; i++) nasc.push(mkG('comum', g.x + rnd(-14, 14), g.y + rnd(-14, 14), g.wp, g.rt, g.vm, GOBLINS.comum.hp));
    const sp = g.frz > 0 ? 0 : g.d.vel * g.vm * (g.slow > 0 ? (g.d.boss ? 0.75 : TOWERS.gelo.slow) : 1); if (g.slow > 0) g.slow--; if (g.frz > 0) g.frz--;
    let ax = dx / d * sp, ay = dy / d * sp;
    ax += Math.cos(S.t * 0.04 + (g.d.enxame ? (g.x + g.y) * 0.04 : g.ph)) * 0.12; ay += Math.sin(S.t * 0.05 + (g.d.enxame ? (g.x - g.y) * 0.04 : g.ph)) * 0.2;
    let px = 0, py = 0;
    if (!voa && g.nd > 0.5) { const k = (g.lane * (MAPA.larg / 2 - g.r - 1) - g.nd) * 0.03; px += (g.x - g.nx) / g.nd * k; py += (g.y - g.ny) / g.nd * k; } // faixa própria (usa a posição em relação ao caminho calculada no quadro anterior)
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const c = grid[g.ci + ox + oy * COLS]; if (!c) continue;
      // colisão com limite de vizinhos por célula (amostra rotativa a cada quadro) para aguentar o enxame
      const L = c.length, nn = Math.min(L, COLIS_MAX);
      for (let k = 0; k < nn; k++) {
        const o = c[L > COLIS_MAX ? (k + S.t) % L : k]; if (o === g || o.dead) continue;
        const ex = g.x - o.x, ey = g.y - o.y, m = g.r + o.r + 5, dd = Math.sqrt(ex * ex + ey * ey);
        if (dd < m && dd > 0.01) { const f = (m - dd) / m * 2.4 * (o.r / g.r); px += ex / dd * f; py += ey / dd * f; }
      }
    }
    for (const t of S.tow) { const ex = g.x - t.x, ey = g.y - t.y, dd = Math.sqrt(ex * ex + ey * ey); if (dd < 18 && dd > 0.01) { px += ex / dd * 1.2; py += ey / dd * 1.2; } }
    const sm = g.d.enxame ? 0.8 : 0.6; g.vx = g.vx * sm + (ax + px) * (1 - sm); g.vy = g.vy * sm + (ay + py) * (1 - sm);
    g.x += g.vx; g.y += g.vy;
    if (!voa) { const n = nearRoute(g.x, g.y, P, g.wp), lim = MAPA.larg / 2 - g.r - 1;
      if (n.d > lim) { const k = 1 - lim / n.d; g.x += (n.x - g.x) * k; g.y += (n.y - g.y) * k; }
      g.nd = Math.min(n.d, lim); g.nx = n.x; g.ny = n.y; }
    if (g.flash > 0) g.flash--;
  }
  // xamã: cura % da vida a cada 0,5s (sem acumular; queimados não curam)
  if (xamas.length && S.t % 30 === 0) for (const x of xamas) for (const o of S.gob) if (!o.dead && o.curaT !== S.t && !(o.burn > 0) && o.hp < o.max && Math.hypot(o.x - x.x, o.y - x.y) < x.d.raioCura) { o.curaT = S.t; o.hp = Math.min(o.max, o.hp + o.max * x.d.cura); }
  S.gob = S.gob.filter(g => !g.dead);
  if (nasc.length) S.gob.push(...nasc);
}

// poças do Alquimista (dano fixo + % da vida, ignora armadura, 1x por tick por goblin) e gêiseres do mapa (atordoam torres no raio)
function updateExtras() {
  for (const z of S.zon) {
    z.life--;
    if (S.t % z.tick === 0) for (const g of S.gob) if (!g.dead && g.pz !== S.t && Math.hypot(g.x - z.x, g.y - z.y) < z.r) { g.pz = S.t; if (z.evo && !g.d.boss) g.slow = Math.max(g.slow, 45); hit(g, z.dano + g.max * z.pct * (g.d.boss ? 0.25 : 1), true, z.src); }
    if (S.t % 6 === 0) S.part.push({ x: z.x + rnd(-z.r, z.r) * 0.8, y: z.y + rnd(-z.r, z.r) * 0.8, vx: 0, vy: -0.3, life: 14, max: 14, c1: '#b8ff8a', c2: '#2a8a28' });
  }
  S.zon = S.zon.filter(z => z.life > 0);
  const TP = MAPA.tempestade; // tempestade: a cada `per` quadros um raio atordoa uma torre aleatória
  if (TP && S.ativa && S.run > 0 && S.run % TP.per === 0) {
    const al = S.tow.filter(t => !(t.stun > 0));
    if (al.length) { const t = al[(Math.random() * al.length) | 0]; stunar(t, TP.stun); lineFx(t.x, t.y - 80, t.x, t.y); ringFx(t.x, t.y, 16, '#ffffff', '#a08010'); burst(t.x, t.y, 12, '#ffffff', '#ffe84c', 2.5); }
  }
  if (S.ativa) for (const h of MAPA.perigos) if (S.run > 0 && (S.run + h.off) % h.per === 0) {
    for (const t of S.tow) if (dentro(h, t.x, t.y)) stunar(t, h.stun);
    zonaFx(h);
  }
}
function pagar() {
  S.pago = true; S.ganho = moedasGanhas(S.kills); META.moedas += S.ganho;
  tmapa()[MI] = S.tow.map(t => ({ k: t.k, x: t.x, y: t.y, lvl: t.lvl, dir: t.dir, cone: t.cone }));
  if (S.won) { META.vit = META.vit || {}; if (!META.vit[MI]) { META.vit[MI] = true; S.novoMapa = MI + 1 < MAPAS.length ? MAPAS[MI + 1].nome : ''; } }
  salvarMeta(); buildMapas();
}
function update() {
  S.t++;
  for (const gr of S.groups) { gr.delay--; if (gr.delay <= 0) { spawnGroup(gr); gr.done = true; } }
  S.groups = S.groups.filter(g => !g.done);
  updateGoblins(); updateTowers(); updateExtras();
  for (const p of S.part) { p.x += p.vx; p.y += p.vy; p.life--; if (p.jit) { p.vx *= 0.92; p.vy *= 0.92; if (p.life % 3 === 0) { p.x += rnd(-2, 2); p.y += rnd(-2, 2); } } }
  S.part = S.part.filter(p => p.life > 0);
  if (S.ativa) { S.run++; if (S.run >= RUN_FRAMES) { S.ativa = false; S.won = true; S.over = true; } }
  if (S.over && !S.pago) pagar();
}

// ---------- desenho (cores 100% sólidas, grade de 2px) ----------
function ring(x, y, r, c) { ctx.fillStyle = c; for (let a = 0; a < 6.28; a += 8 / r) ctx.fillRect(q(x + Math.cos(a) * r), q(y + Math.sin(a) * r), 2, 2); }
function box(x, y, s, c) { ctx.fillStyle = c; ctx.fillRect(q(x - s / 2), q(y - s / 2), s, s); }

// cone de tiro: bordas e arco em blocos 2x2 sólidos
function coneFx(x, y, r, dir, cone, c) {
  ctx.fillStyle = c;
  for (const a of [dir - cone / 2, dir + cone / 2]) for (let d = 10; d <= r; d += 8) ctx.fillRect(q(x + Math.cos(a) * d), q(y + Math.sin(a) * d), 2, 2);
  for (let a = dir - cone / 2; a <= dir + cone / 2; a += 8 / r) ctx.fillRect(q(x + Math.cos(a) * r), q(y + Math.sin(a) * r), 2, 2);
}
function drawAim() {
  const A = S.aim, dx = S.mx - A.x, dy = S.my - A.y;
  if (Math.hypot(dx, dy) > 6) A.dir = Math.atan2(dy, dx);
  const alc = A.edit ? tStat(A.edit).alc : A.def.alcance * (1 + ef(PRE[A.k] + '_alc')) * (MAPA.mod.alc || 1) * nevoaF(A.x, A.y);
  if (!A.edit) box(A.x, A.y, 10, A.def.cor);
  coneFx(A.x, A.y, alc, A.dir, A.cone, '#ffffff'); if (ZM[A.k]) ring(A.x, A.y, ZM[A.k], '#ff4040');
}
function txt(s, x, y, c, al) { ctx.textAlign = al || 'left'; ctx.fillStyle = '#10161e'; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(s, x + dx, y + dy); ctx.fillStyle = c; ctx.fillText(s, x, y); ctx.textAlign = 'left'; }
function drawHud() {
  const X = 240, W = 480, hpMax = CFG.baseHp + ef('vida'), n = MAPA.ondas.length, prog = Math.min(1, S.run / RUN_FRAMES);
  const on = Math.min(n, Math.floor(S.run / (RUN_FRAMES / n)) + 1), seg = RUN_FRAMES / n, restoSeg = Math.ceil((seg * on - S.run) / 60);
  ctx.font = 'bold 14px monospace';
  txt(JOGADOR, 8, 20, '#ffd84c');
  ctx.font = 'bold 12px monospace'; txt(`${MI + 1}. ${MAPA.nome}`, 8, 36, '#6fd6ff'); ctx.font = '11px monospace'; txt(MAPA.desafio || '', 8, 51, '#cccccc'); ctx.font = 'bold 14px monospace';
  // vida
  ctx.fillStyle = '#1c2a44'; ctx.fillRect(X - 4, 4, W + 8, 24);
  ctx.fillStyle = '#7a1c14'; ctx.fillRect(X, 8, W, 16);
  ctx.fillStyle = '#c8402c'; ctx.fillRect(X, 8, q(W * S.hp / hpMax), 16);
  ctx.fillStyle = '#e8644c'; ctx.fillRect(X, 8, q(W * S.hp / hpMax), 2);
  ctx.fillStyle = '#1c2a44'; for (let i = 1; i < 4; i++) ctx.fillRect(X + q(W * i / 4) - 1, 8, 2, 16);
  txt(`${S.hp}/${hpMax}`, X + W / 2, 21, '#ffffff', 'center');
  // progresso das ondas (uma divisão por onda)
  ctx.fillStyle = '#1c2a44'; ctx.fillRect(X - 4, 30, W + 8, 12);
  ctx.fillStyle = '#10161e'; ctx.fillRect(X, 32, W, 8);
  ctx.fillStyle = ['#4cc8ff', '#ffb030', '#ff4c4c'][on - 1] || '#ff4c4c'; ctx.fillRect(X, 32, q(W * prog), 8);
  ctx.fillStyle = '#1c2a44'; for (let i = 1; i < n; i++) ctx.fillRect(X + q(W * i / n) - 1, 32, 2, 8);
  txt(`ONDA ${on}/${n}`, X + W + 12, 41, '#ffffff');
  txt(`${Math.floor(restoSeg / 60)}:${String(restoSeg % 60).padStart(2, '0')}`, X - 12, 41, '#ffffff', 'right');
  // contadores: unidades, abates, moedas
  const y = 58;
  box(360, y, 10, TOWERS[S.sel].cor2); box(360, y, 6, TOWERS[S.sel].cor); txt(`${usadas(S.sel)}/${vagas(S.sel)}`, 376, y + 5, '#ffffff');
  box(480, y, 10, '#e8e8e8'); ctx.fillStyle = '#10161e'; ctx.fillRect(q(476), q(y - 2), 2, 2); ctx.fillRect(q(482), q(y - 2), 2, 2); txt(`${S.kills}`, 496, y + 5, '#ffffff');
  box(600, y, 10, '#b88a10'); box(600, y, 6, '#ffd84c'); txt(`${moedasGanhas(S.kills)}`, 616, y + 5, '#ffffff');
  txt(`x${S.speed}${S.pause ? ' PAUSA' : ''}`, CFG.W - 8, 20, '#ffffff', 'right');
  if (!S.wave) txt('Monte a defesa e chame a horda (N / Enter)', CFG.W / 2, CFG.H - 10, '#ffffff', 'center');
}

function draw() {
  ctx.drawImage(bg, 0, 0);
  const bx = CFG.baseX, by = CFG.baseY;
  box(bx, by, 64, '#4a4a55'); box(bx, by, 52, '#8a8a95'); box(bx, by, 28, '#5a4630'); box(bx, by - 40, 6, '#ff4040');
  for (const h of MAPA.perigos) { const warn = S.ativa && h.per - (S.run + h.off) % h.per <= 90 && S.t % 10 < 5; ctx.fillStyle = warn ? '#ff4040' : h.cor2; for (const [x, y] of h.borda) ctx.fillRect(x, y, 2, 2); }
  for (const z of S.zon) { if (z.life > 60 || z.life % 8 < 5) ring(z.x, z.y, z.r, '#6ae04c'); ring(z.x, z.y, z.r * 0.55, '#2a8a28'); }
  for (const t of S.tow) {
    const st = t.stun > 0;
    if (t.def.tipo === 'aura') ring(t.x, t.y, auraR(t), st ? '#555555' : t.def.cor);
    if (t.evo) box(t.x, t.y, 22, S.t % 12 < 6 ? '#ffd84c' : '#fff0a0');
    box(t.x, t.y, 16, st ? '#303030' : t.def.cor2); box(t.x, t.y, 10, st ? '#707070' : t.def.cor);
    for (let i = 0; i < t.lvl; i++) box(t.x - 6 + i * 6 + 2, t.y + 11, 2, '#ffd84c'); evoBar(t);
    if (st) box(t.x, t.y - 14, 4, S.t % 8 < 4 ? '#ffff40' : '#ff4040');
    if (t.def.tipo !== 'aura') { const ma = t.dir - t.cone / 2 + t.sw * t.cone; box(t.x + Math.cos(ma) * 10, t.y + Math.sin(ma) * 10, 4, '#ffffff'); }
  }
  for (const g of S.gob) {
    const s = g.r * 2, c = g.flash > 0 ? '#ffffff' : g.frz > 0 ? '#b8f0ff' : g.burn > 0 ? '#ff8a2c' : g.slow > 0 ? '#6fd6ff' : g.d.cor;
    if (g.d.enxame) box(g.x, g.y, s, c); else { box(g.x, g.y, s, g.d.cor2); box(g.x, g.y, s - 2, c); box(g.x + 2, g.y - 2, 2, '#ff3030'); }
    if (g.hp < g.max) { const w = q(s * g.hp / g.max); ctx.fillStyle = '#400'; ctx.fillRect(q(g.x - g.r), q(g.y - g.r - 4), s, 2); ctx.fillStyle = '#4f4'; ctx.fillRect(q(g.x - g.r), q(g.y - g.r - 4), w, 2); }
  }
  for (const p of S.proj) { box(p.x, p.y, p.def.tipo === 'bomba' ? 6 : 4, p.def.cor2); box(p.x, p.y, p.def.tipo === 'bomba' ? 4 : 2, '#ffffff'); }
  for (const p of S.part) {
    if (p.life % 3 === 0 && p.c1 === '#ffffff') continue; // cintilar
    box(p.x, p.y, p.life > p.max / 2 ? 4 : 2, p.life < p.max * 0.3 ? p.c2 : p.c1);
  }
  // fantasma da torre / alcance
  const over = S.tow.find(t => Math.hypot(t.x - S.mx, t.y - S.my) < 12);
  if (S.aim) drawAim();
  else if (over && over.def.tipo !== 'aura') { coneFx(over.x, over.y, tStat(over).alc, over.dir, over.cone, '#ffffff'); if (zm(over)) ring(over.x, over.y, zm(over), '#ff4040'); }
  else { const d = TOWERS[S.sel]; ring(S.mx, S.my, d.alcance * (1 + ef(PRE[S.sel] + '_alc')) * (MAPA.mod.alc || 1) * nevoaF(S.mx, S.my), canPlace(S.mx, S.my) && !cheio(S.sel) ? '#ffffff' : '#ff4040'); box(S.mx, S.my, 10, d.cor); }
  if (over && !S.aim && pk(PRE[over.k] + '_evo') > 0) { ctx.font = 'bold 11px monospace'; txt(over.evo ? 'EVOLUÍDA' : `Evolução ${over.kills || 0}/${S.need[over.k]}`, over.x, over.y - 22, over.evo ? '#ffd84c' : '#ffffff', 'center'); }
  // HUD
  drawHud();
  if (S.aim) txt(`Mire com o mouse · roda: cone ${Math.round(S.aim.cone * 180 / Math.PI)}° · clique: confirmar · direito/Esc: cancelar`, CFG.W / 2, CFG.H - 28, '#ffffff', 'center');
  if (S.over) { ctx.fillStyle = '#000'; ctx.fillRect(280, 250, 400, S.novoMapa ? 112 : 90); ctx.fillStyle = S.won ? '#6fd66f' : '#ff4040'; ctx.font = 'bold 28px monospace'; ctx.fillText(S.won ? 'VITÓRIA!' : 'FIM DE JOGO', 380, 292); ctx.fillStyle = '#fff'; ctx.font = '14px monospace'; ctx.fillText(`Castelo ${S.hp} · +${S.ganho} moedas · clique ou R`, 310, 320); if (S.novoMapa) { ctx.fillStyle = '#ffd84c'; ctx.fillText(`Mapa desbloqueado: ${S.novoMapa}`, 310, 342); } }
}

// ---------- entrada ----------
function canPlace(x, y) {
  return y > 72 && nearPath(x, y).d > MAPA.larg / 2 + 12 && baseDist(x, y) > CFG.baseR + 24 && !S.tow.some(t => Math.hypot(t.x - x, t.y - y) < 20)
    && ![...MAPA.bloq, ...MAPA.muros].some(b => x > b[0] - 6 && x < b[0] + b[2] + 6 && y > b[1] - 6 && y < b[1] + b[3] + 6);
}
function pos(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * CFG.W / r.width, (e.clientY - r.top) * CFG.H / r.height]; }
cv.addEventListener('mousemove', e => [S.mx, S.my] = pos(e));
cv.addEventListener('contextmenu', e => {
  e.preventDefault(); if (S.aim) { S.aim = null; return; } const [x, y] = pos(e), i = S.tow.findIndex(t => Math.hypot(t.x - x, t.y - y) < 12);
  if (i >= 0) { S.tow.splice(i, 1); buildShop(); }
});
cv.addEventListener('wheel', e => {
  if (!S.aim) return; e.preventDefault();
  S.aim.cone = Math.max(rad(CONE_CFG.min), Math.min(rad(CONE_CFG.max), S.aim.cone + (e.deltaY < 0 ? 1 : -1) * rad(CONE_CFG.passo)));
}, { passive: false });
cv.addEventListener('click', e => {
  if (S.over) return reset();
  if (S.aim) {
    const A = S.aim; S.aim = null;
    if (A.edit) Object.assign(A.edit, { dir: A.dir, cone: A.cone, sw: 0, sd: 1 });
    else { S.tow.push({ x: A.x, y: A.y, def: A.def, k: A.k, lvl: 1, cd: 0, dir: A.dir, cone: A.cone, sw: 0, sd: 1 }); buildShop(); }
    return;
  }
  const [x, y] = pos(e), t = S.tow.find(t => Math.hypot(t.x - x, t.y - y) < 12);
  if (t) { if (t.def.tipo !== 'aura') S.aim = { x: t.x, y: t.y, def: t.def, k: t.k, dir: t.dir, cone: t.cone, edit: t }; return; }
  const def = TOWERS[S.sel];
  if (!cheio(S.sel) && livre(S.sel) && canPlace(x, y)) {
    if (def.tipo === 'aura') { S.tow.push({ x: q(x), y: q(y), def, k: S.sel, lvl: 1, cd: 0, dir: 0, cone: 0, sw: 0, sd: 1 }); buildShop(); return; } // totem não precisa mirar
    const n = nearPath(x, y); S.aim = { x: q(x), y: q(y), def, k: S.sel, dir: Math.atan2(n.y - y, n.x - x), cone: rad(def.cone), edit: null };
  }
});
addEventListener('keydown', e => {
  if (!metaEl.hidden || !menuEl.hidden) return;
  if (e.key === 'Escape') { S.aim = null; return; }
  const k = e.key.toLowerCase(), keys = Object.keys(TOWERS);
  if (k >= '1' && k <= String(keys.length)) { if (livre(keys[+k - 1])) { S.sel = keys[+k - 1]; buildShop(); } }
  else if ((k === 'n' || k === 'enter') && !S.ativa) startWave();
  else if (k === 'f') S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1;
  else if (k === ' ') { S.pause = !S.pause; e.preventDefault(); }
  else if (k === 'r') reset();
});

// ---------- melhorias permanentes (painel) ----------
const metaEl = document.getElementById('meta'), btnMeta = document.getElementById('melhorias');
// fundo do mar da skill tree (pré-renderizado) e raiz
const SEA = document.createElement('canvas'); SEA.width = CFG.W; SEA.height = TREE_H;
(function () {
  const b = SEA.getContext('2d'); b.fillStyle = '#08101c'; b.fillRect(0, 0, CFG.W, TREE_H); b.fillStyle = '#0b1626';
  for (let y = 0; y < TREE_H; y += 32) for (let x = 0; x < CFG.W; x += 32) if ((x + y) / 32 % 2 === 0) b.fillRect(x, y, 32, 32);
  for (let i = 0; i < 260; i++) { b.fillStyle = i % 5 ? '#1a2e4a' : '#3a5a86'; b.fillRect(q((i * 97) % CFG.W), q((i * 53 + (i * i) % 211) % TREE_H), 2, 2); }
})();
let TC, treeHover = null;
const aberto = id => { const p = TREE[id].pai; return !p || !!ROOTS[p] || pk(p) > 0; };
const ponto = k => ROOTS[k] || TREE[k];
function buyPerk(id) {
  const p = PERKS[id], l = pk(id), c = custoPerk(p, l);
  if (!aberto(id) || l >= p.mx || META.moedas < c) return;
  META.moedas -= c; META.lv[id] = l + 1; salvarMeta();
}
// ligações em ângulo reto (blocos sólidos): w = meia espessura (4 = contorno, 2 = miolo)
function tseg(t, x0, y0, x1, y1, c, w) {
  const xa = q(Math.min(x0, x1)), ya = q(Math.min(y0, y1));
  t.fillStyle = c; t.fillRect(xa - w, ya - w, q(Math.abs(x1 - x0)) + 2 * w, q(Math.abs(y1 - y0)) + 2 * w);
}
function tlink(t, p, n, c, w) {
  if (p.x === n.x || p.y === n.y) return tseg(t, p.x, p.y, n.x, n.y, c, w);
  const m = n.y - 48; tseg(t, p.x, p.y, p.x, m, c, w); tseg(t, p.x, m, n.x, m, c, w); tseg(t, n.x, m, n.x, n.y, c, w);
}
// ladrilho com chanfro: E = [borda clara, borda escura, fundo]
function ttile(t, x, y, s, E) {
  const X = q(x - s / 2), Y = q(y - s / 2);
  t.fillStyle = '#05080f'; t.fillRect(X - 2, Y - 2, s + 4, s + 4); t.fillStyle = E[1]; t.fillRect(X, Y, s, s);
  t.fillStyle = E[0]; t.fillRect(X, Y, s - 2, 2); t.fillRect(X, Y, 2, s - 2); t.fillStyle = E[2]; t.fillRect(X + 4, Y + 4, s - 8, s - 8);
}
const TSTATE = { on: ['#fff0a0', '#a08010', '#2e2410'], ok: ['#b8ffb8', '#2a7a2a', '#102418'], sem: ['#c8a060', '#6a4a20', '#1c1810'], off: ['#3a5272', '#0c1826', '#08101a'], hv: ['#ffffff', '#8a8a8a', '#202830'] };
function ttx(t, s, x, y, c, al, f) {
  t.font = f || 'bold 10px monospace'; t.textAlign = al || 'center'; t.fillStyle = '#08101a';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) t.fillText(s, x + dx, y + dy);
  t.fillStyle = c; t.fillText(s, x, y);
}
function drawTree() {
  const t = TC.getContext('2d'), ES = TSTATE;
  t.drawImage(SEA, 0, 0);
  ttx(t, 'ÁRVORE DE MELHORIAS', 600, 44, '#ffd84c', 'center', 'bold 22px monospace');
  ttx(t, `${META.moedas} moedas disponíveis`, 600, 66, '#cccccc', 'center', '12px monospace');
  // um painel por torre (cabeçalho com o nome; apagado enquanto a torre está bloqueada)
  for (const [k, , x, y] of CADEIA) {
    const on = livre(k), px = x - 114, py = y - 60, h = 350;
    t.fillStyle = '#05080f'; t.fillRect(px - 4, py - 4, 236, h + 8);
    t.fillStyle = on ? TOWERS[k].cor2 : '#1c3a56'; t.fillRect(px - 2, py - 2, 232, h + 4);
    t.fillStyle = '#0a1828'; t.fillRect(px, py, 228, h);
    t.fillStyle = on ? TOWERS[k].cor2 : '#14283e'; t.fillRect(px, py, 228, 20);
    ttx(t, TOWERS[k].nome.toUpperCase() + (on ? '' : ' · BLOQUEADA'), px + 8, py + 14, on ? '#ffffff' : '#7a8a9a', 'left');
  }
  // ligações: primeiro todos os contornos, depois os mioleos
  const L = [];
  for (const k in ROOTS) { const r = ROOTS[k]; if (r.pai) L.push([ROOTS[r.pai], r, '#ffd84c']); }
  for (const id in TREE) { const n = TREE[id]; L.push([ponto(n.pai), n, pk(id) > 0 ? '#ffd84c' : aberto(id) ? '#6fd66f' : '#243a52']); }
  for (const [p, n] of L) tlink(t, p, n, '#05080f', 4);
  for (const [p, n, c] of L) tlink(t, p, n, c, 2);
  for (const k in ROOTS) { const r = ROOTS[k]; ttile(t, r.x, r.y, 48, ES.on); ttx(t, r.ic, r.x, r.y + 5, '#ffffff', 'center', 'bold 13px monospace'); if (k !== 'ARQ') ttx(t, r.nome, r.x, r.y + 42, '#ffffff'); }
  for (const id in TREE) {
    const n = TREE[id], p = PERKS[id], l = pk(id), ab = aberto(id), max = l >= p.mx, c = custoPerk(p, l), ok = ab && !max && META.moedas >= c, vis = ab || l > 0;
    ttile(t, n.x, n.y, 44, id === treeHover ? ES.hv : l > 0 ? ES.on : ab ? (ok ? ES.ok : ES.sem) : ES.off);
    if (!vis) { ttx(t, '?', n.x, n.y + 5, '#2a3a52', 'center', 'bold 13px monospace'); continue; }
    ttx(t, n.ic, n.x, n.y + 5, n.cor, 'center', 'bold 13px monospace');
    const x0 = q(n.x - p.mx * 3);
    for (let i = 0; i < p.mx; i++) { t.fillStyle = '#05080f'; t.fillRect(x0 + i * 6 - 1, n.y + 26, 6, 6); t.fillStyle = l > i ? '#ffd84c' : '#243a52'; t.fillRect(x0 + i * 6, n.y + 27, 4, 4); }
    ttx(t, p.n.toUpperCase(), n.x, n.y + 46, '#ffffff');
    if (max) ttx(t, 'MÁX', n.x, n.y - 29, '#ffd84c', 'center');
    else if (ab) {
      const s = String(c), w = s.length * 6 + 14, X = q(n.x - w / 2);
      t.fillStyle = '#05080f'; t.fillRect(X - 2, n.y - 40, w + 4, 14); t.fillStyle = ok ? '#1c4a1c' : '#4a1c1c'; t.fillRect(X, n.y - 38, w, 10);
      t.fillStyle = '#ffd84c'; t.fillRect(X + 4, n.y - 35, 4, 4); ttx(t, s, X + 12, n.y - 30, ok ? '#9fff9f' : '#ff8a8a', 'left');
    }
  }
  // legenda
  [['COMPRADO', ES.on], ['DISPONÍVEL', ES.ok], ['SEM MOEDAS', ES.sem], ['BLOQUEADO', ES.off]].forEach(([s, E], i) => { const x = 250 + i * 150; ttile(t, x, 905, 12, E); ttx(t, s, x + 12, 909, '#cccccc', 'left', '10px monospace'); });
  // moedas (cabeçalho fixo do painel)
  const mc = metaEl.querySelector('#mcoins'); if (mc) mc.textContent = `MOEDAS ${META.moedas}` + (S.ganho ? `  (+${S.ganho} na última run)` : '');
  // dica do nó (ao lado do nó, para aparecer onde o mouse está)
  if (treeHover) {
    const p = PERKS[treeHover], l = pk(treeHover), nn = TREE[treeHover], ox = Math.max(8, Math.min(CFG.W - 428, nn.x - 210)), oy = nn.y + 134 > TREE_H ? nn.y - 150 : nn.y + 62;
    t.fillStyle = '#05080f'; t.fillRect(ox - 4, oy - 4, 428, 72); t.fillStyle = nn.cor; t.fillRect(ox - 2, oy - 2, 424, 68); t.fillStyle = '#0a1828'; t.fillRect(ox, oy, 420, 64);
    ttx(t, `${p.n} · Nv ${l}/${p.mx}`, ox + 14, oy + 24, '#ffffff', 'left', 'bold 14px monospace');
    ttx(t, p.d, ox + 14, oy + 42, '#cccccc', 'left', '12px monospace');
    ttx(t, aberto(treeHover) ? (l >= p.mx ? 'Nível máximo' : `Custo: ${custoPerk(p, l)} moedas`) : `Bloqueado: requer ${PERKS[TREE[treeHover].pai].n}`, ox + 14, oy + 56, aberto(treeHover) ? '#ffd84c' : '#ff6060', 'left', '12px monospace');
  }
}
function buildMeta() {
  metaEl.innerHTML = '<div id="mhead"><span id="mcoins"></span><button id="fechar">Jogar</button><button id="resetar">↺ Redefinir</button></div><div class="mapas"></div><canvas id="tree"></canvas>';
  buildMapas();
  TC = metaEl.querySelector('#tree'); TC.width = CFG.W; TC.height = TREE_H; treeHover = null;
  const at = e => {
    const r = TC.getBoundingClientRect(), x = (e.clientX - r.left) * CFG.W / r.width, y = (e.clientY - r.top) * TREE_H / r.height;
    for (const id in TREE) if (Math.abs(x - TREE[id].x) <= 24 && Math.abs(y - TREE[id].y) <= 24) return id;
    return null;
  };
  TC.onmousemove = e => { const h = at(e); if (h !== treeHover) { treeHover = h; drawTree(); } };
  TC.onclick = e => { const h = at(e); if (h) { buyPerk(h); drawTree(); } };
  metaEl.querySelector('#fechar').onclick = () => { metaEl.hidden = true; reset(); };
  // redefinir: devolve todas as moedas gastas em melhorias e zera os níveis (mapas vencidos e torres salvas permanecem)
  metaEl.querySelector('#resetar').onclick = () => {
    const total = Object.keys(META.lv).reduce((s, id) => s + (PERKS[id] ? PERKS[id].c.slice(0, META.lv[id]).reduce((a, b) => a + b, 0) : 0), 0);
    if (!total) return;
    if (!confirm(`Redefinir as melhorias de ${JOGADOR}? Você recebe de volta ${total} moedas para gastar como quiser.`)) return;
    META.moedas += total; META.lv = {}; salvarMeta(); drawTree();
  };
  drawTree();
}
btnMeta.onclick = () => { if (!btnMeta.disabled) { buildMeta(); metaEl.hidden = false; } btnMeta.blur(); };
const menuEl = document.getElementById('menu'), nomeEl = document.getElementById('nome'), btnJog = document.getElementById('jogador');
let pedindo = !lerLS('goblintd_atual', null); // sem jogador atual (primeira vez ou nomes resetados): pede o nome
const limpaNome = s => (s || '').trim().slice(0, 12).replace(/[^\w\u00C0-\u017F -]/g, '');
function renderMenu() {
  const quem = menuEl.querySelector('#quem');
  quem.hidden = pedindo; quem.textContent = `Jogador: ${JOGADOR} \u00b7 ${META.moedas} moedas`;
  menuEl.querySelector('.mapas').hidden = pedindo;
  menuEl.querySelector('#novo').hidden = !pedindo;
  if (pedindo) nomeEl.focus();
}
function abrirMenu() { metaEl.hidden = true; menuEl.hidden = false; renderMenu(); }
function nomeOk() {
  if (!pedindo) return true;
  const n = limpaNome(nomeEl.value); if (!n) { nomeEl.focus(); return false; }
  carregarMeta(n); setMapa(mapaInicial()); salvarMeta(); pedindo = false; nomeEl.value = ''; return true;
}
menuEl.querySelector('#mJogar').onclick = () => { if (nomeOk()) { menuEl.hidden = true; reset(); } };
menuEl.querySelector('#mMelhorias').onclick = () => { if (nomeOk()) { menuEl.hidden = true; buildMeta(); metaEl.hidden = false; } };
nomeEl.onkeydown = e => { if (e.key === 'Enter') menuEl.querySelector('#mJogar').click(); };
btnJog.onclick = () => { abrirMenu(); btnJog.blur(); };
const velBtns = document.querySelectorAll('#vel button');
velBtns.forEach(b => b.onclick = () => { S.speed = +b.dataset.v; b.blur(); });
const btnStart = document.getElementById('start');
// seletor de mapas (menu principal e painel de melhorias): cada mapa abre ao vencer o anterior
function buildMapas() {
  document.querySelectorAll('.mapas').forEach(el => {
    el.innerHTML = '';
    MAPAS.forEach((m, i) => {
      const b = document.createElement('button'), ok = desbloq(i);
      b.textContent = ok ? `${i === MI ? '▶ ' : ''}${i + 1} ${m.nome}` : `${i + 1} 🔒`; b.disabled = !ok; b.className = i === MI ? 'sel' : ''; b.title = m.desafio || '';
      b.onclick = () => { if (!S.ativa && i !== MI) { META.torres = {}; setMapa(i); reset(); salvarMeta(); } b.blur(); };
      el.appendChild(b);
    });
  });
}
btnStart.onclick = () => { if (!S.ativa) startWave(); btnStart.blur(); };
setMapa(mapaInicial());
reset();
abrirMenu();
(function loop() {
  const txt = S.ativa ? 'Horda em andamento...' : S.over ? (S.won ? 'Vitória!' : 'Derrota') : '▶ Chamar a horda';
  if (btnStart.textContent !== txt) btnStart.textContent = txt;
  btnStart.disabled = !!S.wave || S.over;
  btnMeta.hidden = !S.over;
  btnJog.disabled = S.ativa;
  velBtns.forEach(b => b.classList.toggle('sel', +b.dataset.v === S.speed));
  if (!S.pause && !S.over && menuEl.hidden) for (let i = 0; i < S.speed; i++) update();
  draw(); requestAnimationFrame(loop);
})();

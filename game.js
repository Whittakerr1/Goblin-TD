// Goblin Horde TD - lógica principal (dados em data.js)
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
cv.width = CFG.W; cv.height = CFG.H;
const q = v => Math.floor(v / 2) * 2;
const rad = d => d * Math.PI / 180;
const angD = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const rnd = (a, b) => a + Math.random() * (b - a);
// ponto mais próximo do caminho (para limitar a multidão e bloquear torres)
function nearPath(x, y) {
  let best = { d: 1e9, x: 0, y: 0 }; const P = MAPA.pontos;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], vx = b[0] - a[0], vy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy)));
    const nx = a[0] + vx * t, ny = a[1] + vy * t, d = Math.hypot(x - nx, y - ny);
    if (d < best.d) best = { d, x: nx, y: ny };
  }
  return best;
}
const CELL = 24, COLS = Math.ceil(CFG.W / CELL) + 1, ROWS = Math.ceil(CFG.H / CELL) + 1;
let S;
// meta-progressão: moedas e melhorias permanentes (salvas no navegador)
let META = { moedas: 0, lv: {} };
try { const m = JSON.parse(localStorage.getItem('goblintd_meta')); if (m && m.lv) META = m; } catch (e) {}
const salvarMeta = () => { try { localStorage.setItem('goblintd_meta', JSON.stringify(META)); } catch (e) {} };
const pk = id => META.lv[id] || 0, ef = id => pk(id) * PERKS[id].u;
const livre = k => k === 'arqueiro' || pk(k) > 0;
// limite de unidades individual por torre: 1 base + perk de Unidade da própria árvore
const vagas = k => 1 + pk(PRE[k] + '_slot'), usadas = k => S.tow.filter(t => t.k === k).length, cheio = k => usadas(k) >= vagas(k);

// fundo estático (grama xadrez), desenhado uma vez
const bg = document.createElement('canvas'); bg.width = CFG.W; bg.height = CFG.H;
(function () {
  const b = bg.getContext('2d');
  for (let y = 0; y < CFG.H; y += 16) for (let x = 0; x < CFG.W; x += 16) {
    b.fillStyle = ((x + y) / 16) % 2 ? '#2f6a2a' : '#2a6026'; b.fillRect(x, y, 16, 16);
    if ((x * 7 + y * 13) % 11 === 0) { b.fillStyle = '#3c8034'; b.fillRect(x + 4, y + 6, 2, 2); }
  }
  // caminho de terra: borda escura, miolo claro, pedrinhas
  const P = MAPA.pontos, h = MAPA.larg / 2, segs = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], c = P[i + 1];
    segs.push([q(Math.min(a[0], c[0]) - h), q(Math.min(a[1], c[1]) - h), q(Math.abs(c[0] - a[0]) + 2 * h), q(Math.abs(c[1] - a[1]) + 2 * h)]);
  }
  b.fillStyle = '#5a4630'; segs.forEach(s => b.fillRect(s[0] - 4, s[1] - 4, s[2] + 8, s[3] + 8));
  b.fillStyle = '#9a7a48'; segs.forEach(s => b.fillRect(s[0], s[1], s[2], s[3]));
  b.fillStyle = '#8a6a3c';
  segs.forEach(s => { for (let y = s[1]; y < s[1] + s[3]; y += 8) for (let x = s[0]; x < s[0] + s[2]; x += 8) if ((x * 5 + y * 3) % 7 === 0) b.fillRect(x + 2, y + 2, 2, 2); });
})();

function reset() {
  S = { run: 0, hp: CFG.baseHp + ef('vida'), kills: 0, ganho: 0, wave: 0, gob: [], tow: [], proj: [], part: [], groups: [],
        sel: 'arqueiro', over: false, won: false, pause: false, speed: 1, t: 0, mx: 0, my: 0, ativa: false, prox: 300, aim: null };
  S.plano = planoHorda();
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
      for (const k in GOBLINS) { w[k] = o.peso0[k] + (o.peso1[k] - o.peso0[k]) * u; tot += w[k]; }
      for (let i = 0; i < n; i++) { let r = Math.random() * tot, tipo = 'comum'; for (const k in w) if ((r -= w[k]) < 0) { tipo = k; break; } for (let c = GOBLINS[tipo].enxame || 1; c--;) list.push(tipo); }
      gr.push({ delay: off + t, u, o, list });
      t += o.gapIni + (o.gapFim - o.gapIni) * u;
    }
    off += fim;
  });
  return gr;
}
function startWave() {
  if (S.over || S.wave) return;
  S.wave = 1; S.ativa = true;
  S.groups = S.plano;
}

function spawnGroup(gr) {
  gr.list.forEach(tipo => {
    const d = GOBLINS[tipo], o = gr.o, D = dif(MAPA.nivel), hp = d.fixo ? d.hp : Math.round(d.hp * D.hp * (o.hp[0] + (o.hp[1] - o.hp[0]) * gr.u));
    S.gob.push({ tipo, d, x: rnd(-90, -6), y: MAPA.pontos[0][1] + rnd(-MAPA.larg / 2 + 8, MAPA.larg / 2 - 8),
      vx: 0, vy: 0, vm: D.vel * (o.vel[0] + (o.vel[1] - o.vel[0]) * gr.u), wp: 1, prog: 0, hp, max: hp, r: d.r, slow: 0, ph: rnd(0, 6.28), flash: 0, dead: false });
  });
}

// ---------- efeitos (blocos sólidos, sem alpha) ----------
function burst(x, y, n, c1, c2, sp) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.28), v = rnd(0.3, sp || 1.6);
    S.part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 24, max: 24, c1, c2 });
  }
}
function ringFx(x, y, r, c1, c2) {
  for (let a = 0; a < 6.28; a += 6 / r) S.part.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: 0, vy: 0, life: 14, max: 14, c1, c2 });
}

function hit(g, dmg) { g.hp -= dmg; g.flash = 3; if (g.hp <= 0 && !g.dead) { g.dead = true; S.kills++; burst(g.x, g.y, g.d.enxame ? 2 : 6, g.d.cor, g.d.cor2); } }

// ---------- torres ----------
const tStat = t => ({ dano: t.def.dano * (1 + 0.5 * (t.lvl - 1)) * (1 + ef(PRE[t.k] + '_dano')), alc: t.def.alcance * (1 + 0.1 * (t.lvl - 1)) * (1 + ef(PRE[t.k] + '_alc')) });
const baseDist = (x, y) => Math.hypot(CFG.baseX - x, CFG.baseY - y);

function arcFx(x, y, r, a0, a1, c1, c2) {
  for (let a = a0; a <= a1; a += 6 / r) S.part.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: 0, vy: 0, life: 14, max: 14, c1, c2 });
}
const mkProj = (t, ang, st, def) => ({ x: t.x, y: t.y, vx: Math.cos(ang) * def.vel, vy: Math.sin(ang) * def.vel, def, dano: st.dano, raio: def.raio ? def.raio * (1 + ef('can_raio')) : 0, rest: st.alc });

// Torres não miram: varrem o cone (ponta a ponta, ida e volta) e atiram em linha reta; só disparam se houver goblin dentro do cone
function fire(t) {
  const st = tStat(t), def = t.def, N = CONE_CFG.passos;
  if (!S.gob.some(g => { if (g.dead) return false; const dx = g.x - t.x, dy = g.y - t.y; return Math.hypot(dx, dy) <= st.alc && angD(Math.atan2(dy, dx), t.dir) <= t.cone / 2 + 0.1; })) return;
  t.cd = def.cd * (1 - ef(PRE[t.k] + '_cad'));
  const a = t.dir - t.cone / 2 + t.sw * t.cone, step = 1 / (N - 1);
  let nx = t.sw + t.sd * step; if (nx > 1.0001 || nx < -0.0001) { t.sd = -t.sd; nx = t.sw + t.sd * step; } t.sw = nx;
  if (def.tipo === 'pulso') {
    const hw = t.cone / N;
    for (const g of S.gob) {
      const dx = g.x - t.x, dy = g.y - t.y;
      if (!g.dead && Math.hypot(dx, dy) <= st.alc && angD(Math.atan2(dy, dx), a) <= hw) { g.slow = def.slowT * (1 + ef('gel_dur')); hit(g, st.dano); }
    }
    arcFx(t.x, t.y, st.alc * 0.5, a - hw, a + hw, '#ffffff', def.cor2); arcFx(t.x, t.y, st.alc, a - hw, a + hw, def.cor, def.cor2);
  } else if (def.tipo === 'flecha') {
    const n = 1 + pk('arq_multi');
    for (let i = 0; i < n; i++) S.proj.push(mkProj(t, a + (i - (n - 1) / 2) * 0.14, st, def));
  } else S.proj.push(mkProj(t, a, st, def));
}

function updateTowers() {
  for (const t of S.tow) { if (t.cd > 0) t.cd--; else fire(t); }
  for (const p of S.proj) {
    p.x += p.vx; p.y += p.vy; p.rest -= p.def.vel;
    let tg = null; const ci = ((p.x / CELL) | 0) + 1 + ((p.y / CELL) | 0) * COLS;
    hitSearch: for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const c = GRID && GRID[ci + ox + oy * COLS]; if (!c) continue;
      for (const g of c) if (!g.dead && Math.hypot(g.x - p.x, g.y - p.y) < g.r + 3) { tg = g; break hitSearch; }
    }
    if (tg || p.rest <= 0) {
      p.done = true;
      if (p.def.tipo === 'flecha') { if (tg) hit(tg, p.dano); }
      else {
        for (const g of S.gob) if (!g.dead && Math.hypot(g.x - p.x, g.y - p.y) < p.raio) hit(g, p.dano);
        burst(p.x, p.y, 14, '#ffffff', '#ffb030', 2.4); ringFx(p.x, p.y, p.raio * 0.6, '#ffb030', '#7a3a10');
      }
    }
  }
  S.proj = S.proj.filter(p => !p.done);
}

// ---------- goblins: multidão com separação por grade ----------
let GRID = null; const COLIS_MAX = 6;
function updateGoblins() {
  const grid = GRID = new Array(COLS * ROWS);
  for (const g of S.gob) { const i = ((g.x / CELL) | 0) + 1 + (((g.y / CELL) | 0)) * COLS; (grid[i] = grid[i] || []).push(g); g.ci = i; }
  for (const g of S.gob) {
    if (g.dead) continue;
    const T = MAPA.pontos[g.wp], dx = T[0] - g.x, dy = T[1] - g.y, d = Math.hypot(dx, dy) || 1;
    if (d < 30 && g.wp < MAPA.pontos.length - 1) g.wp++;
    g.prog = g.wp * 1e4 - d;
    if (baseDist(g.x, g.y) < CFG.baseR) { S.hp -= g.d.dano; g.dead = true; burst(g.x, g.y, 8, '#ff4040', '#802020'); if (S.hp <= 0) { S.hp = 0; S.over = true; } continue; }
    const sp = g.d.vel * g.vm * (g.slow > 0 ? TOWERS.gelo.slow : 1); if (g.slow > 0) g.slow--;
    let ax = dx / d * sp, ay = dy / d * sp;
    ax += Math.cos(S.t * 0.04 + (g.d.enxame ? (g.x + g.y) * 0.04 : g.ph)) * 0.12; ay += Math.sin(S.t * 0.05 + (g.d.enxame ? (g.x - g.y) * 0.04 : g.ph)) * 0.2;
    let px = 0, py = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const c = grid[g.ci + ox + oy * COLS]; if (!c) continue;
      // colisão com limite de vizinhos por célula (amostra rotativa a cada quadro) para aguentar o enxame
      const L = c.length, nn = Math.min(L, COLIS_MAX);
      for (let k = 0; k < nn; k++) {
        const o = c[L > COLIS_MAX ? (k + S.t) % L : k]; if (o === g || o.dead) continue;
        const ex = g.x - o.x, ey = g.y - o.y, m = g.r + o.r + 1, dd = Math.hypot(ex, ey);
        if (dd < m && dd > 0.01) { const f = (m - dd) / m * 1.3 * (o.r / g.r); px += ex / dd * f; py += ey / dd * f; }
      }
    }
    for (const t of S.tow) { const ex = g.x - t.x, ey = g.y - t.y, dd = Math.hypot(ex, ey); if (dd < 18 && dd > 0.01) { px += ex / dd * 1.2; py += ey / dd * 1.2; } }
    const sm = g.d.enxame ? 0.8 : 0.6; g.vx = g.vx * sm + (ax + px) * (1 - sm); g.vy = g.vy * sm + (ay + py) * (1 - sm);
    g.x += g.vx; g.y += g.vy;
    const n = nearPath(g.x, g.y), lim = MAPA.larg / 2 - g.r - 1;
    if (n.d > lim) { const k = 1 - lim / n.d; g.x += (n.x - g.x) * k; g.y += (n.y - g.y) * k; }
    if (g.flash > 0) g.flash--;
  }
  S.gob = S.gob.filter(g => !g.dead);
}

function pagar() { S.pago = true; S.ganho = moedasGanhas(S.kills); META.moedas += S.ganho; salvarMeta(); }
function update() {
  S.t++;
  for (const gr of S.groups) { gr.delay--; if (gr.delay <= 0) { spawnGroup(gr); gr.done = true; } }
  S.groups = S.groups.filter(g => !g.done);
  updateGoblins(); updateTowers();
  for (const p of S.part) { p.x += p.vx; p.y += p.vy; p.life--; }
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
  const alc = A.edit ? tStat(A.edit).alc : A.def.alcance * (1 + ef(PRE[A.k] + '_alc'));
  if (!A.edit) box(A.x, A.y, 10, A.def.cor);
  coneFx(A.x, A.y, alc, A.dir, A.cone, '#ffffff');
}
function txt(s, x, y, c, al) { ctx.textAlign = al || 'left'; ctx.fillStyle = '#10161e'; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(s, x + dx, y + dy); ctx.fillStyle = c; ctx.fillText(s, x, y); ctx.textAlign = 'left'; }
function drawHud() {
  const X = 240, W = 480, hpMax = CFG.baseHp + ef('vida'), n = MAPA.ondas.length, prog = Math.min(1, S.run / RUN_FRAMES);
  const on = Math.min(n, Math.floor(S.run / (RUN_FRAMES / n)) + 1), seg = RUN_FRAMES / n, restoSeg = Math.ceil((seg * on - S.run) / 60);
  ctx.font = 'bold 14px monospace';
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
  for (const t of S.tow) {
    box(t.x, t.y, 16, t.def.cor2); box(t.x, t.y, 10, t.def.cor);
    for (let i = 0; i < t.lvl; i++) box(t.x - 6 + i * 6 + 2, t.y + 11, 2, '#ffd84c');
    const ma = t.dir - t.cone / 2 + t.sw * t.cone; box(t.x + Math.cos(ma) * 10, t.y + Math.sin(ma) * 10, 4, '#ffffff');
  }
  for (const g of S.gob) {
    const s = g.r * 2, c = g.flash > 0 ? '#ffffff' : g.slow > 0 ? '#6fd6ff' : g.d.cor;
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
  else if (over) coneFx(over.x, over.y, tStat(over).alc, over.dir, over.cone, '#ffffff');
  else { const d = TOWERS[S.sel]; ring(S.mx, S.my, d.alcance * (1 + ef(PRE[S.sel] + '_alc')), canPlace(S.mx, S.my) && !cheio(S.sel) ? '#ffffff' : '#ff4040'); box(S.mx, S.my, 10, d.cor); }
  // HUD
  drawHud();
  if (S.aim) txt(`Mire com o mouse · roda: cone ${Math.round(S.aim.cone * 180 / Math.PI)}° · clique: confirmar · direito/Esc: cancelar`, CFG.W / 2, CFG.H - 28, '#ffffff', 'center');
  if (S.over) { ctx.fillStyle = '#000'; ctx.fillRect(280, 250, 400, 90); ctx.fillStyle = S.won ? '#6fd66f' : '#ff4040'; ctx.font = 'bold 28px monospace'; ctx.fillText(S.won ? 'VITÓRIA!' : 'FIM DE JOGO', 380, 292); ctx.fillStyle = '#fff'; ctx.font = '14px monospace'; ctx.fillText(`Castelo ${S.hp} · +${S.ganho} moedas · clique ou R`, 310, 320); }
}

// ---------- entrada ----------
function canPlace(x, y) {
  return y > 72 && nearPath(x, y).d > MAPA.larg / 2 + 12 && baseDist(x, y) > CFG.baseR + 24 && !S.tow.some(t => Math.hypot(t.x - x, t.y - y) < 20);
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
  if (t) { S.aim = { x: t.x, y: t.y, def: t.def, k: t.k, dir: t.dir, cone: t.cone, edit: t }; return; }
  const def = TOWERS[S.sel];
  if (!cheio(S.sel) && livre(S.sel) && canPlace(x, y)) { const n = nearPath(x, y); S.aim = { x: q(x), y: q(y), def, k: S.sel, dir: Math.atan2(n.y - y, n.x - x), cone: rad(def.cone), edit: null }; }
});
addEventListener('keydown', e => {
  if (!metaEl.hidden) return;
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
const SEA = document.createElement('canvas'); SEA.width = CFG.W; SEA.height = CFG.H;
(function () {
  const b = SEA.getContext('2d'); b.fillStyle = '#0f3552'; b.fillRect(0, 0, CFG.W, CFG.H); b.fillStyle = '#174a6e';
  for (let i = 0; i < 700; i++) b.fillRect(q((i * 97) % CFG.W), q((i * 53 + (i * i) % 211) % CFG.H), 6 + (i % 3) * 2, 2);
})();
let TC, treeHover = null;
const aberto = id => { const p = TREE[id].pai; return !p || !!ROOTS[p] || pk(p) > 0; };
const ponto = k => ROOTS[k] || TREE[k];
function buyPerk(id) {
  const p = PERKS[id], l = pk(id), c = custoPerk(p, l);
  if (!aberto(id) || l >= p.mx || META.moedas < c) return;
  META.moedas -= c; META.lv[id] = l + 1; salvarMeta();
}
function tline(t, x0, y0, x1, y1, c) {
  t.fillStyle = c; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2;
  for (let i = 0; i <= n; i++) t.fillRect(q(x0 + (x1 - x0) * i / n), q(y0 + (y1 - y0) * i / n), 2, 2);
}
function ttx(t, s, x, y, c, al, f) {
  t.font = f || 'bold 10px monospace'; t.textAlign = al || 'center'; t.fillStyle = '#08101a';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) t.fillText(s, x + dx, y + dy);
  t.fillStyle = c; t.fillText(s, x, y);
}
function drawTree() {
  const t = TC.getContext('2d'), nb = (x, y, s, c) => { t.fillStyle = c; t.fillRect(q(x - s / 2), q(y - s / 2), s, s); };
  t.drawImage(SEA, 0, 0);
  for (const k in ROOTS) { const r = ROOTS[k]; if (r.pai) tline(t, ROOTS[r.pai].x, ROOTS[r.pai].y, r.x, r.y, '#8acc4a'); }
  for (const id in TREE) { const n = TREE[id], p = ponto(n.pai); tline(t, p.x, p.y, n.x, n.y, pk(id) > 0 ? '#8acc4a' : aberto(id) ? '#4a9a3a' : '#1c3a56'); }
  for (const k in ROOTS) { const r = ROOTS[k]; nb(r.x, r.y, 48, '#6a9a4a'); nb(r.x, r.y, 40, '#2a4220'); ttx(t, r.ic, r.x, r.y + 4, '#ffffff', 'center', 'bold 13px monospace'); ttx(t, r.nome, r.x, r.y + 40, '#ffffff'); }
  for (const id in TREE) {
    const n = TREE[id], p = PERKS[id], l = pk(id), ab = aberto(id), max = l >= p.mx, c = custoPerk(p, l), ok = ab && !max && META.moedas >= c, vis = ab || l > 0;
    nb(n.x, n.y, 48, id === treeHover ? '#ffffff' : l > 0 ? '#ffd84c' : ab ? (ok ? '#6fd66f' : '#8a6a3c') : '#0a1420');
    nb(n.x, n.y, 40, vis ? '#2a2018' : '#08101a');
    if (!vis) continue;
    ttx(t, n.ic, n.x, n.y + 5, n.cor, 'center', 'bold 13px monospace');
    const x0 = q(n.x - p.mx * 3);
    for (let i = 0; i < p.mx; i++) { t.fillStyle = l > i ? '#ffd84c' : '#10161e'; t.fillRect(x0 + i * 6, n.y + 28, 4, 4); }
    ttx(t, p.n.toUpperCase(), n.x, n.y + 46, '#ffffff');
    if (max) ttx(t, 'MÁX', n.x + 26, n.y - 26, '#ffd84c', 'left');
    else if (ab) { nb(n.x + 30, n.y - 29, 6, '#ffffff'); ttx(t, String(c), n.x + 36, n.y - 26, ok ? '#6fd66f' : '#ff6060', 'left'); }
  }
  // moedas
  t.fillStyle = '#1c2a44'; t.fillRect(340, 10, 280, 36); t.fillStyle = '#10161e'; t.fillRect(344, 14, 272, 28);
  nb(366, 28, 12, '#b88a10'); nb(366, 28, 8, '#ffd84c');
  ttx(t, `MOEDAS ${META.moedas}`, 384, 34, '#ffd84c', 'left', 'bold 16px monospace');
  if (S.ganho) ttx(t, `+${S.ganho}`, 600, 34, '#6fd66f', 'right', 'bold 14px monospace');
  // dica do nó
  if (treeHover) {
    const p = PERKS[treeHover], l = pk(treeHover);
    t.fillStyle = '#1c2a44'; t.fillRect(16, 520, 420, 64); t.fillStyle = '#10161e'; t.fillRect(20, 524, 412, 56);
    ttx(t, `${p.n} · Nv ${l}/${p.mx}`, 30, 544, '#ffffff', 'left', 'bold 14px monospace');
    ttx(t, p.d, 30, 562, '#cccccc', 'left', '12px monospace');
    ttx(t, aberto(treeHover) ? (l >= p.mx ? 'Nível máximo' : `Custo: ${custoPerk(p, l)} moedas`) : `Bloqueado: requer ${PERKS[TREE[treeHover].pai].n}`, 30, 576, aberto(treeHover) ? '#ffd84c' : '#ff6060', 'left', '12px monospace');
  }
}
function buildMeta() {
  metaEl.innerHTML = '<canvas id="tree"></canvas><button id="fechar">Jogar</button><button id="resetar">Resetar árvore e moedas</button>';
  TC = metaEl.querySelector('#tree'); TC.width = CFG.W; TC.height = CFG.H; treeHover = null;
  const at = e => {
    const r = TC.getBoundingClientRect(), x = (e.clientX - r.left) * CFG.W / r.width, y = (e.clientY - r.top) * CFG.H / r.height;
    for (const id in TREE) if (Math.abs(x - TREE[id].x) <= 24 && Math.abs(y - TREE[id].y) <= 24) return id;
    return null;
  };
  TC.onmousemove = e => { const h = at(e); if (h !== treeHover) { treeHover = h; drawTree(); } };
  TC.onclick = e => { const h = at(e); if (h) { buyPerk(h); drawTree(); } };
  metaEl.querySelector('#fechar').onclick = () => { metaEl.hidden = true; reset(); };
  metaEl.querySelector('#resetar').onclick = () => { if (!confirm('Resetar toda a árvore e zerar as moedas? Isso não pode ser desfeito.')) return; META.moedas = 0; META.lv = {}; salvarMeta(); S.ganho = 0; drawTree(); };
  drawTree();
}
btnMeta.onclick = () => { if (!btnMeta.disabled) { buildMeta(); metaEl.hidden = false; } btnMeta.blur(); };
const btnStart = document.getElementById('start');
btnStart.onclick = () => { if (!S.ativa) startWave(); btnStart.blur(); };
reset();
(function loop() {
  const txt = S.ativa ? 'Horda em andamento...' : S.over ? (S.won ? 'Vitória!' : 'Derrota') : '▶ Chamar a horda';
  if (btnStart.textContent !== txt) btnStart.textContent = txt;
  btnStart.disabled = !!S.wave || S.over;
  btnMeta.hidden = !S.over;
  if (!S.pause && !S.over) for (let i = 0; i < S.speed; i++) update();
  draw(); requestAnimationFrame(loop);
})();

// Goblin Horde TD - lógica principal (dados em data.js)
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
cv.width = CFG.W; cv.height = CFG.H;
const q = v => Math.floor(v / 2) * 2;
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
const custoTorre = def => Math.ceil(def.custo * (1 - ef('feira')));

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
  S = { gold: CFG.startGold + ef('ouro'), hp: CFG.baseHp + ef('vida'), kills: 0, ganho: 0, wave: 0, gob: [], tow: [], proj: [], part: [], groups: [],
        sel: 'arqueiro', over: false, won: false, pause: false, speed: 1, t: 0, mx: 0, my: 0, ativa: false, prox: 300 };
  S.plano = planoHorda(); S.total = S.plano.reduce((n, g) => n + g.list.length, 0);
  buildShop();
}

function buildShop() {
  const el = document.getElementById('shop'); el.innerHTML = '';
  Object.keys(TOWERS).forEach((k, i) => {
    const b = document.createElement('button');
    b.textContent = `${i + 1} ${TOWERS[k].nome} $${custoTorre(TOWERS[k])}`;
    b.className = k === S.sel ? 'sel' : '';
    b.onclick = () => { S.sel = k; buildShop(); };
    el.appendChild(b);
  });
}

// ---------- ondas: multidões em grupos ----------
const restantes = () => S.wave ? S.gob.length + S.groups.reduce((n, g) => n + g.list.length, 0) : S.total;
// plano da horda: lista de grupos {delay (quadros), u (progresso 0-1), list}. Tudo vem de MAPA.horda e dif(MAPA.nivel)
function planoHorda() {
  const h = MAPA.horda, D = dif(MAPA.nivel), fim = h.dur * 60, gr = [];
  for (let t = 0; t < fim;) {
    const u = t / fim, n = Math.round((h.tamIni + (h.tamFim - h.tamIni) * u) * D.qtd), w = {}, list = []; let tot = 0;
    for (const k in GOBLINS) { w[k] = h.peso0[k] + (h.peso1[k] - h.peso0[k]) * u; tot += w[k]; }
    for (let i = 0; i < n; i++) { let r = Math.random() * tot, tipo = 'comum'; for (const k in w) if ((r -= w[k]) < 0) { tipo = k; break; } list.push(tipo); }
    gr.push({ delay: t, u, list });
    t += h.gapIni + (h.gapFim - h.gapIni) * u;
  }
  return gr;
}
function startWave() {
  if (S.over || S.wave) return;
  S.wave = 1; S.ativa = true;
  S.groups = S.plano;
}

function spawnGroup(gr) {
  gr.list.forEach(tipo => {
    const d = GOBLINS[tipo], H = MAPA.horda, D = dif(MAPA.nivel), hp = Math.round(d.hp * D.hp * (1 + (H.hpFim - 1) * gr.u));
    S.gob.push({ tipo, d, x: rnd(-50, -6), y: MAPA.pontos[0][1] + rnd(-MAPA.larg / 2 + 8, MAPA.larg / 2 - 8),
      vx: 0, vy: 0, vm: D.vel * (1 + (H.velFim - 1) * gr.u), wp: 1, prog: 0, hp, max: hp, r: d.r, slow: 0, ph: rnd(0, 6.28), flash: 0, dead: false });
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

function hit(g, dmg) { g.hp -= dmg; g.flash = 3; if (g.hp <= 0 && !g.dead) { g.dead = true; S.gold += g.d.ouro * (1 + ef('renda')); S.kills++; burst(g.x, g.y, 6, g.d.cor, g.d.cor2); } }

// ---------- torres ----------
const tStat = t => ({ dano: t.def.dano * (1 + 0.5 * (t.lvl - 1)) * (1 + ef('dano')), alc: t.def.alcance * (1 + 0.1 * (t.lvl - 1)) * (1 + ef('alc')) });
const baseDist = (x, y) => Math.hypot(CFG.baseX - x, CFG.baseY - y);

function fire(t) {
  const st = tStat(t), def = t.def; let best = null, bd = 1e9; const inRange = [];
  for (const g of S.gob) {
    if (g.dead || Math.hypot(g.x - t.x, g.y - t.y) > st.alc) continue;
    inRange.push(g);
    if (-g.prog < bd) { bd = -g.prog; best = g; }
  }
  if (!best) return;
  t.cd = def.cd * (1 - ef('cad'));
  if (def.tipo === 'pulso') {
    inRange.forEach(g => { g.slow = def.slowT; hit(g, st.dano); });
    ringFx(t.x, t.y, st.alc * 0.5, '#ffffff', def.cor2); ringFx(t.x, t.y, st.alc, def.cor, def.cor2);
  } else S.proj.push({ x: t.x, y: t.y, tx: best.x, ty: best.y, tg: best, def, dano: st.dano });
}

function updateTowers() {
  for (const t of S.tow) { if (t.cd > 0) t.cd--; else fire(t); }
  for (const p of S.proj) {
    if (p.tg && !p.tg.dead) { p.tx = p.tg.x; p.ty = p.tg.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
    if (d <= p.def.vel) {
      p.done = true;
      if (p.def.tipo === 'flecha') { if (p.tg && !p.tg.dead) hit(p.tg, p.dano); }
      else {
        for (const g of S.gob) if (!g.dead && Math.hypot(g.x - p.tx, g.y - p.ty) < p.def.raio) hit(g, p.dano);
        burst(p.tx, p.ty, 14, '#ffffff', '#ffb030', 2.4); ringFx(p.tx, p.ty, p.def.raio * 0.6, '#ffb030', '#7a3a10');
      }
    } else { p.x += dx / d * p.def.vel; p.y += dy / d * p.def.vel; }
  }
  S.proj = S.proj.filter(p => !p.done);
}

// ---------- goblins: multidão com separação por grade ----------
function updateGoblins() {
  const grid = new Array(COLS * ROWS);
  for (const g of S.gob) { const i = ((g.x / CELL) | 0) + 1 + (((g.y / CELL) | 0)) * COLS; (grid[i] = grid[i] || []).push(g); g.ci = i; }
  for (const g of S.gob) {
    if (g.dead) continue;
    const T = MAPA.pontos[g.wp], dx = T[0] - g.x, dy = T[1] - g.y, d = Math.hypot(dx, dy) || 1;
    if (d < 30 && g.wp < MAPA.pontos.length - 1) g.wp++;
    g.prog = g.wp * 1e4 - d;
    if (baseDist(g.x, g.y) < CFG.baseR) { S.hp -= g.d.dano; g.dead = true; burst(g.x, g.y, 8, '#ff4040', '#802020'); if (S.hp <= 0) { S.hp = 0; S.over = true; } continue; }
    const sp = g.d.vel * g.vm * (g.slow > 0 ? TOWERS.gelo.slow : 1); if (g.slow > 0) g.slow--;
    let ax = dx / d * sp, ay = dy / d * sp;
    ax += Math.cos(S.t * 0.04 + g.ph) * 0.12; ay += Math.sin(S.t * 0.05 + g.ph) * 0.2;
    let px = 0, py = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const c = grid[g.ci + ox + oy * COLS]; if (!c) continue;
      for (const o of c) {
        if (o === g || o.dead) continue;
        const ex = g.x - o.x, ey = g.y - o.y, m = g.r + o.r + 1, dd = Math.hypot(ex, ey);
        if (dd < m && dd > 0.01) { const f = (m - dd) / m * 1.3 * (o.r / g.r); px += ex / dd * f; py += ey / dd * f; }
      }
    }
    for (const t of S.tow) { const ex = g.x - t.x, ey = g.y - t.y, dd = Math.hypot(ex, ey); if (dd < 18 && dd > 0.01) { px += ex / dd * 1.2; py += ey / dd * 1.2; } }
    g.vx = g.vx * 0.6 + (ax + px) * 0.4; g.vy = g.vy * 0.6 + (ay + py) * 0.4;
    g.x += g.vx; g.y += g.vy;
    const n = nearPath(g.x, g.y), lim = MAPA.larg / 2 - g.r - 1;
    if (n.d > lim) { const k = 1 - lim / n.d; g.x += (n.x - g.x) * k; g.y += (n.y - g.y) * k; }
    if (g.flash > 0) g.flash--;
  }
  S.gob = S.gob.filter(g => !g.dead);
}

function pagar() { S.pago = true; S.ganho = moedasGanhas(S.kills, S.won); META.moedas += S.ganho; salvarMeta(); }
function update() {
  S.t++;
  for (const gr of S.groups) { gr.delay--; if (gr.delay <= 0) { spawnGroup(gr); gr.done = true; } }
  S.groups = S.groups.filter(g => !g.done);
  updateGoblins(); updateTowers();
  for (const p of S.part) { p.x += p.vx; p.y += p.vy; p.life--; }
  S.part = S.part.filter(p => p.life > 0);
  if (S.ativa && !S.groups.length && !S.gob.length) { S.ativa = false; S.won = true; S.over = true; }
  if (S.over && !S.pago) pagar();
}

// ---------- desenho (cores 100% sólidas, grade de 2px) ----------
function ring(x, y, r, c) { ctx.fillStyle = c; for (let a = 0; a < 6.28; a += 8 / r) ctx.fillRect(q(x + Math.cos(a) * r), q(y + Math.sin(a) * r), 2, 2); }
function box(x, y, s, c) { ctx.fillStyle = c; ctx.fillRect(q(x - s / 2), q(y - s / 2), s, s); }

function draw() {
  ctx.drawImage(bg, 0, 0);
  const bx = CFG.baseX, by = CFG.baseY;
  box(bx, by, 64, '#4a4a55'); box(bx, by, 52, '#8a8a95'); box(bx, by, 28, '#5a4630'); box(bx, by - 40, 6, '#ff4040');
  for (const t of S.tow) {
    box(t.x, t.y, 16, t.def.cor2); box(t.x, t.y, 10, t.def.cor);
    for (let i = 0; i < t.lvl; i++) box(t.x - 6 + i * 6 + 2, t.y + 11, 2, '#ffd84c');
  }
  for (const g of S.gob) {
    const s = g.r * 2, c = g.flash > 0 ? '#ffffff' : g.slow > 0 ? '#6fd6ff' : g.d.cor;
    box(g.x, g.y, s, g.d.cor2); box(g.x, g.y, s - 2, c); box(g.x + 2, g.y - 2, 2, '#ff3030');
    if (g.hp < g.max) { const w = q(s * g.hp / g.max); ctx.fillStyle = '#400'; ctx.fillRect(q(g.x - g.r), q(g.y - g.r - 4), s, 2); ctx.fillStyle = '#4f4'; ctx.fillRect(q(g.x - g.r), q(g.y - g.r - 4), w, 2); }
  }
  for (const p of S.proj) { box(p.x, p.y, p.def.tipo === 'bomba' ? 6 : 4, p.def.cor2); box(p.x, p.y, p.def.tipo === 'bomba' ? 4 : 2, '#ffffff'); }
  for (const p of S.part) {
    if (p.life % 3 === 0 && p.c1 === '#ffffff') continue; // cintilar
    box(p.x, p.y, p.life > p.max / 2 ? 4 : 2, p.life < p.max * 0.3 ? p.c2 : p.c1);
  }
  // fantasma da torre / alcance
  const over = S.tow.find(t => Math.hypot(t.x - S.mx, t.y - S.my) < 12);
  if (over) ring(over.x, over.y, tStat(over).alc, '#ffffff');
  else { const d = TOWERS[S.sel]; ring(S.mx, S.my, d.alcance, canPlace(S.mx, S.my) ? '#ffffff' : '#ff4040'); box(S.mx, S.my, 10, d.cor); }
  // HUD
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CFG.W, 24); ctx.fillStyle = '#ffd84c'; ctx.font = 'bold 14px monospace';
  ctx.fillText(`OURO ${Math.floor(S.gold)}`, 8, 17); ctx.fillStyle = '#ff6060'; ctx.fillText(`VIDA ${S.hp}`, 130, 17);
  ctx.fillStyle = '#fff'; ctx.fillText(`INIMIGOS ${restantes()}`, 250, 17); ctx.fillText(`x${S.speed}${S.pause ? ' PAUSA' : ''}`, 390, 17);
  if (!S.wave) ctx.fillText('Monte a defesa e chame a horda (N / Enter)', 500, 17);
  if (S.over) { ctx.fillStyle = '#000'; ctx.fillRect(280, 250, 400, 90); ctx.fillStyle = S.won ? '#6fd66f' : '#ff4040'; ctx.font = 'bold 28px monospace'; ctx.fillText(S.won ? 'VITÓRIA!' : 'FIM DE JOGO', 380, 292); ctx.fillStyle = '#fff'; ctx.font = '14px monospace'; ctx.fillText(`Castelo ${S.hp} · +${S.ganho} moedas · clique ou R`, 310, 320); }
}

// ---------- entrada ----------
function canPlace(x, y) {
  return y > 30 && nearPath(x, y).d > MAPA.larg / 2 + 12 && baseDist(x, y) > CFG.baseR + 24 && !S.tow.some(t => Math.hypot(t.x - x, t.y - y) < 20);
}
function pos(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * CFG.W / r.width, (e.clientY - r.top) * CFG.H / r.height]; }
cv.addEventListener('mousemove', e => [S.mx, S.my] = pos(e));
cv.addEventListener('contextmenu', e => {
  e.preventDefault(); const [x, y] = pos(e), i = S.tow.findIndex(t => Math.hypot(t.x - x, t.y - y) < 12);
  if (i >= 0) { const t = S.tow[i]; S.gold += Math.floor(t.def.custo * 0.5 * t.lvl); S.tow.splice(i, 1); }
});
cv.addEventListener('click', e => {
  if (S.over) return reset();
  const [x, y] = pos(e), t = S.tow.find(t => Math.hypot(t.x - x, t.y - y) < 12);
  if (t) { const c = Math.ceil(custoUpgrade(t.def, t.lvl) * (1 - ef('feira'))); if (t.lvl < 3 && S.gold >= c) { S.gold -= c; t.lvl++; } return; }
  const def = TOWERS[S.sel];
  if (S.gold >= custoTorre(def) && canPlace(x, y)) { S.gold -= custoTorre(def); S.tow.push({ x: q(x), y: q(y), def, lvl: 1, cd: 0 }); }
});
addEventListener('keydown', e => {
  if (!metaEl.hidden) return;
  const k = e.key.toLowerCase(), keys = Object.keys(TOWERS);
  if (k >= '1' && k <= String(keys.length)) { S.sel = keys[+k - 1]; buildShop(); }
  else if ((k === 'n' || k === 'enter') && !S.ativa) startWave();
  else if (k === 'f') S.speed = S.speed === 1 ? 2 : S.speed === 2 ? 3 : 1;
  else if (k === ' ') { S.pause = !S.pause; e.preventDefault(); }
  else if (k === 'r') reset();
});

// ---------- melhorias permanentes (painel) ----------
const metaEl = document.getElementById('meta'), btnMeta = document.getElementById('melhorias');
function buildMeta() {
  metaEl.innerHTML = `<h2>Melhorias permanentes</h2><p>Moedas: ${META.moedas}</p><div id="perks"></div><button id="fechar">Jogar</button>`;
  const box = metaEl.querySelector('#perks');
  for (const id in PERKS) {
    const p = PERKS[id], l = pk(id), max = l >= p.mx, c = custoPerk(p, l), b = document.createElement('button');
    b.innerHTML = `<b>${p.n}</b> ${p.d}<br>Nv ${l}/${p.mx} · ${max ? 'MÁX' : c + ' moedas'}`;
    b.disabled = max || META.moedas < c;
    b.onclick = () => { META.moedas -= c; META.lv[id] = l + 1; salvarMeta(); buildMeta(); };
    box.appendChild(b);
  }
  metaEl.querySelector('#fechar').onclick = () => { metaEl.hidden = true; reset(); };
}
btnMeta.onclick = () => { if (!btnMeta.disabled) { buildMeta(); metaEl.hidden = false; } btnMeta.blur(); };
const btnStart = document.getElementById('start');
btnStart.onclick = () => { if (!S.ativa) startWave(); btnStart.blur(); };
reset();
(function loop() {
  const txt = S.ativa ? 'Horda em andamento...' : S.over ? (S.won ? 'Vitória!' : 'Derrota') : '▶ Chamar a horda';
  if (btnStart.textContent !== txt) btnStart.textContent = txt;
  btnStart.disabled = !!S.wave || S.over;
  btnMeta.disabled = !(S.over || (!S.wave && !S.tow.length));
  if (!S.pause && !S.over) for (let i = 0; i < S.speed; i++) update();
  draw(); requestAnimationFrame(loop);
})();

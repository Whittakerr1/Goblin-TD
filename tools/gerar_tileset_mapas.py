#!/usr/bin/env python3
"""Gera TODO o cenário que faltava (sem torres e goblins). Uso: python3 tools/gerar_tileset_mapas.py   (só biblioteca padrão)
Reaproveita as funções de gerar_tileset_grama.py e gerar_tileset_caminho.py. Saídas:
  assets/tilesets/tileset_grama_<mapa>.png      mapas 4-6 (8x2 tiles 32x32)
  assets/tilesets/tileset_caminho_<mapa>.png    mapas 4-6 (8x2 tiles 32x32)
  assets/tilesets/tileset_obstaculo_<mapa>.png  mapas 1-6 (4 sprites 32x32 transparentes: moitas/rochas/obsidiana)
  assets/tilesets/tileset_muro_<mapa>.png       mapas 4-6 (4 tiles 32x32 de tijolo, sem emenda)
  assets/tilesets/tileset_perigo_<mapa>.png     mapas 3 e 6 (4 tiles 32x32 de líquido: veneno / lava)
  assets/sprites/cenario/castelo_<mapa>.png     mapas 1-6 (64x80, transparente, bandeira no topo)"""
import os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gerar_tileset_grama as G
import gerar_tileset_caminho as C

T = 32
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
TILES, CENARIO = os.path.join(RAIZ, 'tilesets'), os.path.join(RAIZ, 'sprites', 'cenario')
sc, mix, plain, rock, patch = G.sc, G.mix, G.plain, G.rock, G.patch


# ---------- decorações de grama (assinatura da grama: t, x, y, P, r) ----------
def crack(t, x, y, P, r):
    for i in range(r.choice((6, 8, 10))): t.set(x + i, y + (i // 3) % 2 + (1 if i % 5 == 4 else 0), P[0])

def gravel(t, x, y, P, r):
    for dx, dy in ((0, 0), (3, 1), (-2, 2), (2, -2), (-3, -1)): t.set(x + dx, y + dy, P[4]); t.set(x + dx, y + dy + 1, P[0])

def speck(t, x, y, P, r): t.set(x, y, P[4] if r.random() < .5 else P[0])

def rubble(t, x, y, P, r):
    for dx, dy, w in ((-3, 0, 3), (1, -1, 3), (-1, 2, 2), (3, 2, 2)):
        for i in range(w): t.set(x + dx + i, y + dy, '#a89c80'); t.set(x + dx + i, y + dy + 1, '#6e6450')
        t.set(x + dx, y + dy, '#d0c4a4')

def column(t, x, y, P, r):
    for i in range(12): t.set(x + i, y, '#c8bc9c'); t.set(x + i, y + 1, '#a89c80'); t.set(x + i, y + 2, '#7a7058'); t.set(x + i, y + 3, P[0])
    for dy in range(3): t.set(x, y + dy, '#6e6450')

def ember(t, x, y, P, r):
    c = r.choice(('#e05020', '#f08030', '#ffc040'))
    t.set(x, y, c); t.set(x + 1, y, '#a03010'); t.set(x, y + 1, '#5a1810')

def lavacrack(t, x, y, P, r):
    for i in range(r.choice((6, 8, 10))):
        yy = y + (i // 3) % 2 + (1 if i % 5 == 4 else 0)
        t.set(x + i, yy, '#5a1810')
        if i % 2 == 0: t.set(x + i, yy + 1, '#e05020')

def shard(t, x, y, P, r):
    for i in range(7):
        for dx in range(1 if i > 3 else 2): t.set(x + dx, y - i, '#2a1c3c' if dx == 0 else '#4a3470')
    t.set(x, y - 6, '#8a6ab8')
    for dx in range(-1, 4): t.set(x + dx, y + 1, P[0])


PEDRA = ('#34343c', '#6a6a74', '#a0a0aa')
GRAMA = {
    'desfiladeiro': dict(P=['#34343c', '#46464e', '#5a5a62', '#6a6a74', '#8a8a96'],
        row0=[plain, plain, sc(3, gravel), sc(2, crack), sc(8, speck), plain, plain, sc(4, gravel)],
        row1=[sc(3, crack), sc(5, gravel), sc(1, rock(PEDRA)), sc(2, rock(PEDRA)), sc(1, patch('#2a2a30', 5)), mix(sc(1, rock(PEDRA)), sc(3, gravel)), sc(2, crack), sc(6, gravel)]),
    'ruinas': dict(P=['#5a4c2c', '#766838', '#8a7a4a', '#9a8a56', '#b8a874'],
        row0=[plain, plain, sc(3, speck), sc(2, crack), sc(8, speck), plain, plain, sc(3, G.tf(4))],
        row1=[sc(4, G.tf(4)), sc(2, rubble), sc(1, column), sc(1, rock(('#6e6450', '#a89c80', '#d8ccac'))), sc(3, crack), mix(sc(1, rubble), sc(2, G.tf(4))), sc(1, patch('#5a4c2c', 5)), sc(6, G.tf(5))]),
    'covil': dict(P=['#1c0e16', '#2a1620', '#3a2030', '#4a2a3c', '#6a3c52'],
        row0=[plain, plain, sc(3, speck), sc(1, lavacrack), sc(8, speck), plain, plain, sc(2, ember)],
        row1=[sc(4, ember), sc(2, lavacrack), sc(3, shard), sc(1, rock(('#1a0c14', '#3a2a3a', '#6a5070'))), sc(1, patch('#1c0e16', 5)), mix(sc(2, ember), sc(1, lavacrack)), sc(2, shard), sc(6, ember)]),
}


# ---------- decorações do caminho (assinatura do caminho: t, r, Cc; tile 32x32 centrado em 16,15) ----------
def d_rubble(t, r, Cc):
    for dx, dy, w in ((-6, -2, 4), (0, -4, 3), (3, 1, 4), (-4, 3, 3)):
        for i in range(w): t.set(16 + dx + i, 15 + dy, '#c8bc9c'); t.set(16 + dx + i, 16 + dy, '#8a7e64'); t.set(16 + dx + i, 17 + dy, Cc['P'][0])
        t.set(16 + dx, 15 + dy, '#e8dcc0')

def d_ember(t, r, Cc):
    for dx, dy, c in ((-4, -2, '#e05020'), (1, -4, '#ffc040'), (5, 1, '#f08030'), (-1, 3, '#ffc040'), (-6, 2, '#e05020'), (3, -1, '#a03010')):
        t.set(16 + dx, 15 + dy, c); t.set(17 + dx, 15 + dy, '#a03010'); t.set(16 + dx, 16 + dy, '#5a1810')

def d_lavacrack(t, r, Cc):
    for i in range(14):
        x, y = 9 + i, 15 + (i // 3) % 2 + (1 if i % 5 == 4 else 0)
        t.set(x, y, '#5a1810'); t.set(x, y + 1, '#e05020' if i % 2 == 0 else '#a03010')

def d_shard(t, r, Cc):
    for i in range(8):
        for dx in range(1 if i > 4 else 2): t.set(14 + dx, 21 - i, '#2a1c3c' if dx == 0 else '#4a3470')
    t.set(14, 14, '#8a6ab8')
    for dx in range(-1, 4): t.set(14 + dx, 22, Cc['P'][0])

def d_slab(t, r, Cc):
    sh, body, hi = Cc['st']
    for dy in range(8):
        for dx in range(14): t.set(9 + dx, 12 + dy, Cc['P'][0] if dx in (0, 13) or dy in (0, 7) else body)
    for dx in range(1, 13): t.set(9 + dx, 13, hi); t.set(9 + dx, 18, sh)
    t.set(14, 15, sh); t.set(15, 16, sh); t.set(16, 16, sh)


CAMINHO = {
    'desfiladeiro': dict(P=['#34343c', '#585860', '#78787e', '#8a8a92', '#a8a8b2'], st=['#34343c', '#6a6a74', '#a0a0aa'], G=['#5a6a48', '#7a8a5a', '#a0b078'], leaf=['#6a6a74', '#8a8a94'], wa=['#2e2e38', '#4a6a80', '#8ab0c8']),
    'ruinas': dict(P=['#5a4a30', '#8a7448', '#b8a070', '#c8b484', '#dcc898'], st=['#6e6450', '#a89c80', '#d8ccac'], G=['#7a7030', '#a09040', '#c8b858'], leaf=['#a85a1c', '#c8a040'], wa=['#4a3a28', '#6a8a98', '#9ac4d0']),
    'covil': dict(P=['#1c0e16', '#4a2222', '#6a3030', '#7e4040', '#9a5a5a'], st=['#1a0c14', '#3a2a3a', '#6a5070'], G=['#4a2a3a', '#6a3a4a', '#8a5a6a'], leaf=['#5a1810', '#a03010'], wa=['#3a0c08', '#c04018', '#ffa030']),
}
ROW1 = {
    'desfiladeiro': [C.d_rock, C.d_pebbles, d_slab, d_rubble, C.d_bone, C.d_skull, C.d_pebbles, C.d_rock],
    'ruinas': [d_rubble, d_slab, C.d_pebbles, C.d_bone, C.d_skull, C.d_tuft, C.d_rock, C.d_stick],
    'covil': [d_ember, d_lavacrack, d_shard, C.d_bone, C.d_skull, C.d_rock, d_ember, d_lavacrack],
}


# ---------- obstáculos (bloq): 4 sprites transparentes por mapa ----------
OB = {
    'campina': (('#183018', '#2a5a24', '#4a8a3a'), 'arbusto'), 'floresta': (('#102a10', '#1e4a1e', '#3a7a34'), 'arbusto'),
    'pantano': (('#1a2a18', '#2e4a28', '#58783c'), 'arbusto'), 'desfiladeiro': (('#2a2a30', '#4a4a54', '#7a7a88'), 'pedra'),
    'ruinas': (('#4a4030', '#7a6c50', '#b0a07c'), 'pedra'), 'covil': (('#1a0c14', '#3a1c2a', '#6a3a5a'), 'obsidiana'),
}

def spr_blob(rng, cols, pedra):
    dk, md, hi = cols; t = C.Tile(False); cx, cy = 16, 17
    lobes = [(cx, cy, 7)] + [(cx + rng.randint(-6, 6), cy + rng.randint(-4, 4), rng.randint(5, 7)) for _ in range(4)]
    cells = set()
    for lx, ly, lr in lobes:
        for y in range(ly - lr, ly + lr + 1):
            for x in range(lx - lr, lx + lr + 1):
                dx, dy = x - lx, y - ly
                if (abs(dx) + abs(dy) <= lr * 1.3) if pedra else (dx * dx + dy * dy <= lr * lr): cells.add((x, y))
    for x, y in sorted(cells):
        edge = any((x + dx, y + dy) not in cells for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        v, b = (x - cx) * 0.5 + (y - cy), C.BAYER[y % 4][x % 4]
        t.set(x, y, dk if edge or (v > 5 and b > 5) else hi if (v < -4 and b > 7) else md)
    pts = sorted(cells)
    for _ in range(3 if pedra else 6):
        x, y = rng.choice(pts)
        if pedra:
            for i in range(4): t.set(x + i, y + i // 2, dk)
        else: t.set(x, y, hi)
    return t

def spr_shards(rng, cols):
    dk, md, hi = cols; t = C.Tile(False)
    for bx, h in ((9, 15), (15, 22), (21, 17), (12, 11), (18, 13)):
        bx += rng.randint(-1, 1); h += rng.randint(-2, 2)
        for i in range(h):
            half = max(1, round(3 * (1 - i / h)))
            for dx in range(-half, half + 1): t.set(bx + dx, 26 - i, dk if abs(dx) == half and half > 1 else hi if dx < 0 else md)
    for dx in range(-9, 10): t.set(16 + dx, 27, dk)
    return t


# ---------- muros, líquidos de perigo e castelo ----------
MURO = {'desfiladeiro': ('#34343c', ('#6e6e78', '#62626c'), '#9a9aa6'), 'ruinas': ('#5a4a30', ('#a89060', '#9a8454'), '#d0b888'), 'covil': ('#1a0c14', ('#4a2a3c', '#3e2234'), '#7a4a60')}

def muro_tile(rng, W):
    mort, (b1, b2), luz = W; t = C.Tile(True)
    for ry in range(4):
        off = 8 if ry % 2 else 0
        for bx in range(2):
            x0, col = bx * 16 + off, rng.choice((b1, b2))
            for y in range(ry * 8, ry * 8 + 8):
                for x in range(x0, x0 + 16):
                    t.set(x, y, mort if y % 8 == 7 or x == x0 + 15 or rng.random() < .04 else luz if y % 8 == 0 else col)
    return t

LIQ = {'pantano': ['#2a1c38', '#3a2a4a', '#5a3a78', '#8a5aaa', '#c090e0'], 'covil': ['#3a0c08', '#5a1810', '#a02c14', '#e05020', '#ffc040']}

CASTELO = {
    'campina': dict(st=('#585860', '#8a8a95', '#c0c0cc'), roof=('#7a1c14', '#c8402c', '#e8644c'), ct=('#5a4630', '#7e6238')),
    'floresta': dict(st=('#2e3a30', '#58685a', '#8aa08c'), roof=('#1e4a2a', '#2e7a3c', '#58a860'), ct=('#4a3a28', '#6a5238')),
    'pantano': dict(st=('#3a4036', '#686e5c', '#9aa088'), roof=('#4a2a6a', '#7a4aa0', '#a878d0'), ct=('#3a2e20', '#5a4a30')),
    'desfiladeiro': dict(st=('#34343c', '#6e6e78', '#9a9aa6'), roof=('#1c3a6a', '#2c5aa0', '#5a8ad0'), ct=('#34343c', '#58585f')),
    'ruinas': dict(st=('#6e6450', '#a89c80', '#d8ccac'), roof=('#a86a1c', '#d89a30', '#f0c860'), ct=('#5a4a30', '#8a7448')),
    'covil': dict(st=('#1a0c14', '#3a2a3a', '#6a5070'), roof=('#5a1810', '#a02c14', '#e05020'), ct=('#1c0e16', '#4a2222')),
}

class Cv:
    def __init__(s, w, h): s.w, s.h = w, h; s.p = [[C.CLEAR] * w for _ in range(h)]
    def set(s, x, y, c):
        if 0 <= x < s.w and 0 <= y < s.h: s.p[y][x] = C.hx(c) if isinstance(c, str) else c
    def rect(s, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w): s.set(xx, yy, c)

def castelo(S):
    """64x80: corpo 64x64 (y 16-79, centro do castelo = centro do corpo) + bandeira acima. No jogo: drawImage em (baseX-32, baseY-48)."""
    cv, OUT = Cv(64, 80), '#10161e'; sd, sm, sl = S['st']; rd, rm, rl = S['roof']; cd, cm = S['ct']
    cv.rect(0, 16, 64, 64, OUT); cv.rect(1, 17, 62, 62, sm)
    cv.rect(1, 17, 62, 2, sl); cv.rect(1, 17, 2, 62, sl); cv.rect(1, 77, 62, 2, sd); cv.rect(61, 17, 2, 62, sd)
    for i in range(16, 52, 8): cv.rect(i, 19, 4, 4, sd); cv.rect(i, 73, 4, 4, sd); cv.rect(3, 17 + i, 4, 4, sd); cv.rect(57, 17 + i, 4, 4, sd)
    cv.rect(10, 26, 44, 44, cd); cv.rect(11, 27, 42, 42, cm)
    for y in range(27, 69):
        for x in range(11, 53):
            if (x // 2 + y // 2) % 4 == 0: cv.set(x, y, cd)
    cv.rect(26, 68, 12, 12, OUT); cv.rect(28, 70, 8, 10, '#3a2410'); cv.rect(31, 70, 2, 10, '#5a3a1c'); cv.rect(28, 70, 8, 2, '#5a3a1c')
    cv.rect(20, 36, 24, 24, OUT); cv.rect(21, 37, 22, 22, rm); cv.rect(21, 37, 22, 3, rl); cv.rect(21, 37, 3, 22, rl)
    cv.rect(21, 56, 22, 3, rd); cv.rect(40, 37, 3, 22, rd); cv.rect(31, 37, 2, 22, rd); cv.rect(21, 47, 22, 2, rd)
    for cx, cy in ((0, 16), (50, 16), (0, 66), (50, 66)):
        cv.rect(cx, cy, 14, 14, OUT); cv.rect(cx + 1, cy + 1, 12, 12, sl); cv.rect(cx + 3, cy + 3, 8, 8, rm)
        cv.rect(cx + 3, cy + 3, 8, 2, rl); cv.rect(cx + 3, cy + 9, 8, 2, rd)
    cv.rect(31, 2, 2, 15, '#d0d0d8'); cv.rect(33, 3, 10, 6, '#e03030'); cv.rect(33, 3, 10, 2, '#ff6060'); cv.rect(41, 6, 2, 3, C.CLEAR)
    return cv


def faixa(tiles):
    img = [[] for _ in range(T)]
    for t in tiles:
        for y in range(T): img[y] += t.p[y]
    return img


if __name__ == '__main__':
    os.makedirs(TILES, exist_ok=True); os.makedirs(CENARIO, exist_ok=True)
    for n, cfg in GRAMA.items():
        G.ROW0 = cfg['row0']; G.gerar(n, cfg, TILES)
    for n, cfg in CAMINHO.items():
        C.ROW1 = ROW1[n]; C.gerar(n, cfg, TILES)
    for n, (cols, tipo) in OB.items():
        ts = [spr_shards(random.Random(f'ob-{n}-{k}'), cols) if tipo == 'obsidiana' else spr_blob(random.Random(f'ob-{n}-{k}'), cols, tipo == 'pedra') for k in range(4)]
        C.save_png(os.path.join(TILES, f'tileset_obstaculo_{n}.png'), faixa(ts))
    for n, W in MURO.items():
        C.save_png(os.path.join(TILES, f'tileset_muro_{n}.png'), faixa([muro_tile(random.Random(f'muro-{n}-{k}'), W) for k in range(4)]))
    for n, P in LIQ.items():
        C.save_png(os.path.join(TILES, f'tileset_perigo_{n}.png'), faixa([C.base(random.Random(f'liq-{n}-{k}'), [C.hx(c) for c in P]) for k in range(4)]))
    for n, S in CASTELO.items():
        C.save_png(os.path.join(CENARIO, f'castelo_{n}.png'), castelo(S).p)
    print('Cenário gerado em', os.path.normpath(RAIZ))

#!/usr/bin/env python3
"""Gera os tilesets do caminho dos goblins (32x32, pixel art) dos mapas 1-3 em assets/tilesets/.
Uso: python3 tools/gerar_tileset_caminho.py [--preview]   (só biblioteca padrão, sem dependências)
Cada sheet tem 8x2 tiles de 32x32 (256x64, PNG RGBA com alfa só 0 ou 255):
linha 0 = terra sem emenda (opaca, variações) · linha 1 = decorações com fundo transparente, desenhadas por cima."""
import os, random, struct, sys, zlib

T = 32
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
hx = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
CLEAR = (0, 0, 0, 0)


def save_png(path, img):
    h, w = len(img), len(img[0])
    raw = b''.join(b'\x00' + bytes(v for p in row for v in p) for row in img)
    ch = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw, 9)) + ch(b'IEND', b''))


class Tile:
    def __init__(s, wrap): s.wrap = wrap; s.p = [[CLEAR] * T for _ in range(T)]
    def set(s, x, y, c):   # wrap=True: coordenadas dão a volta (tile sem emenda); wrap=False: ignora o que sair do tile
        if not s.wrap and not (0 <= x < T and 0 <= y < T): return
        s.p[y % T][x % T] = hx(c) if isinstance(c, str) else c


def base(rng, P):
    """Terra base: ruído periódico + ruído fino + dithering ordenado (tom escuro / médio / claro) + grãos."""
    g, s = 8, T // 8
    big = [[rng.random() for _ in range(g)] for _ in range(g)]
    fine = [[rng.random() for _ in range(16)] for _ in range(16)]
    t = Tile(True)
    for y in range(T):
        for x in range(T):
            x0, y0 = x // s, y // s
            fx, fy = (x % s) / s, (y % s) / s
            fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
            a = big[y0 % g][x0 % g] * (1 - fx) + big[y0 % g][(x0 + 1) % g] * fx
            b = big[(y0 + 1) % g][x0 % g] * (1 - fx) + big[(y0 + 1) % g][(x0 + 1) % g] * fx
            v = (a * (1 - fy) + b * fy) * 0.7 + fine[y // 2][x // 2] * 0.3 + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.14
            t.set(x, y, P[1] if v < 0.38 else P[2] if v < 0.62 else P[3])
    for _ in range(9): t.set(rng.randrange(T), rng.randrange(T), P[4])
    for _ in range(6): t.set(rng.randrange(T), rng.randrange(T), P[0])
    return t


# ---------- detalhes sobre a terra (linha 0, opacos; x, y = ponto do detalhe) ----------
def pebble(t, x, y, C, r):
    sh, body, hi = C['st']
    t.set(x, y + 1, sh); t.set(x + 1, y + 1, sh); t.set(x, y, body); t.set(x + 1, y, hi)

def crack(t, x, y, C, r):
    for i in range(r.choice((5, 6, 7))): t.set(x + i, y + (i % 3 == 2), C['P'][0])

def patch(i, rad):
    def f(t, x, y, C, r):
        for dy in range(-rad, rad + 1):
            for dx in range(-rad, rad + 1):
                d = (dx * dx + dy * dy) ** .5 / rad
                if d < 1 and BAYER[(y + dy) % 4][(x + dx) % 4] / 16 > d * 0.95: t.set(x + dx, y + dy, C['P'][i])
    return f

def foot(t, x, y, C, r):
    for ox, oy in ((0, 0), (5, 6)):
        for dx, dy in ((0, 0), (2, 0), (1, -1), (1, 1), (1, 2)): t.set(x + ox + dx, y + oy + dy, C['P'][1])

def dry(t, x, y, C, r):
    G = C['G']
    for dx, h in ((-1, 2), (0, 3), (1, 2)):
        for i in range(h): t.set(x + dx, y - i, G[0] if i == 0 else G[2] if i == h - 1 else G[1])

sc = lambda n, fn: (lambda t, r, C: [fn(t, r.randrange(T), r.randrange(T), C, r) for _ in range(n)])
plain = lambda t, r, C: None
ROW0 = [plain, plain, sc(5, pebble), sc(3, crack), sc(1, patch(4, 6)), sc(1, patch(1, 6)), sc(1, foot), sc(3, dry)]


# ---------- decorações (linha 1, fundo transparente, centradas no tile) ----------
def d_rock(t, r, C):
    sh, body, hi = C['st']; x, y = 16, 15
    for dy, a, b in ((-2, -1, 1), (-1, -2, 2), (0, -3, 3), (1, -3, 3), (2, -2, 3)):
        for dx in range(a, b + 1): t.set(x + dx, y + dy, body)
    for dx in range(-3, 4): t.set(x + dx, y + 3, C['P'][0])
    for dx in range(-3, 4): t.set(x + dx, y + 2, sh)
    t.set(x - 1, y - 2, hi); t.set(x, y - 2, hi); t.set(x - 2, y - 1, hi); t.set(x + 1, y + 1, sh)

def d_pebbles(t, r, C):
    for dx, dy in ((-5, -2), (0, -4), (4, 1), (-2, 3), (6, -3)): pebble(t, 16 + dx, 15 + dy, C, r)

def d_bone(t, r, C):
    b, s = hx('#e8dcc0'), hx('#b8a888')
    for x in range(9, 23): t.set(x, 15, b); t.set(x, 16, s); t.set(x, 18, C['P'][0])
    for x in (9, 10, 21, 22): t.set(x, 14, b); t.set(x, 17, s)

def d_stick(t, r, C):
    br, dk = hx('#7a5028'), hx('#5a3a1c')
    for i in range(14): t.set(9 + i, 20 - (i * 2) // 3, br); t.set(9 + i, 21 - (i * 2) // 3, dk)
    t.set(15, 15, br); t.set(16, 14, br); t.set(17, 13, br)

def d_leaf(t, r, C):
    dk, md = C['leaf']
    for x, y in ((14, 14), (15, 14), (13, 15), (14, 15), (15, 15), (16, 15), (14, 16), (15, 16), (16, 16), (17, 16), (16, 17), (17, 17)): t.set(x, y, md)
    for x, y in ((14, 15), (15, 15), (16, 16)): t.set(x, y, dk)
    t.set(12, 16, dk); t.set(15, 18, C['P'][0]); t.set(16, 18, C['P'][0]); t.set(17, 18, C['P'][0])

def d_tuft(t, r, C):
    G = C['G']
    for dx, h in ((-2, 3), (0, 5), (2, 4)):
        for i in range(h): t.set(16 + dx, 17 - i, G[2] if i == h - 1 else G[1] if i >= 1 else G[0])
    for dx in range(-3, 4): t.set(16 + dx, 18, C['P'][0])

def d_skull(t, r, C):
    b, s, dk = hx('#e8dcc0'), hx('#b8a888'), hx('#2a1c10')
    cx, cy = 16, 13
    for dy, a, e in ((0, -3, 3), (1, -4, 4), (2, -4, 4), (3, -4, 4), (4, -3, 3), (5, -2, 2)):
        for dx in range(a, e + 1): t.set(cx + dx, cy + dy, b if dx < 2 else s)
    for ex in (-3, 1):
        for dy in (2, 3):
            for dx in (0, 1): t.set(cx + ex + dx, cy + dy, dk)
    t.set(cx, cy + 4, dk)
    for dx in range(-2, 3): t.set(cx + dx, cy + 5, dk if dx % 2 else s)
    for dx in range(-3, 4): t.set(cx + dx, cy + 7, C['P'][0])

def d_puddle(t, r, C):
    rim, wa, sh = C['wa']
    for dy in range(-4, 5):
        for dx in range(-7, 8):
            d = (dx / 7.5) ** 2 + (dy / 4.5) ** 2
            if d <= 1: t.set(16 + dx, 16 + dy, rim if d > 0.72 else wa)
    t.set(13, 15, sh); t.set(14, 15, sh); t.set(18, 17, sh)

ROW1 = [d_rock, d_pebbles, d_bone, d_stick, d_leaf, d_tuft, d_skull, d_puddle]

# P = 5 tons da terra (escuro→claro; P[0] casa com a borda do tema em data.js) · st = pedra · G = capim · leaf = folha seca · wa = poça (borda, água, brilho)
TEMAS = {
    'campina': dict(P=['#5a4630', '#7e6238', '#9a7a48', '#b8945a', '#d4b074'], st=['#585860', '#8a8a95', '#c0c0cc'], G=['#3f8a32', '#58a840', '#86d268'],
                    leaf=['#a85a1c', '#e0a040'], wa=['#4a3a28', '#6a8a98', '#9ac4d0']),
    'floresta': dict(P=['#382a1c', '#4a3a28', '#6a5238', '#7a6040', '#947654'], st=['#2e3a30', '#58685a', '#8aa08c'], G=['#235028', '#33683a', '#52905a'],
                     leaf=['#a85a1c', '#c87a2a'], wa=['#2e2418', '#4a6a70', '#7aa0a4']),
    'pantano': dict(P=['#2a2016', '#3a2e20', '#5a4a30', '#6a5a3a', '#8a7850'], st=['#3a4036', '#686e5c', '#9aa088'], G=['#485c2c', '#647a3c', '#8a9c56'],
                    leaf=['#6a7a30', '#8a9c56'], wa=['#2e2418', '#4e7270', '#9ac4c0']),
}


def gerar(nome, cfg, saida):
    C = {k: [hx(c) for c in v] for k, v in cfg.items()}
    sheet = [[CLEAR] * (T * 8) for _ in range(T * 2)]
    for row, decs in enumerate((ROW0, ROW1)):
        for col, dec in enumerate(decs):
            rng = random.Random(f'caminho-{nome}-{row}-{col}')
            t = base(rng, C['P']) if row == 0 else Tile(False)
            dec(t, rng, C)
            for y in range(T): sheet[row * T + y][col * T:(col + 1) * T] = t.p[y]
    save_png(os.path.join(saida, f'tileset_caminho_{nome}.png'), sheet)
    return nome, sheet


def preview(sheets, saida, k=2):
    """Faixa de caminho montada como no jogo: borda escura de 4px, tiles da linha 0, decorações da linha 1 em 1 de cada 3 células."""
    rng, W, H = random.Random(7), 14, 2
    out = []
    for nome, sheet in sheets:
        P0, G1 = hx(TEMAS[nome]['P'][0]), hx(TEMAS[nome]['G'][1])
        w, h = W * T, H * T
        img = [[G1] * w for _ in range(h + 24)]
        for ty in range(H):
            for tx in range(W):
                c = rng.choice((0, 0, 1, 1, 2, 3, 4, 5, 6, 7)) if rng.random() < .5 else rng.choice((0, 1, 0, 1, 2))
                for y in range(T): img[12 + ty * T + y][tx * T:(tx + 1) * T] = sheet[y][c * T:(c + 1) * T]
        for ty in range(H):
            for tx in range(W):
                if rng.randrange(3): continue
                c, ox, oy = rng.randrange(8), rng.randrange(-4, 5) * 2, rng.randrange(-4, 5) * 2
                for sy in range(T):
                    for sx in range(T):
                        p, yy, xx = sheet[T + sy][c * T + sx], 12 + ty * T + sy + oy, tx * T + sx + ox
                        if p[3] and 12 <= yy < 12 + h and 0 <= xx < w: img[yy][xx] = p
        for y in list(range(8, 12)) + list(range(12 + h, 16 + h)): img[y] = [P0] * w
        out += img
    out = [[p for p in row for _ in range(k)] for row in out for _ in range(k)]
    save_png(os.path.join(saida, 'preview_caminho.png'), out)


if __name__ == '__main__':
    saida = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'tilesets')
    os.makedirs(saida, exist_ok=True)
    sheets = [gerar(n, c, saida) for n, c in TEMAS.items()]
    if '--preview' in sys.argv: preview(sheets, saida)
    print('Tilesets do caminho gerados em', os.path.normpath(saida))

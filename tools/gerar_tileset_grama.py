#!/usr/bin/env python3
"""Gera os tilesets de grama (32x32, pixel art estilo 32-bit) dos mapas 1-3 em assets/tilesets/.
Uso: python3 tools/gerar_tileset_grama.py [--preview]   (só biblioteca padrão, sem dependências)
Cada sheet tem 8x2 tiles de 32x32 (256x64): linha 0 = grama lisa/variações · linha 1 = decorações do tema."""
import os, random, struct, sys, zlib

T = 32
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
hx = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


def save_png(path, img):
    h, w = len(img), len(img[0])
    raw = b''.join(b'\x00' + bytes(v for p in row for v in p) for row in img)
    ch = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw, 9)) + ch(b'IEND', b''))


class Tile:
    def __init__(s): s.p = [[(0, 0, 0)] * T for _ in range(T)]
    def set(s, x, y, c): s.p[y % T][x % T] = hx(c) if isinstance(c, str) else c   # coordenadas dão a volta: tile sem emenda


def base(rng, P):
    """Grama base: ruído periódico + ruído fino + dithering ordenado (tom escuro / médio / claro)."""
    g, s = 8, T // 8
    big = [[rng.random() for _ in range(g)] for _ in range(g)]
    fine = [[rng.random() for _ in range(16)] for _ in range(16)]
    t = Tile()
    for y in range(T):
        for x in range(T):
            x0, y0 = x // s, y // s
            fx, fy = (x % s) / s, (y % s) / s
            fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
            a = big[y0 % g][x0 % g] * (1 - fx) + big[y0 % g][(x0 + 1) % g] * fx
            b = big[(y0 + 1) % g][x0 % g] * (1 - fx) + big[(y0 + 1) % g][(x0 + 1) % g] * fx
            v = (a * (1 - fy) + b * fy) * 0.75 + fine[y // 2][x // 2] * 0.25 + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.12
            t.set(x, y, P[1] if v < 0.38 else P[2] if v < 0.62 else P[3])
    return t


# ---------- decorações (x, y = base do objeto) ----------
def tuft(t, x, y, P, h=5):
    for dx, hh, ln in ((-2, h - 2, -1), (0, h, 0), (2, h - 2, 1)):
        for i in range(max(1, hh)):
            c = P[4] if i == hh - 1 else P[3] if i >= hh - 3 else P[2] if i >= 1 else P[1]
            t.set(x + dx + (ln if i >= hh // 2 else 0), y - i, c)
    for dx in range(-2, 3): t.set(x + dx, y + 1, P[0])

def flower(cols):
    def f(t, x, y, P, r):
        pet, mid = r.choice(cols)
        for i in range(1, 4): t.set(x, y + i, P[1])
        t.set(x + 1, y + 2, P[3]); t.set(x - 1, y + 3, P[3])
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)): t.set(x + dx, y + dy, pet)
        t.set(x, y, mid)
    return f

def mushroom(t, x, y, P, r):
    cap, dot = r.choice((('#d83c34', '#ffffff'), ('#b8743c', '#f0dcb0'), ('#a850c8', '#f0d8ff')))
    for dy in (1, 2, 3):
        for dx in (0, 1): t.set(x + dx, y + dy, '#e8dcc0' if dx == 0 else '#b8a888')
    for dx in range(-1, 3): t.set(x + dx, y - 1, cap)
    for dx in range(-2, 4): t.set(x + dx, y, cap)
    t.set(x, y - 1, dot); t.set(x + 2, y, dot); t.set(x - 1, y, P[0]); t.set(x + 3, y, P[0])
    for dx in range(-2, 4): t.set(x + dx, y + 4, P[0])

def fern(t, x, y, P, r):
    for i in range(8): t.set(x, y - i, P[3] if i > 1 else P[1])
    for i in range(1, 8):
        w = 3 if i < 5 else 2 if i < 7 else 1
        for d in range(1, w + 1):
            c = P[4] if d == w else P[3]
            t.set(x - d, y - i + (1 if d > 1 else 0), c); t.set(x + d, y - i + (1 if d > 1 else 0), c)

def reed(t, x, y, P, r):
    for dx, hh in ((-3, 8), (0, 11), (3, 9)):
        for i in range(hh): t.set(x + dx, y - i, '#8aa850' if i > 3 else '#5a7a38')
        for i in range(hh - 4, hh - 1):
            t.set(x + dx, y - i, '#7a5028'); t.set(x + dx + 1, y - i, '#5a3a1c')
    for dx in range(-4, 5): t.set(x + dx, y + 1, P[0])

def puddle(t, x, y, P, r):
    rx, ry = r.choice((5, 6, 7)), r.choice((3, 4))
    for dy in range(-ry - 1, ry + 2):
        for dx in range(-rx - 1, rx + 2):
            d = (dx / (rx + 1)) ** 2 + (dy / (ry + 1)) ** 2
            if d <= 1: t.set(x + dx, y + dy, '#2e2418' if d > 0.78 else '#4a3a28' if d > 0.5 else '#4e7270')
    t.set(x - 2, y - 1, '#9ac4c0'); t.set(x - 1, y - 1, '#9ac4c0'); t.set(x + 2, y, '#7aa8a4')

def lily(t, x, y, P, r):
    for dy in range(-2, 3):
        for dx in range(-3, 4):
            if (dx / 3.5) ** 2 + (dy / 2.5) ** 2 <= 1 and not (dx > 0 and dy == 0 and dx < 3): t.set(x + dx, y + dy, '#2e7a3c' if dy > 0 else '#48a050')
    t.set(x - 1, y - 1, '#e870a0'); t.set(x, y - 1, '#f8b0d0')

def leaves(t, x, y, P, r):
    c = r.choice(('#c87a2a', '#a85a1c', '#e0a040'))
    for dx, dy in ((0, 0), (1, 0), (1, 1), (-1, 1)): t.set(x + dx, y + dy, c)
    t.set(x, y - 1, '#e8c070')

def rock(cols):
    def f(t, x, y, P, r):
        sh, body, hi = cols
        for dy, a, b in ((-2, -1, 1), (-1, -2, 2), (0, -3, 3), (1, -3, 3), (2, -2, 3)):
            for dx in range(a, b + 1): t.set(x + dx, y + dy, body)
        for dx in range(-3, 4): t.set(x + dx, y + 3, P[0])
        for dx in range(-3, 4): t.set(x + dx, y + 2, sh)
        t.set(x - 1, y - 2, hi); t.set(x, y - 2, hi); t.set(x - 2, y - 1, hi); t.set(x + 1, y + 1, sh)
    return f

def patch(col, rad):
    def f(t, x, y, P, r):
        for dy in range(-rad, rad + 1):
            for dx in range(-rad, rad + 1):
                d = (dx * dx + dy * dy) ** .5 / rad
                if d < 1 and BAYER[(y + dy) % 4][(x + dx) % 4] / 16 > d * 0.95: t.set(x + dx, y + dy, col if isinstance(col, tuple) else hx(col))
    return f

def clover(t, x, y, P, r):
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)): t.set(x + dx, y + dy, P[4])
    t.set(x, y, P[3]); t.set(x, y + 2, P[1])

sc = lambda n, fn: (lambda t, r, P: [fn(t, r.randrange(T), r.randrange(T), P, r) for _ in range(n)])
tf = lambda h: (lambda t, x, y, P, r: tuft(t, x, y, P, h))
mix = lambda *fs: (lambda t, r, P: [f(t, r, P) for f in fs])
plain = lambda t, r, P: None

CORES_CAMPINA = (('#f0d84c', '#c88a1c'), ('#f4f4f4', '#f0c030'), ('#e04c4c', '#f0d84c'), ('#6a8aff', '#ffffff'))
TEMAS = {
    # mapa 1
    'campina': dict(P=['#234e1c', '#2f6a26', '#3f8a32', '#58a840', '#86d268'], row1=[
        sc(4, tf(5)), sc(5, flower(CORES_CAMPINA[:2])), sc(5, flower(CORES_CAMPINA[2:])), sc(1, rock(('#585860', '#8a8a95', '#c0c0cc'))),
        sc(4, clover), sc(1, patch('#7a5a34', 5)), mix(sc(3, tf(4)), sc(3, flower(CORES_CAMPINA))), sc(8, tf(6))]),
    # mapa 2
    'floresta': dict(P=['#0e2a14', '#183c1e', '#235028', '#33683a', '#52905a'], row1=[
        sc(4, tf(5)), sc(3, mushroom), sc(2, fern), sc(1, rock(('#2e3a30', '#58685a', '#8aa08c'))),
        sc(6, leaves), mix(sc(1, patch('#0a2010', 5)), sc(2, tf(4))), mix(sc(1, fern), sc(2, mushroom)), sc(8, tf(6))]),
    # mapa 3
    'pantano': dict(P=['#222e16', '#334420', '#485c2c', '#647a3c', '#8a9c56'], row1=[
        sc(4, tf(5)), sc(3, reed), sc(1, puddle), sc(1, patch('#3a2e20', 6)),
        sc(1, lily), mix(sc(1, puddle), sc(2, reed)), sc(1, rock(('#3a4036', '#686e5c', '#9aa088'))), sc(8, tf(6))]),
}
ROW0 = [plain, plain, sc(3, tf(4)), sc(2, tf(5)), sc(6, tf(3)), sc(1, patch(None, 6)), sc(1, patch(None, 6)), sc(5, tf(4))]


def gerar(nome, cfg, saida):
    P = [hx(c) for c in cfg['P']]
    sheet = [[(0, 0, 0)] * (T * 8) for _ in range(T * 2)]
    for row, decs in enumerate((ROW0, cfg['row1'])):
        for col, dec in enumerate(decs):
            rng = random.Random(f'{nome}-{row}-{col}')
            t = base(rng, P)
            if row == 0 and col == 5: dec = sc(1, patch(P[1], 6))     # mancha escura
            elif row == 0 and col == 6: dec = sc(1, patch(P[4], 5))   # mancha clara
            dec(t, rng, P)
            for y in range(T): sheet[row * T + y][col * T:(col + 1) * T] = t.p[y]
    save_png(os.path.join(saida, f'tileset_grama_{nome}.png'), sheet)
    return sheet


def preview(sheets, saida, k=2):
    rng, W, H = random.Random(7), 14, 4
    out = []
    for sheet in sheets:
        for ty in range(H):
            rows = [[] for _ in range(T)]
            for tx in range(W):
                c = rng.choice((0, 1, 2, 3, 0, 1)) if rng.random() < .75 else rng.randrange(8)
                r = 0 if rng.random() < .8 else 1
                for y in range(T): rows[y] += sheet[r * T + y][c * T:(c + 1) * T]
            out += rows
    out = [[p for p in row for _ in range(k)] for row in out for _ in range(k)]
    save_png(os.path.join(saida, 'preview_grama.png'), out)


if __name__ == '__main__':
    saida = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'tilesets')
    os.makedirs(saida, exist_ok=True)
    sheets = [gerar(n, c, saida) for n, c in TEMAS.items()]
    if '--preview' in sys.argv: preview(sheets, saida)
    print('Tilesets gerados em', os.path.normpath(saida))

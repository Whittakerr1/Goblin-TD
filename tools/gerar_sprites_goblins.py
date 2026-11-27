#!/usr/bin/env python3
"""Gera os sprites dos 8 goblins (pixel art, olhando para a direita, 2 quadros de caminhada) em assets/sprites/goblins/.
Uso: python3 tools/gerar_sprites_goblins.py   (só biblioteca padrão; reaproveita save_png de gerar_tileset_caminho.py)
Cada arquivo goblin_<tipo>_sheet.png tem 2 quadros lado a lado (largura = 2 x L). Tamanhos L x A (iguais a SPR_GOB em data.js):
comum 10x10 · rapido 11x10 · bruto 26x24 · blindado 18x17 · xama 18x19 · sapador 14x14 · morcego 14x12 · chefe 44x42
Transparência só 0 ou 255; contorno escuro de 1px. O jogo espelha, tinge (flash/gelo/fogo/lentidão) e anima por código."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gerar_tileset_caminho as C

OL = '#10161e'
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'sprites', 'goblins')


def mixc(a, b, k):
    A, B = C.hx(a), C.hx(b)
    return tuple(round(A[i] + (B[i] - A[i]) * k) for i in range(3)) + (255,)

def pal(m, d): return dict(m=m, d=d, l=mixc(m, '#ffffff', .4))


class Cv:
    def __init__(s, w, h): s.w, s.h = w, h; s.p = [[C.CLEAR] * w for _ in range(h)]
    def set(s, x, y, c):
        if 0 <= x < s.w and 0 <= y < s.h: s.p[y][x] = C.hx(c) if isinstance(c, str) else c
    def get(s, x, y): return s.p[y][x] if 0 <= x < s.w and 0 <= y < s.h else C.CLEAR
    def rect(s, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w): s.set(xx, yy, c)
    def ell(s, cx, cy, rx, ry, c):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1: s.set(x, y, c)
    def outline(s, c):
        o = [(x, y) for y in range(s.h) for x in range(s.w) if s.p[y][x][3] == 0 and any(s.get(x + dx, y + dy)[3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
        for x, y in o: s.set(x, y, c)


def humano(W, H, P, f, hw, hh, bw, bh, lg, ear=2, eye=1, shift=1, back=None):
    """Goblin de lado: pernas (alternam por quadro), corpo, braços, cabeça com orelha pontuda e olho vermelho. Devolve (canvas, geometria)."""
    cv = Cv(W, H); cx = W // 2; m, d, l = P['m'], P['d'], P['l']
    yb = H - 1 - lg - bh; yh = yb - hh; xb = cx - bw // 2; xh = cx - hw // 2 + shift; lw = max(1, bw // 4)
    g = dict(cx=cx, yb=yb, yh=yh, xb=xb, xh=xh, lw=lw, hw=hw, hh=hh, bw=bw, bh=bh, lg=lg, ay=yb + 1 + f, ax=xb + bw - 1)
    if back: back(cv, g)
    for i, x in enumerate((xb, xb + bw - lw)):
        ln = lg if (i + f) % 2 == 0 else max(1, lg - 1)
        cv.rect(x, H - 1 - ln, lw, ln, d); cv.rect(x, H - 2, lw + 1, 1, d)
    aln = max(2, bh - 1)
    cv.rect(xb - 1, yb + 1 + (1 - f), lw, aln, d)
    cv.rect(xb, yb, bw, bh, m); cv.rect(xb, yb, bw, 1, l); cv.rect(xb, yb + bh - 1, bw, 1, d)
    if bh >= 4: cv.rect(xb, yb + bh - 2, bw, 1, '#5a3a1c')
    cv.rect(g['ax'], g['ay'], lw, aln, m); cv.rect(g['ax'], g['ay'] + aln - 1, lw, 1, l)
    cv.rect(xh, yh, hw, hh, m)
    if hw >= 4 and hh >= 3:
        for x, y in ((xh, yh), (xh + hw - 1, yh), (xh, yh + hh - 1), (xh + hw - 1, yh + hh - 1)): cv.set(x, y, C.CLEAR)
    cv.rect(xh + 1, yh, hw - 2, 1, l); cv.rect(xh + 1, yh + hh - 1, hw - 2, 1, d)
    for r in range(ear): cv.set(xh - 1 - r, yh + ear - 1 - r, m); cv.set(xh - 1 - r, yh + ear - r, d)
    cv.set(xh - ear, yh, l)
    ex, ey = xh + hw - 2 - (1 if hw > 7 else 0), yh + hh // 2 - (1 if hh > 8 else 0)
    cv.rect(ex, ey, eye, eye, '#ff3030')
    if eye >= 2: cv.set(ex, ey, '#ffffff')
    if hh >= 5: cv.rect(xh + hw - 4, yh + hh - 2, 2, 1, '#2a1c10')
    return cv, g


def comum(f):
    return humano(10, 10, pal('#4cb85a', '#2a7a36'), f, 4, 3, 4, 3, 2)[0]

def rapido(f):
    cv, g = humano(11, 10, pal('#b8d84c', '#7a9a2a'), f, 4, 3, 3, 3, 2, shift=2)
    for dy, ln in ((2, 3), (5, 2), (7, 3)): cv.rect(0, dy, ln, 1, '#e8f0a0')   # riscos de velocidade
    return cv

def bruto(f):
    P = pal('#8a5a3a', '#5a3820')
    cv, g = humano(26, 24, P, f, 10, 8, 14, 8, 4, ear=4, eye=2)
    xb, yb, xh, yh, hw, hh, bw, bh, ay = (g[k] for k in ('xb', 'yb', 'xh', 'yh', 'hw', 'hh', 'bw', 'bh', 'ay'))
    cv.rect(xb + 2, yb + bh - 2, bw - 4, 5, '#5a3a1c'); cv.rect(xb + 2, yb + bh - 2, bw - 4, 1, '#7a5028')   # tanga
    cv.rect(xb - 2, yb - 1, 5, 3, P['d']); cv.rect(xb - 2, yb - 1, 5, 1, P['l'])                              # ombro
    cv.rect(xh + hw - 3, yh + hh - 1, 1, 2, '#f0e8d0'); cv.rect(xh + hw - 7, yh + hh - 1, 1, 2, '#f0e8d0')    # presas
    cv.rect(22, ay - 4, 2, 10, '#7a5028'); cv.rect(21, ay - 10, 4, 7, '#7a5028')                              # clava
    cv.rect(21, ay - 10, 1, 7, '#a8783c'); cv.rect(24, ay - 10, 1, 7, '#5a3a1c')
    for x, y in ((20, ay - 9), (25, ay - 8), (20, ay - 6), (25, ay - 5)): cv.set(x, y, '#c0c0cc')
    return cv

def blindado(f):
    S0, S1, S2 = '#3a4a68', '#7a8aa8', '#b8c8e0'
    cv, g = humano(18, 17, pal('#5a9a4a', '#2a5a2a'), f, 7, 6, 8, 5, 2, ear=3)
    cx, xb, yb, xh, yh, hw, bw, bh = (g[k] for k in ('cx', 'xb', 'yb', 'xh', 'yh', 'hw', 'bw', 'bh'))
    cv.rect(xb, yb, bw, bh, S1); cv.rect(xb, yb, bw, 1, S2); cv.rect(xb, yb + bh - 1, bw, 1, S0); cv.rect(cx, yb, 1, bh, S0)     # peitoral
    cv.rect(xh - 1, yh - 1, hw + 2, 3, S1); cv.rect(xh, yh - 1, hw, 1, S2); cv.rect(xh - 1, yh + 1, hw + 2, 1, S0)             # elmo
    cv.rect(xh + hw - 2, yh + 2, 1, 3, S0); cv.rect(cx, yh - 3, 2, 2, '#c8402c')                                               # focinheira e crista
    cv.ell(cx + 4, yb + 3, 3, 4, S0); cv.ell(cx + 4, yb + 3, 2, 3, S1); cv.set(cx + 4, yb + 3, '#ffd84c')                      # escudo
    return cv

def xama(f):
    R, SK = pal('#c04cf0', '#6a2a98'), pal('#6aa83a', '#3a6a1a')
    cv, g = humano(18, 19, SK, f, 6, 5, 6, 7, 2, ear=3)
    cx, xb, yb, xh, yh, hw, hh, bw, bh = (g[k] for k in ('cx', 'xb', 'yb', 'xh', 'yh', 'hw', 'hh', 'bw', 'bh'))
    cv.rect(xb - 1, yb, bw + 2, bh + 1, R['m']); cv.rect(xb - 1, yb, bw + 2, 1, R['l']); cv.rect(xb - 1, yb + bh, bw + 2, 1, R['d']); cv.rect(cx, yb + 1, 1, bh - 1, R['d'])
    cv.set(xb - 1 - f, yb + bh, R['d']); cv.set(xb + bw + f, yb + bh, R['d'])                                                  # barra balança
    cv.rect(xh - 1, yh - 2, hw + 2, 3, R['m']); cv.rect(xh, yh - 2, hw, 1, R['l']); cv.rect(xh - 1, yh, 1, hh, R['d'])         # capuz
    cv.rect(xh + hw - 4, yh + 1, 3, 3, '#1a1028'); cv.set(xh + hw - 3, yh + 2, '#ffe84c')                                      # rosto na sombra
    cv.rect(12, yb + 2, 2, 1, SK['m']); cv.rect(14, yb - 5, 1, 14, '#7a5028')                                                  # mão e cajado
    r = 1.5 + 0.5 * f; cv.ell(14, yb - 6, r, r, '#ff60ff'); cv.set(14, yb - 6, '#ffffff')                                      # orbe pulsa
    return cv

def sapador(f):
    O0, O1, O2 = '#8a5a10', '#f0a830', '#ffd070'
    cv, g = humano(14, 14, pal('#6aa83a', '#3a6a1a'), f, 5, 4, 5, 4, 2, ear=2)
    xb, yb, xh, yh, hw, bw, bh = (g[k] for k in ('xb', 'yb', 'xh', 'yh', 'hw', 'bw', 'bh'))
    cv.rect(xb, yb, bw, bh, O1); cv.rect(xb, yb, bw, 1, O2); cv.rect(xb, yb + bh - 1, bw, 1, O0)                                # colete
    cv.rect(xh - 1, yh - 1, hw + 2, 2, O1); cv.rect(xh, yh - 2, hw, 1, O2); cv.set(xh + hw, yh - 1, '#ffff80')                  # capacete com lanterna
    cv.ell(xb - 1, yb + 2, 2.2, 2.2, '#2a2a30'); cv.set(xb - 2, yb + 1, '#7a7a88'); cv.set(xb - 1, yb - 1, '#c8c0a0')           # bomba nas costas
    cv.set(xb - 1, yb - 2, '#ffff40' if f == 0 else '#ff4040')                                                                 # faísca pisca
    return cv

def morcego(f):
    P = pal('#8a5ac8', '#4a2a78'); m, d, l = P['m'], P['d'], P['l']; cv, cx = Cv(14, 12), 7
    for i in range(1, 5):
        yt, yb = (5 - i, 7) if f == 0 else (5, 6 + i)    # f0 asas para cima, f1 para baixo
        for sx in (-1, 1):
            x = cx + sx * (i + 1); cv.rect(x, yt, 1, yb - yt + 1, m); cv.set(x, yt, l); cv.set(x, yb, d)
    cv.ell(cx, 6, 1.6, 3, m); cv.rect(cx - 1, 4, 3, 1, l); cv.ell(cx, 3.5, 2, 1.8, m)
    cv.set(cx - 2, 1, d); cv.set(cx + 2, 1, d); cv.set(cx - 2, 2, m); cv.set(cx + 2, 2, m)
    cv.set(cx - 1, 3, '#ff3030'); cv.set(cx + 1, 3, '#ff3030'); cv.set(cx - 1, 5, '#ffffff'); cv.set(cx + 1, 5, '#ffffff')
    cv.set(cx - 1, 9, d); cv.set(cx + 1, 9, d)
    return cv

def chefe(f):
    GD, GL, GS = '#ffd84c', '#fff0a0', '#b8860b'
    def back(cv, g):   # capa atrás do corpo
        h = g['bh'] + g['lg'] + 1; cv.rect(g['xb'] - 5, g['yb'] - 1, 8, h, '#701010'); cv.rect(g['xb'] - 5, g['yb'] - 1, 2, h, '#a02020'); cv.rect(g['xb'] - 1, g['yb'], 1, h - 2, '#4a0a0a')
    cv, g = humano(44, 42, pal('#d03838', '#701818'), f, 16, 13, 22, 12, 7, ear=6, eye=3, back=back)
    cx, xb, yb, xh, yh, hw, hh, bw, bh, ay = (g[k] for k in ('cx', 'xb', 'yb', 'xh', 'yh', 'hw', 'hh', 'bw', 'bh', 'ay'))
    cv.rect(xb, yb + bh - 3, bw, 3, '#3a2a2a'); cv.rect(cx - 1, yb + bh - 3, 3, 3, GD)                                          # cinto
    cv.rect(xb - 3, yb - 1, 7, 5, '#3a2a2a'); cv.rect(xb - 3, yb - 1, 7, 1, '#6a5a5a'); cv.rect(xb - 2, yb - 3, 1, 2, '#c0c0cc'); cv.rect(xb + 1, yb - 3, 1, 2, '#c0c0cc')
    cv.rect(xh + 1, yh - 4, hw - 2, 4, GD); cv.rect(xh + 1, yh - 4, hw - 2, 1, GL); cv.rect(xh + 1, yh - 1, hw - 2, 1, GS)       # coroa
    for i in range(0, hw - 2, 4): cv.rect(xh + 1 + i, yh - 7, 2, 3, GD); cv.set(xh + 1 + i, yh - 7, GL)
    cv.rect(xh + hw // 2 - 1, yh - 3, 2, 2, '#ff3030')
    cv.rect(xh + hw - 5, yh + hh - 1, 2, 4, '#f0e8d0'); cv.rect(xh + hw - 11, yh + hh - 1, 2, 4, '#f0e8d0')                    # presas
    cv.rect(36, ay - 12, 3, 22, '#7a5028'); cv.ell(37, ay - 14, 5, 5, '#7a7a88'); cv.ell(37, ay - 14, 3.5, 3.5, '#a0a0b0')      # maça
    for x, y in ((37, ay - 20), (31, ay - 14), (42, ay - 14), (33, ay - 18), (41, ay - 18)): cv.set(x, y, '#d0d0dc')
    return cv


GOBLINS = dict(comum=comum, rapido=rapido, bruto=bruto, blindado=blindado, xama=xama, sapador=sapador, morcego=morcego, chefe=chefe)

if __name__ == '__main__':
    os.makedirs(SAIDA, exist_ok=True)
    for nome, fn in GOBLINS.items():
        quadros = []
        for f in (0, 1):
            cv = fn(f); cv.outline(OL); quadros.append(cv)
        h = quadros[0].h
        img = [quadros[0].p[y] + quadros[1].p[y] for y in range(h)]
        C.save_png(os.path.join(SAIDA, f'goblin_{nome}_sheet.png'), img)
        print(f'goblin_{nome}_sheet.png  {quadros[0].w}x{h} x2')
    print('Sprites gerados em', os.path.normpath(SAIDA))

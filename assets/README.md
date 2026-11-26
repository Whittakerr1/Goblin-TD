# assets

Todas as imagens do jogo (sprites, tilesets, etc.) ficam aqui, organizadas por tipo.

```
assets/
├── sprites/
│   ├── torres/      arqueiro, canhao, gelo, balista, tesla, chamas, veneno, totem
│   ├── goblins/     comum, rapido, bruto, blindado, xama, morcego, sapador, chefe
│   ├── projeteis/   flechas, bombas, virotes, pocas
│   └── efeitos/     explosoes, raios, particulas
├── tilesets/        chao e caminho por mapa (ex.: ruinas.png, floresta.png)
└── ui/              icones, botoes, HUD
```

## Convenções
- Nomes em minúsculas, sem acentos e sem espaços: `torre_arqueiro.png`, `goblin_comum.png`.
- Tilesets por mapa: `tileset_<mapa>.png`; spritesheets de animação: `<nome>_sheet.png`.
- Pixel art 16-bit: PNG sem suavização, múltiplos de 2px, cores sólidas (sem alpha gradual).

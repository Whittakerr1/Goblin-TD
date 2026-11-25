# Goblin Horde TD — FASE 1: Arquitetura atual

Análise de `index.html`, `style.css`, `data.js` (18,6 KB), `game.js` (40 KB). Nenhum arquivo do jogo foi modificado nesta fase.

## 1. Carregamento e escopo

- `index.html` carrega `data.js` e depois `game.js` como **scripts clássicos**. `const`/`let` de topo ficam no escopo léxico global compartilhado (não viram `window.X`). Não há módulos, bundler, package.json nem framework de testes.
- Novos arquivos devem entrar em `index.html` **antes** de `game.js`, expondo um único namespace `GTD` (IIFE, com `module.exports` condicional para rodar em Node nos testes).
- `game.js` toca DOM/canvas já no carregamento (`getElementById('c').getContext`) e inicia o `loop` no fim do arquivo. Hoje não existe como rodar a simulação sem navegador.

## 2. `data.js` (dados + lógica de custo misturada)

| Bloco | Conteúdo |
|---|---|
| `CFG` | W/H, base, `startGold: 400` (**não usado em lugar nenhum**), `baseHp: 30` |
| `MAPAS` (6) | rotas, bloq, muros, nevoas, perigos, tempestade, `dif`, `ondas` (3 ondas × 120 s). Normalizados em `forEach` ao final |
| `TOWERS` (8) | arqueiro, canhao, gelo, balista, tesla, chamas, veneno (Alquimista), totem. `custo` existe **só** em arqueiro 50, canhao 100, gelo 75; as outras 5 não têm |
| `CONE_CFG`, `GOBLINS` (8) | `ouro` só em comum 2, rapido 2, bruto 9 (**não usado**). `enxame`: comum 12, rapido 12, morcego 6 |
| `PERKS` (43) | gerados em parte à mão, em parte por laços (`TIERS`, `NOVAS`, 8 torres × dano/alc/cad). Campos `n,d,u,c[],mx` |
| `CUSTOS`, `cs()`, `TIERS` | tabelas de custo por nível, geométricas ×1,14 / ×1,22 |
| `ROOTS`, `TREE`, `CADEIA`, `ESPECIAL`, `PRE`, `TREE_H` | árvore visual em serpentina (960×920), pai único, torres liberadas em cadeia |
| `ABATES_POR_MOEDA = 25`, `moedasGanhas(abates)` | `max(1, floor(abates/25))` se abates > 0 |

Contagem de perks atuais: 9 originais + 24 (dano/alc/cad × 8) + 10 (5 liberações + 5 slots) = **43**, igual aos nós de `TREE` (1 vida + 7 liberações + 32 + 3 especiais).

Pontos de atenção:
- `PERKS[...].c` é sobrescrito em 4 lugares depois de criado (`can_slot`, `gel_slot`, `can_raio`, `gel_dur`, `gelo`). Qualquer congelamento de preços antigos tem que ser lido do estado **final** de `PERKS`.
- Todos os efeitos máximos já excedem os tetos pedidos na especificação: dano 5×32% = +160% (teto 60%), alcance 5×13% = +65% (35%), recarga 5×11% = −55% (45%), vida +40 sobre 30 = +133% (50%).

## 3. `game.js` — mapa de funções

**Persistência / jogador**: `lerLS`, `jogadores`, `carregarMeta`, `salvarMeta`, `desbloq`, `tmapa`, `mapaInicial`, IIFE de migração do save `goblintd_meta` antigo, `VER_NOME`.
- Chaves do localStorage: `goblintd_jogadores`, `goblintd_atual`, `goblintd_vnome`, `goblintd_meta_<nome>`, (legado) `goblintd_meta`.
- Formato de `META`: `{ moedas, lv: {id: nível}, mapa, vit: {i: true}, torres: {mapaIdx: [{k,x,y,lvl,dir,cone}]} }`. **Sem campo de versão.** `torres` antigo pode ser array (vira mapa 0).
- `desbloq(i)`: mapa i abre ao vencer i-1; o jogador `whittaker` tem tudo aberto.

**Acesso a perks (todos os pontos que o ModifierManager vai substituir)**: `pk`, `ef`, `livre`, `vagas`, `usadas`, `cheio`.

| Função | Uso de perk | Observação |
|---|---|---|
| `reset` | `ef('vida')` → hp inicial; `livre/cheio` ao restaurar torres | restaura torres sem custo |
| `tStat` | `ef(PRE+'_dano')`, `ef(PRE+'_alc')`, `bonus(t).d`, `MAPA.mod.alc`, `nevoaF` | `t.lvl` é sempre 1 (não há código de upgrade): fator `1+0.5(lvl-1)` é vestigial |
| `fire` | `ef(PRE+'_cad')`, `ef('gel_dur')`, `pk('arq_multi')`, `bonus(t).c` | recarga aditiva sem teto |
| `mkProj` | `ef('can_raio')`, `pk('arq_dano')` (perfuração) | |
| `auraR`, `bonus` | `ef('tot_alc')`, `tot_dano`, `tot_cad` | tetos fixos 1.5 / 1 no código |
| `drawAim`, `draw` (fantasma) | `ef(PRE+'_alc')` direto, **sem passar por `tStat`** | duplicação a unificar |
| `drawHud` | `ef('vida')` | |
| `buildShop`, teclas 1-8, clique | `livre`, `vagas` | |
| `buyPerk`, `drawTree`, `buildMeta` | `PERKS`, `TREE`, `META.lv`, `META.moedas` | UI inteira da árvore (canvas 960×920) |

**Combate (puro, sem DOM, mas acoplado ao estado global `S`, `MAPA`, `GRID`)**: `planoHorda`, `spawnGroup`, `mkG`, `hit`, `updateGoblins`, `updateTowers`, `updateExtras`, `raio`, `update`.
- **Todo o RNG é `Math.random`** (`rnd`, `planoHorda`, `spawnGroup`, `mkG`, tempestade, partículas). Não há semente: o simulador exige injeção de RNG.
- `S.kills++` acontece em **um único lugar**: `hit()` (inclui ticks de queimadura, poças e raio). Esse é o ponto de gancho para recompensas. Goblins que chegam ao castelo ou sapadores que explodem fazem `dead = true` sem passar por `hit` (não geram abate).
- Enxame: `planoHorda` sorteia um tipo e empilha `GOBLINS[tipo].enxame` cópias na mesma lista do grupo. Cada cópia conta 1 abate. `mkG` não guarda nenhum id de grupo. O chefe invoca 12 `comum` via `mkG` direto em `updateGoblins` (fora de qualquer grupo).

**Economia atual**:
- `pagar()` (fim da run): `S.ganho = moedasGanhas(S.kills)`, soma em `META.moedas`, grava `tmapa()[MI]`, marca vitória.
- Colocação de torre: dois caminhos em `click` (confirmação da mira e Totem direto). **Nenhum cobra ouro.** Venda: `contextmenu` remove sem reembolso.
- HUD mostra `moedasGanhas(S.kills)` como prévia de moedas, não existe contador de ouro.

**Redefinição (`#resetar`)**: soma `PERKS[id].c.slice(0, lv)` com os preços **atuais**. Zera `META.lv`, devolve moedas, mantém `vit` e `torres`. Não há registro do que foi realmente pago.

**UI**: `#meta` (painel em tela cheia com `#mhead`, `.mapas`, `canvas#tree`), `#menu`, `#shop`, `#vel`, `#start`, `#melhorias`, `#jogador`. CSS tem restos sem uso (`#perks`, `#menu #lista`).

## 4. Problemas / decisões que precisam do seu aval

1. **Troca de mapa apaga as torres salvas de todos os mapas**: o handler de `.mapas button` faz `META.torres = {}` antes de `setMapa(i)`. Isso contradiz "posições de torres salvas por mapa" (só o último mapa jogado persiste). Parece bug. Proponho remover essa linha na Fase 4/5. Confirma?
2. **Torres restauradas no `reset()` e ouro de batalha**: se forem de graça, os 400 de ouro perdem sentido. Proposta: restauração cobra do ouro inicial, na ordem salva, e descarta o que não couber (ficando salvo para próximas runs). Alternativa: layout salvo é só "plano" e o jogador recoloca. Qual?
3. **Preços antigos não estão registrados em nenhum save**. A única fonte é a tabela de custos atual de `data.js`. Antes de qualquer mudança vou congelar essa tabela em `LEGACY_PRICES_V1` e usá-la para o reembolso integral na migração. Compras feitas sob preços ainda mais antigos não são recuperáveis (limitação real; `.git` não pode ser lido por mim).
4. **Migração**: como os tetos novos são menores que os efeitos antigos e a árvore tem 56 nós novos, a migração v0→v1 será: reembolsar 100% de `lv` pela tabela congelada, zerar `lv`, manter `moedas`, `vit`, `torres`, jogadores, e guardar o `lv` antigo em `META.legacy` para auditoria.
5. **Simulador headless**: `game.js` mistura combate e DOM. Para não duplicar lógica, o plano é extrair o núcleo de combate (`planoHorda`…`update`, `hit`, `tStat`…) para `systems/battle/BattleCore.js` com RNG injetável, usado pelo jogo e pelo simulador. É um arquivo fora da lista original, mas é a única forma de cumprir "não crie sistemas duplicados". Aprova?
6. **Ambiente de execução**: eu só consigo ler/escrever no seu diretório pelo filesystem MCP; não executo código na sua máquina. Os testes e o simulador serão escritos para `node` e eu só relatarei resultados que eu mesmo executar (ou que você colar). Vou verificar se meu ambiente tem Node para rodar uma cópia; se não, você roda `node tests/run.js` e me devolve a saída.

## 5. Impacto por fase (o que será tocado)

| Fase | Arquivos novos | Funções/arquivos existentes afetados |
|---|---|---|
| 2 | `systems/skillTree/{Data,Graph,Cost,Progression,Manager}.js` | `data.js` (PERKS/TREE/CUSTOS/ROOTS passam a ser gerados do novo `SkillTreeData`; originais congelados em legado) |
| 3 | `systems/player/ModifierManager.js`, `SkillTreeEffects.js`, `SkillTreeBalance.js` | `tStat`, `fire`, `mkProj`, `auraR`, `bonus`, `reset`, `drawAim`, `draw`, `drawHud`, `vagas`, `livre` (todos passam a ler modificadores) |
| 4 | `systems/economy/{BattleEconomy,MetaEconomy,RewardCalculator}.js` | `hit`/`mkG`/`planoHorda`/`updateGoblins` (id de grupo e peso), `pagar`, `click`, `contextmenu`, `reset`, `drawHud`, `buildShop`, `GOBLINS.ouro`, `TOWERS.custo` |
| 5 | `SkillTreeSave.js` | `carregarMeta`, `salvarMeta`, `buyPerk`, handler `#resetar`, IIFE de migração |
| 6 | `ui/skillTree/*` | `buildMeta`, `drawTree`, `TREE_H`, `#meta` no HTML/CSS |
| 7 | `SkillTreeSimulator.js`, `BattleCore.js`, `tests/*` | extração do combate de `game.js` |

Fase 1 concluída (somente leitura + este documento). Pelas regras, não avanço para a Fase 2 sem as respostas aos itens 1, 2 e 5 (os itens 3, 4 e 6 sigo como descrito, salvo objeção).

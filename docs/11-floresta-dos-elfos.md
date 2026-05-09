# 11 — Floresta dos Elfos (biome bible)

> **Bioma 1 do continente Eternia.** Casa da Naia, ponto de partida da
> jornada. Esse doc é a referência canônica de palette, props, mood,
> mobs e lore — qualquer arte futura desse bioma deve obedecer a ele.
>
> **Status:** aesthetic LOCKED, arte pendente.
> **Sprint relacionado:** 7.G (UI MissionSelect) + 7.H (in-game polish).

## One-liner

> "As árvores ainda lembram o nome dos primeiros viajantes." Caminho
> aberto pelos elfos antigos, agora tomado por criaturas pequenas e
> ardilosas.

## Mood

**Calmo, ancestral, mágico.** Não ameaçador — é a casa da Naia, deve
sentir como "voltar pra um lugar conhecido" misturado com "lugar onde
coisas pequenas começam a dar errado". É o bioma de tutorial: o
jogador aprende contra mobs simples num ambiente que recompensa
exploração visual.

Refs:
- **Princess Mononoke** — forest spirits, motes de luz nos raios de sol
- **Hollow Knight Greenpath** — verde profundo + lagoas reflexivas + calma
- **Grand Chase Nation Forest / Elven Forest** — feel anime-MMO clássico
- **Zelda BotW Korok Forest** — golden hour through canopy

## Palette

| Token | Hex | Uso |
|---|---|---|
| `--forest-deep` | `#1a3a2a` | folhagem em sombra, base do bioma |
| `--forest-mid` | `#2d5a3d` | folhagem em mid-tone, estátuas mossy |
| `--forest-light` | `#5a8a5e` | folhas em luz direta |
| `--sun-gold` | `#f5c870` | raios de sol, fey-light, highlights |
| `--sun-warm` | `#d4a574` | madeira em luz, troncos quentes |
| `--spirit-teal` | `#6abf95` | rim-light mágico, runes, fey particles |
| `--bark` | `#3d2817` | troncos em sombra, raízes |
| `--stone-pale` | `#c8b896` | ruínas élficas, moonstone |
| `--mist-warm` | `rgba(245,200,112,0.18)` | volumetric warm haze |

> Esses tokens devem ser definidos em `client/src/styles/tokens.css` (ou
> equivalente) e usados em `MissionSelect.module.css`, no fundo do
> stage 1-1 e no UI tint quando a Floresta estiver selecionada.

## Lighting

- **Hora do dia:** golden hour / late afternoon (4-5pm).
- **Direção principal:** sol vindo de NW alto, atravessando canopy
  diagonal. Raios visíveis (god-rays) entre folhas.
- **Sombras:** longas, com warm bounce vindo das folhas (não cinza
  neutro — sempre com tinge gold ou green).
- **Rim-light mágico:** spirit-teal nos personagens vindos da direita
  (como se fey-lights estivessem flutuando atrás).
- **Atmosfera:** leve volumetric haze warm. Não bruma — apenas air
  filled with sun motes.

## Props (visual library)

Componentes que devem aparecer espalhados em qualquer cena da Floresta:

- **Arcos élficos de pedra** — semi-quebrados, cobertos de musgo e
  trepadeiras. Carved com runes que glow leve em spirit-teal.
- **Estátuas erodidas** — figuras de elfos antigos, faces apagadas pelo
  tempo, vines crescendo entre os dedos.
- **Troncos antigos** — diâmetro grande, raízes expostas formando steps
  naturais. Bark com texture pronunciada.
- **Cogumelos brilhantes** — pequenos, agrupados em base de árvores,
  glow sutil em sun-gold ou spirit-teal.
- **Lanternas élficas** — moonstone carved, suspensas em galhos por
  ivy, fey-light dentro. Versão grande = sanctuary marker.
- **Lagoas reflexivas** — small pools, água parada, refletindo canopy.
- **Pétalas de flor flutuando** — sun-gold particles, drift lento.
- **Fireflies / motes de luz** — concentrados em áreas sombreadas.

## Population (ambient + mob)

### Ambient (background creatures, não interativos)

- Cervos sombra, veados élficos com chifres ramificados — passam ao
  longe entre as árvores
- Pequenos pássaros prata — voam em flocks no skyline distante
- Fey-lights — esferas flutuantes em spirit-teal, com leve trail

### Mob types — Floresta dos Elfos

> **Decisão pendente:** criar 2 mobs novos forest-themed *ou* tematizar
> os existentes (slim, racoon) com palette/props da Floresta.
>
> Recomendação: **criar 2 novos** (Forest Sprite + Bramble Beast).
> Slim e racoon são genéricos demais e criam dissonância com o resto
> do bioma. Os 2 novos mobs viram o "vocabulary" canônico da Floresta.

#### 1. Forest Sprite (small fey, melee)

- **Lore:** fragmentos de spirit-light corrompidos, antes guardiões do
  bosque, agora atacam qualquer um que cruza o caminho.
- **Aparência:** pequena criatura humanoide-fey (~40px tall), corpo
  translúcido em spirit-teal, asas finas como libélula, olhos sem pupila
  brilhando em sun-gold. Carrega uma adaga de cristal.
- **Comportamento:** hops curtos + dash agressivo + jab corpo-a-corpo.
  HP baixo, dmg médio. Aerial-friendly (asas batem).
- **Telegraph:** asas batem mais rápido + flash sun-gold antes do dash.
- **Death FX:** dispersão de motes brilhantes em spirit-teal.

#### 2. Bramble Beast (medium plant, ranged)

- **Lore:** raízes que tomaram consciência depois que os elfos
  abandonaram o bosque. Defendem território cuspindo espinhos.
- **Aparência:** criatura quadrúpede vegetal (~80px tall × 120 wide),
  corpo de raízes entrelaçadas com folhas escuras, "boca" central de
  espinhos que pulsa. Cor base forest-deep com highlights em forest-mid.
- **Comportamento:** lento, range médio, lança 1-2 espinhos por ataque
  em arco. HP alto, dmg médio. Não voa.
- **Telegraph:** boca de espinhos abre + flash em sun-gold antes de
  cuspir.
- **Death FX:** desabamento em pile de raízes secas + 1-2 sun-gold
  motes (pétalas que escapam).

## Stage 1-1 — Floresta dos Elfos · 1

> Single stage MVP. Sem boss, sem progressão multi-stage por enquanto.

| Field | Value |
|---|---|
| ID | `forest-1-1` |
| Length | ~1280px (mantém o já existente) |
| Background | parallax 3-camadas (canopy + mid trees + far hills) |
| Mob composition | 3 Forest Sprites + 2 Bramble Beasts |
| Spawn pattern | dispersos em x=320..1240 |
| End condition | clear all enemies |
| Tempo médio | ~2 min |
| BGM | perfil `forest` (já existente, manter) |

Sem portal-to-next, sem buff cards (por enquanto MVP de 1 stage). Após
clear → direto pra `VictoryStats`.

## Asset list

### UI (Sprint 7.G — feito via Nano Banana Pro)

- `world-map/continent.png` — overhead painted, Floresta é o NW node
- `world-map/node-forest.png` — lantern icon (símbolo da Floresta)
- `world-map/node-locked.png` — obelisco encoberto (símbolo locked)

### In-game (Sprint 7.H — pendente)

- `forest-1-1/bg-canopy.png` — canopy + sun-rays (parallax layer 0)
- `forest-1-1/bg-mid.png` — mid trees + ruins (parallax layer 1)
- `forest-1-1/bg-far.png` — distant hills + sky (parallax layer 2)
- `forest-1-1/bg-foreground.png` — front foliage decorativo
- `mobs/forest-sprite/turnaround.png` — concept art turnaround
- `mobs/bramble-beast/turnaround.png` — concept art turnaround
- (futuro) sprite sheets em pixel art para in-game render

### Audio (não-blocking, pode reusar)

- BGM `forest` profile (já implementado em Phase 5.D)
- SFX hits / footsteps / spell motes — pendente, reusar genéricos por enquanto

## Lore micro

A Floresta dos Elfos era o bosque guardião do continente — Naia cresceu
ali, treinada pelos anciões élficos no arco curto. Algo aconteceu (TBD
em 9.G): os elfos partiram, ou desapareceram, ou se transformaram em
spirit-lights. As criaturas menores que antes eram inofensivas começaram
a defender o bosque com agressividade. A Naia é a primeira a voltar.

> Este lore é placeholder — vai amadurecer junto com o McGuffin definido
> em 9.G. Por enquanto, é só pra dar tom narrativo nos textos da UI.

## Próximas decisões

- [ ] Confirmar mobs: novos (Forest Sprite + Bramble Beast) vs tematizar
      slim/racoon
- [ ] Sanctuary visual no canto NW do `continent.png` — quão proeminente?
- [ ] Day/night variant da Floresta? (futuro: mid-stage transition)
- [ ] Ambient SFX — wind, distant chimes, water drip?

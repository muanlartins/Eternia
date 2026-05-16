# Nano Banana Pro — Ícones de skills da Naia (A/S/D)

> Ícones quadrados 1:1 das 3 habilidades da Naia (A · Rajada de Flechas,
> S · Flecha-Tempestade, D · Tríplice Tempestade). Estilo de referência:
> ícones de skill da Lire/Lass do Grand Chase Season 2 — silhueta preta
> do personagem em pose de ataque + efeito brilhante esverdeado mostrando
> a mecânica da skill + fundo limpo.
>
> **Output target**:
> - `client/public/assets/skills/naia-a.png`
> - `client/public/assets/skills/naia-s.png`
> - `client/public/assets/skills/naia-d.png`
>
> **Aspect**: 1:1 (square, 1024×1024 ideal pra resize). User remove
> background se necessário.

## Bibles que sustentam

- [`09a-naia.md`](../09a-naia.md) — Naia bible + kit definido
- [`09-art-bible.md`](../09-art-bible.md) — Eternia visual style

## Reference attachments

| Arquivo | Papel |
|---|---|
| Screenshots GC dos ícones de skill da Lire/Lass S2 | **PRIMARY** layout reference — silhueta + glow effect + readable at small size |
| `client/art/anchors/naia-anchor.png` | (opcional) Naia identity ref — pra silhueta lembrar a Naia |

## Style anchor comum (cola em TODOS os 3 prompts)

```
Game skill icon in the visual style of Grand Chase Season 2 character
skill icons (Lire / Lass / Ronan archer/rogue skill icons specifically).
Square 1:1 composition. Hand-painted with simple readable iconography:

- A solid black silhouette of an elven archer character occupying part
  of the canvas, in a clear action pose. Pose conveys the skill at a
  glance. NOT a detailed character portrait — silhouette legibility
  is more important than character detail.
- Bright skill-effect visualization (arrows, glow, trails) in
  saturated emerald-green / teal accent color (Naia's signature),
  sometimes with golden-honey rim highlights for extra readability.
- Background: pure flat #FFFFFF white across the entire canvas — for
  alpha extraction (`magick -fuzz 4% -transparent white`). Output is
  a transparent-background PNG icon when post-processed.
- Style: NOT pixel art, NOT vector flat, NOT photo-real, NOT modern
  minimalist. Painted feel with confident strokes, slight grit
  consistent with painted MMORPG icon lineage. Edges crisp enough
  to read at 64×64 px after downscale.
- NO text, NO numbers, NO UI frame around the icon, NO gradient
  background, NO logo — just the painted silhouette + skill effect
  on flat white.

PALETTE:
- Silhouette: deep black (#0a0a0a) or near-black with very subtle
  inner shading
- Skill effect primary: emerald green (#3aa86a → #6ed99e gradient)
- Skill effect highlight: pearlescent teal-cyan (#a0e8d0)
- Optional warm rim accent: honey gold (#d4a574) for arrow tips

MUST NOT:
- Add text / numbers / damage values / level icons
- Add UI frames or borders around the icon
- Use cream / off-white for the background — must be exact RGB(255,255,255)
- Render the character in detailed anime style (this is an icon, not
  a portrait — silhouette legibility wins)
- Add other characters, NPCs, mobs
```

## Prompt A — Rajada de Flechas (5 flechas sequenciais)

> **Conceito**: rajada rápida de 5 flechas em sequência, mesma direção.
> Visual: silhueta da arqueira firando rápido, múltiplos rastros de flecha
> em sequência partindo do arco (motion blur de cadência).

```
[STYLE ANCHOR (cola o bloco acima)]

ICON SUBJECT (Skill A — "Rajada de Flechas"):
- Black silhouette of an elven archer in profile (3/4 view), bow
  drawn horizontally and arrow just released, body in firing stance
  (front foot forward, back arm tense)
- Position the archer in the LEFT THIRD of the canvas, facing right
- Skill effect: 4-5 emerald-green arrow trails extending FORWARD
  (right) from the bow, slightly staggered horizontally to suggest
  rapid succession (one just left the bow, one a bit ahead, one
  further ahead, etc) — like a freeze-frame of a 5-arrow burst
  in flight
- Each arrow has a brief green-glow trail behind it (motion blur
  feel), arrow tips with subtle honey-gold rim highlight
- Slight upward staggering between arrows is fine (arrows weren't
  fired all at the same exact angle), but they all read as going
  RIGHTWARD in the same general direction
- Composition occupies about 70% of the icon area, centered
  vertically, leaving small white margin on edges

INTENT: at small size (32×32, 64×64), the icon must read instantly
as "rapid horizontal arrow burst". The 4-5 arrow trails must be
distinguishable from each other but read as one cohesive volley.
```

## Prompt S — Flecha-Tempestade (alta + chuva)

> **Conceito**: flecha alta em arco íngreme, explode em chuva de
> mini-flechas que caem. Visual: silhueta atirando pra cima, e uma
> cascata de flechinhas descendo no terço superior do ícone.

```
[STYLE ANCHOR (cola o bloco acima)]

ICON SUBJECT (Skill S — "Flecha-Tempestade"):
- Black silhouette of an elven archer at the BOTTOM-LEFT of the
  canvas, bow drawn at steep upward angle (~70-75° from horizontal),
  having just released an arrow toward the upper-right
- A single trail of green-emerald light arcs from the archer up
  toward the upper-center of the canvas (the "high arrow" path)
- At the apex point in the upper-third of the canvas, a BURST
  effect: small radial explosion of 8-10 mini-arrows fanning
  downward and outward (like a firework opening), each with bright
  emerald-green glow and a small tail behind
- The mini-arrow shower dominates the upper-half of the icon —
  this is the visual signature of the skill (rain of arrows from a
  point in the air)
- Composition: archer ~25% bottom-left, arc trail diagonal up,
  burst dominating top-right ~50% area

INTENT: instantly readable as "arrow goes up, explodes into rain
above". Players must see the SOURCE (archer firing up) and the
EFFECT (raining mini-arrows from a point in the sky).
```

## Prompt D — Tríplice Tempestade (8 × 2, 5 linhas paralelas)

> **Conceito**: 8 rajadas de 2 flechas, em 5 linhas paralelas tight
> (escolhidas aleatoriamente 2 por rajada), gravidade básica = arcos
> parabólicos paralelos. Visual: silhueta firando, 5+ rastros de flecha
> em alturas próximas e ligeiramente arqueando.

```
[STYLE ANCHOR (cola o bloco acima)]

ICON SUBJECT (Skill D — "Tríplice Tempestade"):
- Black silhouette of an elven archer in profile (3/4 view), bow
  drawn horizontally, in mid-fire stance (multiple arrows leaving
  the bow region in rapid succession)
- Position the archer in the LEFT THIRD of the canvas, facing right
- Skill effect: 5-6 emerald-green arrow trails extending forward
  (rightward), arranged in TIGHT PARALLEL HORIZONTAL LANES at
  slightly different heights (compressed range, only ~1 character
  height apart between top and bottom lane). The lanes are very
  close to each other — concentrated wall of arrows, not a spread
  fan
- Each arrow has a slight downward parabolic curve (gravity arcs)
  but the curves are PARALLEL — same shape, offset vertically
- Arrows in different lanes are not perfectly aligned horizontally —
  some are further ahead in flight, some just left the bow, suggesting
  the volleyed-cascade nature of the skill (8 volleys over time)
- Bright emerald glow trails behind each arrow, arrow tips with
  honey-gold rim
- Composition occupies about 75% of the icon area

INTENT: instantly readable as "concentrated horizontal arrow rain".
The tight vertical clustering of arrow lanes is the visual
signature — distinguishes from Skill A (which is a sequential single
line) by showing MULTIPLE arrows present simultaneously at different
heights, all parallel.
```

## Workflow

```
1. Abre Nano Banana Pro no Flow
2. (opcional) anexa screenshots GC Lire/Lass icons como layout ref
3. (opcional) anexa naia-anchor.png pra silhueta lembrar Naia
4. Aspect 1:1, 1024×1024
5. Cola Prompt A → gera 2-3 variações → escolhe → salva como
     client/public/assets/skills/naia-a-raw.jpeg
6. Repete pra Prompt S e Prompt D
7. CLI:
     cd ~/repos/grand-chase/Eternia/client/public/assets/skills
     for skill in a s d; do
       magick naia-${skill}-raw.jpeg -fuzz 4% -transparent white naia-${skill}.png
     done
8. (opcional) gera tamanhos específicos:
     for skill in a s d; do
       magick naia-${skill}.png -resize 64x64 naia-${skill}-64.png
     done
```

## Validação visual

- **Legibilidade em 64×64**: cada ícone, ao ser reduzido, deve ainda
  ler instantaneamente como "rajada / chuva alta / chuva tight". Se
  borrar pra silhueta única irreconhecível, refaz.
- **Diferenciação entre ícones**: A vs D são parecidos (ambos forward).
  Diferença chave: **A tem arrows numa linha única em sequência**;
  **D tem múltiplas linhas paralelas tight simultâneas**. Os ícones
  precisam refletir essa diferença claramente.
- **Estilo GC consistente**: silhueta preta + efeito esmeralda + fundo
  branco flat. Não anime portrait, não vector clean.
- **Palette match**: emerald/teal Naia, NÃO vermelho/azul/roxo.

## Iteração se drift

- **Detalhe demais na silhueta** → follow-up "redo with simpler
  silhouette — body shape and pose readable, NO facial features
  needed, this is an icon not a portrait"
- **Cor errada** → follow-up "shift skill effect color to emerald
  green / teal-cyan accent — Naia is the elven archer, NOT a fire
  or ice character"
- **Fundo não-branco** → follow-up "redo with pure flat #FFFFFF
  white background, threshold-clean, for alpha extraction"
- **A e D parecidos demais** → follow-up "make Skill D show MULTIPLE
  parallel arrow lanes simultaneously — this is the key difference
  from Skill A which shows ONE line of sequential arrows"

## Após gerar — integração na UI (próxima passada)

Quando os 3 PNGs estiverem prontos e na pasta, eu wire na
`CharacterSelect` ability cycler — adiciono `iconUrl?: string` na
`AbilityDef` e renderizo na `heroAbilityCard`. Por enquanto, ícone
fica desconectado da UI; foco é gerar os assets primeiro.

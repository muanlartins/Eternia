# Nano Banana Pro — Floresta dos Elfos stage art

> Sprites de **stage 1-1** (gameplay). Parallax background em camadas
> + plataforma + ground + decoração foreground.
>
> **Estética alvo:** mesma da `docs/11-floresta-dos-elfos.md` — golden
> hour, ancient + mystical, palette forest-deep + sun-gold + spirit-
> teal + bark.
>
> **Pasta de saída:**
> ```
> client/src/assets/floresta/
> ├── bg-canopy.png       (parallax layer 0 — folhas no topo)
> ├── bg-mid.png           (parallax layer 1 — árvores médias)
> ├── bg-far.png           (parallax layer 2 — montanhas distantes)
> ├── platform-stone.png   (tile de plataforma élfica)
> ├── ground-tile.png      (tile de chão de musgo, repetível)
> └── foreground-vines.png (decoração à frente, opcional)
> ```
>
> **Workflow:**
> 1. Gera cada um pelo prompt
> 2. Drop no path exato
> 3. Me avisa quando lote fechar — eu codo o parallax + tiling em Pixi
>    (Background.PALETTES vira Background.SPRITES)

---

## 1. `bg-canopy.png` — Layer 0 (mais perto, no topo)

- **Aspect:** 16:5 (super wide, tileable horizontal)
- **Recomendado:** 3840×1200 (ou maior, idealmente 4096×1280)
- **Background:** painted (semi-transparente nas bordas — folhagem com
  silhueta orgânica, NÃO retângulo cheio)

```
Painted side-view illustration of dense forest canopy seen from
underneath, occupying the upper third of the frame. Deep emerald and
forest-green leaves layered thickly, with shafts of warm sun-gold
light piercing through gaps from above. Some branches and twisted
vines hang down as silhouettes. The bottom edge of the canopy is
ORGANIC and IRREGULAR (leaf shapes, hanging vines, dappled light) —
NOT a flat horizon line. The TOP edge fades softly to transparent
(or to dark forest sky) so this layer can sit over `bg-mid.png`
without a hard seam.

Tileable: the LEFT and RIGHT edges should match perfectly so the
image can be repeated horizontally. Show 3-4 distinct "tree clusters"
spread across the frame so the tiling doesn't read as same-pattern.

Style: hand-painted Korean MMORPG / Studio Ghibli forest, slightly
stylized, NOT photorealistic. Bold but soft brush strokes. Color
palette: forest-deep #1a3a2a, mid-forest #2d5a3d, sun-gold #f5c870,
warm bark #3d2817.

Lighting: golden hour from above-left, warm sun-gold rays cutting
diagonally through the canopy gaps. Subtle volumetric haze.

Background: painted (NOT white). The TOP of the image fades to a soft
golden-green sky tint. The BOTTOM has organic leaf silhouettes
suggesting the forest continues below.

Aspect ratio 16:5 (very wide). NO text, NO labels, NO watermark,
NO characters or creatures.
```

---

## 2. `bg-mid.png` — Layer 1 (meio)

- **Aspect:** 16:7 (wide, tileable horizontal)
- **Recomendado:** 3840×1680
- **Background:** painted (transparente nas bordas verticais — silhueta
  da floresta, NÃO retângulo)

```
Painted side-view illustration of mid-distance elven forest, showing
tree trunks and broken stone ruins. Tall ancient trees with twisted
silver-grey bark and deep emerald canopies fill the frame at varying
distances. Between trees: weathered moonstone arches and broken elven
statues partially overgrown with ivy and glowing teal moss. A
suggestion of mossy ground at the very bottom. Faint warm volumetric
haze drifting between trunks.

Tileable: LEFT and RIGHT edges match for horizontal repeat. Show 5-6
distinct landmarks (trees + ruins) across the frame for variation.

The TOP fades soft to transparent (where canopy layer will overlap).
The BOTTOM has irregular silhouettes (tree roots, mossy ground edges,
some loose grass tufts) — NOT a flat line.

Style: hand-painted Korean MMORPG / Studio Ghibli forest. Slightly
stylized, painted brush strokes visible. Atmospheric perspective —
trees in this layer are MID-distance, slightly faded vs sharp.

Color palette: forest-deep #1a3a2a (dark trunks), mid-forest #2d5a3d,
spirit-teal #6abf95 (moss + glow), stone-pale #c8b896 (ruins),
sun-gold #f5c870 (haze accents).

Lighting: golden hour, warm sun filtering from upper-left at a low
angle. Long warm shadows. Spirit-teal glow on rune-stones.

Background: painted (NOT white). Upper area fades to soft warm haze.
Some sky visible between treetops at the top.

Aspect ratio 16:7. NO text, NO labels, NO watermark, NO characters.
```

---

## 3. `bg-far.png` — Layer 2 (mais longe, fundo total)

- **Aspect:** 16:9 (tela cheia, tileable horizontal)
- **Recomendado:** 3840×2160
- **Background:** painted, sólido até a borda

```
Painted wide vista of distant elven forest landscape under golden
hour sky. Far-away misty mountain ridges in the deep background fading
into warm haze. Middle-distance: rolling treetops of an endless
elven forest, soft and indistinct, painted as silhouettes against the
sky. Foreground (lower 1/3): just the suggestion of a forest valley,
trees blurred into a unified mid-tone. The horizon line is around
55-60% from the top.

Tileable: LEFT and RIGHT edges match for horizontal repeat. The vista
should feel "infinite" so repetition isn't obvious.

The SKY occupies the top half — golden-orange near the horizon fading
to soft teal-emerald higher up, with a few warm cloud streaks. A
suggestion of late-afternoon sun glow at upper-left, no harsh disk.

Style: hand-painted Korean MMORPG / Studio Ghibli landscape vista,
soft atmospheric perspective, painted brush strokes. Distant elements
intentionally low-detail (depth cue).

Color palette: sun-gold #f5c870 (sky lower), spirit-teal #6abf95
(sky upper), forest-deep #1a3a2a (silhouettes), warm-haze
rgba(245,200,112,0.18).

Lighting: golden hour, sun low and slightly behind/upper-left. Warm
backlit clouds. Silhouettes catch warm rim light.

Background: painted, full-bleed (no transparency). Image fills entire
frame edge to edge.

Aspect ratio 16:9. NO text, NO labels, NO watermark, NO characters
or creatures, NO foreground details (those come from bg-mid + canopy
layers).
```

---

## 4. Plataforma élfica musgosa — VARIATION SET (4 sprites)

> **REGRA DE OURO:** o gameplay é **2D side-scroll ortográfico**. A
> câmera olha DIRETAMENTE pra cena, paralela ao plano XY. Não tem
> perspectiva, não tem foreshortening, não tem 3/4. Tipo Hollow Knight,
> Celeste, Dead Cells, Ori and the Blind Forest.
>
> **CONCEITO DE VARIATION SET:** as 4 plataformas são "irmãs visuais" —
> mesma matéria-prima, mesma idade, mesma palette, mesmo estilo de
> lineart. Ao ver as 4 lado a lado o jogador deve pensar **"isso é o
> mesmo conjunto"**, não 4 plataformas de mundos diferentes. A diferença
> é só **dimensão** + **detalhe localizado** (uma rune extra aqui, um
> chip ali). É a mesma lógica dos 3 footstep SFX que alternam: irmãos,
> não estranhos.

| Filename | Aspect | Tamanho | Função |
|---|---|---|---|
| `platform-small.png` | 2:1 | 1024×512 | step pequeno (1 pulo) |
| `platform-medium.png` | 4:1 | 2048×512 | plataforma média |
| `platform-large.png` | 6:1 | 3072×512 | corredor longo (vai precisar 2-3 sprites em sequência num stage) |
| `platform-pillar.png` | 1:2 | 512×1024 | pilar vertical (escala / parkour) |

> **Resolução grande de propósito** — Vite faz down-scaling fino, mas
> upscaling estraga. Gera grande, escala pra baixo no engine se precisar.

### Prompt base (cole nos 4, depois adicione o **modificador específico**)

```
A 2D side-scroller game asset sprite, painted in the visual language
of a 2.5D anime metroidvania (Hollow Knight, Ori and the Blind Forest,
Dead Cells, Salt and Sanctuary).

SUBJECT: an ancient elven stone platform — a horizontal slab of
weathered moonstone seen STRICTLY FROM THE SIDE. The viewer's eye is
EXACTLY level with the platform; the camera is ORTHOGRAPHIC (no
perspective convergence, no foreshortening, no 3/4 rotation, no
isometric tilt). The visible faces are: the FLAT TOP (where the
player walks, a thin horizontal strip of mossy stone) and the FLAT
FRONT FACE (the vertical wall facing the camera). NO TOP-DOWN
SURFACE VISIBILITY beyond a thin moss strip — if the moss looks like
it's "covering an angled top", that's wrong. The top is razor-flat
horizontal.

MATERIALS:
- Stone: weathered moonstone, pale grey-cream (#c8b896), with subtle
  cracks and chips. Faint warm undertone where sun hits it.
- Moss: thick green-teal carpet (#6abf95 mid, #1a3a2a deep) cascading
  over the top edge and dripping a few centimeters down the front
  face in irregular tongues. NOT a clean horizontal stripe — it
  drapes organically.
- Runes: shallow-carved elven sigils on the front face, glowing very
  faintly with warm amber light (#f5c870), as if catching golden hour.
  Use angular Norse-rune-adjacent shapes (NOT real Latin letters,
  NOT readable text).
- Bottom: irregular drip of moss tendrils + 1-2 fine root strands
  hanging slightly below the platform's lower edge.

LIGHTING: a single soft sun-gold key light from upper-left at ~60°,
producing a warm highlight on the top-left moss + a cool teal
shadow side on the right under the moss drape. Subtle ambient
occlusion under the platform's bottom lip. NO cast shadow on the
background (the platform floats; shadow lives within its own form).

LINEART: bold clean black outlines (~2-3px equivalent), slightly
rough hand-painted feel, NOT computer-perfect. Inner detail lines
softer / thinner than silhouette.

PALETTE (USE EXACTLY): stone-pale #c8b896, spirit-teal #6abf95 (moss
mid), forest-deep #1a3a2a (moss shadow), sun-gold #f5c870 (rune
glow), bark #3d2817 (dirt creases / root tendrils), warm-amber
#d4a574 (highlights).

TILING (CRITICAL — for sizes that may sit edge-to-edge):
- LEFT EDGE: clean vertical break with moss bleeding past it slightly.
- RIGHT EDGE: complementary vertical break — when this sprite sits
  next to a copy of itself at the same Y, the moss bleeds + chip
  patterns should READ AS CONTINUOUS, no obvious seam.
- Mentally render a horizontal triple-loop of this sprite — the
  result should look like a longer platform, not three identical
  stamps.

BACKGROUND: plain white (#FFFFFF), totally clean. No shadows on
background, no atmospheric haze, no environmental fragments. Just
the platform on white. (User removes white externally.)

WHAT THIS IS NOT (avoid these failure modes):
- NOT a 3/4 angled view ("isometric platform with visible top
  surface like a Sims object"). FAIL.
- NOT a fully 3D rendered piece with perspective convergence. FAIL.
- NOT a top-down tile (where you'd see grass from above). FAIL.
- NOT a concept-art piece with cinematic camera. FAIL.
- IT IS a flat painted asset for a 2D side-scrolling platformer.

NO text, NO labels, NO watermark, NO characters, NO monsters.
```

### Modificadores por sprite (cole DEPOIS do prompt base)

**`platform-small.png`** (canvas 2:1):
```
This is the SMALLEST variation in the set — a single stepping-stone
just wide enough for one footprint. Aspect ratio 2:1, the platform
fills the full width but stays compact. ONE small rune carved on
the front face, centered. ONE small chip on the top-left edge.
```

**`platform-medium.png`** (canvas 4:1):
```
MEDIUM variation in the set — a comfortable platform for 3-4
footsteps. Aspect ratio 4:1. The platform fills the full width.
TWO runes carved on the front face, evenly spaced. Moss has a
gentle natural-looking drape, slightly heavier on the LEFT third
than the right.
```

**`platform-large.png`** (canvas 6:1):
```
LARGEST variation in the set — a long elven corridor stone, designed
to feel like a stretch the player traverses with multiple footfalls.
Aspect ratio 6:1 (very wide). The platform fills the full width.
THREE runes carved across the front face at uneven spacings (NOT
evenly spaced — that'd read as artificial). Moss draping is
asymmetric: a heavier patch on the left third, lighter mid, a
small drip on the right. ONE small chip on the right side and ONE
on the lower-middle.
```

**`platform-pillar.png`** (canvas 1:2 — taller than wide):
```
VERTICAL variation — this is the SAME elven stonework but standing
UPRIGHT as a pillar (think: a chunky column-cap, like a giant
fence-post). Aspect ratio 1:2 (TALLER than wide). The TOP is the
walkable surface (small flat moss patch, the player can stand on
it for a single footfall). The SIDES are taller versions of the
"front face" of the other platforms — moss dripping down both
sides, runes climbing vertically (3-4 runes stacked top-to-bottom).
The bottom is rooted into ground (some moss + root tendrils there).
NO tiling needed — this is a discrete object, but make sure left
and right edges are symmetrical.
```

---

## 5. Ground tile — VARIATION SET (3 sprites)

> Mesma filosofia das plataformas: **3 irmãs visuais** com o mesmo
> stone language. O engine alterna entre elas tipo `a, b, a, c, a, a,
> b, c, a` ao tilar o chão de uma stage de 30 metros — quebra a
> percepção de "tile copy/paste" que mata a estética de painted-2D.

| Filename | Aspect | Tamanho | Frequência sugerida |
|---|---|---|---|
| `ground-tile-a.png` | 2:1 | 1024×512 | "padrão" — alterna ~60% das instâncias |
| `ground-tile-b.png` | 2:1 | 1024×512 | "com cogumelos" — ~25% das instâncias |
| `ground-tile-c.png` | 2:1 | 1024×512 | "com raiz" — ~15% das instâncias |

### Prompt base

```
A 2D side-scroller game asset sprite, painted in the visual language
of a 2.5D anime metroidvania (Hollow Knight, Ori and the Blind
Forest, Dead Cells, Salt and Sanctuary).

SUBJECT: a horizontal cross-section of forest floor seen STRICTLY
FROM THE SIDE. The viewer's eye is at ground level looking
horizontally; the camera is ORTHOGRAPHIC (no perspective, no
foreshortening, no 3/4 angle, no top-down tilt). What's visible:

- TOP ~25% of canvas: thick mossy carpet (the surface the player
  walks on). The TOP edge of the canvas is a clean horizontal
  "walkable line" with a slightly irregular natural bumpy outline
  (moss tufts), but conceptually flat — the player walks along
  the top edge.
- MIDDLE ~50% of canvas: dark loam dirt cross-section with
  exposed twisted roots running horizontally + diagonally through
  it. A few small embedded glowing teal "spirit-pebbles". Some
  small fallen amber leaves resting on a root or crack.
- BOTTOM ~25% of canvas: deeper soil fading darker, with a single
  larger root or two cutting through. The bottom edge of the
  canvas is the deepest point (no walkable line there — it's
  geological "bedrock").

MATERIALS:
- Moss carpet: green-teal (#6abf95 with #1a3a2a shadows), thick and
  fluffy.
- Dirt: dark loam (#3d2817 base), with #1a3a2a shadows in cracks
  and #d4a574 highlights catching the warm sun on raised soil.
- Roots: bark-brown (#3d2817), gnarled and twisted, with subtle
  moss patches climbing them.
- Spirit pebbles: small smooth stones glowing #6abf95 with halo.
- Leaves: warm amber (#d4a574), sparse.

LIGHTING: warm sun-gold (#f5c870) from above-left hits the moss
carpet on top. Dirt below stays in cool shadow. Subtle volumetric
sun beam descending from upper-left into the soil cross-section
(soft, not photographic).

LINEART: bold clean black outlines (~2-3px equivalent) on roots,
spirit-pebbles, mushroom outlines if present. Moss + dirt are
softer / painted, less hard-edged.

PALETTE (USE EXACTLY): bark #3d2817 (dirt + roots), forest-deep
#1a3a2a (moss shadow + crack shadows), spirit-teal #6abf95 (moss +
spirit pebbles), warm-amber #d4a574 (leaves + dirt highlight),
sun-gold #f5c870 (sun beam + glow halos).

TILING (CRITICAL):
- LEFT EDGE: clean vertical break.
- RIGHT EDGE: when this sprite sits next to a copy of itself OR
  next to its sibling variations (a/b/c), the moss + dirt + roots
  should read as CONTINUOUS GROUND. No obvious seam.
- Mentally render a horizontal alternating loop a-b-a-c-a — the
  result should look like a varied natural ground, not 5 stamps
  with edges visible.
- Do NOT place a giant landmark detail straight on the LEFT or RIGHT
  edge — it'd cut at the seam ugly.

BACKGROUND: plain white (#FFFFFF). No shadows on background.
(User removes white externally.)

WHAT THIS IS NOT:
- NOT a top-down tile (where you'd see the moss surface from above).
  FAIL.
- NOT a 3/4 isometric tile. FAIL.
- NOT a 3D-rendered terrain piece. FAIL.
- IT IS a flat painted ground cross-section seen from the side, like
  a 2D platformer.

Aspect ratio 2:1. NO text, NO labels, NO watermark.
```

### Modificadores por sprite

**`ground-tile-a.png`** — versão padrão / mais comum:
```
This is the BASELINE variation — clean and uneventful. The moss
carpet on top is even, the dirt below has 2-3 small roots crossing
horizontally + 1-2 small spirit-pebbles embedded in the dirt. NO
mushrooms, NO large landmarks. Distributed detail, designed to
appear most often without being noticed.
```

**`ground-tile-b.png`** — variação com cogumelos brilhantes:
```
This is the MUSHROOM variation. Same exact ground language as the 
baseline, BUT add a small cluster of 3-5 glowing amber/yellow
mushrooms (#f5c870 caps with #d4a574 stems) growing FROM the moss
surface, positioned in the center-left or center-right (NOT touching
the LEFT or RIGHT edge of the canvas — keep the edges clean for
tiling). Each mushroom has a soft glow halo. The mushrooms are
small (heights ranging 8-15% of canvas height). Treat them as a
quiet detail player notices in passing, not the focal point.
```

**`ground-tile-c.png`** — variação com raiz exposta:
```
This is the EXPOSED ROOT variation. Same exact ground language as
the baseline, BUT replace the dirt section's straight horizontal
roots with ONE larger gnarled root that ARCS up out of the dirt,
cresting through the moss surface near the canvas center, then
arcing back down into the dirt — like a serpent surfacing briefly
through soil. The root is bark-brown (#3d2817) with a few patches
of moss (#6abf95) growing on its top side. Keep the LEFT and RIGHT
edges clean (root doesn't touch them). The root is a focal element
but reads as natural / organic, not artificial.
```

---

## 6. `foreground-vines.png` — Decoração foreground (opcional)

- **Aspect:** 16:2 (super wide, baixo)
- **Recomendado:** 3840×480
- **Background:** plain white (`#FFFFFF`)
- **Estágio:** opcional — só gera se quiser depth extra. O jogo
  funciona com bg-canopy + bg-mid + bg-far + platform + ground.

```
Painted decorative foreground band — drooping ivy vines, hanging moss,
glowing fey-light orbs (small spirit-teal motes), and the suggestion
of out-of-focus tall grass. This layer renders IN FRONT of the player
(slight motion blur / depth-of-field feel suggesting it's between the
camera and the action).

Composition: vines and moss hang from the TOP edge, occupying roughly
upper 60% of the frame. The BOTTOM 40% has soft blurred grass + a
few fey-light orbs scattered. The image is sparse — most of the frame
is transparent / white space, only sparse decorative elements.

Tileable: LEFT and RIGHT edges match for horizontal repeat. Place
3-4 vine clusters spread out (not edge-to-edge dense).

Style: painted Korean MMORPG forest foreground, soft slight blur on
distant elements, bold lineart on vines.

Color palette: forest-deep #1a3a2a (vines in shadow), mid-forest
#2d5a3d (vine highlights), spirit-teal #6abf95 (fey-light orbs +
glow), sun-gold #f5c870 (orb cores).

Lighting: dim, slight back-rim from sun-gold suggesting backlit.
Glow halos on the fey-light orbs.

Background: plain white (#FFFFFF), no shadow. Subject is sparse —
LOTS of white space around the decorative elements.

Aspect ratio 16:2. NO text, NO labels, NO watermark, NO characters.
```

---

## Iteração

Mesmas regras dos prompts anteriores:
- Drift = sobe a versão problemática + edit instruction
- White bg pros isolados (você remove); painted pros parallax
- Resolução matters — gera no maior tamanho que o tier permitir

## Próxima fase (depois que esses 6 estiverem prontos)

Eu codo:
1. Stage background como **3 layers Pixi** com diferentes scroll factors
   (canopy 0.4× · mid 0.7× · far 0.2×)
2. Platform sprite swap nos `Stage.platforms[]`
3. Ground tile como `TilingSprite` Pixi
4. Foreground vines como overlay (se gerar)
5. Particle spawner pra fey-light orbs animados (motes + fireflies),
   tipo o que já temos em CharSelect

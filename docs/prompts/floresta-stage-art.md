# Nano Banana Pro — Floresta dos Elfos (forest-1-1) ancorado em S2

> **Pivot 3 — 2026-05-09**: agora com referência visual do GC Season 2
> (BR Level Up 2010-01-20) — **canon de nostalgia oficial do Eternia**.
> 14 PNGs extraídos de `Texture/Map0.kom` (V.0.2 plain) salvos em
> `client/art/gc-reference/s2/forest-of-elf/`.
>
> Pipeline de extração documentada em `~/repos/grand-chase/docs/runbook-extract-kom.md`.
>
> Comparação com S1 / Steam Classic em `~/repos/grand-chase/docs/gc-version-comparison.md`.

## Bibles que sustentam estes prompts

- [`11-floresta-dos-elfos.md`](../11-floresta-dos-elfos.md) — biome bible
- [`09-art-bible.md`](../09-art-bible.md) — Eternia visual style
- **`client/art/gc-reference/s2/forest-of-elf/`** — 14 PNGs de referência S2 ⭐

## Referências S2 — usa como input visual no Nano Banana Pro

| Filename | Conteúdo | Use case |
|---|---|---|
| `40_1.png` | Plataformas com cogumelos roxos + flores violeta + raízes | **Ancora pra ground.png e plataforma elevada** |
| `40_2.png` | Plataforma com cogumelo creme gigante + grass topping | Variação de plataforma elevada |
| `40_3.png` | Plataforma com cluster de cogumelos | Plataforma "rica" / hero piece |
| `41_1.png` | Stage com cogumelo gigante teal + plataformas escalonadas | Composition reference (entradas) |
| `42_1.png` | Cluster icônico de cogumelos (vermelho clássico + amarelo + creme) | **Ancora pra platform.png** ⭐ |
| `43_1.png` | Plataformas elevadas + cogumelo creme + flores roxas | Variação plat |
| `sky40.png` | **Background atmosférico**: árvores backlit + sun rays + grama | **Ancora pros parallax bgs** |
| `sky45.png` | Templo antigo (outro bioma) | Não usar pra Forest |
| `sky46.png` | (similar a sky40) | Variação atmosférica |

## DNA visual do S2 Forest of Elf (descrição canônica)

Baseado nos PNGs analisados:

- **Plataformas**: galhos de árvore com **grass topping** (verde médio
  saturado), pedras de musgo nas pontas, mossy texture nos lados, raízes
  pendurando.
- **Cogumelos signature**:
  - Cogumelo creme/marfim grande (chapéu plano em tampa de mesa)
  - Cogumelo vermelho clássico com bolinhas brancas (Amanita)
  - Cogumelo amarelo brilhante pequeno
  - Cogumelo teal/turquesa raro (acento de cor)
- **Flora**:
  - **Flores violeta de 5 pétalas** (signature — vão em todas as
    plataformas)
  - **Berries roxos em clusters pequenos** (signature — sempre 3-4
    bagas roxas)
  - **Folhas amarelo-mostarda** brotando das laterais
- **Estrutura material**:
  - Madeira: marrom-quente + casca rugosa (#5a3d2a, #8b6938)
  - Pedra musgosa: cinza-azulado claro com líquen verde
  - Grass: verde-mid saturado (#5a8a3c)
- **Lighting**: golden hour, sun rays atravessando o canopy a partir de
  upper-right, atmosfera em tons quentes.
- **Sky background**: árvores enormes em silhouette dark vs light
  atmospheric com sunbeams (volumetric light) + grass plano no chão.

## Pasta de saída

```
client/src/assets/floresta/maps/forest-1-1/
├── ground.png        ← gerar com prompt #1 abaixo
├── platform.png      ← gerar com prompt #2 abaixo
└── (loading.png)     ← futuro, gerar com prompt #3 quando precisar
```

---

## Prompt #1 — Ground (chão da Floresta)

**Filename**: `client/src/assets/floresta/maps/forest-1-1/ground.png`
**Aspect**: 5:1 (~2048×400 ou 2560×512)
**Background**: painted (não transparente)
**Reference visual no Nano Banana**: anexar `40_1.png` + `40_2.png` da pasta de reference

### Prompt textual

```
Wide horizontal painted ground sprite for a 2D side-scrolling
platformer, inspired by Grand Chase Season 2 Forest of Elf (2010
era — see attached reference image). Ancient elven forest floor at
golden hour. View is straight from the side (orthographic).

ASPECT: 5:1 horizontal, e.g., 2048×400 or 2560×512. The image is
exclusively the walkable surface plus dirt/soil below — NO sky, NO
canopy, NO trees standing. Just the ground/path.

CONTENT (continuous left to right):
- Top edge (~30%): clearly defined grass-and-moss line where the
  character will plant feet. Saturated mid-tone forest green
  (#5a8a3c, #3d6446). Grass tufts moderately detailed but not
  busy. Slight undulations across the width — small bumps, never
  jagged enough to confuse silhouettes.
- Middle band (~30%): exposed mossy roots crossing the ground,
  small flat stones, fallen leaves, decorative tiny mushrooms
  (small white-and-red Amanita, small yellow ones), scattered
  purple violet flowers (5-petal, signature S2). Mid-tone palette
  throughout — character sprites need to silhouette cleanly.
- Bottom band (~40%): darker dirt/soil with root tendrils
  descending, fading to deeper earth-brown (#3a2515) at very
  bottom. Hint of cross-section showing buried stones.

LIGHTING: golden hour, soft warm sunlight from upper-right.
Subtle warm highlights on grass tops, no harsh contrasts.

STYLE: hand-painted 2D, painterly brushstrokes visible, anime-modern.
Match the saturation and color depth of the reference image. NOT
photorealistic. NOT pixel art. Think: classic Korean MMORPG painted
ground (Grand Chase, Elsword), Ori and the Blind Forest textures,
Hollow Knight (less moody).

PALETTE (anchor on S2 reference):
- forest-deep #1f3326
- forest-mid #3d6446
- moss-saturated #5a8a3c
- earth-warm #5a3d2a
- earth-deep #3a2515
- violet-flower #6b4d8c (signature)
- berry-purple #4d2a5e (signature)
- sun-gold #d4a574 (highlight tips)

CRITICAL: this is GROUND ONLY — no platforms (those are separate
sprites), no characters, no creatures, no UI, no sky, no trees
standing. The image will stretch to fill the stage width. Keep top
silhouette zone moderately detailed but readable; busy enough to
look painted, not so busy that 64px-tall character sprites get lost.

Style note: redraw inspired by the reference S2 Forest of Elf —
SAME silhouette conventions, SAME palette family, SAME mushroom-
flora-grass DNA — but NOT a copy. Modern higher-resolution
brushwork, refined detailing, original composition.
```

## Prompt #2 — Platform (plataforma flutuante reusável)

**Filename**: `client/src/assets/floresta/maps/forest-1-1/platform.png`
**Aspect**: ~3:1 (~600×180 ou 800×240)
**Background**: white #ffffff (você remove externamente pra alpha)
**Reference visual no Nano Banana**: anexar `42_1.png` + `40_3.png`

### Prompt textual

```
Single floating elven platform sprite for a 2D side-scrolling
platformer, inspired by Grand Chase Season 2 Forest of Elf (2010
era — see attached reference image). Ancient mossy carved wood
+ stone with a SIGNATURE cluster of S2 forest mushrooms on top.

ASPECT: ~3:1 horizontal, e.g., 600×180 or 800×240.

DESIGN — top-down body of platform:
- Top: flat-ish horizontal grass surface where character stands.
  Saturated mid-tone green grass (#5a8a3c) with moss patches.
  Clearly defined edge.
- The CLUSTER on top (signature S2 element):
  - 1 large cream/ivory mushroom (umbrella-cap style)
  - 1 classic red-with-white-spots mushroom (Amanita, smaller)
  - 1-2 small bright yellow mushrooms
  - 2-3 violet 5-petal flowers (signature)
  - 1 cluster of purple berries (3-4 small spheres)
- Bottom face: mossy carved wood + stone hybrid — bark texture
  warm brown (#5a3d2a) blending into mossy stone (#7a8a5c).
- Sides: roots and ivy cascading downward in soft strands, some
  dripping past the platform's lower edge by ~30-50px. Asymmetric
  organic — NOT perfectly rectangular.

LIGHTING: golden hour from upper-right. Top mushrooms catch warm
sun-gold highlights. Underside in soft shadow with ambient
teal-green bounce light from below.

STYLE: hand-painted 2D, painterly, anime-modern. Same aesthetic
as the ground sprite (consistent palette family). Saturation-true
to the S2 reference attached.

PALETTE — same anchor as ground. Plus mushroom accents:
- mushroom-cream #efd9b0
- mushroom-red #c44a32 (Amanita cap)
- mushroom-yellow #f0c44a
- spot-white #fff8e8 (Amanita spots)

BACKGROUND: pure white #ffffff (will be removed externally for
alpha). Do NOT add a colored or patterned bg — only the platform
isolated on white.

NO characters, NO ground attached below, NO sky, NO floating
extras outside the platform itself. Just the platform with its
mushroom-flora cluster on top.

Style note: redraw inspired by the S2 reference — SAME mushroom
species, SAME violet flower with 5 petals, SAME purple berry cluster,
SAME platform silhouette logic — but in modern higher-resolution
painting with refined brushwork. NOT a copy.
```

## Prompt #3 — Loading screen (futuro)

**Filename**: `client/src/assets/floresta/maps/forest-1-1/loading.png`
**Aspect**: 16:9 (1920×1080)
**Background**: painted full-frame
**Reference visual no Nano Banana**: anexar `sky40.png` + a imagem com 2 árvores que você gerou no primeiro round

### Prompt textual

```
Cinematic painted loading screen for a 2D action platformer's first
stage, inspired by Grand Chase Season 2 Forest of Elf entrance
(see attached reference). 16:9 horizontal aspect.

COMPOSITION:
- Foreground left: large ancient tree trunk with mossy bark, vines
  hanging, partially silhouetted by golden backlight
- Foreground right: smaller tree trunk + flowering bush with violet
  signature flowers and purple berry clusters
- Center: a clearing with the path leading deeper, dappled sunlight
  hitting moss + flowers
- Mid-ground: more trees in atmospheric haze, cyan-teal cool tones
- Background: dense forest canopy in silhouette, warm sun rays
  cutting through (volumetric light)

LIGHTING: peak golden hour, dramatic backlight. Trees in
foreground silhouetted, ground in clearing receives warm light
spill. Mood = peaceful but expectant — first-stage feel.

STYLE: painted 2D cinematic, hand-painted brushwork visible,
anime-modern. Same palette family as the in-game ground/platform
sprites for visual continuity.

PALETTE: same forest palette + warm sun-gold highlights from
backlight + cool teal-green atmospheric mid-tone.

NO characters, NO UI, NO text overlays — pure environment painting
that will sit behind a UI frame at runtime ("Carregando..." +
title overlay rendered in HTML over the painting).

Style note: capture the cinematic essence of Grand Chase's
"Floresta do Desafio" loading splash and the S2 sky40 background
— same depth, same backlit trees feel — but in modern higher-
resolution painted style. NOT a copy.
```

---

## Workflow no Nano Banana Pro

1. **Para ground** (prompt #1):
   - Imagens de input: `gc-reference/s2/forest-of-elf/40_1.png` + `40_2.png`
   - Aspect: 5:1 (no Nano Banana use "wide" preset ou specify dimensions)
   - Cola o prompt #1 textual
   - Gera 2-3 variações, escolhe a que tem melhor leitura horizontal

2. **Para platform** (prompt #2):
   - Imagens de input: `gc-reference/s2/forest-of-elf/42_1.png` + `40_3.png`
   - Aspect: ~3:1
   - Cola o prompt #2 textual
   - Gera 2-3 variações
   - **CRÍTICO**: bg branco puro pra você remover externamente

3. **Para loading screen** (prompt #3, futuro):
   - Imagens de input: `gc-reference/s2/forest-of-elf/sky40.png` + a primeira imagem cinematic que você gerou
   - Aspect: 16:9 (1920×1080)
   - Cola o prompt #3
   - Gera + guarda pra usar no loading screen estilo GC Chaos

---

## Validação visual antes de exportar

Pra cada asset gerado:

1. **Ground**: a top silhouette zone (parte superior 30%) está livre de
   detalhe excessivo? Personagem 64px de altura silhouete cleanly?
2. **Platform**: top edge é flat e definido? bg é branco puro pra
   removal? signature S2 elementos (Amanita + violet flower + berries)
   estão presentes?
3. **Loading**: 16:9 com space pra UI overlay (header + título +
   borders decorativas) sem arte conflitante?

---

## Próximas stages (futuras prompts)

Cada uma com sua reference S2 (Map0 41_*, 42_*, 43_* ou outro Map.kom):

- **forest-1-2**: Trilha Iluminada — uses Map0 41_* references (cogumelo teal, mais cogumelos densos)
- **forest-1-3**: Floresta Profunda — Map0 43_* references (palette mais saturated, larger umbrella mushrooms)
- **forest-1-4**: Antro do Insectivorous — extrair Map adicional (ou usar S5 Dun_Bermesiah_8-12 se decifrar V.0.4)

Pântano dos Esquecidos viria de outro Map.kom da S2 ou de S5 Bermesiah dependendo de qual desbloqueamos.

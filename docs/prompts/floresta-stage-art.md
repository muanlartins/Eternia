# Nano Banana Pro — Floresta dos Elfos (forest-1-1) ancorado em S2

> **Pivot 5 — 2026-05-09**: agora **single-image 3:1-em-16:9 com letterbox
> branco**. Em vez de gerar 3 slices independentes (que produzem seams
> visíveis na composição), mandamos **`40.png` (1620×540, junção S2)**
> como input único e pedimos um output 16:9 com a arte pintada confinada
> a uma faixa central 3:1 e bandas brancas em cima/embaixo. Pós-processo
> recorta as bandas brancas via `tools/crop-letterbox.py` → `map.png` 3:1.
>
> Vantagem: composição **coerente** (sem seams), uma única geração no
> Flow, conteúdo contínuo de ponta a ponta.
>
> Per-slice (3× 1024×1024) continua como **fallback** caso a geração
> single-image fique muito reframe — ver seção "Fallback per-slice" no fim.

## Conceito

O Flow (Nano Banana Pro) só aceita aspectos preset (`16:9`, `9:16`, `1:1`,
`4:3`, `3:4`) — não tem ultrawide. Mas **o output pode ser instruído a
deixar bandas brancas em cima/embaixo**, limitando a arte ao centro do
canvas. Como nosso stage é 3:1 (`map.png` cobrindo `1536×512` =
`width:height = 3:1`), pedimos:

- Output: 16:9 (1920×1080)
- Faixa pintada central: 3:1 (= 1920×640, vertically centered)
- Top white: 220px (~20% canvas height)
- Bottom white: 220px (~20% canvas height)

Depois rodamos `crop-letterbox.py`: ele detecta linhas predominantemente
brancas no topo/fundo, recorta → `map.png` 3:1. Opcionalmente redimensiona
pra `1536×512` (target stage).

## Bibles que sustentam

- [`11-floresta-dos-elfos.md`](../11-floresta-dos-elfos.md) — biome bible
- [`09-art-bible.md`](../09-art-bible.md) — Eternia visual style
- **`client/art/gc-reference/s2/forest-of-elf/`** — 14 PNGs S2 ⭐
  - `40.png` (1620×540) — junção dos 3 slices, **input pro single-image** ⭐
  - `40_1.png` / `40_2.png` / `40_3.png` (512×512 cada) — usados no fallback per-slice
  - `sky40.png` — atmospheric bg, usado no Prompt #2 (loading)

## Bibles que sustentam

- [`11-floresta-dos-elfos.md`](../11-floresta-dos-elfos.md) — biome bible
- [`09-art-bible.md`](../09-art-bible.md) — Eternia visual style
- **`client/art/gc-reference/s2/forest-of-elf/`** — 14 PNGs S2 ⭐
  - `40.png` (1620×540) — junção dos 3 slices, hero composite
  - `40_1.png` (512×512) — slice esquerdo
  - `40_2.png` (512×512) — slice central
  - `40_3.png` (512×512) — slice direito

## Pasta destino

```
Eternia/client/public/assets/floresta/maps/forest-1-1/
├── raw-16-9.jpeg     ← saída direta do Nano Banana (1920×1080, com bandas brancas)
├── cropped-3-1.png   ← após crop-letterbox.py (1920×640, ainda com bg)
├── map.png           ← após bg removal (alpha 1536×512) — usado pelo engine
└── (loading.png)     ← futuro, prompt #2
```

---

## Prompt #1 — Single-image retex em 16:9 com letterbox 3:1

**Aspect**: 16:9 (Flow output, 1920×1080)
**Faixa pintada**: 3:1 horizontal central (1920×640)
**Bandas brancas**: ~220px topo, ~220px fundo, pure flat #FFFFFF
**Reference visual**: anexar `40.png` (1620×540, junção dos 3 slices S2)

### Prompt textual

```
Reference-driven foreground sprite for a 2D side-scrolling
platformer stage. Use the attached Grand Chase Season 2 Forest
of Elf horizontal cross-section as a LAYOUT REFERENCE for the
ENTIRE wide horizontal scene.

OUTPUT CANVAS: 16:9 horizontal (1920×1080).

LAYOUT WITHIN THE CANVAS — CRITICAL:
- The painted forest foreground geometry must occupy ONLY the
  CENTRAL HORIZONTAL BAND of the canvas — a 3:1 strip that
  fills the full canvas width and is roughly 60% of canvas
  height (1920×640, vertically centered).
- The TOP ~20% of the canvas (~220px tall) MUST be filled with
  pure flat #FFFFFF white. No painted content at all up there,
  no gradient, no canopy bleeding up — solid white margin only.
- The BOTTOM ~20% of the canvas (~220px tall) MUST also be pure
  flat #FFFFFF white. Same rule — no painted content,
  no gradient.
- Think of it as a horizontal mat-board: a wide painting pasted
  into the center of a white poster. Only the central 60%-tall
  strip is painted; above and below is uniform white margin.

PAINTED CONTENT (in the central 3:1 strip — match the input):
- ONLY the walkable foreground props themselves: every platform,
  mushroom, flower, berry cluster, root, stone, dirt patch,
  hanging foliage from the input, in the same positions and
  silhouettes
- All gaps, negative space, and surroundings AROUND and BETWEEN
  those props (still inside the central 3:1 band) MUST also be
  pure flat #FFFFFF white — same flat white as the top/bottom
  margins. NO painted forest backdrop, NO ambient atmospheric
  color, NO soft haze, NO leaf scatter floating in empty space.
- Visualize: the foreground props silhouetted with crisp painted
  edges, sitting on a 100% pure white field that fills the entire
  canvas (the central band's gaps + the top/bottom margins are
  ALL the same flat #FFFFFF).
- Camera/perspective: orthographic side-view (matches input)
- Lighting: golden hour from upper-right, baked INTO each prop
  (no painted light rays in the empty white space)
- Continuous left-to-right composition matching the input's prop
  layout — no internal seams, no vertical breaks between props

DROP FROM INPUT (replace with the flat #FFFFFF margins above
and below):
- Sky / atmospheric haze
- Distant tree silhouettes / canopy
- Ambient gradients / sun rays in the air
- Anything that isn't part of the foreground walkable geometry

UPGRADE THE FOREGROUND SKIN:
- Brushwork: smoother painterly strokes, confident edges
- Surface detail: visible wood grain, moss strands, stone
  granularity, soft fabric on mushroom caps
- Saturation: slight richness on Amanita reds, violet flowers,
  purple berry clusters, cream mushroom caps — without neon
- Highlights: warm sun-gold on top edges where light hits

STYLE: hand-painted 2D in the lineage of modern Korean MMORPG
foreground art — polished Grand Chase Steam, mid-2010s
Elsword / MapleStory painted props. NOT pixel art, NOT
photorealistic, NOT anime cel-shading (that's for characters
only), NOT vector. NO thick black ink outlines.

PALETTE (anchored on the input, slight refinement):
- forest-mid #3d6446
- moss-saturated #5a8a3c
- earth-warm #5a3d2a (wood / bark)
- earth-deep #3a2515 (deep dirt / shadow)
- amanita-red #c44a32 (mushroom cap signature)
- mushroom-cream #efd9b0 (umbrella cap signature)
- mushroom-yellow #f0c44a (small accent mushrooms)
- violet-flower #6b4d8c (5-petal signature)
- berry-purple #4d2a5e (cluster berries signature)
- sun-gold #d4a574 (highlight tips)
- bg-white #ffffff (top + bottom margins, flat solid ONLY)

MUST NOT:
- Paint anything in the top 20% or bottom 20% of the canvas —
  those bands are uniform pure white #FFFFFF, no exceptions
- Apply a soft gradient between painted area and white margins
  (a clean painted-edge silhouette is fine, but no soft fade-out
  zone reaching into the white)
- Use cream / off-white / paper-tone for the margins — must be
  exactly RGB(255,255,255), threshold-clean
- Add or remove props relative to the input
- Reposition any element
- Convert to anime / chibi / cartoon / pixel / vector
- Add characters, creatures, NPCs, UI, text, particles,
  watermarks

OUTPUT NOTE: Gemini delivers JPEG (no alpha). The flat white
margins will be cropped externally by an automated script that
detects predominantly-white rows from top and bottom. Therefore
the margin white MUST be pure flat #FFFFFF — no gradient, no
near-white tones, no antialiasing into the painted content.
```

### Como usar

```
Input visual: client/art/gc-reference/s2/forest-of-elf/40.png
Aspect: 16:9 (Flow output preset)
Prompt: cola o texto acima
Salva como: client/public/assets/floresta/maps/forest-1-1/raw-16-9.jpeg
```

Gera 2-3 variações; escolhe a que tem:
- Bandas brancas top + bottom realmente puras (sem painted content invadindo)
- Composição contínua sem seams internos
- Plataformas e cogumelos na mesma posição-relativa que o input

Se a variação melhor ainda tiver leaks de painted content nas margens, faz
**1 follow-up no Flow** ("regenerate keeping all forest content but replace
top 220px and bottom 220px with pure flat white #FFFFFF only — no painted
content in margins"). O Nano Banana costuma corrigir bem em follow-up.

### Pós-processo: crop letterbox + bg removal

Pipeline 2-step: crop white margins → bg-remove white centro:

```bash
cd ~/repos/grand-chase/Eternia/client/public/assets/floresta/maps/forest-1-1

# 1. Crop top/bottom white bands → cropped-3-1.png (~1920×640)
python3 ~/repos/grand-chase/tools/crop-letterbox.py \
  -i raw-16-9.jpeg \
  -o cropped-3-1.png \
  --resize-to 1536x512

# 2. Bg removal do centro (transparenta o que sobrou de fundo)
magick cropped-3-1.png -fuzz 6% -transparent white map.png
```

`crop-letterbox.py` detecta linhas com >95% pixels brancos no topo e
fundo, recorta, opcionalmente redimensiona pro target stage (`1536×512`).

`-fuzz 6%` no magick perdoa anti-aliasing JPEG. Aumentar pra 8-10% se
sobrar halo; diminuir pra 3-4% se transparentar demais.

Alternativas pro bg removal (passo 2):
- **remove.bg / ClipDrop**: drag-drop, mas pode comer flores violet pequenas
- **Photoshop**: Select → Color Range → pick white → tolerance 30 → delete

### Validação visual antes de aceitar

1. Abre `cropped-3-1.png` — confere que tem ~1920×640 (3:1) e que o conteúdo
   pintado é contínuo end-to-end (sem seam vertical no centro)
2. Abre `map.png` — confere que o que era fundo virou alpha e que
   plataformas/cogumelos/flores estão **opacos** (sem ghost outline)
3. Recarrega `/?stage=forest-1-1` — Naia spawna em cima da plataforma
   pintada, parallax forest do Eternia mostra atrás da arte

### `forest-1-1.json` já tá atualizado pra esse fluxo

```json
{ "width": 1536, "height": 512, "ground": { "image": "/assets/.../map.png", "y": 0, "h": 512 }, ... }
```

---

## Prompt #1B — Reskin Élfico (creative copy)

> **Quando usar**: depois que `Prompt #1` (faithful retex) ficou OK e você
> quer iterar pra arte que **se inspira no S2 mas claramente é obra própria**.
> Mesmo canvas (16:9 com letterbox 3:1), mesmo input (`40.png`), mesmo
> pós-processo. Só muda o corpo do prompt — o tema decorativo passa de
> "feira de cogumelos genérica" pra "bosque sagrado élfico".
>
> **Plataformas ficam ancoradas** — silhuetas/posições/escala preservadas
> pra não quebrar o JSON do stage. Se quiser shuffle de posição depois,
> redesenha shapes no `/map-editor.html` em cima da arte nova.
>
> **Salva como** `map-elven.png` (paralelo ao `map.png` faithful) →
> A/B test trocando `forest-1-1.json:ground.image`.

### Prompt textual

```
Reference-driven foreground sprite for a 2D side-scrolling
platformer stage. You will receive multiple attached
references; each plays a different role.

ATTACHED REFERENCES — ROLE OF EACH:
1. Grand Chase Season 2 Forest of Elf horizontal cross-section
   (e.g. `40.png`) — STRUCTURAL reference. Use ONLY to preserve
   the full horizontal composition, the silhouette and position
   of every walkable platform, and the rough scale and placement
   count of every prominent prop (mushrooms, flowers, berries,
   hanging foliage). Do NOT inherit its decorative motifs —
   those are reinterpreted per the REINTERPRET section below.
2. Three Eternia BG parallax layers (`bg-canopy.jpeg`,
   `bg-mid.jpeg`, `bg-far.jpeg`) — PALETTE / ATMOSPHERIC
   reference. These three backgrounds will sit visually BEHIND
   your output at runtime (parallax-rendered far/mid/canopy).
   Your painted foreground must HARMONIZE tonally with them:
   share the same painted lineage and brushwork density, match
   their lighting temperature and saturation, feel like the
   same artist painted everything at the same hour of light.
   Do NOT reproduce BG content in your output (no distant
   canopy / no faraway trees / no sky / no atmospheric haze /
   no sun rays in the air) — those layers already handle the
   environment. Your output is ONLY the foreground walkable
   geometry painted into the central 3:1 band.

The new artwork is an ORIGINAL elven-forest reinterpretation —
clearly inspired by the structural reference but unmistakably
its own work, not a retex, and visually consistent with the
attached BG layers as if they were painted together.

OUTPUT CANVAS: 16:9 horizontal (1920×1080).

LAYOUT WITHIN THE CANVAS — CRITICAL:
- The painted forest foreground geometry must occupy ONLY the
  CENTRAL HORIZONTAL BAND of the canvas — a 3:1 strip that
  fills the full canvas width and is roughly 60% of canvas
  height (1920×640, vertically centered).
- The TOP ~20% of the canvas (~220px tall) MUST be filled with
  pure flat #FFFFFF white. No painted content at all up there,
  no gradient, no canopy bleeding up — solid white margin only.
- The BOTTOM ~20% of the canvas (~220px tall) MUST also be pure
  flat #FFFFFF white. Same rule — no painted content,
  no gradient.
- Think of it as a horizontal mat-board: a wide painting pasted
  into the center of a white poster. Only the central 60%-tall
  strip is painted; above and below is uniform white margin.

DROP FROM INPUT (replace with the flat #FFFFFF margins above
and below):
- Sky / atmospheric haze
- Distant tree silhouettes / canopy
- Ambient gradients / sun rays in the air
- Anything that isn't part of the foreground walkable geometry

KEEP from the reference (locked, not creative — central 3:1 band):
- Every walkable platform silhouette, position, and relative
  size — gameplay collisions depend on these
- Number and rough placement of decorative props
- Side-view orthographic perspective (matches reference)
- Lighting direction: golden hour from upper-right (baked
  INTO each prop, no light rays in empty space)

PAINTED CONTENT — STRICT RULE FOR THE CENTRAL 3:1 BAND:
- Paint ONLY the foreground walkable props themselves (platforms,
  crystalline mushrooms, standing stones, moonflowers, berries,
  moss, roots, bark, hanging foliage, the 5–10 floating motes).
- ALL gaps, negative space, and surroundings around/between those
  props inside the central band MUST be pure flat #FFFFFF white —
  the SAME flat white as the top/bottom margins.
- Visualize: the props are silhouetted with crisp painted edges
  on a 100% pure white field that fills the entire canvas (central
  band gaps + top + bottom margins are ALL identical #FFFFFF).
- NO painted forest backdrop in the gaps. NO ambient atmospheric
  color. NO soft haze. NO leaf scatter floating in empty space.
  NO BG-style canopy/sky/distance painted between props.
- The attached BG references are for PALETTE harmonization of the
  PROPS THEMSELVES — NOT for filling the empty space. The empty
  space is white, period. The BGs sit behind this layer at
  runtime via parallax compositing.

REINTERPRET — this is where you depart from the reference:

The reference is a "challenge forest" with stout woodland
mushrooms (amanita-red caps, cream umbrella caps, yellow stub
accents) and folk wildflowers. We are NOT painting those. The
new theme is an ENCHANTED ELVEN GROVE — calm, ancient, faintly
luminous, not theme-park magical.

Replace each prop family with an elven-coded equivalent of
the SAME silhouette / footprint as the reference:
- Reference's tall mushroom clusters → slender translucent
  crystalline mushrooms with subtle interior bioluminescence
  (cool teal-pearl glow, NOT neon, NOT Tron)
- Reference's cream umbrella mushrooms → carved standing
  stones partially overgrown with iridescent moss, worn
  elven runes etched into the surface
- Reference's small yellow accent mushrooms → pale
  silver-blue moonflowers (same 5-petal feel as the reference's
  violets, faintly luminous core)
- Reference's hanging berry clusters → faceted amethyst-
  clear crystallized dew-berries catching light
- Reference's casual moss patches → faerie-touched moss with
  faint pearlescent sheen
- Reference's bare bark → subtle elven knotwork carved into
  wood (spirals, whorls, runes), readable but not graffiti-bold
- Add 5–10 sparse floating motes of soft light across the
  whole scene (NOT particle spam)

UPGRADE THE FOREGROUND SKIN (same as Prompt #1):
- Brushwork: smoother painterly strokes, confident edges
- Surface detail: visible wood grain (now elven-knotwork),
  moss strands with iridescence, stone granularity (now runed),
  soft inner glow on crystalline mushroom caps
- Highlights: cooler honey-gold on top edges where light hits
  (less orange than the reference)

STYLE: hand-painted 2D in the lineage of modern Korean MMORPG
foreground art — polished Grand Chase Steam, mid-2010s
Elsword / MapleStory painted props. NOT pixel art, NOT
photorealistic, NOT anime cel-shading (that's for characters
only), NOT vector. NO thick black ink outlines. NO glow
overload — bioluminescence subtle and earned.

PALETTE (anchored on the reference's family, shifted cooler
and quieter for elven grove tone):
- forest-mid #3a5e44
- moss-sheen #6ea878 (with faint iridescence)
- earth-warm #4f3624 (still warm bark)
- earth-deep #2e1d11 (deep dirt / shadow)
- crystal-mushroom-cap #d6e5e8 (replaces amanita-red entirely)
- crystal-mushroom-glow #8fb8c2 (cool inner light tint)
- moonflower-silver #d4d8e8 (replaces small yellow accents)
- moonflower-glow #a6b4d4
- elven-violet #7a5da3 (subtle shift from reference's violet)
- crystal-berry #b89cd6 (replaces dark cluster purple)
- sun-gold-cool #e0bd8e (highlight tips, cooler than ref)
- bg-white #ffffff (top + bottom margins, flat solid ONLY)

INTENT: a viewer familiar with the reference should recognize
the structural lineage at a glance, but immediately register
this as its own original work — different decorative culture,
different mood, different palette family. Inspiration is
visible; copy is not.

MUST NOT:
- Paint anything in the top 20% or bottom 20% of the canvas —
  those bands are uniform pure white #FFFFFF, no exceptions
- Apply a soft gradient between painted area and white margins
  (a clean painted-edge silhouette is fine, but no soft fade-out
  zone reaching into the white)
- Use cream / off-white / paper-tone for the margins — must be
  exactly RGB(255,255,255), threshold-clean
- Reproduce the reference's signature props (amanita-red caps,
  cream umbrella caps, yellow stub mushrooms) — those are the
  reference's identity, not generic forest content
- Reposition or remove walkable platforms — silhouettes locked
- Convert to anime / chibi / cartoon / pixel / vector
- Add characters, creatures, NPCs, UI, text, particles dense
  enough to read as VFX, watermarks

OUTPUT NOTE: Gemini delivers JPEG (no alpha). The flat white
margins will be cropped externally by an automated script that
detects predominantly-white rows from top and bottom. Therefore
the margin white MUST be pure flat #FFFFFF — no gradient, no
near-white tones, no antialiasing into the painted content.
```

### Workflow

Quase idêntico ao do Prompt #1 — diferenças: anexar **4 references**
(structural + 3 BGs) e salvar com sufixo `-elven`:

```
1. Abre Nano Banana Pro no Flow
2. Anexa structural ref:
     client/art/gc-reference/s2/forest-of-elf/40.png
3. Anexa 3 BG refs (palette/atmospheric harmonization):
     client/src/assets/floresta/bg-canopy.jpeg
     client/src/assets/floresta/bg-mid.jpeg
     client/src/assets/floresta/bg-far.jpeg
4. Aspect 16:9, cola Prompt #1B, gera 2-3 variações
5. Salva escolhida como
     client/public/assets/floresta/maps/forest-1-1/raw-elven-16-9.jpeg
```

```bash
cd ~/repos/grand-chase/Eternia/client/public/assets/floresta/maps/forest-1-1
python3 ~/repos/grand-chase/tools/crop-letterbox.py \
  -i raw-elven-16-9.jpeg \
  -o cropped-elven-3-1.png \
  --resize-to 1536x512
magick cropped-elven-3-1.png -fuzz 6% -transparent white map-elven.png
```

Pra testar A/B no engine, edita `forest-1-1.json:ground.image`:

```json
{ "ground": { "image": "/assets/floresta/maps/forest-1-1/map-elven.png", ... } }
```

### Validação visual

- Plataformas com **silhueta/posição matching** o input — shapes do JSON
  continuam alinhados (sem precisar redesenhar)
- Cogumelos amanita **sumiram** — substituídos por crystal mushrooms /
  standing stones com runas / cluster de moonflowers
- Palette **esfriou** — menos laranja queimado, mais pearl/silver/teal frio
- **Harmoniza com os BGs** — abre `bg-canopy.jpeg` lado a lado com o output
  e confere se a temperatura/saturação combinam (não fica "FG quente sobre
  BG frio" nem vice-versa)
- **Sem efeito Tron** — bioluminescência sutil, não LED-saturado
- "**Reconhecível mas claramente outro trabalho**" — passa esse teste sem
  esforço de defesa: alguém vê o S2 referenciado, mas não confunde com cópia

---

## Prompt #2 — Loading screen (cinematic, futuro)

**Filename**: `client/src/assets/floresta/maps/forest-1-1/loading.png`
**Aspect**: 16:9 (1920×1080)
**Background**: painted full-frame (não é alpha, é uma cinematic completa)
**Reference visual**: `sky40.png` (S2 atmospheric background)

### Prompt textual

```
Cinematic painted loading screen for a 2D action platformer's
opening forest stage, inspired by the Grand Chase Season 2
Forest of Elf entrance (see attached sky40 reference). 16:9
horizontal aspect.

COMPOSITION:
- Foreground left: large ancient tree trunk with mossy bark,
  vines hanging, partially silhouetted against golden backlight
- Foreground right: smaller tree trunk + flowering bush with
  signature violet 5-petal flowers and purple berry clusters
- Center: a clearing with a path leading deeper into the forest;
  dappled sunlight hits moss + flowers
- Mid-ground: more trees in cool atmospheric haze
- Background: dense forest canopy in silhouette, warm sun rays
  cutting through (volumetric light)

LIGHTING: peak golden hour, dramatic backlight. Foreground trees
silhouetted, ground in clearing receives warm light spill. Mood:
peaceful but expectant — first-stage feel.

STYLE: painted 2D cinematic, hand-painted brushwork visible,
modern Korean MMORPG painted background lineage. Same palette
family as the in-game stage tiles for visual continuity.

PALETTE: forest greens, warm earth browns, sun-gold backlight
highlights, cool teal-cyan atmospheric mid-tone.

NO characters, NO UI, NO text overlays — pure environment
painting. UI frame ("Carregando…" + title) renders in HTML on
top of this at runtime.

Style note: capture the cinematic atmospheric depth of the S2
sky40 reference — same backlit-trees feel, same dappled light —
but in a modern higher-resolution painted style. NOT a copy.
```

---

## Workflow ponta-a-ponta (single-image)

```
1. Abre Nano Banana Pro no Flow
2. Anexa: client/art/gc-reference/s2/forest-of-elf/40.png
3. Aspect: 16:9 → cola Prompt #1 → gera → salva
   client/public/assets/floresta/maps/forest-1-1/raw-16-9.jpeg
4. (CLI) python3 ~/repos/grand-chase/tools/crop-letterbox.py \
     -i raw-16-9.jpeg -o cropped-3-1.png --resize-to 1536x512
5. (CLI) magick cropped-3-1.png -fuzz 6% -transparent white map.png
6. Recarrega /?stage=forest-1-1 — Naia spawna em cima, parallax bg atrás
7. Abre /map-editor.html → desenha shapes (solid/oneway/slope/trigger)
   + spawns
8. Save → testa em /?stage=forest-1-1
```

## Validação visual antes de commitar

Após Nano Banana gera (raw-16-9.jpeg):
1. **Bandas brancas top + bottom puras?** Color picker no topo e fundo —
   tem que dar `#FFFFFF` (255, 255, 255). Se vier off-white, pede follow-up
   no Flow ("redo with pure flat #FFFFFF top + bottom margins")
2. **Conteúdo central contínuo?** Sem seam vertical no meio da arte
3. **Composição vs input?** Plataformas/cogumelos aproximam o layout do
   S2 — não precisa ser pixel-perfect, mas ordem geral preservada
4. **Brushwork + palette?** Painted (não cel-shaded), Amanita vermelha,
   flores violet 5-petal, cream mushrooms presentes

Após `crop-letterbox.py` (cropped-3-1.png):
5. **Dimensões corretas?** Print do script reporta `1920×640 → 1536×512`
   (ou similar). Se reportar muito diferente, modelo não respeitou as
   bandas — usa `--threshold 235` ou `--row-pct 0.90` pra relaxar

Após `magick` bg removal (map.png):
6. **Alpha limpo?** Sem ghost outline ao redor de plataformas? Se sim,
   sobe `-fuzz` (6% → 8% → 10%)

---

## Próximos stages (mesma estratégia)

Quando `forest-1-1` estiver fechado, replicar pros próximos. Pra cada
stage, junta os 3 slices S2 numa imagem só (`40.png` é a referência —
mesmo padrão pros outros: `41-joined.png`, `42-joined.png`,
`43-joined.png`) e roda o mesmo Prompt #1.

| Stage | Slices S2 a juntar | Notes |
|---|---|---|
| `forest-1-2` | `41_1`, `41_2`, `41_3` | cogumelo teal raro, plataformas mais altas |
| `forest-1-3` | `42_1`, `42_2`, `42_3` | cluster icônico mushrooms, palette mais densa |
| `forest-1-4` | `43_1`, `43_2`, `43_3` | boss arena, mais plataformas verticais |

Pra juntar 3 slices 512×512 num só PNG 1536×512 (input pro Nano Banana):

```bash
cd ~/repos/grand-chase/Eternia/client/art/gc-reference/s2/forest-of-elf
magick 41_1.png 41_2.png 41_3.png +append /tmp/41-joined.png
```

Pântano dos Esquecidos virá de outro `Map*.kom` da S2 (provável `Map1.kom`
ou `Map2.kom` — extrair com `~/repos/grand-chase/tools/komextract.py`).

---

## Fallback per-slice (se single-image reframer demais)

Se Nano Banana reenquadrar o `40.png` agressivo (ex: corta as bordas
laterais, perde plataformas) mesmo com follow-up, voltar pro per-slice:

1. Pra cada slice (`40_1`, `40_2`, `40_3`), input 1:1, mesmo prompt mas
   sem as instruções de bandas brancas top/bottom — em vez disso pede:
   *"flat solid pure white #FFFFFF background, no painted ambient,
   foreground geometry only"*
2. `magick slice-NN.raw.jpg -fuzz 5% -transparent white slice-NN.png`
   pra cada slice
3. `magick slice-01.png slice-02.png slice-03.png +append map.png`
4. Aceitar os seams (a feather-blend tool no `~/repos/grand-chase/tools/`
   pode ajudar — não escrita ainda; pede se precisar)

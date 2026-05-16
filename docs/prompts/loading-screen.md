# Nano Banana Pro — Loading screen art (Naia + Floresta dos Elfos)

> Cinematic art que aparece na tela de carregamento (1.5s fixos no boot).
> Mostra a Naia ancorada no bioma do Capítulo I (Floresta dos Elfos), com
> o logo do jogo overlaid em HTML por cima.
>
> **Output target**:
> `client/public/assets/branding/loading-naia.png` (PNG, alpha-removed
> ou flat bg — o `LoadingScreen.ts` aceita ambos via fallback).
>
> **Aspect**: 4:3 ou 3:4 (composição central — o overlay HTML coloca logo
> + tagline em volta). Escolho 3:4 (vertical) pra Naia ficar dominante.

## Bibles que sustentam

- [`09a-naia.md`](../09a-naia.md) — Bible da Naia (LOCKED)
- [`11-floresta-dos-elfos.md`](../11-floresta-dos-elfos.md) — Biome bible
- [`09-art-bible.md`](../09-art-bible.md) — Eternia visual style global

## Reference attachments

| Arquivo | Papel |
|---|---|
| `client/src/assets/naia/naia-cutout.png` | **Anchor da Naia** — pose, outfit (deep emerald tunic + brown leather), óculos redondos, cabelo verde-esmeralda LOCKED. Não driftar. |
| `client/src/assets/floresta/bg-canopy.jpeg` | Atmosfera + canopy tone |
| `client/src/assets/floresta/bg-mid.jpeg` | Mid-distance trees + lighting temperature |
| `client/src/assets/floresta/bg-far.jpeg` | Far horizon haze + sun rays |

## Prompt textual

```
Cinematic loading-screen illustration for an indie 2D action
platformer. Vertical 3:4 composition. Hand-painted style in the
lineage of modern Korean MMORPG illustrations (Grand Chase Steam,
Elsword, MapleStory) — confident brushwork, atmospheric depth,
NOT anime cel-shading, NOT pixel art, NOT photorealistic, NOT
vector. NO thick black outlines.

ATTACHED REFERENCES:
1. Naia anchor (`naia-cutout.png`) — STRICT character reference.
   Preserve exactly: deep emerald-green long-sleeve fitted tunic
   ending mid-thigh, brown leather laced bodice/vest over the
   tunic, black fitted leggings, brown mid-calf leather boots,
   brown leather bracers on both forearms, thin brown leather
   belt, small leaf-shaped silver pendant at the throat, brown
   leather quiver with arrows visible over the right shoulder,
   recurve wooden short bow held in left hand, small round
   wireframe librarian-style glasses, deep emerald-green long
   hair (mostly down) with one thin side braid, pointed elf
   ears, emerald-green eyes, ~17 years old slim agile build.
   Do NOT redesign her outfit, glasses, hair, or weapon.
2. Three forest BG layers (`bg-canopy`, `bg-mid`, `bg-far`) —
   PALETTE / ATMOSPHERIC reference. Match their painted lineage,
   color temperature, and brushwork density.

COMPOSITION (vertical 3:4):
- Naia stands in the lower-center of the frame, full-body or
  three-quarter, slightly turned (3/4 view), serene expression
  — calm, observant, not posing dramatically. Her bow is held
  loosely at her side, not drawn.
- Background: a deep elven forest — ancient trees with mossy
  bark, dappled golden-hour sunlight cutting through the
  canopy (volumetric backlight rays), distant ferns and
  hanging vines, hints of bioluminescent moss or moonflowers
  catching the light. Cool teal-pearlescent atmosphere.
- Negative space: leave the TOP ~25% of the canvas as quieter
  atmosphere (sky / canopy haze) — this area will host an HTML
  logo overlay at runtime. Don't paint anything dominant in
  the top quarter — keep it readable as backdrop only.
- Foreground accents: a few mossy stones or carved elven runes
  near Naia's feet, faint floating motes of light (5-10 sparse
  specks). Same elven-grove style as `Prompt #1B` reskin.

LIGHTING:
- Peak golden hour from upper-right, dappled through canopy
- Naia receives soft fill + warm rim light on her hair and bow
- Background trees in cool atmospheric haze, sun rays
  volumetrically cutting through

PALETTE:
- forest greens (emerald, moss, deep forest)
- warm earth browns (bark, leather)
- cool golden backlight (honey, not orange)
- pearlescent teal atmospheric haze
- Naia's emerald hair and tunic pop slightly against the
  cooler atmosphere — she is the focal point

INTENT: stillness before adventure. A quiet moment of the
heroine in her home biome, before the player presses Confirm.
The image holds for 1.5 seconds at game launch — needs to feel
inviting, atmospheric, and signature of the Eternia world.

NO characters besides Naia. NO UI, NO text, NO watermarks, NO
logo embedded in the image (logo is overlaid in HTML at
runtime). NO particle/VFX overload — atmospheric subtlety
matters more than spectacle.
```

## Workflow

```
1. Abre Nano Banana Pro no Flow
2. Anexa naia-cutout.png + 3 BGs (canopy/mid/far)
3. Aspect 3:4 (vertical), gera 2-3 variações
4. Salva escolhida como
     client/public/assets/branding/loading-naia.png
   (Flow output é JPEG; user remove BG manualmente se necessário,
    ou salva flat — LoadingScreen aceita ambos)
5. Hard refresh — loading screen pega automaticamente
```

## Validação visual

- **Naia anchor preservado** — outfit, óculos, cabelo, bow, sem drift
- **Top 25% quieto** — não tem prop dominante (espaço pro logo HTML)
- **Atmosfera élfica** — golden hour + bioluminescência sutil + cool teal
- **Harmoniza com BGs** — mesma temperatura/saturação dos `bg-*.jpeg`
- **Sem text/UI/watermark** embed na imagem

## Iteração se drift

- **Outfit drift** (sleeves, lacing) → re-anexar `naia-cutout.png` +
  follow-up "preserve outfit exactly per reference, only repose"
- **Top muito ocupado** → follow-up "redo with quieter sky/canopy in
  the top 25% — that area must read as atmospheric backdrop only,
  no dominant props or trees"
- **Tom muito quente** → follow-up "shift palette cooler, more
  pearlescent honey-gold instead of orange-gold"

---

## Refresh em estilo anime/GC (iteração 2026-05-10)

> **Problema observado**: a primeira geração saiu **muito realista**
> (digital painting semi-realista, perdeu o feel anime/GC da Naia
> original). Nano Banana puxou pra realismo porque a `naia-cutout.png`
> é 3D-rendered (mesmo toon-shaded), e o termo "hand-painted" interpretou
> como digital painting.
>
> **Fix**: anchor agora é a `naia-anchor.png` (a master 2D anime
> illustration), e a art direction explicita "Korean MMORPG anime
> illustration" com referências específicas (GC S2 portraits, Elsword
> key art, Soulworker), NÃO digital painting realista.

### Reference attachments (substitui o anterior)

| Arquivo | Papel |
|---|---|
| `client/art/anchors/naia-anchor.png` | **PRIMARY anchor** — canonical 2D anime illustration LOCKED. Outfit, proporções, anime feel, cel-shading. NÃO usar `naia-cutout.png` (é 3D rendering, puxa pra realismo). |
| `client/src/assets/floresta/bg-canopy.jpeg` | BG palette/atmosphere |
| `client/src/assets/floresta/bg-mid.jpeg` | mid trees palette |
| `client/src/assets/floresta/bg-far.jpeg` | far horizon palette |

### Variant A — Edit-only (preserva BG da geração anterior)

> **Quando usar**: o BG da floresta da primeira geração ficou bom; só
> a personagem precisa ser refeita. Anexa a imagem anterior + o
> `naia-anchor.png` e cola este prompt.

**Inputs**:
1. Imagem anterior (a Naia "realista" que voce quer corrigir)
2. `client/art/anchors/naia-anchor.png` (canonical anime ref)

**Prompt**:

```
Edit this image. Replace ONLY the character (Naia) with a
re-rendered version in proper Korean MMORPG anime illustration
style — NOT digital painting realism, NOT semi-realistic, NOT
3D-rendered. Reference attached `naia-anchor.png` as the
canonical art style anchor.

Keep EVERYTHING ELSE in the input image exactly as it is:
- Forest background, canopy, atmospheric lighting, sun rays,
  any environmental props at her feet, floating motes
- Composition / framing / where she stands
- Color temperature and overall mood

Replace ONLY her body/face/hair/outfit with an anime-style
illustration matching `naia-anchor.png` style:
- Cel-shaded (3-tone per color group: highlight + midtone +
  shadow), NOT smooth painterly gradients
- Anime proportions: stylized large expressive eyes (clearly
  drawn iris + highlight, NOT realistic anatomical eye), slim
  agile build (~1:6.5 head-to-body, NOT realistic 1:8)
- Hair as anime stylized strands with painted highlights and
  cel-shaded volumes — NOT photo-realistic individual strands
- Crisp anime line work on outfit details (bracer lacing,
  bodice cross-lacing, belt, bow handle wood grain)
- Outfit identity LOCKED per `naia-anchor.png`: deep emerald
  long-sleeve fitted tunic, brown leather laced bodice/vest,
  black fitted leggings, brown mid-calf boots, brown bracers,
  silver leaf pendant at throat, brown leather quiver with
  arrows over right shoulder, recurve wooden short bow, small
  round wireframe glasses, deep emerald long hair with one
  thin side braid, pointed elf ears, emerald-green eyes
- Skin: anime stylized (smooth flat areas + cel shadow under
  jaw / collarbone), NOT realistic skin texture
- Lighting: golden-hour rim light from upper-right, but
  rendered as anime cel-shaded highlights (warm rim on hair
  edge, on shoulder) — NOT smooth airbrush gradient

STYLE REFERENCES (in order of priority):
- Grand Chase Season 2 hero illustrations (especially Lire
  the elven archer key art)
- Elsword character key art and loading screens
- Soulworker / Closers / Lost Saga character illustrations
- Anime JRPG character portraits (Ragnarok Online, Tales of
  series 2D portraits)

DO NOT:
- Render her in digital painting realism / photo-realistic
  detail (this was the issue with the previous generation)
- Use 3D-rendered or toon-shaded 3D look
- Drift outfit (no short sleeves, no different bodice lacing,
  no missing pendant, no missing glasses)
- Reposition her or change her stance from the input image
- Modify any background element
- Add new characters, particles, text, UI

The result should feel like a Korean MMORPG title screen
illustration of Naia, dropped into the existing painted
forest — NOT a digital painting cover art, NOT a 3D render
print.
```

### Variant B — Full re-gen (se Edit não respeitar)

> **Quando usar**: variant A não funciona (Nano Banana não preserva
> BG, ou mistura estilos). Re-gera tudo com art direction agressivo
> em anime/GC.

**Inputs**:
1. `client/art/anchors/naia-anchor.png` (PRIMARY)
2. `bg-canopy.jpeg`, `bg-mid.jpeg`, `bg-far.jpeg` (BG palette)

**Prompt**:

```
Korean MMORPG anime illustration, vertical 3:4 cinematic
loading-screen composition. Style anchor: late 1990s / early
2000s Korean online action JRPG character key art — Grand Chase
Season 2 hero portraits, Elsword loading screen art, Soulworker /
Closers character illustrations. NOT digital painting realism.
NOT semi-realistic. NOT 3D-rendered. NOT photo-real. NOT pixel
art. NOT vector / flat design. NOT Western cartoon.

ATTACHED REFERENCES:
1. `naia-anchor.png` — STRICT character anchor. Match her
   anime proportions, outfit identity, cel-shading style,
   palette, line work. The output character must read as the
   same illustration lineage as the anchor.
2. `bg-canopy / bg-mid / bg-far` — atmosphere/palette reference
   for the forest BG. Match their painted lineage but render
   the character on top in anime cel-shaded style.

CHARACTER (Naia, anchor-LOCKED):
- Slim agile elven archer, ~17, ~1:6.5 head-to-body anime
  proportions
- Anime stylized large expressive emerald-green eyes (visible
  iris + highlight, NOT realistic anatomical eye)
- Deep emerald-green long hair, mostly down, one thin side
  braid, anime stylized strands with cel-shaded volumes
- Pointed elf ears
- Small round wireframe librarian-style glasses (no thick
  frame), gentle highlight on lens
- Outfit (LOCKED per anchor): deep emerald long-sleeve fitted
  tunic ending mid-thigh, brown leather laced bodice/vest over
  tunic, black fitted leggings, brown mid-calf leather boots,
  brown leather bracers on both forearms, thin brown leather
  belt, small leaf-shaped silver pendant at throat
- Brown leather quiver with arrows visible over right shoulder
- Recurve wooden short bow held loosely in left hand at her
  side (NOT drawn, NOT poised to shoot)
- Pose: 3/4 view, calm observant expression, gentle stand —
  serene, before-adventure stillness
- Cel shading: 3-tone per color group (highlight + midtone +
  shadow), crisp anime line work on outfit details

COMPOSITION (vertical 3:4):
- Naia in lower-center of frame, full or 3/4 body
- Background: dappled-light deep elven forest (mossy ancient
  trees, golden-hour sun rays through canopy, hints of
  bioluminescent moonflowers, faint floating motes)
- TOP ~25% of canvas: quieter atmospheric backdrop only
  (canopy haze + soft sun glow) — this area hosts an HTML
  logo overlay at runtime, must NOT have dominant props
- BG painted in atmospheric style harmonized with attached
  bg-canopy/mid/far refs; CHARACTER painted in anime cel-shaded
  style on top — the two layers can coexist (anime character
  in painted environment is the GC / Elsword convention)

LIGHTING:
- Golden hour from upper-right
- Character: warm anime-style rim light on hair top + bow tip,
  cel-shaded shadow under jaw / on left side of body
- BG: volumetric sun rays through canopy, atmospheric haze

PALETTE:
- Forest greens (emerald moss, deep forest), warm earth browns
  (bark, leather), cool honey-gold backlight, pearlescent teal
  atmospheric haze
- Naia's emerald hair and tunic pop against the cooler BG —
  she is the focal point

DO NOT:
- Render in digital painting realism / semi-realistic style —
  this was the failure mode in earlier generation
- Use 3D-rendered look or toon-shaded 3D
- Drift outfit from anchor
- Add other characters, NPCs, UI text, watermarks, particle
  spam, dense VFX
- Paint dominant props in the top 25% of canvas
- Render her drawing the bow / aiming / in combat pose

INTENT: a Korean MMORPG-style title illustration of Naia in
her home biome, holding for 1.5s before the player enters
character select. Inviting, atmospheric, signature Eternia.
```

### Workflow (variant A)

```
1. Abre Nano Banana Pro no Flow
2. Anexa a imagem anterior (Naia "realista") + naia-anchor.png
3. Aspect MANTIDO da imagem anterior (3:4 vertical)
4. Cola Variant A prompt
5. Salva como
     client/public/assets/branding/loading-naia-v2.jpeg
6. Remove BG se necessário, renomeia → loading-naia.png
```

### Validação extra

- **Olhos**: anime style (iris desenhada + highlight), NÃO realistic
  anatomical
- **Linha**: bracer lacing + bodice tem **line art crisp** (não soft
  painterly fade)
- **Cel shading**: shadows são **bandas distintas** (3-tone), não
  smooth gradient
- **Cabelo**: strands stylized + highlight cel-shaded, não photo-real
- **Side-by-side com `naia-anchor.png`**: a personagem da nova geração
  deve **claramente vir da mesma linhagem ilustrativa** que o anchor

---

## Variant C — Key art GC-style (fullscreen 16:9, RECOMENDADA)

> **Pivô 2026-05-10**: a tela de loading agora é **fullscreen 16:9** com
> a key art da Naia DOMINANTE (estilo update de patch GC: Amy / Ronan /
> Jin), em vez do card pequeno centrado anterior. Logo e título são
> overlay HTML por cima da art — não baked na imagem.
>
> **Inspiração layout**: telas de loading da Grand Chase coreana das
> versões 2007-2008 (lançamento da Amy, do Ronan, do Jin). Personagem em
> pose dinâmica preenche a maior parte do canvas, com cor temática
> saturada de fundo (Amy=rosa, Ronan=roxo/azul, Jin=vermelho). Pra Naia
> = verde-esmeralda + golden hour da Floresta dos Elfos.
>
> **Output target**:
> `client/public/assets/branding/loading-naia.png` (substitui o anterior).
>
> **Aspect**: 16:9 horizontal (1920×1080).

### Reference attachments

| Arquivo | Papel |
|---|---|
| `client/art/anchors/naia-anchor.png` | **PRIMARY** — anime style + outfit identity LOCKED |
| `client/src/assets/floresta/bg-canopy.jpeg` | Forest atmosphere palette |
| `client/src/assets/floresta/bg-mid.jpeg` | mid trees |
| `client/src/assets/floresta/bg-far.jpeg` | far horizon |
| (opcional) screenshots GC loading da Amy/Ronan/Jin | Layout reference (pose dominante + tema saturado + negative space pra logo+text) |

### Prompt textual

```
Korean MMORPG character loading-screen key art, 16:9
horizontal cinematic. Style anchor: late 1990s / early 2000s
Korean online action JRPG character introduction art, like
Grand Chase Season 2 patch loading screens (Amy, Ronan, Jin
intro updates), Elsword loading screens, Soulworker key
visuals. Hand-painted anime cel-shaded illustration. NOT
digital painting realism. NOT 3D-rendered. NOT
semi-realistic. NOT pixel art. NOT vector. NOT photo-real.

ATTACHED REFERENCES:
1. `naia-anchor.png` — STRICT character anchor (outfit,
   anime proportions, cel-shading style, palette).
2. `bg-canopy / bg-mid / bg-far` — forest atmosphere palette.
3. (if attached) Korean GC patch loading screens — LAYOUT
   reference only: dominant character pose + saturated themed
   background + negative space for HTML overlays. Do NOT
   copy any character or BG content from those — just the
   compositional convention.

CHARACTER (Naia, anchor-LOCKED):
- Slim agile elven archer, ~17, anime ~1:6.5 head-to-body
- Anime stylized large emerald eyes (visible iris + highlight)
- Deep emerald long hair, mostly down, one thin side braid,
  anime stylized strands, cel-shaded volumes (dynamic motion
  hint — slight wind sweep is welcome)
- Pointed elf ears, small round wireframe glasses
- Outfit (LOCKED per anchor): deep emerald long-sleeve fitted
  tunic mid-thigh, brown leather laced bodice/vest, black
  fitted leggings, brown mid-calf leather boots, brown bracers,
  thin brown belt, silver leaf pendant at throat, brown
  leather quiver with arrows over right shoulder
- Recurve wooden short bow held in left hand
- POSE: dynamic action — choose ONE:
    a) Mid-action: bow drawn, arrow nocked, aiming forward
       to upper-right (the direction sun rays come from);
       focused expression, body angled in 3/4 attack stance
    b) Just-released: bow string still vibrating after a shot,
       hand lingering by string, arrow streak visible exiting
       to upper-right; satisfied calm expression
    c) Confident reveal: full-body 3/4, bow held loosely at
       hip, free hand drawing an arrow from quiver behind
       shoulder, looking slightly off-camera with quiet
       confidence
   Pick the pose that reads cleanest in attack-RPG-loading-art
   convention. Energy: poised but not screaming-action; the
   mood is "the elven archer arrives, calm and lethal".
- Cel shading 3-tone (highlight + midtone + shadow), crisp
  anime line art on outfit details

COMPOSITION (16:9 horizontal):
- Naia occupies the CENTER-RIGHT of the canvas, body taking
  ~55–65% of canvas height (full-body or near-full-body).
  Slightly off-center horizontally (right of vertical center)
  — leaves left-side breathing room for the forest-atmosphere
  to read.
- Background: deep elven forest in atmospheric saturated
  greens — ancient mossy trees, dappled golden-hour sun rays
  cutting through canopy from upper-right (volumetric backlight),
  hints of bioluminescent moonflowers, faint floating motes.
  Cool teal-pearlescent atmospheric haze. NOT a busy detailed
  background — atmospheric mood, not prop catalog.
- TOP-LEFT ~18% of canvas (~340×190 px equivalent): QUIETER
  atmospheric space — soft canopy haze with golden light
  rays, no dominant prop. This area hosts the ETERNIA logo
  overlay at runtime.
- BOTTOM-CENTER ~30% of canvas (~580 px tall horizontal band
  in the lower third): QUIETER painted area, atmospheric and
  darker (deep forest floor mist + ground silhouette). This
  area hosts the title text overlay (CAPÍTULO I, NAIA, lore
  quote). NO bright prop, NO sharp detail, NO text in the
  art itself.
- Foreground accents at character feet: soft moss patches,
  hints of carved standing stones with elven runes, sparse
  leaves catching light — atmospheric only.

LIGHTING:
- Strong golden-hour rim light from upper-right
- Naia receives anime cel-shaded warm rim on hair-top, bow,
  shoulder; cool fill from upper-left
- Background: volumetric sun rays, atmospheric haze
- Mood: signature Eternia first-impression — atmospheric,
  inviting, character-focused, slightly cinematic

PALETTE:
- Saturated forest greens (emerald hair + tunic dominant
  against cooler atmospheric BG)
- Warm honey-gold backlight (cooler honey, NOT orange)
- Pearlescent teal atmospheric haze
- Deep forest greens / earth browns in lower third
- Naia stands out as the focal warm color against the cooler BG

DO NOT:
- Render in digital painting realism / semi-realistic style
- Use 3D-rendered or toon-shaded 3D look
- Drift outfit from anchor
- Paint BUSY DETAILED background (atmospheric mood, not prop
  catalog)
- Paint dominant props in the top-left ~18% or bottom-center
  ~30% of canvas (those host HTML overlays)
- Add ANY text, logo, watermark, UI element, rating badge,
  loading bar, signature in the art
- Add other characters / NPCs
- Render her drawing the bow at the camera (face-on aggressive
  stance reads as MOBA, not anime archer)

INTENT: Korean MMORPG-style "character arrival" patch loading
art for Naia. Holds for 1.5–2s during boot. Should make the
player feel: "this is Naia, the elven archer, and her forest
home". Atmospheric, cinematic, signature Eternia.
```

### LoadingScreen layout que consome essa art

A `LoadingScreen.ts` agora renderiza a key art como **background full-bleed**,
com overlays HTML posicionados nas zonas de negative space:

```
+----------------------------------------------+
| [LOGO 180px]      [art continues]            |
|                                              |
|                                              |
|       (NAIA + FOREST = FULL-BLEED ART)      |
|                                              |
|                                              |
|         CAPÍTULO I — A ARQUEIRA ÉLFICA      |
|                  NAIA                        |
|     "Cada flecha encontra seu alvo, …"      |
|         ━━━━━━━━━━━━━━━━━━━━━━              |
|         Carregando…                          |
+----------------------------------------------+
```

### Workflow

```
1. Abre Nano Banana Pro no Flow
2. Anexa naia-anchor.png + bg-canopy/mid/far + (opcional)
   screenshots GC loading da Amy/Ronan/Jin pra layout ref
3. Aspect 16:9 (1920×1080), gera 2-3 variações
4. Salva escolhida como
     client/public/assets/branding/loading-naia.png
   (Flow output é JPEG; user pode renomear pra png ou converter
    via magick — LoadingScreen.ts aceita ambos)
5. Hard refresh — LoadingScreen pega automaticamente
```

### Validação visual

- **Naia ocupa center-right** com pose dinâmica (não estática parada)
- **Top-left limpo** (espaço pro logo) — sem prop dominante, só atmosfera
- **Bottom-center quieto** (espaço pra título) — atmospheric darker,
  sem detalhe sharp
- **Estilo anime/GC**, não realístico digital painting
- **Outfit anchor-LOCKED** (deep emerald + brown leather, glasses,
  pendant, quiver, recurve bow)
- **Pose**: action mas serena (elf archer, não MOBA hero scream)
- **Sem text/UI** baked na imagem — overlays são HTML
- **Sem faixa/banner** baked horizontal na lower-third (Nano Banana às
  vezes adiciona um rectangle de "title bar" mimicking GC patch art —
  isso conflita com nosso overlay HTML; ver follow-up abaixo)

### Follow-up: remover faixa baked na lower-third

> **Quando usar**: Nano Banana baked uma faixa horizontal escura
> (rectangle / banner) no terço inferior da imagem mimicking o "title
> bar" das telas GC originais. Isso desalinha com nosso título HTML que
> renderiza por cima. Removendo a faixa, deixamos o gradient/vignette
> CSS cuidar do contraste do texto.

**Inputs**:
1. A imagem gerada com a faixa
2. (opcional) `naia-anchor.png` pra reforçar style

**Prompt**:

```
Edit this image. Keep everything exactly as it is — character
pose, outfit, expression, full background forest scene,
lighting, atmospheric mood, color palette — but REMOVE the
horizontal title-band rectangle / banner / decorative bar
that sits across the lower-middle of the canvas.

In the area where the band currently is, paint instead a
continuous extension of the surrounding atmospheric forest:
deeper forest mist, ground silhouette, soft moss, subtle
floating motes — same painted lineage and mood as the rest
of the BG. The bottom-third of the canvas should read as
quiet atmospheric forest floor, NO rectangle, NO banner, NO
decorative bar, NO title-bar shape, NO text.

The character (Naia) must remain pixel-identical. The forest
trees, sun rays, canopy, and lighting must remain unchanged.
The only edit is replacing the baked title-band area with
continuous atmospheric forest content.

DO NOT redraw the character. DO NOT change pose. DO NOT add
text. DO NOT change palette. DO NOT add a different
decorative element in place of the removed band.
```

Após esse follow-up, o contraste do texto sobre a art é provido pelo
**vignette CSS** do `LoadingScreen` (gradient escurecendo top + bottom),
que já existe na implementação atual.

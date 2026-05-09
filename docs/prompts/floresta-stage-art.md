# Nano Banana Pro — Floresta dos Elfos stage assets

> **Pivot 2 — 2026-05-09**: single-painting-per-stage abandonado. Em
> vez de uma imagem grande do stage inteiro (que disputava com a
> parallax bg que já temos), cada stage agora é composto por:
>
> - **Background parallax** (já gerados — `bg-far/mid/canopy.jpeg`)
> - **Ground**: 1 imagem painted alta res do chão
> - **Plataformas**: 1-3 sprites painted tematizados (transparent bg)
> - **Loading screen** (futuro): cinematic painting da fase pra
>   "carregando..." estilo GC Chaos
>
> A imagem painted única que tinha sido sugerida funciona melhor como
> loading screen do que como stage horizontal jogável. Aproveita.
>
> Bibles:
> - [`11-floresta-dos-elfos.md`](../11-floresta-dos-elfos.md) — biome bible
> - [`09-art-bible.md`](../09-art-bible.md) — Eternia visual style

## Pasta de saída

```
client/src/assets/floresta/maps/forest-1-1/
├── ground.png        ← chão (ground sprite, esticado horizontalmente)
├── platform.png      ← 1 sprite reutilizado nas 3 posições
└── loading.png       ← cinematic da fase (futuro)
```

A imagem que você gerou (corredor entre duas árvores) salva como
`loading.png` — ela vira loading screen quando implementarmos.

---

## 1. Ground — chão da forest-1-1

**Filename:** `client/src/assets/floresta/maps/forest-1-1/ground.png`
**Aspect:** wide, ~5:1 (~2048×400 ou maior)
**Background:** painted (não transparente)

### Prompt

```
Wide horizontal painted ground sprite for a 2D side-scrolling
platformer. Ancient elven forest floor. View is straight from the
side (orthographic), as if the camera is at character-eye-level.
The image reads as a continuous strip the player walks across.

ASPECT: 5:1 horizontal (e.g., 2048×400, or 2560×512). The "ground"
fills the entire image vertically — there is no sky or canopy, this
is exclusively the walkable surface plus a bit of dirt/soil
below it.

CONTENT (left to right, continuous):
- Top edge: clearly defined grass-and-moss line where character feet
  will plant. Mid-tone forest greens (#3d6446, #6abf95). Slight
  undulations (1-3 small bumps across the width) but mostly a clear
  horizontal line at a consistent vertical level — character must
  silhouette cleanly when standing.
- Middle band: ground surface. Patches of grass, occasional small
  flowers (white/pink dots), exposed mossy roots crossing the ground,
  small stones, fallen leaves, tiny mushroom clusters. Mid-tones
  throughout — no extreme contrasts that would compete with character
  sprites.
- Bottom band: darker dirt/soil with some root tendrils descending,
  fading to deeper earth-brown (#3a2515) at the very bottom edge.

LIGHTING: golden hour, soft warm sunlight from upper-right. Subtle
warm highlights on grass tops; no harsh shadows.

STYLE: hand-painted 2D, painterly brushstrokes visible, anime-modern.
NOT photorealistic. NOT pixel art. NOT 3D rendered. Think Ori and
the Blind Forest ground textures, Hollow Knight (less moody), classic
Korean MMORPG painted ground (Grand Chase, Elsword).

PALETTE:
- forest-deep #1f3326
- forest-mid #3d6446
- moss-bright #6abf95
- earth-warm #5a3d2a
- earth-deep #3a2515
- highlight #d4a574 (small grass tip glints)

CRITICAL: this is the ground only — no platforms, no characters,
no creatures, no UI, no sky, no trees standing on the ground.
The image will be stretched to fill the stage width and stops being
visible behind the parallax bg above. Keep the silhouette
zone (top 30-40% of the image) moderately detailed — busy enough to
look painted, but not so busy that 64px-tall character sprites get
lost when standing on it.
```

### Validação visual

1. Top edge é uma linha horizontal mais ou menos plana? OK
2. A imagem inteira é só ground (sem sky/canopy/trees standing)? OK
3. Topo tem detalhe moderado (não busy)? OK
4. Palette é mid-tone (sem extremos que matem silhouette)? OK

---

## 2. Platform — plataforma flutuante (reusada 3×)

**Filename:** `client/src/assets/floresta/maps/forest-1-1/platform.png`
**Aspect:** ~3:1 (~600×180)
**Background:** transparent (PNG com alpha) ou white (você remove externamente)

> Se uma plataforma só te parecer monótono, gere 2-3 variações
> (`platform-a.png`, `platform-b.png`, `platform-c.png`) com mesma
> identidade visual mas detalhes ligeiramente diferentes. O JSON da
> fase pode apontar plataformas diferentes pra cada AABB.

### Prompt

```
Single floating elven stone platform sprite for a 2D side-scrolling
platformer. Ancient mossy carved stone with subtle teal-glowing elven
runes. View is from the side (orthographic). The platform is a
self-contained piece — no ground attaching it, it visually floats.

ASPECT: ~3:1 horizontal (e.g., 600×180 or 800×240).

DESIGN:
- Top: flat-ish horizontal surface where character stands. Clearly
  defined edge. Mossy stone with grass tufts, tiny flowers in the
  cracks. The character (Naia, slender elven archer ~64px tall)
  must silhouette cleanly when standing on top — keep the top 1/3
  of the platform's vertical extent moderately detailed but not
  busy.
- Sides: carved stone face, weathered but elegant. 1-2 elven runes
  carved into the stone, glowing faintly teal (#6abf95). Don't
  overdo the runes — 1-2 carvings, not a row of them.
- Bottom: roots, vines, and ivy cascading downward in soft strands,
  some dripping past the platform's lower edge by ~30-50px (organic
  asymmetry — the platform feels alive, ancient, not brutalist).
- The whole shape is roughly oval or hourglass — wider in the middle,
  tapering at left and right ends. Edges are organic, not perfectly
  rectangular.

LIGHTING: golden hour, warm light from upper-right. Top surface gets
sun-gold highlights (#d4a574). Underside is in soft shadow but with
ambient teal-green bounce light from below.

STYLE: hand-painted 2D, painterly, anime-modern. Same aesthetic as
the ground sprite (consistent).

PALETTE: same anchor as ground — forest-deep, forest-mid,
moss-bright, earth-warm, plus spirit-teal #6abf95 for runes.

BACKGROUND: pure white #ffffff (the user will remove externally
to get a transparent PNG). Do NOT add a colored or patterned bg
behind the platform — only the platform itself, on white.

NO characters, NO creatures, NO UI, NO ground attached, NO sky.
Just the platform, isolated.
```

### Validação visual

1. Top edge é flat e claro? OK
2. Background é branco puro pra fácil remoção? OK
3. Roots/ivy descem pra baixo da plataforma orgânicamente? OK
4. Runes brilham mas sem overcrowding? OK

---

## 3. Loading screen — opcional, futuro

**Filename:** `client/src/assets/floresta/maps/forest-1-1/loading.png`

A imagem que você gerou no primeiro round (corredor entre duas
árvores formando arch + clearing iluminado central) é perfeita pra
isso. Renomeia + salva como `loading.png` neste path.

Quando implementarmos o loading screen estilo GC Chaos:
- Frame decorativo medieval/anime nas bordas
- Header "Carregando..." top center + barra de progresso
- Título "Floresta dos Elfos — 1" overlay no centro
- Subtitle "A entrada do bioma — onde os elfos ainda passam"
- Hint annotations laterais (controles, sem-spoiler-do-stage)

Tudo HTML/CSS overlay com a `loading.png` como bg — sem precisar
re-gerar arte.

---

## Como o jogo monta o stage

```
Layer 1 (back): bg-far parallax           (existing)
Layer 2:        bg-mid parallax           (existing)
Layer 3:        bg-canopy parallax        (existing)
Layer 4:        ground sprite             (NEW — esticado pra stage.width)
Layer 5:        platform sprites          (NEW — uma por shape AABB)
Layer 6:        mobs / player / FX
Layer 7:        HUD HTML
```

Ground stretched pra stage.width. Platforms posicionadas nos AABBs do
JSON via Stage.ts. Os AABBs são desenhados/editados via map editor
sobrepondo as artes — você vê a relação visual ↔ física.

---

## Próximas stages (futuras)

Mesmo template — cada uma com seu próprio ground + platform tematizado:

- **forest-1-2 (Trilha Iluminada)**: ground com mais flores brilhando
  + sun rays caindo no chão; platform com runas mais densas, sun-gold
  dourado intenso.
- **forest-1-3 (Floresta Profunda)**: ground escuro com cogumelos
  bioluminescentes teal; platform com bark torcida + glow azul-teal,
  menos sun.
- **forest-1-4 (Antro do Insectivorous)**: ground com cocoons
  quebrados + chitin caído; platform com bone-white + sangue seco
  marrom, glow verde-podre.

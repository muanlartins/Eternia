# Nano Banana Pro — Floresta dos Elfos stage paintings

> **Pivot 2026-05-09**: tile-based art (parallax bgs + platform/ground
> sprites) abandonado. Cada stage agora é **uma única pintura** com a
> física desenhada por cima via map editor. Mais identidade visual,
> menos repetição, exatamente como Grand Chase Season 1 fazia.
>
> Bibles que sustentam estes prompts:
> - [`11-floresta-dos-elfos.md`](../11-floresta-dos-elfos.md) — biome
>   bible (palette, lighting, mood, props, lore)
> - [`09-art-bible.md`](../09-art-bible.md) — Eternia visual style
>   global

## Pasta de saída

```
client/src/assets/floresta/maps/
├── forest-1-1.png   ← este prompt (escopo atual)
├── forest-1-2.png   (futuro)
├── forest-1-3.png   (futuro)
└── forest-1-4.png   (futuro, boss)
```

## Convenções pro pipeline

- **Aspect ratio**: 16:9 nativo (Nano Banana Pro produz 16:9 fácil).
  Sugerido 1920×1080 ou 2560×1440. O viewport do jogo é 1024×576 (16:9
  também), então a pintura preenche perfeitamente a altura; em x ela
  pode ser ainda mais larga (camera scrolls).
- **Layout horizontal**: pintura larga > pintura quadrada. Player
  caminha left → right e câmera segue. A história visual da pintura
  acompanha o progresso (entrada → meio → portal de saída).
- **Background**: painted (NÃO transparente). Vai ser composto com 3
  parallax bgs atrás (atmosfera distante) — esses ainda existem.
- **Negative space**: regiões onde vai ter colisão (chão, plataformas,
  paredes) **devem ter detalhe gráfico moderado**, não busy. Senão o
  jogador perde o silhouette dos personagens.

---

## Stage forest-1-1 — "Entrada da Floresta"

**Filename:** `client/src/assets/floresta/maps/forest-1-1.png`
**Aspect:** 16:9
**Resolution:** 1920×1080 (ou 2560×1440 se modelo permitir)
**Tom narrativo:** entrada do bioma — convidativa, mas o jogador sente
que está adentrando algo antigo. Primeiro stage do jogo: legibilidade
> dificuldade visual.

### Prompt

```
Painted 2D side-scrolling platformer stage, 16:9 horizontal layout.
Ancient elven forest at golden hour. The image reads as a single
horizontal scene the player walks through from left to right.

LAYOUT (left to right, all painted into the same image, no UI):
- Far left: a large mossy stone arch overgrown with luminous teal
  vines, marking the entrance from a previous biome. Soft sunbeams
  filter through.
- Lower 30% of the image: continuous grass-and-moss ground plane
  that undulates gently — slight rises and dips, not flat. Mid-tone
  forest greens (#3d6446, #2f4d36) and warm earth (#5a3d2a). This is
  where the player walks. Keep detail moderate (grass tufts, small
  stones) but no busy clutter that would compete with character
  sprites.
- Middle horizontal band: 2-3 floating elevated mossy stone platforms
  carved with elven runes that glow faintly teal (#6abf95). One
  platform low (~250px above ground), one mid-height (~400px), one
  higher (~500px) — staggered horizontally so the player can jump
  between them. Edges of platforms are clearly defined, lit from
  upper-right (warm sunlight).
- Upper 40%: dense canopy of broadleaf trees, ancient gnarled trunks,
  hanging Spanish-moss-like vines. Sun rays cutting through. Background
  fades to atmospheric haze. Color palette here: deep forest greens
  + golden sun + soft teal spirit-glow.
- Far right: a faint circular swirl of warm gold light at ground
  level, hinting at where the portal will appear after stage clear.
  Don't draw the portal explicitly — just suggest the spot with a
  glow.

STYLE: hand-painted 2D game background, painterly brushstrokes
visible, soft cel-shading, anime-modern (think Studio Ghibli forests,
Ori and the Blind Forest, Hollow Knight less moody, Salt and
Sanctuary, classic Korean MMORPG painted bg).
NOT photorealistic. NOT 3D-rendered. NOT pixel art. NOT chibi.

PALETTE (anchor):
- forest-deep #1f3326
- forest-mid #3d6446
- moss-bright #6abf95
- sun-gold #d4a574
- bark-warm #5a3d2a
- spirit-teal #6abf95 (glowing rune accents)
- highlight #fff3d6 (sunbeam tips)

MOOD: ancient + mystical + warm. Golden hour, not noon, not dusk.
A place the elves still tend, even though their numbers have thinned.
First-stage feel: inviting, low-threat, the player wants to explore.

CRITICAL constraints (silhouette readability):
- Mid-tone palette throughout — no extreme dark shadows under
  platforms or in the foreground walking area, no extreme bright
  highlights mid-frame. Save extremes for far background and
  sun rays only.
- Platforms must read as platforms — flat-ish top edges, clear
  silhouette. No floating organic blobs that confuse hitbox.
- Ground plane is a clear horizontal band — not jagged, not busy.
  The character (Naia, a slender elven archer in green/teal,
  ~64px tall) needs to silhouette cleanly against it.
- No characters, no creatures, no UI elements, no text in the
  painting. Pure environment.
```

### Validação visual antes de exportar

Antes de salvar, mentalmente sobreponha:
1. Um retângulo cobrindo os 30% inferiores (área onde o personagem caminha) — esse retângulo está livre de detalhe excessivo? Se sim, OK.
2. Cada plataforma tem topo plano e definido? Se sim, OK.
3. A leitura "esquerda = entrada / direita = saída" é clara? Se sim, OK.
4. O silhouette de um personagem 64px de altura ficaria visível em qualquer ponto da área inferior? Se sim, OK.

Se alguma falhar: re-prompt com ênfase no critério, ou ajuste no painting tool externo.

### Saída

Salvar em `client/src/assets/floresta/maps/forest-1-1.png` (ou `.jpeg`,
o loader detecta extensão).

Daí abrir o map editor (`/map-editor.html?stage=forest-1-1`) pra
desenhar os AABBs em cima.

---

## Próximas stages (futuras, não geradas ainda)

Cada uma vai ter seu próprio prompt nesse mesmo arquivo, derivado deste
mas com tom narrativo distinto:

- **forest-1-2 — "Trilha Iluminada"**: meio do bioma. Mais plataformas,
  algumas pedras quebradas no caminho. Sun ainda golden mas começa a
  esfumaçar. Spirit-teal mais presente.
- **forest-1-3 — "Floresta Profunda"**: bioma mais escuro. Sub-canopy
  denso, sun raros, bioluminescência teal nos cogumelos. Palette
  shift: deep green + cold teal. Tensão antes do boss.
- **forest-1-4 — "Antro do Insectivorous"**: arena fechada, paredes de
  raízes gigantes, chão coberto de cocoons quebrados. Sun bloqueado,
  glow antinatural verde-podre nos pillars. Palette: bog-green + bone-
  white + sangue seco.

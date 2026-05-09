# Nano Banana Pro — World Map prompts

> Geração da arte para a tela `MissionSelect` reformulada (estilo
> Continente-de-Eternia + nodes em trilha).
>
> **Modelo recomendado:** Nano Banana Pro (Flow). Aspect ratios indicados
> abaixo. Cada prompt é self-contained — copiar/colar inteiro.
>
> **Pasta de saída:** todos os PNGs gerados vão pra
> `client/src/assets/world-map/` com os filenames exatos abaixo. Vite faz
> o import via hashing, então o filename precisa bater.

## 1. Continente de Eternia (background full-frame)

- **Filename:** `client/src/assets/world-map/continent.png`
- **Aspect:** 16:9
- **Recomendado:** 2048×1152 (mínimo 1920×1080)
- **Background:** painted (não transparente)

```
Painted overhead world map of a fantasy continent named "Eternia," in
the style of classic painted JRPG world maps (Grand Chase, Ragnarok
Online, MapleStory). The continent occupies roughly 70% of the frame,
surrounded by deep teal ocean with foam-cap waves and scattered tiny
islands.

NW quadrant: a vast emerald elven forest with golden rays piercing the
canopy, ancient stone ruins peeking through the trees, a single glowing
fey-light sanctuary marked at the forest's edge (this is the entry to
Floresta dos Elfos).

SE quadrant: a misty swamp with black water, twisted dead trees, faint
purple wisps drifting low.

Center: rolling hills, a faded stone path winding between zones.

NE corner: snow-capped peaks fading into clouds.
SW corner: a coastal cliff with crashing waves.

Mood: dusk, just after golden hour — warm orange light fading into deep
teal shadow, mist rolling off ridgelines.

Painted with detailed brush strokes, slightly stylized (not photo-
realistic). Top-down 3/4 perspective (slight tilt, ~75° from horizontal).

NO text, NO labels, NO UI elements, NO overlay. Wide aspect 16:9.

Color palette: deep forest greens (#1a3a2a), warm sunset gold (#f5c870),
spirit teal accents (#6abf95), bark browns (#3d2817), distant misty
purples for the swamp.
```

## 2. Floresta dos Elfos — node icon (unlocked)

- **Filename:** `client/src/assets/world-map/node-forest.png`
- **Aspect:** 1:1
- **Recomendado:** 512×512
- **Background:** plain white (`#FFFFFF`) — usuário remove externamente

```
Stage marker icon for a fantasy game world map.

Subject: an ornate elven lantern carved from pale moonstone, hovering
above a small mossy stone pedestal. Inside the lantern, a warm green-
gold flame (fey-light, not fire). Two slender ivy vines wrap the lantern,
sprouting tiny glowing leaves. A subtle aura of golden particles around
the lantern.

Composition: 3/4 view, lantern centered, small base of moss and a single
broken elven rune-stone behind it. Object reads clearly even at 64×64
preview size.

Style: hand-painted JRPG icon (Grand Chase / Ragnarok / Brave Frontier
era), thick clean black outlines (~2px equivalent), toon-shaded with
soft rim-light, vibrant saturated colors.

Background: plain white (#FFFFFF), no shadows on the background, no other
elements — subject fully isolated. (User removes white externally.)

Lighting: warm fey green-gold glow from within the lantern, cool teal
rim light from above-left.

Square format 1:1. NO text, NO labels.
```

## 3. Locked node placeholder ("???")

- **Filename:** `client/src/assets/world-map/node-locked.png`
- **Aspect:** 1:1
- **Recomendado:** 512×512
- **Background:** plain white (`#FFFFFF`) — usuário remove externamente

```
Mystery stage marker icon for a fantasy game world map.

Subject: a weathered grey stone obelisk, half-shrouded by drifting dark
teal mist, with a single faintly glowing sigil carved on the front
(illegible, abstract elven runic shape). The mist obscures the bottom
third of the obelisk. A subtle violet-grey aura around it.

Composition: 3/4 view, obelisk centered, base disappearing into mist.
Object reads clearly even at 64×64 preview size.

Style: hand-painted JRPG icon (Grand Chase / Ragnarok / Brave Frontier
era), thick clean black outlines (~2px equivalent), toon-shaded, MUTED
color saturation (compared to unlocked icons — this should read as
"locked, not yet revealed").

Background: plain white (#FFFFFF), no shadows on the background, no other
elements — subject fully isolated. (User removes white externally.)

Lighting: low-key, cold violet ambient with dim runic glow.

Square format 1:1. NO text, NO labels.
```

## Iteração / correção

Se o resultado tiver drift (ex.: lantern com cor errada, obelisco muito
ameaçador), uploadar a versão problemática + edit instruction no Nano
Banana Pro em vez de regenerar do zero. Mesmo padrão da Phase 9 (ver
`09-art-bible.md`).

## Verificação após gerar

Antes de salvar em `client/src/assets/world-map/`:

1. **Filename exato** — `continent.png`, `node-forest.png`, `node-locked.png`.
2. **Background transparente** nos node icons (abrir em Preview, ver xadrez).
3. **Resolução mínima** — continent ≥ 1920×1080, nodes ≥ 256×256.
4. **Sem texto** — Nano Banana às vezes injeta labels/watermarks; pedir
   regeneração se aparecer.

Após salvar, o build do Vite (`pnpm dev`) já vai pegar os arquivos via
import direto na nova `MissionSelect`.

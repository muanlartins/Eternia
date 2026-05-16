# Nano Banana Pro — Logo do jogo (ETERNIA wordmark)

> Logotipo do jogo. Wordmark "ETERNIA" em estilo serif fantasy, com
> ornamento sutil. Renderizado em transparente pra overlay sobre a
> loading screen, char select banner, etc.
>
> **Output target**:
> `client/public/assets/branding/eternia-logo.png` (PNG transparente,
> ~1024×384 ou similar — 8:3 horizontal).
>
> **Aspect**: 16:9 com letterbox branco em volta do logo (mesmo padrão
> do `Prompt #1` da floresta), pra crop posterior. OU 1:1 com bg branco
> que vira alpha.

## Bibles que sustentam

- [`09-art-bible.md`](../09-art-bible.md) — Eternia visual style
- Tipografia base já no `index.html`: **Cinzel** (display serif) — usado
  em loading screen e char select como referência visual

## Reference attachments

> O logo é texto, não tem reference visual obrigatória. Mas anexar
> uma das BGs da floresta ajuda a casar o tom de cor com o resto da
> UI do jogo.

| Arquivo | Papel |
|---|---|
| `client/src/assets/floresta/bg-canopy.jpeg` (opcional) | Color/mood reference — só pra calibrar warm tones |

## Prompt textual

```
Game logo wordmark for an indie 2D action platformer titled
"ETERNIA". Hand-rendered painted-letter style — NOT a CSS web
font, NOT a generic fantasy MMO logo, NOT pixel art. Each
letter painted with confident brush, subtle texture, golden
illuminated-manuscript feel.

OUTPUT CANVAS: 16:9 horizontal (1920×1080) with the wordmark
centered. Background is pure flat #FFFFFF white throughout —
the entire canvas is uniform white, the painted wordmark sits
on top of it. Output will be alpha-extracted via white-keyed
bg removal (`magick -transparent white`).

WORDMARK:
- Single word: ETERNIA (all uppercase)
- 7 letters total, evenly spaced (slight letter-spacing for
  legibility — 0.08–0.12em equivalent feel)
- Tall, slender, serif construction — high contrast (thin
  horizontals, thick verticals) reminiscent of Cinzel /
  Trajan / classic Roman capitals, but with hand-painted
  brush texture (not vector-clean)
- Letter height ~50–60% of canvas height (let the letters
  dominate; symmetric margin around)

COLOR & TEXTURE:
- Primary letter fill: warm honey-gold gradient from top
  (lighter, #f5dca0) to bottom (deeper, #c89456)
- Subtle inner painted texture — visible brushstroke,
  occasional micro-cracks like aged gold leaf on parchment
- Outline: thin warm bronze (#8a5a2a) edge for definition
  against the white background
- Optional drop accent: faint warm rim-glow on the right side
  of each letter (gold catches imaginary light from upper-right)
- NO modern neon glow, NO outer halo, NO chromatic aberration

OPTIONAL ORNAMENT:
- A small horizontal flourish line below the wordmark — one
  thin painted line with tiny leaf or arrow-tip terminations
  on each end. ~70% of wordmark width, centered. Same warm
  bronze (#8a5a2a) as letter outline. Subtle, not decorative
  overload.
- NO crowns, NO swords, NO dragons, NO heraldry — just the
  wordmark and at most the single flourish line.

STYLE: feels like a title card from a hand-painted JRPG /
illustrated fantasy novel cover / illuminated manuscript
chapter heading. Quiet authority, not theme-park spectacle.

MUST NOT:
- Add any character, mob, weapon, sword, bow, dragon,
  shield, crown, or scenery
- Use modern sans-serif or display fonts
- Render as pixel art or vector clean lines
- Apply chromatic aberration, neon glow, lens flares,
  particle effects
- Add additional words ("the game", "online", subtitle)
- Use cream / off-white for the background — must be exact
  RGB(255, 255, 255), threshold-clean for alpha extraction
- Apply soft gradient between letter edges and white
  background (crisp painted edges with mild antialiasing
  into white is fine)
```

## Workflow

```
1. Abre Nano Banana Pro no Flow
2. (opcional) anexa bg-canopy.jpeg pra calibrar tom warm
3. Aspect 16:9, gera 2-3 variações
4. Salva como
     client/public/assets/branding/eternia-logo-raw.jpeg
5. CLI:
     cd ~/repos/grand-chase/Eternia/client/public/assets/branding
     magick eternia-logo-raw.jpeg -trim +repage \
       -fuzz 5% -transparent white eternia-logo.png
   (-trim remove margens brancas, -transparent white aplica alpha)
6. Hard refresh — LoadingScreen.ts já procura por
   /assets/branding/eternia-logo.png; se existir, usa,
   senão cai no fallback "ETERNIA" em texto Cinzel.
```

## Validação visual

- **Wordmark crisp** — letras com edge pintado limpo (não pixelado,
  não fuzzy)
- **Cor warm honey-gold** — não amarelo flat, não dourado neon
- **Sem ornamento excessivo** — no máximo a linha-flourish embaixo
- **Background pure #FFFFFF** — color picker confirma 255,255,255
- **Alpha clean após magick** — sem halo cinza ao redor das letras

## Iteração se drift

- **Letras muito modernas (sans-serif)** → follow-up "redo with
  classical Roman capital construction, high contrast serif, more
  Cinzel / Trajan in feel"
- **Tom muito laranja/saturado** → follow-up "shift to muted honey-
  gold #c89456 as the dominant tone, less saturated, parchment-aged"
- **Ornamento overload** → follow-up "remove all decorative elements
  except the optional thin horizontal flourish line below the
  wordmark; no crowns, swords, or scenery"

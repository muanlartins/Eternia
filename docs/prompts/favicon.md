# Nano Banana Pro — Favicon (E de Eternia)

> Favicon do jogo. Apenas a letra **E** estilizada, em estilo igual ao
> wordmark do logo, square. Renderizado em 1024×1024 pra preservar
> qualidade no resize pra 16/32/64/192px que os browsers usam.
>
> **Output target**:
> `client/public/favicon.png` (referenciado no `index.html` via
> `<link rel="icon" type="image/png" href="/favicon.png">`)
>
> **Aspect**: 1:1 (square)

## Bibles que sustentam

- [`logo.md`](./logo.md) — prompt do wordmark "ETERNIA" (style anchor)
- [`09-art-bible.md`](../09-art-bible.md) — Eternia visual style global

## Reference attachments

| Arquivo | Papel |
|---|---|
| `client/public/assets/branding/eternia-logo.png` | **PRIMARY anchor** — usa o E do wordmark como guia de letterform, palette honey-gold, brushwork. Garante consistência. |

> Se ainda não gerou o logo, pode pular o anchor — o prompt tem
> instruções textuais suficientes pra reproduzir o style.

## Variant A — E em transparência (minimalista)

> Letra E pintada honey-gold em fundo branco flat → alpha extraction.
> Visualmente leve, mas pode somer em tab branca. Recomendo Variant B.

**Prompt**:

```
Game favicon — single uppercase letter "E" rendered in
hand-painted serif style. Square 1:1 canvas. Hand-painted
illuminated-manuscript / classic Roman capital construction
(Cinzel / Trajan lineage), high contrast (thin horizontals,
thick verticals), with confident brush texture and warm
honey-gold gradient. Background is pure flat #FFFFFF white
across entire canvas — for alpha extraction.

THE LETTER E:
- Single uppercase E, dominant — letter height ~75% of canvas
  (chunky, must be readable at 16×16 px after downscale)
- Letter weight BOLD — thicker strokes than a typical body-
  text serif. Verticals visibly chunky, horizontals less thin
  than the wordmark logo (this needs to survive 16×16 rendering)
- Symmetric centering, slight optical adjustment so middle bar
  is at center of letter height
- Honey-gold gradient fill: top lighter (#f5dca0) to bottom
  deeper (#c89456), warm bronze edge outline (#8a5a2a) for
  silhouette definition
- Subtle painted brush texture inside, occasional micro-cracks
  like aged gold leaf — but RESTRAINED (texture detail
  disappears at small sizes; keep silhouette dominant)

NO additional elements:
- NO flourish, NO ornament, NO leaf, NO arrow integrated
- NO frame / border / circle around the letter
- NO drop shadow, NO outer glow, NO chromatic aberration
- NO secondary letters (no "T" preview, no full word)

NO modern sans-serif. NO pixel art. NO vector flat.

OUTPUT NOTE: white margin will be alpha-extracted via
`magick -transparent white`. White MUST be exactly
RGB(255, 255, 255), threshold-clean. No gradient bleeding
into white. Letter edges can keep gentle antialiasing into
white (mild softness on the silhouette is fine).
```

## Variant B — E em quadrado verde-floresta (app-icon, RECOMENDADO)

> Letra E gold sobre fundo dark forest-green com cantos arredondados.
> Funciona em tab clara E escura. App-icon feel. **Mais legível.**

**Prompt**:

```
Game app icon — single uppercase letter "E" centered on a
square dark-forest-green field with rounded corners. Square
1:1 canvas (1024×1024). Hand-painted style consistent with
the game's wordmark logo (illuminated-manuscript / Cinzel /
Trajan serif lineage).

CANVAS BACKGROUND:
- The entire canvas painted in dark forest green
  (#0d1d18 → #050807 subtle vertical gradient, deeper at bottom)
- Inside this, the visual icon shape is a rounded-corner
  square occupying ~92% of the canvas (small margin around),
  with corner radius ~16% of canvas width (modern app-icon
  proportions)
- Subtle inner edge: thin warm bronze rim (#8a5a2a, 1-2 px
  equivalent at 1024) just inside the rounded square for
  definition
- Optional: very subtle painted texture on the dark field
  (faint forest-canopy hint) — restrained, must not
  compete with the letter
- Outside the rounded-corner shape (the canvas margin):
  pure flat #FFFFFF white for alpha extraction

THE LETTER E:
- Single uppercase E, centered, letter height ~62% of the
  rounded-square's height
- BOLD serif construction: thick verticals, slightly thinner
  horizontals (less extreme contrast than the wordmark — this
  needs to survive 16×16 rendering)
- Symmetric, optical center alignment
- Honey-gold gradient fill: top lighter (#f5dca0) to bottom
  deeper (#c89456), warm bronze edge outline (#8a5a2a) for
  contrast against dark green field
- Subtle painted brush texture inside the letter — restrained
- Optional faint warm rim glow on the upper-right side of the
  letter (gold catching imaginary light from upper-right) —
  very subtle, must not blur silhouette

NO additional elements:
- NO flourish, NO ornament, NO leaf, NO arrow
- NO secondary letters, NO subtitle
- NO drop shadow under the E (rim glow only, optional)
- NO chromatic aberration, NO neon glow, NO lens flare

STYLE: feels like a polished mobile/desktop game app icon —
quiet authority, Eternia signature, NOT theme-park spectacle.

OUTPUT NOTE: the area OUTSIDE the rounded-corner square is
pure flat #FFFFFF for alpha extraction (magick -transparent
white removes only the outer margin, the rounded square
stays intact with the dark-green background).
```

## Workflow

```
1. Abre Nano Banana Pro no Flow
2. (opcional) anexa eternia-logo.png como style anchor
3. Aspect 1:1 (square), 1024×1024
4. Cola Variant B prompt (ou A se preferir minimalista)
5. Salva como
     client/public/assets/branding/favicon-raw.jpeg
6. CLI:
     cd ~/repos/grand-chase/Eternia/client/public
     # Variant B (rounded square preserved, white outside removed):
     magick assets/branding/favicon-raw.jpeg \
       -fuzz 4% -transparent white favicon.png
     # OU Variant A (just the letter):
     magick assets/branding/favicon-raw.jpeg -trim +repage \
       -fuzz 4% -transparent white favicon.png
7. (opcional) gera tamanhos específicos:
     magick favicon.png -resize 32x32 favicon-32.png
     magick favicon.png -resize 16x16 favicon-16.png
     magick favicon.png -resize 192x192 favicon-192.png
8. Adiciona no index.html:
     <link rel="icon" type="image/png" href="/favicon.png">
```

## Validação visual

- **Reconhecível em 16×16** — abre o favicon.png, dá zoom out até
  ~32px e checa se o E ainda lê. Se borrar, re-gera com letras mais
  chunky / mais bold.
- **Cor consistente com logo** — mesma honey-gold do wordmark
- **Square + corners** (Variant B) — bordas arredondadas limpas
- **Alpha clean** — sem halo cinza ao redor da rounded square /
  letra após magick

## Iteração se drift

- **Letra muito fina pra 16px** → follow-up "make the letter
  significantly bolder — thicker verticals, less extreme contrast,
  must survive 16×16 rendering"
- **Variant B com green muito claro** → follow-up "darken the
  forest-green background, deeper #0d1d18 saturated"
- **Logo do jogo já pronto** → re-anexar `eternia-logo.png` e
  follow-up "match the letter style of the attached wordmark
  exactly, isolating just the E"

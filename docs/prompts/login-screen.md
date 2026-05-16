# Nano Banana Pro — Login screen background art

> Cinematic art que aparece como **background full-bleed** atrás do
> formulário de login. Inspiração direta na tela de login do Grand Chase
> (personagens em pose splash + gateway atmosférico, formulário central),
> adaptado pra Eternia com **Naia** como personagem principal.
>
> Layout: BG art ocupa todo viewport, formulário centralizado com
> backdrop-blur por cima, logo top-left.
>
> **Output target**:
> `client/public/assets/branding/login-bg.png`
>
> **Aspect**: 16:9 horizontal (1920×1080).

## Bibles que sustentam

- [`09a-naia.md`](../09a-naia.md) — Naia bible LOCKED
- [`11-floresta-dos-elfos.md`](../11-floresta-dos-elfos.md) — Biome bible
- [`09-art-bible.md`](../09-art-bible.md) — Eternia visual style global
- [`loading-screen.md`](./loading-screen.md) — irmão do login (mesmo estilo, pose diferente)

## Reference attachments

| Arquivo | Papel |
|---|---|
| `client/art/anchors/naia-anchor.png` | **PRIMARY** — anime style + outfit identity LOCKED |
| `client/src/assets/floresta/bg-canopy.jpeg` | atmosphere palette |
| `client/src/assets/floresta/bg-mid.jpeg` | mid trees |
| `client/src/assets/floresta/bg-far.jpeg` | far horizon |
| (opcional) screenshot do login do Grand Chase clássico | layout reference |

## Diferença vs `loading-screen.md`

A loading screen tem Naia em pose **dinâmica** (puxando arco / atirando)
preenchendo center-right do canvas. O login tem Naia em pose **mais
contemplativa / parada** ocupando uma das laterais, deixando o
**centro do canvas mais limpo** pro formulário ficar legível por cima.

Ambos seguem o mesmo style anchor (Korean MMORPG anime cel-shaded), mas
**negative space é diferente**:
- Loading: top-left + bottom-center
- Login: **center grande** (~40% do canvas) onde o card do form vai sentar

## Prompt textual

```
Korean MMORPG login-screen background art, 16:9 horizontal
cinematic. Style anchor: late 1990s / early 2000s Korean
online action JRPG login screen art, like the original Grand
Chase login screen (characters in atmospheric splash poses
flanking a central UI area), Elsword login art, classic
KOG title-screen visuals. Hand-painted anime cel-shaded
illustration. NOT digital painting realism. NOT 3D-rendered.
NOT semi-realistic. NOT pixel art. NOT vector. NOT photo-real.

ATTACHED REFERENCES:
1. `naia-anchor.png` — STRICT character anchor (outfit, anime
   proportions, cel-shading style, palette).
2. `bg-canopy / bg-mid / bg-far` — forest atmosphere palette.

CHARACTER (Naia, anchor-LOCKED):
- Slim agile elven archer, ~17, anime ~1:6.5 head-to-body
- Anime stylized large emerald eyes (visible iris + highlight)
- Deep emerald long hair, mostly down, one thin side braid,
  anime stylized strands cel-shaded
- Pointed elf ears, small round wireframe glasses
- Outfit (LOCKED per anchor): deep emerald long-sleeve fitted
  tunic mid-thigh, brown leather laced bodice/vest, black
  fitted leggings, brown mid-calf leather boots, brown bracers,
  thin brown belt, silver leaf pendant at throat, brown
  leather quiver with arrows over right shoulder, recurve
  wooden short bow held in left hand at her side
- POSE: contemplative / serene — choose ONE:
    a) Standing 3/4 view, bow held loosely at her side, free
       hand resting on the strap of her quiver, looking gently
       toward the center of the canvas (toward where the form
       will sit), calm welcoming expression
    b) Leaning slightly against an ancient mossy tree, bow
       resting on her shoulder, looking out toward the player
       with quiet invitation
   Pick the one that reads cleanest as "the elven archer
   waiting at the threshold of her forest". NOT action pose,
   NOT mid-combat — this is a calm "welcome to Eternia" moment.
- Cel shading 3-tone, crisp anime line art on outfit details

COMPOSITION (16:9 horizontal):
- Naia placed on the LEFT THIRD of the canvas (or RIGHT THIRD —
  pick whichever frames better with the chosen pose). Her body
  takes ~60–70% of canvas height. Slightly facing toward the
  center of the canvas (so her gaze invites the player's eye
  toward where the login form will sit).
- CENTER ~40% of the canvas (a vertical band roughly from 30%
  to 70% canvas width): QUIETER atmospheric backdrop. This is
  where the login form card sits as an HTML overlay at runtime.
  This area should read as deeper-into-forest atmospheric
  perspective — soft canopy haze with golden-hour rays cutting
  through, hints of distant ancient trees, but NO dominant
  prop, NO bright detail, NO sharp focal element. Just
  inviting atmospheric depth.
- TOP-LEFT ~18% of canvas: QUIETER atmospheric space (canopy
  haze with golden light). Hosts the ETERNIA logo overlay at
  runtime. No dominant prop here.
- Foreground accents at character feet: soft moss patches,
  hints of carved standing stones with elven runes, sparse
  foreground ferns catching light — atmospheric only.

LIGHTING:
- Golden-hour rim light from upper-right
- Naia receives anime cel-shaded warm rim on hair-top, bow,
  shoulder edge facing the light; cool fill from upper-left
- Background: volumetric sun rays through canopy, atmospheric
  haze deepening toward the center of the canvas (pulling the
  eye into the forest)
- Mood: signature Eternia first-impression — warm welcome,
  threshold of an adventure, character-focused but not
  confrontational

PALETTE:
- Saturated forest greens (emerald hair + tunic dominant)
- Warm honey-gold backlight
- Pearlescent teal atmospheric haze deepening toward center
- Deep forest greens / earth browns in lower third
- Naia stands out as the focal warm color against the cooler
  atmospheric center

DO NOT:
- Render in digital painting realism / semi-realistic style
- Use 3D-rendered or toon-shaded 3D look
- Drift outfit from anchor
- Paint busy detailed background (atmospheric mood, not prop
  catalog)
- Paint dominant props in the CENTER 40% of the canvas (that
  area hosts the form overlay)
- Paint dominant props in the TOP-LEFT ~18% (that hosts the
  logo overlay)
- Add ANY text, logo, watermark, UI element, login form,
  buttons, signature in the art
- Add other characters, NPCs, mobs
- Render Naia drawing the bow / aiming / in combat pose

INTENT: Korean MMORPG-style login screen background. The
player sees this BEFORE typing their name and entering the
world. Should feel like Naia is welcoming the player to the
Floresta dos Elfos — calm, atmospheric, inviting. NOT a
combat splash, NOT a patch banner. A quiet threshold moment.
```

## Workflow

```
1. Abre Nano Banana Pro no Flow
2. Anexa naia-anchor.png + bg-canopy/mid/far
3. Aspect 16:9 (1920×1080), gera 2-3 variações
4. Salva escolhida como
     client/public/assets/branding/login-bg.png
   (Flow output é JPEG; renomeia ou converte via magick —
    Login.ts aceita PNG/JPEG via background-image CSS)
5. Hard refresh — Login pega automaticamente
```

## Validação visual

- **Naia em uma lateral** (left ou right third), pose
  contemplativa serena (NÃO action)
- **Centro 40% limpo** — espaço pro form, sem prop dominante
- **Top-left limpo** — espaço pro logo
- **Atmosfera convidativa** — golden hour + bioluminescência
  sutil + perspectiva pra dentro da floresta
- **Estilo anime/GC**, não realístico digital painting
- **Outfit anchor-LOCKED**
- **Sem text/UI/watermark** baked

## Iteração se drift

- **Naia muito centralizada** → follow-up "shift the character
  to the left or right third of the canvas, leave the central
  40% as quieter atmospheric backdrop only"
- **Centro muito ocupado** → follow-up "redo with a quieter
  atmospheric center band — no dominant props or sharp focal
  elements in the central 40% of the canvas"
- **Pose action demais** → follow-up "redo with calm
  contemplative pose, bow lowered at her side or on shoulder,
  not drawn or aiming"
- **Realismo voltou** → re-anexar naia-anchor.png + follow-up
  "redo in strict Korean MMORPG anime cel-shaded illustration
  style matching the attached anchor — NOT digital painting
  realism, NOT semi-realistic"

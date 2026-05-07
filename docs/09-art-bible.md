# 09 — Art Bible (Pre-production)

> **Phase 9 = pré-produção** (lore + concept art + style guide).
> **Phase 10 = implementação** (sprite work, replacing primitives).
>
> Todas as decisões visuais e narrativas vivem aqui. Concept art aprovada
> ganha entry permanente com link/path da imagem ancora.

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **9.0** | Tool choice (Gemini), pipeline, style guide, World/lore frame | em progresso |
| **9.A** | Astrid concept art locked (anchor + turnaround done; pose sheets pendente — agendado pré-Phase 10) | anchor + turnaround done |
| **9.B** | Supporting cast (3 slots restantes do CharacterSelect) | em progresso (slot 2 next) |
| **9.C** | Mob/creature designs (9 mobs) | pendente |
| **9.D** | Biome concepts (Floresta, Pântano + futuros) | pendente |
| **9.E** | UI/icon art (24 cards, 3 skill icons, portraits) | pendente |
| **9.F** | World lore book (continente, facções, McGuffin) | pendente |

## Pipeline

- **Tool**: Gemini app (Nano Banana / Imagen 4)
- **Plano**: Gemini Advanced ($20/mês) ou free tier conforme uso
- **Workflow**:
  1. Usuário responde questionário pra cada novo personagem/asset
  2. AI escreve prompt v1 (estilo natural longo, ~150-300 tokens)
  3. Usuário roda no Gemini, manda 4 variantes pro chat
  4. Iteração via conversa: "mantenha a pose mas mude a cor da armadura" /
     "mais sério na expressão" / "remova o detalhe X"
  5. Quando trava, salvar imagem como `art/anchors/<slug>.png` no repo
  6. Para variantes (turnaround, poses, cores): upload anchor + prompt
     "gere o mesmo personagem em [pose/ângulo]"
- **Consistência entre personagens**: usar o mesmo **style anchor**
  (paragraph fixo) no início de cada prompt. Após Astrid travada, usar
  Astrid anchor como reference visual nas próximas gens pra "mesmo
  mundo, mesmo aesthetic".

## Style anchor (cole isto no início de TODO prompt de personagem)

```
A 2D anime-style character illustration in the visual language of early
2000s Korean MMORPGs (Grand Chase, Ragnarok Online, MapleStory). Bold
clean black lineart, cel-shaded coloring with crisp shadow shapes,
vibrant saturated palette, slight chibi-leaning anatomy (head ~1/6 of
body height, expressive large eyes). Adventurous high-fantasy tone with
a youthful shounen energy. Full body composition, plain neutral
cream/beige background as in a character reference sheet. No watermarks,
no text overlay.
```

## World — Eternia (the party)

**Eternia** não é o nome do continente — é o nome da própria **party**
de heróis. Igual "Grand Chase" no GC original.

### Frame inicial (pra refinar em 9.F)

- Existe um continente (nome TBD) onde tudo se passa.
- Algo desestabilizou a paz: TBD (sugestões em 9.F: artefato roubado,
  rei desaparecido, criatura ancestral despertando, dimensão se rompendo).
- Heróis de origens diferentes — knight, archer, mage, spell-knight —
  se cruzam no caminho dessa quest e formam a Eternia.
- Tom narrativo: high-fantasy adventure, leve shounen, com momentos
  íntimos entre os personagens (relacionamentos, backstories que se
  cruzam).

A McGuffin ("the [...] they hunt") fica em aberto até 9.F. Pode ser
um único objeto, vários, ou um vilão. A definição vem depois que o
elenco principal tiver bibles fechadas.

## Cast

> Cast atual no `client/src/data/characters.ts`: `astrid` (available),
> `naia` / `slot3` / `slot4` (locked). Renomeei Elesis → Astrid e Lire
> → Naia conforme a gente vai travando os bibles. Slots 3 e 4 ainda
> com placeholder name `?`.

### Astrid (slot 1 — Knight)

**Status**: bible v1, concept art em iteração.

#### Bible

| Campo | Valor |
|---|---|
| Nome | Astrid |
| Classe (1ª) | Knight (espadachim de uma mão) |
| Idade | 17 |
| Build | esguia atlética, ~165cm |
| Personalidade | confiante, impulsiva, fierce. Sorrindo de canto, olhar acesso. Líder por não esperar autorização. |
| Cabelo | vermelho-escarlate, longo, preso em rabo-de-cavalo alto, com fios soltos na frente |
| Olhos | vermelhos (matching cabelo) |
| Arma | longsword de uma mão, bainha no quadril esquerdo |
| Origem | TBD (sugestões: filha de cavaleiro caído, sobrevivente de aldeia destruída, fugitiva de ordem disciplinada) |

#### "Base/nude" outfit (segunda pele)

Equivalente ao "personagem pelado" do GC. É o que ela veste quando
está sem armadura equipada — mas estilizado, não literalmente nude:
- **Bodysuit** vermelho-escarlate cobrindo torso, braços (mangas longas)
  e pernas (compridas). Fabric com gradient sutil — escarlate no peito
  → carmim profundo nas extremidades.
- **Cinto** preto fino na cintura.
- **Botas** pretas de couro até o joelho.
- **Luvas** pretas sem dedos.
- Sem armadura nessa forma — é a "base" sobre a qual peças de armadura
  serão adicionadas em classes futuras (similar ao slot system de GC).

#### Classes futuras (placeholder, pra Phase 10+ ou nunca)

- Knight (1ª — atual): bodysuit + leve placa peitoral + ombreiras
- Sword Master (2ª): armadura mais pesada, capa
- Berserker (3ª): muscular, armadura quebrada/agressiva, espada maior

Por agora, focar APENAS na 1ª classe (base).

#### Concept art prompt v1 (pra rodar no Gemini)

Cole exatamente isto no Gemini. Aspect ratio será orientação portrait
(você pode mencionar isso ou só esperar o crop):

```
A 2D anime-style character illustration in the visual language of early
2000s Korean MMORPGs (Grand Chase, Ragnarok Online, MapleStory). Bold
clean black lineart, cel-shaded coloring with crisp shadow shapes,
vibrant saturated palette, slight chibi-leaning anatomy (head ~1/6 of
body height, expressive large eyes). Adventurous high-fantasy tone with
a youthful shounen energy. Full body composition, plain neutral
cream/beige background as in a character reference sheet. No watermarks,
no text overlay.

CHARACTER: Astrid, a 17-year-old female knight. Confident, impulsive,
fierce — slight playful smirk on her lips, fiery red eyes alight with
energy, looking directly at the viewer. Slim athletic build, around
165 cm tall.

HAIR: long crimson-scarlet hair tied in a high ponytail. A few loose
strands frame her face at the front. Slight movement in the ponytail
suggesting a light breeze.

OUTFIT (her "base" form, no armor equipped — like wearing only the
underclothing): a form-fitting scarlet-red full-body suit covering
torso, arms with long sleeves, and legs full-length. The fabric has a
subtle gradient from bright scarlet at the chest to deeper crimson at
the extremities. A thin black belt at the waist. Black leather
knee-high boots. Black fingerless gloves. No armor pieces — this is
the bare-base form.

POSE: full body, front view, neutral standing pose with weight slightly
on the right leg. Right hand resting on the pommel of a sheathed
single-handed longsword at her left hip. Left hand on her left hip.

WEAPON: a single-handed longsword, sheathed in a dark leather scabbard
on her left hip. Crossguard simple steel, pommel a small red gem.

LIGHTING: soft cinematic lighting from the upper-left, gentle shadow
on the right side of the body.

OUTPUT: full-body character reference sheet style, plain cream
background, single character framed centrally. Aspect ratio portrait
(taller than wide).
```

#### Iteration log

- **v1**: ficou idêntica à Elesis original. Razão: prompt mencionou Grand
  Chase + red ponytail + knight skirt + red+white = receita exata de Elesis.
  Solução pra v2: manter aesthetic do mundo (Korean MMORPG 2000s) mas
  trocar os marcadores visuais específicos. Pedir 4 variações com axes:
  hair style, outfit silhouette, color accents, distinguishing marker.

- **v5 turnaround LOCKED**: 4 ângulos (front / 3-4 / side / back) em
  `art/anchors/astrid-turnaround.png`. Caráter consistente entre as 4
  views; outfit, bronze accents, katana on left hip, low ponytail
  visível no back. Inconsistências menores (lighting, pose levemente
  diferente entre views) — aceitáveis. **Master reference de ângulos
  daqui pra frente.**

- **v4 anchor LOCKED**: solo full-body de Astrid em
  `art/anchors/astrid-anchor.png`. Resultado: low ponytail crimson curto,
  high-collar sleeveless top + black under-sleeves, scarlet leggings,
  red boots com bronze band, bronze pauldrons + elbows + knees + bracers
  matte, katana sheathed (black lacquered, white diamond-wrap hilt, round
  bronze tsuba), brinco asimétrico visível, pose confiante segurando o
  hilt. **Esta é a master reference daqui pra frente.**

- **v3 (refinement de v2-var4)**: 4 close refinements gerados, salvos em
  `art/anchors/astrid-v3.png`. User selecionou **v3a (esquerda)** como
  design final. Bronze armor matte, espada com hilt branco, low ponytail
  curto, brincos asimétricos (gem stud + dangling chain).

- **v2**: 4 variações geradas, salvas em `art/anchors/astrid-v2.png`.
  User selecionou a **variação 4 (direita)** como direção.
  Elementos travados a partir dela:
  - **Espada asiática** (katana/wakizashi-style, dark scabbard) no hip
    esquerdo. Quebra o padrão "knight com longsword reta" — posiciona
    Astrid como swordswoman com treinamento híbrido oriente-ocidente.
  - **Outfit two-tone**: torso em deep crimson, sleeves em black,
    leggings em scarlet. Two-tone breaking the Elesis red+white default.
  - **Bronze/copper armor accents**: pauldrons (ombros), cotovelos,
    joelheiras. Toque de leveza marcial sem ser heavy plate. Subtle
    samurai/eastern vibe.
  - **Cabelo mais curto, low ponytail** (não o high ponytail icônico
    da Elesis). Hair color stays crimson scarlet.
  - **Pose**: mão na cintura, postura confiante, leve sorriso de canto.

  Refinamentos pendentes pra v3:
  - Earrings asimétricos (axis C marker) ainda pouco visíveis — pode
    enfatizar
  - Face proportions/expression specifics
  - Detalhe da espada (tsuba/handle wrapping)
  - Cor/textura dos copper accents (mais opaco vs polido)

#### Anchor + Turnaround LOCKED ✓

- Master front anchor: **`art/anchors/astrid-anchor.png`**
- 4-angle turnaround: **`art/anchors/astrid-turnaround.png`**
- Use BOTH images como visual reference em qualquer geração futura
  envolvendo Astrid (poses, expressões, classes futuras) ou em prompts
  de outros personagens onde queremos style consistency.
- v2 grid: `art/anchors/astrid-v2.png` (histórico)
- v3 refinements: `art/anchors/astrid-v3.png` (histórico)

#### Pose sheets (pendente — agendado pré-Phase 10)

Após o cast estar completo (slot 2/3/4 com anchors lockeds), voltamos
pra Astrid e geramos pose sheets pra cada animação:
- Idle (front, side)
- Walk cycle (4-6 frames de ref)
- Run cycle
- Jump rise / jump fall / land
- Combo Z swings 1, 2, 3
- Skill cast x3
- Dash / air dash
- Dodge roll
- Parry stance
- Hurt / death

Esses sheets viram input direto pro pixel artist/Aseprite na Phase 10.
Decisão de adiar: melhor ter cast inteiro locked primeiro (style
consistency) do que ir fundo em uma personagem só.

#### Concept art prompt v2 — pede 4 variações

Cole isto no Gemini. Ele deve gerar 4 designs distintos pra você comparar.

```
I need you to generate 4 distinct character design variations for a
female swordswoman protagonist in a 2D anime-style 2000s Korean
MMORPG aesthetic (cel-shaded, bold lineart, vibrant palette, slight
chibi anatomy). DO NOT reproduce any existing copyrighted character —
this is an original creation that shares the era's visual language but
with its own design choices.

CORE TRAITS that ALL 4 variations must keep:
- 17-year-old female knight, slim athletic build (~165cm)
- Crimson-scarlet red as her dominant color (hair AND outfit accent)
- Red eyes
- Confident, impulsive expression — slight playful smirk
- Wields a one-handed sword (visible at her hip)
- Full body, front view, neutral standing pose
- Plain neutral cream/beige background (concept reference sheet style)
- "Base form" outfit: form-fitting bodysuit-style (not armor) — meant
  as the underclothes when she has no armor equipped
- Tone: youthful shounen energy, adventurous

VARY THESE AXES across the 4 designs (each variation should pick a
DIFFERENT combination, not all the same):

AXIS A — HAIR STYLE (avoid the standard high-ponytail trope):
- side ponytail with bangs swept across forehead
- loose long hair with a single braided strand on one side
- asymmetric cut (shorter on one side, longer on the other) flowing
- low ponytail with a wide bang and side locks framing the face

AXIS B — OUTFIT SILHOUETTE (avoid the red+white skirt+leggings combo):
- full-length scarlet bodysuit with black side panels and gold trim at
  collar, cuffs, and waist (regal/princely)
- crop-top jacket in scarlet with off-shoulder asymmetric sleeves over
  a black under-layer, plus high-waist black shorts and tall boots
- form-fitting scarlet bodysuit + a short hooded cape (hood down) with
  fur-trimmed collar, cape pinned at one shoulder
- two-tone outfit: deep crimson torso, black sleeves and pants, copper
  bronze armor accents at shoulders and knees

AXIS C — DISTINGUISHING MARKER (something Elesis canonically doesn't
have, to set this character apart):
- a small scar diagonally across one eyebrow (not blocking vision)
- a tribal/clan marking tattoo on collarbone or upper arm
- a black choker with a single red gem at the throat
- asymmetric earrings (one cuff/stud on one ear, longer drop on the
  other)

AXIS D — SWORD VARIATION:
- a slightly curved sabre with dark blade and red rune engraving on
  the fuller
- a straight longsword but with a flame-motif crossguard and red leather
  scabbard
- a shorter side-sword (slightly shorter than a longsword), simple
  steel, with a bronze pommel shaped like a stylized claw
- a slim straight blade in a dark red lacquered scabbard, white wrapped
  hilt

OUTPUT: 4 separate full-body character illustrations, side by side OR as
a 2x2 grid in a single image, plain cream background, all four
characters showing front view neutral pose. Make sure each variation is
clearly distinct from the others while still being recognizably the
same character archetype (red-haired young swordswoman).
```

#### Como usar

1. Cole o prompt acima no Gemini. Pode demorar um pouco — ele vai
   processar 4 designs.
2. Se o Gemini gerar uma imagem só com 4 painéis, ótimo. Se gerar
   apenas 1 personagem, pede follow-up: "Now generate 3 more
   variations exploring different combinations of the axes A-D above".
3. Manda **TODAS** as 4 variantes pro chat aqui — comentar quais
   elementos (de qualquer variação) ressoam mais.
4. Iteramos selecionando características das melhores variações pra
   um v3 final-ish.

#### Concept art prompt v3 — refina v4 escolhida

Cole isto no Gemini, idealmente na MESMA conversa onde gerou as 4
variações (assim ele tem contexto da imagem anterior). Se for nova
conversa, **upload `art/anchors/astrid-v2.png` antes do prompt**.

```
Looking at the previous 4-variation design sheet, I want to refine
variation #4 (the rightmost one) into the final character design for
Astrid. Generate 4 close refinements of THAT specific design, keeping
ALL of these locked elements identical across the 4 refinements:

LOCKED (do not change):
- Female swordswoman, 17, slim athletic build, ~165cm
- Crimson-scarlet red hair, kept short and tied in a LOW ponytail at
  the nape (not high). Bangs frame the face.
- Red eyes, confident smirk, fierce expression
- Two-tone outfit: deep crimson torso (high-collar fitted top), black
  long sleeves, scarlet-red leggings, dark boots
- Bronze/copper armor accents: pauldrons on shoulders, small armor
  plates on elbows, knee-guards
- Black thin belt at the waist
- Asian-style sword at her left hip — straight or slightly curved
  blade in a dark lacquered scabbard, white/red wrapped hilt
- Pose: standing front-view, full body, weight on right leg, left
  hand on hip, plain cream/beige background, character reference
  sheet style
- 2D anime cel-shading, bold lineart, vibrant saturated palette,
  early-2000s Korean MMORPG aesthetic

REFINE THESE DETAILS across the 4 variations:

DETAIL 1 — EARRINGS (asymmetric, more visible than in v2):
- v3a: small red gem stud on left ear + long thin dangling chain on
  right ear ending in a small blade-shape
- v3b: black cuff (cartilage piercing) on right ear + single small
  pearl drop on left
- v3c: matching small ruby studs on both ears (less asymmetric, more
  clean)
- v3d: red feather earring on one ear, plain stud on the other

DETAIL 2 — SWORD HILT/TSUBA:
- v3a: round tsuba (guard) with floral cherry-blossom motif, white
  hilt wrapping
- v3b: rectangular tsuba with geometric pattern, red hilt wrapping
  with black diamond pattern (menuki dots)
- v3c: oval tsuba in dark bronze with engraved flame motif, white
  with gold thread wrapping
- v3d: minimalist tsuba (small simple guard), red lacquered scabbard
  with gold inlay rings, black hilt wrapping

DETAIL 3 — COPPER ARMOR FINISH (slight tone variation):
- v3a: matte aged bronze (warm orange-brown)
- v3b: polished copper (high shine, reddish gold)
- v3c: tarnished darker bronze with green-blue verdigris hints
- v3d: clean bright bronze (newly forged feel)

DETAIL 4 — FACE/HAIR FINER DETAILS:
- v3a: a single thin red ribbon tied at the base of the low ponytail
- v3b: hair has a few strands escaping/messy, a thin braid weaving
  through the side
- v3c: clean cut, hair smoothly tied, with side-locks framing the face
- v3d: hair pinned with a small bronze hair-stick (kanzashi-style)

OUTPUT: 4 refined character designs (full body, front view) in a 2x2
grid OR side by side. Each variation should look like the FINAL Astrid,
just with different combinations of the 4 detail dimensions above. The
overall silhouette and color palette should remain consistent across
all 4 — only the listed details change.
```

#### Próximos refinamentos esperados

Após o v3, deve dar pra escolher 1 das 4 (ou montar a final fundindo
detalhes específicos). Quando travar, salvamos como
`art/anchors/astrid-base-front-v3.png` e isso vira a referência canônica
pra:
- Turnaround sheets (front / 3-quarter / side / back)
- Pose sheets (idle, walk, attack, dodge, etc.) — input pro Phase 10
- Reference pra slots 2/3/4 (`--sref` equivalente: upload Astrid no
  prompt + descrição de outro personagem na mesma estética)

#### Concept art prompt v4 — anchor canônico solo

Cole no Gemini, na MESMA conversa onde gerou v3 (assim Gemini lembra
das 4 refinements). Se for nova conversa, **upload `art/anchors/astrid-v3.png`
antes do prompt**.

```
Take variation 1 (the LEFTMOST design) from the previous v3 refinement
sheet and produce a clean, single, high-quality solo character
reference image. This becomes the CANONICAL anchor for Astrid — the
master reference used for all future generations (turnarounds, action
poses, future characters in the same world).

LOCKED FINAL DESIGN — every detail below MUST appear exactly:

CHARACTER: Astrid, 17-year-old female swordswoman. Slim athletic
build, around 165 cm. Personality: confident, impulsive, fierce —
slight playful smirk on her lips, fiery red eyes alight with energy,
looking directly at the viewer. Subtle anime-style large expressive
eyes.

HAIR: crimson-scarlet red, shoulder-length, tied in a LOW ponytail at
the nape of the neck. The ponytail itself is short — just past the
shoulder blades. Side bangs frame the face; a few short loose strands
at the front. Clean and tidy, NOT messy.

EYES: bright red, almond-shaped, large, expressive (anime style).

EARRINGS (asymmetric, must be clearly visible):
- LEFT ear: a single small red gem stud
- RIGHT ear: a thin dangling silver chain ending in a small
  blade-shaped pendant (~1.5cm long)

OUTFIT (her "base" form, no heavy armor over the body):
- High-collar fitted top in DEEP CRIMSON RED, sleeveless
- BLACK long fitted under-sleeves on both arms (separate from the top,
  full length to the wrist)
- A thin BLACK belt at the waist with a small bronze buckle
- SCARLET-RED leggings (slightly brighter than the top to differentiate)
- Dark RED mid-calf boots with a slight cuff fold at the top, dark
  bronze accent band

ARMOR ACCENTS in MATTE AGED BRONZE (warm orange-brown finish, not
shiny):
- Angular bronze pauldrons on both shoulders — small but prominent,
  asymmetric edges, slightly weathered look
- Bronze elbow plates (ovoid, fitted)
- Bronze knee guards covering the front of each knee, slightly
  pointed at the bottom
- Small bronze bracers at both wrists

WEAPON (Asian-style sword at her LEFT hip):
- Katana-length, slightly curved blade (sheathed)
- Scabbard: BLACK lacquered, smooth finish
- Tsuba (guard): ROUND, with a subtle cherry-blossom (sakura) flower
  motif etched into dark bronze
- Tsuka (hilt): WHITE wrap in classic diamond pattern (tsukamaki),
  with a small dark menuki ornament
- A red corded sageo wraps the scabbard near the belt
- Total visible length: from hip to about mid-calf

POSE: standing front-view, full body visible from head to feet,
centered. Weight slightly on the right leg; left leg relaxed. RIGHT
hand resting on the hilt of the sheathed sword (or near the pommel).
LEFT hand on her left hip. Direct gaze at viewer, slight smirk.

LIGHTING: soft cinematic lighting from upper-left. Gentle subtle
shadows on the right side of the body. Highlights on hair, pauldrons,
and sword hilt.

BACKGROUND: plain solid cream/beige (#F2EAD6 ish), like a clean
character reference sheet. NO scenery, NO other characters, NO text,
NO logos, NO watermarks, NO grid panels — just the single isolated
character.

STYLE: full 2D anime illustration (NOT pixel art), bold clean black
lineart, cel-shaded coloring with crisp shadow shapes, vibrant
saturated palette. Slight chibi-leaning anime anatomy (head about
1/6 of body height). Early-2000s Korean MMORPG illustration aesthetic
(Grand Chase / Ragnarok Online era 2D character art).

OUTPUT: ONE single character, full body, centered in frame, portrait
aspect ratio (taller than wide), highest available resolution. This is
the canonical anchor reference image — make it as clean and detailed as
possible.
```

#### Concept art prompt v5 — Turnaround sheet (4 ângulos)

Cole no Gemini. Idealmente na MESMA conversa do anchor (Gemini já tem o
contexto visual). Se for nova conversa, **upload `art/anchors/astrid-anchor.png`
ANTES do prompt** — sem upload da anchor, esse turnaround vai falhar.

```
Using THE EXACT character from the previous reference image (Astrid,
the crimson-haired swordswoman with bronze armor accents and Asian
katana — the locked anchor) as the visual reference, generate a
CHARACTER TURNAROUND SHEET showing the SAME character from 4 different
angles, arranged side-by-side in a single landscape image.

THE 4 VIEWS (left to right, equal size, evenly spaced):
1. FRONT — character facing the viewer
2. THREE-QUARTER — character rotated about 45° to the character's right
   (viewer sees the front-right of the body and partial profile)
3. SIDE — full right-side profile (character facing image-right)
4. BACK — character's back facing the viewer (we see the rear of the
   ponytail, the back of the outfit, and the scabbard from the rear)

POSE (must be IDENTICAL across all 4 views):
- Standing relaxed, both arms naturally at sides, hands open at hip
  level (NO hand resting on the sword)
- Feet shoulder-width apart, weight balanced evenly
- Neutral expression with the slight playful smirk preserved
- KATANA REMAINS SHEATHED at left hip — NOT held in hand

LOCKED VISUAL DETAILS — EVERY one of these MUST match the anchor
image and remain IDENTICAL across all 4 views (the entire purpose of
this sheet is consistency):

HAIR: crimson-scarlet, short, low ponytail at the nape. Visible from
front (peeking past shoulders), 3/4 (slightly), side (full ponytail
profile), and BACK (whole ponytail clearly visible behind the head).
Side bangs frame the face in front and 3/4. Color and length identical
to anchor.

EARRINGS (asymmetric):
- LEFT ear: small red gem stud (visible in front, 3/4 right view, and
  back-left view)
- RIGHT ear: thin dangling silver chain ending in a small blade-shaped
  pendant (~1.5cm) — visible in front, side-right view, and back

EYES: bright red, almond-shaped, anime-style large and expressive.

OUTFIT:
- High-collar deep CRIMSON sleeveless top
- BLACK long fitted under-sleeves on both arms
- Thin BLACK belt at waist with small bronze buckle (buckle visible
  front and 3/4 only)
- SCARLET-RED leggings (slightly brighter than the top)
- Dark RED mid-calf boots with cuff fold and bronze accent band

BRONZE ARMOR ACCENTS (matte aged bronze, warm orange-brown, NOT shiny):
- Angular pauldrons on BOTH shoulders — visible from all 4 angles
- Elbow plates on both arms
- Knee guards on both legs (front of knees, slightly pointed at the
  bottom)
- Wrist bracers on both forearms

KATANA at LEFT hip:
- Black lacquered scabbard (visible from front: small piece visible
  at her left hip; 3/4: more of the scabbard visible; side: full
  scabbard length visible behind/along her left side; back: scabbard
  visible from behind, hanging at the left side)
- White diamond-pattern hilt wrap (tsukamaki) at the top of the scabbard
- Round bronze tsuba with subtle cherry-blossom motif
- Red sageo cord wrapping the scabbard near the belt

OUTPUT REQUIREMENTS:
- ONE single landscape-aspect image (approximately 3:1 or 4:1 ratio,
  wide horizontal)
- 4 character views arranged in a row, equal size, evenly spaced
- All 4 standing on the same continuous plain cream/beige background
- NO text labels, NO grid lines, NO panel dividers, NO scenery
- Bold clean black lineart, cel-shaded coloring, vibrant saturated
  palette, slight chibi-leaning anime anatomy, early-2000s Korean
  MMORPG aesthetic
- Highest quality possible — this is a master character reference
  sheet that will guide all future animation and sprite work
```

#### Avaliando o turnaround

Verifica em cada view:
- [ ] **Mesmo personagem** identificável nos 4 ângulos (cabelo, cor,
  proporção, idade)
- [ ] **Outfit consistente**: red top + black sleeves + red leggings +
  red boots em TODOS os 4
- [ ] **Bronze accents** nos mesmos lugares em todos
- [ ] **Katana sheathed at left hip** — visível em todas as 4 views
- [ ] **Low ponytail** visível atrás (na BACK view especialmente)
- [ ] **Asymmetric earrings** quando ear visível
- [ ] **Pose neutra** consistente (arms at sides, sem hand no sword)

Bugs comuns a verificar:
- Hair ficou de cor diferente em algum ângulo? (Gemini às vezes vacila)
- Espada apareceu em ear errada? (deve ser SEMPRE LEFT hip)
- Outfit acrescentou armor extra que não pediu?
- Mãos múltiplas mutadas?

Se algo estiver errado, follow-up: *"Regenerate keeping all 4 views but
fix [specific issue] — the back view is missing the ponytail / the
side view sword is on the wrong hip / etc."*

#### Após turnaround locked

Salva como `art/anchors/astrid-turnaround.png`. Próximos steps:

1. **Pose sheets** — usar anchor + turnaround como duplo-upload, gerar
   poses específicas pra cada animação. Lista de poses necessárias:
   - Idle (já temos — front)
   - Walk cycle (4-6 frames de referência: passo direito alto, médio,
     baixo, esquerdo alto, médio, baixo)
   - Run cycle (similar mas postura mais agressiva)
   - Jump rise (corpo elevado, braços ascending)
   - Jump fall (corpo descendo, braços spread)
   - Land (postura compacta)
   - Combo Z swing 1, 2, 3 (3 swings da espada)
   - Skill cast (postura de canalização)
   - Dash horizontal
   - Air dash
   - Dodge roll (chibi compact)
   - Parry stance (espada elevada, postura defensiva)
   - Hurt / knock back
   - Death

2. **Slots 2/3/4** (cast support) — começar a definir os outros 3
   personagens da Eternia. Usar `astrid-anchor.png` como `--sref`
   equivalente (upload no Gemini + "match this aesthetic but different
   character").

3. **Mob designs**, **biomes**, **UI** — depois.

### Naia (slot 2 — Elven Archer)

**Status**: bible v1, concept art prompt v1 escrito (a rodar).

#### Bible

| Campo | Valor |
|---|---|
| Nome | Naia |
| Classe (1ª) | Archer (arqueira élfica de arco curto) |
| Inspiração | Lire (Grand Chase) — https://grandchase.fandom.com/pt-br/wiki/Lire |
| Idade | 17 (mesma faixa da Astrid) |
| Build | esguia ágil, ~160cm (levemente menor que Astrid) |
| Personalidade | sábia, calma, observadora. Conectada à natureza. Contraste direto com Astrid impulsiva. |
| Race | Elf — orelhas pontudas |
| Cabelo | verde-esmeralda profundo (jewel tone, NÃO leafy/druid green), longo, mostly solto com single thin side braid |
| Olhos | verde-esmeralda |
| Arma | arco curto recurvo de madeira (Lire 1ª classe vibe) + quiver de couro nas costas |
| Distinguishing | óculos pequenos redondos sem aro grosso (librarian-style) — reforça vibe sábia |
| Origem | TBD (sugestão: descendente de bibliotecários élficos de uma floresta antiga, deixou seu refúgio em busca da Eternia) |

#### Outfit (light archer attire)

- DEEP EMERALD GREEN long-sleeve fitted tunic ending mid-thigh
- BROWN leather laced bodice/vest sobre o tunic
- BLACK fitted leggings (mid-thigh down)
- BROWN mid-calf leather boots com fivela simples
- BROWN leather bracers nos dois antebraços (bowstring guards)
- Thin BROWN leather belt
- Small leaf-shaped silver pendant na garganta (elven heritage marker)
- Brown leather quiver nas costas, strap diagonal cruzando o peito,
  arrows visíveis sobre o ombro direito

#### Concept art prompt v1 (anchor target)

Cole no Gemini, preferencialmente em **NOVA conversa**. **IMPORTANTE**:
upload `art/anchors/astrid-anchor.png` ANTES do prompt — vamos usar a
Astrid como style reference (não character reference) para garantir
consistência visual entre os dois personagens da Eternia.

```
I'm generating concept art for Naia — the second character of the same
adventuring party as Astrid (the crimson swordswoman from the uploaded
reference image). Use the uploaded Astrid reference image ONLY for
art-style consistency (line quality, cel-shading style, color
saturation, anime proportions, early-2000s Korean MMORPG aesthetic).
Naia is a COMPLETELY DIFFERENT character — different person, different
race, different look — but they live in the same world and should feel
visually cohesive.

CHARACTER: Naia, 17-year-old female elven archer. Slim agile build,
~160cm (slightly shorter than Astrid). Personality: wise, calm,
observant. Composed expression — soft slight smile, kind but focused
gaze. The contrast in personality from Astrid is intentional.

ELF FEATURES: long pointed elven ears, clearly visible through her
hair (especially in front and 3/4 angles).

HAIR: deep emerald-green color (jewel tone, like dark jade or deep
emerald — NOT lime-green, NOT olive, NOT druid forest-green). Long,
mostly loose, flowing past her mid-back. A single thin braid woven on
one side framing her face.

EYES: bright emerald-green (matching hair tone), almond-shaped, large
and expressive in anime style.

GLASSES: thin wire-frame round eyeglasses, almost frameless, with
small horizontally-oval lenses — librarian/scholar style. Delicate,
NOT thick or oversized. Sit naturally on the bridge of her nose. They
should be clearly visible but subtle.

OUTFIT (light archer attire):
- Long-sleeve fitted DEEP EMERALD GREEN tunic ending at mid-thigh
- BROWN leather vest/bodice over the tunic, laced up the front with
  brown cord, snug fit
- BLACK fitted leggings from mid-thigh down to the boots
- BROWN leather mid-calf boots with simple buckle and slight cuff fold
- BROWN leather bracers on both forearms (bowstring guards), simple
  craftsmanship
- Thin BROWN leather belt at the waist
- Small leaf-shaped SILVER pendant at her throat (elven heritage)

WEAPON & GEAR:
- A short wooden recurve bow held in her LEFT hand at her side, lowered
  but ready. Simple wooden craftsmanship, leather wrap at the grip, NO
  flashy ornamentation, an honest practical bow.
- BROWN leather quiver on her back, leather strap diagonally across her
  chest. 5-7 fletched arrows clearly visible jutting over her right
  shoulder.

POSE: standing front-view, full body visible from head to feet,
centered. Weight slightly on the right leg; left leg relaxed. RIGHT
hand resting near her right hip (open, relaxed). LEFT hand holding the
bow at her side. Composed posture, calm gentle smile, looking directly
at the viewer through her glasses.

LIGHTING: soft cinematic lighting from upper-left (matching Astrid
reference). Gentle shadows on the right side of the body.

BACKGROUND: plain solid cream/beige (#F2EAD6 ish), like a clean
character reference sheet. NO scenery, NO other characters, NO text,
NO logos, NO watermarks.

STYLE: full 2D anime illustration (NOT pixel art), bold clean black
lineart, cel-shaded coloring with crisp shadow shapes, vibrant
saturated palette. Slight chibi-leaning anime anatomy (head about
1/6 of body height). Early-2000s Korean MMORPG illustration aesthetic.
**Match the line quality, cel-shading style, and overall art language
of the uploaded Astrid reference exactly — same world, same era, same
illustrator's hand.**

OUTPUT: ONE single character, full body, centered in frame, portrait
aspect ratio (taller than wide), highest available resolution. This is
the canonical anchor reference image for Naia.
```

#### Iteration log

- **v1 (uploading Astrid)**: leaked — Gemini interpretou o upload de
  Astrid como character reference em vez de style reference, regenerou
  Astrid em vez de Naia. Conclusão: pra novos personagens, NÃO uploadar
  anchor de outro personagem.

- **v1.1 (no upload, prompt-only)**: ✓ LOCKED. Resultado: deep emerald
  hair longo com side braid, orelhas élficas pontudas visíveis, óculos
  finos round perfeitos, tunic verde + leather bodice + black leggings
  + brown boots, recurve bow na esquerda baixa, quiver com arrows
  visíveis. Soft smile, contraste perfeito com Astrid impulsiva.
  Salvo em `art/anchors/naia-anchor.png`.

#### Anchor LOCKED ✓

- Master reference: **`art/anchors/naia-anchor.png`**
- Esta é a master reference da Naia daqui pra frente. Pra novas
  gerações da Naia (turnaround, poses, etc.) — fazer upload desta
  imagem.

#### Concept art prompt v2 — Turnaround sheet

Cole no Gemini, **NOVA conversa**. **Upload `art/anchors/naia-anchor.png`
ANTES do prompt** — gerar Naia a partir da Naia é o uso correto.

```
Using THE EXACT character from the uploaded reference image (Naia, the
elven archer with deep emerald-green hair, librarian glasses, green
tunic with brown leather bodice, and short wooden bow) as the locked
visual reference, generate a CHARACTER TURNAROUND SHEET showing the
SAME character from 4 different angles, arranged side-by-side in a
single landscape image.

THE 4 VIEWS (left to right, equal size, evenly spaced):
1. FRONT — character facing the viewer
2. THREE-QUARTER — character rotated about 45° to the character's right
   (viewer sees the front-right of the body and partial profile)
3. SIDE — full right-side profile (character facing image-right)
4. BACK — character's back facing the viewer (we see the rear of the
   long hair, the back of the outfit, and the quiver from behind)

POSE (must be IDENTICAL across all 4 views):
- Standing relaxed, both arms naturally at sides
- Right hand open at hip; LEFT hand holding the wooden recurve bow
  lowered at her left side, vertical
- Feet shoulder-width apart, weight balanced evenly
- Composed expression with the soft slight smile preserved
- Calm and serene posture

LOCKED VISUAL DETAILS — every one of these MUST match the anchor and
remain IDENTICAL across all 4 views:

ELF FEATURES: long pointed elven ears, clearly visible especially in
front and 3/4 views; visible from side as a profile silhouette; from
back the ears poke out behind the hair.

HAIR: deep emerald-green (jewel tone, dark jade — NOT lime, NOT
olive). Long, mostly loose, flowing past the mid-back. Single thin
braid woven on one side framing the face (visible in front and 3/4).
Hair length and color identical across all views — visible from BACK
view as a long flowing emerald cascade.

EYES: bright emerald-green, almond-shaped, large expressive anime
style.

GLASSES: thin wire-frame round eyeglasses, almost frameless, small
horizontally-oval lenses — librarian style. Visible in front and 3/4;
profile view shows them from the side; back view doesn't show glasses
(face hidden).

OUTFIT:
- Long-sleeve fitted DEEP EMERALD GREEN tunic ending mid-thigh
- BROWN leather laced vest/bodice over the tunic, brown cord lacing
  visible up the front
- BLACK fitted leggings from mid-thigh down
- BROWN leather mid-calf boots with simple buckle and slight cuff fold
- BROWN leather bracers on both forearms
- Thin BROWN leather belt at the waist
- Small leaf-shaped SILVER pendant at her throat (visible front and 3/4)

WEAPON & GEAR:
- Short wooden RECURVE BOW held in her LEFT hand at her side, vertical,
  lowered. Simple wooden craftsmanship, leather wrap at the grip.
  Visible in all 4 views (silhouette from side and back).
- BROWN leather QUIVER on her back, leather strap diagonally across
  her chest. 5-7 fletched arrows visible jutting over the right
  shoulder. The QUIVER is especially visible from the BACK view.

OUTPUT REQUIREMENTS:
- ONE single landscape-aspect image (approximately 3:1 or 4:1 ratio,
  wide horizontal)
- 4 character views arranged in a row, equal size, evenly spaced
- All 4 standing on the same continuous plain cream/beige background
- NO text labels, NO grid lines, NO panel dividers, NO scenery
- Bold clean black lineart, cel-shaded coloring, vibrant saturated
  palette, slight chibi-leaning anime anatomy, early-2000s Korean
  MMORPG aesthetic — match the anchor exactly
- Highest quality possible
```

#### Avaliando o turnaround da Naia

Mesmo procedimento da Astrid:
- [ ] Mesmo personagem identificável nos 4 ângulos
- [ ] Hair color e length consistentes
- [ ] **Ears élficas** visíveis em todos (especialmente front e 3/4)
- [ ] **Glasses** front + 3/4 (back view não precisa)
- [ ] Outfit consistente
- [ ] **Bow** na left hand em todas
- [ ] **Quiver** visível atrás especialmente na BACK view (esse é o
  teste-chave — se na BACK view o quiver não aparecer, missing critical
  detail)
- [ ] Pose neutra (arms relaxed)

Se algum view tiver bug, follow-up: "regenerate keeping front/3-4/side
correct but fix the back view — the quiver and ears are missing".

Salva como `art/anchors/naia-turnaround.png` quando travar.

#### Concept art prompt v2.1 — Turnaround com rotações DISTINCTAS

**v2 falhou**: Gemini gerou view 1 e 2 quase idênticas (ambas front-ish),
view 3 ainda mostrando rosto frontal (não profile real). Só view 4
(back) estava distinta. Fix: graus explícitos + descrição visual
específica do que deve ser visível em cada ângulo + linguagem forte
forçando diferenciação.

Cole no Gemini, **NOVA conversa**. **Upload `art/anchors/naia-anchor.png`
ANTES** do prompt.

```
Generate a 4-VIEW CHARACTER TURNAROUND SHEET of Naia (the elven archer
from the uploaded reference image). The 4 views must show the character
at 4 DISTINCTLY DIFFERENT angles of body rotation. Each view MUST look
DRAMATICALLY different from the others — this is the entire purpose of
a turnaround sheet, NOT four near-identical front-views.

ROTATION ANGLES (arranged left to right in a single landscape image):

VIEW 1 — FULL FRONT (0° rotation):
- Character facing the camera DIRECTLY, both shoulders perfectly level
  and equally visible
- Nose pointing straight at viewer; both eyes equally visible
- Both pointed elf ears symmetrically visible on either side of the head
- Body squared up to camera, chest plane parallel to image plane
- Bow held in her left hand at her left side
- Quiver behind shoulders, only the tops of arrows poking up over both
  shoulders

VIEW 2 — THREE-QUARTER (45° rotation; the character has turned 45° to
HER OWN right, so the viewer now sees more of her LEFT side):
- This MUST be visibly different from VIEW 1
- Her face is at 3/4 angle: viewer sees about 75% of the face but with
  visible depth — the FAR cheek (her right cheek) recedes, the NEAR
  cheek (her left cheek) is forward and prominent
- The far ear (right) is partly hidden behind hair; the near ear (left)
  is fully visible
- Her right shoulder pulls back, body twists 45°
- The bow held in her left hand is now MORE prominent from this angle,
  positioned forward
- Quiver and arrows visible behind her right shoulder receding back
- The hair side-braid should be on whichever side is visible

VIEW 3 — FULL RIGHT-SIDE PROFILE (90° rotation, strict side view):
- This is a STRICT PROFILE silhouette — the character's face is shown
  ENTIRELY from the side
- ONLY ONE eye visible (her right eye), ONLY ONE ear visible (her right
  ear) — the other side of the face is completely hidden
- Nose silhouette points to image-right
- Body is fully rotated 90° — the chest plane is perpendicular to the
  image plane (we see her right side)
- Long emerald hair flows down behind her, ponytail-like or loose,
  visible cascading down her back from this angle
- Bow held in left hand is on the FAR side (away from viewer), partially
  obscured behind her body
- Quiver visible directly behind her shoulders, arrows poking up
  behind/above
- This view MUST look DRAMATICALLY different from view 1 — NO frontal
  view of the face is allowed; if you can see both cheeks, it is wrong

VIEW 4 — FULL BACK (180° rotation, character's back to the viewer):
- We see the back of her head; long flowing emerald hair cascading down
  her back fully visible
- The pointed elf ears poke out behind the hair (small detail)
- Body fully facing AWAY from viewer; back of the green tunic and brown
  leather bodice (back-laces if the bodice has them) visible
- The QUIVER is the dominant feature in this view — clearly visible
  centered on her back, arrows pointing up
- Bow held in left hand visible from behind, jutting out at her left
  side as a silhouette
- No facial features visible (face hidden)

ALL 4 VIEWS share these LOCKED elements (must remain identical across
all rotations):

CHARACTER: Naia, elven archer. Slim agile build, ~160cm. Calm composed
expression with soft slight smile (visible in views 1 and 2; partial
in view 3; not visible in view 4).

HAIR: deep emerald-green jewel tone (NOT lime, NOT olive), long flowing
past mid-back. Single thin side braid framing the face. Color and
length identical across views.

EYES: bright emerald-green, almond-shaped, large expressive (when
visible).

ELF EARS: long pointed.

GLASSES: thin wire-frame round eyeglasses, almost frameless, small
horizontally-oval lenses — librarian style. Visible in views 1 and 2;
visible from the side in view 3 as part of the profile; not visible in
view 4 (back of head).

OUTFIT (must match the anchor exactly):
- Long-sleeve fitted DEEP EMERALD GREEN tunic, mid-thigh length
- BROWN leather laced vest/bodice over the tunic
- BLACK fitted leggings
- BROWN leather mid-calf boots
- BROWN leather bracers on both forearms
- Thin BROWN leather belt
- Small leaf-shaped SILVER pendant at throat (front and 3/4 only)

WEAPON & GEAR:
- Short wooden RECURVE BOW held in her LEFT hand at her side, lowered
  vertical position, in all 4 views
- BROWN leather QUIVER on her back with 5-7 fletched arrows over the
  right shoulder

POSE: standing relaxed, weight balanced. Arms at sides except left
hand holding bow. NO combat poses, NO drawn bow.

OUTPUT REQUIREMENTS:
- ONE single landscape image (~3:1 to 4:1 ratio)
- 4 character views in a row, equal size, evenly spaced
- All on a single continuous plain cream/beige background
- NO text labels, NO panel dividers, NO scenery
- Bold clean black lineart, cel-shaded, vibrant saturated palette,
  early-2000s Korean MMORPG anime aesthetic
- Highest quality

CRITICAL CHECKS — if any of these fail, the turnaround is wrong:
- View 1 and View 2 must be VISIBLY DIFFERENT (not near-identical)
- View 3 must be a STRICT PROFILE — only one eye, only one ear visible
- View 4 must show the BACK clearly with the quiver dominant
- All 4 views must be the SAME character with the SAME outfit/hair/gear
```

#### Avaliando o turnaround da Naia v2.1

Os checks acima — na ordem de prioridade:
1. **Views 1 e 2 são visivelmente diferentes**? Se sim, primeiro problema
   resolvido.
2. **View 3 é profile estrito** (1 olho, 1 ear, sem rosto frontal)? Se
   sim, segundo problema resolvido.
3. View 4 back tá com quiver e ears? (já tava OK, manter).
4. Mesmo personagem nos 4 (cabelo, óculos, outfit)?

Se ainda falhar em um view específico, follow-up: "Regenerate keeping
views 1, 2, 4 correct but fix view 3 — it MUST be a strict profile
showing only one side of the face. The character must be rotated 90
degrees, with chest pointing to the right of the image."

Salva como `art/anchors/naia-turnaround.png` quando travar.

#### v2.1 result + follow-up para v3 (corrigir bow handedness)

v2.1 melhorou: views 1, 2 e 4 ficaram visivelmente distintas. Single
issue: **view 3 (profile) com o arco no lado errado** — Gemini
"helpfully" colocou o arco no lado VISÍVEL (left-side da imagem) em vez
de manter na mão esquerda dela (que do profile direito está atrás do
corpo, parcialmente oculta).

##### Opção A — Follow-up na mesma sessão (recomendado se o v2.1 ficou OK em geral)

Cole no Gemini, mesmo chat:

```
Two issues with the previous turnaround:

1. THE LEGS ARE CROPPED. The image shows only head to thigh/knee — but
   a turnaround sheet MUST show the FULL BODY from head to FEET in all
   4 views, including the boots. Each view should be a complete
   character figure, full-length, with the cream background extending
   below her feet and above her head with margin.

2. View 3 (profile) is wrong — the bow appears on the visible side of
   her body. The bow must remain in her LEFT hand at her LEFT side
   throughout. In the right-side profile (90° rotation, chest pointing
   to image-right), her LEFT side is on the FAR side of her body —
   AWAY from the viewer. The bow should be MOSTLY HIDDEN behind her
   body silhouette; only the top and bottom tips may peek out behind
   her. DO NOT mirror the bow to the visible side.

Please regenerate the turnaround:
- All 4 views in FULL BODY (head to feet, both boots visible at the
  bottom of each view)
- Views 1, 2, 4 keep their current rotations and details
- Fix view 3 to be a strict right-side profile with the bow correctly
  on the far side, mostly hidden behind her body
- Same character throughout: emerald hair long with side braid, glasses
  (front and 3/4 only), green tunic + brown leather bodice + black
  leggings + brown mid-calf boots, brown bracers, quiver on back

Aspect ratio: wide landscape (3:1 or 4:1) — the image must be tall
enough that all 4 full-body characters fit completely.
```

##### Opção B — Nova sessão com pose-locked v2.2 prompt (se Opção A drift demais)

Cole no Gemini em nova conversa, upload `naia-anchor.png`:

```
Generate a 4-VIEW CHARACTER TURNAROUND SHEET of Naia (the elven archer
from the uploaded reference). Each view shows the same character at a
different rotation, FULL BODY (from the top of her head down to her
boots — feet must be visible in all 4 views).

CRITICAL FRAMING REQUIREMENT:
- Each of the 4 views must show the COMPLETE full-body figure of the
  character from head to feet
- DO NOT crop the legs or feet
- There should be cream background visible BELOW her boots and ABOVE
  her head with a small margin in every view

Each view shows the same character at a different rotation. The pose
is LOCKED across all 4 views — every limb in the same position, only
the body rotation changes.

LOCKED POSE (identical in all 4 views):
- Standing relaxed, both feet shoulder-width apart, weight even
- LEFT arm down at her LEFT side, holding the wooden recurve bow in
  her LEFT hand, vertical, the bow's bottom tip near her left foot
- RIGHT arm relaxed at her right side, hand open
- Head facing forward (in the direction of the body rotation)
- Composed expression with soft smile

ROTATIONS (left to right in single landscape image):

VIEW 1 — FULL FRONT (0°):
- Body squared to camera, both shoulders visible equal
- Both elf ears visible symmetrically
- Bow held in left hand visible at her LEFT side (image-right of her,
  image-LEFT from viewer's perspective — the right side of the panel
  if viewer is centered)
- Quiver behind shoulders, arrow tips poking up

VIEW 2 — THREE-QUARTER (45° rotation, character turned to HER OWN
right):
- Visible different from view 1 — torso clearly twisted
- Far side: her RIGHT shoulder pulled back, far cheek receding
- Near side: her LEFT side now closer to viewer, left ear and left
  cheek prominent
- Bow in left hand now visible PROMINENTLY in front (closer to viewer)
  on the near (left) side of her body
- Quiver behind right shoulder receding to the back

VIEW 3 — STRICT RIGHT-SIDE PROFILE (90° rotation, chest pointing to
image-right):
- This is a SILHOUETTE PROFILE — face shown only from the side
- ONLY ONE eye visible (her right eye), ONLY ONE ear visible (her
  right ear). Other side of face completely hidden.
- Body fully rotated 90°. The chest plane is perpendicular to the
  image plane.
- THE BOW IS IN HER LEFT HAND — which from this right-side profile is
  on the FAR side of her body, facing AWAY from the viewer. The bow
  is therefore MOSTLY HIDDEN behind her body silhouette. Only the
  TOP TIP and BOTTOM TIP of the bow may be visible peeking out from
  behind her body. DO NOT show the full bow on the visible side.
- Quiver visible directly above/behind her, arrows poking up
- Long emerald hair flows down her back (visible)

VIEW 4 — FULL BACK (180°):
- Character's back to viewer
- Long emerald hair cascading down her back
- QUIVER dominant in center of back, arrows pointing up
- BOW visible at her LEFT side (now on image-RIGHT from viewer's
  perspective in this back view) — held in left hand, partially
  visible silhouette
- Pointed elf ears poking out behind hair (small detail)

LOCKED CHARACTER (same as anchor): emerald hair long with side braid,
green tunic + brown leather laced bodice + black leggings + brown
boots, brown bracers, brown belt, silver leaf pendant, librarian
glasses (visible front + 3/4), elf ears.

OUTPUT: single landscape image (~3:1), 4 views in a row, equal size,
plain cream background, NO text labels, bold lineart cel-shaded
early-2000s Korean MMORPG anime style. Highest quality.

CRITICAL CHECK before submitting:
- All 4 views show FULL BODY from head to feet (boots visible at the
  bottom)
- View 3 must NOT show the bow on the visible side of the body
- View 3 must show only ONE eye and ONE ear
- All 4 views are clearly different rotations
- Same character throughout
```

## Prompt format / anatomy

Pra você reusar e adaptar:

```
[STYLE ANCHOR — copia o paragraph fixo]

CHARACTER: [nome, idade, gênero, personalidade-em-1-frase, build]

HAIR: [cor, comprimento, estilo, detalhes]

OUTFIT: [peças, cores, materiais, gradiente, accessories]

POSE: [orientação, ângulo, posição mãos/pernas, expressão]

WEAPON / PROPS: [armas, itens, accessories visíveis]

LIGHTING: [direção, mood]

OUTPUT: [framing, background, aspect ratio]
```

## Iteration tips (Gemini specific)

- **Conversational refinement**: depois das primeiras 4 imagens, peça
  ajustes no chat: "Make her hair longer", "Replace the gem on the pommel
  with a sapphire", "She should look more serious".
- **Image attachment**: uma vez que tem uma imagem aprovada, **upload
  ela** + peça "generate the same character but [pose change]". Gemini
  lê o visual e mantém a maioria dos traits. Não é tão preciso quanto
  `--cref` do MJ mas funciona pra turnarounds.
- **Save EVERYTHING**: salvar todos os tries (mesmo os ruins) ajuda a
  ver o caminho da iteração e às vezes uma combinação de elementos vai
  emergir.
- **Don't trust hands**: AI gens com armas/punhos sempre são bugados.
  Aceita que vai ter que limpar/redesenhar manualmente em Aseprite.

### Contexto / sessão — quando reiniciar vs manter

Gemini retém contexto da conversa. Isso pode atrapalhar:

| Cenário | Mesma sessão | Nova sessão |
|---|---|---|
| Anchor de NOVO personagem | | ✓ (clean state, evita bleed-over) |
| Turnaround | | ✓ (nova + upload da anchor) |
| Iterar correção pequena ("fix view 3 only") | ✓ | |
| Quando o modelo "trava" (ignora instruções) | | ✓ |
| Variação de detail (cor de armadura, hair) | ✓ | |

Sintomas de contexto travado: o modelo regenera o output anterior com
mudanças mínimas, ignora instruções negativas ("NOT red"), ou mistura
uploads com gens anteriores. Quando notar, **abre nova conversa**.

### Pose consistency hack

Pra turnarounds, especificar **POSE LOCKED** em vez de "neutral pose":
listar exatamente onde cada braço/mão/perna está em todas as views.
Modelo tende a "improvisar" se a pose não for travada.

## Workflow após Astrid travada

1. Usar Astrid anchor (upload no Gemini) + prompt "now generate her in a
   sword-drawing combat pose" → recolher poses pra refs de animação:
   - Idle (já temos — base front)
   - Walk cycle (3-4 frames de referência)
   - Run / sprint
   - Jump rise / jump fall
   - Combo Z swings (3 frames)
   - Skill cast
   - Dodge roll
   - Parry stance
   - Hurt / knocked back
   - Death

2. Pra **outras characters**: usar mesmo `style anchor` + descrição
   nova. Bonus: também upload Astrid pra "match this aesthetic but
   different character".

3. Pra **mobs**: estilo diferente da personagem (criatura) mas mesmo
   "world look" — anime-MMO 2000s, cel shading, palette vibrante mas
   tons mais "natureza/fantasia escura" pros mobs.

4. Pra **biomes**: mais artístico, paisagem ampla. Layers de parallax
   geram-se separados (sky / far / mid / near).

## Próximas decisões pendentes (preencher conforme rodar)

- [ ] Astrid v1 concept art result (após primeiro test)
- [ ] Astrid hair length confirmação (long ponytail OK?)
- [ ] Bodysuit material/finish (matte? slight sheen?)
- [ ] Sword pommel detail (red gem? steel?)
- [ ] Continente do jogo (nome)
- [ ] McGuffin da quest (o que a Eternia caça?)
- [ ] Slots 2/3/4 do CharacterSelect (arquétipos: Archer? Mage? Spell Knight?)

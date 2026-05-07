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

- v1 (a rodar): primeiro prompt, target anchor direta. Usando Astrid
  anchor como style reference (uploaded ao Gemini). Avaliar se hair
  ficou no jewel-tone certo, óculos visíveis, arco e quiver claros,
  outfit como descrito. Se vier OK direto, salvamos como
  `art/anchors/naia-anchor.png` e seguimos pra turnaround. Se algo bug,
  iteramos via follow-up.

#### Anchor (uma vez locked)

- Path: `art/anchors/naia-anchor.png` (a criar)

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

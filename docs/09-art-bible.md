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
| **9.A** | Astrid concept art locked (front view, turnaround, key poses) | em progresso |
| **9.B** | Supporting cast (3 slots restantes do CharacterSelect) | pendente |
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

#### Anchor (uma vez locked)

- Path: `art/anchors/astrid-base-front.png` (a criar)
- Image hash / Gemini conversation link: TBD

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

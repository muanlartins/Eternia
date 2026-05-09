# Nano Banana Pro — Mob Concept Art (Floresta dos Elfos)

4 prompts em 2 estágios por mob:
1. **Anchor** — concept art bíblia (estabelece o design)
2. **T-pose frontal** — input pro Tripo gerar o GLB
**Pipeline:**

```
Anchor → você valida visual → T-pose front → Tripo image-to-3D → GLB
```

**Pasta de saída sugerida:**

```
client/art/mobs/
├── forest-sprite-anchor.png
├── forest-sprite-tpose.png
├── bramble-beast-anchor.png
└── bramble-beast-tpose.png
```

Depois que Tripo virar GLB:

```
client/public/models/mobs/
├── forest-sprite.glb
└── bramble-beast.glb
```**Style anchor canônico** (cole no início de TODO prompt de
personagem/criatura — vem de `09-art-bible.md`):
```

```
A 2D anime-style character illustration in the visual language of
early 2000s Korean MMORPGs (Grand Chase, Ragnarok Online, MapleStory).
Bold clean black lineart, cel-shaded coloring with crisp shadow
shapes, vibrant saturated palette, slight chibi-leaning anatomy
(head ~1/6 of body height for humanoids, expressive large eyes).
Adventurous high-fantasy tone with a youthful shounen energy.
```

---

## 1. Forest Sprite — Anchor

- **Filename:** `forest-sprite-anchor.png`
- **Aspect:** 3:4 (portrait)
- **Recomendado:** 768×1024
- **Background:** plain white (`#FFFFFF`)
- **Stage:** validar visual antes do T-pose

```
[STYLE ANCHOR — paragraph fixo above]

CREATURE: Forest Sprite — a small fey humanoid, formerly a benevolent
spirit-guardian of the elven forest, now corrupted and hostile to any
who cross the bosque. Personality: skittish but aggressive, glowing
with corrupted elven spirit-light.

BUILD: child-sized humanoid (in-world ~110-120cm tall), slim
proportions, almost otherworldly delicacy. Head ~1/5 of body height
(slight chibi lean).

SKIN: pale spirit-teal hue (think sea glass: a soft pale teal-green),
slightly translucent — faint inner glow visible especially at fingertips
and along forearms. Smooth, no veins, no realism — stylized matte.

HAIR: short tousled hair in pale white-blonde with cool teal undertones
(like moonlight filtered through leaves). Strands fall loose, a few
locks across the forehead. Hair length to mid-neck.

EARS: small pointed elven ears, partly visible through the hair.

EYES: large expressive eyes in glowing sun-gold, NO visible pupil — just
luminous golden discs (slightly haunting). A faint emerald-green glow
shadows just under each eye, suggesting inner light.

WINGS: a pair of small dragonfly-style wings on the upper back,
translucent membranes with iridescent gold-and-teal sheen, thin black
veining. Wings slightly spread, mid-vibration suggested by the faintest
motion blur on the very tips only (rest of the wing fully resolved).

OUTFIT: tattered green leaf-shaped clothing — layered raw silk in muted
forest greens (forest-deep + mid-forest-green), as if assembled from
real leaves stitched together with vine-thread. A short sleeveless top
+ a layered skirt-like wrap reaching mid-thigh. Bare arms. Bare feet.

ACCESSORIES: a small dark-leather satchel strapped at one hip,
weather-worn. A simple twine cord around the neck holding a single
sun-gold rune-pebble.

WEAPON: a small dagger of carved blue-teal crystal in the right hand,
faintly glowing inner sun-gold light along the blade's edge. Held loose
at the side, blade pointed slightly down — ready but not aggressive.

POSE: 3/4 view (subject turned ~30° from camera), one foot forward as
if mid-step. Dagger hand at side. Free hand raised slightly, fingers
spread as if testing the air. Head tilted very slightly to one side.
Expression: curious-but-hostile, mouth closed, eyes wide and locked on
viewer. Wings spread but not fully open.

LIGHTING: warm sun-gold key light from upper-left, cool spirit-teal rim
from upper-right (matching the skin's inner glow).

OUTPUT: FULL-BODY composition (head to feet visible) with the character
centered, plenty of breathing room top and bottom. Plain white
background (#FFFFFF), no shadows on the background, no environmental
elements, no other characters — subject fully isolated. (User removes
white externally.) Aspect ratio 3:4 (portrait). NO text, NO labels, NO
watermark, NO color callouts.
```

---

## 2. Forest Sprite — T-pose Frontal (Tripo input)

- **Filename:** `forest-sprite-tpose.png`
- **Aspect:** 3:4 (portrait)
- **Recomendado:** 768×1024
- **Background:** plain white (`#FFFFFF`)
- **Stage:** SÓ depois do anchor estar travado
- **Tip:** **suba `forest-sprite-anchor.png` como referência forte** para
  garantir consistência (mesmo personagem, pose nova).

```
[STYLE ANCHOR — paragraph fixo above]

UPLOAD REFERENCE: forest-sprite-anchor.png (the LOCKED anchor of this
character). Match outfit, hair, eyes, skin color, wings, weapon, ears,
and accessories EXACTLY as in the anchor. ZERO design drift — same
character, just a different pose.

POSE: STRICT T-POSE — perfectly bilateral symmetry. Arms extended
horizontally to the sides at exact shoulder height, palms facing DOWN,
fingers extended straight (no fist, no curl). Legs straight and parallel
about shoulder-width apart, feet flat on an implicit ground plane,
toes pointing forward. Body and head facing the CAMERA directly
(perfectly frontal view, zero rotation). Neutral facial expression —
mouth closed, eyes open and looking forward.

WINGS: extended out to the sides, both wings symmetric and fully
visible behind the shoulders. Wings static and FULLY resolved (no
motion blur, no vibration suggestion).

WEAPON: hold the crystal dagger in the right hand, blade pointing
DOWN parallel to the body, hilt grasped firmly. CRITICAL: do NOT
break the T-pose silhouette — keep the right arm extended horizontally
as required, with the dagger simply hanging from the grasped hand
along the arm/torso line.

OUTPUT: FULL-BODY, head to feet visible with breathing room top and
bottom (~8% margin). Single front-facing view, perfectly orthographic
feel (no perspective distortion — minimize foreshortening). Plain white
background (#FFFFFF), no shadows on the background. Lighting FLAT and
EVEN (no dramatic side-light, no rim glow effects) so the pose reads
unambiguously for 3D rigging reference.

Aspect ratio 3:4 (portrait). NO text, NO labels, NO watermark, NO
additional views — SINGLE front T-pose only.

PURPOSE: this image will be input to Tripo (image-to-3D). The T-pose
must be clean, symmetric, and unambiguous. Hands must be clearly
visible (palms down, fingers spread). Feet must be clearly visible.
Wings must be flat and clearly readable. No props occluding the body.
```

---

## 3. Bramble Beast — Anchor

- **Filename:** `bramble-beast-anchor.png`
- **Aspect:** 4:3 (landscape — criatura mais larga que alta)
- **Recomendado:** 1024×768
- **Background:** plain white (`#FFFFFF`)

```
[STYLE ANCHOR — paragraph fixo above]

CREATURE: Bramble Beast — a quadrupedal plant-creature that took
sentience after the elves abandoned the forest. Slow, defensive,
territorial. Personality: ancient, slightly mournful, hostile only when
provoked.

BUILD: roughly the size of a large dog (in-world ~80cm tall at the
shoulder, ~120cm long nose to root-tail). Quadrupedal with a low,
hunched, sturdy stance — center of mass close to the ground.

BODY: NOT skin or fur. The entire body is composed of intertwined
dark-woody ROOTS and stems forming a dense organic mass. Visible knots,
gnarls, and twisting vines wrap around themselves. Small dark-green
leaves and the occasional curl of moss sprout along the back like a
mossy spine. A few small amber-colored leaves scattered across the body
(like dying ember sparks).

LEGS: four short stout legs, each composed of thick bundled roots that
splay into gnarled "claws" at the ends — no actual feet, the legs taper
into root-claw clusters. Legs are slightly bowed outward (sturdy, ground-
gripping stance).

HEAD: a vague forward-facing head shape at the front of the body, low
and slightly hunched — almost merging with the front shoulders. Head is
made of denser woven roots than the body. Two small glowing eyes deep
within the root tangle, pupils invisible (just glowing sun-gold discs).

MOUTH (key feature): below the eyes, a CIRCULAR RING-MOUTH composed of
sharp inward-pointing thorns — like a flower with thorn-petals. The
mouth pulses with inner amber-gold light (this is the threat signal
in-game; in the anchor, show the glow at medium intensity, not maxed).

TAIL: a trailing tail of root-mass that drags slightly behind, ending in
small leaf curls.

COLORS: forest-deep base (#1a3a2a — very dark green-brown bark) for the
overall body. Mid-forest-green (#5a8a5e) highlights on raised parts and
top of the back. Sun-gold (#f5c870) inner mouth glow. A few warm amber
(#d4a574) leaves scattered. The two eyes glow sun-gold from deep inside
the root tangle.

POSE: 3/4 view from slightly above (camera angle ~15° down), creature
turned ~30° toward camera. Standing on all four legs, body level. Head
low and forward, mouth slightly open showing the inner thorn ring with
the amber glow visible. ONE front "claw" raised slightly off the ground
as if probing or mid-step. Tail trailing slightly behind. Whole body
visible.

LIGHTING: warm sun-gold key from upper-left, cool spirit-teal rim from
upper-right (faint, since the creature itself emits inner warm glow
from the mouth).

OUTPUT: FULL-BODY composition with the creature centered, comfortable
breathing room around (~10% margin). Plain white background (#FFFFFF),
no shadows on the background, no environmental elements, no other
creatures — subject fully isolated. (User removes white externally.)
Aspect ratio 4:3 (landscape). NO text, NO labels, NO watermark, NO
color callouts.
```

---

## 4. Bramble Beast — Neutral Standing Frontal (Tripo input)

- **Filename:** `bramble-beast-tpose.png`
- **Aspect:** 4:3 (landscape)
- **Recomendado:** 1024×768
- **Background:** plain white (`#FFFFFF`)
- **Stage:** SÓ depois do anchor estar travado
- **Note:** "T-pose" pra quadrúpede = neutral standing pose com os 4
  membros simétricos e o corpo nivelado.
- **Tip:** **suba `bramble-beast-anchor.png` como referência forte.**

```
[STYLE ANCHOR — paragraph fixo above]

UPLOAD REFERENCE: bramble-beast-anchor.png (the LOCKED anchor of this
creature). Match body, legs, head, mouth, colors, leaves, thorns
EXACTLY as in the anchor. ZERO design drift — same creature, just a
neutral pose.

POSE: STRICT NEUTRAL STANDING (Tripo-friendly quadruped reference):
- All four legs straight, planted on an implicit ground plane
- Legs slightly spread (each leg under its respective shoulder/hip,
  feet/claws clearly separated — no overlap)
- Equal weight on all four legs (no raised foot, no probing claw)
- Body horizontal and LEVEL (no crouching, no rearing, no hunching)
- Head facing CAMERA directly (perfectly frontal view, zero rotation)
- Mouth closed, neutral — show the thorn ring shape but with the amber
  glow at minimum / off
- Eyes open and forward, glowing sun-gold but soft
- Tail of roots trailing FLAT and centered behind the body (no curl)

CRITICAL: this is a 3D-rigging reference, NOT a combat pose. Body
perfectly bilateral-symmetric left-right. All four legs FULLY VISIBLE
from the camera angle (no leg occluded by another). No part of the
creature occluding another part.

OUTPUT: FULL-BODY, all four legs and head and tail visible with
breathing room around (~8% margin). Single front-facing view (the
creature is looking directly at the camera), perfectly orthographic
feel (no perspective distortion — minimize foreshortening). Plain white
background (#FFFFFF), no shadows on the background. Lighting FLAT and
EVEN so the silhouette reads unambiguously for 3D rigging reference.

Aspect ratio 4:3 (landscape). NO text, NO labels, NO watermark, NO
additional views — SINGLE front view only.

PURPOSE: input to Tripo (image-to-3D). The pose must be clean,
symmetric, and unambiguous. All four legs clearly separated and
visible. Head clearly visible. Mouth thorn-ring readable but not
glowing dramatically.
```

---

## Iteração / fix de drift

Se o anchor sair com drift (ex.: Forest Sprite com pupila visível em vez
de só glow gold, ou Bramble Beast quase-bípede em vez de quadrúpede):

1. Salva o output ruim
2. Sobe ele no Nano Banana com edit instruction:
   `"Same character, but [fix specific issue]. Keep everything else identical."`
3. NÃO regenera do zero (perde consistência).

Mesmo padrão da Phase 9 (ver `09-art-bible.md`).

## Checklist antes de Tripo

Antes de mandar o T-pose pro Tripo, verifica:

- [ ] Background totalmente branco (sem cinza, sem sombra contínua)
- [ ] Personagem/criatura ocupa pelo menos 70% do frame
- [ ] Sem texto, sem watermark
- [ ] Pose simétrica e estática (sem motion blur, sem cabelo voando)
- [ ] Membros não se sobrepõem entre si
- [ ] Resolução >= 768 no menor lado

Se algum item falhar, regenera ou ajusta antes de gastar Tripo credit.

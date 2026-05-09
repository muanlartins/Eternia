# Nano Banana Pro — Naia Props (Tripo input)

> Imagens de prop SOLO (arco + óculos) que serão fed para o **Tripo
> image-to-3D** pra gerar GLBs anexáveis aos bones da Naia.
>
> **Estética alvo:** casar com o universo da Naia (Korean anime MMORPG +
> elven archer + golden hour). Sem licença, totalmente nosso.
>
> **Pasta de saída:** `client/src/assets/naia/` ou
> `client/public/models/props/<id>/source.png` (sua escolha — só não
> esquece de me avisar onde salvou).
>
> **Workflow:**
> 1. Gera a imagem no Nano Banana Pro com o prompt abaixo
> 2. Sobe ela no Tripo (image-to-3D)
> 3. Baixa o GLB pra `client/public/models/props/<id>.glb`
> 4. Me avisa o filename — eu codo o anexo ao bone certo
>    (`R_Hand` pro arco, `Head` pros óculos)

## 1. Arco élfico curto

- **Filename:** `naia-bow-source.png`
- **Aspect:** 1:1
- **Recomendado:** 1024×1024
- **Background:** plain white (`#FFFFFF`)
- **Tip:** opcionalmente, suba a `naia-anchor.png` no Nano Banana **como
  referência estética (não pra copiar personagem)** — o objetivo é o
  arco "pertencer ao mundo dela".

```
Highly detailed 3D-style render of a stylized fantasy short bow (elven
recurve), designed for an anime / Korean MMORPG character (Grand Chase /
Ragnarok / MapleStory era).

The bow is a slim recurve shape — graceful S-curve, the limbs taper from
a thicker grip toward delicate tips. Material: warm honey-brown polished
wood with visible subtle grain, the wood has the faintest forest-green
undertone (as if treated with elven sap). Along each limb, intricate
carvings of vine + leaf motifs in low relief. The grip in the dead
center is wrapped in dark forest-green leather, bound with thin gold
thread crossed in a diamond pattern. The very tips of both limbs taper
into small carved leaf flourishes (one curling subtly upward, mirrored
on the other side). A single tight bowstring of off-white linen color
spans the whole bow.

Optional decorative detail: a small carved gold rune medallion fixed at
the center of the grip wrap, glowing faintly warm-amber.

Composition: bow centered in the frame, viewed at a 3/4 angle (slight
horizontal rotation so both the curvature AND the depth of the limbs
read clearly), upright orientation (top limb up, bottom limb down). The
ENTIRE bow visible top to bottom with comfortable breathing room around
it (~10% margin all sides). Symmetric silhouette overall.

Style: clean stylized 3D look, slightly toon-shaded with soft rim light,
like a high-quality fantasy game inventory icon. Vibrant saturated
material colors. Subtle clean black-line edge pop on key silhouette
contours (not heavy).

Background: plain white (#FFFFFF), no shadows on the background, no
other elements, no environmental props — subject fully isolated.
(User removes white externally.)

Lighting: warm key light from upper-left (sun-gold), cool teal rim from
upper-right. No dramatic ground shadow.

Square format 1:1. NO text, NO labels, NO watermark, NO size annotation.
```

## 2. Óculos redondos élficos

- **Filename:** `naia-glasses-source.png`
- **Aspect:** 1:1
- **Recomendado:** 1024×1024
- **Background:** plain white (`#FFFFFF`)
- **Tip:** mesma sugestão do arco — naia-anchor.png como referência
  estética opcional.

```
Highly detailed 3D-style render of a stylized pair of round wire-frame
glasses (spectacles), designed for an anime / Korean MMORPG character
(Grand Chase / Ragnarok / MapleStory era), specifically for an elven
archer who pairs them with a forest-green tunic.

Frame: thin wire frame in warm polished bronze-gold color (slightly
worn / hand-forged feel, not factory-perfect). Lenses are perfectly
circular, ~30mm equivalent diameter, both the same size. The bridge
connecting the two lenses is a slim arch with a tiny ornate detail at
the very center: a small carved leaf or stylized fey-rune in the same
bronze-gold (like a medallion). Temples (the arms that go behind the
ears) extend STRAIGHT back from the frame's outer edges, made of the
same bronze-gold wire, gently curving downward at the very ends to hook
behind ears.

Lenses: clear glass with the FAINTEST cool spirit-teal tint (10-15%
opacity max — should look almost transparent, just enough to suggest
mystical glass). No lens reflection glare.

Composition: glasses centered in the frame, viewed at a 3/4 angle
(slight horizontal rotation so the frame depth, the bridge, AND the
temple arms are all clearly visible), oriented as if floating mid-air at
human-eye level. Both lenses fully visible. Perfectly bilateral
symmetry. Comfortable breathing room around the object (~15% margin all
sides).

Style: clean stylized 3D look, slightly toon-shaded with soft rim light,
like a high-quality fantasy game inventory icon. Bronze surface shows
crisp specular highlights. Subtle clean black-line edge pop on key
silhouette contours (not heavy).

Background: plain white (#FFFFFF), no shadows on the background, no
other elements, no environmental props — subject fully isolated.
(User removes white externally.)

Lighting: warm key light from upper-left (sun-gold), cool teal rim from
upper-right.

Square format 1:1. NO text, NO labels, NO watermark, NO size annotation.
```

## Após gerar

Drop o PNG em onde for mais conveniente, sobe no Tripo. **Quando o GLB
voltar do Tripo:**

```
client/public/models/props/
├── naia-bow.glb       ← sai do Tripo (image-to-3D usando naia-bow-source.png)
└── naia-glasses.glb   ← idem (naia-glasses-source.png)
```

Me dá um sinal e eu plugo o código. O attach é em `Character3DPortrait`
+ `GameThreeLayer`, fazendo `bone.add(propScene)` com offsets de
posição + rotação calibrados (o Naia 3D editor que existe permite ajuste
fino visual).

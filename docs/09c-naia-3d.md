# 09.C — Naia 3D pipeline (Sprint 5 — historical)

> **Status (2026-05-09)**: superseded. Current pipeline uses Tripo
> auto-rig directly (no Mixamo retargeting, no `naia.fbx` intermediate).
> The Mixamo workflow described below was replaced when Sprint 7.A
> pivoted to fully procedural animation. Kept as historical record
> only — runtime loads `public/models/naia.glb` straight from Tripo,
> with bow + glasses attached at the `R_Hand` / `Head` bones via
> `client/src/three/naia-model.ts`.

Index do art bible: [`09-art-bible.md`](./09-art-bible.md).
Bible da Naia (sprite path): [`09a-naia.md`](./09a-naia.md).

---

## Princípio do Sprint 5

**3D não substitui o jogo 2D.** Eternia continua sendo um plataformer
2D side-scroller (sprites Pixi in-game). O 3D é uma **camada de
apresentação aditiva** pra menus / lobby / character select / victory.

GC + Hades como pais espirituais:
- GC: 2D action gameplay
- Hades: roguelite meta + identidade visual de menu

Eternia: 2D gameplay + 3D vitrine.

### Por que 3D pra menu se o jogo é 2D?

Razão única: **escalabilidade de animação**. Ter 9-12 animações por
personagem em sprites high-quality = 100s de frames desenhados à mão.
Em 3D rigado, são 9-12 specs procedurais de ~30 linhas cada.

Mas com regra-de-ouro: as animações têm que **parecer 2D anime** (GC
feel), não AAA realista. Isso é o que o sistema procedural resolve.

---

## Pipeline completo

### Etapa 1 — Mesh 3D (Tripo3D)

**Tool**: [tripo3d.ai](https://tripo3d.ai)

**Inputs**: 4 vistas A-pose da Naia (front / right / back / left) geradas
via Nano Banana Pro com `naia-anchor.png` como reference.

Os prompts usados pra gerar as 4 vistas estão em `art/prompts/naia.md`
(seção "A-pose 3D source — gerados").

**Settings no Tripo**:
- Smart Mesh (não HD Model — Smart preserva quad topology, melhor pra rig)
- Auto-rig: ON
- Texture: ON
- Multi-view enhancement: ON
- Polycount: **12000** (sweet spot — 5k é blocky, 20k é overkill)

**Resultado**: `.glb` rigado com mesh + texture + skeleton.

⚠️ **Auto-rig do Tripo é fraco** — bones e weights inconsistentes.
Usar pra mesh apenas, re-rigar via Mixamo na próxima etapa.

### Etapa 2 — Rig (Mixamo)

**Tool**: [mixamo.com](https://mixamo.com) (login Adobe ID grátis)

**Workflow**:
1. Upload do `.glb` (ou `.fbx` convertido) do Tripo
2. Auto-rigger marca chin / wrists / elbows / knees / groin
3. Apply rig → Naia recebe skeleton padronizado Mixamo
4. Bones com prefixo `mixamorig:` (ex: `mixamorig:Hips`,
   `mixamorig:LeftUpLeg`, `mixamorig:LeftArm`)

**Download**: "Breathing Idle" → "FBX Binary" → **WITH SKIN** →
salvar como `naia.fbx`. (Esse é o arquivo base que tem mesh + rig.)

**FPS / keyframe reduction**: 30 fps + non-uniform reduction (sweet
spot de qualidade vs file size — discussão completa em conversa
de design 2026-05-07).

### Etapa 3 — Animação (procedural, hand-keyed)

Mixamo's mocap library é **realista demais** pro feel GC. Pivotamos
pra sistema procedural authored em código.

**Localização**: `client/src/three/procedural-anims.ts`

#### Spec format

Cada animação é um `ProceduralAnimSpec` com lista de poses:

```ts
export const MY_ANIM: ProceduralAnimSpec = {
  name: 'proc-my-anim',
  duration: 0.6,           // segundos
  loop: true,
  poses: [
    {
      time: 0,
      bones: [
        { bone: /spine1$/i, euler: [-1.5, 0, 0] },   // X = forward bend
        { bone: /leftupleg$/i, euler: [-25, 0, 0] }, // forward leg swing
      ],
    },
    // ...mais poses
  ],
};
```

`buildProceduralClip(spec, skeleton)` compila pra `THREE.AnimationClip`
em runtime. Usado via mixer normal.

#### Bone matching (regex)

Patterns são case-insensitive e end-anchored pra evitar substring
collisions:

| Pattern | Matches | Não matches |
|---|---|---|
| `/spine1$/i` | `Spine1`, `mixamorig:Spine1` | `spine` |
| `/leftarm$/i` | `LeftArm`, `mixamorig:LeftArm` | `LeftForeArm` |
| `/leftforearm$/i` | `LeftForeArm`, `mixamorig:LeftForeArm` | — |
| `/hips$/i` | `Hips`, `mixamorig:Hips` | — |

A fuzziness por regex faz o spec funcionar em **qualquer rig humanoid**
(Mixamo / Tripo / Maximo / outros), sem refatoração.

#### Convenções de rotação (Mixamo bind = T-pose)

Empíricamente determinadas:

Calibrado empiricamente via Bone Lab em 2026-05-08:

| Bone | Eixo X | Eixo Y | Eixo Z |
|---|---|---|---|
| Spine1, Spine2 | **-X = bend forward** | (untested) | (untested) |
| Hips | (untested) | **Y = sway lateral** | (untested) |
| LeftUpLeg / RightUpLeg | +X = side abduction (out) | **+Y = forward swing** ⭐ | +Z = forward-mixed |
| LeftLeg / RightLeg | **+X = knee bend (heel-to-butt)** | (untested) | (untested) |
| LeftArm / RightArm | TBD | TBD | TBD |
| LeftForeArm / RightForeArm | TBD | TBD | TBD |
| Head | -X = nod down | (untested) | (untested) |

**Insight crítico**: para UpLeg, o **swing axis é Y, NÃO X**. Eu chutei errado por
3 iterations assumindo X. Imagens 48-55 (Bone Lab tests) mostram:
- X+30 → leg out to side (abdução), foot at shoulder height
- Y+30 → forward high knee (foot at chest level) ⭐ esse é o swing
- Z+30 → leg up-side mix

Por que Y? Mixamo's auto-rig orientou as bones com **local X = sideways
abduction axis**, **local Y = forward/back swing axis**, **local Z = misto**.
Isso não é a convenção FBX padrão (onde Y geralmente seria a length axis),
mas Mixamo's auto-rig sempre faz desse jeito.

Para a Leg (shin), +X é knee bend (calcanhar pra trás) — direção
biomecânica real. Convenção mesma da maioria dos rigs.

⚠️ Convenções mais detalhadas surgem conforme novos bones forem usados
em novas animações. Manter essa tabela viva.

---

## Stack visual ("GC anime feel" recipe)

3 técnicas combinadas no `ThreePilot` (e replicadas no `Character3DPortrait`):

### 1. Toon shading (`MeshToonMaterial` + 3-stop gradient)

Cel-shading com 3 steps de luz (shadow / midtone / highlight). Mascara
polygon faceting, dá leitura de "anime drawn" não "PBR rendered".

Helpers: `client/src/three/three-utils.ts` (`createToonGradient`,
`makeToon`, `applyToonToTree`).

### 2. Outline (anime ink) via `OutlineEffect`

Linha preta de ~3-4px na silhueta do personagem. Vem de
`three/addons/effects/OutlineEffect.js`. Define o personagem como
"desenhado" (linhas) ao invés de "modelado" (volume).

Sem outline: parece Lost Ark. Com outline: parece Genshin / Wuthering /
Honkai / Demon Slayer mobile.

### 3. Step-key (time quantization)

`AnimationMixer.update()` é chamado em chunks de `1/stepFps` segundos
ao invés de a cada frame. Resultado: animações "snap" entre poses como
hand-drawn anime ao invés de interpolar smoothly.

Implementação no `ThreePilot.tick()`:

```ts
this.stepAccumulator += dt * this.playbackSpeed;
const stepDur = 1 / this.stepFps;
while (this.stepAccumulator >= stepDur) {
  this.mixer.update(stepDur);
  this.stepAccumulator -= stepDur;
}
```

**Settings sugeridos**:
- `60` (smooth) — mocap puro Mixamo, Western feel
- `24` — cinema standard, mais suave
- `18` — anime moderno (Demon Slayer fluido)
- `12` — máximo GC vibe ("frame on twos")

---

## Workflow pra adicionar nova animação

```
1. User descreve em prosa as poses ("rest → draw → release → recover")
2. Spec é traduzido em poses + euler angles baseado nas convenções
3. Adicionar ao registry PROCEDURAL_ANIMS
4. Adicionar botão no painel ThreePilot com data-procanim="proc-name"
5. Refresh + F9 + clicar botão
6. Visual feedback do user → ajustar angles
7. Repeat até bater
8. Documentar convenções de novos bones aqui
```

---

## Catálogo de animações

| Nome | Status | Poses | Duração | Loop | Notas |
|---|---|---|---|---|---|
| `proc-idle-breath` | ✅ | 3 | 3.0s | sim | Spine + head subtle |
| `proc-walk-gc` | 🟡 iter 1 | 5 | 0.6s | sim | Legs + hip + arm subtle |
| `proc-run-gc` | ⏳ TODO | ~5 | ~0.4s | sim | Versão mais rápida + bouncy |
| `proc-jump` | ⏳ TODO | 3 | ~0.6s | não | Anticipation/apex/land |
| `proc-bow-shoot` | ⏳ TODO | 4 | ~0.4s | não | rest/draw/release/recover |
| `proc-bow-charge` | ⏳ TODO | 3 | variable | parcial | hold loop |
| `proc-step-back-hop` | ⏳ TODO | 3 | ~0.35s | não | Defensive (parry sub) |
| `proc-hit-recoil` | ⏳ TODO | 2 | ~0.25s | não | Damage feedback |
| `proc-victory` | ⏳ TODO | 2 | ~2s | sim | Pose pra victory screen |

**Total previsto**: 9 animações cobrem 100% de Naia (gameplay + menus).

---

## Componentes Three.js do projeto

| Arquivo | Função |
|---|---|
| `three-utils.ts` | Toon gradient + makeToon + applyToonToTree (compartilhados) |
| `procedural-anims.ts` | Sistema de animação procedural + biblioteca |
| `ThreePilot.ts` | Bancada de teste fullscreen (F9 toggle) |
| `Character3DPortrait.ts` | Renderer reusável pra portraits (CharacterSelect) |

### ThreePilot

Fullscreen test bench. F9 toggle ou `?pilot=1` na URL.

Recursos:
- Drag-drop `.glb` / `.gltf` / `.fbx` (auto-detecção)
- Dual file input: modelo base + animações extras
- Camera orbital + presets (frontal / 3⁄4 / lateral)
- Controles de animação (play/pause/restart/T-pose/speed)
- Toggles: toon / outline / grid
- Step-key fps: smooth / 24 / 18 / 12
- Botões pra animações procedurais

### Character3DPortrait

Renderer leve mountado em qualquer container (não precisa fullscreen).
Usado na CharacterSelect.

Recursos:
- Auto-fit (model rescaled pra 1.7m, feet at y=0)
- Sway ±10° em Y, período 6s
- Fake breathing se não tiver animação
- Toon shader + lighting Twilight Forest
- Graceful fallback pra PNG se modelo não carregar

---

## Iteration log

- **2026-05-07**: Sprint 5 iniciada — Three.js + GLTFLoader + ThreePilot
- **2026-05-07**: Naia mesh gerada via Tripo3D (Smart Mesh, 12k tris, multi-view)
- **2026-05-07**: Tripo's auto-rig se mostrou ruim → Mixamo retoma
- **2026-05-07**: FBX support adicionado (Mixamo exporta .fbx, sem precisar Blender)
- **2026-05-07**: Mixamo mocap mostrou-se realista demais → pivot pra procedural
- **2026-05-07**: Sistema procedural construído (`procedural-anims.ts`)
- **2026-05-07**: `proc-idle-breath` — primeira anim hand-keyed validada visualmente
- **2026-05-07**: `proc-walk-gc` — segunda anim, 4-pose cycle GC style
- **2026-05-07**: Outline + step-key implementados → "anime feel" achieved

---

## Status Sprint 5

- ✅ ThreePilot live (F9)
- ✅ Naia rigged via Mixamo
- ✅ Sistema procedural funcionando
- ✅ 2 anims hand-keyed (idle + walk)
- ✅ CharacterSelect 3D integrada (com fallback pra PNG)
- ⏳ 7 anims faltantes do catálogo
- ⏳ Bow-shoot é a próxima estratégica (validar combat-style)
- ⏳ Após catálogo completo: integrar 3D na lobby/victory screens

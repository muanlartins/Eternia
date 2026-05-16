# 09.A — Naia (active character)

> **Strategy 2026-05-07**: pivot **pixel art** após teste comparativo
> entre illustration high-res e pixel art. Pixel art validou consistência
> cross-pose (sleeves, lacing, pendant) que illustration falhava. Naia é a
> primeira a ir ponta-a-ponta: anchor → 3 sprites pixel → ingame jogável
> com arquer kit. Astrid pausada (`09b-astrid.md`).

Index do art bible canonical: [`09-art-bible.md`](./09-art-bible.md).
Pipeline geral fica lá.

## Bible (LOCKED)

| Campo | Valor |
|---|---|
| Nome | Naia |
| Classe (1ª) | Archer (arqueira élfica de arco curto) |
| Idade | 17 |
| Build | esguia ágil, ~160 cm |
| Personalidade | sábia, calma, observadora; conectada à natureza |
| Race | Elf — orelhas pontudas |
| Cabelo | verde-esmeralda profundo (jewel tone), longo, mostly solto, single thin side braid |
| Olhos | verde-esmeralda |
| Arma | arco curto recurvo de madeira + quiver de couro nas costas |
| Distinguishing | óculos pequenos redondos sem aro grosso (librarian-style) |
| Origem (TBD) | descendente de bibliotecários élficos de uma floresta antiga |

Contraste narrativo: Astrid impulsiva ↔ Naia calma observadora.

## Outfit (LOCKED — light archer attire)

- DEEP EMERALD GREEN long-sleeve fitted tunic ending mid-thigh
- BROWN leather laced bodice/vest sobre o tunic
- BLACK fitted leggings (mid-thigh down)
- BROWN mid-calf leather boots com fivela simples
- BROWN leather bracers nos dois antebraços (bowstring guards)
- Thin BROWN leather belt
- Small leaf-shaped silver pendant na garganta (elven heritage)
- Brown leather quiver nas costas, strap diagonal cruzando o peito,
  arrows visíveis sobre o ombro direito

## Reference única (após cleanup)

> **`art/anchors/naia-anchor.png`** é a master reference.
>
> Cleanup 2026-05-07: removidos os 8 frames extraídos do vídeo e os 4
> static views legacy. Reference múltipla causava confusão no modelo
> (drift cross-pose). Pipeline final usa **só anchor** como ref.

## Pipeline pixel art (validado 2026-05-07)

### Tool

**Flow → tab Imagem → Nano Banana Pro → 3:4 → x2 (variations)**

### Style anchor pra prompts pixel

```
A high-quality pixel art sprite in the style of late 1990s/early 2000s
2D anime JRPGs (Grand Chase, Ragnarok Online, Castlevania: Aria of
Sorrow, Final Fantasy Tactics Advance). Crisp pixel-perfect edges, NO
anti-aliasing, NO gradient blurs — every pixel is intentional and chunky.
Limited color palette of approximately 24-32 colors total. 3-tone cel
shading per color group (highlight, midtone, shadow). Anime proportions
preserved: large expressive eyes (suggested via 2-3 dark pixels each),
slight chibi-leaning 1/6 head-to-body ratio, clear readable silhouette
at small scale. Plain solid magenta background (#FF00FF) for easy chroma
key removal later.
```

### Workflow por sprite

1. **Gen no Flow**: anchor como ref + prompt da pose (3:4, x2)
2. **Salvar** raw em `art/poses/naia/naia-<action>.jpeg`
3. **Process** via script Python: chroma-key magenta + auto-crop + resize
   pra 96px tall (preserve aspect, NEAREST neighbor)
4. **Output**: `client/src/assets/naia/<action>.png` direto pro Vite
   bundle
5. **Test ingame**: refresh, ver visualmente, iterar se necessário

### Script de processing

`/tmp/process_naia.py` (cria venv 1x: `python3 -m venv /tmp/naia-venv &&
/tmp/naia-venv/bin/pip install Pillow`):

```python
from PIL import Image
import sys

INPUT = sys.argv[1]
OUTPUT = sys.argv[2]
TARGET_HEIGHT = int(sys.argv[3]) if len(sys.argv) > 3 else 96

def is_magenta(r, g, b):
    return r > 200 and g < 80 and b > 200

img = Image.open(INPUT).convert('RGBA')
w, h = img.size
pixels = img.load()
min_x, min_y, max_x, max_y = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if is_magenta(r, g, b):
            pixels[x, y] = (0, 0, 0, 0)
        else:
            min_x, min_y = min(min_x, x), min(min_y, y)
            max_x, max_y = max(max_x, x), max(max_y, y)

pad = 4
img = img.crop((max(0, min_x-pad), max(0, min_y-pad),
                min(w, max_x+pad+1), min(h, max_y+pad+1)))
cw, ch = img.size
img = img.resize((max(1, round(cw * TARGET_HEIGHT / ch)), TARGET_HEIGHT),
                 Image.NEAREST)
img.save(OUTPUT, 'PNG')
```

Uso:
```bash
/tmp/naia-venv/bin/python3 /tmp/process_naia.py \
  art/poses/naia/naia-<action>.jpeg \
  client/src/assets/naia/<action>.png \
  96
```

## Sprites atuais ✓ (3 poses ingame)

| Pose | Source (jpeg c/ magenta) | Sprite (PNG transparent) | Size |
|---|---|---|---|
| Idle | `art/poses/naia/naia-idle.jpeg` | `client/src/assets/naia/idle.png` | 49×96 |
| Run | `art/poses/naia/naia-run.jpeg` | `client/src/assets/naia/run.png` | 64×96 |
| Jump | `art/poses/naia/naia-jump.jpeg` | `client/src/assets/naia/jump.png` | 76×96 |

> Width varia por pose (run mais wide pelo bow extending, jump mais wide
> pelo arm out). Height fixo 96px = ingame display height. Hitbox do player
> continua 32×64; sprite fica maior visualmente que hitbox (normal — char
> sprite "extends past" hitbox).

## Renderização ingame

`Player.setSpriteTextures({ idle, run, jump })` é chamado quando user
seleciona Naia em CharacterSelect (`main.ts`). A partir disso:
- Player.body (Graphics primitivo) fica `visible = false`
- Player.sprite (Pixi Sprite) renderiza no lugar
- `redrawSprite()` escolhe textura por estado:
  - `!onGround` → jump
  - `|vx| > 50` → run
  - else → idle
- Facing aplicado via `sprite.scale.x = facing === 1 ? 1 : -1`
- Anchor (0.5, 1) ancora sprite no center-bottom da hitbox

## Próximos sprites (quando quiser expandir animação)

Por ordem de impacto visual ingame:

- [ ] **Idle B** (breath alt frame, anim 2-frame com idle)
- [ ] **Walk passing** (cycle alt com run)
- [ ] **Run B** (cycle 2 frames pra anim)
- [ ] **Land** (knee bend ao tocar chão)
- [ ] **Hit** (knockback)
- [ ] **Death** (collapsed)
- [ ] **Bow draw** (basic shot start)
- [ ] **Bow release** (basic shot fire)
- [ ] **Charged shot full draw** (Z hold)
- [ ] **Skills 1/2/3 stances**

Quando ramp pra mais que 5 sprites, considerar montar **sprite sheet
único** (Aseprite import + export) em vez de PNGs individuais.

## Iteration log (curto)

- **2026-05-06**: Bible + outfit definidos. Anchor LOCKED.
- **2026-05-07**: 4 static views (Gemini Pro v3 strategy) → vídeo 360°
  pivot (Flow Veo) → 8 keyframes extraídos.
- **2026-05-07**: 5 illustration poses high-res (Nano Banana Pro multi-ref)
  geradas. **Detectada inconsistência grave** cross-pose: necklace
  position, sleeve length (drift pra short), bodice lacing pattern.
  Sleeves drift foi o critical fail pra fidelidade ingame.
- **2026-05-07**: pivot pra **pixel art via Nano Banana Pro**. 3 poses
  teste (idle/run/jump). **Resultado superior** — sleeves preservadas em
  todas, palette consistente, anime feel intacto, drift sumiu.
- **2026-05-07**: cleanup — removidos illustration poses, video keyframes,
  static views. `naia-anchor.png` virou single source of truth.
- **2026-05-07**: 3 sprites integrados ingame via `Player.setSpriteTextures`.
  Naia selecionável em CharacterSelect.
- **2026-05-10**: kit revisado — S1/S2/S3 original (Triple Shot fan / Arc
  Shot overhead / Piercing Volley) substituído por **A · Rajada de
  Flechas + S · Flecha-Tempestade + D · Tríplice Tempestade**. Fantasia
  "chuva de flechas" mais clara que mistura de mecânicas geométricas.
  S resolve issue do Arc Shot original que "nunca acerta" via
  "explode no apex de distância" em vez de "cai no chão". CharacterSelect
  expõe ability cycler (↑↓ alterna A/S/D).
- **2026-05-10 (later)**: D refinada — abandonada a ideia "1 flecha que
  vira muitas" (subdivisão tinha hand-off visual fraco) em favor de
  **5 rajadas horizontais com 3 das 5 linhas escolhidas aleatoriamente
  por rajada** (15 flechas total). Mecânica mais limpa, sem timing de
  despawn/spawn, com sensação orgânica de chuva caótica. "Tríplice"
  ressignificada — agora descreve as 3 linhas por rajada. A é
  sequencial (5 flechas em cascata, mesma direção). S mantém apex-explode
  com timing alinhado.

## Archer gameplay design (LOCKED 2026-05-07)

Naia ranged combat kit. Princípios:
- Distância é a feature (Astrid melee impulsiva, Naia ranged precisa)
- MP economy similar (3 skills com costs/cooldowns proporcionais)
- Telegraph claro nas skills (co-op MP clarity)
- **Tiro horizontal balístico com gravidade** — plataformas ajudam aiming
  vertical, não mouse-aim

### Kit final (revisão 2026-05-10 — A/S/D arrow rain)

> Skills S1/S2/S3 originais (Triple Shot fan, Arc Shot overhead, Piercing
> Volley) foram **substituídas** por kit baseado em "rajadas + chuvas
> de flechas" — fantasia "tempestade de flechas élficas". Mecânicas mais
> dramáticas que disparam no feel GC. Damages/MP costs/cooldowns TBD em
> Sprint 1. Input keys (1/2/3 vs A/S/D) TBD; spec usa slot A/S/D como
> identificador canônico.

| Slot | Move | Input (TBD) | Mecânica |
|---|---|---|---|
| — | Basic shot chain | Z (tap, encadeável 3×) | 3-hit chain de single arrows ~0.3s gap, MP regen on hit |
| — | Power shot | Z (hold + release) | 3 charge tiers (475/950/1425 ms) com damage scaling, ballistic arc |
| **A** | **Rajada de Flechas** | 1 / A | Disparo multi-flecha contínuo na **mesma direção do ataque básico** — mesmo arco balístico, volume bem maior. Cobertura linear pra mob denso, sem dispersão lateral. |
| **S** | **Flecha-Tempestade** | 2 / S | Flecha alta lançada num arco íngreme. **Após percorrer distância horizontal X**, explode em chuva descendente de mini-flechas. AoE vertical que ignora cobertura — substitui o Arc Shot original com lógica "explode no apex" em vez de "cai no chão". Resolve o problema do Arc Shot original que "nunca acerta". |
| **D** | **Tríplice Tempestade** | 3 / D | **8 rajadas** espaçadas no tempo (~80ms entre rajadas). Cada rajada dispara em **2 das 5 linhas paralelas tight** (offsets ±30/±15/0px do bow — bem concentrado, ~60px range total) escolhidas **aleatoriamente**. Flechas têm **gravidade igual ao ataque básico** (`gravityMul: 1`) — todas seguem arcos parabólicos idênticos deslocados verticalmente, dando sensação de **curvas paralelas** em vez de linhas retas. Total: **16 flechas** em ~640ms de cascata caótica densa. (Nome "Tríplice" é histórico — mantém pela continuidade narrativa.) |
| — | Dash | Shift | Ground dash (mesmo Astrid) |
| — | Dash atk | Shift+Z | Rolling shot durante dash |
| — | Jump atk | Jump+Z | Aerial shot |
| — | Dodge roll | S+S | Same as Astrid (TBD: pode conflitar com S = Flecha-Tempestade) |
| — | **Step-back hop** | Espaço | Pequeno hop pra trás (~80px) com i-frames; substitui parry estática |
| — | Double jump | Jump (2×) | Já existe; SEM air dash pra archer |

### Parâmetros TBD (Sprint 1 vai resolver)

- **A · Rajada**: número de flechas por tick, ROF, MP cost, cooldown
- **S · Flecha-Tempestade**: distância X até explodir, número de mini-flechas
  na chuva, raio do AoE, MP cost, cooldown
- **D · Tríplice**: spacing vertical entre as 5 linhas (atual ±90px), intervalo
  entre rajadas (atual 90ms), número de linhas escolhidas por rajada (atual 3),
  damage per arrow (~32% do base damage), MP cost (provavelmente o mais caro)
- **Damage scaling**: A/S/D devem escalar acima do básico mas balanceados pelo
  custo de MP — TBD numa pass de balanceamento

### Decisões finais

- ❌ **Air dash removed** — Naia vertical play é via plataforma + double-jump
- ❌ **Power shot interrupt counter removed** — sem bonus damage on enemy
  telegraph; charge é puramente offensive
- ✅ **Step-back hop substitui parry** — espaço = hop pra trás com
  i-frames, mecânica precision-dodge
- ✅ **Arrows unlimited** — Lire feel, MP gates skills
- ✅ **Keyboard horizontal aim** — direction segue movement facing,
  arrows com arco balístico (gravity)
- ✅ **Charge tiers**: 3 tiers idênticos a Astrid (475/950/1425 ms)
  pra parametrize feeling consistent

### Implementação ingame (Sprint 1 da roadmap)

Tasks de implementação ingame ficam em `02-combat-design.md` quando
codarmos. Por agora, esse design fica aqui como **content brief** locked
pra Sprint 1.

### Sprite needs adicionais (gen quando archer kit em desenvolvimento)

- `bow-release` (after-shot follow-through frame)
- `step-back-hop` (mid-hop airborne backwards)
- `s1-stance` / `s2-stance` / `s3-stance` (skill telegraph poses,
  opcional — pode reusar bow-draw inicialmente)

## Status

- ✅ Bible LOCKED
- ✅ Anchor LOCKED
- ✅ Pipeline pixel art validado
- ✅ 3 sprites ingame (idle, run, jump)
- ✅ Naia selecionável em CharacterSelect
- ⏳ Próximos sprites (idle B, walk, hit, etc) — gerar conforme necessidade
- ⏳ Archer gameplay kit — refinar antes de Phase 10
- ⏳ Sprite sheets (Phase 10) — talvez consolide em sheet único quando >5 sprites
- ⏳ Ingame archer combat — Phase 10

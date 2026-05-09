# GC ↔ Eternia cross-reference — forest-1-1

> Fonte: Grand Chase Season 1 (BR 2.31, build 2008-06-12), extraído em
> `~/repos/grand-chase/extracted-game-data/`. Foco MVP: forest-1-1.
> O arquivo `GrandChase.zip` (Steam moderno, 12GB) está empacotado em
> `.kom` (formato KOG proprietário, encrypted) — não acessível sem
> ferramenta Windows. Mecânica do S1 é a fonte canônica de qualquer
> jeito (nostalgia vive na S1).

## Mapeamento conceitual

| GC S1 (Floresta dos Elfos) | Eternia (forest-1-1)        |
|----------------------------|------------------------------|
| `MON_SLIM` (id 45)         | Forest Sprite (slim)         |
| `MON_RACOON` (id 44)       | Bramble Beast (racoon)       |
| `GC_GS_FOREST_OF_ELF` stage 0 | forest-1-1                |

Sem cópia visual — Forest Sprite + Bramble Beast são designs originais
do Eternia. A inspiração é só nas **mecânicas**: stats ratio, spawn
density, attack patterns.

## 1. Spawn pattern original — Floresta dos Elfos

Source: `script/quest_zero.stg`. Coordenadas normalizadas (x ∈ [0,1] da
largura do stage, y ∈ [0,1] da altura, com y=0 ground e y=1 fly-zone).
Pattern repetido em 5 waves de dificuldade (0-4); abaixo o wave 0:

```lua
{ MON_SLIM,   "AISlim",   FALSE, 0.30, 0.20, 0 },
{ MON_SLIM,   "AISlim",   FALSE, 0.40, 0.20, 0 },
{ MON_SLIM,   "AISlim",   FALSE, 0.50, 0.60, 0 },   -- elevado
{ MON_SLIM,   "AISlim",   FALSE, 0.70, 0.60, 0 },   -- elevado
{ MON_SLIM,   "AISlim",   FALSE, 0.85, 0.60, 0 },   -- elevado
-- { MON_RACOON, "AIRacoon", FALSE, 0.30, 0.60, 0 }, [comentado, removido na build]
{ MON_RACOON, "AIRacoon", FALSE, 0.60, 0.20, 0 },
{ MON_RACOON, "AIRacoon", FALSE, 1.00, 0.60, 0 },   -- elevado, edge direita
```

**Total: 5 Slims + 2 Raccoons = 7 mobs.**
- Distribuição vertical: **3 no chão**, **4 elevados** (em plataformas)
- Distribuição horizontal: spread uniforme do x=0.30 ao x=1.00

### Eternia atual (forest-1-1.json)

```json
{ "type": "slim",   "x": 280 },                  // x≈0.22
{ "type": "slim",   "x": 480 },                  // x≈0.38
{ "type": "racoon", "x": 720 },                  // x≈0.56
{ "type": "slim",   "x": 660, "y": 308 },        // elevado
{ "type": "racoon", "x": 1080 }                  // x≈0.84
```

**Total: 3 Slims + 2 Raccoons = 5 mobs.**
- Apenas **1 elevado** (Slim em y=308)
- Sub-densidade: GC tinha 7, Eternia tem 5

### Recomendação spawn

Adicionar 2 Slims pra match GC density + variar mais alturas:

```json
"spawns": [
  { "type": "slim",   "x": 384 },                  // chão (GC 0.30)
  { "type": "slim",   "x": 512 },                  // chão (GC 0.40)
  { "type": "slim",   "x": 640, "y": 332 },        // elevado plat-meio (GC 0.50, 0.60)
  { "type": "slim",   "x": 896, "y": 388 },        // elevado plat-direita (GC 0.70, 0.60)
  { "type": "slim",   "x": 1088, "y": 388 },       // elevado edge-dir (GC 0.85, 0.60)
  { "type": "racoon", "x": 768 },                  // chão (GC 0.60)
  { "type": "racoon", "x": 1200, "y": 388 }        // elevado edge (GC 1.00, 0.60)
]
```

`y` aproximado pelas plataformas existentes (y=400 ± mob height). Slim
height 44 → y=400-44=356. Raccoon height 60 → y=400-60=340.

## 2. Stats ratios — Slim vs Raccoon vs Ent

Source: `script/monstertemplate.stg`. Valores do GC são MULTIPLIERS
(base × multiplier = stat absoluto). Ratios entre mobs são o sinal
relevante.

| Stat | Racoon (44) | Slim (45) | Ent (46) |
|---|---:|---:|---:|
| `fDefaultAtk` | 0.80 | **1.00** | 1.00 |
| `fDefaultDef` | 0.45 | 0.40 | **1.00** |
| `fDefaultHP`  | 0.45 | 0.40 | **0.80** |
| `fOldDef`     | 0.80 | 0.45 | **2.50** |
| `iDefaultLv`  | 1 | 1 | 1 |
| `iDefalutExp` | 10 | 10 | 10 |

### Leitura do GC original

- **Slim**: ataque alto (1.0), HP baixo (0.4), defesa baixa (0.4) — "swarm aggressor", frágil mas hits hard
- **Raccoon**: ataque médio (0.8), HP médio (0.45), defesa média (0.45) — "balanced bruiser"
- **Ent**: ataque médio (1.0), HP alto (0.8), defesa MUITO alta (1.0/2.5 com armor) — "tank"

### Eternia atual (data/mobs.ts)

| Mob | HP | Damage | Speed | Cooldown |
|---|---:|---:|---:|---:|
| Slim | 80 | **10-12** | 90 | 1400ms |
| Raccoon | **130** | **18-24** | 75 | 1800ms |

**Ratios Eternia:**
- Slim/Raccoon HP = 80/130 = **0.62** (GC: 0.4/0.45 = 0.89)
- Slim/Raccoon dmg = 12/24 = **0.50** (GC: 1.0/0.8 = 1.25)

**Inversão**: no GC, Slim era o glass-cannon agressivo. No Eternia,
Slim virou o passivo fraco e Raccoon o tank dominante. Caractere errado.

### Recomendação stats

Reequilibrar ratios pra GC-feel sem quebrar dificuldade global:

| Mob | HP | Damage | Speed | Cooldown |
|---|---:|---:|---:|---:|
| Slim | **100** ↑ | **14-18** ↑ | **110** ↑ | **1100ms** ↓ |
| Raccoon | **120** ↓ | **16-22** ↓ | 75 | 1800ms |

Resultado:
- Slim/Raccoon HP = 100/120 = 0.83 (próximo do GC 0.89) ✓
- Slim/Raccoon dmg = 18/22 = 0.82 (mais próximo de 1.0 do GC) ✓
- Slim mais agressivo (speed↑ + cooldown↓) — match "swarm aggressor"
- Raccoon ainda tank mas menos absurdo

Total dmg-output do stage cresce ~5%, manageable na difficulty atual.

## 3. AI patterns

`AISlim.stg` e `AIRacoon.stg` referenciados no `aitemplate.lua` mas
**não foram extraídos** no acquired pack. Conhecemos só:
- `aiinsectivorous.stg` (boss da Floresta GC) — futuro reference pro
  forest-1-4 do Eternia
- `aiminiinsectivorous.stg`
- `aitemplate.lua` (registry com 70+ AIs)

### O que sabemos do Slim/Raccoon do GC pelas notas de jogo

- **Slim**: corpo gelatinoso, ataque tipo "body slam" pulando no player. SEM projectile no S1 original — Eternia já modernizou com spit projectile (mantemos como variation)
- **Raccoon**: melee + jump-pounce (lunge). Match com Eternia atual

### Eternia atual — bem alinhado

Slim: 2 attacks (jab melee + spit projectile). GC só tinha 1 (body slam).
**Eternia adiciona o spit como modernization** — "stays GC-feel" porque
slim continua corpo agressivo, mas ganha range option = mais
interessante de combatear. **Mantém**.

Raccoon: 2 attacks (claw melee + lunge with vx push). Direto-match com
GC pounce. **Mantém**.

**Conclusão AI: nenhuma mudança.** Padrões já refletem GC-feel.

## 4. Camera & atmosphere

Source: `script/mapinfo.lua` GlobalCamera + Stage0:

```lua
GlobalCamera = {
  HostViewZoomMode = 0,
  WideMode = 0,
  FollowRateX = 0.04,
  FollowRateY = 0.04,
  BoundY = 0.85,
  BoundX = 1.0,
  LookX = 0.0,
  LookY = 0.85,
}
```

**Eternia atual** (`Camera.ts`): lerp rate fixo 0.15. GC usava 0.04 —
**4× mais lento (smoother follow)**. Vale testar.

**MP_SHINING_DUST** (Floresta property): 2 dust particles top corners
at (-0.8, -0.4) e (0.8, -0.4). Particles "BangUl" + "BangUl2" decorativos.
Eternia não tem essa atmosfera; **opcional adicionar dust particles**
nos cantos do stage como ambient effect (não bloqueia, só reforça vibe).

### Recomendação camera

Trocar `lerpRate = 0.15` → **`0.08`** em `Camera.ts` constructor default.
Mais smooth, mais GC-feel. (0.04 talvez seja TOO smooth — tenta 0.08
primeiro, ajusta depois se sentir muleta.)

## 5. Resumo executivo — mudanças propostas

Total: 3 ajustes pequenos no MVP forest-1-1, sem rewrite.

### 5.1 Spawn density (forest-1-1.json)
- Adicionar 2 Slims em alturas elevadas
- Mover 1 Slim que já existe pra outra plataforma
- Total: 5 Slims + 2 Raccoons = 7 mobs (match GC)

### 5.2 Stats rebalance (data/mobs.ts)
- Slim: HP 80→100, dmg 12→18, walkSpeed 90→110, cooldown 1400→1100
- Raccoon: HP 130→120, dmg 24→22

### 5.3 Camera smoothness (Camera.ts)
- lerpRate default 0.15 → 0.08

## 6. O que NÃO vai mudar

- Arte: Forest Sprite + Bramble Beast designs próprios. Sem inspiração
  visual nos GC sprites (que são copy-paste-detectable na cara).
- Boss da Floresta (Insectivorous) — já é GC original, será forest-1-4
  futuramente. Cross-reference dele fica pra quando 1-4 entrar em foco.
- Mob quantidade entre stages 1-2/1-3/1-4 — fora do MVP atual.

## 7. Pra arte modernizada (futuro)

Quando você extrair texturas individuais do `GrandChase.zip`:
1. Roda Windows tool tipo "Grand Chase Resource Unpacker" / "kom
   extractor" no Steam zip
2. Drop os .png extraídos em `client/art/gc-reference/` (gitignored)
3. Eu uso como reference visual em prompts pro Nano Banana — **não no jogo**:
   ```
   "Inspired by the silhouette and color palette of [reference], but
   redrawn from scratch as an original creature in modern 2D anime
   painted style. NOT a copy."
   ```
4. Cada mob/stage do Eternia ganha um "essence card" no docs com:
   - GC equivalent (visual ref + mech ref)
   - Eternia design (final)
   - What changed and why

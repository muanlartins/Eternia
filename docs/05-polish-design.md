# 05 — Polish Design (Phase 5)

Game feel sem dependência de assets. Tudo que faz cada hit "soar" mais
forte com primitivas que já temos.

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **5.A** | Hit pause + screen shake + KO flash | implementado |
| **5.A.2** | Parry buff redesign (mob → player) + boss death epic + parry radial burst | implementado |
| **5.A.3** | Boss death slow fade (drift up + alpha decay 2.5s) + spark trail | implementado |
| **5.C** | Damage number juiciness (tier color/size, pop animation, parry "!" suffix) | implementado |
| **5.B** | SFX sintéticos via Web Audio API (hit/parry/death/skill/jump/dash) | implementado |
| **5.E** | HUD redesign — Pixi bars (HP/MP/Dodge/Skills) + run timer + stage banner | implementado |
| **5.D** | BGM + assets de áudio profissionais | pendente |

## 5.A — Hit pause + screen shake + KO flash

### Hit pause (hitstop)

Em `main.ts`:

```ts
let hitPauseMs = 0;
const realDtMs = app.ticker.deltaMS;
const dtMs = hitPauseMs > 0 ? 0 : realDtMs;
hitPauseMs = Math.max(0, hitPauseMs - realDtMs);
```

Game logic (player, stage, mobs, hitFx) recebe `dtMs` (zero durante pause).
Camera recebe `realDtMs` — shake **continua tocando** mesmo durante pause,
o que dá o efeito clássico de "tudo parado tremendo".

Tabela de impacto baseada em `applied` damage (já considera bonus do parry):

| Damage | Shake px | Shake ms | Pause ms |
|---|---|---|---|
| ≥ 50 | 14 | 260 | 90 |
| 30–49 | 10 | 200 | 60 |
| 18–29 | 6 | 140 | 30 |
| 10–17 | 4 | 100 | 12 |
| < 10 | 2 | 60 | 0 |

Combo Z1 (8 dmg) é light, Z3 (22) é medium-strong, S3 (60) é massive.
Parry-buffed Z3 (37) escala automaticamente pra heavy tier. Sem bookkeeping
adicional.

**Player taking damage**: shake 6, pause 30ms (forte mas curto — não trava
o player demais).

**Parry success**: shake 14, pause 90ms — celebração explícita do parry.

**Mob death**: shake 8, pause 50ms (regular) ou shake 18, pause 140ms (boss).
Mob.isBoss() retorna true se `spec.maxHp >= 200`.

### Screen shake

`Camera.shake(intensity, durationMs)` com decay quadrático:

```ts
const remaining = Math.max(0, 1 - elapsed / duration);
const decay = remaining * remaining;
const offsetX = (Math.random() * 2 - 1) * intensity * decay;
```

Quadrático (não linear) faz o tremor fade out feliz. Intensidade adicional
não reseta um shake mais fraco em andamento — só substitui se o novo for
"maior" (intensity × duration).

### KO flash

Mob ganha campo `koFlashMs` setado em 220ms quando hp=0. Em `redraw`,
estado Dead + flash ativo desenha mob branco com alpha decaindo de 0.95
pra 0.4. Após flash, fica no cinza dim original.

Resultado: morte do mob é um "clarão" visível à distância — reforça que
você matou algo, especialmente útil quando há vários mobs ativos.

### O que NÃO foi feito (intencional)

- **Hitlag direcional**: nada de pausar player+atacando freio, atacando
  segue. Hitstop é simétrico (todos congelam) — mais simples, sem chance
  de bugs com knockback re-aplicado.
- **Slowmotion**: rejeitado. Hades não tem; demanda BGM stretch que não
  temos.
- **Chromatic aberration / vignette**: muito caro pra primitivas, fica pra
  Phase 7 com shader real.

## 5.A.2 — Parry buff redesign + boss epic

### Parry buff: mob → player

**Antes**: parry success setava `parriedBuff` no Mob, e o próximo hit naquele mob
recebia `× spec.parriedDamageMultiplier` (1.7×). Recompensa morria com o mob.

**Depois**: parry success ativa `parryBuffMs` no Player (3000ms). Durante essa
janela, **TODOS os hits do player** (combo Z, skills, dash atk, jump atk)
recebem `× parryBuffDamageMul` (1.5×). Aplicado em `Player.computeActiveHit`:

```ts
let damage = h.damage;
if (isCombo) damage *= modifiers.comboDamageMul;
if (parryBuffMs > 0) damage *= spec.parryBuffDamageMul;
```

Mudança fundamental: parry vira **investimento ofensivo**. Você parry um
slim e usa S3 buffado no boss próximo (60 base × 1.5 = 90). Decisões
táticas ricas: parry → cast S3 imediatamente vs guardar pra parry no boss.

**Mob.parriedBuff** continua existindo apenas como indicador visual (gold
outline durante stun). `parriedDamageMultiplier` permanece no spec mas não
é mais usado (futura limpeza).

**Visual no Player**: stroke gold (0xffd700) 3px com alpha 0.95 enquanto
buff ativo, em vez do branco padrão 1px. Fácil de ver mid-combat.

**HUD**: linha extra `★PARRY×1.5 2.3s` quando ativo.

### Boss death epic

Antes: shake 18 / 500ms, pause 140ms, KO flash 220ms.

Depois:
- Shake 26 / 700ms (mais longo, mais agressivo)
- Pause 220ms (sente o golpe final)
- KO flash 500ms (boss permanece branco brilhante 2× mais tempo)
- **Spark ring**: 14 sparks num anel de raio 60 + 8 sparks em anel interno
  de raio 28 com offset angular (22 sparks total no centro do boss)

Mob comum (slim/racoon) mantém shake 8 / 200ms, pause 50ms, sem ring.

### Parry success radial burst

Adicionado: 8 sparks em ring de raio 28 ao redor do player no momento do
parry. Antes: 3 sparks no centro do impact. Agora: 3 sparks no impact + 8
sparks circulares no player. Reforça que o parry é o player que estourou
o ataque.

## 5.A.3 — Boss death slow fade

**Antes**: boss morria, flash 500ms, depois escondido (fica gray dim invisível
porque !alive draw é tomado pelo fluxo dead). Sem ceremonia.

**Depois**: dois estágios sequenciais:

1. **Flash phase** (500ms): branco brilhando com alpha decaindo (0.95 → 0.4)
2. **Fade phase** (2500ms, só boss): alpha decai de 0.7 → 0, body drifta
   36px pra cima (alma escapando), stroke gold ao redor
3. Após fade: invisível (não desenha nada). Mob comum não tem fade phase,
   continua com gray dim padrão.

Total da morte do boss visível: **3 segundos** — Grand Chase moment pra
curtir o "te derrotei".

```ts
// Mob.update
this.koFlashMs = max(0, this.koFlashMs - dtMs);
if (this.koFlashMs <= 0) {
  this.koFadeMs = max(0, this.koFadeMs - dtMs);  // só decrementa após flash
}
```

**Spark trail durante fade**: main.ts emite 1 spark/160ms em posição random
dentro do hurtbox do boss (top 70% pra parecer subindo). Visual de "essência"
escapando.

**Trade-off**: clearAnnounce dura 1500ms, depois buffOffer. Se player escolhe
buff rápido, fade é interrompido por stage.destroy(). Se demora ~2500ms+
lendo cards, fade completa. Aceitável — recompensa player que para pra
contemplar.

## 5.C — Damage number juiciness

Popup antes era texto monocromático amarelo de 18px. Agora:

### Tier por damage value

| Damage | Color | Size | Stroke |
|---|---|---|---|
| <12 | gray (`0xeeeeee`) | 15px | black |
| 12–29 | yellow (`0xffe066`) | 18px | black |
| 30–59 | orange (`0xffaa44`) | 21px | black |
| ≥60 | red (`0xff5544`) | 24px | black |
| **parry-buff (any)** | gold (`0xffd700`) | 22px (×1.15) | brown (`0x553300`) |

Parry-buffed popup também ganha sufixo "!" (e.g., "37!" em vez de "37").

### Pop animation

Spawn com `scale = baseScale × 1.5`. Decai pra `baseScale × 1.0` linearmente
nos primeiros 90ms. Após settle, mantém scale enquanto sobe + fade out.
Lifetime estendido de 600ms → 700ms pra dar mais tempo de leitura.

### Jitter

`±7px X, ±3px Y` no spawn. Múltiplos hits no mesmo frame (S2 multi-hit, S3
em múltiplos mobs) não empilham no exato pixel — visualmente espalham.

## 5.B — SFX sintéticos (Web Audio API)

Sem assets externos: oscillators + envelopes + filtros geram tudo
proceduralmente. `client/src/game/Audio.ts` (`GameAudio` class).

### Sons implementados

| Evento | Wave | Freq base | Dur | Notas |
|---|---|---|---|---|
| `playHit('light')` | sawtooth | 280→140Hz | 100ms | combo Z1 |
| `playHit('medium')` | sawtooth | 200→90Hz | 140ms | combo Z2, jumpAtk |
| `playHit('heavy')` | sawtooth | 130→55Hz | 180ms | combo Z3, dashAtk, S1 |
| `playHit('massive')` | sawtooth | 90→38Hz | 240ms | S3, parry-buffed S2 |
| `playParrySuccess()` | triangle + sine | 880→1760Hz + 1320→2200Hz | 450ms | bright dual-osc chime |
| `playPlayerHurt()` | square | 220→110Hz | 280ms | pitched-down growl |
| `playMobDeath(false)` | square | 440→80Hz | 250ms | quick downward squeak |
| `playMobDeath(true)` | dual sawtooth (detuned) | 120→40Hz, 80→28Hz | 1400ms | low rumble com filter sweep |
| `playSkillCast(0)` | sine + saw + lowpass | 330→660Hz | 320ms | rising tone |
| `playSkillCast(1)` | sine + saw + lowpass | 440→880Hz | 450ms | maior, tier 2 |
| `playSkillCast(2)` | sine + saw + lowpass | 550→1100Hz | 650ms | massive, tier 3 |
| `playJump()` | square | 440→880Hz | 100ms | rising blip |
| `playDash()` | white noise + bandpass | ~900Hz center | 120ms | swoosh |

Hit intensity é derivada de `applied damage`:
- < 10: light
- 10–17: light
- 18–29: medium
- 30–49: heavy
- ≥ 50: massive

### Lazy AudioContext init

Browsers bloqueiam AudioContext sem user gesture. `ensureCtx()` cria/resume
no primeiro `playXxx()` call. Como o primeiro hit/cast vem de input do
player (gesture), funciona sem prompt explícito. Se context está
suspended, chama `.resume()`.

### Detecção de eventos em main.ts

- **Hit/death/parry/hurt**: já capturadas no hit-resolution loop (depois
  de `m.receiveHit` e `player.takeDamage`/`player.isParryActive`)
- **Skill cast**: state transition detection (Skill1/2/3 entered ou
  re-entered com stateTimeMs ~0) — single-shot per cast
- **Jump**: state transition pra JumpRise ou DoubleJump (separadamente —
  cada um trigga playJump uma vez)
- **Dash/AirDash**: state transition pra Dash ou AirDash (cada um single
  trigger)

### Mute toggle

`KeyM` toggla mute. `audio.setMuted(true)` faz cada `playXxx` virar no-op.

### Master volume

`masterGain.gain.value = 0.4` por default — não deafening em laptop
speakers, mas audível. Configurável via `audio.setVolume(0..1)`.

## 5.E — HUD redesign

### Antes vs depois

**Antes**: linha única de texto monoespaçado em `hud.text` com tudo
concatenado (`stage 1/3  lives: ♥♥♥  mobs: 5  state: idle  hp: 87/100
mp: 45/100  dodge: [██·]  cd: A✓ S5.2 D12.0  ★PARRY×1.5  buffs: ...`).
Funcional pra debug mas visualmente cansativo.

**Depois**: classe `Hud` (`client/src/game/Hud.ts`) com Pixi Graphics
para bars, Text só para labels.

### Layout

**Top-left** (column ~280px):
1. **Lives**: `♥♥♥` em vermelho (font 20)
2. **HP bar**: 200×14, fundo escuro com stroke branco, fill vermelho
   `0xff4455`. Label `HP 87/100` à direita.
3. **MP bar**: 200×14, fundo azul-escuro, fill azul `0x4488ff`. **3 tick
   marks brancos verticais** nas posições 25/50/80% indicando os MP costs
   das skills S1/S2/S3. Label `MP 45/100` à direita.
4. **Dodge boxes**: 5 quadrados 18×8 com gap 4px. Filled cyan
   (`0x88eecc`) por segment cheio, dim (`0x222233`) por vazio. Label
   "DODGE" à direita.
5. **Parry buff** (visible só quando ativo): texto gold
   `★ PARRY ×1.5  2.3s`
6. **Skill cooldowns**: 3 boxes 26×26 com letra A/S/D dentro. Box azul
   `0x223355` com border azul claro quando ready; box marrom
   `0x332211` com border marrom quando em cooldown. Letra dim 0.45
   alpha durante cd. Texto `5.2s` abaixo de cada box quando aplicável.
7. **Buffs**: text wrap pequeno (10px gray) abaixo dos skill boxes.

**Top-center**:
- Stage info: `STAGE 2/3 — Floresta dos Elfos — 2   4 mobs` (font 13 bold)
- Run timer abaixo: `2:34` (font 11 dim)

**Top-right**:
- Server status: `server 0.0.1` (font 10 cinza, anchored right)

**Bottom-left** (existente): controls hint preservado.

### Tick marks no MP bar

Posições calculadas dinamicamente via `(cost / maxMp) * BAR_W`. Com
maxMp=100 e costs 25/50/80, ticks aparecem em 50px, 100px, 160px do
bar de 200px. Player vê ao bater os MP cuts onde cada skill começa a
ficar disponível. Visual prep pra futura integração charge+MP em uma
única bar (mencionado pelo user).

### Update API

`hud.update({ player, lives, maxLives, stageIdx, stageName, totalStages,
aliveCount, serverInfo, runMs })`. Cada frame em `main.ts`. Run timer
calculado de `runStats.startedAtMs` ou `endedAtMs` se vitória.

## Próximas sub-fases

### 5.D — Audio profissional

Precisa de SFX assets (hit light/medium/heavy, parry success, mob death,
boss roar, footstep, jump, dash). Free packs do Kenney.nl ou similar.
Web Audio API direto (não precisa de lib). Voume mixer simples.

### 5.C — Particles

Radial burst de 8 sparks no parry success (não 3 lineares como atual).
Dust kick-up no ground dash. Leaf/glow trail no air dash. Ainda
primitivas — Pixi Graphics circles+rectangles com tweens manuais em update.

### 5.D — Damage number juiciness

Popup atual é texto subindo + fade. Adicionar:
- Scale-in pop (1.4× spike depois 1.0× steady) no spawn
- Color tier por damage range (white < orange < red < gold parry-buff)
- Crit indicator: parry-buffed hit gera popup levemente maior + outline

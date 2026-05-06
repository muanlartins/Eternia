# 05 — Polish Design (Phase 5)

Game feel sem dependência de assets. Tudo que faz cada hit "soar" mais
forte com primitivas que já temos.

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **5.A** | Hit pause + screen shake + KO flash | implementado |
| **5.A.2** | Parry buff redesign (mob → player) + boss death epic + parry radial burst | implementado |
| **5.B** | Audio (SFX hit/parry/death/footstep, BGM) | pendente — precisa assets |
| **5.C** | Damage number juiciness (scale, color tier, crit visual no parry) | pendente |

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

## Próximas sub-fases

### 5.B — Audio

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

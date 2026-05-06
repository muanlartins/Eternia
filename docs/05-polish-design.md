# 05 — Polish Design (Phase 5)

Game feel sem dependência de assets. Tudo que faz cada hit "soar" mais
forte com primitivas que já temos.

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **5.A** | Hit pause + screen shake + KO flash | implementado |
| **5.B** | Audio (SFX hit/parry/death/footstep, BGM) | pendente — precisa assets |
| **5.C** | Particles avançadas (radial burst no parry, dust no dash, leaf trail) | pendente |
| **5.D** | Damage number juiciness (scale, color tier, crit visual no parry) | pendente |

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

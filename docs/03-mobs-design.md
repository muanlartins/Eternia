# 03 — Mobs and AI Design (Phase 3)

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **3.A** | 1 mob (Slim) com AI básica (chase + telegraphed attack) + dano no player + HP/Hurt/Dead | implementado |
| **3.B** | Racoon — variante mais lenta, pesada, com mais HP | implementado |
| **3.B.2** | Combo break threshold + armor durante counter | implementado |
| **3.C** | Mob spawning data-driven (replicar quest_zero stage_mon) | pendente |
| **3.D** | Insectivorous boss com 3 ataques (bite / stomp AoE / charge) | implementado |
| **3.E** | Goblin Archer + sistema de projétil (parryable + sourceMob stun) | implementado |
| **3.F** | Brute (heavy melee) — slow telegraph, big damage, high combo break threshold | implementado |
| **3.G** | Mob gravity (vy + platform/ground collision; mobs fall when knocked off platforms) | implementado |
| **3.H** | Multi-phase boss (Insectivorous Phase 2 < 50% HP: ×0.55 cooldown, ×0.7 telegraph, ×1.2 dmg, ×1.4 walk, red tint, audio sting, BGM swap to bossRage) | implementado |
| **3.I** | Wisp — primeiro mob aéreo (`hasGravity: false` + `hoverY`); dive attack com vy=320 + bobbing; purple palette + glow circles | implementado |
| **3.J** | Swamp mobs: Bog Frog (leap-attack via `enterActiveJumpVy`), Mire Wraith (fast melee glass-cannon), Drowned King (water boss multi-phase) | implementado |

## 3.A — Slim com AI

### Estados do Mob

```
Idle ⇄ Chase ──(player em attackRange + cooldown ok)──▶ Telegraph
                                                         │
                              (após telegraphMs)         ▼
            Recover ◀──(após activeMs)── Active (hitbox on, atttackId++)
              │
       (após recoveryMs, attackCooldownMs reset)
              │
              ▼
            Idle
```

Hurt e Dead interrompem qualquer estado:
- **Hurt** após receber dano: stun curto, então volta a Idle
- **Dead** quando hp = 0: greyed out, respawn no ponto original após `respawnMs`

### Slim spec (`client/src/data/mobs.ts`)

| Campo | Valor |
|---|---|
| `width × height` | 36 × 32 |
| `maxHp` | 80 |
| `walkSpeed` | 90 px/s |
| `aggroRange` | 220 px |
| `attackRange` | 54 px |
| `attack.telegraphMs` | 380 |
| `attack.activeMs` | 160 |
| `attack.recoveryMs` | 480 |
| `attack.damage` | 12 |
| `attack.knockback` | 280 |
| `attack.hitbox` | (cx 28, y -2, w 44, h 36) |
| `attackCooldownMs` | 1400 |
| `knockbackFriction` | 1500 |
| `hurtStunMs` | 280 |
| `respawnMs` | 3000 |

### Cor por estado (debug)

| Estado | Cor | Significado |
|---|---|---|
| Idle | verde escuro | parado, fora de aggro |
| Chase | verde claro | seguindo player |
| Telegraph | laranja | preparando ataque (warning) |
| Active | vermelho | hitbox ativa |
| Recover | verde acinzentado | pós-ataque, vulnerável |
| Hurt | rosa-pink | levou hit |
| Dead | cinza | morto, aguardando respawn |

A cor de telegraph é importante: o jogador tem 380ms de aviso visual (laranja
piscando? não — só cor sólida) antes do hitbox ativar. Esse é o window onde
ele escolhe dodge/parry/contra-ataque.

### Dedup de hits

Mob mantém `Set<attackId>` de golpes que recebeu. Cada hit phase do player
incrementa `currentAttackId` (já implementado em Phase 2.C). Mob ignora
hits duplicados — uma swing só causa dano uma vez.

Mob também mantém `currentAttackId` próprio: incrementa ao entrar em estado
`Active`. O player NÃO faz dedup por attackId — o estado `Hurt` do player
serve como dedup natural (durante Hurt, `isInvincible()` retorna true,
overlaps subsequentes não causam dano).

## Mounting fix (Phase 3.A.2)

**Bug**: ao pular em cima de um mob, o player ficava "montado" no topo,
caindo continuamente. A resolução AABB original empurrava o player pra cima
quando vy > 0 e top-overlap era menor — repetia frame a frame, criando o
hover.

**Fix**: em `resolvePlayerVsBox`, quando o overlap vertical é o menor E
o player está acima do box (overlapT < overlapB), prioriza resolução
horizontal "deslizando" pelo lado mais próximo:

```ts
if (minV < minH && overlapT < overlapB) {
  if (playerCenterX < boxCenterX) player.x -= overlapL;  // slide left
  else player.x += overlapR;                             // slide right
  return;  // não zera vy — player continua caindo natural
}
```

vy não é resetado, então o player continua caindo enquanto desliza
horizontalmente pra fora. Visual: ao tentar pousar em cima do Slim, a Elesis
escorrega pela borda mais próxima e cai até o chão ao lado.

Outras direções de colisão (lateral e baixo→cima) seguem comportamento
original.

## Player damage system (Phase 3.A)

### Estados novos

- `Hurt`: stun de 380ms, iframes durante todo o estado, gravidade aplicada
  (cai naturalmente se foi hit no ar). Vx decai por groundFriction; vy
  inicial −180 (pequeno bump pra cima)
- `Dead`: imóvel, contagem de respawn (1500ms), depois reset de posição (0,
  ground), HP/MP cheios, todas as flags resetadas

### takeDamage(damage, knockbackVx)

- Se já invincible (dodge/hurt/dead), no-op
- Senão: aplica dano, knockback, vy bump pra cima, transita pra Hurt ou Dead
- Player.isInvincible() inclui Hurt e Dead — então durante o stun o player
  não pode levar dano de novo
- HP exibido no HUD text junto com state/mp/pos/vel

### Fluxo de hit em main.ts

Após `player.update`:
1. Resolve colisão player ↔ dummies + mobs (skipa se isInvincible)
2. Se player.getActiveHit(), checa overlap vs dummies + mobs, dispara
   `receiveHit` + popup + spark + giveMp
3. Para cada mob: `mob.update(dtMs, playerCenterX)` → roda AI
4. Para cada mob alive com `getActiveHit()` ativo: checa overlap vs player.
   Se acerta e player não invincible, `player.takeDamage` + popup + spark

### Spawn

Por enquanto, hardcoded em `main.ts`:
- 2 Slims em world x=±480-520 (fora do range inicial dos dummies)
- 2 Dummies em world x=±220-260 (treino de combo)

Player começa em x=0. Caminhar pra direita encontra dummy (220) e depois Slim
(480). Espelhado pra esquerda.

## Próximas sub-fases

### 3.B (implementada)

`MobSpec` virou interface estrutural (era `typeof SLIM`) pra acomodar specs
diferentes com mesmo shape mas valores literais distintos.

#### Racoon spec

| Campo | Valor | vs Slim |
|---|---|---|
| `width × height` | 46 × 52 | maior, ocupa mais espaço |
| `maxHp` | 130 | +62% |
| `walkSpeed` | 75 px/s | -17% (mais lento) |
| `aggroRange` | 280 | maior alcance |
| `attackRange` | 68 | maior range de ataque |
| `attack.telegraphMs` | 500 | mais lento pra preparar (parry mais fácil) |
| `attack.activeMs` | 200 | hitbox dura mais |
| `attack.recoveryMs` | 620 | recovery longa |
| `attack.damage` | 18 | +50% (hit pesado) |
| `attack.knockback` | 360 | maior arremesso |
| `attackCooldownMs` | 1800 | menos frequente |
| `parriedStunMs` | 1100 | janela de stun maior pós-parry |

AI permanece igual (Idle → Chase → Telegraph → Active → Recover). Diferença
é puramente data-driven via specs distintas.

#### Spawning atual

| World x | Mob | Distância do player start (x=0) |
|---|---|---|
| ±220–260 | TargetDummy (treino) | perto |
| ±480–520 | Slim | médio |
| ±820–880 | Racoon | longe |

Player progride: combo no dummy → engaja Slim (baixo risco) → enfrenta
Racoon (alto risco, telegraph mais longo recompensa parry).

### 3.B.2 (implementada) — Combo break + armor

**Problema**: hits sucessivos do player ficavam re-stunando o mob (cada
`receiveHit` setava `MobState.Hurt` cancelando o anterior). Z→Z→Z em loop
travava o mob indefinidamente. Sem resistência = combo infinito.

**Solução em duas peças**:

1. **Combo break threshold** — `Mob.consecutiveHits` conta hits desde último
   reset. Cada `receiveHit` (sem `parriedBuff`) incrementa. Quando atinge
   `spec.comboBreakThreshold`, em vez de Hurt o mob entra direto em
   `Telegraph` (counter-attack), com facing apontando pro player (deduzido
   pelo sinal de `knockbackVx`).

2. **Armor durante counter** — flag `armorActive` setada na entrada do
   counter. `receiveHit` durante armor aplica dano normal mas pula a lógica
   de state change (sem ir pra Hurt, sem incrementar consecutiveHits, sem
   re-trigger de break). Mob mantém o pipeline Telegraph → Active → Recover.
   Flag limpa no fim do Recover (volta a ser interrompível).

**Thresholds atuais**:

| Mob | Threshold |
|---|---|
| Slim | 3 hits (combo Z→Z→Z completo aciona break) |
| Racoon | 4 hits (mais durável, recompensa engagement maior) |

**Reset rules**:
- `parried()`: zera `consecutiveHits` E desliga armor (parry sempre
  prevalece, dá combo limpo)
- `receiveHit` durante `parriedBuff`: NÃO incrementa (hits buffed não
  contam pro break)
- Respawn: zera tudo

**Fluxo típico Slim**:
1. Player Z (hit 1) → Hurt
2. Player Z (hit 2) → Hurt re-set, timer não reseta (já em Hurt)
3. Player Z (hit 3) → BREAK → Telegraph laranja com armor vermelho-grosso
4. Player tenta Z 4 → mob ainda em Telegraph mas com armor → dano aplica,
   estado não muda. Player vê o stroke vermelho indicando "não dá pra
   stunar mais"
5. Active hitbox → player precisa dodge ou parry. Se parry → mob entra em
   Hurt com parriedBuff, armor desliga, consecutiveHits zera, player ganha
   ~3 hits buffed
6. Após Recover (ou parry-stun → idle), mob volta ao normal vulnerável

**Visuais distintos**:
- `parriedBuff`: stroke dourado grosso (mob tomando damage extra)
- `armorActive`: stroke vermelho-laranja grosso (mob no contra-ataque,
  resistente a flinch)
- normal: stroke branco fino

**Por que parry > dodge agora**:
- Dodge → 3 hits naturais → break → counter → repetir ciclo
- Parry → 3 hits buffed (stun) + 3 hits naturais (post-stun) → break → counter
- Parry rende ~6 hits com 3 deles a 1.7×, vs dodge que rende ~3 hits raw

### 3.D (implementada) — Insectivorous boss

#### Refactor MobSpec → multiple attacks

Antes: `spec.attack` era um único objeto. Boss precisaria de variedade pra
não ser entediante. Refatoração:

```ts
interface AttackVariant {
  telegraphMs, activeMs, recoveryMs, damage, knockback, hitbox, weight,
  moveDuringActiveVx?: number,  // optional — boss moves during active frame
}

interface MobSpec {
  ...
  attacks: readonly AttackVariant[],  // array, single mob = single-element
}
```

`SLIM` e `RACOON` migrados para arrays de 1 elemento (weight: 1). Mob ganha
`currentAttackIdx` que é setado em `pickAttack()` (weighted random pelos
`weight` de cada variant) na transição Idle → Telegraph (ou no counter
após combo break).

#### Insectivorous spec

| Campo | Valor |
|---|---|
| `width × height` | 80 × 70 (>2× Slim) |
| `maxHp` | 360 |
| `walkSpeed` | 60 (lento, ameaçador) |
| `aggroRange` | 420 |
| `attackRange` | 220 (alcance grande, charge atinge longe) |
| `attackCooldownMs` | 1600 |
| `comboBreakThreshold` | 6 (mais durável que mobs normais) |
| `parriedDamageMultiplier` | 1.6 (parry um pouco menos rentável que em mobs) |
| `respawnMs` | 8000 |

#### 3 ataques

**Bite (50% weight)** — Ataque básico, alcance médio
- telegraph 360ms / active 180ms / recovery 540ms
- damage 16, knockback 320, hitbox (cx 56, y 4, w 76, h 60)

**Stomp AoE (25% weight)** — Hitbox enorme centrada
- telegraph 540ms (mais lento, dá tempo de fugir/parry) / active 220 / recovery 720
- damage 24, knockback 460, hitbox (cx 0, y 10, w 200, h 90) — cobre área inteira ao redor

**Charge forward (25% weight)** — Avança enquanto ataca
- telegraph 480 / active 380 (longa) / recovery 640
- damage 22, knockback 440, hitbox (cx 64, y 0, w 90, h 66)
- `moveDuringActiveVx: 280` — durante o active, vx é setado pra `facing * 280` por frame, sobrescrevendo a fricção de knockback. Boss "atravessa" o player se ele não dodge

#### Pickagem por peso

`pickAttack()` faz cumulative-weight random:
```ts
let r = Math.random() * total;
for each attack:
  r -= weight
  if r <= 0: return idx
```

Não tenta ser smart sobre distância — só aleatório. Pode dar Stomp quando
player está longe (que erra) ou Bite quando player está fora de melee
(também erra). Aceito por simplicidade na v1; Phase 4 ou tuning futuro
pode adicionar seleção range-based.

#### Spawn

1 boss em world x=1400. Player progressão: dummies (x=±220) → Slims
(x=±480) → Racoons (x=±820) → Boss (x=1400). Andar pra direita revela
inimigos cada vez mais difíceis.

### 3.C (próxima)

- Sistema de spawn data-driven. JSON ou TS const com `stage_mon` format:
  ```ts
  stage_mon: [
    { type: 'slim', x: 480, y: 416 },
    { type: 'racoon', x: 800, y: 416 },
    ...
  ]
  ```
- Stage start carrega a lista, faz spawn

### 3.C

- Sistema de spawn data-driven. JSON ou TS const com `stage_mon` format:
  ```ts
  stage_mon: [
    { type: 'slim', x: 480, y: 416 },
    { type: 'racoon', x: 800, y: 416 },
    ...
  ]
  ```
- Stage start carrega a lista, faz spawn

### 3.D

- Boss Insectivorous com 5 ataques distintos (port de `AIInsectivorous.stg`)
- Multiple hitboxes, fases de HP, projetéis

## Sub-fase 3.E — Goblin Archer + projétil

### ARCHER spec

```ts
{
  width: 36, height: 56, maxHp: 90, walkSpeed: 70,
  aggroRange: 380, attackRange: 280,
  attackCooldownMs: 2000,
  attacks: [{
    telegraphMs: 540, activeMs: 100, recoveryMs: 600,
    damage: 14, knockback: 280,
    hitbox: { cx: 0, y: 0, w: 0, h: 0 },  // unused
    weight: 1,
    projectile: { speed: 480, lifetimeMs: 1500, hitboxW: 18, hitboxH: 6, originDx: 22, originDy: 22 },
  }],
}
```

attackRange 280 = 5× racoon's 68. Para distante, atira, recupera. Sem
kiting v1 — fica no lugar quando entra em range.

### Projectile.ts

Class simples: x/y/vx, AABB hurtbox, lifetimeMs decrementing. Visual: rect
18×6 laranja com tip mais clara mostrando direção, alpha pulse 0.85→1.0.
`update(dtMs)` move horizontalmente sem gravidade. Auto-destroy quando
lifetime expira.

### Mob spawna projetil

`Mob.setState(Active)` chama `spawnProjectileIfNeeded()` se atk tem
`projectile`. Cria Projectile em
`mobCenter + facing × originDx, mobY + originDy`. Velocidade =
`facing × speed`.

`Mob.getActiveHit()` retorna null se atk tem projectile (mob não dá dano
direto, projectile cuida).

`Mob.flushPendingProjectiles()` retorna lista pendente (Stage drena).

### Stage rastreia projéteis

`Stage.update`: drena projéteis pendentes de cada mob, adiciona ao
worldStage, atualiza posição, remove os mortos. `getProjectiles()`
exposta pra main.ts checar collision.

### Player vs projétil em main.ts

- **Parry active**: projectile destruído, parry buff player ativado,
  `proj.onParried()` callback dispara `archer.parried(-dir × 220)` —
  archer fica stunado mesmo sem contato direto. Sparks + 8-spark ring +
  shake 14/280 + pause 90 + audio.playParrySuccess.
- **Player vulnerable**: takeDamage, projectile destruído, popup + spark +
  shake 6/140 + pause 30 + audio.playPlayerHurt.
- **Player invincible** (dodge/skill iframes): projétil passa, continua
  vivo (não destruido). Pode acertar depois quando iframe acabar.

### onParried callback evita coupling

`Projectile` tem `onParried?: () => void`. Mob seta no construtor:
`() => this.parried(-dir * 220)`. Permite parry distante stun o source
mob sem precisar de import circular nem registry de mobs.

### Stage 2 nova: Floresta dos Elfos — 2

Inserido entre stage 1 e o boss:
- 2 archers + 2 slims + 1 racoon
- 2 plataformas baixas (y=360) pra reposicionamento
- Player escolhe: aproxima (chega rápido pra interromper) ou parry/dodge
  flecha à distância

Run: Stage 1 (melee intro) → Stage 2 (ranged intro + buff offer) → Stage 3
(boss). 3 buffs por loop em vez de 2.

## 3.H — Multi-phase boss

Insectivorous boss agora tem 2 fases. Phase 2 ativa quando HP cai abaixo
de 50%. Sem state machine separada — o `phase: 1 | 2` field do `Mob`
multiplica stats em runtime.

### Phase 2 stat multipliers (no `MobSpec.phase2`)

| Stat | Mul | Phase 1 → Phase 2 |
|---|---|---|
| `attackCooldownMs` | 0.55 | 1600ms → 880ms |
| `telegraphMul` (todos os attacks) | 0.7 | 440-600ms → 308-420ms |
| `damageMul` (todos os attacks) | 1.2 | 16-24 → 19-29 |
| `walkSpeedMul` | 1.4 | 60 → 84 |
| `comboBreakThresholdMul` | 0.7 | 6 → 4 (floor) |

Resultado: boss vira muito mais agressivo. Telegraphs encurtados forçam o
player a parry/dodge mais cedo. Cooldown menor entre attacks remove o
window de safe damage. Combo break threshold menor → mais counter-attacks
do boss.

### Implementação

`Mob` field:
```ts
private phase: 1 | 2 = 1;
private justEnteredPhase2 = false;
```

Em `receiveHit`, após aplicar dano e antes do combo break check:
```ts
if (this.spec.phase2 && this.phase === 1 && this.hp / this.spec.maxHp <= phase2.hpThresholdPct) {
  this.phase = 2;
  this.justEnteredPhase2 = true;
  this.consecutiveHits = 0;
  this.armorActive = false;
}
```

Multipliers aplicados via getters privados (`attackCooldownMul()` etc) que
retornam 1 ou o `phase2.xxxMul`. Cada uso de stat (cooldown reset,
telegraph check, getActiveHit damage, walk speed, combo break check) é
multiplicado.

### Trigger effects (em `main.ts`)

`mob.consumePhaseChange()` retorna true uma vez após transição. main.ts
itera mobs após hit detection e dispara:
- 16 sparks em ring de raio 70 + 8 sparks em raio 36 (visual ring duplo)
- `hitFx.textPopup('PHASE 2!', red, 28px)` acima do boss
- `camera.shake(20, 500)` — tela treme forte
- `hitPauseMs = 180` — pause dramatical
- `audio.playBossPhase2()` — sting com 2 osc (saw + square) + filter sweep
- `audio.playBgm('bossRage')` — crossfade 0.7s pra BGM mais agressiva
  (130 BPM vs 110, melodia mais acima)

### Visual indicator (persistente)

Em `Mob.redraw`, se `phase === 2`:
- Stroke vermelho (`0xff2244`) 3px (vs branco 1px)
- Overlay vermelho pulsante (alpha 0.18-0.30, sin wave 1Hz) sobre o body
- HP bar fill vira vermelho mais escuro (`0xff2244` vs `0xee5566`)

Player sabe instantaneamente que tá lutando contra a versão raivosa.

### `respawn()` reseta phase

`Mob.respawn()` (usado em autoRespawn ou no respawn manual via stage
recreate) volta `phase = 1`. Stage destroy + recreate (game over) zera
naturalmente porque cria novo Mob.

### Player death durante phase 2

Quando player perde uma vida na fase 4, `stage.destroy()` NÃO é chamado
(per 4.A.5: mobs persistem progresso). Boss continua em phase 2 com HP
preservado. Player respawna em x=80 com full HP/MP. Justa: o phase
transition aconteceu, deve continuar.

## 3.I — Wisp (primeiro mob aéreo)

Mob roxo flutuante. Sem gravidade. Faz dive attack descendente quando o
player se aproxima horizontalmente.

### Stats

| Field | Value |
|---|---|
| `id` | `wisp` |
| `displayName` | `Wisps` |
| `width / height` | 32×32 |
| `maxHp` | 70 (frágil) |
| `walkSpeed` | 130 (rápido, mas não tanto) |
| `aggroRange` | 360 |
| `attackRange` | 90 (horizontal) |
| `hasGravity` | `false` |
| `hoverY` | 380 (~36px acima do ground das outras mobs) |

### Dive attack

Único ataque. Telegraph 480ms (preview hitbox abaixo do wisp), active 220ms
com `moveDuringActiveVx = 60` + `moveDuringActiveVy = 320` (mergulha
diagonalmente em direção ao chão), recover 520ms.

Durante recover, `tickHover` lerpa `y` de volta pra `hoverY` (lerpRate=6).
Wisp sobe de volta em ~520ms, suave.

### MobSpec extensions

- `MobSpec.hasGravity?: boolean` — default true; false ignora gravidade e
  collision com plataformas/ground.
- `MobSpec.hoverY?: number` — Y target quando flutuando (idle/chase/recover).
- `AttackVariant.moveDuringActiveVy?: number` — vy aplicado durante active
  (positive = down). Já existia `moveDuringActiveVx`.

### Implementação no `Mob.update`

```ts
if (this.alive) {
  if (this.spec.hasGravity === false) {
    this.tickHover(dt);
  } else {
    // gravity + ground/platform collision
  }
}
```

`tickHover`:
- Em Active: aplica `vy` setado pelo attack (mergulha)
- Senão: lerpa `y` em direção a `hoverY + sin(time/600) * 6` (bobbing 6px)
- `onGround = false` sempre

### Sempre aerial

Como `onGround = false` SEMPRE, todo hit em wisp recebe aerial bonus
(×1.3 dmg + popup azul). Isso é intencional — wisps são glass cannons
recompensadores.

### Visual

Palette própria (`WISP_COLOR`):
- Idle: roxo escuro (0x6644bb)
- Chase: roxo médio (0x8855dd)
- Telegraph: pink (0xff66dd)
- Active: magenta (0xee44aa)
- Recover/Hurt/Dead: variações roxas

Renderização especial:
- 2 circles concêntricos atrás do body (glow effect com pulse 1Hz)
- Body alpha 0.82 (vs 0.95 normal) — dá ar etéreo

### Spawn em stages

- Stage 2 (Floresta dos Elfos — 2): +1 wisp em x=880, intro do mob
- Stage 3 (Floresta Profunda): +2 wisps em x=540 e x=1280

### Aspectos não cobertos

- **AI vertical**: wisp não persegue verticalmente. Player que pula alto
  fica fora de range — wisp não levanta. OK por design (wisp = ameaça em
  uma altura específica).
- **Projétil mágico**: wisp só tem dive melee. Versão ranged ficou pra
  futuro mob (e.g., Mage).
- **Death physics**: wisp morto NÃO cai. koFlash/koFade usam current y.
  Funciona porque alive=false skipa o `tickHover`. Visual se dissolve
  no ar — combina com aesthetic.
- **Phase transition**: wisp não tem `phase2`. Pode ser adicionado depois
  se quisermos elite wisps.

## 3.J — Swamp mobs (Pântano dos Esquecidos)

3 mob types novos pro segundo bioma:

### Bog Frog (sapo do brejo)

Mob terrestre que LEAPS no ataque. Animação: telegraph (crouch), active
(arcada saltando), recover (landing).

| Field | Value |
|---|---|
| `width × height` | 44×32 (baixo, largo) |
| `maxHp` | 110 |
| `walkSpeed` | 60 (lento) |
| `aggroRange` | 260 |
| `attackRange` | 110 |
| `attackCooldownMs` | 1700 |
| `comboBreakThreshold` | 4 |

**Leap attack**: telegraph 540ms (crouch), active 280ms (no ar com gravidade),
recover 480ms (pousa). Damage 16, knockback 320, hitbox cx=32 w=60 h=36.

Movement: `moveDuringActiveVx: 280` (forward velocity sustained durante o
salto) + `enterActiveJumpVy: -380` (impulso vertical único quando entra em
Active). Gravidade do mob (já existe pra outros mobs com `hasGravity`
default) puxa de volta. Resultado: arco parabólico de salto.

### Mire Wraith (espectro do brejo)

Glass-cannon terrestre. Rápido, agressivo, frágil.

| Field | Value |
|---|---|
| `width × height` | 36×50 |
| `maxHp` | 75 (frágil) |
| `walkSpeed` | 140 (rápido) |
| `aggroRange` | 320 |
| `attackRange` | 64 (curto) |
| `attackCooldownMs` | 1300 |
| `comboBreakThreshold` | 3 (rage easily) |

**Slash attack**: telegraph 380ms (curto, perigoso), active 140ms,
recover 380ms. Damage 22 (alto), knockback 300.

Palette cyan/teal (`MIRE_WRAITH_COLOR`) — combinação com aesthetic
fantasma. Glass-cannon design: 75 HP morre em 2-3 hits combo Z, mas o
22 damage por hit force player a parry/dodge tight.

### Drowned King (boss do pântano)

Variação do Insectivorous boss. Mesmas 3 attacks (bite/AoE stomp/charge)
mas stats levemente diferentes + Phase 2 mais agressivo + palette azul-marinho.

| Field | Value |
|---|---|
| `maxHp` | 420 (vs 360 do insectivorous) |
| `walkSpeed` | 50 |
| `attackRange` | 240 |
| `phase2.attackCooldownMul` | 0.5 (vs 0.55 insectivorous) |
| `phase2.walkSpeedMul` | 1.5 (vs 1.4) |

`bossName: 'Drowned King'` aparece no banner + BossHpBar quando entra no
stage 6.

Palette: deep blue (0x2a4a78 idle → 0x3a5b8c chase). Telegraph pinkish
(0xff66aa) pra contrastar com body azul.

### `enterActiveJumpVy` (novo AttackVariant field)

Diferente de `moveDuringActiveVy` (per-frame, sustained — usado pelo Wisp
dive), `enterActiveJumpVy` é aplicado UMA vez quando entra em `MobState.Active`.
Combina com gravidade do mob pra criar saltos parabólicos.

Implementação em `Mob.setState`:
```ts
if (s === MobState.Active) {
  this.currentAttackId++;
  this.spawnProjectileIfNeeded();
  const atk = this.currentAttack();
  if (atk.enterActiveJumpVy !== undefined) {
    this.vy = atk.enterActiveJumpVy;
    this.onGround = false;
  }
}
```

`onGround = false` força a gravidade a tomar conta na próxima frame.

### Palettes per mob via helper

`paletteFor(id: string): Record<MobState, number>` substitui o
hardcoded check de wisp:
```ts
function paletteFor(id) {
  switch (id) {
    case 'wisp': return WISP_COLOR;
    case 'bog-frog': return BOG_FROG_COLOR;
    case 'mire-wraith': return MIRE_WRAITH_COLOR;
    case 'drowned-king': return DROWNED_KING_COLOR;
    default: return MOB_COLOR;
  }
}
```

Usado em `redraw()` (alive draw) E no dead non-boss draw (para o gray dim
não destoar do body).

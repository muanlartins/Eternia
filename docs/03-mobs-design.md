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

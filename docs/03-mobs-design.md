# 03 — Mobs and AI Design (Phase 3)

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **3.A** | 1 mob (Slim) com AI básica (chase + telegraphed attack) + dano no player + HP/Hurt/Dead | implementado |
| **3.B** | Tipos extras de mob (Racoon) com variedade de AI | pendente |
| **3.C** | Mob spawning data-driven (replicar quest_zero stage_mon) | pendente |
| **3.D** | Boss (Insectivorous) com 5 ataques diferenciados | pendente |

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

### 3.B (próxima)

- Adicionar 1-2 tipos extras (Racoon, baseado em `monstertemplate` do GC).
  Variedade de stats: HP, range, padrão de ataque
- Optionally: AI de "kite" (mantém distância e ataca à distância) vs "rusher"
  (chase agressivo, hit-and-run)

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

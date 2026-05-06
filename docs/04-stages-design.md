# 04 — Stage Flow Design (Phase 4)

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **4.A** | Stages data-driven + win condition + transição com banner + restart no death | implementado |
| **4.A.2** | Mob facing marker + hitbox preview no telegraph + skill iframes + dodge/parry cancel + teleport stage transition | implementado |
| **4.A.3** | Telegraphs estendidos + dodge bar 5 + plataformas one-way no stage 2 | implementado |
| **4.A.4** | Walk-off-platform fall fix + 3 vidas (GC-style) + telegraph/dodgeStand re-tuning | implementado |
| **4.A.5** | Mob attack flow committed + dodge regen 0.4 + mobs persist progress on death + post-parry cooldown | implementado |
| **4.B** | Buff offer scene entre stages (Hades cards) | pendente |
| **4.C** | Effects de buffs aplicados ao player | pendente |
| **4.D** | Run record / save no servidor | pendente |

## 4.A — Stage system

### Spawn data-driven

`client/src/data/stages.ts` define o array `STAGES`:

```ts
interface StageSpec {
  id: string;
  name: string;
  spawns: { type: MobType; x: number }[];
}
```

`MobType` é union literal de `'slim' | 'racoon' | 'insectivorous'`. Mapeado
para o `MobSpec` correspondente via `MOB_SPECS` record. Y position derivado
automaticamente de `GROUND_Y - mobSpec.height`.

Stages atuais (do MVP reduzido pra 2):
1. **Floresta dos Elfos — 1**: 3 Slims + 2 Racoons em x=320..1240
2. **Floresta dos Elfos — Boss**: 2 Racoons + 1 Insectivorous em x=380..1080

### Stage class

`client/src/game/Stage.ts`. Owns a list of `Mob` instances spawned com
`autoRespawn: false`. Ciclo:

- `spawn()` — instancia mobs do spec, adiciona views ao worldStage
- `update(dtMs, playerCenterX)` — propaga update pra cada mob
- `getMobs()` — exposto pra main.ts fazer hit/collision detection
- `isCleared()` — `every(m => !m.alive)`
- `destroy()` — remove views do worldStage e chama `view.destroy()`. Chamado
  ao transicionar entre stages

### State machine de transição

main.ts mantém uma simples FSM:

```
playing ──(stage.isCleared())──▶ clearAnnounce
                                       │
                          (1500ms)     ▼
nextAnnounce ◀────────────── (stage transition: destroy current, spawn next)
     │
  (1500ms)
     │
     ▼
playing
```

Banner UI no centro da tela:
- `clearAnnounce`: "STAGE N CLEAR!" (amarelo grande com stroke preto)
- `nextAnnounce`: "STAGE N: name"
- `playing`: banner hidden

### Player death = restart current stage

Detecção: `prevPlayerState === Dead && currentState !== Dead` (player
acabou de respawnar). Em vez de avançar, destroi e re-cria o stage atual.
Player perde tudo que matou no stage. Stage phase é forçada a `nextAnnounce`
com banner do stage atual ("voltei pro mesmo stage").

### Mob.autoRespawn flag

Antes: `Mob` sempre respawnava após `respawnMs`. Causava infinite engagement
nos hardcoded mobs.

Agora: `new Mob(spec, x, y, { autoRespawn: false })` desliga a contagem.
No estado `Dead`, se `!autoRespawn`, o `deadTimerMs` não decrementa, mob
fica morto pra sempre. Stage controla quando "respawnar" (= novo stage,
nova instância).

Default ainda é `autoRespawn: true` pra backward compat (TargetDummy
training, se reintroduzido).

### Loop de stages

Após o último stage, voltamos ao primeiro:
```ts
currentStageIdx = (currentStageIdx + 1) % STAGES.length;
```

Phase 4.B vai introduzir buff offer entre stages, e Phase 4.D vai marcar o
fim da run no último boss (run complete → save record). Por agora é um loop
infinito pra teste.

### HUD updates

Substituído `pos: (x, y)` por `stage X/Y  mobs: N`. Foco passa de debug-pos
pra status-de-stage.

## 4.A.2 — Readability + safety pass

Iteração após playtest com feedback "to apanhando demais":

### Mob facing marker

Antes mob não mostrava direção. Player não sabia se ataque ia vir pra
direita ou esquerda. Adicionado `facingMarker` no `Mob` análogo ao do
Player: linha branca + ponto na extremidade indicando frente.

### Hitbox preview no telegraph

Durante `MobState.Telegraph`, o mob desenha o `previewMarker` — um
retângulo translúcido vermelho EXATAMENTE onde a hitbox vai aparecer no
estado Active. Intensifica conforme o telegraph progride:
```ts
const t = stateTimeMs / atk.telegraphMs;  // 0 → 1
const pulse = 0.5 + 0.5 * Math.sin(stateTimeMs / 60);
fill alpha:   0.06 + 0.18 * t * pulse  // sutil → vivo + pulsante
stroke alpha: 0.45 + 0.5 * t           // sempre visível
```

Player vê:
- Onde a hitbox vai aparecer (geometria exata, mirrored com facing)
- Quando ela está prestes a ativar (intensidade aumenta com t)
- Stomp AoE → preview retangular cobrindo toda a área (cx 0, w 200)
- Charge → preview à frente do mob (cx 64) — player sabe pra qual lado fugir

### Skill iframes (`isInvincible` expandido)

Antes skills eram puramente ofensivas. Player tomava hit no meio de S3 (1s
de duração) sem chance de defender. Agora `Player.isInvincible()` retorna
true também durante `Skill1/2/3`. Justificativa do user: skills são
investimento de MP + commitment de movimento, deveriam dar segurança
proporcional.

Combo Z e DashAtk/JumpAtk continuam vulneráveis (são "luta normal", risco
incluso).

### Dodge/parry cancel das ações ofensivas

Adicionado helper `tryDefensiveCancel(input)` que checa parry e dodge.
Chamado no início de `tickAttack`, `tickSkill`, `tickDashAtk`. Se aceito,
state transita pra Parry ou DodgeStand, action é abortada.

Custos pagos normalmente:
- Skill já consumiu MP no start → MP não volta
- Dodge consome 1 segment do bar mesmo cancelando attack
- Parry usa cooldown se aplicável

JumpAtk NÃO tem cancel — está no ar, parry/dodge são ground-only por design.

Aplicação: combo Z em andamento + mob telegraph chega → player aperta Space
ou Alt e cancela o combo pra defender. Custos da skill expression.

### Teleport pra x=0 na transição de stage

Antes: ao limpar stage 1, player ficava onde tinha matado o último mob
(provavelmente longe, x=1240). Stage 2 spawnava com player no meio dos
mobs novos. Quebrava a "ordem intencional" da fase.

Agora: ao final do `clearAnnounce` (antes de spawnar stage seguinte),
chama `player.teleportToStart()` que reseta x=0, y=ground, velocidades
zeradas, jumpsUsed limpo, parry cooldown limpo. **HP/MP/dodge bar
preservados** (run progression).

`Player.respawn()` (no death) reusa `teleportToStart()` e adiciona reset
de stats. Mantém DRY.

## 4.A.4 — Walk-off fix + 3 vidas + retuning

### Walk-off-platform bug fix

Quando o player saía lateralmente de uma plataforma sem pular, ele "flutuava"
no ar. Causa: `tickGround` (Idle/Walk/Run) não aplicava gravidade. A transição
pra `Fall` estava guardada por `vy > 0`, e como `vy` estava 0, nunca disparava.

Fix em `Player.tickGround`: aplicar gravidade quando `!onGround`. Coyote time
preservado — `startGroundJump` continua aceitando `coyoteMs > 0`, e o frame
de gravidade leva o estado pra `Fall` onde air handling toma conta.

### 3 vidas (GC heritage)

`main.ts` agora rastreia `lives` (default 3). Cada morte decrementa. Ao chegar
em 0: banner `GAME OVER` por 2s, run reseta pra stage 0 com 3 vidas.
Lives **persistem entre stages** (não regen automático ao limpar stage). HUD
exibe `♥♥♥` segments.

Banner phases: `playing | clearAnnounce | nextAnnounce | gameOver`.

### Re-tuning leve

Slim telegraph 460→420, Racoon 580→540 (boss intacto: 440/600/540 — boss é
pra ser desafiador). DodgeStand 460→400. Dodge regen continua só por tempo
(0.8/seg, confirmado bom pelo user).

## 4.A.5 — Mob attack flow committed + persistencia de progresso

### Mob attack flow committed (não-interrompível)

Antes: hits do player durante Telegraph/Active/Recover do mob colocavam o mob
em Hurt, interrompendo o swing. Combo break re-orientava facing baseado em
knockback. Resultado: boss "cancelando" ataques mid-Telegraph e "virando" pro
outro lado quando o player rolava — playervisão muito confusa.

Agora em `Mob.receiveHit`:
- Estado **Telegraph/Active/Recover**: hits aplicam dano mas **não mudam o
  estado**. Mob completa o swing comprometido. `consecutiveHits` não
  incrementa nesses estados (combo break só fora do attack flow).
- Combo break não re-orienta facing — mob retalia com facing existente.
  Player que está atrás do mob ganha um free dodge (recompensa pelo
  posicionamento).

Resultado: telegraphs viram contratos. Player vê preview, comita dodge ou
parry, mob completa o que prometeu. Sem "cancela e troca de ataque".

### Post-parry cooldown

Antes: parry stuna o mob mas attackCooldownMs não era afetado, então o mob
podia atacar imediatamente após o stun terminar. Sentia injusto — o player
ganhou o parry e a recompensa foi outro ataque cara-a-cara em 800ms.

Agora `parried()` seta `attackCooldownMs = max(current, attackCooldownMs)`
(1600ms pro boss). Stun de 800ms + cooldown remanescente de 800ms = 1600ms
de breathing room pós-parry.

### Mobs persistem progresso no death

Antes: `prevPlayerState === Dead` triggerava `stage.destroy()` + recriação,
zerando HP de todos os mobs. Boss boss em 100/360 → respawnar e voltar pra
360/360 dentro do mesmo stage. Pune o player duplamente.

Agora: ao perder uma vida (lives > 0), **stage não é destruído**. Player só
respawna em x=0 com HP/MP/dodge full. Mobs mortos continuam mortos, mobs
vivos preservam HP. Apenas `parriedBuff/armorActive/consecutiveHits` são
limpos via `resetTransientBuffs()` (combat state transient não deve carregar
através de morte).

Game over (lives=0) ainda destroi stage e volta pro stage 0 com 3 vidas.

### Dodge regen 0.4

Antes 0.8/seg → bar de 5 cheia em 6.25s, sustentava spam. Agora 0.4/seg →
bar cheia em 12.5s, 2.5s por dodge. Força mais decisões de parry pra
recursos defensivos.

## Próximas sub-fases

### 4.B — Buff offer

Após `STAGE N CLEAR`, antes de avançar pro próximo stage, mostrar 3 cards
com buffs random. Player escolhe 1 (clique ou tecla 1/2/3). Card aplica
um effect modifier ao player.

UI: 3 retângulos no centro com nome + descrição. Setas pra escolher,
Enter pra confirmar. Ou click direto.

Buffs base (ideias do GC + Hades):
- **Forge of Ardor**: +20% damage do combo Z
- **Iron Skin**: +15 max HP
- **Mana Surge**: regen MP 2× mais rápido
- **Quick Step**: dodge regen 1.5× mais rápido
- **Flame Burst** (rara): após combo Z3, explosão AoE secundária
- **Time Hold** (rara): parry stuna mob 1.5× mais tempo

### 4.C — Effects implementados

Aplicar buffs ao player. Cada buff tem `apply(player)` que mutaciona stats
ou adiciona behaviors. Persistem na run (até morrer).

### 4.D — Run records

Servidor salva: stages cleared, time per stage, buffs picked, death count.
Stretch: leaderboard por classe + stage.

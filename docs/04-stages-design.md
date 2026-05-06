# 04 — Stage Flow Design (Phase 4)

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **4.A** | Stages data-driven + win condition + transição com banner + restart no death | implementado |
| **4.A.2** | Mob facing marker + hitbox preview no telegraph + skill iframes + dodge/parry cancel + teleport stage transition | implementado |
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

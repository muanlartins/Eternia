# 04 — Stage Flow Design (Phase 4)

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **4.A** | Stages data-driven + win condition + transição com banner + restart no death | implementado |
| **4.A.2** | Mob facing marker + hitbox preview no telegraph + skill iframes + dodge/parry cancel + teleport stage transition | implementado |
| **4.A.3** | Telegraphs estendidos + dodge bar 5 + plataformas one-way no stage 2 | implementado |
| **4.A.4** | Walk-off-platform fall fix + 3 vidas (GC-style) + telegraph/dodgeStand re-tuning | implementado |
| **4.A.5** | Mob attack flow committed + dodge regen 0.4 + mobs persist progress on death + post-parry cooldown | implementado |
| **4.B** | Buff offer scene entre stages (Hades cards) + effects aplicados | implementado |
| **4.C** | Buff rarity tiers + behavioral rares (lifesteal, parry duration) | implementado |
| **4.D** | Run completion + victory screen + run stats tracking | implementado |
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

## 4.B — Buff offer scene + effects

### FSM atualizada

```
playing → cleared → clearAnnounce (1500ms) → buffOffer (input) → nextAnnounce (1500ms) → playing
```

`StagePhase` ganha `'buffOffer'`. Após `clearAnnounce` decair, banner some,
`BuffOffer.show(pickRandomBuffs(BUFFS, 3))` rola 3 cards distintos do pool.

### Pool atual (`client/src/data/buffs.ts`)

Buffs comuns (todos common por enquanto, raridade entra na 4.B.2 se quiser):
- **Forge of Ardor**: combo Z damage ×1.2
- **Sharpened Edge**: combo Z damage ×1.15 (stack diferente)
- **Iron Skin**: +15 max HP, heal 15 on pickup
- **Tempered Body**: +10 max HP, heal 10 on pickup
- **Mana Surge**: MP regen ×2
- **Quick Step**: dodge regen ×1.5

Stack multiplicativo é viável (pegar Forge + Sharpened = ×1.38).

### `PlayerModifiers`

Player tem campo `modifiers: PlayerModifiers` inicializado em
`DEFAULT_MODIFIERS`. Reads relevantes:
- `update()`: MP regen × `modifiers.mpRegenMul`, dodge regen ×
  `modifiers.dodgeRegenMul`
- `computeActiveHit()`: dano combo Z × `modifiers.comboDamageMul` (skills/dash/jump
  attacks NÃO escalam com esse buff por design — buffs são target-específicos)
- `getMaxHp()`: `spec.maxHp + modifiers.maxHpAdd`
- `respawn()` usa `getMaxHp()`

`applyBuff(buff)` chama `buff.apply(modifiers)` e empilha em
`acquiredBuffs[]`. Iron Skin / Tempered Body também heal o player no pickup
(não vale recompensar com HP novo se o player tá full e morre na próxima).

### Input

`Digit1/2/3` → `pick1/pick2/pick3` em `Input.ts`. Durante `buffOffer` phase,
main.ts checa `justPressed` em cada e aplica.

### Reset

`player.resetBuffs()` chamado em game over (lives=0). Buffs persistem
através de morte com lives > 0 (a sub-fase 4.A.5 já preserva run state na
morte; buffs idem).

### UI

`client/src/game/BuffOffer.ts` — 3 cards 220×280 centrados com border
amarela. Cada card mostra `[N]`, nome (bold), descrição. Title "PICK A
BLESSING" em cima, hint "press 1, 2, or 3" embaixo. `container.visible`
toggle.

### HUD

Linha de buffs anexada quando `acquiredBuffs.length > 0`:
`buffs: Forge of Ardor, Mana Surge, ...`. HP display agora usa
`player.getMaxHp()` em vez de `ELESIS.maxHp` (atualiza com Iron Skin).

## Próximas sub-fases

## 4.C — Rarity tiers + behavioral rares

### Rarity field

`BuffSpec` ganha `rarity: 'common' | 'rare'`. Pool atual:
- 7 commons (existing 6 + Endurance Breath)
- 2 rares (Vampiric Edge, Time Hold)

### Weighted random (RARE_PICK_CHANCE = 0.25)

Para cada slot do offer:
1. Roll 25% chance de querer rare
2. Se quer rare e tem rare disponível (não usado neste offer) → pick rare
3. Senão fallback pra qualquer não usado
4. Mesmo offer não repete buff (used set)

Resultado: ~75% slots common, ~25% slots rare. Players verão rare em ~58%
dos offers de 3 cards (1 - 0.75³).

### Novos buffs

**Endurance Breath** (common): `hpRegenPerSec += 1`. Continuous heal during
combat. Não regen quando dead/hp=0 (`Player.update` checa state).

**Vampiric Edge** (rare): `comboLifestealPct += 0.12`. Combo Z hits healam
12% do dano causado. Lifesteal NÃO se aplica a skills/dash atk/jump atk
(target específico do combo Z pra não trivializar S3).

`ActiveHit` ganha `isCombo: boolean` (Player marca true em
Attack1/2/3). main.ts checa: `if (hit.isCombo && comboLifestealPct > 0)
player.heal(applied * pct)`.

**Time Hold** (rare): `parryBuffDurationMul *= 1.6`. Parry buff dura 4.8s
em vez de 3s. Stack com Vampiric: parry → S3 buffed → combo Z healing
durante o parry buff window.

### Visual

Cards de rare:
- Border laranja (`0xff9933`) 4px em vez de gold (`0xfff066`) 3px
- Tag `★ RARE` em laranja sob o `[N]`
- Nome desce 10px pra acomodar a tag

`[N]` cor matches border (gold pra common, orange pra rare). Diferença óbvia
visualmente sem ser overwhelming.

## 4.D — Run completion + victory screen

### FSM expandida

```
playing → cleared (last stage?) → victoryAnnounce (2.5s) → victoryStats (any key) → new run
                              ↓ no
                              → clearAnnounce → buffOffer → nextAnnounce → playing
```

`StagePhase` ganha `victoryAnnounce` e `victoryStats`. Banner "VICTORY!"
mostra por 2.5s, depois `VictoryStats` overlay aparece e espera input.

### Detecção de vitória

`if (currentStageIdx === STAGES.length - 1) → victoryAnnounce` em vez de
clearAnnounce. `runStats.endedAtMs = performance.now()` capturado neste
momento (timer congela).

### `RunStats` tracking

Em `main.ts`:

```ts
interface RunStats {
  startedAtMs: number;
  endedAtMs: number | null;
  damageDealt: number;
  damageTaken: number;
  killCounts: Record<string, { name: string; count: number }>;
  buffsPicked: string[];
  deaths: number;
}
```

Updates:
- **damageDealt**: `+= result.applied` no hit-vs-mob
- **damageTaken**: `+= mobHit.damage` ou `proj.damage` quando player toma hit
- **killCounts**: incrementa por `m.getId()` quando `!m.alive` pós-receiveHit
- **buffsPicked**: append `buff.name` no buffOffer pick
- **deaths**: `+= 1` no death detection

### MobSpec.id + displayName

`MobSpec` ganha `id: string` (slim/racoon/archer/insectivorous) e
`displayName: string` (Slims/Racoons/Archers/Bosses) pra label do stats.
`Mob.getId()` e `Mob.getDisplayName()` expostos.

### `VictoryStats` Pixi component

`client/src/game/VictoryStats.ts` — painel 480×440 centrado com:
- Title "RUN COMPLETE" gold com stroke preto
- Body multi-line: time formatted m:ss, damage dealt/taken, deaths,
  kill breakdown por mob, buffs picked
- Hint "press any key to start a new run" no fundo

Border gold com `stroke({ color: 0xfff066, width: 4 })`. Container
visible toggled via show/hide.

### startNewRun()

Reset completo: lives = MAX_LIVES, currentStageIdx = 0, buffs reset,
stats reset, stage destruído + recriado, player teleport, banner mostra
stage 1. victoryStats hide. Funciona pra qualquer key (attack, skills,
dodge, parry, picks, up arrow).

### Game over também reseta stats

Game over (lives=0) já resetava lives/buffs/stage. Adicionado:
`runStats = makeStats()`. Não é uma vitória, então não mostra
VictoryStats. Player começa fresh.

## Próximas sub-fases

### 4.E — Server-side run records

Salvar runStats no servidor após victory (POST /api/runs com payload).
Stretch: leaderboard global por tempo / damage / deaths por stage count.

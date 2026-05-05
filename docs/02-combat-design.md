# 02 — Combat Design (Phase 2)

Decisões e tuning do sistema de combate. Phase 2 é grande, então fatiamos em
sub-fases (2.A, 2.B, ...) com playtest entre cada.

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **2.A** | Combo Z básico (3 hits encadeáveis) com hitbox visual e timing window | implementado |
| **2.B** | Boneco-alvo + dano + knockback + popup de dano + hit spark | implementado |
| **2.C** | Skills S1/S2/S3 com custo de MP | implementado |
| **2.D** | DashAtk (ground dash + Z) + JumpAtk (Z no ar) | implementado |
| **2.D.2** | GROUND_DOWN_DASH (slam vindo do air dash) | pendente |
| **2.E** | Dodge (iframes) + colisão player↔mob | implementado |
| **2.E.2** | Dodge bar (3 segments com refill) substituindo cooldown único | pendente |
| **2.F** | Parry (timing window + reflect) | pendente |

## Por que primitivas (não sprites) na Phase 2

Sprites entram apenas na Phase 7. Para combate, primitivas (retângulos coloridos +
texto) são preferíveis durante o protótipo:

1. **Tuning rápido**: alterar duração de hitbox, tamanho da swing, frame-data —
   tudo via números no spec, sem re-export de animação.
2. **Hitbox debugging**: o retângulo translúcido vermelho que aparece DURANTE
   frames ativos é literalmente a hitbox do golpe. Perfeito para ver
   exatamente o que estamos calibrando.
3. **Sem comprometer com timing antes de validar a mecânica**: animar um swing
   de 12 frames e descobrir depois que o combo precisa de 8 = retrabalho.

A regra é: comprometer com sprite quando o frame-data estiver tunado. Não antes.

## Sub-fase 2.A — Combo Z

### Estrutura de dados

`comboZ` em `client/src/data/elesis.ts` é um array de 3 objetos, um por hit:

```ts
{ duration, active: [start, end], nextWindow: [start, end] | null, hitbox: { cx, y, w, h } }
```

- `duration` — tempo total do hit em ms. Após esse tempo, retorna a Idle (se não
  encadeado).
- `active` — janela em ms onde a hitbox está "ligada". Antes de active[0]:
  startup (preparando o golpe). Depois de active[1]: recovery (reset).
- `nextWindow` — janela em ms onde um novo Z press encadeia para o próximo hit.
  `null` no Attack3 = finisher, sem encadeamento.
- `hitbox` — geometria do golpe em coordenadas locais do player:
  - `cx` = offset do centro do player na direção do facing (px)
  - `y` = top edge da hitbox (px do topo do player)
  - `w`, `h` = largura e altura

### Frame data atual

| Hit | duration | active | nextWindow | vxPush | hitbox (cx, y, w, h) |
|---|---|---|---|---|---|
| Attack1 | 280ms | 80–180ms | 120–280ms | 90 px/s | (28, 18, 36, 28) |
| Attack2 | 320ms | 100–220ms | 160–320ms | 130 px/s | (30, 14, 42, 34) |
| Attack3 | 420ms | 140–280ms | — | 240 px/s | (32, 8, 52, 44) |

`vxPush` aplicado durante a janela `active` do hit (player desliza pra frente
no momento do golpe). Fora do active, vx zera. Avanço por hit:
~9 / 16 / 34 px (acompanha o knockback do dummy: 11 / 16 / 59 px),
mantendo o alvo dentro do alcance da próxima fase do combo sem precisar
correr atrás.

A janela de chain começa um pouco depois do active e vai até o final do hit.
Isso permite encadeamento mesmo durante o recovery, mantendo o combo fluido.

### Regras

- Z só dispara Attack1 a partir de `Idle/Walk/Run` (chão, sem ataque). Air attack
  é Phase 2.D.
- `tickAttack` zera `vx` a cada frame — player travado horizontalmente durante
  o golpe. Sem deslize.
- Facing trava durante o ataque: o player não vira mid-swing mesmo se segurar
  direção oposta.
- `setState` reseta `stateTimeMs`, então cada hit começa contagem do zero quando
  encadeado.
- Se Z é pressionado FORA da `nextWindow`, o input é ignorado (não há buffer
  para combo — pra evitar misclick virar combo automático).

### Estados

`PlayerState.Attack1/2/3` adicionados a `types.ts`. Cores diferenciadas no
`STATE_COLOR` (laranja → vermelho-alaranjado → vermelho-rosa) para distinguir
visualmente o ponto do combo no debug HUD.

### Por que NÃO bufferar Z fora da nextWindow

Considerei aceitar Z press antes de active[0] e armazenar para encadear assim que
nextWindow abrir. Decidi por NÃO fazer isso na primeira iteração porque:
- Misclick (Z duplo rápido por engano) viraria combo de 2 hits sem querer.
- O feel do combo GC original é "ritmo" — apertar Z no timing certo é parte
  do feedback. Buffering remove esse skill expression.

Pode reconsiderar depois de playtest se sentir que está exigente demais.

## Roadmap próximos passos

### Sub-fase 2.B (implementada)

Estrutura entregue:

- `client/src/game/TargetDummy.ts` — boneco com hurtbox AABB, HP, knockback
  decay, hit-flash visual, respawn automático após 2s no ponto original
- `client/src/game/HitFx.ts` — gerenciador de popups de dano (Text que sobe e
  esmaece em 600ms) e hit sparks (círculo amarelo que cresce e esmaece em 140ms)
- `Player.getActiveHit()` — expõe ActiveHit ({ bbox, damage, knockback,
  attackId, facing }) ou null se não há hitbox ativa neste frame
- `main.ts` — main loop checa `rectsOverlap` entre player hitbox e cada hurtbox
  de boneco, dispara `receiveHit` + popup + spark se aceito

Damage por hit do combo Z: 8 / 12 / 22 (combo completo = 42, mata um boneco em
~3 combos). Knockback: 180 / 220 / 420 px/s, decai por `KNOCKBACK_FRICTION =
1500 px/s²` no boneco (≈300ms até parar com knockback do finisher).

**Dedup por attackId**: cada chamada de `startAttack` incrementa
`Player.currentAttackId`. O boneco mantém `Set<attackId>` dos golpes que já
recebeu, então a mesma swing não causa dano múltiplo mesmo se a hitbox ficar
ativa por vários frames sobrepondo a hurtbox. Cada novo hit do combo (chain)
gera um novo attackId, então o boneco pode ser atingido pelos 3 hits da
sequência.

**Hitlag não implementado** — fica pra Phase 5 (polish). Adicionar agora geraria
ruído no tuning de timing window do combo.

### Sub-fase 2.C (implementada)

Estrutura entregue:

- Inputs: A = S1, S = S2, D = S3 (`KeyA/S/D` em `Input.ts`). Setas continuam
  reservadas para movimento; WASD livre para skills.
- Estados novos: `Skill1/2/3`, cores azul/ciano para diferenciar do combo
  vermelho-laranja
- MP system: `maxMp: 100`, regen passivo `mpRegenPerSec: 6`, on-hit reward
  `mpPerHit: 4` (chamado em `main.ts` após hit aceito). MP exibido no HUD text
- `skills.{s1,s2,s3}` em `elesis.ts` com formato `{ duration, mpCost, hits[] }`,
  onde `hits` é array de `HitPhase` (active window, damage, knockback, hitbox)
- `Player.computeActiveHit()` refatorada — escaneia a lista de hits do estado
  atual, identifica fase ativa, incrementa `currentAttackId` quando a fase
  muda. Cacheada em `this.activeHit`, exposta via `getActiveHit()`. Combo Z
  e skills usam o mesmo pipeline (combo é só "lista de 1 hit")
- `tickSkill` zera vx, espera `duration`, retorna a Idle
- Skills ground-only por enquanto (air skills no 2.D)

### Frame data das skills

| Skill | Tecla | MP | Duration | Hits |
|---|---|---|---|---|
| S1 | A | 25 | 480ms | 1× active 140-280ms, dmg 32, kb 280, hitbox (cx 36, y 10, w 60, h 48) |
| S2 | S | 50 | 750ms | 3 hits @ 140-220 (dmg 12), 380-460 (16), 580-680 (24) |
| S3 | D | 80 | 1000ms | 1× active 280-600ms, dmg 60, kb 480, AoE cx=0 (centrada) w 160 h 100 |

### Por que `computeActiveHit` (não `startAttack`) incrementa `attackId`

Antes (2.A/B): `startAttack` incrementava `currentAttackId` na transição de
estado, funcionando para combo Z (cada hit é seu próprio estado).

Problema das skills multi-hit: S2 tem 3 hit phases dentro do MESMO estado
`Skill2`. Sem incremento entre fases, o boneco dedupa via `attackId` e só toma
dano da primeira fase.

Solução: detectar transições de hit phase no `computeActiveHit` (executado no
fim do `update`). Quando a fase ativa muda (`-1 → 0`, `0 → -1`, `-1 → 1`...),
incrementa attackId. Cada fase ativa ganha seu próprio ID.

Isso unifica combo Z (1 fase por estado, mas estado muda a cada chain) e skills
(múltiplas fases por estado). Mesma lógica.

### Sub-fase 2.D (parcialmente implementada)

Z agora funciona em qualquer estado de movimento. Z dispatch:

| Estado de origem | Comportamento |
|---|---|
| Idle / Walk / Run | Attack1 (combo). Em Run, vx zera no tickAttack — a corrida para no momento do golpe. |
| Dash (ground) | DashAtk (cancela dash) |
| JumpRise / Fall | JumpAtk (1× por ciclo aéreo) |
| DoubleJump | JumpAtk (1× por ciclo aéreo, compartilhado com primeiro pulo) |
| AirDash | JumpAtk (cancela o dash; clamp de vx pra walkSpeed faz o slide quebrar) |
| Land | (ignorado — recovery é breve) |
| Skill1/2/3 | (ignorado — skill é committed) |
| Attack1/2/3 | tickAttack handle (combo chain dentro da nextWindow) |
| DashAtk / JumpAtk | (ignorado — committed) |

#### DashAtk

- `vxInitial: 700` no momento do start (mesma velocidade do ground dash)
- Decai por `groundFriction: 4000 px/s²` durante o ataque → para em ~175ms
- Active hitbox `[60, 220]` (cobre o slide), duration total 380ms
- Damage 18, knockback 240, hitbox (cx 38, y 14, w 64, h 36) — alongada e
  forward-reaching
- Termina em Idle; tickGround volta a Walk/Run conforme input no próximo
  frame, então direção segurada → Run sem fricção visível

#### JumpAtk

- Active `[60, 220]`, duration 320ms
- Damage 14, knockback 200, hitbox (cx 30, y 22, w 50, h 50) — desce um pouco
  pra atingir alvos no chão se o player estiver caindo perto deles
- Sem air drift durante o ataque (vx preservado, sem input)
- Gravidade continua normal
- **Commits todas as ações aéreas**: `startJumpAtk()` marca `airAtkUsed = true`,
  `airDashUsed = true`, `jumpsUsed = 2`. Resultado: depois do JumpAtk (mesmo
  já em estado Fall), o jogador NÃO pode fazer air dash, atacar de novo, nem
  double jump. Fica preso na descida até pousar — mesma "penalidade total"
  que o DoubleJump tem. Tudo reseta em `onLand()`.
- Se aterrissa durante o ataque, ground collision → `onLand()` → state Land
  automaticamente. JumpAtk não bloqueia esse pipeline.
- Após duration, transita pra Fall

#### Decisão: DashAtk só do Dash, não do Run

Iter inicial 2.D: Run + Z disparava DashAtk. Playtest descartou — Run + Z deve
ser combo Attack1 normal. O `tickAttack` zera vx por frame, então o player
para visualmente no momento do golpe (a corrida "interrompe pro combo"). É o
fluxo natural quando o jogador quer atacar um inimigo parado durante o trajeto.

DashAtk continua disponível via Ground Dash + Z (double-tap → Z) — exige
intenção explícita, mantém skill expression.

#### Penalidade de momentum em ações aéreas

Iter inicial 2.D: JumpAtk e DoubleJump preservavam vx integral. Resultado:
chain dash + air dash + double-jump (ou + jump-atk) carregava 630 px/s
horizontal pro pulo seguinte, dando uma sensação de "deslize" exagerado.

Iter ajustada: `clampVxToWalkSpeed()` aplicada em `startJumpAtk()` e
`startDoubleJump()`. Se `|vx| > walkSpeed`, clampa pra ±270 (walk speed).
Não zera (vy continua intacto, drift horizontal continua), só reduz pra um
valor "natural" de movimento aéreo. Se `|vx|` já é ≤ walkSpeed, nada muda.

Aplicar em DoubleJump cobre o caso "air dash → ↑ pra double jump"; aplicar
em JumpAtk cobre "running jump → Z mid-air". Ambos sentiam-se buffados demais.

### Sub-fase 2.D.2 (pendente)

- GROUND_DOWN_DASH: ↓ durante air dash atualmente faz drop com vy boost. Ideia
  pra slam: se Z+↓ durante air dash → entra em estado AirSlam com hitbox forte
  e vy alto, gera AoE no impacto com o chão.
- Talvez Phase 2.E (dodge) seja prioridade maior antes do slam.

### Sub-fase 2.E (implementada)

#### Colisão player ↔ mob

- `Player.aabb()` retorna `{ x, y, w, h }` do bounding box do jogador
- `resolvePlayerVsBox` em `main.ts` faz separação AABB padrão: calcula overlap
  em cada eixo, empurra o jogador no eixo de menor penetração e zera o
  componente da velocidade no sentido da colisão
- Loop em `main.ts` aplica colisão contra todos os bonecos vivos depois do
  `player.update()`
- **Pulado durante iframes**: se `player.isInvincible()`, o loop de colisão
  é skipado — jogador atravessa o mob durante a janela de iframes do dodge

#### Dodge (two-stage: stand → roll)

Trigger: tecla **Alt** (ou ⌥ no Mac). `AltLeft` e `AltRight` mapeados pra
input `'dodge'`. Pode ser disparado de `Idle/Walk/Run` ou de `Dash` ground
(cancela o dash em standing dodge).

##### Estágio 1: DodgeStand

- Aperta Alt → entra em `DodgeStand` imediatamente. Player fica parado
  (vx = vy = 0), facing NÃO trava (dá pra olhar pros lados pra escolher onde
  rolar)
- Duration `360ms`. Durante esse tempo, double-tap em ← ou → triggera
  o estágio 2 (DodgeRoll naquela direção)
- Se nenhum double-tap durante a janela, retorna a Idle e seta cooldown 250ms
- Cost (futuro): X de barra de dodge

##### Estágio 2: DodgeRoll

- Triggered pelo double-tap durante DodgeStand. `consumeDoubleTap` retorna
  ±1 (direção do tap)
- `vx = dir * dodgeRollSpeed (500)`, facing trava pra direção do roll
- Duration `280ms`. Não pode ser cancelado, modificado nem invertido
- Após terminar → Idle, com cooldown 500ms (~2× do stand) e o player livre
  pra atacar/skill/movimentar imediatamente
- Cost (futuro): adicional 1-2X (total 2-3X do stand)

##### Pass-through total durante dodge

- `Player.isInvincible()` agora retorna true enquanto em `DodgeStand` OU
  `DodgeRoll` (estado inteiro, sem janela startup/recovery). `main.ts` skipa
  o `resolvePlayerVsBox` quando invincible, então o player atravessa qualquer
  mob durante o dodge inteiro — incluindo standing colado num mob (fix do
  bug onde a iframe-window restrita travava a separação AABB)
- Body alpha 0.4 durante iframes (renderizado igual antes)

##### Por que two-stage

- **Standing como parry-de-dodge**: input rápido pra "iframe defensivo
  estacionário". Útil pra esquivar de hit no lugar sem comprometer posição
- **Roll como reposicionamento**: extensão da decisão. Player paga mais barra
  pra mover, mas ganha distância e sai vivo do outro lado
- **Roll committed**: depois que entra no roll, fica preso até o fim. Isso
  força o jogador a decidir o que fará DEPOIS antes de iniciar (próximo dodge,
  ataque, skill, etc), o que é uma decisão skill-expressive em situações
  apertadas

### Sub-fase 2.E.2 (pendente)

- Dodge bar com 3 segments visíveis no HUD
- Refill: 1 segment a cada 1.5s? Tunar com playtest
- Dodge consome 1 segment, falha silencioso quando vazio

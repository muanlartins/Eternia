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
| **2.E.2** | Dodge bar (3 segments com refill) substituindo cooldown único | implementado |
| **2.F** | Parry (timing window + reflect → stun no mob) | implementado |
| **2.F.2** | Parry damage buff no mob stunado | implementado |
| **2.G** | Skills usáveis no ar + ground dash + skill input buffer | implementado |
| **2.G.2** | **Reverted**: skills voltam a ser ground-only (air skills cancelados por design) | implementado |
| **2.H** | Hold-Z charging (GC-style MP block tiers) + cooldown apenas no direct cast | implementado |
| **2.H.2** | Charging não-bloqueante (movimento livre) + cancel via jump-release + visual contínuo | implementado |
| **2.H.3** | Charging começa no Z press (qualquer estado) + 1.5x slower thresholds | implementado |
| **2.H.4** | Charge durante skills + skill override + isHeld trigger + force state reset | implementado |
| **2.H.5** | MP/charge 1:1 (75/150/225ms equal segments) + counter on charge-hit | implementado |
| **2.H.6** | Min-hold deadzone (250ms) + cursor capped at MP + knockdown visual on counter | implementado |
| **2.H.7** | Counter explicit countdown (5500ms) + parry window 220ms + parry cd 400ms | implementado |

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

### Sub-fase 2.E.2 (implementada)

Dodge bar substitui completamente os cooldowns de dodge. Player tem
`dodgeBar: number` (0–3) que regenera 0.7/s (~1.4s por segment). HUD mostra
o estado com `[█·]` characters (preenchidos vs vazios).

**Custos:**
- DodgeStand: 1 segment
- DodgeRoll: +1 segment (total 2 do bar pra fazer stand→roll completo)

Aperta Alt sem ter 1 segment → input ignorado silenciosamente. Estando em
DodgeStand, double-tap direção sem ter 1 segment → fica no stand normalmente,
não rola.

Bar reseta full no respawn do player.

### Sub-fase 2.F (implementada)

#### Parry — defesa por timing

Tecla **Space**. Trigger só de Idle/Walk/Run (não cancela combo, skill nem
dodge). Dispara estado `Parry`:

| Janela | Tempo (ms) | Comportamento |
|---|---|---|
| Startup | 0–30 | vulnerável (player ainda não levantou a guarda) |
| **Active** | **30–180** | **se receber hit do mob, parry conecta** |
| Recovery | 180–360 | vulnerável (guarda baixou) |
| Cooldown | +600 | bloqueia novo parry direto |

Total duration 360ms, active window de 150ms. Punível se errado, recompensa
alta se acerta — perfect skill expression.

#### Como conecta

`Player.isParryActive()` retorna true só se `state === Parry` E
`stateTimeMs ∈ [30, 180]`. Em `main.ts`, no loop de mob attack vs player:

```ts
if (player.isParryActive()) {
  mob.parried(-mobHit.facing * 240);  // small knockback
  // 3 sparks for visual emphasis
} else if (!player.isInvincible()) {
  player.takeDamage(...);
}
```

#### Mob.parried()

Novo método: nenhum dano ao mob, mas seta `hurtDurationMs = parriedStunMs`
(900ms vs 280ms do hurt normal) e estado Hurt. O mob fica stunado mais
de 3× o tempo, dando ao player uma janela enorme pra encadear combo Z→Z→Z
ou skill com dano máximo.

Trade-off intencional: parry NÃO causa dano direto, mas ABRE a janela pra
todo o dano que o player conseguir empilhar. Dodge avoid + counter atinge
o mesmo objetivo, mas com risco mais alto pq exige reposicionamento.

#### Dedicated `hurtDurationMs` no Mob

Antes: `tickHurt` checava `stateTimeMs >= spec.hurtStunMs` direto. Agora
um campo runtime `hurtDurationMs` é setado em `receiveHit` (= spec.hurtStunMs)
ou em `parried` (= spec.parriedStunMs). Permite stun customizado por
contexto sem multiplicar estados.

#### Por que parry NÃO dá iframes

Parry é defesa por timing. Se você errou o timing, **deve** levar dano —
isso é o que ensina o jogador a respeitar telegraphs. Iframes "consolation"
removeria o risk side da equação.

Único caso em que parry "vira" iframe: se acertar o timing, a hitbox do
mob é absorvida (mob.parried interrompe Active state via setState(Hurt)),
então o hit não conecta de novo durante esse swing.

#### 2.F.2 — Parry damage buff

Iter inicial 2.F: parry stunava 900ms mas dano normal. Playtest concluiu
que faltava recompensa real — dodge era só "evite e siga o jogo", parry
era "evite, gaste mais skill, mesmo retorno".

Iter ajustada: mob ganha flag `parriedBuff = true` ao receber parry. Enquanto
o flag estiver ativo (= durante todo o estado Hurt induzido por parry), todo
hit recebido aplica `damage × parriedDamageMultiplier (1.7×)`. Visual: stroke
dourado mais grosso ao redor do mob enquanto stunado.

`Mob.receiveHit` agora retorna `{ applied, bonus } | null` em vez de
boolean. `main.ts` usa `applied` no popup (mostra o número real causado) e
spawna sparks extras ao redor se `bonus`. Combo Z→Z→Z normal vale 8+12+22 =
42; durante parry-stun vale 14+20+37 = 71. Skills idem (S3 vai de 60 → 102).

`parriedBuff` reseta quando mob sai do estado Hurt (em `setState`), e no
respawn. Não persiste entre Hurt-via-parry e Hurt-normal subsequente.

Trade-off agora calibrado:
- Dodge: evita dano, mantém combo, baixo skill ceiling (timing genérico)
- Parry: gasta mais skill (timing exato no telegraph), mas recompensa com
  damage stack que pode encerrar o engagement

## Sub-fase 2.G — Skills disponíveis em mais estados + input buffer

### Estados onde skill pode ser invocada

| Estado | Antes | Depois |
|---|---|---|
| Idle / Walk / Run | ✓ | ✓ |
| Ground Dash | ✗ | ✓ (cancela dash, vira skill) |
| JumpRise / Fall / DoubleJump | ✗ | ✓ (hover durante skill, depois Fall) |
| AirDash | ✗ | ✓ (cancela air dash, hover) |
| Parry / Dodge / Hurt | ✗ | ✗ (estados defensivos, mas buffer ativo) |
| Attack 1/2/3 | ✗ | ✗ (compromisso ofensivo, sem cancel pra skill) |

### Skill no ar = hover

`tickSkill` agora seta `vy=0` (não só `vx=0`). Player paira durante toda a
duração da skill independente de altura. Após `stateTimeMs >= skill.duration`:
- Se `onGround`: → Idle
- Se !onGround: → Fall (que aplica gravidade no próximo tick)

Cinematicamente: você dá ground dash, pula, double jump, e usa S3 no apex
da altura — a skill executa congelada no ar (efeito "anime hover"), depois
você cai.

### Input buffer (skillBufferMs = 400ms)

Adicionado em `Player.update`:

```ts
this.skillBufferMs = max(0, this.skillBufferMs - dtMs);
for (let i = 0; i < SKILL_KEYS.length; i++) {
  if (input.justPressed(SKILL_KEYS[i]!)) {
    this.skillBufferIdx = i;
    this.skillBufferMs = spec.skillBufferMs;
  }
}
```

Cada estado "permissivo" (tickGround, tickDash, tickFirstJumpAir, etc.)
chama `consumeSkillBuffer()` no início — se buffer válido, fire skill +
clear. Se startSkill falhar (no MP), buffer também é limpo (não retry).

Cobre cenário: pressionar S durante parry (estado defensivo, ignora
input direto). Parry dura 360ms, buffer dura 400ms — buffer sobrevive
até parry terminar. Próximo tick em Idle → tickGround → consumeSkillBuffer
→ S2 dispara.

### Cancel skill com parry/dodge: só ground

`tickSkill` agora só roda `tryDefensiveCancel` se `this.onGround`. Skills
no ar comprometem (igual jumpAtk). Evita estados absurdos como "air parry"
ou "air dodge roll".

## Sub-fase 2.H — Hold-Z charging (GC heritage)

### Mecânica

GC original usava blocos de MP (3 segments) e o "hold attack" enchia através
desses blocos visualmente. Replicado com timing fixo (não MP-flow):

| Hold time | Tier | Skill ao release | Custo MP |
|---|---|---|---|
| 0–350ms | 0 | (nada) | — |
| 350–650ms | 1 | S1 | 25 |
| 650–950ms | 2 | S2 | 50 |
| 950ms+ | 3 | S3 | 80 |

`Player.releaseCharge()` calcula tier baseado em `stateTimeMs` E em
`mp >= cost`. Player só "atinge" o tier se MP afford. Release com tier=−1
(MP insuficiente OU < 350ms) → volta pra Idle (charge wasted).

### Entrada no Charging state

Apenas via Attack1 (combo idx 0):

```ts
if (this.stateTimeMs >= spec.duration) {
  if (comboIdx === 0 && input.isHeld('attack') && this.onGround) {
    this.setState(PlayerState.Charging);
  } else {
    this.setState(PlayerState.Idle);
  }
}
```

Player que tap Z + Z + Z faz combo normal. Player que pressiona Z e segura
faz Attack1 (280ms) → enters Charging. Combo Z2/Z3 sempre vai pra Idle no
fim — só Attack1 transiciona pra Charge.

Charging é **ground-only** — manter o Z held no ar não vira charge (muito
caos). Air Z continua sendo JumpAtk via `tickFirstJumpAir`.

### Direct cast vs Hold-cast

`startSkill(idx)` (direct A/S/D press):
- Checa `mp >= cost` E `skillCooldowns[idx] <= 0`
- Set `skillCooldowns[idx] = cooldownMs` ao caster

`castSkillNoCooldown(idx)` (release de Charging):
- Só checa MP
- NÃO seta cooldown
- NÃO checa cooldown — pode caster mesmo durante cooldown ativo

Cooldowns: S1=5s, S2=10s, S3=16s.

**Trade-off real**:
- Direct: ~50ms cast, mas locked em cooldown
- Hold-Z: 280ms (Attack1) + 350-950ms (charge) = 630-1230ms cast, mas
  no-cooldown (apenas MP gate). Player pode spam-cast S3 a cada 1.2s
  contanto que MP afford.

Decisão tática: emergência → direct (consume cooldown), tempo livre →
hold-Z (preserva cooldown pra emergência futura).

### Visual

`chargeIndicator` (Graphics) acima da cabeça do player durante Charging.
3 blocos 12×4px com gap 2px. Cada bloco:
- Lit (alpha 0.95 + outline branco): `t >= tierMs && mp >= cost`
- Reached but unaffordable (alpha 0.5, brown): `t >= tierMs && mp < cost`
- Not reached (alpha 0.5, dark): `t < tierMs`

Color tier: yellow (T1), orange (T2), red (T3).

HUD ganha `cd: A✓ S5.2 D12.0` mostrando cooldown remaining por skill
(seg, ou ✓ se ready).

### Reset de cooldowns

`respawn()` e `resetBuffs()` zeram `skillCooldowns = [0, 0, 0]`. Lives
preservadas: cooldowns só resetam na morte (não através de transitions
de stage).

## Sub-fase 2.H.2 — Charging livre + cancel por jump

### Charging deixa de ser PlayerState

Antes (2.H): `Charging` era um estado que bloqueava movimento (vx=0, vy=0).
Player ficava parado conjurando. Spec error — **GC original permite movimento
durante charge**.

Agora: charging é um **modificador paralelo** (campos `chargingActive: boolean`,
`chargingMs: number`), não state. Player continua em Idle/Walk/Run/JumpRise/etc
enquanto carrega. `PlayerState.Charging` foi removido.

### Estados onde charging continua válido

`chargingAllowed()`: Idle, Walk, Run, JumpRise, Fall, DoubleJump, AirDash,
Land, Dash. Estados ofensivos/defensivos (Attack, Skill, DodgeStand,
DodgeRoll, Parry, Hurt, Dead, DashAtk, JumpAtk) cancelam o charge.

### Lógica em `update()` pós-state-tick

```ts
if (this.chargingActive) {
  if (!this.chargingAllowed()) {
    this.cancelCharge();           // estado bloqueia
  } else if (input.justReleased('attack')) {
    if (this.onGround) {
      this.releaseChargeAndCast();  // cast tier mais alto que afford
    } else {
      this.cancelCharge();           // air release = cancel
    }
  } else {
    this.chargingMs += dtMs;        // segue carregando
  }
}
```

`chargingActive` é setado em `tickAttack` no fim de Attack1 (apenas) com Z
held + onGround. Player pode então sair andando/correndo/pulando enquanto
o timer aumenta. Combo Z2/Z3 não inicia charge (player que comita combo
abandona o charge).

### Cancel via jump-release (skill expression)

Player carrega até quase tier 3 mas percebe que só queria S1. Pula (state
→ JumpRise, charge continua), depois solta Z no ar → `cancelCharge()`,
sem cast, sem MP gasto.

Trade: queima ~700ms de tempo de charge + jump cooldown = punição leve por
"errar". Suficiente pra desencorajar charge-spam mas barato o bastante pra
não frustrar.

### Visual: bar contínua com tick marks

Antes: 3 blocos discretos acendendo. Não comunica progresso entre tiers.

Agora: barra única 50×5px acima da cabeça, fill contínuo de 0% a 100% ao
longo de 950ms (chargeTier3Ms). Cor da fill muda nos thresholds:
- 0–349ms: cinza muted (`0x666677`)
- 350–649ms: amarelo (`0xffe066`) — S1 disponível
- 650–949ms: laranja (`0xffaa44`) — S2 disponível
- 950ms+: vermelho (`0xff5544`) — S3 disponível

Tick marks brancos verticais nos pontos de tier1Ms/tier2Ms (tier3 = end).
Player vê continuamente quanto falta pro próximo threshold.

### 2.G.2 — Air skills revertidas

Spec error: 2.G permitia skills no ar. User confirmou que skills devem ser
ground-only (matching GC). Removido `consumeSkillBuffer()` de
`tickFirstJumpAir`, `tickDoubleJump`, `tickAirDash`. Buffer de A/S/D press
no ar ainda existe — quando player aterrissa em <400ms (skillBufferMs),
skill dispara em tickGround. Press no ar continua "lembrado" mas nunca
casts mid-air.

`tickSkill` simplificado: removida a lógica de transição pra Fall pós-skill
(não acessível agora que skills só rodam onGround).

## Sub-fase 2.H.3 — Charging desde o press, qualquer ataque

### Trigger no press, não no fim de Attack1

Antes (2.H.2): charge só ativava após Attack1 completar (280ms wasted).
User feedback: charge deve acumular **desde o instante do Z press**,
independente do ataque que vai disparar (Attack1, DashAtk, JumpAtk).

Implementação em `update()` após o skill buffer:

```ts
if (input.justPressed('attack') && !this.chargingActive && this.chargingAllowed()) {
  this.chargingActive = true;
  this.chargingMs = 0;
}
```

Disparo é **antes do state tick** (que vai transicionar pra Attack1/DashAtk/etc).
Charge inicia no estado "incoming". Como Attack1/2/3, DashAtk e JumpAtk agora
estão em `chargingAllowed`, o charge persiste durante o swing.

### chargingAllowed expandido

Agora inclui também: `Attack1`, `Attack2`, `Attack3`, `DashAtk`, `JumpAtk`.
Player carrega enquanto:
- Walk/Run + Z (Attack1 + charge)
- Ground dash + Z (DashAtk + charge)
- Air dash/jump + Z (JumpAtk + charge)
- Tudo isso enquanto a barra enche

Estados que cancelam continuam: Skill1/2/3, DodgeStand/Roll, Parry, Hurt, Dead.

### Tap-combo não acumula

Cada Z press faz `chargingActive=true, chargingMs=0`. Cada release faz
`chargingActive=false` (cast attempt com tier=-1 se chargingMs<525). Tap
rapidamente Z Z Z para combo: cada tap cria/limpa charge breve, nunca
acumula tier suficiente.

Hold contínuo: charge começa no primeiro press, persiste através de
Attack1 → Idle → Walk → ... até release.

### Slowdown 1.5x

Tiers reescalados: 350/650/950 → **525/975/1425**ms. Charge enche mais
devagar pra dar tempo de parar antes da skill maior se quiser uma menor.
Total para S3: 1.4s desde o press (era 1.23s pelo design anterior).

### Removido: trigger no fim de Attack1

O bloco em `tickAttack` que setava `chargingActive` no fim de Attack1
foi removido. Charge agora vem só do trigger no press.

## Sub-fase 2.H.4 — Charge durante skills + skill override

### Charge persiste durante Skill1/2/3

`chargingAllowed` agora inclui Skill1, Skill2, Skill3. Player pode segurar Z
durante uma skill ativa e a barra continua acumulando. Permite encadear:

1. Player cast S1 (480ms duração) via direct A.
2. Durante S1, segura Z (charge restart from 0).
3. S1 termina → Idle (charge ainda activa).
4. Solta Z em momento que tier1 (525ms) foi atingido → S1 cast novamente.
5. Repete.

Note: tier1 = 525ms vs S1 = 480ms. Player precisa esperar ~45ms em Idle
antes de soltar pra encadear S1. Cadência intencional.

### isHeld em vez de justPressed

Antes: charge iniciava só no `justPressed('attack')` (frame específico do
press).

Depois: `input.isHeld('attack') && !chargingActive && chargingAllowed()`.
Charge inicia em qualquer frame onde Z está held + estado é allowed +
charge ainda não está active.

Implicação: se player estava em Hurt (charge cancelado), recupera pra Idle
ainda segurando Z → charge restart automático. Continuous hold através de
estados temporários re-engaja sem precisar release/re-press.

### Skill override via `tickSkill`

`tickSkill` agora chama `consumeSkillBuffer()` antes do resto da lógica.
Player que aperta A/S/D durante uma skill em curso:
- skillBuffer set por A/S/D press
- tickSkill: consumeSkillBuffer → startSkill(idx) → if cooldown OK,
  override (mesma skill bloqueada por cooldown próprio; outras skills
  passam se cd=0)
- State force-reset (Skill_old → Skill_new ou mesmo Skill_old reseta
  stateTimeMs e lastActiveHitIdx)

`startSkill` e `releaseChargeAndCast` agora **forçam** state reset (não
só `setState`, que não fazia nada se state já era o mesmo). Isso é
crítico pro chain S1→S1 funcionar: `state = newState; stateTimeMs = 0;
lastActiveHitIdx = -1`.

### Cooldown gate continua

Direct cast continua respeitando cooldown:
- S1 cast → S1 cooldown 5s → próximo direct A bloqueado por 5s
- Mas hold-Z casts via `releaseChargeAndCast` (no-cooldown path)
  funcionam normalmente, permitindo chain de S1's

Diferentes skills sem cd ativo → direct override funciona (e.g., S1 em
cast → tap D → S3 fires se MP affords e cd=0).

### Charge clears em cast

Toda chamada de `startSkill` ou `releaseChargeAndCast` zera
`chargingActive` e `chargingMs`. Player precisa re-press Z (release +
press) pra começar nova charge. Mas com `isHeld` trigger e cleared
charge: se Z continuar held + state em allowed list, charge restart
automaticamente. Continuous hold = continuous charge cycle.

## Sub-fase 2.H.5 — MP/charge 1:1 + counter on charge-hit

### MP costs equais (3 segments + 1 reservado pra ult)

S3 cost ajustado de 80 → 75 pra alinhar segmentos da MP bar:
- 0-25: segment 1 (S1, A)
- 25-50: segment 2 (S2, S)
- 50-75: segment 3 (S3, D)
- 75-100: **segment 4 reservado pra ultimate** (futuro — não casteável ainda)

### Charge timings 1:1 com MP

`chargeTier1Ms/Tier2Ms/Tier3Ms` = 475/950/1425ms. Spacing igual de 475ms.
Charge rate = 75 MP / 1425 ms = 52.6 MP/s.

Cursor visual mapping: `cursorMp = (chargingMs / chargeTier3Ms) × s3.mpCost`.
Cursor X position no MP bar: `(cursorMp / maxMp) × barWidth`. Equal spacing
visual entre tiers.

### MP bar acima do player substitui chargeIndicator

Antes: bar dedicada de carga acima da cabeça (50×5px), só visível durante
charging.

Depois: **MP bar permanente** acima da cabeça (50×5px), sempre visível.
- Background azul-escuro com stroke branco
- Fill azul `0x4488ff` proporcional a `mp/maxMp`
- 3 ticks brancos verticais nas posições 25/50/75 (S1/S2/S3 costs)
- Charge cursor (overlay) só aparece quando `chargingActive=true`:
  - Posição = `chargedMp / maxMp` do bar
  - Cor por tier: cinza < amarelo (T1) < laranja (T2) < vermelho (T3)
  - Vertical 3px wide, 1px taller than bar pra visibilidade

HUD MP bar (top-left) recebeu o mesmo charge cursor overlay. Player tem 2
visualizações sincronizadas: uma "encima do personagem" (foco no combate),
outra na HUD (referência periférica).

### Counter mecânica (hit durante charge)

Trigger: `Player.takeDamage` com `chargingActive=true` e `!isInvincible`.

Punições aplicadas:
1. **MP perdida**: `chargedMp = (chargingMs / chargeTier3Ms) × s3.mpCost`
   deduzido de `mp` (capped at 0). Player perde literalmente o MP que
   "carregou".
2. **Cooldowns extended**: cada `skillCooldowns[i] = max(skillCooldowns[i],
   10000)`. Skills off-cooldown viram 10s; skills com cd menor vão pra 10s;
   skills com cd ≥ 10s mantêm o seu.
3. **Stun extendido**: `counterHurtMs = 1500` (vs `hurtStunMs = 380` normal).
   ≈ 3.75× dodge stand. Suficiente pro player pensar antes de carregar
   próximo.
4. **Invulnerabilidade**: Hurt já era invincible. Counter herda — durante
   1.5s o player não pode tomar mais hits, similar a um dodge stand
   extra-longo.

`tickHurt` checa `counterHurtMs` primeiro: se setado, usa esse em vez de
`hurtStunMs`. Limpa `counterHurtMs = 0` ao sair de Hurt.

Player.takeDamage limpa `chargingActive` e `chargingMs` (não importa
counter ou normal). Charge state nunca persiste através de hurt.

### Trade-off

GC's "punish the greedy charger". Player que carrega skill near boss sem
cuidar do telegraph vira presa fácil:
- Joga 50 MP + cooldowns travados + 1.5s stun = ~3-5s perdidos
- vs jogador cauteloso que carrega à distância: zero downside

Alta skill ceiling: posicionamento + leitura de telegraph importam mais
que damage stats.

## Sub-fase 2.H.6 — Deadzone + MP cap + knockdown

### Deadzone de 250ms (chargeMinHoldMs)

Antes: hold trivial de Z (mesmo tap-combo ~50ms) já setava chargingActive,
e qualquer hit triggerava counter. Frustrava combo gameplay.

Agora: `Player.attackHeldMs` tracka quanto Z está continuamente held. Charge
só inicia se `attackHeldMs >= chargeMinHoldMs (250ms)`. Tap rápidos não
chegam a 250ms, então não disparam chargingActive. Combos Z Z Z funcionam
sem risco de counter.

```ts
if (input.isHeld('attack')) {
  this.attackHeldMs += dtMs;
} else {
  this.attackHeldMs = 0;
}

if (
  input.isHeld('attack') &&
  this.attackHeldMs >= this.spec.chargeMinHoldMs &&
  !this.chargingActive &&
  this.chargingAllowed()
) {
  this.chargingActive = true;
  this.chargingMs = 0;
}
```

User intent: "considere que o z só começa a acumular quando passa pelo
menos de meia barra" — meia barra = ~12.5 MP em tempo = 237ms. 250ms
arredondado.

### Charge cursor capped at current MP

Antes: cursor avançava livremente até chargeTier3Ms. Player com pouco MP
via cursor passar do seu fill, sem feedback claro de "não vou conseguir".

Agora: `chargingMs` capped at `(mp / s3.mpCost) * chargeTier3Ms`. Cursor
literalmente para na barra de MP. Player vê "minha mana só dá pra esse
tier".

```ts
const maxByMp = (this.mp / this.spec.skills.s3.mpCost) * this.spec.chargeTier3Ms;
const target = Math.min(this.spec.chargeTier3Ms, this.chargingMs + dtMs);
this.chargingMs = Math.min(target, maxByMp);
```

Side effect: MP regen durante charge faz cursor advance progressivamente.
Hold Z com MP baixo: cursor avança devagar conforme MP regen catches up.

### Knockdown visual

Antes: counter só era visualmente identificável pela duração do stun.
Player podia confundir com hurt normal.

Agora: durante `state === Hurt && counterHurtMs > 0`, body é desenhado
horizontal:
- proneW = `spec.height * 0.85` (largura ≈ altura normal)
- proneH = `spec.width * 0.7` (altura ≈ largura normal)
- proneX = centralizado horizontalmente
- proneY = colado no chão (`spec.height - proneH`)
- Cor `0x664466` (purple acinzentado, dazed)
- Stars overhead: 3-line "swirl" gold acima do body indicando "stunned"

facingMarker hide durante prone. Ao sair de Hurt (`counterHurtMs` zerado em
tickHurt), body volta a desenhar normal upright. "Get up" via state
transition pra Idle. Sem animação interpolada — clip-cut, mas claro.

## Backlog de polish — visual do parry timing

Cada mob tem `telegraphMs` próprio e `activeMs` próprio. Slim 420/160, Racoon
540/200, Boss bite 440/180, charge 540/380, stomp 600/220. O parry tem janela
ativa 30-180ms.

Hoje o `previewMarker` no Mob mostra um pulse genérico (0.06 → 0.24 alpha)
durante o telegraph todo, sem indicar **quando exatamente** o ataque vai
ativar. Resultado observado pelo player: parry de slim precisa ser mais
imediato, parry de boss precisa de delay deliberado — sem cue claro pra
distinguir.

Quando entrarmos em arte (Phase 7), considerar:
- "Click" frame: cor/forma muda nos últimos ~150ms do telegraph (signaling
  active iminente)
- Slow-in/fast-out: pulse não-linear que acelera no fim, criando sensação de
  "quase agora"
- Áudio cue distinto: tick rising em pitch nos últimos frames

Por enquanto, deixar como está — playtest validou que é skill gap legítimo,
mas a curva de aprendizado é mais íngreme do que precisaria com cue melhor.

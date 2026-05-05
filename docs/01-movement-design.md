# 01 — Movement Design (Phase 1)

Decisões de design e tuning do state machine de movimento da Elesis 1ª class. Este
documento captura o porquê dos valores em `client/src/data/elesis.ts` e da lógica em
`client/src/game/Player.ts`. Atualizado a cada iteração de playtest.

## Filosofia

A maior parte da mobilidade do jogo está nos **dashes**, não no walk/run. Isso
diferencia Eternia de plataformers tradicionais onde o run é a forma primária de se
locomover. O walk e run servem para reposicionamento curto e fino; o dash é para
travessar distâncias e iniciar combo de movimento aéreo (chain dash).

## State Machine

```
Idle/Walk/Run ── ↑ ──────► JumpRise ── apex ──► Fall ── ↑ ──► DoubleJump
       │                       │                  │                 │
       │ (double-tap dir)      │ (double-tap)     │ (double-tap)    │
       ▼                       ▼                  ▼                 │
     Dash                   AirDash ◄─────────────                  ▼
       │                       │                                Land
       │                       │                                  │
   ↑ = jump                ↓ = drop                               │
   reverse = decel        reverse = decel                         │
       │                       │                                  ▼
       └──► JumpRise           └──► Fall ───────────► Idle/Walk/Run
```

Estados (cor no debug):
- `Idle` 🔵 / `Walk` 🟢 / `Run` 🟡 — controle horizontal direto, vx instantâneo
- `JumpRise` 🩵 — primeiro pulo subindo (short-hop em release)
- `Fall` 🟣 — caindo do primeiro pulo (mesmo controle aéreo)
- `DoubleJump` 🩷 — segundo pulo, altura fixa (sem short-hop), com air drift
- `Dash` 🔴 — ground dash (~140 unidades em 200ms)
- `AirDash` 🟠 — air dash, 1× por ciclo aéreo
- `Land` ⚪ — recuperação curta ao tocar o solo (60ms)

## Tabela de tuning (Phase 1, iteração 2)

| Constante | Valor | Justificativa |
|---|---|---|
| `walkSpeed` | 280 | Iter1 foi 220 → muito lento. Subiu para 280 para tornar walk útil em reposicionamento. |
| `runSpeed` | 360 | Iter1 foi 420 → discrepante demais com walk. Caiu para 360. Gap walk→run intencionalmente apertado: dashes carregam a mobilidade. |
| `walkToRunHoldMs` | 180 | Hold direção por 180ms para entrar em run. Curto o suficiente para responsividade, longo o suficiente para distinguir intenção de walk e run. |
| `airAcceleration` | 1800 | Air drift suficiente para corrigir trajetória sem virar full-control aéreo. Reaproveitado também como decel reverso no air dash. |
| `groundFriction` | 4000 | Decel ao reverter direção mid-dash. Quase para o dash em ~175ms (vx 700 → 0). |
| `jumpInitialVy` | -680 | Iter1 foi -750 → pico do full jump alto demais comparado ao short hop. Reduziu para -680. |
| `doubleJumpInitialVy` | -620 | Levemente menor que o primeiro pulo. Sempre fixo (sem short-hop) — playtest validou que altura constante do double jump dá um "feel" característico. |
| `gravity` | 2200 | Base. Multiplicada por `fallGravityMultiplier` quando vy ≥ 0 (queda mais "snappy"). |
| `fallGravityMultiplier` | 1.4 | Padrão moderno (Hollow Knight, Celeste). Apex curto, queda rápida. |
| `shortHopMultiplier` | 0.7 | Iter1 foi 0.5 → diferença com full jump grande demais. Subiu para 0.7. Short hop hoje é "quase um full jump curto", não um saltinho miúdo. |
| `dashSpeed` × `dashDurationMs` | 700 × 200ms | Distância ground dash ≈ 140 unidades. Validado no playtest como "muito bom". Não mexer. |
| `dashCooldownMs` | 350 | Curto o suficiente para chain dash no chão; longo o suficiente para não ser spam infinito. |
| `airDashSpeed` × `airDashDurationMs` | 500 × 200ms | Iter1 foi 720 → distância total ~250 (incluindo momentum residual durante a queda) era buff demais comparado ao ground dash. Caiu para 500: distância pelo dash em si ≈ 100, mais ~50-80 de drift residual = total ~150-180. Dentro do alvo do feedback. |
| `coyoteTimeMs` / `jumpBufferMs` | 90 / 90 | Modernization windows. Padrão de plataformers atuais. |
| `landDurationMs` | 60 | Lock muito breve ao aterrissar. Não zera vx (preserva momentum aéreo na transição para walk/run). |

## Regras especiais

### 1. Dash chaining
- **Air dash 1× por ciclo aéreo.** Reset apenas ao tocar o solo. Isso justifica a
  existência do "chain dash" como técnica: ground dash → ↑ pulo → air dash → drop ↓
  para reposicionar rápido.
- **Ground dash → jump out** (`↑` durante o ground dash): cancela o dash
  imediatamente em `startGroundJump()`. `vx` é preservado (não reseta para 0), então
  o pulo herda a velocidade do dash → arco amplo. Isto é o que dá a sensação de
  "dash em diagonal subindo" sem precisar de uma trajetória diagonal literal.
- **Air dash → drop** (`↓` durante o air dash): transiciona para `Fall`. Sem boost
  de velocidade vertical — apenas remove o lock do dash, gravidade natural toma
  conta. Sensação de "dash em diagonal caindo".
- **Reverse-direction decel** (segurar oposto durante dash): aplica decel ao `vx`
  em direção ao oposto. Em `Dash` usa `groundFriction` (decel forte); em `AirDash`
  usa `airAcceleration` (decel mais suave). Não inverte o sinal — só reduz para 0
  ou ao target da direção oposta. Permite curva suave em mid-dash.

### 2. Por que NÃO usar diagonal vy literal no air dash
Iter1 tinha `airDashUpVy: -420` e `airDashDownVy: 520` aplicando vy diretamente quando
`↑` ou `↓` estava segurado durante o air dash. Removido. Razões:
- Faz o dash virar um vetor 2D fixo, não um movimento horizontal modulável.
- Confunde o input model: ↓ "afundava" o personagem ao invés de simplesmente
  cancelar para fall.
- Não combinava com a rule de "1× por ciclo" — diagonal-up dash subia DE NOVO,
  estendendo o ciclo aéreo.

A solução nova reusa as primitivas que já estavam lá (jump out, drop out,
reverse decel) e dá a mesma sensação sem hardcoded diagonal.

### 3. Double jump tem air drift, mas altura fixa
Iter1 travava `vx = 0` no double jump. Playtest: "se você tá num air drift e dá um
segundo pulo, fica preso no mesmo lugar — air drift deve aplicar ao segundo pulo
também."

Iter2: removeu o `vx = 0` do `startDoubleJump()`, e `tickDoubleJump()` agora roda
a mesma lógica de air drift do `tickFirstJumpAir()`. Mantém a altura fixa (no
short-hop multiplier) — playtest validou que essa parte estava boa.

### 4. Land preserva momentum
Iter1 zerava `vx` em `tickLand()` durante os 60ms de recovery. Resultado:
aterrissava de um air dash → freava completamente → reiniciava o walk/run do zero.
Quebra de fluidez.

Iter2: removeu o reset. `vx` carrega o que tinha do ar. Quando `Land` expira e
transita para `Walk` ou `Run`, o tick de ground sobrescreve `vx` para
`ax * speed`, mas durante os 60ms de Land o personagem mantém momentum.

### 5. Facing flipa mid-dash
Removido o guard que travava o facing durante `Dash`/`AirDash`/`DoubleJump`. Hoje
o facing sempre segue input. Quando reverte direção durante o dash, o personagem
visualmente vira; isso é o sinal visual do reverse-direction decel. Útil também
para combate futuro (ataques mid-dash respeitam direção do input, não do dash).

## Histórico de iterações

### Iter 1 (Phase 1 inicial)
- Walk 220, Run 420, JumpVy -750, ShortHop 0.5, AirDashSpeed 720, com
  `airDashUpVy`/`airDashDownVy`. Double jump travava vx. Land zerava vx.
- Playtest concluiu que walk lento demais, run rápido demais, gap pulo curto/longo
  grande demais, double jump trava momentum, land reseta momentum, air dash buff
  demais (~250 unidades vs ~140 do ground), diagonal por vy não era ideal.

### Iter 2 (atual)
- Aplicado feedback completo. Constantes na tabela acima.
- Removidos `airDashUpVy` e `airDashDownVy` (sem diagonal por vy).
- Adicionado `dashDir` para preservar direção original mesmo após facing flipar.
- Adicionado jump-out de ground dash, drop-out de air dash, reverse-decel em ambos.

## Próximos passos para Phase 2 (Combat)

Quando entrar combate, considerar:
- Ataques mid-air devem respeitar direção do **facing** (que segue input), não do
  `dashDir`.
- Air dash que cancela em ataque deve queimar o `airDashUsed` ainda assim — manter
  a regra "1× por ciclo".
- Hit-stun deve forçar entrada em estado `Hurt` que ignora input por X ms.

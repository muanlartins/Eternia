# 02 — Combat Design (Phase 2)

Decisões e tuning do sistema de combate. Phase 2 é grande, então fatiamos em
sub-fases (2.A, 2.B, ...) com playtest entre cada.

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **2.A** | Combo Z básico (3 hits encadeáveis) com hitbox visual e timing window | implementado |
| **2.B** | Boneco-alvo + dano + knockback + popup de dano + hit spark | pendente |
| **2.C** | Skills S1/S2/S3 com custo de MP | pendente |
| **2.D** | DASH_ATK + JUMP_ATK + GROUND_DOWN_DASH | pendente |
| **2.E** | Dodge (barra + iframes) | pendente |
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

| Hit | duration | active | nextWindow | hitbox (cx, y, w, h) |
|---|---|---|---|---|
| Attack1 | 280ms | 80–180ms | 120–280ms | (28, 18, 36, 28) |
| Attack2 | 320ms | 100–220ms | 160–320ms | (30, 14, 42, 34) |
| Attack3 | 420ms | 140–280ms | — | (32, 8, 52, 44) |

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

### Sub-fase 2.B (próxima)

- Boneco-alvo estático: rect marrom no chão, posição fixa
- Hurtbox no boneco (rectangle bounds)
- Detecção de colisão hitbox vs hurtbox durante frames active
- Dano: cada hit do combo tem `damage` no spec
- HP do boneco: barra acima dele, decrementa com cada acerto
- Knockback: aplicar `vx = facing * knockbackForce` no boneco no momento do hit
- Damage popup: Pixi Text spawnado no ponto de impacto, sobe e fade out (~600ms)
- Hit spark: Graphics circle amarelo no ponto de impacto, escala e fade (~120ms)
- Hitlag (opcional): freezar o player por 2-3 frames no momento do hit pra dar
  peso ao acerto. Pode atrasar pra Phase 5 (polish).

### Sub-fase 2.C

- MP bar no HUD
- Skills com input dedicado (X, C, V?)
- Cada skill é uma sequência de actions (similar ao combo mas com cost de MP +
  cooldown + invincibility window opcional)
- Dados das skills do GC original (`actionscript.stg`) servem de base

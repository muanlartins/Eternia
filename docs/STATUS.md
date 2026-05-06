# Eternia — STATUS (live snapshot)

> Atualização: 2026-05-06.
>
> Este doc é o "tablet do estado atual" do projeto. Atualizar a cada phase.
>
> Plano original: `~/repos/grand-chase/docs/eternia-mvp.md` (constituição, imutável).

## Phase status overview

| Phase | Escopo original | Status | Onde está documentado |
|---|---|---|---|
| **0 — Foundation** | Monorepo (client+server+shared), pnpm, Vite, hello-world WS | ✅ done | inicial |
| **1 — Movement** | walk/run/jump/double_jump/dash/dash_jump, camera, parallax | ✅ done | `01-movement-design.md` |
| **2 — Combat** | Combo Z, S1/S2/S3, dash atk, dodge, parry, charge-Z, counter | ✅ done (2.A → 2.I) | `02-combat-design.md` |
| **3 — Mobs/AI** | 5 mob types (slim, racoon, archer, brute, insectivorous boss) + gravity | ✅ done (3.A → 3.G) | `03-mobs-design.md` |
| **4 — Stage flow + buffs** | 4 stages, buff cards, modifiers, run completion, records, mini-map, portal | ✅ gameplay done (4.A → 4.J) | `04-stages-design.md` |
| **5 — Audio + polish** | Hit pause, screen shake, KO flash, damage numbers, SFX synth, HUD redesign, parallax bg | ✅ mostly done; 5.D pending | `05-polish-design.md` |
| **6 — Auth + persistence** | Login, save state per user, server-side records | ⏳ não iniciado | (futuro) |
| **7 — Sprites e arte** | Substituir primitivas por sprites animados (Elesis + mobs + bg) | ⏳ não iniciado | (futuro, ~50-100h) |
| **8 — Tailscale alpha** | Multiplayer co-op via Tailscale | ⏳ não iniciado | (V1.1) |

## O que ainda falta dentro das phases "ativas"

### Phase 4 (apenas server-side)
- 4.K — sync de records pro servidor (depende de Phase 6)

### Phase 5 — Polish
- 5.D — BGM (música de fundo por stage). Phase 5 está ~85% feita; só faltam BGMs.

## Conteúdo atual (snapshot)

| Categoria | Quantidade | Detalhe |
|---|---|---|
| Stages | 4 | forest-1-1 → forest-1-4 (boss) |
| Mob types | 5 | slim, racoon, archer, brute, insectivorous (boss) |
| Buffs (run-pickup) | 15 | 11 common + 4 rare |
| Modifiers (run-start) | 9 | tradeoffs grandes (glass cannon, tank, berserker, etc.) |
| Skills | 3 | S1 (light), S2 (medium), S3 (heavy) — todas com MP cost + cooldown |
| Combat moves | 6 | combo Z (3 hits), dash atk, jump atk, charge Z (counter), parry, dodge |
| Stages w/ records | sim | best time, best damage, fewest deaths, totals — localStorage |

## Sub-phases extras feitas além do plano original

O plano `eternia-mvp.md` é a constituição. Estas são features que apareceram
durante iteração e foram sendo absorvidas:

- **Counter via charge-Z** (Phase 2.H.5 → 2.H.8) — sistema GC-style de cancel
  de mob attack via Z carregado. Não estava no plano; emergiu de playtest.
- **Run modifiers separados de buffs** (Phase 4.G) — escolha no início da
  run, com tradeoff grande. Plano original só tinha buffs.
- **Closed rectangular maps + portal** (Phase 4.H) — plano original era
  scroll horizontal infinito. Mudou para mapas fechados estilo GC.
- **Mini-map em TAB** (Phase 4.H) — mostra progresso de run.
- **Air parry/dodge + spawn invincibility** (Phase 2.I) — quality-of-life.
- **Cinematic phase pause** (Phase 2.I) — congela player durante banners
  de transição.
- **Boss death drama** (Phase 4.J) — phase intermediária entre boss kill e
  victory para a animação de fade do boss completar.

## Próximas etapas — opções

Em ordem de impacto user-visível e custo:

1. **5.D — BGM sintético** (médio escopo) — tocar música ambiente por stage,
   fade in/out entre transições. Tudo com Web Audio API (sem assets). ~3-4h.
   Termina Phase 5.
2. **Multi-phase boss** (médio escopo) — boss entra em Phase 2 abaixo de 50%
   HP com novo padrão de ataque + visual diferente. Faz a luta final sentir
   épica em vez de "mob com mais HP". Não está no plano original mas grande
   game-feel. ~4-6h.
3. **Boss intro + healthbar dedicada** (pequeno escopo) — ao entrar na fase
   4, banner "BOSS: NAME" + barra de HP do boss persistente no topo da tela.
   Reforça presença do boss. ~2-3h.
4. **Novo mob aéreo (Wisp)** (pequeno-médio escopo) — primeiro mob que voa
   (sem gravidade, mecânica nova). Adiciona variedade ao stage 3. ~3-4h.
5. **Phase 6 — Auth + persistence** (grande escopo) — login, server-side
   leaderboard, sync de records. Backend Go já existe parcialmente. ~10-15h.
6. **Stage 5 (novo bioma)** (médio escopo) — sair de Floresta, ir para
   Pântano/Caverna/etc. Mais 2-3 mobs novos + boss novo. ~8-10h.
7. **Phase 7 — Sprites/arte** (gigante) — substitui primitivas. Decisão
   pendente: extrair do GC original vs gerar via SD. ~50-100h.

## Decisões pendentes (não-bloqueantes)

- **Sprite source**: rip do client S1 vs gerar do zero (Phase 7)
- **BGM source**: rip + clear vs gerar com Suno/Udio (Phase 5.D / 7)
- **Run-start lives**: continuar 3? configurar via modifier? (gameplay tuning)
- **Quanto de meta-progression** entre runs (XP, unlocks)? Hades faz, GC não. 
  Plano original: NÃO. Pode mudar em V1.1.

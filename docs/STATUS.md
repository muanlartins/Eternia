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
| **3 — Mobs/AI** | 9 mob types (slim, racoon, archer, brute, wisp, bog-frog, mire-wraith, insectivorous, drowned-king) + gravity + multi-phase boss | ✅ done (3.A → 3.J) | `03-mobs-design.md` |
| **4 — Stage flow + buffs** | 6 stages (forest 1-4 + swamp 1-2), buff cards, modifiers, run completion, records, mini-map, portal | ✅ gameplay done (4.A → 4.M) | `04-stages-design.md` |
| **5 — Audio + polish** | Hit pause, screen shake, KO flash, damage numbers, SFX synth, HUD redesign, parallax bg, BGM, audio settings UI | ✅ done (5.A → 5.F + 5.D.2) | `05-polish-design.md` |
| **6 — Auth + persistence** | Login, JSON store, run sync, leaderboard, MenuScreen + logout | ⏳ 6.A + 6.B + 6.C done; 6.D skipped (JSON suficiente) | `06-server-design.md` |
| **7 — Lobby UX restructure** | Login → Character → Mission → Run flow + difficulty + room foundation | ✅ 7.A + 7.B + 7.C done | `07-lobby-design.md` |
| **8 — Multiplayer (Tailscale alpha)** | Network test → lobby presence → co-op gameplay | ⏳ 8.A config done; teste do user pendente | `08-multiplayer-design.md` |
| **9 — Sprites e arte** | Substituir primitivas por sprites animados (Elesis + mobs + bg) | ⏳ não iniciado | (último, ~50-100h) |

## O que ainda falta dentro das phases "ativas"

### Phase 4 (apenas server-side)
- 4.K — sync de records pro servidor (depende de Phase 6)

### Phase 5 — Polish
- ✅ tudo implementado. 5.D (BGM sintético) entregue na sessão de 2026-05-06.

## Conteúdo atual (snapshot)

| Categoria | Quantidade | Detalhe |
|---|---|---|
| Stages | 6 | forest-1-1 → forest-1-4 (mid-boss), swamp-1-1 → swamp-1-2 (final boss) |
| Mob types | 9 | slim, racoon, archer, brute, wisp (aerial), bog-frog (leaper), mire-wraith (glass cannon), insectivorous (mid-boss), drowned-king (final boss) |
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

## Próximas etapas — sequência atualizada (re-priorizada pelo user)

Phase 7 (lobby) e Phase 8 (multiplayer) movidos pra antes da Phase 9 (sprites).
Razões: lobby UX é prep pra MP; MP via Tailscale precisa room concept;
sprites são o último polish.

1. ✅ **5.D — BGM sintético** (~3-4h, feito 2026-05-06) — Phase 5 fechada.
   Web Audio API procedural com 3 perfis (forest / deep / boss) por stage.
   Crossfade 0.7s entre stages. Stop em bossDeathDrama / gameOver / new run.
2. ✅ **Multi-phase boss** (feito 2026-05-06) — Insectivorous Phase 2 < 50%
   HP. Cooldown ×0.55, telegraph ×0.7, damage ×1.2, walk ×1.4, combo break
   ×0.7. Visual: red tint + pulse + red HP bar. Audio: sting + BGM crossfade
   pra `bossRage` (130 BPM). Trigger FX: dual spark ring + screen shake +
   PHASE 2! popup.
3. ✅ **Boss intro + healthbar dedicada** (feito 2026-05-06) — banner
   "★ BOSS ★ INSECTIVOROUS" + BossHpBar persistente no topo do HUD com
   Phase 2 indicator. Plus aerial bonus (×1.3 + popup azul) e backstab
   bonus (×1.3 + popup roxo) — ambos multiplicativos.
4. ✅ **Wisp aéreo** (feito 2026-05-06) — `hasGravity: false`, hoverY=380,
   bobbing 6px senoidal, dive attack vy=320 + vx=60 horizontal, lerp de
   volta pra hoverY em recover. Palette roxa + glow circles pulsantes.
   Spawnado em stages 2 e 3. Sempre aerial = bonus ×1.3 garantido.
5. ⏳ **Phase 6 — Auth + persistence** — em progresso.
   - 6.A done (2026-05-06): JSON store + REST (login/runs/me) + LoginScreen
     UI + run sync após victory/gameOver. Username-only auth (sem senha)
     suficiente pra friends-only.
   - 6.B done (2026-05-06): leaderboard global (top per user, time/damage/deaths
     metrics) + display em VictoryStats com row do player highlighted.
   - 6.B.2 done (2026-05-06): bug fix do leaderboard ficando "carregando"
     em runs guest/empty — adicionado `leaderboardLoaded` flag + sequenciamento
     saveRun→fetchLeaderboard.
   - 6.C done (2026-05-06): MenuScreen unificado (substitui SettingsMenu).
     Tecla `O`/`Esc` abre menu com 3 sections: Leaderboard (TIME/DAMAGE/DEATHS
     toggle), Sound (volumes + mute), Logout. Logout limpa localStorage e
     reabre LoginScreen pra trocar de user.
   - 6.D pending: migrar JSON pra SQLite se escalar.
6. ✅ **Pântano dos Esquecidos** (feito 2026-05-06) — segundo bioma. 2 stages
   novos (swamp-1-1, swamp-1-2) + 3 mobs novos (Bog Frog leap-attack, Mire
   Wraith glass-cannon, Drowned King boss multi-phase). Nova BGM 'swamp' +
   palettes 'swamp'/'swampBoss'. Insectivorous virou mid-boss; Drowned King
   é o final-boss. Run agora ~6-8min, 6 stages.
7. ⏳ **Phase 7 — Lobby UX restructure** — em progresso.
   - 7.A done (2026-05-06): Login → CharacterSelect → MissionSelect → Run
     flow. Forest e Swamp viraram missions independentes (cada um seu run
     roguelike). 4 character slots (1 ativo + 3 "coming soon" greyed).
   - 7.B done (2026-05-06): Difficulty levels (Easy/Normal/Hard) integrados
     em MissionSelect como tab bar. Mob HP×{0.7, 1.0, 1.4}, dmg×{0.7, 1.0,
     1.3}, lives {4, 3, 2}. Persistente em localStorage.
   - 7.C done (2026-05-06): Room model + REST endpoints
     (POST/GET/join/leave/list). Cada run cria silenciosamente uma room
     no server. Room code aparece no HUD top-right (`@user · ABCDEF`).
     Sem UI de create/join ainda — vem em 8.B junto com lobby/MP.
8. ⏳ **Phase 8 — Multiplayer (Tailscale alpha)** — em progresso.
   - 8.A done (config 2026-05-06): Vite host: true, Tailscale setup
     guide em `08-multiplayer-design.md`. Aguardando user testar de
     duas máquinas no tailnet.
   - 8.B pending: Lobby UI (room list + create/join dialog).
   - 8.C pending: Co-op gameplay (synced state via WS).
9. ⏳ **Phase 9 — Sprites/arte** — substitui primitivas. Decisão pendente:
   extrair do GC original vs gerar via SD. ~50-100h. (último).

## Decisões pendentes (não-bloqueantes)

- **Sprite source**: rip do client S1 vs gerar do zero (Phase 7)
- **BGM source**: rip + clear vs gerar com Suno/Udio (Phase 5.D / 7)
- **Run-start lives**: continuar 3? configurar via modifier? (gameplay tuning)
- **Quanto de meta-progression** entre runs (XP, unlocks)? Hades faz, GC não. 
  Plano original: NÃO. Pode mudar em V1.1.

# Eternia — STATUS

> Last updated: 2026-05-09 (post codebase cleanup pass).
>
> Live snapshot of project state. Plano original (imutável):
> `~/repos/grand-chase/docs/eternia-mvp.md`.

## TL;DR

A floresta jogável está completa em 3D + áudio + arte pintada. Naia e os
dois mobs do bioma (Forest Sprite + Bramble Beast) renderizam via
Three.js sobre Pixi. Multiplayer Tailscale alpha funcional. Pântano
ainda é placeholder visual (palette procedural + mobs primitivos).

## Phase status

| Phase | Escopo | Status |
|---|---|---|
| 0 — Foundation | Monorepo + Vite + WS hello | ✅ |
| 1 — Movement | walk/run/jump/dash/parallax | ✅ |
| 2 — Combat | combo Z + S1/S2/S3 + dash atk + parry + counter | ✅ |
| 3 — Mobs/AI | 9 mob types + multi-phase boss | ✅ |
| 4 — Stage flow + buffs | 6 stages, buffs, modifiers, mini-map, portal | ✅ |
| 5 — Audio + polish | hit pause, shake, BGM, audio settings | ✅ |
| 6 — Auth + persistence | login, JSON store, leaderboard, menu | ✅ (6.D SQLite/Postgres skipped — JSON suficiente) |
| 7 — Lobby UX restructure | Login → CharSelect → Mission → RoomList → RoomLobby | ✅ |
| 8 — Multiplayer (Tailscale alpha) | host-authoritative co-op, projectile sync | ✅ |
| 9 — Art pipeline (Naia + bioma 1) | anchor LOCKED, pivot to 3D Tripo, Naia + 2 mobs ingame | ✅ |
| 10 — Polish + extra biomes | swamp art, more characters, etc. | ⏳ pendente |

## Conteúdo atual

| Categoria | Quantidade | Detalhe |
|---|---|---|
| Stages | 6 | forest-1-1 → forest-1-4 (mid-boss), swamp-1-1 → swamp-1-2 (boss) |
| Mob types | 9 | slim, racoon, archer, brute, wisp, bog-frog, mire-wraith, insectivorous (mid-boss), drowned-king (final) |
| Mobs com 3D | 2 | Forest Sprite (substitui slim visualmente), Bramble Beast (substitui racoon) |
| Personagens jogáveis | 1 ativa | Naia (3D, archer kit). Astrid pausada. 2 slots futuros. |
| Buffs (run-pickup) | 15 | 11 common + 4 rare |
| Modifiers (run-start) | 9 | tradeoffs grandes |
| Skills | 3 | S1 light / S2 medium / S3 heavy, com MP cost + cooldown |
| BGM tracks | 4 | menu, mission, forest-explore, forest-combat (fallback p/ deep/boss/swamp) |
| SFX library | ~30 | bow draw/shoot, footsteps, mob deaths, UI, stings — ElevenLabs |
| Forest art | 11 sprites | 3 parallax bgs + foreground vines + 4 plataformas + 3 ground tiles |

## Sprint timeline (recente)

| Sprint | Escopo | Status |
|---|---|---|
| 7.A | Procedural anims (jump, shoot, hit) substituem Mixamo | ✅ |
| 7.B | RoomLobby 3D portraits | ✅ |
| 7.C | Fix screen transition cascade bugs | ✅ |
| 7.D | Canvas fullscreen + UI layout polish | ✅ |
| 7.E | CharacterSelect minimalist redesign | ✅ |
| 7.F | Centralized Naia transforms (head scale 1.3) + headshot pre-cropped + drag-to-spin | ✅ |
| 7.G | MissionSelect → world-map | ✅ |
| 7.G.1 | Strip MissionSelect (só mapa) + new RoomList screen | ✅ |
| 7.G.2 | Polish: trocar herói pill + RoomList stage card hero + RoomLobby Naia front+idle + solo-start fix | ✅ |
| 7.K | Forest Sprite + Bramble Beast 3D ingame | ✅ |
| 7.L | Audio integration (file-based BGM + SFX library) | ✅ |
| 7.M | Floresta painted assets ingame (parallax bgs + plataformas + ground tiles) | ✅ |
| Cleanup | Remove dead Pixi UI, sprite plumbing, procedural audio, comments | ✅ (2026-05-09) |

## Arquitetura atual

Ver [`architecture.md`](./architecture.md) — descreve módulos do client,
camada Three sobre Pixi, sistema de áudio, bridge multiplayer e fluxo
completo de uma run.

## Próximas etapas (não-bloqueantes)

1. **Pântano dos Esquecidos — arte pintada**: gerar parallax bgs,
   plataformas, ground tiles seguindo o mesmo template da Floresta
   (`docs/prompts/floresta-stage-art.md`). Bog Frog + Mire Wraith +
   Drowned King 3D models.
2. **Naia animations**: walk, jump, shoot, hit clips contra o Tripo
   rig. Hoje só idle está autorizado; runtime aceita os outros mas no-op.
3. **Foreground vines overlay**: layer entre worldStage e uiStage com
   `foreground-vines.jpeg` (asset já está em disco, não está sendo
   renderizada).
4. **Hooks de áudio remanescentes**: `playStageClear` (transição entre
   stages), `playUiClick`/`playUiConfirm` (botões), `playFootstep`
   (timer de stride no Player), `playCardPickup` (buff/modifier pick),
   `playPortalOpen` (portal ativa).
5. **2ª personagem jogável** — Astrid (knight). Anchor LOCKED. Refazer
   turnaround, gerar Tripo GLB, plugar nos extension points.
6. **Scope creep candidate**: SQLite/Postgres swap para o store
   (atualmente JSON file) se base de jogadores crescer.

## Decisões pendentes

- Run-start lives — continuar 3? Configurar via modifier? (gameplay tuning)
- Meta-progression entre runs (XP, unlocks)? Plano original: NÃO.
  Pode mudar em V1.1.

## Docs index

- `00-spec.md` — original spec
- `01..05-*-design.md` — per-phase design logs
- `06-server-design.md` — Go server (REST + WS)
- `07-lobby-design.md` — lobby UX restructure
- `08-multiplayer-design.md` — Tailscale alpha co-op
- `09-art-bible.md` — Eternia visual style canonical
- `09a-naia.md` / `09b-astrid.md` — character bibles
- `09c-naia-3d.md` — Tripo pipeline + bone mapping
- `10-world-map-design.md` — overworld map
- `11-floresta-dos-elfos.md` — biome 1 design
- `architecture.md` — current code shape (this cleanup pass)
- `prompts/` — Gemini Nano Banana / ElevenLabs / Tripo prompts

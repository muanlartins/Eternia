# 07 — Lobby UX Restructure (Phase 7)

Restruturação pra ficar mais GC-style: login → character → mission → run.
Cada bioma vira sua própria "mission" (ex: Floresta = run de 4 stages com
buffs, Pântano = run de 2 stages com buffs).

> Phase 7 era originalmente "Sprites/arte" (movido pra Phase 9). Lobby UX
> ficou na frente porque setup multiplayer (Phase 8) precisa do conceito
> de room/lobby, e os assets de arte são o último passo.

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **7.A** | Mission select + character select + flow restructure | implementado |
| **7.B** | Difficulty levels (Easy / Normal / Hard) integrados em MissionSelect | implementado |
| **7.C** | Room creation/join (single-player rooms inicialmente, prep pra MP) | pendente |

## 7.A — Mission select + character select

### Novos data files

`client/src/data/characters.ts` — `CharacterSpec[]`. Atualmente:
- `elesis` (available)
- `lire`, `arme`, `ronan` (available: false — locked, "coming soon")

`client/src/data/missions.ts` — `MissionSpec[]`. Cada mission lista
seus `stageIds` (ordem de execução). Atualmente:
- `forest` — 4 stages (forest-1-1 → forest-1-4), boss Insectivorous
- `swamp` — 2 stages (swamp-1-1 → swamp-1-2), boss Drowned King

### Novos screens

`CharacterSelect.ts` (Pixi):
- 4 slots horizontais (1 ativo + 3 greyed-out)
- ←→ navega, ENTER confirma (slots `available: false` ficam visíveis mas
  não confirmáveis)
- Mostra detalhes (nome, classe, descrição) do slot selecionado

`MissionSelect.ts` (Pixi):
- 2 cards verticais (Forest, Swamp)
- ↑↓ navega, ENTER inicia
- Status text opcional ("GAME OVER · pick a mission to retry")
- Cards locked (`available: false`) terão visual greyed-out (none currently)

### Flow

```
Login (loginScreen)
  └── onSubmit/onGuest
      └── startCharacterSelect()
          └── confirm
              └── startMissionSelect()
                  └── confirm
                      ├── reset run state (lives, buffs, runStats, pendingFlags)
                      ├── currentMission = picked
                      ├── currentStageIdx = 0
                      ├── recreate stage (mission's first stageId)
                      ├── refreshMiniMap()  (reflect mission's stages)
                      └── show modifierOffer → stagePhase = 'modifierPick'
                          └── modifier picked → run starts
```

Após victory (player presses any key em VictoryStats) → `startMissionSelect()`.
Após gameOver banner timer expira → `startMissionSelect('GAME OVER · pick a mission to retry')`.

Logout (no MenuScreen) → `auth.logout()` + close menu + `loginScreen.show()`.
Após new login/guest, `startCharacterSelect()` é chamado, fluxo recomeça.

### Mudanças no main.ts

- `currentMission: MissionSpec` substitui o uso direto de `STAGES` array.
  Default = `MISSIONS[0]` (forest).
- `currentStageIdx` agora indexa em `currentMission.stageIds`, não no array
  global de STAGES.
- Novo helper `currentStageSpec()` resolve o stage atual via
  `stageById(currentMission.stageIds[currentStageIdx])`.
- Novo helper `isLastStageInMission(idx?)` checa se é o último stage do
  mission ativa.
- `bgmIdForStage` continua funcionando (route by stageId prefix).
- HUD `totalStages` agora é `currentMission.stageIds.length` em vez de
  `STAGES.length`.
- MiniMap mostra apenas stages da mission ativa via `refreshMiniMap()`.
- `stageBannerText(spec, displayIdx)` agora recebe StageSpec direto em vez
  de idx no array global.

### Stage advance dentro da mission

Antes: `currentStageIdx = (currentStageIdx + 1) % STAGES.length` (loop
global). Agora: `currentStageIdx = currentStageIdx + 1` (sem modulo —
buffOffer só dispara se não for last stage, então não precisa loop).

`isLastStageInMission()` na hit-detection check decide se o final-stage-clear
vai pra `bossDeathDrama` (vitória) ou `awaitingPortal` (mid-stage).

### startMissionSelect signature

```ts
function startMissionSelect(statusText?: string)
```

Hide cinematic UIs, stop BGM, show MissionSelect com optional status text.
onConfirm callback faz o reset completo.

### Por que Forest é mid-boss e Swamp é final-boss

Atualmente cada mission é independente. Forest é run de 4 stages com
Insectivorous como boss (final do mission). Swamp é run de 2 stages com
Drowned King como boss. Player escolhe qual jogar — Forest ou Swamp.

Isso difere da v anterior (4.M) onde Forest+Swamp eram um único run de 6
stages. Aquele design ficou só por 1 commit. Agora separados via
mission system.

### Decisões / trade-offs

- **Char select com 1 char**: slots greyed-out ficam visíveis pra mostrar
  framework e "coming soon" feel, mas é só 1 ENTER pra prosseguir. Aceito
  pra prep de futuro.
- **Mission unlock**: ambas missions estão `available: true`. Se quisermos
  progression (Swamp só desbloqueia após zerar Forest), basta flipar
  `available` baseado em records. Future polish.
- **Difficulty**: pendente (7.B). Por enquanto só "Normal" effetivamente.
- **Room concept**: ausente (7.C). Cada run é solo, sem conceito de "room"
  ainda.

## 7.B — Difficulty levels

3 níveis multiplicam stats de mob (HP + dmg) e ajustam vidas iniciais.
Persistente em `localStorage` (`eternia.difficulty.v1`).

### Specs

| Difficulty | hpMul | dmgMul | lives |
|---|---|---|---|
| **Easy** | 0.7 | 0.7 | 4 |
| **Normal** | 1.0 | 1.0 | 3 |
| **Hard** | 1.4 | 1.3 | 2 |

Settings ficam em `client/src/data/difficulty.ts` com `loadDifficulty()` /
`saveDifficulty()` helpers.

### UI integration

`MissionSelect` ganhou tab bar de difficulty no topo (acima dos mission
cards). 3 tabs (`EASY` / `NORMAL` / `HARD`), tab selecionada com border
gold + texto gold. Description abaixo: "Mob HP ×0.7, dmg ×0.7, 4 lives."

Navegação:
- ↑↓ → mission card
- ←→ → difficulty tab
- ENTER → confirma mission + difficulty current, dispara onConfirm

### Implementation flow

`Mob` constructor agora aceita `{ hpMul, dmgMul }` em options. Aplicados:
- `Mob.getMaxHp()` retorna `spec.maxHp * hpMul`
- HP inicial / respawn: `spec.maxHp * hpMul`
- `getActiveHit().damage` = `atk.damage * damageMul() * dmgMul` (phase2 ×
  difficulty)
- Projectile damage também recebe os multipliers
- HP bar visual + Phase 2 threshold check usam `maxHp * hpMul` consistentemente

`Stage` constructor recebe `{ hpMul, dmgMul }` e passa pro Mob ao spawnar.

`main.ts`:
- `currentDifficulty: DifficultySpec` carrega de localStorage
- `MAX_LIVES` virou `let` (era const), inicializado de
  `currentDifficulty.lives`. Atualizado em mission select onConfirm.
- Helper `newStage()` consolida a criação de Stage com flags atuais
  (isLastStage, hpMul, dmgMul). Substitui inline `new Stage(...)` em 4
  call sites.

### Save behavior

Difficulty persiste por usuário (localStorage) — não está vinculado a
mission. Mudou Easy → ele permanece Easy nas próximas runs até trocar.

Records (best time, etc.) atualmente NÃO discriminam por difficulty —
um best time em Easy compete com um em Hard. Pode ser fixado em 7.B.2
adicionando difficulty ao record key, mas pra alpha tudo bem.

### Não feito (intencional)

- **Per-mission default difficulty**: missions não recomendam um
  difficulty específico. Player escolhe.
- **Difficulty unlock**: Hard available desde o começo. Sem progression.
- **Diff-aware leaderboard**: server salva runs sem difficulty. Backlog.

## 7.C — Room creation/join (futuro)

Cada run vira uma "room" no server. Solo room = privada (default). Player
pode invitar via código compartilhável (ex: `eternia.io/r/ABC123`).

Server endpoint: POST /api/rooms { mission, difficulty } → { roomId, code }.
Outros players entram via POST /api/rooms/:code/join.

Player count atualmente cap em 1 (sem co-op gameplay ainda — vem em 8.C).
Mas a infra de room já é exposta pra preparar Phase 8 (multiplayer).

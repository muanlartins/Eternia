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
| **7.C** | Room model + REST endpoints (create/join/leave/list/get) + client integration silenciosa (HUD mostra room code) | implementado |

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

## 7.C — Room model + REST endpoints

Foundation pra multiplayer. Cada run agora cria uma "room" no server.
Sem UI de criar/entrar (vem em 8.B com lobby completo) — por enquanto,
toda run autom-cria uma room solo silenciosamente, e o code aparece no
HUD pra o user já conseguir testar share via Tailscale via curl quando
chegar 8.A.

### Server (Go)

`store.go`: novo `Room` struct e métodos:
```go
type Room struct {
  ID         int    `json:"id"`
  Code       string `json:"code"`        // 6-char alphanumeric
  HostUserID int    `json:"hostUserId"`
  Mission    string `json:"mission"`
  Difficulty string `json:"difficulty"`
  Members    []int  `json:"members"`     // user IDs
  Status     string `json:"status"`      // "active" | "ended"
  CreatedAt  int64  `json:"createdAt"`
  UpdatedAt  int64  `json:"updatedAt"`
}
```

Code generation: 6 chars de alfabeto sem ambiguidade (sem I, O, 0, 1).
Retry on collision (até 8 tentativas; espaço de 32^6 ≈ 1B = sufficient
pra friends-only).

Methods:
- `CreateRoom(hostUserID, mission, difficulty) → Room` (host vira primeiro
  member, status='active')
- `JoinRoom(code, userID) → Room` (idempotente — se já é member, retorna
  current. Se room não existe ou status != 'active', erro)
- `LeaveRoom(code, userID)` (remove member; se ficar vazio, status='ended')
- `RoomByCode(code) → Room` (lookup; case-insensitive)
- `ActiveRooms() → []Room` (filtra status == 'active')

### REST endpoints (`api.go`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/rooms` | Bearer | Cria room (`{mission, difficulty}`) |
| GET | `/api/rooms` | none | Lista active rooms |
| GET | `/api/rooms/{code}` | none | Get specific room |
| POST | `/api/rooms/{code}/join` | Bearer | Join (idempotent) |
| POST | `/api/rooms/{code}/leave` | Bearer | Leave (204 No Content) |

Routing usa `r.PathValue("code")` (Go 1.22+ pattern matching).

### Client (`Auth.ts`)

Novos métodos: `createRoom(mission, difficulty)`, `joinRoom(code)`,
`leaveRoom(code)`. Todos no-op se não autenticado (guest). Erros (network,
non-2xx) logged via console.warn, retornam null.

### main.ts integration

Estado: `currentRoom: Room | null`.

Triggers:
- `startMissionSelect` enter → leaveRoom previous (if any) + clear
- `missionSelect.onConfirm` → fire-and-forget createRoom; quando resolve,
  set currentRoom (pode levar ~50ms — HUD começa sem code, depois aparece)
- `menuScreen.onLogout` → leaveRoom + clear

Display: HUD top-right text vira `@username · ABCDEF` quando há room.
Sem room (entre runs ou guest): só `@username` ou `server X.Y.Z`.

### Smoke test verificado

Server end-to-end (curl, 2 users):
- alice POST /api/rooms → code Q7HEEF, status active, members [1]
- bob POST /api/rooms/Q7HEEF/join → members [1, 2], idempotent
- GET /api/rooms → lista com 1 room active
- GET /api/rooms/Q7HEEF → mesmo room
- bob POST .../leave → 204; members [1]
- alice POST .../leave → 204; members [], status='ended'
- GET /api/rooms → lista vazia (status != active)
- POST /api/rooms/XXXXXX/join → 404 not found

### Decisões / não feitos

- **Persistência**: rooms vão pra mesmo `data/eternia.json`. Acumula
  rooms ended (status='ended'). Cleanup periódico ainda não — nem MP ativo
  pra precisar disso. Pode adicionar threshold (ex: ended > 24h → delete)
  em future polish.
- **Room privacy**: ActiveRooms() retorna TODAS as active rooms (no
  filter por privacy). Solo runs aparecerão na lista quando 8.B vier. Vai
  precisar flag `private: bool` ou similar pra distinguir solo vs invitable.
- **WebSocket**: rooms são REST por enquanto. Phase 8.B vai adicionar WS
  notifications (player joined/left, etc.).
- **Lobby UI**: sem create/join UI em 7.C. Solo path silencioso.

## 7.D (futuro / opcional)

- **Room private flag** + filtragem em ActiveRooms.
- **Cleanup de rooms ended** após N horas.
- **Lobby screen** com room list, create-room dialog, join-by-code text
  input. (vai junto com 8.B já que MP precisa)

# 06 — Server Design (Phase 6)

Auth + persistence. Tradicionalmente exigia Postgres + auth real, mas pra
friends-only Tailscale alpha, escolhemos JSON file storage + username-only
auth (sem senha). Trivial de setup, suficiente pra escala atual (~5 users).

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **6.A** | JSON store + REST endpoints (login, run save, my records) + client login UI + run sync | implementado |
| **6.B** | Leaderboard global (top 1 run per user, by time / damage / deaths) + display em VictoryStats | implementado |
| **6.B.2** | Bug fix: VictoryStats leaderboard ficava em "loading" quando vazio. Adicionado `leaderboardLoaded` flag + sequenciamento saveRun→fetchLeaderboard | implementado |
| **6.C** | MenuScreen unificado (Leaderboard + Sound + Logout) substitui SettingsMenu. Logout limpa localStorage + reabre LoginScreen pra trocar user | implementado |
| **6.D** | Migrar pra SQLite ou Postgres se for escalar | pendente |

## 6.A — JSON store + REST + client login

### Server

**Storage**: `server/internal/store/store.go`
- JSON file at `./data/eternia.json` (configurable via `-data` flag)
- Atomic writes via `tmp + rename`
- Single mutex for concurrent access (fine pra ~5 users)

**Schema**:

```go
type User struct {
  ID        int    `json:"id"`
  Username  string `json:"username"` // lowercased, max 20 chars
  Token     string `json:"token"`    // 24 random bytes hex
  CreatedAt int64  `json:"createdAt"`
}

type Run struct {
  ID          int   `json:"id"`
  UserID      int   `json:"userId"`
  DurationMs  int64 `json:"durationMs"`
  DamageDealt int   `json:"damageDealt"`
  Deaths      int   `json:"deaths"`
  Victory     bool  `json:"victory"`
  CompletedAt int64 `json:"completedAt"`
}
```

`Records` é derivado de `runs` via aggregation (não persistido). Calcula
`bestTimeMs`, `bestDamageDealt`, `fewestDeathsInVictory`, `totalVictories`,
`totalAttempts` em runtime.

### REST endpoints (`server/internal/api/api.go`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/login` | none | `{ username }` | `{ token, userId, username, records }` |
| POST | `/api/runs` | Bearer token | `{ durationMs, damageDealt, deaths, victory }` | `{ records }` |
| GET | `/api/runs/me` | Bearer token | — | `{ records }` |

**Auth**: Bearer token via `Authorization: Bearer <hex>`. Token gerado no
primeiro login do username, reutilizado em logins subsequentes (idempotent).
Não há senha — username é credential. Suficiente pra friends-only.

### main.go integration

`http.ServeMux` (Go 1.22+ pattern matching) routea:
- `/ws` — WebSocket (Phase 0 hello)
- `/health` — plain text "ok"
- `POST /api/login`, `POST /api/runs`, `GET /api/runs/me`

### Client

**`client/src/game/Auth.ts`** — auth state class:
- `login(username) → { ok } | { ok: false; error }` — POST /api/login,
  persist em `localStorage` (`eternia.auth.v1`)
- `logout()` — limpa state + localStorage
- `saveRun(payload)` — POST /api/runs (no-op se não autenticado, drop em
  network failure — local records são authoritative anyway)
- `refreshRecords()` — GET /api/runs/me, atualiza serverRecords cache
- 401 response triggers automatic logout (token invalid)

**`client/src/game/LoginScreen.ts`** — Pixi UI overlay:
- Painel 480×280 centrado, gold border
- Title "ETERNIA"
- Input box: keypress builds username (a-z, A-Z, 0-9, _, -; max 16 chars)
- ENTER: submit; ESC: play as guest
- Status text mostra "logging in…" / errors

Show condition: `!auth.isAuthenticated()` no startup. Pausa game (early
return em app.ticker enquanto open).

**Cursor blink**: 500ms on/off via `tick(realDtMs)`.

### Run sync

Em main.ts:
- `bossDeathDrama` → victoryAnnounce: `void auth.saveRun({ ..., victory: true })`
- Game over (lives <= 0): `void auth.saveRun({ ..., victory: false })`

Fire-and-forget. Local records (localStorage) continuam authoritative pro
display imediato. Server backup pra cross-device sync futuro.

### HUD username display

Top-right `serverInfoLabel` mostra `@username` quando autenticado, senão
fallback `server X.Y.Z`. Substituição transparent.

### Trade-offs

- **Sem senha** — username-only é OK pra Tailscale alpha. Phase 6.D pode
  trocar pra password+bcrypt se for público.
- **JSON file** — não escala além de ~10k runs. Migrate to SQLite se isso
  virar problema. Trivial swap (pure-Go modernc.org/sqlite).
- **Sem sessions reais** — token nunca expira. Phase 6.D adiciona TTL +
  rotation se precisar.
- **Sem CSRF** — REST acessível só via WebSocket origin policy + Tailscale.
  Production-ready precisaria CSRF tokens ou cookie SameSite.
- **Local records authoritative** — server records são "advisory" pra
  cross-device. Conflict resolution = "last write wins" via merge no client.

## 6.B — Leaderboard global

GET `/api/leaderboard?metric=<time|damage|deaths>&limit=<n>` retorna top
N entries (1 row por user — best run de cada). Sem auth (público).

### Métricas

| Metric | Filter | Sort |
|---|---|---|
| `time` | victory only | DurationMs ASC, tiebreak Deaths ASC |
| `damage` | all runs (incl. defeats) | DamageDealt DESC, tiebreak DurationMs ASC |
| `deaths` | victory only | Deaths ASC, tiebreak DurationMs ASC |

"Time" e "deaths" filtram só victories (porque a definição é "best run
completing the game"). "Damage" não filtra (recompensa qualquer dano
total — boss kill perdido ainda conta).

### "Best run per user" aggregation

Em vez de retornar TODOS os runs ordenados, agrupamos por `userId` e
pegamos a melhor de cada user. Isso evita que um user que jogou 100 vezes
domine a board com várias entries dele mesmo. Cada user aparece uma vez,
com seu melhor resultado.

Trade-off: leaderboard mostra "users", não "runs". Pra "all-time best
run" tradicional, basta NÃO agrupar (futuro 6.B.2 se quisermos).

### Client integration

`Auth.fetchLeaderboard(metric, limit)` — standalone async helper (não
requer auth). Retorna `LeaderboardEntry[]` ou `[]` em caso de erro.

`VictoryStats` extendido:
- Panel agora 540×600 (era 520×480) pra acomodar leaderboard section
- Após victory, main.ts chama `victoryStats.show(stats, [], username)`
  com leaderboard vazia (mostra "loading…"), depois fire-and-forget
  `fetchLeaderboard('time', 5).then(entries => victoryStats.setLeaderboard(entries, username))`
- Layout: stats normais + linha em branco + `GLOBAL TOP — FASTEST` header
  + 5 entries
- Highlighting: row do user atual prefixada com `> ` (vs `  ` pros outros)

### Por que "time" como leaderboard default

É o metric mais legível e empolgante. "Damage" varia muito com builds
(modifier Berserker dá ~2× damage), "deaths" tem muitos zeros. "Time"
é puro skill expression — quem matou o boss mais rápido vence.

VictoryStats mostra apenas o "TIME" leaderboard. Pra trocar métrica, o
player abre o MenuScreen (tecla `O`) → Leaderboard, e usa ←→ pra
alternar entre TIME / DAMAGE / DEATHS.

## 6.B.2 — VictoryStats leaderboard bug fix

**Bug**: após victory, o painel mostrava "GLOBAL TOP — FASTEST: (loading…)"
indefinidamente. Causas:

1. `setLeaderboard([])` chamado com array vazio (porque server respondeu antes
   do saveRun completar OU porque user é guest sem runs) re-renderizava o
   "loading" state — não havia distinção entre "fetching" vs "fetched empty".
2. Race condition: `auth.saveRun(run)` e `fetchLeaderboard('time', 5)`
   disparam em paralelo; fetchLeaderboard pode resolver antes de saveRun,
   retornando entries que não incluem a run que acabou de terminar.

**Fix**:
- `VictoryStats.leaderboardLoaded` flag (false até `setLeaderboard` ser
  chamado pela primeira vez). Render distingue:
  - not loaded → "(loading…)"
  - loaded but empty → "(offline / guest run — login to compete)"
  - loaded with entries → renderiza top 5
- main.ts armazena `lastSaveRun: Promise<void> | null` ao chamar
  `auth.saveRun(...)`. Em victoryAnnounce → victoryStats:
  ```ts
  void (async () => {
    if (lastSaveRun) await lastSaveRun.catch(() => undefined);
    const entries = await fetchLeaderboard('time', 5);
    victoryStats.setLeaderboard(entries, auth.getUsername());
  })();
  ```
  Garante que o saveRun completou (com timeout de erro) antes de buscar
  leaderboard. Run recém-completada aparece corretamente no ranking.

## 6.C — MenuScreen unificado + logout

`SettingsMenu` (apenas audio) substituído por `MenuScreen` (multi-section).
Tecla `O` ou `Esc` abre/fecha. Pausa o jogo enquanto aberto.

### Arquitetura

Single Pixi container com state machine interno:
- `view: 'root' | 'audio' | 'leaderboard'`
- root: lista de opções (Leaderboard / Sound / Logout)
- audio: 4 rows (Master / BGM / SFX / Mute) com bars ASCII
- leaderboard: tabs de métrica (TIME / DAMAGE / DEATHS) + top 10 entries

### Navegação

- Em qualquer view: ESC / O volta pra root (ou fecha se já estiver em root)
- Em root: ↑↓ navega, ENTER / → entra na opção selecionada
- Em audio: ↑↓ navega rows, ←→ ajusta volume (±5%) ou toggle mute
- Em leaderboard: ←→ troca métrica (refetch automático), ESC volta

### Logout flow

Selecionar "Logout" no root → callback main.ts:
1. `auth.logout()` — limpa state + localStorage
2. `menuScreen.close()`
3. `loginScreen.show({onSubmit, onGuest})` — força login screen na próxima
   frame (game pausa, conforme early return existente)

User entra como outro username (ou guest), continua a partir daí. Permite
multi-user no mesmo browser sem refresh.

### Logout não disponível pra guest

Se `auth.getUsername() === null`, "Logout" não aparece no root menu (só
"Leaderboard" e "Sound"). Evita confusão.

### Stale request guard no leaderboard

`requestLeaderboard()` incrementa `lbReqToken` antes de cada fetch. O `.then`
só atualiza state se `token === this.lbReqToken`. Previne race quando user
troca rapidamente entre métricas (request anterior chega depois e
sobrescreveria com dados errados).

### Input.confirm

Adicionada nova `InputKey: 'confirm'` (mapeada pra `Enter`) pra ativação
de items no menu root. ←→ continua sendo "adjust" no audio e "switch tab"
no leaderboard.

## 6.D — DB migration (futuro)

Se store.json virar gargalo, migrate pra SQLite (modernc.org/sqlite, pure
Go, sem CGO). Schema ports 1:1 das structs Go. Driver-agnostic via
`database/sql`. Permite queries indexadas + concurrent reads.

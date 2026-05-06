# 06 — Server Design (Phase 6)

Auth + persistence. Tradicionalmente exigia Postgres + auth real, mas pra
friends-only Tailscale alpha, escolhemos JSON file storage + username-only
auth (sem senha). Trivial de setup, suficiente pra escala atual (~5 users).

## Sub-fases

| Sub-fase | Escopo | Status |
|---|---|---|
| **6.A** | JSON store + REST endpoints (login, run save, my records) + client login UI + run sync | implementado |
| **6.B** | Leaderboard global (top runs by metric) + display em VictoryStats | pendente |
| **6.C** | Logout + multi-user no mesmo browser | pendente |
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

## 6.B — Leaderboard (futuro)

GET /api/leaderboard?metric=time|damage|deaths&limit=10 retorna top N
runs com username. Display: novo painel ao lado de VictoryStats, ou seção
"Hall of Fame" em modifier pick screen. Backend trivial (sort all runs por
metric, take top N).

## 6.C — Logout + multi-user (futuro)

SettingsMenu ganha row "Logout". Limpa localStorage + reload. Permite o
mesmo browser ter sessões diferentes (e.g., compartilhar setup com amigo).

## 6.D — DB migration (futuro)

Se store.json virar gargalo, migrate pra SQLite (modernc.org/sqlite, pure
Go, sem CGO). Schema ports 1:1 das structs Go. Driver-agnostic via
`database/sql`. Permite queries indexadas + concurrent reads.

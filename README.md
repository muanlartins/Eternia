# Eternia

Personal browser-based action game. Inspired by Grand Chase Season 1 BR (Level Up era,
2007-2008), redesigned with modern feel + roguelike build cards.

**Status:** ~Phase 5 (polish, mostly done). See `docs/STATUS.md` for the live roadmap snapshot.

> Private project, friends-only access. Not for commercial use. No "Grand Chase" branding
> in distributable form.

## Stack

- **Client:** TypeScript 5.6+, Pixi.js v8, Vite, Howler.js
- **Server:** Go 1.23+, PostgreSQL 16+, gorilla/websocket
- **Shared:** TypeScript types (zero runtime, just `import`s)
- **Workspace:** pnpm workspaces
- **Target:** desktop browsers (Chrome/Firefox/Safari latest)

## Layout

```
Eternia/
├── client/      # browser game (TS + Pixi)
├── server/      # game server (Go)
├── shared/      # TypeScript types shared cliente <-> server
├── docs/        # architecture docs, ADRs, runbooks tied to code
└── package.json # root workspace
```

External research, playtest notes, and findings about the GC reference live in
`../docs/` (i.e. `~/repos/grand-chase/docs/`), NOT in this repo.

## Setup (one-time)

Pre-reqs: Node 20+, pnpm 9+, Go 1.23+, Postgres 16+ (local or Docker).

```bash
# from repo root
pnpm install        # installs client + shared deps
cd server && go mod download && cd ..

# Postgres (assuming local install)
createdb eternia_dev
```

## Daily dev

```bash
# Terminal 1: server
cd server
go run ./cmd/eternia-server     # listens on :8080

# Terminal 2: client
cd client
pnpm dev                         # serves on :5173, proxies /ws to :8080
```

Open <http://localhost:5173>.

## Roadmap

- `docs/STATUS.md` — live snapshot of phases done / in-progress / pending
- `../docs/eternia-mvp.md` — full 8-phase roadmap (constitution doc, immutable)
- `docs/01-movement-design.md` … `docs/05-polish-design.md` — per-phase design
  log with sub-phase tables and rationale

# Eternia — Spec entry point

Para a especificação completa do MVP, veja:

- **`../docs/eternia-mvp.md`** (no workspace `~/repos/grand-chase/docs/`) — vision, escopo,
  pillars de design, stack técnico, roadmap em 8 fases, acceptance criteria.

Outros docs externos relevantes (todos em `~/repos/grand-chase/docs/`):

- `playtest-notes.md` — anotações das sessões de playtest do GC original
- `findings-s1-game-design-data.md` — estrutura de dados extraída do GC S1 BR
- `findings-s5-server-emulators-limitation.md` — por que os emuladores S5 não nos
  ajudam com lógica de combate (e por que isso é boa notícia)
- `00-status.md` — status do workspace inteiro (servidor C++ legacy + Eternia)

## Docs neste repo (`Eternia/docs/`)

À medida que código for crescendo aqui, este folder vai receber:

- `01-architecture.md` — overview de cliente/servidor/shared
- `02-protocol.md` — packet spec versionado
- `03-actions-system.md` — como o frame-by-frame action system funciona
- `04-mob-ai.md` — como o AI template engine funciona
- `adr/` — Architecture Decision Records numerados
- `runbooks/` — operacional (deploy, db migrations, troubleshooting)

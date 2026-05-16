# Eternia — Spec entry point

Para a especificação completa do MVP, veja:

- **`eternia-mvp.md`** (kept in a separate private research repo) — vision, escopo,
  pillars de design, stack técnico, roadmap em 8 fases, acceptance criteria.

Outros docs externos relevantes (todos no repo privado de pesquisa):

- `playtest-notes.md` — anotações de sessões de playtest do material de referência
- `findings-s1-game-design-data.md` — estrutura de dados extraída da referência
- `findings-s5-server-emulators-limitation.md` — por que os emuladores S5 não nos
  ajudam com lógica de combate (e por que isso é boa notícia)
- `00-status.md` — status do workspace inteiro

## Docs neste repo (`Eternia/docs/`)

À medida que código for crescendo aqui, este folder vai receber:

- `01-architecture.md` — overview de cliente/servidor/shared
- `02-protocol.md` — packet spec versionado
- `03-actions-system.md` — como o frame-by-frame action system funciona
- `04-mob-ai.md` — como o AI template engine funciona
- `adr/` — Architecture Decision Records numerados
- `runbooks/` — operacional (deploy, db migrations, troubleshooting)
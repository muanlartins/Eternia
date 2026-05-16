# World map assets

PNGs gerados via **Nano Banana Pro** (Flow). Prompts canônicos vivem
fora deste repo (ver private `grand-chase/docs/eternia-prompts/world-map.md`).

## Files expected

| Filename | Aspect | Min size | Background |
|---|---|---|---|
| `continent.png` | 16:9 | 1920×1080 | painted (não-transparente) |
| `node-forest.png` | 1:1 | 256×256 | transparent (alpha) |
| `node-locked.png` | 1:1 | 256×256 | transparent (alpha) |

## Como usar

1. Gerar arte via prompt em `../docs/eternia-prompts/world-map.md` (private repo)
2. Salvar PNG aqui com **filename exato**
3. `pnpm dev` (Vite hot-reload pega automaticamente quando o
   `MissionSelect` for re-implementado em Sprint 7.G)

## Status

- [ ] `continent.png`
- [ ] `node-forest.png`
- [ ] `node-locked.png`

> Quando os 3 estiverem checkados, o scaffold do `MissionSelect` pode
> trocar os placeholders CSS pelas imagens reais.

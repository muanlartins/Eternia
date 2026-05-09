# 10 — World Map (Mission Select redesign)

> Substitui o `MissionSelect` atual (card-stack lado a lado) por um
> mapa-mundo estilo Grand Chase / Mario world-map.
>
> **Status:** design doc (UI ainda não implementada).
> **Sprint:** 7.G.

## Por quê

A versão atual mostra cada bioma como um "card" (Floresta dos Elfos +
Pântano dos Esquecidos). Funciona, mas não tem identidade — quebra o
ritmo depois da `CharacterSelect` (que ficou muito boa). O modelo GC
clássico era um mapa pintado do continente com ícones tipo "trilha"
para cada fase, e isso casa naturalmente com:

- **Sense of place** — você vê a Naia partindo de um continente real.
- **Roadmap visual** — locked stages aparecem mas mostram que existem
  (criando expectativa).
- **Reuso** — o mesmo componente serve quando entrarmos em chapters
  novos; só add nodes ao mapa.

## Layout

```
┌────────────────────────────────────────────────────────────────┐
│ ETERNIA · v0.0.1   CAPÍTULO II · A TRAVESSIA      EASY  N  H  │
│                    ESCOLHA O CAMINHO            HP×0.7 ····   │
│                                                                │
│ ←──────────[ continent.png — full-frame painted ]─────────────│
│            ☘ Floresta                                          │
│             ┃          ?                                       │
│             ┕━━━━━━━━━ ? ━━━━━━━━━━━━━━ Pântano ?              │
│                                                                │
│                      (only Floresta is unlocked)               │
│                                                                │
│ ┌── side panel (slides in from right when node selected) ──┐  │
│ │ ● BIOMA I · FLORESTA                                     │  │
│ │ FLORESTA DOS ELFOS                                       │  │
│ │ "As árvores ainda lembram o nome dos primeiros..."       │  │
│ │                                                          │  │
│ │ STAGES        1   (apenas 1-1 disponível)                │  │
│ │ TEMPO MÉDIO   ~2 min                                     │  │
│ │                                                          │  │
│ │ ENTER · INICIAR JORNADA   [ INICIAR JORNADA ▶ ]         │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ┌─ records ──────────────────────────┐         SOLO  ALIANÇA  │
│ │ best 1:30 · dmg 3370 · vit 13      │                        │
│ └────────────────────────────────────┘                        │
└────────────────────────────────────────────────────────────────┘
```

Áreas:

| Zona | Descrição |
|---|---|
| **Top bar** | mantida — chapter label + difficulty selector (Easy/N/H) |
| **Mapa** | `continent.png` full-frame painted, layer 0 |
| **Trail** | SVG path entre nodes — solid no caminho desbloqueado, dashed nos locked |
| **Nodes** | `<button>` posicionados em `%` absolutos (responsive ao letterbox) |
| **Side panel** | desliza da direita ao selecionar node, fade-out ao sair de seleção |
| **Bottom bar** | mantida — records (esq) + Solo/Aliança + ENTER hint (dir) |

## Esquema de coordenadas dos nodes

Como o `continent.png` é 16:9 fixo, posicionamos cada node em
**porcentagem relativa ao continente**, não ao viewport. Isso garante
que o layout escala junto com o letterbox-stage do jogo.

```ts
interface MapNode {
  id: string;          // 'forest' | 'swamp' | etc.
  missionId: string;   // referência pra MISSIONS[].id
  xPct: number;        // 0..100 — posição horizontal no mapa
  yPct: number;        // 0..100 — posição vertical
  state: 'unlocked' | 'locked';
}

const NODES: MapNode[] = [
  { id: 'forest', missionId: 'forest', xPct: 22, yPct: 38, state: 'unlocked' },
  { id: 'swamp',  missionId: 'swamp',  xPct: 72, yPct: 64, state: 'locked' },
];
```

> Coords iniciais são chute — vou ajustar quando o `continent.png`
> chegar e a Floresta tiver um sanctuary visível no NW.

## Trail SVG

Conexão entre nodes desenhada como SVG path absoluto sobre o mapa:

```html
<svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none">
  <path
    d="M 22,38 Q 47,42 72,64"
    stroke="rgba(245,200,112,0.55)"
    stroke-width="0.6"
    stroke-dasharray="2,1.5"
    fill="none"
  />
</svg>
```

Curva quadrática de cada node ao próximo (ou Bezier cúbica se a trilha
ficar muito reta). `stroke-dasharray` aplicado nas seções locked. Animar
`stroke-dashoffset` em loop pra dar sensação de "trail flowing" (efeito
GC clássico).

## Animation timing

| Elemento | Trigger | Duration | Easing |
|---|---|---|---|
| Map fade-in | screen show | 600ms | ease-out |
| Nodes pop-in (staggered) | screen show | 80ms × index | ease-back |
| Side panel slide | node select | 320ms | ease-soft |
| Trail dash flow | always | 8s loop | linear |
| Selected node glow | always | 2.4s loop | ease-in-out |
| Locked node mist drift | always | 6s loop | linear |

## Keyboard nav

| Tecla | Ação |
|---|---|
| `←` `→` | cycle entre nodes desbloqueados |
| `Enter` | inicia jornada do node selecionado |
| `Esc` | volta pra `CharacterSelect` |
| `1` `2` `3` | switch difficulty (Easy/Normal/Hard) — preserva o atual da tela |

## Arquivos / dependências

**Novos:**
- `client/src/assets/world-map/continent.png` (Nano Banana Pro)
- `client/src/assets/world-map/node-forest.png` (Nano Banana Pro)
- `client/src/assets/world-map/node-locked.png` (Nano Banana Pro)
- `client/src/ui/screens/MissionSelect/MissionSelect.ts` (rewrite)
- `client/src/ui/screens/MissionSelect/MissionSelect.module.css` (rewrite)

**Sem mudança:**
- `client/src/data/missions.ts` (data layer fica igual)
- `client/src/ui/screens/CharacterSelect/*` (intacta)

## Scope lock — Sprint 7.G

| | |
|---|---|
| ✅ Layout novo (mapa + nodes + trail + side panel) | |
| ✅ 1 node desbloqueado (Floresta) + 1 locked (Pântano) | |
| ✅ Atalhos teclado preservados | |
| ✅ Difficulty/Solo/Aliança preservados | |
| ✅ Records strip preservado | |
| ❌ Animação de "primeiro acesso" (revealing locked nodes) | futuro |
| ❌ Mais biomes além de Floresta + Pântano placeholder | futuro |
| ❌ Stage-level navigation (1-1, 1-2…) | futuro — agora foca em 1-1 only |

## Stage 1-1 only — gameplay scope

Após selecionar Floresta + ENTER, o jogo vai direto pra `forest-1-1`
(não pra fluxo roguelike de 4 stages como antes). Isso é controlado em
`main.ts` ou no handler do `MissionSelect.onConfirm` — flag temporária
"single-stage-mvp" até a gente reativar progressão.

Detalhes da fase 1-1 e dos 2 mobs novos vivem em `11-floresta-dos-elfos.md`.

## Próximas decisões

- [ ] Animação de hover nos nodes — só glow ou também micro-bounce?
- [ ] Side panel mostra screenshot do stage ou só texto?
- [ ] Trail flow direção — sempre L→R ou alguma lógica de "última run"?
- [ ] Quando Pântano desbloquear, o `node-locked.png` faz crossfade ou
      reveal animado?

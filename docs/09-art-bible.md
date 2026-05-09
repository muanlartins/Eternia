# 09 — Art Bible (Pre-production)

> **Phase 9 = pré-produção** (lore + concept art + style guide).
> **Phase 10 = implementação** (sprite work, replacing primitives).
>
> Este arquivo é o **index canonical** — pipeline, style anchor, world,
> tool rules, scripts. Bibles individuais de personagens vivem em arquivos
> separados (`09a-naia.md`, `09b-astrid.md`, etc.).

## Sub-fases (estratégia 2026-05-07: Naia-first)

| Sub-fase | Escopo | Status |
|---|---|---|
| **9.0** | Tool choice, pipeline, style guide, World/lore frame | done |
| **9.A** | **Naia** — anchor → poses → vídeo → sprite jogável (validação completa do pipeline com 1 char) | em progresso |
| **9.B** | **Astrid** — anchor LOCKED, retomada após Naia validada | paused |
| **9.C** | Slots 3/4 (mage + spell-knight) | pendente |
| **9.D** | Mob/creature designs (9 mobs) | pendente |
| **9.E** | Biome concepts (Floresta, Pântano + futuros) | em progresso — Floresta LOCKED (`11-floresta-dos-elfos.md`) |
| **9.F** | UI/icon art (24 cards, 3 skill icons, portraits) | pendente |
| **9.G** | World lore book (continente, facções, McGuffin) | pendente |

> Pivot: em vez de gerar 4 chars em paralelo (anchor por char), levamos
> Naia ponta-a-ponta (até sprite ingame jogável) primeiro. Validação total
> do pipeline antes de replicar — não desperdiçamos esforço se algo precisar
> mudar no workflow.

## Pipeline (atualizado 2026-05-07)

### Tool default: Flow (labs.google/flow)

Plano: Gemini Advanced ($20/mês). Flow oferece **Imagem + Vídeo num só
projeto**, com contexto persistente entre gerações.

**Modelos disponíveis no Flow:**

| Modelo | Forte em | Quando usar |
|---|---|---|
| **Nano Banana Pro** ✅ | Character consistency com upload de reference | Turnarounds, novas poses do mesmo char, qualquer "mesmo char + ângulo X" |
| Nano Banana 2 | Newer, possivelmente sem Pro tier | Backup se Pro falhar |
| Imagen 4 | Raw photorealism, prompts sem ref | Anchor inicial sem ref, biome wide-shots |
| Veo (tab Vídeo) | Vídeo / motion | 360° turnaround, combat moments |

### Workflow canonical

```
Anchor (Imagen 4 ou Nano Banana Pro)
  ↓
Refinement variants se necessário (Nano Banana Pro + ref)
  ↓
Static poses — uma imagem por pose (Nano Banana Pro + upload anchor)
  ↓
Vídeo turnaround (Veo) — gasta créditos, fazer no fim
  ↓
Frame extraction (Swift+AVFoundation) → bonus pose refs
  ↓
Sprite sheets (Phase 10, Aseprite)
```

### Correções

Pose com defeito? **Upload da pose problemática + edit instruction** no
Nano Banana Pro. Não regenerar do zero. Flow trata o projeto como contexto
contínuo — vantagem grande sobre Gemini Pro Imagem.

### Aspect ratios recomendados

- **3:4** — character full-body (anchor, poses, turnaround)
- **16:9** — biome wide-shots, cinematic
- **1:1** — portraits / icons UI

## Style anchor (cole isto no início de TODO prompt de personagem)

```
A 2D anime-style character illustration in the visual language of early
2000s Korean MMORPGs (Grand Chase, Ragnarok Online, MapleStory). Bold
clean black lineart, cel-shaded coloring with crisp shadow shapes,
vibrant saturated palette, slight chibi-leaning anatomy (head ~1/6 of
body height, expressive large eyes). Adventurous high-fantasy tone with
a youthful shounen energy. Full body composition, plain neutral
cream/beige background as in a character reference sheet. No watermarks,
no text overlay.
```

## World — Eternia (the party)

**Eternia** não é o nome do continente — é o nome da própria **party** de
heróis (igual "Grand Chase" no GC original).

### Frame inicial (refinar em 9.G)

- Existe um continente (nome TBD) onde tudo se passa.
- Algo desestabilizou a paz: TBD (artefato roubado? rei desaparecido?
  criatura ancestral? dimensão se rompendo?).
- Heróis de origens diferentes — knight, archer, mage, spell-knight — se
  cruzam no caminho da quest e formam a Eternia.
- Tom narrativo: high-fantasy adventure, leve shounen, com momentos
  íntimos entre os personagens.

McGuffin ("the [...] they hunt") fica em aberto até 9.G. Definição vem
após cast principal ter bibles fechadas.

## Cast

Cast atual em `client/src/data/characters.ts`: `astrid` (available),
`naia` / `slot3` / `slot4` (locked).

| Slot | Char | Classe | Status | Doc |
|---|---|---|---|---|
| 1 | Astrid | Knight | Anchor LOCKED, paused | [`09b-astrid.md`](./09b-astrid.md) |
| 2 | Naia | Elven Archer | **Active** — pipeline validation | [`09a-naia.md`](./09a-naia.md) |
| 3 | ? | Mage | TBD | (pendente) |
| 4 | ? | Spell Knight | TBD | (pendente) |

## Frame extraction helper

Reusável pra qualquer vídeo de turnaround. Salvar como
`/tmp/extract_frames.swift`:

```swift
import Foundation
import AVFoundation
import AppKit

let videoPath = CommandLine.arguments[1]
let outDir = CommandLine.arguments[2]
let prefix = CommandLine.arguments[3]
let url = URL(fileURLWithPath: videoPath)
let asset = AVURLAsset(url: url)

let sem = DispatchSemaphore(value: 0)
var dur = CMTime.zero
Task { dur = (try? await asset.load(.duration)) ?? .zero; sem.signal() }
sem.wait()
let durSec = CMTimeGetSeconds(dur)

let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero

try? FileManager.default.createDirectory(
  atPath: outDir, withIntermediateDirectories: true)

let angles: [(String, String, Double)] = [
  ("000", "front",      0.05),
  ("045", "front-3q-r", durSec * 0.125),
  ("090", "side-r",     durSec * 0.25),
  ("135", "back-3q-r",  durSec * 0.375),
  ("180", "back",       durSec * 0.5),
  ("225", "back-3q-l",  durSec * 0.625),
  ("270", "side-l",     durSec * 0.75),
  ("315", "front-3q-l", durSec * 0.875),
]
for (deg, label, t) in angles {
  let cmt = CMTime(seconds: t, preferredTimescale: 600)
  if let cg = try? gen.copyCGImage(at: cmt, actualTime: nil) {
    let img = NSImage(cgImage: cg, size: NSSize(width: cg.width, height: cg.height))
    if let tiff = img.tiffRepresentation,
       let rep = NSBitmapImageRep(data: tiff),
       let png = rep.representation(using: .png, properties: [:]) {
      let p = "\(outDir)/\(prefix)-\(deg)-\(label).png"
      try? png.write(to: URL(fileURLWithPath: p))
      print("WROTE \(deg)°")
    }
  }
}
```

Uso:

```bash
swift /tmp/extract_frames.swift \
  art/videos/<char>.mp4 \
  art/poses/<char> \
  <char>
```

> Rotação no Veo é não-linear — Veo desacelera nos pontos front/back e
> acelera nas transições. Os labels (`090-side-r`, `270-side-l`) são
> aproximações. Side puros (90°/270°) podem precisar gen dedicado no Nano
> Banana Pro.

## Prompt anatomy (template reusável)

```
[STYLE ANCHOR — paragraph fixo acima]

CHARACTER: [nome, idade, gênero, personalidade-em-1-frase, build]
HAIR: [cor, comprimento, estilo, detalhes]
EYES: [cor, formato]
OUTFIT: [peças, cores, materiais, accessories]
POSE: [orientação, ângulo, posição mãos/pernas, expressão]
WEAPON / PROPS: [armas, itens, accessories visíveis]
LIGHTING: [direção, mood]
OUTPUT: [framing, background, aspect ratio]
```

## Iteration tips (Flow-era)

- **Save anchors + key iterations**: ajuda a debugar drift e voltar a
  versões boas.
- **Don't trust hands**: AI gens com armas/punhos sempre bugam. Limpamos
  manualmente em Aseprite na Phase 10.
- **POSE LOCKED**: ao gerar turnaround/views, especificar exatamente onde
  cada braço/mão/perna está. Senão modelo improvisa.
- **Verifique handedness da arma na anchor antes** de descrever os outros
  views — se o anchor tem bow na direita, manter direita em todos.
- **Bleed-over de char**: NÃO uploadar anchor de char A quando estiver
  gerando char B. Mesmo "use only as style reference" pode falhar e
  regenerar A. Solução: prompt-only pro primeiro anchor de cada char novo.

## Próximas decisões pendentes

- [ ] Naia archer combat kit (rascunho em `09a-naia.md` — refinar antes de
      Phase 10)
- [ ] Slot 3 arquétipo: Mage (light caster) ou Battle-Mage?
- [ ] Slot 4 arquétipo: Spell Knight ou diferente?
- [ ] Continente do jogo (nome)
- [ ] McGuffin da quest (o que a Eternia caça?)
- [ ] Mob style language — diferente de char mas mesma "world look"

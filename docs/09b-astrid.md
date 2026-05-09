# 09.B — Astrid (paused character)

> **Status 2026-05-07**: PAUSED. Pivot estratégico pra **Naia-first** —
> validamos pipeline inteiro com a Naia (anchor → poses → vídeo →
> sprites → ingame archer kit) antes de retomar Astrid.
>
> Anchor + turnaround LOCKED ficam preservados. Quando voltar, redo
> turnaround usando o pipeline novo (Flow + Veo + frame extract).

Index canonical: [`09-art-bible.md`](./09-art-bible.md). Active char:
[`09a-naia.md`](./09a-naia.md).

## Bible (LOCKED)

| Campo | Valor |
|---|---|
| Nome | Astrid |
| Classe (1ª) | Knight (espadachim de uma mão) |
| Idade | 17 |
| Build | esguia atlética, ~165 cm |
| Personalidade | confiante, impulsiva, fierce. Sorrindo de canto, olhar acesso. Líder por não esperar autorização. |
| Cabelo | crimson-scarlet, **low ponytail** curto (não high ponytail Elesis) |
| Olhos | vermelhos |
| Arma | **espada asiática** (katana/wakizashi-style, dark scabbard) na bainha esquerda. Quebra padrão "knight com longsword reta" — swordswoman híbrida oriente-ocidente |
| Origem (TBD) | filha de cavaleiro caído / sobrevivente de aldeia destruída / fugitiva de ordem disciplinada |

Contraste narrativo: Astrid impulsiva ↔ Naia calma observadora.

## "Base/nude" outfit (LOCKED — 1ª classe)

Two-tone breaking the Elesis red+white default:

- **Bodysuit** crimson torso, black sleeves, scarlet leggings (high-collar
  sleeveless top + black under-sleeves)
- **Bronze/copper armor accents** matte: pauldrons, cotovelos, joelhos,
  bracers
- **Botas** vermelhas com bronze band
- **Earring asimétrico** (gem stud + dangling chain)
- **Katana** sheathed (black lacquered scabbard, white diamond-wrap hilt,
  round bronze tsuba) na bainha esquerda

## Classes futuras (placeholder, Phase 10+ ou nunca)

- Knight (1ª — atual): bodysuit + leve placa peitoral + ombreiras bronze
- Sword Master (2ª): armadura mais pesada, capa
- Berserker (3ª): muscular, armadura quebrada/agressiva, espada maior

Por agora, focar APENAS na 1ª classe (base).

## Anchor + Turnaround LOCKED ✓

- Master front anchor: **`art/anchors/astrid-anchor.png`**
- 4-angle turnaround: **`art/anchors/astrid-turnaround.png`**

⚠️ **Turnaround com quality issues**: proporções desproporcionais entre
views, lighting inconsistente, pose levemente diferente entre views. Foi
"aceito" v5 por timing, mas vai ser **redo no pipeline novo (Flow + Veo
360° pivot + frame extract)** quando Astrid sair do pause.

Histórico v2/v3 preservado:
- `art/anchors/astrid-v2.png` (4-variation grid, escolhemos var4)
- `art/anchors/astrid-v3.png` (4 close refinements, escolhemos v3a)

## Iteration log (curto)

- **2026-05-06**: v1 ficou idêntica à Elesis. Razão: prompt mencionou GC
  + red ponytail + knight skirt + red+white. Pivot pra 4-variation
  exploration (axes A/B/C/D).
- **2026-05-06**: v2 4-variation ✓. User escolheu **var4** — espada
  asiática + two-tone + bronze accents + low ponytail.
- **2026-05-06**: v3 refinement ✓. User escolheu **v3a** (esquerda).
- **2026-05-06**: v4 anchor canônico solo ✓ LOCKED.
- **2026-05-06**: v5 turnaround 4-angles ✓ aceito com ressalvas
  (proporções inconsistentes).
- **2026-05-07**: PAUSED por pivot estratégico Naia-first.

## Quando retomar (após Naia validar pipeline completo)

1. **Não regerar anchor** — está LOCKED, design fechado.
2. **Redo turnaround**: vídeo 360° pivot no Flow (Veo) com upload do
   anchor → 8 keyframes via Swift+AVFoundation → substituir
   `astrid-turnaround.png` pelos frames extraídos.
3. **Pose sheets**: replicar lista da Naia adaptada pro kit melee Knight
   (combo Z 1/2/3, S1/S2/S3, dash atk, jump atk, parry stance, charge-Z
   counter, dodge, hurt, death).
4. **Sprite sheets**: Phase 10.

## Status

- ✅ Bible LOCKED
- ✅ Anchor LOCKED
- ⚠️ Turnaround LOCKED com ressalvas (redo via vídeo planejado)
- ⏸️ Pose sheets — pausado
- ⏸️ Sprite sheets — pausado
- ⏸️ Ingame implementation — Astrid já tá ingame com primitivas;
  upgrade pra sprites é Phase 10

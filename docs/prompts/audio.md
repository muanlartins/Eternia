# ElevenLabs — Audio prompts (BGM + SFX)

> Tudo via [ElevenLabs](https://elevenlabs.io). Eles têm 2 produtos:
> - **Music** (`elevenlabs.io/app/music`) — gera faixas instrumentais
>   1-3min com prompt em texto. Use pra BGM.
> - **Sound Effects** (`elevenlabs.io/app/sound-effects`) — gera SFX
>   curtos (0.5s a 22s) com prompt em texto. Use pra todos os efeitos.
>
> **Pasta de saída:**
> ```
> client/src/assets/audio/
> ├── bgm/
> │   ├── forest-explore.mp3
> │   ├── forest-combat.mp3
> │   └── ...
> └── sfx/
>     ├── bow-shoot.wav
>     ├── arrow-hit-flesh.wav
>     └── ...
> ```
>
> **Formato:**
> - BGM: MP3 (ElevenLabs exporta direto). 192kbps+ é OK.
> - SFX: WAV preferível (sem compressão), MP3 também serve.
>
> **Workflow:**
> 1. Cola cada prompt no campo do site
> 2. Gera, escolhe a melhor variação
> 3. Baixa com filename exato (case sensitive)
> 4. Drop em `client/src/assets/audio/<bgm|sfx>/`
> 5. Me avisa quando lote estiver pronto — eu codigo a integração com
>    o Web Audio API (já existe infra da Phase 5.D em `src/audio/`)

---

## BGM — instrumentais ambient (ElevenLabs Music)

> **Settings universais para BGM:**
> - Vocals: **OFF / Instrumental Only**
> - Length: **2 minutos** (loops melhor que ~30s; podemos cortar/loopar
>   no engine se sobrar)
> - Quality: **High**

### 1. `forest-explore.mp3` — Floresta calma (gameplay sem combate)

```
Calm ambient forest soundtrack for an elven fantasy adventure game.
Acoustic harp arpeggios, soft woodwinds (flute, recorder), gentle
sustained strings (cello, viola pad). No drums or percussion. Slow
tempo around 70-80 BPM. Key: A minor or D dorian. Mood: peaceful,
mystical, golden-hour-in-the-woods, slightly melancholic but hopeful.
Think Studio Ghibli forest scenes (Mononoke, Totoro), early Zelda OST,
World of Warcraft Elwynn Forest. INSTRUMENTAL ONLY, no vocals, no
human voice. Loopable structure with no hard ending.
```

### 2. `forest-combat.mp3` — Floresta em combate (durante luta)

```
Energetic but melodic combat soundtrack for an elven fantasy game.
Driving acoustic + light electric guitar, fast harp arpeggios, taiko-
ish drums (light, woodland feel — not war drums), bright woodwinds
carrying a heroic melody. Tempo around 130-140 BPM. Key: D minor or
A minor. Mood: adventurous, urgent but not grim, like a chase through
the canopy at sunset. References: Grand Chase battle themes,
Ragnarok Online combat themes, Genshin Impact Mondstadt battle music.
INSTRUMENTAL ONLY, no vocals. Loopable.
```

### 3. `menu-ambient.mp3` — Menu / lobby / character select / RoomLobby

```
Quiet ambient track for a fantasy game's menu and lobby screens.
Long-sustained string pad, soft harp plucks every few seconds, faint
woodwind held notes drifting in and out, light wind/forest ambient
texture in the background. Very slow tempo, almost timeless. Key:
G major (warm, peaceful). Mood: contemplative, anticipation before
adventure, "calm before the journey." Around 2 minutes, loopable.
INSTRUMENTAL ONLY, no vocals.
```

### 4. `mission-select.mp3` — Mapa-mundo (MissionSelect)

```
Mystical world-map theme for a fantasy game's mission select screen.
Cinematic but quiet — soft orchestral pad, distant celtic harp,
occasional ethnic flute (Irish whistle or shakuhachi-adjacent), faint
heart-beat-slow taiko in the deep background. Tempo: very slow, around
60-70 BPM. Key: minor (D minor or B minor). Mood: epic but
contemplative, "choosing your path," ancient and mysterious. Loopable
2 minutes. INSTRUMENTAL ONLY, no vocals.
```

---

## SFX — efeitos curtos (ElevenLabs Sound Effects)

> **Settings:**
> - Duration: 1-3 segundos (default), até 5s para alguns
> - Variations: gera 2-3 e escolhe a melhor

### Player (Naia, archer kit)

#### `bow-draw.wav` — Carregar arco (charge)
```
Wooden bow string being drawn back, slow tension, 1.5 seconds long,
fantasy game sound effect, dry creak of wood + tense fiber stretch
```

#### `bow-shoot.wav` — Atirar flecha
```
Wooden bow firing an arrow, sharp release, fantasy game sound effect,
quick "thwip" of fiber + brief whoosh of arrow leaving string,
0.5 seconds, dry and clean
```

#### `arrow-flight.wav` — Flecha voando (whoosh)
```
Single arrow flying through air, soft whoosh, fantasy game sound
effect, 0.4 seconds, no impact at the end
```

#### `arrow-hit-flesh.wav` — Flecha acerta carne
```
Arrow striking flesh of a fantasy creature, wet thud impact + brief
gasp/grunt, 0.6 seconds, fantasy game sound effect, NOT gory
```

#### `arrow-hit-wood.wav` — Flecha acerta madeira/pedra
```
Arrow striking wood, sharp solid thunk, 0.4 seconds, fantasy game
sound effect, dry impact
```

#### `footstep-grass-1.wav` / `footstep-grass-2.wav` / `footstep-grass-3.wav`
```
Single light footstep on grass and moss, leather boot, fantasy
character, 0.3 seconds, soft and natural
```
(Gera 3 variações pra alternar in-game e evitar repetição.)

#### `jump.wav` — Pulo
```
Light cloth + leather rustle of a fantasy character jumping up,
brief whoosh, 0.4 seconds, no foot impact (just the leap)
```

#### `land.wav` — Aterrissagem
```
Soft thud of fantasy character landing on grass/moss after a jump,
slight cloth flutter, 0.5 seconds
```

#### `dash.wav` — Dash
```
Quick whoosh of cloth + air rush of fantasy character dashing,
0.4 seconds, swift and light
```

#### `roll-dodge.wav` — Rolagem de esquiva
```
Cloth and leather tumble of fantasy character rolling on the ground,
soft and quick, 0.5 seconds
```

#### `parry-clang.wav` — Parry bem-sucedido
```
Sharp metallic ping/clang of a successful parry, bright high-pitched
ring with a brief sparkle decay, 0.6 seconds, fantasy game sound effect
```

#### `hit-taken-grunt.wav` — Naia toma dano
```
Light feminine grunt of pain, single "agh" or "ngh", fantasy elf
warrior, 0.4 seconds, NOT a scream
```

#### `naia-death.wav` — Naia cai (KO)
```
Soft feminine gasp + cloth tumble of a fantasy elf falling unconscious,
gentle, 0.8 seconds, NOT graphic, suggests "down but not gone"
```

### Mobs — Forest Sprite

#### `sprite-jab.wav` — Forest Sprite ataca
```
Quick crystal dagger swipe, light ethereal whoosh + brief metallic
shimmer, fantasy game sound effect, 0.4 seconds
```

#### `sprite-hop.wav` — Forest Sprite pula entre posições
```
Tiny insect-wing flutter + soft jingle, fantasy fey creature hopping,
0.3 seconds, light and dainty
```

#### `sprite-hit.wav` — Acertar Forest Sprite
```
Soft crystalline impact, like striking glass shards, brief shimmer,
0.4 seconds, fantasy game sound effect
```

#### `sprite-death.wav` — Forest Sprite morre
```
Ethereal dissipation, glass-like shimmer fading + soft sigh, 0.8
seconds, fantasy game sound effect, "spirit returning to nature"
```

### Mobs — Bramble Beast

#### `beast-thorn-launch.wav` — Bramble Beast lança thorns
```
Wooden creak + sharp wood-on-wood crack of plant creature launching
thorns, 0.5 seconds, fantasy game sound effect, organic and natural
```

#### `beast-step.wav` — Bramble Beast caminha (stomp leve)
```
Heavy wooden stomp on forest floor, root-creature footstep, 0.4
seconds, fantasy game sound effect, dense and organic
```

#### `beast-hit.wav` — Acertar Bramble Beast
```
Solid thunk on dense wood + faint root-snap, 0.4 seconds, fantasy
game sound effect, satisfying impact
```

#### `beast-death.wav` — Bramble Beast morre
```
Wooden creature collapsing — splintering wood, leaves rustling,
final low groan, 1.2 seconds, fantasy game sound effect, organic
```

### Stage / atmosphere

#### `victory-sting.wav` — Stage clear / vitória (sting curto)
```
Short triumphant victory fanfare, bright acoustic harp glissando +
soft woodwind flourish + warm brass swell ending on a major chord,
hopeful and golden, fantasy game stage clear sound, 6 seconds,
decisive ending, NO vocals, INSTRUMENTAL only
```

#### `defeat-sting.wav` — Game over / derrota (sting curto)
```
Short somber defeat sting, single mournful cello phrase descending
into a low piano chord with a faint distant horn, melancholic and
gentle (not despairing — "rest and try again" feel), fantasy game
game-over sound, 5 seconds, NO vocals, INSTRUMENTAL only
```

#### `stage-intro.wav` — Banner de início de stage
```
Bright fantasy chime + soft horn fanfare, 1.5 seconds, hopeful and
adventurous, "the journey begins" feel
```

#### `stage-clear.wav` — Stage clear (estágio terminado)
```
Triumphant celtic harp glissando + woodwind chord, 1.5 seconds,
warm and bright, "victory" feel
```

#### `portal-open.wav` — Portal de progressão abre
```
Magical shimmering hum building up, ethereal chime, fantasy portal
opening, 1.5 seconds, slightly mystical
```

### UI

#### `ui-hover.wav` — Hover em botão
```
Tiny magical sparkle, single high-pitched chime, 0.15 seconds,
delicate
```

#### `ui-click.wav` — Click em botão
```
Soft wood-on-wood tap + brief shimmer, 0.2 seconds, fantasy UI sound
```

#### `ui-confirm.wav` — Confirmar ação importante (start match, etc.)
```
Bright magical chord + soft chime, fantasy UI confirmation, 0.5
seconds, decisive and pleasant
```

#### `ui-cancel.wav` — Cancelar / voltar
```
Soft descending wooden tone, fantasy UI back/cancel, 0.3 seconds,
gentle dismissal
```

#### `card-pickup.wav` — Pegar buff/modifier card
```
Magical card flutter + bright shimmer + soft chord swell, fantasy
game sound effect, 0.6 seconds, exciting pickup feel
```

---

## Iteração / dicas

- **ElevenLabs Music gera 2 variações por prompt** — escolhe a que mais
  bate com a vibe.
- **Se a faixa tiver "vocais escondidos"** (humming, whispers), regenerá
  e seja mais explícito: `"NO vocals, NO human voice, NO singing,
  NO humming"` no fim do prompt.
- **SFX que ficou genérico** — adicione referência: `"like Genshin Impact
  bow attack"` ou `"like Hollow Knight nail strike"`. ElevenLabs pega
  bem essas dicas.
- **Loopabilidade** — pra BGM, peça explicitamente "loopable structure
  with no hard ending". Se o final tiver fade, dá pra cortar no engine.

## Checklist antes de mandar pra mim

- [ ] Filename EXATO conforme listado (lowercase, hyphens, .mp3 ou .wav)
- [ ] Pasta certa (`bgm/` ou `sfx/`)
- [ ] BGM: instrumental confirmado (sem voz)
- [ ] SFX: duração razoável (não passe muito do recomendado)
- [ ] Tudo numa pasta zipável ou rolando aos poucos? Eu integro do jeito
  que você preferir.

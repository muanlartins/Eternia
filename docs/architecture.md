# Eternia — Architecture

> Snapshot of the current code shape, post-cleanup pass (2026-05-09).
> If something here drifts from the source, the source wins — fix this
> doc in the same commit.

## Top-level layout

```
Eternia/
├── client/                  # browser game (TS + Pixi + Three)
│   ├── src/
│   │   ├── main.ts          # game entry — wires everything
│   │   ├── editor-main.ts   # standalone /editor.html entry
│   │   ├── data/            # static specs (mobs, stages, buffs, etc.)
│   │   ├── game/            # gameplay systems (player, mobs, stage, audio, network)
│   │   ├── three/           # Three.js layer + Naia model + editor
│   │   ├── ui/              # HTML overlay screens + tokens
│   │   └── assets/          # imported via Vite (audio, art, models)
│   ├── public/
│   │   └── models/          # served as-is (3D character GLBs)
│   ├── art/                 # source images / Tripo input archive (not loaded)
│   ├── index.html           # game entry HTML
│   ├── editor.html          # editor entry HTML
│   └── vite.config.ts       # plus dev plugin to save Naia prop offsets
├── server/                  # Go WebSocket + REST server
└── docs/
```

## Render pipeline

The game has **three stacked layers**, all sized to the logical 1024×576
stage which is then scaled to fill the viewport via CSS transform.

```
┌─ HTML overlay (uiStage / ui-overlay) ─ login, charselect, hud, victory, menu
├─ Three.js canvas ─────────────────── Naia + 3D mob models, toon + outline
├─ Pixi canvas (worldStage + bgStage) ─ background, mobs (primitive fallback), projectiles, hitfx
└─ #stage (1024×576) inside #viewport
```

- **Pixi `bgStage`**: `Background` paints either `TilingSprite` parallax
  (forest palette) or procedural sky/stars/silhouettes (other palettes).
- **Pixi `worldStage`**: ground tiles + platforms (forest art via
  `Forest.ts`), mob/player/projectile views, HitFx popups.
- **Three.js layer** (`GameThreeLayer`): orthographic camera matched to
  Pixi viewport in meters (`PIXEL_TO_METERS = 1.7 / 96`). Loads Naia
  GLB + per-mob GLB on demand, applies toon shading + cel outline.
- **HTML overlay** (`#ui-overlay`): every UI screen lives here (Login,
  CharacterSelect, MissionSelect, RoomList, RoomLobby, Hud, BossHpBar,
  MiniMap, MenuScreen, CardPick, VictoryStats). The legacy Pixi versions
  were deleted in 2026-05-09.

## Per-frame sequence (`app.ticker.add(...)` in `main.ts`)

1. Drain input + dispatch screen-priority guards (Login → CharSelect → Lobby → RoomLobby → MissionSelect → Menu).
2. `Player.update(dtMs, input, platforms)` — physics + state machine + buffer arrows.
3. Resolve player↔mob collisions, player active-hit ↔ mob hurtboxes, projectiles ↔ everything.
4. `Stage.update(dtMs)` — mob AI ticks (host-only in co-op), portal pulse.
5. Multiplayer broadcast: player state every 50 ms, mob states every 50 ms (host).
6. `Camera.follow + update`.
7. `Background.update(camOffset)` — parallax tile shift.
8. If Naia 3D loaded, `gameThreeLayer.sync + syncMobs + render`.
9. HUD update (HTML), boss HP bar visibility, minimap toggle.

## Module map (`client/src/game/`)

- **`Audio.ts`** — single `GameAudio` class. Web Audio bus (master /
  bgm / sfx GainNode). BGM via `HTMLAudioElement → MediaElementSource`.
  SFX via `AudioBuffer` preloaded once on init. File-based only —
  procedural fallback was removed.
- **`Auth.ts`** — REST client + localStorage session. Login, run save,
  leaderboard, room CRUD.
- **`Background.ts`** — Pixi background. TilingSprite parallax for
  forest palettes, procedural Graphics for others.
- **`Camera.ts`** — lerp follow + screen shake.
- **`Forest.ts`** — Vite-imported floresta sprite registry.
  `loadForestArt()` preloads 11 textures; `forestTexture(key)` is a sync
  accessor. Helpers `platformVariantFor(w,h)` + `groundVariantFor(seed)`.
- **`HitFx.ts`** — popup numbers (damage, parry, aerial, backstab tags)
  + spark particles.
- **`Input.ts`** — keyboard handler, axis + held + just-pressed +
  double-tap detection.
- **`Mob.ts`** — AI state machine (Idle/Chase/Telegraph/Active/Recover/
  Hurt/Dead). Phase 2 boss math, parry-stun, host-side serialization,
  remote interpolation. `setRenderingHidden()` lets the 3D layer hide
  the Pixi body when a model3DUrl exists.
- **`Network.ts`** — WebSocket client. JSON message dispatch, auto
  reconnect, room enter/leave, hit + projectile broadcast.
- **`Player.ts`** — full character controller. State machine 21 states.
  Charge-Z counter (knight only), parry buff, dodge bar, archer arrow
  spawning, modifier-aware damage.
- **`Projectile.ts`** — gravity-aware physics, pierce count, owner tag,
  arrow vs rect visual.
- **`Records.ts`** — localStorage personal bests + lifetime totals.
- **`RemotePlayer.ts`** — ghost render of co-op peer. Dead-reckoning
  capped at 250 ms, lerp toward latest received state.
- **`Stage.ts`** — owns mobs + projectiles + platforms + portal +
  ground tile band + walls. Spawns from `data/stages.ts` definitions.

## Three.js layer (`client/src/three/`)

- **`GameThreeLayer.ts`** — game-time renderer. Loads Naia GLB once,
  per-mob GLB on demand cached + cloned via `SkeletonUtils.clone`.
  Camera follows Pixi camera. `syncMobs()` diffs mob list each frame
  and adds/removes 3D entries. Dead mob → fully detached (no visibility
  toggle) to avoid OutlineEffect ghost frames.
- **`naia-model.ts`** — Naia-specific transforms. Head scale 1.3
  (anime semi-chibi). Bow + glasses GLBs parented to bones using
  offsets from `naia-props-offsets.json`. Bowstring is a procedural
  cylinder spanning the bow's local bbox (with optional saved override).
- **`procedural-anims.ts`** — bone-keyframe authoring helpers. Idle
  clip currently active; walk/jump/shoot/hit are stubs awaiting Tripo
  rig anims.
- **`three-utils.ts`** — toon material helpers (cel ramp + outline).
- **`Character3DPortrait.ts`** — used by CharacterSelect + RoomLobby
  to render a draggable 3D portrait. Matches GameThreeLayer aesthetic
  (toon + outline).
- **`ThreePilot.ts`** — standalone editor (`/editor.html`). Loads any
  GLB/FBX, applies toon, lets you drag bones with TransformControls,
  saves prop offsets via dev middleware.

## UI layer (`client/src/ui/`)

Every screen is HTML + scoped CSS modules. They mount into `#ui-overlay`
or fullscreen and toggle via `dataset.visible`. Game ticker checks each
screen's visibility and skips the run loop while one is open.

- `screens/Login`, `CharacterSelect`, `MissionSelect`, `RoomList`,
  `Lobby`, `RoomLobby`, `Hud`, `BossHpBar`, `MiniMap`, `MenuScreen`,
  `CardPick`, `VictoryStats`.
- `tokens.css` — CSS variables (palette, type scale, shadow, motion).

## Multiplayer (Tailscale alpha)

- WS dial → `enter_room` with token → server adds you to room ws fanout.
- **Host-authoritative**: only the host runs mob AI / physics. Host
  broadcasts `mob_states` 20 Hz. Joiner mirrors via `applyRemoteState`.
- **Damage sync**: joiner sends `player_hit`; host applies, broadcasts
  next mob_states. Optimistic local visuals on joiner side.
- **Projectile sync**: each spawn fires `projectile_spawn`. Other clients
  spawn a ghost projectile (hit detection skipped).
- Limitations: stage progression between stages may diverge — alpha
  scope is single-stage co-op.

## Audio system

- `GameAudio` constructor → loads settings from localStorage.
- `preloadSfxLibrary()` fires once on game init: `fetch + decodeAudioData`
  for every `*.wav` in `assets/audio/sfx/` (Vite glob import).
- BGM swap: `playBgm(id)` crossfades over 1.0 s in / 0.7 s out.
- All gain nodes route through `masterGain → ctx.destination` so
  master volume + mute apply globally.
- SFX volume boost map (`SFX_VOLUME_BOOST`) tunes individual samples
  without re-generating files (e.g., `beast-step` × 3.0).

## Asset pipeline

- **Backgrounds + foreground vines**: 16:9 JPEG, painted via Nano
  Banana Pro per `docs/prompts/floresta-stage-art.md`.
- **Platform + ground tiles**: PNG with white bg removed externally
  (user's pipeline). Platform variants picked by `(w, h)` heuristic;
  ground tiles by index seed (60/25/15 distribution).
- **3D character models**: Tripo image-to-3D from anchor + T-pose.
  Naia-specific transforms applied via `applyNaiaTransforms`. Bow +
  glasses are separate GLBs attached at bone level.
- **Audio**: ElevenLabs (BGM Studio for tracks, Sound Effects for SFX).
  Files dropped into `client/src/assets/audio/{bgm,sfx}/`.

## Editor (`/editor.html`)

Standalone page so editor inputs don't conflict with game keyboard
listeners. Mounts `ThreePilot` fullscreen. Used to:
- Load + inspect any GLB/FBX
- Apply toon shading
- Drag bones with TransformControls
- Save Naia prop offsets (writes `src/three/naia-props-offsets.json`
  via the `naiaPropsDevSave` Vite middleware)
- Test procedural anim clips

## What was deleted in 2026-05-09 cleanup

| Removed | Reason |
|---|---|
| 12 Pixi UI screens (Hud, BossHpBar, MiniMap, BuffOffer, RunModifierOffer, VictoryStats, MenuScreen, LoginScreen, CharacterSelect, MissionSelect, LobbyScreen, RoomLobby) | HTML overlays took over |
| `TargetDummy.ts` | Test fixture, never used in current stages |
| Sprite plumbing in Player/Mob (`spriteTextures`, `setSpriteTextures`, `redrawSprite`) | 3D layer renders, sprites unused |
| `makePlaceholderTexture` + `naiaTextures` + `mobSprites` in main.ts | Same |
| `BGM_SPECS` + procedural BGM scheduler + procedural SFX fallbacks in Audio.ts | All BgmIds map to file URLs; SFX preloaded |
| `naia.fbx`, `naia-tripo.glb`, `public/models/anims/*.fbx` | Mixamo dead, replaced by Tripo + procedural anims |
| `assets/floresta/*.jpeg` for platform/ground tiles | PNG with cutout is what's loaded |
| All inline TS comments | User preference: code self-explains, docs go in `docs/` |

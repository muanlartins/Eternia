# 08 — Multiplayer (Tailscale alpha)

Setup de rede pra friends-only co-op via Tailscale. Phase 8 vai por 3 sub-fases:

| Sub-fase | Escopo | Status |
|---|---|---|
| **8.A** | Network test — Tailscale install + Vite bind 0.0.0.0 + verificar conectividade entre máquinas | implementado |
| **8.B** | Lobby UI — Solo / Create Public Room / Join by Code; mode flag em Room | implementado |
| **8.C** | Position presence — clients streamam player state via WS, render remote players como ghosts | implementado |

## 8.A — Tailscale network test

Goal: provar que uma segunda máquina (do user OU de um amigo) consegue
abrir o jogo servido pela primeira máquina, via IP da Tailscale, sem expor
nada à internet pública.

### Mudanças de código (já feitas)

`client/vite.config.ts`: `server.host: true` — Vite agora escuta em
`0.0.0.0:5173` em vez de `localhost:5173`. Sem isso, a segunda máquina
não consegue conectar.

`server/cmd/eternia-server/main.go`: já bind `:8080` (shorthand pra
`0.0.0.0:8080`). Nenhuma mudança.

`websocket.Upgrader.CheckOrigin: return true` — já permite qualquer origin.
Sem mudança.

## Tailscale — guia passo a passo

### O que é Tailscale (rápido)

Rede privada criptografada que conecta suas máquinas como se estivessem na
mesma LAN. Cada máquina ganha um IP (formato `100.x.y.z`). Tráfego é P2P
(direto entre máquinas) ou relayed quando NAT atrapalha. Friends-only,
sem expor portas publicamente.

### É um app, sim — mas tem CLI também

No macOS é o **app oficial da App Store** (recomendado) ou direto do site.
Quando instalado, ele instala automaticamente:
- App GUI (ícone no menu bar, top right da tela)
- CLI `tailscale` (em `/Applications/Tailscale.app/Contents/MacOS/`)

Pra uso normal você nem precisa abrir terminal — tudo pelo menu bar.

### Sobre conta — você TEM que separar do work

Tailscale chama a sua rede de "tailnet". Cada conta tem o seu tailnet —
suas máquinas + dispositivos compartilhados. **Tailnets são totalmente
isolados** — máquinas no tailnet do trabalho não veem o tailnet pessoal.

**Recomendação**: cria uma **conta pessoal separada** pra Eternia (e outras
coisas pessoais). Não mistura com o do trabalho.

Por que separar:
- Privacidade — admins do tailnet do trabalho podem ver seus devices
- Compliance — algumas empresas têm policy contra adicionar devices não-corporativos
- Friends — pra adicionar amigos no Eternia, eles precisariam ser adicionados ao tailnet… do trabalho. Não rola.

**Como criar conta pessoal**: vai em https://login.tailscale.com/start →
loga com Google/GitHub/Microsoft pessoal (não o do trabalho). Plano free
permite até 100 devices, 3 users — mais que suficiente.

### Tailscale macOS: switching entre work e pessoal

A app suporta múltiplas contas:
- Click no ícone Tailscale no menu bar
- "Use account…" ou "Switch account" → adiciona a segunda conta
- Você pode toggle entre work e pessoal a qualquer momento — só uma ativa por vez

Quando estiver desenvolvendo Eternia, switcha pra conta pessoal. Quando
voltar ao trabalho, switcha pra conta de trabalho.

### Setup na sua máquina (host do server)

1. Baixa Tailscale: https://tailscale.com/download/mac (ou App Store)
2. Drag pra `/Applications`, abre o app
3. Click "Log in" → escolhe sua conta pessoal
4. Aceita o auth no browser que abrir
5. Volta pro menu bar — agora aparece sua máquina com checkbox "Connected"
6. Anota o **IP da Tailscale** dessa máquina:
   - Click no ícone Tailscale → expande sua máquina → IP aparece (formato `100.x.y.z`)
   - OU pelo CLI: `/Applications/Tailscale.app/Contents/MacOS/Tailscale ip -4`

### Iniciar Eternia (no host)

```bash
cd ~/repos/grand-chase/Eternia/server && ./run        # terminal 1
cd ~/repos/grand-chase/Eternia/client && pnpm dev     # terminal 2
```

Vite vai imprimir algo como:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  Network: http://100.x.y.z:5173/        ← essa é o IP Tailscale
```

A segunda máquina vai usar a URL `Network` que tem `100.x.y.z`.

### Setup na segunda máquina (sua outra máquina ou do amigo)

1. Mesma coisa: baixa Tailscale, instala
2. **MESMA conta** que o host (sua conta pessoal)
3. Aprove no auth do browser
4. Devices na mesma tailnet automaticamente — sem ping/setup adicional

Pra testar conectividade básica antes de abrir o jogo:
```bash
ping 100.x.y.z   # IP da máquina-host
```
Se responder, conexão Tailscale OK.

### Abrir Eternia na segunda máquina

Abre no browser: `http://100.x.y.z:5173` (substitui pelo IP da máquina-host).

Deve aparecer a tela de login do Eternia. Login, character select, mission
select — tudo funciona. Run save é persistido no `data/eternia.json` da
máquina-host.

Se você criar um login com username diferente, segunda máquina será uma
"second user" no leaderboard. Útil pra ver leaderboard funcionando entre
máquinas.

### Convidando um amigo (sem precisar adicionar no seu tailnet)

Tailscale tem feature de "Share" — você compartilha um device específico
do seu tailnet com a conta de outra pessoa, sem dar acesso ao tailnet
inteiro:

1. https://login.tailscale.com/admin/machines → click sua máquina-host
2. "Share..." → cola o e-mail do amigo
3. Amigo recebe e-mail, clica no link, autentica na própria conta Tailscale
4. Agora a sua máquina-host aparece nos devices do amigo
5. Amigo abre `http://100.x.y.z:5173` no browser dele

Detalhe: a função "Share" exige que tanto você quanto seu amigo estejam
em planos Tailscale que permitam (Personal Pro / Free com limites). No
plano free dá pra compartilhar até 5 devices, suficiente.

### Pra testar somente API (sem browser)

Quer só verificar o server tá acessível sem abrir o jogo? Da segunda
máquina:
```bash
curl http://100.x.y.z:8080/health           # deve retornar "ok"
curl http://100.x.y.z:8080/api/leaderboard  # deve retornar JSON
```

### Common issues

**"This site can't be reached"** na segunda máquina:
- Tailscale ativo nas duas máquinas? Check menu bar icon.
- Mesmo tailnet? (mesma conta logada nas duas)
- Vite tá rodando com `host: true`? Verifica se ele imprimiu uma URL `Network: http://100.x.y.z:5173`
- Firewall macOS bloqueando? System Settings → Network → Firewall → permite Vite/Node se for o caso

**WebSocket connection failed** mas REST funciona:
- Vite proxy de `/ws` deve funcionar igual REST. Se não, adiciona `ws: true` no proxy (já tá lá)
- Browser DevTools → Network → WS → ver erros específicos

**Run save retorna 401** na segunda máquina:
- Cada máquina tem seu localStorage. O token do user é por-máquina. Tem que
  fazer login na segunda máquina pra obter token novo (vai criar/reusar
  user no server). Funciona como devices separados do mesmo user OU como
  users diferentes — sua escolha pelo username.

**Tailscale não conecta atrás do firewall corporativo**:
- Tailscale tem fallback DERP (relay) que funciona via HTTPS 443 — passa pela
  maioria dos firewalls. Geralmente automático.

### O que isso prepara (8.B / 8.C)

8.B vai adicionar UI de lobby (lista de rooms, create dialog, join-by-code).
Os endpoints REST de room já existem desde 7.C — só falta o frontend.

8.C é co-op gameplay — server-authoritative state, posições e mobs
sincronizados via WS. Exige refactor maior do game loop. Tailscale
continua sendo a transport — sem mudança.

### Acceptance criteria pra 8.A

Você abre Eternia da segunda máquina via `http://100.x.y.z:5173`, faz
login (qualquer username), pica char + mission, joga uma run, vê o save
no leaderboard. Server e client logs sem erros relevantes.

## 8.B — Lobby UI + room mode

Após CharacterSelect, agora aparece **LobbyScreen** com 3 opções:

```
+----------- LOBBY ------------+
|                              |
|   > Solo Run                 |
|     Create Public Room       |
|     Join Room by Code        |
|                              |
|   <description of selection> |
|                              |
|   ↑↓ select  ENTER confirm   |
+------------------------------+
```

**Solo Run**: caminho normal (player joga sozinho). Server cria room
com `mode='solo'`. Esse mode é INVISÍVEL no list de active rooms — não
aparece pra outros players.

**Create Public Room**: vai pra MissionSelect, escolhe mission/diff,
inicia. Server cria room com `mode='multiplayer'`. O code (6 chars)
aparece no HUD top-right pra player compartilhar.

**Join Room by Code**: text input pra 6 chars. ENTER joina. Server
retorna a room (com mission/difficulty já decididas pelo host). Client
pula MissionSelect e inicia a run direto com a config da room.

### Server changes

`Room` ganhou field `mode: "solo" | "multiplayer"`. `CreateRoom` aceita
mode (default "solo"). `ActiveRooms` filtra apenas multiplayer + active —
rooms solo são tracked no JSON mas não aparecem no list público.

### Client changes

- `LobbyScreen.ts` — novo overlay Pixi com state machine (menu / codeInput).
  Code input é via keypress (alfanumérico, max 6, uppercased).
- `Auth.createRoom(mission, difficulty, mode)` — `mode` agora obrigatório.
- `Auth.roomByCode(code)` — fetch info de uma room (não autenticado).
- `main.ts`: novo `startLobby(statusText?)` substitui `startMissionSelect`
  como entry point após char select / game over / victory. `startMissionSelect`
  agora aceita `(statusText, mode)` e é chamado a partir de lobby's onSolo
  ou onCreatePublic.

## 8.C — Position presence (player ghosts)

Players num mesmo room multiplayer veem a posição um do outro em
tempo real. Renderizado como "ghost" semitransparente com username
acima e barrinha de HP.

> Mob state e damage NÃO são sincronizados ainda. Cada client roda sua
> própria simulação. Co-op real (compartilhar mobs, dano comum) fica
> pra um 8.D futuro se quisermos.

### Server (Go)

Novo package `internal/hub/hub.go`:
- `Hub.Join(code, member)` — adiciona conn ao room, retorna lista de
  outros members (pra fazer roster initial)
- `Hub.Leave(conn)` — remove de qualquer room que tava
- `Hub.Broadcast(code, fromConn, payload)` — envia bytes pra todos os
  outros conns no mesmo room

`handleWS` (em main.go) agora dispatch baseado no `t` field:
- `hello` → reply (mantido pra Phase 0 compat)
- `enter_room` (com `code` + `token`) → autentica, registra no Hub, manda
  `room_roster` pro joiner com lista de outros, broadcast `remote_join`
  pros outros
- `leave_room` → broadcast `remote_leave` pros outros
- `player_state` (com `state` raw) → relay pra outros como `remote_state`

Cleanup: ao fechar a WS connection, o defer no handleWS chama
`Hub.Leave` + broadcast `remote_leave`.

### Client (TS)

`Network.ts` — abstração WS:
- Reconnect automático com exponential backoff (max 8s)
- Re-entra no room atual após reconnect (lembra `currentRoomCode` + token)
- Handlers: `onHello`, `onRoster`, `onRemoteJoin`, `onRemoteLeave`,
  `onRemoteState`, `onStatusChange`

`RemotePlayer.ts` — ghost rendering:
- Pixi Container com body rect (azulado, alpha 0.55), facing marker,
  username text acima, mini HP bar
- `applyState({x, y, vx, vy, facing, state, hp, maxHp})` — armazena
  target. `update(dtMs)` — lerp current → target (rate 18/s)
- Primeiro state recebido faz snap (sem lerp inicial)

main.ts:
- `remotePlayers: Map<userId, RemotePlayer>` — instância por player remoto
- Adicionados ao worldStage assim que recebido roster ou remote_join
- Removidos no remote_leave + ao trocar de room (`leaveCurrentRoom`)
- Send loop: a cada 100ms (10Hz), `net.sendPlayerState(...)` se em room
  multiplayer

### Limitations / TODO

- **No mob/dmg sync**: cada client mata seus próprios mobs. Em multiplayer,
  player A pode estar fighting boss enquanto player B vê só ghost dele
  parado. Aceitável pra alpha — co-op real precisa server-authoritative
  mob state, big lift.
- **Sem voice / chat**: não tem comunicação além de presence.
- **Sem matching/lobby browse**: room list não tá no UI ainda. Player
  entra via code compartilhado.
- **Reconnect rejoin**: se o WS cair, ao reconectar tenta re-enter no
  último room. Se a room já foi removida server-side, vai dar 404
  silencioso e player fica desconectado de presence (mas o jogo continua
  local).

### Pra testar de duas máquinas (via Tailscale)

1. Máquina A: lobby → Create Public Room → mission Forest, Normal → run inicia.
   HUD mostra `@alice · ABCDEF`.
2. Máquina B: abre `http://100.x.y.z:5173`, login como `bob`, char select,
   lobby → Join Room by Code → digita `ABCDEF` → ENTER. Run inicia
   com mesmo mission/diff.
3. Cada machine vê o outro player como ghost azul-translúcido movendo
   pelo mapa.
4. Cada um mata seus próprios mobs (não compartilhado). Mas posições
   sincronizadas em real-time.

### Acceptance criteria 8.B/8.C

- Da máquina A: criar room pública, ver code no HUD.
- Da máquina B: joinar via code, ver mesmo stage/mission.
- Mover na A, ver ghost se mexer na B (e vice-versa).
- Sair (gameover, logout, ou refresh) → ghost desaparece da outra máquina.

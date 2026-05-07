# 08 — Multiplayer (Tailscale alpha)

Setup de rede pra friends-only co-op via Tailscale. Phase 8 vai por 3 sub-fases:

| Sub-fase | Escopo | Status |
|---|---|---|
| **8.A** | Network test — Tailscale install + Vite bind 0.0.0.0 + verificar conectividade entre máquinas | implementado (config) / pendente (teste do user) |
| **8.B** | Lobby UI — listar rooms, create-room dialog, join-by-code, room presence | pendente |
| **8.C** | Co-op gameplay — sincronizar player position + mob state via WS | pendente |

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

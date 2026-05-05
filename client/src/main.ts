// Phase 0 — Foundation: hello-world Pixi v8 + WebSocket connection.
// No gameplay yet. Just proves the stack is alive.

import { Application, Graphics, Text } from 'pixi.js';
import type { ClientMessage, ServerMessage } from '@eternia/shared';

const GAME_W = 1024;
const GAME_H = 576;

async function main() {
  const app = new Application();
  await app.init({
    width: GAME_W,
    height: GAME_H,
    background: 0x0d1018,
    antialias: true,
  });

  const container = document.getElementById('game-container');
  if (!container) throw new Error('#game-container missing');
  container.appendChild(app.canvas);

  // Visual: simple animated logo + status text
  const logo = new Graphics();
  logo.circle(0, 0, 40).fill({ color: 0x9080ff, alpha: 0.9 });
  logo.x = GAME_W / 2;
  logo.y = GAME_H / 2 - 40;
  app.stage.addChild(logo);

  const title = new Text({
    text: 'ETERNIA',
    style: { fontFamily: 'sans-serif', fontSize: 48, fill: 0xddddff, letterSpacing: 8 },
  });
  title.anchor.set(0.5);
  title.x = GAME_W / 2;
  title.y = GAME_H / 2 + 30;
  app.stage.addChild(title);

  const status = new Text({
    text: 'connecting...',
    style: { fontFamily: 'monospace', fontSize: 14, fill: 0x777788 },
  });
  status.anchor.set(0.5);
  status.x = GAME_W / 2;
  status.y = GAME_H / 2 + 80;
  app.stage.addChild(status);

  // Simple animation loop
  app.ticker.add((time) => {
    logo.rotation += 0.005 * time.deltaTime;
  });

  // WebSocket hello
  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  const ws = new WebSocket(wsUrl);

  ws.addEventListener('open', () => {
    console.log('[ws] connected');
    const hello: ClientMessage = { t: 'hello', v: '0.0.1' };
    ws.send(JSON.stringify(hello));
  });

  ws.addEventListener('message', (e) => {
    try {
      const msg: ServerMessage = JSON.parse(e.data);
      console.log('[ws]', msg);
      if (msg.t === 'hello') {
        status.text = `server: ${msg.v} (t=${msg.serverTime})`;
      }
    } catch (err) {
      console.error('[ws] parse error', err, e.data);
    }
  });

  ws.addEventListener('close', () => {
    status.text = 'disconnected';
    status.style.fill = 0xff7777;
  });

  ws.addEventListener('error', (e) => {
    console.error('[ws] error', e);
    status.text = 'connection error - is server running on :8080?';
    status.style.fill = 0xff7777;
  });
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#f88">${err.stack ?? err}</pre>`;
});

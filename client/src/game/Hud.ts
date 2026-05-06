import { Container, Graphics, Text } from 'pixi.js';
import { ELESIS } from '../data/elesis.js';
import type { Player } from './Player.js';

const PADDING = 12;
const BAR_W = 200;
const BAR_H = 14;
const ROW_GAP = 8;
const DODGE_BOX_W = 18;
const DODGE_BOX_H = 8;
const DODGE_BOX_GAP = 4;
const SKILL_BOX_W = 26;
const SKILL_BOX_H = 26;
const SKILL_BOX_GAP = 6;

const SKILL_LABELS = ['A', 'S', 'D'];
const SKILL_COSTS = [25, 50, 75];

export class Hud {
  readonly container = new Container();

  private livesText: Text;
  private hpBg: Graphics;
  private hpFg: Graphics;
  private hpLabel: Text;
  private mpBg: Graphics;
  private mpFg: Graphics;
  private mpTicks: Graphics;
  private mpCursor: Graphics;
  private mpLabel: Text;
  private dodgeBoxes: Graphics;
  private dodgeLabel: Text;
  private parryBuffLabel: Text;
  private skillBoxes: Graphics;
  private skillKeyLabels: Text[] = [];
  private skillCdLabels: Text[] = [];
  private buffsLabel: Text;
  private stageInfoLabel: Text;
  private serverInfoLabel: Text;
  private runTimerLabel: Text;

  constructor(gameW: number) {
    let y = PADDING;

    this.livesText = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 20, fill: 0xff5577, fontWeight: 'bold' },
    });
    this.livesText.x = PADDING;
    this.livesText.y = y;
    this.container.addChild(this.livesText);
    y += 26;

    this.hpBg = new Graphics();
    this.hpBg.x = PADDING;
    this.hpBg.y = y;
    this.container.addChild(this.hpBg);

    this.hpFg = new Graphics();
    this.hpFg.x = PADDING;
    this.hpFg.y = y;
    this.container.addChild(this.hpFg);

    this.hpLabel = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 11, fill: 0xeeeeee },
    });
    this.hpLabel.x = PADDING + BAR_W + 8;
    this.hpLabel.y = y + 1;
    this.container.addChild(this.hpLabel);
    y += BAR_H + ROW_GAP;

    this.mpBg = new Graphics();
    this.mpBg.x = PADDING;
    this.mpBg.y = y;
    this.container.addChild(this.mpBg);

    this.mpFg = new Graphics();
    this.mpFg.x = PADDING;
    this.mpFg.y = y;
    this.container.addChild(this.mpFg);

    this.mpTicks = new Graphics();
    this.mpTicks.x = PADDING;
    this.mpTicks.y = y;
    this.container.addChild(this.mpTicks);

    this.mpCursor = new Graphics();
    this.mpCursor.x = PADDING;
    this.mpCursor.y = y;
    this.container.addChild(this.mpCursor);

    this.mpLabel = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 11, fill: 0xeeeeee },
    });
    this.mpLabel.x = PADDING + BAR_W + 8;
    this.mpLabel.y = y + 1;
    this.container.addChild(this.mpLabel);
    y += BAR_H + ROW_GAP;

    this.dodgeBoxes = new Graphics();
    this.dodgeBoxes.x = PADDING;
    this.dodgeBoxes.y = y;
    this.container.addChild(this.dodgeBoxes);

    const dodgeRowW = ELESIS.dodgeBarMax * (DODGE_BOX_W + DODGE_BOX_GAP) - DODGE_BOX_GAP;
    this.dodgeLabel = new Text({
      text: 'DODGE',
      style: { fontFamily: 'monospace', fontSize: 11, fill: 0xaaaaaa },
    });
    this.dodgeLabel.x = PADDING + dodgeRowW + 8;
    this.dodgeLabel.y = y;
    this.container.addChild(this.dodgeLabel);
    y += DODGE_BOX_H + ROW_GAP;

    this.parryBuffLabel = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 13, fill: 0xffd700, fontWeight: 'bold' },
    });
    this.parryBuffLabel.x = PADDING;
    this.parryBuffLabel.y = y;
    this.parryBuffLabel.visible = false;
    this.container.addChild(this.parryBuffLabel);
    y += 20;

    this.skillBoxes = new Graphics();
    this.skillBoxes.x = PADDING;
    this.skillBoxes.y = y;
    this.container.addChild(this.skillBoxes);

    for (let i = 0; i < 3; i++) {
      const x = PADDING + i * (SKILL_BOX_W + SKILL_BOX_GAP);
      const keyLbl = new Text({
        text: SKILL_LABELS[i]!,
        style: { fontFamily: 'monospace', fontSize: 14, fill: 0xeeeeee, fontWeight: 'bold' },
      });
      keyLbl.anchor.set(0.5, 0.5);
      keyLbl.x = x + SKILL_BOX_W / 2;
      keyLbl.y = y + SKILL_BOX_H / 2 - 1;
      this.container.addChild(keyLbl);
      this.skillKeyLabels.push(keyLbl);

      const cdLbl = new Text({
        text: '',
        style: { fontFamily: 'monospace', fontSize: 10, fill: 0xddddee },
      });
      cdLbl.anchor.set(0.5, 0);
      cdLbl.x = x + SKILL_BOX_W / 2;
      cdLbl.y = y + SKILL_BOX_H + 2;
      this.container.addChild(cdLbl);
      this.skillCdLabels.push(cdLbl);
    }
    y += SKILL_BOX_H + 16;

    this.buffsLabel = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0xaaaadd,
        wordWrap: true,
        wordWrapWidth: 280,
        lineHeight: 14,
      },
    });
    this.buffsLabel.x = PADDING;
    this.buffsLabel.y = y;
    this.container.addChild(this.buffsLabel);

    this.stageInfoLabel = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 13, fill: 0xddddee, fontWeight: 'bold' },
    });
    this.stageInfoLabel.anchor.set(0.5, 0);
    this.stageInfoLabel.x = gameW / 2;
    this.stageInfoLabel.y = PADDING;
    this.container.addChild(this.stageInfoLabel);

    this.runTimerLabel = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 11, fill: 0xaaaadd },
    });
    this.runTimerLabel.anchor.set(0.5, 0);
    this.runTimerLabel.x = gameW / 2;
    this.runTimerLabel.y = PADDING + 18;
    this.container.addChild(this.runTimerLabel);

    this.serverInfoLabel = new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 10, fill: 0x6b7280 },
    });
    this.serverInfoLabel.anchor.set(1, 0);
    this.serverInfoLabel.x = gameW - PADDING;
    this.serverInfoLabel.y = PADDING;
    this.container.addChild(this.serverInfoLabel);
  }

  update(opts: {
    player: Player;
    lives: number;
    maxLives: number;
    stageIdx: number;
    stageName: string;
    totalStages: number;
    aliveCount: number;
    serverInfo: string;
    runMs: number;
  }) {
    const { player, lives, maxLives, stageIdx, stageName, totalStages, aliveCount, serverInfo, runMs } = opts;

    this.livesText.text = '♥'.repeat(lives) + '·'.repeat(maxLives - lives);

    const hpPct = Math.max(0, Math.min(1, player.hp / player.getMaxHp()));
    this.hpBg.clear();
    this.hpBg
      .rect(0, 0, BAR_W, BAR_H)
      .fill({ color: 0x331111, alpha: 0.85 })
      .stroke({ color: 0xffffff, width: 1, alpha: 0.45 });
    this.hpFg.clear();
    if (hpPct > 0) {
      this.hpFg.rect(0, 0, BAR_W * hpPct, BAR_H).fill({ color: 0xff4455, alpha: 0.95 });
    }
    this.hpLabel.text = `HP ${Math.round(player.hp)}/${player.getMaxHp()}`;

    const mpPct = Math.max(0, Math.min(1, player.mp / ELESIS.maxMp));
    this.mpBg.clear();
    this.mpBg
      .rect(0, 0, BAR_W, BAR_H)
      .fill({ color: 0x112244, alpha: 0.85 })
      .stroke({ color: 0xffffff, width: 1, alpha: 0.45 });
    this.mpFg.clear();
    if (mpPct > 0) {
      this.mpFg.rect(0, 0, BAR_W * mpPct, BAR_H).fill({ color: 0x4488ff, alpha: 0.95 });
    }
    this.mpTicks.clear();
    for (const cost of SKILL_COSTS) {
      const x = (cost / ELESIS.maxMp) * BAR_W;
      this.mpTicks.rect(x - 0.5, -1, 1, BAR_H + 2).fill({ color: 0xffffff, alpha: 0.55 });
    }
    this.mpCursor.clear();
    if (player.chargingActive) {
      const cap = ELESIS.chargeTier3Ms;
      const progress = Math.min(1, player.chargingMs / cap);
      const cursorMp = progress * ELESIS.skills.s3.mpCost;
      const cursorX = (cursorMp / ELESIS.maxMp) * BAR_W;
      let cursorColor = 0xddddee;
      if (player.chargingMs >= cap) cursorColor = 0xff5544;
      else if (player.chargingMs >= ELESIS.chargeTier2Ms) cursorColor = 0xffaa44;
      else if (player.chargingMs >= ELESIS.chargeTier1Ms) cursorColor = 0xffe066;
      this.mpCursor
        .rect(cursorX - 1.5, -2, 3, BAR_H + 4)
        .fill({ color: cursorColor, alpha: 0.95 });
    }
    this.mpLabel.text = `MP ${Math.round(player.mp)}/${ELESIS.maxMp}`;

    this.dodgeBoxes.clear();
    const max = ELESIS.dodgeBarMax;
    const filled = Math.floor(player.dodgeBar);
    for (let i = 0; i < max; i++) {
      const x = i * (DODGE_BOX_W + DODGE_BOX_GAP);
      const isFilled = i < filled;
      this.dodgeBoxes
        .rect(x, 0, DODGE_BOX_W, DODGE_BOX_H)
        .fill({ color: isFilled ? 0x88eecc : 0x222233, alpha: 0.9 })
        .stroke({ color: 0xffffff, width: 1, alpha: 0.45 });
    }

    if (player.hasParryBuff()) {
      this.parryBuffLabel.text = `★ PARRY ×${ELESIS.parryBuffDamageMul.toFixed(1)}  ${(player.parryBuffMs / 1000).toFixed(1)}s`;
      this.parryBuffLabel.visible = true;
    } else {
      this.parryBuffLabel.visible = false;
    }

    this.skillBoxes.clear();
    for (let i = 0; i < 3; i++) {
      const x = i * (SKILL_BOX_W + SKILL_BOX_GAP);
      const cd = player.skillCooldowns[i]!;
      const isReady = cd <= 0;
      this.skillBoxes
        .rect(x, 0, SKILL_BOX_W, SKILL_BOX_H)
        .fill({ color: isReady ? 0x223355 : 0x332211, alpha: 0.9 })
        .stroke({ color: isReady ? 0x88aaff : 0x995533, width: 1, alpha: 0.95 });
      this.skillCdLabels[i]!.text = isReady ? '' : `${(cd / 1000).toFixed(1)}s`;
      this.skillKeyLabels[i]!.alpha = isReady ? 1.0 : 0.45;
    }

    this.buffsLabel.text =
      player.acquiredBuffs.length === 0
        ? ''
        : `buffs: ${player.acquiredBuffs.map((b) => b.name).join(', ')}`;

    this.stageInfoLabel.text = `STAGE ${stageIdx + 1}/${totalStages} — ${stageName}   ${aliveCount} mobs`;

    const totalSec = Math.floor(runMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    this.runTimerLabel.text = `${min}:${sec.toString().padStart(2, '0')}`;

    this.serverInfoLabel.text = serverInfo;
  }
}

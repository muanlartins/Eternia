import { Container, Graphics, Text } from 'pixi.js';
import type { BuffSpec } from '../data/buffs.js';

const CARD_W = 220;
const CARD_H = 280;
const CARD_GAP = 28;

export class BuffOffer {
  readonly container = new Container();
  private cards: Container[] = [];
  private currentOffers: readonly BuffSpec[] = [];

  constructor(gameW: number, gameH: number) {
    const totalW = CARD_W * 3 + CARD_GAP * 2;
    const startX = (gameW - totalW) / 2;
    const cardY = (gameH - CARD_H) / 2;

    const title = new Text({
      text: 'PICK A BLESSING',
      style: {
        fontFamily: 'monospace',
        fontSize: 22,
        fill: 0xfff066,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    title.anchor.set(0.5, 0.5);
    title.x = gameW / 2;
    title.y = cardY - 40;
    this.container.addChild(title);

    const hint = new Text({
      text: 'press 1, 2, or 3',
      style: {
        fontFamily: 'monospace',
        fontSize: 13,
        fill: 0xaaaadd,
      },
    });
    hint.anchor.set(0.5, 0.5);
    hint.x = gameW / 2;
    hint.y = cardY + CARD_H + 28;
    this.container.addChild(hint);

    for (let i = 0; i < 3; i++) {
      const card = this.makeCard();
      card.x = startX + i * (CARD_W + CARD_GAP);
      card.y = cardY;
      this.cards.push(card);
      this.container.addChild(card);
    }

    this.container.visible = false;
  }

  private makeCard(): Container {
    const c = new Container();
    const bg = new Graphics();
    bg.roundRect(0, 0, CARD_W, CARD_H, 14)
      .fill({ color: 0x1f2937, alpha: 0.95 })
      .stroke({ color: 0xfff066, width: 3, alpha: 0.85 });
    c.addChild(bg);
    return c;
  }

  show(offers: readonly BuffSpec[]) {
    this.currentOffers = offers;
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i]!;
      while (card.children.length > 1) {
        const child = card.removeChildAt(1);
        child.destroy();
      }
      const offer = offers[i];
      if (!offer) continue;

      const num = new Text({
        text: `[${i + 1}]`,
        style: {
          fontFamily: 'monospace',
          fontSize: 26,
          fill: 0xfff066,
          fontWeight: 'bold',
        },
      });
      num.x = 14;
      num.y = 14;
      card.addChild(num);

      const name = new Text({
        text: offer.name,
        style: {
          fontFamily: 'monospace',
          fontSize: 18,
          fill: 0xeeeeff,
          fontWeight: 'bold',
          wordWrap: true,
          wordWrapWidth: CARD_W - 24,
        },
      });
      name.x = 14;
      name.y = 90;
      card.addChild(name);

      const desc = new Text({
        text: offer.description,
        style: {
          fontFamily: 'monospace',
          fontSize: 13,
          fill: 0xaaaadd,
          wordWrap: true,
          wordWrapWidth: CARD_W - 24,
        },
      });
      desc.x = 14;
      desc.y = 160;
      card.addChild(desc);
    }
    this.container.visible = true;
  }

  hide() {
    this.container.visible = false;
  }

  getOffers(): readonly BuffSpec[] {
    return this.currentOffers;
  }
}

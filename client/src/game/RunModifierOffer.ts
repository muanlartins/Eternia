import { Container, Graphics, Text } from 'pixi.js';
import type { RunModifier } from '../data/modifiers.js';

const CARD_W = 240;
const CARD_H = 300;
const CARD_GAP = 24;
const BORDER = 0xb088ff;

export class RunModifierOffer {
  readonly container = new Container();
  private cards: Container[] = [];
  private currentOffers: readonly RunModifier[] = [];

  constructor(gameW: number, gameH: number) {
    const totalW = CARD_W * 3 + CARD_GAP * 2;
    const startX = (gameW - totalW) / 2;
    const cardY = (gameH - CARD_H) / 2;

    const title = new Text({
      text: 'CHOOSE YOUR PATH',
      style: {
        fontFamily: 'monospace',
        fontSize: 24,
        fill: BORDER,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    title.anchor.set(0.5, 0.5);
    title.x = gameW / 2;
    title.y = cardY - 44;
    this.container.addChild(title);

    const subtitle = new Text({
      text: 'pick a starting modifier — strong tradeoffs',
      style: {
        fontFamily: 'monospace',
        fontSize: 12,
        fill: 0xddddee,
      },
    });
    subtitle.anchor.set(0.5, 0.5);
    subtitle.x = gameW / 2;
    subtitle.y = cardY - 22;
    this.container.addChild(subtitle);

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
    c.addChild(bg);
    return c;
  }

  show(offers: readonly RunModifier[]) {
    this.currentOffers = offers;
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i]!;
      while (card.children.length > 1) {
        const child = card.removeChildAt(1);
        child.destroy();
      }
      const offer = offers[i];
      if (!offer) continue;

      const bg = card.children[0] as Graphics;
      bg.clear();
      bg
        .roundRect(0, 0, CARD_W, CARD_H, 14)
        .fill({ color: 0x1a1428, alpha: 0.95 })
        .stroke({ color: BORDER, width: 4, alpha: 0.95 });

      const num = new Text({
        text: `[${i + 1}]`,
        style: {
          fontFamily: 'monospace',
          fontSize: 28,
          fill: BORDER,
          fontWeight: 'bold',
        },
      });
      num.x = 16;
      num.y = 14;
      card.addChild(num);

      const name = new Text({
        text: offer.name,
        style: {
          fontFamily: 'monospace',
          fontSize: 20,
          fill: 0xeeeeff,
          fontWeight: 'bold',
          wordWrap: true,
          wordWrapWidth: CARD_W - 28,
        },
      });
      name.x = 16;
      name.y = 86;
      card.addChild(name);

      const desc = new Text({
        text: offer.description,
        style: {
          fontFamily: 'monospace',
          fontSize: 13,
          fill: 0xaaaadd,
          wordWrap: true,
          wordWrapWidth: CARD_W - 28,
          lineHeight: 18,
        },
      });
      desc.x = 16;
      desc.y = 160;
      card.addChild(desc);
    }
    this.container.visible = true;
  }

  hide() {
    this.container.visible = false;
  }

  getOffers(): readonly RunModifier[] {
    return this.currentOffers;
  }
}

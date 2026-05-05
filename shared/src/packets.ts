// Wire protocol between client and server. JSON over WebSocket for MVP.
// Migrate to binary later if latency demands.

export type ClientMessage =
  | { t: 'hello'; v: string }
  | { t: 'auth'; user: string; password: string }
  | { t: 'enter_stage'; questId: string; stageNum: number }
  | { t: 'input'; dx: -1 | 0 | 1; dy: -1 | 0 | 1; btns: number; frame: number }
  | { t: 'choose_buff'; buffId: string }
  | { t: 'leave' };

export type ServerMessage =
  | { t: 'hello'; v: string; serverTime: number }
  | { t: 'auth_ok'; userId: number; character: CharacterState }
  | { t: 'auth_fail'; reason: string }
  | { t: 'stage_start'; mobs: MobSpawn[]; mapId: string; bgmId: string }
  | { t: 'state_tick'; frame: number; mobs: MobUpdate[]; events: GameEvent[] }
  | { t: 'stage_end'; cleared: boolean; exp: number; gp: number; buffOffer: BuffCard[] }
  | { t: 'death' }
  | { t: 'error'; code: string; msg: string };

export type CharacterState = {
  id: number;
  name: string;
  characterType: 'elesis_1';
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  dodgeBar: number;
  dodgeMax: number;
  lives: number;
};

export type MobSpawn = {
  id: number;
  type: string;
  x: number;
  y: number;
  hp: number;
};

export type MobUpdate = {
  id: number;
  x: number;
  y: number;
  hp: number;
  state: 'idle' | 'walk' | 'attack' | 'damage' | 'dead';
  facing: 'left' | 'right';
};

export type GameEvent =
  | { kind: 'hit'; targetId: number; damage: number; crit: boolean; x: number; y: number }
  | { kind: 'kill'; targetId: number; x: number; y: number }
  | { kind: 'item_drop'; itemId: string; x: number; y: number }
  | { kind: 'sound'; soundId: string };

export type BuffCard = {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'legendary';
};

// Input button bitmask
export const BTN_ATTACK = 1 << 0;
export const BTN_JUMP = 1 << 1;
export const BTN_DODGE = 1 << 2;
export const BTN_SKILL_1 = 1 << 3;
export const BTN_SKILL_2 = 1 << 4;
export const BTN_SKILL_3 = 1 << 5;
export const BTN_DEFENSE = 1 << 6;

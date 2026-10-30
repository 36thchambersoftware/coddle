import { en, getCard } from '@coddle/content';
import type { Action, GameState } from '@coddle/engine';

export function describeAction(state: GameState, action: Action): string {
  const p = state.players.find((p) => p.id === action.playerId)!;
  switch (action.type) {
    case 'chooseBaby':
      return `${en.choose}: ${getCard(action.cardId).name}`;
    case 'endTurn':
      return en.napTime;
    case 'discard':
      return `${en.discard}: ${getCard(p.hand.find((c) => c.uid === action.cardUid)!.cardId).name}`;
    case 'play': {
      const card = getCard(
        p.hand.find((c) => c.uid === action.cardUid)!.cardId,
      );
      const target = action.targetUid
        ? p.trouble.find((h) => h.uid === action.targetUid)
        : null;
      return `${en.play} ${card.name}${target ? ` ${en.cli.to} ${getCard(target.cardId).name}` : ''}`;
    }
    case 'pass': {
      const hazard = p.trouble.find((h) => h.uid === action.hazardUid);
      return `${en.pass}: ${hazard ? getCard(hazard.cardId).name : ''}`;
    }
    case 'share':
      return `${en.share}: ${getCard(p.hand.find((c) => c.uid === action.cardUid)!.cardId).name}`;
    case 'ghost':
      return en.ghost;
    case 'bundle':
    case 'cry':
    case 'nanny':
    case 'swap': {
      const h = p.trouble.find((h) => h.uid === action.targetUid)!;
      return `${en[action.type]}: ${getCard(h.cardId).name}`;
    }
  }
}
export function describeBoard(state: GameState): string {
  const p = state.players[0]!;
  return [
    `${en.day} ${state.day} | ${p.babyId ? getCard(p.babyId).name : en.chooseBaby}`,
    `${en.hp} ${p.hp}/${p.maxHp} | ${en.hunger} ${p.hunger}/5 | ${en.coddle} ${p.coddle}/6 | ${en.stamina} ${p.stamina} | ${en.shield} ${p.shield}`,
    `${en.trouble}: ${p.trouble.map((h) => `${getCard(h.cardId).name} [${getCard(h.cardId).hazard?.linger ? en.lingering : `T${h.timer}`}]`).join(', ') || en.noTrouble}`,
  ].join('\n');
}

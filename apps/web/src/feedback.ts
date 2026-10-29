import type { GameEvent } from '@coddle/engine';
import type { Settings } from './storage';

export type AudioCue =
  'play_care' | 'hazard_hit' | 'win' | 'lose' | 'cry' | 'giggle';
export const audioManager = {
  // Silent cue table is intentional until original audio assets are supplied.
  play(cue: AudioCue): void {
    void cue;
  },
};
export function feedback(events: GameEvent[], settings: Settings): void {
  for (const event of events) {
    if (settings.sound) {
      if (event.type === 'cardPlayed') audioManager.play('play_care');
      if (event.type === 'hazardResolved') audioManager.play('hazard_hit');
      if (event.type === 'result')
        audioManager.play(event.after === 'win' ? 'win' : 'lose');
    }
    if (
      settings.haptics &&
      event.type === 'stat' &&
      event.field === 'hp' &&
      typeof event.after === 'number' &&
      typeof event.before === 'number' &&
      event.after < event.before &&
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator
    )
      navigator.vibrate(30);
  }
}

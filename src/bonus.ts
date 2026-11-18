/** Story-only collectible metadata. Keep stable IDs independent of list order. */
export const BONUS_TRACKS = [
  { id: 'this-that', title: 'This & That', artist: 'Stray Kids', album: 'THIS & THAT', trigger: 'X 咖啡动态', url: 'https://open.spotify.com/album/46TYlDjLrEsOLFgxfxNiUy' },
  { id: 'photobook', title: 'Photobook', artist: 'Stray Kids', album: 'DO IT', trigger: '最早照片', url: 'https://open.spotify.com/track/0iCvvemieCyzNOD2xNzjil' },
  { id: 'just-a-little', title: 'just a little', artist: 'Stray Kids', album: 'Hollow', trigger: '随手记', url: 'https://open.spotify.com/track/1yNeAh3cX84gBWHyPS1x6V' },
  { id: 'astronaut', title: 'Astronaut', artist: 'Stray Kids', album: 'Clé : LEVANTER', trigger: '飞行模式', url: 'https://open.spotify.com/track/352hvNOHzJbRv91vzE7MOw' },
  { id: 'back-then', title: 'Back Then', artist: 'Stray Kids', album: 'THIS & THAT', trigger: '通用', url: 'https://open.spotify.com/album/46TYlDjLrEsOLFgxfxNiUy' },
  { id: 'back-door', title: 'Back Door', artist: 'Stray Kids', album: 'IN LIFE', trigger: '时光机器', url: 'https://open.spotify.com/track/0XuepwFJUcKN8T5zTqoP0F' },
  { id: 'cinema', title: 'CINEMA (Lee Know & Seungmin)', artist: 'Stray Kids', album: 'Mixtape : dominATE', trigger: '全剧终', url: 'https://open.spotify.com/album/6lGezrzEsfsCvwVn3PzxeP' },
  { id: 'as-we-are', title: 'As we are (Seungmin)', artist: 'Stray Kids', album: 'HOP', trigger: '指定录音', url: 'https://open.spotify.com/track/1QhF4HWFQ3YFzFOuWUpDP0' },
  { id: 'raining-stars', title: 'Raining stars', artist: 'HAN', album: 'SKZ-REPLAY 2026 Pt.1', trigger: '天气', url: 'https://open.spotify.com/album/6xS6wVbYu6DtNh6J1KZ1Gp' },
  { id: 'ceremony', title: 'CEREMONY', artist: 'Stray Kids', album: 'KARMA', trigger: '前九首', url: 'https://open.spotify.com/track/62xU1NllqWBCbkZFTXEqzF' },
] as const;
export type BonusId = (typeof BONUS_TRACKS)[number]['id'];
export type BonusUnlocks = Partial<Record<BonusId, string>>;
export function unlockBonus(previous: BonusUnlocks, id: BonusId, stamp: string): BonusUnlocks {
  if (previous[id]) return previous;
  const next = { ...previous, [id]: stamp };
  if (BONUS_TRACKS.slice(0, 9).every(track => next[track.id])) next.ceremony = stamp;
  return next;
}

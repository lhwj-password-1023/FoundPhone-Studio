import type { Runtime, Work } from './schema';

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
export const BONUS_HINTS: Record<BonusId, readonly [string, string]> = {
  'this-that': ['有时候，一杯咖啡也能藏着一段旋律。', '打开 X，找到有关咖啡的指定动态，点击进入动态详情。'],
  photobook: ['最早留下的照片，也许藏着一段回忆。', '打开相册，找到拍摄时间最早的一张照片，点击查看详情。'],
  'just-a-little': ['有些随手写下的文字，也值得认真看看。', '打开备忘录，找到“随手记”，点击进入正文。'],
  astronaut: ['有时候，暂时切断所有信号也不错。', '打开设置，开启飞行模式。'],
  'back-then': ['一些隐藏的东西，就藏在最普通的设置里。', '打开设置 App，进入“通用”页面。'],
  'back-door': ['有一扇门，通向时间的另一侧。', '打开时光机器 App。'],
  cinema: ['有些画面，要等到故事结束才能看见。', '完成全部主线剧情，并拍摄最终双人自拍，即可解锁。'],
  'as-we-are': ['有些声音被保存下来，是为了某天重新听见。', '打开录音机，点击指定录音并进入内容播放界面。'],
  'raining-stars': ['天气里也藏着一首歌。', '打开天气 App，进入完整天气主页。'],
  ceremony: ['当所有碎片聚齐，最后一场仪式才会开始。', '先解锁 bonus 歌单前九首歌曲，第十首将自动解锁。'],
};
export function unlockBonus(previous: BonusUnlocks, id: BonusId, stamp: string): BonusUnlocks {
  if (previous[id]) return previous;
  const next = { ...previous, [id]: stamp };
  if (BONUS_TRACKS.slice(0, 9).every(track => next[track.id])) next.ceremony = stamp;
  return next;
}

/** Unlocks and routes each first-time notification without touching story nodes. */
export function unlockBonusInRuntime(state: Runtime, work: Work, id: BonusId): Runtime {
  const previous = (state.ui?.bonusUnlocks || {}) as BonusUnlocks;
  const stamp = `${state.date || work.phone.date} ${state.time}`;
  const unlocked = unlockBonus(previous, id, stamp);
  if (unlocked === previous) return state;
  const sent = { ...(state.ui?.bonusNotificationSent || {}) } as Record<BonusId, boolean>;
  const notices = [...state.notifications];
  const routes = { ...state.notificationRoutes };
  for (const track of BONUS_TRACKS) {
    if (!unlocked[track.id] || previous[track.id] || sent[track.id]) continue;
    const notice = `Spotify · bonus：已解锁新歌曲：《${track.title}》`;
    notices.push(notice);
    routes[notice] = {
      notificationId: notice, appId: 'spotify', notificationType: 'bonus',
      targetPage: 'playlist', targetId: track.id, messageId: '', sceneId: '',
      createdAt: stamp, readStatus: 'unread', navigationPayload: { playlist: 'bonus', trackId: track.id },
    };
    sent[track.id] = true;
  }
  return { ...state, ui: { ...state.ui, bonusUnlocks: unlocked, bonusNotificationSent: sent }, notifications: notices, notificationRoutes: routes };
}

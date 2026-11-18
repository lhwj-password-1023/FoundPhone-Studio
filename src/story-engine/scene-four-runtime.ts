import { dispatch } from "../engine";
import { makeItem, type Runtime, type Work } from "../schema";

function addHour(date: string, time: string) {
  const value = new Date(`${date}T${time}:00Z`);
  value.setUTCHours(value.getUTCHours() + 1);
  return { date: value.toISOString().slice(0, 10), time: value.toISOString().slice(11, 16) };
}
function addMonths(date: string, count: number) {
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + count);
  value.setUTCDate(Math.min(day, new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate()));
  return value.toISOString().slice(0, 10);
}
export function advanceSceneFour(work: Work, state: Runtime, target: string): Runtime {
  const stage = target === "one-hour-1" ? 7 : target === "one-hour-2" ? 9 : target === "three-months" ? 14 : 0;
  const done = target === "one-hour-1" ? 8 : target === "one-hour-2" ? 10 : 15;
  if (!stage || state.variables[`sceneFourStage${stage}`] !== true || state.variables[`sceneFourStage${done}`] === true) return state;
  const peerDate = state.peerDate || "2017-11-20";
  const peerTime = state.peerTime || state.time;
  const next = structuredClone(state);
  if (target === "three-months") {
    next.peerDate = addMonths(peerDate, 3);
    next.peerTime = peerTime;
    next.ui = { ...next.ui, timemachine: { ...next.ui?.timemachine, history: ["2017-12-03 · 年末的满月 · NASA 档案", "2018-01-31 · 月全食 · NASA 档案", "2018-02-06 · 猎鹰重型火箭首飞 · NASA 档案", "2018-02-09 · 平昌冬奥会开幕 · 国际奥委会档案"] } };
  } else {
    const phone = addHour(next.date || work.phone.date || "2026-11-20", next.time);
    const peer = addHour(peerDate, peerTime);
    next.date = phone.date; next.time = phone.time;
    next.peerDate = peer.date; next.peerTime = peer.time;
  }
  return dispatch(work, next, "timeAdvance", target);
}
export function shareSceneFourNews(work: Work, state: Runtime, id: string): Runtime {
  const news = work.data.safari?.find((item) => item.id === id);
  if (!news || state.variables.sceneFourStage12 !== true || !state.read.includes(id) || state.variables.minho_blocked_seungmin === true) return state;
  const shared = (state.ui?.safari?.sharedNewsIds || []) as string[];
  if (shared.includes(id)) return state;
  const card = makeItem({ id: `s4-card-${id}`, title: "陌生号码", body: news.title, kind: "text", sender: work.phone.owner,
    time: `${state.date || work.phone.date} ${state.time}`, outgoing: true,
    meta: { linkPreview: "true", newsId: id, source: news.meta.source, summary: news.body, url: news.meta.url, sentAt: `${state.date || work.phone.date} ${state.time}`, arrivedAt: `${state.peerDate || "2017-11-20"} ${state.peerTime || state.time}` } });
  const next: Runtime = { ...state, ui: { ...state.ui, safari: { ...state.ui?.safari, sharedNewsIds: [...shared, id] } }, messages: { ...state.messages, messages: [...(state.messages.messages || []), card] } };
  return dispatch(work, next, "shareNews", id);
}
export function addSceneFourMemory(work: Work, state: Runtime): Runtime {
  if (state.messages.kakao?.some((item) => item.id.startsWith("s4-chan-memory-"))) return state;
  const ids = (state.ui?.safari?.sharedNewsIds || []) as string[];
  const rows = ids.flatMap((id, index) => {
    const article = work.data.safari?.find((item) => item.id === id);
    return article ? [makeItem({ id: `s4-chan-memory-${id}`, title: "方灿", sender: "方灿", body: `${index ? "还有" : "他当时突然说，"}${article.meta.memory}。`, time: "2026-11-21 00:50", meta: { sourceNewsId: id } })] : [];
  });
  return { ...state, messages: { ...state.messages, kakao: [...(state.messages.kakao || []), ...rows] } };
}

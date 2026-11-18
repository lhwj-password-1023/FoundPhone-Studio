import { dispatch } from "../engine";
import { makeItem, type Runtime, type Work } from "../schema";

function addDays(date: string, days: number) {
  const stamp = new Date(`${date}T12:00:00Z`);
  stamp.setUTCDate(stamp.getUTCDate() + days);
  return stamp.toISOString().slice(0, 10);
}

const advances: Record<string, { phase: number; next: number; target: "peer" | "phone"; days: number }> = {
  "week-1": { phase: 2, next: 3, target: "peer", days: 7 },
  "week-2": { phase: 6, next: 7, target: "peer", days: 7 },
  "week-3": { phase: 9, next: 10, target: "peer", days: 7 },
  "week-4": { phase: 12, next: 13, target: "peer", days: 7 },
  "week-5": { phase: 15, next: 16, target: "peer", days: 7 },
  "future-autumn": { phase: 24, next: 25, target: "phone", days: 1423 },
  "camp-day": { phase: 26, next: 27, target: "phone", days: 3 },
  "rescue-72h": { phase: 28, next: 29, target: "phone", days: 3 },
};

export function advanceFinale(work: Work, state: Runtime, target: string): Runtime {
  const option = advances[target];
  if (!option || state.variables.finalPhase !== option.phase) return state;
  const next = structuredClone(state);
  if (target === "future-autumn") {
    next.date = "2030-10-09";
    next.time = "10:00";
  } else if (target === "camp-day") {
    next.date = "2030-10-12";
    next.time = "18:30";
  } else if (target === "rescue-72h") {
    next.date = "2030-10-15";
    next.time = "18:30";
  } else if (option.target === "peer") {
    next.peerDate = addDays(next.peerDate || "2018-02-21", option.days);
  } else next.date = addDays(next.date || work.phone.date || "2026-11-21", option.days);
  next.ui = { ...next.ui, timemachine: {
    ...next.ui?.timemachine,
    history: [...(Array.isArray(next.ui?.timemachine?.history) ? next.ui.timemachine.history : []), `${target} · ${option.target === "peer" ? next.peerDate : next.date}`],
  } };
  return dispatch(work, next, "storyTimeAdvance", target);
}

export function reconnectTo2010(work: Work, state: Runtime): Runtime {
  if (state.variables.finalPhase !== 18) return state;
  const next = { ...state, peerDate: "2010-10-25", peerTime: "21:00", ui: {
    ...state.ui, timemachine: { ...state.ui?.timemachine,
      last2018Sync: `${state.peerDate || "2018-02-21"} ${state.peerTime || state.time}`,
      anchor: "2010-10-25", history: [...(Array.isArray(state.ui?.timemachine?.history) ? state.ui.timemachine.history : []), `连接中断 · 最后同步 ${state.peerDate || "2018-02-21"}`, "异常连接 · 2010-10-25"],
    },
  } };
  return dispatch(work, next, "storyReconnect", "2010");
}

export function makeStoryTransfer(work: Work, state: Runtime, amount: string): Runtime {
  if (state.variables.finalPhase !== 20 || !/^\d{4}$/.test(amount) || amount === "0000") return state;
  const card = makeItem({ id: "f-transfer-card", title: "陌生号码", body: `转账成功 · ${amount}`, sender: work.phone.owner,
    kind: "transfer", outgoing: true, time: `${state.date || work.phone.date} ${state.time}`,
    meta: { amount, memo: "别轻易向生活低头。", arrivedAt: `${state.peerDate} ${state.peerTime}` } });
  const next = { ...state, variables: { ...state.variables, storyTransferAmount: amount }, messages: { ...state.messages, messages: [...(state.messages.messages || []), card] } };
  return dispatch(work, next, "storyTransfer", "2010");
}

export function takeFinalPhoto(work: Work, state: Runtime, media: string): Runtime {
  if (state.variables.finalPhase !== 30 || state.variables.storyFinalComplete === true) return state;
  const capturedAt = `${state.date || work.phone.date} ${state.time}`;
  const photo = makeItem({ id: "f-final-selfie", title: "我们", body: "", sender: work.phone.owner,
    kind: "image", media, time: capturedAt, folder: "最近项目", meta: { capturedAt, album: "自拍" } });
  const next = { ...state, messages: { ...state.messages, photos: [...(state.messages.photos || []), photo] } };
  return dispatch(work, next, "storyShutter", "final");
}

import type { Item, Runtime, Work } from "./schema";
import { visible } from "./engine";

const chatApps = new Set(["messages", "kakao"]);
export const conversationKey = (app: string, item: Item) =>
  `${app}:${item.meta.conversationId || item.title}`;

/** Adds only newly visible records. Existing positions are never recalculated. */
export function reconcileMessageOrder(work: Work, state: Runtime): Runtime {
  const order = structuredClone(state.messageOrder || {});
  const received = { ...(state.messageReceivedAt || {}) };
  let changed = !state.messageOrder || !state.messageReceivedAt;
  const stamp = `${state.date || work.phone.date} ${state.time}`;
  for (const app of chatApps) {
    const authored = work.data[app] || [];
    const runtime = state.messages[app] || [];
    const existing = new Set(Object.values(order).flat());
    // Legacy saves retain unlock order, which is a more reliable arrival record
    // than timestamps from the sender's other timeline.
    const baseline = authored.filter((item) => !item.hidden && visible(item, state));
    const unlocked = state.unlocked
      .map((id) => authored.find((item) => item.id === id))
      .filter((item): item is Item => !!item && visible(item, state));
    const remaining = authored.filter((item) => visible(item, state));
    for (const item of [...baseline, ...unlocked, ...remaining, ...runtime]) {
      if (existing.has(item.id)) continue;
      const key = conversationKey(app, item);
      (order[key] ??= []).push(item.id);
      received[item.id] = item.meta.arrivedAt || item.meta.receivedAt || stamp;
      existing.add(item.id);
      changed = true;
    }
  }
  return changed ? { ...state, messageOrder: order, messageReceivedAt: received } : state;
}

export function orderMessages(app: string, items: Item[], state?: Runtime): Item[] {
  if (!chatApps.has(app)) return items;
  const positions = new Map<string, number>();
  for (const [key, ids] of Object.entries(state?.messageOrder || {})) {
    if (!key.startsWith(`${app}:`)) continue;
    ids.forEach((id, index) => positions.set(id, index));
  }
  return items.map((item, source) => ({ item, source })).sort((a, b) => {
    const ka = conversationKey(app, a.item);
    const kb = conversationKey(app, b.item);
    if (ka !== kb) return a.source - b.source;
    const pa = positions.get(a.item.id);
    const pb = positions.get(b.item.id);
    if (pa !== undefined && pb !== undefined && pa !== pb) return pa - pb;
    if (pa !== undefined && pb === undefined) return -1;
    if (pa === undefined && pb !== undefined) return 1;
    const ma = Number(a.item.meta.displayOrder);
    const mb = Number(b.item.meta.displayOrder);
    if (Number.isFinite(ma) && Number.isFinite(mb) && ma !== mb) return ma - mb;
    return a.source - b.source || a.item.id.localeCompare(b.item.id);
  }).map(({ item }) => item);
}

export function messageFields(app: string, item: Item, state: Runtime) {
  const key = conversationKey(app, item);
  return {
    messageId: item.id,
    conversationId: key,
    senderId: item.meta.senderId || item.sender,
    sentAt: item.meta.sentAt || item.time,
    receivedAt: state.messageReceivedAt?.[item.id] || item.meta.arrivedAt || item.time,
    displayOrder: (state.messageOrder?.[key] || []).indexOf(item.id) + 1,
    timelineId: item.meta.timelineId || item.meta.timeline || (item.meta.sentAt || item.time).slice(0, 4),
    sceneId: item.meta.sceneId || item.meta.scene || "历史记录",
    deliveryStatus: item.meta.deliveryStatus || (item.meta.failed === "true" ? "failed" : "delivered"),
    readStatus: item.meta.readStatus || (item.meta.unread === "true" ? "unread" : "read"),
  };
}

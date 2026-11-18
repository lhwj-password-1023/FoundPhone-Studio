import type { Action, Condition, Item, Runtime, StoryNode, Work } from "./schema";
import { makeItem } from "./schema";

function storyChatRecord(work: Work, id: string): { app: string; item: Item } | undefined {
  for (const app of ["messages", "kakao"]) {
    const item = work.data[app]?.find((record) => record.id === id);
    if (item) return { app, item };
  }
}
function livePeerRecord(work: Work, node: StoryNode) {
  for (const action of node.actions) {
    if (action.type !== "unlock" || !/^(s4-|f-)/.test(action.key)) continue;
    const record = storyChatRecord(work, action.key);
    if (record && !record.item.outgoing) return record.item;
  }
}
function replyDelay(item: Item) {
  const length = item.body.length;
  const base = length <= 8 ? 700 : length <= 25 ? 1400 : length <= 60 ? 2400 : 3500;
  const jitter = [...item.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 350;
  return base + jitter;
}
function frozenMessageTime(work: Work, state: Runtime, app: string, item: Item) {
  const received = { ...state.messageReceivedAt };
  const sent = { ...state.messageSentAt };
  if (received[item.id]) return;
  const base = Date.parse(`${state.date || work.phone.date}T${state.time}:00Z`);
  const records = [...(work.data[app] || []), ...(state.messages[app] || [])];
  const earlier = records.filter((record) => record.title === item.title)
    .map((record) => received[record.id])
    .filter((stamp): stamp is string => !!stamp)
    .map((stamp) => Date.parse(stamp.replace(" ", "T") + "Z"))
    .filter(Number.isFinite);
  const previous = Math.max(0, ...earlier);
  const gap = 12 + Math.min(25, Math.floor(item.body.length / 2));
  const stamp = new Date(Math.max(base, previous + gap * 1000)).toISOString().replace("T", " ").slice(0, 19);
  received[item.id] = stamp;
  if (item.outgoing || app === "kakao" || !state.peerDate) sent[item.id] = stamp;
  else sent[item.id] = `${state.peerDate} ${state.peerTime || state.time}:${stamp.slice(-2)}`;
  state.messageReceivedAt = received;
  state.messageSentAt = sent;
  if (stamp.slice(0, 16) > `${state.date || work.phone.date} ${state.time}`) {
    state.date = stamp.slice(0, 10);
    state.time = stamp.slice(11, 16);
  }
}
export function testCondition(c: Condition, s: Runtime): boolean {
  const [scope, ...rest] = c.key.split(":");
  const key = rest.join(":");
  const lists: Record<string, string[]> = {
    visited: s.visited,
    read: s.read,
    clue: s.clues,
    unlocked: s.unlocked,
    completed: s.completed,
  };
  const actual =
    scope === "ui"
      ? s.ui?.[rest[0]]?.[rest.slice(1).join(":")]
      : lists[scope]
        ? lists[scope].includes(key)
        : s.variables[c.key];
  switch (c.op) {
    case "eq":
      return actual === c.value;
    case "neq":
      return actual !== c.value;
    case "gt":
      return typeof actual === "number" && actual > Number(c.value);
    case "lt":
      return typeof actual === "number" && actual < Number(c.value);
    case "includes":
      return String(actual ?? "").includes(String(c.value));
  }
}
function apply(a: Action, s: Runtime, w: Work) {
  switch (a.type) {
    case "date":
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(a.value))) s.date = String(a.value);
      break;
    case "variable":
      s.variables[a.key] = a.value;
      break;
    case "unlock":
      if (!s.unlocked.includes(a.key)) s.unlocked.push(a.key);
      break;
    case "hide":
      if (!s.hidden.includes(a.key)) s.hidden.push(a.key);
      break;
    case "notification":
      {
        const match = Object.entries(w.data).flatMap(([app, items]) => items.map((item) => ({ app, item }))).find(({ item }) => item.id === a.key);
        const noticeId = match ? "@item/" + a.key : String(a.value);
        if (noticeId) {
          s.notificationRoutes ??= {};
          s.notificationRoutes[noticeId] = {
            notificationId: noticeId,
            appId: match?.app || (w.apps.some((app) => app.id === a.key) ? a.key : "system"),
            notificationType: match ? (match.app === "messages" || match.app === "kakao" ? "message" : match.app) : "system",
            targetPage: match ? (match.app === "messages" || match.app === "kakao" ? "conversation" : "detail") : "system-detail",
            targetId: match?.item.meta.conversationId || match?.item.id || a.key,
            messageId: match?.item.id || "",
            sceneId: match?.item.meta.sceneId || "",
            createdAt: `${s.date || w.phone.date} ${s.time}`,
            readStatus: "unread",
            navigationPayload: match ? { recordId: match.item.id, thread: match.item.title } : {},
          };
        }
      }
      if (
        a.key &&
        Object.values(w.data).some((items) =>
          items.some((i) => i.id === a.key && visible(i, s)),
        )
      ) {
        const notice = "@item/" + a.key;
        if (!s.notifications.includes(notice) && !s.read.includes(a.key))
          s.notifications.push(notice);
      } else if (!w.timeline || !a.key) s.notifications.push(String(a.value));
      break;
    case "call":
      s.notifications.push(`${String(a.value)} 来电`);
      s.incomingCall = {
        caller: String(a.value),
        target: a.key,
        status: "ringing",
      };
      break;
    case "clue":
      if (!s.clues.includes(a.key)) s.clues.push(a.key);
      break;
    case "time":
      s.time = String(a.value);
      s.clockRemainderMs = 0;
      break;
    case "ending":
      if (!s.endings.includes(String(a.value))) s.endings.push(String(a.value));
      break;
    case "choice":
      if (!s.choices.some((c) => c.target === a.key))
        s.choices.push({ label: String(a.value), target: a.key });
      break;
    case "message":
      s.messages[a.key] = [
        ...(s.messages[a.key] ?? []),
        makeItem({
          id: `event-${a.key}-${s.completed.length}-${s.messages[a.key]?.length ?? 0}`,
          title: "新消息",
          sender: w.phone.owner,
          body: String(a.value),
        }),
      ];
      break;
  }
}
function runQueue(
  w: Work,
  s: Runtime,
  event: string,
  target: string,
  queue: string[],
  resuming = new Set<string>(),
) {
  const seen = new Set<string>();
  let steps = 0;
  while (queue.length && steps++ < 200) {
    const id = queue.shift()!;
    const n = w.nodes.find((n) => n.id === id);
    if (!n || seen.has(id) || (n.once && s.completed.includes(id))) continue;
    seen.add(id);
    const conditions = n.conditions.map((c) => testCondition(c, s));
    const pass =
      n.logic === "or"
        ? conditions.some(Boolean)
        : n.logic === "not"
          ? !conditions.every(Boolean)
          : conditions.every(Boolean);
    if (!pass) continue;
    const peer = livePeerRecord(w, n);
    if ((n.type === "delay" || peer) && !resuming.has(id)) {
      s.scheduled ??= [];
      const duration = peer ? Math.max(n.delayMs ?? 0, replyDelay(peer)) : (n.delayMs ?? 1000);
      if (!s.scheduled.some((t) => t.nodeId === id))
        s.scheduled.push({
          nodeId: id,
          due: (s.elapsedMs ?? 0) + duration,
        });
      s.trace.push(`delay:${duration}ms → ${n.label}`);
      continue;
    }
    const beforeStamp = `${s.date || w.phone.date} ${s.time}`;
    const newlyUnlocked = n.actions.filter((action) => action.type === "unlock" && !s.unlocked.includes(action.key));
    if (!s.completed.includes(id)) s.completed.push(id);
    s.trace.push(`${event}:${target} → ${n.label}`);
    for (const a of n.actions) {
      const previous =
        a.type === "variable"
          ? s.variables[a.key]
          : a.type === "time"
            ? s.time
            : undefined;
      apply(a, s, w);
      if (a.type === "variable" && previous !== s.variables[a.key])
        queue.push(
          ...w.nodes
            .filter(
              (n) =>
                n.event === "variable" && (!n.target || n.target === a.key),
            )
            .map((n) => n.id),
        );
      if (a.type === "time" && previous !== s.time)
        queue.push(
          ...w.nodes
            .filter(
              (n) => n.event === "time" && (!n.target || n.target === s.time),
            )
            .map((n) => n.id),
        );
    }
    // Authored date/time actions may repeat a minute; never move this phone's clock backward.
    if (w.timeline && `${s.date || w.phone.date} ${s.time}` < beforeStamp) {
      s.date = beforeStamp.slice(0, 10);
      s.time = beforeStamp.slice(11, 16);
    }
    for (const action of newlyUnlocked) {
      if (!/^(s4-|f-)/.test(action.key)) continue;
      const record = storyChatRecord(w, action.key);
      if (record) frozenMessageTime(w, s, record.app, record.item);
    }
    if (
      n.type === "ending" &&
      !n.actions.some((a) => a.type === "ending") &&
      !s.endings.includes(n.label)
    )
      s.endings.push(n.label);
    if (n.type === "choice") {
      for (const id of n.next)
        if (!s.choices.some((c) => c.target === id))
          s.choices.push({
            label: w.nodes.find((n) => n.id === id)?.label ?? id,
            target: id,
          });
    } else queue.push(...n.next);
  }
  if (w.timeline && s.endings.length) {
    s.scheduled = [];
    s.choices = [];
    s.notifications = [];
  }
  s.trace = s.trace.slice(-100);
  return s;
}
export function dispatch(
  w: Work,
  previous: Runtime,
  event: string,
  target = "",
): Runtime {
  const s = structuredClone(previous);
  if (event === "choose") {
    const records = Object.values(w.data).flat();
    const group =
      w.timeline &&
      records.find((i) => i.meta.reply === target)?.meta.conversationId;
    s.choices = group
      ? s.choices.filter(
          (c) =>
            !records.some(
              (i) =>
                i.meta.conversationId === group && i.meta.reply === c.target,
            ),
        )
      : [];
  }
  if (event === "openApp" && !s.visited.includes(target))
    s.visited.push(target);
  if (event === "read") {
    const item =
      w.timeline &&
      Object.values(w.data)
        .flat()
        .find((i) => i.id === target);
    if (item && !visible(item, s)) return previous;
    if (!s.read.includes(target)) {
      s.read.push(target);
      if (w.timeline)
        (s.readAt ??= {})[target] = {
          device: s.date + " " + s.time,
          elapsedMs: s.elapsedMs ?? 0,
        };
    }
    s.notifications = s.notifications.filter((n) => n !== "@item/" + target);
  }
  if (w.timeline && s.endings.length) return s;
  if (w.mode === "explore") return s;
  const queue = w.nodes
    .filter(
      (n) =>
        (n.type === "start" && event === "start") ||
        (n.event === event && (!n.target || n.target === target)),
    )
    .map((n) => n.id);
  return runQueue(w, s, event, target, queue);
}
export function advance(
  w: Work,
  previous: Runtime,
  milliseconds: number,
): Runtime {
  const s = structuredClone(previous);
  const delta = Number.isFinite(milliseconds)
    ? Math.max(0, Math.min(milliseconds, 86400000))
    : 0;
  const end = (s.elapsedMs ?? 0) + delta;
  s.elapsedMs ??= 0;
  s.clockRemainderMs ??= 0;
  s.scheduled ??= [];
  let resumes = 0;
  while (true) {
    s.scheduled.sort((a, b) => a.due - b.due);
    const due =
      w.mode !== "explore" && resumes < 200 ? s.scheduled[0] : undefined;
    const clockAt = w.timeline
      ? Infinity
      : s.elapsedMs + 60000 - s.clockRemainderMs;
    const next = Math.min(
      end,
      clockAt,
      due ? Math.max(s.elapsedMs, due.due) : Infinity,
    );
    if (!w.timeline) s.clockRemainderMs += next - s.elapsedMs;
    s.elapsedMs = next;
    if (s.clockRemainderMs >= 60000) {
      s.clockRemainderMs -= 60000;
      const match = s.time.match(/^(\d{1,2}):(\d{2})$/);
      if (match) {
        const value = (Number(match[1]) * 60 + Number(match[2]) + 1) % 1440;
        s.time =
          String(Math.floor(value / 60)).padStart(2, "0") +
          ":" +
          String(value % 60).padStart(2, "0");
        if (w.mode !== "explore")
          runQueue(
            w,
            s,
            "time",
            s.time,
            w.nodes
              .filter(
                (n) => n.event === "time" && (!n.target || n.target === s.time),
              )
              .map((n) => n.id),
          );
      }
    }
    if (due && due.due <= s.elapsedMs) {
      s.scheduled.splice(s.scheduled.indexOf(due), 1);
      resumes++;
      runQueue(w, s, "timer", due.nodeId, [due.nodeId], new Set([due.nodeId]));
      continue;
    }
    if (s.elapsedMs >= end) break;
  }
  return s;
}
export function choose(w: Work, s: Runtime, id: string) {
  const node = w.nodes.find((n) => n.id === id);
  if (!node || !s.choices.some((c) => c.target === id)) return s;
  return dispatch(
    {
      ...w,
      nodes: w.nodes.map((n) =>
        n.id === id ? { ...n, event: "choose", target: id } : n,
      ),
    },
    s,
    "choose",
    id,
  );
}
export function validateGraph(nodes: StoryNode[]) {
  const errors: string[] = [];
  for (const n of nodes) {
    for (const id of n.next)
      if (!nodes.some((x) => x.id === id))
        errors.push(`${n.label} 引用了不存在的节点 ${id}`);
    if (n.next.includes(n.id))
      errors.push(`${n.label} 存在自环（运行时会阻止循环）`);
  }
  const reachable = new Set<string>();
  const visit = (id: string) => {
    if (reachable.has(id)) return;
    reachable.add(id);
    nodes.find((n) => n.id === id)?.next.forEach(visit);
  };
  nodes
    .filter((n) => n.type === "start" || n.event)
    .forEach((n) => visit(n.id));
  nodes
    .filter((n) => n.type !== "comment" && !reachable.has(n.id))
    .forEach((n) => errors.push(`${n.label} 不可达`));
  return errors;
}
export function visible(
  item: {
    id: string;
    hidden: boolean;
    unlock: string;
    meta?: Record<string, string>;
  },
  s: Runtime,
) {
  return (
    (!item.meta?.requires || s.variables[item.meta.requires] === true) &&
    (!item.meta?.stage ||
      Number(s.variables.stage) >= Number(item.meta.stage)) &&
    !s.hidden.includes(item.id) &&
    (!item.hidden || s.unlocked.includes(item.id)) &&
    (!item.unlock ||
      testCondition({ key: item.unlock, op: "eq", value: true }, s))
  );
}

import { expect, test } from "vitest";
import { initialRuntime, makeItem, type Work } from "../schema";
import { pendingPeerReply } from "./peerReply";

test("对方连续消息的动画与间隔共用等待状态，全部送达后解除", () => {
  const first = makeItem({ id: "first", title: "陌生号码", sender: "陌生号码", body: "等等。" });
  const second = makeItem({ id: "second", title: "陌生号码", sender: "陌生号码", body: "我还有话想说。", hidden: true });
  const last = makeItem({ id: "last", title: "陌生号码", sender: "陌生号码", body: "其实我一直都记得。", hidden: true });
  const work = { id: "reply", phone: { date: "2026-11-20", time: "21:33" }, variables: {}, data: { messages: [first, second, last] }, nodes: [
    { id: "read-first", event: "read", target: "first", next: ["deliver-second"], actions: [], conditions: [] },
    { id: "deliver-second", event: "", target: "", next: [], actions: [{ type: "unlock", key: "second" }], conditions: [] },
    { id: "read-second", event: "read", target: "second", next: ["deliver-last"], actions: [], conditions: [] },
    { id: "deliver-last", event: "", target: "", next: [], actions: [{ type: "unlock", key: "last" }], conditions: [] },
  ] } as unknown as Work;
  let state = initialRuntime(work);
  expect(pendingPeerReply(work, state, "messages", "陌生号码")).toBe(true);
  state = { ...state, read: ["first"], scheduled: [{ nodeId: "deliver-second", due: 900 }] };
  expect(pendingPeerReply(work, state, "messages", "陌生号码")).toBe(true);
  state = { ...state, scheduled: [], unlocked: ["second"] };
  expect(pendingPeerReply(work, state, "messages", "陌生号码")).toBe(true);
  state = { ...state, read: ["first", "second"], scheduled: [{ nodeId: "deliver-last", due: 1800 }] };
  expect(pendingPeerReply(work, state, "messages", "陌生号码")).toBe(true);
  state = { ...state, scheduled: [], unlocked: ["second", "last"], read: ["first", "second", "last"] };
  expect(pendingPeerReply(work, state, "messages", "陌生号码")).toBe(false);
});

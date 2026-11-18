import { describe, expect, it } from "vitest";
import { initialRuntime, makeItem, type Work } from "./schema";
import { messageFields, orderMessages, reconcileMessageOrder } from "./messageOrder";

function fixture() {
  const older = makeItem({ id: "older", title: "旻浩哥", sender: "金昇玟", outgoing: true, time: "2026-11-18 23:00" });
  const peer = makeItem({ id: "peer", title: "旻浩哥", sender: "李旻浩", time: "2017-11-18 23:01", hidden: true, meta: { sentAt: "2017-11-18 23:01", arrivedAt: "2026-11-18 23:02" } });
  const failed = makeItem({ id: "failed", title: "旻浩哥", sender: "金昇玟", outgoing: true, time: "2026-11-18 23:03", hidden: true, meta: { failed: "true" } });
  const group = makeItem({ id: "group", title: "成员群", sender: "方灿", time: "2026-11-18 22:00" });
  const work = { id: "test", updatedAt: 1, phone: { date: "2026-11-18", time: "23:00" }, data: { messages: [peer, older, failed], kakao: [group] }, variables: {} } as unknown as Work;
  return { work, older, peer, failed, group };
}

describe("stable per-conversation message order", () => {
  it("appends past-timeline replies and failed sends without changing older positions", () => {
    const { work, older, peer, failed } = fixture();
    let state = reconcileMessageOrder(work, initialRuntime(work));
    expect(orderMessages("messages", [peer, older], state).map((m) => m.id)).toEqual(["older", "peer"]);
    state = reconcileMessageOrder(work, { ...state, unlocked: ["peer"], time: "23:02" });
    state = reconcileMessageOrder(work, { ...state, unlocked: ["peer", "failed"], time: "23:03" });
    expect(orderMessages("messages", [failed, peer, older], state).map((m) => m.id)).toEqual(["older", "peer", "failed"]);
    expect(messageFields("messages", peer, state)).toMatchObject({ sentAt: "2017-11-18 23:01", receivedAt: "2026-11-18 23:02", displayOrder: 2 });
    expect(messageFields("messages", failed, state).deliveryStatus).toBe("failed");
    expect(reconcileMessageOrder(work, structuredClone(state)).messageOrder).toEqual(state.messageOrder);
  });

  it("keeps group conversations independent and migrates old unlock sequence", () => {
    const { work, older, peer, failed, group } = fixture();
    const legacy = { ...initialRuntime(work), messageOrder: undefined, unlocked: ["failed", "peer"] };
    const state = reconcileMessageOrder(work, legacy);
    expect(orderMessages("messages", [peer, failed, older], state).map((m) => m.id)).toEqual(["older", "failed", "peer"]);
    expect(messageFields("kakao", group, state).displayOrder).toBe(1);
  });
});

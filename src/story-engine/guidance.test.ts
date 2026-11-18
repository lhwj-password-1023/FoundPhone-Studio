import { describe, expect, it } from "vitest";
import { createWork } from "../demo";
import { initialRuntime } from "../schema";
import { blockedMessage, guidanceAnswer, pendingGuidance, validateGuidance } from "./guidance";

describe("global story guidance", () => {
  it("distinguishes a blocked contact from a contact with no current task", () => {
    const work = createWork();
    work.guidance = validateGuidance(work, [{
      id: "read-chat", chapter: "test", scene: "one", name: "Read chat", type: "read",
      app: "kakao", target: "friend", priority: 1, blocks: ["陌生号码"],
      prerequisites: { all: [{ key: "started", op: "eq", value: true }, { not: { key: "other", op: "eq", value: true } }] },
      completion: { any: [{ key: "read:history", op: "eq", value: true }, { key: "skipped", op: "eq", value: true }] },
      hint: "打开聊天并阅读历史消息。",
    }]);
    const state = initialRuntime(work);
    expect(blockedMessage(work, state, "陌生号码")).toBe(false);
    state.variables.started = true;
    expect(blockedMessage(work, state, "陌生号码")).toBe(true);
    expect(blockedMessage(work, state, "其他联系人")).toBe(false);
    expect(guidanceAnswer(work, state)).toBe("打开聊天并阅读历史消息。");
    state.read.push("history");
    expect(pendingGuidance(work, state)).toHaveLength(0);
    expect(guidanceAnswer(work, state)).toContain("剧情已经全部完成");
  });
});

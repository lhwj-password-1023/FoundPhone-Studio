import { expect, test } from "vitest";
import manuscript from "../stories/nine-years/story.json";
import extras from "../stories/nine-years/story.extras.json";
import three from "../stories/nine-years/story.scene-three.json";
import four from "../stories/nine-years/story.scene-four.json";
import finale from "../stories/nine-years/story.finale.json";
import { applyStoryOverlay } from "./story-engine/overlay";
import { compileStory } from "./story-engine/compiler";
import { initialRuntime, makeItem } from "./schema";
import { notificationTarget, recordNavigation } from "./notificationNavigation";

const { work } = compileStory(applyStoryOverlay(applyStoryOverlay(applyStoryOverlay(manuscript, three), four), finale), extras);

test("all authored record notifications route to their owning App and complete content", () => {
  const state = initialRuntime(work);
  const records = Object.values(work.data).flat();
  const notified = work.nodes.flatMap((node) => node.actions.filter((action) => action.type === "notification" && records.some((item) => item.id === action.key)));
  expect(notified.length).toBeGreaterThan(20);
  for (const action of notified) {
    const target = notificationTarget("@item/" + action.key, work, state);
    expect(target, action.key).toBeTruthy();
    expect(target!.item.id).toBe(action.key);
    const nav = recordNavigation(target!.app, target!.item);
    if (["messages", "kakao"].includes(target!.app)) {
      expect(nav.thread).toBe(target!.item.title);
      expect(nav.detail).toBe("");
      expect(nav["anchor:" + target!.item.title]).toBe(action.key);
    } else expect(nav.detail || nav.xDetail).toBeTruthy();
  }
});

test("chat routing does not depend on contact display name or conversation metadata", () => {
  const item = makeItem({ id: "legacy", title: "陌生号码", meta: {}, body: "你怎么知道我的名字？" });
  const nav = recordNavigation("messages", item, { routeVisit: 4 });
  expect(nav).toMatchObject({ thread: "陌生号码", detail: "", routeVisit: 5, "anchor:陌生号码": "legacy" });
});

test("runtime messages and X notification targets resolve without a text search", () => {
  const state = initialRuntime(work);
  state.messages.kakao = [makeItem({ id: "runtime-kakao", title: "方灿", body: "昇玟，你在哪？" })];
  expect(notificationTarget("@item/runtime-kakao", work, state)?.app).toBe("kakao");
  expect(recordNavigation("x", makeItem({ id: "like", folder: "通知", meta: { target: "post-1" } })).xDetail).toBe("post-1");
});

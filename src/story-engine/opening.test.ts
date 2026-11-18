import { expect, test } from "vitest";
import manuscript from "../../stories/nine-years/story.json";
import { compileStory } from "./compiler";
import { testStory } from "./testStory";
import { initialRuntime } from "../schema";
import { dispatch, advance, choose, visible } from "../engine";
const { work, story } = compileStory(manuscript);
test("首条通知只有陌生号码，两个首句均可走到本场停笔处", () => {
  const s = dispatch(work, initialRuntime(work), "start");
  expect([s.date, s.time]).toEqual(["2026-11-20", "21:33"]);
  expect(s.notifications).toEqual(["@item/opening"]);
  expect(
    work.data.messages.filter((i) => visible(i, s)).map((i) => i.sender),
  ).toEqual(["陌生号码"]);
  expect(testStory(story, work)).toEqual([]);
});
test("提前打开或只阅读备忘录都不能代替写完，刷新后能接着发送", () => {
  let s = dispatch(work, initialRuntime(work), "start");
  s = dispatch(work, s, "writeNote", "evening-note");
  expect(s.variables.noteWritten).toBe(false);
  for (const step of story.tests[0].steps) {
    if (step.event === "writeNote") break;
    if (step.event) s = dispatch(work, s, step.event, step.target);
    if (step.choose) s = choose(work, s, step.choose);
    if (step.advanceMs) s = advance(work, s, step.advanceMs);
  }
  expect(s.read).toContain("evening-note");
  expect(s.choices).toEqual([]);
  s = dispatch(
    work,
    JSON.parse(JSON.stringify(s)),
    "writeNote",
    "evening-note",
  );
  expect(s.choices.map((c) => c.target)).toEqual(["treehole"]);
  s = choose(work, s, "treehole");
  expect(s.choices.map((c) => c.target)).toEqual(["try-too"]);
  s = choose(work, s, "try-too");
  expect(s.variables.sceneOneComplete).toBe(true);
  expect(s.endings).toEqual([]);
  expect(s.scheduled?.map((t) => t.nodeId)).toEqual(["deliver-classified"]);
});

test("提前查看旧照或只查看送别日期都不能解锁末句", () => {
  let s = dispatch(work, initialRuntime(work), "start");
  for (const step of story.tests[2].steps) {
    if (step.event === "viewCalendarDay") break;
    if (step.event) s = dispatch(work, s, step.event, step.target);
    if (step.choose) s = choose(work, s, step.choose);
    if (step.advanceMs) s = advance(work, s, step.advanceMs);
  }
  expect(s.variables.treeholeOffered).toBe(true);
  s = dispatch(work, s, "read", "joined-hands");
  s = dispatch(work, s, "viewCalendarDay", "2026-10-03");
  expect(s.variables.farewellSeen).toBe(false);
  s = dispatch(work, s, "viewCalendarDay", "2026-10-04");
  expect(s.variables.farewellSeen).toBe(true);
  expect(s.choices).toEqual([]);
  s = dispatch(work, structuredClone(s), "read", "joined-hands");
  expect(s.choices.map((c) => c.target)).toEqual(["how-to-forget"]);
});

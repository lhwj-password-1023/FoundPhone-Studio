import { expect, test } from "vitest";
import storyData from "../../stories/nine-years/demo.json";
import { compileStory } from "./compiler";
import { shiftYears } from "./timeline";
import { initialRuntime } from "../schema";
import { dispatch, visible, advance, choose } from "../engine";
const source = storyData;
const { work, story } = compileStory(source);
const find = (id: string) =>
  Object.values(work.data)
    .flat()
    .find((i) => i.id === id)!;

test("两个方向保持首尔时分，拒绝日期和年龄冲突", () => {
  expect(shiftYears("2017-06-12 21:18", 9)).toBe("2026-06-12 21:18");
  expect(shiftYears("2026-06-12 21:18", -9)).toBe("2017-06-12 21:18");
  expect(() => shiftYears("2024-02-29 09:00", 9)).toThrow();
  for (const [key, value] of [
    ["age", "27"],
    ["arrivedAt", "2026-06-12 21:19"],
    ["resource", "missing"],
  ]) {
    const bad = structuredClone(source);
    Object.assign(bad.chats[0].messages[0].meta, { [key]: value });
    expect(() => compileStory(bad)).toThrow();
  }
});
test("所有 App 可提前打开，秘密、最后的消息和番外仍受阶段限制", () => {
  let s = dispatch(work, initialRuntime(work), "start");
  for (const a of work.apps.filter((a) => a.installed))
    s = dispatch(work, s, "openApp", a.id);
  for (const id of ["draft", "mismatch", "audition", "final", "encore"]) {
    expect(visible(find(id), s)).toBe(false);
    s = dispatch(work, s, "read", id);
    expect(s.read).not.toContain(id);
  }
  expect(s.variables.minhoKnowsGap).toBe(false);
  expect(advance(work, s, 5 * 3600000).time).toBe(work.phone.time);
  expect(s.notifications).toEqual(["@item/hello"]);
});
test("群聊选项与跨时回复独立，重复已读保留首次阅读时刻", () => {
  let s = dispatch(work, initialRuntime(work), "start");
  s = dispatch(work, dispatch(work, s, "read", "keys"), "read", "hello");
  s = choose(work, s, "keyFile");
  expect(s.choices.map((c) => c.target)).toEqual(["busReply", "rainReply"]);
  expect(visible(find("keyFileText"), s)).toBe(true);
  const first = s.readAt?.hello;
  s = dispatch(work, advance(work, s, 1234), "read", "hello");
  expect(s.readAt?.hello).toEqual(first);
  expect(s.notifications).toEqual([]);
});
test.each(story.tests)(
  "每一步存档恢复后仍能通关，结局静默，可重读番外 · $name",
  (path) => {
    let s = dispatch(work, initialRuntime(work), "start");
    for (const step of path.steps) {
      s = JSON.parse(JSON.stringify(s));
      if (step.choose) s = choose(work, s, step.choose);
      if (step.advanceMs) s = advance(work, s, step.advanceMs);
      if (step.event) s = dispatch(work, s, step.event, step.target);
    }
    expect(s.endings).toEqual(["去见你"]);
    expect(s.read).toContain("encore");
    expect(visible(find("window"), s)).toBe(true);
    s = dispatch(work, advance(work, s, 3600000), "read", "hello");
    expect(s.scheduled).toEqual([]);
    expect(s.notifications).toEqual([]);
    expect(s.choices).toEqual([]);
    expect(visible(find("encore"), initialRuntime(work))).toBe(false);
  },
);

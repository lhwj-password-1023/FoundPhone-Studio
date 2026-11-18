import { expect, test } from "vitest";
import manuscript from "../../stories/nine-years/story.json";
import extras from "../../stories/nine-years/story.extras.json";
import { compileStory } from "./compiler";
import overlay from "../../stories/nine-years/story.scene-three.json";
import { applyStoryOverlay } from "./overlay";
import { initialRuntime } from "../schema";
import { advance, choose, dispatch, visible } from "../engine";

const { work, story } = compileStory(applyStoryOverlay(manuscript, overlay), extras);
const path = story.tests.find((t) => t.name.startsWith("第三场"))!.steps;
function replay(stopAt?: string) {
  let state = dispatch(work, initialRuntime(work), "start");
  for (const step of path) {
    if ((step.event === "read" && step.target === stopAt) || step.choose === stopAt) break;
    if (step.choose) state = choose(work, state, step.choose);
    if (step.advanceMs !== undefined) state = advance(work, state, step.advanceMs);
    if (step.event) state = dispatch(work, state, step.event, step.target);
  }
  return state;
}
test("第三场必须阅读李旻浩未读聊天后才能继续短信", () => {
  const state = replay("s3-lee-history-12");
  expect(state.read).toContain("remember-clearer");
  expect(state.choices.some((c) => c.target === "s3-send-never-return")).toBe(false);
  expect(visible(work.data.find.find((i) => i.id === "s3-lee-phone")!, state)).toBe(false);
  const after = dispatch(work, state, "read", "s3-lee-history-12");
  expect(after.choices.some((c) => c.target === "s3-send-never-return")).toBe(true);
});
test("闹钟、截图、发布和第二次查找不能提前推进", () => {
  const beforeReply = replay("s3-send-chan-adjust");
  expect(dispatch(work, beforeReply, "setAlarm", "05:30").variables.sceneThreeStage5).toBe(false);
  const afterChan = replay("chan-rest");
  expect(dispatch(work, afterChan, "storyScreenshot", "s3-lee-phone").variables.sceneThreeStage7).toBe(false);
  expect(dispatch(work, afterChan, "storyPost", "puppy_0922x").variables.sceneThreeStage10).toBe(false);
  const beforeSecondFind = replay("how-know-name");
  expect(beforeSecondFind.variables.sceneThreeStage13).toBe(false);
  expect(beforeSecondFind.unlocked).toContain("how-know-name");
});

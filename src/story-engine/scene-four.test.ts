import { expect, test } from "vitest";
import manuscript from "../../stories/nine-years/story.json";
import extras from "../../stories/nine-years/story.extras.json";
import three from "../../stories/nine-years/story.scene-three.json";
import four from "../../stories/nine-years/story.scene-four.json";
import { applyStoryOverlay } from "./overlay";
import { compileStory } from "./compiler";
import { initialRuntime } from "../schema";
import { advance, choose, dispatch, visible } from "../engine";
import { addSceneFourMemory, advanceSceneFour, shareSceneFourNews } from "./scene-four-runtime";

const { work, story } = compileStory(applyStoryOverlay(applyStoryOverlay(manuscript, three), four), extras);
function afterThird() {
  let state = dispatch(work, initialRuntime(work), "start");
  const path = story.tests.find((item) => item.name.startsWith("第三场"))!.steps;
  for (const step of path) {
    if (step.choose) state = choose(work, state, step.choose);
    if (step.advanceMs !== undefined) state = advance(work, state, step.advanceMs);
    if (step.event) state = dispatch(work, state, step.event, step.target);
  }
  return state;
}
test("第四场按操作跨 App 推进，保留双时间线和新闻选择", () => {
  let state = afterThird();
  expect(state.variables.sceneThreeStage13).toBe(true);
  expect(state.variables.sceneFourStage1).toBe(false);
  expect(dispatch(work, state, "timeAdvance", "three-months").variables.sceneFourStage15).toBe(false);
  state = dispatch(work, state, "saveContact", "s4-lee");
  for (let turns = 0; turns < 350 && state.variables.sceneFourStage16 !== true; turns++) {
    const before = JSON.stringify([state.completed, state.scheduled, state.choices, state.read, state.variables]);
    if (state.scheduled?.length) state = advance(work, state, 2500);
    else if (state.choices.length) state = choose(work, state, state.choices[0].target);
    else {
      const unread = Object.values(work.data).flat().find((item) => item.id.startsWith("s4-") && !item.outgoing && visible(item, state) && !state.read.includes(item.id) && item.id !== "s4-note" && !item.id.startsWith("s4-news-"));
      if (unread) {
        if (unread.id === "s4-memory-c") state = addSceneFourMemory(work, state);
        state = dispatch(work, state, "read", unread.id);
      } else if (state.variables.sceneFourStage2 && !state.variables.sceneFourStage3) state = dispatch(work, state, "openThread", "李龙馥");
      else if (state.variables.sceneFourStage7 && !state.variables.sceneFourStage8) state = advanceSceneFour(work, state, "one-hour-1");
      else if (state.variables.sceneFourStage8 && !state.variables.sceneFourStage9) state = dispatch(work, state, "writeNote", "s4-note");
      else if (state.variables.sceneFourStage9 && !state.variables.sceneFourStage10) state = advanceSceneFour(work, state, "one-hour-2");
      else if (state.variables.sceneFourStage11 && !state.variables.sceneFourStage12) state = dispatch(work, state, "storyNewsSearch", "future");
      else if (state.variables.sceneFourStage12 && !state.variables.s4Shared) {
        state = dispatch(work, state, "read", "s4-news-eclipse");
        state = shareSceneFourNews(work, state, "s4-news-eclipse");
      } else if (state.variables.sceneFourStage14 && !state.variables.sceneFourStage15) state = advanceSceneFour(work, state, "three-months");
    }
    if (before === JSON.stringify([state.completed, state.scheduled, state.choices, state.read, state.variables])) throw Error(`剧情卡在第 ${turns} 步`);
    if (state.variables.sceneFourStage13 === true && state.variables.sceneFourStage15 !== true)
      expect(state.variables.minho_blocked_seungmin).toBe(true);
  }
  expect(state.variables.sceneFourStage16).toBe(true);
  expect(state.variables.minho_blocked_seungmin).toBe(false);
  expect(state.peerDate).toBe("2018-02-21");
  expect(state.date).toBe("2026-11-21");
  expect(state.messages.messages?.find((item) => item.id === "s4-card-s4-news-eclipse")?.meta.newsId).toBe("s4-news-eclipse");
  expect(state.messages.kakao?.find((item) => item.id === "s4-chan-memory-s4-news-eclipse")?.body).toContain("月全食");
  expect(state.read).toContain("s4-recontact-d");
  expect(work.data.messages.find((item) => item.id === "s4-recontact-d")?.body).toBe("到底发生了什么？");
  expect(state.choices).toHaveLength(0);
  expect(advanceSceneFour(work, state, "three-months")).toBe(state);
  expect(shareSceneFourNews(work, state, "s4-news-eclipse")).toBe(state);
  expect(state.unlocked).toContain("s4-failed-text");
  expect(state.unlocked.filter((id) => id === "s4-failed-text")).toHaveLength(1);
});

test("第五版存档进入第四场时保留第三场记录", () => {
  const saved = afterThird();
  saved.revision = 5;
  const resumed = dispatch(work, { ...saved, revision: 6, variables: { ...work.variables, ...saved.variables } }, "resumeRevision", "5");
  expect(resumed.variables.sceneThreeStage13).toBe(true);
  expect(resumed.read).toContain("how-know-name");
  expect(resumed.variables.sceneFourStage1).toBe(false);
  expect(resumed.completed).toContain("s4-resume");
});

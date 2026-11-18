import { expect, test } from "vitest";
import manuscript from "../../stories/nine-years/story.json";
import extras from "../../stories/nine-years/story.extras.json";
import three from "../../stories/nine-years/story.scene-three.json";
import four from "../../stories/nine-years/story.scene-four.json";
import finale from "../../stories/nine-years/story.finale.json";
import { applyStoryOverlay } from "./overlay";
import { compileStory } from "./compiler";
import { initialRuntime } from "../schema";
import { advance, choose, dispatch, visible } from "../engine";
import { addSceneFourMemory, advanceSceneFour, shareSceneFourNews } from "./scene-four-runtime";
import { advanceFinale, makeStoryTransfer, reconnectTo2010, takeFinalPhoto } from "./finale-runtime";
import { orderMessages, reconcileMessageOrder } from "../messageOrder";

const { work, story } = compileStory(applyStoryOverlay(applyStoryOverlay(applyStoryOverlay(manuscript, three), four), finale), extras);

test("第三场新闻到第四场第一句在同一会话末尾，旧存档也按事件顺序迁移", () => {
  let state = afterFourth();
  const first = state.choices.find((choice) => choice.target === "f-send-f-msg-1");
  expect(first).toBeTruthy();
  state = choose(work, state, first!.target);
  const legacy = { ...state, messageOrderVersion: undefined, messageOrder: { "messages:treehole-thread": ["s4-recontact-d"], "messages:陌生号码": ["f-msg-1"] } };
  const restored = reconcileMessageOrder(work, legacy);
  const shown = orderMessages("messages", [...work.data.messages.filter((item) => visible(item, restored)), ...(restored.messages.messages || [])].filter((item) => item.title === "陌生号码"), restored);
  const ids = shown.map((item) => item.id);
  const card = ids.findIndex((id) => id.startsWith("s4-card-"));
  expect(card).toBeGreaterThan(-1);
  expect(card).toBeLessThan(ids.indexOf("s4-recontact-a"));
  expect(ids.indexOf("s4-failed-text")).toBeLessThan(ids.indexOf("s4-recontact-a"));
  expect(ids.indexOf("s4-recontact-d") + 1).toBe(ids.indexOf("f-msg-1"));
  expect(reconcileMessageOrder(work, structuredClone(restored)).messageOrder).toEqual(restored.messageOrder);
});
function afterThird() {
  let state = dispatch(work, initialRuntime(work), "start");
  for (const step of story.tests.find((item) => item.name.startsWith("第三场"))!.steps) {
    if (step.choose) state = choose(work, state, step.choose);
    if (step.advanceMs !== undefined) state = advance(work, state, step.advanceMs);
    if (step.event) state = dispatch(work, state, step.event, step.target);
  }
  return state;
}
function afterFourth() {
  let state = dispatch(work, afterThird(), "saveContact", "s4-lee");
  for (let n = 0; n < 400 && state.variables.sceneFourStage16 !== true; n++) {
    if (state.scheduled?.length) state = advance(work, state, 3000);
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
      else if (state.variables.sceneFourStage12 && !state.variables.s4Shared) { state = dispatch(work, state, "read", "s4-news-eclipse"); state = shareSceneFourNews(work, state, "s4-news-eclipse"); }
      else if (state.variables.sceneFourStage14 && !state.variables.sceneFourStage15) state = advanceSceneFour(work, state, "three-months");
    }
  }
  expect(state.variables.sceneFourStage16).toBe(true);
  return state;
}

test("从旧章节进入全剧终，跨 App 节点均可完成且自拍不会提前出现", () => {
  let state = afterFourth();
  const originalDate = state.date;
  expect(state.messages.photos?.some((item) => item.id === "f-final-selfie")).not.toBe(true);
  for (let n = 0; n < 600 && state.variables.storyFinalComplete !== true; n++) {
    const before = JSON.stringify([state.completed.length,state.choices.length,state.read.length,state.variables.finalPhase,state.scheduled?.length]);
    if (state.scheduled?.length) state = advance(work, state, 3000);
    else if (state.choices.length) state = choose(work, state, state.choices[0].target);
    else {
      const phase = Number(state.variables.finalPhase);
      const unread = Object.values(work.data).flat().find((item) => item.id.startsWith("f-") && !item.outgoing && visible(item,state) && !state.read.includes(item.id) && item.id !== "f-locked-note");
      if (phase===28) state = advanceFinale(work,state,"rescue-72h");
      else if (unread) state = dispatch(work,state,"read",unread.id);
      else if (phase===8) state = dispatch(work,state,"deleteReminder","f-clue-reminder");
      else if ([2,6,9,12,15,24,26,28].includes(phase)) {
        const targets: Record<number,string> = {2:"week-1",6:"week-2",9:"week-3",12:"week-4",15:"week-5",24:"future-autumn",26:"camp-day",28:"rescue-72h"};
        state = advanceFinale(work,state,targets[phase]);
      } else if (phase===18) state = reconnectTo2010(work,state);
      else if (phase===20) state = makeStoryTransfer(work,state,"1025");
      else if (phase===22) state = dispatch(work,state,"password","f-locked-note");
      else if (phase===23) state = dispatch(work,state,"read","f-locked-note");
      else if (phase===30) state = takeFinalPhoto(work,state,"data:image/jpeg;base64,AA==");
    }
    if (before===JSON.stringify([state.completed.length,state.choices.length,state.read.length,state.variables.finalPhase,state.scheduled?.length])) throw Error(`剧情卡在第 ${n} 步，阶段 ${state.variables.finalPhase}`);
    if (Number(state.variables.finalPhase)<24) expect(state.date).toBe(originalDate);
  }
  expect(state.variables.storyFinalComplete).toBe(true);
  expect(state.variables.storyTransferAmount).toBe("1025");
  expect(state.peerDate?.startsWith("2010-")).toBe(true);
  expect(state.date).toBe("2030-10-15");
  expect(state.messages.photos?.find((item)=>item.id==="f-final-selfie")?.meta.capturedAt).toContain("2030-10-15");
});

test("转账金额由玩家决定，重复确认不会生成第二张卡片", () => {
  const reached = afterFourth();
  const waiting = { ...reached, variables: { ...reached.variables, finalPhase: 20 } };
  expect(makeStoryTransfer(work, waiting, "123")).toBe(waiting);
  const sent = makeStoryTransfer(work, waiting, "4732");
  expect(sent.variables.storyTransferAmount).toBe("4732");
  expect(sent.variables.childhoodTransferAmount).toBe("4732");
  expect(sent.variables.childhoodTransferCompleted).toBe(true);
  expect(sent.messages.messages?.find((item) => item.id === "f-transfer-card")?.meta.memo).toBe("这么喜欢跳舞的话，就别轻易向生活低头。");
  expect(sent.messages.messages?.filter((item) => item.id === "f-transfer-card")).toHaveLength(1);
  expect(makeStoryTransfer(work, sent, "4732")).toBe(sent);
});

test("锁屏、双时间线与新闻 App 配置", () => {
  expect(work.phone.passcode).toBe("1023");
  expect(work.apps.some((app) => (app.id === "news" || app.id === "instagram") && app.installed)).toBe(false);
  expect(work.data.twitter.some((item) => item.id === "f-alert-news" && item.folder === "动态")).toBe(true);
  expect(work.data.twitter.some((item) => item.id === "f-rescue-news" && item.folder === "动态")).toBe(true);
  const before = afterThird();
  expect(before.variables.sceneFourStage1).not.toBe(true);
  expect(reconnectTo2010(work, { ...before, variables: { ...before.variables, finalPhase: 17 } })).toEqual({ ...before, variables: { ...before.variables, finalPhase: 17 } });
});

test("旧版第六修订存档保留消息和已完成任务", () => {
  const saved = afterFourth();
  const restored = dispatch(work, { ...saved, revision: 7, variables: { ...work.variables, ...saved.variables } }, "resumeRevision", "6");
  expect(restored.variables.sceneFourStage16).toBe(true);
  expect(restored.read).toContain("s4-recontact-d");
  expect(restored.completed).toContain("f-resume");
  expect(restored.variables.finalPhase).toBe(1);
  expect(restored.choices.length).toBeGreaterThan(0);
});

test("另一回复分支记录选择并在日常通信前合流", () => {
  let state = afterFourth();
  for (let n=0; n<40 && !state.choices.some((choice)=>choice.target==="f-branch-b1"); n++) {
    if (state.scheduled?.length) state=advance(work,state,3000);
    else if (state.choices.length) state=choose(work,state,state.choices[0].target);
    else {
      const unread=work.data.messages.find((item)=>item.id.startsWith("f-") && !item.outgoing && visible(item,state) && !state.read.includes(item.id));
      if (unread) state=dispatch(work,state,"read",unread.id);
    }
  }
  expect(state.choices.some((choice)=>choice.target==="f-branch-b1")).toBe(true);
  state=choose(work,state,"f-branch-b1");
  expect(state.variables.finalBranch).toBe("B");
  state=dispatch(work,state,"read","f-branch-B-answer");
  expect(state.variables.finalPhase).toBe(2);
});

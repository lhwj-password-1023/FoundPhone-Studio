import { test, expect } from "vitest";
import extras from "../stories/nine-years/story.extras.json";
import manuscript from "../stories/nine-years/story.json";
import { compileStory } from "./story-engine/compiler";
import { initialRuntime } from "./schema";
import { actorPermits } from "./actor";
import { dispatch, advance, choose } from "./engine";
const { work, story } = compileStory(manuscript, extras);
test("发送许可仅属于当前剧情提供的预设和指定会话", () => {
  let s = dispatch(work, initialRuntime(work), "start");
  expect(actorPermits(work, s, "message", "messages", "陌生号码")).toBe(false);
  for (const step of story.tests[0].steps) {
    if (step.choose) break;
    if (step.event) s = dispatch(work, s, step.event, step.target);
    if (step.advanceMs) s = advance(work, s, step.advanceMs);
  }
  const preset = work.data.messages.find((i) =>
    s.choices.some((c) => c.target === i.meta.reply),
  )!;
  expect(preset).toBeDefined();
  expect(
    actorPermits(work, s, "message", "messages", "陌生号码", preset.id),
  ).toBe(true);
  expect(actorPermits(work, s, "message", "kakao", "灿哥", preset.id)).toBe(
    false,
  );
  expect(actorPermits(work, s, "dm", "twitter", "灿哥", preset.id)).toBe(false);
  expect(actorPermits(work, s, "post", "twitter", "timeline", preset.id)).toBe(
    false,
  );
  s = choose(work, s, preset.meta.reply);
  expect(
    actorPermits(work, s, "message", "messages", "陌生号码", preset.id),
  ).toBe(false);
});
test("普通社交表达全部默认拒绝，回电需要配置许可并且不能重复触发", () => {
  const s = dispatch(work, initialRuntime(work), "start");
  for (const action of [
    "message",
    "reply",
    "post",
    "comment",
    "dm",
    "repost",
    "email",
    "call",
  ] as const)
    expect(actorPermits(work, s, action, "twitter", "timeline")).toBe(false);
  expect(actorPermits(work, s, "call", "contacts", "mom-card")).toBe(true);
  const after = dispatch(work, s, "requestCallback", "mom-card");
  expect(after.incomingCall?.caller).toBe("妈妈");
  expect(actorPermits(work, after, "call", "contacts", "mom-card")).toBe(false);
  expect(actorPermits(work, s, "call", "phone", "虚构号码·占位MOM")).toBe(
    false,
  );
});
test("社交预设始终早于手机时间，李旻浩当前线记录仍停在一个月前", () => {
  const today = work.phone.date + " " + work.phone.time;
  for (const item of work.data.twitter) expect(item.time <= today).toBe(true);
  const names = new Set(
    work.data.twitter.filter((i) => i.folder === "动态").map((i) => i.sender),
  );
  expect(names.size).toBeGreaterThan(8);
  const lee = work.data.twitter.filter(
    (i) => i.meta.userId === "x-user-lee" && i.folder === "动态",
  );
  expect(lee.every((i) => i.time <= "2026-10-20 23:59")).toBe(true);
  expect(work.data.photos.some((i) => i.id === "album-7")).toBe(false);
});
test("未来的发布预设可以单独授权，撤销变量后立即失效", () => {
  const w = structuredClone(work),
    s = initialRuntime(w);
  const preset = structuredClone(work.data.messages.find((i) => i.meta.reply)!);
  preset.id = "authorized-post";
  preset.title = "timeline";
  preset.meta = {
    reply: "allowed-post",
    action: "post",
    actionTarget: "timeline",
    permission: "readyToPost",
  };
  w.data.twitter.push(preset);
  s.choices = [{ label: "发这条", target: "allowed-post" }];
  s.variables.readyToPost = true;
  expect(actorPermits(w, s, "post", "twitter", "timeline", preset.id)).toBe(
    true,
  );
  expect(actorPermits(w, s, "comment", "twitter", "timeline", preset.id)).toBe(
    false,
  );
  s.variables.readyToPost = false;
  expect(actorPermits(w, s, "post", "twitter", "timeline", preset.id)).toBe(
    false,
  );
});
test("附加社交数据复用照片且不能替换主线节点", () => {
  const base = compileStory(manuscript).work;
  expect(work.nodes).toEqual(base.nodes);
  expect(work.updatedAt).toEqual(base.updatedAt);
  expect(work.data.twitter.find((i) => i.id === "x-post-0")?.media).toBe(
    work.data.photos.find((i) => i.id === "album-3")?.media,
  );
  expect(() => compileStory(manuscript, { events: [] })).toThrow();
});
test("附加媒体引用不能复制尚未开放的照片", () => {
  const photo = manuscript.content.photos.find((i) => i.id === "joined-hands")!;
  const protectedStory = {
    ...manuscript,
    content: {
      ...manuscript.content,
      photos: manuscript.content.photos.map((i) =>
        i.id === photo.id ? { ...i, hidden: true } : i,
      ),
    },
  };
  const compiled = compileStory(protectedStory, {
    content: {
      photos: [
        {
          id: "guarded-copy",
          title: "预览",
          kind: "image",
          meta: { resource: photo.id },
        },
      ],
    },
  }).work;
  expect(compiled.data.photos.find((i) => i.id === "guarded-copy")?.media).toBe(
    "",
  );
});

import { testCondition } from "../engine";
import { guidanceTaskSchema, type Condition, type GuidanceTask, type Runtime, type Work } from "../schema";
import { replyOptions } from "./timeline";

type Predicate = Condition | { all: Predicate[] } | { any: Predicate[] } | { not: Predicate };
const matches = (rule: unknown, state: Runtime): boolean => {
  const p = rule as Predicate;
  if ("all" in p) return p.all.every((part) => matches(part, state));
  if ("any" in p) return p.any.some((part) => matches(part, state));
  if ("not" in p) return !matches(p.not, state);
  return testCondition(p, state);
};

export function validateGuidance(work: Work, input: unknown): GuidanceTask[] {
  const tasks = guidanceTaskSchema.array().parse(input);
  const ids = new Set<string>();
  for (const task of tasks) {
    if (ids.has(task.id)) throw Error(`重复的引导任务 ${task.id}`);
    ids.add(task.id);
    if (!work.apps.some((app) => app.id === task.app))
      throw Error(`引导任务 ${task.id} 引用了不存在的 App ${task.app}`);
    if (!task.hint.trim()) throw Error(`引导任务 ${task.id} 缺少操作提示`);
  }
  return tasks;
}

export function pendingGuidance(work: Work, state: Runtime): GuidanceTask[] {
  return work.guidance
    .filter((task) => matches(task.prerequisites, state) && !matches(task.completion, state))
    .sort((a, b) => b.priority - a.priority);
}

export function blockedMessage(work: Work, state: Runtime, thread: string): boolean {
  if (replyOptions(work, state, "messages", thread).length) return false;
  return pendingGuidance(work, state).some((task) => task.blocks.includes(thread));
}

export function guidanceAnswer(work: Work, state: Runtime): string {
  const currentThread = String(state.ui?.messages?.thread || "");
  if (currentThread && replyOptions(work, state, "messages", currentThread).length)
    return "现在可以返回 iMessage，继续对话了。";
  const available = Object.entries(work.data).flatMap(([app, items]) =>
    items.filter((item) => item.outgoing && state.choices.some((choice) => choice.target === item.meta.reply))
      .map((item) => ({ app, item })),
  );
  if (available.length) {
    const { app, item } = available[0];
    if (app === "messages") return "现在可以返回 iMessage，继续对话了。";
    const name = work.apps.find((entry) => entry.id === app)?.name || app;
    return `打开「${name}」→「${item.title}」，点输入框选择当前预设回复并发送。`;
  }
  const tasks = pendingGuidance(work, state);
  if (tasks.length) return tasks.filter((task) => task.priority === tasks[0].priority).map((task) => task.hint).join("\n");
  return "目前的剧情已经全部完成，暂时没有新的任务。你可以继续自由探索手机。";
}

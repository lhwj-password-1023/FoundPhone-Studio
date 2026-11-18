import type { Runtime, Work, Item } from "./schema";

export type ActorAction =
  "message" | "reply" | "call" | "post" | "comment" | "repost" | "dm" | "email";
export const actorFeedback: Record<ActorAction, string> = {
  message: "昇玟现在不想发送消息。",
  reply: "昇玟现在不想发送消息。",
  call: "昇玟现在不想打电话。",
  post: "昇玟现在不想发布动态。",
  comment: "昇玟现在不想回复。",
  repost: "昇玟现在不想转发这条动态。",
  dm: "昇玟现在不想发送消息。",
  email: "昇玟现在不想发送邮件。",
};
export function actorPermits(
  work: Work,
  state: Runtime,
  action: ActorAction,
  app: string,
  target: string,
  preset?: string,
) {
  if (state.endings.length) return false;
  if (action === "call")
    return (
      (state.variables["permit:call:" + app + ":" + target] ??
        work.variables["permit:call:" + app + ":" + target]) === true &&
      work.nodes.some(
        (n) =>
          n.event === "requestCallback" &&
          n.target === target &&
          !state.completed.includes(n.id),
      )
    );
  if (!preset) return false;
  const item = (work.data[app] || []).find((i) => i.id === preset);
  if (
    !item?.meta.reply ||
    !state.choices.some((c) => c.target === item.meta.reply)
  )
    return false;
  const kind =
    item.meta.action || (["messages", "kakao"].includes(app) ? "message" : "");
  const sameKind =
    kind === action || (kind === "message" && action === "reply");
  return (
    sameKind &&
    (item.meta.actionTarget || item.title) === target &&
    (!item.meta.permission ||
      (state.variables[item.meta.permission] ??
        work.variables[item.meta.permission]) === true)
  );
}
export function permittedPresets(
  work: Work,
  state: Runtime,
  action: ActorAction,
  app: string,
  target: string,
): Item[] {
  return (work.data[app] || []).filter((i) =>
    actorPermits(work, state, action, app, target, i.id),
  );
}

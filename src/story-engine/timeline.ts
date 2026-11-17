import type { Runtime, Work } from "../schema";

// Story timestamps use Seoul civil time. Readers' device time is never used.
export function shiftYears(stamp: string, offset: number) {
  if (!/^\d{4}-\d\d-\d\d [0-2]\d:[0-5]\d$/.test(stamp))
    throw Error("无效的剧情时间 " + stamp);
  const date = new Date(stamp.replace(" ", "T") + ":00Z");
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 16).replace("T", " ") !== stamp
  )
    throw Error("无效日期 " + stamp);
  const day = date.getUTCDate();
  date.setUTCFullYear(date.getUTCFullYear() + offset);
  if (day !== date.getUTCDate())
    throw Error("跨年后日期不存在，请指定两年均有效的日期");
  return date.toISOString().slice(0, 16).replace("T", " ");
}

export function validateTimeline(work: Work) {
  if (!work.timeline) return;
  const records = Object.values(work.data).flat();
  for (const item of records) {
    const meta = item.meta;
    if (meta.conversationId) {
      const offset =
        meta.route === "B-A"
          ? work.timeline.years
          : meta.route === "A-B"
            ? -work.timeline.years
            : 0;
      if (
        !["B-A", "A-B", "A-A", "B-B"].includes(meta.route) ||
        shiftYears(meta.sentAt, offset) !== meta.arrivedAt ||
        item.time !==
          (meta.route.startsWith("B-") && offset ? meta.arrivedAt : meta.sentAt)
      )
        throw Error(item.id + " 的发送、抵达或设备日期不一致");
    }
    if (meta.age !== undefined) {
      const birth = work.timeline.birthdays?.[meta.senderId];
      if (!birth) throw Error(item.id + " 缺少出生日期");
      shiftYears(birth + " 00:00", 0);
      const day = (meta.sentAt || item.time).slice(0, 10);
      const age =
        Number(day.slice(0, 4)) -
        Number(birth.slice(0, 4)) -
        (day.slice(5) < birth.slice(5) ? 1 : 0);
      if (age !== Number(meta.age) || age < 0)
        throw Error(item.id + " 年龄与日期冲突");
    }
    for (const key of ["capturedAt", "createdAt", "importedAt", "eventAt"]) {
      if (meta[key]) shiftYears(meta[key], 0);
    }
    if (meta.createdAt && meta.importedAt && meta.createdAt > meta.importedAt)
      throw Error(item.id + " 导入早于文件创建");
    if (meta.requires && !(meta.requires in work.variables))
      throw Error(item.id + " 的知识条件未定义");
    if (
      meta.reply &&
      (!item.outgoing ||
        !item.hidden ||
        !work.nodes.some(
          (n) =>
            n.id === meta.reply &&
            n.actions.some((a) => a.type === "unlock" && a.key === item.id),
        ))
    )
      throw Error(item.id + " 回复与选项未关联");
    if (meta.resource) {
      const asset = records.find((i) => i.id === meta.resource);
      if (!asset || asset.kind !== item.kind || asset.password)
        throw Error(item.id + " 的附件引用无效");
    }
  }
}

export function replyOptions(
  work: Work,
  state: Runtime,
  app: string,
  thread: string,
) {
  return (work.data[app] || []).filter(
    (i) =>
      i.title === thread &&
      state.choices.some((c) => c.target === i.meta.reply),
  );
}

export function routeForNotice(notice: string, work: Work) {
  if (!notice.startsWith("@item/")) return;
  const id = notice.slice(6);
  for (const [app, items] of Object.entries(work.data)) {
    const item = items.find((i) => i.id === id);
    if (item) return { app, item };
  }
}

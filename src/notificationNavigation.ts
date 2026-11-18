import type { Item, Runtime, UiValue, Work } from "./schema";
import { routeForNotice } from "./story-engine/timeline";

export function notificationTarget(notice: string, work: Work, state: Runtime) {
  const authored = routeForNotice(notice, work);
  if (authored) return authored;
  if (notice.startsWith("@item/")) {
    const id = notice.slice(6);
    for (const [app, items] of Object.entries(state.messages)) {
      const item = items.find((entry) => entry.id === id);
      if (item) return { app, item };
    }
  }
  return null;
}

export function recordNavigation(appId: string, item: Item, ui?: Record<string, UiValue>): Record<string, UiValue> {
  if (appId === "messages" || appId === "kakao") return {
    thread: item.title,
    detail: "",
    ["anchor:" + item.title]: item.id,
    routeVisit: Number(ui?.routeVisit || 0) + 1,
  };
  if (appId === "x") return {
    xTab: item.folder === "私信" ? "私信" : item.folder === "通知" && !item.meta.target ? "通知" : "首页",
    xDetail: item.meta.target || item.meta.postId || (item.folder === "动态" ? item.id : ""),
    xDm: item.folder === "私信" ? item.title : "",
  };
  return { thread: "", detail: item.id };
}

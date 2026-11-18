import { test, expect } from "@playwright/test";
const button = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("button", { name, exact: true });
test("X 的浏览、搜索、收藏与拒绝发送在刷新后保持一致", async ({ page }) => {
  await page.goto("/");
  await button(page, "轻触解锁").click();
  await button(page, "打开X").click();
  await expect(page.locator(".sx-post")).toHaveCount(34);
  await button(page, "点赞热汤").click();
  await button(page, "收藏热汤").click();
  await button(page, "转发热汤").click();
  await expect(page.getByRole("status")).toHaveText(
    "昇玟现在不想转发这条动态。",
  );
  await button(page, "发布新动态").click();
  await page.getByRole("textbox", { name: "发布动态草稿" }).fill("随便写一句");
  await button(page, "发布动态").click();
  await expect(page.getByRole("status")).toHaveText("昇玟现在不想发布动态。");
  await expect(page.getByRole("textbox", { name: "发布动态草稿" })).toHaveValue(
    "随便写一句",
  );
  await page.reload();
  await button(page, "轻触解锁").click();
  await button(page, "打开X").click();
  await expect(button(page, "点赞热汤")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(button(page, "收藏热汤")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await button(page, "搜索").click();
  await page.getByRole("textbox", { name: "搜索用户或话题" }).fill("李旻浩");
  await expect(page.locator(".sx-person")).toContainText("旻浩哥");
  await button(page, "通知").click();
  await page.locator(".sx-notice").first().click();
  await button(page, "私信").click();
  await page.locator(".sx-person").filter({ hasText: "灿哥" }).click();
  await button(page, "发送消息").click();
  await expect(page.getByRole("status")).toHaveText("昇玟现在不想发送消息。");
  await expect(page.locator(".sx-dm")).toHaveCount(2);
  await button(page, "返回桌面").click();
});

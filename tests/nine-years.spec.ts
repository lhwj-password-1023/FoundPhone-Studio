import demo from "../stories/nine-years/demo.json";
import { compileStory } from "../src/story-engine/compiler";
import { test, expect, type Page } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
async function reply(page: Page, prefix: string) {
  await button(page, "选择回复").click();
  await page
    .locator(".archive-options button")
    .filter({ hasText: prefix })
    .click();
  await button(page, "发送回复").click();
}
test("从锁屏读到最后一条消息，再解锁番外", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/work.json", (route) =>
    route.fulfill({ json: compileStory(demo).work }),
  );
  await page.goto("/");
  await expect(page.locator(".fiction-lock")).toContainText("虚构");
  await page.locator(".notice-open").click();
  await expect(page.locator(".archive-chat header")).toContainText("李旻浩");
  await reply(page, "我这里星期五");
  await page.locator('[data-record="windowMsg"] .archive-bubble').click();
  await button(page, "查看原文件").click();
  await button(page, "照片信息").click();
  await expect(page.locator(".archive-photo-info")).toContainText("2017-06-12");
  await expect(page.locator(".archive-photo-info")).toContainText("2026-06-12");
  await button(page, "返回桌面").click();
  await button(page, "打开信息").click();
  await page.locator('[data-record="mismatch"]').scrollIntoViewIfNeeded();
  await reply(page, "是六月十二日");
  await page.locator('[data-record="audition"]').scrollIntoViewIfNeeded();
  await reply(page, "旻浩哥");
  await button(page, "返回桌面").click();
  await button(page, "打开备忘录").click();
  await expect(page.getByText("给下车以后的人", { exact: true })).toHaveCount(
    0,
  );
  await page
    .locator(".notes-list button")
    .filter({ hasText: "没有发出去的话" })
    .click();
  await expect(page.locator(".native-note-paper")).toContainText("去世");
  await page.reload();
  await button(page, "轻触解锁").click();
  await button(page, "打开信息").click();
  await page.locator('[data-record="ask"]').scrollIntoViewIfNeeded();
  await reply(page, "嗯。我听你说");
  await page.locator('[data-record="final"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-record="final"]')).toContainText(
    "我去参加选秀",
  );
  await button(page, "返回桌面").click();
  await button(page, "打开备忘录").click();
  await button(page, "返回").click();
  await page
    .locator(".notes-list button")
    .filter({ hasText: "给下车以后的人" })
    .click();
  await page.getByPlaceholder("内容密码").fill("0000");
  await button(page, "解锁内容").click();
  await expect(page.getByText("密码不正确", { exact: true })).toBeVisible();
  await page.getByPlaceholder("内容密码").fill("0612");
  await button(page, "解锁内容").click();
  await expect(page.locator(".native-note-paper")).toContainText("下车以后");
  await page.reload();
  await button(page, "轻触解锁").click();
  await button(page, "打开备忘录").click();
  await expect(page.locator(".native-note-paper")).toContainText("车里的灯");
  await expect(page.locator(".story-overlay")).toHaveCount(0);
});

test("陌生号码第一场，写下备忘录后才能继续", async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".notice-open")).toContainText("陌生号码");
  await page.locator(".notice-open").click();
  await expect(page.locator(".archive-chat header")).toContainText("陌生号码");
  await reply(page, "是不是发错了。");
  await reply(page, "没关系");
  await reply(page, "你到底是？");
  await page.locator('[data-record="leave"]').scrollIntoViewIfNeeded();
  await button(page, "发送回复").click();
  await expect(page.getByRole("status")).toHaveText("昇玟现在不想发送消息。");
  await button(page, "返回桌面").click();
  await button(page, "打开备忘录").click();
  await page
    .locator(".notes-list button")
    .filter({ hasText: "十一月二十日晚" })
    .click();
  await button(page, "写下备忘录").click();
  await page.reload();
  await button(page, "轻触解锁").click();
  await button(page, "打开信息").click();
  await button(page, "发送回复").click();
  await expect(page.getByRole("status")).toHaveText("昇玟现在不想发送消息。");
  await button(page, "返回桌面").click();
  await button(page, "打开备忘录").click();
  await button(page, "完成").click();
  await button(page, "返回桌面").click();
  await button(page, "打开信息").click();
  await reply(page, "请问，真的有那样的树洞吗？");
  await reply(page, "我也想试着联系看看");
  await expect(page.locator('[data-record="try-too-text"]')).toContainText(
    "我也想试着联系看看",
  );
  await button(page, "发送回复").click();
  await expect(page.getByRole("status")).toHaveText("昇玟现在不想发送消息。");
});

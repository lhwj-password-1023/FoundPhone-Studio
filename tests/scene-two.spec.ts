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
for (const [branch, answer, otherAnswer] of [
  ["抱歉……我暂时", "anytime", "glad-to-help"],
  ["真的吗，我可以", "glad-to-help", "anytime"],
]) {
  test("第二场从第一场旧存档继续 · " + branch, async ({ page }) => {
    test.setTimeout(110000);
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto("/");
    await expect(page.locator(".notice-open")).toBeVisible();
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const opened = indexedDB.open("foundphone-studio");
        opened.onsuccess = () => resolve(opened.result);
        opened.onerror = () => reject(opened.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("saves", "readwrite");
        const saves = tx.objectStore("saves");
        const request = saves.get("nine-years");
        request.onsuccess = () => {
          const record = request.result;
          const s = record.state;
          s.revision = 3;
          s.time = "21:41";
          s.variables = {
            ownerKnowsLoss: true,
            readerKnowsLoss: false,
            noteWritten: true,
            sceneOneComplete: true,
          };
          s.completed = ["try-too", "finish-note", "treehole"];
          s.unlocked = ["evening-note", "treehole-text", "try-too-text"];
          s.read = ["opening", ...s.unlocked];
          s.choices = [];
          s.scheduled = [];
          s.notifications = [];
          s.ui = { messages: { thread: "陌生号码" } };
          saves.put(record);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.reload();
    await page.locator(".notice-open").filter({ hasText: "树洞" }).click();
    const paper = page.locator('[data-record="classified"] img');
    await expect(paper).toBeVisible();
    await paper.click();
    await expect(page.locator(".attachment-preview img")).toBeVisible();
    await button(page, "关闭详情").click();
    await reply(page, "可这个号码");
    await reply(page, branch);
    await expect(page.locator('[data-record="' + answer + '"]')).toBeVisible({
      timeout: 18000,
    });
    await expect(
      page.locator('[data-record="' + otherAnswer + '"]'),
    ).toHaveCount(0);
    await button(page, "返回桌面").click();
    await button(page, "打开相册").click();
    const oldest = page.locator(".photo-mosaic button").last();
    await expect(oldest).toHaveAttribute("aria-label", "查看牵手");
    await oldest.click();
    await expect(page.locator(".native-photo-stage img")).toBeVisible();
    await button(page, "返回桌面").click();
    await button(page, "打开日历").click();
    await button(page, "上个月").click();
    await button(page, "4").click();
    await expect(page.locator(".calendar-event")).toContainText("送别");
    await button(page, "返回桌面").click();
    await button(page, "打开信息").click();
    await expect(page.locator(".archive-input")).toBeDisabled();
    await expect(
      page.getByText("那你可以教教我，怎么忘记一个人吗", { exact: true }),
    ).toHaveCount(0);
    await button(page, "返回桌面").click();
    await button(page, "打开相册").click();
    await button(page, "返回").click();
    await oldest.click();
    await page.reload();
    await button(page, "轻触解锁").click();
    await button(page, "打开信息").click();
    await reply(page, "那你可以教教我");
    await expect(page.locator('[data-record="how-to-forget-text"]')).toHaveText(
      /那你可以教教我，怎么忘记一个人吗/,
      { timeout: 10000 },
    );
  });
}

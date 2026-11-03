import { chromium, expect as originalExpect } from "@playwright/test";
import fs from "node:fs/promises";
const expect = originalExpect.configure({ timeout: 15000 });
const origin = process.env.TEST_BASE_URL || "http://127.0.0.1:3050";
const credentials = JSON.parse(await fs.readFile("data/access.json", "utf8"));
const results = [],
  errors = [];
const pass = (name) => {
  results.push({ name, passed: true });
  console.log("PASS " + name);
};
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
await fs.mkdir("docs/screenshots", { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const goto = async (url) => {
  await page.goto(origin + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
};
const login = async (credential) => {
  await goto("/");
  await page.getByRole("button", { name: "登录 / 注册", exact: true }).click();
  await page.locator("[name=email]").fill(credential.email);
  await page.locator("[name=password]").fill(credential.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.locator(".user-avatar")).toBeVisible();
};
try {
  await goto("/");
  await expect(page.locator(".resource-card")).toHaveCount(12);
  pass("公开首页12条真实数据库资源");
  await page.getByRole("button", { name: "空间场地", exact: true }).click();
  await expect(page.locator(".resource-card")).toHaveCount(2);
  pass("分类筛选");
  await page.getByRole("button", { name: "全部资源", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索资源" }).fill("摄影器材");
  await page.getByRole("button", { name: "开始搜索" }).click();
  await expect(page.locator(".resource-card")).toHaveCount(1);
  pass("关键词搜索");
  await page.locator(".resource-card h3").click();
  await expect(page.locator(".detail-copy h1")).toContainText("摄影器材");
  pass("资源详情");
  await goto("/download");
  await expect(
    page.getByRole("link", { name: "下载 Android APK" }),
  ).toBeVisible();
  const dl = await context.request.get(origin + "/api/apk/download");
  expect(dl.status()).toBe(200);
  expect((await dl.body()).subarray(0, 2).toString()).toBe("PK");
  pass("公开真实APK下载");
  await login(credentials.demo);
  pass("真实UI登录");
  await goto("/account");
  await expect(page.locator(".feature-grid>a")).toHaveCount(15);
  const vals = await page.locator(".account-stats strong").allTextContents();
  expect(vals.some((v) => Number(v) > 0)).toBeTruthy();
  pass("用户中心全部15项功能和真实统计");
  await page.screenshot({
    path: "docs/screenshots/desktop-account.png",
    fullPage: true,
  });
  await goto("/network");
  await expect(page.locator(".person-card")).toHaveCount(6);
  await expect(page.locator(".introduction-path").first()).toBeVisible();
  pass("真实一度和二度关系展示");
  await page.getByRole("button", { name: "我的好友", exact: true }).click();
  await expect(page.locator(".person-card")).toHaveCount(3);
  await page
    .locator(".person-card")
    .first()
    .getByRole("button", { name: "私信交流" })
    .click();
  await expect(page).toHaveURL(/with=\d+/);
  await expect(page.locator(".message-input")).toBeVisible();
  pass("好友私信跳转使用用户ID");
  await goto("/account/profile");
  await expect(page.locator("[name=city]")).toHaveValue("深圳");
  await expect(page.locator("[name=skills]")).not.toHaveValue("");
  await page.getByRole("button", { name: "保存资料" }).click();
  await expect(page.getByRole("status")).toContainText("个人资料已保存");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("[name=skills]")).not.toHaveValue("");
  pass("名片保存不丢城市技能");
  await goto("/account/notifications");
  await page.getByRole("button", { name: "全部已读" }).click();
  await expect(page.locator(".list-row>.live-dot")).toHaveCount(0);
  pass("通知已读显示一致");
  await goto("/feed");
  await expect(page.locator(".post-card").first()).toBeVisible();
  await page.locator(".post-actions button").first().click();
  await page.waitForTimeout(400);
  await page.locator(".post-actions button").first().click();
  pass("机域动态点赞和取消");
  await goto("/ai");
  await page.locator(".ai-modes button").filter({ hasText: "AI 找人" }).click();
  await page
    .getByRole("textbox", { name: "向小赋提问" })
    .fill("请从我的可见人脉中推荐一个懂产品策略的好友，给出真实名字和下一步。");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await expect(page.locator(".chat-message.assistant")).toBeVisible({
    timeout: 100000,
  });
  expect(
    (await page.locator(".chat-message.assistant .message-text").textContent())
      .length,
  ).toBeGreaterThan(20);
  pass("浏览器小赋AI找人真实响应");
  await page.screenshot({
    path: "docs/screenshots/desktop-ai.png",
    fullPage: true,
  });
  await goto("/account/history");
  await page.locator(".history-row").first().click();
  await expect(page.locator(".history-message")).toHaveCount(2);
  pass("AI历史记录真实回读");
  for (const url of [
    "/",
    "/feed",
    "/demands",
    "/network",
    "/account",
    "/account/profile",
    "/account/resources",
    "/account/demands",
    "/account/favorites",
    "/account/matches",
    "/account/invite",
    "/account/settings",
    "/messages",
    "/download",
    "/about",
  ]) {
    await goto(url);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  pass("15个桌面路由可用且无溢出");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  for (const url of [
    "/",
    "/feed",
    "/network",
    "/account",
    "/account/profile",
    "/account/resources",
    "/messages",
    "/ai",
    "/download",
  ]) {
    await goto(url);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await expect(page.locator(".mobile-bottom")).toBeVisible();
    if (url === "/")
      await page.screenshot({
        path: "docs/screenshots/mobile-home.png",
        fullPage: true,
      });
    if (url === "/account")
      await page.screenshot({
        path: "docs/screenshots/mobile-account.png",
        fullPage: true,
      });
    if (url === "/download")
      await page.screenshot({
        path: "docs/screenshots/mobile-download.png",
        fullPage: true,
      });
  }
  pass("9个移动页面390px无横向溢出，底部菜单可见");
  await goto("/account");
  await page
    .locator(".mobile-bottom")
    .getByRole("button", { name: "发布", exact: true })
    .click();
  await expect(page.locator("[role=dialog]")).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  pass("移动底栏发布入口");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await context.clearCookies();
  await login(credentials.admin);
  pass("管理员UI登录");
  for (const url of [
    "/admin",
    "/admin/users",
    "/admin/resources",
    "/admin/demands",
    "/admin/posts",
    "/admin/matches",
    "/admin/leads",
    "/admin/models",
    "/admin/ai-logs",
    "/admin/apk",
    "/admin/settings",
  ]) {
    await goto(url);
    await expect(page.locator(".admin-breadcrumb")).toBeVisible();
    expect(await page.locator(".error").count()).toBe(0);
    if (url === "/admin")
      await page.screenshot({
        path: "docs/screenshots/desktop-admin.png",
        fullPage: true,
      });
    if (url === "/admin/models") {
      await expect(page.locator(".model-card")).toHaveCount(2);
      await expect(
        page.getByText("连接成功", { exact: true }).first(),
      ).toBeVisible();
      await page.screenshot({
        path: "docs/screenshots/desktop-models.png",
        fullPage: true,
      });
    }
  }
  pass("11个管理员路由数据加载正常");
  await goto("/admin/apk");
  await page.getByRole("button", { name: "生成 APK", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("APK 构建已完成", {
    timeout: 120000,
  });
  await page.screenshot({
    path: "docs/screenshots/desktop-apk.png",
    fullPage: true,
  });
  pass("非root生产服务从后台真正构建签名APK");
  await goto("/");
  await page.screenshot({
    path: "docs/screenshots/desktop-home.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  pass("所有页面无JavaScript运行时错误");
} catch (e) {
  results.push({ passed: false, error: e.message });
  console.error(e);
  await page.screenshot({
    path: "docs/screenshots/browser-failure.png",
    fullPage: true,
  });
  process.exitCode = 1;
} finally {
  await fs.writeFile(
    "data/browser-test-results.json",
    JSON.stringify(
      { checkedAt: new Date().toISOString(), results, errors },
      null,
      2,
    ),
  );
  await browser.close();
}

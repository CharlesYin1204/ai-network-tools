import { chromium, expect as baseExpect } from "@playwright/test";
import fs from "node:fs/promises";
import { query, db } from "../lib/db.mjs";
const expect = baseExpect.configure({ timeout: 15000 });
const origin = "http://127.0.0.1:3050";
const access = JSON.parse(await fs.readFile("data/access.json", "utf8"));
const results = [],
  errors = [];
const fixture = "浏览器验收-" + Date.now();
let resourceId, postId;
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
const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  }),
  page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const go = async (p) => page.goto(origin + p, { waitUntil: "networkidle" });
const sign = async (credential) => {
  await context.clearCookies();
  const response = await context.request.post(origin + "/api/auth/login", {
    data: credential,
  });
  expect(response.ok()).toBeTruthy();
};
try {
  await sign(access.demo);
  await go("/account");
  await page.getByRole("button", { name: "发布资源", exact: true }).click();
  let form = page.getByRole("dialog");
  await form.locator("[name=title]").fill(fixture + "共享空间");
  await form.locator("[name=location]").fill("深圳");
  await form
    .locator("textarea")
    .fill("仅用于浏览器自动验收的空间介绍，完成测试后将清理。");
  await form.locator("[name=category]").selectOption("空间场地");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/resources") && r.request().method() === "POST",
  );
  await form.getByRole("button", { name: "确认发布" }).click();
  const created = await response;
  expect(created.ok()).toBeTruthy();
  resourceId = (await created.json()).item.id;
  await expect(page.getByRole("status")).toContainText("发布成功");
  pass("用户表单发布资源并持久化");
  await go("/account/resources");
  let card = page.locator(".resource-grid>div").filter({ hasText: fixture });
  await expect(card).toContainText("待处理");
  await card.getByRole("button", { name: "编辑", exact: true }).click();
  form = page.getByRole("dialog");
  await form
    .locator("[name=description]")
    .fill("浏览器验证修改后的资源详情，保留原有字段并重新等待审核。");
  await form.getByRole("button", { name: "保存资源" }).click();
  await expect(page.getByRole("status")).toContainText("资源已保存");
  pass("用户编辑资源表单");
  await go("/feed");
  await page.getByRole("button", { name: "发布动态", exact: true }).click();
  form = page.getByRole("dialog");
  await form.locator("[name=title]").fill(fixture + "行业见解");
  await form
    .locator("[name=content]")
    .fill("这是一条验证真实机域互动的测试动态，完成后自动清理。");
  await form.locator("[name=type]").selectOption("insight");
  const pr = page.waitForResponse(
    (r) => r.url().endsWith("/api/posts") && r.request().method() === "POST",
  );
  await form.getByRole("button", { name: "发布动态", exact: true }).click();
  const postResponse = await pr;
  expect(postResponse.ok()).toBeTruthy();
  const pd = await postResponse.json();
  postId = pd.item?.id || pd.id;
  await expect(page.getByRole("status")).toContainText("动态已发布");
  let post = page.locator(".post-card").filter({ hasText: fixture });
  await expect(post).toBeVisible();
  pass("机域发布动态表单");
  await post.getByRole("button", { name: /条回应/ }).click();
  form = page.getByRole("dialog");
  await form
    .locator(".comment-form input")
    .fill("这是一次浏览器真实回应验证。");
  await form.getByRole("button", { name: "回应", exact: true }).click();
  await expect(form.locator(".post-comments")).toContainText(
    "这是一次浏览器真实回应验证。",
  );
  pass("机域评论提交及回读");
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await go("/account/profile");
  await page.getByRole("button", { name: "用 AI 优化我的名片" }).click();
  await expect(page.getByRole("dialog", { name: "确认名片草稿" })).toBeVisible({
    timeout: 100000,
  });
  form = page.getByRole("dialog");
  const draft = await form.locator("textarea").inputValue();
  expect(draft.length).toBeGreaterThan(15);
  await form.getByRole("button", { name: "采用这份草稿" }).click();
  await expect(page.locator("[name=bio]")).toHaveValue(draft);
  pass("真实AI名片草稿与明确采纳，不自动保存");
  await sign(access.admin);
  await go("/admin/resources");
  await page.getByPlaceholder("搜索当前列表").fill(fixture);
  let row = page.locator("tbody tr");
  await expect(row).toHaveCount(1);
  await row.getByRole("button", { name: "通过", exact: true }).click();
  await expect(row).toContainText("已通过");
  pass("后台资源审核通过");
  await row.getByRole("button", { name: "拒绝", exact: true }).click();
  form = page.getByRole("dialog");
  await form
    .locator("[name=reason]")
    .fill("请补充资源开放时间，浏览器验收意见。");
  await form.getByRole("button", { name: "确认拒绝并反馈" }).click();
  await expect(row).toContainText("已拒绝");
  pass("后台拒绝原因提交");
  await sign(access.demo);
  await go("/account/resources");
  card = page.locator(".resource-grid>div").filter({ hasText: fixture });
  await expect(card).toContainText("请补充资源开放时间");
  await card.getByRole("button", { name: "下架", exact: true }).click();
  await expect(card).toContainText("已下架");
  await card.getByRole("button", { name: "重新上架", exact: true }).click();
  await expect(card).toContainText("待处理");
  pass("审核反馈可见与下架重新送审闭环");
  expect(errors).toEqual([]);
  pass("新增功能无浏览器运行错误");
} catch (e) {
  results.push({ passed: false, error: e.message });
  console.error(e);
  await page.screenshot({
    path: "docs/screenshots/workflow-failure.png",
    fullPage: true,
  });
  process.exitCode = 1;
} finally {
  if (!postId) {
    const p = await query("SELECT id FROM posts WHERE title=?", [
      fixture + "行业见解",
    ]);
    postId = p[0]?.id;
  }
  if (postId) {
    await query("DELETE FROM post_comments WHERE post_id=?", [postId]);
    await query("DELETE FROM post_likes WHERE post_id=?", [postId]);
    await query("DELETE FROM posts WHERE id=?", [postId]);
  }
  if (resourceId) {
    await query("DELETE FROM favorites WHERE resource_id=?", [resourceId]);
    await query("DELETE FROM matches WHERE resource_id=?", [resourceId]);
    await query("DELETE FROM resources WHERE id=?", [resourceId]);
  }
  await query("DELETE FROM notifications WHERE content LIKE ?", [
    "%" + fixture + "%",
  ]);
  await fs.writeFile(
    "data/browser-workflow-results.json",
    JSON.stringify(
      { checkedAt: new Date().toISOString(), results, errors },
      null,
      2,
    ),
  );
  await browser.close();
  await db().end();
}

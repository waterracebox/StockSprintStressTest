// tests/stress/sanity/actions.spec.ts
import { test, expect } from "@playwright/test";
import { GameActions } from "../core/GameActions";
import * as fs from "fs";
import * as path from "path";

/**
 * Action 01: 註冊功能驗證測試
 */
test("Action 01: Register", async ({ page }) => {
  // 1. 導航至登入頁面（使用 playwright.config.ts 的 baseURL）
  await page.goto("/");

  // 2. 實例化 GameActions
  const actions = new GameActions(page, 1);

  // 3. 生成隨機測試使用者（帳號僅限英文和數字，不可有底線）
  const timestamp = Date.now();
  const nick = `測試員工${timestamp}`;
  const user = `testuser${timestamp}`; // 移除底線以符合前端驗證規則
  const pass = "Test1234";

  // 4. 執行註冊
  const result = await actions.register(nick, user, pass);

  // 5. 驗證結果
  expect(result).toBe(true);

  // 6. 驗證 users.json 中是否包含新使用者
  const usersFilePath = path.join(__dirname, "../data/users.json");
  expect(fs.existsSync(usersFilePath)).toBe(true);

  const content = fs.readFileSync(usersFilePath, "utf-8");
  const users = JSON.parse(content);

  const foundUser = users.find((u: any) => u.username === user);
  expect(foundUser).toBeDefined();
  expect(foundUser?.password).toBe(pass);
  expect(foundUser?.registered).toBe(true);

  console.log("✅ 驗證通過：使用者已成功註冊並寫入 users.json");
});

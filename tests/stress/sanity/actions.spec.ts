// tests/stress/sanity/actions.spec.ts
import { test, expect } from "@playwright/test";
import { GameActions } from "../core/GameActions";
import * as fs from "fs";
import * as path from "path";

/**
 * Action 00: 等待遊戲開始測試
 * 
 * 測試流程：
 * 1. 讀取已註冊使用者
 * 2. 執行登入
 * 3. 呼叫 waitForGameStart（會阻塞直到遊戲開始）
 * 4. 驗證成功偵測
 */
test("Action 00: Wait For Game Start", async ({ page }) => {
  console.log("\n🔵 ========== Action 00: 等待遊戲開始 測試開始 ==========\n");

  // 1. 讀取已註冊使用者
  const dataDir = path.join(__dirname, "../data");
  const usersFilePath = path.join(dataDir, "users.json");

  if (!fs.existsSync(usersFilePath)) {
    throw new Error("❌ users.json 不存在！請先執行 Action 01 註冊測試。");
  }

  const users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
  if (users.length === 0) {
    throw new Error("❌ users.json 為空！請先執行 Action 01 註冊測試建立使用者資料。");
  }

  // 2. 取得第一個使用者
  const testUser = users[0];
  console.log(`📋 使用測試帳號: ${testUser.username}`);

  // 3. 實例化 GameActions
  const actions = new GameActions(page, 0);

  // 4. 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功，準備等待遊戲開始...\n");

  // 5. 執行 Action 00（會阻塞直到遊戲開始）
  console.log("⏳ 正在等待遊戲開始...");
  console.log("⚠️  請至 Admin 後台（https://stock-sprint-frontend.vercel.app/admin）手動按下「開始遊戲」按鈕\n");

  const result = await actions.waitForGameStart();

  // 6. 驗證結果
  expect(result).toBe(true);
  console.log("\n✅ 驗證通過：成功偵測到遊戲已開始！");
  console.log("\n🔵 ========== Action 00: 等待遊戲開始 測試完成 ==========\n");
});

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

/**
 * Action 02: 登入功能驗證測試
 */
test("Action 02: Login", async ({ page }) => {
  // 1. 讀取 users.json
  const usersFilePath = path.join(__dirname, "../data/users.json");

  // 檢查檔案是否存在
  if (!fs.existsSync(usersFilePath)) {
    throw new Error(
      "❌ users.json 不存在！請先執行 Action 01 註冊測試建立使用者資料。"
    );
  }

  // 解析 JSON
  const content = fs.readFileSync(usersFilePath, "utf-8");
  const users = JSON.parse(content);

  // 檢查是否有已註冊的使用者
  if (users.length === 0) {
    throw new Error(
      "❌ users.json 為空！請先執行 Action 01 註冊測試建立使用者資料。"
    );
  }

  // 2. 取得第一個使用者
  const testUser = users[0];
  console.log(`📋 使用測試帳號: ${testUser.username}`);

  // 3. 實例化 GameActions
  const actions = new GameActions(page, 2);

  // 4. 執行登入
  const result = await actions.login(testUser.username, testUser.password);

  // 5. 驗證結果
  expect(result).toBe(true);

  // 6. 額外驗證：確認 URL 在 /home
  expect(page.url()).toContain("/home");

  console.log("✅ 驗證通過：使用者已成功登入並跳轉至主頁");
});

/**
 * Action 03: 換頭像功能驗證測試
 */
test("Action 03: Change Avatar", async ({ page }) => {
  console.log("\n🔵 ========== Action 03: 換頭像 測試開始 ==========\n");

  // 1. 讀取已註冊使用者
  const usersFilePath = path.join(__dirname, "../data/users.json");
  if (!fs.existsSync(usersFilePath)) {
    throw new Error("❌ users.json 不存在！請先執行 Action 01 註冊測試。");
  }

  const users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
  if (users.length === 0) {
    throw new Error("❌ users.json 為空！請先執行 Action 01 註冊測試建立使用者資料。");
  }

  // 2. 取得第一個使用者
  const testUser = users[0];
  console.log(`📋 使用測試帳號: ${testUser.username}`);

  // 3. 實例化 GameActions
  const actions = new GameActions(page, 3);

  // 4. 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功，準備換頭像...\n");

  // 5. 執行換頭像（選擇第 5 號頭像）
  const targetIndex = 5;
  const targetAvatar = `avatar_0${targetIndex}.webp`;
  console.log(`🎯 目標頭像: ${targetAvatar}`);

  const result = await actions.changeAvatar(targetIndex);
  expect(result).toBe(true);

  // 6. 驗證頭像已更新（重新導航到主頁）
  console.log("🔄 重新導航到主頁以驗證變更...");
  await page.goto("/home");
  await page.waitForTimeout(2000); // 等待頁面完全載入

  // 7. 檢查右上角頭像的 src 屬性
  const currentAvatarImg = page.locator('.adm-avatar img').first();
  await currentAvatarImg.waitFor({ state: "visible", timeout: 5000 });

  const currentSrc = await currentAvatarImg.getAttribute("src");
  console.log(`📸 當前頭像 src: ${currentSrc}`);

  // 8. 斷言驗證
  expect(currentSrc).toContain(targetAvatar);

  console.log("✅ 驗證通過：頭像已成功更新！");
  console.log("\n🔵 ========== Action 03: 換頭像 測試完成 ==========\n");
});

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

/**
 * Action 04: 讀取資產功能驗證測試
 */
test("Action 04: Read Assets", async ({ page }) => {
  console.log("\n🔵 ========== Action 04: 讀取資產 測試開始 ==========\n");

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
  const actions = new GameActions(page, 4);

  // 4. 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功，準備讀取資產...\n");

  // 5. 執行 Action 04：讀取資產
  const assets = await actions.readAssets();

  // 6. 驗證結果
  expect(assets).not.toBeNull();
  expect(assets!.cash).not.toBeNaN();
  expect(assets!.totalAssets).not.toBeNaN();
  expect(assets!.stockCount).not.toBeNaN();
  expect(assets!.stockValue).not.toBeNaN();
  expect(assets!.debt).not.toBeNaN();

  // 7. 驗證計算邏輯（總資產 = 現金 + 股票現值 - 負債）
  const expectedTotal = assets!.cash + assets!.stockValue - assets!.debt;
  const diff = Math.abs(assets!.totalAssets - expectedTotal);
  
  console.log(`\n📊 資產明細：`);
  console.log(`   總資產: $${assets!.totalAssets.toFixed(2)}`);
  console.log(`   現金: $${assets!.cash.toFixed(2)}`);
  console.log(`   股票: ${assets!.stockCount} 股`);
  console.log(`   股票現值: $${assets!.stockValue.toFixed(2)}`);
  console.log(`   負債: $${assets!.debt.toFixed(2)}`);
  console.log(`   計算總資產: $${expectedTotal.toFixed(2)}`);
  console.log(`   誤差: $${diff.toFixed(2)}`);

  // 允許 0.01 的浮點數誤差（考慮保證金等動態因素）
  expect(diff).toBeLessThan(0.01);

  console.log("\n✅ 驗證通過：資產讀取成功且計算正確！");
  console.log("\n🔵 ========== Action 04: 讀取資產 測試完成 ==========\n");
});

/**
 * Action 05: 讀取合約功能驗證測試
 */
test("Action 05: Read Contracts", async ({ page }) => {
  console.log("\n🔵 ========== Action 05: 讀取合約 測試開始 ==========\n");

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
  const actions = new GameActions(page, 5);

  // 4. 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功，準備讀取合約...\n");

  // 5. 暫停測試，等待手動下單合約
  console.log("⏸️  測試已暫停！");
  console.log("📝 請在 Inspector 視窗中執行以下操作：");
  console.log("   1. 切換至「合約」Tab");
  console.log("   2. 選擇做多或做空");
  console.log("   3. 設定槓桿（如 2 倍）");
  console.log("   4. 買入 1 張合約");
  console.log("   5. 確認成功後，點擊 Inspector 的 Resume 按鈕");
  console.log("");
  await page.pause();

  // 6. 執行 Action 05：讀取合約
  const contracts = await actions.readContracts();

  // 7. 驗證結果
  expect(contracts).not.toBeNull();
  expect(contracts!.margin).toBeGreaterThan(0);
  expect(contracts!.contracts.length).toBeGreaterThan(0);

  const firstContract = contracts!.contracts[0];
  expect(['LONG', 'SHORT']).toContain(firstContract.type);
  expect(firstContract.leverage).toBeGreaterThan(0);
  expect(firstContract.amount).toBeGreaterThan(0);

  console.log(`\n📊 合約明細：`);
  console.log(`   保證金總額: $${contracts!.margin.toFixed(2)}`);
  console.log(`   合約數量: ${contracts!.contracts.length}`);
  contracts!.contracts.forEach((c, idx) => {
    console.log(`   [${idx + 1}] ${c.type === 'LONG' ? '做多' : '做空'} ${c.leverage}倍 ${c.amount}張`);
  });

  console.log("\n✅ 驗證通過：合約讀取成功且資料正確！");
  console.log("\n🔵 ========== Action 05: 讀取合約 測試完成 ==========\n");
});

/**
 * Action 06: 買入股票功能驗證測試
 */
test("Action 06: Buy Stock", async ({ page }) => {
  console.log("\n🔵 ========== Action 06: 買入股票 測試開始 ==========\n");

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
  const actions = new GameActions(page, 6);

  // 4. 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功，準備買入股票...\n");

  // 5. 讀取交易前的資產狀態
  const beforeAssets = await actions.readAssets();
  expect(beforeAssets).not.toBeNull();
  console.log(`📊 交易前資產：`);
  console.log(`   現金: $${beforeAssets!.cash.toFixed(2)}`);
  console.log(`   股票: ${beforeAssets!.stockCount} 張`);

  // 6. 執行 Action 06：買入 1 張股票
  const buyAmount = 1;
  console.log(`\n💰 準備買入 ${buyAmount} 張股票...`);
  
  const buySuccess = await actions.buyStock(buyAmount);
  expect(buySuccess).toBe(true);
  console.log("✅ 買入請求已送出\n");

  // 7. 等待伺服器更新資料（WebSocket 推送可能有延遲）
  console.log("⏳ 等待伺服器處理交易並更新資產...");
  await page.waitForTimeout(3000); // 增加等待時間確保 WebSocket 推送完成

  // 8. 讀取交易後的資產狀態
  const afterAssets = await actions.readAssets();
  expect(afterAssets).not.toBeNull();
  console.log(`\n📊 交易後資產：`);
  console.log(`   現金: $${afterAssets!.cash.toFixed(2)}`);
  console.log(`   股票: ${afterAssets!.stockCount} 張`);

  // 9. 驗證股票數量變化
  const stockDiff = afterAssets!.stockCount - beforeAssets!.stockCount;
  console.log(`\n📈 股票變化: ${stockDiff > 0 ? '+' : ''}${stockDiff} 張`);
  
  if (stockDiff !== buyAmount) {
    console.error(`❌ 股票數量不符！預期 +${buyAmount} 張，實際 ${stockDiff > 0 ? '+' : ''}${stockDiff} 張`);
    console.error(`   可能原因：1) 伺服器處理延遲 2) 交易失敗但未顯示錯誤 3) WebSocket 推送遺失`);
  }
  expect(stockDiff).toBe(buyAmount);

  // 10. 驗證現金減少（買入應該扣款）
  const cashDiff = afterAssets!.cash - beforeAssets!.cash;
  console.log(`💸 現金變化: ${cashDiff > 0 ? '+' : ''}${cashDiff.toFixed(2)}`);
  
  if (cashDiff >= 0) {
    console.error(`❌ 現金未減少！買入股票應該扣款，但現金反而增加或不變`);
  }
  expect(cashDiff).toBeLessThan(0); // 現金應該減少

  console.log("\n✅ 驗證通過：股票買入成功且資產變化正確！");
  console.log("\n🔵 ========== Action 06: 買入股票 測試完成 ==========\n");
});

/**
 * Action 07: 賣出股票功能驗證測試
 */
test("Action 07: Sell Stock", async ({ page }) => {
  console.log("\n🔵 ========== Action 07: 賣出股票 測試開始 ==========\n");

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
  const actions = new GameActions(page, 7);

  // 4. 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功，準備賣出股票...\n");

  // 5. 讀取交易前的資產狀態
  const beforeAssets = await actions.readAssets();
  expect(beforeAssets).not.toBeNull();
  console.log(`📊 交易前資產：`);
  console.log(`   現金: $${beforeAssets!.cash.toFixed(2)}`);
  console.log(`   股票: ${beforeAssets!.stockCount} 張`);

  // 6. 驗證持股數量（必須至少有 1 張才能賣出）
  if (beforeAssets!.stockCount < 1) {
    console.error(`❌ 測試前置條件不符：帳戶持股為 ${beforeAssets!.stockCount} 張，無法執行賣出測試`);
    console.error(`   建議：先執行 Action 06 買入股票，或使用 Admin 後台手動增加持股`);
    throw new Error("持股不足，無法執行賣出測試");
  }

  // 7. 執行 Action 07：賣出 1 張股票
  const sellAmount = 1;
  console.log(`\n💰 準備賣出 ${sellAmount} 張股票...`);
  
  const sellSuccess = await actions.sellStock(sellAmount);
  expect(sellSuccess).toBe(true);
  console.log("✅ 賣出請求已送出\n");

  // 8. 等待伺服器更新資料（WebSocket 推送可能有延遲）
  console.log("⏳ 等待伺服器處理交易並更新資產...");
  await page.waitForTimeout(3000);

  // 9. 讀取交易後的資產狀態
  const afterAssets = await actions.readAssets();
  expect(afterAssets).not.toBeNull();
  console.log(`\n📊 交易後資產：`);
  console.log(`   現金: $${afterAssets!.cash.toFixed(2)}`);
  console.log(`   股票: ${afterAssets!.stockCount} 張`);

  // 10. 驗證股票數量變化
  const stockDiff = afterAssets!.stockCount - beforeAssets!.stockCount;
  console.log(`\n📉 股票變化: ${stockDiff > 0 ? '+' : ''}${stockDiff} 張`);
  
  if (stockDiff !== -sellAmount) {
    console.error(`❌ 股票數量不符！預期 -${sellAmount} 張，實際 ${stockDiff > 0 ? '+' : ''}${stockDiff} 張`);
    console.error(`   可能原因：1) 伺服器處理延遲 2) 交易失敗但未顯示錯誤 3) WebSocket 推送遺失`);
  }
  expect(stockDiff).toBe(-sellAmount);

  // 11. 驗證現金增加（賣出應該收款）
  const cashDiff = afterAssets!.cash - beforeAssets!.cash;
  console.log(`💰 現金變化: ${cashDiff > 0 ? '+' : ''}${cashDiff.toFixed(2)}`);
  
  if (cashDiff <= 0) {
    console.error(`❌ 現金未增加！賣出股票應該收款，但現金反而減少或不變`);
  }
  expect(cashDiff).toBeGreaterThan(0); // 現金應該增加

  console.log("\n✅ 驗證通過：股票賣出成功且資產變化正確！");
  console.log("\n🔵 ========== Action 07: 賣出股票 測試完成 ==========\n");
});


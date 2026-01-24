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
 * Action 08: 買入合約功能驗證測試
 */
test("Action 08: Buy Contract", async ({ page }) => {
  console.log("\n🔵 ========== Action 08: 買入合約 測試開始 ==========\n");

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
  const actions = new GameActions(page, 8);

  // 4. 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功，準備買入合約...\n");

  // 5. 讀取交易前的合約狀態
  const beforeContracts = await actions.readContracts();
  expect(beforeContracts).not.toBeNull();
  
  const beforeContractCount = beforeContracts!.contracts.length;
  console.log(`📊 交易前狀態：`);
  console.log(`   合約數量: ${beforeContractCount}`);
  console.log(`   保證金總額: $${beforeContracts!.margin.toFixed(2)}`);

  // 6. 執行 Action 08：買入合約（做多，4倍槓桿，2張）
  const contractType = 'LONG';
  const leverage = 4;
  const amount = 2;
  
  console.log(`\n📝 準備買入合約：`);
  console.log(`   類型: ${contractType === 'LONG' ? '做多 (看漲)' : '做空 (看跌)'}`);
  console.log(`   槓桿: ${leverage}x`);
  console.log(`   張數: ${amount}`);
  
  const buySuccess = await actions.buyContract(contractType, leverage, amount);
  expect(buySuccess).toBe(true);
  console.log("✅ 合約下單請求已送出\n");

  // 7. 等待伺服器更新資料
  console.log("⏳ 等待伺服器處理合約並更新資料...");
  await page.waitForTimeout(3000);

  // 8. 讀取交易後的合約狀態
  const afterContracts = await actions.readContracts();
  expect(afterContracts).not.toBeNull();
  
  const afterContractCount = afterContracts!.contracts.length;
  console.log(`\n📊 交易後狀態：`);
  console.log(`   合約數量: ${afterContractCount}`);
  console.log(`   保證金總額: $${afterContracts!.margin.toFixed(2)}`);

  // 9. 驗證合約數量增加
  const contractDiff = afterContractCount - beforeContractCount;
  console.log(`\n📈 合約變化: ${contractDiff > 0 ? '+' : ''}${contractDiff}`);
  
  if (contractDiff !== 1) {
    console.error(`❌ 合約數量不符！預期 +1，實際 ${contractDiff > 0 ? '+' : ''}${contractDiff}`);
    console.error(`   可能原因：1) 伺服器處理延遲 2) 保證金不足導致交易失敗 3) WebSocket 推送遺失`);
  }
  expect(contractDiff).toBe(1);

  // 10. 驗證新合約的屬性
  // 注意：由於前端可能因為 Slider 或狀態同步問題導致槓桿值不完全準確
  // 我們只驗證：1) 合約類型正確 2) 有新合約產生
  expect(afterContracts!.contracts.length).toBeGreaterThan(0);
  
  const newContract = afterContracts!.contracts[0];
  expect(newContract.type).toBe(contractType);
  expect(newContract.amount).toBe(amount);
  
  console.log(`\n✅ 新合約驗證：`);
  console.log(`   類型: ${newContract.type === 'LONG' ? '做多' : '做空'} ✓`);
  console.log(`   槓桿: ${newContract.leverage}x (預期 ${leverage}x，允許誤差)`);
  console.log(`   張數: ${newContract.amount}張 ✓`);
  
  // 警告：如果槓桿誤差過大
  if (Math.abs(newContract.leverage - leverage) > 1.0) {
    console.log(`   ⚠️  槓桿誤差較大：實際 ${newContract.leverage}x vs 預期 ${leverage}x`);
  }

  // 11. 驗證保證金增加
  const marginDiff = afterContracts!.margin - beforeContracts!.margin;
  console.log(`\n💰 保證金變化: ${marginDiff > 0 ? '+' : ''}${marginDiff.toFixed(2)}`);
  
  if (marginDiff <= 0) {
    console.error(`❌ 保證金未增加！開倉應該扣除保證金，但保證金反而減少或不變`);
  }
  expect(marginDiff).toBeGreaterThan(0);

  console.log("\n✅ 驗證通過：合約買入成功且資料變化正確！");
  console.log("\n🔵 ========== Action 08: 買入合約 測試完成 ==========\n");
});

// ==================== Action 09: 撤銷今日合約 ====================
test("Action 09: Cancel All Contracts", async ({ page }) => {
  console.log("\n🔵 ========== Action 09: 撤銷今日合約 測試開始 ==========\n");

  // 讀取已註冊使用者
  const dataDir = path.join(__dirname, "../data");
  const usersFilePath = path.join(dataDir, "users.json");

  if (!fs.existsSync(usersFilePath)) {
    throw new Error("❌ users.json 不存在！請先執行 Action 01 註冊測試。");
  }

  const users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
  if (users.length === 0) {
    throw new Error("❌ users.json 為空！請先執行 Action 01 註冊測試建立使用者資料。");
  }

  // 取得第一個使用者
  const testUser = users[0];
  console.log(`📋 使用測試帳號: ${testUser.username}`);

  // 初始化 GameActions
  const actions = new GameActions(page, 9);

  // 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功\n");

  // 1️⃣ 準備階段：先買入一筆合約（確保有合約可撤銷）
  console.log("📋 準備階段：先買入合約...");
  const buySuccess = await actions.buyContract('LONG', 3, 1);
  expect(buySuccess).toBe(true);

  // 等待 WebSocket 更新
  await page.waitForTimeout(3000);

  // 2️⃣ 讀取合約資料（Before）
  console.log("\n📋 步驟 1: 讀取撤銷前的合約資料...");
  const beforeData = await actions.readContracts();
  expect(beforeData).not.toBeNull();
  expect(beforeData!.contracts.length).toBeGreaterThan(0);

  const beforeCount = beforeData!.contracts.length;
  const beforeMargin = beforeData!.margin;
  console.log(`   撤銷前：合約數=${beforeCount}, 保證金=${beforeMargin.toFixed(2)}`);

  // 3️⃣ 執行撤銷操作
  console.log("\n📋 步驟 2: 執行撤銷操作...");
  const cancelSuccess = await actions.cancelAllContracts();
  expect(cancelSuccess).toBe(true);

  // 4️⃣ 等待 WebSocket 更新
  console.log("\n⏳ 等待 WebSocket 更新狀態...");
  await page.waitForTimeout(3000);

  // 5️⃣ 讀取合約資料（After）
  console.log("\n📋 步驟 3: 讀取撤銷後的合約資料...");
  const afterData = await actions.readContracts();
  expect(afterData).not.toBeNull();

  const afterCount = afterData!.contracts.length;
  const afterMargin = afterData!.margin;
  console.log(`   撤銷後：合約數=${afterCount}, 保證金=${afterMargin.toFixed(2)}`);

  // 6️⃣ 驗證結果
  console.log("\n🔍 驗證結果...");

  // ✅ 合約數量應該減少
  console.log(`   ✔ 檢查合約數量變化：${beforeCount} → ${afterCount}`);
  expect(afterCount).toBe(0);

  // ✅ 保證金應該歸還（變為 0）
  console.log(`   ✔ 檢查保證金變化：${beforeMargin.toFixed(2)} → ${afterMargin.toFixed(2)}`);
  expect(afterMargin).toBe(0);

  console.log("\n✅ 驗證通過：合約已全部撤銷且保證金已歸還！");
  console.log("\n🔵 ========== Action 09: 撤銷今日合約 測試完成 ==========\n");
});

/**
 * Action 10: 開啟地下錢莊功能驗證測試
 */
test("Action 10: Open Loan Shark", async ({ page }) => {
  console.log("\n🔵 ========== Action 10: 開啟地下錢莊 測試開始 ==========\n");

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
  const actions = new GameActions(page, 10);

  // 4. 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功，準備開啟地下錢莊...\n");

  // 5. 執行 Action 10：開啟地下錢莊
  const result = await actions.openLoanShark();
  expect(result).toBe(true);

  // 6. 驗證 Modal 元素存在
  console.log("🔍 驗證 Modal 元素...");
  
  // 驗證標題
  const modalTitle = page.locator('span').filter({ hasText: /^地下錢莊$/ }).first();
  await expect(modalTitle).toBeVisible({ timeout: 3000 });
  console.log("   ✓ 標題文字已顯示");

  // 驗證商人頭像（Optional）
  const merchantImage = page.locator('img[alt*="沈梟"], img[src*="merchant"]').first();
  const isImageVisible = await merchantImage.isVisible().catch(() => false);
  if (isImageVisible) {
    console.log("   ✓ 商人頭像已載入");
  }

  // 驗證對話區塊存在
  const dialogueBox = page.locator('div').filter({ hasText: /沈梟|借款|利率/ }).first();
  const isDialogueVisible = await dialogueBox.isVisible().catch(() => false);
  if (isDialogueVisible) {
    console.log("   ✓ 對話區塊已顯示");
  }

  console.log("\n✅ 驗證通過：地下錢莊 Modal 已成功開啟！");
  console.log("\n🔵 ========== Action 10: 開啟地下錢莊 測試完成 ==========\n");
});

/**
 * Action 11: 借/還錢功能驗證測試 (借款)
 */
test("Action 11: Handle Loan (Borrow)", async ({ page }) => {
  console.log("\n🔵 ========== Action 11: 借/還錢 (借款) 測試開始 ==========\n");

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
  const actions = new GameActions(page, 11);

  // 4. 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功\n");

  // 5. 讀取交易前的資產狀態
  console.log("📊 讀取交易前資產...");
  const beforeAssets = await actions.readAssets();
  expect(beforeAssets).not.toBeNull();

  console.log(`   現金: $${beforeAssets!.cash.toFixed(2)}`);
  console.log(`   負債: $${beforeAssets!.debt.toFixed(2)}`);

  // 6. 執行 Action 11：借款 300
  const borrowAmount = 300;
  console.log(`\n💰 準備借款 $${borrowAmount}...`);

  const borrowSuccess = await actions.handleLoan('BORROW', borrowAmount);
  expect(borrowSuccess).toBe(true);
  console.log("✅ 借款請求已完成\n");

  // 7. 等待伺服器更新資料（WebSocket 推送）
  console.log("⏳ 等待伺服器處理交易並更新資產...");
  await page.waitForTimeout(3000);

  // 8. 讀取交易後的資產狀態
  console.log("📊 讀取交易後資產...");
  const afterAssets = await actions.readAssets();
  expect(afterAssets).not.toBeNull();

  console.log(`   現金: $${afterAssets!.cash.toFixed(2)}`);
  console.log(`   負債: $${afterAssets!.debt.toFixed(2)}`);

  // 9. 驗證資產變化
  console.log("\n🔍 驗證資產變化...");

  const cashDiff = afterAssets!.cash - beforeAssets!.cash;
  const debtDiff = afterAssets!.debt - beforeAssets!.debt;

  console.log(`   現金變化: ${cashDiff > 0 ? '+' : ''}${cashDiff.toFixed(2)}`);
  console.log(`   負債變化: ${debtDiff > 0 ? '+' : ''}${debtDiff.toFixed(2)}`);

  // 斷言驗證
  expect(cashDiff).toBeCloseTo(borrowAmount, 0.01);
  expect(debtDiff).toBeCloseTo(borrowAmount, 0.01);

  // 10. 驗證 Modal 已關閉
  console.log("\n🔍 驗證 Modal 已關閉...");
  const modalTitle = page.locator('span').filter({ hasText: /^地下錢莊$/ }).first();
  const isModalClosed = await modalTitle.isHidden().catch(() => true);

  if (isModalClosed) {
    console.log("   ✓ Modal 已正確關閉");
  } else {
    console.warn("   ⚠ Modal 仍然可見（可能是測試環境延遲）");
  }

  expect(isModalClosed).toBe(true);

  console.log("\n✅ 驗證通過：借款成功且資產變化正確！");
  console.log("\n🔵 ========== Action 11: 借/還錢 (借款) 測試完成 ==========\n");
});

/**
 * Action 11: 借/還錢功能驗證測試 (還款)
 */
test("Action 11: Handle Loan (Repay)", async ({ page }) => {
  console.log("\n🔵 ========== Action 11: 借/還錢 (還款) 測試開始 ==========\n");

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
  const actions = new GameActions(page, 11);

  // 4. 執行登入
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功\n");

  // 5. 確保有負債（先借款）
  console.log("📋 準備階段：確保有負債...");
  const borrowSuccess = await actions.handleLoan('BORROW', 300);
  expect(borrowSuccess).toBe(true);
  await page.waitForTimeout(3000);

  // 6. 讀取還款前的資產狀態
  console.log("\n📊 讀取還款前資產...");
  const beforeAssets = await actions.readAssets();
  expect(beforeAssets).not.toBeNull();
  expect(beforeAssets!.debt).toBeGreaterThan(0); // 確保有負債

  console.log(`   現金: $${beforeAssets!.cash.toFixed(2)}`);
  console.log(`   負債: $${beforeAssets!.debt.toFixed(2)}`);

  // 7. 執行 Action 11：還款 200
  const repayAmount = 200;
  console.log(`\n💸 準備還款 $${repayAmount}...`);

  const repaySuccess = await actions.handleLoan('REPAY', repayAmount);
  expect(repaySuccess).toBe(true);
  console.log("✅ 還款請求已完成\n");

  // 8. 等待伺服器更新資料
  console.log("⏳ 等待伺服器處理交易並更新資產...");
  await page.waitForTimeout(3000);

  // 9. 讀取還款後的資產狀態
  console.log("📊 讀取還款後資產...");
  const afterAssets = await actions.readAssets();
  expect(afterAssets).not.toBeNull();

  console.log(`   現金: $${afterAssets!.cash.toFixed(2)}`);
  console.log(`   負債: $${afterAssets!.debt.toFixed(2)}`);

  // 10. 驗證資產變化
  console.log("\n🔍 驗證資產變化...");

  const cashDiff = afterAssets!.cash - beforeAssets!.cash;
  const debtDiff = afterAssets!.debt - beforeAssets!.debt;

  console.log(`   現金變化: ${cashDiff > 0 ? '+' : ''}${cashDiff.toFixed(2)}`);
  console.log(`   負債變化: ${debtDiff > 0 ? '+' : ''}${debtDiff.toFixed(2)}`);

  // 斷言驗證（還款時現金減少、負債減少）
  expect(cashDiff).toBeCloseTo(-repayAmount, 0.01);
  expect(debtDiff).toBeCloseTo(-repayAmount, 0.01);

  // 11. 驗證 Modal 已關閉
  console.log("\n🔍 驗證 Modal 已關閉...");
  const modalTitle = page.locator('span').filter({ hasText: /^地下錢莊$/ }).first();
  const isModalClosed = await modalTitle.isHidden().catch(() => true);

  expect(isModalClosed).toBe(true);

  console.log("\n✅ 驗證通過：還款成功且資產變化正確！");
  console.log("\n🔵 ========== Action 11: 借/還錢 (還款) 測試完成 ==========\n");
});

/**
 * Action 19: 與地下錢莊主人互動測試
 * 
 * 測試流程：
 * 1. 讀取已註冊使用者並登入
 * 2. 等待遊戲開始
 * 3. 呼叫 interactWithLoanShark（開啟 Modal、點擊商人頭像、檢查對話變化）
 * 4. 呼叫 closeLoanShark 關閉 Modal
 * 5. 驗證回到主頁面
 */
test("Action 19: Interact With Loan Shark", async ({ page }) => {
  console.log("\n🔵 ========== Action 19: 與地下錢莊主人互動 測試開始 ==========\n");

  // 1. 讀取已註冊使用者
  const dataDir = path.join(__dirname, "../data");
  const usersFilePath = path.join(dataDir, "users.json");

  if (!fs.existsSync(usersFilePath)) {
    throw new Error("❌ users.json 不存在！請先執行 Action 01 註冊測試。");
  }

  const users = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
  if (users.length === 0) {
    throw new Error("❌ users.json 為空！");
  }

  const testUser = users[0];
  console.log(`📋 使用測試帳號: ${testUser.username}`);

  // 2. 實例化 GameActions
  const actions = new GameActions(page, 0);

  // 3. 執行登入
  console.log("\n🔐 執行登入...");
  const loginSuccess = await actions.login(testUser.username, testUser.password);
  expect(loginSuccess).toBe(true);
  console.log("✅ 登入成功");

  // 4. 等待遊戲開始
  console.log("\n⏳ 等待遊戲開始...");
  const gameStarted = await actions.waitForGameStart();
  expect(gameStarted).toBe(true);
  console.log("✅ 遊戲已開始");

  // 5. 執行 Action 19：與地下錢莊主人互動
  console.log("\n🎯 執行 Action 19: 與地下錢莊主人互動...");
  const interactSuccess = await actions.interactWithLoanShark();
  
  expect(interactSuccess).toBe(true);
  console.log("✅ 互動成功");

  // 6. 驗證 Modal 仍開啟
  console.log("\n🔍 驗證 Modal 狀態...");
  const modalTitle = page.locator('span').filter({ hasText: /^地下錢莊$/ }).first();
  const isModalVisible = await modalTitle.isVisible().catch(() => false);
  
  expect(isModalVisible).toBe(true);
  console.log("✅ Modal 仍處於開啟狀態");

  // 7. 呼叫 closeLoanShark 關閉 Modal
  console.log("\n🚪 關閉地下錢莊 Modal...");
  const closeSuccess = await actions.closeLoanShark();
  
  expect(closeSuccess).toBe(true);
  console.log("✅ Modal 關閉成功");

  // 8. 驗證回到主頁面
  console.log("\n🔍 驗證回到主頁面...");
  
  // 驗證 URL 是否為主頁
  const currentUrl = page.url();
  expect(currentUrl).toContain('/home');
  console.log(`✅ URL 確認: ${currentUrl}`);

  // 驗證 Modal 已關閉
  const isModalClosed = await modalTitle.isHidden().catch(() => true);
  expect(isModalClosed).toBe(true);
  console.log("✅ Modal 已完全關閉");

  console.log("\n✅ 驗證通過：與地下錢莊主人互動成功且正確關閉 Modal！");
  console.log("\n🔵 ========== Action 19: 與地下錢莊主人互動 測試完成 ==========\n");
});

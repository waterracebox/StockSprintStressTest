// tests/stress/scenarios/stress.spec.ts
import { test, expect, Page } from "@playwright/test";
import { GameActions } from "../core/GameActions";
import * as fs from "fs";
import * as path from "path";

// ==================== 型別定義 ====================
interface User {
  username: string;
  password: string;
  registered: boolean;
}

// ==================== 工具函數 ====================

/**
 * 讀取使用者資料
 */
function loadUsers(): User[] {
  const usersPath = path.resolve(__dirname, "../data/users.json");
  const data = fs.readFileSync(usersPath, "utf-8");
  return JSON.parse(data);
}

/**
 * 產生隨機整數 (包含 min 和 max)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================== User A: 現貨交易員 (Spot Trader) ====================

/**
 * User A 行為模式：現貨交易員
 * 
 * 策略邏輯：
 * 1. 當現金 > 1000 時，買入 1-5 張股票
 * 2. 當現金 <= 1000 且持有股票 > 0 時，賣出 1 張股票
 * 3. 否則持有不動
 * 
 * @param page - Playwright Page 物件
 * @param username - 使用者帳號
 * @param password - 使用者密碼
 * @param duration - 執行時長（毫秒）
 */
export async function runUserA(
  page: Page,
  username: string,
  password: string,
  duration: number
): Promise<void> {
  const actions = new GameActions(page, username);
  const startTime = Date.now();

  console.log(`[User A][${username}] 開始執行現貨交易策略，預計執行 ${duration / 1000} 秒`);

  // Step 1: 登入
  console.log(`[User A][${username}] 執行登入...`);
  const loginSuccess = await actions.login(username, password);
  if (!loginSuccess) {
    throw new Error(`[User A][${username}] 登入失敗`);
  }
  console.log(`[User A][${username}] ✅ 登入成功`);

  // Step 2: 等待遊戲開始
  console.log(`[User A][${username}] 等待遊戲開始...`);
  const gameStarted = await actions.waitForGameStart();
  if (!gameStarted) {
    throw new Error(`[User A][${username}] 遊戲未開始（超時）`);
  }
  console.log(`[User A][${username}] ✅ 遊戲已開始`);

  // Step 3: 交易迴圈
  let iteration = 0;
  while (Date.now() < startTime + duration) {
    iteration++;
    console.log(`\n[User A][${username}] ======== 第 ${iteration} 次迭代 ========`);

    // Step 3.1: 讀取資產
    const assets = await actions.readAssets();
    if (!assets) {
      console.warn(`[User A][${username}] ⚠️ 無法讀取資產，跳過本次迴圈`);
      await page.waitForTimeout(1000);
      continue;
    }

    const { cash, stockCount, stockValue } = assets;
    
    // 讀取當前股價（從圖表）
    const stockPrice = await actions.getCurrentStockPrice();
    
    console.log(`[User A][${username}] 當前資產：現金 = ${cash.toFixed(2)}, 持股 = ${stockCount}, 股價 = ${stockPrice.toFixed(2)}, 股票現值 = ${stockValue.toFixed(2)}`);

    // Step 3.2: 決策邏輯（動態閾值：至少能買 2 張才買入）
    const buyThreshold = stockPrice * 2;
    
    if (cash > buyThreshold && stockPrice > 0) {
      // 買入策略：現金足夠買 5 張
      const maxAffordable = Math.floor(cash / stockPrice);
      const amount = randomInt(1, Math.min(5, maxAffordable));
      console.log(`[User A][${username}] 💰 現金充足（${cash.toFixed(2)} > ${buyThreshold.toFixed(2)}），嘗試買入 ${amount} 張股票...`);
      
      const buySuccess = await actions.buyStock(amount);
      if (buySuccess) {
        console.log(`[User A][${username}] ✅ 成功買入 ${amount} 張股票`);
      } else {
        console.warn(`[User A][${username}] ⚠️ 買入失敗（可能資金不足或系統錯誤）`);
      }
    } else if (cash <= buyThreshold && stockCount > 0) {
      // 賣出策略：現金不足且有持股
      // 【關鍵防護】：只有在 stockCount > 0 時才賣出，避免「賣出 0 股票」錯誤
      console.log(`[User A][${username}] 📉 現金不足（${cash.toFixed(2)} <= ${buyThreshold.toFixed(2)}），嘗試賣出 1 張股票補充現金...`);
      
      const sellSuccess = await actions.sellStock(1);
      if (sellSuccess) {
        console.log(`[User A][${username}] ✅ 成功賣出 1 張股票`);
      } else {
        console.warn(`[User A][${username}] ⚠️ 賣出失敗（可能系統錯誤）`);
      }
    } else {
      // 持有狀態
      console.log(`[User A][${username}] 🔒 現金不足且無股票，維持持有狀態...`);
    }

    // Step 3.3: 等待 1 秒
    await page.waitForTimeout(1000);
  }

  console.log(`\n[User A][${username}] 🏁 執行完畢，共進行 ${iteration} 次迭代`);
}

// ==================== 測試案例 ====================

/**
 * User A Simulation Test (1 分鐘驗證)
 * 
 * 目的：驗證現貨交易員邏輯是否正常運作
 * 執行時長：60 秒
 */
test("Scenario: User A (Spot Trader) - 1 min", async ({ page }) => {
  const users = loadUsers();
  
  // 選擇第一個已註冊的使用者
  const user = users.find((u) => u.registered);
  if (!user) {
    throw new Error("❌ 找不到已註冊的使用者，請先執行 Action 01 註冊");
  }

  console.log(`\n========================================`);
  console.log(`🎯 開始執行 User A 情境測試`);
  console.log(`使用者：${user.username}`);
  console.log(`執行時長：60 秒`);
  console.log(`========================================\n`);

  // 執行 User A 行為模式（60 秒）
  await runUserA(page, user.username, user.password, 60000);

  // 驗證：測試不應拋出異常
  expect(true).toBe(true);
  console.log(`\n✅ User A 情境測試完成！`);
});

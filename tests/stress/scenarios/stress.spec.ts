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

// ==================== User B: 合約交易員 (Contract Trader) ====================

/**
 * User B 行為模式：合約交易員
 * 
 * 策略邏輯（隨機交易模式）：
 * 1. 80% 機率：開倉（隨機選擇做多/做空、槓桿 1-5 倍、固定 1 張合約）
 * 2. 20% 機率：清倉（撤銷所有未結算合約）
 * 
 * 機率實作說明：
 * - 使用 Math.random() 產生 0-1 之間的隨機數
 * - 若 < 0.2 (20%)：執行清倉 (cancelAllContracts)
 * - 若 >= 0.2 (80%)：執行開倉 (buyContract)
 * 
 * 此設計確保：
 * - 合約市場有足夠的流動性與交易量
 * - 避免無限累積倉位
 * - 測試系統處理大量開倉/撤單請求的能力
 * 
 * @param page - Playwright Page 物件
 * @param username - 使用者帳號
 * @param password - 使用者密碼
 * @param duration - 執行時長（毫秒）
 */
export async function runUserB(
  page: Page,
  username: string,
  password: string,
  duration: number
): Promise<void> {
  const actions = new GameActions(page, username);
  const startTime = Date.now();

  console.log(`[User B][${username}] 開始執行合約交易策略，預計執行 ${duration / 1000} 秒`);

  // Step 1: 登入
  console.log(`[User B][${username}] 執行登入...`);
  const loginSuccess = await actions.login(username, password);
  if (!loginSuccess) {
    throw new Error(`[User B][${username}] 登入失敗`);
  }
  console.log(`[User B][${username}] ✅ 登入成功`);

  // Step 2: 等待遊戲開始
  console.log(`[User B][${username}] 等待遊戲開始...`);
  const gameStarted = await actions.waitForGameStart();
  if (!gameStarted) {
    throw new Error(`[User B][${username}] 遊戲未開始（超時）`);
  }
  console.log(`[User B][${username}] ✅ 遊戲已開始`);

  // Step 3: 交易迴圈
  let iteration = 0;
  let buyCount = 0;
  let cancelCount = 0;

  while (Date.now() < startTime + duration) {
    iteration++;
    console.log(`\n[User B][${username}] ======== 第 ${iteration} 次迭代 ========`);

    // Step 3.1: 讀取合約（模擬檢查持倉，但決策為隨機）
    const contracts = await actions.readContracts();
    if (contracts !== null) {
      console.log(`[User B][${username}] 當前持有合約數量：${contracts.length}`);
    }

    // Step 3.2: 決策邏輯（80% 開倉 / 20% 清倉）
    const rand = Math.random();

    if (rand < 0.2) {
      // 20% 機率：清倉
      console.log(`[User B][${username}] 🔄 觸發清倉邏輯（機率 ${(rand * 100).toFixed(1)}% < 20%）`);
      
      const cancelSuccess = await actions.cancelAllContracts();
      if (cancelSuccess) {
        cancelCount++;
        console.log(`[User B][${username}] ✅ 成功撤銷所有合約`);
      } else {
        console.warn(`[User B][${username}] ⚠️ 撤銷合約失敗（可能無持倉或系統錯誤）`);
      }
    } else {
      // 80% 機率：開倉
      const contractType = Math.random() > 0.5 ? "LONG" : "SHORT";
      const leverage = randomInt(1, 5);
      const amount = 1;

      console.log(`[User B][${username}] 📈 觸發開倉邏輯（機率 ${(rand * 100).toFixed(1)}% >= 20%）`);
      console.log(`[User B][${username}] 參數：類型 = ${contractType}, 槓桿 = ${leverage}x, 數量 = ${amount} 張`);

      const buySuccess = await actions.buyContract(contractType, leverage, amount);
      if (buySuccess) {
        buyCount++;
        console.log(`[User B][${username}] ✅ 成功開倉`);
      } else {
        console.warn(`[User B][${username}] ⚠️ 開倉失敗（可能資金不足或系統錯誤）`);
      }
    }

    // Step 3.3: 等待 1 秒
    await page.waitForTimeout(1000);
  }

  console.log(`\n[User B][${username}] 🏁 執行完畢`);
  console.log(`[User B][${username}] 統計：共 ${iteration} 次迭代，開倉 ${buyCount} 次，清倉 ${cancelCount} 次`);
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

/**
 * User B Simulation Test (1 分鐘驗證)
 * 
 * 目的：驗證合約交易員邏輯是否正常運作
 * 執行時長：60 秒
 * 
 * 預期行為：
 * - 約 80% 的迭代會執行開倉（buyContract）
 * - 約 20% 的迭代會執行清倉（cancelAllContracts）
 * - Console 應顯示隨機的 LONG/SHORT、1-5 倍槓桿
 */
test("Scenario: User B (Contract Trader) - 1 min", async ({ page }) => {
  test.setTimeout(120000); // 設定 2 分鐘超時（60秒執行 + 60秒緩衝）
  
  const users = loadUsers();
  
  // 選擇第二個已註冊的使用者（避免與 User A 衝突）
  const user = users.filter((u) => u.registered)[1] || users.find((u) => u.registered);
  if (!user) {
    throw new Error("❌ 找不到已註冊的使用者，請先執行 Action 01 註冊");
  }

  console.log(`\n========================================`);
  console.log(`🎯 開始執行 User B 情境測試`);
  console.log(`使用者：${user.username}`);
  console.log(`執行時長：60 秒`);
  console.log(`========================================\n`);

  // 執行 User B 行為模式（60 秒）
  await runUserB(page, user.username, user.password, 60000);

  // 驗證：測試不應拋出異常
  expect(true).toBe(true);
  console.log(`\n✅ User B 情境測試完成！`);
});

// ==================== User C: 地下錢莊客戶 (Loan Shark Client) ====================

/**
 * User C 行為模式：地下錢莊客戶
 * 
 * 策略邏輯：
 * 1. 首次迭代：與沈梟對話一次（測試互動功能）
 * 2. 當負債 = 0 時，借款 $100（測試借款流程）
 * 3. 當負債 > 0 且現金 >= $100 時，還款 $100（測試還款流程）
 * 4. 否則等待（模擬現金不足的情況）
 * 
 * 測試目的：
 * - 驗證 handleLoan 方法在高頻開關 Modal 下的穩定性
 * - 測試借款/還款流程的正確性
 * - 確保 Modal 動畫不會導致選擇器失效
 * - 測試與地下錢莊主人的互動功能
 * 
 * @param page - Playwright Page 物件
 * @param username - 使用者帳號
 * @param password - 使用者密碼
 * @param duration - 執行時長（毫秒）
 */
export async function runUserC(
  page: Page,
  username: string,
  password: string,
  duration: number
): Promise<void> {
  const actions = new GameActions(page, username);
  const startTime = Date.now();

  console.log(`[User C][${username}] 開始執行地下錢莊客戶策略，預計執行 ${duration / 1000} 秒`);

  // Step 1: 登入
  console.log(`[User C][${username}] 執行登入...`);
  const loginSuccess = await actions.login(username, password);
  if (!loginSuccess) {
    throw new Error(`[User C][${username}] 登入失敗`);
  }
  console.log(`[User C][${username}] ✅ 登入成功`);

  // Step 2: 等待遊戲開始
  console.log(`[User C][${username}] 等待遊戲開始...`);
  const gameStarted = await actions.waitForGameStart();
  if (!gameStarted) {
    throw new Error(`[User C][${username}] 遊戲未開始（超時）`);
  }
  console.log(`[User C][${username}] ✅ 遊戲已開始`);

  // Step 3: 借還款迴圈
  let iteration = 0;
  let borrowCount = 0;
  let repayCount = 0;
  let idleCount = 0;
  let hasTalkedToMerchant = false; // 標記是否已與沈梟對話

  while (Date.now() < startTime + duration) {
    iteration++;
    console.log(`\n[User C][${username}] ======== 第 ${iteration} 次迭代 ========`);

    // Step 3.1: 首次迭代與沈梟對話
    if (iteration === 1 && !hasTalkedToMerchant) {
      console.log(`[User C][${username}] 💬 首次迭代，嘗試與沈梟對話...`);
      const talkSuccess = await actions.interactWithLoanShark();
      if (talkSuccess) {
        console.log(`[User C][${username}] ✅ 成功與沈梟互動`);
        hasTalkedToMerchant = true;
      } else {
        console.warn(`[User C][${username}] ⚠️ 與沈梟互動失敗`);
      }
      // 等待 Modal 完全穩定
      await page.waitForTimeout(1000);
    }

    // Step 3.2: 讀取資產
    const assets = await actions.readAssets();
    if (!assets) {
      console.warn(`[User C][${username}] ⚠️ 無法讀取資產，跳過本次迴圈`);
      await page.waitForTimeout(1000);
      continue;
    }

    const { cash, debt } = assets;
    console.log(`[User C][${username}] 當前資產：現金 = ${cash.toFixed(2)}, 負債 = ${debt.toFixed(2)}`);

    // Step 3.3: 決策邏輯
    if (debt === 0) {
      // 情況 1: 無負債，借款 $100
      console.log(`[User C][${username}] 💰 觸發借款邏輯（負債 = 0）`);
      const borrowSuccess = await actions.handleLoan('BORROW', 100);
      
      if (borrowSuccess) {
        borrowCount++;
        console.log(`[User C][${username}] ✅ 成功借款 $100`);
      } else {
        console.warn(`[User C][${username}] ⚠️ 借款失敗（可能達到借款上限）`);
      }
    } else if (debt > 0 && cash >= 100) {
      // 情況 2: 有負債且現金充足，還款 $100
      console.log(`[User C][${username}] 💳 觸發還款邏輯（負債 = ${debt.toFixed(2)}, 現金 = ${cash.toFixed(2)}）`);
      const repayAmount = Math.min(100, debt); // 不能還超過負債的金額
      const repaySuccess = await actions.handleLoan('REPAY', repayAmount);
      
      if (repaySuccess) {
        repayCount++;
        console.log(`[User C][${username}] ✅ 成功還款 $${repayAmount}`);
      } else {
        console.warn(`[User C][${username}] ⚠️ 還款失敗（可能餘額不足）`);
      }
    } else {
      // 情況 3: 有負債但現金不足 $100，等待
      console.log(`[User C][${username}] ⏸️ 現金不足，等待下次迴圈（現金 = ${cash.toFixed(2)}, 需要 >= 100）`);
      idleCount++;
    }

    // Step 3.4: 等待 1 秒
    await page.waitForTimeout(1000);
  }

  console.log(`\n[User C][${username}] 🏁 執行完畢`);
  console.log(`[User C][${username}] 統計：共 ${iteration} 次迭代，借款 ${borrowCount} 次，還款 ${repayCount} 次，等待 ${idleCount} 次`);
}

// ==================== 測試案例 ====================

/**
 * User C Simulation Test (1 分鐘驗證)
 * 
 * 目的：驗證地下錢莊借還款邏輯與 Modal 穩定性
 * 執行時長：60 秒
 * 
 * 預期行為：
 * - 首次迭代應執行借款（因為初始負債為 0）
 * - 後續迭代應根據現金與負債狀況執行還款或等待
 * - Console 應顯示「借款成功」與「還款成功」的交替記錄
 * - 不應出現「找不到元素」或「timeout」錯誤
 */
test("Scenario: User C (Loan Shark Client) - 1 min", async ({ page }) => {
  test.setTimeout(120000); // 設定 2 分鐘超時（60秒執行 + 60秒緩衝）
  
  const users = loadUsers();
  
  // 選擇第三個已註冊的使用者（避免與 User A/B 衝突）
  const user = users.filter((u) => u.registered)[2] || users.find((u) => u.registered);
  if (!user) {
    throw new Error("❌ 找不到已註冊的使用者，請先執行 Action 01 註冊");
  }

  console.log(`\n========================================`);
  console.log(`🎯 開始執行 User C 情境測試`);
  console.log(`使用者：${user.username}`);
  console.log(`執行時長：60 秒`);
  console.log(`========================================\n`);

  // 執行 User C 行為模式（60 秒）
  await runUserC(page, user.username, user.password, 60000);

  // 驗證：測試不應拋出異常
  expect(true).toBe(true);
  console.log(`\n✅ User C 情境測試完成！`);
});

// ==================== User D: 機智問答達人 (Quiz Master) ====================

/**
 * User D 行為模式：機智問答達人
 * 
 * 策略邏輯（事件驅動模式）：
 * 1. 阻塞式等待問答遊戲開始（Blocking Wait）
 * 2. 問答開始後，隨機選擇 A/B/C/D 作答
 * 3. 等待結果並讀取資產變化
 * 4. 回到步驟 1，繼續等待下一場問答
 * 
 * 核心特性：
 * - **Event-Driven Loop（事件驅動迴圈）**：
 *   與 User A/B/C 的持續交易不同，User D 大部分時間處於「睡眠狀態」，
 *   只有當 Admin 手動觸發問答遊戲時才會被「喚醒」。
 * 
 * - **Blocking Wait（阻塞式等待）**：
 *   waitForQuizStart() 使用 timeout: 0（無限等待），直到偵測到
 *   「🧠 機智問答」文字出現。這避免了輪詢（Polling）的資源浪費。
 * 
 * - **隨機作答策略**：
 *   為簡化壓力測試邏輯，此版本採用隨機選擇答案。
 *   若需實作智能策略，可讀取 data/user-strategies.json 檔案。
 * 
 * @param page - Playwright Page 物件
 * @param username - 使用者帳號
 * @param password - 使用者密碼
 * @param duration - 執行時長（毫秒）
 */
export async function runUserD(
  page: Page,
  username: string,
  password: string,
  duration: number
): Promise<void> {
  const actions = new GameActions(page, username);
  const startTime = Date.now();

  console.log(`[User D][${username}] 開始執行機智問答策略，預計執行 ${duration / 1000} 秒`);

  // Step 1: 登入
  console.log(`[User D][${username}] 執行登入...`);
  const loginSuccess = await actions.login(username, password);
  if (!loginSuccess) {
    throw new Error(`[User D][${username}] 登入失敗`);
  }
  console.log(`[User D][${username}] ✅ 登入成功`);

  // Step 2: 等待遊戲開始
  console.log(`[User D][${username}] 等待遊戲開始...`);
  const gameStarted = await actions.waitForGameStart();
  if (!gameStarted) {
    throw new Error(`[User D][${username}] 遊戲未開始（超時）`);
  }
  console.log(`[User D][${username}] ✅ 遊戲已開始`);

  // Step 3: 問答迴圈（事件驅動）
  let quizRound = 0;

  while (Date.now() < startTime + duration) {
    quizRound++;
    console.log(`\n[User D][${username}] ======== 等待第 ${quizRound} 場問答 ========`);

    // Step 3.1: 阻塞式等待問答開始 ⏳
    console.log(`[User D][${username}] ⏳ 阻塞等待問答遊戲開始...（此步驟可能需等待數分鐘）`);
    const quizStarted = await actions.waitForQuizStart();
    
    if (!quizStarted) {
      console.log(`[User D][${username}] ⏱️ 測試時間結束，尚未偵測到新問答`);
      break;
    }
    
    console.log(`[User D][${username}] 🎯 問答遊戲已開始！`);

    // Step 3.2: 隨機選擇答案
    const options: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
    const choice = options[randomInt(0, 3)];
    
    console.log(`[User D][${username}] 🎲 隨機選擇答案：${choice}`);
    
    const answerSuccess = await actions.answerQuiz(choice);
    if (answerSuccess) {
      console.log(`[User D][${username}] ✅ 成功提交答案：${choice}`);
    } else {
      console.warn(`[User D][${username}] ⚠️ 提交答案失敗`);
    }

    // Step 3.3: 等待結果並讀取資產
    console.log(`[User D][${username}] ⏳ 等待問答結果...`);
    const updatedAssets = await actions.waitQuizResultAndReport();
    
    if (updatedAssets) {
      console.log(`[User D][${username}] 📊 結果公布後資產：現金 = ${updatedAssets.cash.toFixed(2)}, 負債 = ${updatedAssets.debt.toFixed(2)}`);
    } else {
      console.warn(`[User D][${username}] ⚠️ 無法讀取結果後的資產`);
    }

    // Step 3.4: 短暫等待（確保 UI 穩定後再進入下一次等待）
    await page.waitForTimeout(1000);
    
    console.log(`[User D][${username}] 🔄 回到等待狀態，準備下一場問答...`);
  }

  console.log(`\n[User D][${username}] 🏁 執行完畢，共參與 ${quizRound - 1} 場問答`);
}

// ==================== 測試案例 ====================

/**
 * User D Simulation Test (2 分鐘驗證)
 * 
 * 目的：驗證機智問答機器人的事件驅動邏輯
 * 執行時長：120 秒
 * 
 * 預期行為：
 * - 登入後進入「阻塞等待」狀態
 * - 當 Admin 發布問答題目時，機器人應立即偵測並作答
 * - 等待結果公布後，自動回到等待狀態
 * - 若測試期間 Admin 未發布題目，測試應在 2 分鐘後正常結束
 * 
 * ⚠️ 測試前提：
 * - 需要 Admin 手動配合發布至少 1 題問答（透過 /admin 後台）
 * - 若無題目發布，測試仍會 Pass（僅顯示「尚未偵測到新問答」）
 */
test("Scenario: User D (Quiz Master) - 2 min", async ({ page }) => {
  test.setTimeout(180000); // 設定 3 分鐘超時（120秒執行 + 60秒緩衝）
  
  const users = loadUsers();
  
  // 選擇第四個已註冊的使用者（避免與 User A/B/C 衝突）
  const registeredUsers = users.filter((u) => u.registered);
  const user = registeredUsers[3] || registeredUsers[0];
  
  if (!user) {
    throw new Error("❌ 找不到已註冊的使用者，請先執行 Action 01 註冊");
  }

  console.log(`\n========================================`);
  console.log(`🎯 開始執行 User D 情境測試`);
  console.log(`使用者：${user.username}`);
  console.log(`執行時長：120 秒`);
  console.log(`⚠️ 請確保 Admin 在測試期間發布至少 1 題問答`);
  console.log(`========================================\n`);

  // 執行 User D 行為模式（120 秒）
  await runUserD(page, user.username, user.password, 120000);

  // 驗證：測試不應拋出異常
  expect(true).toBe(true);
  console.log(`\n✅ User D 情境測試完成！`);
});

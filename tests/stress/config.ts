/**
 * 壓力測試全域配置檔
 * 
 * 根據 spec/StressTest/StressTest.md Section 2 實作
 * 定義測試環境參數與角色分配比例
 */

// ==================== 測試環境參數 ====================

/**
 * 總併發測試人數 (Browser Contexts)
 * 建議值：50（生產壓測）
 * 開發測試可調整為 5
 */
export const TOTAL_USERS = 5; // 開發階段先使用 5 人測試

/**
 * 測試持續遊戲天數
 * 測試腳本會在達到此天數時自動結束
 */
export const TEST_END_DAY = 10;

/**
 * Headless 模式開關
 * true: 無頭模式（強烈建議，節省記憶體）
 * false: 顯示瀏覽器視窗（僅供除錯使用）
 */
export const HEADLESS = true;

// ==================== 角色分配設定 ====================

/**
 * 使用者角色分配 (User Distribution)
 * 
 * 程式碼會依據此設定動態產生對應數量的測試案例
 * 
 * 角色說明：
 * - typeA: 現貨交易員 (Spot Trader)
 * - typeB: 合約交易員 (Contract Trader)
 * - typeC: 借貸大戶 (Loan Shark Client)
 * - typeD: 機智問答達人 (Quiz Master)
 * - typeE: 少數決策略家 (Minority Strategist)
 * 
 * 注意：總和應等於 TOTAL_USERS
 */
export const USER_DISTRIBUTION = {
  typeA: 1, // 現貨 (Spot)
  typeB: 1, // 合約 (Contract)
  typeC: 1, // 借貸 (Loan)
  typeD: 1, // 問答 (Quiz)
  typeE: 1, // 少數決 (Minority)
};

// ==================== 驗證函式 ====================

/**
 * 驗證角色分配總數是否正確
 * @returns true 若總數匹配，否則拋出錯誤
 */
export function validateConfig(): boolean {
  const total = Object.values(USER_DISTRIBUTION).reduce((sum, count) => sum + count, 0);
  
  if (total !== TOTAL_USERS) {
    throw new Error(
      `❌ 配置錯誤：USER_DISTRIBUTION 總和 (${total}) 不等於 TOTAL_USERS (${TOTAL_USERS})`
    );
  }
  
  console.log(`✅ 配置驗證通過：${TOTAL_USERS} 位使用者已正確分配`);
  return true;
}

// ==================== 測試 URL ====================

/**
 * 測試目標網址
 * 開發環境可改為 localhost
 */
export const BASE_URL = 'https://stock-sprint-frontend.vercel.app';

/**
 * 後端 API 網址
 */
export const API_URL = 'https://stock-sprint-backend.onrender.com';

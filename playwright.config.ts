import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 壓力測試配置
 * 
 * 關鍵設定：
 * - workers: 1 (單一執行緒，但支援多個 BrowserContext 並行)
 * - headless: true (強烈建議，節省記憶體)
 * - timeout: 60000 (單個 Action 最多 60 秒)
 * - expect.timeout: 10000 (斷言等待 10 秒)
 */
export default defineConfig({
  // 測試檔案位置
  testDir: './tests/stress',

  // 單一 Worker（避免資源競爭，所有並發透過 BrowserContext 實現）
  workers: 1,

  // 全域逾時設定
  timeout: 60 * 1000, // 60 秒（單個測試案例）
  expect: {
    timeout: 10 * 1000, // 10 秒（等待元件出現）
  },

  // 失敗處理
  retries: 0, // 不重試（壓力測試需要真實結果）
  
  // 報告格式
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'], // 終端機即時輸出
  ],

  // 瀏覽器設定
  use: {
    // 測試網址
    baseURL: 'https://stock-sprint-frontend.vercel.app',

    // 無頭模式（生產環境必須開啟）
    headless: true,

    // 視窗大小（模擬手機螢幕）
    viewport: { width: 375, height: 667 },

    // 操作逾時
    actionTimeout: 15 * 1000, // 15 秒

    // 截圖設定（僅失敗時截圖）
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 追蹤設定（失敗時保留追蹤檔案）
    trace: 'retain-on-failure',
  },

  // 專案配置（目前僅使用 Chromium）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // WebServer 配置（可選：若需本地測試前端）
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});

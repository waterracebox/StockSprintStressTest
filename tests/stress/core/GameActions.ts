// tests/stress/core/GameActions.ts
import { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * 資產資料介面
 * 用於記錄玩家的總資產、現金、股票市值、持股數量、負債
 */
export interface AssetData {
  totalAssets: number; // 總資產
  cash: number; // 現金
  stockValue: number; // 股票市值
  stockCount: number; // 持股數量
  debt: number; // 負債
}

/**
 * 合約資料介面
 * 用於記錄玩家的保證金與合約列表
 */
export interface ContractData {
  margin: number; // 保證金總額
  contracts: Array<{
    type: string; // 合約類型 (LONG/SHORT)
    leverage: number; // 槓桿倍數
    amount: number; // 合約張數
  }>;
}

/**
 * GameActions 類別
 * 封裝所有壓力測試的原子功能（20 個 Actions）
 * 每個方法代表一個獨立的測試積木
 */
export class GameActions {
  /**
   * 建構函式
   * @param page Playwright Page 實例
   * @param userIndex 使用者編號（用於 Log 識別）
   */
  constructor(private page: Page, private userIndex: number) {}

  /**
   * Log 輔助函式
   * 統一格式化輸出測試日誌
   * 格式：[User XX][Action YY] 功能名稱: 狀態 訊息
   * @param id Action ID (00-19)
   * @param name Action 名稱（中文）
   * @param status 狀態（成功/失敗/等待）
   * @param msg 額外訊息（可選）
   */
  private log(id: number, name: string, status: string, msg: string = "") {
    const userStr = this.userIndex.toString().padStart(2, "0");
    const idStr = id.toString().padStart(2, "0");
    console.log(`[User ${userStr}][Action ${idStr}] ${name}: ${status} ${msg}`);
  }

  // ==================== Auth & Basic ====================

  /**
   * Action 00: 等待遊戲開始
   * Blocking 等待直到偵測到「第 X 天」或主畫面元件
   */
  async waitForGameStart(): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 01: 註冊
   * @param nick 遊戲暱稱
   * @param user 帳號
   * @param pass 密碼
   */
  async register(nick: string, user: string, pass: string): Promise<boolean> {
    this.log(1, "註冊", "開始", `${user}`);

    try {
      // 1. 點擊「線上開戶」按鈕開啟 Modal
      await this.page.click('button:has-text("線上開戶")');
      this.log(1, "註冊", "Modal已開啟", "");

      // 2. 定位 Modal 容器（確保操作在 Modal 內進行）
      const modal = this.page.locator('.adm-center-popup-body');
      await modal.waitFor({ state: "visible", timeout: 3000 });

      // 3. 填寫表單欄位（在 Modal 內部查找，避免與背景頁面衝突）
      await modal.locator('input[id*="displayName"]').fill(nick);
      await modal.locator('input[id*="username"]').fill(user);
      await modal.locator('input[id*="password"]').first().fill(pass); // 密碼欄位
      await modal.locator('input[id*="confirmPassword"]').fill(pass); // 確認密碼
      this.log(1, "註冊", "表單已填寫", "");

      // 3. 點擊送出按鈕
      await this.page.click('button:has-text("送出")');
      this.log(1, "註冊", "已送出", "");

      // 4. 等待成功 Toast 出現（antd 的 message 組件）
      const toastLocator = this.page.locator(".ant-message-notice-content").filter({ hasText: "註冊成功" });
      await toastLocator.waitFor({ state: "visible", timeout: 5000 });
      this.log(1, "註冊", "成功 Toast 已顯示", "");

      // 5. 寫入 users.json
      const dataDir = path.join(__dirname, "../data");
      const usersFilePath = path.join(dataDir, "users.json");

      // 確保目錄存在
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // 讀取現有資料
      let users: Array<{ username: string; password: string; registered: boolean }> = [];
      if (fs.existsSync(usersFilePath)) {
        const content = fs.readFileSync(usersFilePath, "utf-8");
        users = JSON.parse(content);
      }

      // 新增使用者
      users.push({ username: user, password: pass, registered: true });

      // 寫回檔案
      fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), "utf-8");
      this.log(1, "註冊", "已寫入 users.json", `Total: ${users.length}`);

      this.log(1, "註冊", "成功", `${user}`);
      return true;
    } catch (error: any) {
      this.log(1, "註冊", "失敗", error.message);
      
      // 失敗時截圖存證，方便前端 Debug
      try {
        const errorDir = path.join(__dirname, "../../../test-results/action-errors");
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(errorDir, `action-01-register-error-${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(1, "註冊", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }
      
      return false;
    }
  }

  /**
   * Action 02: 登入
   * @param user 帳號
   * @param pass 密碼
   */
  async login(user: string, pass: string): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 03: 換頭像
   * @param index 頭像編號
   */
  async changeAvatar(index: number): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 19: 設定員工身分
   * @param isEmployee 是否為員工
   */
  async setEmployeeStatus(isEmployee: boolean): Promise<boolean> {
    /* TODO */ return false;
  }

  // ==================== Data ====================

  /**
   * Action 04: 讀取資產
   * 解析 DOM 取得現金、股票、負債數值並 Log 輸出
   */
  async readAssets(): Promise<AssetData | null> {
    /* TODO */ return null;
  }

  /**
   * Action 05: 讀取合約
   * 解析合約列表與保證金資訊並 Log 輸出
   */
  async readContracts(): Promise<ContractData | null> {
    /* TODO */ return null;
  }

  // ==================== Trading ====================

  /**
   * Action 06: 買入股票
   * @param amount 張數
   */
  async buyStock(amount: number): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 07: 賣出股票
   * @param amount 張數
   */
  async sellStock(amount: number): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 08: 買入合約
   * @param type 做多 (LONG) 或做空 (SHORT)
   * @param lev 槓桿倍數
   * @param amt 合約張數
   */
  async buyContract(
    type: "LONG" | "SHORT",
    lev: number,
    amt: number
  ): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 09: 撤銷今日合約
   * 取消所有未結算的合約
   */
  async cancelAllContracts(): Promise<boolean> {
    /* TODO */ return false;
  }

  // ==================== Loan ====================

  /**
   * Action 10: 開啟地下錢莊
   * 驗證 Modal 是否正確開啟
   */
  async openLoanShark(): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 11: 借/還錢
   * @param action 動作類型 (BORROW=借款, REPAY=還款)
   * @param amount 金額
   */
  async handleLoan(
    action: "BORROW" | "REPAY",
    amount: number
  ): Promise<boolean> {
    /* TODO */ return false;
  }

  // ==================== Quiz ====================

  /**
   * Action 12: 等待問答開始
   * Blocking 等待直到 Quiz Overlay 可見
   */
  async waitForQuizStart(): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 13: 問答作答
   * @param option 選項 (A/B/C/D)
   */
  async answerQuiz(option: "A" | "B" | "C" | "D"): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 14: 問答結果報告
   * 等待結果畫面並執行 Action 04 (讀取資產)
   */
  async waitQuizResultAndReport(): Promise<AssetData | null> {
    /* TODO */ return null;
  }

  // ==================== Minority ====================

  /**
   * Action 15: 等待少數決開始
   * Blocking 等待直到 Minority Overlay 可見
   */
  async waitForMinorityStart(): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 16: 少數決下注
   * @param option 選項 (A/B/C/D)
   * @param amount 下注金額
   */
  async betMinority(
    option: "A" | "B" | "C" | "D",
    amount: number
  ): Promise<boolean> {
    /* TODO */ return false;
  }

  /**
   * Action 17: 借錢週轉流程（複合動作）
   * 關閉小遊戲 → 開錢莊 → 借錢 → 關錢莊 → 回小遊戲
   */
  async closeBorrowAndReturn(): Promise<boolean> {
    /* TODO: Complex Flow */ return false;
  }

  /**
   * Action 18: 少數決結果報告
   * 等待結果畫面並執行 Action 04 (讀取資產)
   */
  async waitMinorityResultAndReport(): Promise<AssetData | null> {
    /* TODO */ return null;
  }
}

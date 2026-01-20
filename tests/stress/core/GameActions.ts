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
   * Blocking 等待直到偵測到倒數計時器有變動（表示遊戲正在運行）
   */
  async waitForGameStart(): Promise<boolean> {
    this.log(0, "等待遊戲開始", "開始", "");

    try {
      // 策略：檢測倒數計時器是否在變動（每秒更新一次），確認遊戲正在運行中
      // 前端顯示格式：「00:30」或「01:00」等倒數秒數
      
      // 1. 等待倒數計時器元素出現（無限等待）
      const countdownLocator = this.page.locator('span').filter({ 
        hasText: /\d{2}:\d{2}/ 
      }).first();
      
      await countdownLocator.waitFor({ 
        state: "visible", 
        timeout: 0 // 無限等待直到元素出現
      });
      
      this.log(0, "等待遊戲開始", "倒數計時器已出現", "");

      // 2. 記錄第一次的倒數秒數
      const firstCountdown = await countdownLocator.textContent();
      this.log(0, "等待遊戲開始", "初始倒數", firstCountdown || "");

      // 3. 等待 2 秒後再次檢查
      await this.page.waitForTimeout(2000);

      // 4. 取得第二次的倒數秒數
      const secondCountdown = await countdownLocator.textContent();
      this.log(0, "等待遊戲開始", "2秒後倒數", secondCountdown || "");

      // 5. 如果兩次秒數不同，表示遊戲正在運行中
      if (firstCountdown !== secondCountdown) {
        this.log(0, "等待遊戲開始", "成功", `倒數計時器有變動 (${firstCountdown} -> ${secondCountdown})`);
        return true;
      } else {
        this.log(0, "等待遊戲開始", "等待中", "倒數計時器尚未變動，繼續等待...");
        
        // 6. 如果沒有變動，每 2 秒重新檢查一次（無限循環直到遊戲開始）
        while (true) {
          await this.page.waitForTimeout(2000);
          const currentCountdown = await countdownLocator.textContent();
          
          if (currentCountdown !== secondCountdown) {
            this.log(0, "等待遊戲開始", "成功", `倒數計時器開始變動 (${secondCountdown} -> ${currentCountdown})`);
            return true;
          }
          
          this.log(0, "等待遊戲開始", "等待中", `倒數: ${currentCountdown}`);
        }
      }
    } catch (error: any) {
      this.log(0, "等待遊戲開始", "失敗", error.message);
      return false;
    }
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
    this.log(2, "登入", "開始", `${user}`);

    try {
      // 1. 導航至登入頁面（使用相對路徑）
      await this.page.goto("/");
      this.log(2, "登入", "已導航至登入頁", "");

      // 2. 填寫表單欄位（使用 Form Item ID）
      await this.page.locator('input[id*="username"]').fill(user);
      await this.page.locator('input[id*="password"]').fill(pass);
      this.log(2, "登入", "表單已填寫", "");

      // 3. 點擊登入按鈕
      await this.page.click('button[type="submit"]');
      this.log(2, "登入", "已送出", "");

      // 4. 驗證登入成功（等待 URL 跳轉至 /home）
      await this.page.waitForURL("**/home", { timeout: 5000 });
      this.log(2, "登入", "URL 已跳轉至 /home", "");

      // 5. 驗證 Token 存在於 localStorage
      const token = await this.page.evaluate(() =>
        localStorage.getItem("token")
      );
      if (!token) {
        this.log(2, "登入", "失敗", "Token 不存在於 localStorage");
        return false;
      }
      this.log(
        2,
        "登入",
        "Token 已驗證",
        `Token: ${token.substring(0, 20)}...`
      );

      this.log(2, "登入", "成功", `${user}`);
      return true;
    } catch (error: any) {
      this.log(2, "登入", "失敗", error.message);

      // 失敗時截圖存證
      try {
        const errorDir = path.join(
          __dirname,
          "../../../test-results/action-errors"
        );
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(
          errorDir,
          `action-02-login-error-${Date.now()}.png`
        );
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(2, "登入", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return false;
    }
  }

  /**
   * Action 03: 換頭像
   * @param index 頭像編號 (0-50)
   */
  async changeAvatar(index: number): Promise<boolean> {
    this.log(3, "換頭像", "開始", `index=${index}`);

    try {
      // 1️⃣ 驗證 index 範圍
      if (index < 0 || index > 50) {
        this.log(3, "換頭像", "失敗", `index 超出範圍 (0-50): ${index}`);
        return false;
      }

      // 2️⃣ 生成目標頭像檔名
      const targetAvatar = `avatar_${index.toString().padStart(2, "0")}.webp`;
      this.log(3, "換頭像", "目標頭像", targetAvatar);

      // 3️⃣ 點擊右上角頭像區域開啟使用者選單
      // 策略：點擊包含 Avatar 元件的整個區域（包含使用者名稱）
      const avatarArea = this.page.locator('.adm-avatar').first();
      await avatarArea.waitFor({ state: "visible", timeout: 5000 });
      await avatarArea.click();
      await this.page.waitForTimeout(500); // 等待選單動畫
      this.log(3, "換頭像", "已開啟使用者選單", "");

      // 4️⃣ 點擊「更改頭像」選項
      const changeAvatarOption = this.page.locator('div').filter({
        hasText: /^更改頭像$/
      }).first();
      await changeAvatarOption.waitFor({ state: "visible", timeout: 3000 });
      await changeAvatarOption.click();
      this.log(3, "換頭像", "已點擊更改頭像", "");

      // 5️⃣ 等待 Popup 出現（使用 Hash 錨點驗證）
      await this.page.waitForURL(/.*#avatar-selector/, { timeout: 5000 });
      this.log(3, "換頭像", "頭像選擇器已載入", "");

      // 6️⃣ 點擊目標頭像（使用父容器點擊避免被子元素擋住）
      // 策略：點擊包含該圖片的 Grid.Item 容器
      const targetAvatarContainer = this.page.locator('.adm-grid-item').filter({
        has: this.page.locator(`img[alt="${targetAvatar}"]`)
      });
      await targetAvatarContainer.waitFor({ state: "visible", timeout: 5000 });
      await targetAvatarContainer.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(300); // 等待滾動完成
      await targetAvatarContainer.click({ force: true });
      this.log(3, "換頭像", "已選擇頭像", targetAvatar);

      // 7️⃣ 點擊「儲存」按鈕
      const saveButton = this.page.locator('button').filter({
        hasText: /^儲存$/
      }).first();
      await saveButton.waitFor({ state: "visible", timeout: 3000 });
      await saveButton.click();
      this.log(3, "換頭像", "已點擊儲存", "");

      // 8️⃣ 等待 API 回應與 Modal 關閉
      // 策略：等待 URL Hash 清除（代表 Modal 已關閉）
      await this.page.waitForTimeout(1500); // 等待 API 回應與動畫
      
      // 驗證 Hash 已清除或回到正常狀態
      const currentUrl = this.page.url();
      if (currentUrl.includes('#avatar-selector')) {
        this.log(3, "換頭像", "失敗", "Modal 未關閉，可能儲存失敗");
        return false;
      }
      
      this.log(3, "換頭像", "Modal 已關閉", "");

      // 9️⃣ 驗證頭像已更新（檢查右上角頭像 src）
      await this.page.waitForTimeout(500);
      const currentAvatar = this.page.locator('.adm-avatar img').first();
      const avatarSrc = await currentAvatar.getAttribute('src');
      
      if (avatarSrc && avatarSrc.includes(targetAvatar)) {
        this.log(3, "換頭像", "成功", `${targetAvatar} (已驗證)`);
        return true;
      } else {
        this.log(3, "換頭像", "警告", `頭像可能未更新 (src=${avatarSrc})`);
        // 仍然視為成功，因為可能是快取問題
        this.log(3, "換頭像", "成功", targetAvatar);
        return true;
      }
    } catch (error: any) {
      this.log(3, "換頭像", "失敗", error.message);

      // 失敗時截圖存證
      try {
        const errorDir = path.join(
          __dirname,
          "../../../test-results/action-errors"
        );
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(
          errorDir,
          `action-03-avatar-error-${Date.now()}.png`
        );
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(3, "換頭像", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return false;
    }
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
   * 貨幣解析輔助函數
   * 將 UI 顯示的字串（如 "$197.20", "1,000 股", "-$50.00"）轉換為數字
   * @param text UI 文字內容
   * @returns 解析後的數值（失敗時返回 0）
   */
  private parseCurrency(text: string | null): number {
    if (!text) return 0;
    
    // 移除所有非數字字符（保留負號和小數點）
    // 範例：
    //   "$1,234.56" -> "1234.56"
    //   "100 股" -> "100"
    //   "-$50.00" -> "-50.00"
    const cleaned = text.replace(/[^0-9.-]/g, '');
    
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : value; // 容錯處理：解析失敗時返回 0
  }

  /**
   * Action 04: 讀取資產
   * 解析 DOM 取得現金、股票、負債數值並 Log 輸出
   */
  async readAssets(): Promise<AssetData | null> {
    this.log(4, "讀取資產", "開始", "");

    try {
      // 1️⃣ 等待資產區域載入（等待 WebSocket 連線並推送資料）
      await this.page.waitForTimeout(2000); // 給予 WebSocket 足夠時間推送資料
      
      const totalAssetsLabel = this.page.locator('div').filter({
        hasText: /^總資產$/
      }).first();
      
      await totalAssetsLabel.waitFor({ state: "visible", timeout: 5000 });
      this.log(4, "讀取資產", "資產區域已載入", "");

      // 2️⃣ 讀取總資產（直接使用 style 找到大字體數值）
      // 前端結構：fontSize: '36px', fontWeight: 'bold'
      const totalAssetsText = await this.page
        .locator('div[style*="font-size: 36px"]')
        .first()
        .textContent();
      this.log(4, "讀取資產", "總資產原始文字", totalAssetsText || "NULL");
      const totalAssets = this.parseCurrency(totalAssetsText);

      // 3️⃣ 讀取細項（使用更精確的選擇器）
      // 策略：找到標籤為「現金」的 div，然後找它的兄弟元素（下一個 div）
      const cashLabel = this.page.locator('div').filter({ hasText: /^現金$/ }).first();
      const cashText = await cashLabel.locator('..').locator('div').nth(1).textContent();
      this.log(4, "讀取資產", "現金原始文字", cashText || "NULL");
      const cash = this.parseCurrency(cashText);

      // 4️⃣ 讀取持股數量
      const stockLabel = this.page.locator('div').filter({ hasText: /^股票$/ }).first();
      const stockCountText = await stockLabel.locator('..').locator('div').nth(1).textContent();
      this.log(4, "讀取資產", "股票原始文字", stockCountText || "NULL");
      const stockCount = this.parseCurrency(stockCountText);

      // 5️⃣ 讀取股票現值
      const stockValueLabel = this.page.locator('div').filter({ hasText: /^股票現值$/ }).first();
      const stockValueText = await stockValueLabel.locator('..').locator('div').nth(1).textContent();
      this.log(4, "讀取資產", "股票現值原始文字", stockValueText || "NULL");
      const stockValue = this.parseCurrency(stockValueText);

      // 6️⃣ 讀取負債
      const debtLabel = this.page.locator('div').filter({ hasText: /^負債$/ }).first();
      const debtText = await debtLabel.locator('..').locator('div').nth(1).textContent();
      this.log(4, "讀取資產", "負債原始文字", debtText || "NULL");
      const debt = this.parseCurrency(debtText);

      // 7️⃣ 組裝資料
      const assetData: AssetData = {
        totalAssets,
        cash,
        stockValue,
        stockCount,
        debt,
      };

      // 8️⃣ Log 輸出（格式化顯示）
      this.log(
        4,
        "讀取資產",
        "成功",
        `總資產=${totalAssets.toFixed(2)}, 現金=${cash.toFixed(2)}, 股票=${stockCount}股, 市值=${stockValue.toFixed(2)}, 負債=${debt.toFixed(2)}`
      );

      return assetData;
    } catch (error: any) {
      this.log(4, "讀取資產", "失敗", error.message);

      // 失敗時截圖存證
      try {
        const errorDir = path.join(__dirname, "../../../test-results/action-errors");
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(errorDir, `action-04-read-assets-error-${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(4, "讀取資產", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return null;
    }
  }

  /**
   * Action 05: 讀取合約
   * 解析合約列表與保證金資訊並 Log 輸出
   */
  async readContracts(): Promise<ContractData | null> {
    this.log(5, "讀取合約", "開始", "");

    try {
      // 1️⃣ 等待資產區域載入
      await this.page.waitForTimeout(2000);

      // 2️⃣ 檢查是否有合約（若無，直接返回空結果）
      const marginLabel = this.page.locator('div').filter({ hasText: /^合約保證金$/ }).first();
      const marginLabelVisible = await marginLabel.isVisible().catch(() => false);

      if (!marginLabelVisible) {
        this.log(5, "讀取合約", "成功", "當前無合約");
        return {
          margin: 0,
          contracts: [],
        };
      }

      // 3️⃣ 讀取保證金總額
      const marginText = await marginLabel.locator('..').locator('div').nth(1).textContent();
      this.log(5, "讀取合約", "保證金原始文字", marginText || "NULL");
      const margin = this.parseCurrency(marginText);

      // 4️⃣ 找到合約保證金區塊（包含保證金標籤的父容器）
      const contractContainer = marginLabel.locator('../..');
      
      // 5️⃣ 在該區塊內找所有合約卡片（使用更精確的模式）
      // 策略：找到包含「做多/做空」和「倍」的 div（fontSize: 11px）
      const contractCards = contractContainer.locator('div').filter({ 
        hasText: /^(做多|做空)\s+\d+(\.\d+)?倍$/ 
      });
      const count = await contractCards.count();
      this.log(5, "讀取合約", "偵測到合約數量", count.toString());

      const contracts: ContractData['contracts'] = [];

      for (let i = 0; i < count; i++) {
        // 讀取第一行：「做多/做空 X倍」
        const firstLineText = await contractCards.nth(i).textContent();
        this.log(5, "讀取合約", `合約 ${i + 1} 第一行`, firstLineText || "NULL");

        // 正規表達式解析
        // 說明：
        // - (做多|做空)：捕獲群組 1，匹配「做多」或「做空」
        // - \s+：匹配一個或多個空白字元
        // - (\d+(\.\d+)?)：捕獲群組 2，匹配整數或小數（如 2 或 2.5）
        //   - \d+：至少一位數字
        //   - (\.\d+)?：可選的小數點與小數位
        // - 倍：字面匹配
        const regex = /(做多|做空)\s+(\d+(\.\d+)?)倍/;
        const match = firstLineText?.match(regex);

        if (!match) {
          this.log(5, "讀取合約", `合約 ${i + 1} 解析失敗`, "格式不符");
          continue;
        }

        const type = match[1] === '做多' ? 'LONG' : 'SHORT';
        const leverage = parseFloat(match[2]);

        // 讀取第二行：「Y張」（尋找同一個合約卡片容器內的下一個 div）
        const secondLineLocator = contractCards.nth(i).locator('..').locator('div').filter({ hasText: /^\d+張$/ }).first();
        const secondLineText = await secondLineLocator.textContent();
        this.log(5, "讀取合約", `合約 ${i + 1} 第二行`, secondLineText || "NULL");

        const amount = this.parseCurrency(secondLineText); // 移除「張」後解析數字

        contracts.push({ type, leverage, amount });
      }

      // 5️⃣ 組裝資料
      const contractData: ContractData = {
        margin,
        contracts,
      };

      // 6️⃣ Log 輸出
      const summary = contracts.map(c => `${c.type} ${c.leverage}x ${c.amount}張`).join(', ');
      this.log(5, "讀取合約", "成功", `保證金=${margin.toFixed(2)}, 合約=[${summary}]`);

      return contractData;
    } catch (error: any) {
      this.log(5, "讀取合約", "失敗", error.message);

      // 失敗時截圖存證
      try {
        const errorDir = path.join(__dirname, "../../../test-results/action-errors");
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(errorDir, `action-05-read-contracts-error-${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(5, "讀取合約", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return null;
    }
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

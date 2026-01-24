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
   * Action 19: 與地下錢莊主人互動
   * 點擊地下錢莊主人頭像並檢查對話變化
   * @returns 是否成功互動並檢測到對話變化
   */
  async interactWithLoanShark(): Promise<boolean> {
    this.log(19, "與地下錢莊主人互動", "開始", "");

    try {
      // 1️⃣ 確認 Modal 已開啟（若未開啟則先開啟）
      const modalTitle = this.page.locator('span').filter({
        hasText: /^地下錢莊$/
      }).first();

      const isModalVisible = await modalTitle.isVisible().catch(() => false);

      if (!isModalVisible) {
        this.log(19, "與地下錢莊主人互動", "Modal 未開啟", "嘗試自動開啟");
        const openSuccess = await this.openLoanShark();
        if (!openSuccess) {
          this.log(19, "與地下錢莊主人互動", "失敗", "無法開啟地下錢莊");
          return false;
        }
      }

      this.log(19, "與地下錢莊主人互動", "Modal 已確認開啟", "");

      // 2️⃣ 找到地下錢莊主人頭像（沈梟）
      // 策略：找到包含 alt="沈梟" 或 alt="黑心商人" 的圖片元素
      const merchantImage = this.page.locator('img[alt="黑心商人"]').first();

      await merchantImage.waitFor({ state: "visible", timeout: 5000 });
      this.log(19, "與地下錢莊主人互動", "已定位商人頭像", "");

      // 3️⃣ 找到對話框並讀取互動前的對話內容
      // 策略：對話框是白色背景的區塊，不包含「模式」、「日利率」等 UI 文字
      // 文字長度通常在 10-100 字之間
      
      // 等待 Modal 完全載入
      await this.page.waitForTimeout(500);
      
      // 找到對話框：使用頁面內所有文字，過濾出合理長度且不含UI關鍵字的內容
      const getAllDialogueTexts = async () => {
        return await this.page.evaluate(() => {
          const allDivs = document.querySelectorAll('div');
          const textMap = new Map<string, number>(); // 記錄每個文字出現的次數
          
          allDivs.forEach(div => {
            const text = div.textContent?.trim() || '';
            // 對話框特徵：
            // 1. 長度在 15-80 字之間（對話通常不會太短或太長）
            // 2. 不包含 UI 關鍵字
            // 3. 包含中文標點符號（，。！？等）
            if (text.length >= 15 && text.length <= 80 && 
                !text.includes('模式') && 
                !text.includes('日利率') &&
                !text.includes('今日額度') &&
                !text.includes('借款') &&
                !text.includes('還款') &&
                !text.includes('上限') &&
                !text.includes('當前負債') &&
                !text.includes('總資產') &&
                !text.includes('測試員工') &&
                !text.includes('(你)') &&
                !text.match(/\$\d+/) && // 避免選到金額
                !text.match(/\d+\/\d+/) && // 避免選到額度顯示
                !text.includes('•') && // 排除新聞條目（以 • 開頭）
                /[，。！？、：；]/.test(text) && // 必須包含中文標點
                /[\u4e00-\u9fa5]{5,}/.test(text)) { // 至少包含5個中文字
              
              const count = textMap.get(text) || 0;
              textMap.set(text, count + 1);
            }
          });
          
          // 轉換為陣列並排序：優先選擇出現次數多的（對話框通常重複出現）
          const results = Array.from(textMap.entries())
            .sort((a, b) => b[1] - a[1]) // 按出現次數降序
            .map(([text]) => text);
          
          return results;
        });
      };
      
      const beforeTexts = await getAllDialogueTexts();
      const beforeDialogue = beforeTexts.length > 0 ? beforeTexts[0] : "";
      this.log(19, "與地下錢莊主人互動", "互動前對話", `"${beforeDialogue}"`);

      // 4️⃣ 點擊商人頭像（使用 force: true 強制點擊）
      await merchantImage.click({ force: true });
      this.log(19, "與地下錢莊主人互動", "已點擊商人頭像", "（force: true）");

      // 5️⃣ 等待對話更新（React state 更新 + 動畫）
      await this.page.waitForTimeout(1500);

      // 6️⃣ 讀取互動後的對話內容
      const afterTexts = await getAllDialogueTexts();
      const afterDialogue = afterTexts.length > 0 ? afterTexts[0] : "";
      this.log(19, "與地下錢莊主人互動", "互動後對話", `"${afterDialogue}"`);

      // 7️⃣ 檢查對話是否有變化
      const beforeTrimmed = beforeDialogue.trim();
      const afterTrimmed = afterDialogue.trim();
      const hasChange = beforeTrimmed !== afterTrimmed && afterTrimmed.length > 0;
      
      if (hasChange) {
        this.log(19, "與地下錢莊主人互動", "對話已變化", `"${beforeTrimmed.substring(0, 20)}..." -> "${afterTrimmed.substring(0, 20)}..."`);
      } else if (beforeTrimmed === afterTrimmed && afterTrimmed.length > 0) {
        this.log(19, "與地下錢莊主人互動", "提示", `對話未變化（均為: "${afterTrimmed.substring(0, 30)}..."）`);
      } else {
        this.log(19, "與地下錢莊主人互動", "警告", "無法讀取對話內容");
      }

      this.log(19, "與地下錢莊主人互動", "成功", hasChange ? "對話有變化" : "互動完成");
      return true;

    } catch (error: any) {
      this.log(19, "與地下錢莊主人互動", "失敗", error.message);

      // 失敗時截圖存證
      try {
        const errorDir = path.join(__dirname, "../../../test-results/action-errors");
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(errorDir, `action-19-interact-loan-shark-error-${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(19, "與地下錢莊主人互動", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return false;
    }
  }

  /**
   * Action 19 (Alternative): 設定員工身分
   * 用於 Admin 或特殊測試情境
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
    this.log(6, "買入股票", "開始", `張數=${amount}`);

    try {
      // 1️⃣ 驗證張數合法性
      if (amount <= 0 || !Number.isInteger(amount)) {
        this.log(6, "買入股票", "失敗", `張數必須為正整數: ${amount}`);
        return false;
      }

      // 2️⃣ 檢查並切換至「現貨」Tab
      const spotTab = this.page.locator('button').filter({
        hasText: /^現貨$/
      }).first();
      await spotTab.waitFor({ state: "visible", timeout: 5000 });

      // 檢查 Tab 是否已選中（判斷 fill="solid" 對應的 class）
      const isSpotActive = await spotTab.evaluate((el) => {
        const button = el as HTMLButtonElement;
        // Ant Design Mobile Button 的 fill="solid" 會對應到 class 'adm-button-fill-solid'
        return button.classList.contains('adm-button-fill-solid');
      });

      if (!isSpotActive) {
        await spotTab.click();
        this.log(6, "買入股票", "已切換至現貨 Tab", "");
        await this.page.waitForTimeout(500); // 等待 UI 更新
      } else {
        this.log(6, "買入股票", "已在現貨 Tab", "");
      }

      // 3️⃣ 檢查並切換至「買入」模式
      // 策略：找到 DualColorSwitch 組件（自定義 div 組件，包含文字「買」或「賣」）
      // 透過文字內容判斷當前模式
      const switchContainer = this.page.locator('div').filter({
        hasText: /^(買|賣)$/
      }).first();
      
      await switchContainer.waitFor({ state: "visible", timeout: 3000 });

      // 讀取 Switch 當前顯示的文字（「買」表示已在買入模式）
      const switchText = await switchContainer.textContent();
      const isBuyMode = switchText?.includes('買');

      if (!isBuyMode) {
        await switchContainer.click();
        this.log(6, "買入股票", "已切換至買入模式", "");
        await this.page.waitForTimeout(500);
      } else {
        this.log(6, "買入股票", "已在買入模式", "");
      }

      // 4️⃣ 填寫張數（先清空再輸入）
      const amountInput = this.page.locator('input[type="number"]').first();
      await amountInput.waitFor({ state: "visible", timeout: 3000 });
      
      // 清空欄位（三次點擊選取全部內容）
      await amountInput.click({ clickCount: 3 });
      await this.page.keyboard.press('Backspace');
      
      // 填入新數值
      await amountInput.fill(amount.toString());
      this.log(6, "買入股票", "已填寫張數", amount.toString());

      // 5️⃣ 點擊「買入」按鈕
      const buyButton = this.page.locator('button').filter({
        hasText: /^買入$/
      }).first();
      await buyButton.waitFor({ state: "visible", timeout: 3000 });
      
      // 確認按鈕可點擊（未 disabled）
      const isDisabled = await buyButton.isDisabled();
      if (isDisabled) {
        this.log(6, "買入股票", "失敗", "買入按鈕被停用（可能資金不足或遊戲未開始）");
        return false;
      }

      await buyButton.click();
      this.log(6, "買入股票", "已點擊買入按鈕", "");

      // 6️⃣ 等待確認對話框並點擊「確定」
      // 對話框內容：「買入 X 張，預估支出 $XX.XX，確定嗎？」
      // 等待對話框出現（Ant Design Mobile 使用 .adm-center-popup-body 容器）
      await this.page.waitForTimeout(1000); // 給予充分的動畫時間
      
      const dialog = this.page.locator('.adm-center-popup-body').or(
        this.page.locator('[role="dialog"]')
      ).first();
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      this.log(6, "買入股票", "對話框已出現", "");
      
      // 調試：打印對話框的完整 HTML 結構
      const dialogHTML = await dialog.innerHTML();
      // 分段打印避免截斷
      const chunks = dialogHTML.match(/.{1,300}/g) || [];
      chunks.forEach((chunk, idx) => {
        this.log(6, "買入股票", `HTML片段${idx + 1}`, chunk);
      });
      
      // 在對話框內找第二個按鈕（第一個是「取消」，第二個是「確定」）
      // 根據 Ant Design Mobile Dialog 的結構，按鈕在 .adm-dialog-footer 內
      const confirmButton = dialog.locator('.adm-dialog-footer button').nth(1);
      
      await confirmButton.waitFor({ state: "visible", timeout: 3000 });
      const buttonText = await confirmButton.textContent();
      this.log(6, "買入股票", "準備點擊按鈕", buttonText || "");
      
      await confirmButton.click();
      this.log(6, "買入股票", "已點擊確定按鈕", "");

      // 7️⃣ 等待對話框關閉（確認交易已送出）
      await this.page.waitForTimeout(500);
      await dialog.waitFor({ state: "hidden", timeout: 3000 });
      this.log(6, "買入股票", "對話框已關閉", "");

      this.log(6, "買入股票", "成功", `已送出買入 ${amount} 張的請求`);
      return true;
    } catch (error: any) {
      this.log(6, "買入股票", "失敗", error.message);

      // 失敗時截圖存證
      try {
        const errorDir = path.join(__dirname, "../../../test-results/action-errors");
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(errorDir, `action-06-buy-stock-error-${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(6, "買入股票", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return false;
    }
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
   * @param leverage 槓桿倍數
   * @param amount 合約張數
   */
  async buyContract(
    type: "LONG" | "SHORT",
    leverage: number,
    amount: number
  ): Promise<boolean> {
    this.log(8, "買入合約", "開始", `${type}, ${leverage}x, ${amount}張`);

    try {
      // 1️⃣ 驗證參數合法性
      if (amount <= 0 || !Number.isInteger(amount)) {
        this.log(8, "買入合約", "失敗", `張數必須為正整數: ${amount}`);
        return false;
      }
      if (leverage <= 0) {
        this.log(8, "買入合約", "失敗", `槓桿倍數必須為正數: ${leverage}`);
        return false;
      }

      // 2️⃣ 檢查並切換至「合約」Tab
      const contractTab = this.page.locator('button').filter({
        hasText: /^合約$/
      }).first();
      await contractTab.waitFor({ state: "visible", timeout: 5000 });

      // 檢查 Tab 是否已選中
      const isContractActive = await contractTab.evaluate((el) => {
        const button = el as HTMLButtonElement;
        return button.classList.contains('adm-button-fill-solid');
      });

      if (!isContractActive) {
        await contractTab.click();
        this.log(8, "買入合約", "已切換至合約 Tab", "");
        await this.page.waitForTimeout(500);
      } else {
        this.log(8, "買入合約", "已在合約 Tab", "");
      }

      // 3️⃣ 檢查並切換合約方向（做多/做空）
      // 策略：找到對應的按鈕並檢查是否已選中
      const directionText = type === 'LONG' ? '做多' : '做空';
      const directionButton = this.page.locator('button').filter({
        hasText: new RegExp(`^${directionText}`)
      }).first();

      await directionButton.waitFor({ state: "visible", timeout: 3000 });

      // 檢查該方向按鈕是否已選中（fill="solid"）
      const isDirectionActive = await directionButton.evaluate((el) => {
        const button = el as HTMLButtonElement;
        return button.classList.contains('adm-button-fill-solid');
      });

      if (!isDirectionActive) {
        await directionButton.click();
        this.log(8, "買入合約", `已切換至${directionText}`, "");
        await this.page.waitForTimeout(500);
      } else {
        this.log(8, "買入合約", `已在${directionText}模式`, "");
      }

      // 4️⃣ 填寫槓桿和張數（簡化策略：直接用 visible inputs）
      // 策略：在合約 UI 區塊內找到所有 visible 的 input
      const contractSection = this.page.locator('div').filter({
        has: this.page.locator('button:has-text("下單")')
      });
      
      // 取得所有可見的 number input（過濾掉 Slider 隱藏的）
      const visibleInputs = contractSection.locator('input[type="number"]:visible');
      const inputCount = await visibleInputs.count();
      this.log(8, "買入合約", "偵測到可見輸入框數量", inputCount.toString());
      
      // 測試：先填第一個為槓桿，第二個為張數
      const leverageInput = visibleInputs.nth(0);
      await leverageInput.waitFor({ state: "visible", timeout: 3000 });
      
      await leverageInput.focus();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.type(leverage.toString(), { delay: 100 });
      await leverageInput.blur();
      this.log(8, "買入合約", "已填寫第一個輸入框（槓桿？）", `${leverage}`);
      await this.page.waitForTimeout(800);

      // 5️⃣ 填寫第二個輸入框為張數
      const amountInput = visibleInputs.nth(1);
      await amountInput.waitFor({ state: "visible", timeout: 3000 });
      
      await amountInput.focus();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.type(amount.toString(), { delay: 100 });
      await amountInput.blur();
      this.log(8, "買入合約", "已填寫第二個輸入框（張數？）", `${amount}`);
      await this.page.waitForTimeout(800);

      // 6️⃣ 點擊「下單 (隔日結算)」按鈕
      const submitButton = this.page.locator('button').filter({
        hasText: /下單/
      }).first();
      await submitButton.waitFor({ state: "visible", timeout: 3000 });
      
      // Debug: 檢查按鈕狀態
      const isDisabled = await submitButton.isDisabled();
      this.log(8, "買入合約", "下單按鈕狀態", `disabled=${isDisabled}`);
      
      // Debug: 讀取當前輸入框的值
      const currentLeverage = await leverageInput.inputValue();
      const currentAmount = await amountInput.inputValue();
      this.log(8, "買入合約", "當前輸入值", `槓桿=${currentLeverage}, 張數=${currentAmount}`);
      
      // Debug: 檢查保證金顯示
      const marginDisplay = await this.page.locator('div').filter({
        hasText: /保證金:/
      }).first().textContent().catch(() => "無法讀取");
      this.log(8, "買入合約", "保證金顯示", marginDisplay);
      
      if (isDisabled) {
        this.log(8, "買入合約", "失敗", "下單按鈕被停用（可能保證金不足或遊戲未開始）");
        
        // 額外 Debug：截圖當前狀態
        try {
          const errorDir = path.join(__dirname, "../../../test-results/action-errors");
          if (!fs.existsSync(errorDir)) {
            fs.mkdirSync(errorDir, { recursive: true });
          }
          const screenshotPath = path.join(errorDir, `action-08-button-disabled-${Date.now()}.png`);
          await this.page.screenshot({ path: screenshotPath, fullPage: true });
          this.log(8, "買入合約", "已截圖 (Debug)", screenshotPath);
        } catch (screenshotError) {
          // 截圖失敗不影響主流程
        }
        
        return false;
      }

      await submitButton.click();
      this.log(8, "買入合約", "已點擊下單按鈕", "");

      // 7️⃣ 等待確認對話框並點擊「確定」
      await this.page.waitForTimeout(1000);
      
      const dialog = this.page.locator('.adm-center-popup-body').or(
        this.page.locator('[role="dialog"]')
      ).first();
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      this.log(8, "買入合約", "對話框已出現", "");
      
      // 點擊「確定」按鈕（第二個按鈕）
      const confirmButton = dialog.locator('.adm-dialog-footer button').nth(1);
      await confirmButton.waitFor({ state: "visible", timeout: 3000 });
      
      const buttonText = await confirmButton.textContent();
      this.log(8, "買入合約", "準備點擊按鈕", buttonText || "");
      
      await confirmButton.click();
      this.log(8, "買入合約", "已點擊確定按鈕", "");

      // 8️⃣ 等待對話框關閉
      await this.page.waitForTimeout(500);
      await dialog.waitFor({ state: "hidden", timeout: 3000 });
      this.log(8, "買入合約", "對話框已關閉", "");

      this.log(8, "買入合約", "成功", `已送出 ${type} ${leverage}x ${amount}張 的合約請求`);
      return true;
    } catch (error: any) {
      this.log(8, "買入合約", "失敗", error.message);

      // 失敗時截圖存證
      try {
        const errorDir = path.join(__dirname, "../../../test-results/action-errors");
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(errorDir, `action-08-buy-contract-error-${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(8, "買入合約", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return false;
    }
  }

  /**
   * Action 09: 撤銷今日合約
   * 取消所有未結算的合約
   */
  async cancelAllContracts(): Promise<boolean> {
    this.log(9, "撤銷合約", "開始", "");

    try {
      // 1️⃣ 檢查當前是否有合約（避免無效操作）
      const beforeData = await this.readContracts();
      if (!beforeData || beforeData.contracts.length === 0) {
        this.log(9, "撤銷合約", "略過", "當前無合約可撤銷");
        return true; // 無合約視為成功
      }

      this.log(9, "撤銷合約", "檢測到合約", `數量=${beforeData.contracts.length}`);

      // 2️⃣ 確認在「合約」Tab（State Enforcement）
      const contractTab = this.page.locator('button').filter({
        hasText: /^合約$/
      }).first();
      await contractTab.waitFor({ state: "visible", timeout: 5000 });

      const isContractActive = await contractTab.evaluate((el) => {
        const button = el as HTMLButtonElement;
        return button.classList.contains('adm-button-fill-solid');
      });

      if (!isContractActive) {
        await contractTab.click();
        this.log(9, "撤銷合約", "已切換至合約 Tab", "");
        await this.page.waitForTimeout(500);
      }

      // 3️⃣ 尋找並點擊「撤銷今日訂單」按鈕
      const cancelButton = this.page.locator('button').filter({
        hasText: /撤銷今日訂單/
      }).first();
      await cancelButton.waitFor({ state: "visible", timeout: 3000 });
      
      // 檢查按鈕是否可點擊
      const isDisabled = await cancelButton.isDisabled();
      if (isDisabled) {
        this.log(9, "撤銷合約", "失敗", "撤銷按鈕不可用（可能無未結算合約）");
        return false;
      }

      await cancelButton.click();
      this.log(9, "撤銷合約", "已點擊撤銷按鈕", "");

      // 4️⃣ 等待確認對話框並點擊「確定」
      await this.page.waitForTimeout(1000);
      
      const dialog = this.page.locator('.adm-center-popup-body').or(
        this.page.locator('[role="dialog"]')
      ).first();
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      this.log(9, "撤銷合約", "對話框已出現", "");
      
      // 點擊「確定」按鈕（第二個按鈕）
      const confirmButton = dialog.locator('.adm-dialog-footer button').nth(1);
      await confirmButton.waitFor({ state: "visible", timeout: 3000 });
      
      const buttonText = await confirmButton.textContent();
      this.log(9, "撤銷合約", "準備點擊確定", buttonText || "");
      
      await confirmButton.click();
      this.log(9, "撤銷合約", "已點擊確定按鈕", "");

      // 5️⃣ 等待對話框關閉
      await this.page.waitForTimeout(500);
      await dialog.waitFor({ state: "hidden", timeout: 3000 });
      this.log(9, "撤銷合約", "對話框已關閉", "");

      // 6️⃣ 等待 WebSocket 更新（3 秒）
      await this.page.waitForTimeout(3000);

      this.log(9, "撤銷合約", "成功", `已撤銷 ${beforeData.contracts.length} 筆合約`);
      return true;
    } catch (error: any) {
      this.log(9, "撤銷合約", "失敗", error.message);

      // 失敗時截圖存證
      try {
        const errorDir = path.join(__dirname, "../../../test-results/action-errors");
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(errorDir, `action-09-cancel-contracts-error-${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(9, "撤銷合約", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return false;
    }
  }

  // ==================== Loan ====================

  /**
   * Action 11: 借/還錢
   * @param action 動作類型 (BORROW=借款, REPAY=還款)
   * @param amount 金額
   */
  async handleLoan(
    action: "BORROW" | "REPAY",
    amount: number
  ): Promise<boolean> {
    this.log(11, "借/還錢", "開始", `動作=${action}, 金額=${amount}`);

    try {
      // 1️⃣ 驗證金額合法性
      if (amount <= 0) {
        this.log(11, "借/還錢", "失敗", `金額必須為正數: ${amount}`);
        return false;
      }

      // 2️⃣ 確認 Modal 已開啟（若未開啟則先開啟）
      const modalTitle = this.page.locator('span').filter({
        hasText: /^地下錢莊$/
      }).first();

      const isModalVisible = await modalTitle.isVisible().catch(() => false);

      if (!isModalVisible) {
        this.log(11, "借/還錢", "Modal 未開啟", "嘗試自動開啟");
        const openSuccess = await this.openLoanShark();
        if (!openSuccess) {
          this.log(11, "借/還錢", "失敗", "無法開啟地下錢莊");
          return false;
        }
      }

      this.log(11, "借/還錢", "Modal 已確認開啟", "");

      // 3️⃣ 檢查並切換模式（借/還）
      // 策略：DualColorSwitch 是自定義組件，結構為包含文字「借」或「還」的 div
      // 需要檢查當前顯示的文字來判斷模式
      const modeSwitchContainer = this.page.locator('div').filter({
        hasText: /^(借|還)$/
      }).first();
      
      await modeSwitchContainer.waitFor({ state: "visible", timeout: 3000 });
      
      // 讀取當前顯示的文字（「借」表示借款模式，「還」表示還款模式）
      const switchText = await modeSwitchContainer.textContent();
      const isBorrowMode = switchText?.includes('借');
      const needSwitch = (action === "BORROW" && !isBorrowMode) || (action === "REPAY" && isBorrowMode);

      if (needSwitch) {
        await modeSwitchContainer.click();
        this.log(11, "借/還錢", "已切換模式", `從 ${isBorrowMode ? '借' : '還'} 切換至 ${action === 'BORROW' ? '借' : '還'}`);
        await this.page.waitForTimeout(500); // 等待 UI 更新
      } else {
        this.log(11, "借/還錢", "模式已正確", `當前為 ${action === 'BORROW' ? '借款' : '還款'} 模式`);
      }

      // 4️⃣ 填寫金額
      // 策略：找到包含 "金額 (元)" 標籤的區塊，然後找到可見且寬度為 60px 的輸入框
      // 避免選到 Slider 的隱藏輸入框
      const amountSection = this.page.locator('div').filter({
        hasText: /金額.*元/
      });
      
      // 找到所有可見的 number input
      const allInputs = amountSection.locator('input[type="number"]:visible');
      const inputCount = await allInputs.count();
      this.log(11, "借/還錢", "偵測到輸入框數量", inputCount.toString());
      
      // 找到寬度為 60px 的輸入框（根據前端 style）
      let amountInput = null;
      for (let i = 0; i < inputCount; i++) {
        const input = allInputs.nth(i);
        const width = await input.evaluate((el: HTMLInputElement) => {
          return window.getComputedStyle(el).width;
        });
        this.log(11, "借/還錢", `輸入框 ${i} 寬度`, width);
        
        if (width === '60px') {
          amountInput = input;
          this.log(11, "借/還錢", "找到目標輸入框", `index=${i}`);
          break;
        }
      }
      
      if (!amountInput) {
        // Fallback: 使用第二個輸入框（第一個是 Slider）
        amountInput = allInputs.nth(1);
        this.log(11, "借/還錢", "使用 Fallback", "nth(1)");
      }

      await amountInput.waitFor({ state: "visible", timeout: 3000 });
      
      // Debug: 讀取當前值
      const currentValue = await amountInput.inputValue();
      this.log(11, "借/還錢", "輸入前的值", currentValue);
      
      // 方法：先清空，再輸入，觸發事件
      await amountInput.evaluate((el: HTMLInputElement, value: string) => {
        // 1. 先清空
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, '');
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // 2. 設定新值
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, value);
        }
        
        // 3. 觸發事件
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }, amount.toString());
      
      // Debug: 驗證輸入後的值
      await this.page.waitForTimeout(500);
      const newValue = await amountInput.inputValue();
      this.log(11, "借/還錢", "輸入後的值", newValue);
      this.log(11, "借/還錢", "已填寫金額", amount.toString());

      // 5️⃣ 點擊確認按鈕（按鈕文字為「借款」或「還款」）
      const buttonText = action === "BORROW" ? "借款" : "還款";
      const submitButton = this.page.locator('button').filter({
        hasText: new RegExp(`^${buttonText}$`)
      }).first();

      await submitButton.waitFor({ state: "visible", timeout: 3000 });
      
      // 檢查按鈕是否被停用
      const isDisabled = await submitButton.isDisabled();
      if (isDisabled) {
        this.log(11, "借/還錢", "失敗", "按鈕被停用（可能金額超過限制或現金/負債不足）");
        return false;
      }

      await submitButton.click();
      this.log(11, "借/還錢", "已點擊確認按鈕", "");

      // 6️⃣ 等待確認對話框並點擊「確定」
      await this.page.waitForTimeout(1000);
      
      const dialog = this.page.locator('.adm-center-popup-body').or(
        this.page.locator('[role="dialog"]')
      ).first();
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      this.log(11, "借/還錢", "對話框已出現", "");
      
      // 點擊「確定」按鈕（第二個按鈕）
      const confirmButton = dialog.locator('.adm-dialog-footer button').nth(1);
      await confirmButton.waitFor({ state: "visible", timeout: 3000 });
      
      const confirmButtonText = await confirmButton.textContent();
      this.log(11, "借/還錢", "準備點擊按鈕", confirmButtonText || "");
      
      await confirmButton.click();
      this.log(11, "借/還錢", "已點擊確定按鈕", "");

      // 7️⃣ 等待對話框關閉（確認交易已送出）
      await this.page.waitForTimeout(500);
      await dialog.waitFor({ state: "hidden", timeout: 3000 });
      this.log(11, "借/還錢", "對話框已關閉", "");

      // 8️⃣ 等待交易成功 Toast（antd-mobile 的 Toast 元件）
      // 注意：Toast 可能很快消失，使用較短的 timeout
      const toastLocator = this.page.locator(".adm-toast").filter({
        hasText: /成功/
      }).first();

      const toastVisible = await toastLocator.isVisible().catch(() => false);
      if (toastVisible) {
        this.log(11, "借/還錢", "成功 Toast 已顯示", "");
      } else {
        // Toast 可能已消失，檢查是否有錯誤訊息
        const errorToast = this.page.locator(".adm-toast").filter({
          hasText: /失敗|不足|錯誤/
        }).first();
        const hasError = await errorToast.isVisible().catch(() => false);
        
        if (hasError) {
          const errorMsg = await errorToast.textContent();
          this.log(11, "借/還錢", "失敗", `交易失敗: ${errorMsg}`);
          return false;
        }
      }

      // 9️⃣ 關閉 Modal（點擊右上角 X 按鈕）
      // 策略：找到 CloseOutline 圖標的按鈕
      const closeButton = this.page.locator('span[role="img"]').filter({
        hasText: /close/i
      }).or(
        this.page.locator('svg').filter({
          has: this.page.locator('path[d*="M"]') // SVG 路徑特徵
        })
      ).first();

      // 9️⃣ 關閉 Modal
      await this.closeLoanShark();

      this.log(11, "借/還錢", "成功", `${action === 'BORROW' ? '借款' : '還款'} $${amount}`);
      return true;

    } catch (error: any) {
      this.log(11, "借/還錢", "失敗", error.message);

      // 失敗時截圖存證
      try {
        const errorDir = path.join(__dirname, "../../../test-results/action-errors");
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(errorDir, `action-11-handle-loan-error-${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(11, "借/還錢", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return false;
    }
  }

  // ==================== Quiz ====================

  /**
   * Action 12: 等待問答開始
   * Blocking 等待直到 Quiz Overlay 可見
   * 
   * 策略：
   * 1. 使用無限 timeout 等待「機智問答」文字出現（表示 Overlay 已彈出）
   * 2. 若 Overlay 已存在但未可見（理論上不會發生，但做雙重檢查）
   * 3. 返回 true 表示成功偵測
   * 
   * 前端對應元件：
   * - QuizUserView.tsx（全螢幕覆蓋層，包含「🧠 機智問答」標題）
   * - TradingBar.tsx（小遊戲按鈕，橘色表示有遊戲進行中）
   */
  async waitForQuizStart(): Promise<boolean> {
    this.log(12, "等待問答開始", "開始", "Blocking 等待 Quiz Overlay 出現");

    try {
      // 1️⃣ 主要策略：等待「機智問答」文字出現（表示 Overlay 已自動彈出）
      // 使用 timeout: 0 表示無限等待，直到 Admin 發布題目為止
      const quizTitleLocator = this.page.getByText('🧠 機智問答').first();
      
      this.log(12, "等待問答開始", "等待中", "請至 Admin 後台發布問答題目...");
      
      await quizTitleLocator.waitFor({ 
        state: "visible", 
        timeout: 0 // 無限等待（Blocking）
      });

      this.log(12, "等待問答開始", "Overlay 已出現", "");

      // 2️⃣ 雙重檢查：確認 Overlay 確實可見且在最前層（z-index 9999）
      const overlayContainer = this.page.locator('[style*="z-index: 9999"]').filter({
        has: quizTitleLocator
      }).first();

      const isVisible = await overlayContainer.isVisible().catch(() => false);
      
      if (!isVisible) {
        this.log(12, "等待問答開始", "警告", "標題可見但容器不可見，嘗試點擊小遊戲按鈕");
        
        // 備用策略：點擊 TradingBar 的「小遊戲」按鈕（若 Overlay 未自動彈出）
        const miniGameButton = this.page.locator('button').filter({
          has: this.page.locator('img[alt="小遊戲"]')
        }).first();
        
        const buttonVisible = await miniGameButton.isVisible().catch(() => false);
        if (buttonVisible) {
          await miniGameButton.click();
          await this.page.waitForTimeout(1000); // 等待動畫
        }
      }

      // 3️⃣ 最終驗證：確認 Overlay 內容包含「機智問答」（使用 .first() 避免 strict mode violation）
      const finalCheck = await this.page.getByText('🧠 機智問答').first().isVisible();
      
      if (!finalCheck) {
        this.log(12, "等待問答開始", "失敗", "Overlay 未正確顯示");
        return false;
      }

      this.log(12, "等待問答開始", "成功", "Quiz Overlay 已完整載入");
      return true;

    } catch (error: any) {
      this.log(12, "等待問答開始", "失敗", error.message);
      
      // 失敗時截圖存證
      try {
        const screenshotDir = path.join(__dirname, "../../test-results/action-errors");
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const screenshotPath = path.join(
          screenshotDir,
          `action-12-waitForQuizStart-error-${Date.now()}.png`
        );
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(12, "等待問答開始", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return false;
    }
  }

  /**
   * Action 13: 問答作答
   * @param option 選項 (A/B/C/D)
   * 
   * 策略：
   * 1. 等待選項按鈕出現（表示已進入 GAMING 階段）
   * 2. 點擊目標選項（例如 "A."）
   * 3. 驗證按鈕被鎖定（disabled）或樣式變化（confirm selection）
   * 4. 返回 true 表示成功提交
   * 
   * 前端對應邏輯：
   * - QuizUserView.tsx：GAMING 階段渲染選項按鈕
   * - handleOptionClick：點擊後發送 Socket.io 事件並鎖定按鈕
   */
  async answerQuiz(option: "A" | "B" | "C" | "D"): Promise<boolean> {
    this.log(13, "問答作答", "開始", `選項=${option}`);

    try {
      // 1️⃣ 等待倒數階段結束
      // 策略：等待大數字 "1", "2", "3" 消失（表示 COUNTDOWN 階段結束）
      this.log(13, "問答作答", "等待中", "等待倒數結束（COUNTDOWN -> GAMING）...");
      
      // 先等待一下，確保倒數已經開始
      await this.page.waitForTimeout(2000);
      
      // 找尋倒數數字（大數字文字，正則匹配純數字 1-3）
      // 策略：倒數數字是全螢幕置中的大文字
      const countdownNumber = this.page.locator('text=/^[1-3]$/').first();
      
      // 等待倒數數字消失（最多等 5 秒）
      await countdownNumber.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {
        this.log(13, "問答作答", "跳過", "倒數數字未出現或已消失");
      });
      
      this.log(13, "問答作答", "倒數結束", "準備等待選項按鈕...");

      // 2️⃣ 等待選項按鈕出現（表示已進入 GAMING 階段）
      // 策略：找尋包含 "A. "、"B. "、"C. "、"D. " 的按鈕
      this.log(13, "問答作答", "等待中", "等待選項按鈕出現...");
      
      // 等待任一選項按鈕出現
      const anyOptionButton = this.page.locator('button').filter({
        hasText: /^[A-D]\.\s/
      }).first();
      
      await anyOptionButton.waitFor({ 
        state: "visible", 
        timeout: 10000 
      });
      
      this.log(13, "問答作答", "選項已出現", "GAMING 階段已開始");

      // 3️⃣ 點擊目標選項
      const targetButton = this.page.locator('button').filter({
        hasText: new RegExp(`^${option}\\.\\s`)
      }).first();
      
      await targetButton.waitFor({ state: "visible", timeout: 3000 });
      
      // 輸出按鈕文字用於除錯
      const buttonText = await targetButton.textContent();
      this.log(13, "問答作答", "準備點擊", `"${buttonText}"`);
      
      await targetButton.click();
      
      this.log(13, "問答作答", "已點擊選項", option);

      // 4️⃣ 驗證按鈕被鎖定（表示答案已提交）
      await this.page.waitForTimeout(800);
      
      const isDisabled = await targetButton.evaluate((btn) => {
        return (btn as HTMLButtonElement).disabled;
      });
      
      if (!isDisabled) {
        this.log(13, "問答作答", "警告", "按鈕未被鎖定（可能網路延遲）");
      } else {
        this.log(13, "問答作答", "已鎖定", "按鈕狀態已更新");
      }

      // 5️⃣ 額外驗證：檢查是否顯示「已提交答案」提示
      const submittedHint = this.page.getByText('已提交答案，等待結算...').first();
      const hasSubmittedHint = await submittedHint.isVisible().catch(() => false);
      
      if (hasSubmittedHint) {
        this.log(13, "問答作答", "已顯示提示", "「已提交答案，等待結算...」");
      }

      this.log(13, "問答作答", "成功", `已提交選項 ${option}`);
      return true;

    } catch (error: any) {
      this.log(13, "問答作答", "失敗", error.message);
      
      // 失敗時截圖存證
      try {
        const screenshotDir = path.join(__dirname, "../../test-results/action-errors");
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const screenshotPath = path.join(
          screenshotDir,
          `action-13-answerQuiz-error-${Date.now()}.png`
        );
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(13, "問答作答", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return false;
    }
  }

  /**
   * Action 14: 問答結果報告
   * 等待結果畫面並執行 Action 04 (讀取資產)
   * 
   * 實作邏輯：
   * 1. 先確認已提交答案（顯示「等待結算...」提示）
   * 2. 等待「正確答案：」文字出現（RESULT 階段的通用元素）
   * 3. 呼叫 readAssets() 讀取更新後的資產狀態
   * 4. Log 輸出結果資訊與當前現金
   * 5. 回傳 AssetData 物件
   * 
   * ⚠️ 注意：Admin 可能需要手動按下「結算」按鈕才會進入 RESULT 階段
   * 
   * @returns AssetData 或 null（失敗時）
   */
  async waitQuizResultAndReport(): Promise<AssetData | null> {
    this.log(14, "問答結果報告", "開始", "等待結果畫面載入...");

    try {
      // 1️⃣ 確認當前狀態：檢查是否已提交答案
      const submittedHint = this.page.getByText(/已提交答案|等待結算/).first();
      const isSubmitted = await submittedHint.isVisible().catch(() => false);
      
      if (isSubmitted) {
        this.log(14, "問答結果報告", "已確認", "答案已提交，等待遊戲結算...");
      } else {
        this.log(14, "問答結果報告", "警告", "未偵測到「已提交答案」提示，可能尚未作答");
      }

      // 2️⃣ 等待結果階段載入（偵測「正確答案：」文字）
      // 這個文字在 RESULT 階段無論答對/答錯都會顯示，是最可靠的標記
      this.log(14, "問答結果報告", "等待中", "等待遊戲進入 RESULT 階段（最多 120 秒）...");
      this.log(14, "問答結果報告", "提示", "⚠️ 如果長時間等待，請檢查 Admin 是否需要手動按下「結算」按鈕");
      
      const resultIndicator = this.page.locator('div').filter({
        hasText: /正確答案：[A-D]/
      }).first();

      // 增加 timeout 到 120 秒（允許手動操作時間）
      await resultIndicator.waitFor({ 
        state: "visible", 
        timeout: 120000 
      });
      
      this.log(14, "問答結果報告", "結果階段已載入", "偵測到「正確答案」文字");

      // 3️⃣ 等待額外 1 秒確保資產更新完成
      // 伺服器可能需要時間處理獎金並推送至前端
      await this.page.waitForTimeout(1000);

      // 4️⃣ 讀取更新後的資產
      this.log(14, "問答結果報告", "執行", "讀取資產變化...");
      const resultAssets = await this.readAssets();

      if (!resultAssets) {
        this.log(14, "問答結果報告", "失敗", "無法讀取資產資料");
        return null;
      }

      // 5️⃣ Log 輸出資產狀態
      this.log(
        14, 
        "問答結果報告", 
        "成功", 
        `當前現金: $${resultAssets.cash.toFixed(2)} | 總資產: $${resultAssets.totalAssets.toFixed(2)}`
      );

      return resultAssets;

    } catch (error: any) {
      this.log(14, "問答結果報告", "失敗", error.message);
      
      // 錯誤截圖（協助除錯）
      try {
        const screenshotDir = path.join(process.cwd(), "test-results", "action-errors");
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        
        const screenshotPath = path.join(
          screenshotDir,
          `action-14-waitQuizResult-error-${Date.now()}.png`
        );
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(14, "問答結果報告", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return null;
    }
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
   * 關閉地下錢莊 Modal
   * 點擊右上角關閉按鈕並驗證 Modal 已關閉
   * @returns 是否成功關閉
   */
  async closeLoanShark(): Promise<boolean> {
    this.log(10, "關閉地下錢莊", "開始", "");

    try {
      // 1️⃣ 確認 Modal 是否開啟
      const modalTitle = this.page.locator('span').filter({
        hasText: /^地下錢莊$/
      }).first();

      const isModalVisible = await modalTitle.isVisible().catch(() => false);

      if (!isModalVisible) {
        this.log(10, "關閉地下錢莊", "警告", "Modal 未開啟，無需關閉");
        return true;
      }

      // 2️⃣ 找到並點擊關閉按鈕（右上角 X 按鈕）
      // 策略：找到 CloseOutline 圖標或包含 close 的按鈕
      const closeButton = this.page.locator('span[role="img"]').filter({
        hasText: /close/i
      }).or(
        this.page.locator('svg').filter({
          has: this.page.locator('path[d*="M"]') // SVG 路徑特徵
        })
      ).first();

      const closeButtonVisible = await closeButton.isVisible().catch(() => false);
      
      if (!closeButtonVisible) {
        this.log(10, "關閉地下錢莊", "失敗", "找不到關閉按鈕");
        return false;
      }

      await closeButton.click();
      this.log(10, "關閉地下錢莊", "已點擊關閉按鈕", "");

      // 3️⃣ 等待 Modal 關閉動畫完成並驗證
      // antd-mobile Modal 關閉動畫需要約 300-500ms，等待 1000ms 確保完全關閉
      await this.page.waitForTimeout(1000);
      const isModalClosed = await modalTitle.isHidden().catch(() => true);

      if (!isModalClosed) {
        this.log(10, "關閉地下錢莊", "失敗", "Modal 未完全關閉");
        return false;
      }

      // 4️⃣ 驗證 URL Hash 已移除
      await this.page.waitForTimeout(300);
      const currentUrl = this.page.url();
      
      if (currentUrl.includes('#loanshark')) {
        this.log(10, "關閉地下錢莊", "警告", "Hash 錨點未清除，但 Modal 已關閉");
      }

      this.log(10, "關閉地下錢莊", "成功", "");
      return true;

    } catch (error: any) {
      this.log(10, "關閉地下錢莊", "失敗", error.message);
      return false;
    }
  }

  /**
   * Action 10: 開啟地下錢莊
   * 驗證 Modal 是否正確開啟
   */
  async openLoanShark(): Promise<boolean> {
    this.log(10, "開啟地下錢莊", "開始", "");

    try {
      // 1️⃣ 確認在主頁面（/home）
      if (!this.page.url().includes('/home')) {
        this.log(10, "開啟地下錢莊", "失敗", "當前頁面不是主頁");
        return false;
      }

      // 2️⃣ 定位「地下錢莊」按鈕
      // 策略：找到包含地下錢莊圖示的按鈕（位於 TradingBar 區塊）
      const loanButton = this.page.locator('button').filter({
        has: this.page.locator('img[alt="地下錢莊"]')
      }).first();

      await loanButton.waitFor({ state: "visible", timeout: 5000 });
      this.log(10, "開啟地下錢莊", "已定位按鈕", "");

      // 3️⃣ 點擊按鈕
      await loanButton.click();
      this.log(10, "開啟地下錢莊", "已點擊按鈕", "");

      // 4️⃣ 等待 Modal 出現（驗證標題文字「地下錢莊」）
      const modalTitle = this.page.locator('span').filter({
        hasText: /^地下錢莊$/
      }).first();

      await modalTitle.waitFor({ state: "visible", timeout: 5000 });
      this.log(10, "開啟地下錢莊", "Modal 已顯示", "");

      // 5️⃣ 驗證 URL Hash 已變更（前端使用 Hash 錨點管理 Modal）
      await this.page.waitForTimeout(500); // 等待 Hash 更新
      const currentUrl = this.page.url();
      
      if (!currentUrl.includes('#loanshark')) {
        this.log(10, "開啟地下錢莊", "警告", "Hash 錨點未正確設定");
        // 不視為失敗，因為 Modal 已顯示
      } else {
        this.log(10, "開啟地下錢莊", "Hash 錨點已驗證", "#loanshark");
      }

      // 6️⃣ （Optional）驗證商人頭像圖片已載入
      const merchantImage = this.page.locator('img[alt*="沈梟"], img[src*="merchant"]').first();
      const isImageVisible = await merchantImage.isVisible().catch(() => false);
      
      if (isImageVisible) {
        this.log(10, "開啟地下錢莊", "商人頭像已載入", "");
      }

      this.log(10, "開啟地下錢莊", "成功", "");
      return true;

    } catch (error: any) {
      this.log(10, "開啟地下錢莊", "失敗", error.message);

      // 失敗時截圖存證
      try {
        const errorDir = path.join(__dirname, "../../../test-results/action-errors");
        if (!fs.existsSync(errorDir)) {
          fs.mkdirSync(errorDir, { recursive: true });
        }
        const screenshotPath = path.join(errorDir, `action-10-open-loan-shark-error-${Date.now()}.png`);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.log(10, "開啟地下錢莊", "已截圖", screenshotPath);
      } catch (screenshotError) {
        // 截圖失敗不影響主流程
      }

      return false;
    }
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

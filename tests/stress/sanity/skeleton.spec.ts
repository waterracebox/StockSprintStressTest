// tests/stress/sanity/skeleton.spec.ts
import { test, expect } from "@playwright/test";
import { GameActions } from "../core/GameActions";

/**
 * 骨架驗證測試
 * 目的：確認 GameActions 類別可以正常實例化且方法可被呼叫
 */
test("GameActions 實例化與方法呼叫測試", async ({ page }) => {
  // 實例化 GameActions（使用者編號 99 作為測試用）
  const actions = new GameActions(page, 99);

  // 驗證物件已成功建立
  expect(actions).toBeDefined();

  // 呼叫一個 Stub 方法（應回傳 null 而不報錯）
  const assets = await actions.readAssets();
  expect(assets).toBeNull();

  // 呼叫另一個 Stub 方法（應回傳 false）
  const loginResult = await actions.login("testuser", "testpass");
  expect(loginResult).toBe(false);

  console.log("✅ GameActions 骨架驗證通過");
});

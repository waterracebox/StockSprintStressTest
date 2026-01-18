/**
 * 配置檔驗證腳本
 * 
 * 用途：確認 config.ts 能正確匯入，且 JSON 檔案能正常讀取
 * 執行：npx ts-node tests/stress/check_config.ts
 */

import { TOTAL_USERS, TEST_END_DAY, HEADLESS, USER_DISTRIBUTION, validateConfig } from './config';
import * as fs from 'fs';
import * as path from 'path';

console.log('🔍 開始驗證壓力測試配置...\n');

// ==================== 1. 驗證 config.ts 匯入 ====================
console.log('📋 全域配置參數：');
console.log(`   TOTAL_USERS: ${TOTAL_USERS}`);
console.log(`   TEST_END_DAY: ${TEST_END_DAY}`);
console.log(`   HEADLESS: ${HEADLESS}`);
console.log(`   USER_DISTRIBUTION:`, USER_DISTRIBUTION);
console.log('');

// ==================== 2. 驗證角色分配總數 ====================
try {
  validateConfig();
} catch (error) {
  console.error(error);
  process.exit(1);
}
console.log('');

// ==================== 3. 驗證 JSON 檔案 ====================
const dataDir = path.join(__dirname, '../../data');

// 3.1 檢查 users.json
const usersPath = path.join(dataDir, 'users.json');
try {
  const usersData = fs.readFileSync(usersPath, 'utf-8');
  const users = JSON.parse(usersData);
  console.log(`✅ users.json 讀取成功：`);
  console.log(`   路徑: ${usersPath}`);
  console.log(`   內容: ${JSON.stringify(users)}`);
  console.log(`   類型: ${Array.isArray(users) ? 'Array' : typeof users}`);
} catch (error: any) {
  console.error(`❌ users.json 讀取失敗：${error.message}`);
  process.exit(1);
}
console.log('');

// 3.2 檢查 user-strategies.json
const strategiesPath = path.join(dataDir, 'user-strategies.json');
try {
  const strategiesData = fs.readFileSync(strategiesPath, 'utf-8');
  const strategies = JSON.parse(strategiesData);
  console.log(`✅ user-strategies.json 讀取成功：`);
  console.log(`   路徑: ${strategiesPath}`);
  console.log(`   內容: ${JSON.stringify(strategies)}`);
  console.log(`   類型: ${typeof strategies}`);
} catch (error: any) {
  console.error(`❌ user-strategies.json 讀取失敗：${error.message}`);
  process.exit(1);
}
console.log('');

console.log('🎉 所有配置檔驗證通過！');
console.log('');
console.log('📌 後續步驟：');
console.log('   1. 執行 git add . && git commit -m "feat: 新增壓力測試配置檔與資料結構"');
console.log('   2. 繼續實作 S1.3: GameActions 骨架');

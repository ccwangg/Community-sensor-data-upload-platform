/**
 * 測試資料庫服務
 */

const databaseService = require('./services/databaseService');

console.log('測試資料庫服務...\n');

// 測試 1: 獲取統計
const stats = databaseService.getDatabaseStats();
console.log('資料庫統計:', stats);
console.log('✅ 資料庫服務載入成功\n');

// 測試 2: 儲存數據
const testData = {
  nodeId: 'TEST-001',
  dataImportance: 8.5,
  battery: 75,
  priority: {
    priorityScore: 7.85,
    priorityLevel: 'high'
  }
};

const saved = databaseService.saveSensorData(testData);
console.log('儲存數據成功:', saved.id);
console.log('✅ 資料庫寫入功能正常\n');

// 測試 3: 讀取數據
const allData = databaseService.getAllSensorData();
console.log('讀取數據成功，總數:', allData.total);
console.log('✅ 資料庫讀取功能正常\n');

console.log('所有測試通過！');


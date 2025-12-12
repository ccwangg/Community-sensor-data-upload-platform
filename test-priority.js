/**
 * 簡單的優先級引擎測試腳本
 */

const priorityEngine = require('./services/priorityEngine');
const uploadScheduler = require('./services/uploadScheduler');

console.log('🧪 測試優先級判定引擎\n');

// 測試案例 1: 高優先級數據（高重要性 + 低電量）
console.log('測試案例 1: 高優先級數據');
const highPriorityData = {
  nodeId: 'node-001',
  dataImportance: 9,
  battery: 15,  // 低電量
  networkStatus: 'good'
};

const priority1 = priorityEngine.calculatePriority(highPriorityData);
console.log('優先級分數:', priority1.priorityScore);
console.log('優先級等級:', priority1.priorityLevel);
console.log('詳細分析:', JSON.stringify(priority1.breakdown, null, 2));
console.log('');

// 測試案例 2: 中等優先級數據
console.log('測試案例 2: 中等優先級數據');
const mediumPriorityData = {
  nodeId: 'node-002',
  dataImportance: 5,
  battery: 60,
  networkStatus: 'fair'
};

const priority2 = priorityEngine.calculatePriority(mediumPriorityData);
console.log('優先級分數:', priority2.priorityScore);
console.log('優先級等級:', priority2.priorityLevel);
console.log('');

// 測試案例 3: 低優先級數據
console.log('測試案例 3: 低優先級數據');
const lowPriorityData = {
  nodeId: 'node-003',
  dataImportance: 2,
  battery: 90,  // 高電量
  networkStatus: 'excellent'
};

const priority3 = priorityEngine.calculatePriority(lowPriorityData);
console.log('優先級分數:', priority3.priorityScore);
console.log('優先級等級:', priority3.priorityLevel);
console.log('');

// 測試調度器
console.log('📦 測試上傳調度器\n');

const schedule1 = uploadScheduler.scheduleUpload({
  ...highPriorityData,
  priority: priority1
});
console.log('高優先級數據調度結果:', schedule1);
console.log('');

const schedule2 = uploadScheduler.scheduleUpload({
  ...mediumPriorityData,
  priority: priority2
});
console.log('中等優先級數據調度結果:', schedule2);
console.log('');

const schedule3 = uploadScheduler.scheduleUpload({
  ...lowPriorityData,
  priority: priority3
});
console.log('低優先級數據調度結果:', schedule3);
console.log('');

// 查看佇列狀態
const queueStatus = uploadScheduler.getQueueStatus();
console.log('📊 佇列狀態:');
console.log(JSON.stringify(queueStatus, null, 2));

console.log('\n✅ 測試完成！');


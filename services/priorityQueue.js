/**
 * 優先級佇列服務 (Priority Queue Service)
 * 
 * 實作真正的優先級佇列邏輯：
 * PriorityScore = W_imp × Importance + W_bat × (100 - Battery) + W_net × Network
 * 
 * 數據按 PriorityScore 降序排列，確保高優先級數據優先處理
 */

const databaseService = require('./databaseService');

// 權重配置
const WEIGHTS = {
  IMPORTANCE: 0.5,  // W_imp: 資料重要性權重
  BATTERY: 0.3,     // W_bat: 電量權重（電越少越急）
  NETWORK: 0.2      // W_net: 網路狀況權重
};

/**
 * 計算優先級分數（使用公式）
 * PriorityScore = W_imp × Importance + W_bat × (100 - Battery) + W_net × Network
 * 
 * @param {Object} sensorData - 感測器數據
 * @returns {number} 優先級分數
 */
function calculatePriorityScore(sensorData) {
  const { dataImportance, battery, networkStatus } = sensorData;
  
  // 正規化資料重要性 (0-10)
  const importance = Math.max(0, Math.min(10, dataImportance));
  
  // 電量轉換：電越少越急，所以用 (100 - Battery) / 10 轉換為 0-10 分數
  const batteryScore = (100 - Math.max(0, Math.min(100, battery))) / 10;
  
  // 網路狀況分數 (0-10)
  const networkScoreMap = {
    'excellent': 10,
    'good': 8,
    'fair': 5,
    'poor': 2,
    'critical': 0,
    'unknown': 5
  };
  const networkScore = networkScoreMap[networkStatus?.toLowerCase()] || 5;
  
  // 計算總分
  const priorityScore = 
    WEIGHTS.IMPORTANCE * importance +
    WEIGHTS.BATTERY * batteryScore +
    WEIGHTS.NETWORK * networkScore;
  
  return Math.round(priorityScore * 100) / 100; // 保留兩位小數
}

/**
 * 從優先級佇列中取出最高優先級的數據（消費者模式）
 * @returns {Object|null} 最高優先級的數據或 null
 */
function dequeue() {
  const allData = databaseService.getAllData();
  
  if (allData.length === 0) {
    return null;
  }
  
  // 資料庫中已按優先級排序，直接取第一個
  // 但為了確保，我們還是排序一次
  const sorted = allData.sort((a, b) => {
    const scoreA = a.priority?.priorityScore || 0;
    const scoreB = b.priority?.priorityScore || 0;
    return scoreB - scoreA; // 降序
  });
  
  return sorted[0];
}

/**
 * 獲取優先級佇列狀態
 */
function getQueueStatus() {
  const allData = databaseService.getAllData();
  
  // 按優先級分組統計
  const byLevel = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  
  let totalScore = 0;
  
  for (const data of allData) {
    const level = data.priority?.priorityLevel || 'low';
    const score = data.priority?.priorityScore || 0;
    
    if (level === 'critical') byLevel.critical++;
    else if (level === 'high') byLevel.high++;
    else if (level === 'medium') byLevel.medium++;
    else byLevel.low++;
    
    totalScore += score;
  }
  
  return {
    total: allData.length,
    byLevel,
    averageScore: allData.length > 0 ? totalScore / allData.length : 0,
    topPriority: allData.length > 0 ? (allData[0]?.priority?.priorityScore || 0) : 0
  };
}

module.exports = {
  calculatePriorityScore,
  dequeue,
  getQueueStatus,
  WEIGHTS
};


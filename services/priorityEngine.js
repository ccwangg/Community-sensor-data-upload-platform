/**
 * 優先級判定引擎 (Priority Engine)
 * 
 * 根據三個權重計算優先級分數：
 * - 資料重要性 (Data Importance) - 權重 0.5
 * - 節點狀態 (Battery) - 權重 0.3
 * - 網路狀況 (Network Status) - 權重 0.2
 */

// 網路狀況分數對照表
const NETWORK_STATUS_SCORE = {
  'excellent': 10,
  'good': 8,
  'fair': 5,
  'poor': 2,
  'critical': 0,
  'unknown': 5
};

// 優先級等級定義
const PRIORITY_LEVELS = {
  CRITICAL: { min: 8.0, max: 10.0, name: 'critical' },
  HIGH: { min: 6.0, max: 8.0, name: 'high' },
  MEDIUM: { min: 4.0, max: 6.0, name: 'medium' },
  LOW: { min: 0.0, max: 4.0, name: 'low' }
};

/**
 * 計算優先級分數
 * 
 * 公式：PriorityScore = W_imp × Importance + W_bat × (100 - Battery)/10 + W_net × Network
 * 
 * @param {Object} sensorData - 感測器數據
 * @param {number} sensorData.dataImportance - 資料重要性 (0-10)
 * @param {number} sensorData.battery - 電量 (0-100)
 * @param {string} sensorData.networkStatus - 網路狀態
 * @returns {Object} 優先級計算結果
 */
function calculatePriority(sensorData) {
  const { dataImportance, battery, networkStatus = 'unknown' } = sensorData;

  // 權重配置
  const W_imp = 0.5;  // 資料重要性權重
  const W_bat = 0.3;  // 電量權重（電越少越急）
  const W_net = 0.2;  // 網路狀況權重

  // 1. 資料重要性分數 (0-10) - 權重 0.5
  const importanceScore = Math.max(0, Math.min(10, dataImportance));
  const weightedImportance = importanceScore * W_imp;

  // 2. 節點狀態分數 (電量) - 權重 0.3
  // 公式：電越少越急，所以用 (100 - Battery) / 10 轉換為 0-10 分數
  const normalizedBattery = Math.max(0, Math.min(100, battery));
  const batteryScore = (100 - normalizedBattery) / 10; // 轉換為 0-10 範圍
  const weightedBattery = batteryScore * W_bat;

  // 3. 網路狀況分數 - 權重 0.2
  const networkKey = networkStatus.toLowerCase();
  const networkScore = NETWORK_STATUS_SCORE[networkKey] ?? NETWORK_STATUS_SCORE['unknown'];
  const weightedNetwork = networkScore * W_net;

  // 計算總分 (0-10)
  const totalScore = weightedImportance + weightedBattery + weightedNetwork;
  const roundedScore = Math.round(totalScore * 100) / 100;

  // 判斷優先級等級
  let priorityLevel;
  if (roundedScore >= PRIORITY_LEVELS.CRITICAL.min) {
    priorityLevel = PRIORITY_LEVELS.CRITICAL.name;
  } else if (roundedScore >= PRIORITY_LEVELS.HIGH.min) {
    priorityLevel = PRIORITY_LEVELS.HIGH.name;
  } else if (roundedScore >= PRIORITY_LEVELS.MEDIUM.min) {
    priorityLevel = PRIORITY_LEVELS.MEDIUM.name;
  } else {
    priorityLevel = PRIORITY_LEVELS.LOW.name;
  }

  return {
    priorityScore: roundedScore,
    priorityLevel,
    calculatedAt: new Date().toISOString(),
    breakdown: {
      importance: {
        raw: dataImportance,
        normalized: importanceScore,
        weighted: Math.round(weightedImportance * 100) / 100
      },
      battery: {
        raw: battery,
        normalized: batteryScore,
        weighted: Math.round(weightedBattery * 100) / 100
      },
      network: {
        status: networkStatus,
        normalized: networkScore,
        weighted: Math.round(weightedNetwork * 100) / 100
      }
    }
  };
}

/**
 * 按優先級排序
 */
function sortByPriority(dataArray) {
  return [...dataArray].sort((a, b) => {
    const scoreA = a.priority?.priorityScore || 0;
    const scoreB = b.priority?.priorityScore || 0;
    return scoreB - scoreA; // 降序
  });
}

module.exports = {
  calculatePriority,
  sortByPriority,
  PRIORITY_LEVELS,
  NETWORK_STATUS_SCORE
};


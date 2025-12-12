/**
 * 優先級判定引擎 (Priority Engine)
 * 
 * 根據以下三個權重計算出「優先級分數」：
 * 1. 資料重要性 (Data Importance) - 權重: 0.5
 * 2. 節點狀態 (Battery) - 權重: 0.3
 * 3. 網路狀況 (Network Status) - 權重: 0.2
 */

// 網路狀態對應的分數
const NETWORK_STATUS_SCORE = {
  'excellent': 10,
  'good': 8,
  'fair': 5,
  'poor': 2,
  'critical': 0,
  'unknown': 5  // 預設值
};

// 優先級等級定義
const PRIORITY_LEVELS = {
  CRITICAL: { min: 8.0, max: 10.0, label: 'critical' },
  HIGH: { min: 6.0, max: 8.0, label: 'high' },
  MEDIUM: { min: 4.0, max: 6.0, label: 'medium' },
  LOW: { min: 0.0, max: 4.0, label: 'low' }
};

/**
 * 計算優先級分數
 * 
 * @param {Object} sensorData - 感測器數據
 * @param {number} sensorData.dataImportance - 資料重要性 (0-10)
 * @param {number} sensorData.battery - 電量 (0-100)
 * @param {string} sensorData.networkStatus - 網路狀態
 * @returns {Object} 優先級計算結果
 */
function calculatePriority(sensorData) {
  const { dataImportance, battery, networkStatus = 'unknown' } = sensorData;

  // 1. 資料重要性分數 (0-10) - 權重 0.5
  const importanceScore = normalizeImportance(dataImportance);
  const weightedImportance = importanceScore * 0.5;

  // 2. 節點狀態分數 (電量) - 權重 0.3
  // 電量越高分數越高，但低電量時需要緊急處理
  const batteryScore = calculateBatteryScore(battery);
  const weightedBattery = batteryScore * 0.3;

  // 3. 網路狀況分數 - 權重 0.2
  const networkScore = NETWORK_STATUS_SCORE[networkStatus.toLowerCase()] || NETWORK_STATUS_SCORE['unknown'];
  const weightedNetwork = networkScore * 0.2;

  // 計算總分 (0-10)
  const totalScore = weightedImportance + weightedBattery + weightedNetwork;

  // 判斷優先級等級
  const priorityLevel = determinePriorityLevel(totalScore);

  return {
    priorityScore: Math.round(totalScore * 100) / 100,  // 保留兩位小數
    priorityLevel: priorityLevel.label,
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
    },
    calculatedAt: new Date().toISOString()
  };
}

/**
 * 正規化資料重要性分數
 * 資料重要性已經是 0-10 的範圍，直接使用
 */
function normalizeImportance(importance) {
  // 確保在 0-10 範圍內
  return Math.max(0, Math.min(10, importance));
}

/**
 * 計算電量分數
 * 電量越高分數越高，但考慮到低電量節點需要優先處理以避免數據遺失
 * 使用非線性函數：低電量時給予較高分數（緊急），高電量時分數較低（不急）
 */
function calculateBatteryScore(battery) {
  // 確保電量在 0-100 範圍內
  const normalizedBattery = Math.max(0, Math.min(100, battery));

  // 使用反轉邏輯：電量越低，優先級越高（因為需要緊急處理）
  // 但同時也要考慮高電量節點的穩定性
  // 公式：score = 10 * (1 - battery/100)^0.7
  // 這樣低電量時分數高，但不會過於極端
  const score = 10 * Math.pow(1 - normalizedBattery / 100, 0.7);
  
  return Math.max(0, Math.min(10, score));
}

/**
 * 根據總分判斷優先級等級
 */
function determinePriorityLevel(score) {
  if (score >= PRIORITY_LEVELS.CRITICAL.min) {
    return PRIORITY_LEVELS.CRITICAL;
  } else if (score >= PRIORITY_LEVELS.HIGH.min) {
    return PRIORITY_LEVELS.HIGH;
  } else if (score >= PRIORITY_LEVELS.MEDIUM.min) {
    return PRIORITY_LEVELS.MEDIUM;
  } else {
    return PRIORITY_LEVELS.LOW;
  }
}

/**
 * 批量計算優先級
 * 
 * @param {Array} sensorDataArray - 感測器數據陣列
 * @returns {Array} 包含優先級資訊的數據陣列
 */
function calculatePriorityBatch(sensorDataArray) {
  return sensorDataArray.map(data => ({
    ...data,
    priority: calculatePriority(data)
  }));
}

/**
 * 根據優先級分數排序（高分在前）
 */
function sortByPriority(dataArray) {
  return [...dataArray].sort((a, b) => {
    const scoreA = a.priority?.priorityScore || 0;
    const scoreB = b.priority?.priorityScore || 0;
    return scoreB - scoreA;  // 降序排列
  });
}

/**
 * 根據優先級等級分組
 */
function groupByPriorityLevel(dataArray) {
  const groups = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  dataArray.forEach(data => {
    const level = data.priority?.priorityLevel || 'low';
    if (groups[level]) {
      groups[level].push(data);
    }
  });

  return groups;
}

module.exports = {
  calculatePriority,
  calculatePriorityBatch,
  sortByPriority,
  groupByPriorityLevel,
  PRIORITY_LEVELS,
  NETWORK_STATUS_SCORE
};


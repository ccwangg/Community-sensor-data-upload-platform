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
 * 計算優先級分數（優化版本，使用公式）
 * 
 * 公式：PriorityScore = W_imp × Importance + W_bat × (100 - Battery)/10 + W_net × Network
 * 
 * 優化點：
 * - 使用標準公式計算
 * - 減少不必要的計算
 * - 使用查表法加速網路狀態分數查詢
 * - 簡化數學運算
 * 
 * @param {Object} sensorData - 感測器數據
 * @param {number} sensorData.dataImportance - 資料重要性 (0-10)
 * @param {number} sensorData.battery - 電量 (0-100)
 * @param {string} sensorData.networkStatus - 網路狀態
 * @param {boolean} includeBreakdown - 是否包含詳細分解（預設 false，提升效能）
 * @returns {Object} 優先級計算結果
 */
function calculatePriority(sensorData, includeBreakdown = false) {
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
  // 優化：使用查表法，避免 toLowerCase() 和條件判斷
  const networkKey = networkStatus.toLowerCase();
  const networkScore = NETWORK_STATUS_SCORE[networkKey] ?? NETWORK_STATUS_SCORE['unknown'];
  const weightedNetwork = networkScore * W_net;

  // 計算總分 (0-10)
  // PriorityScore = W_imp × Importance + W_bat × (100 - Battery)/10 + W_net × Network
  const totalScore = weightedImportance + weightedBattery + weightedNetwork;
  const roundedScore = Math.round(totalScore * 100) / 100;

  // 優化：直接判斷等級，避免函數調用
  let priorityLevel;
  if (roundedScore >= 8.0) {
    priorityLevel = 'critical';
  } else if (roundedScore >= 6.0) {
    priorityLevel = 'high';
  } else if (roundedScore >= 4.0) {
    priorityLevel = 'medium';
  } else {
    priorityLevel = 'low';
  }

  const result = {
    priorityScore: roundedScore,
    priorityLevel,
    calculatedAt: new Date().toISOString()
  };

  // 只在需要時計算詳細分解（提升效能）
  if (includeBreakdown) {
    result.breakdown = {
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
    };
  }

  return result;
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


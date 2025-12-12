// 使用資料庫服務取代記憶體儲存
const databaseService = require('./databaseService');
const priorityEngine = require('./priorityEngine');
const uploadScheduler = require('./uploadScheduler');
const asyncProcessor = require('./asyncProcessor');
const cacheService = require('./cacheService');

/**
 * 儲存感測器數據（整合優先級引擎，使用非同步處理，實作優先級佇列）
 * 
 * 優先級佇列邏輯：
 * PriorityScore = W_imp × Importance + W_bat × (100 - Battery) + W_net × Network
 * 數據按 PriorityScore 降序插入，確保高優先級數據優先處理
 */
const saveSensorData = async (sensorData) => {
  // 使用非同步計算優先級，不阻塞主線程
  const dataWithPriority = await asyncProcessor.calculatePriorityAsync(sensorData);
  
  // 儲存到資料庫（資料庫服務會按優先級分數排序插入）
  const dataWithId = databaseService.saveSensorData(dataWithPriority);
  
  // 非阻塞方式加入上傳調度器
  setImmediate(() => {
    uploadScheduler.scheduleUpload(dataWithId);
  });
  
  // 清除相關快取
  cacheService.delete(cacheService.generateKey('sensors', {}));
  cacheService.delete(cacheService.generateKey('summary', {}));
  cacheService.delete(cacheService.generateKey('priority_stats', {}));
  
  return dataWithId;
};

/**
 * 獲取所有感測器數據（使用快取優化，從資料庫讀取）
 */
const getAllSensorData = async (options = {}) => {
  // 生成快取鍵
  const cacheKey = cacheService.generateKey('sensors', options);
  
  // 嘗試從快取獲取
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 快取未命中，從資料庫查詢
  const result = databaseService.getAllSensorData(options);

  // 存入快取（TTL: 30 秒，因為數據會頻繁更新）
  cacheService.set(cacheKey, result, 30 * 1000);

  return result;
};

/**
 * 根據 ID 獲取感測器數據（從資料庫讀取）
 */
const getSensorDataById = async (id) => {
  return databaseService.getSensorDataById(id);
};

/**
 * 獲取優先級統計（使用快取優化）
 */
const getPriorityStatistics = async () => {
  const cacheKey = cacheService.generateKey('priority_stats', {});
  
  // 嘗試從快取獲取
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const allData = databaseService.getAllData();
  
  if (allData.length === 0) {
    const result = {
      total: 0,
      message: '目前尚無數據'
    };
    cacheService.set(cacheKey, result, 60 * 1000); // 快取 1 分鐘
    return result;
  }

  // 優化：使用單次遍歷計算統計
  let critical = 0, high = 0, medium = 0, low = 0;
  let totalScore = 0;

  for (const data of allData) {
    const level = data.priority?.priorityLevel || 'low';
    const score = data.priority?.priorityScore || 0;
    
    if (level === 'critical') critical++;
    else if (level === 'high') high++;
    else if (level === 'medium') medium++;
    else low++;
    
    totalScore += score;
  }

  const total = allData.length;
  const stats = {
    total,
    byLevel: { critical, high, medium, low },
    averageScore: totalScore / total,
    distribution: {
      critical: ((critical / total) * 100).toFixed(2) + '%',
      high: ((high / total) * 100).toFixed(2) + '%',
      medium: ((medium / total) * 100).toFixed(2) + '%',
      low: ((low / total) * 100).toFixed(2) + '%'
    }
  };

  // 存入快取（TTL: 30 秒）
  cacheService.set(cacheKey, stats, 30 * 1000);

  return stats;
};

module.exports = {
  saveSensorData,
  getAllSensorData,
  getSensorDataById,
  getPriorityStatistics
};


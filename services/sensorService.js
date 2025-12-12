// 暫時使用記憶體儲存，第二階段會改為資料庫
const sensorDataStore = [];
let nextId = 1;

const priorityEngine = require('./priorityEngine');
const uploadScheduler = require('./uploadScheduler');
const asyncProcessor = require('./asyncProcessor');
const cacheService = require('./cacheService');

/**
 * 儲存感測器數據（整合優先級引擎，使用非同步處理）
 */
const saveSensorData = async (sensorData) => {
  // 使用非同步計算優先級，不阻塞主線程
  const dataWithPriority = await asyncProcessor.calculatePriorityAsync(sensorData);
  
  const dataWithId = {
    id: `sensor-${nextId++}`,
    ...dataWithPriority,
    createdAt: new Date().toISOString()
  };
  
  // 非阻塞方式加入上傳調度器
  setImmediate(() => {
    uploadScheduler.scheduleUpload(dataWithId);
  });
  
  sensorDataStore.push(dataWithId);
  
  // 清除相關快取
  cacheService.delete(cacheService.generateKey('sensors', {}));
  cacheService.delete(cacheService.generateKey('summary', {}));
  cacheService.delete(cacheService.generateKey('priority_stats', {}));
  
  return dataWithId;
};

/**
 * 獲取所有感測器數據（使用快取優化）
 */
const getAllSensorData = async (options = {}) => {
  // 生成快取鍵
  const cacheKey = cacheService.generateKey('sensors', options);
  
  // 嘗試從快取獲取
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 快取未命中，執行查詢
  let filteredData = [...sensorDataStore];

  // 根據 nodeId 篩選
  if (options.nodeId) {
    filteredData = filteredData.filter(data => data.nodeId === options.nodeId);
  }

  // 根據 sensorType 篩選
  if (options.sensorType) {
    filteredData = filteredData.filter(data => data.sensorType === options.sensorType);
  }

  // 根據優先級等級篩選
  if (options.priorityLevel) {
    filteredData = filteredData.filter(data => 
      data.priority?.priorityLevel === options.priorityLevel
    );
  }

  // 根據最小優先級分數篩選
  if (options.minPriorityScore !== undefined) {
    filteredData = filteredData.filter(data => 
      (data.priority?.priorityScore || 0) >= parseFloat(options.minPriorityScore)
    );
  }

  // 排序選項（優化：只在需要時排序）
  if (options.sortBy === 'priority') {
    // 按優先級分數排序（高分在前）
    filteredData = priorityEngine.sortByPriority(filteredData);
  } else {
    // 預設：按時間排序（最新的在前）
    // 優化：使用數值比較而非 Date 物件
    filteredData.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }

  const total = filteredData.length;

  // 分頁處理
  if (options.offset) {
    filteredData = filteredData.slice(options.offset);
  }
  if (options.limit) {
    filteredData = filteredData.slice(0, options.limit);
  }

  const result = {
    data: filteredData,
    total
  };

  // 存入快取（TTL: 30 秒，因為數據會頻繁更新）
  cacheService.set(cacheKey, result, 30 * 1000);

  return result;
};

/**
 * 根據 ID 獲取感測器數據
 */
const getSensorDataById = async (id) => {
  return sensorDataStore.find(data => data.id === id);
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

  const allData = sensorDataStore;
  
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


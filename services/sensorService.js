// 暫時使用記憶體儲存，第二階段會改為資料庫
const sensorDataStore = [];
let nextId = 1;

const priorityEngine = require('./priorityEngine');
const uploadScheduler = require('./uploadScheduler');

/**
 * 儲存感測器數據（整合優先級引擎）
 */
const saveSensorData = async (sensorData) => {
  // 計算優先級
  const priority = priorityEngine.calculatePriority(sensorData);
  
  const dataWithId = {
    id: `sensor-${nextId++}`,
    ...sensorData,
    priority,  // 加入優先級資訊
    createdAt: new Date().toISOString()
  };
  
  // 加入上傳調度器
  const scheduleResult = uploadScheduler.scheduleUpload(dataWithId);
  dataWithId.scheduleResult = scheduleResult;
  
  sensorDataStore.push(dataWithId);
  return dataWithId;
};

/**
 * 獲取所有感測器數據
 */
const getAllSensorData = async (options = {}) => {
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

  // 排序選項
  if (options.sortBy === 'priority') {
    // 按優先級分數排序（高分在前）
    filteredData = priorityEngine.sortByPriority(filteredData);
  } else {
    // 預設：按時間排序（最新的在前）
    filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  const total = filteredData.length;

  // 分頁處理
  if (options.offset) {
    filteredData = filteredData.slice(options.offset);
  }
  if (options.limit) {
    filteredData = filteredData.slice(0, options.limit);
  }

  return {
    data: filteredData,
    total
  };
};

/**
 * 根據 ID 獲取感測器數據
 */
const getSensorDataById = async (id) => {
  return sensorDataStore.find(data => data.id === id);
};

/**
 * 獲取優先級統計
 */
const getPriorityStatistics = async () => {
  const allData = sensorDataStore;
  
  if (allData.length === 0) {
    return {
      total: 0,
      message: '目前尚無數據'
    };
  }

  // 按優先級等級分組
  const grouped = priorityEngine.groupByPriorityLevel(allData);
  
  // 計算統計資訊
  const stats = {
    total: allData.length,
    byLevel: {
      critical: grouped.critical.length,
      high: grouped.high.length,
      medium: grouped.medium.length,
      low: grouped.low.length
    },
    averageScore: allData.reduce((sum, d) => 
      sum + (d.priority?.priorityScore || 0), 0) / allData.length,
    distribution: {
      critical: ((grouped.critical.length / allData.length) * 100).toFixed(2) + '%',
      high: ((grouped.high.length / allData.length) * 100).toFixed(2) + '%',
      medium: ((grouped.medium.length / allData.length) * 100).toFixed(2) + '%',
      low: ((grouped.low.length / allData.length) * 100).toFixed(2) + '%'
    }
  };

  return stats;
};

module.exports = {
  saveSensorData,
  getAllSensorData,
  getSensorDataById,
  getPriorityStatistics
};


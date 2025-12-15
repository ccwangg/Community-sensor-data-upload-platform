const sensorService = require('./sensorService');
const cacheService = require('./cacheService');

/**
 * 獲取數據摘要報表（使用快取優化）
 */
const getSummary = async () => {
  const cacheKey = cacheService.generateKey('summary', {});
  
  // 嘗試從快取獲取
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 直接從資料庫獲取所有數據（不使用快取，確保獲取最新數據）
  const databaseService = require('./databaseService');
  const allData = databaseService.getAllData();
  
  if (allData.length === 0) {
    const result = {
      totalRecords: 0,
      message: '目前尚無數據'
    };
    cacheService.set(cacheKey, result, 2 * 1000); // 縮短快取時間
    return result;
  }

  // 優化：使用單次遍歷計算所有統計
  const uniqueNodes = new Set();
  const sensorTypes = {};
  let totalBattery = 0;
  let totalImportance = 0;
  const networkStatus = {};
  let latestTimestamp = null;

  for (const d of allData) {
    uniqueNodes.add(d.nodeId);
    sensorTypes[d.sensorType] = (sensorTypes[d.sensorType] || 0) + 1;
    totalBattery += d.battery;
    totalImportance += d.dataImportance;
    networkStatus[d.networkStatus] = (networkStatus[d.networkStatus] || 0) + 1;
    
    if (!latestTimestamp || d.timestamp > latestTimestamp) {
      latestTimestamp = d.timestamp;
    }
  }

  const result = {
    totalRecords: allData.length,
    uniqueNodes: uniqueNodes.size,
    nodeList: Array.from(uniqueNodes),
    sensorTypes,
    averageBattery: Math.round((totalBattery / allData.length) * 100) / 100,
    averageImportance: Math.round((totalImportance / allData.length) * 100) / 100,
    networkStatus,
    latestTimestamp,
    generatedAt: new Date().toISOString()
  };

  // 存入快取（TTL: 2 秒，確保總筆數能即時更新）
  cacheService.set(cacheKey, result, 2 * 1000);

  return result;
};

/**
 * 獲取統計數據報表
 */
const getStatistics = async (timeRange = 'all') => {
  // 直接從資料庫獲取所有數據（不使用快取，確保獲取最新數據）
  const databaseService = require('./databaseService');
  let data = databaseService.getAllData();

  // 根據時間範圍篩選
  const now = new Date();
  let cutoffDate = null;

  switch (timeRange) {
    case 'today':
      cutoffDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      cutoffDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    default:
      cutoffDate = null;
  }

  if (cutoffDate) {
    data = data.filter(d => new Date(d.timestamp) >= cutoffDate);
  }

  if (data.length === 0) {
    return {
      timeRange,
      totalRecords: 0,
      message: `在 ${timeRange} 時間範圍內尚無數據`
    };
  }

  // 按節點分組統計
  const nodeStats = {};
  data.forEach(d => {
    if (!nodeStats[d.nodeId]) {
      nodeStats[d.nodeId] = {
        nodeId: d.nodeId,
        recordCount: 0,
        avgBattery: 0,
        avgImportance: 0,
        batterySum: 0,
        importanceSum: 0
      };
    }
    nodeStats[d.nodeId].recordCount++;
    nodeStats[d.nodeId].batterySum += d.battery;
    nodeStats[d.nodeId].importanceSum += d.dataImportance;
  });

  // 計算平均值
  Object.keys(nodeStats).forEach(nodeId => {
    const stats = nodeStats[nodeId];
    stats.avgBattery = Math.round((stats.batterySum / stats.recordCount) * 100) / 100;
    stats.avgImportance = Math.round((stats.importanceSum / stats.recordCount) * 100) / 100;
    delete stats.batterySum;
    delete stats.importanceSum;
  });

  // 資料重要性分布
  const importanceDistribution = {};
  data.forEach(d => {
    const level = Math.floor(d.dataImportance);
    importanceDistribution[level] = (importanceDistribution[level] || 0) + 1;
  });

  // 電量分布
  const batteryDistribution = {
    critical: data.filter(d => d.battery < 20).length,
    low: data.filter(d => d.battery >= 20 && d.battery < 50).length,
    medium: data.filter(d => d.battery >= 50 && d.battery < 80).length,
    high: data.filter(d => d.battery >= 80).length
  };

  return {
    timeRange,
    totalRecords: data.length,
    nodeStatistics: Object.values(nodeStats),
    importanceDistribution,
    batteryDistribution,
    generatedAt: new Date().toISOString()
  };
};

module.exports = {
  getSummary,
  getStatistics
};


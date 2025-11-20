const sensorService = require('./sensorService');

/**
 * 獲取數據摘要報表
 */
const getSummary = async () => {
  const allData = await sensorService.getAllSensorData();
  const data = allData.data;

  if (data.length === 0) {
    return {
      totalRecords: 0,
      message: '目前尚無數據'
    };
  }

  // 統計節點數量
  const uniqueNodes = new Set(data.map(d => d.nodeId));
  
  // 統計感測器類型
  const sensorTypes = {};
  data.forEach(d => {
    sensorTypes[d.sensorType] = (sensorTypes[d.sensorType] || 0) + 1;
  });

  // 計算平均電量
  const avgBattery = data.reduce((sum, d) => sum + d.battery, 0) / data.length;

  // 計算平均資料重要性
  const avgImportance = data.reduce((sum, d) => sum + d.dataImportance, 0) / data.length;

  // 網路狀態統計
  const networkStatus = {};
  data.forEach(d => {
    networkStatus[d.networkStatus] = (networkStatus[d.networkStatus] || 0) + 1;
  });

  // 最新數據時間
  const latestTimestamp = data[0]?.timestamp || null;

  return {
    totalRecords: data.length,
    uniqueNodes: uniqueNodes.size,
    nodeList: Array.from(uniqueNodes),
    sensorTypes,
    averageBattery: Math.round(avgBattery * 100) / 100,
    averageImportance: Math.round(avgImportance * 100) / 100,
    networkStatus,
    latestTimestamp,
    generatedAt: new Date().toISOString()
  };
};

/**
 * 獲取統計數據報表
 */
const getStatistics = async (timeRange = 'all') => {
  const allData = await sensorService.getAllSensorData();
  let data = allData.data;

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


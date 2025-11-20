// 暫時使用記憶體儲存，第二階段會改為資料庫
const sensorDataStore = [];
let nextId = 1;

/**
 * 儲存感測器數據
 */
const saveSensorData = async (sensorData) => {
  const dataWithId = {
    id: `sensor-${nextId++}`,
    ...sensorData,
    createdAt: new Date().toISOString()
  };
  
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

  // 排序：最新的在前
  filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

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

module.exports = {
  saveSensorData,
  getAllSensorData,
  getSensorDataById
};


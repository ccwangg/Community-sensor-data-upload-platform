// 使用資料庫服務和優先級引擎
const databaseService = require('./databaseService');
const priorityEngine = require('./priorityEngine');

/**
 * 儲存感測器數據（整合優先級引擎）
 */
const saveSensorData = async (sensorData) => {
  // 計算優先級
  const priority = priorityEngine.calculatePriority(sensorData);
  
  // 將優先級資訊加入數據
  const dataWithPriority = {
    ...sensorData,
    priority
  };
  
  // 儲存到資料庫（資料庫服務會按優先級排序插入）
  const savedData = databaseService.saveSensorData(dataWithPriority);
  
  return savedData;
};

/**
 * 獲取所有感測器數據（從資料庫讀取）
 */
const getAllSensorData = async (options = {}) => {
  return databaseService.getAllSensorData(options);
};

/**
 * 根據 ID 獲取感測器數據（從資料庫讀取）
 */
const getSensorDataById = async (id) => {
  return databaseService.getSensorDataById(id);
};

module.exports = {
  saveSensorData,
  getAllSensorData,
  getSensorDataById
};


const sensorService = require('../services/sensorService');

/**
 * 上傳感測器數據（輸入端 API）
 * POST /api/sensors/data
 * 
 * 請求體範例：
 * {
 *   "nodeId": "node-001",
 *   "dataImportance": 8,
 *   "battery": 75,
 *   "timestamp": "2024-01-15T10:30:00Z",
 *   "networkStatus": "good",
 *   "sensorType": "temperature",
 *   "value": 25.5,
 *   "unit": "celsius"
 * }
 */
const uploadSensorData = async (req, res, next) => {
  try {
    const {
      nodeId,
      dataImportance,
      battery,
      timestamp,
      networkStatus,
      sensorType,
      value,
      unit,
      metadata,
      // 模擬器格式支援
      sensor_id,           // 模擬器的 sensor_id 對應到 nodeId
      priority_hint,       // 模擬器的 priority_hint
      ts,                  // 模擬器的 ts 對應到 timestamp
      periodic,            // 模擬器的週期性數據
      emergency,           // 模擬器的緊急事件數據
      meta                 // 模擬器的 meta 對應到 metadata
    } = req.body;

    // 支援模擬器格式：如果使用模擬器格式，進行轉換
    let finalNodeId = nodeId || sensor_id;
    let finalDataImportance = dataImportance;
    let finalTimestamp = timestamp || ts;
    let finalMetadata = metadata || meta || {};
    let finalPeriodic = periodic;
    let finalEmergency = emergency;

    // 如果使用模擬器格式的 priority_hint，轉換 severity 到 dataImportance
    if (priority_hint && priority_hint.severity !== undefined) {
      // 模擬器的 severity 是 0.1-1.0，轉換為 1-10
      finalDataImportance = priority_hint.severity * 10;
    }

    // 驗證必填欄位
    if (!finalNodeId || finalDataImportance === undefined || battery === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          message: '缺少必填欄位：nodeId (或 sensor_id), dataImportance (或 priority_hint.severity), battery 為必填',
          required: ['nodeId/sensor_id', 'dataImportance/priority_hint.severity', 'battery']
        }
      });
    }

    // 驗證資料格式
    if (typeof finalDataImportance !== 'number' || finalDataImportance < 0 || finalDataImportance > 10) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'dataImportance 必須是 0-10 之間的數字'
        }
      });
    }

    if (typeof battery !== 'number' || battery < 0 || battery > 100) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'battery 必須是 0-100 之間的數字'
        }
      });
    }

    // 從 periodic 數據中推斷 sensorType 和 value（如果未提供）
    let finalSensorType = sensorType;
    let finalValue = value;
    let finalUnit = unit;

    if (periodic && !sensorType) {
      // 根據 periodic 數據推斷主要感測器類型
      if (periodic.temperature !== undefined) {
        finalSensorType = 'temperature';
        finalValue = periodic.temperature;
        finalUnit = 'celsius';
      } else if (periodic.humidity !== undefined) {
        finalSensorType = 'humidity';
        finalValue = periodic.humidity;
        finalUnit = 'percent';
      } else if (periodic.pressure !== undefined) {
        finalSensorType = 'pressure';
        finalValue = periodic.pressure;
        finalUnit = 'hPa';
      }
    }

    // 建立感測器數據物件
    const sensorData = {
      nodeId: finalNodeId,
      dataImportance: finalDataImportance,
      battery,
      timestamp: finalTimestamp || new Date().toISOString(),
      networkStatus: networkStatus || 'good',  // 預設為 good
      sensorType: finalSensorType || 'unknown',
      value: finalValue !== undefined ? finalValue : null,
      unit: finalUnit || null,
      periodic: finalPeriodic || null,
      emergency: finalEmergency || null,
      metadata: finalMetadata,
      receivedAt: new Date().toISOString()
    };

    // 儲存數據（目前使用記憶體儲存，第二階段會加入資料庫）
    const savedData = await sensorService.saveSensorData(sensorData);

    res.status(201).json({
      success: true,
      message: '感測器數據上傳成功',
      data: savedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 獲取所有感測器數據（輸出端 API）
 * GET /api/sensors/data
 * 
 * 查詢參數：
 * - limit: 限制返回數量
 * - offset: 偏移量
 * - nodeId: 篩選特定節點
 * - sensorType: 篩選特定感測器類型
 * - priorityLevel: 篩選優先級等級 (critical, high, medium, low)
 * - minPriorityScore: 最小優先級分數 (0-10)
 * - sortBy: 排序方式 (priority, timestamp)
 */
const getAllSensorData = async (req, res, next) => {
  try {
    const { limit, offset, nodeId, sensorType, priorityLevel, minPriorityScore, sortBy } = req.query;

    const options = {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : 0,
      nodeId,
      sensorType,
      priorityLevel,
      minPriorityScore,
      sortBy: sortBy || 'timestamp'
    };

    const result = await sensorService.getAllSensorData(options);

    res.json({
      success: true,
      count: result.data.length,
      total: result.total,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 根據 ID 獲取特定感測器數據
 * GET /api/sensors/data/:id
 */
const getSensorDataById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await sensorService.getSensorDataById(id);

    if (!data) {
      return res.status(404).json({
        error: {
          message: '找不到指定的感測器數據',
          id
        }
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 根據節點 ID 獲取數據
 * GET /api/sensors/node/:nodeId
 */
const getDataByNodeId = async (req, res, next) => {
  try {
    const { nodeId } = req.params;
    const { limit, offset } = req.query;

    const options = {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : 0,
      nodeId
    };

    const result = await sensorService.getAllSensorData(options);

    res.json({
      success: true,
      nodeId,
      count: result.data.length,
      total: result.total,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 獲取優先級統計
 * GET /api/sensors/priority/stats
 */
const getPriorityStatistics = async (req, res, next) => {
  try {
    const stats = await sensorService.getPriorityStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadSensorData,
  getAllSensorData,
  getSensorDataById,
  getDataByNodeId,
  getPriorityStatistics
};


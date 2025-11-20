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
      metadata
    } = req.body;

    // 驗證必填欄位
    if (!nodeId || dataImportance === undefined || battery === undefined) {
      return res.status(400).json({
        error: {
          message: '缺少必填欄位：nodeId, dataImportance, battery 為必填',
          required: ['nodeId', 'dataImportance', 'battery']
        }
      });
    }

    // 驗證資料格式
    if (typeof dataImportance !== 'number' || dataImportance < 0 || dataImportance > 10) {
      return res.status(400).json({
        error: {
          message: 'dataImportance 必須是 0-10 之間的數字'
        }
      });
    }

    if (typeof battery !== 'number' || battery < 0 || battery > 100) {
      return res.status(400).json({
        error: {
          message: 'battery 必須是 0-100 之間的數字'
        }
      });
    }

    // 建立感測器數據物件
    const sensorData = {
      nodeId,
      dataImportance,
      battery,
      timestamp: timestamp || new Date().toISOString(),
      networkStatus: networkStatus || 'unknown',
      sensorType: sensorType || 'unknown',
      value: value !== undefined ? value : null,
      unit: unit || null,
      metadata: metadata || {},
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
 */
const getAllSensorData = async (req, res, next) => {
  try {
    const { limit, offset, nodeId, sensorType } = req.query;

    const options = {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : 0,
      nodeId,
      sensorType
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

module.exports = {
  uploadSensorData,
  getAllSensorData,
  getSensorDataById,
  getDataByNodeId
};


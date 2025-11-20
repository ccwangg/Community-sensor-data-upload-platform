const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

// 接收感測器數據（輸入端 - 給模擬器用）
router.post('/data', sensorController.uploadSensorData);

// 獲取所有感測器數據（輸出端 - 給前端用）
router.get('/data', sensorController.getAllSensorData);

// 根據 ID 獲取特定感測器數據
router.get('/data/:id', sensorController.getSensorDataById);

// 根據節點 ID 獲取數據
router.get('/node/:nodeId', sensorController.getDataByNodeId);

module.exports = router;


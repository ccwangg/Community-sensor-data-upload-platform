const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');

// 獲取上傳佇列狀態
router.get('/queue', schedulerController.getQueueStatus);

// 手動觸發緊急佇列處理
router.post('/process-critical', schedulerController.processCriticalQueue);

// 手動觸發批次佇列處理
router.post('/process-batch', schedulerController.processBatchQueue);

// 清空所有佇列
router.delete('/queue', schedulerController.clearQueues);

module.exports = router;


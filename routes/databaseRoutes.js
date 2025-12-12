const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');

// 獲取資料庫統計
router.get('/stats', databaseController.getDatabaseStats);

// 清空資料庫（僅用於測試）
router.delete('/clear', databaseController.clearDatabase);

module.exports = router;


const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// 獲取數據摘要報表
router.get('/summary', reportController.getSummary);

// 獲取統計數據報表
router.get('/statistics', reportController.getStatistics);

module.exports = router;


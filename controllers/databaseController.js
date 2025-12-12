const databaseService = require('../services/databaseService');

/**
 * 獲取資料庫統計
 * GET /api/database/stats
 */
const getDatabaseStats = async (req, res, next) => {
  try {
    const stats = databaseService.getDatabaseStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 清空所有數據（僅用於測試）
 * DELETE /api/database/clear
 */
const clearDatabase = async (req, res, next) => {
  try {
    databaseService.clearAllData();
    res.json({
      success: true,
      message: '資料庫已清空'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDatabaseStats,
  clearDatabase
};


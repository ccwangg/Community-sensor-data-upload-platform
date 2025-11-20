const reportService = require('../services/reportService');

/**
 * 獲取數據摘要報表
 * GET /api/reports/summary
 */
const getSummary = async (req, res, next) => {
  try {
    const summary = await reportService.getSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 獲取統計數據報表
 * GET /api/reports/statistics
 * 
 * 查詢參數：
 * - timeRange: 時間範圍 (today, week, month, all)
 */
const getStatistics = async (req, res, next) => {
  try {
    const { timeRange = 'all' } = req.query;
    const statistics = await reportService.getStatistics(timeRange);
    
    res.json({
      success: true,
      timeRange,
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getStatistics
};


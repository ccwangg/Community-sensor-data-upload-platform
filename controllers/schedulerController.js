const uploadScheduler = require('../services/uploadScheduler');

/**
 * 獲取上傳佇列狀態
 * GET /api/scheduler/queue
 */
const getQueueStatus = async (req, res, next) => {
  try {
    const status = uploadScheduler.getQueueStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 手動觸發緊急佇列處理
 * POST /api/scheduler/process-critical
 */
const processCriticalQueue = async (req, res, next) => {
  try {
    const processed = uploadScheduler.processCriticalQueue();
    res.json({
      success: true,
      message: '緊急佇列處理完成',
      processedCount: processed ? processed.length : 0,
      data: processed || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 手動觸發批次佇列處理
 * POST /api/scheduler/process-batch
 */
const processBatchQueue = async (req, res, next) => {
  try {
    const processed = uploadScheduler.processBatchQueue();
    res.json({
      success: true,
      message: '批次佇列處理完成',
      processedCount: processed ? processed.length : 0,
      data: processed || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 清空所有佇列（用於測試或重置）
 * DELETE /api/scheduler/queue
 */
const clearQueues = async (req, res, next) => {
  try {
    uploadScheduler.clearQueues();
    res.json({
      success: true,
      message: '所有佇列已清空'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQueueStatus,
  processCriticalQueue,
  processBatchQueue,
  clearQueues
};


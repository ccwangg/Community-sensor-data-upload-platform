/**
 * 上傳調度器 (Upload Scheduler)
 * 
 * 實作兩種調度策略：
 * 1. Preemptive (搶佔式)：緊急資料插隊機制
 * 2. Batch (批次)：非緊急資料打包一起送
 */

const priorityEngine = require('./priorityEngine');

// 上傳佇列
const uploadQueue = {
  critical: [],  // 緊急佇列（Preemptive）
  batch: []      // 批次佇列（Batch）
};

// 批次處理設定
const BATCH_CONFIG = {
  maxBatchSize: 10,           // 每批最大數量
  batchInterval: 5000,        // 批次處理間隔（毫秒）
  criticalThreshold: 7.5      // 優先級分數閾值，超過此值視為緊急
};

// 批次處理計時器
let batchTimer = null;

/**
 * 將數據加入上傳佇列
 * 
 * @param {Object} sensorData - 感測器數據（需包含 priority 資訊）
 * @returns {Object} 調度結果
 */
function scheduleUpload(sensorData) {
  // 確保數據已計算優先級
  if (!sensorData.priority) {
    sensorData.priority = priorityEngine.calculatePriority(sensorData);
  }

  const priorityScore = sensorData.priority.priorityScore;
  const priorityLevel = sensorData.priority.priorityLevel;

  // 判斷是否為緊急資料（Preemptive）
  const isCritical = priorityScore >= BATCH_CONFIG.criticalThreshold || 
                     priorityLevel === 'critical';

  if (isCritical) {
    // 加入緊急佇列（Preemptive - 搶佔式）
    uploadQueue.critical.push({
      ...sensorData,
      scheduledAt: new Date().toISOString(),
      queueType: 'preemptive'
    });

    // 立即處理緊急資料
    processCriticalQueue();

    return {
      scheduled: true,
      queueType: 'preemptive',
      priority: priorityLevel,
      message: '已加入緊急佇列，將立即處理'
    };
  } else {
    // 加入批次佇列（Batch）
    uploadQueue.batch.push({
      ...sensorData,
      scheduledAt: new Date().toISOString(),
      queueType: 'batch'
    });

    // 啟動批次處理計時器（如果尚未啟動）
    startBatchProcessor();

    return {
      scheduled: true,
      queueType: 'batch',
      priority: priorityLevel,
      message: '已加入批次佇列，將批量處理'
    };
  }
}

/**
 * 處理緊急佇列（Preemptive - 搶佔式）
 * 立即處理所有緊急資料
 */
function processCriticalQueue() {
  if (uploadQueue.critical.length === 0) {
    return;
  }

  const criticalItems = uploadQueue.critical.splice(0);  // 取出所有緊急項目

  console.log(`🚨 [Preemptive] 處理 ${criticalItems.length} 筆緊急資料`);

  // 按優先級分數排序（最高優先級先處理）
  const sortedItems = priorityEngine.sortByPriority(criticalItems);

  // 模擬上傳處理（實際應用中會呼叫實際的上傳服務）
  sortedItems.forEach((item, index) => {
    console.log(`  → [${index + 1}] 節點: ${item.nodeId}, 優先級: ${item.priority.priorityScore.toFixed(2)} (${item.priority.priorityLevel})`);
    // 這裡可以呼叫實際的上傳 API 或服務
    processUploadItem(item);
  });

  return sortedItems;
}

/**
 * 啟動批次處理器
 */
function startBatchProcessor() {
  // 如果計時器已在運行，不重複啟動
  if (batchTimer) {
    return;
  }

  batchTimer = setInterval(() => {
    processBatchQueue();
  }, BATCH_CONFIG.batchInterval);

  console.log('📦 [Batch] 批次處理器已啟動');
}

/**
 * 停止批次處理器
 */
function stopBatchProcessor() {
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
    console.log('📦 [Batch] 批次處理器已停止');
  }
}

/**
 * 處理批次佇列（Batch）
 * 將多筆資料打包一起處理
 */
function processBatchQueue() {
  if (uploadQueue.batch.length === 0) {
    // 如果佇列為空，停止計時器
    stopBatchProcessor();
    return;
  }

  // 取出批次資料（最多 BATCH_CONFIG.maxBatchSize 筆）
  const batchItems = uploadQueue.batch.splice(0, BATCH_CONFIG.maxBatchSize);

  console.log(`📦 [Batch] 處理 ${batchItems.length} 筆批次資料`);

  // 按優先級分數排序
  const sortedItems = priorityEngine.sortByPriority(batchItems);

  // 批量處理
  sortedItems.forEach((item, index) => {
    console.log(`  → [${index + 1}] 節點: ${item.nodeId}, 優先級: ${item.priority.priorityScore.toFixed(2)} (${item.priority.priorityLevel})`);
    processUploadItem(item);
  });

  return sortedItems;
}

/**
 * 處理單一上傳項目（從優先級佇列取出最高優先級數據處理）
 * 實際應用中，這裡會呼叫實際的上傳服務或 API
 */
function processUploadItem(item) {
  // 從優先級佇列取出最高優先級的數據
  // 注意：數據已經在資料庫中按優先級排序，這裡直接處理
  
  // 模擬上傳處理
  // 實際應用中，這裡可以：
  // 1. 呼叫外部 API 上傳數據
  // 2. 寫入外部資料庫
  // 3. 發送通知等

  item.uploadedAt = new Date().toISOString();
  item.uploadStatus = 'completed';

  return item;
}

/**
 * 獲取佇列狀態
 */
function getQueueStatus() {
  return {
    critical: {
      count: uploadQueue.critical.length,
      items: uploadQueue.critical.map(item => ({
        nodeId: item.nodeId,
        priorityScore: item.priority?.priorityScore,
        priorityLevel: item.priority?.priorityLevel,
        scheduledAt: item.scheduledAt
      }))
    },
    batch: {
      count: uploadQueue.batch.length,
      items: uploadQueue.batch.map(item => ({
        nodeId: item.nodeId,
        priorityScore: item.priority?.priorityScore,
        priorityLevel: item.priority?.priorityLevel,
        scheduledAt: item.scheduledAt
      }))
    },
    config: BATCH_CONFIG
  };
}

/**
 * 清空佇列（用於測試或重置）
 */
function clearQueues() {
  uploadQueue.critical = [];
  uploadQueue.batch = [];
  stopBatchProcessor();
  console.log('🗑️  所有佇列已清空');
}

module.exports = {
  scheduleUpload,
  processCriticalQueue,
  processBatchQueue,
  getQueueStatus,
  clearQueues,
  startBatchProcessor,
  stopBatchProcessor,
  BATCH_CONFIG
};


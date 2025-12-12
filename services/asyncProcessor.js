/**
 * 非同步處理服務 (Async Processor)
 * 使用非阻塞方式處理優先級計算，避免阻塞主線程
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const priorityEngine = require('./priorityEngine');

// 任務佇列
const taskQueue = [];
let isProcessing = false;
let workerPool = [];
const MAX_WORKERS = 2; // 最大工作線程數

/**
 * 非同步計算優先級（使用 process.nextTick 非阻塞）
 * @param {Object} sensorData - 感測器數據
 * @returns {Promise<Object>} 包含優先級資訊的數據
 */
async function calculatePriorityAsync(sensorData) {
  return new Promise((resolve) => {
    // 使用 process.nextTick 確保非阻塞
    process.nextTick(() => {
      try {
        const priority = priorityEngine.calculatePriority(sensorData);
        resolve({
          ...sensorData,
          priority
        });
      } catch (error) {
        console.error('優先級計算錯誤:', error);
        // 發生錯誤時返回原始數據
        resolve(sensorData);
      }
    });
  });
}

/**
 * 批量非同步計算優先級
 * @param {Array} sensorDataArray - 感測器數據陣列
 * @returns {Promise<Array>} 包含優先級資訊的數據陣列
 */
async function calculatePriorityBatchAsync(sensorDataArray) {
  // 使用 Promise.all 並行處理，但限制並發數
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < sensorDataArray.length; i += batchSize) {
    const batch = sensorDataArray.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(data => calculatePriorityAsync(data))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * 使用 setImmediate 延遲執行任務（更輕量）
 * @param {Function} task - 要執行的任務
 * @returns {Promise} 任務結果
 */
function deferTask(task) {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        const result = task();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * 將任務加入佇列（用於大量數據處理）
 * @param {Function} task - 要執行的任務
 * @returns {Promise} 任務結果
 */
function queueTask(task) {
  return new Promise((resolve, reject) => {
    taskQueue.push({ task, resolve, reject });
    processQueue();
  });
}

/**
 * 處理任務佇列
 */
async function processQueue() {
  if (isProcessing || taskQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (taskQueue.length > 0) {
    const { task, resolve, reject } = taskQueue.shift();
    
    try {
      // 使用 setImmediate 確保非阻塞
      const result = await deferTask(task);
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    // 讓出控制權，避免長時間阻塞
    await new Promise(resolve => setImmediate(resolve));
  }

  isProcessing = false;
}

/**
 * 獲取佇列狀態
 */
function getQueueStatus() {
  return {
    queueLength: taskQueue.length,
    isProcessing,
    workerPoolSize: workerPool.length
  };
}

module.exports = {
  calculatePriorityAsync,
  calculatePriorityBatchAsync,
  deferTask,
  queueTask,
  getQueueStatus
};


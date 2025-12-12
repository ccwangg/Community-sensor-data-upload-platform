/**
 * 資料庫服務 (Database Service)
 * 使用 JSON 檔案將資料持久化，避免重啟後資料消失
 * 實作優先級佇列：按 PriorityScore 降序排列
 */

const fs = require('fs');
const path = require('path');

// 確保資料目錄存在
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 資料庫檔案路徑
const dbPath = path.join(dataDir, 'sensor-data.json');

// 初始化資料庫
let db = {
  sensors: [],
  metadata: {
    lastId: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

// 載入資料庫
function loadDatabase() {
  try {
    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf8');
      if (content.trim()) {
        db = JSON.parse(content);
      }
    }
  } catch (error) {
    console.error('載入資料庫失敗:', error);
    // 使用預設值
    db = {
      sensors: [],
      metadata: {
        lastId: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }
}

// 儲存資料庫
function saveDatabase() {
  try {
    db.metadata.updatedAt = new Date().toISOString();
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('儲存資料庫失敗:', error);
    throw error;
  }
}

// 初始化：載入資料庫
loadDatabase();

/**
 * 獲取下一個 ID
 */
function getNextId() {
  db.metadata.lastId = (db.metadata.lastId || 0) + 1;
  saveDatabase();
  return `sensor-${db.metadata.lastId}`;
}

/**
 * 儲存感測器數據（實作優先級佇列）
 * 
 * 優先級佇列邏輯：
 * PriorityScore = W_imp × Importance + W_bat × (100 - Battery)/10 + W_net × Network
 * 數據按 PriorityScore 降序插入，確保高優先級數據優先處理
 * 
 * @param {Object} sensorData - 感測器數據
 * @returns {Object} 儲存後的數據（包含 id）
 */
function saveSensorData(sensorData) {
  const id = getNextId();
  const dataWithId = {
    id,
    ...sensorData,
    createdAt: new Date().toISOString()
  };
  
  // 優先級佇列：按 PriorityScore 降序插入
  const priorityScore = sensorData.priority?.priorityScore || 0;
  
  // 找到插入位置（保持按優先級分數降序排列）
  const sensors = db.sensors;
  let insertIndex = sensors.length;
  
  // 線性搜尋找到正確的插入位置
  for (let i = 0; i < sensors.length; i++) {
    const currentScore = sensors[i].priority?.priorityScore || 0;
    if (priorityScore > currentScore) {
      insertIndex = i;
      break;
    }
  }
  
  // 插入數據到正確位置（保持優先級佇列順序）
  sensors.splice(insertIndex, 0, dataWithId);
  
  // 儲存到檔案
  saveDatabase();
  
  return dataWithId;
}

/**
 * 獲取所有感測器數據
 * @param {Object} options - 查詢選項
 * @returns {Object} 包含 data 和 total 的物件
 */
function getAllSensorData(options = {}) {
  let sensors = [...db.sensors]; // 複製陣列，避免修改原始資料
  
  // 根據 nodeId 篩選
  if (options.nodeId) {
    sensors = sensors.filter(data => data.nodeId === options.nodeId);
  }
  
  // 根據 sensorType 篩選
  if (options.sensorType) {
    sensors = sensors.filter(data => data.sensorType === options.sensorType);
  }
  
  // 根據優先級等級篩選
  if (options.priorityLevel) {
    sensors = sensors.filter(data => 
      data.priority?.priorityLevel === options.priorityLevel
    );
  }
  
  // 根據最小優先級分數篩選
  if (options.minPriorityScore !== undefined) {
    sensors = sensors.filter(data => 
      (data.priority?.priorityScore || 0) >= parseFloat(options.minPriorityScore)
    );
  }
  
  // 排序選項
  if (options.sortBy === 'timestamp') {
    // 按時間排序（最新的在前）
    sensors.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }
  // 預設：按優先級分數排序（資料庫中已排序，但確保順序）
  else if (options.sortBy !== 'priority') {
    // 如果沒有指定排序，保持優先級排序（資料庫中已排序）
    sensors.sort((a, b) => {
      const scoreA = a.priority?.priorityScore || 0;
      const scoreB = b.priority?.priorityScore || 0;
      return scoreB - scoreA;
    });
  }
  
  const total = sensors.length;
  
  // 分頁處理
  if (options.offset) {
    sensors = sensors.slice(options.offset);
  }
  if (options.limit) {
    sensors = sensors.slice(0, options.limit);
  }
  
  return {
    data: sensors,
    total
  };
}

/**
 * 根據 ID 獲取感測器數據
 * @param {string} id - 數據 ID
 * @returns {Object|null} 感測器數據或 null
 */
function getSensorDataById(id) {
  return db.sensors.find(data => data.id === id) || null;
}

/**
 * 獲取所有數據（用於統計）
 * @returns {Array} 所有感測器數據
 */
function getAllData() {
  return db.sensors;
}

/**
 * 清空所有數據（用於測試）
 */
function clearAllData() {
  db.sensors = [];
  db.metadata.lastId = 0;
  db.metadata.updatedAt = new Date().toISOString();
  saveDatabase();
}

/**
 * 獲取資料庫統計
 */
function getDatabaseStats() {
  return {
    totalRecords: db.sensors.length,
    lastId: db.metadata.lastId,
    createdAt: db.metadata.createdAt,
    updatedAt: db.metadata.updatedAt,
    dbPath: dbPath
  };
}

module.exports = {
  saveSensorData,
  getAllSensorData,
  getSensorDataById,
  getAllData,
  clearAllData,
  getDatabaseStats
};

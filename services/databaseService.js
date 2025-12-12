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
 * 數據按 PriorityScore 降序插入，確保高優先級數據優先處理
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
  
  for (let i = 0; i < sensors.length; i++) {
    const currentScore = sensors[i].priority?.priorityScore || 0;
    if (priorityScore > currentScore) {
      insertIndex = i;
      break;
    }
  }
  
  // 插入數據到正確位置
  sensors.splice(insertIndex, 0, dataWithId);
  
  // 儲存到檔案
  saveDatabase();
  
  return dataWithId;
}

/**
 * 獲取所有感測器數據
 */
function getAllSensorData(options = {}) {
  let sensors = [...db.sensors]; // 複製陣列
  
  // 篩選
  if (options.nodeId) {
    sensors = sensors.filter(data => data.nodeId === options.nodeId);
  }
  if (options.sensorType) {
    sensors = sensors.filter(data => data.sensorType === options.sensorType);
  }
  
  // 排序
  if (options.sortBy === 'timestamp') {
    sensors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } else {
    // 預設：按優先級排序（資料庫中已排序）
    sensors.sort((a, b) => {
      const scoreA = a.priority?.priorityScore || 0;
      const scoreB = b.priority?.priorityScore || 0;
      return scoreB - scoreA;
    });
  }
  
  const total = sensors.length;
  
  // 分頁
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
 */
function getSensorDataById(id) {
  return db.sensors.find(data => data.id === id) || null;
}

module.exports = {
  saveSensorData,
  getAllSensorData,
  getSensorDataById
};


# 社區感測器資料上傳平台 - 後端引擎

## 專案概述

這是一個社區感測器資料上傳平台的後端引擎，使用 Node.js + Express 框架開發。系統包含優先級判定引擎和上傳調度器，能夠智能處理感測器數據的上傳優先級。

## 功能特色

### 第一階段：基礎架構與 API 定義 ✅

- ✅ Node.js + Express 伺服器環境
- ✅ RESTful API 設計
  - **輸入端**：接收感測器數據（POST /api/sensors/data）
  - **輸出端**：提供數據查詢與報表（GET /api/sensors/data, GET /api/reports/*）

### 第二階段：優先級判定引擎 (Priority Engine) ✅

- ✅ **優先級計算演算法**
  - 根據三個權重計算優先級分數（0-10）：
    - 資料重要性 (Data Importance) - 權重 0.5
    - 節點狀態 (Battery) - 權重 0.3
    - 網路狀況 (Network Status) - 權重 0.2
  
- ✅ **上傳調度器 (Upload Scheduler)**
  - **Preemptive (搶佔式)**：緊急資料插隊機制，確保關鍵資料優先送達
  - **Batch (批次)**：非緊急資料打包一起送，節省資源

## 安裝與執行

### 安裝依賴

```bash
npm install
```

### 啟動伺服器

```bash
# 開發模式（使用 nodemon）
npm run dev

# 生產模式
npm start
```

伺服器預設運行於 `http://localhost:3000`

### 執行測試

```bash
npm test
```

## API 文檔

### 感測器數據 API

#### 上傳感測器數據
```
POST /api/sensors/data
```

**請求體範例：**
```json
{
  "nodeId": "node-001",
  "dataImportance": 8,
  "battery": 75,
  "timestamp": "2024-01-15T10:30:00Z",
  "networkStatus": "good",
  "sensorType": "temperature",
  "value": 25.5,
  "unit": "celsius"
}
```

**必填欄位：**
- `nodeId`: 節點 ID
- `dataImportance`: 資料重要性 (0-10)
- `battery`: 電量 (0-100)

**回應範例：**
```json
{
  "success": true,
  "message": "感測器數據上傳成功",
  "data": {
    "id": "sensor-1",
    "nodeId": "node-001",
    "dataImportance": 8,
    "battery": 75,
    "priority": {
      "priorityScore": 7.85,
      "priorityLevel": "high",
      "breakdown": {
        "importance": { "raw": 8, "normalized": 8, "weighted": 4.0 },
        "battery": { "raw": 75, "normalized": 3.5, "weighted": 1.05 },
        "network": { "status": "good", "normalized": 8, "weighted": 1.6 }
      }
    },
    "scheduleResult": {
      "scheduled": true,
      "queueType": "preemptive",
      "priority": "high",
      "message": "已加入緊急佇列，將立即處理"
    }
  }
}
```

#### 獲取所有感測器數據
```
GET /api/sensors/data
```

**查詢參數：**
- `limit`: 限制返回數量
- `offset`: 偏移量
- `nodeId`: 篩選特定節點
- `sensorType`: 篩選特定感測器類型
- `priorityLevel`: 篩選優先級等級 (critical, high, medium, low)
- `minPriorityScore`: 最小優先級分數 (0-10)
- `sortBy`: 排序方式 (priority, timestamp)

**範例：**
```
GET /api/sensors/data?sortBy=priority&limit=10&priorityLevel=critical
```

#### 獲取優先級統計
```
GET /api/sensors/priority/stats
```

### 報表 API

#### 獲取數據摘要
```
GET /api/reports/summary
```

#### 獲取統計數據
```
GET /api/reports/statistics?timeRange=all
```

**時間範圍選項：** `today`, `week`, `month`, `all`

### 調度器 API

#### 獲取上傳佇列狀態
```
GET /api/scheduler/queue
```

#### 手動觸發緊急佇列處理
```
POST /api/scheduler/process-critical
```

#### 手動觸發批次佇列處理
```
POST /api/scheduler/process-batch
```

#### 清空所有佇列
```
DELETE /api/scheduler/queue
```

## 優先級判定邏輯

### 優先級分數計算

優先級分數 = (資料重要性 × 0.5) + (電量分數 × 0.3) + (網路狀況分數 × 0.2)

### 優先級等級

- **Critical (8.0-10.0)**: 緊急資料，立即處理
- **High (6.0-8.0)**: 高優先級，優先處理
- **Medium (4.0-6.0)**: 中等優先級，批次處理
- **Low (0.0-4.0)**: 低優先級，批次處理

### 上傳調度策略

- **Preemptive (搶佔式)**：優先級分數 ≥ 7.5 或等級為 critical 的資料，立即處理
- **Batch (批次)**：其他資料加入批次佇列，每 5 秒處理一次，每批最多 10 筆

## 專案結構

```
.
├── server.js                 # 主伺服器檔案
├── controllers/              # 控制器
│   ├── sensorController.js   # 感測器控制器
│   ├── reportController.js   # 報表控制器
│   └── schedulerController.js # 調度器控制器
├── services/                 # 業務邏輯服務
│   ├── sensorService.js      # 感測器服務
│   ├── reportService.js      # 報表服務
│   ├── priorityEngine.js     # 優先級判定引擎
│   └── uploadScheduler.js    # 上傳調度器
├── routes/                   # 路由定義
│   ├── sensorRoutes.js       # 感測器路由
│   ├── reportRoutes.js       # 報表路由
│   └── schedulerRoutes.js    # 調度器路由
└── tests/                    # 測試檔案
    └── api.test.js           # API 測試
```

## 連接前端、模擬器、後端

### 快速開始

1. **啟動後端伺服器**
   ```bash
   npm start
   ```

2. **運行模擬器（自動生成數據）**
   
   **持續運行模式（推薦）：**
   ```bash
   # 自動生成數據，無限運行（按 Ctrl+C 停止）
   python tests/simulator_backend.py --continuous
   
   # 運行指定時間（例如 60 秒）
   python tests/simulator_backend.py --continuous --duration 60
   ```
   
   **固定數量模式：**
   ```bash
   python tests/simulator_backend.py --sensors 5 --messages 10
   ```
   
   **舊格式（向後兼容）：**
   ```bash
   python tests/simulator_backend.py baseline
   python tests/simulator_backend.py heavy
   python tests/simulator_backend.py spike
   ```
   
   詳細說明請查看 [模擬器使用指南](docs/simulator-guide.md)

3. **開啟前端儀表板**
   
   **方式一：使用 React 前端（推薦）**
   ```bash
   cd frontend
   npm install  # 首次執行
   npm run dev
   ```
   前端將運行於：`http://localhost:5173`
   
   **方式二：使用簡單 HTML 前端**
   - 在瀏覽器開啟 `frontend/index.html`（舊版）
   - 或使用本地伺服器：`cd frontend && python -m http.server 8080`

4. **測試連接**
   ```bash
   node test-connection.js
   ```

### 詳細說明

查看 [連接指南](docs/connection-guide.md) 了解詳細的連接步驟和 API 格式規範。

## 開發狀態

- ✅ 第一階段：基礎架構與 API 定義
- ✅ 第二階段：優先級判定引擎
- ✅ 前端、模擬器、後端連接與統一格式
- ⏳ 第三階段：資料庫與串接（待實作）
- ⏳ 第四階段：效能優化（待實作）

## 授權

ISC

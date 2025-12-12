# 社區感測器資料上傳平台 - 後端引擎

## 專案簡介

本專案為社區感測器資料上傳平台的後端引擎，負責接收感測器數據、處理優先級判定、以及提供 API 給前端儀表板使用。

**✅ 已修復「靈肉分離」問題：**
- 前端已完全連接後端 API（移除 Firebase）
- 後端實作優先級引擎和資料庫持久化
- 模擬器真實發送 HTTP 請求

## 專案結構

```
.
├── server.js              # 主程式入口
├── routes/                # API 路由定義
│   ├── sensorRoutes.js   # 感測器相關路由
│   └── reportRoutes.js   # 報表相關路由
├── controllers/           # 控制器（處理業務邏輯）
│   ├── sensorController.js
│   └── reportController.js
├── services/              # 服務層（資料處理）
│   ├── sensorService.js
│   ├── reportService.js
│   ├── priorityEngine.js  # 優先級判定引擎 ⭐
│   └── databaseService.js # 資料庫服務（JSON 持久化）⭐
├── data/                  # 資料庫檔案
│   └── sensor-data.json   # 感測器數據（自動生成）
├── tests/                 # 測試檔案
│   ├── api.test.js        # API 測試
│   └── simulator_backend.py  # 數據模擬器（真實發送 HTTP 請求）⭐
└── App.jsx                # 前端應用（連接後端 API）⭐
```

## 安裝與執行

### 1. 安裝依賴

```bash
npm install
```

### 2. 啟動伺服器

開發模式（自動重啟）：
```bash
npm run dev
```

生產模式：
```bash
npm start
```

伺服器預設運行於 `http://localhost:3000`

### 3. 運行模擬器（可選）

```bash
# 持續運行模式
python tests/simulator_backend.py --continuous

# 固定數量模式
python tests/simulator_backend.py --sensors 5 --messages 10

# 指定場景
python tests/simulator_backend.py --scenario heavy --continuous
```

### 4. 開啟前端（可選）

```bash
# 進入前端目錄
cd frontend

# 安裝依賴（首次執行）
npm install

# 啟動前端開發伺服器
npm run dev
```

前端將運行於 `http://localhost:5173`

## API 文檔

### 輸入端 API（給模擬器用）

#### POST /api/sensors/data
上傳感測器數據（**會經過優先級引擎處理**）

**請求體：**
```json
{
  "nodeId": "S-001",
  "dataImportance": 8.5,
  "battery": 75,
  "timestamp": "2024-01-15T10:30:00Z",
  "networkStatus": "good",
  "sensorType": "temperature",
  "value": 25.5,
  "unit": "celsius",
  "periodic": {
    "temperature": 25.5,
    "humidity": 65.2,
    "AQI": 45
  },
  "metadata": {}
}
```

**必填欄位：**
- `nodeId`: 節點 ID（字串）
- `dataImportance`: 資料重要性（0-10 的數字）
- `battery`: 電量（0-100 的數字）

**回應：**
```json
{
  "success": true,
  "message": "感測器數據上傳成功",
  "data": {
    "id": "sensor-1",
    "nodeId": "S-001",
    "priority": {
      "priorityScore": 7.85,
      "priorityLevel": "high",
      "breakdown": {
        "importance": { "raw": 8.5, "normalized": 8.5, "weighted": 4.25 },
        "battery": { "raw": 75, "normalized": 2.5, "weighted": 0.75 },
        "network": { "status": "good", "normalized": 8, "weighted": 1.6 }
      }
    },
    ...
  }
}
```

### 輸出端 API（給前端儀表板用）

#### GET /api/sensors/data
獲取所有感測器數據（**已按優先級排序**）

**查詢參數：**
- `limit`: 限制返回數量
- `offset`: 偏移量
- `nodeId`: 篩選特定節點
- `sensorType`: 篩選特定感測器類型
- `sortBy`: 排序方式（`priority` 或 `timestamp`）

**範例：**
```
GET /api/sensors/data?limit=10&sortBy=priority
```

#### GET /api/sensors/data/:id
根據 ID 獲取特定感測器數據

#### GET /api/sensors/node/:nodeId
根據節點 ID 獲取該節點的所有數據

#### GET /api/reports/summary
獲取數據摘要報表

#### GET /api/reports/statistics
獲取統計數據報表

**查詢參數：**
- `timeRange`: 時間範圍 (today, week, month, all)

**範例：**
```
GET /api/reports/statistics?timeRange=week
```

### 其他端點

#### GET /
API 文檔與端點列表

#### GET /health
健康檢查端點

## 優先級判定引擎

### 優先級分數計算公式

```
PriorityScore = W_imp × Importance + W_bat × (100 - Battery)/10 + W_net × Network

其中：
- W_imp = 0.5 (資料重要性權重)
- W_bat = 0.3 (電量權重，電越少越急)
- W_net = 0.2 (網路狀況權重)
```

### 優先級等級

- **Critical (8.0-10.0)**: 緊急資料，立即處理
- **High (6.0-8.0)**: 高優先級，優先處理
- **Medium (4.0-6.0)**: 中等優先級，批次處理
- **Low (0.0-4.0)**: 低優先級，批次處理

### 優先級佇列

數據在儲存時會**按 PriorityScore 降序插入**，確保：
- 高優先級數據永遠在前面
- 查詢時直接返回排序好的數據
- 真正的優先級佇列實作

## 資料庫持久化

- **儲存位置**: `data/sensor-data.json`
- **格式**: JSON
- **特點**: 
  - 重啟伺服器後資料不會消失
  - 自動按優先級排序
  - 自動生成 ID

## 測試

執行測試：
```bash
npm test
```

## 系統架構

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   模擬器    │ ──────> │   後端 API  │ <────── │   前端      │
│  (Python)   │  POST   │  (Node.js)  │  GET    │  (App.jsx)  │
└─────────────┘         └─────────────┘         └─────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  優先級引擎     │ ⭐
                    │  資料庫服務     │ ⭐
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  data/          │
                    │  sensor-data.json│
                    └─────────────────┘
```

## 已修復的問題

### ✅ 1. 刪除無用檔案
- ❌ `tests/analyze.py` - 已刪除（只分析 CSV，與新系統無關）
- ❌ `tests/simulator.py` - 已刪除（只寫 CSV，沒有真實發送）
- ✅ `tests/simulator_backend.py` - 保留（真實發送 HTTP 請求）

### ✅ 2. 前端連接後端 API
- ✅ `App.jsx` - 已完全移除 Firebase
- ✅ 使用 `fetch()` 連接後端 API (`http://localhost:3000`)
- ✅ 上傳功能：`POST /api/sensors/data`
- ✅ 查詢功能：`GET /api/sensors/data`

### ✅ 3. 後端優先級引擎
- ✅ `services/priorityEngine.js` - 實作優先級計算
- ✅ 數據上傳時自動計算優先級
- ✅ 優先級佇列：按 PriorityScore 排序插入

### ✅ 4. 資料庫持久化
- ✅ `services/databaseService.js` - JSON 檔案持久化
- ✅ 重啟伺服器後資料不會消失
- ✅ 自動按優先級排序

## 開發階段

- ✅ **第一階段**：基礎架構與 API 定義
- ✅ **第二階段**：優先級判定引擎
- ✅ **第三階段**：資料庫與串接
- ⏳ **第四階段**：效能優化（待實作）

## 技術棧

- Node.js
- Express.js
- CORS
- Body Parser
- JSON 檔案資料庫（自實作）

## 注意事項

1. **資料庫檔案**: `data/sensor-data.json` 會自動創建，不要手動刪除
2. **後端必須先啟動**: 前端和模擬器都需要後端運行在 `http://localhost:3000`
3. **舊版檔案**: `App.jsx.firebase.backup` 是舊版 Firebase 版本的備份

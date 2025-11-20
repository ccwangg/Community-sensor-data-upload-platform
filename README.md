# 社區感測器資料上傳平台 - 後端引擎

## 專案簡介

本專案為社區感測器資料上傳平台的後端引擎，負責接收感測器數據、處理優先級判定、以及提供 API 給前端儀表板使用。

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
│   └── reportService.js
└── tests/                 # 測試檔案
    └── api.test.js
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

## API 文檔

### 輸入端 API（給模擬器用）

#### POST /api/sensors/data
上傳感測器數據

**請求體：**
```json
{
  "nodeId": "node-001",
  "dataImportance": 8,
  "battery": 75,
  "timestamp": "2024-01-15T10:30:00Z",
  "networkStatus": "good",
  "sensorType": "temperature",
  "value": 25.5,
  "unit": "celsius",
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
    "nodeId": "node-001",
    ...
  }
}
```

### 輸出端 API（給前端儀表板用）

#### GET /api/sensors/data
獲取所有感測器數據

**查詢參數：**
- `limit`: 限制返回數量
- `offset`: 偏移量
- `nodeId`: 篩選特定節點
- `sensorType`: 篩選特定感測器類型

**範例：**
```
GET /api/sensors/data?limit=10&nodeId=node-001
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

## 測試

執行測試：
```bash
npm test
```

## 開發階段

- ✅ **第一階段**：基礎架構與 API 定義（目前階段）
- ⏳ **第二階段**：優先級判定引擎
- ⏳ **第三階段**：資料庫與串接
- ⏳ **第四階段**：效能優化

## 技術棧

- Node.js
- Express.js
- CORS
- Body Parser


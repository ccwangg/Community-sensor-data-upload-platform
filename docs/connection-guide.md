# 前端、模擬器、後端連接指南

## 系統架構

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   模擬器    │ ──────> │   後端 API  │ <────── │   前端      │
│ (Python)    │  POST   │  (Node.js)  │  GET    │  (HTML/JS)  │
└─────────────┘         └─────────────┘         └─────────────┘
```

## 啟動順序

### 1. 啟動後端伺服器

```bash
# 進入專案目錄
cd "c:\CSIE\computer network\final_project"

# 安裝依賴（如果還沒安裝）
npm install

# 啟動伺服器
npm start
# 或開發模式（自動重啟）
npm run dev
```

伺服器將運行於：`http://localhost:3000`

### 2. 運行模擬器

```bash
# 進入專案目錄
cd "c:\CSIE\computer network\final_project"

# 安裝 Python 依賴（如果還沒安裝）
pip install requests

# 運行模擬器
python tests/simulator_backend.py baseline

# 或指定其他場景
python tests/simulator_backend.py heavy
python tests/simulator_backend.py spike

# 或指定自訂後端 URL
python tests/simulator_backend.py baseline http://localhost:3000
```

### 3. 開啟前端儀表板

**方式一：使用 React 前端（推薦）**

```bash
# 進入前端目錄
cd frontend

# 安裝依賴（首次執行）
npm install

# 啟動開發伺服器
npm run dev
```

前端將運行於：`http://localhost:5173`

**方式二：使用簡單 HTML 前端**

1. 使用瀏覽器開啟 `frontend/index.html`（舊版）
2. 或使用本地伺服器：
   ```bash
   cd frontend
   python -m http.server 8080
   ```

## 統一 JSON 格式

### 模擬器發送格式

模擬器會自動將數據轉換為後端 API 格式：

```json
{
  "nodeId": "S-001",
  "dataImportance": 8.5,
  "battery": 75.0,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "networkStatus": "good",
  "sensorType": "temperature",
  "value": 25.5,
  "unit": "celsius",
  "periodic": {
    "temperature": 25.5,
    "humidity": 65.2,
    "rain_prob": 0.3,
    "wind_speed": 5.2,
    "wind_dir": "E",
    "pressure": 1013.5,
    "AQI": 45,
    "noise": 55,
    "traffic": "MEDIUM",
    "notice": "none"
  },
  "emergency": null,
  "metadata": {
    "personal_id": "uuid-string",
    "scenario_id": "baseline",
    "send_unix": 1705312200.123
  }
}
```

### 後端回應格式

**成功回應：**
```json
{
  "success": true,
  "message": "感測器數據上傳成功",
  "data": {
    "id": "sensor-1",
    "nodeId": "S-001",
    "dataImportance": 8.5,
    "battery": 75.0,
    "priority": {
      "priorityScore": 7.85,
      "priorityLevel": "high",
      "breakdown": { ... }
    },
    "scheduleResult": {
      "scheduled": true,
      "queueType": "preemptive",
      "priority": "high"
    },
    ...
  }
}
```

**錯誤回應：**
```json
{
  "success": false,
  "error": {
    "message": "錯誤訊息",
    "status": 400
  }
}
```

### 前端接收格式

前端從後端獲取的數據格式：

```json
{
  "success": true,
  "count": 10,
  "total": 100,
  "data": [
    {
      "id": "sensor-1",
      "nodeId": "S-001",
      "priority": {
        "priorityScore": 7.85,
        "priorityLevel": "high"
      },
      ...
    }
  ]
}
```

## API 端點

### 模擬器使用

- **POST** `/api/sensors/data` - 上傳感測器數據

### 前端使用

- **GET** `/api/sensors/data` - 獲取所有感測器數據
  - 查詢參數：
    - `sortBy`: `priority` 或 `timestamp`
    - `limit`: 限制返回數量
    - `priorityLevel`: `critical`, `high`, `medium`, `low`
  
- **GET** `/api/reports/summary` - 獲取數據摘要
  
- **GET** `/api/reports/statistics` - 獲取統計數據
  - 查詢參數：
    - `timeRange`: `today`, `week`, `month`, `all`

- **GET** `/api/sensors/priority/stats` - 獲取優先級統計

- **GET** `/health` - 健康檢查

## 測試連接

### 1. 測試後端

```bash
# 健康檢查
curl http://localhost:3000/health

# 或使用瀏覽器開啟
http://localhost:3000/health
```

### 2. 測試模擬器連接

運行模擬器後，檢查：
- 控制台輸出是否顯示成功訊息
- 後端控制台是否收到請求
- 檢查 `report/simulator_results_*.json` 文件

### 3. 測試前端

開啟前端頁面後：
- 檢查右上角狀態指示器是否為綠色（已連接）
- 檢查數據是否正常顯示
- 檢查自動刷新是否正常（每 5 秒）

## 常見問題

### 1. 模擬器連接失敗

**問題：** `Connection refused` 或 `無法連接`

**解決：**
- 確認後端伺服器已啟動
- 檢查後端 URL 是否正確（預設：`http://localhost:3000`）
- 檢查防火牆設定

### 2. 前端無法載入數據

**問題：** 前端顯示「連接失敗」

**解決：**
- 確認後端伺服器已啟動
- 檢查瀏覽器控制台是否有 CORS 錯誤
- 確認 API_BASE_URL 設定正確（`frontend/index.html` 中的 `API_BASE_URL`）

### 3. 數據格式不匹配

**問題：** 後端返回驗證錯誤

**解決：**
- 確認模擬器使用最新版本（`simulator_backend.py`）
- 檢查必填欄位：`nodeId`, `dataImportance`, `battery`
- 確認 `dataImportance` 範圍為 0-10

## 數據流程

1. **模擬器生成數據** → 使用 `dataLoading()` 函數生成符合格式的數據
2. **發送到後端** → 使用 `sendToBackend()` 函數發送 POST 請求
3. **後端處理** → 計算優先級、加入調度器、儲存數據
4. **前端查詢** → 定期發送 GET 請求獲取最新數據
5. **前端顯示** → 將數據渲染到儀表板

## 下一步

- 查看 `docs/api-specification.md` 了解詳細的 API 格式規範
- 查看 `README.md` 了解專案整體架構
- 運行測試：`npm test`


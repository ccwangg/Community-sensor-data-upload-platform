# 系統修復總結

## 修復的問題

### 1. ✅ 資料庫持久化（解決「金魚腦」問題）

**問題：** 使用記憶體陣列 `sensorDataStore = []`，重啟後資料全部消失

**解決方案：**
- 實作 `services/databaseService.js` 使用 **lowdb** 將資料持久化到本地檔案
- 資料儲存在 `data/sensor-data.json`
- 重啟伺服器後資料不會消失

**實作細節：**
```javascript
// 使用 lowdb 將資料寫入 JSON 檔案
const db = low(new FileSync('data/sensor-data.json'));
db.get('sensors').push(dataWithId).write();
```

**驗證方式：**
1. 上傳一些數據
2. 重啟伺服器
3. 查詢數據，應該還在

### 2. ✅ 真正的優先級佇列（解決「VIP 通道是假的」問題）

**問題：** 雖然計算了優先級，但儲存時只是簡單 `push()`，沒有按優先級排序

**解決方案：**
- 資料庫服務在插入時按 `PriorityScore` 降序排序
- 高優先級數據自動插入到前面
- 查詢時直接從資料庫讀取，已經是排序好的

**優先級公式：**
```
PriorityScore = W_imp × Importance + W_bat × (100 - Battery)/10 + W_net × Network

其中：
- W_imp = 0.5 (資料重要性權重)
- W_bat = 0.3 (電量權重，電越少越急)
- W_net = 0.2 (網路狀況權重)
```

**實作細節：**
```javascript
// 找到正確的插入位置（保持優先級排序）
for (let i = 0; i < sensors.length; i++) {
  if (priorityScore > sensors[i].priority?.priorityScore) {
    insertIndex = i;
    break;
  }
}
// 插入到正確位置
db.get('sensors').splice(insertIndex, 0, dataWithId).write();
```

**驗證方式：**
1. 上傳不同優先級的數據
2. 查詢數據，應該按優先級分數降序排列
3. 高優先級數據應該在前面

### 3. ✅ 前端後端連接（已解決）

**問題：** 前端連 Firebase，後端用記憶體，兩者沒連接

**現狀：** ✅ 已解決
- 前端 `App.jsx` 已改為連接後端 API (`http://localhost:3000`)
- 沒有 Firebase 相關代碼
- 前端使用 `fetch()` 從後端獲取數據

**驗證方式：**
- 檢查 `frontend/src/App.jsx`，應該看到 `API_BASE_URL = 'http://localhost:3000'`
- 沒有 `firebase` 或 `firestore` 相關 import

### 4. ✅ 模擬器真實發送（已解決）

**問題：** 舊的 `simulator.py` 只是假發送，沒有真的發 HTTP 請求

**現狀：** ✅ 已解決
- `simulator_backend.py` 使用 `requests.post()` 真實發送 HTTP 請求
- 連接到 `http://localhost:3000/api/sensors/data`

**驗證方式：**
- 檢查 `tests/simulator_backend.py` 的 `sendToBackend()` 函數
- 應該看到 `requests.post(API_ENDPOINT, json=payload)`

## 新增功能

### 資料庫 API

- `GET /api/database/stats` - 獲取資料庫統計
- `DELETE /api/database/clear` - 清空資料庫（僅用於測試）

### 資料庫檔案位置

- 資料庫檔案：`data/sensor-data.json`
- 自動創建資料目錄
- 資料格式：JSON

## 測試驗證

### 測試 1：資料持久化

```bash
# 1. 啟動伺服器
npm start

# 2. 上傳一些數據（使用模擬器或 API）
python tests/simulator_backend.py --sensors 3 --messages 5

# 3. 停止伺服器（Ctrl+C）

# 4. 重新啟動伺服器
npm start

# 5. 查詢數據
curl http://localhost:3000/api/sensors/data

# 應該還能看到之前的數據
```

### 測試 2：優先級佇列

```bash
# 上傳不同優先級的數據
curl -X POST http://localhost:3000/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"S-001","dataImportance":9,"battery":10,"networkStatus":"good"}'

curl -X POST http://localhost:3000/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"S-002","dataImportance":2,"battery":90,"networkStatus":"excellent"}'

# 查詢數據（應該按優先級排序）
curl "http://localhost:3000/api/sensors/data?sortBy=priority"

# 第一個應該是 S-001（高優先級），第二個是 S-002（低優先級）
```

### 測試 3：前端後端連接

```bash
# 1. 啟動後端
npm start

# 2. 啟動前端
cd frontend && npm run dev

# 3. 打開瀏覽器訪問 http://localhost:5173
# 4. 應該能看到數據（如果後端有數據）
# 5. 右上角應該顯示「✅ 已連接」
```

### 測試 4：模擬器真實發送

```bash
# 1. 啟動後端
npm start

# 2. 運行模擬器
python tests/simulator_backend.py --continuous --duration 10

# 3. 查看後端控制台，應該看到請求日誌
# 4. 查詢數據，應該有新增的數據
curl http://localhost:3000/api/sensors/data
```

## 資料庫結構

```json
{
  "sensors": [
    {
      "id": "sensor-1",
      "nodeId": "S-001",
      "dataImportance": 8.5,
      "battery": 75,
      "priority": {
        "priorityScore": 7.85,
        "priorityLevel": "high"
      },
      "timestamp": "2024-01-15T10:30:00.000Z",
      ...
    }
  ],
  "metadata": {
    "lastId": 1,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 注意事項

1. **資料庫檔案位置**：`data/sensor-data.json`
2. **自動備份**：建議定期備份 `data/` 目錄
3. **資料遷移**：如果需要遷移到其他資料庫（如 MongoDB），可以從 JSON 檔案匯入
4. **效能考量**：lowdb 適合中小型數據量，如果數據量很大，建議升級到 MongoDB 或 PostgreSQL

## 下一步優化建議

1. **資料庫升級**：當數據量超過 10,000 筆時，考慮升級到 MongoDB
2. **索引優化**：為常用查詢欄位建立索引
3. **資料備份**：實作自動備份機制
4. **資料清理**：實作舊資料自動清理機制


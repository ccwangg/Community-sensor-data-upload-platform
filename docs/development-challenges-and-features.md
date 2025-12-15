# 實作過程中的困難與後端功能總結

> 本文件整理整個專案開發過程中遇到的困難、解決方案，以及後端實際實現的功能，供期末報告使用。

---

## 📋 目錄

1. [實作過程中遇到的困難](#實作過程中遇到的困難)
2. [後端實際實現的功能](#後端實際實現的功能)
3. [技術亮點](#技術亮點)
4. [學習收穫](#學習收穫)

---

## 實作過程中遇到的困難

### 困難 1：架構「靈肉分離」問題 ⚠️

**問題描述：**
- 前端直接連接 Firebase，後端使用記憶體陣列
- 模擬器只寫入 CSV 檔案，沒有真正發送 HTTP 請求
- 優先級引擎雖然寫好了，但從未被使用
- 整個系統「各做各的」，完全不符合簡報架構

**影響：**
- 後端 API 寫得很完整，但真實用戶根本碰不到
- 優先級判定引擎形同虛設
- 系統無法真正運作

**解決方案：**
1. **模擬器改造**
   - 將 `tests/simulator.py` 改寫為 `tests/simulator_backend.py`
   - 使用 Python `requests` 套件發送真實 HTTP POST 請求
   - 確保欄位名稱對齊（`nodeId`, `dataImportance`, `battery`）
   - 包含完整的 `periodic` 數據供前端圖表使用

2. **前端連接修正**
   - 移除所有 Firebase 依賴
   - 修改 `frontend/src/App.jsx` 使用後端 API
   - 數據讀取：`fetch('http://localhost:3000/api/sensors/data')`
   - 數據上傳：`POST /api/sensors/data`

3. **後端資料庫整合**
   - 實作 `services/databaseService.js` 使用 JSON 檔案持久化
   - 確保優先級引擎在保存數據時被調用
   - 實現真正的優先級佇列（按優先級分數排序插入）

**學習心得：**
- 架構設計的重要性：必須確保各組件真正連接，而不是「看起來有做」
- 端到端測試的必要性：不能只測試單一組件，要測試整個流程
- 文檔與實作的一致性：簡報說的架構必須在程式碼中真正實現

---

### 困難 2：資料庫持久化問題（「金魚腦」問題）💾

**問題描述：**
- 最初使用記憶體陣列 `const sensorDataStore = []` 儲存數據
- 伺服器重啟後，所有數據全部消失
- 無法進行長期數據分析

**影響：**
- 每次重啟都要重新上傳數據
- 無法進行歷史數據分析
- 不符合實際應用場景

**解決方案：**
1. **實作 JSON 檔案持久化**
   - 創建 `services/databaseService.js`
   - 使用 Node.js `fs` 模組讀寫 JSON 檔案
   - 數據儲存在 `data/sensor-data.json`

2. **資料結構設計**
   ```json
   {
     "sensors": [...],
     "metadata": {
       "lastId": 1,
       "createdAt": "...",
       "updatedAt": "..."
     }
   }
   ```

3. **自動備份機制**
   - 每次寫入前先讀取現有數據
   - 合併新數據後寫回檔案
   - 確保數據不遺失

**學習心得：**
- 持久化是系統的基本需求，不能只考慮功能實現
- 資料結構設計要考慮擴展性
- 檔案 I/O 操作要注意錯誤處理

---

### 困難 3：優先級佇列「VIP 通道是假的」問題 🎯

**問題描述：**
- 雖然計算了優先級分數，但儲存時只是簡單 `push()` 到陣列
- 高優先級數據和低優先級數據混在一起
- 查詢時需要額外排序，效率低

**影響：**
- 優先級機制形同虛設
- 無法真正實現「高優先級先處理」的邏輯
- 查詢效率低

**解決方案：**
1. **實現真正的優先級佇列**
   - 在 `databaseService.js` 中，插入數據時找到正確位置
   - 按 `PriorityScore` 降序排序插入
   - 高優先級數據自動排在前面

2. **插入演算法**
   ```javascript
   // 找到正確的插入位置（保持優先級排序）
   let insertIndex = sensors.length;
   for (let i = 0; i < sensors.length; i++) {
     if (priorityScore > sensors[i].priority?.priorityScore) {
       insertIndex = i;
       break;
     }
   }
   // 插入到正確位置
   sensors.splice(insertIndex, 0, dataWithId);
   ```

3. **查詢優化**
   - 查詢時直接返回已排序的數據
   - 不需要額外排序操作

**學習心得：**
- 數據結構的選擇很重要：要根據使用場景選擇合適的結構
- 插入時排序比查詢時排序更高效
- 優先級機制要從設計層面就考慮，而不是事後補救

---

### 困難 4：前端即時更新問題 🔄

**問題描述：**
- 前端圖表不顯示數據（壓力、噪音、風速/風向）
- 數據上傳後前端不會即時更新
- 總筆數欄位不會動

**影響：**
- 用戶體驗差
- 無法即時監控數據變化
- 系統看起來「不活」

**解決方案：**
1. **圖表顯示問題**
   - 重構圖表渲染邏輯，使用 `ChartContainer` 組件
   - 確保所有圖表都能正確處理空數據狀態
   - 修正數據欄位對應（`pressure`, `noiseLevel`, `windSpeed` 等）

2. **即時更新機制**
   - 前端輪詢間隔從 5 秒縮短到 2 秒
   - 添加快取破壞參數 `_t=${timestamp}` 防止瀏覽器快取
   - 添加 `Cache-Control` 標頭
   - 上傳後立即調用 `loadData()` 強制刷新

3. **後端快取優化**
   - 縮短快取 TTL（sensors: 2 秒，summary: 2 秒）
   - 改善快取清除邏輯，確保新數據能即時顯示
   - 清除所有可能的快取鍵組合

**學習心得：**
- 前端和後端的快取策略要協調一致
- 即時更新需要考慮多個層面：輪詢、快取、數據格式
- 用戶體驗的細節很重要

---

### 困難 5：性能優化與測試 🚀

**問題描述：**
- 如何證明優化確實有效？
- 如何量化優化效果？
- 如何生成可用的測試報告？

**影響：**
- 無法在報告中證明優化效果
- 不知道優化是否真的有用
- 缺乏數據支撐

**解決方案：**
1. **性能監控中間件**
   - 實作 `middleware/performanceMonitor.js`
   - 自動記錄所有 API 請求回應時間
   - 計算統計指標（平均、P50、P95、P99）

2. **性能測試工具**
   - 創建 `tests/performance-test.js` 基礎性能測試
   - 創建 `tests/performance-comparison.js` 對比測試
   - 自動生成 JSON 和 Markdown 報告

3. **快取統計**
   - 實作快取命中率統計
   - 提供 `GET /api/performance/stats` API
   - 實時查看系統性能指標

**學習心得：**
- 優化要有數據支撐，不能只憑感覺
- 對比測試比單次測試更有說服力
- 自動化測試報告能節省大量時間

---

### 困難 6：資料格式不一致問題 📝

**問題描述：**
- 模擬器使用 `sensor_id`，後端期望 `nodeId`
- 模擬器使用 `priority_hint['severity']`，後端期望 `dataImportance`
- 前端需要 `periodic` 數據，但模擬器沒有提供

**影響：**
- 數據無法正確解析
- 前端圖表無法顯示
- 系統無法正常運作

**解決方案：**
1. **統一資料格式**
   - 定義標準的 API 資料格式
   - 模擬器按照標準格式發送
   - 前端按照標準格式解析

2. **資料驗證**
   - 在後端添加資料驗證邏輯
   - 確保必要欄位存在
   - 提供清晰的錯誤訊息

3. **文檔化**
   - 在 README 中明確說明資料格式
   - 提供範例資料
   - 標註必填欄位和選填欄位

**學習心得：**
- 資料格式要從一開始就定義清楚
- 前後端要統一資料格式規範
- 文檔化能避免很多問題

---

## 後端實際實現的功能

### 1. 核心服務層 (Services)

#### 1.1 優先級判定引擎 (`services/priorityEngine.js`) ⭐

**功能：**
- 根據三個權重計算優先級分數（0-10）
  - 資料重要性 (Data Importance) - 權重 0.5
  - 節點電量 (Battery) - 權重 0.3
  - 網路狀況 (Network Status) - 權重 0.2
- 優先級等級分類（Critical, High, Medium, Low）
- 演算法優化：減少函數調用，直接計算

**優先級公式：**
```
PriorityScore = W_imp × Importance + W_bat × (100 - Battery)/10 + W_net × Network
```

**API：**
- `calculatePriority(dataImportance, battery, networkStatus)` - 計算優先級

**技術亮點：**
- 使用查表法加速網路狀態查詢
- 單次計算完成，無需多次函數調用
- 支援詳細分解模式（用於調試）

---

#### 1.2 資料庫服務 (`services/databaseService.js`) 💾

**功能：**
- JSON 檔案持久化（使用 Node.js `fs` 模組）
- 優先級佇列：按優先級分數降序插入
- 自動 ID 生成
- 資料統計功能

**主要方法：**
- `saveSensorData(data)` - 保存感測器數據（自動排序）
- `getAllData()` - 獲取所有數據
- `getDataById(id)` - 根據 ID 獲取數據
- `getDatabaseStats()` - 獲取資料庫統計

**技術亮點：**
- 插入時排序，查詢時無需額外排序
- 自動備份機制
- 支援資料庫清理和統計

---

#### 1.3 上傳調度器 (`services/uploadScheduler.js`) 📤

**功能：**
- 優先級佇列管理（Critical, High, Medium, Low）
- 搶佔式調度：高優先級數據優先處理
- 批次處理：低優先級數據批量處理
- 佇列狀態查詢

**主要方法：**
- `addToQueue(data)` - 添加到佇列
- `processCriticalQueue()` - 處理緊急佇列
- `processBatchQueue()` - 處理批次佇列
- `getQueueStatus()` - 獲取佇列狀態

**技術亮點：**
- 使用 `setImmediate` 實現非阻塞處理
- 支援手動觸發處理
- 佇列狀態即時查詢

---

#### 1.4 快取服務 (`services/cacheService.js`) ⚡

**功能：**
- 記憶體快取（Map 資料結構）
- TTL (Time To Live) 自動過期機制
- 快取統計（命中率、大小等）
- 定期清理過期項目

**主要方法：**
- `get(key)` - 獲取快取值
- `set(key, value, ttl)` - 設置快取值
- `delete(key)` - 刪除快取值
- `getStats()` - 獲取快取統計

**快取策略：**
- 感測器數據：2 秒 TTL（即時更新）
- 報表摘要：2 秒 TTL
- 優先級統計：5 秒 TTL

**技術亮點：**
- 自動過期機制
- 快取命中率統計
- 定期清理過期項目（每 5 分鐘）

---

#### 1.5 非同步處理服務 (`services/asyncProcessor.js`) 🔄

**功能：**
- 使用 `setImmediate` 實現非阻塞處理
- 優先級計算非同步化
- 任務佇列管理
- 批量並行處理

**主要方法：**
- `processAsync(fn, ...args)` - 非同步處理函數
- `processBatch(fns)` - 批量處理
- `getQueueStatus()` - 獲取佇列狀態

**技術亮點：**
- 不阻塞主線程
- 提升系統吞吐量
- 支援批量處理

---

#### 1.6 感測器服務 (`services/sensorService.js`) 🔌

**功能：**
- 整合所有服務（優先級引擎、資料庫、調度器、快取）
- 感測器數據的完整生命週期管理
- 查詢和篩選功能

**主要方法：**
- `saveSensorData(data)` - 保存數據（整合優先級計算、資料庫、快取清除）
- `getAllSensorData(options)` - 獲取數據（支援篩選、排序、分頁）
- `getPriorityStatistics()` - 獲取優先級統計

**技術亮點：**
- 服務整合，單一入口點
- 自動快取管理
- 支援複雜查詢

---

#### 1.7 報表服務 (`services/reportService.js`) 📊

**功能：**
- 數據摘要報表
- 統計數據報表（支援時間範圍篩選）
- 單次遍歷計算所有統計（效能優化）

**主要方法：**
- `getSummary()` - 獲取數據摘要
- `getStatistics(timeRange)` - 獲取統計數據

**統計內容：**
- 總數據數、節點數、平均電量
- 感測器類型分布
- 網路狀況分布
- 節點統計（按節點分組）

**技術亮點：**
- 單次遍歷計算，效能優化
- 支援時間範圍篩選
- 快取機制

---

### 2. 控制器層 (Controllers)

#### 2.1 感測器控制器 (`controllers/sensorController.js`)

**功能：**
- 處理感測器數據的 CRUD 操作
- 資料驗證
- 錯誤處理

**API 端點：**
- `POST /api/sensors/data` - 上傳感測器數據
- `GET /api/sensors/data` - 獲取所有數據（支援查詢參數）
- `GET /api/sensors/data/:id` - 獲取特定數據
- `GET /api/sensors/node/:nodeId` - 獲取節點數據
- `GET /api/sensors/priority/stats` - 獲取優先級統計

**查詢參數支援：**
- `limit`, `offset` - 分頁
- `nodeId`, `sensorType` - 篩選
- `priorityLevel`, `minPriorityScore` - 優先級篩選
- `sortBy` - 排序（priority, timestamp）

---

#### 2.2 報表控制器 (`controllers/reportController.js`)

**功能：**
- 處理報表相關請求
- 數據摘要和統計

**API 端點：**
- `GET /api/reports/summary` - 獲取數據摘要
- `GET /api/reports/statistics?timeRange=all` - 獲取統計數據

**時間範圍選項：**
- `today` - 今天
- `week` - 最近一週
- `month` - 最近一個月
- `all` - 全部（預設）

---

#### 2.3 調度器控制器 (`controllers/schedulerController.js`)

**功能：**
- 管理上傳佇列
- 手動觸發佇列處理

**API 端點：**
- `GET /api/scheduler/queue` - 獲取佇列狀態
- `POST /api/scheduler/process-critical` - 處理緊急佇列
- `POST /api/scheduler/process-batch` - 處理批次佇列
- `DELETE /api/scheduler/queue` - 清空所有佇列

---

#### 2.4 資料庫控制器 (`controllers/databaseController.js`)

**功能：**
- 資料庫管理
- 資料庫統計

**API 端點：**
- `GET /api/database/stats` - 獲取資料庫統計
- `DELETE /api/database/clear` - 清空資料庫（僅用於測試）

---

### 3. 中間件層 (Middleware)

#### 3.1 效能監控中間件 (`middleware/performanceMonitor.js`) 📈

**功能：**
- 自動記錄所有 API 請求回應時間
- 計算統計指標（平均、P50、P95、P99）
- 提供效能統計 API

**API 端點：**
- `GET /api/performance/stats` - 獲取效能統計
- `POST /api/performance/reset` - 重置統計
- `POST /api/cache/clear` - 清除快取

**統計內容：**
- 總請求數
- 平均回應時間
- P50, P95, P99 百分位數
- 最小/最大回應時間
- 快取統計（命中率、大小等）

---

### 4. 路由層 (Routes)

**功能：**
- RESTful API 路由定義
- 路由與控制器的對應
- 中間件整合

**路由檔案：**
- `routes/sensorRoutes.js` - 感測器路由
- `routes/reportRoutes.js` - 報表路由
- `routes/schedulerRoutes.js` - 調度器路由
- `routes/databaseRoutes.js` - 資料庫路由

---

### 5. 主伺服器 (`server.js`)

**功能：**
- Express 伺服器設定
- 中間件配置（CORS, Body Parser, 效能監控）
- 路由註冊
- 錯誤處理
- 健康檢查端點

**端點：**
- `GET /` - API 文檔
- `GET /health` - 健康檢查

---

## 技術亮點

### 1. 優先級判定演算法 ⭐

- **多因素綜合評估**：資料重要性、節點電量、網路狀況
- **權重可調整**：根據實際需求調整權重
- **演算法優化**：減少函數調用，直接計算

### 2. 真正的優先級佇列 🎯

- **插入時排序**：高優先級數據自動排在前面
- **查詢效率高**：無需額外排序操作
- **支援搶佔式調度**：高優先級數據優先處理

### 3. 快取機制 ⚡

- **記憶體快取**：提升查詢速度
- **TTL 機制**：自動過期，確保數據新鮮度
- **快取統計**：命中率監控，優化快取策略

### 4. 非同步處理 🔄

- **非阻塞處理**：使用 `setImmediate` 不阻塞主線程
- **提升吞吐量**：並行處理多個請求
- **任務佇列管理**：有序處理任務

### 5. 效能監控 📈

- **自動記錄**：所有 API 請求自動記錄
- **統計指標**：P50, P95, P99 百分位數
- **實時查詢**：透過 API 查詢效能統計

### 6. 資料持久化 💾

- **JSON 檔案**：簡單可靠的持久化方案
- **自動備份**：確保數據不遺失
- **資料統計**：提供資料庫統計功能

---

## 學習收穫

### 1. 架構設計的重要性

- **模組化設計**：服務層、控制器層、路由層分離
- **單一職責原則**：每個服務只負責一個功能
- **依賴注入**：服務之間通過參數傳遞，降低耦合

### 2. 性能優化的實踐

- **快取機制**：減少資料庫讀取
- **非同步處理**：提升系統吞吐量
- **演算法優化**：減少計算開銷
- **效能監控**：量化優化效果

### 3. 問題解決的方法

- **系統性思考**：從整體架構出發思考問題
- **端到端測試**：測試整個流程，不只是單一組件
- **數據驅動**：用數據證明優化效果

### 4. 文檔化的重要性

- **清晰的文檔**：幫助理解系統架構
- **問題記錄**：記錄遇到的困難和解決方案
- **使用指南**：幫助其他開發者快速上手

---

## 總結

本專案從「靈肉分離」的狀態，逐步發展成為一個完整的、符合架構設計的系統。過程中遇到了許多困難，但通過系統性的思考和持續的優化，最終實現了：

✅ **完整的後端 API 系統**  
✅ **真正的優先級判定機制**  
✅ **高效的資料庫服務**  
✅ **智能的上傳調度器**  
✅ **性能優化與監控**  
✅ **完整的測試工具**  

這些功能不僅滿足了專案需求，更重要的是在實作過程中學到了系統設計、性能優化、問題解決的寶貴經驗。

---

*最後更新：2024-12-12*



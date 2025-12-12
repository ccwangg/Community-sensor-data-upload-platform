# 第四階段：效能優化

## 優化內容

### 1. 快取機制 (Caching) ✅

**實作位置：** `services/cacheService.js`

**功能：**
- 記憶體快取，減少重複查詢
- 自動過期機制（TTL）
- 快取統計和監控
- 定期清理過期項目

**快取策略：**
- 感測器數據查詢：30 秒 TTL
- 報表摘要：30 秒 TTL
- 優先級統計：30 秒 TTL

**效果：**
- 減少資料庫讀取次數
- 提升熱點數據查詢速度
- 降低系統負載

### 2. 非同步處理 (Async Processing) ✅

**實作位置：** `services/asyncProcessor.js`

**功能：**
- 使用 `process.nextTick` 和 `setImmediate` 非阻塞處理
- 優先級計算不阻塞主線程
- 任務佇列管理
- 批量並行處理

**優化點：**
- 優先級計算改為非同步
- 上傳調度器使用 `setImmediate` 延遲執行
- 批量數據處理使用並行策略

**效果：**
- 提升吞吐量
- 避免長時間計算阻塞請求
- 改善並發處理能力

### 3. 演算法優化 ✅

**實作位置：** `services/priorityEngine.js`

**優化內容：**
- 減少函數調用開銷
- 直接計算而非多次調用
- 使用查表法加速網路狀態查詢
- 可選的詳細分解（預設關閉以提升效能）
- 單次遍歷計算統計（而非多次遍歷）

**優化點：**
```javascript
// 優化前：多次函數調用
const importanceScore = normalizeImportance(dataImportance);
const batteryScore = calculateBatteryScore(battery);

// 優化後：直接計算
const importanceScore = Math.max(0, Math.min(10, dataImportance));
const batteryScore = 10 * Math.pow(1 - normalizedBattery / 100, 0.7);
```

**效果：**
- 降低 CPU 使用率
- 減少記憶體分配
- 提升計算速度

### 4. 效能監控 ✅

**實作位置：** `middleware/performanceMonitor.js`

**功能：**
- 自動記錄所有 API 請求回應時間
- 計算統計指標（平均、P50、P95、P99）
- 提供效能統計 API
- 支援重置統計

**API 端點：**
- `GET /api/performance/stats` - 獲取效能統計
- `POST /api/performance/reset` - 重置統計

## 效能測試

### 執行效能測試

```bash
npm run test:performance
```

### 測試內容

- 並發請求測試
- 回應時間統計
- 快取命中率監控
- 吞吐量測試

### 預期效果

**目標：系統回應時間降低 30%**

測試結果會顯示：
- 平均回應時間
- P50、P95、P99 百分位數
- 快取命中率
- 成功/失敗請求數

## 使用方式

### 查看效能統計

```bash
# 瀏覽器訪問
http://localhost:3000/api/performance/stats

# 或使用 curl
curl http://localhost:3000/api/performance/stats
```

### 重置統計

```bash
curl -X POST http://localhost:3000/api/performance/reset
```

## 效能指標

### 快取統計

- **命中率 (Hit Rate)**: 快取命中次數 / 總請求數
- **快取大小**: 當前快取項目數
- **清理次數**: 過期項目清理次數

### 回應時間統計

- **平均回應時間**: 所有請求的平均回應時間
- **P50**: 50% 的請求回應時間低於此值
- **P95**: 95% 的請求回應時間低於此值
- **P99**: 99% 的請求回應時間低於此值

## 優化建議

### 進一步優化方向

1. **資料庫優化**（第三階段）
   - 使用索引加速查詢
   - 連接池管理
   - 查詢優化

2. **Redis 快取**
   - 分散式快取
   - 更長的 TTL
   - 快取預熱

3. **CDN 和負載均衡**
   - 靜態資源 CDN
   - 負載均衡器
   - 地理分佈

4. **資料壓縮**
   - Gzip 壓縮
   - 回應資料壓縮
   - 減少傳輸量

## 監控和維護

### 定期檢查

1. 快取命中率應保持在 70% 以上
2. P95 回應時間應低於 100ms（熱點 API）
3. 系統負載應保持穩定

### 問題排查

如果效能下降：
1. 檢查快取命中率
2. 查看慢查詢日誌
3. 檢查系統資源使用
4. 分析效能統計數據


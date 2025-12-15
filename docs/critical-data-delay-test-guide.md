# Critical Data 延遲測試指南

## 📋 概述

本測試用於觀察在高壅塞情況下，**Critical Data（緊急數據）的延遲下降百分比**。

測試會模擬不同壅塞等級，發送大量數據（包含 Critical 和 Non-Critical），並測量兩者的處理延遲差異，以證明優先級機制的有效性。

---

## 🎯 測試目標

1. **模擬高壅塞情況**：發送大量並發請求
2. **測量 Critical Data 延遲**：記錄緊急數據的處理時間
3. **測量 Non-Critical Data 延遲**：記錄一般數據的處理時間
4. **計算延遲改善百分比**：證明優先級機制的效果

---

## 🚀 快速開始

### 1. 啟動後端伺服器

```bash
npm start
```

確保伺服器運行在 `http://localhost:3000`

### 2. 執行測試

```bash
npm run test:critical
```

### 3. 查看結果

測試完成後會顯示：
- 各壅塞等級下的延遲統計
- Critical Data 與 Non-Critical Data 的延遲比較
- **延遲下降百分比**

報告會自動保存到 `reports/` 目錄：
- JSON 格式：`critical-delay-test-{timestamp}.json`
- Markdown 格式：`critical-delay-test-{timestamp}.md`

---

## 📊 測試配置

測試會自動執行以下壅塞等級：

| 壅塞等級 | 總請求數 | Critical 比例 | 並發數 |
|---------|---------|--------------|--------|
| 低壅塞 | 50 | 10% | 20 |
| 中壅塞 | 200 | 10% | 20 |
| 高壅塞 | 500 | 10% | 20 |
| 極高壅塞 | 1000 | 10% | 20 |

每個等級會重複測試 **3 次**，取平均值以確保結果準確。

---

## 📈 測試結果解讀

### 輸出範例

```
🚨 Critical Data 統計:
   數量: 50
   平均延遲: 45.2 ms
   P50: 42.1 ms
   P95: 78.5 ms
   P99: 95.3 ms

📊 Non-Critical Data 統計:
   數量: 450
   平均延遲: 125.8 ms
   P50: 118.2 ms
   P95: 185.6 ms
   P99: 210.4 ms

📈 Critical Data 延遲改善:
   Critical 平均延遲比 Non-Critical 快 64.08%
   Critical P95 比 Non-Critical P95 快 57.70%
```

### 關鍵指標

1. **平均延遲改善百分比**
   - 計算公式：`(Non-Critical 平均 - Critical 平均) / Non-Critical 平均 × 100%`
   - 表示 Critical Data 平均比 Non-Critical Data 快多少

2. **P95 延遲改善百分比**
   - 計算公式：`(Non-Critical P95 - Critical P95) / Non-Critical P95 × 100%`
   - 表示在最壞情況下（95% 的請求），Critical Data 的優勢

3. **P99 延遲改善百分比**
   - 計算公式：`(Non-Critical P99 - Critical P99) / Non-Critical P99 × 100%`
   - 表示在極端情況下（99% 的請求），Critical Data 的優勢

---

## 🔍 測試原理

### Critical Data 特徵

測試中的 Critical Data 具有以下特徵：
- **高重要性**：`dataImportance` = 8-10
- **低電量**：`battery` = 10-30%
- **差網路**：`networkStatus` = 'poor', 'critical', 'fair'

這些特徵會導致優先級分數較高（≥ 7.5），觸發優先級機制。

### Non-Critical Data 特徵

測試中的 Non-Critical Data 具有以下特徵：
- **低重要性**：`dataImportance` = 1-4
- **高電量**：`battery` = 70-100%
- **好網路**：`networkStatus` = 'excellent', 'good'

這些特徵會導致優先級分數較低（< 7.5），進入批次處理佇列。

### 優先級機制

系統會根據優先級分數：
1. **Critical Data**（優先級 ≥ 7.5）：
   - 進入緊急佇列（Preemptive Queue）
   - 立即處理，搶佔式調度
   - 按優先級分數降序排列

2. **Non-Critical Data**（優先級 < 7.5）：
   - 進入批次佇列（Batch Queue）
   - 批量處理，每 5 秒處理一批
   - 最多每批 10 筆

因此，在高壅塞情況下，Critical Data 會優先處理，延遲明顯降低。

---

## 📝 報告格式

### JSON 報告

包含完整的測試數據：
- 每次迭代的詳細結果
- 所有請求的原始延遲數據
- 統計指標（平均、P50、P95、P99）

### Markdown 報告

包含總結性的表格和數據：
- 各壅塞等級的改善百分比
- 易於閱讀的格式
- 適合放入期末報告

---

## 🎓 在報告中使用

### 1. 引用測試結果

在報告中可以這樣描述：

> 在高壅塞情況下（1000 筆請求），我們觀察到 Critical Data 的平均延遲比 Non-Critical Data 降低了 **64.08%**，P95 延遲降低了 **57.70%**，證明了優先級機制的有效性。

### 2. 展示數據表格

可以從 Markdown 報告中複製表格：

| 指標 | 改善百分比 |
|------|-----------|
| 平均延遲 | **64.08%** ↓ |
| P95 延遲 | **57.70%** ↓ |
| P99 延遲 | **52.34%** ↓ |

### 3. 展示趨勢圖

可以根據不同壅塞等級的結果，繪製趨勢圖：
- X 軸：壅塞等級（低、中、高、極高）
- Y 軸：延遲改善百分比
- 多條線：平均、P95、P99

---

## ⚙️ 自訂測試配置

如需修改測試配置，編輯 `tests/critical-data-delay-test.js`：

```javascript
const TEST_CONFIG = {
  // 修改壅塞等級
  congestionLevels: [
    { name: '自訂等級', totalRequests: 300, criticalRatio: 0.15 }
  ],
  // 修改並發數
  concurrent: 30,
  // 修改重複次數
  iterations: 5
};
```

---

## 🐛 故障排除

### 問題：無法連接到伺服器

**解決方案：**
```bash
# 確保後端伺服器正在運行
npm start
```

### 問題：測試結果不穩定

**可能原因：**
- 系統負載過高
- 網路延遲
- 資料庫 I/O 瓶頸

**解決方案：**
- 增加 `iterations` 次數（取更多平均值）
- 減少 `concurrent` 並發數
- 關閉其他應用程式

### 問題：Critical Data 延遲沒有明顯改善

**可能原因：**
- 優先級分數計算有誤
- 調度器未正確處理
- 資料庫插入邏輯有問題

**檢查方法：**
```bash
# 查看優先級統計
curl http://localhost:3000/api/sensors/priority/stats

# 查看佇列狀態
curl http://localhost:3000/api/scheduler/queue
```

---

## 📚 相關文檔

- [性能優化文檔](performance-optimization.md)
- [優先級引擎說明](../services/priorityEngine.js)
- [上傳調度器說明](../services/uploadScheduler.js)
- [性能測試指南](performance-testing-guide.md)

---

## 💡 提示

1. **測試前清空資料庫**：測試會自動清空資料庫，確保環境乾淨
2. **多次測試取平均**：預設重複 3 次，確保結果穩定
3. **觀察不同壅塞等級**：可以看到隨著壅塞增加，改善效果更明顯
4. **保存報告**：報告會自動保存，方便後續分析

---

*最後更新：2024-12-12*


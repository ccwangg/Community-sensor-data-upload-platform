# 前端 React 應用程式

這是社區感測器資料上傳平台的前端應用程式，使用 React + Vite + ECharts 構建。

## 功能特色

- ✅ 即時數據顯示（每 5 秒自動更新）
- ✅ 多種圖表展示（PM2.5/AQI、溫度/濕度、氣壓、噪音、風速/風向）
- ✅ 數據卡片總覽
- ✅ 模擬感測器數據上傳
- ✅ 優先級顯示
- ✅ 連接狀態監控

## 安裝與執行

### 1. 安裝依賴

```bash
cd frontend
npm install
```

### 2. 啟動開發伺服器

```bash
npm run dev
```

前端將運行於：`http://localhost:5173`

### 3. 構建生產版本

```bash
npm run build
```

構建後的檔案會在 `dist` 目錄中。

### 4. 預覽生產版本

```bash
npm run preview
```

## 環境變數

可以在 `.env` 文件中設定：

```env
VITE_API_BASE_URL=http://localhost:3000
```

預設會連接到 `http://localhost:3000`。

## 使用說明

1. **確保後端伺服器已啟動**
   ```bash
   # 在專案根目錄
   npm start
   ```

2. **啟動前端**
   ```bash
   # 在 frontend 目錄
   npm run dev
   ```

3. **開啟瀏覽器**
   - 訪問 `http://localhost:5173`
   - 前端會自動連接到後端 API

## 技術棧

- **React 18** - UI 框架
- **Vite** - 構建工具
- **ECharts** - 圖表庫
- **Tailwind CSS** - 樣式框架

## 與後端 API 整合

前端會自動連接到後端 API：

- `GET /api/sensors/data` - 獲取感測器數據
- `GET /api/reports/summary` - 獲取數據摘要
- `POST /api/sensors/data` - 上傳感測器數據
- `GET /health` - 健康檢查

## 注意事項

- 前端使用 Vite 的代理功能，開發時會自動代理 `/api` 請求到後端
- 生產環境需要設定正確的 `VITE_API_BASE_URL`
- 確保後端已啟用 CORS 支援






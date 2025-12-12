# 快速啟動指南

## 問題：前端無法連接到後端

如果看到 `ERR_CONNECTION_REFUSED` 錯誤，表示後端伺服器沒有運行。

## 解決步驟

### 1. 啟動後端伺服器

**在專案根目錄執行：**

```bash
# 方式一：直接啟動
npm start

# 方式二：開發模式（自動重啟）
npm run dev
```

**確認後端已啟動：**
- 應該看到訊息：`🚀 伺服器運行於 http://localhost:3000`
- 可以在瀏覽器訪問：`http://localhost:3000/health` 確認

### 2. 啟動前端

**在新的終端視窗中：**

```bash
# 進入前端目錄
cd frontend

# 安裝依賴（首次執行）
npm install

# 啟動前端開發伺服器
npm run dev
```

**前端將運行於：** `http://localhost:5173`

### 3. 驗證連接

1. 打開瀏覽器訪問：`http://localhost:5173`
2. 檢查右上角狀態指示器：
   - ✅ 綠色 = 已連接
   - ❌ 紅色 = 未連接（檢查後端是否運行）

## 完整啟動流程

```bash
# 終端 1：啟動後端
cd "c:\CSIE\computer network\final_project"
npm start

# 終端 2：啟動前端
cd "c:\CSIE\computer network\final_project\frontend"
npm install  # 僅首次執行
npm run dev

# 終端 3（可選）：運行模擬器
cd "c:\CSIE\computer network\final_project"
python tests/simulator_backend.py baseline
```

## 常見問題

### Q: 後端啟動失敗
**A:** 檢查：
- Node.js 是否已安裝：`node --version`
- 依賴是否已安裝：`npm install`
- 端口 3000 是否被占用

### Q: 前端無法連接後端
**A:** 檢查：
- 後端是否正在運行（訪問 `http://localhost:3000/health`）
- 瀏覽器控制台是否有 CORS 錯誤
- 防火牆是否阻擋連接

### Q: 端口已被占用
**A:** 修改端口：
- 後端：在 `.env` 文件中設定 `PORT=3001`
- 前端：在 `frontend/vite.config.js` 中修改 `server.port`

## 測試連接

```bash
# 測試後端
curl http://localhost:3000/health

# 或使用瀏覽器訪問
http://localhost:3000/health
```

應該看到：
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...
}
```


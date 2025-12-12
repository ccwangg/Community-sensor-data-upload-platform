const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const sensorRoutes = require('./routes/sensorRoutes');
const reportRoutes = require('./routes/reportRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const { performanceMonitor, getPerformanceStats, resetStats } = require('./middleware/performanceMonitor');

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件設定
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 效能監控中間件（必須在其他中間件之前）
app.use(performanceMonitor);

// 請求日誌中間件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API 路由
app.use('/api/sensors', sensorRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/scheduler', schedulerRoutes);

// 根路徑
app.get('/', (req, res) => {
  res.json({
    message: '社區感測器資料上傳平台 API',
    version: '1.0.0',
    endpoints: {
      sensors: {
        upload: 'POST /api/sensors/data',
        getAll: 'GET /api/sensors/data',
        getById: 'GET /api/sensors/data/:id'
      },
      reports: {
        summary: 'GET /api/reports/summary',
        statistics: 'GET /api/reports/statistics'
      },
      scheduler: {
        queueStatus: 'GET /api/scheduler/queue',
        processCritical: 'POST /api/scheduler/process-critical',
        processBatch: 'POST /api/scheduler/process-batch',
        clearQueues: 'DELETE /api/scheduler/queue'
      },
      priority: {
        stats: 'GET /api/sensors/priority/stats'
      }
    }
  });
});

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 效能統計端點
app.get('/api/performance/stats', (req, res) => {
  const cacheService = require('./services/cacheService');
  const asyncProcessor = require('./services/asyncProcessor');
  
  res.json({
    success: true,
    performance: getPerformanceStats(),
    cache: cacheService.getStats(),
    asyncQueue: asyncProcessor.getQueueStatus()
  });
});

// 重置效能統計
app.post('/api/performance/reset', (req, res) => {
  resetStats();
  res.json({
    success: true,
    message: '效能統計已重置'
  });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || '內部伺服器錯誤',
      status: err.status || 500
    }
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: '找不到請求的資源',
      path: req.path
    }
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 伺服器運行於 http://localhost:${PORT}`);
  console.log(`📊 API 文檔: http://localhost:${PORT}/`);
  console.log(`❤️  健康檢查: http://localhost:${PORT}/health`);
});

module.exports = app;


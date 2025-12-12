/**
 * 效能監控中間件
 * 監控 API 回應時間，用於驗證效能優化效果
 */

const performanceData = {
  requests: [],
  stats: {
    totalRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    p50: 0,
    p95: 0,
    p99: 0
  }
};

/**
 * 效能監控中間件
 */
function performanceMonitor(req, res, next) {
  const startTime = process.hrtime.bigint();
  
  // 監聽回應結束事件
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // 轉換為毫秒
    
    // 記錄請求資訊
    const requestInfo = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: duration,
      timestamp: new Date().toISOString()
    };
    
    performanceData.requests.push(requestInfo);
    
    // 只保留最近 1000 筆記錄
    if (performanceData.requests.length > 1000) {
      performanceData.requests.shift();
    }
    
    // 更新統計資訊
    updateStats();
  });
  
  next();
}

/**
 * 更新統計資訊
 */
function updateStats() {
  const times = performanceData.requests.map(r => r.responseTime);
  
  if (times.length === 0) return;
  
  times.sort((a, b) => a - b);
  
  const total = times.length;
  const sum = times.reduce((a, b) => a + b, 0);
  
  performanceData.stats = {
    totalRequests: total,
    averageResponseTime: Math.round((sum / total) * 100) / 100,
    minResponseTime: Math.round(times[0] * 100) / 100,
    maxResponseTime: Math.round(times[times.length - 1] * 100) / 100,
    p50: Math.round(times[Math.floor(total * 0.5)] * 100) / 100,
    p95: Math.round(times[Math.floor(total * 0.95)] * 100) / 100,
    p99: Math.round(times[Math.floor(total * 0.99)] * 100) / 100
  };
}

/**
 * 獲取效能統計
 */
function getPerformanceStats() {
  updateStats();
  return {
    ...performanceData.stats,
    recentRequests: performanceData.requests.slice(-10)
  };
}

/**
 * 重置統計資料
 */
function resetStats() {
  performanceData.requests = [];
  performanceData.stats = {
    totalRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    p50: 0,
    p95: 0,
    p99: 0
  };
}

module.exports = {
  performanceMonitor,
  getPerformanceStats,
  resetStats
};


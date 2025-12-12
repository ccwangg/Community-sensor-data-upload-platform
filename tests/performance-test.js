/**
 * 效能測試腳本
 * 測試系統回應時間，驗證效能優化效果
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_CONFIG = {
  concurrent: 10,      // 並發請求數
  totalRequests: 100, // 總請求數
  endpoints: [
    '/api/sensors/data',
    '/api/reports/summary',
    '/api/sensors/priority/stats'
  ]
};

/**
 * 發送 HTTP 請求
 */
function makeRequest(method, path) {
  return new Promise((resolve, reject) => {
    const startTime = process.hrtime.bigint();
    const url = new URL(path, BASE_URL);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // 毫秒
        
        resolve({
          status: res.statusCode,
          duration,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      reject({ error: error.message, duration });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject({ error: 'Timeout', duration: 5000 });
    });

    req.end();
  });
}

/**
 * 執行效能測試
 */
async function runPerformanceTest() {
  console.log('🚀 開始效能測試...\n');
  console.log(`📊 測試配置:`);
  console.log(`   並發請求數: ${TEST_CONFIG.concurrent}`);
  console.log(`   總請求數: ${TEST_CONFIG.totalRequests}`);
  console.log(`   測試端點: ${TEST_CONFIG.endpoints.join(', ')}\n`);

  const results = [];

  // 測試每個端點
  for (const endpoint of TEST_CONFIG.endpoints) {
    console.log(`\n📡 測試端點: ${endpoint}`);
    console.log('='.repeat(60));

    const endpointResults = [];

    // 執行多輪測試
    const requestsPerEndpoint = Math.floor(TEST_CONFIG.totalRequests / TEST_CONFIG.endpoints.length);
    
    for (let i = 0; i < requestsPerEndpoint; i += TEST_CONFIG.concurrent) {
      const batch = [];
      const batchSize = Math.min(TEST_CONFIG.concurrent, requestsPerEndpoint - i);

      // 創建並發請求批次
      for (let j = 0; j < batchSize; j++) {
        batch.push(makeRequest('GET', endpoint));
      }

      // 等待批次完成
      try {
        const batchResults = await Promise.all(batch);
        endpointResults.push(...batchResults);
        
        // 顯示進度
        const progress = ((i + batchSize) / requestsPerEndpoint * 100).toFixed(1);
        process.stdout.write(`\r   進度: ${progress}% (${i + batchSize}/${requestsPerEndpoint})`);
      } catch (error) {
        console.error(`\n   錯誤:`, error);
      }
    }

    console.log('\n');

    // 計算統計
    const durations = endpointResults
      .filter(r => r.success)
      .map(r => r.duration)
      .sort((a, b) => a - b);

    if (durations.length > 0) {
      const total = durations.length;
      const sum = durations.reduce((a, b) => a + b, 0);
      const avg = sum / total;
      const p50 = durations[Math.floor(total * 0.5)];
      const p95 = durations[Math.floor(total * 0.95)];
      const p99 = durations[Math.floor(total * 0.99)];

      console.log(`   ✅ 成功: ${durations.length}`);
      console.log(`   ❌ 失敗: ${endpointResults.length - durations.length}`);
      console.log(`   ⏱️  平均回應時間: ${avg.toFixed(2)} ms`);
      console.log(`   📊 P50: ${p50.toFixed(2)} ms`);
      console.log(`   📊 P95: ${p95.toFixed(2)} ms`);
      console.log(`   📊 P99: ${p99.toFixed(2)} ms`);
      console.log(`   📊 最小: ${durations[0].toFixed(2)} ms`);
      console.log(`   📊 最大: ${durations[durations.length - 1].toFixed(2)} ms`);

      results.push({
        endpoint,
        avg,
        p50,
        p95,
        p99,
        min: durations[0],
        max: durations[durations.length - 1],
        success: durations.length,
        total: endpointResults.length
      });
    }
  }

  // 總體統計
  console.log('\n' + '='.repeat(60));
  console.log('📊 總體效能統計');
  console.log('='.repeat(60));

  const allAvgs = results.map(r => r.avg);
  const overallAvg = allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;
  const overallP95 = results.map(r => r.p95);
  const maxP95 = Math.max(...overallP95);

  console.log(`📈 平均回應時間: ${overallAvg.toFixed(2)} ms`);
  console.log(`📈 最大 P95 回應時間: ${maxP95.toFixed(2)} ms`);
  console.log(`📈 總成功請求: ${results.reduce((sum, r) => sum + r.success, 0)}`);
  console.log(`📈 總失敗請求: ${results.reduce((sum, r) => sum + (r.total - r.success), 0)}`);

  // 獲取伺服器端統計
  try {
    const serverStatsResponse = await makeRequest('GET', '/api/performance/stats');
    if (serverStatsResponse.success) {
      // 需要再次請求獲取完整響應
      const statsUrl = new URL('/api/performance/stats', BASE_URL);
      http.get(statsUrl, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const stats = JSON.parse(body);
            if (stats.success) {
              console.log('\n📊 伺服器端統計:');
              console.log(`   快取命中率: ${stats.cache?.hitRate || 'N/A'}`);
              console.log(`   快取大小: ${stats.cache?.size || 0}`);
              console.log(`   平均回應時間: ${stats.performance?.averageResponseTime || 'N/A'} ms`);
            }
          } catch (e) {
            // 忽略解析錯誤
          }
        });
      });
    }
  } catch (error) {
    // 忽略錯誤
  }

  console.log('\n✅ 效能測試完成！');
  console.log('\n💡 提示: 訪問 http://localhost:3000/api/performance/stats 查看詳細統計');

  return results;
}

// 執行測試
runPerformanceTest().catch(error => {
  console.error('❌ 測試執行錯誤:', error);
  process.exit(1);
});


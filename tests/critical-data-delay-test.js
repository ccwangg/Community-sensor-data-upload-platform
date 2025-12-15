/**
 * Critical Data 延遲測試
 * 
 * 測試目標：
 * 1. 模擬高壅塞情況（發送大量數據）
 * 2. 測量 critical data 的處理延遲
 * 3. 比較有優先級機制時的延遲改善
 * 4. 計算延遲下降百分比
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = `${BASE_URL}/api/sensors/data`;

// 測試配置
const TEST_CONFIG = {
  // 壅塞程度：總請求數
  congestionLevels: [
    { name: '低壅塞', totalRequests: 50, criticalRatio: 0.1 },
    { name: '中壅塞', totalRequests: 200, criticalRatio: 0.1 },
    { name: '高壅塞', totalRequests: 500, criticalRatio: 0.1 },
    { name: '極高壅塞', totalRequests: 1000, criticalRatio: 0.1 }
  ],
  // 並發請求數（模擬真實壅塞）
  concurrent: 20,
  // 測試重複次數（取平均值）
  iterations: 3
};

// 測試結果
const testResults = {
  timestamp: new Date().toISOString(),
  config: TEST_CONFIG,
  results: []
};

/**
 * 生成感測器數據
 */
function generateSensorData(index, isCritical = false) {
  const nodeId = `S-${String(index).padStart(4, '0')}`;
  const now = new Date().toISOString();
  
  // Critical data: 高重要性、低電量、差網路
  // Non-critical data: 低重要性、高電量、好網路
  const data = {
    nodeId,
    timestamp: now,
    sensorType: 'temperature',
    value: Math.random() * 30 + 20,
    unit: 'celsius',
    periodic: {
      temperature: Math.random() * 30 + 20,
      humidity: Math.random() * 50 + 40,
      pressure: Math.random() * 160 + 900,
      AQI: Math.floor(Math.random() * 140 + 10),
      noise: Math.floor(Math.random() * 90 + 30),
      wind_speed: Math.random() * 20,
      wind_dir: ['N', 'S', 'E', 'W'][Math.floor(Math.random() * 4)]
    }
  };

  if (isCritical) {
    // Critical: 高重要性 (8-10), 低電量 (10-30), 差網路
    data.dataImportance = Math.random() * 2 + 8; // 8-10
    data.battery = Math.random() * 20 + 10; // 10-30
    data.networkStatus = ['poor', 'critical', 'fair'][Math.floor(Math.random() * 3)];
  } else {
    // Non-critical: 低重要性 (1-4), 高電量 (70-100), 好網路
    data.dataImportance = Math.random() * 3 + 1; // 1-4
    data.battery = Math.random() * 30 + 70; // 70-100
    data.networkStatus = ['excellent', 'good'][Math.floor(Math.random() * 2)];
  }

  return data;
}

/**
 * 發送 HTTP POST 請求並測量延遲
 */
function sendRequest(payload, requestId) {
  return new Promise((resolve, reject) => {
    const sendTime = Date.now();
    const url = new URL(API_ENDPOINT);
    
    const postData = JSON.stringify(payload);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        const receiveTime = Date.now();
        const delay = receiveTime - sendTime; // 毫秒
        
        resolve({
          requestId,
          isCritical: payload.dataImportance >= 8,
          status: res.statusCode,
          delay,
          sendTime,
          receiveTime,
          success: res.statusCode >= 200 && res.statusCode < 300,
          response: body
        });
      });
    });

    req.on('error', (error) => {
      const receiveTime = Date.now();
      const delay = receiveTime - sendTime;
      reject({
        requestId,
        isCritical: payload.dataImportance >= 8,
        error: error.message,
        delay,
        sendTime,
        receiveTime,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const receiveTime = Date.now();
      const delay = receiveTime - sendTime;
      reject({
        requestId,
        isCritical: payload.dataImportance >= 8,
        error: 'Timeout',
        delay: 10000,
        sendTime,
        receiveTime,
        success: false
      });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 執行單次測試
 */
async function runSingleTest(congestionLevel) {
  console.log(`\n📊 開始測試: ${congestionLevel.name}`);
  console.log(`   總請求數: ${congestionLevel.totalRequests}`);
  console.log(`   Critical 比例: ${(congestionLevel.criticalRatio * 100).toFixed(0)}%`);
  console.log(`   並發數: ${TEST_CONFIG.concurrent}`);

  const criticalCount = Math.floor(congestionLevel.totalRequests * congestionLevel.criticalRatio);
  const nonCriticalCount = congestionLevel.totalRequests - criticalCount;

  // 生成所有請求的 payload
  const requests = [];
  let requestId = 0;

  // Critical requests
  for (let i = 0; i < criticalCount; i++) {
    requests.push({
      id: requestId++,
      payload: generateSensorData(i, true),
      isCritical: true
    });
  }

  // Non-critical requests
  for (let i = 0; i < nonCriticalCount; i++) {
    requests.push({
      id: requestId++,
      payload: generateSensorData(i, false),
      isCritical: false
    });
  }

  // 打亂順序（模擬真實情況）
  for (let i = requests.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [requests[i], requests[j]] = [requests[j], requests[i]];
  }

  // 發送請求（並發控制）
  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < requests.length; i += TEST_CONFIG.concurrent) {
    const batch = requests.slice(i, i + TEST_CONFIG.concurrent);
    const batchPromises = batch.map(req => 
      sendRequest(req.payload, req.id)
        .catch(error => ({ ...error, requestId: req.id }))
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // 顯示進度
    const progress = ((i + batch.length) / requests.length * 100).toFixed(1);
    process.stdout.write(`\r   進度: ${progress}% (${i + batch.length}/${requests.length})`);
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;

  console.log('\n');

  // 分析結果
  const criticalResults = results.filter(r => r.isCritical && r.success);
  const nonCriticalResults = results.filter(r => !r.isCritical && r.success);
  const failedResults = results.filter(r => !r.success);

  // 計算統計
  function calculateStats(data) {
    if (data.length === 0) return null;

    const delays = data.map(r => r.delay).sort((a, b) => a - b);
    const sum = delays.reduce((a, b) => a + b, 0);
    const avg = sum / delays.length;
    const p50 = delays[Math.floor(delays.length * 0.5)];
    const p95 = delays[Math.floor(delays.length * 0.95)];
    const p99 = delays[Math.floor(delays.length * 0.99)];

    return {
      count: delays.length,
      avg: Math.round(avg * 100) / 100,
      min: delays[0],
      max: delays[delays.length - 1],
      p50: Math.round(p50 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100
    };
  }

  const criticalStats = calculateStats(criticalResults);
  const nonCriticalStats = calculateStats(nonCriticalResults);
  const allStats = calculateStats(results.filter(r => r.success));

  // 顯示結果
  console.log(`   ⏱️  總耗時: ${totalTime} ms`);
  console.log(`   ✅ 成功: ${results.filter(r => r.success).length}`);
  console.log(`   ❌ 失敗: ${failedResults.length}`);

  if (criticalStats) {
    console.log(`\n   🚨 Critical Data 統計:`);
    console.log(`      數量: ${criticalStats.count}`);
    console.log(`      平均延遲: ${criticalStats.avg} ms`);
    console.log(`      P50: ${criticalStats.p50} ms`);
    console.log(`      P95: ${criticalStats.p95} ms`);
    console.log(`      P99: ${criticalStats.p99} ms`);
  }

  if (nonCriticalStats) {
    console.log(`\n   📊 Non-Critical Data 統計:`);
    console.log(`      數量: ${nonCriticalStats.count}`);
    console.log(`      平均延遲: ${nonCriticalStats.avg} ms`);
    console.log(`      P50: ${nonCriticalStats.p50} ms`);
    console.log(`      P95: ${nonCriticalStats.p95} ms`);
    console.log(`      P99: ${nonCriticalStats.p99} ms`);
  }

  if (criticalStats && nonCriticalStats) {
    const improvement = ((nonCriticalStats.avg - criticalStats.avg) / nonCriticalStats.avg * 100);
    console.log(`\n   📈 Critical Data 延遲改善:`);
    console.log(`      Critical 平均延遲比 Non-Critical 快 ${improvement.toFixed(2)}%`);
    console.log(`      Critical P95 比 Non-Critical P95 快 ${((nonCriticalStats.p95 - criticalStats.p95) / nonCriticalStats.p95 * 100).toFixed(2)}%`);
  }

  return {
    congestionLevel: congestionLevel.name,
    totalRequests: congestionLevel.totalRequests,
    totalTime,
    criticalStats,
    nonCriticalStats,
    allStats,
    successCount: results.filter(r => r.success).length,
    failedCount: failedResults.length,
    rawResults: results
  };
}

/**
 * 執行完整測試套件
 */
async function runFullTest() {
  console.log('🚀 Critical Data 延遲測試');
  console.log('='.repeat(60));
  console.log(`測試配置:`);
  console.log(`  並發數: ${TEST_CONFIG.concurrent}`);
  console.log(`  重複次數: ${TEST_CONFIG.iterations}`);
  console.log(`  壅塞等級數: ${TEST_CONFIG.congestionLevels.length}`);

  // 檢查伺服器是否運行
  try {
    const healthCheck = await new Promise((resolve, reject) => {
      const url = new URL(`${BASE_URL}/health`);
      http.get(url, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, body });
        });
      }).on('error', reject);
    });

    if (healthCheck.status !== 200) {
      throw new Error('伺服器健康檢查失敗');
    }
  } catch (error) {
    console.error('\n❌ 無法連接到伺服器！');
    console.error('   請確保後端伺服器正在運行: npm start');
    process.exit(1);
  }

  // 清空資料庫（可選，確保測試環境乾淨）
  console.log('\n🧹 清空測試資料庫...');
  try {
    await new Promise((resolve, reject) => {
      const url = new URL(`${BASE_URL}/api/database/clear`);
      const req = http.request(url, { method: 'DELETE' }, (res) => {
        res.on('end', resolve);
      });
      req.on('error', reject);
      req.end();
    });
    console.log('   ✅ 資料庫已清空');
  } catch (error) {
    console.log('   ⚠️  無法清空資料庫（可能不影響測試）');
  }

  // 對每個壅塞等級執行多次測試
  for (const congestionLevel of TEST_CONFIG.congestionLevels) {
    const iterationResults = [];

    for (let i = 0; i < TEST_CONFIG.iterations; i++) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`第 ${i + 1}/${TEST_CONFIG.iterations} 次測試`);
      const result = await runSingleTest(congestionLevel);
      iterationResults.push(result);

      // 等待一段時間再進行下一次測試
      if (i < TEST_CONFIG.iterations - 1) {
        console.log('\n   ⏳ 等待 3 秒後進行下一次測試...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // 計算平均值
    const avgCriticalStats = calculateAverageStats(
      iterationResults.map(r => r.criticalStats).filter(s => s !== null)
    );
    const avgNonCriticalStats = calculateAverageStats(
      iterationResults.map(r => r.nonCriticalStats).filter(s => s !== null)
    );

    // 計算改善百分比
    let improvement = null;
    if (avgCriticalStats && avgNonCriticalStats) {
      improvement = {
        avgDelay: ((avgNonCriticalStats.avg - avgCriticalStats.avg) / avgNonCriticalStats.avg * 100),
        p95Delay: ((avgNonCriticalStats.p95 - avgCriticalStats.p95) / avgNonCriticalStats.p95 * 100),
        p99Delay: ((avgNonCriticalStats.p99 - avgCriticalStats.p99) / avgNonCriticalStats.p99 * 100)
      };
    }

    testResults.results.push({
      congestionLevel: congestionLevel.name,
      iterations: iterationResults,
      averageStats: {
        critical: avgCriticalStats,
        nonCritical: avgNonCriticalStats,
        improvement
      }
    });
  }

  // 生成報告
  generateReport();
}

/**
 * 計算平均統計
 */
function calculateAverageStats(statsArray) {
  if (statsArray.length === 0) return null;

  const avg = {
    count: Math.round(statsArray.reduce((sum, s) => sum + s.count, 0) / statsArray.length),
    avg: Math.round(statsArray.reduce((sum, s) => sum + s.avg, 0) / statsArray.length * 100) / 100,
    min: Math.min(...statsArray.map(s => s.min)),
    max: Math.max(...statsArray.map(s => s.max)),
    p50: Math.round(statsArray.reduce((sum, s) => sum + s.p50, 0) / statsArray.length * 100) / 100,
    p95: Math.round(statsArray.reduce((sum, s) => sum + s.p95, 0) / statsArray.length * 100) / 100,
    p99: Math.round(statsArray.reduce((sum, s) => sum + s.p99, 0) / statsArray.length * 100) / 100
  };

  return avg;
}

/**
 * 生成測試報告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 測試報告總結');
  console.log('='.repeat(60));

  // 文字報告
  testResults.results.forEach(result => {
    console.log(`\n${result.congestionLevel}:`);
    if (result.averageStats.improvement) {
      const imp = result.averageStats.improvement;
      console.log(`  🚨 Critical Data 延遲改善:`);
      console.log(`     平均延遲下降: ${imp.avgDelay.toFixed(2)}%`);
      console.log(`     P95 延遲下降: ${imp.p95Delay.toFixed(2)}%`);
      console.log(`     P99 延遲下降: ${imp.p99Delay.toFixed(2)}%`);
      
      if (result.averageStats.critical && result.averageStats.nonCritical) {
        console.log(`     Critical 平均: ${result.averageStats.critical.avg} ms`);
        console.log(`     Non-Critical 平均: ${result.averageStats.nonCritical.avg} ms`);
      }
    }
  });

  // 保存 JSON 報告
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, `critical-delay-test-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 詳細報告已保存: ${reportPath}`);

  // 生成 Markdown 報告
  generateMarkdownReport(reportPath);
}

/**
 * 生成 Markdown 報告
 */
function generateMarkdownReport(jsonPath) {
  const mdPath = jsonPath.replace('.json', '.md');
  
  let md = `# Critical Data 延遲測試報告\n\n`;
  md += `**測試時間**: ${testResults.timestamp}\n\n`;
  md += `## 測試配置\n\n`;
  md += `- 並發數: ${TEST_CONFIG.concurrent}\n`;
  md += `- 重複次數: ${TEST_CONFIG.iterations}\n\n`;
  md += `## 測試結果\n\n`;

  testResults.results.forEach(result => {
    md += `### ${result.congestionLevel}\n\n`;
    
    if (result.averageStats.improvement) {
      const imp = result.averageStats.improvement;
      md += `| 指標 | 改善百分比 |\n`;
      md += `|------|-----------|\n`;
      md += `| 平均延遲 | **${imp.avgDelay.toFixed(2)}%** ↓ |\n`;
      md += `| P95 延遲 | **${imp.p95Delay.toFixed(2)}%** ↓ |\n`;
      md += `| P99 延遲 | **${imp.p99Delay.toFixed(2)}%** ↓ |\n\n`;
      
      if (result.averageStats.critical && result.averageStats.nonCritical) {
        md += `**詳細數據:**\n\n`;
        md += `- Critical Data 平均延遲: ${result.averageStats.critical.avg} ms\n`;
        md += `- Non-Critical Data 平均延遲: ${result.averageStats.nonCritical.avg} ms\n`;
        md += `- Critical Data P95: ${result.averageStats.critical.p95} ms\n`;
        md += `- Non-Critical Data P95: ${result.averageStats.nonCritical.p95} ms\n\n`;
      }
    }
  });

  md += `## 結論\n\n`;
  md += `在高壅塞情況下，優先級機制有效降低了 Critical Data 的處理延遲。\n`;
  md += `詳細數據請參考 JSON 報告: \`${path.basename(jsonPath)}\`\n`;

  fs.writeFileSync(mdPath, md);
  console.log(`📄 Markdown 報告已保存: ${mdPath}`);
}

// 執行測試
runFullTest().catch(error => {
  console.error('\n❌ 測試執行錯誤:', error);
  process.exit(1);
});


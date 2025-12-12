const http = require('http');

const BASE_URL = 'http://localhost:3000';

/**
 * 發送 HTTP 請求的輔助函數
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
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
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * 測試函數
 */
async function runTests() {
  console.log('🧪 開始執行 API 測試...\n');
  
  let passed = 0;
  let failed = 0;

  // 測試 1: 健康檢查
  console.log('測試 1: 健康檢查端點');
  try {
    const response = await makeRequest('GET', '/health');
    if (response.status === 200 && response.data.status === 'healthy') {
      console.log('✅ 通過\n');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 2: 上傳感測器數據（完整資料）
  console.log('測試 2: 上傳感測器數據（完整資料）');
  try {
    const sensorData = {
      nodeId: 'node-001',
      dataImportance: 8,
      battery: 75,
      timestamp: new Date().toISOString(),
      networkStatus: 'good',
      sensorType: 'temperature',
      value: 25.5,
      unit: 'celsius'
    };
    const response = await makeRequest('POST', '/api/sensors/data', sensorData);
    if (response.status === 201 && response.data.success) {
      console.log('✅ 通過 - 數據 ID:', response.data.data.id);
      console.log('');
      passed++;
      // 儲存 ID 供後續測試使用
      global.testSensorId = response.data.data.id;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 3: 上傳感測器數據（最小必填欄位）
  console.log('測試 3: 上傳感測器數據（最小必填欄位）');
  try {
    const sensorData = {
      nodeId: 'node-002',
      dataImportance: 5,
      battery: 60
    };
    const response = await makeRequest('POST', '/api/sensors/data', sensorData);
    if (response.status === 201 && response.data.success) {
      console.log('✅ 通過\n');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 4: 上傳感測器數據（驗證錯誤 - 缺少必填欄位）
  console.log('測試 4: 上傳感測器數據（驗證錯誤 - 缺少必填欄位）');
  try {
    const sensorData = {
      nodeId: 'node-003'
      // 缺少 dataImportance 和 battery
    };
    const response = await makeRequest('POST', '/api/sensors/data', sensorData);
    if (response.status === 400) {
      console.log('✅ 通過 - 正確返回驗證錯誤\n');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 5: 上傳感測器數據（驗證錯誤 - 資料格式錯誤）
  console.log('測試 5: 上傳感測器數據（驗證錯誤 - 資料格式錯誤）');
  try {
    const sensorData = {
      nodeId: 'node-004',
      dataImportance: 15, // 超出範圍
      battery: 50
    };
    const response = await makeRequest('POST', '/api/sensors/data', sensorData);
    if (response.status === 400) {
      console.log('✅ 通過 - 正確返回驗證錯誤\n');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 6: 獲取所有感測器數據
  console.log('測試 6: 獲取所有感測器數據');
  try {
    const response = await makeRequest('GET', '/api/sensors/data');
    if (response.status === 200 && response.data.success && Array.isArray(response.data.data)) {
      console.log('✅ 通過 - 返回', response.data.count, '筆數據\n');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 7: 根據 ID 獲取感測器數據
  console.log('測試 7: 根據 ID 獲取感測器數據');
  try {
    if (global.testSensorId) {
      const response = await makeRequest('GET', `/api/sensors/data/${global.testSensorId}`);
      if (response.status === 200 && response.data.success) {
        console.log('✅ 通過\n');
        passed++;
      } else {
        console.log('❌ 失敗:', response);
        failed++;
      }
    } else {
      console.log('⏭️  跳過（需要先有數據）\n');
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 8: 根據節點 ID 獲取數據
  console.log('測試 8: 根據節點 ID 獲取數據');
  try {
    const response = await makeRequest('GET', '/api/sensors/node/node-001');
    if (response.status === 200 && response.data.success) {
      console.log('✅ 通過 - 節點 node-001 有', response.data.count, '筆數據\n');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 9: 獲取摘要報表
  console.log('測試 9: 獲取摘要報表');
  try {
    const response = await makeRequest('GET', '/api/reports/summary');
    if (response.status === 200 && response.data.success) {
      console.log('✅ 通過');
      console.log('   - 總記錄數:', response.data.data.totalRecords);
      console.log('   - 節點數量:', response.data.data.uniqueNodes);
      console.log('   - 平均電量:', response.data.data.averageBattery);
      console.log('');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 10: 獲取統計報表
  console.log('測試 10: 獲取統計報表');
  try {
    const response = await makeRequest('GET', '/api/reports/statistics?timeRange=all');
    if (response.status === 200 && response.data.success) {
      console.log('✅ 通過');
      console.log('   - 時間範圍:', response.data.timeRange);
      console.log('   - 總記錄數:', response.data.data.totalRecords);
      console.log('');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 11: 查詢參數測試（limit 和 offset）
  console.log('測試 11: 查詢參數測試（limit 和 offset）');
  try {
    const response = await makeRequest('GET', '/api/sensors/data?limit=1&offset=0');
    if (response.status === 200 && response.data.success && response.data.count <= 1) {
      console.log('✅ 通過\n');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 12: 404 錯誤處理
  console.log('測試 12: 404 錯誤處理');
  try {
    const response = await makeRequest('GET', '/api/sensors/data/non-existent-id');
    if (response.status === 404) {
      console.log('✅ 通過\n');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 13: 優先級引擎 - 上傳高優先級數據
  console.log('測試 13: 優先級引擎 - 上傳高優先級數據');
  try {
    const sensorData = {
      nodeId: 'node-priority-001',
      dataImportance: 9,  // 高重要性
      battery: 15,        // 低電量（會提高優先級）
      networkStatus: 'good',
      sensorType: 'temperature',
      value: 30.5
    };
    const response = await makeRequest('POST', '/api/sensors/data', sensorData);
    if (response.status === 201 && response.data.data.priority) {
      console.log('✅ 通過');
      console.log('   - 優先級分數:', response.data.data.priority.priorityScore);
      console.log('   - 優先級等級:', response.data.data.priority.priorityLevel);
      console.log('');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 14: 優先級統計
  console.log('測試 14: 獲取優先級統計');
  try {
    const response = await makeRequest('GET', '/api/sensors/priority/stats');
    if (response.status === 200 && response.data.success && response.data.data.total !== undefined) {
      console.log('✅ 通過');
      console.log('   - 總數據數:', response.data.data.total);
      console.log('   - 平均優先級分數:', response.data.data.averageScore?.toFixed(2));
      console.log('');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 15: 按優先級排序查詢
  console.log('測試 15: 按優先級排序查詢');
  try {
    const response = await makeRequest('GET', '/api/sensors/data?sortBy=priority&limit=5');
    if (response.status === 200 && response.data.success) {
      console.log('✅ 通過');
      if (response.data.data.length > 0) {
        console.log('   - 最高優先級分數:', response.data.data[0].priority?.priorityScore);
      }
      console.log('');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試 16: 獲取上傳佇列狀態
  console.log('測試 16: 獲取上傳佇列狀態');
  try {
    const response = await makeRequest('GET', '/api/scheduler/queue');
    if (response.status === 200 && response.data.success) {
      console.log('✅ 通過');
      console.log('   - 緊急佇列數量:', response.data.data.critical.count);
      console.log('   - 批次佇列數量:', response.data.data.batch.count);
      console.log('');
      passed++;
    } else {
      console.log('❌ 失敗:', response);
      failed++;
    }
  } catch (error) {
    console.log('❌ 失敗:', error.message);
    failed++;
  }

  // 測試結果總結
  console.log('='.repeat(50));
  console.log('📊 測試結果總結');
  console.log('='.repeat(50));
  console.log(`✅ 通過: ${passed}`);
  console.log(`❌ 失敗: ${failed}`);
  console.log(`📈 總計: ${passed + failed}`);
  console.log(`🎯 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n🎉 所有測試通過！');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查上述錯誤訊息');
    process.exit(1);
  }
}

// 執行測試
runTests().catch(error => {
  console.error('測試執行錯誤:', error);
  process.exit(1);
});


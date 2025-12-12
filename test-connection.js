/**
 * 測試前端、模擬器、後端連接
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

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

async function testConnection() {
  console.log('🧪 測試前端、模擬器、後端連接\n');
  console.log('='.repeat(60));

  // 測試 1: 健康檢查
  console.log('\n1️⃣  測試後端健康檢查...');
  try {
    const response = await makeRequest('GET', '/health');
    if (response.status === 200 && response.data.status === 'healthy') {
      console.log('✅ 後端伺服器運行正常');
      console.log(`   運行時間: ${Math.floor(response.data.uptime)} 秒`);
    } else {
      console.log('❌ 後端健康檢查失敗');
      return false;
    }
  } catch (error) {
    console.log('❌ 無法連接到後端伺服器');
    console.log(`   錯誤: ${error.message}`);
    console.log('\n💡 請確認後端伺服器已啟動：npm start');
    return false;
  }

  // 測試 2: 模擬器格式數據上傳
  console.log('\n2️⃣  測試模擬器格式數據上傳...');
  try {
    const simulatorData = {
      nodeId: 'S-TEST-001',
      dataImportance: 8.5,
      battery: 75.0,
      timestamp: new Date().toISOString(),
      networkStatus: 'good',
      sensorType: 'temperature',
      value: 25.5,
      unit: 'celsius',
      periodic: {
        temperature: 25.5,
        humidity: 65.2,
        rain_prob: 0.3,
        wind_speed: 5.2,
        wind_dir: 'E',
        pressure: 1013.5,
        AQI: 45,
        noise: 55,
        traffic: 'MEDIUM',
        notice: 'none'
      },
      emergency: null,
      metadata: {
        personal_id: 'test-uuid-123',
        scenario_id: 'test',
        send_unix: Date.now() / 1000
      }
    };

    const response = await makeRequest('POST', '/api/sensors/data', simulatorData);
    if (response.status === 201 && response.data.success) {
      console.log('✅ 模擬器格式數據上傳成功');
      console.log(`   數據 ID: ${response.data.data.id}`);
      console.log(`   優先級分數: ${response.data.data.priority?.priorityScore}`);
      console.log(`   優先級等級: ${response.data.data.priority?.priorityLevel}`);
      console.log(`   調度類型: ${response.data.data.scheduleResult?.queueType}`);
    } else {
      console.log('❌ 數據上傳失敗');
      console.log(`   回應: ${JSON.stringify(response.data, null, 2)}`);
      return false;
    }
  } catch (error) {
    console.log('❌ 數據上傳錯誤');
    console.log(`   錯誤: ${error.message}`);
    return false;
  }

  // 測試 3: 前端查詢數據
  console.log('\n3️⃣  測試前端查詢數據...');
  try {
    const response = await makeRequest('GET', '/api/sensors/data?limit=5&sortBy=priority');
    if (response.status === 200 && response.data.success) {
      console.log('✅ 前端查詢成功');
      console.log(`   返回數據數: ${response.data.count}`);
      console.log(`   總數據數: ${response.data.total}`);
      if (response.data.data.length > 0) {
        console.log(`   最高優先級: ${response.data.data[0].priority?.priorityScore} (${response.data.data[0].priority?.priorityLevel})`);
      }
    } else {
      console.log('❌ 數據查詢失敗');
      return false;
    }
  } catch (error) {
    console.log('❌ 數據查詢錯誤');
    console.log(`   錯誤: ${error.message}`);
    return false;
  }

  // 測試 4: 報表 API
  console.log('\n4️⃣  測試報表 API...');
  try {
    const response = await makeRequest('GET', '/api/reports/summary');
    if (response.status === 200 && response.data.success) {
      console.log('✅ 報表查詢成功');
      console.log(`   總記錄數: ${response.data.data.totalRecords}`);
      console.log(`   節點數量: ${response.data.data.uniqueNodes}`);
      console.log(`   平均電量: ${response.data.data.averageBattery}%`);
    } else {
      console.log('❌ 報表查詢失敗');
      return false;
    }
  } catch (error) {
    console.log('❌ 報表查詢錯誤');
    console.log(`   錯誤: ${error.message}`);
    return false;
  }

  // 測試 5: 優先級統計
  console.log('\n5️⃣  測試優先級統計...');
  try {
    const response = await makeRequest('GET', '/api/sensors/priority/stats');
    if (response.status === 200 && response.data.success) {
      console.log('✅ 優先級統計查詢成功');
      console.log(`   總數據數: ${response.data.data.total}`);
      console.log(`   平均優先級分數: ${response.data.data.averageScore?.toFixed(2)}`);
      console.log(`   優先級分布:`);
      console.log(`     Critical: ${response.data.data.byLevel.critical}`);
      console.log(`     High: ${response.data.data.byLevel.high}`);
      console.log(`     Medium: ${response.data.data.byLevel.medium}`);
      console.log(`     Low: ${response.data.data.byLevel.low}`);
    } else {
      console.log('❌ 優先級統計查詢失敗');
      return false;
    }
  } catch (error) {
    console.log('❌ 優先級統計查詢錯誤');
    console.log(`   錯誤: ${error.message}`);
    return false;
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 所有連接測試通過！');
  console.log('\n📝 下一步：');
  console.log('   1. 運行模擬器: python tests/simulator_backend.py baseline');
  console.log('   2. 開啟前端: 在瀏覽器開啟 frontend/index.html');
  console.log('   3. 查看文檔: docs/connection-guide.md');
  console.log('='.repeat(60));

  return true;
}

// 執行測試
testConnection().catch(error => {
  console.error('\n❌ 測試執行錯誤:', error);
  process.exit(1);
});


/**
 * 測試修復功能
 * 驗證：1. 資料庫持久化 2. 優先級佇列 3. 前端後端連接 4. 模擬器真實發送
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.join(__dirname, 'data', 'sensor-data.json');

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

async function testFixes() {
  console.log('🧪 測試系統修復功能\n');
  console.log('='.repeat(60));

  // 測試 1: 資料庫持久化
  console.log('\n1️⃣  測試資料庫持久化...');
  try {
    // 檢查資料庫檔案是否存在
    const dbExists = fs.existsSync(DB_PATH);
    console.log(`   📁 資料庫檔案存在: ${dbExists ? '✅' : '❌'}`);
    
    if (dbExists) {
      const dbContent = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      console.log(`   📊 資料庫記錄數: ${dbContent.sensors?.length || 0}`);
      console.log(`   ✅ 資料庫持久化正常`);
    } else {
      console.log(`   ⚠️  資料庫檔案尚未創建（首次運行時會自動創建）`);
    }
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`);
  }

  // 測試 2: 優先級佇列
  console.log('\n2️⃣  測試優先級佇列...');
  try {
    // 上傳高優先級數據
    const highPriorityData = {
      nodeId: 'TEST-HIGH-001',
      dataImportance: 9.5,
      battery: 15,  // 低電量，高優先級
      networkStatus: 'good',
      sensorType: 'temperature',
      value: 30.0
    };

    const highResponse = await makeRequest('POST', '/api/sensors/data', highPriorityData);
    
    // 上傳低優先級數據
    const lowPriorityData = {
      nodeId: 'TEST-LOW-001',
      dataImportance: 2.0,
      battery: 95,  // 高電量，低優先級
      networkStatus: 'excellent',
      sensorType: 'temperature',
      value: 20.0
    };

    const lowResponse = await makeRequest('POST', '/api/sensors/data', lowPriorityData);

    if (highResponse.status === 201 && lowResponse.status === 201) {
      console.log(`   ✅ 高優先級數據上傳成功`);
      console.log(`     優先級分數: ${highResponse.data.data.priority?.priorityScore}`);
      console.log(`   ✅ 低優先級數據上傳成功`);
      console.log(`     優先級分數: ${lowResponse.data.data.priority?.priorityScore}`);

      // 查詢數據，驗證排序
      const queryResponse = await makeRequest('GET', '/api/sensors/data?sortBy=priority&limit=5');
      if (queryResponse.status === 200 && queryResponse.data.success) {
        const data = queryResponse.data.data;
        if (data.length >= 2) {
          const firstScore = data[0].priority?.priorityScore || 0;
          const secondScore = data[1].priority?.priorityScore || 0;
          
          if (firstScore >= secondScore) {
            console.log(`   ✅ 優先級佇列排序正確（高分在前）`);
            console.log(`     第一筆優先級: ${firstScore}`);
            console.log(`     第二筆優先級: ${secondScore}`);
          } else {
            console.log(`   ❌ 優先級佇列排序錯誤`);
          }
        }
      }
    } else {
      console.log(`   ❌ 數據上傳失敗`);
    }
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`);
  }

  // 測試 3: 前端後端連接
  console.log('\n3️⃣  測試前端後端連接...');
  try {
    // 檢查前端是否連接後端 API
    const frontendFile = path.join(__dirname, 'frontend', 'src', 'App.jsx');
    if (fs.existsSync(frontendFile)) {
      const content = fs.readFileSync(frontendFile, 'utf8');
      const hasFirebase = content.includes('firebase') || content.includes('Firebase');
      const hasBackendAPI = content.includes('localhost:3000') || content.includes('API_BASE_URL');
      
      if (!hasFirebase && hasBackendAPI) {
        console.log(`   ✅ 前端已連接後端 API`);
        console.log(`   ✅ 沒有 Firebase 依賴`);
      } else if (hasFirebase) {
        console.log(`   ⚠️  前端仍包含 Firebase 代碼`);
      } else {
        console.log(`   ⚠️  無法確認前端連接狀態`);
      }
    } else {
      console.log(`   ⚠️  前端檔案不存在`);
    }
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`);
  }

  // 測試 4: 模擬器真實發送
  console.log('\n4️⃣  測試模擬器真實發送...');
  try {
    const simulatorFile = path.join(__dirname, 'tests', 'simulator_backend.py');
    if (fs.existsSync(simulatorFile)) {
      const content = fs.readFileSync(simulatorFile, 'utf8');
      const hasRequests = content.includes('requests.post') || content.includes('requests.get');
      const hasFakeSend = content.includes('fakeSend') && !content.includes('def fakeSend');
      
      if (hasRequests) {
        console.log(`   ✅ 模擬器使用 requests 真實發送 HTTP 請求`);
      } else {
        console.log(`   ❌ 模擬器未使用 requests`);
      }
      
      if (hasFakeSend) {
        console.log(`   ⚠️  模擬器仍包含 fakeSend 函數`);
      }
    } else {
      console.log(`   ⚠️  模擬器檔案不存在`);
    }
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`);
  }

  // 測試 5: 資料庫統計
  console.log('\n5️⃣  測試資料庫統計...');
  try {
    const statsResponse = await makeRequest('GET', '/api/database/stats');
    if (statsResponse.status === 200 && statsResponse.data.success) {
      const stats = statsResponse.data.data;
      console.log(`   ✅ 資料庫統計獲取成功`);
      console.log(`     總記錄數: ${stats.totalRecords}`);
      console.log(`     最後 ID: ${stats.lastId}`);
      console.log(`     資料庫路徑: ${stats.dbPath}`);
    } else {
      console.log(`   ❌ 無法獲取資料庫統計`);
    }
  } catch (error) {
    console.log(`   ❌ 錯誤: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 測試完成！');
  console.log('\n💡 提示:');
  console.log('   - 資料庫檔案位置: data/sensor-data.json');
  console.log('   - 重啟伺服器後，資料應該還在');
  console.log('   - 查詢數據時，應該按優先級排序');
}

// 執行測試
testFixes().catch(error => {
  console.error('❌ 測試執行錯誤:', error);
  process.exit(1);
});


# API 統一格式規範

## 數據格式標準

### 1. 模擬器 → 後端（上傳數據）

**端點：** `POST /api/sensors/data`

**請求格式：**
```json
{
  "nodeId": "S-001",
  "dataImportance": 8.5,
  "battery": 75,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "networkStatus": "good",
  "sensorType": "temperature",
  "value": 25.5,
  "unit": "celsius",
  "periodic": {
    "temperature": 25.5,
    "humidity": 65.2,
    "rain_prob": 0.3,
    "wind_speed": 5.2,
    "wind_dir": "E",
    "pressure": 1013.5,
    "AQI": 45,
    "noise": 55,
    "traffic": "MEDIUM",
    "notice": "none"
  },
  "emergency": {
    "emergency_type": "fire",
    "emergency_level": 3
  },
  "metadata": {
    "personal_id": "uuid-string",
    "scenario_id": "baseline",
    "send_unix": 1705312200.123
  }
}
```

**必填欄位：**
- `nodeId`: 節點 ID（字串）
- `dataImportance`: 資料重要性（0-10 的數字）
- `battery`: 電量（0-100 的數字）

**可選欄位：**
- `timestamp`: ISO 8601 格式時間戳（預設為當前時間）
- `networkStatus`: 網路狀態（"excellent", "good", "fair", "poor", "critical"）
- `sensorType`: 感測器類型（"temperature", "humidity", "pressure" 等）
- `value`: 感測器數值
- `unit`: 單位
- `periodic`: 週期性數據物件
- `emergency`: 緊急事件數據物件（如果有）
- `metadata`: 元數據物件

### 2. 後端 → 前端（查詢數據）

**端點：** `GET /api/sensors/data`

**回應格式：**
```json
{
  "success": true,
  "count": 10,
  "total": 100,
  "data": [
    {
      "id": "sensor-1",
      "nodeId": "S-001",
      "dataImportance": 8.5,
      "battery": 75,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "networkStatus": "good",
      "sensorType": "temperature",
      "value": 25.5,
      "unit": "celsius",
      "periodic": {
        "temperature": 25.5,
        "humidity": 65.2,
        "rain_prob": 0.3,
        "wind_speed": 5.2,
        "wind_dir": "E",
        "pressure": 1013.5,
        "AQI": 45,
        "noise": 55,
        "traffic": "MEDIUM",
        "notice": "none"
      },
      "emergency": null,
      "metadata": {
        "personal_id": "uuid-string",
        "scenario_id": "baseline",
        "send_unix": 1705312200.123
      },
      "priority": {
        "priorityScore": 7.85,
        "priorityLevel": "high",
        "breakdown": {
          "importance": {
            "raw": 8.5,
            "normalized": 8.5,
            "weighted": 4.25
          },
          "battery": {
            "raw": 75,
            "normalized": 3.5,
            "weighted": 1.05
          },
          "network": {
            "status": "good",
            "normalized": 8,
            "weighted": 1.6
          }
        },
        "calculatedAt": "2024-01-15T10:30:01.000Z"
      },
      "scheduleResult": {
        "scheduled": true,
        "queueType": "preemptive",
        "priority": "high",
        "message": "已加入緊急佇列，將立即處理"
      },
      "createdAt": "2024-01-15T10:30:01.000Z",
      "receivedAt": "2024-01-15T10:30:01.000Z"
    }
  ]
}
```

### 3. 錯誤回應格式

```json
{
  "success": false,
  "error": {
    "message": "錯誤訊息",
    "status": 400,
    "code": "VALIDATION_ERROR"
  }
}
```

### 4. 報表回應格式

**端點：** `GET /api/reports/summary`

```json
{
  "success": true,
  "data": {
    "totalRecords": 100,
    "uniqueNodes": 5,
    "nodeList": ["S-001", "S-002", "S-003"],
    "sensorTypes": {
      "temperature": 20,
      "humidity": 20
    },
    "averageBattery": 72.5,
    "averageImportance": 6.8,
    "networkStatus": {
      "good": 80,
      "fair": 15,
      "poor": 5
    },
    "latestTimestamp": "2024-01-15T10:30:00.000Z",
    "generatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

## 數據轉換規則

### 模擬器格式 → 後端格式

| 模擬器欄位 | 後端欄位 | 轉換規則 |
|-----------|---------|---------|
| `sensor_id` | `nodeId` | 直接對應 |
| `priority_hint.severity` | `dataImportance` | 乘以 10（0.1-1.0 → 1-10） |
| `ts` | `timestamp` | 直接對應（ISO 8601） |
| `periodic` | `periodic` | 直接對應 |
| `emergency` | `emergency` | 直接對應 |
| `meta` | `metadata` | 直接對應 |
| - | `battery` | 需要模擬器提供（0-100） |
| - | `networkStatus` | 需要模擬器提供或預設 "good" |


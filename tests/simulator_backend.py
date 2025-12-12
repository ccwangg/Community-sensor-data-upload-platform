"""
感測器數據模擬器 - 真實發送 HTTP 請求到後端 API
取代原本的 simulator.py（只寫 CSV 的版本）
"""

import requests
import time
import random
from datetime import datetime, timezone

# 後端 API 端點
API_ENDPOINT = "http://localhost:3000/api/sensors/data"

def generateSensorData(sensor_id, scenario="baseline"):
    """
    生成感測器數據
    
    Args:
        sensor_id: 感測器 ID (例如 "S-001")
        scenario: 測試場景 ("baseline", "heavy", "spike")
    
    Returns:
        感測器數據字典
    """
    # 根據場景調整數據範圍
    if scenario == "heavy":
        # 網路壅塞場景：較高的資料重要性，較低的電量
        data_importance = random.uniform(7, 10)
        battery = random.uniform(20, 60)
        network_status = random.choice(["fair", "poor"])
    elif scenario == "spike":
        # 突發流量場景：極高的資料重要性
        data_importance = random.uniform(8.5, 10)
        battery = random.uniform(10, 50)
        network_status = random.choice(["good", "fair"])
    else:  # baseline
        # 正常場景
        data_importance = random.uniform(3, 8)
        battery = random.uniform(40, 100)
        network_status = random.choice(["excellent", "good", "fair"])
    
    # 生成感測器讀數
    payload = {
        "nodeId": sensor_id,
        "dataImportance": round(data_importance, 1),
        "battery": round(battery, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "networkStatus": network_status,
        "sensorType": random.choice(["temperature", "humidity", "pressure", "air_quality"]),
        "value": round(random.uniform(20, 30), 1),
        "unit": "celsius",
        "periodic": {
            "temperature": round(random.uniform(20, 30), 1),
            "humidity": round(random.uniform(40, 80), 1),
            "rain_prob": round(random.uniform(0, 1), 2),
            "wind_speed": round(random.uniform(0, 30), 1),
            "wind_dir": random.choice(["E", "S", "W", "N", "SE", "NE", "SW", "NW"]),
            "pressure": round(random.uniform(980, 1030), 1),
            "AQI": random.randint(5, 100),
            "noise": round(random.uniform(30, 80), 1),
            "traffic": random.choice(["LOW", "MEDIUM", "HIGH"]),
            "notice": "none"
        },
        "emergency": None,
        "metadata": {
            "personal_id": f"uuid-{random.randint(1000, 9999)}",
            "scenario_id": scenario,
            "send_unix": time.time()
        }
    }
    
    return payload

def sendToBackend(payload, retry=3):
    """
    發送數據到後端 API（真實 HTTP 請求）
    
    Args:
        payload: 數據字典
        retry: 重試次數
    
    Returns:
        回應結果字典
    """
    try:
        response = requests.post(
            API_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        
        result = {
            "status_code": response.status_code,
            "success": response.status_code in [200, 201],
            "response": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return result
        
    except requests.exceptions.RequestException as e:
        if retry > 0:
            time.sleep(0.5)
            return sendToBackend(payload, retry - 1)
        return {
            "status_code": 0,
            "success": False,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

def main(
    sensors_n=5,
    per_sensor_msg=2,
    interval=0.5,
    scenario="baseline",
    continuous=False,
    duration=None
):
    """
    主函數：模擬感測器數據發送
    
    Args:
        sensors_n: 感測器數量
        per_sensor_msg: 每個感測器發送的訊息數
        interval: 發送間隔（秒）
        scenario: 測試場景
        continuous: 是否持續運行
        duration: 持續運行時間（秒），None 表示無限
    """
    print(f"🚀 開始模擬器測試")
    print(f"📡 後端 URL: {API_ENDPOINT}")
    print(f"📊 場景: {scenario}")
    
    if continuous:
        print(f"🔄 模式: 持續運行" + (f" ({duration} 秒)" if duration else "（無限）"))
        start_time = time.time()
        sensor_id = 0
        
        try:
            while True:
                if duration and (time.time() - start_time) > duration:
                    break
                
                sensor_id_str = f"S-{sensor_id % sensors_n:03d}"
                payload = generateSensorData(sensor_id_str, scenario)
                result = sendToBackend(payload)
                
                if result["success"]:
                    print(f"✅ [{sensor_id_str}] 發送成功 (優先級: {payload['dataImportance']:.1f})")
                else:
                    print(f"❌ [{sensor_id_str}] 發送失敗: {result.get('error', result.get('status_code'))}")
                
                sensor_id += 1
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print("\n⏹️  模擬器已停止")
    else:
        print(f"📦 模式: 固定數量 ({sensors_n} 個感測器，每個 {per_sensor_msg} 筆)")
        
        success_count = 0
        fail_count = 0
        
        for sensor_id in range(sensors_n):
            sensor_id_str = f"S-{sensor_id:03d}"
            for msg_id in range(per_sensor_msg):
                payload = generateSensorData(sensor_id_str, scenario)
                result = sendToBackend(payload)
                
                if result["success"]:
                    success_count += 1
                    print(f"✅ [{sensor_id_str}] 訊息 {msg_id+1}/{per_sensor_msg} 發送成功")
                else:
                    fail_count += 1
                    print(f"❌ [{sensor_id_str}] 訊息 {msg_id+1}/{per_sensor_msg} 發送失敗: {result.get('error', result.get('status_code'))}")
                
                if msg_id < per_sensor_msg - 1:
                    time.sleep(interval)
            
            if sensor_id < sensors_n - 1:
                time.sleep(interval)
        
        print(f"\n📊 統計:")
        print(f"   成功: {success_count}")
        print(f"   失敗: {fail_count}")
        print(f"   總計: {success_count + fail_count}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="感測器數據模擬器 - 真實發送 HTTP 請求到後端")
    parser.add_argument("--sensors", type=int, default=5, help="感測器數量")
    parser.add_argument("--messages", type=int, default=2, help="每個感測器發送的訊息數")
    parser.add_argument("--interval", type=float, default=0.5, help="發送間隔（秒）")
    parser.add_argument("--scenario", type=str, default="baseline", choices=["baseline", "heavy", "spike"], help="測試場景")
    parser.add_argument("--continuous", action="store_true", help="持續運行模式")
    parser.add_argument("--duration", type=int, help="持續運行時間（秒）")
    parser.add_argument("scenario_pos", nargs="?", help="測試場景（位置參數，向後兼容）")
    
    args = parser.parse_args()
    
    # 向後兼容：如果提供了位置參數，使用它作為 scenario
    if args.scenario_pos:
        args.scenario = args.scenario_pos
    
    main(
        sensors_n=args.sensors,
        per_sensor_msg=args.messages,
        interval=args.interval,
        scenario=args.scenario,
        continuous=args.continuous,
        duration=args.duration
    )


"""
模擬器 - 連接後端 API 版本
支援統一的 JSON 格式，直接發送到後端 API
"""

import time
import uuid
import random
import requests
import json
from datetime import datetime, timezone

# 後端 API 設定
BACKEND_URL = "http://localhost:3000"
API_ENDPOINT = f"{BACKEND_URL}/api/sensors/data"

def dataLoading(sensor_id, scenario="baseline", battery=None):
    """
    創建感測器數據（統一格式）
    
    Args:
        sensor_id: 感測器 ID
        scenario: 測試場景
        battery: 電量（如果未提供則隨機生成）
    
    Returns:
        符合後端 API 格式的數據字典
    """
    now = datetime.now(timezone.utc).isoformat()
    personal_id = str(uuid.uuid4())

    # 週期性數據
    periodic_data = {
        "temperature": round(random.uniform(0, 38), 1),
        "humidity": round(random.uniform(40, 90), 1),
        "rain_prob": round(random.uniform(0, 1), 2),
        "wind_speed": round(random.uniform(0, 20), 1),  # m/s
        "wind_dir": random.choice(["E", "S", "W", "N"]),
        "pressure": round(random.uniform(900, 1060), 1),
        "AQI": random.randint(10, 150),
        "noise": random.randint(30, 120),  # db
        "traffic": random.choice(["LOW", "MEDIUM", "HIGH"]),
        "notice": random.choice(["none", "event", "maintenance"])
    }

    # 判斷是否為緊急事件（5% 機率）
    emergency = random.random() < 0.05
    emergency_data = None

    if emergency:
        emergency_data = {
            "emergency_type": random.choice(["fire", "earthquake", "intrusion"]),
            "emergency_level": random.randint(1, 5)
        }
        severity = 0.95  # 緊急事件高優先級
    else:
        severity = round(random.uniform(0.1, 0.5), 1)

    # 電量（如果未提供則隨機生成，低電量時優先級會提高）
    if battery is None:
        battery = round(random.uniform(20, 100), 1)

    # 網路狀態（根據場景調整）
    network_status_map = {
        "baseline": ["excellent", "good", "good", "good", "fair"],
        "heavy": ["good", "fair", "fair", "poor", "poor"],
        "spike": ["good", "fair", "poor", "poor", "critical"]
    }
    network_status = random.choice(network_status_map.get(scenario, ["good"]))

    # 統一格式：後端 API 格式
    payload = {
        "nodeId": sensor_id,
        "dataImportance": round(severity * 10, 1),  # 轉換為 0-10 範圍
        "battery": battery,
        "timestamp": now,
        "networkStatus": network_status,
        "sensorType": "temperature",  # 主要感測器類型
        "value": periodic_data["temperature"],
        "unit": "celsius",
        "periodic": periodic_data,
        "emergency": emergency_data,
        "metadata": {
            "personal_id": personal_id,
            "scenario_id": scenario,
            "send_unix": time.time()
        }
    }

    return payload

def sendToBackend(payload, retry=3):
    """
    發送數據到後端 API
    
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
    backend_url=None,
    continuous=False,
    duration=None
):
    """
    主函數：模擬多個感測器發送數據
    
    Args:
        sensors_n: 感測器數量
        per_sensor_msg: 每個感測器發送的訊息數（持續模式時無效）
        interval: 發送間隔（秒）
        scenario: 測試場景（baseline, heavy, spike）
        backend_url: 後端 URL（可選，覆蓋預設值）
        continuous: 是否持續運行模式（True = 無限運行，False = 發送固定數量後停止）
        duration: 持續運行時間（秒），None 表示無限運行
    """
    global BACKEND_URL, API_ENDPOINT
    
    if backend_url:
        BACKEND_URL = backend_url
        API_ENDPOINT = f"{BACKEND_URL}/api/sensors/data"

    print(f"🚀 開始模擬器測試")
    print(f"📡 後端 URL: {BACKEND_URL}")
    print(f"📊 場景: {scenario}")
    print(f"🔢 感測器數量: {sensors_n}")
    if continuous:
        print(f"🔄 模式: 持續運行（自動生成數據）")
        if duration:
            print(f"⏰ 運行時間: {duration} 秒")
        else:
            print(f"⏰ 運行時間: 無限（按 Ctrl+C 停止）")
    else:
        print(f"📨 每感測器訊息數: {per_sensor_msg}")
    print(f"⏱️  發送間隔: {interval} 秒\n")

    results = []
    success_count = 0
    fail_count = 0
    start_time = time.time()
    message_count = 0

    try:
        if continuous:
            # 持續運行模式
            print("🔄 進入持續運行模式，開始自動生成數據...")
            print("💡 提示：按 Ctrl+C 可停止模擬器\n")
            
            while True:
                # 檢查是否超過運行時間
                if duration and (time.time() - start_time) >= duration:
                    print(f"\n⏰ 已達到運行時間限制（{duration} 秒），停止運行")
                    break
                
                # 輪流從每個感測器發送數據
                for sensor_idx in range(sensors_n):
                    sensor_id = f"S-{sensor_idx:03d}"
                    message_count += 1
                    
                    # 生成數據
                    payload = dataLoading(sensor_id, scenario)
                    
                    # 發送到後端
                    result = sendToBackend(payload)
                    results.append({
                        "sensor_id": sensor_id,
                        "message_id": message_count,
                        "payload": payload,
                        "result": result,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })

                    if result["success"]:
                        success_count += 1
                        priority_info = result.get("response", {}).get("data", {}).get("priority", {})
                        elapsed = time.time() - start_time
                        print(f"  ✅ [{message_count}] {sensor_id} - 優先級: {priority_info.get('priorityScore', 'N/A'):.1f} ({priority_info.get('priorityLevel', 'N/A')}) | 運行時間: {elapsed:.1f}s")
                    else:
                        fail_count += 1
                        elapsed = time.time() - start_time
                        print(f"  ❌ [{message_count}] {sensor_id} - 失敗 (狀態碼: {result['status_code']}) | 運行時間: {elapsed:.1f}s")

                    # 每 10 筆顯示一次統計
                    if message_count % 10 == 0:
                        rate = (success_count / message_count * 100) if message_count > 0 else 0
                        print(f"  📊 統計: 總數={message_count}, 成功={success_count}, 失敗={fail_count}, 成功率={rate:.1f}%")
                    
                    time.sleep(interval)
        else:
            # 固定數量模式（原有邏輯）
            for sensor_idx in range(sensors_n):
                sensor_id = f"S-{sensor_idx:03d}"
                print(f"📡 感測器 {sensor_id} 開始發送...")

                for msg_idx in range(per_sensor_msg):
                    message_count += 1
                    # 生成數據
                    payload = dataLoading(sensor_id, scenario)
                    
                    # 發送到後端
                    result = sendToBackend(payload)
                    results.append({
                        "sensor_id": sensor_id,
                        "message_id": msg_idx + 1,
                        "payload": payload,
                        "result": result
                    })

                    if result["success"]:
                        success_count += 1
                        priority_info = result.get("response", {}).get("data", {}).get("priority", {})
                        print(f"  ✅ [{msg_idx + 1}] 成功 - 優先級: {priority_info.get('priorityScore', 'N/A')} ({priority_info.get('priorityLevel', 'N/A')})")
                    else:
                        fail_count += 1
                        print(f"  ❌ [{msg_idx + 1}] 失敗 - 狀態碼: {result['status_code']}")

                    time.sleep(interval)

                print()

    except KeyboardInterrupt:
        print("\n\n⚠️  收到中斷信號（Ctrl+C），正在停止模擬器...")

    # 統計結果
    elapsed_time = time.time() - start_time
    print("\n" + "=" * 60)
    print("📊 發送結果統計")
    print("=" * 60)
    print(f"✅ 成功: {success_count}")
    print(f"❌ 失敗: {fail_count}")
    print(f"📈 總數: {message_count}")
    if message_count > 0:
        print(f"📈 成功率: {(success_count / message_count * 100):.1f}%")
    print(f"⏱️  運行時間: {elapsed_time:.1f} 秒")
    if message_count > 0:
        print(f"📊 平均發送速率: {message_count / elapsed_time:.2f} 筆/秒")
    print("=" * 60)

    # 保存結果到 JSON 文件
    output_file = f"../report/simulator_results_{scenario}.json"
    import os
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "scenario": scenario,
            "mode": "continuous" if continuous else "fixed",
            "duration": elapsed_time,
            "summary": {
                "total": message_count,
                "success": success_count,
                "fail": fail_count,
                "success_rate": (success_count / message_count * 100) if message_count > 0 else 0,
                "avg_rate": message_count / elapsed_time if elapsed_time > 0 else 0
            },
            "results": results[-100:] if len(results) > 100 else results  # 只保存最後 100 筆
        }, f, indent=2, ensure_ascii=False)

    print(f"\n💾 結果已保存至: {output_file}")

if __name__ == "__main__":
    import sys
    import argparse
    
    # 檢查是否使用舊格式（位置參數）
    scenario = "baseline"
    backend_url = None
    continuous = False
    duration = None
    sensors_n = 5
    per_sensor_msg = 3
    interval = 0.5
    
    # 向後兼容：檢查是否有位置參數（舊格式）
    if len(sys.argv) > 1 and not sys.argv[1].startswith('-'):
        # 舊格式：python simulator_backend.py baseline [backend_url]
        scenario = sys.argv[1]
        if len(sys.argv) > 2 and not sys.argv[2].startswith('-'):
            backend_url = sys.argv[2]
        
        # 使用舊格式的預設值
        print("⚠️  使用舊格式參數，建議使用新格式：")
        print("   python simulator_backend.py --scenario baseline --continuous")
        print()
        
        main(
            sensors_n=sensors_n,
            per_sensor_msg=per_sensor_msg,
            interval=interval,
            scenario=scenario,
            backend_url=backend_url,
            continuous=continuous,
            duration=duration
        )
    else:
        # 新格式：使用 argparse
        parser = argparse.ArgumentParser(
            description='感測器數據模擬器 - 自動生成並發送數據到後端 API',
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
使用範例:
  # 持續運行模式（無限）- 推薦
  python simulator_backend.py --continuous
  
  # 持續運行 60 秒
  python simulator_backend.py --continuous --duration 60
  
  # 固定數量模式
  python simulator_backend.py --sensors 5 --messages 10
  
  # 指定場景和後端 URL
  python simulator_backend.py --scenario heavy --backend http://localhost:3000 --continuous
  
  # 舊格式（向後兼容）
  python simulator_backend.py baseline
  python simulator_backend.py heavy http://localhost:3000
            """
        )
        
        parser.add_argument('--scenario', '-s', 
                           default='baseline',
                           choices=['baseline', 'heavy', 'spike'],
                           help='測試場景 (預設: baseline)')
        
        parser.add_argument('--backend', '-b',
                           default=None,
                           help='後端 URL (預設: http://localhost:3000)')
        
        parser.add_argument('--sensors', '-n',
                           type=int,
                           default=5,
                           help='感測器數量 (預設: 5)')
        
        parser.add_argument('--messages', '-m',
                           type=int,
                           default=3,
                           help='每個感測器發送的訊息數（僅固定模式，預設: 3)')
        
        parser.add_argument('--interval', '-i',
                           type=float,
                           default=0.5,
                           help='發送間隔（秒，預設: 0.5)')
        
        parser.add_argument('--continuous', '-c',
                           action='store_true',
                           help='持續運行模式（自動生成數據，無限運行）')
        
        parser.add_argument('--duration', '-d',
                           type=int,
                           default=None,
                           help='持續運行時間（秒），僅在 --continuous 模式下有效')
        
        args = parser.parse_args()
        
        main(
            sensors_n=args.sensors,
            per_sensor_msg=args.messages,
            interval=args.interval,
            scenario=args.scenario,
            backend_url=args.backend,
            continuous=args.continuous,
            duration=args.duration
        )


"""
⚠️ 已棄用 (DEPRECATED) ⚠️

此檔案為舊版模擬器，不符合簡報架構要求。

問題：
- 使用 fakeSend() 函式，只寫入 CSV 檔案
- 沒有發送 HTTP POST 請求到後端 API
- 欄位名稱不統一（使用 sensor_id, priority_hint 而非 nodeId, dataImportance）

請使用 tests/simulator_backend.py 作為主要模擬器：
- 正確發送 HTTP POST 到後端 API
- 使用統一的 JSON 格式
- 符合簡報架構要求

此檔案保留僅供參考，不建議使用。
"""

import time, uuid, csv, random, os, json
from datetime import datetime, timezone

# C:\HOME\1141\computer network\final_project\sim

def dataLoading(sensor_id, scenario = "baseline"):     # 創建資料
    now = datetime.now(timezone.utc).isoformat()    # 現在的utc時間用iso格式
    personal_id = str(uuid.uuid4())                 # 產生一個絕對不會撞的編號 像亂碼
    # severity = random.randint(0.1, 1)       # 優先級(亂選)

    periodic_data = {     # 溫度、濕度、降雨機率、風速、風向、氣壓、空氣品質、噪音、交通、公告
        "temperature": round(random.uniform(0, 38), 1),      
        "humidity": round(random.uniform(40, 90), 1),
        "rain_prob": round(random.uniform(0, 1), 2),       
        "wind_speed": round(random.uniform(0, 20), 1),     # m/s
        "wind_dir": random.choice(["E", "S", "W", "N"]),
        "pressure": round(random.uniform(900, 1060), 1),
        "AQI": random.randint(10, 150), 
        "noise": random.randint(30, 120),                  # db
        "traffic": random.choice(["LOW", "MEDIUM", "HIGH"]),         # 低中高
        "notice": random.choice(["none", "event", "maintenance"])
    }

    emergency = random.random()<0.05
    emergency_data = None

    if emergency:
        emergency_data = {
            "emergency_type": random.choice(["fire", "earthquake", "intrusion"]),
            "emergency_level": random.randint(1, 5)
        }
        severity = 0.95
    else: severity = round(random.uniform(0.1, 0.5), 1)

    payload = {          # 每筆資料的資訊
        "sensor_id":sensor_id,                      # 哪台sensor
        "ts":now,                                   # timestamp時間戳記

        "priority_hint":{
            "severity":severity,                            # 用數字
            "deadline_ms":5000 if severity>0.5 else 15000   # 最晚要多久送到
        },
    
        "periodic": periodic_data,
        "emergency": emergency_data, 

        "meta":{
            "personal_id":personal_id,
            "scenario_id":scenario,                 # 多種不同的測試場景
            "send_unix":time.time()                 # 從1970/1/1到現在經過多少秒 相減可以算過程時間
        }
    }
    return payload

def fakeSend(payload, scenario):      # 利用假傳送計算延遲
    t0 = time.perf_counter()                        # 像碼表的東東 精度高
    delay = random.uniform(0.05, 0.2)               # 隨機的小數  !丟包機率
    time.sleep(delay)
    t1 = time.perf_counter()
    
    weight = []
    if scenario == "baseline": weight = [85, 3, 3, 5, 2, 2]      # 200 400 403 404 500 503
    elif scenario == "heavy": weight = [60, 3, 4, 3, 15, 15]     
    else: weight = [50, 8, 8, 6, 14, 14]
    status_code = random.choices(
        population = [200, 400, 403, 404, 500, 503],
        weights = weight,
        k = 1
    )[0]

    return {                    # !如果沒成功
        "status_code":status_code,      # 200成功 201建立成功 400格式錯誤 403無權限 404找不到 500後端掛掉 503雍塞
        "rttms":(t1-t0)*1000                        # 延遲幾毫秒
    }

def main( 
    sensors_n = 5,                                 # 幾個sensor
    per_sensor_msg = 2,                            # 每個sensor發多少訊息
    interval = 0.5,                                 # 發訊息的間隔
    log_path = None,                                # 輸出路徑
    scenario = "baseline"
):
    log_path = f"../report/log_{scenario}.csv"
    os.makedirs(os.path.dirname(log_path), exist_ok = True)     # 確認資料夾存在 沒有就創建
    f = open(log_path, "w", newline = "", encoding = "utf-8")   # 不要自動加空行
    w = csv.writer(f)

    w.writerow([
        "personal_id", "sensor_id", "severity", "deadline_ms", "send_unix",
        "status_code", "rttms", "emergency_type", "emergency_level"
    ])

    weather_list = []

    print(f"開始傳送資料……(scenario = {scenario})")

    for id in range(sensors_n):                                 # 每台sensor
        sensor_id = f"S-{id:03d}"                               # d = decimal
        for n in range(per_sensor_msg):                         # _不重要
        
            payload = dataLoading(sensor_id, scenario)   # "baseline"/"heavy"網路壅塞/"spike"突暴發量
            result = fakeSend(payload, scenario)

            em = payload["emergency"]
            etype = em["emergency_type"] if em else None
            elevel = em["emergency_level"] if em else None
            w.writerow([
                payload["meta"]["personal_id"],
                payload["sensor_id"],
                payload["priority_hint"]["severity"],
                payload["priority_hint"]["deadline_ms"],
                payload["meta"]["send_unix"],
                result["status_code"], 
                result["rttms"],
                etype, elevel
            ])

            periodic = payload["periodic"]
            weather_list.append({
                "sensor_id": sensor_id,
                "data_number":n+1,
                "timestamp": payload["ts"],
                **periodic                          # 展開所有資料
            })

            f.flush()                                           # 立刻寫進檔案
            time.sleep(interval)

    f.close()

    weather_path = f"../report/weather_periodic_data.json"
    with open(weather_path, "w", encoding="utf-8") as jf:
        json.dump(weather_list, jf, indent = 2, ensure_ascii=False)         # 把py寫進json
    print("傳送結束，結果已寫入", log_path, "了喵")
    print(f"天氣資料已輸出：{weather_path}")

if __name__ == "__main__": main(scenario = "spike")

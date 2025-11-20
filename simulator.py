import time
import uuid
import csv
import random
import os
from datetime import datetime, timezone

# C:\HOME\1141\computer network\final_project\sim

def dataLoading(sensor_id, scenario = "baseline"):     # 創建資料
    now = datetime.now(timezone.utc).isoformat()    # 現在的utc時間用iso格式
    personal_id = str(uuid.uuid4())                 # 產生一個絕對不會撞的編號 像亂碼
    severity = random.choice([0.1, 0.3, 0.8])       # 優先級(亂選)

    payload = {          # 每筆資料的資訊
        "sensor_id":sensor_id,                      # 哪台sensor
        "ts":now,                                   # timestamp時間戳記
        "type":"temp",

        "priority_hint":{
            "severity":severity,
            "deadline_ms":5000 if severity>0.5 else 15000   # 最晚要多久送到
        },

        "meta":{
            "personal_id":personal_id,
            "scenario_id":scenario,                 # 多種不同的測試場景
            "send_unix":time.time()                 # 從1970/1/1到現在經過多少秒 相減可以算過程時間
        }
    }
    return payload

def fakeSend(payload):      # 利用假傳送計算延遲
    t0 = time.perf_counter()                        # 像碼表的東東 精度高
    delay = random.uniform(0.05, 0.2)               # 隨機的小數  !丟包機率
    time.sleep(delay)
    t1 = time.perf_counter()

    return {                    # !如果沒成功
        "status_code":200,      # 200成功 201建立成功 400格式錯誤 403無權限 404找不到 500後端掛掉 503雍塞
        "rttms":(t1-t0)*1000                        # 延遲幾毫秒
    }


def main( 
    sensors_n = 50,                                 # 幾個sensor
    per_sensor_msg = 10,                            # 每個sensor發多少訊息
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
        "status_code", "rttms"
    ])

    print(f"開始傳送資料……(scenario = {scenario})")

    for id in range(sensors_n):                                 # 每台sensor
        sensor_id = f"S-{id:03d}"                               # d = decimal
        for _ in range(per_sensor_msg):                         # _不重要
        
            payload = dataLoading(sensor_id, scenario)   # "baseline"/"heavy"網路壅塞/"spike"突暴發量
            result = fakeSend(payload)

            w.writerow([
                payload["meta"]["personal_id"],
                payload["sensor_id"],
                payload["priority_hint"]["severity"],
                payload["priority_hint"]["deadline_ms"],
                payload["meta"]["send_unix"],
                result["status_code"],
                result["rttms"]
            ])

            f.flush()                                           # 立刻寫進檔案
            time.sleep(interval)

    f.close()
    print("傳送結束，結果已寫入", log_path, "了喵")

if __name__ == "__main__": main(scenario = "spike")
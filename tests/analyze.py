import pandas as pd
import json, os

# 輸出json檔
def analyze(path):
    df = pd.read_csv(path)              # dataframe分析表格


    avg = df["rttms"].mean()            # = average(rttms)  
    P95 = df["rttms"].quantile(0.95)    # 找到「95% 的資料都比它小」的那個數值。
    success = (df["status_code"] == 200).mean() *100        # true = 1/false = 0 再取平均
    scenario = path.split("_")[-1].replace(".csv", "")

    result_path = f"../report/analyze_result.csv"

    return{
        "avg": round(avg, 3),
        "P95": round(P95, 3),
        "success": round(success, 2)
    }

if __name__ == "__main__":
    paths = [
        "../report/log_baseline.csv",
        "../report/log_heavy.csv",
        "../report/log_spike.csv"
    ]
    results = {}
    for p in paths:
        scenario = p.split("_")[-1].replace(".csv", "")
        results[scenario] = analyze(p)

    out_path = "../report/analyze_result.json"
    os.makedirs(os.path.dirname(out_path), exist_ok = True)     # 確認exist
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent = 2, ensure_ascii=False)

    print(f"分析完成，結果已輸出到{out_path}")

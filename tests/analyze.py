import pandas as pd
import csv

# !輸出json檔
def analyze(path):
    df = pd.read_csv(path)              # dataframe分析表格


    avg = df["rttms"].mean()            # = average(rttms)  
    P95 = df["rttms"].quantile(0.95)    # 找到「95% 的資料都比它小」的那個數值。
    success = (df["status_code"] == 200).mean() *100        # true = 1/false = 0 再取平均

    result_path = f"../report/analyze_result.csv"
    with open(result_path, "a", newline = "", encoding = "utf-8") as f:
        w = csv.writer(f)

        if f.tell() == 0: w.writerow(["scenario", "avg", "P95", "success"])

        scenario = path.split("_")[-1].replace(".csv", "")
        w.writerow([scenario, avg, P95, success])

    print("------分析結果------")
    print(f"檔案：{path}")
    print(f"資料筆數 :{len(df)}")
    print(f"平均延遲 :{avg:.2f}ms")
    print(f"P95延遲 :{P95:.2f}ms")
    print(f"成功率 :{success:.1f}%")
    print("------\n------")

if __name__ == "__main__":
    paths = [
        "../report/log_baseline.csv",
        "../report/log_heavy.csv",
        "../report/log_spike.csv"
    ]

    for p in paths: analyze(p)
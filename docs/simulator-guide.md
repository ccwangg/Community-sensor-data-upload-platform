# 模擬器使用指南

## 快速開始

### 最簡單的方式（推薦）

```bash
# 自動生成數據，持續運行（按 Ctrl+C 停止）
python tests/simulator_backend.py --continuous
```

### 舊格式（向後兼容）

```bash
# 舊格式仍然支援
python tests/simulator_backend.py baseline
python tests/simulator_backend.py heavy
python tests/simulator_backend.py spike
```

## 自動生成數據模式

模擬器支援兩種運行模式：

### 1. 持續運行模式（推薦）

自動生成數據並持續發送到後端，直到手動停止。

```bash
# 基本用法：無限運行
python tests/simulator_backend.py --continuous

# 運行指定時間（例如 60 秒）
python tests/simulator_backend.py --continuous --duration 60

# 自訂參數
python tests/simulator_backend.py --continuous \
    --sensors 5 \
    --interval 1.0 \
    --scenario baseline
```

### 2. 固定數量模式

發送固定數量的數據後自動停止。

```bash
# 基本用法
python tests/simulator_backend.py --sensors 5 --messages 10

# 自訂參數
python tests/simulator_backend.py \
    --sensors 3 \
    --messages 5 \
    --interval 0.5 \
    --scenario heavy
```

## 命令行參數

| 參數 | 簡寫 | 說明 | 預設值 |
|------|------|------|--------|
| `--scenario` | `-s` | 測試場景 (baseline/heavy/spike) | baseline |
| `--backend` | `-b` | 後端 URL | http://localhost:3000 |
| `--sensors` | `-n` | 感測器數量 | 5 |
| `--messages` | `-m` | 每個感測器訊息數（僅固定模式） | 3 |
| `--interval` | `-i` | 發送間隔（秒） | 0.5 |
| `--continuous` | `-c` | 持續運行模式 | False |
| `--duration` | `-d` | 運行時間（秒，僅持續模式） | None（無限） |

## 使用範例

### 範例 1：快速啟動自動生成

```bash
# 最簡單的方式
python tests/simulator_backend.py --continuous
```

### 範例 2：運行 5 分鐘後自動停止

```bash
python tests/simulator_backend.py --continuous --duration 300
```

### 範例 3：高頻率發送（測試壓力）

```bash
python tests/simulator_backend.py --continuous \
    --sensors 10 \
    --interval 0.2 \
    --scenario spike
```

### 範例 4：連接到遠端後端

```bash
python tests/simulator_backend.py --continuous \
    --backend http://192.168.1.100:3000
```

### 範例 5：固定數量測試

```bash
python tests/simulator_backend.py \
    --sensors 3 \
    --messages 20 \
    --interval 0.5
```

## 場景說明

- **baseline**: 正常場景，網路狀況良好
- **heavy**: 網路壅塞場景，較多錯誤
- **spike**: 突發流量場景，網路狀況不穩定

## 停止模擬器

在持續運行模式下：
- 按 `Ctrl+C` 可安全停止
- 模擬器會顯示統計資訊並保存結果

## 輸出文件

結果會自動保存到：`report/simulator_results_{scenario}.json`

包含：
- 發送統計（成功/失敗數量、成功率）
- 運行時間和平均速率
- 最後 100 筆數據記錄

## 注意事項

1. **確保後端已啟動**：模擬器需要後端 API 運行在 `http://localhost:3000`
2. **網路連接**：確保可以連接到後端伺服器
3. **資源使用**：持續運行模式會持續消耗資源，請適度使用
4. **數據量**：持續模式會產生大量數據，注意後端儲存空間

## 快速啟動腳本

也可以使用簡化腳本：

```bash
python tests/simulator_auto.py
```

這會自動啟動持續運行模式，使用預設參數。


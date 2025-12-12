"""
簡化版自動模擬器 - 快速啟動持續運行模式
"""

import subprocess
import sys

if __name__ == "__main__":
    print("🚀 啟動自動數據生成模擬器...")
    print("💡 提示：按 Ctrl+C 可停止\n")
    
    # 使用持續運行模式
    subprocess.run([
        sys.executable,
        "simulator_backend.py",
        "--continuous",
        "--sensors", "5",
        "--interval", "1.0",
        "--scenario", "baseline"
    ])


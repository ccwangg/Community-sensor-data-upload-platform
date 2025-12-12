import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';

// 後端 API 設定
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// --- ECharts React Hook ---
const useEcharts = (options, chartId) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!chartRef.current) return;

        if (chartInstance.current) {
            try { echarts.dispose(chartInstance.current); } catch (e) {}
        }
        
        try {
            chartInstance.current = echarts.init(chartRef.current, 'dark');
        } catch (error) {
            console.error("ECharts 初始化失敗:", error);
            return;
        }

        const resizeChart = () => {
            if (chartInstance.current) {
                chartInstance.current.resize();
            }
        };

        window.addEventListener('resize', resizeChart);

        return () => {
            window.removeEventListener('resize', resizeChart);
            if (chartInstance.current) {
                try { echarts.dispose(chartInstance.current); } catch (e) {}
                chartInstance.current = null;
            }
        };
    }, [chartId]);
    
    useEffect(() => {
        if (chartInstance.current && options) {
            try {
                // 確保選項有效（即使數據為空也要顯示圖表框架）
                const validOptions = options && Object.keys(options).length > 0 
                    ? options 
                    : {
                        title: { 
                            text: '暫無數據', 
                            textStyle: { color: '#9CA3AF' }, 
                            left: 'center', 
                            top: 'center' 
                        },
                        xAxis: { type: 'category', data: [] },
                        yAxis: { type: 'value' },
                        series: []
                    };
                
                chartInstance.current.setOption(validOptions, true);
                chartInstance.current.resize();
            } catch (error) {
                console.error("ECharts setOption 失敗:", error, "chartId:", chartId);
            }
        }
    }, [options, chartId]);
    
    return chartRef;
};

// --- ECharts 選項生成函數：PM2.5 趨勢圖 ---
const createPm25TrendOptions = (readings) => {
    const displayReadings = readings && readings.length > 0 ? readings.slice(-15) : []; 
    const timestamps = displayReadings.map(r => 
        r.timestamp ? new Date(r.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '載入中...'
    );
    const pm25Values = displayReadings.map(r => r.periodic?.AQI || r.value || 0);
    const locations = displayReadings.map(r => r.nodeId || 'N/A');

    return {
        grid: { top: '10%', left: '3%', right: '4%', bottom: '3%', containLabel: true },
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
                const data = params[0];
                const index = data.dataIndex;
                const locationsText = locations[index] || 'N/A';
                let tooltip = `時間: ${data.name}<br/>`;
                tooltip += `節點: ${locationsText}<br/>`;
                tooltip += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${data.color};"></span>AQI: <strong>${data.value}</strong>`;
                return tooltip;
            }
        },
        xAxis: {
            type: 'category',
            data: timestamps,
            name: '上傳時間',
            axisLabel: { color: '#9CA3AF' }
        },
        yAxis: {
            type: 'value',
            name: 'AQI',
            min: 0,
            max: 150, 
            splitLine: { lineStyle: { color: '#374151' } },
            axisLabel: { color: '#9CA3AF' }
        },
        series: [{
            name: 'AQI 數值',
            type: 'line',
            smooth: true,
            data: pm25Values,
            lineStyle: { color: '#34D399' },
            itemStyle: { color: '#34D399' },
            areaStyle: {
                opacity: 0.8,
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#34D399' },
                    { offset: 1, color: '#1F2937' }
                ])
            }
        }]
    };
};

// --- ECharts 選項生成函數：溫度與濕度比較圖 ---
const createTempHumidityOptions = (readings) => {
    const displayReadings = readings && readings.length > 0 ? readings.slice(-10) : [];
    const timestamps = displayReadings.map(r => 
        r.timestamp ? new Date(r.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '載入中...'
    );
    const tempValues = displayReadings.map(r => r.periodic?.temperature || 0);
    const humidityValues = displayReadings.map(r => r.periodic?.humidity || 0);

    return {
        grid: { top: '15%', left: '3%', right: '4%', bottom: '3%', containLabel: true },
        tooltip: { trigger: 'axis' },
        legend: {
            data: ['溫度 (°C)', '濕度 (%)'],
            textStyle: { color: '#E5E7EB' }
        },
        xAxis: {
            type: 'category',
            data: timestamps,
            name: '時間',
            axisLabel: { color: '#9CA3AF' }
        },
        yAxis: [{
            type: 'value',
            name: '溫度 (°C)',
            min: 0,
            max: 40,
            axisLabel: { formatter: '{value} °C', color: '#F87171' },
            splitLine: { lineStyle: { color: '#374151' } }
        }, {
            type: 'value',
            name: '濕度 (%)',
            min: 0,
            max: 100,
            axisLabel: { formatter: '{value} %', color: '#60A5FA' },
            splitLine: { show: false }
        }],
        series: [{
            name: '溫度 (°C)',
            type: 'bar',
            data: tempValues,
            itemStyle: { color: '#F87171' }
        }, {
            name: '濕度 (%)',
            type: 'line',
            yAxisIndex: 1,
            data: humidityValues,
            itemStyle: { color: '#60A5FA' },
            lineStyle: { color: '#60A5FA' }
        }]
    };
};

// --- ECharts 選項生成函數：氣壓趨勢圖 ---
const createPressureTrendOptions = (readings) => {
    const displayReadings = readings && readings.length > 0 ? readings.slice(-15) : [];
    const timestamps = displayReadings.map(r => 
        r.timestamp ? new Date(r.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '載入中...'
    );
    const pressureValues = displayReadings.map(r => r.periodic?.pressure || 0);

    return {
        grid: { top: '10%', left: '3%', right: '4%', bottom: '3%', containLabel: true },
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: timestamps,
            name: '時間',
            axisLabel: { color: '#9CA3AF' }
        },
        yAxis: {
            type: 'value',
            name: '氣壓 (hPa)',
            min: 980, 
            max: 1040, 
            axisLabel: { formatter: '{value} hPa', color: '#C084FC' },
            splitLine: { lineStyle: { color: '#374151' } }
        },
        series: [{
            name: '氣壓數值',
            type: 'line',
            smooth: true,
            data: pressureValues,
            lineStyle: { color: '#C084FC', width: 3 },
            itemStyle: { color: '#C084FC' },
            areaStyle: {
                opacity: 0.8,
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(192, 132, 252, 0.5)' },
                    { offset: 1, color: 'rgba(31, 41, 55, 0.1)' }
                ])
            }
        }]
    };
};

// --- ECharts 選項生成函數：噪音趨勢圖 ---
const createNoiseTrendOptions = (readings) => {
    const displayReadings = readings && readings.length > 0 ? readings.slice(-15) : []; 
    const timestamps = displayReadings.map(r => 
        r.timestamp ? new Date(r.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '載入中...'
    );
    const noiseValues = displayReadings.map(r => r.periodic?.noise || 0);

    return {
        grid: { top: '10%', left: '3%', right: '4%', bottom: '3%', containLabel: true },
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: timestamps,
            name: '時間',
            axisLabel: { color: '#9CA3AF' }
        },
        yAxis: {
            type: 'value',
            name: '噪音等級 (dB)',
            min: 30, 
            max: 80, 
            axisLabel: { formatter: '{value} dB', color: '#F472B6' },
            splitLine: { lineStyle: { color: '#374151' } }
        },
        series: [{
            name: '噪音數值',
            type: 'line',
            smooth: true,
            data: noiseValues,
            lineStyle: { color: '#F472B6', width: 3 },
            itemStyle: { color: '#F472B6' },
            areaStyle: {
                opacity: 0.8,
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(244, 114, 182, 0.5)' },
                    { offset: 1, color: 'rgba(31, 41, 55, 0.1)' }
                ])
            }
        }]
    };
};

// --- ECharts 選項生成函數：風速與風向圖 ---
const createWindOptions = (readings) => {
    const displayReadings = readings && readings.length > 0 ? readings.slice(-10) : [];
    const timestamps = displayReadings.map(r => 
        r.timestamp ? new Date(r.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '載入中...'
    );
    const windSpeedValues = displayReadings.map(r => r.periodic?.wind_speed || 0);
    const windDirectionData = displayReadings.map((r, index) => ({
        value: [timestamps[index], windSpeedValues[index]], 
        symbolSize: 0,
        label: {
            show: true,
            position: 'top',
            formatter: r.periodic?.wind_dir || 'N/A',
            color: '#F97316',
            fontWeight: 'bold',
            fontSize: 12,
            offset: [0, -15]
        }
    }));

    return {
        grid: { top: '20%', left: '3%', right: '4%', bottom: '3%', containLabel: true },
        tooltip: { 
            trigger: 'axis',
            formatter: function (params) {
                const speedData = params.find(p => p.seriesName === '風速 (m/s)');
                const directionData = displayReadings[speedData.dataIndex]?.periodic?.wind_dir || 'N/A';
                return `時間: ${speedData.name}<br/>` + 
                       `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${speedData.color};"></span>` +
                       `風速: <strong>${speedData.value} m/s</strong><br/>` + 
                       `風向: <strong>${directionData}</strong>`;
            }
        },
        legend: {
            data: ['風速 (m/s)', '風向'],
            textStyle: { color: '#E5E7EB' }
        },
        xAxis: {
            type: 'category',
            data: timestamps,
            name: '時間',
            axisLabel: { color: '#9CA3AF' }
        },
        yAxis: {
            type: 'value',
            name: '風速 (m/s)',
            min: 0,
            max: 30, 
            axisLabel: { formatter: '{value} m/s', color: '#F97316' }, 
            splitLine: { lineStyle: { color: '#374151' } }
        },
        series: [{
            name: '風速 (m/s)',
            type: 'bar',
            data: windSpeedValues,
            itemStyle: { color: '#F97316' }
        }, {
            name: '風向',
            type: 'scatter', 
            yAxisIndex: 0, 
            data: windDirectionData,
            itemStyle: { color: '#F97316' }
        }]
    };
};

// --- 感測器數據上傳模擬器 (Modal Component) ---
const SensorUploaderModal = ({ isOpen, onClose, onUpload }) => {
    const [nodeId, setNodeId] = useState('S-001');
    const [temp, setTemp] = useState((25 + Math.random() * 5).toFixed(1));
    const [humidity, setHumidity] = useState((60 + Math.random() * 10).toFixed(1));
    const [aqi, setAqi] = useState(Math.floor(15 + Math.random() * 20));
    const [rainProb, setRainProb] = useState((Math.random()).toFixed(2));
    const [windSpeed, setWindSpeed] = useState((5 + Math.random() * 15).toFixed(1));
    const [windDirection, setWindDirection] = useState(['E', 'S', 'W', 'N'][Math.floor(Math.random() * 4)]);
    const [pressure, setPressure] = useState((1000 + Math.random() * 20).toFixed(1));
    const [noise, setNoise] = useState((45 + Math.random() * 15).toFixed(1));
    const [battery, setBattery] = useState(Math.floor(50 + Math.random() * 50));
    const [dataImportance, setDataImportance] = useState((5 + Math.random() * 5).toFixed(1));

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const payload = {
            nodeId,
            dataImportance: parseFloat(dataImportance),
            battery,
            timestamp: new Date().toISOString(),
            networkStatus: 'good',
            sensorType: 'temperature',
            value: parseFloat(temp),
            unit: 'celsius',
            periodic: {
                temperature: parseFloat(temp),
                humidity: parseFloat(humidity),
                rain_prob: parseFloat(rainProb),
                wind_speed: parseFloat(windSpeed),
                wind_dir: windDirection,
                pressure: parseFloat(pressure),
                AQI: aqi,
                noise: parseFloat(noise),
                traffic: 'MEDIUM',
                notice: 'none'
            },
            metadata: {
                personal_id: crypto.randomUUID(),
                scenario_id: 'manual',
                send_unix: Date.now() / 1000
            }
        };

        await onUpload(payload);
        onClose();
    };
    
    const generateRandomData = () => {
        setNodeId(`S-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`);
        setTemp((20 + Math.random() * 15).toFixed(1));
        setHumidity((45 + Math.random() * 35).toFixed(1));
        setAqi(Math.floor(Math.random() * 80) + 5);
        setRainProb((Math.random()).toFixed(2));
        setWindSpeed((0 + Math.random() * 30).toFixed(1));
        setWindDirection(['E', 'S', 'W', 'N', 'SE', 'NE', 'SW', 'NW'][Math.floor(Math.random() * 8)]);
        setPressure((980 + Math.random() * 50).toFixed(1));
        setNoise((30 + Math.random() * 50).toFixed(1));
        setBattery(Math.floor(Math.random() * 100));
        setDataImportance((Math.random() * 10).toFixed(1));
    };

    const InputField = ({ label, value, setter, unit, type = 'text', color }) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">
                <span className={`font-bold ${color}`}>{label}</span> ({unit}):
            </label>
            <input
                type={type}
                min="0"
                step={type === 'number' ? "0.1" : null}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500"
            />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-3xl transform transition-transform duration-300 scale-100 border border-indigo-600">
                <h3 className="text-2xl font-bold text-indigo-400 mb-4 border-b border-gray-700 pb-2">
                    模擬感測器數據上傳
                </h3>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                        <InputField label="節點 ID" value={nodeId} setter={setNodeId} unit="ID" color="text-yellow-400" />
                        <InputField label="資料重要性" value={dataImportance} setter={setDataImportance} unit="0-10" type="number" color="text-indigo-400" />
                        <InputField label="電量" value={battery} setter={setBattery} unit="%" type="number" color="text-green-400" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                        <InputField label="溫度" value={temp} setter={setTemp} unit="°C" type="number" color="text-red-400" />
                        <InputField label="濕度" value={humidity} setter={setHumidity} unit="%" type="number" color="text-blue-400" />
                        <InputField label="AQI" value={aqi} setter={setAqi} unit="指數" type="number" color="text-green-400" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
                        <InputField label="降雨機率" value={rainProb} setter={setRainProb} unit="0-1" type="number" color="text-teal-400" />
                        <InputField label="風速" value={windSpeed} setter={setWindSpeed} unit="m/s" type="number" color="text-orange-400" />
                        <InputField label="氣壓" value={pressure} setter={setPressure} unit="hPa" type="number" color="text-purple-400" />
                        <InputField label="噪音" value={noise} setter={setNoise} unit="dB" type="number" color="text-pink-400" />
                        <InputField label="風向" value={windDirection} setter={setWindDirection} unit="方向" color="text-yellow-400" />
                    </div>
                    <div className="mt-6 flex justify-between space-x-3 border-t border-gray-700 pt-4">
                        <button
                            type="button"
                            onClick={generateRandomData}
                            className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition duration-200"
                        >
                            🔄 隨機生成所有數據
                        </button>
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition duration-200"
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-200 shadow-md"
                            >
                                📡 上傳數據到平台
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- 主應用程式元件 ---
const App = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [readings, setReadings] = useState([]);
    const [summary, setSummary] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingError, setLoadingError] = useState(null);

    // 檢查後端連接
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/health`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setIsConnected(data.status === 'healthy');
                    setLoadingError(null);
                } else {
                    setIsConnected(false);
                    setLoadingError(`後端伺服器回應錯誤: ${response.status}`);
                }
            } catch (error) {
                setIsConnected(false);
                if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
                    setLoadingError(`❌ 無法連接到後端伺服器 (${API_BASE_URL})。請確認後端伺服器已啟動：在專案根目錄執行 "npm start"`);
                } else {
                    setLoadingError(`無法連接到後端伺服器: ${error.message}`);
                }
            }
        };
        checkConnection();
        const interval = setInterval(checkConnection, 5000);
        return () => clearInterval(interval);
    }, []);

    // 載入數據
    useEffect(() => {
        const loadData = async () => {
            // 如果未連接，不嘗試載入數據
            if (!isConnected) {
                return;
            }

            try {
                // 添加時間戳參數避免瀏覽器和 HTTP 快取
                const timestamp = Date.now();
                const [dataResponse, summaryResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/sensors/data?sortBy=timestamp&limit=20&_t=${timestamp}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache'
                        }
                    }),
                    fetch(`${API_BASE_URL}/api/reports/summary?_t=${timestamp}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache'
                        }
                    })
                ]);

                if (dataResponse.ok) {
                    const dataResult = await dataResponse.json();
                    if (dataResult.success) {
                        const readingsData = dataResult.data || [];
                        console.log('載入數據成功，筆數:', readingsData.length);
                        setReadings(readingsData);
                    } else {
                        console.warn('數據載入回應成功但 success 為 false:', dataResult);
                        setReadings([]);
                    }
                } else {
                    console.error('載入數據失敗:', dataResponse.status, dataResponse.statusText);
                    setReadings([]);
                }

                if (summaryResponse.ok) {
                    const summaryResult = await summaryResponse.json();
                    if (summaryResult.success) {
                        setSummary(summaryResult.data);
                    }
                } else {
                    console.error('載入摘要失敗:', summaryResponse.status, summaryResponse.statusText);
                }
            } catch (error) {
                console.error('載入數據失敗:', error);
                // 不設置 loadingError，因為連接檢查已經處理了
            }
        };

        // 立即載入一次
        loadData();
        
        // 每 2 秒輪詢一次（與後端快取 TTL 同步，確保即時更新）
        const interval = setInterval(loadData, 2000);
        return () => clearInterval(interval);
    }, [isConnected]);

    // 上傳數據
    const handleUpload = async (sensorData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sensors/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sensorData)
            });

            const result = await response.json();
            if (result.success) {
                console.log('數據上傳成功!', result.data);
                setLoadingError(null);
                
                // 立即重新載入數據（添加強制刷新參數，繞過所有快取）
                const refreshTimestamp = Date.now();
                const dataResponse = await fetch(`${API_BASE_URL}/api/sensors/data?sortBy=timestamp&limit=20&_t=${refreshTimestamp}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                });
                const dataResult = await dataResponse.json();
                if (dataResult.success) {
                    setReadings(dataResult.data || []);
                    console.log('數據已立即更新，筆數:', dataResult.data.length);
                }
            } else {
                setLoadingError(`上傳失敗: ${result.error?.message || '未知錯誤'}`);
            }
        } catch (error) {
            console.error('數據上傳失敗:', error);
            setLoadingError(`上傳錯誤: ${error.message}`);
        }
    };

    // 渲染相關 ECharts
    const pm25Options = createPm25TrendOptions(readings);
    const tempHumidityOptions = createTempHumidityOptions(readings);
    const pressureOptions = createPressureTrendOptions(readings);
    const noiseOptions = createNoiseTrendOptions(readings);
    const windOptions = createWindOptions(readings);

    const latestReading = readings.length > 0 ? readings[readings.length - 1] : {};

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8 font-sans">
            <header className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-indigo-400 mb-2">
                    社區感測器資料上傳平台
                </h1>
                <p className="text-gray-400">
                    即時環境數據監測與共享 ({isConnected ? '✅ 已連接' : '❌ 未連接'})
                </p>
                {summary && (
                    <p className="text-xs text-gray-500 mt-1">
                        總數據數: {summary ? summary.totalRecords : '0'} | 節點數: {summary.uniqueNodes} | 平均電量: {summary.averageBattery}%
                    </p>
                )}
            </header>

            {loadingError && (
                <div className="bg-red-900/40 text-red-300 border-red-600 p-4 rounded-lg mb-6 border">
                    {loadingError}
                </div>
            )}

            <div className="mb-8 flex flex-wrap gap-3">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition duration-300 hover:bg-indigo-500 flex items-center"
                >
                    + 模擬上傳感測器數據
                </button>
            </div>

            {/* 數據總覽卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
                <DataCard 
                    title="最新溫度" 
                    value={latestReading.periodic?.temperature || latestReading.value || 'N/A'} 
                    unit="°C" 
                    color="text-red-400" 
                    description={latestReading.nodeId || '無數據'} 
                />
                <DataCard 
                    title="最新濕度" 
                    value={latestReading.periodic?.humidity || 'N/A'} 
                    unit="%" 
                    color="text-blue-400" 
                    description={latestReading.nodeId || '無數據'} 
                />
                <DataCard 
                    title="最新 AQI" 
                    value={latestReading.periodic?.AQI || 'N/A'} 
                    unit="指數" 
                    color={latestReading.periodic?.AQI > 50 ? 'text-yellow-400' : 'text-green-400'} 
                    description={latestReading.nodeId || '無數據'} 
                />
                <DataCard 
                    title="降雨機率" 
                    value={latestReading.periodic?.rain_prob ? (latestReading.periodic.rain_prob * 100).toFixed(1) : 'N/A'} 
                    unit="%" 
                    color="text-teal-400" 
                    description={latestReading.nodeId || '無數據'} 
                />
                <DataCard 
                    title="風速" 
                    value={latestReading.periodic?.wind_speed || 'N/A'} 
                    unit="m/s" 
                    color="text-orange-400" 
                    description={latestReading.periodic?.wind_dir || '無風向'} 
                />
                <DataCard 
                    title="氣壓" 
                    value={latestReading.periodic?.pressure || 'N/A'} 
                    unit="hPa" 
                    color="text-purple-400" 
                    description={latestReading.nodeId || '無數據'} 
                />
                <DataCard 
                    title="噪音" 
                    value={latestReading.periodic?.noise || 'N/A'} 
                    unit="dB" 
                    color="text-pink-400" 
                    description={latestReading.nodeId || '無數據'} 
                />
                <DataCard 
                    title="風向" 
                    value={latestReading.periodic?.wind_dir || 'N/A'} 
                    unit="方向" 
                    color="text-yellow-400" 
                    description={latestReading.periodic?.wind_speed ? `${latestReading.periodic.wind_speed} m/s` : '無數據'} 
                />
                <DataCard 
                    title="優先級" 
                    value={latestReading.priority?.priorityScore?.toFixed(1) || 'N/A'} 
                    unit="分數" 
                    color="text-indigo-400" 
                    description={latestReading.priority?.priorityLevel || 'N/A'} 
                />
                <DataCard 
                    title="電量" 
                    value={latestReading.battery || 'N/A'} 
                    unit="%" 
                    color={latestReading.battery > 50 ? 'text-green-400' : (latestReading.battery > 20 ? 'text-yellow-400' : 'text-red-400')} 
                    description={latestReading.nodeId || '無數據'} 
                />
           
            </div>

            {/* 圖表網格 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <ChartContainer
                    options={pm25Options}
                    id="pm25-trend-chart"
                    title="AQI 趨勢 (最近 15 筆)"
                />
                <ChartContainer
                    options={tempHumidityOptions}
                    id="temp-humidity-chart"
                    title="溫度與濕度比較 (最近 10 筆)"
                />
                <ChartContainer 
                    options={pressureOptions}
                    id="pressure-trend-chart"
                    title="氣壓趨勢 (hPa) (最近 15 筆)"
                />
                <ChartContainer 
                    options={noiseOptions}
                    id="noise-trend-chart"
                    title="噪音等級趨勢 (dB) (最近 15 筆)"
                />
                <ChartContainer 
                    options={windOptions}
                    id="wind-trend-chart"
                    title="風速與風向圖 (最近 10 筆)"
                />
            </div>

            {/* 原始數據列表 */}
            <LatestDataList readings={readings} />

            <footer className="mt-12 text-center text-gray-600 border-t border-gray-800 pt-6">
                <p>專案模擬：社區感測器資料上傳平台 (後端 API 連接)</p>
            </footer>

            {/* 模態框元件 */}
            <SensorUploaderModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onUpload={handleUpload}
            />
        </div>
    );
};

// --- 輔助 UI 元件：單一數據卡片 ---
const DataCard = ({ title, value, unit, color, description }) => (
    <div className="bg-gray-800 p-5 rounded-xl shadow-xl border-t-4 border-indigo-500">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider truncate">{title}</h3>
        <p className={`text-3xl font-extrabold mt-1 ${color}`}>
            {value}
            <span className="text-base font-normal ml-1 text-gray-400">{unit}</span>
        </p>
        <p className="text-xs text-gray-500 mt-2 truncate">{description}</p>
    </div>
);

// --- 輔助 UI 元件：圖表容器 ---
const ChartContainer = ({ options, id, title }) => {
    const chartRef = useEcharts(options, id); 
    return (
        <div className="bg-gray-800 p-4 rounded-xl shadow-xl h-full flex flex-col">
            <h3 className="text-white text-lg font-semibold mb-2 border-b border-gray-700 pb-2">{title}</h3>
            <div ref={chartRef} className="flex-grow min-h-[350px] w-full" style={{ height: '350px' }} id={id} />
        </div>
    );
};

// --- 輔助 UI 元件：最新數據列表 ---
const LatestDataList = ({ readings }) => {
    const latestFive = readings && readings.length > 0 ? readings.slice(-5).reverse() : []; 

    if (latestFive.length === 0) {
        return (
            <div className="bg-gray-800 p-6 rounded-xl shadow-xl mt-6 text-center text-gray-400">
                目前沒有感測器數據，請點擊 "模擬上傳感測器數據" 按鈕新增。
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-xl mt-6">
            <h3 className="text-white text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
                最新感測器數據 (最近 5 筆原始記錄)
            </h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                        <tr className="text-left text-gray-400 uppercase text-xs">
                            <th className="px-2 py-2">時間</th>
                            <th className="px-2 py-2">節點</th>
                            <th className="px-2 py-2">優先級</th>
                            <th className="px-2 py-2">AQI</th>
                            <th className="px-2 py-2">溫度</th>
                            <th className="px-2 py-2">濕度</th>
                            <th className="px-2 py-2">氣壓</th>
                            <th className="px-2 py-2">噪音</th>
                            <th className="px-2 py-2">風速/向</th>
                            <th className="px-2 py-2">電量</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-sm">
                        {latestFive.map(r => (
                            <tr key={r.id} className="hover:bg-gray-700 transition duration-150">
                                <td className="px-2 py-2 whitespace-nowrap">
                                    {r.timestamp ? new Date(r.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap">{r.nodeId || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                        r.priority?.priorityLevel === 'critical' ? 'bg-red-900 text-red-300' :
                                        r.priority?.priorityLevel === 'high' ? 'bg-orange-900 text-orange-300' :
                                        r.priority?.priorityLevel === 'medium' ? 'bg-blue-900 text-blue-300' :
                                        'bg-gray-700 text-gray-300'
                                    }`}>
                                        {r.priority?.priorityScore?.toFixed(1) || 'N/A'}
                                    </span>
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap text-green-400">{r.periodic?.AQI || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-red-400">{r.periodic?.temperature || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-blue-400">{r.periodic?.humidity || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-purple-400">{r.periodic?.pressure || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-pink-400">{r.periodic?.noise || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-orange-400">{`${r.periodic?.wind_speed || 'N/A'} m/s (${r.periodic?.wind_dir || 'N/A'})`}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-green-400">{r.battery || 'N/A'}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default App;






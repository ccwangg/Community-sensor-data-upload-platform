import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';

// 標準 Firebase 模組導入。
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';

/**
 * Firebase 配置：
 * */
const YOUR_REAL_FIREBASE_CONFIG = {
    apiKey: "AIzaSyD-xxxxxxxxxxxx-xxxxxxxxxxxxx",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "xxxxxxxxxxxx",
    appId: "1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxx",
    measurementId: "G-xxxxxxxxxx"
};

// 如果在 Canvas 環境中，我們仍然會嘗試從 __firebase_config 讀取，
// 否則使用您貼上的配置。
let firebaseConfig = YOUR_REAL_FIREBASE_CONFIG;
let isDummyConfig = true;

// 嘗試從 Canvas 環境變數讀取 (如果存在)
if (typeof __firebase_config !== 'undefined' && __firebase_config.trim() !== '') {
    try {
        const envConfig = JSON.parse(__firebase_config);
        if (envConfig && envConfig.projectId && envConfig.apiKey) {
             firebaseConfig = envConfig;
             isDummyConfig = false; // 成功讀取環境配置，標記為非虛擬
        }
    } catch (e) {
        console.warn("環境 Firebase 配置解析失敗，將使用手動配置。", e);
    }
} else if (YOUR_REAL_FIREBASE_CONFIG.projectId && YOUR_REAL_FIREBASE_CONFIG.apiKey !== "AIzaSyD-xxxxxxxxxxxx-xxxxxxxxxxxxx") {
    // 檢查手動配置是否已經更新
    isDummyConfig = false;
}


// 其他環境變數
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId || 'default-app-id';
const appId = rawAppId.replace(/\//g, '_').replace(/\./g, '-'); 
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;


// --- ECharts React Hook ---
const useEcharts = (options, chartId) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!chartRef.current) return;

        // 銷毀舊實例以避免重複渲染
        if (chartInstance.current) {
            try { echarts.dispose(chartInstance.current); } catch (e) {}
        }
        
        try {
            // 主題
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
        if (chartInstance.current && options && Object.keys(options).length > 0) {
            try {
                // setOption(options, true) 確保完整更新
                chartInstance.current.setOption(options, true);
                chartInstance.current.resize();
            } catch (error) {
                console.error("ECharts setOption 失敗:", error);
            }
        }
    }, [options]);
    
    return chartRef;
};

// --- ECharts 選項生成函數：PM2.5 趨勢圖 ---
const createPm25TrendOptions = (readings) => {
    const displayReadings = readings.slice(-15); 
    const timestamps = displayReadings.map(r => 
        r.timestamp && r.timestamp.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '載入中...'
    );
    const pm25Values = displayReadings.map(r => r.pm25);
    const locations = displayReadings.map(r => r.location);

    return {
        grid: { top: '10%', left: '3%', right: '4%', bottom: '3%', containLabel: true },
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
                const data = params[0];
                const index = data.dataIndex;
                const locationsText = locations[index] || 'N/A';
                let tooltip = `時間: ${data.name}<br/>`;
                tooltip += `地點: ${locationsText}<br/>`;
                tooltip += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${data.color};"></span>PM2.5: <strong>${data.value} µg/m³</strong>`;
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
            name: 'PM2.5 (µg/m³)',
            min: 0,
            max: 100, 
            splitLine: { lineStyle: { color: '#374151' } },
            axisLabel: { color: '#9CA3AF' }
        },
        series: [
            {
                name: 'PM2.5 數值',
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
            }
        ]
    };
};

// --- ECharts 選項生成函數：溫度與濕度比較圖 ---
const createTempHumidityOptions = (readings) => {
    const displayReadings = readings.slice(-10); // 最近 10 筆
    const timestamps = displayReadings.map(r => 
        r.timestamp && r.timestamp.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '載入中...'
    );
    const tempValues = displayReadings.map(r => r.temperature);
    const humidityValues = displayReadings.map(r => r.humidity);

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
        yAxis: [
            {
                type: 'value',
                name: '溫度 (°C)',
                min: 0,
                max: 40,
                axisLabel: { formatter: '{value} °C', color: '#F87171' },
                splitLine: { lineStyle: { color: '#374151' } }
            },
            {
                type: 'value',
                name: '濕度 (%)',
                min: 0,
                max: 100,
                axisLabel: { formatter: '{value} %', color: '#60A5FA' },
                splitLine: { show: false }
            }
        ],
        series: [
            {
                name: '溫度 (°C)',
                type: 'bar',
                data: tempValues,
                itemStyle: { color: '#F87171' }
            },
            {
                name: '濕度 (%)',
                type: 'line',
                yAxisIndex: 1,
                data: humidityValues,
                itemStyle: { color: '#60A5FA' },
                lineStyle: { color: '#60A5FA' }
            }
        ]
    };
};

// --- ECharts 選項生成函數：氣壓趨勢圖 ---
const createPressureTrendOptions = (readings) => {
    const displayReadings = readings.slice(-15); // 最近 15 筆
    const timestamps = displayReadings.map(r => 
        r.timestamp && r.timestamp.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '載入中...'
    );
    const pressureValues = displayReadings.map(r => r.pressure);

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
        series: [
            {
                name: '氣壓數值',
                type: 'line',
                smooth: true,
                data: pressureValues,
                lineStyle: { color: '#C084FC', width: 3 }, // 紫色線條
                itemStyle: { color: '#C084FC' },
                areaStyle: {
                    opacity: 0.8,
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(192, 132, 252, 0.5)' }, // 淺紫色
                        { offset: 1, color: 'rgba(31, 41, 55, 0.1)' } // 接近背景色
                    ])
                }
            }
        ]
    };
};

// --- ECharts 選項生成函數：噪音趨勢圖 (新繪製) ---
const createNoiseTrendOptions = (readings) => {
    const displayReadings = readings.slice(-15); 
    const timestamps = displayReadings.map(r => 
        r.timestamp && r.timestamp.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '載入中...'
    );
    const noiseValues = displayReadings.map(r => r.noiseLevel);

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
            axisLabel: { formatter: '{value} dB', color: '#F472B6' }, // 粉色
            splitLine: { lineStyle: { color: '#374151' } }
        },
        series: [
            {
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
            }
        ]
    };
};

// --- ECharts 選項生成函數：風速與風向圖 (新繪製) ---
const createWindOptions = (readings) => {
    const displayReadings = readings.slice(-10); // 最近 10 筆
    const timestamps = displayReadings.map(r => 
        r.timestamp && r.timestamp.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '載入中...'
    );
    const windSpeedValues = displayReadings.map(r => r.windSpeed);
    
    // 風向的標記數據 (使用散點圖+自定義標籤，將點放置在對應的風速柱子上)
    const windDirectionData = displayReadings.map((r, index) => ({
        value: [timestamps[index], windSpeedValues[index]], 
        symbolSize: 0, // 不顯示點
        label: {
            show: true,
            position: 'top',
            formatter: r.windDirection,
            color: '#F97316', // 橙色
            fontWeight: 'bold',
            fontSize: 12,
            offset: [0, -15] // 將風向標記放在柱子上方
        }
    }));


    return {
        grid: { top: '20%', left: '3%', right: '4%', bottom: '3%', containLabel: true },
        tooltip: { 
            trigger: 'axis',
            formatter: function (params) {
                // 獲取風速數據
                const speedData = params.find(p => p.seriesName === '風速 (km/h)');
                // 獲取風向數據 (假設風向數據的 index 與風速相同)
                const directionData = displayReadings[speedData.dataIndex]?.windDirection || 'N/A';
                
                return `時間: ${speedData.name}<br/>` + 
                       `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${speedData.color};"></span>` +
                       `風速: <strong>${speedData.value} km/h</strong><br/>` + 
                       `風向: <strong>${directionData}</strong>`;
            }
        },
        legend: {
            data: ['風速 (km/h)', '風向'],
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
            name: '風速 (km/h)',
            min: 0,
            max: 30, 
            axisLabel: { formatter: '{value} km/h', color: '#F97316' }, 
            splitLine: { lineStyle: { color: '#374151' } }
        },
        series: [
            {
                name: '風速 (km/h)',
                type: 'bar',
                data: windSpeedValues,
                itemStyle: { color: '#F97316' } // 橙色柱狀圖
            },
            {
                name: '風向',
                type: 'scatter', 
                yAxisIndex: 0, 
                data: windDirectionData,
                itemStyle: { color: '#F97316' }
            }
        ]
    };
};



// --- 社區公告模態框 ---
const AnnouncementModal = ({ isOpen, onClose, announcements, isDummyConfig, db, appId, userId, setLoadingError }) => {
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');

    if (!isOpen) return null;

    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        if (!db || isDummyConfig || !newTitle || !newContent) {
            setLoadingError("🔴 錯誤: 無法發布：數據庫未就緒、配置無效或內容為空。");
            return;
        }

        try {
            const collectionPath = `/artifacts/${appId}/public/data/community_announcements`;
            await addDoc(collection(db, collectionPath), {
                title: newTitle,
                content: newContent,
                authorId: userId,
                timestamp: serverTimestamp(),
            });
            setNewTitle('');
            setNewContent('');
            console.log("公告發布成功!");
        } catch (error) {
            console.error("公告發布失敗:", error);
            setLoadingError(`🔴 錯誤: 公告發布失敗: ${error.message}`);
        }
    };
    
    // 渲染公告內容
    const renderAnnouncements = () => {
        if (announcements.length === 0) {
            return (
                <p className="text-center text-gray-500 py-8">
                    目前沒有社區公告。
                </p>
            );
        }

        return (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {announcements.map((ann, index) => (
                    <div key={ann.id || index} className="bg-gray-700 p-4 rounded-lg border-l-4 border-yellow-500 shadow-md">
                        <h4 className="text-xl font-bold text-yellow-300 mb-1">{ann.title}</h4>
                        <p className="text-gray-300 text-sm mb-2">{ann.content}</p>
                        <div className="text-xs text-gray-500 flex justify-between">
                            <span>發布者 ID (部分): {ann.authorId?.substring(0, 8) || 'N/A'}...</span>
                            <span>
                                時間: {ann.timestamp?.seconds ? new Date(ann.timestamp.seconds * 1000).toLocaleString('zh-TW') : '載入中...'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-2xl transform transition-transform duration-300 scale-100 border border-yellow-600">
                <h3 className="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-700 pb-2">
                    社區最近的公告 (共 {announcements.length} 筆)
                </h3>
                
                {/* 公告列表 */}
                {renderAnnouncements()}

                <h4 className="text-xl font-bold text-indigo-400 mt-6 mb-3 border-t border-gray-700 pt-3">發布新公告</h4>
                <form onSubmit={handlePostAnnouncement} className="space-y-3">
                    <input
                        type="text"
                        placeholder="公告標題 (必填)"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                        disabled={isDummyConfig}
                    />
                    <textarea
                        placeholder="公告內容 (必填)"
                        rows="3"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                        disabled={isDummyConfig}
                    />
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition duration-200"
                        >
                            關閉
                        </button>
                        <button
                            type="submit"
                            disabled={isDummyConfig || !newTitle || !newContent}
                            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-200 shadow-md disabled:opacity-50"
                        >
                            發布公告
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};


// --- 感測器數據上傳模擬器 (Modal Component) ---
const SensorUploaderModal = ({ isOpen, onClose, onUpload, userId }) => {
    // 隨機生成初始值
    const [location, setLocation] = useState('社區北門');
    const [temp, setTemp] = useState((25 + Math.random() * 5).toFixed(1));
    const [humidity, setHumidity] = useState((60 + Math.random() * 10).toFixed(1));
    const [pm25, setPm25] = useState(Math.floor(15 + Math.random() * 20));
    const [rainProb, setRainProb] = useState(Math.floor(10 + Math.random() * 40));
    const [windSpeed, setWindSpeed] = useState((5 + Math.random() * 15).toFixed(1));
    const [windDirection, setWindDirection] = useState(['東南', '東北', '西南', '西北'][Math.floor(Math.random() * 4)]);
    const [pressure, setPressure] = useState((1000 + Math.random() * 20).toFixed(1));
    const [airQuality, setAirQuality] = useState(['優', '良', '普通', '差'][Math.floor(Math.random() * 4)]);
    const [noiseLevel, setNoiseLevel] = useState((45 + Math.random() * 15).toFixed(1));


    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpload({
            location,
            temperature: parseFloat(temp),
            humidity: parseFloat(humidity),
            pm25: parseFloat(pm25),
            rainfallProbability: parseFloat(rainProb),
            windSpeed: parseFloat(windSpeed),
            windDirection: windDirection,
            pressure: parseFloat(pressure),
            airQuality: airQuality,
            noiseLevel: parseFloat(noiseLevel),
            userId: userId,
        });
        onClose();
    };
    
    // 隨機生成新數據
    const generateRandomData = () => {
        setLocation(Math.random() > 0.5 ? '社區北門' : '社區活動中心');
        setTemp((20 + Math.random() * 15).toFixed(1));
        setHumidity((45 + Math.random() * 35).toFixed(1));
        setPm25(Math.floor(Math.random() * 80) + 5);
        setRainProb(Math.floor(Math.random() * 100));
        setWindSpeed((0 + Math.random() * 30).toFixed(1));
        setWindDirection(['東', '南', '西', '北', '東南', '東北', '西南', '西北'][Math.floor(Math.random() * 8)]);
        setPressure((980 + Math.random() * 50).toFixed(1));
        setAirQuality(['優', '良', '普通', '差', '極差'][Math.floor(Math.random() * 5)]);
        setNoiseLevel((30 + Math.random() * 50).toFixed(1));
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
                    模擬感測器數據上傳 (10 個指標)
                </h3>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                        <InputField label="上傳者/地點" value={location} setter={setLocation} unit="地點" color="text-yellow-400" />
                        <InputField label="溫度" value={temp} setter={setTemp} unit="°C" type="number" color="text-red-400" />
                        <InputField label="濕度" value={humidity} setter={setHumidity} unit="%" type="number" color="text-blue-400" />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
                        <InputField label="PM2.5" value={pm25} setter={setPm25} unit="µg/m³" type="number" color="text-green-400" />
                        <InputField label="降雨機率" value={rainProb} setter={setRainProb} unit="%" type="number" color="text-teal-400" />
                        <InputField label="風速" value={windSpeed} setter={setWindSpeed} unit="km/h" type="number" color="text-orange-400" />
                        <InputField label="氣壓" value={pressure} setter={setPressure} unit="hPa" type="number" color="text-purple-400" />
                        <InputField label="噪音" value={noiseLevel} setter={setNoiseLevel} unit="dB" type="number" color="text-pink-400" />
                        <InputField label="風向" value={windDirection} setter={setWindDirection} unit="方向" color="text-yellow-400" />
                        <InputField label="空氣品質" value={airQuality} setter={setAirQuality} unit="等級" color="text-cyan-400" />
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
    // Firebase 狀態
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    // 應用程式數據狀態
    const [readings, setReadings] = useState([]);
    const [announcements, setAnnouncements] = useState([]); // 新增公告狀態
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false); // 新增公告模態框狀態
    
    // 初始化錯誤狀態：如果不是虛擬配置，則沒有初始錯誤。
    const [loadingError, setLoadingError] = useState(isDummyConfig 
        ? "⚠️ 警告：正在使用虛擬配置，數據庫操作將會失敗。請在程式碼中貼入您的真實 Firebase 配置。" 
        : null
    );

    // 1. Firebase 初始化和認證
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (!user) {
                    if (initialAuthToken) {
                        try {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } catch (e) {
                            console.warn("Custom token sign-in failed, falling back to anonymous.", e);
                            await signInAnonymously(firebaseAuth);
                        }
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                }
                
                const currentUser = firebaseAuth.currentUser;
                setUserId(currentUser?.uid || 'anonymous-user-' + crypto.randomUUID().substring(0, 8));
                setIsAuthReady(true);
                
                // 只有在確認配置非虛擬時，才清除警告
                if (!isDummyConfig) {
                    setLoadingError(null);
                }
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Firebase 初始化失敗:", error);
            setLoadingError(`🔴 錯誤: Firebase 初始化失敗: ${error.message} (請檢查您貼入的配置 JSON 格式是否正確)`);
        }
    }, []);

    // 2. 數據訂閱 (感測器讀數)
    useEffect(() => {
        if (!isAuthReady || !db || isDummyConfig) {
            if (isDummyConfig) console.warn("使用虛擬配置，跳過 Firestore 感測器數據訂閱。");
            // 虛擬配置時，使用一個空的靜態數組以避免圖表崩潰
            if (isDummyConfig) setReadings([]); 
            return;
        }

        const collectionPath = `/artifacts/${appId}/public/data/community_sensors`;
        const q = query(collection(db, collectionPath), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newReadings = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp, 
            }));
            
            const sortedReadings = newReadings.sort((a, b) => {
                const timeA = a.timestamp && a.timestamp.seconds ? a.timestamp.seconds : 0;
                const timeB = b.timestamp && b.timestamp.seconds ? b.timestamp.seconds : 0;
                return timeA - timeB;
            });

            setReadings(sortedReadings); 
        }, (error) => {
            console.error("Firestore 感測器數據訂閱失敗:", error);
            setLoadingError(`🔴 錯誤: 感測器數據加載失敗: ${error.message} (檢查防火牆規則是否允許匿名讀取)`);
        });

        return () => unsubscribe();
    }, [isAuthReady, db, appId, isDummyConfig]); 

    // 3. 數據訂閱 (社區公告)
    useEffect(() => {
        if (!isAuthReady || !db || isDummyConfig) {
            if (isDummyConfig) console.warn("使用虛擬配置，跳過 Firestore 公告數據訂閱。");
            return;
        }

        const collectionPath = `/artifacts/${appId}/public/data/community_announcements`;
        const q = query(collection(db, collectionPath), limit(10)); 
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newAnnouncements = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            
            const sortedAnnouncements = newAnnouncements.sort((a, b) => 
                (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
            );
            
            setAnnouncements(sortedAnnouncements);
        }, (error) => {
            console.error("Firestore 公告數據訂閱失敗:", error);
        });

        return () => unsubscribe();
    }, [isAuthReady, db, appId, isDummyConfig]);

    // 4. 數據上傳處理函數
    const handleUpload = async (sensorData) => {
        if (!db || isDummyConfig) {
            console.error("Firestore 尚未初始化或使用虛擬配置，無法上傳。");
            setLoadingError("🔴 錯誤: 無法上傳：數據庫未就緒或配置無效。");
            return;
        }
        
        try {
            const collectionPath = `/artifacts/${appId}/public/data/community_sensors`;
            await addDoc(collection(db, collectionPath), {
                ...sensorData,
                timestamp: serverTimestamp(), // 使用伺服器時間戳
            });
            console.log("數據上傳成功!");
            // 上傳成功後清除錯誤
            setLoadingError(null); 
        } catch (error) {
            console.error("數據上傳失敗:", error);
            setLoadingError(`🔴 錯誤: 數據上傳失敗: ${error.message} (請確認您的防火牆規則是否允許匿名寫入)`);
        }
    };

    // 渲染相關 ECharts
    const pm25Options = createPm25TrendOptions(readings);
    const tempHumidityOptions = createTempHumidityOptions(readings);
    const pressureOptions = createPressureTrendOptions(readings);
    // 新增的圖表選項
    const noiseOptions = createNoiseTrendOptions(readings);
    const windOptions = createWindOptions(readings);

    const latestReading = readings.length > 0 ? readings[readings.length - 1] : {};

    // --- UI 渲染 ---
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8 font-sans">
            <header className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-indigo-400 mb-2">
                    社區感測器與公告平台
                </h1>
                <p className="text-gray-400">即時環境數據監測與共享 ({isAuthReady ? (userId?.startsWith('anonymous-user-') ? '✅ 匿名連接' : '✅ 已連接') : '⏳ 連接中...'})</p>
                <p className="text-xs text-gray-500 mt-1">當前使用者 ID: <span className="font-mono text-gray-400">{userId || 'N/A'}</span></p>
            </header>

            {/* 根據錯誤類型顯示紅色錯誤或黃色警告 */}
            {loadingError && (
                <div className={`${loadingError.includes('錯誤:') ? 'bg-red-900/40 text-red-300 border-red-600' : 'bg-yellow-900/40 text-yellow-300 border-yellow-600'} p-4 rounded-lg mb-6 border`}>
                    {loadingError}
                </div>
            )}

            {/* 動作按鈕 */}
            <div className="mb-8 flex flex-wrap gap-3">
                <button
                    onClick={() => setIsModalOpen(true)}
                    disabled={!isAuthReady} 
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg transition duration-300 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    + 模擬上傳感測器數據
                </button>
                <button
                    onClick={() => setIsAnnouncementModalOpen(true)}
                    disabled={!isAuthReady}
                    className="px-6 py-3 bg-yellow-600 text-gray-900 font-bold rounded-xl shadow-lg transition duration-300 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    📢 社區最近的公告
                </button>
            </div>

            {/* 數據總覽卡片 (10 個指標 + 1 個總數) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
                {/* 溫度、濕度、PM2.5 */}
                <DataCard title="最新溫度" value={latestReading.temperature || 'N/A'} unit="°C" color="text-red-400" description={latestReading.location || '無數據'} />
                <DataCard title="最新濕度" value={latestReading.humidity || 'N/A'} unit="%" color="text-blue-400" description={latestReading.location || '無數據'} />
                <DataCard title="最新 PM2.5" value={latestReading.pm25 || 'N/A'} unit="µg/m³" color={latestReading.pm25 > 50 ? 'text-yellow-400' : 'text-green-400'} description={latestReading.location || '無數據'} />
                
                {/* 新增指標 */}
                <DataCard title="降雨機率" value={latestReading.rainfallProbability || 'N/A'} unit="%" color="text-teal-400" description={latestReading.location || '無數據'} />
                <DataCard title="風速" value={latestReading.windSpeed || 'N/A'} unit="km/h" color="text-orange-400" description={latestReading.windDirection || '無風向'} />
                <DataCard title="氣壓" value={latestReading.pressure || 'N/A'} unit="hPa" color="text-purple-400" description={latestReading.location || '無數據'} />
                <DataCard title="噪音" value={latestReading.noiseLevel || 'N/A'} unit="dB" color="text-pink-400" description={latestReading.location || '無數據'} />
                <DataCard title="風向" value={latestReading.windDirection || 'N/A'} unit="方向" color="text-yellow-400" description={latestReading.windSpeed ? `${latestReading.windSpeed} km/h` : '無數據'} />
                <DataCard title="空氣品質" value={latestReading.airQuality || 'N/A'} unit="等級" color={latestReading.airQuality === '優' ? 'text-green-400' : (latestReading.airQuality === '極差' ? 'text-red-400' : 'text-cyan-400')} description={latestReading.location || '無數據'} />

                {/* 總筆數 */}
                <DataCard title="數據總筆數" value={readings.length} unit="筆 (最近20筆)" color="text-indigo-400" description="即時從 Firestore 讀取" />
            </div>

            {/* 圖表網格 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <ChartContainer
                    options={pm25Options}
                    id="pm25-trend-chart"
                    title="PM2.5 趨勢 (最近 15 筆)"
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
                <p>專案模擬：社區感測器與公告平台 (Firestore 即時共享)</p>
            </footer>

            {/* 模態框元件 */}
            {isAuthReady && userId && (
                <>
                    <SensorUploaderModal 
                        isOpen={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                        onUpload={handleUpload} 
                        userId={userId}
                    />
                    <AnnouncementModal
                        isOpen={isAnnouncementModalOpen}
                        onClose={() => setIsAnnouncementModalOpen(false)}
                        announcements={announcements}
                        isDummyConfig={isDummyConfig}
                        db={db}
                        appId={appId}
                        userId={userId}
                        setLoadingError={setLoadingError}
                    />
                </>
            )}
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
        <p className="text-xs text-gray-500 mt-2 truncate">地點: {description}</p>
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
    // 顯示最新的 5 筆數據
    const latestFive = readings.slice(-5).reverse(); 

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
                            <th className="px-2 py-2">地點</th>
                            <th className="px-2 py-2">PM2.5</th>
                            <th className="px-2 py-2">溫度</th>
                            <th className="px-2 py-2">濕度</th>
                            <th className="px-2 py-2">氣壓</th>
                            <th className="px-2 py-2">噪音</th>
                            <th className="px-2 py-2">風速/向</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 text-sm">
                        {latestFive.map(r => (
                            <tr key={r.id} className="hover:bg-gray-700 transition duration-150">
                                <td className="px-2 py-2 whitespace-nowrap">
                                    {r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap">{r.location || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-green-400">{r.pm25 || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-red-400">{r.temperature || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-blue-400">{r.humidity || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-purple-400">{r.pressure || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-pink-400">{r.noiseLevel || 'N/A'}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-orange-400">{`${r.windSpeed || 'N/A'} km/h (${r.windDirection || 'N/A'})`}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default App;

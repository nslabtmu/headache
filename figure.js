
/*async function loadUserHistory(userId) {
    const { data } = await supabase.from('user_data').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(30);
    if (!data) return;
    
    // ✅ 提取資料
    const labels = data.map(item => new Date(item.created_at).toLocaleDateString());
    const painScores = data.map(item => item.headache_data?.pain_score || 0);
    
    // ✅ 新增：氣象資料
    const temperatures = data.map(item => item.weather_data?.temperature || null);
    const humidities = data.map(item => item.weather_data?.humidity || null);
    const pressures = data.map(item => item.weather_data?.pressure || null);
    
    const canvas = document.getElementById('painChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();
 
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                // ✅ 左軸：頭痛分數（實線）
                {
                    label: '頭痛分數',
                    data: painScores,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y',
                    borderDash: []  // 實線
                },
                // ✅ 右軸：溫度（虛線）
                {
                    label: '氣溫 (°C)',
                    data: temperatures,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.05)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderDash: [5, 5]  // 虛線
                },
                // ✅ 右軸：濕度（虛線）
                {
                    label: '濕度 (%)',
                    data: humidities,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.05)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderDash: [5, 5]  // 虛線
                },
                // ✅ 右軸：氣壓（虛線）
                {
                    label: '氣壓 (hPa)',
                    data: pressures,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.05)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderDash: [5, 5]  // 虛線
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                title: {
                    display: true,
                    text: '頭痛與氣象趨勢分析',
                    font: { size: 14, weight: 'bold' }
                }
            },
            scales: {
                // ✅ 左軸：頭痛分數 (0-10)
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '頭痛分數',
                        font: { size: 12, weight: 'bold' },
                        color: '#e74c3c'
                    },
                    min: 0,
                    max: 10,
                    ticks: {
                        color: '#e74c3c',
                        stepSize: 2
                    },
                    grid: {
                        color: 'rgba(231, 76, 60, 0.1)'
                    }
                },
                // ✅ 右軸：氣象資料
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '氣象指標 (溫度/濕度/氣壓)',
                        font: { size: 12, weight: 'bold' },
                        color: '#666'
                    },
                    ticks: {
                        color: '#666'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}*/
/*async function loadUserHistory(userId) {
    const { data } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(30);

    let labels = [];
    let painScores = [];
    let temperatures = [];
    let humidities = [];
    let pressures = [];
    let isMock = false;

    // 💡 判斷是否有讀取到真實資料
    if (data && data.length > 0) {
        // ✅ 1. 有資料：提取真實資料
        labels = data.map(item => new Date(item.created_at).toLocaleDateString());
        painScores = data.map(item => item.headache_data?.pain_score || 0);
        temperatures = data.map(item => item.weather_data?.temperature ?? null);
        humidities = data.map(item => item.weather_data?.humidity ?? null);
        pressures = data.map(item => item.weather_data?.pressure ?? null);
    } else {
        // 💡 2. 沒資料：產生近 7 天的範例資料 (一周數據)
        isMock = true;

        // 產生近 7 天日期標籤 (例如：8/28, 8/29 ... 9/3)
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
        }

        // 模擬 7 天的數據
        painScores = [0, 5, 2, 8, 3, 0, 4];       // 頭痛分數 (0-10)
        temperatures = [28, 30, 26, 25, 29, 31, 27]; // 氣溫 (°C)
        humidities = [65, 80, 85, 90, 70, 60, 75];   // 濕度 (%)
        pressures = [1012, 1008, 1005, 1002, 1009, 1013, 1010]; // 氣壓 (hPa)
    }

    const canvas = document.getElementById('painChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                // ✅ 左軸：頭痛分數（實線）
                {
                    label: isMock ? '頭痛分數 (範例)' : '頭痛分數',
                    data: painScores,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y',
                    borderDash: []  // 實線
                },
                // ✅ 右軸：溫度（虛線）
                {
                    label: '氣溫 (°C)',
                    data: temperatures,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.05)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderDash: [5, 5]  // 虛線
                },
                // ✅ 右軸：濕度（虛線）
                {
                    label: '濕度 (%)',
                    data: humidities,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.05)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderDash: [5, 5]  // 虛線
                },
                // ✅ 右軸：氣壓（虛線）
                {
                    label: '氣壓 (hPa)',
                    data: pressures,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.05)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderDash: [5, 5]  // 虛線
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                title: {
                    display: true,
                    // 💡 若為範例資料，顯示標註文字
                    text: isMock ? '頭痛與氣象趨勢分析 (尚未有紀錄，目前為近 7 天示範數據)' : '頭痛與氣象趨勢分析',
                    font: { size: 14, weight: 'bold' },
                    color: isMock ? '#d35400' : '#333' // 範例資料時標題顯示橘色提醒
                }
            },
            scales: {
                // ✅ 左軸：頭痛分數 (0-10)
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '頭痛分數',
                        font: { size: 12, weight: 'bold' },
                        color: '#e74c3c'
                    },
                    min: 0,
                    max: 10,
                    ticks: {
                        color: '#e74c3c',
                        stepSize: 2
                    },
                    grid: {
                        color: 'rgba(231, 76, 60, 0.1)'
                    }
                },
                // ✅ 右軸：氣象資料
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '氣象指標 (溫度/濕度/氣壓)',
                        font: { size: 12, weight: 'bold' },
                        color: '#666'
                    },
                    ticks: {
                        color: '#666'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}*/
// ==========================================
// 1. 全域變數定義與資料結構
// ==========================================

// ✅ 全域圖表實例
//let chartInstance = null;

// ✅ 症狀資料庫定義（可自由新增/改名，或新增類別 category 作為城鄉連動使用）
const SYMPTOM_DEFINITIONS = [
    { id: 'sym_1', name: '噁心 / 嘔吐', category: 'digestive' },
    { id: 'sym_2', name: '畏光', category: 'sensory' },
    { id: 'sym_3', name: '畏聲', category: 'sensory' },
    { id: 'sym_4', name: '頭暈', category: 'sensory' },
    { id: 'sym_5', name: '頸部緊繃', category: 'other' },
    { id: 'sym_6', name: '視覺先兆', category: 'sensory' },
    { id: 'sym_7', name: '情緒波動', category: 'other' },
    { id: 'sym_8', name: '疲倦感', category: 'other' },
    { id: 'sym_9', name: '注意力不集中', category: 'other' },
    { id: 'sym_10', name: '面部麻木', category: 'sensory' }
    // 💡 未來增加問題直接在下方擴充：
    // { id: 'sym_11', name: '睡眠障礙', category: 'other' }
];

// ✅ 全域圖表快取資料庫
let globalChartData = {
    labels: [],
    painScores: [],
    weather: {
        temperatures: [],
        humidities: [],
        pressures: []
    },
    symptoms: {},
    isMock: false
};

// ==========================================
// 2. 下拉選單自動初始化（城鄉/動態擴充法）
// ==========================================

/**
 * 初始化症狀下拉選單
 * @param {string} filterCategory - 選填，傳入類別可篩選（例如 'sensory'），未傳則顯示全部
 */
function initSymptomOptions(filterCategory = 'all') {
    const symptomSelect = document.getElementById('symptomSelect');
    if (!symptomSelect) return;

    // 清空現有選項
    symptomSelect.innerHTML = '';

    // 根據類別篩選症狀
    const list = (filterCategory === 'all')
        ? SYMPTOM_DEFINITIONS
        : SYMPTOM_DEFINITIONS.filter(item => item.category === filterCategory);

    // 動態建構 <option>
    list.forEach((sym) => {
        const option = document.createElement('option');
        option.value = sym.id;
        const symNum = sym.id.replace('sym_', '');
        option.textContent = `症狀 ${symNum} (${sym.name})`;
        symptomSelect.appendChild(option);
    });

    // 動態產生選單後，重新渲染圖表
    renderChart();
}

/**
 * 當第一層「類別選單 (categorySelect)」變更時呼叫
 */
function onCategoryChange() {
    const categorySelect = document.getElementById('categorySelect');
    const selectedCategory = categorySelect ? categorySelect.value : 'all';
    initSymptomOptions(selectedCategory);
}

// ==========================================
// 3. 資料載入與讀取 (Supabase / 模擬資料)
// ==========================================

/**
 * 載入使用者歷史紀錄
 */
async function loadUserHistory(userId) {
    // 重置全域資料結構
    globalChartData.labels = [];
    globalChartData.painScores = [];
    globalChartData.weather = { temperatures: [], humidities: [], pressures: [] };
    globalChartData.symptoms = {};

    // 依據定義檔初始化所有症狀陣列
    SYMPTOM_DEFINITIONS.forEach(sym => {
        globalChartData.symptoms[sym.id] = [];
    });

    // 請求 Supabase 資料
    let data = null;
    try {
        const response = await supabase
            .from('user_data')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(30);
        data = response.data;
    } catch (err) {
        console.warn('Supabase 載入失敗或未連接，改用模擬數據:', err);
    }

    // 💡 判斷是否有讀取到真實資料
    if (data && data.length > 0) {
        // ✅ 1. 有資料：提取真實資料
        globalChartData.isMock = false;
        
        data.forEach(item => {
            globalChartData.labels.push(new Date(item.created_at).toLocaleDateString());
            globalChartData.painScores.push(item.headache_data?.pain_score || 0);
            
            // 氣象資料
            globalChartData.weather.temperatures.push(item.weather_data?.temperature ?? null);
            globalChartData.weather.humidities.push(item.weather_data?.humidity ?? null);
            globalChartData.weather.pressures.push(item.weather_data?.pressure ?? null);
            
            // 動態提取所有症狀資料
            SYMPTOM_DEFINITIONS.forEach(sym => {
                globalChartData.symptoms[sym.id].push(item.symptoms_data?.[sym.id] ?? 0);
            });
        });
    } else {
        // 💡 2. 沒資料：產生近 7 天的範例資料
        globalChartData.isMock = true;

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            globalChartData.labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
        }

        // 模擬 7 天數值
        globalChartData.painScores = [0, 5, 2, 8, 3, 0, 4];
        globalChartData.weather.temperatures = [28, 30, 26, 25, 29, 31, 27];
        globalChartData.weather.humidities = [65, 80, 85, 90, 70, 60, 75];
        globalChartData.weather.pressures = [1012, 1008, 1005, 1002, 1009, 1013, 1010];

        // 隨機模擬所有症狀分數
        SYMPTOM_DEFINITIONS.forEach(sym => {
            globalChartData.symptoms[sym.id] = Array.from({ length: 7 }, () => Math.floor(Math.random() * 7));
        });
    }

    // 初始化選單並繪製圖表
    initSymptomOptions('all');
}

// ==========================================
// 4. 圖表繪製與更新核心 Logic
// ==========================================

/**
 * 繪製或更新 Chart.js 圖表
 */
function renderChart() {
    const canvas = document.getElementById('painChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    // 安全讀取下拉選單的值 (防錯保護)
    const symptomSelect = document.getElementById('symptomSelect');
    const selectedSymKey = symptomSelect?.value || 'sym_1';
    
    let selectedSymLabel = '對比症狀';
    if (symptomSelect && symptomSelect.selectedIndex !== -1 && symptomSelect.options[symptomSelect.selectedIndex]) {
        selectedSymLabel = symptomSelect.options[symptomSelect.selectedIndex].text;
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: globalChartData.labels,
            datasets: [
                // ✅ 1. 左軸：頭痛分數（紅色實線）
                {
                    label: globalChartData.isMock ? '頭痛分數 (範例)' : '頭痛分數',
                    data: globalChartData.painScores,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                // ✅ 2. 左軸：動態選中的症狀（紫色實線，點狀標記）
                {
                    label: selectedSymLabel,
                    data: globalChartData.symptoms[selectedSymKey] || [],
                    borderColor: '#8e44ad',
                    backgroundColor: 'rgba(142, 68, 173, 0.05)',
                    borderWidth: 2,
                    pointStyle: 'rectRot',
                    pointRadius: 5,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                // ✅ 3. 右軸：氣溫
                {
                    label: '氣溫 (°C)',
                    data: globalChartData.weather.temperatures,
                    borderColor: '#f39c12',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderDash: [5, 5]
                },
                // ✅ 4. 右軸：濕度
                {
                    label: '濕度 (%)',
                    data: globalChartData.weather.humidities,
                    borderColor: '#3498db',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderDash: [5, 5]
                },
                // ✅ 5. 右軸：氣壓
                {
                    label: '氣壓 (hPa)',
                    data: globalChartData.weather.pressures,
                    borderColor: '#27ae60',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { usePointStyle: true, padding: 15 }
                },
                title: {
                    display: true,
                    text: globalChartData.isMock 
                        ? '頭痛、症狀與氣象趨勢分析 (尚未有紀錄，目前為近 7 天示範數據)' 
                        : '頭痛、症狀與氣象趨勢分析',
                    font: { size: 14, weight: 'bold' },
                    color: globalChartData.isMock ? '#d35400' : '#333'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: '分數 (0-10)', font: { size: 12, weight: 'bold' } },
                    min: 0,
                    max: 10,
                    ticks: { stepSize: 2 }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: '氣象指標', font: { size: 12, weight: 'bold' } },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

/**
 * 當 HTML 症狀下拉選單（symptomSelect）變更時呼叫
 */
function updateSymptomMetric() {
    renderChart();
}

// 掛載至 window 供外部 HTML 綁定呼叫
window.loadUserHistory = loadUserHistory;
window.updateSymptomMetric = updateSymptomMetric;
window.onCategoryChange = onCategoryChange;

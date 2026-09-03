// 雙層資料結構：類別 -> 症狀清單
const SYMPTOM_CATEGORIES = {
    digestive: [
        { id: 'sym_1', name: '噁心 / 嘔吐' }
    ],
    sensory: [
        { id: 'sym_2', name: '畏光' },
        { id: 'sym_3', name: '畏聲' },
        { id: 'sym_4', name: '頭暈' },
        { id: 'sym_6', name: '視覺先兆' }
    ],
    other: [
        { id: 'sym_5', name: '頸部緊繃' },
        { id: 'sym_7', name: '情緒波動' },
        { id: 'sym_8', name: '疲倦感' },
        { id: 'sym_9', name: '注意力不集中' },
        { id: 'sym_10', name: '面部麻木' }
    ]
};

// 切換第一層「類別」時觸發
function onCategoryChange() {
    const categorySelect = document.getElementById('categorySelect');
    const symptomSelect = document.getElementById('symptomSelect');
    if (!categorySelect || !symptomSelect) return;

    const selectedCategory = categorySelect.value;
    let availableSymptoms = [];

    if (selectedCategory === 'all') {
        // 展平所有類別
        availableSymptoms = Object.values(SYMPTOM_CATEGORIES).flat();
    } else {
        availableSymptoms = SYMPTOM_CATEGORIES[selectedCategory] || [];
    }

    // 重新填入第二層選單
    symptomSelect.innerHTML = '';
    availableSymptoms.forEach(sym => {
        const option = document.createElement('option');
        option.value = sym.id;
        option.textContent = `${sym.id.replace('sym_', '症狀 ')}: ${sym.name}`;
        symptomSelect.appendChild(option);
    });

    // 自動更新圖表
    updateSymptomMetric();
}

// 頁面初次載入時初始化選項
document.addEventListener('DOMContentLoaded', () => {
    onCategoryChange();
});
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
async function loadUserHistory(userId) {
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
}

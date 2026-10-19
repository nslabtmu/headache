// ==========================================
// figure.js — 頭痛 / 症狀 / 氣象趨勢圖（中英雙語）
// ==========================================

// 語言輔助（currentLang 定義在 main.js，呼叫時才讀取）
const fgEn = () => (typeof currentLang !== 'undefined' && currentLang === 'en');
const L = (zh, en) => (fgEn() ? en : zh);

// ✅ 全域圖表實例（main.js 不要再宣告 chartInstance）
let chartInstance = null;

// ✅ 症狀定義：編號與名稱必須與日記頁、PDF 一致
const SYMPTOM_DEFINITIONS = [
    { id: 'sym_1',  zh: '持續性頭痛',         en: 'Persistent headache',                        category: 'other' },
    { id: 'sym_2',  zh: '頭暈、失去平衡',     en: 'Dizziness / balance',                        category: 'sensory' },
    { id: 'sym_3',  zh: '噁心、想吐',         en: 'Nausea',                                     category: 'digestive' },
    { id: 'sym_4',  zh: '疲勞、嗜睡',         en: 'Fatigue / drowsiness',                       category: 'other' },
    { id: 'sym_5',  zh: '注意力、記憶變差',   en: 'Poor concentration / memory',                category: 'other' },
    { id: 'sym_6',  zh: '反應慢、腦霧',       en: 'Slow reaction / brain fog',                  category: 'other' },
    { id: 'sym_7',  zh: '易怒、焦慮、情緒波動', en: 'Irritability / anxiety / mood swings',     category: 'other' },
    { id: 'sym_8',  zh: '視力模糊、畏光畏聲', en: 'Blurred vision / light & noise sensitivity', category: 'sensory' },
    { id: 'sym_9',  zh: '睡眠障礙',           en: 'Sleep disturbance',                          category: 'other' },
    { id: 'sym_10', zh: '頸部疼痛、麻木',     en: 'Neck pain / numbness',                       category: 'sensory' }
];
const symName = s => (fgEn() ? s.en : s.zh);

// ✅ 全域圖表資料（report.js 會讀 window.globalChartData.isMock）
let globalChartData = {
    labels: [],
    painScores: [],
    weather: { temperatures: [], humidities: [], pressures: [] },
    symptoms: {},
    isMock: false
};
window.globalChartData = globalChartData;

// ==========================================
// 下拉選單
// ==========================================
function initSymptomOptions(filterCategory = 'all') {
    const symptomSelect = document.getElementById('symptomSelect');
    if (!symptomSelect) return;

    const keep = symptomSelect.value;
    symptomSelect.innerHTML = '';

    const list = (filterCategory === 'all')
        ? SYMPTOM_DEFINITIONS
        : SYMPTOM_DEFINITIONS.filter(item => item.category === filterCategory);

    list.forEach(sym => {
        const option = document.createElement('option');
        option.value = sym.id;
        option.textContent = `${sym.id.replace('sym_', '')}. ${symName(sym)}`;
        symptomSelect.appendChild(option);
    });

    if (list.some(s => s.id === keep)) symptomSelect.value = keep;

    renderChart();
}

function onCategoryChange() {
    const el = document.getElementById('categorySelect');
    initSymptomOptions(el ? el.value : 'all');
}

// ==========================================
// 資料載入
// ==========================================
async function loadUserHistory(userId) {
    globalChartData.labels = [];
    globalChartData.painScores = [];
    globalChartData.weather = { temperatures: [], humidities: [], pressures: [] };
    globalChartData.symptoms = {};
    SYMPTOM_DEFINITIONS.forEach(sym => { globalChartData.symptoms[sym.id] = []; });

    let data = null;
    try {
        // 取「最新」30 筆，再反轉成由舊到新
        const response = await supabase
            .from('user_data')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);
        if (response.error) throw response.error;
        data = (response.data || []).reverse();
    } catch (err) {
        console.warn('Supabase 載入失敗，改用示範數據:', err);
    }

    if (data && data.length > 0) {
        globalChartData.isMock = false;
        data.forEach(item => {
            globalChartData.labels.push(new Date(item.created_at).toLocaleDateString('sv-SE'));
            globalChartData.painScores.push(item.headache_data?.pain_score ?? 0);
            globalChartData.weather.temperatures.push(item.weather_data?.temperature ?? null);
            globalChartData.weather.humidities.push(item.weather_data?.humidity ?? null);
            globalChartData.weather.pressures.push(item.weather_data?.pressure ?? null);
            SYMPTOM_DEFINITIONS.forEach(sym => {
                globalChartData.symptoms[sym.id].push(item.symptoms_data?.[sym.id] ?? null);
            });
        });
    } else {
        globalChartData.isMock = true;
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            globalChartData.labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
        }
        globalChartData.painScores = [0, 5, 2, 8, 3, 0, 4];
        globalChartData.weather.temperatures = [28, 30, 26, 25, 29, 31, 27];
        globalChartData.weather.humidities = [65, 80, 85, 90, 70, 60, 75];
        globalChartData.weather.pressures = [1012, 1008, 1005, 1002, 1009, 1013, 1010];
        SYMPTOM_DEFINITIONS.forEach(sym => {
            globalChartData.symptoms[sym.id] = Array.from({ length: 7 }, () => 1 + Math.floor(Math.random() * 7));
        });
    }

    initSymptomOptions(document.getElementById('categorySelect')?.value || 'all');
}

// ==========================================
// 繪圖
// ==========================================
function renderChart() {
    const canvas = document.getElementById('painChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartInstance) chartInstance.destroy();

    // 示範資料標籤
    const badge = document.getElementById('mock-data-badge');
    if (badge) badge.style.display = globalChartData.isMock ? 'inline-block' : 'none';

    const symptomSelect = document.getElementById('symptomSelect');
    const selectedKey = symptomSelect?.value || 'sym_1';
    const def = SYMPTOM_DEFINITIONS.find(s => s.id === selectedKey);
    const symLabel = def ? `${selectedKey.replace('sym_', '')}. ${symName(def)}` : L('對比症狀', 'Symptom');

    const mockTag = L(' (範例)', ' (demo)');

    chartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: globalChartData.labels,
            datasets: [
                {
                    label: L('頭痛分數', 'Headache score') + (globalChartData.isMock ? mockTag : ''),
                    data: globalChartData.painScores,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2.5, fill: true, tension: 0.4, yAxisID: 'y'
                },
                {
                    label: symLabel,
                    data: globalChartData.symptoms[selectedKey] || [],
                    borderColor: '#8e44ad',
                    backgroundColor: 'rgba(142, 68, 173, 0.05)',
                    borderWidth: 2, pointStyle: 'rectRot', pointRadius: 5,
                    fill: false, tension: 0.4, yAxisID: 'y', spanGaps: true
                },
                {
                    label: L('氣溫 (°C)', 'Temp (°C)'),
                    data: globalChartData.weather.temperatures,
                    borderColor: '#f39c12', borderWidth: 2, fill: false, tension: 0.4,
                    yAxisID: 'y1', borderDash: [5, 5], spanGaps: true
                },
                {
                    label: L('濕度 (%)', 'Humidity (%)'),
                    data: globalChartData.weather.humidities,
                    borderColor: '#3498db', borderWidth: 2, fill: false, tension: 0.4,
                    yAxisID: 'y1', borderDash: [5, 5], spanGaps: true
                },
                {
                    label: L('氣壓 (hPa)', 'Pressure (hPa)'),
                    data: globalChartData.weather.pressures,
                    borderColor: '#27ae60', borderWidth: 2, fill: false, tension: 0.4,
                    yAxisID: 'y1', borderDash: [5, 5], spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, position: 'top', labels: { usePointStyle: true, padding: 15 } },
                title: {
                    display: true,
                    text: globalChartData.isMock
                        ? L('頭痛、症狀與氣象趨勢分析（尚未有紀錄，目前為近 7 天示範數據）',
                            'Headache, symptoms & weather trends (no records yet — demo data, last 7 days)')
                        : L('頭痛、症狀與氣象趨勢分析', 'Headache, symptoms & weather trends'),
                    font: { size: 14, weight: 'bold' },
                    color: globalChartData.isMock ? '#d35400' : '#333'
                }
            },
            scales: {
                y: {
                    type: 'linear', display: true, position: 'left',
                    title: { display: true, text: L('分數 (0-10)', 'Score (0-10)'), font: { size: 12, weight: 'bold' } },
                    min: 0, max: 10, ticks: { stepSize: 2 }
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    title: { display: true, text: L('氣象指標', 'Weather'), font: { size: 12, weight: 'bold' } },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

function updateSymptomMetric() { renderChart(); }

// ==========================================
// Realtime（避免重複訂閱）
// ==========================================
let userDataChannel = null;

function setupRealtimeListener(userId) {
    if (userDataChannel) {
        try { supabase.removeChannel(userDataChannel); } catch (e) { /* ignore */ }
        userDataChannel = null;
    }
    userDataChannel = supabase
        .channel('user_data_changes')
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'user_data', filter: `user_id=eq.${userId}` },
            (payload) => {
                console.log('收到 Supabase 資料更新通知:', payload.new);
                loadUserHistory(userId);
                if (typeof loadCalendarRecords === 'function') loadCalendarRecords(userId);
            })
        .subscribe();
}

// 掛載至 window
window.loadUserHistory = loadUserHistory;
window.updateSymptomMetric = updateSymptomMetric;
window.onCategoryChange = onCategoryChange;
window.initSymptomOptions = initSymptomOptions;
window.renderChart = renderChart;
window.setupRealtimeListener = setupRealtimeListener;

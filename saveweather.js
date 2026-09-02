// ==================== 改進版：儲存氣象資料 ====================
async function saveAllResearchData() {
    if (REQUIRE_LOCATION_FOR_SUBMIT && !locationReady) {
        alert("⚠️ 尚未取得定位資訊，無法送出！");
        return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("請先登入！"); return; }
    
    let painLocations = [];
    let painScore = 0;
    let medicationUsed = false;
    let medicationName = '';
    let notes = '';
    
    const headacheIframe = document.querySelector('#pane-headache iframe');
    if (headacheIframe && headacheIframe.contentDocument) {
        const iframeDoc = headacheIframe.contentDocument;
        painLocations = Array.from(iframeDoc.querySelectorAll('input[name="pain_location"]:checked')).map(cb => cb.value);
        painScore = Number(iframeDoc.getElementById('input-pain')?.value || 0);
        medicationUsed = iframeDoc.getElementById('input-medication')?.value === 'yes';
        medicationName = iframeDoc.getElementById('input-medication-name')?.value || '';
        notes = iframeDoc.getElementById('input-content')?.value || '';
    } else {
        painLocations = Array.from(document.querySelectorAll('input[name="pain_location"]:checked')).map(cb => cb.value);
        painScore = Number(document.getElementById('input-pain')?.value || 0);
        medicationUsed = document.getElementById('input-medication')?.value === 'yes';
        medicationName = document.getElementById('input-medication-name')?.value || '';
        notes = document.getElementById('input-content')?.value || '';
    }
    
    const headacheData = {
        pain_score: painScore,
        locations: painLocations,
        medication_used: medicationUsed,
        medication_name: medicationName,
        notes: notes
    };

    const symptomsData = {};
    for (let i = 1; i <= 10; i++) {
        const slider = document.querySelector(`input[name="sym${i}"]`);
        if (slider) symptomsData[`sym_${i}`] = Number(slider.value);
    }
    symptomsData.triggers = document.getElementById('triggers')?.value.trim() || "無";

    const healthData = {
        heart_rate: Number(document.getElementById('band_heart_rate')?.value) || null,
        spo2: Number(document.getElementById('band_spo2')?.value) || null,
        steps: Number(document.getElementById('band_steps')?.value) || null,
        avg_steps: Number(document.getElementById('band_avg_steps')?.value) || null
    };

    // ✅ 新增：儲存當下的氣象資料
    const weatherData = currentWeather ? {
        temperature: currentWeather.data?.temperature_2m || null,
        humidity: currentWeather.data?.relative_humidity_2m || null,
        pressure: currentWeather.data?.surface_pressure || null,
        location: currentWeather.location || "未知位置",
        fetched_at: currentWeather.fetched_at
    } : { note: "未取得" };

    const payload = {
        user_id: user.id,
        user_email: user.email,
        headache_data: headacheData,
        symptoms_data: symptomsData,
        health_data: healthData,
        weather_data: weatherData,  // ✅ 更新為完整氣象資料
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('user_data').insert([payload]);

    if (error) {
        alert("❌ 儲存失敗：" + error.message);
    } else {
        alert("✅ 今日研究日誌與數據已成功送出！");
        loadUserHistory(user.id);     
    }
}
// ==================== 改進版：雙軸圖表 ====================
async function loadUserHistory(userId) {
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
}

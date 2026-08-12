
const REQUIRE_LOCATION_FOR_SUBMIT = false;

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentWeather = null;
let chartInstance = null;
let currentLang = 'zh-TW';
let locationReady = false;

// ✅ 修正：頁簽順序與實際 ID 一致
const pageOrder = [ 'pane-headache', 'pane-symptoms', 'pane-band', 'pane-chart', 'pane-profile'];

// 頁面一載入，立刻執行初始化與步驟 1 (IP 定位)
document.addEventListener("DOMContentLoaded", () => {
    initTaiwanSelect(); // 初始化台灣縣市選單備用
});

// 點擊不同意書後的回應
function disagreeConsent() {
    alert("很抱歉，若您不同意研究參與，將無法使用本系統進行紀錄。");
    // 你也可以選擇重新導向到其他頁面，或留在原地
}

// --- 2. 無法定位時的處理（顯示選項 A 與 B 面板） ---
/*function handleLocationFailure() {
    const statusEl = document.getElementById('weather-status');
    statusEl.innerText = "⚠️ 無法自動偵測您的位置";
    
    // 顯示手動選擇與 GPS 備用面板
    document.getElementById('manual-location-box').style.display = 'block';
}*/

// --- 選項 A：開啟瀏覽器精準定位 (GPS) ---
function requestBrowserGPS() {
    const statusEl = document.getElementById('weather-status');
    if (navigator.geolocation) {
        statusEl.innerText = "⏳ 正在請求 GPS 定位...";
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                statusEl.innerText = "📍 GPS 定位成功";
                
                // 成功後隱藏面板並抓氣象
                document.getElementById('manual-location-box').style.display = 'none';
                fetchWeather(lat, lon);
            },
            (error) => {
                alert("GPS 定位被拒絕或失敗，請使用下方選項 B 手動選擇台灣地區。");
                statusEl.innerText = "⚠️ 定位失敗，請手動選擇";
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    } else {
        alert("您的瀏覽器不支援地理定位。");
    }
}

// --- 選項 B：台灣手動選擇初始化與套用 ---
function initTaiwanSelect() {
    const citySelect = document.getElementById('select-city');
    if (!citySelect) return;
    
    citySelect.innerHTML = '<option value="">請選擇縣市...</option>';
    for (const city in taiwanDistricts) {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    }
}

function updateDistricts() {
    const city = document.getElementById('select-city').value;
    const districtSelect = document.getElementById('select-district');
    districtSelect.innerHTML = '<option value="">請選擇鄉鎮市區...</option>';

    if (city && taiwanDistricts[city]) {
        taiwanDistricts[city].forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
    }
}

function applyTaiwanManualLocation() {
    const city = document.getElementById('select-city').value;
    const district = document.getElementById('select-district').value;
    
    if (!city || !district) {
        alert("請完整選擇台灣的縣市與鄉鎮市區！");
        return;
    }
    
    // 隱藏面板並更新狀態
    document.getElementById('manual-location-box').style.display = 'none';
    document.getElementById('weather-status').innerText = `🇹🇼 已選擇：${city} ${district}`;
    
    // 呼叫你原本將「台灣縣市區轉經緯度」的函式
    if (typeof getLatLonForTaiwanDistrict === 'function') {
        getLatLonForTaiwanDistrict(city, district);
    } else {
        console.warn("尚未定義 getLatLonForTaiwanDistrict 函式，請確認你的專案實作。");
    }
}



// ✅ 統一的 showPane 函數（只定義一次）
function showPane(paneId) {
    // 隱藏所有 tab-pane 元素
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    // 顯示目標 pane
    const targetPane = document.getElementById(paneId);
    if (targetPane) {
        targetPane.classList.remove('hidden');
    }
}

// ✅ 修正：navigate() 函數邏輯
function navigate(direction) {
    // 找出當前顯示的 tab-pane
    let currentPane = null;
    for (let paneId of pageOrder) {
        const pane = document.getElementById(paneId);
        if (pane && !pane.classList.contains('hidden')) {
            currentPane = pane;
            break;
        }
    }
    
    if (!currentPane) {
        console.warn("無法找到當前 pane");
        return;
    }
    
    const currentIndex = pageOrder.indexOf(currentPane.id);
    const targetIndex = currentIndex + direction;
    
    if (targetIndex >= 0 && targetIndex < pageOrder.length) {
       switchTab(tabNames[targetIndex]);
    } else if (direction > 0) {
        alert("已到達最後一頁");
    } else {
        alert("已到達第一頁");
    }
}

// ✅ 多語言切換
function toggleLanguage() {
    currentLang = (currentLang === 'zh-TW') ? 'en' : 'zh-TW';
    document.documentElement.lang = currentLang;
    
    // 更新所有 data-i18n 元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langDict[currentLang] && langDict[currentLang][key]) {
            // ⚠️ 只更新文字內容，保留 HTML 結構（用於包含 <b> 標籤的 emg_desc）
            if (key === 'emg_desc') {
                el.innerHTML = langDict[currentLang][key];
            } else {
                el.textContent = langDict[currentLang][key];
            }
        }
    });
}

// ✅ 頁面初始化時載入多語系
function initializeI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langDict[currentLang] && langDict[currentLang][key]) {
            if (key === 'emg_desc') {
                el.innerHTML = langDict[currentLang][key];
            } else {
                el.textContent = langDict[currentLang][key];
            }
        }
    });
}

// ✅ 修正：switchTab() 的元素映射
function switchTab(tabName) {
    const panes = {
        profile: document.getElementById('pane-profile'),
        headache: document.getElementById('pane-headache'),
        symptom: document.getElementById('pane-symptoms'),  // ✅ 修正：是 pane-symptoms（複數）
        band: document.getElementById('pane-band'),          // ✅ 修正：是 pane-band
        chart: document.getElementById('pane-chart')
    };
    
    const btns = {
        profile: document.getElementById('btn-tab-profile'),
        headache: document.getElementById('btn-tab-headache'),
        symptom: document.getElementById('btn-tab-symptom'),
        band: document.getElementById('btn-tab-band'),
        chart: document.getElementById('btn-tab-chart')
    };
    
    const emergencySection = document.getElementById('emergency-section');
    
    // 隱藏所有 pane 和移除所有按鈕的 active 樣式
    Object.values(panes).forEach(p => {
        if (p) p.classList.add('hidden');
    });
    Object.values(btns).forEach(b => {
        if (b) b.classList.remove('active');
    });
    
    // 隱藏緊急警示
    emergencySection.style.display = 'none';
    
    // 顯示選中的 pane 和按鈕
    if (panes[tabName]) {
        panes[tabName].classList.remove('hidden');
    }
    if (btns[tabName]) {
        btns[tabName].classList.add('active');
    }
    
    // 在頭痛與症狀頁面顯示緊急警示
    if (tabName === 'headache' || tabName === 'symptom') {
        emergencySection.style.display = 'block';
    }
    // 同步更新手機版下拉選單的值
    const mobileSelect = document.getElementById('mobile-tab-select');
    if (mobileSelect) {
        mobileSelect.value = tabName;
    }
    document.body.setAttribute('data-active-tab', tabName);
}

// ✅ 新增：藥物輸入框的顯示/隱藏
function toggleMedicationName() {
    const select = document.getElementById('input-medication');
    const input = document.getElementById('input-medication-name');
    
    if (select && input) {
        if (select.value === 'yes') {
            input.style.display = 'block';
        } else {
            input.style.display = 'none';
            input.value = '';
        }
    }
}
async function saveUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("請先登入！"); return; }

    const profilePayload = {
        user_id: user.id,
        nickname: document.getElementById('prof_nickname').value.trim(),
        birth_year: Number(document.getElementById('prof_birthyear').value) || null,
        gender: document.getElementById('prof_gender').value,
        tbi_study: document.getElementById('prof_tbi').value,
        sport_freq: document.getElementById('prof_sport').value,
        updated_at: new Date().toISOString()
    };

    // 使用 upsert，如果該 user_id 已存在就更新，沒有就新增
    const { error } = await supabase.from('profiles').upsert([profilePayload], { onConflict: 'user_id' });

    if (error) {
        alert("❌ 個人資料儲存失敗：" + error.message);
    } else {
        alert("✅ 個人資料已成功儲存！");
        enterProfileViewMode(); // 儲存後切換回唯讀檢視模式
    }
}
// ✅ 檢查緊急警示並禁用提交按鈕
function checkEmergency() {
    const checkboxes = document.querySelectorAll('.emg-check');
    const warningBox = document.getElementById('emergencyWarning');
    const submitBtn = document.getElementById('submitBtn');
    
    let isChecked = false;
    checkboxes.forEach(cb => {
        if (cb && cb.checked) isChecked = true;
    });
    
    if (warningBox) {
        warningBox.style.display = isChecked ? 'block' : 'none';
    }
    if (submitBtn) {
        submitBtn.disabled = isChecked;
    }
}

// 點擊同意書後進入登入畫面
function agreeConsent() {
    document.getElementById('consent-card').classList.add('hidden');
    document.getElementById('auth-card').classList.remove('hidden');
}

// ✅ Google 登入
async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
    });
    if (error) {
        alert("Google 登入失敗：" + error.message);
        console.error(error);
    }
}

// ✅ 登出
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert("登出失敗：" + error.message);
    } else {
        location.reload();
    }
}

// ✅ 顯示主應用
function showMainApp(user) {
    document.getElementById('main-card').classList.remove('hidden');
    initializeI18n();  // 初始化多語系
    getLocationAndWeather();
    loadUserProfile(user.id);
    loadUserHistory(user.id);
}

// ✅ 檢查登入狀態
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        document.getElementById('consent-card').classList.add('hidden');
        document.getElementById('auth-card').classList.add('hidden');
        showMainApp(session.user);
    }
});

// ✅ 載入用戶個人資料
async function loadUserProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    
    if (error) {
        console.error("讀取個人資料失敗：", error.message);
        return;
    }
    
    if (data) {
        document.getElementById('prof_nickname').value = data.nickname || '';
        document.getElementById('prof_birthyear').value = data.birth_year || '';
        if (data.gender) document.getElementById('prof_gender').value = data.gender;
        if (data.tbi_study) document.getElementById('prof_tbi').value = data.tbi_study;
        if (data.sport_freq) document.getElementById('prof_sport').value = data.sport_freq;
        
        enterProfileViewMode();
    } else {
        enterProfileEditMode();
    }
}

// ✅ 設定個人資料欄位的啟用/禁用狀態
function setProfileFieldsDisabled(disabled) {
    const fields = [
        'prof_nickname',
        'prof_birthyear',
        'prof_gender',
        'prof_tbi',
        'prof_sport'
    ];
    
    fields.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.disabled = disabled;
    });
}

// ✅ 進入檢視模式（已有資料）
function enterProfileViewMode() {
    setProfileFieldsDisabled(true);
    const saveBtn = document.getElementById('saveProfileBtn');
    const editBtn = document.getElementById('editProfileBtn');
    
    if (saveBtn) saveBtn.classList.add('hidden');
    if (editBtn) editBtn.classList.remove('hidden');
}

// ✅ 進入編輯模式（新用戶）
function enterProfileEditMode() {
    setProfileFieldsDisabled(false);
    const saveBtn = document.getElementById('saveProfileBtn');
    const editBtn = document.getElementById('editProfileBtn');
    
    if (saveBtn) saveBtn.classList.remove('hidden');
    if (editBtn) editBtn.classList.add('hidden');
}

// ✅ 啟用個人資料編輯
function enableProfileEdit() {
    enterProfileEditMode();
}

// ✅ 取得位置並獲取氣象資料
function getLocationAndWeather() {
    const statusEl = document.getElementById('weather-status');
    
    if (!navigator.geolocation) {
        fetchIpLocation(statusEl);
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, "GPS 定位成功"),
        () => fetchIpLocation(statusEl),
        { timeout: 8000 }
    );
}

// ✅ 透過 IP 進行定位
async function fetchIpLocation(statusEl) {
    try {
        if (statusEl) statusEl.innerText = "⏳ 正在透過網路 IP 進行定位...";
        
        const res = await fetch('https://ipapi.co/json/');
        const ipData = await res.json();
        
        if (ipData.latitude && ipData.longitude) {
            fetchWeather(ipData.latitude, ipData.longitude, `IP 定位成功 (${ipData.city || '未知城市'})`);
        } else {
            throw new Error("IP 定位失敗");
        }
    } catch (err) {
        if (statusEl) statusEl.innerText = "⚠️ 無法取得位置資訊";
        locationReady = false;
        console.error("IP 定位錯誤：", err);
            document.getElementById('manual-location-box').style.display = 'block'; // ★ 補上這行
    }
}

// ✅ 取得氣象與空污資料（29 項）
async function fetchWeather(lat, lon, successMsg) {
    const statusEl = document.getElementById('weather-status');
    try {
        // 15 項氣象參數
        const weatherParams = [
            'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
            'precipitation', 'rain', 'showers', 'snowfall', 'weather_code', 'cloud_cover',
            'pressure_msl', 'surface_pressure', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'
        ].join(',');

        // 14 項空污參數
        const airParams = [
            'pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide', 'sulphur_dioxide', 'ozone',
            'aerosol_optical_depth', 'dust', 'uv_index', 'uv_index_clear_sky',
            'ammonia', 'methane', 'european_aqi', 'us_aqi'
        ].join(',');

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${weatherParams}`;
        const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=${airParams}`;

        const [weatherRes, airRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(airUrl)
        ]);
        
        const weatherData = await weatherRes.json();
        const airData = await airRes.json();

        currentWeather = {
            lat, lon,
            fetched_at: new Date().toISOString(),
            weather: weatherData.current || {},
            air_quality: airData.current || {}
        };
        
        locationReady = true;
        if (statusEl) statusEl.innerHTML = `📍 ${successMsg}！氣象與空污數據同步完成`;
    } catch (err) {
        if (statusEl) statusEl.innerText = "⚠️ 氣象資料解析失敗";
        currentWeather = { lat, lon, fetched_at: new Date().toISOString(), weather: {}, air_quality: {} };
        locationReady = true;
        console.error("取得氣象失敗：", err);
    }
}

// ✅ 更新滑桿數值顯示
function updateVal(slider) {
    const nextElement = slider.nextElementSibling;
    if (nextElement) {
        nextElement.innerText = slider.value;
    }
}

// ✅ 保存頭痛記錄表單
async function saveAttackForm() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("請先登入！");
        return;
    }

    const symptoms = {};
    for (let i = 1; i <= 10; i++) {
        const slider = document.querySelector(`input[name="sym${i}"]`);
        if (slider) symptoms[`sym_${i}`] = Number(slider.value);
    }

    const newRecord = {
        user_id: user.id,
        user_email: user.email,
        symptoms: symptoms,
        triggers: document.getElementById('triggers').value.trim() || "無",
        weather: currentWeather || { note: "未取得" }
    };

    const { error } = await supabase.from('user_data').insert([newRecord]);
    
    if (error) {
        alert("❌ 儲存失敗：" + error.message);
        console.error(error);
    } else {
        alert("✅ 症狀日記送出成功！");
        loadUserHistory(user.id);
    }
}

// ✅ 保存完整紀錄（所有頁簽）
async function saveFullRecord() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("請先登入！");
        return;
    }

    // 1. 打包個人基本資料
    const profileData = {
        nickname: document.getElementById('prof_nickname').value.trim(),
        birth_year: Number(document.getElementById('prof_birthyear').value) || null,
        gender: document.getElementById('prof_gender').value,
        tbi_study: document.getElementById('prof_tbi').value,
        sport_freq: document.getElementById('prof_sport').value
    };

    // 2. 打包頭痛資訊
    const headacheData = {
        pain_level: document.getElementById('input-pain').value || null,
        pain_locations: Array.from(document.querySelectorAll('input[name="pain_location"]:checked')).map(el => el.value),
        medication_used: document.getElementById('input-medication').value,
        medication_name: document.getElementById('input-medication-name').value || null,
        notes: document.getElementById('input-content').value || null
    };

    // 3. 打包 10 大症狀
    const symptomsData = {};
    for (let i = 1; i <= 10; i++) {
        const slider = document.querySelector(`input[name="sym${i}"]`);
        if (slider) symptomsData[`sym_${i}`] = Number(slider.value);
    }
    symptomsData.triggers = document.getElementById('triggers').value.trim() || "無";

    // 4. 打包手環健康資料
    const healthData = {
        heart_rate: Number(document.getElementById('band_heart_rate').value) || null,
        spo2: Number(document.getElementById('band_spo2').value) || null,
        steps: Number(document.getElementById('band_steps').value) || null,
        avg_steps: Number(document.getElementById('band_avg_steps').value) || null
    };

    // 5. 組合最終 Payload
    const payload = {
        user_id: user.id,
        user_email: user.email,
        profile_data: profileData,
        headache_data: headacheData,
        symptoms_data: symptomsData,
        health_data: healthData,
        weather_data: currentWeather || { note: "未取得" }
    };

    // 6. 寫入 Supabase
    const { error } = await supabase.from('user_data').insert([payload]);

    if (error) {
        alert("❌ 儲存失敗：" + error.message);
        console.error(error);
    } else {
        alert("✅ 今日研究日誌與數據已成功送出！");
        loadUserHistory(user.id);
    }
}

// ✅ 保存所有研究資料（針對個人資料頁）
async function saveAllResearchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("請先登入！");
        return;
    }

    const profileData = {
        user_id: user.id,
        nickname: document.getElementById('prof_nickname').value.trim(),
        birth_year: Number(document.getElementById('prof_birthyear').value) || null,
        gender: document.getElementById('prof_gender').value,
        tbi_study: document.getElementById('prof_tbi').value,
        sport_freq: document.getElementById('prof_sport').value
    };

    const { error } = await supabase.from('profiles').upsert([profileData]);

    if (error) {
        alert("❌ 儲存個人資料失敗：" + error.message);
        console.error(error);
    } else {
        alert("✅ 個人基本資料已成功儲存！");
        enterProfileViewMode();
    }
}

// ✅ 載入用戶歷史數據並繪製圖表
async function loadUserHistory(userId) {
    const { data } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(30);
    
    if (!data || data.length === 0) {
        console.log("沒有歷史數據");
        return;
    }

    const labels = data.map(item => new Date(item.created_at).toLocaleDateString());
    
    // 從 symptoms_data JSONB 欄位中提取 sym_1（持續性頭痛）
    const painScores = data.map(item => {
        if (item.symptoms_data && item.symptoms_data.sym_1) {
            return item.symptoms_data.sym_1;
        }
        return 0;
    });

    const ctx = document.getElementById('painChart');
    if (!ctx) {
        console.warn("找不到 painChart canvas");
        return;
    }

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '頭痛評分趨勢 (Sym 1)',
                data: painScores,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    min: 1,
                    max: 10
                }
            }
        }
    });
}

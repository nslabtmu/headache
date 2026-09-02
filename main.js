const REQUIRE_LOCATION_FOR_SUBMIT = false;

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// 全域變數

let currentWeather = null;
let chartInstance = null;
let currentLang = 'zh-TW';
let locationReady = false;

// ✅ pageOrder 中 pane-symptoms 已確認改為 pane-symptom
const pageOrder = ['pane-profile', 'pane-headache', 'pane-symptom', 'pane-band', 'pane-chart'];

// 初始化監聽與狀態確認
document.addEventListener('DOMContentLoaded', () => {
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            showMainApp(session.user);
        } else {
            showAuthFlow();
        }
    });
});

//========= 頁籤切換與導覽控制 =======
function switchTab(tabName) {
    // 隱藏所有頁簽內容
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => pane.classList.add('hidden'));

    // 移除所有按鈕 active 樣式
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // 顯示指定頁簽
    const targetPane = document.getElementById(`pane-${tabName}`);
    if (targetPane) {
        targetPane.classList.remove('hidden');
    }

    // 啟用對應按鈕 active 樣式
    const targetBtn = document.getElementById(`btn-tab-${tabName}`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

    // 同步更新手機版下拉選單
    const mobileSelect = document.getElementById('mobile-tab-select');
    if (mobileSelect) {
        mobileSelect.value = tabName;
    }
}

function navigate(direction) {
    const currentPane = pageOrder.find(id => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
    });

    const currentIndex = pageOrder.indexOf(currentPane);
    let targetIndex = currentIndex + direction;

    if (targetIndex >= 0 && targetIndex < pageOrder.length) {
        const targetId = pageOrder[targetIndex];
        const tabKey = targetId.replace('pane-', '');
        switchTab(tabKey);
    }
}

function toggleLanguage() {
    currentLang = (currentLang === 'zh-TW') ? 'en' : 'zh-TW';
    document.documentElement.lang = currentLang;
    
    // 修正：檢查 langDict 是否存在
    if (typeof langDict !== 'undefined') {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (langDict[currentLang] && langDict[currentLang][key]) {
                el.innerHTML = langDict[currentLang][key];
            }
        });
    }
}

// ==================== 身份驗證與頁面跳轉 ====================
function agreeConsent() {
    const consentCard = document.getElementById('consent-card');
    const authCard = document.getElementById('auth-card');
    if (consentCard) consentCard.classList.add('hidden');
    if (authCard) authCard.classList.remove('hidden');
}

async function handleGoogleLogin() {
    const redirectUrl = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
            redirectTo: redirectUrl,
            queryParams: {
                prompt: 'select_account'
            }
        }
    });
    if (error) alert("Google 登入失敗：" + error.message);
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert("登出失敗：" + error.message);
    } else {
        window.location.href = window.location.origin + window.location.pathname;
    }
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

function showMainApp(user) {
    const consentCard = document.getElementById('consent-card');
    const authCard = document.getElementById('auth-card');
    if (consentCard) consentCard.classList.add('hidden');
    if (authCard) authCard.classList.add('hidden');

    const mainCard = document.getElementById('main-card');
    if (mainCard) mainCard.classList.remove('hidden');

    switchTab('headache');

    const userEmailText = document.getElementById('user-email-text');
    const userEmail = document.getElementById('user-email');
    const userInfoBar = document.getElementById('user-info-bar');
    if (userEmailText) userEmailText.innerText = user.email;
    if (userEmail) userEmail.innerText = user.email;
    if (userInfoBar) userInfoBar.classList.remove('hidden');

    getLocationAndWeather();
    loadUserProfile(user.id);
    loadUserHistory(user.id);
}

function showAuthFlow() {
    const mainCard = document.getElementById('main-card');
    const userInfoBar = document.getElementById('user-info-bar');
    const authCard = document.getElementById('auth-card');
    const consentCard = document.getElementById('consent-card');

    if (mainCard) mainCard.classList.add('hidden');
    if (userInfoBar) userInfoBar.classList.add('hidden');
    if (consentCard) consentCard.classList.remove('hidden');
    if (authCard) authCard.classList.add('hidden');
}

function resetConsent() {
    const consentCard = document.getElementById('consent-card');
    const authCard = document.getElementById('auth-card');
    const mainCard = document.getElementById('main-card');
    
    if (consentCard) consentCard.classList.remove('hidden');
    if (authCard) authCard.classList.add('hidden');
    if (mainCard) mainCard.classList.add('hidden');
}

// ==================== 個人資料設定面板 ====================
async function loadUserProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error) { console.error("讀取個人資料失敗：", error.message); return; }
    
    if (data) {
        if(document.getElementById('prof_nickname')) document.getElementById('prof_nickname').value = data.nickname || '';
        if(document.getElementById('prof_birthyear')) document.getElementById('prof_birthyear').value = data.birth_year || '';
        if(document.getElementById('prof_gender')) document.getElementById('prof_gender').value = data.gender || '';
        if(document.getElementById('prof_tbi')) document.getElementById('prof_tbi').value = data.tbi_study || '';
        if(document.getElementById('prof_sport')) document.getElementById('prof_sport').value = data.sport_freq || '';
        enterProfileViewMode();
    } else {
        enterProfileEditMode();
    }
}

function setProfileFieldsDisabled(disabled) {
    ['prof_nickname', 'prof_birthyear', 'prof_gender', 'prof_tbi', 'prof_sport'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
}

function enterProfileViewMode() {
    setProfileFieldsDisabled(true);
    const saveBtn = document.getElementById('saveProfileBtn');
    const editBtn = document.getElementById('editProfileBtn');
    if (saveBtn) saveBtn.classList.add('hidden');
    if (editBtn) editBtn.classList.remove('hidden');
}

function enterProfileEditMode() {
    setProfileFieldsDisabled(false);
    const saveBtn = document.getElementById('saveProfileBtn');
    const editBtn = document.getElementById('editProfileBtn');
    if (saveBtn) saveBtn.classList.remove('hidden');
    if (editBtn) editBtn.classList.add('hidden');
}

function enableProfileEdit() {
    enterProfileEditMode();
}

async function saveUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("請先登入！");

    const profileData = {
        user_id: user.id,
        nickname: document.getElementById('prof_nickname')?.value.trim() || '',
        birth_year: Number(document.getElementById('prof_birthyear')?.value) || null,
        gender: document.getElementById('prof_gender')?.value || '',
        tbi_study: document.getElementById('prof_tbi')?.value || '',
        sport_freq: document.getElementById('prof_sport')?.value || '',
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('profiles').upsert([profileData]);
    if (error) {
        alert("儲存個人資料失敗：" + error.message);
    } else {
        alert("個人資料已更新！");
        enterProfileViewMode();
    }
}

// ==================== 定位與氣象資訊 API ====================


// 1. 取得氣象資料 (使用 Open-Meteo API)
async function fetchWeather(lat, lon, statusMessage) {
    const statusEl = document.getElementById('weather-status');
    const tempEl = document.getElementById('wx-temp');
    const humidityEl = document.getElementById('wx-humidity');
    const pressureEl = document.getElementById('wx-pressure');
    const locationEl = document.getElementById('wx-location-name');

    try {
        if (statusEl) statusEl.innerText = "⏳ 正在載入氣象資料...";

        // 打 Open-Meteo 氣象 API
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure`
        );
        
        if (!response.ok) throw new Error("API 請求失敗");
        
        const data = await response.json();
        const current = data.current;

        // 更新 UI 資料
        if (tempEl) tempEl.innerText = `${current.temperature_2m} ${data.current_units.temperature_2m}`;
        if (humidityEl) humidityEl.innerText = `${current.relative_humidity_2m} ${data.current_units.relative_humidity_2m}`;
        if (pressureEl) pressureEl.innerText = `${current.surface_pressure} ${data.current_units.surface_pressure}`;
        if (locationEl) locationEl.innerText = `緯度 ${lat.toFixed(2)}, 經度 ${lon.toFixed(2)}`;

        // 保存狀態
        currentWeather = { lat, lon, fetched_at: new Date().toISOString(), data: current };
        locationReady = true;

        if (statusEl) statusEl.innerHTML = `✅ ${statusMessage}`;
        
        const wxDisplay = document.getElementById('weather-data-display');
        if (wxDisplay) wxDisplay.classList.remove('hidden');

    } catch (err) {
        console.error("Fetch weather error:", err);
        if (statusEl) statusEl.innerText = "⚠️ 取得氣象資料失敗";
        locationReady = false;
    }
}

// 2. 當 GPS 失敗時的 IP 定位備案
async function fetchIpLocation(statusEl) {
    if (statusEl) statusEl.innerText = "🌐 嘗試透過 IP 取得大致位置...";
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error("IP API 失敗");
        const data = await res.json();
        
        // 使用 IP 算出的經緯度呼叫氣象 API
        await fetchWeather(data.latitude, data.longitude, "IP 定位成功");
    } catch (err) {
        console.error("IP Location Error:", err);
        if (statusEl) statusEl.innerText = "❌ 定位與取得氣象資料均失敗";
        locationReady = false;
    }
}

// 3. 主進入點：請求瀏覽器 GPS
function getLocationAndWeather() {
    const statusEl = document.getElementById('weather-status');
    if (statusEl) statusEl.innerText = "📍 正在請求 GPS 定位權限...";

    if (!navigator.geolocation) {
        fetchIpLocation(statusEl);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, "GPS 定位成功"),
        (err) => {
            console.warn("GPS 存取遭拒或失敗，轉用 IP 定位：", err.message);
            fetchIpLocation(statusEl);
        },
        { timeout: 8000 }
    );
}
/* 9/1 ✅ 修正：補充缺少的 fetchWeather 基礎實作
async function fetchWeather(lat, lon, statusMessage) {
    const statusEl = document.getElementById('weather-status');
    try {
        currentWeather = { lat, lon, fetched_at: new Date().toISOString() };
        locationReady = true;
        if (statusEl) statusEl.innerHTML = `✅ ${statusMessage} (緯度: ${lat.toFixed(2)}, 經度: ${lon.toFixed(2)})`;
        const wxDisplay = document.getElementById('weather-data-display');
        if (wxDisplay) wxDisplay.classList.remove('hidden');
    } catch (err) {
        if (statusEl) statusEl.innerText = "⚠️ 取得氣象資料失敗";
        locationReady = false;
    }
}

function getLocationAndWeather() {
    const statusEl = document.getElementById('weather-status');
    if (!navigator.geolocation) { fetchIpLocation(statusEl); return; }
    navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, "GPS 定位成功"),
        () => fetchIpLocation(statusEl),
        { timeout: 8000 }
    );
}

async function fetchIpLocation(statusEl) {
    try {
        if (statusEl) statusEl.innerText = "⏳ 正在透過網路 IP 進行定位...";
        const res = await fetch('https://ipapi.co/json/');
        const ipData = await res.json();
        if (ipData.latitude && ipData.longitude) {
            fetchWeather(ipData.latitude, ipData.longitude, `IP 定位成功 (${ipData.city || '未知城市'})`);
        } else { throw new Error(); }
    } catch (err) {
        if (statusEl) statusEl.innerText = "⚠️ 無法取得位置資訊";
        locationReady = false;
    }
}

async function fetchWeatherData() {
    const statusEl = document.getElementById('weather-status');
    if (statusEl) statusEl.innerHTML = "⏳ 正在取得您的位置與氣象數據...";

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                await getLocationNameByCoords(lat, lon);
                await fetchWeather(lat, lon, "精準定位");
            },
            async (error) => {
                console.warn("GPS 定位失敗，改用 IP 定位：", error);
                await getLocationByIP();
            },
            { timeout: 5000 }
        );
    } else {
        await getLocationByIP();
    }
}

async function getLocationByIP() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        const cityName = data.city || data.region || "未知地區";
        
        const locEl = document.getElementById('wx-location');
        if (locEl) locEl.innerText = `${cityName} (IP定位)`;
        
        const displayEl = document.getElementById('weather-data-display');
        if (displayEl) displayEl.classList.remove('hidden');
        
        const statusEl = document.getElementById('weather-status');
        if (statusEl) statusEl.innerHTML = `✅ 已透過 IP 自動定位：<b>${cityName}</b>`;

        if (data.latitude && data.longitude) {
            await fetchWeather(data.latitude, data.longitude, `IP 定位 (${cityName})`);
        }
    } catch (err) {
        console.error("IP 定位失敗:", err);
        showWeatherFallback("⚠️ 無法透過 IP 取得位置，請手動選擇地區。");
    }
}

async function getLocationNameByCoords(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh-TW`);
        const data = await response.json();
        
        if (data && data.address) {
            const city = data.address.city || data.address.county || "";
            const district = data.address.suburb || data.address.town || data.address.district || "";
            const fullLocation = `${city} ${district}`.trim() || "精準定位點";
            
            const locEl = document.getElementById('wx-location');
            if (locEl) locEl.innerText = fullLocation;
            
            const displayEl = document.getElementById('weather-data-display');
            if (displayEl) displayEl.classList.remove('hidden');
            
            const statusEl = document.getElementById('weather-status');
            if (statusEl) statusEl.innerHTML = `✅ 自動定位成功：<b>${fullLocation}</b>`;
        }
    } catch (e) {
        console.warn("反查地名失敗，改顯示座標", e);
        const locEl = document.getElementById('wx-location');
        if (locEl) locEl.innerText = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
}*/

function showWeatherFallback(message) {
    const statusEl = document.getElementById('weather-status');
    const manualBox = document.getElementById('manual-location-box');

    if (statusEl) statusEl.innerHTML = `<span style="color: #e74c3c;">${message}</span>`;
    if (manualBox) manualBox.style.display = 'block';
    
    if (typeof initDistrictSelector === 'function') {
        initDistrictSelector();
    }
}

// ✅ 修正：統一保留此單一手動選擇函數
async function applyTaiwanManualLocation() {
    const city = document.getElementById('select-city')?.value;
    const district = document.getElementById('select-district')?.value;

    if (!city || !district) {
        alert('請選擇縣市與鄉鎮區！');
        return;
    }

    const statusEl = document.getElementById('weather-status');
    if (statusEl) statusEl.innerHTML = `⏳ 正在查詢 ${city}${district} 的氣象...`;

    try {
        // ✅ 呼叫 districts.js 中的函數，取得座標並查詢真實氣象
        await getLatLonForTaiwanDistrict(city, district);
        
        const manualBox = document.getElementById('manual-location-box');
        if (manualBox) manualBox.style.display = 'none';
        
        locationReady = true;
    } catch (err) {
        console.error("查詢失敗：", err);
        if (statusEl) statusEl.innerHTML = `❌ 查詢失敗，請重試。`;
    }
}

function requestBrowserGPS() {
    getLocationAndWeather();
}

function updateDistricts() {
    const citySelect = document.getElementById('select-city');
    const districtSelect = document.getElementById('select-district');
    if (!citySelect || !districtSelect) return;

    const city = citySelect.value;
    if (!city || !window.districtMap) return;
    
    districtSelect.innerHTML = '<option value="">請選擇鄉鎮市區</option>';
    if (window.districtMap[city]) {
        window.districtMap[city].forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.innerText = district;
            districtSelect.appendChild(option);
        });
    }
}

// ==================== 表單互動與檢查 ====================
function updateVal(slider) { 
    if (slider && slider.nextElementSibling) {
        slider.nextElementSibling.innerText = slider.value; 
    }
}

function toggleMedicationName() {
    const medicationSelect = document.getElementById('input-medication');
    const medicationNameInput = document.getElementById('input-medication-name');
    
    if (medicationSelect && medicationNameInput) {
        if (medicationSelect.value === 'yes') {
            medicationNameInput.style.display = 'block';
        } else {
            medicationNameInput.style.display = 'none';
            medicationNameInput.value = '';
        }
    }
}

function checkEmergency() {
    const checkboxes = document.querySelectorAll('.emg-check');
    const warningBox = document.getElementById('emergencyWarning');
    const submitBtn = document.getElementById('submitBtn');
    let isChecked = false;
    
    checkboxes.forEach(cb => { if (cb.checked) isChecked = true; });
    
    if (isChecked) { 
        if (warningBox) warningBox.style.display = 'block'; 
        if (submitBtn) submitBtn.disabled = true; 
    } else { 
        if (warningBox) warningBox.style.display = 'none'; 
        if (submitBtn) submitBtn.disabled = false; 
    }
}

// ==================== 統一整合資料儲存 (核心) ====================
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

    const payload = {
        user_id: user.id,
        user_email: user.email,
        headache_data: headacheData,
        symptoms_data: symptomsData,
        health_data: healthData,
        weather_data: currentWeather || { note: "未取得" },
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

function saveFullRecord() {
    saveAllResearchData();
}

async function loadUserHistory(userId) {
    const { data } = await supabase.from('user_data').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(30);
    if (!data) return;
    const labels = data.map(item => new Date(item.created_at).toLocaleDateString());
    const painScores = data.map(item => item.headache_data?.pain_score || item.symptoms_data?.sym_1 || 0);
    const canvas = document.getElementById('painChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: '頭痛程度分數 (Sym 1)', data: painScores, borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.1)', borderWidth: 2, fill: true }]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 10 } } }
    });
}

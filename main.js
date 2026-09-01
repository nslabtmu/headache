const REQUIRE_LOCATION_FOR_SUBMIT = false;

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentWeather = null;
let chartInstance = null;
let currentLang = 'zh-TW';
let locationReady = false;

// ✅ 修正：pageOrder 中 pane-symptoms 改為 pane-symptom
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

// 如果你想要更聰明的按鈕，可以使用這個函式
function navigate(direction) {
    // 找出當前未被隱藏的頁籤
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
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langDict[currentLang][key]) {
            el.innerHTML = langDict[currentLang][key];
        }
    });
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
                prompt: 'select_account'  // ⭐ 每次都跳出帳號選擇窗口
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

// 顯示主應用介面 (登入後)
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

// ✅ 新增：重填同意書
function resetConsent() {
    const consentCard = document.getElementById('consent-card');
    const authCard = document.getElementById('auth-card');
    const mainCard = document.getElementById('main-card');
    
    if (consentCard) consentCard.classList.remove('hidden');
    if (authCard) authCard.classList.add('hidden');
    if (mainCard) mainCard.classList.add('hidden');
}

// ==================== 個人資料設定面板 ==
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
        nickname: document.getElementById('prof_nickname').value.trim(),
        birth_year: Number(document.getElementById('prof_birthyear').value) || null,
        gender: document.getElementById('prof_gender').value,
        tbi_study: document.getElementById('prof_tbi').value,
        sport_freq: document.getElementById('prof_sport').value,
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

// ==================== 定位與氣象資訊 API ===
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
        statusEl.innerText = "⏳ 正在透過網路 IP 進行定位...";
        const res = await fetch('https://ipapi.co/json/');
        const ipData = await res.json();
        if (ipData.latitude && ipData.longitude) {
            fetchWeather(ipData.latitude, ipData.longitude, `IP 定位成功 (${ipData.city || '未知城市'})`);
        } else { throw new Error(); }
    } catch (err) {
        statusEl.innerText = "⚠️ 無法取得位置資訊";
        locationReady = false;
    }
}

// 取得使用者氣象資料的主要流程
/*async function fetchWeatherData() {
    const statusEl = document.getElementById('weather-status');
    const manualBox = document.getElementById('manual-location-box');
    const displayBox = document.getElementById('weather-data-display');

    statusEl.innerHTML = "⏳ 正在取得您的位置與氣象數據...";

    // 嘗試使用 IP 或 GPS 取得定位
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                // 根據 GPS 經緯度反查地區名稱（例如：新北市 中和區）
                await getLocationNameByCoords(lat, lon);
                await getOpenWeatherByCoords(lat, lon);
            },
            async(error) => {
                // 自動定位被拒絕或失敗時觸發
                console.warn("GPS 自動定位失敗:", error);
                showWeatherFallback("⚠️ 無法自動取得定位，請手動選擇地點或開啟 GPS。");
            },
            { timeout: 5000 } // 超時設定 5 秒
        );
    } else {
        showWeatherFallback("⚠️ 您的裝置不支援地理定位，請手動選擇地點。");
    }
}*/
// 1. 主要取得定位與氣象流程
async function fetchWeatherData() {
    const statusEl = document.getElementById('weather-status');
    const displayBox = document.getElementById('weather-data-display');
    
    statusEl.innerHTML = "⏳ 正在取得您的位置與氣象數據...";

    // 優先嘗試瀏覽器精準定位 (GPS)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // 根據 GPS 經緯度反查地區名稱（例如：新北市 中和區）
                await getLocationNameByCoords(lat, lon);
                // 讀取該經緯度的氣象數據
                await getWeatherData(lat, lon);
            },
            async (error) => {
                console.warn("GPS 定位失敗或被拒絕，改用 IP 定位：", error);
                // GPS 失敗時，自動降級改用 電腦 IP 位址 定位
                await getLocationByIP();
            },
            { timeout: 5000 }
        );
    } else {
        // 裝置不支援 GPS，直接改用 IP 定位
        await getLocationByIP();
    }
}

// 2. 備用方案：透過電腦 IP 位址 取得地區名稱
async function getLocationByIP() {
    try {
        // 呼叫免費 IP 定位 API
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // 取得 IP 解析出的城市 (例如 New Taipei / Taipei)
        const cityName = data.city || data.region || "未知地區";
        
        // 顯示在畫面上
        document.getElementById('wx-location').innerText = `${cityName} (IP定位)`;
        document.getElementById('weather-data-display').classList.remove('hidden');
        document.getElementById('weather-status').innerHTML = `✅ 已透過 IP 自動定位：<b>${cityName}</b>`;

        // 帶入 IP 取得的經緯度查詢氣象
        if (data.latitude && data.longitude) {
            await getWeatherData(data.latitude, data.longitude);
        }
    } catch (err) {
        console.error("IP 定位失敗:", err);
        showWeatherFallback("⚠️ 無法透過 IP 取得位置，請手動選擇地區。");
    }
}

// 3. 透過 GPS 經緯度反查詳細地名 (經緯度 -> 鄉鎮市區)
async function getLocationNameByCoords(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh-TW`);
        const data = await response.json();
        
        if (data && data.address) {
            const city = data.address.city || data.address.county || ""; // 縣市 (例如：新北市)
            const district = data.address.suburb || data.address.town || data.address.district || ""; // 鄉鎮區 (例如：中和區)
            
            const fullLocation = `${city} ${district}`.trim() || "精準定位點";
            
            // 寫入畫面
            document.getElementById('wx-location').innerText = fullLocation;
            document.getElementById('weather-data-display').classList.remove('hidden');
            document.getElementById('weather-status').innerHTML = `✅ 自動定位成功：<b>${fullLocation}</b>`;
        }
    } catch (e) {
        console.warn("反查地名失敗，改顯示座標", e);
        document.getElementById('wx-location').innerText = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
}
// 顯示失敗訊息並「主動開啟手動選項」
function showWeatherFallback(message) {
    const statusEl = document.getElementById('weather-status');
    const manualBox = document.getElementById('manual-location-box');

    if (statusEl) {
        statusEl.innerHTML = `<span style="color: #e74c3c;">${message}</span>`;
    }
    
    // 【關鍵修復】將手動選單顯示出來！
    if (manualBox) {
        manualBox.style.display = 'block';
    }
    
    // 初始化縣市選單（若尚未載入）
    if (typeof initDistrictSelector === 'function') {
        initDistrictSelector();
    }
}

// 選擇台灣縣市後手動更新氣象
async function applyTaiwanManualLocation() {
    const city = document.getElementById('select-city').value;
    const district = document.getElementById('select-district').value;

    if (!city || !district) {
        alert('請選擇縣市與鄉鎮區！');
        return;
    }

    const statusEl = document.getElementById('weather-status');
    statusEl.innerHTML = `⏳ 正在查詢 ${city}${district} 的氣象...`;

    // 這裡調用您的縣市氣象 API 或經緯度對照表
    try {
        // 假設已成功取得手動氣象
        document.getElementById('weather-status').innerHTML = `✅ 已顯示 <b>${city}${district}</b> 的氣象資訊`;
        document.getElementById('weather-data-display').classList.remove('hidden');
        document.getElementById('manual-location-box').style.display = 'none'; // 成功後收合手動面板
    } catch (err) {
        statusEl.innerHTML = `❌ 查詢失敗，請重試。`;
    }
}

// ✅ 新增：GPS 定位請求
function requestBrowserGPS() {
    getLocationAndWeather();
}

// ✅ 新增：手動台灣地區位置
function updateDistricts() {
    const citySelect = document.getElementById('select-city');
    const districtSelect = document.getElementById('select-district');
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

function applyTaiwanManualLocation() {
    const city = document.getElementById('select-city').value;
    const district = document.getElementById('select-district').value;
    
    if (!city || !district) {
        alert('請選擇縣市和鄉鎮市區');
        return;
    }
    
    // 這裡可以調用地理編碼 API 取得座標
    // 或使用預設座標
    alert(`已選擇：${city} ${district}（需補充座標轉換邏輯）`);
}

// ==================== 表單互動與檢查 ==
function updateVal(slider) { 
    if (slider.nextElementSibling) slider.nextElementSibling.innerText = slider.value; 
}

// ✅ 新增：切換用藥欄位
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
    }
    else { 
        if (warningBox) warningBox.style.display = 'none'; 
        if (submitBtn) submitBtn.disabled = false; 
    }
}

// ==================== 統一整合資料儲存 (核心) ==
async function saveAllResearchData() {
    if (REQUIRE_LOCATION_FOR_SUBMIT && !locationReady) {
        alert("⚠️ 尚未取得定位資訊，無法送出！");
        return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("請先登入！"); return; }
    
    // ✅ 修正：從 iframe 中取得頭痛資料（需要特別處理）
    let painLocations = [];
    let painScore = 0;
    let medicationUsed = false;
    let medicationName = '';
    let notes = '';
    
    // 嘗試從 iframe 中取得資料
    const headacheIframe = document.querySelector('#pane-headache iframe');
    if (headacheIframe && headacheIframe.contentDocument) {
        const iframeDoc = headacheIframe.contentDocument;
        painLocations = Array.from(iframeDoc.querySelectorAll('input[name="pain_location"]:checked')).map(cb => cb.value);
        painScore = Number(iframeDoc.getElementById('input-pain')?.value || 0);
        medicationUsed = iframeDoc.getElementById('input-medication')?.value === 'yes';
        medicationName = iframeDoc.getElementById('input-medication-name')?.value || '';
        notes = iframeDoc.getElementById('input-content')?.value || '';
    } else {
        // 如果沒有 iframe，嘗試從主文檔取得（備用方案）
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

    // 打包 10 大症狀與誘因
    const symptomsData = {};
    for (let i = 1; i <= 10; i++) {
        const slider = document.querySelector(`input[name="sym${i}"]`);
        if (slider) symptomsData[`sym_${i}`] = Number(slider.value);
    }
    symptomsData.triggers = document.getElementById('triggers').value.trim() || "無";

    // 打包手環健康數據
    const healthData = {
        heart_rate: Number(document.getElementById('band_heart_rate').value) || null,
        spo2: Number(document.getElementById('band_spo2').value) || null,
        steps: Number(document.getElementById('band_steps').value) || null,
        avg_steps: Number(document.getElementById('band_avg_steps').value) || null
    };

    // 組合最終要送進資料庫的 Payload
    const payload = {
        user_id: user.id,
        user_email: user.email,
        headache_data: headacheData,
        symptoms_data: symptomsData,
        health_data: healthData,
        weather_data: currentWeather || { note: "未取得" },
        created_at: new Date().toISOString()
    };

    // 寫入 Supabase 的 user_data 資料表
    const { error } = await supabase.from('user_data').insert([payload]);

    if (error) {
        alert("❌ 儲存失敗：" + error.message);
    } else {
        alert("✅ 今日研究日誌與數據已成功送出！");
        loadUserHistory(user.id);
    }
}

// 供主表單的 onsubmit 監聽綁定
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

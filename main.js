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
    const locationEl = document.getElementById('wx-location');

    try {
        if (statusEl) statusEl.innerText = "⏳ 正在載入氣象資料...";

        // ✅ 反查地名
        let country = "未知";
        let city = "未知";
        let district = "未知";
        
        try {
            const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh-TW`
            );
            const geoData = await geoRes.json();
            if (geoData && geoData.address) {
                country = geoData.address.country || "臺灣";
                city = geoData.address.city || geoData.address.county || "未知城市";
                district = geoData.address.suburb || geoData.address.town || geoData.address.district || "未知區域";
            }
        } catch (geoErr) {
            console.warn("地名反查失敗：", geoErr);
        }

        // 取氣象資料
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure`
        );
        
        if (!response.ok) throw new Error("API 請求失敗");
        
        const data = await response.json();
        const current = data.current;

        // ✅ 更新 UI
        if (tempEl) tempEl.innerText = `${current.temperature_2m}`;
        if (humidityEl) humidityEl.innerText = `${current.relative_humidity_2m}`;
        if (pressureEl) pressureEl.innerText = `${current.surface_pressure}`;
        
        // ✅ 顯示「國家 - 城市 - 區域」格式
        if (locationEl) locationEl.innerText = `${country} - ${city} - ${district}`;

        currentWeather = { 
            lat, 
            lon, 
            country,
            city,
            district,
            location: `${country} - ${city} - ${district}`,
            fetched_at: new Date().toISOString(), 
            data: current 
        };
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
        // ✅ 顯示 IP 位置
        const ipLocationDisplay = document.getElementById('ip-location-display');
        const ipLocationName = document.getElementById('ip-location-name');
        if (ipLocationDisplay && ipLocationName) {
            const cityName = data.city || data.region || "未知地區";
            ipLocationName.innerText = `${data.country || "未知國家"} - ${cityName}`;
            ipLocationDisplay.classList.remove('hidden');
        }
        // ✅ 加上這行 - 呼叫 fetchWeather
        await fetchWeather(data.latitude, data.longitude, "定位成功");
        
    } catch (err) {
        console.error("IP Location Error:", err);
        if (statusEl) statusEl.innerText = "❌ 氣象資料取得失敗";
        
        // ✅ 改成：失敗也顯示位置卡片
        const ipLocationDisplay = document.getElementById('ip-location-display');
        const ipLocationName = document.getElementById('ip-location-name');
        if (ipLocationDisplay && ipLocationName) {
            ipLocationName.innerText = "⚠️ 無法取得氣象 - 請變更位置重試";
            ipLocationDisplay.classList.remove('hidden');
        } 
        // ✅ 失敗時自動展開選擇面板
        toggleChangeLocation();
        
        // 初始化下拉選單
        if (typeof initDistrictSelector === 'function') {
            initDistrictSelector();
        }
        
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
        // ✅ 更新 IP 位置卡片顯示（改成手動選擇的位置）
        const ipLocationDisplay = document.getElementById('ip-location-display');
        const ipLocationName = document.getElementById('ip-location-name');
        if (ipLocationDisplay && ipLocationName) {
            ipLocationName.innerText = `${city} - ${district} (手動選擇)`;
            ipLocationDisplay.classList.remove('hidden');
        }
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
        // 9/1 weather_data: currentWeather || { note: "未取得" },
        weather_data: weatherData, 
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

// ✅ 新增：切換變更位置面板
function toggleChangeLocation() {
    const manualBox = document.getElementById('manual-location-box');
    if (manualBox) {
        manualBox.style.display = manualBox.style.display === 'none' ? 'block' : 'none';
    }
    
    // 如果展開就初始化下拉選單
    if (manualBox && manualBox.style.display === 'block') {
        if (typeof initDistrictSelector === 'function') {
            initDistrictSelector();
        }
    }
}
// 用藥
function toggleMedicationSection() {
  const select = document.getElementById('input-medication');
  const details = document.getElementById('medication-details');
  details.style.display = select.value === 'yes' ? 'block' : 'none';
}
// 1. 切換主頁籤 (頭痛資料填寫 vs 趨勢圖)
function switchMainTab(event, tabId) {
  document.querySelectorAll('.main-tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.main-tab-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  event.currentTarget.classList.add('active');
}

// 2. 切換次頁籤 (頭痛紀錄 vs 相關症狀 vs 健康資料)
function switchSubTab(event, tabId) {
  document.querySelectorAll('.sub-tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sub-tab-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  event.currentTarget.classList.add('active');
}

// 3. 切換帳戶選單選單開關
function toggleAccountMenu() {
  document.getElementById('account-menu').classList.toggle('show');
}

// 點擊空白處關閉帳戶選單
window.onclick = function(event) {
  if (!event.target.closest('.account-dropdown')) {
    const menu = document.getElementById('account-menu');
    if (menu && menu.classList.contains('show')) {
      menu.classList.remove('show');
    }
  }
}

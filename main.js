const REQUIRE_LOCATION_FOR_SUBMIT = false;

// var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// 全域變數

let currentWeather = null;
chartInstance = null;
let currentLang = 'zh-TW';
let locationReady = false;

// ✅ pageOrder 中 pane-symptoms 已確認改為 pane-symptom
const pageOrder = ['pane-profile', 'pane-headache', 'pane-symptom','pane-mood', 'pane-band', 'pane-chart'];


document.addEventListener('DOMContentLoaded', async () => {
    // 確保 supabase 物件以及 auth 已經成功載入
    if (window.supabase && window.supabase.auth) {
        const authCard = document.getElementById('auth-card');
        const consentCard = document.getElementById('consent-card');
        const mainCard = document.getElementById('main-card');

        // 1. 頁面一載入時的「初始狀態檢查」
        try {
            const { data: { session }, error } = await window.supabase.auth.getSession();
            
            if (session && !error) {
                // 🟢 如果已經登入過：直接跳過同意書和登入，進入主系統
                console.log("✅ 已經登入，直接進入主系統");
                if (consentCard) consentCard.classList.add('hidden');
                if (authCard) authCard.classList.add('hidden');
                if (mainCard) mainCard.classList.remove('hidden');
            } else {
                // 🔴 如果還沒登入：按照流程，先顯示「同意書」，隱藏登入與主系統
                console.log("📄 尚未登入，顯示同意書畫面");
                if (consentCard) consentCard.classList.remove('hidden');
                if (authCard) authCard.classList.add('hidden');
                if (mainCard) mainCard.classList.add('hidden');
            }
        } catch (err) {
            console.error("檢查登入狀態失敗：", err);
        }

        // 2. 監聽後續的登入 / 登出狀態改變
        window.supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth 狀態改變：", event, session);
            
            if (event === 'SIGNED_IN' && session) {
                // 🟢 登入成功時：確保同意書和登入卡片隱藏，顯示主系統
                if (consentCard) consentCard.classList.add('hidden');
                if (authCard) authCard.classList.add('hidden');
                if (mainCard) mainCard.classList.remove('hidden');
            } else if (event === 'SIGNED_OUT') {
                // 🔴 登出時：回到同意書畫面或登入畫面（看你們需求，這裡預設回到同意書）
                if (consentCard) consentCard.classList.remove('hidden');
                if (authCard) authCard.classList.add('hidden');
                if (mainCard) mainCard.classList.add('hidden');
            }
        });
    } else {
        console.error("錯誤：Supabase 尚未初始化或載入失敗！");
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('record-date');
    const timeInput = document.getElementById('record-time');
    
    const now = new Date();
    // 格式化成 YYYY-MM-DD
    const todayStr = now.toISOString().split('T')[0];
    // 格式化成 HH:MM
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (dateInput && !dateInput.value) dateInput.value = todayStr;
    if (timeInput && !timeInput.value) timeInput.value = timeStr;
});


let isTaiwanLocation = true; // 預設先當作台灣，等定位結果回來再校正

function setTaiwanLocationMode(isTaiwan) {
    isTaiwanLocation = isTaiwan;

    // 非台灣地區：隱藏「🔄 變更位置」按鈕，不提供手動選鄉鎮功能
    const changeLocationBtn = document.querySelector('#ip-location-display button');
    if (changeLocationBtn) {
        changeLocationBtn.classList.toggle('hidden', !isTaiwan);
    }

    // 如果面板剛好開著，且判定變成非台灣，強制收起來
    if (!isTaiwan) {
        const manualBox = document.getElementById('manual-location-box');
        if (manualBox) manualBox.style.display = 'none';
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
        switchTab(pageOrder[targetIndex]); // 直接傳入 'pane-symptom' 即可
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
    // 1. 先暫存在瀏覽器，代表這個人已經點過同意了
    localStorage.setItem('has_agreed', 'true');

    // 2. 切換畫面：隱藏同意書，顯示登入卡片
    const consentCard = document.getElementById('consent-card');
    const authCard = document.getElementById('auth-card');
    if (consentCard) consentCard.classList.add('hidden');
    if (authCard) authCard.classList.remove('hidden');

    console.log('✅ 已記錄暫存同意狀態');
}

// 假設這是你登入成功後取得 user 物件的地方
async function handleLoginSuccess(user) {
    try {
        // 檢查瀏覽器有沒有剛剛暫存的同意狀態
        const hasAgreedLocal = localStorage.getItem('has_agreed');

        if (hasAgreedLocal === 'true') {
            // 將同意紀錄正式寫入 Supabase 的同意書 Table
            const { error } = await supabase
                .from('consents') // ⬅️ 換成你的同意書 Table 名稱
                .upsert({
                    user_id: user.id,          // 帶入登入後的真實 user.id
                    agreed: true,
                    agreed_at: new Date()
                });

            if (error) throw error;

            // 寫入 Supabase 成功後，就可以把瀏覽器的暫存清掉了
            localStorage.removeItem('has_agreed');
            console.log('✅ 同意書已成功連動並寫入 Supabase！');
        }
    } catch (error) {
        console.error('❌ 同步同意書到資料庫失敗：', error);
    }
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

    switchTab('pane-form');
    // ✅ 再顯示次頁籤（頭痛）
    switchTab('pane-headache');

    const userEmailText = document.getElementById('user-email-text');
    const userEmail = document.getElementById('user-email');
    const userInfoBar = document.getElementById('user-info-bar');
    if (userEmailText) userEmailText.innerText = user.email;
    if (userEmail) userEmail.innerText = user.email;
    if (userInfoBar) userInfoBar.classList.remove('hidden');

    getLocationAndWeather();
    loadUserProfile(user.id);
    loadUserHistory(user.id);
    setupRealtimeListener(user.id);   // ✅ 加這行，用真實 user.id
}
async function loadUserHistory(userId) {
    const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error("載入歷史失敗", error);
        return;
    }

    // 🌟 關鍵：把撈回來的資料存到全域變數，供 FullCalendar 顯示與點擊使用！
    window.allUserRecords = data || [];

    // 如果你的月曆已經初始化，呼叫這個讓月曆立刻重新整理點點顏色
    if (window.myCalendar) {
        window.myCalendar.refetchEvents();
    }
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
async function fetchWeather(lat, lon, statusMessage) {
    const statusEl = document.getElementById('weather-status');
    const tempEl = document.getElementById('wx-temp');
    const humidityEl = document.getElementById('wx-humidity');
    const pressureEl = document.getElementById('wx-pressure');
    
    // 💡 如果你前端有對應的空污 UI 顯示元素，也可以在這裡宣告
     const pm25El = document.getElementById('wx-pm25');
    const pm25StatusEl = document.getElementById('wx-pm25-status');

    try {
        if (statusEl) statusEl.innerText = "⏳ 正在載入氣象與空污資料...";

        // 1. 定義氣象與空污的參數
        const weatherParams = 'temperature_2m,relative_humidity_2m,surface_pressure';
        const airParams = ['pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide', 'sulphur_dioxide', 'ozone', 'european_aqi', 'us_aqi'].join(',');

        // 2. 同時發送天氣與空氣品質的 API 請求
        const [weatherRes, airRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${weatherParams}`),
            fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=${airParams}`)
        ]);
        
        if (!weatherRes.ok) throw new Error("氣象 API 請求失敗");
        
        const weatherData = await weatherRes.json();
        const currentWx = weatherData.current;

        // 解析空污資料（如果 airRes 失敗則給空物件，避免整支程式斷掉）
        let currentAir = {};
        if (airRes.ok) {
            const airData = await airRes.json();
            currentAir = airData.current || {};
        }

        // ✅ 更新氣象 UI
        if (tempEl) tempEl.innerText = `${currentWx.temperature_2m ?? '--'}`;
        if (humidityEl) humidityEl.innerText = `${currentWx.relative_humidity_2m ?? '--'}`;
        if (pressureEl) pressureEl.innerText = `${currentWx.surface_pressure ?? '--'}`;
        
       if (pm25El) {
    const pm25Val = currentAir.pm2_5;
    
    // 取得評估結果（包含顏色與評語）
    const aq = getAirQualityStatus(pm25Val);

    // 1. 填入數字，並同步套用顏色（例如：12.5 變成綠色）
    pm25El.innerText = pm25Val ?? '--';
    pm25El.style.color = aq.color;

    // 2. 帶入評估文字與標準說明，也套用相同顏色
    if (pm25StatusEl) {
        pm25StatusEl.innerText = `(${aq.text}，以台灣與世界衛生組織常用的 PM2.5 濃度級距為標準)`;
        pm25StatusEl.style.color = aq.color;
    }
}
        // ✅ 整合天氣與空污資料存入全域變數 (完美對應你資料庫的結構)
        currentWeather = { 
            lat, 
            lon, 
            fetched_at: new Date().toISOString(), 
            data: {
                ...currentWx,    // 包含 temperature_2m, relative_humidity_2m 等
                ...currentAir    // 包含 pm2_5, pm10, us_aqi 等
            }
        };
        locationReady = true;

        if (statusEl) statusEl.innerHTML = `✅ ${statusMessage}`;
        
        const wxDisplay = document.getElementById('weather-data-display');
        if (wxDisplay) wxDisplay.classList.remove('hidden');

    } catch (err) {
        console.error("Fetch weather error:", err);
        if (statusEl) statusEl.innerText = "⚠️ 取得氣象與空污資料失敗";
        locationReady = false;
    }
}
/**
 * 評估空氣品質 (PM2.5)
 * 評估標準：以台灣環境部與世界衛生組織 (WHO) 常用的 PM2.5 濃度級距為依據
 */
function getAirQualityStatus(pm25) {
    if (pm25 === null || pm25 === undefined || isNaN(pm25)) {
        return { text: "資料讀取中", color: "#7f8c8d" };
    }

    const val = Number(pm25);

    if (val <= 15.4) {
        return { text: "優", color: "#27ae60" };      // 綠色
    } else if (val <= 35.4) {
        return { text: "普通", color: "#f39c12" };   // 黃色 / 橘色
    } else if (val <= 54.4) {
        return { text: "差", color: "#e67e22" };     // 橘紅色
    } else {
        return { text: "極差", color: "#e74c3c" };   // 紅色
    }
}

// 1. 修正 UI 顯示（避免 district 為空時後面出現多餘的 "-"）
function updateLocationDisplay(country, city, district, isManual = false) {
    const ipLocationDisplay = document.getElementById('ip-location-display');
    const ipLocationName = document.getElementById('ip-location-name');
    
    if (ipLocationDisplay && ipLocationName) {
        const suffix = isManual ? ' (手動選擇)' : '';
        // 過濾掉空值的欄位，並用 " - " 連接
        const locationParts = [country, city, district].filter(Boolean);
        ipLocationName.innerText = `${locationParts.join(' - ')}${suffix}`;
        ipLocationDisplay.classList.remove('hidden');
    }
}

// 2. 更換並優化 IP 定位邏輯 (改用 ipwho.is 備用 ip-api.com)
async function fetchIpLocation(statusEl) {
    if (statusEl) statusEl.innerText = "🌐 嘗試透過 IP 取得大致位置...";
    
    let data = null;

    // 嘗試 API 1: ipwho.is (無 CORS 問題，支援 HTTPS)
    try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
            const json = await res.json();
            if (json.success) {
                data = {
                    country: json.country || "未知國家",
                    country_code: json.country_code,
                    city: json.city || json.region || "未知城市",
                    latitude: json.latitude,
                    longitude: json.longitude
                };
            }
        }
    } catch (e) {
        console.warn("ipwho.is 失敗，切換備用 API");
    }

    // 備用 API 2: ip-api.com (若上面失敗則啟用)
    if (!data) {
        try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
                const json = await res.json();
                data = {
                    country: json.country_name || "未知國家",
                    country_code: json.country_code,
                    city: json.city || json.region || "未知城市",
                    latitude: json.latitude,
                    longitude: json.longitude
                };
            }
        } catch (e) {
            console.error("備用 IP API 也失敗:", e);
        }
    }

    // 判定結果與渲染
    if (data && data.latitude && data.longitude) {
        // ✅ 成功取得 IP 定位
        updateLocationDisplay(data.country, data.city, "");
        setTaiwanLocationMode(data.country_code === 'TW'); 
        
        // 抓取氣象資料
        fetchWeather(data.latitude, data.longitude, "IP 定位成功");
    } else {
        // ❌ 完全無法取得 IP 定位
        console.error("IP Location Error: 無法取得有效的 IP 座標");
        if (statusEl) statusEl.innerText = "❌ 無法定位，請手動選擇";
        
        updateLocationDisplay("未知", "無法取得", "請變更位置重試");
        
        setTaiwanLocationMode(true);
        toggleChangeLocation();
        if (typeof initDistrictSelector === 'function') {
            initDistrictSelector();
        }
        
        locationReady = false;
    }
}
/*function updateLocationDisplay(country, city, district, isManual = false) {
    const ipLocationDisplay = document.getElementById('ip-location-display');
    const ipLocationName = document.getElementById('ip-location-name');
    
    if (ipLocationDisplay && ipLocationName) {
        const suffix = isManual ? ' (手動選擇)' : '';
        ipLocationName.innerText = `${country} - ${city} - ${district}${suffix}`;
        ipLocationDisplay.classList.remove('hidden');
    }
}
async function fetchIpLocation(statusEl) {
    if (statusEl) statusEl.innerText = "🌐 嘗試透過 IP 取得大致位置...";
    try {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error("IP API 失敗");
        const data = await res.json();
        
        // ✅ 顯示 IP 位置（簡單版本）
        const cityName = data.city || data.region || "未知地區";
        updateLocationDisplay(data.country || "未知國家", cityName, "");
        
        //// ✅ 新增：依 IP 判斷的國碼決定是否開放手動選台灣鄉鎮
        setTaiwanLocationMode(data.country_code === 'TW');  
        // ✅ 第2步：背景非同步查詢氣象（不阻塞位置顯示）
        fetchWeather(data.latitude, data.longitude, "IP 定位成功");
        
    } catch (err) {
        console.error("IP Location Error:", err);
        if (statusEl) statusEl.innerText = "❌ 無法定位，請手動選擇";
        // ✅ 失敗時也顯示卡片
        updateLocationDisplay("未知", "無法取得", "請變更位置重試");
        
        // 展開選擇面板
        setTaiwanLocationMode(true);
        toggleChangeLocation();
        if (typeof initDistrictSelector === 'function') {
            initDistrictSelector();
        }
        
        locationReady = false;
    }
}*/
async function getLocationAndWeather() {
    const statusEl = document.getElementById('weather-status');
    if (statusEl) statusEl.innerText = "📍 正在請求 GPS 定位權限...";

    if (!navigator.geolocation) {
        fetchIpLocation(statusEl);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            
            // ✅ 反查地名
            try {
                const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh-TW`
                );
                const geoData = await geoRes.json();
                if (geoData && geoData.address) {
                    const country = geoData.address.country || "臺灣";
                    const city = geoData.address.city || geoData.address.county || "未知城市";
                    const district = geoData.address.suburb || geoData.address.town || geoData.address.district || "未知區域";
                    updateLocationDisplay(country, city, district);
                    setTaiwanLocationMode(geoData.address.country_code === 'tw');
                }
            } catch (e) {
                console.warn("反查失敗，用座標代替");
                updateLocationDisplay("未知", `${lat.toFixed(2)}`, `${lon.toFixed(2)}`);
                setTaiwanLocationMode(true);
            }
            
            // ✅ 取氣象
            await fetchWeather(lat, lon, "GPS 定位成功");
        },
        (err) => {
            console.warn("GPS 失敗，轉用 IP：", err.message);
            fetchIpLocation(statusEl);
        },
        { timeout: 8000 }
    );
}
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
        // 取座標並查氣象
        await getLatLonForTaiwanDistrict(city, district);
        
        // ✅ 用統一函數顯示位置
        updateLocationDisplay("臺灣", city, district, true);
        
        // 隱藏選擇面板
        const manualBox = document.getElementById('manual-location-box');
        if (manualBox) manualBox.style.display = 'none';
        
        locationReady = true;
    } catch (err) {
        console.error("查詢失敗：", err);
        if (statusEl) statusEl.innerHTML = `❌ 查詢失敗，請重試。`;
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



function saveFullRecord() {
    saveAllResearchData();
}


// ✅ 新增：切換變更位置面板
function toggleChangeLocation() {
        if (!isTaiwanLocation) {
        alert('目前手動選擇位置僅支援台灣地區。');
        return;
    }
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



async function switchTab(tabId) {
  console.log('🔵 [switchTab] 開始執行，tabId =', tabId);
  
  const targetPane = document.getElementById(tabId);
  console.log('🔵 [switchTab] targetPane 元素:', targetPane);
  
  if (!targetPane) {
    console.error('❌ [switchTab] 找不到元素:', tabId);
    return;
  }

  const paneParent = targetPane.parentElement;
  console.log('🔵 [switchTab] paneParent:', paneParent);
  console.log('🔵 [switchTab] paneParent 子元素數:', paneParent.children.length);
  
  Array.from(paneParent.children).forEach((child, index) => {
    console.log(`  子元素 ${index}:`, child.id || child.className);
    if (child.classList.contains('tab-pane')) {
      child.classList.remove('active');
    }
  });
  
  targetPane.classList.add('active');
  console.log('🔵 [switchTab] 已添加 active class 到:', tabId);
  console.log('   計算後的 display:', window.getComputedStyle(targetPane).display);

  const targetButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (targetButton) {
    const btnParent = targetButton.parentElement;
    Array.from(btnParent.children).forEach(btn => {
      if (btn.classList.contains('tab-btn')) {
        btn.classList.remove('active');
      }
    });
    targetButton.classList.add('active');
    console.log('🔵 [switchTab] 已高亮按鈕:', tabId);
  }

  const mobileSelect = document.getElementById('mobile-tab-select');
  if (mobileSelect) {
    mobileSelect.value = tabId;
  }

  if (tabId === 'pane-chart') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) loadUserHistory(user.id);
  }
  
  console.log('✅ [switchTab] 完成！');
}

// 3. 切換帳戶選單開關
function toggleAccountMenu() {
  const menu = document.getElementById('account-menu');
  if (menu) {
    menu.classList.toggle('show');
  }
}

// 4. 點擊選單外面時自動關閉選單
window.addEventListener('click', function(event) {
  const dropdown = document.querySelector('.account-dropdown');
  const menu = document.getElementById('account-menu');
  
  if (dropdown && menu && !dropdown.contains(event.target)) {
    menu.classList.remove('show');
  }
});

// 5. 語系按鈕切換效果 (配合 toggleLanguage 或 i18n 系統)
document.addEventListener('DOMContentLoaded', () => {
  const langBtns = document.querySelectorAll('.lang-switch .lang-btn');
  langBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      langBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      if (typeof toggleLanguage === 'function') {
        toggleLanguage(this.textContent.trim().toLowerCase());
      }
    });
  });
});

// 免責聲明
function openDisclaimerModal() {
    const modal = document.getElementById('disclaimer-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeDisclaimerModal() {
    const modal = document.getElementById('disclaimer-modal');
    if (modal) modal.classList.add('hidden');
}

// 範例：使用免費的 Open-Meteo 取得當地氣壓並做簡單預警
async function checkMigraineWeatherRisk(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=pressure_msl,temperature_2m`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // 取得未來幾小時的氣壓陣列
        const pressures = data.hourly.pressure_msl;
        
        // 簡單計算氣壓變化趨勢（例如比對前後幾小時）
        // 如果氣壓短時間掉落超過特定數值（如 5-8 hPa），就跳出警示
        const currentPressure = pressures[0];
        const futurePressure = pressures[6]; // 6小時後
        
        const drop = currentPressure - futurePressure;
        if (drop > 6) {
            console.warn("⚠️ 氣壓正在急遽下降，可能是偏頭痛高風險期！");
            // 可以在你的網頁介面上顯示小提示燈或警告訊息
        }
    } catch (error) {
        console.error("無法取得氣象資料", error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('headacheCalendar'); // 請確認你的 HTML 容器 ID
    if (!calendarEl) return;

    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'zh-tw',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        // 渲染月曆上的紀錄標記
        events: function(fetchInfo, successCallback, failureCallback) {
            const events = (window.allUserRecords || []).map(record => {
                let color = '#28a745'; // 綠色（輕微）
                const score = record.headache_data?.pain_score || 0;
                if (score >= 7) color = '#ff6b6b';      // 紅色（重度）
                else if (score >= 4) color = '#ffd43b'; // 黃色（中度）

                const dateStr = record.created_at ? record.created_at.split('T')[0] : '';

                return {
                    title: `痛: ${score}`,
                    start: dateStr,
                    color: color,
                    extendedProps: record
                };
            });
            successCallback(events);
        },
        // 👆 點擊月曆某一天時彈跳出該日資料
dateClick: function(info) {
            const clickedDate = info.dateStr; // 例如 "2026-09-05"
            // 🛑 1. 檢查是不是未來的日期（還沒到的日期不能選）
            const clicked = new Date(clickedDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // 將今天時間歸零，只比對日期年月日

            if (clicked > today) {
                alert("⚠️ 不能選擇尚未到的日期（未來日期）！");
                return; // 直接中斷，不執行後續動作
            }
            // 檢查這一天是否有紀錄
            const matchedRecord = (window.allUserRecords || []).find(r => {
                const rDate = r.created_at ? r.created_at.split('T')[0] : '';
                return rDate === clickedDate;
            });

            if (matchedRecord) {
                // 📅 狀況 A：這天有紀錄，彈出視窗顯示詳細內容
                const hData = matchedRecord.headache_data || {};
                const wData = matchedRecord.weather_data || {};
                
                alert(`📅 記錄日期：${clickedDate}\n` +
                      `🔥 疼痛指數：${hData.pain_score} / 10\n` +
                      `📍 痛點部位：${(hData.locations || []).join(', ') || '未記錄'}\n` +
                      `💊 服藥狀況：${hData.medication_used ? '有 (' + (hData.medication_name || '未填藥名') + ')' : '無'}\n` +
                      `🌡️ 當時氣壓：${wData.pressure || '無'} hPa`);
            } else {
                // 📅 狀況 B：這天沒有記錄，詢問是否要補填
            const confirmAdd = confirm(`📅 日期 ${clickedDate}\n這天尚無頭痛紀錄，是否要切換至填寫頁面進行補填？`);
            if (confirmAdd) {
    const dateInput = document.getElementById('record-date');
    if (dateInput) {
        dateInput.value = clickedDate;
        console.log('✅ 日期已設置:', clickedDate);
    }

    // 🔴 關鍵修復：先激活主頁籤 pane-form
    console.log('🔴 先激活 pane-form（主頁籤）');
    switchTab('pane-form');
    
    // 延遲 100ms 再激活子頁籤，確保 DOM 更新完成
    setTimeout(() => {
        console.log('🔴 再激活 pane-headache（子頁籤）');
        switchTab('pane-headache');
        console.log('✅ 已呼叫 switchTab("pane-headache")');
    }, 100);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}
            }
        }
    });

    calendar.render();
    window.myCalendar = calendar; // 掛載到全域變數
});
// 記得掛載至 window
window.openDisclaimerModal = openDisclaimerModal;
window.closeDisclaimerModal = closeDisclaimerModal;
// 6. 全域掛載，確保 HTML onclick 可以順利呼叫
window.switchTab = switchTab;
window.toggleAccountMenu = toggleAccountMenu;



// 宣告在全域，確保 HTML 的 onclick 隨時找得到它
let selectedParts = [];

function selectPainPart(partName) {
    const svgEl = document.getElementById(`svg-${partName}`);
    const btnEl = document.getElementById(`btn-${partName}`);
    
    // 檢查目前是否已經被選中
    const index = selectedParts.indexOf(partName);
    
    if (index > -1) {
        // 如果已經選過，就取消選中
        selectedParts.splice(index, 1);
        if (svgEl) svgEl.classList.remove('active-part');
        if (btnEl) btnEl.classList.remove('active-btn');
    } else {
        // 如果還沒選，就加入選中狀態
        selectedParts.push(partName);
        if (svgEl) svgEl.classList.add('active-part');
        if (btnEl) btnEl.classList.add('active-btn');
    }
    
    // 將選中的結果更新到隱藏表單中
    const hiddenInput = document.getElementById('hidden-pain-locations');
    if (hiddenInput) {
        hiddenInput.value = JSON.stringify(selectedParts);
    }
    console.log("目前選中的部位：", selectedParts);
}
// 低氣壓等預警?
function checkBarometricPressureAlert(pressure) {
    const alertBox = document.getElementById('weather-alert-box');
    const alertMsg = document.getElementById('alert-message');
    
    // 一般標準大氣壓力約在 1013 hPa。若氣壓低於 1005 hPa，通常是低氣壓或天氣轉壞
    if (pressure && pressure < 1005) {
        alertBox.style.display = 'block';
        alertMsg.innerText = `目前氣壓為 ${pressure} hPa（低氣壓狀態），氣壓驟降是常見的偏頭痛誘因，建議隨身攜帶備用藥物與水！`;
    } else {
        alertBox.style.display = 'none'; // 氣壓正常則隱藏警報
    }
}
// 假設這是你原本獲取並更新氣象數據的函數
function updateWeatherUI(data) {
    // 1. 更新畫面上的數值
    document.getElementById('wx-temp').innerText = data.temp;
    document.getElementById('wx-humidity').innerText = data.humidity;
    document.getElementById('wx-pressure').innerText = data.pressure; // 假設這是氣壓值，例如 1002
    
    // 2. 🟢 加上這行：自動檢查氣壓並觸發警報！
    checkBarometricPressureAlert(data.pressure);
}

// 檢查氣壓的判定函數
function checkBarometricPressureAlert(pressure) {
    const alertBox = document.getElementById('weather-alert-box');
    const alertMsg = document.getElementById('alert-message');
    
    // 將氣壓轉換成數字
    const p = parseFloat(pressure);
    
    if (!isNaN(p) && p < 1005) {
        // 氣壓偏低 (低於 1005 hPa)，顯示黃色警告框
        alertBox.style.display = 'block';
        alertMsg.innerText = `目前氣壓為 ${p} hPa（低氣壓狀態），氣壓驟降是常見的偏頭痛誘因，建議多加留意！`;
    } else {
        // 氣壓正常，隱藏警告框
        alertBox.style.display = 'none';
    }
}
// 匯出資料
async function exportMedicalReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // 設定標題
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Headache & Weather Clinical Report", 14, 20);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by Personal Headache Tracker System", 14, 28);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 34);

    // 畫一條分隔線
    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);

    // 填入摘要資訊（可以從你的資料庫或全域變數撈取近期數據）
    doc.setFont("helvetica", "bold");
    doc.text("1. Patient Summary (Last 30 Days)", 14, 50);
    
    doc.setFont("helvetica", "normal");
    doc.text("- Total Attack Days: 5 days", 18, 58);
    doc.text("- Average Pain Scale: 6.5 / 10", 18, 66);
    doc.text("- Most Frequent Location: Left Temple, Forehead", 18, 74);
    doc.text("- Medication Usage Rate: 80% (Mainly NSAIDs)", 18, 82);

    doc.setFont("helvetica", "bold");
    doc.text("2. Clinical Notes & Weather Correlation", 14, 96);
    doc.setFont("helvetica", "normal");
    doc.text("Patient reports strong correlation between barometric pressure drops", 18, 104);
    doc.text("and migraine onset. Recommended for neurological evaluation.", 18, 112);

    // 儲存 PDF 檔案
    doc.save("Headache_Medical_Report.pdf");
}


document.addEventListener('DOMContentLoaded', function() {
    // 1. 自動取得使用者所在位置（經緯度）
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                checkWeatherRisk(lat, lon);
            },
            error => {
                console.log("無法取得定位，預設使用台北氣象資料", error);
                // 如果用戶拒絕定位，預設帶入台北的經緯度 (25.03, 121.56)
                checkWeatherRisk(25.03, 121.56);
            }
        );
    } else {
        checkWeatherRisk(25.03, 121.56);
    }
});
async function checkWeatherRisk(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=pressure_msl,temperature_2m`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const pressures = data.hourly.pressure_msl;
        const currentPressure = pressures[0]; // 當前氣壓
        const futurePressure = pressures[6];  // 6小時後的氣壓
        
        const drop = currentPressure - futurePressure; // 6小時內降幅
        
        // 1. 取得你 HTML 中的兩個元素
        const alertBox = document.getElementById('weather-alert-box');
        const alertMsg = document.getElementById('alert-message');
        
        const riskCard = document.getElementById('weather-risk-card');
        const riskText = document.getElementById('weather-risk-text');
        
        // --- 狀況 A：檢查當前氣壓是否偏低（例如低於標準大氣壓 1013 hPa 太多，或小於 1005 hPa） ---
        if (currentPressure < 1008) {
            if (alertBox && alertMsg) {
                alertMsg.innerHTML = `偵測到目前氣壓偏低（<strong>${currentPressure.toFixed(1)} hPa</strong>），今日低氣壓環境可能增加偏頭痛發作機率，請多加注意！`;
                alertBox.style.display = 'block'; // 顯示動態提示框
            }
        } else {
            if (alertBox) alertBox.style.display = 'none'; // 氣壓正常就隱藏
        }
        
        // --- 狀況 B：檢查未來幾小時是否有「氣壓驟降」的風險 ---
        if (drop > 4) {
            if (riskCard && riskText) {
                riskText.innerHTML = `當前氣壓 <strong>${currentPressure.toFixed(1)} hPa</strong>，預計未來幾小時內將急遽下降約 <strong>${drop.toFixed(1)} hPa</strong>。<br>氣壓快速變動是引發偏頭痛的高風險因子！`;
                riskCard.classList.remove('hidden'); // 顯示風險卡片
            }
        } else {
            if (riskCard) riskCard.classList.add('hidden'); // 沒風險就隱藏
        }
        
    } catch (error) {
        console.error("無法取得氣象預報資料", error);
    }
}

const REQUIRE_LOCATION_FOR_SUBMIT = false;

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// 全域變數

let currentWeather = null;
chartInstance = null;
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
async function fetchWeather(lat, lon, statusMessage) {
    const statusEl = document.getElementById('weather-status');
    const tempEl = document.getElementById('wx-temp');
    const humidityEl = document.getElementById('wx-humidity');
    const pressureEl = document.getElementById('wx-pressure');

    try {
        if (statusEl) statusEl.innerText = "⏳ 正在載入氣象資料...";

        // 取氣象資料（不反查地名）
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure`
        );
        
        if (!response.ok) throw new Error("API 請求失敗");
        
        const data = await response.json();
        const current = data.current;

        // ✅ 只更新氣象 UI
        if (tempEl) tempEl.innerText = `${current.temperature_2m}`;
        if (humidityEl) humidityEl.innerText = `${current.relative_humidity_2m}`;
        if (pressureEl) pressureEl.innerText = `${current.surface_pressure}`;

        currentWeather = { 
            lat, 
            lon, 
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
function updateLocationDisplay(country, city, district, isManual = false) {
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
}
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
    let medicationCategories = []; 
    let medicationEffect = '';     
    let notes = '';
    
    const headacheIframe = document.querySelector('#pane-headache iframe');
    if (headacheIframe && headacheIframe.contentDocument) {
        const iframeDoc = headacheIframe.contentDocument;
        
        // 抓取 SVG 隱藏欄位痛點 JSON
        const hiddenLoc = iframeDoc.getElementById('hidden-pain-locations');
        if (hiddenLoc && hiddenLoc.value) {
            try { painLocations = JSON.parse(hiddenLoc.value); } catch(e) { painLocations = []; }
        }
        if (painLocations.length === 0) {
            painLocations = Array.from(iframeDoc.querySelectorAll('input[name="pain_location"]:checked')).map(cb => cb.value);
        }

        painScore = Number(iframeDoc.getElementById('input-pain')?.value || 0);
        medicationUsed = iframeDoc.getElementById('input-medication')?.value === 'yes';
        medicationName = iframeDoc.getElementById('input-medication-name')?.value || '';
        notes = iframeDoc.getElementById('input-content')?.value || '';

        medicationCategories = Array.from(iframeDoc.querySelectorAll('input[name="med-category"]:checked')).map(cb => cb.value);
        medicationEffect = iframeDoc.getElementById('input-medication-effect')?.value || '';
    } else {
        // 抓取主頁面 SVG 隱藏欄位痛點 JSON
        const hiddenLoc = document.getElementById('hidden-pain-locations');
        if (hiddenLoc && hiddenLoc.value) {
            try { painLocations = JSON.parse(hiddenLoc.value); } catch(e) { painLocations = []; }
        }
        if (painLocations.length === 0) {
            painLocations = Array.from(document.querySelectorAll('input[name="pain_location"]:checked')).map(cb => cb.value);
        }

        painScore = Number(document.getElementById('input-pain')?.value || 0);
        medicationUsed = document.getElementById('input-medication')?.value === 'yes';
        medicationName = document.getElementById('input-medication-name')?.value || '';
        notes = document.getElementById('input-content')?.value || '';

        medicationCategories = Array.from(
            document.querySelectorAll('input[name="med-category"]:checked')
        ).map(cb => cb.value);
        medicationEffect = document.getElementById('input-medication-effect')?.value || '';
    }
    
    const headacheData = {
        pain_score: painScore,
        locations: painLocations,
        medication_used: medicationUsed,
        medication_name: medicationName,
        medication_categories: medicationCategories,   
        medication_effect: medicationEffect,
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

    // 🌟 處理日期與時間（支援補填舊日期）
    const inputDate = document.getElementById('record-date')?.value;
    const inputTime = document.getElementById('record-time')?.value || '00:00:00';
    let targetDateTime;
    
    if (inputDate) {
        // 組合使用者選擇的日期與時間，轉成 ISO 格式
        targetDateTime = new Date(`${inputDate}T${inputTime}`).toISOString();
    } else {
        targetDateTime = new Date().toISOString();
    }

    // 氣象資料處理（如果是補填，會記錄當下抓到的氣象或經緯度備份）
    const weatherData = currentWeather ? {
        temperature: currentWeather.data?.temperature_2m || null,
        humidity: currentWeather.data?.relative_humidity_2m || null,
        pressure: currentWeather.data?.surface_pressure || null,
        location: currentWeather.location || "未知位置",
        fetched_at: currentWeather.fetched_at,
        is_backfilled: !!inputDate // 標記這是一筆補填資料
    } : { 
        note: "當下無氣象(防火牆或未抓取)",  
        latitude: window.userLocation?.lat || null,  
        longitude: window.userLocation?.lng || null,
        is_backfilled: true
    };
 
    const payload = {
        user_id: user.id,
        user_email: user.email,
        headache_data: headacheData,
        symptoms_data: symptomsData,
        health_data: healthData,
        weather_data: weatherData, 
        created_at: targetDateTime // 🌟 精準寫入你指定的補填日期與時間！
    };

    const { error } = await supabase.from('user_data').insert([payload]);

    if (error) {
        alert("❌ 儲存失敗：" + error.message);
    } else {
        alert("✅ 該筆頭痛日誌已成功儲存！");
        if (typeof loadUserHistory === 'function') {
            loadUserHistory(user.id);
        }
    }
}


function saveFullRecord() {
    saveAllResearchData();
}
/*async function saveAllResearchData() {
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
    let medicationCategories = []; // ✅ 提前在最外層宣告
    let medicationEffect = '';     // ✅ 提前在最外層宣告
    let notes = '';
    
    const headacheIframe = document.querySelector('#pane-headache iframe');
    if (headacheIframe && headacheIframe.contentDocument) {
        const iframeDoc = headacheIframe.contentDocument;
        painLocations = Array.from(iframeDoc.querySelectorAll('input[name="pain_location"]:checked')).map(cb => cb.value);
        painScore = Number(iframeDoc.getElementById('input-pain')?.value || 0);
        medicationUsed = document.getElementById('input-medication')?.value === 'yes';
        medicationName = document.getElementById('input-medication-name')?.value || '';
        notes = document.getElementById('input-content')?.value || '';

        medicationCategories = Array.from(iframeDoc.querySelectorAll('input[name="med-category"]:checked')).map(cb => cb.value);
        medicationEffect = iframeDoc.getElementById('input-medication-effect')?.value || '';
        //medicationCategories = Array.from(document.querySelectorAll('input[name="med-category"]:checked') ).map(cb => cb.value);
        //medicationEffect = document.getElementById('input-medication-effect')?.value || '';
    } else {
        painLocations = Array.from(document.querySelectorAll('input[name="pain_location"]:checked')).map(cb => cb.value);
        painScore = Number(document.getElementById('input-pain')?.value || 0);
        medicationUsed = document.getElementById('input-medication')?.value === 'yes';
        medicationName = document.getElementById('input-medication-name')?.value || '';
        notes = document.getElementById('input-content')?.value || '';
    // ✅ else 區塊也補上取得藥物分類與效果的邏輯
        medicationCategories = Array.from(
            document.querySelectorAll('input[name="med-category"]:checked')
        ).map(cb => cb.value);
        medicationEffect = document.getElementById('input-medication-effect')?.value || '';
    }
    
    const headacheData = {
        pain_score: painScore,
        locations: painLocations,
        medication_used: medicationUsed,
        medication_name: medicationName,
        medication_categories: medicationCategories,   // 新增
        medication_effect: medicationEffect,
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
    } : { note: "當下無氣象(防火牆或未抓取)", 
    // 💡 帶入定位座標，供 Supabase Edge Function 後續補抓氣象
    latitude: window.userLocation?.lat || null, 
    longitude: window.userLocation?.lng || null };
 
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
// 假設這是你從 Supabase 撈回來的資料陣列叫 records
window.allUserRecords = records; // 把資料暫存到全域變數供月曆使用

function saveFullRecord() {
    saveAllResearchData();
}*/

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

/*function handleMobileTabChange(tabName) {
    const tabId = `pane-${tabName}`;
    switchTab(null, tabId);
}
function switchTab(event, tabId, contentClass = 'tab-pane', buttonClass = 'tab-btn') {
    document.querySelectorAll(`.${contentClass}`).forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    
    document.querySelectorAll(`.${buttonClass}`).forEach(el => {
        el.classList.remove('active');
    });
    
    const targetEl = document.getElementById(tabId);
    if (targetEl) {
        targetEl.classList.remove('hidden');
        targetEl.classList.add('active');
    }
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}*/

/*function switchTab(tabId) {
  // 隐藏所有 tab-pane
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  // 取消所有按钮的 active
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // 显示目标 tab
  const targetPane = document.getElementById(tabId);
  if (targetPane) {
    targetPane.classList.add('active');
  }

  // 高亮对应按钮
  const targetButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (targetButton) {
    targetButton.classList.add('active');
  }

  // 同步手机版 select
  const mobileSelect = document.getElementById('mobile-tab-select');
  if (mobileSelect) {
    mobileSelect.value = tabId;
  }
}*/

async function switchTab(tabId) {
  const targetPane = document.getElementById(tabId);
  if (!targetPane) return;

  // ✅ 只清除「同一層」（同一個父層底下）的 tab-pane，不影響其他層級
  const paneParent = targetPane.parentElement;
  Array.from(paneParent.children).forEach(child => {
    if (child.classList.contains('tab-pane')) {
      child.classList.remove('active');
    }
  });
  targetPane.classList.add('active');

  // ✅ 按鈕高亮同樣限制在同一層
  const targetButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (targetButton) {
    const btnParent = targetButton.parentElement;
    Array.from(btnParent.children).forEach(btn => {
      if (btn.classList.contains('tab-btn')) {
        btn.classList.remove('active');
      }
    });
    targetButton.classList.add('active');
  }

  // 同步手機版 select（只有主頁籤在用，次頁籤呼叫時找不到對應 option，忽略即可）
  const mobileSelect = document.getElementById('mobile-tab-select');
  if (mobileSelect) {
    mobileSelect.value = tabId;
  }
  // ✅ 新增：切到趨勢圖分頁時，才真正畫圖（這時候畫布才是可見的正確尺寸）
  if (tabId === 'pane-chart') {
    const { data: { user } } = await supabase.auth.getUser(); // 見下方註記
    if (user) loadUserHistory(user.id);
  }
}  // end of switchtab



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


//月曆
/*document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('headacheCalendar');
    
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', // 顯示整月模式
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        locale: 'zh-tw', // 設定繁體中文
        height: 'auto',
        // 這裡未來可以改為透過 fetch 從你的 Cloudflare Workers 後端撈取真實資料
        events: [
            { title: '重度頭痛', start: '2026-09-02', color: '#dc3545' }, // 紅色代表重度
            { title: '輕度頭痛', start: '2026-09-05', color: '#ffc107' }, // 黃色代表輕度
            { title: '無痛', start: '2026-09-06', color: '#28a745' }      // 綠色代表無痛
        ],
        // 當使用者點擊月曆某一格時的互動
        dateClick: function(info) {
            alert('你點選了日期： ' + info.dateStr + '\n準備帶出當日氣象與頭痛紀錄...');
            // 這裡可以寫：彈出 Modal 視窗，或是把畫面滾動到上方並帶入該日期的資料
        }
    });
    
    calendar.render();
});*/
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
            const clickedDate = info.dateStr; // 例如 "2026-09-08"
            
            const matchedRecord = (window.allUserRecords || []).find(r => {
                const rDate = r.created_at ? r.created_at.split('T')[0] : '';
                return rDate === clickedDate;
            });

            if (matchedRecord) {
                const hData = matchedRecord.headache_data || {};
                const wData = matchedRecord.weather_data || {};
                
                alert(`📅 記錄日期：${clickedDate}\n` +
                      `🔥 疼痛指數：${hData.pain_score} / 10\n` +
                      `📍 痛點部位：${(hData.locations || []).join(', ') || '未記錄'}\n` +
                      `💊 服藥狀況：${hData.medication_used ? '有 (' + (hData.medication_name || '未填藥名') + ')' : '無'}\n` +
                      `🌡️ 當時氣壓：${wData.pressure || '無'} hPa`);
} else {
                // 這天沒有記錄，詢問是否補填
                const confirmAdd = confirm(`📅 日期 ${clickedDate}\n這天尚無頭痛紀錄，是否要切換至填寫頁面進行補填？`);
                if (confirmAdd) {
                    // 1. 自動把點擊的日期填入表單的日期欄位
                    const dateInput = document.getElementById('record-date');
                    if (dateInput) {
                        dateInput.value = clickedDate;
                    }

                    // 2. 切換分頁到填寫頁面（請依你的專案函式修改，例如 switchTab 或 showPane）
                    if (typeof switchTab === 'function') {
                        switchTab('pane-headache');
                    } else {
                        location.hash = '#pane-headache';
                    }
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

// 月曆出現 資料
document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('headacheCalendar');
    
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'zh-tw',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        // 動態事件渲染（讓有頭痛紀錄的日子自動變色）
        events: function(fetchInfo, successCallback, failureCallback) {
            // 如果全域有資料，就即時轉換成月曆的事件顏色
            const events = (window.allUserRecords || []).map(record => {
                let color = '#28a745'; // 綠色（輕微/無）
                const score = record.headache_data?.pain_score || 0;
                if (score >= 7) color = '#ff6b6b';      // 重度紅
                else if (score >= 4) color = '#ffd43b'; // 中度黃

                // 提取記錄的日期（假設你的 created_at 是 "2026-09-08T..." 格式）
                const dateStr = record.created_at ? record.created_at.split('T')[0] : '';

                return {
                    title: `痛感: ${score}`,
                    start: dateStr,
                    color: color,
                    extendedProps: record // 把整筆資料藏在事件裡
                };
            });
            successCallback(events);
        },
        // 🟢 點擊月曆某一天的核心邏輯
        dateClick: function(info) {
            const clickedDate = info.dateStr; // 例如 "2026-09-08"
            
            // 從全域資料中找出符合當天的紀錄
            const matchedRecord = (window.allUserRecords || []).find(r => {
                const rDate = r.created_at ? r.created_at.split('T')[0] : '';
                return rDate === clickedDate;
            });

            if (matchedRecord) {
                // 📅 狀況 A：這天有紀錄，彈出視窗顯示詳細內容！
                const hData = matchedRecord.headache_data || {};
                const wData = matchedRecord.weather_data || {};
                
                alert(`📅 記錄日期：${clickedDate}\n` +
                      `🔥 疼痛指數：${hData.pain_score} / 10\n` +
                      `📍 痛點部位：${(hData.locations || []).join(', ') || '未記錄'}\n` +
                      `💊 服藥狀況：${hData.medication_used ? '有 (' + (hData.medication_name || '未填藥名') + ')' : '無'}\n` +
                      `🌡️ 當時氣壓：${wData.pressure || '無'} hPa`);
            } else {
                // 📅 狀況 B：這天沒有記錄，詢問是否要帶入日期補填
                const confirmAdd = confirm(`📅 日期 ${clickedDate}\n這天尚無頭痛紀錄，是否要切換至填寫頁面進行補填？`);
                if (confirmAdd) {
                    // 這裡可以寫切換到填寫分頁的程式碼（例如切換到 pane-headache）
                    // switchTab('pane-headache');
                }
            }
        }
    });
    
    calendar.render();
    window.myCalendar = calendar; // 方便之後資料更新時呼叫 calendar.refetchEvents()
});

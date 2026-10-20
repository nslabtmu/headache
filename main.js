const REQUIRE_LOCATION_FOR_SUBMIT = false;

// var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// 全域變數

let currentWeather = null;
let currentLang = 'zh-TW';
let locationReady = false;
let appStarted = false;

// ✅ 同意書版本號：改版時只要改這一個地方
// PDF 檔名請對應命名為 consent_v{版本號}.pdf
const CONSENT_VERSION = '4';
const CONSENT_PDF_URL = `./consent_v${CONSENT_VERSION}.pdf`;

// ✅ pageOrder 中 pane-symptoms 已確認改為 pane-symptom
const pageOrder = ['pane-profile', 'pane-headache', 'pane-symptom','pane-mood', 'pane-band', 'pane-chart'];

function startApp(user) {
    if (appStarted) return;
    appStarted = true;
    showMainApp(user);
}

document.addEventListener('DOMContentLoaded', async () => {
    const pdfFrame = document.getElementById('pdfFrame');
    const pdfLink = document.getElementById('pdfDownloadLink');
    if (pdfFrame) pdfFrame.src = CONSENT_PDF_URL;
    if (pdfLink) pdfLink.href = CONSENT_PDF_URL;
        if (!(window.supabase && window.supabase.auth)) {
            console.error("錯誤：Supabase 尚未初始化或載入失敗！");
            return;
        }

    const authCard = document.getElementById('auth-card');
    const consentCard = document.getElementById('consent-card');
    const mainCard = document.getElementById('main-card');

    try {
        const { data: { session }, error } = await window.supabase.auth.getSession();
        if (session && !error) {
            console.log("✅ 已登入，啟動主系統");
            startApp(session.user);
        } else {
            console.log("📄 尚未登入，顯示同意書");
            consentCard?.classList.remove('hidden');
            authCard?.classList.add('hidden');
            mainCard?.classList.add('hidden');
        }
    } catch (err) {
        console.error("檢查登入狀態失敗：", err);
    }

    window.supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth 狀態改變：", event);
        if (event === 'SIGNED_IN' && session) {
            handleLoginSuccess(session.user);
            startApp(session.user);
        } else if (event === 'SIGNED_OUT') {
            appStarted = false;
            showAuthFlow();
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
  resetRecordDateTime();   // 定義在 save.js
  ['record-date','record-time'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', () => { window.dtTouched = true; }));
});
/*document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('record-date');
    const timeInput = document.getElementById('record-time');
    
    const now = new Date();
    // 格式化成 YYYY-MM-DD
    const todayStr = now.toLocaleDateString('sv-SE');
    // 格式化成 HH:MM
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (dateInput && !dateInput.value) dateInput.value = todayStr;
    if (timeInput && !timeInput.value) timeInput.value = timeStr;
});*/

function trf(key, zh, vars = {}) {
  return tr(key, zh).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
window.trf = trf;
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


// ==================== 身份驗證與頁面跳轉 ====================
function agreeConsent() {
    localStorage.setItem('has_agreed', 'true');
    localStorage.setItem('agreed_version', CONSENT_VERSION);

    document.getElementById('consent-card')?.classList.add('hidden');
    document.getElementById('auth-card')?.classList.remove('hidden');
}


async function handleLoginSuccess(user) {
    try {
        if (localStorage.getItem('has_agreed') !== 'true') return;

        const { error } = await supabase
            .from('consent_records')
            .insert({
                user_id: user.id,
                user_email: user.email,
                consent_version: localStorage.getItem('agreed_version') || CONSENT_VERSION,
                agreed: true,
                agreed_at: new Date().toISOString()
            });
        if (error) throw error;

        localStorage.removeItem('has_agreed');
        localStorage.removeItem('agreed_version');
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
    if (error) alert(tr('google_fail','Google 登入失敗：') + error.message);
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert(tr('logout_fail','登出失敗：') + error.message);
    } else {
        window.location.href = window.location.origin + window.location.pathname;
    }
}

function showMainApp(user) {
    const consentCard = document.getElementById('consent-card');
    const authCard = document.getElementById('auth-card');
    if (consentCard) consentCard.classList.add('hidden');
    if (authCard) authCard.classList.add('hidden');

    const mainCard = document.getElementById('main-card');
    if (mainCard) mainCard.classList.remove('hidden');

    switchMainTab('symptoms');
    // ✅ 再顯示次頁籤（頭痛）
    switchLevel2Tab('diary');

    const userEmailText = document.getElementById('user-email-text');
    const userEmail = document.getElementById('user-email');
    const userInfoBar = document.getElementById('user-info-bar');
    if (userEmailText) userEmailText.innerText = user.email;
    if (userEmail) userEmail.innerText = user.email;
    if (userInfoBar) userInfoBar.classList.remove('hidden');

    getLocationAndWeather();
    loadUserProfile(user.id);
    loadUserHistory(user.id);
    loadCalendarRecords(user.id);
    setupRealtimeListener(user.id);   // ✅ 加這行，用真實 user.id
    window.QuizTrend?.load();
    updateSaveButtonLabel?.();
    updateStepBadges?.();
}
async function loadCalendarRecords(userId) {
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
    if (!user) return alert(tr('need_login','請先登入！'));

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
        alert(tr('profile_fail','儲存個人資料失敗：') + error.message);
    } else {
        alert(tr('profile_ok','個人資料已更新！'));
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
        if (statusEl) statusEl.innerText = tr('wx_loading2','⏳ 正在載入氣象與空污資料...');

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
        pm25StatusEl.innerText = `(${aq.text})`;
        pm25StatusEl.style.color = aq.color;
    }
}
        // ✅ 整合天氣與空污資料存入全域變數 (完美對應你資料庫的結構)
        currentWeather = { 
            lat, 
            lon, 
            fetched_at: new Date().toISOString(), 
            location: document.getElementById('ip-location-name')?.innerText || null,
            data: {
                ...currentWx,    // 包含 temperature_2m, relative_humidity_2m 等
                ...currentAir    // 包含 pm2_5, pm10, us_aqi 等
            }
        };
        locationReady = true;
        checkWeatherRisk(lat, lon);
        if (statusEl) statusEl.innerHTML = `✅ ${statusMessage}`;
        
        const wxDisplay = document.getElementById('weather-data-display');
        if (wxDisplay) wxDisplay.classList.remove('hidden');

    } catch (err) {
        console.error("Fetch weather error:", err);
        if (statusEl) statusEl.innerText = tr('wx_fail','⚠️ 取得氣象與空污資料失敗');
        locationReady = false;
    }
}
/**
 * 評估空氣品質 (PM2.5)
 * 評估標準：以台灣環境部與世界衛生組織 (WHO) 常用的 PM2.5 濃度級距為依據
 */
function getAirQualityStatus(pm25) {
    if (pm25 === null || pm25 === undefined || isNaN(pm25)) {
        return { text: tr('aq_wait','資料讀取中'), color: "#7f8c8d" };
    }

    const val = Number(pm25);

    if (val <= 15.4) {
        return { text: tr('aq_good','優'), color: "#27ae60" };      // 綠色
    } else if (val <= 35.4) {
        return { text:  tr('aq_ok','普通'), color: "#f39c12" };   // 黃色 / 橘色
    } else if (val <= 54.4) {
        return { text: tr('aq_bad','差'), color: "#e67e22" };     // 橘紅色
    } else {
        return { text: tr('aq_worst','極差'), color: "#e74c3c" };   // 紅色
    }
}

// 1. 修正 UI 顯示（避免 district 為空時後面出現多餘的 "-"）
function updateLocationDisplay(country, city, district, isManual = false) {
    const ipLocationDisplay = document.getElementById('ip-location-display');
    const ipLocationName = document.getElementById('ip-location-name');
    
    if (ipLocationDisplay && ipLocationName) {
        const suffix = isManual ? tr('manual_suffix',' (手動選擇)') : '';
        // 過濾掉空值的欄位，並用 " - " 連接
        const locationParts = [country, city, district].filter(Boolean);
        ipLocationName.innerText = `${locationParts.join(' - ')}${suffix}`;
        ipLocationDisplay.classList.remove('hidden');
    }
}

// 2. 更換並優化 IP 定位邏輯 (改用 ipwho.is 備用 ip-api.com)
async function fetchIpLocation(statusEl) {
    if (statusEl) statusEl.innerText = tr('ip_try','🌐 嘗試透過 IP 取得大致位置...');
    
    let data = null;

    // 嘗試 API 1: ipwho.is (無 CORS 問題，支援 HTTPS)
    try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
            const json = await res.json();
            if (json.success) {
                data = {
                    country: json.country || tr('loc_unknown_country','未知國家'),
                    country_code: json.country_code,
                    city: json.city || json.region ||tr('loc_unknown_city','未知城市'),
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
                    country: json.country_name || tr('loc_unknown_country','未知國家'),
                    country_code: json.country_code,
                    city: json.city || json.region ||tr('loc_unknown_city','未知城市'),
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
        fetchWeather(data.latitude, data.longitude, tr('ip_ok','IP 定位成功'));
    } else {
        // ❌ 完全無法取得 IP 定位
        console.error("IP Location Error: 無法取得有效的 IP 座標");
        if (statusEl) statusEl.innerText = tr('loc_fail','❌ 無法定位，請手動選擇');
        
        updateLocationDisplay(updateLocationDisplay(tr('loc_unknown','未知'), tr('loc_unavailable','無法取得'), tr('loc_retry','請變更位置重試')));
        
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
    if (statusEl) statusEl.innerText = tr('gps_req','📍 正在請求 GPS 定位權限...');

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
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=${currentLang === 'en' ? 'en' : 'zh-TW'}
                );
                const geoData = await geoRes.json();
                if (geoData && geoData.address) {
                    const country = geoData.address.country ||tr('country_tw','臺灣');
                    const city = geoData.address.city || geoData.address.county || tr('loc_unknown_city','未知城市');
                    const district = geoData.address.suburb || geoData.address.town || geoData.address.district || tr('loc_unknown_district','未知區域');
                    updateLocationDisplay(country, city, district);
                    setTaiwanLocationMode(geoData.address.country_code === 'tw');
                }
            } catch (e) {
                console.warn("反查失敗，用座標代替");
                updateLocationDisplay(tr('loc_unknown','未知'), `${lat.toFixed(2)}`, `${lon.toFixed(2)}`);
                setTaiwanLocationMode(true);
            }
            
            // ✅ 取氣象
            await fetchWeather(lat, lon,tr('gps_ok','GPS 定位成功'));
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
        alert(tr('pick_city','請選擇縣市與鄉鎮區！'));
        return;
    }

    const statusEl = document.getElementById('weather-status');
        if (statusEl) statusEl.innerHTML = `⏳ ${tr('wx_query','正在查詢')} ${city}${district}...`;

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
        if (statusEl) statusEl.innerHTML = `❌ ${tr('query_fail','查詢失敗，請重試。')}`;
    }
}



// ==================== 表單互動與檢查 ====================
function updateVal(slider) {
  if (slider?.nextElementSibling) slider.nextElementSibling.innerText = slider.value;
  window.symTouched = true;
}

function saveFullRecord() {
    saveAllResearchData();
}


// ✅ 新增：切換變更位置面板
function toggleChangeLocation() {
        if (!isTaiwanLocation) {
        alert(tr('tw_only','目前手動選擇位置僅支援台灣地區。'));
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



/*async function switchTab(tabId) {
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
}*/
function switchMainTab(name) {
  document.querySelectorAll('.main-pane').forEach(p => p.style.display = 'none');
  document.getElementById('main-' + name).style.display = 'block';
  document.querySelectorAll('.top-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.main === name));
}

function switchLevel2Tab(name) {
  document.querySelectorAll('.l2-pane').forEach(p => p.style.display = 'none');
  document.getElementById('l2-' + name).style.display = 'block';
  document.querySelectorAll('.level2-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.l2 === name));
  if (name === 'trend') {
    window.myCalendar?.render();      // 原本寫成 calendar.render()
    window.myCalendar?.updateSize();
    window.QuizTrend?.load();         // 切到趨勢頁時重新讀取量表
  }}

function switchTab(id) { // 只管第三層
  document.querySelectorAll('#attack-form .tab-pane').forEach(p =>
    p.classList.toggle('active', p.id === id));
  document.querySelectorAll('.sub-tabs .tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === id));
  document.getElementById('mobile-tab-select').value = id;
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

            const dateStr = record.created_at ? new Date(record.created_at).toLocaleDateString('sv-SE') : '';

                return {
                    title: `${tr('cal_pain','痛')}: ${score}`,
                    start: dateStr,
                    color: color,
                    extendedProps: record
                };
            });
            const quizEvents = window.QuizTrend ? window.QuizTrend.events() : [];
            successCallback([...events, ...quizEvents]);
        },
        // 👆 點擊月曆某一天時彈跳出該日資料
dateClick: function(info) {
            const clickedDate = info.dateStr; // 例如 "2026-09-05"
            // 🛑 1. 檢查是不是未來的日期（還沒到的日期不能選）
            const todayStr = new Date().toLocaleDateString('sv-SE');

            if (clickedDate > todayStr) {
                alert(tr('cal_future','⚠️ 不能選擇尚未到的日期（未來日期）！'));
                return; // 直接中斷，不執行後續動作
            }
            // 檢查這一天是否有紀錄
            const quizToday = (window.QuizTrend?.byDate()[clickedDate]) || [];
            const quizText = quizToday.map(r =>
            `🧠 ${r.name}：${r.total}/${r.max}（${window.QuizTrend.labelOf(r)}）`).join('\n');
            const matchedRecord = (window.allUserRecords || []).find(r => {
                const rDate = r.created_at ? new Date(r.created_at).toLocaleDateString('sv-SE') : '';
                return rDate === clickedDate;
            });

            if (matchedRecord) {
                // 📅 狀況 A：這天有紀錄，彈出視窗顯示詳細內容
                const hData = matchedRecord.headache_data || {};
                const wData = matchedRecord.weather_data || {};
        alert(`📅 ${clickedDate}\n` +
    `🔥 ${tr('cal_score','疼痛指數')}：${hData.pain_score} / 10\n` +
    `📍 ${tr('cal_loc','痛點部位')}：${(hData.locations || []).join(', ') || '-'}\n` +
    `💊 ${tr('cal_med','服藥狀況')}：${hData.medication_used ? (hData.medication_name || tr('yes','是')) : tr('no','否')}\n` +
    `🌡️ ${tr('cal_pressure','當時氣壓')}：${wData.pressure || '-'} hPa` +
     (quizText ? `\n\n${quizText}` : ''));
                    } else if (quizText) {
                        alert(`📅 ${clickedDate}\n${quizText}\n\n${tr('cal_norecord','這天尚無頭痛紀錄。')}`);
                    } else {
                // 📅 狀況 B：這天沒有記錄，詢問是否要補填
                const confirmAdd = confirm(`📅 ${clickedDate}\n${tr('cal_confirm','這天尚無頭痛紀錄，是否要切換至填寫頁面進行補填？')}`);
                if (confirmAdd) {
    const dateInput = document.getElementById('record-date');
    if (dateInput) {
        dateInput.value = clickedDate;
        console.log('✅ 日期已設置:', clickedDate);
    }

    // 🔴 關鍵修復：先激活主頁籤 pane-form
    console.log('🔴 先激活 pane-form（主頁籤）');
        switchLevel2Tab('diary');
    
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
function moodHint() {
  const last = Object.values(window.QuizTrend?.latest() || {})
    .map(r => new Date(r.date)).sort((a, b) => b - a)[0];
  const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
  const el = document.getElementById('mood-hint');
  if (!el) return;
  el.textContent = days === null
    ? tr('mood_first','還沒做過量表，建議先做一份（例如 PHQ-9 或 GAD-7）。')
    : days >= 7
      ? tr('mood_due','距離上次已超過 7 天，可以再做一次追蹤變化。')
      : tr('mood_recent','最近已做過量表，今天可以略過。');
}
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
// 改後（只有使用者點臉譜才算「碰過」）
function selectPain(score, label, silent = false) {
  if (!silent) window.painTouched = true;
  const KEY = {0:'pain_0',2:'pain_2',4:'pain_4',6:'pain_6',8:'pain_8',10:'pain_10'};
  document.getElementById('input-pain').value = score;
  document.getElementById('pain-val-display').innerText =
    `${score} ${tr('pts','分')} - ${tr(KEY[score], label)}`;
  document.querySelectorAll('.face-btn').forEach(btn =>
    btn.classList.toggle('active', parseInt(btn.dataset.value) === score));
}

function nudge(msg, buttons) {
  document.getElementById('nudge')?.remove();
  const box = document.createElement('div');
  box.id = 'nudge';
  box.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:#2c3e50;color:#fff;padding:12px 16px;border-radius:10px;z-index:9999;max-width:90%;box-shadow:0 4px 12px rgba(0,0,0,.25);font-size:14px;';
  box.innerHTML = `<div style="margin-bottom:8px">${msg}</div><div style="display:flex;gap:8px;flex-wrap:wrap"></div>`;
  buttons.forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.textContent = label; b.type = 'button';
    b.style.cssText = 'padding:6px 12px;border:none;border-radius:6px;cursor:pointer;';
    b.onclick = () => { box.remove(); fn && fn(); };
    box.lastElementChild.appendChild(b);
  });
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 15000);
}
window.nudge = nudge;

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
            alertMsg.innerHTML = trf('wx_low_msg',
              '偵測到目前氣壓偏低（<strong>{p} hPa</strong>），今日低氣壓環境可能增加偏頭痛發作機率，請多加注意！',
              { p: currentPressure.toFixed(1) });
                alertBox.style.display = 'block'; // 顯示動態提示框
            }
        } else {
            if (alertBox) alertBox.style.display = 'none'; // 氣壓正常就隱藏
        }
        
        // --- 狀況 B：檢查未來幾小時是否有「氣壓驟降」的風險 ---
        if (drop > 4) {
            if (riskCard && riskText) {
                riskText.innerHTML = trf('wx_drop_msg', '當前氣壓 <strong>{p} hPa</strong>，預計未來幾小時內將急遽下降約 <strong>{d} hPa</strong>。<br>氣壓快速變動是引發偏頭痛的高風險因子！',
                { p: currentPressure.toFixed(1), d: drop.toFixed(1) });
                riskCard.classList.remove('hidden'); // 顯示風險卡片
            }
        } else {
            if (riskCard) riskCard.classList.add('hidden'); // 沒風險就隱藏
        }
        
    } catch (error) {
        console.error("無法取得氣象預報資料", error);
    }
}
function updateStepBadges() {
  const done = {
    'pane-headache': !!window.currentDiaryId || window.painTouched,
    'pane-mood':     (window.sessionQuizLogs || []).length > 0,
    'pane-symptom':  [...document.querySelectorAll('#pane-symptom input[type=range]')].some(r => r.value !== '1')
                     || !!document.getElementById('triggers')?.value.trim(),
    'pane-band':     ['band_heart_rate','band_spo2','band_steps','band_avg_steps']
                     .some(id => document.getElementById(id)?.value)
  };
  Object.entries(done).forEach(([id, ok]) => {
    document.querySelectorAll(`[data-badge="${id}"]`).forEach(b => {
      b.textContent = ok ? '✓' : '○';
      b.classList.toggle('done', ok);
    });
  });
  const n = Object.values(done).filter(Boolean).length;
  const info = document.getElementById('step-progress');
  if (info) info.textContent = `${n}/4`;
}
window.updateStepBadges = updateStepBadges;
document.addEventListener('input', updateStepBadges);
document.addEventListener('click', () => setTimeout(updateStepBadges, 50));
function askPainAfter() {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9999;display:flex;align-items:center;justify-content:center;';
  box.innerHTML = `<div style="background:#fff;padding:20px;border-radius:12px;max-width:340px;text-align:center">
    <h3 style="margin:0 0 6px">${tr('after_title','聽完音樂，現在疼痛幾分？')}</h3>
    <p style="font-size:12px;color:#777;margin:0 0 12px">${tr('after_hint','0 = 不痛，10 = 劇痛。可以略過。')}</p>
    <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
      ${[0,1,2,3,4,5,6,7,8,9,10].map(n => `<button type="button" data-n="${n}" style="width:40px;height:40px;border-radius:50%;border:1px solid #ccc;background:#fff;cursor:pointer">${n}</button>`).join('')}
    </div>
    <button type="button" id="after-skip" style="margin-top:12px;border:none;background:none;color:#888;cursor:pointer">${tr('after_skip','略過')}</button>
  </div>`;
  document.body.appendChild(box);
  box.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
    window.painAfter = Number(b.dataset.n);
    box.remove();
    window.syncDiaryExtras?.();
  });
  box.querySelector('#after-skip').onclick = () => box.remove();
}

function tr(key, zh) { return currentLang === 'en' ? (langDict.en[key] ?? zh) : zh; }
window.tr = tr;
function setLang(code) {
  const en = (code === 'en');
  currentLang = en ? 'en' : 'zh-TW';
  document.documentElement.lang = currentLang;
  const dict = langDict.en;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.dataset.zh === undefined) el.dataset.zh = el.innerHTML;
    const v = dict[el.dataset.i18n];
    el.innerHTML = en ? (v ?? el.dataset.zh) : el.dataset.zh;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    if (el.dataset.zhPh === undefined) el.dataset.zhPh = el.placeholder;
    const v = dict[el.dataset.i18nPh];
    el.placeholder = en ? (v ?? el.dataset.zhPh) : el.dataset.zhPh;
  });
  document.querySelectorAll('.lang-switch .lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === (en ? 'en' : 'zh')));

  window.myCalendar?.setOption('locale', en ? 'en' : 'zh-tw');
  window.myCalendar?.refetchEvents();
  window.QuizTrend?.render();
  window.Quiz?.refreshLang();
  if (typeof renderMusicCards === 'function' && !window.isMusicActive?.()) renderMusicCards();
  const p = document.getElementById('input-pain')?.value;
  if (p !== undefined) {
    const lbl = {0:'不痛',2:'輕微疼痛',4:'稍微疼痛',6:'中度疼痛',8:'嚴重疼痛',10:'劇烈疼痛'}[p];
    if (p === '') document.getElementById('pain-val-display').innerText = tr('pain_unset','尚未選擇');
    else if (lbl) selectPain(Number(p), lbl, true);   // true = 不算使用者操作

  }
      if (typeof initSymptomOptions === 'function') {
    initSymptomOptions(document.getElementById('categorySelect')?.value || 'all');
  }
  if (typeof updateSaveButtonLabel === 'function') updateSaveButtonLabel();
  if (typeof updateStepBadges === 'function') updateStepBadges();
}
window.setLang = setLang;

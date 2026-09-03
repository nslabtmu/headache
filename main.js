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
        
        //  // ✅ 第2步：背景非同步查詢氣象（不阻塞位置顯示）
        fetchWeather(data.latitude, data.longitude, "IP 定位成功");
        
    } catch (err) {
        console.error("IP Location Error:", err);
        if (statusEl) statusEl.innerText = "❌ 無法定位，請手動選擇";
        
        // ✅ 失敗時也顯示卡片
        updateLocationDisplay("未知", "無法取得", "請變更位置重試");
        
        // 展開選擇面板
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
                }
            } catch (e) {
                console.warn("反查失敗，用座標代替");
                updateLocationDisplay("未知", `${lat.toFixed(2)}`, `${lon.toFixed(2)}`);
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
/**
 * 統一頁籤切換函式
 * @param {Event|string} target - 可傳入 DOM Event 或 頁籤名稱/ID (例如: 'headache' 或 'pane-headache')
 * @param {string} [explicitTabId] - 可選，若第一個參數為 Event，此參數代表目標 DOM ID
 * @param {string} [contentClass='tab-pane'] - 頁籤內容區塊的 CSS class
 * @param {string} [buttonClass='tab-btn'] - 頁籤按鈕的 CSS class
 */
function switchTab(target, explicitTabId, contentClass = 'tab-pane', buttonClass = 'tab-btn') {
    let tabKey = '';
    let eventObj = null;

    // 1. 解析傳入參數，判斷呼叫型態
    if (target && typeof target === 'object' && target.preventDefault) {
        // 型態 A: switchTab(event, 'pane-headache') 或 switchTab(event, 'headache')
        eventObj = target;
        tabKey = explicitTabId;
    } else if (typeof target === 'string') {
        // 型態 B: switchTab('headache') 或 switchTab('pane-headache')
        tabKey = target;
    } else if (explicitTabId && typeof explicitTabId === 'string') {
        tabKey = explicitTabId;
    }

    if (!tabKey) return;

    // 2. 格式化識別碼 (確保格式為 'pane-xxx' 與單純的 'xxx' 兩種 Key)
    const cleanKey = tabKey.replace(/^pane-/, '');
    const targetPaneId = `pane-${cleanKey}`;

    // 3. 隱藏所有頁籤內容，並顯示目標頁籤
    document.querySelectorAll(`.${contentClass}`).forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });

    const targetPane = document.getElementById(targetPaneId) || document.getElementById(tabKey);
    if (targetPane) {
        targetPane.classList.remove('hidden');
        targetPane.classList.add('active');
    }

    // 4. 更新按鈕高亮狀態 (UI 狀態同步)
    document.querySelectorAll(`.${buttonClass}`).forEach(btn => {
        btn.classList.remove('active');
        
        // 自動判斷點擊事件或比對按鈕的 data/onclick 屬性
        if (eventObj && eventObj.currentTarget && btn === eventObj.currentTarget) {
            btn.classList.add('active');
        } else {
            const btnOnClick = btn.getAttribute('onclick') || '';
            const btnDataTab = btn.getAttribute('data-tab') || '';
            if (btnDataTab === cleanKey || btnOnClick.includes(`'${cleanKey}'`) || btnOnClick.includes(`'${targetPaneId}'`)) {
                btn.classList.add('active');
            }
        }
    });

    // 5. 若切換至圖表頁 (pane-chart)，自動觸發圖表載入/繪製
    if (cleanKey === 'chart' && typeof renderUserChart === 'function') {
        renderUserChart();
    }
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

// 記得掛載至 window
window.openDisclaimerModal = openDisclaimerModal;
window.closeDisclaimerModal = closeDisclaimerModal;
// 6. 全域掛載，確保 HTML onclick 可以順利呼叫
window.switchTab = switchTab;
window.toggleAccountMenu = toggleAccountMenu;

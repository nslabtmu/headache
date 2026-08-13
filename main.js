// ==================== 1. 全域變數與初始化設定 ====================
const REQUIRE_LOCATION_FOR_SUBMIT = false;
var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let hasEnteredMainApp = false; 
let currentWeather = null;
let chartInstance = null;
let currentLang = 'zh-TW';
let locationReady = false;

// ✅ 修正：定義分頁順序與對應的 Tab 名稱陣列，供 navigate() 使用
const pageOrder = ['pane-headache', 'pane-symptoms', 'pane-band', 'pane-chart', 'pane-profile'];
const tabNames = ['headache', 'symptom', 'band', 'chart', 'profile'];

// 網頁載入完成時執行
// 1. 頁面載入時，自動偵測登入狀態與同意狀態
window.addEventListener('DOMContentLoaded', async () => {
    initTaiwanSelect();
    const hasAgreed = localStorage.getItem('has_agreed_consent')==='true';
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // 使用者已登入，檢查是否同意過條款
        if (hasAgreed) {
            hasEnteredMainApp = true;
            showMainApp(session.user);
        } else {
            // 已登入但尚未同意（可能是剛重新整理），顯示同意書
            showConsent();
        }
    } else if (hasAgreed) {
        // 未登入，顯示登入畫面
        showLogin();
    } else {
        showConsent();
    }
});
// ==================== 2. 登入狀態與頁面載入監聽 ====================

// ✅ 唯一的登入狀態即時監聽
supabase.auth.onAuthStateChange((event, session) => {
    console.log("偵測到登入狀態變更:", event);

    if (session && !hasEnteredMainApp) {
        hasEnteredMainApp = true;
        showMainApp(session.user);
    } else if (!session) {
        hasEnteredMainApp = false;
    }
});


// ✅ 唯一的網頁載入初始化
/*document.addEventListener("DOMContentLoaded", () => {
    initTaiwanSelect();

    // 檢查同意狀態
    if (localStorage.getItem('has_agreed_consent') === 'true') {
        document.getElementById('consent-card').classList.add('hidden');
        document.getElementById('auth-card').classList.remove('hidden');
    }

    // 檢查現有 Session
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && !hasEnteredMainApp) {
            hasEnteredMainApp = true;
            document.getElementById('consent-card').classList.add('hidden');
            document.getElementById('auth-card').classList.add('hidden');
            document.getElementById('main-card').classList.remove('hidden');
            showMainApp(session.user);
        }
    });
});*/


// ==================== 3. 認證與同意書流程 ====================

function agreeConsent() {
    localStorage.setItem('has_agreed_consent', 'true');
    document.getElementById('consent-card').classList.add('hidden');
    document.getElementById('auth-card').classList.remove('hidden');
    // 當使用者成功登入或同意後，應該要執行這行：
document.getElementById('resetConsentBtn').classList.remove('hidden');
}

function disagreeConsent() {
    alert("很抱歉，若您不同意研究參與，將無法使用本系統進行紀錄。");
}

async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) {
        alert("Google 登入失敗：" + error.message);
        console.error(error);
    }
}

async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("登出發生錯誤:", error.message);
    }

    localStorage.removeItem('has_agreed_consent');
    //hasEnteredMainApp = false;
    //window.location.href = window.location.origin + window.location.pathname;
    // 直接重新整理，因為 DOMContentLoaded 會自動執行偵測邏輯
    window.location.reload();
}

// ==================== 4. 導覽、頁籤與翻頁邏輯 (修正上下頁無反應) ====================

function showPane(paneId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    const targetPane = document.getElementById(paneId);
    if (targetPane) {
        targetPane.classList.remove('hidden');
    }
}

function navigate(direction) {
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (direction > 0) {
        alert("已到達最後一頁");
    } else {
        alert("已到達第一頁");
    }
}

function switchTab(tabName) {
    const panes = {
        profile: document.getElementById('pane-profile'),
        headache: document.getElementById('pane-headache'),
        symptom: document.getElementById('pane-symptoms'),
        band: document.getElementById('pane-band'),
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
    
    Object.values(panes).forEach(p => { if (p) p.classList.add('hidden'); });
    Object.values(btns).forEach(b => { if (b) b.classList.remove('active'); });
    
    if (emergencySection) emergencySection.style.display = 'none';
    
    if (panes[tabName]) panes[tabName].classList.remove('hidden');
    if (btns[tabName]) btns[tabName].classList.add('active');
    
    if (tabName === 'headache' || tabName === 'symptom') {
        if (emergencySection) emergencySection.style.display = 'block';
    }
    
    const mobileSelect = document.getElementById('mobile-tab-select');
    if (mobileSelect) mobileSelect.value = tabName;
    document.body.setAttribute('data-active-tab', tabName);
}


// ==================== 5. 定位與氣象功能 ====================

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

async function fetchIpLocation(statusEl) {
    try {
        if (statusEl) statusEl.innerText = "⏳ 查詢中...";
        const res = await fetch('https://ipapi.co/json/');
        const ipData = await res.json();
        
        if (ipData.latitude && ipData.longitude) {
            fetchWeather(ipData.latitude, ipData.longitude, `成功 (${ipData.city || '未知城市'})`);
        } else {
            throw new Error("無法取得位置資訊");
        }
    } catch (err) {
        if (statusEl) statusEl.innerText = "⚠️ 無法取得位置資訊";
        locationReady = false;
        console.error("位置資訊錯誤：", err);
        const manualBox = document.getElementById('manual-location-box');
        if (manualBox) manualBox.style.display = 'block';
    }
}

async function fetchWeather(lat, lon, successMsg) {
    const statusEl = document.getElementById('weather-status');
    try {
        const weatherParams = ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day', 'precipitation', 'rain', 'showers', 'snowfall', 'weather_code', 'cloud_cover', 'pressure_msl', 'surface_pressure', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'].join(',');
        const airParams = ['pm10', 'pm2_5', 'carbon_monoxide', 'nitrogen_dioxide', 'sulphur_dioxide', 'ozone', 'aerosol_optical_depth', 'dust', 'uv_index', 'uv_index_clear_sky', 'ammonia', 'methane', 'european_aqi', 'us_aqi'].join(',');

        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${weatherParams}`;
        const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=${airParams}`;

        const [weatherRes, airRes] = await Promise.all([fetch(weatherUrl), fetch(airUrl)]);
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

function requestBrowserGPS() {
    const statusEl = document.getElementById('weather-status');
    if (navigator.geolocation) {
        statusEl.innerText = "⏳ 正在請求 GPS 定位...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                statusEl.innerText = "📍 定位成功";
                document.getElementById('manual-location-box').style.display = 'none';
                fetchWeather(lat, lon,statusEl.innerText);
            },
            () => {
                alert("GPS 定位被拒絕或失敗，請使用下方選項 B 手動選擇台灣地區。");
                statusEl.innerText = "⚠️ 定位失敗，請手動選擇";
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    } else {
        alert("您的瀏覽器不支援地理定位。");
    }
}

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
    document.getElementById('manual-location-box').style.display = 'none';
    document.getElementById('weather-status').innerText = `🇹🇼 已選擇：${city} ${district}`;
    if (typeof getLatLonForTaiwanDistrict === 'function') {
        getLatLonForTaiwanDistrict(city, district);
    } else {
        console.warn("尚未定義 getLatLonForTaiwanDistrict 函式。");
    }
}


// ==================== 6. 個人資料與主應用載入 ====================
function showMainApp(user) {
    document.getElementById('consent-card')?.classList.add('hidden');
    document.getElementById('auth-card')?.classList.add('hidden');
    document.getElementById('main-card')?.classList.remove('hidden');
    document.getElementById('resetConsentBtn')?.classList.remove('hidden');

    initializeI18n();
    getLocationAndWeather();
    displayUserEmail();
    if (user) {
        loadUserProfile(user.id);
        loadUserHistory(user.id);
    }
    switchTab('headache'); // 預設切到第一個分頁
}

function showConsent() {
    document.getElementById('consent-card')?.classList.remove('hidden');
    document.getElementById('auth-card')?.classList.add('hidden');
    document.getElementById('main-card')?.classList.add('hidden');
}

function showLogin() {
    document.getElementById('consent-card')?.classList.add('hidden');
    document.getElementById('auth-card')?.classList.remove('hidden');
    document.getElementById('main-card')?.classList.add('hidden');
}

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

function setProfileFieldsDisabled(disabled) {
    const fields = ['prof_nickname', 'prof_birthyear', 'prof_gender', 'prof_tbi', 'prof_sport'];
    fields.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.disabled = disabled;
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

async function saveAllResearchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("請先登入！"); return; }

    const profileData = {
        user_id: user.id,
        nickname: document.getElementById('prof_nickname').value.trim(),
        birth_year: Number(document.getElementById('prof_birthyear').value) || null,
        gender: document.getElementById('prof_gender').value,
        tbi_study: document.getElementById('prof_tbi').value,
        sport_freq: document.getElementById('prof_sport').value
    };

    const { error } = await supabase.from('profiles').upsert([profileData], { onConflict: 'user_id' });

    if (error) {
        alert("❌ 儲存個人資料失敗：" + error.message);
        console.error(error);
    } else {
        alert("✅ 個人基本資料已成功儲存！");
        enterProfileViewMode();
    }
}


// ==================== 7. 紀錄與圖表功能 ====================

function updateVal(slider) {
    const nextElement = slider.nextElementSibling;
    if (nextElement) nextElement.innerText = slider.value;
}

function toggleMedicationName() {
    const select = document.getElementById('input-medication');
    const input = document.getElementById('input-medication-name');
    if (select && input) {
        input.style.display = (select.value === 'yes') ? 'block' : 'none';
        if (select.value !== 'yes') input.value = '';
    }
}

function checkEmergency() {
    const checkboxes = document.querySelectorAll('.emg-check');
    const warningBox = document.getElementById('emergencyWarning');
    const submitBtn = document.getElementById('submitBtn');
    let isChecked = false;
    checkboxes.forEach(cb => { if (cb && cb.checked) isChecked = true; });
    if (warningBox) warningBox.style.display = isChecked ? 'block' : 'none';
    if (submitBtn) submitBtn.disabled = isChecked;
}

async function saveFullRecord() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("請先登入！"); return; }

    const profileData = {
        nickname: document.getElementById('prof_nickname').value.trim(),
        birth_year: Number(document.getElementById('prof_birthyear').value) || null,
        gender: document.getElementById('prof_gender').value,
        tbi_study: document.getElementById('prof_tbi').value,
        sport_freq: document.getElementById('prof_sport').value
    };

    const headacheData = {
        pain_level: document.getElementById('input-pain').value || null,
        pain_locations: Array.from(document.querySelectorAll('input[name="pain_location"]:checked')).map(el => el.value),
        medication_used: document.getElementById('input-medication').value,
        medication_name: document.getElementById('input-medication-name').value || null,
        notes: document.getElementById('input-content').value || null
    };

    const symptomsData = {};
    for (let i = 1; i <= 10; i++) {
        const slider = document.querySelector(`input[name="sym${i}"]`);
        if (slider) symptomsData[`sym_${i}`] = Number(slider.value);
    }
    symptomsData.triggers = document.getElementById('triggers').value.trim() || "無";

    const healthData = {
        heart_rate: Number(document.getElementById('band_heart_rate').value) || null,
        spo2: Number(document.getElementById('band_spo2').value) || null,
        steps: Number(document.getElementById('band_steps').value) || null,
        avg_steps: Number(document.getElementById('band_avg_steps').value) || null
    };

    const payload = {
        user_id: user.id,
        user_email: user.email,
        profile_data: profileData,
        headache_data: headacheData,
        symptoms_data: symptomsData,
        health_data: healthData,
        weather_data: currentWeather || { note: "未取得" }
    };

    const { error } = await supabase.from('user_data').insert([payload]);

    if (error) {
        alert("❌ 儲存失敗：" + error.message);
        console.error(error);
    } else {
        alert("✅ 今日研究日誌與數據已成功送出！");
        loadUserHistory(user.id);
    }
}

async function loadUserHistory(userId) {
    const { data } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(30);
    
    if (!data || data.length === 0) return;

    const labels = data.map(item => new Date(item.created_at).toLocaleDateString());
    const painScores = data.map(item => (item.symptoms_data && item.symptoms_data.sym_1) ? item.symptoms_data.sym_1 : 0);

    const ctx = document.getElementById('painChart');
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

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
            scales: { y: { min: 1, max: 10 } }
        }
    });
}


// ==================== 8. 多語系支援 ====================

function toggleLanguage() {
    currentLang = (currentLang === 'zh-TW') ? 'en' : 'zh-TW';
    document.documentElement.lang = currentLang;
    
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
// 切換手動定位面板的展開與收合
function toggleManualLocationBox() {
    const box = document.getElementById('manual-location-box');
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'block';
        // 如果縣市下拉選單還沒初始化，可以在這裡初始化一次
        if (typeof initCitySelect === 'function' && document.getElementById('select-city').options.length <= 1) {
            initCitySelect(); 
        }
    } else {
        box.style.display = 'none';
    }
}

// 當成功取得位置與氣象資料時的處理
function onWeatherSuccess(cityName, districtName, weatherDesc) {
    const statusDiv = document.getElementById('weather-status');
    statusDiv.innerHTML = `🌤️ 目前位置：<b>${cityName}${districtName}</b> | 氣象：${weatherDesc}`;
    
    // 成功後自動隱藏手動面板
    document.getElementById('manual-location-box').style.display = 'none';
}

// 當氣象或定位失敗時的處理
function onWeatherError(errorMsg) {
    const statusDiv = document.getElementById('weather-status');
    statusDiv.innerHTML = `⚠️ 氣象資料取得失敗 (${errorMsg})，請手動指定位置：`;
    
    // 失敗時主動展開手動面板，方便使用者修正
    document.getElementById('manual-location-box').style.display = 'block';
}
function toggleOptionalHealthData() {
    const box = document.getElementById('optional-health-box');
    const arrow = document.getElementById('toggle-arrow');
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'block';
        arrow.innerHTML = '▲ 收合';
    } else {
        box.style.display = 'none';
        arrow.innerHTML = '▼ 展開';
    }
}
async function displayUserEmail() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.email) {
        document.getElementById('user-email').innerText = user.email;
    } else {
        document.getElementById('user-email').innerText = "未登入";
    }
}
function resetConsent() {
    localStorage.removeItem('has_agreed_consent');
    window.location.reload();
}

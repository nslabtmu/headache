// 在 main.js 最上面加入
async function getNetworkTime() {
    const apis = [
        'https://timeapi.io/api/Time/current/timezone?timeZone=Asia/Taipei',
        'https://worldtimeapi.org/api/ip',
        'https://www.google.com'  // 備用：讀 HTTP Header
    ];

    for (let api of apis) {
        try {
            console.log('嘗試連接時間 API:', api);
            const response = await fetch(api, { method: 'GET' });
            if (!response.ok) continue;

            const data = await response.json();
            // 解析兩種不同 API 的 ISO 時間格式
            const isoString = data.datetime || data.dateTime; 
            if (isoString) {
                const serverTime = new Date(isoString).getTime();
                const clientTime = new Date().getTime();
                console.log('✓ 時間已同步，偏差:', serverTime - clientTime, 'ms');
                return;
            }
        } catch (error) {
            console.log('✗', api, '連接失敗，嘗試下一個');
        }
    }
    console.log('⚠️ 所有時間 API 都無法連接，改用本地系統時間');
}

// 頁面載入時執行
window.addEventListener('DOMContentLoaded', function() {
    getNetworkTime();
});

// ==================== 1. 全域變數與初始化設定 ====================
const REQUIRE_LOCATION_FOR_SUBMIT = false;

var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let hasEnteredMainApp = false;
let currentWeather = null;
let chartInstance = null;
let currentLang = 'zh-TW';
let locationReady = false;
let hasSavedProfile = false;




// ✅ 同意書版本號：改版時只要改這一個地方
// PDF 檔名請對應命名為 consent_v{版本號}.pdf，例如 consent_v1.0.pdf、consent_v1.1.pdf
const CONSENT_VERSION = '4';
const CONSENT_PDF_URL = `./consent_v${CONSENT_VERSION}.pdf`;

const pdfFrame = document.getElementById('pdfFrame');
const pdfLink = document.getElementById('pdfDownloadLink');
if (pdfFrame) pdfFrame.src = CONSENT_PDF_URL;
if (pdfLink) pdfLink.href = CONSENT_PDF_URL;



// 分頁順序與對應的 Tab 名稱陣列，供 navigate() 使用
const pageOrder = ['pane-headache', 'pane-symptoms', 'pane-band', 'pane-chart', 'pane-profile'];
const tabNames = ['headache', 'symptom', 'band', 'chart', 'profile'];

// ==================== 2. 頁面載入時的初始化 ====================

window.addEventListener('DOMContentLoaded', async () => {
    initTaiwanSelect();

    // 動態設定同意書 PDF 路徑（跟著 CONSENT_VERSION 自動變動，不用手動改兩個地方）
    const pdfFrame = document.getElementById('pdfFrame');
    if (pdfFrame) {
        pdfFrame.src = CONSENT_PDF_URL;
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // 已登入：真正查資料庫，確認是否同意過「目前版本」（跨裝置也準確）
        const isValid = await hasValidConsentFromDB(session.user.id);
        if (isValid) {
            hasEnteredMainApp = true;
            showMainApp(session.user);
        } else {
            await showConsent(session);
        }
    } else {
        // 尚未登入：還不知道使用者是誰，先用 localStorage 做初步判斷
        const status = getConsentStatus();
        if (status.isValid) {
            showLogin();
        } else {
            await showConsent(null);
        }
    }
});

// ==================== 3. 登入狀態監聽 ====================

supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("偵測到登入狀態變更:", event);

    if (session && !hasEnteredMainApp) {
        hasEnteredMainApp = true;

        // 補寫入同意紀錄（常發生在「先同意才登入」的流程，這時第一次真正知道 user_id）
        const status = getConsentStatus();
        if (status.isValid) {
            await writeConsentRecordIfNeeded(session.user, true);
        }

        showMainApp(session.user);
    } else if (!session) {
        hasEnteredMainApp = false;
    }
});

// ==================== 4. 同意書：狀態判斷 ====================

// 查 localStorage，用於「還沒登入時」的初步判斷（速度快，不用等網路）
function getConsentStatus() {
    const agreed = localStorage.getItem('has_agreed_consent') === 'true';
    const agreedVersion = localStorage.getItem('agreed_consent_version');

    return {
        isValid: agreed && agreedVersion === CONSENT_VERSION,
        hasOldVersion: agreed && agreedVersion !== CONSENT_VERSION, // 曾經同意過，但版本不是最新
        oldVersion: agreedVersion || null
    };
}

// 查 Supabase 資料庫，用於「已登入後」的正式判斷（跨裝置準確、含版本比對）
async function hasValidConsentFromDB(userId) {
    const { data, error } = await supabase
        .from('consent_records')
        .select('consent_version, agreed')
        .eq('user_id', userId)
        .order('agreed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return false;
    return data.agreed === true && data.consent_version === CONSENT_VERSION;
}

// ==================== 5. 同意書：寫入資料庫 ====================

async function writeConsentRecord(user, agreed) {
    const { error } = await supabase.from('consent_records').insert([{
        user_id: user?.id || null,
        user_email: user?.email || null,
        consent_version: CONSENT_VERSION,
        agreed: agreed,
        agreed_at: new Date().toISOString()
    }]);

    if (error) {
        console.error('同意紀錄寫入失敗：', error);
    }
    return !error;
}

// 避免重複寫入：先查資料庫有沒有「這個人 + 這個版本 + 同意」的紀錄，沒有才寫入
async function writeConsentRecordIfNeeded(user, agreed) {
    const { data, error } = await supabase
        .from('consent_records')
        .select('id')
        .eq('user_id', user.id)
        .eq('consent_version', CONSENT_VERSION)
        .eq('agreed', agreed)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('查詢同意紀錄失敗：', error);
        return;
    }

    if (!data) {
        await writeConsentRecord(user, agreed);
    }
}

// ==================== 6. 認證與同意書流程 ====================

async function agreeConsent() {
    // 先寫 localStorage，讓畫面能立即切換，不用等網路
    localStorage.setItem('has_agreed_consent', 'true');
    localStorage.setItem('agreed_consent_version', CONSENT_VERSION);

    // 如果這時候已經有登入 session（例如重新同意的情境），直接寫入資料庫
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
        await writeConsentRecordIfNeeded(session.user, true);
    }

    document.getElementById('consent-card').classList.add('hidden');
    document.getElementById('auth-card').classList.remove('hidden');
}

async function disagreeConsent() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
        await writeConsentRecordIfNeeded(session.user, false);
    }
    alert("很抱歉，若您不同意研究參與，將無法使用本系統進行紀錄。");
}

async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname,
            queryParams: {
                prompt: 'select_account' // 強制每次都顯示帳號選擇畫面
            }
        }
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
    localStorage.removeItem('agreed_consent_version');
    window.location.reload();
}

function resetConsent() {
    localStorage.removeItem('has_agreed_consent');
    localStorage.removeItem('agreed_consent_version');
    window.location.reload();
}

// ==================== 7. 畫面切換 ====================

// session 傳入時（已登入），會去資料庫查是否為「同意過舊版本」，顯示對應提示
// session 為 null 時（尚未登入），只能用 localStorage 概略判斷
async function showConsent(session) {
    document.getElementById('consent-card')?.classList.remove('hidden');
    document.getElementById('auth-card')?.classList.add('hidden');
    document.getElementById('main-card')?.classList.add('hidden');

    let hasOldVersion = false;

    if (session && session.user) {
        const { data } = await supabase
            .from('consent_records')
            .select('consent_version')
            .eq('user_id', session.user.id)
            .eq('agreed', true)
            .order('agreed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        hasOldVersion = !!(data && data.consent_version !== CONSENT_VERSION);
    } else {
        hasOldVersion = getConsentStatus().hasOldVersion;
    }

    const noticeEl = document.getElementById('consent-update-notice');
    if (noticeEl) {
        if (hasOldVersion) {
            noticeEl.classList.remove('hidden');
            noticeEl.innerText = `📢 研究同意書已更新至最新版本（v${CONSENT_VERSION}），請重新閱讀並確認是否同意繼續參與研究。`;
        } else {
            noticeEl.classList.add('hidden');
        }
    }
}

function showLogin() {
    document.getElementById('consent-card')?.classList.add('hidden');
    document.getElementById('auth-card')?.classList.remove('hidden');
    document.getElementById('main-card')?.classList.add('hidden');
}

function showMainApp(user) {
    document.getElementById('consent-card')?.classList.add('hidden');
    document.getElementById('auth-card')?.classList.add('hidden');
    document.getElementById('main-card')?.classList.remove('hidden');

    initializeI18n();
    getLocationAndWeather();
    displayUserEmail();
    if (user) {
        loadUserProfile(user.id);
        loadUserHistory(user.id);
    }
    switchTab('headache'); // 預設切到第一個分頁
}

// ==================== 8. 導覽、頁籤與翻頁邏輯 ====================

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

// ==================== 9. 定位與氣象功能 ====================

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
    const locationEl = document.getElementById('current-location-text');
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
        if (locationEl) locationEl.innerText = "無法取得";
        locationReady = false;
        console.error("位置資訊錯誤：", err);
        const manualBox = document.getElementById('manual-location-box');
        if (manualBox) manualBox.style.display = 'block';
    }
}

async function fetchWeather(lat, lon, successMsg) {
    const statusEl = document.getElementById('weather-status');
    const locationEl = document.getElementById('current-location-text');
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
        if (locationEl) locationEl.innerText = successMsg;
        const detailEl = document.getElementById('weather-detail');
        if (detailEl) {
            const w = currentWeather.weather;
            const a = currentWeather.air_quality;
            detailEl.innerText = `🌡️ ${w.temperature_2m}°C・💧 濕度 ${w.relative_humidity_2m}%・🔽 氣壓 ${w.pressure_msl} hPa・🌫️ PM2.5: ${a.pm2_5}`;
        }

        
    } catch (err) {
        if (statusEl) statusEl.innerText = "⚠️ 氣象資料解析失敗";
        if (locationEl) locationEl.innerText = "取得失敗";
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
                document.getElementById('manual-location-box').style.display = 'none';
                fetchWeather(lat, lon, "定位成功");
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

// ==================== 10. 個人資料 ====================

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
        hasSavedProfile = true;
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

// ==================== 11. 紀錄與圖表功能 ====================

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

function validateForm() {
    const errors = [];

    const painLevel = document.getElementById('input-pain').value;
    if (!painLevel) {
        errors.push("請選擇「頭痛程度」");
    }

    const painLocations = document.querySelectorAll('input[name="pain_location"]:checked');
    if (painLocations.length === 0) {
        errors.push("請至少勾選一個「頭痛部位」");
    }

    const medication = document.getElementById('input-medication').value;
    if (!medication) {
        errors.push("請選擇「是否用藥」");
    }
    if (medication === 'yes') {
        const medName = document.getElementById('input-medication-name').value.trim();
        if (!medName) {
            errors.push("已選擇用藥，請填寫「藥物名稱」");
        }
    }

    if (!hasSavedProfile) {
        const birthyear = document.getElementById('prof_birthyear').value;
        const gender = document.getElementById('prof_gender').value;
        const tbi = document.getElementById('prof_tbi').value;
        const sport = document.getElementById('prof_sport').value;

        if (!birthyear) errors.push("請填寫「個人基本資料」中的出生年");
        if (!gender) errors.push("請選擇「個人基本資料」中的性別");
        if (!tbi) errors.push("請選擇「個人基本資料」中是否參與輕度腦外傷研究");
        if (!sport) errors.push("請選擇「個人基本資料」中的運動頻率");
    }

    return errors;
}

async function saveFullRecord() {
    const errors = validateForm();
    if (errors.length > 0) {
        alert("⚠️ 請完成以下必填項目後再送出：\n\n• " + errors.join("\n• "));
        return;
    }
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

// ==================== 12. 多語系支援 ====================

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

// ==================== 13. 其他 UI 輔助功能 ====================

function toggleManualLocationBox() {
    const box = document.getElementById('manual-location-box');
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'block';
        if (typeof initCitySelect === 'function' && document.getElementById('select-city').options.length <= 1) {
            initCitySelect();
        }
    } else {
        box.style.display = 'none';
    }
}

function onWeatherSuccess(cityName, districtName, weatherDesc) {
    const statusDiv = document.getElementById('weather-status');
    statusDiv.innerHTML = `🌤️ 目前位置：<b>${cityName}${districtName}</b> | 氣象：${weatherDesc}`;
    document.getElementById('manual-location-box').style.display = 'none';
}

function onWeatherError(errorMsg) {
    const statusDiv = document.getElementById('weather-status');
    statusDiv.innerHTML = `⚠️ 氣象資料取得失敗 (${errorMsg})，請手動指定位置：`;
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

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
    const menu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('user-dropdown');
    if (menu && dropdown && !menu.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

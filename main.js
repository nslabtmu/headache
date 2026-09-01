    const REQUIRE_LOCATION_FOR_SUBMIT = false; //如果要鎖定位置要改true//////////////////////////

    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentWeather = null;
    let chartInstance = null;
    let currentLang = 'zh-TW';
    let locationReady = false;

    const pageOrder = ['pane-profile', 'pane-headache', 'pane-symptoms', 'pane-band'];

// 初始化監聽與狀態確認
document.addEventListener('DOMContentLoaded', () => {
    // 使用 Supabase 狀態監聽器，無論是重新整理還是 OAuth 跳轉回來的登入成功，都能完美捕捉
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            // 已登入：顯示主畫面
            showMainApp(session.user);
        } else {
            // 未登入：回到同意書/登入流程
            showAuthFlow();
        }
    });
});

//========= 頁籤切換與導覽控制 =======
  function switchTab(tabName) {
    // 統一 ID 命名為復數形式，請確保 HTML 中的 ID 也是 pane-symptoms, pane-headache 等
    const panes = {
        profile: document.getElementById('pane-profile'),
        headache: document.getElementById('pane-headache'),
        symptom: document.getElementById('pane-symptom'), 
        band: document.getElementById('pane-band'),
        chart: document.getElementById('pane-chart')
    };
    
    // 隱藏所有
    Object.values(panes).forEach(p => {
        if(p) p.classList.add('hidden');
    });

    // 顯示目標
   if (panes[tabName]) {
        panes[tabName].classList.remove('hidden');
    }

    // 同步更新按鈕 active 狀態 (選填優化)
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-tab-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');
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
        // 映射至 switchTab 相對應的 key
        const keyMap = { profile: 'profile', headache: 'headache', symptoms: 'symptom', band: 'band' };
        switchTab(keyMap[tabKey] || tabKey);
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
    // ✅ 新增：檢查使用者是否已登入
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
        showMainApp(session.user);  // 直接進入主應用
    }
}

async function handleGoogleLogin() {
        const redirectUrl = window.location.origin + window.location.pathname;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: redirectUrl }
        });
        if (error) alert("Google 登入失敗：" + error.message);
    }
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert("登出失敗：" + error.message);
    } else {
        // 登出後清理畫面狀態並刷頁
        window.location.href = window.location.origin + window.location.pathname;
    }
}

// 顯示主應用介面 (登入後)
function showMainApp(user) {
    // 1. 隱藏登入頁與同意書
    const consentCard = document.getElementById('consent-card');
    const authCard = document.getElementById('auth-card');
    if (consentCard) consentCard.classList.add('hidden');
    if (authCard) authCard.classList.add('hidden');

    // 2. 顯示主內容卡片
    const mainCard = document.getElementById('main-card');
    if (mainCard) mainCard.classList.remove('hidden');

    // 3. 預設顯示第一個頁簽 (個人資料)
    switchTab('profile');

    // 4. 顯示右上角使用者帳號資訊
    const userEmailText = document.getElementById('user-email-text');
    const userEmail = document.getElementById('user-email');
    const userInfoBar = document.getElementById('user-info-bar');
    if (userEmailText) userEmailText.innerText = user.email;
    if (userEmail) userEmail.innerText = user.email;
    if (userInfoBar) userInfoBar.classList.remove('hidden');

    // 5. 載入資料與氣象
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
    
    // 預設顯示同意書 (若已同意過可切換顯示 authCard)
    if (consentCard) consentCard.classList.remove('hidden');
    if (authCard) authCard.classList.add('hidden');
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

async function fetchWeather(lat, lon, successMsg) {
    const statusEl = document.getElementById('weather-status');
    try {
        // 15 項氣象參數
        const weatherParams = [
            'temperature_2m','relative_humidity_2m','apparent_temperature','is_day',
            'precipitation','rain','showers','snowfall','weather_code','cloud_cover',
            'pressure_msl','surface_pressure','wind_speed_10m','wind_direction_10m','wind_gusts_10m'
        ].join(',');

        // 14 項空污參數
        const airParams = [
            'pm10','pm2_5','carbon_monoxide','nitrogen_dioxide','sulphur_dioxide','ozone',
            'aerosol_optical_depth','dust','uv_index','uv_index_clear_sky',
            'ammonia','methane','european_aqi','us_aqi'
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
        statusEl.innerHTML = `📍 ${successMsg}！氣象與空污數據同步完成`;
    } catch (err) {
        statusEl.innerText = "⚠️ 氣象資料解析失敗";
        currentWeather = { lat, lon, fetched_at: new Date().toISOString(), weather: {}, air_quality: {} };
        locationReady = true;
    }
}
// ==================== 表單互動與檢查 ==
function updateVal(slider) { 
    if (slider.nextElementSibling) slider.nextElementSibling.innerText = slider.value; 
}
    function checkEmergency() {
        const checkboxes = document.querySelectorAll('.emg-check');
        const warningBox = document.getElementById('emergencyWarning');
        const submitBtn = document.getElementById('submitBtn');
        let isChecked = false;
        checkboxes.forEach(cb => { if (cb.checked) isChecked = true; });
        if (isChecked) { warningBox.style.display = 'block'; submitBtn.disabled = true; }
        else { warningBox.style.display = 'none'; submitBtn.disabled = false; }
    }
   // ==================== 統一整合資料儲存 (核心) ==
async function saveAllResearchData() {
    if (REQUIRE_LOCATION_FOR_SUBMIT && !locationReady) {
        alert("⚠️ 尚未取得定位資訊，無法送出！");
        return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("請先登入！"); return; }
    
        // 1. 抓取頭痛資料
    const painLocations = Array.from(document.querySelectorAll('input[name="pain_location"]:checked')).map(cb => cb.value);
    const headacheData = {
        pain_score: Number(document.getElementById('input-pain')?.value || 0),
        locations: painLocations,
        medication_used: document.getElementById('input-medication')?.value === 'yes',
        medication_name: document.getElementById('input-medication-name')?.value || '',
        notes: document.getElementById('input-content')?.value || ''
    };
    // 1. 打包個人基本資料 JSONB
    //const profileData = {
    //    nickname: document.getElementById('prof_nickname').value.trim(),
    //    birth_year: Number(document.getElementById('prof_birthyear').value) || null,
    //    gender: document.getElementById('prof_gender').value,
    //    tbi_study: document.getElementById('prof_tbi').value,
   //     sport_freq: document.getElementById('prof_sport').value
    //};

    // 2. 打包 10 大症狀與誘因 JSONB (你可以把症狀也放進 health 或獨立，這裡示範放一起或另外開)
    const symptomsData = {};
    for (let i = 1; i <= 10; i++) {
        const slider = document.querySelector(`input[name="sym${i}"]`);
        if (slider) symptomsData[`sym_${i}`] = Number(slider.value);
    }
    symptomsData.triggers = document.getElementById('triggers').value.trim() || "無";

    // 3. 打包手環健康數據 JSONB (包含未來想加的新欄位也可以直接塞在這裡)
    const healthData = {
        heart_rate: Number(document.getElementById('band_heart_rate').value) || null,
        spo2: Number(document.getElementById('band_spo2').value) || null,
        steps: Number(document.getElementById('band_steps').value) || null,
        avg_steps: Number(document.getElementById('band_avg_steps').value) || null
        // 💡 未來想加新欄位？直接在這裡加即可，例如： sleep_hours: 7
    };

    // 4. 組合最終要送進資料庫的 Payload
    const payload = {
        user_id: user.id,
        user_email: user.email,
        //profile_data: profileData,
        headache_data: headacheData,
        symptoms_data: symptomsData, // 包含症狀
        health_data: healthData,     // 包含手環
        weather_data: currentWeather || { note: "未取得" }, // 氣象
        created_at: new Date().toISOString()
    };

    // 5. 寫入 Supabase 的 user_data 資料表
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
        // 優先讀取 headache_data 的分數，若無則讀取症狀 1 的分數
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


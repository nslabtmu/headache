
//<script>
    const REQUIRE_LOCATION_FOR_SUBMIT = false; //如果要鎖定位置要改true//////////////////////////

    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let currentWeather = null;
    let chartInstance = null;
    let currentLang = 'zh-TW';
    let locationReady = false;

    const pageOrder = ['pane-profile', 'pane-headache', 'pane-symptoms', 'pane-band'];

// 初始化監聽與狀態確認
document.addEventListener('DOMContentLoaded', async () => {
    // 檢查使用者是否已登入
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        showMainApp(user);
    }
});
//========= 頁籤切換與導覽控制 =======
  function switchTab(tabName) {
    // 統一 ID 命名為復數形式，請確保 HTML 中的 ID 也是 pane-symptoms, pane-headache 等
    const panes = {
        profile: document.getElementById('pane-profile'),
        headache: document.getElementById('pane-headache'),
        symptom: document.getElementById('pane-symptoms'), // 這裡修正了
        band: document.getElementById('pane-band'),
        chart: document.getElementById('pane-chart')
    };
    
    // 隱藏所有
    Object.values(panes).forEach(p => {
        if(p) p.classList.add('hidden');
    });

    // 顯示目標
    if(panes[tabName]) panes[tabName].classList.remove('hidden');
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
}

    async function handleGoogleLogin() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
        if (error) alert("Google 登入失敗：" + error.message);
    }
    async function handleLogout() {
        await supabase.auth.signOut();
        location.reload(); // 重新整理回到同意書
    }

function showMainApp(user) {
    const mainCard = document.getElementById('main-card');
    if (mainCard) mainCard.classList.remove('hidden');
    
    // 顯示右上角使用者帳號
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









function showPane(paneId) {
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById(paneId).style.display = 'block';
}



function showPane(paneId) {
    // 隱藏所有頁籤
    document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    // 顯示目標頁籤
    document.getElementById(paneId).style.display = 'block';
}
async function saveFullRecord() {
    // 1. 抓取所有症狀滑桿的數值
    const symptomInputs = document.querySelectorAll('#pane-symptom input[type="range"]');
    const symptomsData = {};
    
    symptomInputs.forEach(input => {
        symptomsData[input.name] = input.value;
    });

    // 2. 抓取文字框資料
    symptomsData.triggers = document.getElementById('triggers').value;

    // 3. 準備完整打包物件 (包含 profile, health 等其他頁籤資料)
    const fullPayload = {
        user_id: supabase.auth.user().id, // 確保已登入
        symptoms: symptomsData,
        // profile: {...},
        // health: {...},
        updated_at: new Date().toISOString()
    };

    // 4. 送出資料
    const { data, error } = await supabase
        .from('user_research_data')
        .upsert([fullPayload]);

    if (error) alert("儲存失敗：" + error.message);
    else alert("成功儲存完整紀錄！");
}
 








 
    function setProfileFieldsDisabled(disabled) {
        document.getElementById('prof_nickname').disabled = disabled;
        document.getElementById('prof_birthyear').disabled = disabled;
        document.getElementById('prof_gender').disabled = disabled;
        document.getElementById('prof_tbi').disabled = disabled;
        document.getElementById('prof_sport').disabled = disabled;
    }
 
    function enterProfileViewMode() {
        setProfileFieldsDisabled(true);
        document.getElementById('saveProfileBtn').classList.add('hidden');
        document.getElementById('editProfileBtn').classList.remove('hidden');
    }
 
    function enterProfileEditMode() {
        setProfileFieldsDisabled(false);
        document.getElementById('saveProfileBtn').classList.remove('hidden');
        document.getElementById('editProfileBtn').classList.add('hidden');
    }
 
    function enableProfileEdit() {
        enterProfileEditMode();
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
    function updateVal(slider) { slider.nextElementSibling.innerText = slider.value; }

    function checkEmergency() {
        const checkboxes = document.querySelectorAll('.emg-check');
        const warningBox = document.getElementById('emergencyWarning');
        const submitBtn = document.getElementById('submitBtn');
        let isChecked = false;
        checkboxes.forEach(cb => { if (cb.checked) isChecked = true; });
        if (isChecked) { warningBox.style.display = 'block'; submitBtn.disabled = true; }
        else { warningBox.style.display = 'none'; submitBtn.disabled = false; }
    }

    async function saveAttackForm() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert("請先登入！"); return; }

        const symptoms = {};
        for (let i = 1; i <= 10; i++) {
            const slider = document.querySelector(`input[name="sym${i}"]`);
            if (slider) symptoms[`sym_${i}`] = Number(slider.value);
        }

        const newRecord = {
            user_id: user.id,
            user_email: user.email,
            symptoms: symptoms,
            triggers: document.getElementById('triggers').value.trim() || "無",
            weather: currentWeather || { note: "未取得" }
        };

        const { error } = await supabase.from('user_data').insert([newRecord]);
        if (error) alert("❌ 儲存失敗：" + error.message);
        else { alert("✅ 症狀日記送出成功！"); loadUserHistory(user.id); }
    }

    async function saveBandData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { alert("請先登入！"); return; }

        const smartBandData = {
            heart_rate: Number(document.getElementById('band_heart_rate').value) || null,
            spo2: Number(document.getElementById('band_spo2').value) || null,
            steps: Number(document.getElementById('band_steps').value) || null,
            avg_steps: Number(document.getElementById('band_avg_steps').value) || null
        };

        const newRecord = {
            user_id: user.id,
            user_email: user.email,
            health_data: smartBandData,
            weather: currentWeather || { note: "未取得" }
        };

        const { error } = await supabase.from('user_data').insert([newRecord]);
        if (error) alert("❌ 儲存失敗：" + error.message);
        else { alert("✅ 手環數據送出成功！"); }
    }

    async function loadUserHistory(userId) {
        const { data } = await supabase.from('user_data').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(30);
        if (!data) return;
        const labels = data.map(item => new Date(item.created_at).toLocaleDateString());
        const painScores = data.map(item => item.symptoms?.sym_1 || 0);

        const ctx = document.getElementById('painChart').getContext('2d');
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{ label: '頭痛評分趨勢 (Sym 1)', data: painScores, borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.1)', borderWidth: 2, fill: true }]
            },
            options: { responsive: true, scales: { y: { min: 1, max: 10 } } }
        });
    }
    // 範例：送出資料時的打包方式
async function saveAllResearchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("請先登入！"); return; }

    // 1. 打包個人基本資料 JSONB
    const profileData = {
        nickname: document.getElementById('prof_nickname').value.trim(),
        birth_year: Number(document.getElementById('prof_birthyear').value) || null,
        gender: document.getElementById('prof_gender').value,
        tbi_study: document.getElementById('prof_tbi').value,
        sport_freq: document.getElementById('prof_sport').value
    };

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
        profile_data: profileData,
        symptoms_data: symptomsData, // 包含症狀
        health_data: healthData,     // 包含手環
        weather_data: currentWeather || { note: "未取得" } // 氣象
    };

    // 5. 寫入 Supabase 的 user_data 資料表
    const { error } = await supabase.from('user_data').insert([payload]);

    if (error) {
        alert("❌ 儲存失敗：" + error.message);
    } else {
        alert("✅ 今日研究日誌與數據已成功送出！");
    }
}
//</script>

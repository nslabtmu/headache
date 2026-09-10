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
   /* // 🌟 新增：抓取音樂治療的紀錄與選擇的類型（假設你在全域或變數中有記錄這幾項）
    const musicTherapyData = {
        protocol: window.lastMusicProtocol || "未進行音樂治療",
        start_time: window.lastMusicStartTime || null,
        end_time: window.lastMusicEndTime || null
    };*/
    // 🌟 修正：打包多次累積的音樂治療紀錄陣列
    const musicTherapyData = {
        sessions: window.sessionMusicLogs || [], // 包含所有聽過的清單、開始與結束時間
        total_sessions: window.sessionMusicLogs ? window.sessionMusicLogs.length : 0
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
        music_therapy_data: musicTherapyData,
        created_at: targetDateTime // 🌟 精準寫入你指定的補填日期與時間！
    };

    const { error } = await supabase.from('user_data').insert([payload]);

    if (error) {
        alert("❌ 儲存失敗：" + error.message);
    } else {
        alert("✅ 該筆頭痛日誌已成功儲存！");
        // 🌟 儲存成功後，清空音樂累積陣列，準備迎接下一次紀錄
        window.sessionMusicLogs = [];
        if (typeof loadUserHistory === 'function') {
            loadUserHistory(user.id);
        }
    }
}

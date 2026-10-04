// i18n.js — 多語系字典檔
const langDict = {
    'zh-TW': {
        // 同意書 / 登入
        consent_title: '📄 研究參與同意書', consent_desc: '請詳細閱讀以下研究說明與同意書內容：',
        consent_agree_btn: '我已閱讀並同意參與研究', consent_disagree_btn: '不同意參與',
        login_title: '🔐 系統登入', login_desc: '請使用 Google 帳號授權登入以開始記錄',
        google_login_btn: '使用 Google 帳號快速登入', other_login_btn: '🔐 其他方式',

        // 標題與主頁籤
        form_title: '🩺 症狀與音樂',
        main_record: '📝 記錄區', main_music: '🎵 音樂區', main_chart: '📊 趨勢圖', main_info: '新知區',

        // 帳戶選單
        menu_profile: '👤 個人資料設定', menu_disclaimer: '⚠️ 免責聲明', menu_consent: '📄 重填同意書',
        menu_export: '📥 匯出記錄 (PDF)', menu_logout: '🚪 登出系統',

        // 位置
        loc_change_btn: '🔄 變更位置', loc_picker_title: '📍 選擇位置', loc_confirm: '✅ 確認更新', loc_cancel: '✖️ 取消',
        weather_loading: '⏳ 正在取得氣象數據...',

        // 次頁籤
        tab_headache: '🤕 頭痛', tab_mood: '🩵 心情', tab_symptom: '📝 相關症狀', tab_band: '⌚ 健康資料',

        // 頭痛頁
        headache_title: '🩹 頭痛記錄與症狀評估',
        record_datetime: '📅 記錄日期與時間：', record_hint: '💡 若為補填歷史紀錄，請選擇日期、時間',
        pain_location_label: '📍 點擊頭部圖形或下方按鈕記錄痛點',
        med_question: '💊 本次頭痛發作是否已服用藥物？',
        notes_label: '詳細備註或特殊狀況',
        next_btn: '下一頁', btn_prev_step: '⬅️ 上一步', btn_next_health: '下一步：健康資料 ➔',
        btn_save_record: '💾 儲存當前紀錄',

        // 相關症狀
        sym_1: '1. 持續性頭痛', sym_2: '2. 頭暈、失去平衡或步態不穩', sym_3: '3. 噁心、想吐的感覺',
        sym_4: '4. 疲勞感、睡眠過多或嗜睡', sym_5: '5. 注意力難以集中、記憶變差', sym_6: '6. 反應變慢、思考模糊/腦霧',
        sym_7: '7. 易怒、焦慮、情緒波動或性格改變', sym_8: '8. 視力模糊、對光線或噪音極度敏感',
        sym_9: '9. 睡眠障礙、失眠或入睡困難', sym_10: '10. 頸部疼痛、麻木或微弱抽動',
        triggers_label: '記錄日常誘因（如：使用3C、特定活動會使症狀加重嗎？）：',

        // 健康資料
        band_hr: '❤️ 即時心跳 (bpm)', band_spo2: '🩸 血氧飽和度 SpO2 (%)',
        band_steps: '👟 今日步數 (步)', band_avg_steps: '📊 近期平均步數 (步/日)',

        // 個人資料
        profile_heading: '基本資料', prof_name: '1. 暱稱（非必填）', prof_birth: '2. 出生年 (西元)',
        prof_gender: '3. 性別', prof_tbi: '4. 是否參與輕度腦外傷研究', prof_sport: '5. 運動頻率',
        select_default: '請選擇...', gender_male: '男性', gender_female: '女性', gender_other: '其他 / 不願透露',
        yes: '是', no: '否',
        sport_none: '幾乎不運動', sport_light: '輕度（每周 1-2 次 超過30分鐘）',
        sport_moderate: '中度（每周 3-4 次 超過30分鐘）', sport_heavy: '規律高強度（每周 5 次以上 超過30分鐘）',
        save_profile_btn: '儲存', edit_profile_btn: '✏️ 修改',

        // 趨勢圖 / 新知
        calendar_title: '📅 頭痛發作月曆總覽', calendar_hint: '點擊日期可檢視或補填當天紀錄，顏色代表頭痛嚴重程度。',
        chart_title: '📈 頭痛指數與發作頻率趨勢圖', info_title: '衛教',

        // 免責聲明 / 頁尾
        disc_title: '⚠️ 免責與醫療聲明',
        disc_p1: '本應用程式（包含頭痛日記與氣象健康數據分析）僅供個人健康紀錄與研究參考，<strong>不具備醫療診斷、處方或治療功能</strong>。',
        disc_p2: '若您感到極度不適或出現發燒、劇烈頭痛、言語不清等異常症狀，請儘速前往急診或就近醫療院所就醫。',
        disc_ok: '我已瞭解',
        footer_disclaimer: '⚠️ <strong>免責聲明：</strong> 本系統僅供健康紀錄與研究，非醫療診斷。若有急性身體不適請立即就醫。',
        account_mgmt: '🔐 帳號管理',

        // 緊急警示（目前 HTML 未使用，保留）
        emg_title: '⚠️ 醫療緊急警示', emg_desc: '若您或觀察對象目前出現以下任何狀況，請<b>立即停止填表並即刻撥打 119 送醫</b>：',
        emg_1: '昏睡叫不醒、意識嚴重改變', emg_2: '劇烈頭痛或持續性嘔吐', emg_3: '四肢抽搐或癲癇發作',
        emg_4: '肢體突然單側無力、手腳發麻', emg_5: '視力模糊、複視（疊影）',
        warning_text: '🚨 偵測到重大危險徵象！請勿填表，請立即前往最近的急診室就醫評估！'
    },
    'en': {
        consent_title: '📄 Research Informed Consent', consent_desc: 'Please carefully read the study information below:',
        consent_agree_btn: 'I have read and agree to participate', consent_disagree_btn: 'Decline',
        login_title: '🔐 Login', login_desc: 'Please log in with your Google account to start tracking',
        google_login_btn: 'Sign in with Google', other_login_btn: '🔐 Other methods',

        form_title: '🩺 Symptoms & Music',
        main_record: '📝 Record', main_music: '🎵 Music', main_chart: '📊 Trends', main_info: 'Health Info',

        menu_profile: '👤 Profile Settings', menu_disclaimer: '⚠️ Disclaimer', menu_consent: '📄 Re-submit Consent',
        menu_export: '📥 Export Records (PDF)', menu_logout: '🚪 Log out',

        loc_change_btn: '🔄 Change Location', loc_picker_title: '📍 Select Location', loc_confirm: '✅ Confirm', loc_cancel: '✖️ Cancel',
        weather_loading: '⏳ Fetching weather data...',

        tab_headache: '🤕 Headache', tab_mood: '🩵 Mood', tab_symptom: '📝 Symptoms', tab_band: '⌚ Health Data',

        headache_title: '🩹 Headache Log & Symptom Assessment',
        record_datetime: '📅 Date & Time of Record:', record_hint: '💡 To add a past record, select the date and time',
        pain_location_label: '📍 Tap the head diagram or buttons below to mark pain location',
        med_question: '💊 Did you take any medication for this headache?',
        notes_label: 'Additional notes or special circumstances',
        next_btn: 'Next', btn_prev_step: '⬅️ Back', btn_next_health: 'Next: Health Data ➔',
        btn_save_record: '💾 Save Record',

        sym_1: '1. Persistent headache', sym_2: '2. Dizziness, balance issues or unstable gait', sym_3: '3. Nausea or vomiting sensation',
        sym_4: '4. Fatigue, excessive sleep or drowsiness', sym_5: '5. Difficulty concentrating, worsened memory', sym_6: '6. Slowed reactions, brain fog',
        sym_7: '7. Irritability, anxiety, mood swings or personality changes', sym_8: '8. Blurred vision, extreme sensitivity to light/noise',
        sym_9: '9. Sleep disturbance, insomnia or difficulty falling asleep', sym_10: '10. Neck pain, numbness or mild twitching',
        triggers_label: 'Record daily triggers (e.g., screen use, specific activities that worsen symptoms):',

        band_hr: '❤️ Heart Rate (bpm)', band_spo2: '🩸 SpO2 (%)',
        band_steps: '👟 Steps Today', band_avg_steps: '📊 Recent Average Steps (per day)',

        profile_heading: 'Personal Profile', prof_name: '1. Nickname (Optional)', prof_birth: '2. Birth Year (AD)',
        prof_gender: '3. Gender', prof_tbi: '4. Participating in the mild TBI study?', prof_sport: '5. Exercise Frequency',
        select_default: 'Select...', gender_male: 'Male', gender_female: 'Female', gender_other: 'Other / Prefer not to say',
        yes: 'Yes', no: 'No',
        sport_none: 'Almost none', sport_light: 'Light (1-2 times/week, 30+ min)',
        sport_moderate: 'Moderate (3-4 times/week, 30+ min)', sport_heavy: 'Regular high intensity (5+ times/week, 30+ min)',
        save_profile_btn: 'Save', edit_profile_btn: '✏️ Edit',

        calendar_title: '📅 Headache Calendar Overview', calendar_hint: 'Tap a date to view or add that day\'s record. Colors indicate headache severity.',
        chart_title: '📈 Headache Intensity & Frequency Trends', info_title: 'Health Education',

        disc_title: '⚠️ Disclaimer & Medical Notice',
        disc_p1: 'This app (including the headache diary and weather-health analysis) is for personal health tracking and research reference only and <strong>does not provide medical diagnosis, prescription or treatment</strong>.',
        disc_p2: 'If you feel extremely unwell or have symptoms such as fever, severe headache or slurred speech, seek emergency care or visit the nearest medical facility immediately.',
        disc_ok: 'I understand',
        footer_disclaimer: '⚠️ <strong>Disclaimer:</strong> This system is for health tracking and research only, not medical diagnosis. Seek medical care immediately for acute symptoms.',
        account_mgmt: '🔐 Account Management',

        emg_title: '⚠️ Medical Emergency Warning', emg_desc: 'If you or the person you are observing has any of the following, <b>stop filling out the form and call 119 immediately</b>:',
        emg_1: 'Unresponsive or severely altered consciousness', emg_2: 'Severe headache or persistent vomiting', emg_3: 'Seizures or convulsions',
        emg_4: 'Sudden one-sided weakness or numbness', emg_5: 'Blurred or double vision',
        warning_text: '🚨 Critical danger signs detected! Do not submit. Go to the nearest emergency room immediately!'
    }
};

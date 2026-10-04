// i18n.js — 多語系字典檔
// 由 HeadacheV3 主程式的 langDict 抽出，供 <script src="./i18n.js"></script> 載入

const langDict = {
    'zh-TW': {
        consent_title: '📄 研究參與同意書', consent_desc: '請詳細閱讀以下研究說明與同意書內容：', consent_agree_btn: '我已閱讀並同意參與研究',
        login_title: '🔐 系統登入', login_desc: '請使用 Google 帳號授權登入以開始記錄', google_login_btn: '使用 Google 帳號快速登入',
        form_title: '📝 頭痛與環境研究日誌', logout_btn: '登出',
        tab_profile: '👤 個人基本資料', tab_symptom: '📝 症狀與環境', tab_band: '⌚ 健康手環', tab_chart: '📈 趨勢圖表',
        profile_heading: '基本資料設定', prof_name: '1. 希望怎麼稱呼你（非必填）', prof_birth: '2. 出生年 (西元)', prof_gender: '3. 性別',
        prof_tbi: '4. 是否參與輕度腦外傷研究', prof_sport: '5. 運動頻率', select_default: '請選擇...',
        gender_male: '男性', gender_female: '女性', gender_other: '其他 / 不願透露', yes: '是', no: '否',
        sport_none: '幾乎不運動', sport_light: '輕度（每周 1-2 次）', sport_moderate: '中度（每周 3-4 次）', sport_heavy: '規律高強度（每周 5 次以上）',
        save_profile_btn: '儲存個人基本資料', submit_band_btn: '送出手環數據',
        weather_loading: '⏳ 正在取得您的位置與即時 29 項氣象及空污數據...',
        emg_title: '⚠️ 醫療緊急警示', emg_desc: '若您或觀察對象目前出現以下任何狀況，請<b>立即停止填表並即刻撥打 119 送醫</b>：',
        emg_1: '昏睡叫不醒、意識嚴重改變', emg_2: '劇烈頭痛或持續性嘔吐', emg_3: '四肢抽搐或癲癇發作', emg_4: '肢體突然單側無力、手腳發麻', emg_5: '視力模糊、複視（疊影）',
        warning_text: '🚨 偵測到重大危險徵象！請勿填表，請立即前往最近的急診室就醫評估！',
        sym_1: '1. 持續性頭痛', sym_2: '2. 頭暈、失去平衡或步態不穩', sym_3: '3. 噁心、想吐的感覺', sym_4: '4. 疲勞感、睡眠過多或嗜睡', sym_5: '5. 注意力難以集中、記憶變差', sym_6: '6. 反應變慢、思考模糊/腦霧', sym_7: '7. 易怒、焦慮、情緒波動或性格改變', sym_8: '8. 視力模糊、對光線或噪音極度敏感', sym_9: '9. 睡眠障礙、失眠或入睡困難', sym_10: '10. 頸部疼痛、麻木或微弱抽動',
        triggers_label: '記錄日常誘因（如：使用3C、特定活動會使症狀加重嗎？）：',
        band_hr: '❤️ 即時心跳 (bpm)', band_spo2: '🩸 血氧飽和度 SpO2 (%)', band_steps: '👟 今日步數 (步)', band_avg_steps: '📊 近期平均步數 (步/日)',
        submit_btn: '儲存', chart_title: '📈 近期持續性頭痛趨勢',prev_btn: '上一頁', next_btn: '下一頁'
    },
    'en': {
        consent_title: '📄 Research Informed Consent', consent_desc: 'Please carefully read the study information below:', consent_agree_btn: 'I have read and agree to participate',
        login_title: '🔐 Login', login_desc: 'Please log in with your Google account to start tracking', google_login_btn: 'Sign in with Google',
        form_title: '📝 Headache & Environment Journal', logout_btn: 'Logout',
        tab_profile: '👤 Profile', tab_symptom: '📝 Symptoms', tab_band: '⌚ Smart Band', tab_chart: '📈 Trends',
        profile_heading: 'Personal Profile Settings', prof_name: '1. Preferred Name (Optional)', prof_birth: '2. Birth Year (AD)', prof_gender: '3. Gender',
        prof_tbi: '4. Participating in Mild TBI Study', prof_sport: '5. Exercise Frequency', select_default: 'Select...',
        gender_male: 'Male', gender_female: 'Female', gender_other: 'Other / Prefer not to say', yes: 'Yes', no: 'No',
        sport_none: 'Almost none', sport_light: 'Light (1-2 times/week)', sport_moderate: 'Moderate (3-4 times/week)', sport_heavy: 'Regular high intensity (5+ times/week)',
        save_profile_btn: 'Save Profile', submit_band_btn: 'Submit Band Data',
        weather_loading: '⏳ Fetching location & 29 real-time weather/air quality parameters...',
        emg_title: '⚠️ Medical Emergency Warning', emg_desc: 'If you or the patient experience any of the following, <b>stop filling out the form and call 119 immediately</b>:',
        emg_1: 'Unresponsiveness, altered consciousness', emg_2: 'Severe headache or persistent vomiting', emg_3: 'Seizures or convulsions', emg_4: 'Sudden unilateral weakness or numbness', emg_5: 'Blurred vision or double vision',
        warning_text: '🚨 Critical danger signs detected! Do not submit, seek emergency medical care immediately!',
        sym_1: '1. Persistent Headache', sym_2: '2. Dizziness, balance issues or unstable gait', sym_3: '3. Nausea or vomiting sensation', sym_4: '4. Fatigue, hypersomnia or lethargy', sym_5: '5. Difficulty concentrating, memory impairment', sym_6: '6. Slowed reactions, brain fog / confusion', sym_7: '7. Irritability, anxiety, mood swings', sym_8: '8. Blurred vision, extreme sensitivity to light/noise', sym_9: '9. Sleep disturbances, insomnia', sym_10: '10. Neck pain, numbness or mild twitching',
        triggers_label: 'Record daily triggers (e.g., 3C usage, specific activities):',
        band_hr: '❤️ Heart Rate (bpm)', band_spo2: '🩸 SpO2 (%)', band_steps: '👟 Today Steps', band_avg_steps: '📊 Average Daily Steps',
        submit_btn: 'save', chart_title: '📈 Recent Persistent Headache Trend',prev_btn: 'Previous', next_btn: 'Next'
    }
};

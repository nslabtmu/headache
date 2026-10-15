// ==========================================
// 📋 BAI 21 題問卷邏輯
// ==========================================

// BAI 官方 21 題症狀清單
const baiQuestions = [
    "1. 麻木或刺痛感", "2. 發熱、發燙感", "3. 腿部搖晃或震顫", "4. 無法放鬆",
    "5. 害怕壞事發生", "6. 頭暈或頭重腳輕", "7. 心悸或心跳加速", "8. 不穩定感",
    "9. 感到害怕或恐懼", "10. 神經過敏或緊張", "11. 窒息感或呼吸困難", "12. 手部發抖",
    "13. 顫抖或搖晃", "14. 害怕失去控制", "15. 呼吸困難", "16. 害怕死亡",
    "17. 焦慮或不安", "18. 消化不良或腹部不適", "19. 昏厥感", "20. 臉部發紅發熱", "21. 出汗（非因發燒或天氣熱）"
];


// ==========================================
// 🌙 PSQI 正式計分版（取代原本的 PSQI 邏輯）
// ==========================================

// 18 題（第 10 題「同床者」不計分，故省略）。每題加上 key，計分時不再依賴索引位置。
const psqiQuestions = [
    { key: 'bed',      type: 'time',   title: "1. 過去一個月中，您通常幾點上床睡覺？", desc: "請以 24 小時制輸入", placeholder: "例如 23:00 或 23:30" },
    { key: 'latency',  type: 'number', max: 720, title: "2. 過去一個月中，您上床後通常需要多久才能入睡（分鐘）？", placeholder: "請輸入分鐘數，如 30" },
    { key: 'wake',     type: 'time',   title: "3. 過去一個月中，您通常幾點起床？", desc: "請以 24 小時制輸入", placeholder: "例如 07:00 或 07:30" },
    { key: 'sleepHrs', type: 'number', max: 24, title: "4. 過去一個月中，您每天晚上實際睡眠的時間是多少小時？", desc: "（這可能與您躺在床上時間不同）", placeholder: "請輸入小時數，如 6.5 或 7" },

    { key: '5a', type: 'choice', title: "5a. 過去一個月中，您是否無法在 30 分鐘內入睡？" },
    { key: '5b', type: 'choice', title: "5b. 過去一個月中，您是否夜間易醒或早醒？" },
    { key: '5c', type: 'choice', title: "5c. 過去一個月中，您是否夜間需要起來上廁所？" },
    { key: '5d', type: 'choice', title: "5d. 過去一個月中，您是否感到呼吸不順暢？" },
    { key: '5e', type: 'choice', title: "5e. 過去一個月中，您是否咳嗽或鼾聲很大？" },
    { key: '5f', type: 'choice', title: "5f. 過去一個月中，您是否感到太冷？" },
    { key: '5g', type: 'choice', title: "5g. 過去一個月中，您是否感到太熱？" },
    { key: '5h', type: 'choice', title: "5h. 過去一個月中，您是否做噩夢？" },
    { key: '5i', type: 'choice', title: "5i. 過去一個月中，您是否感到身體疼痛？" },
    { key: '5j', type: 'choice', title: "5j. 過去一個月中，是否有其他原因影響了您的睡眠？" },

    { key: 'q6', type: 'choice', title: "6. 過去一個月中，您對整體睡眠品質的評價如何？", customOptions: ["非常好 (0分)", "良好 (1分)", "較差 (2分)", "非常差 (3分)"] },
    { key: 'q7', type: 'choice', title: "7. 過去一個月中，您是否需要服用藥物來幫助入睡？" },
    { key: 'q8', type: 'choice', title: "8. 過去一個月中，您在開車、吃飯或參加社交活動時，是否難以保持清醒？" },
    // 原版第 9 題是「困難程度」而非頻率，所以要用自訂選項
    { key: 'q9', type: 'choice', title: "9. 過去一個月中，要維持足夠的熱忱把事情做好，對您來說有多大的困難？",
      customOptions: ["完全沒有困難 (0分)", "只有很輕微的困難 (1分)", "有些困難 (2分)", "有很大的困難 (3分)"] }
];
let psqiAnswers = [];
// ---------- 輔助函式 ----------

// "23:30" → 1410（分鐘）；格式錯誤回傳 null
function parseClockToMinutes(str) {
    if (typeof str !== 'string') return null;
    const m = str.trim().replace('：', ':').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
}

function formatMinutes(total) {
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function getPsqiAnswer(key) {
    const idx = psqiQuestions.findIndex(q => q.key === key);
    return idx >= 0 ? psqiAnswers[idx] : null;
}

// 躺在床上的時數（可跨午夜，例如 23:00 → 07:00 = 8 小時）
function calcTimeInBedHours() {
    const bed = parseClockToMinutes(getPsqiAnswer('bed'));
    const wake = parseClockToMinutes(getPsqiAnswer('wake'));
    if (bed === null || wake === null) return null;
    let diff = wake - bed;
    if (diff <= 0) diff += 1440;
    return diff / 60;
}

// ---------- 計分：7 個成分，各 0~3，總分 0~21 ----------
function calcPsqiScores() {
    const a = k => getPsqiAnswer(k) || 0;
    const band = (sum, [t1, t2]) => sum === 0 ? 0 : sum <= t1 ? 1 : sum <= t2 ? 2 : 3;

    // C1 主觀睡眠品質：第 6 題
    const quality = a('q6');

    // C2 入睡時間：第 2 題（分鐘）分級 + 5a，兩者相加再分級
    const latencyMin = a('latency');
    const latencyScore = latencyMin <= 15 ? 0 : latencyMin <= 30 ? 1 : latencyMin <= 60 ? 2 : 3;
    const latency = band(latencyScore + a('5a'), [2, 4]);

    // C3 睡眠時數：第 4 題
    const sleepHours = a('sleepHrs');
    const duration = sleepHours >= 7 ? 0 : sleepHours >= 6 ? 1 : sleepHours >= 5 ? 2 : 3;

    // C4 睡眠效率 = 實際睡眠時數 / 躺在床上時數 × 100%
    const timeInBed = calcTimeInBedHours() || 0;
    const efficiencyPct = timeInBed > 0 ? Math.min(100, (sleepHours / timeInBed) * 100) : 0;
    const efficiency = efficiencyPct >= 85 ? 0 : efficiencyPct >= 75 ? 1 : efficiencyPct >= 65 ? 2 : 3;

    // C5 睡眠困擾：5b ~ 5j 加總
    const disturbSum = ['5b','5c','5d','5e','5f','5g','5h','5i','5j'].reduce((s, k) => s + a(k), 0);
    const disturbance = band(disturbSum, [9, 18]);

    // C6 助眠藥物：第 7 題
    const medication = a('q7');

    // C7 日間功能障礙：第 8 + 9 題
    const daytime = band(a('q8') + a('q9'), [2, 4]);

    const components = { quality, latency, duration, efficiency, disturbance, medication, daytime };
    const total = Object.values(components).reduce((s, v) => s + v, 0);
    return { total, components, efficiencyPct, timeInBed, sleepHours };
}

// ==========================================
// 📋 BDI 21 題問卷邏輯
// ==========================================
// BDI-II 21 題完整題目與選項資料
const bdiQuestions = [
    {
        title: "1. 悲傷 (Sadness)",
        options: [
            "0 - 我不感到悲傷。",
            "1 - 大部分時間我都感到悲傷。",
            "2 - 我隨時都感到悲傷。",
            "3 - 我極度悲傷或不快樂，甚至到了無法忍受的地步。"
        ]
    },
    {
        title: "2. 悲觀 (Pessimism)",
        options: [
            "0 - 我對未來並不感到灰心或沮喪。",
            "1 - 我感到對未來比以前更沮喪。",
            "2 - 我覺得自己沒什麼值得期待的事情。",
            "3 - 我覺得未來沒有希望，情況只會越來越糟糕。"
        ]
    },
    {
        title: "3. 過去的失敗 (Past Failure)",
        options: [
            "0 - 我不覺得自己是個失敗者。",
            "1 - 我覺得自己失敗的次數比應該有的還多。",
            "2 - 回顧過去，我看到許多失敗。",
            "3 - 我覺得自己作為一個人，是完全失敗的。"
        ]
    },
    {
        title: "4. 失去樂趣 (Loss of Pleasure)",
        options: [
            "0 - 我從喜歡的事情中獲得的樂趣和以前一樣。",
            "1 - 我無法像以前那樣享受事物。",
            "2 - 我能從習慣喜歡的事情中獲得的樂趣極少。",
            "3 - 我無法從任何事物中獲得任何樂趣。"
        ]
    },
    {
        title: "5. 罪惡感 (Guilty Feelings)",
        options: [
            "0 - 我特別不覺得有罪惡感。",
            "1 - 我對許多做過或該做而沒做的事情感到罪惡。",
            "2 - 大部分時間我都感到相當有罪惡感。",
            "3 - 我隨時隨地都感到極度的罪惡感。"
        ]
    },
    {
        title: "6. 懲罰感 (Punishment Feelings)",
        options: [
            "0 - 我不覺得自己正在受到懲罰。",
            "1 - 我覺得自己可能會受到懲罰。",
            "2 - 我預期自己會受到懲罰。",
            "3 - 我覺得自己正在受到懲罰。"
        ]
    },
    {
        title: "7. 自我討厭 (Self-Dislike)",
        options: [
            "0 - 我對自己的感覺和以前一樣。",
            "1 - 我對自己失去了信心。",
            "2 - 我對自己感到失望。",
            "3 - 我討厭我自己。"
        ]
    },
    {
        title: "8. 自我批判 (Self-Criticalness)",
        options: [
            "0 - 我不會比以前更多地批評或責怪自己。",
            "1 - 我比以前更容易批評自己的缺失。",
            "2 - 我因自己的過錯而批評自己。",
            "3 - 我為發生的所有壞事責怪自己。"
        ]
    },
    {
        title: "9. 自殺意念或想法 (Suicidal Thoughts)",
        options: [
            "0 - 我沒有任何想傷害自己的想法。",
            "1 - 我有傷害自己的想法，但我不會真的去做。",
            "2 - 我想要殺了自己。",
            "3 - 如果有機會，我會自殺。"
        ]
    },
    {
        title: "10. 哭泣 (Crying)",
        options: [
            "0 - 我不會比以前哭得更多。",
            "1 - 我比以前更容易哭泣。",
            "2 - 我因為每一件小事而哭泣。",
            "3 - 我想哭，但我哭不出來。"
        ]
    },
    {
        title: "11. 躁動不安 (Agitation)",
        options: [
            "0 - 我不會比以前更容易感到坐立不安或急躁。",
            "1 - 我感到比以前更坐立不安或急躁。",
            "2 - 我非常坐立不安，以至於很難靜靜坐著。",
            "3 - 我太過坐立不安，必須一直走動或做些事情。"
        ]
    },
    {
        title: "12. 失去興趣 (Loss of Interest)",
        options: [
            "0 - 我對其他人或活動的興趣沒有減少。",
            "1 - 我對其他人或事物的興趣比以前減少了。",
            "2 - 我失去了大部分對其他人或事物的興趣。",
            "3 - 我對任何事情都提不起興趣。"
        ]
    },
    {
        title: "13. 優柔寡斷 (Indecisiveness)",
        options: [
            "0 - 我做出做決定的能力和以前一樣好。",
            "1 - 我發現做決定比以前更加困難。",
            "2 - 我做決定時遇到極大的困難。",
            "3 - 我根本無法做出任何決定。"
        ]
    },
    {
        title: "14. 無價值感 (Worthlessness)",
        options: [
            "0 - 我不覺得自己是沒有價值的人。",
            "1 - 我不覺得自己像以前那樣有價值和有用。",
            "2 - 與其他人相比，我覺得自己比較沒有價值。",
            "3 - 我覺得自己完全沒有價值。"
        ]
    },
    {
        title: "15. 活力喪失 (Loss of Energy)",
        options: [
            "0 - 我的精力跟以前一樣好。",
            "1 - 我的精力比以前少。",
            "2 - 我沒有足夠的精力去做很多事情。",
            "3 - 我沒有足夠的精力去做任何事情。"
        ]
    },
    {
        title: "16. 睡眠習慣改變 (Changes in Sleeping Pattern)",
        options: [
            "0 - 我的睡眠狀況沒有任何改變。",
            "1 - 我睡得比以前稍微多或少了一些。",
            "2 - 我睡得比以前多得多或少得多。",
            "3 - 我幾乎整天都在睡，或者比以前少睡了許多（難以入睡/早醒）。"
        ]
    },
    {
        title: "17. 易怒 (Irritability)",
        options: [
            "0 - 我不會比以前更容易發脾氣。",
            "1 - 我比以前更容易激動或發脾氣。",
            "2 - 我比以前容易發脾氣許多。",
            "3 - 我隨時隨地都感到易怒。"
        ]
    },
    {
        title: "18. 食慾改變 (Changes in Appetite)",
        options: [
            "0 - 我的食慾沒有任何改變。",
            "1 - 我的食慾比以前稍微好一點或差一點。",
            "2 - 我的食慾比以前好得多或差得多。",
            "3 - 我完全沒有食慾，或者隨時都想暴飲暴食。"
        ]
    },
    {
        title: "19. 專注力困難 (Concentration Difficulty)",
        options: [
            "0 - 我可以像以前一樣好地集中注意力。",
            "1 - 我無法像以前那樣集中注意力。",
            "2 - 我很難長時間集中注意力在任何事情上。",
            "3 - 我發現自己無法集中注意力在任何事情上。"
        ]
    },
    {
        title: "20. 疲勞或疲倦 (Tiredness or Fatigue)",
        options: [
            "0 - 我不會比以前更容易感到疲倦。",
            "1 - 我比以前更容易感到疲倦或累。",
            "2 - 我太累了，以至於無法做很多以前常做的事。",
            "3 - 我太累了，幾乎無法做任何事。"
        ]
    },
    {
        title: "21. 對性的興趣改變 (Loss of Interest in Sex)",
        options: [
            "0 - 我最近對性的興趣沒有改變。",
            "1 - 我對性的興趣比以前減少了。",
            "2 - 我現在對性的興趣大幅減少。",
            "3 - 我對性完全失去了興趣。"
        ]
    }
];

// ==========================================
// 🌀 DHI 眩暈障礙量表 (Dizziness Handicap Inventory) 邏輯
// ==========================================
// 共 25 題，每題「是=4、有時=2、否=0」，總分 0 ~ 100
// 分項：P 生理(7題 /28分)、F 功能(9題 /36分)、E 情緒(9題 /36分)

const dhiQuestions = [
    { text: "1. 抬頭看時，您的眩暈問題會加重嗎？", cat: "P" },
    { text: "2. 因為眩暈問題，您會感到挫折嗎？", cat: "E" },
    { text: "3. 因為眩暈問題，您會限制自己的出差或休閒旅行嗎？", cat: "F" },
    { text: "4. 走在超市的走道間，您的眩暈問題會加重嗎？", cat: "P" },
    { text: "5. 因為眩暈問題，您上下床會有困難嗎？", cat: "F" },
    { text: "6. 您的眩暈問題是否嚴重限制了社交活動，例如外出用餐、看電影、跳舞或參加聚會？", cat: "F" },
    { text: "7. 因為眩暈問題，您閱讀時會有困難嗎？", cat: "F" },
    { text: "8. 從事較費力的活動（如運動、跳舞、做家事）時，您的眩暈問題會加重嗎？", cat: "P" },
    { text: "9. 因為眩暈問題，您會害怕沒人陪同就離開家嗎？", cat: "E" },
    { text: "10. 因為眩暈問題，您曾在別人面前感到尷尬嗎？", cat: "E" },
    { text: "11. 快速轉動頭部時，您的眩暈問題會加重嗎？", cat: "P" },
    { text: "12. 因為眩暈問題，您會避免到高的地方嗎？", cat: "F" },
    { text: "13. 在床上翻身時，您的眩暈問題會加重嗎？", cat: "P" },
    { text: "14. 因為眩暈問題，您要做粗重的家事或庭院工作會有困難嗎？", cat: "F" },
    { text: "15. 因為眩暈問題，您會擔心別人以為您喝醉了嗎？", cat: "E" },
    { text: "16. 因為眩暈問題，您要獨自散步會有困難嗎？", cat: "F" },
    { text: "17. 走在人行道上時，您的眩暈問題會加重嗎？", cat: "P" },
    { text: "18. 因為眩暈問題，您要集中注意力會有困難嗎？", cat: "E" },
    { text: "19. 因為眩暈問題，您在黑暗中於家裡走動會有困難嗎？", cat: "F" },
    { text: "20. 因為眩暈問題，您會害怕獨自待在家嗎？", cat: "E" },
    { text: "21. 因為眩暈問題，您會覺得自己有障礙嗎？", cat: "E" },
    { text: "22. 您的眩暈問題是否讓您與家人或朋友的關係產生壓力？", cat: "E" },
    { text: "23. 因為眩暈問題，您會感到沮喪嗎？", cat: "E" },
    { text: "24. 您的眩暈問題是否影響到工作或家務責任？", cat: "F" },
    { text: "25. 彎腰時，您的眩暈問題會加重嗎？", cat: "P" }
];


// ==========================================
// 🛡️ PSS-I 創傷後壓力症狀量表 (PTSD Symptom Scale - Interview) 邏輯
// ==========================================
// 共 17 題，對應 DSM-IV 的 PTSD 症狀，每題 0 ~ 3 分，總分 0 ~ 51
// 分項：B 重新經驗(5題 /15)、C 逃避與麻木(7題 /21)、D 過度警覺(5題 /15)
// 注意：此為篩檢/追蹤用途，不能取代專業診斷。

const PSSI_CUTOFF = 15; // 研究中常用的篩檢切點(約 14~15)，可依需求調整

const pssiQuestions = [
    // B. 重新經驗
    { text: "1. 腦中不由自主地浮現創傷事件的畫面、想法或記憶，令您痛苦。", cat: "B" },
    { text: "2. 反覆做與創傷事件有關、令您痛苦的夢。", cat: "B" },
    { text: "3. 突然覺得或表現得好像創傷事件又再次發生（如閃回、彷彿身歷其境）。", cat: "B" },
    { text: "4. 接觸到會讓您聯想到創傷事件的人、事、物時，會感到強烈的心理痛苦。", cat: "B" },
    { text: "5. 接觸到會讓您聯想到創傷事件的人、事、物時，會出現身體反應（如心跳加快、冒汗、發抖）。", cat: "B" },
    // C. 逃避與麻木
    { text: "6. 刻意避免去想、去談或去感受與創傷事件有關的事。", cat: "C" },
    { text: "7. 刻意避開會讓您想起創傷事件的活動、地點或人。", cat: "C" },
    { text: "8. 無法回想起創傷事件中的某些重要部分。", cat: "C" },
    { text: "9. 對以前重視或喜歡的活動，明顯失去興趣或較少參與。", cat: "C" },
    { text: "10. 覺得與他人疏離、有距離感，或像是被隔離在外。", cat: "C" },
    { text: "11. 情感變得麻木，難以感受愛、喜悅等情緒。", cat: "C" },
    { text: "12. 覺得未來一片黯淡（如不覺得會有事業、婚姻、子女或正常的壽命）。", cat: "C" },
    // D. 過度警覺
    { text: "13. 難以入睡或難以維持睡眠。", cat: "D" },
    { text: "14. 容易煩躁，或有突如其來的怒氣。", cat: "D" },
    { text: "15. 難以集中注意力。", cat: "D" },
    { text: "16. 對周遭環境過度警戒、緊繃，總覺得要提防什麼。", cat: "D" },
    { text: "17. 容易被嚇到，或對突然的聲響、動靜反應過度。", cat: "D" }
];

// 頻率/嚴重度選項（索引即分數）
const pssiOptions = [
    "0 - 完全沒有",
    "1 - 每週 1 次以下 / 輕微",
    "2 - 每週 2 ~ 4 次 / 中等",
    "3 - 每週 5 次以上 / 非常嚴重"
];


// ==========================================
// 📋 PHQ-9 憂鬱 / GAD-7 焦慮 量表
// ==========================================
// 兩份量表結構相同（0~3 分、過去兩週），用同一個工廠函式產生，
// 會自動建立全域函式：startPhq9Quiz / prevPhq9Question、startGad7Quiz / prevGad7Question

const MENTAL_LIKERT_OPTIONS = [
    "0 - 完全沒有",
    "1 - 好幾天",
    "2 - 一半以上的天數",
    "3 - 幾乎每天"
];

// 官方附加題（不計分）：總分 > 0 時才會出現
const MENTAL_FUNCTION_QUESTION = "如果您勾選了上述任何問題，這些問題對您在工作、處理家務或與他人相處上，造成多大的困難？";
const MENTAL_FUNCTION_OPTIONS = [
    "0 - 完全沒有困難",
    "1 - 有一點困難",
    "2 - 非常困難",
    "3 - 極度困難"
];

// PHQ-9 第 9 題（傷害自己的念頭）有作答時顯示。請依使用者所在地區確認電話。
const CRISIS_NOTICE =
    "\n\n⚠️ 您在第 9 題提到有不如死掉或傷害自己的念頭。您不需要獨自承受，" +
    "請盡快聯絡身邊信任的人，或撥打 1925（安心專線，24 小時）、1995（生命線）、1980（張老師）。" +
    "若有立即危險，請撥 110 或 119。";

//1015
// ==========================================
// 🧩 統一量表引擎
// ==========================================
const lbl = arr => arr.map((label, i) => ({ label, score: i })); // 索引即分數
const PSQI_FREQ = ["過去一個月沒有發生 (0分)", "每週不到一次 (1分)", "每週一、兩次 (2分)", "每週三次以上 (3分)"];
// 如果你原本的 psqiDefaultOptions 文字不同，把上面這行換成你的

const OPT_STYLE = 'padding:12px; font-size:15px; text-align:left; cursor:pointer; border:1px solid #ccc; border-radius:6px; background:#fff;';
const PRIMARY_STYLE = 'padding:8px 20px; background:#3f51b5; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;';

const sumTo = (a, n) => a.slice(0, n).reduce((s, v) => s + (v || 0), 0);

// ---------- PHQ-9 / GAD-7 共用工廠 ----------
function likert({ name, icon, desc, questions, maxScore, cutoff, getLevel, crisisItem }) {
    return {
        name, icon, desc,
        stem: "過去兩週，您有多常被以下問題困擾？",
        items: questions.map((q, i) => ({ title: `${i + 1}. ${q}`, options: lbl(MENTAL_LIKERT_OPTIONS) })),
        followUp: { title: MENTAL_FUNCTION_QUESTION, options: lbl(MENTAL_FUNCTION_OPTIONS) },
        score(a) {
            const total = sumTo(a, questions.length);
            const fu = total > 0 ? (a[questions.length] ?? null) : null;
            const lines = [];
            if (total >= cutoff) lines.push(`分數已達 ${cutoff} 分以上的篩檢切點，建議尋求專業評估。`);
            if (fu !== null) lines.push(`對日常生活的影響：${MENTAL_FUNCTION_OPTIONS[fu].slice(4)}`);
            return {
                total, max: maxScore, level: getLevel(total), lines,
                crisis: crisisItem !== undefined && a[crisisItem] >= 1,
                details: { functional_difficulty: fu }
            };
        }
    };
}

// ---------- 量表註冊表（新增量表只要加一個項目） ----------
const QUIZZES = {
    phq9: likert({
        name: 'PHQ-9 憂鬱', icon: '🌧️', desc: '共 9 題，評估過去兩週的憂鬱症狀。',
        maxScore: 27, cutoff: 10, crisisItem: 8,
        questions: [
            "做事時提不起勁或沒有樂趣",
            "感到心情低落、沮喪或絕望",
            "入睡困難、睡不安穩或睡眠過多",
            "覺得疲倦或沒有活力",
            "食慾不振或吃太多",
            "覺得自己很糟，或覺得自己很失敗，或讓自己或家人失望",
            "對事物專注有困難，例如閱讀報紙或看電視時",
            "動作或說話速度緩慢到別人已經察覺？或正好相反——煩躁或坐立不安、動來動去的情況比平常更嚴重",
            "有不如死掉或用某種方式傷害自己的念頭"
        ],
        getLevel: t => t <= 4 ? "無或極輕微憂鬱 (Minimal)" : t <= 9 ? "輕度憂鬱 (Mild)"
                     : t <= 14 ? "中度憂鬱 (Moderate)" : t <= 19 ? "中重度憂鬱 (Moderately Severe)" : "重度憂鬱 (Severe)"
    }),

    gad7: likert({
        name: 'GAD-7 焦慮', icon: '😰', desc: '共 7 題，評估過去兩週的焦慮症狀。',
        maxScore: 21, cutoff: 10,
        questions: [
            "感到緊張、焦慮或煩躁", "無法停止或控制擔憂", "對各種事情過度擔憂", "很難放鬆",
            "坐立不安，難以靜坐", "變得容易生氣或煩躁", "感到害怕，好像有什麼可怕的事會發生"
        ],
        getLevel: t => t <= 4 ? "極輕微焦慮 (Minimal)" : t <= 9 ? "輕度焦慮 (Mild)"
                     : t <= 14 ? "中度焦慮 (Moderate)" : "重度焦慮 (Severe)"
    }),

    bdi: {
        name: 'BDI 憂鬱', icon: '📋', desc: '共 21 題，每題請選出最能描述您近兩週（含今天）心情的敘述。',
        items: bdiQuestions.map(q => ({ title: q.title, options: lbl(q.options) })),
        score(a) {
            const total = sumTo(a, 21);
            const level = total <= 13 ? "無或極輕微憂鬱狀況" : total <= 19 ? "輕度憂鬱狀況"
                        : total <= 28 ? "中度憂鬱狀況" : "重度憂鬱狀況";
            return { total, max: 63, level, lines: [], crisis: a[8] >= 1, details: {} };
        }
    },

    bai: {
        name: 'BAI 焦慮', icon: '📋', desc: '共 21 題，評估您近一週（含今天）受焦慮症狀困擾的程度。',
        items: baiQuestions.map(t => ({
            title: t,
            options: lbl(["0 - 完全沒有", "1 - 輕度（不太受困擾）", "2 - 中度（相當受困擾）", "3 - 重度（非常受困擾）"])
        })),
        score(a) {
            const total = sumTo(a, 21);
            const level = total <= 7 ? "極輕微焦慮 (Minimal)" : total <= 15 ? "輕度焦慮 (Mild)"
                        : total <= 25 ? "中度焦慮 (Moderate)" : "重度焦慮 (Severe)";
            return { total, max: 63, level, lines: [], details: {} };
        }
    },

    psqi: {
        name: 'PSQI 睡眠', icon: '🌙', desc: '評估您過去一個月的睡眠品質與習慣，含入睡時間、睡眠時長與睡眠困擾。',
        items: psqiQuestions.map(q => ({
            key: q.key, type: q.type, title: q.title, desc: q.desc, placeholder: q.placeholder, max: q.max,
            options: q.type === 'choice' ? lbl(q.customOptions || PSQI_FREQ) : null
        })),
        validate(item, val, a) {
            psqiAnswers = a; // calcTimeInBedHours 讀這個全域陣列
            if (item.key === 'sleepHrs') {
                const inBed = calcTimeInBedHours();
                if (inBed !== null && val > inBed + 0.01)
                    return `您填的實際睡眠（${val} 小時）超過躺在床上的時間（約 ${inBed.toFixed(1)} 小時），請修正，或按「上一題」修改上床／起床時間。`;
            }
            return null;
        },
        score(a) {
            psqiAnswers = a;
            const r = calcPsqiScores(), c = r.components;
            return {
                total: r.total, max: 21,
                level: r.total > 5 ? "睡眠品質不佳 (Poor Sleeper，總分 > 5)" : "睡眠品質良好 (Good Sleeper，總分 ≤ 5)",
                lines: [
                    `七大成分（各 0~3）：主觀品質 ${c.quality}｜入睡時間 ${c.latency}｜睡眠時數 ${c.duration}｜睡眠效率 ${c.efficiency}｜睡眠困擾 ${c.disturbance}｜助眠藥物 ${c.medication}｜日間功能 ${c.daytime}`,
                    `躺在床上約 ${r.timeInBed.toFixed(1)} 小時，實際睡眠 ${r.sleepHours} 小時，睡眠效率 ${r.efficiencyPct.toFixed(0)}%`
                ],
                details: {
                    version: 'v2', components: c,
                    sleep_efficiency_pct: Math.round(r.efficiencyPct * 10) / 10,
                    time_in_bed_hours: Math.round(r.timeInBed * 10) / 10,
                    sleep_hours: r.sleepHours
                }
            };
        }
    },

    dhi: {
        name: 'DHI 眩暈', icon: '🌀', desc: '共 25 題，約 5 分鐘。請依您最近的眩暈狀況作答。',
        items: dhiQuestions.map(q => ({
            title: q.text,
            options: [{ label: "是（4 分）", score: 4 }, { label: "有時（2 分）", score: 2 }, { label: "否（0 分）", score: 0 }]
        })),
        score(a) {
            const sub = { P: 0, F: 0, E: 0 };
            dhiQuestions.forEach((q, i) => { sub[q.cat] += a[i] || 0; });
            const total = sub.P + sub.F + sub.E;
            const level = total <= 30 ? "輕度障礙 (Mild)" : total <= 60 ? "中度障礙 (Moderate)" : "重度障礙 (Severe)";
            return {
                total, max: 100, level,
                lines: [`生理 (P)：${sub.P} / 28｜功能 (F)：${sub.F} / 36｜情緒 (E)：${sub.E} / 36`],
                details: { physical: sub.P, functional: sub.F, emotional: sub.E }
            };
        }
    },

    pssi: {
        name: 'PSS-I 創傷', icon: '🛡️',
        desc: '共 17 題，請針對過去兩週與創傷事件相關的感受作答。',
        noteLabel: '請先想一件讓您感到嚴重創傷的事件，可簡短寫下事件類型（選填，可留白）',
        items: pssiQuestions.map(q => ({ title: q.text, options: lbl(pssiOptions) })),
        score(a) {
            const sub = { B: 0, C: 0, D: 0 };
            pssiQuestions.forEach((q, i) => { sub[q.cat] += a[i] || 0; });
            const total = sub.B + sub.C + sub.D;
            return {
                total, max: 51,
                level: total >= PSSI_CUTOFF ? `達篩檢切點 (≥ ${PSSI_CUTOFF})，建議尋求專業評估` : `未達篩檢切點 (< ${PSSI_CUTOFF})`,
                lines: [`重新經驗 (B)：${sub.B} / 15｜逃避與麻木 (C)：${sub.C} / 21｜過度警覺 (D)：${sub.D} / 15`],
                details: { reexperiencing: sub.B, avoidance: sub.C, arousal: sub.D, trauma_note: Q ? Q.note : '' }
            };
        }
    }
};

// ---------- 狀態與外框 ----------
let Q = null; // { key, cfg, idx, answers, note, result }
const rootEl = () => document.getElementById('quiz-root');
const curItem = () => Q.idx < Q.cfg.items.length ? Q.cfg.items[Q.idx] : Q.cfg.followUp;

function buildPicker() {
    document.getElementById('quiz-picker').innerHTML = Object.entries(QUIZZES).map(([k, c]) =>
        `<button type="button" class="btn" data-quiz-btn="${k}" onclick="openQuiz('${k}')">${c.name}</button>`
    ).join('');
}

function highlightPicker() {
    document.querySelectorAll('[data-quiz-btn]').forEach(b => {
        const on = Q && Q.key === b.dataset.quizBtn;
        b.style.background = on ? '#3f51b5' : '';
        b.style.color = on ? '#fff' : '';
    });
}

function openQuiz(key) {
    if (Q && Q.key === key) return closeQuiz(); // 再點一次 → 收起
    Q = { key, cfg: QUIZZES[key], idx: 0, answers: [], note: '', result: null };
    renderIntro();
    highlightPicker();
}

function closeQuiz() {
    Q = null;
    rootEl().innerHTML = '';
    rootEl().style.display = 'none';
    highlightPicker();
}

// ---------- 畫面 ----------
function renderIntro() {
    const c = Q.cfg;
    rootEl().style.display = 'block';
    rootEl().innerHTML = `
    <div class="card" style="padding:20px; text-align:center;">
        <h3>${c.icon} ${c.name}</h3>
        <p style="font-size:14px; color:#666;">${c.desc}</p>
        ${c.noteLabel ? `<textarea id="quiz-note" rows="2" placeholder="${c.noteLabel}" style="width:100%; margin:8px 0; box-sizing:border-box;"></textarea>` : ''}
        <button type="button" onclick="quizStart()" style="${PRIMARY_STYLE}">開始評估</button>
        <button type="button" onclick="closeQuiz()" style="padding:8px 16px; margin-left:8px;">取消</button>
    </div>`;
}

function quizStart() {
    const note = document.getElementById('quiz-note');
    Q.note = note ? note.value.trim() : '';
    Q.idx = 0;
    Q.answers = [];
    renderQuestion();
}

function renderQuestion() {
    const { cfg, idx, answers } = Q;
    const n = cfg.items.length;
    const item = curItem();
    const isFollow = idx >= n;
    const pct = isFollow ? 100 : Math.round(((idx + 1) / n) * 100);
    const cur = answers[idx];
    const isLast = idx === n - 1 && !cfg.followUp;

    let body;
    if (item.type === 'time' || item.type === 'number') {
        body = `
        <input id="quiz-input" type="text" inputmode="${item.type === 'number' ? 'decimal' : 'text'}"
            placeholder="${item.placeholder || ''}" value="${cur ?? ''}"
            onkeydown="if(event.key==='Enter') quizSubmitInput()"
            style="width:100%; padding:10px; font-size:16px; box-sizing:border-box;">
        <div style="margin-top:12px; text-align:right;">
            <button type="button" onclick="quizSubmitInput()" style="${PRIMARY_STYLE}">${isLast ? '完成' : '下一題 →'}</button>
        </div>`;
    } else {
        body = `<div style="display:flex; flex-direction:column; gap:10px;">` +
            item.options.map(o =>
                `<button type="button" onclick="quizAnswer(${o.score})" style="${OPT_STYLE}${cur === o.score ? ' outline:3px solid #3f51b5;' : ''}">${o.label}</button>`
            ).join('') + `</div>`;
    }

    rootEl().style.display = 'block';
    rootEl().innerHTML = `
    <div class="card" style="padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:14px; margin-bottom:8px;">
            <span>${cfg.icon} ${cfg.name}　${isFollow ? '補充題' : `問題 ${idx + 1} / ${n}`}</span>
            <span>${pct}% <button type="button" onclick="closeQuiz()" title="關閉" style="border:none; background:none; cursor:pointer; font-size:16px;">✕</button></span>
        </div>
        <div style="width:100%; background:#e0e0e0; height:8px; border-radius:4px; overflow:hidden; margin-bottom:20px;">
            <div style="width:${pct}%; background:#3f51b5; height:100%; transition:width .3s;"></div>
        </div>
        ${!isFollow && cfg.stem ? `<p style="font-size:13px; color:#666; margin-bottom:8px;">${cfg.stem}</p>` : ''}
        <h3 style="margin-bottom:${item.desc ? 6 : 20}px; font-size:18px;">${item.title}</h3>
        ${item.desc ? `<p style="font-size:13px; color:#666; margin-bottom:16px;">${item.desc}</p>` : ''}
        ${body}
        <div id="quiz-msg" style="color:#c62828; font-size:13px; margin-top:10px;"></div>
        <div style="margin-top:16px;">
            ${idx > 0 ? `<button type="button" onclick="quizPrev()" style="padding:6px 12px;">← 上一題</button>` : ''}
        </div>
    </div>`;

    const input = document.getElementById('quiz-input');
    if (input) input.focus();
}

const quizToast = m => { const el = document.getElementById('quiz-msg'); if (el) el.textContent = m; };

// ---------- 作答流程 ----------
function quizAnswer(score) {
    Q.answers[Q.idx] = score;
    quizNext();
}

function quizSubmitInput() {
    const item = curItem();
    const raw = document.getElementById('quiz-input').value;
    let val;

    if (item.type === 'time') {
        const m = parseClockToMinutes(raw);
        if (m === null) return quizToast("請輸入有效的時間（24 小時制），例如 23:30 或 07:00。");
        val = formatMinutes(m);
    } else {
        const num = parseFloat(raw);
        if (!isFinite(num) || num < 0 || num > item.max) return quizToast(`請輸入 0 ~ ${item.max} 之間的數字。`);
        val = num;
    }

    const old = Q.answers[Q.idx];
    Q.answers[Q.idx] = val;
    const err = Q.cfg.validate ? Q.cfg.validate(item, val, Q.answers) : null;
    if (err) { Q.answers[Q.idx] = old; return quizToast(err); }
    quizNext();
}

function quizNext() {
    const n = Q.cfg.items.length;
    if (Q.idx < n - 1) {
        Q.idx++;
    } else if (Q.idx === n - 1 && Q.cfg.followUp && sumTo(Q.answers, n) > 0) {
        Q.idx = n; // 補充題（總分 > 0 才出現）
    } else {
        return quizFinish();
    }
    renderQuestion();
}

function quizPrev() {
    if (Q.idx > 0) { Q.idx--; renderQuestion(); }
}

// ---------- 結果與存檔 ----------
function quizFinish() {
    const r = Q.cfg.score(Q.answers);
    Q.result = r;
    rootEl().innerHTML = `
    <div class="card" style="padding:20px; text-align:center;">
        <h3>${Q.cfg.icon} ${Q.cfg.name} 評估已完成</h3>
        <p style="font-size:34px; font-weight:bold; margin:8px 0;">${r.total} <span style="font-size:16px; color:#666;">/ ${r.max}</span></p>
        <p>評估結果：<b>${r.level}</b></p>
        ${(r.lines || []).map(l => `<p style="font-size:14px; color:#444;">${l}</p>`).join('')}
        ${r.crisis ? `<p style="white-space:pre-wrap; text-align:left; color:#b71c1c; background:#fdecea; padding:12px; border-radius:6px; font-size:14px;">${CRISIS_NOTICE.trim()}</p>` : ''}
        <p style="font-size:12px; color:#888;">此量表為篩檢工具，不等同診斷。</p>
        <div id="quiz-msg" style="font-size:13px; margin:10px 0; min-height:18px;"></div>
        <button type="button" id="quiz-save-btn" onclick="quizSave()" style="${PRIMARY_STYLE}">儲存紀錄</button>
        <button type="button" onclick="openQuizAgain()" style="padding:8px 16px; margin-left:8px;">重新作答</button>
        <button type="button" onclick="closeQuiz()" style="padding:8px 16px; margin-left:8px;">關閉</button>
    </div>`;
}

function openQuizAgain() {
    const key = Q.key;
    Q = null;
    openQuiz(key);
}

async function quizSave() {
    const btn = document.getElementById('quiz-save-btn');
    const msg = document.getElementById('quiz-msg');
    const r = Q.result;
    btn.disabled = true;
    msg.style.color = '#666';
    msg.textContent = '儲存中…';

    try {
        const { error } = await supabase.from('quiz_results').insert([{
            user_id: window.appState?.userId ?? undefined, // 沒有就交給資料庫的 default auth.uid()
            quiz: Q.key,
            total_score: r.total,
            level: r.level,
            details: r.details || {},
            answers: Q.answers,
            created_at: new Date().toISOString()
        }]);
        if (error) throw error;
        msg.style.color = '#2e7d32';
        msg.textContent = '✅ 已成功儲存';
        btn.textContent = '已儲存'; // 保持 disabled，避免重複寫入
    } catch (err) {
        console.error(`❌ ${Q.cfg.name} 存檔失敗：`, err);
        msg.style.color = '#c62828';
        msg.textContent = `儲存失敗：${err.message || err}${err.code ? `（${err.code}）` : ''}`;
        btn.disabled = false;
    }
}

// 初始化
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPicker);
else buildPicker();

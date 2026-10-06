// ==========================================
// 📚 量表設定 quiz-configs.js（需在 quiz-engine.js 之後載入）
// ==========================================
// 每份量表 = 一個設定物件。必要欄位：
//   id, label(選擇器按鈕), name, icon, intro, questions, score(a, ctx) → {total, max, level, lines?, extra?}
// 常用選填：autoNumber, color, stem, options, required, cutoff, crisis, validate, toRow, table, timeColumn

// ---------- 共用 ----------
const HOTLINE_TEXT =
    "請盡快聯絡身邊信任的人，或撥打 1925（安心專線，24 小時）、1995（生命線）、1980（張老師）。" +
    "若有立即危險，請撥 110 或 119。"; // 請依使用者所在地區確認

const sumKeys = (a, keys) => keys.reduce((s, k) => s + (a[k] || 0), 0);
const band = (sum, [t1, t2]) => sum === 0 ? 0 : sum <= t1 ? 1 : sum <= t2 ? 2 : 3;

// ["題目", "分項"?] 陣列 → 題目物件
const fromList = (prefix, list) => list.map((t, i) => {
    const [text, cat] = Array.isArray(t) ? t : [t];
    return { key: `${prefix}${i + 1}`, text, ...(cat ? { cat } : {}) };
});

const FREQ_2WEEKS = ["0 - 完全沒有", "1 - 好幾天", "2 - 一半以上的天數", "3 - 幾乎每天"];
const FUNC_OPTIONS = ["0 - 完全沒有困難", "1 - 有一點困難", "2 - 非常困難", "3 - 極度困難"];
const FUNC_QUESTION = {
    key: 'func', numbered: false, scored: false, noStem: true, label: '補充題',
    text: "如果您勾選了上述任何問題，這些問題對您在工作、處理家務或與他人相處上，造成多大的困難？",
    options: FUNC_OPTIONS
};
const funcLine = a => a.func != null ? [`對日常生活的影響：${FUNC_OPTIONS[a.func].slice(4)}`] : [];

// ==========================================
const QUIZ_CONFIGS = [

// ---------- BAI ----------
{
    id: 'bai', label: 'BAI 焦慮', name: '貝克焦慮量表 (BAI)', icon: '📋',
    intro: '本問卷共 21 題，旨在評估您近一週（包含今天）受焦慮症狀困擾的程度。',
    autoNumber: true, table: 'bai_scores',
    options: ["0 - 完全沒有", "1 - 輕度（不太受困擾）", "2 - 中度（相當受困擾）", "3 - 重度（非常受困擾）"],
    questions: fromList('q', [
        "麻木或刺痛感", "發熱、發燙感", "腿部搖晃或震顫", "無法放鬆", "害怕壞事發生", "頭暈或頭重腳輕", "心悸或心跳加速",
        "不穩定感", "感到害怕或恐懼", "神經過敏或緊張", "窒息感或呼吸困難", "手部發抖", "顫抖或搖晃", "害怕失去控制",
        "呼吸困難", "害怕死亡", "焦慮或不安", "消化不良或腹部不適", "昏厥感", "臉部發紅發熱", "出汗（非因發燒或天氣熱）"
    ]),
    score: (a, { total }) => ({
        total, max: 63,
        level: total <= 7 ? "極輕微焦慮 (Normal/Minimal)" : total <= 15 ? "輕度焦慮 (Mild)"
             : total <= 25 ? "中度焦慮 (Moderate)" : "重度焦慮 (Severe)"
    })
},

// ---------- BDI-II ----------
{
    id: 'bdi', label: 'BDI 憂鬱', name: '貝克憂鬱量表 (BDI-II)', icon: '📋',
    intro: '本問卷共 21 題，請仔細閱讀每一組選項，選出最能描述您<b>近兩週（包含今天）</b>心情的敘述。',
    autoNumber: true, table: 'bdi_scores',
    // 第 9 題（自殺意念）：1 分以上顯示求助資訊，2 分以上語氣更直接
    crisis: {
        key: 'q9', min: 1,
        text: s => "\n\n⚠️ 您在第 9 題提到有傷害自己或自殺的想法。您不需要獨自承受，" + HOTLINE_TEXT +
                   (s >= 2 ? "\n\n請不要等待，現在就聯絡上述專線或可信任的人。" : "")
    },
    questions: [
        ["悲傷 (Sadness)", ["0 - 我不感到悲傷。", "1 - 大部分時間我都感到悲傷。", "2 - 我隨時都感到悲傷。", "3 - 我極度悲傷或不快樂，甚至到了無法忍受的地步。"]],
        ["悲觀 (Pessimism)", ["0 - 我對未來並不感到灰心或沮喪。", "1 - 我感到對未來比以前更沮喪。", "2 - 我覺得自己沒什麼值得期待的事情。", "3 - 我覺得未來沒有希望，情況只會越來越糟糕。"]],
        ["過去的失敗 (Past Failure)", ["0 - 我不覺得自己是個失敗者。", "1 - 我覺得自己失敗的次數比應該有的還多。", "2 - 回顧過去，我看到許多失敗。", "3 - 我覺得自己作為一個人，是完全失敗的。"]],
        ["失去樂趣 (Loss of Pleasure)", ["0 - 我從喜歡的事情中獲得的樂趣和以前一樣。", "1 - 我無法像以前那樣享受事物。", "2 - 我能從習慣喜歡的事情中獲得的樂趣極少。", "3 - 我無法從任何事物中獲得任何樂趣。"]],
        ["罪惡感 (Guilty Feelings)", ["0 - 我特別不覺得有罪惡感。", "1 - 我對許多做過或該做而沒做的事情感到罪惡。", "2 - 大部分時間我都感到相當有罪惡感。", "3 - 我隨時隨地都感到極度的罪惡感。"]],
        ["懲罰感 (Punishment Feelings)", ["0 - 我不覺得自己正在受到懲罰。", "1 - 我覺得自己可能會受到懲罰。", "2 - 我預期自己會受到懲罰。", "3 - 我覺得自己正在受到懲罰。"]],
        ["自我討厭 (Self-Dislike)", ["0 - 我對自己的感覺和以前一樣。", "1 - 我對自己失去了信心。", "2 - 我對自己感到失望。", "3 - 我討厭我自己。"]],
        ["自我批判 (Self-Criticalness)", ["0 - 我不會比以前更多地批評或責怪自己。", "1 - 我比以前更容易批評自己的缺失。", "2 - 我因自己的過錯而批評自己。", "3 - 我為發生的所有壞事責怪自己。"]],
        ["自殺意念或想法 (Suicidal Thoughts)", ["0 - 我沒有任何想傷害自己的想法。", "1 - 我有傷害自己的想法，但我不會真的去做。", "2 - 我想要殺了自己。", "3 - 如果有機會，我會自殺。"]],
        ["哭泣 (Crying)", ["0 - 我不會比以前哭得更多。", "1 - 我比以前更容易哭泣。", "2 - 我因為每一件小事而哭泣。", "3 - 我想哭，但我哭不出來。"]],
        ["躁動不安 (Agitation)", ["0 - 我不會比以前更容易感到坐立不安或急躁。", "1 - 我感到比以前更坐立不安或急躁。", "2 - 我非常坐立不安，以至於很難靜靜坐著。", "3 - 我太過坐立不安，必須一直走動或做些事情。"]],
        ["失去興趣 (Loss of Interest)", ["0 - 我對其他人或活動的興趣沒有減少。", "1 - 我對其他人或事物的興趣比以前減少了。", "2 - 我失去了大部分對其他人或事物的興趣。", "3 - 我對任何事情都提不起興趣。"]],
        ["優柔寡斷 (Indecisiveness)", ["0 - 我做出做決定的能力和以前一樣好。", "1 - 我發現做決定比以前更加困難。", "2 - 我做決定時遇到極大的困難。", "3 - 我根本無法做出任何決定。"]],
        ["無價值感 (Worthlessness)", ["0 - 我不覺得自己是沒有價值的人。", "1 - 我不覺得自己像以前那樣有價值和有用。", "2 - 與其他人相比，我覺得自己比較沒有價值。", "3 - 我覺得自己完全沒有價值。"]],
        ["活力喪失 (Loss of Energy)", ["0 - 我的精力跟以前一樣好。", "1 - 我的精力比以前少。", "2 - 我沒有足夠的精力去做很多事情。", "3 - 我沒有足夠的精力去做任何事情。"]],
        ["睡眠習慣改變 (Changes in Sleeping Pattern)", ["0 - 我的睡眠狀況沒有任何改變。", "1 - 我睡得比以前稍微多或少了一些。", "2 - 我睡得比以前多得多或少得多。", "3 - 我幾乎整天都在睡，或者比以前少睡了許多（難以入睡/早醒）。"]],
        ["易怒 (Irritability)", ["0 - 我不會比以前更容易發脾氣。", "1 - 我比以前更容易激動或發脾氣。", "2 - 我比以前容易發脾氣許多。", "3 - 我隨時隨地都感到易怒。"]],
        ["食慾改變 (Changes in Appetite)", ["0 - 我的食慾沒有任何改變。", "1 - 我的食慾比以前稍微好一點或差一點。", "2 - 我的食慾比以前好得多或差得多。", "3 - 我完全沒有食慾，或者隨時都想暴飲暴食。"]],
        ["專注力困難 (Concentration Difficulty)", ["0 - 我可以像以前一樣好地集中注意力。", "1 - 我無法像以前那樣集中注意力。", "2 - 我很難長時間集中注意力在任何事情上。", "3 - 我發現自己無法集中注意力在任何事情上。"]],
        ["疲勞或疲倦 (Tiredness or Fatigue)", ["0 - 我不會比以前更容易感到疲倦。", "1 - 我比以前更容易感到疲倦或累。", "2 - 我太累了，以至於無法做很多以前常做的事。", "3 - 我太累了，幾乎無法做任何事。"]],
        ["對性的興趣改變 (Loss of Interest in Sex)", ["0 - 我最近對性的興趣沒有改變。", "1 - 我對性的興趣比以前減少了。", "2 - 我現在對性的興趣大幅減少。", "3 - 我對性完全失去了興趣。"]]
    ].map(([text, options], i) => ({ key: `q${i + 1}`, text, options })),
    score: (a, { total }) => ({
        total, max: 63,
        level: total <= 13 ? "無或極輕微憂鬱狀況" : total <= 19 ? "輕度憂鬱狀況"
             : total <= 28 ? "中度憂鬱狀況" : "重度憂鬱狀況"
    })
},

// ---------- PSQI ----------
{
    id: 'psqi', label: 'PSQI 睡眠', name: '匹茲堡睡眠品質指數 (PSQI)', icon: '🌙',
    intro: '本問卷旨在評估您<b>過去一個月</b>的睡眠品質與習慣，包含入睡時間、睡眠時長與睡眠困擾等。',
    autoNumber: false, color: '#3f51b5', table: 'headache_logs', timeColumn: 'recorded_at',
    options: ["0 - 過去一個月中完全沒有", "1 - 每週少於 1 次", "2 - 每週 1 ~ 2 次", "3 - 每週 3 次或以上"],
    questions: [
        { key: 'bed',      type: 'time',   text: "1. 過去一個月中，您通常幾點上床睡覺？", desc: "請以 24 小時制輸入", placeholder: "例如 23:00 或 23:30" },
        { key: 'latency',  type: 'number', max: 720, text: "2. 過去一個月中，您上床後通常需要多久才能入睡（分鐘）？", placeholder: "請輸入分鐘數，如 30" },
        { key: 'wake',     type: 'time',   text: "3. 過去一個月中，您通常幾點起床？", desc: "請以 24 小時制輸入", placeholder: "例如 07:00 或 07:30" },
        { key: 'sleepHrs', type: 'number', max: 24, text: "4. 過去一個月中，您每天晚上實際睡眠的時間是多少小時？", desc: "（這可能與您躺在床上時間不同）", placeholder: "請輸入小時數，如 6.5 或 7" },
        { key: '5a', text: "5a. 過去一個月中，您是否無法在 30 分鐘內入睡？" },
        { key: '5b', text: "5b. 過去一個月中，您是否夜間易醒或早醒？" },
        { key: '5c', text: "5c. 過去一個月中，您是否夜間需要起來上廁所？" },
        { key: '5d', text: "5d. 過去一個月中，您是否感到呼吸不順暢？" },
        { key: '5e', text: "5e. 過去一個月中，您是否咳嗽或鼾聲很大？" },
        { key: '5f', text: "5f. 過去一個月中，您是否感到太冷？" },
        { key: '5g', text: "5g. 過去一個月中，您是否感到太熱？" },
        { key: '5h', text: "5h. 過去一個月中，您是否做噩夢？" },
        { key: '5i', text: "5i. 過去一個月中，您是否感到身體疼痛？" },
        { key: '5j', text: "5j. 過去一個月中，是否有其他原因影響了您的睡眠？" },
        { key: 'q6', text: "6. 過去一個月中，您對整體睡眠品質的評價如何？", options: ["非常好 (0分)", "良好 (1分)", "較差 (2分)", "非常差 (3分)"] },
        { key: 'q7', text: "7. 過去一個月中，您是否需要服用藥物來幫助入睡？" },
        { key: 'q8', text: "8. 過去一個月中，您在開車、吃飯或參加社交活動時，是否難以保持清醒？" },
        { key: 'q9', text: "9. 過去一個月中，要維持足夠的熱忱把事情做好，對您來說有多大的困難？",
          options: ["完全沒有困難 (0分)", "只有很輕微的困難 (1分)", "有些困難 (2分)", "有很大的困難 (3分)"] }
    ],
    // 實際睡眠時數不得超過躺在床上的時數
    validate: (q, v, a) => {
        if (q.key !== 'sleepHrs') return null;
        const inBed = psqiTimeInBed(a);
        return (inBed !== null && v > inBed + 0.01)
            ? `您填的實際睡眠（${v} 小時）超過躺在床上的時間（約 ${inBed.toFixed(1)} 小時）。\n請確認，或按「上一題」回頭修改上床／起床時間。`
            : null;
    },
    score: a => {
        const g = k => a[k] || 0;

        const quality = g('q6');
        const latMin = g('latency');
        const latency = band((latMin <= 15 ? 0 : latMin <= 30 ? 1 : latMin <= 60 ? 2 : 3) + g('5a'), [2, 4]);
        const hrs = g('sleepHrs');
        const duration = hrs >= 7 ? 0 : hrs >= 6 ? 1 : hrs >= 5 ? 2 : 3;

        const inBed = psqiTimeInBed(a) || 0;
        const effPct = inBed > 0 ? Math.min(100, (hrs / inBed) * 100) : 0;
        const efficiency = effPct >= 85 ? 0 : effPct >= 75 ? 1 : effPct >= 65 ? 2 : 3;

        const disturbance = band(sumKeys(a, ['5b','5c','5d','5e','5f','5g','5h','5i','5j']), [9, 18]);
        const medication = g('q7');
        const daytime = band(g('q8') + g('q9'), [2, 4]);

        const components = { quality, latency, duration, efficiency, disturbance, medication, daytime };
        const total = Object.values(components).reduce((s, v) => s + v, 0);

        return {
            total, max: 21,
            level: total > 5 ? "睡眠品質不佳 (Poor Sleeper，總分 > 5)" : "睡眠品質良好 (Good Sleeper，總分 ≤ 5)",
            lines: [
                "七大成分（各 0~3 分）：",
                `・主觀睡眠品質：${quality}`, `・入睡時間：${latency}`, `・睡眠時數：${duration}`,
                `・睡眠效率：${efficiency}`, `・睡眠困擾：${disturbance}`, `・助眠藥物：${medication}`, `・日間功能障礙：${daytime}`,
                `\n躺在床上約 ${inBed.toFixed(1)} 小時，實際睡眠 ${hrs} 小時，睡眠效率 ${effPct.toFixed(0)}%`
            ],
            extra: {
                components,
                sleep_efficiency_pct: Math.round(effPct * 10) / 10,
                time_in_bed_hours: Math.round(inBed * 10) / 10,
                sleep_hours: hrs
            }
        };
    },
    // 沿用原本 headache_logs 的欄位
    toRow: (r, a) => ({
        psqi_score: r.total,
        psqi_result: r.level,
        psqi_details: { version: 'v3', answers: a, ...r.extra }
    })
},

// ---------- ESS ----------
{
    id: 'ess', label: 'ESS 嗜睡', name: '艾普沃斯嗜睡量表 (ESS)', icon: '😴',
    intro: '本問卷共 8 題，評估您在<b>日常生活中</b>白天打瞌睡的可能性（不只是覺得累）。請以最近的生活狀況作答；若某情境近期未遇到，請想像它會如何影響您。',
    autoNumber: true, table: 'ess_scores', cutoff: 11,
    stem: "在以下情況中，您打瞌睡或睡著的可能性有多大？",
    options: ["0 - 絕不會打瞌睡", "1 - 很少會打瞌睡", "2 - 有時會打瞌睡", "3 - 很可能會打瞌睡"],
    questions: fromList('q', [
        "坐著閱讀書報時",
        "看電視時",
        "在公共場所安靜地坐著（例如劇院或會議中）",
        "搭乘汽車連續一小時沒有休息（當乘客）",
        "下午有機會躺下休息時",
        "坐著與人交談時",
        "午餐後（沒有喝酒）安靜地坐著時",
        "開車時遇到塞車，停下來等候數分鐘"
    ]),
    score: (a, { total }) => ({
        total, max: 24,
        level: total <= 10 ? "正常範圍 (Normal)" : total <= 12 ? "輕度日間過度嗜睡 (Mild)"
             : total <= 15 ? "中度日間過度嗜睡 (Moderate)" : "重度日間過度嗜睡 (Severe)"
    })
},

// ---------- DHI ----------
{
    id: 'dhi', label: 'DHI 暈眩', name: '眩暈障礙量表 (DHI)', icon: '🌀',
    intro: '共 25 題，約 5 分鐘。請依您最近的眩暈狀況，選擇「是」、「有時」或「否」。',
    autoNumber: true, table: 'dhi_scores',
    options: [{ label: "是（4 分）", score: 4 }, { label: "有時（2 分）", score: 2 }, { label: "否（0 分）", score: 0 }],
    questions: fromList('q', [
        ["抬頭看時，您的眩暈問題會加重嗎？", "P"], ["因為眩暈問題，您會感到挫折嗎？", "E"],
        ["因為眩暈問題，您會限制自己的出差或休閒旅行嗎？", "F"], ["走在超市的走道間，您的眩暈問題會加重嗎？", "P"],
        ["因為眩暈問題，您上下床會有困難嗎？", "F"], ["您的眩暈問題是否嚴重限制了社交活動，例如外出用餐、看電影、跳舞或參加聚會？", "F"],
        ["因為眩暈問題，您閱讀時會有困難嗎？", "F"], ["從事較費力的活動（如運動、跳舞、做家事）時，您的眩暈問題會加重嗎？", "P"],
        ["因為眩暈問題，您會害怕沒人陪同就離開家嗎？", "E"], ["因為眩暈問題，您曾在別人面前感到尷尬嗎？", "E"],
        ["快速轉動頭部時，您的眩暈問題會加重嗎？", "P"], ["因為眩暈問題，您會避免到高的地方嗎？", "F"],
        ["在床上翻身時，您的眩暈問題會加重嗎？", "P"], ["因為眩暈問題，您要做粗重的家事或庭院工作會有困難嗎？", "F"],
        ["因為眩暈問題，您會擔心別人以為您喝醉了嗎？", "E"], ["因為眩暈問題，您要獨自散步會有困難嗎？", "F"],
        ["走在人行道上時，您的眩暈問題會加重嗎？", "P"], ["因為眩暈問題，您要集中注意力會有困難嗎？", "E"],
        ["因為眩暈問題，您在黑暗中於家裡走動會有困難嗎？", "F"], ["因為眩暈問題，您會害怕獨自待在家嗎？", "E"],
        ["因為眩暈問題，您會覺得自己有障礙嗎？", "E"], ["您的眩暈問題是否讓您與家人或朋友的關係產生壓力？", "E"],
        ["因為眩暈問題，您會感到沮喪嗎？", "E"], ["您的眩暈問題是否影響到工作或家務責任？", "F"],
        ["彎腰時，您的眩暈問題會加重嗎？", "P"]
    ]),
    score: (a, { total, byCat }) => {
        const P = byCat.P || 0, F = byCat.F || 0, E = byCat.E || 0;
        return {
            total, max: 100,
            level: total <= 30 ? "輕度障礙 (Mild)" : total <= 60 ? "中度障礙 (Moderate)" : "重度障礙 (Severe)",
            lines: ["分項分數：", `・生理 (P)：${P} / 28`, `・功能 (F)：${F} / 36`, `・情緒 (E)：${E} / 36`],
            extra: { physical_score: P, functional_score: F, emotional_score: E }
        };
    }
},

// ---------- PSS-I ----------
{
    id: 'pssi', label: 'PSS-I 創傷', name: '創傷後壓力症狀量表 (PSS-I)', icon: '🛡️',
    intro: '共 17 題，請針對過去兩週與創傷事件相關的感受作答。此量表為篩檢工具，不等同診斷。',
    autoNumber: true, table: 'pssi_scores',
    options: ["0 - 完全沒有", "1 - 每週 1 次以下 / 輕微", "2 - 每週 2 ~ 4 次 / 中等", "3 - 每週 5 次以上 / 非常嚴重"],
    questions: [
        // 選填示範：required:false 會出現「跳過」鍵，也不會擋住完成
        { key: 'note', type: 'text', required: false, numbered: false, scored: false, label: '選填',
          text: "請先想一件讓您感到嚴重創傷的事件，以下題目請針對『過去兩週』與該事件相關的感受作答。",
          desc: "（選填）可簡短寫下事件類型，也可直接跳過。", placeholder: "例如：車禍、遭受暴力…" },
        ...fromList('q', [
            ["腦中不由自主地浮現創傷事件的畫面、想法或記憶，令您痛苦。", "B"], ["反覆做與創傷事件有關、令您痛苦的夢。", "B"],
            ["突然覺得或表現得好像創傷事件又再次發生（如閃回、彷彿身歷其境）。", "B"],
            ["接觸到會讓您聯想到創傷事件的人、事、物時，會感到強烈的心理痛苦。", "B"],
            ["接觸到會讓您聯想到創傷事件的人、事、物時，會出現身體反應（如心跳加快、冒汗、發抖）。", "B"],
            ["刻意避免去想、去談或去感受與創傷事件有關的事。", "C"], ["刻意避開會讓您想起創傷事件的活動、地點或人。", "C"],
            ["無法回想起創傷事件中的某些重要部分。", "C"], ["對以前重視或喜歡的活動，明顯失去興趣或較少參與。", "C"],
            ["覺得與他人疏離、有距離感，或像是被隔離在外。", "C"], ["情感變得麻木，難以感受愛、喜悅等情緒。", "C"],
            ["覺得未來一片黯淡（如不覺得會有事業、婚姻、子女或正常的壽命）。", "C"],
            ["難以入睡或難以維持睡眠。", "D"], ["容易煩躁，或有突如其來的怒氣。", "D"], ["難以集中注意力。", "D"],
            ["對周遭環境過度警戒、緊繃，總覺得要提防什麼。", "D"], ["容易被嚇到，或對突然的聲響、動靜反應過度。", "D"]
        ])
    ],
    score: (a, { total, byCat }) => {
        const B = byCat.B || 0, C = byCat.C || 0, D = byCat.D || 0;
        const cutoff = 15; // 研究中常用的篩檢切點（約 14~15），可自行調整
        return {
            total, max: 51,
            level: total >= cutoff ? `達篩檢切點 (≥ ${cutoff})，建議尋求專業評估` : `未達篩檢切點 (< ${cutoff})`,
            lines: ["分項分數：", `・重新經驗 (B)：${B} / 15`, `・逃避與麻木 (C)：${C} / 21`, `・過度警覺 (D)：${D} / 15`],
            extra: { reexperiencing_score: B, avoidance_score: C, arousal_score: D, trauma_note: a.note || null } // 敏感資料，請確認 RLS
        };
    }
},

// ---------- PHQ-9 ----------
{
    id: 'phq9', label: 'PHQ-9 憂鬱', name: 'PHQ-9 憂鬱症篩檢', icon: '🌧️',
    intro: '本問卷共 9 題，評估您<b>過去兩週（包含今天）</b>受憂鬱症狀困擾的程度。',
    autoNumber: true, table: 'phq9_scores', cutoff: 10,
    stem: "過去兩週，您有多常被以下問題困擾？",
    options: FREQ_2WEEKS,
    crisis: { key: 'q9', min: 1, text: "\n\n⚠️ 您在第 9 題提到有不如死掉或傷害自己的念頭。您不需要獨自承受，" + HOTLINE_TEXT },
    questions: [
        ...fromList('q', [
            "做事時提不起勁或沒有樂趣", "感到心情低落、沮喪或絕望", "入睡困難、睡不安穩或睡眠過多", "覺得疲倦或沒有活力",
            "食慾不振或吃太多", "覺得自己很糟，或覺得自己很失敗，或讓自己或家人失望", "對事物專注有困難，例如閱讀報紙或看電視時",
            "動作或說話速度緩慢到別人已經察覺？或正好相反——煩躁或坐立不安、動來動去的情況比平常更嚴重",
            "有不如死掉或用某種方式傷害自己的念頭"
        ]),
        { ...FUNC_QUESTION, showIf: a => sumKeys(a, ['q1','q2','q3','q4','q5','q6','q7','q8','q9']) > 0 }
    ],
    score: (a, { total }) => ({
        total, max: 27,
        level: total <= 4 ? "無或極輕微憂鬱 (Minimal)" : total <= 9 ? "輕度憂鬱 (Mild)" : total <= 14 ? "中度憂鬱 (Moderate)"
             : total <= 19 ? "中重度憂鬱 (Moderately Severe)" : "重度憂鬱 (Severe)",
        lines: funcLine(a),
        extra: { functional_difficulty: a.func ?? null }
    })
},

// ---------- GAD-7 ----------
{
    id: 'gad7', label: 'GAD-7 焦慮', name: 'GAD-7 焦慮症篩檢', icon: '😰',
    intro: '本問卷共 7 題，評估您<b>過去兩週（包含今天）</b>受焦慮症狀困擾的程度。',
    autoNumber: true, table: 'gad7_scores', cutoff: 10,
    stem: "過去兩週，您有多常被以下問題困擾？",
    options: FREQ_2WEEKS,
    questions: [
        ...fromList('q', [
            "感到緊張、焦慮或煩躁", "無法停止或控制擔憂", "對各種事情過度擔憂", "很難放鬆",
            "坐立不安，難以靜坐", "變得容易生氣或煩躁", "感到害怕，好像有什麼可怕的事會發生"
        ]),
        { ...FUNC_QUESTION, showIf: a => sumKeys(a, ['q1','q2','q3','q4','q5','q6','q7']) > 0 }
    ],
    score: (a, { total }) => ({
        total, max: 21,
        level: total <= 4 ? "極輕微焦慮 (Minimal)" : total <= 9 ? "輕度焦慮 (Mild)" : total <= 14 ? "中度焦慮 (Moderate)" : "重度焦慮 (Severe)",
        lines: funcLine(a),
        extra: { functional_difficulty: a.func ?? null }
    })
}

];

// PSQI 輔助：躺在床上的時數（可跨午夜）
function psqiTimeInBed(a) {
    const bed = QuizEngine.parseClock(a.bed), wake = QuizEngine.parseClock(a.wake);
    if (bed === null || wake === null) return null;
    let diff = wake - bed;
    if (diff <= 0) diff += 1440;
    return diff / 60;
}

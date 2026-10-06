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

let currentQuestionIndex = 0;
let baiAnswers = new Array(21).fill(null); // 紀錄 21 題答案 (0~3)

// 開始問卷
function startBaiQuiz() {
    currentQuestionIndex = 0;
    baiAnswers.fill(null);
    document.getElementById('bai-start-card').style.display = 'none';
    document.getElementById('bai-quiz-card').style.display = 'block';
    renderBaiQuestion();
}

// 渲染當前題目與進度
function renderBaiQuestion() {
    const qTitle = document.getElementById('bai-question-title');
    const pText = document.getElementById('bai-progress-text');
    const pPercent = document.getElementById('bai-progress-percent');
    const pBar = document.getElementById('bai-progress-bar');
    const prevBtn = document.getElementById('bai-prev-btn');

    // 1. 更新題目內容
    qTitle.innerText = baiQuestions[currentQuestionIndex];

    // 2. 更新進度條
    const currentNum = currentQuestionIndex + 1;
    const percent = Math.round((currentNum / 21) * 100);
    pText.innerText = `問題 ${currentNum} / 21`;
    pPercent.innerText = `${percent}%`;
    pBar.style.width = `${percent}%`;

    // 3. 上一題按鈕顯示控制
    prevBtn.style.display = currentQuestionIndex > 0 ? 'inline-block' : 'none';
}

// 點擊選項答案
function answerBaiQuestion(score) {
    // 儲存當前題目的分數
    baiAnswers[currentQuestionIndex] = score;

    if (currentQuestionIndex < 20) {
        // 進入下一題
        currentQuestionIndex++;
        renderBaiQuestion();
    } else {
        // 21 題全部答完，進行總分計算與彈窗確認
        finishBaiQuiz();
    }
}

// 上一題
function prevBaiQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderBaiQuestion();
    }
}

// 完成問卷：計算分數、彈窗 confirmation 與存檔
async function finishBaiQuiz() {
    // 1. 計算總分 (0 ~ 63 分)
    const totalScore = baiAnswers.reduce((acc, cur) => acc + (cur || 0), 0);

    // 2. 判斷焦慮程度等級
    let levelText = "";
    if (totalScore <= 7) levelText = "極輕微焦慮 (Normal/Minimal)";
    else if (totalScore <= 15) levelText = "輕度焦慮 (Mild)";
    else if (totalScore <= 25) levelText = "中度焦慮 (Moderate)";
    else levelText = "重度焦慮 (Severe)";

    // 3. 彈窗讓使用者確認
    const isConfirmed = confirm(
        `📋 BAI 評估已完成！\n\n` +
        `您的總分為：${totalScore} 分\n` +
        `評估結果：${levelText}\n\n` +
        `點擊「確定」將分數記錄至系統。`
    );

    if (isConfirmed) {
        // 4. 寫入 Supabase 資料庫
        await saveBaiScoreToSupabase(totalScore, levelText);
        
        // 重置 UI 回到起始畫面
        document.getElementById('bai-quiz-card').style.display = 'none';
        document.getElementById('bai-start-card').style.display = 'block';
    }
}

// ==========================================
// 🌙 PSQI 睡眠品質量表邏輯
// ==========================================
// ==========================================
// 🌙 PSQI 正式計分版（取代原本的 PSQI 邏輯）
// ==========================================
// 使用方式：把原檔中的以下四項換成本檔版本
//   psqiQuestions / submitPsqiQuestion / finishPsqiQuiz / savePsqiScoreToSupabase
// 以下維持原樣不用動：psqiDefaultOptions、startPsqiQuiz、renderPsqiQuestion、prevPsqiQuestion
// 注意：`let psqiAnswers = new Array(psqiQuestions.length)` 必須在新的 psqiQuestions 之後宣告。

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

// ---------- 點擊「下一題 / 完成」（含輸入驗證） ----------
function submitPsqiQuestion() {
    const qData = psqiQuestions[currentPsqiIndex];
    const inputEl = document.getElementById('psqi-input-field');
    let answerVal = null;

    if (qData.type === 'time') {
        const mins = parseClockToMinutes(inputEl ? inputEl.value : '');
        if (mins === null) {
            alert("請輸入有效的時間（24 小時制），例如 23:30 或 07:00。");
            return;
        }
        answerVal = formatMinutes(mins);
    } else if (qData.type === 'number') {
        const num = parseFloat(inputEl ? inputEl.value : '');
        if (!isFinite(num) || num < 0 || num > qData.max) {
            alert(`請輸入 0 ~ ${qData.max} 之間的數字。`);
            return;
        }
        // 實際睡眠時數不應超過躺在床上的時數
        if (qData.key === 'sleepHrs') {
            const inBed = calcTimeInBedHours();
            if (inBed !== null && num > inBed + 0.01) {
                alert(`您填的實際睡眠（${num} 小時）超過躺在床上的時間（約 ${inBed.toFixed(1)} 小時）。\n請確認，或按「上一題」回頭修改上床／起床時間。`);
                return;
            }
        }
        answerVal = num;
    } else {
        const selected = document.querySelector('input[name="psqi-option"]:checked');
        if (!selected) {
            alert("請先選擇一個程度選項。");
            return;
        }
        answerVal = parseInt(selected.value);
    }

    psqiAnswers[currentPsqiIndex] = answerVal;

    if (currentPsqiIndex < psqiQuestions.length - 1) {
        currentPsqiIndex++;
        renderPsqiQuestion();
    } else {
        finishPsqiQuiz();
    }
}

// ---------- 完成：顯示結果與存檔 ----------
async function finishPsqiQuiz() {
    const r = calcPsqiScores();
    const c = r.components;
    const qualityText = r.total > 5
        ? "睡眠品質不佳 (Poor Sleeper，總分 > 5)"
        : "睡眠品質良好 (Good Sleeper，總分 ≤ 5)";

    const isConfirmed = confirm(
        `🌙 PSQI 睡眠品質評估已完成！\n\n` +
        `PSQI 總分：${r.total} / 21\n` +
        `評估結果：${qualityText}\n\n` +
        `七大成分（各 0~3 分）：\n` +
        `・主觀睡眠品質：${c.quality}\n` +
        `・入睡時間：${c.latency}\n` +
        `・睡眠時數：${c.duration}\n` +
        `・睡眠效率：${c.efficiency}\n` +
        `・睡眠困擾：${c.disturbance}\n` +
        `・助眠藥物：${c.medication}\n` +
        `・日間功能障礙：${c.daytime}\n\n` +
        `躺在床上約 ${r.timeInBed.toFixed(1)} 小時，實際睡眠 ${r.sleepHours} 小時，睡眠效率 ${r.efficiencyPct.toFixed(0)}%\n\n` +
        `此量表為篩檢工具，不等同診斷。\n` +
        `點擊「確定」將睡眠評估紀錄寫入系統。`
    );

    if (isConfirmed) {
        await savePsqiScoreToSupabase(r, qualityText);
        document.getElementById('psqi-quiz-card').style.display = 'none';
        document.getElementById('psqi-start-card').style.display = 'block';
    }
}

// ---------- 寫入 Supabase ----------
// 注意：psqi_details 現在是物件（原本是答案陣列），舊資料與新資料的格式不同
async function savePsqiScoreToSupabase(r, qualityText) {
    try {
        const { error } = await supabase
            .from('headache_logs') // 或獨立表 'psqi_evaluations'
            .insert([{
                user_id: window.appState?.userId || null,
                psqi_score: r.total,
                psqi_result: qualityText,
                psqi_details: {
                    version: 'v2',
                    answers: psqiAnswers,
                    components: r.components,
                    sleep_efficiency_pct: Math.round(r.efficiencyPct * 10) / 10,
                    time_in_bed_hours: Math.round(r.timeInBed * 10) / 10,
                    sleep_hours: r.sleepHours
                },
                recorded_at: new Date().toISOString()
            }]);

        if (error) throw error;
        alert("✅ PSQI 睡眠紀錄已成功儲存！");
    } catch (err) {
        console.error("❌ 寫入 PSQI 分數失敗：", err);
        alert("儲存失敗，請檢查網路連線。");
    }
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

let currentBdiIndex = 0;
let bdiScores = []; // 儲存使用者的答案分頁 (0-3 分)

// 1. 開始評估
function startBdiQuiz() {
    currentBdiIndex = 0;
    bdiScores = [];
    document.getElementById("bdi-start-card").style.display = "none";
    document.getElementById("bdi-quiz-card").style.display = "block";
    renderBdiQuestion();
}

// 2. 動態渲染題目與專屬選項
function renderBdiQuestion() {
    const q = bdiQuestions[currentBdiIndex];
    
    // 更新題目與進度
    document.getElementById("bdi-question-title").innerText = q.title;
    document.getElementById("bdi-progress-text").innerText = `問題 ${currentBdiIndex + 1} / ${bdiQuestions.length}`;
    
    const percent = Math.round(((currentBdiIndex + 1) / bdiQuestions.length) * 100);
    document.getElementById("bdi-progress-percent").innerText = `${percent}%`;
    document.getElementById("bdi-progress-bar").style.width = `${percent}%`;

    // 動態建置 4 個選項按鈕
    const container = document.getElementById("bdi-options-container");
    container.innerHTML = ""; // 清空舊選項

    q.options.forEach((optText, score) => {
        const btn = document.createElement("button");
        btn.className = "bdi-opt-btn";
        btn.innerText = optText;
        btn.style.cssText = "padding: 12px; font-size: 15px; text-align: left; cursor: pointer; border: 1px solid #ccc; border-radius: 6px; background-color: #fff; transition: background 0.2s;";
        
        // 懸停效果
        btn.onmouseover = () => btn.style.backgroundColor = "#f0f0f0";
        btn.onmouseout = () => btn.style.backgroundColor = "#fff";
        
        btn.onclick = () => answerBdiQuestion(score);
        container.appendChild(btn);
    });

    // 控制上一題按鈕顯示狀態
    const prevBtn = document.getElementById("bdi-prev-btn");
    prevBtn.style.display = currentBdiIndex > 0 ? "inline-block" : "none";
}

// 3. 記錄答案並推進下一題
function answerBdiQuestion(score) {
    bdiScores[currentBdiIndex] = score;

    if (currentBdiIndex < bdiQuestions.length - 1) {
        currentBdiIndex++;
        renderBdiQuestion();
    } else {
        finishBdiQuiz();
    }
}

// 4. 返回上一題
function prevBdiQuestion() {
    if (currentBdiIndex > 0) {
        currentBdiIndex--;
        renderBdiQuestion();
    }
}

// 5. 結束測驗，計算總分
function finishBdiQuiz() {
    const totalScore = bdiScores.reduce((sum, s) => sum + s, 0);
    
    let resultText = "";
    if (totalScore <= 13) {
        resultText = "無或極輕微憂鬱狀況";
    } else if (totalScore <= 19) {
        resultText = "輕度憂鬱狀況";
    } else if (totalScore <= 28) {
        resultText = "中度憂鬱狀況";
    } else {
        resultText = "重度憂鬱狀況";
    }

    alert(`評估完成！\n您的 BDI-II 總分是：${totalScore} 分\n評估結果：${resultText}`);
    
    // 您可在這裡接續跳轉至結果頁面或顯示結果卡片
}
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

const DHI_TOTAL = dhiQuestions.length; // 25

let currentDhiIndex = 0;
let dhiAnswers = new Array(DHI_TOTAL).fill(null); // 紀錄 25 題答案 (0 / 2 / 4)

// 開始問卷
function startDhiQuiz() {
    currentDhiIndex = 0;
    dhiAnswers.fill(null);
    document.getElementById('dhi-start-card').style.display = 'none';
    document.getElementById('dhi-quiz-card').style.display = 'block';
    renderDhiQuestion();
}

// 渲染當前題目與進度
function renderDhiQuestion() {
    const qTitle = document.getElementById('dhi-question-title');
    const pText = document.getElementById('dhi-progress-text');
    const pPercent = document.getElementById('dhi-progress-percent');
    const pBar = document.getElementById('dhi-progress-bar');
    const prevBtn = document.getElementById('dhi-prev-btn');

    // 1. 題目內容
    qTitle.innerText = dhiQuestions[currentDhiIndex].text;

    // 2. 進度條
    const currentNum = currentDhiIndex + 1;
    const percent = Math.round((currentNum / DHI_TOTAL) * 100);
    pText.innerText = `問題 ${currentNum} / ${DHI_TOTAL}`;
    pPercent.innerText = `${percent}%`;
    pBar.style.width = `${percent}%`;

    // 3. 上一題按鈕
    prevBtn.style.display = currentDhiIndex > 0 ? 'inline-block' : 'none';

    // 4. 若已作答過，標示先前選擇（按鈕需帶 data-score="0|2|4" 與 class="dhi-option-btn"）
    document.querySelectorAll('.dhi-option-btn').forEach(btn => {
        const selected = dhiAnswers[currentDhiIndex] === parseInt(btn.dataset.score);
        btn.style.outline = selected ? '3px solid #3f51b5' : 'none';
    });
}

// 點擊選項答案 (score: 4=是, 2=有時, 0=否)
function answerDhiQuestion(score) {
    dhiAnswers[currentDhiIndex] = score;

    if (currentDhiIndex < DHI_TOTAL - 1) {
        currentDhiIndex++;
        renderDhiQuestion();
    } else {
        finishDhiQuiz();
    }
}

// 上一題
function prevDhiQuestion() {
    if (currentDhiIndex > 0) {
        currentDhiIndex--;
        renderDhiQuestion();
    }
}

// 計算總分與分項分數
function calcDhiScores() {
    const sub = { P: 0, F: 0, E: 0 };
    let total = 0;
    dhiQuestions.forEach((q, i) => {
        const s = dhiAnswers[i] || 0;
        sub[q.cat] += s;
        total += s;
    });
    return { total, physical: sub.P, functional: sub.F, emotional: sub.E };
}

// 判斷眩暈障礙程度 (Jacobson & Newman, 1990)
function getDhiLevel(total) {
    if (total <= 30) return "輕度障礙 (Mild)";
    if (total <= 60) return "中度障礙 (Moderate)";
    return "重度障礙 (Severe)";
}

// 完成問卷：計算分數、彈窗確認與存檔
async function finishDhiQuiz() {
    const { total, physical, functional, emotional } = calcDhiScores();
    const levelText = getDhiLevel(total);

    const isConfirmed = confirm(
        `🌀 DHI 評估已完成！\n\n` +
        `總分：${total} / 100 分\n` +
        `評估結果：${levelText}\n\n` +
        `分項分數：\n` +
        `・生理 (P)：${physical} / 28\n` +
        `・功能 (F)：${functional} / 36\n` +
        `・情緒 (E)：${emotional} / 36\n\n` +
        `點擊「確定」將分數記錄至系統。`
    );

    if (isConfirmed) {
        await saveDhiScoreToSupabase(total, levelText, { physical, functional, emotional });

        document.getElementById('dhi-quiz-card').style.display = 'none';
        document.getElementById('dhi-start-card').style.display = 'block';
    }
}

// 存檔至 Supabase（請依你的資料表欄位調整；supabase 為你已初始化的 client）
async function saveDhiScoreToSupabase(totalScore, levelText, subScores) {
    const { error } = await supabase.from('dhi_scores').insert({
        total_score: totalScore,
        level: levelText,
        physical_score: subScores.physical,
        functional_score: subScores.functional,
        emotional_score: subScores.emotional,
        answers: dhiAnswers,
        created_at: new Date().toISOString()
    });
    if (error) {
        console.error('DHI 存檔失敗：', error);
        alert('存檔失敗，請稍後再試。');
    } else {
        alert('✅ 已成功記錄 DHI 分數。');
    }
}

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

const PSSI_TOTAL = pssiQuestions.length; // 17

let currentPssiIndex = 0;
let pssiAnswers = new Array(PSSI_TOTAL).fill(null); // 紀錄 17 題答案 (0~3)
let pssiTraumaNote = ""; // 受測者描述的創傷事件（選填，僅供自己參考）

// 開始問卷
function startPssiQuiz() {
    // 先確認作答的參照事件，這是 PSS-I 的前提
    const note = prompt(
        "請先想一件讓您感到嚴重創傷的事件，以下題目請針對『過去兩週』與該事件相關的感受作答。\n\n" +
        "（可簡短寫下事件類型，也可留白直接開始）"
    );
    if (note === null) return; // 按取消則不開始
    pssiTraumaNote = note.trim();

    currentPssiIndex = 0;
    pssiAnswers.fill(null);
    document.getElementById('pssi-start-card').style.display = 'none';
    document.getElementById('pssi-quiz-card').style.display = 'block';
    renderPssiQuestion();
}

// 渲染當前題目與進度
function renderPssiQuestion() {
    const qTitle = document.getElementById('pssi-question-title');
    const pText = document.getElementById('pssi-progress-text');
    const pPercent = document.getElementById('pssi-progress-percent');
    const pBar = document.getElementById('pssi-progress-bar');
    const prevBtn = document.getElementById('pssi-prev-btn');

    qTitle.innerText = pssiQuestions[currentPssiIndex].text;

    const currentNum = currentPssiIndex + 1;
    const percent = Math.round((currentNum / PSSI_TOTAL) * 100);
    pText.innerText = `問題 ${currentNum} / ${PSSI_TOTAL}`;
    pPercent.innerText = `${percent}%`;
    pBar.style.width = `${percent}%`;

    prevBtn.style.display = currentPssiIndex > 0 ? 'inline-block' : 'none';

    // 標示先前選擇（按鈕需帶 class="pssi-option-btn" 與 data-score="0~3"）
    document.querySelectorAll('.pssi-option-btn').forEach(btn => {
        const selected = pssiAnswers[currentPssiIndex] === parseInt(btn.dataset.score);
        btn.style.outline = selected ? '3px solid #3f51b5' : 'none';
    });
}

// 點擊選項答案 (score: 0~3)
function answerPssiQuestion(score) {
    pssiAnswers[currentPssiIndex] = score;

    if (currentPssiIndex < PSSI_TOTAL - 1) {
        currentPssiIndex++;
        renderPssiQuestion();
    } else {
        finishPssiQuiz();
    }
}

// 上一題
function prevPssiQuestion() {
    if (currentPssiIndex > 0) {
        currentPssiIndex--;
        renderPssiQuestion();
    }
}

// 計算總分與分項分數
function calcPssiScores() {
    const sub = { B: 0, C: 0, D: 0 };
    let total = 0;
    pssiQuestions.forEach((q, i) => {
        const s = pssiAnswers[i] || 0;
        sub[q.cat] += s;
        total += s;
    });
    return { total, reexperiencing: sub.B, avoidance: sub.C, arousal: sub.D };
}

// 判斷結果（無官方嚴重度分級，這裡只用篩檢切點）
function getPssiLevel(total) {
    return total >= PSSI_CUTOFF
        ? `達篩檢切點 (≥ ${PSSI_CUTOFF})，建議尋求專業評估`
        : `未達篩檢切點 (< ${PSSI_CUTOFF})`;
}

// 完成問卷：計算分數、彈窗確認與存檔
async function finishPssiQuiz() {
    const { total, reexperiencing, avoidance, arousal } = calcPssiScores();
    const levelText = getPssiLevel(total);

    const isConfirmed = confirm(
        `🛡️ PSS-I 評估已完成！\n\n` +
        `總分：${total} / 51 分\n` +
        `結果：${levelText}\n\n` +
        `分項分數：\n` +
        `・重新經驗 (B)：${reexperiencing} / 15\n` +
        `・逃避與麻木 (C)：${avoidance} / 21\n` +
        `・過度警覺 (D)：${arousal} / 15\n\n` +
        `此量表為篩檢工具，不等同診斷。\n` +
        `點擊「確定」將分數記錄至系統。`
    );

    if (isConfirmed) {
        await savePssiScoreToSupabase(total, levelText, { reexperiencing, avoidance, arousal });

        document.getElementById('pssi-quiz-card').style.display = 'none';
        document.getElementById('pssi-start-card').style.display = 'block';
    }
}

// 存檔至 Supabase（請依你的資料表欄位調整；supabase 為你已初始化的 client）
async function savePssiScoreToSupabase(totalScore, levelText, subScores) {
    const { error } = await supabase.from('pssi_scores').insert({
        total_score: totalScore,
        level: levelText,
        reexperiencing_score: subScores.reexperiencing,
        avoidance_score: subScores.avoidance,
        arousal_score: subScores.arousal,
        answers: pssiAnswers,
        trauma_note: pssiTraumaNote, // 敏感資料，建議確認 RLS 與加密政策
        created_at: new Date().toISOString()
    });
    if (error) {
        console.error('PSS-I 存檔失敗：', error);
        alert('存檔失敗，請稍後再試。');
    } else {
        alert('✅ 已成功記錄 PSS-I 分數。');
    }
}


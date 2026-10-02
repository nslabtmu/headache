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

// PSQI 18 題題目結構
const psqiQuestions = [
    { type: 'time', title: "1. 過去一個月中，您通常幾點上床睡覺？", placeholder: "例如 23:00 或 23:30" },
    { type: 'number', title: "2. 過去一個月中，您上床後通常需要多久才能入睡（分鐘）？", placeholder: "請輸入分鐘數，如 30" },
    { type: 'time', title: "3. 過去一個月中，您通常幾點起床？", placeholder: "例如 07:00 或 07:30" },
    { type: 'number', title: "4. 過去一個月中，您每天晚上實際睡眠的時間是多少小時？", desc: "（這可能與您躺在床上時間不同）", placeholder: "請輸入小時數，如 6.5 或 7" },
    
    // 第 5 題（5a ~ 5j 睡眠困擾）
    { type: 'choice', title: "5a. 過去一個月中，您是否無法在 30 分鐘內入睡？" },
    { type: 'choice', title: "5b. 過去一個月中，您是否夜間易醒或早醒？" },
    { type: 'choice', title: "5c. 過去一個月中，您是否夜間需要起來上廁所？" },
    { type: 'choice', title: "5d. 過去一個月中，您是否感到呼吸不順暢？" },
    { type: 'choice', title: "5e. 過去一個月中，您是否咳嗽或鼾聲很大？" },
    { type: 'choice', title: "5f. 過去一個月中，您是否感到太冷？" },
    { type: 'choice', title: "5g. 過去一個月中，您是否感到太熱？" },
    { type: 'choice', title: "5h. 過去一個月中，您是否做噩夢？" },
    { type: 'choice', title: "5i. 過去一個月中，您是否感到身體疼痛？" },
    
    // 第 6 ~ 9 題
    { type: 'choice', title: "6. 過去一個月中，您對整體睡眠品質的評價如何？", customOptions: ["非常好 (0分)", "良好 (1分)", "較差 (2分)", "非常差 (3分)"] },
    { type: 'choice', title: "7. 過去一個月中，您是否需要服用藥物來幫助入睡？" },
    { type: 'choice', title: "8. 過去一個月中，您在開車、吃飯或參加社交活動時，是否難以保持清醒？" },
    { type: 'choice', title: "9. 過去一個月中，您在完成事情上是否感到精力/動力不足？" }
];

// 四分格標準選項
const psqiDefaultOptions = [
    "0 - 過去一個月中完全沒有",
    "1 - 每週少於 1 次",
    "2 - 每週 1 ~ 2 次",
    "3 - 每週 3 次或以上"
];

let currentPsqiIndex = 0;
let psqiAnswers = new Array(psqiQuestions.length).fill(null);

// 開始 PSQI 測驗
function startPsqiQuiz() {
    currentPsqiIndex = 0;
    psqiAnswers.fill(null);
    document.getElementById('psqi-start-card').style.display = 'none';
    document.getElementById('psqi-quiz-card').style.display = 'block';
    renderPsqiQuestion();
}

// 渲染題目
function renderPsqiQuestion() {
    const qData = psqiQuestions[currentPsqiIndex];
    const qTitle = document.getElementById('psqi-question-title');
    const qDesc = document.getElementById('psqi-question-desc');
    const inputContainer = document.getElementById('psqi-input-container');
    const pText = document.getElementById('psqi-progress-text');
    const pPercent = document.getElementById('psqi-progress-percent');
    const pBar = document.getElementById('psqi-progress-bar');
    const prevBtn = document.getElementById('psqi-prev-btn');
    const nextBtn = document.getElementById('psqi-next-btn');

    // 1. 標題與描述
    qTitle.innerText = qData.title;
    if (qData.desc) {
        qDesc.innerText = qData.desc;
        qDesc.style.display = 'block';
    } else {
        qDesc.style.display = 'none';
    }

    // 2. 進度條
    const currentNum = currentPsqiIndex + 1;
    const totalNum = psqiQuestions.length;
    const percent = Math.round((currentNum / totalNum) * 100);
    pText.innerText = `問題 ${currentNum} / ${totalNum}`;
    pPercent.innerText = `${percent}%`;
    pBar.style.width = `${percent}%`;

    // 3. 根據題目類型生成對應輸入介面
    inputContainer.innerHTML = '';
    const prevAns = psqiAnswers[currentPsqiIndex];

    if (qData.type === 'time' || qData.type === 'number') {
        const inputType = qData.type === 'time' ? 'text' : 'number';
        inputContainer.innerHTML = `
            <input type="${inputType}" id="psqi-input-field" value="${prevAns !== null ? prevAns : ''}" 
                   placeholder="${qData.placeholder}" 
                   style="width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box;">
        `;
    } else if (qData.type === 'choice') {
        const options = qData.customOptions || psqiDefaultOptions;
        let html = `<div style="display: flex; flex-direction: column; gap: 12px;">`;
        options.forEach((optText, idx) => {
            const isChecked = prevAns === idx ? 'checked' : '';
            html += `
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; background: #f9f9f9;">
                    <input type="radio" name="psqi-option" value="${idx}" ${isChecked}> 
                    <span>${optText}</span>
                </label>
            `;
        });
        html += `</div>`;
        inputContainer.innerHTML = html;
    }

    // 4. 控制按鈕
    prevBtn.style.display = currentPsqiIndex > 0 ? 'inline-block' : 'none';
    if (currentPsqiIndex === totalNum - 1) {
        nextBtn.innerText = "🎉 完成評估";
        nextBtn.style.background = "#2196F3";
    } else {
        nextBtn.innerText = "下一題 →";
        nextBtn.style.background = "#3f51b5";
    }
}

// 點擊「下一題 / 完成」
function submitPsqiQuestion() {
    const qData = psqiQuestions[currentPsqiIndex];
    let answerVal = null;

    if (qData.type === 'time' || qData.type === 'number') {
        const inputEl = document.getElementById('psqi-input-field');
        if (!inputEl || !inputEl.value.trim()) {
            alert("請填寫此題答案後再進行下一題。");
            return;
        }
        answerVal = inputEl.value.trim();
    } else if (qData.type === 'choice') {
        const selected = document.querySelector('input[name="psqi-option"]:checked');
        if (!selected) {
            alert("請先選擇一個程度選項。");
            return;
        }
        answerVal = parseInt(selected.value);
    }

    // 儲存答案
    psqiAnswers[currentPsqiIndex] = answerVal;

    if (currentPsqiIndex < psqiQuestions.length - 1) {
        currentPsqiIndex++;
        renderPsqiQuestion();
    } else {
        finishPsqiQuiz();
    }
}

// 上一題
function prevPsqiQuestion() {
    if (currentPsqiIndex > 0) {
        currentPsqiIndex--;
        renderPsqiQuestion();
    }
}

// 計算 PSQI 總分與彈窗確認
async function finishPsqiQuiz() {
    // 簡單總分估計演算法（針對選擇題部分估算）
    let choiceTotal = 0;
    psqiQuestions.forEach((q, idx) => {
        if (q.type === 'choice' && typeof psqiAnswers[idx] === 'number') {
            choiceTotal += psqiAnswers[idx];
        }
    });

    let qualityText = "";
    if (choiceTotal <= 5) qualityText = "睡眠品質良好 (Good Sleep)";
    else qualityText = "睡眠品質較佳/顯著困擾 (Poor Sleep)";

    const isConfirmed = confirm(
        `🌙 PSQI 睡眠品質評估已完成！\n\n` +
        `填寫結果備註：\n` +
        `• 入睡時間：約 ${psqiAnswers[0]}\n` +
        `• 需入睡分鐘：${psqiAnswers[1]} 分鐘\n` +
        `• 實際睡眠：${psqiAnswers[3]} 小時\n` +
        `• 困擾指標估算：${choiceTotal} 分 (${qualityText})\n\n` +
        `點擊「確定」將睡眠評估紀錄寫入系統。`
    );

    if (isConfirmed) {
        await savePsqiScoreToSupabase(choiceTotal, qualityText);
        document.getElementById('psqi-quiz-card').style.display = 'none';
        document.getElementById('psqi-start-card').style.display = 'block';
    }
}

// 寫入 Supabase
async function savePsqiScoreToSupabase(score, qualityText) {
    try {
        const { data, error } = await supabase
            .from('headache_logs') // 或獨立表 'psqi_evaluations'
            .insert([{
                user_id: window.appState?.userId || null,
                psqi_score: score,
                psqi_result: qualityText,
                psqi_details: psqiAnswers, // 備份 18 題完整的填寫資料 (JSON)
                recorded_at: new Date().toISOString()
            }]);

        if (error) throw error;
        alert("✅ PSQI 睡眠紀錄已成功儲存！");
    } catch (err) {
        console.error("❌ 寫入 PSQI 分數失敗：", err);
        alert("儲存失敗，請檢查網路連線。");
    }
}

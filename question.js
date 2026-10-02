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

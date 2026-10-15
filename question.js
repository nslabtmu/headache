// ==========================================
// question.js — 統一量表引擎（中英雙語、填完自動存檔）
// 需求：頁面有 #quiz-picker 與 #quiz-root；Supabase client 見 getDb()
// 資料表：quiz_results（quiz, total_score, level, details, answers, user_id, created_at）
// ==========================================
(function () {
'use strict';

// ---------- 語言 ----------
const T = (zh, en) => ({ zh, en });
function lang() {
    const b = document.querySelector('.lang-btn.active[data-lang]');
    const v = b ? b.dataset.lang : (document.documentElement.lang || 'zh');
    return /^en/i.test(v) ? 'en' : 'zh';
}
const tx = v => (v && typeof v === 'object' && !Array.isArray(v)) ? (v[lang()] ?? v.zh) : v;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const UI = {
    start: T('開始評估', 'Start'), cancel: T('取消', 'Cancel'), close: T('關閉', 'Close'),
    prev: T('← 上一題', '← Back'), next: T('下一題 →', 'Next →'), finish: T('完成', 'Finish'),
    skip: T('跳過', 'Skip'), retake: T('重新作答', 'Retake'), retry: T('重試儲存', 'Retry save'),
    saving: T('儲存中…', 'Saving…'), saved: T('✅ 已自動儲存', '✅ Saved automatically'),
    saveFail: T('儲存失敗：', 'Save failed: '),
    done: T('評估已完成', 'Assessment complete'), result: T('評估結果：', 'Result: '),
    disclaimer: T('此量表為篩檢工具，不等同診斷。', 'This is a screening tool, not a diagnosis.'),
    qn: (k, n) => T(`問題 ${k} / ${n}`, `Question ${k} / ${n}`),
    cutoff: c => T(`分數已達 ${c} 分以上的篩檢切點，建議尋求專業評估。`, `Your score is at or above the screening cutoff (${c}). Consider seeking a professional assessment.`),
    badTime: T('請輸入有效的時間（24 小時制），例如 23:30 或 07:00。', 'Please enter a valid time in 24-hour format, e.g. 23:30 or 07:00.'),
    badNum: m => T(`請輸入 0 ~ ${m} 之間的數字。`, `Please enter a number between 0 and ${m}.`),
    noClient: T('找不到 Supabase client（請在 config.js 設定 window.supabaseClient）', 'Supabase client not found (set window.supabaseClient in config.js)')
    viewScore: T('查看分數', 'View my score'),
    doneMsg: T('您已完成此問卷，感謝作答。', 'You have answered all questions. Thank you.'),
};

const HOTLINE = T(
    '請盡快聯絡身邊信任的人，或撥打 1925（安心專線，24 小時）、1995（生命線）、1980（張老師）。若有立即危險，請撥 110 或 119。',
    'Please reach out to someone you trust, or call 1925 (24-hr mental health hotline), 1995 (Lifeline) or 1980 (Teacher Chang) in Taiwan. If you are in immediate danger, call 110 or 119.'
);

// ---------- 共用資料工具 ----------
// S(['中','en'], ...) → 選項（索引即分數，自動加上 "n - " 前綴）
const S = (...pairs) => pairs.map(([zh, en], i) => ({ label: T(`${i} - ${zh}`, `${i} - ${en}`), score: i }));
const list = (prefix, arr) => arr.map(([zh, en, cat], i) => ({ key: prefix + (i + 1), text: T(zh, en), ...(cat ? { cat } : {}) }));
const sumKeys = (a, keys) => keys.reduce((s, k) => s + (a[k] || 0), 0);
const band = (sum, [t1, t2]) => sum === 0 ? 0 : sum <= t1 ? 1 : sum <= t2 ? 2 : 3;
const Lv = (zh, en) => T(zh, en);

const FREQ2W = S(['完全沒有', 'Not at all'], ['好幾天', 'Several days'], ['一半以上的天數', 'More than half the days'], ['幾乎每天', 'Nearly every day']);
const FUNC_OPTS = S(['完全沒有困難', 'Not difficult at all'], ['有一點困難', 'Somewhat difficult'], ['非常困難', 'Very difficult'], ['極度困難', 'Extremely difficult']);
const FUNC_Q = {
    key: 'func', scored: false, numbered: false, noStem: true, label: T('補充題', 'Follow-up'),
    text: T('如果您勾選了上述任何問題，這些問題對您在工作、處理家務或與他人相處上，造成多大的困難？',
            'If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?'),
    options: FUNC_OPTS
};
const funcLine = a => a.func != null ? [T(`對日常生活的影響：${FUNC_OPTS[a.func].label.zh.slice(4)}`, `Impact on daily life: ${FUNC_OPTS[a.func].label.en.slice(4)}`)] : [];

// ---------- PSQI 輔助 ----------
function parseClock(str) {
    if (typeof str !== 'string') return null;
    const m = str.trim().replace('：', ':').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = +m[1], min = +m[2];
    return (h > 23 || min > 59) ? null : h * 60 + min;
}
const fmtClock = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
function timeInBed(a) {
    const bed = parseClock(a.bed), wake = parseClock(a.wake);
    if (bed === null || wake === null) return null;
    let d = wake - bed;
    if (d <= 0) d += 1440;
    return d / 60;
}

// ---------- BDI 題目建構 ----------
const bdi = (zh, en, zo, eo) => ({
    text: T(zh, en),
    options: zo.map((z, i) => ({ label: T(`${i} - ${z}`, `${i} - ${eo[i]}`), score: i }))
});
const BDI_ITEMS = [
    bdi('悲傷 (Sadness)', 'Sadness',
        ['我不感到悲傷。', '大部分時間我都感到悲傷。', '我隨時都感到悲傷。', '我極度悲傷或不快樂，甚至到了無法忍受的地步。'],
        ['I do not feel sad.', 'I feel sad much of the time.', 'I am sad all the time.', 'I am so sad or unhappy that I can’t stand it.']),
    bdi('悲觀 (Pessimism)', 'Pessimism',
        ['我對未來並不感到灰心或沮喪。', '我感到對未來比以前更沮喪。', '我覺得自己沒什麼值得期待的事情。', '我覺得未來沒有希望，情況只會越來越糟糕。'],
        ['I am not discouraged about my future.', 'I feel more discouraged about my future than I used to.', 'I do not expect things to work out for me.', 'I feel my future is hopeless and will only get worse.']),
    bdi('過去的失敗 (Past Failure)', 'Past failure',
        ['我不覺得自己是個失敗者。', '我覺得自己失敗的次數比應該有的還多。', '回顧過去，我看到許多失敗。', '我覺得自己作為一個人，是完全失敗的。'],
        ['I do not feel like a failure.', 'I have failed more than I should have.', 'As I look back, I see a lot of failures.', 'I feel I am a total failure as a person.']),
    bdi('失去樂趣 (Loss of Pleasure)', 'Loss of pleasure',
        ['我從喜歡的事情中獲得的樂趣和以前一樣。', '我無法像以前那樣享受事物。', '我能從習慣喜歡的事情中獲得的樂趣極少。', '我無法從任何事物中獲得任何樂趣。'],
        ['I get as much pleasure as ever from the things I enjoy.', 'I don’t enjoy things as much as I used to.', 'I get very little pleasure from the things I used to enjoy.', 'I can’t get any pleasure from the things I used to enjoy.']),
    bdi('罪惡感 (Guilty Feelings)', 'Guilty feelings',
        ['我特別不覺得有罪惡感。', '我對許多做過或該做而沒做的事情感到罪惡。', '大部分時間我都感到相當有罪惡感。', '我隨時隨地都感到極度的罪惡感。'],
        ['I don’t feel particularly guilty.', 'I feel guilty over many things I have done or should have done.', 'I feel quite guilty most of the time.', 'I feel guilty all of the time.']),
    bdi('懲罰感 (Punishment Feelings)', 'Punishment feelings',
        ['我不覺得自己正在受到懲罰。', '我覺得自己可能會受到懲罰。', '我預期自己會受到懲罰。', '我覺得自己正在受到懲罰。'],
        ['I don’t feel I am being punished.', 'I feel I may be punished.', 'I expect to be punished.', 'I feel I am being punished.']),
    bdi('自我討厭 (Self-Dislike)', 'Self-dislike',
        ['我對自己的感覺和以前一樣。', '我對自己失去了信心。', '我對自己感到失望。', '我討厭我自己。'],
        ['I feel the same about myself as ever.', 'I have lost confidence in myself.', 'I am disappointed in myself.', 'I dislike myself.']),
    bdi('自我批判 (Self-Criticalness)', 'Self-criticalness',
        ['我不會比以前更多地批評或責怪自己。', '我比以前更容易批評自己的缺失。', '我因自己的過錯而批評自己。', '我為發生的所有壞事責怪自己。'],
        ['I don’t criticize or blame myself more than usual.', 'I am more critical of myself than I used to be.', 'I criticize myself for all of my faults.', 'I blame myself for everything bad that happens.']),
    bdi('自殺意念或想法 (Suicidal Thoughts)', 'Suicidal thoughts or wishes',
        ['我沒有任何想傷害自己的想法。', '我有傷害自己的想法，但我不會真的去做。', '我想要殺了自己。', '如果有機會，我會自殺。'],
        ['I don’t have any thoughts of harming myself.', 'I have thoughts of harming myself, but I would not carry them out.', 'I would like to kill myself.', 'I would kill myself if I had the chance.']),
    bdi('哭泣 (Crying)', 'Crying',
        ['我不會比以前哭得更多。', '我比以前更容易哭泣。', '我因為每一件小事而哭泣。', '我想哭，但我哭不出來。'],
        ['I don’t cry more than I used to.', 'I cry more than I used to.', 'I cry over every little thing.', 'I feel like crying, but I can’t.']),
    bdi('躁動不安 (Agitation)', 'Agitation',
        ['我不會比以前更容易感到坐立不安或急躁。', '我感到比以前更坐立不安或急躁。', '我非常坐立不安，以至於很難靜靜坐著。', '我太過坐立不安，必須一直走動或做些事情。'],
        ['I am no more restless or wound up than usual.', 'I feel more restless or wound up than usual.', 'I am so restless that it’s hard to stay still.', 'I am so restless that I have to keep moving or doing something.']),
    bdi('失去興趣 (Loss of Interest)', 'Loss of interest',
        ['我對其他人或活動的興趣沒有減少。', '我對其他人或事物的興趣比以前減少了。', '我失去了大部分對其他人或事物的興趣。', '我對任何事情都提不起興趣。'],
        ['I have not lost interest in other people or activities.', 'I am less interested in other people or things than before.', 'I have lost most of my interest in other people or things.', 'It’s hard to get interested in anything.']),
    bdi('優柔寡斷 (Indecisiveness)', 'Indecisiveness',
        ['我做出做決定的能力和以前一樣好。', '我發現做決定比以前更加困難。', '我做決定時遇到極大的困難。', '我根本無法做出任何決定。'],
        ['I make decisions as well as ever.', 'I find it more difficult to make decisions than usual.', 'I have much greater difficulty making decisions than I used to.', 'I have trouble making any decisions.']),
    bdi('無價值感 (Worthlessness)', 'Worthlessness',
        ['我不覺得自己是沒有價值的人。', '我不覺得自己像以前那樣有價值和有用。', '與其他人相比，我覺得自己比較沒有價值。', '我覺得自己完全沒有價值。'],
        ['I do not feel I am worthless.', 'I don’t consider myself as worthwhile and useful as I used to.', 'I feel more worthless compared to other people.', 'I feel utterly worthless.']),
    bdi('活力喪失 (Loss of Energy)', 'Loss of energy',
        ['我的精力跟以前一樣好。', '我的精力比以前少。', '我沒有足夠的精力去做很多事情。', '我沒有足夠的精力去做任何事情。'],
        ['I have as much energy as ever.', 'I have less energy than I used to have.', 'I don’t have enough energy to do very much.', 'I don’t have enough energy to do anything.']),
    bdi('睡眠習慣改變 (Changes in Sleeping Pattern)', 'Changes in sleeping pattern',
        ['我的睡眠狀況沒有任何改變。', '我睡得比以前稍微多或少了一些。', '我睡得比以前多得多或少得多。', '我幾乎整天都在睡，或者比以前少睡了許多（難以入睡/早醒）。'],
        ['I have not experienced any change in my sleep.', 'I sleep somewhat more or less than usual.', 'I sleep a lot more or a lot less than usual.', 'I sleep most of the day, or far less than before (trouble falling asleep / waking early).']),
    bdi('易怒 (Irritability)', 'Irritability',
        ['我不會比以前更容易發脾氣。', '我比以前更容易激動或發脾氣。', '我比以前容易發脾氣許多。', '我隨時隨地都感到易怒。'],
        ['I am no more irritable than usual.', 'I am more irritable than usual.', 'I am much more irritable than usual.', 'I am irritable all the time.']),
    bdi('食慾改變 (Changes in Appetite)', 'Changes in appetite',
        ['我的食慾沒有任何改變。', '我的食慾比以前稍微好一點或差一點。', '我的食慾比以前好得多或差得多。', '我完全沒有食慾，或者隨時都想暴飲暴食。'],
        ['I have not experienced any change in my appetite.', 'My appetite is somewhat greater or less than usual.', 'My appetite is much greater or less than before.', 'I have no appetite at all, or I crave food all the time.']),
    bdi('專注力困難 (Concentration Difficulty)', 'Concentration difficulty',
        ['我可以像以前一樣好地集中注意力。', '我無法像以前那樣集中注意力。', '我很難長時間集中注意力在任何事情上。', '我發現自己無法集中注意力在任何事情上。'],
        ['I can concentrate as well as ever.', 'I can’t concentrate as well as usual.', 'It’s hard to keep my mind on anything for very long.', 'I find I can’t concentrate on anything.']),
    bdi('疲勞或疲倦 (Tiredness or Fatigue)', 'Tiredness or fatigue',
        ['我不會比以前更容易感到疲倦。', '我比以前更容易感到疲倦或累。', '我太累了，以至於無法做很多以前常做的事。', '我太累了，幾乎無法做任何事。'],
        ['I am no more tired than usual.', 'I get tired more easily than usual.', 'I am too tired to do many of the things I used to do.', 'I am too tired to do almost anything.']),
    bdi('對性的興趣改變 (Loss of Interest in Sex)', 'Loss of interest in sex',
        ['我最近對性的興趣沒有改變。', '我對性的興趣比以前減少了。', '我現在對性的興趣大幅減少。', '我對性完全失去了興趣。'],
        ['I have not noticed any recent change in my interest in sex.', 'I am less interested in sex than I used to be.', 'I am much less interested in sex now.', 'I have lost interest in sex completely.'])
].map((q, i) => ({ key: `q${i + 1}`, ...q }));

// ==========================================
// 量表設定
// 欄位：id, label, name, icon, intro, stem?, options, questions, autoNumber, cutoff?, crisis?, validate?, score(a, ctx)
// ==========================================
const CONFIGS = [

{   // ---------- PHQ-9 ----------
    id: 'phq9', label: T('PHQ-9 憂鬱', 'PHQ-9 Depression'), name: T('PHQ-9 憂鬱症篩檢', 'PHQ-9 Depression Screening'), icon: '🌧️',
    intro: T('本問卷共 9 題，評估您<b>過去兩週（包含今天）</b>受憂鬱症狀困擾的程度。', '9 items assessing how much depressive symptoms have bothered you over the <b>past two weeks (including today)</b>.'),
    stem: T('過去兩週，您有多常被以下問題困擾？', 'Over the last 2 weeks, how often have you been bothered by the following problems?'),
    autoNumber: true, cutoff: 10, options: FREQ2W,
    crisis: { key: 'q9', min: 1, text: () => T('⚠️ 您在第 9 題提到有不如死掉或傷害自己的念頭。您不需要獨自承受。', '⚠️ You indicated thoughts of being better off dead or of hurting yourself. You do not have to face this alone.') },
    questions: [
        ...list('q', [
            ['做事時提不起勁或沒有樂趣', 'Little interest or pleasure in doing things'],
            ['感到心情低落、沮喪或絕望', 'Feeling down, depressed, or hopeless'],
            ['入睡困難、睡不安穩或睡眠過多', 'Trouble falling or staying asleep, or sleeping too much'],
            ['覺得疲倦或沒有活力', 'Feeling tired or having little energy'],
            ['食慾不振或吃太多', 'Poor appetite or overeating'],
            ['覺得自己很糟，或覺得自己很失敗，或讓自己或家人失望', 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down'],
            ['對事物專注有困難，例如閱讀報紙或看電視時', 'Trouble concentrating on things, such as reading the newspaper or watching television'],
            ['動作或說話速度緩慢到別人已經察覺？或正好相反——煩躁或坐立不安、動來動去的情況比平常更嚴重', 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual'],
            ['有不如死掉或用某種方式傷害自己的念頭', 'Thoughts that you would be better off dead, or of hurting yourself in some way']
        ]),
        { ...FUNC_Q, showIf: a => sumKeys(a, ['q1','q2','q3','q4','q5','q6','q7','q8','q9']) > 0 }
    ],
    score: (a, { total }) => ({
        total, max: 27,
        level: total <= 4 ? Lv('無或極輕微憂鬱 (Minimal)', 'Minimal depression') : total <= 9 ? Lv('輕度憂鬱 (Mild)', 'Mild depression')
             : total <= 14 ? Lv('中度憂鬱 (Moderate)', 'Moderate depression') : total <= 19 ? Lv('中重度憂鬱 (Moderately Severe)', 'Moderately severe depression')
             : Lv('重度憂鬱 (Severe)', 'Severe depression'),
        lines: funcLine(a), extra: { functional_difficulty: a.func ?? null }
    })
},

{   // ---------- GAD-7 ----------
    id: 'gad7', label: T('GAD-7 焦慮', 'GAD-7 Anxiety'), name: T('GAD-7 焦慮症篩檢', 'GAD-7 Anxiety Screening'), icon: '😰',
    intro: T('本問卷共 7 題，評估您<b>過去兩週（包含今天）</b>受焦慮症狀困擾的程度。', '7 items assessing how much anxiety symptoms have bothered you over the <b>past two weeks (including today)</b>.'),
    stem: T('過去兩週，您有多常被以下問題困擾？', 'Over the last 2 weeks, how often have you been bothered by the following problems?'),
    autoNumber: true, cutoff: 10, options: FREQ2W,
    questions: [
        ...list('q', [
            ['感到緊張、焦慮或煩躁', 'Feeling nervous, anxious, or on edge'],
            ['無法停止或控制擔憂', 'Not being able to stop or control worrying'],
            ['對各種事情過度擔憂', 'Worrying too much about different things'],
            ['很難放鬆', 'Trouble relaxing'],
            ['坐立不安，難以靜坐', 'Being so restless that it is hard to sit still'],
            ['變得容易生氣或煩躁', 'Becoming easily annoyed or irritable'],
            ['感到害怕，好像有什麼可怕的事會發生', 'Feeling afraid, as if something awful might happen']
        ]),
        { ...FUNC_Q, showIf: a => sumKeys(a, ['q1','q2','q3','q4','q5','q6','q7']) > 0 }
    ],
    score: (a, { total }) => ({
        total, max: 21,
        level: total <= 4 ? Lv('極輕微焦慮 (Minimal)', 'Minimal anxiety') : total <= 9 ? Lv('輕度焦慮 (Mild)', 'Mild anxiety')
             : total <= 14 ? Lv('中度焦慮 (Moderate)', 'Moderate anxiety') : Lv('重度焦慮 (Severe)', 'Severe anxiety'),
        lines: funcLine(a), extra: { functional_difficulty: a.func ?? null }
    })
},

{   // ---------- BDI-II ----------
    id: 'bdi', label: T('BDI 憂鬱', 'BDI Depression'), name: T('貝克憂鬱量表 (BDI-II)', 'Beck Depression Inventory (BDI-II)'), icon: '📋',
    intro: T('本問卷共 21 題，請仔細閱讀每一組選項，選出最能描述您<b>近兩週（包含今天）</b>心情的敘述。', '21 items. Choose the statement in each group that best describes how you have felt over the <b>past two weeks (including today)</b>.'),
    autoNumber: true,
    crisis: {
        key: 'q9', min: 1,
        text: s => T('⚠️ 您在第 9 題提到有傷害自己或自殺的想法。您不需要獨自承受。' + (s >= 2 ? '\n請不要等待，現在就聯絡上述專線或可信任的人。' : ''),
                     '⚠️ You indicated thoughts of harming yourself or suicide. You do not have to face this alone.' + (s >= 2 ? '\nPlease don’t wait — contact one of the lines below or someone you trust now.' : ''))
    },
    questions: BDI_ITEMS,
    score: (a, { total }) => ({
        total, max: 63,
        level: total <= 13 ? Lv('無或極輕微憂鬱狀況', 'Minimal or no depression') : total <= 19 ? Lv('輕度憂鬱狀況', 'Mild depression')
             : total <= 28 ? Lv('中度憂鬱狀況', 'Moderate depression') : Lv('重度憂鬱狀況', 'Severe depression')
    })
},

{   // ---------- BAI ----------
    id: 'bai', label: T('BAI 焦慮', 'BAI Anxiety'), name: T('貝克焦慮量表 (BAI)', 'Beck Anxiety Inventory (BAI)'), icon: '📋',
    intro: T('本問卷共 21 題，旨在評估您近一週（包含今天）受焦慮症狀困擾的程度。', '21 items assessing how much anxiety symptoms have bothered you over the past week, including today.'),
    autoNumber: true,
    options: S(['完全沒有', 'Not at all'], ['輕度（不太受困擾）', 'Mildly (not much bother)'], ['中度（相當受困擾）', 'Moderately (quite unpleasant)'], ['重度（非常受困擾）', 'Severely (hard to bear)']),
    questions: list('q', [
        ['麻木或刺痛感', 'Numbness or tingling'], ['發熱、發燙感', 'Feeling hot'], ['腿部搖晃或震顫', 'Wobbliness in legs'], ['無法放鬆', 'Unable to relax'],
        ['害怕壞事發生', 'Fear of the worst happening'], ['頭暈或頭重腳輕', 'Dizzy or lightheaded'], ['心悸或心跳加速', 'Heart pounding or racing'],
        ['不穩定感', 'Unsteady'], ['感到害怕或恐懼', 'Terrified or afraid'], ['神經過敏或緊張', 'Nervous'], ['窒息感或呼吸困難', 'Feeling of choking'],
        ['手部發抖', 'Hands trembling'], ['顫抖或搖晃', 'Shaky'], ['害怕失去控制', 'Fear of losing control'], ['呼吸困難', 'Difficulty breathing'],
        ['害怕死亡', 'Fear of dying'], ['焦慮或不安', 'Scared'], ['消化不良或腹部不適', 'Indigestion or abdominal discomfort'], ['昏厥感', 'Faint'],
        ['臉部發紅發熱', 'Face flushed'], ['出汗（非因發燒或天氣熱）', 'Sweating (not due to heat)']
    ]),
    score: (a, { total }) => ({
        total, max: 63,
        level: total <= 7 ? Lv('極輕微焦慮 (Minimal)', 'Minimal anxiety') : total <= 15 ? Lv('輕度焦慮 (Mild)', 'Mild anxiety')
             : total <= 25 ? Lv('中度焦慮 (Moderate)', 'Moderate anxiety') : Lv('重度焦慮 (Severe)', 'Severe anxiety')
    })
},

{   // ---------- PSQI ----------
    id: 'psqi', label: T('PSQI 睡眠', 'PSQI Sleep'), name: T('匹茲堡睡眠品質指數 (PSQI)', 'Pittsburgh Sleep Quality Index (PSQI)'), icon: '🌙',
    intro: T('本問卷旨在評估您<b>過去一個月</b>的睡眠品質與習慣，包含入睡時間、睡眠時長與睡眠困擾等。', 'Assesses your sleep quality and habits over the <b>past month</b>, including time to fall asleep, sleep duration and sleep disturbances.'),
    autoNumber: false,
    options: S(['過去一個月中完全沒有', 'Not during the past month'], ['每週少於 1 次', 'Less than once a week'], ['每週 1 ~ 2 次', 'Once or twice a week'], ['每週 3 次或以上', 'Three or more times a week']),
    questions: [
        { key: 'bed', type: 'time', text: T('1. 過去一個月中，您通常幾點上床睡覺？', '1. During the past month, what time have you usually gone to bed?'),
          desc: T('請以 24 小時制輸入', 'Use 24-hour format'), placeholder: T('例如 23:00 或 23:30', 'e.g. 23:00 or 23:30') },
        { key: 'latency', type: 'number', max: 720, text: T('2. 過去一個月中，您上床後通常需要多久才能入睡（分鐘）？', '2. During the past month, how long (in minutes) has it usually taken you to fall asleep each night?'),
          placeholder: T('請輸入分鐘數，如 30', 'Minutes, e.g. 30') },
        { key: 'wake', type: 'time', text: T('3. 過去一個月中，您通常幾點起床？', '3. During the past month, what time have you usually gotten up in the morning?'),
          desc: T('請以 24 小時制輸入', 'Use 24-hour format'), placeholder: T('例如 07:00 或 07:30', 'e.g. 07:00 or 07:30') },
        { key: 'sleepHrs', type: 'number', max: 24, text: T('4. 過去一個月中，您每天晚上實際睡眠的時間是多少小時？', '4. During the past month, how many hours of actual sleep did you get per night?'),
          desc: T('（這可能與您躺在床上時間不同）', '(This may be different from the number of hours you spent in bed)'), placeholder: T('請輸入小時數，如 6.5 或 7', 'Hours, e.g. 6.5 or 7') },
        { key: '5a', text: T('5a. 過去一個月中，您是否無法在 30 分鐘內入睡？', '5a. How often have you had trouble sleeping because you cannot get to sleep within 30 minutes?') },
        { key: '5b', text: T('5b. 過去一個月中，您是否夜間易醒或早醒？', '5b. …because you wake up in the middle of the night or early morning?') },
        { key: '5c', text: T('5c. 過去一個月中，您是否夜間需要起來上廁所？', '5c. …because you have to get up to use the bathroom?') },
        { key: '5d', text: T('5d. 過去一個月中，您是否感到呼吸不順暢？', '5d. …because you cannot breathe comfortably?') },
        { key: '5e', text: T('5e. 過去一個月中，您是否咳嗽或鼾聲很大？', '5e. …because you cough or snore loudly?') },
        { key: '5f', text: T('5f. 過去一個月中，您是否感到太冷？', '5f. …because you feel too cold?') },
        { key: '5g', text: T('5g. 過去一個月中，您是否感到太熱？', '5g. …because you feel too hot?') },
        { key: '5h', text: T('5h. 過去一個月中，您是否做噩夢？', '5h. …because you have bad dreams?') },
        { key: '5i', text: T('5i. 過去一個月中，您是否感到身體疼痛？', '5i. …because you have pain?') },
        { key: '5j', text: T('5j. 過去一個月中，是否有其他原因影響了您的睡眠？', '5j. …because of other reason(s) affecting your sleep?') },
        { key: 'q6', text: T('6. 過去一個月中，您對整體睡眠品質的評價如何？', '6. During the past month, how would you rate your sleep quality overall?'),
          options: S(['非常好', 'Very good'], ['良好', 'Fairly good'], ['較差', 'Fairly bad'], ['非常差', 'Very bad']) },
        { key: 'q7', text: T('7. 過去一個月中，您是否需要服用藥物來幫助入睡？', '7. How often have you taken medicine to help you sleep (prescribed or over the counter)?') },
        { key: 'q8', text: T('8. 過去一個月中，您在開車、吃飯或參加社交活動時，是否難以保持清醒？', '8. How often have you had trouble staying awake while driving, eating meals, or engaging in social activity?') },
        { key: 'q9', text: T('9. 過去一個月中，要維持足夠的熱忱把事情做好，對您來說有多大的困難？', '9. How much of a problem has it been for you to keep up enough enthusiasm to get things done?'),
          options: S(['完全沒有困難', 'No problem at all'], ['只有很輕微的困難', 'Only a very slight problem'], ['有些困難', 'Somewhat of a problem'], ['有很大的困難', 'A very big problem']) }
    ],
    validate: (q, v, a) => {
        if (q.key !== 'sleepHrs') return null;
        const inBed = timeInBed(a);
        return (inBed !== null && v > inBed + 0.01)
            ? T(`您填的實際睡眠（${v} 小時）超過躺在床上的時間（約 ${inBed.toFixed(1)} 小時）。請確認，或按「上一題」修改上床／起床時間。`,
                `The sleep hours you entered (${v} h) exceed your time in bed (about ${inBed.toFixed(1)} h). Please check, or go back and edit your bed / wake times.`)
            : null;
    },
    score: a => {
        const g = k => a[k] || 0;
        const quality = g('q6');
        const lm = g('latency');
        const latency = band((lm <= 15 ? 0 : lm <= 30 ? 1 : lm <= 60 ? 2 : 3) + g('5a'), [2, 4]);
        const hrs = g('sleepHrs');
        const duration = hrs >= 7 ? 0 : hrs >= 6 ? 1 : hrs >= 5 ? 2 : 3;
        const inBed = timeInBed(a) || 0;
        const effPct = inBed > 0 ? Math.min(100, (hrs / inBed) * 100) : 0;
        const efficiency = effPct >= 85 ? 0 : effPct >= 75 ? 1 : effPct >= 65 ? 2 : 3;
        const disturbance = band(sumKeys(a, ['5b','5c','5d','5e','5f','5g','5h','5i','5j']), [9, 18]);
        const medication = g('q7');
        const daytime = band(g('q8') + g('q9'), [2, 4]);
        const components = { quality, latency, duration, efficiency, disturbance, medication, daytime };
        const total = Object.values(components).reduce((s, v) => s + v, 0);
        return {
            total, max: 21,
            level: total > 5 ? Lv('睡眠品質不佳 (Poor Sleeper，總分 > 5)', 'Poor sleeper (total > 5)') : Lv('睡眠品質良好 (Good Sleeper，總分 ≤ 5)', 'Good sleeper (total ≤ 5)'),
            lines: [
                T('七大成分（各 0~3 分）：', 'Seven components (0–3 each):'),
                T(`・主觀睡眠品質：${quality}`, `• Subjective sleep quality: ${quality}`),
                T(`・入睡時間：${latency}`, `• Sleep latency: ${latency}`),
                T(`・睡眠時數：${duration}`, `• Sleep duration: ${duration}`),
                T(`・睡眠效率：${efficiency}`, `• Sleep efficiency: ${efficiency}`),
                T(`・睡眠困擾：${disturbance}`, `• Sleep disturbances: ${disturbance}`),
                T(`・助眠藥物：${medication}`, `• Sleep medication: ${medication}`),
                T(`・日間功能障礙：${daytime}`, `• Daytime dysfunction: ${daytime}`),
                T(`躺在床上約 ${inBed.toFixed(1)} 小時，實際睡眠 ${hrs} 小時，睡眠效率 ${effPct.toFixed(0)}%`,
                  `Time in bed ≈ ${inBed.toFixed(1)} h, actual sleep ${hrs} h, efficiency ${effPct.toFixed(0)}%`)
            ],
            extra: { components, sleep_efficiency_pct: Math.round(effPct * 10) / 10, time_in_bed_hours: Math.round(inBed * 10) / 10, sleep_hours: hrs }
        };
    }
},

{   // ---------- ESS ----------
    id: 'ess', label: T('ESS 嗜睡', 'ESS Sleepiness'), name: T('艾普沃斯嗜睡量表 (ESS)', 'Epworth Sleepiness Scale (ESS)'), icon: '😴',
    intro: T('本問卷共 8 題，評估您在<b>日常生活中</b>白天打瞌睡的可能性（不只是覺得累）。若某情境近期未遇到，請想像它會如何影響您。',
             '8 items assessing how likely you are to <b>doze off</b> during daily life (not just feel tired). If you have not been in a situation recently, imagine how it would affect you.'),
    stem: T('在以下情況中，您打瞌睡或睡著的可能性有多大？', 'How likely are you to doze off or fall asleep in the following situations?'),
    autoNumber: true, cutoff: 11,
    options: S(['絕不會打瞌睡', 'Would never doze'], ['很少會打瞌睡', 'Slight chance of dozing'], ['有時會打瞌睡', 'Moderate chance of dozing'], ['很可能會打瞌睡', 'High chance of dozing']),
    questions: list('q', [
        ['坐著閱讀書報時', 'Sitting and reading'], ['看電視時', 'Watching TV'],
        ['在公共場所安靜地坐著（例如劇院或會議中）', 'Sitting inactive in a public place (e.g. a theater or a meeting)'],
        ['搭乘汽車連續一小時沒有休息（當乘客）', 'As a passenger in a car for an hour without a break'],
        ['下午有機會躺下休息時', 'Lying down to rest in the afternoon when circumstances permit'],
        ['坐著與人交談時', 'Sitting and talking to someone'],
        ['午餐後（沒有喝酒）安靜地坐著時', 'Sitting quietly after a lunch without alcohol'],
        ['開車時遇到塞車，停下來等候數分鐘', 'In a car, while stopped for a few minutes in traffic']
    ]),
    score: (a, { total }) => ({
        total, max: 24,
        level: total <= 10 ? Lv('正常範圍 (Normal)', 'Normal range') : total <= 12 ? Lv('輕度日間過度嗜睡 (Mild)', 'Mild excessive daytime sleepiness')
             : total <= 15 ? Lv('中度日間過度嗜睡 (Moderate)', 'Moderate excessive daytime sleepiness') : Lv('重度日間過度嗜睡 (Severe)', 'Severe excessive daytime sleepiness')
    })
},

{   // ---------- DHI ----------
    id: 'dhi', label: T('DHI 暈眩', 'DHI Dizziness'), name: T('眩暈障礙量表 (DHI)', 'Dizziness Handicap Inventory (DHI)'), icon: '🌀',
    intro: T('共 25 題，約 5 分鐘。請依您最近的眩暈狀況，選擇「是」、「有時」或「否」。', '25 items, about 5 minutes. Based on your recent dizziness, answer “Yes”, “Sometimes” or “No”.'),
    autoNumber: true,
    options: [{ label: T('是（4 分）', 'Yes (4 pts)'), score: 4 }, { label: T('有時（2 分）', 'Sometimes (2 pts)'), score: 2 }, { label: T('否（0 分）', 'No (0 pts)'), score: 0 }],
    questions: list('q', [
        ['抬頭看時，您的眩暈問題會加重嗎？', 'Does looking up increase your problem?', 'P'],
        ['因為眩暈問題，您會感到挫折嗎？', 'Because of your problem, do you feel frustrated?', 'E'],
        ['因為眩暈問題，您會限制自己的出差或休閒旅行嗎？', 'Because of your problem, do you restrict your travel for business or recreation?', 'F'],
        ['走在超市的走道間，您的眩暈問題會加重嗎？', 'Does walking down the aisle of a supermarket increase your problem?', 'P'],
        ['因為眩暈問題，您上下床會有困難嗎？', 'Because of your problem, do you have difficulty getting into or out of bed?', 'F'],
        ['您的眩暈問題是否嚴重限制了社交活動，例如外出用餐、看電影、跳舞或參加聚會？', 'Does your problem significantly restrict social activities such as going out to dinner, the movies, dancing, or parties?', 'F'],
        ['因為眩暈問題，您閱讀時會有困難嗎？', 'Because of your problem, do you have difficulty reading?', 'F'],
        ['從事較費力的活動（如運動、跳舞、做家事）時，您的眩暈問題會加重嗎？', 'Does performing more ambitious activities such as sports, dancing, or household chores increase your problem?', 'P'],
        ['因為眩暈問題，您會害怕沒人陪同就離開家嗎？', 'Because of your problem, are you afraid to leave your home without someone accompanying you?', 'E'],
        ['因為眩暈問題，您曾在別人面前感到尷尬嗎？', 'Because of your problem, have you been embarrassed in front of others?', 'E'],
        ['快速轉動頭部時，您的眩暈問題會加重嗎？', 'Do quick movements of your head increase your problem?', 'P'],
        ['因為眩暈問題，您會避免到高的地方嗎？', 'Because of your problem, do you avoid heights?', 'F'],
        ['在床上翻身時，您的眩暈問題會加重嗎？', 'Does turning over in bed increase your problem?', 'P'],
        ['因為眩暈問題，您要做粗重的家事或庭院工作會有困難嗎？', 'Because of your problem, is it difficult to do strenuous housework or yard work?', 'F'],
        ['因為眩暈問題，您會擔心別人以為您喝醉了嗎？', 'Because of your problem, are you afraid people may think you are intoxicated?', 'E'],
        ['因為眩暈問題，您要獨自散步會有困難嗎？', 'Because of your problem, is it difficult to go for a walk by yourself?', 'F'],
        ['走在人行道上時，您的眩暈問題會加重嗎？', 'Does walking down a sidewalk increase your problem?', 'P'],
        ['因為眩暈問題，您要集中注意力會有困難嗎？', 'Because of your problem, is it difficult to concentrate?', 'E'],
        ['因為眩暈問題，您在黑暗中於家裡走動會有困難嗎？', 'Because of your problem, is it difficult to walk around your house in the dark?', 'F'],
        ['因為眩暈問題，您會害怕獨自待在家嗎？', 'Because of your problem, are you afraid to stay home alone?', 'E'],
        ['因為眩暈問題，您會覺得自己有障礙嗎？', 'Because of your problem, do you feel handicapped?', 'E'],
        ['您的眩暈問題是否讓您與家人或朋友的關係產生壓力？', 'Has your problem placed stress on your relationships with family or friends?', 'E'],
        ['因為眩暈問題，您會感到沮喪嗎？', 'Because of your problem, are you depressed?', 'E'],
        ['您的眩暈問題是否影響到工作或家務責任？', 'Does your problem interfere with your job or household responsibilities?', 'F'],
        ['彎腰時，您的眩暈問題會加重嗎？', 'Does bending over increase your problem?', 'P']
    ]),
    score: (a, { total, byCat }) => {
        const P = byCat.P || 0, F = byCat.F || 0, E = byCat.E || 0;
        return {
            total, max: 100,
            level: total <= 30 ? Lv('輕度障礙 (Mild)', 'Mild handicap') : total <= 60 ? Lv('中度障礙 (Moderate)', 'Moderate handicap') : Lv('重度障礙 (Severe)', 'Severe handicap'),
            lines: [T('分項分數：', 'Subscores:'), T(`・生理 (P)：${P} / 28`, `• Physical (P): ${P} / 28`),
                    T(`・功能 (F)：${F} / 36`, `• Functional (F): ${F} / 36`), T(`・情緒 (E)：${E} / 36`, `• Emotional (E): ${E} / 36`)],
            extra: { physical_score: P, functional_score: F, emotional_score: E }
        };
    }
},

{   // ---------- PSS-I ----------
    id: 'pssi', label: T('PSS-I 創傷', 'PSS-I Trauma'), name: T('創傷後壓力症狀量表 (PSS-I)', 'PTSD Symptom Scale (PSS-I)'), icon: '🛡️',
    intro: T('共 17 題，請針對過去兩週與創傷事件相關的感受作答。此量表為篩檢工具，不等同診斷。', '17 items. Answer based on how you have felt over the past two weeks in relation to a traumatic event. This is a screening tool, not a diagnosis.'),
    autoNumber: true,
    options: S(['完全沒有', 'Not at all'], ['每週 1 次以下 / 輕微', 'Once a week or less / slight'], ['每週 2 ~ 4 次 / 中等', '2–4 times a week / moderate'], ['每週 5 次以上 / 非常嚴重', '5+ times a week / very severe']),
    questions: [
        { key: 'note', type: 'text', required: false, scored: false, numbered: false, noStem: true, label: T('選填', 'Optional'),
          text: T('請先想一件讓您感到嚴重創傷的事件，以下題目請針對『過去兩週』與該事件相關的感受作答。', 'Please think of an event you found very traumatic. The following questions refer to your feelings over the past two weeks related to that event.'),
          desc: T('（選填）可簡短寫下事件類型，也可直接跳過。', '(Optional) You may briefly note the type of event, or skip.'), placeholder: T('例如：車禍、遭受暴力…', 'e.g. car accident, assault…') },
        ...list('q', [
            ['腦中不由自主地浮現創傷事件的畫面、想法或記憶，令您痛苦。', 'Having upsetting thoughts or images about the event that came into your head when you didn’t want them to.', 'B'],
            ['反覆做與創傷事件有關、令您痛苦的夢。', 'Having bad dreams or nightmares about the event.', 'B'],
            ['突然覺得或表現得好像創傷事件又再次發生（如閃回、彷彿身歷其境）。', 'Suddenly acting or feeling as if the event were happening again (flashbacks, reliving it).', 'B'],
            ['接觸到會讓您聯想到創傷事件的人、事、物時，會感到強烈的心理痛苦。', 'Feeling emotionally upset when you are reminded of the event.', 'B'],
            ['接觸到會讓您聯想到創傷事件的人、事、物時，會出現身體反應（如心跳加快、冒汗、發抖）。', 'Having physical reactions (e.g. racing heart, sweating, trembling) when reminded of the event.', 'B'],
            ['刻意避免去想、去談或去感受與創傷事件有關的事。', 'Trying not to think about, talk about, or have feelings about the event.', 'C'],
            ['刻意避開會讓您想起創傷事件的活動、地點或人。', 'Trying to avoid activities, places, or people that remind you of the event.', 'C'],
            ['無法回想起創傷事件中的某些重要部分。', 'Not being able to remember an important part of the event.', 'C'],
            ['對以前重視或喜歡的活動，明顯失去興趣或較少參與。', 'Having much less interest or participating much less in important activities.', 'C'],
            ['覺得與他人疏離、有距離感，或像是被隔離在外。', 'Feeling distant or cut off from people around you.', 'C'],
            ['情感變得麻木，難以感受愛、喜悅等情緒。', 'Feeling emotionally numb (e.g. unable to feel love or happiness).', 'C'],
            ['覺得未來一片黯淡（如不覺得會有事業、婚姻、子女或正常的壽命）。', 'Feeling as if your future plans or hopes will not come true (career, marriage, children, normal life span).', 'C'],
            ['難以入睡或難以維持睡眠。', 'Having trouble falling or staying asleep.', 'D'],
            ['容易煩躁，或有突如其來的怒氣。', 'Feeling irritable or having fits of anger.', 'D'],
            ['難以集中注意力。', 'Having trouble concentrating.', 'D'],
            ['對周遭環境過度警戒、緊繃，總覺得要提防什麼。', 'Being overly alert (e.g. checking who is around you, being uncomfortable with your back to a door).', 'D'],
            ['容易被嚇到，或對突然的聲響、動靜反應過度。', 'Being jumpy or easily startled.', 'D']
        ])
    ],
    score: (a, { total, byCat }) => {
        const B = byCat.B || 0, C = byCat.C || 0, D = byCat.D || 0, cutoff = 15;
        return {
            total, max: 51,
            level: total >= cutoff ? Lv(`達篩檢切點 (≥ ${cutoff})，建議尋求專業評估`, `At or above screening cutoff (≥ ${cutoff}); professional assessment recommended`)
                                   : Lv(`未達篩檢切點 (< ${cutoff})`, `Below screening cutoff (< ${cutoff})`),
            lines: [T('分項分數：', 'Subscores:'), T(`・重新經驗 (B)：${B} / 15`, `• Re-experiencing (B): ${B} / 15`),
                    T(`・逃避與麻木 (C)：${C} / 21`, `• Avoidance & numbing (C): ${C} / 21`), T(`・過度警覺 (D)：${D} / 15`, `• Hyperarousal (D): ${D} / 15`)],
            extra: { reexperiencing_score: B, avoidance_score: C, arousal_score: D, trauma_note: a.note || null } // 敏感資料，請確認 RLS
        };
    }
}

];

// ==========================================
// 引擎
// ==========================================
const STYLE = {
    opt: 'padding:12px; font-size:15px; text-align:left; cursor:pointer; border:1px solid #ccc; border-radius:6px; background:#fff;',
    primary: 'padding:8px 20px; background:#3f51b5; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;',
    plain: 'padding:6px 12px; cursor:pointer;'
};
let Q = null; // { cfg, answers, idx, view:'intro'|'question'|'result', result, saveState, saveError }

const el = id => document.getElementById(id);
const visible = () => Q.cfg.questions.filter(q => !q.showIf || q.showIf(Q.answers));
const counted = q => q.scored !== false && q.numbered !== false;

function getDb() {
    const c = window.supabaseClient || window.sb || window.db;
    if (c && typeof c.from === 'function') return c;
    if (typeof supabase !== 'undefined' && supabase && typeof supabase.from === 'function') return supabase;
    return null;
}

function buildPicker() {
    const box = el('quiz-picker');
    if (!box) return;
    box.innerHTML = CONFIGS.map(c =>
        `<button type="button" class="btn" data-quiz-btn="${c.id}" onclick="Quiz.open('${c.id}')">${esc(tx(c.label))}</button>`).join('');
    highlight();
}
function highlight() {
    document.querySelectorAll('[data-quiz-btn]').forEach(b => {
        const on = Q && Q.cfg.id === b.dataset.quizBtn;
        b.style.background = on ? '#3f51b5' : '';
        b.style.color = on ? '#fff' : '';
    });
}

function open(id) {
    if (Q && Q.cfg.id === id) return close();
    Q = { cfg: CONFIGS.find(c => c.id === id), answers: {}, idx: 0, view: 'intro', result: null, saveState: 'idle', saveError: '' };
    render(); highlight();
}
function close() { Q = null; render(); highlight(); }
function retake() { const id = Q.cfg.id; Q = null; open(id); }
function start() { Q.answers = {}; Q.idx = 0; Q.view = 'question'; render(); }

function render() {
    const root = el('quiz-root');
    if (!root) return;
    if (!Q) { root.innerHTML = ''; root.style.display = 'none'; return; }
    root.style.display = 'block';
    ({ intro: renderIntro, question: renderQuestion, done: renderDone, result: renderResult })[Q.view](root);
}

function renderIntro(root) {
    const c = Q.cfg;
    root.innerHTML = `
    <div class="card" style="padding:20px; text-align:center;">
        <h3>${c.icon} ${esc(tx(c.name))}</h3>
        <p style="font-size:14px; color:#666;">${tx(c.intro)}</p>
        <button type="button" onclick="Quiz.start()" style="${STYLE.primary}">${tx(UI.start)}</button>
        <button type="button" onclick="Quiz.close()" style="${STYLE.plain} margin-left:8px;">${tx(UI.cancel)}</button>
    </div>`;
}

function renderQuestion(root) {
    const { cfg } = Q;
    const qs = visible();
    const q = qs[Q.idx];
    const cur = Q.answers[q.key];
    const isCount = counted(q);
    const N = qs.filter(counted).length;
    const k = qs.slice(0, Q.idx + 1).filter(counted).length;
    const pct = Math.round(((Q.idx + 1) / qs.length) * 100);
    const label = isCount ? tx(UI.qn(k, N)) : tx(q.label || '');
    const title = (cfg.autoNumber && isCount ? `${k}. ` : '') + tx(q.text);
    const isLast = Q.idx === qs.length - 1;
    const type = q.type || 'choice';

    let body;
    if (type === 'choice') {
        const opts = q.options || cfg.options;
            body = `<div style="display:flex; flex-direction:column; gap:10px;">` + opts.map(o => {
            const on = cur === o.score;
            return `<button type="button" data-score="${o.score}" onclick="Quiz.pick(${o.score})"
                style="${STYLE.opt}${on ? ' background:#3f51b5; color:#fff; border-color:#3f51b5;' : ''}">${esc(tx(o.label))}</button>`;
                }).join('') + `</div>`;
    } else {
        body = `
        <input id="quiz-input" type="text" inputmode="${type === 'number' ? 'decimal' : 'text'}" placeholder="${esc(tx(q.placeholder || ''))}"
            value="${esc(cur ?? '')}" onkeydown="if(event.key==='Enter') Quiz.submit()"
            style="width:100%; padding:10px; font-size:16px; box-sizing:border-box;">
        <div style="margin-top:12px; text-align:right;">
            ${q.required === false ? `<button type="button" onclick="Quiz.skip()" style="${STYLE.plain} margin-right:8px;">${tx(UI.skip)}</button>` : ''}
            <button type="button" onclick="Quiz.submit()" style="${STYLE.primary}">${tx(isLast ? UI.finish : UI.next)}</button>
        </div>`;
    }

    root.innerHTML = `
    <div class="card" style="padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:14px; margin-bottom:8px;">
            <span>${cfg.icon} ${esc(tx(cfg.name))}　${esc(label)}</span>
            <span>${pct}% <button type="button" onclick="Quiz.close()" title="${esc(tx(UI.close))}" style="border:none; background:none; cursor:pointer; font-size:16px;">✕</button></span>
        </div>
        <div style="width:100%; background:#e0e0e0; height:8px; border-radius:4px; overflow:hidden; margin-bottom:20px;">
            <div style="width:${pct}%; background:#3f51b5; height:100%; transition:width .3s;"></div>
        </div>
        ${cfg.stem && !q.noStem ? `<p style="font-size:13px; color:#666; margin-bottom:8px;">${tx(cfg.stem)}</p>` : ''}
        <h3 style="margin-bottom:${q.desc ? 6 : 20}px; font-size:18px;">${esc(title)}</h3>
        ${q.desc ? `<p style="font-size:13px; color:#666; margin-bottom:16px;">${esc(tx(q.desc))}</p>` : ''}
        ${body}
        <div id="quiz-msg" style="color:#c62828; font-size:13px; margin-top:10px; white-space:pre-wrap;"></div>
        <div style="margin-top:16px;">${Q.idx > 0 ? `<button type="button" onclick="Quiz.prev()" style="${STYLE.plain}">${tx(UI.prev)}</button>` : ''}</div>
    </div>`;
    const inp = el('quiz-input');
    if (inp) inp.focus();
}

const toast = m => { const e = el('quiz-msg'); if (e) e.textContent = tx(m); };

function advance() {
    const qs = visible();
    if (Q.idx < qs.length - 1) { Q.idx++; render(); } else finish();
}
let locked = false;
function pick(score) {
    if (locked) return;
    const ref = Q, idx = Q.idx;
    ref.answers[visible()[idx].key] = score;
    locked = true;

    document.querySelectorAll('#quiz-root [data-score]').forEach(b => {
        const on = +b.dataset.score === score;
        b.style.background = on ? '#3f51b5' : '#fff';
        b.style.color = on ? '#fff' : '';
        b.style.borderColor = on ? '#3f51b5' : '#ccc';
    });

    setTimeout(() => {
        locked = false;
        if (Q === ref && Q.idx === idx) advance();   // 這段時間內若關閉或換題就不動作
    }, 250);
}
function prev() { if (!locked && Q.idx > 0) { Q.idx--; render(); } }
function skip() { delete Q.answers[visible()[Q.idx].key]; advance(); }

function submit() {
    const q = visible()[Q.idx];
    const raw = (el('quiz-input').value || '').trim();
    if (raw === '' && q.required === false) return skip();
    let val;
    if (q.type === 'time') {
        const m = parseClock(raw);
        if (m === null) return toast(UI.badTime);
        val = fmtClock(m);
    } else if (q.type === 'number') {
        const n = parseFloat(raw.replace(',', '.'));
        if (!isFinite(n) || n < 0 || n > q.max) return toast(UI.badNum(q.max));
        val = n;
    } else val = raw;

    const old = Q.answers[q.key];
    Q.answers[q.key] = val;
    const err = Q.cfg.validate ? Q.cfg.validate(q, val, Q.answers) : null;
    if (err) { if (old === undefined) delete Q.answers[q.key]; else Q.answers[q.key] = old; return toast(err); }
    advance();
}

// ---------- 完成 → 計分 → 自動存檔 ----------
function finish() {
    const qs = visible();
    const keys = new Set(qs.map(q => q.key));
    Object.keys(Q.answers).forEach(k => { if (!keys.has(k)) delete Q.answers[k]; }); // 清掉已不適用的舊答案

    let total = 0; const byCat = {};
    qs.forEach(q => {
        const v = Q.answers[q.key];
        if (q.scored === false || (q.type && q.type !== 'choice') || typeof v !== 'number') return;
        total += v;
        if (q.cat) byCat[q.cat] = (byCat[q.cat] || 0) + v;
    });
    Q.result = Q.cfg.score(Q.answers, { total, byCat });
    Q.view = 'done';
    render();
    save(); // ← 自動存檔
}

function statusHTML() {
    const s = Q.saveState;
    if (s === 'saving') return `<span style="color:#666;">${tx(UI.saving)}</span>`;
    if (s === 'saved') return `<span style="color:#2e7d32;">${tx(UI.saved)}</span>`;
    if (s === 'error') return `<span style="color:#c62828;">${tx(UI.saveFail)}${esc(Q.saveError)}</span>
        <div style="margin-top:8px;"><button type="button" onclick="Quiz.retry()" style="${STYLE.primary}">${tx(UI.retry)}</button></div>`;
    return '';
}
function updateStatus() { const e = el('quiz-save-status'); if (e && Q) e.innerHTML = statusHTML(); }

function renderResult(root) {
    const { cfg, result: r } = Q;
    const crisis = crisisHTML();
    root.innerHTML = `
    <div class="card" style="padding:20px; text-align:center;">
        <h3>${cfg.icon} ${esc(tx(cfg.name))} — ${tx(UI.done)}</h3>
        <p style="font-size:34px; font-weight:bold; margin:8px 0;">${r.total} <span style="font-size:16px; color:#666;">/ ${r.max}</span></p>
        <p>${tx(UI.result)}<b>${esc(tx(r.level))}</b></p>
        ${(r.lines || []).map(l => `<p style="font-size:14px; color:#444; margin:2px 0;">${esc(tx(l))}</p>`).join('')}
        ${cfg.cutoff && r.total >= cfg.cutoff ? `<p style="font-size:14px; color:#b26a00;">${tx(UI.cutoff(cfg.cutoff))}</p>` : ''}
        ${crisis}
        <p style="font-size:12px; color:#888;">${tx(UI.disclaimer)}</p>
        <div id="quiz-save-status" style="font-size:13px; margin:10px 0; min-height:18px;">${statusHTML()}</div>
        <button type="button" onclick="Quiz.retake()" style="${STYLE.plain}">${tx(UI.retake)}</button>
        <button type="button" onclick="Quiz.close()" style="${STYLE.plain} margin-left:8px;">${tx(UI.close)}</button>
    </div>`;
}

async function save() {
    const q = Q;
    if (!q || q.saveState === 'saving' || q.saveState === 'saved') return;
    q.saveState = 'saving'; updateStatus();
    try {
        const db = getDb();
        if (!db) throw new Error(tx(UI.noClient));

        const { data: { session } } = await db.auth.getSession();
        if (!session) throw new Error(lang() === 'en' ? 'Please sign in first.' : '請先登入後再儲存。');

        const r = q.result;
        const { error } = await db.from('quiz_results').insert([{
            user_id: session.user.id,          // 一定等於 auth.uid()
            quiz: q.cfg.id,
            total_score: r.total,
            level: r.level.zh,
            details: { ...(r.extra || {}), level_en: r.level.en, lang: lang(), max: r.max },
            answers: q.answers
            // created_at 交給資料庫 default now()，避免用客戶端時間
        }]);
        if (error) throw error;
        q.saveState = 'saved';
    } catch (err) {
        console.error(`❌ ${q.cfg.id} 存檔失敗：`, err);
        q.saveState = 'error';
        q.saveError = `${err.message || err}${err.code ? ` (${err.code})` : ''}`;
    }
    if (Q === q) updateStatus();
}
function crisisHTML() {
    const { cfg, answers } = Q;
    if (!(cfg.crisis && (answers[cfg.crisis.key] || 0) >= cfg.crisis.min)) return '';
    return `<p style="white-space:pre-wrap; text-align:left; color:#b71c1c; background:#fdecea; padding:12px; border-radius:6px; font-size:14px;">${esc(tx(cfg.crisis.text(answers[cfg.crisis.key])))}\n\n${esc(tx(HOTLINE))}</p>`;
}

function renderDone(root) {
    const { cfg } = Q;
    root.innerHTML = `
    <div class="card" style="padding:20px; text-align:center;">
        <h3>${cfg.icon} ${esc(tx(cfg.name))} — ${tx(UI.done)}</h3>
        <p style="font-size:15px; color:#555; margin:12px 0;">${tx(UI.doneMsg)}</p>
        ${crisisHTML()}
        <div id="quiz-save-status" style="font-size:13px; margin:10px 0; min-height:18px;">${statusHTML()}</div>
        <button type="button" onclick="Quiz.showResult()" style="${STYLE.primary}">${tx(UI.viewScore)}</button>
        <button type="button" onclick="Quiz.close()" style="${STYLE.plain} margin-left:8px;">${tx(UI.close)}</button>
    </div>`;
}

function showResult() { if (Q && Q.result) { Q.view = 'result'; render(); } }
// ---------- 語言切換時即時重繪 ----------
function refreshLang() { buildPicker(); if (Q) render(); }
document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('.lang-btn[data-lang]')) setTimeout(refreshLang, 80);
});

window.Quiz = { open, close, start, pick, submit, skip, prev, retake, retry: () => save(), showResult, refreshLang };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPicker);
else buildPicker();

})();

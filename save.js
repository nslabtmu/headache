// activity.js - save.js 最上方
const SESSION_GAP_MIN = 30;
const SS_KEY = 'act_session';
function touchSession() {
  const now = Date.now();
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem(SS_KEY)); } catch {}
  if (!s || now - s.last > SESSION_GAP_MIN * 60000) s = { id: crypto.randomUUID(), last: now };
  s.last = now;
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); } catch {}
  return s.id;
}
window.currentSessionId = touchSession;
['click', 'input', 'change'].forEach(ev =>
  document.addEventListener(ev, touchSession, { passive: true }));
// ==================== save.js ====================
let saving = false;
const byId = id => document.getElementById(id);
const val = id => byId(id)?.value ?? '';
const numOrNull = id => { const v = val(id).trim(); return v === '' ? null : Number(v); };
const checkedVals = sel => [...document.querySelectorAll(sel + ':checked')].map(e => e.value);
const todayLocal = () => new Date().toLocaleDateString('sv-SE');
const round2 = v => (v == null ? null : Math.round(v * 100) / 100);
function safeParse(s, fb = []) { try { return JSON.parse(s) ?? fb; } catch { return fb; } }

const RED_TXT = () => tr('nudge_red',
  '疼痛很強烈。若是突然發生的最劇烈頭痛，或伴隨單側無力、說話不清、視力改變，請立即就醫。');

const RANGES = [
  { id: 'band_heart_rate',   key: 'rng_hr',     zh: '心跳',       min: 30, max: 220 },
  { id: 'band_spo2',         key: 'rng_spo2',   zh: '血氧',       min: 50, max: 100 },
  { id: 'band_steps',        key: 'rng_steps',  zh: '今日步數',   min: 0,  max: 100000 },
  { id: 'band_avg_steps',    key: 'rng_avg',    zh: '平均步數',   min: 0,  max: 100000 },
  { id: 'input-sleep-hours', key: 'rng_sleep',  zh: '睡眠時數',   min: 0,  max: 24 },
  { id: 'input-caffeine',    key: 'rng_caf',    zh: '咖啡因杯數', min: 0,  max: 20 },
  { id: 'input-stress',      key: 'rng_stress', zh: '壓力',       min: 0,  max: 10 }
];

function validateRanges() {
  for (const r of RANGES) {
    const raw = val(r.id).trim();
    if (raw === '') continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < r.min || n > r.max) {
      const pane = byId(r.id)?.closest('.tab-pane');
      if (pane) switchTab(pane.id);
      byId(r.id)?.focus();
      return trf('range_err', '「{name}」請輸入 {min}–{max} 之間的數字',
                 { name: tr(r.key, r.zh), min: r.min, max: r.max });
    }
// report.js — 匯出記錄 (PDF)，中英雙語
// 載入順序：jsPDF → html2canvas → quiz-trend.js → report.js

const REPORT_DAYS = 30;

const RPT_I18N = {
  zh: {
    title: '頭痛與氣象記錄報告',
    exportDate: '匯出日期', account: '帳號', period: '期間', lastDays: d => `近 ${d} 天`,
    s1: '1. 統計摘要', records: '記錄筆數', attackDays: '頭痛發作天數', avgPain: '平均疼痛', maxPain: '最高疼痛',
    medRate: '用藥比例', topLoc: '常見部位',
    s2: '2. 氣壓與疼痛對照', group: '分組', count: '筆數', avgPressure: '平均氣壓 (hPa)',
    painHigh: '疼痛 ≥ 7', painLow: '疼痛 < 7',
    s3: '3. 趨勢圖',
    s4: '4. 相關症狀平均分數 (1–10)', symptom: '症狀', avg: '平均',
    s5: '5. 問卷結果（最近一次）', scale: '量表', score: '分數', level: '分級', filled: '填寫日期',
    s6: '6. 逐日明細', date: '日期', pain: '疼痛', loc: '部位', med: '用藥', temp: '溫度°C', hum: '濕度%',
    pres: '氣壓hPa', note: '備註',
    yes: '有', no: '無', noData: '無資料',
    footer: '本報告僅供個人健康紀錄與研究參考，不具醫療診斷功能。問卷分級為一般常用切點，實際判讀請由專業人員為之。',
    noRecords: d => `近 ${d} 天沒有紀錄可匯出`,
    noLib: 'PDF 元件尚未載入，請確認已加入 html2canvas。',
    fail: '匯出失敗：', file: d => `頭痛報告_${d}.pdf`, locale: 'zh-TW',
    sym: { sym_1: '持續性頭痛', sym_2: '頭暈、失去平衡', sym_3: '噁心、想吐', sym_4: '疲勞、嗜睡',
           sym_5: '注意力、記憶變差', sym_6: '反應慢、腦霧', sym_7: '易怒、焦慮、情緒波動',
           sym_8: '視力模糊、畏光畏聲', sym_9: '睡眠障礙', sym_10: '頸部疼痛、麻木' },
    locs: { forehead: '前額', left: '左側', right: '右側', back: '後腦勺' }
  },
  en: {
    title: 'Headache & Weather Record Report',
    exportDate: 'Exported', account: 'Account', period: 'Period', lastDays: d => `Last ${d} days`,
    s1: '1. Summary', records: 'Records', attackDays: 'Headache days', avgPain: 'Average pain', maxPain: 'Max pain',
    medRate: 'Medication use', topLoc: 'Common locations',
    s2: '2. Pressure vs. Pain', group: 'Group', count: 'Count', avgPressure: 'Avg pressure (hPa)',
    painHigh: 'Pain ≥ 7', painLow: 'Pain < 7',
    s3: '3. Trend chart',
    s4: '4. Average symptom scores (1–10)', symptom: 'Symptom', avg: 'Average',
    s5: '5. Questionnaire results (latest)', scale: 'Scale', score: 'Score', level: 'Level', filled: 'Date',
    s6: '6. Daily details', date: 'Date', pain: 'Pain', loc: 'Location', med: 'Medication', temp: 'Temp °C', hum: 'Humidity %',
    pres: 'Pressure hPa', note: 'Notes',
    yes: 'Yes', no: 'No', noData: 'No data',
    footer: 'This report is for personal health tracking and research only and is not a medical diagnosis. Questionnaire levels use common cut-offs; please have a professional interpret them.',
    noRecords: d => `No records in the last ${d} days to export.`,
    noLib: 'PDF libraries are not loaded. Please make sure html2canvas is included.',
    fail: 'Export failed: ', file: d => `Headache_Report_${d}.pdf`, locale: 'en-US',
    sym: { sym_1: 'Persistent headache', sym_2: 'Dizziness / balance', sym_3: 'Nausea', sym_4: 'Fatigue / drowsiness',
           sym_5: 'Poor concentration / memory', sym_6: 'Slow reaction / brain fog', sym_7: 'Irritability / anxiety / mood',
           sym_8: 'Blurred vision / light & noise sensitivity', sym_9: 'Sleep disturbance', sym_10: 'Neck pain / numbness' },
    locs: { forehead: 'Forehead', left: 'Left', right: 'Right', back: 'Back / whole head' }
}
  return null;
}

function updateSaveButtonLabel() {
  const b = byId('save-diary-btn');
  if (b) b.innerText = window.currentDiaryId ? tr('save_update', '💾 更新紀錄') : tr('save_new', '💾 儲存');
}
window.updateSaveButtonLabel = updateSaveButtonLabel;

function setSaveBusy(busy) {
  const b = byId('save-diary-btn');
  if (!b) return;
  b.disabled = busy;
  if (busy) b.innerText = tr('saving', '⏳ 儲存中…'); else updateSaveButtonLabel();
}

// ---------- 日期時間 ----------
function resetRecordDateTime() {
  const now = new Date();
  const d = byId('record-date'), t = byId('record-time');
  if (d) { d.value = now.toLocaleDateString('sv-SE'); d.max = d.value; }
  if (t) t.value = now.toTimeString().slice(0, 5);
  window.dtTouched = false;
}
window.resetRecordDateTime = resetRecordDateTime;

// ---------- 開新紀錄（若你別的檔案已有 startNewDiary，請合併，避免重複定義）----------
function startNewDiary() {
  window.currentDiarySession = null;
  window.currentDiaryId = null;
  window.painTouched = false; window.symTouched = false; window.dtTouched = false;
  window.sessionMusicLogs = []; window.sessionQuizLogs = [];
  window.painAfter = null; window.lastMusicSessionId = null;
  window.diaryDirty = false;
  if (typeof selectedParts !== 'undefined') selectedParts.length = 0;
  document.querySelectorAll('.svg-pain-zone.active-part').forEach(e => e.classList.remove('active-part'));
  document.querySelectorAll('.head-chip-btn.active-btn').forEach(e => e.classList.remove('active-btn'));
  document.querySelectorAll('.face-btn.active').forEach(e => e.classList.remove('active'));

  byId('attack-form')?.reset();                       // 清空所有欄位
  byId('hidden-pain-locations').value = '';
  byId('input-pain').value = '';
  byId('pain-val-display').innerText = tr('pain_unset', '尚未選擇');
  document.querySelectorAll('#pane-symptom .slider-val').forEach(s => s.innerText = '1');
  toggleMedicationSection();
  resetRecordDateTime();                              // 要放在 reset() 之後
  updateSaveButtonLabel();
  window.updateStepBadges?.();
  switchTab('pane-headache');
}
window.startNewDiary = startNewDiary;

// ---------- 收集資料 ----------
function collectHeadache() {
  const used = val('input-medication') === 'yes';
  return {
    pain_score: Number(val('input-pain')),
    locations: safeParse(val('hidden-pain-locations')),
    duration: val('input-duration') || null,
    ongoing: !!byId('input-ongoing')?.checked,
    aura: checkedVals('input[name="aura"]'),            // 空陣列 = 沒回答；含 'none' = 明確回答沒有
    pain_quality: val('input-pain-quality') || null,
    function_impact: numOrNull('input-impact'),
    red_flags: checkedVals('input[name="red-flag"]'),
    medication_used: used,
    medication_name: used ? (val('input-medication-name').trim() || null) : null,
    medication_categories: used ? checkedVals('input[name="med-category"]') : [],
    medication_time: used ? (val('input-medication-time') || null) : null,
    medication_dose: used ? (val('input-medication-dose').trim() || null) : null,
    medication_effect: used ? (val('input-medication-effect') || null) : null,
    notes: val('input-content').trim() || null
  };
}

function collectSymptoms() {
  const triggers = val('triggers').trim();
  if (!window.symTouched && !triggers) return { filled: false };
  const s = { filled: true };
  for (let i = 1; i <= 12; i++) {                       // 11、12 還沒加到畫面時會自動略過
    const el = document.querySelector(`input[name="sym${i}"]`);
    if (el) s[`sym_${i}`] = Number(el.value);
  }
  s.triggers = triggers || null;
  return s;
}

function collectHealth() {
  return {
    heart_rate: numOrNull('band_heart_rate'),
    spo2: numOrNull('band_spo2'),
    steps: numOrNull('band_steps'),
    avg_steps: numOrNull('band_avg_steps')
  };
}

function collectLifestyle() {
  return {
    sleep_hours: numOrNull('input-sleep-hours'),
    caffeine_cups: numOrNull('input-caffeine'),
    stress: numOrNull('input-stress'),
    alcohol: !!byId('input-alcohol')?.checked,
    skipped_meal: !!byId('input-skipmeal')?.checked,
    menstruation: val('input-menstruation') || null
  };
}
};

const rptLang = () => (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'zh';
const R = () => RPT_I18N[rptLang()];

function rptEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const rptAvg = arr => {
  const v = arr.filter(x => typeof x === 'number' && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const rptFmt = (n, d = 1) => (n === null || n === undefined) ? '-' : Number(n).toFixed(d);
const rptDay = iso => new Date(iso).toLocaleDateString('sv-SE');

// ★ 紀錄發生時間：優先用使用者填的 event_time，舊資料退回 created_at
const rptTime = r => r.event_time || r.created_at;

function rptParseLocations(h) {
  let loc = h?.locations ?? [];
  if (typeof loc === 'string') { try { loc = JSON.parse(loc); } catch { loc = [loc]; } }
  return Array.isArray(loc) ? loc : [];
}

function buildReportHtml(records, chartImg, userEmail) {
  const t = R();
  const scores = records.map(r => r.headache_data?.pain_score ?? 0);
  const attackDays = new Set(records
    .filter(r => (r.headache_data?.pain_score ?? 0) > 0)
    .map(r => rptDay(rptTime(r)))).size;
  const medCount = records.filter(r => r.headache_data?.medication_used).length;

  const locCount = {};
  records.forEach(r => rptParseLocations(r.headache_data).forEach(l => {
    const k = t.locs[l] || l;
    locCount[k] = (locCount[k] || 0) + 1;
  }));
  const topLoc = Object.entries(locCount).sort((a, b) => b[1] - a[1])
    .slice(0, 3).map(e => `${e[0]}(${e[1]})`).join(', ') || '-';

  const hi = records.filter(r => (r.headache_data?.pain_score ?? 0) >= 7);
  const lo = records.filter(r => (r.headache_data?.pain_score ?? 0) < 7);
  const pHi = rptAvg(hi.map(r => r.weather_data?.pressure));
  const pLo = rptAvg(lo.map(r => r.weather_data?.pressure));

  const symRows = Object.keys(t.sym).map(id => {
    const a = rptAvg(records.map(r => r.symptoms_data?.[id]));
    return `<tr><td>${rptEsc(t.sym[id])}</td><td>${rptFmt(a)}</td></tr>`;
  }).join('');

  const latest = window.QuizTrend?.latest() || {};
  const qRows = Object.values(latest).map(r =>
    `<tr><td>${rptEsc(r.name)}</td><td>${r.total} / ${r.max}</td>` +
    `<td>${rptEsc(window.QuizTrend.labelOf(r))}</td><td>${r.date}</td></tr>`).join('')
    || `<tr><td colspan="4">${t.noData}</td></tr>`;

  const detailRows = records.map(r => {
    const h = r.headache_data || {}, w = r.weather_data || {};
    const locs = rptParseLocations(h).map(l => t.locs[l] || l).join(', ') || '-';
    const med = h.medication_used ? rptEsc(h.medication_name || t.yes) : t.no;
    const note = rptEsc(h.notes || h.content || '');
    return `<tr>
      <td>${rptDay(rptTime(r))}</td><td>${h.pain_score ?? '-'}</td><td>${rptEsc(locs)}</td>
      <td>${med}</td><td>${w.temperature ?? '-'}</td><td>${w.humidity ?? '-'}</td>
      <td>${w.pressure ?? '-'}</td><td>${note}</td></tr>`;
  }).join('');

  const style = `
    .rpt{width:794px;padding:36px;box-sizing:border-box;font-family:"Noto Sans TC","Microsoft JhengHei","PingFang TC",Arial,sans-serif;color:#222;background:#fff;font-size:13px;line-height:1.5}
    .rpt h1{font-size:22px;margin:0 0 4px}
    .rpt h2{font-size:15px;margin:22px 0 8px;padding-bottom:4px;border-bottom:2px solid #2980b9;color:#2980b9}
    .rpt table{width:100%;border-collapse:collapse;font-size:12px}
    .rpt th,.rpt td{border:1px solid #ddd;padding:5px 7px;text-align:left;vertical-align:top}
    .rpt th{background:#f1f5f9}
    .rpt .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .rpt .box{border:1px solid #ddd;border-radius:6px;padding:8px 10px}
    .rpt .box b{display:block;font-size:18px;color:#2980b9}
    .rpt .note{font-size:11px;color:#777;margin-top:18px}
    .rpt tr{page-break-inside:avoid}`;

  const today = new Date().toLocaleDateString(t.locale);

  return `<style>${style}</style><div class="rpt">
    <h1>${t.title}</h1>
    <div style="color:#666">${t.exportDate}: ${today} &nbsp; ${t.account}: ${rptEsc(userEmail || '-')} &nbsp; ${t.period}: ${t.lastDays(REPORT_DAYS)}</div>

    <h2>${t.s1}</h2>
    <div class="grid">
      <div class="box">${t.records}<b>${records.length}</b></div>
      <div class="box">${t.attackDays}<b>${attackDays}</b></div>
      <div class="box">${t.avgPain}<b>${rptFmt(rptAvg(scores))} / 10</b></div>
      <div class="box">${t.maxPain}<b>${scores.length ? Math.max(...scores) : '-'}</b></div>
      <div class="box">${t.medRate}<b>${medCount} / ${records.length}</b></div>
      <div class="box">${t.topLoc}<b style="font-size:13px">${rptEsc(topLoc)}</b></div>
    </div>

    <h2>${t.s2}</h2>
    <table>
      <tr><th>${t.group}</th><th>${t.count}</th><th>${t.avgPressure}</th></tr>
      <tr><td>${t.painHigh}</td><td>${hi.length}</td><td>${rptFmt(pHi)}</td></tr>
      <tr><td>${t.painLow}</td><td>${lo.length}</td><td>${rptFmt(pLo)}</td></tr>
    </table>

    ${chartImg ? `<h2>${t.s3}</h2><img src="${chartImg}" style="width:100%">` : ''}

    <h2>${t.s4}</h2>
    <table><tr><th>${t.symptom}</th><th>${t.avg}</th></tr>${symRows}</table>

    <h2>${t.s5}</h2>
    <table><tr><th>${t.scale}</th><th>${t.score}</th><th>${t.level}</th><th>${t.filled}</th></tr>${qRows}</table>

    <h2>${t.s6}</h2>
    <table>
      <tr><th>${t.date}</th><th>${t.pain}</th><th>${t.loc}</th><th>${t.med}</th><th>${t.temp}</th><th>${t.hum}</th><th>${t.pres}</th><th>${t.note}</th></tr>
      ${detailRows}
    </table>

    <div class="note">${t.footer}</div>
  </div>`;
}

async function exportMedicalReport() {
  const t = R();
  if (!window.jspdf || !window.html2canvas) { alert(t.noLib); return; }

  await window.QuizTrend?.load();

  // ★ 重新讀取最新資料，SQL 補回的氣象才會出現在報告裡
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadCalendarRecords(user.id);
  } catch (e) { console.warn('reload records failed', e); }

function buildWeather(isBackfilled) {
  if (!currentWeather) return { available: false, is_backfilled: isBackfilled, reason: 'no_location' };
  const wd = currentWeather.data || {};
  const base = {
    location: currentWeather.location ?? null,
    lat: round2(currentWeather.lat), lon: round2(currentWeather.lon),
    fetched_at: currentWeather.fetched_at,
    is_backfilled: isBackfilled
  };
  if (isBackfilled || wd.temperature_2m == null)
  return { ...base, available: false, reason: isBackfilled ? 'backfilled_date' : 'fetch_failed' };
  return {
    ...base, available: true,
    temperature: wd.temperature_2m ?? null,
    humidity: wd.relative_humidity_2m ?? null,
    pressure: wd.surface_pressure ?? null,
    pm2_5: wd.pm2_5 ?? null,
    pm10: wd.pm10 ?? null,
    us_aqi: wd.us_aqi ?? null
  };
}
  const since = Date.now() - REPORT_DAYS * 86400000;
  const records = (window.allUserRecords || [])
    .filter(r => rptTime(r) && new Date(rptTime(r)).getTime() >= since)
    .sort((a, b) => new Date(rptTime(a)) - new Date(rptTime(b)));

function buildMusic() {
  const logs = window.sessionMusicLogs || [];
  return {
    sessions: logs,
    total_sessions: logs.length,
    total_duration_seconds: logs.reduce((a, c) => a + (c.duration_seconds || 0), 0),
    has_completed_session: logs.some(l => l.completed === true)
  };
}
  const hasQuiz = Object.keys(window.QuizTrend?.latest() || {}).length > 0;
  if (records.length === 0 && !hasQuiz) { alert(t.noRecords(REPORT_DAYS)); return; }

// ---------- 輔助：關聯量表、計算用藥天數 ----------
async function countMedDays(userId) {
  // 趨勢圖：僅在不是示範資料時放入
  let chartImg = '';
try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await supabase.from('user_data')
      .select('created_at, headache_data').eq('user_id', userId).gte('created_at', since);
    if (error) throw error;
    return new Set((data || []).filter(r => r.headache_data?.medication_used)
      .map(r => new Date(r.created_at).toLocaleDateString('sv-SE'))).size;
  } catch (e) { return 0; }
}

// ---------- 主儲存 ----------
async function saveAllResearchData(opts = {}) {
  if (saving) return;                                   // 防連點

  if (REQUIRE_LOCATION_FOR_SUBMIT && !locationReady) { alert(tr('need_loc', '⚠️ 尚未取得定位資訊，無法送出！')); return; }
  if (!window.painTouched) { alert(tr('need_pain', '請先選擇疼痛程度')); switchTab('pane-headache'); return; }
    const isMock = window.globalChartData?.isMock;
    if (typeof chartInstance !== 'undefined' && chartInstance && !isMock) {
      chartImg = chartInstance.toBase64Image();
    }
  } catch (e) { console.warn('chart to image failed', e); }

  const rangeErr = validateRanges();
  if (rangeErr) { alert(rangeErr); return; }
  let email = '';
  try { email = (await supabase.auth.getUser()).data.user?.email || ''; } catch {}

  const inputDate = val('record-date') || todayLocal();
  const when = new Date(`${inputDate}T${val('record-time') || '00:00'}`);
  if (isNaN(when) || when > new Date()) { alert(tr('err_future', '日期時間不能是未來')); switchTab('pane-headache'); return; }
  const isBackfilled = inputDate !== todayLocal();
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;background:#fff;';
  holder.innerHTML = buildReportHtml(records, chartImg, email);
  document.body.appendChild(holder);

  saving = true; setSaveBusy(true);
try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert(tr('need_login', '請先登入！')); return; }

    const isUpdate = !!window.currentDiaryId;
    const headache = collectHeadache();

    const payload = {
    user_id: user.id,
    schema_version: 2,
    app_lang: currentLang,
    is_backfilled: isBackfilled,
    headache_data: headache,
    symptoms_data: collectSymptoms(),
    health_data: collectHealth(),
    lifestyle_data: collectLifestyle(),
    weather_data: buildWeather(isBackfilled),
    music_therapy_data: buildMusic()
    };
    if (!isUpdate) payload.session_id = currentSessionId();
   // if (!isUpdate || window.dtTouched) payload.event_time = when.toISOString();   // created_at 交給資料庫
    if (!isUpdate || window.dtTouched) {
      payload.event_time = when.toISOString();
      payload.event_date = inputDate;                                    // 使用者填的本地日期
      payload.event_tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // 例如 Asia/Taipei
      }
    let res;
    if (isUpdate) {
      const { user_id, weather_data, ...updatable } = payload;   // 更新時不改 user_id、不覆蓋氣象
      res = await supabase.from('user_data').update(updatable)
        .eq('id', window.currentDiaryId).select('id').single();
    } else {
      res = await supabase.from('user_data').insert([payload]).select('id').single();
    await Promise.all([...holder.querySelectorAll('img')].map(img =>
      img.complete ? null : new Promise(res => { img.onload = img.onerror = res; })));

    const canvas = await html2canvas(holder.querySelector('.rpt'), { scale: 2, backgroundColor: '#fff' });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = 210, pageH = 297;
    const pxPerPage = Math.floor(canvas.width * pageH / pageW);

    for (let y = 0, page = 0; y < canvas.height; y += pxPerPage, page++) {
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.min(pxPerPage, canvas.height - y);
      slice.getContext('2d').drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, slice.height * pageW / canvas.width);
}
    if (res.error) throw res.error;

    // 儲存成功後
    window.currentDiaryId = res.data.id;
    if (!isUpdate) window.currentDiarySession = payload.session_id;
    window.dtTouched = false;
    window.diaryDirty = false;
    if (!isBackfilled) {                         // 補填的紀錄不跟音樂、量表關聯
      await linkQuizzesToDiary(res.data.id);
      await linkMusicToDiary(res.data.id);
    }

    updateSaveButtonLabel();
    window.updateStepBadges?.();
    loadCalendarRecords?.(user.id);
    loadUserHistory?.(user.id);

    const redFlag = headache.red_flags.length > 0 || headache.pain_score >= 8;
    const medDays = await countMedDays(user.id);
    let msg = '';
    if (redFlag) msg += RED_TXT() + '<br>';
    if (medDays >= 10) msg += trf('nudge_overuse',
      '最近 30 天已有 {n} 天記錄使用止痛藥。頻繁用藥本身可能讓頭痛更常發生，建議和醫師討論。', { n: medDays }) + '<br>';
if (!opts.skipNudge) {
    if (!isUpdate) {
      window.nudge(msg + tr('nudge_saved2', '已儲存。接下來想做什麼？'), [
        [tr('nudge_music', '🎵 聽音樂放鬆'), () => switchMainTab('music')],
        [tr('nudge_mood', '🩵 填心情量表'), () => switchTab('pane-mood')],
        [tr('nudge_later', '稍後再說')]
      ]);
    } else if (msg) {
      window.nudge(msg + tr('save_updated', '✅ 已更新'), [[tr('ok', '我知道了')]]);
    } else {
      alert(tr('save_updated', '✅ 已更新'));
    }}
  return true;
    pdf.save(t.file(new Date().toLocaleDateString('sv-SE')));
} catch (e) {
    console.error('save failed', e);
    alert(tr('save_fail', '❌ 儲存失敗：') + (e.message || e));
    console.error('export failed', e);
    alert(t.fail + e.message);
} finally {
    saving = false; setSaveBusy(false);                 // 成功、失敗、斷網都會解鎖
    holder.remove();
}
}

// 勾到紅旗當下就提示
document.addEventListener('change', e => {
  if (e.target?.name === 'red-flag' && e.target.checked)
    window.nudge?.(RED_TXT(), [[tr('ok', '我知道了')]]);
});
//1021 存檔取代savemusicSession1020
// ---------- 量表、音樂關聯：只綁同一個 session ----------
async function linkQuizzesToDiary(diaryId) {
  const pending = (window.sessionQuizLogs || []).filter(x =>
    x.id && !x.linked && x.session_id === window.currentDiarySession);
  if (!pending.length) return;
  const { error } = await supabase.from('quiz_results')
    .update({ diary_id: diaryId }).in('id', pending.map(x => x.id));
  if (!error) pending.forEach(x => { x.linked = true; });
}   

async function linkMusicToDiary(diaryId) {
  const pending = (window.sessionMusicLogs || []).filter(l =>
    l.db_id && !l.linked && l.session_id === window.currentDiarySession);
  if (!pending.length) return;
  const { error } = await supabase.from('music_sessions')
    .update({ diary_id: diaryId }).in('id', pending.map(l => l.db_id));
  if (!error) pending.forEach(l => { l.linked = true; });
}

// ---------- 音樂：聽完就寫入，失敗進本機佇列 ----------
const MUSIC_QUEUE_KEY = 'pending_music_sessions';
function queueMusic(log) {
  try {
    const q = JSON.parse(localStorage.getItem(MUSIC_QUEUE_KEY) || '[]');
    q.push(log); localStorage.setItem(MUSIC_QUEUE_KEY, JSON.stringify(q));
  } catch (e) {}
}
async function insertMusicRow(log) {
  const { data, error } = await supabase.from('music_sessions').insert([{
    diary_id: log.diary_id ?? null,
    session_id: log.session_id ?? null,
    protocol: log.protocol ?? null,
    started_at: log.start_time,
    ended_at: log.end_time,
    duration_seconds: log.duration_seconds,
    progress_pct: log.progress_percentage,
    pause_count: log.pause_count,
    end_type: log.end_type,
    completed: !!log.completed,
    pain_before: log.pain_before ?? null,
    pain_after: log.pain_after ?? null
  }]).select('id').single();
  if (error) throw error;
  return data.id;
}
async function saveMusicSession(log) {
  if (log.end_type === 'page_closed') { queueMusic(log); return null; }   // 關頁時送不出去
  try { log.db_id = await insertMusicRow(log); return log.db_id; }
  catch (e) { console.warn('music save failed, queued', e); queueMusic(log); return null; }
}
async function flushPendingMusic() {
  let q = [];
  try { q = JSON.parse(localStorage.getItem(MUSIC_QUEUE_KEY) || '[]'); } catch (e) {}
  if (!q.length) return;
  localStorage.removeItem(MUSIC_QUEUE_KEY);
  for (const log of q) { try { await insertMusicRow(log); } catch (e) { queueMusic(log); } }
}
async function updateMusicPainAfter(n) {
  const log = window.lastMusicLog;
  if (!log) return;
  log.pain_after = n;
  const id = log.db_id ?? await window.lastMusicSave;      // 等寫入完成再更新
  if (id) await supabase.from('music_sessions').update({ pain_after: n }).eq('id', id);
}
window.saveMusicSession = saveMusicSession;
window.updateMusicPainAfter = updateMusicPainAfter;
window.flushPendingMusic = flushPendingMusic;

window.updateMusicPainAfter = updateMusicPainAfter;
document.addEventListener('change', e => {
  if (e.target?.name !== 'aura' || !e.target.checked) return;
  document.querySelectorAll('input[name="aura"]').forEach(b => {
    if (b === e.target) return;
    if (e.target.value === 'none' || b.value === 'none') b.checked = false;
  });
});
window.exportMedicalReport = exportMedicalReport;

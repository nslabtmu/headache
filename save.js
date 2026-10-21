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
  window.currentDiaryId = null;
  window.painTouched = false; window.symTouched = false; window.dtTouched = false;
  window.sessionMusicLogs = []; window.sessionQuizLogs = [];
  window.painAfter = null; window.lastMusicSessionId = null;

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

function buildWeather(isBackfilled) {
  if (!currentWeather) return { available: false, is_backfilled: isBackfilled };
  const wd = currentWeather.data || {};
  const base = {
    location: currentWeather.location ?? null,
    lat: round2(currentWeather.lat), lon: round2(currentWeather.lon),
    fetched_at: currentWeather.fetched_at,
    is_backfilled: isBackfilled
  };
  if (isBackfilled) return { ...base, available: false, reason: 'backfilled_date' };
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

function buildMusic() {
  const logs = window.sessionMusicLogs || [];
  return {
    sessions: logs,
    total_sessions: logs.length,
    total_duration_seconds: logs.reduce((a, c) => a + (c.duration_seconds || 0), 0),
    has_completed_session: logs.some(l => l.completed === true)
  };
}

// ---------- 輔助：關聯量表、計算用藥天數 ----------
async function linkQuizzesToDiary(diaryId) {
  const pending = (window.sessionQuizLogs || []).filter(x => x.id && !x.linked);
  if (!pending.length) return;
  const { error } = await supabase.from('quiz_results')
    .update({ diary_id: diaryId }).in('id', pending.map(x => x.id));
  if (!error) pending.forEach(x => { x.linked = true; });
}

async function countMedDays(userId) {
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
async function saveAllResearchData() {
  if (saving) return;                                   // 防連點

  if (REQUIRE_LOCATION_FOR_SUBMIT && !locationReady) { alert(tr('need_loc', '⚠️ 尚未取得定位資訊，無法送出！')); return; }
  if (!window.painTouched) { alert(tr('need_pain', '請先選擇疼痛程度')); switchTab('pane-headache'); return; }

  const rangeErr = validateRanges();
  if (rangeErr) { alert(rangeErr); return; }

  const inputDate = val('record-date') || todayLocal();
  const when = new Date(`${inputDate}T${val('record-time') || '00:00'}`);
  if (isNaN(when) || when > new Date()) { alert(tr('err_future', '日期時間不能是未來')); switchTab('pane-headache'); return; }
  const isBackfilled = inputDate !== todayLocal();

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
    if (!isUpdate || window.dtTouched) payload.created_at = when.toISOString();

    let res;
    if (isUpdate) {
      const { user_id, weather_data, ...updatable } = payload;   // 更新時不改 user_id、不覆蓋氣象
      res = await supabase.from('user_data').update(updatable)
        .eq('id', window.currentDiaryId).select('id').single();
    } else {
      res = await supabase.from('user_data').insert([payload]).select('id').single();
    }
    if (res.error) throw res.error;

    window.currentDiaryId = res.data.id;
    window.dtTouched = false;
    await linkQuizzesToDiary(res.data.id);

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
    }
  } catch (e) {
    console.error('save failed', e);
    alert(tr('save_fail', '❌ 儲存失敗：') + (e.message || e));
  } finally {
    saving = false; setSaveBusy(false);                 // 成功、失敗、斷網都會解鎖
  }
}

// 勾到紅旗當下就提示
document.addEventListener('change', e => {
  if (e.target?.name === 'red-flag' && e.target.checked)
    window.nudge?.(RED_TXT(), [[tr('ok', '我知道了')]]);
});

// ---------- 音樂：每次聽完就寫入（接口，請在 music.js 結束時呼叫）----------
async function saveMusicSession(log) {
  try {
    const { data, error } = await supabase.from('music_sessions').insert([{
      diary_id: window.currentDiaryId ?? null,
      track: log.track ?? log.type ?? null,
      started_at: log.started_at ?? new Date(Date.now() - (log.duration_seconds || 0) * 1000).toISOString(),
      duration_seconds: log.duration_seconds ?? null,
      completed: !!log.completed,
      pain_before: window.painTouched ? Number(val('input-pain')) : null
    }]).select('id').single();
    if (error) throw error;
    window.lastMusicSessionId = data.id;
  } catch (e) { console.warn('music session save failed', e); }
}
async function updateMusicPainAfter(n) {
  if (!window.lastMusicSessionId) return;
  await supabase.from('music_sessions').update({ pain_after: n }).eq('id', window.lastMusicSessionId);
}
window.saveMusicSession = saveMusicSession;
window.updateMusicPainAfter = updateMusicPainAfter;
document.addEventListener('change', e => {
  if (e.target?.name !== 'aura' || !e.target.checked) return;
  document.querySelectorAll('input[name="aura"]').forEach(b => {
    if (b === e.target) return;
    if (e.target.value === 'none' || b.value === 'none') b.checked = false;
  });
});

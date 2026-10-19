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
    .map(r => rptDay(r.created_at))).size;
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
      <td>${rptDay(r.created_at)}</td><td>${h.pain_score ?? '-'}</td><td>${rptEsc(locs)}</td>
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

  const since = Date.now() - REPORT_DAYS * 86400000;
  const records = (window.allUserRecords || [])
    .filter(r => r.created_at && new Date(r.created_at).getTime() >= since)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const hasQuiz = Object.keys(window.QuizTrend?.latest() || {}).length > 0;
  if (records.length === 0 && !hasQuiz) { alert(t.noRecords(REPORT_DAYS)); return; }

  // 趨勢圖：僅在不是示範資料時放入
  let chartImg = '';
  try {
    const isMock = window.globalChartData?.isMock;
    if (typeof chartInstance !== 'undefined' && chartInstance && !isMock) {
      chartImg = chartInstance.toBase64Image();
    }
  } catch (e) { console.warn('chart to image failed', e); }

  let email = '';
  try { email = (await supabase.auth.getUser()).data.user?.email || ''; } catch {}

  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;background:#fff;';
  holder.innerHTML = buildReportHtml(records, chartImg, email);
  document.body.appendChild(holder);

  try {
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
    pdf.save(t.file(new Date().toLocaleDateString('sv-SE')));
  } catch (e) {
    console.error('export failed', e);
    alert(t.fail + e.message);
  } finally {
    holder.remove();
  }
}
window.exportMedicalReport = exportMedicalReport;

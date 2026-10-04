// export.js — 匯出記錄 (PDF)
// 需要在 index.html 載入（放在 jsPDF 之後、main.js 之前）：
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
// <script src="./export.js"></script>
// 並刪除 main.js 裡舊的 exportMedicalReport()。

// ====== 依你的資料庫調整這一區 ======
const REPORT_DAYS = 30;

// 問卷分數放在哪個欄位？請改成你 save.js 實際寫入的位置
const QUESTIONNAIRE_GETTERS = {
  BAI:  r => r.questionnaire_data?.bai_score,
  BDI:  r => r.questionnaire_data?.bdi_score,
  PSQI: r => r.questionnaire_data?.psqi_score
};

const REPORT_SYMPTOM_LABELS = {
  sym_1: '持續性頭痛', sym_2: '頭暈、失去平衡', sym_3: '噁心、想吐',
  sym_4: '疲勞、嗜睡', sym_5: '注意力、記憶變差', sym_6: '反應慢、腦霧',
  sym_7: '易怒、焦慮、情緒波動', sym_8: '視力模糊、畏光畏聲',
  sym_9: '睡眠障礙', sym_10: '頸部疼痛、麻木'
};
const REPORT_LOCATION_LABELS = { forehead: '前額', left: '左側', right: '右側', back: '後腦勺' };
// ====================================

function rptEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const rptAvg = arr => {
  const v = arr.filter(x => typeof x === 'number' && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const rptFmt = (n, d = 1) => (n === null || n === undefined) ? '-' : Number(n).toFixed(d);

function rptInterpret(name, score) {
  if (score === null || score === undefined) return '-';
  const s = Number(score);
  if (name === 'BAI')  return s <= 7 ? '極輕微' : s <= 15 ? '輕度' : s <= 25 ? '中度' : '重度';
  if (name === 'BDI')  return s <= 13 ? '極輕微' : s <= 19 ? '輕度' : s <= 28 ? '中度' : '重度';
  if (name === 'PSQI') return s > 5 ? '睡眠品質不佳' : '睡眠品質良好';
  return '-';
}

function rptParseLocations(h) {
  let loc = h?.locations ?? [];
  if (typeof loc === 'string') { try { loc = JSON.parse(loc); } catch { loc = [loc]; } }
  return Array.isArray(loc) ? loc : [];
}

function buildReportHtml(records, chartImg, userEmail) {
  const scores = records.map(r => r.headache_data?.pain_score ?? 0);
  const attackDays = new Set(records.filter(r => (r.headache_data?.pain_score ?? 0) > 0)
    .map(r => r.created_at.split('T')[0])).size;
  const medCount = records.filter(r => r.headache_data?.medication_used).length;

  const locCount = {};
  records.forEach(r => rptParseLocations(r.headache_data).forEach(l => {
    const k = REPORT_LOCATION_LABELS[l] || l;
    locCount[k] = (locCount[k] || 0) + 1;
  }));
  const topLoc = Object.entries(locCount).sort((a, b) => b[1] - a[1])
    .slice(0, 3).map(e => `${e[0]}(${e[1]})`).join('、') || '-';

  // 氣壓與疼痛對照
  const hi = records.filter(r => (r.headache_data?.pain_score ?? 0) >= 7);
  const lo = records.filter(r => (r.headache_data?.pain_score ?? 0) < 7);
  const pHi = rptAvg(hi.map(r => r.weather_data?.pressure));
  const pLo = rptAvg(lo.map(r => r.weather_data?.pressure));

  // 症狀平均
  const symRows = Object.keys(REPORT_SYMPTOM_LABELS).map(id => {
    const a = rptAvg(records.map(r => r.symptoms_data?.[id]));
    return `<tr><td>${REPORT_SYMPTOM_LABELS[id]}</td><td>${rptFmt(a)}</td></tr>`;
  }).join('');

  // 問卷（取最新一筆有值的）
  const qRows = Object.keys(QUESTIONNAIRE_GETTERS).map(name => {
    const hit = [...records].reverse().find(r => {
      const v = QUESTIONNAIRE_GETTERS[name](r);
      return v !== undefined && v !== null && v !== '';
    });
    if (!hit) return `<tr><td>${name}</td><td colspan="3">無資料</td></tr>`;
    const v = QUESTIONNAIRE_GETTERS[name](hit);
    return `<tr><td>${name}</td><td>${rptEsc(v)}</td><td>${rptInterpret(name, v)}</td>` +
           `<td>${hit.created_at.split('T')[0]}</td></tr>`;
  }).join('');

  // 逐日明細
  const detailRows = records.map(r => {
    const h = r.headache_data || {}, w = r.weather_data || {};
    const locs = rptParseLocations(h).map(l => REPORT_LOCATION_LABELS[l] || l).join('、') || '-';
    const med = h.medication_used ? rptEsc(h.medication_name || '有') : '無';
    const note = rptEsc(h.notes || h.content || '');
    return `<tr>
      <td>${r.created_at.split('T')[0]}</td><td>${h.pain_score ?? '-'}</td><td>${locs}</td>
      <td>${med}</td><td>${w.temperature ?? '-'}</td><td>${w.humidity ?? '-'}</td>
      <td>${w.pressure ?? '-'}</td><td>${note}</td></tr>`;
  }).join('');

  const style = `
    .rpt{width:794px;padding:36px;box-sizing:border-box;font-family:"Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif;color:#222;background:#fff;font-size:13px;line-height:1.5}
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

  return `<style>${style}</style><div class="rpt">
    <h1>頭痛與氣象記錄報告</h1>
    <div style="color:#666">匯出日期：${new Date().toLocaleDateString('zh-TW')}　帳號：${rptEsc(userEmail || '-')}　期間：近 ${REPORT_DAYS} 天</div>

    <h2>1. 統計摘要</h2>
    <div class="grid">
      <div class="box">記錄筆數<b>${records.length}</b></div>
      <div class="box">頭痛發作天數<b>${attackDays}</b></div>
      <div class="box">平均疼痛<b>${rptFmt(rptAvg(scores))} / 10</b></div>
      <div class="box">最高疼痛<b>${Math.max(...scores)}</b></div>
      <div class="box">用藥比例<b>${medCount} / ${records.length}</b></div>
      <div class="box">常見部位<b style="font-size:13px">${topLoc}</b></div>
    </div>

    <h2>2. 氣壓與疼痛對照</h2>
    <table>
      <tr><th>分組</th><th>筆數</th><th>平均氣壓 (hPa)</th></tr>
      <tr><td>疼痛 ≥ 7</td><td>${hi.length}</td><td>${rptFmt(pHi)}</td></tr>
      <tr><td>疼痛 &lt; 7</td><td>${lo.length}</td><td>${rptFmt(pLo)}</td></tr>
    </table>

    ${chartImg ? `<h2>3. 趨勢圖</h2><img src="${chartImg}" style="width:100%">` : ''}

    <h2>4. 相關症狀平均分數 (1–10)</h2>
    <table><tr><th>症狀</th><th>平均</th></tr>${symRows}</table>

    <h2>5. 問卷結果（最近一次）</h2>
    <table><tr><th>量表</th><th>分數</th><th>分級</th><th>填寫日期</th></tr>${qRows}</table>

    <h2>6. 逐日明細</h2>
    <table>
      <tr><th>日期</th><th>疼痛</th><th>部位</th><th>用藥</th><th>溫度°C</th><th>濕度%</th><th>氣壓hPa</th><th>備註</th></tr>
      ${detailRows}
    </table>

    <div class="note">本報告僅供個人健康紀錄與研究參考，不具醫療診斷功能。問卷分級為一般常用切點，實際判讀請由專業人員為之。</div>
  </div>`;
}

async function exportMedicalReport() {
  if (!window.jspdf || !window.html2canvas) {
    alert('PDF 元件尚未載入，請確認已加入 html2canvas。');
    return;
  }
  const since = Date.now() - REPORT_DAYS * 86400000;
  const records = (window.allUserRecords || [])
    .filter(r => r.created_at && new Date(r.created_at).getTime() >= since)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (records.length === 0) {
    alert(`近 ${REPORT_DAYS} 天沒有紀錄可匯出`);
    return;
  }

  // 趨勢圖：僅在不是示範資料時放入
  let chartImg = '';
  try {
    const isMock = window.globalChartData?.isMock;
    if (typeof chartInstance !== 'undefined' && chartInstance && !isMock) {
      chartImg = chartInstance.toBase64Image();
    }
  } catch (e) { console.warn('圖表轉圖失敗', e); }

  let email = '';
  try { email = (await supabase.auth.getUser()).data.user?.email || ''; } catch {}

  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;background:#fff;';
  holder.innerHTML = buildReportHtml(records, chartImg, email);
  document.body.appendChild(holder);

  try {
    // 等圖片載入
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
    pdf.save(`頭痛報告_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (e) {
    console.error('匯出失敗', e);
    alert('匯出失敗：' + e.message);
  } finally {
    holder.remove();
  }
}
window.exportMedicalReport = exportMedicalReport;

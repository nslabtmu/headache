//quiz-trend.js
(function () {
'use strict';
const isEn = () => /^en/i.test(document.querySelector('.lang-btn.active[data-lang]')?.dataset.lang || document.documentElement.lang || 'zh');

const NAMES = { phq9:'PHQ-9', gad7:'GAD-7', bdi:'BDI-II', bai:'BAI', psqi:'PSQI', ess:'ESS', dhi:'DHI', pssi:'PSS-I' };
const MAX   = { phq9:27, gad7:21, bdi:63, bai:63, psqi:21, ess:24, dhi:100, pssi:51 };
// total <= c[0] → 0，<= c[1] → 1，<= c[2] → 2，其餘 3（只用來決定顏色）
const CUT = {
  phq9:[4,9,14], gad7:[4,9,14], bdi:[13,19,28], bai:[7,15,25], ess:[10,12,15],
  dhi:[0,30,60], psqi:[5,5,5], pssi:[14,14,14]
};
const COLOR = ['#2e7d32', '#f9a825', '#ef6c00', '#c62828'];

const severityOf = (quiz, total) => {
  const c = CUT[quiz] || [0, 0, 0];
  return total <= c[0] ? 0 : total <= c[1] ? 1 : total <= c[2] ? 2 : 3;
};
const localDate = iso => new Date(iso).toLocaleDateString('sv-SE'); // YYYY-MM-DD（本地時區）
const labelOf = r => (isEn() ? (r.levelEn || r.level) : r.level) || '';

let rows = [], byDate = {}, chart = null;

function db() {
  const c = window.supabaseClient || window.sb || window.db || window.supabase;
  return (c && typeof c.from === 'function') ? c : null;
}

async function load() {
  const c = db();
  if (!c) return;
  const { data: { session } } = await c.auth.getSession();
  if (!session) { rows = []; byDate = {}; return; }
  const { data, error } = await c.from('quiz_results')
    .select('quiz,total_score,level,created_at,details')
    .eq('user_id', session.user.id).order('created_at');
  if (error) { console.error('讀取量表紀錄失敗', error); return; }

  rows = data.map(r => ({
    quiz: r.quiz, name: NAMES[r.quiz] || r.quiz, total: r.total_score,
    max: r.details?.max ?? MAX[r.quiz],
    level: r.level, levelEn: r.details?.level_en,
    date: localDate(r.created_at), sev: severityOf(r.quiz, r.total_score)
  }));
  byDate = {};
  rows.forEach(r => (byDate[r.date] = byDate[r.date] || []).push(r));

  const sel = document.getElementById('quizTrendSelect');
  if (sel) {
    const used = [...new Set(rows.map(r => r.quiz))];
    const keep = sel.value;
    sel.innerHTML = used.map(q => `<option value="${q}">${NAMES[q] || q}</option>`).join('');
    if (used.includes(keep)) sel.value = keep;
  }
  render();
}

function renderChart() {
  const cv = document.getElementById('quizChart');
  const sel = document.getElementById('quizTrendSelect');
  if (!cv || !sel || typeof Chart === 'undefined') return;
  const q = sel.value;
  const pts = rows.filter(r => r.quiz === q);
  if (chart) chart.destroy();
  chart = new Chart(cv, {
    type: 'line',
    data: {
      labels: pts.map(p => p.date),
      datasets: [{
        label: NAMES[q] || q, data: pts.map(p => p.total),
        borderColor: '#3f51b5', tension: 0.2, pointRadius: 6,
        pointBackgroundColor: pts.map(p => COLOR[p.sev])
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: MAX[q] } },
      plugins: { tooltip: { callbacks: { afterLabel: ctx => labelOf(pts[ctx.dataIndex]) } } }
    }
  });
}

function events() {
  return rows.map(r => ({
    title: `🧠 ${r.name} ${r.total}`,
    start: r.date, allDay: true, color: COLOR[r.sev],
    extendedProps: { isQuiz: true, quiz: r.quiz, total: r.total, max: r.max }
  }));
}

function latest() { const o = {}; rows.forEach(r => (o[r.quiz] = r)); return o; } // 每個量表最新一筆

function render() {
  renderChart();
  window.myCalendar?.refetchEvents();
}

window.QuizTrend = { load, render, events, labelOf, latest, byDate: () => byDate };
})();

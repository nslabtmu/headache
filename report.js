async function exportMedicalReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const records = (window.allUserRecords || [])
    .filter(r => new Date(r.created_at) >= new Date(Date.now() - 30*86400000));

  if (records.length === 0) {
    alert('近 30 天沒有紀錄可匯出');
    return;
  }

  const scores = records.map(r => r.headache_data?.pain_score ?? 0);
  const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  const medCount = records.filter(r => r.headache_data?.medication_used).length;

  // 痛點次數統計
  const locCount = {};
  records.forEach(r => (r.headache_data?.locations || [])
    .forEach(l => locCount[l] = (locCount[l] || 0) + 1));
  const topLoc = Object.entries(locCount).sort((a, b) => b[1] - a[1])
    .slice(0, 2).map(e => e[0]).join(', ') || 'N/A';

  doc.setFontSize(18);
  doc.text("Headache & Weather Report", 14, 20);
  doc.setFontSize(11);
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 28);
  doc.text(`Records (last 30 days): ${records.length}`, 14, 34);
  doc.text(`Average Pain: ${avg} / 10`, 14, 42);
  doc.text(`Top Locations: ${topLoc}`, 14, 50);
  doc.text(`Medication Used: ${medCount} / ${records.length}`, 14, 58);

  // 逐筆明細
  let y = 72;
  records.forEach(r => {
    if (y > 280) { doc.addPage(); y = 20; }
    const d = r.created_at.split('T')[0];
    const w = r.weather_data || {};
    doc.text(`${d}  Pain ${r.headache_data?.pain_score ?? '-'}  ` +
             `${w.temperature ?? '-'}C  ${w.humidity ?? '-'}%  ${w.pressure ?? '-'}hPa`, 14, y);
    y += 7;
  });

  doc.save("Headache_Report.pdf");
}

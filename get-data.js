async function sendData() {
  const input = document.getElementById('userInput').value;
  
  // 填寫你 Cloudflare Pages 的 API 完整網址
  const res = await fetch('https://your-project.pages.dev/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: input })
  });

  const data = await res.json();
  alert(data.success ? '成功寫入！' : '失敗：' + data.error);
}
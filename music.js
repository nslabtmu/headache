// 三種主題對應的音樂檔案網址（請替換成你實際上傳的音訊 URL）
const musicSources = {
    piano: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf756.mp3?filename=gentle-piano-110668.mp3",
    forest: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_20623a311d.mp3?filename=forest-lullaby-110624.mp3",
    ocean: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ocean-waves-112906.mp3"
};

const musicSelect = document.getElementById('musicSelect');
const therapyAudio = document.getElementById('therapyAudio');
const statusEl = document.getElementById('therapyStatus');

let therapyStartTime = null;
let progressTimer = null;
let currentGenreName = "純鋼琴";

// 當使用者切換下拉選單時，自動更換音樂來源
musicSelect.addEventListener('change', (e) => {
    const selectedKey = e.target.value;
    therapyAudio.src = musicSources[selectedKey];
    currentGenreName = e.target.options[e.target.selectedIndex].text;
    therapyAudio.load();
    statusEl.innerText = `已切換至：${currentGenreName}，準備就緒`;
});

// 當按下播放時
therapyAudio.addEventListener('play', () => {
  therapyStartTime = new Date().toISOString();
  let secondsElapsed = 0;
  
  clearInterval(progressTimer);
  progressTimer = setInterval(() => {
    secondsElapsed++;
    
    // U 序列 20 分鐘階段提示
    if (secondsElapsed < 300) {
      statusEl.innerText = `狀態：【進入期】${currentGenreName} 節奏漸緩，引導放鬆...`;
    } else if (secondsElapsed < 900) {
      statusEl.innerText = `狀態：【核心放鬆期】低頻沉浸，平穩神經...`;
    } else {
      statusEl.innerText = `狀態：【回歸期】能量微升，溫和喚醒...`;
    }
  }, 1000);
});

// 當手動暫停時
therapyAudio.addEventListener('pause', () => {
  clearInterval(progressTimer);
  if (therapyStartTime && !therapyAudio.ended) {
    statusEl.innerText = "狀態：已中途暫停";
  }
});

// 當 20 分鐘音樂完整播放結束時
therapyAudio.addEventListener('ended', async () => {
  clearInterval(progressTimer);
  const therapyEndTime = new Date().toISOString();
  statusEl.innerText = "狀態：療程圓滿完成！紀錄已自動存入資料庫。";
  
  try {
    // 寫入你的 Supabase 資料庫（請確認資料表欄位包含 start_time, end_time, protocol）
    const { data, error } = await supabase
      .from('music_therapy_logs')
      .insert([
        { 
          start_time: therapyStartTime, 
          end_time: therapyEndTime,
          protocol: `U-Sequence: ${currentGenreName}`
        }
      ]);

    if (error) {
      console.error('Supabase 寫入失敗：', error.message);
    } else {
      console.log('音樂治療紀錄成功儲存！', data);
    }
  } catch (err) {
    console.error('發生預期外的錯誤：', err);
  }
  
  therapyStartTime = null;
});

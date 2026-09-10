// music.js // 確保三個播放器都綁定好對應的音訊網址
const players = [
    { 
        audio: document.getElementById('audioPiano'), 
        status: document.getElementById('statusPiano'), 
        name: '純鋼琴',
        url: 'https://archive.org/download/gentle-piano-relaxation/gentle_piano.mp3'
    },
    { 
        audio: document.getElementById('audioForest'), 
        status: document.getElementById('statusForest'), 
        name: '森林',
        url: 'https://archive.org/download/forest-ambience/forest_sounds.mp3'
    },
    { 
        audio: document.getElementById('audioOcean'), 
        status: document.getElementById('statusOcean'), 
        name: '海洋',
        url: 'https://archive.org/download/ocean-waves-relaxation/ocean_waves.mp3'
    }
];

let activeTimer = null;
let activeStartTime = null;

// 初始化設定每一個播放器
players.forEach(item => {
    // 如果 HTML 裡面的 source 沒抓到，用 JS 強制指定 src
    if (!item.audio.src || item.audio.src === window.location.href) {
        item.audio.src = item.url;
    }

    // 當任一個播放器被按下播放時
    item.audio.addEventListener('play', () => {
        // 1. 暫停其他兩個播放器，避免聲音打架
        players.forEach(p => {
            if (p.audio !== item.audio) {
                p.audio.pause();
                p.status.innerText = "狀態：尚未開始";
            }
        });

        // 2. 初始化計時與全域變數
        activeStartTime = new Date().toISOString();
        
        // 賦值給全域變數，供 main.js 或其他檔案隨時讀取
        window.lastMusicProtocol = `U-Sequence: ${item.name}`;
        window.lastMusicStartTime = activeStartTime;
        window.lastMusicEndTime = null;

        let secondsElapsed = 0;
        
        clearInterval(activeTimer);
        activeTimer = setInterval(() => {
            secondsElapsed++;
            if (secondsElapsed < 300) {
                item.status.innerText = `狀態：【進入期】${item.name} 節奏漸緩，引導放鬆...`;
            } else if (secondsElapsed < 900) {
                item.status.innerText = `狀態：【核心放鬆期】低頻沉浸，平穩神經...`;
            } else {
                item.status.innerText = `狀態：【回歸期】能量微升，溫和喚醒...`;
            }
        }, 1000);
    });

    // 當手動暫停時
    item.audio.addEventListener('pause', () => {
        if (activeStartTime && !item.audio.ended) {
            clearInterval(activeTimer);
            item.status.innerText = "狀態：已中途暫停";
            window.lastMusicEndTime = new Date().toISOString();
        }
    });

    // 當 20 分鐘音樂完整播放結束時
    item.audio.addEventListener('ended', async () => {
        clearInterval(activeTimer);
        const endTime = new Date().toISOString();
        window.lastMusicEndTime = endTime;
        item.status.innerText = "狀態：療程圓滿完成！紀錄已存入資料庫。";
        
        try {
            const { data, error } = await supabase
                .from('music_therapy_logs')
                .insert([
                    { 
                        start_time: activeStartTime, 
                        end_time: endTime,
                        protocol: `U-Sequence: ${item.name}`
                    }
                ]);

            if (error) {
                console.error('Supabase 寫入失敗：', error.message);
            } else {
                console.log(`音樂治療 (${item.name}) 紀錄成功儲存！`, data);
            }
        } catch (err) {
            console.error('發生錯誤：', err);
        }
        
        activeStartTime = null;
    });
});


function toggleTherapyMusic(btn) {
    if (!isMusicRunning) {
        therapyAudio.start(); // 啟動瀏覽器即時生成音樂
        btn.innerText = "⏹️ 停止療癒音樂";
        btn.style.background = "#f44336";
        isMusicRunning = true;

        // 自動記錄開始時間
        window.lastMusicStartTime = new Date().toISOString();
        window.lastMusicProtocol = "Web Audio Ambient Generator (60-70 BPM)";
    } else {
        therapyAudio.stop(); // 停止音樂
        btn.innerText = "▶️ 開始聆聽療癒音樂";
        btn.style.background = "#4CAF50";
        isMusicRunning = false;

        // 記錄結束時間
        window.lastMusicEndTime = new Date().toISOString();
    }
}
var ytPlayer;
var countdownTimer = null;
var timeLeft = 20 * 60; // 20 分鐘換算成秒數 (1200秒)
var isSessionRunning = false;

let bgPlayer;
let isAudioRunning = false;

// 當 YouTube API 準備好時自動初始化
function onYouTubeIframeAPIReady() {
    bgPlayer = new YT.Player('hidden-audio-player', {
        height: '1',
        width: '1',
        videoId: 'Os47nMrjw_Y', // 你的音樂影片 ID
        playerVars: {
            'autoplay': 0,
            'controls': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onAudioStateChange
        }
    });
}

function onPlayerReady(event) {
    console.log("✅ 背景音訊播放器已準備就緒");
}

function toggleAudioOnly() {
    const btn = document.getElementById('audio-ctrl-btn');
    if (!bgPlayer || typeof bgPlayer.playVideo !== 'function') {
        alert("播放器正在載入中，請稍候再試...");
        return;
    }

    if (!isAudioRunning) {
        bgPlayer.playVideo();
        isAudioRunning = true;
        btn.innerText = "⏹️ 停止療癒音樂";
        btn.style.background = "#f44336"; // 變成紅色代表停止/進行中

        // 🔗 完美對接你的研究數據變數
        window.lastMusicStartTime = new Date().toISOString();
        window.lastMusicProtocol = "YouTube Audio-Only (Os47nMrjw_Y)";
    } else {
        bgPlayer.pauseVideo();
        isAudioRunning = false;
        btn.innerText = "▶️ 開始播放療癒音樂";
        btn.style.background = "#4CAF50"; // 變成綠色代表待命

        // 記錄結束時間
        window.lastMusicEndTime = new Date().toISOString();
    }
}

function onAudioStateChange(event) {
    // 當音樂自然播畢時的處理
    if (event.data == YT.PlayerState.ENDED) {
        isAudioRunning = false;
        window.lastMusicEndTime = new Date().toISOString();
        document.getElementById('audio-ctrl-btn').innerText = "▶️ 開始播放療癒音樂";
        document.getElementById('audio-ctrl-btn').style.background = "#4CAF50";
        console.log("🎵 音樂播畢，數據已記錄。");
    }
}

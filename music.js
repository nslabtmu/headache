// ==================== 1. 多播放器狀態與計時管理 ====================
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

// 初始化每一個播放器
players.forEach(item => {
    if (!item.audio) return; // 防呆：如果網頁上沒這個元素就跳過

    if (!item.audio.src || item.audio.src === window.location.href) {
        item.audio.src = item.url;
    }

    item.audio.addEventListener('play', () => {
        players.forEach(p => {
            if (p.audio && p.audio !== item.audio) {
                p.audio.pause();
                if (p.status) p.status.innerText = "狀態：尚未開始";
            }
        });

        activeStartTime = new Date().toISOString();
        window.lastMusicProtocol = `U-Sequence: ${item.name}`;
        window.lastMusicStartTime = activeStartTime;
        window.lastMusicEndTime = null;

        let secondsElapsed = 0;
        clearInterval(activeTimer);
        activeTimer = setInterval(() => {
            secondsElapsed++;
            if (item.status) {
                if (secondsElapsed < 300) {
                    item.status.innerText = `狀態：【進入期】${item.name} 節奏漸緩，引導放鬆...`;
                } else if (secondsElapsed < 900) {
                    item.status.innerText = `狀態：【核心放鬆期】低頻沉浸，平穩神經...`;
                } else {
                    item.status.innerText = `狀態：【回歸期】能量微升，溫和喚醒...`;
                }
            }
        }, 1000);
    });

    item.audio.addEventListener('pause', () => {
        if (activeStartTime && !item.audio.ended) {
            clearInterval(activeTimer);
            if (item.status) item.status.innerText = "狀態：已中途暫停";
            window.lastMusicEndTime = new Date().toISOString();
        }
    });

    item.audio.addEventListener('ended', async () => {
        clearInterval(activeTimer);
        const endTime = new Date().toISOString();
        window.lastMusicEndTime = endTime;
        if (item.status) item.status.innerText = "狀態：療程圓滿完成！紀錄已存入資料庫。";
        
        try {
            const { data, error } = await supabase
                .from('music_therapy_logs')
                .insert([{ 
                    start_time: activeStartTime, 
                    end_time: endTime,
                    protocol: `U-Sequence: ${item.name}`
                }]);

            if (error) console.error('Supabase 寫入失敗：', error.message);
        } catch (err) {
            console.error('發生錯誤：', err);
        }
        activeStartTime = null;
    });
});


// ==================== 2. YouTube 背景音訊播放器控制 ====================
// 改用 var 宣告，徹底解決 Cannot access 'bgPlayer' before initialization 錯誤
var bgPlayer = null;
var isAudioRunning = false;
var timeLeft = 20 * 60; 
var isSessionRunning = false;

// 當 YouTube API 準備好時自動初始化
function onYouTubeIframeAPIReady() {
    const container = document.getElementById('hidden-audio-player');
    if (!container) return; // 防呆：若無此容器則不初始化

    bgPlayer = new YT.Player('hidden-audio-player', {
        height: '1',
        width: '1',
        videoId: 'Os47nMrjw_Y', // 音樂影片 ID
        playerVars: {
            'autoplay': 0,
            'controls': 0
        },
        events: {
            'onReady': (event) => console.log("✅ 背景音訊播放器已準備就緒"),
            'onStateChange': onAudioStateChange
        }
    });
}

function toggleAudioOnly() {
    const btn = document.getElementById('audio-ctrl-btn');
    
    // 嚴格防呆：檢查 bgPlayer 是否已經建立且具有 playVideo 方法
    if (!bgPlayer || typeof bgPlayer.playVideo !== 'function') {
        alert("播放器尚在載入中，請稍候再試...");
        return;
    }

    if (!isAudioRunning) {
        bgPlayer.playVideo();
        isAudioRunning = true;
        if (btn) {
            btn.innerText = "⏹️ 停止療癒音樂";
            btn.style.background = "#f44336";
        }

        window.lastMusicStartTime = new Date().toISOString();
        window.lastMusicProtocol = "YouTube Audio-Only (Os47nMrjw_Y)";
    } else {
        bgPlayer.pauseVideo();
        isAudioRunning = false;
        if (btn) {
            btn.innerText = "▶️ 開始播放療癒音樂";
            btn.style.background = "#4CAF50";
        }

        window.lastMusicEndTime = new Date().toISOString();
    }
}

function onAudioStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        isAudioRunning = false;
        window.lastMusicEndTime = new Date().toISOString();
        const btn = document.getElementById('audio-ctrl-btn');
        if (btn) {
            btn.innerText = "▶️ 開始播放療癒音樂";
            btn.style.background = "#4CAF50";
        }
        console.log("🎵 音樂播畢，數據已記錄。");
    }
}

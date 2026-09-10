// 定義三個音樂的設定與 YouTube Video ID
const musicConfigs = {
    piano: {
        name: '純鋼琴',
        videoId: 'Os47nMrjw_Y',
        containerId: 'yt-player-piano',
        btnId: 'btn-piano',
        statusId: 'status-piano'
    },
    forest: {
        name: '森林',
        videoId: '0DvSj6DAKDM', // 從你的網址抽離出來的 ID
        containerId: 'yt-player-forest',
        btnId: 'btn-forest',
        statusId: 'status-forest'
    },
    ocean: {
        name: '療癒音律',
        videoId: 'fFtHZQi00u0', // 從你的網址抽離出來的 ID
        containerId: 'yt-player-ocean',
        btnId: 'btn-ocean',
        statusId: 'status-ocean'
    }
};

let playersMap = {}; // 存放 YouTube 播放器物件
let activeKey = null; // 目前正在播放哪一個
let activeTimer = null;
let activeStartTime = null;

// 當 YouTube API 準備好時，自動初始化這三個播放器
function onYouTubeIframeAPIReady() {
    for (let key in musicConfigs) {
        let config = musicConfigs[key];
        playersMap[key] = new YT.Player(config.containerId, {
            height: '1',
            width: '1',
            videoId: config.videoId,
            playerVars: { 'autoplay': 0, 'controls': 0 },
            events: {
                'onStateChange': (event) => handlePlayerStateChange(key, event)
            }
        });
    }
    console.log("✅ 三個 YouTube 療癒音樂播放器已全部準備就緒");
}

// 點擊按鈕時觸發
/*function toggleYouTubeMusic(key) {
    let config = musicConfigs[key];
    let player = playersMap[key];
    let btn = document.getElementById(config.btnId);
    let statusEl = document.getElementById(config.statusId);

    if (!player || typeof player.playVideo !== 'function') {
        alert("播放器載入中，請稍候再試...");
        return;
    }

    // 如果點擊的是「目前正在播放的」，就將它暫停
    if (activeKey === key) {
        player.pauseVideo();
        stopSession(key, false);
        activeKey = null;
        return;
    }

    // 如果有其他音樂正在播，先把它們全部停掉並重設狀態
    for (let k in playersMap) {
        if (k !== key && playersMap[k] && typeof playersMap[k].pauseVideo === 'function') {
            playersMap[k].pauseVideo();
            stopSession(k, false);
        }
    }

    // 開始播放當前選中的音樂
    player.playVideo();
    activeKey = key;
    activeStartTime = new Date().toISOString();

    // 更新全域變數 (對接你的研究數據)
    window.lastMusicProtocol = `U-Sequence: ${config.name} (YouTube ${config.videoId})`;
    window.lastMusicStartTime = activeStartTime;
    window.lastMusicEndTime = null;

    // 按鈕與狀態變更
    btn.innerText = `⏹️ 停止${config.name}`;
    btn.style.background = "#f44336";

    // 啟動 20 分鐘計時器模擬階段提示
    let secondsElapsed = 0;
    clearInterval(activeTimer);
    activeTimer = setInterval(() => {
        secondsElapsed++;
        if (secondsElapsed < 300) {
            statusEl.innerText = `狀態：【進入期】${config.name} 節奏漸緩，引導放鬆...`;
        } else if (secondsElapsed < 900) {
            statusEl.innerText = `狀態：【核心放鬆期】低頻沉浸，平穩神經...`;
        } else {
            statusEl.innerText = `狀態：【回歸期】能量微升，溫和喚醒...`;
        }
    }, 1000);
}*/

// 停止或暫停時的清理函式
function stopSession(key, isCompleted = false) {
    let config = musicConfigs[key];
    let btn = document.getElementById(config.btnId);
    let statusEl = document.getElementById(config.statusId);

    if (activeKey === key) {
        clearInterval(activeTimer);
        activeKey = null;
    }

    if (btn) {
        btn.innerText = `▶️ 播放${config.name}`;
        btn.style.background = "#4CAF50";
    }

    const endTime = new Date().toISOString();
    window.lastMusicEndTime = endTime;

    if (!isCompleted && statusEl && statusEl.innerText.includes("狀態：【")) {
        statusEl.innerText = "狀態：已中途暫停";
    }
}

// 監聽 YouTube 音樂是否自然播畢
async function handlePlayerStateChange(key, event) {
    if (event.data == YT.PlayerState.ENDED) {
        let config = musicConfigs[key];
        let statusEl = document.getElementById(config.statusId);
        
        stopSession(key, true);
        if (statusEl) statusEl.innerText = "狀態：療程圓滿完成！紀錄已存入資料庫。";

        // 自動寫入 Supabase 紀錄
        try {
            const { data, error } = await supabase
                .from('music_therapy_logs')
                .insert([{ 
                    start_time: activeStartTime, 
                    end_time: window.lastMusicEndTime,
                    protocol: `U-Sequence: ${config.name} (YouTube ${config.videoId})`
                }]);

            if (error) {
                console.error('Supabase 寫入失敗：', error.message);
            } else {
                console.log(`✅ ${config.name} 治療紀錄成功儲存！`, data);
            }
        } catch (err) {
            console.error('發生錯誤：', err);
        }
        
        activeStartTime = null;
    }
}


// 非youtube 設定 ==================== 1. 多播放器狀態與計時管理 ====================
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
// ==========================================
// 🎵 多次音樂治療累積管理 (支援陣列模式)
// ==========================================

// 初始化全域音樂累積清單
window.sessionMusicLogs = window.sessionMusicLogs || [];

let playersMap = {};     
let activeKey = null;    
let activeTimer = null;  
let activeStartTime = null; 
let currentMusicItem = null; // 當前正在聽的音樂物件參考

// 初始化 YouTube API
function onYouTubeIframeAPIReady() {
    for (let key in musicConfigs) {
        let config = musicConfigs[key];
        if (document.getElementById(config.containerId)) {
            playersMap[key] = new YT.Player(config.containerId, {
                height: '1',
                width: '1',
                videoId: config.videoId,
                playerVars: { 'autoplay': 0, 'controls': 0 },
                events: {
                    'onStateChange': (event) => handlePlayerStateChange(key, event)
                }
            });
        }
    }
    console.log("✅ YouTube 播放器初始化完畢（多次累積模式）");
}

// 點擊按鈕播放/暫停
function toggleYouTubeMusic(key) {
    let config = musicConfigs[key];
    let player = playersMap[key];
    let btn = document.getElementById(config.btnId);
    let statusEl = document.getElementById(config.statusId);

    if (!player || typeof player.playVideo !== 'function') {
        alert("播放器尚在載入中，請稍候再試...");
        return;
    }

    // 如果點擊的是「目前正在播放的」，就將它暫停
    if (activeKey === key) {
        player.pauseVideo();
        stopSession(key, false);
        activeKey = null;
        return;
    }

    // 如果有其他音樂正在播，先停掉
    for (let k in playersMap) {
        if (k !== key && playersMap[k] && typeof playersMap[k].pauseVideo === 'function') {
            playersMap[k].pauseVideo();
            stopSession(k, false);
        }
    }

    // 開始播放
    player.playVideo();
    activeKey = key;
    activeStartTime = new Date().toISOString();

    // 建立這一次播放的物件，並放入累積陣列中
    currentMusicItem = {
        protocol: `U-Sequence: ${config.name} (YouTube ${config.videoId})`,
        start_time: activeStartTime,
        end_time: null,
        completed: false
    };
    window.sessionMusicLogs.push(currentMusicItem);

    // 更新按鈕樣式
    if (btn) {
        btn.innerText = `⏹️ 停止${config.name}`;
        btn.style.background = "#f44336";
    }

    // 啟動 20 分鐘計時器
    let secondsElapsed = 0;
    clearInterval(activeTimer);
    activeTimer = setInterval(() => {
        secondsElapsed++;
        if (statusEl) {
            if (secondsElapsed < 300) {
                statusEl.innerText = `狀態：【進入期】${config.name} 節奏漸緩...`;
            } else if (secondsElapsed < 900) {
                statusEl.innerText = `狀態：【核心放鬆期】平穩神經中...`;
            } else {
                statusEl.innerText = `狀態：【回歸期】溫和喚醒中...`;
            }
        }
    }, 1000);
}

// 停止或暫停
function stopSession(key, isCompleted = false) {
    let config = musicConfigs[key];
    let btn = document.getElementById(config.btnId);
    let statusEl = document.getElementById(config.statusId);

    if (activeKey === key) {
        clearInterval(activeTimer);
        activeKey = null;
    }

    if (btn) {
        btn.innerText = `▶️ 播放${config.name}`;
        btn.style.background = "#4CAF50";
    }

    const endTime = new Date().toISOString();
    
    // 更新當前音樂物件的結束時間
    if (currentMusicItem) {
        currentMusicItem.end_time = endTime;
        currentMusicItem.completed = isCompleted;
    }

    if (!isCompleted && statusEl && statusEl.innerText.includes("狀態：【")) {
        statusEl.innerText = "狀態：已中途暫停";
    }
}

// 監聽播畢
async function handlePlayerStateChange(key, event) {
    if (event.data == YT.PlayerState.ENDED) {
        let config = musicConfigs[key];
        let statusEl = document.getElementById(config.statusId);
        
        stopSession(key, true);
        if (statusEl) statusEl.innerText = "狀態：療程圓滿完成！";

        // 同時也支援寫入獨立的音樂日誌表（選擇性保留）
        try {
            await supabase.from('music_therapy_logs').insert([{ 
                start_time: activeStartTime, 
                end_time: currentMusicItem ? currentMusicItem.end_time : new Date().toISOString(),
                protocol: `U-Sequence: ${config.name} (YouTube ${config.videoId})`
            }]);
        } catch (err) {
            console.error('音樂獨立日誌寫入錯誤：', err);
        }
    }
}
// 在音樂程式碼的最下方加上這行：
window.toggleYouTubeMusic = toggleYouTubeMusic;

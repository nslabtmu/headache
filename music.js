// ==========================================
// 🎵 1. 定義三個音樂的設定與 YouTube Video ID
// ==========================================
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
        videoId: '0DvSj6DAKDM',
        containerId: 'yt-player-forest',
        btnId: 'btn-forest',
        statusId: 'status-forest'
    },
    ocean: {
        name: '療癒音律',
        videoId: 'fFtHZQi00u0',
        containerId: 'yt-player-ocean',
        btnId: 'btn-ocean',
        statusId: 'status-ocean'
    }
};

// ==========================================
// 🎵 2. 全域狀態與多次累積管理 (陣列模式)
// ==========================================
window.sessionMusicLogs = window.sessionMusicLogs || [];

let playersMap = {};     
let activeKey = null;    
let activeTimer = null;  
let activeStartTime = null; 
let currentMusicItem = null; // 當前正在聽的音樂物件參考

// ==========================================
// 🎵 3. 初始化 YouTube API
// ==========================================
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

// ==========================================
// 🎵 4. 點擊按鈕播放 / 暫停切換
// ==========================================
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

    // 同步更新舊版相容變數（以防其他主表送出邏輯還在讀取它）
    window.lastMusicProtocol = currentMusicItem.protocol;
    window.lastMusicStartTime = activeStartTime;
    window.lastMusicEndTime = null;

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

// ==========================================
// 🎵 5. 停止或暫停清理函式
// ==========================================
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
    
    // 更新當前音樂物件的結束時間
    if (currentMusicItem) {
        currentMusicItem.end_time = endTime;
        currentMusicItem.completed = isCompleted;
    }

    if (!isCompleted && statusEl && statusEl.innerText.includes("狀態：【")) {
        statusEl.innerText = "狀態：已中途暫停";
    }
}

// ==========================================
// 🎵 6. 監聽 YouTube 播放完畢事件
// ==========================================
async function handlePlayerStateChange(key, event) {
    if (event.data == YT.PlayerState.ENDED) {
        let config = musicConfigs[key];
        let statusEl = document.getElementById(config.statusId);
        
        stopSession(key, true);
        if (statusEl) statusEl.innerText = "狀態：療程圓滿完成！紀錄已存入資料庫。";

        // 自動寫入獨立的音樂日誌表
        try {
            const { error } = await supabase.from('music_therapy_logs').insert([{ 
                start_time: activeStartTime, 
                end_time: currentMusicItem ? currentMusicItem.end_time : new Date().toISOString(),
                protocol: `U-Sequence: ${config.name} (YouTube ${config.videoId})`
            }]);

            if (error) {
                console.error('音樂獨立日誌寫入錯誤：', error.message);
            } else {
                console.log(`✅ ${config.name} 獨立音樂日誌儲存成功！`);
            }
        } catch (err) {
            console.error('發生錯誤：', err);
        }
        
        activeStartTime = null;
    }
}

// ==========================================
// 🎵 7. 掛載至全域 Window (確保 HTML 點擊按鈕呼叫得到)
// ==========================================
window.toggleYouTubeMusic = toggleYouTubeMusic;

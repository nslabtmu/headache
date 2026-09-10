
// ==========================================
// 🎵 彈性 YouTube 音樂治療管理模組 (music.js)
// ==========================================

// 1️⃣ 音樂設定檔（內含原本的三個音樂，未來可隨意增減）
const musicConfigs = {
    piano: {
        name: '鋼琴',
        url: 'https://www.youtube.com/watch?v=Os47nMrjw_Y', // 直接貼網址就好！
        description: '拍速緩慢、留白較多，引導大腦放鬆。'
    },
    forest: {
        name: '森林',
        url: 'https://www.youtube.com/watch?v=0DvSj6DAKDM',
        description: '自然環境音，沉浸大自然頻率。'
    },
    ocean: {
        name: '海洋',
        url: 'https://www.youtube.com/watch?v=fFtHZQi00u0',
        description: '平穩音頻，溫和舒緩緊繃神經。'
    }
   /*增加新參數 
   rain: {
        name: '雨聲白噪音',
        description: '持續性柔和頻率，幫助深度安眠。',
        videoId: '你的YouTube影片ID_4'
    }*/
};

// 2️⃣ 全域變數與多次播放累積陣列
window.sessionMusicLogs = window.sessionMusicLogs || [];
let playersMap = {};     
let activeKey = null;    
let activeTimer = null;  
let activeStartTime = null; 
let currentMusicItem = null;


// 🛠️ 自動從 YouTube 網址擷取 Video ID 的小工具
function extractYouTubeId(url) {
    if (!url) return '';
    // 支援標準網址 (watch?v=...) 與短網址 (youtu.be/...)
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url; // 如果剛好直接填了 ID 也能相容
}

// 🎵 自動初始化所有 YouTube 播放器
function onYouTubeIframeAPIReady() {
    for (let key in musicConfigs) {
        let config = musicConfigs[key];
        
        // 🌟 自動把網址轉成 Video ID
        let videoId = extractYouTubeId(config.url || config.videoId);
        
        if (document.getElementById(config.containerId)) {
            playersMap[key] = new YT.Player(config.containerId, {
                height: '1',
                width: '1',
                videoId: videoId, // 帶入自動解析出來的 ID
                playerVars: { 'autoplay': 0, 'controls': 0 },
                events: {
                    'onStateChange': (event) => handlePlayerStateChange(key, event)
                }
            });
        }
    }
    console.log("✅ YouTube 播放器初始化完畢（支援網址自動解析）！");
}
// 3️⃣ 自動在網頁上生成音樂卡片
function renderMusicCards() {
    const container = document.getElementById('music-cards-container');
    if (!container) return;
    
    container.innerHTML = ''; // 清空重新渲染

    for (let key in musicConfigs) {
        let config = musicConfigs[key];
        
        let cardHTML = `
            <div class="form-card" style="flex: 1; min-width: 250px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; margin-bottom: 15px;">
                <h3 style="font-size: 15px; color: #2c3e50; margin-bottom: 5px;">🎵 ${config.name}</h3>
                <p style="font-size: 12px; color: #6c757d; margin-bottom: 10px;">${config.description}</p>
                
                <!-- YouTube 播放器隱藏容器 -->
                <div id="yt-player-${key}" style="display: none;"></div>
                
                <!-- 播放控制按鈕 -->
                <button id="btn-${key}" onclick="toggleYouTubeMusic('${key}')" style="width: 100%; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">▶️ 播放${config.name}</button>
                
                <!-- 狀態顯示 -->
                <div id="status-${key}" style="margin-top: 8px; font-size: 12px; font-weight: bold; color: #007bff;">狀態：尚未開始</div>
            </div>
        `;
        container.innerHTML += cardHTML;
    }
}

// 4️⃣ 初始化 YouTube IFrame API
function onYouTubeIframeAPIReady() {
    for (let key in musicConfigs) {
        let config = musicConfigs[key];
        let containerId = `yt-player-${key}`;
        
        if (document.getElementById(containerId)) {
            playersMap[key] = new YT.Player(containerId, {
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
    console.log("✅ YouTube 播放器初始化完畢");
}

// 5️⃣ 點擊播放 / 暫停控制邏輯
function toggleYouTubeMusic(key) {
    let config = musicConfigs[key];
    let player = playersMap[key];
    let btn = document.getElementById(`btn-${key}`);
    let statusEl = document.getElementById(`status-${key}`);

    if (!player || typeof player.playVideo !== 'function') {
        alert("播放器尚在載入中，請稍候再試...");
        return;
    }

    // 如果點擊的是目前正在播放的，則將其暫停
    if (activeKey === key) {
        player.pauseVideo();
        stopSession(key, false);
        activeKey = null;
        return;
    }

    // 互斥機制：如果有其他音樂正在播，先全部停掉
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

    // 建立本次播放紀錄，並推入累積陣列
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

    // 啟動 20 分鐘計時與階段狀態提示
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

// 6️⃣ 停止或暫停療程
function stopSession(key, isCompleted = false) {
    let config = musicConfigs[key];
    let btn = document.getElementById(`btn-${key}`);
    let statusEl = document.getElementById(`status-${key}`);

    if (activeKey === key) {
        clearInterval(activeTimer);
        activeKey = null;
    }

    if (btn) {
        btn.innerText = `▶️ 播放${config.name}`;
        btn.style.background = "#4CAF50";
    }

    const endTime = new Date().toISOString();
    
    if (currentMusicItem) {
        currentMusicItem.end_time = endTime;
        currentMusicItem.completed = isCompleted;
    }

    if (!isCompleted && statusEl && statusEl.innerText.includes("狀態：【")) {
        statusEl.innerText = "狀態：已中途暫停";
    }
}

// 7️⃣ 監聽 YouTube 播放結束事件
async function handlePlayerStateChange(key, event) {
    if (event.data == YT.PlayerState.ENDED) {
        let config = musicConfigs[key];
        let statusEl = document.getElementById(`status-${key}`);
        
        stopSession(key, true);
        if (statusEl) statusEl.innerText = "狀態：療程圓滿完成！";

        // 同步寫入獨立音樂日誌表（選擇性功能）
        try {
            if (typeof supabase !== 'undefined') {
                await supabase.from('music_therapy_logs').insert([{ 
                    start_time: activeStartTime, 
                    end_time: currentMusicItem ? currentMusicItem.end_time : new Date().toISOString(),
                    protocol: `U-Sequence: ${config.name} (YouTube ${config.videoId})`
                }]);
            }
        } catch (err) {
            console.error('音樂獨立日誌寫入錯誤：', err);
        }
    }
}

// 8️⃣ 頁面載入時自動執行卡片生成
window.addEventListener('DOMContentLoaded', () => {
    renderMusicCards();
});

// ==========================================
// 🎵 7. 掛載至全域 Window (確保 HTML 點擊按鈕呼叫得到)
// ==========================================
window.toggleYouTubeMusic = toggleYouTubeMusic;

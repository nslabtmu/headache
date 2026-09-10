// ==========================================
// 🎵 彈性 YouTube 音樂治療管理模組 (music.js)
// ==========================================

// 1️⃣ 音樂設定檔（內含原本的三個音樂，未來可隨意增減）
const musicConfigs = {
    piano: {
        name: '🎹 鋼琴',
        url: 'https://www.youtube.com/watch?v=Os47nMrjw_Y', // 直接貼網址就好！
        description: '拍速緩慢、留白較多，引導大腦放鬆。'
    },
    forest: {
        name: '🌲 森林',
        url: 'https://www.youtube.com/watch?v=0DvSj6DAKDM',
        description: '自然環境音，沉浸大自然頻率。'
    },
    ocean: {
        name: '🐬 海洋',
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


function extractYouTubeId(url) {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

// 3️⃣ 自動在網頁上生成音樂卡片
function renderMusicCards() {
    const container = document.getElementById('music-cards-container');
    if (!container) return;

    container.innerHTML = ''; // 清空重新渲染

    for (let key in musicConfigs) {
        let config = musicConfigs[key];

        let cardHTML = `
            <div class="form-card" style="flex: 1; min-width: 250px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; margin-bottom: 15px;" onmouseenter="prefetchPlayer('${key}')">
                <h3 style="font-size: 15px; color: #2c3e50; margin-bottom: 5px;">${config.name}</h3>
                <p style="font-size: 12px; color: #6c757d; margin-bottom: 10px;">${config.description}</p>

                <!-- YouTube 播放器隱藏容器 -->
                <div id="yt-player-${key}" style="display: none;"></div>

                <!-- 播放控制按鈕：一開始就可以點，點下去才真正建立該首歌的播放器（懶載入） -->
                <button id="btn-${key}" onclick="toggleYouTubeMusic('${key}')"
                    style="width: 100%; padding: 8px; background: #A5D6A7; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    ▶️ 播放${config.name}
                </button>

                <!-- 狀態顯示 -->
                <div id="status-${key}" style="margin-top: 8px; font-size: 12px; font-weight: bold; color: #007bff;">狀態：尚未開始</div>
            </div>
        `;
        container.innerHTML += cardHTML;
    }
}

// 4️⃣ 初始化 YouTube IFrame API
// 懶載入策略：這裡不再一次建立 3 個播放器（那是原本很慢的原因），
// 只記錄 API 是否已經準備好；真正的 YT.Player 會在使用者第一次點擊
// 該首歌的按鈕時，才由 ensurePlayer() 建立，且僅建立那一個。
let apiReady = false;

function onYouTubeIframeAPIReady() {
    apiReady = true;
    console.log("✅ YouTube IFrame API 已就緒（播放器將於點擊時才個別建立）");
}

// 建立中的播放器 Promise 快取：避免「滑鼠移入預載」跟「使用者點擊」同時觸發，
// 導致同一首歌被重複建立兩個播放器。
let pendingPlayers = {};

// 確保指定 key 的播放器已經建立；若還沒建立就立刻建立，並回傳 Promise，
// 在該播放器 onReady 之後才 resolve。重複呼叫同一個 key 會共用同一個 Promise。
function ensurePlayer(key) {
    if (playersMap[key]) {
        return Promise.resolve(playersMap[key]);
    }
    if (pendingPlayers[key]) {
        return pendingPlayers[key]; // 已經有人在建立中（例如滑鼠 hover 時觸發過），直接共用
    }

    const promise = new Promise((resolve, reject) => {
        if (!apiReady || typeof YT === 'undefined' || !YT.Player) {
            reject(new Error('YouTube API 尚未就緒'));
            return;
        }

        let config = musicConfigs[key];
        let containerId = `yt-player-${key}`;
        let videoId = extractYouTubeId(config.url || config.videoId);

        if (!videoId || !document.getElementById(containerId)) {
            reject(new Error(`${config.name} 缺少有效的影片 ID 或容器`));
            return;
        }

        const player = new YT.Player(containerId, {
            height: '1',
            width: '1',
            videoId: videoId,
            playerVars: { 'autoplay': 0, 'controls': 0 },
            events: {
                'onReady': () => {
                    playersMap[key] = player;
                    console.log(`✅ ${config.name} 播放器建立完成`);
                    resolve(player);
                },
                'onError': (e) => reject(new Error(`${config.name} 播放器載入失敗（code: ${e.data}）`)),
                'onStateChange': (event) => handlePlayerStateChange(key, event)
            }
        });
    });

    pendingPlayers[key] = promise;
    // 不管成功或失敗，處理完後都把 pending 清掉，讓下次呼叫可以重新嘗試
    promise.finally(() => { delete pendingPlayers[key]; });

    return promise;
}

// 滑鼠移入卡片時預先偷偷載入播放器，使用者實際點擊播放時就幾乎是秒開。
// 這裡故意不改動按鈕或狀態文字，避免干擾使用者當下看到的畫面；
// 失敗也只在 console 記錄，不跳 alert 打擾使用者（真正點擊播放時若還是失敗，toggleYouTubeMusic 會處理）。
function prefetchPlayer(key) {
    if (!apiReady) return; // API 都還沒好，先不用預載
    if (playersMap[key] || pendingPlayers[key]) return; // 已經建好或建立中，不用重複觸發

    console.log(`🔄 預先載入 ${musicConfigs[key].name} 播放器...`);
    ensurePlayer(key).catch((err) => {
        console.warn(`⚠️ 預先載入 ${musicConfigs[key].name} 失敗（不影響操作，點擊播放時會重試）：`, err.message);
    });
}

// 5️⃣ 點擊播放 / 暫停控制邏輯
async function toggleYouTubeMusic(key) {
    let config = musicConfigs[key];
    let btn = document.getElementById(`btn-${key}`);
    let statusEl = document.getElementById(`status-${key}`);

    // 如果點擊的是目前正在播放的，則將其暫停（這裡播放器一定已經存在，不需要 ensurePlayer）
    if (activeKey === key) {
        let existing = playersMap[key];
        if (existing) existing.pauseVideo();
        stopSession(key, false);
        activeKey = null;
        return;
    }

    let player = playersMap[key];

    // 尚未建立過這首歌的播放器 → 第一次點擊，現在才懶載入建立
    if (!player) {
        if (!apiReady) {
            alert("YouTube 播放器元件尚未載入完成，請稍候再試...");
            return;
        }
        if (btn) {
            btn.disabled = true;
            btn.innerText = `⏳ 載入${config.name}中...`;
            btn.style.background = '#cccccc';
            btn.style.cursor = 'wait';
        }
        if (statusEl) statusEl.innerText = "狀態：首次載入播放器中...";

        try {
            player = await ensurePlayer(key);
        } catch (err) {
            console.error(err);
            if (statusEl) statusEl.innerText = "狀態：載入失敗，請重新整理再試";
            if (btn) {
                btn.disabled = false;
                btn.innerText = `▶️ 播放$`;
                btn.style.background = '#A5D6A7';
                btn.style.cursor = 'pointer';
            }
            return;
        }

        if (btn) {
            btn.disabled = false;
            btn.style.cursor = 'pointer';
        }
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
        protocol: `U-Sequence: ${config.name}`,
        start_time: activeStartTime,
        end_time: null,
        completed: false
    };
    window.sessionMusicLogs.push(currentMusicItem);

    // 更新按鈕樣式
    if (btn) {
        btn.innerText = `⏹️ 停止`;
        btn.style.background = "#A9C0D6";
    }

    // 啟動計時與階段狀態提示
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
        btn.innerText = `▶️ 播放`;
        btn.style.background = "#A5D6A7";
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
                    protocol: `U-Sequence: ${config.name}`
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
// 🎵 9. 掛載至全域 Window (確保 HTML 點擊按鈕呼叫得到)
// ==========================================
window.toggleYouTubeMusic = toggleYouTubeMusic;
window.prefetchPlayer = prefetchPlayer;

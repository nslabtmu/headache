// ==========================================
// 🎵 彈性 YouTube 音樂治療管理模組 (music.js) - 方案 C 升級版
// ==========================================

// 1️⃣ 音樂設定檔
const musicConfigs = {
    piano: {
        name: '🎹 鋼琴',
        url: 'https://www.youtube.com/watch?v=uNDsZz2vaOQ',
        description: '拍速緩慢、留白較多，引導大腦放鬆。'
    },
    forest: {
        name: '🌲 森林',
        url: 'https://youtu.be/Gyy1o0o-G6I',
        description: '自然環境音，沉浸大自然頻率。'
    },
    ocean: {
        name: '🐬 海洋',
        url: 'https://youtube.com/shorts/1A-pOucGHwU',
        description: '平穩音頻，溫和舒緩緊繃神經。'
    },
    blue: {
        name: '1950 Blue',
        description: '持續性柔和頻率，幫助深度安眠。',
        videoId: 'dQw4w9WgXcQ'
    }
};

// 2️⃣ 全域變數與 方案 C 累計狀態控制
window.sessionMusicLogs = window.sessionMusicLogs || [];

let playersMap = {};     
let activeKey = null;    
let activeTimer = null;  
let pauseTimeoutTimer = null; // 10 分鐘暫停超時計時器

// 方案 C 專用累計變數
let sessionAccumulatedSeconds = 0; // 當前 session 累積播放總秒數
let sessionPauseCount = 0;         // 當前 session 暫停次數
let lastPlayStartTime = null;      // 該次按下播放/繼續的時間點
let currentSessionStartTime = null; // 該次聆聽最早啟動的時間

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

                <!-- 播放控制按鈕 -->
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

// 4️⃣ 初始化 YouTube IFrame API (懶載入機制)
let apiReady = false;

function onYouTubeIframeAPIReady() {
    apiReady = true;
    console.log("✅ YouTube IFrame API 已就緒");
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

let pendingPlayers = {};

function ensurePlayer(key) {
    if (playersMap[key]) {
        return Promise.resolve(playersMap[key]);
    }
    if (pendingPlayers[key]) {
        return pendingPlayers[key];
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
    promise.finally(() => { delete pendingPlayers[key]; });

    return promise;
}

function prefetchPlayer(key) {
    if (!apiReady || playersMap[key] || pendingPlayers[key]) return;
    ensurePlayer(key).catch((err) => {
        console.warn(`⚠️ 預先載入 ${musicConfigs[key].name} 失敗：`, err.message);
    });
}

// 5️⃣ 點擊播放 / 暫停控制邏輯 (方案 C：累計計時 + 自動結算)
async function toggleYouTubeMusic(key) {
    let config = musicConfigs[key];
    let btn = document.getElementById(`btn-${key}`);
    let statusEl = document.getElementById(`status-${key}`);

    // ----------------------------------------------------
    // 情境 A：按下【暫停】（使用者點擊正在播放的同一首歌）
    // ----------------------------------------------------
    if (activeKey === key) {
        let player = playersMap[key];
        if (player && typeof player.pauseVideo === 'function') {
            player.pauseVideo();
        }

        // 1. 計算這一階段播放的秒數，累加至總時長
        if (lastPlayStartTime) {
            let chunk = Math.floor((new Date() - lastPlayStartTime) / 1000);
            sessionAccumulatedSeconds += chunk;
            lastPlayStartTime = null;
        }

        sessionPauseCount++;
        clearInterval(activeTimer);
        activeKey = null;

        // 2. 更新 UI 按鈕與狀態
        if (btn) {
            btn.innerText = `▶️ 繼續播放${config.name}`;
            btn.style.background = '#A5D6A7';
        }
        if (statusEl) {
            statusEl.innerText = `狀態：已暫停（已累計 ${sessionAccumulatedSeconds} 秒，暫停 ${sessionPauseCount} 次）`;
        }

        // 3. ⏰ 啟動 10 分鐘超時自動結算（防止使用者暫停後忘記回來）
        clearTimeout(pauseTimeoutTimer);
        pauseTimeoutTimer = setTimeout(() => {
            console.log(`⏰ [${config.name}] 暫停超過 10 分鐘未恢復播放，自動結算存檔...`);
            finalizeAndPushLog(key, 'user_paused_timeout');
        }, 10 * 60 * 1000);

        return;
    }

    // ----------------------------------------------------
    // 情境 B：按下【播放】或【繼續播放】
    // ----------------------------------------------------
    clearTimeout(pauseTimeoutTimer); // 取消暫停超時計時

    // 切換歌時：先結算上一首歌的紀錄，並重置狀態
    if (activeKey && activeKey !== key) {
        stopSession(activeKey, 'switch_music');
    }

    // 首次播放這首歌：初始化時間與暫停數
    if (!lastPlayStartTime && sessionAccumulatedSeconds === 0) {
        currentSessionStartTime = new Date().toISOString();
        sessionPauseCount = 0;
    }

    // 懶載入確保播放器就緒
    let player = playersMap[key];
    if (!player) {
        if (btn) {
            btn.disabled = true;
            btn.innerText = `⏳ 載入中...`;
            btn.style.background = '#cccccc';
        }
        if (statusEl) statusEl.innerText = "狀態：載入播放器中...";

        try {
            player = await ensurePlayer(key);
        } catch (err) {
            console.error(err);
            if (statusEl) statusEl.innerText = "狀態：載入失敗，請稍後重試";
            if (btn) {
                btn.disabled = false;
                btn.innerText = `▶️ 播放${config.name}`;
                btn.style.background = '#A5D6A7';
            }
            return;
        }

        if (btn) btn.disabled = false;
    }

    player.playVideo();
    activeKey = key;
    lastPlayStartTime = new Date(); // 紀錄這一階段開始播放的時間點

    // 更新按鈕樣式
    if (btn) {
        btn.innerText = `⏸️ 暫停${config.name}`;
        btn.style.background = "#A9C0D6";
    }

    // 即時更新 UI 計時狀態
    clearInterval(activeTimer);
    activeTimer = setInterval(() => {
        let currentChunk = lastPlayStartTime ? Math.floor((new Date() - lastPlayStartTime) / 1000) : 0;
        let totalLiveSeconds = sessionAccumulatedSeconds + currentChunk;

        if (statusEl) {
            if (totalLiveSeconds < 300) {
                statusEl.innerText = `狀態：【進入期】累計 ${totalLiveSeconds} 秒...`;
            } else if (totalLiveSeconds < 900) {
                statusEl.innerText = `狀態：【核心放鬆期】累計 ${totalLiveSeconds} 秒...`;
            } else {
                statusEl.innerText = `狀態：【回歸期】累計 ${totalLiveSeconds} 秒...`;
            }
        }
    }, 1000);
}

// 6️⃣ 結算並打包寫入 sessionMusicLogs 陣列
function finalizeAndPushLog(key, endType = 'completed') {
    let config = musicConfigs[key];
    let player = playersMap[key];

    // 若播放中，計算當前最後這一段的時間
    if (lastPlayStartTime) {
        let chunk = Math.floor((new Date() - lastPlayStartTime) / 1000);
        sessionAccumulatedSeconds += chunk;
        lastPlayStartTime = null;
    }

    if (sessionAccumulatedSeconds <= 0) return; // 無播放時間不紀錄

    // 計算影片總時長與完成百分比 (%)
    let totalDuration = (player && typeof player.getDuration === 'function') ? player.getDuration() : 0;
    let progressPercentage = 0;
    if (totalDuration > 0) {
        progressPercentage = parseFloat(((sessionAccumulatedSeconds / totalDuration) * 100).toFixed(2));
        if (progressPercentage > 100) progressPercentage = 100;
    }

    // 完成度 >= 80% 或完播判定為臨床有效完成
    const isCompleted = (endType === 'completed') || (progressPercentage >= 80);

    const logItem = {
        protocol: `U-Sequence: ${config.name}`,
        start_time: currentSessionStartTime || new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_seconds: sessionAccumulatedSeconds, // 真正累積聆聽的總秒數
        progress_percentage: progressPercentage,     // 完成百分比 %
        pause_count: sessionPauseCount,             // 暫停次數
        end_type: endType,                          // 'completed', 'user_paused_timeout', 'switch_music', 'page_closed'
        completed: isCompleted
    };

    window.sessionMusicLogs.push(logItem);
    console.log("✅ 音樂紀錄已結算打包至 sessionMusicLogs：", logItem);

    // 重置該首歌的累計狀態
    sessionAccumulatedSeconds = 0;
    sessionPauseCount = 0;
    currentSessionStartTime = null;

    // 更新 UI
    let statusEl = document.getElementById(`status-${key}`);
    let btn = document.getElementById(`btn-${key}`);
    if (statusEl) statusEl.innerText = `狀態：已結算存檔 (${endType})`;
    if (btn) {
        btn.innerText = `▶️ 播放${config.name}`;
        btn.style.background = '#A5D6A7';
    }
}

// 7️⃣ 手動或切換歌曲時停止療程
function stopSession(key, endType = 'user_paused') {
    if (activeKey === key) {
        clearInterval(activeTimer);
        clearTimeout(pauseTimeoutTimer);
        let player = playersMap[key];
        if (player && typeof player.pauseVideo === 'function') {
            player.pauseVideo();
        }
        activeKey = null;
    }
    finalizeAndPushLog(key, endType);
}

// 8️⃣ 聽完（ENDED）自動觸發結算
async function handlePlayerStateChange(key, event) {
    if (event.data == YT.PlayerState.ENDED) {
        clearInterval(activeTimer);
        clearTimeout(pauseTimeoutTimer);
        activeKey = null;
        finalizeAndPushLog(key, 'completed');
    }
}

// 🌐 防關閉頁面遺失：關閉分頁或視窗時自動將正在播放的音樂結算
window.addEventListener('pagehide', () => {
    if (activeKey) {
        finalizeAndPushLog(activeKey, 'page_closed');
    }
});

// 9️⃣ 頁面載入時自動執行卡片生成
window.addEventListener('DOMContentLoaded', () => {
    renderMusicCards();
});

// 🔟 掛載至全域 Window
window.toggleYouTubeMusic = toggleYouTubeMusic;
window.prefetchPlayer = prefetchPlayer;
window.finalizeAndPushLog = finalizeAndPushLog;

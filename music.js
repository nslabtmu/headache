// ==========================================
// 🎵 YouTube 音樂治療模組 (music.js)
// 音樂清單全部來自資料表 music_tracks（由「帳號管理」頁維護），程式內不再寫死任何音樂。
// 每位受試者可看到哪些音樂，由 profiles.music_mode / allowed_music 決定。
// ==========================================
let sessionKey = null, pausedAt = null, sessionPainBefore = null, sessionIdForMusic = null;
const PAUSE_LIMIT_MS = 10 * 60 * 1000;
const mIsEn = () => document.documentElement.lang === 'en';
const mName = c => mIsEn() ? (c.nameEn || c.name) : c.name;
const mDesc = c => mIsEn() ? (c.descEn || c.description) : c.description;


// 目前可顯示的音樂 { key: {name, nameEn, description, descEn, url} }
let musicConfigs = {};
// 曾經載入過的音樂（療程進行中若被管理者停用，結算時仍查得到名稱）
const trackCache = {};

// 舊資料相容：preferred_music 曾存中文名稱
const LEGACY_MUSIC = { '純鋼琴': 'piano', '鋼琴': 'piano', '森林': 'forest', '海洋': 'ocean' };

window.sessionMusicLogs = window.sessionMusicLogs || [];

let playersMap = {};
let pendingPlayers = {};
let activeKey = null;
let activeTimer = null;
let pauseTimeoutTimer = null;

let sessionAccumulatedSeconds = 0;
let sessionPauseCount = 0;
let lastPlayStartTime = null;
let currentSessionStartTime = null;

// 支援 youtu.be、watch?v=、embed、shorts；無效則回傳空字串
function extractYouTubeId(url) {
    if (!url) return '';
    const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{11}$/.test(url) ? url : '';
}

// ---------- 讀取音樂清單與個人設定 ----------
let musicLoadedFor = null;
let musicSettings = null;

async function loadMusicConfigs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { musicConfigs = {}; musicLoadedFor = null; return; }
    if (musicLoadedFor === user.id) return;

    const { data, error } = await supabase.from('music_tracks')
        .select('*').eq('enabled', true).order('sort_order');
    if (error) throw error;

    musicConfigs = Object.fromEntries((data || []).map(r => [r.key, {
        name: r.name, nameEn: r.name_en,
        description: r.description, descEn: r.description_en,
        url: r.url
    }]));
    Object.assign(trackCache, musicConfigs);
    musicLoadedFor = user.id;
}

function resolveMusicKey(pref) {
    if (!pref) return null;
    if (musicConfigs[pref]) return pref;
    if (LEGACY_MUSIC[pref] && musicConfigs[LEGACY_MUSIC[pref]]) return LEGACY_MUSIC[pref];
    return Object.keys(musicConfigs).find(k =>
        musicConfigs[k].name === pref || musicConfigs[k].nameEn === pref) || null;
}

// 回傳 null = 尚未登入；{ allowed: null } = 全部；{ allowed: [...] } = 只顯示這些
async function getMusicSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    if (musicSettings?.uid === user.id) return musicSettings;

    let res = await supabase.from('profiles')
        .select('music_mode, preferred_music, allowed_music').eq('id', user.id).maybeSingle();
    if (res.error) {   // allowed_music 欄位還沒建立時退回舊欄位
        res = await supabase.from('profiles')
            .select('music_mode, preferred_music').eq('id', user.id).maybeSingle();
    }
    if (res.error) throw res.error;
    const d = res.data;

    let allowed = null;
    if (d?.music_mode === 'locked') {
        if (Array.isArray(d.allowed_music)) {
            allowed = d.allowed_music;
        } else {
            const k = resolveMusicKey(d.preferred_music);
            if (k) allowed = [k];
            else console.warn('⚠️ 鎖定的音樂無法對應，暫時顯示全部：', d.preferred_music);
        }
    }
    musicSettings = { uid: user.id, allowed };
    return musicSettings;
}

// 沒有任何可顯示的音樂時，隱藏「音樂」分頁（受試者完全看不到音樂區）
function applyMusicVisibility(hide) {
    window.musicDisabled = hide;
    document.querySelectorAll('.top-tab[data-main="music"]').forEach(el => el.style.display = hide ? 'none' : '');
    const nav = document.querySelector('.top-navbar');
    if (nav) nav.style.display = hide ? 'none' : '';
    if (hide && document.getElementById('main-music')?.style.display === 'block') {
        window.switchMainTab?.('symptoms', true);
    }
}

// ---------- 產生音樂卡片 ----------
let renderSeq = 0;
async function renderMusicCards() {
    const container = document.getElementById('music-cards-container');
    if (!container) return;

    const seq = ++renderSeq;
    let s;
    try {
        await loadMusicConfigs();
        s = await getMusicSettings();
    } catch (err) {
        if (seq !== renderSeq) return;
        console.warn('⚠️ 讀取音樂設定失敗：', err);
        container.innerHTML = `<p style="font-size:13px;color:#6c757d;">${tr('m_loaderr', '音樂清單暫時無法載入，請稍後再試。')}</p>`;
        return;
    }
    if (seq !== renderSeq) return;            // 有更新的呼叫，放棄這次，避免卡片重複

    if (!s) { container.innerHTML = ''; return; }     // 尚未登入

    const keys = s.allowed === null
        ? Object.keys(musicConfigs)
        : s.allowed.filter(k => musicConfigs[k]);     // 被停用或不存在的自動略過

    const hide = keys.length === 0;
    applyMusicVisibility(hide);
    playersMap = {};
    pendingPlayers = {};
    if (hide) { container.innerHTML = ''; return; }

    const notice = s.allowed !== null
        ? `<div style="font-size:11px;color:#d97706;background:#fef3c7;padding:4px 8px;border-radius:4px;margin-bottom:8px;">🔒 ${tr('m_locked', '研究團隊已為您挑選音樂')}</div>`
        : '';

    container.innerHTML = keys.map(key => {
        const config = musicConfigs[key];
        return `
        <div class="form-card" style="flex:1;min-width:250px;background:#f8f9fa;padding:15px;border-radius:8px;border:1px solid #e9ecef;margin-bottom:15px;" onmouseenter="prefetchPlayer('${key}')" ontouchstart="prefetchPlayer('${key}')">
            <h3 style="font-size:15px;color:#2c3e50;margin-bottom:5px;">${mName(config)}</h3>
            <p style="font-size:12px;color:#6c757d;margin-bottom:8px;">${mDesc(config) || ''}</p>
            ${notice}
            <div id="yt-player-${key}" style="display:none;"></div>
            <button id="btn-${key}" onclick="toggleYouTubeMusic('${key}')"
                style="width:100%;padding:8px;background:#A5D6A7;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">
                ▶️ ${tr('m_play', '播放')} ${mName(config)}
            </button>
            <div id="status-${key}" style="margin-top:8px;font-size:12px;font-weight:bold;color:#007bff;">${tr('m_idle', '狀態：尚未開始')}</div>
        </div>`;
    }).join('');
}

// 重新讀取（進入音樂分頁、登入、管理者異動後）；療程進行中不重繪，避免中斷計時
function refreshMusic() {
    if (sessionKey || activeKey) return;
    musicLoadedFor = null;
    musicSettings = null;
    renderMusicCards();
}
window.refreshMusic = refreshMusic;

// ---------- YouTube IFrame API ----------
function waitForYT(ms = 8000) {
    return new Promise((resolve, reject) => {
        const t0 = Date.now();
        (function check() {
            if (window.YT && window.YT.Player) return resolve();
            if (Date.now() - t0 > ms) return reject(new Error('YouTube API 載入逾時'));
            setTimeout(check, 200);
        })();
    });
}
window.onYouTubeIframeAPIReady = () => console.log('✅ YouTube IFrame API 已就緒');

function ensurePlayer(key) {
    if (playersMap[key]) return Promise.resolve(playersMap[key]);
    if (pendingPlayers[key]) return pendingPlayers[key];

    const promise = waitForYT().then(() => new Promise((resolve, reject) => {
        const config = musicConfigs[key];
        if (!config) return reject(new Error(`找不到音樂設定：${key}`));

        const containerId = `yt-player-${key}`;
        const videoId = extractYouTubeId(config.url);
        if (!videoId || !document.getElementById(containerId)) {
            return reject(new Error(`${mName(config)} 缺少有效的影片 ID 或容器`));
        }

        const player = new YT.Player(containerId, {
            height: '1', width: '1', videoId,
            playerVars: { autoplay: 0, controls: 0 },
            events: {
                onReady: () => { playersMap[key] = player; resolve(player); },
                onError: e => reject(new Error(`${mName(config)} 播放器載入失敗（code: ${e.data}）`)),
                onStateChange: ev => handlePlayerStateChange(key, ev)
            }
        });
    }));

    pendingPlayers[key] = promise;
    const clear = () => { delete pendingPlayers[key]; };
    promise.then(clear, clear);
    return promise;
}

function prefetchPlayer(key) {
    if (!musicConfigs[key] || playersMap[key] || pendingPlayers[key]) return;
    ensurePlayer(key).catch(err => console.warn(`⚠️ 預先載入 ${key} 失敗：`, err.message));
}

// ---------- 播放 / 暫停（累計計時 + 自動結算） ----------
async function toggleYouTubeMusic(key) {
    const config = musicConfigs[key];
    if (!config) return;
    const btn = document.getElementById(`btn-${key}`);
    const statusEl = document.getElementById(`status-${key}`);

    // A：暫停
    if (activeKey === key) {
        const p = playersMap[key];
        if (p?.pauseVideo) p.pauseVideo();
        if (lastPlayStartTime) { sessionAccumulatedSeconds += Math.floor((Date.now() - lastPlayStartTime) / 1000); lastPlayStartTime = null; }
        sessionPauseCount++; pausedAt = Date.now();
        clearInterval(activeTimer); activeKey = null;
        if (btn) { btn.innerText = `▶️ ${tr('m_resume', '繼續播放')} ${mName(config)}`; btn.style.background = '#A5D6A7'; }
        if (statusEl) statusEl.innerText = tr('m_paused', '狀態：已暫停') + ` (${sessionAccumulatedSeconds}s, ${sessionPauseCount}×)`;
        clearTimeout(pauseTimeoutTimer);
        pauseTimeoutTimer = setTimeout(() => finalizeAndPushLog(key, 'user_paused_timeout'), PAUSE_LIMIT_MS);
        return;
    }

    // B：播放 / 繼續
    clearTimeout(pauseTimeoutTimer);
    if (sessionKey && (sessionKey !== key || (pausedAt && Date.now() - pausedAt > PAUSE_LIMIT_MS))) {
        stopSession(sessionKey, sessionKey !== key ? 'switch_music' : 'user_paused_timeout');
    }

    let player = playersMap[key];
    if (!player) {
        if (btn) { btn.disabled = true; btn.innerText = `⏳ ${tr('m_loadingbtn', '載入中...')}`; btn.style.background = '#ccc'; }
        if (statusEl) statusEl.innerText = tr('m_loading', '狀態：載入播放器中...');
        try { player = await ensurePlayer(key); }
        catch (err) {
            console.error(err);
            if (statusEl) statusEl.innerText = tr('m_loadfail', '狀態：載入失敗，請稍後重試');
            if (btn) { btn.disabled = false; btn.innerText = `▶️ ${tr('m_play', '播放')} ${mName(config)}`; btn.style.background = '#A5D6A7'; }
            return;
        }
        if (btn) btn.disabled = false;
    }

    if (!sessionKey) {                                   // 新療程：在「開始播放」那一刻記錄
        sessionKey = key;
        currentSessionStartTime = new Date().toISOString();
        sessionAccumulatedSeconds = 0; sessionPauseCount = 0;
        sessionIdForMusic = window.currentSessionId?.() ?? null;
        sessionPainBefore = window.painTouched ? Number(document.getElementById('input-pain')?.value) : null;
    }
    pausedAt = null;

    player.playVideo();
    activeKey = key; lastPlayStartTime = Date.now();
    if (btn) { btn.innerText = `⏸️ ${tr('m_pause', '暫停')} ${mName(config)}`; btn.style.background = '#A9C0D6'; }

    clearInterval(activeTimer);
    activeTimer = setInterval(() => {
        const live = sessionAccumulatedSeconds + (lastPlayStartTime ? Math.floor((Date.now() - lastPlayStartTime) / 1000) : 0);
        if (!statusEl) return;
        const phase = live < 300 ? tr('m_ph1', '狀態：【進入期】') : live < 900 ? tr('m_ph2', '狀態：【核心放鬆期】') : tr('m_ph3', '狀態：【回歸期】');
        statusEl.innerText = `${phase} ${live}s`;
    }, 1000);
}

function finalizeAndPushLog(key, endType = 'completed') {
    const config = musicConfigs[key] || trackCache[key] || { name: key };
    const player = playersMap[key];
    if (lastPlayStartTime) { sessionAccumulatedSeconds += Math.floor((Date.now() - lastPlayStartTime) / 1000); lastPlayStartTime = null; }

    const reset = () => {
        sessionAccumulatedSeconds = 0; sessionPauseCount = 0; currentSessionStartTime = null;
        sessionKey = null; pausedAt = null; sessionPainBefore = null; sessionIdForMusic = null;
    };
    if (sessionAccumulatedSeconds <= 0) { reset(); return; }

    const dur = player?.getDuration ? player.getDuration() : 0;
    const pct = dur > 0 ? Math.min(100, parseFloat(((sessionAccumulatedSeconds / dur) * 100).toFixed(2))) : 0;

    // 只有「同一個 session 內已儲存的日記」才帶 diary_id
    const diaryId = (window.currentDiaryId && window.currentDiarySession === sessionIdForMusic) ? window.currentDiaryId : null;

    const logItem = {
        protocol: `U-Sequence: ${mName(config)}`,
        start_time: currentSessionStartTime || new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_seconds: sessionAccumulatedSeconds,
        progress_percentage: pct,
        pause_count: sessionPauseCount,
        end_type: endType,
        completed: endType === 'completed' || pct >= 80,
        pain_before: sessionPainBefore,
        session_id: sessionIdForMusic,
        diary_id: diaryId,
        linked: !!diaryId
    };
    const askAfter = endType !== 'page_closed' && (sessionAccumulatedSeconds >= 300 || endType === 'completed');
    window.sessionMusicLogs.push(logItem);
    window.lastMusicLog = logItem;
    window.lastMusicSave = window.saveMusicSession?.(logItem);
    if (askAfter) askPainAfter();
    reset();

    const statusEl = document.getElementById(`status-${key}`);
    const btn = document.getElementById(`btn-${key}`);
    if (statusEl) statusEl.innerText = `${tr('m_saved', '狀態：已結算存檔')} (${endType})`;
    if (btn) { btn.innerText = `▶️ ${tr('m_play', '播放')} ${mName(config)}`; btn.style.background = '#A5D6A7'; }
}

function stopSession(key, endType = 'user_paused') {
    if (activeKey === key) {
        clearInterval(activeTimer);
        clearTimeout(pauseTimeoutTimer);
        const p = playersMap[key];
        if (p?.pauseVideo) p.pauseVideo();
        activeKey = null;
    }
    finalizeAndPushLog(key, endType);
}

// 聽完（ENDED）自動結算
function handlePlayerStateChange(key, event) {
    if (window.YT && event.data === YT.PlayerState.ENDED) {
        clearInterval(activeTimer);
        clearTimeout(pauseTimeoutTimer);
        activeKey = null;
        finalizeAndPushLog(key, 'completed');
    }
}

// ---------- 事件 ----------
// 關閉分頁或視窗時，把進行中的療程結算
window.addEventListener('pagehide', () => { if (sessionKey) finalizeAndPushLog(sessionKey, 'page_closed'); });

// 切回頁面且正停在音樂分頁時，重新讀取最新清單
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' &&
        document.getElementById('main-music')?.style.display === 'block') refreshMusic();
});

window.addEventListener('DOMContentLoaded', () => {
    renderMusicCards();

    // 登入／登出時自動重新載入，不必在 main.js 另外呼叫
    if (window.supabase?.auth?.onAuthStateChange) {
        supabase.auth.onAuthStateChange(event => {
            if (event === 'SIGNED_IN') {
                setTimeout(refreshMusic, 0);          // 跳出回呼，避免死結
            } else if (event === 'SIGNED_OUT') {
                musicLoadedFor = null; musicSettings = null; musicConfigs = {};
                setTimeout(() => { applyMusicVisibility(false); renderMusicCards(); }, 0);
            }
        });
    }
});

// ---------- 掛載至全域 ----------
window.toggleYouTubeMusic = toggleYouTubeMusic;
window.prefetchPlayer = prefetchPlayer;
window.finalizeAndPushLog = finalizeAndPushLog;
window.renderMusicCards = renderMusicCards;
window.isMusicActive = () => !!activeKey;

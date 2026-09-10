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

class TherapeuticAudioGenerator {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.timer = null;
        // 採用舒緩的五聲音階頻率 (Hz)，營造平靜、冥想的氛圍
        this.frequencies = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63]; // C大調舒緩頻率
    }

    // 初始化音訊環境 (必須由使用者的點擊事件觸發，例如按「開始音樂」按鈕)
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 播放單個柔和、帶有長尾音的療癒音符
    playTone() {
        if (!this.isPlaying || !this.ctx) return;

        try {
            // 隨機挑選一個頻率
            const freq = this.frequencies[Math.floor(Math.random() * this.frequencies.length)];
            
            // 建立振盪器 (使用 sine 波，聲音最柔和圓潤)
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            // 設定極慢的淡入淡出 (Envelope)，模擬琴音與大量留白
            const now = this.ctx.currentTime;
            const attackTime = 1.5;   // 緩慢淡入 (1.5秒)
            const decayTime = 4.0;    // 極長尾音 (4秒擴散消失)

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + attackTime); // 音量控制得很柔和
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayTime);

            // 連接音訊路徑：振盪器 -> 音量控制器 -> 喇叭
            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            // 開始與結束播放
            osc.start(now);
            osc.stop(now + attackTime + decayTime);

        } catch (err) {
            console.error("Audio generation error:", err);
        }
    }

    // 開始播放療癒音樂循環 (模擬 60-70 BPM 的緩慢節奏與大量留白)
    start() {
        this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;

        // 立即彈奏第一聲
        this.playTone();

        // 每隔 3 到 5 秒隨機彈奏下一個音符 (創造緩慢、放空、充滿留白的氛圍)
        const scheduleNextNote = () => {
            if (!this.isPlaying) return;
            const randomInterval = Math.random() * 2000 + 3500; // 3.5秒 ~ 5.5秒 間隔
            this.timer = setTimeout(() => {
                this.playTone();
                scheduleNextNote();
            }, randomInterval);
        };

        scheduleNextNote();
        console.log("🧘 即時療癒音樂已啟動");
    }

    // 停止播放
    stop() {
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        console.log("⏹️ 療癒音樂已停止");
    }
}

// 建立全域實例
const therapyAudio = new TherapeuticAudioGenerator();
var isMusicRunning = false;

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

// 1. 初始化 YouTube API (當 API 載入完成時會自動觸發)
function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('youtube-player', {
        height: '200',
        width: '300',
        videoId: 'VhLU3qG1phc', // 🌟 已自動帶入你的 20 分鐘鋼琴音樂 ID
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

// 2. 點擊開始療程
function startTherapySession() {
    if (!ytPlayer) {
        alert("播放器載入中，請稍候...");
        return;
    }

    if (!isSessionRunning) {
        isSessionRunning = true;
        timeLeft = 1200; // 重設為 20 分鐘
        
        // 播放 YouTube 音樂
        ytPlayer.playVideo();

        // 🌟 自動記錄研究變數（對應你的 Supabase 格式）
        window.lastMusicStartTime = new Date().toISOString();
        window.lastMusicProtocol = "YouTube 20-min Relaxing Piano (VhLU3qG1phc)";

        // 更新按鈕與狀態
        const btn = document.getElementById('start-btn');
        btn.innerText = "⏹️ 結束/中斷療程";
        btn.style.background = "#e74c3c";

        // 啟動 20 分鐘倒數計時器
        countdownTimer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();

            if (timeLeft <= 0) {
                completeTherapySession();
            }
        }, 1000);
    } else {
        // 使用者手動中斷療程
        completeTherapySession();
    }
}

// 3. 更新畫面的倒數時間格式 (MM:SS)
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer-display').innerText = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 4. 療程結束或中斷時的收尾與數據記錄
function completeTherapySession() {
    if (countdownTimer) clearInterval(countdownTimer);
    if (ytPlayer) ytPlayer.stopVideo();

    isSessionRunning = false;
    
    // 🌟 記錄結束時間
    window.lastMusicEndTime = new Date().toISOString();

    // 重置按鈕
    const btn = document.getElementById('start-btn');
    btn.innerText = "▶️ 開始 20 分鐘療程";
    btn.style.background = "#4CAF50";
    
    document.getElementById('timer-display').innerText = "20:00";
    console.log("✅ 20分鐘音樂治療療程已完成，時間已紀錄。");
    
    // 💡 可以在這裡直接串接你的問卷資料儲存函式
    // saveAllResearchData(); 
}

// 5. 監聽 YouTube 狀態
function onPlayerStateChange(event) {
    // 當音樂自然播畢時，自動觸發完成收尾
    if (event.data == YT.PlayerState.ENDED && isSessionRunning) {
        completeTherapySession();
    }
}

// 動態載入 YouTube API Script
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
    samplePlayer = new YT.Player('sample-yt-player', {
        height: '180',
        width: '320',
        videoId: 'VhLU3qG1phc', // 你的 20 分鐘鋼琴曲 ID
        events: {
            'onStateChange': onSampleStateChange
        }
    });
}
function toggleYouTubeSample() {
    const container = document.getElementById('youtube-sample-container');
    if (!container) {
        console.log('YouTube 容器未找到');
        return;
    }
    
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
}

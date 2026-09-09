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
let isMusicRunning = false;

function toggleTherapyMusic(btn) {
    if (!isMusicRunning) {
        therapyAudio.start(); // 啟動瀏覽器即時生成音樂
        btn.innerText = "⏹️ 停止療癒音樂";
        btn.style.background = "#f44336";
        isMusicRunning = true;

        // 🌟 這裡可以完美結合你之前寫的全域變數，自動記錄開始時間！
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

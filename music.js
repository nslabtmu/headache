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

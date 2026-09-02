// districts.js - 全台灣 3 碼郵遞區號與行政區對應資料
const taiwanDistricts = {
    "基隆市": ["仁愛區", "信義區", "中正區", "中山區", "安樂區", "暖暖區", "七堵區"],
    "臺北市": ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"],
    "新北市": ["板橋區", "三重區", "中和區", "永和區", "新莊區", "新店區", "樹林區", "鶯歌區", "三峽區", "淡水區", "汐止區", "瑞芳區", "土城區", "蘆洲區", "五股區", "泰山區", "林口區", "深坑區", "石碇區", "坪林區", "三芝區", "石門區", "八里區", "平溪區", "雙溪區", "貢寮區", "金山區", "萬里區", "烏來區"],
    "桃園市": ["桃園區", "中壢區", "大溪區", "楊梅區", "蘆竹區", "大園區", "龜山區", "八德區", "龍潭區", "平鎮區", "新屋區", "觀音區", "復興區"],
    "新竹市": ["東區", "北區", "香山區"],
    "新竹縣": ["竹北市", "竹東鎮", "新埔鎮", "關西鎮", "湖口鄉", "新豐鄉", "峨眉鄉", "寶山鄉", "北埔鄉", "芎林鄉", "橫山鄉", "五峰鄉", "尖石鄉"],
    "苗栗縣": ["苗栗市", "頭份市", "竹南鎮", "後龍鎮", "通霄鎮", "苑裡鎮", "卓蘭鎮", "造橋鄉", "西湖鄉", "頭屋鄉", "公館鄉", "銅鑼鄉", "三義鄉", "大湖鄉", "獅潭鄉", "三灣鄉", "南庄鄉", "泰安鄉"],
    "臺中市": ["中區", "東區", "南區", "西區", "北區", "西屯區", "南屯區", "北屯區", "豐原區", "大里區", "太平區", "清水區", "沙鹿區", "大甲區", "東勢區", "梧棲區", "烏日區", "神岡區", "大肚區", "大雅區", "后里區", "霧峰區", "潭子區", "龍井區", "外埔區", "和平區", "新社區", "大安區"],
    "彰化縣": ["彰化市", "員林市", "和美鎮", "鹿港鎮", "溪湖鎮", "二林鎮", "田中鎮", "北斗鎮", "花壇鄉", "芬園鄉", "大村鄉", "永靖鄉", "社頭鄉", "田尾鄉", "埤頭鄉", "溪州鄉", "竹塘鄉", "芳苑鄉", "大城鄉", "埔鹽鄉", "埔心鄉"],
    "南投縣": ["南投市", "埔里鎮", "草屯鎮", "竹山鎮", "集集鎮", "名間鄉", "鹿谷鄉", "中寮鄉", "魚池鄉", "國姓鄉", "水里鄉", "信義鄉", "仁愛鄉"],
    "雲林縣": ["斗六市", "斗南鎮", "虎尾鎮", "西螺鎮", "土庫鎮", "北港鎮", "古坑鄉", "大埤鄉", "莿桐鄉", "林內鄉", "二崙鄉", "崙背鄉", "臺西鄉", "褒忠鄉", "東勢鄉", "元長鄉", "四湖鄉", "口湖鄉", "水林鄉", "麥寮鄉"],
    "嘉義市": ["東區", "西區"],
    "嘉義縣": ["太保市", "朴子市", "布袋鎮", "大林鎮", "民雄鄉", "溪口鄉", "新港鄉", "六腳鄉", "東石鄉", "義竹鄉", "鹿草鄉", "水上鄉", "中埔鄉", "竹崎鄉", "梅山鄉", "番路鄉", "大埔鄉", "阿里山鄉"],
    "臺南市": ["中西區", "東區", "南區", "北區", "安平區", "安南區", "永康區", "歸仁區", "新化區", "左鎮區", "玉井區", "楠西區", "南化區", "仁德區", "關廟區", "龍崎區", "官田區", "麻豆區", "佳里區", "西港區", "七股區", "將軍區", "學甲區", "北門區", "新營區", "後壁區", "白河區", "東山區", "六甲區", "下營區", "柳營區", "鹽水區", "善化區", "大內區", "山上區", "安定區"],
    "高雄市": ["楠梓區", "左營區", "鼓山區", "三民區", "鹽埕區", "前金區", "新興區", "旗津區", "前鎮區", "小港區", "鳳山區", "林園區", "大寮區", "大樹區", "大社區", "仁武區", "鳥松區", "岡山區", "橋頭區", "燕巢區", "田寮區", "阿蓮區", "路竹區", "湖內區", "茄萣區", "永安區", "彌陀區", "梓官區", "旗山區", "美濃區", "六龜區", "甲仙區", "杉林區", "內門區", "茂林區", "桃源區", "那瑪夏區"],
    "屏東縣": ["屏東市", "潮州鎮", "東港鎮", "恆春鎮", "萬丹鄉", "長治鄉", "麟洛鄉", "九如鄉", "里港鄉", "鹽埔鄉", "高樹鄉", "萬巒鄉", "內埔鄉", "竹田鄉", "新埤鄉", "枋寮鄉", "新園鄉", "崁頂鄉", "林邊鄉", "南州鄉", "琉球鄉", "車城鄉", "滿州鄉", "枋山鄉", "三地門鄉", "霧臺鄉", "瑪家鄉", "泰武鄉", "來義鄉", "春日鄉", "獅子鄉", "牡丹鄉"],
    "宜蘭縣": ["宜蘭市", "羅東鎮", "蘇澳鎮", "頭城鎮", "礁溪鄉", "壯圍鄉", "員山鄉", "冬山鄉", "五結鄉", "三星鄉", "大同鄉", "南澳鄉"],
    "花蓮縣": ["花蓮市", "鳳林鎮", "玉里鎮", "新城鄉", "吉安鄉", "壽豐鄉", "光復鄉", "豐濱鄉", "瑞穗鄉", "富里鄉", "秀林鄉", "萬榮鄉", "卓溪鄉"],
    "臺東縣": ["臺東市", "成功鎮", "關山鎮", "長濱鄉", "池上鄉", "東河鄉", "鹿野鄉", "延平鄉", "卑南鄉", "太麻里鄉", "大武鄉", "達仁鄉", "金峰鄉", "蘭嶼鄉", "綠島鄉", "海端鄉"],
    "澎湖縣": ["馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉"],
    "金門縣": ["金城鎮", "金湖鎮", "金沙鎮", "金寧鄉", "烈嶼鄉", "烏坵鄉"],
    "連江縣": ["南竿鄉", "北竿鄉", "莒光鄉", "東引鄉"]
  };
// ==================== 依縣市/鄉鎮查詢經緯度並更新天氣 ====================
// 使用 Open-Meteo 地理編碼 API（免金鑰），依「縣市＋鄉鎮」查詢座標，
// 查到後直接呼叫 main.js 已有的 fetchWeather() 更新天氣與空污資料
async function getLatLonForTaiwanDistrict(city, district) {
    const statusEl = document.getElementById('weather-status');
    try {
        if (statusEl) statusEl.innerText = `⏳ 正在查詢 ${city}${district} 座標...`;

        //const query = encodeURIComponent(`${district} ${city}`);
        // 1. 去掉結尾的「區/鄉/鎮/市」，並把「臺」轉為「台」以增加搜尋命中率
        const cleanDistrict = district.replace(/(區|鄉|鎮|市)$/, '');
        const cleanCity = city.replace('臺', '台');

        // 2. 組合成新的搜尋字串
        const query = encodeURIComponent(`${cleanCity} ${cleanDistrict}`);
        
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=zh&country=TW`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const { latitude, longitude } = data.results[0];
            if (typeof fetchWeather === 'function') {
                fetchWeather(latitude, longitude, `${city}${district}`);
            } else {
                console.warn("fetchWeather 尚未載入，無法更新天氣資料。");
            }
        } else {
            // 部分偏遠鄉鎮可能查不到，改用「僅縣市」再查一次作為備援
            const fallbackQuery = encodeURIComponent(city);
            const fallbackUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${fallbackQuery}&count=1&language=zh&country=TW`;
            const fallbackRes = await fetch(fallbackUrl);
            const fallbackData = await fallbackRes.json();

            if (fallbackData.results && fallbackData.results.length > 0) {
                const { latitude, longitude } = fallbackData.results[0];
                if (typeof fetchWeather === 'function') {
                    fetchWeather(latitude, longitude, `${city}${district}`);
                }
            } else {
                if (statusEl) statusEl.innerText = `⚠️ 查無 ${city}${district} 的座標，請改用 GPS 定位`;
            }
        }
    } catch (err) {
        console.error("查詢台灣地區座標失敗：", err);
        if (statusEl) statusEl.innerText = "⚠️ 查詢座標時發生錯誤，請改用 GPS 定位";
    }
}
// ==================== 初始化下拉選單邏輯 ====================
document.addEventListener('DOMContentLoaded', () => {
    const citySelect = document.getElementById('select-city');
    const districtSelect = document.getElementById('select-district');

    if (!citySelect || !districtSelect) return;

    // 1. 動態填充「縣市」選單
    Object.keys(taiwanDistricts).forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });

    // 2. 監聽「縣市」改變事件，動態更新「鄉鎮」選單
    citySelect.addEventListener('change', (e) => {
        const selectedCity = e.target.value;

        // 清空鄉鎮選單
        districtSelect.innerHTML = '<option value="">-- 請選擇鄉鎮市區 --</option>';

        if (selectedCity && taiwanDistricts[selectedCity]) {
            // 填入對應的鄉鎮選單
            taiwanDistricts[selectedCity].forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
            districtSelect.disabled = false;
        } else {
            districtSelect.disabled = true;
        }
    });

    // 3. 監聽「鄉鎮」改變事件，觸發 API 查詢
    districtSelect.addEventListener('change', (e) => {
        const city = citySelect.value;
        const district = e.target.value;

        if (city && district) {
            getLatLonForTaiwanDistrict(city, district);
        }
    });
});

console.log("👉 config.js 開始執行");
// config.js 共用設定檔
const SUPABASE_URL = 'https://ligckapfksiyvcvsppde.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oDFhgWFOd80vTh8FFanFrw_6Z243ThZ';

// 建立全域的 supabase 實例
try {
    // 檢查全域的 supabase 物件是否存在
    if (typeof supabase === 'undefined') {
        console.error("❌ 錯誤：CDN 的 supabase 物件不存在，請檢查 HTML 載入順序！");
    } else {
        // 嘗試建立客戶端（這裡要對應上面宣告的 SUPABASE_ANON_KEY）
        window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ 成功：window.supabase 已建立！", window.supabase);
    }
} catch (error) {
    console.error("❌ 建立 Supabase 時發生例外錯誤：", error);
}

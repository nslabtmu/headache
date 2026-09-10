// config.js 共用設定檔
const SUPABASE_URL = 'https://ligckapfksiyvcvsppde.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oDFhgWFOd80vTh8FFanFrw_6Z243ThZ';
// 建立全域的 supabase 實例
// ============ 2. 防重複宣告保護 ============
// 如果 window 裡面還沒有建立過客戶端，才進行初始化
if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 讓其他檔案可以直接使用這個變數
const supabase = window.supabaseClient;

// config.js 共用設定檔
const SUPABASE_URL = 'https://ligckapfksiyvcvsppde.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oDFhgWFOd80vTh8FFanFrw_6Z243ThZ';
// 建立全域的 supabase 實例
// ============ 2. 防重複宣告保護 ============
// 如果 window 裡面還沒有建立過客戶端，才進行初始化
// 2. 直接掛載到 window.supabase，如果已經存在就不會重複建立
if (!window.supabase) {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

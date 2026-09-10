// config.js 共用設定檔
const SUPABASE_URL = 'https://ligckapfksiyvcvsppde.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oDFhgWFOd80vTh8FFanFrw_6Z243ThZ';
// 建立全域的 supabase 實例
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

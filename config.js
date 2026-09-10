// config.js 共用設定檔
// config.js 共用設定檔
const SUPABASE_URL = 'https://ligckapfksiyvcvsppde.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_oDFhgWFOd80vTh8FFanFrw_6Z243ThZ';

// 強制將 supabase 實體掛載到 window 全域物件上
if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 建立一個捷徑變數，方便其他檔案直接使用 supabase
const supabase = window.supabaseClient;

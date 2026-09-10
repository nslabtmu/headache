// config.js 共用設定檔
// config.js 共用設定檔
var SUPABASE_URL = 'https://ligckapfksiyvcvsppde.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_oDFhgWFOd80vTh8FFanFrw_6Z243ThZ';

if (typeof supabase === 'undefined' || !supabase) {
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

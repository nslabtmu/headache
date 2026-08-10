import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 1. 初始化 Supabase
const SUPABASE_URL = '你的_SUPABASE_URL';
const SUPABASE_KEY = '你的_SUPABASE_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 頁面切換助手
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
}

// 2. 登入邏輯
async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
}

// 3. 檢查身分與同意書狀態
async function checkAuthState() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        showPage('login-page');
        return;
    }

    // 檢查使用者是否已在 Supabase 的 profiles 資料表中同意條款
    const { data: profile } = await supabase
        .from('profiles')
        .select('agreed_at')
        .eq('id', session.user.id)
        .single();

    if (!profile || !profile.agreed_at) {
        showPage('consent-page');
    } else {
        showPage('main-page');
        loadTodayStatus(session.user.id);
    }
}

// 4. 同意條款
async function acceptConsent() {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').upsert({
        id: user.id,
        agreed_at: new Date().toISOString()
    });
    checkAuthState();
}

// 5. 資料寫入 (寫入 Supabase)
async function saveAttack() {
    const { data: { user } } = await supabase.auth.getUser();
    const data = {
        user_id: user.id,
        pain: document.getElementById('pain').value,
        location: document.getElementById('location').value,
        medicine: document.getElementById('medicine').value,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('user_data').insert([data]);
    
    if (error) {
        alert('儲存失敗: ' + error.message);
    } else {
        alert('儲存成功！');
        document.getElementById('attackForm').classList.add('d-none');
        loadTodayStatus(user.id);
    }
}

// 初始化執行
window.addEventListener('DOMContentLoaded', checkAuthState);

// 暴露函數給 HTML 按鈕使用
window.signInWithGoogle = signInWithGoogle;
window.acceptConsent = acceptConsent;
window.saveAttack = saveAttack;
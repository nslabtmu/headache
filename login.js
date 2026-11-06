// ==========================================
// login.js — 受試者頁 (index.html) 專用
// 內容：其他登入方式、帳號密碼登入、綁定 Google、帳號管理入口、LINE 綁定
// 整份包在 IIFE 內，內部變數不會和其他檔案撞名；只有 HTML onclick 要用的函式掛到 window。
// ==========================================
(function () {
'use strict';

// 必須與後台建立帳號時使用的網域一致
const ACCOUNT_DOMAIN = 'phone.local';
const T = (key, zh) => (typeof window.tr === 'function' ? window.tr(key, zh) : zh);

// ---------- 其他登入方式 ----------
function showAlternativeLogin() {
    const box = document.getElementById('alternative-login');
    if (!box) return;
    const opening = box.style.display === 'none' || box.style.display === '';
    box.style.display = opening ? 'block' : 'none';
    if (opening) switchLoginTab('email');
}

function switchLoginTab(tab) {
    const email = document.getElementById('email-tab');
    const account = document.getElementById('account-tab');
    if (email) email.style.display = tab === 'email' ? 'block' : 'none';
    if (account) account.style.display = tab === 'account' ? 'block' : 'none';
}

// ---------- 登入 ----------
async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return;

    console.warn('登入失敗', error.status, error.message);
    const msg = /invalid login/i.test(error.message) ? T('login_bad', '帳號或密碼錯誤')
              : /not confirmed/i.test(error.message) ? T('login_unconfirmed', '帳號尚未啟用，請聯絡研究人員')
              : /banned/i.test(error.message)        ? T('login_banned', '此帳號已停用，請聯絡研究人員')
              : error.message;
    alert(T('login_fail', '登入失敗：') + msg);
}

async function handleEmailLogin() {
    const email = document.getElementById('login-email')?.value.trim();
    const pw = document.getElementById('login-password')?.value;
    if (!email || !pw) return alert(T('need_acc_pw', '請輸入帳號與密碼'));
    await signIn(email, pw);
}

async function handleAccountLogin() {
    const acc = document.getElementById('login-account')?.value.trim().toLowerCase();
    const pw = document.getElementById('login-account-pw')?.value;
    if (!acc || !pw) return alert(T('need_acc_pw', '請輸入帳號與密碼'));
    await signIn(`${acc}@${ACCOUNT_DOMAIN}`, pw);
}

// ---------- 綁定 Google ----------
async function linkGoogle() {
    const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname }
    });
    if (error) alert(error.message);
}

// ---------- 帳號管理入口：管理者進後台，其餘人切到個人資料 ----------
async function isAdmin() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return false;
        const { data, error: e2 } = await supabase.from('profiles')
            .select('role').eq('id', user.id).maybeSingle();
        return !e2 && data?.role === 'admin';
    } catch (e) {
        return false;
    }
}

async function openAccountManagement() {
    if (await isAdmin()) {
        window.location.href = 'account.html';
    } else if (typeof window.switchMainTab === 'function') {
        window.switchMainTab('profile');
    }
}

// ---------- LINE 一鍵帶入 User ID ----------
async function initLineLiff() {
    try {
        await liff.init({ liffId: '2012383136-mtyd3jYu' });
        if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            const input = document.getElementById('user-line-userid');
            if (input) input.value = profile.userId;
            alert(T('liff_ok', '✅ 已成功透過 LINE 驗證取得 User ID！'));
        } else {
            liff.login();
        }
    } catch (err) {
        console.error('LIFF 初始化失敗:', err);
        alert(T('liff_fail', 'LINE 驗證失敗，請改用手動貼上 User ID。'));
    }
}

// ---------- 只掛出 HTML onclick 用得到的函式 ----------
Object.assign(window, {
    showAlternativeLogin, switchLoginTab,
    handleEmailLogin, handleAccountLogin,
    linkGoogle, openAccountManagement,
    initLineLiff, initLiffAndGetUserId: initLineLiff
});
})();

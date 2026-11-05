// ============ Supabase 初始化 ============
//account.js
let currentEditingUserId = null;
let currentAdminId = null;
let usersCache = {};

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// TBI 帳號格式整理：m/c + 數字 → 小寫；NA → 大寫；其他 → null（格式錯誤）
function normalizeTbi(v) {
    const s = String(v ?? '').trim();
    if (/^na$/i.test(s)) return 'NA';
    if (/^[mc][0-9]+$/i.test(s)) return s.toLowerCase();
    return null;
}

// ============ 頁面載入 ============
window.addEventListener('load', async () => {
    if (!document.getElementById('users-table')) return;     // 只在 account.html 執行
    if (!(await checkIfUserIsAdmin())) { alert('需要管理者權限'); location.href = 'index.html'; return; }
    await loadUsers(); await updateStats();
});

// 必須與建立帳號時用的網域一致
const ACCOUNT_DOMAIN = 'phone.local';   // 已建立的帳號先沿用；新專案建議換成自己的網域

async function handleAccountLogin() {
  const acc = document.getElementById('login-account').value.trim().toLowerCase();
  const pw  = document.getElementById('login-account-pw').value;
  if (!acc || !pw) return alert(tr('need_acc_pw', '請輸入帳號與密碼'));
  const { error } = await supabase.auth.signInWithPassword({
    email: `${acc}@${ACCOUNT_DOMAIN}`, password: pw
  });
  if (error) alert(tr('login_fail', '登入失敗：') + error.message);
}
window.handleAccountLogin = handleAccountLogin;

async function handleEmailLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw = document.getElementById('login-password').value;
  if (!email || !pw) return alert(tr('need_acc_pw', '請輸入帳號與密碼'));
  const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
  if (error) alert(tr('login_fail', '登入失敗：') + error.message);
}
window.handleEmailLogin = handleEmailLogin;

// 呼叫 Edge Function，並把錯誤訊息整理成文字
async function callAdmin(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (e) {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

async function handleAddUser(event) {
    event.preventDefault();
    const name = document.getElementById('add-name').value.trim();
    const account = document.getElementById('add-account').value.trim().toLowerCase();
    const password = document.getElementById('add-password').value;
    const tbi_account = normalizeTbi(document.getElementById('add-tbi').value);
    const btnEl = document.getElementById('add-btn-text');

    if (!name || !account || !password)
        return showMessage('add-message', '❌ 請填入所有必填欄位', 'error');
    if (!/^[a-z0-9._-]+$/.test(account))
        return showMessage('add-message', '❌ 帳號只能用英文、數字、. _ -', 'error');
    if (password.length < 8)
        return showMessage('add-message', '❌ 密碼至少 8 碼', 'error');
    if (!tbi_account)
        return showMessage('add-message',
            '❌ TBI 帳號格式：m 或 c 開頭加數字（如 m1111），無則填 NA', 'error');

    try {
        btnEl.textContent = '⏳ 新增中...';
        btnEl.parentElement.disabled = true;
        await callAdmin({ action: 'create', account, password, name, tbi_account });
        showMessage('add-message', `✅ 帳號建立成功！帳號：${account}`, 'success');
        document.querySelector('.section form')?.reset();
        await loadUsers();
        await updateStats();
    } catch (error) {
        console.error('❌ 新增失敗：', error);
        showMessage('add-message', '❌ 新增失敗：' + error.message, 'error');
    } finally {
        btnEl.textContent = '新增';
        btnEl.parentElement.disabled = false;
    }
}

async function handleEditUser(event) {
    event.preventDefault();
    
    // 安全地取得所有欄位元素
    const nameInput = document.getElementById('edit-name');
    const passwordInput = document.getElementById('edit-password');
    const modeSelect = document.getElementById('edit-music-mode');
    const musicSelect = document.getElementById('edit-preferred-music');
    const tbiInput = document.getElementById('edit-tbi');

    const name = nameInput ? nameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const music_mode = modeSelect ? modeSelect.value : 'free';
    const preferred_music = musicSelect ? musicSelect.value : '純鋼琴';
    const tbiRaw = tbiInput ? tbiInput.value.trim() : '';
    const tbi_account = tbiRaw === '' ? null : normalizeTbi(tbiRaw);

    if (!name) return alert('❌ 姓名不能為空');
    if (password && password.length < 8) return alert('❌ 新密碼至少 8 碼');
    if (tbiRaw !== '' && !tbi_account)
        return alert('❌ TBI 帳號格式不正確（m1111、c1111 或 NA）');

    try {
        await callAdmin({
            action: 'update', 
            id: currentEditingUserId,
            name, 
            music_mode, 
            preferred_music, 
            tbi_account,
            // 如果密碼欄位是空的，就傳 undefined（代表不修改密碼）
            password: password || undefined
        });
        alert('✅ 用戶資訊已更新！');
        closeEditModal();
        await loadUsers();
    } catch (error) {
        console.error('❌ 更新失敗：', error);
        alert('❌ 更新失敗：' + error.message);
    }
}
/*1105 async function handleEditUser(event) {
    event.preventDefault();
    const name = document.getElementById('edit-name').value.trim();
    const password = document.getElementById('edit-password').value;
    const music_mode = document.getElementById('edit-music-mode').value;
    const preferred_music = document.getElementById('edit-preferred-music').value;
    const tbiRaw = document.getElementById('edit-tbi').value.trim();
    const tbi_account = tbiRaw === '' ? null : normalizeTbi(tbiRaw);

    if (!name) return alert('❌ 姓名不能為空');
    if (password && password.length < 8) return alert('❌ 新密碼至少 8 碼');
    if (tbiRaw !== '' && !tbi_account)
        return alert('❌ TBI 帳號格式不正確（m1111、c1111 或 NA）');

    try {
        await callAdmin({
            action: 'update', id: currentEditingUserId,
            name, music_mode, preferred_music, tbi_account,
            password: password || undefined
        });
        alert('✅ 用戶資訊已更新！');
        closeEditModal();
        await loadUsers();
    } catch (error) {
        console.error('❌ 更新失敗：', error);
        alert('❌ 更新失敗：' + error.message);
    }
} handleEditUser*/

async function deleteUser(userId, name) {
  if (!confirm(`確定要刪除 "${name}" 的帳號嗎？此操作無法復原！`)) return;
  try {
    await callAdmin({ action: 'delete', id: userId });
    alert('✅ 帳號已刪除');
    await loadUsers();
    await updateStats();
  } catch (error) {
    console.error('❌ 刪除失敗：', error);
    alert('❌ 刪除失敗：' + error.message);
  }
}

async function openAccountManagement() {
    const isAdmin = await checkIfUserIsAdmin();
    if (!isAdmin) {
        switchMainTab('profile');
        return;
    }
    window.location.href = 'account.html';
}

function closeAccountManagement() {
    const modal = document.getElementById('account-management-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function checkIfUserIsAdmin() {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return false;
        
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (error) return false;
        return data?.role === 'admin';
    } catch (error) {
        return false;
    }
}

async function loadUsers() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        currentAdminId = user?.id ?? null;

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;

        const tbody = document.getElementById('users-table');
        if (!tbody) return;
        tbody.innerHTML = '';
        usersCache = {};

        if (!profiles || profiles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#95a5a6;">還沒有帳號</td></tr>';
            return;
        }

        profiles.forEach(p => {
            usersCache[p.id] = p;

            const isSelf = p.id === currentAdminId;
            const isAdmin = p.role === 'admin';
            const canDelete = !isSelf && !isAdmin;

            const createdAt = new Date(p.created_at).toLocaleDateString('zh-TW');
            const status = isAdmin ? '👑 管理者' : '✅ 活躍';
            const musicMode = p.music_mode === 'locked'
                ? `🔒 ${p.preferred_music || ''}`
                : '🎵 自由選擇';
            const account = p.account_type === 'google'
                ? '🔵 Google'
                : escapeHtml(p.phone_account || '-');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(p.display_name || '未設定')}</td>
                <td>${account}</td>
                <td>${escapeHtml(p.tbi_account || '-')}</td>
                <td>${status}</td>
                <td>${escapeHtml(musicMode)}</td>
                <td>${createdAt}</td>
                <td>
                    <button class="btn btn-edit btn-small"
                            data-action="edit" data-id="${escapeHtml(p.id)}">編輯</button>
                    ${canDelete
                        ? `<button class="btn btn-delete btn-small"
                                   data-action="delete" data-id="${escapeHtml(p.id)}">刪除</button>`
                        : ''}
                </td>`;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('❌ 載入用戶失敗：', error);
    }
}

/* document.addEventListener('click', e => {
    const btn = e.target.closest('#users-table button[data-action]');
    if (!btn) return;
    const p = usersCache[btn.dataset.id];
    if (!p) return;

    if (btn.dataset.action === 'edit') {
        openEditModal(p.id, p.display_name || '', p.email || '',
                      p.music_mode || 'free', p.preferred_music || '純鋼琴');
    } else if (btn.dataset.action === 'delete') {
        deleteUser(p.id, p.display_name || '');
    }
});*/
document.addEventListener('click', e => {
    const btn = e.target.closest('#users-table button[data-action]');
    if (!btn) return;
    const userId = btn.dataset.id;
    const p = usersCache[userId];
    if (!p) return;

    if (btn.dataset.action === 'edit') {
        openEditModal(userId); // 直接傳入 ID 即可自動帶入
    } else if (btn.dataset.action === 'delete') {
        deleteUser(p.id, p.display_name || '');
    }
});
function showAlternativeLogin() {
  const box = document.getElementById('alternative-login');
  const opening = box.style.display === 'none' || box.style.display === '';
  box.style.display = opening ? 'block' : 'none';
  if (opening) switchLoginTab('email');
}

function switchLoginTab(tabType) {
    document.getElementById('email-tab').style.display = tabType === 'email' ? 'block' : 'none';
    document.getElementById('account-tab').style.display = tabType === 'account' ? 'block' : 'none';
}
function openEditModal(userId) {
    currentEditingUserId = userId;
    const p = usersCache[userId]; // 從快取直接取得該用戶完整資料
    if (!p) return;

    // 1. 自動帶入現有資料，呈現修改狀態
    const nameInput = document.getElementById('edit-name');
    if (nameInput) nameInput.value = p.display_name || '';

    const tbiInput = document.getElementById('edit-tbi');
    if (tbiInput) tbiInput.value = p.tbi_account || '';

    const modeSelect = document.getElementById('edit-music-mode');
    if (modeSelect) modeSelect.value = p.music_mode || 'free';

    const musicSelect = document.getElementById('edit-preferred-music');
    if (musicSelect) musicSelect.value = p.preferred_music || '純鋼琴';

    // 2. 密碼欄位保持空白（符合「除了密碼外保留原樣」的需求）
    const passwordInput = document.getElementById('edit-password');
    if (passwordInput) passwordInput.value = '';

    // 3. 更新音樂選單的顯示狀態
    updateMusicOptionsVisibility();

    // 4. 顯示彈跳視窗
    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.add('show');
}
/*1105 function openEditModal(userId, name, email, music_mode, preferred_music) {
    currentEditingUserId = userId;
    const nameInput = document.getElementById('edit-name');
    if (nameInput) nameInput.value = name;

    const tbiInput = document.getElementById('edit-tbi');
    if (tbiInput) tbiInput.value = usersCache[userId]?.tbi_account || '';

    const passwordInput = document.getElementById('edit-password');
    if (passwordInput) passwordInput.value = '';

    const modeSelect = document.getElementById('edit-music-mode');
    if (modeSelect) modeSelect.value = music_mode || 'free';

    const musicSelect = document.getElementById('edit-preferred-music');
    if (musicSelect) musicSelect.value = preferred_music || '純鋼琴';

    updateMusicOptionsVisibility();

    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.add('show');
} 1105 openeditmode*/

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.remove('show');
}

/* 1105 function updateMusicOptionsVisibility() {
    const mode = document.getElementById('edit-music-mode').value;
    const musicOptions = document.getElementById('music-options-group');
    if (musicOptions) {
        musicOptions.style.display = mode === 'locked' ? 'block' : 'none';
    }
}*/
function updateMusicOptionsVisibility() {
    const modeSelect = document.getElementById('edit-music-mode');
    const musicOptions = document.getElementById('music-options-group');
    
    // 確保兩個元素都存在才進行操作，避免抓到 null 導致程式崩潰
    if (modeSelect && musicOptions) {
        musicOptions.style.display = modeSelect.value === 'locked' ? 'block' : 'none';
    }
}
async function linkGoogle() {
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname }
  });
  if (error) alert(error.message);
}

async function updateStats() {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;

        const total = profiles ? profiles.length : 0;
        const active = profiles ? profiles.filter(p => p.role === 'user').length : 0;

        const totalEl = document.getElementById('total-users');
        const activeEl = document.getElementById('active-users');
        
        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = active;
    } catch (error) {
        console.error('❌ 更新統計失敗：', error);
    }
}

function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `message ${type}`;
    el.style.display = 'block';
}

// ============ 受試者 LINE 設定與儲存 ====================
async function saveUserSettings() {
    const lineUserId = document.getElementById('user-line-userid')?.value.trim();
    const sendReminder = document.getElementById('user-opt-reminder')?.checked;
    
    // 支援 window.currentUser 或直接向 Supabase 抓取登入身份
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
        alert("❌ 請先登入系統！");
        return;
    }

    const { error } = await supabase
        .from('profiles')
        .update({ 
            line_user_id: lineUserId || null,
            send_reminder: sendReminder
        })
        .eq('id', userId);

    if (error) {
        alert("❌ 儲存失敗：" + error.message);
    } else {
        // 儲存成功時解除未存檔警告
        if (typeof markFormAsSaved === 'function') {
            markFormAsSaved();
        }
        alert("✅ LINE 提醒與音樂通知設定已成功更新！");
    }
}
// 初始化 LIFF 並自動取得 User ID 填入輸入框
async function initLineLiff() {
    try {
        await liff.init({ liffId: "2012383136-mtyd3jYu" });
        
        if (liff.isLoggedIn()) {
            // 已登入，直接取得使用者 Profile
            const profile = await liff.getProfile();
            const lineUserId = profile.userId; // 👈 抓到 LINE User ID
            
            // 自動填入輸入框
            const inputEl = document.getElementById('user-line-userid');
            if (inputEl) {
                inputEl.value = lineUserId;
            }
            alert("✅ 已成功透過 LINE 驗證取得 User ID！");
        } else {
            // 未登入則引導使用者登入 LINE
            liff.login();
        }
    } catch (err) {
        console.error("LIFF 初始化失敗:", err);
    }
}

// 您可以把這個函式綁定給一個按鈕：「一鍵綁定 LINE 帳號」
window.initLineLiff = initLineLiff;
window.saveUserSettings = saveUserSettings;

// ============ 防漏存機制 (BeforeUnload) ====================
/*let isFormDirty = false;

document.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        isFormDirty = true;
    }
});

document.addEventListener('change', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        isFormDirty = true;
    }
});

window.addEventListener('beforeunload', (e) => {
    if (isFormDirty) {
        e.preventDefault();
        e.returnValue = '';
    }
});

function markFormAsSaved() {
    isFormDirty = false;
}
window.markFormAsSaved = markFormAsSaved;
*/
async function ensureUserProfileExists() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 檢查 profiles 是否已存在
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

    // 如果不存在，自動幫他建立一筆預設 profile
    if (!profile) {
        await supabase.from('profiles').insert({
            id: user.id,
            display_name: user.email ? user.email.split('@')[0] : '受試者',
            role: 'user',
            music_mode: 'free',
            created_at: new Date().toISOString()
        });
        console.log("✅ 已自動為新用戶補建立 profile 紀錄");
    }
}
// ============ Modal 外部點擊關閉 ============
document.addEventListener('click', function(event) {
    const editModal = document.getElementById('edit-modal');
    if (event.target === editModal) {
        closeEditModal();
    }
});

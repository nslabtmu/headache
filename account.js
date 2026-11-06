// ============ Supabase 初始化 ============
//account.js
let currentEditingUserId = null;
let currentAdminId = null;
let usersCache = {};
// 1. 🌐 分頁切換函式
function switchTab(id, btnElement) {
    document.querySelectorAll('.tab-content').forEach(p => {
        p.classList.toggle('active', p.id === id);
    });
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b === btnElement);
    });
}
window.switchTab = switchTab;

// 2. 🧪 切換研究詳細欄位顯示
function toggleStudyFields() {
    const isChecked = document.getElementById('edit-is-study').checked;
    const group = document.getElementById('study-fields-group');
    if (group) {
        group.style.display = isChecked ? 'block' : 'none';
    }
}
window.toggleStudyFields = toggleStudyFields;

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
    await loadMusicTracks();     // 必須先於 loadUsers，因為使用者列表要用音樂名稱
    await renderMusicTable();
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
    const val = id => document.getElementById(id)?.value ?? '';
    const has = id => !!document.getElementById(id);
    const chk = id => !!document.getElementById(id)?.checked;

    const name = val('edit-name').trim();
    const password = val('edit-password');
    const tbiRaw = val('edit-tbi').trim();
    const tbi_account = tbiRaw === '' ? null : normalizeTbi(tbiRaw);

    if (!name) return alert('❌ 姓名不能為空');
    if (password && password.length < 8) return alert('❌ 新密碼至少 8 碼');
    if (tbiRaw !== '' && !tbi_account) return alert('❌ TBI 帳號格式不正確（m1111、c1111 或 NA）');

    const body = { action: 'update', id: currentEditingUserId, name, tbi_account,
                   password: password || undefined };
    // 🎵 音樂：編輯視窗真的有音樂欄位才送，避免把既有設定洗掉
    if (has('edit-music-mode') && document.querySelector('input[name="edit-music"]')) {
        const locked = val('edit-music-mode') === 'locked';
        const allowed = locked
            ? [...document.querySelectorAll('input[name="edit-music"]:checked')].map(c => c.value)
            : null;
        if (locked && allowed.length === 0 &&
            !confirm('未勾選任何音樂，此受試者將看不到音樂區，確定嗎？')) return;
        Object.assign(body, {
            music_mode: locked ? 'locked' : 'free',
            allowed_music: allowed,
            preferred_music: allowed?.[0] ?? null
        });
    }
    
    if (has('edit-is-study')) {
        const isStudy = chk('edit-is-study');
        if (isStudy && !val('edit-study-start')) return alert('❌ 請選擇研究開始日期');
        Object.assign(body, {
            is_study: isStudy,
            study_start: isStudy ? val('edit-study-start') : null,
            study_months: isStudy ? (Number(val('edit-study-duration')) || 3) : null
        });
    }
    if (has('edit-line-userid'))    body.line_user_id = val('edit-line-userid').trim() || null;
    if (has('edit-send-reminder'))  body.send_reminder = chk('edit-send-reminder');
    if (has('edit-status'))         body.disabled = chk('edit-status');

    try {
        await callAdmin(body);
        alert('✅ 用戶資訊已更新！');
        closeEditModal();
        await loadUsers();
    } catch (error) {
        console.error('❌ 更新失敗：', error);
        alert('❌ 更新失敗：' + error.message);
    }
}

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
        const allowed = getAllowedMusic(p);
        const musicMode = allowed === null ? '🎵 全部'
            : allowed.length === 0 ? '🚫 不顯示'
            : '🔒 ' + allowed.map(musicName).join('、');
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
    const p = usersCache[userId];
    if (!p) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
    const check = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };

    set('edit-name', p.display_name);
    set('edit-tbi', p.tbi_account);
    set('edit-password', '');

const allowed = getAllowedMusic(p);
set('edit-music-mode', allowed === null ? 'free' : 'locked');
    document.querySelectorAll('input[name="edit-music"]').forEach(c => {
        c.checked = Array.isArray(allowed) && allowed.includes(c.value);
    });
    updateMusicOptionsVisibility();

    check('edit-is-study', p.is_study);
    set('edit-study-start', p.study_start);
    set('edit-study-duration', p.study_months || 3);
    if (typeof toggleStudyFields === 'function') toggleStudyFields();
    set('edit-line-userid', p.line_user_id);
    check('edit-send-reminder', p.send_reminder !== false);
    check('edit-status', p.disabled);

    document.getElementById('edit-modal')?.classList.add('show');
}

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
// ===== 音樂清單（動態）=====
let musicTracks = [];
const musicName = k => musicTracks.find(t => t.key === k)?.name || k;

async function loadMusicTracks() {
    const { data, error } = await supabase.from('music_tracks')
        .select('key, name, enabled').order('sort_order');
    if (error) throw error;
    musicTracks = (data || []).filter(t => t.enabled);
    renderMusicCheckboxes();
}

function renderMusicCheckboxes() {
    const box = document.getElementById('music-options-list');
    if (!box) return;
    box.innerHTML = musicTracks.map(t => `
        <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;">
            <input type="checkbox" name="edit-music" value="${escapeHtml(t.key)}" style="width:18px;height:18px;">
            ${escapeHtml(t.name)}
        </label>`).join('');
}

// 回傳 null = 不限制；陣列 = 只顯示這些
function getAllowedMusic(p) {
    if (p.music_mode !== 'locked') return null;
    if (!musicTracks.length) return p.allowed_music || [];     // 清單沒載入時不要過濾
    const valid = new Set(musicTracks.map(t => t.key));
    return (p.allowed_music || []).filter(k => valid.has(k));
}
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
// 新增音樂
function ytId(url) {
    const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
}

async function handleAddMusic(e) {
    e.preventDefault();
    const v = id => document.getElementById(id).value.trim();
    const key = v('mt-key');
    if (!ytId(v('mt-url'))) return showMessage('music-message', '❌ 看不出是有效的 YouTube 網址', 'error');

    const { error } = await supabase.from('music_tracks').insert({
        key, name: v('mt-name'), name_en: v('mt-name-en') || null,
        description: v('mt-desc') || null, url: v('mt-url'),
        sort_order: musicTracks.length + 1
    });
    if (error) return showMessage('music-message',
        '❌ ' + (error.code === '23505' ? '代碼已存在' : error.message), 'error');

    let extra = '';
    if (document.getElementById('mt-add-locked').checked) {
        const { data: n, error: e2 } = await supabase.rpc('add_music_to_locked_users', { p_key: key });
        extra = e2 ? `（但加給受試者失敗：${e2.message}）` : `，已加給 ${n} 位受試者`;
    }
    showMessage('music-message', '✅ 已新增' + extra, 'success');
    e.target.reset();
    await loadMusicTracks();
    await renderMusicTable();
    await loadUsers();
}

async function renderMusicTable() {
    const { data } = await supabase.from('music_tracks').select('*').order('sort_order');
    document.getElementById('music-table').innerHTML = (data || []).map(t => `
        <tr>
            <td>${escapeHtml(t.key)}</td>
            <td><input id="mn-${t.key}" value="${escapeHtml(t.name)}"></td>
            <td><input id="mu-${t.key}" value="${escapeHtml(t.url)}"></td>
            <td><input type="checkbox" id="me-${t.key}" ${t.enabled ? 'checked' : ''}></td>
            <td><button type="button" class="btn btn-edit btn-small" onclick="saveMusic('${t.key}')">儲存</button></td>
        </tr>`).join('');
}
async function renderAuditLog() {
    const { data, error } = await supabase.from('audit_log')
        .select('*').order('at', { ascending: false }).limit(50);
    if (error) { console.error('❌ 讀取紀錄失敗：', error); return; }
    document.getElementById('audit-table').innerHTML = (data || []).map(r => {
        const detail = r.note
            || (r.action === 'insert' ? `新增 ${r.new_data?.name ?? ''}`
            :  r.action === 'delete' ? `刪除 ${r.old_data?.name ?? ''}`
            :  r.target_table === 'profiles'
                ? `音樂 ${JSON.stringify(r.old_data?.allowed_music)} → ${JSON.stringify(r.new_data?.allowed_music)}`
                : '修改設定');
        return `<tr>
            <td>${new Date(r.at).toLocaleString('zh-TW')}</td>
            <td>${escapeHtml(r.actor_email || '（後台）')}</td>
            <td>${escapeHtml(r.action)}</td>
            <td>${escapeHtml(r.target_table)} / ${escapeHtml(r.target_key || '')}</td>
            <td>${escapeHtml(detail)}</td></tr>`;
    }).join('');
}
async function saveMusic(key) {
    const name = document.getElementById('mn-' + key).value.trim();
    const url = document.getElementById('mu-' + key).value.trim();
    const enabled = document.getElementById('me-' + key).checked;
    if (!name) return alert('❌ 名稱不能為空');
    if (!ytId(url)) return alert('❌ 看不出是有效的 YouTube 網址');

    const { error } = await supabase.from('music_tracks').update({ name, url, enabled }).eq('key', key);
    if (error) return alert('❌ ' + error.message);
    alert('✅ 已更新');
    await loadMusicTracks();
}

// ============ Modal 外部點擊關閉 ============
document.addEventListener('click', function(event) {
    const editModal = document.getElementById('edit-modal');
    if (event.target === editModal) {
        closeEditModal();
    }
});

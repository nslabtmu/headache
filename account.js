// ============ Supabase 初始化 ============
//const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentEditingUserId = null;

// ============ 頁面載入 ============
window.addEventListener('load', async () => {
    console.log('account.js 頁面載入...');
   // await loadUsers();
    await updateStats();
});
// 修改 2：當管理者點擊打開帳號管理 Modal 時，才去載入資料
async function openAccountManagement() {
    const isAdmin = await checkIfUserIsAdmin(); // 假設你用非同步檢查權限
    
    if (!isAdmin) {
        window.location.href = '/pane-profile';
        return;
    }
    
    const modal = document.getElementById('account-management-modal');
    if (modal) {
        modal.style.display = 'flex';
        
        // 👉 關鍵：在這裡確定 Modal 已經打開、DOM 已經渲染出來後，才開始載入用戶列表！
        await loadUsers(); 
        await updateStats();
    }
}
// ============ 載入所有帳號 ============
async function loadUsers() {
    try {
        console.log('開始載入用戶列表...');
        
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('users-table');
        if (!tbody) {
            console.error('❌ users-table 未找到');
            return;
        }
        
        tbody.innerHTML = '';

        if (!profiles || profiles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #95a5a6;">還沒有帳號</td></tr>';
            return;
        }

        profiles.forEach(profile => {
            const tr = document.createElement('tr');
            const createdAt = new Date(profile.created_at).toLocaleDateString('zh-TW');
            const status = profile.role === 'user' ? '✅活躍' : '❌停用';
            
            // 音樂模式顯示
            const musicMode = profile.music_mode === 'locked' 
                ? `🔒 ${profile.preferred_music}` 
                : '🎵 自由選擇';

            tr.innerHTML = `
                <td>${profile.display_name || '未設定'}</td>
                <td>${profile.account_type === 'google' ? '🔵 Google' : (profile.phone_account || '-')}</td>
                <td>${status}</td>
                <td>${musicMode}</td>
                <td>${createdAt}</td>
                <td>
                    <button 
                        class="btn btn-edit btn-small" 
                        onclick="openEditModal(
                            '${profile.id}', 
                            '${(profile.display_name || '').replace(/'/g, "\\'")}',
                            '${(profile.email || '').replace(/'/g, "\\'")}',
                            '${profile.music_mode || 'free'}',
                            '${profile.preferred_music || '純鋼琴'}'
                        )"
                    >編輯</button>
                    <button 
                        class="btn btn-delete btn-small" 
                        onclick="deleteUser('${profile.id}', '${(profile.display_name || '').replace(/'/g, "\\'")}')"
                    >刪除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        console.log('✅ 用戶列表已載入');

    } catch (error) {
        console.error('❌ 載入用戶失敗：', error);
    }
}

// ============ 新增帳號 ============
function showAlternativeLogin() {
            const box = document.getElementById('alternative-login');
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
        }

        function switchLoginTab(tabType) {
            document.getElementById('email-tab').style.display = tabType === 'email' ? 'block' : 'none';
            document.getElementById('account-tab').style.display = tabType === 'account' ? 'block' : 'none';
        }


async function handleAddUser(event) {
    event.preventDefault();

    const name = document.getElementById('add-name').value.trim();
    const account = document.getElementById('add-account').value.trim();
    const password = document.getElementById('add-password').value;
    const messageEl = document.getElementById('add-message');
    const btnEl = document.getElementById('add-btn-text');

    if (!name || !account || !password) {
        showMessage('add-message', '❌ 請填入所有必填欄位', 'error');
        return;
    }

    const email = `${account}@phone.local`;

    try {
        btnEl.textContent = '⏳ 新增中...';
        btnEl.parentElement.disabled = true;

        // 1. 在 auth 建立帳號
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    role: 'user',
                    account_type: 'phone'
                }
            }
        });

        if (authError) throw authError;

        // 2. 自動確認（不需要驗證信）
        const { error: confirmError } = await supabase.auth.admin.updateUserById(
            authData.user.id,
            { email_confirm: true }
        );

        if (confirmError) throw confirmError;

        // 3. 寫入 profiles
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: authData.user.id,
                    email: email,
                    display_name: name,
                    phone_account: account,
                    role: 'user',
                    account_type: 'phone',
                    is_confirmed: true,
                    music_mode: 'free',
                    preferred_music: '純鋼琴',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ]);

        if (profileError) throw profileError;

        showMessage('add-message', `✅ 帳號建立成功！帳號：${account}，密碼：${password}`, 'success');
        
        const form = document.querySelector('.section form');
        if (form) form.reset();
        
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

// ============ 編輯 Modal ============
function openEditModal(userId, name, email, music_mode, preferred_music) {
    console.log('打開編輯 modal，userId:', userId);
    
    currentEditingUserId = userId;
    
    // 基本欄位
    const nameInput = document.getElementById('edit-name');
    if (nameInput) nameInput.value = name;
    
    // 密碼欄位清空
    const passwordInput = document.getElementById('edit-password');
    if (passwordInput) passwordInput.value = '';
    
    // 音樂設定
    const modeSelect = document.getElementById('edit-music-mode');
    if (modeSelect) modeSelect.value = music_mode || 'free';
    
    const musicSelect = document.getElementById('edit-preferred-music');
    if (musicSelect) musicSelect.value = preferred_music || '純鋼琴';
    
    // 根據模式顯示/隱藏音樂選項
    updateMusicOptionsVisibility();
    
    // 停用狀態預設為 false
    const statusCheckbox = document.getElementById('edit-status');
    if (statusCheckbox) statusCheckbox.checked = false;
    
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.add('show');
    } else {
        console.error('❌ edit-modal 未找到');
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 當 music_mode 改變時，顯示/隱藏音樂選項
function updateMusicOptionsVisibility() {
    const mode = document.getElementById('edit-music-mode').value;
    const musicOptions = document.getElementById('music-options-group');
    
    if (mode === 'locked') {
        musicOptions.style.display = 'block'; // 顯示音樂選項
    } else {
        musicOptions.style.display = 'none'; // 隱藏音樂選項
    }
}

// ============ 保存編輯 ============
async function handleEditUser(event) {
    event.preventDefault();

    const name = document.getElementById('edit-name').value.trim();
    const password = document.getElementById('edit-password').value;
    const music_mode = document.getElementById('edit-music-mode').value;
    const preferred_music = document.getElementById('edit-preferred-music').value;

    if (!name) {
        alert('❌ 姓名不能為空');
        return;
    }

    try {
        const updates = {
            display_name: name,
            music_mode: music_mode,
            preferred_music: preferred_music,
            updated_at: new Date().toISOString()
        };

        // 如果有輸入新密碼才更新
        if (password) {
            updates.password = password;
        }

        // 更新 Supabase profiles
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                display_name: name,
                music_mode: music_mode,
                preferred_music: preferred_music,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentEditingUserId);

        if (profileError) throw profileError;

        // 如果有密碼，更新 auth
        if (password) {
            const { error: authError } = await supabase.auth.admin.updateUserById(
                currentEditingUserId,
                { password: password }
            );
            if (authError) throw authError;
        }

        alert('✅ 用戶資訊已更新！');
        closeEditModal();
        await loadUsers();

    } catch (error) {
        console.error('❌ 更新失敗：', error);
        alert('❌ 更新失敗：' + error.message);
    }
}

// ============ 刪除帳號 ============
async function deleteUser(userId, name) {
    if (!confirm(`確定要刪除 "${name}" 的帳號嗎？此操作無法復原！`)) {
        return;
    }

    try {
        // 1. 刪除 profiles
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) throw profileError;

        // 2. 刪除 auth
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) throw authError;

        alert('✅ 帳號已刪除');
        await loadUsers();
        await updateStats();

    } catch (error) {
        console.error('❌ 刪除失敗：', error);
        alert('❌ 刪除失敗：' + error.message);
    }
}

// ============ 更新統計 ============
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

        console.log('✅ 統計已更新');

    } catch (error) {
        console.error('❌ 更新統計失敗：', error);
    }
}

// ============ 顯示訊息 ============
function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    el.textContent = message;
    el.className = `message ${type}`;
    el.style.display = 'block';
}

// ============ Modal 外部點擊關閉 ============
document.addEventListener('click', function(event) {
    const editModal = document.getElementById('edit-modal');
    
    if (event.target === editModal) {
        closeEditModal();
    }
});

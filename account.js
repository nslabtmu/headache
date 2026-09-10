// ============ 帳號與基本資料完整管理 ============
 
// 1️⃣ 新用戶登入時自動建立 profile（只執行一次）
async function initializeUserProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.log('未登入');
            return;
        }
 
        // 檢查是否已有 profile
        const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();
 
        // 如果已有 profile，直接返回
        if (existingProfile) {
            console.log('✅ Profile 已存在');
            return;
        }
 
        // 取得帳號類型（Google 或其他）
        const accountType = user.user_metadata?.provider || 'google';
 
        // 如果沒有 profile，建立新的
        const { error: insertError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: user.id,
                    email: user.email,
                    display_name: user.user_metadata?.name || user.email.split('@')[0],
                    role: 'user', // 新用戶預設為 user
                    account_type: accountType,
                    is_confirmed: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ]);
 
        if (insertError) throw insertError;
 
        console.log('✅ 新 Profile 已建立');
        return true;
 
    } catch (error) {
        console.error('❌ 初始化 Profile 失敗:', error);
    }
}
 
// 2️⃣ 讀取用戶的基本資料（填入表單）
async function loadUserProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.log('未登入');
            return;
        }
 
        // 先初始化 profile
        await initializeUserProfile();
 
        // 讀取完整 profile
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
 
        if (error) throw error;
 
        // 填入基本資料表單
        document.getElementById('prof_nickname').value = profile.nick_name || '';
        document.getElementById('prof_birthyear').value = profile.birth_year || '';
        document.getElementById('prof_gender').value = profile.gender || '';
        document.getElementById('prof_tbi').value = profile.is_mild_tbi_research || '';
        document.getElementById('prof_sport').value = profile.exercise_frequency || '';
 
        // 顯示帳號相關資訊（可選，用於除錯）
        console.log('✅ Profile 已載入:', {
            email: profile.email,
            phone_account: profile.phone_account,
            display_name: profile.display_name,
            role: profile.role,
            account_type: profile.account_type
        });
 
    } catch (error) {
        console.error('❌ 載入 Profile 失敗:', error);
    }
}
 
// 3️⃣ 保存基本資料（當用戶按儲存按鈕時）
async function saveUserProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            alert('❌ 請先登入');
            return;
        }
 
        // 讀取表單中的基本資料
        const profileData = {
            nick_name: document.getElementById('prof_nickname').value.trim() || null,
            birth_year: document.getElementById('prof_birthyear').value 
                ? parseInt(document.getElementById('prof_birthyear').value) 
                : null,
            gender: document.getElementById('prof_gender').value || null,
            is_mild_tbi_research: document.getElementById('prof_tbi').value || null,
            exercise_frequency: document.getElementById('prof_sport').value || null,
            updated_at: new Date().toISOString()
        };
 
        // 保存到 profiles table
        const { error } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', user.id);
 
        if (error) throw error;
 
        alert('✅ 基本資料已保存！');
        console.log('✅ 保存成功:', profileData);
 
    } catch (error) {
        console.error('❌ 保存失敗:', error);
        alert('❌ 保存失敗：' + error.message);
    }
}
 
// 4️⃣ 更新最後登入時間
async function updateLastLogin() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
 
        await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
 
        console.log('✅ 最後登入時間已更新');
 
    } catch (error) {
        console.error('❌ 更新登入時間失敗:', error);
    }
}
 
// 5️⃣ 頁面載入時執行
window.addEventListener('load', function() {
    setTimeout(() => {
        initializeUserProfile(); // 建立或驗證 profile
        loadUserProfile(); // 載入資料
        updateLastLogin(); // 更新登入時間
    }, 500);
});
//管理員

async function adminCreateUser(userData) {
    /*
    userData 包含：
    {
      name: '王老先生',          // 姓名
      account: 'wang-001',        // 帳號
      password: '12345678',       // 密碼
      
      // 基本資料
      nick_name: '小王',
      birth_year: 1960,
      gender: 'male',
      is_mild_tbi_research: 'yes',
      exercise_frequency: 'light'
    }
    */
 
    try {
        const email = `${userData.account}@phone.local`;
 
        // 1️⃣ 在 auth 建立帳號
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: userData.password,
            options: {
                data: {
                    name: userData.name,
                    role: 'user',
                    account_type: 'phone'
                }
            }
        });
 
        if (authError) throw authError;
 
        // 2️⃣ 自動確認帳號（不需要驗證信）
        const { error: confirmError } = await supabase.auth.admin.updateUserById(
            authData.user.id,
            { email_confirm: true }
        );
 
        if (confirmError) throw confirmError;
 
        // 3️⃣ 建立 profile（帳號 + 基本資料）
        const { error: profileError } = await supabase
            .from('profiles')
            .insert([
                {
                    id: authData.user.id,
                    email: email,
                    display_name: userData.name,
                    phone_account: userData.account,
                    role: 'user',
                    account_type: 'phone',
                    is_confirmed: true,
                    
                    // 基本資料
                    nick_name: userData.nick_name || null,
                    birth_year: userData.birth_year || null,
                    gender: userData.gender || null,
                    is_mild_tbi_research: userData.is_mild_tbi_research || null,
                    exercise_frequency: userData.exercise_frequency || null,
                    
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ]);
 
        if (profileError) throw profileError;
 
        alert(`✅ 帳號建立成功！帳號：${userData.account}，密碼：${userData.password}`);
        return true;
 
    } catch (error) {
        console.error('❌ 建立失敗:', error);
        alert('❌ 建立失敗：' + error.message);
        return false;
    }
}

function openEditModal(userId, name, email, music_mode, preferred_music) {
    currentEditingUserId = userId;
    
    // 原有的編輯欄位
    document.getElementById('edit-name').value = name;
    
    // 新增：音樂設定欄位
    document.getElementById('edit-music-mode').value = music_mode || 'free';
    document.getElementById('edit-preferred-music').value = preferred_music || '純鋼琴';
    
    // 根據模式顯示/隱藏音樂選項
    updateMusicOptionsVisibility();
    
    document.getElementById('edit-modal').classList.add('show');
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
 

 
//2️⃣ 保存編輯（包括音樂設定）
 
 
async function handleEditUser(event) {
    event.preventDefault();
 
    const name = document.getElementById('edit-name').value;
    const password = document.getElementById('edit-password').value;
    const music_mode = document.getElementById('edit-music-mode').value;
    const preferred_music = document.getElementById('edit-preferred-music').value;
    const isDisabled = document.getElementById('edit-status').checked;
 
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
 
        // 更新 Supabase
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentEditingUserId);
 
        if (error) throw error;
 
        alert('✅ 用戶資訊已更新！');
        closeEditModal();
        await loadUsers();
 
    } catch (error) {
        alert('❌ 更新失敗: ' + error.message);
    }
}
 

 
//3️⃣ 載入用戶列表（包括音樂設定欄位）
 
 
async function loadUsers() {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
 
        if (error) throw error;
 
        const tbody = document.getElementById('users-table');
        tbody.innerHTML = '';
 
        profiles.forEach(profile => {
            const tr = document.createElement('tr');
            const createdAt = new Date(profile.created_at).toLocaleDateString('zh-TW');
            const status = profile.role === 'user' ? '✅ 活躍' : '❌ 停用';
            
            // 音樂模式顯示
            const musicMode = profile.music_mode === 'locked' 
                ? `🔒 ${profile.preferred_music}` 
                : '🎵 自由選擇';
 
            tr.innerHTML = `
                <td>${profile.display_name || '未設定'}</td>
                <td>${profile.account_type === 'google' ? '🔵 Google' : profile.phone_account}</td>
                <td>${status}</td>
                <td>${musicMode}</td>
                <td>${createdAt}</td>
                <td>
                    <button 
                        class="btn-edit" 
                        onclick="openEditModal(
                            '${profile.id}', 
                            '${profile.display_name}',
                            '${profile.email}',
                            '${profile.music_mode || 'free'}',
                            '${profile.preferred_music || '純鋼琴'}'
                        )"
                    >編輯</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
 
    } catch (error) {
        console.error('載入用戶失敗:', error);
    }
}
 
function openAccountManagement() {
    const modal = document.getElementById('account-management-modal');
    if (modal) {
        modal.style.display = 'flex';
        loadAccountManagementData();
    }
}

function closeAccountManagement() {
    const modal = document.getElementById('account-management-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

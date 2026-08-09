/* CloudVault Super Admin Control Panel Controller */

let adminCachedUsers = [];
let adminTargetUserId = null;
let adminTargetUserEmail = null;

document.addEventListener('DOMContentLoaded', () => {
    // Admin Panel is initialized on tab switch
    window.initializeAdminPanel = initializeAdminPanel;
});

async function initializeAdminPanel() {
    try {
        // 1. Verify Super Admin status
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session || session.user.email !== 'homtolab@gmail.com') {
            window.showToast("Unauthorized: Admin access required.", "danger");
            window.switchSection('overview-tab');
            return;
        }

        // 2. Fetch statistics
        await loadAdminStats();

        // 3. Fetch and render user list
        await loadAdminUsers();

        // 4. Fetch and render login session logs
        await loadAdminLoginLogs();

        // 5. Setup event listeners
        setupAdminEventListeners();

    } catch (err) {
        console.error("Admin Panel initialization failed:", err);
        window.showToast("Failed to initialize Admin Control Centre.", "danger");
    }
}

// 1. Load Admin Statistics
async function loadAdminStats() {
    try {
        // Total Users count
        const usersQuery = window.supabaseClient.from('profiles').select('id', { count: 'exact' });
        
        // Total Files count
        const filesQuery = window.supabaseClient.from('files').select('id', { count: 'exact' });
        
        // Total Snippets count
        const notesQuery = window.supabaseClient.from('notes').select('id', { count: 'exact' });

        // Logins today (created in the last 24 hours)
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const loginsQuery = window.supabaseClient
            .from('login_logs')
            .select('id', { count: 'exact' })
            .gt('login_time', dayAgo);

        const [usersRes, filesRes, notesRes, loginsRes] = await Promise.all([
            usersQuery, filesQuery, notesQuery, loginsQuery
        ]);

        if (!usersRes.error) document.getElementById('admin-stat-users').textContent = usersRes.count;
        if (!filesRes.error) document.getElementById('admin-stat-files').textContent = filesRes.count;
        if (!notesRes.error) document.getElementById('admin-stat-notes').textContent = notesRes.count;
        if (!loginsRes.error) document.getElementById('admin-stat-logins').textContent = loginsRes.count;

    } catch (err) {
        console.error("Error loading admin stats:", err);
    }
}

// 2. Load and render users list
async function loadAdminUsers() {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">Loading users list...</td></tr>`;

    try {
        const { data, error } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        adminCachedUsers = data || [];
        renderUsersTable(adminCachedUsers);

    } catch (err) {
        console.error("Error loading users:", err);
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--danger);">Failed to load users.</td></tr>`;
    }
}

function renderUsersTable(users) {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;

    if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">No users found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--card-border)';
        
        const joinedDate = new Date(user.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        const name = user.full_name || 'Anonymous User';
        
        tr.innerHTML = `
            <td style="padding: 12px 8px; display: flex; align-items: center; gap: 8px;">
                <div class="user-avatar" style="width: 28px; height: 28px; font-size: 11px;">
                    ${name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                </div>
                <span style="font-weight: 600;">${name}</span>
            </td>
            <td style="padding: 12px 8px; color: var(--text-secondary);">${user.email}</td>
            <td style="padding: 12px 8px; color: var(--text-muted);">${joinedDate}</td>
            <td style="padding: 12px 8px; text-align: right; display: flex; gap: 6px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="openAdminUserModal('${user.id}', '${user.email}', '${name}')" style="padding: 6px 12px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
                    <i data-lucide="eye" style="width: 12px; height: 12px;"></i> View Data
                </button>
                <button class="btn btn-danger" onclick="deleteUserDirect('${user.id}', '${user.email}')" style="padding: 6px 12px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
                    <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Delete
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
}

// 3. Load Login Session logs
async function loadAdminLoginLogs() {
    const container = document.getElementById('admin-login-logs-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;">Loading login logs...</div>`;

    try {
        const { data, error } = await window.supabaseClient
            .from('login_logs')
            .select('*')
            .order('login_time', { ascending: false })
            .limit(20);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;">No logins logged yet.</div>`;
            return;
        }

        container.innerHTML = '';
        data.forEach(log => {
            const timeStr = new Date(log.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(log.login_time).toLocaleDateString([], { month: 'short', day: 'numeric' });

            const logItem = document.createElement('div');
            logItem.className = 'glass-card';
            logItem.style.cssText = 'padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; font-size: 12px;';
            logItem.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                    <i data-lucide="key" style="width: 14px; height: 14px; color: var(--warning); flex-shrink: 0;"></i>
                    <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${log.email}</span>
                </div>
                <div style="font-size: 10px; color: var(--text-muted);">${dateStr}, ${timeStr}</div>
            `;
            container.appendChild(logItem);
        });

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error("Error loading login logs:", err);
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--danger); font-size: 12px;">Failed to load logs.</div>`;
    }
}

// 4. Setup Event Listeners
function setupAdminEventListeners() {
    // User search
    const searchInput = document.getElementById('admin-user-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = adminCachedUsers.filter(u => 
                u.email.toLowerCase().includes(query) || 
                (u.full_name && u.full_name.toLowerCase().includes(query))
            );
            renderUsersTable(filtered);
        });
    }

    // Save user profile changes (Name edit)
    const updateNameBtn = document.getElementById('admin-update-name-btn');
    if (updateNameBtn) {
        updateNameBtn.onclick = handleAdminUpdateName;
    }

    // Create snippet on behalf
    const addNoteBtn = document.getElementById('admin-add-note-btn');
    if (addNoteBtn) {
        addNoteBtn.onclick = handleAdminAddNote;
    }

    // Upload file file-input listener
    const fileInput = document.getElementById('admin-upload-file-input');
    const filenameDisplay = document.getElementById('admin-upload-filename-display');
    const submitUploadBtn = document.getElementById('admin-upload-submit-btn');

    if (fileInput && filenameDisplay && submitUploadBtn) {
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                filenameDisplay.textContent = e.target.files[0].name;
                submitUploadBtn.style.display = 'inline-block';
            } else {
                filenameDisplay.textContent = 'No file chosen';
                submitUploadBtn.style.display = 'none';
            }
        };

        submitUploadBtn.onclick = handleAdminUploadOnBehalf;
    }

    // Wipe / Delete user account button
    const wipeUserBtn = document.getElementById('admin-wipe-user-btn');
    if (wipeUserBtn) {
        wipeUserBtn.onclick = handleAdminWipeUser;
    }
}

// 5. Open User Detail Modal
async function openAdminUserModal(userId, email, fullName) {
    adminTargetUserId = userId;
    adminTargetUserEmail = email;

    // Reset inputs
    document.getElementById('admin-edit-name-input').value = fullName;
    document.getElementById('admin-add-note-title').value = '';
    document.getElementById('admin-add-note-content').value = '';
    document.getElementById('admin-upload-file-input').value = '';
    document.getElementById('admin-upload-filename-display').textContent = 'No file chosen';
    document.getElementById('admin-upload-submit-btn').style.display = 'none';
    document.getElementById('admin-upload-progress-container').style.display = 'none';

    document.getElementById('admin-user-detail-subtitle').textContent = `Managing data of: ${email}`;
    document.getElementById('admin-user-data-modal').classList.add('active');

    await loadAdminUserInventory();
}
window.openAdminUserModal = openAdminUserModal;

// Load target user's files and notes
async function loadAdminUserInventory() {
    const filesList = document.getElementById('admin-user-files-list');
    const notesList = document.getElementById('admin-user-notes-list');
    const filesCount = document.getElementById('admin-user-files-count');
    const notesCount = document.getElementById('admin-user-notes-count');

    filesList.innerHTML = `<div style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 12px;">Loading files...</div>`;
    notesList.innerHTML = `<div style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 12px;">Loading snippets...</div>`;

    try {
        // Query files
        const { data: files, error: filesErr } = await window.supabaseClient
            .from('files')
            .select('*')
            .eq('user_id', adminTargetUserId)
            .order('created_at', { ascending: false });

        if (filesErr) throw filesErr;

        // Query notes
        const { data: notes, error: notesErr } = await window.supabaseClient
            .from('notes')
            .select('*')
            .eq('user_id', adminTargetUserId)
            .order('created_at', { ascending: false });

        if (notesErr) throw notesErr;

        // Render Files
        filesCount.textContent = files.length;
        if (files.length === 0) {
            filesList.innerHTML = `<div style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 12px;">No files uploaded.</div>`;
        } else {
            filesList.innerHTML = '';
            files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'glass-card';
                item.style.cssText = 'padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; font-size: 12px;';
                item.innerHTML = `
                    <span style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;" title="${file.filename}">${file.filename}</span>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button onclick="downloadAdminFile('${file.storage_path}', '${file.filename}')" class="btn btn-secondary" style="padding: 4px 6px; font-size: 10px;" title="Download"><i data-lucide="download" style="width: 12px; height: 12px;"></i></button>
                        <button onclick="deleteAdminFile('${file.id}', '${file.storage_path}')" class="btn btn-danger" style="padding: 4px 6px; font-size: 10px;" title="Delete"><i data-lucide="trash" style="width: 12px; height: 12px;"></i></button>
                    </div>
                `;
                filesList.appendChild(item);
            });
        }

        // Render Notes
        notesCount.textContent = notes.length;
        if (notes.length === 0) {
            notesList.innerHTML = `<div style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 12px;">No snippets created.</div>`;
        } else {
            notesList.innerHTML = '';
            notes.forEach(note => {
                const item = document.createElement('div');
                item.className = 'glass-card';
                item.style.cssText = 'padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; font-size: 12px;';
                item.innerHTML = `
                    <div style="display: flex; flex-direction: column; min-width: 0; flex: 1; margin-right: 10px;">
                        <span style="font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${note.title}</span>
                        <span style="font-size: 10px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${note.content.substring(0, 30)}</span>
                    </div>
                    <button onclick="deleteAdminNote('${note.id}')" class="btn btn-danger" style="padding: 4px 6px; font-size: 10px;" title="Delete"><i data-lucide="trash" style="width: 12px; height: 12px;"></i></button>
                `;
                notesList.appendChild(item);
            });
        }

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error("Error loading user inventory:", err);
    }
}

// 6. Action handlers
async function handleAdminUpdateName() {
    const input = document.getElementById('admin-edit-name-input');
    const name = input.value.trim();

    if (!name) {
        window.showToast("Name cannot be empty.", "warning");
        return;
    }

    try {
        const { error } = await window.supabaseClient.rpc('admin_update_user_profile', {
            target_user_id: adminTargetUserId,
            new_full_name: name
        });

        if (error) throw error;

        window.showToast("User name updated successfully!", "success");
        await loadAdminUsers(); // Refresh main list

    } catch (err) {
        console.error("Admin user update error:", err);
        window.showToast("Failed to update user name.", "danger");
    }
}

async function handleAdminAddNote() {
    const titleInput = document.getElementById('admin-add-note-title');
    const contentInput = document.getElementById('admin-add-note-content');
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        window.showToast("Title and content are required.", "warning");
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('notes')
            .insert({
                user_id: adminTargetUserId,
                title,
                content
            });

        if (error) throw error;

        window.showToast("Note snippet added successfully!", "success");
        titleInput.value = '';
        contentInput.value = '';
        
        await loadAdminUserInventory(); // Refresh modal view
        await loadAdminStats(); // Refresh stats

    } catch (err) {
        console.error("Admin add note error:", err);
        window.showToast("Failed to create note snippet.", "danger");
    }
}

async function handleAdminUploadOnBehalf() {
    const fileInput = document.getElementById('admin-upload-file-input');
    const file = fileInput.files[0];
    if (!file) return;

    const progressContainer = document.getElementById('admin-upload-progress-container');
    const progressFill = document.getElementById('admin-upload-progress-fill');
    const progressPercent = document.getElementById('admin-upload-progress-percent');
    const submitBtn = document.getElementById('admin-upload-submit-btn');

    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressPercent.textContent = '0%';
    submitBtn.disabled = true;

    try {
        // Upload path: uploads/{target_user_id}/{timestamp}_{filename}
        const path = `uploads/${adminTargetUserId}/${Date.now()}_${file.name}`;

        const { data: uploadData, error: uploadErr } = await window.supabaseClient.storage
            .from('vault')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
                onUploadProgress: (progress) => {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    progressFill.style.width = `${percent}%`;
                    progressPercent.textContent = `${percent}%`;
                }
            });

        if (uploadErr) throw uploadErr;

        // Insert database catalog
        const { error: dbErr } = await window.supabaseClient
            .from('files')
            .insert({
                user_id: adminTargetUserId,
                filename: file.name,
                storage_path: path,
                file_type: file.type || 'application/octet-stream',
                size: file.size
            });

        if (dbErr) throw dbErr;

        window.showToast(`Uploaded file "${file.name}" successfully on behalf of user!`, "success");
        
        // Reset upload fields
        fileInput.value = '';
        document.getElementById('admin-upload-filename-display').textContent = 'No file chosen';
        submitBtn.style.display = 'none';
        progressContainer.style.display = 'none';

        await loadAdminUserInventory(); // Refresh modal view
        await loadAdminStats(); // Refresh stats

    } catch (err) {
        console.error("Admin upload on behalf error:", err);
        window.showToast("Failed to upload file on behalf of user.", "danger");
        progressContainer.style.display = 'none';
    } finally {
        submitBtn.disabled = false;
    }
}

// Download file helper (creates signed URL and downloads)
async function downloadAdminFile(storagePath, filename) {
    try {
        const { data, error } = await window.supabaseClient.storage
            .from('vault')
            .createSignedUrl(storagePath, 60);

        if (error) throw error;

        // Open in new window or trigger download
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = filename;
        a.target = '_blank';
        a.click();

    } catch (err) {
        console.error("Admin file download error:", err);
        window.showToast("Failed to download file.", "danger");
    }
}
window.downloadAdminFile = downloadAdminFile;

// Delete file helper
async function deleteAdminFile(id, storagePath) {
    window.showConfirmModal(
        "Delete User File",
        "Are you sure you want to delete this file from storage and database? This action cannot be undone.",
        async () => {
            try {
                   // Delete from storage
                   const { error: storageError } = await window.supabaseClient.storage
                       .from('vault')
                       .remove([storagePath]);

                   if (storageError) throw storageError;

                   // Delete from DB
                   const { error } = await window.supabaseClient
                       .from('files')
                       .delete()
                       .eq('id', id);

                if (error) throw error;

                window.showToast("File deleted successfully.", "success");
                
                await loadAdminUserInventory(); // Refresh modal view
                await loadAdminStats(); // Refresh stats

            } catch (err) {
                console.error("Admin file deletion error:", err);
                window.showToast("Failed to delete user file.", "danger");
            }
        }
    );
}
window.deleteAdminFile = deleteAdminFile;

// Delete note helper
async function deleteAdminNote(id) {
    window.showConfirmModal(
        "Delete User Snippet",
        "Are you sure you want to delete this snippet? This action cannot be undone.",
        async () => {
            try {
                const { error } = await window.supabaseClient
                    .from('notes')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                window.showToast("Snippet deleted successfully.", "success");
                
                await loadAdminUserInventory(); // Refresh modal view
                await loadAdminStats(); // Refresh stats

            } catch (err) {
                console.error("Admin note deletion error:", err);
                window.showToast("Failed to delete snippet.", "danger");
            }
        }
    );
}
window.deleteAdminNote = deleteAdminNote;

// Wipe and delete user account
async function handleAdminWipeUser() {
    window.showConfirmModal(
        "Delete User Account (Danger Zone)",
        "WARNING: This will delete ALL files from storage, wipe all database notes, and delete this user's profile database row. This cannot be undone.",
        async () => {
            try {
                window.showToast("Wiping user inventory and deleting account profile...", "info");

                // 1. Fetch user avatar if any
                const { data: profileData } = await window.supabaseClient
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', adminTargetUserId)
                    .single();

                if (profileData && profileData.avatar_url) {
                    await window.supabaseClient.storage
                        .from('vault')
                        .remove([profileData.avatar_url]);
                }

                // 2. Retrieve all files to delete from storage
                const { data: files } = await window.supabaseClient
                    .from('files')
                    .select('storage_path')
                    .eq('user_id', adminTargetUserId);

                if (files && files.length > 0) {
                    const paths = files.map(f => f.storage_path);
                    await window.supabaseClient.storage
                        .from('vault')
                        .remove(paths);
                }

                // 3. Call secure RPC function to delete user from auth.users (cascades database files/notes/profile rows)
                const { error } = await window.supabaseClient.rpc('admin_delete_user', {
                    target_user_id: adminTargetUserId
                });

                if (error) throw error;

                window.showToast("User account profile and files wiped successfully!", "success");
                
                // Close modal
                document.getElementById('admin-user-data-modal').classList.remove('active');

                // Refresh main views
                await loadAdminUsers();
                await loadAdminStats();

            } catch (err) {
                console.error("Admin user wipe error:", err);
                window.showToast("Failed to completely delete user account.", "danger");
            }
        }
    );
}

// Direct delete user helper from table list
async function deleteUserDirect(userId, email) {
    window.showConfirmModal(
        "Delete User Account",
        `Are you sure you want to delete user ${email} and wipe all their files and clipboard notes? This action cannot be undone.`,
        async () => {
            try {
                window.showToast(`Deleting user ${email}...`, "info");

                // 1. Fetch user avatar if any
                const { data: profileData } = await window.supabaseClient
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', userId)
                    .single();

                if (profileData && profileData.avatar_url) {
                    await window.supabaseClient.storage
                        .from('vault')
                        .remove([profileData.avatar_url]);
                }

                // 2. Retrieve all files to delete from storage
                const { data: files } = await window.supabaseClient
                    .from('files')
                    .select('storage_path')
                    .eq('user_id', userId);

                if (files && files.length > 0) {
                    const paths = files.map(f => f.storage_path);
                    await window.supabaseClient.storage
                        .from('vault')
                        .remove(paths);
                }

                // 3. Call secure RPC function to delete user from auth.users (cascades database files/notes/profile rows)
                const { error } = await window.supabaseClient.rpc('admin_delete_user', {
                    target_user_id: userId
                });

                if (error) throw error;

                window.showToast("User account wiped and deleted successfully!", "success");
                
                // Refresh main views
                await loadAdminUsers();
                await loadAdminStats();

            } catch (err) {
                console.error("Admin direct user delete error:", err);
                window.showToast("Failed to delete user account.", "danger");
            }
        }
    );
}
window.deleteUserDirect = deleteUserDirect;

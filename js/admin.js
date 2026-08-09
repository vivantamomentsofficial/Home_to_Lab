/* CloudVault Super Admin Control Panel Controller */

let adminCachedUsers = [];
let adminCachedSnippets = [];
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

        // 4.5 Fetch and render storage upgrade requests
        await loadAdminStorageRequests();

        // 4.6 Fetch and render overall snippets database
        await loadAdminOverallSnippets();

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

    // Save user storage limit changes
    const updateStorageBtn = document.getElementById('admin-update-storage-btn');
    if (updateStorageBtn) {
        updateStorageBtn.onclick = handleAdminUpdateStorage;
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

    // Snippet search input listener
    const snippetSearchInput = document.getElementById('admin-snippet-search');
    if (snippetSearchInput) {
        snippetSearchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = adminCachedSnippets.filter(s => 
                s.title.toLowerCase().includes(query) || 
                s.content.toLowerCase().includes(query) ||
                (s.userName && s.userName.toLowerCase().includes(query)) ||
                (s.userEmail && s.userEmail.toLowerCase().includes(query))
            );
            renderOverallSnippetsTable(filtered);
        };
    }

    // Refresh Dashboard button listener
    const refreshBtn = document.getElementById('admin-refresh-btn');
    if (refreshBtn) {
        refreshBtn.onclick = async () => {
            const icon = document.getElementById('admin-refresh-icon');
            if (icon) icon.classList.add('animate-spin');
            refreshBtn.disabled = true;

            try {
                await loadAdminStats();
                await loadAdminUsers();
                await loadAdminLoginLogs();
                await loadAdminStorageRequests();
                await loadAdminOverallSnippets();
                window.showToast("Admin Dashboard refreshed successfully!", "success");
            } catch (err) {
                console.error("Manual refresh error:", err);
                window.showToast("Failed to refresh dashboard.", "danger");
            } finally {
                if (icon) icon.classList.remove('animate-spin');
                refreshBtn.disabled = false;
            }
        };
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

    // Pre-populate target user's storage limit select
    try {
        const { data: profile } = await window.supabaseClient
            .from('profiles')
            .select('storage_limit')
            .eq('id', userId)
            .single();
        const limitBytes = (profile && profile.storage_limit) ? parseInt(profile.storage_limit) : 100 * 1024 * 1024;
        document.getElementById('admin-edit-storage-limit').value = limitBytes.toString();
    } catch (e) {
        console.warn("Could not load target user storage limit in admin modal:", e);
    }

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

// =========================================================================
// STORAGE UPGRADE REQUESTS & DIRECT LIMIT UPDATES (ADMIN ACTIONS)
// =========================================================================

async function loadAdminStorageRequests() {
    const tableBody = document.getElementById('admin-storage-requests-body');
    if (!tableBody) return;

    try {
        const { data: requests, error } = await window.supabaseClient
            .from('storage_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });

        if (error) throw error;

        renderStorageRequestsTable(requests || []);

    } catch (err) {
        console.error("Error loading storage requests:", err);
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger); padding: 20px 0;">Failed to load requests.</td></tr>`;
    }
}
window.loadAdminStorageRequests = loadAdminStorageRequests;

function renderStorageRequestsTable(requests) {
    const tableBody = document.getElementById('admin-storage-requests-body');
    if (!tableBody) return;

    if (requests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px 0;">No pending storage requests.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    requests.forEach(req => {
        const row = document.createElement('tr');
        const limitMb = Math.round(parseInt(req.requested_limit) / (1024 * 1024));
        const dateStr = new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        row.innerHTML = `
            <td>
                <div style="font-weight: 600; color: var(--text-primary);">${req.email}</div>
            </td>
            <td>
                <span class="status-badge" style="background: rgba(14, 165, 233, 0.1); color: var(--primary); font-weight: 600; font-size: 12px; padding: 4px 8px; border-radius: 4px;">
                    ${limitMb} MB
                </span>
            </td>
            <td style="color: var(--text-muted); font-size: 13px;">${dateStr}</td>
            <td style="text-align: right; padding-right: 20px;">
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button onclick="approveStorageRequest('${req.id}')" class="btn btn-primary" style="padding: 4px 10px; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                        <i data-lucide="check" style="width: 14px; height: 14px;"></i> Approve
                    </button>
                    <button onclick="rejectStorageRequest('${req.id}')" class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px; display: flex; align-items: center; gap: 4px; color: var(--danger); border-color: rgba(239, 68, 68, 0.2);">
                        <i data-lucide="x" style="width: 14px; height: 14px;"></i> Reject
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if (window.lucide) window.lucide.createIcons();
}

async function approveStorageRequest(requestId) {
    try {
        window.showToast("Approving storage upgrade...", "info");

        const { error } = await window.supabaseClient
            .from('storage_requests')
            .update({ status: 'approved' })
            .eq('id', requestId);

        if (error) throw error;

        window.showToast("Storage request approved successfully!", "success");
        await loadAdminStorageRequests();
        await loadAdminUsers(); // Refresh user storage limit in main table
        await loadAdminStats(); // Refresh stats

    } catch (err) {
        console.error("Error approving storage request:", err);
        window.showToast("Failed to approve request.", "danger");
    }
}
window.approveStorageRequest = approveStorageRequest;

async function rejectStorageRequest(requestId) {
    try {
        window.showToast("Rejecting storage request...", "info");

        const { error } = await window.supabaseClient
            .from('storage_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);

        if (error) throw error;

        window.showToast("Storage request rejected successfully.", "success");
        await loadAdminStorageRequests();

    } catch (err) {
        console.error("Error rejecting storage request:", err);
        window.showToast("Failed to reject request.", "danger");
    }
}
window.rejectStorageRequest = rejectStorageRequest;

async function handleAdminUpdateStorage() {
    const limitSelect = document.getElementById('admin-edit-storage-limit');
    const newLimit = parseInt(limitSelect.value);

    const updateStorageBtn = document.getElementById('admin-update-storage-btn');
    const origText = updateStorageBtn.innerHTML;
    updateStorageBtn.disabled = true;
    updateStorageBtn.textContent = "Saving...";

    try {
        const { error } = await window.supabaseClient
            .from('profiles')
            .update({ storage_limit: newLimit })
            .eq('id', adminTargetUserId);

        if (error) throw error;

        window.showToast("User storage limit updated successfully!", "success");

        // Refresh UI list and stats
        await loadAdminUsers();
        await loadAdminStorageRequests();
        await loadAdminStats();

    } catch (err) {
        console.error("Error updating user storage limit directly:", err);
        window.showToast("Failed to update user storage limit.", "danger");
    } finally {
        updateStorageBtn.disabled = false;
        updateStorageBtn.innerHTML = origText;
    }
}

// =========================================================================
// OVERALL SNIPPETS DATABASE FUNCTIONS
// =========================================================================

async function loadAdminOverallSnippets() {
    const tableBody = document.getElementById('admin-overall-snippets-body');
    if (!tableBody) return;

    try {
        // Fetch all notes (snippets)
        const { data: notes, error: notesError } = await window.supabaseClient
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        // Fetch profiles to map user names
        const { data: profiles, error: profilesError } = await window.supabaseClient
            .from('profiles')
            .select('id, full_name, email');

        if (profilesError) throw profilesError;

        const profileMap = {};
        if (profiles) {
            profiles.forEach(p => {
                profileMap[p.id] = {
                    name: p.full_name || 'Anonymous User',
                    email: p.email || 'N/A'
                };
            });
        }

        // Map user details to snippets
        adminCachedSnippets = (notes || []).map(note => {
            const userDetails = profileMap[note.user_id] || { name: 'Anonymous User', email: 'N/A' };
            return {
                ...note,
                userName: userDetails.name,
                userEmail: userDetails.email
            };
        });

        // Clear search query value
        const searchInput = document.getElementById('admin-snippet-search');
        if (searchInput) searchInput.value = '';

        renderOverallSnippetsTable(adminCachedSnippets);

    } catch (err) {
        console.error("Error loading overall snippets:", err);
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--danger); padding: 20px 0;">Failed to load snippets database.</td></tr>`;
    }
}
window.loadAdminOverallSnippets = loadAdminOverallSnippets;

function renderOverallSnippetsTable(snippets) {
    const tableBody = document.getElementById('admin-overall-snippets-body');
    if (!tableBody) return;

    if (snippets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px 0;">No snippets found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    snippets.forEach(snippet => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--card-border)';
        
        // Escape HTML to prevent XSS
        const safeTitle = snippet.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeContent = snippet.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const previewContent = safeContent.length > 80 ? safeContent.substring(0, 80) + '...' : safeContent;

        tr.innerHTML = `
            <td style="padding: 12px 10px; padding-left: 15px; vertical-align: middle;">
                <div style="font-weight: 600; color: var(--text-primary);">${snippet.userName}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${snippet.userEmail}</div>
            </td>
            <td style="padding: 12px 10px; font-weight: 500; color: var(--text-secondary); vertical-align: middle;">
                ${safeTitle}
            </td>
            <td style="padding: 12px 10px; color: var(--text-muted); font-family: monospace; font-size: 12px; vertical-align: middle; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${previewContent}
            </td>
            <td style="padding: 12px 10px; text-align: right; padding-right: 20px; vertical-align: middle;">
                <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
                    <button onclick="copySnippetById('${snippet.id}')" class="btn btn-secondary" style="padding: 6px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
                        <i data-lucide="copy" style="width: 12px; height: 12px;"></i> Copy
                    </button>
                    <button onclick="deleteAdminSnippet('${snippet.id}')" class="btn btn-danger" style="padding: 6px 10px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
                        <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Delete
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
}
window.renderOverallSnippetsTable = renderOverallSnippetsTable;

async function copySnippetById(noteId) {
    const snippet = adminCachedSnippets.find(s => s.id === noteId);
    if (!snippet) return;
    try {
        await navigator.clipboard.writeText(snippet.content);
        window.showToast("Snippet content copied to clipboard!", "success");
    } catch (err) {
        console.error("Failed to copy snippet text:", err);
        window.showToast("Failed to copy to clipboard.", "danger");
    }
}
window.copySnippetById = copySnippetById;

async function deleteAdminSnippet(noteId) {
    window.showConfirmModal(
        "Delete Snippet",
        "Are you sure you want to permanently delete this snippet? This action cannot be undone.",
        async () => {
            try {
                window.showToast("Deleting snippet...", "info");

                const { error } = await window.supabaseClient
                    .from('notes')
                    .delete()
                    .eq('id', noteId);

                if (error) throw error;

                window.showToast("Snippet deleted successfully!", "success");
                await loadAdminOverallSnippets();
                await loadAdminStats(); // Update total snippet counts

            } catch (err) {
                console.error("Error deleting note snippet:", err);
                window.showToast("Failed to delete snippet.", "danger");
            }
        }
    );
}
window.deleteAdminSnippet = deleteAdminSnippet;


/* CloudVault Dashboard View Controller */

// Global navigation helper
function switchSection(targetId) {
    // 1. Update active sidebar item
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        if (item.getAttribute('data-target') === targetId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 2. Toggle visible sections
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(section => {
        if (section.id === targetId) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // 3. Update top navbar title
    const titleEl = document.getElementById('navbar-section-title');
    let titleText = "Dashboard Overview";
    if (targetId === 'upload-tab') titleText = "Send to Server";
    if (targetId === 'vault-tab') {
        titleText = "Receive (My Vault)";
        if (window.loadVaultFiles) window.loadVaultFiles(); // Reload files on switch
    }
    if (targetId === 'quicktext-tab') {
        titleText = "Quick Text Clipboard";
        if (window.loadQuickNotes) window.loadQuickNotes(); // Reload notes on switch
    }
    if (targetId === 'profile-tab') titleText = "User Profile";
    if (targetId === 'settings-tab') titleText = "Settings";
    
    titleEl.textContent = titleText;
}
window.switchSection = switchSection;

// Global modal close helper
function closePreviewModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
    if (modalId === 'share-code-modal' && window.dashboardShareInterval) {
        clearInterval(window.dashboardShareInterval);
        window.dashboardShareInterval = null;
    }
}
window.closePreviewModal = closePreviewModal;

// Global confirmation modal utility
function showConfirmModal(title, message, okCallback) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const okBtn = document.getElementById('confirm-ok-btn');

    titleEl.textContent = title;
    messageEl.textContent = message;

    // Reset buttons
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);

    modal.classList.add('active');

    cancelBtn.onclick = () => {
        modal.classList.remove('active');
    };

    newOkBtn.onclick = async () => {
        modal.classList.remove('active');
        if (okCallback) await okCallback();
    };
}
window.showConfirmModal = showConfirmModal;

// Main initializer
document.addEventListener('DOMContentLoaded', () => {
    const checkDb = setInterval(() => {
        if (window.supabaseClient) {
            clearInterval(checkDb);
            initializeDashboard();
        }
    }, 100);
    setTimeout(() => clearInterval(checkDb), 10000);
});

async function initializeDashboard() {
    // 1. Verify Session
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login';
        return;
    }

    // 2. Setup Navbar & User Info
    updateUserProfileNav(session.user);
    updateStorageStats();

    // 3. Load Overview Page Stats & Recent Activities
    updateOverviewStats();

    // 4. Sidebar navigation click events
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            if (target) switchSection(target);
            
            // Close mobile drawer on item select
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && overlay) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });

    // 4b. Mobile Sidebar Drawer controls
    const menuBtn = document.getElementById('dashboard-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (menuBtn && sidebar && overlay) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // 5. Logout event
    document.getElementById('sidebar-logout').addEventListener('click', () => {
        showConfirmModal(
            'Confirm Logout',
            'Are you sure you want to end your session? This is recommended if you are on a shared computer lab PC.',
            async () => {
                await window.supabaseClient.auth.signOut();
                window.location.href = 'home';
            }
        );
    });

    // 6. Keyboard Shortcuts Listeners
    setupKeyboardShortcuts();
}

// Update the user details in top navbar
function updateUserProfileNav(user) {
    const greetingEl = document.getElementById('navbar-greeting');
    const avatarEl = document.getElementById('nav-user-avatar');
    
    const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
    greetingEl.textContent = `Welcome back, ${displayName}!`;

    // Set avatar initials or profile photo
    if (user.user_metadata?.avatar_url) {
        avatarEl.innerHTML = `<img src="${user.user_metadata.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
        const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatarEl.textContent = initials || "CV";
    }

    // Also populate profile tab elements if they exist
    const pNameText = document.getElementById('profile-name-text');
    const pNameInput = document.getElementById('profile-name-input');
    const pEmailText = document.getElementById('profile-email-text');
    const pJoinedText = document.getElementById('profile-joined-text');
    const pAvatarDisplay = document.getElementById('profile-avatar-display');

    if (pNameText) pNameText.textContent = displayName;
    if (pNameInput) pNameInput.value = displayName;
    if (pEmailText) pEmailText.textContent = user.email;
    if (pJoinedText) {
        const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        pJoinedText.textContent = `Joined: ${joinedDate}`;
    }
    if (pAvatarDisplay) {
        if (user.user_metadata?.avatar_url) {
            pAvatarDisplay.innerHTML = `<img src="${user.user_metadata.avatar_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            pAvatarDisplay.textContent = initials || "CV";
        }
    }
}
window.updateUserProfileNav = updateUserProfileNav;

// Sum files in DB to calculate storage limit progress (Max 100MB)
async function updateStorageStats() {
    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return 0;

        const { data, error } = await window.supabaseClient
            .from('files')
            .select('size');

        if (error) throw error;

        // Calculate total size in bytes
        const totalBytes = data.reduce((acc, curr) => acc + parseInt(curr.size || 0), 0);
        const maxBytes = 100 * 1024 * 1024; // 100 MB
        const percent = Math.min(100, Math.round((totalBytes / maxBytes) * 100));

        // Update Nav UI
        document.getElementById('nav-storage-percent').textContent = `${percent}%`;
        document.getElementById('nav-storage-fill').style.width = `${percent}%`;
        document.getElementById('nav-storage-bytes').textContent = `${formatBytes(totalBytes)} of 100 MB`;

        return totalBytes;
    } catch (err) {
        console.error("Error calculating storage usage:", err);
        return 0;
    }
}
window.updateStorageStats = updateStorageStats;

// Update Overview tab stats cards and recent lists
async function updateOverviewStats() {
    try {
        // Query counts
        const filesQuery = window.supabaseClient.from('files').select('id, filename, created_at, file_type, size', { count: 'exact' });
        const notesQuery = window.supabaseClient.from('notes').select('id', { count: 'exact' });
        const sharesQuery = window.supabaseClient.from('share_codes').select('id', { count: 'exact' }).gt('expires_at', new Date().toISOString());

        const [filesRes, notesRes, sharesRes] = await Promise.all([filesQuery, notesQuery, sharesQuery]);

        // Update count text
        if (!filesRes.error) document.getElementById('stat-files-count').textContent = filesRes.count;
        if (!notesRes.error) document.getElementById('stat-notes-count').textContent = notesRes.count;
        if (!sharesRes.error) document.getElementById('stat-shares-count').textContent = sharesRes.count;

        // Update recent activity list on dashboard
        const activityContainer = document.getElementById('dashboard-recent-activity');
        if (filesRes.data && filesRes.data.length > 0) {
            // Sort by newest
            const sortedFiles = filesRes.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
            activityContainer.innerHTML = '';
            sortedFiles.forEach(file => {
                const activityItem = document.createElement('div');
                activityItem.className = 'glass-card';
                activityItem.style.cssText = 'padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; font-size: 13px;';
                
                const timeStr = new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = new Date(file.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

                activityItem.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        <i data-lucide="file-text" style="width: 16px; height: 16px; color: var(--accent); flex-shrink: 0;"></i>
                        <span style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.filename}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px; color: var(--text-muted); font-size: 11px;">
                        <span>${formatBytes(file.size)}</span>
                        <span>${dateStr}, ${timeStr}</span>
                    </div>
                `;
                activityContainer.appendChild(activityItem);
            });
            if (window.lucide) window.lucide.createIcons();
        } else {
            activityContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px 0;">
                    No recent uploads. Use the "Send to Server" tab to start!
                </div>
            `;
        }
    } catch (err) {
        console.error("Error setting overview stats:", err);
    }
}
window.updateOverviewStats = updateOverviewStats;

// Setup Keyboard shortcuts
function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        // 1. CTRL + U -> Focus Upload Section
        if (e.ctrlKey && e.key.toLowerCase() === 'u') {
            e.preventDefault();
            switchSection('upload-tab');
            window.showToast('Navigated to Send to Server (CTRL+U)', 'info');
        }

        // 2. CTRL + K -> Focus Vault Search
        if (e.ctrlKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            switchSection('vault-tab');
            const searchInput = document.getElementById('vault-search-input');
            if (searchInput) {
                searchInput.focus();
                window.showToast('Search input focused (CTRL+K)', 'info');
            }
        }

        // 3. CTRL + SHIFT + V (or CTRL+Alt+V since shift-v is sometimes system reserved) -> Quick Paste Note
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            const modal = document.getElementById('quick-paste-modal');
            const textarea = document.getElementById('quick-paste-textarea');
            if (modal && textarea) {
                modal.classList.add('active');
                textarea.value = '';
                textarea.focus();
                // Attempt to read clipboard if permitted
                navigator.clipboard.readText().then(text => {
                    if (text) textarea.value = text;
                }).catch(() => {
                    // Fail silently, user can paste manually
                });
            }
        }
    });
}

// Utility to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
window.formatBytes = formatBytes;

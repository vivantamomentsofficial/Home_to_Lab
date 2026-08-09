/* CloudVault Files Manager */

document.addEventListener('DOMContentLoaded', () => {
    const checkDb = setInterval(() => {
        if (window.supabaseClient) {
            clearInterval(checkDb);
            setupFilesManager();
        }
    }, 100);
    setTimeout(() => clearInterval(checkDb), 10000);
});

// Cache variables
let cachedFiles = [];
window.activeLayout = 'grid'; // 'grid' or 'list'
let activeFilter = 'all';

function setupFilesManager() {
    const searchInput = document.getElementById('vault-search-input');
    const sortSelect = document.getElementById('vault-sort-select');
    const layoutToggle = document.getElementById('layout-toggle-btn');
    const filterTags = document.querySelectorAll('.filter-tag');

    // Load initial layout preference
    window.activeLayout = localStorage.getItem('CLOUDVAULT_DEFAULT_LAYOUT') || 'grid';
    updateLayoutToggleIcon();

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterAndRenderFiles();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            filterAndRenderFiles();
        });
    }

    if (layoutToggle) {
        layoutToggle.addEventListener('click', () => {
            window.activeLayout = window.activeLayout === 'grid' ? 'list' : 'grid';
            updateLayoutToggleIcon();
            filterAndRenderFiles();
        });
    }

    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            activeFilter = tag.getAttribute('data-filter');
            filterAndRenderFiles();
        });
    });

    // Close options dropdown on clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.file-options-trigger') && !e.target.closest('.file-options-menu')) {
            document.querySelectorAll('.file-options-menu').forEach(m => m.classList.remove('active'));
        }
    });

    // Share code copy button click
    const shareCopyBtn = document.getElementById('share-code-copy-btn');
    if (shareCopyBtn) {
        shareCopyBtn.addEventListener('click', () => {
            const code = document.getElementById('share-code-display').textContent;
            navigator.clipboard.writeText(code)
                .then(() => window.showToast("Sharing code copied to clipboard!", "success"))
                .catch(() => window.showToast("Failed to copy code.", "danger"));
        });
    }

    // Code Preview Modal Copy button click
    const codePreviewCopy = document.getElementById('preview-code-copy');
    if (codePreviewCopy) {
        codePreviewCopy.addEventListener('click', () => {
            const codeText = document.getElementById('preview-code-tag').textContent;
            navigator.clipboard.writeText(codeText)
                .then(() => window.showToast("File contents copied!", "success"))
                .catch(() => window.showToast("Failed to copy text.", "danger"));
        });
    }
}

function updateLayoutToggleIcon() {
    const icon = document.getElementById('layout-toggle-icon');
    if (icon) {
        if (window.activeLayout === 'grid') {
            icon.setAttribute('data-lucide', 'list');
        } else {
            icon.setAttribute('data-lucide', 'grid');
        }
        if (window.lucide) window.lucide.createIcons();
    }
}

// Fetch files from Supabase
async function loadVaultFiles() {
    const skeleton = document.getElementById('vault-loading');
    const container = document.getElementById('vault-files-container');
    const emptyState = document.getElementById('vault-empty-state');

    if (!container) return;

    skeleton.classList.remove('hidden');
    container.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error("No user session found");

        const { data, error } = await window.supabaseClient
            .from('files')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        cachedFiles = data;
        filterAndRenderFiles();

    } catch (err) {
        console.error("Error loading files:", err);
        window.showToast("Failed to retrieve vault files.", "danger");
    } finally {
        skeleton.classList.add('hidden');
    }
}
window.loadVaultFiles = loadVaultFiles;

// Filter, Sort and Render Files cache
function filterAndRenderFiles() {
    const container = document.getElementById('vault-files-container');
    const emptyState = document.getElementById('vault-empty-state');
    const searchVal = document.getElementById('vault-search-input').value.trim().toLowerCase();
    const sortVal = document.getElementById('vault-sort-select').value;

    if (!container) return;

    container.innerHTML = '';

    // 1. Apply Filter
    let filtered = cachedFiles;
    if (activeFilter !== 'all') {
        filtered = cachedFiles.filter(f => f.file_type === activeFilter);
    }

    // 2. Apply Search
    if (searchVal) {
        filtered = filtered.filter(f => 
            f.filename.toLowerCase().includes(searchVal) ||
            f.file_type.toLowerCase().includes(searchVal) ||
            new Date(f.created_at).toLocaleDateString().includes(searchVal)
        );
    }

    // 3. Apply Sort
    if (sortVal === 'newest') {
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortVal === 'oldest') {
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortVal === 'name') {
        filtered.sort((a, b) => a.filename.localeCompare(b.filename));
    } else if (sortVal === 'size') {
        filtered.sort((a, b) => b.size - a.size);
    }

    // Toggle Empty State
    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        container.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    // Toggle container classes based on layout
    if (window.activeLayout === 'grid') {
        container.className = 'files-grid';
    } else {
        container.className = 'files-list';
    }

    // 4. Render Items
    filtered.forEach(file => {
        if (window.activeLayout === 'grid') {
            renderGridCard(container, file);
        } else {
            renderListItem(container, file);
        }
    });

    if (window.lucide) window.lucide.createIcons();
}

// Render Grid Card
function renderGridCard(container, file) {
    const card = document.createElement('div');
    card.className = 'glass-card file-card scale-up';
    card.id = `file-${file.id}`;

    // Get matching Lucide icon based on type
    const iconName = getFileIcon(file.file_type);
    const dateStr = new Date(file.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
    const typeClass = `file-type-${file.file_type || 'default'}`;

    card.innerHTML = `
        <button class="file-options-trigger" onclick="toggleFileMenu(event, '${file.id}')">
            <i data-lucide="more-vertical" style="width: 16px; height: 16px;"></i>
        </button>
        <div class="file-options-menu" id="menu-${file.id}">
            <button class="menu-item" onclick="previewFile('${file.id}')"><i data-lucide="eye" style="width: 14px; height: 14px;"></i> Preview</button>
            <button class="menu-item" onclick="downloadFile('${file.id}')"><i data-lucide="download" style="width: 14px; height: 14px;"></i> Download</button>
            <button class="menu-item" onclick="generateShareCode('${file.id}')"><i data-lucide="share-2" style="width: 14px; height: 14px;"></i> Share Code</button>
            <button class="menu-item" onclick="renameFile('${file.id}')"><i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Rename</button>
            <button class="menu-item danger" onclick="deleteFile('${file.id}')"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete</button>
        </div>
        <div class="file-icon-wrapper ${typeClass}" onclick="previewFile('${file.id}')" style="cursor: pointer;">
            <i data-lucide="${iconName}" style="width: 40px; height: 40px; color: inherit;"></i>
        </div>
        <div class="file-details">
            <div class="file-name" onclick="previewFile('${file.id}')" title="${file.filename}">${file.filename}</div>
            <div class="file-meta">
                <span>${window.formatBytes(file.size)}</span>
                <span>${dateStr}</span>
            </div>
        </div>
    `;

    container.appendChild(card);
}

// Render List Item
function renderListItem(container, file) {
    const item = document.createElement('div');
    item.className = 'glass-card file-list-item scale-up';
    item.id = `file-${file.id}`;

    const iconName = getFileIcon(file.file_type);
    const dateStr = new Date(file.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const typeClass = `file-type-${file.file_type || 'default'}`;

    item.innerHTML = `
        <div class="file-list-left">
            <div class="file-list-icon ${typeClass}" style="width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: inherit; flex-shrink: 0;">
                <i data-lucide="${iconName}" style="width: 18px; height: 18px; color: inherit;"></i>
            </div>
            <div class="file-list-name" onclick="previewFile('${file.id}')" title="${file.filename}">${file.filename}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 30px;">
            <div class="file-list-meta">
                <span style="width: 80px; text-align: right;">${window.formatBytes(file.size)}</span>
                <span>${dateStr}</span>
            </div>
            <div style="position: relative;">
                <button class="btn btn-secondary" onclick="toggleFileMenu(event, '${file.id}')" style="padding: 6px 10px;">
                    <i data-lucide="more-horizontal" style="width: 16px; height: 16px;"></i>
                </button>
                <div class="file-options-menu" id="menu-${file.id}" style="top: 36px; right: 0;">
                    <button class="menu-item" onclick="previewFile('${file.id}')"><i data-lucide="eye" style="width: 14px; height: 14px;"></i> Preview</button>
                    <button class="menu-item" onclick="downloadFile('${file.id}')"><i data-lucide="download" style="width: 14px; height: 14px;"></i> Download</button>
                    <button class="menu-item" onclick="generateShareCode('${file.id}')"><i data-lucide="share-2" style="width: 14px; height: 14px;"></i> Share Code</button>
                    <button class="menu-item" onclick="renameFile('${file.id}')"><i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Rename</button>
                    <button class="menu-item danger" onclick="deleteFile('${file.id}')"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete</button>
                </div>
            </div>
        </div>
    `;

    container.appendChild(item);
}

// Toggle options menu dropdown visibility
function toggleFileMenu(event, fileId) {
    event.stopPropagation();
    
    // Close other menus
    document.querySelectorAll('.file-options-menu').forEach(menu => {
        if (menu.id !== `menu-${fileId}`) {
            menu.classList.remove('active');
        }
    });

    const targetMenu = document.getElementById(`menu-${fileId}`);
    if (targetMenu) {
        targetMenu.classList.toggle('active');
    }
}
window.toggleFileMenu = toggleFileMenu;

// File Actions Handlers

// 1. Download file using temporary signed URL
async function downloadFile(id) {
    const file = cachedFiles.find(f => f.id === id);
    if (!file) return;

    window.showToast("Preparing download link...", "info");

    try {
        const { data, error } = await window.supabaseClient.storage
            .from('vault')
            .createSignedUrl(file.storage_path, 300); // 5 min expiry

        if (error) throw error;

        // Trigger browser download link
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        window.showToast("Downloading started!", "success");
    } catch (err) {
        console.error("Download error:", err);
        window.showToast("Failed to download file.", "danger");
    }
}
window.downloadFile = downloadFile;

// 2. Rename File metadata in Database
async function renameFile(id) {
    const file = cachedFiles.find(f => f.id === id);
    if (!file) return;

    const extension = file.filename.split('.').pop();
    const nameWithoutExt = file.filename.substring(0, file.filename.lastIndexOf('.'));

    const newNameWithoutExt = prompt("Enter new filename:", nameWithoutExt);
    if (newNameWithoutExt === null || newNameWithoutExt.trim() === "") return;

    const finalFilename = `${newNameWithoutExt.trim()}.${extension}`;

    try {
        const { error } = await window.supabaseClient
            .from('files')
            .update({ filename: finalFilename })
            .eq('id', id);

        if (error) throw error;

        window.showToast("File renamed successfully!", "success");
        loadVaultFiles();
        window.updateOverviewStats();
    } catch (err) {
        console.error("Rename error:", err);
        window.showToast("Failed to rename file.", "danger");
    }
}
window.renameFile = renameFile;

// 3. Delete File from DB & Storage
async function deleteFile(id) {
    const file = cachedFiles.find(f => f.id === id);
    if (!file) return;

    window.showConfirmModal(
        "Delete File",
        `Are you sure you want to delete "${file.filename}"? This will permanently erase it from our cloud storage.`,
        async () => {
            window.showToast("Deleting file...", "info");
            try {
                // Delete from Supabase Storage
                const { error: storageError } = await window.supabaseClient.storage
                    .from('vault')
                    .remove([file.storage_path]);

                if (storageError) throw storageError;

                // Delete from DB files table
                const { error: dbError } = await window.supabaseClient
                    .from('files')
                    .delete()
                    .eq('id', id);

                if (dbError) throw dbError;

                window.showToast(`Deleted "${file.filename}" successfully.`, "success");
                loadVaultFiles();
                window.updateStorageStats();
                window.updateOverviewStats();
            } catch (err) {
                console.error("Deletion error:", err);
                window.showToast("Failed to delete file.", "danger");
            }
        }
    );
}
window.deleteFile = deleteFile;

// 4. Generate 6-digit Sharing Code (expiring in 30 minutes)
async function generateShareCode(id) {
    const file = cachedFiles.find(f => f.id === id);
    if (!file) return;

    window.showToast("Generating secure sharing code...", "info");

    try {
        // Step 1: Create a signed URL valid for 30 minutes (1800 seconds)
        const { data, error } = await window.supabaseClient.storage
            .from('vault')
            .createSignedUrl(file.storage_path, 1800);

        if (error) throw error;

        // Step 2: Generate random 6-digit code
        let shareCode = "";
        let codeExists = true;
        let attempts = 0;

        // Double check uniqueness of code
        while (codeExists && attempts < 10) {
            shareCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            const { data: checkData } = await window.supabaseClient
                .from('share_codes')
                .select('id')
                .eq('code', shareCode)
                .gt('expires_at', new Date().toISOString());
            
            if (!checkData || checkData.length === 0) {
                codeExists = false;
            }
            attempts++;
        }

        const expiryTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes later

        // Step 3: Insert into share_codes table
        const { error: dbError } = await window.supabaseClient
            .from('share_codes')
            .insert({
                code: shareCode,
                file_id: id,
                signed_url: data.signedUrl,
                expires_at: expiryTime.toISOString()
            });

        if (dbError) throw dbError;

        // Step 4: Show Code generation modal
        document.getElementById('share-code-display').textContent = shareCode;
        document.getElementById('share-code-modal').classList.add('active');

        // Real-time expiry countdown
        const expiryEl = document.getElementById('share-code-expiry');
        if (expiryEl) {
            if (window.dashboardShareInterval) clearInterval(window.dashboardShareInterval);
            
            function updateDashboardTimer() {
                const msLeft = expiryTime - new Date();
                if (msLeft <= 0) {
                    clearInterval(window.dashboardShareInterval);
                    expiryEl.textContent = "EXPIRES IN: EXPIRED";
                    expiryEl.style.color = "var(--danger)";
                } else {
                    const totalSecs = Math.floor(msLeft / 1000);
                    const mins = Math.floor(totalSecs / 60);
                    const secs = totalSecs % 60;
                    expiryEl.textContent = `EXPIRES IN: ${mins}m ${secs}s`;
                    expiryEl.style.color = "var(--warning)";
                }
            }
            updateDashboardTimer();
            window.dashboardShareInterval = setInterval(updateDashboardTimer, 1000);
        }

        window.updateOverviewStats();

    } catch (err) {
        console.error("Share code generation error:", err);
        window.showToast("Failed to generate share code.", "danger");
    }
}
window.generateShareCode = generateShareCode;

// 5. Preview File lightbox
async function previewFile(id) {
    const file = cachedFiles.find(f => f.id === id);
    if (!file) return;

    // A. Preview Image
    if (file.file_type === 'image') {
        window.showToast("Loading image preview...", "info");
        try {
            const { data, error } = await window.supabaseClient.storage
                .from('vault')
                .createSignedUrl(file.storage_path, 300);

            if (error) throw error;

            document.getElementById('preview-image-title').textContent = file.filename;
            document.getElementById('preview-img-tag').src = data.signedUrl;
            document.getElementById('preview-image-modal').classList.add('active');
        } catch (e) {
            window.showToast("Failed to render image preview.", "danger");
        }
    } 
    // B. Preview PDF (open in a new window with signed URL directly for PDF browser viewing)
    else if (file.file_type === 'document' && file.filename.toLowerCase().endsWith('.pdf')) {
        window.showToast("Loading document in viewer...", "info");
        try {
            const { data, error } = await window.supabaseClient.storage
                .from('vault')
                .createSignedUrl(file.storage_path, 600);

            if (error) throw error;
            window.open(data.signedUrl, '_blank');
        } catch (e) {
            window.showToast("Failed to load PDF viewer.", "danger");
        }
    } 
    // C. Preview Text/Code content inside a scrolling textbox modal
    else if (file.file_type === 'text' || file.file_type === 'code') {
        window.showToast("Loading text content...", "info");
        try {
            const { data, error } = await window.supabaseClient.storage
                .from('vault')
                .download(file.storage_path);

            if (error) throw error;

            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('preview-code-title').textContent = file.filename;
                document.getElementById('preview-code-tag').textContent = e.target.result;
                document.getElementById('preview-code-modal').classList.add('active');
            };
            reader.readAsText(data);
        } catch (e) {
            window.showToast("Failed to read file contents.", "danger");
        }
    } 
    // D. Fallback: triggers instant download
    else {
        window.showToast("Preview not supported for this file type. Downloading...", "warning");
        downloadFile(id);
    }
}
window.previewFile = previewFile;

// Helper to match file extensions to Lucide icons
function getFileIcon(type) {
    switch (type) {
        case 'image': return 'file-image';
        case 'document': return 'file-text';
        case 'code': return 'file-code';
        case 'text': return 'file-signature';
        case 'zip': return 'file-archive';
        default: return 'file';
    }
}

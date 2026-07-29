/* CloudVault File Upload Controller */

document.addEventListener('DOMContentLoaded', () => {
    const checkDb = setInterval(() => {
        if (window.supabaseClient) {
            clearInterval(checkDb);
            setupFileUploader();
        }
    }, 100);
    setTimeout(() => clearInterval(checkDb), 10000);
});

// Map of active upload abort controllers and files for retry
const activeUploads = {};

function setupFileUploader() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    if (!dropZone || !fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone on drag over
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    // Handle clicked browse file inputs
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

async function handleFiles(files) {
    if (files.length === 0) return;
    
    // Check total free space first
    const totalBytesUsed = await window.updateStorageStats();
    const maxStorage = 100 * 1024 * 1024; // 100MB
    let currentBytesSession = totalBytesUsed;

    const filesArray = Array.from(files);

    for (const file of filesArray) {
        // Validation 1: Individual file size < 100MB
        if (file.size > maxStorage) {
            window.showToast(`Rejected: "${file.name}" exceeds the 100MB limit.`, 'danger');
            continue;
        }

        // Validation 2: Will it exceed the storage allocation?
        if (currentBytesSession + file.size > maxStorage) {
            window.showToast(`Rejected: Uploading "${file.name}" will exceed your 100MB storage limit.`, 'warning');
            continue;
        }

        currentBytesSession += file.size;

        // Generate unique upload ID
        const uploadId = 'up_' + Math.random().toString(36).substr(2, 9);
        
        // Show uploads progress card
        document.getElementById('upload-progress-card').classList.remove('hidden');

        // Create UI progress card
        createUploadProgressItem(uploadId, file);

        // Start Uploading
        startUploadFile(uploadId, file);
    }
}

function createUploadProgressItem(id, file) {
    const container = document.getElementById('active-uploads-list');
    const item = document.createElement('div');
    item.id = id;
    item.className = 'glass-card upload-item';

    item.innerHTML = `
        <div class="upload-file-info">
            <i data-lucide="file" style="width: 24px; height: 24px; color: var(--accent); flex-shrink: 0;"></i>
            <div style="min-width: 0; flex: 1;">
                <div class="upload-file-name" title="${file.name}">${file.name}</div>
                <div class="upload-file-meta" id="meta-${id}">${window.formatBytes(file.size)} &bull; Ready</div>
            </div>
        </div>
        <div class="upload-progress-container" id="progress-container-${id}">
            <div class="upload-progress-bg">
                <div class="upload-progress-fill" id="fill-${id}"></div>
            </div>
            <span style="font-size: 10px; color: var(--text-muted); align-self: flex-end;" id="percent-${id}">0%</span>
        </div>
        <div class="upload-actions" id="actions-${id}">
            <button class="upload-action-btn cancel" onclick="cancelUpload('${id}')" title="Cancel upload">
                <i data-lucide="x-circle" style="width: 18px; height: 18px;"></i>
            </button>
        </div>
    `;

    container.appendChild(item);
    if (window.lucide) window.lucide.createIcons();
}

async function startUploadFile(id, file) {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) {
        window.showToast("Authentication lost. Please login again.", "danger");
        return;
    }

    const abortController = new AbortController();
    activeUploads[id] = {
        controller: abortController,
        file: file,
        status: 'uploading'
    };

    const uniquePrefix = Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const storagePath = `uploads/${user.id}/${uniquePrefix}_${file.name}`;
    
    // Update label to uploading
    const metaEl = document.getElementById(`meta-${id}`);
    if (metaEl) metaEl.innerHTML = `${window.formatBytes(file.size)} &bull; Uploading...`;

    try {
        const { data, error } = await window.supabaseClient.storage
            .from('vault')
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false,
                signal: abortController.signal,
                onUploadProgress: (progress) => {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    const fillEl = document.getElementById(`fill-${id}`);
                    const percentEl = document.getElementById(`percent-${id}`);
                    if (fillEl) fillEl.style.width = `${percent}%`;
                    if (percentEl) percentEl.textContent = `${percent}%`;
                }
            });

        if (error) throw error;

        // DB Registration
        // Derive file general type category
        const fileCategory = getFileCategory(file.name, file.type);

        const { error: dbError } = await window.supabaseClient
            .from('files')
            .insert({
                user_id: user.id,
                filename: file.name,
                storage_path: storagePath,
                file_type: fileCategory,
                size: file.size
            });

        if (dbError) throw dbError;

        // On Success
        if (metaEl) metaEl.innerHTML = `<span style="color: var(--success); font-weight: 600;">Completed</span>`;
        document.getElementById(`progress-container-${id}`).style.visibility = 'hidden';
        document.getElementById(`actions-${id}`).innerHTML = `
            <span style="color: var(--success);"><i data-lucide="check-circle" style="width: 20px; height: 20px;"></i></span>
        `;
        if (window.lucide) window.lucide.createIcons();

        // Refresh stats
        window.updateStorageStats();
        window.updateOverviewStats();

        // Clear active upload item card after 3 seconds
        setTimeout(() => {
            const item = document.getElementById(id);
            if (item) item.remove();
            
            // Hide progress container card if empty
            const list = document.getElementById('active-uploads-list');
            if (list && list.children.length === 0) {
                document.getElementById('upload-progress-card').classList.add('hidden');
            }
        }, 3000);

        window.showToast(`Uploaded "${file.name}" successfully!`, 'success');

    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Upload aborted successfully');
            return;
        }

        console.error("Upload error details:", err);
        
        // Show Retry UI
        if (metaEl) metaEl.innerHTML = `<span style="color: var(--danger);">${err.message || 'Network failed'}</span>`;
        const fillEl = document.getElementById(`fill-${id}`);
        if (fillEl) fillEl.style.backgroundColor = 'var(--danger)';
        
        document.getElementById(`actions-${id}`).innerHTML = `
            <button class="upload-action-btn" onclick="retryUpload('${id}')" title="Retry upload" style="color: var(--accent);">
                <i data-lucide="rotate-ccw" style="width: 18px; height: 18px;"></i>
            </button>
            <button class="upload-action-btn cancel" onclick="removeProgressItem('${id}')" title="Dismiss" style="color: var(--text-muted);">
                <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
            </button>
        `;
        if (window.lucide) window.lucide.createIcons();
        
        window.showToast(`Upload failed for "${file.name}".`, 'danger');
    }
}

// Cancel handler
function cancelUpload(id) {
    if (activeUploads[id] && activeUploads[id].controller) {
        activeUploads[id].controller.abort();
        activeUploads[id].status = 'cancelled';
        
        const metaEl = document.getElementById(`meta-${id}`);
        if (metaEl) metaEl.innerHTML = `<span style="color: var(--text-muted);">Cancelled</span>`;
        
        const fillEl = document.getElementById(`fill-${id}`);
        if (fillEl) fillEl.style.backgroundColor = 'var(--text-muted)';
        
        document.getElementById(`actions-${id}`).innerHTML = `
            <button class="upload-action-btn" onclick="retryUpload('${id}')" title="Retry upload" style="color: var(--accent);">
                <i data-lucide="rotate-ccw" style="width: 18px; height: 18px;"></i>
            </button>
            <button class="upload-action-btn cancel" onclick="removeProgressItem('${id}')" title="Dismiss" style="color: var(--text-muted);">
                <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
            </button>
        `;
        if (window.lucide) window.lucide.createIcons();
        window.showToast("Upload cancelled.", "warning");
    }
}
window.cancelUpload = cancelUpload;

// Retry handler
function retryUpload(id) {
    if (activeUploads[id] && activeUploads[id].file) {
        // Reset UI progress states
        const fillEl = document.getElementById(`fill-${id}`);
        if (fillEl) {
            fillEl.style.width = '0%';
            fillEl.style.backgroundColor = 'var(--primary)';
        }
        
        const percentEl = document.getElementById(`percent-${id}`);
        if (percentEl) percentEl.textContent = '0%';
        
        document.getElementById(`progress-container-${id}`).style.visibility = 'visible';
        document.getElementById(`actions-${id}`).innerHTML = `
            <button class="upload-action-btn cancel" onclick="cancelUpload('${id}')" title="Cancel upload">
                <i data-lucide="x-circle" style="width: 18px; height: 18px;"></i>
            </button>
        `;
        if (window.lucide) window.lucide.createIcons();

        // Restart upload
        startUploadFile(id, activeUploads[id].file);
    }
}
window.retryUpload = retryUpload;

// Remove Item from UI
function removeProgressItem(id) {
    const item = document.getElementById(id);
    if (item) item.remove();
    delete activeUploads[id];

    const list = document.getElementById('active-uploads-list');
    if (list && list.children.length === 0) {
        document.getElementById('upload-progress-card').classList.add('hidden');
    }
}
window.removeProgressItem = removeProgressItem;

// Helper to categorize files
function getFileCategory(filename, mimeType) {
    const ext = filename.split('.').pop().toLowerCase();
    
    // Images
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    if (imageExts.includes(ext) || mimeType.startsWith('image/')) return 'image';

    // Documents
    const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
    if (docExts.includes(ext)) return 'document';

    // Programming Files (Code)
    const codeExts = ['java', 'py', 'html', 'css', 'js', 'json', 'xml', 'cpp', 'c', 'sh', 'sql', 'php', 'ts', 'jsx', 'tsx'];
    if (codeExts.includes(ext)) return 'code';

    // Text Files
    const txtExts = ['txt', 'md', 'csv', 'log'];
    if (txtExts.includes(ext) || mimeType.startsWith('text/')) return 'text';

    // ZIP / Archives
    const zipExts = ['zip', 'rar', 'tar', 'gz', '7z'];
    if (zipExts.includes(ext)) return 'zip';

    // Default other
    return 'other';
}

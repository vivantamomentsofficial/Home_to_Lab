/* CloudVault Quick Text & Clipboard Handler */

document.addEventListener('DOMContentLoaded', () => {
    const checkDb = setInterval(() => {
        if (window.supabaseClient) {
            clearInterval(checkDb);
            setupClipboard();
        }
    }, 100);
    setTimeout(() => clearInterval(checkDb), 10000);
});

// Cache for search
let cachedNotes = [];

function setupClipboard() {
    const noteForm = document.getElementById('note-form');
    const noteSearchInput = document.getElementById('note-search-input');
    const noteClearBtn = document.getElementById('note-clear-btn');

    const quickPasteSaveBtn = document.getElementById('quick-paste-save-btn');
    const quickPasteTextarea = document.getElementById('quick-paste-textarea');

    if (noteForm) {
        noteForm.addEventListener('submit', handleNoteSubmit);
    }

    if (noteSearchInput) {
        noteSearchInput.addEventListener('input', () => {
            renderQuickNotes(cachedNotes, noteSearchInput.value.trim());
        });
    }

    if (noteClearBtn) {
        noteClearBtn.addEventListener('click', clearNoteForm);
    }

    // Quick Paste Modal Save
    if (quickPasteSaveBtn && quickPasteTextarea) {
        quickPasteSaveBtn.addEventListener('click', handleQuickPasteSave);
    }
}

// 1. Submit Note (Create/Update)
async function handleNoteSubmit(e) {
    e.preventDefault();

    const noteId = document.getElementById('note-id').value;
    const title = document.getElementById('note-title-input').value.trim();
    const content = document.getElementById('note-content-input').value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Saving...</span>`;

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error("No user session");

        if (noteId) {
            // Update
            const { error } = await window.supabaseClient
                .from('notes')
                .update({ title, content })
                .eq('id', noteId);

            if (error) throw error;
            window.showToast("Snippet updated successfully!", "success");
        } else {
            // Create
            const { error } = await window.supabaseClient
                .from('notes')
                .insert({
                    user_id: user.id,
                    title,
                    content
                });

            if (error) throw error;
            window.showToast("Snippet saved successfully!", "success");
        }

        clearNoteForm();
        loadQuickNotes();
        window.updateOverviewStats();

    } catch (err) {
        console.error("Note save error:", err);
        window.showToast("Failed to save snippet: " + err.message, "danger");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
    }
}

// 2. Fetch and Load Notes
async function loadQuickNotes() {
    const skeleton = document.getElementById('notes-loading-skeleton');
    const container = document.getElementById('notes-container');
    const emptyState = document.getElementById('notes-empty-state');

    if (!container) return;

    if (skeleton) skeleton.classList.remove('hidden');
    container.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error("No user session found");

        const { data, error } = await window.supabaseClient
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        cachedNotes = data;
        renderQuickNotes(data);

    } catch (err) {
        console.error("Error loading notes:", err);
        window.showToast("Failed to load snippets.", "danger");
    } finally {
        if (skeleton) skeleton.classList.add('hidden');
    }
}
window.loadQuickNotes = loadQuickNotes;

// 3. Render Notes List with optional filtering
function renderQuickNotes(notes, searchVal = "") {
    const container = document.getElementById('notes-container');
    const emptyState = document.getElementById('notes-empty-state');

    if (!container) return;

    container.innerHTML = '';

    // Filter notes locally
    let filtered = notes;
    if (searchVal) {
        const query = searchVal.toLowerCase();
        filtered = notes.filter(n => 
            n.title.toLowerCase().includes(query) || 
            n.content.toLowerCase().includes(query)
        );
    }

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        container.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    filtered.forEach(note => {
        const card = document.createElement('div');
        card.className = 'glass-card note-card scale-up';
        
        const dateStr = new Date(note.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

        card.innerHTML = `
            <div style="min-width:0; display:flex; flex-direction:column; gap:4px; flex:1;">
                <div class="note-title" title="${window.escapeHtml(note.title)}">${window.escapeHtml(note.title)}</div>
                <div class="note-body">${window.escapeHtml(note.content)}</div>
            </div>
            <div class="note-footer">
                <span class="note-date">${dateStr}</span>
                <div class="note-actions">
                    <button class="note-btn" onclick="copyNoteContent('${note.id}')" title="Copy to clipboard">
                        <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="note-btn" onclick="editNote('${note.id}')" title="Edit snippet">
                        <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="note-btn danger" onclick="deleteNote('${note.id}')" title="Delete snippet">
                        <i data-lucide="trash" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
}

// 4. Note Actions
function copyNoteContent(id) {
    const note = cachedNotes.find(n => n.id === id);
    if (note) {
        navigator.clipboard.writeText(note.content)
            .then(() => window.showToast("Copied to system clipboard!", "success"))
            .catch(() => window.showToast("Failed to copy clipboard.", "danger"));
    }
}
window.copyNoteContent = copyNoteContent;

function editNote(id) {
    const note = cachedNotes.find(n => n.id === id);
    if (note) {
        document.getElementById('note-id').value = note.id;
        document.getElementById('note-title-input').value = note.title;
        document.getElementById('note-content-input').value = note.content;

        document.getElementById('note-editor-title').innerHTML = `
            <i data-lucide="edit-3" style="width: 18px; height: 18px; color: var(--accent);"></i>
            Edit Quick Note
        `;
        if (window.lucide) window.lucide.createIcons();
        document.getElementById('note-title-input').focus();
    }
}
window.editNote = editNote;

function deleteNote(id) {
    window.showConfirmModal(
        "Delete Snippet",
        "Are you sure you want to delete this text snippet? This cannot be undone.",
        async () => {
            try {
                const { error } = await window.supabaseClient
                    .from('notes')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                window.showToast("Snippet deleted.", "success");
                loadQuickNotes();
                window.updateOverviewStats();
            } catch (err) {
                console.error("Delete note error:", err);
                window.showToast("Failed to delete snippet.", "danger");
            }
        }
    );
}
window.deleteNote = deleteNote;

function clearNoteForm() {
    document.getElementById('note-id').value = '';
    document.getElementById('note-title-input').value = '';
    document.getElementById('note-content-input').value = '';
    document.getElementById('note-editor-title').innerHTML = `
        <i data-lucide="plus" style="width: 18px; height: 18px; color: var(--accent);"></i>
        Add Quick Note
    `;
    if (window.lucide) window.lucide.createIcons();
}

// 5. CTRL+SHIFT+V Quick Paste Save Handler
async function handleQuickPasteSave() {
    const textarea = document.getElementById('quick-paste-textarea');
    const content = textarea.value;

    if (!content.trim()) {
        window.showToast("Cannot save empty text clipboard.", "warning");
        return;
    }

    const saveBtn = document.getElementById('quick-paste-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error("No active session");

        const timestamp = Date.now();
        const filename = `clipboard_${timestamp}.txt`;
        const storagePath = `uploads/${user.id}/${filename}`;
        
        // Convert content string to a File or Blob object
        const blob = new Blob([content], { type: 'text/plain' });
        const fileObj = new File([blob], filename, { type: 'text/plain' });

        // a. Upload physical txt file to Supabase storage
        const { error: uploadError } = await window.supabaseClient.storage
            .from('vault')
            .upload(storagePath, fileObj, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // b. Create database record in files table
        const { error: fileDbError } = await window.supabaseClient
            .from('files')
            .insert({
                user_id: user.id,
                filename: filename,
                storage_path: storagePath,
                file_type: 'text',
                size: blob.size
            });

        if (fileDbError) throw fileDbError;

        // c. Create database record in notes table for Quick Text view
        const { error: noteDbError } = await window.supabaseClient
            .from('notes')
            .insert({
                user_id: user.id,
                title: `Clipboard Note (${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`,
                content: content
            });

        if (noteDbError) throw noteDbError;

        // Clean up and close modal
        window.closePreviewModal('quick-paste-modal');
        window.showToast("Clipboard saved to files and snippets!", "success");
        
        // Refresh counts and lists
        window.updateStorageStats();
        window.updateOverviewStats();
        if (document.getElementById('vault-tab').classList.contains('active')) {
            if (window.loadVaultFiles) window.loadVaultFiles();
        }
        if (document.getElementById('quicktext-tab').classList.contains('active')) {
            loadQuickNotes();
        }

    } catch (err) {
        console.error("Quick paste error:", err);
        window.showToast("Failed to save clipboard: " + err.message, "danger");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save to Server";
    }
}

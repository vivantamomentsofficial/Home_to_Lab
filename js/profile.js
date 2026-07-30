/* CloudVault Profile Settings Handler */

document.addEventListener('DOMContentLoaded', () => {
    const checkDb = setInterval(() => {
        if (window.supabaseClient) {
            clearInterval(checkDb);
            setupProfile();
        }
    }, 100);
    setTimeout(() => clearInterval(checkDb), 10000);
});

function setupProfile() {
    const detailsForm = document.getElementById('profile-details-form');
    const changePassForm = document.getElementById('change-password-form');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    
    const avatarTrigger = document.getElementById('avatar-upload-trigger');
    const avatarInput = document.getElementById('avatar-file-input');

    if (detailsForm) {
        detailsForm.addEventListener('submit', handleNameUpdate);
    }

    if (changePassForm) {
        changePassForm.addEventListener('submit', handlePasswordUpdate);
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', handleAccountDecline);
    }

    // Avatar upload trigger bindings
    if (avatarTrigger && avatarInput) {
        avatarTrigger.addEventListener('click', () => avatarInput.click());
        avatarInput.addEventListener('change', handleAvatarUpload);
    }
}

// 1. Update Display Name
async function handleNameUpdate(e) {
    e.preventDefault();

    const nameInput = document.getElementById('profile-name-input');
    const name = nameInput.value.trim();

    if (!name) {
        window.showToast("Name cannot be empty.", "warning");
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";

    try {
        const { data, error } = await window.supabaseClient.auth.updateUser({
            data: { full_name: name }
        });

        if (error) throw error;

        window.showToast("Display name updated!", "success");
        
        // Refresh navbar immediately
        if (window.updateUserProfileNav) {
            window.updateUserProfileNav(data.user);
        }

    } catch (err) {
        console.error("Name update error:", err);
        window.showToast("Failed to update profile name.", "danger");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
    }
}

// 2. Update Password
async function handlePasswordUpdate(e) {
    e.preventDefault();

    const passInput = document.getElementById('change-pass-input');
    const passConfirm = document.getElementById('change-pass-confirm');

    const pass = passInput.value;
    const confirm = passConfirm.value;

    if (pass !== confirm) {
        window.showToast("Passwords do not match!", "warning");
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";

    try {
        const { error } = await window.supabaseClient.auth.updateUser({
            password: pass
        });

        if (error) throw error;

        window.showToast("Password updated successfully!", "success");
        passInput.value = '';
        passConfirm.value = '';

    } catch (err) {
        console.error("Password update error:", err);
        window.showToast("Failed to update password: " + err.message, "danger");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
    }
}

// 3. User Avatar Upload (Private storage with signed url resolution)
async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (< 2MB)
    if (file.size > 2 * 1024 * 1024) {
        window.showToast("Avatar image must be smaller than 2MB.", "warning");
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        window.showToast("Selected file must be an image.", "warning");
        return;
    }

    window.showToast("Uploading avatar...", "info");

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error("No session");

        const ext = file.name.split('.').pop().toLowerCase();
        const avatarPath = `avatars/${user.id}/avatar_${Date.now()}.${ext}`;

        // Upload avatar image to private storage bucket 'vault'
        const { error: uploadError } = await window.supabaseClient.storage
            .from('vault')
            .upload(avatarPath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Update user metadata with the storage path
        const { data: updateData, error: updateError } = await window.supabaseClient.auth.updateUser({
            data: { avatar_url: avatarPath }
        });

        if (updateError) throw updateError;

        window.showToast("Profile picture updated!", "success");

        // Resolve and display avatar
        if (window.updateUserProfileNav) {
            // Re-render UI with new profile
            const avatarEl = document.getElementById('nav-user-avatar');
            const pAvatarDisplay = document.getElementById('profile-avatar-display');

            const { data: signedData } = await window.supabaseClient.storage
                .from('vault')
                .createSignedUrl(avatarPath, 3600);

            if (signedData) {
                avatarEl.innerHTML = `<img src="${signedData.signedUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
                if (pAvatarDisplay) {
                    pAvatarDisplay.innerHTML = `<img src="${signedData.signedUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                }
            }
        }

    } catch (err) {
        console.error("Avatar upload error:", err);
        window.showToast("Failed to upload avatar.", "danger");
    }
}

// 4. Wipe Data and Logout (Account Deletion Bypass)
function handleAccountDecline() {
    window.showConfirmModal(
        "Wipe Account and Delete Profile",
        "WARNING: This will permanently delete ALL your files from storage and wipe all database snippets. You will be logged out immediately. This cannot be undone.",
        async () => {
            window.showToast("Wiping user data...", "info");
            
            try {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (!user) return;

                // A. Retrieve all file metadata to delete storage files
                const { data: files } = await window.supabaseClient
                    .from('files')
                    .select('storage_path');

                if (files && files.length > 0) {
                    const paths = files.map(f => f.storage_path);
                    
                    // Remove physical files from storage
                    await window.supabaseClient.storage
                        .from('vault')
                        .remove(paths);
                }

                // Delete avatar from storage if exists
                if (user.user_metadata?.avatar_url) {
                    await window.supabaseClient.storage
                        .from('vault')
                        .remove([user.user_metadata.avatar_url]);
                }

                // B. Delete files from DB (cascade deletes share_codes)
                await window.supabaseClient
                    .from('files')
                    .delete()
                    .eq('user_id', user.id);

                // C. Delete notes from DB
                await window.supabaseClient
                    .from('notes')
                    .delete()
                    .eq('user_id', user.id);

                window.showToast("Data wiped! Logging out...", "success");

                // D. Sign out and redirect
                setTimeout(async () => {
                    await window.supabaseClient.auth.signOut();
                    window.location.href = 'register';
                }, 1500);

            } catch (err) {
                console.error("Wipe account error:", err);
                window.showToast("Error occurred while deleting account data.", "danger");
            }
        }
    );
}

/* CloudVault Application Settings & Idle Session Handler */

document.addEventListener('DOMContentLoaded', () => {
    // Apply theme immediately on load
    applySavedTheme();

    // Initialize server load warning modal on page load
    initServerLoadWarning();

    const checkDb = setInterval(() => {
        if (window.supabaseClient) {
            clearInterval(checkDb);
            setupSettings();
        }
    }, 100);
    setTimeout(() => clearInterval(checkDb), 10000);
});

// Global state variables
let idleTimer = null;
let idleMins = 15; // Default 15 minutes

function setupSettings() {
    const themeDarkBtn = document.getElementById('theme-dark-btn');
    const themeLightBtn = document.getElementById('theme-light-btn');
    const autoLogoutSelect = document.getElementById('setting-auto-logout');
    const defaultLayoutSelect = document.getElementById('setting-default-layout');
    const languageSelect = document.getElementById('setting-language');

    // 1. Load settings from localStorage
    const savedTheme = localStorage.getItem('CLOUDVAULT_THEME') || 'light';
    toggleThemeButtons(savedTheme);

    const savedIdleMins = localStorage.getItem('CLOUDVAULT_IDLE_MINS');
    if (savedIdleMins !== null) {
        idleMins = parseInt(savedIdleMins);
        if (autoLogoutSelect) autoLogoutSelect.value = idleMins.toString();
    }

    const savedLayout = localStorage.getItem('CLOUDVAULT_DEFAULT_LAYOUT') || 'grid';
    if (defaultLayoutSelect) defaultLayoutSelect.value = savedLayout;

    // 2. Set Up Event Listeners
    if (themeDarkBtn && themeLightBtn) {
        themeDarkBtn.addEventListener('click', () => {
            setTheme('dark');
        });
        themeLightBtn.addEventListener('click', () => {
            setTheme('light');
        });
    }

    if (autoLogoutSelect) {
        autoLogoutSelect.addEventListener('change', (e) => {
            const mins = parseInt(e.target.value);
            localStorage.setItem('CLOUDVAULT_IDLE_MINS', mins);
            idleMins = mins;
            window.showToast(`Auto Logout set to ${mins === 0 ? 'Disabled' : mins + ' minutes'}.`, "success");
            resetIdleTimer();
        });
    }

    if (defaultLayoutSelect) {
        defaultLayoutSelect.addEventListener('change', (e) => {
            const layout = e.target.value;
            localStorage.setItem('CLOUDVAULT_DEFAULT_LAYOUT', layout);
            window.showToast(`Default layout changed to ${layout.toUpperCase()}`, "success");
            // If we are currently in vault view, re-render
            if (window.filterAndRenderFiles) {
                // Update local layouts variable in files.js
                window.activeLayout = layout;
                window.filterAndRenderFiles();
            }
        });
    }

    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            window.showToast(`Language changed to ${languageSelect.options[languageSelect.selectedIndex].text}`, "success");
        });
    }

    // 3. Start Inactivity Monitor
    initInactivityMonitor();
}

// Theme handling
function applySavedTheme() {
    const savedTheme = localStorage.getItem('CLOUDVAULT_THEME') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function setTheme(theme) {
    localStorage.setItem('CLOUDVAULT_THEME', theme);
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    toggleThemeButtons(theme);
    window.showToast(`Theme changed to ${theme === 'dark' ? 'Dark' : 'Light'} mode`, "success");
}

function toggleThemeButtons(theme) {
    const darkBtn = document.getElementById('theme-dark-btn');
    const lightBtn = document.getElementById('theme-light-btn');
    if (!darkBtn || !lightBtn) return;

    if (theme === 'dark') {
        darkBtn.classList.add('active');
        lightBtn.classList.remove('active');
    } else {
        lightBtn.classList.add('active');
        darkBtn.classList.remove('active');
    }
}

// Inactivity Monitor (Auto Logout)
function initInactivityMonitor() {
    // List of interaction events
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    
    events.forEach(eventName => {
        document.addEventListener(eventName, resetIdleTimer, true);
    });

    resetIdleTimer();
}

function resetIdleTimer() {
    // Clear existing timer
    if (idleTimer) clearTimeout(idleTimer);

    // If auto logout is disabled (idleMins = 0), do not set timer
    if (idleMins === 0) return;

    // Set new timer
    idleTimer = setTimeout(triggerAutoLogout, idleMins * 60 * 1000);
}

async function triggerAutoLogout() {
    if (window.supabaseClient) {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (session) {
            window.showToast("Logging out due to inactivity...", "warning");
            setTimeout(async () => {
                await window.supabaseClient.auth.signOut();
                // Redirect with query param to explain what happened
                window.location.href = window.resolveRedirect('home?reason=timeout');
            }, 1000);
        }
    }
}

// On Login page, check if we were timed out
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'timeout') {
        setTimeout(() => {
            window.showToast("You have been logged out due to inactivity.", "warning");
        }, 800);
    }
});

// Initialize and display server load warning notice
function initServerLoadWarning() {
    // Check if warning has been dismissed in this session
    const isDismissed = sessionStorage.getItem('CLOUDVAULT_LOAD_WARNING_DISMISSED');
    if (isDismissed === 'true') return;

    // Create warning modal container
    const overlay = document.createElement('div');
    overlay.className = 'server-load-overlay';
    overlay.id = 'server-load-modal';

    overlay.innerHTML = `
        <div class="server-load-card">
            <div class="server-load-icon-wrapper">
                <i data-lucide="alert-triangle" style="width: 32px; height: 32px;"></i>
            </div>
            <h3 class="server-load-title">Cloud Server Alert</h3>
            <div class="server-load-message">
                <p>Our cloud servers are currently experiencing high traffic due to a large number of concurrent users. Please wait a few moments for the page to respond. We appreciate your patience.</p>
            </div>
            <div class="server-load-buttons">
                <button id="server-load-continue" class="server-load-btn server-load-btn-primary" style="width: 100%;">
                    <span>Continue to Site</span>
                    <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Initialize Lucide Icons in the modal
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Trigger open transition
    setTimeout(() => {
        overlay.classList.add('active');
    }, 50);

    // Event listeners
    const continueBtn = overlay.querySelector('#server-load-continue');

    // Auto-dismiss after 10 seconds (10000ms)
    const autoDismissTimeout = setTimeout(() => {
        dismissModal();
    }, 10000);

    function dismissModal() {
        clearTimeout(autoDismissTimeout);
        sessionStorage.setItem('CLOUDVAULT_LOAD_WARNING_DISMISSED', 'true');
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }

    continueBtn.addEventListener('click', dismissModal);
}

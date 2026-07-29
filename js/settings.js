/* CloudVault Application Settings & Idle Session Handler */

document.addEventListener('DOMContentLoaded', () => {
    // Apply theme immediately on load
    applySavedTheme();

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
                window.location.href = 'index.html?reason=timeout';
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

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

    const savedLang = localStorage.getItem('CLOUDVAULT_LANGUAGE') || 'en';
    if (languageSelect) languageSelect.value = savedLang;

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
            applyLanguage(lang);
            window.showToast(`Language changed to ${languageSelect.options[languageSelect.selectedIndex].text}`, "success");
        });
    }

    // Apply language on dashboard load
    applyLanguage(savedLang);

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

// =========================================================================
// MULTI-LANGUAGE TRANSLATION DICTIONARY & HELPER
// =========================================================================
const TRANSLATIONS = {
    en: {
        "sidebar-overview": "Dashboard",
        "sidebar-upload": "Send to Server",
        "sidebar-vault": "Receive",
        "sidebar-quicktext": "Quick Text",
        "sidebar-profile": "Profile",
        "sidebar-admin": "Admin Panel",
        "sidebar-settings": "Settings",
        "sidebar-logout": "Logout",
        "navbar-title-overview": "Dashboard Overview",
        "navbar-title-upload": "Send to Server",
        "navbar-title-vault": "Receive (My Vault)",
        "navbar-title-quicktext": "Quick Text Clipboard",
        "navbar-title-profile": "User Profile",
        "navbar-title-settings": "Settings",
        "navbar-title-admin": "Admin Control Centre",
        "greeting-welcome": "Welcome back",
        "settings-pref": "Preferences",
        "settings-theme": "Interface Theme",
        "settings-theme-desc": "Switch between Dark Mode and Light Mode.",
        "settings-logout": "Auto Logout (Idle Timer)",
        "settings-logout-desc": "Automatically log out when inactive. Recommended for college lab computers.",
        "settings-layout": "Default File Layout",
        "settings-layout-desc": "Default layout style for viewing uploaded files in the Receive section.",
        "settings-lang": "Interface Language",
        "settings-lang-desc": "Select the display language.",
        "settings-feedback-title": "Feedback & Bug Reports",
        "settings-feedback-desc": "Found a bug? Want to request a feature? Let us know directly below."
    },
    es: {
        "sidebar-overview": "Tablero",
        "sidebar-upload": "Enviar al Servidor",
        "sidebar-vault": "Recibir",
        "sidebar-quicktext": "Texto Rápido",
        "sidebar-profile": "Perfil",
        "sidebar-admin": "Panel de Administración",
        "sidebar-settings": "Ajustes",
        "sidebar-logout": "Cerrar sesión",
        "navbar-title-overview": "Resumen del Tablero",
        "navbar-title-upload": "Enviar al Servidor",
        "navbar-title-vault": "Recibir (Mi Bóveda)",
        "navbar-title-quicktext": "Portapapeles de Texto Rápido",
        "navbar-title-profile": "Perfil de Usuario",
        "navbar-title-settings": "Ajustes",
        "navbar-title-admin": "Centro de Control de Administración",
        "greeting-welcome": "Bienvenido de nuevo",
        "settings-pref": "Preferencias",
        "settings-theme": "Tema de Interfaz",
        "settings-theme-desc": "Cambiar entre Modo Oscuro y Modo Claro.",
        "settings-logout": "Cierre de Sesión Automático",
        "settings-logout-desc": "Cerrar sesión automáticamente cuando esté inactivo. Recomendado para laboratorios.",
        "settings-layout": "Diseño de Archivos Predeterminado",
        "settings-layout-desc": "Estilo de diseño para ver archivos en la sección Recibir.",
        "settings-lang": "Idioma de Interfaz",
        "settings-lang-desc": "Seleccionar el idioma de la pantalla.",
        "settings-feedback-title": "Comentarios e Informes de Errores",
        "settings-feedback-desc": "¿Encontró un error? ¿Quiere sugerir algo? Háganoslo saber abajo."
    },
    hi: {
        "sidebar-overview": "डैशबोर्ड",
        "sidebar-upload": "सर्वर पर भेजें",
        "sidebar-vault": "फ़ाइलें प्राप्त करें",
        "sidebar-quicktext": "त्वरित पाठ (क्लिपबोर्ड)",
        "sidebar-profile": "प्रोफ़ाइल",
        "sidebar-admin": "एडमिन पैनल",
        "sidebar-settings": "सेटिंग्स",
        "sidebar-logout": "लॉग आउट",
        "navbar-title-overview": "डैशबोर्ड अवलोकन",
        "navbar-title-upload": "सर्वर पर भेजें",
        "navbar-title-vault": "प्राप्त करें (मेरी तिजोरी)",
        "navbar-title-quicktext": "त्वरित पाठ क्लिपबोर्ड",
        "navbar-title-profile": "उपयोगकर्ता प्रोफ़ाइल",
        "navbar-title-settings": "सेटिंग्स",
        "navbar-title-admin": "एडमिन कंट्रोल सेंटर",
        "greeting-welcome": "स्वागत है",
        "settings-pref": "प्राथमिकताएं",
        "settings-theme": "इंटरफ़ेस थीम",
        "settings-theme-desc": "डार्क मोड और लाइट मोड के बीच स्विच करें।",
        "settings-logout": "ऑटो लॉगआउट (निष्क्रियता टाइमर)",
        "settings-logout-desc": "निष्क्रिय होने पर स्वचालित रूप से लॉग आउट करें। कॉलेज लैब कंप्यूटरों के लिए अनुशंसित।",
        "settings-layout": "डिफ़ॉल्ट फ़ाइल लेआउट",
        "settings-layout-desc": "प्राप्त अनुभाग में अपलोड की गई फ़ाइलों को देखने के लिए डिफ़ॉल्ट लेआउट शैली।",
        "settings-lang": "इंटरफ़ेस भाषा",
        "settings-lang-desc": "प्रदर्शन भाषा का चयन करें।",
        "settings-feedback-title": "प्रतिक्रिया और बग रिपोर्ट",
        "settings-feedback-desc": "कोई बग मिला? कोई सुविधा चाहते हैं? हमें सीधे नीचे बताएं।"
    }
};
window.TRANSLATIONS = TRANSLATIONS;

function applyLanguage(lang) {
    localStorage.setItem('CLOUDVAULT_LANGUAGE', lang);
    const translation = TRANSLATIONS[lang] || TRANSLATIONS['en'];
    
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (translation[key]) {
            el.textContent = translation[key];
        }
    });

    // Update navbar greeting text
    const greetingEl = document.getElementById('navbar-greeting');
    if (greetingEl && window.supabaseClient) {
        window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user) {
                const user = session.user;
                const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
                const welcomeStr = translation["greeting-welcome"] || "Welcome back";
                greetingEl.textContent = `${welcomeStr}, ${displayName}!`;
            }
        });
    }

    // Update current navbar section title
    const titleEl = document.getElementById('navbar-section-title');
    const activeSidebar = document.querySelector('.sidebar-item.active');
    if (titleEl && activeSidebar) {
        const targetId = activeSidebar.getAttribute('data-target');
        const titleKey = `navbar-title-${targetId.replace('-tab', '')}`;
        if (translation[titleKey]) {
            titleEl.textContent = translation[titleKey];
        }
    }
}
window.applyLanguage = applyLanguage;


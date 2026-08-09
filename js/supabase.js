/* CloudVault Supabase Client Setup */

// Supabase client instance
let supabaseClient = null;

// Config credentials (Optional: Hardcode your credentials here if hosting a dedicated instance)
const CONFIG_SUPABASE_URL = "";
const CONFIG_SUPABASE_ANON_KEY = "";

// Initialize Supabase Client (handles Vercel Serverless env variables, local config.js, and localStorage setup wizard)
async function initSupabase() {
    // 1. Check LocalStorage (manual overrides)
    let url = localStorage.getItem('CLOUDVAULT_SUPABASE_URL');
    let key = localStorage.getItem('CLOUDVAULT_SUPABASE_ANON_KEY');

    // Load local config dynamically if running on localhost / local network and not already loaded
    const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname) || window.location.hostname.startsWith('192.168.');
    if (isLocal && !url && !window.env) {
        try {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'js/config.js';
                script.onload = () => resolve();
                script.onerror = () => resolve();
                document.head.appendChild(script);
            });
        } catch (e) {
            console.warn("Failed to load local config.js:", e);
        }
    }

    // 2. Check window.env (local js/config.js file)
    if (!url && window.env) {
        url = window.env.SUPABASE_URL;
        key = window.env.SUPABASE_ANON_KEY;
    }

    // 3. Check Vercel API Config (/api/config)
    if (!url || !key) {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                if (data.supabaseUrl && data.supabaseAnonKey) {
                    url = data.supabaseUrl;
                    key = data.supabaseAnonKey;
                }
            }
        } catch (e) {
            console.warn("Vercel Serverless environment variables config not available, falling back to local configurations:", e);
        }
    }

    if (!url || !key) {
        showSetupOverlay();
        return null;
    }

    try {
        // Create client using the global @supabase/supabase-js loaded via CDN
        supabaseClient = window.supabase.createClient(url, key);
        window.supabaseClient = supabaseClient; // Expose globally
        return supabaseClient;
    } catch (error) {
        console.error("Supabase initialization failed:", error);
        showSetupOverlay(true); // Show with error state
        return null;
    }
}

// Dynamically create and show a configuration overlay if keys are missing
function showSetupOverlay(isError = false) {
    // Remove if already exists
    const existing = document.getElementById('supabase-setup-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'supabase-setup-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(240, 244, 248, 0.95);
        backdrop-filter: blur(12px);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: #0F172A;
        font-family: 'Inter', sans-serif;
    `;

    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.cssText = `
        width: 100%;
        max-width: 500px;
        padding: 35px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(14, 165, 233, 0.15);
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(148, 163, 184, 0.15);
    `;

    card.innerHTML = `
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 24px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            CloudVault Setup
        </h2>
        <p style="font-size: 14px; color: #475569; margin-bottom: 24px; line-height: 1.5;">
            To run CloudVault locally or on your own domain, connect your personal Supabase project. Enter your API credentials below.
        </p>
        ${isError ? `
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #EF4444; color: #DC2626; padding: 12px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; font-weight: 500;">
                Failed to connect. Please check that your Supabase URL and Anon Key are correct and active.
            </div>
        ` : ''}
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #64748B; margin-bottom: 6px;">SUPABASE URL</label>
            <input type="text" id="setup-supabase-url" placeholder="https://your-project-id.supabase.co" 
                value="${localStorage.getItem('CLOUDVAULT_SUPABASE_URL') || ''}"
                style="width: 100%; padding: 12px; background: #FFFFFF; border: 1px solid rgba(14, 165, 233, 0.15); border-radius: 8px; color: #0F172A; font-size: 14px;">
        </div>
        <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #64748B; margin-bottom: 6px;">SUPABASE ANON KEY</label>
            <input type="password" id="setup-supabase-key" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value="${localStorage.getItem('CLOUDVAULT_SUPABASE_ANON_KEY') || ''}"
                style="width: 100%; padding: 12px; background: #FFFFFF; border: 1px solid rgba(14, 165, 233, 0.15); border-radius: 8px; color: #0F172A; font-size: 14px;">
        </div>
        <button id="setup-save-btn" style="width: 100%; padding: 12px; background: #0284C7; border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 15px; cursor: pointer; transition: background 0.2s;">
            Connect Supabase Project
        </button>
        <div style="margin-top: 20px; font-size: 12px; text-align: center; color: #64748B;">
            Need help? Make sure you ran the <code style="background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px;">schema.sql</code> script in Supabase's SQL Editor to set up the DB tables!
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.appendChild(card);

    document.getElementById('setup-save-btn').addEventListener('click', () => {
        const urlInput = document.getElementById('setup-supabase-url').value.trim();
        const keyInput = document.getElementById('setup-supabase-key').value.trim();

        if (!urlInput || !keyInput) {
            alert('Both Supabase URL and Anon Key are required!');
            return;
        }

        localStorage.setItem('CLOUDVAULT_SUPABASE_URL', urlInput);
        localStorage.setItem('CLOUDVAULT_SUPABASE_ANON_KEY', keyInput);
        window.location.reload();
    });
}

// Run initialization
document.addEventListener('DOMContentLoaded', () => {
    // Wait slightly to ensure Supabase SDK loaded from CDN
    if (window.supabase) {
        initSupabase();
    } else {
        const checkSdk = setInterval(() => {
            if (window.supabase) {
                clearInterval(checkSdk);
                initSupabase();
            }
        }, 100);
        // Timeout after 10s
        setTimeout(() => clearInterval(checkSdk), 10000);
    }
});

// Helper to reset configuration
function resetSupabaseConfig() {
    localStorage.removeItem('CLOUDVAULT_SUPABASE_URL');
    localStorage.removeItem('CLOUDVAULT_SUPABASE_ANON_KEY');
    window.location.reload();
}

// Helper to resolve redirect URLs correctly for both clean-url servers (like Vercel) and local file systems / simple servers
function resolveRedirect(pageName) {
    const isLocalFile = window.location.protocol === 'file:';
    const hasHtmlExtension = window.location.pathname.endsWith('.html');
    
    // Split base page name and any query params (e.g., 'home?reason=timeout')
    const parts = pageName.split('?');
    const basePage = parts[0];
    const query = parts[1] ? '?' + parts[1] : '';
    
    if (isLocalFile || hasHtmlExtension) {
        return basePage + '.html' + query;
    }
    return pageName;
}
window.resolveRedirect = resolveRedirect;


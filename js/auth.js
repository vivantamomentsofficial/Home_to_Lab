/* CloudVault Auth Handler */

// Toast notification utility
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'danger') iconName = 'alert-triangle';
    if (type === 'warning') iconName = 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <div class="toast-message">${message}</div>
        <button class="toast-close">
            <i data-lucide="x"></i>
        </button>
    `;
    
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    });
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}
window.showToast = showToast;

// Button ripple effect
document.addEventListener('click', (e) => {
    const target = e.target.closest('.btn');
    if (!target) return;
    
    const circle = document.createElement('div');
    const d = Math.max(target.clientWidth, target.clientHeight);
    circle.style.width = circle.style.height = d + 'px';
    
    const rect = target.getBoundingClientRect();
    circle.style.left = e.clientX - rect.left - d/2 + 'px';
    circle.style.top = e.clientY - rect.top - d/2 + 'px';
    circle.classList.add('ripple');
    
    // Remove previous ripples
    const prevRipple = target.querySelector('.ripple');
    if (prevRipple) prevRipple.remove();
    
    target.appendChild(circle);
});

// Authentication Controller
document.addEventListener('DOMContentLoaded', () => {
    const checkAuthStatus = setInterval(() => {
        if (window.supabaseClient) {
            clearInterval(checkAuthStatus);
            handleAuthLifecycle();
        }
    }, 100);
    setTimeout(() => clearInterval(checkAuthStatus), 10000);
});

function handleAuthLifecycle() {
    const path = window.location.pathname;
    const isAuthPage = path.includes('login') || path.includes('register');
    const isDashboard = path.includes('dashboard');

    // Monitor Auth State
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        const isAnonymous = session && session.user && session.user.is_anonymous;
        
        if (event === 'SIGNED_IN' && !isAnonymous) {
            if (isAuthPage) {
                window.location.href = window.resolveRedirect('dashboard');
            }
        }
        
        if (event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && isAnonymous && isDashboard)) {
            if (isDashboard) {
                window.location.href = window.resolveRedirect('login');
            }
        }

        if (event === 'PASSWORD_RECOVERY') {
            showResetPasswordOverlay();
        }
    });

    // Check Current Session on load
    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
        const isAnonymous = session && session.user && session.user.is_anonymous;
        if (session && !isAnonymous) {
            if (isAuthPage) {
                window.location.href = window.resolveRedirect('dashboard');
            }
        } else {
            if (isDashboard) {
                window.location.href = window.resolveRedirect('login');
            }
        }
    });

    // Form Event Listeners
    setupFormListeners();
}

function setupFormListeners() {
    // 1. Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me').checked;
            
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const origContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Signing in...</span><div class="skeleton" style="width: 18px; height: 18px; border-radius: 50%;"></div>`;

            // Note: Supabase SDK handles session storage in localStorage by default.
            // If they unchecked 'remember me', we can flag it to be cleared on close or custom handler
            if (!rememberMe) {
                sessionStorage.setItem('CLOUDVAULT_SESSION_PERSIST', 'session_only');
            } else {
                sessionStorage.removeItem('CLOUDVAULT_SESSION_PERSIST');
            }

            const captchaToken = document.getElementsByName('cf-turnstile-response')[0]?.value || (typeof turnstile !== 'undefined' ? turnstile.getResponse() : null);
            if (!captchaToken) {
                showToast('Please complete the Captcha check.', 'warning');
                submitBtn.disabled = false;
                submitBtn.innerHTML = origContent;
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            const { error } = await window.supabaseClient.auth.signInWithPassword({
                email,
                password,
                options: {
                    captchaToken: captchaToken
                }
            });

            if (error) {
                showToast(error.message, 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = origContent;
                if (window.lucide) window.lucide.createIcons();
            } else {
                showToast('Welcome back to CloudVault!', 'success');
                try {
                    const { data: { user } } = await window.supabaseClient.auth.getUser();
                    if (user) {
                        await window.supabaseClient.from('login_logs').insert({
                            user_id: user.id,
                            email: user.email,
                            login_time: new Date().toISOString()
                        });
                    }
                } catch (logErr) {
                    console.error("Failed to log login:", logErr);
                }
                setTimeout(() => {
                    window.location.href = window.resolveRedirect('dashboard');
                }, 1000);
            }
        });
    }



    // 2. Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullname = document.getElementById('fullname').value.trim();
            const college = document.getElementById('college').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                showToast('Passwords do not match!', 'warning');
                return;
            }

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const origContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Creating Account...</span><div class="skeleton" style="width: 18px; height: 18px; border-radius: 50%;"></div>`;

            const captchaToken = document.getElementsByName('cf-turnstile-response')[0]?.value || (typeof turnstile !== 'undefined' ? turnstile.getResponse() : null);
            if (!captchaToken) {
                showToast('Please complete the Captcha check.', 'warning');
                submitBtn.disabled = false;
                submitBtn.innerHTML = origContent;
                if (window.lucide) window.lucide.createIcons();
                return;
            }

            const { data, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullname,
                        college: college
                    },
                    captchaToken: captchaToken
                }
            });

            if (error) {
                showToast(error.message, 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = origContent;
                if (window.lucide) window.lucide.createIcons();
            } else {
                // If email confirmation is required, Supabase returns a user but session is null
                if (data.session) {
                    showToast('Registration successful! Redirecting...', 'success');
                    try {
                        const { data: { user } } = await window.supabaseClient.auth.getUser();
                        if (user) {
                            await window.supabaseClient.from('login_logs').insert({
                                user_id: user.id,
                                email: user.email,
                                login_time: new Date().toISOString()
                            });
                        }
                    } catch (logErr) {
                        console.error("Failed to log registration login:", logErr);
                    }
                    setTimeout(() => {
                        window.location.href = window.resolveRedirect('dashboard');
                    }, 1000);
                } else {
                    showToast('Registration successful! Please check your email for the verification link.', 'success');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = origContent;
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        });
    }

    // 3. Forgot Password Link
    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('email');
            const email = emailInput.value.trim();

            if (!email) {
                showToast('Please enter your email address first.', 'warning');
                emailInput.focus();
                return;
            }

            showToast('Sending recovery email...', 'info');

            const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            });

            if (error) {
                showToast(error.message, 'danger');
            } else {
                showToast('Password reset link sent! Check your inbox.', 'success');
            }
        });
    }
}

// Reset Password Overlay (triggers when users visit with recovery token)
function showResetPasswordOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'reset-password-overlay';
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
        max-width: 400px;
        padding: 35px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(14, 165, 233, 0.15);
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(148, 163, 184, 0.15);
    `;

    card.innerHTML = `
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 22px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Reset Password
        </h2>
        <p style="font-size: 13px; color: #475569; margin-bottom: 20px;">
            Enter a new password for your CloudVault account.
        </p>
        <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #64748B; margin-bottom: 6px;">NEW PASSWORD</label>
            <input type="password" id="reset-new-password" placeholder="At least 6 characters" 
                style="width: 100%; padding: 12px; background: #FFFFFF; border: 1px solid rgba(14, 165, 233, 0.15); border-radius: 8px; color: #0F172A; font-size: 14px;">
        </div>
        <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: 600; color: #64748B; margin-bottom: 6px;">CONFIRM PASSWORD</label>
            <input type="password" id="reset-confirm-password" placeholder="Re-enter password"
                style="width: 100%; padding: 12px; background: #FFFFFF; border: 1px solid rgba(14, 165, 233, 0.15); border-radius: 8px; color: #0F172A; font-size: 14px;">
        </div>
        <button id="reset-submit-btn" style="width: 100%; padding: 12px; background: #0284C7; border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 15px; cursor: pointer;">
            Update Password
        </button>
    `;

    document.body.appendChild(overlay);
    overlay.appendChild(card);

    document.getElementById('reset-submit-btn').addEventListener('click', async () => {
        const pass = document.getElementById('reset-new-password').value;
        const confirm = document.getElementById('reset-confirm-password').value;

        if (pass.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        if (pass !== confirm) {
            alert('Passwords do not match.');
            return;
        }

        const { error } = await window.supabaseClient.auth.updateUser({ password: pass });

        if (error) {
            alert('Error updating password: ' + error.message);
        } else {
            alert('Password updated successfully! Sign in with your new password.');
            overlay.remove();
            window.location.href = window.resolveRedirect('login');
        }
    });
}


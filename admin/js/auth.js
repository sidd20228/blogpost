// ─── Authentication Module (GitHub OAuth) ─────────────────────
const Auth = {

    // ─── Start OAuth Flow ─────────────────────────────────────
    startOAuthFlow() {
        // Generate random state for CSRF protection
        const state = crypto.randomUUID();
        sessionStorage.setItem('oauth_state', state);

        const params = new URLSearchParams({
            client_id: CONFIG.clientId,
            redirect_uri: window.location.origin + '/admin/callback.html',
            scope: CONFIG.oauthScopes,
            state: state,
        });

        window.location.href = `https://github.com/login/oauth/authorize?${params}`;
    },

    // ─── Handle OAuth Callback ────────────────────────────────
    async handleCallback(code, state) {
        // Verify CSRF state
        const savedState = sessionStorage.getItem('oauth_state');
        sessionStorage.removeItem('oauth_state');

        if (!savedState || savedState !== state) {
            return { success: false, error: 'Invalid state parameter. Possible CSRF attack.' };
        }

        try {
            // Exchange code for token via Cloudflare Worker proxy
            const res = await fetch(CONFIG.proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return { success: false, error: err.error || 'Token exchange failed.' };
            }

            const data = await res.json();
            if (!data.access_token) {
                return { success: false, error: data.error_description || 'No access token received.' };
            }

            // Validate user with the received token
            return await this.validateAndStore(data.access_token);
        } catch (e) {
            return { success: false, error: 'Network error during authentication.' };
        }
    },

    // ─── PAT Login (fallback) ──────────────────────────────────
    async login(token) {
        return await this.validateAndStore(token);
    },

    // ─── Validate token and store session ─────────────────────
    async validateAndStore(token) {
        try {
            const res = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                },
            });

            if (!res.ok) {
                return { success: false, error: 'Invalid token. Authentication failed.' };
            }

            const user = await res.json();

            // Check if user is in the allowed list
            if (!CONFIG.allowedUsers.includes(user.login)) {
                return { success: false, error: `User "${user.login}" is not authorized.` };
            }

            // Store session
            sessionStorage.setItem('gh_token', token);
            sessionStorage.setItem('gh_user', JSON.stringify({
                login: user.login,
                name: user.name || user.login,
                avatar: user.avatar_url,
                email: user.email,
            }));

            return { success: true, user };
        } catch (e) {
            return { success: false, error: 'Network error. Please check your connection.' };
        }
    },

    logout() {
        sessionStorage.removeItem('gh_token');
        sessionStorage.removeItem('gh_user');
        window.location.href = 'index.html';
    },

    getToken() {
        return sessionStorage.getItem('gh_token');
    },

    getUser() {
        const data = sessionStorage.getItem('gh_user');
        return data ? JSON.parse(data) : null;
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    // Auth guard — call on every admin page
    guard() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    // Render user info in header
    renderUserInfo() {
        const user = this.getUser();
        if (!user) return;

        const el = document.getElementById('user-info');
        if (el) {
            el.innerHTML = `
                <img src="${user.avatar}" alt="${user.name}" style="width:32px;height:32px;border-radius:50%;border:2px solid #262626;">
                <span style="font-size:0.875rem;font-weight:500;">${user.name}</span>
            `;
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }
    }
};

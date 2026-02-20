// ─── Authentication Module ────────────────────────────────────
const Auth = {
    async login(token) {
        try {
            const res = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
            });

            if (!res.ok) {
                return { success: false, error: 'Invalid token. Please check and try again.' };
            }

            const user = await res.json();

            // Check if user is in the allowed list
            if (!CONFIG.allowedUsers.includes(user.login)) {
                return { success: false, error: `User "${user.login}" is not authorized to access the admin panel.` };
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
        <img src="${user.avatar}" alt="${user.name}" class="w-8 h-8 rounded-full border-2 border-panel-700">
        <span class="text-sm font-medium text-panel-200">${user.name}</span>
      `;
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }
    }
};

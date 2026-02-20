// ─── GitHub API Module ────────────────────────────────────────
const API = {
    headers() {
        return {
            'Authorization': `token ${Auth.getToken()}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        };
    },

    async request(url, options = {}) {
        const res = await fetch(url, { headers: this.headers(), ...options });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `API Error: ${res.status}`);
        }
        return res.status === 204 ? null : res.json();
    },

    // ─── Posts ──────────────────────────────────────────────────
    async listPosts(dir = 'posts') {
        try {
            const data = await this.request(
                `${CONFIG.apiBase}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${dir}?ref=${CONFIG.branch}`
            );
            const posts = [];
            for (const item of data) {
                if (item.type === 'file' && item.name.endsWith('.md')) {
                    posts.push({
                        name: item.name,
                        path: item.path,
                        sha: item.sha,
                        size: item.size,
                        url: item.download_url,
                        isDraft: dir.includes('drafts'),
                    });
                } else if (item.type === 'dir' && item.name === 'drafts') {
                    const drafts = await this.listPosts('posts/drafts');
                    posts.push(...drafts);
                }
            }
            return posts;
        } catch (e) {
            if (e.message.includes('404') || e.message.includes('Not Found')) return [];
            throw e;
        }
    },

    async getPost(filePath) {
        const data = await this.request(
            `${CONFIG.apiBase}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${filePath}?ref=${CONFIG.branch}`
        );
        const content = atob(data.content.replace(/\n/g, ''));
        return { content, sha: data.sha, path: data.path };
    },

    async deletePost(filePath, sha) {
        return this.request(
            `${CONFIG.apiBase}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${filePath}`,
            {
                method: 'DELETE',
                body: JSON.stringify({
                    message: `Delete post: ${filePath}`,
                    sha,
                    branch: CONFIG.branch,
                }),
            }
        );
    },

    // ─── Workflow Dispatch ──────────────────────────────────────
    async triggerPublish(inputs) {
        return this.request(
            `${CONFIG.apiBase}/repos/${CONFIG.owner}/${CONFIG.repo}/actions/workflows/${CONFIG.publishWorkflow}/dispatches`,
            {
                method: 'POST',
                body: JSON.stringify({
                    ref: CONFIG.branch,
                    inputs,
                }),
            }
        );
    },

    // ─── File Upload (Images) ──────────────────────────────────
    async uploadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64 = reader.result.split(',')[1];
                    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
                    const path = `public/images/${filename}`;

                    await this.request(
                        `${CONFIG.apiBase}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${path}`,
                        {
                            method: 'PUT',
                            body: JSON.stringify({
                                message: `Upload image: ${filename}`,
                                content: base64,
                                branch: CONFIG.branch,
                            }),
                        }
                    );

                    resolve(`/images/${filename}`);
                } catch (e) {
                    reject(e);
                }
            };
            reader.readAsDataURL(file);
        });
    },

    // ─── Workflow Runs ─────────────────────────────────────────
    async getWorkflowRuns(limit = 5) {
        const data = await this.request(
            `${CONFIG.apiBase}/repos/${CONFIG.owner}/${CONFIG.repo}/actions/runs?per_page=${limit}`
        );
        return data.workflow_runs || [];
    },
};

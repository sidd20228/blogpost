// ─── Admin Configuration ──────────────────────────────────────
const CONFIG = {
    // GitHub repository details
    owner: 'sidd20228',
    repo: 'blogpost',

    // Allowed admin usernames
    allowedUsers: ['sidd20228'],

    // ─── GitHub OAuth App ─────────────────────────────────────
    // 1. Go to https://github.com/settings/developers
    // 2. Click "New OAuth App"
    // 3. Set Homepage URL to your blog URL
    // 4. Set Authorization callback URL to: https://<your-site>/admin/callback.html
    // 5. Copy the Client ID here
    clientId: 'Ov23liZk0Pvubg8Ri47Q',

    // ─── Cloudflare Worker Proxy ──────────────────────────────
    // Deploy the worker from cloudflare-worker/worker.js
    // Then paste the worker URL here
    proxyUrl: 'https://blogpost-oauth.parasharsiddhant7.workers.dev',

    // Explicit callback URL (must match GitHub OAuth App settings exactly)
    callbackUrl: 'https://sidd20228.github.io/blogpost/admin/callback.html',

    // OAuth scopes needed
    oauthScopes: 'repo workflow',

    // Site metadata
    siteTitle: 'The Blog',
    siteDescription: 'A modern blog powered by GitHub Pages & Actions',
    defaultAuthor: 'Admin',

    // GitHub API
    apiBase: 'https://api.github.com',

    // Workflow file names
    publishWorkflow: 'publish.yml',
    scheduleWorkflow: 'schedule.yml',

    // Branch
    branch: 'main',
};

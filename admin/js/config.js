// ─── Admin Configuration ──────────────────────────────────────
const CONFIG = {
    // GitHub repository details
    owner: 'sidd20228',     // Change this
    repo: 'blogpost',                 // Change this

    // Allowed admin usernames
    allowedUsers: ['sidd20228'], // Change this

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

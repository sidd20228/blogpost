// ─── Dashboard Module ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.guard()) return;
    Auth.renderUserInfo();

    await loadDashboard();
});

async function loadDashboard() {
    try {
        // Load posts
        const posts = await API.listPosts();
        const published = posts.filter(p => !p.isDraft);
        const drafts = posts.filter(p => p.isDraft);

        document.getElementById('total-posts').textContent = posts.length;
        document.getElementById('published-count').textContent = published.length;
        document.getElementById('draft-count').textContent = drafts.length;

        // Render recent posts
        renderRecentPosts(posts.slice(0, 5));

        // Load workflow runs
        try {
            const runs = await API.getWorkflowRuns(5);
            document.getElementById('actions-count').textContent = runs.length;
            renderWorkflowRuns(runs);
        } catch (e) {
            document.getElementById('actions-count').textContent = '0';
            document.getElementById('workflow-runs').innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          <h3>No workflow runs yet</h3>
          <p>Runs will appear here after you publish a post.</p>
        </div>`;
        }
    } catch (e) {
        console.error('Dashboard error:', e);
        showToast('Failed to load dashboard data', 'error');
    }
}

function renderRecentPosts(posts) {
    const container = document.getElementById('recent-posts');
    if (posts.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
        <h3>No posts yet</h3>
        <p>Create your first post to get started!</p>
      </div>`;
        return;
    }

    container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${posts.map(post => {
        const name = post.name.replace('.md', '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
        const status = post.isDraft ? 'draft' : 'published';
        const dateMatch = post.name.match(/^(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : '-';
        return `
            <tr>
              <td class="font-medium text-white">${escapeHtml(name.replace(/-/g, ' '))}</td>
              <td><span class="status-badge ${status}">${status}</span></td>
              <td>${date}</td>
              <td>
                <a href="editor.html?path=${encodeURIComponent(post.path)}" class="btn btn-ghost btn-sm">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  Edit
                </a>
              </td>
            </tr>`;
    }).join('')}
      </tbody>
    </table>`;
}

function renderWorkflowRuns(runs) {
    const container = document.getElementById('workflow-runs');
    if (runs.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        <h3>No workflow runs yet</h3>
        <p>Runs will appear here after you publish a post.</p>
      </div>`;
        return;
    }

    const statusIcons = {
        completed: '✅',
        in_progress: '🔄',
        queued: '⏳',
        failure: '❌',
    };

    container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Status</th>
          <th>Workflow</th>
          <th>Triggered</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${runs.map(run => {
        const status = run.conclusion || run.status;
        const date = new Date(run.created_at).toLocaleString();
        const duration = run.updated_at
            ? Math.round((new Date(run.updated_at) - new Date(run.created_at)) / 1000) + 's'
            : '-';
        return `
            <tr>
              <td>${statusIcons[status] || '⚪'} ${status}</td>
              <td class="font-medium text-white">${escapeHtml(run.name)}</td>
              <td>${date}</td>
              <td>${duration}</td>
            </tr>`;
    }).join('')}
      </tbody>
    </table>`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

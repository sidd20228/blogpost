// ─── Posts Management Module ──────────────────────────────────
let allPosts = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.guard()) return;
    Auth.renderUserInfo();

    await loadAllPosts();

    // Search
    const search = document.getElementById('post-search');
    if (search) {
        search.addEventListener('input', () => {
            const q = search.value.toLowerCase();
            const filtered = allPosts.filter(p =>
                p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)
            );
            renderPostsTable(filtered);
        });
    }
});

async function loadAllPosts() {
    try {
        allPosts = await API.listPosts();
        renderPostsTable(allPosts);
    } catch (e) {
        console.error('Failed to load posts:', e);
        document.getElementById('posts-table').innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <h3>Failed to load posts</h3>
        <p>${escapeHtml(e.message)}</p>
      </div>`;
    }
}

function renderPostsTable(posts) {
    const container = document.getElementById('posts-table');

    if (posts.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
        <h3>No posts found</h3>
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
          <th>File</th>
          <th class="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${posts.map(post => {
        const name = post.name.replace('.md', '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
        const title = name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const status = post.isDraft ? 'draft' : 'published';
        const dateMatch = post.name.match(/^(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : '-';
        return `
            <tr>
              <td class="font-medium text-white">${escapeHtml(title)}</td>
              <td><span class="status-badge ${status}">${status}</span></td>
              <td>${date}</td>
              <td class="text-xs text-slate-500 font-mono">${post.path}</td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <a href="editor.html?path=${encodeURIComponent(post.path)}" class="btn btn-ghost btn-sm">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Edit
                  </a>
                  <button onclick="deletePost('${post.path}', '${post.sha}')" class="btn btn-danger btn-sm">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    Delete
                  </button>
                </div>
              </td>
            </tr>`;
    }).join('')}
      </tbody>
    </table>`;
}

async function deletePost(path, sha) {
    if (!confirm(`Are you sure you want to delete "${path}"?`)) return;

    try {
        await API.deletePost(path, sha);
        showToast('Post deleted successfully');
        await loadAllPosts();
    } catch (e) {
        showToast('Failed to delete post: ' + e.message, 'error');
    }
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

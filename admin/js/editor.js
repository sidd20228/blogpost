// ─── Editor Module ────────────────────────────────────────────
let tags = [];
let editPath = null;
let editSha = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.guard()) return;
    Auth.renderUserInfo();

    // Set default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('post-date').value = today;

    // Auto-slug from title
    const titleInput = document.getElementById('post-title');
    const slugInput = document.getElementById('post-slug');
    titleInput.addEventListener('input', () => {
        if (!editPath) {
            slugInput.value = slugify(titleInput.value);
        }
    });

    // Tag input
    const tagInput = document.getElementById('tag-input');
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = tagInput.value.trim().replace(/,/g, '');
            if (val && !tags.includes(val)) {
                tags.push(val);
                renderTags();
            }
            tagInput.value = '';
        }
        if (e.key === 'Backspace' && !tagInput.value && tags.length) {
            tags.pop();
            renderTags();
        }
    });

    // Live preview
    const editor = document.getElementById('editor');
    editor.addEventListener('input', () => {
        updatePreview();
        updateStats();
    });

    // Image upload
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);

    // Check if editing existing post
    const params = new URLSearchParams(window.location.search);
    const path = params.get('path');
    if (path) {
        await loadExistingPost(path);
    }
});

function slugify(str) {
    return str.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function renderTags() {
    const container = document.getElementById('tag-container');
    const input = document.getElementById('tag-input');

    // Remove existing chips
    container.querySelectorAll('.tag-chip').forEach(c => c.remove());

    // Add chips before input
    tags.forEach((tag, i) => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${escapeHtml(tag)} <button onclick="removeTag(${i})">&times;</button>`;
        container.insertBefore(chip, input);
    });
}

function removeTag(index) {
    tags.splice(index, 1);
    renderTags();
}

function updatePreview() {
    const content = document.getElementById('editor').value;
    const preview = document.getElementById('preview');
    if (!content.trim()) {
        preview.innerHTML = '<p class="text-slate-500 italic">Preview will appear here as you type...</p>';
        return;
    }
    preview.innerHTML = marked.parse(content);
}

function updateStats() {
    const content = document.getElementById('editor').value;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const readTime = Math.max(1, Math.ceil(words / 200));

    document.getElementById('word-count').textContent = `${words} words`;
    document.getElementById('reading-time').textContent = `${readTime} min read`;
}

// Markdown toolbar helpers
function insertMarkdown(before, after) {
    const editor = document.getElementById('editor');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.substring(start, end);
    const replacement = before + (selected || 'text') + after;
    editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end);
    editor.focus();
    editor.selectionStart = start + before.length;
    editor.selectionEnd = start + before.length + (selected || 'text').length;
    updatePreview();
}

function insertLineStart(prefix) {
    const editor = document.getElementById('editor');
    const start = editor.selectionStart;
    const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;
    editor.value = editor.value.substring(0, lineStart) + prefix + editor.value.substring(lineStart);
    editor.focus();
    editor.selectionStart = editor.selectionEnd = start + prefix.length;
    updatePreview();
}

// Image upload
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById('upload-status');
    status.textContent = 'Uploading...';

    try {
        const url = await API.uploadImage(file);
        // Insert into editor
        const editor = document.getElementById('editor');
        const pos = editor.selectionStart;
        const imgMd = `![${file.name}](${url})`;
        editor.value = editor.value.substring(0, pos) + imgMd + editor.value.substring(pos);
        updatePreview();
        status.textContent = 'Uploaded!';
        setTimeout(() => { status.textContent = ''; }, 3000);
    } catch (err) {
        status.textContent = 'Upload failed: ' + err.message;
    }
}

// Load existing post for editing
async function loadExistingPost(path) {
    try {
        document.getElementById('page-title').textContent = 'Edit Post';
        const data = await API.getPost(path);
        editPath = path;
        editSha = data.sha;

        // Parse frontmatter
        const fmMatch = data.content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (fmMatch) {
            const frontmatter = fmMatch[1];
            const body = fmMatch[2];

            // Parse YAML manually (simple)
            const titleMatch = frontmatter.match(/title:\s*"?([^"\n]*)"?/);
            const slugMatch = frontmatter.match(/slug:\s*"?([^"\n]*)"?/);
            const dateMatch = frontmatter.match(/date:\s*"?([^"\n]*)"?/);
            const statusMatch = frontmatter.match(/status:\s*"?([^"\n]*)"?/);
            const tagsMatch = frontmatter.match(/tags:\s*\[([^\]]*)\]/);

            if (titleMatch) document.getElementById('post-title').value = titleMatch[1];
            if (slugMatch) document.getElementById('post-slug').value = slugMatch[1];
            if (dateMatch) document.getElementById('post-date').value = dateMatch[1];
            if (statusMatch) document.getElementById('post-status').value = statusMatch[1];
            if (tagsMatch) {
                tags = tagsMatch[1].split(',').map(t => t.trim().replace(/"/g, ''));
                renderTags();
            }

            document.getElementById('editor').value = body.trim();
            updatePreview();
            updateStats();
        }

        // Change publish button text
        document.getElementById('publish-btn').innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      Update Post
    `;
    } catch (e) {
        showToast('Failed to load post: ' + e.message, 'error');
    }
}

// Publish / Update
async function publish(forceStatus) {
    const title = document.getElementById('post-title').value.trim();
    const slug = document.getElementById('post-slug').value.trim();
    const date = document.getElementById('post-date').value;
    const status = forceStatus || document.getElementById('post-status').value;
    const content = document.getElementById('editor').value;
    const user = Auth.getUser();

    if (!title) { showToast('Title is required', 'error'); return; }
    if (!slug) { showToast('Slug is required', 'error'); return; }
    if (!content.trim()) { showToast('Content is required', 'error'); return; }

    const publishBtn = document.getElementById('publish-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    publishBtn.disabled = true;
    saveDraftBtn.disabled = true;
    publishBtn.classList.add('opacity-50');

    try {
        await API.triggerPublish({
            title: title,
            slug: slug,
            content: content,
            tags: JSON.stringify(tags),
            status: status,
            publish_date: date,
            author: user ? user.name : CONFIG.defaultAuthor,
        });

        showToast(status === 'draft' ? 'Draft saved! Workflow triggered.' : 'Post published! Workflow triggered.');

        // If editing, delete old file if slug changed
        if (editPath) {
            const oldSlug = editPath.match(/\d{4}-\d{2}-\d{2}-(.+)\.md/);
            if (oldSlug && oldSlug[1] !== slug) {
                try { await API.deletePost(editPath, editSha); } catch (e) { }
            }
        }

        setTimeout(() => { window.location.href = 'posts.html'; }, 2000);
    } catch (e) {
        showToast('Failed to publish: ' + e.message, 'error');
    } finally {
        publishBtn.disabled = false;
        saveDraftBtn.disabled = false;
        publishBtn.classList.remove('opacity-50');
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

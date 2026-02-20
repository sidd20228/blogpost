// Client-side search powered by posts.json
(function () {
    let postsData = null;

    async function loadPosts() {
        if (postsData) return postsData;
        try {
            const res = await fetch('/posts.json');
            postsData = await res.json();
            return postsData;
        } catch (e) {
            console.error('Failed to load search index:', e);
            return [];
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<p class="text-sm text-surface-500 dark:text-surface-400 py-2">No posts found.</p>';
            container.classList.remove('hidden');
            return;
        }

        const html = results.map(post => `
      <div class="search-result-item">
        <a href="/post/${post.slug}.html">${escapeHtml(post.title)}</a>
        <div class="search-result-date">${post.date} · ${post.readingTime} min read</div>
      </div>
    `).join('');

        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    function search(query, posts) {
        const q = query.toLowerCase().trim();
        if (!q) return [];

        return posts.filter(post => {
            const titleMatch = post.title.toLowerCase().includes(q);
            const tagMatch = post.tags.some(t => t.toLowerCase().includes(q));
            const excerptMatch = post.excerpt.toLowerCase().includes(q);
            return titleMatch || tagMatch || excerptMatch;
        });
    }

    // Initialize
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const postList = document.getElementById('post-list');

    if (input && resultsContainer) {
        let debounceTimer;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const query = input.value;
                if (!query.trim()) {
                    resultsContainer.classList.add('hidden');
                    resultsContainer.innerHTML = '';
                    if (postList) postList.classList.remove('hidden');
                    return;
                }

                const posts = await loadPosts();
                const results = search(query, posts);
                renderResults(results, resultsContainer);

                // Hide the regular post list on blog page when searching
                if (postList) postList.classList.add('hidden');
            }, 250);
        });
    }
})();

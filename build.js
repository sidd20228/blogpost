const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const { marked } = require('marked');
const { Feed } = require('feed');

// ─── Configuration ───────────────────────────────────────────
const SITE = {
  title: 'The Blog',
  description: 'A modern blog powered by GitHub Pages & Actions',
  url: 'https://blog.hacker101.xyz',
  basePath: '', // Custom domain serves at root (no subpath)
  author: 'Admin',
  postsPerPage: 6,
};

const POSTS_DIR = path.join(__dirname, 'posts');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ADMIN_DIR = path.join(__dirname, 'admin');
const DIST_DIR = path.join(__dirname, 'dist');

// ─── Helpers ─────────────────────────────────────────────────
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf-8');
}

function calculateReadingTime(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function generateExcerpt(content, len = 160) {
  const plain = content.replace(/[#*`>\[\]()!_~\-|]/g, '').replace(/\n+/g, ' ').trim();
  return plain.length > len ? plain.slice(0, len).trim() + '...' : plain;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Load Posts ──────────────────────────────────────────────
function loadPosts() {
  const posts = [];

  function readDir(dir) {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        // skip drafts folder for public site
        if (path.basename(full) === 'drafts') continue;
        readDir(full);
      } else if (file.endsWith('.md')) {
        const raw = fs.readFileSync(full, 'utf-8');
        const { attributes, body } = fm(raw);
        if (attributes.status !== 'published') continue;
        const readingTime = calculateReadingTime(body);
        const excerpt = generateExcerpt(body);
        const htmlContent = marked.parse(body);
        posts.push({
          title: attributes.title,
          slug: attributes.slug || slugify(attributes.title),
          author: attributes.author || SITE.author,
          date: attributes.date,
          tags: attributes.tags || [],
          status: attributes.status,
          readingTime,
          excerpt,
          htmlContent,
          filePath: full,
        });
      }
    }
  }

  readDir(POSTS_DIR);
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts;
}

// ─── Template Rendering ──────────────────────────────────────
function render(template, vars) {
  let html = template;
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value ?? '');
  }
  return html;
}

// ─── Generate Tag Badges ─────────────────────────────────────
function tagBadges(tags) {
  return tags.map(t => `<a href="${SITE.basePath}/tags/${slugify(t)}.html" class="tag-badge">${escapeHtml(t)}</a>`).join(' ');
}

// ─── Post Card HTML ──────────────────────────────────────────
function postCard(post) {
  return `
    <article class="post-card">
      <div class="post-card-body">
        <div class="post-card-meta">
          <span class="post-card-date">${formatDate(post.date)}</span>
          <span class="post-card-reading">${post.readingTime} min read</span>
        </div>
        <h2 class="post-card-title">
          <a href="${SITE.basePath}/post/${post.slug}.html">${escapeHtml(post.title)}</a>
        </h2>
        <p class="post-card-excerpt">${escapeHtml(post.excerpt)}</p>
        <div class="post-card-footer">
          <span class="post-card-author">By ${escapeHtml(post.author)}</span>
          <div class="post-card-tags">${tagBadges(post.tags)}</div>
        </div>
      </div>
    </article>`;
}

// ─── Pagination HTML ─────────────────────────────────────────
function paginationHtml(currentPage, totalPages, baseUrl) {
  if (totalPages <= 1) return '';
  let html = '<nav class="pagination" aria-label="Pagination">';
  if (currentPage > 1) {
    const prev = currentPage === 2 ? `${baseUrl}.html` : `${baseUrl}-${currentPage - 1}.html`;
    html += `<a href="${prev}" class="pagination-btn">&larr; Newer</a>`;
  } else {
    html += `<span class="pagination-btn disabled">&larr; Newer</span>`;
  }
  html += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span>`;
  if (currentPage < totalPages) {
    html += `<a href="${baseUrl}-${currentPage + 1}.html" class="pagination-btn">Older &rarr;</a>`;
  } else {
    html += `<span class="pagination-btn disabled">Older &rarr;</span>`;
  }
  html += '</nav>';
  return html;
}

// ─── Build ───────────────────────────────────────────────────
function build() {
  console.log('🔨 Building site...');
  const startTime = Date.now();

  // Clean dist
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  ensureDir(DIST_DIR);

  const posts = loadPosts();
  console.log(`📝 Found ${posts.length} published posts`);

  // Load templates
  const baseTemplate = readTemplate('base.html');
  const homeTemplate = readTemplate('home.html');
  const blogTemplate = readTemplate('blog.html');
  const postTemplate = readTemplate('post.html');
  const tagTemplate = readTemplate('tag.html');

  // ─── Generate posts.json ───────────────────────────────────
  const postsIndex = posts.map(p => ({
    title: p.title,
    slug: p.slug,
    author: p.author,
    date: p.date,
    tags: p.tags,
    excerpt: p.excerpt,
    readingTime: p.readingTime,
  }));
  fs.writeFileSync(path.join(DIST_DIR, 'posts.json'), JSON.stringify(postsIndex, null, 2));
  console.log('📋 Generated posts.json');

  // ─── Generate Home Pages (paginated) ───────────────────────
  const totalPages = Math.max(1, Math.ceil(posts.length / SITE.postsPerPage));
  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * SITE.postsPerPage;
    const pagePosts = posts.slice(start, start + SITE.postsPerPage);
    const cardsHtml = pagePosts.map(postCard).join('\n');
    const pagination = paginationHtml(page, totalPages, `${SITE.basePath}/index`);

    // Collect all tags for sidebar
    const allTags = [...new Set(posts.flatMap(p => p.tags))].sort();
    const tagCloudHtml = allTags.map(t =>
      `<a href="${SITE.basePath}/tags/${slugify(t)}.html" class="tag-badge">${escapeHtml(t)}</a>`
    ).join(' ');

    const pageContent = render(homeTemplate, {
      posts: cardsHtml,
      pagination,
      tagCloud: tagCloudHtml,
      totalPosts: String(posts.length),
    });

    const fullHtml = render(baseTemplate, {
      title: page === 1 ? SITE.title : `${SITE.title} - Page ${page}`,
      description: SITE.description,
      content: pageContent,
      siteTitle: SITE.title,
      canonical: page === 1 ? `${SITE.basePath}/` : `${SITE.basePath}/index-${page}.html`,
      basePath: SITE.basePath,
      ogType: 'website',
      ogImage: '',
    });

    const filename = page === 1 ? 'index.html' : `index-${page}.html`;
    fs.writeFileSync(path.join(DIST_DIR, filename), fullHtml);
  }
  console.log(`🏠 Generated ${totalPages} home page(s)`);

  // ─── Generate Blog Listing Pages ──────────────────────────
  ensureDir(path.join(DIST_DIR, 'blog'));
  for (let page = 1; page <= totalPages; page++) {
    const start = (page - 1) * SITE.postsPerPage;
    const pagePosts = posts.slice(start, start + SITE.postsPerPage);
    const cardsHtml = pagePosts.map(postCard).join('\n');
    const pagination = paginationHtml(page, totalPages, `${SITE.basePath}/blog/index`);

    const pageContent = render(blogTemplate, {
      posts: cardsHtml,
      pagination,
    });

    const fullHtml = render(baseTemplate, {
      title: `Blog${page > 1 ? ` - Page ${page}` : ''} | ${SITE.title}`,
      description: 'Browse all blog posts',
      content: pageContent,
      siteTitle: SITE.title,
      canonical: `${SITE.basePath}/blog/${page === 1 ? 'index' : `index-${page}`}.html`,
      basePath: SITE.basePath,
      ogType: 'website',
      ogImage: '',
    });

    const filename = page === 1 ? 'index.html' : `index-${page}.html`;
    fs.writeFileSync(path.join(DIST_DIR, 'blog', filename), fullHtml);
  }
  console.log(`📚 Generated blog listing pages`);

  // ─── Generate Individual Post Pages ────────────────────────
  ensureDir(path.join(DIST_DIR, 'post'));
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const prev = i < posts.length - 1 ? posts[i + 1] : null;
    const next = i > 0 ? posts[i - 1] : null;

    let navHtml = '<nav class="post-nav">';
    if (prev) {
      navHtml += `<a href="${SITE.basePath}/post/${prev.slug}.html" class="post-nav-link post-nav-prev"><span class="post-nav-label">&larr; Previous</span><span class="post-nav-title">${escapeHtml(prev.title)}</span></a>`;
    } else {
      navHtml += '<span class="post-nav-link"></span>';
    }
    if (next) {
      navHtml += `<a href="${SITE.basePath}/post/${next.slug}.html" class="post-nav-link post-nav-next"><span class="post-nav-label">Next &rarr;</span><span class="post-nav-title">${escapeHtml(next.title)}</span></a>`;
    } else {
      navHtml += '<span class="post-nav-link"></span>';
    }
    navHtml += '</nav>';

    const pageContent = render(postTemplate, {
      title: post.title,
      author: post.author,
      date: formatDate(post.date),
      rawDate: post.date,
      readingTime: String(post.readingTime),
      tags: tagBadges(post.tags),
      content: post.htmlContent,
      postNav: navHtml,
    });

    const fullHtml = render(baseTemplate, {
      title: `${post.title} | ${SITE.title}`,
      description: post.excerpt,
      content: pageContent,
      siteTitle: SITE.title,
      canonical: `${SITE.basePath}/post/${post.slug}.html`,
      basePath: SITE.basePath,
      ogType: 'article',
      ogImage: '',
    });

    fs.writeFileSync(path.join(DIST_DIR, 'post', `${post.slug}.html`), fullHtml);
  }
  console.log(`📄 Generated ${posts.length} post pages`);

  // ─── Generate Tag Pages ────────────────────────────────────
  const tagMap = {};
  for (const post of posts) {
    for (const tag of post.tags) {
      const key = slugify(tag);
      if (!tagMap[key]) tagMap[key] = { name: tag, posts: [] };
      tagMap[key].posts.push(post);
    }
  }

  ensureDir(path.join(DIST_DIR, 'tags'));

  // Tags index page
  const allTagsHtml = Object.entries(tagMap)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([key, { name, posts: tagPosts }]) =>
      `<a href="${SITE.basePath}/tags/${key}.html" class="tag-page-link"><span class="tag-name">${escapeHtml(name)}</span><span class="tag-count">${tagPosts.length}</span></a>`
    ).join('\n');

  const tagsIndexContent = `
    <div class="tags-page">
      <h1 class="page-title">All Tags</h1>
      <div class="tags-grid">${allTagsHtml}</div>
    </div>`;

  const tagsIndexFull = render(baseTemplate, {
    title: `Tags | ${SITE.title}`,
    description: 'Browse posts by tag',
    content: tagsIndexContent,
    siteTitle: SITE.title,
    canonical: `${SITE.basePath}/tags/index.html`,
    basePath: SITE.basePath,
    ogType: 'website',
    ogImage: '',
  });
  fs.writeFileSync(path.join(DIST_DIR, 'tags', 'index.html'), tagsIndexFull);

  for (const [key, { name, posts: tagPosts }] of Object.entries(tagMap)) {
    const cardsHtml = tagPosts.map(postCard).join('\n');
    const pageContent = render(tagTemplate, {
      tagName: name,
      posts: cardsHtml,
      count: String(tagPosts.length),
    });
    const fullHtml = render(baseTemplate, {
      title: `Posts tagged "${name}" | ${SITE.title}`,
      description: `Browse posts tagged with ${name}`,
      content: pageContent,
      siteTitle: SITE.title,
      canonical: `${SITE.basePath}/tags/${key}.html`,
      basePath: SITE.basePath,
      ogType: 'website',
      ogImage: '',
    });
    fs.writeFileSync(path.join(DIST_DIR, 'tags', `${key}.html`), fullHtml);
  }
  console.log(`🏷️  Generated ${Object.keys(tagMap).length} tag pages`);

  // ─── Generate RSS Feed ─────────────────────────────────────
  const feed = new Feed({
    title: SITE.title,
    description: SITE.description,
    id: SITE.url || 'https://example.github.io/blog_page',
    link: SITE.url || 'https://example.github.io/blog_page',
    language: 'en',
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    author: { name: SITE.author },
  });

  for (const post of posts.slice(0, 20)) {
    feed.addItem({
      title: post.title,
      id: `${SITE.url}/post/${post.slug}.html`,
      link: `${SITE.url}/post/${post.slug}.html`,

      description: post.excerpt,
      content: post.htmlContent,
      author: [{ name: post.author }],
      date: new Date(post.date),
    });
  }

  fs.writeFileSync(path.join(DIST_DIR, 'rss.xml'), feed.rss2());
  console.log('📡 Generated RSS feed');

  // ─── Generate Sitemap ──────────────────────────────────────
  const sitemapUrls = [
    { loc: `${SITE.basePath}/`, priority: '1.0' },
    { loc: `${SITE.basePath}/blog/index.html`, priority: '0.9' },
    { loc: `${SITE.basePath}/tags/index.html`, priority: '0.7' },
  ];
  for (const post of posts) {
    sitemapUrls.push({ loc: `${SITE.basePath}/post/${post.slug}.html`, priority: '0.8', lastmod: post.date });
  }
  for (const key of Object.keys(tagMap)) {
    sitemapUrls.push({ loc: `${SITE.basePath}/tags/${key}.html`, priority: '0.6' });
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url>
    <loc>${SITE.url}${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml);
  console.log('🗺️  Generated sitemap.xml');

  // ─── Copy Public Assets ────────────────────────────────────
  function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    ensureDir(dest);
    for (const item of fs.readdirSync(src)) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      if (fs.statSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyDir(path.join(PUBLIC_DIR, 'css'), path.join(DIST_DIR, 'css'));
  copyDir(path.join(PUBLIC_DIR, 'js'), path.join(DIST_DIR, 'js'));
  copyDir(path.join(PUBLIC_DIR, 'images'), path.join(DIST_DIR, 'images'));
  console.log('📁 Copied public assets');

  // ─── Copy Admin Dashboard ─────────────────────────────────
  copyDir(ADMIN_DIR, path.join(DIST_DIR, 'admin'));
  console.log('🔧 Copied admin dashboard');

  const elapsed = Date.now() - startTime;
  console.log(`\n✅ Build complete in ${elapsed}ms`);
  console.log(`   Output: ${DIST_DIR}`);
}

// ─── Watch Mode ──────────────────────────────────────────────
if (process.argv.includes('--watch')) {
  build();
  try {
    const chokidar = require('chokidar');
    console.log('\n👀 Watching for changes...');
    const watcher = chokidar.watch([POSTS_DIR, TEMPLATES_DIR, PUBLIC_DIR, ADMIN_DIR], {
      ignoreInitial: true,
    });
    watcher.on('all', (event, filePath) => {
      console.log(`\n🔄 ${event}: ${filePath}`);
      try { build(); } catch (e) { console.error('Build error:', e.message); }
    });
  } catch (e) {
    console.log('Install chokidar for watch mode: npm install chokidar');
  }
} else {
  build();
}

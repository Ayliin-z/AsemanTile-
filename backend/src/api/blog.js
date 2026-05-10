// backend/src/api/blog.js
import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

// ========== توابع کمکی داخلی ==========
// تبدیل رکورد دیتابیس به فرمت JSON
const normalizePost = (row) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  excerpt: row.excerpt,
  content: row.content,
  image: row.image,
  meta_title: row.meta_title,
  meta_description: row.meta_description,
  tags: row.tags ? JSON.parse(row.tags) : [],
  views: row.views,
  is_published: row.is_published === 1,
  show_on_homepage: row.show_on_homepage === 1,
  created_by: row.created_by,
  created_at: row.created_at,
  updated_at: row.updated_at
});

// ========== GET /api/blog ==========
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, is_published, tag, search } = req.query;
    let sql = 'SELECT * FROM blog_posts WHERE 1=1';
    const params = [];

    if (is_published !== undefined) {
      sql += ' AND is_published = ?';
      params.push(is_published === 'true' ? 1 : 0);
    }
    if (tag) {
      sql += ' AND JSON_SEARCH(tags, "one", ?) IS NOT NULL';
      params.push(tag);
    }
    if (search) {
      sql += ' AND (title LIKE ? OR content LIKE ? OR excerpt LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const result = await query(sql, params);
    const posts = result.rows.map(normalizePost);

    // دریافت تعداد کل برای صفحه‌بندی
    let countSql = 'SELECT COUNT(*) as total FROM blog_posts WHERE 1=1';
    const countParams = [];
    if (is_published !== undefined) {
      countSql += ' AND is_published = ?';
      countParams.push(is_published === 'true' ? 1 : 0);
    }
    if (tag) {
      countSql += ' AND JSON_SEARCH(tags, "one", ?) IS NOT NULL';
      countParams.push(tag);
    }
    if (search) {
      countSql += ' AND (title LIKE ? OR content LIKE ? OR excerpt LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const countResult = await query(countSql, countParams);
    const total = countResult.rows[0].total;

    res.json({
      posts,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('GET /api/blog error:', error);
    res.status(500).json({ error: 'خطا در دریافت پست‌ها' });
  }
});

// ========== GET /api/blog/published ==========
router.get('/published', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await query(
      'SELECT * FROM blog_posts WHERE is_published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [parseInt(limit), offset]
    );
    const countResult = await query('SELECT COUNT(*) as total FROM blog_posts WHERE is_published = 1');
    const total = countResult.rows[0].total;
    res.json({
      posts: result.rows.map(normalizePost),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('GET /api/blog/published error:', error);
    res.status(500).json({ error: 'خطا در دریافت پست‌های منتشر شده' });
  }
});

// ========== GET /api/blog/homepage ==========
router.get('/homepage', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM blog_posts WHERE show_on_homepage = 1 ORDER BY created_at DESC LIMIT 3'
    );
    res.json(result.rows.map(normalizePost));
  } catch (error) {
    console.error('GET /api/blog/homepage error:', error);
    res.status(500).json({ error: 'خطا در دریافت پست‌های صفحه اصلی' });
  }
});

// ========== GET /api/blog/most-viewed ==========
router.get('/most-viewed', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const result = await query(
      'SELECT * FROM blog_posts WHERE is_published = 1 ORDER BY views DESC LIMIT ?',
      [parseInt(limit)]
    );
    res.json(result.rows.map(normalizePost));
  } catch (error) {
    console.error('GET /api/blog/most-viewed error:', error);
    res.status(500).json({ error: 'خطا در دریافت پست‌های پربازدید' });
  }
});

// ========== GET /api/blog/tags ==========
router.get('/tags', async (req, res) => {
  try {
    // استخراج تگ‌های یکتا از ستون JSON در همه پست‌ها
    const result = await query('SELECT DISTINCT JSON_EXTRACT(tags, "$[*]") as all_tags FROM blog_posts WHERE tags IS NOT NULL');
    const tagsSet = new Set();
    for (const row of result.rows) {
      const arr = JSON.parse(row.all_tags);
      if (Array.isArray(arr)) {
        arr.forEach(tag => tagsSet.add(tag));
      }
    }
    res.json(Array.from(tagsSet).sort());
  } catch (error) {
    console.error('GET /api/blog/tags error:', error);
    res.status(500).json({ error: 'خطا در دریافت تگ‌ها' });
  }
});

// ========== GET /api/blog/stats ==========
router.get('/stats', async (req, res) => {
  try {
    const totalResult = await query('SELECT COUNT(*) as total FROM blog_posts');
    const publishedResult = await query('SELECT COUNT(*) as published FROM blog_posts WHERE is_published = 1');
    const draftResult = await query('SELECT COUNT(*) as draft FROM blog_posts WHERE is_published = 0');
    const viewsResult = await query('SELECT SUM(views) as total_views FROM blog_posts');
    const monthResult = await query(`SELECT COUNT(*) as posts_this_month FROM blog_posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`);
    
    const mostViewed = await query('SELECT * FROM blog_posts WHERE is_published = 1 ORDER BY views DESC LIMIT 1');
    const mostViewedPost = mostViewed.rows.length ? normalizePost(mostViewed.rows[0]) : null;
    
    const stats = {
      total: totalResult.rows[0].total,
      published: publishedResult.rows[0].published,
      draft: draftResult.rows[0].draft,
      total_views: viewsResult.rows[0].total_views || 0,
      average_views: totalResult.rows[0].total ? Math.floor(viewsResult.rows[0].total_views / totalResult.rows[0].total) : 0,
      posts_this_month: monthResult.rows[0].posts_this_month,
      most_viewed: mostViewedPost
    };
    res.json(stats);
  } catch (error) {
    console.error('GET /api/blog/stats error:', error);
    res.status(500).json({ error: 'خطا در دریافت آمار' });
  }
});

// ========== GET /api/blog/:id ==========
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('SELECT * FROM blog_posts WHERE id = ?', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'پست یافت نشد' });
    // افزایش بازدید
    await query('UPDATE blog_posts SET views = views + 1 WHERE id = ?', [id]);
    res.json(normalizePost(result.rows[0]));
  } catch (error) {
    console.error('GET /api/blog/:id error:', error);
    res.status(500).json({ error: 'خطا در دریافت پست' });
  }
});

// ========== GET /api/blog/slug/:slug ==========
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await query('SELECT * FROM blog_posts WHERE slug = ?', [slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'پست یافت نشد' });
    // افزایش بازدید
    await query('UPDATE blog_posts SET views = views + 1 WHERE id = ?', [result.rows[0].id]);
    res.json(normalizePost(result.rows[0]));
  } catch (error) {
    console.error('GET /api/blog/slug/:slug error:', error);
    res.status(500).json({ error: 'خطا در دریافت پست' });
  }
});

// ========== GET /api/blog/:id/related ==========
router.get('/:id/related', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { limit = 3 } = req.query;
    // ابتدا تگ‌های پست فعلی را بگیریم
    const postResult = await query('SELECT tags FROM blog_posts WHERE id = ?', [id]);
    if (postResult.rows.length === 0) return res.status(404).json({ error: 'پست یافت نشد' });
    const tags = postResult.rows[0].tags ? JSON.parse(postResult.rows[0].tags) : [];
    if (tags.length === 0) {
      // اگر تگی ندارد، پست‌های جدید را برگردان
      const latest = await query('SELECT * FROM blog_posts WHERE id != ? AND is_published = 1 ORDER BY created_at DESC LIMIT ?', [id, parseInt(limit)]);
      return res.json(latest.rows.map(normalizePost));
    }
    // ساخت شرط LIKE برای هر تگ (ساده)
    let tagConditions = tags.map(() => 'JSON_SEARCH(tags, "one", ?) IS NOT NULL').join(' OR ');
    const params = [id];
    params.push(...tags);
    params.push(parseInt(limit));
    const sql = `SELECT * FROM blog_posts WHERE id != ? AND is_published = 1 AND (${tagConditions}) ORDER BY created_at DESC LIMIT ?`;
    const result = await query(sql, params);
    res.json(result.rows.map(normalizePost));
  } catch (error) {
    console.error('GET /api/blog/:id/related error:', error);
    res.status(500).json({ error: 'خطا در دریافت پست‌های مرتبط' });
  }
});

// ========== POST /api/blog ==========
router.post('/', async (req, res) => {
  try {
    const { title, slug, excerpt, content, image, meta_title, meta_description, tags, status, show_on_homepage } = req.body;
    const userId = req.body.created_by || 1;
    if (!title || !slug || !content) {
      return res.status(400).json({ error: 'عنوان، اسلاگ و محتوا الزامی است' });
    }
    // بررسی یکتایی اسلاگ
    const existing = await query('SELECT id FROM blog_posts WHERE slug = ?', [slug]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'اسلاگ تکراری است' });
    }
    const tagsJson = tags ? JSON.stringify(tags) : '[]';
    const is_published = status === 'published' ? 1 : 0;
    const showHome = show_on_homepage ? 1 : 0;
    const result = await query(
      `INSERT INTO blog_posts 
       (title, slug, excerpt, content, image, meta_title, meta_description, tags, is_published, show_on_homepage, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, slug, excerpt || null, content, image || null, meta_title || title, meta_description || excerpt || content.substring(0,160), tagsJson, is_published, showHome, userId]
    );
    const newId = result.insertId;
    const newPost = await query('SELECT * FROM blog_posts WHERE id = ?', [newId]);
    res.status(201).json(normalizePost(newPost.rows[0]));
  } catch (error) {
    console.error('POST /api/blog error:', error);
    res.status(500).json({ error: error.message || 'خطا در ایجاد پست' });
  }
});

// ========== PUT /api/blog/:id ==========
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, slug, excerpt, content, image, meta_title, meta_description, tags, status, show_on_homepage } = req.body;
    const userId = req.body.created_by || 1;
    // بررسی وجود پست
    const existing = await query('SELECT id FROM blog_posts WHERE id = ?', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'پست یافت نشد' });
    // بررسی یکتایی اسلاگ (اگر تغییر کرده)
    if (slug) {
      const slugCheck = await query('SELECT id FROM blog_posts WHERE slug = ? AND id != ?', [slug, id]);
      if (slugCheck.rows.length > 0) return res.status(409).json({ error: 'اسلاگ تکراری است' });
    }
    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (slug !== undefined) { updates.push('slug = ?'); params.push(slug); }
    if (excerpt !== undefined) { updates.push('excerpt = ?'); params.push(excerpt); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (image !== undefined) { updates.push('image = ?'); params.push(image); }
    if (meta_title !== undefined) { updates.push('meta_title = ?'); params.push(meta_title); }
    if (meta_description !== undefined) { updates.push('meta_description = ?'); params.push(meta_description); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }
    if (status !== undefined) { updates.push('is_published = ?'); params.push(status === 'published' ? 1 : 0); }
    if (show_on_homepage !== undefined) { updates.push('show_on_homepage = ?'); params.push(show_on_homepage ? 1 : 0); }
    updates.push('updated_at = NOW()');
    params.push(id);
    await query(`UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`, params);
    const updated = await query('SELECT * FROM blog_posts WHERE id = ?', [id]);
    res.json(normalizePost(updated.rows[0]));
  } catch (error) {
    console.error('PUT /api/blog/:id error:', error);
    res.status(500).json({ error: error.message || 'خطا در به‌روزرسانی پست' });
  }
});

// ========== PATCH /api/blog/:id/toggle-publish ==========
router.patch('/:id/toggle-publish', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const post = await query('SELECT is_published FROM blog_posts WHERE id = ?', [id]);
    if (post.rows.length === 0) return res.status(404).json({ error: 'پست یافت نشد' });
    const newStatus = post.rows[0].is_published ? 0 : 1;
    await query('UPDATE blog_posts SET is_published = ?, updated_at = NOW() WHERE id = ?', [newStatus, id]);
    const updated = await query('SELECT * FROM blog_posts WHERE id = ?', [id]);
    res.json(normalizePost(updated.rows[0]));
  } catch (error) {
    console.error('PATCH /api/blog/:id/toggle-publish error:', error);
    res.status(500).json({ error: error.message || 'خطا در تغییر وضعیت انتشار' });
  }
});

// ========== DELETE /api/blog/:id ==========
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('DELETE FROM blog_posts WHERE id = ?', [id]);
    if (result.rows.affectedRows === 0) return res.status(404).json({ error: 'پست یافت نشد' });
    res.json({ message: 'پست با موفقیت حذف شد' });
  } catch (error) {
    console.error('DELETE /api/blog/:id error:', error);
    res.status(500).json({ error: error.message || 'خطا در حذف پست' });
  }
});

export default router;
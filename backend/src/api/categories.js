// backend/src/api/categories.js
import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

// ========== توابع کمکی ==========

// ساخت اسلاگ از نام
const generateSlug = (name) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\uFB8A\u067E\u0686\u06AF\u06A9\u06CCa-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// ساخت ساختار درختی (با استفاده از داده‌های دیتابیس)
const buildCategoryTree = (categoriesList, parentId = null) => {
  return categoriesList
    .filter(cat => cat.parent_id === parentId)
    .map(cat => ({
      ...cat,
      children: buildCategoryTree(categoriesList, cat.id)
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
};

// ========== GET /api/categories ==========
// دریافت همه دسته‌بندی‌ها (به صورت درختی یا تخت)
router.get('/', async (req, res) => {
  try {
    const { flat } = req.query;
    
    // دریافت همه رکوردها از دیتابیس
    const result = await query('SELECT * FROM categories ORDER BY sort_order');
    const categories = result.rows;
    
    if (flat === 'true') {
      // برگرداندن لیست تخت (بدون ساختار درختی)
      return res.json({ success: true, data: categories });
    }
    
    // برگرداندن ساختار درختی
    const tree = buildCategoryTree(categories);
    res.json({ success: true, data: tree });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/categories/:id ==========
// دریافت یک دسته‌بندی با ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('SELECT * FROM categories WHERE id = ?', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'دسته‌بندی یافت نشد' });
    }
    
    const category = result.rows[0];
    
    // دریافت زیرمجموعه‌ها
    const childrenResult = await query('SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order', [id]);
    
    res.json({ 
      success: true, 
      data: {
        ...category,
        children: childrenResult.rows
      }
    });
  } catch (error) {
    console.error('GET /api/categories/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/categories/slug/:slug ==========
// دریافت دسته‌بندی با slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await query('SELECT * FROM categories WHERE slug = ?', [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'دسته‌بندی یافت نشد' });
    }
    
    const category = result.rows[0];
    
    // دریافت زیرمجموعه‌ها
    const childrenResult = await query('SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order', [category.id]);
    
    // دریافت دسته والد
    let parent = null;
    if (category.parent_id) {
      const parentResult = await query('SELECT * FROM categories WHERE id = ?', [category.parent_id]);
      if (parentResult.rows.length > 0) {
        parent = parentResult.rows[0];
      }
    }
    
    res.json({ 
      success: true, 
      data: {
        ...category,
        children: childrenResult.rows,
        parent
      }
    });
  } catch (error) {
    console.error('GET /api/categories/slug/:slug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/categories ==========
// ایجاد دسته‌بندی جدید
router.post('/', async (req, res) => {
  try {
    const { name, slug, parent_id, image, sort_order } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'نام دسته‌بندی الزامی است' });
    }
    
    // تولید slug اگر داده نشده
    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = generateSlug(name);
    }
    
    // بررسی یکتایی slug
    const existingSlug = await query('SELECT id FROM categories WHERE slug = ?', [finalSlug]);
    if (existingSlug.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'این slug قبلاً استفاده شده است' });
    }
    
    // بررسی وجود والد (اگر مشخص شده)
    if (parent_id) {
      const parent = await query('SELECT id FROM categories WHERE id = ?', [parent_id]);
      if (parent.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'دسته والد یافت نشد' });
      }
    }
    
    const sortOrderValue = sort_order !== undefined ? sort_order : 0;
    
    const result = await query(
      `INSERT INTO categories (name, slug, parent_id, image, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [name.trim(), finalSlug, parent_id || null, image || null, sortOrderValue]
    );
    
    const newId = result.insertId;
    const newCategory = await query('SELECT * FROM categories WHERE id = ?', [newId]);
    
    res.status(201).json({ success: true, data: newCategory.rows[0] });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PUT /api/categories/:id ==========
// به‌روزرسانی دسته‌بندی
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, slug, parent_id, image, sort_order } = req.body;
    
    // بررسی وجود دسته‌بندی
    const existing = await query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'دسته‌بندی یافت نشد' });
    }
    
    // بررسی اینکه والد خودش نباشد
    if (parent_id === id) {
      return res.status(400).json({ success: false, error: 'دسته نمی‌تواند والد خودش باشد' });
    }
    
    // بررسی وجود والد (اگر مشخص شده)
    if (parent_id) {
      const parent = await query('SELECT id FROM categories WHERE id = ?', [parent_id]);
      if (parent.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'دسته والد یافت نشد' });
      }
    }
    
    let updateFields = [];
    let params = [];
    
    if (name && name.trim() !== '') {
      updateFields.push('name = ?');
      params.push(name.trim());
    }
    
    if (slug && slug.trim() !== '') {
      // بررسی یکتایی slug
      const existingSlug = await query('SELECT id FROM categories WHERE slug = ? AND id != ?', [slug.trim(), id]);
      if (existingSlug.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'این slug قبلاً استفاده شده است' });
      }
      updateFields.push('slug = ?');
      params.push(slug.trim());
    }
    
    if (parent_id !== undefined) {
      updateFields.push('parent_id = ?');
      params.push(parent_id || null);
    }
    
    if (image !== undefined) {
      updateFields.push('image = ?');
      params.push(image);
    }
    
    if (sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      params.push(sort_order);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است' });
    }
    
    updateFields.push('updated_at = NOW()');
    params.push(id);
    
    await query(`UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`, params);
    
    const updatedCategory = await query('SELECT * FROM categories WHERE id = ?', [id]);
    res.json({ success: true, data: updatedCategory.rows[0] });
  } catch (error) {
    console.error('PUT /api/categories/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== DELETE /api/categories/:id ==========
// حذف دسته‌بندی
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // بررسی وجود زیرمجموعه
    const children = await query('SELECT id FROM categories WHERE parent_id = ?', [id]);
    if (children.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'این دسته‌بندی دارای زیرمجموعه است. ابتدا زیرمجموعه‌ها را حذف یا جابه‌جا کنید.' 
      });
    }
    
    const result = await query('DELETE FROM categories WHERE id = ?', [id]);
    if (result.rows.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'دسته‌بندی یافت نشد' });
    }
    
    res.json({ success: true, message: 'دسته‌بندی با موفقیت حذف شد' });
  } catch (error) {
    console.error('DELETE /api/categories/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PATCH /api/categories/reorder ==========
// تغییر ترتیب دسته‌بندی‌ها
router.patch('/reorder', async (req, res) => {
  try {
    const { orders } = req.body; // [{ id: 1, sort_order: 0 }, ...]
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ 
        success: false, 
        error: 'آرایه‌ای از ترتیب‌ها ارسال کنید' 
      });
    }
    
    // اجرای به‌روزرسانی‌ها در یک تراکنش
    for (const item of orders) {
      await query('UPDATE categories SET sort_order = ?, updated_at = NOW() WHERE id = ?', [item.sort_order, item.id]);
    }
    
    res.json({ success: true, message: 'ترتیب با موفقیت به‌روزرسانی شد' });
  } catch (error) {
    console.error('PATCH /api/categories/reorder error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/categories/parents ==========
// دریافت دسته‌بندی‌های والد (برای منوی اصلی)
router.get('/parents/list', async (req, res) => {
  try {
    const result = await query('SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('GET /api/categories/parents error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/categories/:id/children ==========
// دریافت زیرمجموعه‌های یک دسته
router.get('/:id/children', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const category = await query('SELECT id FROM categories WHERE id = ?', [id]);
    if (category.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'دسته‌بندی یافت نشد' });
    }
    
    const children = await query('SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order', [id]);
    res.json({ success: true, data: children.rows });
  } catch (error) {
    console.error('GET /api/categories/:id/children error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
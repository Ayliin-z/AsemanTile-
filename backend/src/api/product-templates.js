import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

// GET /api/product-templates
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM product_templates ORDER BY size');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت قالب‌ها' });
  }
});

// POST /api/product-templates
router.post('/', async (req, res) => {
  try {
    const { size, glaze_type, title, description, usage_guide, maintenance } = req.body;
    const result = await query(
      'INSERT INTO product_templates (size, glaze_type, title, description, usage_guide, maintenance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [size || null, glaze_type || null, title, description, usage_guide || null, maintenance || null]
    );
    const newId = result.insertId;
    const newTemplate = await query('SELECT * FROM product_templates WHERE id = ?', [newId]);
    res.status(201).json(newTemplate.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در افزودن قالب' });
  }
});

// PUT /api/product-templates/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { size, glaze_type, title, description, usage_guide, maintenance } = req.body;
    const result = await query(
      `UPDATE product_templates SET size = ?, glaze_type = ?, title = ?, description = ?, usage_guide = ?, maintenance = ?, updated_at = NOW() WHERE id = ?`,
      [size || null, glaze_type || null, title, description, usage_guide || null, maintenance || null, id]
    );
    if (result.rows.affectedRows === 0) return res.status(404).json({ error: 'قالب یافت نشد' });
    const updated = await query('SELECT * FROM product_templates WHERE id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی قالب' });
  }
});

// DELETE /api/product-templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('DELETE FROM product_templates WHERE id = ?', [id]);
    if (result.rows.affectedRows === 0) return res.status(404).json({ error: 'قالب یافت نشد' });
    res.json({ message: 'قالب حذف شد' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در حذف قالب' });
  }
});

export default router;
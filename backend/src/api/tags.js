import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

// GET /api/tags
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM tags ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت تگ‌ها' });
  }
});

// POST /api/tags
router.post('/', async (req, res) => {
  try {
    const { name, enabled } = req.body;
    if (!name) return res.status(400).json({ error: 'نام تگ الزامی است' });
    const existing = await query('SELECT id FROM tags WHERE name = ?', [name]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'این تگ قبلاً وجود دارد' });
    const result = await query(
      'INSERT INTO tags (name, enabled, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
      [name, enabled !== undefined ? (enabled ? 1 : 0) : 1]
    );
    const newId = result.insertId;
    const newTag = await query('SELECT * FROM tags WHERE id = ?', [newId]);
    res.status(201).json(newTag.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در افزودن تگ' });
  }
});

// PUT /api/tags/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, enabled } = req.body;
    const result = await query(
      'UPDATE tags SET name = ?, enabled = ?, updated_at = NOW() WHERE id = ?',
      [name, enabled !== undefined ? (enabled ? 1 : 0) : undefined, id]
    );
    if (result.rows.affectedRows === 0) return res.status(404).json({ error: 'تگ یافت نشد' });
    const updated = await query('SELECT * FROM tags WHERE id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی تگ' });
  }
});

// DELETE /api/tags/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('DELETE FROM tags WHERE id = ?', [id]);
    if (result.rows.affectedRows === 0) return res.status(404).json({ error: 'تگ یافت نشد' });
    res.json({ message: 'تگ حذف شد' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در حذف تگ' });
  }
});

// PATCH /api/tags/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tag = await query('SELECT enabled FROM tags WHERE id = ?', [id]);
    if (tag.rows.length === 0) return res.status(404).json({ error: 'تگ یافت نشد' });
    const newEnabled = tag.rows[0].enabled ? 0 : 1;
    await query('UPDATE tags SET enabled = ?, updated_at = NOW() WHERE id = ?', [newEnabled, id]);
    const updated = await query('SELECT * FROM tags WHERE id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در تغییر وضعیت تگ' });
  }
});

export default router;
// backend/src/api/brands.cjs
const express = require('express');
const router = express.Router();

module.exports = function(promisePool) {
  // GET /api/brands - دریافت همه برندها
  router.get('/', async (req, res) => {
    try {
      const [rows] = await promisePool.query('SELECT * FROM brands ORDER BY name');
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'خطا در دریافت برندها' });
    }
  });

  // GET /api/brands/name/:name - دریافت برند با نام
  router.get('/name/:name', async (req, res) => {
    try {
      const name = decodeURIComponent(req.params.name);
      console.log('Searching for brand:', name);
      
      const [rows] = await promisePool.query('SELECT * FROM brands WHERE name = ?', [name]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'برند یافت نشد' });
      }
      
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/brands/:id
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await promisePool.query('SELECT * FROM brands WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: 'برند یافت نشد' });
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/brands
  router.post('/', async (req, res) => {
    const { name, enabled, logo, address, description, website, phone, email } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'نام برند الزامی است' });
    
    try {
      const [existing] = await promisePool.query('SELECT id FROM brands WHERE name = ?', [name]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, error: 'این برند قبلاً وجود دارد' });
      }
      
      const [result] = await promisePool.query(
        `INSERT INTO brands (name, enabled, logo, address, description, website, phone, email, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [name, enabled !== undefined ? (enabled ? 1 : 0) : 1, logo || null, address || null, description || null, website || null, phone || null, email || null]
      );
      
      const [rows] = await promisePool.query('SELECT * FROM brands WHERE id = ?', [result.insertId]);
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'خطا در افزودن برند' });
    }
  });

  // PUT /api/brands/:id
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, enabled, logo, address, description, website, phone, email } = req.body;
    try {
      const [updateResult] = await promisePool.query(
        `UPDATE brands SET name=?, enabled=?, logo=?, address=?, description=?, website=?, phone=?, email=?, updated_at=NOW() 
         WHERE id=?`,
        [name, enabled !== undefined ? (enabled ? 1 : 0) : 1, logo || null, address || null, description || null, website || null, phone || null, email || null, id]
      );
      if (updateResult.affectedRows === 0) return res.status(404).json({ success: false, error: 'برند یافت نشد' });
      const [rows] = await promisePool.query('SELECT * FROM brands WHERE id = ?', [id]);
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'خطا در به‌روزرسانی برند' });
    }
  });

  // DELETE /api/brands/:id
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [result] = await promisePool.query('DELETE FROM brands WHERE id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'برند یافت نشد' });
      res.json({ success: true, message: 'برند حذف شد' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'خطا در حذف برند' });
    }
  });

  // PATCH /api/brands/:id/toggle
  router.patch('/:id/toggle', async (req, res) => {
    const { id } = req.params;
    try {
      const [rows] = await promisePool.query('SELECT enabled FROM brands WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: 'برند یافت نشد' });
      const newEnabled = rows[0].enabled ? 0 : 1;
      await promisePool.query('UPDATE brands SET enabled = ?, updated_at = NOW() WHERE id = ?', [newEnabled, id]);
      const [updated] = await promisePool.query('SELECT * FROM brands WHERE id = ?', [id]);
      res.json({ success: true, data: updated[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'خطا در تغییر وضعیت برند' });
    }
  });

  return router;
};
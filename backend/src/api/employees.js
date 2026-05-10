import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../utils/db.js';

const router = express.Router();

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT id, name, email, permissions, is_active, created_at FROM employees ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت کارمندان' });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('SELECT id, name, email, permissions, is_active, created_at FROM employees WHERE id = ?', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'کارمند یافت نشد' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت کارمند' });
  }
});

// POST /api/employees
router.post('/', async (req, res) => {
  try {
    const { name, email, password, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'نام، ایمیل و رمز عبور الزامی است' });
    }
    const existing = await query('SELECT id FROM employees WHERE email = ?', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'این ایمیل قبلاً ثبت شده است' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const permsJson = JSON.stringify(permissions || []);
    const result = await query(
      'INSERT INTO employees (name, email, password, permissions, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())',
      [name, email, hashed, permsJson]
    );
    const newId = result.insertId;
    const newEmp = await query('SELECT id, name, email, permissions, is_active, created_at FROM employees WHERE id = ?', [newId]);
    res.status(201).json(newEmp.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در افزودن کارمند' });
  }
});

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, password, permissions, is_active } = req.body;
    let sql = 'UPDATE employees SET name = COALESCE(?, name), email = COALESCE(?, email), permissions = COALESCE(?, permissions), is_active = COALESCE(?, is_active), updated_at = NOW()';
    const params = [name, email, JSON.stringify(permissions), is_active];
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      sql += ', password = ?';
      params.push(hashed);
    }
    sql += ' WHERE id = ?';
    params.push(id);
    const result = await query(sql, params);
    if (result.rows.affectedRows === 0) return res.status(404).json({ error: 'کارمند یافت نشد' });
    const updated = await query('SELECT id, name, email, permissions, is_active, created_at FROM employees WHERE id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی کارمند' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('DELETE FROM employees WHERE id = ?', [id]);
    if (result.rows.affectedRows === 0) return res.status(404).json({ error: 'کارمند یافت نشد' });
    res.json({ message: 'کارمند حذف شد' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در حذف کارمند' });
  }
});

// POST /api/employees/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await query('SELECT id, name, email, password, permissions, is_active FROM employees WHERE email = ?', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
    const emp = result.rows[0];
    const valid = await bcrypt.compare(password, emp.password);
    if (!valid) return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
    if (!emp.is_active) return res.status(403).json({ error: 'حساب کاربری غیرفعال است' });
    const { password: _, ...safeEmp } = emp;
    res.json(safeEmp);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در ورود' });
  }
});

export default router;
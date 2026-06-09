// backend/src/api/contact.js
import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

// ========== POST /api/contact ==========
// ایجاد درخواست تماس جدید (بدون نیاز به احراز هویت)
router.post('/', async (req, res) => {
  try {
    const { name, mobile, city, area_m2, message } = req.body;
    
    if (!name || !mobile) {
      return res.status(400).json({ 
        success: false, 
        error: 'نام و شماره موبایل الزامی است' 
      });
    }
    
    // اعتبارسنجی شماره موبایل
    let normalizedMobile = mobile.toString();
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }
    
    if (normalizedMobile.length < 10 || normalizedMobile.length > 11) {
      return res.status(400).json({ 
        success: false, 
        error: 'شماره موبایل معتبر نیست' 
      });
    }
    
    // اعتبارسنجی متراژ (اختیاری)
    let normalizedArea = null;
    if (area_m2) {
      normalizedArea = parseInt(area_m2);
      if (isNaN(normalizedArea) || normalizedArea <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'متراژ باید عددی مثبت باشد' 
        });
      }
    }
    
    const result = await query(
      `INSERT INTO contact_requests (name, mobile, city, area_m2, message, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'new', NOW(), NOW())`,
      [name.trim(), normalizedMobile, city?.trim() || null, normalizedArea, message?.trim() || null]
    );
    
    const newId = result.insertId;
    
    console.log(`📞 درخواست تماس جدید از ${name} - موبایل: ${normalizedMobile}`);
    
    res.status(201).json({ 
      success: true, 
      message: 'درخواست شما با موفقیت ثبت شد. کارشناسان ما به زودی با شما تماس می‌گیرند.',
      data: {
        id: newId,
        status: 'new'
      }
    });
  } catch (error) {
    console.error('POST /api/contact error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/contact ==========
// دریافت همه درخواست‌های تماس (ادمین/کارمند)
router.get('/', async (req, res) => {
  try {
    const { status, from_date, to_date, limit, offset } = req.query;
    
    let sql = 'SELECT * FROM contact_requests WHERE 1=1';
    let params = [];
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    if (from_date) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(from_date);
    }
    
    if (to_date) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(to_date);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);
    
    const result = await query(sql, params);
    
    // آمار وضعیت‌ها
    const statsResult = await query(`
      SELECT 
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN status = 'followed' THEN 1 ELSE 0 END) as followed,
        COUNT(*) as total
      FROM contact_requests
    `);
    const stats = statsResult.rows[0];
    
    res.json({ 
      success: true, 
      data: result.rows,
      stats,
      pagination: {
        total: result.rows.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: result.rows.length === limitNum
      }
    });
  } catch (error) {
    console.error('GET /api/contact error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/contact/:id ==========
// دریافت یک درخواست تماس
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('SELECT * FROM contact_requests WHERE id = ?', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'درخواست یافت نشد' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('GET /api/contact/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PATCH /api/contact/:id/status ==========
// تغییر وضعیت درخواست تماس
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || !['new', 'contacted', 'followed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'وضعیت نامعتبر است. وضعیت‌های مجاز: new, contacted, followed' 
      });
    }
    
    const result = await query(
      'UPDATE contact_requests SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    
    if (result.rows.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'درخواست یافت نشد' });
    }
    
    console.log(`📞 درخواست ${id}: وضعیت تغییر به ${status}`);
    
    res.json({ 
      success: true, 
      message: `وضعیت درخواست به "${status === 'new' ? 'جدید' : status === 'contacted' ? 'تماس گرفته شده' : 'پیگیری شده'}" تغییر یافت`,
    });
  } catch (error) {
    console.error('PATCH /api/contact/:id/status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/contact/:id/note ==========
// افزودن یادداشت به درخواست تماس
router.post('/:id/note', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { note } = req.body;
    
    if (!note || note.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'متن یادداشت الزامی است' 
      });
    }
    
    const existing = await query('SELECT notes FROM contact_requests WHERE id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'درخواست یافت نشد' });
    }
    
    const oldNotes = existing.rows[0].notes || '';
    const timestamp = new Date().toLocaleString('fa-IR');
    const newNote = `[${timestamp}] ${note.trim()}\n`;
    const updatedNotes = oldNotes + newNote;
    
    await query('UPDATE contact_requests SET notes = ?, updated_at = NOW() WHERE id = ?', [updatedNotes, id]);
    
    res.json({ 
      success: true, 
      message: 'یادداشت با موفقیت اضافه شد',
    });
  } catch (error) {
    console.error('POST /api/contact/:id/note error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== DELETE /api/contact/:id ==========
// حذف درخواست تماس (ادمین)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('DELETE FROM contact_requests WHERE id = ?', [id]);
    
    if (result.rows.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'درخواست یافت نشد' });
    }
    
    res.json({ success: true, message: 'درخواست با موفقیت حذف شد' });
  } catch (error) {
    console.error('DELETE /api/contact/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/contact/stats/daily ==========
// آمار روزانه درخواست‌های تماس (برای داشبورد)
router.get('/stats/daily', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days);
    
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN status = 'followed' THEN 1 ELSE 0 END) as followed
      FROM contact_requests
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [daysNum]);
    
    const dailyStats = result.rows.map(row => ({
      date: new Date(row.date).toLocaleDateString('fa-IR'),
      total: row.total,
      new: row.new,
      contacted: row.contacted,
      followed: row.followed
    }));
    
    res.json({ success: true, data: dailyStats });
  } catch (error) {
    console.error('GET /api/contact/stats/daily error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/contact/stats/summary ==========
// خلاصه آمار درخواست‌ها (برای داشبورد)
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
        SUM(CASE WHEN status = 'followed' THEN 1 ELSE 0 END) as followed,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as last_week
      FROM contact_requests
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('GET /api/contact/stats/summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/contact/export/csv ==========
// خروجی CSV از درخواست‌ها
router.get('/export/csv', async (req, res) => {
  try {
    const { status } = req.query;
    
    let sql = 'SELECT * FROM contact_requests';
    let params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    
    const result = await query(sql, params);
    const rows = result.rows;
    
    const headers = ['شناسه', 'نام', 'شماره موبایل', 'شهر', 'متراژ', 'پیام', 'وضعیت', 'تاریخ ثبت'];
    
    const csvRows = rows.map(r => [
      r.id,
      r.name,
      r.mobile,
      r.city || '',
      r.area_m2 || '',
      r.message || '',
      r.status === 'new' ? 'جدید' : r.status === 'contacted' ? 'تماس گرفته شده' : 'پیگیری شده',
      new Date(r.created_at).toLocaleDateString('fa-IR')
    ]);
    
    const csvContent = [headers, ...csvRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=contact_requests_${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error('GET /api/contact/export/csv error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
// backend/src/api/partners.js
import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

// ========== GET /api/partners ==========
// دریافت همه همکاران (ادمین)
router.get('/', async (req, res) => {
  try {
    const { status, search, limit, offset } = req.query;
    
    let sql = 'SELECT * FROM partners WHERE 1=1';
    let params = [];
    
    if (status === 'approved') {
      sql += ' AND is_approved = 1';
    } else if (status === 'pending') {
      sql += ' AND is_approved = 0';
    }
    
    if (search) {
      sql += ' AND (company_name LIKE ? OR user_name LIKE ? OR user_mobile LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const limitNum = limit ? parseInt(limit) : 50;
    const offsetNum = offset ? parseInt(offset) : 0;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);
    
    const result = await query(sql, params);
    
    // آمار کلی
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_approved = 1 THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN is_approved = 0 THEN 1 ELSE 0 END) as pending
      FROM partners
    `);
    const stats = statsResult.rows[0];
    
    res.json({ 
      success: true, 
      data: result.rows,
      stats,
      pagination: {
        total: result.rows.length,
        limit: limitNum,
        offset: offsetNum
      }
    });
  } catch (error) {
    console.error('GET /api/partners error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/partners/pending ==========
// دریافت همکاران در انتظار تأیید
router.get('/pending', async (req, res) => {
  try {
    const result = await query('SELECT * FROM partners WHERE is_approved = 0 ORDER BY created_at ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('GET /api/partners/pending error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/partners/approved ==========
// دریافت همکاران تأیید شده (برای انتخاب در فرانت)
router.get('/approved', async (req, res) => {
  try {
    const result = await query('SELECT * FROM partners WHERE is_approved = 1 ORDER BY company_name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('GET /api/partners/approved error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/partners/:id ==========
// دریافت اطلاعات یک همکار
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query('SELECT * FROM partners WHERE id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    
    // آمار پیش‌فاکتورهای همکار (در حال حاضر خالی است – بعداً تکمیل می‌شود)
    const quoteStats = {
      total_quotes: 0,
      submitted: 0,
      reviewing: 0,
      issued: 0,
      completed: 0,
      cancelled: 0,
      total_amount: 0
    };
    
    res.json({ 
      success: true, 
      data: result.rows[0],
      quote_stats: quoteStats
    });
  } catch (error) {
    console.error('GET /api/partners/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/partners/user/:userId ==========
// دریافت اطلاعات همکار با user_id
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const result = await query('SELECT * FROM partners WHERE user_id = ?', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('GET /api/partners/user/:userId error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/partners ==========
// ایجاد همکار جدید (با user_id موجود)
router.post('/', async (req, res) => {
  try {
    const { user_id, company_name, city, address, credit_limit, user_name, user_mobile, user_email } = req.body;
    
    if (!user_id || !company_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'user_id و نام شرکت الزامی است' 
      });
    }
    
    // بررسی وجود همکار تکراری برای این کاربر
    const existing = await query('SELECT id FROM partners WHERE user_id = ?', [user_id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'این کاربر قبلاً به عنوان همکار ثبت شده است' 
      });
    }
    
    const creditLimitValue = credit_limit ? parseInt(credit_limit) : 0;
    
    const result = await query(
      `INSERT INTO partners 
       (user_id, user_name, user_mobile, user_email, company_name, city, address, credit_limit, is_approved, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
      [user_id, user_name || null, user_mobile || null, user_email || null, company_name.trim(), city || null, address || null, creditLimitValue]
    );
    
    const newId = result.insertId;
    const newPartner = await query('SELECT * FROM partners WHERE id = ?', [newId]);
    
    res.status(201).json({ 
      success: true, 
      data: newPartner.rows[0],
      message: 'درخواست همکاری ثبت شد. منتظر تأیید مدیریت باشید.'
    });
  } catch (error) {
    console.error('POST /api/partners error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PUT /api/partners/:id/approve ==========
// تأیید همکار
router.put('/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const partner = await query('SELECT * FROM partners WHERE id = ?', [id]);
    if (partner.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    
    if (partner.rows[0].is_approved) {
      return res.status(400).json({ success: false, error: 'همکار قبلاً تأیید شده است' });
    }
    
    await query('UPDATE partners SET is_approved = 1, updated_at = NOW() WHERE id = ?', [id]);
    const updated = await query('SELECT * FROM partners WHERE id = ?', [id]);
    
    console.log(`✅ همکار ${updated.rows[0].company_name} (ID: ${id}) تأیید شد`);
    
    res.json({ 
      success: true, 
      message: 'همکار با موفقیت تأیید شد',
      data: updated.rows[0]
    });
  } catch (error) {
    console.error('PUT /api/partners/:id/approve error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PUT /api/partners/:id/reject ==========
// رد درخواست همکاری (حذف)
router.put('/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const partner = await query('SELECT * FROM partners WHERE id = ?', [id]);
    if (partner.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    
    if (partner.rows[0].is_approved) {
      return res.status(400).json({ success: false, error: 'همکار قبلاً تأیید شده و قابل حذف نیست' });
    }
    
    await query('DELETE FROM partners WHERE id = ?', [id]);
    
    console.log(`❌ درخواست همکاری ${partner.rows[0].company_name} (ID: ${id}) رد شد`);
    
    res.json({ 
      success: true, 
      message: 'درخواست همکاری رد شد' 
    });
  } catch (error) {
    console.error('PUT /api/partners/:id/reject error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PUT /api/partners/:id ==========
// به‌روزرسانی اطلاعات همکار
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { company_name, city, address, credit_limit, is_approved } = req.body;
    
    const existing = await query('SELECT id FROM partners WHERE id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    
    const updates = [];
    const params = [];
    
    if (company_name !== undefined) {
      updates.push('company_name = ?');
      params.push(company_name.trim());
    }
    if (city !== undefined) {
      updates.push('city = ?');
      params.push(city || null);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address || null);
    }
    if (credit_limit !== undefined) {
      updates.push('credit_limit = ?');
      params.push(parseInt(credit_limit));
    }
    if (is_approved !== undefined) {
      updates.push('is_approved = ?');
      params.push(is_approved ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است' });
    }
    
    updates.push('updated_at = NOW()');
    params.push(id);
    
    await query(`UPDATE partners SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const updated = await query('SELECT * FROM partners WHERE id = ?', [id]);
    res.json({ 
      success: true, 
      data: updated.rows[0],
      message: 'اطلاعات همکار با موفقیت به‌روزرسانی شد'
    });
  } catch (error) {
    console.error('PUT /api/partners/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== DELETE /api/partners/:id ==========
// حذف همکار (ادمین)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const partner = await query('SELECT company_name FROM partners WHERE id = ?', [id]);
    if (partner.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    
    await query('DELETE FROM partners WHERE id = ?', [id]);
    
    console.log(`🗑️ همکار ${partner.rows[0].company_name} (ID: ${id}) حذف شد`);
    
    res.json({ success: true, message: 'همکار با موفقیت حذف شد' });
  } catch (error) {
    console.error('DELETE /api/partners/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/partners/:id/quotes ==========
// دریافت پیش‌فاکتورهای یک همکار (در حال حاضر mock – بعداً کامل می‌شود)
router.get('/:id/quotes', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const partner = await query('SELECT id FROM partners WHERE id = ?', [id]);
    if (partner.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    
    // در حال حاضر آرایه خالی برگردانده می‌شود (بعداً از جدول quotes اطلاعات دریافت می‌شود)
    const mockQuotes = [];
    res.json({ success: true, data: mockQuotes });
  } catch (error) {
    console.error('GET /api/partners/:id/quotes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/partners/stats/summary ==========
// خلاصه آمار همکاران (برای داشبورد)
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_approved = 1 THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN is_approved = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_partners_last_30_days,
        SUM(credit_limit) as total_credit_limit
      FROM partners
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('GET /api/partners/stats/summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PATCH /api/partners/:id/credit ==========
// تغییر سقف اعتبار همکار
router.patch('/:id/credit', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { credit_limit } = req.body;
    
    if (credit_limit === undefined || isNaN(credit_limit)) {
      return res.status(400).json({ 
        success: false, 
        error: 'مقدار اعتبار معتبر نیست' 
      });
    }
    
    const existing = await query('SELECT id FROM partners WHERE id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    
    await query('UPDATE partners SET credit_limit = ?, updated_at = NOW() WHERE id = ?', [parseInt(credit_limit), id]);
    const updated = await query('SELECT * FROM partners WHERE id = ?', [id]);
    
    res.json({ 
      success: true, 
      data: updated.rows[0],
      message: 'سقف اعتبار با موفقیت به‌روزرسانی شد'
    });
  } catch (error) {
    console.error('PATCH /api/partners/:id/credit error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
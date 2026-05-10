// backend/src/api/quotes.js
import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

// تابع تولید شماره پیش‌فاکتور
const generateQuoteNumber = () => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `QF-${year}${month}-${random}`;
};

// ========== GET /api/quotes ==========
router.get('/', async (req, res) => {
  try {
    const { status, partner_id, from_date, to_date, limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT * FROM quotes WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (partner_id) {
      sql += ' AND partner_id = ?';
      params.push(partner_id);
    }
    if (from_date) {
      sql += ' AND DATE(created_at) >= ?';
      params.push(from_date);
    }
    if (to_date) {
      sql += ' AND DATE(created_at) <= ?';
      params.push(to_date);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    const quotes = result.rows;

    // آمار وضعیت‌ها (جداگانه با کوئری)
    const statsResult = await query(`
      SELECT 
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
        SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) as preparing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        COUNT(*) as total,
        SUM(total_amount) as total_amount
      FROM quotes
    `);
    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: quotes,
      stats,
      pagination: {
        total: quotes.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('GET /api/quotes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/quotes/partner/:partnerId ==========
router.get('/partner/:partnerId', async (req, res) => {
  try {
    const partnerId = parseInt(req.params.partnerId);
    const { status } = req.query;
    let sql = 'SELECT * FROM quotes WHERE partner_id = ?';
    const params = [partnerId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    const quotes = result.rows;

    // اضافه کردن تعداد آیتم‌ها (می‌توان با یک JOIN هم انجام داد، ولی ساده)
    for (let quote of quotes) {
      const itemsRes = await query('SELECT COUNT(*) as count FROM quote_items WHERE quote_id = ?', [quote.id]);
      quote.item_count = itemsRes.rows[0].count;
    }

    res.json({ success: true, data: quotes });
  } catch (error) {
    console.error('GET /api/quotes/partner/:partnerId error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/quotes/:id ==========
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const quoteRes = await query('SELECT * FROM quotes WHERE id = ?', [id]);
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'پیش‌فاکتور یافت نشد' });
    }
    const itemsRes = await query('SELECT * FROM quote_items WHERE quote_id = ?', [id]);
    res.json({
      success: true,
      data: {
        ...quoteRes.rows[0],
        items: itemsRes.rows
      }
    });
  } catch (error) {
    console.error('GET /api/quotes/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/quotes/number/:quoteNumber ==========
router.get('/number/:quoteNumber', async (req, res) => {
  try {
    const { quoteNumber } = req.params;
    const quoteRes = await query('SELECT * FROM quotes WHERE quote_number = ?', [quoteNumber]);
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'پیش‌فاکتور یافت نشد' });
    }
    const itemsRes = await query('SELECT * FROM quote_items WHERE quote_id = ?', [quoteRes.rows[0].id]);
    res.json({
      success: true,
      data: {
        ...quoteRes.rows[0],
        items: itemsRes.rows
      }
    });
  } catch (error) {
    console.error('GET /api/quotes/number/:quoteNumber error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/quotes ==========
router.post('/', async (req, res) => {
  const connection = await (await import('../utils/db.js')).getClient(); // استفاده از connection برای تراکنش
  try {
    const { partner_id, items, shipping_cost, notes, expires_in_hours = 48 } = req.body;
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;

    if (!partner_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'اطلاعات همکار و لیست محصولات الزامی است' });
    }

    await connection.beginTransaction();

    // محاسبه مبلغ کل
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.price * item.quantity;
    }
    const shippingCost = shipping_cost || 0;
    totalAmount += shippingCost;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expires_in_hours);
    const quoteNumber = generateQuoteNumber();

    const [quoteResult] = await connection.execute(
      `INSERT INTO quotes 
       (quote_number, partner_id, status, shipping_cost, total_amount, notes, expires_at, created_by, created_at, updated_at)
       VALUES (?, ?, 'submitted', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [quoteNumber, partner_id, shippingCost, totalAmount, notes || null, expiresAt, userId]
    );
    const quoteId = quoteResult.insertId;

    // ذخیره آیتم‌ها
    for (const item of items) {
      const itemTotal = item.price * item.quantity;
      await connection.execute(
        `INSERT INTO quote_items 
         (quote_id, product_id, product_name, quantity, price, total, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [quoteId, item.product_id, item.product_name, item.quantity, item.price, itemTotal]
      );
    }

    await connection.commit();

    // دریافت داده‌های کامل برای پاسخ
    const newQuote = await query('SELECT * FROM quotes WHERE id = ?', [quoteId]);
    const newItems = await query('SELECT * FROM quote_items WHERE quote_id = ?', [quoteId]);

    console.log(`📄 پیش‌فاکتور جدید: ${quoteNumber} - مبلغ: ${totalAmount.toLocaleString()} تومان`);

    res.status(201).json({
      success: true,
      data: {
        ...newQuote.rows[0],
        items: newItems.rows
      },
      message: 'پیش‌فاکتور با موفقیت ایجاد شد'
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('POST /api/quotes error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// ========== PUT /api/quotes/:id ==========
router.put('/:id', async (req, res) => {
  const connection = await (await import('../utils/db.js')).getClient();
  try {
    const id = parseInt(req.params.id);
    const { items, shipping_cost, notes } = req.body;
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;

    // بررسی وجود و وضعیت
    const quoteRes = await query('SELECT * FROM quotes WHERE id = ?', [id]);
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'پیش‌فاکتور یافت نشد' });
    }
    const quote = quoteRes.rows[0];
    if (quote.status !== 'submitted' && quote.status !== 'reviewing') {
      return res.status(400).json({ success: false, error: 'فقط پیش‌فاکتورهای در انتظار تأیید قابل ویرایش هستند' });
    }

    await connection.beginTransaction();

    // حذف آیتم‌های قبلی
    await connection.execute('DELETE FROM quote_items WHERE quote_id = ?', [id]);

    let totalAmount = 0;
    const newItems = [];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        await connection.execute(
          `INSERT INTO quote_items (quote_id, product_id, product_name, quantity, price, total, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [id, item.product_id, item.product_name, item.quantity, item.price, itemTotal]
        );
        newItems.push({ ...item, total: itemTotal });
      }
    }

    const shippingCost = shipping_cost !== undefined ? shipping_cost : quote.shipping_cost;
    totalAmount += shippingCost;

    await connection.execute(
      `UPDATE quotes SET shipping_cost = ?, total_amount = ?, notes = ?, updated_at = NOW() WHERE id = ?`,
      [shippingCost, totalAmount, notes !== undefined ? notes : quote.notes, id]
    );

    await connection.commit();

    const updatedQuote = await query('SELECT * FROM quotes WHERE id = ?', [id]);
    res.json({
      success: true,
      data: {
        ...updatedQuote.rows[0],
        items: newItems
      },
      message: 'پیش‌فاکتور با موفقیت ویرایش شد'
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('PUT /api/quotes/:id error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// ========== PATCH /api/quotes/:id/status ==========
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, note } = req.body;

    const validStatuses = ['submitted', 'reviewing', 'issued', 'waiting_customer', 'preparing', 'completed', 'final_confirmed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'وضعیت نامعتبر است' });
    }

    const quoteRes = await query('SELECT * FROM quotes WHERE id = ?', [id]);
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'پیش‌فاکتور یافت نشد' });
    }
    const oldStatus = quoteRes.rows[0].status;

    await query('UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
    console.log(`📄 پیش‌فاکتور ${quoteRes.rows[0].quote_number}: ${oldStatus} -> ${status}${note ? ` (${note})` : ''}`);

    const updated = await query('SELECT * FROM quotes WHERE id = ?', [id]);
    res.json({
      success: true,
      data: updated.rows[0],
      message: `وضعیت پیش‌فاکتور به "${getStatusLabel(status)}" تغییر یافت`
    });
  } catch (error) {
    console.error('PATCH /api/quotes/:id/status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/quotes/:id/approve ==========
router.post('/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const quoteRes = await query('SELECT * FROM quotes WHERE id = ?', [id]);
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'پیش‌فاکتور یافت نشد' });
    }
    const quote = quoteRes.rows[0];
    if (quote.status !== 'submitted' && quote.status !== 'reviewing') {
      return res.status(400).json({ success: false, error: 'فقط پیش‌فاکتورهای در انتظار تأیید قابل تأیید هستند' });
    }

    await query('UPDATE quotes SET status = "issued", updated_at = NOW() WHERE id = ?', [id]);
    console.log(`✅ پیش‌فاکتور ${quote.quote_number} تأیید و صادر شد`);

    const updated = await query('SELECT * FROM quotes WHERE id = ?', [id]);
    res.json({
      success: true,
      data: updated.rows[0],
      message: 'پیش‌فاکتور با موفقیت تأیید و صادر شد'
    });
  } catch (error) {
    console.error('POST /api/quotes/:id/approve error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/quotes/:id/cancel ==========
router.post('/:id/cancel', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    const quoteRes = await query('SELECT * FROM quotes WHERE id = ?', [id]);
    if (quoteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'پیش‌فاکتور یافت نشد' });
    }
    const quote = quoteRes.rows[0];
    if (quote.status === 'completed' || quote.status === 'final_confirmed') {
      return res.status(400).json({ success: false, error: 'پیش‌فاکتورهای تکمیل شده قابل لغو نیستند' });
    }

    await query('UPDATE quotes SET status = "cancelled", updated_at = NOW() WHERE id = ?', [id]);
    console.log(`❌ پیش‌فاکتور ${quote.quote_number} لغو شد${reason ? `: ${reason}` : ''}`);

    const updated = await query('SELECT * FROM quotes WHERE id = ?', [id]);
    res.json({
      success: true,
      data: updated.rows[0],
      message: 'پیش‌فاکتور با موفقیت لغو شد'
    });
  } catch (error) {
    console.error('POST /api/quotes/:id/cancel error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/quotes/stats/summary ==========
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_count,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END) as today_amount,
        SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END) as month_count,
        SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE()) THEN total_amount ELSE 0 END) as month_amount,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
        SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) as preparing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM quotes
    `);
    const row = result.rows[0];
    const summary = {
      total: row.total,
      total_amount: row.total_amount,
      today: {
        count: row.today_count,
        amount: row.today_amount
      },
      this_month: {
        count: row.month_count,
        amount: row.month_amount
      },
      by_status: {
        submitted: row.submitted,
        reviewing: row.reviewing,
        issued: row.issued,
        preparing: row.preparing,
        completed: row.completed,
        cancelled: row.cancelled
      }
    };
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('GET /api/quotes/stats/summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/quotes/stats/daily ==========
router.get('/stats/daily', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days);
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(total_amount) as amount
      FROM quotes
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [daysNum]);
    const dailyStats = result.rows.map(row => ({
      date: new Date(row.date).toLocaleDateString('fa-IR'),
      count: row.count,
      amount: row.amount
    }));
    res.json({ success: true, data: dailyStats });
  } catch (error) {
    console.error('GET /api/quotes/stats/daily error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// تابع کمکی برای تبدیل وضعیت به فارسی
const getStatusLabel = (status) => {
  const statusMap = {
    'submitted': 'ثبت شده',
    'reviewing': 'در حال بررسی',
    'issued': 'صادر شده',
    'waiting_customer': 'در انتظار مشتری',
    'preparing': 'در حال آماده‌سازی',
    'completed': 'تکمیل شده',
    'final_confirmed': 'تأیید نهایی',
    'cancelled': 'لغو شده'
  };
  return statusMap[status] || status;
};

export default router;
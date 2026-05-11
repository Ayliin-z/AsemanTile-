const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ========== MySQL Connection Pool ==========
const pool = mysql.createPool({
  host: 'localhost',
  user: 'asemant2_Aseman',
  password: 'Aseman@2024!',
  database: 'aseman_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
  if (err) console.error('❌ خطا در اتصال به MySQL:', err);
  else {
    console.log('✅ متصل به MySQL شد');
    connection.release();
  }
});

const JWT_SECRET = 'aseman_super_secret_key_change_in_production';
const authRoutes = require('./api/auth.cjs'); // مسیر درست نسبت به فایل سرور
app.use('/api/auth', authRoutes);

// ========== Upload Configuration ==========
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('فقط تصاویر مجاز هستند (jpeg, jpg, png, gif, webp)'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

// سرویس دهی فایل‌های استاتیک از پوشه uploads
app.use('/uploads', express.static(uploadDir));

// ========== Import productTemplates routes ==========
let productTemplateRoutes;
try {
  productTemplateRoutes = require('./routes/productTemplatesRoutes.cjs');
} catch(e) {
  productTemplateRoutes = express.Router();
  productTemplateRoutes.get('/', (req, res) => res.json([]));
  productTemplateRoutes.post('/', (req, res) => res.status(201).json({}));
}



// ========== IMAGE UPLOAD ==========
app.post('/api/upload', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'هیچ فایلی آپلود نشده است' });
    }
    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      size: file.size
    }));
    res.json({ success: true, files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'خطا در آپلود فایل' });
  }
});

app.delete('/api/upload/:filename', (req, res) => {
  const filepath = path.join(uploadDir, req.params.filename);
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ success: true, message: 'فایل حذف شد' });
    } else {
      res.status(404).json({ error: 'فایل یافت نشد' });
    }
  } catch (err) {
    res.status(500).json({ error: 'خطا در حذف فایل' });
  }
});

// ========== PRODUCTS ==========
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM products ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: 'خطا در دریافت محصولات' }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/products/code/:code', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM products WHERE sku = ?', [req.params.code]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/products', async (req, res) => {
  try {
    let {
      productcode, grade, name, price, partnerprice, discount, stock,
      description, manufacturer, glazetype, suitablefor, category,
      size, glaze, color, images, fulldescription, tags, audience
    } = req.body;

    if (!productcode || productcode.trim() === '') {
      return res.status(400).json({ success: false, error: 'کد محصول الزامی است' });
    }

    let finalImages = '[]';
    if (images) {
      try { finalImages = typeof images === 'string' ? images : JSON.stringify(images); JSON.parse(finalImages); } catch(e) { finalImages = '[]'; }
    }
    let finalTags = '[]';
    if (tags) {
      try { finalTags = typeof tags === 'string' ? tags : JSON.stringify(tags); JSON.parse(finalTags); } catch(e) { finalTags = '[]'; }
    }

    const [result] = await promisePool.query(
      `INSERT INTO products 
        (sku, grade, name, price_public, price_partner, discount, stock,
         description, brand, glaze_type, suitable_for, category, size, glaze, color,
         images, full_description, tags, audience)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productcode, grade || '', name || '',
        Number(price) || 0, Number(partnerprice) || 0, Number(discount) || 0, Number(stock) || 0,
        description || '', manufacturer || '', glazetype || '', suitablefor || '',
        category || '', size || '', glaze || '', color || '',
        finalImages, fulldescription || '', finalTags, audience || 'all'
      ]
    );
    const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ خطا:', err);
    res.status(500).json({ success: false, error: 'خطا در افزودن محصول: ' + err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    let {
      productcode, grade, name, price, partnerprice, discount, stock,
      description, manufacturer, glazetype, suitablefor, category,
      size, glaze, color, images, fulldescription, tags, audience
    } = req.body;

    let finalImages = '[]';
    if (images) {
      try { finalImages = typeof images === 'string' ? images : JSON.stringify(images); JSON.parse(finalImages); } catch(e) { finalImages = '[]'; }
    }
    let finalTags = '[]';
    if (tags) {
      try { finalTags = typeof tags === 'string' ? tags : JSON.stringify(tags); JSON.parse(finalTags); } catch(e) { finalTags = '[]'; }
    }

    await promisePool.query(
      `UPDATE products SET 
        sku=?, grade=?, name=?, price_public=?, price_partner=?, discount=?, stock=?,
        description=?, brand=?, glaze_type=?, suitable_for=?, category=?, size=?, glaze=?, color=?,
        images=?, full_description=?, tags=?, audience=?
       WHERE id=?`,
      [
        productcode || '', grade || '', name || '',
        Number(price) || 0, Number(partnerprice) || 0, Number(discount) || 0, Number(stock) || 0,
        description || '', manufacturer || '', glazetype || '', suitablefor || '',
        category || '', size || '', glaze || '', color || '',
        finalImages, fulldescription || '', finalTags, audience || 'all', id
      ]
    );
    const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'خطا در به‌روزرسانی محصول' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try { await promisePool.query('DELETE FROM products WHERE id = ?', [req.params.id]); res.json({ success: true, message: 'محصول حذف شد' }); }
  catch (err) { res.status(500).json({ success: false, error: 'خطا در حذف محصول' }); }
});

// ========== BRANDS ==========
app.get('/api/brands', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT * FROM brands ORDER BY name'); res.json(rows); }
  catch(err) { res.status(500).json([]); }
});
app.post('/api/brands', async (req, res) => {
  const { name } = req.body; if(!name) return res.status(400).json({error:'نام برند الزامی'});
  try { await promisePool.query('INSERT INTO brands (name) VALUES (?)', [name]); res.status(201).json({success:true}); }
  catch(err) { res.status(500).json({error:err.message}); }
});
app.put('/api/brands/:id', async (req, res) => {
  const { id } = req.params; const { name } = req.body;
  try { await promisePool.query('UPDATE brands SET name=? WHERE id=?', [name, id]); res.json({success:true}); }
  catch(err) { res.status(500).json({error:err.message}); }
});
app.delete('/api/brands/:id', async (req, res) => {
  try { await promisePool.query('DELETE FROM brands WHERE id=?', [req.params.id]); res.json({success:true}); }
  catch(err) { res.status(500).json({error:err.message}); }
});

// ========== TAGS ==========
app.get('/api/tags', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT * FROM tags ORDER BY name'); res.json(rows); }
  catch(err) { res.status(500).json([]); }
});
app.post('/api/tags', async (req, res) => {
  const { name } = req.body; if(!name) return res.status(400).json({error:'نام تگ الزامی'});
  try { await promisePool.query('INSERT INTO tags (name) VALUES (?)', [name]); res.status(201).json({success:true}); }
  catch(err) { res.status(500).json({error:err.message}); }
});
app.delete('/api/tags/:name', async (req, res) => {
  try { await promisePool.query('DELETE FROM tags WHERE name=?', [req.params.name]); res.json({success:true}); }
  catch(err) { res.status(500).json({error:err.message}); }
});

// ========== EMPLOYEES ==========
app.get('/api/employees', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT id, name, email, permissions, is_active, created_at FROM employees'); res.json(rows); }
  catch(err) { res.status(500).json({ error: 'خطا در دریافت کارمندان' }); }
});
app.get('/api/employees/:id', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT id, name, email, permissions, is_active, created_at FROM employees WHERE id=?', [req.params.id]); if(rows.length===0) return res.status(404).json({error:'یافت نشد'}); res.json(rows[0]); }
  catch(err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/employees', async (req, res) => {
  const { name, email, password, permissions } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'نام، ایمیل و رمز الزامی است' });
  try {
    const [exist] = await promisePool.query('SELECT id FROM employees WHERE email=?', [email]);
    if(exist.length) return res.status(409).json({error:'ایمیل تکراری'});
    const [result] = await promisePool.query('INSERT INTO employees (name, email, password, permissions, is_active) VALUES (?,?,?,?,1)', [name, email, password, JSON.stringify(permissions||[])]);
    const [row] = await promisePool.query('SELECT id, name, email, permissions, is_active, created_at FROM employees WHERE id=?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, password, permissions, is_active } = req.body;
  try {
    let query = 'UPDATE employees SET name=COALESCE(?,name), email=COALESCE(?,email), permissions=COALESCE(?,permissions), is_active=COALESCE(?,is_active)';
    let params = [name, email, permissions?JSON.stringify(permissions):null, is_active];
    if(password) { query += ', password=?'; params.push(password); }
    query += ' WHERE id=?';
    params.push(id);
    await promisePool.query(query, params);
    const [row] = await promisePool.query('SELECT id, name, email, permissions, is_active, created_at FROM employees WHERE id=?', [id]);
    res.json(row[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/employees/:id', async (req, res) => {
  try { await promisePool.query('DELETE FROM employees WHERE id=?', [req.params.id]); res.json({message:'حذف شد'}); }
  catch(err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/employees/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await promisePool.query('SELECT id, name, email, permissions, is_active FROM employees WHERE email=? AND password=?', [email, password]);
    if(rows.length===0) return res.status(401).json({error:'ایمیل یا رمز اشتباه'});
    if(!rows[0].is_active) return res.status(403).json({error:'حساب غیرفعال'});
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ========== PARTNERS (تکمیلی) ==========
app.get('/api/partners/pending', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT p.*, u.name, u.mobile, u.email 
       FROM partners p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.is_approved = 0 
       ORDER BY p.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/partners/:id/approve', async (req, res) => {
  try {
    // تأیید در جدول partners
    const [result] = await promisePool.query(
      'UPDATE partners SET is_approved = 1, updated_at = NOW() WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }

    // دریافت user_id و فعال‌سازی کاربر
    const [partnerRows] = await promisePool.query('SELECT user_id FROM partners WHERE id = ?', [req.params.id]);
    if (partnerRows.length > 0) {
      const userId = partnerRows[0].user_id;
      await promisePool.query("UPDATE users SET type = 'partner', is_active = 1 WHERE id = ?", [userId]);
    }

    res.json({ success: true, message: 'همکار با موفقیت تأیید شد' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get('/api/partners/user/:userId', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM partners WHERE user_id = ?', [req.params.userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
// ========== USERS ==========
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE id=?', [req.params.id]);
    if(rows.length===0) return res.status(404).json({ error: 'کاربر یافت نشد' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/mobile/:mobile', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE mobile=?', [req.params.mobile]);
    if(rows.length===0) return res.status(404).json({ error: 'کاربر یافت نشد' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  const { name, mobile, email, password, type } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'نام و شماره موبایل الزامی است' });
  if (password && password.length < 4) return res.status(400).json({ error: 'رمز عبور حداقل ۴ کاراکتر' });
  try {
    const [existMobile] = await promisePool.query('SELECT id FROM users WHERE mobile = ?', [mobile]);
    if (existMobile.length) return res.status(409).json({ error: 'این شماره موبایل قبلاً ثبت شده است' });
    if (email) {
      const [existEmail] = await promisePool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existEmail.length) return res.status(409).json({ error: 'این ایمیل قبلاً ثبت شده است' });
    }
    const finalEmail = email && email.trim() !== '' ? email : null;
    const finalType = type === 'partner' ? 'partner' : 'customer';
    const finalPassword = password || null;
    const isActive = finalType === 'partner' ? 0 : 1;
    const [result] = await promisePool.query(
      'INSERT INTO users (name, mobile, email, password_hash, type, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name, mobile, finalEmail, finalPassword, finalType, isActive]
    );
    const [newUser] = await promisePool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE id=?', [result.insertId]);
    res.status(201).json(newUser[0]);
  } catch(err) { res.status(500).json({ error: 'خطا در ایجاد کاربر: ' + err.message }); }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { type, is_active } = req.body;
  if (type === undefined && is_active === undefined) return res.status(400).json({ error: 'هیچ فیلدی برای به‌روزرسانی نیست' });
  try {
    const updates = [];
    const values = [];
    if (type !== undefined) { updates.push('type = ?'); values.push(type); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
    values.push(id);
    await promisePool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    const [rows] = await promisePool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try { await promisePool.query('DELETE FROM users WHERE id = ?', [req.params.id]); res.json({ message: 'کاربر حذف شد' }); }
  catch(err) { res.status(500).json({ error: err.message }); }
});

// ========== QUOTES (کامل) ==========
app.get('/api/quotes', async (req, res) => {
  try {
    const { partner_id, status } = req.query;
    let sql = 'SELECT * FROM quotes WHERE 1=1';
    const params = [];
    if (partner_id) { sql += ' AND partner_id = ?'; params.push(partner_id); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/quotes/:id', async (req, res) => {
  try {
    const [quotes] = await promisePool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (quotes.length === 0) return res.status(404).json({ success: false, error: 'یافت نشد' });
    const [items] = await promisePool.query('SELECT * FROM quote_items WHERE quote_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...quotes[0], items } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/quotes', async (req, res) => {
  const { partner_id, items, notes } = req.body;
  if (!partner_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'partner_id و لیست محصولات الزامی است' });
  }

  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.price * item.quantity;
    }

    const quoteNumber = 'QF-' + Date.now();

    const [quoteResult] = await connection.query(
      `INSERT INTO quotes (quote_number, partner_id, status, total_amount, notes, created_at, updated_at)
       VALUES (?, ?, 'submitted', ?, ?, NOW(), NOW())`,
      [quoteNumber, partner_id, totalAmount, notes || null]
    );
    const quoteId = quoteResult.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO quote_items (quote_id, product_id, product_name, quantity, price, total, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [quoteId, item.product_id, item.product_name, item.quantity, item.price, item.price * item.quantity]
      );
    }

    await connection.commit();

    const [newQuote] = await promisePool.query('SELECT * FROM quotes WHERE id = ?', [quoteId]);
    const [newItems] = await promisePool.query('SELECT * FROM quote_items WHERE quote_id = ?', [quoteId]);

    res.status(201).json({
      success: true,
      data: { ...newQuote[0], items: newItems },
      message: 'پیش‌فاکتور با موفقیت ثبت شد و در انتظار بررسی است.'
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

app.patch('/api/quotes/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['submitted', 'reviewing', 'issued', 'preparing', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'وضعیت نامعتبر است' });
  }
  try {
    const [result] = await promisePool.query('UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'پیش‌فاکتور یافت نشد' });
    const [updated] = await promisePool.query('SELECT * FROM quotes WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ========== STATS ==========
app.get('/api/stats/registrations', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const weekStart = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
    const [[todayRow]] = await promisePool.query(`SELECT COUNT(CASE WHEN type='customer' THEN 1 END) as customers, COUNT(CASE WHEN type='partner' THEN 1 END) as partners FROM users WHERE DATE(created_at)=?`,[today]);
    const [[weekRow]] = await promisePool.query(`SELECT COUNT(CASE WHEN type='customer' THEN 1 END) as customers, COUNT(CASE WHEN type='partner' THEN 1 END) as partners FROM users WHERE created_at>=?`,[weekStart]);
    const [[monthRow]] = await promisePool.query(`SELECT COUNT(CASE WHEN type='customer' THEN 1 END) as customers, COUNT(CASE WHEN type='partner' THEN 1 END) as partners FROM users WHERE created_at>=?`,[monthStart]);
    const [dailyRows] = await promisePool.query(`SELECT DATE(created_at) as date, COUNT(CASE WHEN type='customer' THEN 1 END) as customers, COUNT(CASE WHEN type='partner' THEN 1 END) as partners FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY date ASC`);
    res.json({ success: true, data: { today: todayRow, week: weekRow, month: monthRow, daily: dailyRows } });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ========== BLOG ==========
app.get('/api/blog', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT * FROM blog_posts ORDER BY created_at DESC'); res.json(rows); }
  catch(err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/blog/homepage', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT * FROM blog_posts WHERE show_on_homepage=1 ORDER BY created_at DESC LIMIT 3'); res.json(rows); }
  catch(err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/blog/slug/:slug', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT * FROM blog_posts WHERE slug=?', [req.params.slug]); if(rows.length===0) return res.status(404).json({error:'پست یافت نشد'}); res.json(rows[0]); }
  catch(err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/blog/:id', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT * FROM blog_posts WHERE id=?', [req.params.id]); if(rows.length===0) return res.status(404).json({error:'پست یافت نشد'}); res.json(rows[0]); }
  catch(err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/blog', async (req, res) => {
  const { title, slug, excerpt, content, image, status } = req.body;
  if(!title || !slug || !content) return res.status(400).json({error:'عنوان، اسلاگ و محتوا الزامی'});
  try {
    const [exist] = await promisePool.query('SELECT id FROM blog_posts WHERE slug=?', [slug]);
    if(exist.length) return res.status(409).json({error:'اسلاگ تکراری'});
    const [result] = await promisePool.query('INSERT INTO blog_posts (title, slug, excerpt, content, image, status) VALUES (?,?,?,?,?,?)', [title, slug, excerpt||'', content, image||'', status||'published']);
    const [row] = await promisePool.query('SELECT * FROM blog_posts WHERE id=?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/blog/:id', async (req, res) => {
  const { id } = req.params;
  const { title, slug, excerpt, content, image, status } = req.body;
  try {
    await promisePool.query('UPDATE blog_posts SET title=?, slug=?, excerpt=?, content=?, image=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [title, slug, excerpt, content, image, status, id]);
    const [row] = await promisePool.query('SELECT * FROM blog_posts WHERE id=?', [id]);
    res.json(row[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/blog/:id', async (req, res) => {
  try { await promisePool.query('DELETE FROM blog_posts WHERE id=?', [req.params.id]); res.json({ message: 'حذف شد' }); }
  catch(err) { res.status(500).json({ error: err.message }); }
});
app.patch('/api/blog/:id/toggle-homepage', async (req, res) => {
  const { id } = req.params;
  const { show_on_homepage } = req.body;
  try { await promisePool.query('UPDATE blog_posts SET show_on_homepage=? WHERE id=?', [show_on_homepage?1:0, id]); const [row] = await promisePool.query('SELECT * FROM blog_posts WHERE id=?', [id]); res.json(row[0]); }
  catch(err) { res.status(500).json({ error: err.message }); }
});

// ========== PRODUCT TEMPLATES ==========
app.use('/api/product-templates', productTemplateRoutes);

// ========== SUPPORT EXPERTS ==========
app.get('/api/experts', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM support_experts WHERE is_active = 1 ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/experts/all', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM support_experts ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/experts', async (req, res) => {
  const { name, phone, photo, is_active } = req.body;
  if (!name || !phone) return res.status(400).json({ success: false, error: 'نام و شماره تماس الزامی است' });
  try {
    const [result] = await promisePool.query(
      'INSERT INTO support_experts (name, phone, photo, is_active) VALUES (?, ?, ?, ?)',
      [name, phone, photo || null, is_active !== undefined ? is_active : 1]
    );
    const [rows] = await promisePool.query('SELECT * FROM support_experts WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/experts/:id', async (req, res) => {
  const { name, phone, photo, is_active } = req.body;
  try {
    const [result] = await promisePool.query(
      'UPDATE support_experts SET name = ?, phone = ?, photo = ?, is_active = ? WHERE id = ?',
      [name, phone, photo || null, is_active, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'کارشناس یافت نشد' });
    const [rows] = await promisePool.query('SELECT * FROM support_experts WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/experts/:id', async (req, res) => {
  try {
    const [result] = await promisePool.query('DELETE FROM support_experts WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'کارشناس یافت نشد' });
    res.json({ success: true, message: 'حذف شد' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ========== WISHLIST ==========
app.get('/api/wishlist/:userId', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT w.id, w.product_id, w.created_at, p.name, p.price_public, p.images
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.params.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/wishlist', async (req, res) => {
  const { user_id, product_id } = req.body;
  if (!user_id || !product_id) return res.status(400).json({ success: false, error: 'اطلاعات ناقص است' });
  try {
    const [existing] = await promisePool.query(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'این محصول قبلاً به لیست اضافه شده' });
    }
    const [result] = await promisePool.query(
      'INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)',
      [user_id, product_id]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/wishlist/:id', async (req, res) => {
  try {
    await promisePool.query('DELETE FROM wishlists WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'حذف شد' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/wishlist/check/:userId/:productId', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      [req.params.userId, req.params.productId]
    );
    res.json({ success: true, liked: rows.length > 0, id: rows[0]?.id || null });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`🚀 سرور روی پورت ${PORT} در حال اجراست`));

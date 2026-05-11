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

// ========== سرویس فایل‌های استاتیک فرانت‌اند ==========
// اگر فرانت شما در پوشه frontend/dist هست (بعد از build)
const frontendPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  console.log('✅ فرانت‌اند از مسیر:', frontendPath);
} else {
  // اگر فرانت در روت پروژه است
  app.use(express.static(path.join(__dirname, '../frontend')));
  console.log('✅ فرانت‌اند از مسیر: frontend/');
}

// ========== MySQL Connection Pool (تنظیم برای هاست) ==========
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'h375936_Admin',
  password: process.env.DB_PASSWORD || '_AsemanTile1234',
  database: process.env.DB_NAME || 'h375936_AsemanTile',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

// تست اتصال به دیتابیس
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ خطا در اتصال به MySQL:', err);
  } else {
    console.log('✅ متصل به MySQL شد');
    connection.release();
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'aseman_super_secret_key_change_in_production';

// ========== مسیرهای Auth (با بررسی وجود فایل) ==========
try {
  const authRoutes = require('./api/auth.cjs');
  app.use('/api/auth', authRoutes);
  console.log('✅ مسیرهای Auth فعال شد');
} catch (e) {
  console.log('⚠️ فایل auth.cjs یافت نشد، مسیرهای auth غیرفعال');
}

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

// ========== Product Templates Routes (با بررسی) ==========
let productTemplateRoutes;
try {
  productTemplateRoutes = require('./routes/productTemplatesRoutes.cjs');
  console.log('✅ مسیرهای Product Templates فعال شد');
} catch(e) {
  productTemplateRoutes = express.Router();
  productTemplateRoutes.get('/', (req, res) => res.json([]));
  productTemplateRoutes.post('/', (req, res) => res.status(201).json({}));
  console.log('⚠️ productTemplatesRoutes.cjs یافت نشد');
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
  } catch (err) { 
    console.error('Error /api/products:', err);
    res.status(500).json({ success: false, error: 'خطا در دریافت محصولات' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/products/code/:code', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM products WHERE sku = ?', [req.params.code]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
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
  try { 
    await promisePool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'محصول حذف شد' });
  } catch (err) { 
    res.status(500).json({ success: false, error: 'خطا در حذف محصول' });
  }
});

// ========== BRANDS ==========
app.get('/api/brands', async (req, res) => {
  try { 
    const [rows] = await promisePool.query('SELECT * FROM brands ORDER BY name');
    res.json(rows);
  } catch(err) { 
    res.status(500).json([]);
  }
});

app.post('/api/brands', async (req, res) => {
  const { name } = req.body;
  if(!name) return res.status(400).json({error:'نام برند الزامی'});
  try { 
    await promisePool.query('INSERT INTO brands (name) VALUES (?)', [name]);
    res.status(201).json({success:true});
  } catch(err) { 
    res.status(500).json({error:err.message});
  }
});

app.put('/api/brands/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try { 
    await promisePool.query('UPDATE brands SET name=? WHERE id=?', [name, id]);
    res.json({success:true});
  } catch(err) { 
    res.status(500).json({error:err.message});
  }
});

app.delete('/api/brands/:id', async (req, res) => {
  try { 
    await promisePool.query('DELETE FROM brands WHERE id=?', [req.params.id]);
    res.json({success:true});
  } catch(err) { 
    res.status(500).json({error:err.message});
  }
});

// ========== TAGS ==========
app.get('/api/tags', async (req, res) => {
  try { 
    const [rows] = await promisePool.query('SELECT * FROM tags ORDER BY name');
    res.json(rows);
  } catch(err) { 
    res.status(500).json([]);
  }
});

app.post('/api/tags', async (req, res) => {
  const { name } = req.body;
  if(!name) return res.status(400).json({error:'نام تگ الزامی'});
  try { 
    await promisePool.query('INSERT INTO tags (name) VALUES (?)', [name]);
    res.status(201).json({success:true});
  } catch(err) { 
    res.status(500).json({error:err.message});
  }
});

app.delete('/api/tags/:name', async (req, res) => {
  try { 
    await promisePool.query('DELETE FROM tags WHERE name=?', [req.params.name]);
    res.json({success:true});
  } catch(err) { 
    res.status(500).json({error:err.message});
  }
});

// ========== PRODUCT TEMPLATES ==========
app.use('/api/product-templates', productTemplateRoutes);

// ========== SUPPORT EXPERTS ==========
app.get('/api/experts', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM support_experts WHERE is_active = 1 ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/experts/all', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM support_experts ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
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
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
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
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/experts/:id', async (req, res) => {
  try {
    const [result] = await promisePool.query('DELETE FROM support_experts WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'کارشناس یافت نشد' });
    res.json({ success: true, message: 'حذف شد' });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
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
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
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
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/wishlist/:id', async (req, res) => {
  try {
    await promisePool.query('DELETE FROM wishlists WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'حذف شد' });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/wishlist/check/:userId/:productId', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      [req.params.userId, req.params.productId]
    );
    res.json({ success: true, liked: rows.length > 0, id: rows[0]?.id || null });
  } catch (err) { 
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== BLOG ==========
app.get('/api/blog', async (req, res) => {
  try { 
    const [rows] = await promisePool.query('SELECT * FROM blog_posts ORDER BY created_at DESC');
    res.json(rows);
  } catch(err) { 
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blog/homepage', async (req, res) => {
  try { 
    const [rows] = await promisePool.query('SELECT * FROM blog_posts WHERE show_on_homepage=1 ORDER BY created_at DESC LIMIT 3');
    res.json(rows);
  } catch(err) { 
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blog/slug/:slug', async (req, res) => {
  try { 
    const [rows] = await promisePool.query('SELECT * FROM blog_posts WHERE slug=?', [req.params.slug]);
    if(rows.length===0) return res.status(404).json({error:'پست یافت نشد'});
    res.json(rows[0]);
  } catch(err) { 
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blog/:id', async (req, res) => {
  try { 
    const [rows] = await promisePool.query('SELECT * FROM blog_posts WHERE id=?', [req.params.id]);
    if(rows.length===0) return res.status(404).json({error:'پست یافت نشد'});
    res.json(rows[0]);
  } catch(err) { 
    res.status(500).json({ error: err.message });
  }
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
  } catch(err) { 
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/blog/:id', async (req, res) => {
  const { id } = req.params;
  const { title, slug, excerpt, content, image, status } = req.body;
  try {
    await promisePool.query('UPDATE blog_posts SET title=?, slug=?, excerpt=?, content=?, image=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [title, slug, excerpt, content, image, status, id]);
    const [row] = await promisePool.query('SELECT * FROM blog_posts WHERE id=?', [id]);
    res.json(row[0]);
  } catch(err) { 
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/blog/:id', async (req, res) => {
  try { 
    await promisePool.query('DELETE FROM blog_posts WHERE id=?', [req.params.id]);
    res.json({ message: 'حذف شد' });
  } catch(err) { 
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/blog/:id/toggle-homepage', async (req, res) => {
  const { id } = req.params;
  const { show_on_homepage } = req.body;
  try { 
    await promisePool.query('UPDATE blog_posts SET show_on_homepage=? WHERE id=?', [show_on_homepage?1:0, id]);
    const [row] = await promisePool.query('SELECT * FROM blog_posts WHERE id=?', [id]);
    res.json(row[0]);
  } catch(err) { 
    res.status(500).json({ error: err.message });
  }
});

// ========== مسیر Root برای SPA ==========
// تمام درخواست‌هایی که به API نیستند را به index.html بفرست
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'صفحه مورد نظر یافت نشد' });
  }
});

// ========== START SERVER (نسخه نهایی برای هاست) ==========
const PORT = process.env.PORT || 5003;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 سرور روی پورت ${PORT} در حال اجراست`);
  console.log(`📁 مسیر جاری: ${__dirname}`);
  console.log(`🗄️ اتصال به دیتابیس: ${process.env.DB_NAME || 'h375936_AsemanTile'}`);
});

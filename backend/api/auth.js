// backend/api/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'aseman_super_secret_key_change_in_production';
const JWT_EXPIRES_IN = '7d';

// ---------- MySQL Pool ----------
const pool = mysql.createPool({
  host: 'localhost',
  user: 'asemant2_Aseman',
  password: 'Aseman@2024!',
  database: 'aseman_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ========== توابع کمکی ==========
const generateToken = (user) => {
  const payload = {
    id: user.id,
    mobile: user.mobile,
    email: user.email,
    type: user.type,
    roles: user.roles || []
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ========== 1. ثبت‌نام کاربر جدید (مشتری عادی) ==========
router.post('/register', async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;

    if (!name || !mobile || !email || !password) {
      return res.status(400).json({ success: false, error: 'نام, شماره موبایل, ایمیل و رمز عبور الزامی است' });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, error: 'رمز عبور باید حداقل ۴ کاراکتر باشد' });
    }

    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }

    const [existingUser] = await pool.query('SELECT id FROM users WHERE mobile = ? OR email = ?', [normalizedMobile, email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, error: 'این شماره موبایل یا ایمیل قبلاً ثبت شده است' });
    }

    const hashedPassword = await hashPassword(password);
    const [result] = await pool.query(
      `INSERT INTO users (name, mobile, email, password_hash, type, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, normalizedMobile, email, hashedPassword, 'customer', 1]
    );

    const newUser = {
      id: result.insertId,
      name,
      mobile: normalizedMobile,
      email,
      type: 'customer',
      created_at: new Date()
    };
    const token = generateToken({ id: newUser.id, mobile: newUser.mobile, email: newUser.email, type: newUser.type, roles: [] });

    res.status(201).json({ success: true, message: 'ثبت‌نام با موفقیت انجام شد', data: { user: newUser, token } });
  } catch (error) {
    console.error('POST /api/auth/register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 2. ورود با ایمیل و رمز عبور (و موبایل) ==========
router.post('/login', async (req, res) => {
  try {
    const { email, mobile, password } = req.body;
    if ((!email && !mobile) || !password) {
      return res.status(400).json({ success: false, error: 'ایمیل یا شماره موبایل و رمز عبور الزامی است' });
    }

    let userQuery;
    let userParam;
    if (email) {
      userQuery = 'SELECT * FROM users WHERE email = ?';
      userParam = email;
    } else {
      let normalizedMobile = mobile;
      if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
        normalizedMobile = normalizedMobile.substring(1);
      }
      userQuery = 'SELECT * FROM users WHERE mobile = ?';
      userParam = normalizedMobile;
    }

    const [rows] = await pool.query(userQuery, [userParam]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'کاربری با این مشخصات یافت نشد' });
    }
    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'حساب کاربری شما غیرفعال شده است' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'رمز عبور اشتباه است' });
    }

    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser, token } });
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 3. ورود ادمین (سریع و ساده) ==========
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username === 'admin' && password === '1234') {
      const token = jwt.sign(
        { id: 1, username: 'admin', type: 'admin', roles: ['admin'] },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      return res.json({ success: true, data: { user: { id: 1, name: 'مدیر سیستم', type: 'admin' }, token } });
    }

    const [result] = await pool.query(`SELECT id, name, email, type, is_active FROM users WHERE email = ? AND type = 'admin'`, [username]);
    if (result.length > 0) {
      const admin = result[0];
      if (password === '1234') {
        const token = generateToken({ id: admin.id, email: admin.email, type: 'admin', roles: ['admin'] });
        return res.json({ success: true, data: { user: admin, token } });
      }
    }
    res.status(401).json({ success: false, error: 'نام کاربری یا رمز عبور اشتباه است' });
  } catch (error) {
    console.error('POST /api/auth/admin-login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 4. درخواست کد OTP ==========
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, error: 'شماره موبایل الزامی است' });

    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) normalizedMobile = normalizedMobile.substring(1);

    const code = generateOtpCode();
    await pool.query(`INSERT INTO otp_codes (mobile, code, expires_at, attempts) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), 0) ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), attempts = 0`, [normalizedMobile, code]);

    console.log(`📱 OTP برای ${normalizedMobile}: ${code}`);
    res.json({ success: true, message: 'کد تایید ارسال شد', ...(process.env.NODE_ENV === 'development' && { test_code: code }) });
  } catch (error) {
    console.error('POST /api/auth/send-otp error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 5. ورود با OTP (ثبت‌نام خودکار) ==========
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, code, name } = req.body;
    if (!mobile || !code) return res.status(400).json({ success: false, error: 'شماره موبایل و کد تایید الزامی است' });

    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) normalizedMobile = normalizedMobile.substring(1);

    const [otpResult] = await pool.query(`SELECT * FROM otp_codes WHERE mobile = ? AND code = ? AND expires_at > NOW()`, [normalizedMobile, code]);
    if (otpResult.length === 0) return res.status(401).json({ success: false, error: 'کد تایید نامعتبر یا منقضی شده است' });

    await pool.query('DELETE FROM otp_codes WHERE mobile = ?', [normalizedMobile]);

    let [userResult] = await pool.query('SELECT id, name, mobile, email, type, is_active FROM users WHERE mobile = ?', [normalizedMobile]);
    let isNewUser = false;
    if (userResult.length === 0) {
      const [insertResult] = await pool.query(
        `INSERT INTO users (name, mobile, email, type, is_active) VALUES (?, ?, ?, ?, ?)`,
        [name || 'کاربر', normalizedMobile, `${normalizedMobile}@user.com`, 'customer', 1]
      );
      const userId = insertResult.insertId;
      [userResult] = await pool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE id = ?', [userId]);
      isNewUser = true;
    }
    const user = userResult[0];
    if (!user.is_active) return res.status(403).json({ success: false, error: 'حساب کاربری شما غیرفعال شده است' });

    const token = generateToken({ id: user.id, mobile: user.mobile, email: user.email, type: user.type, roles: [] });
    res.json({ success: true, data: { user: user, token, isNewUser } });
  } catch (error) {
    console.error('POST /api/auth/verify-otp error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 6. ثبت‌نام همکار (نیاز به تأیید) ==========
router.post('/register-partner', async (req, res) => {
  try {
    const { name, mobile, email, password, companyName, city, address } = req.body;
    if (!name || !mobile || !email || !password || !companyName) {
      return res.status(400).json({ success: false, error: 'نام، موبایل، ایمیل، رمز عبور و نام شرکت الزامی است' });
    }

    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) normalizedMobile = normalizedMobile.substring(1);

    const [existingUser] = await pool.query('SELECT id FROM users WHERE mobile = ? OR email = ?', [normalizedMobile, email]);
    if (existingUser.length > 0) return res.status(409).json({ success: false, error: 'این شماره موبایل یا ایمیل قبلاً ثبت شده است' });

    const hashedPassword = await hashPassword(password);
    const [userResult] = await pool.query(
      `INSERT INTO users (name, mobile, email, password_hash, type, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, normalizedMobile, email, hashedPassword, 'partner', 1]
    );
    const userId = userResult.insertId;

    await pool.query(`INSERT INTO partners (user_id, company_name, city, address, is_approved) VALUES (?, ?, ?, ?, ?)`, [userId, companyName, city || null, address || null, 0]);

    res.status(201).json({ success: true, message: 'درخواست همکاری شما ثبت شد. پس از تأیید مدیریت می‌توانید وارد شوید.' });
  } catch (error) {
    console.error('POST /api/auth/register-partner error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 7. دریافت اطلاعات کاربر جاری ==========
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'توکن ارائه نشده است' });

    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch (err) { return res.status(401).json({ success: false, error: 'توکن نامعتبر است' }); }

    const [rows] = await pool.query(`SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE id = ?`, [decoded.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });

    const user = rows[0];
    let partnerInfo = null;
    if (user.type === 'partner') {
      const [partnerRows] = await pool.query('SELECT * FROM partners WHERE user_id = ?', [user.id]);
      if (partnerRows.length > 0) partnerInfo = partnerRows[0];
    }

    res.json({ success: true, data: { user, partner: partnerInfo } });
  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 8. خروج ==========
router.post('/logout', async (req, res) => {
  res.json({ success: true, message: 'خروج با موفقیت انجام شد' });
});

// ========== 9. تغییر رمز عبور ==========
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'توکن ارائه نشده است' });

    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch (err) { return res.status(401).json({ success: false, error: 'توکن نامعتبر است' }); }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ success: false, error: 'رمز عبور قدیم و جدید الزامی است' });
    if (newPassword.length < 4) return res.status(400).json({ success: false, error: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد' });

    const [userResult] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [decoded.id]);
    if (userResult.length === 0) return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });

    const isValid = await bcrypt.compare(oldPassword, userResult[0].password_hash);
    if (!isValid) return res.status(401).json({ success: false, error: 'رمز عبور قدیم اشتباه است' });

    const hashedNewPassword = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedNewPassword, decoded.id]);

    res.json({ success: true, message: 'رمز عبور با موفقیت تغییر کرد' });
  } catch (error) {
    console.error('POST /api/auth/change-password error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
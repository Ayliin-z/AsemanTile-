// backend/src/api/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../utils/db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'aseman_super_secret_key_change_in_production';
const JWT_EXPIRES_IN = '7d';

// ========== توابع کمکی ==========

// تولید JWT
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

// هش کردن پسورد
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// تولید کد OTP 6 رقمی (برای ورود با موبایل)
const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ========== 1. ثبت‌نام کاربر جدید (مشتری عادی) ==========
router.post('/register', async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;

    // اعتبارسنجی
    if (!name || !mobile || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'نام، شماره موبایل، ایمیل و رمز عبور الزامی است'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'رمز عبور باید حداقل ۴ کاراکتر باشد'
      });
    }

    // نرمالایز شماره موبایل
    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }

    // بررسی وجود کاربر
    const existingUser = await query(
      'SELECT id FROM users WHERE mobile = ? OR email = ?',
      [normalizedMobile, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'این شماره موبایل یا ایمیل قبلاً ثبت شده است'
      });
    }

    // هش کردن پسورد
    const hashedPassword = await hashPassword(password);

    // ایجاد کاربر جدید
    const result = await query(
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

    // تولید توکن
    const token = generateToken({
      id: newUser.id,
      mobile: newUser.mobile,
      email: newUser.email,
      type: newUser.type,
      roles: []
    });

    res.status(201).json({
      success: true,
      message: 'ثبت‌نام با موفقیت انجام شد',
      data: {
        user: newUser,
        token
      }
    });

  } catch (error) {
    console.error('POST /api/auth/register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 2. ورود با ایمیل و رمز عبور ==========
// در POST /login
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
      // اگر موبایل با 0 شروع شده، نرمال‌سازی کن (۰ ابتدا را حذف کن)
      let normalizedMobile = mobile;
      if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
        normalizedMobile = normalizedMobile.substring(1);
      }
      userQuery = 'SELECT * FROM users WHERE mobile = ?';
      userParam = normalizedMobile;
    }

    const result = await query(userQuery, [userParam]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'کاربری با این مشخصات یافت نشد' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'حساب کاربری شما غیرفعال شده است' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'رمز عبور اشتباه است' });
    }

    // تولید توکن و بازگرداندن کاربر (همانند قبل)
    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser, token } });
  } catch (error) {
    // ...
  }
});
// ========== 3. ورود ادمین (سریع و ساده) ==========
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // اعتبارسنجی ساده (باز هم می‌تونی از دیتابیس هم بیاری)
    if (username === 'admin' && password === '1234') {
      const token = jwt.sign(
        { id: 1, username: 'admin', type: 'admin', roles: ['admin'] },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.json({
        success: true,
        data: {
          user: { id: 1, name: 'مدیر سیستم', type: 'admin' },
          token
        }
      });
    }

    // یا از دیتابیس چک کن
    const result = await query(
      `SELECT id, name, email, type, is_active
       FROM users 
       WHERE email = ? AND type = 'admin'`,
      [username]
    );

    if (result.rows.length > 0) {
      const admin = result.rows[0];
      
      // اگه پسورد توی دیتابیس داری، بررسی کن
      // const isValid = await bcrypt.compare(password, admin.password_hash);
      
      // فعلاً ساده
      if (password === '1234') {
        const token = generateToken({
          id: admin.id,
          email: admin.email,
          type: 'admin',
          roles: ['admin']
        });

        return res.json({
          success: true,
          data: { user: admin, token }
        });
      }
    }

    res.status(401).json({
      success: false,
      error: 'نام کاربری یا رمز عبور اشتباه است'
    });

  } catch (error) {
    console.error('POST /api/auth/admin-login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 4. درخواست کد OTP (برای ورود با موبایل) ==========
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        success: false,
        error: 'شماره موبایل الزامی است'
      });
    }

    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }

    const code = generateOtpCode();
    
    // ذخیره OTP در دیتابیس (با انقضای ۵ دقیقه) - استفاده از ON DUPLICATE KEY UPDATE
    await query(
      `INSERT INTO otp_codes (mobile, code, expires_at, attempts)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), 0)
       ON DUPLICATE KEY UPDATE
         code = VALUES(code),
         expires_at = VALUES(expires_at),
         attempts = 0`,
      [normalizedMobile, code]
    );

    // در محیط توسعه، کد رو لاگ کن
    console.log(`📱 OTP برای ${normalizedMobile}: ${code}`);
    
    // در محیط تولید، اینجا باید پیامک بزنی
    // await sendSms(normalizedMobile, `کد ورود شما: ${code}`);

    res.json({
      success: true,
      message: 'کد تایید ارسال شد',
      ...(process.env.NODE_ENV === 'development' && { test_code: code })
    });

  } catch (error) {
    console.error('POST /api/auth/send-otp error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 5. ورود با OTP (ثبت‌نام خودکار) ==========
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, code, name } = req.body;

    if (!mobile || !code) {
      return res.status(400).json({
        success: false,
        error: 'شماره موبایل و کد تایید الزامی است'
      });
    }

    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }

    // بررسی کد OTP
    const otpResult = await query(
      `SELECT * FROM otp_codes 
       WHERE mobile = ? AND code = ? AND expires_at > NOW()`,
      [normalizedMobile, code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'کد تایید نامعتبر یا منقضی شده است'
      });
    }

    // حذف OTP بعد از استفاده
    await query('DELETE FROM otp_codes WHERE mobile = ?', [normalizedMobile]);

    // پیدا کردن یا ایجاد کاربر
    let userResult = await query(
      'SELECT id, name, mobile, email, type, is_active FROM users WHERE mobile = ?',
      [normalizedMobile]
    );

    let isNewUser = false;

    if (userResult.rows.length === 0) {
      // ثبت‌نام خودکار
      const insertResult = await query(
        `INSERT INTO users (name, mobile, email, type, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [name || 'کاربر', normalizedMobile, `${normalizedMobile}@user.com`, 'customer', 1]
      );
      const userId = insertResult.insertId;
      userResult = await query(
        'SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE id = ?',
        [userId]
      );
      isNewUser = true;
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'حساب کاربری شما غیرفعال شده است'
      });
    }

    // تولید توکن
    const token = generateToken({
      id: user.id,
      mobile: user.mobile,
      email: user.email,
      type: user.type,
      roles: []
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          type: user.type
        },
        token,
        isNewUser
      }
    });

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
      return res.status(400).json({
        success: false,
        error: 'نام، موبایل، ایمیل، رمز عبور و نام شرکت الزامی است'
      });
    }

    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }

    // بررسی وجود کاربر
    const existingUser = await query(
      'SELECT id FROM users WHERE mobile = ? OR email = ?',
      [normalizedMobile, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'این شماره موبایل یا ایمیل قبلاً ثبت شده است'
      });
    }

    const hashedPassword = await hashPassword(password);

    // ایجاد کاربر با نقش partner (فعال – اما تأیید همکار جداگانه است)
    const userResult = await query(
      `INSERT INTO users (name, mobile, email, password_hash, type, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, normalizedMobile, email, hashedPassword, 'partner', 1]
    );

    const userId = userResult.insertId;

    // ایجاد رکورد همکار (در انتظار تأیید)
    await query(
      `INSERT INTO partners (user_id, company_name, city, address, is_approved)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, companyName, city || null, address || null, 0]
    );

    res.status(201).json({
      success: true,
      message: 'درخواست همکاری شما ثبت شد. پس از تأیید مدیریت می‌توانید وارد شوید.'
    });

  } catch (error) {
    console.error('POST /api/auth/register-partner error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 7. دریافت اطلاعات کاربر جاری (با توکن) ==========
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'توکن ارائه نشده است'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'توکن نامعتبر است'
      });
    }

    const result = await query(
      `SELECT id, name, mobile, email, type, is_active, created_at
       FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'کاربر یافت نشد'
      });
    }

    const user = result.rows[0];

    // اگر همکار بود، اطلاعات شرکت رو هم برگردون
    let partnerInfo = null;
    if (user.type === 'partner') {
      const partnerResult = await query(
        'SELECT * FROM partners WHERE user_id = ?',
        [user.id]
      );
      if (partnerResult.rows.length > 0) {
        partnerInfo = partnerResult.rows[0];
      }
    }

    res.json({
      success: true,
      data: {
        user,
        partner: partnerInfo
      }
    });

  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 8. خروج از حساب ==========
router.post('/logout', async (req, res) => {
  // در JWT واقعاً نیازی به logout نیست چون توکن سمت کلاینت حذف می‌شود
  res.json({
    success: true,
    message: 'خروج با موفقیت انجام شد'
  });
});

// ========== 9. تغییر رمز عبور ==========
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'توکن ارائه نشده است' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'توکن نامعتبر است' });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'رمز عبور قدیم و جدید الزامی است'
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد'
      });
    }

    // دریافت کاربر
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = ?',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
    }

    // بررسی رمز قدیم
    const isValid = await bcrypt.compare(oldPassword, userResult.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'رمز عبور قدیم اشتباه است'
      });
    }

    // هش کردن رمز جدید
    const hashedNewPassword = await hashPassword(newPassword);

    // به‌روزرسانی
    await query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, decoded.id]
    );

    res.json({
      success: true,
      message: 'رمز عبور با موفقیت تغییر کرد'
    });

  } catch (error) {
    console.error('POST /api/auth/change-password error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
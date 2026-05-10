// backend/api/auth.cjs
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'aseman_super_secret_key_change_in_production';
const JWT_EXPIRES_IN = '7d';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'asemant2_Aseman',
  password: 'Aseman@2024!',
  database: 'aseman_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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

// ========== 1. ثبت‌نام مشتری عادی ==========
router.post('/register', async (req, res) => {
  try {
    const { name, mobile, password } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, error: 'نام، شماره موبایل و رمز عبور الزامی است' });
    }
    if (password.length < 4) {
      return res.status(400).json({ success: false, error: 'رمز عبور باید حداقل ۴ کاراکتر باشد' });
    }

    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }

    const [existingUser] = await pool.query('SELECT id FROM users WHERE mobile = ?', [normalizedMobile]);
    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, error: 'این شماره موبایل قبلاً ثبت شده است' });
    }

    const hashedPassword = await hashPassword(password);
    const [result] = await pool.query(
      `INSERT INTO users (name, mobile, email, password_hash, type, is_active)
       VALUES (?, ?, NULL, ?, 'customer', 1)`,
      [name, normalizedMobile, hashedPassword]
    );

    const newUser = {
      id: result.insertId,
      name,
      mobile: normalizedMobile,
      email: null,
      type: 'customer',
      created_at: new Date()
    };
    const token = generateToken({ id: newUser.id, mobile: newUser.mobile, email: null, type: newUser.type, roles: [] });

    res.status(201).json({ success: true, message: 'ثبت‌نام با موفقیت انجام شد', data: { user: newUser, token } });
  } catch (error) {
    console.error('POST /api/auth/register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 2. ورود ==========
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res.status(400).json({ success: false, error: 'شماره موبایل و رمز عبور الزامی است' });
    }

    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }

    let [rows] = await pool.query('SELECT * FROM users WHERE mobile = ?', [normalizedMobile]);
    if (rows.length === 0) {
      const mobileWithZero = '0' + normalizedMobile;
      [rows] = await pool.query('SELECT * FROM users WHERE mobile = ?', [mobileWithZero]);
    }

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, error: 'کاربری با این شماره موبایل یافت نشد' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'حساب کاربری شما غیرفعال شده است' });
    }

    if (!user.password_hash) {
      return res.status(400).json({ success: false, error: 'این حساب رمز عبور ندارد' });
    }

    let isValidPassword = false;
    if (user.password_hash.startsWith('$2') && user.password_hash.length === 60) {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    } else {
      isValidPassword = (password === user.password_hash);
    }

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

// ========== 3. ثبت‌نام همکار ==========
router.post('/register-partner', async (req, res) => {
  try {
    const { name, mobile, password, companyName, city, address } = req.body;
    if (!name || !mobile || !password || !companyName) {
      return res.status(400).json({ success: false, error: 'نام، موبایل، رمز عبور و نام شرکت الزامی است' });
    }

    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }

    const [existingUser] = await pool.query('SELECT id FROM users WHERE mobile = ?', [normalizedMobile]);
    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, error: 'این شماره موبایل قبلاً ثبت شده است' });
    }

    const hashedPassword = await hashPassword(password);
    const [userResult] = await pool.query(
      `INSERT INTO users (name, mobile, email, password_hash, type, is_active)
       VALUES (?, ?, NULL, ?, 'partner', 0)`,
      [name, normalizedMobile, hashedPassword]
    );
    const userId = userResult.insertId;

    await pool.query(
      `INSERT INTO partners (user_id, company_name, city, address, is_approved)
       VALUES (?, ?, ?, ?, 0)`,
      [userId, companyName, city || null, address || null]
    );

    res.status(201).json({ success: true, message: 'درخواست همکاری شما ثبت شد. پس از تأیید مدیریت می‌توانید وارد شوید.' });
  } catch (error) {
    console.error('POST /api/auth/register-partner error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
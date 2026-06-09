// src/api/auth.js (نسخه کامل با JWT)
import express from 'express';
import { query } from '../utils/db.js';
import { generateToken } from '../utils/jwt.js';

const router = express.Router();

// ========== توابع کمکی OTP ==========

const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveOtpCode = async (mobile, code) => {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  
  await query('DELETE FROM otp_codes WHERE mobile = $1', [mobile]);
  
  await query(`
    INSERT INTO otp_codes (mobile, code, expires_at, attempts)
    VALUES ($1, $2, $3, 0)
  `, [mobile, code, expiresAt]);
  
  return true;
};

const verifyOtpCode = async (mobile, code) => {
  const result = await query(`
    SELECT * FROM otp_codes 
    WHERE mobile = $1 AND code = $2 AND expires_at > NOW()
  `, [mobile, code]);
  
  if (result.rows.length === 0) {
    return false;
  }
  
  await query('DELETE FROM otp_codes WHERE mobile = $1', [mobile]);
  return true;
};

// ========== POST /api/auth/send-otp ==========
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    
    if (!mobile || mobile.length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'شماره موبایل معتبر نیست' 
      });
    }
    
    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }
    
    const code = generateOtpCode();
    await saveOtpCode(normalizedMobile, code);
    
    console.log(`📱 OTP برای ${normalizedMobile}: ${code}`);
    
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

// ========== POST /api/auth/login ==========
router.post('/login', async (req, res) => {
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
    
    const isValid = await verifyOtpCode(normalizedMobile, code);
    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'کد تایید نامعتبر یا منقضی شده است' 
      });
    }
    
    let user = await query(`
      SELECT * FROM users WHERE mobile = $1
    `, [normalizedMobile]);
    
    let isNewUser = false;
    
    if (user.rows.length === 0) {
      const result = await query(`
        INSERT INTO users (name, mobile, type, is_active)
        VALUES ($1, $2, 'customer', true)
        RETURNING *
      `, [name || 'کاربر', normalizedMobile]);
      
      user = result.rows[0];
      isNewUser = true;
    } else {
      user = user.rows[0];
    }
    
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false, 
        error: 'حساب کاربری شما مسدود شده است' 
      });
    }
    
    // دریافت نقش‌های کاربر
    const rolesResult = await query(`
      SELECT r.name FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
    `, [user.id]);
    
    const roles = rolesResult.rows.map(r => r.name);
    
    // دریافت اطلاعات همکار
    let partnerInfo = null;
    if (user.type === 'partner') {
      const partnerResult = await query(`
        SELECT * FROM partners WHERE user_id = $1
      `, [user.id]);
      
      if (partnerResult.rows.length > 0) {
        partnerInfo = partnerResult.rows[0];
        
        if (!partnerInfo.is_approved) {
          return res.status(403).json({ 
            success: false, 
            error: 'حساب همکاری شما هنوز تأیید نشده است' 
          });
        }
      }
    }
    
    // تولید JWT token
    const token = generateToken({
      id: user.id,
      mobile: user.mobile,
      type: user.type,
      roles: roles
    });
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          type: user.type,
          roles: roles
        },
        partner: partnerInfo,
        isNewUser: isNewUser,
        token: token
      }
    });
    
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/auth/register-partner ==========
router.post('/register-partner', async (req, res) => {
  try {
    const { mobile, name, companyName, city, address } = req.body;
    
    if (!mobile || !companyName) {
      return res.status(400).json({ 
        success: false, 
        error: 'شماره موبایل و نام شرکت الزامی است' 
      });
    }
    
    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }
    
    const existingUser = await query(`
      SELECT * FROM users WHERE mobile = $1
    `, [normalizedMobile]);
    
    let userId;
    
    if (existingUser.rows.length === 0) {
      const newUser = await query(`
        INSERT INTO users (name, mobile, type, is_active)
        VALUES ($1, $2, 'partner', true)
        RETURNING id
      `, [name || 'همکار', normalizedMobile]);
      
      userId = newUser.rows[0].id;
    } else {
      userId = existingUser.rows[0].id;
      
      await query(`
        UPDATE users SET type = 'partner' WHERE id = $1
      `, [userId]);
    }
    
    const partner = await query(`
      INSERT INTO partners (user_id, company_name, city, address, is_approved)
      VALUES ($1, $2, $3, $4, false)
      RETURNING *
    `, [userId, companyName, city || null, address || null]);
    
    res.status(201).json({
      success: true,
      message: 'درخواست همکاری ثبت شد. پس از تأیید مدیریت می‌توانید وارد شوید.',
      data: partner.rows[0]
    });
    
  } catch (error) {
    console.error('POST /api/auth/register-partner error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/auth/me ==========
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (!token) {
      return res.status(401).json({ success: false, error: 'توکن ارائه نشده است' });
    }
    
    const { getUserFromToken } = await import('../utils/jwt.js');
    const userData = getUserFromToken(token);
    
    if (!userData) {
      return res.status(401).json({ success: false, error: 'توکن نامعتبر است' });
    }
    
    const user = await query(`
      SELECT id, name, mobile, type, is_active, created_at
      FROM users WHERE id = $1
    `, [userData.id]);
    
    if (user.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
    }
    
    res.json({ success: true, data: user.rows[0] });
    
  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/auth/logout ==========
router.post('/logout', async (req, res) => {
  res.json({ success: true, message: 'خروج با موفقیت انجام شد' });
});

export default router;
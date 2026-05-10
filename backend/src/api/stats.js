// backend/src/api/stats.js
import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

// آمار ثبت‌نام کاربران
router.get('/registrations', async (req, res) => {
  try {
    // امروز
    const todayRes = await query(`
      SELECT 
        SUM(CASE WHEN type = 'customer' THEN 1 ELSE 0 END) as customers,
        SUM(CASE WHEN type = 'partner' THEN 1 ELSE 0 END) as partners
      FROM users
      WHERE DATE(created_at) = CURDATE()
    `);
    // هفته گذشته (۷ روز گذشته تا دیروز)
    const weekRes = await query(`
      SELECT 
        SUM(CASE WHEN type = 'customer' THEN 1 ELSE 0 END) as customers,
        SUM(CASE WHEN type = 'partner' THEN 1 ELSE 0 END) as partners
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND created_at < CURDATE()
    `);
    // ماه جاری
    const monthRes = await query(`
      SELECT 
        SUM(CASE WHEN type = 'customer' THEN 1 ELSE 0 END) as customers,
        SUM(CASE WHEN type = 'partner' THEN 1 ELSE 0 END) as partners
      FROM users
      WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `);
    // آمار روزانه ۷ روز گذشته
    const dailyRes = await query(`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN type = 'customer' THEN 1 ELSE 0 END) as customers,
        SUM(CASE WHEN type = 'partner' THEN 1 ELSE 0 END) as partners
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: {
        today: todayRes.rows[0],
        week: weekRes.rows[0],
        month: monthRes.rows[0],
        daily: dailyRes.rows
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت آمار ثبت‌نام' });
  }
});

// آمار پیش‌فاکتورها (اختیاری)
router.get('/quotes-summary', async (req, res) => {
  try {
    const todayRes = await query(`
      SELECT COUNT(*) as count, SUM(total_amount) as total
      FROM quotes WHERE DATE(created_at) = CURDATE()
    `);
    const monthRes = await query(`
      SELECT COUNT(*) as count, SUM(total_amount) as total
      FROM quotes WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
    `);
    res.json({
      success: true,
      data: {
        today: { count: todayRes.rows[0].count || 0, amount: todayRes.rows[0].total || 0 },
        month: { count: monthRes.rows[0].count || 0, amount: monthRes.rows[0].total || 0 }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت آمار پیش‌فاکتورها' });
  }
});

export default router;
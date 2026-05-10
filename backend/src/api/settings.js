// backend/src/api/settings.js
import express from 'express';
import { query } from '../utils/db.js';

const router = express.Router();

// تابع کمک برای بارگذاری همه تنظیمات از دیتابیس
async function loadAllSettings() {
  const result = await query('SELECT `key`, `value` FROM site_settings');
  const settings = {};
  for (const row of result.rows) {
    // تلاش برای parse اگر مقدار JSON باشد
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  // تنظیمات پیش‌فرض برای کلیدهایی که در دیتابیس وجود ندارند
  const defaults = {
    sales_mode: 'cart',
    landing_tags: ['فروش ویژه', 'جدید', 'پرفروش'],
    site_name: 'کاشی و سرامیک آسمان',
    site_description: 'فروشگاه تخصصی کاشی و سرامیک',
    site_logo: '/images/logo.png',
    site_favicon: '/favicon.ico',
    contact_phone: '07143333333',
    contact_mobile: '0910870698',
    contact_email: 'info@asemantile.com',
    contact_address: 'شیراز، بلوار پاسداران، نبش کوچه ۶۰، طبقه دوم بانک سیه',
    social_instagram: 'https://instagram.com/aseman_tile',
    social_telegram: 'https://t.me/aseman_tile',
    social_whatsapp: 'https://wa.me/98910870698',
    meta_keywords: 'کاشی, سرامیک, کاشی و سرامیک, فروش کاشی, شیراز',
    meta_description: 'فروشگاه تخصصی کاشی و سرامیک آسمان - ارائه انواع کاشی و سرامیک با بهترین کیفیت و قیمت',
    show_prices: true,
    show_inventory: true,
    allow_partner_register: true,
    maintenance_mode: false,
    enable_quick_order: true,
    sms_enabled: false,
    sms_api_key: '',
    sms_sender_number: '',
    tax_percent: 9,
    shipping_cost: 500000,
    free_shipping_threshold: 5000000,
    primary_color: '#13314c',
    secondary_color: '#ffd800',
    accent_color: '#1c7385'
  };
  // ادغام تنظیمات پیش‌فرض با مقادیر موجود
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (settings[key] === undefined) {
      settings[key] = defaultValue;
      // درج مقدار پیش‌فرض در دیتابیس
      const valueStr = typeof defaultValue === 'object' ? JSON.stringify(defaultValue) : String(defaultValue);
      await query('INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', [key, valueStr, valueStr]);
    }
  }
  return settings;
}

// تابع کمک برای ذخیره یک تنظیم
async function saveSetting(key, value) {
  const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await query('INSERT INTO site_settings (`key`, `value`, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = ?, updated_at = NOW()', [key, valueStr, valueStr]);
}

// ========== GET /api/settings ==========
router.get('/', async (req, res) => {
  try {
    const settings = await loadAllSettings();
    res.json({ success: true, data: settings, last_updated: new Date().toISOString() });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/settings/:key ==========
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await query('SELECT `value` FROM site_settings WHERE `key` = ?', [key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'تنظیمات یافت نشد' });
    }
    let value = result.rows[0].value;
    try { value = JSON.parse(value); } catch(e) { /* value is string */ }
    res.json({ success: true, data: { [key]: value } });
  } catch (error) {
    console.error('GET /api/settings/:key error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PUT /api/settings/:key ==========
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    let { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'مقدار تنظیمات الزامی است' });
    }
    // اعتبارسنجی
    if (key === 'sales_mode' && !['cart', 'contact'].includes(value)) {
      return res.status(400).json({ success: false, error: 'حالت فروش باید cart یا contact باشد' });
    }
    if (key === 'landing_tags' && !Array.isArray(value)) {
      return res.status(400).json({ success: false, error: 'تگ‌های صفحه اصلی باید آرایه باشند' });
    }
    if (['show_prices', 'show_inventory', 'allow_partner_register', 'maintenance_mode', 'enable_quick_order', 'sms_enabled'].includes(key)) {
      value = value === true || value === 'true';
    } else if (['tax_percent', 'shipping_cost', 'free_shipping_threshold'].includes(key)) {
      value = Number(value);
    }
    await saveSetting(key, value);
    console.log(`⚙️ تنظیمات به‌روزرسانی شد: ${key} = ${JSON.stringify(value)}`);
    res.json({ success: true, data: { [key]: value }, message: 'تنظیمات با موفقیت ذخیره شد' });
  } catch (error) {
    console.error('PUT /api/settings/:key error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/settings/bulk ==========
router.post('/bulk', async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'تنظیمات را به صورت object ارسال کنید' });
    }
    let updatedCount = 0;
    for (const [key, val] of Object.entries(settings)) {
      let value = val;
      // اعتبارسنجی ساده
      if (key === 'sales_mode' && !['cart', 'contact'].includes(value)) continue;
      if (key === 'landing_tags' && !Array.isArray(value)) continue;
      if (['show_prices', 'show_inventory', 'allow_partner_register', 'maintenance_mode', 'enable_quick_order', 'sms_enabled'].includes(key)) {
        value = value === true || value === 'true';
      } else if (['tax_percent', 'shipping_cost', 'free_shipping_threshold'].includes(key)) {
        value = Number(value);
      }
      await saveSetting(key, value);
      updatedCount++;
    }
    res.json({ success: true, message: `${updatedCount} تنظیمات با موفقیت ذخیره شد` });
  } catch (error) {
    console.error('POST /api/settings/bulk error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/settings/public/public-settings ==========
router.get('/public/public-settings', async (req, res) => {
  try {
    const settings = await loadAllSettings();
    const publicKeys = [
      'sales_mode', 'maintenance_mode', 'landing_tags',
      'site_name', 'site_description', 'contact_phone', 'contact_mobile',
      'contact_email', 'contact_address', 'social_instagram', 'social_telegram', 'social_whatsapp'
    ];
    const publicSettings = {};
    for (const key of publicKeys) {
      if (settings[key] !== undefined) publicSettings[key] = settings[key];
    }
    res.json({ success: true, data: publicSettings });
  } catch (error) {
    console.error('GET /api/settings/public/public-settings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/settings/feature-toggles ==========
router.get('/feature-toggles', async (req, res) => {
  try {
    const settings = await loadAllSettings();
    const toggles = {
      show_prices: settings.show_prices,
      show_inventory: settings.show_inventory,
      allow_partner_register: settings.allow_partner_register,
      maintenance_mode: settings.maintenance_mode,
      enable_quick_order: settings.enable_quick_order,
      sms_enabled: settings.sms_enabled
    };
    res.json({ success: true, data: toggles });
  } catch (error) {
    console.error('GET /api/settings/feature-toggles error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POST /api/settings/reset ==========
router.post('/reset', async (req, res) => {
  try {
    const defaults = {
      sales_mode: 'cart',
      landing_tags: ['فروش ویژه', 'جدید', 'پرفروش'],
      site_name: 'کاشی و سرامیک آسمان',
      site_description: 'فروشگاه تخصصی کاشی و سرامیک',
      site_logo: '/images/logo.png',
      site_favicon: '/favicon.ico',
      contact_phone: '07143333333',
      contact_mobile: '0910870698',
      contact_email: 'info@asemantile.com',
      contact_address: 'شیراز، بلوار پاسداران، نبش کوچه ۶۰، طبقه دوم بانک سیه',
      social_instagram: 'https://instagram.com/aseman_tile',
      social_telegram: 'https://t.me/aseman_tile',
      social_whatsapp: 'https://wa.me/98910870698',
      meta_keywords: 'کاشی, سرامیک, کاشی و سرامیک, فروش کاشی, شیراز',
      meta_description: 'فروشگاه تخصصی کاشی و سرامیک آسمان - ارائه انواع کاشی و سرامیک با بهترین کیفیت و قیمت',
      show_prices: true,
      show_inventory: true,
      allow_partner_register: true,
      maintenance_mode: false,
      enable_quick_order: true,
      sms_enabled: false,
      sms_api_key: '',
      sms_sender_number: '',
      tax_percent: 9,
      shipping_cost: 500000,
      free_shipping_threshold: 5000000,
      primary_color: '#13314c',
      secondary_color: '#ffd800',
      accent_color: '#1c7385'
    };
    for (const [key, value] of Object.entries(defaults)) {
      await saveSetting(key, value);
    }
    console.log('🔄 تنظیمات به حالت پیش‌فرض بازنشانی شد');
    const newSettings = await loadAllSettings();
    res.json({ success: true, data: newSettings, message: 'تنظیمات به حالت پیش‌فرض بازنشانی شد' });
  } catch (error) {
    console.error('POST /api/settings/reset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/settings/contact/info ==========
router.get('/contact/info', async (req, res) => {
  try {
    const settings = await loadAllSettings();
    const contactInfo = {
      phone: settings.contact_phone,
      mobile: settings.contact_mobile,
      email: settings.contact_email,
      address: settings.contact_address,
      social: {
        instagram: settings.social_instagram,
        telegram: settings.social_telegram,
        whatsapp: settings.social_whatsapp
      }
    };
    res.json({ success: true, data: contactInfo });
  } catch (error) {
    console.error('GET /api/settings/contact/info error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== GET /api/settings/shipping/info ==========
router.get('/shipping/info', async (req, res) => {
  try {
    const settings = await loadAllSettings();
    const shippingInfo = {
      tax_percent: settings.tax_percent,
      shipping_cost: settings.shipping_cost,
      free_shipping_threshold: settings.free_shipping_threshold
    };
    res.json({ success: true, data: shippingInfo });
  } catch (error) {
    console.error('GET /api/settings/shipping/info error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
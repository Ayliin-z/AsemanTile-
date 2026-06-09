-- ======================================================
-- جدول users (کاربران سیستم شامل مشتری، همکار، ادمین، کارمند)
-- ======================================================
CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  type ENUM('admin', 'employee', 'partner', 'customer') DEFAULT 'customer',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ======================================================
-- جدول partners (اطلاعات تکمیلی همکاران)
-- ======================================================
CREATE TABLE IF NOT EXISTS partners (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  user_name VARCHAR(100),
  user_mobile VARCHAR(15),
  user_email VARCHAR(100),
  company_name VARCHAR(200) NOT NULL,
  city VARCHAR(100),
  address TEXT,
  credit_limit BIGINT DEFAULT 0,
  is_approved TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ======================================================
-- جدول employees (مدیریت کارمندان)
-- ======================================================
CREATE TABLE IF NOT EXISTS employees (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  permissions JSON,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ======================================================
-- جدول roles و user_roles (برای نقش‌های پیشرفته – اختیاری)
-- ======================================================
CREATE TABLE IF NOT EXISTS roles (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- ======================================================
-- جدول products (محصولات)
-- ======================================================
CREATE TABLE IF NOT EXISTS products (
  id INT NOT NULL AUTO_INCREMENT,
  sku VARCHAR(50) UNIQUE,
  grade VARCHAR(10),
  name VARCHAR(255) NOT NULL,
  price_public DECIMAL(15,2) DEFAULT 0,
  price_partner DECIMAL(15,2) DEFAULT 0,
  discount INT DEFAULT 0,
  description TEXT,
  brand VARCHAR(100),
  glaze_type VARCHAR(50),
  suitable_for VARCHAR(100),
  category VARCHAR(100),
  size VARCHAR(50),
  glaze VARCHAR(50),
  color VARCHAR(50),
  images JSON,
  full_description TEXT,
  tags JSON,
  audience ENUM('all','customers','partners') DEFAULT 'all',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ======================================================
-- جدول inventory (موجودی و رزرو)
-- ======================================================
CREATE TABLE IF NOT EXISTS inventory (
  id INT NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  stock_quantity INT DEFAULT 0,
  reserved_stock INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_product (product_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ======================================================
-- جدول inventory_logs (تاریخچه تغییرات موجودی)
-- ======================================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  id INT NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  change_type ENUM('increase','decrease','reserve','release') NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(255),
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ======================================================
-- جدول brands (برندها)
-- ======================================================
CREATE TABLE IF NOT EXISTS brands (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ======================================================
-- جدول tags (تگ‌ها)
-- ======================================================
CREATE TABLE IF NOT EXISTS tags (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  enabled TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ======================================================
-- جدول categories (دسته‌بندی محصولات)
-- ======================================================
CREATE TABLE IF NOT EXISTS categories (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  parent_id INT,
  image VARCHAR(255),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ======================================================
-- جدول blog_posts (مقالات وبلاگ)
-- ======================================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt TEXT,
  content LONGTEXT NOT NULL,
  image VARCHAR(255),
  status ENUM('draft','published') DEFAULT 'published',
  show_on_homepage TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ======================================================
-- جدول contact_requests (درخواست‌های تماس)
-- ======================================================
CREATE TABLE IF NOT EXISTS contact_requests (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  city VARCHAR(100),
  area_m2 INT,
  message TEXT,
  notes TEXT,
  status ENUM('new','contacted','followed') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ======================================================
-- جدول quotes (پیش‌فاکتورها)
-- ======================================================
CREATE TABLE IF NOT EXISTS quotes (
  id INT NOT NULL AUTO_INCREMENT,
  quote_number VARCHAR(50) NOT NULL UNIQUE,
  partner_id INT NOT NULL,
  status ENUM('submitted','reviewing','issued','waiting_customer','preparing','completed','final_confirmed','cancelled') DEFAULT 'submitted',
  shipping_cost BIGINT DEFAULT 0,
  total_amount BIGINT NOT NULL,
  notes TEXT,
  expires_at DATETIME,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

-- ======================================================
-- جدول quote_items (آیتم‌های پیش‌فاکتور)
-- ======================================================
CREATE TABLE IF NOT EXISTS quote_items (
  id INT NOT NULL AUTO_INCREMENT,
  quote_id INT NOT NULL,
  product_id INT,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit VARCHAR(50) DEFAULT 'متر مربع',
  price BIGINT NOT NULL,
  total BIGINT NOT NULL,
  discount_percent INT DEFAULT 0,
  tax_percent INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- ======================================================
-- جدول product_templates (قالب توضیحات محصول)
-- ======================================================
CREATE TABLE IF NOT EXISTS product_templates (
  id INT NOT NULL AUTO_INCREMENT,
  size VARCHAR(50),
  glaze_type VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  usage_guide TEXT,
  maintenance TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ======================================================
-- جدول site_settings (تنظیمات سایت – key-value)
-- ======================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- ======================================================
-- جدول otp_codes (ذخیره کدهای تایید)
-- ======================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  mobile VARCHAR(15) NOT NULL PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts INT DEFAULT 0
);

-- ======================================================
-- درج مقادیر اولیه برای برندها و تگ‌ها و تنظیمات
-- ======================================================
INSERT IGNORE INTO brands (name, enabled) VALUES
('حافظ', 1), ('آسمان', 1), ('چوبینه', 1), ('سرامیک البرز', 0),
('اسپانیایی', 1), ('ماربل امپرادور', 1), ('پرسلان نیو کارن', 0);

INSERT IGNORE INTO tags (name, enabled) VALUES
('جدید', 1), ('پرفروش', 1), ('تخفیف‌خورده', 1), ('ویژه', 1),
('فروش ویژه', 1), ('فروش امروز', 0);

INSERT IGNORE INTO site_settings (`key`, `value`) VALUES
('sales_mode', '"cart"'),
('landing_tags', '["فروش ویژه","جدید","پرفروش"]'),
('site_name', '"کاشی و سرامیک آسمان"'),
('site_description', '"فروشگاه تخصصی کاشی و سرامیک"'),
('show_prices', '1'),
('show_inventory', '1'),
('allow_partner_register', '1'),
('maintenance_mode', '0'),
('tax_percent', '9'),
('shipping_cost', '500000'),
('free_shipping_threshold', '5000000');
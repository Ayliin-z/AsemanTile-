// backend/test-db.js
const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'asemant2_Aseman',
    password: 'Aseman@2024!',
    database: 'aseman_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  
  try {
    // بررسی وجود جدول products
    const [tables] = await pool.query('SHOW TABLES');
    console.log('📋 لیست جدول‌ها:', tables);
    
    // بررسی جدول products
    const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log('📦 تعداد محصولات:', products[0].count);
    
    // بررسی جدول roles
    const [roles] = await pool.query('SELECT * FROM roles');
    console.log('👥 نقش‌ها:', roles);
    
  } catch (err) {
    console.error('❌ خطا:', err.message);
  } finally {
    await pool.end();
  }
}

test();
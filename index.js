// final-deploy/index.js
const path = require('path');

// تغییر مسیر به پوشه backend و اجرای فایل اصلی
const serverPath = path.join(__dirname, 'backend', 'server-mysql.cjs');
console.log(`✅ در حال راه‌اندازی سرور از مسیر: ${serverPath}`);
require(serverPath);
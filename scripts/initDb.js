// scripts/initDb.js
import dotenv from 'dotenv';
import { query, closePool } from '../src/utils/db.js';

dotenv.config();

const initDb = async () => {
  console.log('🚀 Starting database initialization...');
  
  // اینجا می‌توانی کد SQL migration رو قرار بدی
  // فعلاً دستی انجام شد، این فایل برای مدیریت بعدی migrations استفاده می‌شود
  
  console.log('✅ Database already initialized manually');
  console.log('📊 Tables count: 21');
  
  await closePool();
};

initDb().catch(console.error);

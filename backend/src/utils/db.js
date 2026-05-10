// backend/src/utils/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'aseman_user',
  password: process.env.DB_PASSWORD || 'aseman_password',
  database: process.env.DB_NAME || 'aseman_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const query = async (sql, params = []) => {
  const [rows, fields] = await pool.execute(sql, params);
  return { rows, insertId: rows.insertId };
};

export const transaction = async (callback) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const getClient = async () => {
  return await pool.getConnection();
};

export const closePool = async () => {
  await pool.end();
  console.log('🔒 MySQL pool closed');
};

export default { query, transaction, getClient, closePool };
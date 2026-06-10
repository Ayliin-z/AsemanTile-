// backend/server-mysql.cjs
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


// ========== Create App ==========
const app = express();
const PORT = process.env.PORT || 5003;

// ========== Middleware ==========
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== MySQL Connection Pool ==========
const pool = mysql.createPool({
  host: 'app-mysql-k6xwa',
  user: 'basic',
  password: 'iJg_dmInZnw9Uq9WNLE3',
  database: 'asemantiledb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
  if (err) console.error('❌ خطا در اتصال به MySQL:', err);
  else {
    console.log('✅ متصل به MySQL شد');
    connection.release();
  }
});

const path = require('path');

// سرو کردن فایل‌های استاتیک React (بعد از build)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// برای مسیرهایی که API نیستند، index.html برگردان
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
  } else {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  }
});

// ========== Upload Configuration ==========
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('فقط تصاویر مجاز هستند (jpeg, jpg, png, gif, webp)'));
};

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

// ========== Static Files ==========
app.use('/uploads', express.static(uploadDir));

// ========== Routes ==========
const authRoutes = require('./api/auth.cjs');
const brandsRouter = require('./src/api/brands.cjs')(promisePool);

// ========== AUTH ==========
app.use('/api/auth', authRoutes);
app.use('/api/brands', brandsRouter);

// ========== EMPLOYEES & TEAMS ==========
// ========== EMPLOYEES ROUTER ==========
const employeesRouter = express.Router();

// ✅ این مسیر رو حتماً داشته باش (قبل از بقیه)
employeesRouter.get('/roles', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name, description, permissions FROM roles ORDER BY id');
    const roles = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions ? (typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions) : []
    }));
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('Error in /api/employees/roles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, email, department, is_active, custom_permissions } = req.body;
    
    console.log('📝 Updating employee:', id, req.body);
    
    const updates = [];
    const params = [];
    
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (mobile !== undefined) { updates.push('mobile = ?'); params.push(mobile); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (department !== undefined) { updates.push('department = ?'); params.push(department); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    
    // ذخیره custom_permissions
    if (custom_permissions !== undefined) {
      updates.push('custom_permissions = ?');
      const permsJson = JSON.stringify(custom_permissions);
      params.push(permsJson);
      console.log('📝 Saving custom_permissions:', permsJson);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است' });
    }
    
    updates.push('updated_at = NOW()');
    params.push(id);
    
    await promisePool.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const [updated] = await promisePool.query('SELECT * FROM employees WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// PUT employee - ذخیره permissions
employeesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, email, department, is_active, permissions } = req.body;
    
    const updates = [];
    const params = [];
    
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (mobile !== undefined) { updates.push('mobile = ?'); params.push(mobile); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (department !== undefined) { updates.push('department = ?'); params.push(department); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (permissions !== undefined) { 
      updates.push('permissions = ?'); 
      params.push(JSON.stringify(permissions));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است' });
    }
    
    updates.push('updated_at = NOW()');
    params.push(id);
    
    await promisePool.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const [updated] = await promisePool.query('SELECT * FROM employees WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.put('/roles/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    await promisePool.query('UPDATE roles SET permissions = ?, updated_at = NOW() WHERE id = ?', [JSON.stringify(permissions), id]);
    res.json({ success: true, message: 'دسترسی‌ها با موفقیت به‌روزرسانی شد' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.post('/roles', async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'نام نقش الزامی است' });
    const [existing] = await promisePool.query('SELECT id FROM roles WHERE name = ?', [name]);
    if (existing.length > 0) return res.status(409).json({ success: false, error: 'این نقش قبلاً وجود دارد' });
    const [result] = await promisePool.query('INSERT INTO roles (name, description, permissions, is_editable) VALUES (?, ?, ?, 1)', [name, description || null, JSON.stringify(permissions || [])]);
    res.status(201).json({ success: true, data: { id: result.insertId, name, description, permissions: permissions || [] } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.delete('/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await promisePool.query('SELECT id FROM roles WHERE id = ? AND name = "admin"', [id]);
    if (existing.length > 0) return res.status(400).json({ success: false, error: 'نقش ادمین قابل حذف نیست' });
    await promisePool.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ success: true, message: 'نقش با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== TEAMS API ==========
employeesRouter.get('/teams', async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT t.*, e.name as supervisor_name,
             (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t LEFT JOIN employees e ON t.supervisor_id = e.id ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.get('/teams/:id', async (req, res) => {
  try {
    const [rows] = await promisePool.query(`SELECT t.*, e.name as supervisor_name FROM teams t LEFT JOIN employees e ON t.supervisor_id = e.id WHERE t.id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'تیم یافت نشد' });
    const [members] = await promisePool.query(`SELECT e.id, e.name, e.mobile, e.email, r.name as role_name FROM team_members tm JOIN employees e ON tm.employee_id = e.id LEFT JOIN roles r ON e.role_id = r.id WHERE tm.team_id = ?`, [req.params.id]);
    res.json({ success: true, data: { ...rows[0], members } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.post('/teams', async (req, res) => {
  try {
    const { name, description, supervisor_id } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'نام تیم الزامی است' });
    if (supervisor_id) {
      const [existing] = await promisePool.query('SELECT id FROM teams WHERE supervisor_id = ?', [supervisor_id]);
      if (existing.length > 0) return res.status(400).json({ success: false, error: 'این سرپرست قبلاً دارای یک تیم است' });
    }
    const [result] = await promisePool.query('INSERT INTO teams (name, description, supervisor_id) VALUES (?, ?, ?)', [name.trim(), description || null, supervisor_id || null]);
    const [newTeam] = await promisePool.query('SELECT * FROM teams WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newTeam[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.put('/teams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, supervisor_id } = req.body;
    if (supervisor_id) {
      const [existing] = await promisePool.query('SELECT id FROM teams WHERE supervisor_id = ? AND id != ?', [supervisor_id, id]);
      if (existing.length > 0) return res.status(400).json({ success: false, error: 'این سرپرست قبلاً دارای یک تیم است' });
    }
    await promisePool.query('UPDATE teams SET name = ?, description = ?, supervisor_id = ?, updated_at = NOW() WHERE id = ?', [name || null, description || null, supervisor_id || null, id]);
    const [updated] = await promisePool.query('SELECT * FROM teams WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.delete('/teams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await promisePool.query('DELETE FROM team_members WHERE team_id = ?', [id]);
    await promisePool.query('DELETE FROM teams WHERE id = ?', [id]);
    res.json({ success: true, message: 'تیم با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.post('/teams/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id } = req.body;
    if (!employee_id) return res.status(400).json({ success: false, error: 'شناسه کارمند الزامی است' });
    const [teamCheck] = await promisePool.query('SELECT id FROM teams WHERE id = ?', [id]);
    if (teamCheck.length === 0) return res.status(404).json({ success: false, error: 'تیم یافت نشد' });
    const [empCheck] = await promisePool.query('SELECT id, role_id FROM employees WHERE id = ?', [employee_id]);
    if (empCheck.length === 0) return res.status(404).json({ success: false, error: 'کارمند یافت نشد' });
    const [roleCheck] = await promisePool.query('SELECT name FROM roles WHERE id = ?', [empCheck[0].role_id]);
    if (roleCheck[0]?.name !== 'expert') return res.status(400).json({ success: false, error: 'فقط کارشناسان می‌توانند عضو تیم شوند' });
    const [existing] = await promisePool.query('SELECT id FROM team_members WHERE team_id = ? AND employee_id = ?', [id, employee_id]);
    if (existing.length > 0) return res.status(400).json({ success: false, error: 'این کارمند قبلاً عضو این تیم است' });
    await promisePool.query('INSERT INTO team_members (team_id, employee_id) VALUES (?, ?)', [id, employee_id]);
    res.json({ success: true, message: 'عضو با موفقیت به تیم اضافه شد' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.delete('/teams/:id/members/:employeeId', async (req, res) => {
  try {
    const { id, employeeId } = req.params;
    await promisePool.query('DELETE FROM team_members WHERE team_id = ? AND employee_id = ?', [id, employeeId]);
    res.json({ success: true, message: 'عضو با موفقیت از تیم حذف شد' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== EMPLOYEES API ==========
// GET /api/employees - حذف department
employeesRouter.get('/', async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT e.id, e.name, e.mobile, e.email, e.role_id, 
             r.name as role_name, 
             r.permissions as role_permissions,
             e.is_active, e.custom_permissions, e.created_at
      FROM employees e 
      LEFT JOIN roles r ON e.role_id = r.id 
      ORDER BY e.id
    `);
    
    const employees = rows.map(row => ({
      id: row.id,
      name: row.name,
      mobile: row.mobile,
      email: row.email,
      role_id: row.role_id,
      role_name: row.role_name,
      role_permissions: row.role_permissions ? 
        (typeof row.role_permissions === 'string' ? JSON.parse(row.role_permissions) : row.role_permissions) : [],
      is_active: row.is_active === 1,
      custom_permissions: row.custom_permissions ? 
        (typeof row.custom_permissions === 'string' ? JSON.parse(row.custom_permissions) : row.custom_permissions) : [],
      created_at: row.created_at
    }));
    
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('Error in GET /employees:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/employees - حذف department
employeesRouter.post('/', async (req, res) => {
  try {
    const { name, mobile, email, password, role_id } = req.body;
    
    if (!name || !mobile || !password || !role_id) {
      return res.status(400).json({ success: false, error: 'نام، موبایل، رمز و نقش الزامی است' });
    }
    
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await promisePool.query(
      `INSERT INTO employees (name, mobile, email, password, role_id, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [name, mobile, email || null, hashedPassword, role_id]
    );
    
    const [newEmployee] = await promisePool.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newEmployee[0] });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/employees/:id - حذف department
employeesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, email, is_active, custom_permissions } = req.body;
    
    const updates = [];
    const params = [];
    
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (mobile !== undefined) { updates.push('mobile = ?'); params.push(mobile); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    
    if (custom_permissions !== undefined) {
      updates.push('custom_permissions = ?');
      params.push(JSON.stringify(custom_permissions));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است' });
    }
    
    updates.push('updated_at = NOW()');
    params.push(id);
    
    await promisePool.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const [updated] = await promisePool.query('SELECT * FROM employees WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.post('/', async (req, res) => {
  try {
    const { name, mobile, email, password, role_id, department } = req.body;
    if (!name || !mobile || !password || !role_id) {
      return res.status(400).json({ success: false, error: 'نام، موبایل، رمز و نقش الزامی است' });
    }
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await promisePool.query(
      `INSERT INTO employees (name, mobile, email, password, role_id, department, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [name, mobile, email || null, hashedPassword, role_id, department || 'sales']
    );
    const [newEmployee] = await promisePool.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newEmployee[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== LOGIN ==========
employeesRouter.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const bcrypt = require('bcrypt');
    const jwt = require('jsonwebtoken');
    
    console.log('========== LOGIN ATTEMPT ==========');
    console.log('Mobile:', mobile);
    
    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }
    
    const [rows] = await promisePool.query(`
      SELECT e.*, r.name as role_name, r.permissions as role_permissions
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.mobile = ? OR e.mobile = ?
    `, [normalizedMobile, mobile]);
    
    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'کاربری با این شماره موبایل یافت نشد' });
    }
    
    const employee = rows[0];
    const isValid = await bcrypt.compare(password, employee.password);
    
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'رمز عبور اشتباه است' });
    }
    
    if (!employee.is_active) {
      return res.status(403).json({ success: false, error: 'حساب کاربری شما غیرفعال است' });
    }
    
    // ========== پردازش دسترسی‌ها با مدیریت خطا ==========
    let rolePermissions = [];
    let customPermissions = [];
    
    if (employee.role_permissions) {
      if (typeof employee.role_permissions === 'string') {
        try {
          rolePermissions = JSON.parse(employee.role_permissions);
        } catch(e) {
          console.log('Parse error for role_permissions:', e.message);
          rolePermissions = [];
        }
      } else {
        rolePermissions = employee.role_permissions;
      }
    }
    
    if (employee.custom_permissions) {
      if (typeof employee.custom_permissions === 'string') {
        try {
          customPermissions = JSON.parse(employee.custom_permissions);
        } catch(e) {
          console.log('Parse error for custom_permissions:', e.message);
          customPermissions = [];
        }
      } else {
        customPermissions = employee.custom_permissions;
      }
    }
    
    let finalPermissions = [...rolePermissions];
    customPermissions.forEach(p => {
      if (p && typeof p === 'string') {
        if (p.startsWith('+')) {
          const permName = p.substring(1);
          if (!finalPermissions.includes(permName)) finalPermissions.push(permName);
        } else if (p.startsWith('-')) {
          const permName = p.substring(1);
          const idx = finalPermissions.indexOf(permName);
          if (idx !== -1) finalPermissions.splice(idx, 1);
        } else {
          if (!finalPermissions.includes(p)) finalPermissions.push(p);
        }
      }
    });
    // ========== پایان پردازش دسترسی‌ها ==========
    
    const token = jwt.sign(
      { id: employee.id, mobile: employee.mobile, role: employee.role_name, permissions: finalPermissions, type: 'employee' },
      process.env.JWT_SECRET || 'aseman_super_secret_key',
      { expiresIn: '7d' }
    );
    
    const { password: _, ...safeEmployee } = employee;
    safeEmployee.permissions = finalPermissions;
    
    console.log('Login SUCCESS for:', employee.name);
    res.json({ success: true, data: { employee: safeEmployee, permissions: finalPermissions, token } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, email, department, is_active, custom_permissions } = req.body;
    const updates = [], params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (mobile) { updates.push('mobile = ?'); params.push(mobile); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (department) { updates.push('department = ?'); params.push(department); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
    if (custom_permissions !== undefined) { updates.push('custom_permissions = ?'); params.push(JSON.stringify(custom_permissions)); }
    if (updates.length === 0) return res.status(400).json({ success: false, error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است' });
    updates.push('updated_at = NOW()'); params.push(id);
    await promisePool.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, params);
    const [updated] = await promisePool.query('SELECT * FROM employees WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

employeesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await promisePool.query('DELETE FROM employees WHERE id = ?', [id]);
    res.json({ success: true, message: 'کارمند با موفقیت حذف شد' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// اعمال employees router
app.use('/api/employees', employeesRouter);
console.log('✅ Employees API loaded (with Teams)');

// ==== سرویس فایل‌های استاتیک React (Frontend) ====
app.use(express.static(path.join(__dirname, '../frontend'))); // به مسیر پوشه فایل‌های build شده اشاره می‌کند
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
  } else {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  }
});
// =================================================
// ========== PRODUCTS ==========
// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM products ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) { 
    console.error('Error in /api/products GET:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'محصول یافت نشد' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { 
    console.error('Error in /api/products/:id GET:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create product
app.post('/api/products', async (req, res) => {
  try {
    let {
      productcode, grade, name, price, partnerprice, discount, stock,
      description, manufacturer, glazetype, suitablefor, category,
      size, glaze, color, images, fulldescription, tags, audience
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'نام محصول الزامی است' });
    }

    // اگر کد محصول خالی بود، خودکار تولید کن
    if (!productcode || productcode.trim() === '') {
      productcode = `PRD-${Date.now()}`;
    }
    
    // قیمت اختیاری
    let finalPrice = (price && !isNaN(parseFloat(price))) ? parseFloat(price) : 0;
    let finalPartnerPrice = (partnerprice && !isNaN(parseFloat(partnerprice))) ? parseFloat(partnerprice) : finalPrice;

    let finalImages = '';
    if (images) {
      if (typeof images === 'string') finalImages = images;
      else if (Array.isArray(images)) finalImages = images.join(',');
    }

    let finalTags = '';
    if (tags) {
      if (typeof tags === 'string') finalTags = tags;
      else if (Array.isArray(tags)) finalTags = tags.join(',');
    }

    const [result] = await promisePool.query(
      `INSERT INTO products 
        (sku, grade, name, price_public, price_partner, discount, stock,
         description, brand, glaze_type, suitable_for, category, size, glaze, color,
         images, full_description, tags, audience)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productcode, grade || '', name,
        finalPrice, finalPartnerPrice, Number(discount) || 0, Number(stock) || 0,
        description || '', manufacturer || '', glazetype || '', suitablefor || '',
        category || '', size || '', glaze || '', color || '',
        finalImages, fulldescription || '', finalTags, audience || 'all'
      ]
    );
    
    const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ خطا در POST /api/products:', err);
    res.status(500).json({ success: false, error: 'خطا در افزودن محصول: ' + err.message });
  }
});

// PUT update product
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    let {
      productcode, grade, name, price, partnerprice, discount, stock,
      description, manufacturer, glazetype, suitablefor, category,
      size, glaze, color, images, fulldescription, tags, audience
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'نام محصول الزامی است' });
    }

    let finalPrice = (price && !isNaN(parseFloat(price))) ? parseFloat(price) : 0;
    let finalPartnerPrice = (partnerprice && !isNaN(parseFloat(partnerprice))) ? parseFloat(partnerprice) : finalPrice;

    let finalImages = '';
    if (images) {
      if (typeof images === 'string') finalImages = images;
      else if (Array.isArray(images)) finalImages = images.join(',');
    }

    let finalTags = '';
    if (tags) {
      if (typeof tags === 'string') finalTags = tags;
      else if (Array.isArray(tags)) finalTags = tags.join(',');
    }

    await promisePool.query(
      `UPDATE products SET 
        sku=?, grade=?, name=?, price_public=?, price_partner=?, discount=?, stock=?,
        description=?, brand=?, glaze_type=?, suitable_for=?, category=?, size=?, glaze=?, color=?,
        images=?, full_description=?, tags=?, audience=?
       WHERE id=?`,
      [
        productcode || '', grade || '', name,
        finalPrice, finalPartnerPrice, Number(discount) || 0, Number(stock) || 0,
        description || '', manufacturer || '', glazetype || '', suitablefor || '',
        category || '', size || '', glaze || '', color || '',
        finalImages, fulldescription || '', finalTags, audience || 'all', id
      ]
    );
    const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ خطا در PUT /api/products:', err);
    res.status(500).json({ success: false, error: 'خطا در به‌روزرسانی محصول: ' + err.message });
  }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
  try { 
    await promisePool.query('DELETE FROM products WHERE id = ?', [req.params.id]); 
    res.json({ success: true, message: 'محصول حذف شد' }); 
  } catch (err) { 
    console.error('❌ خطا در DELETE /api/products:', err);
    res.status(500).json({ success: false, error: 'خطا در حذف محصول' }); 
  }
});
// ========== IMAGE UPLOAD ==========
// POST /api/products - اصلاح شده با قیمت اختیاری
app.post('/api/products', async (req, res) => {
  try {
    let {
      productcode, grade, name, price, partnerprice, discount, stock,
      description, manufacturer, glazetype, suitablefor, category,
      size, glaze, color, images, fulldescription, tags, audience
    } = req.body;

    // اگر کد محصول خالی بود، خودکار تولید کن
    if (!productcode || productcode.trim() === '') {
      productcode = `PRD-${Date.now()}`;
      console.log(`🔖 کد محصول خودکار تولید شد: ${productcode}`);
    }
    
    // قیمت اختیاری - اگه خالی یا undefined بود، 0 بزار
    let finalPrice = 0;
    if (price && price !== '' && !isNaN(parseFloat(price))) {
      finalPrice = parseFloat(price);
    }
    
    let finalPartnerPrice = 0;
    if (partnerprice && partnerprice !== '' && !isNaN(parseFloat(partnerprice))) {
      finalPartnerPrice = parseFloat(partnerprice);
    }

    let finalImages = '';
    if (images) {
      if (typeof images === 'string') finalImages = images;
      else if (Array.isArray(images)) finalImages = images.join(',');
    }

    let finalTags = '';
    if (tags) {
      if (typeof tags === 'string') finalTags = tags;
      else if (Array.isArray(tags)) finalTags = tags.join(',');
    }

    const [result] = await promisePool.query(
      `INSERT INTO products 
        (sku, grade, name, price_public, price_partner, discount, stock,
         description, brand, glaze_type, suitable_for, category, size, glaze, color,
         images, full_description, tags, audience)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productcode, grade || '', name || '',
        finalPrice, finalPartnerPrice, Number(discount) || 0, Number(stock) || 0,
        description || '', manufacturer || '', glazetype || '', suitablefor || '',
        category || '', size || '', glaze || '', color || '',
        finalImages, fulldescription || '', finalTags, audience || 'all'
      ]
    );
    
    const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ خطا:', err);
    res.status(500).json({ success: false, error: 'خطا در افزودن محصول: ' + err.message });
  }
});


app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    let {
      productcode, grade, name, price, partnerprice, discount, stock,
      description, manufacturer, glazetype, suitablefor, category,
      size, glaze, color, images, fulldescription, tags, audience
    } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'نام محصول الزامی است' });
    }

    let finalPrice = (price && !isNaN(parseFloat(price))) ? parseFloat(price) : 0;
    let finalPartnerPrice = (partnerprice && !isNaN(parseFloat(partnerprice))) ? parseFloat(partnerprice) : finalPrice;

    let finalImages = '';
    if (images) {
      if (typeof images === 'string') finalImages = images;
      else if (Array.isArray(images)) finalImages = images.join(',');
    }

    let finalTags = '';
    if (tags) {
      if (typeof tags === 'string') finalTags = tags;
      else if (Array.isArray(tags)) finalTags = tags.join(',');
    }

    await promisePool.query(
      `UPDATE products SET 
        sku=?, grade=?, name=?, price_public=?, price_partner=?, discount=?, stock=?,
        description=?, brand=?, glaze_type=?, suitable_for=?, category=?, size=?, glaze=?, color=?,
        images=?, full_description=?, tags=?, audience=?
       WHERE id=?`,
      [
        productcode || '', grade || '', name,
        finalPrice, finalPartnerPrice, Number(discount) || 0, Number(stock) || 0,
        description || '', manufacturer || '', glazetype || '', suitablefor || '',
        category || '', size || '', glaze || '', color || '',
        finalImages, fulldescription || '', finalTags, audience || 'all', id
      ]
    );
    const [rows] = await promisePool.query('SELECT * FROM products WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'خطا در به‌روزرسانی محصول' });
  }
});


app.delete('/api/products/:id', async (req, res) => {
  try { 
    await promisePool.query('DELETE FROM products WHERE id = ?', [req.params.id]); 
    res.json({ success: true, message: 'محصول حذف شد' }); 
  }
  catch (err) { 
    res.status(500).json({ success: false, error: 'خطا در حذف محصول' }); 
  }
});

// ========== USERS ==========
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE id=?', [req.params.id]);
    if(rows.length===0) return res.status(404).json({ error: 'کاربر یافت نشد' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/mobile/:mobile', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE mobile=?', [req.params.mobile]);
    if(rows.length===0) return res.status(404).json({ error: 'کاربر یافت نشد' });
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  const { name, mobile, email, password, type } = req.body;
  if (!name || !mobile) return res.status(400).json({ error: 'نام و شماره موبایل الزامی است' });
  if (password && password.length < 4) return res.status(400).json({ error: 'رمز عبور حداقل ۴ کاراکتر' });
  try {
    const [existMobile] = await promisePool.query('SELECT id FROM users WHERE mobile = ?', [mobile]);
    if (existMobile.length) return res.status(409).json({ error: 'این شماره موبایل قبلاً ثبت شده است' });
    if (email) {
      const [existEmail] = await promisePool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existEmail.length) return res.status(409).json({ error: 'این ایمیل قبلاً ثبت شده است' });
    }
    const finalEmail = email && email.trim() !== '' ? email : null;
    const finalType = type === 'partner' ? 'partner' : 'customer';
    const finalPassword = password || null;
    const isActive = finalType === 'partner' ? 0 : 1;
    const [result] = await promisePool.query(
      'INSERT INTO users (name, mobile, email, password_hash, type, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [name, mobile, finalEmail, finalPassword, finalType, isActive]
    );
    const [newUser] = await promisePool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE id=?', [result.insertId]);
    res.status(201).json(newUser[0]);
  } catch(err) { res.status(500).json({ error: 'خطا در ایجاد کاربر: ' + err.message }); }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { type, is_active } = req.body;
  if (type === undefined && is_active === undefined) return res.status(400).json({ error: 'هیچ فیلدی برای به‌روزرسانی نیست' });
  try {
    const updates = [];
    const values = [];
    if (type !== undefined) { updates.push('type = ?'); values.push(type); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }
    values.push(id);
    await promisePool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    const [rows] = await promisePool.query('SELECT id, name, mobile, email, type, is_active, created_at FROM users WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try { await promisePool.query('DELETE FROM users WHERE id = ?', [req.params.id]); res.json({ message: 'کاربر حذف شد' }); }
  catch(err) { res.status(500).json({ error: err.message }); }
});

// ========== PARTNERS ==========
app.get('/api/partners/pending', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT p.*, u.name as user_name, u.mobile as user_mobile, u.email as user_email 
       FROM partners p 
       LEFT JOIN users u ON p.user_id = u.id 
       WHERE p.status = 'pending' OR p.status = 'initial_approved'
       ORDER BY 
         CASE p.status 
           WHEN 'pending' THEN 1 
           WHEN 'initial_approved' THEN 2 
           ELSE 3 
         END,
         p.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/partners/pending error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/partners/:id', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM partners WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/partners/user/:userId', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM partners WHERE user_id = ?', [req.params.userId]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/partners/:id/initial-approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await promisePool.query(
      `UPDATE partners SET status = 'initial_approved', initial_approved_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    
    const [partner] = await promisePool.query('SELECT user_id FROM partners WHERE id = ?', [id]);
    if (partner.length > 0) {
      await promisePool.query(
        "UPDATE users SET type = 'partner', is_active = 1 WHERE id = ?",
        [partner[0].user_id]
      );
    }
    
    res.json({ success: true, message: 'تأیید اولیه با موفقیت انجام شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/partners/:id/final-approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes, documents } = req.body;
    
    const [result] = await promisePool.query(
      `UPDATE partners SET status = 'final_approved', final_approved_at = NOW(), admin_notes = ?, documents = ?, updated_at = NOW() WHERE id = ?`,
      [admin_notes || null, documents ? JSON.stringify(documents) : null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    
    res.json({ success: true, message: 'تأیید نهایی با موفقیت انجام شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/partners/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await promisePool.query(
      `UPDATE partners SET status = 'rejected', updated_at = NOW() WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    res.json({ success: true, message: 'درخواست رد شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/partners/:id/approve', async (req, res) => {
  try {
    const [result] = await promisePool.query(
      'UPDATE partners SET is_approved = 1, updated_at = NOW() WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'همکار یافت نشد' });
    }
    const [partnerRows] = await promisePool.query('SELECT user_id FROM partners WHERE id = ?', [req.params.id]);
    if (partnerRows.length > 0) {
      const userId = partnerRows[0].user_id;
      await promisePool.query("UPDATE users SET type = 'partner', is_active = 1 WHERE id = ?", [userId]);
    }
    res.json({ success: true, message: 'همکار با موفقیت تأیید شد' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== QUOTES ==========
app.get('/api/quotes', async (req, res) => {
  try {
    const { partner_id, status } = req.query;
    let sql = 'SELECT * FROM quotes WHERE 1=1';
    const params = [];
    
    // فیلتر بر اساس همکار
    if (partner_id) {
      sql += ' AND partner_id = ?';
      params.push(partner_id);
    }
    
    // فیلتر بر اساس وضعیت
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const [rows] = await promisePool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get('/api/quotes/:id', async (req, res) => {
  try {
    const [quotes] = await promisePool.query('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
    if (quotes.length === 0) return res.status(404).json({ success: false, error: 'یافت نشد' });
    const [items] = await promisePool.query('SELECT * FROM quote_items WHERE quote_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...quotes[0], items } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  const { partner_id, customer_name, customer_mobile, company_name, items, notes } = req.body;
  
  console.log('📝 Received quote data:', { partner_id, customer_name, customer_mobile, company_name });  
  if (!partner_id || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'partner_id و لیست محصولات الزامی است' });
  }

  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.price * item.quantity;
    }

    const quoteNumber = 'QF-' + Date.now();

    const [quoteResult] = await connection.query(
      `INSERT INTO quotes 
        (quote_number, partner_id, customer_name, customer_mobile, company_name, status, total_amount, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?, NOW(), NOW())`,
      [quoteNumber, partner_id, customer_name || null, customer_mobile || null, company_name || null, totalAmount, notes || null]
    );
    
    const quoteId = quoteResult.insertId;

    for (const item of items) {
      await connection.query(
        `INSERT INTO quote_items (quote_id, product_id, product_name, quantity, price, total, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [quoteId, item.product_id, item.product_name, item.quantity, item.price, item.price * item.quantity]
      );
    }

    await connection.commit();

    const [newQuote] = await promisePool.query('SELECT * FROM quotes WHERE id = ?', [quoteId]);
    const [newItems] = await promisePool.query('SELECT * FROM quote_items WHERE quote_id = ?', [quoteId]);

    res.status(201).json({
      success: true,
      data: { ...newQuote[0], items: newItems },
      message: 'پیش‌فاکتور با موفقیت ثبت شد'
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

app.patch('/api/quotes/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id']) : null;
  // در بخش PATCH /api/quotes/:id/status - اضافه کردن وضعیت جدید
  const validStatuses = ['submitted', 'reviewing', 'issued', 'preparing', 'completed', 'cancelled', 'price_inquiry'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'وضعیت نامعتبر است' });
  }
  
  try {
    const [quoteCheck] = await promisePool.query('SELECT status FROM quotes WHERE id = ?', [id]);
    if (quoteCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'پیش‌فاکتور یافت نشد' });
    }
    const oldStatus = quoteCheck[0].status;
    
    const [result] = await promisePool.query(
      'UPDATE quotes SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'پیش‌فاکتور یافت نشد' });
    }
    
    await promisePool.query(
      `INSERT INTO quote_status_logs (quote_id, old_status, new_status, note, created_by, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, oldStatus, status, note || null, userId]
    );
    
    const [updated] = await promisePool.query('SELECT * FROM quotes WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error('PATCH /api/quotes/:id/status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/quotes/:id/note', async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  
  if (!note || note.trim() === '') {
    return res.status(400).json({ success: false, error: 'متن توضیحات الزامی است' });
  }
  
  try {
    const [existing] = await promisePool.query('SELECT id, notes FROM quotes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'سفارش یافت نشد' });
    }
    
    const timestamp = new Date().toLocaleString('fa-IR');
    const newNote = `[${timestamp}] ${note.trim()}`;
    const oldNotes = existing[0].notes || '';
    const updatedNotes = oldNotes ? oldNotes + '\n' + newNote : newNote;
    
    await promisePool.query('UPDATE quotes SET notes = ?, updated_at = NOW() WHERE id = ?', [updatedNotes, id]);
    
    await promisePool.query(
      `INSERT INTO quote_status_logs (quote_id, old_status, new_status, note, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [id, existing[0].status, existing[0].status, newNote]
    );
    
    res.json({ success: true, message: 'توضیحات با موفقیت اضافه شد' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/quotes/:id/status-logs', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const [quoteCheck] = await promisePool.query('SELECT id FROM quotes WHERE id = ?', [id]);
    if (quoteCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'سفارش یافت نشد' });
    }
    
    const [rows] = await promisePool.query(
      `SELECT * FROM quote_status_logs WHERE quote_id = ? ORDER BY created_at ASC`,
      [id]
    );
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/quotes/:id/status-logs error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== TAGS ==========
app.get('/api/tags', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT * FROM tags ORDER BY name'); res.json(rows); }
  catch(err) { res.status(500).json([]); }
});

app.post('/api/tags', async (req, res) => {
  const { name } = req.body; if(!name) return res.status(400).json({error:'نام تگ الزامی'});
  try { await promisePool.query('INSERT INTO tags (name) VALUES (?)', [name]); res.status(201).json({success:true}); }
  catch(err) { res.status(500).json({error:err.message}); }
});

app.delete('/api/tags/:name', async (req, res) => {
  try { await promisePool.query('DELETE FROM tags WHERE name=?', [req.params.name]); res.json({success:true}); }
  catch(err) { res.status(500).json({error:err.message}); }
});

// ========== STATS ==========
app.get('/api/stats/registrations', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const weekStart = new Date(Date.now()-7*86400000).toISOString().slice(0,10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
    const [[todayRow]] = await promisePool.query(`SELECT COUNT(CASE WHEN type='customer' THEN 1 END) as customers, COUNT(CASE WHEN type='partner' THEN 1 END) as partners FROM users WHERE DATE(created_at)=?`,[today]);
    const [[weekRow]] = await promisePool.query(`SELECT COUNT(CASE WHEN type='customer' THEN 1 END) as customers, COUNT(CASE WHEN type='partner' THEN 1 END) as partners FROM users WHERE created_at>=?`,[weekStart]);
    const [[monthRow]] = await promisePool.query(`SELECT COUNT(CASE WHEN type='customer' THEN 1 END) as customers, COUNT(CASE WHEN type='partner' THEN 1 END) as partners FROM users WHERE created_at>=?`,[monthStart]);
    const [dailyRows] = await promisePool.query(`SELECT DATE(created_at) as date, COUNT(CASE WHEN type='customer' THEN 1 END) as customers, COUNT(CASE WHEN type='partner' THEN 1 END) as partners FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY date ASC`);
    res.json({ success: true, data: { today: todayRow, week: weekRow, month: monthRow, daily: dailyRows } });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ========== BLOG ==========
app.get('/api/blog', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT * FROM blog_posts ORDER BY created_at DESC'); res.json(rows); }
  catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/blog/homepage', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT * FROM blog_posts WHERE show_on_homepage=1 ORDER BY created_at DESC LIMIT 3'); res.json(rows); }
  catch(err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/blog/slug/:slug', async (req, res) => {
  try { const [rows] = await promisePool.query('SELECT * FROM blog_posts WHERE slug=?', [req.params.slug]); if(rows.length===0) return res.status(404).json({error:'پست یافت نشد'}); res.json(rows[0]); }
  catch(err) { res.status(500).json({ error: err.message }); }
});

// ========== BLOG TAGS ==========
app.get('/api/blog/tags', async (req, res) => {
  try {
    // اول از جدول tags میگیریم
    const [rows] = await promisePool.query('SELECT name FROM tags WHERE enabled = 1 ORDER BY name');
    if (rows.length > 0) {
      return res.json(rows.map(r => r.name));
    }
    
    // اگه جدول tags خالی بود، از پست‌ها استخراج کن
    const [posts] = await promisePool.query('SELECT tags FROM blog_posts WHERE tags IS NOT NULL');
    const tagsSet = new Set();
    for (const post of posts) {
      let postTags = post.tags;
      if (postTags) {
        if (typeof postTags === 'string') {
          try {
            postTags = JSON.parse(postTags);
          } catch(e) {
            postTags = [];
          }
        }
        if (Array.isArray(postTags)) {
          postTags.forEach(tag => tagsSet.add(tag));
        }
      }
    }
    res.json(Array.from(tagsSet).sort());
  } catch (error) {
    console.error('Error in /api/blog/tags:', error);
    res.json([]);
  }
});

app.post('/api/blog', async (req, res) => {
  const { title, slug, excerpt, content, image, status } = req.body;
  if(!title || !slug || !content) return res.status(400).json({error:'عنوان، اسلاگ و محتوا الزامی'});
  try {
    const [exist] = await promisePool.query('SELECT id FROM blog_posts WHERE slug=?', [slug]);
    if(exist.length) return res.status(409).json({error:'اسلاگ تکراری'});
    const [result] = await promisePool.query('INSERT INTO blog_posts (title, slug, excerpt, content, image, status) VALUES (?,?,?,?,?,?)', [title, slug, excerpt||'', content, image||'', status||'published']);
    const [row] = await promisePool.query('SELECT * FROM blog_posts WHERE id=?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/blog/:id
app.put('/api/blog/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { show_on_homepage, title, slug, excerpt, content, image, is_published } = req.body;
    
    const updates = [];
    const params = [];
    
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (slug !== undefined) { updates.push('slug = ?'); params.push(slug); }
    if (excerpt !== undefined) { updates.push('excerpt = ?'); params.push(excerpt); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (image !== undefined) { updates.push('image = ?'); params.push(image); }
    if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published ? 1 : 0); }
    if (show_on_homepage !== undefined) { updates.push('show_on_homepage = ?'); params.push(show_on_homepage ? 1 : 0); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'هیچ فیلدی برای به‌روزرسانی ارسال نشده است' });
    }
    
    updates.push('updated_at = NOW()');
    params.push(id);
    
    await promisePool.query(`UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const [rows] = await promisePool.query('SELECT * FROM blog_posts WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error('PUT /api/blog/:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/blog/:id', async (req, res) => {
  try { await promisePool.query('DELETE FROM blog_posts WHERE id=?', [req.params.id]); res.json({ message: 'حذف شد' }); }
  catch(err) { res.status(500).json({ error: err.message }); }
});

// ========== SUPPORT EXPERTS ==========
app.get('/api/experts', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM support_experts WHERE is_active = 1 ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/experts/all', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM support_experts ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/experts', async (req, res) => {
  const { name, phone, photo, is_active } = req.body;
  if (!name || !phone) return res.status(400).json({ success: false, error: 'نام و شماره تماس الزامی است' });
  try {
    const [result] = await promisePool.query(
      'INSERT INTO support_experts (name, phone, photo, is_active) VALUES (?, ?, ?, ?)',
      [name, phone, photo || null, is_active !== undefined ? is_active : 1]
    );
    const [rows] = await promisePool.query('SELECT * FROM support_experts WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/experts/:id', async (req, res) => {
  const { name, phone, photo, is_active } = req.body;
  try {
    const [result] = await promisePool.query(
      'UPDATE support_experts SET name = ?, phone = ?, photo = ?, is_active = ? WHERE id = ?',
      [name, phone, photo || null, is_active, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'کارشناس یافت نشد' });
    const [rows] = await promisePool.query('SELECT * FROM support_experts WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/experts/:id', async (req, res) => {
  try {
    const [result] = await promisePool.query('DELETE FROM support_experts WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'کارشناس یافت نشد' });
    res.json({ success: true, message: 'حذف شد' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== PRICE REQUESTS ==========
app.post('/api/price-requests', async (req, res) => {
  const { product_id, mobile } = req.body;
  if (!product_id || !mobile) return res.status(400).json({ success: false, error: 'product_id و mobile الزامی است' });
  try {
    let normalizedMobile = mobile;
    if (normalizedMobile.startsWith('0') && normalizedMobile.length === 11) {
      normalizedMobile = normalizedMobile.substring(1);
    }
    await promisePool.query('INSERT INTO price_requests (product_id, mobile) VALUES (?, ?)', [product_id, normalizedMobile]);
    res.status(201).json({ success: true, message: 'شماره شما با موفقیت ثبت شد' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/price-requests', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT pr.id, pr.product_id, pr.mobile, pr.created_at, p.name as product_name
       FROM price_requests pr
       JOIN products p ON pr.product_id = p.id
       ORDER BY pr.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== WISHLIST ==========
app.get('/api/wishlist/:userId', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      `SELECT w.id, w.product_id, w.created_at, p.name, p.price_public, p.images
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.params.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/wishlist', async (req, res) => {
  const { user_id, product_id } = req.body;
  if (!user_id || !product_id) return res.status(400).json({ success: false, error: 'اطلاعات ناقص است' });
  try {
    const [existing] = await promisePool.query('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [user_id, product_id]);
    if (existing.length > 0) return res.status(409).json({ success: false, error: 'این محصول قبلاً به لیست اضافه شده' });
    const [result] = await promisePool.query('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [user_id, product_id]);
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/wishlist/:id', async (req, res) => {
  try { await promisePool.query('DELETE FROM wishlists WHERE id = ?', [req.params.id]); res.json({ success: true, message: 'حذف شد' }); }
  catch(err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/wishlist/check/:userId/:productId', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [req.params.userId, req.params.productId]);
    res.json({ success: true, liked: rows.length > 0, id: rows[0]?.id || null });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ========== PRODUCT TEMPLATES ==========
app.get('/api/product-templates', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM product_templates ORDER BY size');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/product-templates', async (req, res) => {
  const { size, glaze_type, title, description, usage_guide, maintenance } = req.body;
  try {
    const [result] = await promisePool.query(
      'INSERT INTO product_templates (size, glaze_type, title, description, usage_guide, maintenance) VALUES (?, ?, ?, ?, ?, ?)',
      [size || null, glaze_type || null, title, description, usage_guide || null, maintenance || null]
    );
    const [rows] = await promisePool.query('SELECT * FROM product_templates WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/product-templates/:id', async (req, res) => {
  const { id } = req.params;
  const { size, glaze_type, title, description, usage_guide, maintenance } = req.body;
  try {
    await promisePool.query(
      'UPDATE product_templates SET size=?, glaze_type=?, title=?, description=?, usage_guide=?, maintenance=?, updated_at=NOW() WHERE id=?',
      [size || null, glaze_type || null, title, description, usage_guide || null, maintenance || null, id]
    );
    const [rows] = await promisePool.query('SELECT * FROM product_templates WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/product-templates/:id', async (req, res) => {
  try {
    await promisePool.query('DELETE FROM product_templates WHERE id = ?', [req.params.id]);
    res.json({ message: 'حذف شد' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== آپلود مدارک توسط همکار ==========
app.post('/api/partner/upload-documents', upload.array('documents', 10), async (req, res) => {
  try {
    const { partner_id } = req.body;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'هیچ فایلی آپلود نشده است' });
    }
    
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/${file.filename}`,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }));
    
    const [partner] = await promisePool.query('SELECT documents FROM partners WHERE id = ?', [partner_id]);
    let existingDocs = [];
    if (partner[0]?.documents) {
      try {
        existingDocs = JSON.parse(partner[0].documents);
      } catch(e) {}
    }
    
    const allDocs = [...existingDocs, ...uploadedFiles];
    await promisePool.query(
      'UPDATE partners SET documents = ? WHERE id = ?',
      [JSON.stringify(allDocs), partner_id]
    );
    
    res.json({ success: true, files: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'خطا در آپلود فایل' });
  }
});

// ========== دریافت اطلاعات همکار جاری ==========
app.get('/api/partner/status/:userId', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT id, status, documents, admin_notes FROM partners WHERE user_id = ?',
      [req.params.userId]
    );
    if (rows.length === 0) {
      return res.json({ success: true, data: { status: 'not_found' } });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`🚀 سرور روی پورت ${PORT} در حال اجراست`);
  console.log(`🏷️ Brands API: http://localhost:${PORT}/api/brands`);
  console.log(`👥 Employees API: http://localhost:${PORT}/api/employees`);
  console.log(`📋 Teams API: http://localhost:${PORT}/api/employees/teams`);
  console.log(`=================================\n`);
});

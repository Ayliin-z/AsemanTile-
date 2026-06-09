// backend/src/api/employees.js (CommonJS version)
const { query } = require('../utils/db.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Employee model functions
const Employee = {
  // دریافت همه نقش‌ها
  async getAllRoles() {
    const result = await query('SELECT * FROM roles ORDER BY id');
    return result.rows;
  },

  async getRoleById(roleId) {
    const result = await query('SELECT * FROM roles WHERE id = ?', [roleId]);
    return result.rows[0];
  },

  async updateRolePermissions(roleId, permissions) {
    await query('UPDATE roles SET permissions = ?, updated_at = NOW() WHERE id = ?', [JSON.stringify(permissions), roleId]);
    return await this.getRoleById(roleId);
  },

  async getEffectivePermissions(employeeId) {
    const emp = await this.findById(employeeId);
    if (!emp) return [];
    if (emp.roleName === 'admin') return ['all'];
    
    let permissions = emp.rolePermissions || [];
    
    if (emp.customPermissions && Array.isArray(emp.customPermissions)) {
      for (const perm of emp.customPermissions) {
        if (perm.startsWith('+')) {
          const permName = perm.substring(1);
          if (!permissions.includes(permName)) permissions.push(permName);
        } else if (perm.startsWith('-')) {
          const permName = perm.substring(1);
          permissions = permissions.filter(p => p !== permName);
        }
      }
    }
    return permissions;
  },

  canManage(manager, target) {
    if (manager.roleName === 'admin') return true;
    if (manager.roleName === 'manager') {
      return target.roleName === 'supervisor' || target.roleName === 'expert';
    }
    if (manager.roleName === 'supervisor') {
      return target.roleName === 'expert' && target.supervisorId === manager.id;
    }
    return false;
  },

  normalize(emp) {
    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      mobile: emp.mobile,
      roleId: emp.role_id,
      roleName: emp.role_name,
      rolePermissions: emp.role_permissions ? JSON.parse(emp.role_permissions) : [],
      department: emp.department,
      parentId: emp.parent_id,
      parentName: emp.parent_name,
      customPermissions: emp.custom_permissions ? JSON.parse(emp.custom_permissions) : [],
      isActive: emp.is_active === 1,
      createdAt: emp.created_at,
      updatedAt: emp.updated_at
    };
  },

  async findVisibleEmployees(managerId) {
    const manager = await this.findById(managerId);
    if (!manager) return [];

    if (manager.roleName === 'admin') {
      return await this.findAll();
    }

    if (manager.roleName === 'manager') {
      const result = await query(`
        SELECT e.*, 
               r.name as role_name,
               r.permissions as role_permissions,
               p.name as parent_name
        FROM employees e
        LEFT JOIN roles r ON e.role_id = r.id
        LEFT JOIN employees p ON e.parent_id = p.id
        WHERE e.role_id IN (SELECT id FROM roles WHERE name IN ('supervisor', 'expert'))
        ORDER BY e.role_id, e.name
      `);
      return result.rows.map(e => this.normalize(e));
    }

    if (manager.roleName === 'supervisor') {
      const teamResult = await query('SELECT id FROM teams WHERE supervisor_id = ?', [manager.id]);
      if (teamResult.rows.length === 0) return [];
      const teamId = teamResult.rows[0].id;
      
      const result = await query(`
        SELECT e.*, 
               r.name as role_name,
               r.permissions as role_permissions,
               p.name as parent_name
        FROM employees e
        LEFT JOIN roles r ON e.role_id = r.id
        LEFT JOIN employees p ON e.parent_id = p.id
        WHERE e.id IN (SELECT employee_id FROM team_members WHERE team_id = ?)
        ORDER BY e.name
      `, [teamId]);
      return result.rows.map(e => this.normalize(e));
    }

    return [];
  },

  async findAll() {
    const result = await query(`
      SELECT e.*, 
             r.name as role_name,
             r.permissions as role_permissions,
             p.name as parent_name
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      LEFT JOIN employees p ON e.parent_id = p.id
      ORDER BY 
        CASE r.name 
          WHEN 'admin' THEN 1 
          WHEN 'manager' THEN 2 
          WHEN 'supervisor' THEN 3 
          WHEN 'expert' THEN 4 
        END, 
        e.name ASC
    `);
    return result.rows.map(e => this.normalize(e));
  },

  async findById(id) {
    const result = await query(`
      SELECT e.*, 
             r.name as role_name,
             r.permissions as role_permissions,
             p.name as parent_name
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      LEFT JOIN employees p ON e.parent_id = p.id
      WHERE e.id = ?
    `, [id]);
    
    if (result.rows.length === 0) return null;
    return this.normalize(result.rows[0]);
  },

  async findByMobile(mobile) {
    const result = await query(`
      SELECT e.*, 
             r.name as role_name,
             r.permissions as role_permissions
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.mobile = ?
    `, [mobile]);
    
    if (result.rows.length === 0) return null;
    return this.normalize(result.rows[0]);
  },

  async create(data, createdBy) {
    const { name, mobile, password, roleId, department, customPermissions } = data;
    
    if (!name || !mobile || !password || !roleId) {
      throw new Error('نام، شماره موبایل، رمز عبور و نقش الزامی است');
    }

    const existing = await this.findByMobile(mobile);
    if (existing) {
      throw new Error('این شماره موبایل قبلاً ثبت شده است');
    }

    const creator = await this.findById(createdBy);
    if (!creator) {
      throw new Error('ایجادکننده یافت نشد');
    }

    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error('نقش انتخاب شده معتبر نیست');
    }

    if (creator.roleName === 'manager' && (role.name === 'admin' || role.name === 'manager')) {
      throw new Error('مدیر نمی‌تواند ادمین یا مدیر دیگر ایجاد کند');
    }
    if (creator.roleName === 'supervisor' && role.name !== 'expert') {
      throw new Error('سرپرست فقط می‌تواند کارشناس ایجاد کند');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const customPermsJson = customPermissions ? JSON.stringify(customPermissions) : null;

    const result = await query(`
      INSERT INTO employees (name, mobile, password, role_id, department, parent_id, custom_permissions, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [name, mobile, hashedPassword, roleId, department || 'sales', createdBy, customPermsJson, createdBy]);

    const newEmployee = await this.findById(result.insertId);
    return newEmployee;
  },

  async update(id, updates, updatedBy) {
    const employee = await this.findById(id);
    if (!employee) throw new Error('کارمند یافت نشد');
    
    const updater = await this.findById(updatedBy);
    if (!updater) throw new Error('بروزرساننده یافت نشد');
    
    if (!this.canManage(updater, employee)) {
      throw new Error('شما دسترسی ویرایش این کاربر را ندارید');
    }
    
    const updateFields = [];
    const params = [];
    
    if (updates.name) {
      updateFields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.mobile) {
      const existing = await this.findByMobile(updates.mobile);
      if (existing && existing.id !== id) {
        throw new Error('این شماره موبایل قبلاً ثبت شده است');
      }
      updateFields.push('mobile = ?');
      params.push(updates.mobile);
    }
    if (updates.password) {
      const hashed = await bcrypt.hash(updates.password, 10);
      updateFields.push('password = ?');
      params.push(hashed);
    }
    if (updates.department) {
      updateFields.push('department = ?');
      params.push(updates.department);
    }
    if (updates.is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(updates.is_active ? 1 : 0);
    }
    if (updates.customPermissions !== undefined) {
      updateFields.push('custom_permissions = ?');
      params.push(JSON.stringify(updates.customPermissions));
    }
    
    if (updateFields.length === 0) {
      throw new Error('هیچ فیلدی برای به‌روزرسانی ارسال نشده است');
    }
    
    updateFields.push('updated_at = NOW()');
    params.push(id);
    
    await query(`UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`, params);
    
    return await this.findById(id);
  },

  async delete(id, deletedBy) {
    const employee = await this.findById(id);
    if (!employee) throw new Error('کارمند یافت نشد');
    
    const deleter = await this.findById(deletedBy);
    if (!deleter) throw new Error('حذف‌کننده یافت نشد');
    
    if (!this.canManage(deleter, employee)) {
      throw new Error('شما دسترسی حذف این کاربر را ندارید');
    }
    
    if (employee.roleName === 'supervisor') {
      const teamResult = await query('SELECT id FROM teams WHERE supervisor_id = ?', [id]);
      if (teamResult.rows.length > 0) {
        throw new Error('این سرپرست دارای تیم است. ابتدا تیم را حذف یا سرپرست را تغییر دهید.');
      }
    }
    
    await query('DELETE FROM employees WHERE id = ?', [id]);
    return true;
  },

  async getStats() {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN r.name = 'admin' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN r.name = 'manager' THEN 1 ELSE 0 END) as managers,
        SUM(CASE WHEN r.name = 'supervisor' THEN 1 ELSE 0 END) as supervisors,
        SUM(CASE WHEN r.name = 'expert' THEN 1 ELSE 0 END) as experts,
        SUM(CASE WHEN e.is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN e.is_active = 0 THEN 1 ELSE 0 END) as inactive
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
    `);
    return result.rows[0];
  }
};

// ========== Team Model ==========
const Team = {
  async findAll(viewerId = null) {
    let sql = `
      SELECT t.*, 
             e.name as supervisor_name,
             COUNT(tm.id) as member_count
      FROM teams t
      LEFT JOIN employees e ON t.supervisor_id = e.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
    `;
    
    const params = [];
    
    if (viewerId) {
      const viewer = await Employee.findById(viewerId);
      if (viewer?.roleName === 'supervisor') {
        sql += ' WHERE t.supervisor_id = ?';
        params.push(viewerId);
      }
    }
    
    sql += ' GROUP BY t.id ORDER BY t.name ASC';
    
    const result = await query(sql, params);
    return result.rows;
  },

  async findById(id) {
    const result = await query(`
      SELECT t.*, e.name as supervisor_name
      FROM teams t
      LEFT JOIN employees e ON t.supervisor_id = e.id
      WHERE t.id = ?
    `, [id]);
    
    if (result.rows.length === 0) return null;
    return result.rows[0];
  },

  async getMembers(teamId) {
    const result = await query(`
      SELECT e.id, e.name, e.mobile, e.email, e.department, e.is_active
      FROM employees e
      JOIN team_members tm ON e.id = tm.employee_id
      WHERE tm.team_id = ?
      ORDER BY e.name ASC
    `, [teamId]);
    return result.rows;
  },

  async create(data, createdBy) {
    const { name, description, supervisor_id } = data;
    
    if (!name) {
      throw new Error('نام تیم الزامی است');
    }
    
    if (supervisor_id) {
      const existing = await query('SELECT id FROM teams WHERE supervisor_id = ?', [supervisor_id]);
      if (existing.rows.length > 0) {
        throw new Error('این سرپرست قبلاً دارای یک تیم است');
      }
    }
    
    const result = await query(`
      INSERT INTO teams (name, description, supervisor_id, created_by)
      VALUES (?, ?, ?, ?)
    `, [name, description || null, supervisor_id || null, createdBy]);
    
    return await this.findById(result.insertId);
  },

  async addMember(teamId, employeeId) {
    const empResult = await query(`
      SELECT r.name as roleName FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.id = ?
    `, [employeeId]);
    
    if (empResult.rows.length === 0) {
      throw new Error('کارمند یافت نشد');
    }
    
    if (empResult.rows[0].roleName !== 'expert') {
      throw new Error('فقط کارشناسان می‌توانند عضو تیم شوند');
    }
    
    const existing = await query('SELECT id FROM team_members WHERE team_id = ? AND employee_id = ?', [teamId, employeeId]);
    if (existing.rows.length > 0) {
      throw new Error('این کارمند قبلاً عضو این تیم است');
    }
    
    await query('INSERT INTO team_members (team_id, employee_id) VALUES (?, ?)', [teamId, employeeId]);
    return true;
  },

  async removeMember(teamId, employeeId) {
    await query('DELETE FROM team_members WHERE team_id = ? AND employee_id = ?', [teamId, employeeId]);
    return true;
  },

  async delete(id) {
    await query('DELETE FROM teams WHERE id = ?', [id]);
    return true;
  }
};

// ========== Express Router ==========
const express = require('express');
const router = express.Router();

// ========== Roles Routes ==========
router.get('/roles', async (req, res) => {
  try {
    const roles = await Employee.getAllRoles();
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/roles/:id/permissions', async (req, res) => {
  try {
    const currentUser = await Employee.findById(req.user.id);
    if (currentUser.roleName !== 'admin') {
      return res.status(403).json({ success: false, error: 'فقط ادمین می‌تواند دسترسی‌های نقش را تغییر دهد' });
    }
    const { permissions } = req.body;
    const updated = await Employee.updateRolePermissions(req.params.id, permissions);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== Employees Routes ==========
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.findVisibleEmployees(req.user.id);
    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, error: 'کارمند یافت نشد' });
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, mobile, password, roleId, department, customPermissions } = req.body;
    const newEmployee = await Employee.create({ name, mobile, password, roleId, department, customPermissions }, req.user.id);
    res.status(201).json({ success: true, data: newEmployee });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Employee.update(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Employee.delete(req.params.id, req.user.id);
    res.json({ success: true, message: 'کارمند حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ========== Login ==========
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const employee = await Employee.findByMobile(mobile);
    if (!employee) {
      return res.status(401).json({ success: false, error: 'شماره موبایل یا رمز عبور اشتباه است' });
    }
    
    const isValid = await bcrypt.compare(password, employee.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'شماره موبایل یا رمز عبور اشتباه است' });
    }
    
    if (!employee.isActive) {
      return res.status(403).json({ success: false, error: 'حساب کاربری شما غیرفعال است' });
    }
    
    const permissions = await Employee.getEffectivePermissions(employee.id);
    const token = jwt.sign(
      { id: employee.id, mobile: employee.mobile, role: employee.roleName, permissions, type: 'employee' },
      process.env.JWT_SECRET || 'aseman_super_secret_key',
      { expiresIn: '7d' }
    );
    
    const { password: _, ...safeEmployee } = employee;
    res.json({ success: true, data: { employee: safeEmployee, permissions, token } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== Teams Routes ==========
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.findAll(req.user.id);
    res.json({ success: true, data: teams });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/teams/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, error: 'تیم یافت نشد' });
    const members = await Team.getMembers(req.params.id);
    res.json({ success: true, data: { ...team, members } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/teams', async (req, res) => {
  try {
    const { name, description, supervisor_id } = req.body;
    const newTeam = await Team.create({ name, description, supervisor_id }, req.user.id);
    res.status(201).json({ success: true, data: newTeam });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/teams/:id/members', async (req, res) => {
  try {
    const { employee_id } = req.body;
    await Team.addMember(req.params.id, employee_id);
    res.json({ success: true, message: 'عضو با موفقیت اضافه شد' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/teams/:id/members/:employeeId', async (req, res) => {
  try {
    await Team.removeMember(req.params.id, req.params.employeeId);
    res.json({ success: true, message: 'عضو با موفقیت حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/teams/:id', async (req, res) => {
  try {
    await Team.delete(req.params.id);
    res.json({ success: true, message: 'تیم با موفقیت حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ========== Stats ==========
router.get('/stats/summary', async (req, res) => {
  try {
    const currentUser = await Employee.findById(req.user.id);
    if (currentUser.roleName !== 'admin') {
      return res.status(403).json({ success: false, error: 'شما دسترسی مشاهده آمار را ندارید' });
    }
    const stats = await Employee.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
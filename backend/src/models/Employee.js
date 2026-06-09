// backend/src/models/Employee.js
import { query } from '../utils/db.js';
import bcrypt from 'bcrypt';

class Employee {
  // دریافت همه نقش‌ها (برای پنل ادمین)
  static async getAllRoles() {
    const result = await query('SELECT * FROM roles ORDER BY id');
    return result.rows;
  }

  // به‌روزرسانی دسترسی‌های یک نقش (فقط ادمین)
  static async updateRolePermissions(roleId, permissions) {
    await query('UPDATE roles SET permissions = ?, updated_at = NOW() WHERE id = ?', [JSON.stringify(permissions), roleId]);
    return await this.getRoleById(roleId);
  }

  static async getRoleById(roleId) {
    const result = await query('SELECT * FROM roles WHERE id = ?', [roleId]);
    return result.rows[0];
  }

  // دریافت دسترسی‌های نهایی یک کارمند (نقش + سفارشی)
  static async getEffectivePermissions(employeeId) {
    const emp = await this.findById(employeeId);
    if (!emp) return [];
    
    if (emp.roleName === 'admin') return ['all'];
    
    // دسترسی‌های پایه از نقش
    let permissions = emp.rolePermissions || [];
    
    // اعمال دسترسی‌های سفارشی (+ اضافه, - حذف)
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
  }

  // بررسی آیا مدیر می‌تواند روی کارمند target عملیات انجام دهد
  static canManage(manager, target) {
    if (manager.roleName === 'admin') return true;
    if (manager.roleName === 'manager') {
      return target.roleName === 'supervisor' || target.roleName === 'expert';
    }
    if (manager.roleName === 'supervisor') {
      // بررسی اینکه target کارشناس و در تیم همین سرپرست باشد
      return target.roleName === 'expert' && target.supervisorId === manager.id;
    }
    return false;
  }

  // نرمالایز کردن داده‌های کارمند
  static normalize(emp) {
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
  }

  // دریافت همه کارمندانی که یک مدیر می‌تواند ببیند
  static async findVisibleEmployees(managerId) {
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
      // پیدا کردن تیم این سرپرست
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
  }

  // دریافت همه کارمندان (برای ادمین)
  static async findAll() {
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
  }

  // دریافت کارمند با ID
  static async findById(id) {
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
  }

  // دریافت کارمند با موبایل
  static async findByMobile(mobile) {
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
  }

  // ایجاد کارمند جدید (با موبایل و رمز)
  static async create(data, createdBy) {
    const { name, mobile, password, roleId, department, customPermissions } = data;
    
    if (!name || !mobile || !password || !roleId) {
      throw new Error('نام، شماره موبایل، رمز عبور و نقش الزامی است');
    }

    // بررسی وجود موبایل تکراری
    const existing = await this.findByMobile(mobile);
    if (existing) {
      throw new Error('این شماره موبایل قبلاً ثبت شده است');
    }

    // بررسی دسترسی ایجادکننده
    const creator = await this.findById(createdBy);
    if (!creator) {
      throw new Error('ایجادکننده یافت نشد');
    }

    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error('نقش انتخاب شده معتبر نیست');
    }

    // بررسی اینکه ایجادکننده می‌تواند این نقش را ایجاد کند
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
  }

  // به‌روزرسانی کارمند
  static async update(id, updates, updatedBy) {
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
  }

  // حذف کارمند
  static async delete(id, deletedBy) {
    const employee = await this.findById(id);
    if (!employee) throw new Error('کارمند یافت نشد');
    
    const deleter = await this.findById(deletedBy);
    if (!deleter) throw new Error('حذف‌کننده یافت نشد');
    
    if (!this.canManage(deleter, employee)) {
      throw new Error('شما دسترسی حذف این کاربر را ندارید');
    }
    
    // اگر سرپرست است، اول تیمش را بررسی کن
    if (employee.roleName === 'supervisor') {
      const teamResult = await query('SELECT id FROM teams WHERE supervisor_id = ?', [id]);
      if (teamResult.rows.length > 0) {
        throw new Error('این سرپرست دارای تیم است. ابتدا تیم را حذف یا سرپرست را تغییر دهید.');
      }
    }
    
    await query('DELETE FROM employees WHERE id = ?', [id]);
    return true;
  }

  // آمار کارمندان
  static async getStats() {
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
}

export default Employee;
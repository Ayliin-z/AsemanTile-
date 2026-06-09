// backend/src/models/Team.js
import { query } from '../utils/db.js';

class Team {
  static normalize(team) {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      supervisorId: team.supervisor_id,
      supervisorName: team.supervisor_name,
      memberCount: team.member_count || 0,
      createdAt: team.created_at,
      updatedAt: team.updated_at
    };
  }

  // دریافت همه تیم‌ها (با احترام به سطح دسترسی)
  static async findAll(viewerId = null) {
    let sql = `
      SELECT t.*, 
             e.name as supervisor_name,
             COUNT(tm.id) as member_count
      FROM teams t
      LEFT JOIN employees e ON t.supervisor_id = e.id
      LEFT JOIN team_members tm ON t.id = tm.team_id
    `;
    
    const params = [];
    
    // اگر بیننده سرپرست است، فقط تیم خودش را ببیند
    if (viewerId) {
      const viewer = await this.getViewerRole(viewerId);
      if (viewer?.roleName === 'supervisor') {
        sql += ' WHERE t.supervisor_id = ?';
        params.push(viewerId);
      }
    }
    
    sql += ' GROUP BY t.id ORDER BY t.name ASC';
    
    const result = await query(sql, params);
    return result.rows.map(t => this.normalize(t));
  }

  static async getViewerRole(viewerId) {
    const result = await query(`
      SELECT r.name as roleName FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.id = ?
    `, [viewerId]);
    return result.rows[0];
  }

  // دریافت تیم با ID
  static async findById(id) {
    const result = await query(`
      SELECT t.*, e.name as supervisor_name
      FROM teams t
      LEFT JOIN employees e ON t.supervisor_id = e.id
      WHERE t.id = ?
    `, [id]);
    
    if (result.rows.length === 0) return null;
    return this.normalize(result.rows[0]);
  }

  // دریافت اعضای یک تیم (کارشناسان)
  static async getMembers(teamId) {
    const result = await query(`
      SELECT e.id, e.name, e.mobile, e.email, e.department, e.is_active
      FROM employees e
      JOIN team_members tm ON e.id = tm.employee_id
      WHERE tm.team_id = ?
      ORDER BY e.name ASC
    `, [teamId]);
    return result.rows;
  }

  // ایجاد تیم جدید
  static async create(data, createdBy) {
    const { name, description, supervisor_id } = data;
    
    if (!name) {
      throw new Error('نام تیم الزامی است');
    }
    
    // بررسی اینکه سرپرست قبلاً تیم نداشته باشد
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
  }

  // به‌روزرسانی تیم
  static async update(id, updates) {
    const { name, description, supervisor_id } = updates;
    
    const updateFields = [];
    const params = [];
    
    if (name) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    if (supervisor_id !== undefined) {
      // بررسی اینکه سرپرست جدید قبلاً تیم نداشته باشد
      if (supervisor_id) {
        const existing = await query('SELECT id FROM teams WHERE supervisor_id = ? AND id != ?', [supervisor_id, id]);
        if (existing.rows.length > 0) {
          throw new Error('این سرپرست قبلاً دارای یک تیم است');
        }
      }
      updateFields.push('supervisor_id = ?');
      params.push(supervisor_id);
    }
    
    if (updateFields.length === 0) {
      throw new Error('هیچ فیلدی برای به‌روزرسانی ارسال نشده است');
    }
    
    updateFields.push('updated_at = NOW()');
    params.push(id);
    
    await query(`UPDATE teams SET ${updateFields.join(', ')} WHERE id = ?`, params);
    return await this.findById(id);
  }

  // افزودن عضو به تیم (فقط کارشناس)
  static async addMember(teamId, employeeId) {
    // بررسی اینکه کارمند نقش کارشناس داشته باشد
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
    
    // بررسی اینکه کارمند قبلاً در این تیم عضو نباشد
    const existing = await query('SELECT id FROM team_members WHERE team_id = ? AND employee_id = ?', [teamId, employeeId]);
    if (existing.rows.length > 0) {
      throw new Error('این کارمند قبلاً عضو این تیم است');
    }
    
    await query('INSERT INTO team_members (team_id, employee_id) VALUES (?, ?)', [teamId, employeeId]);
    return true;
  }

  // حذف عضو از تیم
  static async removeMember(teamId, employeeId) {
    await query('DELETE FROM team_members WHERE team_id = ? AND employee_id = ?', [teamId, employeeId]);
    return true;
  }

  // حذف تیم
  static async delete(id) {
    await query('DELETE FROM teams WHERE id = ?', [id]);
    return true;
  }
}

export default Team;
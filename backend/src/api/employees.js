// backend/src/api/employees.js
import express from 'express';
import Employee from '../models/Employee.js';
import Team from '../models/Team.js';
import { authenticate } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
router.use(authenticate);

// ========== نقش‌ها (Roles) ==========
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

// ========== کارمندان ==========
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

// ========== لاگین کارمند ==========
router.post('/login', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const employee = await Employee.findByMobile(mobile);
    if (!employee) {
      return res.status(401).json({ success: false, error: 'شماره موبایل یا رمز عبور اشتباه است' });
    }
    
    const bcrypt = await import('bcrypt');
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

// ========== تیم‌ها (Teams) ==========
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

router.put('/teams/:id', async (req, res) => {
  try {
    const updated = await Team.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
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

// ========== آمار ==========
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

export default router;
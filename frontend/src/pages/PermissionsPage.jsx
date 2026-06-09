// frontend/src/pages/PermissionsPage.jsx
import { useState, useEffect } from 'react';
import './PermissionsPage.css';

const PermissionsPage = () => {
  const [roles, setRoles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showRoleDetailModal, setShowRoleDetailModal] = useState(false);
  const [showTeamDetailModal, setShowTeamDetailModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [teamForm, setTeamForm] = useState({ name: '', description: '', supervisor_id: '' });
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState(null);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedEmployeeForPerms, setSelectedEmployeeForPerms] = useState(null);
  const [showEmployeePermissionsModal, setShowEmployeePermissionsModal] = useState(false);
  const [employeeCustomPermissions, setEmployeeCustomPermissions] = useState([]);
  const [managers, setManagers] = useState([]);
  const [availableSupervisors, setAvailableSupervisors] = useState([]);
  
  // فرم افزودن کارمند جدید
  const [employeeForm, setEmployeeForm] = useState({ 
    name: '', 
    mobile: '', 
    password: '', 
    role_id: '' 
  });

  // لیست تمام دسترسی‌های موجود
  const allPermissionsList = [
    { key: 'view_dashboard', label: 'مشاهده داشبورد', group: 'داشبورد' },
    { key: 'view_products', label: 'مشاهده محصولات', group: 'محصولات' },
    { key: 'add_product', label: 'افزودن محصول', group: 'محصولات' },
    { key: 'edit_product', label: 'ویرایش محصول', group: 'محصولات' },
    { key: 'delete_product', label: 'حذف محصول', group: 'محصولات' },
    { key: 'manage_brands', label: 'مدیریت برندها', group: 'برندها' },
    { key: 'manage_tags', label: 'مدیریت تگ‌ها', group: 'تگ‌ها' },
    { key: 'manage_partners', label: 'مدیریت همکاران', group: 'همکاران' },
    { key: 'manage_employees', label: 'مدیریت کارمندان', group: 'کارمندان' },
    { key: 'import_export', label: 'ورود و خروج داده', group: 'داده‌ها' },
    { key: 'view_quotes', label: 'مشاهده سفارشات', group: 'سفارشات' },
    { key: 'create_quote', label: 'ایجاد سفارش', group: 'سفارشات' },
    { key: 'manage_quotes', label: 'مدیریت سفارشات', group: 'سفارشات' },
    { key: 'view_reports', label: 'مشاهده گزارشات', group: 'گزارشات' },
    { key: 'edit_sales_mode', label: 'تغییر روش فروش', group: 'تنظیمات' },
    { key: 'edit_landing_tags', label: 'تغییر تگ‌های صفحه اصلی', group: 'تنظیمات' }
  ];

  // بارگذاری نقش‌ها با fallback
  const loadRoles = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/employees/roles');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setRoles(data.data);
          return;
        }
      }
    } catch (err) {
      console.error('Error loading roles:', err);
    }
    
    // Fallback داده‌های پیش‌فرض
    console.log('Using fallback roles data');
    setRoles([
      { id: 1, name: 'admin', description: 'مدیر کل - دسترسی کامل', permissions: allPermissionsList.map(p => p.key) },
      { id: 2, name: 'manager', description: 'مدیر', permissions: ['view_dashboard', 'view_products', 'add_product', 'edit_product', 'view_quotes', 'create_quote', 'manage_quotes', 'view_reports', 'manage_employees'] },
      { id: 3, name: 'supervisor', description: 'سرپرست', permissions: ['view_dashboard', 'view_products', 'view_quotes', 'create_quote'] },
      { id: 4, name: 'expert', description: 'کارشناس', permissions: ['view_dashboard', 'view_products', 'view_quotes'] }
    ]);
  };

  // بارگذاری تیم‌ها
  const loadTeams = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/employees/teams');
      const data = await res.json();
      if (data.success) setTeams(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // بارگذاری کارمندان
  const loadEmployees = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/employees');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
        const available = data.data.filter(emp => 
          emp.role_name === 'supervisor' || emp.role_name === 'expert'
        );
        setAvailableEmployees(available);
        
        const managersList = data.data.filter(emp => emp.role_name === 'manager');
        setManagers(managersList);
        
        const supervisorsList = data.data.filter(emp => emp.role_name === 'supervisor');
        setAvailableSupervisors(supervisorsList);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // بارگذاری همه داده‌ها
  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadRoles(), loadTeams(), loadEmployees()]);
    setLoading(false);
  };

  // بارگذاری اعضای تیم
  const loadTeamMembers = async (teamId) => {
    try {
      const res = await fetch(`http://localhost:5003/api/employees/teams/${teamId}`);
      const data = await res.json();
      if (data.success) {
        setTeamMembers(data.data.members || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // باز کردن جزئیات نقش
  const openRoleDetail = (role) => {
    setSelectedRole(role);
    setShowRoleDetailModal(true);
  };

  // باز کردن جزئیات تیم
  const openTeamDetail = async (team) => {
    setSelectedTeam(team);
    setShowTeamDetailModal(true);
    await loadTeamMembers(team.id);
  };

  // باز کردن مودال تنظیم دسترسی‌های کارمند
  const openEmployeePermissions = (employee) => {
    console.log('باز کردن مودال برای:', employee.name);
    
    setSelectedEmployeeForPerms(employee);
    
    // دسترسی‌های سفارشی این کارمند (از فیلد custom_permissions)
    let customPerms = employee.custom_permissions || [];
    if (typeof customPerms === 'string') {
      try { customPerms = JSON.parse(customPerms); } catch(e) { customPerms = []; }
    }
    
    // دسترسی‌های نقش (برای نمایش برچسب پیش‌فرض)
    let rolePerms = employee.role_permissions || [];
    if (typeof rolePerms === 'string') {
      try { rolePerms = JSON.parse(rolePerms); } catch(e) { rolePerms = []; }
    }
    
    setEmployeeCustomPermissions(customPerms);
    setCurrentRolePermissions(rolePerms);
    setShowEmployeePermissionsModal(true);
  };

  // تغییر دسترسی نقش (برای مودال نقش‌ها)
  const togglePermission = (permKey) => {
    if (!selectedRole) return;
    setSelectedRole(prev => {
      const currentPerms = prev.permissions || [];
      const newPerms = currentPerms.includes(permKey)
        ? currentPerms.filter(p => p !== permKey)
        : [...currentPerms, permKey];
      return { ...prev, permissions: newPerms };
    });
  };

  // تغییر دسترسی کارمند
  const toggleEmployeePermission = (permKey) => {
    setEmployeeCustomPermissions(prev => {
      if (prev.includes(permKey)) {
        return prev.filter(p => p !== permKey);
      } else {
        return [...prev, permKey];
      }
    });
  };

  // انتخاب همه دسترسی‌ها برای کارمند
  const selectAllPermissions = () => {
    const allKeys = allPermissionsList.map(p => p.key);
    setEmployeeCustomPermissions(allKeys);
  };

  // حذف همه دسترسی‌ها برای کارمند
  const clearAllPermissions = () => {
    setEmployeeCustomPermissions([]);
  };

  // به‌روزرسانی دسترسی‌های نقش
  const updateRolePermissions = async () => {
    if (!selectedRole) return;
    try {
      const res = await fetch(`http://localhost:5003/api/employees/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: selectedRole.permissions })
      });
      const data = await res.json();
      if (data.success) {
        alert('دسترسی‌ها با موفقیت ذخیره شد');
        loadRoles();
        setShowRoleDetailModal(false);
        setSelectedRole(null);
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  };

  // ذخیره دسترسی‌های کارمند
  const saveEmployeePermissions = async () => {
    if (!selectedEmployeeForPerms) return;
    
    console.log('💾 ذخیره دسترسی‌ها:', employeeCustomPermissions);
    
    try {
      const res = await fetch(`http://localhost:5003/api/employees/${selectedEmployeeForPerms.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          custom_permissions: employeeCustomPermissions 
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ دسترسی‌ها ذخیره شد');
        setShowEmployeePermissionsModal(false);
        loadAllData();
      } else {
        alert('❌ خطا: ' + data.error);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  };

  // حذف نقش
  const deleteRole = async () => {
    if (!selectedRole) return;
    if (!window.confirm(`آیا از حذف نقش "${selectedRole.name}" اطمینان دارید؟`)) return;
    
    try {
      const res = await fetch(`http://localhost:5003/api/employees/roles/${selectedRole.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('نقش با موفقیت حذف شد');
        loadAllData();
        setShowRoleDetailModal(false);
        setSelectedRole(null);
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  };

  // اضافه کردن نقش جدید
  const addRole = async () => {
    if (!newRoleName.trim()) {
      alert('نام نقش الزامی است');
      return;
    }
    
    try {
      const res = await fetch('http://localhost:5003/api/employees/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newRoleName, 
          description: newRoleDescription,
          permissions: []
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('نقش با موفقیت اضافه شد');
        setShowAddRoleModal(false);
        setNewRoleName('');
        setNewRoleDescription('');
        loadAllData();
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  };

  // ایجاد تیم جدید
  const createTeam = async () => {
    if (!teamForm.name) {
      alert('نام تیم الزامی است');
      return;
    }
    try {
      const res = await fetch('http://localhost:5003/api/employees/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm)
      });
      const data = await res.json();
      if (data.success) {
        alert('تیم با موفقیت ایجاد شد');
        setShowAddTeamModal(false);
        setTeamForm({ name: '', description: '', supervisor_id: '' });
        loadAllData();
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  };

  // حذف تیم
  const deleteTeam = async () => {
    if (!selectedTeam) return;
    if (!window.confirm(`آیا از حذف تیم "${selectedTeam.name}" اطمینان دارید؟`)) return;
    
    try {
      const res = await fetch(`http://localhost:5003/api/employees/teams/${selectedTeam.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('تیم با موفقیت حذف شد');
        loadAllData();
        setShowTeamDetailModal(false);
        setSelectedTeam(null);
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  };

  // ایجاد کارمند جدید
  const createEmployee = async () => {
    if (!employeeForm.name || !employeeForm.mobile || !employeeForm.password || !employeeForm.role_id) {
      alert('لطفاً نام، شماره موبایل، رمز عبور و نقش را وارد کنید');
      return;
    }
    
    if (employeeForm.password.length < 4) {
      alert('رمز عبور باید حداقل ۴ کاراکتر باشد');
      return;
    }
    
    try {
      const res = await fetch('http://localhost:5003/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeForm)
      });
      const data = await res.json();
      if (data.success) {
        alert(`کارمند "${employeeForm.name}" با موفقیت ایجاد شد`);
        setShowEmployeeModal(false);
        setEmployeeForm({ name: '', mobile: '', password: '', role_id: '', department: 'sales' });
        loadAllData();
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('خطا در ارتباط با سرور');
    }
  };

  // افزودن عضو به تیم
  const addMemberToTeam = async (employeeId) => {
    if (!selectedTeamForMembers) return;
    try {
      const res = await fetch(`http://localhost:5003/api/employees/teams/${selectedTeamForMembers.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId })
      });
      const data = await res.json();
      if (data.success) {
        alert('عضو با موفقیت به تیم اضافه شد');
        loadAllData();
        setShowAddMemberModal(false);
        setSelectedTeamForMembers(null);
        if (selectedTeam) {
          await loadTeamMembers(selectedTeam.id);
        }
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    }
  };

  // اضافه کردن state جدید
  const [currentRolePermissions, setCurrentRolePermissions] = useState([]);

  useEffect(() => {
    loadAllData();
  }, []);

  // گروه‌بندی دسترسی‌ها
  const groupedPermissions = allPermissionsList.reduce((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = [];
    acc[perm.group].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="permissions-loading">
        <div className="spinner"></div>
        <p>در حال بارگذاری...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="permissions-error">
        <p>❌ {errorMsg}</p>
        <button onClick={loadAllData} className="btn-retry">تلاش مجدد</button>
      </div>
    );
  }

  return (
    <div className="permissions-page">
      {/* ========== بخش نقش‌های سازمانی ========== */}
      <div className="permissions-header">
        <h1>🔐 نقش‌های سازمانی</h1>
        <button className="btn-add-role" onClick={() => setShowAddRoleModal(true)}>
          ➕ افزودن نقش جدید
        </button>
      </div>

      <div className="roles-grid">
        {roles.map(role => (
          <div 
            key={role.id} 
            className="role-card"
            onClick={() => openRoleDetail(role)}
          >
            <div className="role-icon">
              {role.name === 'admin' && '👑'}
              {role.name === 'manager' && '📊'}
              {role.name === 'supervisor' && '👥'}
              {role.name === 'expert' && '🔧'}
              {!['admin','manager','supervisor','expert'].includes(role.name) && '📋'}
            </div>
            <h3 className="role-name">
              {role.name === 'admin' ? 'مدیر کل' : 
               role.name === 'manager' ? 'مدیر' : 
               role.name === 'supervisor' ? 'سرپرست' : 
               role.name === 'expert' ? 'کارشناس' : role.name}
            </h3>
            <p className="role-desc">{role.description || '—'}</p>
            <div className="role-perms-count">{(role.permissions || []).length} دسترسی</div>
          </div>
        ))}
      </div>

      {/* ========== بخش تیم‌ها ========== */}
      <div className="teams-section">
        <div className="teams-header">
          <h2>👥 تیم‌ها</h2>
          <div className="teams-buttons">
            <button 
              className="btn-add-member-global" 
              onClick={() => {
                if (teams.length === 0) {
                  alert('ابتدا یک تیم ایجاد کنید');
                  return;
                }
                setSelectedTeamForMembers(teams[0]);
                setShowAddMemberModal(true);
              }}
            >
              ➕ افزودن عضو به تیم
            </button>
            <button 
              className="btn-add-employee" 
              onClick={() => setShowEmployeeModal(true)}
            >
              👤 عضو جدید
            </button>
            <button className="btn-add-team" onClick={() => setShowAddTeamModal(true)}>
              ➕ افزودن تیم
            </button>
          </div>
        </div>

        {teams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #1c7385' }}>
            <p style={{ color: '#7c8788', marginBottom: '15px' }}>هیچ تیمی ثبت نشده است.</p>
            <button className="btn-primary" onClick={() => setShowAddTeamModal(true)} style={{ padding: '10px 24px' }}>➕ افزودن اولین تیم</button>
          </div>
        ) : (
          <div className="teams-grid">
            {teams.map(team => (
              <div 
                key={team.id} 
                className="team-card"
                onClick={() => openTeamDetail(team)}
              >
                <div className="team-icon">👥</div>
                <h3 className="team-name">{team.name}</h3>
                <p className="team-desc">{team.description || '—'}</p>
                <div className="team-info">
                  <span className="team-supervisor">
                    سرپرست: {team.supervisor_name || 'تعیین نشده'}
                  </span>
                  <span className="team-members-count">{team.member_count || 0} عضو</span>
                </div>
                <button 
                  className="btn-add-member"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTeamForMembers(team);
                    setShowAddMemberModal(true);
                  }}
                >
                  ➕ افزودن عضو
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== لیست همه کارمندان ========== */}
      <div className="all-employees-section" style={{ marginTop: '50px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '10px', borderBottom: '2px solid #ffd800' }}>
          <h3 style={{ color: '#13314c', margin: 0, fontSize: '22px' }}>👥 لیست همه کارمندان</h3>
          <button className="btn-add-employee" onClick={() => { setEmployeeForm({ name: '', mobile: '', password: '', role_id: '', department: 'sales' }); setShowEmployeeModal(true); }} style={{ background: '#1c7385', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '30px', cursor: 'pointer' }}>➕ افزودن کارمند جدید</button>
        </div>

        {employees.length === 0 ? (
          <p className="empty-text">هیچ کارمندی ثبت نشده است.</p>
        ) : (
          <div className="employees-table-container" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e3dede' }}>
            <table className="employees-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f4f7', borderBottom: '2px solid #e3dede' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>نام</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>شماره تماس</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>نقش</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  let roleColor = '#7c8788';
                  let roleName = '';
                  if (emp.role_name === 'admin') { roleColor = '#e74c3c'; roleName = 'مدیر کل'; }
                  else if (emp.role_name === 'manager') { roleColor = '#e67e22'; roleName = 'مدیر'; }
                  else if (emp.role_name === 'supervisor') { roleColor = '#3498db'; roleName = 'سرپرست'; }
                  else if (emp.role_name === 'expert') { roleColor = '#27ae60'; roleName = 'کارشناس'; }
                  
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #e3dede' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '500' }}>{emp.name}</td>
                      <td style={{ padding: '12px 16px' }}>{emp.mobile}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: roleColor + '20', color: roleColor, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>{roleName}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button onClick={() => openEmployeePermissions(emp)} style={{ background: '#1c7385', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>✏️ ویرایش دسترسی</button>
                          <button onClick={() => { if (window.confirm(`آیا از حذف "${emp.name}" اطمینان دارید؟`)) { fetch(`http://localhost:5003/api/employees/${emp.id}`, { method: 'DELETE' }).then(() => { alert('کارمند حذف شد'); loadAllData(); }).catch(err => alert('خطا در حذف: ' + err.message)); } }} style={{ background: '#a70023', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px' }}>🗑️ حذف</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========== مودال جزئیات نقش ========== */}
      {showRoleDetailModal && selectedRole && (
        <div className="modal-overlay" onClick={() => setShowRoleDetailModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRole.name === 'admin' ? 'مدیر کل' : selectedRole.name === 'manager' ? 'مدیر' : selectedRole.name === 'supervisor' ? 'سرپرست' : selectedRole.name === 'expert' ? 'کارشناس' : selectedRole.name}</h2>
              <button className="modal-close" onClick={() => setShowRoleDetailModal(false)}>✖</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>توضیحات نقش</label>
                <input type="text" value={selectedRole.description || ''} onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })} placeholder="توضیحات این نقش..." />
              </div>
              <h3 className="permissions-title">دسترسی‌ها:</h3>
              <div className="permissions-list">
                {Object.entries(groupedPermissions).map(([group, perms]) => (
                  <div key={group} className="permission-group">
                    <h4 className="permission-group-title">{group}</h4>
                    <div className="permission-items">
                      {perms.map(perm => (
                        <label key={perm.key} className="permission-item">
                          <input type="checkbox" checked={(selectedRole.permissions || []).includes(perm.key)} onChange={() => togglePermission(perm.key)} disabled={selectedRole.name === 'admin'} />
                          <span>{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              {selectedRole.name !== 'admin' && <button className="btn-delete" onClick={deleteRole}>🗑️ حذف نقش</button>}
              <button className="btn-cancel" onClick={() => setShowRoleDetailModal(false)}>انصراف</button>
              {selectedRole.name !== 'admin' && <button className="btn-save" onClick={updateRolePermissions}>💾 ذخیره تغییرات</button>}
              {selectedRole.name === 'admin' && <button className="btn-save" onClick={() => setShowRoleDetailModal(false)}>بستن</button>}
            </div>
          </div>
        </div>
      )}

      {/* ========== مودال جزئیات تیم ========== */}
      {showTeamDetailModal && selectedTeam && (
        <div className="modal-overlay" onClick={() => setShowTeamDetailModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2>👥 {selectedTeam.name}</h2>
              <button className="modal-close" onClick={() => setShowTeamDetailModal(false)}>✖</button>
            </div>
            <div className="modal-body">
              <div className="team-info-section">
                <div className="form-group"><label>نام تیم</label><input type="text" value={selectedTeam.name} onChange={(e) => setSelectedTeam({ ...selectedTeam, name: e.target.value })} /></div>
                <div className="form-group"><label>توضیحات</label><textarea rows="2" value={selectedTeam.description || ''} onChange={(e) => setSelectedTeam({ ...selectedTeam, description: e.target.value })} /></div>
                <div className="form-group"><label>سرپرست تیم</label><select value={selectedTeam.supervisor_id || ''} onChange={(e) => setSelectedTeam({ ...selectedTeam, supervisor_id: e.target.value || null })}><option value="">انتخاب سرپرست...</option>{availableSupervisors.map(sup => (<option key={sup.id} value={sup.id}>{sup.name} ({sup.mobile})</option>))}</select></div>
              </div>
              <hr />
              <div className="team-members-section"><h3>👥 اعضای تیم ({teamMembers.length})</h3>
                <div className="team-members-list">
                  {teamMembers.length === 0 ? <p className="empty-text">هیچ عضوی در این تیم نیست</p> : teamMembers.map(member => {
                    const memberRole = roles.find(r => r.id === member.role_id);
                    const rolePermissions = memberRole?.permissions || [];
                    let customPermissions = member.custom_permissions || [];
                    if (typeof customPermissions === 'string') {
                      try { customPermissions = JSON.parse(customPermissions); } catch(e) { customPermissions = []; }
                    }
                    let finalPermissions = [...rolePermissions];
                    customPermissions.forEach(p => {
                      if (p.startsWith('+')) { const permName = p.substring(1); if (!finalPermissions.includes(permName)) finalPermissions.push(permName); }
                      else if (p.startsWith('-')) { const permName = p.substring(1); const idx = finalPermissions.indexOf(permName); if (idx !== -1) finalPermissions.splice(idx, 1); }
                    });
                    return (
                      <div key={member.id} className="team-member-card">
                        <div className="member-header"><div className="member-avatar">👤</div><div className="member-info"><strong>{member.name}</strong><span className="member-role">{member.role_name === 'supervisor' ? 'سرپرست' : 'کارشناس'}</span><span className="member-mobile">{member.mobile}</span></div>
                          <button className="btn-remove-member" onClick={async () => { if (!window.confirm(`آیا از حذف "${member.name}" از تیم اطمینان دارید؟`)) return; try { const res = await fetch(`http://localhost:5003/api/employees/teams/${selectedTeam.id}/members/${member.id}`, { method: 'DELETE' }); const data = await res.json(); if (data.success) { alert('عضو با موفقیت از تیم حذف شد'); loadTeamMembers(selectedTeam.id); } else { alert('خطا: ' + data.error); } } catch (err) { alert('خطا در ارتباط با سرور'); } }}>✖</button>
                        </div>
                        <div className="member-permissions"><div className="permissions-header"><span>دسترسی‌ها:</span><button className="btn-edit-member-perms" onClick={() => openEmployeePermissions(member)}>✏️ ویرایش دسترسی‌ها</button></div>
                          <div className="permissions-tags">{finalPermissions.slice(0, 5).map(perm => { const permInfo = allPermissionsList.find(p => p.key === perm); const isFromRole = rolePermissions.includes(perm); const isAdded = customPermissions.includes(`+${perm}`); return (<span key={perm} className={`perm-tag ${isFromRole ? 'from-role' : ''} ${isAdded ? 'added' : ''}`}>{permInfo?.label || perm}{isFromRole && <small>(نقش)</small>}</span>); })}{finalPermissions.length > 5 && <span className="perm-tag more">+{finalPermissions.length - 5} مورد</span>}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="btn-add-member-to-team" onClick={() => { setSelectedTeamForMembers(selectedTeam); setShowAddMemberModal(true); }}>➕ افزودن عضو جدید به تیم</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-delete" onClick={deleteTeam} style={{ background: '#a70023' }}>🗑️ حذف تیم</button>
              <button className="btn-cancel" onClick={() => setShowTeamDetailModal(false)}>انصراف</button>
              <button className="btn-save" onClick={async () => { try { const res = await fetch(`http://localhost:5003/api/employees/teams/${selectedTeam.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: selectedTeam.name, description: selectedTeam.description, supervisor_id: selectedTeam.supervisor_id }) }); const data = await res.json(); if (data.success) { alert('تیم با موفقیت ویرایش شد'); loadAllData(); } else { alert('خطا: ' + data.error); } } catch (err) { alert('خطا در ارتباط با سرور'); } }}>💾 ذخیره تغییرات تیم</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== مودال تنظیم دسترسی‌های کارمند (اصلاح شده) ========== */}
      {showEmployeePermissionsModal && selectedEmployeeForPerms && (
        <div className="modal-overlay" onClick={() => setShowEmployeePermissionsModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '85vh', overflow: 'hidden' }}>
            <div className="modal-header">
              <h2>✏️ تنظیم دسترسی‌های {selectedEmployeeForPerms.name}</h2>
              <button className="modal-close" onClick={() => setShowEmployeePermissionsModal(false)}>✖</button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 120px)' }}>
              <div className="role-info" style={{ background: '#f0f4f7', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                <p><strong>نقش پایه:</strong> {
                  selectedEmployeeForPerms.role_name === 'manager' ? 'مدیر' : 
                  selectedEmployeeForPerms.role_name === 'supervisor' ? 'سرپرست' : 
                  selectedEmployeeForPerms.role_name === 'expert' ? 'کارشناس' : selectedEmployeeForPerms.role_name
                }</p>
                <p><strong>دپارتمان:</strong> {
                  selectedEmployeeForPerms.department === 'sales' ? 'فروش' : 
                  selectedEmployeeForPerms.department === 'executive' ? 'اجرایی' : 
                  selectedEmployeeForPerms.department === 'financial' ? 'مالی' :
                  selectedEmployeeForPerms.department === 'technical' ? 'فنی' :
                  selectedEmployeeForPerms.department === 'support' ? 'پشتیبانی' : selectedEmployeeForPerms.department
                }</p>
              </div>
              
              {/* دکمه‌های انتخاب همه و حذف همه */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button onClick={selectAllPermissions} style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>✅ انتخاب همه دسترسی‌ها</button>
                <button onClick={clearAllPermissions} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>❌ حذف همه دسترسی‌ها</button>
              </div>
              
              <hr />
              <h4 style={{ marginTop: '10px', marginBottom: '15px', color: '#13314c' }}>📋 لیست دسترسی‌ها</h4>
              
              <div className="permissions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                {allPermissionsList.map(perm => {
                  const isChecked = employeeCustomPermissions.includes(perm.key);
                  const isInRole = currentRolePermissions.includes(perm.key);
                  
                  return (
                    <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: '#f8f9fa', borderRight: '3px solid #ced4da' }}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleEmployeePermission(perm.key)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      <span style={{ flex: 1, fontSize: '13px' }}>{perm.label}</span>
                      {isInRole && <span style={{ fontSize: '10px', background: '#2196f3', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>پیش‌فرض</span>}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #e3dede' }}>
              <button className="btn-cancel" onClick={() => setShowEmployeePermissionsModal(false)} style={{ padding: '10px 24px', borderRadius: '30px', cursor: 'pointer' }}>انصراف</button>
              <button className="btn-save" onClick={saveEmployeePermissions} style={{ background: '#1c7385', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold' }}>💾 ذخیره دسترسی‌ها</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== مودال افزودن نقش جدید ========== */}
      {showAddRoleModal && (
        <div className="modal-overlay" onClick={() => setShowAddRoleModal(false)}>
          <div className="modal-container small" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>➕ افزودن نقش جدید</h2><button className="modal-close" onClick={() => setShowAddRoleModal(false)}>✖</button></div>
            <div className="modal-body"><div className="form-group"><label>نام نقش *</label><input type="text" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="مثال: مدیر بازاریابی" /></div><div className="form-group"><label>توضیحات</label><textarea rows="3" value={newRoleDescription} onChange={(e) => setNewRoleDescription(e.target.value)} placeholder="توضیحات این نقش..." /></div></div>
            <div className="modal-footer"><button className="btn-cancel" onClick={() => setShowAddRoleModal(false)}>انصراف</button><button className="btn-save" onClick={addRole}>ایجاد نقش</button></div>
          </div>
        </div>
      )}

      {/* ========== مودال افزودن تیم ========== */}
      {showAddTeamModal && (
        <div className="modal-overlay" onClick={() => setShowAddTeamModal(false)}>
          <div className="modal-container small" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>➕ افزودن تیم جدید</h2><button className="modal-close" onClick={() => setShowAddTeamModal(false)}>✖</button></div>
            <div className="modal-body"><div className="form-group"><label>نام تیم *</label><input type="text" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="مثال: تیم فروش شمال" /></div><div className="form-group"><label>توضیحات</label><textarea rows="2" value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} placeholder="توضیحات اختیاری" /></div><div className="form-group"><label>سرپرست تیم (اختیاری)</label><select value={teamForm.supervisor_id} onChange={(e) => setTeamForm({ ...teamForm, supervisor_id: e.target.value })}><option value="">انتخاب سرپرست...</option>{availableSupervisors.map(sup => (<option key={sup.id} value={sup.id}>{sup.name} ({sup.mobile})</option>))}</select><small>هر سرپرست فقط می‌تواند سرپرست یک تیم باشد</small></div></div>
            <div className="modal-footer"><button className="btn-cancel" onClick={() => setShowAddTeamModal(false)}>انصراف</button><button className="btn-save" onClick={createTeam}>ایجاد تیم</button></div>
          </div>
        </div>
      )}

      {/* ========== مودال افزودن عضو به تیم ========== */}
      {showAddMemberModal && selectedTeamForMembers && (
        <div className="modal-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div className="modal-container small" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>➕ افزودن عضو به تیم {selectedTeamForMembers.name}</h2><button className="modal-close" onClick={() => setShowAddMemberModal(false)}>✖</button></div>
            <div className="modal-body"><div className="form-group"><label>انتخاب کارمند</label><select className="member-select" onChange={(e) => { if (e.target.value) addMemberToTeam(parseInt(e.target.value)); }} defaultValue=""><option value="">انتخاب کنید...</option>{availableEmployees.filter(emp => emp.role_name === 'expert').map(emp => (<option key={emp.id} value={emp.id}>{emp.name} - {emp.mobile} (کارشناس)</option>))}</select><small>فقط کارشناسان می‌توانند عضو تیم شوند</small></div></div>
            <div className="modal-footer"><button className="btn-cancel" onClick={() => setShowAddMemberModal(false)}>انصراف</button></div>
          </div>
        </div>
      )}

      {/* ========== مودال افزودن کارمند جدید ========== */}
      {showEmployeeModal && (
        <div className="modal-overlay" onClick={() => setShowEmployeeModal(false)}>
          <div className="modal-container small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 افزودن کارمند جدید</h2>
              <button className="modal-close" onClick={() => setShowEmployeeModal(false)}>✖</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>نام و نام خانوادگی *</label>
                <input 
                  type="text" 
                  value={employeeForm.name} 
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  placeholder="مثال: علی رضایی"
                />
              </div>
              
              <div className="form-group">
                <label>شماره موبایل *</label>
                <input 
                  type="tel" 
                  value={employeeForm.mobile} 
                  onChange={(e) => setEmployeeForm({ ...employeeForm, mobile: e.target.value })}
                  placeholder="09123456789"
                />
              </div>
              
              <div className="form-group">
                <label>رمز عبور *</label>
                <input 
                  type="password" 
                  value={employeeForm.password} 
                  onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                  placeholder="********"
                />
                <small>حداقل ۴ کاراکتر</small>
              </div>
              
              <div className="form-group">
                <label>نقش *</label>
                <select 
                  value={employeeForm.role_id} 
                  onChange={(e) => setEmployeeForm({ ...employeeForm, role_id: e.target.value })}
                >
                  <option value="">انتخاب نقش...</option>
                  {roles.filter(r => r.name !== 'admin').map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name === 'manager' ? 'مدیر' : role.name === 'supervisor' ? 'سرپرست' : 'کارشناس'}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* حذف بخش دپارتمان */}
              
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEmployeeModal(false)}>انصراف</button>
              <button className="btn-save" onClick={createEmployee}>💾 ایجاد کارمند</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsPage;
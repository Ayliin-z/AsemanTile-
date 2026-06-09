// frontend/src/pages/EmployeePanel.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EmployeePanel.css';

const EmployeePanel = () => {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // State برای بخش‌های مختلف
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [tags, setTags] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // State برای فرم محصول
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', price: '', partnerPrice: '', stock: '', category: '', manufacturer: ''
  });

  // State برای فرم برند
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: '', enabled: true });

  // State برای فرم تگ
  const [showTagForm, setShowTagForm] = useState(false);
  const [tagForm, setTagForm] = useState('');

  // ========== توابع کمکی ==========
  const hasPermission = (perm) => {
    if (employee?.role_name === 'admin') return true;
    return permissions.includes(perm);
  };

  // ========== بارگذاری داده‌ها ==========
  useEffect(() => {
    const employeeData = localStorage.getItem('aseman_employee_auth');
    if (!employeeData) {
      navigate('/login');
      return;
    }
    
    try {
      const emp = JSON.parse(employeeData);
      setEmployee(emp);
      setPermissions(emp.permissions || []);
    } catch (err) {
      console.error(err);
      navigate('/login');
      return;
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (!employee) return;
    
    if (hasPermission('view_products')) loadProducts();
    if (hasPermission('manage_brands')) loadBrands();
    if (hasPermission('manage_tags')) loadTags();
    if (hasPermission('view_quotes')) loadQuotes();
    if (hasPermission('view_customers')) loadCustomers();
    if (hasPermission('manage_partners')) loadPartners();
    if (hasPermission('manage_blog')) loadBlogPosts();
  }, [employee]);

  const loadProducts = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/products');
      const data = await res.json();
      setProducts(data.data || []);
    } catch (err) { console.error(err); }
  };

  const loadBrands = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/brands');
      const data = await res.json();
      setBrands(data);
    } catch (err) { console.error(err); }
  };

  const loadTags = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/tags');
      const data = await res.json();
      setTags(data);
    } catch (err) { console.error(err); }
  };

  const loadQuotes = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/quotes');
      const data = await res.json();
      setQuotes(data.data || []);
    } catch (err) { console.error(err); }
  };

  const loadCustomers = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/users');
      const data = await res.json();
      const users = Array.isArray(data) ? data : (data.data || []);
      setCustomers(users.filter(u => u.type === 'customer' || u.type === 'partner'));
    } catch (err) { console.error(err); }
  };

  const loadPartners = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/partners/pending');
      const data = await res.json();
      setPartners(data.data || []);
    } catch (err) { console.error(err); }
  };

  const loadBlogPosts = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/blog');
      const data = await res.json();
      setBlogPosts(data.posts || []);
    } catch (err) { console.error(err); }
  };

  // ========== توابع محصولات ==========
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5003/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name,
          price_public: productForm.price,
          price_partner: productForm.partnerPrice || productForm.price,
          stock_quantity: productForm.stock || 0,
          category: productForm.category,
          brand: productForm.manufacturer
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('محصول اضافه شد');
        setShowProductForm(false);
        setProductForm({ name: '', price: '', partnerPrice: '', stock: '', category: '', manufacturer: '' });
        loadProducts();
      }
    } catch (err) { alert('خطا'); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('حذف شود؟')) return;
    try {
      await fetch(`http://localhost:5003/api/products/${id}`, { method: 'DELETE' });
      loadProducts();
    } catch (err) { alert('خطا'); }
  };

  // ========== توابع برندها ==========
  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!brandForm.name) return alert('نام برند الزامی است');
    try {
      await fetch('http://localhost:5003/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: brandForm.name, enabled: brandForm.enabled })
      });
      alert('برند اضافه شد');
      setShowBrandForm(false);
      setBrandForm({ name: '', enabled: true });
      loadBrands();
    } catch (err) { alert('خطا'); }
  };

  const handleDeleteBrand = async (id) => {
    if (!window.confirm('حذف شود؟')) return;
    try {
      await fetch(`http://localhost:5003/api/brands/${id}`, { method: 'DELETE' });
      loadBrands();
    } catch (err) { alert('خطا'); }
  };

  // ========== توابع تگ‌ها ==========
  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!tagForm) return alert('نام تگ الزامی است');
    try {
      await fetch('http://localhost:5003/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagForm })
      });
      alert('تگ اضافه شد');
      setShowTagForm(false);
      setTagForm('');
      loadTags();
    } catch (err) { alert('خطا'); }
  };

  const handleDeleteTag = async (name) => {
    if (!window.confirm('حذف شود؟')) return;
    try {
      await fetch(`http://localhost:5003/api/tags/${name}`, { method: 'DELETE' });
      loadTags();
    } catch (err) { alert('خطا'); }
  };

  // ========== توابع سفارشات ==========
  const handleChangeQuoteStatus = async (id, newStatus) => {
    if (!window.confirm(`وضعیت به "${newStatus}" تغییر کند؟`)) return;
    try {
      await fetch(`http://localhost:5003/api/quotes/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      loadQuotes();
    } catch (err) { alert('خطا'); }
  };

  // ========== توابع همکاران ==========
  const handleApprovePartner = async (id) => {
    try {
      await fetch(`http://localhost:5003/api/partners/${id}/approve`, { method: 'PUT' });
      loadPartners();
    } catch (err) { alert('خطا'); }
  };

  const handleRejectPartner = async (id) => {
    try {
      await fetch(`http://localhost:5003/api/partners/${id}/reject`, { method: 'PUT' });
      loadPartners();
    } catch (err) { alert('خطا'); }
  };

  // ========== توابع وبلاگ ==========
  const handleDeleteBlog = async (id) => {
    if (!window.confirm('حذف شود؟')) return;
    try {
      await fetch(`http://localhost:5003/api/blog/${id}`, { method: 'DELETE' });
      loadBlogPosts();
    } catch (err) { alert('خطا'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('aseman_employee_auth');
    navigate('/login');
  };

  // ========== منوها ==========
  const menuItems = [
    { key: 'dashboard', label: '📊 داشبورد', permission: null },
    { key: 'products', label: '🧱 محصولات', permission: 'view_products' },
    { key: 'brands', label: '🏭 کارخانه‌ها', permission: 'manage_brands' },
    { key: 'tags', label: '🔖 تگ‌ها', permission: 'manage_tags' },
    { key: 'quotes', label: '📋 سفارشات', permission: 'view_quotes' },
    { key: 'create-quote', label: '📝 ثبت سفارش', permission: 'create_quote' },
    { key: 'customers', label: '👥 مشتریان', permission: 'view_customers' },
    { key: 'partners', label: '🤝 درخواست همکاری', permission: 'manage_partners' },
    { key: 'blog', label: '📝 وبلاگ', permission: 'manage_blog' },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  if (loading) {
    return <div className="employee-loading">در حال بارگذاری...</div>;
  }

  // ========== رندر بخش‌ها ==========
  const renderDashboard = () => (
    <div>
      <div className="welcome-card">
        <h2>👋 خوش آمدید، {employee?.name}</h2>
        <p>نقش: {employee?.role_name === 'manager' ? 'مدیر' : employee?.role_name === 'supervisor' ? 'سرپرست' : 'کارشناس'}</p>
        <p>دپارتمان: {employee?.department === 'sales' ? 'فروش' : employee?.department === 'executive' ? 'اجرایی' : employee?.department}</p>
      </div>
      
      <div className="stats-grid">
        {hasPermission('view_products') && (
          <div className="stat-card">
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">تعداد محصولات</div>
          </div>
        )}
        {hasPermission('view_quotes') && (
          <div className="stat-card">
            <div className="stat-value">{quotes.length}</div>
            <div className="stat-label">تعداد سفارشات</div>
          </div>
        )}
        {hasPermission('view_customers') && (
          <div className="stat-card">
            <div className="stat-value">{customers.length}</div>
            <div className="stat-label">تعداد مشتریان</div>
          </div>
        )}
      </div>
      
      <div className="permissions-info">
        <h3>دسترسی‌های شما:</h3>
        <div className="permissions-badges">
          {permissions.map(perm => {
            const names = {
              'view_dashboard': 'مشاهده داشبورد',
              'view_products': 'مشاهده محصولات',
              'add_product': 'افزودن محصول',
              'edit_product': 'ویرایش محصول',
              'delete_product': 'حذف محصول',
              'manage_brands': 'مدیریت برندها',
              'manage_tags': 'مدیریت تگ‌ها',
              'view_quotes': 'مشاهده سفارشات',
              'create_quote': 'ایجاد سفارش',
              'manage_quotes': 'مدیریت سفارشات',
              'view_customers': 'مشاهده مشتریان',
              'manage_partners': 'مدیریت همکاران',
              'manage_blog': 'مدیریت وبلاگ',
            };
            return <span key={perm} className="perm-badge">{names[perm] || perm}</span>;
          })}
        </div>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div>
      <div className="section-header">
        <h2>🧱 لیست محصولات</h2>
        {hasPermission('add_product') && (
          <button className="btn-primary" onClick={() => setShowProductForm(true)}>➕ افزودن محصول</button>
        )}
      </div>

      {showProductForm && (
        <div className="form-modal">
          <div className="modal-content">
            <h3>محصول جدید</h3>
            <form onSubmit={handleAddProduct}>
              <input type="text" placeholder="نام محصول *" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
              <input type="number" placeholder="قیمت (تومان) *" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required />
              <input type="number" placeholder="قیمت همکار" value={productForm.partnerPrice} onChange={e => setProductForm({...productForm, partnerPrice: e.target.value})} />
              <input type="number" placeholder="موجودی" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} />
              <input type="text" placeholder="دسته‌بندی" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} />
              <input type="text" placeholder="شرکت سازنده" value={productForm.manufacturer} onChange={e => setProductForm({...productForm, manufacturer: e.target.value})} />
              <div className="form-actions">
                <button type="button" onClick={() => setShowProductForm(false)}>انصراف</button>
                <button type="submit">ذخیره</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>نام</th><th>قیمت</th><th>قیمت همکار</th><th>موجودی</th><th>عملیات</th></tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.price_public?.toLocaleString()} تومان</td>
                <td>{p.price_partner?.toLocaleString()} تومان</td>
                <td>{p.stock_quantity || 0}</td>
                <td className="table-actions">
                  {hasPermission('edit_product') && <button className="edit-btn">✏️</button>}
                  {hasPermission('delete_product') && <button className="delete-btn" onClick={() => handleDeleteProduct(p.id)}>🗑️</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBrands = () => (
    <div>
      <div className="section-header">
        <h2>🏭 مدیریت کارخانه‌ها</h2>
        <button className="btn-primary" onClick={() => setShowBrandForm(true)}>➕ افزودن کارخانه</button>
      </div>

      {showBrandForm && (
        <div className="form-modal">
          <div className="modal-content">
            <h3>کارخانه جدید</h3>
            <form onSubmit={handleAddBrand}>
              <input type="text" placeholder="نام کارخانه *" value={brandForm.name} onChange={e => setBrandForm({...brandForm, name: e.target.value})} required />
              <label><input type="checkbox" checked={brandForm.enabled} onChange={e => setBrandForm({...brandForm, enabled: e.target.checked})} /> فعال</label>
              <div className="form-actions">
                <button type="button" onClick={() => setShowBrandForm(false)}>انصراف</button>
                <button type="submit">ذخیره</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead><tr><th>نام</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>
            {brands.map(b => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.enabled ? '✅ فعال' : '❌ غیرفعال'}</td>
                <td><button className="delete-btn" onClick={() => handleDeleteBrand(b.id)}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTags = () => (
    <div>
      <div className="section-header">
        <h2>🔖 مدیریت تگ‌ها</h2>
        <button className="btn-primary" onClick={() => setShowTagForm(true)}>➕ افزودن تگ</button>
      </div>

      {showTagForm && (
        <div className="form-modal">
          <div className="modal-content">
            <h3>تگ جدید</h3>
            <form onSubmit={handleAddTag}>
              <input type="text" placeholder="نام تگ *" value={tagForm} onChange={e => setTagForm(e.target.value)} required />
              <div className="form-actions">
                <button type="button" onClick={() => setShowTagForm(false)}>انصراف</button>
                <button type="submit">ذخیره</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="tags-list">
        {tags.map(t => (
          <div key={t.id} className="tag-item">
            <span>{t.name}</span>
            <button className="delete-small" onClick={() => handleDeleteTag(t.name)}>✖</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuotes = () => (
    <div>
      <h2>📋 مدیریت سفارشات</h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>شماره</th><th>تاریخ</th><th>مبلغ کل</th><th>وضعیت</th><th>عملیات</th></tr>
          </thead>
          <tbody>
            {quotes.map(q => (
              <tr key={q.id}>
                <td>{q.quote_number}</td>
                <td>{new Date(q.created_at).toLocaleDateString('fa-IR')}</td>
                <td>{q.total_amount?.toLocaleString()} تومان</td>
                <td>
                  {hasPermission('manage_quotes') ? (
                    <select value={q.status} onChange={e => handleChangeQuoteStatus(q.id, e.target.value)}>
                      <option value="submitted">ثبت شده</option>
                      <option value="reviewing">در حال بررسی</option>
                      <option value="issued">صادر شده</option>
                      <option value="preparing">در حال آماده‌سازی</option>
                      <option value="completed">تکمیل شده</option>
                      <option value="cancelled">لغو شده</option>
                    </select>
                  ) : (
                    <span className={`status-${q.status}`}>{q.status}</span>
                  )}
                </td>
                <td>{hasPermission('manage_quotes') && <button className="edit-btn">ویرایش</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCreateQuote = () => (
    <div>
      <h2>📝 ثبت سفارش جدید</h2>
      <div className="create-quote-form">
        <div className="form-group">
          <label>انتخاب مشتری</label>
          <select>
            <option>انتخاب کنید...</option>
            {customers.map(c => <option key={c.id}>{c.name} - {c.mobile}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>انتخاب محصول</label>
          <select>
            <option>انتخاب کنید...</option>
            {products.map(p => <option key={p.id}>{p.name} - {p.price_public?.toLocaleString()} تومان</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>تعداد (متر مربع)</label>
          <input type="number" placeholder="مقدار" />
        </div>
        <button className="btn-primary">➕ افزودن به سفارش</button>
        <hr />
        <button className="btn-success">💾 ثبت نهایی سفارش</button>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div>
      <h2>👥 لیست مشتریان</h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>نام</th><th>شماره تماس</th><th>نوع</th><th>وضعیت</th><th>تاریخ عضویت</th></tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.mobile}</td>
                <td>{c.type === 'customer' ? 'مشتری عادی' : 'همکار'}</td>
                <td>{c.is_active ? '✅ فعال' : '❌ غیرفعال'}</td>
                <td>{new Date(c.created_at).toLocaleDateString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPartners = () => (
    <div>
      <h2>🤝 درخواست‌های همکاری</h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>نام</th><th>شرکت</th><th>شماره تماس</th><th>تاریخ ثبت</th><th>عملیات</th></tr>
          </thead>
          <tbody>
            {partners.map(p => (
              <tr key={p.id}>
                <td>{p.user_name}</td>
                <td>{p.company_name}</td>
                <td>{p.user_mobile}</td>
                <td>{new Date(p.created_at).toLocaleDateString('fa-IR')}</td>
                <td className="table-actions">
                  <button className="approve-btn" onClick={() => handleApprovePartner(p.id)}>✅ تأیید</button>
                  <button className="reject-btn" onClick={() => handleRejectPartner(p.id)}>❌ رد</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBlog = () => (
    <div>
      <h2>📝 مدیریت وبلاگ</h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>عنوان</th><th>اسلاگ</th><th>تاریخ</th><th>وضعیت</th><th>عملیات</th></tr>
          </thead>
          <tbody>
            {blogPosts.map(post => (
              <tr key={post.id}>
                <td>{post.title}</td>
                <td>{post.slug}</td>
                <td>{new Date(post.created_at).toLocaleDateString('fa-IR')}</td>
                <td>{post.is_published ? '✅ منتشر شده' : '📝 پیش‌نویس'}</td>
                <td><button className="delete-btn" onClick={() => handleDeleteBlog(post.id)}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ========== رندر اصلی ==========
  return (
    <div className="employee-layout">
      <aside className={`employee-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
          {sidebarCollapsed ? '☰' : '◀'}
        </button>
        <div className="sidebar-header">
          <h2>پنل کارمند</h2>
          <p>{employee?.name}</p>
        </div>
        <nav className="sidebar-nav">
          {visibleMenuItems.map(item => (
            <button
              key={item.key}
              className={activeMenu === item.key ? 'active' : ''}
              onClick={() => setActiveMenu(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">🚪 خروج</button>
        </div>
      </aside>

      <main className="employee-main">
        <header className="main-header-bar">
          <h1>
            {activeMenu === 'dashboard' && 'داشبورد'}
            {activeMenu === 'products' && 'مدیریت محصولات'}
            {activeMenu === 'brands' && 'مدیریت کارخانه‌ها'}
            {activeMenu === 'tags' && 'مدیریت تگ‌ها'}
            {activeMenu === 'quotes' && 'مدیریت سفارشات'}
            {activeMenu === 'create-quote' && 'ثبت سفارش جدید'}
            {activeMenu === 'customers' && 'لیست مشتریان'}
            {activeMenu === 'partners' && 'درخواست‌های همکاری'}
            {activeMenu === 'blog' && 'مدیریت وبلاگ'}
          </h1>
          <div className="header-actions">
            <span>👤 {employee?.role_name === 'manager' ? 'مدیر' : employee?.role_name === 'supervisor' ? 'سرپرست' : 'کارشناس'}</span>
          </div>
        </header>

        <div className="main-content">
          {activeMenu === 'dashboard' && renderDashboard()}
          {activeMenu === 'products' && renderProducts()}
          {activeMenu === 'brands' && renderBrands()}
          {activeMenu === 'tags' && renderTags()}
          {activeMenu === 'quotes' && renderQuotes()}
          {activeMenu === 'create-quote' && renderCreateQuote()}
          {activeMenu === 'customers' && renderCustomers()}
          {activeMenu === 'partners' && renderPartners()}
          {activeMenu === 'blog' && renderBlog()}
        </div>
      </main>
    </div>
  );
};

export default EmployeePanel;
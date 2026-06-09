// frontend/src/pages/CreateQuotePage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateQuotePage.css';

const CreateQuotePage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  
  // اطلاعات مشتری انتخاب شده
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  
  // اطلاعات فاکتور
  const [quoteInfo, setQuoteInfo] = useState({
    issue_date: new Date().toISOString().split('T')[0],
    expires_at: '',
    payment_terms: '',
    credit_duration: '',
    delivery_location: '',
    prepayment_amount: 0,
    discount_amount: 0,
    tax_amount: 0,
    notes: ''
  });
  
  // آیتم‌های محصول
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    // چک کردن نوع کاربر
    const adminAuth = localStorage.getItem('aseman_admin_auth');
    const employeeAuth = localStorage.getItem('aseman_employee_auth');
    
    if (adminAuth) {
      setUserType('admin');
      setUser(JSON.parse(adminAuth));
    } else if (employeeAuth) {
      setUserType('employee');
      setUser(JSON.parse(employeeAuth));
    } else {
      navigate('/login');
      return;
    }
    
    loadProducts();
    loadCustomers();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      let users = [];
      if (Array.isArray(data)) users = data;
      else if (data.data && Array.isArray(data.data)) users = data.data;
      else users = [];
      
      // فقط مشتریان عادی و همکاران (به جز ادمین)
      const customersList = users.filter(u => u.type === 'customer' || u.type === 'partner');
      setCustomers(customersList);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCustomerChange = (e) => {
    const customerId = parseInt(e.target.value);
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
  };

  const handleQuoteChange = (e) => {
    setQuoteInfo({
      ...quoteInfo,
      [e.target.name]: e.target.value
    });
  };

  const addItem = (product) => {
    const existing = items.find(i => i.product_id === product.id);
    
    // محاسبه قیمت (اگر همکار است از قیمت همکار استفاده کن)
    let price = product.price_public || product.price || 0;
    if (selectedCustomer?.type === 'partner' && product.price_partner) {
      price = product.price_partner;
    }
    
    if (existing) {
      setItems(items.map(i => 
        i.product_id === product.id 
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setItems([
        ...items,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          price: price,
          unit: 'متر مربع',
          discount_percent: 0,
          tax_percent: 0
        }
      ]);
    }
    setShowProductModal(false);
    setProductSearch('');
  };

  const removeItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = quoteInfo.discount_amount || 0;
    const tax = quoteInfo.tax_amount || 0;
    return subtotal - discount + tax;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer) {
      alert('لطفاً مشتری را انتخاب کنید');
      return;
    }
    
    if (items.length === 0) {
      alert('لطفاً حداقل یک محصول اضافه کنید');
      return;
    }
    
    setLoading(true);
    
    try {
      const quoteData = {
        partner_id: selectedCustomer.type === 'partner' ? selectedCustomer.id : null,
        customer_id: selectedCustomer.type === 'customer' ? selectedCustomer.id : null,
        customer_name: selectedCustomer.name,
        customer_mobile: selectedCustomer.mobile,
        customer_email: selectedCustomer.email || '',
        ...quoteInfo,
        items: items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          unit: item.unit,
          discount_percent: item.discount_percent,
          tax_percent: item.tax_percent
        })),
        created_by: user?.id || null
      };
      
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ سفارش با موفقیت ثبت شد.\nشماره سفارش: ${data.data.quote_number}\nمبلغ کل: ${data.data.total_amount.toLocaleString()} تومان`);
        
        // هدایت به صفحه لیست سفارش‌ها
        if (userType === 'admin') {
          navigate('/admin/orders-list');
        } else {
          navigate('/employee/quotes');
        }
      } else {
        alert('خطا: ' + (data.error || 'مشخص نیست'));
      }
    } catch (error) {
      console.error('Error creating quote:', error);
      alert('خطا در ایجاد سفارش');
    } finally {
      setLoading(false);
    }
  };

  // فیلتر مشتریان برای جستجو
  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.mobile?.includes(customerSearchTerm)
  );

  return (
    <div className="create-quote-page">
      <div className="container">
        <h1>ثبت سفارش جدید</h1>
        
        <form onSubmit={handleSubmit}>
          {/* انتخاب مشتری */}
          <div className="form-section">
            <h2>👤 انتخاب مشتری</h2>
            <div className="customer-selection">
              {!selectedCustomer ? (
                <div className="customer-search-box">
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      placeholder="جستجوی مشتری با نام یا شماره موبایل..."
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      className="customer-search-input"
                      autoFocus
                    />
                    <button 
                      type="button"
                      className="search-customer-btn"
                      onClick={() => setShowCustomerSearch(true)}
                    >
                      🔍 جستجو
                    </button>
                  </div>
                  
                  {customerSearchTerm && (
                    <div className="customer-results">
                      {loadingCustomers ? (
                        <p>در حال بارگذاری...</p>
                      ) : filteredCustomers.length === 0 ? (
                        <p className="no-results">مشتریی یافت نشد</p>
                      ) : (
                        filteredCustomers.map(customer => (
                          <div 
                            key={customer.id}
                            className="customer-result-item"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerSearchTerm('');
                            }}
                          >
                            <div className="customer-info">
                              <strong>{customer.name}</strong>
                              <span className="customer-mobile">{customer.mobile}</span>
                              <span className={`customer-type ${customer.type}`}>
                                {customer.type === 'customer' ? 'مشتری عادی' : 'همکار'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="selected-customer-card">
                  <div className="selected-customer-info">
                    <span className="customer-icon">👤</span>
                    <div className="customer-details">
                      <strong>{selectedCustomer.name}</strong>
                      <span>{selectedCustomer.mobile}</span>
                      <span className={`customer-type ${selectedCustomer.type}`}>
                        {selectedCustomer.type === 'customer' ? 'مشتری عادی' : 'همکار'}
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="change-customer-btn"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    ✖ تغییر مشتری
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* اطلاعات فاکتور */}
          <div className="form-section">
            <h2>📋 اطلاعات سفارش</h2>
            <div className="form-row">
              <div className="form-group">
                <label>تاریخ صدور</label>
                <input
                  type="date"
                  name="issue_date"
                  value={quoteInfo.issue_date}
                  onChange={handleQuoteChange}
                />
              </div>
              <div className="form-group">
                <label>تاریخ اعتبار</label>
                <input
                  type="date"
                  name="expires_at"
                  value={quoteInfo.expires_at}
                  onChange={handleQuoteChange}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>شرایط فروش</label>
                <select name="payment_terms" value={quoteInfo.payment_terms} onChange={handleQuoteChange}>
                  <option value="">انتخاب کنید</option>
                  <option value="نقدی">نقدی</option>
                  <option value="غیرنقدی">غیرنقدی</option>
                  <option value="اقساط">اقساط</option>
                </select>
              </div>
              <div className="form-group">
                <label>مدت اعتبار</label>
                <input
                  type="text"
                  name="credit_duration"
                  placeholder="مثال: 30 روز"
                  value={quoteInfo.credit_duration}
                  onChange={handleQuoteChange}
                />
              </div>
            </div>
            <div className="form-group">
              <label>محل تحویل</label>
              <input
                type="text"
                name="delivery_location"
                value={quoteInfo.delivery_location}
                onChange={handleQuoteChange}
              />
            </div>
          </div>
          
          {/* آیتم‌های محصول */}
          <div className="form-section">
            <h2>🛒 محصولات</h2>
            <button type="button" className="btn-add-product" onClick={() => setShowProductModal(true)}>
              + افزودن محصول
            </button>
            
            {items.length > 0 && (
              <div className="items-table">
                <table className="items-table-inner">
                  <thead>
                    <tr>
                      <th>ردیف</th>
                      <th>نام محصول</th>
                      <th>تعداد</th>
                      <th>قیمت واحد</th>
                      <th>واحد</th>
                      <th>تخفیف %</th>
                      <th>مالیات %</th>
                      <th>جمع</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{item.product_name}</td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                            style={{ width: '80px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', parseInt(e.target.value) || 0)}
                            style={{ width: '120px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            style={{ width: '100px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.discount_percent}
                            onChange={(e) => updateItem(index, 'discount_percent', parseInt(e.target.value) || 0)}
                            style={{ width: '70px' }}
                            min="0"
                            max="100"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.tax_percent}
                            onChange={(e) => updateItem(index, 'tax_percent', parseInt(e.target.value) || 0)}
                            style={{ width: '70px' }}
                            min="0"
                          />
                        </td>
                        <td>{(item.quantity * item.price).toLocaleString()} تومان</td>
                        <td>
                          <button type="button" className="btn-remove" onClick={() => removeItem(index)}>✖</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'left' }}>جمع کل:</td>
                      <td>{calculateSubtotal().toLocaleString()} تومان</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          
          {/* مبالغ نهایی */}
          <div className="form-section">
            <h2>💰 مبالغ نهایی</h2>
            <div className="form-row">
              <div className="form-group">
                <label>تخفیف کل (تومان)</label>
                <input
                  type="number"
                  name="discount_amount"
                  value={quoteInfo.discount_amount}
                  onChange={handleQuoteChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>مالیات (تومان)</label>
                <input
                  type="number"
                  name="tax_amount"
                  value={quoteInfo.tax_amount}
                  onChange={handleQuoteChange}
                  min="0"
                />
              </div>
            </div>
            <div className="form-group">
              <label>پیش‌پرداخت (تومان)</label>
              <input
                type="number"
                name="prepayment_amount"
                value={quoteInfo.prepayment_amount}
                onChange={handleQuoteChange}
                min="0"
              />
            </div>
            <div className="total-amount">
              <span>مبلغ قابل پرداخت:</span>
              <strong>{calculateTotal().toLocaleString()} تومان</strong>
            </div>
          </div>
          
          {/* توضیحات */}
          <div className="form-section">
            <h2>📝 توضیحات اضافه</h2>
            <textarea
              name="notes"
              value={quoteInfo.notes}
              onChange={handleQuoteChange}
              rows="4"
              placeholder="توضیحات اضافی..."
            />
          </div>
          
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
              انصراف
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !selectedCustomer}>
              {loading ? 'در حال ثبت...' : '📝 ثبت سفارش'}
            </button>
          </div>
        </form>
        
        {/* مودال انتخاب محصول */}
        {showProductModal && (
          <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>انتخاب محصول</h3>
                <button className="modal-close" onClick={() => setShowProductModal(false)}>✖</button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  placeholder="جستجوی محصول..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="product-search"
                />
                <div className="product-list">
                  {products
                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .map(product => (
                      <div key={product.id} className="product-item" onClick={() => addItem(product)}>
                        <div className="product-name">{product.name}</div>
                        <div className="product-code">{product.sku}</div>
                        <div className="product-price">
                          {selectedCustomer?.type === 'partner' && product.price_partner
                            ? product.price_partner.toLocaleString()
                            : (product.price_public || product.price || 0).toLocaleString()} تومان
                        </div>
                      </div>
                    ))}
                  {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                    <div className="no-products">محصولی یافت نشد</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateQuotePage;
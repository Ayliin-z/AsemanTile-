import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CustomerPanel.css';

const PartnerPanel = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const navigate = useNavigate();
  const customer = JSON.parse(localStorage.getItem('aseman_customer_auth') || '{}');

  // state برای محصولات و سفارش‌ها
  const [products, setProducts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // state مودال درخواست
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [experts, setExperts] = useState([]);
  const [loadingExperts, setLoadingExperts] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);



  const [partnerId, setPartnerId] = useState(null);

  useEffect(() => {
    const fetchPartnerId = async () => {
      try {
        const res = await fetch(`http://api.asemantile.com/api/partners/user/${customer.id}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPartnerId(data.data.id); // این id مربوط به جدول partners است
        }
      } catch (err) {
        console.error('خطا در دریافت partner_id:', err);
      }
    };
    
    if (customer?.id) {
      fetchPartnerId();
    }
  }, [customer?.id]);


  // دریافت محصولات
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('http://api.asemantile.com/api/products');
      const data = await res.json();
      if (data.success) {
        // فقط محصولاتی که مخاطب آن 'partners' یا 'all' باشد
        const partnerProducts = data.data.filter(
          p => p.audience === 'partners' || p.audience === 'all'
        );
        setProducts(partnerProducts);
      }
    } catch (err) { console.error(err); }
    finally { setLoadingProducts(false); }
  };
  const loadWishlist = async () => {
    setLoadingWishlist(true);
    try {
      const res = await fetch(`http://api.asemantile.com/api/wishlist/${customer.id}`);
      const data = await res.json();
      if (data.success) setWishlist(data.data);
    } catch (err) { console.error(err); }
    finally { setLoadingWishlist(false); }
  };

  // دریافت پیش‌فاکتورهای همکار
  const loadQuotes = async () => {
    if (!partnerId) return;
    setLoadingQuotes(true);
    try {
      const res = await fetch(`http://api.asemantile.com/api/quotes?partner_id=${partnerId}`);
      const data = await res.json();
      if (data.success) setQuotes(data.data);
    } catch (err) { console.error(err); }
    finally { setLoadingQuotes(false); }
  };

  const loadExperts = async () => {
    setLoadingExperts(true);
    try {
      const res = await fetch('http://api.asemantile.com/api/experts');
      const data = await res.json();
      if (data.success) setExperts(data.data);
    } catch (err) { console.error(err); }
    finally { setLoadingExperts(false); }
  };

  useEffect(() => {
    if (activeMenu === 'products') loadProducts();
    if (activeMenu === 'orders') loadQuotes();
    if (activeMenu === 'experts') loadExperts();
    if (activeMenu === 'wishlist') loadWishlist(); // <-- این خط رو اضافه کن

  }, [activeMenu]);

  useEffect(() => {
    const fetchPartnerId = async () => {
      try {
        const res = await fetch(`http://api.asemantile.com/api/partners/user/${customer.id}`);
        const data = await res.json();
        if (data.success) {
          setPartnerId(data.data.id); // این id مربوط به جدول partners است
        }
      } catch (err) { console.error(err); }
    };
    if (customer?.id) fetchPartnerId();
  }, [customer?.id]);

  // ثبت درخواست
  const handleSubmitRequest = async () => {
    if (!selectedProduct || requestQuantity < 1) return;
    if (!partnerId) {
      alert('اطلاعات همکار شما هنوز کامل نشده است. لطفاً دقایقی دیگر تلاش کنید.');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // تعیین قیمت – اولویت با partnerprice، سپس price، و در نهایت صفر
      const productPrice = Number(selectedProduct.partnerprice) || Number(selectedProduct.price) || 0;
      
      console.log('قیمت محصول:', productPrice); // برای بررسی در کنسول
      
      const res = await fetch('http://api.asemantile.com/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: Number(partnerId),
          items: [{
            product_id: Number(selectedProduct.id),
            product_name: String(selectedProduct.name || 'محصول'),
            quantity: Number(requestQuantity),
            price: productPrice // حالا این مقدار حتماً یک عدد است
          }]
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('درخواست شما با موفقیت ثبت شد.');
        setShowRequestModal(false);
        setSelectedProduct(null);
        setRequestQuantity(1);
        if (activeMenu === 'orders') loadQuotes();
      } else {
        alert('خطا: ' + (data.error || 'خطای ناشناخته'));
      }
    } catch (err) {
      alert('خطای شبکه');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('aseman_customer_auth');
    navigate('/login');
  };

  const translateStatus = (status) => {
    const map = {
      submitted: 'ثبت شده',
      reviewing: 'در حال بررسی',
      issued: 'صادر شده',
      preparing: 'در حال آماده‌سازی',
      completed: 'تکمیل شده',
      cancelled: 'لغو شده'
    };
    return map[status] || status;
  };

  return (
    <div className="customer-layout">
      <aside className="customer-sidebar">
        <div className="customer-profile">
          <div className="avatar">🤝</div>
          <h3>{customer.name || 'همکار'}</h3>
          <p>{customer.email || ''}</p>
          <p className="partner-badge">همکار</p>
        </div>
        <nav className="customer-nav">
          <button className={activeMenu === 'dashboard' ? 'active' : ''} onClick={() => setActiveMenu('dashboard')}>📊 پیشخوان</button>
          <button className={activeMenu === 'orders' ? 'active' : ''} onClick={() => setActiveMenu('orders')}>📦 سفارش‌های من</button>
          <button className={activeMenu === 'products' ? 'active' : ''} onClick={() => setActiveMenu('products')}>🛒 درخواست محصول</button>
          <button className={activeMenu === 'account' ? 'active' : ''} onClick={() => setActiveMenu('account')}>⚙️ جزئیات حساب</button>
          <button className={activeMenu === 'wishlist' ? 'active' : ''} onClick={() => setActiveMenu('wishlist')}>❤️ علاقه‌مندی‌ها</button>
          <button className={activeMenu === 'experts' ? 'active' : ''} onClick={() => setActiveMenu('experts')}>📞 ارتباط با کارشناسان</button>
          <button onClick={handleLogout} className="logout-btn">🚪 خروج</button>
        </nav>
      </aside>

      <main className="customer-main">
        <header className="customer-header">
          <h1>
            {activeMenu === 'dashboard' && 'پیشخوان همکار'}
            {activeMenu === 'orders' && 'سفارش‌های من'}
            {activeMenu === 'products' && 'درخواست محصول'}
            {activeMenu === 'account' && 'جزئیات حساب'}
            {activeMenu === 'wishlist' && 'علاقه‌مندی‌ها'}
            {activeMenu === 'experts' && 'ارتباط با کارشناسان ما'}
          </h1>
        </header>

        <div className="customer-content">
          {activeMenu === 'dashboard' && (
            <div className="welcome-card">
              <h2>خوش آمدید همکار گرامی، {customer.name || 'کاربر'}!</h2>
              <p>شما می‌توانید از طریق بخش «درخواست محصول» درخواست خود را ثبت کنید.</p>
              <div className="quick-links">
                <button className="quick-link" onClick={() => setActiveMenu('products')}>🛒 ثبت درخواست جدید</button>
              </div>
            </div>
          )}

          {activeMenu === 'orders' && (
            <div>
              <h2>سفارش‌های من</h2>
              {loadingQuotes ? <p>در حال بارگذاری...</p> : (
                quotes.length === 0 ? <p>هیچ سفارشی ثبت نشده است.</p> :
                <div className="table-container">
                  <table className="products-table" style={{width:'100%'}}>
                    <thead>
                      <tr>
                        <th>شماره</th>
                        <th>تاریخ</th>
                        <th>مبلغ کل (تومان)</th>
                        <th>وضعیت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map(q => (
                        <tr key={q.id}>
                          <td>{q.quote_number}</td>
                          <td>{new Date(q.created_at).toLocaleDateString('fa-IR')}</td>
                          <td>{q.total_amount?.toLocaleString()}</td>
                          <td><span className={`status-badge status-${q.status}`}>{translateStatus(q.status)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeMenu === 'products' && (
            <div>
              <h2>محصولات قابل درخواست</h2>
              {loadingProducts ? <p>در حال بارگذاری...</p> : (
                <div className="products-grid" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:'15px'}}>
                  {products.map(product => (
                    <div key={product.id} className="product-card" style={{border:'1px solid #ddd', padding:'10px', borderRadius:'8px'}}>
                      <h4>{product.name}</h4>
                      <p>قیمت همکار: {product.partnerprice?.toLocaleString() || product.price?.toLocaleString()} تومان</p>
                      <button
                        className="btn-primary"
                        onClick={() => { setSelectedProduct(product); setShowRequestModal(true); }}
                      >
                        درخواست
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeMenu === 'account' && (
            <div className="account-details">
              <h3>اطلاعات حساب</h3>
              <div className="detail-row"><span>نام:</span> {customer.name || '-'}</div>
              <div className="detail-row"><span>موبایل:</span> {customer.mobile || '-'}</div>
              <div className="detail-row"><span>ایمیل:</span> {customer.email || '-'}</div>
            </div>
          )}

          {activeMenu === 'wishlist' && (
            <div>
              <h2>❤️ علاقه‌مندی‌های من</h2>
              {loadingWishlist ? <p>در حال بارگذاری...</p> : (
                wishlist.length === 0 ? <p>هیچ محصولی به لیست علاقه‌مندی‌ها اضافه نشده است.</p> :
                <div className="products-grid" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:'15px'}}>
                  {wishlist.map(item => (
                    <div key={item.id} className="product-card" style={{border:'1px solid #ddd', padding:'10px', borderRadius:'8px'}}>
                      <img src={item.images?.length > 0 ? item.images[0] : '/images/placeholder.jpg'} alt={item.name} style={{width:'100%', height:150, objectFit:'cover', borderRadius:8}} />
                      <h4 style={{marginTop:10}}>{item.name}</h4>
                      <p style={{color:'#1c7385', fontWeight:'bold'}}>{Number(item.price_public).toLocaleString()} تومان</p>
                      <button
                        className="btn-primary"
                        style={{marginTop:5, width:'100%'}}
                        onClick={async () => {
                          // حذف از علاقه‌مندی‌ها
                          await fetch(`http://api.asemantile.com/api/wishlist/${item.id}`, { method: 'DELETE' });
                          loadWishlist(); // رفرش لیست
                        }}
                      >
                        🗑️ حذف
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeMenu === 'experts' && (
            <div>
              <h2>کارشناسان ما</h2>
              {loadingExperts ? <p>در حال بارگذاری...</p> : (
                experts.length === 0 ? <p>هیچ کارشناسی ثبت نشده است.</p> :
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginTop: 15 }}>
                  {experts.map(expert => (
                    <div key={expert.id} style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 20, background: '#fff', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      {expert.photo && <img src={expert.photo} alt={expert.name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 12, border: '2px solid #1c7385' }} />}
                      <h3 style={{ margin: '0 0 8px' }}>{expert.name}</h3>
                      <p style={{ direction: 'ltr', margin: '5px 0', color: '#555' }}>{expert.phone}</p>
                      <a href={`tel:${expert.phone}`} style={{ display: 'inline-block', padding: '8px 20px', background: '#1c7385', color: 'white', borderRadius: 30, textDecoration: 'none', fontWeight: 'bold', marginTop: 10 }}>📞 تماس</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showRequestModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', padding: 20, borderRadius: 12, maxWidth: 400, margin: 'auto', marginTop: '10%' }}>
            <h3>درخواست محصول</h3>
            <p><strong>{selectedProduct.name}</strong></p>
            <p>قیمت واحد: {(Number(selectedProduct.partnerprice) || Number(selectedProduct.price) || 0).toLocaleString()} تومان</p>
            <div style={{ margin: '15px 0' }}>
              <label>تعداد (متر مربع):</label>
              <input
                type="number"
                min="1"
                value={requestQuantity}
                onChange={e => setRequestQuantity(parseInt(e.target.value) || 1)}
                style={{ width: '100%', padding: 8, marginTop: 5 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowRequestModal(false)}>انصراف</button>
              <button className="btn-primary" onClick={handleSubmitRequest} disabled={submitting}>
                {submitting ? 'در حال ثبت...' : 'ثبت درخواست'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerPanel;
// frontend/src/components/layout/CartDropdown.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './CartDropdown.css';

const CartDropdown = () => {
  const [cart, setCart] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
    checkLoginStatus();
    window.addEventListener('storage', loadCart);
    return () => window.removeEventListener('storage', loadCart);
  }, []);

  const checkLoginStatus = () => {
    const adminAuth = localStorage.getItem('aseman_admin_auth');
    const employeeAuth = localStorage.getItem('aseman_employee_auth');
    const customerAuth = localStorage.getItem('aseman_customer_auth');
    
    setIsLoggedIn(!!(adminAuth || employeeAuth || customerAuth));
    
    // دریافت اطلاعات کاربر جاری
    if (customerAuth) {
      try {
        const user = JSON.parse(customerAuth);
        setCurrentUser(user);
      } catch(e) { setCurrentUser(null); }
    } else if (adminAuth) {
      try {
        const user = JSON.parse(adminAuth);
        setCurrentUser({ ...user, type: 'admin' });
      } catch(e) { setCurrentUser(null); }
    } else if (employeeAuth) {
      try {
        const user = JSON.parse(employeeAuth);
        setCurrentUser({ ...user, type: 'employee' });
      } catch(e) { setCurrentUser(null); }
    } else {
      setCurrentUser(null);
    }
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem('aseman_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch(e) { setCart([]); }
    } else {
      setCart([]);
    }
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.id !== productId);
    setCart(newCart);
    localStorage.setItem('aseman_cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('storage'));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    const newCart = cart.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    setCart(newCart);
    localStorage.setItem('aseman_cart', JSON.stringify(newCart));
    window.dispatchEvent(new Event('storage'));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const hasZeroPriceItems = () => {
    return cart.some(item => item.price === 0 || !item.price);
  };

  const openCheckoutModal = () => {
    if (!isLoggedIn) {
      alert('لطفاً ابتدا وارد حساب کاربری خود شوید');
      navigate('/login');
      setIsOpen(false);
      return;
    }
    
    if (cart.length === 0) {
      alert('سبد خرید خالی است');
      return;
    }
    
    setShowCheckoutModal(true);
    setIsOpen(false);
  };

  // تابع ثبت درخواست اولیه
  const submitInitialRequest = async () => {
    setSubmitting(true);
    
    try {
      // تعیین نوع کاربر و دریافت اطلاعات
      let partnerId = null;
      let customerName = currentUser?.name || '';
      let customerMobile = currentUser?.mobile || '';
      
      const customerAuth = localStorage.getItem('aseman_customer_auth');
      if (customerAuth) {
        const user = JSON.parse(customerAuth);
        if (user.type === 'partner') {
          // دریافت partner_id از دیتابیس
          const res = await fetch(`http://localhost:5003/api/partners/user/${user.id}`);
          const data = await res.json();
          if (data.success) {
            partnerId = data.data.id;
            customerName = data.data.user_name || user.name;
            customerMobile = data.data.user_mobile || user.mobile;
          }
        } else {
          partnerId = null;
          customerName = user.name;
          customerMobile = user.mobile;
        }
      }
      
      const items = cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price || 0
      }));
      
      const requestBody = {
        partner_id: partnerId,
        customer_name: customerName,
        customer_mobile: customerMobile,
        company_name: currentUser?.companyName || '',
        items: items,
        notes: hasZeroPriceItems() ? 'در انتظار تأیید قیمت' : ''
      };
      
      const res = await fetch('http://localhost:5003/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await res.json();
      
      if (data.success) {
        // خالی کردن سبد خرید
        localStorage.removeItem('aseman_cart');
        setCart([]);
        window.dispatchEvent(new Event('storage'));
        
        setShowCheckoutModal(false);
        setShowSuccessModal(true);
      } else {
        alert('خطا در ثبت درخواست: ' + (data.error || 'مشخص نشده'));
      }
    } catch (err) {
      console.error('Error submitting order:', err);
      alert('خطای شبکه. لطفاً مجدد تلاش کنید.');
    } finally {
      setSubmitting(false);
    }
  };

  const getImageUrl = (image) => {
    if (!image) return '/images/placeholder.jpg';
    if (image.startsWith('http')) return image;
    if (image.startsWith('/uploads')) return `http://localhost:5003${image}`;
    return `http://localhost:5003/uploads/${image}`;
  };

  // مودال بزرگ ثبت سفارش
  const renderCheckoutModal = () => {
    if (!showCheckoutModal) return null;
    
    const hasZeroPrice = hasZeroPriceItems();
    const totalAmount = getCartTotal();
    
    return (
      <div className="modal-overlay" onClick={() => setShowCheckoutModal(false)}>
        <div className="checkout-modal" onClick={e => e.stopPropagation()}>
          <div className="checkout-modal-header">
            <h3>📋 ثبت درخواست سفارش</h3>
            <button className="checkout-modal-close" onClick={() => setShowCheckoutModal(false)}>✖</button>
          </div>
          
          <div className="checkout-modal-body">
            {/* اطلاعات کاربر */}
            <div className="checkout-user-info">
              <div className="user-info-row">
                <span className="user-info-label">👤 نام و نام خانوادگی:</span>
                <span className="user-info-value">{currentUser?.name || '—'}</span>
              </div>
              <div className="user-info-row">
                <span className="user-info-label">📞 شماره تماس:</span>
                <span className="user-info-value">{currentUser?.mobile || '—'}</span>
              </div>
              {currentUser?.type === 'partner' && currentUser?.companyName && (
                <div className="user-info-row">
                  <span className="user-info-label">🏢 نام شرکت:</span>
                  <span className="user-info-value">{currentUser.companyName}</span>
                </div>
              )}
            </div>
            
            {/* لیست محصولات */}
            <div className="checkout-products">
              <h4>🛒 محصولات سفارش</h4>
              <div className="checkout-products-table">
                <table>
                  <thead>
                    <tr>
                      <th>محصول</th>
                      <th>تعداد (متر مربع)</th>
                      <th>قیمت واحد</th>
                      <th>جمع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.id}>
                        <td className="product-name-cell">{item.name}</td>
                        <td className="quantity-cell">{item.quantity}</td>
                        <td className="price-cell">
                          {item.price > 0 ? (
                            `${item.price.toLocaleString()} تومان`
                          ) : (
                            <span className="price-unknown">نامشخص</span>
                          )}
                        </td>
                        <td className="total-cell">
                          {item.price > 0 ? (
                            `${(item.price * item.quantity).toLocaleString()} تومان`
                          ) : (
                            <span className="price-unknown">نامشخص</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* جمع کل */}
            <div className="checkout-total">
              <span>💰 مبلغ کل سفارش:</span>
              <strong className={hasZeroPrice ? 'price-unknown' : ''}>
                {hasZeroPrice ? 'نامشخص' : `${totalAmount.toLocaleString()} تومان`}
              </strong>
            </div>
            
            {hasZeroPrice && (
              <div className="checkout-warning">
                ⚠️ برخی از محصولات قیمت مشخصی ندارند. پس از ثبت درخواست، کارشناسان ما جهت اعلام قیمت نهایی با شما تماس خواهند گرفت.
              </div>
            )}
          </div>
          
          <div className="checkout-modal-footer">
            <button className="btn-secondary" onClick={() => setShowCheckoutModal(false)}>
              بازگشت به سبد
            </button>
            <button 
              className="btn-primary" 
              onClick={submitInitialRequest}
              disabled={submitting}
            >
              {submitting ? 'در حال ثبت...' : '📝 ثبت درخواست اولیه'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // مودال موفقیت
  const renderSuccessModal = () => {
    if (!showSuccessModal) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
        <div className="success-modal" onClick={e => e.stopPropagation()}>
          <div className="success-icon">✅</div>
          <h3>درخواست شما با موفقیت ثبت شد!</h3>
          
          <div className="success-message">
            <p>با تشکر از اعتماد شما</p>
            <p>کارشناسان ما در اسرع وقت جهت اعلام قیمت نهایی و ثبت نهایی سفارش با شما تماس حاصل خواهند کرد.</p>
            <p className="thanks-note">پیشاپیش با تشکر از صبر و شکیبایی شما</p>
          </div>
          
          <button 
            className="btn-primary" 
            onClick={() => {
              setShowSuccessModal(false);
              navigate('/');
            }}
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="cart-dropdown">
        <button className="cart-icon-btn" onClick={() => setIsOpen(!isOpen)}>
          🛒
          {getCartCount() > 0 && (
            <span className="cart-count">{getCartCount()}</span>
          )}
        </button>

        {isOpen && (
          <div className="cart-dropdown-content">
            <div className="cart-header">
              <h3>سبد خرید</h3>
              <button className="cart-close" onClick={() => setIsOpen(false)}>✖</button>
            </div>
            
            {cart.length === 0 ? (
              <div className="cart-empty">
                <p>سبد خرید شما خالی است</p>
                <Link to="/products" onClick={() => setIsOpen(false)}>رفتن به فروشگاه</Link>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item.id} className="cart-item">
                      <img src={getImageUrl(item.image)} alt={item.name} />
                      <div className="cart-item-info">
                        <h4>{item.name}</h4>
                        <div className="cart-item-price">
                          {item.price > 0 ? `${item.price.toLocaleString()} تومان` : 'استعلام قیمت'}
                        </div>
                        <div className="cart-item-quantity">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                        </div>
                      </div>
                      <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}>🗑️</button>
                    </div>
                  ))}
                </div>
                
                <div className="cart-footer">
                  <div className="cart-total">
                    <span>جمع کل:</span>
                    <strong>
                      {hasZeroPriceItems() ? 'نامشخص' : `${getCartTotal().toLocaleString()} تومان`}
                    </strong>
                  </div>
                  <button className="cart-checkout-btn" onClick={openCheckoutModal}>
                    ثبت سفارش
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* مودال‌ها */}
      {renderCheckoutModal()}
      {renderSuccessModal()}
    </>
  );
};

export default CartDropdown;
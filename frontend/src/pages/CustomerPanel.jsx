import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getCurrentCustomer, logoutCustomer } from '../utils/customerAuth'
import './CustomerPanel.css'

const CustomerPanel = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const customer = getCurrentCustomer()
  const navigate = useNavigate()

  const [wishlist, setWishlist] = useState([])
  const [loadingWishlist, setLoadingWishlist] = useState(false)

  const loadWishlist = async () => {
    if (!customer?.id) return
    setLoadingWishlist(true)
    try {
      const res = await fetch(`http://localhost:5003/api/wishlist/${customer.id}`)
      const data = await res.json()
      if (data.success) setWishlist(data.data)
    } catch (err) { console.error(err) }
    finally { setLoadingWishlist(false) }
  }

  useEffect(() => {
    if (activeMenu === 'wishlist') loadWishlist()
  }, [activeMenu])

  const handleLogout = () => {
    logoutCustomer()
    navigate('/login')
  }

  if (!customer) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="customer-layout">
      <aside className="customer-sidebar">
        <div className="customer-profile">
          <div className="avatar">👤</div>
          <h3>{customer.name || customer.firstName || 'کاربر'}</h3>
          <p>{customer.email || customer.mobile}</p>
        </div>
        <nav className="customer-nav">
          <button className={activeMenu === 'dashboard' ? 'active' : ''} onClick={() => setActiveMenu('dashboard')}>📊 پیشخوان</button>
          <button className={activeMenu === 'orders' ? 'active' : ''} onClick={() => setActiveMenu('orders')}>📦 سفارش‌ها</button>
          <button className={activeMenu === 'downloads' ? 'active' : ''} onClick={() => setActiveMenu('downloads')}>⬇️ دانلودها</button>
          <button className={activeMenu === 'addresses' ? 'active' : ''} onClick={() => setActiveMenu('addresses')}>📍 آدرس‌ها</button>
          <button className={activeMenu === 'wishlist' ? 'active' : ''} onClick={() => setActiveMenu('wishlist')}>❤️ علاقه‌مندی‌ها</button>
          <button className={activeMenu === 'account' ? 'active' : ''} onClick={() => setActiveMenu('account')}>⚙️ جزئیات حساب</button>
          <button onClick={handleLogout} className="logout-btn">🚪 خروج</button>
        </nav>
      </aside>

      <main className="customer-main">
        <header className="customer-header">
          <h1>
            {activeMenu === 'dashboard' && 'پیشخوان'}
            {activeMenu === 'orders' && 'سفارش‌های من'}
            {activeMenu === 'downloads' && 'دانلودها'}
            {activeMenu === 'addresses' && 'آدرس‌های من'}
            {activeMenu === 'wishlist' && 'علاقه‌مندی‌ها'}
            {activeMenu === 'account' && 'جزئیات حساب'}
          </h1>
        </header>

        <div className="customer-content">
          {activeMenu === 'dashboard' && (
            <div className="welcome-card">
              <h2>خوش آمدید، {customer.name || customer.firstName}!</h2>
              <p>جهت دسترسی آسان به لینک‌های پیشخوان می‌توانید از منوی روبرو اقدام فرمایید.</p>
              <div className="quick-links">
                <Link to="/products" className="quick-link">🛒 مشاهده محصولات</Link>
              </div>
            </div>
          )}

          {activeMenu === 'orders' && (
            <div className="placeholder-content">
              <p>📦 شما هنوز سفارشی ثبت نکرده‌اید.</p>
            </div>
          )}

          {activeMenu === 'downloads' && (
            <div className="placeholder-content">
              <p>📥 فایلی برای دانلود موجود نیست.</p>
            </div>
          )}

          {activeMenu === 'addresses' && (
            <div className="placeholder-content">
              <p>📍 آدرسی ثبت نشده است.</p>
              <button className="btn-primary">➕ افزودن آدرس جدید</button>
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
                          await fetch(`http://localhost:5003/api/wishlist/${item.id}`, { method: 'DELETE' });
                          loadWishlist();
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

          {activeMenu === 'account' && (
            <div className="account-details">
              <h3>اطلاعات حساب کاربری</h3>
              <div className="detail-row"><span>نام:</span> {customer.firstName || customer.name}</div>
              <div className="detail-row"><span>نام خانوادگی:</span> {customer.lastName || ''}</div>
              <div className="detail-row"><span>شماره تماس:</span> {customer.phone || customer.mobile}</div>
              <div className="detail-row"><span>ایمیل:</span> {customer.email}</div>
              <button className="btn-secondary">ویرایش اطلاعات</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default CustomerPanel
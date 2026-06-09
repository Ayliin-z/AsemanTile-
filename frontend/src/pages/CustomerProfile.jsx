// frontend/src/pages/CustomerProfile.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './CustomerProfile.css';

const CustomerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState([]);
  const [stats, setStats] = useState({
    totalPurchases: 0,
    totalPayments: 0,
    remainingDebt: 0
  });

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      // دریافت اطلاعات مشتری
      const userRes = await fetch(`http://localhost:5003/api/users/${id}`);
      const userData = await userRes.json();
      setCustomer(userData);

      // دریافت سفارش‌های مشتری
      const quotesRes = await fetch(`http://localhost:5003/api/quotes`);
      const quotesData = await quotesRes.json();
      
      let customerQuotes = [];
      if (quotesData.success && Array.isArray(quotesData.data)) {
        // فیلتر سفارش‌های این مشتری (بر اساس موبایل یا partner_id)
        customerQuotes = quotesData.data.filter(q => 
          q.customer_mobile === userData.mobile || 
          (q.partner_id && q.partner_id.toString() === id)
        );
        setQuotes(customerQuotes);
        
        // محاسبه آمار
        const totalPurchases = customerQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);
        // برای نمونه، فرض می‌کنیم نیمی از مبلغ پرداخت شده (در واقع باید از دیتابیس بیاید)
        const totalPayments = Math.round(totalPurchases * 0.7);
        const remainingDebt = totalPurchases - totalPayments;
        
        setStats({
          totalPurchases,
          totalPayments,
          remainingDebt
        });
      }
    } catch (err) {
      console.error('Error loading customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 50, fontSize: 18 }}>در حال بارگذاری...</div>;
  }

  if (!customer) {
    return <div style={{ textAlign: 'center', padding: 50, fontSize: 18 }}>مشتری یافت نشد</div>;
  }

  return (
    <div className="customer-profile">
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← بازگشت</button>
        <h1>پروفایل مشتری</h1>
      </div>

      {/* اطلاعات تماس */}
      <div className="info-card">
        <h2>📞 اطلاعات تماس</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">نام و نام خانوادگی:</span>
            <span className="info-value">{customer.name || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">شماره موبایل:</span>
            <span className="info-value">{customer.mobile}</span>
          </div>
          <div className="info-item">
            <span className="info-label">ایمیل:</span>
            <span className="info-value">{customer.email || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">شهر:</span>
            <span className="info-value">{customer.city || '—'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">نوع مشتری:</span>
            <span className="info-value">
              {customer.type === 'customer' ? '👤 مشتری عادی' : '🤝 همکار'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">وضعیت:</span>
            <span className={`status-badge ${customer.is_active ? 'active' : 'inactive'}`}>
              {customer.is_active ? '✅ فعال' : '🔒 غیرفعال'}
            </span>
          </div>
        </div>
      </div>

      {/* اطلاعات مالی */}
      <div className="stats-card">
        <h2>💰 اطلاعات مالی</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{stats.totalPurchases.toLocaleString()} تومان</div>
            <div className="stat-label">مجموع خرید</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{stats.totalPayments.toLocaleString()} تومان</div>
            <div className="stat-label">مجموع پرداخت</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: stats.remainingDebt > 0 ? '#e74c3c' : '#27ae60' }}>
              {stats.remainingDebt.toLocaleString()} تومان
            </div>
            <div className="stat-label">مانده بدهی</div>
          </div>
        </div>
      </div>

      {/* تاریخچه سفارش‌ها */}
      <div className="orders-card">
        <h2>📦 تاریخچه سفارش‌ها</h2>
        {quotes.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 30, color: '#7c8788' }}>هیچ سفارشی ثبت نشده است.</p>
        ) : (
          <div className="table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>شماره سفارش</th>
                  <th>تاریخ ثبت</th>
                  <th>مبلغ کل</th>
                  <th>وضعیت</th>
                  <th>جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(quote => (
                  <tr key={quote.id}>
                    <td>{quote.quote_number}</td>
                    <td>{new Date(quote.created_at).toLocaleDateString('fa-IR')}</td>
                    <td>{quote.total_amount?.toLocaleString()} تومان</td>
                    <td>
                      <span className={`status-badge status-${quote.status}`}>
                        {getStatusLabel(quote.status)}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="detail-btn"
                        onClick={() => window.open(`/admin/quotes/${quote.id}`, '_blank')}
                      >
                        مشاهده
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;
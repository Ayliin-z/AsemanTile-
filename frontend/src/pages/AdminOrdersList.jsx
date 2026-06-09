// frontend/src/pages/AdminOrdersList.jsx
import { useState, useEffect } from 'react';
import './AdminPage.css';

const AdminOrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [orderLogs, setOrderLogs] = useState([]);
  const [orderPartner, setOrderPartner] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // دریافت لیست سفارش‌ها
  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5003/api/quotes');
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // دریافت جزئیات سفارش
  const viewOrderDetails = async (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
    
    try {
      // دریافت آیتم‌های سفارش
      const itemsRes = await fetch(`http://localhost:5003/api/quotes/${order.id}`);
      const itemsData = await itemsRes.json();
      if (itemsData.success) {
        setOrderItems(itemsData.data.items || []);
      }
      
      // دریافت اطلاعات همکار
      if (order.partner_id) {
        const partnerRes = await fetch(`http://localhost:5003/api/partners/${order.partner_id}`);
        const partnerData = await partnerRes.json();
        if (partnerData.success) {
          setOrderPartner(partnerData.data);
        } else {
          setOrderPartner(null);
        }
      } else {
        setOrderPartner(null);
      }
      
      // دریافت تاریخچه تغییرات وضعیت
      const logsRes = await fetch(`http://localhost:5003/api/quotes/${order.id}/status-logs`);
      const logsData = await logsRes.json();
      if (logsData.success) {
        setOrderLogs(logsData.data);
      } else {
        setOrderLogs([]);
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
    }
  };

  // تغییر وضعیت سفارش
  const changeOrderStatus = async (orderId, newStatus) => {
    if (!window.confirm(`آیا وضعیت این سفارش به "${getStatusLabel(newStatus)}" تغییر کند؟`)) return;
    
    try {
      const res = await fetch(`http://localhost:5003/api/quotes/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        alert('وضعیت سفارش با موفقیت تغییر کرد');
        loadOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          viewOrderDetails({ ...selectedOrder, status: newStatus });
        }
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('خطا در تغییر وضعیت');
    }
  };

  // اضافه کردن توضیحات
  const addNote = async () => {
    if (!newNote.trim() || !selectedOrder) return;
    
    setSubmittingNote(true);
    try {
      const res = await fetch(`http://localhost:5003/api/quotes/${selectedOrder.id}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote })
      });
      const data = await res.json();
      if (data.success) {
        alert('توضیحات با موفقیت اضافه شد');
        setNewNote('');
        // بارگذاری مجدد تاریخچه
        const logsRes = await fetch(`http://localhost:5003/api/quotes/${selectedOrder.id}/status-logs`);
        const logsData = await logsRes.json();
        if (logsData.success) {
          setOrderLogs(logsData.data);
        }
      } else {
        alert('خطا: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('خطا در افزودن توضیحات');
    } finally {
      setSubmittingNote(false);
    }
  };

  const getStatusLabel = (status) => {
    const map = {
      submitted: 'ثبت شده',
      reviewing: 'در حال بررسی',
      issued: 'صادر شده',
      waiting_customer: 'در انتظار مشتری',
      preparing: 'در حال آماده‌سازی',
      completed: 'تکمیل شده',
      final_confirmed: 'تأیید نهایی',
      cancelled: 'لغو شده'
    };
    return map[status] || status;
  };

  const getStatusClass = (status) => {
    const classes = {
      submitted: 'status-submitted',
      reviewing: 'status-reviewing',
      issued: 'status-issued',
      waiting_customer: 'status-waiting',
      preparing: 'status-preparing',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return classes[status] || '';
  };



  const getStatusInfo = (status) => {
    const statusMap = {
      submitted: { label: 'ثبت شده', color: '#1976d2', bg: '#e3f2fd' },
      reviewing: { label: 'در حال بررسی', color: '#f57c00', bg: '#fff3e0' },
      issued: { label: 'صادر شده', color: '#388e3c', bg: '#e8f5e9' },
      preparing: { label: 'در حال آماده‌سازی', color: '#7b1fa2', bg: '#f3e5f5' },
      completed: { label: 'تکمیل شده', color: '#00796b', bg: '#e0f2f1' },
      price_inquiry: { label: 'نیاز به تماس جهت اعلام قیمت', color: '#e67e22', bg: '#fff3e0' },
      cancelled: { label: 'لغو شده', color: '#d32f2f', bg: '#ffebee' }
    };
    return statusMap[status] || { label: status, color: '#666', bg: '#f5f5f5' };
  };


  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fa-IR') + ' - ' + new Date(dateStr).toLocaleTimeString('fa-IR');
  };

  // فیلتر سفارش‌ها
  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      order.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id?.toString().includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const statusOptions = [
    { value: 'all', label: 'همه' },
    { value: 'submitted', label: 'ثبت شده' },
    { value: 'reviewing', label: 'در حال بررسی' },
    { value: 'issued', label: 'صادر شده' },
    { value: 'waiting_customer', label: 'در انتظار مشتری' },
    { value: 'preparing', label: 'در حال آماده‌سازی' },
    { value: 'completed', label: 'تکمیل شده' },
    { value: 'cancelled', label: 'لغو شده' }
  ];

  return (
    <div className="admin-orders-list" style={{ direction: 'rtl' }}>
      {/* هدر صفحه */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 25, 
        flexWrap: 'wrap', 
        gap: 15 
      }}>
        <h2 style={{ color: '#13314c', margin: 0, fontSize: 28 }}>📋 لیست سفارش‌ها</h2>
        
        {/* سرچ در سمت چپ */}
        <div style={{ 
          display: 'flex', 
          gap: 15, 
          alignItems: 'center', 
          flexWrap: 'wrap',
          justifyContent: 'flex-end'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'white', 
            border: '2px solid #13314c', 
            borderRadius: 50, 
            padding: '5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}>
            <input 
              type="text" 
              placeholder="جستجو بر اساس شماره..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ 
                border: 'none', 
                outline: 'none', 
                padding: '10px 18px', 
                borderRadius: 50, 
                width: 250,
                fontSize: 14,
                fontFamily: 'inherit'
              }}
            />
            <button style={{ 
              background: '#13314c', 
              border: 'none', 
              color: 'white', 
              width: 42, 
              height: 42, 
              borderRadius: '50%', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>🔍</button>
          </div>
        </div>
      </div>

      {/* فیلتر وضعیت - بالای جدول */}
      <div style={{ 
        marginBottom: 20, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 15,
        flexWrap: 'wrap',
        background: 'white',
        padding: '12px 20px',
        borderRadius: 50,
        border: '1px solid #e3dede'
      }}>
        <label style={{ fontWeight: 'bold', color: '#13314c', fontSize: 14 }}>فیلتر وضعیت:</label>
        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          style={{ 
            padding: '8px 18px', 
            borderRadius: 30, 
            border: '1px solid #ddd', 
            background: 'white',
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'pointer'
          }}
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* جدول سفارش‌ها */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, background: 'white', borderRadius: 20 }}>
          <p style={{ fontSize: 18 }}>در حال بارگذاری...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, background: 'white', borderRadius: 20 }}>
          <p style={{ fontSize: 18, color: '#7c8788' }}>هیچ سفارشی یافت نشد.</p>
        </div>
      ) : (
        <div className="table-container" style={{ background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <table className="products-table" style={{ width: '100%', fontSize: 15 }}>
            <thead>
              <tr style={{ background: '#f0f4f7', borderBottom: '2px solid #e3dede' }}>
                <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>شماره سفارش</th>
                <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>تاریخ ثبت</th>
                <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>نام مشتری</th>
                <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>شماره تماس</th>
                <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>نام شرکت</th>
                <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>مبلغ کل (تومان)</th>
                <th style={{ padding: '16px 15px', textAlign: 'right', fontSize: 16 }}>وضعیت</th>
                <th style={{ padding: '16px 15px', textAlign: 'center', fontSize: 16 }}>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const statusInfo = getStatusInfo(order.status);
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid #e3dede' }}>
                    <td style={{ padding: '14px 15px', fontWeight: 'bold', color: '#1c7385' }}>{order.quote_number}</td>
                    <td style={{ padding: '14px 15px' }}>{new Date(order.created_at).toLocaleDateString('fa-IR')}</td>
                    <td style={{ padding: '14px 15px' }}>{order.customer_name || order.partner_name || '—'}</td>
                    <td style={{ padding: '14px 15px' }}>{order.customer_mobile || order.partner_mobile || '—'}</td>
                    <td style={{ padding: '14px 15px' }}>{order.company_name || '—'}</td>
                    <td style={{ padding: '14px 15px', fontWeight: 'bold', fontSize: 16, color: '#1c7385' }}>
                      {order.total_amount?.toLocaleString() || '۰'} تومان
                    </td>
                    <td style={{ padding: '14px 15px' }}>
                      <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 30, fontSize: 12, fontWeight: 'bold', background: statusInfo.bg, color: statusInfo.color }}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 15px', textAlign: 'center' }}>
                      <button onClick={() => viewOrderDetails(order)} style={{ background: '#1c7385', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 30, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
                        🔍 جزئیات
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال جزئیات سفارش */}
      {showDetailModal && selectedOrder && (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
              background: 'white', 
              padding: 30, 
              borderRadius: 24, 
              maxWidth: 1000, 
              width: '90%',
              maxHeight: '85vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                <h3 style={{ margin: 0, color: '#13314c', fontSize: 26 }}>📄 جزئیات سفارش</h3>
                <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer' }}>✖</button>
              </div>
              
              
              {/* اطلاعات مشتری */}
              <div style={{ background: '#f0f4f7', padding: 20, borderRadius: 16, marginBottom: 25 }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#13314c' }}>👤 اطلاعات مشتری</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15 }}>
                  <p><strong>نام:</strong> {selectedOrder.customer_name || orderPartner?.user_name || '—'}</p>
                  <p><strong>شماره تماس:</strong> {selectedOrder.customer_mobile || orderPartner?.user_mobile || '—'}</p>
                  <p><strong>نام شرکت:</strong> {selectedOrder.company_name || orderPartner?.company_name || '—'}</p>
                  <p><strong>شهر:</strong> {orderPartner?.city || '—'}</p>
                </div>
              </div>

              {/* اطلاعات اصلی سفارش */}
              <div style={{ background: '#f0f4f7', padding: 20, borderRadius: 16, marginBottom: 25 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 15 }}>
                  <p><strong>🔢 شماره سفارش:</strong> {selectedOrder.quote_number}</p>
                  <p><strong>📅 تاریخ ثبت:</strong> {formatDate(selectedOrder.created_at)}</p>
                  <p><strong>💰 مبلغ کل:</strong> <span style={{ color: '#1c7385', fontWeight: 'bold' }}>{selectedOrder.total_amount?.toLocaleString()} تومان</span></p>
                  <p><strong>📌 وضعیت فعلی:</strong> 
                    <select 
                      value={selectedOrder.status} 
                      onChange={e => changeOrderStatus(selectedOrder.id, e.target.value)}
                      style={{ marginRight: 10, padding: '6px 12px', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
                    >
                      <option value="submitted">ثبت شده</option>
                      <option value="reviewing">در حال بررسی</option>
                      <option value="price_inquiry">نیاز به تماس جهت اعلام قیمت</option>
                      <option value="issued">صادر شده</option>
                      <option value="preparing">در حال آماده‌سازی</option>
                      <option value="completed">تکمیل شده</option>
                      <option value="cancelled">لغو شده</option>
                    </select>
                  </p>
                </div>
              </div>
                    
            {/* لیست محصولات */}
            <h4 style={{ color: '#13314c', marginBottom: 15, fontSize: 20 }}>🛒 محصولات سفارش</h4>
            <div className="table-container" style={{ marginBottom: 25, borderRadius: 16, overflow: 'hidden' }}>
              <table className="products-table" style={{ width: '100%', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f0f4f7' }}>
                    <th style={{ padding: '12px', fontSize: 15 }}>نام محصول</th>
                    <th style={{ padding: '12px', fontSize: 15, textAlign: 'center' }}>تعداد (متر مربع)</th>
                    <th style={{ padding: '12px', fontSize: 15, textAlign: 'center' }}>قیمت واحد</th>
                    <th style={{ padding: '12px', fontSize: 15, textAlign: 'center' }}>جمع</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 30 }}>در حال بارگذاری...</td></tr>
                  ) : (
                    orderItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e3dede' }}>
                        <td style={{ padding: '12px' }}>{item.product_name}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{item.price?.toLocaleString()} تومان</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#1c7385' }}>{(item.quantity * item.price)?.toLocaleString()} تومان</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* تاریخچه تغییرات وضعیت */}
            <h4 style={{ color: '#13314c', marginBottom: 15, fontSize: 20 }}>📊 تاریخچه وضعیت سفارش</h4>
            {orderLogs.length === 0 ? (
              <p style={{ color: '#7c8788', textAlign: 'center', padding: 30, background: '#f8f6f4', borderRadius: 12 }}>هیچ تغییری در وضعیت سفارش ثبت نشده است.</p>
            ) : (
              <div className="table-container" style={{ marginBottom: 25, borderRadius: 16, overflow: 'hidden' }}>
                <table className="products-table" style={{ width: '100%', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f0f4f7' }}>
                      <th style={{ padding: '12px', fontSize: 15 }}>زمان</th>
                      <th style={{ padding: '12px', fontSize: 15 }}>وضعیت قبلی</th>
                      <th style={{ padding: '12px', fontSize: 15 }}>وضعیت جدید</th>
                      <th style={{ padding: '12px', fontSize: 15 }}>توضیحات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderLogs.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e3dede' }}>
                        <td style={{ padding: '12px', fontSize: 13 }}>{formatDate(log.created_at)}</td>
                        <td style={{ padding: '12px' }}>{getStatusLabel(log.old_status) || '—'}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`status-badge ${getStatusClass(log.new_status)}`} style={{ fontSize: 12, padding: '3px 12px' }}>{getStatusLabel(log.new_status)}</span>
                        </td>
                        <td style={{ padding: '12px' }}>{log.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* افزودن توضیحات جدید - باکس بزرگتر و دکمه پایین */}
            <h4 style={{ color: '#13314c', marginBottom: 15, fontSize: 20 }}>✏️ افزودن توضیحات جدید</h4>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 15, 
              marginBottom: 25,
              background: '#f8f6f4',
              padding: 20,
              borderRadius: 16
            }}>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="توضیحات خود را وارد کنید..."
                rows="4"
                style={{ 
                  width: '100%', 
                  padding: 15, 
                  borderRadius: 12, 
                  border: '1px solid #ddd', 
                  resize: 'vertical',
                  fontSize: 15,
                  fontFamily: 'inherit'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn-primary" 
                  onClick={addNote}
                  disabled={submittingNote || !newNote.trim()}
                  style={{ 
                    padding: '12px 28px', 
                    fontSize: 15,
                    borderRadius: 40,
                    cursor: 'pointer'
                  }}
                >
                  {submittingNote ? 'در حال ثبت...' : '➕ افزودن توضیحات'}
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)} style={{ padding: '12px 30px', fontSize: 15, borderRadius: 40, cursor: 'pointer' }}>
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersList;
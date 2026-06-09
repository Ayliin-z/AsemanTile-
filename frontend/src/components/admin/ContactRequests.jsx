// frontend/src/components/admin/ContactRequests.jsx
import { useState, useEffect } from 'react';

const ContactRequests = () => {
  const [contactRequests, setContactRequests] = useState([]);
  const [loadingContact, setLoadingContact] = useState(false);

  const loadContactRequests = async () => {
    setLoadingContact(true);
    try {
      const res = await fetch('/api/contact');
      const data = await res.json();
      if (data.success) {
        setContactRequests(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContact(false);
    }
  };

  useEffect(() => {
    loadContactRequests();
  }, []);

  const getStatusBadge = (status) => {
    const statusMap = {
      new: { label: 'جدید', color: '#1976d2', bg: '#e3f2fd' },
      contacted: { label: 'تماس گرفته شده', color: '#388e3c', bg: '#e8f5e9' },
      followed: { label: 'پیگیری شده', color: '#f57c00', bg: '#fff3e0' }
    };
    const s = statusMap[status] || { label: status, color: '#666', bg: '#f5f5f5' };
    return <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 'bold', background: s.bg, color: s.color }}>{s.label}</span>;
  };

  return (
    <div className="contact-requests-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
        <h2 style={{ color: '#13314c', margin: 0, fontSize: 28 }}>📞 درخواست‌های تماس</h2>
        <button className="btn-secondary" onClick={loadContactRequests} style={{ padding: '8px 20px', borderRadius: 30 }}>🔄 بارگذاری مجدد</button>
      </div>
      {loadingContact ? (
        <div style={{ textAlign: 'center', padding: 50 }}>در حال بارگذاری...</div>
      ) : contactRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 15 }}>📭</div>
          <p style={{ fontSize: 16, color: '#7c8788' }}>هیچ درخواست تماسی ثبت نشده است.</p>
        </div>
      ) : (
        <div className="table-container" style={{ background: 'white', borderRadius: 24, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e3dede' }}>
          <table className="products-table" style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f4f7', borderBottom: '2px solid #e3dede' }}>
                <th style={{ padding: '15px', textAlign: 'right' }}>نام</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>شماره تماس</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>شهر</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>پیام</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>وضعیت</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {contactRequests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #e3dede' }}>
                  <td style={{ padding: '12px' }}>{req.name}</td>
                  <td style={{ padding: '12px' }}>{req.mobile}</td>
                  <td style={{ padding: '12px' }}>{req.city || '—'}</td>
                  <td style={{ padding: '12px', maxWidth: '250px', wordBreak: 'break-word' }}>{req.message?.substring(0, 50)}...</td>
                  <td style={{ padding: '12px' }}>{getStatusBadge(req.status)}</td>
                  <td style={{ padding: '12px' }}>{new Date(req.created_at).toLocaleDateString('fa-IR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContactRequests;
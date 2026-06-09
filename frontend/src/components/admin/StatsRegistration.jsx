// frontend/src/components/admin/StatsRegistration.jsx
import { useState, useEffect } from 'react';

const StatsRegistration = () => {
  const [registrationStats, setRegistrationStats] = useState({
    today: { customers: 0, partners: 0 },
    week: { customers: 0, partners: 0 },
    month: { customers: 0, partners: 0 },
    daily: [],
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('http://localhost:5003/api/stats/registrations');
      const result = await res.json();
      if (result.success) setRegistrationStats(result.data);
    } catch (error) {
      console.error('خطا در دریافت آمار ثبت‌نام:', error);
    }
  };

  return (
    <div className="stats-registration-view">
      <h2 style={{ color: '#13314c', fontSize: 28, marginBottom: 20 }}>📈 آمار ثبت‌نام کاربران</h2>
      <div className="stats-grid">
        <div className="stat-card"><span className="stat-value">{registrationStats.today.customers}</span><span>مشتری جدید امروز</span></div>
        <div className="stat-card"><span className="stat-value">{registrationStats.today.partners}</span><span>همکار جدید امروز</span></div>
        <div className="stat-card"><span className="stat-value">{registrationStats.week.customers}</span><span>مشتریان ۷ روز گذشته</span></div>
        <div className="stat-card"><span className="stat-value">{registrationStats.week.partners}</span><span>همکاران ۷ روز گذشته</span></div>
        <div className="stat-card"><span className="stat-value">{registrationStats.month.customers}</span><span>مشتریان این ماه</span></div>
        <div className="stat-card"><span className="stat-value">{registrationStats.month.partners}</span><span>همکاران این ماه</span></div>
      </div>
      {registrationStats.daily && registrationStats.daily.length > 0 && (
        <div className="daily-stats">
          <h4>آخرین ۷ روز</h4>
          <div className="table-container">
            <table className="products-table">
              <thead><tr><th>تاریخ</th><th>مشتری جدید</th><th>همکار جدید</th></tr></thead>
              <tbody>
                {registrationStats.daily.map(day => (
                  <tr key={day.date}><td>{new Date(day.date).toLocaleDateString('fa-IR')}</td><td>{day.customers}</td><td>{day.partners}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsRegistration;
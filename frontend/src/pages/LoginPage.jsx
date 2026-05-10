import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';

// تابع تبدیل اعداد فارسی و عربی به انگلیسی
const toEnglishDigits = (str) => {
  if (!str) return '';
  return str.replace(/[۰-۹٠-٩]/g, (d) => {
    const persianArabicDigits = '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩';
    const englishDigits = '01234567890123456789';
    const index = persianArabicDigits.indexOf(d);
    return index !== -1 ? englishDigits[index] : d;
  });
};

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanMobile = toEnglishDigits(username.trim());
    const cleanPassword = toEnglishDigits(password.trim());

    try {
      const res = await fetch('http://localhost:5003/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile, password: cleanPassword }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('aseman_customer_auth', JSON.stringify(data.data.user));
        
        if (data.data.user.type === 'admin') {
          localStorage.setItem('aseman_admin_auth', JSON.stringify(data.data.user));
          navigate('/admin');
        } else if (data.data.user.type === 'partner') {
          navigate('/partner');
        } else {
          navigate('/customer');
        }
        return;
      }

      setError(data.error || 'ورود ناموفق');
    } catch (err) {
      setError('خطای ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>ورود به حساب</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="شماره موبایل"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
          <input
            type="password"
            placeholder="رمز عبور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'در حال ورود...' : 'ورود'}
          </button>
        </form>
        <p className="register-link">
          حساب کاربری ندارید؟ <Link to="/register">ثبت‌نام</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
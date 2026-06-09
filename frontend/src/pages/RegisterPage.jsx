import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './RegisterPage.css';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('customer');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !mobile || !password) {
      setError('لطفاً همه فیلدهای اصلی را پر کنید');
      return;
    }

    if (password.length < 4) {
      setError('رمز عبور باید حداقل ۴ کاراکتر باشد');
      return;
    }

    if (userType === 'partner' && !companyName) {
      setError('برای ثبت‌نام همکار، نام شرکت الزامی است');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (userType === 'partner') {
        res = await fetch('/api/auth/register-partner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, mobile, password, companyName, city, address }),
        });
      } else {
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, mobile, password }),
        });
      }

      const data = await res.json();

      if (data.success) {
        alert(data.message || 'ثبت‌نام با موفقیت انجام شد');
        navigate('/login');
      } else {
        setError(data.error || 'خطا در ثبت‌نام');
      }
    } catch (err) {
      setError('خطای ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>عضویت در سایت</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="نام و نام خانوادگی *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="tel"
            placeholder="شماره موبایل *"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="رمز عبور (حداقل ۴ کاراکتر) *"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="user-type-selector" style={{ margin: '15px 0' }}>
            <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold' }}>نوع حساب:</label>
            <div className="radio-group" style={{ display: 'flex', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="userType"
                  value="customer"
                  checked={userType === 'customer'}
                  onChange={() => setUserType('customer')}
                />
                مشتری عادی
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="userType"
                  value="partner"
                  checked={userType === 'partner'}
                  onChange={() => setUserType('partner')}
                />
                همکار (فروشنده / شرکت)
              </label>
            </div>
          </div>

          {userType === 'partner' && (
            <div className="partner-fields">
              <input
                type="text"
                placeholder="نام شرکت *"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="شهر"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <input
                type="text"
                placeholder="آدرس"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          )}

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
          </button>
        </form>
        <p className="login-link">
          قبلاً ثبت‌نام کرده‌اید؟ <Link to="/login">ورود</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
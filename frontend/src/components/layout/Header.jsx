// frontend/src/components/layout/Header.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import CartDropdown from './CartDropdown';
import './Header.css'

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [userType, setUserType] = useState(null)

  useEffect(() => {
    const adminAuth = localStorage.getItem('aseman_admin_auth')
    const customerAuth = localStorage.getItem('aseman_customer_auth')
    const employeeAuth = localStorage.getItem('aseman_employee_auth')
    
    if (adminAuth) {
      try {
        const admin = JSON.parse(adminAuth)
        if (admin && (admin.type === 'admin' || admin.id)) {
          setUserType('admin')
          return
        }
      } catch (e) {}
    }
    
    if (employeeAuth) {
      try {
        const emp = JSON.parse(employeeAuth)
        if (emp && (emp.id || emp.name)) {
          setUserType('employee')
          return
        }
      } catch (e) {}
    }
    
    if (customerAuth) {
      try {
        const customer = JSON.parse(customerAuth)
        if (customer && customer.type === 'partner') {
          setUserType('partner')
          return
        }
        if (customer && (customer.type === 'customer' || customer.id)) {
          setUserType('customer')
          return
        }
      } catch (e) {}
    }
    
    setUserType(null)
  }, [location.pathname])

  const handleDashboardClick = (e) => {
    e.preventDefault()
    if (userType === 'admin') {
      navigate('/admin?section=dashboard')
      window.location.reload() // رفرش صفحه برای اطمینان
    } else if (userType === 'employee') {
      navigate('/employee?section=dashboard')
      window.location.reload()
    }
  }

  const getAccountLink = () => {
    switch (userType) {
      case 'admin':
        return (
          <button onClick={handleDashboardClick} className="login-link" style={{ background: '#ffd800', color: '#13314c', border: 'none', cursor: 'pointer' }}>
            🏠 داشبورد
          </button>
        )
      case 'partner':
        return <Link to="/partner" className="login-link">پنل همکار</Link>
      case 'customer':
        return <Link to="/customer" className="login-link">حساب کاربری</Link>
      case 'employee':
        return (
          <button onClick={handleDashboardClick} className="login-link" style={{ background: '#ffd800', color: '#13314c', border: 'none', cursor: 'pointer' }}>
            🏠 داشبورد
          </button>
        )
      default:
        return <Link to="/login" className="login-link">ورود / عضویت</Link>
    }
  }

  return (
    <header className="main-header">
      <div className="container nav-container">
        <div className="nav-content">
          <div className="logo-area">
            <Link to="/" className="logo-link">
              <img src="/images/logo.png" alt="کاشی و سرامیک آسمان" className="logo-img" />
              <div className="logo-text">
                <h1>کاشی و سرامیک آسمان</h1>
              </div>
            </Link>
          </div>

          <nav className="navigation">
            <ul className="nav-menu">
              <li><Link to="/">خانه</Link></li>
              <li><Link to="/products">محصولات</Link></li>
              <li><Link to="/blog">وبلاگ</Link></li>
              <li><Link to="/about">درباره ما</Link></li>
              <li><Link to="/contact">تماس با ما</Link></li>
              <li className="cart-item">
                <CartDropdown />
              </li>
              <li className="login-item">
                {getAccountLink()}
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
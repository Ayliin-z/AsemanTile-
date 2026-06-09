import { Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import LandingPage from './pages/LandingPage'
import ProductPage from './pages/ProductPage'
import ProductsPage from './pages/ProductsPage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CustomerPanel from './pages/CustomerPanel'
import PartnerPanel from './pages/PartnerPanel'
import BlogPage from './pages/BlogPage'
import BlogPostPage from './pages/BlogPostPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import EmployeePanel from './pages/EmployeePanel'
import CreateQuotePage from './pages/CreateQuotePage'
import QuotesListPage from './pages/QuotesListPage'
import BrandDetailPage from './pages/BrandDetailPage'
import PermissionsPage from './pages/PermissionsPage'
import CustomerProfile from './pages/CustomerProfile'

// مسیرهای محافظت شده
import AdminRoute from './components/ProtectedRoute/AdminRoute'
import EmployeeRoute from './components/ProtectedRoute/EmployeeRoute'
import CustomerRoute from './components/ProtectedRoute/CustomerRoute'
import PartnerRoute from './components/ProtectedRoute/PartnerRoute'

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/brand/:brandId" element={<BrandDetailPage />} />

        {/* مسیر ادمین */}
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/admin/permissions" element={<AdminRoute><PermissionsPage /></AdminRoute>} />
        <Route path="/admin/customer/:id" element={<AdminRoute><CustomerProfile /></AdminRoute>} />

        {/* مسیر کارمند */}
        <Route path="/employee" element={<EmployeeRoute><EmployeePanel /></EmployeeRoute>} />
        <Route path="/employee/create-quote" element={<EmployeeRoute><CreateQuotePage /></EmployeeRoute>} />
        <Route path="/employee/quotes" element={<EmployeeRoute><QuotesListPage /></EmployeeRoute>} />

        {/* مسیر مشتری و همکار */}
        <Route path="/customer" element={<CustomerRoute><CustomerPanel /></CustomerRoute>} />
        <Route path="/partner" element={<PartnerRoute><PartnerPanel /></PartnerRoute>} />
      </Routes>
      <Footer />
    </>
  )
}

export default App
// frontend/src/components/ProtectedRoute/AdminRoute.jsx
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const adminAuth = localStorage.getItem('aseman_admin_auth');
  const customerAuth = localStorage.getItem('aseman_customer_auth');
  
  let user = null;
  
  if (adminAuth) {
    try {
      user = JSON.parse(adminAuth);
    } catch(e) {}
  } else if (customerAuth) {
    try {
      user = JSON.parse(customerAuth);
    } catch(e) {}
  }
  
  if (!user || user.type !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default AdminRoute;
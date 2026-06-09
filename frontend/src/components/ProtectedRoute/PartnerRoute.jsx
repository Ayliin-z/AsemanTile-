import { Navigate } from 'react-router-dom';

const PartnerRoute = ({ children }) => {
  const customerStr = localStorage.getItem('aseman_customer_auth');

  if (!customerStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const customer = JSON.parse(customerStr);
    if (customer && customer.type === 'partner') {
      return children; // <-- اینجا پنل واقعی همکار رو نشون میده
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/customer" replace />;
};

export default PartnerRoute;
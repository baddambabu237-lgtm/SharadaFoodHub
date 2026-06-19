import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, adminOnly = false, customerOnly = false }) => {
  const token = localStorage.getItem('sharadha_token');
  const userStr = localStorage.getItem('sharadha_user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (customerOnly && user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation('app');

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>{t('loading')}</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
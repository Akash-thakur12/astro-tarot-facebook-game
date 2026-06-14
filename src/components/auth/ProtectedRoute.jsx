import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

/**
 * A wrapper component that redirects to login if the user is not authenticated.
 * This can be configured to allow or block anonymous users as needed.
 */
const ProtectedRoute = ({ children, allowAnonymous = true }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-mystic-gold/10 border-t-mystic-gold rounded-full animate-spin" />
      </div>
    );
  }

  // If no user at all, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If anonymous users are blocked for this route (e.g. premium features that require saving)
  const isAnonymous = !user.email && (!user.providerData || user.providerData.length === 0);
  if (!allowAnonymous && isAnonymous) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

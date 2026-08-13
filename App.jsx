import { useEffect } from 'react';
import { Toaster } from '@/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/query-client';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import PageNotFound from '@/PageNotFound';
import { AuthProvider, useAuth } from '@/AuthContext';
import UserNotRegisteredError from '@/UserNotRegisteredError';
import ScrollToTop from '@/ScrollToTop';
import ProtectedRoute from '@/ProtectedRoute';
import Login from '@/Login';
import Register from '@/Register';
import ForgotPassword from '@/ForgotPassword';
import ResetPassword from '@/ResetPassword';
import AppLayout from '@/AppLayout';
import AdminRoute from '@/AdminRoute';
import Admin from '@/Admin';
import Dashboard from '@/Dashboard';
import Appalti from '@/Appalti';
import Dipendenti from '@/Dipendenti';
import Turni from '@/Turni';
import Buchi from '@/Buchi';
import ResocontoMensile from '@/ResocontoMensile';
import MarginiAppalti from '@/MarginiAppalti';
import Statistiche from '@/Statistiche';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/appalti" element={<Appalti />} />
          <Route path="/dipendenti" element={<Dipendenti />} />
          <Route path="/turni" element={<Turni />} />
          <Route path="/buchi" element={<Buchi />} />
          <Route path="/resoconto" element={<ResocontoMensile />} />
          <Route path="/margini" element={<MarginiAppalti />} />
          <Route path="/statistiche" element={<Statistiche />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => document.documentElement.classList.toggle('dark', e.matches);
    apply(mq);
    const handler = (e) => apply(e);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App